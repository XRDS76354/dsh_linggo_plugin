import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const SCHEMA = 3;
const LOCK_STALE_MS = 30_000;
const LOCK_WAIT_MS = 10_000;

export function nonempty(value, label, max = 4000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw Error(`Invalid ${label}`);
  return value.trim();
}

function optionalId(value, label) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^[\w-]{1,128}$/.test(value))
    throw Error(`Invalid ${label}`);
  return value;
}

/** Upgrade any readable earlier state to the current schema without losing records. */
export function migrate(state) {
  if (!state || typeof state !== "object") throw Error("Corrupt LingGo state");
  if (state.schema > SCHEMA)
    throw Error("LingGo state was written by a newer plugin version");
  return {
    schema: SCHEMA,
    projects: (state.projects ?? []).map((p) => ({ ...p })),
    handoffs: (state.handoffs ?? []).map((h) => ({
      context: { dataVersionId: null, scenarioId: null, resultRefs: [] },
      sourceSessionId: null,
      devSessionId: null,
      openedAt: null,
      archivedAt: null,
      ...h,
    })),
    dataVersions: state.dataVersions ?? [],
    scenarios: state.scenarios ?? [],
    results: state.results ?? [],
    algorithms: state.algorithms ?? [],
    jobs: state.jobs ?? [],
  };
}

const JOB_HISTORY = 100;

export class Store {
  constructor(root) {
    this.root = root;
    this.tail = Promise.resolve();
  }

  async read() {
    try {
      return migrate(JSON.parse(await readFile(join(this.root, "state.json"), "utf8")));
    } catch (e) {
      if (e.code === "ENOENT") return migrate({});
      throw e;
    }
  }

  /** Cross-process exclusive section: desktop and CLI Hosts may share one DSH home. */
  async locked(fn) {
    await mkdir(this.root, { recursive: true });
    const lock = join(this.root, "state.lock");
    const deadline = Date.now() + LOCK_WAIT_MS;
    for (;;) {
      try {
        const handle = await open(lock, "wx", 0o600);
        await handle.writeFile(JSON.stringify({ pid: process.pid, at: Date.now() }));
        await handle.close();
        break;
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
        const info = await stat(lock).catch(() => undefined);
        if (info && Date.now() - info.mtimeMs > LOCK_STALE_MS) {
          await rm(lock, { force: true });
          continue;
        }
        if (Date.now() > deadline) throw Error("LingGo state is locked by another process");
        await new Promise((r) => setTimeout(r, 25 + Math.random() * 50));
      }
    }
    try {
      return await fn();
    } finally {
      await rm(lock, { force: true });
    }
  }

  update(fn) {
    const run = this.tail.then(() =>
      this.locked(async () => {
        const state = await this.read();
        const value = await fn(state);
        const tmp = join(this.root, `.state-${randomUUID()}.tmp`);
        await writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
        await rename(tmp, join(this.root, "state.json"));
        return value;
      }),
    );
    this.tail = run.catch(() => {});
    return run;
  }

  projectDir(id, mode) {
    return join(this.root, "projects", id, mode);
  }

  async createProject(input) {
    const name = nonempty(input?.name, "project name", 100);
    return this.update(async (state) => {
      const project = { id: randomUUID(), name, createdAt: new Date().toISOString() };
      for (const mode of ["presentation", "development"])
        await mkdir(this.projectDir(project.id, mode), { recursive: true });
      state.projects.push(project);
      return project;
    });
  }

  /** Validate that every reference names an existing record of the same project. */
  context(state, projectId, input = {}) {
    const dataVersionId = optionalId(input.dataVersionId, "data version");
    const scenarioId = optionalId(input.scenarioId, "scenario");
    const resultRefs = input.resultRefs ?? [];
    if (!Array.isArray(resultRefs) || resultRefs.length > 50) throw Error("Invalid result references");
    const owned = (list, id) => list.some((r) => r.id === id && r.projectId === projectId);
    if (dataVersionId && !owned(state.dataVersions, dataVersionId)) throw Error("Unknown data version");
    if (scenarioId && !owned(state.scenarios, scenarioId)) throw Error("Unknown scenario");
    for (const ref of resultRefs)
      if (!owned(state.results, optionalId(ref, "result reference"))) throw Error("Unknown result");
    return { dataVersionId, scenarioId, resultRefs: [...resultRefs] };
  }

