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

The targeted browser cases run in both profiles of the complete foundation
gate; no reduction of recovery/chat/home tests or 900,000 ms hosted
mobile soak is permitted. After Pages deploy, compare published module bytes,
verify backend health and actual multi-browser interaction before giving the
new release link. Local browser/touch emulation is not a physical iPhone test.
This change covers the character walking/skating controller, not a new car
collision system. Existing vehicle behavior and tests are retained.

Publication of these changes is not yet verified in this document.
