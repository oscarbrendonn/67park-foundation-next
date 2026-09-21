# Mac mini preview connection recovery

## Scope

The user approved restoring the free Mac mini service and automatic recovery on
21 September 2026. The original feel-lab/kimi/mobile repositories remain untouched.
No paid host, account, domain, or system-wide power setting was added or changed.

The previous published client still referenced the expired
`fall-indexed-shipped-muscle.trycloudflare.com` endpoint. There was no process
listening on 8498 and no Cloudflare tunnel process. The old log did not establish
why those processes exited. A working internet connection alone cannot restore
an exited server or a stale tunnel URL.

## Service implementation

- User LaunchAgent `com.67park.foundation-next.backend`: persistent backend on
  loopback port 8498, KeepAlive, 10-second restart throttle, graceful shutdown.
- User LaunchAgent `com.67park.foundation-next.tunnel`: free Cloudflare quick
  tunnel supervised independently from the game authority. A tunnel restart
  therefore does not restart live rooms or reset the game server.
- Backend lifetime acquires a scoped `caffeinate -i -s -w PID` assertion. It does
  not change global power preferences or display sleep.
- Guest profiles/friends/safety live in ignored `data/public/`. The available
  older social/safety store was copied into this separate directory without
  overwriting or editing the source. No raw guest token or private data is
  placed in the repository or endpoint manifest.
- The tunnel publishes only `backend.json` on the isolated `ops-endpoint`
  branch, after local and public health succeed. Main and Pages are never
  changed by that service; normal game releases retain their full CI gate.
- The Pages client discovers the operational endpoint before authentication
  and uses it for both WebSocket channels. Local QA stays local. Import-map
  aliases keep one transport instance. World, camera, wardrobe, graphics, and
  audio module versions are unchanged by this work.
- A failed endpoint permits one anonymous, fixed GitHub Contents API lookup per
  minute. Manifest timestamps prevent a stale Raw CDN response from reverting
  a newer working address. A four-second deadline, 2 KB cap, coalescing and
  strict HTTPS host validation bound discovery failures.
- New tunnel health probes use a scoped Cloudflare DNS resolver; they do not
  seed the home router's negative DNS cache before a new hostname propagates.
  System and browser DNS preferences remain unchanged.

## Evidence so far

- `.qa-results/managed-backend-restart.json`: actual managed process SIGKILL
  with zero connected users; replacement process healthy in 2053 ms, same guest
  identity and friend code, zero reported faults.
- `qa/backend-restart.test.mjs`: restart preserves authenticated identity and
  safety preferences. Housing occupancy and live rooms are intentionally
  memory-only and are not claimed to survive an authority restart.
- `qa/public-endpoint.test.mjs`: fixed-host routing, branch isolation, existing
  revision protection, unchanged URL no-write, and 403 no-fallback-write checks.
- `.qa-results/public-tunnel-recovery.json`: two actual browser games on Apple
  M4 hardware reached the public Mac mini backend, exchanged UI chat and
  observed movement. After the managed Cloudflare process was forcibly killed,
  launchd started a new tunnel and both games automatically selected its new
  hostname without reloading, preserving their identities. Recovery 52315 ms,
  both still drawing, audio muted, zero page errors. This is a candidate overlay,
  not evidence that Pages has published the new client.
- `.qa-results/mac-recovery-unit-final.log`: 200 tests, 198 pass, 2 pre-existing
  optional fixture skips, zero failures. An earlier concurrent browser+unit run
  exceeded the unchanged camera prewarm chunk budget (52 ms); the complete rerun
  without competing browser renderers passed without changing that assertion.

## Release gate and honest limits

Full hosted recovery/chat/home/physics regression and 900000 ms mobile viewport
soak remain required, followed by Pages and actual online browser checks. A
candidate overlay is not proof of a published release. Keep game audio muted.

This is a free preview on a logged-in Mac, not an uptime-guaranteed production
host. Power loss, manual sleep, logout, loss of internet, provider outage, or
revoked GitHub authentication can still interrupt it. LaunchAgents restart at
login, not before login after power loss. This work is not a new physical iPhone
or Android performance test and does not promise universal freeze-free play.
