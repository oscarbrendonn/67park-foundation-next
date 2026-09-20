# Ordinary paths and carousel deck transport — 20 September 2026

## Scope and preservation

Work is isolated in `oscarbrendonn/67park-foundation-next`, based on `0972ae8`.
The original feel-lab checkout (including its uncommitted cat/camera files),
kimi-party and mobile repositories are not edited or pushed.

No model, texture, color or map geometry is replaced. Repository URL prefixes
are mechanically changed so this independent site loads its own code/assets;
existing saved-player keys are retained. No paid server is used. The later,
explicitly approved free-backend restoration is documented below; the movement
change itself did not restart or modify the old public service.

## Behavioral contract

- Walking and skating share a bounded 0.55 m supported-curb allowance. Explicit
  solid barriers, building-height walls and unsupported ledges still reject
  passage. The existing car/bus supported-surface envelope is also 0.55 m.
- The unsolicited `Path blocked · Go around` overlay and its timer are removed.
  Closed-house tests prove actual position/retreat, not the presence of a cue.
- Both rotating carousel decks carry a grounded, unmounted avatar using the
  same angle as the visible network-synchronized rotor. This includes an idle
  skateboard, not a separately mounted horse/vehicle passenger.
- Carry displacement passes through the normal contact sweep. Jumping, walking
  off, being carried by another player, seating, swimming and teleports do not
  keep/replay old deck rotation. Large clock discontinuities are discarded.
- The new browser tests use the shipped bundle, real deck geometry and actual
  jump controls. Source-only descriptor tests are not sufficient proof.

## Release gate

Local evidence through `2868d2c`, before the slow-frame runtime correction:

- `npm test`: 133 tests, 132 passed, one optional fixture skipped, zero failed.
- Apple M4 / Chromium: all 16 actual path crossings (walk/skate, both ways,
  four entrances) passed in desktop and mobile-browser viewports. Keyboard and
  trusted touch joystick both climbed the pictured approximately 25 cm curb.
- Both carousel sizes passed desktop and mobile-browser orbit, idle skate,
  actual jump/landing and walk-off checks. Orbit error was under 0.2 mm in the
  observed runs, airborne horizontal transport was zero, exit drift was zero.
- Mounted car crossed the actual road-to-pink-path curb on the isolated
  authority, then braked and dismounted normally. Desktop uses keyboard input;
  mobile-browser checks use the actual steering wheel, Reverse, Brake and Exit
  touch controls. This is not a physical-phone driving test.
- House wall checks passed actual sliding, a stable exterior position under
  forward pressure, and retreat for both walking and skating. Intended velocity
  alone is not used as proof that the character moved through a wall.

Hardware regression and hosted CI remain separate mandatory gates; focused
checks alone do not authorize publication.

The first full local desktop run passed with zero JavaScript errors and its
peer still connected. Its mobile run stopped at the added car route: a fixed
one-second keyboard turn was not a reliable mobile-control test. The driver now
waits for actual heading and uses trusted mobile touch controls. The complete
curb-to-car mobile sequence then passed with the same height/surface assertions
(car stopped at x170.634, z115.678, y9.478786 on `8_PARK_PATIKA_UST`). The initial
hosted run was cancelled pending this correction; it is not a release pass.

Hosted run `35527383423` on `bf7529c` passed recovery, graphics, house contacts,
the walk/skate path routes and the authoritative car curb route. It then failed
the new carousel test's sampling assertion: the angle target was reached in two
frames, while the assertion requires at least three. Observed orbit error was
0.0000045 m. This is not a release pass; deployment was skipped. The sampling
loop must collect both the required frame count and angle before evaluating the
unchanged transport tolerances.

The corrected sampling loop preserves all orbit tolerances and requires both
three animation-frame samples and 0.45 rad of accumulated wrapped rotation.
An exact fake-page callback test covers crossing that angle in two frames, with
and without a TAU wrap; it now waits for the third sample. Fresh hardware
desktop/mobile runs passed all eight carousel checks per viewport.

