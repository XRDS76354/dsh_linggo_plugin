import React, { useEffect, useMemo, useState } from "react";
const h = React.createElement;

export const analysisStyle = `
.linggo-analysis{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start;}
.linggo-analysis section{min-width:0;}
.linggo-analysis pre{max-height:320px;overflow:auto;font-size:11px;background:var(--c-side);padding:8px;border-radius:6px;white-space:pre;}
.linggo-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin:6px 0;}
.linggo-kpis div{border:1px solid var(--c-line);border-radius:6px;padding:4px 8px;font-size:12px;}
.linggo-kpis b{display:block;font-size:15px;}
.linggo-tag{display:inline-block;font-size:11px;padding:0 6px;border-radius:4px;background:#fff3bf;color:#7a5b00;margin-left:6px;}
.linggo-tag.ok{background:#d3f9d8;color:#2b8a3e;}
.linggo-tag.bad{background:#ffe3e3;color:#c92a2a;}
.linggo-replay{display:flex;gap:6px;align-items:center;font-size:12px;}
.linggo-replay input{flex:1;}
@media(max-width:1100px){.linggo-analysis{grid-template-columns:1fr;}}
`;

const KEY_KPIS = {
  drt: ["service_rate", "served", "requests", "avg_wait_min", "avg_ride_ratio", "vehicles_used"],
  fleet: ["vehicles_required", "vehicles_available", "gap", "peak_concurrent", "unassigned", "deadhead_km"],
  tripgen: ["trips", "gap_bins", "max_shortfall_ph", "vehicles_required", "vehicles_available", "feasible"],
};

/** Translation with a fallback for keys defined by user algorithms. */
function label(t, key, fallback) {
  const r = t(key);
  return typeof r === "string" && r && !r.endsWith(key) ? r : fallback;
}

function fmtValue(key, v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (key === "service_rate") return `${(v * 100).toFixed(1)}%`;
  if (typeof v === "object") return Object.entries(v).map(([k, n]) => `${k} ${n}`).join("；") || "—";
  return String(v);
}

export function clock(s) {
  if (s === null || s === undefined || !Number.isFinite(s)) return "—";
  const v = Math.round(s);
  return `${String(Math.floor(v / 3600)).padStart(2, "0")}:${String(Math.floor((v % 3600) / 60)).padStart(2, "0")}`;
}

function Table({ columns, rows, labels }) {
  return h(
    "table",
    { className: "linggo-table" },
    h("thead", null, h("tr", null, ...columns.map((c) => h("th", { key: c }, labels?.[c] ?? c)))),
    h("tbody", null, ...rows.map((r, i) => h("tr", { key: i }, ...columns.map((c) => h("td", { key: c, title: String(r[c] ?? "") }, fmtValue(c, r[c])))))),
  );
}

/* ----------------------------- Parameter form ----------------------------- */

function initialForm(algorithm) {
  return Object.fromEntries(Object.entries(algorithm.params).map(([k, s]) => [k, s.type === "boolean" ? s.default : String(s.default ?? "")]));
}

function parseValue(spec, raw) {
  if (spec.type === "boolean") return Boolean(raw);
  if (spec.type === "integer" || spec.type === "number") return raw === "" ? undefined : Number(raw);
  return raw;
}

