import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.js";
import {
  ensureDemoAssets,
  ensureDemoSessions,
  demoInfo,
  demoAssets,
} from "../src/demo.js";
import { host, ready } from "./host.mjs";

function nativeFixture() {
  const records = new Map(),
    workspaces = new Map();
  let fail = true;
  const ctx = {
    workspaceController: {
      create: async ({ path }) => {
        if (!workspaces.has(path))
          workspaces.set(path, { workspaceId: String(workspaces.size + 1) });
        return { workspace: workspaces.get(path) };
      },
      rename: async () => {},
    },
    sessionController: {
      create: async ({ sessionId }) => {
        if (records.size === 1 && fail) {
          fail = false;
          throw Error("interrupted");
        }
        if (!records.has(sessionId))
          records.set(sessionId, {
            log: [],
            append(type, data) {
              this.log.push({ type, data });
            },
          });
      },
      rename: async ({ sessionId, title }) => {
        records.get(sessionId).title = title;
      },
    },
    sessions: { get: (id) => records.get(id), flush: async () => {} },
  };
  return { ctx, records, workspaces };
}

test("concurrent bootstrap, partial native retry and recreation preserve user edits and removed demos", async () => {
  const root = await mkdtemp(join(tmpdir(), "linggo-demo-"));
  try {
    const a = new Store(root),
      b = new Store(root);
    await a.createProject({ name: "Existing project" });
    const [one, two] = await Promise.all([
      ensureDemoAssets(a),
      ensureDemoAssets(b),
    ]);
    assert.equal(one.projectId, two.projectId);
    assert.equal((await a.read()).projects.length, 2);
    const native = nativeFixture();
    await assert.rejects(ensureDemoSessions(a, native.ctx), /interrupted/);
    const first = native.records.get(one.presentationSessionId);
    first.title = "Edited title";
    await Promise.all([
      ensureDemoSessions(a, native.ctx),
      ensureDemoSessions(b, native.ctx),
    ]);
    assert.equal(native.records.size, 2);
    assert.equal(first.title, "Edited title");
    assert.equal(first.log.filter((e) => e.type === "user/message").length, 1);
    assert.ok(
      [...native.records.values()].every(
        (s) => !s.log.some((e) => /assistant|tool/.test(e.type)),
      ),
    );
    const file = join(
      a.projectDir(one.projectId, "development"),
      "demo_algorithm.py",
    );
    await writeFile(file, "# User changes");
    await ensureDemoAssets(b);
    assert.equal(await readFile(file, "utf8"), "# User changes");
    // Archived sessions are never re-created once nativeReady is published.
    native.records.clear();
    await ensureDemoSessions(a, native.ctx);
    assert.equal(native.records.size, 0);
    await a.update((s) => {
      s.projects = s.projects.filter((p) => p.id !== one.projectId);
    });
    assert.equal((await demoInfo(a)).removed, true);
    assert.equal((await ensureDemoAssets(a)).projectId, one.projectId);
    const fresh = await ensureDemoAssets(a, { recreate: true });
    assert.notEqual(fresh.projectId, one.projectId);
    assert.equal(fresh.generation, 2);
    assert.equal(await readFile(file, "utf8"), "# User changes");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("no Python: canonical queries, network filters, OD map and all five presets remain available", async () => {
  const h = await host({ demo: true });
  try {
    await h.call("saveSettings", { python: "/not-installed/demo-python" });
    const demo = await h.call("demoInfo");
    const pid = demo.projectId;
    const exec = {
      agent: {
        session: {
          header: { cwd: join(h.home, "linggo/projects", pid, "presentation") },
        },
      },
    };
    assert.equal((await h.call("state")).schema, 4);
    assert.equal(
      (await h.tools.linggo_status.execute({}, exec)).synthetic,
      false,
    );
    const row = demo.tables.od[0];
    const od = await h.tools.linggo_query.execute(
      {
        entity: "od",
        filter: { route_id: "1009", direction: "0", day_type: "workday" },
        limit: 200,
      },
      exec,
    );
    assert.ok(od.total > 0);
    assert.equal(od.synthetic, true);
    const edges = await h.tools.linggo_query.execute(
      {
        entity: "network_edges",
        filter: { from_node_id: demo.tables.network_edges[0].from_node_id },
      },
      exec,
    );
    assert.ok(edges.total > 0);
    assert.equal(edges.synthetic, false);
    assert.equal(
      (
        await h.tools.linggo_map.execute(
          {
            action: "show_od",
            route_id: "1009",
            direction: "0",
            day_type: "workday",
          },
          exec,
        )
      ).ok,
      true,
    );
    const actions = await h.call("mapActions", { projectId: pid });
    assert.ok(actions.actions[0].target.flows.length > 1);
    assert.equal(actions.actions[0].target.synthetic, true);
    const recordedId = demo.resultIds.recorded;
    assert.equal(
      (
        await h.tools.linggo_map.execute(
          {
            action: "focus_vehicle",
            run_id: recordedId,
            vehicle_id: "REC-V01",
          },
          exec,
        )
      ).ok,
      true,
    );
    assert.equal(
      (
        await h.tools.linggo_map.execute(
          { action: "seek_time", run_id: recordedId, time: 46000 },
          exec,
        )
      ).ok,
      true,
    );
    assert.equal(
      (
        await h.tools.linggo_map.execute(
          { action: "seek_time", run_id: recordedId, time: 1 },
          exec,
        )
      ).ok,
      false,
    );
    assert.equal(
      (
        await h.tools.linggo_map.execute(
          {
            action: "focus_vehicle",
            run_id: recordedId,
            vehicle_id: "PRIVATE",
          },
          exec,
        )
      ).ok,
      false,
    );
    const runs = await h.call("runs", { projectId: pid });
    assert.equal(runs.length, 5);
    for (const r of runs) {
      const { result } = await h.call("runResult", {
        projectId: pid,
        runId: r.id,
      });
      assert.equal(!!result.synthetic, r.algorithmId !== "recorded_clip");
      assert.equal(result.validation.ok, true);
    }
    assert.equal((await h.call("algorithms", { projectId: pid })).length, 4);
    const excessive = await h.call("previewRun", {
      projectId: pid,
      algorithmId: "drt_v2",
      params: { fleet_size: 7 },
    });
    assert.equal(excessive.previewToken, null);
    assert.ok(excessive.blocking.some((b) => b.includes("车辆表")));
    assert.ok(!(await h.call("env")).ok);
    assert.equal((await h.call("jobs", { projectId: pid })).length, 0);
    for (const name of [
      "ensureDemo",
      "recreateDemo",
      "setupPython",
      "demoInfo",
    ])
      assert.ok(!h.tools[name]);
    const newer = await h.call("recreateDemo");
    assert.notEqual(newer.projectId, pid);
    const older = await h.call("demoInfo", { projectId: pid });
    assert.equal(older.projectId, pid);
    assert.equal(older.results.length, 5);
    assert.equal(older.tables.stops.length, 95);
  } finally {
    await h.dispose();
  }
});

test(
  "all four confirmed reruns match packaged presets and preserve synthetic provenance",
  { skip: !ready && "Python missing" },
  async () => {
    const h = await host({ demo: true });
    try {
      const demo = await h.call("demoInfo");
      for (const preset of demo.results.filter(
        (r) => r.algorithmId !== "recorded_clip",
      )) {
        const input = {
          projectId: demo.projectId,
          algorithmId: preset.algorithmId,
          params: preset.params,
        };
        const preview = await h.call("previewRun", input);
        assert.equal(preview.blocking.length, 0);
        assert.ok(preview.warnings.some((w) => w.includes("合成")));
        const job = await h.call("startRun", {
          ...input,
          previewToken: preview.previewToken,
        });
        const done = await h.done(demo.projectId, job.id);
        assert.equal(done.status, "done", done.error);
        const run = (await h.call("runs", { projectId: demo.projectId })).find(
          (r) =>
            !r.precomputed &&
            r.algorithmId === preset.algorithmId &&
            r.params.policy === preset.params.policy,
        );
        const actual = await h.call("runResult", {
          projectId: demo.projectId,
          runId: run.id,
        });
        const expected = await h.call("runResult", {
          projectId: demo.projectId,
          runId: preset.id,
        });
        assert.deepEqual(actual.result, expected.result);
        assert.equal(run.provenance.inputSha256, preset.provenance.inputSha256);
      }
    } finally {
      await h.dispose();
    }
  },
);

test(
  "road imports use the confirmed Python pipeline and derived queries retain demo provenance",
  { skip: !ready && "Python missing" },
  async () => {
    const h = await host({ demo: true });
    try {
      const demo = await h.call("demoInfo");
      const file = join(h.home, "roads.csv");
      await writeFile(
        file,
        "edge_id,from_node_id,to_node_id,length_m,travel_time_s,highway,geometry\nTEST-E,UNKNOWN,DEMO-NA,100,20,residential,\n",
      );
      const source = { type: "file", path: file };
      const info = await h.call("inspect", {
        projectId: demo.projectId,
        source,
      });
      const mapping = {
        entity: "network_edges",
        crs: "WGS84",
        mode: "append",
        fields: info.tables[0].suggestions.network_edges,
      };
      assert.equal(mapping.fields.from_node_id.column, "from_node_id");
      const input = { projectId: demo.projectId, source, mapping };
      const preview = await h.call("preview", input);
      const job = await h.call("startImport", {
        ...input,
        previewToken: preview.previewToken,
      });
      assert.equal((await h.done(demo.projectId, job.id)).status, "done");
      const state = await h.call("state");
      const derived = state.dataVersions.at(-1);
      assert.ok(derived.warnings.some((w) => w.includes("路网节点")));
      assert.equal(derived.provenance.synthetic, false);
      const exec = {
        agent: {
          session: {
            header: {
              cwd: join(
                h.home,
                "linggo/projects",
                demo.projectId,
                "presentation",
              ),
            },
          },
        },
      };
      const query = await h.tools.linggo_query.execute(
        { entity: "network_edges", filter: { edge_id: "TEST-E" } },
        exec,
      );
      assert.equal(query.total, 1);
      assert.equal(query.synthetic, false);
      assert.equal((await h.call("demoInfo")).tables, null);
      await h.call("selectVersion", {
        projectId: demo.projectId,
        versionId: demo.versionId,
      });
      assert.equal((await h.call("demoInfo")).tables.stops.length, 95);
    } finally {
      await h.dispose();
    }
  },
);

test(
  "generated development example can be reviewed, registered and run with independent user validation",
  { skip: !ready && "Python missing" },
  async () => {
    const h = await host({ demo: true });
    try {
      const demo = await h.call("demoInfo");
      const { cwd } = await h.call("directory", {
        projectId: demo.projectId,
        mode: "development",
      });
      const path = join(cwd, "demo_algorithm.py");
      const readme = await readFile(join(cwd, "README.md"), "utf8");
      assert.match(readme, /selfcheck.*--version-dir/);
      const shown = await h.call("algorithmSource", {
        projectId: demo.projectId,
        path,
      });
      const algo = await h.call("registerAlgorithm", {
        projectId: demo.projectId,
        path,
        sha256: shown.sha256,
      });
      const input = {
        projectId: demo.projectId,
        algorithmId: algo.id,
        params: {},
      };
      const preview = await h.call("previewRun", input);
      const job = await h.call("startRun", {
        ...input,
        previewToken: preview.previewToken,
      });
      const done = await h.done(demo.projectId, job.id);
      assert.equal(done.status, "done", done.error);
      const run = (await h.call("runs", { projectId: demo.projectId })).find(
        (r) => r.algorithmSource === "user",
      );
      assert.equal(run.synthetic, true);
      assert.equal(run.validation.ok, true);
      assert.equal(
        run.provenance.inputSha256,
        demo.results.find((r) => r.algorithmId !== "recorded_clip").provenance
          .inputSha256,
      );
      const { result } = await h.call("runResult", {
        projectId: demo.projectId,
        runId: run.id,
      });
      assert.ok(
        result.requests.every((r) => r.o?.length === 2 && r.d?.length === 2),
      );
    } finally {
      await h.dispose();
    }
  },
);

test("old demo has an explicit update path and is never overwritten automatically", async () => {
  const root = await mkdtemp(join(tmpdir(), "linggo-old-demo-"));
  try {
    const store = new Store(root),
      old = await ensureDemoAssets(store);
    await store.update((s) => {
      s.demo.version = 1;
      s.projects[0].demo.version = 1;
    });
    const again = await ensureDemoAssets(store);
    assert.equal(again.projectId, old.projectId);
    assert.equal((await demoInfo(store)).updateAvailable, true);
    const newer = await ensureDemoAssets(store, { recreate: true });
    assert.notEqual(newer.projectId, old.projectId);
    assert.equal((await store.read()).projects.length, 2);
    assert.equal(newer.version, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("legacy stop-time DRT results support scoped replay seeking", async () => {
  const h = await host({ demo: true });
  try {
    const demo = await h.call("demoInfo"),
      store = new Store(join(h.home, "linggo")),
      id = "legacy-result",
      dir = store.resultDir(demo.projectId, id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "result.json"),
      JSON.stringify({
        kind: "drt",
        vehicles: [
          { vehicle_id: "L-V", stops: [{ arrive: 45000, depart: 45120 }] },
        ],
        requests: [],
      }),
    );
    await store.update((s) =>
      s.results.push({
        id,
        projectId: demo.projectId,
        versionId: demo.versionId,
        kind: "drt",
      }),
    );
    const exec = {
      agent: {
        session: {
          header: { cwd: store.projectDir(demo.projectId, "presentation") },
        },
      },
    };
    assert.equal(
      (
        await h.tools.linggo_map.execute(
          { action: "seek_time", run_id: id, time: 45030 },
          exec,
        )
      ).ok,
      true,
    );
    assert.equal(
      (
        await h.tools.linggo_map.execute(
          { action: "seek_time", run_id: id, time: 44900 },
          exec,
        )
      ).ok,
      false,
    );
  } finally {
    await h.dispose();
  }
});
