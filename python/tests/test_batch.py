import json
import os
import tempfile
import unittest
from pathlib import Path
import pandas as pd
from linggo_data.batch import inspect_batch, build

class BatchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
    def tearDown(self): self.temp.cleanup()
    def csv(self, name, text):
        p = self.root / name; p.write_text(text); return str(p)
    def test_multisheet_recognition_and_conservative_crs_direction(self):
        path = self.root / 'book.xlsx'
        with pd.ExcelWriter(path) as w:
            pd.DataFrame({'stop_id': ['s1'], 'lon': [121], 'lat': [31]}).to_excel(w, sheet_name='stops', index=False)
            pd.DataFrame({'route_id': ['r1'], 'route_name': ['公交']}).to_excel(w, sheet_name='routes', index=False)
        unknown = inspect_batch({'paths': [str(path)]})
        self.assertFalse(unknown['ready']); self.assertEqual(len(unknown['inputs']), 2)
        self.assertIn('坐标系', json.dumps(unknown['issues'], ensure_ascii=False))
        self.assertIn('方向', json.dumps(unknown['issues'], ensure_ascii=False))
        ready = inspect_batch({'paths': [str(path)], 'crs': 'WGS84', 'overrides': {str(path) + '::routes': {'defaults': {'direction': '0'}}}})
        self.assertTrue(ready['ready'], ready)
    def test_primary_key_conflict_and_identical_record(self):
        a = self.csv('a.csv', 'vehicle_id,capacity\nv1,8\nv1,8\n')
        b = self.csv('b.csv', 'vehicle_id,capacity\nv2,12\n')
        merged = inspect_batch({'paths': [a, b]}); self.assertTrue(merged['ready']); self.assertEqual(merged['entities']['vehicles']['rows'], 2)
        c = self.csv('c.csv', 'vehicle_id,capacity\nv1,10\n')
        conflict = inspect_batch({'paths': [a, c]}); self.assertFalse(conflict['ready']); self.assertIn('主键', conflict['issues'][0]['reason'])
    def test_same_table_conflict_cannot_be_silently_dropped(self):
        p = self.csv('v.csv', 'vehicle_id,capacity\nv1,8\nv1,10\n')
        self.assertFalse(inspect_batch({'paths': [p]})['ready'])
    def test_keyless_overlap_requires_decision(self):
        a = self.csv('a.csv', 'origin_stop_id,dest_stop_id,count\ns1,s2,3\n')
        b = self.csv('b.csv', 'origin_stop_id,dest_stop_id,count\ns1,s2,3\n')
        self.assertFalse(inspect_batch({'paths': [a, b]})['ready'])
    def test_partial_invalid_rows_block_auto_import(self):
        p = self.csv('s.csv', 'stop_id,lon,lat\ns1,121,31\ns2,bad,31\n')
        self.assertFalse(inspect_batch({'paths': [p], 'crs': 'WGS84'})['ready'])
    def test_publish_one_snapshot_inherit_and_final_references(self):
        stops = self.csv('s.csv', 'stop_id,lon,lat\ns1,121,31\n')
        routes = self.csv('r.csv', 'route_id,route_name,direction\nr1,线路1,0\n')
        base = str(self.root / 'base')
        build({'paths': [stops, routes], 'crs': 'WGS84', 'stagingDir': base}, lambda *a: None)
        vehicles = self.csv('v.csv', 'vehicle_id,capacity\nv1,8\n')
        staging = str(self.root / 'next')
        value = build({'paths': [vehicles], 'baseDir': base, 'stagingDir': staging}, lambda *a: None)
        self.assertEqual(set(value['entities']), {'stops', 'routes', 'vehicles'})
        rs = self.csv('rs.csv', 'route_id,direction,seq,stop_id\nr1,0,1,missing\n')
        invalid = inspect_batch({'paths': [rs], 'baseDir': staging})
        self.assertFalse(invalid['ready']); self.assertIn('引用不在', invalid['issues'][0]['reason'])
        with self.assertRaises(ValueError):
            build({'paths': [rs], 'baseDir': staging, 'stagingDir': str(self.root / 'bad')}, lambda *a: None)
        self.assertFalse((self.root / 'bad').exists())
        self.assertEqual(Path(stops).read_text(), 'stop_id,lon,lat\ns1,121,31\n')
    def test_append_conflict_with_base_reported_before_publish(self):
        v = self.csv('v.csv', 'vehicle_id,capacity\nv1,8\n')
        base = str(self.root / 'base')
        build({'paths': [v], 'stagingDir': base}, lambda *a: None)
        conflict = self.csv('new.csv', 'vehicle_id,capacity\nv1,12\n')
        self.assertFalse(inspect_batch({'paths': [conflict], 'baseDir': base, 'mode': 'append'})['ready'])
