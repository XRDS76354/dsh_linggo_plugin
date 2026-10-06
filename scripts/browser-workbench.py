"""UI/map regression in isolated official DSH profiles, generated test fixtures only.
Never logs launch URLs, SDK URLs or settings values. External providers are opt-in.
"""
import argparse,json,re,time
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('log');p.add_argument('home');p.add_argument('--shots',required=True);p.add_argument('--real-maps',action='store_true');a=p.parse_args()
url=re.findall(r'http://127\.0\.0\.1:\d+/\?token=[^\s\"\']+',Path(a.log).read_text())[-1];origin='http://'+urlsplit(url).netloc
out=Path(a.shots);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='msedge',headless=True)
 context=browser.new_context(viewport={'width':1920,'height':1000});page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e).split('https://')[0]))
 # Instrument SDK instances in the test harness only; no product debug endpoints.
 page.add_init_script("""window.__testMaps=[];for(const name of ['AMap','BMap']){let value;Object.defineProperty(window,name,{configurable:true,get:()=>value,set:v=>{value=v;if(v.Map&&!v.Map.__instrumented){const Original=v.Map;function Wrapped(...args){const map=new Original(...args);window.__testMaps.push({name,map});return map;}Wrapped.prototype=Original.prototype;Wrapped.__instrumented=true;v.Map=Wrapped;}}});}""")
 page.goto(url+'#linggo=1');page.get_by_title('新建项目',exact=True).first.wait_for()
 notice=page.get_by_role('button',name='继续',exact=True)
 if notice.is_visible():notice.click()
 def rpc(method,payload={}):
  r=context.request.post(origin+'/api/linggo.'+method,data={'type':'client-request','rpcId':'ui-map','method':'linggo.'+method,'payload':payload}).json()['result'];assert r['ok'],r.get('error',{}).get('message');return r['value']
 project=rpc('createProject',{'name':'Generated UI test '+str(time.time_ns())})
 # 600 routes and 1200 individual stations; no fixture ships in the product.
 fixture=Path(a.home)/'ui-routes.csv';rows=['route_id,route_name,direction,seq,stop_id,stop_name,lon,lat']
 for i in range(600):
  x=121.0+(i%30)*.002;y=31.0+(i//30)*.002
  for j in range(2):rows.append(f'R{i:03},Test {i:03},original-out,{j+1},S{i:03}-{j},Stop {i:03}-{j},{x+j*.001},{y+j*.001}')
 fixture.write_text('\n'.join(rows))
 source={'type':'file','path':str(fixture)};info=rpc('inspect',{'projectId':project['id'],'source':source});mapping={'entity':'route_stops','crs':'WGS84','mode':'append','fields':info['tables'][0]['suggestions']['route_stops']};preview=rpc('preview',{'projectId':project['id'],'source':source,'mapping':mapping});job=rpc('startImport',{'projectId':project['id'],'source':source,'mapping':mapping,'previewToken':preview['previewToken']})
 for i in range(80):
  status=next(j for j in rpc('jobs',{'projectId':project['id']}) if j['id']==job['id'])
  if status['status']!='running':break
  time.sleep(.1)
 assert status['status']=='done',status
 m=rpc('mapData',{'projectId':project['id']});assert len(m['routes'])==600 and len(m['stops'])==1200
 page.reload();page.get_by_label('当前项目',exact=True).select_option(project['id']);page.get_by_label('地图底图',exact=True).wait_for()
 page.get_by_label('地图底图',exact=True).select_option('canvas');page.locator('.linggo-render-map').last.wait_for();page.wait_for_timeout(500)
 assert page.get_by_text('600 条线路',exact=False).count()>0
 # Virtual list reaches the last real row; endpoint search includes stops.
 virtual=page.locator('.linggo-virtual-routes');virtual.evaluate('(e)=>e.scrollTop=e.scrollHeight');page.get_by_role('button',name='Test 599',exact=False).wait_for()
 page.get_by_role('button',name='Test 599',exact=False).click();page.get_by_label('线路详情',exact=True).wait_for();page.get_by_role('button',name='Stop 599-0',exact=True).click();page.get_by_label('站点详情',exact=True).wait_for();assert page.get_by_label('线路详情',exact=True).is_visible()
 page.get_by_label('关闭站点详情',exact=True).click();page.get_by_label('关闭线路详情',exact=True).click()
 page.get_by_label('搜索线路、起点或终点',exact=True).fill('Stop 598-1');expect(page.locator('.linggo-route-row')).to_have_count(1);page.get_by_label('搜索线路、起点或终点',exact=True).fill('')
 page.get_by_role('button',name='全部隐藏',exact=True).click();assert page.locator('.linggo-route-row input:checked').count()==0
 virtual.evaluate('(e)=>e.scrollTop=e.scrollHeight');page.get_by_role('button',name='Test 599',exact=False).click();assert page.locator('.linggo-route-row input:checked').count()==1
 page.get_by_label('关闭线路详情',exact=True).click();page.get_by_role('button',name='全部显示',exact=True).click();page.get_by_label('全网视野',exact=True).click()
 # Hit-test a real canvas segment between its two endpoints, outside the route panel.
 cb=page.locator('.linggo-map-host').bounding_box();bb=m['bbox'];k=__import__('math').cos((bb[1]+bb[3])*__import__('math').pi/360);scale=min(cb['width']*.84/((bb[2]-bb[0])*k),cb['height']*.84/(bb[3]-bb[1]));x=cb['x']+(121.0585-(bb[0]+bb[2])/2)*scale*k+cb['width']/2;y=cb['y']+((bb[1]+bb[3])/2-31.0385)*scale+cb['height']/2
 page.mouse.click(x,y);page.get_by_label('线路详情',exact=True).wait_for();assert page.get_by_label('线路详情',exact=True).inner_text().startswith('Test 599');page.get_by_label('关闭线路详情',exact=True).click()
 # Pointer and keyboard splitter persist actual preferences and reset separately.
 left=page.get_by_role('separator',name='调整项目栏宽度');box=left.bounding_box();page.mouse.move(box['x']+3,100);page.mouse.down();page.mouse.move(box['x']+73,100,steps=8);page.mouse.up();page.wait_for_timeout(100)
 pref=page.evaluate("JSON.parse(localStorage.getItem('linggo.layout.v1'))");assert pref['leftWidth']>=320,pref
 left.focus();left.press('ArrowLeft');left.press('Home');assert page.evaluate("JSON.parse(localStorage.getItem('linggo.layout.v1')).leftWidth")==264
 chat=page.get_by_role('separator',name='调整对话栏宽度');chat.focus();chat.press('ArrowLeft');assert page.evaluate("JSON.parse(localStorage.getItem('linggo.layout.v1')).chatWidth")==430
 page.reload();page.get_by_label('地图底图',exact=True).wait_for();assert page.evaluate("JSON.parse(localStorage.getItem('linggo.layout.v1')).chatWidth")==430
 page.get_by_label('最大化 / 还原地图',exact=True).click();page.wait_for_timeout(150);assert page.locator('.linggo-mapwrap').bounding_box()['width']>1850;page.screenshot(path=str(out/'map-max.png'));page.get_by_label('最大化 / 还原地图',exact=True).click()
 page.get_by_label('折叠 / 展开项目栏',exact=True).click();page.wait_for_timeout(100);assert page.locator('.linggo-workspace > aside').bounding_box()['width']==48;page.get_by_label('折叠 / 展开项目栏',exact=True).click()
 page.get_by_label('折叠 / 展开对话栏',exact=True).click();page.wait_for_timeout(100);assert page.locator('.linggo-chat-rail').is_visible();page.locator('.linggo-chat-rail button').click()
 for width in [1920,1440,1024,800]:
  page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(200)
  if width<900:page.get_by_role('button',name='地图',exact=True).first.click()
  assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'),width
  bounds=page.locator('.linggo-mapwrap').bounding_box();assert bounds['height']>500,(width,bounds);assert bounds['width']>=(400 if width>=900 else width-4),(width,bounds)
  page.screenshot(path=str(out/f'canvas-{width}.png'))
 page.set_viewport_size({'width':1920,'height':1000});page.get_by_label('重置布局',exact=True).click();page.wait_for_timeout(200)
 # Browser zoom equivalent: scaled viewport/device scale verifies CSS responsive geometry.
 page.evaluate("document.body.style.zoom='125%'");page.wait_for_timeout(200);assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth');page.evaluate("document.body.style.zoom=''")
 if a.real_maps:
  page.get_by_label('地图底图',exact=True).select_option('amap');page.wait_for_timeout(18000)
  assert not page.locator('.linggo-sdk-error').count(),'AMap external SDK failed; inspect network/key without logging the key'
  count=page.evaluate("window.__testMaps.filter(x=>x.name==='AMap').at(-1).map.getAllOverlays('polyline').length");assert count==600,count
  page.screenshot(path=str(out/'amap-600.png'))
  # Direct SDK overlay click (not the side list) and resizing without refitting the city.
  state=page.evaluate("(()=>{const m=window.__testMaps.filter(x=>x.name==='AMap').at(-1).map;return {center:[m.getCenter().lng,m.getCenter().lat],zoom:m.getZoom()}})()")
  page.get_by_label('折叠 / 展开项目栏',exact=True).click();page.wait_for_timeout(300)
  after=page.evaluate("(()=>{const m=window.__testMaps.filter(x=>x.name==='AMap').at(-1).map;return {center:[m.getCenter().lng,m.getCenter().lat],zoom:m.getZoom()}})()")
  assert abs(after['zoom']-state['zoom'])<.01,(state,after)
  page.get_by_label('折叠 / 展开项目栏',exact=True).click();page.wait_for_timeout(300)
  page.evaluate("()=>{window.__testMaps.filter(x=>x.name==='AMap').at(-1).map.getAllOverlays('polyline').at(-1).emit('click', {})}")
  page.get_by_label('线路详情',exact=True).wait_for();page.get_by_label('关闭线路详情',exact=True).click()
  page.get_by_role('button',name='全部隐藏',exact=True).click();page.wait_for_timeout(400);assert page.evaluate("window.__testMaps.filter(x=>x.name==='AMap').at(-1).map.getAllOverlays('polyline').length")==0
  page.get_by_label('搜索线路、起点或终点',exact=True).fill('Test 599');page.get_by_role('button',name='Test 599',exact=False).click();page.wait_for_timeout(400);count=page.evaluate("window.__testMaps.filter(x=>x.name==='AMap').at(-1).map.getAllOverlays('polyline').length");assert count==1,(count,page.locator('.linggo-route-row input:checked').count())
  page.get_by_role('button',name='Stop 599-0',exact=True).click();page.get_by_label('站点详情',exact=True).wait_for();page.screenshot(path=str(out/'amap-detail.png'))
  page.get_by_label('关闭站点详情',exact=True).click();page.get_by_label('关闭线路详情',exact=True).click();page.get_by_label('搜索线路、起点或终点',exact=True).fill('');page.get_by_role('button',name='全部显示',exact=True).click();page.get_by_label('全网视野',exact=True).click()
  s=rpc('settings');
  if s.get('baiduAK'):
   page.get_by_label('地图底图',exact=True).select_option('baidu');page.wait_for_timeout(18000);assert not page.locator('.linggo-sdk-error').count(),'Baidu external SDK failed';page.screenshot(path=str(out/'baidu-600.png'))
  else:print('Baidu live SDK: pending local AK; canvas fallback verified separately')
 # Missing credential and SDK failure must keep preference and remain recoverable.
 page.get_by_label('地图底图',exact=True).select_option('baidu');page.wait_for_timeout(500)
 if not rpc('settings').get('baiduAK'):
  page.locator('.linggo-sdk-error').wait_for();assert page.evaluate("JSON.parse(localStorage.getItem('linggo.map.provider'))")=='baidu'
  page.get_by_label('地图底图',exact=True).select_option('canvas');page.wait_for_timeout(200);assert page.locator('.linggo-sdk-error').count()==0
 # Existing algorithm result still opens in the new bottom replay bar.
 run_input={'projectId':project['id'],'algorithmId':'drt_insertion','params':{'demand_source':'synthetic','synthetic_requests':12,'fleet_size':3}}
 preview=rpc('previewRun',run_input);assert preview['previewToken']
 job=rpc('startRun',{**run_input,'previewToken':preview['previewToken']})
 for i in range(100):
  status=next(j for j in rpc('jobs',{'projectId':project['id']}) if j['id']==job['id'])
  if status['status']!='running':break
  time.sleep(.1)
 assert status['status']=='done',status
 page.get_by_role('button',name='分析',exact=True).click();page.locator('.linggo-analysis > section').last.locator('tbody tr').first.click();page.get_by_role('button',name='在地图上回放',exact=True).first.click();page.locator('.linggo-replay-bar').wait_for();slider=page.get_by_label('回放时间',exact=True);slider.wait_for()
 slider.press('End');page.screenshot(path=str(out/'replay.png'));page.get_by_role('button',name='关闭结果图层',exact=True).click();page.locator('.linggo-replay-bar').wait_for(state='detached')
 assert not errors,errors
 print('Workbench: 600 real layers/list rows, search, details, visibility, resize, persistence, maximize, responsive widths and fallback passed')
 browser.close()
