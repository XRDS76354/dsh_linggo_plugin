import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, copyFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { validatePackage } from "../scripts/check-package.mjs";

const files = [
  "package.json", "lib/index.js", "lib/client.js", "cordis.patch.yml",
  "python/linggo_data/__init__.py", "python/linggo_data/__main__.py",
  "python/linggo_data/jsonio.py",
  "python/requirements.txt", "scripts/setup-python.mjs",
  ...["data-import", "network-analysis", "drt", "fleet-timetable", "custom-algorithm"].map((name) => `skills/linggo-${name}.md`),
];

test("package verification rejects missing runtime entries and unexpected files", () => {
  const pack = { files: files.map((path) => ({ path })) };
  assert.equal(validatePackage(pack), pack);
  for (const missing of ["lib/index.js", "lib/client.js", "python/linggo_data/__main__.py", "python/linggo_data/jsonio.py", "cordis.patch.yml"]) {
    assert.throws(() => validatePackage({ files: pack.files.filter((file) => file.path !== missing) }), /Missing required/);
  }
  assert.throws(() => validatePackage({ files: [...pack.files, { path: ".env" }] }), /Unexpected/);
});

test("standalone package checker works in paths with spaces, Chinese and an apostrophe", async () => {
  const root = await mkdtemp(join(tmpdir(), "linggo 中文 space '"));
  try {
    for (const file of files) {
      await mkdir(dirname(join(root, file)), { recursive: true });
      await writeFile(join(root, file), "fixture");
    }
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "linggo-package-fixture", version: "1.0.0", type: "module", files,
      // The checker must never invoke lifecycle scripts, even if a package defines one.
      scripts: { prepack: 'node -e "process.exit(71)"' },
    }));
    for (const script of ["check-package.mjs", "npm-command.mjs"]) {
      await copyFile(new URL(`../scripts/${script}`, import.meta.url), join(root, "scripts", script));
    }
    const output = execFileSync(process.execPath, [join(root, "scripts/check-package.mjs")], {
      encoding: "utf8", windowsHide: true, env: { ...process.env, npm_execpath: "" },
    });
    assert.match(output, /Package verified/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
