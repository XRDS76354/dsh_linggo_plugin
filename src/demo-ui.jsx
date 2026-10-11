import React, { useEffect, useState } from "react";
const h = React.createElement;

export const demoStyle = `.linggo-python-setup{padding:12px;border:1px solid var(--c-line);border-radius:8px;font-size:12px;margin:10px 0}.linggo-demo-opening{padding:12px 0;border-bottom:1px solid var(--c-line);margin-bottom:16px}.linggo-demo-badge{font-size:11px;margin-left:8px;color:var(--c-sub)}`;

export function PythonSetup({ t, api, project, onReady }) {
  const [job, setJob] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!job || job.status !== "running") return;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const jobs = await api("jobs", { projectId: job.projectId ?? project });
        const next = jobs.find((x) => x.id === job.id);
        if (stopped || !next) return;
        setJob(next);
        if (next.status === "done") onReady?.();
        if (next.status === "failed" || next.status === "cancelled")
          setError(next.error || t("demo.setupCancelled"));
      } catch (e) {
        if (!stopped) setError(e.message);
      }
    }, 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [job?.id, job?.status, project]);
  return h(
    "div",
    { className: "linggo-python-setup", role: "status" },
    h("strong", null, t("demo.pythonNeeded")),
    h("p", null, t("demo.pythonHelp")),
    h(
      "button",
      {
        disabled: job?.status === "running",
        onClick: async () => {
          setError("");
          try {
            setJob(await api("setupPython", { projectId: project }));
          } catch (e) {
            setError(e.message);
          }
        },
      },
      job?.status === "running" ? t("demo.preparing") : t("demo.setupPython"),
    ),
    error && h("p", { className: "linggo-error" }, error),
  );
}
