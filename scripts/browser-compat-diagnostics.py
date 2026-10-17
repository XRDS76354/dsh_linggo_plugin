"""Compatibility UI failure/recovery checks against an isolated Host only."""
import argparse,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('log');p.add_argument('home');p.add_argument('--shots',required=True);a=p.parse_args()
assert Path(a.home).resolve() != Path.home()/'.dsh'
url=re.findall(r'http://127\.0\.0\.1:\d+/\?token=[^\s"\']+',Path(a.log).read_text())[-1]
out=Path(a.shots);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='msedge',headless=True);context=browser.new_context(locale='zh-CN',viewport={'width':1440,'height':900});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(url+'#linggo=1');page.locator('.linggo-workspace').wait_for(timeout=30000)
 assert page.locator('[data-linggo-frame]').count()==1
 # A client connected to an old Host must leave the native page intact.
 page.route('**/api/linggo.compatibility',lambda r:r.fulfill(status=404,body='Not found'))
 page.reload();page.get_by_text('当前后台尚未加载兼容诊断接口',exact=False).wait_for();assert not page.evaluate("document.documentElement.hasAttribute('data-linggo')")
 page.screenshot(path=str(out/'old-host.png'));page.unroute('**/api/linggo.compatibility');page.get_by_role('button',name='重新检查',exact=True).click();page.locator('.linggo-workspace').wait_for()
 def mismatch(route):
  response=route.fetch();data=response.json();data['result']['value']['protocol']=999;route.fulfill(response=response,json=data)
 page.route('**/api/linggo.compatibility',mismatch);page.reload();page.get_by_text('前后端接口协议不匹配',exact=False).wait_for();assert not page.evaluate("document.documentElement.hasAttribute('data-linggo')");page.screenshot(path=str(out/'protocol-mismatch.png'))
 page.unroute('**/api/linggo.compatibility');page.get_by_role('button',name='重新检查',exact=True).click();page.locator('.linggo-workspace').wait_for()
 page.evaluate("window.__testRightbar=document.querySelector('[data-rightbar-col]');window.__testRightbar.removeAttribute('data-rightbar-col')")
 page.get_by_text('未识别到经过验证的 DSH 三栏结构',exact=False).wait_for();assert not page.evaluate("document.documentElement.hasAttribute('data-linggo')");page.screenshot(path=str(out/'layout-released.png'))
 page.evaluate("window.__testRightbar.setAttribute('data-rightbar-col','')");page.locator('.linggo-workspace').wait_for()
 assert not errors,errors;browser.close()
print('Compatibility UI passed: valid frame, old Host, protocol mismatch, frame drift, explicit recovery')
