"""Synthetic fixture only; parity with independently extracted original scheduling kernel."""
import copy
import importlib.util
import json
import sys
import unittest
from collections import Counter
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'python'))
spec = importlib.util.spec_from_file_location('generate_demo', ROOT / 'python/tests/demo_toy_fixture.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
from linggo_data import algo, drt_v2


class DemoTest(unittest.TestCase):
    def test_exact_sizes_references_and_counting(self):
        t = generator.fixture()
        self.assertEqual({k: len(v) for k, v in t.items()}, dict(stops=8, routes=4, route_stops=20, trips=8, ridership=40, od=12, demand=24, depots=2, vehicles=3, network_nodes=10, network_edges=24))
        stops = {r['stop_id'] for r in t['stops']}
        routes = {(r['route_id'], r['direction']) for r in t['routes']}
        depots = {r['depot_id'] for r in t['depots']}
        nodes = {r['node_id'] for r in t['network_nodes']}
        for row in t['route_stops'] + t['ridership']:
            self.assertIn(row['stop_id'], stops)
            self.assertIn((row['route_id'], row['direction']), routes)
        for v in t['vehicles']:
            self.assertIn(v['depot_id'], depots)
        for e in t['network_edges']:
            self.assertIn(e['from_node_id'], nodes)
            self.assertIn(e['to_node_id'], nodes)
        pos = {(s['lon'], s['lat']): s['stop_id'] for s in t['stops']}
        actual = Counter((pos[(r['o_lon'], r['o_lat'])], pos[(r['d_lon'], r['d_lat'])], '07:00-07:15' if int(r['request_time'][14:16]) < 15 else '07:15-07:30') for r in t['demand'])
        self.assertEqual(actual, Counter({(r['origin_stop_id'], r['dest_stop_id'], r['time_bin']): r['count'] for r in t['od']}))
        boards = Counter(); alights = Counter()
        for r in t['ridership']:
            boards[(r['stop_id'], r['time_bin'])] += r['boardings']
            alights[(r['stop_id'], r['time_bin'])] += r['alightings']
        for stop in stops:
            for bin in ['07:00-07:15', '07:15-07:30']:
                self.assertEqual(boards[stop, bin], sum(r['count'] for r in t['od'] if r['origin_stop_id'] == stop and r['time_bin'] == bin))
                self.assertEqual(alights[stop, bin], sum(r['count'] for r in t['od'] if r['dest_stop_id'] == stop and r['time_bin'] == bin))



class V2Test(unittest.TestCase):
    def setUp(self):
        self.inputs = {k: pd.DataFrame(v) for k, v in generator.canonical_tables(generator.fixture()).items()}
        self.inputs['__synthetic__'] = True
        self.params = {k: v['default'] for k, v in drt_v2.META['params'].items()}
        self.ctx = algo.Context(lambda *_: None)

    def result(self, **params):
        return drt_v2.run(self.inputs, {**self.params, **params}, self.ctx)

    def test_original_core_has_identical_A_B_results(self):
        spec = importlib.util.spec_from_file_location('original_v2', ROOT / 'tests/fixtures/drt-v2-original.py')
        original = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(original)
        original.configure = lambda params: None  # Baseline globals equal the default META values.
        adapted = drt_v2.core
        try:
            for policy in ['A', 'B']:
                actual = self.result(policy=policy)
                drt_v2.core = original
                expected = self.result(policy=policy)
                drt_v2.core = adapted
                self.assertEqual(actual, expected)
                self.assertEqual(drt_v2.validate(actual, {**self.params, 'policy': policy}, self.inputs), [])
                self.assertGreater(actual['summary']['shared_requests'], 0)
                self.assertGreater(actual['summary']['rejected'], 0)
        finally:
            drt_v2.core = adapted

    def test_constraints_and_tampered_results(self):
        r = self.result()
        self.assertEqual(drt_v2.validate(r, self.params, self.inputs), [])
        self.assertTrue(any('等待' in e for e in drt_v2.validate(r, {**self.params, 'max_wait_min': .001}, self.inputs)))
        self.assertTrue(any('乘车' in e for e in drt_v2.validate(r, {**self.params, 'max_ride_factor': 1, 'max_ride_slack_min': 0}, self.inputs)))
        v = next(v for v in r['vehicles'] if v['stops'])
        bad = copy.deepcopy(r); bad['vehicles'].append(copy.deepcopy(v))
        self.assertTrue(any('重复' in e for e in drt_v2.validate(bad, self.params, self.inputs)))
        bad = copy.deepcopy(r); bad['vehicles'][0]['track'][0]['p'][0] += .01
        self.assertTrue(any('轨迹' in e for e in drt_v2.validate(bad, self.params, self.inputs)))
        bad = copy.deepcopy(r); bad['vehicles'][0]['stops'].pop(); bad['vehicles'][0]['network_legs'].pop()
        self.assertTrue(any('回所属车场' in e for e in drt_v2.validate(bad, self.params, self.inputs)))
        bad = copy.deepcopy(r)
        served = next(q for q in bad['requests'] if q['served']); served['passengers'] = 999
        self.assertTrue(any('容量' in e for e in drt_v2.validate(bad, self.params, self.inputs)))
        bad = copy.deepcopy(r)
        pickup = next(s for v in bad['vehicles'] for s in v['stops'] if s['pickups'])
        pickup['dropoffs'].append(pickup['pickups'][0])
        self.assertTrue(any('下客顺序' in e for e in drt_v2.validate(bad, self.params, self.inputs)))
        # The original max() formula keeps the absolute slack when direct travel is short.
        drt_v2.core.configure(self.params)
        self.assertEqual(drt_v2.core.Order('x', 0, 1, 1, 0, 'data', None, 60, 0).max_ride, 660)

    def test_boarding_inside_dwell_window_is_valid(self):
        result = self.result(policy='B')
        visit = next(s for v in result['vehicles'] for s in v['stops'] if s['pickups'])
        identity = visit['pickups'][0]
        request = next(r for r in result['requests'] if r['request_id'] == identity)
        when = visit['arrive'] + 1
        request['request_time'] = request['pickup_time'] = when
        request['wait_min'] = 0
        request['ride_min'] = round((request['dropoff_time'] - when) / 60, 2)
        self.inputs['demand'].loc[self.inputs['demand']['request_id'] == identity, 'request_time'] = (pd.Timestamp('2030-01-01') + pd.Timedelta(seconds=when)).isoformat()
        self.assertEqual(drt_v2.validate(result, {**self.params, 'policy': 'B'}, self.inputs), [])

    def test_directed_network_motorways_missing_road_and_fleet_bounds(self):
        net = drt_v2.Network(self.inputs)
        self.assertNotEqual(net.path('DEMO-NA', 'DEMO-NB'), net.path('DEMO-NB', 'DEMO-NA'))
        edge = dict(edge_id='FORBIDDEN', from_node_id='DEMO-NA', to_node_id='DEMO-NE', length_m='1', travel_time_s='1', highway='motorway_link', geometry='')
        self.inputs['network_edges'] = pd.concat([self.inputs['network_edges'], pd.DataFrame([edge])], ignore_index=True)
        net = drt_v2.Network(self.inputs)
        self.assertNotIn('FORBIDDEN', net.edges)
        self.assertGreater(net.duration('DEMO-NA', 'DEMO-NE'), 1)
        with self.assertRaisesRegex(ValueError, '超过车辆表'):
            self.result(fleet_size=4)
        self.inputs['network_edges'] = self.inputs['network_edges'].iloc[0:0]
        with self.assertRaisesRegex(ValueError, '回场'):
            self.result()

    def test_oversize_orders_rejected_and_cancellation_propagates(self):
        self.inputs['demand'].loc[0, 'passengers'] = '99'
        r = self.result(fleet_size=1)
        self.assertFalse(next(q for q in r['requests'] if q['request_id'] == self.inputs['demand'].iloc[0]['request_id'])['served'])
        self.assertEqual(drt_v2.validate(r, {**self.params, 'fleet_size': 1}, self.inputs), [])
        def cancel(*args):
            raise RuntimeError('cancelled')
        with self.assertRaisesRegex(RuntimeError, 'cancelled'):
            drt_v2.run(self.inputs, self.params, algo.Context(cancel))


if __name__ == '__main__':
    unittest.main()
