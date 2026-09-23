# Cat character — local design

Existing cat head on the exact current gorilla body, with a light-grey body tone matched to the head's visible appearance.

- Head: `cat-preview/cat-head-mobile.glb`, unchanged geometry and original atlas.
- Body, arms, legs and hands: `models/goril-motion-v3.glb`, unchanged positions, normals, indices, weights and bind matrices. Only body UVs are remapped to the head atlas's clean fur region. Old gorilla head, crown and flower are not included.
- Body color: the actual original head base-color texture, with a neutral linear `[0.65, 0.65, 0.65]` tint. Body UVs stay in a clean `#e7e9e8` fur patch, away from facial details. All three body meshes share this material and the same texture object as the head.
- Revision 3 addresses the user's glossy-body mismatch: body roughness is now `0.7` to soften the tight limb highlights. It intentionally does not copy the head's low roughness numerically, since that produced plastic-looking streaks on the smaller curved body. The original head material, textures, face and eyes remain unchanged.
- Revision 4 follows the user's clarification: the remaining problem was the body looking white while the head looked grey, not a lack of shine. Only the body tint changes; roughness remains `0.7`. Under the unchanged reference lights/camera, sampled body chest/leg medians move from about RGB 237 to 225, alongside head side RGB `[225,226,225]`. This is a visual tone calibration, not a claim that head/body material parameters are identical or that all differently lit surfaces have equal pixel colors.
- One shared 20-bone rig; the existing head is bound to `Head`. Seven original gorilla animation clips retained without resampling.
- 20,912 triangles, four meshes, two materials, 1,723,216-byte GLB. This is a design asset, not a performance certification.

Open `cat-character/index.html` through the existing local project server. Drag to rotate, use Front / Three-quarter / Back, or preview the original Idle / Walk clips. Download GLB exports the assembled asset.

## Reproduce

`node qa/build-cat-character.mjs`

The builder copies binary geometry, skin matrices, atlas images and animation samples without a Blender re-export. It checks 849 copied buffer views byte-for-byte. Source hashes and assembly counts are in `build-report.json`.

## Targeted checks — 23 September 2026

- Loaded in actual local Chrome with repo-local Three.js and Draco dependencies.
- Four meshes, 20 bones, 20,912 triangles; every weighted head vertex follows `Head`.
- Checks all 12,603 body UV vertices against the original head atlas: each samples clean fur `[231,233,232]`; body/head use the same loaded color texture. Body tint is `[0.65,0.65,0.65]`, head tint remains `[1,1,1]`. Body roughness is `0.7`, metalness `0`.
- Idle and walk sampled at 0, 0.25, 0.5 and 0.75 seconds: finite bounds and no vertical head/body gap.
- Front, three-quarter, back and walk renders visually inspected.
- Touch-size 390 × 844 / DPR 3 preview: character and controls visible; no horizontal overflow or recorded JavaScript errors. This is browser emulation, not a physical iPhone test.
- Current evidence: `.qa-results/cat-character-grey-4/report.json` and screenshots in the same directory. Earlier evidence remains separately in `.qa-results/cat-character/` and `.qa-results/cat-character-fur-3/`.
- The first capture script timed out waiting for requestAnimationFrame after switching viewport in the background tab. Replaced that capture-only wait with explicit resize/render; no model assertions were weakened.

The 23 September prototype checks above did not install the character in game.

## Game integration — 24 September 2026

The unchanged 1,723,216-byte GLB is now wired as `cat67` / **Cat 67**, alongside Gorilla 67. Friends remain clothing donors, not selectable player characters. The cat loads on demand, uses the same original 20-bone movement family, and keeps its selection and equipped clothes when returning to the park or entering a mini-game. The fitted glasses use a lower eye line because the cat's bounds include its ears; built-in Gorilla crown/flower options are not offered for the cat.

Targeted evidence and release status: `CAT-INTEGRATION-QA.md` in the project root. The old build report describes asset assembly, so its `installedInGame:false` field is historical rather than a current release verdict.
