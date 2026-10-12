import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { host, ready } from "./host.mjs";
import { authorizeImport, scanSources } from "../src/batch-import.js";
import { toolDenial } from "../src/policy.js";
function execution(id, cwd, text, kind = "user") {
  return {
    agent: {
      id,
      session: {
        header: { cwd },
        log: [
          {
            type: "user/message",
            data: {
              id: "human-1",
              source: { kind },
              content: [{ type: "text", text }],
            },
          },
        ],
      },
    },
  };
}

test("only original human source scope authorizes import; presentation receives specific tools, not shell", () => {
  assert.throws(
    () =>
      authorizeImport(
        execution("s", "/tmp", "导入 /secret", "linggo-demo"),
        "/secret",
      ),
    /明确/,
  );
  assert.throws(
    () =>
      authorizeImport(execution("s", "/tmp", "导入 /tmp/public"), "/secret"),
    /明确/,
  );
  assert.throws(
    () =>
      authorizeImport(
        execution("s", "/tmp", "导入 /tmp/public/child"),
        "/tmp/public",
      ),
    /明确/,
  );
  assert.throws(
    () =>
      authorizeImport(
        execution("s", "/tmp", "不要导入 /tmp/public"),
        "/tmp/public",
      ),
    /取消/,
  );
  assert.equal(
    authorizeImport(execution("s", "/tmp", "导入当前目录的数据"), "/tmp")
      .sessionId,
    "s",
  );
  const root = "/tmp/linggo",
    exec = execution("s", root + "/projects/p/presentation", "导入当前目录");
  for (const name of [
    "linggo_projects",
    "linggo_prepare_import",
    "linggo_commit_import",
    "linggo_import_status",
  ])
    assert.equal(toolDenial(root, { ...exec, name }), undefined);
  assert.match(toolDenial(root, { ...exec, name: "bash" }), /presentation/);
});

test(
  "atomic recursive batch import creates one dataset and session binding, deduplicates retry and preserves sources",
  { skip: !ready },
  async (t) => {
    const e = await host();
    t.after(e.dispose);
    const source = join(e.home, "city-data");
    await mkdir(join(source, "nested"), { recursive: true });
    await mkdir(join(source, ".private"));
    await writeFile(
      join(source, "stops.csv"),
      "stop_id,stop_name,lon,lat\ns1,示例1,121.2,31.1\ns2,示例2,121.3,31.2\n",
    );
    await writeFile(
      join(source, "nested", "routes.csv"),
      "route_id,route_name,direction\nr1,线路1,0\n",
    );
    await writeFile(join(source, ".private", "secret.csv"), "secret");
    await symlink(join(source, ".private"), join(source, "alias"), "dir");
    const exec = execution(
      "ordinary-session",
      source,
      `请导入 ${source}，坐标系 WGS84`,
    );
    const prep = await e.tools.linggo_prepare_import.execute(
      { path: source, crs: "WGS84" },
      exec,
    );
    assert.equal(prep.ready, true, JSON.stringify(prep));
    assert.equal(prep.files.length, 2);
    assert.equal(prep.skipped.length, 1);
    const submitted = await e.tools.linggo_commit_import.execute(
      { plan_id: prep.planId },
      exec,
    );
    const done = await e.done(submitted.projectId, submitted.jobId);
    assert.equal(done.status, "done", done.error);
    const state = await e.call("state");
    assert.equal(state.dataVersions.length, 1);
    assert.equal(
      state.sessionProjects["ordinary-session"],
      submitted.projectId,
    );
    assert.equal(state.dataVersions[0].entities.stops.rows, 2);
    assert.equal(state.dataVersions[0].entities.routes.rows, 1);
    const retry = await e.tools.linggo_commit_import.execute(
      { plan_id: prep.planId },
      exec,
    );
    assert.equal(retry.jobId, submitted.jobId);
    assert.equal(retry.reused, true);
    await assert.rejects(
      e.tools.linggo_import_status.execute(
        { plan_id: prep.planId },
        execution("other", source, "导入当前目录"),
      ),
      /不属于/,
    );
    assert.match(await readFile(join(source, "stops.csv"), "utf8"), /示例1/);
    assert.equal(
      (await e.tools.linggo_query.execute({ entity: "stops" }, exec)).total,
      2,
    );
  },
);

