# Ordinary paths and carousel deck transport — 20 September 2026

## Scope and preservation

Work is isolated in `oscarbrendonn/67park-foundation-next`, based on `0972ae8`.
The original feel-lab checkout (including its uncommitted cat/camera files),
kimi-party and mobile repositories are not edited or pushed.

No model, texture, color or map geometry is replaced. Repository URL prefixes
are mechanically changed so this independent site loads its own code/assets;
existing saved-player keys are retained. No paid server, public-backend restart
or replacement tunnel is part of this change.

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
- The complete hardware regression, including the required 900000 ms mobile
  soak, is running in `.qa-results/carousel-time-full-hardware.log`. Hosted
  regression remains mandatory and is not replaced by these focused passes.

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

The inherited preview backend is
`https://things-silk-insured-athletics.trycloudflare.com`. Its hostname did not
resolve during this work. Isolated local multiplayer tests use their own QA
authority; they do not establish public online availability. A new game link
must only be described as online after Pages and the actual backend interaction
have both been verified.
