# Island-wide swimming immersion — 23 September 2026

## Scope

The approved park pond already lowered the local swimming visual by 0.47 m
without moving the controller's capsule. Its guard only sampled `world.pond`,
so the coast and elevated northern pool retained the above-water visual.
`immerseSwimmingVisual` now uses the existing `world.water` classification and
`world.sea` resolver (pool, pond, ocean). The same pose, near-player, flotation,
and idempotence guards remain; dry land, airborne characters, homes, and other
visual roots are excluded. The regular pose rebuild restores dry height.

The ocean receives the same three ripple-normal/light/sheen coefficient
changes already approved on the pond. The pond appearance is unchanged.
The pool retains its translucent turquoise material; its visual immersion now
uses its own elevated waterline. Geometry, land mask, swimming boundaries,
water height, capsule/physics, speeds, camera, networking, and audio are not
changed. The ocean material, uniforms, update closure, clock, wake radius and
distance fade are retained. Ocean displacement remains 0.012; pond 0.025.
No extra mesh, draw, animation loop, texture, or sound was added.

Entry notices request `water-5-all-swim`, which imports
`park-water-5-all-swim`. Main, play, explore and four minigame entry notices
are covered. Shared runtime and singleton import-map aliases are unchanged.

## Local evidence

- `.qa-results/water-before/` and `water-after/`: six-location observation of
  the actual rendered visual. Before: coastal visual origin 0.45–0.52 m above
  water, pool 0.443 m above water. After: coastal origin within 0.05 m and pool
  within 0.03 m of the local surface; capsule remains surface + 0.58 m.
  Before/after east and pool images were visually inspected, as were mobile
  Buddy screenshots: lower body is now occluded/tinted by the actual water.
- `qa/water-immersion.test.mjs`: five tests cover per-water heights,
  dry/air/home/foreign-root exclusions, per-frame/idempotent adjustment,
  material/geometry/mask/clock/disposal invariants, and entry cache keys.
  `npm test` runs these via `pretest`; standalone `npm run test:water` runs
  the desktop + touch browser matrix.
- First browser matrix `.qa-results/water-immersion-local.log`: PASS for
  eight sites in each of cold Low, High, Medium, Low, on desktop 1280x900
  Gorilla and touch 390x844 deviceScaleFactor 3 Buddy #1. All 64 location /
  profile cases pass. Mobile renderer DPR: Low 0.8, Medium 1.25, High 2.
  Each uses actual keyboard / CDP touch movement and rendered-pose samples;
  waterline, unchanged flotation, per-frame 0.47 m immersion, active wake,
  dry-pose restoration, mute and no JS/console errors are asserted.
- `.qa-results/water-immersion-unit-final.log` retains an initial unrelated
  camera-prewarm timing failure (62.494 ms against its unchanged 50 ms limit).
  `.qa-results/water-immersion-unit-isolated.log`: full existing suite after
  browser work ended, 263 total / 261 pass / 2 existing optional skips / 0 fail.
  No camera code or timing limit was changed. This does not prove deterministic
  machine performance or reconstruct the exact scheduling of the first run.

## Shoreline harness correction

The first added touch shore test timed out. The original 8-site matrix passed,
but the new shore test had a reversed touch-Y mapping and required x > 237,
past the actual shore transition. The corrected-direction trace reached
x=234.755, z=150: wet=true, swim rotation=1.18, visual at waterline, then input
became zero. The existing held touch is released on entry; a further offshore
target was not a valid immersion assertion. No game controller change was made.

The final check observes a real dry-to-wet and wet-to-dry crossing, >0.5 m
controller travel, settled swim/upright poses, waterline/dry visual heights,
and the intended actual joystick axis values. Only initial fixture placement
uses teleport; entry and exit use real input. The bounded 30-second deadline
was not increased. Sampling now keeps a fresh latest pose after its retained
240-frame evidence buffer fills. Earlier failures remain in
`water-immersion-final.log`, `water-shore-measurement-failure.json`,
 `water-shore-wrong-input-trace.json`, and `water-shore-corrected.log`.

Final full matrix: `.qa-results/water-immersion-verified.log` ends with
`WATER_IMMERSION_BROWSER_PASS`, exit 0. All 64 location/profile cases pass
again, plus real keyboard desktop and real touch mobile shore entry/exit.
Maximum absolute settled visual-origin offset from water is < 0.05 m in
every profile. Images and per-frame/shore JSON are in
`.qa-results/water-immersion-verified/`. Five final unit tests pass in
`.qa-results/water-immersion-five-unit.log`.

## Release and limits

Local M4 Chrome is not a physical iPhone/Safari test. Eight representative
regions cover the pond, elevated pool, and six directions/outer-edge ocean
positions; this is not an assertion about every possible map coordinate or
every avatar. The fix uses the common resolver for all classified swimmable
island water. Decorative/non-swimmable caps are not converted into pools.

The full hosted regression (including the unchanged 900000 ms mobile soak)
and Pages deployment must pass for the new commit before calling it live.
`qa/foundation-browser.cjs` now includes the eight-region and real-input shore
gate in both hosted profiles. After deploy, run the versioned Pages URL through
`PARK_WATER_URL=<url> PARK_WATER_EVIDENCE=<dir> node qa/water-immersion.run.cjs`
and verify changed HTML plus both notice/water modules against committed bytes.
Retain the previous graphics/ride/entry/rail/English/online release gates.

Previous vehicle endpoint-test failure and subsequent time-series evidence
remain in `.qa-results/graphics-sync-publication-status.md`; this work does not
rewrite that historical failure. Small reported corner notches remain open.
The boat remains a separate local prototype. User iPhone testing is pending.
