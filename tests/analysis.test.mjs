import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanParams } from "../src/analysis.js";
import { toolDenial } from "../src/policy.js";
import { host, ready } from "./host.mjs";

const TEMPLATE = fileURLToPath(new URL("../python/templates/linggo_algorithm.py", import.meta.url));

async function importStops(h, projectId) {
  const csv = join(h.home, "stops.csv");
  const lines = ["stop_id,stop_name,lon,lat"];
  for (let i = 0; i < 30; i++) lines.push(`S${i},站${i},${(121.80 + (i % 6) * 0.01).toFixed(3)},${(30.90 + Math.floor(i / 6) * 0.01).toFixed(3)}`);
  await writeFile(csv, lines.join("\n"));
  const source = { type: "file", path: csv };
  const mapping = { entity: "stops", fields: { stop_id: { column: "stop_id" }, stop_name: { column: "stop_name" }, lon: { column: "lon" }, lat: { column: "lat" } } };
  const preview = await h.call("preview", { projectId, source, mapping });
  const job = await h.call("startImport", { projectId, source, mapping, previewToken: preview.previewToken });
  assert.equal((await h.done(projectId, job.id)).status, "done");
}

test("parameters are checked against the algorithm spec on the Host", () => {
  const meta = { params: { n: { type: "integer", default: 3, min: 1, max: 5 }, mode: { type: "enum", default: "a", options: ["a", "b"] } } };
  assert.deepEqual(cleanParams(meta, {}), { n: 3, mode: "a" });
  assert.throws(() => cleanParams(meta, { n: 9 }), /之间/);
  assert.throws(() => cleanParams(meta, { n: 2.5 }), /整数/);
  assert.throws(() => cleanParams(meta, { mode: "c" }), /之一/);
  assert.throws(() => cleanParams(meta, { cmd: "rm" }), /未知参数/);
});

test("presentation agents may use the analysis tools but nothing that runs code", () => {
  const exec = (name) => ({ name, agent: { session: { header: { cwd: "/r/projects/p/presentation" } } } });
  for (const name of ["linggo_algorithms", "linggo_propose_run", "linggo_results", "skill"]) assert.equal(toolDenial("/r", exec(name)), undefined);
  for (const name of ["bash", "write", "edit"]) assert.match(toolDenial("/r", exec(name)), /presentation/);
});

