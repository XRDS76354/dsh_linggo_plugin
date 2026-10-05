import test from "node:test";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import SystemPrompt from "@deepseek-ai/dsh-system-prompt";
import ToolRuntime from "@deepseek-ai/dsh-tools";
import { toolDenial } from "../src/policy.js";
test("DSH real tool dispatcher refuses coding before its body runs", async () => {
  const ctx = new Context();
  await ctx.plugin(SystemPrompt, {});
  await ctx.plugin(ToolRuntime);
  let called = false;
  ctx.tools.register({
    name: "probe_write",
    description: "Test-only effect",
    parameters: { type: "object", properties: {} },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }],
    },
    execute: async () => {
      called = true;
      return "executed";
    },
  });
  const lift = ctx.tools.guard((exec) =>
    toolDenial("/tmp/linggo", exec),
  );
  const result = await ctx.tools.execute({
    callId: "probe-1",
    name: "probe_write",
    arguments: {},
    signal: new AbortController().signal,
    agent: {
      id: "test-presentation",
      session: { header: { cwd: "/tmp/linggo/projects/p-1/presentation" } },
    },
  });
  assert.equal(called, false);
  assert.match(JSON.stringify(result), /presentation/);
  lift();
  const allowed = await ctx.tools.execute({
    callId: "probe-2",
    name: "probe_write",
    arguments: {},
    signal: new AbortController().signal,
  });
  assert.equal(called, true);
  assert.match(JSON.stringify(allowed), /executed/);
});
