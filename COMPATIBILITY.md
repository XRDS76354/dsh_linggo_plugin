<!-- linggo-compat: 0.2.0-rc.2 || 0.2.1-alpha.1 || >=0.2.1-rc.1 <0.2.2-0; runtimes: 0.2.0-rc.2, 0.2.1-alpha.1, 0.2.1-rc.1 -->
# Compatibility — 0.1.1-alpha.3

- Source of truth: `compatibility.json`; run `npm run check:compat` to verify manifest/docs, `npm run sync:compat` after deliberate policy changes.
- `engines.dsh` and optional DSH peers share the bounded range above. Current target matrix: `0.2.0-rc.2`, `0.2.1-alpha.1`, `0.2.1-rc.1`. Future matching builds are allowed attempts, not verified releases. The installer includes prereleases in comparisons; `0.2.2-0` and later remain excluded.
- New baseline: the immutable official `dsh-v0.2.1-rc.1` release (`1600d8a`), not moving master. Old baselines remain `639ed01` / `5badb15009`.
- Runtime dependencies are supplied by the Host; React is external and DSH packages are not bundled. Missing `tools.guard/register` or authenticated transport stops business activation. Draft initialization is capability-based; absent initialization falls back to explicit copy/paste and never submits.
- The read-only compatibility endpoint reports plugin/protocol/build IDs and callable API availability. Settings copies only those fields, never credentials or data paths. A differing build with compatible protocol is advisory; absent endpoint, protocol mismatch, or missing required APIs pauses new writes. No write is retried automatically.
- Existing layout remains a guarded DOM adaptation. A recognized frame is tagged before scoped styles apply; loss or ambiguity removes tags and releases native layout. This reduces damage on drift, not the need for visual regression.
- Official update/reload is preferred. Restart only when the Host remains stale or requests it; a browser reload alone cannot replace a cached Host module. HMR behavior is not assumed from a version number.
- JS/Python and isolated official installer/Host/Web results and remaining limitations are recorded in [verification](docs/compatibility.md#2026-10-17-兼容维护修复).
- Native Desktop window behavior is distinct from Web. Windows/Linux CI configuration does not imply a completed machine or GitHub run. AMap/Baidu external services and PostGIS are not newly verified.
- No upstream patch, version exemption, data migration, or automatic GitHub publication. The `conversation.content` Factory is a later integration path; this release does not mount another composer or copy Chat implementation.

## Reproduce

```sh
npm ci
npm run build
LINGGO_TEST_PYTHON=/path/to/python LINGGO_REQUIRE_PYTHON=1 npm test
PYTHONPATH=python /path/to/python -m unittest discover -s python/tests
npm run test:compat -- --smoke /path/to/rc2 /path/to/alpha1 /path/to/rc1
npm run compat:upstream -- 0.2.1-rc.1
npm run pack:release
```

`--install --smoke` installs the configured exact official runtimes under ignored `.local/compat/`; it never replaces the user's Host. Browser scripts must use isolated homes and the local deterministic provider. Rollback only to a plugin accepted by that Host; alpha.2 remains incompatible with rc.1. Never downgrade or rewrite Session logs as a plugin rollback step.
