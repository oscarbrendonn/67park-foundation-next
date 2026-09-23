# Three reported surface defects — 23 September 2026

Publication follow-up: the user authorized the current release on
23 September. These surface changes accompany the camera/settings release.
The local-only statements below describe the original verification stage;
deployment is not claimed until the new same-SHA hosted gate and live checks
finish. Cat and boat prototypes remain outside the release.

Status: implemented and checked locally on top of `73ae48db8f8d303945d64c569bbdcb406500602b`. **Not committed, pushed or deployed.** The existing water release does not contain these changes. No general regression, soak, workflow dispatch or CI bypass was started for this request.

## Changes

- Photo 1: the large northern skatepark base now reaches the actual inner curb boundary on all four sides. This replaces its inset outer contour, adding 1070.306998 m² of solid paving; it does not scale or move ramps, rails or the bowl. The existing bowl opening is unchanged (symmetric difference 0 m²). Top and bottom heights remain 9.241904107 and 8.800440892 m.
- Photo 2: four old `CENTER73_PATH_*` decorative boxes had a 10 mm air gap above the central paving and a raised top. Their faces are removed from rendering and terrain sampling. Their named mesh references remain for existing scene/material contracts; the continuous slab underneath is the walking surface. Buildings, lawn rims and planting remain unchanged.
- Photo 3: the four central slabs and their separate L-shaped curb strips are rebuilt as four continuous rounded contours. All eight street-mouth returns use the same construction. The old detached curb-end teeth are gone. The 9.29 m interior, 9.38008564 m lip and 6.10153 m central road width remain; contour change is 4.886246 m². Exposed road at the rounded returns is filled with solid road geometry (1.822033 m²).

`app/photo-surface-finish.js` validates source vertex/index hashes and all targets before assigning any geometry. It runs in both maintained runtimes after existing repairs and before the final sampler. The side-only skatepark shadow helper is refreshed from the expanded base. Materials and mesh references are retained; no per-frame work, extra materials or extra meshes are added. Runtime triangle delta is -20, excluding the refreshed shadow helper.

Only entry/runtime cache keys change to `photo-surfaces-1`. Movement, camera, graphics, recovery and network singleton aliases are unchanged.

## Focused evidence

- `node --test qa/photo-surface-finish.test.mjs`: 5 passed, 0 failed, 0 skipped. Covers baked winding/normal validity and scope, idempotence, material/reference preservation, atomic failure, removed connectors and runtime integration.
- `node qa/photo-surface-finish.browser.cjs`: desktop 1280×900 and touch 390×844 / device DPR 3, sequential real Apple M4 Chrome contexts. Each passed 126 rendered-surface/terrain-sampler probes and captured six targeted views. 252 probes total, no page/console errors, game muted.
- `.qa-results/photo-surfaces-final/report.json` and the adjacent desktop/touch PNGs contain the focused browser evidence. Mobile canvas rendering DPR is controlled by the existing graphics setting, independently of device DPR.
- `.qa-results/three-photo-before-sand.png` / `three-photo-after-sand.png`, `three-photo-before-corners.png` / `three-photo-after-corners.png`, and `three-photo-photo2-line.png` preserve inspection evidence. Additional corner views are in the same directory. These are independent-camera geometry views, not player-input tests.

The personal-browser WebBridge view stalled at 87% loading and is not counted as a pass. The completed checks above used isolated project Chrome contexts. No physical iPhone result, full-game pass, universal absence of map defects or new online/multiplayer validation is claimed.

## Reproduction

The local server was already running on port 8496; the checks did not start or restart it.

```sh
python3 qa/bake-photo-surface-finish.py .qa-results/three-photo-current-geometry.json repairs/photo-surface-finish-1.json
node qa/integrate-photo-surface-finish.mjs
node --test qa/photo-surface-finish.test.mjs
node qa/photo-surface-finish.browser.cjs
```

The baker input is the actual post-existing-repairs scene export. It must not be replaced with the older pre-repair map export. This diagnostic snapshot is local evidence, not a runtime dependency.

The user's original eight untracked `qa/*diagnostic.cjs` files, backend/tunnel, other projects and running publication workflow were not modified.
