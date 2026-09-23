# Northern housing: joined pavement and grass

## Revision 4 — remove the photographed pavement gap and broken inner seam

The revision-3 road endpoint was aligned, but visual QA missed a triangular
hole at the western edge of the housing pavement near x=-3.3,z=-218.8. A
screen-coordinate raycast in `.qa-results/north-road-seam-before.json` reaches
dry sand there; neighbouring points hit pavement. The curved buffer did not
meet the straight inner curb. The independently bevelled curb also left an
irregular inner line alongside the flat new pavement.

The western pavement is now a continuous union from the road edge to the lawn
and plaza. The existing northern housing U-shaped curb footprint is absorbed
into that same pavement cap, and its 408 original faces are removed from the
curb mesh. There is no overlay strip, hidden coplanar cap or second interior
wall at this join. The road retains its exact previous endpoint/width/height;
the pool-side curb, grass, lower parcel holes and exterior beach remain.

- Grass repair row remains byte-identical to the approved previous release.
- No extra meshes/materials/draw calls or per-frame work. Total baked triangle
  delta vs original source is -714 (464 fewer than revision 3).
- Existing coast width tolerance remains 3 mm. The western return now belongs
  to the straight road join, so coastal-only samples are x>1,x<130 and include
  edge midpoints (146 baked samples); no coastal distance tolerance was widened.
- The first development bake rejected the former >100 vertex count when the
  western arc was removed; adding coastal midpoints restored the sampling count
  while preserving the exact 3 mm geometric tolerance.
- Unit coverage includes a 1,337-point grid over the reported join; browser
  coverage adds 672 points along the photographed seam (1,028 total per profile).
- `.qa-results/north-housing-4-unit-first.log`: 8/8 PASS.
- `.qa-results/north-housing-4-focused.log`: 34/34 PASS. npm tests: water 5/5,
  main 263 PASS, two existing optional-fixture skips, zero failures.
- `.qa-results/north-housing-4-local-first.log`: focused desktop/touch profiles;
  screenshots in `north-housing-4-local`. Desktop close overhead and road-level
  images were visually inspected; the triangle and broken inner line are gone.
  These checks are not a physical iPhone test or whole-map perfection claim.
- Public cache alias: `north-housing-4`; existing short publication profile.

## Revision 3 — align the road endpoint with the coastal pavement

The user identified the short road between the northern pool and housing. The
road endpoint moves from z=-237.283415605 to z=-240.75751 (3.474094395 m), matching
the adjacent coastal pavement tangent. The 10.56999 m road width and all heights
remain unchanged. Its existing two side curbs extend with it.

- 12 road vertices and 409 curb vertices move only in z. Indices, authored
  normals, materials and all other vertices remain unchanged; no extra mesh,
  triangle or per-frame work. Source buffers are CRC-checked, and the five mesh
  changes install atomically before the final terrain sampler/shadow refresh.
- Previous grass/pavement/soil patch rows are byte-identical to revision 2.
- Reproduce after the base baker with `python3 qa/bake-north-road-end.py
  .qa-results/north-road-source.json repairs/north-housing-surface-1.json`.
  This uses an unchanged-road/curb post-photo-repair export.
- First unit run: 8/8 PASS (`north-housing-3-unit-first.log`). Focused changed
  feature tests: 34/34 PASS (`north-housing-3-focused.log`). Local npm tests:
  water 5/5 and main 263 pass, two existing optional-fixture skips, zero failures.
- First local browser run stopped on the old sand expectation at (-3.8,-239).
  That point is now deliberately inside the extended curb. The point was kept
  and explicitly changed to expect curb; exterior sand probes beyond the new
  road end were added. Original failure remains in
  `.qa-results/north-housing-3-local-first.log`.
- Final focused evidence is `.qa-results/north-housing-3-local-final.log` and
  matching screenshot/report directory. Includes old/new road joins, new curb
  ends, exterior sand, terrain sampler agreement, and close overhead/road-level
  views. Browser touch emulation is not physical iPhone testing.
- Cache entry/runtime/module/JSON alias: `north-housing-3`. Keep short publish
  profile; no broad browser suite or soak is needed for this small change.

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
