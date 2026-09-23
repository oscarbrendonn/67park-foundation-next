# Northern housing: joined pavement and grass

## Revision 2 — regular coastal pavement

The user reported that the pavement outside the grass was still irregular.
The earlier union retained the original square coastal tabs. The outer coastal
edge is now derived only from the joined lawn, using a 4.34016 m round offset,
aligned to the existing western inner curb. The right-hand plaza connection has
a rounded corner. Grass geometry is byte-identical to revision 1 (SHA-256
`c4e364d3fa220741c786e2a830d1d0551fc7357731a4e0b089aac3a9c7446e7d`).

- No extra meshes, materials, draw calls or per-frame work. 202 more triangles
  than revision 1, still 250 fewer than the original pre-housing-repair geometry.
- The same grass/pavement buffers are reused, plus an index-only correction to
  the existing coast soil mesh; no additional geometry is added for the soil.
  Final baked JSON is 307,740 bytes uncompressed.
- Actual coastal contour: 133 sampled vertices. Width range
  4.340154437–4.340165381 m. Unit tests additionally measure the actual baked
  triangle boundary at its edge midpoints (3 mm tolerance).
- Exterior sand and apartment plots remain; the wider coastal walkway moves its
  rear extent to z=-244.82872. A 16-point inside/outside live raycast set checks
  that each outer edge changes directly from pavement to sand.
- Initial `.qa-results/north-housing-2-local-first.log`: desktop and touch PASS,
  319 probes and 8 views per profile. Visual inspection nevertheless spotted a
  tiny soil-coloured triangle near x=27.42,z=-240.57. The separate
  `.qa-results/north-housing-2-detail.json` raycast proved soil at the same
  height as pavement (9.38008564 m), despite the top-hit probes passing.
- The final baker removes exactly 210 coplanar soil-cap triangles (56.391 m2),
  all wholly covered by the new pavement. It asserts no exterior soil area is
  removed. Original slopes and all other soil indices remain untouched. Source
  export: `.qa-results/north-housing-source-with-soil.json` (the original
  pre-patch export plus the unchanged soil mesh).
- Final checks use `.qa-results/north-housing-2-local-final.log` and its matching
  image/report directory, with 321 probes per profile and an explicit rejection
  of coplanar soil under paving: desktop and touch PASS, 0 errors; the earlier
  small soil triangle is absent in the final coast-left image. Hardware Chrome;
  not physical iPhone/Safari.
- `.qa-results/north-housing-2-focused-final.log`: 38/38 pass.
- `.qa-results/north-housing-2-npm-test.log`: water 5/5; main 263 pass,
  2 existing optional-fixture skips, 0 fail.
- The first draft baker correctly rejected a disconnected east-side strip;
  the front connection was extended and rounded before any new JSON was emitted.
  Original revision-1 evidence remains below and in its separate log paths.

## Revision 1 evidence (historical)

## Scope

The user-approved interior sand gaps beside the northern outdoor pool are filled
by extending the existing pavement. The two upper housing lawns are joined.
The western interior strip and the open strip between the lower apartment plots
are paved. Exterior coast sand and the outer sandy corners remain.

Buildings, pool, roads, curb geometry, lower apartment parcel geometry,
characters, camera, controls and backend are unchanged. No additional meshes,
materials, draw calls or per-frame work. Rendered triangle delta: -452.
The baked JSON is 266,746 bytes uncompressed; it is geometry, not a new texture.

## Geometry construction

- Source: post-repair main `169199b8dc6c29290adf373fdebfe114f643edb8`, exported
  from the running local scene to `.qa-results/north-housing-source.json`.
- `qa/bake-north-housing-surface.py` unions the two authored northern components.
- Original mesh buffers are CRC-checked before either mesh is changed; failures
  are atomic. Unrelated triangles and material/mesh references are retained.
- Existing grass removed: 0 square metres. Grass added: 259.918 square metres.
- Pavement added: 955.939 square metres. Lower apartment parcel overlap: 0.
- Geometry uses the exact existing pavement/grass heights and inner curb edge.
- Installed after the previous photo repairs, before the final height sampler
  and the existing shadow-helper refresh.

## Local evidence

- `.qa-results/north-housing-local-first.log`: desktop and touch browser PASS.
- `.qa-results/north-housing-local/report.json`: 287 raycast/height probes per
  profile, preserved beach and parcel samples, no runtime/console errors, mute.
- Five independent-camera screenshots per profile in the same folder. The
  overhead, center, left strip, rear lawn and street views were visually checked.
- Chrome on Apple M4; touch profile 390 x 844 CSS pixels, DPR 3. This is not a
  physical iPhone/Safari test and is not a whole-island perfection guarantee.
- `.qa-results/north-housing-focused-unit-first.log`: 36/36 focused unit tests.
- `.qa-results/north-housing-npm-test-first.log`: water 5/5; main 263 passed,
  2 existing optional-fixture skips, 0 failures.

## Publication

Keep the current short-check deployment profile. The long browser suite and
15-minute soak remain opt-in; they were not requested or rerun for this change.
After Pages success, verify the changed public asset bytes against that exact
commit and run only `qa/north-housing-surface.browser.cjs` on its versioned URL.
Use `PARK_NORTH_URL` and `PARK_NORTH_EVIDENCE` for distinct live evidence.
