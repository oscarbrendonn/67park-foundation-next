# Vehicle wheels, horn and sound audit

## Product changes

- Compact-car wheels already had distance/radius rotation, but the rotationally
  symmetric hubcaps made that motion visually ambiguous. Three small radial hub
  details now share each wheel's rolling transform and existing tyre draw batch.
  All four wheels roll by signed distance, only the front pair steers, and wheels
  stop with the car. No extra render loop, texture download or draw call.
- Geometry revision 6 adds 384 triangles per car (13,496 exterior triangles).
  Factory seats, physics, controller, wheel radius, materials and car silhouette
  remain unchanged. The integrated bundle is patched narrowly, not rebuilt from
  older runtime sources.
- The driver gets a Horn button and H shortcut. It plays a finite 220ms two-tone
  effect through the existing master mute/SFX/visibility/24-voice budget. It is
  edge-triggered, limited to one press per 800ms, ignores text input and disappears
  on exit/disconnect/modal opening. No continuous held horn, camera shake or idle
  decoration; wheel motion is essential speed feedback even with reduced motion.
- Horn playback is local to the driver in this frontend-only release. Network
  horn replication is NOT claimed: the authoritative server deliberately ignores
  mounted position/emote packets. No chat workaround, backend restart, new tunnel
  or transport/protocol change was made.
- Module/cache revision: `vehicle-feedback-1`; the combined entry/runtime keeps
  the new, not-yet-published `park-entry-finish-1` key. Movement and camera singleton
  cache identities remain untouched.

## Audio inventory (not a claim of sound for every animation)

The party graph has action hooks for walking steps, walking jump/double-jump/land,
skateboard ollie/kickflip/landing, punch swing/hit, grab/throw, launch pads, musical
keys, bell, UI click and stars. Skateboard mode emits accepted trick events to
the graph; walking animation hooks alone would not cover it. These existing
skateboard tests are now in the mandatory unit command.

There is no new engine loop or blanket sound mapping for every emote, outfit,
cat or ride animation in this change. Do not tell the user every animation has
sound simply because the known action recipes pass.

## Checks

- `qa/vehicle-wheel-feedback.test.mjs`: real native 3D factory + body; signed
  distance/radius math, rest, steering, finite long-running angle, shared geometry,
  unchanged seats/spec and no extra wheel meshes.
- `qa/vehicle-horn.test.mjs`: eligibility, keyboard/descendant text inputs,
  modifier/repeat/cooldown, touch plus click, pointercancel/accessibility, disposal.
- `qa/skate-audio.test.mjs`: actual accepted trick event pipeline, rejection/spam,
  mute/SFX/visibility, bounded nodes, horn recipe and release cache integration.
- Full unit command: 240 tests, 238 pass, two pre-existing optional-fixture skips,
  zero failures (`.qa-results/park-entry-vehicle-unit.log`).
- `qa/vehicle-feedback.run.cjs` and the existing car curb scenario exercise actual
  keyboard/mobile touch driving, four-wheel motion, front steering, rest, local
  horn input, 1,000 rejected rapid presses, layout overlap and disappearance on
  exit. The scenario is included in both full foundation browser profiles.
- The real WebAudio horn graph is rendered into an OfflineAudioContext buffer,
  not a speaker. Peak 0.09275 / RMS 0.00997; both sources finish and disconnect.
  Game mute remains 1 and the game's live AudioContext stays unallocated.

Final combined hosted regression, 15-minute mobile soak, Pages byte comparison,
live contact/vehicle checks and actual multi-browser chat/movement/reconnect
remain release requirements. Browser mobile emulation is not physical iPhone QA.
