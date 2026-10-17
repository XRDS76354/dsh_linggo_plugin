"""Isolated profile HMR disable/re-enable regression; never use a personal profile."""
import argparse,json,re,time
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('log');parser.add_argument('home');parser.add_argument('--profile',default='qa');parser.add_argument('--shots',required=True);args=parser.parse_args()
home=Path(args.home).resolve();assert '.dsh' not in home.parts, 'Use an isolated test home'
assert '/' not in args.profile and '\\' not in args.profile
out=Path(args.shots);out.mkdir(parents=True,exist_ok=True);patch=home/'profiles'/args.profile/'cordis.patch.yml';original=patch.read_text();url=re.findall(r'http://127\.0\.0\.1:\d+/\?token=[^\s"\']+',Path(args.log).read_text())[-1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='msedge',headless=True);context=browser.new_context(locale='zh-CN',viewport={'width':1440,'height':900});page=context.new_page();page.goto(url+'#linggo=1');page.locator('.linggo-workspace').wait_for();previous=page.locator('[data-conversation-content]').get_attribute('data-conversation-session');page.locator('[data-section=sessions]').get_by_role('button',name='新建展示会话',exact=True).click();page.wait_for_function('(old)=>{const e=document.querySelector("[data-conversation-content]");return e?.getAttribute("data-conversation-session")&&e.getAttribute("data-conversation-session")!==old}',arg=previous);box=page.locator('[role=textbox][contenteditable=true]').filter(visible=True).first;box.wait_for();box.fill('HMR_UNSENT_DRAFT');expect(box).to_have_text('HMR_UNSENT_DRAFT');page.wait_for_timeout(500)
 origin='http://'+urlsplit(url).netloc
 def endpoint():
  return context.request.post(origin+'/api/linggo.compatibility',data={'type':'client-request','rpcId':'hmr-check','method':'linggo.compatibility','payload':{}})
 try:
  patch.write_text(original+'\n- id: linggo\n  disabled: true\n')
  page.locator('.linggo-workspace').wait_for(state='detached',timeout=45000)
  assert not page.evaluate("document.documentElement.hasAttribute('data-linggo')")
  assert endpoint().status==404, 'Host API survived disabled plugin'
  expect(box).to_have_text('HMR_UNSENT_DRAFT');page.screenshot(path=str(out/'hmr-disabled.png'))
  patch.write_text(original)
  page.locator('.linggo-workspace').wait_for(timeout=45000);page.wait_for_timeout(800)
  expect(box).to_have_text('HMR_UNSENT_DRAFT');assert page.locator('[data-linggo-frame]').count()==1
  assert endpoint().status==200
  assert page.locator('[role=textbox][contenteditable=true]').filter(visible=True).count()==1
  page.screenshot(path=str(out/'hmr-restored.png'));print('HMR passed: disable releases native layout, re-enable remounts once, unsent native draft retained',flush=True)
 finally:patch.write_text(original);browser.close()
