"""DRT dynamic insertion.

Requests are revealed in request-time order. Each one is inserted into the vehicle plan where it
adds the least route time without breaking capacity, maximum wait or maximum ride time of any
passenger on that vehicle; otherwise it is rejected. Stops a vehicle has already reached, or is
driving to, are never re-planned. Travel times use straight-line distance times a detour factor.
"""
import random

import pandas as pd

from .geo import core, fmt, km, num, travel_s

META = {
    "id": "drt_insertion",
    "name": "DRT 动态插入",
    "kind": "drt",
    "description": "按请求时间顺序把逐笔需求插入车辆计划，满足座位、最长等待和最长乘车约束，不满足则拒绝。",
    "inputs": [
        {"entity": "demand", "required": False},
        {"entity": "vehicles", "required": False},
        {"entity": "depots", "required": False},
        {"entity": "stops", "required": False},
    ],
    "params": {
        "demand_source": {"type": "enum", "options": ["data", "synthetic"], "default": "data", "label": "需求来源"},
        "date": {"type": "string", "default": "", "label": "需求日期（YYYY-MM-DD，空为全部）"},
        "fleet_size": {"type": "integer", "default": 10, "min": 1, "max": 500, "label": "车辆数（无车辆表时）"},
        "capacity": {"type": "integer", "default": 8, "min": 1, "max": 100, "label": "每车座位（车辆表未填时）"},
        "speed_kmh": {"type": "number", "default": 25, "min": 5, "max": 80, "label": "平均车速 km/h"},
        "detour_factor": {"type": "number", "default": 1.3, "min": 1, "max": 3, "label": "路网绕行系数"},
        "max_wait_min": {"type": "number", "default": 15, "min": 1, "max": 120, "label": "最长等待（分钟）"},
        "max_ride_factor": {"type": "number", "default": 1.8, "min": 1, "max": 5, "label": "最长乘车 / 直达时间"},
        "dwell_min": {"type": "number", "default": 1, "min": 0, "max": 10, "label": "每次上下客（分钟）"},
        "synthetic_requests": {"type": "integer", "default": 200, "min": 1, "max": 20000, "label": "实验需求笔数"},
        "synthetic_seed": {"type": "integer", "default": 1, "min": 0, "max": 2147483647, "label": "实验需求随机种子"},
        "synthetic_start": {"type": "string", "default": "07:00", "label": "实验需求开始时间"},
        "synthetic_end": {"type": "string", "default": "09:00", "label": "实验需求结束时间"},
    },
}

MAX_REQUESTS = 20000
NEAREST_VEHICLES = 40


def synthetic_demand(stops, n, seed, start, end, notes=None):
    """Explicit experiment demand: random stop pairs at least 1 km apart, uniform in time. Reproducible by seed.

    Stops far from the network core (misplaced coordinates, other cities) are not used as endpoints.
    """
    pts = [(float(x), float(y)) for x, y in zip(num(stops["lon"]), num(stops["lat"])) if x == x and y == y]
    flags = core([p[0] for p in pts], [p[1] for p in pts])
    if notes is not None and not all(flags):
        notes.append(f"{flags.count(False)} 个远离主要范围的站点未用作实验需求起讫点")
    pts = [p for p, ok in zip(pts, flags) if ok]
    if len(pts) < 2:
        raise ValueError("生成实验需求需要至少两个站点")
    rng = random.Random(seed)
    rows = []
    for i in range(n):
        for _ in range(20):
            o, d = rng.choice(pts), rng.choice(pts)
            if km(o, d) >= 1:
                break
        jitter = lambda p: (p[0] + rng.uniform(-0.002, 0.002), p[1] + rng.uniform(-0.002, 0.002))
        o, d = jitter(o), jitter(d)
        rows.append({"request_id": f"X{i + 1:05d}", "t": rng.uniform(start, end), "o": o, "d": d, "pax": 1})
    rows.sort(key=lambda r: r["t"])
    return rows


