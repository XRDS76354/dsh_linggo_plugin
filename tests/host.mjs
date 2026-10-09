import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// An explicit interpreter wins; use the platform's normal command otherwise.
export const python = process.env.LINGGO_TEST_PYTHON || (process.platform === "win32" ? "python" : "python3");
export let ready = false;
try {
  execFileSync(python, ["-c", "import sys; assert sys.version_info >= (3, 10); import pandas, openpyxl, shapefile, pyproj"], { stdio: "ignore", windowsHide: true });
  ready = true;
} catch {}
if (!ready && (process.env.LINGGO_TEST_PYTHON || process.env.LINGGO_REQUIRE_PYTHON))
  throw Error(`Required Python test environment unavailable: ${python}`);

export async function host() {
  const home = await mkdtemp(join(tmpdir(), "linggo-data-"));
  process.env.DSH_HOME = home;
  await writeFile(join(home, "settings.json"), "{}").catch(() => {});
  const { mkdir } = await import("node:fs/promises");
  await mkdir(join(home, "linggo"), { recursive: true });
  await writeFile(join(home, "linggo", "settings.json"), JSON.stringify({ python }));
  const routes = {}, tools = {}, effects = [], skills = [];
  const ctx = {
    effect: (fn) => effects.push(fn()),
    on: () => {},
    tools: { guard: () => () => {}, register: (def) => (tools[def.name] = def) },
    skills: { register: (s) => (skills.push(s), () => {}) },
    connection: { fetch: { register: (r) => (routes[r.path] = r.fetch) }, authenticatedUrl: (u) => u },
  };
  const { apply } = await import(`../src/index.js?home=${encodeURIComponent(home)}`);
  await apply(ctx);
  const call = async (op, payload = {}) => {
    const res = await routes[`/api/linggo.${op}`](
      new Request("http://h/api", { method: "POST", body: JSON.stringify({ type: "client-request", rpcId: "1", method: `linggo.${op}`, payload }) }),
    );
    const { result } = await res.json();
    if (!result.ok) throw Error(result.error.message);
    return result.value;
  };
  const done = async (projectId, id) => {
    for (let i = 0; i < 1200; i++) {
      const job = (await call("jobs", { projectId })).find((j) => j.id === id);
      if (job.status !== "running") return job;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw Error("job timeout");
  };
  const dispose = async () => {
    for (const fn of effects) if (typeof fn === "function") await fn();
    await rm(home, { recursive: true, force: true });
  };
  return { home, call, tools, skills, done, dispose };
}

