import { fileURLToPath } from "node:url";
import { realpathSync, readFileSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { runNpm } from "./npm-command.mjs";
export const PACKAGE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const allowed =
  /^(lib\/(index|client)\.js|demo\/(bundle|catalog)\.json|python\/linggo_data\/\w+\.py|python\/templates\/\w+\.py|skills\/linggo-[\w-]+\.md|python\/requirements(-postgis)?\.txt|scripts\/setup-python\.mjs|package\.json|cordis\.patch\.yml|README\.md|LICENSE|THIRD_PARTY_NOTICES\.md|COMPATIBILITY\.md|docs\/((compatibility|workbench-ui)\.md|compose\/spec\/demo-minimal-drt-v2\.md))$/;
const required = [
  "package.json",
  "lib/index.js",
  "lib/client.js",
  "cordis.patch.yml",
  "python/linggo_data/__init__.py",
  "python/linggo_data/__main__.py",
  "python/linggo_data/jsonio.py",
  "python/linggo_data/drt_v2.py",
  "python/linggo_data/drt_v2_core.py",
  "demo/bundle.json",
  "demo/catalog.json",
  "python/requirements.txt",
  "scripts/setup-python.mjs",
  ...[
    "data-import",
    "network-analysis",
    "drt",
    "fleet-timetable",
    "custom-algorithm",
  ].map((name) => `skills/linggo-${name}.md`),
];

export function validatePackage(pack) {
  for (const file of pack.files) {
    if (!allowed.test(file.path))
      throw Error(`Unexpected packaged file: ${file.path}`);
  }
  const paths = new Set(pack.files.map((file) => file.path));
  const missing = required.filter((path) => !paths.has(path));
  if (missing.length)
    throw Error(`Missing required packaged files: ${missing.join(", ")}`);
  return pack;
}

export function checkDemoAssets() {
  const dir = resolve(PACKAGE_ROOT, "demo");
  const size = ["bundle.json", "catalog.json"].reduce(
    (n, f) => n + statSync(resolve(dir, f)).size,
    0,
  );
  if (size > 1024 * 1024) throw Error("Demo assets exceed 1 MiB");
  const asset = JSON.parse(readFileSync(resolve(dir, "bundle.json"))),
    payload = gunzipSync(Buffer.from(asset.data, "base64"));
  if (createHash("sha256").update(payload).digest("hex") !== asset.sha256)
    throw Error("Demo checksum mismatch");
  const bundle = JSON.parse(payload),
    approved = ["1009", "1037", "1043", "1061", "1063", "1064", "1075", "1077"];
  if (
    bundle.tables.routes.length !== 16 ||
    bundle.tables.stops.length !== 95 ||
    bundle.tables.route_stops.length !== 176 ||
    bundle.tables.routes.some((r) => !approved.includes(r.route_id))
  )
    throw Error("Real route subset exceeded");
  if (
    Object.keys(bundle).some(
      (k) =>
        ![
          "version",
          "label",
          "provenance",
          "tables",
          "manifest",
          "map",
          "profiles",
          "routeSources",
          "networkSource",
          "results",
        ].includes(k),
    )
  )
    throw Error("Unexpected demo field");
  const clip = bundle.results.find((r) => r.id === "recorded"),
    allowedRequest = new Set([
      "request_id",
      "vehicle_id",
      "o",
      "d",
      "origin_name",
      "dest_name",
      "passengers",
      "request_time",
      "pickup_time",
      "dropoff_time",
      "served",
      "carry_in",
      "carry_out",
      "reason",
    ]),
    allowedVehicle = new Set([
      "vehicle_id",
      "capacity",
      "depot_id",
      "initial_load",
      "stops",
      "track",
      "start",
      "completed",
      "km",
    ]);
  if (
    clip.result.vehicles.length !== 6 ||
    clip.result.requests.filter((r) => r.served).length !== 38
  )
    throw Error("Unexpected replay subset");
  for (const r of clip.result.requests)
    if (
      !/^REC-[QR]\d+$/.test(r.request_id) ||
      Object.keys(r).some((k) => !allowedRequest.has(k))
    )
      throw Error("Unexpected replay order fields");
  for (const v of clip.result.vehicles)
    if (
      !/^REC-V\d+$/.test(v.vehicle_id) ||
      Object.keys(v).some((k) => !allowedVehicle.has(k))
    )
      throw Error("Unexpected replay vehicle fields");
  if (
    /\/Users\/|\/home\/|20250210|2025-02-10|api[_-]?key|access[_-]?token|身份证|手机号/i.test(
      payload.toString(),
    )
  )
    throw Error("Private source data in demo asset");
  if (/V005|V031|V062|V083|V091|V035/.test(JSON.stringify(clip)))
    throw Error("Original replay vehicle identity leaked");
  console.log(
    `Demo whitelist verified: ${size} bytes, eight public routes and six anonymous vehicles`,
  );
}
export function checkPackage() {
  checkDemoAssets();
  const [pack] = JSON.parse(
    runNpm(["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: PACKAGE_ROOT,
    }),
  );
  validatePackage(pack);
  console.log(
    `Package verified: ${pack.files.length} files, ${pack.unpackedSize} bytes`,
  );
  return pack;
}

if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) ===
    realpathSync(resolve(process.argv[1]))
)
  checkPackage();
