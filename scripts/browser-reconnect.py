"""Keep an isolated test browser open across an externally controlled Host restart.

Usage: python scripts/browser-reconnect.py <host-log> <marker-path>
Wait for <marker-path>.ready, restart that test Host, then create <marker-path>.resume.
No user profile or credentials are used; the authenticated URL is never printed.
"""
import argparse
import re
import time
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

p = argparse.ArgumentParser()
p.add_argument("log")
p.add_argument("marker")
args = p.parse_args()


def run():
    url = re.findall(r"http://127\.0\.0\.1:\d+/\?token=[^\s\"']+", Path(args.log).read_text())[-1]
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(locale="zh-CN")
        page.goto(url + "#linggo=1")
        page.locator(".linggo-workspace").wait_for()
        page.get_by_label("当前项目").wait_for()
        page.wait_for_timeout(1500)
        if page.get_by_role("heading", name="预览版说明", exact=True).count():
            page.get_by_role("button", name="继续", exact=True).click()
        original = page.get_by_label("当前项目").input_value()
        Path(args.marker + ".ready").write_text("ready")
        for _ in range(60):
            if Path(args.marker + ".resume").exists():
                break
            page.wait_for_timeout(750)
        else:
            raise AssertionError("Host restart was not signalled")
        # These requests traverse the restored Connection; no page reload or new auth URL.
        name = "Reconnect fixture " + str(time.time_ns())
        page.get_by_placeholder("新项目名称（城市或区域）").fill(name)
        page.get_by_role("button", name="创建项目", exact=True).click()
        expect(page.get_by_label("当前项目").locator("option:checked")).to_have_text(name, timeout=20000)
        assert page.get_by_label("当前项目").input_value() != original
        assert not page.locator(".linggo-error").filter(visible=True).count()
        browser.close()
    print("Reconnect passed: same browser recovered and created a project without reloading")


try:
    run()
except Exception:
    print(re.sub(r"([?&]token=)[^\s\"']+", r"\1<redacted>", traceback.format_exc()))
    raise SystemExit(1)