function ParamForm({ t, algorithm, form, setForm, sweep, setSweep }) {
  const numeric = Object.entries(algorithm.params).filter(([, s]) => s.type === "integer" || s.type === "number");
  return h(
    React.Fragment,
    null,
    h(
      "div",
      { className: "linggo-grid", style: { gridTemplateColumns: "minmax(0,1fr) 160px" } },
      ...Object.entries(algorithm.params).flatMap(([k, s]) => [
        h("label", { key: k + "l", htmlFor: `lg-p-${k}`, title: k }, s.label ?? k, s.min !== undefined ? ` (${s.min}–${s.max})` : ""),
        s.type === "boolean"
          ? h("input", { key: k, id: `lg-p-${k}`, type: "checkbox", checked: Boolean(form[k]), onChange: (e) => setForm({ ...form, [k]: e.target.checked }) })
          : s.type === "enum"
            ? h("select", { key: k, id: `lg-p-${k}`, value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) }, ...s.options.map((o) => h("option", { key: o, value: o }, label(t, "opt." + o, o))))
            : h("input", { key: k, id: `lg-p-${k}`, value: form[k] ?? "", inputMode: s.type === "string" ? "text" : "decimal", onChange: (e) => setForm({ ...form, [k]: e.target.value }) }),
      ]),
    ),
    numeric.length > 0 &&
      h(
        "div",
        { className: "linggo-row", style: { marginTop: 6 } },
        h("small", { style: { flex: "none" } }, t("an.sweep")),
        h(
          "select",
          { "aria-label": t("an.sweep"), value: sweep.param, onChange: (e) => setSweep({ ...sweep, param: e.target.value }) },
          h("option", { value: "" }, t("an.noSweep")),
          ...numeric.map(([k, s]) => h("option", { key: k, value: k }, s.label ?? k)),
        ),
        sweep.param && h("input", { "aria-label": t("an.sweepValues"), placeholder: t("an.sweepValues"), value: sweep.values, onChange: (e) => setSweep({ ...sweep, values: e.target.value }) }),
      ),
  );
}

function paramSetsOf(algorithm, form, sweep) {
  const base = {};
  for (const [k, s] of Object.entries(algorithm.params)) {
    const v = parseValue(s, form[k]);
    if (v !== undefined) base[k] = v;
  }
  if (!sweep.param) return [base];
  const values = sweep.values.split(/[,，\s]+/).filter(Boolean).map(Number);
  return values.length ? values.map((v) => ({ ...base, [sweep.param]: v })) : [base];
}

/* ----------------------------- Analysis tab ----------------------------- */

