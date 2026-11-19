// Run in a subprocess with the exact official runtime's imports (test-compat.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Context } from '@deepseek-ai/cordis';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import ToolRuntime from '@deepseek-ai/dsh-tools';
import * as NativeExecutor from '@deepseek-ai/dsh-tool-executor-native';
import { toolDenial } from '../../src/policy.js';

test('official native batch dispatcher enforces LingGo presentation tool policy', async () => {
  const ctx = new Context();
  await ctx.plugin(SystemPrompt, {});
  await ctx.plugin(ToolRuntime);
  await ctx.plugin(NativeExecutor);
  const root = join(tmpdir(), 'linggo-guard');
  const invocations = [];
  for (const name of ['probe_write', 'linggo_status']) {
    ctx.tools.register({
      name,
      description: 'Test-only effect',
      parameters: { type: 'object', properties: {} },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: async () => {
        invocations.push(name);
        return 'executed';
      },
    });
  }
  ctx.tools.guard((exec) => toolDenial(root, exec));
  const execute = async (mode, name) => {
    const call = { type: 'tool-call', id: `${mode}-${name}`, name, arguments: '{}' };
    const { results } = await ctx.tools.execute({
      agent: { id: mode, session: { header: { cwd: join(root, 'projects', 'p-1', mode) } } },
      calls: [call],
      signal: new AbortController().signal,
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].callId, call.id);
    return results[0].result;
  };
  const denied = await execute('presentation', 'probe_write');
  assert.equal(denied.isError, true);
  assert.match(JSON.stringify(denied), /presentation sessions may only use registered transit tools/);
  assert.deepEqual(invocations, []);
  assert.notEqual((await execute('presentation', 'linggo_status')).isError, true);
  assert.notEqual((await execute('development', 'probe_write')).isError, true);
  assert.deepEqual(invocations, ['linggo_status', 'probe_write']);
});
