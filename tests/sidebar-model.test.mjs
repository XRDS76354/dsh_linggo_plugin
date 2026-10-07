import test from "node:test";
import assert from "node:assert/strict";
import { limitSidebarRows, projectDatasets, datasetSummary, newestJobs, isActiveJob, observeJobAttention } from "../src/sidebar-model.js";
import { zh } from "../src/locales.js";

const t = (key) => zh[key] ?? key;
const storage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
const job = (id, status = "running", projectId = "a", extra = {}) => ({
  id, status, projectId, createdAt: "2026-10-07T00:00:00Z", ...extra,
});

test("sidebar pagination preserves current/running items outside the ordinary quota", () => {
  const rows = Array.from({ length: 14 }, (_, id) => ({ id }));
  const keep = (row) => [0, 13].includes(row.id);
  const first = limitSidebarRows(rows, 5, keep);
  assert.deepEqual(first.rows.map((row) => row.id), [0, 1, 2, 3, 4, 5, 13]);
  assert.equal(first.hiddenCount, 7);
  assert.equal(limitSidebarRows(rows, 10, keep).hiddenCount, 2);
  assert.equal(limitSidebarRows(rows, 15, keep).hiddenCount, 0);
  assert.equal(rows.length, 14);
});

test("datasets remain project-scoped, selectable, and fall back to the same newest data as the map", () => {
  const state = { projects: [{ id: "a", currentVersionId: "old" }], dataVersions: [
    { id: "old", projectId: "a", entities: { stops: { rows: 2097 } } },
    { id: "new", projectId: "a", entities: { routes: { rows: 531 }, stops: { rows: 2097 }, route_stops: { rows: 8000 } } },
    { id: "other", projectId: "b", entities: {} },
  ] };
  assert.equal(projectDatasets(state, "a").current.id, "old");
  state.projects[0].currentVersionId = "deleted";
  const { datasets, current } = projectDatasets(state, "a");
  assert.equal(datasets.length, 2);
  assert.equal(current.id, "new");
  assert.equal(datasetSummary(t, current), "站点 · 线路 · 线路站序 · 站点 2,097 · 线路 531");
  assert.equal(datasetSummary(t, undefined), "尚未导入数据集");
  assert.equal(projectDatasets(state, "missing").current, undefined);
});

test("tasks prioritize activity, retain the latest failure, and bound older history", () => {
  const history = Array.from({ length: 9 }, (_, i) => job(String(i), "done", "a", { finishedAt: `2026-10-07T00:00:0${i}Z` }));
  const rows = newestJobs([...history, job("live"), job("failed", "failed"), job("other", "running", "b")], "a");
  assert.equal(rows[0].id, "live");
  const visible = limitSidebarRows(rows, 5, (row) => isActiveJob(row) || row.id === "failed");
  assert.deepEqual(visible.rows.map((row) => row.id), ["live", "8", "7", "6", "5", "4", "failed"]);
  assert.equal(visible.hiddenCount, 4);
});

test("only new attention events open tasks; progress, reload, completion and project switches do not", () => {
  const store = storage();
  assert.equal(observeJobAttention(store, "a", []).shouldOpen, false);
  let event = observeJobAttention(store, "a", [job("one", "queued")]);
  assert.equal(event.shouldOpen, true);
  event = observeJobAttention(store, "a", [job("one", "running", "a", { progress: 0.5 })], event.tokens);
  assert.equal(event.shouldOpen, false);
  assert.equal(observeJobAttention(store, "a", []).shouldOpen, false);
  assert.equal(observeJobAttention(store, "a", [job("one")]).shouldOpen, false);
  assert.equal(observeJobAttention(store, "b", [job("one")]).shouldOpen, false);
  assert.equal(observeJobAttention(store, "a", [job("one", "failed")]).shouldOpen, true);
  assert.equal(observeJobAttention(store, "a", [job("one", "failed")]).shouldOpen, false);
  assert.equal(observeJobAttention(store, "a", [job("one", "done")]).shouldOpen, false);
  assert.equal(observeJobAttention(store, "a", [job("two")]).shouldOpen, true);
  assert.equal(observeJobAttention(store, "b", [job("one", "failed", "b")]).shouldOpen, true);
});

test("malformed or unavailable storage cannot break task attention", () => {
  const store = storage();
  const key = "linggo.section.jobs.attention.a";
  for (const value of ["{broken", "null", "true", '[null,3,"bad"]']) {
    store.setItem(key, value);
    assert.equal(observeJobAttention(store, "a", [job("new")]).shouldOpen, true);
  }
  const unavailable = { getItem() { throw Error("denied"); }, setItem() { throw Error("denied"); } };
  const event = observeJobAttention(unavailable, "a", [job("new")]);
  assert.equal(event.shouldOpen, true);
  assert.equal(observeJobAttention(unavailable, "a", [job("new")], event.tokens).shouldOpen, false);
});