def _demand(inputs, p, notes):
    if p["demand_source"] == "synthetic":
        from .geo import clock

        start, end = clock(p["synthetic_start"]), clock(p["synthetic_end"])
        if start is None or end is None or end <= start:
            raise ValueError("实验需求时间段无效，应为 HH:MM")
        stops = inputs.get("stops")
        if stops is None or stops.empty:
            raise ValueError("生成实验需求需要站点数据")
        notes.append(f"需求为实验生成（种子 {p['synthetic_seed']}，{p['synthetic_requests']} 笔），不是观测数据")
        return synthetic_demand(stops, p["synthetic_requests"], p["synthetic_seed"], start, end, notes), None
    df = inputs.get("demand")
    if df is None or df.empty:
        raise ValueError("当前数据版本没有逐笔需求；请导入需求，或选择“实验生成”需求来源")
    t = pd.to_datetime(df["request_time"], errors="coerce")
    df = df.assign(when=t).dropna(subset=["when"])
    if p["date"]:
        df = df[df["when"].dt.strftime("%Y-%m-%d") == p["date"]]
        if df.empty:
            raise ValueError(f"{p['date']} 没有需求")
    day0 = df["when"].min().normalize()
    if len(df) > MAX_REQUESTS:
        raise ValueError(f"需求 {len(df)} 笔超过单次上限 {MAX_REQUESTS}，请指定日期")
    rows = []
    for i, r in enumerate(df.sort_values("when").itertuples(index=False)):
        pax = pd.to_numeric(getattr(r, "passengers", 1), errors="coerce")
        rows.append({
            "request_id": str(r.request_id or f"R{i + 1}"),
            "t": (r.when - day0).total_seconds(),
            "o": (float(r.o_lon), float(r.o_lat)),
            "d": (float(r.d_lon), float(r.d_lat)),
            "pax": int(pax) if pax == pax and pax and pax > 0 else 1,
        })
    return rows, day0.strftime("%Y-%m-%d")


def _fleet(inputs, p, requests, notes):
    depots = {}
    dep = inputs.get("depots")
    if dep is not None and not dep.empty:
        for r in dep.itertuples(index=False):
            depots[str(r.depot_id)] = (float(r.lon), float(r.lat))
    if not depots:
        xs = [q["o"][0] for q in requests]
        ys = [q["o"][1] for q in requests]
        depots["centroid"] = (sum(xs) / len(xs), sum(ys) / len(ys))
        notes.append("没有车场数据，车辆从需求起点重心出发")
    ids = list(depots)
    fleet = []
    veh = inputs.get("vehicles")
    if veh is not None and not veh.empty:
        caps = num(veh.get("capacity", pd.Series(dtype=str)))
        for i, r in enumerate(veh.itertuples(index=False)):
            cap = caps.iloc[i] if len(caps) > i else None
            home = depots.get(str(getattr(r, "depot_id", "") or ""), depots[ids[i % len(ids)]])
            fleet.append({"id": str(r.vehicle_id), "cap": int(cap) if cap == cap and cap else p["capacity"], "home": home})
        notes.append(f"使用车辆表中的 {len(fleet)} 辆车")
    else:
        for i in range(p["fleet_size"]):
            fleet.append({"id": f"V{i + 1:03d}", "cap": p["capacity"], "home": depots[ids[i % len(ids)]]})
    return fleet


class _Vehicle:
    def __init__(self, spec, t0):
        self.id, self.cap = spec["id"], spec["cap"]
        self.home = spec["home"]
        self.anchor = (spec["home"], t0)  # where and when the vehicle is free to re-plan
        self.load = 0  # passengers on board at the anchor
        self.done, self.plan = [], []


