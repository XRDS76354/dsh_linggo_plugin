import React, { useEffect, useMemo, useRef, useState } from "react";
import { SideSection } from "./workbench-ui.jsx";
import { Icon } from "./icons.jsx";
const h = React.createElement;

export const dataStyle = `
.linggo-tabbar{display:flex;gap:2px;border-bottom:1px solid var(--c-line);margin:-8px 0 12px;}
.linggo-tabbar button{border:0!important;border-bottom:2px solid transparent!important;border-radius:0!important;margin:0!important;}
.linggo-tabbar button[aria-pressed="true"]{border-bottom-color:var(--c-accent)!important;font-weight:600;}
.linggo-table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;display:block;overflow:auto;max-height:280px;}
.linggo-table th,.linggo-table td{border:1px solid var(--c-line);padding:3px 6px;text-align:left;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;}
.linggo-table th{background:var(--c-side);position:sticky;top:0;}
.linggo-grid{display:grid;grid-template-columns:120px minmax(0,1fr) 150px;gap:4px 8px;align-items:center;}
.linggo-grid label{font-size:12px;}
.linggo-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.linggo-row>*{flex:1;min-width:120px;}
.linggo-progress{height:4px;background:var(--c-line);border-radius:2px;overflow:hidden;margin:4px 0;}
.linggo-progress>div{height:100%;background:var(--c-accent);}
/* Sidebar data density */
.linggo-section-body .linggo-list li{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:28px;padding:5px 8px;border-radius:8px;}
.linggo-section-body .linggo-list li>button{flex:1;min-width:0;text-align:left;border:0;background:transparent;margin:0;padding:0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.linggo-section-body .linggo-list li>small{flex:none;font-size:11px;color:var(--c-cap);}
.linggo-section-body .linggo-list.nested{margin-left:10px;border-left:1px solid var(--c-line);padding-left:6px;}
.linggo-chip{display:inline-flex;align-items:center;font-size:11px;color:var(--c-sub);background:var(--c-hover);border-radius:999px;padding:1px 8px;flex:none;}
.linggo-chip.ok{color:var(--c-accent);}
`;


const ORDER = [
  "stops",
  "routes",
  "route_stops",
  "trips",
  "ridership",
  "od",
  "demand",
  "gps",
  "vehicles",
  "depots",
];

/* ----------------------------- Left column: versions and jobs ----------------------------- */

