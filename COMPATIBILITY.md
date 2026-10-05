# Compatibility

- Target DSH: `0.2.1-alpha.1`, local official-source baseline `5badb15009`. Later versions are not assumed compatible.
- Tested Host: macOS, Node.js 22.23.1, npm-distributed DSH 0.2.1-alpha.1, Microsoft Edge.
- Verified in the browser: three-column workbench, native conversation with real model streaming and tool records, tool restriction, development handoff into a native draft, session reuse, narrow layout, Host restart and uninstall. See [docs/verification.md](docs/verification.md).
- Desktop app: not verified (the installed desktop build is 0.2.0-rc.2). The desktop → browser link uses `webServer.port` and `connection.authenticatedUrl`.
- Windows and Linux: planned, not verified.
- No upstream fork or source patch is required.

Extension points used: `shell.overlay`, `main`, `sidebar.panellist`, `uiWorkspace.openSession/openWorkspace`, `sessions.create/using/binding`, `workspaces.create/rename`, `conversation.input.requestDraftInitialization`, `tools.guard/register`, agent `tools.restrict`, agent `systemPrompt` sections, and the Connection fetch envelope.

Workbench-only CSS adapts the stock frame through the `[data-rightbar-col]` anchor, the frame's child order (sidebar, center, rightbar) and `[data-side]` drag handles. These selectors must be checked visually on every DSH upgrade. The stock Chat implementation is not copied.
