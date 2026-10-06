import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { zh, en } from "./locales.js";
import {
  DataSummary,
  ImportWizard,
  MapView,
  SettingsView,
  dataStyle,
} from "./data.jsx";
import { mapStyle } from "./map-view.jsx";
import { AnalysisView, analysisStyle } from "./analysis.jsx";
import {
  createClientAdapter,
  installPresentationStyle,
  FRAME_SELECTOR,
} from "./compat-client.js";
import {
  useWorkbenchLayout,
  Splitter,
  SideSection,
  Modal,
  workbenchStyle,
} from "./workbench-ui.jsx";
const h = React.createElement;

export const inject = [
  "slots",
  "sessions",
  "workspaces",
  "uiWorkspace",
  "connection",
  "conversation",
  "layout",
  "locale",
];

const NS = "linggo";
const FRAME = FRAME_SELECTOR;
const LAST_PROJECT = "linggo.project";

const style = `
html[data-linggo]{--linggo-width:64%;}
html[data-linggo] ${FRAME}{padding-left:var(--linggo-width);grid-template-columns:0 minmax(0,1fr) 0!important;}
html[data-linggo] ${FRAME}>:first-child{visibility:hidden;}
html[data-linggo] ${FRAME}>:nth-child(2){grid-column:2;}
html[data-linggo] ${FRAME}>[data-side]{display:none;}
html[data-linggo] [data-rightbar-col],html[data-linggo] [aria-label="打开右侧边栏"],html[data-linggo] [aria-label="Open right sidebar"]{display:none!important;}
html[data-linggo][data-linggo-blocked] ${FRAME}>:nth-child(2),html[data-linggo][data-linggo-chat-closed] ${FRAME}>:nth-child(2){visibility:hidden;}
.linggo-root{--c-bg:var(--dsw-alias-bg-base,#fff);--c-side:var(--dsw-specific-sidebar-fill,#f6f7f9);--c-text:var(--dsw-alias-label-primary,#1f2329);--c-sub:var(--dsw-alias-label-secondary,#646a73);--c-cap:var(--dsw-alias-label-tertiary,#8f959e);--c-line:var(--dsw-alias-border-l3,#e4e6eb);--c-hover:var(--dsw-alias-interactive-bg-hover,#0000000d);--c-accent:var(--dsw-alias-state-business-primary,#3c6df0);--c-err:var(--dsw-alias-state-error-primary,#d83931);color:var(--c-text);font-family:var(--dsw-font-family,system-ui);font-size:13px;line-height:1.5;}
.linggo-root *{box-sizing:border-box;}
.linggo-root h2{font-size:15px;margin:0 0 4px;}
.linggo-root h3{font-size:12px;font-weight:600;color:var(--c-sub);margin:18px 0 6px;text-transform:none;}
.linggo-root small,.linggo-cap{display:block;color:var(--c-cap);font-size:12px;}
.linggo-root button,.linggo-root .linggo-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border:1px solid var(--c-line);border-radius:var(--dsw-radius-md,8px);background:var(--c-bg);color:var(--c-text);cursor:pointer;font:inherit;text-decoration:none;margin:2px 4px 2px 0;}
.linggo-root button:hover,.linggo-root .linggo-btn:hover{background:var(--c-hover);}
.linggo-root button.primary{background:var(--c-accent);border-color:var(--c-accent);color:#fff;}
.linggo-root button:disabled{opacity:.5;cursor:default;}
.linggo-root input,.linggo-root textarea,.linggo-root select{width:100%;padding:6px 8px;margin:4px 0;border:1px solid var(--c-line);border-radius:var(--dsw-radius-sm,6px);background:var(--c-bg);color:var(--c-text);font:inherit;}
.linggo-root textarea{min-height:72px;resize:vertical;}
.linggo-error{color:var(--c-err);white-space:pre-wrap;}
.linggo-note{color:var(--c-sub);}
.linggo-list{list-style:none;margin:0;padding:0;}
.linggo-list li{padding:6px 8px;border-radius:var(--dsw-radius-sm,6px);cursor:pointer;display:flex;justify-content:space-between;gap:8px;}
.linggo-list li:hover{background:var(--c-hover);}
.linggo-list li[aria-current="true"]{background:var(--c-hover);font-weight:600;}
.linggo-list li span:last-child{color:var(--c-cap);font-size:12px;white-space:nowrap;}
.linggo-card{border:1px solid var(--c-line);border-radius:var(--dsw-radius-md,8px);padding:10px;margin:8px 0;}
.linggo-workspace{position:fixed;inset:0 auto 0 0;width:var(--linggo-width);pointer-events:auto;display:grid;grid-template-columns:260px minmax(0,1fr);background:var(--c-bg);border-right:1px solid var(--c-line);}
.linggo-workspace>aside{padding:16px;padding-top:max(16px,var(--dsh-frame-top-clearance,0px));border-right:1px solid var(--c-line);overflow:auto;background:var(--c-side);}
.linggo-workspace>main{overflow:auto;padding:24px;padding-top:max(24px,var(--dsh-frame-top-clearance,0px));}
.linggo-empty{max-width:520px;margin:12vh auto 0;text-align:left;}
.linggo-empty ul{color:var(--c-sub);padding-left:18px;}
.linggo-cover{position:fixed;top:0;bottom:0;left:var(--linggo-width);right:0;pointer-events:auto;display:grid;place-items:center;padding:24px;background:var(--c-bg);}
.linggo-cover>div{max-width:360px;text-align:center;}
.linggo-tabs{display:none;}
.linggo-panel{height:100%;overflow:auto;padding:24px 32px;padding-top:max(24px,var(--dsh-frame-top-clearance,0px));max-width:860px;}
@media(max-width:899px){
  html[data-linggo]{--linggo-width:0px;}
  html[data-linggo] ${FRAME}{padding-top:44px;}
  .linggo-tabs{display:flex;position:fixed;top:0;left:0;right:0;height:44px;align-items:center;justify-content:center;gap:4px;background:var(--c-side);border-bottom:1px solid var(--c-line);pointer-events:auto;}
  .linggo-tabs button[aria-pressed="true"]{background:var(--c-hover);font-weight:600;}
  .linggo-workspace{top:44px;width:100%;grid-template-columns:1fr;grid-template-rows:auto 1fr;overflow:auto;}
  .linggo-workspace>aside{border-right:0;border-bottom:1px solid var(--c-line);padding-top:16px;}
  html[data-linggo-view="chat"] .linggo-workspace{display:none;}
  html[data-linggo-view="workspace"] ${FRAME}>:nth-child(2){visibility:hidden;}
  .linggo-cover{top:44px;left:0;}
  html[data-linggo-view="workspace"] .linggo-cover{display:none;}
}
${dataStyle}${analysisStyle}${workbenchStyle}${mapStyle}
@media(max-width:899px){html[data-linggo-view="project"] ${FRAME}>:nth-child(2),html[data-linggo-view="map"] ${FRAME}>:nth-child(2){visibility:hidden;}html[data-linggo-view="chat"] .linggo-cover{display:grid;}html:not([data-linggo-view="chat"]) .linggo-cover{display:none;}}`;

