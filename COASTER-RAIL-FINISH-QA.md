# Rounded red coaster rail ends

The September 21 entrance photo shows open cut ends on both red rails. The
earlier skatepark finish did not apply to this separate amusement-track asset.

## Bounded geometry change

- `app/coaster-rail-finish.js` closes both ends of both existing twelve-sided
  `soft_skating_edge` tubes before material batching and contact indexing.
- Four rounded hemisphere caps; 528 added triangles in total. No additional
  draw calls, meshes, materials, textures or per-frame code.
- Every original position, normal, UV and triangle is preserved. No deck,
  column, route width, material or under-track passage change.
- Both rails are validated before either is changed; the operation is
  idempotent. The source loader and shipped bundle use the same repair.
- Main/runtime/explore entry cache key: `coaster-rail-finish-1`.

## Local evidence

- Five unit checks: correct asset selection; all original geometry preserved;
  closed manifold after welding coincident UV seams; outward finite faces and
  bounded extension; source/bundle/cache wiring.
- `node qa/coaster-rail-finish.run.cjs`: desktop and 390x844 mobile viewport
  passed on Apple M4 Chrome. Renderer dataset: version1, rails2, caps4,
  addedTriangles528, addedDraws0, deckChanged:false. No JavaScript errors.
- Eight entry/exit, left/right close captures are under
  `.qa-results/coaster-rail-finish/`. All were visually inspected, including
  closer mobile entry frames. Detached geometry cameras are not a claim that
  an invisible avatar was playing.
- The same cap contract is mandatory inside BOTH full foundation profiles.
  Existing open-bay and solid-column player routes remain unchanged.
- Combined local unit run: 246 total, 244 pass, two existing optional fixture
  skips, zero failures (`.qa-results/coaster-jump-unit.log`).

Game audio stayed muted. These are browser viewport tests, not physical
iPhone/Android verification or a guarantee covering every island corner.

## Release separation

The lightweight boat prototype is a separate local-only change; it is not
part of this production geometry fix. A new hosted full regression, including
the 900000 ms mobile soak, and post-deploy asset/browser checks remain required.
Do not report these caps as live from a local test alone.
