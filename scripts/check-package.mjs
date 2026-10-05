import { execFileSync } from "node:child_process";
const [pack] = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8" }),
);
const allowed =
  /^(lib\/(index|client)\.js|python\/linggo_data\/\w+\.py|python\/templates\/\w+\.py|skills\/linggo-[\w-]+\.md|python\/requirements(-postgis)?\.txt|scripts\/setup-python\.mjs|package\.json|cordis\.patch\.yml|README\.md|LICENSE|COMPATIBILITY\.md)$/;
for (const file of pack.files) {
  if (!allowed.test(file.path))
    throw Error(`Unexpected packaged file: ${file.path}`);
}
console.log(
  `Package allowlist verified: ${pack.files.length} files, ${pack.unpackedSize} bytes`,
);
