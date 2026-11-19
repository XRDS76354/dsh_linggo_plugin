"""Exercise one exact 0.2.2 Host and a packed LingGo build in isolated Web profiles.

Requires Node/pnpm on PATH and Python with Playwright and Microsoft Edge installed.
The output directory must not exist. It contains private Host logs (with a local
bootstrap token), fixture state, and browser screenshots; do not commit it.
"""
import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
TOKEN_URL = re.compile(r'http://127\.0\.0\.1:\d+/\?token=[^\s"\']+')


def wait_for(process, action, stage, timeout=35):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f'{stage} exited with status {process.returncode}')
        result = action()
        if result:
            return result
        time.sleep(0.1)
    raise RuntimeError(f'{stage} timed out')


def stop(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


@contextmanager
def spawn(command, *, cwd, env, log):
    with log.open('w', encoding='utf-8') as output:
        process = subprocess.Popen(command, cwd=cwd, env=env, stdout=output, stderr=subprocess.STDOUT)
        try:
            yield process
        finally:
            stop(process)


def run_logged(command, *, cwd, env, log):
    with spawn(command, cwd=cwd, env=env, log=log) as process:
        if process.wait(timeout=150) != 0:
            raise RuntimeError(f'{log.stem} failed (status {process.returncode})')


def read_launch_url(log):
    match = TOKEN_URL.search(log.read_text(encoding='utf-8', errors='replace'))
    return match.group() if match else None


def run(runtime, package, out):
    dsh = runtime / 'node_modules/@deepseek-ai/dsh'
    version = json.loads((dsh / 'package.json').read_text(encoding='utf-8'))['version']
    if not re.fullmatch(r'0\.2\.2-rc\.[1-5]', version):
        raise ValueError(f'Expected an exact DSH 0.2.2 rc.1–rc.5 runtime, got {version}')
    if not package.is_file():
        raise ValueError('Missing LingGo release tarball')
    out.mkdir(mode=0o700)  # Never reuse or clear an existing profile.
    home = out / 'home'
    env = dict(os.environ, DSH_HOME=str(home), AGENTS_HOME=str(out / 'agents'),
               LINGGO_COMPAT_KEY='fixture-only', npm_config_ignore_workspace_root_check='true')
    cli = ['node', str(dsh / 'lib/bin.js')]
    profile = home / 'profiles/qa'
    run_logged([*cli, '--profile', 'qa', '--from-default-profile', 'web', '--help'], cwd=runtime, env=env, log=out / 'init.log')
    run_logged([*cli, 'plugin', '--profile', 'qa', 'add', str(package)], cwd=runtime, env=env, log=out / 'install.log')
    provider = ROOT / 'tests/fixtures/compat-provider.py'
    # Ask the provider to bind its own free port; do not race another test for a port.
    provider_log = out / 'provider.log'
    host_log = out / 'host.log'
    with spawn([sys.executable, '-u', str(provider), '--port', '0'], cwd=out, env=env, log=provider_log) as service:
        provider_port = wait_for(service, lambda: re.search(r'^port=(\d+)$', provider_log.read_text(), re.M), 'test model provider')[1]
        (profile / 'cordis.patch.yml').write_text(f'''- id: llm-pi-ai
  config:
    providers:
      compatibility:
        apiKeyEnv: LINGGO_COMPAT_KEY
        api: openai-completions
        baseURL: http://127.0.0.1:{provider_port}/v1
        models:
          - id: compatibility
- id: agent-default-model
  config:
    provider: compatibility
    model: compatibility
''', encoding='utf-8')
        host = [*cli, '--profile', 'qa', '--host', '127.0.0.1', '--no-open', '--port']
        marker = out / 'reconnect'
        with spawn([*host, '0'], cwd=runtime, env=env, log=host_log) as first:
            launch = wait_for(first, lambda: read_launch_url(host_log), 'Web Host')
            port = str(urlsplit(launch).port)
            for name in ('browser-compat', 'browser-compat-diagnostics'):
                run_logged([sys.executable, str(ROOT / f'scripts/{name}.py'), str(host_log), str(home),
                            '--shots', str(out / name)], cwd=out, env=env, log=out / f'{name}.log')
            # Keep the same page and browser context alive across a real Host restart.
            with spawn([sys.executable, str(ROOT / 'scripts/browser-reconnect.py'), str(host_log), str(marker)],
                       cwd=out, env=env, log=out / 'browser-reconnect.log') as browser:
                wait_for(browser, marker.with_suffix('.ready').exists, 'Reconnect browser')
                stop(first)
                restart_log = out / 'host-restarted.log'
                with spawn([*host, port], cwd=runtime, env=env, log=restart_log) as restarted:
                    wait_for(restarted, lambda: read_launch_url(restart_log), 'Restarted Web Host')
                    marker.with_suffix('.resume').touch()
                    if browser.wait(timeout=60) != 0:
                        raise RuntimeError('Browser could not reconnect to the restarted Host')
    print(f'DSH {version} Web passed: layout, tool stream/cancel, draft handoff, diagnostics and reconnect')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runtime', type=Path)
    parser.add_argument('package', type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    try:
        run(args.runtime.resolve(), args.package.resolve(), args.out.resolve())
    except (OSError, RuntimeError, ValueError, subprocess.TimeoutExpired) as e:
        # Keep private logs off stdout, including on a failed auth bootstrap.
        print(f'Web acceptance failed: {e}. Inspect private logs at {args.out}.', file=sys.stderr)
        sys.exit(1)
