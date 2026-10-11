"""Generate only fictional data and actual reproducible algorithm results. No source-data reads."""
import argparse
import hashlib
import json
import random
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
from linggo_data import algo, drt_v2, fleet, tripgen, versions, jsonio
from linggo_data.geo import km
from linggo_data.schema import ENTITIES

SEED = 42
STAMP = "2030-01-01T00:00:00Z"


def fixture():
    pos = {"A": (0, 0), "B": (.008, 0), "C": (.016, 0), "D": (.024, 0), "E": (.032, 0),
           "F": (.008, -.008), "G": (.016, .008), "H": (.024, .008)}
    tables = {"stops": [{"stop_id": "DEMO-" + n, "stop_name": "示例站 " + n, "lon": x, "lat": y} for n, (x, y) in pos.items()]}
    routes, rs, trips, rid = [], [], [], []
    shapes = {}
    bins = ["07:00-07:15", "07:15-07:30"]
    for route_id, order in [("DEMO-L1", "ABCDE"), ("DEMO-L2", "FBCGH")]:
        for direction, stops in [("0", order), ("1", order[::-1])]:
            shapes[(route_id, direction)] = stops
            routes.append({"route_id": route_id, "route_name": "示例 " + route_id[-2:], "direction": direction, "geometry": [list(pos[n]) for n in stops]})
            for seq, n in enumerate(stops, 1):
                rs.append({"route_id": route_id, "route_name": "示例 " + route_id[-2:], "direction": direction, "seq": seq,
                           "stop_id": "DEMO-" + n, "stop_name": "示例站 " + n, "lon": pos[n][0], "lat": pos[n][1]})
                for time_bin in bins:
                    rid.append({"route_id": route_id, "direction": direction, "stop_id": "DEMO-" + n, "time_bin": time_bin, "boardings": 0, "alightings": 0})
            for index, minute in enumerate([0, 15]):
                trips.append({"trip_id": f"{route_id}-{direction}-{index}", "route_id": route_id, "direction": direction,
                              "departure_time": f"07:{minute:02d}:00", "arrival_time": f"07:{minute + 12:02d}:00", "service_id": "DEMO-DAY"})
    od, demand = [], []
    rng = random.Random(SEED)
    pairs = [("A", "E"), ("B", "D"), ("C", "E"), ("E", "A"), ("F", "H"), ("H", "F")]
    for bin_index, counts in enumerate([[3, 2, 2, 1, 1, 3], [1, 1, 2, 3, 3, 2]]):
        for i, ((origin, dest), count) in enumerate(zip(pairs, counts)):
            od.append({"origin_stop_id": "DEMO-" + origin, "dest_stop_id": "DEMO-" + dest, "time_bin": bins[bin_index], "count": count})
            route_key = next(k for k, shape in shapes.items() if origin in shape and dest in shape and shape.index(origin) < shape.index(dest))
            for row in rid:
                if (row["route_id"], row["direction"]) == route_key and row["time_bin"] == bins[bin_index]:
                    if row["stop_id"] == "DEMO-" + origin:
                        row["boardings"] += count
                    if row["stop_id"] == "DEMO-" + dest:
                        row["alightings"] += count
            for _ in range(count):
                when = datetime(2030, 1, 1, 7) + timedelta(seconds=bin_index * 900 + i * 105 + rng.randint(0, 20))
                demand.append({"request_id": f"DEMO-Q{len(demand) + 1:02}", "request_time": when.isoformat(),
                               "o_lon": pos[origin][0], "o_lat": pos[origin][1], "d_lon": pos[dest][0], "d_lat": pos[dest][1], "passengers": 1})
    depots = [{"depot_id": "DEMO-D1", "depot_name": "示例车场 1", "lon": -.004, "lat": 0},
              {"depot_id": "DEMO-D2", "depot_name": "示例车场 2", "lon": .036, "lat": .008}]
    nodes = [{"node_id": "DEMO-N" + n, "lon": x, "lat": y} for n, (x, y) in pos.items()]
    nodes += [{"node_id": "DEMO-ND1", "lon": -.004, "lat": 0}, {"node_id": "DEMO-ND2", "lon": .036, "lat": .008}]
    node_pos = {n["node_id"]: [n["lon"], n["lat"]] for n in nodes}
    edges = []
    for a, b in [("A", "B"), ("B", "C"), ("C", "D"), ("D", "E"), ("F", "B"), ("C", "G"), ("G", "H"),
                 ("D1", "A"), ("D1", "F"), ("D2", "E"), ("D2", "H"), ("D", "G")]:
        for origin, dest in [(a, b), (b, a)]:
            origin, dest = "DEMO-N" + origin, "DEMO-N" + dest
            meters = km(node_pos[origin], node_pos[dest]) * 1000
            edges.append({"edge_id": f"DEMO-E{len(edges) + 1:02}", "from_node_id": origin, "to_node_id": dest,
                          "length_m": round(meters, 3), "travel_time_s": round(meters / (25 / 3.6), 3),
                          "highway": "residential", "geometry": [node_pos[origin], node_pos[dest]]})
    tables.update(routes=routes, route_stops=rs, trips=trips, ridership=rid, od=od, demand=demand,
                  depots=depots, vehicles=[{"vehicle_id": f"DEMO-V{i+1}", "capacity": 8, "depot_id": "DEMO-D1" if i < 2 else "DEMO-D2"} for i in range(3)],
                  network_nodes=nodes, network_edges=edges)
    return tables


def canonical_tables(tables):
    return {name: [{field: json.dumps(row.get(field), separators=(",", ":")) if kind == "coords" and row.get(field) is not None
                         else str(row[field]) if field in row else ""
                   for field, (kind, required) in ENTITIES[name]["fields"].items()} for row in rows]
            for name, rows in tables.items()}
