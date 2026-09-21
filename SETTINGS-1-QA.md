# Browser settings — settings-1

Scope: Kimi Party desktop and companion mobile builds only. No map, avatar,
outfit, skeleton, vehicle physics, server, or original Codex repository changes.

## Implemented

- Separate mouse/touch free-look sensitivity: 25–200%; 100% retains existing
  rates. Shared cameraLookDelta consumers use the preference; aiming controls
  are unchanged. This is not a claim of identical Eggy Party camera tuning.
- Action-button size: 80–120%, stored separately for coarse/fine pointers.
- Party + legacy sound-effect volume and a separate park ambience/music bus.
  Original default levels retained. Existing speaker mute still controls both.
- Local chat-history/speech-bubble and overhead player-name visibility.
  Bot-label groups respect the preference at creation and when toggled.
- Keyboard/touch help, local text bug-report copy/download, confirmed reset.
  GitHub Issues is disabled in the repository; no fake submission endpoint.
- Validated browser-local persistence and migration from 67park-party.
- Focus containment, Escape/backdrop close, release of held controls, and
  gameplay input suppression while the dialog is open.
- Import-map aliases invalidate changed shared modules without loading duplicate
  React/audio/runtime copies. Main and party entry modules use settings-1.

No new graphics, screen-shake or speed-effect switches; no new rendering loop.
Existing party toggles remain available. No voice-chat setting without a service.

## Verification before release

Chrome desktop 1280x800 and mobile emulation 390x844, then 320x568 and 844x390:

- Entered the park through its normal entry button.
- Zero page errors; party runtime not disabled.
- Keyboard range input: 100% -> 105%.
- Mouse 200%: 100 px yields 1.04 rad yaw / .7 rad pitch.
- Touch 50% at 390 px: 100 px yields .537024 rad yaw / .24 rad pitch.
- Effects at 0% and ambience at 25%: independent gain buses settle near 0 and
  .2125, respectively; party jump sound does not allocate a muted voice.
- Settings survive reload; reset restores defaults and chat visibility.
- Escape closes settings; a subsequent movement key moves the actual player.
- Bug report downloads and includes the entered QA description.
- Dialog remains inside all tested viewport bounds and scrolls internally.
- Node assertions pass for invalid/array storage, nonfinite values, clamping,
  unknown keys, sensitivity and reset. Syntax and git diff checks pass.

## Current isolated acceptance — 2026-09-21

Against the root-owned local QA server at `http://127.0.0.1:8496/67park-foundation-next/`:

- `qa/settings-entry.cjs` passed desktop and 390×844 touch entry/studio
  transitions with no page errors. It now resolves Playwright from this
  workspace rather than a removed temporary path.
- `qa/settings-acceptance.cjs` passed its separate `panel` and `preserve`
  stages at desktop and 390×844 touch. In a disposable, master-muted profile,
  it verified independent mouse/touch values, the pointer-appropriate button
  size, effects and ambience stored independently, chat/name/party toggles,
  help and local bug-report download, confirmed reset, one actual local-home
  claim/door/enter/inside-HUD/exit/release cycle, reload persistence, and
  persistence into Rockets.
- `cameraLookDelta` returned the configured 1.5× mouse and .55× touch deltas
  for the same 100 px input. Separately, trusted browser drags changed the
  live camera yaw from .52 to .78 on desktop at 150%, and from 1.07405 to
  .59073 in touch emulation at 55%. Scaling visible action-layout DOM bounds
  from 80% to 120% increased them 1.5× on both desktop and touch emulation.
- In both browser sizes, live High/Medium/Low renderers used respectively
  DPR 2/1.25/.8, High/Medium shadows enabled with original/1024 shadow limits,
  and Low shadows disabled with a 512 limit. The desktop framebuffer was
  2560×1800 / 1600×1125 / 1024×720; touch emulation was
  780×1688 / 487×1055 / 312×675. Low was also observed in Rockets. Master
  mute remained `1`; the test never turns sound on.
- `qa/recovery-graphics.test.mjs` and `qa/party-audio-muted.test.mjs` passed:
  Low/Medium/High change renderer resolution/shadows without halting draws,
  while both effects and the existing ambience graph remain unallocated until
  audio is permitted.

Run the bounded checks separately so each browser run stays short:

```sh
FEEL_URL=http://127.0.0.1:8496/67park-foundation-next/ node qa/settings-entry.cjs
for mode in desktop mobile; do
  SETTINGS_MODE=$mode SETTINGS_STAGE=panel FEEL_URL=http://127.0.0.1:8496/67park-foundation-next/ node qa/settings-acceptance.cjs
  SETTINGS_MODE=$mode SETTINGS_STAGE=preserve FEEL_URL=http://127.0.0.1:8496/67park-foundation-next/ node qa/settings-acceptance.cjs
done
node --import ./qa/register-three.mjs --test qa/recovery-graphics.test.mjs qa/party-audio-muted.test.mjs
```

Limits: no physical iPhone/Safari certification, no full mini-game replay, and
no claim of universally crash-free gameplay. Reports require the player to send
the saved/copied file to the team; they are not uploaded automatically.
The Chromium touch profile exposed the Vibration switch, but hardware haptics
were not physically verified.

Rollback: revert the settings release commit in each repository.
