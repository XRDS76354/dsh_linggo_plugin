import React, { useEffect, useMemo, useRef, useState } from "react";
const h = React.createElement;

export const dataStyle = `
.linggo-tabbar{display:flex;gap:2px;border-bottom:1px solid var(--c-line);margin:-8px 0 12px;}
.linggo-tabbar button{border:0!important;border-bottom:2px solid transparent!important;border-radius:0!important;margin:0!important;}
.linggo-tabbar button[aria-pressed="true"]{border-bottom-color:var(--c-accent)!important;font-weight:600;}
.linggo-mapwrap{position:relative;height:calc(100vh - 120px);min-height:360px;display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:8px;}
.linggo-canvas{position:relative;border:1px solid var(--c-line);border-radius:var(--dsw-radius-md,8px);overflow:hidden;background:#f4f5f7;}
.linggo-canvas canvas,.linggo-canvas .linggo-amap{position:absolute;inset:0;width:100%;height:100%;}
.linggo-canvas .linggo-maptag{position:absolute;left:8px;bottom:6px;font-size:11px;color:var(--c-cap);background:#fffc;padding:1px 6px;border-radius:4px;pointer-events:none;}
.linggo-canvas .linggo-tip{position:absolute;right:8px;top:8px;max-width:60%;background:#fff;border:1px solid var(--c-line);border-radius:6px;padding:6px 8px;font-size:12px;}
.linggo-side{overflow:auto;display:flex;flex-direction:column;min-height:0;}
.linggo-side .linggo-list{overflow:auto;flex:1;min-height:80px;}
.linggo-side .linggo-list li{padding:3px 6px;font-size:12px;}
.linggo-table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;display:block;overflow:auto;max-height:280px;}
.linggo-table th,.linggo-table td{border:1px solid var(--c-line);padding:3px 6px;text-align:left;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;}
.linggo-table th{background:var(--c-side);position:sticky;top:0;}
.linggo-grid{display:grid;grid-template-columns:120px minmax(0,1fr) 150px;gap:4px 8px;align-items:center;}
.linggo-grid label{font-size:12px;}
.linggo-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.linggo-row>*{flex:1;min-width:120px;}
.linggo-progress{height:4px;background:var(--c-line);border-radius:2px;overflow:hidden;margin:4px 0;}
.linggo-progress>div{height:100%;background:var(--c-accent);}
@media(max-width:900px){.linggo-mapwrap{grid-template-columns:1fr;grid-template-rows:60vh auto;height:auto;}}
`;

const ORDER = ["stops", "routes", "route_stops", "trips", "ridership", "od", "demand", "gps", "vehicles", "depots"];

/* ----------------------------- Left column: versions and jobs ----------------------------- */

export function DataSummary({ t, api, project, state, jobs, refresh, refreshJobs, run, busy, openImport }) {
  const versions = state.dataVersions.filter((v) => v.projectId === project);
  const current = state.projects.find((p) => p.id === project)?.currentVersionId ?? versions.at(-1)?.id;
  return h(
    React.Fragment,
    null,
    h("h3", null, t("wb.data")),
    !versions.length && h("small", null, t("wb.noData")),
    versions.length > 0 &&
      h(
        "ul",
        { className: "linggo-list", "aria-label": t("data.versions") },
        ...versions
          .slice()
          .reverse()
          .map((v) =>
            h(
              "li",
              {
                key: v.id,
                "aria-current": v.id === current ? "true" : undefined,
                title: Object.entries(v.entities ?? {})
                  .map(([k, e]) => `${t("entity." + k)} ${e.rows}`)
                  .join("\n"),
                onClick: () =>
                  v.id !== current &&
                  run(async () => {
                    await api("selectVersion", { projectId: project, versionId: v.id });
                    await refresh();
                  }),
              },
              h("span", null, versionLabel(t, v)),
              h("span", null, new Date(v.createdAt).toLocaleString(undefined, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })),
            ),
          ),
      ),
    h("button", { disabled: busy || !project, onClick: openImport }, t("data.import")),
    h("h3", null, t("wb.tasks")),
    !jobs.length && h("small", null, t("wb.noTasks")),
    ...jobs
      .slice(-5)
      .reverse()
      .map((job) =>
        h(
          "div",
          { key: job.id, className: "linggo-card", style: { padding: 8 } },
          h("small", null, `${job.title} · ${t("job." + job.status)}`),
          job.status === "running" &&
            h(
              React.Fragment,
              null,
              h("div", { className: "linggo-progress" }, h("div", { style: { width: `${Math.round(job.progress * 100)}%` } })),
              h("small", null, job.message),
              h("button", { onClick: () => run(async () => { await api("cancelJob", { id: job.id }); await refreshJobs(); }) }, t("job.cancel")),
            ),
          job.error && h("small", { className: "linggo-error" }, job.error),
        ),
      ),
  );
}

