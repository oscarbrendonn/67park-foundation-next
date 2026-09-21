# South park entrance paving join

## Report and cause

The two September 21 screenshots show a thin dark line emerging from the grass
and triangular dark cuts beside the raised pink path. The same defects were
reproduced locally at the south entrance, on both sides of `8_PARK_PATIKA_UST`.
They were geometric joins, not a network-disconnection symptom: old rounded
shoulder/bevel faces remained next to the straight path repair.

## Bounded repair

- World-space shoulder windows: `[167.14,113.48,168.59,116.34474498]` and
  `[175.58,113.48,177.04,116.34474498]` (X/Z), total area 8.3364 square metres.
- Retessellate only the intersecting `6_BORDUR` / `7_KALDIRIM_TABANI` faces;
  retain their clipped complements, original position/normal prefixes and
  interpolated original normals outside the cuts.
- Reuse the two existing `PARK_ENTRY57_*_SLOT` meshes as closed shoulders at
  their existing 9.38008564 m height. Empty the two obsolete inside tip meshes,
  rather than layering another coplanar overlay over them.
- Preserve all six mesh identities/materials. The path and grass vertex arrays,
  path height, movement rules, camera, network and audio code are unchanged.
- Net triangle change: -1,397. No additional draw calls or per-frame work.
  The approximately 89 KB numeric patch is applied once, before the final
  ground sampler, side-shadow geometry refresh and camera index preparation.
- Source position/index CRCs and atomic preparation reject mismatched geometry
  without a partial repair. Both maintained runtime loaders use the same patch.
  Entry/runtime cache revision: `park-entry-finish-1`.

The original repositories, unrelated cat files and existing public Mac backend
and tunnel were not changed.

## Local evidence

- Before captures: `.qa-results/park-crack-south-entry-before.png` and
  `.qa-results/park-crack-west-shoulder-before.png` reproduce the supplied cuts.
- Eight final close-angle captures were inspected (both shoulders, forward and
  reverse, desktop and 390x844 mobile viewport), under
  `.qa-results/park-entry-finish/`. These are explicitly labelled detached
  geometry-inspection cameras, not claims that an invisible avatar is playing.
  The thin line and triangular cuts are absent in these views.
- `qa/park-entry-finish.run.cjs`: desktop and mobile-viewport PASS. Each profile
  checks 192 rendered surface/production-ground samples and 16 real controller
  routes over the two shoulders, on foot and skateboard, in both directions.
  Existing curb routes, actual keyboard/trusted touch input and skateboard
  camera/jump checks also pass. No JS/WebGL errors; game audio stayed muted.
- Full unit suite: 225 tests, 223 pass, 2 pre-existing optional fixture skips,
  zero failures (`.qa-results/park-entry-unit-final.log`). Four mandatory new
  unit checks cover geometry, atomicity, material/attribute preservation and
  loader order. With `PARK_ENTRY_FIXTURE=.qa-results/park-entry-before.json`,
  all five checks pass against the exported real geometry as well.
- The browser geometry/routes are added to BOTH profiles of the full
  `qa/foundation-browser.cjs` gate; no previous cases or tolerances are removed.

This is targeted south-entrance evidence, not a claim that every corner of the
whole island or every physical phone has been exhaustively tested. Mobile
viewport/touch emulation is not physical iPhone or Android validation.

## Publication

At documentation time this repair has not been verified on GitHub Pages.
The previous lunapark CI run `35605413843` failed its Ferris jump observation;
that independent fixture issue must also pass before this combined release.
The complete hosted gate, including the 900,000 ms mobile soak, remains
mandatory. After deploy: compare all published release bytes including this
module/JSON, rerun the live entrance and ride cases, check the current backend
read-only, and exercise real multi-browser chat/movement/same-ID reconnect.
Only then is a new versioned game link a verified release.