const norm = (p) => (p ?? "").replaceAll("\\", "/").replace(/\/+$/, "");
const presentationProject = (cwd) =>
  /\/linggo\/projects\/([\w-]+)\/presentation(\/|$)/.exec(norm(cwd))?.[1];
const when = (iso) => {
  const d = new Date(iso);
  return isNaN(d)
    ? ""
    : d.toLocaleString(undefined, {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};
const sessionTime = (row) =>
  when(
    typeof row.updatedAt === "number"
      ? new Date(row.updatedAt).toISOString()
      : row.updatedAt,
  );

function useAsync(t) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState("");
  const run = async (fn) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const message = await fn();
      if (typeof message === "string") setNote(message);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };
  return {
    error,
    busy,
    note,
    run,
    clear: () => {
      setError("");
      setNote("");
    },
  };
}

function useLinggoState(api, onReset) {
  const [state, setState] = useState({
    projects: [],
    handoffs: [],
    dataVersions: [],
  });
  const [loadError, setLoadError] = useState("");
  const refresh = () =>
    api("state", {}).then(
      (s) => {
        setState(s);
        setLoadError("");
        return s;
      },
      (e) => setLoadError(e.message),
    );
  useEffect(() => {
    refresh();
    return onReset(refresh);
  }, []);
  return { state, refresh, loadError };
}

