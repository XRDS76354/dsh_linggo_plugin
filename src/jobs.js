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

  start({ projectId, kind, title, run, cleanup, id = randomUUID(), lease }) {
    const controller = new AbortController();
    const job = {
      id,
      ...(lease ? { ownerPid: process.pid } : {}),
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
    const entry = { job, controller };
    this.running.set(job.id, entry);
    const progress = (value, message) => {
      job.progress = Math.max(job.progress, Math.min(1, Number(value) || 0));
      if (message) job.message = message;
    };
    entry.completion = (async () => {
      let terminalStatus;
      try {
        if (lease) await this.store.recordJob(job);
        job.result = await run(controller.signal, progress);
        terminalStatus = "done";
        job.progress = 1;
      } catch (error) {
        terminalStatus = controller.signal.aborted ? "cancelled" : "failed";
        job.error = controller.signal.aborted
          ? null
          : String(error?.message ?? error);
        await cleanup?.().catch(() => {});
      } finally {
        job.finishedAt = new Date().toISOString();
        // Record before leaving the live set so a listing never misses the job.
        const finished = { ...job, status: terminalStatus };
        if (lease) await this.store.releaseOperation(lease).catch(() => {});
        await this.store.recordJob(finished).catch(() => {});
        Object.assign(job, finished);
        this.running.delete(job.id);
      }
    })();
    return job;
  }

  async startLocked(options) {
    const id = await this.store.claimOperation(
      options.projectId,
      options.kind,
      options.id,
    );
    try {
      return this.start({ ...options, id, lease: id });
    } catch (error) {
      await this.store.releaseOperation(id);
      throw error;
    }
  }

  async list(projectId, includeHidden = false) {
    const state = await this.store.read();
    const live = [...this.running.values()].map((r) => r.job);
    const ids = new Set(live.map((j) => j.id));
    return [...state.jobs.filter((j) => !ids.has(j.id)), ...live]
      .filter((j) => j.projectId === projectId && (includeHidden || !j.hidden))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  cancel(id) {
    const entry = this.running.get(id);
    if (!entry) throw Error("任务不在运行中");
    entry.controller.abort(Error("Cancelled"));
    return entry.job;
  }

  /** Abort everything when the plugin stops; cleanups remove staging output. */
  async dispose() {
    const entries = [...this.running.values()];
    for (const { controller } of entries)
      controller.abort(Error("Plugin stopped"));
    await Promise.allSettled(entries.map((e) => e.completion));
  }
}
