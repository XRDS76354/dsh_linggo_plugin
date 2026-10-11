"""No source directory reads: shipped snapshot, actual kernel parity, full rerun reproducibility."""
import base64,gzip,hashlib,importlib.util,json,sys,tempfile,unittest
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'python'))
from linggo_data import algo,drt_v2
class RealDemoTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  asset=json.loads((ROOT/'demo/bundle.json').read_text());payload=gzip.decompress(base64.b64decode(asset['data']));assert hashlib.sha256(payload).hexdigest()==asset['sha256'];cls.bundle=json.loads(payload)
 def test_catalog_matches_actual_meta(self):
  self.assertEqual(json.loads((ROOT/'demo/catalog.json').read_text()),algo.describe({}))
 def test_actual_demo_matrix_matches_independent_original_A_B(self):
  b=self.bundle;inputs={n:pd.DataFrame(r) for n,r in b['tables'].items()};inputs['__synthetic__']=True
  spec=importlib.util.spec_from_file_location('original_real_v2',ROOT/'tests/fixtures/drt-v2-original.py');original=importlib.util.module_from_spec(spec);spec.loader.exec_module(original);original.configure=lambda p:None
  adapted=drt_v2.core
  try:
   for policy in ['A','B']:
    preset=next(r for r in b['results'] if r['id']=='drt-'+policy.lower());params=preset['params'];actual=drt_v2.run(inputs,params,algo.Context(lambda *_:None));drt_v2.core=original;expected=drt_v2.run(inputs,params,algo.Context(lambda *_:None));drt_v2.core=adapted;self.assertEqual(actual,expected);self.assertEqual(drt_v2.validate(actual,params,inputs),[])
  finally:drt_v2.core=adapted
 def test_four_results_reproduced_from_shipped_canonical_data(self):
  with tempfile.TemporaryDirectory() as tmp:
   path=Path(tmp)
   for n,rows in self.bundle['tables'].items():pd.DataFrame(rows).to_csv(path/(n+'.csv'),index=False)
   (path/'manifest.json').write_text(json.dumps(self.bundle['manifest']))
   for r in self.bundle['results']:
    if r['id']=='recorded':continue
    out=path/r['id'];algo.run({'algorithm':{'builtin':r['algorithmId']},'versionDir':str(path),'params':r['params'],'resultDir':str(out)},lambda *_:None);self.assertEqual(json.loads((out/'result.json').read_text()),r['result'])
