import test from "node:test";
import assert from "node:assert/strict";
import { createClientAdapter } from "../src/compat-client.js";
import { authenticatedWorkbenchUrl, requireHostCapabilities } from "../src/compat-host.js";

function fixture(initialize) {
  const calls = [], bindings = new Map([['existing', { id: 'existing' }], ['new', { id: 'new' }]]);
  const ctx = {
    uiWorkspace: { openSession: (id) => calls.push(['open', id]), openWorkspace: async (_id, before) => { before('new'); calls.push(['open', 'new']); } },
    sessions: { create: async () => 'presentation', binding: (id) => bindings.get(id),
      list: { getSnapshot: () => ({ byId: { existing: {} } }) },
      using: async (id, _options, run) => run({ binding: bindings.get(id), ready: Promise.resolve() }) },
    workspaces: { create: async () => ({ workspaceId: 'workspace', title: 'title' }), rename: async () => {},
      list: { getSnapshot: () => ({ items: [{ workspaceId: 'workspace' }] }) } },
    slots: { inject() {}, register() {} },
    conversation: { input: initialize ? { requestDraftInitialization: (binding, options) => {
      calls.push(['draft', binding.id, options.prompt]); return initialize(binding, options);
    } } : { for() { throw Error('The old composer must not be modified'); } } },
  };
  const api = async (operation, payload) => {
    calls.push([operation, payload]);
    if (operation === 'directory') return { cwd: '/project/' + payload.mode };
    if (operation === 'state') return { projects: [{ id: 'p', name: 'Project' }] };
  };
  const adapter = createClientAdapter(ctx, { api, t: (key) => key });
  return { ctx, calls, adapter };
}

test('rc.2 opens and records a development session without mutating or sending a draft', async () => {
  const { adapter, calls } = fixture();
  assert.equal(adapter.capabilities.draftInitialization, false);
  assert.equal(await adapter.openHandoff({ id: 'h' }, { id: 'p' }, 'handoff'), 'manual');
  assert.deepEqual(calls.at(-1), ['handoffOpened', { id: 'h', devSessionId: 'new' }]);
  assert.equal(await adapter.openHandoff({ id: 'h', devSessionId: 'existing' }, { id: 'p' }, 'handoff'), 'manual');
  assert.equal(calls.filter(([name]) => name === 'handoffOpened').length, 1);
  assert.equal(calls.some(([name]) => name === 'draft' || name === 'submit'), false);
});

test('alpha.1 initializes the retained session before navigation and preserves existing drafts', async () => {
  const { adapter, calls } = fixture(() => 'preserved');
  assert.equal(await adapter.openHandoff({ devSessionId: 'existing' }, { id: 'p' }, 'handoff'), 'preserved');
  const draft = calls.findIndex(([name]) => name === 'draft');
  assert.deepEqual(calls[draft], ['draft', 'existing', 'handoff']);
  assert.deepEqual(calls[draft + 1], ['open', 'existing']);
});

test('blocked native draft does not navigate or mark a handoff as opened', async () => {
  const { adapter, calls } = fixture(() => 'blocked');
  await assert.rejects(adapter.openHandoff({ id: 'h' }, { id: 'p' }, 'handoff'), /dev.draftBlocked/);
  assert.equal(calls.some(([name]) => name === 'open' || name === 'handoffOpened'), false);
});

test('presentation creation stays in its project workspace and missing public APIs fail clearly', async () => {
  const { adapter, calls, ctx } = fixture();
  await adapter.newPresentation('p');
  assert.deepEqual(calls.find(([name]) => name === 'directory'), ['directory', { projectId: 'p', mode: 'presentation' }]);
  assert.deepEqual(calls.at(-1), ['open', 'presentation']);
  delete ctx.sessions.using;
  assert.throws(() => createClientAdapter(ctx, {}), /sessions.using/);
});

test('Host never activates without the final tool guard or authenticated transport', () => {
  const ctx = { tools: { register() {} }, connection: { fetch: { register() {} } } };
  assert.throws(() => requireHostCapabilities(ctx), /tools.guard/);
  ctx.tools.guard = () => {};
  assert.doesNotThrow(() => requireHostCapabilities(ctx));
  assert.throws(() => authenticatedWorkbenchUrl(ctx, true), /authenticated browser link/);
  ctx.webServer = { port: 3180 };
  ctx.connection.authenticatedUrl = (url) => url + '?token=test-only';
  const url = new URL(authenticatedWorkbenchUrl(ctx, true));
  assert.equal(url.searchParams.get('token'), 'test-only');
  assert.equal(url.hash, '#linggo=1&desktopReturn=1');
});
