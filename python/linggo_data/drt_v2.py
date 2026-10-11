"""Original DRT v2 A/B kernel, adapted to project-scoped canonical entities."""
import heapq
import json
import math
from collections import Counter

import pandas as pd

from . import drt_v2_core as core
from .geo import km

META = {
    "id": "drt_v2", "name": "DRT v2 · 有向路网调度", "kind": "drt",
    "description": "原始 A 动态插入 / B 冻结与批量窗口，使用导入的有向路网；约束独立校验，车辆各自回场。",
    "inputs": [{"entity": e, "required": True} for e in
               ("stops", "demand", "vehicles", "depots", "network_nodes", "network_edges")],
    "params": {
        "policy": {"type": "enum", "options": ["A", "B"], "default": "A", "label": "插单策略"},
        "fleet_size": {"type": "integer", "default": 3, "min": 1, "max": 500, "label": "启用车辆数（不超过车辆表）"},
        "max_wait_min": {"type": "number", "default": 5, "min": 0.1, "max": 120, "label": "最长等待（分钟）"},
        "max_ride_factor": {"type": "number", "default": 1.6, "min": 1, "max": 5, "label": "最长乘车 / 直达时间"},
        "max_ride_slack_min": {"type": "number", "default": 10, "min": 0, "max": 60, "label": "乘车时间额外余量（分钟）"},
        "dwell_s": {"type": "number", "default": 20, "min": 0, "max": 300, "label": "靠站时间（秒）"},
        "hold_s": {"type": "number", "default": 60, "min": 0, "max": 300, "label": "B 离场批量窗口（秒）"},
        "ride_weight": {"type": "number", "default": 0.3, "min": 0, "max": 10, "label": "乘车时间权重"},
        "drive_weight": {"type": "number", "default": 0.05, "min": 0, "max": 10, "label": "行驶时间权重"},
        "snap_radius_m": {"type": "number", "default": 400, "min": 1, "max": 5000, "label": "站点 / 路网吸附半径（米）"},
    },
}


def positive(value, label, allow_zero=False):
    n = float(value)
    if not math.isfinite(n) or (n < 0 if allow_zero else n <= 0):
        raise ValueError(f"{label} 必须为有限{'非负' if allow_zero else '正'}数")
    return n


class Network:
    def __init__(self, inputs):
        self.nodes = {}
        for r in inputs["network_nodes"].itertuples(index=False):
            pos = (float(r.lon), float(r.lat))
            if not all(math.isfinite(x) for x in pos) or not (-180 <= pos[0] <= 180 and -90 <= pos[1] <= 90):
                raise ValueError("路网节点坐标无效")
            if str(r.node_id) in self.nodes:
                raise ValueError("路网节点编号重复")
            self.nodes[str(r.node_id)] = pos
        if not self.nodes or len(self.nodes) > 5000 or len(inputs["network_edges"]) > 30000:
            raise ValueError("路网规模需为 1–5000 节点、最多 30000 边")
        self.edges, self.adj, self.cache = {}, {n: [] for n in self.nodes}, {}
        self.excluded, seen = 0, set()
        for r in inputs["network_edges"].itertuples(index=False):
            a, b, identity = str(r.from_node_id), str(r.to_node_id), str(r.edge_id)
            if a not in self.nodes or b not in self.nodes or identity in seen:
                raise ValueError("路网边引用无效或编号重复")
            seen.add(identity)
            if str(getattr(r, "highway", "")).lower().startswith("motorway"):
                self.excluded += 1
                continue
            seconds = positive(r.travel_time_s, "路网通行时间")
            meters = positive(r.length_m, "路网距离")
            raw = getattr(r, "geometry", "")
            geometry = json.loads(raw) if isinstance(raw, str) and raw else raw or [self.nodes[a], self.nodes[b]]
            if len(geometry) < 2 or any(len(p) != 2 or not all(math.isfinite(float(v)) for v in p) for p in geometry):
                raise ValueError("路网边几何无效")
            if km(geometry[0], self.nodes[a]) > .01 or km(geometry[-1], self.nodes[b]) > .01:
                raise ValueError("路网边几何端点与节点不一致")
            self.edges[identity] = {"a": a, "b": b, "s": seconds, "m": meters, "geometry": geometry}
            self.adj[a].append((b, seconds, identity))

    def nearest(self, point, radius):
        if not all(math.isfinite(v) for v in point) or not (-180 <= point[0] <= 180 and -90 <= point[1] <= 90):
            raise ValueError("吸附坐标无效")
        identity = min(self.nodes, key=lambda n: km(point, self.nodes[n]))
        if km(point, self.nodes[identity]) * 1000 > radius:
            raise ValueError("站点或车场超出路网吸附半径")
        return identity

    def routes(self, source):
        if source not in self.cache:
            dist, prev, queue = {source: 0.}, {}, [(0., source)]
            while queue:
                value, n = heapq.heappop(queue)
                if value != dist[n]:
                    continue
                for target, seconds, edge in self.adj[n]:
                    next_value = value + seconds
                    if next_value < dist.get(target, math.inf):
                        dist[target], prev[target] = next_value, (n, edge)
                        heapq.heappush(queue, (next_value, target))
            self.cache[source] = dist, prev
        return self.cache[source]

    def path(self, a, b):
        dist, prev = self.routes(a)
        if b not in dist:
            return [] if a == b else None
        edges = []
        while b != a:
            b, edge = prev[b]
            edges.append(edge)
        return edges[::-1]

    def duration(self, a, b):
        return self.routes(a)[0].get(b, math.inf)

    def distance(self, a, b):
        edges = self.path(a, b)
        return sum(self.edges[e]["m"] for e in edges) if edges is not None else math.inf

    def track(self, a, b, departure):
        edges = self.path(a, b)
        if edges is None:
            raise ValueError("车辆路径不可达")
        points = [{"t": departure, "p": list(self.nodes[a])}]
        for edge_id in edges:
            edge = self.edges[edge_id]
            shape = edge["geometry"]
            lengths = [km(x, y) for x, y in zip(shape, shape[1:])]
            total = sum(lengths)
            traversed = 0.
            for index, point in enumerate(shape[1:]):
                traversed += lengths[index]
                points.append({"t": departure + edge["s"] * (traversed / total if total else (index + 1) / (len(shape) - 1)), "p": list(point)})
            departure += edge["s"]
        return points


