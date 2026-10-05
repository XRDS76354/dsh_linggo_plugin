"""Vehicle assignment for a given timetable.

Trip j may follow trip i on the same vehicle when it starts at least the layover after i ends, at
the same terminal (within a radius) or, if deadheading is allowed, after the empty run. The minimum
number of vehicles is a minimum path cover of that compatibility graph: trips minus a maximum
bipartite matching (Hopcroft-Karp). Run times come from arrival times when mapped, else from the
route length in route_stops and an average speed.
"""
import bisect
import math
from collections import deque

import pandas as pd

from .geo import clock, fmt, km, num

META = {
    "id": "fleet_assignment",
    "name": "常规公交配车（给定时刻表）",
    "kind": "fleet",
    "description": "把时刻表班次串成车辆运行链，求最少用车数，并与现有车辆数比较。",
    "inputs": [
        {"entity": "trips", "required": True},
        {"entity": "route_stops", "required": True},
        {"entity": "stops", "required": False},
        {"entity": "vehicles", "required": False},
    ],
    "params": {
        "layover_min": {"type": "number", "default": 5, "min": 0, "max": 120, "label": "最短折返时间（分钟）"},
        "speed_kmh": {"type": "number", "default": 18, "min": 5, "max": 80, "label": "运营车速 km/h（无到达时间时）"},
        "terminal_radius_km": {"type": "number", "default": 0.5, "min": 0, "max": 5, "label": "同一首末站半径 km"},
        "allow_deadhead": {"type": "boolean", "default": False, "label": "允许空驶调车"},
        "max_deadhead_km": {"type": "number", "default": 10, "min": 0, "max": 50, "label": "最长空驶 km"},
        "deadhead_speed_kmh": {"type": "number", "default": 25, "min": 5, "max": 80, "label": "空驶车速 km/h"},
        "max_idle_min": {"type": "number", "default": 180, "min": 10, "max": 1440, "label": "最长停站等待（分钟，超出视为回场）"},
        "service_id": {"type": "string", "default": "", "label": "服务日（空为全部）"},
        "routes": {"type": "string", "default": "", "label": "线路编号（逗号分隔，空为全部）"},
    },
}

MAX_TRIPS = 30000


def route_shapes(route_stops, stops=None):
    """(route_id, direction) -> list of (lon, lat) in stop order."""
    rs = route_stops.copy()
    rs["lon"], rs["lat"] = num(rs.get("lon", pd.Series(index=rs.index, dtype=str))), num(rs.get("lat", pd.Series(index=rs.index, dtype=str)))
    if stops is not None and not stops.empty and rs["lon"].isna().any():
        pos = {str(r.stop_id): (r.lon, r.lat) for r in stops.assign(lon=num(stops["lon"]), lat=num(stops["lat"])).itertuples(index=False)}
        miss = rs["lon"].isna()
        rs.loc[miss, "lon"] = [pos.get(s, (None, None))[0] for s in rs.loc[miss, "stop_id"]]
        rs.loc[miss, "lat"] = [pos.get(s, (None, None))[1] for s in rs.loc[miss, "stop_id"]]
    rs = rs.dropna(subset=["lon", "lat"])
    rs["seq"] = num(rs["seq"])
    out = {}
    for (rid, d), g in rs.sort_values("seq").groupby(["route_id", "direction"], sort=False):
        out[(str(rid), str(d))] = [(float(x), float(y)) for x, y in zip(g["lon"], g["lat"])]
    return out


def length_km(path):
    return sum(km(a, b) for a, b in zip(path, path[1:]))


def prepare(trips, shapes, p):
    """Timetable rows -> trips with start/end seconds and terminals; returns (trips, unassigned)."""
    out, bad = [], []
    has_arrival = "arrival_time" in trips.columns
    lengths = {k: length_km(v) for k, v in shapes.items()}
    for i, r in enumerate(trips.itertuples(index=False)):
        tid = str(getattr(r, "trip_id", "") or f"T{i + 1}")
        key = (str(r.route_id), str(getattr(r, "direction", "") or "0"))
        start = clock(r.departure_time)
        if start is None:
            bad.append({"trip_id": tid, "reason": "发车时间无法解析"})
            continue
        shape = shapes.get(key)
        if not shape or len(shape) < 2:
            bad.append({"trip_id": tid, "reason": "缺少该线路方向的站序坐标，无法确定首末站"})
            continue
        end = clock(getattr(r, "arrival_time", None)) if has_arrival else None
        if end is None or end <= start:
            end = start + lengths[key] / p["speed_kmh"] * 3600
        out.append({"trip_id": tid, "route_id": key[0], "direction": key[1], "start": start, "end": end, "from": shape[0], "to": shape[-1]})
    return out, bad


