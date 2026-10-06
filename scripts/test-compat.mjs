/** Use separately installed, exact official DSH cohorts; never replace the user's Host. */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const runtimes = process.argv.slice(2);
if (runtimes.length !== 2) throw Error('Usage: npm run test:compat -- <rc.2 npm runtime directory> <alpha.1 npm runtime directory>');
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const expected = new Set(['0.2.0-rc.2', '0.2.1-alpha.1']);
const guardTest = await readFile(new URL('../tests/runtime.test.mjs', import.meta.url), 'utf8');
for (const root of runtimes) {
  const require = createRequire(pathToFileURL(resolve(root, 'package.json')));
  const version = require('@deepseek-ai/dsh/package.json').version;
  if (!expected.delete(version)) throw Error(`Unexpected or duplicate runtime: ${version}`);
  const { evaluatePluginCompatibility } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-app-boot')));
  if (evaluatePluginCompatibility(manifest, {}, version)) throw Error(`Plugin refused by DSH ${version}`);
  if (!evaluatePluginCompatibility(manifest, {}, '0.2.2-alpha.1')) throw Error('Untested DSH was incorrectly admitted');
  let code = guardTest.replace('../src/policy.js', pathToFileURL(fileURLToPath(new URL('../src/policy.js', import.meta.url))).href);
  for (const name of ['@deepseek-ai/cordis', '@deepseek-ai/dsh-system-prompt', '@deepseek-ai/dsh-tools']) {
    code = code.replace(name, pathToFileURL(require.resolve(name)).href);
  }
  const result = spawnSync(process.execPath, ['--input-type=module'], { input: code, encoding: 'utf8' });
  if (result.status !== 0) throw Error(`Real tool guard failed on ${version}: ${result.stderr}\n${result.stdout}`);
  console.log(`DSH ${version}: installer compatibility and real tool-execution guard passed`);
}
