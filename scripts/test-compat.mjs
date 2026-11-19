/** Exact official runtimes only. All package/profile changes stay in isolated test homes. */
import { readFile, readdir, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
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
  const env = { ...process.env, DSH_HOME: join(temp, 'home'), AGENTS_HOME: join(temp, 'agents'), npm_config_ignore_workspace_root_check: 'true' };
  const profileDir = join(env.DSH_HOME, 'profiles', 'linggo-compat');
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
    const profile = JSON.parse(await readFile(join(profileDir, 'package.json')));
    const installed = await readdir(join(profileDir, 'node_modules', '.pnpm'));
    if (Object.keys(profile.dependencies).some((name) => name.startsWith('@deepseek-ai/')) || installed.some((name) => name.startsWith('@deepseek-ai+'))) {
      throw Error('Host API packages were installed into the profile');
    }
    const server = createServer(); await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port; await new Promise((r) => server.close(r));
    const origin = `http://127.0.0.1:${port}`;
    const boot = async () => {
      child = spawn(process.execPath, [cli, '--profile', 'linggo-compat', '--port', String(port), '--no-open'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let log = '';
      for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { log = (log + chunk).slice(-200000); });
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
      const rpc = (operation, payload = {}, authenticated = true) => fetch(origin + '/api/linggo.' + operation, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authenticated ? { cookie: cookies } : {}) },
        body: JSON.stringify({ type: 'client-request', rpcId: 'compat-smoke', method: `linggo.${operation}`, payload }),
      });
      const call = async (operation, payload) => {
        const response = await rpc(operation, payload);
        if (!response.ok) throw Error(`${operation} failed with HTTP ${response.status}`);
        const { result } = await response.json();
        if (!result?.ok) throw Error(`${operation} did not succeed`);
        return result.value;
      };
      return { rpc, call };
    };
    const shutdown = async () => { await stop(child); child = null; };
    const first = await boot();
    if ((await first.rpc('compatibility', {}, false)).status !== 401) throw Error('Unauthenticated diagnostic admitted');
    const info = await first.call('compatibility');
    if (info.protocol !== config.protocol || info.runtime !== version || info.version !== config.pluginVersion) throw Error('Host handshake failed');
    if (config.hostRequired.some((name) => info.capabilities.required[name] !== true)) throw Error('Required capabilities missing');
    const state = await first.call('state');
    if (!state.projects.length) throw Error('Demo initialization failed');
    const project = await first.call('createProject', { name: 'Compatibility restart fixture' });
    await shutdown();

    const restarted = await boot();
    const afterRestart = await restarted.call('state');
    if (!afterRestart.projects.some(({ id }) => id === project.id)) throw Error('Restart lost the created project');
    await shutdown();

    command(['plugin', '--profile', 'linggo-compat', 'remove', 'dsh-linggo-plugin']);
    const removed = JSON.parse(await readFile(join(profileDir, 'package.json')));
    if (removed.dependencies?.['dsh-linggo-plugin']) throw Error('Uninstall retained the plugin dependency');
    const withoutPlugin = await boot();
    if ((await withoutPlugin.rpc('state')).status !== 404) throw Error('Business API survived uninstall');
    await shutdown();
    const retained = JSON.parse(await readFile(join(env.DSH_HOME, 'linggo/state.json')));
    if (![...state.projects, project].every(({ id }) => retained.projects.some((p) => p.id === id))) throw Error('Uninstall removed business data');
    console.log(JSON.stringify({ version, plugin: info.version, build: info.build, demoProjects: state.projects.length, sharedDependencies: true, installedActivatedRestartedUninstalled: true, retainedState: true }));
  } finally { if (child) await stop(child); await rm(temp, { recursive: true, force: true }); }
}
for (const directory of roots) {
  const root = resolve(directory), require = createRequire(pathToFileURL(join(root, 'package.json')));
  const version = require('@deepseek-ai/dsh/package.json').version;
  if (!expected.delete(version) && !(single && args.includes('--candidate'))) throw Error(`Unexpected or duplicate runtime: ${version}`);
  const { evaluatePluginCompatibility } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-app-boot')));
  for (const accepted of config.runtimes) if (evaluatePluginCompatibility(manifest, {}, accepted)) throw Error(`Manifest refused by installer ${version} for ${accepted}`);
  for (const rejected of ['0.2.1-alpha.2', '0.2.0-rc.1', '0.2.2-alpha.1', '0.2.2-rc.1', '0.2.2-rc.2', '0.2.2-rc.3', '0.2.2-rc.4', '0.2.2-rc.6', '0.2.2', '0.3.0']) if (!evaluatePluginCompatibility(manifest, {}, rejected)) throw Error(`Unexpected admission of ${rejected}`);
  for (const candidate of ['0.2.1-rc.2', '0.2.1']) if (evaluatePluginCompatibility(manifest, {}, candidate)) throw Error(`Bounded range did not admit ${candidate}`);
  const packages = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-system-prompt', '@deepseek-ai/dsh-tools'];
  const { default: Tools } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-tools')));
  const batch = typeof Tools.prototype.setExecutor === 'function';
  if (batch) packages.push('@deepseek-ai/dsh-tool-executor-native');
  const fixture = new URL(batch ? '../tests/fixtures/runtime-batch.mjs' : '../tests/runtime.test.mjs', import.meta.url);
  let code = (await readFile(fixture, 'utf8')).replace(/(?:\.\.\/)+src\/policy\.js/, new URL('../src/policy.js', import.meta.url).href);
  for (const name of packages) code = code.replace(name, pathToFileURL(require.resolve(name)).href);
  const result = spawnSync(process.execPath, ['--input-type=module'], { input: code, encoding: 'utf8' });
  if (result.status !== 0) throw Error(sanitize(`Real guard failed on ${version}: ${result.stderr}\n${result.stdout}`));
  console.log(`DSH ${version}: real installer and execution guard passed`);
  if (smoke) {
    if (evaluatePluginCompatibility(manifest, {}, version)) throw Error(`Candidate ${version} is outside the declared range; installation remains blocked. Run contract/guard checks without --smoke.`);
    await smokeHost(root, require, version);
  }
}