The full hardware mobile-browser run completed its 900000 ms soak with
`FOUNDATION_BROWSER_PASS`, zero JavaScript errors and the peer still connected
(`.qa-results/foundation-next-mobile-final.log`). It also passed chat, reconnect,
100 home transitions, repeated actions, outfit changes and feature isolation.
Together with the earlier full desktop pass this verified that runtime locally.
The subsequent `2868d2c` edit changed test sampling only. Its hosted run did not
pass, so this is not a release certificate for the slow-frame correction below.

### Low-frame-rate transport correction

Hosted run `35528410821` passed the recovery, graphics, house, path and car
checks, then exposed an actual deck-transport failure: over three samples the
rotor advanced 1.042 rad, but the avatar lagged its expected point by 4.293 m.
No JavaScript error or connection loss accompanied the movement failure.

The old transport helper discarded every per-frame rotation above 0.25 rad,
even when it was normal movement after a slow frame. An independent hardware
browser reproduction now delays the main thread by 1600 ms while retaining the
real network and ride clock. Before the correction it produced 1.76–1.85 m
orbit errors (`.qa-results/carousel-low-fps-baseline.log`).

`qa/carousel-low-fps.browser.cjs` is now part of the required release gate. It
checks three real delayed frames for walking and idle skating on both decks,
with the existing 0.12 m orbit and 0.1 m height tolerances, real drawing progress,
no mount and muted game audio. It does not mock the network or change game time.
The runtime correction must preserve bounded suspension/clock-jump handling
as well as normal jump, dismount and closed-wall behavior. Its results are
recorded separately from the earlier normal-frame-rate passes above.

The correction uses the authored carousel speed and a monotonic, bounded angle
budget, including delayed network delivery after the 180 ms extrapolation cap.
Jitter allowance is not added every frame. Backwards clock jumps, elapsed gaps
over five seconds and transport arcs over six metres are discarded. The arc is
measured at the avatar's actual radius. Normal wall sweeps are unchanged.

Post-correction evidence before hosted publication:

- Fresh hardware desktop and mobile-browser checks passed normal orbit, skate,
  jump/landing and walk-off on both decks, plus all four delayed walk/skate
  scenarios per viewport. Delayed-frame orbit error was below 0.1 mm in these
  runs; the original same-browser reproduction exceeded 1.7 m.
- `.qa-results/carousel-time-final-unit.log`: 137 tests, 136 passed, one optional
  fixture skipped, zero failed. Includes slow frames, delayed packets, signed
  clock corrections, wrap, backwards time, suspension and unsafe outer arcs.
- Generated bundle comparison confirms only descriptor timing metadata changed.
  Eighteen importer/entry files changed cache keys only (`carousel-time-1`).
  No models, textures, colors or geometry changed.
- The complete hardware regression finished successfully (exit 0), including
  all recovery checks, desktop foundation and the required 900000 ms mobile
  soak: `.qa-results/carousel-time-full-hardware.log`. Both foundation summaries
  report zero JavaScript errors and the peer still connected. Hosted regression
  remains mandatory; this is not a physical-phone performance certificate.

Hosted run `35529906700` now passes both normal and deliberately delayed
carousel transport, including walking/skating, on the CPU renderer. Recovery,
quality, house contacts, all 16 curb crossings, the driven car, grass/coast and
roof routes passed too. It still failed the desktop shrub-to-awning jump route:
the final position was x18.256, y10.215 on the ground rather than the awning.
There was no recorded JavaScript error, lost WebGL context or disconnected
socket at failure. The same route passed on local hardware, so its slow-frame
trajectory is being investigated; deployment was skipped, not forced through.

