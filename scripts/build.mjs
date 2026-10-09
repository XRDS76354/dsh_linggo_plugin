import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const configs = [{
  entryPoints: ["src/index.js"],
  outfile: "lib/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node22",
}, {
  entryPoints: ["src/client.jsx"],
  outfile: "lib/client.js",
  bundle: true,
  platform: "browser",
  format: "cjs",
  external: ["react"],
  target: "es2022",
  banner: {
    js: 'window.__ModuleLoader__.load({id:"dsh-linggo-plugin",factory:function(require){var module={exports:{}};var exports=module.exports;',
  },
  footer: { js: "return module.exports;}});" },
}];

export async function buildPlugin({ check = false } = {}) {
  for (const config of configs) {
    const result = await build({ ...config, absWorkingDir: root, write: !check });
    if (check) {
      for (const file of result.outputFiles) {
        const saved = await readFile(file.path).catch(() => null);
        if (!saved?.equals(file.contents))
          throw Error(`Build output is missing or stale: ${config.outfile}. Run npm run build and commit lib/.`);
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await buildPlugin({ check: process.argv.includes("--check") });
  console.log(process.argv.includes("--check") ? "Committed build outputs match source" : "LingGo build complete");
}
