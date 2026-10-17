/** Inspect exact published package contracts without running candidate code. No admission/publication. */
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { runNpm } from './npm-command.mjs';
const config = JSON.parse(await readFile(new URL('../compatibility.json', import.meta.url)));
const candidate = process.argv[2] || process.env.LINGGO_DSH_CANDIDATE;
if (candidate && !/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(candidate)) throw Error('Expected an exact DSH version');
const tags = JSON.parse(runNpm(['view', '@deepseek-ai/dsh', 'dist-tags', '--json']));
const versions = candidate ? [candidate] : [...new Set(Object.values(tags))];
async function contract(name, version, dir) {
  const [pack] = JSON.parse(runNpm(['pack', `${name}@${version}`, '--ignore-scripts', '--json', '--pack-destination', dir]));
  // Inspect only package.json and declarations; no extraction or lifecycle execution.
  const names = execFileSync('tar', ['-tzf', join(dir, pack.filename)], { encoding: 'utf8' }).trim().split('\n');
  const read = (file) => execFileSync('tar', ['-xOzf', join(dir, pack.filename), file]);
  const manifest = JSON.parse(read('package/package.json'));
  const hash = createHash('sha256');
  const declarations = names.filter((p) => p.endsWith('.d.ts')).sort();
  hash.update(declarations.join('\n'));
  if (declarations.length) hash.update(execFileSync('tar', ['-xOzf', join(dir, pack.filename), ...declarations], { maxBuffer: 16 * 1024 * 1024 }));
  return { exports: manifest.exports, declarations: declarations.length, declarationsHash: hash.digest('hex'), integrity: pack.integrity };
}
for (const version of versions) {
  const metadata = JSON.parse(runNpm(['view', `@deepseek-ai/dsh@${version}`, 'version', 'dist.integrity', 'gitHead', '--json']));
  console.log(JSON.stringify({ candidate: version, matrixMember: config.runtimes.includes(version), allowedRange: config.range, metadata }, null, 2));
  if (candidate) {
    const dir = await mkdtemp(join(tmpdir(), 'linggo-upstream-'));
    try {
      for (const name of config.hostPeers) {
        const baseline = await contract(name, config.runtimes.at(-1), dir);
        const next = version === config.runtimes.at(-1) ? baseline : await contract(name, version, dir);
        console.log(JSON.stringify({ package: name, exportsChanged: JSON.stringify(baseline.exports) !== JSON.stringify(next.exports), declarationsChanged: baseline.declarationsHash !== next.declarationsHash, baseline, candidate: next }));
      }
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
  console.log('Next: test the isolated candidate with --single --candidate --smoke and browser regressions. No range changes or publication performed.');
}
