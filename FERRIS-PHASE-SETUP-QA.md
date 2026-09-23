# Ferris jump setup: deterministic phase, real post-arm clock

## Why camera publication stopped

Camera candidate `99aea4ea443b873f2b2bb1062b52690e370af88c`, run
`35815685714`, failed before sending any jump input. The 45-second readiness
wait saw no armed state; Pages deployment was skipped. The original log is
retained at `.qa-results/camera-hosted-35815685714-failed.log`.

The original setup placed a rider in an upper-left cabin, settled for twelve
rendered frames, then waited for the outgoing lower-left velocity band
`(-0.38, -0.32) m/s`. This band lasts only 727.58 ms at the authored radius
and 72-second period. Recorded frames 1312 and 1313 were 1,083 ms apart:

| Frame | Time (ms) | Body x | Derived cabin vertical speed (m/s) |
| --- | --- | --- | --- |
| 1312 | 814016 | 168.4872283935547 | -0.3938136146 |
| 1313 | 815099 | 169.5078125 | -0.3047508499 |

Thus the entire readiness band was skipped between observations. This
explains this pre-input timeout; it is not a failed player jump or evidence
that other historic production failures were harmless. Those failures and
their exact physics/roof replays remain in `FERRIS-JUMP-TIMING-QA.md`.

## Narrow test-fixture correction

`qa/ferris-jump-phase.cjs` is installed only in the isolated acceptance page.
It establishes the same certified lower-left phase (vertical speed -0.35 m/s)
before the existing placement and twelve grounded settling frames. The
Ferris clock is held **during this setup only**. This replaces the former
upper-left placement followed by waiting to sample a sub-frame phase band.

The same strict readiness predicate arms the rider. In that same callback,
before the real keyboard press or HUD touch is dispatched, the fixture
releases the clock. Every subsequent real network angular delta is applied
unchanged, with a fixed phase offset. Actual dispatch latency, launch
preparation and airborne motion are not frozen or slowed. New assertions
require release, moving clock writes, nonzero travel and angular-delta error
below 1e-10. The original setter and latest network phase are restored before
walk-off and in cleanup.

Normal moving-cabin carry and 2.2-second delayed carry remain on the original
clock. Existing real input, first/air-jump budgets, grounded launch alignment,
carrier delta, roof collision, clearance, displacement, velocity, cabin
travel, airborne separation, walk-off and timeout assertions are retained.
This is not a broad test bypass or an acceptance-threshold change. It makes
the initial condition deterministic; it does not certify all possible
free-jump phases or general frame-rate performance.

No production module, geometry, physics, network behavior, cache alias,
workflow, package script or soak duration changed in this correction.

## Local evidence

- `.qa-results/ferris-phase-fixture-red.log`: intentional source-contract
  failure before adding the fixture. Retained, not presented as a game fault.
- `.qa-results/ferris-phase-unit-1.log`: 19 tests, 19 passed, zero failures.
  The real-asset regression proves the recorded skipped band, then exercises
  20 initial-phase/frame-cadence schedules (16, 650, 1027, 1083, 1247 ms),
  including angle wrapping, single release and exact clock restoration.
  Historic 54-case launch/roof coverage and the 101-phase clearance grid
  remain enabled and passing.
- `.qa-results/ferris-phase-browser-1.log`: desktop and 390x844 touch
  `RIDE_CONTACT_BROWSER_PASS`, no JS/WebGL errors. Real keyboard/touch,
  normal/delayed carry, jumping/walk-off, coaster and skate-camera routes
  passed. Post-arm clock deltas were preserved.
- `.qa-results/ferris-phase-browser-slow-1.log`: both profiles passed with
  eight injected 1,000 ms post-arm callbacks each; no JS/WebGL errors.
  Preserved network travel was 0.281312 / 0.452066 radians, maximum delta
  error 8.89e-16. As before, blocking callbacks also delays network delivery:
  this is a slow-frame stress check, not an exact hosted-clock replay.
- `.qa-results/ferris-phase-full-unit-1.log`: first full unit run failed
  solely because `jump-input.test.cjs` still matched the old placement-call
  signature without the explicit cabin argument (265 total, 262 passed,
  two existing optional-fixture skips, one failure; water pretest 5/5).
  The source-order contract now checks the new exact call and additionally
  requires HUD preparation, phase setup, placement, observer, arming, clock
  release and actual input in that order. No event/physics bound changed.
- `.qa-results/ferris-phase-full-unit-2.log`: water 5/5; main 265 total,
  263 passed, two existing optional-fixture skips, zero failures. The first
  failed source-contract run and earlier camera timing overrun remain saved.

These are Apple M4 Chrome checks, not physical iPhone/Safari verification.
The game is muted. A local pass is not a deployed release; the new commit
still needs the existing hosted regression and Pages gate, followed by the
focused live camera/settings, umbrella and photo-surface checks recorded in
`.qa-results/camera-publication-status.md`.