export function DataSummary({
  t,
  api,
  project,
  state,
  jobs,
  refresh,
  refreshJobs,
  run,
  busy,
  openImport,
}) {
  const versions = state.dataVersions.filter((v) => v.projectId === project);
  const current =
    state.projects.find((p) => p.id === project)?.currentVersionId ??
    versions.at(-1)?.id;
  const v = versions.find((v) => v.id === current),
    active = jobs.filter((j) => ["running", "queued"].includes(j.status)),
    failed = jobs.filter((j) => j.status === "failed").at(-1);
  const renderJob = (job) =>
    h(
      "div",
      { key: job.id, className: "linggo-current-version" },
      h("small", { title: job.title }, job.title),
      h(
        "span",
        { className: "linggo-chip" + (job.status === "failed" ? "" : " ok") },
        t("job." + job.status),
      ),
      job.status === "running" &&
        h(
          React.Fragment,
          null,
          h(
            "div",
            { className: "linggo-progress" },
            h("div", {
              style: { width: Math.round(job.progress * 100) + "%" },
            }),
          ),
          h("small", null, job.message),
          h(
            "button",
            {
              onClick: () =>
                run(async () => {
                  await api("cancelJob", { id: job.id });
                  await refreshJobs();
                }),
            },
            t("job.cancel"),
          ),
        ),
      job.error && h("small", { className: "linggo-error" }, job.error),
    );
  return h(
    React.Fragment,
    null,
    h(
      SideSection,
      { id: "data", title: t("wb.data"), badge: String(versions.length), icon: h(Icon, { name: "database", size: 14 }) },
      v
        ? h(
            "div",
            { className: "linggo-current-version" },
            h("strong", null, versionLabel(t, v)),
            h("small", null, t("ui.currentVersion") + " · " + v.id.slice(0, 8)),
            h(
              "div",
              { className: "linggo-entities" },
              ...Object.entries(v.entities ?? {}).map(([k, e]) =>
                h(
                  "div",
                  { key: k },
                  h("span", null, t("entity." + k)),
                  h("span", null, e.rows.toLocaleString()),
                ),
              ),
            ),
          )
        : h("small", null, t("wb.noData")),
      h(
        "button",
        { disabled: busy || !project, onClick: openImport },
        t("data.import"),
      ),
      h(
        SideSection,
        {
          id: "versions",
          title: t("ui.versionHistory"),
          icon: h(Icon, { name: "history", size: 13 }),
          initial: false,
          badge: String(Math.max(0, versions.length - 1)),
        },
        h(
          "ul",
          { className: "linggo-list" },
          ...versions
            .slice()
            .reverse()
            .filter((v) => v.id !== current)
            .map((v) =>
              h(
                "li",
                { key: v.id },
                h(
                  "button",
                  {
                    disabled: busy,
                    onClick: () =>
                      run(async () => {
                        await api("selectVersion", {
                          projectId: project,
                          versionId: v.id,
                        });
                        await refresh();
                      }),
                  },
                  versionLabel(t, v),
                ),
                h("small", null, new Date(v.createdAt).toLocaleDateString()),
              ),
            ),
        ),
      ),
    ),
    h(
      SideSection,
      {
        id: "jobs",
        title: t("wb.tasks"),
        icon: h(Icon, { name: "list", size: 14 }),
        badge: t("ui.jobCounts", {
          running: String(active.length),
          failed: String(jobs.filter((j) => j.status === "failed").length),
        }),
      },
      ...active.map(renderJob),
      failed && renderJob(failed),
      !jobs.length && h("small", null, t("wb.noTasks")),
      h(
        SideSection,
        { id: "jobHistory", title: t("ui.taskHistory"), initial: false, icon: h(Icon, { name: "history", size: 13 }) },
        ...jobs
          .slice()
          .reverse()
          .filter((j) => !active.includes(j) && j !== failed)
          .map(renderJob),
      ),
    ),
  );
}

export function versionLabel(t, v) {
  const parts = ORDER.filter((k) => v.entities?.[k]).map((k) =>
    t("entity." + k),
  );
  return parts.length
    ? parts.slice(0, 3).join(" · ") + (parts.length > 3 ? " …" : "")
    : v.id.slice(0, 8);
}

/* ----------------------------- Import wizard ----------------------------- */

const EMPTY_SOURCE = { type: "file", path: "", dsn: "", table: "" };

