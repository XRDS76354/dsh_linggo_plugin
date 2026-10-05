import { createHash, createHmac, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";

const MAX_SOURCE = 256 * 1024;
const MAX_BATCH = 10;
const PROPOSAL_HISTORY = 50;
const ENTITY_LABELS = {
  stops: "站点", routes: "线路与方向", route_stops: "线路站序", trips: "时刻表", ridership: "分时段客流",
  od: "OD", demand: "逐笔需求", gps: "车辆 GPS", vehicles: "车辆", depots: "车场",
};
const USER_CODE_WARNING =
  "这是用户注册的 Python 代码：接口与结果校验不等于代码安全，它将以你的用户权限在本机运行，没有沙箱。";

const json = { schema: { type: "json" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] };

/** Same rules as linggo_data.algo.clean_param; the worker checks again. */
export function cleanParams(meta, input) {
  const params = input ?? {};
  if (typeof params !== "object" || Array.isArray(params)) throw Error("参数必须是对象");
  const unknown = Object.keys(params).filter((k) => !(k in meta.params));
  if (unknown.length) throw Error(`未知参数：${unknown.join("、")}`);
  const out = {};
  for (const [name, spec] of Object.entries(meta.params)) {
    const value = params[name] ?? spec.default;
    if (spec.type === "boolean") {
      if (typeof value !== "boolean") throw Error(`参数 ${name} 应为布尔值`);
    } else if (spec.type === "integer" || spec.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value) || (spec.type === "integer" && !Number.isInteger(value)))
        throw Error(`参数 ${name} 应为${spec.type === "integer" ? "整数" : "数值"}`);
      if ((spec.min !== undefined && value < spec.min) || (spec.max !== undefined && value > spec.max))
        throw Error(`参数 ${name} 应在 ${spec.min}–${spec.max} 之间`);
    } else if (spec.type === "enum") {
      if (!spec.options.includes(value)) throw Error(`参数 ${name} 应为 ${spec.options.join("/")} 之一`);
    } else if (typeof value !== "string" || value.length > 500) throw Error(`参数 ${name} 应为不超过 500 字的字符串`);
    out[name] = value;
  }
  return out;
}

/**
 * Algorithms, confirmed runs and results. The presentation agent can list algorithms, read results
 * and propose a run; only the user starts one, from a preview whose token the Host checks.
 */
