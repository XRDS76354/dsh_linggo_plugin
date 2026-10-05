import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.js";
const temp = async (t) => {
  const root = await mkdtemp(join(tmpdir(), "linggo-store-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
};
test("concurrent creation across Store instances keeps every project", async (t) => {
  const root = await temp(t);
  const a = new Store(root), b = new Store(root);
  await Promise.all(["A", "B", "C", "D"].map((name, i) => (i % 2 ? a : b).createProject({ name })));
  assert.equal((await new Store(root).read()).projects.length, 4);
  await assert.rejects(a.createProject({ name: " " }), /Invalid/);
});
test("handoffs validate project and references and record opening", async (t) => {
  const root = await temp(t);
  const store = new Store(root);
  const p = await store.createProject({ name: "临港" });
  await assert.rejects(store.createHandoff({ projectId: "unknown", summary: "x" }), /Unknown project/);
  await assert.rejects(store.createHandoff({ projectId: p.id, summary: "x", context: { dataVersionId: "v1" } }), /Unknown data version/);
  await assert.rejects(store.createHandoff({ projectId: p.id, summary: "x", context: { resultRefs: ["r1"] } }), /Unknown result/);
  const item = await store.createHandoff({ projectId: p.id, summary: "Review algorithm", sourceSessionId: "s-1" });
  assert.deepEqual(item.context, { dataVersionId: null, scenarioId: null, resultRefs: [] });
  const opened = await store.markHandoffOpened({ id: item.id, devSessionId: "dev-1" });
  assert.equal(opened.devSessionId, "dev-1");
  assert.ok(opened.openedAt);
  assert.ok((await store.archiveHandoff({ id: item.id })).archivedAt);
});
test("schema 1 state migrates and newer schemas are refused", async (t) => {
  const root = await temp(t);
  await writeFile(join(root, "state.json"), JSON.stringify({ schema: 1, projects: [{ id: "p", name: "A" }], handoffs: [{ id: "h", projectId: "p", summary: "s" }] }));
  const state = await new Store(root).read();
  assert.equal(state.schema, 2);
  assert.equal(state.handoffs[0].devSessionId, null);
  await writeFile(join(root, "state.json"), JSON.stringify({ schema: 9 }));
  await assert.rejects(new Store(root).createProject({ name: "B" }), /newer/);
  assert.equal(JSON.parse(await readFile(join(root, "state.json"), "utf8")).schema, 9);
});
test("a stale lock left by a crashed process is recovered", async (t) => {
  const root = await temp(t);
  await mkdir(root, { recursive: true });
  const lock = join(root, "state.lock");
  await writeFile(lock, "{}");
  const { utimes } = await import("node:fs/promises");
  await utimes(lock, new Date(0), new Date(0));
  await new Store(root).createProject({ name: "A" });
});
