import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root = new URL('../', import.meta.url);
export async function syncCompatibility({ write = false } = {}) {
  const config = JSON.parse(await readFile(new URL('compatibility.json', root)));
  const manifest = JSON.parse(await readFile(new URL('package.json', root)));
  const peers = Object.keys(manifest.peerDependencies).filter((name) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-'));
  if (peers.some((name) => !config.hostPeers.includes(name))) throw Error('Declare all DSH peers in compatibility.json first');
  if (new Set(config.runtimes).size !== config.runtimes.length) throw Error('Duplicate compatibility runtime');
  const expected = structuredClone(manifest);
  expected.version = config.pluginVersion;
  expected.engines.dsh = config.range;
  for (const name of config.hostPeers) {
    expected.peerDependencies[name] = config.range;
    expected.peerDependenciesMeta[name] = { optional: true };
  }
  const marker = `<!-- linggo-compat: ${config.range}; runtimes: ${config.runtimes.join(', ')} -->`;
  if (write) {
    await writeFile(new URL('package.json', root), JSON.stringify(expected, null, 2) + '\n');
    for (const file of ['COMPATIBILITY.md', 'docs/compatibility.md']) {
      const url = new URL(file, root), text = await readFile(url, 'utf8');
      await writeFile(url, text.match(/<!-- linggo-compat:.*?-->/) ? text.replace(/<!-- linggo-compat:.*?-->/, marker) : `${marker}\n${text}`);
    }
  } else {
    if (JSON.stringify(expected) !== JSON.stringify(manifest)) throw Error('Compatibility manifest drift. Run npm run sync:compat');
    for (const file of ['COMPATIBILITY.md', 'docs/compatibility.md']) {
      if (!(await readFile(new URL(file, root), 'utf8')).includes(marker)) throw Error(`Compatibility documentation drift: ${file}`);
    }
  }
  return config;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await syncCompatibility({ write: process.argv.includes('--write') });
  console.log('Compatibility declarations synchronized');
}
