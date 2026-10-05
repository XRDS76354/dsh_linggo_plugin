"""GTFS feed -> stops, routes, route_stops and trips."""
import json
import os

import pandas as pd


def _read(d, name, usecols=None):
    p = os.path.join(d, name + ".txt")
    if not os.path.exists(p):
        return None
    head = pd.read_csv(p, nrows=0, encoding="utf-8-sig").columns
    cols = [c for c in (usecols or head) if c in head]
    return pd.read_csv(p, usecols=cols, dtype=str, keep_default_na=False, encoding="utf-8-sig")


def convert(d, progress=lambda v, m: None):
    stops = _read(d, "stops")
    routes = _read(d, "routes")
    trips = _read(d, "trips")
    times = _read(d, "stop_times", ["trip_id", "departure_time", "arrival_time", "stop_id", "stop_sequence"])
    if stops is None or routes is None or trips is None or times is None:
        raise ValueError("GTFS 至少需要 stops、routes、trips、stop_times")
    progress(0.3, "GTFS 表已读取")
    if "location_type" in stops.columns:
        stops = stops[stops["location_type"].isin(["", "0"])]
    out_stops = pd.DataFrame(
        {
            "stop_id": stops["stop_id"].str.strip(),
            "stop_name": stops.get("stop_name", ""),
            "lon": pd.to_numeric(stops["stop_lon"], errors="coerce"),
            "lat": pd.to_numeric(stops["stop_lat"], errors="coerce"),
        }
    ).dropna(subset=["lon", "lat"])
    name = routes.get("route_short_name", pd.Series([""] * len(routes)))
    long = routes.get("route_long_name", pd.Series([""] * len(routes)))
    route_names = dict(zip(routes["route_id"], [a or b for a, b in zip(name, long)]))

    if "direction_id" not in trips.columns:
        trips["direction_id"] = "0"
    trips["direction_id"] = trips["direction_id"].replace("", "0")
    times["stop_sequence"] = pd.to_numeric(times["stop_sequence"], errors="coerce")
    times = times.dropna(subset=["stop_sequence"]).sort_values(["trip_id", "stop_sequence"])
    progress(0.5, "站序整理")
    counts = times.groupby("trip_id").size().rename("n")
    t = trips.join(counts, on="trip_id").dropna(subset=["n"])
    rep = t.sort_values("n", ascending=False).drop_duplicates(["route_id", "direction_id"])
    rows = []
    shapes = _read(d, "shapes")
    geometry = {}
    if shapes is not None and "shape_id" in rep.columns:
        shapes["seq"] = pd.to_numeric(shapes["shape_pt_sequence"], errors="coerce")
        shapes = shapes.sort_values(["shape_id", "seq"])
        wanted = set(rep["shape_id"])
        for sid, g in shapes[shapes["shape_id"].isin(wanted)].groupby("shape_id"):
            geometry[sid] = json.dumps(
                [[round(float(x), 7), round(float(y), 7)] for x, y in zip(g["shape_pt_lon"], g["shape_pt_lat"])],
                separators=(",", ":"),
            )
    by_trip = dict(tuple(times[times["trip_id"].isin(set(rep["trip_id"]))].groupby("trip_id")))
    out_routes = []
    for r in rep.itertuples(index=False):
        seq = by_trip.get(r.trip_id)
        if seq is None:
            continue
        for i, stop in enumerate(seq["stop_id"], start=1):
            rows.append((r.route_id, route_names.get(r.route_id, ""), r.direction_id, i, stop))
        out_routes.append(
            (r.route_id, route_names.get(r.route_id, ""), r.direction_id, geometry.get(getattr(r, "shape_id", None)))
        )
    out_rs = pd.DataFrame(rows, columns=["route_id", "route_name", "direction", "seq", "stop_id"])
    pos = out_stops.set_index("stop_id")
    out_rs["stop_name"] = out_rs["stop_id"].map(pos["stop_name"])
    out_rs["lon"] = out_rs["stop_id"].map(pos["lon"])
    out_rs["lat"] = out_rs["stop_id"].map(pos["lat"])
    out_routes = pd.DataFrame(out_routes, columns=["route_id", "route_name", "direction", "geometry"])
    progress(0.7, "班次整理")
    first = times.drop_duplicates("trip_id")
    first = first.assign(departure_time=first["departure_time"].where(first["departure_time"] != "", first["arrival_time"]))
    tr = trips.merge(first[["trip_id", "departure_time"]], on="trip_id")
    out_trips = pd.DataFrame(
        {
            "trip_id": tr["trip_id"],
            "route_id": tr["route_id"],
            "direction": tr["direction_id"],
            "departure_time": tr["departure_time"].str.strip(),
            "service_id": tr.get("service_id", ""),
        }
    )
    out_trips = out_trips[out_trips["departure_time"] != ""]
    return {"stops": out_stops, "routes": out_routes, "route_stops": out_rs, "trips": out_trips}