export function versionLabel(t, v) {
  const parts = ORDER.filter((k) => v.entities?.[k]).map((k) => t("entity." + k));
  return parts.length ? parts.slice(0, 3).join(" · ") + (parts.length > 3 ? " …" : "") : v.id.slice(0, 8);
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
    source.type === "postgis" ? { type: "postgis", dsn: source.dsn, table: source.table || undefined } : { type: "file", path: source.path };
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
    setMapping({ entity: ent, table: name, crs: tb.crs ?? "WGS84", mode: "append", fields: tb.suggestions[ent] ?? {}, defaults: {} });
  };
  const inspect = () =>
    run(async () => {
      setInfo(null);
      setMapping(null);
      const inf = await api("inspect", { projectId: project, source: cleanSource() });
      if (!inf.tables.length) throw Error(t("imp.noTables"));
      setInfo(inf);
      chooseTable(inf, inf.tables[0].name);
    });
  const doPreview = () =>
    run(async () => {
      setPreview(await api("preview", { projectId: project, source: cleanSource(), mapping }));
    });
  const confirm = () =>
    run(async () => {
      await api("startImport", { projectId: project, source: cleanSource(), mapping, previewToken: preview.previewToken });
      onDone();
    });

  const fields = mapping && mapping.entity !== "gtfs" ? info.entities[mapping.entity].fields : {};
  const columns = table?.columns ?? [];
  const transformsFor = (f) => Object.keys(info.transforms).filter((x) => !x || (f === "lon" && x === "wkt_lon") || (f === "lat" && x === "wkt_lat") || (f === "direction" && x === "seq_hundreds"));
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
        { "aria-label": t("imp.sourceType"), value: source.type, onChange: (e) => (setSource({ ...EMPTY_SOURCE, type: e.target.value }), setInfo(null), setMapping(null)) },
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
          h("input", { "aria-label": "DSN", type: "password", placeholder: "postgresql://user:password@host:5432/db", value: source.dsn, onChange: (e) => setSource({ ...source, dsn: e.target.value }) }),
          h("input", { "aria-label": t("imp.pgTable"), placeholder: t("imp.pgTable"), value: source.table, onChange: (e) => setSource({ ...source, table: e.target.value }) }),
          h("small", null, t("imp.pgNote")),
        ),
    h("small", null, t("imp.formats")),
    h("button", { className: "primary", disabled: busy || !(source.type === "file" ? source.path.trim() : source.dsn.trim()), onClick: inspect }, t("imp.inspect")),
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
            { "aria-label": t("imp.table"), value: tableName, onChange: (e) => chooseTable(info, e.target.value) },
            ...info.tables.map((x) => h("option", { key: x.name, value: x.name }, `${x.name}（${x.rows ?? "?"} ${t("imp.rows")}）`)),
          ),
        table && h("small", null, t("imp.tableInfo", { rows: String(table.rows ?? "?"), cols: String(table.columns.length), geometry: table.geometry ?? "-" })),
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
                    { value: mapping.entity, onChange: (e) => chooseTable(info, tableName, e.target.value) },
                    ...ORDER.map((k) => h("option", { key: k, value: k }, t("entity." + k))),
                  ),
                ),
                h(
                  "label",
                  null,
                  t("imp.crs"),
                  h(
                    "select",
                    { value: epsg ? "EPSG" : mapping.crs, onChange: (e) => setMapping({ ...mapping, crs: e.target.value === "EPSG" ? "EPSG:4549" : e.target.value }) },
                    ...["WGS84", "GCJ02", "BD09"].map((c) => h("option", { key: c, value: c }, t("crs." + c))),
                    h("option", { value: "EPSG" }, t("crs.EPSG")),
                  ),
                ),
                epsg &&
                  h(
                    "label",
                    null,
                    "EPSG",
                    h("input", { value: mapping.crs.slice(5), onChange: (e) => setMapping({ ...mapping, crs: "EPSG:" + e.target.value.replace(/\D/g, "") }) }),
                  ),
                h(
                  "label",
                  null,
                  t("imp.mode"),
                  h(
                    "select",
                    { value: mapping.mode, onChange: (e) => setMapping({ ...mapping, mode: e.target.value }) },
                    h("option", { value: "append" }, t("imp.append")),
                    h("option", { value: "replace" }, t("imp.replace")),
                  ),
                ),
              ),
              h("small", null, t("imp.mappingNote")),
              h(
                "div",
                { className: "linggo-grid", role: "group", "aria-label": t("imp.step2") },
                ...Object.entries(fields).flatMap(([f, spec]) => {
                  const cur = mapping.fields[f] ?? { column: "", transform: "" };
                  const set = (patch) => {
                    const next = { ...cur, ...patch };
                    const all = { ...mapping.fields };
                    if (next.column) all[f] = next;
                    else delete all[f];
                    setMapping({ ...mapping, fields: all });
                  };
                  const tf = transformsFor(f);
                  return [
                    h("label", { key: f + "l" }, t("field." + f), spec.required ? " *" : ""),
                    h(
                      "select",
                      { key: f + "c", "aria-label": t("field." + f), value: cur.column, onChange: (e) => set({ column: e.target.value }) },
                      h("option", { value: "" }, t("imp.unmapped")),
                      ...columns.map((c) => h("option", { key: c, value: c }, columnLabel(t, c))),
                    ),
                    tf.length > 1
                      ? h(
                          "select",
                          { key: f + "t", "aria-label": t("imp.transform"), value: cur.transform ?? "", onChange: (e) => set({ transform: e.target.value }) },
                          ...tf.map((x) => h("option", { key: x, value: x }, t("tf." + (x || "none")))),
                        )
                      : h("span", { key: f + "t" }),
                  ];
                }),
              ),
            ),
        h("button", { className: "primary", disabled: busy, onClick: doPreview }, t("imp.preview")),
      ),

    preview &&
      h(
        React.Fragment,
        null,
        h("h3", null, t("imp.step3")),
        preview.sampled && h("small", null, t("imp.sampled", { total: String(preview.rowsTotal ?? "?") })),
        h(
          "table",
          { className: "linggo-table" },
          h("thead", null, h("tr", null, ...["imp.rEntity", "imp.rIn", "imp.rOut", "imp.rDup", "imp.rDrop"].map((k) => h("th", { key: k }, t(k))))),
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
                h("td", null, Object.entries(r.dropped ?? {}).map(([k, n]) => `${k} ${n}`).join("；") || "0"),
              ),
            ),
          ),
        ),
        ...Object.entries(preview.sample).map(([entity, rows]) =>
          h(
            "div",
            { key: entity },
            h("small", null, t("imp.sample", { entity: t("entity." + entity) })),
            rows.length ? h(SampleTable, { columns: Object.keys(rows[0]), rows: rows.map((r) => Object.values(r)) }) : h("small", null, "—"),
          ),
        ),
        h("p", { className: "linggo-note" }, t("imp.confirmNote")),
        h("button", { className: "primary", disabled: busy, onClick: confirm }, t("imp.confirm")),
        h("button", { disabled: busy, onClick: () => setPreview(null) }, t("imp.back")),
      ),
    busy && h("p", { className: "linggo-note", role: "status" }, t("imp.working")),
    error && h("p", { className: "linggo-error", role: "alert" }, error),
  );
}

