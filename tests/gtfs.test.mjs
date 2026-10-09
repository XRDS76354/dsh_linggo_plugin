import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { host, ready } from "./host.mjs";
import { writeGtfs } from "./gtfs-fixture.mjs";

test("GTFS imports without, with complete and with partial shapes cross the real worker boundary", { skip: !ready }, async () => {
  const h = await host();
  try {
    for (const shapes of ["none", "complete", "partial"]) {
      const project = await h.call("createProject", { name: `GTFS ${shapes}` });
      const path = join(h.home, `中文 feed '${shapes}.zip`);
      writeGtfs(path, shapes);
      const source = { type: "file", path };
      const info = await h.call("inspect", { projectId: project.id, source });
      assert.equal(info.kind, "gtfs");
      const mapping = { entity: "gtfs", crs: "WGS84" };
      const preview = await h.call("preview", { projectId: project.id, source, mapping });
      const job = await h.call("startImport", { projectId: project.id, source, mapping, previewToken: preview.previewToken });
      const finished = await h.done(project.id, job.id);
      assert.equal(finished.status, "done", finished.error);
      const map = await h.call("mapData", { projectId: project.id });
      assert.equal(map.routes.length, 2);
      const expectedShapes = { none: 0, complete: 2, partial: 1 }[shapes];
      assert.equal(map.routes.filter((route) => route.geometry !== null).length, expectedShapes);
      assert.ok(map.routes.every((route) => route.stops.length === 2));
      const state = await h.call("state");
      const version = state.dataVersions.find((item) => item.projectId === project.id);
      const dir = join(h.home, "linggo/projects", project.id, "data/versions", version.id);
      for (const file of ["manifest.json", "map.json"]) JSON.parse(await readFile(join(dir, file), "utf8"));
    }
  } finally { await h.dispose(); }
});

test("failed GTFS import after preview does not publish a version or leave staging files", { skip: !ready }, async () => {
  const h = await host();
  try {
    const project = await h.call("createProject", { name: "GTFS failure" });
    const path = join(h.home, "feed.zip");
    writeGtfs(path);
    const source = { type: "file", path }, mapping = { entity: "gtfs" };
    const preview = await h.call("preview", { projectId: project.id, source, mapping });
    writeGtfs(path, "none", true);
    const job = await h.call("startImport", { projectId: project.id, source, mapping, previewToken: preview.previewToken });
    const finished = await h.done(project.id, job.id);
    assert.equal(finished.status, "failed");
    assert.equal((await h.call("state")).dataVersions.length, 0);
    const data = join(h.home, "linggo/projects", project.id, "data");
    for (const dir of ["staging", "versions"]) assert.deepEqual(await readdir(join(data, dir)).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    }), []);
  } finally { await h.dispose(); }
});
