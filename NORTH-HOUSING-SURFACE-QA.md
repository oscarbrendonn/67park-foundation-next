# Northern housing: joined pavement and grass

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
