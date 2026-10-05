"""Coordinate conversion to the canonical WGS84 used by every stored data version."""
import math

_A = 6378245.0
_EE = 0.00669342162296594323


def _out_of_china(lon, lat):
    return not (72.004 <= lon <= 137.8347 and 0.8293 <= lat <= 55.8271)


def _tlat(x, y):
    r = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * math.sqrt(abs(x))
    r += (20.0 * math.sin(6.0 * x * math.pi) + 20.0 * math.sin(2.0 * x * math.pi)) * 2.0 / 3.0
    r += (20.0 * math.sin(y * math.pi) + 40.0 * math.sin(y / 3.0 * math.pi)) * 2.0 / 3.0
    r += (160.0 * math.sin(y / 12.0 * math.pi) + 320 * math.sin(y * math.pi / 30.0)) * 2.0 / 3.0
    return r


def _tlon(x, y):
    r = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * math.sqrt(abs(x))
    r += (20.0 * math.sin(6.0 * x * math.pi) + 20.0 * math.sin(2.0 * x * math.pi)) * 2.0 / 3.0
    r += (20.0 * math.sin(x * math.pi) + 40.0 * math.sin(x / 3.0 * math.pi)) * 2.0 / 3.0
    r += (150.0 * math.sin(x / 12.0 * math.pi) + 300.0 * math.sin(x / 30.0 * math.pi)) * 2.0 / 3.0
    return r


def wgs84_to_gcj02(lon, lat):
    if _out_of_china(lon, lat):
        return lon, lat
    dlat = _tlat(lon - 105.0, lat - 35.0)
    dlon = _tlon(lon - 105.0, lat - 35.0)
    rad = lat / 180.0 * math.pi
    magic = 1 - _EE * math.sin(rad) ** 2
    sq = math.sqrt(magic)
    dlat = (dlat * 180.0) / ((_A * (1 - _EE)) / (magic * sq) * math.pi)
    dlon = (dlon * 180.0) / (_A / sq * math.cos(rad) * math.pi)
    return lon + dlon, lat + dlat


def gcj02_to_wgs84(lon, lat):
    """Iterative inverse; sub-centimetre after a few rounds."""
    if _out_of_china(lon, lat):
        return lon, lat
    wl, wa = lon, lat
    for _ in range(6):
        gl, ga = wgs84_to_gcj02(wl, wa)
        wl, wa = wl - (gl - lon), wa - (ga - lat)
    return wl, wa


def bd09_to_gcj02(lon, lat):
    x, y = lon - 0.0065, lat - 0.006
    z = math.sqrt(x * x + y * y) - 0.00002 * math.sin(y * math.pi * 3000.0 / 180.0)
    t = math.atan2(y, x) - 0.000003 * math.cos(x * math.pi * 3000.0 / 180.0)
    return z * math.cos(t), z * math.sin(t)


def converter(crs):
    """Return f(lon, lat) -> (lon, lat) in WGS84 for a declared source CRS."""
    crs = (crs or "WGS84").upper()
    if crs == "WGS84" or crs == "EPSG:4326":
        return lambda x, y: (x, y)
    if crs == "GCJ02":
        return gcj02_to_wgs84
    if crs == "BD09":
        return lambda x, y: gcj02_to_wgs84(*bd09_to_gcj02(x, y))
    if crs.startswith("EPSG:"):
        from pyproj import Transformer

        t = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
        return lambda x, y: t.transform(x, y)
    raise ValueError(f"Unsupported CRS {crs}")
