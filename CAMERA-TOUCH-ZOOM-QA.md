# Umbrella camera, mobile zoom and closest first-person view

Publication follow-up: the user explicitly authorized the existing full
release route on 23 September ("Başlat o zaman ve günceli at"). The earlier
local-only status below records pre-publication evidence, not a prohibition
on this authorized release. No workflow, timing threshold or browser gate
was weakened. Five older cache-address assertions now require the actual
new entry/runtime addresses while retaining their semantic checks.

Pre-publication full units: water 5/5; main 263 total, 261 pass, two existing
optional-fixture skips. Camera/surface focused units 13/13. The first full
unit run recorded the five old-address failures and an unchanged camera
prewarm chunk of 76.395 ms (limit 50 ms); its log is retained. The final run,
after updating only cache assertions and without concurrent local test jobs,
passed that unchanged timing assertion too. A later pass is not evidence
that the first timing overrun did not occur. Hosted CI remains required.

23 September 2026. Local changes only; no commit, push, workflow dispatch,
deploy, broad regression, server/tunnel restart or physical iPhone test.

## Reproduction and cause

The active orbit camera shared a reset with the walking controller. Skating
hands movement to the skate controller every frame, so that reset also erased
the camera boom's release hold and vertical smoothing every frame. An umbrella
hit pulled the camera into the avatar; a disappearing hit snapped it back out.

Real Chrome (Apple M4), actual Space jump, existing preview server:

| Case | Before: largest outward step | After: largest outward step |
| --- | ---: | ---: |
| Desktop promenade umbrella | 6.72 | 0.869 |
| Touch/DPR3 promenade umbrella | 7.693 | 0.914 |
| Desktop south-beach umbrella | 4.566 | 0.657 |
| Touch/DPR3 south-beach umbrella | 5.531 | 0.755 |

The camera now retains its state while it owns the orbit, even when the
walking controller yields to skating. Full mode/body/map resets still reset
it. Hard collisions still retract immediately: this is not a promise of no
camera movement around obstacles. The existing exact mesh casts, mast
collisions, umbrella geometry and jump physics were not loosened or removed.
When obstruction brings the camera inside the avatar, the local visual is
hidden with hysteresis and restored on exit, preventing sliced head polygons.

## Mobile zoom and closest view

- Previously a mouse wheel handler existed but no two-touch zoom handler.
  The baseline's real two-touch gestures changed neither skating nor walking
  camera distance. Mouse wheel already worked.
- Opt-in two-touch canvas gestures now zoom the park orbit. They do not rotate
  yaw/pitch. UI buttons, text entry and the reserved left movement region do
  not acquire a second camera touch; minigame aim remains single-pointer.
- Closest zoom places the camera at eye height, looking in the same yaw/pitch
  direction. Only the local avatar visual is hidden. Other players, model
  assets, physics and outgoing network state are not modified. Local visual
  visibility and the camera's original near plane are restored when zooming
  back out or leaving that camera mode.
- All ten game entry import maps unify old/current camera-runtime aliases,
  including the party module's dynamic import. Main entry cache key is
  `camera-touch-1`; unrelated settings/network/model aliases remain intact.

## Evidence

- `.qa-results/umbrella-camera-before/report.json`: original runtime negative
  control; four real umbrella jumps and mobile no-op zoom preserved.
- `.qa-results/umbrella-camera-after/`: initial boom/pinch correction, before
  the user's subsequent first-person request.
- `.qa-results/umbrella-camera-firstperson/report.json`: desktop and
  390x844 touch/DPR3; four jumps land; all close-camera frames hide the local
  visual and restore it afterwards; zoom both directions in walk/skate;
  first-person eye position, original yaw/pitch, viewport scale 1, avatar
  hide/restore and near-plane restore all asserted. Page errors zero.
- Per-frame traces and actual rendered PNGs are beside the reports. Reviewed
  touch first-person/third-person and close-camera promenade PNGs: world is
  visible without sliced head geometry; avatar returns in third person.
- Focused units: `node --import ./qa/register-three.mjs --test
  qa/camera-touch-zoom.test.mjs qa/feel-camera.test.mjs
  qa/feel-camera-meshes.test.mjs`.
- The first mesh-unit invocation omitted the required Three.js loader and
  failed module resolution. The configured run passed; no test was weakened.

## Delivery boundary

### Follow-up: settings and mobile pinch, 23 September

The user confirmed that the reported live loading screen eventually opened.
No entry/loading production code was changed for that report. The public
water URL still does not include the local camera changes.

- Added Camera distance (0.5–12 m), First person and Reset camera under
  Settings > Camera & controls. Range targets are at least 44 CSS pixels high;
  native touch/keyboard input responds continuously and exposes a readable
  distance or First person value. Help also explains the two-finger gesture.
- Settings and pinch/wheel share one browser-local cameraDistance preference.
  Gesture changes apply immediately; storage is batched after the gesture,
  with a page-hide/dispose flush. Default stays 6.8 and reset preserves other
  character/account data. Map/controller re-entry no longer erases the choice.
- All ten entry import maps route old/current player-settings aliases to
  camera-settings-1 and camera-runtime aliases to camera-touch-2. The existing
  party settings import resolves to the new panel without a second singleton.
- Focused units: 25/25 passed (camera, mesh casts, settings persistence and
  cache aliases). No broad regression or publication started.
- `node qa/camera-settings.browser.cjs`: PASS. Fresh mobile Chrome/M4 profile,
  390x844 touch DPR3, only mute pre-set. Actual Choose & dress up and Enter the
  park taps reached playable stage 15 in 11,854 ms. This is not an iPhone time.
- Actual touch range drag set 9.65 m and the camera followed. First person
  hid the local avatar; reset returned it. Two-touch walk 6.8 → 3.886 → 12;
  skate 12 → 6.857 → 12. Yaw/pitch unchanged, browser scale 1. Settings reflect
  the gesture, and 12 m persisted through a normal reload. Page errors zero,
  mute retained. `.qa-results/camera-settings-mobile/report.json` and reviewed
  mobile Settings/first-person PNGs contain evidence.
- Apple Design guidance informed continuous native slider feedback, clear
  touch targets and shared gesture/settings state. No new animation library
  or render loop was added. Physical iPhone/Safari remains untested.

Preview: `http://127.0.0.1:8496/67park-foundation-next/?v=camera-touch-1`.
This is a Mac-local link, not a phone/public release. The user previously
forbade the long publication route until the final stage. A choice between
local preview and explicit permission to publish this version was requested;
do not push merely to produce a link without resolving that choice.

Prior local surface repairs and the separate cat-character preview are
preserved. The cat prototype has not been installed into the game roster.
