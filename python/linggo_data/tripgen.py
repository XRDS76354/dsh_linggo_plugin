"""Trip generation from time-of-day ridership, with a capacity gap and fleet feasibility report.

For every route direction and time bin the design load (passengers per hour on the busiest
section) sets the headway: capacity x target load factor / design load, clamped to the policy
headway range. Where even the minimum headway cannot carry the load, the shortfall is reported
rather than hidden. Optionally the generated timetable is assigned to vehicles and compared with
the available fleet.
"""
import pandas as pd

from . import fleet
from .geo import clock, fmt, num, time_bin

META = {
    "id": "trip_generation",
    "name": "客流班次生成",
    "kind": "tripgen",
    "description": "按分时段客流计算各线路方向发车间隔并生成班次，报告运力缺口；可同时配车检查车辆是否够用。",
    "inputs": [
        {"entity": "ridership", "required": True},
        {"entity": "route_stops", "required": False},
        {"entity": "stops", "required": False},
        {"entity": "vehicles", "required": False},
    ],
    "params": {
        "capacity": {"type": "integer", "default": 80, "min": 5, "max": 300, "label": "单车额定载客"},
        "load_factor": {"type": "number", "default": 0.85, "min": 0.1, "max": 1.5, "label": "目标满载率"},
        "min_headway_min": {"type": "number", "default": 3, "min": 1, "max": 60, "label": "最小发车间隔（分钟）"},
        "max_headway_min": {"type": "number", "default": 30, "min": 2, "max": 180, "label": "最大发车间隔（分钟）"},
        "service_start": {"type": "string", "default": "06:00", "label": "首班时间"},
        "service_end": {"type": "string", "default": "22:00", "label": "末班时间"},
        "bin_minutes": {"type": "integer", "default": 60, "min": 5, "max": 240, "label": "单个小时值时段长度（分钟）"},
        "section_factor": {"type": "number", "default": 0.6, "min": 0.05, "max": 1, "label": "最大断面 / 上车人数（无站级数据时）"},
        "assign_fleet": {"type": "boolean", "default": True, "label": "生成后配车检查"},
        "layover_min": {"type": "number", "default": 5, "min": 0, "max": 120, "label": "配车最短折返（分钟）"},
        "speed_kmh": {"type": "number", "default": 18, "min": 5, "max": 80, "label": "配车运营车速 km/h"},
        "routes": {"type": "string", "default": "", "label": "线路编号（逗号分隔，空为全部）"},
    },
}


def design_loads(ridership, route_stops, p, notes):
    """(route, direction, bin_start, bin_len) -> passengers per hour on the design section."""
    r = ridership.copy()
    bins = [time_bin(v, p["bin_minutes"]) for v in r["time_bin"]]
    bad = sum(1 for b in bins if b is None)
    r["b0"] = [b[0] if b else None for b in bins]
    r["blen"] = [b[1] if b else None for b in bins]
    r = r.dropna(subset=["b0"])
    if bad:
        notes.append(f"{bad} 行客流时段无法解析，已忽略")
    r["boardings"] = num(r["boardings"], 0)
    r["alightings"] = num(r.get("alightings", pd.Series("", index=r.index)), 0)
    r["direction"] = r["direction"].replace("", "0")
    stop_level = (
        route_stops is not None and not route_stops.empty and r["stop_id"].ne("").all() and r["alightings"].sum() > 0
    )
    out = {}
    if stop_level:
        notes.append("设计客流 = 站级上下客累计得到的最大断面")
        seq = {(str(a), str(b), str(c)): float(d) for a, b, c, d in zip(route_stops["route_id"], route_stops["direction"].replace("", "0"), route_stops["stop_id"], num(route_stops["seq"]))}
        r["seq"] = [seq.get((a, b, c)) for a, b, c in zip(r["route_id"], r["direction"], r["stop_id"])]
        miss = r["seq"].isna().sum()
        if miss:
            notes.append(f"{miss} 行客流的站点不在线路站序中，已忽略")
        r = r.dropna(subset=["seq"])
        for (rid, d, b0, blen), g in r.groupby(["route_id", "direction", "b0", "blen"]):
            g = g.sort_values("seq")
            load = (g["boardings"] - g["alightings"]).cumsum().clip(lower=0).max()
            out[(rid, d, int(b0), int(blen))] = float(load) * 3600 / blen
    else:
        notes.append(f"设计客流 = 时段上车人数 × 断面系数 {p['section_factor']}（没有站级上下客数据）")
        for (rid, d, b0, blen), g in r.groupby(["route_id", "direction", "b0", "blen"]):
            out[(rid, d, int(b0), int(blen))] = float(g["boardings"].sum()) * p["section_factor"] * 3600 / blen
    return out


