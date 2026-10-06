"""Test Baidu public contract and network failure without a real AK. Isolated home only."""
import argparse,json,re
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('log');p.add_argument('home');a=p.parse_args()
url=re.findall(r'http://127\.0\.0\.1:\d+/\?token=[^\s\"\']+',Path(a.log).read_text())[-1];origin='http://'+urlsplit(url).netloc
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='msedge',headless=True);context=browser.new_context(viewport={'width':1920,'height':1000});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e).split('https://')[0]))
 def sdk(route):
  callback=parse_qs(urlsplit(route.request.url).query)['callback'][0];text=Path('tests/fixtures/baidu-sdk.js').read_text()+'\nwindow['+json.dumps(callback)+']();';route.fulfill(status=200,content_type='application/javascript',body=text)
 page.route('**/api.map.baidu.com/api?*',sdk)
 page.goto(url+'#linggo=1');page.get_by_title('新建项目',exact=True).first.wait_for()
 def rpc(method,payload={}):
  r=context.request.post(origin+'/api/linggo.'+method,data={'type':'client-request','rpcId':'adapter-test','method':'linggo.'+method,'payload':payload}).json()['result'];assert r['ok'];return r['value']
 before=rpc('settings');rpc('saveSettings',{'baiduAK':'contract-test-only'})
 try:
  notice=page.get_by_role('button',name='继续',exact=True)
  if notice.is_visible():notice.click()
  project=next(p for p in rpc('state')['projects'] if p['name'].startswith('Generated UI test'))
  page.get_by_label('当前项目',exact=True).select_option(project['id']);page.get_by_label('地图底图',exact=True).wait_for();page.get_by_label('地图底图',exact=True).select_option('baidu');page.wait_for_function('window.__baiduFixture?.at(-1)?.overlays.length > 0');page.wait_for_timeout(200)
  assert page.evaluate("window.__baiduFixture.at(-1).overlays.filter(x=>x.constructor.name==='Polyline').length")==600
  page.evaluate("window.__baiduFixture.at(-1).overlays.filter(x=>x.constructor.name==='Polyline').at(-1).fire('click')")
  page.get_by_label('线路详情',exact=True).wait_for();assert page.get_by_label('线路详情',exact=True).inner_text().startswith('Test 599')
  page.evaluate("window.__baiduFixture.at(-1).overlays.filter(x=>x.constructor.name==='Circle').at(-1).fire('click')")
  page.get_by_label('站点详情',exact=True).wait_for()
  page.get_by_label('折叠 / 展开项目栏',exact=True).click();page.wait_for_timeout(200);assert page.evaluate('window.__baiduFixture.at(-1).resizes')>0
  page.get_by_label('地图底图',exact=True).select_option('canvas');page.wait_for_timeout(200);assert page.evaluate('window.__baiduFixture.every(m=>m.destroyed && m.overlays.length===0 && m.events.size===0)')
  page.get_by_label('地图底图',exact=True).select_option('baidu');page.wait_for_timeout(200);assert page.locator('.linggo-native-map').count()==1
  # New page, force a network failure. Preference remains Baidu, adapter becomes canvas.
  failed=context.new_page();failed.route('**/api.map.baidu.com/api?*',lambda route:route.abort());failed.goto(origin+'/#linggo=1');failed.locator('.linggo-sdk-error').wait_for(timeout=20000);assert failed.locator('.linggo-render-map').count()==1
  assert failed.evaluate("JSON.parse(localStorage.getItem('linggo.map.provider'))")=='baidu'
  failed.get_by_role('button',name='重试',exact=True).click();failed.locator('.linggo-sdk-error').wait_for(timeout=20000)
  failed.get_by_label('地图底图',exact=True).select_option('canvas');failed.wait_for_timeout(200);assert not failed.locator('.linggo-sdk-error').count()
  assert not errors,errors
 finally:rpc('saveSettings',{'baiduAK':before.get('baiduAK','')})
 print('Baidu contract: GCJ before construction, style JSON, 600 overlays, line/stop events, resize, destroy, reload and network failure passed; not a live SDK verification')
 browser.close()