The exact awning miss was subsequently reproduced by the focused hardware
diagnostic with 400 ms between animation callbacks. The recorded second-jump
confirmation was x23.920/y14.607; by x20.095 the body had already descended to
y15.017, reaching the target only after falling. Both jump impulses and the
surface geometry were present. The test driver now starts the analog run just
before the one long transfer, retaining the existing late second-jump timing.
It does not alter jump strength, physics, surfaces or success heights.

That fix exposed another overly specific test prerequisite: the solid wall
stopped the avatar at x17.0302, inside the existing accepted exterior range,
but the old sampling loop waited for x<17.01. It now requires eight distinct
rendered-frame positions under held input, within the unchanged final x/y
bounds, with less than 0.03 m horizontal spread. Repeated polling of the same
frame cannot fake a successful wall-contact test. Four unit cases exercise
the actual exported predicate: duplicate frames, released input, continued
travel and out-of-bounds positions.

Final focused desktop/mobile routes passed both normally and with the 400 ms
diagnostic delay. Delayed runs reached awning y15.342, sill y16.255, upper cap
y19.115 and roof y20.785; the wall held at x17.0302. The full unit suite now has
141 tests: 140 passed, one optional fixture skipped, no failures
(`.qa-results/online-next-route-unit.log`). Only QA driver/diagnostic code and
test registration changed in this follow-up. It still needs a fresh full
hosted regression, including the unchanged 15-minute mobile soak, before Pages.

Hosted run `35532018753` passed the full desktop foundation and the mobile
curb/car/carousel/grass/coast/roof-geometry checks, then failed the mobile house
roof approach at x163.116/y9.953. Pages was skipped. The exact old driver passed
a uniform 400 ms main-world callback delay locally; that delay alone did not
reproduce the hosted failure.

A bounded, software-rendered SwiftShader diagnostic reproduced the missed
approach. Trusted pointer capture showed the second tap arriving at frame 147,
y11.378 with vertical velocity -3.4: the character was already falling. The
per-action stability wait in `locator.tap()` consumed additional render frames
after the requested near-apex timing. The QA input helper now resolves and
validates the visible, enabled, unobstructed fixed Jump button before launching,
then uses real trusted touchscreen input at that point. Desktop keyboard input
is unchanged. Both timing-sensitive house and plaza jump routes use this helper;
all physical landing, summit, skating and closed-wall assertions remain intact.

With that input correction, the software diagnostic's second tap arrived at
frame 143, y11.493/vy -0.4, and the first required roof landing succeeded at
x163.556/y12.918. Its deliberately shortened 30-second diagnostic deadline
expired during the later slope traverse, so this is causal first-landing
evidence, **not** a completed software route or release pass. Normal hardware
desktop and mobile-emulation house routes completed with the correction. The
diagnostic deadline can only shorten the original action limit; the hosted
workflow does not set it. No game physics, geometry, models or colors changed.

The corrected mobile house route also completed with the 400 ms diagnostic
delay (landing y12.817, summit y14.747, skating and closed wall retained).
The shared-input plaza route completed under the same delay: awning y15.342,
sill y16.255, cap y19.115, roof y20.785 and closed wall x17.0302. Captured
roof-tap evidence is retained under `.qa-results/roof-tap-*.log`; partial
software evidence is labelled separately from completed routes. The final
unit run `.qa-results/prepared-jump-unit.log` has 147 tests: 146 passed, the
same optional external-fixture skip, zero failures. Six new input-helper
cases cover target validation, rejecting unusable/occluded controls and
preserving keyboard input. A fresh hosted full gate is still required.

### Grounded launch and retained jump evidence

Hosted run `35534801570` on `3deee71` passed the complete desktop suite and
the mobile house-roof route. It then failed the mobile shrub-to-awning
transfer; Pages deployment was skipped. The trace shows the test's pre-run
leaving the curved shrub before the first tap: x24.557/y12.744 became
x23.957/y12.544, and the first impulse had the air-jump velocity (7.6).
The later tap produced no second impulse. This is consistent with the
controller consuming the remaining airborne jump, not a missing awning.

