import test from "node:test";
import assert from "node:assert/strict";
import { toolDenial, isPresentationDirectory } from "../src/policy.js";
const root = "/tmp/linggo/presentation";
const call = (cwd, name) => ({ name, agent: { session: { header: { cwd } } } });
test("presentation denies coding even with a direct tool request", () => {
  assert.match(toolDenial(root, call(root, "bash")), /presentation/);
  assert.equal(toolDenial(root, call(root, "linggo_status")), undefined);
});
test("development and sibling directories keep their existing policy", () => {
  assert.equal(toolDenial(root, call("/tmp/development", "bash")), undefined);
  assert.equal(isPresentationDirectory(root, root + "-other"), false);
  assert.equal(isPresentationDirectory(root, root + "/../development"), false);
  assert.equal(isPresentationDirectory(root, "relative"), false);
});
