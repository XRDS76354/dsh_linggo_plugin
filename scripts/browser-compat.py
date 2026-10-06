"""Browser regression for an isolated official DSH Host and the local test provider.

Usage: python scripts/browser-compat.py <host-log> <DSH_HOME> --legacy --shots <directory>
Requires Playwright + Edge. Never prints authentication URLs; never uses the user's profile.
"""
import argparse
import json
import re
import traceback
import time
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

p = argparse.ArgumentParser()
p.add_argument("log")
p.add_argument("home")
p.add_argument("--legacy", action="store_true")
p.add_argument("--shots", required=True)
args = p.parse_args()


def run():
    urls = re.findall(r"http://127\.0\.0\.1:\d+/\?token=[^\s\"']+", Path(args.log).read_text())
    assert urls, "Host did not publish its authenticated launch URL"
    url = urls[-1]
    origin = "http://" + urlsplit(url).netloc
    Path(args.shots).mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, locale="zh-CN")
        context.grant_permissions(["clipboard-read", "clipboard-write"], origin=origin)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url + "#linggo=1")
        page.locator(".linggo-workspace").wait_for(timeout=30000)
        page.get_by_title("新建项目", exact=True).first.wait_for()
        page.wait_for_timeout(1500)
        # A clean browser must acknowledge DSH's own preview notice before editing any form.
        notice = page.get_by_role("heading", name="预览版说明", exact=True)
        if notice.count():
            page.get_by_role("button", name="继续", exact=True).click()
            notice.wait_for(state="hidden")
        name = "Compatibility fixture " + str(time.time_ns())
        page.get_by_title("新建项目", exact=True).first.click()
        page.get_by_placeholder("新项目名称（城市或区域）").fill(name)
        page.get_by_role("button", name="创建项目", exact=True).click()
        expect(page.get_by_label("当前项目").locator("option:checked")).to_have_text(name)
        page.get_by_role("button", name="+ 新建展示会话", exact=True).first.click()
        box = page.locator('[role=textbox][contenteditable=true]').filter(visible=True).first
        box.wait_for(timeout=15000)
        page.wait_for_function("!document.documentElement.hasAttribute('data-linggo-blocked')")
        assert box.bounding_box()["x"] > 800, "Native chat not in the right column"
        box.fill("LINGGO_COMPAT_STATUS")
        box.press("Enter")
        page.get_by_text("已完成公交状态查询。", exact=False).filter(visible=True).first.wait_for(timeout=30000)
        assert page.get_by_text("linggo_status", exact=False).count(), "Native tool record was not rendered"
        page.screenshot(path=str(Path(args.shots, "wide.png")))

        box.fill("LINGGO_COMPAT_CANCEL")
        box.press("Enter")
        page.get_by_role("button", name=re.compile("停止|Stop")).filter(visible=True).first.wait_for(timeout=15000)
        # Native conversation stays mounted while presentation geometry changes.
        box.fill("LAYOUT_RETAINED_DRAFT")
        page.get_by_label("最大化 / 还原地图", exact=True).click()
        assert not box.is_visible()
        page.get_by_label("最大化 / 还原地图", exact=True).click()
        assert box.inner_text() == "LAYOUT_RETAINED_DRAFT"
        page.get_by_label("最大化 / 还原对话", exact=True).click()
        page.wait_for_function("document.documentElement.style.getPropertyValue('--linggo-width') === '0px'")
        assert page.locator("div:has(> [data-rightbar-col])").bounding_box()["width"] == 1440
        page.set_viewport_size({"width":800,"height":900})
        page.get_by_role("button",name="对话",exact=True).click()
        assert box.is_visible()
        page.set_viewport_size({"width":1440,"height":900})
        page.get_by_label("最大化 / 还原对话", exact=True).click()
        assert box.inner_text() == "LAYOUT_RETAINED_DRAFT"
        page.get_by_label("折叠 / 展开对话栏",exact=True).click()
        assert not box.is_visible()
        page.locator(".linggo-chat-rail button").click()
        assert box.inner_text() == "LAYOUT_RETAINED_DRAFT"
        page.screenshot(path=str(Path(args.shots, "layout-generating.png")))
        box.press("Meta+A")
        box.press("Backspace")
        page.get_by_role("button", name=re.compile("停止|Stop")).filter(visible=True).first.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=str(Path(args.shots, "cancel-state.png")))
        page.get_by_text("已停止", exact=True).filter(visible=True).first.wait_for(timeout=15000)
        expect(page.locator('.linggo-list li[aria-current="true"]')).not_to_contain_text("运行中", timeout=15000)

        page.set_viewport_size({"width": 800, "height": 900})
        page.get_by_role("button", name="对话", exact=True).click()
        assert box.is_visible()
        page.get_by_role("button", name="地图", exact=True).first.click()
        assert page.locator(".linggo-workspace").is_visible()
        page.screenshot(path=str(Path(args.shots, "narrow.png")))
        page.set_viewport_size({"width": 1440, "height": 900})
        page.get_by_role("button", name="↗ 交接给开发工作台", exact=True).click()
        page.get_by_placeholder("说明需要在开发会话中实现或修改的功能").fill("COMPAT_HANDOFF_REVIEW")
        page.get_by_role("button", name="预览交接", exact=True).click()
        page.get_by_role("button", name="确认保存交接", exact=True).click()
        page.get_by_text("交接已保存。", exact=False).wait_for()

        # Two independent pages; the presentation remains open while the development page navigates.
        dev = context.new_page()
        dev.on("pageerror", lambda error: errors.append(str(error)))
        dev.goto(origin + "/")
        dev.get_by_role("button", name="公交工作台", exact=True).first.click()
        dev.get_by_role("heading", name="LingGo 公交工作台", exact=True).wait_for()
        assert not dev.evaluate("document.documentElement.hasAttribute('data-linggo')")
        card = dev.locator("article.linggo-card").filter(has_text=name).filter(has_text="COMPAT_HANDOFF_REVIEW")
        if args.legacy:
            card.get_by_text("当前 DSH 不支持安全预填草稿。", exact=False).wait_for()
            card.get_by_role("button", name="复制交接内容", exact=True).click()
            copied = dev.evaluate("navigator.clipboard.readText()")
            assert "COMPAT_HANDOFF_REVIEW" in copied
            card.get_by_role("button", name="打开开发会话", exact=True).click()
            draft = dev.locator('[role=textbox][contenteditable=true]').filter(visible=True).first
            draft.wait_for()
            assert "COMPAT_HANDOFF_REVIEW" not in draft.inner_text(), "Legacy fallback mutated the composer"
            draft.fill(copied)
        else:
            card.get_by_role("button", name="打开开发会话并填入草稿", exact=True).click()
            draft = dev.locator('[role=textbox][contenteditable=true]').filter(visible=True).first
            draft.wait_for()
            assert "COMPAT_HANDOFF_REVIEW" in draft.inner_text()
        assert not dev.get_by_role("button", name=re.compile("停止|Stop")).filter(visible=True).count(), "Handoff was automatically sent"
        draft.fill("EXISTING_UNSENT_DRAFT")
        state = json.loads(Path(args.home, "linggo/state.json").read_text())
        item = next(h for h in state["handoffs"] if h["summary"] == "COMPAT_HANDOFF_REVIEW" and any(p["id"] == h["projectId"] and p["name"] == name for p in state["projects"]))
        assert item["devSessionId"] and item["openedAt"]
        dev.get_by_role("button", name="公交工作台", exact=True).first.click()
        dev.locator("article.linggo-card").filter(has_text=name).filter(has_text="COMPAT_HANDOFF_REVIEW").get_by_role("button", name="回到开发会话", exact=True).click()
        draft.wait_for()
        assert draft.inner_text() == "EXISTING_UNSENT_DRAFT"
        dev.screenshot(path=str(Path(args.shots, "development.png")))
        assert not errors, errors
        browser.close()
    print("Browser passed: independent pages, wide/narrow layout, native stream/tool/cancel, handoff, draft preservation")


try:
    run()
except Exception:
    print(re.sub(r"([?&]token=)[^\s\"']+", r"\1<redacted>", traceback.format_exc()))
    raise SystemExit(1)