The plaza driver now waits for a grounded controller with its jump budget
restored and no movement input, sends the trusted jump first, then applies
analog movement. After touch-end it restores analog input without delaying
the next jump arc. A read-only frame observer retains the controller's
ground-jump/air-jump transitions, which otherwise last only one frame;
physical upward movement is required independently. No controller budget,
vertical position or velocity is written to manufacture a jump. The landing
heights, complete route, closed-wall assertions and mandatory release gate
remain unchanged. This is a test-driver correction, not a game-physics change.

The normal mobile diagnostic completed the route with retained controller
proof for each required ground and air jump. The reviewed driver's full unit
run (`.qa-results/grounded-launch-unit.log`) passed 146 of 147 tests, with the
same optional external-fixture skip and zero failures. Syntax and whitespace
checks also passed. These focused checks do not replace the hosted gate.

Run `35537382816` confirmed the grounded-launch correction: the mobile route
reached the shrub, awning, window sill and upper cap at y19.115. It nevertheless
timed out waiting for the observer's one-frame `jumped` flag on the fourth
hop's air jump. The controller clears that flag on every update; a separate
rAF observer is not guaranteed to sample every controller step. No JavaScript
or game fault accompanied this failure, and Pages remained unpublished.

The release assertion therefore uses the durable, live controller state:
after a newer controller frame, the body must have risen more than the original
0.12m and retain the original minimum upward velocity, be airborne, and have
one air jump left after the ground jump or zero after the air jump. Grounded
readiness is still required before every first tap. Transient event captures
remain diagnostic only. Unit fixtures explicitly reject wrong budgets,
grounded/stale samples and insufficient or downward movement, while accepting
a real rising jump after `jumped` has reset. All final landing heights and the
complete route remain mandatory; no game physics or geometry is changed.

With the durable assertion, the normal mobile focused route completed through
the cap (y19.115), roof (y20.785) and closed-wall check (x17.011). The full
unit suite in `.qa-results/durable-jump-unit.log` passed 150 of 151 tests,
with the same one optional fixture skipped and zero failures. A new hosted
full regression, including the entire mobile soak, is still required.

### Correction: a real cap support defect, not only jump observation

Hosted run `35538735517` failed again at mobile plaza hop 4. The transient
observer explanation above was insufficient. At the recorded position
`x=17.12685775756836, z=57.5, feet=17.24`, the old character-ground query
returned the cap at `18.56`: the horizontal torso blocker (feet + 1.45m)
had leaked into vertical support. Descending contact could therefore snap the
body upward to `19.115` and mark it grounded before the intended air jump.
Merely reaching the cap did not prove the requested jump sequence.

The runtime now separates floor support from side-obstacle height. The walking
resolver uses support for initial/final grounding and the existing obstacle
query for horizontal sweeps; skating preserves the same separation. Closed
shops, ordinary curbs, rendered caps and all route/velocity thresholds remain
unchanged. The existing indices are reused: no new mesh, duplicate sampler or
per-frame scene raycast was added.

An integration regression runs the exact production walking resolver with real
plaza queries: descent below the cap remains airborne without an upward snap,
while descent from above still lands. The full unit suite passed 151/152,
with the same optional fixture skip and zero failures
(`.qa-results/support-split-unit-final.log`). The focused normal mobile route
passed, including a genuine air-jump budget of zero and upward impulse; at the
exact CI coordinate the support query now returns `15.70` and the separate
obstacle query retains `18.56` (`.qa-results/plaza-support-normal-mobile.log`).
The 400ms-per-frame mobile diagnostic also completed the entire route; hop 4
latched a real air jump (`jumped=2`, `jumpsLeft=0`) and rose from `17.755` to
`18.135` before landing (`.qa-results/plaza-support-400-mobile.log`).
The normal desktop route passed all five hops and the closed-wall check too
(`.qa-results/plaza-support-normal-desktop.log`).
This is local evidence only. The final hosted gate, entire mobile soak, Pages
publication and live interaction checks are still required before release.

