<!-- linggo-compat: 0.2.0-rc.2 || 0.2.1-alpha.1 || >=0.2.1-rc.1 <0.2.2-0 || 0.2.2-rc.5; runtimes: 0.2.0-rc.2, 0.2.1-alpha.1, 0.2.1-rc.1, 0.2.2-rc.5 -->
# Compatibility — 0.1.1-alpha.4

- Source of truth: `compatibility.json`; run `npm run check:compat` to verify manifest/docs, `npm run sync:compat` after deliberate policy changes.
- `engines.dsh` and optional DSH peers share the bounded range above. Test matrix: `0.2.0-rc.2`, `0.2.1-alpha.1`, `0.2.1-rc.1`, `0.2.2-rc.5`. The only `0.2.2` admitted is `0.2.2-rc.5`. Other versions matching the preserved `0.2.1` range are allowed attempts, not verified releases.
- New baseline: the exact official `dsh-v0.2.2-rc.5` tag (`9c2670d`), not a moving branch or npm dist-tag. The official npm CLI for this runtime requires Node.js 24.9+. The guard test mounts its native executor and dispatches a real tool batch; the three older versions still run the previous guard fixture.
- Runtime dependencies are supplied by the Host; React is external and DSH packages are not bundled. Missing `tools.guard/register` or authenticated transport stops business activation. Draft initialization is capability-based; absent initialization falls back to explicit copy/paste and never submits.
- The read-only compatibility endpoint reports plugin/protocol/build IDs and callable API availability. Settings copies only those fields, never credentials or data paths. A differing build with compatible protocol is advisory; absent endpoint, protocol mismatch, or missing required APIs pauses new writes. No write is retried automatically.
- Existing layout remains a guarded DOM adaptation. A recognized frame is tagged before scoped styles apply; loss or ambiguity removes tags and releases native layout. This reduces damage on drift, not the need for visual regression.
- Official update/reload is preferred. Restart only when the Host remains stale or requests it; a browser reload alone cannot replace a cached Host module. HMR behavior is not assumed from a version number.
- JS/Python and isolated official installer/Host/Web results and remaining limitations are recorded in [verification](docs/compatibility.md#2026-11-19-dsh-022-rc5).
- The native macOS `0.2.2-rc.5` window was tested separately from Web. Windows/Linux desktop are not covered by that result. Check the exact commit's [CI results](https://github.com/XRDS76354/dsh_linggo_plugin/actions/workflows/verify.yml) separately. AMap/Baidu external services and PostGIS are not newly verified.
- No upstream patch, version exemption, or data migration. The `conversation.content` Factory is a later integration path; this release does not mount another composer or copy Chat implementation.

## Reproduce

```sh
npm ci
npm run build
LINGGO_TEST_PYTHON=/path/to/python LINGGO_REQUIRE_PYTHON=1 npm test
PYTHONPATH=python /path/to/python -m unittest discover -s python/tests
npm run test:compat -- --smoke /path/to/rc2 /path/to/alpha1 /path/to/rc1 /path/to/rc5
npm run compat:upstream -- 0.2.2-rc.5
npm run pack:release
```

`--install --smoke` installs the configured exact official runtimes under ignored `.local/compat/`; it never replaces the user's Host. Browser scripts must use isolated homes and the local deterministic provider. Rollback only to a plugin accepted by that Host; LingGo alpha.3 is not accepted by DSH 0.2.2-rc.5. Never downgrade or rewrite Session logs as a plugin rollback step.