def run(inputs, params, ctx):
    core.configure(params)
    net = Network(inputs)
    stops = [(str(r.stop_id), (float(r.lon), float(r.lat))) for r in inputs["stops"].itertuples(index=False)]
    if not stops:
        raise ValueError("DRT v2 需要站点")
    stop_nodes = {s: net.nearest(point, params["snap_radius_m"]) for s, point in stops}
    depots = {str(r.depot_id): net.nearest((float(r.lon), float(r.lat)), params["snap_radius_m"]) for r in inputs["depots"].itertuples(index=False)}
    available = list(inputs["vehicles"].itertuples(index=False))
    if params["fleet_size"] > len(available):
        raise ValueError("启用车辆数超过车辆表的可用数量")
    available = available[:params["fleet_size"]]
    anchors = sorted(set(stop_nodes.values()) | set(depots.values()))
    index = {n: i for i, n in enumerate(anchors)}
    tt = [[net.duration(a, b) for b in anchors] for a in anchors]
    distance = [[net.distance(a, b) for b in anchors] for a in anchors]
    # Every working anchor must be able to reach a vehicle's home; avoid promising a stranded service.
    homes = {depots.get(str(v.depot_id)) for v in available}
    if None in homes:
        raise ValueError("车辆引用的车场不存在")
    if any(not math.isfinite(net.duration(a, h)) for a in anchors for h in homes):
        raise ValueError("有向路网不能保证车辆回场，请补齐通行边")
    demand = inputs["demand"].copy()
    demand["when"] = demand["request_time"].map(lambda value: pd.to_datetime(value, errors="coerce"))
    if demand["when"].isna().any() or demand.empty or len(demand) > 20000:
        raise ValueError("需求时间无效，或需求数量不在 1–20000 范围")
    if demand["when"].dt.normalize().nunique() != 1:
        raise ValueError("DRT v2 每次运行一个服务日")
    day0 = demand["when"].min().normalize()
    rows, orders, rejected = {}, [], {}
    for r in demand.sort_values("when").itertuples(index=False):
        identity = str(r.request_id)
        if identity in rows:
            raise ValueError("需求编号重复")
        o, d = (float(r.o_lon), float(r.o_lat)), (float(r.d_lon), float(r.d_lat))
        pax = int(positive(getattr(r, "passengers", 1) or 1, "乘客人数"))
        if float(getattr(r, "passengers", 1) or 1) != pax:
            raise ValueError("乘客人数必须为整数")
        origin = min(stops, key=lambda s: km(o, s[1]))
        dest = min(stops, key=lambda s: km(d, s[1]))
        a, b = stop_nodes[origin[0]], stop_nodes[dest[0]]
        when = (r.when - day0).total_seconds()
        rows[identity] = {"request_id": identity, "request_time": when, "passengers": pax,
                          "o": list(o), "d": list(d), "origin_node_id": a, "dest_node_id": b,
                          "direct_min": net.duration(a, b) / 60 if math.isfinite(net.duration(a, b)) else None}
        walk_m = (km(o, origin[1]) + km(d, dest[1])) * 1000
        if max(km(o, origin[1]), km(d, dest[1])) * 1000 > params["snap_radius_m"]:
            rejected[identity] = "起讫点超出站点吸附半径"
        elif a == b:
            rejected[identity] = "起讫点为同一节点，可步行到达"
        elif not math.isfinite(net.duration(a, b)):
            rejected[identity] = "起讫点路网不可达"
        elif pax > max(int(v.capacity) for v in available):
            rejected[identity] = "乘客人数超过车辆容量"
        else:
            orders.append(core.Order(identity, index[a], index[b], pax, when, "synthetic" if inputs.get("__synthetic__") else "data", None, tt[index[a]][index[b]], walk_m / 1.2))
    start = float(demand["when"].min().hour * 3600 + demand["when"].min().minute * 60)
    vehicles, caps = [], {}
    for r in available:
        cap = int(positive(r.capacity, "车辆容量"))
        if float(r.capacity) != cap:
            raise ValueError("车辆容量必须为整数")
        v = core.Vehicle(str(r.vehicle_id), index[depots[str(r.depot_id)]], start)
        v.home, v.log = v.row, []
        vehicles.append(v)
        caps[v.vid] = cap
    for k, order in enumerate(orders):
        ctx.progress(.05 + .8 * k / max(len(orders), 1), "DRT v2 插单")
        for vehicle in vehicles:
            core.advance(vehicle, order.req, tt, distance)
        best_v, best = None, None
        for vehicle in vehicles:
            insertion = core.try_insert(tt, vehicle, order, order.req, caps[vehicle.vid], params["max_wait_min"] * 60, params["policy"])
            if insertion and (best is None or insertion[0] < best[0]):
                best_v, best = vehicle, insertion
        if best is None:
            rejected[order.oid] = "无可行车辆：等待、容量或乘车约束不满足"
        else:
            core.commit_insert(tt, best_v, order, best, order.req, params["policy"])
    out_vehicles = []
    for vehicle in vehicles:
        core.advance(vehicle, 10 ** 12, tt, distance)
        if vehicle.row != vehicle.home:
            dep = vehicle.log[-1]["vdep"]
            vehicle.log.append({"from": vehicle.row, "to": vehicle.home, "dep": dep,
                                "arr": dep + tt[vehicle.row][vehicle.home], "vdep": dep + tt[vehicle.row][vehicle.home],
                                "load_leg": 0, "board": [], "alight": []})
        visits, track, legs = [], [], []
        for leg in vehicle.log:
            a, b = anchors[leg["from"]], anchors[leg["to"]]
            segment = net.track(a, b, leg["dep"])
            track += segment
            track.append({"t": leg["vdep"], "p": list(net.nodes[b])})
            legs.append({"from_node_id": a, "to_node_id": b, "depart": leg["dep"], "arrive": leg["arr"], "edges": net.path(a, b)})
            visits.append({"node_id": b, "lon": net.nodes[b][0], "lat": net.nodes[b][1],
                           "arrive": leg["arr"], "depart": leg["vdep"],
                           "pickups": [o for o, _ in leg["board"]], "dropoffs": [o for o, _ in leg["alight"]]})
        out_vehicles.append({"vehicle_id": vehicle.vid, "capacity": caps[vehicle.vid], "initial_load": 0, "depot_id": next(str(r.depot_id) for r in available if str(r.vehicle_id) == vehicle.vid),
                             "home_node_id": anchors[vehicle.home], "start": list(net.nodes[anchors[vehicle.home]]),
                             "stops": visits, "track": track, "network_legs": legs})
    for order in orders:
        row = rows[order.oid]
        if order.drop_t is not None:
            row.update(served=True, vehicle_id=order.veh, pickup_time=order.board_t, dropoff_time=order.drop_t,
                       wait_min=round((order.board_t - order.req) / 60, 2), ride_min=round((order.drop_t - order.board_t) / 60, 2))
        else:
            row.update(served=False, reason=rejected.get(order.oid, "未完成"))
    for identity, reason in rejected.items():
        rows[identity].update(served=False, reason=reason)
    requests = list(rows.values())
    served = [r for r in requests if r["served"]]
    shared = sum(any(x["request_id"] != r["request_id"] and x["vehicle_id"] == r["vehicle_id"] and
                     x["pickup_time"] < r["dropoff_time"] and x["dropoff_time"] > r["pickup_time"] for x in served) for r in served)
    mean = lambda values: round(sum(values) / len(values), 2) if values else None
    return {"kind": "drt", "depots": inputs["depots"].to_dict("records"), "engine": "linggo-drt-v2", "synthetic": bool(inputs.get("__synthetic__")),
            "summary": {"requests": len(requests), "served": len(served), "rejected": len(requests) - len(served),
                        "service_rate": round(len(served) / len(requests), 4), "avg_wait_min": mean([r["wait_min"] for r in served]),
                        "avg_ride_ratio": mean([r["ride_min"] / r["direct_min"] for r in served]),
                        "vehicles_used": sum(bool(v["stops"]) for v in out_vehicles), "shared_requests": shared,
                        "pooling_rate": shared / len(served) if served else 0},
            "assumptions": ["使用导入的有向路网；禁行 motorway/motorway_link", "乘车上限取比例与额外余量的较大值", "各车辆结束后返回所属车场"],
            "requests": requests, "vehicles": out_vehicles,
            "time_range": [start, max((p["t"] for v in out_vehicles for p in v["track"]), default=start)]}


