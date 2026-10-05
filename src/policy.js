import { resolve, relative, isAbsolute } from "node:path";
/** True only for the dedicated presentation-session directory, including descendants. */
export function isPresentationDirectory(root, cwd) {
  if (typeof cwd !== "string" || !isAbsolute(cwd)) return false;
  const rel = relative(resolve(root), resolve(cwd));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}
/** Scope follows durable Host session metadata; it never trusts a page URL. */
export function toolDenial(root, execution) {
  if (!isPresentationDirectory(root, execution.agent?.session.header.cwd))
    return;
  if (!["linggo_status"].includes(execution.name))
    return "LingGo presentation sessions may only use registered transit tools. Open a development session for coding.";
}
