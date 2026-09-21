# Continuous sidewalk material — 2026-09-21

User request: the pale/white patches beside grass and model corners are ordinary
sidewalk, not a separate floor colour. Work stays in `67park-foundation-next`;
the original feel-lab checkout is unchanged.

## Cause and scoped fix

The four central slabs used `CENTER71_CLEAN_IVORY` (grey `d1c7ca`, emission
`.12`, ceramic finish); central edging used `e6cbca`. Twelve lawn support rims
used a separate pale `d6ccc6` material, and four path strips another emissive
material. Separate district pedestrian floors also had their own grey/cream
palettes. This was a real material mismatch, not a missing texture.

`app/sidewalk-materials.js` reassigns exactly 26 ground meshes to the actual
`6_BORDUR` material (`67_KALDIRIM_TABANI_M`, `d8b7ae`, roughness `.84`, environment
intensity `.34`, no emission). The full material/shader is shared, not just RGB.
The existing surface finish therefore treats all of them as the same stone.

- Four central slabs, twelve lawn rims, four narrow paths, one central edging.
- Lower-plaza pedestrian ground, Sports97 floor paving, west courtyard paving,
  north-pool deck paving and NW93 continuous walking surface.
- An exact mesh allowlist, not a global white/cream material replacement.
- Grass, architectural white trim, fountain, decorative planter discs, the `67`
  inscription, sports playing surfaces/lines, pool interior and Sports97 solid
  model apron retain their materials. In particular, changing a lawn rim does
  not mutate the original material shared with its decorative planter.
- Geometry, normals, positions, heights, visibility, samplers and collision rules
  are unchanged. No new draw calls or per-frame work.
- All present targets validate before any reassignment. Missing optional district
  assets are tolerated to retain failure isolation; the full-scene QA requires
  all five districts. Integration runs after geometry repairs and before the
  reversible surface finish in both maintained runtimes.

## Verification

- `qa/sidewalk-materials.test.mjs`: scoped material identity, unchanged geometry
  and excluded objects, invalid/duplicate/missing atomicity, idempotence and both
  maintained runtime/cache entry points.
- `qa/sidewalk-materials.live.cjs`: full 26-mesh material identity, stone shader,
  zero emission and eight protected-object checks. Included in the mandatory
  desktop/mobile foundation gate.
- `qa/sidewalk-materials.browser.cjs`: 20 near/equivalent-angle desktop views,
  five matching mobile-viewport views and five local before comparisons. No
  bird's-eye acceptance; loading and wardrobe must be absent before capture.
  Muted in-game; normal renderer, no production overrides in the after views.
- Captures and logs: `.qa-results/sidewalk-materials/` and
  `.qa-results/sidewalk-materials-browser-final.log`.

Results: `npm test` passed (163 total, 161 pass, two pre-existing optional fixture
skips, zero failures). The close-view run passed on Apple M4 Metal: five before
views / 165 drawn frames, 20 after views / 706 frames, five mobile-viewport views /
147 frames, zero JS errors or WebGL context losses. Both after scenes passed all
26 material checks and eight exclusion checks. Root compared close central
corners, lawn rims, model edges, courtyard, pool and NW track images; this is not
an all-device guarantee. Source and bundle syntax and `git diff --check` passed.

The full hardware desktop foundation rerun passed in
`.qa-results/sidewalk-foundation-desktop.log` (`mobile:false`, `soakMs:0`, zero
errors, peer still connected). It includes the new material checks, all existing
geometry, curb walk/skate/vehicle and carousel checks, real roof/plaza jump
routes, chat spam, identity-preserving reconnect, 100 home transitions and
optional-feature isolation. The hosted mobile run retains its full 15-minute
soak; it is not replaced by this bounded desktop rerun.

The preceding geometry release d49eb01 completed hosted gate and Pages run
35550560269 successfully; this new material change needs its own gate. A local
screenshot or successful push is not a published release. Hosted full regression, recovery,
chat/home transition tests and the 900000 ms mobile soak remain mandatory before
Pages. This change has no new physical iPhone/Android acceptance evidence.
