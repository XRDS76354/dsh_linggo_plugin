import React, { useEffect, useState } from "react";
const h = React.createElement;
export const inject = ["slots", "sessions", "uiWorkspace", "connection"];
const style = `
html[data-linggo] div:has(> [data-rightbar-col]){padding-left:var(--linggo-width,65%);grid-template-columns:0 minmax(0,1fr) 0!important;}
html[data-linggo] div:has(> [data-rightbar-col])>:first-child{display:none;}
.linggo-workspace{position:fixed;inset:0 auto 0 0;width:var(--linggo-width,65%);z-index:30;pointer-events:auto;display:grid;grid-template-columns:230px minmax(0,1fr);background:#f7f9fc;color:#243348;font:14px system-ui;}
.linggo-workspace aside{padding:20px;border-right:1px solid #dce2eb;overflow:auto;background:white;}
.linggo-workspace main{display:flex;align-items:center;justify-content:center;padding:28px;text-align:center;}
.linggo-workspace button,.linggo-entry{padding:8px 12px;border:1px solid #ccd6e3;border-radius:7px;background:white;color:#263e62;cursor:pointer;margin:4px;}
.linggo-workspace button:disabled{opacity:.5;cursor:wait;}
.linggo-workspace small{display:block;color:#65748b;line-height:1.7;}
.linggo-workspace input,.linggo-workspace textarea,.linggo-workspace select{width:100%;box-sizing:border-box;padding:8px;margin:5px 0;border:1px solid #bbc8d8;border-radius:5px;}
.linggo-entry{position:fixed;right:20px;top:12px;z-index:50;pointer-events:auto;}
.linggo-error{color:#a62828;white-space:pre-wrap;}
.linggo-inbox{position:fixed;right:16px;top:60px;width:340px;max-height:70vh;overflow:auto;background:white;color:#243348;padding:16px;box-shadow:0 5px 24px #0003;pointer-events:auto;z-index:51;}
@media(max-width:950px){html[data-linggo]{--linggo-width:55%;}.linggo-workspace{grid-template-columns:160px minmax(0,1fr);}.linggo-workspace aside{padding:10px;}}
`;
function Workbench({ api, open, useSessions }) {
  const [state, setState] = useState({ projects: [], handoffs: [] }),
    [project, setProject] = useState(""),
    [name, setName] = useState(""),
    [summary, setSummary] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false);
  const selectedCwd = useSessions(
    (snapshot) =>
      Object.values(snapshot.byId).find(
        (row) => (row.retainedBy?.mainView ?? 0) > 0,
      )?.cwd ?? "",
  );
  const presentationSelected =
    !!project &&
    selectedCwd
      .replaceAll("\\", "/")
      .endsWith(`/projects/${project}/presentation`);
  const refresh = () => api("state", {}).then(setState);
  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
  }, []);
  async function perform(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const back = new URL(location.href);
  back.searchParams.delete("linggo");
  return h(
    "section",
    { className: "linggo-workspace" },
    !presentationSelected &&
      h(
        "div",
        {
          style: {
            position: "fixed",
            left: "var(--linggo-width,65%)",
            right: 0,
            top: 0,
            bottom: 0,
            background: "white",
            zIndex: 60,
            display: "grid",
            placeItems: "center",
            padding: 24,
          },
        },
        "请选择项目并新建展示会话；开发对话不会在此展示。",
      ),
    h(
      "aside",
      null,
      h("h2", null, "LingGo"),
      h("p", null, "公交工作台 · 集成预览"),
      h(
        "label",
        null,
        "当前项目",
        h(
          "select",
          { value: project, onChange: (e) => setProject(e.target.value) },
          h("option", { value: "" }, "选择项目"),
          ...state.projects.map((p) =>
            h("option", { key: p.id, value: p.id }, p.name),
          ),
        ),
      ),
      h("input", {
        "aria-label": "新项目名称",
        value: name,
        onChange: (e) => setName(e.target.value),
        placeholder: "城市或区域项目名称",
      }),
      h(
        "button",
        {
          disabled: busy || !name.trim(),
          onClick: () =>
            perform(async () => {
              const p = await api("createProject", { name });
              setProject(p.id);
              setName("");
            }),
        },
        "创建项目",
      ),
      h(
        "button",
        {
          disabled: busy || !project,
          onClick: () => perform(() => open(project, "presentation")),
        },
        "新建展示会话",
      ),
      h("h3", null, "数据与任务"),
      h("small", null, "尚未开放数据导入：先完成 DSH 集成验收。"),
      h("h3", null, "交接给开发工作台"),
      h("textarea", {
        "aria-label": "开发任务摘要",
        value: summary,
        onChange: (e) => {
          setSummary(e.target.value);
          setPreview(false);
        },
        placeholder: "说明想实现或修改的功能",
      }),
      h(
        "button",
        {
          disabled: !project || !summary.trim() || busy,
          onClick: () => setPreview(true),
        },
        "预览交接",
      ),
      preview &&
        h(
          "div",
          null,
          h("p", null, summary),
          h(
            "small",
            null,
            "保存后在 DSH 的开发交接中打开。不会自动发送或执行。",
          ),
          h(
            "button",
            {
              disabled: busy,
              onClick: () =>
                perform(async () => {
                  await api("handoff", { projectId: project, summary });
                  setSummary("");
                  setPreview(false);
                }),
            },
            "确认保存交接",
          ),
        ),
      h(
        "p",
        null,
        h(
          "a",
          { href: back.href, target: "_blank", rel: "noopener" },
          "DSH Web 工作台",
        ),
      ),
      h("a", { href: "dsh://open" }, "唤起 DSH 桌面"),
      error && h("p", { className: "linggo-error", role: "alert" }, error),
    ),
    h(
      "main",
      null,
      h(
        "div",
        null,
        h("h2", null, "你的公交数据工作空间"),
        h("p", null, "地图与分析将在接入数据后启用。"),
        h("small", null, "右侧复用 DSH 原生对话。请先选择项目并新建展示会话。"),
      ),
    ),
  );
}
function Entry({ api, open }) {
  const [visible, setVisible] = useState(false),
    [state, setState] = useState({ handoffs: [] }),
    [error, setError] = useState("");
  const url = new URL(location.href);
  url.searchParams.set("linggo", "1");
  const desktop = location.protocol === "file:";
  return h(
    React.Fragment,
    null,
    h(
      "div",
      { className: "linggo-entry" },
      desktop
        ? h(
            "span",
            { title: "桌面到独立浏览器的共享 Host 连接尚待验证" },
            "公交工作台：桌面桥接待验证",
          )
        : h(
            "a",
            { href: url.href, target: "_blank", rel: "noopener" },
            "公交工作台 ↗",
          ),
      h(
        "button",
        {
          onClick: async () => {
            setVisible(!visible);
            try {
              setState(await api("state", {}));
            } catch (e) {
              setError(String(e));
            }
          },
        },
        "开发交接",
      ),
    ),
    visible &&
      h(
        "section",
        { className: "linggo-inbox" },
        h("h3", null, "开发交接"),
        error && h("p", { role: "alert" }, error),
        ...state.handoffs.map((item) =>
          h(
            "article",
            { key: item.id },
            h("p", null, item.summary),
            h(
              "button",
              {
                onClick: async () => {
                  try {
                    await open(item.projectId, "development");
                    await navigator.clipboard.writeText(item.summary);
                    setError("已打开开发会话并复制摘要，请粘贴检查后发送。");
                  } catch (e) {
                    setError(String(e));
                  }
                },
              },
              "打开开发会话并复制摘要",
            ),
          ),
        ),
      ),
  );
}
export function apply(ctx) {
  const enabled = new URLSearchParams(location.search).get("linggo") === "1";
  const api = async (endpoint, payload) => {
    const r = await ctx.connection.rpc.call(
      "/api",
      `linggo.${endpoint}`,
      payload,
    );
    if (!r.ok) throw Error(r.error.message);
    return r.value;
  };
  const open = async (projectId, mode) => {
    const { cwd } = await api("directory", { projectId, mode });
    const id = await ctx.sessions.create({ cwd });
    ctx.uiWorkspace.openSession(id);
  };
  ctx.effect(() => {
    if (enabled) document.documentElement.setAttribute("data-linggo", "");
    const el = document.createElement("style");
    el.textContent = style;
    document.head.append(el);
    return () => {
      el.remove();
      document.documentElement.removeAttribute("data-linggo");
    };
  });
  ctx.slots.inject("shell.overlay", () =>
    ctx.slots.register(
      {
        name: "shell.overlay",
        id: enabled ? "linggo-workspace" : "linggo-entry",
        inject: () => ({ api, open }),
      },
      enabled ? Workbench : Entry,
    ),
  );
}
