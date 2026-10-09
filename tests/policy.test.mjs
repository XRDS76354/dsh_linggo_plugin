import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toolDenial, presentationOf } from "../src/policy.js";
const root = "/tmp/linggo-policy/linggo";
const call = (cwd, name) => ({ name, agent: { session: { header: { cwd } } } });
test("project presentation directories deny coding tools without a refreshed list", () => {
  const cwd = `${root}/projects/p-1/presentation`;
  assert.match(toolDenial(root, call(cwd, "bash")), /presentation/);
  assert.match(toolDenial(root, call(`${cwd}/nested`, "write")), /presentation/);
  assert.equal(toolDenial(root, call(cwd, "linggo_status")), undefined);
  assert.deepEqual(presentationOf(root, cwd), { projectId: "p-1" });
  assert.deepEqual(presentationOf(root, `${root}/presentation`), { projectId: null });
});
test("development, sibling, relative and traversal paths stay unrestricted", () => {
  assert.equal(toolDenial(root, call(`${root}/projects/p-1/development`, "bash")), undefined);
  assert.equal(presentationOf(root, `${root}/projects/p-1/presentation-other`), undefined);
  assert.equal(presentationOf(root, `${root}/projects/p-1/presentation/../development`), undefined);
  assert.equal(presentationOf(root, `${root}-other/projects/p/presentation`), undefined);
  assert.equal(presentationOf(root, "relative/projects/p/presentation"), undefined);
  assert.equal(toolDenial(root, { name: "bash" }), undefined);
});
test("symlinked and case-variant paths resolve to the presentation scope", async (t) => {
  const base = await mkdtemp(join(tmpdir(), "linggo-policy-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const real = join(base, "linggo", "projects", "p-2", "presentation");
  await mkdir(real, { recursive: true });
  await symlink(real, join(base, "alias"), process.platform === "win32" ? "junction" : "dir");
  assert.deepEqual(presentationOf(join(base, "linggo"), join(base, "alias")), { projectId: "p-2" });
  if (process.platform === "darwin" || process.platform === "win32")
    assert.ok(presentationOf(join(base, "linggo"), real.replace("presentation", "Presentation")));
});
