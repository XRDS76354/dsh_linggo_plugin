"""LingGo algorithm template. Copy, rename and edit; then check it and register it in the workbench.

    python -m linggo_data.selfcheck my_algorithm.py            # fictional fixture data
    python -m linggo_data.selfcheck my_algorithm.py --version-dir <project data version>

Registration shows this file's source and SHA-256 for confirmation. The workbench validates the
interface and, for kinds drt / fleet / tripgen, every constraint of the result. Validation does not
make the code safe: it runs on this computer with your user permissions and no sandbox.
"""

META = {
    "id": "my_nearest_vehicle_drt",  # unique within the project
    "name": "示例：最近车辆 DRT",
    # drt | fleet | tripgen | custom. The kind decides which validator checks the result.
    "kind": "drt",
    "description": "每笔需求交给当前最早空闲的车辆，单独接送，不拼车。仅作接口示例。",
    # Standard entities read from the confirmed data version, as DataFrames of strings.
    "inputs": [
        {"entity": "demand", "required": True},
        {"entity": "vehicles", "required": False},
        {"entity": "depots", "required": False},
    ],
    # Shown as a form in the workbench; values are checked before the run.
    "params": {
        "fleet_size": {"type": "integer", "default": 5, "min": 1, "max": 200, "label": "车辆数（无车辆表时）"},
        "speed_kmh": {"type": "number", "default": 25, "min": 5, "max": 80, "label": "平均车速 km/h"},
        "detour_factor": {"type": "number", "default": 1.3, "min": 1, "max": 3, "label": "路网绕行系数"},
        "max_wait_min": {"type": "number", "default": 15, "min": 1, "max": 120, "label": "最长等待（分钟）"},
        "max_ride_factor": {"type": "number", "default": 1.8, "min": 1, "max": 5, "label": "最长乘车 / 直达时间"},
        "dwell_min": {"type": "number", "default": 1, "min": 0, "max": 10, "label": "每次上下客（分钟）"},
    },
}


def run(inputs, params, ctx):
    """Return a result dict. For kind 'drt' the validator expects the fields used below.

    ctx.progress(value 0..1, message) reports progress; ctx.km(a, b) and
    ctx.travel_s(a, b, speed_kmh, detour) are distance helpers on (lon, lat) pairs.
    """
    import pandas as pd

    demand = inputs["demand"].copy()
    demand["when"] = pd.to_datetime(demand["request_time"], errors="coerce")
    demand = demand.dropna(subset=["when"]).sort_values("when")
    day0 = demand["when"].min().normalize()

    depots = inputs.get("depots")
    home = (float(depots.iloc[0]["lon"]), float(depots.iloc[0]["lat"])) if depots is not None else (
        float(demand["o_lon"].astype(float).mean()), float(demand["o_lat"].astype(float).mean()))
    veh = inputs.get("vehicles")
    ids = list(veh["vehicle_id"]) if veh is not None else [f"V{i + 1}" for i in range(params["fleet_size"])]
    free = {v: (home, 0.0) for v in ids}  # vehicle -> (position, time it becomes free)
    plans = {v: [] for v in ids}

    speed, detour, dwell = params["speed_kmh"], params["detour_factor"], params["dwell_min"] * 60
    requests = []
    for n, r in enumerate(demand.itertuples(index=False)):
        ctx.progress(n / len(demand), "分配需求")
        t = (r.when - day0).total_seconds()
        o, d = (float(r.o_lon), float(r.o_lat)), (float(r.d_lon), float(r.d_lat))
        direct = ctx.travel_s(o, d, speed, detour)
        row = {"request_id": r.request_id, "request_time": t, "passengers": 1, "direct_min": direct / 60}
        vid = min(ids, key=lambda v: max(free[v][1], t) + ctx.travel_s(free[v][0], o, speed, detour))
        pos, ready = free[vid]
        pickup = max(ready, t) + ctx.travel_s(pos, o, speed, detour)
        if pickup - t > params["max_wait_min"] * 60:
            row.update(served=False, reason="等待超过上限")
            requests.append(row)
            continue
        dropoff = pickup + dwell + direct
        plans[vid] += [
            {"kind": "pickup", "request_id": r.request_id, "lon": o[0], "lat": o[1], "arrive": pickup, "depart": pickup + dwell, "load": 1},
            {"kind": "dropoff", "request_id": r.request_id, "lon": d[0], "lat": d[1], "arrive": dropoff, "depart": dropoff + dwell, "load": 0},
        ]
        free[vid] = (d, dropoff + dwell)
        row.update(served=True, vehicle_id=vid, pickup_time=pickup, dropoff_time=dropoff,
                   wait_min=(pickup - t) / 60, ride_min=(dropoff - pickup - dwell) / 60)
        requests.append(row)

    served = sum(1 for r in requests if r["served"])
    return {
        "kind": "drt",
        "summary": {"requests": len(requests), "served": served, "service_rate": served / len(requests) if requests else 0},
        "assumptions": ["示例算法：不拼车，最早空闲车辆服务"],
        "requests": requests,
        "vehicles": [{"vehicle_id": v, "capacity": 1, "start": list(home), "stops": plans[v]} for v in ids],
    }
