"""Map-first demo QA against an isolated official DSH profile; no credentials or model calls."""
import argparse,json,re,traceback
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('log');p.add_argument('home');p.add_argument('--shots',required=True);p.add_argument('--legacy',action='store_true');a=p.parse_args()
def run():
 url=re.findall(r'http://127\.0\.0\.1:\d+/\?token=[^\s"\']+',Path(a.log).read_text())[-1];origin='http://'+urlsplit(url).netloc
 out=Path(a.shots);out.mkdir(parents=True,exist_ok=True)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='msedge',headless=True);context=browser.new_context(viewport={'width':1920,'height':1080},locale='zh-CN');page=context.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
  def rpc(op,payload={}):
   r=context.request.post(origin+'/api/linggo.'+op,data={'type':'client-request','rpcId':'map-browser','method':'linggo.'+op,'payload':payload}).json()['result'];assert r['ok'],r.get('error');return r['value']
  page.goto(url+'#linggo=1&demo=1');page.locator('.linggo-mapwrap').wait_for(timeout=30000)
  for _ in range(8):
   buttons=page.get_by_role('button',name=re.compile('^继续$|稍后配置')).filter(visible=True)
   if buttons.count():buttons.first.click();page.wait_for_timeout(150)
   else:break
  demo=rpc('demoInfo');assert demo['nativeReady'] and demo['version']==2 and len(demo['results'])==5
  assert len(demo['tables']['stops'])==95 and len(demo['tables']['route_stops'])==176
  jobs_before={j['id'] for j in rpc('jobs',{'projectId':demo['projectId']})}
  assert not rpc('env')['ok'];assert {j['id'] for j in rpc('jobs',{'projectId':demo['projectId']})}==jobs_before
  expect(page.get_by_label('地图底图')).to_have_value('canvas');assert not page.get_by_role('button',name='体验演示',exact=True).count()
  page.locator('.linggo-line-analytics').wait_for();
  restore=page.get_by_role('button',name='恢复最近的展示会话',exact=True)
  if restore.count():restore.click();page.get_by_text('插件内置说明 · 真实线网地图演示',exact=False).filter(visible=True).first.wait_for();page.screenshot(path=str(out/'native-presentation.png'))
  expect(page.locator('.linggo-detail-panel header strong')).to_have_text('1009路')
  for width in [1920,1440,1024,800]:
   page.set_viewport_size({'width':width,'height':1080});page.wait_for_timeout(300);assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),width;page.screenshot(path=str(out/f'bus-{width}.png'))
  page.set_viewport_size({'width':1920,'height':1080});page.get_by_role('button',name='显示 / 隐藏 OD',exact=True).click();page.get_by_role('status').filter(has_text='模拟 OD').wait_for();page.screenshot(path=str(out/'bus-od.png'))
  page.get_by_role('button',name='周六',exact=True).click();page.get_by_label('客流时段').select_option('22');page.screenshot(path=str(out/'bus-saturday.png'))
  page.get_by_label('线路方向').select_option(index=1);page.wait_for_timeout(200);page.screenshot(path=str(out/'bus-return.png'))
  page.get_by_role('button',name='显示 / 隐藏 OD',exact=True).click();page.get_by_role('button',name='计划车辆回放',exact=True).click();page.locator('.linggo-replay-bar').filter(has_text='非实测 GPS').wait_for();page.wait_for_timeout(300);page.screenshot(path=str(out/'bus-vehicles.png'))
  page.get_by_role('button',name='常规公交',exact=True).click();page.get_by_label('DRT 场景').wait_for();page.locator('.linggo-drt-dock').wait_for();page.wait_for_timeout(200)
  assert not page.locator('.linggo-detail-panel').count();assert not page.locator('.linggo-route-panel').count()
  value=rpc('runResult',{'projectId':demo['projectId'],'runId':demo['resultIds']['recorded']})['result']
  page.get_by_role('button',name='全网视野',exact=False).click();page.wait_for_timeout(300)
  # Same WGS84 fitting formula; exercise a real pointer click, not a test-only debug endpoint.
  pts=[p['p'] for v in value['vehicles'] for p in v['track']]+[r['o'] for r in value['requests']]
  import math
  box=[min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts)];rect=page.locator('.linggo-map-host').bounding_box();w,h=rect['width'],rect['height'];k=math.cos((box[1]+box[3])*math.pi/360);scale=min(max(160,w-354)/max((box[2]-box[0])*k,1e-6),max(160,h-300)/max(box[3]-box[1],1e-6),2e6);cx=(box[0]+box[2])/2+306/2/(scale*k);cy=(box[1]+box[3])/2-140/2/scale;pos=value['vehicles'][1]['track'][0]['p']
  page.mouse.click(rect['x']+(pos[0]-cx)*scale*k+w/2,rect['y']+(cy-pos[1])*scale+h/2);expect(page.get_by_label('选择回放车辆')).to_have_value('REC-V02')
  select=page.get_by_label('选择回放车辆');select.select_option('REC-V01');page.get_by_role('button',name='片段完整路径',exact=True).click();page.get_by_text('事件流 ·',exact=False).click();slider=page.locator('.linggo-replay-bar input[type=range]');slider.fill('46000');page.get_by_label('回放倍速').select_option('30');page.get_by_role('button',name='全网视野',exact=False).click();page.wait_for_timeout(300);page.screenshot(path=str(out/'recorded-vehicle-events.png'))
  page.get_by_text('原场景参考（非六车片段）',exact=True).click();page.screenshot(path=str(out/'recorded-reference.png'))
  for scene in ['drt-a','drt-b']:
   page.get_by_label('DRT 场景').select_option(scene);page.wait_for_timeout(700);select.select_option('SIM-V01');page.wait_for_timeout(200);page.screenshot(path=str(out/f'{scene}.png'))
  for width in [1440,1024,800]:
   page.set_viewport_size({'width':width,'height':1080});page.wait_for_timeout(300);assert page.evaluate('document.documentElement.scrollWidth <= innerWidth');page.screenshot(path=str(out/f'drt-{width}.png'))
  page.set_viewport_size({'width':1920,'height':1080});page.get_by_text('功能指引',exact=True).click();page.get_by_role('button',name='四种算法 · 预览、确认、取消、结果',exact=True).click();page.get_by_role('combobox',name='算法',exact=True).select_option('drt_v2');page.get_by_role('button',name='预览运行',exact=True).click();page.get_by_role('button',name='初始化隔离 Python 环境',exact=True).wait_for();page.screenshot(path=str(out/'no-python-preview.png'));assert {j['id'] for j in rpc('jobs',{'projectId':demo['projectId']})}==jobs_before
  dev=context.new_page();dev.goto(origin+'/');dev.get_by_role('button',name='公交工作台',exact=True).first.click();dev.get_by_role('button',name='打开演示开发会话',exact=True).click();dev.get_by_text('插件内置说明 · 地图演示开发',exact=False).filter(visible=True).first.wait_for();dev.screenshot(path=str(out/'native-development.png'))
  assert not errors,errors;assert not any('/v1/chat/completions' in u or 'amap.com' in u or 'api.map.baidu' in u for u in requests)
  assert len(rpc('state')['projects'])==1
  browser.close()
 print('Map demo verified: cold canvas, eight lines, day/OD/directions, plan vehicles, recorded/A/B, vehicle/events, four viewports, no auto model/setup')
try:run()
except Exception:print(re.sub(r'([?&]token=)[^\s"\']+',r'\1<redacted>',traceback.format_exc()));raise SystemExit(1)
