# Compatibility

- Target DSH: `0.2.1-alpha.1`, local official-source baseline `5badb15009`.
- Tested Host: macOS, Node.js 22.23.1, npm-distributed DSH 0.2.1-alpha.1.
- Official installation into a separate Web profile and authenticated RPC: verified.
- Native browser conversation rendering, streaming, cancellation and reconnect: pending browser validation.
- Desktop IPC routes: implemented against the shared Fetch route API, not yet runtime-verified.
- Desktop → independent Web surface: uses the same Host HTTP port and official authenticatedUrl; token exchange verified over HTTP. Actual desktop click and browser fragment retention remain unverified.
- Windows and Linux: planned, not verified.
- No upstream fork or source patch is required by the preview.

The preview uses `shell.overlay`, `uiWorkspace.openSession`, `sessions.create` and the official Connection envelope. Workbench-only CSS adapts the stock frame's `data-rightbar-col` anchor. This selector must be included in the visual compatibility gate for every DSH upgrade. Stock Chat implementation is not copied.
