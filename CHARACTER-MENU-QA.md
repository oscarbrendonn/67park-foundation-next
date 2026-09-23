# Character selection entry — 24 September 2026

Reported: character selection does not open.

The previous live release (5a4d266) was checked with a saved Gorilla profile in an isolated, muted touch Chromium context at 844×390 / DPR 3. The profile icon responded, but reopened the dress-up editor, not the character list. The list required another tap on `‹ Characters`. This reproduced the indirect route, not a universally unresponsive button. No claim is made to have reproduced the user's exact physical phone state.

## Change

- Manual profile opening now always resets to the Gorilla/Cat collection and clears stale entry/preview state.
- The pink control visibly says `Characters`, including portrait layouts which normally hide toolbar labels.
- Returning-player automatic park entry and saved equipment remain unchanged.
- Public HTML advances only the main-module cache address to `character-menu-1`.
- Existing editor checks explicitly continue with `Choose & dress up`; no assertions or timeouts were relaxed.
- Source comparison confirms only manual menu handling and its button changed in main.js. No map, model, camera, movement, backend or workflow changes.

## Focused evidence

- `.qa-results/character-open-before-2/report.json`: previous live route, Gorilla→Cat→reload→Gorilla, no page errors. Original first diagnostic failed because its predicate used an undeclared global; retained in `character-open-before/report.json`.
- `.qa-results/character-open-fixed-1/report.json`: direct menu, landscape touch, Cat entry/persistence and switching back, pass.
- `.qa-results/character-open-fixed-portrait-1/report.json`: same flow portrait, pass. Inspection found the new label hidden by existing portrait CSS; the follow-up explicitly keeps that label visible.
- `.qa-results/character-open-label-portrait-1/report.json`: visible label and direct selection in portrait, pass; actual hit target 100.47×44 CSS px. Screenshots visually inspected.
- Focused unit/address checks: 55 total, 54 pass, 1 existing optional fixture skip. New menu checks: 3/3 pass after correcting a new test to inspect the runtime URL in main.js, where it actually lives, rather than HTML.
- Full browser regression/soak not started. Publication still requires the exact new CI/deploy result and live menu check.
