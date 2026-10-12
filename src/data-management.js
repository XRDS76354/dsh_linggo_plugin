import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { operationAlive } from "./store.js";

const fingerprint = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const exists = (path) =>
  stat(path).then(
    () => true,
    () => false,
  );

function planOf(store, state, input) {
  const project = state.projects.find((p) => p.id === input.projectId);
  if (!project) throw Error("Unknown project");
  if (
    state.operations.some(
      (o) => o.projectId === project.id && operationAlive(o),
    )
  )
    throw Error("该项目正在导入、运行算法或清理数据，请先等待或取消");
  const own = state.dataVersions.filter((v) => v.projectId === project.id);
  const latest = own
    .filter((v) => v.imports?.length && v.provenance?.origin !== "bundled-demo")
    .at(-1);
  const ids =
    input.mode === "all"
      ? own.map((v) => v.id)
      : input.mode === "undo"
        ? [latest?.id]
        : input.ids;
  if (
    !["all", "undo", "selected"].includes(input.mode) ||
    !Array.isArray(ids) ||
    !ids.length ||
    ids.some((id) => !own.some((v) => v.id === id))
  )
    throw Error(
      input.mode === "undo" ? "没有可撤销的导入" : "请选择有效的数据集",
    );
  const versions = own.filter((v) => ids.includes(v.id));
  const results = state.results.filter(
    (r) => r.projectId === project.id && ids.includes(r.versionId),
  );
  const remaining = own.filter((v) => !ids.includes(v.id));
  const current = store.currentVersion(state, project.id);
  const next =
    input.mode === "undo"
      ? (remaining.find((v) => v.id === latest.parentId) ?? remaining.at(-1))
      : (remaining.find((v) => v.id === current?.id) ?? remaining.at(-1));
  const result = {
    projectId: project.id,
    mode: input.mode,
    ids: versions.map((v) => v.id),
    resultIds: results.map((r) => r.id),
    nextVersionId: next?.id ?? null,
    datasetCount: versions.length,
    resultCount: results.length,
    sourceFilesPreserved: true,
  };
  return {
    ...result,
    token: fingerprint([
      result,
      own,
      state.results.filter((r) => r.projectId === project.id),
      project.currentVersionId,
    ]),
  };
}

/** Prepared journal + state commit: a crash before commit restores folders, after commit removes trash. */
export async function recoverDeletions(store) {
  const root = join(store.root, "deletions");
  await store.update(async (state) => {
    for (const id of await readdir(root).catch(() => [])) {
      if (!/^[\w-]+$/.test(id)) continue;
      const dir = join(root, id);
      let journal;
      try {
        journal = JSON.parse(await readFile(join(dir, "journal.json"), "utf8"));
      } catch {
        continue;
      }
      if (operationAlive(journal) && journal.pid !== process.pid) continue;
      if (!state.deletedTransactions.includes(id)) {
        for (const item of journal.items) {
          const original =
            item.kind === "version"
              ? store.versionDir(journal.projectId, item.id)
              : store.resultDir(journal.projectId, item.id);
          const moved = join(dir, item.kind + "-" + item.id);
          if ((await exists(moved)) && !(await exists(original)))
            await rename(moved, original);
        }
      }
      await rm(dir, { recursive: true, force: true });
      state.deletedTransactions = state.deletedTransactions.filter(
        (x) => x !== id,
      );
    }
    for (const plan of state.importPlans) {
      if (
        plan.jobId &&
        plan.ownerPid &&
        !operationAlive({ pid: plan.ownerPid }) &&
        !state.jobs.some((j) => j.id === plan.jobId)
      )
        state.jobs.push({
          id: plan.jobId,
          projectId: plan.projectId,
          kind: "import",
          title: "批量导入",
          status: "failed",
          error: "导入进程已中断，本批未发布",
          createdAt: new Date(plan.createdAt).toISOString(),
          finishedAt: new Date().toISOString(),
        });
    }
    for (const job of state.jobs) {
      if (
        job.status === "running" &&
        job.ownerPid &&
        !operationAlive({ pid: job.ownerPid })
      ) {
        job.status = "failed";
        job.error = "执行进程已中断，本任务未完成";
        job.finishedAt = new Date().toISOString();
      }
    }
    state.operations = state.operations.filter(operationAlive);
  });
}

export function createDataManagement(store, invalidate) {
  return {
    previewDeleteData: async (input) =>
      planOf(store, await store.read(), input),
    deleteData: async (input) => {
      const transaction = randomUUID(),
        dir = join(store.root, "deletions", transaction);
      let committed = false;
      try {
        const value = await store.update(async (state) => {
          const plan = planOf(store, state, input);
          if (plan.token !== input.token)
            throw Error("数据或关联结果已变化，请重新确认删除");
          const items = [
            ...plan.ids.map((id) => ({ kind: "version", id })),
            ...plan.resultIds.map((id) => ({ kind: "result", id })),
          ];
          await mkdir(dir, { recursive: true });
          await writeFile(
            join(dir, "journal.json"),
            JSON.stringify({
              projectId: plan.projectId,
              pid: process.pid,
              items,
            }),
            { mode: 0o600 },
          );
          for (const item of items) {
            const from =
              item.kind === "version"
                ? store.versionDir(plan.projectId, item.id)
                : store.resultDir(plan.projectId, item.id);
            if (await exists(from))
              await rename(from, join(dir, item.kind + "-" + item.id));
          }
          state.dataVersions = state.dataVersions.filter(
            (v) => v.projectId !== plan.projectId || !plan.ids.includes(v.id),
          );
          state.results = state.results.filter(
            (r) => !plan.resultIds.includes(r.id),
          );
          state.projects.find((p) => p.id === plan.projectId).currentVersionId =
            plan.nextVersionId;
          for (const handoff of state.handoffs.filter(
            (h) => h.projectId === plan.projectId,
          )) {
            if (plan.ids.includes(handoff.context.dataVersionId))
              handoff.context.dataVersionId = null;
            handoff.context.resultRefs = handoff.context.resultRefs.filter(
              (id) => !plan.resultIds.includes(id),
            );
          }
          state.importPlans = state.importPlans.filter(
            (p) => p.projectId !== plan.projectId || p.jobId,
          );
          state.deletedTransactions.push(transaction);
          return plan;
        });
        committed = true;
        invalidate(value);
        await rm(dir, { recursive: true, force: true });
        await store.update((state) => {
          state.deletedTransactions = state.deletedTransactions.filter(
            (id) => id !== transaction,
          );
        });
        return value;
      } finally {
        if (!committed) await recoverDeletions(store);
      }
    },
    setJobsHidden: (input) => store.setJobsHidden(input),
  };
}
