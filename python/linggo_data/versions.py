"""Assemble immutable data versions in a staging directory; the Host publishes by rename."""
import json
import os
import shutil
from datetime import datetime, timezone

import pandas as pd

from . import gtfs
from .mapping import Mapper
from .schema import ENTITIES, NEEDS
from .geo import core
from .sources import gtfs_dir, table

MAP_ROUTE_LIMIT = 5000


def _read_manifest(d):
    if not d:
        return {"entities": {}, "sources": []}
    with open(os.path.join(d, "manifest.json"), encoding="utf-8") as f:
        return json.load(f)


def _csv(d, entity):
    return pd.read_csv(os.path.join(d, entity + ".csv"), dtype=str, keep_default_na=False)


def _link(src, dst):
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def _key(entity):
    return ENTITIES[entity]["key"]


def _union(new, old, key):
    """Rows of new, plus rows of old whose key is not in new."""
    if not key:
        return pd.concat([old, new], ignore_index=True)
    have = set(map(tuple, new[key].astype(str).itertuples(index=False)))
    keep = [tuple(r) not in have for r in old[key].astype(str).itertuples(index=False)]
    return pd.concat([old[keep], new], ignore_index=True)


def _derive_from_route_stops(rs):
    out = {}
    if "lon" in rs and (rs["lon"] != "").any():
        s = rs[(rs["lon"] != "") & (rs["lat"] != "")]
        out["stops"] = s.drop_duplicates("stop_id")[["stop_id", "stop_name", "lon", "lat"]]
    r = rs.drop_duplicates(["route_id", "direction"])[["route_id", "route_name", "direction"]].copy()
    r["geometry"] = ""
    out["routes"] = r
    return out


def _source_record(source, mapping, table_name):
    rec = {"type": source.get("type", "file"), "entity": mapping.get("entity"), "table": table_name}
    if source.get("type") == "postgis":
        rec["table"] = source.get("table") or table_name  # the connection string is never stored
    else:
        rec["path"] = source.get("path")
    rec["crs"] = mapping.get("crs") or "WGS84"
    rec["fields"] = mapping.get("fields") or {}
    rec["importedAt"] = datetime.now(timezone.utc).isoformat()
    return rec


