import { createHmac, randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { Store } from "./store.js";
import { Jobs } from "./jobs.js";
import { resolvePython, runWorker } from "./worker.js";
import { PRESENTATION_TOOLS, presentationOf, toolDenial } from "./policy.js";
import { createAnalysis, removeResultLeftovers } from "./analysis.js";
import { registerSkills } from "./skills.js";
import { requireHostCapabilities, authenticatedWorkbenchUrl } from "./compat-host.js";

export const name = "linggo";
export const inject = {
  tools: { required: true },
  connection: { required: true },
  webServer: { required: false },
  agents: { required: false },
  skills: { required: false },
};

const PRESENTATION_PROMPT = `You are the LingGo transit workbench assistant in a presentation session.
Only use LingGo tools: linggo_status for readiness, linggo_query to read the project's published data,
linggo_map to show routes, stops or an algorithm result on the map, linggo_algorithms to list scheduling algorithms,
linggo_propose_run to propose a run (the user previews and confirms it in the 分析 tab; you cannot start runs),
linggo_results to read finished results, and skill for LingGo how-to guides.
You cannot run shell commands, edit code or import data here.
Results computed from synthetic (实验生成) demand must always be called experimental, never observed demand.
Data is imported by the user through the import wizard on the left panel, which previews and confirms every mapping.
When the user asks for code changes or new features, suggest the "交接给开发工作台" (development handoff) action instead.
Never invent transit data: answer only from tool results, and when data is missing, say which data the project needs.`;

export const OPERATIONS = [
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
  "dismissProposal",
];

const NEED_LABELS = { routes: "线路与方向", stops: "站点与站序", timetable: "时刻表（计划班次）", ridership: "分时段客流或 OD" };
const ENTITY_NAMES = ["stops", "routes", "route_stops", "trips", "ridership", "od", "demand", "gps", "vehicles", "depots"];
const FILTER_COLUMNS = ["route_id", "route_name", "direction", "stop_id", "stop_name", "trip_id", "vehicle_id", "depot_id", "service_id", "time_bin", "date"];
const MAP_ACTIONS = ["show_route", "show_stop", "show_run", "show_all", "clear"];
const ACTION_HISTORY = 200;

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error(`Invalid ${label}`);
  return value;
}

/** Keep only the keys the worker understands; anything else is dropped before it reaches Python. */
function cleanSource(input) {
  const source = plainObject(input, "source");
  if (source.type === "postgis") {
    if (typeof source.dsn !== "string" || !source.dsn.trim() || source.dsn.length > 2000) throw Error("请提供 PostgreSQL 连接串");
    return { type: "postgis", dsn: source.dsn, ...(typeof source.table === "string" && source.table ? { table: source.table } : {}) };
  }
  if (typeof source.path !== "string" || !source.path.trim() || source.path.length > 4096) throw Error("请提供本机文件路径");
  return { type: "file", path: source.path.trim() };
}

function cleanMapping(input) {
  const m = plainObject(input, "mapping");
  if (typeof m.entity !== "string") throw Error("请选择目标数据类型");
  const fields = {};
  for (const [k, v] of Object.entries(m.fields ?? {})) {
    if (!v || typeof v.column !== "string" || !v.column) continue;
    fields[k] = { column: v.column, transform: typeof v.transform === "string" ? v.transform : "" };
  }
  const defaults = {};
  for (const [k, v] of Object.entries(m.defaults ?? {})) if (typeof v === "string" && v) defaults[k] = v;
  return {
    entity: m.entity,
    ...(typeof m.table === "string" ? { table: m.table } : {}),
    crs: typeof m.crs === "string" ? m.crs : "WGS84",
    mode: m.mode === "append" ? "append" : "replace",
    fields,
    defaults,
  };
}

