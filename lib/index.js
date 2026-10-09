// src/index.js
import { createHmac as createHmac2, randomBytes as randomBytes2 } from "node:crypto";
import { mkdir as mkdir3, readdir, readFile as readFile3, rename as rename3, rm as rm3, writeFile as writeFile3 } from "node:fs/promises";
import { homedir } from "node:os";
import { join as join4 } from "node:path";
import { defineTool as defineTool2 } from "@deepseek-ai/dsh-tools";

// src/store.js
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
var SCHEMA = 3;
var LOCK_STALE_MS = 3e4;
var LOCK_WAIT_MS = 1e4;
function nonempty(value, label, max = 4e3) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw Error(`Invalid ${label}`);
  return value.trim();
}
function optionalId(value, label) {
  if (value === void 0 || value === null) return null;
  if (typeof value !== "string" || !/^[\w-]{1,128}$/.test(value))
    throw Error(`Invalid ${label}`);
  return value;
}
function migrate(state) {
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
      ...h
    })),
    dataVersions: state.dataVersions ?? [],
    scenarios: state.scenarios ?? [],
    results: state.results ?? [],
    algorithms: state.algorithms ?? [],
    jobs: state.jobs ?? []
  };
}
var JOB_HISTORY = 100;
var Store = class {
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
    for (; ; ) {
      try {
        const handle = await open(lock, "wx", 384);
        await handle.writeFile(JSON.stringify({ pid: process.pid, at: Date.now() }));
        await handle.close();
        break;
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
        const info = await stat(lock).catch(() => void 0);
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
    const run = this.tail.then(
      () => this.locked(async () => {
        const state = await this.read();
        const value = await fn(state);
        const tmp = join(this.root, `.state-${randomUUID()}.tmp`);
        await writeFile(tmp, JSON.stringify(state, null, 2), { mode: 384 });
        await rename(tmp, join(this.root, "state.json"));
        return value;
      })
    );
    this.tail = run.catch(() => {
    });
    return run;
  }
  projectDir(id, mode) {
    return join(this.root, "projects", id, mode);
  }
  async createProject(input) {
    const name2 = nonempty(input?.name, "project name", 100);
    return this.update(async (state) => {
      const project = { id: randomUUID(), name: name2, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
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
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        openedAt: null,
        archivedAt: null
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
      item.openedAt ??= (/* @__PURE__ */ new Date()).toISOString();
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
      item.archivedAt ??= (/* @__PURE__ */ new Date()).toISOString();
      return item;
    });
  }
};

// src/jobs.js
import { randomUUID as randomUUID2 } from "node:crypto";
var Jobs = class {
  constructor(store) {
    this.store = store;
    this.running = /* @__PURE__ */ new Map();
  }
  start({ projectId, kind, title, run, cleanup }) {
    const controller = new AbortController();
    const job = {
      id: randomUUID2(),
      projectId,
      kind,
      title,
      status: "running",
      progress: 0,
      message: "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      finishedAt: null,
      error: null,
      result: null
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
        await cleanup?.().catch(() => {
        });
      } finally {
        job.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
        await this.store.recordJob(job).catch(() => {
        });
        this.running.delete(job.id);
      }
    })();
    return job;
  }
  async list(projectId) {
    const state = await this.store.read();
    const live = [...this.running.values()].map((r) => r.job);
    const ids = new Set(live.map((j) => j.id));
    return [...state.jobs.filter((j) => !ids.has(j.id)), ...live].filter((j) => j.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  cancel(id) {
    const entry = this.running.get(id);
    if (!entry) throw Error("\u4EFB\u52A1\u4E0D\u5728\u8FD0\u884C\u4E2D");
    entry.controller.abort(Error("Cancelled"));
    return entry.job;
  }
  /** Abort everything when the plugin stops; cleanups remove staging output. */
  dispose() {
    for (const { controller } of this.running.values()) controller.abort(Error("Plugin stopped"));
  }
};

// src/worker.js
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join as join2 } from "node:path";
import { fileURLToPath } from "node:url";
var PYTHON_DIR = fileURLToPath(new URL("../python", import.meta.url));
var ENV_KEEP = ["PATH", "HOME", "USERPROFILE", "LANG", "LC_ALL", "TMPDIR", "TEMP", "TMP", "SYSTEMROOT", "PROJ_DATA", "PROJ_LIB"];
function resolvePython(root, configured) {
  if (configured) return configured;
  const venv = process.platform === "win32" ? join2(root, "venv", "Scripts", "python.exe") : join2(root, "venv", "bin", "python");
  if (existsSync(venv)) return venv;
  return process.platform === "win32" ? "python" : "python3";
}
function runWorker({ python, request, signal, onProgress, timeoutMs = 30 * 6e4 }) {
  return new Promise((resolve2, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? Error("Cancelled"));
    const env = { PYTHONPATH: PYTHON_DIR, PYTHONIOENCODING: "utf-8", PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1" };
    for (const key of ENV_KEEP) if (process.env[key]) env[key] = process.env[key];
    let child;
    try {
      child = spawn(python, ["-m", "linggo_data"], { env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    } catch (error) {
      return reject(error);
    }
    let buffer = "";
    let stderr = "";
    let result;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      fn(value);
    };
    const kill = () => {
      child.kill("SIGTERM");
      setTimeout(() => child.exitCode === null && child.kill("SIGKILL"), 3e3).unref();
    };
    const abort = () => {
      kill();
      finish(reject, signal.reason ?? Error("Cancelled"));
    };
    const timer = setTimeout(() => {
      kill();
      finish(reject, Error("\u6570\u636E\u5904\u7406\u8D85\u65F6"));
    }, timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    child.on(
      "error",
      (error) => finish(reject, error.code === "ENOENT" ? Error(`\u627E\u4E0D\u5230 Python\uFF1A${python}\u3002\u8BF7\u5148\u521D\u59CB\u5316\u63D2\u4EF6 Python \u73AF\u5883\u3002`) : error)
    );
    child.stdout.setEncoding("utf8");
    const receive = (line) => {
      if (settled || !line.trim()) return;
      let event;
      try {
        event = JSON.parse(line);
        if (!event || typeof event !== "object" || Array.isArray(event)) throw Error("Invalid event");
      } catch {
        kill();
        finish(reject, Error("\u6570\u636E\u8FDB\u7A0B\u534F\u8BAE\u9519\u8BEF\uFF1A\u8F93\u51FA\u4E0D\u662F\u5408\u6CD5 JSON \u4E8B\u4EF6\u3002\u8BF7\u68C0\u67E5 Python \u6570\u636E\u6A21\u5757\u6216\u81EA\u5B9A\u4E49\u7B97\u6CD5\u7684\u6807\u51C6\u8F93\u51FA\u3002"));
        return;
      }
      if (event.event === "progress") onProgress?.(event.value, event.message);
      else if (event.event === "result") result = event;
    };
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let i;
      while ((i = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        receive(line);
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-4e3);
    });
    child.on("close", (code) => {
      receive(buffer);
      if (result?.ok) return finish(resolve2, result.value);
      if (result) return finish(reject, Error(result.error));
      const missing = /No module named '?([\w.]+)/.exec(stderr);
      if (missing) return finish(reject, Error(`Python \u7F3A\u5C11\u6A21\u5757 ${missing[1]}\u3002\u8BF7\u5148\u521D\u59CB\u5316\u63D2\u4EF6 Python \u73AF\u5883\u3002`));
      finish(reject, Error(`\u6570\u636E\u8FDB\u7A0B\u5F02\u5E38\u9000\u51FA\uFF08${code}\uFF09\uFF1A${stderr.trim().split("\n").at(-1) ?? ""}`));
    });
    child.stdin.on("error", (error) => {
      if (error.code !== "EPIPE") finish(reject, error);
    });
    child.stdin.end(JSON.stringify(request));
  });
}

// src/policy.js
import { realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
var PRESENTATION_TOOLS = [
  "linggo_status",
  "linggo_query",
  "linggo_map",
  "linggo_algorithms",
  "linggo_propose_run",
  "linggo_results",
  "skill"
];
var folded = process.platform === "darwin" || process.platform === "win32";
function forms(path) {
  const out = /* @__PURE__ */ new Set([resolve(path)]);
  try {
    out.add(realpathSync.native(path));
  } catch {
  }
  return [...out].map((p) => folded ? p.toLowerCase() : p);
}
function presentationOf(root, cwd) {
  if (typeof cwd !== "string" || !isAbsolute(cwd)) return;
  for (const base of forms(root))
    for (const target of forms(cwd)) {
      const rel = relative(base, target);
      if (!rel || rel.startsWith("..") || isAbsolute(rel)) continue;
      const parts = rel.split(sep);
      if (parts[0] === "presentation") return { projectId: null };
      if (parts[0] === "projects" && parts[1] && parts[2] === "presentation")
        return { projectId: parts[1] };
    }
}
function isPresentationDirectory(root, cwd) {
  return presentationOf(root, cwd) !== void 0;
}
function toolDenial(root, execution) {
  if (!isPresentationDirectory(root, execution.agent?.session?.header?.cwd))
    return;
  if (!PRESENTATION_TOOLS.includes(execution.name))
    return "LingGo presentation sessions may only use registered transit tools. Open a development session for coding.";
}

// src/analysis.js
import { createHash, createHmac, randomBytes } from "node:crypto";
import { mkdir as mkdir2, readFile as readFile2, rename as rename2, rm as rm2, stat as stat2, writeFile as writeFile2 } from "node:fs/promises";
import { extname, join as join3 } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
var MAX_SOURCE = 256 * 1024;
var MAX_BATCH = 10;
var PROPOSAL_HISTORY = 50;
var ENTITY_LABELS = {
  stops: "\u7AD9\u70B9",
  routes: "\u7EBF\u8DEF\u4E0E\u65B9\u5411",
  route_stops: "\u7EBF\u8DEF\u7AD9\u5E8F",
  trips: "\u65F6\u523B\u8868",
  ridership: "\u5206\u65F6\u6BB5\u5BA2\u6D41",
  od: "OD",
  demand: "\u9010\u7B14\u9700\u6C42",
  gps: "\u8F66\u8F86 GPS",
  vehicles: "\u8F66\u8F86",
  depots: "\u8F66\u573A"
};
var USER_CODE_WARNING = "\u8FD9\u662F\u7528\u6237\u6CE8\u518C\u7684 Python \u4EE3\u7801\uFF1A\u63A5\u53E3\u4E0E\u7ED3\u679C\u6821\u9A8C\u4E0D\u7B49\u4E8E\u4EE3\u7801\u5B89\u5168\uFF0C\u5B83\u5C06\u4EE5\u4F60\u7684\u7528\u6237\u6743\u9650\u5728\u672C\u673A\u8FD0\u884C\uFF0C\u6CA1\u6709\u6C99\u7BB1\u3002";
var json = { schema: { type: "json" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] };
function cleanParams(meta, input) {
  const params = input ?? {};
  if (typeof params !== "object" || Array.isArray(params)) throw Error("\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61");
  const unknown = Object.keys(params).filter((k) => !(k in meta.params));
  if (unknown.length) throw Error(`\u672A\u77E5\u53C2\u6570\uFF1A${unknown.join("\u3001")}`);
  const out = {};
  for (const [name2, spec] of Object.entries(meta.params)) {
    const value = params[name2] ?? spec.default;
    if (spec.type === "boolean") {
      if (typeof value !== "boolean") throw Error(`\u53C2\u6570 ${name2} \u5E94\u4E3A\u5E03\u5C14\u503C`);
    } else if (spec.type === "integer" || spec.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value) || spec.type === "integer" && !Number.isInteger(value))
        throw Error(`\u53C2\u6570 ${name2} \u5E94\u4E3A${spec.type === "integer" ? "\u6574\u6570" : "\u6570\u503C"}`);
      if (spec.min !== void 0 && value < spec.min || spec.max !== void 0 && value > spec.max)
        throw Error(`\u53C2\u6570 ${name2} \u5E94\u5728 ${spec.min}\u2013${spec.max} \u4E4B\u95F4`);
    } else if (spec.type === "enum") {
      if (!spec.options.includes(value)) throw Error(`\u53C2\u6570 ${name2} \u5E94\u4E3A ${spec.options.join("/")} \u4E4B\u4E00`);
    } else if (typeof value !== "string" || value.length > 500) throw Error(`\u53C2\u6570 ${name2} \u5E94\u4E3A\u4E0D\u8D85\u8FC7 500 \u5B57\u7684\u5B57\u7B26\u4E32`);
    out[name2] = value;
  }
  return out;
}
function createAnalysis({ store, jobs, worker, scopeOf, requireProject }) {
  const secret = randomBytes(32);
  const proposals = [];
  let builtins;
  const listBuiltins = async () => {
    builtins ??= worker({ cmd: "algorithms" }, { timeoutMs: 6e4 }).catch((error) => {
      builtins = void 0;
      throw error;
    });
    return builtins;
  };
  const algorithmsOf = async (state, projectId) => [
    ...(await listBuiltins()).map((m) => ({ ...m, source: "builtin" })),
    ...state.algorithms.filter((a) => a.projectId === projectId).map((a) => ({ ...a.meta, id: a.id, source: "user", sha256: a.sha256, originalPath: a.originalPath, registeredAt: a.registeredAt }))
  ];
  const resolve2 = async (state, projectId, algorithmId) => {
    const found = (await algorithmsOf(state, projectId)).find((a) => a.id === algorithmId);
    if (!found) throw Error(`\u672A\u77E5\u7B97\u6CD5\uFF1A${algorithmId}`);
    return found;
  };
  const readSource = async (path) => {
    if (typeof path !== "string" || !path.trim() || extname(path) !== ".py") throw Error("\u8BF7\u63D0\u4F9B .py \u7B97\u6CD5\u6587\u4EF6\u7684\u672C\u673A\u8DEF\u5F84");
    const info = await stat2(path);
    if (!info.isFile() || info.size > MAX_SOURCE) throw Error("\u7B97\u6CD5\u6587\u4EF6\u9700\u4E3A\u4E0D\u8D85\u8FC7 256 KB \u7684\u666E\u901A\u6587\u4EF6");
    const bytes = await readFile2(path);
    return { path, bytes, sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length };
  };
  const token = (parts) => createHmac("sha256", secret).update(JSON.stringify(parts)).digest("hex");
  const plan = async (input) => {
    const state = await store.read();
    const project = requireProject(state, input.projectId);
    const version = store.currentVersion(state, project.id);
    if (!version) throw Error("\u5F53\u524D\u9879\u76EE\u8FD8\u6CA1\u6709\u6570\u636E\u7248\u672C\uFF0C\u8BF7\u5148\u5BFC\u5165\u6570\u636E");
    const algorithm = await resolve2(state, project.id, input.algorithmId);
    const sets = input.paramSets ?? [input.params ?? {}];
    if (!Array.isArray(sets) || !sets.length || sets.length > MAX_BATCH) throw Error(`\u4E00\u6B21\u6700\u591A\u8FD0\u884C ${MAX_BATCH} \u7EC4\u53C2\u6570`);
    const paramSets = sets.map((p) => cleanParams(algorithm, p));
    const inputs = algorithm.inputs.map((i) => ({ ...i, label: ENTITY_LABELS[i.entity] ?? i.entity, rows: version.entities?.[i.entity]?.rows ?? 0 }));
    const blocking = inputs.filter((i) => i.required && !i.rows).map((i) => `\u7F3A\u5C11\u5FC5\u9700\u6570\u636E\uFF1A${i.label}`);
    const warnings = [];
    if (algorithm.source === "user") warnings.push(USER_CODE_WARNING);
    if (paramSets.some((p) => p.demand_source === "synthetic")) warnings.push("\u9700\u6C42\u4E3A\u6309\u79CD\u5B50\u751F\u6210\u7684\u5B9E\u9A8C\u6570\u636E\uFF0C\u7ED3\u679C\u4F1A\u6807\u8BB0\u4E3A\u5B9E\u9A8C\uFF0C\u4E0D\u4EE3\u8868\u89C2\u6D4B\u9700\u6C42\u3002");
    return { project, version, algorithm, paramSets, inputs, blocking, warnings };
  };
  const startRun = async (input) => {
    const p = await plan(input);
    if (p.blocking.length) throw Error(p.blocking.join("\uFF1B"));
    if (input.previewToken !== token([p.project.id, p.version.id, p.algorithm.id, p.algorithm.sha256 ?? null, p.paramSets]))
      throw Error("\u8BF7\u5148\u9884\u89C8\u5F53\u524D\u7B97\u6CD5\u548C\u53C2\u6570\uFF0C\u518D\u786E\u8BA4\u8FD0\u884C");
    const proposal = proposals.find((x) => x.id === input.proposalId && x.projectId === p.project.id);
    let staging;
    const job = jobs.start({
      projectId: p.project.id,
      kind: "run",
      title: `${p.algorithm.name}${p.paramSets.length > 1 ? ` \xD7 ${p.paramSets.length}` : ""}`,
      run: async (signal, progress) => {
        const runs = [];
        for (const [index, params] of p.paramSets.entries()) {
          staging = store.resultStaging(p.project.id, randomBytes(8).toString("hex"));
          const algorithm = p.algorithm.source === "builtin" ? { builtin: p.algorithm.id } : { path: store.algorithmFile(p.project.id, p.algorithm.id), sha256: p.algorithm.sha256 };
          const value = await worker(
            { cmd: "run", algorithm, versionDir: store.versionDir(p.project.id, p.version.id), params, resultDir: staging },
            { signal, onProgress: (v, m) => progress((index + v) / p.paramSets.length, m) }
          );
          signal.throwIfAborted();
          const id = randomBytes(8).toString("hex");
          const final = store.resultDir(p.project.id, id);
          await rename2(staging, final);
          staging = void 0;
          try {
            await store.addResult({
              id,
              projectId: p.project.id,
              versionId: p.version.id,
              algorithmId: p.algorithm.id,
              algorithmName: p.algorithm.name,
              algorithmSource: p.algorithm.source,
              sha256: p.algorithm.sha256 ?? null,
              kind: value.kind,
              params,
              summary: value.summary,
              validation: value.validation,
              synthetic: value.synthetic,
              batch: p.paramSets.length > 1 ? { index, size: p.paramSets.length } : null,
              proposalId: proposal?.id ?? null,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (error) {
            await rm2(final, { recursive: true, force: true });
            throw error;
          }
          runs.push(id);
        }
        return { runs };
      },
      cleanup: () => staging ? rm2(staging, { recursive: true, force: true }) : Promise.resolve()
    });
    if (proposal) proposal.status = "started";
    return job;
  };
  const ops = {
    algorithms: async (input) => {
      const state = await store.read();
      requireProject(state, input.projectId);
      return algorithmsOf(state, input.projectId);
    },
    algorithmSource: async (input) => {
      requireProject(await store.read(), input.projectId);
      const s = await readSource(input.path);
      return { path: s.path, sha256: s.sha256, size: s.size, source: s.bytes.toString("utf8"), warning: USER_CODE_WARNING };
    },
    registerAlgorithm: async (input) => {
      const state = await store.read();
      const project = requireProject(state, input.projectId);
      const s = await readSource(input.path);
      if (input.sha256 !== s.sha256) throw Error("\u6587\u4EF6\u5728\u67E5\u770B\u540E\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u67E5\u770B\u6E90\u4EE3\u7801");
      const id = randomBytes(8).toString("hex");
      const file = store.algorithmFile(project.id, id);
      await mkdir2(join3(file, ".."), { recursive: true });
      await writeFile2(file, s.bytes, { mode: 384 });
      try {
        const meta = await worker({ cmd: "algorithms", path: file, sha256: s.sha256 }, { timeoutMs: 6e4 });
        return await store.addAlgorithm({ id, projectId: project.id, meta, sha256: s.sha256, originalPath: s.path, registeredAt: (/* @__PURE__ */ new Date()).toISOString() });
      } catch (error) {
        await rm2(file, { force: true });
        throw error;
      }
    },
    removeAlgorithm: async (input) => {
      const item = await store.removeAlgorithm(input);
      await rm2(store.algorithmFile(item.projectId, item.id), { force: true });
      return { removed: true };
    },
    previewRun: async (input) => {
      const p = await plan(input);
      return {
        algorithm: p.algorithm,
        versionId: p.version.id,
        paramSets: p.paramSets,
        inputs: p.inputs,
        blocking: p.blocking,
        warnings: p.warnings,
        previewToken: p.blocking.length ? null : token([p.project.id, p.version.id, p.algorithm.id, p.algorithm.sha256 ?? null, p.paramSets])
      };
    },
    startRun,
    runs: async (input) => {
      const state = await store.read();
      requireProject(state, input.projectId);
      return state.results.filter((r) => r.projectId === input.projectId).reverse();
    },
    runResult: async (input) => {
      const state = await store.read();
      const run = state.results.find((r) => r.id === input.runId && r.projectId === input.projectId);
      if (!run) throw Error("Unknown result");
      return { run, result: JSON.parse(await readFile2(join3(store.resultDir(run.projectId, run.id), "result.json"), "utf8")) };
    },
    proposals: async (input) => proposals.filter((x) => x.projectId === input.projectId && x.status === "pending"),
    dismissProposal: async (input) => {
      const item = proposals.find((x) => x.id === input.id);
      if (!item) throw Error("Unknown proposal");
      item.status = "dismissed";
      return item;
    }
  };
  const tools = [
    defineTool({
      name: "linggo_algorithms",
      description: "List the scheduling algorithms available in the current project (built-in DRT insertion, fleet assignment, trip generation, and user-registered Python algorithms) with their inputs and parameter specs.",
      parameters: {},
      output: json,
      execute: async (_args, exec) => {
        const { state, project, version } = await scopeOf(exec);
        if (!project) return { available: false, message: "\u4E0D\u5728 LingGo \u5C55\u793A\u4F1A\u8BDD\u4E2D" };
        const list = await algorithmsOf(state, project.id);
        return {
          dataVersionId: version?.id ?? null,
          algorithms: list.map((a) => ({
            id: a.id,
            name: a.name,
            kind: a.kind,
            source: a.source,
            description: a.description,
            inputs: a.inputs.map((i) => ({ ...i, rows: version?.entities?.[i.entity]?.rows ?? 0 })),
            params: a.params
          }))
        };
      }
    }),
    defineTool({
      name: "linggo_propose_run",
      description: "Propose running one algorithm (or a batch of up to 10 parameter sets) on the current data version. This does NOT run anything: the proposal appears in the workbench, where the user previews, confirms or dismisses it. Afterwards read results with linggo_results.",
      parameters: {
        algorithm: { type: "string", description: "Algorithm id from linggo_algorithms.", required: true },
        params: { type: "object", description: "Parameter values; omitted ones use defaults.", additionalProperties: true },
        batch: { type: "array", description: "Several parameter sets for a comparison; overrides params.", items: { type: "object", additionalProperties: true } },
        reason: { type: "string", description: "One sentence for the user: why this run." }
      },
      output: json,
      execute: async (args, exec) => {
        const { state, project, version } = await scopeOf(exec);
        if (!project) return { ok: false, message: "\u4E0D\u5728 LingGo \u5C55\u793A\u4F1A\u8BDD\u4E2D" };
        if (!version) return { ok: false, message: "\u5F53\u524D\u9879\u76EE\u8FD8\u6CA1\u6709\u6570\u636E\u7248\u672C" };
        try {
          const algorithm = await resolve2(state, project.id, args.algorithm);
          const sets = args.batch?.length ? args.batch : [args.params ?? {}];
          if (sets.length > MAX_BATCH) throw Error(`\u4E00\u6B21\u6700\u591A ${MAX_BATCH} \u7EC4\u53C2\u6570`);
          const paramSets = sets.map((p) => cleanParams(algorithm, p));
          const item = {
            id: randomBytes(6).toString("hex"),
            projectId: project.id,
            versionId: version.id,
            sessionId: exec?.agent?.sessionId ?? null,
            algorithmId: algorithm.id,
            algorithmName: algorithm.name,
            paramSets,
            reason: typeof args.reason === "string" ? args.reason.slice(0, 300) : "",
            status: "pending",
            at: (/* @__PURE__ */ new Date()).toISOString()
          };
          proposals.push(item);
          if (proposals.length > PROPOSAL_HISTORY) proposals.shift();
          return { ok: true, proposalId: item.id, status: "pending", message: "\u5DF2\u63D0\u4EA4\u5230\u5DE5\u4F5C\u53F0\u201C\u5206\u6790\u201D\u9875\uFF0C\u7B49\u5F85\u7528\u6237\u9884\u89C8\u5E76\u786E\u8BA4\uFF1B\u7528\u6237\u786E\u8BA4\u524D\u4E0D\u4F1A\u8FD0\u884C\u3002" };
        } catch (error) {
          return { ok: false, message: error.message };
        }
      }
    }),
    defineTool({
      name: "linggo_results",
      description: "Read algorithm results of the current project. Without run_id: the latest runs with key indicators. With run_id: indicators, constraint validation, assumptions and the main gaps or rejections.",
      parameters: { run_id: { type: "string", description: "Result id from the list." } },
      output: json,
      execute: async (args, exec) => {
        const { state, project } = await scopeOf(exec);
        if (!project) return { available: false, message: "\u4E0D\u5728 LingGo \u5C55\u793A\u4F1A\u8BDD\u4E2D" };
        const own = state.results.filter((r) => r.projectId === project.id);
        if (!args.run_id)
          return {
            runs: own.slice(-20).reverse().map((r) => ({
              runId: r.id,
              algorithm: r.algorithmName,
              kind: r.kind,
              createdAt: r.createdAt,
              dataVersionId: r.versionId,
              synthetic: r.synthetic,
              valid: r.validation?.ok,
              summary: r.summary,
              params: r.params
            }))
          };
        const run = own.find((r) => r.id === args.run_id);
        if (!run) return { available: false, message: `\u6CA1\u6709\u7ED3\u679C ${args.run_id}` };
        const result = JSON.parse(await readFile2(join3(store.resultDir(project.id, run.id), "result.json"), "utf8"));
        const detail = run.kind === "drt" ? { rejected: result.requests?.filter((r) => !r.served).slice(0, 10) } : run.kind === "fleet" ? { unassigned: result.unassigned?.slice(0, 10), longestBlocks: [...result.blocks ?? []].sort((a, b) => b.trips.length - a.trips.length).slice(0, 5).map((b) => ({ vehicle: b.vehicle_id, trips: b.trips.length, start: b.start, end: b.end })) } : run.kind === "tripgen" ? { gaps: result.gaps?.slice(0, 20), headways: result.headways?.slice(0, 30) } : {};
        return {
          runId: run.id,
          algorithm: run.algorithmName,
          kind: run.kind,
          dataVersionId: run.versionId,
          synthetic: run.synthetic,
          params: run.params,
          summary: result.summary,
          assumptions: result.assumptions,
          validation: { ...result.validation, violations: result.validation?.violations?.slice(0, 10) },
          ...detail
        };
      }
    })
  ];
  const showRun = async (project, runId) => {
    const state = await store.read();
    const run = state.results.find((r) => r.id === runId && r.projectId === project.id);
    if (!run) return null;
    return { runId: run.id, name: run.algorithmName, kind: run.kind };
  };
  return { ops, tools, showRun };
}
async function removeResultLeftovers(store) {
  const { readdir: readdir2 } = await import("node:fs/promises");
  const state = await store.read();
  const known = new Set(state.results.map((r) => `${r.projectId}/${r.id}`));
  for (const project of state.projects) {
    const dir = join3(store.root, "projects", project.id, "results");
    await rm2(join3(dir, ".staging"), { recursive: true, force: true });
    for (const id of await readdir2(dir).catch(() => []))
      if (!known.has(`${project.id}/${id}`)) await rm2(join3(dir, id), { recursive: true, force: true });
  }
}

// src/skills.js
import { readFileSync } from "node:fs";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var SKILLS = [
  ["linggo-data-import", "LingGo \u5BFC\u5165\u5411\u5BFC\uFF1A\u6570\u636E\u7C7B\u578B\u3001\u5B57\u6BB5\u6620\u5C04\u3001\u5750\u6807\u7CFB\u3001\u9884\u89C8\u4E0E\u6570\u636E\u7248\u672C", "\u7528\u6237\u95EE\u600E\u4E48\u5BFC\u5165\u6216\u51C6\u5907\u516C\u4EA4\u6570\u636E\uFF0C\u6216\u7F3A\u5C11\u67D0\u7C7B\u6570\u636E\u65F6"],
  ["linggo-network-analysis", "LingGo \u7EBF\u7F51\u67E5\u8BE2\u4E0E\u5730\u56FE\u64CD\u4F5C\u7684\u505A\u6CD5", "\u56DE\u7B54\u7EBF\u8DEF\u3001\u7AD9\u70B9\u3001\u73ED\u6B21\u7B49\u67E5\u8BE2\u95EE\u9898\u6216\u64CD\u4F5C\u5730\u56FE\u65F6"],
  ["linggo-drt", "LingGo DRT \u52A8\u6001\u63D2\u5165\u7B97\u6CD5\uFF1A\u7EA6\u675F\u3001\u9700\u6C42\u6765\u6E90\u3001\u5B9E\u9A8C\u6570\u636E\u6807\u6CE8\u3001\u8FD0\u884C\u4E0E\u56DE\u653E", "\u7528\u6237\u8981\u505A\u9700\u6C42\u54CD\u5E94\u516C\u4EA4 / DRT \u8C03\u5EA6\u5B9E\u9A8C\u65F6"],
  ["linggo-fleet-timetable", "LingGo \u5E38\u89C4\u516C\u4EA4\u914D\u8F66\u4E0E\u5BA2\u6D41\u73ED\u6B21\u751F\u6210\uFF1A\u53E3\u5F84\u3001\u5047\u8BBE\u4E0E\u7F3A\u53E3", "\u7528\u6237\u95EE\u7528\u8F66\u6570\u3001\u914D\u8F66\u3001\u53D1\u8F66\u95F4\u9694\u6216\u65F6\u523B\u8868\u751F\u6210\u65F6"],
  ["linggo-custom-algorithm", "LingGo \u81EA\u5B9A\u4E49 Python \u7B97\u6CD5\uFF1A\u6A21\u677F\u3001\u81EA\u68C0\u3001\u6CE8\u518C\u4E0E\u5B89\u5168\u63D0\u793A", "\u7528\u6237\u60F3\u63A5\u5165\u81EA\u5DF1\u7684\u8C03\u5EA6\u7B97\u6CD5\u65F6"]
];
function registerSkills(skills) {
  return SKILLS.map(
    ([name2, description, whenToUse]) => skills.register({
      name: name2,
      description,
      whenToUse,
      content: readFileSync(fileURLToPath2(new URL(`../skills/${name2}.md`, import.meta.url)), "utf8").replaceAll("{{PYTHON_DIR}}", PYTHON_DIR),
      source: "runtime",
      invocation: { modelInvocable: true, userInvocable: true }
    })
  );
}

// src/compat-host.js
function requireHostCapabilities(ctx) {
  const required = {
    "tools.guard": ctx.tools?.guard,
    "tools.register": ctx.tools?.register,
    "connection.fetch.register": ctx.connection?.fetch?.register
  };
  const missing = Object.entries(required).filter(([, fn]) => typeof fn !== "function").map(([key]) => key);
  if (missing.length) throw Error(`LingGo: required DSH security/transport APIs unavailable: ${missing.join(", ")}`);
}
function authenticatedWorkbenchUrl(ctx, desktop) {
  if (!ctx.webServer || typeof ctx.connection?.authenticatedUrl !== "function")
    throw Error("This DSH Host cannot create an authenticated browser link; open LingGo from DSH Web");
  const url = new URL(ctx.connection.authenticatedUrl(`http://127.0.0.1:${ctx.webServer.port}/`));
  url.hash = desktop === true ? "linggo=1&desktopReturn=1" : "linggo=1";
  return url.href;
}

// src/index.js
var name = "linggo";
var inject = {
  tools: { required: true },
  connection: { required: true },
  webServer: { required: false },
  agents: { required: false },
  skills: { required: false }
};
var PRESENTATION_PROMPT = `You are the LingGo transit workbench assistant in a presentation session.
Only use LingGo tools: linggo_status for readiness, linggo_query to read the project's published data,
linggo_map to show routes, stops or an algorithm result on the map, linggo_algorithms to list scheduling algorithms,
linggo_propose_run to propose a run (the user previews and confirms it in the \u5206\u6790 tab; you cannot start runs),
linggo_results to read finished results, and skill for LingGo how-to guides.
You cannot run shell commands, edit code or import data here.
Results computed from synthetic (\u5B9E\u9A8C\u751F\u6210) demand must always be called experimental, never observed demand.
Data is imported by the user through the import wizard on the left panel, which previews and confirms every mapping.
When the user asks for code changes or new features, suggest the "\u4EA4\u63A5\u7ED9\u5F00\u53D1\u5DE5\u4F5C\u53F0" (development handoff) action instead.
Never invent transit data: answer only from tool results, and when data is missing, say which data the project needs.`;
var OPERATIONS = [
  "launch",
  "state",
  "createProject",
  "directory",
  "handoff",
  "handoffOpened",
  "handoffArchive",
  "env",
  "inspect",
  "preview",
  "startImport",
  "jobs",
  "cancelJob",
  "selectVersion",
  "mapData",
  "mapActions",
  "settings",
  "saveSettings",
  "algorithms",
  "algorithmSource",
  "registerAlgorithm",
  "removeAlgorithm",
  "previewRun",
  "startRun",
  "runs",
  "runResult",
  "proposals",
  "dismissProposal"
];
var NEED_LABELS = { routes: "\u7EBF\u8DEF\u4E0E\u65B9\u5411", stops: "\u7AD9\u70B9\u4E0E\u7AD9\u5E8F", timetable: "\u65F6\u523B\u8868\uFF08\u8BA1\u5212\u73ED\u6B21\uFF09", ridership: "\u5206\u65F6\u6BB5\u5BA2\u6D41\u6216 OD" };
var ENTITY_NAMES = ["stops", "routes", "route_stops", "trips", "ridership", "od", "demand", "gps", "vehicles", "depots"];
var FILTER_COLUMNS = ["route_id", "route_name", "direction", "stop_id", "stop_name", "trip_id", "vehicle_id", "depot_id", "service_id", "time_bin", "date"];
var MAP_ACTIONS = ["show_route", "show_stop", "show_run", "show_all", "clear"];
var ACTION_HISTORY = 200;
function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error(`Invalid ${label}`);
  return value;
}
function cleanSource(input) {
  const source = plainObject(input, "source");
  if (source.type === "postgis") {
    if (typeof source.dsn !== "string" || !source.dsn.trim() || source.dsn.length > 2e3) throw Error("\u8BF7\u63D0\u4F9B PostgreSQL \u8FDE\u63A5\u4E32");
    return { type: "postgis", dsn: source.dsn, ...typeof source.table === "string" && source.table ? { table: source.table } : {} };
  }
  if (typeof source.path !== "string" || !source.path.trim() || source.path.length > 4096) throw Error("\u8BF7\u63D0\u4F9B\u672C\u673A\u6587\u4EF6\u8DEF\u5F84");
  return { type: "file", path: source.path.trim() };
}
function cleanMapping(input) {
  const m = plainObject(input, "mapping");
  if (typeof m.entity !== "string") throw Error("\u8BF7\u9009\u62E9\u76EE\u6807\u6570\u636E\u7C7B\u578B");
  const fields = {};
  for (const [k, v] of Object.entries(m.fields ?? {})) {
    if (!v || typeof v.column !== "string" || !v.column) continue;
    fields[k] = { column: v.column, transform: typeof v.transform === "string" ? v.transform : "" };
  }
  const defaults = {};
  for (const [k, v] of Object.entries(m.defaults ?? {})) if (typeof v === "string" && v) defaults[k] = v;
  return {
    entity: m.entity,
    ...typeof m.table === "string" ? { table: m.table } : {},
    crs: typeof m.crs === "string" ? m.crs : "WGS84",
    mode: m.mode === "append" ? "append" : "replace",
    fields,
    defaults
  };
}
async function apply(ctx) {
  requireHostCapabilities(ctx);
  const root = join4(process.env.DSH_HOME || join4(homedir(), ".dsh"), "linggo");
  await mkdir3(join4(root, "projects"), { recursive: true });
  const store = new Store(root);
  const jobs = new Jobs(store);
  const secret = randomBytes2(32);
  const settingsFile = join4(root, "settings.json");
  const readSettings = async () => JSON.parse(await readFile3(settingsFile, "utf8").catch(() => "{}"));
  const python = async () => resolvePython(root, (await readSettings()).python);
  const worker = async (request, options = {}) => runWorker({ python: await python(), request, ...options });
  const mapCache = /* @__PURE__ */ new Map();
  const actions = [];
  let actionSeq = 0;
  await removeLeftovers(store);
  await removeResultLeftovers(store);
  if (ctx.skills) for (const dispose of registerSkills(ctx.skills)) ctx.effect(() => dispose);
  ctx.effect(() => () => jobs.dispose());
  ctx.effect(() => ctx.tools.guard((exec) => toolDenial(root, exec)));
  const scopeOf = async (exec) => {
    const scope = presentationOf(root, exec?.agent?.session?.header?.cwd);
    const state = await store.read();
    const project = state.projects.find((p) => p.id === scope?.projectId);
    return { state, project, version: project && store.currentVersion(state, project.id) };
  };
  const requireProject = (state, id) => {
    const project = state.projects.find((p) => p.id === id);
    if (!project) throw Error("Unknown project");
    return project;
  };
  const analysis = createAnalysis({ store, jobs, worker, scopeOf, requireProject });
  const mapData = async (projectId, versionId) => {
    const key = `${projectId}/${versionId}`;
    if (!mapCache.has(key)) {
      const text = await readFile3(join4(store.versionDir(projectId, versionId), "map.json"), "utf8");
      mapCache.set(key, JSON.parse(text));
      if (mapCache.size > 8) mapCache.delete(mapCache.keys().next().value);
    }
    return mapCache.get(key);
  };
  ctx.tools.register(
    defineTool2({
      name: "linggo_status",
      description: "Read the current LingGo project, its published data version, the entity row counts and which data is still missing. Does not import or invent data.",
      parameters: {},
      output: { schema: { type: "json" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] },
      execute: async (_args, exec) => {
        const { project, version } = await scopeOf(exec);
        if (!project) return { projectId: null, dataReady: false, missing: Object.values(NEED_LABELS) };
        return {
          projectId: project.id,
          projectName: project.name,
          dataVersionId: version?.id ?? null,
          entities: version?.entities ?? {},
          dataReady: Boolean(version),
          missing: (version?.missing ?? Object.keys(NEED_LABELS)).map((n) => NEED_LABELS[n] ?? n),
          warnings: version?.warnings ?? []
        };
      }
    })
  );
  ctx.tools.register(
    defineTool2({
      name: "linggo_query",
      description: "Read rows of one standard entity from the project's current data version. Entities: stops, routes, route_stops, trips, ridership, od, demand, gps, vehicles, depots. Filter is exact match on columns such as route_id, direction, stop_id.",
      parameters: {
        entity: { type: "string", enum: ENTITY_NAMES, required: true },
        filter: {
          type: "object",
          description: "Exact-match conditions; omit for the first rows.",
          properties: Object.fromEntries(FILTER_COLUMNS.map((c) => [c, { type: "string" }])),
          additionalProperties: false
        },
        limit: { type: "integer", description: "Rows to return, 1-200 (default 50)." }
      },
      output: { schema: { type: "json" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] },
      execute: async (args, exec) => {
        const { project, version } = await scopeOf(exec);
        if (!version) return { available: false, message: "\u5F53\u524D\u9879\u76EE\u8FD8\u6CA1\u6709\u53D1\u5E03\u7684\u6570\u636E\u7248\u672C\uFF0C\u8BF7\u5148\u7528\u5DE6\u4FA7\u5BFC\u5165\u5411\u5BFC\u5BFC\u5165\u6570\u636E\u3002" };
        const value = await worker(
          { cmd: "query", versionDir: store.versionDir(project.id, version.id), entity: args.entity, filter: args.filter ?? {}, limit: Math.min(Math.max(args.limit ?? 50, 1), 200) },
          { signal: exec?.signal, timeoutMs: 6e4 }
        );
        return { dataVersionId: version.id, ...value };
      }
    })
  );
  ctx.tools.register(
    defineTool2({
      name: "linggo_map",
      description: "Operate the workbench map for the current project: show_route (id = route_id, optional direction), show_stop (id = stop_id), show_run (id = result runId from linggo_results; shows DRT vehicle paths with replay or fleet blocks), show_all, clear. Fails if the id is not in the current data version or results.",
      parameters: {
        action: { type: "string", enum: MAP_ACTIONS, required: true },
        id: { type: "string", description: "route_id for show_route, stop_id for show_stop, runId for show_run." },
        direction: { type: "string", description: "Optional route direction, as in route_stops.direction." }
      },
      output: { schema: { type: "json" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] },
      execute: async (args, exec) => {
        const { project, version } = await scopeOf(exec);
        if (!version) return { ok: false, message: "\u5F53\u524D\u9879\u76EE\u8FD8\u6CA1\u6709\u53D1\u5E03\u7684\u6570\u636E\u7248\u672C\u3002" };
        const data = await mapData(project.id, version.id);
        let target = null;
        if (args.action === "show_route") {
          const lines = data.routes.filter((r) => r.id === args.id && (args.direction === void 0 || r.dir === args.direction));
          if (!lines.length) return { ok: false, message: `\u6570\u636E\u7248\u672C\u4E2D\u6CA1\u6709\u7EBF\u8DEF ${args.id}` };
          target = { routeId: args.id, directions: lines.map((l) => l.dir), name: lines[0].name };
        } else if (args.action === "show_stop") {
          const stop = data.stops.find((s) => s[0] === args.id);
          if (!stop) return { ok: false, message: `\u6570\u636E\u7248\u672C\u4E2D\u6CA1\u6709\u7AD9\u70B9 ${args.id}` };
          target = { stopId: stop[0], name: stop[1] };
        } else if (args.action === "show_run") {
          target = await analysis.showRun(project, args.id);
          if (!target) return { ok: false, message: `\u6CA1\u6709\u7ED3\u679C ${args.id}` };
        }
        const action = {
          seq: ++actionSeq,
          projectId: project.id,
          versionId: version.id,
          sessionId: exec?.agent?.sessionId ?? null,
          action: args.action,
          target,
          at: (/* @__PURE__ */ new Date()).toISOString()
        };
        actions.push(action);
        if (actions.length > ACTION_HISTORY) actions.shift();
        return { ok: true, actionId: action.seq, dataVersionId: version.id, ...target };
      }
    })
  );
  for (const tool of analysis.tools) ctx.tools.register(tool);
  const installed = /* @__PURE__ */ new Map();
  const install = (agent) => {
    if (installed.has(agent) || !presentationOf(root, agent.session?.header?.cwd)) return;
    const lifts = [agent.ctx.tools.restrict({ allow: PRESENTATION_TOOLS })];
    const fiber = agent.ctx.inject(["systemPrompt"], (scope) => {
      scope.systemPrompt.section({
        name: "linggo:presentation",
        order: scope.systemPrompt.getSectionOrder("TOOLS_SDK") + 1,
        text: PRESENTATION_PROMPT,
        interpolate: false
      });
    });
    lifts.push(() => fiber.dispose());
    installed.set(agent, lifts);
  };
  ctx.on("agent/created", ({ agent }) => install(agent));
  ctx.on("agent/disposed", ({ agent }) => installed.delete(agent));
  if (ctx.agents) for (const agent of ctx.agents.list()) install(agent);
  ctx.effect(() => () => {
    for (const lifts of installed.values()) void lifts[1]?.();
    installed.clear();
  });
  const previewToken = (projectId, source, mapping) => createHmac2("sha256", secret).update(JSON.stringify([projectId, source, mapping])).digest("hex");
  const startImport = async (input) => {
    const state = await store.read();
    const project = requireProject(state, input.projectId);
    const source = cleanSource(input.source);
    const mapping = cleanMapping(input.mapping);
    if (input.previewToken !== previewToken(project.id, source, mapping)) throw Error("\u8BF7\u5148\u9884\u89C8\u5F53\u524D\u6620\u5C04\uFF0C\u518D\u786E\u8BA4\u5BFC\u5165");
    const base = store.currentVersion(state, project.id);
    const title = `\u5BFC\u5165 ${mapping.entity === "gtfs" ? "GTFS" : mapping.entity}\uFF1A${source.type === "postgis" ? source.table ?? "PostGIS" : source.path.split(/[\\/]/).at(-1)}`;
    let staging;
    return jobs.start({
      projectId: project.id,
      kind: "import",
      title,
      run: async (signal, progress) => {
        staging = store.stagingDir(project.id, randomBytes2(8).toString("hex"));
        await mkdir3(join4(staging, ".."), { recursive: true });
        const value = await worker(
          { cmd: "ingest", source, mapping, baseDir: base ? store.versionDir(project.id, base.id) : null, stagingDir: staging },
          { signal, onProgress: progress }
        );
        signal.throwIfAborted();
        const id = randomBytes2(8).toString("hex");
        const final = store.versionDir(project.id, id);
        await mkdir3(join4(final, ".."), { recursive: true });
        await rename3(staging, final);
        try {
          const manifest = JSON.parse(await readFile3(join4(final, "manifest.json"), "utf8"));
          await store.addDataVersion({
            id,
            projectId: project.id,
            parentId: base?.id ?? null,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            entities: Object.fromEntries(Object.entries(value.entities).map(([k, v]) => [k, { rows: v.rows }])),
            bbox: value.bbox,
            missing: value.missing,
            warnings: value.report.warnings,
            imports: value.report.imports,
            sources: manifest.sources.map((s) => ({ type: s.type, entity: s.entity, table: s.table, path: s.path }))
          });
        } catch (error) {
          await rm3(final, { recursive: true, force: true });
          throw error;
        }
        return { versionId: id, ...value };
      },
      cleanup: () => staging ? rm3(staging, { recursive: true, force: true }) : Promise.resolve()
    });
  };
  const handle = async (operation, input) => {
    switch (operation) {
      case "launch": {
        return { url: authenticatedWorkbenchUrl(ctx, input.desktop) };
      }
      case "state":
        return store.read();
      case "createProject":
        return store.createProject(input);
      case "directory": {
        requireProject(await store.read(), input.projectId);
        if (!["presentation", "development"].includes(input.mode)) throw Error("Invalid session mode");
        const cwd = store.projectDir(input.projectId, input.mode);
        await mkdir3(cwd, { recursive: true });
        return { cwd };
      }
      case "handoff":
        return store.createHandoff(input);
      case "handoffOpened":
        return store.markHandoffOpened(input);
      case "handoffArchive":
        return store.archiveHandoff(input);
      case "env":
        return worker({ cmd: "doctor" }, { timeoutMs: 3e4 }).then(
          (value) => ({ ok: true, ...value }),
          (error) => ({ ok: false, python: null, error: error.message })
        );
      case "inspect":
        requireProject(await store.read(), input.projectId);
        return worker({ cmd: "inspect", source: cleanSource(input.source) }, { timeoutMs: 12e4 });
      case "preview": {
        requireProject(await store.read(), input.projectId);
        const source = cleanSource(input.source);
        const mapping = cleanMapping(input.mapping);
        const value = await worker({ cmd: "preview", source, mapping }, { timeoutMs: 3e5 });
        return { ...value, previewToken: previewToken(input.projectId, source, mapping) };
      }
      case "startImport":
        return startImport(input);
      case "jobs":
        return jobs.list(input.projectId);
      case "cancelJob":
        return jobs.cancel(input.id);
      case "selectVersion":
        return store.selectVersion(input);
      case "mapData": {
        const state = await store.read();
        requireProject(state, input.projectId);
        const version = input.versionId ? state.dataVersions.find((v) => v.id === input.versionId && v.projectId === input.projectId) : store.currentVersion(state, input.projectId);
        if (!version) return null;
        return { versionId: version.id, ...await mapData(input.projectId, version.id) };
      }
      case "mapActions": {
        const since = Number(input.since) || 0;
        return { seq: actionSeq, actions: actions.filter((a) => a.seq > since && a.projectId === input.projectId) };
      }
      case "settings": {
        const s = await readSettings();
        return { amapKey: s.amapKey ?? "", amapSecurityCode: s.amapSecurityCode ?? "", baiduAK: s.baiduAK ?? "", python: s.python ?? "" };
      }
      case "saveSettings": {
        const next = { ...await readSettings() };
        for (const key of ["amapKey", "amapSecurityCode", "baiduAK", "python"]) {
          const v = input[key];
          if (v !== void 0 && (typeof v !== "string" || v.length > 1e3)) throw Error(`Invalid ${key}`);
          if (v !== void 0) {
            if (v.trim()) next[key] = v.trim();
            else delete next[key];
          }
        }
        const tmp = `${settingsFile}.${randomBytes2(4).toString("hex")}.tmp`;
        await writeFile3(tmp, JSON.stringify(next, null, 2), { mode: 384 });
        await rename3(tmp, settingsFile);
        return { saved: true };
      }
      default:
        return analysis.ops[operation](input);
    }
  };
  for (const operation of OPERATIONS) {
    ctx.connection.fetch.register({
      path: `/api/linggo.${operation}`,
      methods: ["POST"],
      requestBody: "buffered",
      fetch: async (request) => {
        let envelope;
        try {
          envelope = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!envelope || typeof envelope !== "object" || envelope.type !== "client-request" || typeof envelope.rpcId !== "string" || envelope.method !== `linggo.${operation}`)
          return new Response("Invalid RPC envelope", { status: 400 });
        let result;
        try {
          request.signal.throwIfAborted();
          const input = envelope.payload && typeof envelope.payload === "object" ? envelope.payload : {};
          result = { ok: true, value: await handle(operation, input) };
        } catch (error) {
          result = { ok: false, error: { code: "LINGGO_REQUEST_FAILED", message: error.message, details: {} } };
        }
        return Response.json({ type: "server-response", rpcId: envelope.rpcId, result });
      }
    });
  }
}
async function removeLeftovers(store) {
  const state = await store.read();
  const known = new Set(state.dataVersions.map((v) => `${v.projectId}/${v.id}`));
  for (const project of state.projects) {
    const data = join4(store.root, "projects", project.id, "data");
    await rm3(join4(data, "staging"), { recursive: true, force: true });
    const versions = await readdir(join4(data, "versions")).catch(() => []);
    for (const id of versions)
      if (!known.has(`${project.id}/${id}`)) await rm3(join4(data, "versions", id), { recursive: true, force: true });
  }
}
export {
  OPERATIONS,
  apply,
  inject,
  name
};
