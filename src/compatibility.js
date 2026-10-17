import config from '../compatibility.json' with { type: 'json' };
export { config as compatibilityConfig };
export const BUILD = typeof __LINGGO_BUILD__ === 'undefined'
  ? { version: config.pluginVersion, protocol: config.protocol, build: 'source' }
  : __LINGGO_BUILD__;
export function capabilities(ctx, required, optional = []) {
  const callable = (path) => {
    try { return typeof path.split('.').reduce((obj, key) => obj?.[key], ctx) === 'function'; }
    catch { return false; }
  };
  return {
    required: Object.fromEntries(required.map((key) => [key, callable(key)])),
    optional: Object.fromEntries(optional.map((key) => [key, callable(key)])),
  };
}
export const missingCapabilities = (report) => Object.keys(report.required).filter((key) => !report.required[key]);

/** Only explicit, non-sensitive fields may enter the copyable diagnostic. */
export function diagnosticSummary(snapshot) {
  return JSON.stringify({
    client: BUILD, host: snapshot.host ? {
      version: snapshot.host.version, protocol: snapshot.host.protocol,
      build: snapshot.host.build, runtime: snapshot.host.runtime,
      capabilities: snapshot.host.capabilities,
    } : null,
    status: snapshot.status, code: snapshot.code,
    clientCapabilities: snapshot.clientCapabilities,
    layout: snapshot.layout,
  }, null, 2);
}

/** Handshake caching is scoped to a Connection generation; writes are never retried. */
export function createCompatibilityClient(call, { t, clientCapabilities, build = BUILD } = {}) {
  let generation = 0, pending, ready = false, disposed = false;
  let snapshot = { status: 'checking', code: 'checking', clientCapabilities, host: null, layout: null };
  const listeners = new Set();
  const publish = (next) => {
    const value = { ...snapshot, ...next };
    if (JSON.stringify(value) === JSON.stringify(snapshot)) return;
    snapshot = value;
    for (const listener of listeners) listener();
  };
  const inspect = () => {
    if (disposed) return Promise.resolve(snapshot);
    if (pending) return pending;
    const epoch = generation;
    const attempt = (async () => {
      let next;
      try {
        let timer;
        const host = await Promise.race([
          call('compatibility', {}),
          new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Compatibility timeout')), 8000); }),
        ]).finally(() => clearTimeout(timer));
        if (!host || host.protocol !== build.protocol || !Array.isArray(host.operations) || !host.operations.every((op) => typeof op === 'string') || typeof host.version !== 'string' || typeof host.build !== 'string' || !host.capabilities?.required) {
          next = { status: 'blocked', code: 'protocol', host: null };
        } else if (config.hostRequired.some((key) => host.capabilities.required[key] !== true) || (clientCapabilities && missingCapabilities(clientCapabilities).length)) {
          next = { status: 'blocked', code: 'capabilities', host };
        } else {
          next = { status: 'ready', code: host.build === build.build ? 'ready' : 'differentBuild', host };
        }
      } catch (error) {
        next = { status: 'blocked', code: /(?:HTTP\s*404\b|status(?:\s*code)?\s*[:=]?\s*404\b)/i.test(String(error?.message)) ? 'restart' : 'unavailable', host: null };
      }
      if (epoch === generation) { ready = next.status === 'ready'; publish(next); }
      return snapshot;
    })();
    pending = attempt;
    void attempt.finally(() => { if (pending === attempt) pending = undefined; });
    return attempt;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    inspect,
    setLayout: (layout) => {
      if (JSON.stringify(snapshot.layout) !== JSON.stringify(layout)) publish({ layout });
    },
    reset: () => { generation++; ready = false; pending = undefined; publish({ status: 'checking', code: 'checking', host: null }); },
    dispose: () => { disposed = true; generation++; ready = false; pending = undefined; listeners.clear(); },
    async request(operation, payload) {
      if (disposed) throw Error(t('compat.unavailable'));
      if (operation === 'clientCompatibility') return snapshot;
      if (operation === 'compatibility') { await inspect(); return snapshot.host; }
      if (!config.readOperations.includes(operation)) {
        const epoch = generation;
        if (!ready) await inspect();
        if (epoch !== generation || !ready) throw Error(t(`compat.${snapshot.status === 'ready' ? 'unavailable' : snapshot.code}`));
        if (!snapshot.host.operations.includes(operation)) throw Error(t('compat.protocol'));
      }
      return call(operation, payload);
    },
  };
}
