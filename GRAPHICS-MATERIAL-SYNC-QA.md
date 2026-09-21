# Low graphics: preserve rendered models

## Report and cause

User reports models disappear on mobile when selecting Low and return on High/Medium.
Reproduced in real Apple M4 Chrome: High and Medium draw the world; Low leaves the
world framebuffer nearly uniform while the HUD remains. Scene meshes remain
1004 total / 940 visible; there are no JavaScript/WebGL console errors. Thus object
visibility flags, frame progress, or draw counts alone do not certify visibility.

Changing `renderer.shadowMap.enabled` did not invalidate already compiled material
program variants. On the broken Low frame, marking scene materials `needsUpdate`
restored the world without changing Low resolution or re-enabling shadows.
The later GL-state-reset diagnostic is not the cause evidence: materials had
already been refreshed before that intervention.

## Narrow production change

`app/graphics-quality.js` tracks a renderer-local shadow-variant epoch and each
scene's last synchronized epoch. Only an actual shadow-enabled boolean transition
invalidates unique scene materials, including arrays/shared materials. Scenes
revisited after a transition are synchronized before rendering. Cold Low is
included. Stable frames, repeated Low selection and High/Medium changes without a
shadow boolean change do not invalidate materials. Fallback independently guards
one synchronization attempt after disabling shadows; quality errors cannot stop
the original renderer.

No models, geometry, visibility flags, lights, textures, physics, networking,
camera behavior or movement logic were changed. No per-frame compile/reset loop.
All ten entry import maps load `graphics-quality.js?v=graphics-material-sync-1`;
camera, settings, recovery and network singleton mappings are unchanged.

## Regression evidence

- Two new unit regressions were run against the old production code first: both
  failed (expected one material refresh, observed zero). They pass with the fix.
- Unit coverage includes shared material arrays, repeated frames, scene switching,
  cold Low and the existing bounded quality-fault/no-render-interruption test.
  All ten entry cache mappings are checked.
- `.qa-results/graphics-material-sync-unit-final.log`: 263 total, 261 pass,
  2 pre-existing optional-fixture skips, 0 failures.
- `.qa-results/graphics-material-sync-foundation-desktop.log`: complete hardware
  desktop `FOUNDATION_BROWSER_PASS`, zero errors, peer still connected. Includes
  new real-frame High/Low/Medium pixel witnesses, skateboard/camera, wardrobe
  recovery, curbs/vehicles, carousel/Ferris, park/grass/roof/plaza, chat spam,
  reconnect, 100 home transitions and 20 outfit changes. Desktop soak is 0;
  this does not replace the required hosted 900000ms mobile soak.
- `.qa-results/graphics-visibility-fixed.log`: actual M4 renderer, desktop 1280x900
  and touch 390x844, repeated High/Low/Medium/Low/High/Low and persisted Low reload.
  Fourteen real framebuffer witnesses pass, no console/page errors, game muted.
  Initial run has device scale factor 1, not a physical phone test.
- Final `.qa-results/graphics-visibility-final.log` also passes desktop and touch
  390x844 with mobile device scale factor 3, all fourteen sequence/reload witnesses
  plus the exact hosted graphics helper at High/Low/Medium on both profiles.
  Applied mobile DPRs are High 2, Medium 1.25, Low 0.8; every requested profile and
  shadow flag is asserted. No console/page errors; muted. Final images/report are
  in `.qa-results/graphics-visibility-final/`. This is still M4 Chrome, not iPhone.
- `.qa-results/graphics-visibility-negative.log`: browser-only substitution of the
  exact old `HEAD:app/graphics-quality.js` passes High and fails the first Low
  witness: 2 colour bins, non-dominant fraction 0.00226223. This is an intentional
  negative control, not a regression in the fixed build or a server outage.
- `.qa-results/graphics-visibility/` contains actual High/Low/Medium/reload images
  and the report. Desktop and mobile Low images were visually inspected: character,
  houses, road and grass are visible.

`qa/graphics-pixels.cjs` reads the default WebGL framebuffer immediately after the
world's real render; DOM/HUD cannot satisfy it. It requires more than 16 quantized
colour bins and at least 8% non-dominant pixels. It detects this empty-world
regression, not every possible isolated missing mesh. These checks also run at
High/Low/Medium inside the existing hosted foundation test; existing framebuffer,
  shadow, frame-progress and connection checks remain intact.

Read-only independent review confirmed epoch/fallback/cache scope and caught a
test-label loophole. The focused runner now also asserts the actually applied
profile, shadow flag and DPR at each requested level, not merely the UI selection.

## Release boundary

Local checks are not a published release. Same-commit complete hosted regression,
15-minute mobile soak and Pages deployment remain mandatory, followed by live
asset checks and actual online browser interaction. Live graphics check:

`PARK_GRAPHICS_URL=<versioned Pages URL> node qa/graphics-visibility.run.cjs`

Physical iPhone test is the user's pending test, not completed here. No universal
performance, all-device or zero-error guarantee. Boat remains a separate local
prototype and is not part of this graphics fix/public release.