function contextLines(t, handoff, state) {
  const c = handoff.context ?? {};
  const version = state.dataVersions?.find((v) => v.id === c.dataVersionId);
  return [
    t("ctx.dataVersion", {
      value: version?.label ?? c.dataVersionId ?? t("ctx.none"),
    }),
    t("ctx.scenario", { value: c.scenarioId ?? t("ctx.none") }),
    t("ctx.results", {
      value: c.resultRefs?.length ? c.resultRefs.join(", ") : t("ctx.none"),
    }),
  ];
}

export function draftPrompt(t, handoff, project, state) {
  return [
    t("draft.title", { name: project?.name ?? handoff.projectId }),
    "",
    handoff.summary,
    "",
    t("draft.context"),
    `- ${t("draft.project", { name: project?.name ?? "", id: handoff.projectId })}`,
    ...contextLines(t, handoff, state).map((line) => `- ${line}`),
    handoff.sourceSessionId
      ? `- ${t("draft.source", { id: handoff.sourceSessionId })}`
      : "",
    "",
    t("draft.footer"),
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}

/* ----------------------------- Three-column presentation page ----------------------------- */

function Workbench({
  t,
  api,
  onReset,
  newPresentation,
  openSession,
  ensureProjectWorkspaces,
  useSessions,
  useWorkspaces,
}) {
  const { state, refresh, loadError } = useLinggoState(api, onReset);
  const { error, busy, note, run, clear } = useAsync(t);
  const projectRef = useRef("");
  const [project, setProjectRaw] = useState(
    () => localStorage.getItem(LAST_PROJECT) ?? "",
  );
  projectRef.current = project;
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [preview, setPreview] = useState(false);
  const [view, setView] = useState("map");
  const layout = useWorkbenchLayout(view);
  const [projectDialog, setProjectDialog] = useState(false);
  const [handoffDialog, setHandoffDialog] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [tab, setTab] = useState("map");
  const [jobs, setJobs] = useState([]);
  const [runId, setRunId] = useState(null);
  const [proposalCount, setProposalCount] = useState(0);
  const sessions = useSessions((s) => s);
  const archived = useWorkspaces((s) => s.archivedSessionIds);
  const setProject = (id) => {
    setProjectRaw(id);
    localStorage.setItem(LAST_PROJECT, id);
  };
  const current = useMemo(
    () =>
      Object.values(sessions.byId).find(
        (row) => (row.retainedBy?.mainView ?? 0) > 0,
      ),
    [sessions],
  );
  const currentProject = presentationProject(current?.cwd);
  const known = state.projects.some((p) => p.id === project);
  const selected = state.projects.find((p) => p.id === project);
  const blocked = !known || currentProject !== project;
  const history = useMemo(
    () =>
      sessions.ids
        .map((id) => sessions.byId[id])
        .filter(
          (row) =>
            row &&
            row.origin !== "subagent" &&
            presentationProject(row.cwd) === project &&
            !archived.includes(row.id) &&
            (!row.blank || row.id === current?.id),
        )
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    [sessions, archived, project, current?.id],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (blocked) root.setAttribute("data-linggo-blocked", "");
    else root.removeAttribute("data-linggo-blocked");
    return () => {
      root.removeAttribute("data-linggo-blocked");
    };
  }, [blocked, view]);

  // A stale stored project (deleted, other DSH home) falls back to the first one.
  useEffect(() => {
    if (state.projects.length && !known) setProject(state.projects[0].id);
  }, [state.projects, known]);

  const params = new URLSearchParams(location.hash.slice(1));
  const devUrl = new URL(location.href);
  devUrl.hash = "";
  devUrl.searchParams.delete("linggo");

  const restore = () =>
    history[0] ? openSession(history[0].id) : newPresentation(project);
  const versions = state.dataVersions.filter((v) => v.projectId === project);
  const currentVersion =
    versions.find((v) => v.id === selected?.currentVersionId) ??
    versions.at(-1);

  // Jobs poll while one runs; a finished import refreshes the published versions.
  const refreshJobs = () =>
    known
      ? api("jobs", { projectId: project }).then(
          (list) => {
            if (projectRef.current === project) setJobs(list);
          },
          () => {},
        )
      : Promise.resolve();
  const running = jobs.some((j) => j.status === "running");
  useEffect(() => {
    setJobs([]);
    refreshJobs();
  }, [project, known]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      const list = await api("jobs", { projectId: project }).catch(() => null);
      if (!list || projectRef.current !== project) return;
      setJobs(list);
      if (!list.some((j) => j.status === "running")) refresh();
    }, 1000);
    return () => clearInterval(timer);
  }, [running, project]);

  // Proposals from the presentation agent show as a count on the analysis tab.
  useEffect(() => {
    setRunId(null);
    if (!known) return;
    let stop = false,
      timer;
    const poll = async () => {
      await api("proposals", { projectId: project }).then(
        (list) => {
          if (!stop && projectRef.current === project)
            setProposalCount(list.length);
        },
        () => {},
      );
      if (!stop) timer = setTimeout(poll, 3000);
    };
    poll();
    return () => ((stop = true), clearTimeout(timer));
  }, [project, known]);

  const filteredHistory = history.filter((row) =>
    (row.displayTitle || t("wb.untitled"))
      .toLowerCase()
      .includes(sessionSearch.toLowerCase()),
  );
  const sessionRows = filteredHistory.map((row) =>
    h(
      "li",
      {
        key: row.id,
        "aria-current": row.id === current?.id ? "true" : undefined,
        title: row.displayTitle || t("wb.untitled"),
        tabIndex: 0,
        onClick: () => {
          openSession(row.id);
          setView("chat");
        },
        onKeyDown: (e) =>
          e.key === "Enter" && (openSession(row.id), setView("chat")),
      },
      h("span", { className: "linggo-session-title" }, row.displayTitle || t("wb.untitled")),
      h(
        "span",
        { className: "linggo-session-meta" },
        row.running ? h("span", { className: "running" }, "●") : sessionTime(row),
      ),
    ),
  );
  const aside = h(
    "aside",
    { "aria-label": t("ui.projectPanel") },
    !layout.geometry.mobile && layout.geometry.left <= 48
      ? h(
          "div",
          { className: "linggo-icon-rail" },
          h("b", null, "L"),
          h(
            "button",
            {
              title: t("ui.expand"),
              onClick: () => layout.update({ ...layout.prefs, leftOpen: true }),
            },
            "›",
          ),
          h(
            "button",
            {
              title: t("ui.addProject"),
              onClick: () => setProjectDialog(true),
            },
            "+",
          ),
          h(
            "button",
            {
              title: t("wb.newSession"),
              disabled: !known,
              onClick: () => run(() => newPresentation(project)),
            },
            "✎",
          ),
          h(
            "button",
            {
              title: t("wb.handoff"),
              disabled: !known,
              onClick: () => setHandoffDialog(true),
            },
            "↗",
          ),
        )
      : h(
          React.Fragment,
          null,
          h(
            "div",
            { className: "linggo-brand" },
            h(
              "div",
              { className: "linggo-brand-text" },
              h("strong", null, "LingGo"),
              h("small", null, t("wb.subtitle")),
            ),
            h(
              "button",
              {
                title: t("ui.addProject"),
                onClick: () => setProjectDialog(true),
              },
              "+",
            ),
          ),
          h(
            "div",
            { className: "linggo-project-picker" },
            state.projects.length
              ? h(
                  "select",
                  {
                    "aria-label": t("wb.project"),
                    value: project,
                    onChange: (e) => setProject(e.target.value),
                  },
                  ...state.projects.map((p) =>
                    h("option", { key: p.id, value: p.id }, p.name),
                  ),
                )
              : h("small", null, t("wb.noProject")),
          ),
          h(
            "div",
            { className: "linggo-sidebar-body" },
            h(
              SideSection,
              {
                id: "sessions",
                title: t("wb.sessions"),
                badge: history.length ? String(history.length) : "",
                icon: h(Icon, { name: "message", size: 16 }),
                className: "linggo-session-section",
                initial: true,
                actions: h(
                  React.Fragment,
                  null,
                  h(
                    "button",
                    {
                      title: t("ui.searchSessions"),
                      "aria-label": t("ui.searchSessions"),
                      onClick: () => setSearchOpen((v) => !v),
                    },
                    h(Icon, { name: "search", size: 15 }),
                  ),
                  h(
                    "button",
                    {
                      title: t("wb.newSession"),
                      "aria-label": t("wb.newSession"),
                      disabled: busy || !known,
                      onClick: () => run(() => newPresentation(project)),
                    },
                    h(Icon, { name: "plus", size: 16 }),
                  ),
                ),
              },
              searchOpen &&
                h("input", {
                  className: "linggo-inline-search",
                  "aria-label": t("ui.searchSessions"),
                  placeholder: t("ui.searchSessions"),
                  value: sessionSearch,
                  onChange: (e) => setSessionSearch(e.target.value),
                }),
              h(
                "ul",
                { className: "linggo-list", "aria-label": t("wb.sessions") },
                ...sessionRows,
              ),
              !filteredHistory.length && h("small", null, t("wb.noSessions")),
            ),
            known &&
              h(DataSummary, {
                t,
                api,
                project,
                state,
                jobs,
                refresh,
                refreshJobs,
                run,
                busy,
                openImport: () => (setTab("import"), setView("map")),
              }),
          ),
          h(
            "div",
            { className: "linggo-sidebar-footer" },
            h(
              "button",
              { disabled: !known, onClick: () => setHandoffDialog(true) },
              "↗ " + t("wb.handoff"),
            ),
            h(
              "a",
              {
                className: "linggo-btn",
                href: devUrl.href,
                target: "_blank",
                rel: "noopener",
              },
              t("wb.devWeb"),
            ),
            params.get("desktopReturn") === "1" &&
              h(
                "a",
                { className: "linggo-btn", href: "dsh://open" },
                t("wb.devDesktop"),
              ),
          ),
        ),
  );

  const dialogs = h(
    React.Fragment,
    null,
    projectDialog &&
      h(
        Modal,
        {
          title: t("ui.addProject"),
          closeLabel: t("common.cancel"),
          onClose: () => setProjectDialog(false),
        },
        h("input", {
          autoFocus: true,
          "aria-label": t("wb.newProjectName"),
          placeholder: t("wb.newProjectName"),
          maxLength: 100,
          value: name,
          onChange: (e) => setName(e.target.value),
        }),
        h(
          "button",
          {
            className: "primary",
            disabled: busy || !name.trim(),
            onClick: () =>
              run(async () => {
                const p = await api("createProject", { name });
                await refresh();
                setProject(p.id);
                // Both presentation and development folders show up in DSH immediately.
                await ensureProjectWorkspaces(p.id);
                setName("");
                setProjectDialog(false);
              }),
          },
          t("wb.createProject"),
        ),
      ),
    handoffDialog &&
      h(
        Modal,
        {
          title: t("wb.handoff"),
          closeLabel: t("common.cancel"),
          onClose: () => setHandoffDialog(false),
        },
        h("textarea", {
          autoFocus: true,
          "aria-label": t("wb.handoffSummary"),
          placeholder: t("wb.handoffPlaceholder"),
          maxLength: 4000,
          value: summary,
          onChange: (e) => {
            setSummary(e.target.value);
            setPreview(false);
          },
        }),
        !preview
          ? h(
              "button",
              {
                disabled: !summary.trim() || busy,
                onClick: () => setPreview(true),
              },
              t("wb.preview"),
            )
          : h(
              "div",
              {
                className: "linggo-card",
                role: "region",
                "aria-label": t("wb.previewTitle"),
              },
              h("strong", null, t("wb.previewTitle")),
              h("p", null, summary),
              h(
                "small",
                null,
                selected?.name,
                h("br"),
                ...contextLines(
                  t,
                  { context: { dataVersionId: currentVersion?.id } },
                  state,
                ).flatMap((line) => [line, h("br")]),
              ),
              h("p", { className: "linggo-note" }, t("wb.previewNote")),
              h(
                "button",
                {
                  className: "primary",
                  disabled: busy,
                  onClick: () =>
                    run(async () => {
                      await api("handoff", {
                        projectId: project,
                        summary,
                        context: { dataVersionId: currentVersion?.id },
                        sourceSessionId:
                          currentProject === project ? current?.id : undefined,
                      });
                      setSummary("");
                      setPreview(false);
                      setHandoffDialog(false);
                      await refresh();
                      return t("wb.handoffSaved");
                    }),
                },
                t("wb.confirm"),
              ),
            ),
      ),
  );

  const missing = currentVersion
    ? (currentVersion.missing ?? [])
    : ["routes", "stops", "timetable", "ridership"];
  const empty = h(
    "div",
    { className: "linggo-empty" },
    h("h2", null, selected ? selected.name : t("wb.welcome")),
    h("p", { className: "linggo-note" }, t("wb.mapNoData")),
    h("ul", null, ...missing.map((k) => h("li", { key: k }, t("need." + k)))),
    known &&
      h(
        "button",
        { className: "primary", onClick: () => setTab("import") },
        t("data.import"),
      ),
    h("small", null, t("wb.mapHint")),
  );
  const main = h(
    "main",
    { "aria-label": t("wb.map") },
    h(
      "nav",
      { className: "linggo-toolbar" },
      h(
        "div",
        { className: "linggo-tabbar" },
        ...["map", "analysis"].map((k) =>
          h(
            "button",
            { key: k, "aria-pressed": tab === k, onClick: () => setTab(k) },
            k === "analysis" && proposalCount
              ? t("tab.analysisCount", { n: String(proposalCount) })
              : t("tab." + k),
          ),
        ),
      ),
      h("span", { className: "linggo-toolbar-spacer" }),
      ...["import", "settings"].map((k) =>
        h(
          "button",
          {
            key: k,
            className: "quiet",
            disabled: k === "import" && !known,
            "aria-pressed": tab === k,
            onClick: () => setTab(k),
          },
          t("tab." + k),
        ),
      ),
      h(
        "button",
        {
          className: "quiet",
          title: t("ui.maxMap"),
          "aria-label": t("ui.maxMap"),
          onClick: () =>
            layout.setFocus(layout.focus === "map" ? "normal" : "map"),
        },
        layout.focus === "map" ? "↙" : "⤢",
      ),
      h(
        "button",
        {
          className: "quiet",
          title: t("ui.resetLayout"),
          "aria-label": t("ui.resetLayout"),
          onClick: layout.reset,
        },
        "↺",
      ),
    ),
    h(
      "div",
      { className: "linggo-main-content " + (tab === "map" ? "map" : "") },
      tab === "import" && known
        ? h(ImportWizard, {
            key: project,
            t,
            api,
            project,
            onCancel: () => setTab("map"),
            onDone: () => {
              setTab("map");
              refreshJobs();
            },
          })
        : tab === "settings"
          ? h(SettingsView, { t, api })
          : tab === "analysis" && known
            ? h(AnalysisView, {
                key: project,
                t,
                api,
                project,
                version: currentVersion,
                jobs,
                refreshJobs,
                run,
                busy,
                onShowRun: (id) => (setRunId(id), setTab("map")),
              })
            : currentVersion
              ? h(
                  React.Fragment,
                  null,
                  (missing.length > 0 || currentVersion.warnings?.length > 0) &&
                    h(
                      "details",
                      { className: "linggo-quality" },
                      h(
                        "summary",
                        null,
                        t("ui.quality", {
                          missing: String(missing.length),
                          warnings: String(
                            currentVersion.warnings?.length ?? 0,
                          ),
                        }),
                      ),
                      h(
                        "ul",
                        null,
                        missing.length > 0 &&
                          h(
                            "li",
                            null,
                            t("map.missing", {
                              list: missing
                                .map((k) => t("need." + k))
                                .join("、"),
                            }),
                          ),
                        ...(currentVersion.warnings ?? []).map((w, i) =>
                          h("li", { key: i }, w),
                        ),
                      ),
                    ),
                  h(MapView, {
                    key: project + "/" + currentVersion.id,
                    t,
                    api,
                    project,
                    versionId: currentVersion.id,
                    hasTrips: !!currentVersion.entities?.trips,
                    runId,
                    onRun: setRunId,
                  }),
                )
              : empty,
    ),
  );

  return h(
    "div",
    { className: "linggo-root" },
    h(
      "nav",
      { className: "linggo-tabs", "aria-label": "LingGo" },
      h(
        "button",
        {
          "aria-pressed": view === "project",
          onClick: () => setView("project"),
        },
        t("ui.projectPanel"),
      ),
      h(
        "button",
        { "aria-pressed": view === "map", onClick: () => setView("map") },
        t("tab.map"),
      ),
      h(
        "button",
        { "aria-pressed": view === "chat", onClick: () => setView("chat") },
        t("wb.tabChat"),
      ),
    ),
    h(
      "section",
      { className: "linggo-workspace" },
      aside,
      h(Splitter, { side: "left", layout, t }),
      main,
    ),
    layout.focus === "normal" && h(Splitter, { side: "right", layout, t }),
    !layout.prefs.chatOpen &&
      layout.focus === "normal" &&
      h(
        "div",
        { className: "linggo-chat-rail" },
        h(
          "button",
          {
            title: t("ui.toggleChat"),
            onClick: () => layout.update({ ...layout.prefs, chatOpen: true }),
          },
          "‹",
        ),
        h("span", null, t("wb.chat")),
      ),
    layout.focus !== "map" &&
      layout.prefs.chatOpen &&
      h(
        "div",
        { className: "linggo-chat-controls" },
        h(
          "button",
          {
            "aria-label": t("ui.maxChat"),
            onClick: () =>
              layout.setFocus(layout.focus === "chat" ? "normal" : "chat"),
          },
          layout.focus === "chat" ? "↙" : "⤢",
        ),
      ),
    dialogs,
    (error || loadError || note) &&
      h(
        "div",
        {
          className: "linggo-toast",
          role: error || loadError ? "alert" : "status",
        },
        error || loadError || note,
        h("button", { onClick: clear }, "×"),
      ),
    blocked &&
      (layout.focus !== "map" || layout.geometry.mobile) &&
      (layout.prefs.chatOpen ||
        layout.focus === "chat" ||
        layout.geometry.mobile) &&
      h(
        "div",
        {
          className: "linggo-cover",
          role: "region",
          "aria-label": t("wb.chat"),
        },
        h(
          "div",
          null,
          h("h2", null, t("cover.title")),
          h(
            "p",
            { className: "linggo-note" },
            known ? t("cover.body") : t("cover.noProject"),
          ),
          known &&
            h(
              "button",
              {
                className: "primary",
                disabled: busy,
                onClick: () => run(restore),
              },
              history[0] ? t("cover.restore") : t("wb.newSession"),
            ),
          known &&
            history[0] &&
            h(
              "button",
              {
                disabled: busy,
                onClick: () => run(() => newPresentation(project)),
              },
              t("wb.newSession"),
            ),
        ),
      ),
  );
}