def build(req, progress):
    source, mapping = req["source"], req["mapping"]
    base, staging = req.get("baseDir"), req["stagingDir"]
    os.makedirs(staging)
    manifest = _read_manifest(base)
    produced, derived, reports = {}, {}, []
    entity = mapping.get("entity")
    if entity == "gtfs":
        d = gtfs_dir(source.get("path", ""))
        if not d:
            raise ValueError("不是有效的 GTFS 数据")
        for name, df in gtfs.convert(d, progress).items():
            produced[name] = df
            reports.append({"entity": name, "rowsIn": len(df), "rowsOut": len(df), "dropped": {}, "duplicates": 0, "crs": "WGS84"})
        table_name = "gtfs"
    else:
        kind, t = table(source, mapping.get("table"))
        table_name = t.name
        mapper = Mapper(mapping)
        path = os.path.join(staging, entity + ".csv")
        first, done = True, 0
        for chunk in t.loader():
            out = mapper.apply(chunk)
            out.to_csv(path, mode="a", header=first, index=False)
            first = False
            done += len(chunk)
            progress(min(0.9 * done / max(t.rows, 1), 0.9), f"已处理 {done} 行")
        if first:
            pd.DataFrame(columns=list(ENTITIES[entity]["fields"])).to_csv(path, index=False)
        reports.append(mapper.report())
        if (mapping.get("mode") or "replace") == "append" and entity in manifest["entities"]:
            merged = pd.concat([_csv(base, entity), _csv(staging, entity)], ignore_index=True)
            merged.to_csv(path, index=False)
        if entity == "route_stops":
            derived = _derive_from_route_stops(_csv(staging, entity))
    for name, df in produced.items():
        df.to_csv(os.path.join(staging, name + ".csv"), index=False)
    for name, df in derived.items():
        if name in manifest["entities"]:
            # Derived rows only fill gaps; records the user imported directly win.
            df = _union(_csv(base, name), df.astype(str), _key(name))
        df.to_csv(os.path.join(staging, name + ".csv"), index=False)
    fresh = set(produced) | set(derived) | ({entity} if entity != "gtfs" else set())
    for name in manifest["entities"]:
        if name not in fresh:
            _link(os.path.join(base, name + ".csv"), os.path.join(staging, name + ".csv"))
    progress(0.93, "检查关联")
    warnings = _references(staging)
    entities = {}
    for name in ENTITIES:
        p = os.path.join(staging, name + ".csv")
        if os.path.exists(p):
            df = pd.read_csv(p, dtype=str, keep_default_na=False, usecols=lambda c: True)
            entities[name] = {"rows": len(df), "columns": list(df.columns)}
    result = {
        "schema": 1,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "crs": "WGS84",
        "entities": entities,
        "sources": manifest.get("sources", []) + [_source_record(source, mapping, table_name)],
        "report": {"imports": reports, "warnings": warnings},
    }
    progress(0.96, "生成地图数据")
    m = map_data(staging)
    result["bbox"] = m["bbox"]
    if m["outliers"]:
        warnings.append(f"{len(m['outliers'])} 个站点远离主要范围（如 {', '.join(m['outliers'][:3])}），可能是坐标错误、坐标系选错或混入异地数据")
    with open(os.path.join(staging, "map.json"), "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(staging, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    return {"entities": entities, "bbox": m["bbox"], "report": result["report"], "missing": missing(entities)}


def missing(entities):
    return [need for need, names in NEEDS.items() if not any(entities.get(n, {}).get("rows") for n in names)]


def _references(d):
    def ids(name, col):
        p = os.path.join(d, name + ".csv")
        if not os.path.exists(p):
            return None
        return set(pd.read_csv(p, dtype=str, keep_default_na=False, usecols=[col])[col])

    warnings = []
    stops = ids("stops", "stop_id")
    routes = ids("routes", "route_id")
    checks = [("route_stops", "stop_id", stops, "站点"), ("trips", "route_id", routes, "线路"), ("ridership", "route_id", routes, "线路"), ("od", "origin_stop_id", stops, "站点"), ("od", "dest_stop_id", stops, "站点")]
    for name, col, known, label in checks:
        if known is None:
            continue
        values = ids(name, col)
        if values is None:
            continue
        unknown = len([v for v in values if v and v not in known])
        if unknown:
            warnings.append(f"{ENTITIES[name]['label']}中有 {unknown} 个 {col} 不在{label}数据中")
    p = os.path.join(d, "route_stops.csv")
    if os.path.exists(p):
        rs = pd.read_csv(p, dtype=str, keep_default_na=False, usecols=lambda c: c in ("route_id", "direction", "stop_name"))
        if "stop_name" in rs:
            g = rs[rs["stop_name"] != ""].groupby("route_id")
            mixed = int(((g["direction"].nunique() == 1) & (g["stop_name"].nunique() < g.size() * 0.8)).sum())
            if mixed:
                warnings.append(f"{mixed} 条线路只有一个方向但大量站名重复出现，可能混合了上下行；请在映射中指定方向，或用算法拆分方向")
    return warnings


def map_data(d):
    def load(name):
        p = os.path.join(d, name + ".csv")
        return pd.read_csv(p, dtype=str, keep_default_na=False) if os.path.exists(p) else None

    stops = load("stops")
    rs = load("route_stops")
    routes = load("routes")
    depots = load("depots")
    trips = load("trips")
    points = {}
    if stops is not None:
        for r in stops.itertuples(index=False):
            try:
                points[r.stop_id] = [r.stop_id, r.stop_name, float(r.lon), float(r.lat)]
            except ValueError:
                pass
    if rs is not None and "lon" in rs:
        for r in rs.itertuples(index=False):
            if r.stop_id not in points and r.lon and r.lat:
                points[r.stop_id] = [r.stop_id, r.stop_name, float(r.lon), float(r.lat)]
    trip_count = trips.groupby(["route_id", "direction"]).size().to_dict() if trips is not None else {}
    lines = {}
    if routes is not None:
        for r in routes.itertuples(index=False):
            lines[(r.route_id, r.direction)] = {"id": r.route_id, "name": r.route_name, "dir": r.direction, "stops": [], "geometry": json.loads(r.geometry) if r.geometry else None}
    if rs is not None:
        rs = rs.assign(_seq=pd.to_numeric(rs["seq"], errors="coerce")).sort_values(["route_id", "direction", "_seq"])
        for (rid, direction), g in rs.groupby(["route_id", "direction"], sort=False):
            line = lines.setdefault((rid, direction), {"id": rid, "name": g["route_name"].iloc[0] if "route_name" in g else "", "dir": direction, "stops": [], "geometry": None})
            line["stops"] = [s for s in g["stop_id"] if s in points]
    out_lines = []
    for (rid, direction), line in list(lines.items())[:MAP_ROUTE_LIMIT]:
        line["trips"] = int(trip_count.get((rid, direction), 0))
        out_lines.append(line)
    xs = [p[2] for p in points.values()] + [c[0] for l in out_lines if l["geometry"] for c in l["geometry"]]
    ys = [p[3] for p in points.values()] + [c[1] for l in out_lines if l["geometry"] for c in l["geometry"]]
    dep = []
    if depots is not None:
        for r in depots.itertuples(index=False):
            try:
                dep.append([r.depot_id, r.depot_name, float(r.lon), float(r.lat)])
                xs.append(float(r.lon))
                ys.append(float(r.lat))
            except ValueError:
                pass
    bbox, outliers = _extent(list(points.values()), xs, ys)
    return {"bbox": bbox, "stops": list(points.values()), "routes": out_lines, "depots": dep, "truncated": len(lines) > MAP_ROUTE_LIMIT, "outliers": outliers}


def _extent(points, xs, ys):
    """Fit the stops near the network core, so a few misplaced stops do not shrink it to a corner."""
    if not xs:
        return None, []
    flags = core([p[2] for p in points], [p[3] for p in points])
    inner = [p for p, ok in zip(points, flags) if ok]
    outliers = [p[0] for p, ok in zip(points, flags) if not ok]
    if not inner:
        return [min(xs), min(ys), max(xs), max(ys)], outliers
    return [min(p[2] for p in inner), min(p[3] for p in inner), max(p[2] for p in inner), max(p[3] for p in inner)], outliers


def query(req):
    d, entity = req["versionDir"], req.get("entity")
    if entity not in ENTITIES:
        raise ValueError("Unknown entity")
    p = os.path.join(d, entity + ".csv")
    if not os.path.exists(p):
        return {"entity": entity, "rows": [], "total": 0, "available": False}
    df = pd.read_csv(p, dtype=str, keep_default_na=False)
    for col, value in (req.get("filter") or {}).items():
        if col in df.columns and value not in (None, ""):
            df = df[df[col] == str(value)]
    limit = max(1, min(int(req.get("limit") or 50), 200))
    return {"entity": entity, "total": len(df), "rows": df.head(limit).to_dict("records"), "available": True}