export async function apply(ctx) {
  requireHostCapabilities(ctx);
  const root = join(process.env.DSH_HOME || join(homedir(), ".dsh"), "linggo");
  await mkdir(join(root, "projects"), { recursive: true });
  const store = new Store(root);
  const jobs = new Jobs(store);
  const secret = randomBytes(32);
  const settingsFile = join(root, "settings.json");
  const readSettings = async () => JSON.parse(await readFile(settingsFile, "utf8").catch(() => "{}"));
  const python = async () => resolvePython(root, (await readSettings()).python);
  const worker = async (request, options = {}) => runWorker({ python: await python(), request, ...options });
  const mapCache = new Map();
  const actions = [];
  let actionSeq = 0;

  await removeLeftovers(store);
  await removeResultLeftovers(store);
  if (ctx.skills) for (const dispose of registerSkills(ctx.skills)) ctx.effect(() => dispose);
  ctx.effect(() => () => jobs.dispose());

  // Final authority: every tool execution, including PTC sub-calls, passes this guard.
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
      const text = await readFile(join(store.versionDir(projectId, versionId), "map.json"), "utf8");
      mapCache.set(key, JSON.parse(text));
      if (mapCache.size > 8) mapCache.delete(mapCache.keys().next().value);
    }
    return mapCache.get(key);
  };

  ctx.tools.register(
    defineTool({
      name: "linggo_status",
      description:
        "Read the current LingGo project, its published data version, the entity row counts and which data is still missing. Does not import or invent data.",
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
          warnings: version?.warnings ?? [],
        };
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "linggo_query",
      description:
        "Read rows of one standard entity from the project's current data version. Entities: stops, routes, route_stops, trips, ridership, od, demand, gps, vehicles, depots. Filter is exact match on columns such as route_id, direction, stop_id.",
      parameters: {
        entity: { type: "string", enum: ENTITY_NAMES, required: true },
        filter: {
          type: "object",
          description: "Exact-match conditions; omit for the first rows.",
          properties: Object.fromEntries(FILTER_COLUMNS.map((c) => [c, { type: "string" }])),
          additionalProperties: false,
        },
        limit: { type: "integer", description: "Rows to return, 1-200 (default 50)." },
      },
      output: { schema: { type: "json" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] },
      execute: async (args, exec) => {
        const { project, version } = await scopeOf(exec);
        if (!version) return { available: false, message: "当前项目还没有发布的数据版本，请先用左侧导入向导导入数据。" };
        const value = await worker(
          { cmd: "query", versionDir: store.versionDir(project.id, version.id), entity: args.entity, filter: args.filter ?? {}, limit: Math.min(Math.max(args.limit ?? 50, 1), 200) },
          { signal: exec?.signal, timeoutMs: 60_000 },
        );
        return { dataVersionId: version.id, ...value };
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "linggo_map",
      description:
        "Operate the workbench map for the current project: show_route (id = route_id, optional direction), show_stop (id = stop_id), show_run (id = result runId from linggo_results; shows DRT vehicle paths with replay or fleet blocks), show_all, clear. Fails if the id is not in the current data version or results.",
      parameters: {
        action: { type: "string", enum: MAP_ACTIONS, required: true },
        id: { type: "string", description: "route_id for show_route, stop_id for show_stop, runId for show_run." },
        direction: { type: "string", description: "Optional route direction, as in route_stops.direction." },
      },
      output: { schema: { type: "json" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] },
      execute: async (args, exec) => {
        const { project, version } = await scopeOf(exec);
        if (!version) return { ok: false, message: "当前项目还没有发布的数据版本。" };
        const data = await mapData(project.id, version.id);
        let target = null;
        if (args.action === "show_route") {
          const lines = data.routes.filter((r) => r.id === args.id && (args.direction === undefined || r.dir === args.direction));
          if (!lines.length) return { ok: false, message: `数据版本中没有线路 ${args.id}` };
          target = { routeId: args.id, directions: lines.map((l) => l.dir), name: lines[0].name };
        } else if (args.action === "show_stop") {
          const stop = data.stops.find((s) => s[0] === args.id);
          if (!stop) return { ok: false, message: `数据版本中没有站点 ${args.id}` };
          target = { stopId: stop[0], name: stop[1] };
        } else if (args.action === "show_run") {
          target = await analysis.showRun(project, args.id);
          if (!target) return { ok: false, message: `没有结果 ${args.id}` };
        }
        const action = {
          seq: ++actionSeq,
          projectId: project.id,
          versionId: version.id,
          sessionId: exec?.agent?.sessionId ?? null,
          action: args.action,
          target,
          at: new Date().toISOString(),
        };
        actions.push(action);
        if (actions.length > ACTION_HISTORY) actions.shift();
        return { ok: true, actionId: action.seq, dataVersionId: version.id, ...target };
      },
    }),
  );

  for (const tool of analysis.tools) ctx.tools.register(tool);

  // Hide non-transit tools and explain the boundary; the guard above still decides.
  const installed = new Map();
  const install = (agent) => {
    if (installed.has(agent) || !presentationOf(root, agent.session?.header?.cwd)) return;
    const lifts = [agent.ctx.tools.restrict({ allow: PRESENTATION_TOOLS })];
    const fiber = agent.ctx.inject(["systemPrompt"], (scope) => {
      scope.systemPrompt.section({
        name: "linggo:presentation",
        order: scope.systemPrompt.getSectionOrder("TOOLS_SDK") + 1,
        text: PRESENTATION_PROMPT,
        interpolate: false,
      });
    });
    lifts.push(() => fiber.dispose());
    installed.set(agent, lifts);
  };
  ctx.on("agent/created", ({ agent }) => install(agent));
  ctx.on("agent/disposed", ({ agent }) => installed.delete(agent));
  if (ctx.agents) for (const agent of ctx.agents.list()) install(agent);
  // Live restrictions stay until the agent ends (fail closed); only the prompt fibers belong to this plugin.
  ctx.effect(() => () => {
    for (const lifts of installed.values()) void lifts[1]?.();
    installed.clear();
  });

  const previewToken = (projectId, source, mapping) =>
    createHmac("sha256", secret).update(JSON.stringify([projectId, source, mapping])).digest("hex");

  const startImport = async (input) => {
    const state = await store.read();
    const project = requireProject(state, input.projectId);
    const source = cleanSource(input.source);
    const mapping = cleanMapping(input.mapping);
    // The job only starts for exactly the source and mapping the user previewed.
    if (input.previewToken !== previewToken(project.id, source, mapping)) throw Error("请先预览当前映射，再确认导入");
    const base = store.currentVersion(state, project.id);
    const title = `导入 ${mapping.entity === "gtfs" ? "GTFS" : mapping.entity}：${source.type === "postgis" ? source.table ?? "PostGIS" : source.path.split(/[\\/]/).at(-1)}`;
    let staging;
    return jobs.start({
      projectId: project.id,
      kind: "import",
      title,
      run: async (signal, progress) => {
        staging = store.stagingDir(project.id, randomBytes(8).toString("hex"));
        await mkdir(join(staging, ".."), { recursive: true });
        const value = await worker(
          { cmd: "ingest", source, mapping, baseDir: base ? store.versionDir(project.id, base.id) : null, stagingDir: staging },
          { signal, onProgress: progress },
        );
        signal.throwIfAborted();
        const id = randomBytes(8).toString("hex");
        const final = store.versionDir(project.id, id);
        await mkdir(join(final, ".."), { recursive: true });
        await rename(staging, final);
        try {
          const manifest = JSON.parse(await readFile(join(final, "manifest.json"), "utf8"));
          await store.addDataVersion({
            id,
            projectId: project.id,
            parentId: base?.id ?? null,
            createdAt: new Date().toISOString(),
            entities: Object.fromEntries(Object.entries(value.entities).map(([k, v]) => [k, { rows: v.rows }])),
            bbox: value.bbox,
            missing: value.missing,
            warnings: value.report.warnings,
            imports: value.report.imports,
            sources: manifest.sources.map((s) => ({ type: s.type, entity: s.entity, table: s.table, path: s.path })),
          });
        } catch (error) {
          await rm(final, { recursive: true, force: true });
          throw error;
        }
        return { versionId: id, ...value };
      },
      cleanup: () => (staging ? rm(staging, { recursive: true, force: true }) : Promise.resolve()),
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
        await mkdir(cwd, { recursive: true });
        return { cwd };
      }
      case "handoff":
        return store.createHandoff(input);
      case "handoffOpened":
        return store.markHandoffOpened(input);
      case "handoffArchive":
        return store.archiveHandoff(input);
      case "env":
        return worker({ cmd: "doctor" }, { timeoutMs: 30_000 }).then(
          (value) => ({ ok: true, ...value }),
          (error) => ({ ok: false, python: null, error: error.message }),
        );
      case "inspect":
        requireProject(await store.read(), input.projectId);
        return worker({ cmd: "inspect", source: cleanSource(input.source) }, { timeoutMs: 120_000 });
      case "preview": {
        requireProject(await store.read(), input.projectId);
        const source = cleanSource(input.source);
        const mapping = cleanMapping(input.mapping);
        const value = await worker({ cmd: "preview", source, mapping }, { timeoutMs: 300_000 });
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
        const version = input.versionId
          ? state.dataVersions.find((v) => v.id === input.versionId && v.projectId === input.projectId)
          : store.currentVersion(state, input.projectId);
        if (!version) return null;
        return { versionId: version.id, ...(await mapData(input.projectId, version.id)) };
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
        const next = { ...(await readSettings()) };
        for (const key of ["amapKey", "amapSecurityCode", "baiduAK", "python"]) {
          const v = input[key];
          if (v !== undefined && (typeof v !== "string" || v.length > 1000)) throw Error(`Invalid ${key}`);
          if (v !== undefined) { if (v.trim()) next[key] = v.trim(); else delete next[key]; }
        }
        const tmp = `${settingsFile}.${randomBytes(4).toString("hex")}.tmp`;
        await writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
        await rename(tmp, settingsFile);
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
        if (
          !envelope ||
          typeof envelope !== "object" ||
          envelope.type !== "client-request" ||
          typeof envelope.rpcId !== "string" ||
          envelope.method !== `linggo.${operation}`
        )
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
      },
    });
  }
}

/** Staging output of interrupted imports and version folders never recorded in state are removed. */
async function removeLeftovers(store) {
  const state = await store.read();
  const known = new Set(state.dataVersions.map((v) => `${v.projectId}/${v.id}`));
  for (const project of state.projects) {
    const data = join(store.root, "projects", project.id, "data");
    await rm(join(data, "staging"), { recursive: true, force: true });
    const versions = await readdir(join(data, "versions")).catch(() => []);
    for (const id of versions)
      if (!known.has(`${project.id}/${id}`)) await rm(join(data, "versions", id), { recursive: true, force: true });
  }
}