/* ----------------------------- DSH development page panel ----------------------------- */

function PanelIcon({ size = 20 }) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      "aria-hidden": true,
    },
    h("rect", { x: 4, y: 3.5, width: 16, height: 14, rx: 3 }),
    h("path", { d: "M4 11h16M8 21l1.5-3.5M16 21l-1.5-3.5" }),
    h("circle", { cx: 8.5, cy: 14.5, r: 0.8, fill: "currentColor" }),
    h("circle", { cx: 15.5, cy: 14.5, r: 0.8, fill: "currentColor" }),
  );
}

function DevPanel({ t, api, onReset, openHandoff, capabilities, useSessions }) {
  const { state, refresh, loadError } = useLinggoState(api, onReset);
  const { error, busy, note, run, clear } = useAsync(t);
  const [showArchived, setShowArchived] = useState(false);
  const known = useSessions((s) => s.byId);
  const desktop =
    location.protocol !== "http:" && location.protocol !== "https:";
  const [launch, setLaunch] = useState("");
  const webUrl = new URL(location.href);
  webUrl.hash = "linggo=1";
  const fetchLaunch = () =>
    api("launch", { desktop: true }).then(
      (r) => setLaunch(r.url),
      () => setLaunch(""),
    );
  useEffect(() => {
    if (desktop) fetchLaunch();
  }, []);
  const projects = Object.fromEntries(state.projects.map((p) => [p.id, p]));
  const handoffs = state.handoffs
    .filter((x) => showArchived || !x.archivedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return h(
    "div",
    { className: "linggo-root linggo-panel" },
    h("h2", null, t("dev.title")),
    h("p", { className: "linggo-note" }, t("dev.intro")),
    desktop
      ? h(
          "a",
          {
            className: "linggo-btn",
            href: launch || undefined,
            target: "_blank",
            rel: "noopener noreferrer",
            "aria-disabled": !launch,
            // Authenticated links are single-use; prepare the next one after each click.
            onClick: () => setTimeout(fetchLaunch, 500),
          },
          launch ? t("dev.openBrowser") : t("dev.connecting"),
        )
      : h(
          "a",
          {
            className: "linggo-btn",
            href: webUrl.href,
            target: "_blank",
            rel: "noopener",
          },
          t("dev.openWeb"),
        ),
    h("h3", null, t("dev.projects", { count: String(state.projects.length) })),
    state.projects.length
      ? h("small", null, state.projects.map((p) => p.name).join(" · "))
      : h("small", null, t("dev.noProjects")),
    h(
      "h3",
      null,
      t("dev.inbox"),
      " ",
      h(
        "label",
        { style: { fontWeight: 400 } },
        h("input", {
          type: "checkbox",
          style: { width: "auto" },
          checked: showArchived,
          onChange: (e) => setShowArchived(e.target.checked),
        }),
        " ",
        t("dev.showArchived"),
      ),
    ),
    !handoffs.length && h("small", null, t("dev.empty")),
    ...handoffs.map((item) => {
      const reuse = item.devSessionId && known[item.devSessionId];
      return h(
        "article",
        { key: item.id, className: "linggo-card" },
        h(
          "small",
          null,
          `${projects[item.projectId]?.name ?? item.projectId} · ${when(item.createdAt)}${item.archivedAt ? " · " + t("dev.archived") : ""}`,
        ),
        h(
          "p",
          { style: { whiteSpace: "pre-wrap", margin: "6px 0" } },
          item.summary,
        ),
        h("small", null, contextLines(t, item, state).join(" · ")),
        !capabilities.draftInitialization &&
          h("p", { className: "linggo-note" }, t("dev.manualDraft")),
        h(
          "details",
          { open: !capabilities.draftInitialization },
          h("summary", null, t("dev.handoffContent")),
          h("textarea", {
            readOnly: true,
            "aria-label": t("dev.handoffContent"),
            value: draftPrompt(t, item, projects[item.projectId], state),
          }),
          h(
            "button",
            {
              disabled: busy,
              onClick: () =>
                run(async () => {
                  await navigator.clipboard.writeText(
                    draftPrompt(t, item, projects[item.projectId], state),
                  );
                  return t("dev.copied");
                }),
            },
            t("dev.copyDraft"),
          ),
        ),
        h(
          "div",
          { style: { marginTop: 8 } },
          h(
            "button",
            {
              className: "primary",
              disabled: busy,
              onClick: () =>
                run(async () => {
                  const outcome = await openHandoff(
                    item,
                    projects[item.projectId],
                    state,
                  );
                  await refresh();
                  return outcome === "manual"
                    ? t("dev.manualOpened")
                    : outcome === "preserved"
                      ? t("dev.preserved")
                      : t("dev.drafted");
                }),
            },
            reuse
              ? t("dev.reopen")
              : t(
                  capabilities.draftInitialization
                    ? "dev.open"
                    : "dev.openManual",
                ),
          ),
          !item.archivedAt &&
            h(
              "button",
              {
                disabled: busy,
                onClick: () =>
                  run(async () => {
                    await api("handoffArchive", { id: item.id });
                    await refresh();
                  }),
              },
              t("dev.archive"),
            ),
        ),
      );
    }),
    (error || loadError) &&
      h("p", { className: "linggo-error", role: "alert" }, error || loadError),
    note && h("p", { className: "linggo-note", role: "status" }, note),
  );
}

/* ----------------------------- Plugin activation ----------------------------- */

export function isWorkbenchLocation(loc = location) {
  return (
    new URLSearchParams(loc.hash.slice(1)).get("linggo") === "1" ||
    new URLSearchParams(loc.search).get("linggo") === "1"
  );
}

export function apply(ctx) {
  const enabled = isWorkbenchLocation();
  ctx.effect(() => ctx.locale.register(NS, { zh, en }));
  const t = ctx.locale.bind(NS);

  const api = async (operation, payload) => {
    const r = await ctx.connection.rpc.call(
      "/api",
      `linggo.${operation}`,
      payload,
    );
    if (!r.ok) throw Error(r.error.message);
    return r.value;
  };
  const resets = new Set();
  ctx.on("connection/reset", () => resets.forEach((fn) => fn()));
  const onReset = (fn) => {
    resets.add(fn);
    return () => resets.delete(fn);
  };

  const adapter = createClientAdapter(ctx, { api, t });
  const { openSession, newPresentation, capabilities } = adapter;
  const openHandoff = (item, project, state) =>
    adapter.openHandoff(item, project, draftPrompt(t, item, project, state));
  ctx.effect(() => installPresentationStyle(document, style, enabled));

  if (enabled) {
    adapter.mountWorkbench(
      {
        t,
        api,
        onReset,
        newPresentation,
        openSession,
        ensureProjectWorkspaces: adapter.ensureProjectWorkspaces,
      },
      Workbench,
    );
  } else {
    adapter.mountDevelopment(
      { t, api, onReset, openHandoff, capabilities },
      DevPanel,
      PanelIcon,
    );
  }
}