def solve(inputs, p, progress=lambda v, m="": None):
    notes = [
        f"行驶时间 = 直线距离 × {p['detour_factor']} ÷ {p['speed_kmh']} km/h，未使用路网",
        "车辆不改道：已到达或正驶向的停靠点不再重排",
    ]
    requests, day = _demand(inputs, p, notes)
    if not requests:
        raise ValueError("没有可用需求")
    fleet = [_Vehicle(s, requests[0]["t"]) for s in _fleet(inputs, p, requests, notes)]
    speed, detour = p["speed_kmh"], p["detour_factor"]
    dwell, max_wait = p["dwell_min"] * 60, p["max_wait_min"] * 60
    tt = lambda a, b: travel_s(a, b, speed, detour)
    info = {}  # request_id -> request with pickup/dropoff times

    def schedule(v, plan):
        """Arrival/departure times for a plan from the vehicle anchor, or None when infeasible."""
        (pos, t), load, out = v.anchor, v.load, []
        for s in plan:
            t += tt(pos, s["at"])
            q = info[s["req"]]
            if s["kind"] == "pickup":
                t = max(t, q["t"])
                if t > q["t"] + max_wait + 1e-6:
                    return None
                load += q["pax"]
                if load > v.cap:
                    return None
            else:
                load -= q["pax"]
                pick = q.get("pickup_dep")
                if pick is None:
                    pick = next(o["dep"] for o in out if o["req"] == s["req"] and o["kind"] == "pickup")
                if t - pick > q["limit"] + 1e-6:
                    return None
            dep = t + dwell
            out.append({**s, "arr": t, "dep": dep, "load": load})
            pos, t = s["at"], dep
        return out

    def commit(v, now):
        """Freeze every stop whose leg has started by `now`."""
        pos, t = v.anchor
        while v.plan:
            if t > now:
                break
            s = v.plan.pop(0)
            v.done.append(s)
            q = info[s["req"]]
            if s["kind"] == "pickup":
                q["pickup_dep"] = s["dep"]
                v.load += q["pax"]
            else:
                v.load -= q["pax"]
            pos, t = s["at"], s["dep"]
            v.anchor = (pos, t)
        if not v.plan and v.anchor[1] < now:
            v.anchor = (v.anchor[0], now)

    rejected = {}
    for n, q in enumerate(requests):
        if n % 200 == 0:
            progress(n / len(requests), f"已处理 {n}/{len(requests)} 笔需求")
        direct = tt(q["o"], q["d"])
        q.update(direct=direct, limit=max(direct * p["max_ride_factor"], direct + dwell))
        info[q["request_id"]] = q
        if q["pax"] > max(v.cap for v in fleet):
            rejected[q["request_id"]] = "人数超过车辆座位"
            continue
        for v in fleet:
            commit(v, q["t"])
        reachable = [v for v in fleet if v.anchor[1] + tt(v.anchor[0], q["o"]) <= q["t"] + max_wait]
        reachable.sort(key=lambda v: km(v.anchor[0], q["o"]))
        best = None
        pick = {"kind": "pickup", "req": q["request_id"], "at": q["o"]}
        drop = {"kind": "dropoff", "req": q["request_id"], "at": q["d"]}
        for v in reachable[:NEAREST_VEHICLES]:
            base = schedule(v, v.plan)
            end0 = base[-1]["dep"] if base else v.anchor[1]
            m = len(v.plan)
            for i in range(m + 1):
                for j in range(i, m + 1):
                    cand = v.plan[:i] + [pick] + v.plan[i:j] + [drop] + v.plan[j:]
                    sched = schedule(v, cand)
                    if sched is None:
                        continue
                    cost = sched[-1]["dep"] - end0
                    if best is None or cost < best[0]:
                        best = (cost, v, cand)
        if best is None:
            rejected[q["request_id"]] = "无车辆能在等待和乘车时间约束内服务" if reachable else "最长等待时间内没有车辆可到达"
            continue
        _, v, cand = best
        v.plan = schedule(v, cand)
    for v in fleet:
        commit(v, float("inf"))
    progress(1, "汇总结果")
    return _result(requests, fleet, info, rejected, notes, day, p)


def _result(requests, fleet, info, rejected, notes, day, p):
    served, rows = {}, []
    vehicles = []
    veh_km = 0.0
    for v in fleet:
        stops, pos = [], v.home
        for s in v.done:
            veh_km += km(pos, s["at"]) * p["detour_factor"]
            pos = s["at"]
            stops.append({
                "kind": s["kind"], "request_id": s["req"], "lon": round(s["at"][0], 6), "lat": round(s["at"][1], 6),
                "arrive": round(s["arr"], 1), "depart": round(s["dep"], 1), "load": s["load"],
            })
            served.setdefault(s["req"], {})[s["kind"]] = (v.id, s)
        vehicles.append({"vehicle_id": v.id, "capacity": v.cap, "start": [round(v.home[0], 6), round(v.home[1], 6)], "stops": stops})
    waits, rides, ratios, pax_km = [], [], [], 0.0
    for q in requests:
        r = {"request_id": q["request_id"], "request_time": round(q["t"], 1), "passengers": q["pax"],
             "o": [round(q["o"][0], 6), round(q["o"][1], 6)], "d": [round(q["d"][0], 6), round(q["d"][1], 6)],
             "direct_min": round(q["direct"] / 60, 2)}
        s = served.get(q["request_id"])
        if s and "pickup" in s and "dropoff" in s:
            (vid, pu), (_, do) = s["pickup"], s["dropoff"]
            wait, ride = pu["arr"] - q["t"], do["arr"] - pu["dep"]
            waits.append(wait)
            rides.append(ride)
            ratios.append(ride / q["direct"] if q["direct"] > 0 else 1)
            pax_km += km(q["o"], q["d"]) * p["detour_factor"] * q["pax"]
            r.update(served=True, vehicle_id=vid, pickup_time=round(pu["arr"], 1), dropoff_time=round(do["arr"], 1),
                     wait_min=round(wait / 60, 2), ride_min=round(ride / 60, 2))
        else:
            r.update(served=False, reason=rejected.get(q["request_id"], "未服务"))
        rows.append(r)
    n = len(requests)
    mean = lambda xs: round(sum(xs) / len(xs), 2) if xs else None
    summary = {
        "requests": n,
        "served": len(waits),
        "service_rate": round(len(waits) / n, 4) if n else 0,
        "vehicles": len(fleet),
        "vehicles_used": sum(1 for v in vehicles if v["stops"]),
        "avg_wait_min": mean([w / 60 for w in waits]),
        "avg_ride_min": mean([x / 60 for x in rides]),
        "avg_ride_ratio": mean(ratios),
        "vehicle_km": round(veh_km, 1),
        "passenger_km": round(pax_km, 1),
        "rejected_by_reason": _count(rejected.values()),
    }
    return {
        "kind": "drt", "day": day, "synthetic": p["demand_source"] == "synthetic",
        "summary": summary, "assumptions": notes, "requests": rows, "vehicles": vehicles,
        "time_range": [min(q["t"] for q in requests), max((s["depart"] for v in vehicles for s in v["stops"]), default=requests[-1]["t"])],
    }


