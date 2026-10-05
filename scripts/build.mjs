import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("lib", { recursive: true });
await build({
  entryPoints: ["src/index.js"],
  outfile: "lib/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node22",
});
await build({
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
});
