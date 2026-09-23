# Ferris grounded launch synchronization and trusted-input scheduling

Latest test-setup correction: see `FERRIS-PHASE-SETUP-QA.md` for the camera
release's pre-input phase-sampling timeout and deterministic setup fixture.
It preserves the production launch synchronization and historic evidence below.

## Current production correction: synchronize support before consuming jump

Candidate `329e0ca` / hosted run `35653182246` failed on desktop; Pages was
skipped. The earlier scheduling-only candidates did not fix the production
ordering bug. Input was captured in 6 ms, but the first physics preparation
arrived 1,153 ms later and the next arrived another 1,068 ms later. The cabin
advanced while `jumpQueued` prevented grounded carrier transport. The token
then allowed a jump from the old cabin pose. The subsequent genuine roof
contact correctly stopped it. Evidence: `.qa-results/ci-35653182246-failure.log`.

`island/ride-contacts.js` now saves the existing narrow grounded-contact proof,
transports that proven rider to the current cabin before the queued jump is
consumed, and returns the same carrier delta used by the controller's existing
previous-sweep-anchor correction. Only a successful bounded carry grants the
single-use jump token. Queuing immediately clears retained contact, so the
airborne rider is not carried. Walk-off, teleport, upward motion, stale time,
discontinuous angle, skip and disposal guards remain enforced. Roof collision
is retained. No model, material, network, controller tuning or workflow changes
are included; there are no new drawing calls, assets or frame loops.

The exact latest CI replay was added first and failed against old production
code. It now proves current-floor alignment, single token consumption, the
original >0.12 m / >3 m/s free-flight conjunction and a separate real roof
strike. The older CI replay also requires prelaunch synchronization and retains
its exact authored roof cap. A 54-case real-asset launch matrix spans three
cabins, two descending phases and independent launch/airborne gaps through
2.6 seconds: 48 unobstructed jumps preserve rise/speed and six expected real
roof contacts clamp. Those six collisions are not counted as free-flight passes.

The browser arming phase is unchanged this time. The free-flight measurement
now starts from the actual queued physics launch rather than a stale input-time
position. Assertions first require alignment with the current cabin floor and
translation equal to the proven carrier delta, then the unchanged displacement,
velocity, first-jump/air-jump budget, unique trusted input, travel and clearance
bounds. The bounded airborne trace must receive no subsequent carrier delta.
This is not an assertion retry or permission to pass through a roof.

Entry and runtime loaders use `english-ui-1-launch-sync-1`; nested contact
imports use `ride-launch-sync-1`, exposing `launchSyncVersion:1`. The unchanged
movement singleton remains `ride-jump-contact-1`, courts/rules remain
`english-ui-1`, and camera/network/social singleton keys are preserved.

Current verification is recorded below as it completes. All historical results
in the following sections describe earlier candidates, not approval of this
production change. Full hosted regression, 900,000 ms mobile soak, Pages and
live verification remain mandatory. Physical iPhone testing belongs to the
user and is still pending; the local boat prototype is not included.

### Current local evidence

- Final `.qa-results/ferris-launch-sync-unit-final.log`: 260 total, 258 passed,
  two pre-existing optional fixture skips, zero failures (including the
  wardrobe fault-order regression added after the first local full run).
- `.qa-results/ferris-launch-sync-unit.log`: 259 total, 257 passed, two
  pre-existing optional fixture skips, zero failures.
- `.qa-results/ferris-launch-sync-browser.log`: desktop and 390x844 touch
  viewport `RIDE_CONTACT_BROWSER_PASS`; trusted input captured in 5 / 36 ms,
  accepted first jumps, zero airborne body drift, no JS/WebGL errors.
- `.qa-results/ferris-launch-sync-delayed.log`: 2,200 ms automation dispatch
  plus 800 ms blocked input passed both profiles. Actual captures were
  3,006 / 3,038 ms, accepted jumps and zero airborne body drift. Existing open
  bay, solid column, normal/delayed carrier, walk-off, real touch joystick and
  skateboard/camera checks remained enabled.
