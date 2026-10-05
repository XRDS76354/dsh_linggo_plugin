"""Declarative column mapping onto standard entities, with quality accounting.

A mapping only names columns, a whitelisted transform and the source CRS. No user or model code runs.
"""
import json
import re
from collections import Counter

import pandas as pd

from .crs import converter
from .schema import ENTITIES, SYNONYMS, TRANSFORMS

WKT = re.compile(r"POINT\s*Z?\s*\(\s*([-+\d.eE]+)[\s,]+([-+\d.eE]+)", re.I)
INT_FLOAT = re.compile(r"^(-?\d+)\.0+$")
COORD_PAIRS = [("lon", "lat"), ("o_lon", "o_lat"), ("d_lon", "d_lat")]


def _norm(name):
    return re.sub(r"[\s_\-（）()]", "", str(name)).lower()


def suggest(entity, columns, samples=None):
    """Best-effort field -> column suggestion for one entity."""
    fields = ENTITIES[entity]["fields"]
    normalized = {_norm(c): c for c in columns}
    out, used = {}, set()
    for field in fields:
        for syn in SYNONYMS.get(field, []) + [field]:
            col = normalized.get(_norm(syn))
            if col and col not in used:
                out[field] = {"column": col, "transform": ""}
                used.add(col)
                break
    # A WKT point column (for example "WGS84坐标") fills lon/lat when nothing else did.
    if samples is not None and ("lon" in fields and "lon" not in out):
        for i, col in enumerate(columns):
            values = [r[i] for r in samples if i < len(r)]
            if values and all(WKT.search(v or "") for v in values if v):
                out["lon"] = {"column": col, "transform": "wkt_lon"}
                out["lat"] = {"column": col, "transform": "wkt_lat"}
                break
    # Direction is never derived from sequence numbers automatically: real feeds mix several
    # encodings (offset hundreds, shared ranges, appended return rows). "seq_hundreds" is opt-in.
    return out


def guess_entity(columns, geometry=None, kind=None):
    if kind == "gtfs":
        return "gtfs"
    best, score = None, -1
    for name, spec in ENTITIES.items():
        s = suggest(name, columns, None)
        req = [f for f, (_, r) in spec["fields"].items() if r]
        hit = sum(1 for f in req if f in s or (f in ("lon", "lat") and geometry == "point"))
        if hit < len(req):
            continue
        total = hit * 10 + len(s)
        if total > score:
            best, score = name, total
    if best is None and geometry == "line":
        return "routes"
    return best


def crs_hint(columns, table_hint):
    if table_hint:
        return table_hint
    joined = " ".join(map(str, columns)).upper()
    for c in ("GCJ02", "BD09", "WGS84"):
        if c in joined:
            return c
    return "WGS84"


def _id(series):
    s = series.astype("string").str.strip()
    s = s.str.replace(INT_FLOAT, r"\1", regex=True)
    return s.mask(s.isin(["", "nan", "None", "NaN", "<NA>"]))


def _time(series):
    def one(v):
        if v is None:
            return None
        v = str(v).strip()
        if not v or v.lower() in ("nan", "none"):
            return None
        m = re.match(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?", v)
        if not m:
            m2 = re.search(r"\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b", v)  # datetime string
            m = m2
        if m:
            h, mi, sec = int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)
        elif re.match(r"^\d{3,4}$", v):
            h, mi, sec = int(v[:-2]), int(v[-2:]), 0
        else:
            try:
                f = float(v)
            except ValueError:
                return None
            if not 0 <= f < 2:  # Excel day fraction
                return None
            total = round(f * 86400)
            h, mi, sec = total // 3600, total % 3600 // 60, total % 60
        if mi > 59 or sec > 59 or h > 47:
            return None
        return f"{h:02d}:{mi:02d}:{sec:02d}"

    return series.map(one)


def _datetime(series):
    s = pd.to_datetime(series.astype("string").str.strip(), errors="coerce", format="mixed")
    return s.dt.strftime("%Y-%m-%d %H:%M:%S").where(s.notna(), None)


