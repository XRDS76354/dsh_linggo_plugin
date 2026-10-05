#!/usr/bin/env node
// Create the isolated LingGo Python environment under <DSH home>/linggo/venv and install the
// data worker requirements. Usage:
//   node scripts/setup-python.mjs [--postgis] [--python <interpreter>] [--index-url <mirror>] [--run-tests]
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");
const root = join(process.env.DSH_HOME || join(homedir(), ".dsh"), "linggo");
const venv = join(root, "venv");
const py = process.platform === "win32" ? join(venv, "Scripts", "python.exe") : join(venv, "bin", "python");

const run = (cmd, argv) => {
  console.log(`> ${cmd} ${argv.join(" ")}`);
  const r = spawnSync(cmd, argv, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (!existsSync(py)) {
  const base = value("--python") ?? (process.platform === "win32" ? "python" : "python3");
  const version = execFileSync(base, ["-c", "import sys;print('%d.%d'%sys.version_info[:2])"], { encoding: "utf8" }).trim();
  const [major, minor] = version.split(".").map(Number);
  if (major < 3 || (major === 3 && minor < 10)) {
    console.error(`LingGo needs Python 3.10 or newer; ${base} is ${version}.`);
    process.exit(1);
  }
  run(base, ["-m", "venv", venv]);
}
const pip = [ "-m", "pip", "install", "--disable-pip-version-check", ...(value("--index-url") ? ["-i", value("--index-url")] : []) ];
run(py, [...pip, "-r", join(pkg, "python", "requirements.txt")]);
if (flag("--postgis")) run(py, [...pip, "-r", join(pkg, "python", "requirements-postgis.txt")]);
if (flag("--run-tests")) {
  const tests = join(pkg, "python", "tests");
  if (!existsSync(tests)) console.log("Python tests are not shipped in the package; run them from a source checkout.");
  else run(py, ["-W", "ignore", "-m", "unittest", "discover", "-s", tests]);
}
console.log(`LingGo Python environment ready: ${py}`);
