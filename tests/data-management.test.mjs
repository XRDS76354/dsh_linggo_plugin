import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.js";
import {
  createDataManagement,
  recoverDeletions,
} from "../src/data-management.js";
import { Jobs } from "../src/jobs.js";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "linggo-manage-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = new Store(root),
    project = await store.createProject({ name: "数据管理" });
  const source = join(root, "original.csv");
  await writeFile(source, "source bytes");
  for (const [id, parentId] of [
    ["v1", null],
    ["v2", "v1"],
    ["v3", "v2"],
  ]) {
    await mkdir(store.versionDir(project.id, id), { recursive: true });
    await writeFile(join(store.versionDir(project.id, id), "data.csv"), id);
    await store.addDataVersion({
      id,
      projectId: project.id,
      parentId,
      imports: [{ entity: "routes" }],
      sources: [{ path: source }],
    });
  }
  await mkdir(store.resultDir(project.id, "r3"), { recursive: true });
  await store.addResult({ id: "r3", projectId: project.id, versionId: "v3" });
  await store.createHandoff({
    projectId: project.id,
    summary: "保留会话",
    context: { dataVersionId: "v3", resultRefs: ["r3"] },
  });
  const invalidated = [];
  const api = createDataManagement(store, (p) => invalidated.push(p));
  return { store, project, source, api, invalidated };
}

test("deletion requires matching preview, removes only copies/results and preserves handoff prose", async (t) => {
  const { store, project, source, api, invalidated } = await fixture(t);
  const plan = await api.previewDeleteData({
    projectId: project.id,
    mode: "selected",
    ids: ["v3"],
  });
  assert.equal(plan.resultCount, 1);
  assert.equal(plan.nextVersionId, "v2");
  await assert.rejects(api.deleteData({ ...plan, token: "wrong" }), /重新确认/);
  assert.equal((await store.read()).dataVersions.length, 3);
  await api.deleteData(plan);
  const state = await store.read();
  assert.equal(state.results.length, 0);
  assert.equal(state.projects[0].currentVersionId, "v2");
  assert.equal(state.handoffs[0].summary, "保留会话");
  assert.equal(state.handoffs[0].context.dataVersionId, null);
  assert.deepEqual(state.handoffs[0].context.resultRefs, []);
  assert.equal(await readFile(source, "utf8"), "source bytes");
  assert.equal(invalidated.length, 1);
  await assert.rejects(
    readFile(join(store.versionDir(project.id, "v3"), "data.csv")),
    /ENOENT/,
  );
});

test("stale confirmation rejects new results; undo falls back when parent deleted; clear enters empty state", async (t) => {
  const { store, project, api } = await fixture(t);
  const stale = await api.previewDeleteData({
    projectId: project.id,
    mode: "all",
  });
  await store.addResult({ id: "r2", projectId: project.id, versionId: "v3" });
  await assert.rejects(api.deleteData(stale), /重新确认/);
  await api.deleteData(
    await api.previewDeleteData({
      projectId: project.id,
      mode: "selected",
      ids: ["v2"],
    }),
  );
  assert.equal(
    (await store.read()).dataVersions.find((v) => v.id === "v3").parentId,
    "v2",
  );
  const undo = await api.previewDeleteData({
    projectId: project.id,
    mode: "undo",
  });
  assert.equal(undo.nextVersionId, "v1");
  await api.deleteData(undo);
  await api.deleteData(
    await api.previewDeleteData({ projectId: project.id, mode: "all" }),
  );
  assert.equal(store.currentVersion(await store.read(), project.id), undefined);
  await assert.rejects(
    api.previewDeleteData({ projectId: project.id, mode: "undo" }),
    /没有可撤销/,
  );
});

test("project leases block deletion and another Host; only terminal tasks can hide/restore", async (t) => {
  const { store, project, api } = await fixture(t);
  const second = new Store(store.root);
  const lease = await store.claimOperation(project.id, "run");
  await assert.rejects(
    api.previewDeleteData({ projectId: project.id, mode: "all" }),
    /正在/,
  );
  await assert.rejects(second.claimOperation(project.id, "import"), /正在/);
  await store.releaseOperation(lease);
  for (const status of ["done", "failed", "cancelled", "running"])
    await store.recordJob({
      id: status,
      projectId: project.id,
      status,
      createdAt: new Date().toISOString(),
    });
  await assert.rejects(
    store.setJobsHidden({
      projectId: project.id,
      ids: ["running"],
      hidden: true,
    }),
    /只能/,
  );
  await store.setJobsHidden({
    projectId: project.id,
    ids: ["done", "failed", "cancelled"],
    hidden: true,
  });
  const jobs = new Jobs(store);
  assert.equal((await jobs.list(project.id)).length, 1);
  assert.equal((await jobs.list(project.id, true)).length, 4);
  await store.setJobsHidden({
    projectId: project.id,
    ids: ["failed"],
    hidden: false,
  });
  assert.equal((await jobs.list(project.id)).length, 2);
});

test("deletion journal restores an uncommitted move and finalizes a committed move after restart", async (t) => {
  const { store, project } = await fixture(t);
  const dir = join(store.root, "deletions", "crash");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "journal.json"),
    JSON.stringify({
      projectId: project.id,
      pid: 2147483647,
      items: [{ kind: "version", id: "v3" }],
    }),
  );
  await rename(store.versionDir(project.id, "v3"), join(dir, "version-v3"));
  await recoverDeletions(new Store(store.root));
  assert.equal(
    await readFile(
      join(store.versionDir(project.id, "v3"), "data.csv"),
      "utf8",
    ),
    "v3",
  );
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "journal.json"),
    JSON.stringify({
      projectId: project.id,
      pid: 2147483647,
      items: [{ kind: "version", id: "v3" }],
    }),
  );
  await rename(store.versionDir(project.id, "v3"), join(dir, "version-v3"));
  await store.update((s) => {
    s.deletedTransactions.push("crash");
    s.dataVersions = s.dataVersions.filter((v) => v.id !== "v3");
  });
  await recoverDeletions(new Store(store.root));
  await assert.rejects(readFile(join(dir, "journal.json")), /ENOENT/);
});
