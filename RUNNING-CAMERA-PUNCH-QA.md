# Running cameras and punch feedback — local only

## Scope

- Lane Rush / Color Rush and Skybound Sprint only: shared saved camera distance,
  two-finger canvas pinch, mouse wheel, sensitivity, Settings / First person /
  Reset camera. Closest view uses the existing park eye position and hides only
  the local visual; backing out restores its prior visibility and camera near
  plane. The Skybound course collision resolver remains active in third person.
- Native modal settings isolate keys from gameplay and release held controls.
  Mobile Settings is below the information row, not over it.
- Race/car, Balloon Battle, Rockets and Sports input/camera routes unchanged.
- Park/explore existing punch impact frame: original 24-triangle star and tapered
  lines, one pooled mesh, 190 ms lifetime, no image/model request, idle invisible.
  Reduced-motion uses fixed scale plus fade. Existing `juice=false` suppresses it.
  No new damage, remote-player authority, camera shake, sound or network messages.
- Existing four-animal layout/colliders retained. No commit, push, CI/workflow,
  tunnel/backend changes, broad regression or soak started for this work.

## Focused checks

Existing preview: `http://127.0.0.1:8496/67park-foundation-next/`.
Own isolated Chrome / Apple M4 renderer, not Kimi, not a physical iPhone.

- `node --loader ./qa/three-loader.mjs --test qa/running-camera-punch.test.mjs`
  checks eye position, local-only hide/restore, clipping, resolver boundary,
  24-triangle geometry, bounded pooling/lifetime/disposal, reduced motion/disable,
  and untouched non-running entries.
- `RUNNING_CAMERA_EVIDENCE=.qa-results/running-camera-final node qa/running-camera.browser.cjs`
  passed both games in desktop 1280×900 and touch 390×844 DPR3: real slider input,
  first-person visual, reset, pinch/wheel both ways without yaw/pitch drift,
  joystick + jump isolation, modal Escape, and saved distance after reload.
  All four profiles have no page errors and preserve mute.
- `.qa-results/running-camera-final/report.json`, corresponding log and settings /
  first-person PNGs; mobile Settings and first-person images visually inspected.
- `node qa/punch-burst.browser.cjs`: desktop and touch PASS, real F / touch punch
  produced 5 / 7 witnessed draw callbacks in the first burst; reduced-motion fixed
  scale, disabled effect, one mesh, no page errors, mute preserved. Evidence:
  `.qa-results/punch-burst-1/report.json`, log and PNGs. Desktop burst PNG inspected.
- Existing Skybound static entry/respawn checks passed. Camera touch unit address
  expectations updated only for the two intentional punch-runtime entry aliases;
  behavior assertions remain unchanged.

## Preserved first-run findings

- `.qa-results/running-camera-1/report.json` and log retain the first Skybound
  touch assertion failure: diagnostic distance 9.714 was compared with a later
  12. Skybound snapshots are deliberately throttled to 10 Hz. A separate short
  trace read the authoritative shared value after each gesture and after joystick
  + jump: 3.885714 → 12 → 12. The test now waits for the snapshot to equal the
  authoritative final gesture value; it does not weaken the unchanged-distance
  assertion or modify gameplay to satisfy the test. Final evidence is separate.
- First camera-touch unit run failed the old literal `camera-touch-2` URL after
  the intentional park alias revision. Only exact per-entry expected revisions
  changed; sensitivity, pinch isolation and first-person assertions preserved.
- First ad-hoc Node mesh check omitted the repo Three loader (`ERR_MODULE_NOT_FOUND`);
  browser import maps and the focused unit command use the existing vendor Three.

## Limits

This is a local implementation, not a new public release. No physical iPhone /
Safari, multiplayer combat effect, whole-course completion or universal zero-error
claim. The procedural burst is authored here, not extracted from Eggy Party.
