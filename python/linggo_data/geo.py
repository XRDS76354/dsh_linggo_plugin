"""Distance, travel-time and clock helpers shared by the scheduling algorithms."""
import math
import re

import pandas as pd


def km(a, b):
    """Great-circle distance in km between (lon, lat) pairs."""
    lon1, lat1, lon2, lat2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371.0088 * 2 * math.asin(min(1.0, math.sqrt(h)))


def travel_s(a, b, speed_kmh, detour=1.0):
    """Straight-line travel time in seconds, scaled by a road detour factor. No road network is used."""
    return km(a, b) * detour / speed_kmh * 3600


def clock(value):
    """'HH:MM[:SS]' (hours may exceed 24) -> seconds after midnight, or None."""
    if value is None:
        return None
    m = re.match(r"^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$", str(value))
    if not m:
        return None
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3) or 0)


def fmt(seconds):
    """Seconds after midnight -> 'HH:MM:SS' (service days may run past 24:00)."""
    if seconds is None or (isinstance(seconds, float) and math.isnan(seconds)):
        return ""
    s = int(round(seconds))
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"


def time_bin(value, default_minutes=60):
    """Parse a ridership time bin -> (start_seconds, length_seconds) or None.

    Accepts '7', '07', '7:00', '07:00-08:00', '07:00~07:30' and datetimes such as '2024-05-01 07:00:00'.
    """
    v = str(value or "").strip()
    if not v:
        return None
    m = re.match(r"^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*[-~至到]\s*(\d{1,2})(?::(\d{2}))?", v)
    if m:
        a = int(m.group(1)) * 3600 + int(m.group(2) or 0) * 60
        b = int(m.group(3)) * 3600 + int(m.group(4) or 0) * 60
        return (a, b - a) if b > a else None
    if re.match(r"^\d{1,2}$", v):
        return int(v) * 3600, default_minutes * 60
    c = clock(v)
    if c is not None:
        return c, default_minutes * 60
    t = pd.to_datetime(v, errors="coerce")
    if t is not pd.NaT and not pd.isna(t):
        return t.hour * 3600 + t.minute * 60, default_minutes * 60
    return None


def num(series, default=None):
    out = pd.to_numeric(series, errors="coerce")
    return out if default is None else out.fillna(default)


def core(lons, lats):
    """Flags for points near the network core (5-95% range plus a margin); misplaced points are False."""
    import pandas as pd

    if len(lons) < 50:
        return [True] * len(lons)
    px = pd.Series(lons).quantile([0.05, 0.95]).tolist()
    py = pd.Series(lats).quantile([0.05, 0.95]).tolist()
    pad_x, pad_y = max(px[1] - px[0], 0.05), max(py[1] - py[0], 0.05)
    return [px[0] - pad_x <= x <= px[1] + pad_x and py[0] - pad_y <= y <= py[1] + pad_y for x, y in zip(lons, lats)]