test("an agent proposal runs only after the user's confirmed preview; results are validated and replayable", { skip: !ready && "no Python data environment" }, async () => {
  const h = await host();
  try {
    assert.deepEqual(h.skills.map((s) => s.name).sort(), ["linggo-custom-algorithm", "linggo-data-import", "linggo-drt", "linggo-fleet-timetable", "linggo-network-analysis"]);
    assert.ok(h.skills.every((s) => s.content.length > 100 && !s.content.includes("{{")));
    const project = await h.call("createProject", { name: "虚构城" });
    await importStops(h, project.id);
    const exec = { agent: { sessionId: "sess-1", session: { header: { cwd: join(h.home, "linggo", "projects", project.id, "presentation") } } } };

    const list = await h.tools.linggo_algorithms.execute({}, exec);
    assert.deepEqual(list.algorithms.map((a) => a.id), ["drt_insertion", "fleet_assignment", "trip_generation"]);
    assert.equal((await h.tools.linggo_propose_run.execute({ algorithm: "drt_insertion", params: { fleet_size: 0 } }, exec)).ok, false);
    const proposed = await h.tools.linggo_propose_run.execute(
      { algorithm: "drt_insertion", batch: [{ demand_source: "synthetic", synthetic_requests: 30, fleet_size: 3 }, { demand_source: "synthetic", synthetic_requests: 30, fleet_size: 6 }], reason: "对比车队规模" },
      exec,
    );
    assert.equal(proposed.ok, true);
    // Proposing never runs anything.
    assert.equal((await h.call("runs", { projectId: project.id })).length, 0);
    const [proposal] = await h.call("proposals", { projectId: project.id });
    assert.equal(proposal.paramSets.length, 2);

    const input = { projectId: project.id, algorithmId: proposal.algorithmId, paramSets: proposal.paramSets, proposalId: proposal.id };
    await assert.rejects(h.call("startRun", { ...input, previewToken: "x" }), /预览/);
    const preview = await h.call("previewRun", input);
    assert.ok(preview.warnings.some((w) => w.includes("实验")));
    // Changed parameters need a new preview.
    await assert.rejects(h.call("startRun", { ...input, paramSets: [proposal.paramSets[0]], previewToken: preview.previewToken }), /预览/);
    const job = await h.call("startRun", { ...input, previewToken: preview.previewToken });
    const finished = await h.done(project.id, job.id);
    assert.equal(finished.status, "done", finished.error);
    assert.equal((await h.call("proposals", { projectId: project.id })).length, 0);

    const runs = await h.call("runs", { projectId: project.id });
    assert.equal(runs.length, 2);
    assert.ok(runs.every((r) => r.synthetic && r.validation.ok && r.proposalId === proposal.id));
    const { result } = await h.call("runResult", { projectId: project.id, runId: runs[0].id });
    assert.ok(result.vehicles.length > 0);
    const read = await h.tools.linggo_results.execute({ run_id: runs[0].id }, exec);
    assert.equal(read.synthetic, true);
    assert.ok(read.assumptions.some((a) => a.includes("实验生成")));
    assert.equal((await h.tools.linggo_map.execute({ action: "show_run", id: runs[0].id }, exec)).ok, true);
    assert.equal((await h.tools.linggo_map.execute({ action: "show_run", id: "nope" }, exec)).ok, false);

    // Fleet assignment needs a timetable: blocked in preview, refused on start.
    const fleet = await h.call("previewRun", { projectId: project.id, algorithmId: "fleet_assignment", params: {} });
    assert.equal(fleet.previewToken, null);
    assert.ok(fleet.blocking.some((b) => b.includes("时刻表")));
  } finally {
    await h.dispose();
  }
});

test("a user algorithm registers exactly the reviewed source and stops running once changed", { skip: !ready && "no Python data environment" }, async () => {
  const h = await host();
  try {
    const project = await h.call("createProject", { name: "自定义城" });
    const file = join(h.home, "mine.py");
    await copyFile(TEMPLATE, file);
    const shown = await h.call("algorithmSource", { projectId: project.id, path: file });
    assert.equal(shown.sha256, createHash("sha256").update(await readFile(file)).digest("hex"));
    assert.match(shown.warning, /不等于代码安全/);
    await writeFile(file, shown.source + "\n# edited after review\n");
    await assert.rejects(h.call("registerAlgorithm", { projectId: project.id, path: file, sha256: shown.sha256 }), /已改变/);
    await writeFile(file, shown.source);
    const registered = await h.call("registerAlgorithm", { projectId: project.id, path: file, sha256: shown.sha256 });
    assert.equal(registered.meta.kind, "drt");
    const listed = await h.call("algorithms", { projectId: project.id });
    assert.equal(listed.at(-1).source, "user");

    // Bad interfaces are refused and leave no copy behind.
    const bad = join(h.home, "bad.py");
    await writeFile(bad, "META = {'id': 'x', 'name': 'x', 'kind': 'teleport'}\ndef run(i, p, c):\n    return {}\n");
    const badShown = await h.call("algorithmSource", { projectId: project.id, path: bad });
    await assert.rejects(h.call("registerAlgorithm", { projectId: project.id, path: bad, sha256: badShown.sha256 }), /kind/);
    const dir = join(h.home, "linggo", "projects", project.id, "algorithms");
    assert.deepEqual(await readdir(dir), [`${registered.id}.py`]);

    // The template needs demand; without it the preview is blocked and carries the code warning.
    const preview = await h.call("previewRun", { projectId: project.id, algorithmId: registered.id, params: {} }).catch((e) => e);
    assert.match(String(preview.message ?? ""), /数据版本/);
    await h.call("removeAlgorithm", { projectId: project.id, id: registered.id });
    assert.equal(existsSync(join(dir, `${registered.id}.py`)), false);
  } finally {
    await h.dispose();
  }
});
