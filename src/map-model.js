function outOfChina(lon, lat) {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
}
export function gcj([lon, lat]) {
  if (outOfChina(lon, lat)) return [lon, lat];
  const a = 6378245.0,
    ee = 0.00669342162296594323,
    x = lon - 105,
    y = lat - 35;
  let dLat =
    -100 +
    2 * x +
    3 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  dLat +=
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  dLat +=
    ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
  dLat +=
    ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) *
      2) /
    3;
  let dLon =
    300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  dLon +=
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  dLon +=
    ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
  dLon +=
    ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) *
      2) /
    3;
  const rad = (lat / 180) * Math.PI;
  let magic = Math.sin(rad);
  magic = 1 - ee * magic * magic;
  const sq = Math.sqrt(magic);
  dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sq)) * Math.PI);
  dLon = (dLon * 180) / ((a / sq) * Math.cos(rad) * Math.PI);
  return [lon + dLon, lat + dLat];
}

export function wgs(p) {
  let q = [...p];
  for (let i = 0; i < 4; i++) {
    const g = gcj(q);
    q = [q[0] + p[0] - g[0], q[1] + p[1] - g[1]];
  }
  return q;
}
export const colors = [
  "#4275dc",
  "#16a58a",
  "#df8741",
  "#9663d4",
  "#d95877",
  "#248dab",
];
export function routeColor(id) {
  let n = 0;
  for (const c of String(id)) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return colors[n % colors.length];
}
export const STOP_RADIUS = 3;
export const STOP_RADIUS_SELECTED = 4.5;
export function bounds(points) {
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of points) {
    if (!p || !p.every(Number.isFinite)) continue;
    b = [
      Math.min(b[0], p[0]),
      Math.min(b[1], p[1]),
      Math.max(b[2], p[0]),
      Math.max(b[3], p[1]),
    ];
  }
  return Number.isFinite(b[0]) ? b : null;
}
export function mapModel(data) {
  const stops = new Map(data.stops.map((s) => [s[0], s])),
    routes = new Map(),
    through = new Map();
  const lines = data.routes.map((r, i) => ({
    ...r,
    key: r.id + "/" + r.dir + "/" + i,
    source: r.geometry?.length > 1 ? "geometry" : "connections",
    path:
      r.geometry?.length > 1
        ? r.geometry
        : r.stops
            .map((id) => stops.get(id))
            .filter(Boolean)
            .map((s) => [s[2], s[3]]),
  }));
  for (const l of lines) {
    l.bounds = bounds(l.path);
    if (!routes.has(l.id)) routes.set(l.id, []);
    routes.get(l.id).push(l);
    for (const id of l.stops) {
      if (!through.has(id)) through.set(id, new Set());
      through.get(id).add(l.id);
    }
  }
  return {
    stops,
    lines,
    routes,
    through,
    bbox: data.bbox ?? bounds(lines.flatMap((l) => l.path)),
    routeCount: routes.size,
  };
}
export function intersects(a, b) {
  return a && b && a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}
export function segmentDistance(p, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    d = dx * dx + dy * dy;
  const u = d
    ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d))
    : 0;
  return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
}
export function simplify(path, project, tolerance = 1.5) {
  if (path.length < 3) return path;
  const result = [path[0]];
  let last = project(path[0]);
  for (let i = 1; i < path.length - 1; i++) {
    const p = project(path[i]);
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= tolerance) {
      result.push(path[i]);
      last = p;
    }
  }
  result.push(path.at(-1));
  return result;
}
export function hitLine(point, lines, project, threshold = 7) {
  let hit = null,
    dist = threshold;
  for (const l of lines)
    for (let i = 1; i < l.path.length; i++) {
      const d = segmentDistance(
        point,
        project(l.path[i - 1]),
        project(l.path[i]),
      );
      if (d < dist) {
        hit = l;
        dist = d;
      }
    }
  return hit;
}
export function visibleScene(scene, project, box) {
  const { model, visible, selection, showStops = true } = scene;
  const lines = model.lines
    .filter(
      (l) =>
        visible.has(l.id) &&
        (l.id === selection.routeId || intersects(l.bounds, box)),
    )
    .map((l) => ({
      ...l,
      path: simplify(l.path, project, l.id === selection.routeId ? 0.5 : 1.5),
    }));
  if (!showStops) return { lines, stops: [] };
  // Stops pair with route visibility: only stops on currently shown routes.
  const allowed = new Set();
  for (const l of model.lines) {
    if (!visible.has(l.id)) continue;
    for (const id of l.stops) allowed.add(id);
  }
  const priority = new Set(
    model.lines
      .filter((l) => l.id === selection.routeId && visible.has(l.id))
      .flatMap((l) => l.stops),
  );
  // Keep the open stop bubble anchored even if its routes were just hidden.
  if (selection.stopId) priority.add(selection.stopId);
  // Thin dense areas for performance, but every drawn marker stays a single
  // stop at a fixed pixel size — no multi-stop cluster blobs or count glyphs.
  const cells = new Map(),
    stops = [];
  for (const s of model.stops.values()) {
    const id = s[0];
    const isPriority = priority.has(id);
    if (!isPriority && !allowed.has(id)) continue;
    const p = [s[2], s[3]];
    if (!isPriority && !intersects([p[0], p[1], p[0], p[1]], box)) continue;
    const px = project(p);
    if (isPriority) {
      stops.push({ point: p, ids: [id], selected: true });
      continue;
    }
    const key = Math.floor(px[0] / 24) + ":" + Math.floor(px[1] / 24);
    if (cells.has(key)) continue;
    cells.set(key, true);
    stops.push({ point: p, ids: [id], selected: false });
  }
  return { lines, stops };
}