export function AnalysisView({ t, api, project, version, jobs, refreshJobs, run, busy, onShowRun }) {
  const [algorithms, setAlgorithms] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [proposals, setProposals] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState({});
  const [sweep, setSweep] = useState({ param: "", values: "" });
  const [preview, setPreview] = useState(null); // {request, value}
  const [register, setRegister] = useState({ path: "", shown: null, reviewed: false });
  const [detail, setDetail] = useState(null);

  const loadAlgorithms = () => api("algorithms", { projectId: project }).then(setAlgorithms, (e) => setLoadError(e.message));
  const loadRuns = () => api("runs", { projectId: project }).then(setRuns, () => {});
  useEffect(() => {
    setAlgorithms(null);
    setPreview(null);
    setDetail(null);
    loadAlgorithms();
    loadRuns();
  }, [project]);
  // Proposals from the presentation agent arrive while the tab is open.
  useEffect(() => {
    let stop = false, timer;
    const poll = async () => {
      await api("proposals", { projectId: project }).then(setProposals, () => {});
      if (!stop) timer = setTimeout(poll, 2500);
    };
    poll();
    return () => ((stop = true), clearTimeout(timer));
  }, [project]);
  const runningRuns = jobs.filter((j) => j.kind === "run" && j.status === "running").length;
  useEffect(() => {
    if (!runningRuns) loadRuns();
  }, [runningRuns, jobs.length]);

  const algorithm = algorithms?.find((a) => a.id === selected);
  const choose = (id) => {
    setSelected(id);
    const a = algorithms.find((x) => x.id === id);
    if (a) setForm(initialForm(a));
    setSweep({ param: "", values: "" });
    setPreview(null);
  };

  const doPreview = (request) =>
    run(async () => {
      setPreview(null);
      const value = await api("previewRun", { projectId: project, ...request });
      setPreview({ request, value });
    });

  const confirm = () =>
    run(async () => {
      await api("startRun", { projectId: project, ...preview.request, paramSets: preview.value.paramSets, previewToken: preview.value.previewToken });
      setPreview(null);
      await refreshJobs();
      setProposals(await api("proposals", { projectId: project }));
      return t("an.started");
    });

  const openRun = (id) =>
    run(async () => {
      setDetail(await api("runResult", { projectId: project, runId: id }));
    });

  if (!version) return h("p", { className: "linggo-note" }, t("an.noData"));
  if (loadError) return h("p", { className: "linggo-error" }, loadError);
  if (!algorithms) return h("p", { className: "linggo-note" }, t("an.loading"));

  const left = h(
    "section",
    null,
    proposals.length > 0 &&
      h(
        React.Fragment,
        null,
        h("h3", null, t("an.proposals")),
        ...proposals.map((p) =>
          h(
            "div",
            { key: p.id, className: "linggo-card", style: { padding: 8 } },
            h("strong", null, p.algorithmName),
            p.paramSets.length > 1 && h("span", { className: "linggo-tag" }, t("an.batch", { n: String(p.paramSets.length) })),
            p.reason && h("p", { style: { margin: "4px 0" } }, p.reason),
            h("small", null, t("an.fromAgent", { time: new Date(p.at).toLocaleTimeString() })),
            h(
              "div",
              { className: "linggo-row" },
              h("button", { className: "primary", disabled: busy, onClick: () => doPreview({ algorithmId: p.algorithmId, paramSets: p.paramSets, proposalId: p.id }) }, t("an.preview")),
              h("button", { disabled: busy, onClick: () => run(async () => { await api("dismissProposal", { id: p.id }); setProposals(await api("proposals", { projectId: project })); }) }, t("an.dismiss")),
            ),
          ),
        ),
      ),
    h("h3", null, t("an.algorithms")),
    h(
      "select",
      { "aria-label": t("an.algorithms"), value: selected, onChange: (e) => choose(e.target.value) },
      h("option", { value: "" }, t("an.choose")),
      ...algorithms.map((a) => h("option", { key: a.id, value: a.id }, `${a.name}${a.source === "user" ? " · " + t("an.user") : ""}`)),
    ),
    algorithm &&
      h(
        "div",
        { className: "linggo-card", style: { padding: 8 } },
        h("p", { style: { margin: "0 0 6px" } }, algorithm.description),
        h(
          "small",
          null,
          t("an.inputs"),
          algorithm.inputs.map((i) => `${t("entity." + i.entity)}${i.required ? "*" : ""}（${version.entities?.[i.entity]?.rows ?? 0}）`).join("、"),
        ),
        algorithm.source === "user" && h("p", { className: "linggo-error" }, t("an.userWarning", { sha: algorithm.sha256.slice(0, 12) })),
        h(ParamForm, { t, algorithm, form, setForm, sweep, setSweep }),
        h(
          "div",
          { className: "linggo-row", style: { marginTop: 8 } },
          h("button", { className: "primary", disabled: busy, onClick: () => doPreview({ algorithmId: algorithm.id, paramSets: paramSetsOf(algorithm, form, sweep) }) }, t("an.preview")),
          algorithm.source === "user" &&
            h("button", { disabled: busy, onClick: () => run(async () => { await api("removeAlgorithm", { projectId: project, id: algorithm.id }); setSelected(""); await loadAlgorithms(); }) }, t("an.remove")),
        ),
      ),
    preview &&
      h(
        "div",
        { className: "linggo-card", role: "region", "aria-label": t("an.previewTitle"), style: { padding: 8 } },
        h("strong", null, t("an.previewTitle"), "：", preview.value.algorithm.name),
        h(Table, {
          columns: ["label", "required", "rows"],
          labels: { label: t("an.data"), required: t("an.required"), rows: t("an.rows") },
          rows: preview.value.inputs,
        }),
        h(Table, {
          columns: Object.keys(preview.value.paramSets[0]),
          labels: Object.fromEntries(Object.entries(preview.value.algorithm.params).map(([k, s]) => [k, s.label ?? k])),
          rows: preview.value.paramSets,
        }),
        ...preview.value.blocking.map((b, i) => h("p", { key: "b" + i, className: "linggo-error" }, b)),
        ...preview.value.warnings.map((w, i) => h("p", { key: "w" + i, className: "linggo-error" }, "⚠ " + w)),
        h("small", null, t("an.previewNote", { version: preview.value.versionId.slice(0, 8) })),
        h(
          "div",
          { className: "linggo-row" },
          h("button", { className: "primary", disabled: busy || !preview.value.previewToken || runningRuns > 0, onClick: confirm }, t("an.confirm", { n: String(preview.value.paramSets.length) })),
          h("button", { onClick: () => setPreview(null) }, t("common.cancel")),
        ),
      ),
    h("h3", null, t("an.register")),
    h("small", null, t("an.registerHint")),
    h("input", {
      "aria-label": t("an.registerPath"),
      placeholder: t("an.registerPath"),
      value: register.path,
      onChange: (e) => setRegister({ path: e.target.value, shown: null, reviewed: false }),
    }),
    h("button", { disabled: busy || !register.path.trim(), onClick: () => run(async () => setRegister({ ...register, shown: await api("algorithmSource", { projectId: project, path: register.path.trim() }), reviewed: false })) }, t("an.showSource")),
    register.shown &&
      h(
        "div",
        { className: "linggo-card", style: { padding: 8 } },
        h("small", null, `SHA-256 ${register.shown.sha256} · ${register.shown.size} B`),
        h("pre", null, register.shown.source),
        h("p", { className: "linggo-error" }, register.shown.warning),
        h("label", null, h("input", { type: "checkbox", checked: register.reviewed, onChange: (e) => setRegister({ ...register, reviewed: e.target.checked }) }), " ", t("an.reviewed")),
        h(
          "button",
          {
            className: "primary",
            disabled: busy || !register.reviewed,
            onClick: () =>
              run(async () => {
                const item = await api("registerAlgorithm", { projectId: project, path: register.shown.path, sha256: register.shown.sha256 });
                setRegister({ path: "", shown: null, reviewed: false });
                await loadAlgorithms();
                return t("an.registered", { name: item.meta.name });
              }),
          },
          t("an.registerConfirm"),
        ),
      ),
  );

  const right = h(
    "section",
    null,
    h("h3", null, t("an.runs")),
    !runs.length && h("small", null, t("an.noRuns")),
    runs.length > 0 &&
      h(
        "table",
        { className: "linggo-table" },
        h("thead", null, h("tr", null, h("th", null, t("an.time")), h("th", null, t("an.algorithm")), h("th", null, t("an.kpi")), h("th", null, t("an.check")))),
        h(
          "tbody",
          null,
          ...runs.slice(0, 50).map((r) =>
            h(
              "tr",
              { key: r.id, style: { cursor: "pointer", fontWeight: detail?.run.id === r.id ? 600 : undefined }, onClick: () => openRun(r.id) },
              h("td", null, new Date(r.createdAt).toLocaleString(undefined, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })),
              h("td", null, r.algorithmName, r.synthetic && h("span", { className: "linggo-tag" }, t("an.synthetic"))),
              h("td", null, (KEY_KPIS[r.kind] ?? []).slice(0, 3).map((k) => `${label(t, "kpi." + k, k)} ${fmtValue(k, r.summary?.[k])}`).join("；")),
              h("td", null, h("span", { className: `linggo-tag ${r.validation?.ok ? "ok" : "bad"}` }, r.validation?.checked === false ? t("an.unchecked") : r.validation?.ok ? t("an.valid") : t("an.invalid", { n: String(r.validation?.count ?? "?") }))),
            ),
          ),
        ),
      ),
    detail && h(ResultDetail, { t, detail, onShowRun }),
  );

  return h("div", { className: "linggo-analysis" }, left, right);
}