def _column(df, field, spec):
    col = spec.get("column")
    if col not in df.columns:
        raise ValueError(f"映射的列不存在：{col}")
    s = df[col]
    t = spec.get("transform") or ""
    if t not in TRANSFORMS:
        raise ValueError(f"不支持的转换：{t}")
    if t in ("wkt_lon", "wkt_lat"):
        g = s.astype("string").str.extract(WKT)
        s = g[0] if t == "wkt_lon" else g[1]
    elif t == "seq_hundreds":
        s = (pd.to_numeric(s, errors="coerce") // 100).astype("Int64").astype("string")
    return s


def _coords(value, conv):
    if value is None or value is pd.NA or value == "":
        return None
    try:
        pts = json.loads(value)
        out = []
        for x, y in pts:
            lx, ly = conv(float(x), float(y))
            out.append([round(lx, 7), round(ly, 7)])
        return json.dumps(out, separators=(",", ":"))
    except Exception:
        return None


class Mapper:
    """Apply one mapping chunk by chunk, accumulating a quality report."""

    def __init__(self, mapping):
        entity = mapping.get("entity")
        if entity not in ENTITIES:
            raise ValueError("请选择目标数据类型")
        self.entity = entity
        self.spec = ENTITIES[entity]
        self.fields = {k: v for k, v in (mapping.get("fields") or {}).items() if v and v.get("column")}
        for f in self.fields:
            if f not in self.spec["fields"]:
                raise ValueError(f"{entity} 没有字段 {f}")
        missing = [f for f, (_, req) in self.spec["fields"].items() if req and f not in self.fields]
        if missing:
            raise ValueError("缺少必填字段映射：" + "、".join(missing))
        self.defaults = mapping.get("defaults") or {}
        self.conv = converter(mapping.get("crs") or "WGS84")
        self.crs = mapping.get("crs") or "WGS84"
        self.seen = set()
        self.rows_in = 0
        self.rows_out = 0
        self.dropped = Counter()
        self.duplicates = 0

    def apply(self, df):
        self.rows_in += len(df)
        out = pd.DataFrame(index=df.index)
        for field, (typ, _) in self.spec["fields"].items():
            if field in self.fields:
                s = _column(df, field, self.fields[field])
            elif field in self.defaults:
                s = pd.Series([str(self.defaults[field])] * len(df), index=df.index, dtype="string")
            else:
                s = pd.Series([None] * len(df), index=df.index, dtype="object")
                if field == "direction":
                    s = pd.Series(["0"] * len(df), index=df.index, dtype="string")
            if typ == "id":
                s = _id(s)
            elif typ == "str":
                s = s.astype("string").str.strip()
            elif typ == "float":
                s = pd.to_numeric(s, errors="coerce")
            elif typ == "int":
                s = pd.to_numeric(s, errors="coerce").round().astype("Int64")
            elif typ == "time":
                s = _time(s)
            elif typ == "datetime":
                s = _datetime(s)
            elif typ == "coords":
                s = s.map(lambda v: _coords(v, self.conv))
            out[field] = s
        for a, b in COORD_PAIRS:
            if a in out.columns and out[a].notna().any():
                mask = out[a].notna() & out[b].notna()
                if mask.any():
                    pairs = [self.conv(x, y) for x, y in zip(out.loc[mask, a], out.loc[mask, b])]
                    out.loc[mask, a] = [round(p[0], 7) for p in pairs]
                    out.loc[mask, b] = [round(p[1], 7) for p in pairs]
                bad = mask & ~(out[a].between(-180, 180) & out[b].between(-90, 90))
                if bad.any():
                    self.dropped["坐标超出经纬度范围"] += int(bad.sum())
                    out = out[~bad]
        for field, (_, req) in self.spec["fields"].items():
            if req:
                miss = out[field].isna()
                if miss.any():
                    self.dropped[f"{field} 为空或无法解析"] += int(miss.sum())
                    out = out[~miss]
        key = self.spec["key"]
        if key and all(k in self.fields or k == "direction" for k in key):
            keep = []
            for row in out[key].itertuples(index=False):
                k = tuple(row)
                keep.append(k not in self.seen)
                self.seen.add(k)
            keep = pd.Series(keep, index=out.index)
            self.duplicates += int((~keep).sum())
            out = out[keep]
        self.rows_out += len(out)
        return out

    def report(self):
        return {
            "entity": self.entity,
            "crs": self.crs,
            "rowsIn": self.rows_in,
            "rowsOut": self.rows_out,
            "dropped": dict(self.dropped),
            "duplicates": self.duplicates,
        }
