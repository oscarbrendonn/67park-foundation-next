# Four-animal park display — local, not published

2026-09-23. Based on main `52d5c13d222cc6462840a076e223a3373af0c111`.

## Requested scope

- Keep both cows; place the approved yellow/pink elephants opposite them in two aligned pairs.
- Remove the giant pink figure and loose pink ball from this display for now. Original `island/park-toys-v57.glb` remains untouched, so those assets are recoverable.
- Retain the existing circular platform exactly. No elephant preview base or second platform is imported.
- Equal cow scale 1.95 / elephant scale 2.04 gives approximately 3.96 / 4.01 m heights. Rows are 7.6 m apart with over 5.2 m clear in the center. Four figures stay inside the rim.
- No spring/riding interaction added. Follow-up: all four sculptures now use the existing solid-prop collision path with their own rotated/scaled model bounds; they are no longer excluded as decorative objects.

## Asset and integration

`island/park-animals-1.glb` is 690,384 bytes, replacing the 751,832-byte toy download (61,448 bytes less). Pink/yellow elephant geometry buffer views are shared. Original geometry, normals, triangle order, node transforms and materials are preserved exactly; no decimation or quantization. Cow, kennels and existing platform also remain exact. The old pink figure/ball are absent from the new download and scene.

`qa/build-park-animal-display.mjs` assembles from the preserved original toy GLB plus the approved optimized individual models in the sibling `2026-09-23-67park-elephant-pair/optimized` folder. Their optional preview platform is not read.

The integrated runtime changes only its toy asset path, two layout URL occurrences (startup manifest and fetch), and the prop-collider filter (remove the sculpture exclusion). It is not rebuilt from older source. Source loader and entry cache keys are synchronized at `park-animals-solid-1`. Other placements, plants, geometry, camera, movement controller, water, network and audio implementation are unchanged. These colliders use conservative individual oriented bounds, not triangle-exact surface collision; the whole display platform is not blocked. No new mesh, draw, model bytes or per-frame geometry processing is added.

## Focused checks

- `node --import ./qa/register-three.mjs --test qa/park-animal-display.test.mjs`: 4/4 PASS. Exact decoded geometry/material equivalence, unchanged platform/other placements, four facing figures and corridor/rim clearance, bounded runtime diff.
- `node qa/park-animal-display.browser.cjs`: desktop 1280×900 and touch 390×844, device scale factor 3, Apple M4 Chrome PASS. Mobile framebuffer was 780×1688 (game quality pixel-ratio cap); device DPR remained 3.
- Actual keyboard/touch input: one short walking and one skating center passage per profile, no jump, zero page/console errors, mute retained. Setup uses teleport only before routes; passage uses actual controls.
- Nine animal primitives: three instanced cow primitives with count 2 and three per elephant with count 1. Existing platform's two primitives remain count 1; no duplicate base.
- New GLB requested; old toy GLB not requested. Fifteen floor probes at the open center are supported.
- Screenshots: `.qa-results/park-animals-1/{desktop,touch}-{overview,front}.png`. Desktop overview and touch front visually inspected: facing composition, colors, four figures, existing rim, no giant/ball/new base.
- Evidence: `.qa-results/park-animal-display-local.log`, `.qa-results/park-animals-1/report.json`.
- Existing server used at `http://127.0.0.1:8496/67park-foundation-next/?v=park-animals-1`; no new server or tunnel.

## Limits

Local scoped verification only, not physical iPhone/Safari, not broad regression, not multiplayer/performance certification. No commit, push, workflow change, CI dispatch, soak or deployment. The public `52d5c13` link does not contain this arrangement yet. Other user-owned untracked files are untouched.

During assembly, the cache-sync assertion initially found two layout references instead of the expected one; inspection identified the existing startup manifest plus fetch. The sync script was corrected for those exact two references before any runtime write. No functional test assertion was relaxed or hidden.

## Collision follow-up — 2026-09-23

- Before fix: `.qa-results/park-animal-collision-before.log` and `park-animals-collision-before/report.json` preserve the expected failure. All four animal interiors and side probes incorrectly returned the platform floor (9.718 m), not a solid prop.
- Fix: remove `sculpture` only from the prop-collider exclusion in `island/park-props-v63.js` and the corresponding exact bundled expression. Existing movement/collision algorithms are unchanged. Model bytes remain 690,384.
- `qa/park-animal-collision.browser.cjs`: desktop and touch 390×844 DPR3 PASS, 8 real-input routes per profile (four animals × walking/skateboard), 16 total. Each route advances then remains stopped outside the model footprint while movement input remains held, without snapping onto the model or jumping. Side probes confirm all four bounds are solid; probes 8 cm outside each bound stay on the platform. Errors 0, muted. Not a physical iPhone test.
- Evidence: `.qa-results/park-animal-collision-final.log`, `.qa-results/park-animals-collision-final/report.json`, desktop/touch blocked PNGs. Touch screenshot visually inspected; movement position/time-series provides the contact proof.
- The original layout/center-passage test also passed again after the collision change, using separate evidence `.qa-results/park-animal-solid-layout.log` and `.qa-results/park-animals-solid-layout/`. Center walking/skating remains open in both profiles; no extra platform and no visual asset changes.
- Four focused unit checks still PASS; source/bundle equality check now permits exactly the authorized collider-filter change in addition to asset references.
- Preserved intermediate harness failures: `park-animal-collision-fixed.log` timed out on an oblique W approach (not an orthogonal stationary-contact test). The aligned follow-up (`park-animal-collision-aligned.log`) passed the first cow but the next setup remained at the previous cow: a short teleport across its newly solid boundary did not reach the fixture. Final harness uses actual mouse drag to align desktop approach and a separated spawn reset before each setup, then asserts placement before input. During a tested approach it never sets body position/velocity or collision state. Contact thresholds were not loosened. These failed records remain separate, not overwritten.
- Local only; no commit/push/deployment/broad suite or soak was started.
