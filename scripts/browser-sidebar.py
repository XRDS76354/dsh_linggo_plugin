"""Sidebar IA regression against an isolated official DSH profile.

Creates synthetic projects/datasets/sessions only. Jobs are intercepted at the
browser's LingGo RPC boundary to exercise deterministic async attention events.
Never use a user's profile; launch URLs and credentials are never printed.
"""
import argparse
import json
import re
import time
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument("log")
parser.add_argument("home")
parser.add_argument("--shots", required=True)
args = parser.parse_args()


def run():
    home = Path(args.home).resolve()
    assert home != Path.home() / ".dsh", "Use an isolated test home"
    urls = re.findall(r"http://127\.0\.0\.1:\d+/\?token=[^\s\"']+", Path(args.log).read_text())
    assert urls, "Isolated Host did not publish an authenticated launch URL"
    url = urls[-1]
    origin = "http://" + urlsplit(url).netloc
    shots = Path(args.shots)
    shots.mkdir(parents=True, exist_ok=True)
    metrics = {}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, locale="zh-CN")
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.add_init_script("""localStorage.setItem('linggo.map.provider', JSON.stringify('canvas'));""")

        def dismiss_notices():
            for _ in range(5):
                buttons = page.get_by_role("button", name=re.compile(r"^(继续|稍后配置|Skip for now|Later)$")).filter(visible=True)
                if not buttons.count():
                    break
                buttons.first.click()
                page.wait_for_timeout(150)

        def reload_page():
            page.reload()
            page.locator('[data-section="sessions"]').wait_for()
            dismiss_notices()

        def rpc(method, payload=None):
            response = context.request.post(origin + "/api/linggo." + method, data={
                "type": "client-request", "rpcId": "sidebar-fixture", "method": "linggo." + method,
                "payload": payload or {},
            }).json()["result"]
            assert response["ok"], response.get("error", {}).get("message")
            return response["value"]

        def section(identity):
            return page.locator('[data-section="' + identity + '"]')

        def heading(identity):
            return section(identity).locator(".linggo-section-heading")

        def expanded(identity, value):
            expect(heading(identity)).to_have_attribute("aria-expanded", str(value).lower())
            body = page.locator("#linggo-section-" + identity + "-body")
            expect(body).to_be_visible() if value else expect(body).to_be_hidden()

        def set_open(identity, value):
            if heading(identity).get_attribute("aria-expanded") != str(value).lower():
                heading(identity).click()
            expanded(identity, value)

        def screenshot(name):
            page.mouse.move(1000, 850)
            page.locator("button:focus").evaluate_all("nodes => nodes.forEach(node => node.blur())")
            page.screenshot(path=str(shots / (name + ".png")))
            page.locator(".linggo-workspace > aside").screenshot(path=str(shots / (name + "-left.png")))

        page.goto(url + "#linggo=1")
        page.locator(".linggo-workspace").wait_for()
        dismiss_notices()
        project = rpc("createProject", {"name": "左栏验收 · 生成数据 " + str(time.time_ns())[-6:]})
        other = rpc("createProject", {"name": "独立空项目 · 生成数据"})
        fixture_dir = home / "sidebar-fixtures"
        fixture_dir.mkdir(exist_ok=True)
        # Each import is a real selectable dataset; the first is stops-only.
        for index in range(7):
            entity = "stops" if index == 0 else "route_stops"
            fixture = fixture_dir / ("dataset-%02d.csv" % index)
            if entity == "stops":
                rows = ["stop_id,stop_name,lon,lat", "S0,生成站点 0,121.0,31.0"]
            else:
                rows = ["route_id,route_name,direction,seq,stop_id,stop_name,lon,lat"]
                for station in range(3):
                    rows.append(f"R{index},生成线路 {index},out,{station + 1},S{index}-{station},生成站点 {index}-{station},{121 + index * .005 + station * .001},{31 + index * .004 + station * .001}")
            fixture.write_text("\n".join(rows))
            source = {"type": "file", "path": str(fixture)}
            info = rpc("inspect", {"projectId": project["id"], "source": source})
            mapping = {"entity": entity, "crs": "WGS84", "mode": "append", "fields": info["tables"][0]["suggestions"][entity]}
            preview = rpc("preview", {"projectId": project["id"], "source": source, "mapping": mapping})
            job = rpc("startImport", {"projectId": project["id"], "source": source, "mapping": mapping, "previewToken": preview["previewToken"]})
            for _ in range(120):
                finished = next(j for j in rpc("jobs", {"projectId": project["id"]}) if j["id"] == job["id"])
                if finished["status"] != "running":
                    break
                time.sleep(.1)
            assert finished["status"] == "done", finished.get("error")

        def job_fixture(identity, status="done", owner=None, ordinal=0):
            created = (datetime.now(timezone.utc) + timedelta(seconds=ordinal)).isoformat()
            return {"id": identity, "projectId": owner or project["id"], "kind": "import",
                    "title": "生成任务 " + identity, "status": status, "progress": .35 if status == "running" else 1,
                    "message": "正在检查生成数据", "createdAt": created,
                    "finishedAt": None if status in ("running", "queued") else created,
                    "error": "生成测试错误：缺少必需字段" if status == "failed" else None}

        histories = [job_fixture("history-" + str(i), ordinal=i) for i in range(8)]
        jobs_by_project = {project["id"]: histories, other["id"]: []}
        held = []
        hold_next = {"project": None}

        def fulfill_jobs(route):
            request = route.request.post_data_json
            owner = request["payload"]["projectId"]
            route.fulfill(json={"type": "server-response", "rpcId": request["rpcId"],
                                "result": {"ok": True, "value": jobs_by_project.get(owner, [])}})

        def intercept_jobs(route):
            if route.request.post_data_json["payload"]["projectId"] == hold_next["project"]:
                hold_next["project"] = None
                held.append(route)
            else:
                fulfill_jobs(route)

        page.route("**/api/linggo.jobs", intercept_jobs)
        page.evaluate("""id => {localStorage.setItem('linggo.project', id);for (const key of Object.keys(localStorage)) if(key.startsWith('linggo.section.')) localStorage.removeItem(key)}""", project["id"])
        reload_page()
        page.get_by_label("当前项目", exact=True).select_option(project["id"])
        for _ in range(10):
            section("sessions").get_by_role("button", name="新建展示会话", exact=True).click()
            expect(section("sessions").get_by_role("button", name="新建展示会话", exact=True)).to_be_enabled()
            box = page.locator('[role=textbox][contenteditable=true]').filter(visible=True).first
            box.wait_for()
            box.fill("LINGGO_COMPAT_STATUS")
            box.press("Enter")
            page.get_by_text("已完成公交状态查询。", exact=False).filter(visible=True).first.wait_for(timeout=30000)
        expanded("sessions", True)
        expanded("data", False)
        expanded("jobs", False)
        assert section("data").locator(".linggo-section-summary").is_visible()
        assert "站点" in section("data").inner_text()
        expect(section("data").locator(".linggo-section-summary")).to_have_css("white-space", "nowrap")
        assert page.locator(".linggo-workspace > aside .primary").count() == 0
        assert page.locator(".linggo-section .linggo-section").count() == 0
        assert "历史版本" not in page.locator(".linggo-workspace > aside").inner_text()
        assert "任务历史" not in page.locator(".linggo-workspace > aside").inner_text()
        for identity in ("sessions", "data", "jobs"):
            title = section(identity).locator(".linggo-section-title")
            expect(title).to_have_css("font-size", "14px")
            expect(title).to_have_css("font-weight", "500")
            assert title.evaluate("e => getComputedStyle(e).color === getComputedStyle(e.closest('.linggo-root')).color")
            assert section(identity).locator(".linggo-section-header").bounding_box()["height"] == 36
            expect(heading(identity)).to_have_attribute("aria-controls", "linggo-section-" + identity + "-body")
        for label in ("新建展示会话", "搜索会话", "导入数据…"):
            bounds = page.locator(".linggo-section-actions").get_by_role("button", name=label, exact=True).bounding_box()
            assert bounds["width"] == bounds["height"] == 28, (label, bounds)
        rows = section("sessions").locator(".linggo-sidebar-list > li")
        assert 5 <= rows.count() < 10
        assert all(32 <= row.bounding_box()["height"] <= 34 for row in rows.all())
        metrics["initialSessionRows"] = rows.count()
        screenshot("01-default")
        arrow = section("sessions").locator(".linggo-chevron")
        expect(arrow).to_have_css("opacity", "0")
        heading("sessions").hover()
        expect(arrow).to_have_css("opacity", "1")
        page.locator(".linggo-workspace > aside").screenshot(path=str(shots / "02-hover-left.png"))
        heading("sessions").focus()
        heading("sessions").press("Space")
        expanded("sessions", False)
        assert page.evaluate("JSON.parse(localStorage.getItem('linggo.section.sessions'))") is False
        heading("sessions").press("Enter")
        expanded("sessions", True)
        section("sessions").get_by_role("button", name=re.compile("显示更多")).click()
        expect(rows).to_have_count(10)
        screenshot("02-more-sessions")
        section("sessions").get_by_role("button", name="搜索会话", exact=True).click()
        search = section("sessions").get_by_role("textbox", name="搜索会话", exact=True)
        search.fill("NO_MATCH_SIDEBAR_FIXTURE")
        expect(rows).to_have_count(0)
        search.fill("")
        section("sessions").get_by_role("button", name="搜索会话", exact=True).click()
        set_open("sessions", False)
        section("sessions").get_by_role("button", name="搜索会话", exact=True).click()
        expanded("sessions", True)
        expect(search).to_be_focused()
        search.fill("NO_MATCH_SIDEBAR_FIXTURE")
        section("sessions").get_by_role("button", name="搜索会话", exact=True).click()
        assert rows.count() >= 5
        set_open("sessions", False)
        section("sessions").get_by_role("button", name="新建展示会话", exact=True).click()
        expanded("sessions", True)
        section("data").get_by_role("button", name="导入数据…", exact=True).click()
        expanded("data", False)
        page.get_by_role("textbox", name="文件路径", exact=True).fill(str(fixture_dir / "dataset-00.csv"))
        page.get_by_role("button", name="检查数据", exact=True).click()
        page.get_by_role("heading", name="2. 字段映射", exact=True).wait_for()
        expect(page.get_by_role("combobox", name="目标数据", exact=True)).to_have_value("stops")
        page.get_by_role("button", name="地图", exact=True).first.click()
        set_open("sessions", True)
        set_open("data", True)
        dataset_rows = section("data").locator(".linggo-sidebar-list > li")
        assert 5 <= dataset_rows.count() < 7
        metrics["initialDatasetRows"] = dataset_rows.count()
        section("data").get_by_role("button", name=re.compile("显示更多")).click()
        expect(dataset_rows).to_have_count(7)
        oldest = dataset_rows.last.get_by_role("button")
        oldest.click()
        expect(oldest).to_have_attribute("aria-current", "true")
        selected = next(p for p in rpc("state")["projects"] if p["id"] == project["id"])["currentVersionId"]
        datasets = [v for v in rpc("state")["dataVersions"] if v["projectId"] == project["id"]]
        assert selected == datasets[0]["id"]
        set_open("data", False)
        expect(section("data").locator(".linggo-section-summary")).to_contain_text("站点 1")
        reload_page()
        expanded("data", False)
        set_open("data", True)
        assert dataset_rows.count() == 6
        screenshot("03-datasets")
        set_open("data", False)
        set_open("jobs", True)
        job_rows = section("jobs").locator(".linggo-sidebar-list > li")
        assert job_rows.count() == 5
        section("jobs").get_by_role("button", name=re.compile("显示更多")).click()
        expect(job_rows).to_have_count(8)
        set_open("jobs", False)

        # A late initial response opens attention; repeated polls and reloads do not.
        running = job_fixture("active-1", "running", ordinal=20)
        jobs_by_project[project["id"]] = histories + [running]
        hold_next["project"] = project["id"]
        reload_page()
        expanded("jobs", False)
        for _ in range(50):
            if held:
                break
            page.wait_for_timeout(100)
        assert held, "First asynchronous jobs response was not intercepted"
        fulfill_jobs(held.pop())
        expanded("jobs", True)
        screenshot("04-running")
        set_open("jobs", False)
        page.wait_for_timeout(1300)
        expanded("jobs", False)
        reload_page()
        page.wait_for_timeout(1300)
        expanded("jobs", False)
        failed = job_fixture("active-1", "failed", ordinal=21)
        jobs_by_project[project["id"]] = histories + [failed]
        expanded("jobs", True)
        expect(section("jobs")).to_contain_text("生成测试错误")
        screenshot("05-failed")
        set_open("jobs", False)
        reload_page()
        page.wait_for_timeout(350)
        expanded("jobs", False)
        page.get_by_label("当前项目", exact=True).select_option(other["id"])
        page.wait_for_timeout(350)
        expanded("jobs", False)
        assert "生成任务" not in section("jobs").inner_text()
        page.get_by_label("当前项目", exact=True).select_option(project["id"])
        page.wait_for_timeout(350)
        expanded("jobs", False)
        # A new attention event in the other project is independent of the first.
        jobs_by_project[other["id"]] = [job_fixture("other-failed", "failed", other["id"], 25)]
        page.get_by_label("当前项目", exact=True).select_option(other["id"])
        expanded("jobs", True)
        expect(section("jobs")).to_contain_text("other-failed")
        assert "active-1" not in section("jobs").inner_text()
        set_open("jobs", False)
        page.get_by_label("当前项目", exact=True).select_option(project["id"])
        page.wait_for_timeout(350)
        expanded("jobs", False)
        set_open("sessions", False)
        reload_page()
        expanded("sessions", False)
        expanded("data", False)
        expanded("jobs", False)
        screenshot("06-persisted-folds")
        for width in (1920, 1440, 1024, 800):
            page.set_viewport_size({"width": width, "height": 1000})
            if width < 900:
                page.get_by_role("button", name="项目", exact=True).click()
            page.wait_for_timeout(200)
            assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
            screenshot("07-width-" + str(width))
        assert not errors, errors
        metrics["checks"] = ["import wizard inspection", "DSH geometry", "keyboard and hover", "bounded flat lists", "dataset switch",
                             "async job attention", "manual fold survives polling/reload", "cross-project isolation", "mobile overflow"]
        (shots / "sidebar-results.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n")
        browser.close()
    print("Sidebar passed: hierarchy, header actions, flat datasets, bounded lists, attention events, persistence and narrow layout")


try:
    run()
except Exception:
    print(re.sub(r"([?&]token=)[^\s\"']+", r"\1<redacted>", traceback.format_exc()))
    raise SystemExit(1)
