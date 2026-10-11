"""Explicit setup -> preview -> user-confirmed run, isolated synthetic demo only."""
import argparse,json,re,time,traceback
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('log');p.add_argument('home');p.add_argument('--python',required=True);p.add_argument('--shots',required=True);a=p.parse_args()
def run():
 url=re.findall(r'http://127\.0\.0\.1:\d+/\?token=[^\s"\']+',Path(a.log).read_text())[-1];origin='http://'+urlsplit(url).netloc
 out=Path(a.shots);out.mkdir(parents=True,exist_ok=True)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='msedge',headless=True);context=browser.new_context(viewport={'width':1920,'height':1080});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url+'#linggo=1&demo=1');page.locator('.linggo-mapwrap').wait_for(timeout=30000);page.get_by_role('button',name='常规公交',exact=True).wait_for(state='visible');page.wait_for_timeout(1000)
  def rpc(op,payload={}):
   r=context.request.post(origin+'/api/linggo.'+op,data={'type':'client-request','rpcId':'setup-browser','method':'linggo.'+op,'payload':payload}).json()['result'];assert r['ok'],r.get('error');return r['value']
  demo=rpc('demoInfo');pid=demo['projectId'];rpc('saveSettings',{'python':'/not-installed/demo-python'})
  page.get_by_role('button',name='常规公交',exact=True).click();page.get_by_role('button',name='模拟 A/B · 预览与比较',exact=True).click();page.get_by_role('button',name='预览运行',exact=True).click()
  page.get_by_role('button',name='初始化隔离 Python 环境',exact=True).click()
  page.get_by_text('Python 初始化失败。请安装 Python 3.10+',exact=False).wait_for(timeout=30000)
  assert not [r for r in rpc('runs',{'projectId':pid}) if not r.get('precomputed')]
  rpc('saveSettings',{'python':a.python})
  page.get_by_role('button',name='初始化隔离 Python 环境',exact=True).click()
  preview=page.get_by_role('region',name='运行预览',exact=True);preview.wait_for(timeout=240000)
  assert not [r for r in rpc('runs',{'projectId':pid}) if not r.get('precomputed')], 'Setup auto-ran the algorithm'
  page.screenshot(path=str(out/'setup-return-preview.png'))
  preview.get_by_role('button',name=re.compile('确认运行')).click()
  for _ in range(200):
   jobs=rpc('jobs',{'projectId':pid});run=[j for j in jobs if j['kind']=='run']
   if run and run[-1]['status']!='running':break
   time.sleep(.1)
  assert run[-1]['status']=='done',run[-1].get('error')
  actual=next(r for r in rpc('runs',{'projectId':pid}) if not r.get('precomputed'))
  value=rpc('runResult',{'projectId':pid,'runId':actual['id']})
  preset=rpc('runResult',{'projectId':pid,'runId':demo['resultIds']['drt-a']})
  assert value['result']==preset['result']
  assert not errors,errors
  browser.close()
 print('Explicit setup passed: missing interpreter guidance, isolated dependencies, returns to preview, confirmed rerun matches preset')
try:run()
except Exception:
 print(re.sub(r'([?&]token=)[^\s"\']+',r'\1<redacted>',traceback.format_exc()));raise SystemExit(1)
