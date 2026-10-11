const km = (a, b) => {
  const r = Math.PI / 180,
    x = (b[1] - a[1]) * r,
    y = (b[0] - a[0]) * r;
  return (
    12742 *
    Math.asin(
      Math.sqrt(
        Math.sin(x / 2) ** 2 +
          Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(y / 2) ** 2,
      ),
    )
  );
};
export const vehicleColor = (i) => ["#2a78d6", "#eb6834", "#898781"][i % 3];
export function buildOverlay(run, result) {
  const vehicles = [];
  if (run.kind === "drt")
    for (const v of result.vehicles ?? []) {
      const stops = v.stops ?? [];
      let track = v.track;
      if (!track?.length && stops.length) {
        const first = stops[0];
        track = [
          {
            t:
              first.arrive -
              (km(v.start, [first.lon, first.lat]) *
                (result.params?.detour_factor ?? 1.3) *
                3600) /
                (result.params?.speed_kmh ?? 25),
            p: v.start,
          },
          ...stops.flatMap((s) => [
            { t: s.arrive, p: [s.lon, s.lat] },
            { t: s.depart, p: [s.lon, s.lat] },
          ]),
        ];
      }
      if (track?.length)
        vehicles.push({ ...v, id: v.vehicle_id, track, hold: true });
    }
  else if (run.kind === "fleet")
    for (const b of result.blocks ?? []) {
      const track = b.trips.flatMap((x) => [
        { t: x.start, p: x.from },
        { t: x.end, p: x.to },
      ]);
      if (track.length) vehicles.push({ id: b.vehicle_id, track, hold: false });
    }
  const requests = (result.requests ?? [])
    .filter((r) => r.o?.length === 2)
    .map((r) => ({ ...r, t: r.request_time }));
  const pts = vehicles.flatMap((v) => v.track.map((p) => p.t));
  return {
    kind: run.kind,
    name: run.algorithmName,
    synthetic: run.synthetic,
    source:
      run.provenance?.origin === "anonymous-recorded-clip"
        ? "匿名既有计算片段"
        : run.synthetic || result.synthetic
          ? "模拟运营"
          : "输入数据计算方案",
    demo: !!run.precomputed,
    vehicles,
    requests,
    depots: result.depots ?? [],
    events:
      result.events ??
      requests
        .flatMap((r) =>
          [
            ["order_received", r.request_time],
            ["pickup", r.pickup_time],
            ["dropoff", r.dropoff_time],
          ]
            .filter(([, t]) => Number.isFinite(t))
            .map(([type, t]) => ({
              type,
              t,
              request_id: r.request_id,
              vehicle_id: r.vehicle_id,
            })),
        )
        .sort((a, b) => a.t - b.t),
    summary: result.summary,
    statisticsScope: result.statisticsScope,
    originalScenarioReference: result.originalScenarioReference,
    range:
      result.range ??
      (pts.length ? [Math.min(...pts), Math.max(...pts)] : null),
  };
}
export function positionAt(v, t) {
  const tr = v.track;
  if (!tr?.length) return null;
  if (t < tr[0].t) return v.hold ? tr[0].p : null;
  if (t >= tr.at(-1).t) return v.hold ? tr.at(-1).p : null;
  let lo = 0,
    hi = tr.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tr[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = tr[lo],
    b = tr[hi],
    f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  return a.p.map((x, i) => x + (b.p[i] - x) * f);
}
export function vehicleState(v, time, requests = []) {
  const past = (v.stops ?? []).filter((s) => s.arrive <= time),
    next = (v.stops ?? []).find((s) => s.arrive > time);
  let load = v.initial_load;
  if (past.length && Number.isFinite(past.at(-1).load)) load = past.at(-1).load;
  else if (
    requests.some(
      (r) =>
        r.vehicle_id === v.id &&
        Number.isFinite(r.pickup_time) &&
        Number.isFinite(r.dropoff_time),
    )
  )
    load = requests
      .filter(
        (r) =>
          r.vehicle_id === v.id &&
          r.served &&
          r.pickup_time <= time &&
          time < r.dropoff_time,
      )
      .reduce((n, r) => n + (r.passengers ?? 1), 0);
  // Legacy results without sufficient state stay unknown instead of inventing an empty bus.
  const status =
    load > 0
      ? "loaded"
      : next?.pickups?.length
        ? "pickup"
        : load === 0
          ? "idle"
          : "unknown";
  const a = positionAt(v, time),
    b = positionAt({ ...v, hold: true }, Math.min(time + 3, v.track.at(-1).t));
  let from = a,
    to = b;
  if (a && b && km(a, b) < 0.00001) {
    const segment = v.track
      .slice(1)
      .map((x, i) => [v.track[i], x])
      .filter(([x, y]) => x.t <= time && km(x.p, y.p) > 0.00001)
      .at(-1);
    if (segment) {
      from = segment[0].p;
      to = segment[1].p;
    }
  }
  const heading =
    from && to
      ? Math.atan2(
          (to[0] - from[0]) * Math.cos((from[1] * Math.PI) / 180),
          to[1] - from[1],
        )
      : 0;
  return {
    load,
    next,
    status,
    heading,
    color:
      status === "loaded"
        ? "#2a78d6"
        : status === "pickup"
          ? "#eb6834"
          : "#898781",
    completed: requests.filter(
      (r) =>
        r.vehicle_id === v.id &&
        r.served &&
        r.dropoff_time <= time &&
        r.dropoff_time >= (v.track[0]?.t ?? 0),
    ).length,
  };
}
export function overlayBox(o) {
  const p = o.vehicles
    .flatMap((v) => v.track.map((x) => x.p))
    .concat(o.requests.map((r) => r.o));
  return p.length
    ? [
        Math.min(...p.map((x) => x[0])),
        Math.min(...p.map((x) => x[1])),
        Math.max(...p.map((x) => x[0])),
        Math.max(...p.map((x) => x[1])),
      ]
    : null;
}
export function hitVehicle(p, project, overlay, time) {
  return overlay?.vehicles.find((v) => {
    const q = positionAt(v, time);
    return q && Math.hypot(...project(q).map((n, i) => n - p[i])) < 18;
  });
}
const busImages = new Map();
export function busSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="32" cy="52" rx="23" ry="7" fill="#263d5633"/><path d="M9 22 23 12 55 23 41 33Z" fill="${color}"/><path d="M9 22 41 33 41 53 9 42Z" fill="${color}"/><path d="M41 33 55 23 55 43 41 53Z" fill="#163f6b"/><path d="M14 27 35 34 35 43 14 36Z" fill="#b7e2ff"/><path d="M44 34 52 28 52 37 44 43Z" fill="#8bc4e8"/><path d="M14 20 24 14 49 23 40 29Z" fill="#ecf6ff"/><ellipse cx="18" cy="44" rx="4" ry="6" fill="#263d56"/><ellipse cx="36" cy="51" rx="4" ry="6" fill="#263d56"/></svg>`;
}
function busImage(color) {
  if (typeof Image === "undefined") return null;
  if (!busImages.has(color)) {
    const image = new Image();
    image.src =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(busSvg(color));
    busImages.set(color, image);
  }
  return busImages.get(color);
}
export function drawOverlay(g, px, o, time, selection = {}) {
  g.save();
  for (const d of o.depots ?? []) {
    const [x, y] = px([+d.lon, +d.lat]);
    g.fillStyle = "#4a5668";
    g.fillRect(x - 9, y - 9, 18, 18);
    g.fillStyle = "#fff";
    g.font = "bold 13px sans-serif";
    g.fillText("P", x - 4, y + 5);
  }
  for (const r of o.requests) {
    if (r.t > time) continue;
    const waiting = r.served && time < r.pickup_time,
      riding = r.served && r.pickup_time <= time && time < r.dropoff_time;
    if (!waiting && !riding && r.served) continue;
    const a = px(r.o),
      b = r.d ? px(r.d) : a;
    g.strokeStyle = riding ? "#2a78d655" : "#eb683466";
    g.fillStyle = r.served ? (waiting ? "#eb6834" : "#2a78d6") : "#c92a2a";
    g.lineWidth = 1;
    g.setLineDash(waiting ? [5, 4] : []);
    g.beginPath();
    g.moveTo(...a);
    g.lineTo(...b);
    g.stroke();
    g.setLineDash([]);
    g.beginPath();
    g.arc(...(riding ? b : a), 3, 0, Math.PI * 2);
    g.fill();
  }
  for (const v of o.vehicles) {
    const pos = positionAt(v, time);
    if (!pos) continue;
    const s = vehicleState(v, time, o.requests),
      chosen = selection.vehicleId === v.id;
    if (chosen) {
      g.strokeStyle = s.color;
      g.lineWidth = 3;
      g.beginPath();
      const path = selection.fullPath
        ? v.track.filter((x) => x.t >= o.range[0] && x.t <= o.range[1])
        : [
            { t: time, p: pos },
            ...v.track.filter(
              (x) => x.t > time && x.t <= (s.next?.arrive ?? time),
            ),
          ];
      path.forEach((x, i) => (i ? g.lineTo(...px(x.p)) : g.moveTo(...px(x.p))));
      g.stroke();
    }
    const [x, y] = px(pos);
    g.save();
    g.translate(x, y);
    if (chosen && busImage(s.color)?.complete) {
      g.drawImage(busImage(s.color), -28, -40, 56, 56);
    } else if (chosen) {
      // Immediate fallback while the SVG decodes.
      g.fillStyle = "#174373";
      g.beginPath();
      g.moveTo(-15, -12);
      g.lineTo(15, -3);
      g.lineTo(15, 16);
      g.lineTo(-15, 7);
      g.closePath();
      g.fill();
      g.fillStyle = s.color;
      g.beginPath();
      g.moveTo(-15, -12);
      g.lineTo(-4, -19);
      g.lineTo(26, -10);
      g.lineTo(15, -3);
      g.closePath();
      g.fill();
      g.fillStyle = "#91cff3";
      g.beginPath();
      g.moveTo(15, -3);
      g.lineTo(26, -10);
      g.lineTo(26, 9);
      g.lineTo(15, 16);
      g.closePath();
      g.fill();
      g.fillStyle = "#c3eaff";
      g.fillRect(-10, -5, 17, 7);
      g.fillStyle = "#28384b";
      g.fillRect(-9, 8, 5, 6);
      g.fillRect(12, 14, 5, 6);
    } else {
      g.rotate(s.heading);
      g.fillStyle = "#fff";
      g.beginPath();
      g.roundRect(-6, -12, 12, 24, 4);
      g.fill();
      g.fillStyle = s.color;
      g.beginPath();
      g.roundRect(-4, -10, 8, 20, 3);
      g.fill();
      g.fillStyle = "#dceeff";
      g.fillRect(-3, -6, 6, 4);
      g.fillRect(-3, 4, 6, 3);
    }
    g.restore();
  }
  g.restore();
}
export function drawOD(g, project, flow) {
  if (!flow) return;
  g.save();
  for (const f of flow.flows ?? [flow]) {
    if (!f.origin || !f.destination) continue;
    const a = project(f.origin),
      b = project(f.destination);
    g.strokeStyle = flow.color ?? "#9663d4";
    g.globalAlpha = 0.18 + Math.min(0.45, (f.count ?? 1) / 60);
    g.lineWidth = 1 + Math.sqrt(f.count ?? 1) * 0.3;
    g.beginPath();
    g.moveTo(...a);
    g.quadraticCurveTo(
      (a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.15,
      (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.15,
      ...b,
    );
    g.stroke();
  }
  g.restore();
}
