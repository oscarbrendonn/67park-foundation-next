# Close-angle curb and input follow-up — 2026-09-21

Status: local candidate after published `2a4711c`; not a new verified live release.
The original `67park-feel-lab` repository and site are unchanged.

## Bounded production changes

- The NW inner city curb contained two backtracking vertices, 7.14 cm apart.
  Only those two vertices are removed. The changed footprint is 0.013822205 m²
  inside X -98.07…-97.77, Z 26.57…27.24. The other city curb profiles remain.
- The small coastal fillet's lowered bevel met a full-height stub abruptly.
  Its height now blends over 16 cm into that stub while retaining the lower
  profile at the opposite, original-curb join. Cap and side walls use the same
  sampled boundary. No floating patch, decal or new material is added.
- Neither change adds a mesh, draw call, collision rule or per-frame callback.
  Buildings, models, inventory, controls and other ground outlines are unchanged.
- `curb-touch-finish-1` refreshes only the geometry JSON and its runtime/entry
  ancestors. The shared camera/audio/wardrobe/recovery module versions are kept.

## Direct evidence

- A first smoothed-normal bevel attempt showed stripes in the close screenshot;
  a flat-cap attempt showed a new height step. Both were rejected locally, not
  committed or published. Final front/reverse and city-corner close views are
  retained in `.qa-results/curb-touch-final/`.
- The actual source fixture passes all 10 geometry tests, including new checks
  for the removed backtracking pair and a continuous stub-to-bevel height line.
- `npm test`: 179 total, 177 pass, 2 existing optional fixture skips, 0 fail.
  Log: `.qa-results/curb-touch-unit.log`. The separately supplied real fixture
  above is not skipped.
- `qa/skate-touch-stress.cjs` uses a high-DPR 390×844 Chromium viewport at the
  default Automatic quality, gorilla, and muted audio. After one setup teleport,
  it sends trusted touch input for four jump/flip/camera/joystick cycles; it does
  not write camera, velocity or animation state. Each cycle drew 149–150 frames,
  moved 7.54–7.57 m and turned 1.02 radians; maximum frame interval was 16.8 ms.
  The renderer actually used DPR 2 (780×1688), shadows on. All 40 touches were
  trusted, controls released to zero, both connections remained up, no JS error
  or WebGL loss. `.qa-results/skate-touch-final.json` and `.png`.
- Real visible Chrome screenshots contain the gorilla on its skateboard and
  in Style Studio: `.qa-results/native-character-board-current.png` and
  `.qa-results/native-studio-current.png`. Geometry survey shots deliberately
  detach the camera from the player; they are not evidence of avatar visibility.
  The survey now labels that difference visibly in its own screenshots.
- Current settings acceptance is documented in `SETTINGS-1-QA.md` and exercised
  by `qa/settings-acceptance.cjs`. No production settings change was justified.
- The full hardware desktop foundation run passed: asset retry, wardrobe
  interruption/resume/retry, quality changes, walk/skate/car curbs, carousels,
  geometry, roof/plaza movement, chat spam, identity recovery, 100 home
  transitions, 20 outfit changes and optional-feature isolation. Zero page
  errors; the peer stayed connected. `.qa-results/curb-touch-foundation.log`.

## Remaining release boundary

The full hosted regression, 15-minute mobile-viewport soak and Pages gate are
unchanged and still required for this new candidate. Push or unit success alone
is not a live release. The desktop run above is not the mobile soak or a phone
performance result.

The previously published free backend/tunnel is no longer available: a read-only
check initially returned Cloudflare 1033, a later check failed DNS resolution,
and no public backend was listening on port 8498. Restart/new-tunnel authority
was requested; no public restart, new tunnel or paid server has been performed.
Port 8496 is a separate temporary, nonpersistent local QA service, not the public
game service. A working online link requires restored service plus live browser
interaction verification.

These observations are from the Mac's browsers, including WebKit, not a physical
iPhone. The connected Android remained locked. They do not guarantee universal
performance, hardware haptics, 100 rendered avatars or absence of all defects.