function ResultDetail({ t, detail, onShowRun }) {
  const { run, result } = detail;
  const kpis = Object.entries(result.summary ?? {});
  return h(
    "div",
    { className: "linggo-card", style: { padding: 8 } },
    h("strong", null, run.algorithmName),
    run.synthetic && h("span", { className: "linggo-tag" }, t("an.synthetic")),
    h("div", null, h("small", null, t("an.runMeta", { version: run.versionId.slice(0, 8), id: run.id }))),
    h("div", { className: "linggo-kpis" }, ...kpis.map(([k, v]) => h("div", { key: k }, label(t, "kpi." + k, k), h("b", null, fmtValue(k, v))))),
    (run.kind === "drt" || run.kind === "fleet") && h("button", { className: "primary", onClick: () => onShowRun(run.id) }, t("an.showOnMap")),
    h("h4", null, t("an.validation")),
    result.validation?.checked === false
      ? h("small", null, t("an.uncheckedNote"))
      : result.validation?.ok
        ? h("small", null, t("an.validNote"))
        : h("ul", null, ...result.validation.violations.slice(0, 20).map((v, i) => h("li", { key: i, className: "linggo-error" }, v))),
    result.assumptions?.length > 0 && h(React.Fragment, null, h("h4", null, t("an.assumptions")), h("ul", null, ...result.assumptions.map((a, i) => h("li", { key: i }, a)))),
    run.kind === "drt" &&
      h(
        React.Fragment,
        null,
        h("h4", null, t("an.rejected")),
        h(Table, {
          columns: ["request_id", "request_time", "passengers", "reason"],
          labels: { request_id: t("an.request"), request_time: t("an.time"), passengers: t("an.pax"), reason: t("an.reason") },
          rows: result.requests.filter((r) => !r.served).slice(0, 100).map((r) => ({ ...r, request_time: clock(r.request_time) })),
        }),
      ),
    run.kind === "fleet" &&
      h(
        React.Fragment,
        null,
        h("h4", null, t("an.blocks")),
        h(Table, {
          columns: ["vehicle_id", "trips", "start", "end", "routes"],
          labels: { vehicle_id: t("an.vehicle"), trips: t("an.tripCount"), start: t("an.start"), end: t("an.end"), routes: t("an.routes") },
          rows: result.blocks.slice(0, 200).map((b) => ({ vehicle_id: b.vehicle_id, trips: b.trips.length, start: clock(b.start), end: clock(b.end), routes: [...new Set(b.trips.map((x) => x.route_id))].join(",") })),
        }),
        result.unassigned?.length > 0 &&
          h(React.Fragment, null, h("h4", null, t("an.unassigned")), h(Table, { columns: ["trip_id", "reason"], rows: result.unassigned.slice(0, 100) })),
      ),
    run.kind === "tripgen" &&
      h(
        React.Fragment,
        null,
        result.gaps?.length > 0 && h(React.Fragment, null, h("h4", null, t("an.gaps")), h(Table, { columns: Object.keys(result.gaps[0]), rows: result.gaps.slice(0, 100) })),
        h("h4", null, t("an.headways")),
        h(Table, {
          columns: ["route_id", "direction", "bin", "design_load_ph", "headway_min", "capacity_ph", "shortfall_ph"],
          labels: { route_id: t("an.route"), direction: t("an.direction"), bin: t("an.bin"), design_load_ph: t("an.load"), headway_min: t("an.headway"), capacity_ph: t("an.capacity"), shortfall_ph: t("an.shortfall") },
          rows: result.headways.slice(0, 300),
        }),
      ),
  );
}

