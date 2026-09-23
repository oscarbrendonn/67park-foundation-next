# Cat 67 integration — 24 September 2026

## Scope

- Add the accepted grey cat prototype as the second original playable character; keep Gorilla.
- Preserve original cat geometry, atlas, material, body rig and animations: GLB 1,723,216 bytes, 20,912 triangles, 4 meshes, 2 materials, 20 bones, 7 original clips.
- Reuse existing native park/mini-game motion; add `cat67` to the native family and motion allowlist. No camera/input/physics algorithms, map geometry, backend or workflow edits.
- Preserve donor clothes; fit cat glasses to the actual eye line; exclude unavailable built-in Gorilla crown/flower from Cat options.
- Cache aliases point to `cat-character-1`; island runtime remains `north-housing-8`.

## Local evidence

- `.qa-results/cat-character-integration-3/report.json`: desktop 1280x900 and touch-emulated 390x844 DPR3, own isolated Chrome / Apple M4. Both passed original cat entry, real walk/run and jump/fall/land/idle, Gorilla-to-Cat card selection, five fitted pieces, preserved hands, low graphics visibility, and reload persistence; zero captured page errors. Park/front, wardrobe and low-graphics screenshots visually inspected. Front camera is a QA capture hook on the actual park scene, not a mockup or product camera change.
- `.qa-results/cat-minigames-1/report.json`: Color Rush and Skybound loaded Cat with five equipped pieces, and exercised a real keyboard moving jump. Both passed, zero page errors. No complete match/course/soak assertion.
- `.qa-results/cat-remote-3/report.json`: two isolated guests; the observer rendered the sender as Cat, with 20 bones and 4 model meshes, no Gorilla head and zero page errors. The first two test attempts had incomplete test readiness (world/model ready before physics body); they are retained as `cat-remote-1` / `cat-remote-2`. The final test explicitly waits for body and online identity, then walks away using real input. No server change was needed.
- `.qa-results/cat-character-release-unit-2.log`: 41/41 selected release/unit checks pass.
- First `npm test`: water 5/5; main 265 total, 262 pass, 2 pre-existing optional fixture skips, 1 failure from the old entry-cache assertion. That expectation was updated; its test passed in the 41-test result above. The failed log remains `.qa-results/cat-character-npm-test-1.log`.
- Initial integration captures revealed high glasses and a different connected guest obscuring the shared spawn. Glasses were lowered; later tests walk away before inspecting the real local Cat. No other guest/model was hidden or edited.
- `.qa-results/cat-character-integration-2/`: failure was the new test trying to click Cat without returning to the roster after choosing Gorilla (cards open the editor automatically). The test now follows the actual UI; the failed report/screenshots are retained. Initial exact bundle synchronization assertion failures occurred before writing any bundle and are retained separately.

## Limits / publication

No physical iPhone test, full browser regression, load/soak certification or all-outfit/all-game guarantee. Long hosted browser suite remains opt-in. Standalone `style-studio/studio.js` remains its existing Gorilla-only demonstration; the in-game Profile studio is the two-character implementation.

Publication is pending until the exact commit's short CI and Pages deploy succeed and live bytes/entry are checked. See `.qa-results/cat-publication-status.md` for the release result when available.
