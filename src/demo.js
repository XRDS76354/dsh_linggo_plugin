import { randomUUID, createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createUserMessage } from "@deepseek-ai/dsh-llm";

const ASSET_DIR = fileURLToPath(new URL("../demo/", import.meta.url));
const STAMP = "2030-01-01T00:00:00Z";
let assets;
export async function demoAssets() {
  assets ??= Promise.all(
    ["bundle.json", "catalog.json"].map(async (name) =>
      JSON.parse(await readFile(join(ASSET_DIR, name), "utf8")),
    ),
  );
  const [asset, catalog] = await assets;
  const payload =
    asset.encoding === "gzip-base64"
      ? gunzipSync(Buffer.from(asset.data, "base64"))
      : null;
  if (
    payload &&
    createHash("sha256").update(payload).digest("hex") !== asset.sha256
  )
    throw Error("Invalid demo checksum");
  return { bundle: payload ? JSON.parse(payload) : asset, catalog };
}
const csvCell = (value) =>
  '"' + String(value ?? "").replaceAll('"', '""') + '"';
const jsonFile = (path, value) =>
  writeFile(path, JSON.stringify(value), { mode: 0o600 });

/** One atomic metadata publication. Finished assets are immutable and never rewritten on restart. */
export async function ensureDemoAssets(store, { recreate = false } = {}) {
  const { bundle } = await demoAssets();
  return store.update(async (state) => {
    if (state.demo && !recreate) return state.demo;
    const generation = (state.demo?.generation ?? 0) + 1;
    const previous = state.projects.find((p) => p.id === state.demo?.projectId);
    if (previous) previous.demo = { ...state.demo };
    const projectId = randomUUID(),
      versionId = randomUUID(),
      publishedAt = new Date().toISOString();
    const data = {
      version: bundle.version,
      generation,
      projectId,
      versionId,
      presentationSessionId: `session-${randomUUID()}`,
      developmentSessionId: `session-${randomUUID()}`,
      resultIds: Object.fromEntries(
        bundle.results.map((r) => [r.id, randomUUID()]),
      ),
      nativeReady: false,
    };
    const name = generation === 1 ? "LingGo 演示" : `LingGo 演示 ${generation}`;
    for (const mode of ["presentation", "development"])
      await mkdir(store.projectDir(projectId, mode), { recursive: true });
    const staging = store.stagingDir(projectId, `demo-${versionId}`);
    await mkdir(staging, { recursive: true });
    for (const [entity, rows] of Object.entries(bundle.tables)) {
      const columns = bundle.manifest.entities[entity].columns;
      const csv =
        [
          columns.map(csvCell).join(","),
          ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(",")),
        ].join("\n") + "\n";
      await writeFile(join(staging, entity + ".csv"), csv, { mode: 0o600 });
    }
    await jsonFile(join(staging, "manifest.json"), bundle.manifest);
    await jsonFile(join(staging, "query-index.json"), bundle.tables);
    await jsonFile(join(staging, "map.json"), {
      ...bundle.map,
      demoScene: {
        profiles: bundle.profiles,
        routeSources: bundle.routeSources,
        networkSource: bundle.networkSource,
      },
    });
    const final = store.versionDir(projectId, versionId);
    await mkdir(join(final, ".."), { recursive: true });
    await rename(staging, final);
    for (const preset of bundle.results) {
      const id = data.resultIds[preset.id];
      const directory = store.resultDir(projectId, id);
      await mkdir(directory, { recursive: true });
      await jsonFile(join(directory, "result.json"), preset.result);
      state.results.push({
        id,
        projectId,
        versionId,
        algorithmId: preset.algorithmId,
        algorithmName: preset.algorithmName,
        algorithmSource: "builtin",
        kind: preset.kind,
        params: preset.params,
        summary: preset.summary,
        validation: preset.validation,
        synthetic: preset.provenance?.synthetic ?? true,
        precomputed: true,
        engineVersion: preset.engineVersion,
        provenance: preset.provenance ?? bundle.provenance,
        statisticsScope: preset.result.statisticsScope,
        createdAt: publishedAt,
      });
    }
    const development = store.projectDir(projectId, "development");
    await writeFile(
      join(development, "demo_algorithm.py"),
      await readFile(
        new URL("../python/templates/linggo_algorithm.py", import.meta.url),
      ),
      { mode: 0o600 },
    );
    const pythonDir = fileURLToPath(new URL("../python/", import.meta.url));
    await writeFile(
      join(development, "README.md"),
      `# ${name} · 开发\n\n八条线路及站点来自已授权的 CPTOND 上海最小截取；客流、OD、班次及重跑需求为固定种子模拟。既有 DRT 为匿名计算片段，不可复现原全场景。先打开地图，切换常规公交与 DRT 调度；不要将模拟指标解释为实测。\n\n## 最小开发路径\n\n1. 阅读 demo_algorithm.py，修改算法的参数或逻辑。\n2. 使用工作台“设置”初始化 Python，或选用已有环境。\n3. 在本目录自检（先将 ${pythonDir} 加入 PYTHONPATH）：\n\n\`\`\`sh\npython -m linggo_data.selfcheck demo_algorithm.py --version-dir "${final}"\n\`\`\`\n\n4. 在工作台“分析”中选择文件，审阅源码并注册；预览后确认运行。\n\n当前演示数据：${final}\n\n预计算结果：${join(store.root, "projects", projectId, "results")}\n\n原始 DRT v2 已作为内置算法接入，支持 A/B 策略、有向路网和回场；本文件是可修改的接口示例。\n`,
      { mode: 0o600 },
    );
    state.projects.push({
      id: projectId,
      name,
      currentVersionId: versionId,
      createdAt: new Date().toISOString(),
      origin: "bundled-demo",
      demoGeneration: generation,
      demo: data,
    });
    state.dataVersions.push({
      id: versionId,
      projectId,
      createdAt: publishedAt,
      origin: "bundled-demo",
      provenance: bundle.provenance,
      entities: bundle.manifest.entities,
      bbox: bundle.map.bbox,
      missing: [],
      warnings: [],
    });
    state.demo = data;
    return data;
  });
}

