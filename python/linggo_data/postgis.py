"""Read-only PostGIS extraction. Only named tables or views; no user SQL."""
import re

import pandas as pd

from .sources import CHUNK, FileTable, GEOM_COLUMNS, _geometry_record

NAME = re.compile(r"^[A-Za-z_][\w$]*(\.[A-Za-z_][\w$]*)?$")


def _connect(source):
    try:
        import psycopg
    except ImportError as e:
        raise ValueError("读取 PostGIS 需要 psycopg：在插件 Python 环境中安装 psycopg[binary]") from e
    dsn = source.get("dsn")
    if not isinstance(dsn, str) or not dsn.strip():
        raise ValueError("请提供 PostgreSQL 连接串")
    conn = psycopg.connect(dsn, connect_timeout=10)
    conn.read_only = True
    with conn.cursor() as cur:
        cur.execute("SET statement_timeout = '120s'")
    return conn


def _split(name):
    if not NAME.match(name or ""):
        raise ValueError("表名只能是 schema.table 或 table")
    return name.split(".") if "." in name else ["public", name]


def _geometry_column(cur, schema, table):
    cur.execute(
        "SELECT f_geometry_column, type, srid FROM geometry_columns WHERE f_table_schema=%s AND f_table_name=%s LIMIT 1",
        (schema, table),
    )
    return cur.fetchone()


def postgis_tables(source):
    conn = _connect(source)
    try:
        with conn.cursor() as cur:
            if source.get("table"):
                names = [_split(source["table"])]
            else:
                cur.execute(
                    "SELECT table_schema, table_name FROM information_schema.tables "
                    "WHERE table_schema NOT IN ('pg_catalog','information_schema','topology','tiger') "
                    "ORDER BY 1, 2 LIMIT 200"
                )
                names = [list(r) for r in cur.fetchall()]
            out = []
            for schema, table in names:
                cur.execute(
                    "SELECT column_name FROM information_schema.columns WHERE table_schema=%s AND table_name=%s ORDER BY ordinal_position",
                    (schema, table),
                )
                cols = [r[0] for r in cur.fetchall()]
                geom = _geometry_column(cur, schema, table)
                kind = None
                if geom:
                    cols = [c for c in cols if c != geom[0]]
                    t = (geom[1] or "").upper()
                    kind = "point" if "POINT" in t else "line" if "LINE" in t else "polygon" if "POLYGON" in t else None
                cur.execute(
                    "SELECT reltuples::bigint FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=%s AND c.relname=%s",
                    (schema, table),
                )
                est = cur.fetchone()
                full = f"{schema}.{table}"
                out.append(
                    FileTable(full, _loader(source, schema, table, geom, kind), cols + (GEOM_COLUMNS if geom else []), max(int(est[0]) if est else 0, 0), kind, "WGS84" if geom else None)
                )
            return out
    finally:
        conn.close()


def _loader(source, schema, table, geom, kind):
    def load(nrows=None):
        from psycopg import sql

        conn = _connect(source)
        try:
            select = sql.SQL("SELECT t.*{g} FROM {s}.{t} t{lim}").format(
                g=sql.SQL(", ST_AsGeoJSON(ST_Transform(t.{c}, 4326)) AS __geojson").format(c=sql.Identifier(geom[0])) if geom else sql.SQL(""),
                s=sql.Identifier(schema),
                t=sql.Identifier(table),
                lim=sql.SQL(" LIMIT {n}").format(n=sql.Literal(int(nrows))) if nrows is not None else sql.SQL(""),
            )
            with conn.cursor(name="linggo_read") as cur:
                cur.itersize = CHUNK
                cur.execute(select)
                cols = [d.name for d in cur.description]
                while True:
                    rows = cur.fetchmany(CHUNK)
                    if not rows:
                        break
                    yield pd.DataFrame([_row(cols, r, geom, kind) for r in rows])
        finally:
            conn.close()

    return load


def _row(cols, values, geom, kind):
    import json

    rec = {}
    for c, v in zip(cols, values):
        if c == "__geojson" or (geom and c == geom[0]):
            continue
        rec[c] = "" if v is None else str(v)
    if geom:
        gj = json.loads(values[cols.index("__geojson")] or "null") or {}
        c = gj.get("coordinates")
        t = gj.get("type")
        if t == "Point":
            rec.update(_geometry_record("point", [c]))
        elif t == "LineString":
            rec.update(_geometry_record("line", c))
        elif t == "MultiLineString" and c:
            rec.update(_geometry_record("line", max(c, key=len)))
        elif t == "Polygon" and c:
            rec.update(_geometry_record("line", c[0]))
        else:
            rec.update(_geometry_record("point", []))
    return rec