export function createAnalysis({ store, jobs, worker, scopeOf, requireProject }) {
  const secret = randomBytes(32);
  const proposals = [];
  let builtins;

  const listBuiltins = async () => {
    builtins ??= worker({ cmd: "algorithms" }, { timeoutMs: 60_000 }).catch((error) => {
      builtins = undefined;
      throw error;
    });
    return builtins;
  };

  const algorithmsOf = async (state, projectId) => [
    ...(await listBuiltins()).map((m) => ({ ...m, source: "builtin" })),
    ...state.algorithms
      .filter((a) => a.projectId === projectId)
      .map((a) => ({ ...a.meta, id: a.id, source: "user", sha256: a.sha256, originalPath: a.originalPath, registeredAt: a.registeredAt })),
  ];

  const resolve = async (state, projectId, algorithmId) => {
    const found = (await algorithmsOf(state, projectId)).find((a) => a.id === algorithmId);
    if (!found) throw Error(`未知算法：${algorithmId}`);
    return found;
  };

  const readSource = async (path) => {
    if (typeof path !== "string" || !path.trim() || extname(path) !== ".py") throw Error("请提供 .py 算法文件的本机路径");
    const info = await stat(path);
    if (!info.isFile() || info.size > MAX_SOURCE) throw Error("算法文件需为不超过 256 KB 的普通文件");
    const bytes = await readFile(path);
    return { path, bytes, sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length };
  };

  const token = (parts) => createHmac("sha256", secret).update(JSON.stringify(parts)).digest("hex");

  const plan = async (input) => {
    const state = await store.read();
    const project = requireProject(state, input.projectId);
    const version = store.currentVersion(state, project.id);
    if (!version) throw Error("当前项目还没有数据版本，请先导入数据");
    const algorithm = await resolve(state, project.id, input.algorithmId);
    const sets = input.paramSets ?? [input.params ?? {}];
    if (!Array.isArray(sets) || !sets.length || sets.length > MAX_BATCH) throw Error(`一次最多运行 ${MAX_BATCH} 组参数`);
    const paramSets = sets.map((p) => cleanParams(algorithm, p));
    const inputs = algorithm.inputs.map((i) => ({ ...i, label: ENTITY_LABELS[i.entity] ?? i.entity, rows: version.entities?.[i.entity]?.rows ?? 0 }));
    const blocking = inputs.filter((i) => i.required && !i.rows).map((i) => `缺少必需数据：${i.label}`);
    const warnings = [];
    if (algorithm.source === "user") warnings.push(USER_CODE_WARNING);
    if (paramSets.some((p) => p.demand_source === "synthetic")) warnings.push("需求为按种子生成的实验数据，结果会标记为实验，不代表观测需求。");
    return { project, version, algorithm, paramSets, inputs, blocking, warnings };
  };

  const startRun = async (input) => {
    const p = await plan(input);
    if (p.blocking.length) throw Error(p.blocking.join("；"));
    if (input.previewToken !== token([p.project.id, p.version.id, p.algorithm.id, p.algorithm.sha256 ?? null, p.paramSets]))
      throw Error("请先预览当前算法和参数，再确认运行");
    const proposal = proposals.find((x) => x.id === input.proposalId && x.projectId === p.project.id);
    let staging;
    const job = jobs.start({
      projectId: p.project.id,
      kind: "run",
      title: `${p.algorithm.name}${p.paramSets.length > 1 ? ` × ${p.paramSets.length}` : ""}`,
      run: async (signal, progress) => {
        const runs = [];
        for (const [index, params] of p.paramSets.entries()) {
          staging = store.resultStaging(p.project.id, randomBytes(8).toString("hex"));
          const algorithm =
            p.algorithm.source === "builtin"
              ? { builtin: p.algorithm.id }
              : { path: store.algorithmFile(p.project.id, p.algorithm.id), sha256: p.algorithm.sha256 };
          const value = await worker(
            { cmd: "run", algorithm, versionDir: store.versionDir(p.project.id, p.version.id), params, resultDir: staging },
            { signal, onProgress: (v, m) => progress((index + v) / p.paramSets.length, m) },
          );
          signal.throwIfAborted();
          const id = randomBytes(8).toString("hex");
          const final = store.resultDir(p.project.id, id);
          await rename(staging, final);
          staging = undefined;
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
              createdAt: new Date().toISOString(),
            });
          } catch (error) {
            await rm(final, { recursive: true, force: true });
            throw error;
          }
          runs.push(id);
        }
        return { runs };
      },
      cleanup: () => (staging ? rm(staging, { recursive: true, force: true }) : Promise.resolve()),
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
      // Register exactly the bytes the user reviewed; a changed file needs a new review.
      if (input.sha256 !== s.sha256) throw Error("文件在查看后已改变，请重新查看源代码");
      const id = randomBytes(8).toString("hex");
      const file = store.algorithmFile(project.id, id);
      await mkdir(join(file, ".."), { recursive: true });
      await writeFile(file, s.bytes, { mode: 0o600 });
      try {
        const meta = await worker({ cmd: "algorithms", path: file, sha256: s.sha256 }, { timeoutMs: 60_000 });
        return await store.addAlgorithm({ id, projectId: project.id, meta, sha256: s.sha256, originalPath: s.path, registeredAt: new Date().toISOString() });
      } catch (error) {
        await rm(file, { force: true });
        throw error;
      }
    },
    removeAlgorithm: async (input) => {
      const item = await store.removeAlgorithm(input);
      await rm(store.algorithmFile(item.projectId, item.id), { force: true });
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
        previewToken: p.blocking.length ? null : token([p.project.id, p.version.id, p.algorithm.id, p.algorithm.sha256 ?? null, p.paramSets]),
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
      return { run, result: JSON.parse(await readFile(join(store.resultDir(run.projectId, run.id), "result.json"), "utf8")) };
    },
    proposals: async (input) => proposals.filter((x) => x.projectId === input.projectId && x.status === "pending"),
    dismissProposal: async (input) => {
      const item = proposals.find((x) => x.id === input.id);
      if (!item) throw Error("Unknown proposal");
      item.status = "dismissed";
      return item;
    },
  };

  const tools = [
    defineTool({
      name: "linggo_algorithms",
      description:
        "List the scheduling algorithms available in the current project (built-in DRT insertion, fleet assignment, trip generation, and user-registered Python algorithms) with their inputs and parameter specs.",
      parameters: {},
      output: json,
      execute: async (_args, exec) => {
        const { state, project, version } = await scopeOf(exec);
        if (!project) return { available: false, message: "不在 LingGo 展示会话中" };
        const list = await algorithmsOf(state, project.id);
        return {
          dataVersionId: version?.id ?? null,
          algorithms: list.map((a) => ({
            id: a.id, name: a.name, kind: a.kind, source: a.source, description: a.description,
            inputs: a.inputs.map((i) => ({ ...i, rows: version?.entities?.[i.entity]?.rows ?? 0 })), params: a.params,
          })),
        };
      },
    }),
    defineTool({
      name: "linggo_propose_run",
      description:
        "Propose running one algorithm (or a batch of up to 10 parameter sets) on the current data version. This does NOT run anything: the proposal appears in the workbench, where the user previews, confirms or dismisses it. Afterwards read results with linggo_results.",
      parameters: {
        algorithm: { type: "string", description: "Algorithm id from linggo_algorithms.", required: true },
        params: { type: "object", description: "Parameter values; omitted ones use defaults.", additionalProperties: true },
        batch: { type: "array", description: "Several parameter sets for a comparison; overrides params.", items: { type: "object", additionalProperties: true } },
        reason: { type: "string", description: "One sentence for the user: why this run." },
      },
      output: json,
      execute: async (args, exec) => {
        const { state, project, version } = await scopeOf(exec);
        if (!project) return { ok: false, message: "不在 LingGo 展示会话中" };
        if (!version) return { ok: false, message: "当前项目还没有数据版本" };
        try {
          const algorithm = await resolve(state, project.id, args.algorithm);
          const sets = args.batch?.length ? args.batch : [args.params ?? {}];
          if (sets.length > MAX_BATCH) throw Error(`一次最多 ${MAX_BATCH} 组参数`);
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
            at: new Date().toISOString(),
          };
          proposals.push(item);
          if (proposals.length > PROPOSAL_HISTORY) proposals.shift();
          return { ok: true, proposalId: item.id, status: "pending", message: "已提交到工作台“分析”页，等待用户预览并确认；用户确认前不会运行。" };
        } catch (error) {
          return { ok: false, message: error.message };
        }
      },
    }),
    defineTool({
      name: "linggo_results",
      description:
        "Read algorithm results of the current project. Without run_id: the latest runs with key indicators. With run_id: indicators, constraint validation, assumptions and the main gaps or rejections.",
      parameters: { run_id: { type: "string", description: "Result id from the list." } },
      output: json,
      execute: async (args, exec) => {
        const { state, project } = await scopeOf(exec);
        if (!project) return { available: false, message: "不在 LingGo 展示会话中" };
        const own = state.results.filter((r) => r.projectId === project.id);
        if (!args.run_id)
          return {
            runs: own.slice(-20).reverse().map((r) => ({
              runId: r.id, algorithm: r.algorithmName, kind: r.kind, createdAt: r.createdAt, dataVersionId: r.versionId,
              synthetic: r.synthetic, valid: r.validation?.ok, summary: r.summary, params: r.params,
            })),
          };
        const run = own.find((r) => r.id === args.run_id);
        if (!run) return { available: false, message: `没有结果 ${args.run_id}` };
        const result = JSON.parse(await readFile(join(store.resultDir(project.id, run.id), "result.json"), "utf8"));
        const detail =
          run.kind === "drt"
            ? { rejected: result.requests?.filter((r) => !r.served).slice(0, 10) }
            : run.kind === "fleet"
              ? { unassigned: result.unassigned?.slice(0, 10), longestBlocks: [...(result.blocks ?? [])].sort((a, b) => b.trips.length - a.trips.length).slice(0, 5).map((b) => ({ vehicle: b.vehicle_id, trips: b.trips.length, start: b.start, end: b.end })) }
              : run.kind === "tripgen"
                ? { gaps: result.gaps?.slice(0, 20), headways: result.headways?.slice(0, 30) }
                : {};
        return {
          runId: run.id, algorithm: run.algorithmName, kind: run.kind, dataVersionId: run.versionId, synthetic: run.synthetic,
          params: run.params, summary: result.summary, assumptions: result.assumptions,
          validation: { ...result.validation, violations: result.validation?.violations?.slice(0, 10) }, ...detail,
        };
      },
    }),
  ];

  const showRun = async (project, runId) => {
    const state = await store.read();
    const run = state.results.find((r) => r.id === runId && r.projectId === project.id);
    if (!run) return null;
    return { runId: run.id, name: run.algorithmName, kind: run.kind };
  };

  return { ops, tools, showRun };
}

/** Result staging of interrupted runs and result folders never recorded in state are removed. */
export async function removeResultLeftovers(store) {
  const { readdir } = await import("node:fs/promises");
  const state = await store.read();
  const known = new Set(state.results.map((r) => `${r.projectId}/${r.id}`));
  for (const project of state.projects) {
    const dir = join(store.root, "projects", project.id, "results");
    await rm(join(dir, ".staging"), { recursive: true, force: true });
    for (const id of await readdir(dir).catch(() => []))
      if (!known.has(`${project.id}/${id}`)) await rm(join(dir, id), { recursive: true, force: true });
  }
}
