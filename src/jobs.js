import { randomUUID } from "node:crypto";

/**
 * Background jobs. A job only starts after the user confirmed it in the workbench;
 * cancelling aborts the worker and runs the job's cleanup.
 */
export class Jobs {
  constructor(store) {
    this.store = store;
    this.running = new Map();
  }

  start({ projectId, kind, title, run, cleanup }) {
    const controller = new AbortController();
    const job = {
      id: randomUUID(),
      projectId,
      kind,
      title,
      status: "running",
      progress: 0,
      message: "",
      createdAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
      result: null,
    };
    this.running.set(job.id, { job, controller });
    const progress = (value, message) => {
      job.progress = Math.max(job.progress, Math.min(1, Number(value) || 0));
      if (message) job.message = message;
    };
    (async () => {
      try {
        job.result = await run(controller.signal, progress);
        job.status = "done";
        job.progress = 1;
      } catch (error) {
        job.status = controller.signal.aborted ? "cancelled" : "failed";
        job.error = controller.signal.aborted ? null : String(error?.message ?? error);
        await cleanup?.().catch(() => {});
      } finally {
        job.finishedAt = new Date().toISOString();
        // Record before leaving the live set so a listing never misses the job.
        await this.store.recordJob(job).catch(() => {});
        this.running.delete(job.id);
      }
    })();
    return job;
  }

  async list(projectId) {
    const state = await this.store.read();
    const live = [...this.running.values()].map((r) => r.job);
    const ids = new Set(live.map((j) => j.id));
    return [...state.jobs.filter((j) => !ids.has(j.id)), ...live]
      .filter((j) => j.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  cancel(id) {
    const entry = this.running.get(id);
    if (!entry) throw Error("任务不在运行中");
    entry.controller.abort(Error("Cancelled"));
    return entry.job;
  }

  /** Abort everything when the plugin stops; cleanups remove staging output. */
  dispose() {
    for (const { controller } of this.running.values()) controller.abort(Error("Plugin stopped"));
  }
}
