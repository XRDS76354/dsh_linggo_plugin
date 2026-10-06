import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { host, ready } from "./host.mjs";

test(
  "import publishes a version only after the confirmed preview; tools read it",
  { skip: !ready && "no Python data environment" },
  async () => {
    const h = await host();
    try {
      const project = await h.call("createProject", { name: "虚构城" });
      const csv = join(h.home, "rs.csv");
      await writeFile(
        csv,
        "线路编号,线路名称,上下行,站点序号,站点编号,站点名称,经度,纬度\n" +
          "R1,1路,0,1,S1,甲站,121.10,31.10\nR1,1路,0,2,S2,乙站,121.11,31.11\nR1,1路,1,1,S2,乙站,121.11,31.11\nR1,1路,1,2,S1,甲站,121.10,31.10\n",
      );
      const source = { type: "file", path: csv };
      const info = await h.call("inspect", { projectId: project.id, source });
      const mapping = {
        entity: "route_stops",
        crs: "WGS84",
        mode: "append",
        fields: info.tables[0].suggestions.route_stops,
      };
      assert.equal(mapping.fields.direction.column, "上下行");
      await assert.rejects(
        h.call("startImport", {
          projectId: project.id,
          source,
          mapping,
          previewToken: "x",
        }),
        /预览/,
      );
      const preview = await h.call("preview", {
        projectId: project.id,
        source,
        mapping,
      });
      assert.equal(preview.report[0].rowsOut, 4);
      // A changed mapping needs a new preview.
      await assert.rejects(
        h.call("startImport", {
          projectId: project.id,
          source,
          mapping: { ...mapping, crs: "GCJ02" },
          previewToken: preview.previewToken,
        }),
        /预览/,
      );
      const job = await h.call("startImport", {
        projectId: project.id,
        source,
        mapping,
        previewToken: preview.previewToken,
      });
      const finished = await h.done(project.id, job.id);
      assert.equal(finished.status, "done", finished.error);
      const state = await h.call("state");
      assert.equal(state.dataVersions.length, 1);
      assert.equal(state.dataVersions[0].entities.route_stops.rows, 4);
      const map = await h.call("mapData", { projectId: project.id });
      assert.deepEqual(
        map.routes.map((r) => r.stops),
        [
          ["S1", "S2"],
          ["S2", "S1"],
        ],
      );

      const exec = {
        agent: {
          sessionId: "sess-1",
          session: {
            header: {
              cwd: join(
                h.home,
                "linggo",
                "projects",
                project.id,
                "presentation",
              ),
            },
          },
        },
      };
      const status = await h.tools.linggo_status.execute({}, exec);
      assert.equal(status.dataReady, true);
      const rows = await h.tools.linggo_query.execute(
        {
          entity: "route_stops",
          filter: { route_name: "1路", direction: "1" },
        },
        exec,
      );
      assert.equal(rows.total, 2);
      assert.equal(
        (
          await h.tools.linggo_map.execute(
            { action: "show_route", id: "NOPE" },
            exec,
          )
        ).ok,
        false,
      );
      assert.equal(
        (
          await h.tools.linggo_map.execute(
            { action: "show_route", id: "R1", direction: "0" },
            exec,
          )
        ).ok,
        true,
      );
      const actions = await h.call("mapActions", {
        projectId: project.id,
        since: 0,
      });
      assert.equal(actions.actions.length, 1);
      assert.equal(actions.actions[0].sessionId, "sess-1");
      assert.deepEqual(actions.actions[0].target.directions, ["0"]);
      // Outside a presentation directory the tools see no project.
      assert.equal(
        (
          await h.tools.linggo_status.execute(
            {},
            { agent: { session: { header: { cwd: "/tmp" } } } },
          )
        ).projectId,
        null,
      );
    } finally {
      await h.dispose();
    }
  },
);

test(
  "a cancelled import leaves no version and no staging output",
  { skip: !ready && "no Python data environment" },
  async () => {
    const h = await host();
    try {
      const project = await h.call("createProject", { name: "取消城" });
      const csv = join(h.home, "big.csv");
      const lines = ["stop_id,stop_name,lon,lat"];
      for (let i = 0; i < 400000; i++)
        lines.push(`S${i},站${i},121.${i % 1000},31.${i % 997}`);
      await writeFile(csv, lines.join("\n"));
      const source = { type: "file", path: csv };
      const mapping = {
        entity: "stops",
        fields: {
          stop_id: { column: "stop_id" },
          stop_name: { column: "stop_name" },
          lon: { column: "lon" },
          lat: { column: "lat" },
        },
      };
      const preview = await h.call("preview", {
        projectId: project.id,
        source,
        mapping,
      });
      const job = await h.call("startImport", {
        projectId: project.id,
        source,
        mapping,
        previewToken: preview.previewToken,
      });
      await h.call("cancelJob", { id: job.id });
      const finished = await h.done(project.id, job.id);
      assert.equal(finished.status, "cancelled");
      assert.equal((await h.call("state")).dataVersions.length, 0);
      const data = join(h.home, "linggo", "projects", project.id, "data");
      assert.deepEqual(
        existsSync(join(data, "staging"))
          ? await readdir(join(data, "staging"))
          : [],
        [],
      );
      assert.deepEqual(
        existsSync(join(data, "versions"))
          ? await readdir(join(data, "versions"))
          : [],
        [],
      );
    } finally {
      await h.dispose();
    }
  },
);

test("partial settings changes preserve map and Python settings", async () => {
  const h = await host();
  try {
    await h.call("saveSettings", {
      amapKey: "fixture-amap",
      amapSecurityCode: "fixture-code",
      python: "fixture-python",
    });
    await h.call("saveSettings", { baiduAK: "fixture-baidu" });
    assert.deepEqual(await h.call("settings"), {
      amapKey: "fixture-amap",
      amapSecurityCode: "fixture-code",
      python: "fixture-python",
      baiduAK: "fixture-baidu",
    });
    await h.call("saveSettings", { baiduAK: "" });
    assert.equal((await h.call("settings")).baiduAK, "");
    assert.equal((await h.call("settings")).amapKey, "fixture-amap");
  } finally {
    await h.dispose();
  }
});
