# English player-facing interface

The user requests English for all game interface copy, including future
features. Player-authored chat and names are not translated. Internal asset
identifiers, lookup keys, comments and multilingual moderation rules remain
unchanged.

## This change

- Translate the explore page's document language, headings, accessible labels,
  camera controls, help, all 15 loading stages and retry/error messages.
- Translate the lobby court panel, basketball/football labels and connection
  status copy. Court IDs, world positions, rules and network messages do not
  change.
- Translate reachable island startup/validation error strings in the maintained
  source and the already integrated runtime bundle. No full bundle rebuild.
- Advance main/explore/runtime entry cache keys to `english-ui-1`; all ten
  application import maps resolve the translated court UI at that revision.
  Movement, camera, recovery, network and geometry module revisions are retained.
- The unshipped local boat experiment receives its own English controls in its
  separate `codex/boat-light-trial` worktree. It is not included in this release.

## Local verification

- `npm test`: 251 total, 249 passed, two existing optional-fixture skips, zero
  failures. Includes five new English-copy/accessibility/cache tests.
  Evidence: `.qa-results/english-ui-unit.log`.
- `node qa/english-ui.run.cjs`: actual Apple M4 Chrome game load, English court
  UI at basketball (1280 px) and football (390 px), visible avatar, no page
  errors, game muted. The 390 px width is a browser viewport, not a phone test.
- Separate touch/mobile browser context: deliberately abort only the explore
  runtime request, then verify the actual English error and Retry loading UI.
  This is a controlled recovery-copy test, not a server outage or successful
  explore-world load. Captures/report: `.qa-results/english-ui/`.
- Kimi native-browser inspection independently found the English explore
  headings, labels and loading stages. That existing native tab remained at
  stage 13 during inspection; it is not counted as a successful full-world load.
- Application JavaScript diffs are string replacements only, plus loading-stage
  array formatting and cache URLs. Physics, meshes, motion and backend code are
  unchanged. All previous unit invariants remain enabled.

## Release requirements

Local text verification is not publication. The new commit must pass the full
existing hosted regression and 900000 ms mobile soak before Pages deployment.
Then verify the 52 live entry/module/icon bytes, English cache keys, targeted
live UI test (`PARK_ENGLISH_URL=<versioned URL> node qa/english-ui.run.cjs`),
existing geometry/ride/vehicle checks and real multiplayer/reconnect flow.
No physical iPhone/Android or universal stability claim is made.
