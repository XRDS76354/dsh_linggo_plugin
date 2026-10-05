"""JSON-lines worker. Reads one request on stdin; writes progress events and one result line on stdout."""
import json
import sys
import traceback

PREVIEW_ROWS = 500


def emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False, default=str) + "\n")
    sys.stdout.flush()


def progress(value, message=""):
    emit({"event": "progress", "value": round(float(value), 3), "message": message})


def doctor(_req):
    import importlib.util
    import platform

    mods = {m: importlib.util.find_spec(m) is not None for m in ["pandas", "openpyxl", "shapefile", "pyproj", "psycopg"]}
    return {"python": sys.executable, "version": platform.python_version(), "modules": mods}


def inspect(req):
    from .mapping import crs_hint, guess_entity, suggest
    from .schema import ENTITIES, TRANSFORMS
    from .sources import open_tables, sample_rows

    kind, tables = open_tables(req["source"])
    out = []
    for t in tables[:50]:
        info = t.describe()
        df = next(t.loader(nrows=20))
        info["sample"] = sample_rows(df, 8)
        entity = guess_entity(t.columns, t.geometry, kind)
        info["entity"] = entity
        info["crs"] = "WGS84" if kind == "gtfs" else crs_hint(t.columns, t.crs_hint)
        info["suggestions"] = {e: suggest(e, t.columns, sample_rows(df, 20)) for e in ENTITIES}
        out.append(info)
    entities = {
        name: {"label": spec["label"], "fields": {f: {"type": typ, "required": req} for f, (typ, req) in spec["fields"].items()}}
        for name, spec in ENTITIES.items()
    }
    return {"kind": kind, "tables": out, "entities": entities, "transforms": TRANSFORMS}


def preview(req):
    from .mapping import Mapper
    from .sources import gtfs_dir, table

    mapping = req["mapping"]
    if mapping.get("entity") == "gtfs":
        from . import gtfs

        d = gtfs_dir(req["source"].get("path", ""))
        if not d:
            raise ValueError("不是有效的 GTFS 数据")
        frames = gtfs.convert(d)
        return {
            "report": [{"entity": k, "rowsIn": len(v), "rowsOut": len(v), "dropped": {}, "duplicates": 0} for k, v in frames.items()],
            "sample": {k: v.head(10).astype(str).to_dict("records") for k, v in frames.items()},
            "sampled": False,
        }
    _kind, t = table(req["source"], mapping.get("table"))
    m = Mapper(mapping)
    df = next(t.loader(nrows=PREVIEW_ROWS))
    out = m.apply(df)
    return {
        "report": [m.report()],
        "sample": {m.entity: out.head(20).astype(str).to_dict("records")},
        "sampled": t.rows > PREVIEW_ROWS,
        "rowsTotal": t.rows,
    }


def ingest(req):
    from .versions import build

    return build(req, progress)


def query(req):
    from .versions import query as q

    return q(req)


COMMANDS = {"doctor": doctor, "inspect": inspect, "preview": preview, "ingest": ingest, "query": query}


def main():
    try:
        req = json.loads(sys.stdin.read() or "{}")
        cmd = COMMANDS.get(req.get("cmd"))
        if not cmd:
            raise ValueError("Unknown command")
        emit({"event": "result", "ok": True, "value": cmd(req)})
    except Exception as e:  # reported to the Host as a structured failure
        emit({"event": "result", "ok": False, "error": str(e) or e.__class__.__name__, "trace": traceback.format_exc(limit=3)})
        sys.exit(1)


if __name__ == "__main__":
    main()
