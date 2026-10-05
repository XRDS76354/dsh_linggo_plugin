"""Check a user algorithm before registering it: python -m linggo_data.selfcheck my_algo.py [--version-dir DIR]

Without --version-dir the algorithm runs on a small generated fictional city. The same interface
check and result validators as the workbench are applied.
"""
import argparse
import json
import os
import sys
import tempfile

import pandas as pd

from . import algo


def fixture(root):
    """A fictional two-direction line with timetable, ridership, requests and vehicles."""
    stops = [{"stop_id": f"S{i}", "stop_name": f"虚构站{i}", "lon": f"{121.0 + i * 0.01:.4f}", "lat": "31.0000"} for i in range(8)]
    rs = []
    for d, order in (("0", range(8)), ("1", reversed(range(8)))):
        for k, i in enumerate(order):
            rs.append({"route_id": "L1", "route_name": "虚构1路", "direction": d, "seq": str(k + 1), "stop_id": f"S{i}",
                       "stop_name": f"虚构站{i}", "lon": stops[i]["lon"], "lat": stops[i]["lat"]})
    trips = [{"trip_id": f"L1-{d}-{n}", "route_id": "L1", "direction": d, "departure_time": f"{7 + n // 4:02d}:{n % 4 * 15:02d}:00",
              "service_id": "", "arrival_time": ""} for d in "01" for n in range(8)]
    rid = [{"route_id": "L1", "direction": d, "stop_id": "", "time_bin": f"{h:02d}", "boardings": str(b), "alightings": ""}
           for d in "01" for h, b in ((7, 300), (8, 200))]
    dem = [{"request_id": f"Q{i}", "request_time": f"2026-01-01 07:{i * 2:02d}:00", "o_lon": f"{121.0 + (i % 7) * 0.01:.4f}",
            "o_lat": "31.0050", "d_lon": f"{121.07 - (i % 5) * 0.01:.4f}", "d_lat": "30.9950", "passengers": "1"} for i in range(20)]
    veh = [{"vehicle_id": f"V{i}", "capacity": "6", "depot_id": "D1"} for i in range(3)]
    dep = [{"depot_id": "D1", "depot_name": "虚构车场", "lon": "121.0300", "lat": "31.0100"}]
    for name, rows in (("stops", stops), ("route_stops", rs), ("trips", trips), ("ridership", rid), ("demand", dem), ("vehicles", veh), ("depots", dep)):
        pd.DataFrame(rows).to_csv(os.path.join(root, name + ".csv"), index=False)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("path")
    ap.add_argument("--version-dir")
    ap.add_argument("--params", default="{}", help="JSON object of parameter overrides")
    a = ap.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        vd = a.version_dir
        if not vd:
            vd = os.path.join(tmp, "fixture")
            os.makedirs(vd)
            fixture(vd)
        algorithm = {"path": os.path.abspath(a.path), "sha256": algo.sha256(a.path)}
        meta = algo.describe(algorithm)
        print("META ok:", json.dumps({k: meta[k] for k in ("id", "name", "kind")}, ensure_ascii=False))
        out = algo.run({**{"algorithm": algorithm}, "versionDir": vd, "params": json.loads(a.params), "resultDir": os.path.join(tmp, "out")},
                       lambda v, m="": print(f"  {v:.0%} {m}", file=sys.stderr))
        with open(os.path.join(tmp, "out", "result.json"), encoding="utf-8") as f:
            violations = json.load(f)["validation"]["violations"]
        print("summary:", json.dumps(out["summary"], ensure_ascii=False))
        print("validation:", "通过" if out["validation"]["ok"] else f"{out['validation']['count']} 项违反约束", "" if out["validation"]["checked"] else "（custom 类型不做约束校验）")
        for v in violations[:20]:
            print("  -", v)
        sys.exit(0 if out["validation"]["ok"] else 2)


if __name__ == "__main__":
    main()