- `.qa-results/ferris-launch-sync-slow-frames.log`: eight 1,000 ms blocked
  callbacks in each profile, both `RIDE_CONTACT_BROWSER_PASS`, no JS/WebGL
  errors. Actual capture was 4 / 2,024 ms, body drift zero, cabin travel
  1.9113 / 3.8847 m. In the mobile run the network angle stayed unchanged at
  the launch preparation (zero carrier delta). This is stress evidence, not
  exact reproduction of the hosted cabin clock; the recorded-clock unit
  independently requires the >1 m grounded launch synchronization.
- All browser evidence above uses Apple M4 Chrome, not physical iPhone or
  Android. The game stayed muted. These targeted tests do not certify general
  frame-rate performance or the unrelated boat prototype.

### Full-run wardrobe fault setup correction

The first full local run stopped before the Ferris cases, in the wardrobe
offline fixture: room socket `readyState:2` (CLOSING), room connected flag true,
and navigator offline remained at the 30-second precondition timeout. No JS
or WebGL error was recorded. This failed run is retained in
`.qa-results/ferris-launch-sync-foundation-desktop.log`; it is not a pass.

The fixture formerly enabled Chromium HTTP offline emulation before requesting
the established WebSockets' graceful close, blocking their close handshake.
It now installs the same new-socket refusal first, closes established sockets
while their handshake can complete, waits for both genuine disconnected flags,
then enables HTTP offline mode and requires navigator offline as well as both
flags. The wardrobe button hit target, 9.2-second interruption, panel visibility,
actual reconnect, preview-loss retry and disposal assertions are unchanged.
No production network or recovery code was modified. A source-order regression
preserves this fault-injection sequence and the full acceptance checks.

The corrected full hardware desktop run
`.qa-results/ferris-launch-sync-foundation-desktop-final.log` ended
`FOUNDATION_BROWSER_PASS` with `mobile:false`, `soakMs:0`, `errors:0` and
`peerStillConnected:true`. It includes wardrobe offline controls and visible
resume/retry/disposal, all existing ride/geometry/camera/curb routes, real roof
and plaza jump routes, chat spam and reconnect, 100 home transitions, 1,000
punch/interact events, 20 outfit changes and optional-feature isolation.
This local desktop result does not replace hosted mobile soak or live release
verification. The failed first local run remains recorded above.

## Historical scheduling correction: three distinct clocks

Run `35647642059` / `2f6c94b` subsequently failed on the mobile free-jump
assertion. Desktop completed, but this run did not deploy. The earlier local
passes below are historical evidence, not approval of that failed candidate.

The trusted touch was accepted. The actual recorded sequence was:

- Input at 432401 ms, body y=13.988451958, angle=2.9446322475.
- First prepare at 432889 ms, angle=2.9886843578: queued first jump accepted.
- Next prepare at 433464 ms, angle=3.0388538472: the first bounded physics
  displacement was 0.4 m, taking the body to y=14.388453484 with vy=8.
- The real occupied cabin roof underside was then y=15.072471008. The original
  ceiling formula limited body y to 14.165471077 and set vy=0. That legitimate
  contact prevented the required simultaneous upward displacement and speed.

`qa/ride-contacts.test.mjs` now replays those exact coordinates, angles and
times through the unchanged production contact implementation. It requires
both acceptance of the initial jump and the real roof clamp. Passing through
the roof, rejecting the initial jump, or treating this as free flight fails
that regression. Source log: `.qa-results/ci-35647642059-failure.log`.

The former headroom unit checked only dispatch/event delay and clearance
above the 0.12 m assertion threshold. It missed input-to-first-prepare and
first-to-next-prepare latency, and the full 0.4 m first physics step. It was
therefore insufficient despite passing; the replacement accounts for these
three clocks separately using the real asset and body probes.

The free-jump fixture retains the initial upper-left placement and 12 grounded
settling frames, then arms at outgoing floor velocity (-0.38,-0.32) m/s and
horizontal velocity above 0.9 m/s. Actual input still must be descending below
-0.05 m/s with absolute horizontal speed above 0.3 m/s. Every original jump,
air-jump budget, trusted-event, clearance, travel and separation assertion is
unchanged. No assertion retry, production physics, geometry, network, cache,
workflow or soak-duration change is included.

