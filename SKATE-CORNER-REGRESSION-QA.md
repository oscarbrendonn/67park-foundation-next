# Reported curb corner and skateboard regression — 2026-09-21

Status: local fix candidate; full regression and publication acceptance pending.
The user supplied iPhone screenshots/video, reports severe skateboard slowdown
and a disappearing Style Studio character, and explicitly identified
`https://oscarbrendonn.github.io/67park-feel-lab/` as the version that worked for
their three-to-four-player group. Preserve that original repository/site.

The live reference is **b3ea3c2893aedbb7c590de4e454577850b64662c**: successful
Pages deployment 6542868810, workflow 35452457713. On this turn, the live main,
runtime bundle and camera-mesh module were HTTP 200 and SHA-256 identical to
those exact Git blobs. The reference is not the later failed feel-lab main.

## Corner reproduced

The closed-window pink building is in `REFERENCE_CITY_V60`, near U08. The
southeast curb corner has a visible step in its edge profile near world
X=-15.099, Z=114.245. Close ground-level views reproduce it.

Horizontal ray probes distinguish a rounded straight segment from an abrupt
unrounded corner tail: at Y=9.37, Z=114.20 the exterior X is -15.133328;
at Z=114.30 it is -15.099001. The first surface is sloped, the second vertical.
The abrupt end of the bevel makes the corner look broken. The relevant corner
tail triangles also exist in the saved pre-map-edge geometry export; d49eb01
did not alter this section of 6_BORDUR. That does not excuse the missed visual
defect or establish when it was originally introduced. The separate triangular
artifact in the first user screenshot is not yet fully isolated.

Evidence: local browser close view
`/var/folders/1w/cxvzv701549dx6r_570dsbp80000gn/T/kimi-webbridge-screenshots/screenshot_20260921_075925.799.jpg`.

## Skate timing

Bounded diagnostic on local HEAD ab6028d, desktop Chromium with Metal, gorilla,
game audio muted. No production source, public backend, or device settings changed.

- First KeyV: repeated cold runs had 195–223 ms long tasks and 200–233 ms RAF
  gaps. A DevTools trace attributes 209.33 ms of a 216.12 ms task to the
  `gesture` callback in `app/party/party-audio.js` (keydown).
- That callback unconditionally invokes `ensure()` before `quiet()`. It can
  initialize/resume WebAudio even when the game is muted.
- Skate sole measurement was about 3 ms, not the observed 200 ms blocker.
- A subsequent real-controller U08 ride covered 15.1 m in about 3 seconds,
  with 191 rendered frames, maximum RAF gap 16.8 ms and no long task/error.
- Ground, character-ground, and shadow calls did not individually exceed
  0.4 ms in these bounded runs. Program count did not increase on toggle.

Artifacts: `.qa-results/skate-performance-diagnostic.json` and
`.qa-results/skate-enable-trace.json`; diagnostic scripts are local QA only.
Earlier disabled-map/material variants ran after the current variant in one
browser process; those warmed comparisons cannot establish causality.

The trace identifies a real first-gesture hitch. It does **not** prove this is
the cause of the user's sustained iPhone slowdown, nor certify mobile Safari
performance. No skateboard/geometry fix has been published for this report.

## Follow-up: sustained camera cost reproduced

The subsequent probe separates accepted ollie/kickflip/landing events from
movement near U08. Its current saved run contains **two** accepted cycles
(an earlier six-cycle run was overwritten and is not used as retained evidence).
Both cycles and the following stationary phase had maximum RAF gaps of 16.8 ms,
no long tasks, and no continuing program/texture growth. Skate numeric state
remained finite; the probe found zero bones through its inspected handle, so it
does not establish a full skeleton-pose check.

Real KeyD movement after the jumps reproduced repeated roughly 150 ms tasks
and a maximum 166.7 ms frame gap. An independent V8 CPU profile then compared
the same movement **without preceding jumps** and after two accepted jumps:

- Each phase moved about 7.2 m with 35 drawn frames during the sampled interval,
  including its brief release/settling tail; p95/max frame gap 166.6/166.7 ms.
- `cameraMeshCast` took 841.97 / 846.68 ms inclusive in 1491.12 / 1410.59 ms
  sampled respectively. The stacks run through `feel-camera.step` and Three's
  triangle intersection / vertex-reading functions.
