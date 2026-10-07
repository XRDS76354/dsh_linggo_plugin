import { readPreference, writePreference } from "./layout.js";

export const SIDEBAR_PAGE_SIZE = 5;

export const ENTITY_ORDER = [
  "stops", "routes", "route_stops", "trips", "ridership", "od",
  "demand", "gps", "vehicles", "depots",
];

/** Keep selected/active rows visible without consuming the ordinary row quota. */
export function limitSidebarRows(rows, limit, keep = () => false) {
  let ordinary = 0;
  const visible = rows.filter((row) => keep(row) || ordinary++ < limit);
  return { rows: visible, hiddenCount: rows.length - visible.length };
}

export function projectDatasets(state, projectId) {
  const datasets = state.dataVersions.filter((item) => item.projectId === projectId);
  const currentId = state.projects.find((item) => item.id === projectId)?.currentVersionId;
  return {
    datasets,
    current: datasets.find((item) => item.id === currentId) ?? datasets.at(-1),
  };
}

function datasetEntities(dataset) {
  return ENTITY_ORDER.filter((key) => dataset.entities?.[key]);
}

export function datasetLabel(t, dataset) {
  const entities = datasetEntities(dataset);
  return entities.length
    ? entities.slice(0, 3).map((key) => t("entity." + key)).join(" · ") +
        (entities.length > 3 ? " …" : "")
    : dataset.id.slice(0, 8);
}

export function datasetSummary(t, dataset) {
  if (!dataset) return t("wb.noData");
  const counts = datasetEntities(dataset).slice(0, 2).map((key) =>
    t("entity." + key) + " " + dataset.entities[key].rows.toLocaleString(),
  );
  return [datasetLabel(t, dataset), ...counts].join(" · ");
}

export function isActiveJob(job) {
  return job.status === "running" || job.status === "queued";
}

export function newestJobs(jobs, projectId) {
  return jobs.filter((job) => job.projectId === projectId).slice().sort((a, b) =>
    Number(isActiveJob(b)) - Number(isActiveJob(a)) ||
    (b.finishedAt ?? b.createdAt).localeCompare(a.finishedAt ?? a.createdAt),
  );
}

/** Progress updates are not attention events; a failure after running is one. */
export function observeJobAttention(storage, projectId, jobs, previous) {
  const key = "linggo.section.jobs.attention." + projectId;
  const stored = previous ?? readPreference(storage, key, []);
  const seen = new Set(Array.isArray(stored)
    ? stored.filter((token) => typeof token === "string" && /^(active|failed):.+/.test(token))
    : []);
  let shouldOpen = false;
  for (const job of jobs) {
    if (job.projectId !== projectId) continue;
    const phase = isActiveJob(job) ? "active" : job.status === "failed" ? "failed" : null;
    if (!phase) continue;
    const token = phase + ":" + job.id;
    if (!seen.has(token)) {
      seen.add(token);
      shouldOpen = true;
    }
  }
  const tokens = [...seen];
  // In particular, a temporary empty list while switching projects never clears this.
  if (shouldOpen) writePreference(storage, key, tokens);
  return { tokens, shouldOpen };
}
