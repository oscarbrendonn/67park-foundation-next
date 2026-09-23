# Cat head fit and Glow preview

Base release: `4d8f473bc2c6ed1d80bbbdc37f2b479b854eb93f`.

## Change

- Cat rest head envelope matches Gorilla on x/y/z (within 1e-6 source units).
- Cat uses Gorilla's canonical body normalization in studio, local/remote park
  avatars and five shared mini-game assemblers. Previously Cat was enlarged by
  normalization against its shorter source bounds (Gorilla includes a crown).
- Cat glasses are anchored at measured eye height, not the centre of the bounds
  containing the ears. Front and three-quarter fits visually inspected.
- Studio orthographic camera has a modest downward angle: the existing flat Glow
  ring no longer projects to zero height. Gameplay camera/effect logic unchanged.
- No new geometry or texture compression: original Cat compressed vertex data,
  materials and atlas are byte-identical. Only its Head inverse-bind matrix is
  fitted; body geometry, skeleton and seven animation clips retained.
- Model: 1,723,268 bytes (+52 bytes), 20,912 triangles, four meshes, two materials.
- Map, physics, backend, tunnel and release workflow unchanged.

## Local evidence

- `npm test`: pretest 5 pass; main 265 total, 263 pass, 2 existing optional skips,
  zero failures. About 16 seconds; no full browser regression or soak.
- Release-feature + character-menu unit checks: 45 pass, zero failures.
- `.qa-results/cat-fit-before`: original raw head geometry and front screenshot.
- `.qa-results/cat-fit-after`: fitted raw geometry and front screenshot.
- `.qa-results/cat-fit-verified`: head-size equality, shared normalization,
  front/three-quarter screenshots. Original and fitted evidence both retained.
- `.qa-results/cat-fit-glow-local`: portrait 390x844, DPR2 touch preview, actual
  Glow none/pink/mint screenshots, park handoff and zero page errors.
- `.qa-results/cat-fit-glow-local-motion`: adds actual touch walking away from
  shared spawn, close front QA camera of actual animated Cat with glasses.
  None-to-pink changes 3,558 pixels; pink-to-mint changes 3,905 pixels in the
  lower preview region (RGB summed change >24). No mock model or CSS substitute.
- `.qa-results/cat-fit-minigames`: Lane Rush and Skypark Cat with fitted clothes,
  entry and real movement/jump pass, zero page errors. Not complete game suites.

Own isolated Chrome; no user's browser and no physical iPhone test. The local
results above do not establish publication; exact commit/deploy and live checks
are recorded separately in `.qa-results/cat-fit-glow-publication-status.md`.