export function ImportWizard({ t, api, project, onDone, onCancel }) {
  const [source, setSource] = useState(EMPTY_SOURCE);
  const [info, setInfo] = useState(null);
  const [tableName, setTableName] = useState("");
  const [mapping, setMappingRaw] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cleanSource = () =>
    source.type === "postgis"
      ? { type: "postgis", dsn: source.dsn, table: source.table || undefined }
      : { type: "file", path: source.path };
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };
  const setMapping = (m) => {
    setMappingRaw(m);
    setPreview(null);
  };
  const table = info?.tables.find((x) => x.name === tableName);
  const chooseTable = (inf, name, entity) => {
    const tb = inf.tables.find((x) => x.name === name);
    setTableName(name);
    if (inf.kind === "gtfs") return setMapping({ entity: "gtfs" });
    const ent = entity ?? tb.entity ?? "route_stops";
    setMapping({
      entity: ent,
      table: name,
      crs: tb.crs ?? "WGS84",
      mode: "append",
      fields: tb.suggestions[ent] ?? {},
      defaults: {},
    });
  };
  const inspect = () =>
    run(async () => {
      setInfo(null);
      setMapping(null);
      const inf = await api("inspect", {
        projectId: project,
        source: cleanSource(),
      });
      if (!inf.tables.length) throw Error(t("imp.noTables"));
      setInfo(inf);
      chooseTable(inf, inf.tables[0].name);
    });
  const doPreview = () =>
    run(async () => {
      setPreview(
        await api("preview", {
          projectId: project,
          source: cleanSource(),
          mapping,
        }),
      );
    });
  const confirm = () =>
    run(async () => {
      await api("startImport", {
        projectId: project,
        source: cleanSource(),
        mapping,
        previewToken: preview.previewToken,
      });
      onDone();
    });

  const fields =
    mapping && mapping.entity !== "gtfs"
      ? info.entities[mapping.entity].fields
      : {};
  const columns = table?.columns ?? [];
  const transformsFor = (f) =>
    Object.keys(info.transforms).filter(
      (x) =>
        !x ||
        (f === "lon" && x === "wkt_lon") ||
        (f === "lat" && x === "wkt_lat") ||
        (f === "direction" && x === "seq_hundreds"),
    );
  const epsg = mapping?.crs?.startsWith("EPSG:");

  return h(
    "div",
    { style: { maxWidth: 860 } },
    h("h2", null, t("imp.title")),
    h("p", { className: "linggo-note" }, t("imp.intro")),
    h("h3", null, t("imp.step1")),
    h(
      "div",
      { className: "linggo-row" },
      h(
        "select",
        {
          "aria-label": t("imp.sourceType"),
          value: source.type,
          onChange: (e) => (
            setSource({ ...EMPTY_SOURCE, type: e.target.value }),
            setInfo(null),
            setMapping(null)
          ),
        },
        h("option", { value: "file" }, t("imp.file")),
        h("option", { value: "postgis" }, "PostGIS"),
      ),
    ),
    source.type === "file"
      ? h("input", {
          "aria-label": t("imp.path"),
          placeholder: t("imp.pathHint"),
          value: source.path,
          onChange: (e) => setSource({ ...source, path: e.target.value }),
        })
      : h(
          React.Fragment,
          null,
          h("input", {
            "aria-label": "DSN",
            type: "password",
            placeholder: "postgresql://user:password@host:5432/db",
            value: source.dsn,
            onChange: (e) => setSource({ ...source, dsn: e.target.value }),
          }),
          h("input", {
            "aria-label": t("imp.pgTable"),
            placeholder: t("imp.pgTable"),
            value: source.table,
            onChange: (e) => setSource({ ...source, table: e.target.value }),
          }),
          h("small", null, t("imp.pgNote")),
        ),
    h("small", null, t("imp.formats")),
    h(
      "button",
      {
        className: "primary",
        disabled:
          busy ||
          !(source.type === "file" ? source.path.trim() : source.dsn.trim()),
        onClick: inspect,
      },
      t("imp.inspect"),
    ),
    h("button", { onClick: onCancel }, t("common.cancel")),

    info &&
      mapping &&
      h(
        React.Fragment,
        null,
        h("h3", null, t("imp.step2")),
        info.tables.length > 1 &&
          h(
            "select",
            {
              "aria-label": t("imp.table"),
              value: tableName,
              onChange: (e) => chooseTable(info, e.target.value),
            },
            ...info.tables.map((x) =>
              h(
                "option",
                { key: x.name, value: x.name },
                `${x.name}（${x.rows ?? "?"} ${t("imp.rows")}）`,
              ),
            ),
          ),
        table &&
          h(
            "small",
            null,
            t("imp.tableInfo", {
              rows: String(table.rows ?? "?"),
              cols: String(table.columns.length),
              geometry: table.geometry ?? "-",
            }),
          ),
        table && h(SampleTable, { columns: table.columns, rows: table.sample }),
        info.kind === "gtfs"
          ? h("p", { className: "linggo-note" }, t("imp.gtfs"))
          : h(
              React.Fragment,
              null,
              h(
                "div",
                { className: "linggo-row" },
                h(
                  "label",
                  null,
                  t("imp.entity"),
                  h(
                    "select",
                    {
                      value: mapping.entity,
                      onChange: (e) =>
                        chooseTable(info, tableName, e.target.value),
                    },
                    ...ORDER.map((k) =>
                      h("option", { key: k, value: k }, t("entity." + k)),
                    ),
                  ),
                ),
                h(
                  "label",
                  null,
                  t("imp.crs"),
                  h(
                    "select",
                    {
                      value: epsg ? "EPSG" : mapping.crs,
                      onChange: (e) =>
                        setMapping({
                          ...mapping,
                          crs:
                            e.target.value === "EPSG"
                              ? "EPSG:4549"
                              : e.target.value,
                        }),
                    },
                    ...["WGS84", "GCJ02", "BD09"].map((c) =>
                      h("option", { key: c, value: c }, t("crs." + c)),
                    ),
                    h("option", { value: "EPSG" }, t("crs.EPSG")),
                  ),
                ),
                epsg &&
                  h(
                    "label",
                    null,
                    "EPSG",
                    h("input", {
                      value: mapping.crs.slice(5),
                      onChange: (e) =>
                        setMapping({
                          ...mapping,
                          crs: "EPSG:" + e.target.value.replace(/\D/g, ""),
                        }),
                    }),
                  ),
                h(
                  "label",
                  null,
                  t("imp.mode"),
                  h(
                    "select",
                    {
                      value: mapping.mode,
                      onChange: (e) =>
                        setMapping({ ...mapping, mode: e.target.value }),
                    },
                    h("option", { value: "append" }, t("imp.append")),
                    h("option", { value: "replace" }, t("imp.replace")),
                  ),
                ),
              ),
              h("small", null, t("imp.mappingNote")),
              h(
                "div",
                {
                  className: "linggo-grid",
                  role: "group",
                  "aria-label": t("imp.step2"),
                },
                ...Object.entries(fields).flatMap(([f, spec]) => {
                  const cur = mapping.fields[f] ?? {
                    column: "",
                    transform: "",
                  };
                  const set = (patch) => {
                    const next = { ...cur, ...patch };
                    const all = { ...mapping.fields };
                    if (next.column) all[f] = next;
                    else delete all[f];
                    setMapping({ ...mapping, fields: all });
                  };
                  const tf = transformsFor(f);
                  return [
                    h(
                      "label",
                      { key: f + "l" },
                      t("field." + f),
                      spec.required ? " *" : "",
                    ),
                    h(
                      "select",
                      {
                        key: f + "c",
                        "aria-label": t("field." + f),
                        value: cur.column,
                        onChange: (e) => set({ column: e.target.value }),
                      },
                      h("option", { value: "" }, t("imp.unmapped")),
                      ...columns.map((c) =>
                        h("option", { key: c, value: c }, columnLabel(t, c)),
                      ),
                    ),
                    tf.length > 1
                      ? h(
                          "select",
                          {
                            key: f + "t",
                            "aria-label": t("imp.transform"),
                            value: cur.transform ?? "",
                            onChange: (e) => set({ transform: e.target.value }),
                          },
                          ...tf.map((x) =>
                            h(
                              "option",
                              { key: x, value: x },
                              t("tf." + (x || "none")),
                            ),
                          ),
                        )
                      : h("span", { key: f + "t" }),
                  ];
                }),
              ),
            ),
        h(
          "button",
          { className: "primary", disabled: busy, onClick: doPreview },
          t("imp.preview"),
        ),
      ),

    preview &&
      h(
        React.Fragment,
        null,
        h("h3", null, t("imp.step3")),
        preview.sampled &&
          h(
            "small",
            null,
            t("imp.sampled", { total: String(preview.rowsTotal ?? "?") }),
          ),
        h(
          "table",
          { className: "linggo-table" },
          h(
            "thead",
            null,
            h(
              "tr",
              null,
              ...[
                "imp.rEntity",
                "imp.rIn",
                "imp.rOut",
                "imp.rDup",
                "imp.rDrop",
              ].map((k) => h("th", { key: k }, t(k))),
            ),
          ),
          h(
            "tbody",
            null,
            ...preview.report.map((r) =>
              h(
                "tr",
                { key: r.entity },
                h("td", null, t("entity." + r.entity)),
                h("td", null, r.rowsIn),
                h("td", null, r.rowsOut),
                h("td", null, r.duplicates),
                h(
                  "td",
                  null,
                  Object.entries(r.dropped ?? {})
                    .map(([k, n]) => `${k} ${n}`)
                    .join("；") || "0",
                ),
              ),
            ),
          ),
        ),
        ...Object.entries(preview.sample).map(([entity, rows]) =>
          h(
            "div",
            { key: entity },
            h(
              "small",
              null,
              t("imp.sample", { entity: t("entity." + entity) }),
            ),
            rows.length
              ? h(SampleTable, {
                  columns: Object.keys(rows[0]),
                  rows: rows.map((r) => Object.values(r)),
                })
              : h("small", null, "—"),
          ),
        ),
        h("p", { className: "linggo-note" }, t("imp.confirmNote")),
        h(
          "button",
          { className: "primary", disabled: busy, onClick: confirm },
          t("imp.confirm"),
        ),
        h(
          "button",
          { disabled: busy, onClick: () => setPreview(null) },
          t("imp.back"),
        ),
      ),
    busy &&
      h("p", { className: "linggo-note", role: "status" }, t("imp.working")),
    error && h("p", { className: "linggo-error", role: "alert" }, error),
  );
}

