import React from "react";
import { vehicleState } from "./map-replay.js";
const h = React.createElement;
export const clock = (t) =>
  new Date(Math.max(0, t) * 1000).toISOString().slice(11, 19);
export function Bars({ values, color = "#4275dc", label }) {
  const max = Math.max(1, ...values);
  return h(
    "svg",
    {
      viewBox: `0 0 ${values.length * 6} 90`,
      role: "img",
      "aria-label": label,
      className: "linggo-profile-chart",
    },
    ...values.map((v, i) =>
      h(
        "rect",
        {
          key: i,
          x: i * 6,
          y: 80 - (v / max) * 70,
          width: 4.5,
          height: (v / max) * 70,
          fill: color,
        },
        h("title", null, `${i}: ${v}`),
      ),
    ),
  );
}
export function LineAnalytics({
  line,
  scene,
  tables,
  presets,
  day,
  setDay,
  bin,
  setBin,
  onOD,
  onBus,
  onAnalyze,
}) {
  const profile = scene?.profiles?.find(
      (p) =>
        p.routeId === line.id && p.direction === line.dir && p.dayType === day,
    ),
    source = scene?.routeSources?.find(
      (p) => p.routeId === line.id && p.direction === line.dir,
    );
  if (!profile) return null;
  const trips = (tables?.trips ?? []).filter(
      (t) => t.route_id === line.id && t.direction === line.dir,
    ),
    fleet = presets?.find((r) => r.kind === "fleet");
  const total = profile.bins.reduce((a, b) => a + b, 0),
    section =
      bin === "all"
        ? profile.sections[0].map((_, i) =>
            profile.sections.reduce((n, s) => n + s[i], 0),
          )
        : profile.sections[+bin];
  return h(
    "div",
    { className: "linggo-line-analytics" },
    h("small", null, "真实线网 · CPTOND 上海；运营数据为固定种子模拟"),
    h("small", null, `走向来源 ${source.sourceRouteId} · WGS84`),
    h(
      "div",
      { className: "linggo-kpis" },
      h("div", null, "走向里程", h("b", null, source.km + " km")),
      h("div", null, "方向站点", h("b", null, line.stops.length)),
      h("div", null, "模拟上客", h("b", null, total + " 人次")),
      h(
        "div",
        null,
        "全网供给 / 方案需车",
        h(
          "b",
          null,
          `${fleet?.summary?.vehicles_available ?? "—"} / ${fleet?.summary?.vehicles_required ?? "—"} 辆`,
        ),
      ),
      h("div", null, "窗口计划班次", h("b", null, trips.length)),
      h("div", null, "实测运营 / 票价", h("b", null, "—")),
    ),
    h(
      "small",
      null,
      `方案运力缺口 ${fleet?.summary?.gap ?? "—"} 辆；回放展示方案所需车辆，不表示实有供给。`,
    ),
    h(
      "div",
      { className: "linggo-row" },
      ...Object.entries({
        workday: "工作日",
        saturday: "周六",
        sunday: "周日",
      }).map(([k, v]) =>
        h(
          "button",
          { key: k, "aria-pressed": day === k, onClick: () => setDay(k) },
          v,
        ),
      ),
    ),
    h("p", null, "分时客流 · 半小时"),
    h(Bars, { values: profile.bins, label: "模拟分时客流" }),
    h(
      "select",
      {
        "aria-label": "客流时段",
        value: bin,
        onChange: (e) => setBin(e.target.value),
      },
      h("option", { value: "all" }, "全天"),
      ...profile.bins.map((_, i) =>
        h(
          "option",
          { key: i, value: i },
          clock(i * 1800).slice(0, 5) + "–" + clock((i + 1) * 1800).slice(0, 5),
        ),
      ),
    ),
    h(
      "div",
      { className: "linggo-row" },
      h("button", { onClick: onOD }, "显示 / 隐藏 OD"),
      h("button", { onClick: onBus }, "计划车辆回放"),
    ),
    h("p", null, "断面载客量 · " + (bin === "all" ? "全天累计" : "所选时段")),
    h(Bars, { values: section, color: "#f2b557", label: "模拟断面载客量" }),
    h(
      "small",
      null,
      "去程：实线 / 实心站；回程：虚线 / 空心站；班次沿真实走向模拟运行。",
    ),
    h(
      "button",
      {
        onClick: () =>
          onAnalyze?.("trip_generation", {
            day_type: day,
            capacity: 40,
            bin_minutes: 30,
          }),
      },
      "调整班次与配车",
    ),
  );
}
export function DrtPanels({
  overlay,
  time,
  selection,
  setSelection,
  onLocate,
  onAnalyze,
}) {
  const v = overlay.vehicles.find((v) => v.id === selection.vehicleId),
    state = v && vehicleState(v, time, overlay.requests),
    labels = {
      completed_in_window: "片段完成订单",
      associated_orders: "关联订单",
      carry_in: "初始在车订单",
      carry_out: "结束未完成",
      avg_wait_min: "平均等待（分钟）",
      total_km: "轨迹里程（km）",
      served: "服务订单",
      rejected: "拒单",
      service_rate: "服务率",
      mean_wait_min: "平均等待（分钟）",
      shared_requests: "拼车订单",
      rejected_samples: "拒单样本",
      p90_wait_min: "P90 等待（分钟）",
      pool_rate: "片段拼车率",
    };
  return h(
    "div",
    { className: "linggo-drt-dock" },
    h(
      "section",
      { className: "linggo-map-card" },
      h("strong", null, overlay.source),
      h("small", null, overlay.statisticsScope?.label ?? "模拟需求全场景"),
      h(
        "div",
        { className: "linggo-kpis" },
        ...(overlay.statisticsScope
          ? [
              "completed_in_window",
              "avg_wait_min",
              "p90_wait_min",
              "pool_rate",
              "total_km",
              "associated_orders",
            ].map((k) => [k, overlay.summary?.[k]])
          : Object.entries(overlay.summary ?? {})
              .filter(([k]) => labels[k])
              .slice(0, 6)
        ).map(([k, x]) =>
          h(
            "div",
            { key: k },
            labels[k],
            h(
              "b",
              null,
              k === "pool_rate" || k === "service_rate"
                ? Math.round(x * 1000) / 10 + "%"
                : typeof x === "number"
                  ? Math.round(x * 100) / 100
                  : x,
            ),
          ),
        ),
      ),
      overlay.statisticsScope &&
        h(
          "small",
          null,
          `初始在车 ${overlay.summary.carry_in} 笔 · 结束未完成 ${overlay.summary.carry_out} 笔。` +
            overlay.statisticsScope.note +
            " 拼车率按关联订单在窗口内有载客区间重叠统计。",
        ),
      overlay.originalScenarioReference &&
        h(
          "details",
          null,
          h("summary", null, "原场景参考（非六车片段）"),
          ...Object.entries(overlay.originalScenarioReference).map(([k, x]) =>
            h(
              "p",
              { key: k },
              `${{ serveRate: "原完整场景服务率", avgWaitMin: "平均等待（分钟）", p90WaitMin: "P90 等待（分钟）", poolRate: "拼车率", emptyShare: "空驶率", winRate: "快于原出行" }[k]}: ${k.endsWith("Min") ? Math.round(x * 100) / 100 : Math.round(x * 1000) / 10 + "%"}`,
            ),
          ),
        ),
      h(
        "button",
        {
          onClick: () =>
            onAnalyze?.("drt_v2", {
              fleet_size: 6,
              policy: "A",
              max_wait_min: 15,
              snap_radius_m: 700,
            }),
        },
        "模拟 A/B · 预览与比较",
      ),
    ),
    h(
      "section",
      { className: "linggo-map-card" },
      h(
        "label",
        null,
        "定位车辆",
        h(
          "select",
          {
            "aria-label": "选择回放车辆",
            value: v?.id ?? "",
            onChange: (e) => {
              setSelection({ vehicleId: e.target.value });
              onLocate(e.target.value);
            },
          },
          h("option", { value: "" }, "点击地图车辆"),
          ...overlay.vehicles.map((x) =>
            h("option", { key: x.id, value: x.id }, x.id),
          ),
        ),
      ),
      v &&
        h(
          React.Fragment,
          null,
          h(
            "strong",
            null,
            `${v.id} · ${state.load ?? "—"} / ${v.capacity ?? "—"} 人`,
          ),
          h(
            "p",
            null,
            "下一站：" +
              (state.next?.name ??
                (state.next
                  ? `${state.next.lon.toFixed(4)}, ${state.next.lat.toFixed(4)}`
                  : "片段结束 / 无后续记录")),
          ),
          state.next &&
            h(
              "small",
              null,
              `${clock(state.next.arrive)} · ETA ${Math.max(0, Math.ceil((state.next.arrive - time) / 60))} 分钟`,
            ),
          h(
            "p",
            null,
            "所属车场：" +
              (overlay.depots.find((d) => d.depot_id === v.depot_id)
                ?.depot_name ??
                v.depot_id ??
                "—"),
          ),
          h(
            "p",
            null,
            `片段已完成 ${state.completed} · 轨迹 ${v.km ?? "—"} km`,
          ),
          h(
            "button",
            {
              "aria-pressed": !!selection.fullPath,
              onClick: () =>
                setSelection({ ...selection, fullPath: !selection.fullPath }),
            },
            selection.fullPath ? "仅下一站路径" : "片段完整路径",
          ),
        ),
    ),
    h(
      "section",
      { className: "linggo-map-card" },
      h(
        "details",
        null,
        h(
          "summary",
          null,
          "事件流 · " +
            overlay.events.filter((e) => e.t <= time && e.t >= overlay.range[0])
              .length,
        ),
        h(
          "ol",
          null,
          ...overlay.events
            .filter((e) => e.t <= time && e.t >= overlay.range[0])
            .slice(-36)
            .reverse()
            .map((e, i) =>
              h(
                "li",
                { key: i },
                `${clock(e.t)} · ${{ order_received: "收到需求", pickup: "上车", dropoff: "下车", reject: "拒单" }[e.type] ?? e.type} · ${e.request_id}`,
              ),
            ),
        ),
      ),
    ),
  );
}
export function FunctionGuide({ onGuide, onAnalyze }) {
  return h(
    "details",
    { className: "linggo-function-guide linggo-map-card" },
    h("summary", null, "功能指引"),
    h("p", null, "看线网 → 看需求 → 回放车辆 → 调整方案 → 修改算法"),
    h(
      "p",
      null,
      "搜索线路、切换去回程、点击站点定位；在线路详情筛选日型和时段，查看客流、OD 与断面。切换 DRT，点击车辆查看状态与下一站，用时间轴回放和查看订单事件。",
    ),
    h(
      "button",
      { onClick: () => onAnalyze?.() },
      "四种算法 · 预览、确认、取消、结果",
    ),
    h("button", { onClick: () => onGuide?.("import") }, "导入数据 · 字段映射"),
    h(
      "button",
      { onClick: () => onGuide?.("settings") },
      "地图设置 · Python 初始化",
    ),
    h(
      "button",
      { onClick: () => onGuide?.("development") },
      "开发会话 · 修改、自检、审阅与注册",
    ),
    h(
      "p",
      null,
      "左栏可切换数据集。右栏是原生展示对话，可提问分析、查询或发起开发交接；指引不会自动发送问题或调用模型。",
    ),
  );
}
export function busOverlay(result, model) {
  const vehicles = [];
  for (const block of result.blocks ?? []) {
    const track = [];
    for (const trip of block.trips) {
      const line = (model.routes.get(trip.route_id) ?? []).find(
        (l) => l.dir === trip.direction,
      );
      if (!line?.path.length) continue;
      const path = line.path;
      const lengths = path
        .slice(1)
        .map((p, i) =>
          Math.hypot(
            (p[0] - path[i][0]) * Math.cos((p[1] * Math.PI) / 180),
            p[1] - path[i][1],
          ),
        );
      const total = lengths.reduce((a, b) => a + b, 0);
      let d = 0;
      path.forEach((p, i) => {
        if (i) d += lengths[i - 1];
        track.push({
          t: trip.start + (trip.end - trip.start) * (total ? d / total : 0),
          p,
        });
      });
    }
    if (track.length)
      vehicles.push({ id: "PLAN-" + block.vehicle_id, track, hold: false });
  }
  const times = vehicles.flatMap((v) => v.track.map((x) => x.t));
  return {
    kind: "fleet",
    name: "常规公交 · 计划 / 模拟回放（非实测 GPS）· 含方案所需车辆",
    source: "模拟班次",
    vehicles,
    requests: [],
    range: times.length ? [Math.min(...times), Math.max(...times)] : null,
  };
}
export const mapDemoStyle = `
.linggo-replay-bar>.linggo-card{border:0;border-radius:0;background:transparent;padding:0!important}.linggo-line-analytics .linggo-kpis,.linggo-drt-dock .linggo-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.linggo-line-analytics .linggo-row>*{min-width:0}.linggo-line-analytics small{display:block;margin:6px 0;color:var(--c-sub);font-size:11px}.linggo-profile-chart{width:100%;height:110px;display:block}.linggo-line-analytics p{font-size:12px;margin:12px 0 2px}.linggo-line-analytics button[aria-pressed=true]{border-color:var(--c-accent);color:var(--c-accent)}
.linggo-drt-dock{position:absolute;right:12px;top:64px;width:300px;max-height:calc(100% - 260px);overflow:auto;z-index:6;display:flex;flex-direction:column;gap:10px}.linggo-drt-dock .linggo-map-card{position:relative;padding:12px;flex:none}.linggo-drt-dock p,.linggo-drt-dock li{font-size:12px}.linggo-drt-dock small{display:block;font-size:11px;color:var(--c-sub)}.linggo-drt-dock ol{max-height:150px;overflow:auto;padding-left:20px}.linggo-function-guide{bottom:145px;left:12px;width:280px;padding:10px;max-height:50%;overflow:auto;font-size:12px;z-index:7}.linggo-function-guide p{font-size:12px}.linggo-function-guide button{width:100%;text-align:left;font-size:12px}.linggo-function-guide summary{cursor:pointer}.linggo-map-tools .linggo-mode{background:#252d33;color:white}.linggo-map-tools .linggo-mode[aria-pressed=true]{background:#ed6032}.linggo-mapwrap[data-map-width=narrow] .linggo-drt-dock{width:250px;max-height:calc(100% - 260px)}.linggo-mapwrap[data-map-width=narrow] .linggo-function-guide{width:200px;bottom:145px}.linggo-mapdemo[data-map-width=narrow] .linggo-detail-panel,.linggo-mapdemo[data-map-width=narrow] .linggo-route-panel{left:auto;right:12px;width:300px;max-height:calc(100% - 170px)}.linggo-mapdemo[data-map-width=narrow] .linggo-route-panel{left:12px;right:auto}.linggo-map-tools:has(.linggo-mode) .linggo-map-stat{display:none}.linggo-mapwrap[data-map-width=narrow] .linggo-map-tools{gap:3px;padding:4px;flex-wrap:wrap}.linggo-mapwrap[data-map-width=narrow] .linggo-map-tools button{font-size:11px;padding:4px 6px}.linggo-mapwrap[data-map-width=narrow] .linggo-map-tools select{width:90px;font-size:11px}
`;
