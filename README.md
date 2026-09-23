# 67Park Foundation Next

Independent continuation of the tested foundation, camera and movement work.

Repository: https://github.com/oscarbrendonn/67park-foundation-next

The new game URL is not a verified release until the selected checks, Pages
deployment and the changed-scope live verification pass. A short-profile release
is not a new full-game or multiplayer certification. The old temporary
backend was unreachable during the September 20 movement fix. With explicit
user approval, a separate free test backend and temporary tunnel were restored;
a green source push alone is not evidence of a working public game.

This checkout starts at `0972ae8` (the preserved Astra camera correction on top
of feel-lab `8e4966a`). The original feel-lab, kimi-party and mobile repositories
are not modified. Runtime asset URLs now use this repository's own prefix;
existing player-storage identifiers are intentionally retained.

Current narrow scope: traversable ordinary curbs, removal of the unsolicited
blocked-path popup, and standing-player transport on both rotating carousels.
House walls remain solid. Existing models, colors and map assets are unchanged.

Based on `oscarbrendonn/67park-kimi-party` commit
`991aac2b7f5b09fa5a0b1fde479c820aa17495f1`. Neither original desktop nor mobile
repository is changed by this experiment. Existing models, textures and map
geometry are preserved. Character/profile selection and player settings use
separate browser-storage keys in this fork.

## Feel profile

- Third-person starting pitch 20.6 degrees, 6.8-unit boom, 55-degree vertical FOV;
  portrait displays get up to one extra unit of distance. These are our trial
  values, not measured or claimed Eggy Party settings.
- Horizontal following and manual look remain direct; vertical jump/fall
  following is gently damped with bounded lag. Five obstruction probes retract
  safely and ease back out with a brief hold against corner oscillation. No
  automatic sprint zoom or camera shake in this profile.
- Main horizontal acceleration and direction changes are bounded; playback
  cadence follows actual world travel instead of requested input speed.
- Skybound shares the character profile and pointer sensitivity. Lane Rush,
  Balloon and Rockets use the same camera framing; aiming sports remain separate.
- Rockets has camera-relative movement and touch/right-mouse orbit. Quick
  keyboard jumps are latched until the next simulation step.
- Existing two-arm carry IK is retained and tested. Lane Rush adds bounded
  contact sounds on successful grab, throw, hit, jump and landing events.

## Verification

### Temporary short publication profile (23 September 2026)

At the user's explicit request, automatic main pushes temporarily run dependency
audit, the existing fast unit checks, and focused camera/punch/release-profile
units before Pages deployment. They **do not** install a browser/OpenGL renderer
or run the long browser suite, 100 home transitions, or 15-minute mobile soak.
The complete tests and their acceptance thresholds are retained unchanged.

To run full checks for one release, use the workflow's **Run workflow** action and
select **full_regression**. To restore full checks on every push later, set the
repository Actions variable **PARK_FULL_REGRESSION** to the exact value **true**.
Unset or **false** means the short profile. Deployment still depends on the
selected checks succeeding; a failed check is never ignored. No running job is
cancelled or restarted by changing this profile.

This section supersedes older notes that made a full browser pass mandatory for
every intermediate release. It does not retroactively certify previously failed
tests or remove the need to inspect the changed feature before publication.

See [RECOVERY-GRAPHICS-QA.md](RECOVERY-GRAPHICS-QA.md) for connection recovery,
working graphics levels, camera changes, acceptance results and remaining real
device checks. [FEEL-LAB-QA.md](FEEL-LAB-QA.md) describes the earlier feel profile;
older QA documents are historical evidence, not certification of this release.

This is a playtest build, not a guarantee for all phones or 100-player lobbies.
Lobby capacity remains 16. Low/Medium/High graphics change actual resolution and
shadow rendering; Automatic retains the existing adaptive profile.

The dedicated test backend must be upgraded before publishing a client that
requires protocol negotiation. Keep its data directory and allowed origins;
the temporary tunnel address must be refreshed if that tunnel process stops.
It remains a test service, not a permanent production hosting arrangement.
