import copy
import json
import os
import random
import shutil
import sys
import tempfile
import unittest

import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from linggo_data import algo, drt, fleet, selfcheck, tripgen  # noqa: E402
from linggo_data.geo import time_bin  # noqa: E402

TEMPLATE = os.path.join(os.path.dirname(__file__), "..", "templates", "linggo_algorithm.py")
A, B, C = (121.0, 31.0), (121.1, 31.0), (121.0, 31.1)


def defaults(meta, **over):
    return {**{k: v["default"] for k, v in meta["params"].items()}, **over}


def trip(tid, start, end, frm, to):
    return {"trip_id": tid, "route_id": "R", "direction": "0", "start": start * 60, "end": end * 60, "from": frm, "to": to}


class FleetTest(unittest.TestCase):
    def test_known_minimum(self):
        trips = [trip("1", 420, 440, A, B), trip("2", 450, 470, B, A), trip("3", 445, 465, A, B)]
        p = defaults(fleet.META, layover_min=5)
        self.assertEqual(fleet.assign(trips, p)["vehicles"], 2)
        # A longer layover breaks the 1 -> 2 connection.
        self.assertEqual(fleet.assign(trips, {**p, "layover_min": 15})["vehicles"], 3)

    def test_deadhead_only_when_allowed(self):
        trips = [trip("1", 420, 440, A, B), trip("2", 500, 520, C, A)]
        p = defaults(fleet.META, max_deadhead_km=20)
        self.assertEqual(fleet.assign(trips, p)["vehicles"], 2)
        self.assertEqual(fleet.assign(trips, {**p, "allow_deadhead": True})["vehicles"], 1)

    def test_matches_greedy_optimum_on_random_instances(self):
        # Without deadheading, earliest-available assignment per terminal is optimal (deficit function).
        rng = random.Random(7)
        terms = [A, B, C]
        for _ in range(30):
            trips = []
            for i in range(40):
                s = rng.randint(360, 600)
                f, t = rng.sample(terms, 2)
                trips.append(trip(str(i), s, s + rng.randint(10, 40), f, t))
            p = defaults(fleet.META, layover_min=5, max_idle_min=1440)
            idle = {k: [] for k in range(3)}
            need = 0
            for t in sorted(trips, key=lambda t: t["start"]):
                pool = idle[terms.index(t["from"])]
                ready = [x for x in pool if x <= t["start"]]
                if ready:
                    pool.remove(min(ready))
                else:
                    need += 1
                idle[terms.index(t["to"])].append(t["end"] + 300)
            a = fleet.assign(trips, p)
            self.assertEqual(a["vehicles"], need)
            self.assertGreaterEqual(a["vehicles"], a["peak"])
            result = {"blocks": a["blocks"], "summary": {"vehicles_required": a["vehicles"]}}
            self.assertEqual(fleet.validate(result, p), [])

    def test_validator_rejects_short_turnaround(self):
        p = defaults(fleet.META)
        bad = {"blocks": [{"vehicle_id": "X", "trips": [
            {"trip_id": "1", "start": 0, "end": 600, "from": list(A), "to": list(B)},
            {"trip_id": "2", "start": 650, "end": 900, "from": list(B), "to": list(A)}]}], "summary": {}}
        self.assertTrue(any("接续时间不足" in e for e in fleet.validate(bad, p)))


class Fixture(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.dir)
        selfcheck.fixture(self.dir)

    def inputs(self, meta):
        return algo.load_inputs(self.dir, algo.check_meta(meta))