def solve(inputs, p, progress=lambda v, m="": None):
    start, end = clock(p["service_start"]), clock(p["service_end"])
    if start is None or end is None or end <= start:
        raise ValueError("首末班时间无效，应为 HH:MM")
    if p["min_headway_min"] > p["max_headway_min"]:
        raise ValueError("最小发车间隔不能大于最大发车间隔")
    rid = inputs["ridership"]
    if p["routes"]:
        keep = {x.strip() for x in p["routes"].split(",") if x.strip()}
        rid = rid[rid["route_id"].astype(str).isin(keep)]
    if rid.empty:
        raise ValueError("筛选后没有客流数据")
    notes = []
    loads = design_loads(rid, inputs.get("route_stops"), p, notes)
    per_cap = p["capacity"] * p["load_factor"]
    hmin, hmax = p["min_headway_min"] * 60, p["max_headway_min"] * 60
    lines = sorted({(k[0], k[1]) for k in loads})
    trips, table, gaps = [], [], []
    for li, (route, d) in enumerate(lines):
        progress(0.5 * li / len(lines), f"生成班次 {route}")
        bins = sorted((k[2], k[3], v) for k, v in loads.items() if k[0] == route and k[1] == d)

        def headway(t):
            for b0, blen, load in bins:
                if b0 <= t < b0 + blen:
                    need = 3600 * per_cap / load if load > 0 else hmax
                    return min(max(need, hmin), hmax), load
            return hmax, 0.0

        for b0, blen, load in bins:
            need = 3600 * per_cap / load if load > 0 else hmax
            hw = min(max(need, hmin), hmax)
            supply = 3600 / hw * per_cap
            row = {"route_id": route, "direction": d, "bin": f"{fmt(b0)[:5]}-{fmt(b0 + blen)[:5]}", "design_load_ph": round(load, 1),
                   "headway_min": round(hw / 60, 1), "capacity_ph": round(supply, 1), "shortfall_ph": round(max(0, load - supply), 1)}
            table.append(row)
            if row["shortfall_ph"] > 0:
                gaps.append(row)
        t, n = start, 0
        while t <= end:
            n += 1
            trips.append({"trip_id": f"{route}-{d}-{n:03d}", "route_id": route, "direction": d, "departure_time": fmt(t)})
            t += headway(t)[0]
    if any(b0 < start or b0 + blen > end + 1 for (_, _, b0, blen) in loads):
        notes.append("部分客流时段在首末班时间之外，未生成班次")
    summary = {
        "routes": len({l[0] for l in lines}),
        "directions": len(lines),
        "trips": len(trips),
        "gap_bins": len(gaps),
        "max_shortfall_ph": max((g["shortfall_ph"] for g in gaps), default=0),
        "feasible": not gaps,
    }
    result = {"kind": "tripgen", "summary": summary, "assumptions": notes, "trips": trips, "headways": table, "gaps": gaps}
    if p["assign_fleet"]:
        rs = inputs.get("route_stops")
        if rs is None or rs.empty:
            notes.append("没有线路站序，未做配车检查")
        else:
            progress(0.6, "配车检查")
            shapes = fleet.route_shapes(rs, inputs.get("stops"))
            fp = {**fleet.META_DEFAULTS, "layover_min": p["layover_min"], "speed_kmh": p["speed_kmh"]}
            prepared, bad = fleet.prepare(pd.DataFrame(trips), shapes, fp)
            if prepared:
                a = fleet.assign(prepared, fp)
                veh = inputs.get("vehicles")
                available = None if veh is None or veh.empty else len(veh)
                summary["vehicles_required"] = a["vehicles"]
                summary["vehicles_available"] = available
                if available is not None and a["vehicles"] > available:
                    summary["feasible"] = False
                    gaps.append({"route_id": "全部", "direction": "", "bin": "全天", "fleet_shortfall": a["vehicles"] - available,
                                 "message": f"需要 {a['vehicles']} 辆车，现有 {available} 辆"})
            if bad:
                notes.append(f"{len(bad)} 个生成班次缺少站序坐标，未参与配车")
    progress(1, "完成")
    return result


def validate(result, p):
    errs = []
    if not isinstance(result.get("trips"), list):
        return ["结果缺少 trips 列表"]
    start, end = clock(p.get("service_start", "00:00")), clock(p.get("service_end", "47:59"))
    hmin, hmax = p.get("min_headway_min", 1) * 60, p.get("max_headway_min", 180) * 60
    last = {}
    for t in result["trips"]:
        s = clock(t.get("departure_time"))
        if s is None:
            errs.append(f"班次 {t.get('trip_id')} 发车时间无效")
            continue
        if start is not None and end is not None and not (start <= s <= end):
            errs.append(f"班次 {t.get('trip_id')} 在首末班时间之外")
        key = (t.get("route_id"), t.get("direction"))
        if key in last:
            gap = s - last[key]
            if gap < hmin - 1 or gap > hmax + 1:
                errs.append(f"班次 {t.get('trip_id')} 与前一班间隔 {gap / 60:.1f} 分钟，超出间隔范围")
        last[key] = s
    return errs


def run(inputs, params, ctx):
    return solve(inputs, params, ctx.progress)