function columnLabel(t, c) {
  return { __x: t("col.x"), __y: t("col.y"), __geometry: t("col.geometry") }[c] ?? c;
}

function SampleTable({ columns, rows }) {
  return h(
    "table",
    { className: "linggo-table" },
    h("thead", null, h("tr", null, ...columns.map((c, i) => h("th", { key: i, title: c }, c)))),
    h("tbody", null, ...rows.slice(0, 8).map((r, i) => h("tr", { key: i }, ...r.map((v, j) => h("td", { key: j, title: v }, v))))),
  );
}

/* ----------------------------- Settings ----------------------------- */

export function SettingsView({ t, api }) {
  const [form, setForm] = useState(null);
  const [env, setEnv] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const check = () => api("env", {}).then(setEnv, (e) => setEnv({ ok: false, error: e.message }));
  useEffect(() => {
    api("settings", {}).then(setForm, (e) => setError(e.message));
    check();
  }, []);
  if (!form) return h("p", { className: "linggo-note" }, error || "…");
  const field = (key, label, type = "text") =>
    h("label", { key }, label, h("input", { type, value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) }));
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

/* ----------------------------- Map ----------------------------- */

// WGS84 -> GCJ02 for AMap tiles; stored data is always WGS84.
function outOfChina(lon, lat) {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
}
function gcj([lon, lat]) {
  if (outOfChina(lon, lat)) return [lon, lat];
  const a = 6378245.0, ee = 0.00669342162296594323, x = lon - 105, y = lat - 35;
  let dLat = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  dLat += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  dLat += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
  dLat += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3;
  let dLon = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  dLon += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  dLon += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
  dLon += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3;
  const rad = (lat / 180) * Math.PI;
  let magic = Math.sin(rad);
  magic = 1 - ee * magic * magic;
  const sq = Math.sqrt(magic);
  dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sq)) * Math.PI);
  dLon = (dLon * 180) / ((a / sq) * Math.cos(rad) * Math.PI);
  return [lon + dLon, lat + dLat];
}