def _hopcroft_karp(n, adj):
    match_l, match_r = [-1] * n, [-1] * n
    dist = [0] * n
    inf = math.inf

    def bfs():
        q = deque()
        found = False
        for u in range(n):
            if match_l[u] == -1:
                dist[u] = 0
                q.append(u)
            else:
                dist[u] = inf
        while q:
            u = q.popleft()
            for v in adj[u]:
                w = match_r[v]
                if w == -1:
                    found = True
                elif dist[w] == inf:
                    dist[w] = dist[u] + 1
                    q.append(w)
        return found

    def dfs(root):
        # Iterative augmenting-path search along the BFS layers; via[k] links stack[k] to stack[k + 1].
        stack, via, iters = [root], [], {root: iter(adj[root])}
        while stack:
            u = stack[-1]
            for v in iters[u]:
                w = match_r[v]
                if w == -1:
                    via.append(v)
                    for a, b in zip(stack, via):
                        match_l[a], match_r[b] = b, a
                    return True
                if dist[w] == dist[u] + 1:
                    via.append(v)
                    stack.append(w)
                    iters[w] = iter(adj[w])
                    break
            else:
                dist[u] = inf
                stack.pop()
                if via:
                    via.pop()
        return False

    size = 0
    while bfs():
        for u in range(n):
            if match_l[u] == -1 and dfs(u):
                size += 1
    return match_l, size