  async createHandoff(input) {
    const summary = nonempty(input?.summary, "handoff summary");
    return this.update((state) => {
      if (!state.projects.some((p) => p.id === input.projectId)) throw Error("Unknown project");
      const handoff = {
        id: randomUUID(),
        projectId: input.projectId,
        summary,
        context: this.context(state, input.projectId, input.context),
        sourceSessionId: optionalId(input.sourceSessionId, "source session"),
        devSessionId: null,
        createdAt: new Date().toISOString(),
        openedAt: null,
        archivedAt: null,
      };
      state.handoffs.push(handoff);
      return handoff;
    });
  }

  /** Record the development Session that received the draft; repeated opens keep the first one. */
  async markHandoffOpened(input) {
    const devSessionId = optionalId(input?.devSessionId, "development session");
    if (!devSessionId) throw Error("Invalid development session");
    return this.update((state) => {
      const item = state.handoffs.find((h) => h.id === input.id);
      if (!item) throw Error("Unknown handoff");
      item.devSessionId = devSessionId;
      item.openedAt ??= new Date().toISOString();
      return item;
    });
  }

  versionDir(projectId, versionId) {
    return join(this.root, "projects", projectId, "data", "versions", versionId);
  }

  stagingDir(projectId, jobId) {
    return join(this.root, "projects", projectId, "data", "staging", jobId);
  }

  /** The version the project currently shows: the selected one, else the newest. */
  currentVersion(state, projectId) {
    const project = state.projects.find((p) => p.id === projectId);
    const own = state.dataVersions.filter((v) => v.projectId === projectId);
    return own.find((v) => v.id === project?.currentVersionId) ?? own.at(-1);
  }

  async addDataVersion(version) {
    return this.update((state) => {
      const project = state.projects.find((p) => p.id === version.projectId);
      if (!project) throw Error("Unknown project");
      state.dataVersions.push(version);
      project.currentVersionId = version.id;
      return version;
    });
  }

  async selectVersion(input) {
    return this.update((state) => {
      const project = state.projects.find((p) => p.id === input?.projectId);
      if (!project) throw Error("Unknown project");
      if (!state.dataVersions.some((v) => v.id === input.versionId && v.projectId === project.id))
        throw Error("Unknown data version");
      project.currentVersionId = input.versionId;
      return project;
    });
  }

  resultDir(projectId, runId) {
    return join(this.root, "projects", projectId, "results", runId);
  }

  resultStaging(projectId, key) {
    return join(this.root, "projects", projectId, "results", ".staging", key);
  }

  algorithmFile(projectId, algorithmId) {
    return join(this.root, "projects", projectId, "algorithms", `${algorithmId}.py`);
  }

  async addResult(result) {
    return this.update((state) => {
      if (!state.projects.some((p) => p.id === result.projectId)) throw Error("Unknown project");
      state.results.push(result);
      return result;
    });
  }

  async addAlgorithm(algorithm) {
    return this.update((state) => {
      if (!state.projects.some((p) => p.id === algorithm.projectId)) throw Error("Unknown project");
      state.algorithms.push(algorithm);
      return algorithm;
    });
  }

  async removeAlgorithm(input) {
    return this.update((state) => {
      const item = state.algorithms.find((a) => a.id === input?.id && a.projectId === input?.projectId);
      if (!item) throw Error("Unknown algorithm");
      state.algorithms = state.algorithms.filter((a) => a !== item);
      return item;
    });
  }

  /** Keep finished jobs for history; running jobs live in memory only. */
  async recordJob(job) {
    return this.update((state) => {
      state.jobs = [...state.jobs.filter((j) => j.id !== job.id), job].slice(-JOB_HISTORY);
      return job;
    });
  }

  async archiveHandoff(input) {
    return this.update((state) => {
      const item = state.handoffs.find((h) => h.id === input?.id);
      if (!item) throw Error("Unknown handoff");
      item.archivedAt ??= new Date().toISOString();
      return item;
    });
  }
}