class DrtTest(Fixture):
    def test_solution_satisfies_constraints(self):
        p = defaults(drt.META)
        r = drt.solve(self.inputs(drt.META), p)
        self.assertGreater(r["summary"]["served"], 0)
        self.assertEqual(drt.validate(r, p), [])
        for v in r["vehicles"]:
            self.assertLessEqual(max([s["load"] for s in v["stops"]] or [0]), v["capacity"])

    def test_validator_catches_violations(self):
        p = defaults(drt.META)
        r = drt.solve(self.inputs(drt.META), p)
        v = next(v for v in r["vehicles"] if v["stops"])
        broken = copy.deepcopy(r)
        broken["vehicles"][r["vehicles"].index(v)]["capacity"] = 0
        self.assertTrue(any("座位" in e for e in drt.validate(broken, p)))
        late = copy.deepcopy(r)
        stop = next(s for s in late["vehicles"][r["vehicles"].index(v)]["stops"] if s["kind"] == "pickup")
        stop["arrive"] += 3600
        self.assertTrue(drt.validate(late, p))

    def test_synthetic_demand_is_reproducible_and_labelled(self):
        p = defaults(drt.META, demand_source="synthetic", synthetic_requests=40, synthetic_seed=3)
        a, b = drt.solve(self.inputs(drt.META), p), drt.solve(self.inputs(drt.META), p)
        self.assertEqual(json.dumps(a), json.dumps(b))
        self.assertTrue(a["synthetic"])
        self.assertTrue(any("实验生成" in n for n in a["assumptions"]))
        c = drt.solve(self.inputs(drt.META), {**p, "synthetic_seed": 4})
        self.assertNotEqual(json.dumps(a["requests"]), json.dumps(c["requests"]))

    def test_synthetic_demand_avoids_far_stops(self):
        stops = pd.DataFrame([{"lon": str(121.8 + (i % 8) * 0.01), "lat": str(30.9 + (i // 8) * 0.01)} for i in range(64)]
                             + [{"lon": "104.8", "lat": "30.6"}])
        notes = []
        rows = drt.synthetic_demand(stops, 200, 1, 25200, 32400, notes)
        self.assertTrue(all(r["o"][0] > 121 and r["d"][0] > 121 for r in rows))
        self.assertTrue(any("远离主要范围" in n for n in notes))

    def test_missing_demand_is_explained(self):
        os.remove(os.path.join(self.dir, "demand.csv"))
        with self.assertRaisesRegex(ValueError, "实验生成"):
            drt.solve(self.inputs(drt.META), defaults(drt.META))


class TripgenTest(Fixture):
    def test_headways_within_policy(self):
        p = defaults(tripgen.META)
        r = tripgen.solve(self.inputs(tripgen.META), p)
        self.assertEqual(tripgen.validate(r, p), [])
        self.assertTrue(all(p["min_headway_min"] <= h["headway_min"] <= p["max_headway_min"] for h in r["headways"]))

    def test_infeasible_scenario_reports_gaps(self):
        pd.DataFrame([{"route_id": "L1", "direction": "0", "stop_id": "", "time_bin": "07:00-08:00", "boardings": "9000", "alightings": ""}]).to_csv(
            os.path.join(self.dir, "ridership.csv"), index=False)
        p = defaults(tripgen.META)
        r = tripgen.solve(self.inputs(tripgen.META), p)
        self.assertFalse(r["summary"]["feasible"])
        gap = r["gaps"][0]
        self.assertEqual(gap["headway_min"], p["min_headway_min"])
        self.assertGreater(gap["shortfall_ph"], 0)
        # Only 3 vehicles exist, the minimum-headway peak needs more.
        self.assertGreater(r["summary"]["vehicles_required"], r["summary"]["vehicles_available"])

    def test_time_bins(self):
        self.assertEqual(time_bin("7"), (25200, 3600))
        self.assertEqual(time_bin("07:00-07:30"), (25200, 1800))
        self.assertEqual(time_bin("2024-05-01 08:15:00", 15), (29700, 900))
        self.assertIsNone(time_bin("早高峰"))


class UserAlgorithmTest(Fixture):
    def test_template_runs_and_validates(self):
        out = algo.run({"algorithm": {"path": TEMPLATE, "sha256": algo.sha256(TEMPLATE)}, "versionDir": self.dir, "params": {},
                        "resultDir": os.path.join(self.dir, "out")}, lambda v, m="": None)
        self.assertTrue(out["validation"]["ok"])
        self.assertEqual(out["kind"], "drt")

    def test_changed_file_is_refused(self):
        path = os.path.join(self.dir, "a.py")
        shutil.copy(TEMPLATE, path)
        sha = algo.sha256(path)
        with open(path, "a") as f:
            f.write("\n# changed\n")
        with self.assertRaisesRegex(ValueError, "不一致"):
            algo.describe({"path": path, "sha256": sha})

    def test_interface_is_checked(self):
        path = os.path.join(self.dir, "b.py")
        with open(path, "w") as f:
            f.write("META = {'id': 'x', 'name': 'x', 'kind': 'teleport'}\ndef run(i, p, c):\n    return {}\n")
        with self.assertRaisesRegex(ValueError, "kind"):
            algo.describe({"path": path, "sha256": algo.sha256(path)})

    def test_params_are_checked(self):
        meta = algo.check_meta(drt.META)
        with self.assertRaisesRegex(ValueError, "之间"):
            algo.clean_params(meta, {"fleet_size": 0})
        with self.assertRaisesRegex(ValueError, "未知参数"):
            algo.clean_params(meta, {"rm": "-rf"})
        self.assertEqual(algo.clean_params(meta, {})["fleet_size"], 10)


if __name__ == "__main__":
    unittest.main()
