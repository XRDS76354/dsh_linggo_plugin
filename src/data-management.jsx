import React, { useEffect, useState } from "react";
import { Modal } from "./workbench-ui.jsx";
import { datasetLabel } from "./sidebar-model.js";
const h = React.createElement;

export function DataManager({ t, api, project, datasets, onClose, refresh }) {
  const [ids, setIds] = useState([]),
    [plan, setPlan] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const act = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const preview = (mode) =>
    act(async () =>
      setPlan(
        await api("previewDeleteData", { projectId: project, mode, ids }),
      ),
    );
  const close = () => {
    if (!busy) onClose();
  };
  return h(
    Modal,
    {
      title: t(plan ? "manage.confirmDelete" : "manage.datasets"),
      onClose: close,
      closeLabel: t("common.cancel"),
    },
    h("p", null, t("manage.sourcePreserved")),
    error && h("p", { role: "alert", className: "linggo-error" }, error),
    plan
      ? h(
          React.Fragment,
          null,
          h(
            "p",
            null,
            t("manage.deleteCounts", {
              datasets: plan.datasetCount,
              results: plan.resultCount,
            }),
          ),
          h(
            "ul",
            null,
            ...datasets
              .filter((v) => plan.ids.includes(v.id))
              .map((v) =>
                h(
                  "li",
                  { key: v.id },
                  datasetLabel(t, v) +
                    " · " +
                    new Date(v.createdAt).toLocaleString(),
                ),
              ),
          ),
          h(
            "p",
            null,
            t("manage.afterDelete", {
              value: plan.nextVersionId
                ? datasetLabel(
                    t,
                    datasets.find((v) => v.id === plan.nextVersionId),
                  )
                : t("wb.noData"),
            }),
          ),
          h(
            "div",
            { className: "linggo-manage-actions" },
            h(
              "button",
              { disabled: busy, onClick: () => setPlan(null), autoFocus: true },
              t("common.cancel"),
            ),
            h(
              "button",
              {
                disabled: busy,
                className: "linggo-danger",
                onClick: () =>
                  act(async () => {
                    try {
                      await api("deleteData", plan);
                    } catch (e) {
                      setPlan(null);
                      await refresh();
                      throw e;
                    }
                    await refresh();
                    onClose();
                  }),
              },
              t("manage.deleteConfirm"),
            ),
          ),
        )
      : h(
          React.Fragment,
          null,
          h(
            "ul",
            { className: "linggo-manage-list" },
            ...datasets
              .slice()
              .reverse()
              .map((v) =>
                h(
                  "li",
                  { key: v.id },
                  h(
                    "label",
                    null,
                    h("input", {
                      type: "checkbox",
                      checked: ids.includes(v.id),
                      disabled: busy,
                      onChange: (e) =>
                        setIds((old) =>
                          e.target.checked
                            ? [...old, v.id]
                            : old.filter((id) => id !== v.id),
                        ),
                    }),
                    datasetLabel(t, v),
                    h("small", null, new Date(v.createdAt).toLocaleString()),
                  ),
                ),
              ),
          ),
          h(
            "div",
            { className: "linggo-manage-actions" },
            h(
              "button",
              {
                disabled: busy || !ids.length,
                onClick: () => preview("selected"),
              },
              t("manage.deleteSelected"),
            ),
            h(
              "button",
              {
                disabled: busy || !datasets.length,
                onClick: () => preview("all"),
              },
              t("manage.deleteAll"),
            ),
            h(
              "button",
              {
                disabled:
                  busy ||
                  !datasets.some(
                    (v) =>
                      v.imports?.length &&
                      v.provenance?.origin !== "bundled-demo",
                  ),
                onClick: () => preview("undo"),
              },
              t("manage.undo"),
            ),
          ),
        ),
  );
}

export function TaskManager({ t, api, project, onClose, refresh }) {
  const [jobs, setJobs] = useState([]),
    [ids, setIds] = useState([]),
    [hidden, setHidden] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = () =>
    api("jobs", { projectId: project, includeHidden: true }).then(setJobs);
  useEffect(() => {
    let live = true;
    api("jobs", { projectId: project, includeHidden: true }).then(
      (items) => live && setJobs(items),
      (e) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [project]);
  const rows = jobs.filter(
    (j) =>
      ["done", "failed", "cancelled"].includes(j.status) &&
      !!j.hidden === hidden,
  );
  const update = async () => {
    setBusy(true);
    setError("");
    try {
      await api("setJobsHidden", { projectId: project, ids, hidden: !hidden });
      await load();
      await refresh();
      setIds([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return h(
    Modal,
    {
      title: t("manage.tasks"),
      onClose: () => !busy && onClose(),
      closeLabel: t("common.cancel"),
    },
    h("p", null, t("manage.taskNote")),
    error && h("p", { role: "alert", className: "linggo-error" }, error),
    h(
      "div",
      { className: "linggo-manage-actions" },
      h(
        "button",
        {
          "aria-pressed": !hidden,
          onClick: () => {
            setHidden(false);
            setIds([]);
          },
        },
        t("manage.visible"),
      ),
      h(
        "button",
        {
          "aria-pressed": hidden,
          onClick: () => {
            setHidden(true);
            setIds([]);
          },
        },
        t("manage.hidden"),
      ),
    ),
    h(
      "div",
      { className: "linggo-manage-actions" },
      ...["done", "failed", "cancelled"].map((status) =>
        h(
          "button",
          {
            key: status,
            onClick: () =>
              setIds(rows.filter((j) => j.status === status).map((j) => j.id)),
          },
          t("manage.selectStatus", { value: t("job." + status) }),
        ),
      ),
    ),
    h(
      "ul",
      { className: "linggo-manage-list" },
      ...rows.map((j) =>
        h(
          "li",
          { key: j.id },
          h(
            "label",
            null,
            h("input", {
              type: "checkbox",
              checked: ids.includes(j.id),
              disabled: busy,
              onChange: (e) =>
                setIds((old) =>
                  e.target.checked
                    ? [...old, j.id]
                    : old.filter((id) => id !== j.id),
                ),
            }),
            j.title,
            h("small", null, t("job." + j.status)),
          ),
        ),
      ),
    ),
    !rows.length && h("p", null, t("wb.noTasks")),
    h(
      "div",
      { className: "linggo-manage-actions" },
      h(
        "button",
        { disabled: busy || !ids.length, onClick: update },
        t(hidden ? "manage.restore" : "manage.clearSelected"),
      ),
    ),
  );
}

export const managementStyle = `
.linggo-manage-list{list-style:none;padding:0;margin:12px 0;max-height:40vh;overflow:auto;}
.linggo-manage-list label{display:flex;gap:8px;align-items:center;padding:8px 0;overflow-wrap:anywhere;}
.linggo-manage-list input[type="checkbox"]{width:16px;min-width:16px;margin:0;flex:none;}
.linggo-manage-list small{margin-left:auto;white-space:nowrap;color:var(--c-sub);}
.linggo-manage-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
.linggo-manage-actions .linggo-danger{color:var(--c-err);border-color:var(--c-err);}
`;
