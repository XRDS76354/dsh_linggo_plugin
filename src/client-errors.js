/** A freshly served client can connect to a Host that has not restarted after a linked-package update. */
const MANAGEMENT = new Set([
  "previewDeleteData",
  "deleteData",
  "setJobsHidden",
]);
export function clientError(operation, error, t) {
  const message = String(error?.message ?? error);
  if (
    MANAGEMENT.has(operation) &&
    /(?:HTTP\s*404\b|status(?:\s*code)?\s*[:=]?\s*404\b)/i.test(message)
  ) {
    return new Error(t("manage.hostRestartRequired"));
  }
  return error instanceof Error ? error : new Error(message);
}