- The profiler identifies sustained camera occlusion triangle work as the
  local bottleneck. The jumps are not required to trigger it. The earlier
  outer RAF trace alone was insufficient to make this attribution.
- `city-props-v60.js` batches all eight buildings by material and supplies the
  non-glass batches as camera blockers. A broad batch bounding box can overlap
  a camera ray while its exact cast still scans distant triangles. This fits
  the measured hotspot; a fix must retain actual wall occlusion and should
  accelerate the camera query without changing the visible map or controls.

Evidence: `.qa-results/skate-jump-performance-diagnostic.json`,
`.qa-results/skate-postjump-trace.json`, and
`.qa-results/skate-postjump-cpu-profile.json`.
These are desktop Chromium/Metal diagnostics at local ab6028d, not a capture
from the user's iPhone. They do not establish the first introducing commit.
No production camera changes were made during this diagnosis.

## Follow-up: missing wardrobe character not yet reproduced

The visible local browser drew the gorilla in Style Studio. A disposable
390x844 mobile-viewport Chromium test exercised four reopen cycles, shoes,
back, outfit and headwear changes, and forced preview context loss followed
by the existing Retry character action. All 22 draw checks passed with no
page errors. Immediate post-draw pixel reads verified a nonempty character
frame; the restored screenshot also visibly contains the avatar.

Evidence: `.qa-results/wardrobe-visibility-diagnostic/report.json`,
`mobile-outfit.png`, and `restored.png` in that directory. Pixel instrumentation
was injected only into the disposable test page, not the production source.
This is **not** physical Android/iPhone acceptance or proof that the reported
disappearance is absent. The attached Android is authorized but remains on
its lock screen; no lock bypass or navigation of its existing game tab was
performed. Await an unlocked test device and a screenshot of the blank
wardrobe, including any loading/retry text.

## Candidate changes and review

- Exact camera triangle queries use a spatial index, retaining authored walls,
  instances, transforms, visibility and open spaces. Root review rejected the
  initial 196.5 MB minimum retained duplicate-vertex cache as unsuitable for a
  phone regression fix. The final cold local run indexes 498 unique geometries,
  2,589,276 triangles, retaining 10,357,104 bytes of Uint32 source references
  instead of duplicate vertex arrays. This is a minimum payload, NOT total
  additional RAM: node objects, arrays and engine overhead are not included.
  No bounding-box-only wall approximation is used.
- Index construction must complete in yielded chunks **after the complete
  island is loaded**, before controls are exposed. An initial local integration
  mistakenly wrapped the central-building loader (`no`), which had no world
  blockers. This was caught in a fresh browser and moved into the exported
  `__parkDriveRuntime`; a dynamic unit test invokes the actual shipped export
  and checks its awaited ordering. A marker alone is not acceptance.
- The existing idempotent skate-rail finishing installer replaces twelve
  coping/accent geometries. It now runs before camera preparation, not on the
  first party frame. This preserves its existing shapes/materials while avoiding
  a cache rebuild in gameplay. The browser gate requires the number of prepared
  geometries to remain intact after entry and the actual ride.
- Both party audio and the legacy ambient/bird graph now ignore muted or
  hidden-page unlock gestures. Unmuting still permits normal audio startup.
  The final fresh KeyV trace in `.qa-results/skate-muted-ambient-final.log`
  has a largest task of 11.01 ms, compared with separately retained 167/209 ms
  ambient/party initialization traces before their fixes. This is local Metal
  evidence, not physical iPhone evidence.
- Wardrobe previews redraw on `pageshow` and visible `visibilitychange` using
  the existing synchronous capture/draw path. No continuous render loop or
  preserved drawing buffer was added. Hidden, paused and disposed previews do
  not redraw. The browser test clears a preview buffer without losing context,
  requires nonempty pixels after resume, then separately exercises context
  loss, Retry and disposal. Only the explicitly armed wardrobe canvas loss is
  expected; a world/other canvas loss still fails the existing gate.
- The reported city curb and adjacent waterfront curb now have one 6 cm rounded
  profile through their tails. Twenty-three sub-0.001-square-metre crack holes
  close while both large courtyard openings remain. Sub-centimetre outline
  cleanup removes thin backtracking slivers. The source GLB, buildings, grass,
  gameplay height and draw-call count are unchanged. The patch is versioned.
- The actual pre-repair fixture passes all eight geometry tests. Six profile
  sections at three heights directly test the formerly discontinuous tail.
  Sixteen close/right/left city views are retained in
  `.qa-results/city-curb-final/`; this is not a promise that every map viewpoint
  or every physical phone has been exercised.

