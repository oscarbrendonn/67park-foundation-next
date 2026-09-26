# Pet commands and play — local implementation, 2026-09-25

Base checkout: `4e5feeb3c11d9f3f1f99f51ad86a8b41d70f26fd`.
No commit, push, deployment, workflow change, or backend restart was performed.
Existing isolated QA server: `http://127.0.0.1:8496/67park-foundation-next/`.

## Delivered locally

- Come, Stay, Sit, Lie down, Give paw, Follow me, petting and treats.
- Dog ball/frisbee flight, chase, pickup, return and visible drop; happy tail.
- Cat ball/feather stalking and paw play; head/body rubbing and synthesized purr feedback.
- Owner lean and right-arm contact use the existing skeleton without scaling limbs.
- Feather wand and treats use the actual animated hand position.
- Existing beside/behind breadcrumb following remains. Standing idle leads to sitting, then lying; owner rest requests lying sooner. Pets add no player-blocking physics body.
- Native touch-friendly menu, Bag → Commands & play, nearby Interact, and direct tap on the pet.
- New commands interrupt old actions. Movement away, map changes, pet switches and teleports clear care/toys. Throw corridors stop before invalid ground, water or obstacles. Blocked approach times out to following.
- Existing mute, sound-volume, visibility and reduced-motion preferences remain in use. No extra animation loop or audio file; one local toy kit is created lazily and reused.

## Checks

Focused code command:

```sh
node --import ./qa/register-three.mjs --test qa/pet-commands.test.mjs qa/pets.test.mjs qa/party-audio-muted.test.mjs qa/player-basics.test.mjs qa/housing-poses.test.mjs qa/skate-audio.test.mjs
```

Final result: **36 passed, 0 failed**. This includes float32 animation-key non-accumulation, release of owner poses, existing costume-bone handling, pet cleanup, sound mute, and unchanged model-resource budgets. `npm run test:pets` is a shorter optional focused command. The broad release suite was not enabled or run.

Browser command: `node qa/pet-commands.browser.cjs`.

- `.qa-results/pet-play-2026-09-25T16-53-31.995Z/report.json`: **14 flows passed, zero page errors**. Desktop dog commands/fetch/care; touch-emulated cat games/care; direct tapping of the actual rendered cat; no horizontal overflow. Care-hand distance to the animated head/muzzle is asserted. Muted audio context remained unallocated.
- The subsequent owner-pose/wand/play-space polish was checked separately, not by claiming another full browser run: `.qa-results/pet-contact-2026-09-25T17-00-13.859Z/report.json`, **pass**. Actual cat feather play, both side views, bounded spine lean through completion, hand endpoint and ordinary-pose release. Maximum measured single-spine lean: 0.2131 rad; hand-target gap approximately 0.000000108 world units in the captured frame. The 20-test optional `test:pets` subset passed again after that last positioning change.
- Dog head-contact side views: `.qa-results/pet-contact-2026-09-25T16-51-42.094Z/0.png` and `1.png`.
- Mobile menu: `.qa-results/pet-play-2026-09-25T16-53-31.995Z/commands-mobile.png`.
- Final feather side view: `.qa-results/pet-contact-2026-09-25T17-00-13.859Z/1.png`.

Failures and superseded visual evidence are retained:

- First browser run `.qa-results/pet-play-2026-09-25T16-38-25.361Z/`: stale species controls before opening the dialog. Fixed by refreshing its contents before `showModal`, not by retrying the same code or relaxing a timeout.
- Earlier images revealed an unanchored wand and an unreachable across-body hand target. Corrected to the actual right-hand side and animated head-space contact point.
- The 16:53 feather image revealed excessive accumulated lean despite passing command-state assertions. Authored non-unit float32 quaternions made an angle comparison unreliable. Component comparison plus normalized overlay rotations and a dedicated regression test corrected it. That older feather image is **not** final visual approval.

## Size and boundaries

- Existing sculpt geometry remains 10,900 triangles (cat) / 11,900 (dog), shared materials and two existing draws including blob shadow. No replacement GLB or downloaded texture/audio asset.
- Runtime source delta excluding index/QA/docs: **29,048 bytes**, estimated **10,504 bytes** when each changed/new module is gzip-compressed and compared with the base. This is a local compression estimate, not a measured public CDN transfer size or runtime-memory result.
- New command/play animations and toys are **local-only**. Existing remote pet selection/following is unchanged; special commands are not replicated to other players. No new server messages were introduced.
- Mobile testing was Chromium touch emulation, **not a physical iPhone**. Actual device performance and audible speaker quality were not claimed. Audio stayed muted during browser work.
- Existing navigation is bounded breadcrumb/direct-target movement, not global navmesh pathfinding. An obstructed command safely returns to following instead of crossing the obstacle.
- No universal visual, device, multiplayer or all-map zero-error guarantee. Unrelated character/body prototypes and diagnostic files were left in place.
