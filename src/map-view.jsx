import React, { useEffect, useMemo, useRef, useState } from "react";
import { mapModel, bounds, routeColor } from "./map-model.js";
import { createMapAdapter } from "./map-adapters.js";
import { Replay, buildOverlay, overlayBox } from "./analysis.jsx";
import { readPreference, writePreference } from "./layout.js";
const h = React.createElement,
  ENGINE_KEY = "linggo.map.provider",
  STOPS_KEY = "linggo.map.showStops";
export function MapView({
  t,
  api,
  project,
  versionId,
  hasTrips,
  runId,
  onRun,
}) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [settings, setSettings] = useState(null),
    [engine, setEngine] = useState(null),
    [failure, setFailure] = useState(""),
    [retry, setRetry] = useState(0);
  const [selection, setSelection] = useState({}),
    [visible, setVisible] = useState(new Set()),
    [panel, setPanel] = useState("routes"),
    [collapsed, setCollapsed] = useState(false),
    [detailCollapsed, setDetailCollapsed] = useState(false),
    [search, setSearch] = useState(""),
    [width, setWidth] = useState(0),
    [actions, setActions] = useState([]),
    [overlay, setOverlay] = useState(null),
    [time, setTime] = useState(0),
    [anchor, setAnchor] = useState(null),
    [showStops, setShowStops] = useState(
      () => readPreference(localStorage, STOPS_KEY, true) !== false,
    );
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  const host = useRef(null),
    adapter = useRef(null),
    camera = useRef(null),
    selectionRef = useRef(selection),
    modelRef = useRef(null),
    actionRef = useRef(null);
  selectionRef.current = selection;
  const model = useMemo(() => (data ? mapModel(data) : null), [data]);
  modelRef.current = model;
  const select = (next, locate = false) => {
    setSelection((old) =>
      next.routeId
        ? { routeId: next.routeId, direction: next.direction }
        : next.stopId
          ? { ...old, stopId: next.stopId }
          : {},
    );
    if (next.routeId) {
      setVisible((old) => new Set([...old, next.routeId]));
      setPanel("detail");
      setDetailCollapsed(false);
    }
    if (locate) {
      const m = modelRef.current;
      let b;
      if (next.stopId) {
        const s = m?.stops.get(next.stopId);
        if (s) b = [s[2] - 0.003, s[3] - 0.003, s[2] + 0.003, s[3] + 0.003];
      } else
        b = bounds(
          (m?.routes.get(next.routeId) ?? [])
            .filter((l) => next.direction == null || l.dir === next.direction)
            .flatMap((l) => l.path),
        );
      adapter.current?.setViewport(b);
    }
  };
  useEffect(() => {
    let live = true;
    api("mapData", { projectId: project, versionId }).then(
      (d) => {
        if (live) {
          setData(d);
          setVisible(new Set(d.routes.map((l) => l.id)));
        }
      },
      (e) => live && setError(e.message),
    );
    return () => (live = false);
  }, [project, versionId]);
  useEffect(() => {
    let live = true;
    api("settings", {}).then(
      (s) => {
        if (!live) return;
        setSettings(s);
        const saved = readPreference(localStorage, ENGINE_KEY, null);
        setEngine(
          ["amap", "baidu", "canvas"].includes(saved)
            ? saved
            : s.amapKey
              ? "amap"
              : s.baiduAK
                ? "baidu"
                : "canvas",
        );
      },
      () => {
        if (live) {
          setSettings({});
          setEngine("canvas");
        }
      },
    );
    return () => (live = false);
  }, []);
  useEffect(() => {
    let live = true;
    setOverlay(null);
    if (runId)
      api("runResult", { projectId: project, runId }).then(
        ({ run, result }) => {
          if (!live) return;
          const o = buildOverlay(run, result);
          setOverlay(o);
          setTime(o.range?.[0] ?? 0);
          adapter.current?.setViewport(overlayBox(o));
        },
        (e) => live && setError(e.message),
      );
    return () => (live = false);
  }, [project, runId]);
  const applyAction = (a) => {
    if (a.versionId !== versionId) return;
    if (a.action === "show_run") onRun?.(a.target.runId);
    else if (["clear", "show_all"].includes(a.action)) {
      setSelection({});
      if (a.action === "show_all")
        setVisible(new Set(modelRef.current?.routes.keys()));
      else onRun?.(null);
      adapter.current?.setViewport(modelRef.current?.bbox);
    } else select({ ...a.target, direction: a.target?.directions?.[0] }, true);
  };
  actionRef.current = applyAction;
  useEffect(() => {
    let stop = false,
      since = null,
      timer;
    const poll = async () => {
      try {
        const r = await api("mapActions", {
          projectId: project,
          since: since ?? 0,
        });
        if (stop) return;
        const fresh = r.actions.filter((a) => a.versionId === versionId);
        if (since !== null && fresh.length) actionRef.current(fresh.at(-1));
        setActions((old) =>
          [
            ...old,
            ...r.actions.filter((a) => !old.some((b) => b.seq === a.seq)),
          ].slice(-30),
        );
        since = r.seq;
      } catch {}
      if (!stop) timer = setTimeout(poll, 1500);
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [project, versionId]);
  // Provider changes preserve WGS84 viewport. Resizes never fit the city again.
  useEffect(() => {
    if (!model?.bbox || !settings || !engine || !host.current) return;
    let live = true,
      own = null,
      fitted = false;
    const initialViewport = camera.current ?? model.bbox;
    const initialFit = !camera.current;
    const el = host.current;
    setFailure("");
    const updateAnchor = () => {
      const s = modelRef.current?.stops.get(selectionRef.current.stopId);
      if (!s || !own) return;
      const p = own.project([s[2], s[3]]);
      setAnchor(p);
    };
    const start = async () => {
      let actual = engine;
      try {
        if (
          (engine === "amap" && !settings.amapKey) ||
          (engine === "baidu" && !settings.baiduAK)
        )
          throw Error("missing");
        own = await createMapAdapter(actual, el, settings, {
          onSelect: select,
          onChange: updateAnchor,
          isActive: () => live,
        });
      } catch (e) {
        if (!live) return;
        setFailure(
          e.message === "reload"
            ? t("map.reloadKey")
            : e.message === "missing"
              ? t("map.missingKey")
              : e.message === "coordinates"
                ? t("map.coordinateConflict")
                : t("map.sdkFailure"),
        );
        actual = "canvas";
        own = await createMapAdapter(actual, el, settings, {
          onSelect: select,
          onChange: updateAnchor,
          isActive: () => live,
        });
      }
      if (!live) {
        own?.destroy();
        return;
      }
      adapter.current = own;
      if (el.clientWidth && el.clientHeight) {
        own.setViewport(initialViewport, initialFit);
        fitted = true;
      }
      own.render(sceneRef.current);
    };
    start();
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
      if (own && !fitted && el.clientWidth && el.clientHeight) {
        own.setViewport(initialViewport, initialFit);
        fitted = true;
      }
      own?.resize();
    });
    ro.observe(el);
    return () => {
      live = false;
      ro.disconnect();
      if (own) {
        if (fitted) camera.current = own.getViewport();
        own.destroy();
      }
      if (adapter.current === own) adapter.current = null;
    };
  }, [model, settings, engine, retry]);
  const sceneRef = useRef(null);
  sceneRef.current = { model, visible, selection, overlay, time, showStops };
  useEffect(() => {
    adapter.current?.render(sceneRef.current);
    const s = model?.stops.get(selection.stopId);
    setAnchor(
      s && adapter.current ? adapter.current.project([s[2], s[3]]) : null,
    );
  }, [model, visible, selection, overlay, time, showStops]);
  if (!versionId)
    return h("p", { className: "linggo-note" }, t("wb.mapNoData"));
  if (error && !model)
    return h(
      "p",
      { className: "linggo-error" },
      error,
      h(
        "button",
        {
          onClick: () => {
            setError("");
            api("mapData", { projectId: project, versionId }).then(
              (d) => alive.current && setData(d),
              (e) => alive.current && setError(e.message),
            );
          },
        },
        t("map.retry"),
      ),
    );
  if (!model) return h("p", { className: "linggo-note" }, t("map.loading"));
  if (!model.bbox)
    return h("p", { className: "linggo-note" }, t("map.noGeometry"));
  const wide = width >= 900,
    lines = model.routes.get(selection.routeId) ?? [],
    line = lines.find((l) => l.dir === selection.direction) ?? lines[0],
    stop = model.stops.get(selection.stopId);
  const q = search.trim().toLowerCase();
  const matches = (l) =>
    `${l.id} ${l.name} ${model.stops.get(l.stops[0])?.[1] ?? ""} ${model.stops.get(l.stops.at(-1))?.[1] ?? ""}`
      .toLowerCase()
      .includes(q);
  const routes = [...model.routes.values()]
    .map((lines) => (q ? lines.find(matches) : lines[0]))
    .filter(Boolean);
  const changeEngine = (e) => {
    camera.current = adapter.current?.getViewport() ?? camera.current;
    setEngine(e.target.value);
    writePreference(localStorage, ENGINE_KEY, e.target.value);
  };
  return h(
    "div",
    { className: "linggo-mapwrap", "data-map-width": wide ? "wide" : "narrow" },
    h("div", {
      className: "linggo-map-host",
      ref: host,
      "aria-label": t("wb.map"),
    }),
    h(
      "div",
      { className: "linggo-map-tools" },
      h(
        "button",
        {
          className: "primary",
          onClick: () => {
            setPanel("routes");
            setCollapsed(!collapsed || (!wide && panel === "detail"));
          },
          "aria-expanded": !collapsed && (!wide ? panel === "routes" : true),
        },
        t("map.routes"),
      ),
      h(
        "button",
        {
          "aria-label": t("map.reset"),
          onClick: () => adapter.current?.setViewport(model.bbox),
        },
        "⌖ " + t("map.reset"),
      ),
      h(
        "button",
        {
          type: "button",
          "aria-pressed": !showStops,
          title: t(showStops ? "map.hideStops" : "map.showStops"),
          onClick: () => {
            setShowStops((old) => {
              const next = !old;
              writePreference(localStorage, STOPS_KEY, next);
              return next;
            });
          },
        },
        t(showStops ? "map.hideStops" : "map.showStops"),
      ),
      h(
        "span",
        { className: "linggo-map-stat" },
        t("map.summary", {
          routes: String(model.routeCount),
          stops: String(model.stops.size),
        }),
      ),
      h(
        "select",
        {
          "aria-label": t("map.engine"),
          value: engine ?? "canvas",
          onChange: changeEngine,
        },
        h("option", { value: "amap" }, t("map.amap")),
        h("option", { value: "baidu" }, t("map.baidu")),
        h("option", { value: "canvas" }, t("map.canvas")),
      ),
    ),
    error &&
      h(
        "div",
        { className: "linggo-sdk-error", role: "alert" },
        error,
        h("button", { onClick: () => setError("") }, "×"),
      ),
    failure &&
      h(
        "div",
        { className: "linggo-sdk-error", role: "alert" },
        failure,
        h("button", { onClick: () => setRetry(retry + 1) }, t("map.retry")),
      ),
    data.truncated &&
      h(
        "div",
        { className: "linggo-map-warning", role: "status" },
        t("map.truncated"),
      ),
    !collapsed &&
      (wide || panel === "routes") &&
      h(
        "section",
        {
          className: "linggo-route-panel linggo-map-card",
          "aria-label": t("map.routes"),
        },
        h(
          "header",
          null,
          h("strong", null, t("map.routes")),
          h("span", { className: "linggo-count" }, String(model.routeCount)),
          h(
            "button",
            {
              "aria-label": t("ui.collapse"),
              onClick: () => setCollapsed(true),
            },
            "−",
          ),
        ),
        h(
          "small",
          null,
          t("map.summary", {
            routes: String(model.routeCount),
            stops: String(model.stops.size),
          }),
        ),
        h("input", {
          "aria-label": t("map.search"),
          placeholder: t("map.search"),
          value: search,
          onChange: (e) => setSearch(e.target.value),
        }),
        h(
          "div",
          { className: "linggo-route-actions" },
          h(
            "button",
            { onClick: () => setVisible(new Set(model.routes.keys())) },
            t("map.showAll"),
          ),
          h(
            "button",
            { onClick: () => setVisible(new Set()) },
            t("map.hideAll"),
          ),
        ),
        h(VirtualRoutes, {
          routes,
          model,
          visible,
          selection,
          t,
          onSelect: (l) => select({ routeId: l.id, direction: l.dir }, true),
          onVisibility: (id, show) =>
            setVisible((old) => {
              const next = new Set(old);
              show ? next.add(id) : next.delete(id);
              return next;
            }),
        }),
        h(
          "details",
          { className: "linggo-map-history" },
          h("summary", null, t("map.actions")),
          h(
            "ul",
            { className: "linggo-list" },
            ...actions
              .slice()
              .reverse()
              .map((a) =>
                h(
                  "li",
                  { key: a.seq },
                  h(
                    "button",
                    {
                      disabled: a.versionId !== versionId,
                      onClick: () => applyAction(a),
                    },
                    t("act." + a.action) +
                      " " +
                      (a.target?.name ??
                        a.target?.routeId ??
                        a.target?.stopId ??
                        ""),
                  ),
                ),
              ),
          ),
        ),
      ),
    line &&
      (wide || panel === "detail") &&
      h(
        "section",
        {
          className: "linggo-detail-panel linggo-map-card",
          "aria-label": t("map.details"),
        },
        h(
          "header",
          null,
          h("strong", null, line.name || line.id),
          h(
            "button",
            {
              "aria-label": t("ui.collapse"),
              onClick: () => setDetailCollapsed(!detailCollapsed),
            },
            detailCollapsed ? "+" : "−",
          ),
          h(
            "button",
            {
              "aria-label": t("map.closeDetail"),
              onClick: () => {
                setSelection((old) => ({
                  ...old,
                  routeId: null,
                  direction: null,
                }));
                if (!wide) setPanel("routes");
              },
            },
            "×",
          ),
        ),
        !detailCollapsed &&
          h(
            React.Fragment,
            null,
            h(
              "select",
              {
                "aria-label": t("map.direction"),
                value: line.key,
                onChange: (e) =>
                  select(
                    {
                      routeId: line.id,
                      direction: lines.find((l) => l.key === e.target.value)
                        ?.dir,
                    },
                    true,
                  ),
              },
              ...lines.map((l) =>
                h(
                  "option",
                  { value: l.key, key: l.key },
                  t("map.originalDirection") +
                    ": " +
                    (l.dir ?? t("map.missingValue")),
                ),
              ),
            ),
            h(
              "p",
              { className: "linggo-endpoints" },
              (model.stops.get(line.stops[0])?.[1] ?? t("map.missingValue")) +
                " → " +
                (model.stops.get(line.stops.at(-1))?.[1] ??
                  t("map.missingValue")),
            ),
            h(
              "small",
              null,
              hasTrips
                ? t("map.trips", { n: String(line.trips ?? 0) })
                : t("map.noTimetable"),
            ),
            h(
              "small",
              null,
              t(
                line.source === "geometry"
                  ? "map.importedGeometry"
                  : "map.stopConnections",
              ),
            ),
            h(
              "ol",
              { className: "linggo-stop-list" },
              ...line.stops.map((id, i) =>
                h(
                  "li",
                  { key: id + "/" + i },
                  h(
                    "button",
                    { onClick: () => select({ stopId: id }, true) },
                    model.stops.get(id)?.[1] ?? id,
                  ),
                ),
              ),
            ),
          ),
      ),
    stop &&
      h(
        "section",
        {
          className: "linggo-stop-popup linggo-map-card",
          style: {
            left: Math.max(
              wide && !collapsed ? 316 : 8,
              Math.min(
                (anchor?.[0] ?? width / 2) + 10,
                wide && line ? width - 576 : width - 276,
              ),
            ),
            top: Math.max(
              80,
              Math.min(
                (anchor?.[1] ?? 120) - 40,
                (host.current?.clientHeight ?? 600) - 200,
              ),
            ),
          },
          "aria-label": t("map.stopDetail"),
        },
        h(
          "header",
          null,
          h("strong", null, stop[1] || stop[0]),
          h(
            "button",
            {
              "aria-label": t("map.closeStop"),
              onClick: () => setSelection((old) => ({ ...old, stopId: null })),
            },
            "×",
          ),
        ),
        h("small", null, stop[0]),
        h(
          "div",
          { className: "linggo-route-chips" },
          ...[...(model.through.get(stop[0]) ?? [])].map((id) =>
            h(
              "button",
              { key: id, onClick: () => select({ routeId: id }, true) },
              model.routes.get(id)?.[0]?.name || id,
            ),
          ),
        ),
      ),
    overlay &&
      h(
        "div",
        { className: "linggo-replay-bar" },
        h(Replay, { t, overlay, time, setTime, onClose: () => onRun?.(null) }),
      ),
    h(
      "span",
      { className: "linggo-maptag" },
      t(failure ? "map.canvas" : "map." + (engine ?? "canvas")),
    ),
  );
}
function VirtualRoutes({
  routes,
  model,
  visible,
  selection,
  t,
  onSelect,
  onVisibility,
}) {
  const ref = useRef(null),
    [top, setTop] = useState(0),
    [height, setHeight] = useState(300);
  const rowHeight = 58;
  useEffect(() => {
    const ro = new ResizeObserver(() => setHeight(ref.current.clientHeight));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
    setTop(0);
  }, [routes.length]);
  const start = Math.max(0, Math.floor(top / rowHeight) - 3),
    end = Math.min(routes.length, Math.ceil((top + height) / rowHeight) + 3);
  return h(
    "div",
    {
      ref,
      className: "linggo-virtual-routes",
      onScroll: (e) => setTop(e.currentTarget.scrollTop),
      role: "list",
      "aria-label": t("map.routes"),
    },
    h(
      "div",
      { style: { height: routes.length * rowHeight, position: "relative" } },
      ...routes.slice(start, end).map((l, i) =>
        h(
          "div",
          {
            key: l.id,
            className: "linggo-route-row",
            "aria-current": selection.routeId === l.id ? "true" : undefined,
            role: "listitem",
            style: {
              position: "absolute",
              top: (start + i) * rowHeight,
              height: rowHeight,
              left: 0,
              right: 0,
            },
          },
          h("input", {
            type: "checkbox",
            "aria-label": t("map.visible") + " " + (l.name || l.id),
            checked: visible.has(l.id),
            onChange: (e) => onVisibility(l.id, e.target.checked),
          }),
          h("span", {
            className: "linggo-line-color",
            style: { background: routeColor(l.id) },
          }),
          h(
            "button",
            { onClick: () => onSelect(l), title: l.name || l.id },
            h("span", null, l.name || l.id),
            h(
              "small",
              null,
              (model.stops.get(l.stops[0])?.[1] ?? "—") +
                " → " +
                (model.stops.get(l.stops.at(-1))?.[1] ?? "—"),
            ),
          ),
        ),
      ),
    ),
  );
}
export const mapStyle = `
@container(max-height:560px){.linggo-mapwrap:has(.linggo-stop-popup) .linggo-route-panel,.linggo-mapwrap:has(.linggo-stop-popup) .linggo-detail-panel{display:none;}}
.linggo-mapwrap{container-type:size;position:relative;flex:1;min-height:0;isolation:isolate;overflow:hidden;background:#eef1f4;}
.linggo-map-host,.linggo-native-map,.linggo-render-map{position:absolute;inset:0;width:100%;height:100%;}
.linggo-map-host{z-index:0;}
.linggo-render-map{z-index:2;}
/* Unified glass toolbar */
.linggo-map-tools{position:absolute;left:12px;right:12px;top:12px;display:flex;align-items:center;gap:8px;pointer-events:none;z-index:6;padding:6px 8px;border-radius:12px;background:color-mix(in srgb, var(--c-bg) 92%, transparent);border:1px solid var(--c-line);box-shadow:0 4px 18px #182c4014;backdrop-filter:blur(10px);}
.linggo-map-tools>*{pointer-events:auto;}
.linggo-map-tools button{margin:0;min-height:32px;border-radius:8px;white-space:nowrap;}
.linggo-map-tools select{width:120px;margin:0 0 0 auto;height:32px;border-radius:8px;background:var(--c-bg);}
.linggo-map-tools .linggo-map-stat{margin-left:4px;font-size:11px;color:var(--c-sub);white-space:nowrap;}
.linggo-map-card{position:absolute;background:color-mix(in srgb, var(--c-bg) 96%, transparent);color:var(--c-text);border:1px solid var(--c-line);border-radius:14px;box-shadow:0 8px 28px #182c4018;z-index:5;overflow:hidden;}
.linggo-map-card header{display:flex;align-items:center;gap:6px;min-width:0;padding:2px 0 4px;}
.linggo-map-card header strong{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;}
.linggo-map-card header button{border:0;padding:2px 8px;margin:0;background:transparent;border-radius:6px;}
.linggo-map-card header .linggo-count{flex:none;}
/* Left route drawer */
.linggo-route-panel{left:12px;top:64px;width:280px;max-height:calc(100% - 96px);padding:12px 12px 10px;display:flex;flex-direction:column;gap:8px;}
.linggo-route-panel>small{font-size:11px;color:var(--c-cap);}
.linggo-route-actions{display:flex;gap:6px;}
.linggo-route-actions button{flex:1;justify-content:center;font-size:12px;margin:0;height:30px;border-radius:8px;}
.linggo-virtual-routes{height:400px;max-height:48vh;min-height:72px;overflow:auto;flex:1;overscroll-behavior:contain;margin:0 -2px;}
.linggo-route-row{display:flex;align-items:center;gap:8px;padding:8px 6px;border-radius:10px;}
.linggo-route-row:hover{background:var(--c-hover);}
.linggo-route-row[aria-current=true]{background:color-mix(in srgb, var(--c-accent) 10%, transparent);}
.linggo-route-row input{width:14px;margin:0;flex:none;}
.linggo-route-row button{border:0;display:block;min-width:0;flex:1;text-align:left;background:transparent;padding:0;margin:0;}
.linggo-route-row button span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500;line-height:1.3;}
.linggo-route-row button small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--c-cap);margin-top:2px;}
.linggo-line-color{width:3px;height:32px;border-radius:2px;flex:none;}
.linggo-map-history{font-size:11px;color:var(--c-sub);}
.linggo-map-history summary{cursor:pointer;padding:4px 0;}
.linggo-map-history ul{max-height:100px;overflow:auto;}
.linggo-map-history li{padding:0;}
.linggo-map-history button{font-size:11px;white-space:normal;text-align:left;}
/* Right detail peek */
.linggo-detail-panel{right:12px;top:64px;width:300px;max-height:calc(100% - 96px);padding:12px 14px;overflow:auto;}
.linggo-endpoints{font-size:12px;margin:8px 0;color:var(--c-sub);}
.linggo-stop-list{padding-left:18px;margin:0;max-height:32vh;overflow:auto;}
.linggo-stop-list li{padding:0;}
.linggo-stop-list button{border:0;background:transparent;font-size:12px;text-align:left;margin:0;padding:5px 6px;width:100%;border-radius:6px;}
.linggo-stop-list button:hover{background:var(--c-hover);}
/* Compact stop bubble */
.linggo-stop-popup{width:240px;max-height:180px;overflow:auto;padding:10px 12px;z-index:8;}
.linggo-route-chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;}
.linggo-route-chips button{font-size:11px;padding:3px 8px;margin:0;border-radius:999px;}
/* Replay bottom bar */
.linggo-replay-bar{position:absolute;bottom:28px;left:12px;right:12px;min-height:48px;background:color-mix(in srgb, var(--c-bg) 94%, transparent);border:1px solid var(--c-line);border-radius:12px;padding:8px 14px;z-index:9;box-shadow:0 4px 18px #182c4014;}
.linggo-replay-bar .linggo-replay{margin:0;}
.linggo-maptag{position:absolute;bottom:8px;right:10px;background:color-mix(in srgb, var(--c-bg) 88%, transparent);padding:2px 8px;border-radius:6px;color:var(--c-cap);font-size:11px;pointer-events:none;z-index:3;}
.linggo-sdk-error,.linggo-map-warning{position:absolute;bottom:36px;left:12px;right:12px;background:var(--c-bg);border:1px solid var(--c-line);border-radius:10px;padding:10px 12px;z-index:10;font-size:12px;box-shadow:0 4px 18px #182c4014;}
.linggo-map-warning{bottom:88px;}
/* Narrow map: drawers stack as mutually exclusive sheets */
.linggo-mapwrap[data-map-width=narrow] .linggo-route-panel,
.linggo-mapwrap[data-map-width=narrow] .linggo-detail-panel{left:12px;right:12px;width:auto;max-height:calc(100% - 120px);}
.linggo-mapwrap[data-map-width=narrow] .linggo-stop-popup{top:auto!important;bottom:32px;left:12px!important;width:calc(100% - 24px);max-height:150px;}
.linggo-mapwrap:has(.linggo-replay-bar) .linggo-route-panel,
.linggo-mapwrap:has(.linggo-replay-bar) .linggo-detail-panel{max-height:calc(100% - 168px);}
.linggo-mapwrap:has(.linggo-replay-bar)[data-map-width=narrow] .linggo-stop-popup{bottom:200px;}
.linggo-mapwrap:has(.linggo-stop-popup):has(.linggo-replay-bar)[data-map-width=narrow] .linggo-route-panel,
.linggo-mapwrap:has(.linggo-stop-popup):has(.linggo-replay-bar)[data-map-width=narrow] .linggo-detail-panel{max-height:calc(100% - 340px);}
.linggo-mapwrap:has(.linggo-stop-popup)[data-map-width=narrow] .linggo-route-panel,
.linggo-mapwrap:has(.linggo-stop-popup)[data-map-width=narrow] .linggo-detail-panel{max-height:calc(100% - 280px);}
`;

