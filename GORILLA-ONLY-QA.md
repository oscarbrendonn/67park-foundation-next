# Gorilla-only playable selection — 23 September 2026

User scope: remove Friends characters from the playable selection, retain their
clothes for Gorilla. This does not install the separate cat prototype.

- The park collection exposes only Gorilla 67. Set-base and random-base choices
  are restricted to Gorilla. Original donor catalogues, equipment iteration,
  fitted accessories and all original GLBs remain unchanged; nothing is deleted.
- `app/playable-character.js` migrates validated saved Friends equipment to
  Gorilla, retaining body/outfit, footwear, headwear, back, held, effect and glow.
  A donor character face is cleared; the fitted glasses remain supported.
  Existing Gorilla equipment is unchanged.
- The prior validated outfit is backed up once under
  `67park-feel-lab.character.before-gorilla-only.v1`. Current equipment and an
  existing matching returning-player marker migrate; no new marker is invented.
  Storage denial cannot prevent the in-memory Gorilla selection.
- The current park and current mini-game equipment initializers share this
  policy, including direct game entry before visiting the park. No camera,
  movement, animation, server/network, chat or setting algorithms change.
- `qa/sync-gorilla-only.mjs` uses unique exact anchors in shipped bundles; entry
  cache keys and existing import-map aliases point to `gorilla-only-1`. No
  rebuild from older source, no new model download and no per-frame work.

## Focused evidence

- `gorilla-only-focused-verified.log`: 26 tests passed, zero failures: migration,
  backup, storage failure, clothes catalogues, initializer hooks and previous
  camera/punch/release-profile contracts.
- `gorilla-only-existing-units.log`: water 5 passed; existing main suite 265
  total, 263 passed, 2 existing optional-fixture skips, zero failures.
- `gorilla-only-browser.log` and `gorilla-only-browser/report.json`: own isolated
  Chrome, desktop 1280x900 fresh visitor plus touch 390x844 DPR3 with saved Friends
  selection. Both passed: sole Gorilla card, real clothing controls, ready 3D
  preview, actual entered avatar equipment, park entry and preserved outfit after
  reload. Migration preserves the selected Friends clothes. Muted, no page errors.
- Desktop collection and mobile clothes screenshots visually inspected. The
  collection screenshot was taken during initial loading; later ready-preview,
  successful entry and reload assertions provide completion evidence.
- No long browser suite, soak, 100-home tour or multiplayer chat spam was run.
  This is not physical iPhone/Safari or every clothing combination certification.

## Preserved test-development findings

- `gorilla-only-unit.log`: first static assertion expected a literal
  `friendsie_2:2` in the legacy chunk, which constructs item IDs instead. Corrected
  to verify the retained donor family/iteration; donor files were not changed.
- `gorilla-only-focused-final.log`: previous camera test asserted byte-identical
  HTML to HEAD. The requested roster update necessarily changed character cache
  aliases. Comparison now normalizes only that character-loader import mapping
  and the authorized three entry revision values; camera/input and remaining HTML
  still compare unchanged. No behavioral acceptance threshold was loosened.

Publication SHA/run and live asset equality are recorded separately in
`.qa-results/gorilla-only-publication-status.md` after deployment.
