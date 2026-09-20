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

Current local evidence after URL/cache-key migration:

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
Together with the earlier full desktop pass this verifies the current runtime
locally. The subsequent edit is test sampling only, not changed game physics.
Hosted CI still needs to pass again before this can be called a release.

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