The optional `PARK_RIDE_FRAME_DELAY_MS` runner fixture blocks up to eight
post-arm callbacks. This also delays network delivery, so it is explicitly
not equivalent to the recorded hosted cabin clock. The old phase passed a
600 ms mobile busy-frame test because its cabin angle stayed unchanged during
the first two preparations; that is not a reproduction or evidence that the
hosted failure was harmless. The exact replay above covers the actual failure.
Historical stress log: `.qa-results/ferris-slow-frames-before.log`.

The replacement grid covers all 12 cabins, five body probes, interior phase
samples and bisected near-boundary phases. Dispatch is sampled every 50 ms up
to 3.1 s. Both later frame gaps include fast .016/.033/.05 s samples, slow
.325/.65 s samples and the exact hosted .488/.575 s pair. Displacement is
derived from the shipped jump/gravity constants and bounded simulation step,
including mixed fast/slow frames; it is not assumed always to be 0.4 m.
Every sample requires an additional 0.02 m beyond that displacement, plus
the unchanged event-time cabin-velocity predicates.

Local normal and 2,200 ms dispatch + 800 ms blocked-event browser checks
passed desktop and 390x844 touch viewport with no JavaScript/WebGL errors.
Each jump was a single trusted input with zero horizontal body drift. Normal
capture delays were 5 / 36 ms; delayed captures were 3,008 / 3,059 ms. Logs:
`.qa-results/ferris-three-clock-normal.log` and
`.qa-results/ferris-three-clock-delayed.log`. These remain hardware-browser
checks, not physical phone or hosted-renderer certification.

The new phase also passed the separate 600 ms busy-frame stress on both
desktop and mobile viewport: exactly eight blocked callbacks per profile,
one accepted trusted input, zero body drift and no JavaScript/WebGL errors.
Log: `.qa-results/ferris-three-clock-slow-frames.log`. As noted above, this
does not replace the exact hosted-clock replay or the hosted renderer gate.

Final `npm test`: 256 total, 254 passed, two existing optional fixture skips,
zero failures (`.qa-results/ferris-three-clock-unit-final.log`). The grid's
101 phase samples across 12 cabins retained at least 0.031325 m clearance
beyond their production-derived first step; the required extra margin is
0.02 m. Worst sampled schedule: a=0, b=.65, c=.65, first rise=.4 m,
remaining velocity=6.8 m/s. The exact earlier hosted roof strike also passes
as a deliberately separate roof-contact regression.

A green unit result alone does not authorize publication. Full hosted
regression, 900,000 ms mobile soak, Pages
deployment, live files and real multi-browser interactions remain mandatory.
The user will personally test the delivered version on iPhone; no physical
phone pass is claimed or required from an unavailable local device.

## Historical first attempt (superseded by the failure above)

Run `35639648347`, commit `92e94ae`, failed at
`qa/ride-contacts.browser.cjs`'s event-time jump assertion. Pages was skipped.
The captured mobile pointer event arrived 2,190 ms after arming. During that
delay the descending cabin's horizontal velocity changed from -0.367712 to
-0.182244 m/s, outside the required absolute speed above 0.3 m/s.

The remaining predicates passed: the real jump was accepted, one air jump was
retained, vertical velocity reached 8 m/s, the body stayed horizontally still,
the cabin moved 0.09518 m and clearance reached 2.35860 m. This run is not
evidence of a new frozen game or a rejected jump. It is also not a release pass.
The failure log is retained at `.qa-results/ci-35639648347-failure.log`.

## Narrow test-only correction

- Reuse `prepareJumpInput`, already used by the roof and plaza routes. The
  visible, enabled fixed HUD target is hit-tested before selecting the cabin.
  Actual touch uses `page.touchscreen.tap`, without per-tap locator stability
  waits. Desktop still presses the real Space key.
- Preserve the initial upper-left placement and all 12 grounded settling
  frames. Arm when the cabin reaches the outgoing lower-left diagonal:
  horizontal velocity above 0.3 m/s and downward velocity between -0.75 and
  -0.6 m/s. Horizontal speed then increases through dispatch latency, with
  headroom for the free-jump observation and descent margin before the bottom
  reverses the floor direction. Readiness and its snapshot are captured in
  the same browser callback; the actual event is independently validated.
