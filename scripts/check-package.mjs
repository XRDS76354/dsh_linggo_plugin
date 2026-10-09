import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { runNpm } from "./npm-command.mjs";
export const PACKAGE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const allowed =
  /^(lib\/(index|client)\.js|python\/linggo_data\/\w+\.py|python\/templates\/\w+\.py|skills\/linggo-[\w-]+\.md|python\/requirements(-postgis)?\.txt|scripts\/setup-python\.mjs|package\.json|cordis\.patch\.yml|README\.md|LICENSE|THIRD_PARTY_NOTICES\.md|COMPATIBILITY\.md|docs\/(compatibility|workbench-ui)\.md)$/;
const required = [
  "package.json", "lib/index.js", "lib/client.js", "cordis.patch.yml",
  "python/linggo_data/__init__.py", "python/linggo_data/__main__.py",
  "python/linggo_data/jsonio.py",
  "python/requirements.txt", "scripts/setup-python.mjs",
  ...["data-import", "network-analysis", "drt", "fleet-timetable", "custom-algorithm"].map((name) => `skills/linggo-${name}.md`),
];

export function validatePackage(pack) {
  for (const file of pack.files) {
    if (!allowed.test(file.path)) throw Error(`Unexpected packaged file: ${file.path}`);
  }
  const paths = new Set(pack.files.map((file) => file.path));
  const missing = required.filter((path) => !paths.has(path));
  if (missing.length) throw Error(`Missing required packaged files: ${missing.join(", ")}`);
  return pack;
}

export function checkPackage() {
  const [pack] = JSON.parse(runNpm(["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: PACKAGE_ROOT }));
  validatePackage(pack);
  console.log(`Package verified: ${pack.files.length} files, ${pack.unpackedSize} bytes`);
  return pack;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) checkPackage();