export async function queryDemo(store, project, version, args) {
  if (version.origin !== "bundled-demo") return null;
  const tables = JSON.parse(
    await readFile(
      join(store.versionDir(project.id, version.id), "query-index.json"),
      "utf8",
    ),
  );
  const source = tables[args.entity];
  let rows = source ?? [];
  for (const [key, value] of Object.entries(args.filter ?? {})) {
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      rows.some((r) => Object.hasOwn(r, key))
    )
      rows = rows.filter((r) => String(r[key]) === String(value));
  }
  return {
    entity: args.entity,
    total: rows.length,
    rows: rows.slice(0, Math.min(Math.max(args.limit ?? 50, 1), 200)),
    available: source !== undefined,
    synthetic: ![
      "stops",
      "routes",
      "route_stops",
      "network_nodes",
      "network_edges",
    ].includes(args.entity),
    source: version.provenance?.entities?.[args.entity],
    provenance: version.provenance,
  };
}

export async function demoInfo(store, projectId) {
  const state = await store.read();
  const demo =
    projectId && projectId !== state.demo?.projectId
      ? state.projects.find((p) => p.id === projectId)?.demo
      : state.demo;
  if (!demo) return null;
  const project = state.projects.find((p) => p.id === demo.projectId);
  if (!project) return { ...demo, removed: true };
  const version = store.currentVersion(state, project.id);
  const tables =
    version?.origin === "bundled-demo"
      ? JSON.parse(
          await readFile(
            join(store.versionDir(project.id, version.id), "query-index.json"),
            "utf8",
          ),
        )
      : null;
  return {
    ...demo,
    project,
    tables,
    synthetic: version?.provenance?.synthetic ?? true,
    updateAvailable: demo.version < 2,
    results: state.results.filter(
      (r) => r.projectId === project.id && r.precomputed,
    ),
  };
}

/** Native first-party context, not a pretend model response or fabricated tool trace. */
export async function ensureDemoSessions(store, ctx) {
  if (
    !ctx.sessionController ||
    !ctx.workspaceController ||
    !ctx.sessions?.get ||
    !ctx.sessions?.flush
  )
    return;
  return store.update(async (state) => {
    const demo = state.demo;
    if (!demo || demo.nativeReady) return;
    const project = state.projects.find((p) => p.id === demo.projectId);
    if (!project) return;
    for (const [mode, field, suffix] of [
      ["presentation", "presentationSessionId", "展示"],
      ["development", "developmentSessionId", "开发"],
    ]) {
      const existing = ctx.sessions.get(demo[field]);
      if (
        existing?.log.some(
          (e) =>
            e.type === "user/message" && e.data.source?.kind === "linggo-demo",
        )
      ) {
        await ctx.sessions.flush(existing);
        continue;
      }
      const title = `${project.name} · ${suffix}`;
      const value = await ctx.workspaceController.create({
        path: store.projectDir(project.id, mode),
      });
      const workspace = value.workspace ?? value;
      await ctx.workspaceController.rename({
        workspaceId: workspace.workspaceId,
        title,
      });
      const sessionId = demo[field];
      await ctx.sessionController.create({
        workspaceId: workspace.workspaceId,
        sessionId,
      });
      const session = ctx.sessions.get(sessionId);
      if (!session) throw Error("DSH did not publish the demo Session");
      // A manual title pins the native title producer before committing the local notice.
      await ctx.sessionController.rename({ sessionId, title });
      if (
        !session.log.some(
          (event) =>
            event.type === "user/message" &&
            event.data.source?.kind === "linggo-demo",
        )
      ) {
        const text =
          mode === "presentation"
            ? "插件内置说明 · 真实线网地图演示\n\n打开公交工作台直接进入地图：八条真实上海线路，默认选中 1009 路。去回程、站点定位、三日型客流、断面、OD 和计划车辆回放均在地图内。\n\n切换 DRT 调度：既有片段为六辆匿名车辆的 12:30–13:15 回放；模拟 A/B 则可配置 Python 后预览确认重跑。点击车辆查看载客、下一站、车场与事件。片段指标与原场景参考分开统计。\n\n功能指引连接数据导入、四种算法、参数预览、取消、结果和开发交接。可以提问：1009 路哪个时段需求最多？比较模拟 A/B。\n\n真实线网来自 CPTOND；运营需求为模拟，既有片段为匿名计算结果。本说明由插件提供，未自动请求模型。"
            : "插件内置说明 · 地图演示开发\n\n阅读 README.md 与 demo_algorithm.py，修改 → 自检 → 源码审阅 → 注册 → 预览 → 确认运行。真实线网、模拟运营与匿名既有片段分别标明来源。开发修改与草稿会保留；本说明未自动请求模型。";
        const turn =
          Math.max(
            0,
            ...session.log
              .filter((e) => e.type === "turn/start")
              .map((e) => e.data.turn),
          ) + 1;
        session.append("turn/start", { turn });
        session.append(
          "user/message",
          createUserMessage({
            content: [{ type: "text", text }],
            source: {
              kind: "linggo-demo",
              form: "notice",
              summary: "插件内置说明 · 真实线网地图演示",
            },
          }),
          { surfaceOp: "append" },
        );
        session.append("turn/end", { turn, reason: { kind: "completed" } });
        await ctx.sessions.flush(session);
      }
    }
    demo.nativeReady = true;
    project.demo = { ...demo };
  });
}
