import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runWorker } from "../src/worker.js";
import { python, ready } from "./host.mjs";

async function algorithmFixture(t, body) {
  const root = await mkdtemp(join(tmpdir(), "linggo worker 中文 '"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "算法 fixture.py");
  const source = `META = {'id':'fixture','name':'fixture','kind':'custom','inputs':[],'params':{}}\ndef run(inputs, params, ctx):\n${body}\n`;
  await writeFile(path, source);
  const versionDir = join(root, "version");
  await mkdir(versionDir);
  return { cmd: "run", algorithm: { path, sha256: createHash("sha256").update(source).digest("hex") }, versionDir, resultDir: join(root, "result") };
}

test("real worker emits and persists nested non-finite numbers as JSON null", { skip: !ready }, async (t) => {
  const request = await algorithmFixture(t, `    import numpy as np
    ctx.progress(0.5, '中文进度')
    return {'summary': {'geometry': float('nan'), 'nested': [float('inf'), {'v': -float('inf')}], 'tuple': (np.float32('nan'), np.int64(7)), 'finite': 1.25, 'text': 'NaN', 'enabled': True}}`);
  const events = [];
  const result = await runWorker({ python, request, onProgress: (value, message) => events.push([value, message]) });
  assert.deepEqual(result.summary, { geometry: null, nested: [null, { v: null }], tuple: [null, 7], finite: 1.25, text: "NaN", enabled: true });
  assert.ok(events.some(([value, message]) => value === 0.5 && message === "中文进度"));
  const stored = JSON.parse(await readFile(join(request.resultDir, "result.json"), "utf8"));
  assert.deepEqual(stored.summary, result.summary);
});

test("invalid worker output reports a protocol error without exposing its payload", { skip: !ready }, async (t) => {
  const request = await algorithmFixture(t, `    print('{"private":"fixture-secret","geometry":NaN}', flush=True)
    return {'summary': {}}`);
  await assert.rejects(runWorker({ python, request }), (error) => {
    assert.match(error.message, /协议错误.*JSON/);
    assert.doesNotMatch(error.message, /fixture-secret|异常退出/);
    return true;
  });
});