function columnLabel(t, c) {
  return (
    { __x: t("col.x"), __y: t("col.y"), __geometry: t("col.geometry") }[c] ?? c
  );
}

function SampleTable({ columns, rows }) {
  return h(
    "table",
    { className: "linggo-table" },
    h(
      "thead",
      null,
      h("tr", null, ...columns.map((c, i) => h("th", { key: i, title: c }, c))),
    ),
    h(
      "tbody",
      null,
      ...rows
        .slice(0, 8)
        .map((r, i) =>
          h(
            "tr",
            { key: i },
            ...r.map((v, j) => h("td", { key: j, title: v }, v)),
          ),
        ),
    ),
  );
}

/* ----------------------------- Settings ----------------------------- */

export function SettingsView({ t, api }) {
  const [form, setForm] = useState(null);
  const [env, setEnv] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const check = () =>
    api("env", {}).then(setEnv, (e) => setEnv({ ok: false, error: e.message }));
  useEffect(() => {
    api("settings", {}).then(setForm, (e) => setError(e.message));
    check();
  }, []);
  if (!form) return h("p", { className: "linggo-note" }, error || "…");
  const field = (key, label, type = "text") =>
    h(
      "label",
      { key },
      label,
      h("input", {
        type,
        value: form[key] ?? "",
        onChange: (e) => setForm({ ...form, [key]: e.target.value }),
      }),
    );
  return h(
    "div",
    { style: { maxWidth: 640 } },
    h("h2", null, t("set.title")),
    h("h3", null, t("set.python")),
    env
      ? env.ok
        ? h(
            "small",
            null,
            `${env.python} · Python ${env.version}`,
            h("br"),
            Object.entries(env.modules)
              .map(([m, ok]) => `${m} ${ok ? "✓" : "✗"}`)
              .join(" · "),
          )
        : h("p", { className: "linggo-error" }, env.error)
      : h("small", null, "…"),
    h("small", null, t("set.pythonHelp")),
    field("python", t("set.pythonPath")),
    h("h3", null, t("set.amap")),
    h("small", null, t("set.amapHelp")),
    field("amapKey", "Key"),
    field("amapSecurityCode", t("set.amapCode"), "password"),
    h("h3", null, t("set.baidu")),
    h("small", null, t("set.baiduHelp")),
    field("baiduAK", "AK", "password"),
    h(
      "button",
      {
        className: "primary",
        onClick: async () => {
          setError("");
          try {
            await api("saveSettings", form);
            setMsg(t("set.saved"));
            check();
          } catch (e) {
            setError(e.message);
          }
        },
      },
      t("set.save"),
    ),
    msg && h("p", { className: "linggo-note", role: "status" }, msg),
    error && h("p", { className: "linggo-error", role: "alert" }, error),
  );
}

export { MapView } from "./map-view.jsx";