def validate(result, params, inputs):
    """Recompute legal paths and constraints from input graph, not the engine's cost matrix."""
    net = Network(inputs)
    errors, entered = [], {}
    requests = {r["request_id"]: r for r in result.get("requests", [])}
    originals = {str(r.request_id): r for r in inputs["demand"].itertuples(index=False)}
    depots = {str(r.depot_id): net.nearest((float(r.lon), float(r.lat)), params["snap_radius_m"]) for r in inputs["depots"].itertuples(index=False)}
    originals_v = {str(v.vehicle_id): v for v in inputs["vehicles"].itertuples(index=False)}
    if set(requests) != set(originals) or len(requests) != len(result.get("requests", [])):
        errors.append("需求记录遗漏或重复")
    expected_vehicles = list(originals_v)[:params["fleet_size"]]
    actual_vehicles = [v["vehicle_id"] for v in result.get("vehicles", [])]
    if len(set(actual_vehicles)) != len(actual_vehicles) or set(actual_vehicles) != set(expected_vehicles):
        errors.append("启用车辆遗漏、重复或超出车辆表")
    day0 = inputs["demand"]["request_time"].map(pd.Timestamp).min().normalize()
    stops = [(str(r.stop_id), (float(r.lon), float(r.lat))) for r in inputs["stops"].itertuples(index=False)]
    for identity, request in requests.items():
        original = originals.get(identity)
        if original is None:
            continue
        o, d = (float(original.o_lon), float(original.o_lat)), (float(original.d_lon), float(original.d_lat))
        when = (pd.Timestamp(original.request_time) - day0).total_seconds()
        origin = net.nearest(min(stops, key=lambda s: km(o, s[1]))[1], params["snap_radius_m"])
        dest = net.nearest(min(stops, key=lambda s: km(d, s[1]))[1], params["snap_radius_m"])
        if request["passengers"] != int(float(original.passengers)) or request["o"] != list(o) or request["d"] != list(d) or abs(request["request_time"] - when) > 1e-6 or request["origin_node_id"] != origin or request["dest_node_id"] != dest:
            errors.append("需求人数、时刻或位置与输入不符")
        direct = net.duration(origin, dest)
        if math.isfinite(direct) and abs(request.get("direct_min", -1) - direct / 60) > 1e-6:
            errors.append("需求直达时间与输入路网不符")
        if request.get("served"):
            wait = round((request["pickup_time"] - when) / 60, 2)
            ride = round((request["dropoff_time"] - request["pickup_time"]) / 60, 2)
            if request.get("wait_min") != wait or request.get("ride_min") != ride:
                errors.append("等待或乘车指标与实际时刻不符")
    for vehicle in result.get("vehicles", []):
        vid = vehicle["vehicle_id"]
        original = originals_v.get(vid)
        if original is None or vehicle["capacity"] != int(original.capacity):
            errors.append("车辆身份或容量不符")
            continue
        home = depots[str(original.depot_id)]
        if vehicle.get("home_node_id") != home or vehicle.get("start") != list(net.nodes[home]):
            errors.append("车辆所属车场不符")
        position, ready, aboard, load = home, None, {}, 0
        legs = vehicle.get("network_legs", [])
        visits = vehicle.get("stops", [])
        if len(legs) != len(visits):
            errors.append("车辆行程与靠站记录不一致")
            continue
        expected_track = []
        for leg, visit in zip(legs, visits):
            a, b = leg["from_node_id"], leg["to_node_id"]
            edges = leg.get("edges", [])
            seconds, node = 0., a
            for edge_id in edges:
                edge = net.edges.get(edge_id)
                if not edge or edge["a"] != node:
                    errors.append("车辆使用禁行或不连续路网边")
                    break
                seconds += edge["s"]
                node = edge["b"]
            if node != b or position != a or (ready is not None and leg["depart"] < ready - 1e-6) or leg["arrive"] < leg["depart"] + seconds - 1e-6:
                errors.append("车辆路网行驶时间或顺序不符")
            if visit["node_id"] != b or abs(visit["arrive"] - leg["arrive"]) > 1e-6:
                errors.append("靠站位置或时刻不符")
            if b in net.nodes and a in net.nodes:
                expected_track.extend(net.track(a, b, leg["depart"]))
                expected_track.append({"t": visit["depart"], "p": list(net.nodes[b])})
            if visit["depart"] < visit["arrive"] + (params["dwell_s"] if visit["pickups"] or visit["dropoffs"] else 0) - 1e-6:
                errors.append("靠站时间不足")
            for identity in visit["dropoffs"]:
                request = requests.get(identity)
                board = aboard.pop(identity, None)
                if request is None or board is None or b != request["dest_node_id"]:
                    errors.append("下客顺序或位置无效")
                    continue
                load -= request["passengers"]
                direct = net.duration(request["origin_node_id"], b)
                limit = max(direct * params["max_ride_factor"], direct + params["max_ride_slack_min"] * 60)
                if visit["arrive"] - board > limit + 1e-6 or abs(request["dropoff_time"] - visit["arrive"]) > 1e-6:
                    errors.append("乘车时间超过上限或结果时刻不符")
                entered[identity] = entered.get(identity, 0) + 1
            for identity in visit["pickups"]:
                request = requests.get(identity)
                if request is None or identity in aboard or b != request["origin_node_id"]:
                    errors.append("上客位置或记录无效")
                    continue
                board = max(visit["arrive"], request["request_time"])
                if board > visit["depart"] + 1e-6 or board - request["request_time"] > params["max_wait_min"] * 60 + 1e-6:
                    errors.append("等待时间超过上限或提前上客")
                if not request.get("served") or request.get("vehicle_id") != vid or abs(request["pickup_time"] - board) > 1e-6:
                    errors.append("上客车辆或结果时刻不符")
                aboard[identity] = board
                load += request["passengers"]
            if not 0 <= load <= vehicle["capacity"]:
                errors.append("车辆容量约束不满足")
            position, ready = b, visit["depart"]
        if position != home or aboard or load:
            errors.append("车辆未完成服务或未回所属车场")
        if vehicle.get("track") != expected_track:
            errors.append("车辆轨迹与有向路网及停靠时刻不符")
    for identity, request in requests.items():
        original = originals.get(identity)
        if original and request["passengers"] != int(float(original.passengers)):
            errors.append("乘客人数被截断或修改")
        if request.get("served") and entered.get(identity) != 1:
            errors.append("已服务需求没有唯一完整上下客")
        if not request.get("served") and not request.get("reason"):
            errors.append("拒单没有原因")
    served = [r for r in requests.values() if r.get("served")]
    summary = result.get("summary", {})
    if summary.get("served") != len(served) or summary.get("requests") != len(originals) or summary.get("rejected") != len(originals) - len(served):
        errors.append("服务统计不一致")
    return errors