def assign(trips, p, progress=lambda v, m="": None):
    """Minimum vehicle chains for prepared trips."""
    if len(trips) > MAX_TRIPS:
        raise ValueError(f"班次 {len(trips)} 超过单次上限 {MAX_TRIPS}，请按服务日或线路筛选")
    trips = sorted(trips, key=lambda t: t["start"])
    n = len(trips)
    layover = p["layover_min"] * 60
    max_idle = p["max_idle_min"] * 60
    radius = p["terminal_radius_km"]
    reach = max(radius, p["max_deadhead_km"] if p["allow_deadhead"] else 0)
    cell = max(reach, 0.2) / 111.0
    grid = {}
    for j, t in enumerate(trips):
        grid.setdefault((int(t["from"][0] // cell), int(t["from"][1] // cell)), []).append(j)
    starts = {k: [trips[j]["start"] for j in v] for k, v in grid.items()}
    adj = [[] for _ in range(n)]
    lat0 = trips[0]["to"][1] if n else 0
    span_y = int(math.ceil(reach / (cell * 111.0))) + 1
    span_x = int(math.ceil(reach / (cell * 111.0 * max(math.cos(math.radians(lat0)), 0.2)))) + 1
    for i, t in enumerate(trips):
        if i % 2000 == 0:
            progress(0.6 * i / max(n, 1), f"构建接续关系 {i}/{n}")
        cx, cy = int(t["to"][0] // cell), int(t["to"][1] // cell)
        lo, hi = t["end"] + layover, t["end"] + max_idle
        for dx in range(-span_x, span_x + 1):
            for dy in range(-span_y, span_y + 1):
                key = (cx + dx, cy + dy)
                if key not in grid:
                    continue
                idx, st = grid[key], starts[key]
                for k in range(bisect.bisect_left(st, lo), bisect.bisect_right(st, hi)):
                    j = idx[k]
                    d = km(t["to"], trips[j]["from"])
                    if d <= radius:
                        adj[i].append(j)
                    elif p["allow_deadhead"] and d <= p["max_deadhead_km"]:
                        if trips[j]["start"] >= lo + d / p["deadhead_speed_kmh"] * 3600:
                            adj[i].append(j)
    progress(0.7, "求解最少用车")
    match, size = _hopcroft_karp(n, adj)
    has_pred = set(v for v in match if v != -1)
    blocks = []
    for i in range(n):
        if i in has_pred:
            continue
        chain, u = [], i
        while u != -1:
            chain.append(u)
            u = match[u]
        blocks.append(chain)
    blocks.sort(key=lambda c: trips[c[0]]["start"])
    out, deadhead = [], 0.0
    for b, chain in enumerate(blocks):
        items = []
        for k, j in enumerate(chain):
            t = trips[j]
            if k:
                d = km(trips[chain[k - 1]]["to"], t["from"])
                if d > radius:
                    deadhead += d
            items.append({"trip_id": t["trip_id"], "route_id": t["route_id"], "direction": t["direction"],
                          "start": round(t["start"], 1), "end": round(t["end"], 1),
                          "from": [round(t["from"][0], 6), round(t["from"][1], 6)], "to": [round(t["to"][0], 6), round(t["to"][1], 6)]})
        out.append({"vehicle_id": f"B{b + 1:04d}", "start": items[0]["start"], "end": items[-1]["end"], "trips": items})
    events = sorted([(t["start"], 1) for t in trips] + [(t["end"] + layover, -1) for t in trips], key=lambda e: (e[0], e[1]))
    peak = cur = 0
    for _, e in events:
        cur += e
        peak = max(peak, cur)
    return {"blocks": out, "vehicles": n - size, "peak": peak, "deadhead_km": round(deadhead, 1)}


def solve(inputs, p, progress=lambda v, m="": None):
    trips = inputs["trips"]
    if p["service_id"]:
        trips = trips[trips["service_id"].astype(str) == p["service_id"]]
    if p["routes"]:
        keep = {x.strip() for x in p["routes"].split(",") if x.strip()}
        trips = trips[trips["route_id"].astype(str).isin(keep)]
    if trips.empty:
        raise ValueError("筛选后没有班次")
    shapes = route_shapes(inputs["route_stops"], inputs.get("stops"))
    prepared, bad = prepare(trips, shapes, p)
    if not prepared:
        raise ValueError("没有可配车的班次：" + (bad[0]["reason"] if bad else ""))
    a = assign(prepared, p, progress)
    veh = inputs.get("vehicles")
    available = None if veh is None or veh.empty else len(veh)
    notes = [f"最短折返 {p['layover_min']} 分钟；首末站半径 {p['terminal_radius_km']} km"]
    if "arrival_time" not in trips.columns or trips["arrival_time"].eq("").all():
        notes.append(f"无到达时间，运行时间按站序距离 ÷ {p['speed_kmh']} km/h 估算")
    notes.append("允许空驶调车" if p["allow_deadhead"] else "不允许空驶调车：车辆只在同一首末站接续")
    notes.append(f"停站等待超过 {p['max_idle_min']} 分钟视为回场，之后的班次需另一车次链")
    summary = {
        "trips": len(trips),
        "assigned": len(prepared),
        "unassigned": len(bad),
        "vehicles_required": a["vehicles"],
        "peak_concurrent": a["peak"],
        "vehicles_available": available,
        "gap": None if available is None else a["vehicles"] - available,
        "avg_trips_per_vehicle": round(len(prepared) / a["vehicles"], 2) if a["vehicles"] else 0,
        "deadhead_km": a["deadhead_km"],
    }
    return {"kind": "fleet", "summary": summary, "assumptions": notes, "blocks": a["blocks"], "unassigned": bad[:500]}


def validate(result, p):
    errs = []
    if not isinstance(result.get("blocks"), list):
        return ["结果缺少 blocks 列表"]
    seen = set()
    layover = p.get("layover_min", 5) * 60
    radius = p.get("terminal_radius_km", 0.5)
    for b in result["blocks"]:
        prev = None
        for t in b.get("trips", []):
            if t["trip_id"] in seen:
                errs.append(f"班次 {t['trip_id']} 被分配了多次")
            seen.add(t["trip_id"])
            if t["end"] < t["start"]:
                errs.append(f"班次 {t['trip_id']} 结束早于开始")
            if prev:
                d = km(prev["to"], t["from"])
                need = prev["end"] + layover
                if d > radius + 1e-6:
                    if not p.get("allow_deadhead"):
                        errs.append(f"车辆 {b.get('vehicle_id')}：{prev['trip_id']} → {t['trip_id']} 首末站不同且不允许空驶")
                    elif d > p.get("max_deadhead_km", 10) + 1e-6:
                        errs.append(f"车辆 {b.get('vehicle_id')}：{prev['trip_id']} → {t['trip_id']} 空驶超过上限")
                    need += d / p.get("deadhead_speed_kmh", 25) * 3600
                if t["start"] + 1 < need:
                    errs.append(f"车辆 {b.get('vehicle_id')}：{prev['trip_id']} → {t['trip_id']} 接续时间不足")
            prev = t
    s = result.get("summary", {})
    if s.get("vehicles_required") is not None and s["vehicles_required"] != len(result["blocks"]):
        errs.append("用车数与车次链数量不一致")
    return errs


def run(inputs, params, ctx):
    return solve(inputs, params, ctx.progress)


__all__ = ["META", "run", "validate", "assign", "prepare", "route_shapes", "fmt"]

META_DEFAULTS = {k: v["default"] for k, v in META["params"].items()}
