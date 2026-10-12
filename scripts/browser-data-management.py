"""Data management + native batch import UI regression, isolated profiles only."""
import argparse, json, re, time
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
p=argparse.ArgumentParser();p.add_argument('log');p.add_argument('home');p.add_argument('--shots',required=True);a=p.parse_args()
home=Path(a.home).resolve();assert home != Path.home()/'.dsh'
url=re.findall(r'http://127\.0\.0\.1:\d+/\?token=[^\s"\']+',Path(a.log).read_text())[-1];origin='http://'+urlsplit(url).netloc
out=Path(a.shots);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='msedge',headless=True);context=browser.new_context(viewport={'width':1920,'height':1080},locale='zh-CN');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("localStorage.setItem('linggo.map.provider', JSON.stringify('canvas'))")
 page.goto(url+'#linggo=1');page.locator('.linggo-workspace').wait_for(timeout=30000);page.wait_for_timeout(1200)
 if page.get_by_role('heading',name='预览版说明',exact=True).count():page.get_by_role('button',name='继续',exact=True).click()
 def rpc(op,payload={}):
  result=context.request.post(origin+'/api/linggo.'+op,data={'type':'client-request','rpcId':'manage-test','method':'linggo.'+op,'payload':payload}).json()['result'];assert result['ok'],result.get('error');return result['value']
 name='数据管理测试 '+str(time.time_ns());page.get_by_title('新建项目',exact=True).first.click();page.get_by_placeholder('新项目名称（城市或区域）').fill(name);page.get_by_role('button',name='创建项目',exact=True).click();expect(page.get_by_label('当前项目').locator('option:checked')).to_have_text(name)
 state=rpc('state');project=next(p for p in state['projects'] if p['name']==name);pid=project['id']
 source=home/'batch-native';source.mkdir(exist_ok=True)
 (source/'stops.csv').write_text('stop_id,stop_name,lon,lat\ns1,示例一,121.3,31.1\ns2,示例二,121.4,31.2\n')
 (source/'routes.csv').write_text('route_id,route_name,direction\nr1,示例线路,0\n')
 (source/'rs.csv').write_text('route_id,route_name,direction,seq,stop_id\nr1,示例线路,0,1,s1\nr1,示例线路,0,2,s2\n')
 page.locator('[data-section=sessions]').get_by_role('button',name='新建展示会话',exact=True).click();box=page.locator('[role=textbox][contenteditable=true]').filter(visible=True).first;box.wait_for(timeout=15000);page.wait_for_function("!document.documentElement.hasAttribute('data-linggo-blocked')")
 box.fill(f'LINGGO_BATCH_IMPORT 导入 {source} 坐标系 WGS84');box.press('Enter');page.get_by_text('批量导入已完成。',exact=False).filter(visible=True).first.wait_for(timeout=45000)
 for tool in ['linggo_prepare_import','linggo_commit_import','linggo_import_status']:assert page.get_by_text(tool,exact=False).count(),tool
 page.locator('.linggo-mapwrap').wait_for(timeout=12000);expect(page.locator('[data-section=data]')).to_contain_text('线路');state=rpc('state');assert len([v for v in state['dataVersions'] if v['projectId']==pid])==1
 # Manual import still available and produces its own snapshot, preserving batch entities.
 page.locator('[data-section=data]').get_by_role('button',name='导入数据…',exact=True).click();(source/'vehicles.csv').write_text('vehicle_id,capacity\nv1,8\n')
 page.get_by_label('文件路径',exact=True).fill(str(source/'vehicles.csv'));page.get_by_role('button',name='检查数据',exact=True).click();page.get_by_role('button',name='预览映射结果',exact=True).click();page.get_by_role('button',name='确认导入',exact=True).click()
 for _ in range(60):
  state=rpc('state');versions=[v for v in state['dataVersions'] if v['projectId']==pid]
  if len(versions)==2:break
  time.sleep(.2)
 assert len(versions)==2
 page.get_by_role('button',name='管理数据集',exact=True).click();dialog=page.get_by_role('dialog',name='管理数据集');dialog.get_by_role('button',name='清空全部…',exact=True).click();confirm=page.get_by_role('dialog',name='确认删除数据集');expect(confirm).to_contain_text('不删除原始文件');confirm.get_by_role('button',name='取消',exact=True).last.click();assert len([v for v in rpc('state')['dataVersions'] if v['projectId']==pid])==2
 dialog=page.get_by_role('dialog',name='管理数据集');dialog.get_by_role('button',name='撤销最近导入…',exact=True).click();page.get_by_role('dialog',name='确认删除数据集').get_by_role('button',name='确认删除',exact=True).click();page.get_by_role('dialog').wait_for(state='hidden');assert len([v for v in rpc('state')['dataVersions'] if v['projectId']==pid])==1
 for width in [1920,1440,1024,800]:
  page.set_viewport_size({'width':width,'height':1080})
  if width==1024:page.get_by_label('折叠 / 展开对话栏',exact=True).click()
  if width==800:page.get_by_role('button',name='项目',exact=True).click()
  page.get_by_role('button',name='管理数据集',exact=True).click();page.get_by_role('dialog',name='管理数据集').get_by_role('button',name='清空全部…',exact=True).click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/f'delete-confirm-{width}.png'));page.keyboard.press('Escape');page.keyboard.press('Escape')
 page.set_viewport_size({'width':1440,'height':1080});page.get_by_role('button',name='清理任务展示',exact=True).click();dialog=page.get_by_role('dialog',name='清理任务展示');dialog.get_by_role('button',name='选择已完成',exact=True).click();dialog.get_by_role('button',name='清理所选展示',exact=True).click();expect(dialog).to_contain_text('暂无任务');assert len(rpc('jobs',{'projectId':pid}))==0;assert len(rpc('jobs',{'projectId':pid,'includeHidden':True}))==2
 dialog.get_by_role('button',name='已隐藏任务',exact=True).click();dialog.get_by_role('button',name='选择已完成',exact=True).click();dialog.get_by_role('button',name='恢复所选展示',exact=True).click();page.screenshot(path=str(out/'tasks-restored.png'));page.keyboard.press('Escape');assert len(rpc('jobs',{'projectId':pid}))==2
 page.get_by_role('button',name='管理数据集',exact=True).click();page.get_by_role('dialog',name='管理数据集').get_by_role('button',name='清空全部…',exact=True).click();page.get_by_role('dialog',name='确认删除数据集').get_by_role('button',name='确认删除',exact=True).click();page.get_by_role('dialog').wait_for(state='hidden');expect(page.locator('[data-section=data]')).to_contain_text('尚未导入数据集');assert (source/'stops.csv').exists();page.screenshot(path=str(out/'empty-after-clear.png'));assert not errors,errors;browser.close()
print('Data management verified: native prepare/commit/status, atomic batch/map refresh, manual import, cancel confirmation, undo, terminal hide/restore, four viewports, clear empty state, original files preserved')
