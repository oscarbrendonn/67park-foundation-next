# Temporary short publication profile — 23 September 2026

The user explicitly requested turning off the long automatic publication test
until final development checks. Normal pushes now run the existing dependency
audit and Node unit suite, plus the focused release-profile and running-camera /
punch / touch-zoom units. Browser installation, software OpenGL installation,
the full game browser suite and its 900000 ms mobile soak are opt-in.

The tests and thresholds are retained. Set repository Actions variable
`PARK_FULL_REGRESSION=true` to restore full tests on every push, or select the
manual workflow's `full_regression` checkbox for one full run. Selected checks
still must pass before Pages deployment. No existing run was cancelled or rerun.

## Included prepared changes

- Four facing animal sculptures, the original platform, individual solid bounds:
  see `PARK-ANIMAL-DISPLAY-QA.md` for the prior focused local evidence.
- Camera settings / pinch / first person only for the two running courses and
  the park's procedural punch burst: see `RUNNING-CAMERA-PUNCH-QA.md`.
- Those documents describe the implementation stage before this publication
  change; their local-only limits and first-run failures remain historical facts.
- Cat prototypes, boat, other games' camera/input and unrelated diagnostic files
  are not included. No new broad browser test or soak was launched locally.

## Short local evidence and preserved failures

- `short-release-profile-unit.log`: 16 focused tests passed, including the opt-in
  contract, all long setup/steps being conditional, and mandatory short gates.
- Workflow YAML parsed successfully; `git diff --check` passed.
- `short-release-existing-units.log`: water 5 passed; main suite had five stale
  literal loader/entry revision expectations after animal integration. Only
  those exact expected URLs changed to `park-animals-solid-1`; functional
  assertions and shared singleton revision expectations were preserved.
- `short-release-existing-units-final.log`: water 5 passed; main 265 total,
  262 passed, 1 failed, 2 existing optional-fixture skips. The existing staged
  camera prewarm test measured a 72.792 ms chunk against its unchanged 50 ms
  limit. This is a local failure, not an all-pass result; its cause is not proven
  by this measurement. It was not retried or weakened to obtain green.
- The publication workflow will independently run its mandatory short checks on
  the committed package. A subsequent hosted result does not erase these logs.

Deployment and live-byte verification are not established by this source note.
Their SHA, run and results belong in `.qa-results/short-publication-status.md`.
This profile is not a new full-game, multiplayer or physical-iPhone certification.