/* ----------------------------- Map overlay and replay ----------------------------- */

function km(a, b) {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(s));
}

/** Timed vehicle tracks for replay: DRT from stop times, fleet from trip terminals. */
export function buildOverlay(run, result) {
  const vehicles = [];
  let t0 = Infinity, t1 = -Infinity;
  if (run.kind === "drt") {
    const speed = result.params?.speed_kmh ?? 25, detour = result.params?.detour_factor ?? 1.3;
    for (const v of result.vehicles) {
      if (!v.stops.length) continue;
      const first = v.stops[0];
      const leave = first.arrive - (km(v.start, [first.lon, first.lat]) * detour * 3600) / speed;
      const track = [{ t: leave, p: v.start }];
      for (const s of v.stops) track.push({ t: s.arrive, p: [s.lon, s.lat] }, { t: s.depart, p: [s.lon, s.lat] });
      vehicles.push({ id: v.vehicle_id, track, hold: true });
    }
  } else if (run.kind === "fleet") {
    for (const b of result.blocks) {
      const track = [];
      for (const x of b.trips) track.push({ t: x.start, p: x.from }, { t: x.end, p: x.to });
      vehicles.push({ id: b.vehicle_id, track, hold: false });
    }
  }
  for (const v of vehicles) {
    t0 = Math.min(t0, v.track[0].t);
    t1 = Math.max(t1, v.track.at(-1).t);
  }
  const requests = run.kind === "drt" ? result.requests.map((r) => ({ o: r.o, served: r.served, t: r.request_time })) : [];
  return { kind: run.kind, name: run.algorithmName, synthetic: run.synthetic, vehicles, requests, range: vehicles.length ? [t0, t1] : null };
}

