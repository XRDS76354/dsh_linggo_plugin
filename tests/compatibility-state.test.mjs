import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILD, capabilities, createCompatibilityClient, diagnosticSummary } from '../src/compatibility.js';
import { presentationFrame, installPresentationStyle } from '../src/compat-client.js';
import { syncCompatibility } from '../scripts/sync-compat.mjs';
const translate = (key) => key;
const report = (patch = {}) => ({ ...BUILD, runtime: 'fixture', capabilities: { required: { 'tools.guard': true, 'tools.register': true, 'connection.fetch.register': true }, optional: {} }, operations: ['deleteData', 'createProject'], ...patch });

test('manifest and documentation share the compatibility source', async () => {
  const config = await syncCompatibility();
  assert.equal(config.protocol, 1);
  assert.ok(config.runtimes.includes('0.2.1-rc.1'));
});
test('missing endpoint and incompatible protocols cannot dispatch writes; reads remain available', async () => {
  for (const mode of ['missing', 'protocol', 'capabilities', 'unsupportedOperation']) {
    const calls = [];
    const client = createCompatibilityClient(async (op) => {
      calls.push(op);
      if (op !== 'compatibility') return 'read';
      if (mode === 'missing') throw Error('transport failure: HTTP 404');
      if (mode === 'protocol') return report({ protocol: 999 });
      if (mode === 'capabilities') return report({ capabilities: { required: { 'tools.guard': false } } });
      return report({ operations: [] });
    }, { t: translate });
    await assert.rejects(client.request('deleteData'), /compat\./);
    assert.equal(calls.includes('deleteData'), false);
    assert.equal(await client.request('state'), 'read');
  }
});
test('compatible differing builds are advisory; errors never replay a write', async () => {
  let writes = 0;
  const client = createCompatibilityClient(async (op) => {
    if (op === 'compatibility') return report({ build: 'other-build' });
    writes++; throw Error('response lost');
  }, { t: translate });
  await assert.rejects(client.request('createProject'), /response lost/);
  assert.equal(client.getSnapshot().status, 'ready');
  assert.equal(client.getSnapshot().code, 'differentBuild');
  assert.equal(writes, 1);
});
test('a stale handshake from before reconnect cannot enable a write or replace current diagnostics', async () => {
  let resolveOld, reads = 0, writes = 0;
  const client = createCompatibilityClient((op) => {
    if (op !== 'compatibility') { writes++; return; }
    reads++;
    if (reads === 1) return new Promise((resolve) => { resolveOld = resolve; });
    return Promise.resolve(report({ protocol: 42 }));
  }, { t: translate });
  const write = client.request('deleteData');
  client.reset(); await client.inspect(); resolveOld(report());
  await assert.rejects(write);
  assert.equal(writes, 0);
  assert.equal(client.getSnapshot().code, 'protocol');
});
test('copied diagnostic excludes unrelated server paths, tokens and settings', async () => {
  const client = createCompatibilityClient(async () => report({ token: 'PRIVATE_TOKEN', settings: { path: '/private/data' } }), { t: translate });
  await client.inspect();
  assert.doesNotMatch(diagnosticSummary(client.getSnapshot()), /PRIVATE_TOKEN|private\/data/);
  assert.equal(capabilities({}, ['tools.guard']).required['tools.guard'], false);
});
function element() {
  const attrs = new Map();
  return { children: [], dataset: {}, style: { removeProperty() {} }, setAttribute: (k,v) => attrs.set(k,v), hasAttribute: (k) => attrs.has(k), removeAttribute: (k) => attrs.delete(k), remove() {} };
}
function fixture() {
  const sidebar = element(), center = element(), right = element(), frame = element();
  right.setAttribute('data-rightbar-col', ''); frame.children = [sidebar, center, right];
  let frames = [frame], callback, disconnected = false;
  const document = {
    documentElement: element(), body: element(), head: { append() {} }, createElement: element,
    querySelectorAll: () => frames,
    defaultView: { MutationObserver: class { constructor(fn) { callback = fn; } observe() {} disconnect() { disconnected = true; } } },
  };
  return { document, frame, sidebar, center, setFrames: (v) => { frames=v; }, notify: () => callback(), disconnected: () => disconnected };
}
test('layout takeover requires a recognized frame and a ready handshake, and restores native UI on drift/disposal', () => {
  const f = fixture(); let ready = false, latest;
  const dispose = installPresentationStyle(f.document, '', true, { canEnable: () => ready, onChange: (v) => { latest=v; } });
  assert.equal(f.document.documentElement.hasAttribute('data-linggo'), false);
  ready=true; dispose.check(); assert.equal(f.document.documentElement.hasAttribute('data-linggo'), true);
  assert.equal(f.center.hasAttribute('data-linggo-center'), true);
  f.frame.children.reverse(); f.notify();
  assert.equal(latest.ok, false);
  assert.equal(f.document.documentElement.hasAttribute('data-linggo'), false);
  assert.equal(f.center.hasAttribute('data-linggo-center'), false);
  f.frame.children.reverse(); f.notify();
  assert.equal(f.document.documentElement.hasAttribute('data-linggo'), true);
  dispose(); assert.equal(f.disconnected(), true);
  assert.equal(f.frame.hasAttribute('data-linggo-frame'), false);
});
test('ambiguous or absent frames are rejected without touching native structure', () => {
  const f=fixture(); f.setFrames([]); assert.equal(presentationFrame(f.document).code, 'missingFrame');
  f.setFrames([f.frame,f.frame]); assert.equal(presentationFrame(f.document).code, 'ambiguousFrame');
});

test('disposed clients cannot dispatch stale actions after plugin unload', async () => {
  let writes=0;
  const client=createCompatibilityClient(async (op)=>{ if(op==='compatibility') return report(); writes++; },{t:translate});
  await client.inspect();client.dispose();
  await assert.rejects(client.request('deleteData'),/compat.unavailable/);
  assert.equal(writes,0);
});

test('omitted required capabilities cannot pass the handshake', async () => {
  const client=createCompatibilityClient(async () => report({capabilities:{required:{}}}), {t:translate});
  await assert.rejects(client.request('deleteData'), /compat.capabilities/);
});
