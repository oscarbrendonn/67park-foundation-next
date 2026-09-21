# Ferris trusted-input scheduling

## Hosted failure being corrected

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