### Hosted cap fix confirmed; final roof-hop driver sequencing

Run `35540974077` confirmed the production correction: mobile hop 4 performed
the real air jump (`jumped=2`, `jumpsLeft=0`) and reached the cap. The later
hop 5 timed out for a different reason. At `x=16.2868`, its feet were `20.10`
and the roof bevel was `20.15`; the driver reached that real edge before its
second tap. The subsequent tap was correctly a fresh ground jump, not the
air jump required by the assertion. The character ultimately stood on the
roof at `20.785`, with zero JavaScript/game faults, but the gate stayed red.

Only the final short test transfer now defers horizontal steering until the
second airborne jump is physically accepted. Every earlier transfer keeps its
original steering. Both jump proofs, all five landing targets, the closed-wall
check and the full hosted soak are unchanged. This is a QA driver correction;
it makes no additional production physics or geometry change.

The revised driver passed the normal and 400ms mobile routes. In both, the
final air jump is accepted with zero remaining air jumps before horizontal
travel starts, then the avatar lands on the roof at `20.785` (full logs:
`.qa-results/plaza-finalhop-normal-mobile.log` and
`.qa-results/plaza-finalhop-400-mobile.log`). The full unit suite passed
152/153 with one unchanged optional skip and zero failures
(`.qa-results/roof-sequence-unit.log`).
The normal desktop route passed too
(`.qa-results/plaza-finalhop-normal-desktop.log`). Hosted regression and live
publication remain required; these focused results do not replace the gate.

The required release workflow retains asset-failure/retry, connection recovery,
graphics, physical wall/corner/curb checks, grass/coast/roof/plaza checks, chat
spam, player safety, 100 home transitions, repeated actions, outfit changes,
optional-feature failure isolation and the full 900000 ms mobile-browser soak.
New carousel checks are included in that gate, not only a separate diagnostic.

Browser mobile emulation is not a physical iPhone/Android test. Prior real
Android results belong to the earlier build; they do not certify this change.
No all-device, 100-avatar or universal stability claim is made.

### Known inherited visual limitation

The obstruction camera can retract very close to the avatar between carousel
horses/posts. Movement tests do not certify that framing as polished. Camera
geometry/probe behavior and the models were not changed by this narrow fix.

## Public online status

The inherited `things-silk-insured-athletics.trycloudflare.com` hostname stopped
resolving. After the user's explicit approval, the independent checkout's test
backend was started on loopback port 8498 and exposed through the free temporary
`https://fall-indexed-shipped-muscle.trycloudflare.com` tunnel. The original
social/safety JSON files were copied byte-for-byte into a separate private data
directory outside this repo; the original checkout and data were not changed.

The public HTTPS health check passed with zero service/lobby/room faults.
An incompatible protocol received HTTP 426, and an unrelated Origin received
HTTP 403. A two-guest HTTPS/WSS smoke passed bidirectional chat, movement and
authenticated reconnect with the same identity while the other guest remained
connected and continued sending movement. It closes only its own sockets and
does not claim that public home/minigame transitions were tested by this smoke.
The complete isolated acceptance tests cover those scenarios separately.

`qa/live-online-smoke.mjs` can repeat this bounded check with
`LIVE_SMOKE_ENDPOINT` and `LIVE_SMOKE_ORIGIN=https://oscarbrendonn.github.io`.
It must not log tokens, guest identities or message payloads. The frontend
endpoint and all affected importer cache keys are refreshed (`online-next-1`);
a normalized diff verified that the other 51 source changes are cache-only.
The fresh unit suite passed 136/137, with one optional fixture skipped.

The final config still requires the complete hosted regression and Pages
deployment, followed by live frontend/module/icon and browser checks. This
endpoint is a temporary playtest service, not permanent hosting: the host Mac
and tunnel must remain running. No paid service or uptime guarantee is implied.