let amapLoading;
function loadAmap(key, code) {
  if (window.AMap) return Promise.resolve(window.AMap);
  amapLoading ??= new Promise((resolve, reject) => {
    if (code) window._AMapSecurityConfig = { securityJsCode: code };
    const s = document.createElement("script");
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`;
    s.onload = () => (window.AMap ? resolve(window.AMap) : reject(Error("AMap")));
    s.onerror = () => reject(Error("AMap"));
    document.head.append(s);
    setTimeout(() => reject(Error("AMap timeout")), 10000);
  }).catch((e) => {
    amapLoading = undefined;
    throw e;
  });
  return amapLoading;
}

export function MapView({ t, api, project, versionId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [focus, setFocus] = useState(null); // {routeId, directions?} | {stopId}
  const [search, setSearch] = useState("");
  const [actions, setActions] = useState([]);
  const [engine, setEngine] = useState("canvas");
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    setData(null);
    setFocus(null);
    setError("");
    if (!versionId) return;
    api("mapData", { projectId: project, versionId }).then(setData, (e) => setError(e.message));
  }, [project, versionId]);
  useEffect(() => {
    api("settings", {}).then(setSettings, () => setSettings({}));
  }, []);

  // Map operations from the presentation agent arrive through the Host; new ones apply immediately.
  useEffect(() => {
    let since = null, stop = false, timer;
    const poll = async () => {
      try {
        const r = await api("mapActions", { projectId: project, since: since ?? 0 });
        const fresh = r.actions.filter((a) => a.versionId === versionId);
        if (since !== null && fresh.length) applyAction(fresh.at(-1));
        if (r.actions.length) setActions((old) => [...old, ...r.actions].slice(-30));
        since = r.seq;
      } catch {}
      if (!stop) timer = setTimeout(poll, 1500);
    };
    setActions([]);
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [project, versionId]);

  const applyAction = (a) => {
    if (a.action === "clear" || a.action === "show_all") setFocus(a.action === "clear" ? null : { all: true, at: a.seq });
    else setFocus({ ...a.target, at: a.seq });
  };

  const model = useMemo(() => {
    if (!data) return null;
    const stops = new Map(data.stops.map((s) => [s[0], s]));
    const lines = data.routes.map((r) => ({
      ...r,
      path: r.geometry?.length > 1 ? r.geometry : r.stops.map((id) => stops.get(id)).filter(Boolean).map((s) => [s[2], s[3]]),
    }));
    return { stops, lines, bbox: data.bbox, routeCount: new Set(lines.map((l) => l.id)).size };
  }, [data]);

  if (!versionId) return h("p", { className: "linggo-note" }, t("wb.mapNoData"));
  if (error) return h("p", { className: "linggo-error" }, error);
  if (!model) return h("p", { className: "linggo-note" }, t("map.loading"));
  if (!model.bbox) return h("p", { className: "linggo-note" }, t("map.noGeometry"));

  const q = search.trim().toLowerCase();
  const routeList = [];
  const seen = new Set();
  for (const l of model.lines) {
    if (seen.has(l.id)) continue;
    if (q && !`${l.id} ${l.name}`.toLowerCase().includes(q)) continue;
    seen.add(l.id);
    routeList.push(l);
    if (routeList.length >= 200) break;
  }
  const useAmap = engine === "amap" && settings?.amapKey;

  return h(
    "div",
    { className: "linggo-mapwrap" },
    h(
      "div",
      { className: "linggo-canvas", "aria-label": t("wb.map") },
      useAmap
        ? h(AmapLayer, { t, model, focus, settings, onFail: () => (setEngine("canvas"), setError("")) })
        : h(CanvasLayer, { model, focus, onPick: setFocus }),
      h(FocusTip, { t, model, focus }),
      h("span", { className: "linggo-maptag" }, useAmap ? t("map.amap") : t("map.canvas"), data.truncated ? " · " + t("map.truncated") : ""),
    ),
    h(
      "div",
      { className: "linggo-side" },
      settings?.amapKey &&
        h(
          "select",
          { "aria-label": t("map.engine"), value: engine, onChange: (e) => setEngine(e.target.value) },
          h("option", { value: "canvas" }, t("map.canvas")),
          h("option", { value: "amap" }, t("map.amap")),
        ),
      h("small", null, t("map.summary", { routes: String(model.routeCount), stops: String(model.stops.size) })),
      h("input", { "aria-label": t("map.search"), placeholder: t("map.search"), value: search, onChange: (e) => setSearch(e.target.value) }),
      h(
        "ul",
        { className: "linggo-list", "aria-label": t("map.routes") },
        ...routeList.map((l) =>
          h(
            "li",
            { key: l.id, "aria-current": focus?.routeId === l.id ? "true" : undefined, onClick: () => setFocus({ routeId: l.id }) },
            h("span", null, l.name || l.id),
            h("span", null, l.trips ? t("map.trips", { n: String(model.lines.filter((x) => x.id === l.id).reduce((s, x) => s + x.trips, 0)) }) : ""),
          ),
        ),
      ),
      h("button", { onClick: () => setFocus(null) }, t("map.reset")),
      h("h3", null, t("map.actions")),
      !actions.length && h("small", null, t("map.noActions")),
      h(
        "ul",
        { className: "linggo-list", style: { flex: "none", maxHeight: 160 } },
        ...actions
          .slice()
          .reverse()
          .map((a) =>
            h(
              "li",
              { key: a.seq, title: t("map.replay"), onClick: () => a.versionId === versionId && applyAction(a) },
              h("span", null, `${t("act." + a.action)} ${a.target?.name ?? a.target?.routeId ?? a.target?.stopId ?? ""}`),
              h("span", null, new Date(a.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })),
            ),
          ),
      ),
    ),
  );
}

function FocusTip({ t, model, focus }) {
  if (focus?.routeId) {
    const lines = model.lines.filter((l) => l.id === focus.routeId && (!focus.directions || focus.directions.includes(l.dir)));
    if (!lines.length) return null;
    return h(
      "div",
      { className: "linggo-tip" },
      h("strong", null, lines[0].name || lines[0].id),
      ...lines.map((l) => {
        const first = model.stops.get(l.stops[0])?.[1], last = model.stops.get(l.stops.at(-1))?.[1];
        const text = t("map.dir", { dir: l.dir, n: String(l.stops.length), from: first ?? "", to: last ?? "" });
        return h("div", { key: l.dir }, l.trips ? `${text}，${t("map.trips", { n: String(l.trips) })}` : text);
      }),
    );
  }
  if (focus?.stopId) {
    const s = model.stops.get(focus.stopId);
    if (!s) return null;
    const through = [...new Set(model.lines.filter((l) => l.stops.includes(s[0])).map((l) => l.name || l.id))];
    return h("div", { className: "linggo-tip" }, h("strong", null, s[1] || s[0]), h("div", null, t("map.stopRoutes", { n: String(through.length) }) + through.slice(0, 12).join("、")));
  }
  return null;
}

function focusBox(model, focus) {
  const pts = [];
  if (focus?.routeId) for (const l of model.lines) if (l.id === focus.routeId && (!focus.directions || focus.directions.includes(l.dir))) pts.push(...l.path);
  if (focus?.stopId) {
    const s = model.stops.get(focus.stopId);
    if (s) pts.push([s[2] - 0.01, s[3] - 0.01], [s[2] + 0.01, s[3] + 0.01]);
  }
  if (!pts.length) return model.bbox;
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

function CanvasLayer({ model, focus, onPick }) {
  const ref = useRef(null);
  const view = useRef(null);
  const [tick, setTick] = useState(0);
  const redraw = () => setTick((n) => n + 1);

  const fit = (box, w, hgt) => {
    const k = Math.cos((((box[1] + box[3]) / 2) * Math.PI) / 180);
    const sx = (w - 40) / Math.max((box[2] - box[0]) * k, 1e-6), sy = (hgt - 40) / Math.max(box[3] - box[1], 1e-6);
    view.current = { cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2, s: Math.min(sx, sy, 400000), k };
  };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      if (!view.current) fit(model.bbox, c.clientWidth, c.clientHeight);
      redraw();
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [model]);

  useEffect(() => {
    const c = ref.current;
    if (c && c.clientWidth) {
      fit(focusBox(model, focus), c.clientWidth, c.clientHeight);
      redraw();
    }
  }, [model, focus]);

  useEffect(() => {
    const c = ref.current;
    if (!c || !view.current || !c.clientWidth) return;
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth, hgt = c.clientHeight;
    c.width = w * dpr;
    c.height = hgt * dpr;
    const g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, hgt);
    const { cx, cy, s, k } = view.current;
    const px = (p) => [(p[0] - cx) * s * k + w / 2, (cy - p[1]) * s + hgt / 2];
    const hit = (l) => focus?.routeId === l.id && (!focus.directions || focus.directions.includes(l.dir));
    const stroke = (l) => {
      g.beginPath();
      l.path.forEach((p, i) => {
        const [x, y] = px(p);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke();
    };
    const dim = focus && !focus.all;
    g.lineWidth = 1;
    g.strokeStyle = dim ? "#c9ccd2" : "#5b7fd6";
    g.globalAlpha = dim ? 0.6 : 0.55;
    for (const l of model.lines) if (!hit(l)) stroke(l);
    g.globalAlpha = 1;
    const accent = getComputedStyle(c).getPropertyValue("--c-accent").trim() || "#3c6df0";
    const focused = model.lines.filter(hit);
    g.lineWidth = 4;
    focused.forEach((l, i) => {
      g.strokeStyle = i % 2 ? "#e8590c" : accent;
      stroke(l);
    });
    const onRoute = new Set(focused.flatMap((l) => l.stops));
    const r = s > 3000 ? 2.5 : s > 800 ? 1.5 : 0.8;
    g.fillStyle = "#4a4f57";
    for (const st of model.stops.values()) {
      const [x, y] = px([st[2], st[3]]);
      if (x < -5 || y < -5 || x > w + 5 || y > hgt + 5) continue;
      if (onRoute.has(st[0])) continue;
      g.fillRect(x - r / 2, y - r / 2, r, r);
    }
    g.fillStyle = "#fff";
    g.strokeStyle = accent;
    g.lineWidth = 1.5;
    g.font = "11px system-ui";
    for (const id of onRoute) {
      const st = model.stops.get(id);
      const [x, y] = px([st[2], st[3]]);
      g.beginPath();
      g.arc(x, y, 3.5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    if (onRoute.size && onRoute.size < 80) {
      g.fillStyle = "#1f2329";
      for (const id of onRoute) {
        const st = model.stops.get(id);
        const [x, y] = px([st[2], st[3]]);
        g.fillText(st[1] ?? "", x + 5, y - 4);
      }
    }
    if (focus?.stopId && model.stops.get(focus.stopId)) {
      const st = model.stops.get(focus.stopId);
      const [x, y] = px([st[2], st[3]]);
      g.fillStyle = "#e8590c";
      g.beginPath();
      g.arc(x, y, 6, 0, Math.PI * 2);
      g.fill();
    }
  }, [tick, focus, model]);

  // Pan by drag, zoom by wheel around the pointer, click picks the nearest stop.
  const drag = useRef(null);
  const onWheel = (e) => {
    const c = ref.current, v = view.current;
    if (!v) return;
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left - c.clientWidth / 2, my = e.clientY - rect.top - c.clientHeight / 2;
    const lon = v.cx + mx / (v.s * v.k), lat = v.cy - my / v.s;
    const f = e.deltaY < 0 ? 1.25 : 0.8;
    v.s = Math.min(Math.max(v.s * f, 5), 2e6);
    v.cx = lon - mx / (v.s * v.k);
    v.cy = lat + my / v.s;
    redraw();
  };
  useEffect(() => {
    const c = ref.current;
    const fn = (e) => {
      e.preventDefault();
      onWheel(e);
    };
    c?.addEventListener("wheel", fn, { passive: false });
    return () => c?.removeEventListener("wheel", fn);
  }, []);
  return h("canvas", {
    ref,
    style: { cursor: "grab", touchAction: "none" },
    onPointerDown: (e) => {
      drag.current = { x: e.clientX, y: e.clientY, moved: false, v: { ...view.current } };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      view.current.cx = d.v.cx - dx / (d.v.s * d.v.k);
      view.current.cy = d.v.cy + dy / d.v.s;
      redraw();
    },
    onPointerUp: (e) => {
      const d = drag.current;
      drag.current = null;
      if (!d || d.moved) return;
      const c = ref.current, v = view.current, rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      let best, dist = 64;
      for (const st of model.stops.values()) {
        const sx = (st[2] - v.cx) * v.s * v.k + c.clientWidth / 2, sy = (v.cy - st[3]) * v.s + c.clientHeight / 2;
        const dd = (sx - x) ** 2 + (sy - y) ** 2;
        if (dd < dist) (dist = dd), (best = st);
      }
      if (best) onPick({ stopId: best[0] });
    },
  });
}

function AmapLayer({ t, model, focus, settings, onFail }) {
  const ref = useRef(null);
  const map = useRef(null);
  const overlays = useRef([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    loadAmap(settings.amapKey, settings.amapSecurityCode).then(
      (AMap) => {
        if (disposed) return;
        map.current = new AMap.Map(ref.current, { zoom: 11, center: gcj([(model.bbox[0] + model.bbox[2]) / 2, (model.bbox[1] + model.bbox[3]) / 2]) });
        setReady(true);
      },
      () => !disposed && onFail(),
    );
    return () => {
      disposed = true;
      map.current?.destroy();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current, AMap = window.AMap;
    if (!ready || !m) return;
    m.remove(overlays.current);
    const hit = (l) => focus?.routeId === l.id && (!focus.directions || focus.directions.includes(l.dir));
    const shown = focus?.routeId ? model.lines.filter(hit) : model.lines.slice(0, 400);
    const out = shown.map(
      (l, i) =>
        new AMap.Polyline({
          path: l.path.map(gcj),
          strokeColor: focus?.routeId ? (i % 2 ? "#e8590c" : "#3c6df0") : "#5b7fd6",
          strokeWeight: focus?.routeId ? 5 : 2,
          strokeOpacity: focus?.routeId ? 0.95 : 0.5,
        }),
    );
    const stopIds = focus?.routeId ? [...new Set(shown.flatMap((l) => l.stops))] : focus?.stopId ? [focus.stopId] : [];
    for (const id of stopIds) {
      const s = model.stops.get(id);
      if (s) out.push(new AMap.CircleMarker({ center: gcj([s[2], s[3]]), radius: focus?.stopId ? 8 : 4, fillColor: "#fff", strokeColor: "#3c6df0", strokeWeight: 2, fillOpacity: 1, extData: s[1] }));
    }
    m.add(out);
    overlays.current = out;
    if (out.length) m.setFitView(out, false, [40, 40, 40, 40]);
  }, [ready, focus, model]);
  return h("div", { ref, className: "linggo-amap", "aria-label": t("map.amap") });
}
