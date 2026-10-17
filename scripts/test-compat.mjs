/** Exact official runtimes only. All package/profile changes stay in isolated test homes. */
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { syncCompatibility } from './sync-compat.mjs';
import { runNpm } from './npm-command.mjs';
const config = await syncCompatibility();
const args = process.argv.slice(2), single = args.includes('--single'), smoke = args.includes('--smoke');
const roots = args.filter((arg) => !arg.startsWith('--'));
if (args.includes('--install')) {
  if (roots.length) throw Error('--install takes no runtime directories');
  for (const version of config.runtimes) {
    const root = resolve('.local/compat', version, 'runtime');
    await mkdir(root, { recursive: true });
    runNpm(['install', '--prefix', root, '--no-audit', '--no-fund', '--save-exact', `@deepseek-ai/dsh@${version}`], { stdio: 'inherit' });
    roots.push(root);
  }
}
if (!roots.length || (!single && roots.length !== config.runtimes.length) || (single && roots.length !== 1)) throw Error('Usage: npm run test:compat -- [--single] [--smoke] <official runtime directories>; or --install --smoke');
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const guardTest = await readFile(new URL('../tests/runtime.test.mjs', import.meta.url), 'utf8');
const expected = new Set(config.runtimes);
const sanitize = (text) => String(text).replace(/([?&]token=)[^\s"']+/g, '$1<redacted>');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  for (let i = 0; i < 50 && child.exitCode === null && child.signalCode === null; i++) await wait(100);
  if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await new Promise((r) => child.once('exit', r)); }
}
async function smokeHost(root, require, version) {
  const temp = await mkdtemp(join(tmpdir(), 'linggo-compat-'));
  const env = { ...process.env, DSH_HOME: join(temp, 'home'), npm_config_ignore_workspace_root_check: 'true' };
  const cli = join(dirname(require.resolve('@deepseek-ai/dsh/package.json')), 'lib/bin.js');
  const command = (args) => {
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, env, encoding: 'utf8', timeout: 180000 });
    if (result.status !== 0) throw Error(sanitize(result.stderr + result.stdout));
  };
  let child;
  try {
    const [pack] = JSON.parse(runNpm(['pack', '--ignore-scripts', '--json', '--pack-destination', temp]));
    command(['--profile', 'linggo-compat', '--from-default-profile', 'web', '--help']);
    command(['plugin', '--profile', 'linggo-compat', 'add', join(temp, pack.filename)]);
    // DSH's dynamic runtime must resolve shared services from its own installation.
    const profile = JSON.parse(await readFile(join(env.DSH_HOME, 'profiles/linggo-compat/package.json')));
    if (Object.keys(profile.dependencies).some((name) => name.startsWith('@deepseek-ai/dsh'))) throw Error('Host API packages were installed into the profile');
    const server = createServer(); await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port; await new Promise((r) => server.close(r));
    child = spawn(process.execPath, [cli, '--profile', 'linggo-compat', '--port', String(port), '--no-open'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { log = (log + chunk).slice(-200000); });
    let url;
    for (let i = 0; i < 300; i++) {
      url = log.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s"']+/)?.[0];
      if (url || child.exitCode !== null) break;
      await wait(100);
    }
    if (!url) throw Error(sanitize('Host did not start: ' + log));
    const auth = await fetch(url, { redirect: 'manual' });
    const cookies = auth.headers.getSetCookie().map((v) => v.split(';')[0]).join('; ');
    if (!cookies) throw Error('Host did not exchange its authentication token');
    const origin = new URL(url).origin;
    const body = (operation, payload = {}) => JSON.stringify({ type: 'client-request', rpcId: 'compat-smoke', method: `linggo.${operation}`, payload });
    const rpc = async (operation, payload = {}, authenticated = true) => {
      const response = await fetch(origin + '/api/linggo.' + operation, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { cookie: cookies } : {}) }, body: body(operation, payload) });
      return response;
    };
    if ((await rpc('compatibility', {}, false)).status !== 401) throw Error('Unauthenticated diagnostic admitted');
    const response = await rpc('compatibility'), envelope = await response.json();
    if (!envelope.result?.ok || envelope.result.value.protocol !== config.protocol || envelope.result.value.runtime !== version) throw Error('Host handshake failed');
    if (Object.values(envelope.result.value.capabilities.required).some((v) => !v)) throw Error('Required capabilities missing');
    const state = (await (await rpc('state')).json()).result;
    if (!state.ok || !state.value.projects.length) throw Error('Demo initialization failed');
    const summary = { version, plugin: envelope.result.value.version, build: envelope.result.value.build, demoProjects: state.value.projects.length, sharedDependencies: true };
    await stop(child); child = null;
    command(['plugin', '--profile', 'linggo-compat', 'remove', 'dsh-linggo-plugin']);
    const removed = JSON.parse(await readFile(join(env.DSH_HOME, 'profiles/linggo-compat/package.json')));
    if (removed.dependencies?.['dsh-linggo-plugin']) throw Error('Uninstall retained the plugin dependency');
    // Uninstall must retain business state, including the initialized demo.
    if (!(await readFile(join(env.DSH_HOME, 'linggo/state.json'))).length) throw Error('Uninstall removed business data');
    console.log(JSON.stringify({ ...summary, installedActivatedUninstalled: true, retainedState: true }));
  } finally { if (child) await stop(child); await rm(temp, { recursive: true, force: true }); }
}
for (const directory of roots) {
  const root = resolve(directory), require = createRequire(pathToFileURL(join(root, 'package.json')));
  const version = require('@deepseek-ai/dsh/package.json').version;
  if (!expected.delete(version) && !(single && args.includes('--candidate'))) throw Error(`Unexpected or duplicate runtime: ${version}`);
  const { evaluatePluginCompatibility } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-app-boot')));
  for (const accepted of config.runtimes) if (evaluatePluginCompatibility(manifest, {}, accepted)) throw Error(`Manifest refused by installer ${version} for ${accepted}`);
  for (const rejected of ['0.2.1-alpha.2', '0.2.0-rc.1', '0.2.2-alpha.1', '0.2.2', '0.3.0']) if (!evaluatePluginCompatibility(manifest, {}, rejected)) throw Error(`Unexpected admission of ${rejected}`);
  for (const candidate of ['0.2.1-rc.2', '0.2.1']) if (evaluatePluginCompatibility(manifest, {}, candidate)) throw Error(`Bounded range did not admit ${candidate}`);
  let code = guardTest.replace('../src/policy.js', pathToFileURL(fileURLToPath(new URL('../src/policy.js', import.meta.url))).href);
  for (const name of ['@deepseek-ai/cordis', '@deepseek-ai/dsh-system-prompt', '@deepseek-ai/dsh-tools']) code = code.replace(name, pathToFileURL(require.resolve(name)).href);
  const result = spawnSync(process.execPath, ['--input-type=module'], { input: code, encoding: 'utf8' });
  if (result.status !== 0) throw Error(sanitize(`Real guard failed on ${version}: ${result.stderr}\n${result.stdout}`));
  console.log(`DSH ${version}: real installer and execution guard passed`);
  if (smoke) {
    if (evaluatePluginCompatibility(manifest, {}, version)) throw Error(`Candidate ${version} is outside the declared range; installation remains blocked. Run contract/guard checks without --smoke.`);
    await smokeHost(root, require, version);
  }
}
