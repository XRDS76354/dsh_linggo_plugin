import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { homedir } from "node:os";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { presentationOf } from "./policy.js";

const supported = new Set([
  ".csv",
  ".tsv",
  ".txt",
  ".xlsx",
  ".xlsm",
  ".geojson",
  ".json",
  ".shp",
  ".zip",
]);
const excluded = new Set([
  "node_modules",
  "venv",
  "__pycache__",
  "artifacts",
  "dist",
  "lib",
  "staging",
  "results",
]);
const json = {
  schema: { type: "json" },
  render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
};
const hash = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (path, cwd) =>
  resolve(
    cwd || process.cwd(),
    path.startsWith("~/") ? join(homedir(), path.slice(2)) : path,
  );
const inside = (root, path) => {
  const rel = relative(root, path);
  return !rel || (!rel.startsWith("..") && !isAbsolute(rel));
};

export const executionSessionId = (exec) =>
  exec?.agent?.id ?? exec?.agent?.session?.id ?? exec?.agent?.sessionId;

export function humanMessages(exec) {
  return (exec?.agent?.session?.log ?? [])
    .filter((e) => e.type === "user/message" && e.data?.source?.kind === "user")
    .map((e) => ({
      id: e.data.id,
      text: (e.data.content ?? [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n"),
    }));
}

export function authorizeImport(exec, path) {
  const cwd = exec?.agent?.session?.header?.cwd;
  const messages = humanMessages(exec);
  if (!executionSessionId(exec) || !cwd)
    throw Error("导入需要原生会话与用户请求上下文");
  if (
    /(不要|停止|取消).{0,8}导入|(?:do not|stop|cancel)\s+import/i.test(
      messages.at(-1)?.text ?? "",
    )
  )
    throw Error("用户已取消导入要求");
  for (const message of messages.slice(-20).reverse()) {
    if (!/导入|import/i.test(message.text)) continue;
    const mentionsPath = [
      path,
      path.startsWith(homedir() + "/") ? path.replace(homedir(), "~") : path,
    ].some((value) => {
      const index = message.text.indexOf(value);
      return (
        index >= 0 &&
        (index + value.length === message.text.length ||
          /[\s"'`，。；、;:：)）]/.test(message.text[index + value.length]))
      );
    });
    const currentFolder =
      inside(canonical(cwd), path) &&
      /当前|这个|本项目|此目录|current|this|here/i.test(message.text);
    if (mentionsPath || currentFolder)
      return {
        messageId: message.id,
        path,
        sessionId: executionSessionId(exec),
      };
  }
  throw Error(
    "请用户明确要求导入该文件／目录，或明确要求导入当前会话目录的数据",
  );
}

/** Bounded directory walk; symlinks are never followed; source bytes are read only. */
export async function scanSources(path, pluginRoot) {
  if (
    inside(pluginRoot, path) &&
    !/[/\\](development|presentation)([/\\]|$)/.test(path)
  )
    throw Error("不能扫描插件管理数据与结果目录");
  const paths = [],
    files = [],
    skipped = [];
  let visited = 0,
    bytes = 0;
  async function walk(target, depth = 0) {
    if (++visited > 10000 || depth > 16)
      throw Error("目录范围过大，请指定较小的数据目录");
    const info = await lstat(target);
    if (info.isSymbolicLink()) {
      skipped.push({ path: target, reason: "符号链接" });
      return;
    }
    if (info.isDirectory()) {
      const entries = await readdir(target);
      if (entries.includes("stops.txt") && entries.includes("stop_times.txt")) {
        paths.push(target);
        for (const name of entries.filter((n) => n.endsWith(".txt")))
          await fingerprint(join(target, name));
        return;
      }
      for (const name of entries.sort()) {
        if (name.startsWith(".") || excluded.has(name)) continue;
        await walk(join(target, name), depth + 1);
      }
    } else if (info.isFile() && supported.has(extname(target).toLowerCase())) {
      paths.push(target);
      await fingerprint(target);
      if (extname(target).toLowerCase() === ".shp") {
        for (const ext of [".shx", ".dbf", ".prj", ".cpg"]) {
          const companion = target.slice(0, -4) + ext;
          if (
            await lstat(companion).then(
              () => true,
              () => false,
            )
          )
            await fingerprint(companion);
        }
      }
    }
  }
  async function fingerprint(file) {
    const info = await lstat(file);
    if (info.isSymbolicLink() || !info.isFile())
      throw Error("不允许读取符号链接或非普通文件");
    bytes += info.size;
    if (bytes > 1024 ** 3 || files.length >= 200)
      throw Error("每批最多 200 个文件、1 GiB，请缩小范围");
    const data = await readFile(file);
    files.push({ path: file, size: data.length, sha256: hash(data) });
  }
  await walk(path);
  if (!paths.length) throw Error("目录内没有支持的数据文件");
  return { paths, files, skipped };
}

export function createBatchImport({ store, jobs, worker, ctx, invalidate }) {
  const sessionId = (exec) => executionSessionId(exec);
  const scope = async (exec, requested) => {
    const state = await store.read();
    const cwd = exec?.agent?.session?.header?.cwd;
    const presentation = presentationOf(store.root, cwd);
    const rel =
      cwd && relative(join(store.root, "projects"), cwd).split(/[\\/]/);
    const bound =
      presentation?.projectId ??
      (rel?.[1] === "development"
        ? rel[0]
        : state.sessionProjects[sessionId(exec)]);
    if (presentation && requested && requested !== bound)
      throw Error("展示会话不能导入其他项目");
    const id = requested ?? bound;
    const project = state.projects.find((p) => p.id === id);
    if (id && !project) throw Error("Unknown project");
    if (
      !bound &&
      project &&
      !state.importPlans.some(
        (p) => p.sessionId === sessionId(exec) && p.projectId === project.id,
      ) &&
      !humanMessages(exec).some(
        (m) => m.text.includes(project.name) || m.text.includes(project.id),
      )
    )
      throw Error("请用户明确选择目标项目，或省略项目以新建项目");
    return { state, project };
  };
  const registerWorkspaces = async (project) => {
    if (!ctx.workspaceController) return { registered: false };
    for (const [mode, suffix] of [
      ["presentation", "展示"],
      ["development", "开发"],
    ]) {
      const value = await ctx.workspaceController.create({
        path: store.projectDir(project.id, mode),
      });
      const workspace = value.workspace ?? value;
      if (!workspace.title || workspace.title === mode)
        await ctx.workspaceController.rename({
          workspaceId: workspace.workspaceId,
          title: `${project.name} · ${suffix}`,
        });
    }
    return { registered: true };
  };
  const prepare = async (args, exec) => {
    const path = canonical(
      args.path || exec?.agent?.session?.header?.cwd,
      exec?.agent?.session?.header?.cwd,
    );
    const grant = authorizeImport(exec, path);
    const { state, project } = await scope(exec, args.project_id);
    const root = await realpath(path);
    if (root !== path && (await lstat(path).then((s) => s.isSymbolicLink())))
      throw Error("请选择真实目录，不使用符号链接");
    const scanned = await scanSources(root, store.root);
    const overrides = args.overrides ?? {};
    const humanText = humanMessages(exec)
      .map((m) => m.text)
      .join("\n")
      .toUpperCase()
      .replace(/[\s_-]/g, "");
    if (args.mode === "append" && !/追加|APPEND/.test(humanText))
      throw Error("追加模式需要用户明确要求");
    for (const mapping of Object.values(overrides)) {
      if (
        mapping.defaults?.direction !== undefined &&
        !/方向|上下行|DIRECTION/.test(humanText)
      )
        throw Error("请用户明确固定方向含义");
    }
    for (const crs of [
      args.crs,
      ...Object.values(overrides).map((m) => m.crs),
    ].filter(Boolean)) {
      if (!humanText.includes(crs.toUpperCase().replace(/[\s_-]/g, "")))
        throw Error("请用户明确坐标系；不能由智能体猜测指定");
    }
    if (
      Object.keys(overrides).some(
        (key) => !scanned.paths.some((p) => key.startsWith(p + "::")),
      )
    )
      throw Error("映射超出本批文件范围");
    let inspection;
    try {
      inspection = await worker(
        {
          cmd: "inspect_batch",
          paths: scanned.paths,
          overrides,
          crs: args.crs,
          baseDir:
            project && store.currentVersion(state, project.id)
              ? store.versionDir(
                  project.id,
                  store.currentVersion(state, project.id).id,
                )
              : null,
          mode: args.mode,
        },
        { signal: exec?.signal },
      );
    } catch (error) {
      return {
        ready: false,
        environmentRequired: /Python|模块|pandas|No module|ENOENT/.test(
          error.message,
        ),
        message: error.message,
        action: "在工作台设置中初始化 Python，然后重新准备导入",
      };
    }
    const plan = {
      id: randomUUID(),
      sessionId: sessionId(exec),
      grant,
      sourceRoot: root,
      ...scanned,
      overrides,
      crs: args.crs,
      mode: args.mode === "append" ? "append" : "replace",
      projectId: project?.id ?? null,
      projectName:
        project?.name ??
        (
          args.project_name ||
          basename((await lstat(root)).isDirectory() ? root : dirname(root))
        ).slice(0, 100),
      baseVersionId: project
        ? (store.currentVersion(state, project.id)?.id ?? null)
        : null,
      inspection,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60_000,
    };
    if (!plan.projectName.trim()) throw Error("请提供项目名称");
    await store.update((s) => {
      s.importPlans = [
        ...s.importPlans.filter((p) => p.expiresAt > Date.now() || p.jobId),
        plan,
      ].slice(-100);
    });
    return {
      planId: plan.id,
      ready: inspection.ready,
      projectId: plan.projectId,
      projectName: plan.projectName,
      mode: plan.mode,
      baseVersionId: plan.baseVersionId,
      files: scanned.files.map((f) => ({ path: f.path, size: f.size })),
      skipped: scanned.skipped,
      ...inspection,
      message: inspection.ready
        ? "整批映射已验证，可直接提交"
        : "请集中确认 issues 后重新准备，不会部分导入",
    };
  };
  const ownedPlan = async (id, exec) => {
    const state = await store.read();
    const plan = state.importPlans.find(
      (p) => p.id === id && p.sessionId === sessionId(exec),
    );
    if (!plan) throw Error("导入计划不存在或不属于当前会话");
    await scope(exec, plan.projectId);
    return plan;
  };
  const commit = async (args, exec) => {
    const plan = await ownedPlan(args.plan_id, exec);
    if (plan.jobId)
      return { jobId: plan.jobId, projectId: plan.projectId, reused: true };
    if (plan.expiresAt < Date.now()) throw Error("导入计划已过期，请重新准备");
    authorizeImport(exec, plan.grant.path);
    if (!plan.inspection.ready) throw Error("请先解决整批导入歧义");
    const scanned = await scanSources(plan.sourceRoot, store.root);
    if (JSON.stringify(scanned.files) !== JSON.stringify(plan.files))
      throw Error("源文件已变化，请重新准备导入");
    let staging, final;
    let project;
    // Reserve the plan once; another client or retry cannot enqueue the same plan twice.
    const reserved = await store.update(async (state) => {
      const stored = state.importPlans.find((p) => p.id === plan.id);
      if (!stored) throw Error("导入计划已失效，请重新准备");
      if (stored.jobId) {
        plan.jobId = stored.jobId;
        plan.projectId = stored.projectId;
        return false;
      }
      project = state.projects.find((p) => p.id === plan.projectId);
      if (!project) {
        project = {
          id: randomUUID(),
          name: plan.projectName,
          createdAt: new Date().toISOString(),
        };
        for (const mode of ["presentation", "development"])
          await mkdir(store.projectDir(project.id, mode), { recursive: true });
        state.projects.push(project);
        stored.projectId = project.id;
      }
      if (
        (store.currentVersion(state, project.id)?.id ?? null) !==
        plan.baseVersionId
      )
        throw Error("当前数据已变化，请重新准备导入");
      stored.jobId = randomUUID();
      plan.jobId = stored.jobId;
      plan.projectId = project.id;
      stored.ownerPid = process.pid;
      return true;
    });
    if (!reserved)
      return { jobId: plan.jobId, projectId: plan.projectId, reused: true };
    let job;
    try {
      job = await jobs.startLocked({
        id: plan.jobId,
        projectId: project.id,
        kind: "import",
        title: `批量导入：${plan.inspection.inputs.filter((i) => !i.skipped).length} 张表`,
        run: async (signal, progress) => {
          const state = await store.read();
          if (
            (store.currentVersion(state, project.id)?.id ?? null) !==
            plan.baseVersionId
          )
            throw Error("当前数据已变化，请重新准备导入");
          const currentFiles = await scanSources(plan.sourceRoot, store.root);
          if (JSON.stringify(currentFiles.files) !== JSON.stringify(plan.files))
            throw Error("源文件已变化，请重新准备导入");
          staging = store.stagingDir(project.id, plan.jobId);
          await mkdir(dirname(staging), { recursive: true });
          const value = await worker(
            {
              cmd: "ingest_batch",
              paths: plan.paths,
              overrides: plan.overrides,
              crs: plan.crs,
              mode: plan.mode,
              baseDir: plan.baseVersionId
                ? store.versionDir(project.id, plan.baseVersionId)
                : null,
              stagingDir: staging,
            },
            { signal, onProgress: progress },
          );
          signal.throwIfAborted();
          const after = await scanSources(plan.sourceRoot, store.root);
          if (JSON.stringify(after.files) !== JSON.stringify(plan.files))
            throw Error("源文件在处理期间变化，本批未发布");
          await registerWorkspaces(project);
          signal.throwIfAborted();
          const id = randomUUID();
          final = store.versionDir(project.id, id);
          await mkdir(dirname(final), { recursive: true });
          await rename(staging, final);
          const manifest = JSON.parse(
            await readFile(join(final, "manifest.json"), "utf8"),
          );
          await store.update((s) => {
            if (
              (store.currentVersion(s, project.id)?.id ?? null) !==
              plan.baseVersionId
            )
              throw Error("当前数据已变化，本批未发布");
            s.dataVersions.push({
              id,
              projectId: project.id,
              parentId: plan.baseVersionId,
              createdAt: new Date().toISOString(),
              entities: Object.fromEntries(
                Object.entries(value.entities).map(([e, v]) => [
                  e,
                  { rows: v.rows },
                ]),
              ),
              bbox: value.bbox,
              missing: value.missing,
              warnings: value.report.warnings,
              imports: value.report.imports,
              sources: manifest.sources,
              provenance: manifest.provenance,
              batchPlanId: plan.id,
            });
            s.projects.find((p) => p.id === project.id).currentVersionId = id;
            s.sessionProjects[plan.sessionId] = project.id;
          });
          final = undefined;
          invalidate(project.id);
          return {
            projectId: project.id,
            versionId: id,
            ...value,
            sourceFilesPreserved: true,
          };
        },
        cleanup: async () => {
          if (staging) await rm(staging, { recursive: true, force: true });
          if (final) await rm(final, { recursive: true, force: true });
        },
      });
    } catch (error) {
      await store.update((s) => {
        const p = s.importPlans.find((p) => p.id === plan.id);
        if (p) delete p.jobId;
      });
      throw error;
    }
    return { jobId: job.id, projectId: project.id, status: job.status };
  };
  const tools = [
    defineTool({
      name: "linggo_projects",
      description:
        "List LingGo target projects and current session binding before import. Presentation sessions see only their project.",
      parameters: {},
      output: json,
      execute: async (_args, exec) => {
        const { state, project } = await scope(exec);
        const presentation = presentationOf(
          store.root,
          exec?.agent?.session?.header?.cwd,
        );
        return {
          currentProjectId: project?.id ?? null,
          projects: state.projects
            .filter((p) => !presentation || p.id === project?.id)
            .map((p) => ({ id: p.id, name: p.name })),
        };
      },
    }),
    defineTool({
      name: "linggo_prepare_import",
      description:
        "Prepare an atomic batch import ONLY after the human explicitly requests the source file/directory or current session directory. Scan recursively, detect all sheets and mappings, return ambiguities; ask about them together. No writes to source files. If ready, call commit directly; preserve manual import UI.",
      parameters: {
        path: {
          type: "string",
          description:
            "Human-authorized local path; omit only for explicitly requested current directory.",
        },
        project_id: { type: "string" },
        project_name: { type: "string" },
        crs: {
          type: "string",
          description:
            "Only supply a CRS specified by the human or source metadata.",
        },
        mode: { type: "string", enum: ["replace", "append"] },
        overrides: {
          type: "object",
          additionalProperties: true,
          description:
            "Human-resolved mapping overrides keyed by absolute-path::sheet, declarative entity/fields/defaults/crs or skip.",
        },
      },
      output: json,
      execute: prepare,
    }),
    defineTool({
      name: "linggo_commit_import",
      description:
        "Publish one ready, authorized batch plan as a background import task. Files/base must remain unchanged. Does not run algorithms or download dependencies.",
      parameters: { plan_id: { type: "string", required: true } },
      output: json,
      execute: commit,
    }),
    defineTool({
      name: "linggo_import_status",
      description:
        "Read the import task for a plan owned by this session. Report errors and imported entity counts; no fabricated success.",
      parameters: { plan_id: { type: "string", required: true } },
      output: json,
      execute: async (args, exec) => {
        const plan = await ownedPlan(args.plan_id, exec);
        const job =
          plan.jobId &&
          (await jobs.list(plan.projectId, true)).find(
            (j) => j.id === plan.jobId,
          );
        return {
          planId: plan.id,
          projectId: plan.projectId,
          job: job ?? null,
          status: job?.status ?? "prepared",
        };
      },
    }),
  ];
  return { tools };
}
