import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.js";
test("concurrent project creation persists both and handoffs remain project-bound", async () => {
  const root = await mkdtemp(join(tmpdir(), "linggo-store-"));
  try {
    const store = new Store(root);
    const projects = await Promise.all(
      ["A", "B"].map((name) => store.createProject({ name })),
    );
    assert.equal((await new Store(root).read()).projects.length, 2);
    await assert.rejects(
      store.createHandoff({ projectId: "unknown", summary: "test" }),
      /Unknown project/,
    );
    const item = await store.createHandoff({
      projectId: projects[0].id,
      summary: "Review algorithm",
    });
    assert.equal(item.projectId, projects[0].id);
    assert.equal((await store.read()).handoffs.length, 1);
    await assert.rejects(store.createProject({ name: " " }), /Invalid/);
    assert.equal(
      JSON.parse(await readFile(join(root, "state.json"), "utf8")).projects
        .length,
      2,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
