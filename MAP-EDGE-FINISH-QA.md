# Map edge finish — 2026-09-21

Scope: the five reported visual seams, plus a map-wide terrain survey. Work is
confined to `67park-foundation-next`; the original feel-lab checkout and public
backend are unchanged. This is a geometry repair, not a new collision policy.

## Repairs

- Closed 21 genuinely missing support regions under the main grass and legacy
  grass filler (795.904 square metres). The intentionally graded park, pond and
  bowl are excluded; the palette and all source grass vertex positions remain.
- Reduced the one 59 cm parcel-divider extrusion to the same 44.9 mm thickness
  as its nine siblings. Exactly 1,242 vertices change height; XZ positions,
  divider lengths and the previously shortened southeast tip are preserved.
- Rebuilt the four central grey paving slabs from one mirrored outline. Small
  teeth at the fountain tangencies are rounded; exposed road under the new
  corners is filled with the existing road material. The walking heights,
  fountain, planting, buildings and colour palette are preserved.
- Joined the reported coastal curb notch with a 0.294 square metre tangent
  fillet and a matching bevel. The adjacent stub remains unchanged. Tiny
  Boolean contour spikes are removed before caps and walls are generated;
  a 0.2 mm buried overlap prevents a quantized cut-boundary hairline.
- Refreshed the existing curb shadow-side helper to use the repaired geometry.
- Matched the legacy grass filler to the main grass's actual Physical material
  and removed the old shader's painted 3% white divider halo. No new material
  or map recolouring is involved.
- Rebuilt the two 0.502-metre-deep entrance curb strips at their existing
  9.38008564 height. Their old tapered triangles are clipped and the cap is
  rebuilt immediately, with closed bases below both grass lips. An intermediate
  cut-only attempt exposed holes and was rejected by close-angle inspection.
- Filled the two 9.7 cm grass-front recesses to the adjacent straight line
  (Z=128.58658, 1.025 square metres total), with matching closed support below.
- Replaced two tiny internal grass seams beside the shortened southeast
  divider (0.231 square metres), blending back to the original top at each
  bounded cut. All original grass positions and every uncut source triangle
  remain; the shortened divider itself is unchanged.

Eight existing ground meshes plus one divider are changed. No added materials,
draw calls, frame callbacks, invisible barriers or `Path blocked` behaviour.
The baked patch is applied once, after prior terrain repairs and before final
ground sampling. Both runtime entry paths use the same repair. Source vertex
and index CRCs are checked and all replacements are prepared before committing;
a stale or malformed patch fails atomically through the existing retry path.

## Evidence and reproduction

The baseline scene export is `.qa-results/map-edge-before/geometry.json`.
`qa/map-edge-survey.py` inspects actual world-space ground footprints rather
than inferring missing support from one screenshot. The local export is not
committed (110 MB); runtime CRC guards and browser checks run without it.

```sh
python3 qa/map-edge-survey.py .qa-results/map-edge-before/geometry.json .qa-results/map-edge-all
OPENBLAS_NUM_THREADS=1 python3 qa/bake-map-edge-finish.py .qa-results/map-edge-before/geometry.json .qa-results/map-edge-all/footprints.json repairs/map-edge-finish-1.json
node qa/refresh-map-edge-release.mjs --write
MAP_EDGE_FIXTURE=.qa-results/map-edge-before/geometry.json node qa/map-edge-finish.test.mjs
npm test
```

The offline baker uses NumPy and Shapely 2 with constrained triangulation.
It is a development tool, not a production dependency. The refresh script is
asserted and idempotent; it does not rebuild from an older game source.

Visual evidence: `.qa-results/map-edge-close-release/` contains 56 unmodified
near/oblique browser captures, including both sides of all ten dividers and
regional terrain joins. The stadium pair was repositioned after its first
camera positions were obscured by a wall. The final straight-front changes
are separately captured from both sides in `.qa-results/map-edge-straight-front/`.
The main agent reviewed the reported defects, corrected entrance fronts,
southeast seams, coastal join and unobscured stadium pair; a QA agent reviewed
the other regional close views. Earlier aerial coverage was used for survey
planning, not as a substitute for near-angle checks. Rejected intermediate
captures remain separate. These are visual evidence, not input tests.

`qa/map-edge-finish.test.mjs` adds mandatory tests for atomic rollback, corrupt
source CRCs, malformed clipping, attribute/material preservation, idempotence
and mirrored slab outlines. Its opt-in source-fixture check additionally checks
every appended triangle from the exterior, source-index complements, exact
Float32 transformation and all ten divider components. It also checks the
bounded grass-seam index removals, original grass vertex preservation,
continuous entry curb caps and both straight grass fronts.

`qa/map-edge-finish.live.cjs` is included in both mandatory foundation-browser
runs. It checks the actual loaded patch, ground coverage, front-facing side
surfaces, divider height, 70 downward entry-cap samples and both straight
grass fronts. A rejected horizontal probe began inside raised pavement and
could see buried internal faces; it was replaced with surface-height checks.
Existing curb walking/skating/driving,
carousel carry, rooftop routes, chat spam, reconnect, 100 home transitions,
asset retry and the 900,000 ms hosted mobile soak remain mandatory.

The earlier local desktop foundation run passed with zero JS errors and its
peer still connected. It preceded the final near-angle fixes. Final local and
hosted gate results are recorded below only after completion; the hosted full
gate, including the 15-minute mobile soak, must pass before Pages can deploy.

Final local unit gate: 160 tests, 158 passed, two optional fixture skips, zero
failures (`.qa-results/map-edge-unit-release.log`). The actual map source
fixture was then run explicitly and passed all seven checks
(`.qa-results/map-edge-fixture-release.log`). The new browser audit initially
blocked the UI thread for 4.45 seconds; its triangle/ray work now yields in
bounded batches without dropping samples or relaxing the 2.5-second hardware
limit. A helper-only hardware run recorded a 166.8 ms maximum frame gap.

Final desktop foundation gate PASS (`.qa-results/map-edge-foundation-release-2.log`):
zero JS errors, peer still connected, 200 ms maximum frame gap during the new
map audit. Existing real-input walking/skating/vehicle curb checks, carousel
carry (including delayed frames), roof/plaza routes, chat spam, reconnect,
100 home transitions, repeated actions, outfits and feature isolation passed.
This desktop run has no soak; the unchanged hosted mobile 900,000 ms soak is
still required for publication.

## Limits

Visual coverage and sampled geometry checks do not prove universal perfection.
The new map revision is not physically tested on an iPhone or Android here.
Browser mobile emulation and CPU-only hosted rendering are not physical-device
performance measurements. No player-capacity increase or backend availability
guarantee is implied. A successful local test or push is not a published build;
Pages and the live version must be checked separately after the full gate.
