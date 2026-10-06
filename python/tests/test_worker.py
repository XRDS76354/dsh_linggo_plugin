"""Worker tests on small generated fictional fixtures. Run: python -m unittest discover -s python/tests"""
import json
import os
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd  # noqa: E402

from linggo_data import crs, mapping, sources, versions  # noqa: E402
from linggo_data.__main__ import inspect, preview  # noqa: E402


def progress(*_):
    pass


class Fixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def path(self, name):
        return os.path.join(self.dir, name)


class CrsTest(unittest.TestCase):
    def test_gcj_round_trip(self):
        lon, lat = 121.5, 31.2
        g = crs.wgs84_to_gcj02(lon, lat)
        self.assertGreater(abs(g[0] - lon) + abs(g[1] - lat), 1e-4)
        back = crs.gcj02_to_wgs84(*g)
        self.assertAlmostEqual(back[0], lon, places=6)
        self.assertAlmostEqual(back[1], lat, places=6)

    def test_outside_china_unchanged(self):
        self.assertEqual(crs.wgs84_to_gcj02(2.35, 48.85), (2.35, 48.85))


class MappingTest(Fixture):
    def test_times(self):
        s = pd.Series(["6:30", "06:30:15", "0630", "0.25", "2025-02-09 07:05:00", "25:10", "bad", ""])
        self.assertEqual(
            [None if pd.isna(v) else v for v in mapping._time(s)],
            ["06:30:00", "06:30:15", "06:30:00", "06:00:00", "07:05:00", "25:10:00", None, None],
        )

    def test_gbk_csv_with_wkt_and_quality(self):
        df = pd.DataFrame(
            {
                "线路编号": ["1", "1", "1", "1", "2"],
                "站点编号": ["10.0", "11", "12", "12", "13"],
                "站点名称": ["甲", "乙", "丙", "丙", "丁"],
                "站点序号": ["1", "2", "3", "3", "1"],
                "坐标": ["POINT(121.1 31.1)", "POINT(121.2 31.2)", "POINT(121.3 31.3)", "POINT(121.3 31.3)", "POINT(500 31)"],
            }
        )
        p = self.path("route.csv")
        df.to_csv(p, index=False, encoding="gb18030")
        kind, tables = sources.open_tables({"type": "file", "path": p})
        self.assertEqual(kind, "table")
        info = inspect({"source": {"type": "file", "path": p}})["tables"][0]
        self.assertEqual(info["entity"], "route_stops")
        sug = info["suggestions"]["route_stops"]
        self.assertEqual(sug["lon"], {"column": "坐标", "transform": "wkt_lon"})
        m = {"entity": "route_stops", "fields": sug, "crs": "WGS84"}
        out = preview({"source": {"type": "file", "path": p}, "mapping": m})
        rep = out["report"][0]
        self.assertEqual(rep["rowsOut"], 3)
        self.assertEqual(rep["duplicates"], 1)
        self.assertEqual(rep["dropped"], {"坐标超出经纬度范围": 1})
        self.assertEqual(out["sample"]["route_stops"][0]["stop_id"], "10")

    def test_missing_required_mapping_rejected(self):
        with self.assertRaises(ValueError):
            mapping.Mapper({"entity": "stops", "fields": {"stop_id": {"column": "a"}}})

    def test_unknown_transform_rejected(self):
        m = mapping.Mapper({"entity": "stops", "fields": {"stop_id": {"column": "a"}, "lon": {"column": "b", "transform": "eval"}, "lat": {"column": "c"}}})
        with self.assertRaises(ValueError):
            m.apply(pd.DataFrame({"a": ["1"], "b": ["1"], "c": ["1"]}))

    def test_gcj_source_stored_as_wgs(self):
        m = mapping.Mapper({"entity": "stops", "crs": "GCJ02", "fields": {"stop_id": {"column": "id"}, "lon": {"column": "x"}, "lat": {"column": "y"}}})
        g = crs.wgs84_to_gcj02(121.5, 31.2)
        out = m.apply(pd.DataFrame({"id": ["a"], "x": [str(g[0])], "y": [str(g[1])]}))
        self.assertAlmostEqual(out["lon"].iloc[0], 121.5, places=5)


    def test_direction_not_guessed_from_sequence(self):
        sug = mapping.suggest("route_stops", ["线路编号", "站点编号", "站点序号"], [["1", "a", "101"], ["1", "b", "102"]])
        self.assertNotIn("direction", sug)

    def test_mixed_direction_warning(self):
        p = self.path("rs.csv")
        names = ["甲", "乙", "丙", "丁", "丁", "丙", "乙", "甲"]
        pd.DataFrame({"route_id": ["1"] * 8, "stop_id": [str(i) for i in range(8)], "stop_name": names, "seq": [str(i) for i in range(8)], "lon": ["121.1"] * 8, "lat": ["31.1"] * 8}).to_csv(p, index=False)
        fields = {f: {"column": f} for f in ["route_id", "stop_id", "stop_name", "seq", "lon", "lat"]}
        out = versions.build({"source": {"type": "file", "path": p}, "mapping": {"entity": "route_stops", "fields": fields}, "stagingDir": self.path("v")}, progress)
        self.assertTrue(any("混合了上下行" in w for w in out["report"]["warnings"]))


    def test_far_stop_warned_and_excluded_from_extent(self):
        p = self.path("stops.csv")
        rows = [(f"S{i}", 121 + (i % 10) * 0.01, 31 + (i // 10) * 0.01) for i in range(60)] + [("FAR", 118.5, 34.2)]
        pd.DataFrame(rows, columns=["stop_id", "lon", "lat"]).to_csv(p, index=False)
        fields = {f: {"column": f} for f in ["stop_id", "lon", "lat"]}
        out = versions.build({"source": {"type": "file", "path": p}, "mapping": {"entity": "stops", "fields": fields}, "stagingDir": self.path("v")}, progress)
        self.assertLess(out["bbox"][3], 32)
        self.assertTrue(any("FAR" in w for w in out["report"]["warnings"]))


class SourceTest(Fixture):
    def test_geojson_points(self):
        p = self.path("stops.geojson")
        doc = {
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature", "properties": {"stop_id": "s1", "name": "甲"}, "geometry": {"type": "Point", "coordinates": [121.0, 31.0]}},
                {"type": "Feature", "properties": {"stop_id": "s2", "name": "乙"}, "geometry": {"type": "Point", "coordinates": [121.1, 31.1]}},
            ],
        }
        json.dump(doc, open(p, "w"), ensure_ascii=False)
        info = inspect({"source": {"type": "file", "path": p}})["tables"][0]
        self.assertEqual(info["geometry"], "point")
        self.assertEqual(info["entity"], "stops")
        self.assertEqual(info["suggestions"]["stops"]["lon"]["column"], "__x")

    def test_zip_slip_rejected(self):
        p = self.path("evil.zip")
        with zipfile.ZipFile(p, "w") as z:
            z.writestr("../escape.shp", b"x")
        with self.assertRaises(ValueError):
            sources.open_tables({"type": "file", "path": p})

    def test_relative_path_rejected(self):
        with self.assertRaises(ValueError):
            sources.open_tables({"type": "file", "path": "data.csv"})


def write_gtfs(path):
    files = {
        "agency.txt": "agency_id,agency_name,agency_url,agency_timezone\nA,虚构公交,http://example.invalid,Asia/Shanghai\n",
        "stops.txt": "stop_id,stop_name,stop_lat,stop_lon\nS1,一号站,31.00,121.00\nS2,二号站,31.01,121.01\nS3,三号站,31.02,121.02\n",
        "routes.txt": "route_id,route_short_name,route_long_name,route_type\nR1,1路,,3\n",
        "trips.txt": "route_id,service_id,trip_id,direction_id\nR1,WK,T1,0\nR1,WK,T2,0\nR1,WK,T3,1\n",
        "stop_times.txt": "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n"
        "T1,06:00:00,06:00:00,S1,1\nT1,06:05:00,06:05:00,S2,2\nT1,06:10:00,06:10:00,S3,3\n"
        "T2,07:00:00,07:00:00,S1,1\nT2,07:05:00,07:05:00,S2,2\n"
        "T3,08:00:00,08:00:00,S3,1\nT3,08:10:00,08:10:00,S1,2\n",
    }
    with zipfile.ZipFile(path, "w") as z:
        for name, text in files.items():
            z.writestr(name, text)


class VersionTest(Fixture):
    def test_gtfs_version_and_map(self):
        p = self.path("feed.zip")
        write_gtfs(p)
        info = inspect({"source": {"type": "file", "path": p}})
        self.assertEqual(info["kind"], "gtfs")
        staging = self.path("v1")
        out = versions.build({"source": {"type": "file", "path": p}, "mapping": {"entity": "gtfs"}, "stagingDir": staging}, progress)
        self.assertEqual(out["entities"]["trips"]["rows"], 3)
        self.assertEqual(out["entities"]["route_stops"]["rows"], 5)
        self.assertEqual(out["missing"], ["ridership"])
        m = json.load(open(os.path.join(staging, "map.json")))
        line = next(r for r in m["routes"] if r["dir"] == "0")
        self.assertEqual(line["stops"], ["S1", "S2", "S3"])
        self.assertEqual(line["trips"], 2)
        q = versions.query({"versionDir": staging, "entity": "trips", "filter": {"route_id": "R1"}, "limit": 1})
        self.assertEqual(q["total"], 3)
        self.assertEqual(len(q["rows"]), 1)

    def test_postgis_source_never_stores_dsn(self):
        rec = versions._source_record({"type": "postgis", "dsn": "postgresql://u:secret@h/db", "table": "public.stops"}, {"entity": "stops"}, "public.stops")
        self.assertNotIn("secret", json.dumps(rec))

    def test_new_version_keeps_base_entities(self):
        p = self.path("feed.zip")
        write_gtfs(p)
        v1 = self.path("v1")
        versions.build({"source": {"type": "file", "path": p}, "mapping": {"entity": "gtfs"}, "stagingDir": v1}, progress)
        csv = self.path("ride.csv")
        pd.DataFrame({"线路编号": ["R1"], "时段": ["07"], "上车人数": ["12"]}).to_csv(csv, index=False)
        v2 = self.path("v2")
        out = versions.build(
            {
                "source": {"type": "file", "path": csv},
                "mapping": {"entity": "ridership", "fields": {"route_id": {"column": "线路编号"}, "time_bin": {"column": "时段"}, "boardings": {"column": "上车人数"}}},
                "baseDir": v1,
                "stagingDir": v2,
            },
            progress,
        )
        self.assertEqual(out["missing"], [])
        self.assertEqual(out["entities"]["stops"]["rows"], 3)
        self.assertEqual(len(json.load(open(os.path.join(v2, "manifest.json")))["sources"]), 2)


if __name__ == "__main__":
    unittest.main()


class GeometryExtentTest(Fixture):
    def test_route_geometry_without_stations(self):
        pd.DataFrame([{"route_id":"R", "route_name":"Fixture", "direction":"original", "geometry":"[[120.1,30.1],[120.2,30.2]]"}]).to_csv(self.path("routes.csv"),index=False)
        result=versions.map_data(self.dir)
        self.assertEqual(result["bbox"],[120.1,30.1,120.2,30.2])
        self.assertEqual(result["stops"],[])