All work remains in `67park-foundation-next`; original feel-lab/kimi/mobile
checkouts and unrelated cat files were not edited. Audio is muted during QA.
The existing free backend health check returned `ok:true`, zero faults; no
paid server, replacement public tunnel or public backend restart was done.

## Exact reference comparison and acceptance scope

The immutable b3ea3c2 archive and this candidate were exercised in separate fresh
hardware Chromium contexts, with the same local QA backend, camera location,
framebuffer ratio, two real jump/flip cycles and real directional input. All four
phases connected online and had zero JS errors. The U08 route's observed p95 frame
interval was 166.7 ms for the archived desktop/mobile-viewport clients and 16.8 ms
for the candidate. The movement phase drew 33 versus 72/70 frames respectively.
These are bounded local observations, not average whole-game FPS, phone results,
or a contradiction of the user's successful earlier multiplayer session.

Evidence: `.qa-results/healthy-reference-equal-network-final.log` and
`.qa-results/healthy-reference-compare-equal-network.json`.
Reproduce using `PARK_REFERENCE_ROOT=<immutable b3ea3c2 archive>` and
`PARK_REFERENCE_BYPASS_LNA=1 node qa/healthy-reference.compare.cjs`.
Chromium classified the route-fulfilled archived document differently from the
real loopback candidate and blocked its WebSockets with
`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`. The documented opt-in launch flag
is applied to BOTH disposable test browsers only. No production browser security,
application networking or backend configuration was changed for this comparison.

The live reference's studio catalog, player profile, studio panel and gorilla
items modules are byte-identical to the current corresponding files, and the
model asset tree is unchanged from b3ea3c2. No missing catalog/asset migration was
found. This does not prove the reported blank preview is solved on Safari; the
resume-redraw/Retry tests cover the recovery behavior implemented here.

The first combined local browser run passed asset/download recovery, graphics,
wardrobe recovery, curb/carousel/grass/corner checks and the roof route, then
failed the plaza observer. Its QA-only import still loaded the old movement query
key, creating a second unstepped controller singleton (`frames:0`) rather than
observing the live avatar. The test import must match the production module key;
the route, jump-height assertions and physical collision rules remain unchanged.
The fresh full local rerun passed both desktop and mobile-viewport cases with
zero JS/world-WebGL errors and the peer still connected, including chat spam,
100 home transitions, real-input roof/plaza routes, carousel carry and board
movement. Evidence: `.qa-results/skate-full-hardware-final-2.log`. No local long
soak was repeated here; the hosted 15-minute mobile soak remains mandatory.
On this final rail-prepared version, both prewarm maximum chunks were 7.8 ms;
the board route drew 53 frames, travelled 8.43/8.45 m and had at most 16.8 ms
frame gaps. No geometry was reindexed during the ride.

The first hosted candidate a7ef2a8, workflow 35560967398, failed the independent
minigame download recovery scenario before reaching foundation/soak. Its failed
entry did not show Retry until the 45-second fallback, after the server's
20-second disconnect grace had expired. The resumed guest had no match room.
The late-listener race is fixed by reading the already-recorded inline entry
failure on recovery UI installation (match pages only), with the same predicate
as future error events. The browser fixture holds the independent recovery
module until after the real entry import rejects, then requires Retry within
15 seconds rather than the 45-second fallback. It reaches Retry with the room
still loading and completes a real recovered match, reconnect and both return
routes. Evidence: `.qa-results/recovery-browser-late-entry.log`. Server grace,
load deadlines and all existing recovery timeouts/assertions remain unchanged.
All entry pages map bare and legacy-query recovery imports to the same new
version, avoiding duplicate instances and stale cached recovery code.
Final pre-push unit run: 176 total, 174 pass, two existing optional-fixture
skips, zero failures (`.qa-results/skate-recovery-unit-publish.log`). The explicit
actual-map fixture additionally passes all eight tests with no skips
(`.qa-results/skate-recovery-geometry-publish.log`). Publication remains gated
by the next hosted regression, 15-minute soak, Pages deployment and live checks.

## Release distinction

The ab6028d material-only workflow 35552864028 is now successful. That gate
does not include a fix for the newly diagnosed camera hotspot or establish
that the reported wardrobe disappearance is resolved. No new link is being
presented as a fix for these reports.