test(
  "ambiguous CRS/direction stays uncommitted; changed source and cross-project presentation imports rejected",
  { skip: !ready },
  async (t) => {
    const e = await host();
    t.after(e.dispose);
    const project = await e.call("createProject", { name: "目标" });
    const source = join(e.home, "input.csv");
    await writeFile(source, "stop_id,lon,lat\ns1,121,31\n");
    const exec = execution(
      "s",
      join(e.home, "linggo", "projects", project.id, "presentation"),
      `导入 ${source} 坐标系 WGS84`,
    );
    const unknown = await e.tools.linggo_prepare_import.execute(
      { path: source },
      exec,
    );
    assert.equal(unknown.ready, false);
    assert.match(JSON.stringify(unknown.issues), /坐标系/);
    await assert.rejects(
      e.tools.linggo_commit_import.execute({ plan_id: unknown.planId }, exec),
      /歧义/,
    );
    const prep = await e.tools.linggo_prepare_import.execute(
      { path: source, crs: "WGS84" },
      exec,
    );
    assert.equal(prep.ready, true);
    await writeFile(source, "stop_id,lon,lat\ns1,122,32\n");
    await assert.rejects(
      e.tools.linggo_commit_import.execute({ plan_id: prep.planId }, exec),
      /源文件已变化/,
    );
    const other = await e.call("createProject", { name: "另一个" });
    await assert.rejects(
      e.tools.linggo_prepare_import.execute(
        { path: source, project_id: other.id },
        exec,
      ),
      /其他项目/,
    );
    assert.equal((await e.call("state")).dataVersions.length, 0);
  },
);

test(
  "batch failure and cancellation publish nothing; base snapshot changes require a new plan",
  { skip: !ready },
  async (t) => {
    const e = await host();
    t.after(e.dispose);
    const project = await e.call("createProject", { name: "目标" });
    const cwd = join(e.home, "linggo", "projects", project.id, "development");
    const source = join(e.home, "routes.csv");
    await writeFile(source, "route_id,route_name,direction\nr1,测试,0\n");
    const exec = execution("s", cwd, `导入 ${source}`);
    const prep = await e.tools.linggo_prepare_import.execute(
      { path: source },
      exec,
    );
    assert.equal(prep.ready, true);
    const submitted = await e.tools.linggo_commit_import.execute(
      { plan_id: prep.planId },
      exec,
    );
    await e.call("cancelJob", { id: submitted.jobId });
    const cancelled = await e.done(project.id, submitted.jobId);
    assert.equal(cancelled.status, "cancelled");
    assert.equal((await e.call("state")).dataVersions.length, 0);
    const successPlan = await e.tools.linggo_prepare_import.execute(
      { path: source },
      exec,
    );
    const stalePlan = await e.tools.linggo_prepare_import.execute(
      { path: source },
      exec,
    );
    const success = await e.tools.linggo_commit_import.execute(
      { plan_id: successPlan.planId },
      exec,
    );
    assert.equal((await e.done(project.id, success.jobId)).status, "done");
    await assert.rejects(
      e.tools.linggo_commit_import.execute({ plan_id: stalePlan.planId }, exec),
      /当前数据已变化/,
    );
    const bad = join(e.home, "rs.csv");
    await writeFile(bad, "route_id,direction,seq,stop_id\nr1,0,1,missing\n");
    exec.agent.session.log.push({
      type: "user/message",
      data: {
        id: "h2",
        source: { kind: "user" },
        content: [{ type: "text", text: `导入 ${bad}` }],
      },
    });
    const failing = await e.tools.linggo_prepare_import.execute(
      { path: bad },
      exec,
    );
    const run = await e.tools.linggo_commit_import.execute(
      { plan_id: failing.planId },
      exec,
    );
    const failed = await e.done(project.id, run.jobId);
    assert.equal(failed.status, "done"); // Unknown stop table is absent: data can be staged before coordinates arrive.
    assert.equal((await e.call("state")).dataVersions.length, 2);
  },
);

test(
  "source disappearance during execution rolls back the batch; missing Python returns setup guidance",
  { skip: !ready },
  async (t) => {
    const e = await host();
    t.after(e.dispose);
    const source = join(e.home, "source.csv");
    await writeFile(source, "vehicle_id,capacity\nv1,8\n");
    const exec = execution("real-native-id", e.home, `导入 ${source}`);
    const prepared = await e.tools.linggo_prepare_import.execute(
      { path: source },
      exec,
    );
    const job = await e.tools.linggo_commit_import.execute(
      { plan_id: prepared.planId },
      exec,
    );
    const { rm } = await import("node:fs/promises");
    await rm(source);
    const failed = await e.done(job.projectId, job.jobId);
    assert.equal(failed.status, "failed");
    assert.equal((await e.call("state")).dataVersions.length, 0);
    await writeFile(source, "vehicle_id,capacity\nv1,8\n");
    await e.call("saveSettings", { python: join(e.home, "no-python") });
    const unavailable = await e.tools.linggo_prepare_import.execute(
      { path: source },
      exec,
    );
    assert.equal(unavailable.ready, false);
    assert.equal(unavailable.environmentRequired, true);
    assert.equal((await e.call("state")).dataVersions.length, 0);
  },
);
