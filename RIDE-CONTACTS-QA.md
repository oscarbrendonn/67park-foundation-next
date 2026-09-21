# Open coaster gaps and moving Ferris cabin contacts

Reported on the published `5217823` baseline: the overhead skating track
blocked open space below it; an unmounted avatar intersected a Ferris cabin
floor. Original repositories, models, materials, cameras and public Mac
backend/tunnel are unchanged by this fix.

## Cause and change

- The old downward ray selected the highest coaster deck regardless of feet
  height. The Ferris ground function included only its static base/frame.
- `island/ride-solid-sampler.js` indexes the existing triangles once, with
  bounded XZ buckets. Closed shells retain their solid intervals. Open faces
  retain zero-thickness contacts, not invented volumes beneath the track.
- `island/ride-contacts.js` distinguishes reachable foot support from actual
  solid material intersecting the body. Columns remain solid; empty bays stay
  open. Landing on the upper track is retained; jumping underneath meets the
  underside. The existing walking/skate swept contact rules are retained.
- All 12 upright cabins share one geometry index and read their rendered
  instance transforms. Free standing characters follow the cabin translation;
  jumping, leaving contact, mounted/held characters and stale clock jumps do
  not receive cabin carry. This is separate from carousel deck rotation.
- The hosted run `35602195888` exposed a slow-frame carry failure. A fixed
  2 m transport cutoff rejected legitimate continuous wheel travel; after
  admitting that travel, an unchanged previous sweep anchor could still push
  the rider back against the moved cabin. Transport now uses the authored
  angular rate, a bounded elapsed-time credit and a 6 m maximum displacement.
  Delays longer than 5 seconds or discontinuous clock changes do not carry.
  The player's previous sweep anchor receives the same carrier translation;
  their relative movement still passes through the existing collision checks.
- Current ground decorators forward the fourth `ignoreRideContacts` argument:
  only the obsolete Ferris/coaster query is omitted. Other terrain, vehicles,
  social toys and home interior queries keep their own ground and collision.
- There are no new render meshes or asset downloads. The live build indexes
  25,684 static and 13,480 shared cabin triangles. The approximately 4.06 MB
  numeric payload estimate is not a browser heap/memory measurement.

## Evidence so far

- Old actual-browser route: x=187.5, z=-112 toward -104 stopped at z=-109.5056.
- Updated same route: reached z=-103.9432 while staying on the 9.46255 m floor.
- Free standing Ferris cabin: 201 rendered-frame samples over 3 seconds,
  maximum measured floor error 0.00334 m and relative X error 0.00471 m;
  the character was visibly on the cabin floor, not mounted to a seat.
- `qa/ride-solid-sampler.test.mjs` and `qa/ride-contacts.test.mjs` exercise
  source geometry, real walking/skate sweeps, open gaps vs columns, all cabin
  floors at four angles, underside contact, carry/release, cache/disposal and
  unchanged outside/home queries.
- All 14 authored coaster support columns retain solid centers; every authored
  upper skating-route segment still matches the rendered deck support.
- Full local unit suite: 221 tests, 219 passed, 2 pre-existing optional fixture
  skips, no failures (`.qa-results/ride-contacts-unit-release.log`). The new
  slow-frame case was observed failing before the correction, then passed.
- Actual desktop and mobile-viewport game checks cover walk/skate open-bay
  traversal, column stops, moving-cabin carry, jumping and walking off. The
  mobile run also uses trusted touch joystick events. The exit test follows a
  cabin-relative open corridor instead of aiming at a stale world-space point.
- A fixture is placed once on the current cabin transform immediately before
  the production contact pass; it is not repeatedly teleported or force-marked
  grounded. The subsequent 12 settling frames and carry/release checks remain.
- Actual hardware-browser diagnostic: eight 2.6-second delays, with both
  pre-settled and immediately delayed placement, retained cabin-relative
  position and sub-micrometre numeric floor error after the sweep-anchor fix
  (`.qa-results/ride-carry-delayed-2600-verified.log`). This is a deliberately
  delayed contact diagnostic, not a device performance claim.
- The existing skateboard jump/camera performance test is retained and passed
  locally. These browser checks also require new drawn frames, bounded frame
  gaps, a visible character, game audio muted and no JS/WebGL errors.

## Release requirements

### Jump-fixture observation after CI 35605413843

This run failed and did not publish. Its ordinary and delayed cabin-carry
checks passed. The trace records a real Space event followed by `jumped:1`,
positive vertical velocity and an upward body displacement. However, a rising
floor re-contacted the avatar before the slow rendered-frame observer sampled
the required clearance. A second local fixture at the left-most extremum did
produce clearance, but not the independently required horizontal cabin travel.

The browser-only fixture therefore selects and observes a descending diagonal
phase before sending the real keyboard/touch jump. It keeps the existing
grounded settling requirement, clearance/height/velocity bounds, horizontal
separation measurement, time limits and walk-off check. Event-time state is
recorded so the jump-height proof does not compare against an earlier cabin
position. This is not a production physics change or removal of an assertion.
Focused hardware browser acceptance now passes both desktop and mobile viewport
(`.qa-results/park-entry-ride-contacts-final.log`): grounded carry, delayed carry,
accepted jump clearance and walking off, coaster gap/columns, and real skateboard
camera/jump. No JS/WebGL errors. Complete hosted release acceptance is still required.

The targeted browser cases run in both profiles of the complete foundation
gate; no reduction of recovery/chat/home tests or 900,000 ms hosted
mobile soak is permitted. After Pages deploy, compare published module bytes,
verify backend health and actual multi-browser interaction before giving the
new release link. Local browser/touch emulation is not a physical iPhone test.
This change covers the character walking/skating controller, not a new car
collision system. Existing vehicle behavior and tests are retained.

### Production first-jump regression after CI 35632582544

Candidate `cdee66c` failed; Pages deployment was skipped. In the hosted trace,
the first real Space event arrived while grounded with one air jump remaining.
The next slow frame observed a descended cabin floor and incorrectly accepted
the request as `jumped:2`, consuming the air jump. This was a production
contact-ordering bug, not a reason to relax the existing browser assertion.

The contact adapter now issues a single-use grounded-jump token only when a
queued jump follows verified continuous previous cabin contact, bounded own
horizontal drift, non-upward velocity, and the existing valid wheel clock.
No carry is applied during the jump. Walk-off, teleport, stale time, upward and
noncontact cases reject the token. The normal walking ground predicate consumes
it only after its current contact is lost. Source and shipped movement/module
cache keys advance together to `ride-jump-contact-1`.

Real-asset unit tests cover the valid descending case and each rejection,
single use and shipped predicate wiring. The targeted ride suite has 13 tests,
all passing. Normal desktop and mobile-viewport ride/camera cases passed in
`.qa-results/coaster-jump-browser.log`. An additional 800 ms delay on the real
jump event passed on desktop but first exposed a remaining near-floor gap on
touch: the old `!near` token guard excluded 0.08–0.12 m floor separation even
though the controller no longer considered it grounded. That guard was removed
without changing any browser threshold; verified prior contact is the authority.
The same delayed touch flow now passes in
`.qa-results/coaster-delayed-jump-mobile-v2.log`, retaining its air jump. Disposed
contacts cannot return a token. The full hosted gate still must pass.
Delayed board-on Ferris first-jump behavior is not certified by
the walking regression; its separate raw-ground branch has not been changed.

Publication of these changes is not yet verified in this document.