/** Position at time t, or null when the vehicle is not in service. */
export function positionAt(v, t) {
  const tr = v.track;
  if (t < tr[0].t) return v.hold ? tr[0].p : null;
  if (t >= tr.at(-1).t) return v.hold ? tr.at(-1).p : null;
  let lo = 0, hi = tr.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tr[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = tr[lo], b = tr[hi], f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  return [a.p[0] + (b.p[0] - a.p[0]) * f, a.p[1] + (b.p[1] - a.p[1]) * f];
}

export function overlayBox(overlay) {
  const pts = overlay.vehicles.flatMap((v) => v.track.map((x) => x.p)).concat(overlay.requests.map((r) => r.o));
  if (!pts.length) return null;
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

const PALETTE = ["#3c6df0", "#e8590c", "#2b8a3e", "#ae3ec9", "#1098ad", "#f08c00", "#c2255c", "#5c940d"];
export const vehicleColor = (i) => PALETTE[i % PALETTE.length];

/** Draw the overlay onto a canvas context with a projection px([lon, lat]) -> [x, y]. */
export function drawOverlay(g, px, overlay, time) {
  if (overlay.kind === "drt") {
    g.lineWidth = 1.5;
    g.globalAlpha = 0.45;
    overlay.vehicles.slice(0, 300).forEach((v, i) => {
      g.strokeStyle = vehicleColor(i);
      g.beginPath();
      v.track.forEach((x, k) => {
        const [sx, sy] = px(x.p);
        k ? g.lineTo(sx, sy) : g.moveTo(sx, sy);
      });
      g.stroke();
    });
    g.globalAlpha = 1;
    for (const r of overlay.requests) {
      if (r.served || r.t > time) continue;
      const [x, y] = px(r.o);
      g.strokeStyle = "#c92a2a";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x - 3, y - 3);
      g.lineTo(x + 3, y + 3);
      g.moveTo(x + 3, y - 3);
      g.lineTo(x - 3, y + 3);
      g.stroke();
    }
  }
  overlay.vehicles.forEach((v, i) => {
    const p = positionAt(v, time);
    if (!p) return;
    const [x, y] = px(p);
    g.fillStyle = vehicleColor(i);
    g.strokeStyle = "#fff";
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x, y, 5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  });
}

/** Time slider and play button; the full range plays in about 40 seconds. */
export function Replay({ t, overlay, time, setTime, onClose }) {
  const [playing, setPlaying] = useState(false);
  const [t0, t1] = overlay.range ?? [0, 0];
  useEffect(() => {
    if (!playing) return;
    const step = Math.max((t1 - t0) / 400, 1);
    const timer = setInterval(() => setTime((v) => (v + step >= t1 ? (setPlaying(false), t1) : v + step)), 100);
    return () => clearInterval(timer);
  }, [playing, t0, t1]);
  const active = useMemo(() => overlay.vehicles.filter((v) => positionAt(v, time) && (!v.hold || (time >= v.track[0].t && time <= v.track.at(-1).t))).length, [overlay, time]);
  return h(
    "div",
    { className: "linggo-card", style: { padding: 6 } },
    h("small", null, overlay.name, overlay.synthetic && h("span", { className: "linggo-tag" }, t("an.synthetic"))),
    overlay.range
      ? h(
          "div",
          { className: "linggo-replay" },
          h("button", { "aria-label": playing ? t("map.pause") : t("map.play"), onClick: () => (time >= t1 && setTime(t0), setPlaying(!playing)) }, playing ? "❚❚" : "▶"),
          h("input", { type: "range", "aria-label": t("map.time"), min: t0, max: t1, step: 10, value: time, onChange: (e) => setTime(Number(e.target.value)) }),
          h("span", null, clock(time)),
        )
      : h("small", null, t("map.noTracks")),
    h("small", null, t("map.activeVehicles", { n: String(active), total: String(overlay.vehicles.length) })),
    h("button", { onClick: onClose }, t("map.closeRun")),
  );
}