def _count(values):
    out = {}
    for v in values:
        out[v] = out.get(v, 0) + 1
    return out


def validate(result, p):
    """Independent constraint check of any DRT result (built-in or user algorithm)."""
    errs = []
    for key in ("requests", "vehicles"):
        if not isinstance(result.get(key), list):
            return [f"结果缺少 {key} 列表"]
    reqs = {r.get("request_id"): r for r in result["requests"]}
    speed, detour = p.get("speed_kmh", 25), p.get("detour_factor", 1.3)
    dwell = p.get("dwell_min", 1) * 60
    seen = {}
    for v in result["vehicles"]:
        cap, load = v.get("capacity", 0), 0
        pos, t = tuple(v.get("start") or (0, 0)), None
        for k, s in enumerate(v.get("stops", [])):
            q = reqs.get(s.get("request_id"))
            where = f"车辆 {v.get('vehicle_id')} 第 {k + 1} 站"
            if q is None:
                errs.append(f"{where}：未知请求 {s.get('request_id')}")
                continue
            at = (s["lon"], s["lat"])
            if t is not None and s["arrive"] + 1 < t + travel_s(pos, at, speed, detour):
                errs.append(f"{where}：到达早于可行驶时间")
            if s["depart"] + 1e-6 < s["arrive"] + dwell - 1:
                errs.append(f"{where}：停靠时间不足")
            if s["kind"] == "pickup":
                if s["arrive"] + 1 < q["request_time"]:
                    errs.append(f"{where}：在请求之前上车")
                if s["arrive"] - q["request_time"] > p.get("max_wait_min", 15) * 60 + 1:
                    errs.append(f"{where}：等待超过上限")
                load += q.get("passengers", 1)
                seen.setdefault(q["request_id"], []).append(("pickup", v.get("vehicle_id"), s))
            elif s["kind"] == "dropoff":
                load -= q.get("passengers", 1)
                prior = [x for x in seen.get(q["request_id"], []) if x[0] == "pickup" and x[1] == v.get("vehicle_id")]
                if not prior:
                    errs.append(f"{where}：下车前没有上车")
                else:
                    direct = q.get("direct_min", 0) * 60
                    limit = max(direct * p.get("max_ride_factor", 1.8), direct + dwell)
                    if s["arrive"] - prior[-1][2]["depart"] > limit + 2:
                        errs.append(f"{where}：乘车时间超过上限")
                seen.setdefault(q["request_id"], []).append(("dropoff", v.get("vehicle_id"), s))
            else:
                errs.append(f"{where}：未知停靠类型")
            if load > cap:
                errs.append(f"{where}：载客超过座位")
            if load < 0:
                errs.append(f"{where}：载客为负")
            pos, t = at, s["depart"]
    for rid, r in reqs.items():
        marks = [m[0] for m in seen.get(rid, [])]
        if r.get("served") and marks != ["pickup", "dropoff"]:
            errs.append(f"请求 {rid}：标记为已服务但上下车记录不完整")
        if not r.get("served") and marks:
            errs.append(f"请求 {rid}：标记为未服务却出现在车辆计划中")
    return errs


def run(inputs, params, ctx):
    return solve(inputs, params, ctx.progress)


__all__ = ["META", "run", "validate", "solve", "synthetic_demand", "fmt"]