- Install air observation before arming, collect only after the actual
  trusted input and record dispatch latency. Require
  exactly one trusted keyboard/touch event, and the actual Jump hit target on
  mobile. There is no retry after a failed jump assertion.
- Keep every original event-time acceptance bound unchanged: grounded first
  jump and retained air-jump budget, upward velocity/displacement, three
  samples, clearance, cabin travel, body separation and cabin velocity.
- A bounded read-only before/after contact trace records the first 12 physics
  preparations after input. It calls the original contact method once and
  restores it on cleanup; it never changes positions or collision results.
- The bounded runner optionally inserts up to 2,500 ms of automation dispatch
  latency using `PARK_RIDE_DISPATCH_DELAY_MS`. This is distinct from its
  existing `PARK_RIDE_JUMP_DELAY_MS` blocked-event fixture. Both default to
  zero; neither modifies production files or the hosted release gate.

## Extra delayed-input fixture finding

The first 2,200 ms dispatch plus 800 ms blocked-event run passed on desktop
but failed the mobile upward-displacement/velocity conjunction. This was not
another lost input: `jumped:1`, velocity 8 m/s and the retained air jump were
recorded. A second diagnostic proved an authored roof collision. At a later
prepareBody call, the same cabin's roof underside was 18.204443 m; the existing
cap formula `roof - 1.45 + .555 - .012` gave 17.297443 m, exactly the clamped
body height. The roof had moved down 0.578512 m while the network animation
caught up after the deliberate event block. This correctly stopped upward
motion before the test's required free-jump sample.

The free-jump fixture therefore no longer arms at the fastest descent rate
(about -0.96 m/s). Its narrower outgoing phase above retains enough headroom
for the existing sample after the 800 ms block. The roof remains solid, all
original physical acceptance bounds remain, and the initial failed stress
run is retained rather than counted as passing:
`.qa-results/ferris-input-scheduling-delayed.log` and
`.qa-results/ferris-input-scheduling-contact-trace.log`.

A real-asset regression checks five phases across the new arming window and
the full 2.2 s + 0.8 s sequence. All five body probes retain the actual solid
roof, with more than 0.25 m extra clearance beyond the unchanged 0.12 m upward
travel gate. It neither hides the roof nor disables its collision.

No production physics, scene geometry, controls, network, cache keys, release
thresholds or mobile soak duration changed. The separate local boat prototype
is not part of this change.

## Verification

- Final local unit suite: 255 total, 253 passed, two pre-existing optional
  fixture skips, zero failures
  (`.qa-results/ferris-input-scheduling-unit-final.log`).
- Delayed final candidate:
  `PARK_RIDE_DISPATCH_DELAY_MS=2200 PARK_RIDE_JUMP_DELAY_MS=800 node qa/ride-contacts.run.cjs`
  passed both Apple M4 Chrome desktop and 390x844 touch viewport, including
  the open bay/solid column, ordinary and delayed cabin carry, accepted first
  jump/walk-off, real touch joystick and skateboard/camera checks. Both input
  captures were trusted and unique; measured total arm-to-capture time was
  3,009 / 3,036 ms, including the injected blocked-event interval. Body drift
  was zero, cabin travel 0.5552 / 0.5522 m, and separation 0.6376 / 0.6773 m.
  Both ended `RIDE_CONTACT_BROWSER_PASS`, with no JavaScript/WebGL errors and
  muted game audio (`.qa-results/ferris-input-scheduling-delayed-v2.log`).
- Final normal-input rerun: both profiles ended `RIDE_CONTACT_BROWSER_PASS`,
  with accepted unique trusted input and no JavaScript/WebGL errors. The
  arm-to-input captures were 3 ms desktop / 36 ms mobile. All existing focused
  ride and skateboard/camera cases stayed enabled
  (`.qa-results/ferris-input-scheduling-browser-final.log`).
- The complete hosted regression, mandatory 900,000 ms mobile soak and Pages
  deployment must still pass for the same commit, followed by live asset and
  multi-browser checks. This document does not certify a public release.

Game audio stays muted. Browser viewport checks are not physical iPhone or
Android certification, a performance guarantee or an online boat test.
