import { realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Tools a presentation-session agent may call. Everything else is denied on the Host. */
export const PRESENTATION_TOOLS = ["linggo_status"];

const folded = process.platform === "darwin" || process.platform === "win32";

function forms(path) {
  const out = new Set([resolve(path)]);
  try {
    out.add(realpathSync.native(path));
  } catch {
    // A deleted or not-yet-created directory keeps its lexical form.
  }
  return [...out].map((p) => (folded ? p.toLowerCase() : p));
}

/**
 * Classify a Session directory against the LingGo root.
 * @returns `{ projectId }` for `projects/<id>/presentation/**`, `{ projectId: null }`
 *   for the legacy `presentation/**` directory, or undefined for every other path.
 */
export function presentationOf(root, cwd) {
  if (typeof cwd !== "string" || !isAbsolute(cwd)) return;
  for (const base of forms(root))
    for (const target of forms(cwd)) {
      const rel = relative(base, target);
      if (!rel || rel.startsWith("..") || isAbsolute(rel)) continue;
      const parts = rel.split(sep);
      if (parts[0] === "presentation") return { projectId: null };
      if (parts[0] === "projects" && parts[1] && parts[2] === "presentation")
        return { projectId: parts[1] };
    }
}

export function isPresentationDirectory(root, cwd) {
  return presentationOf(root, cwd) !== undefined;
}

export function toolDenial(root, execution) {
  if (!isPresentationDirectory(root, execution.agent?.session?.header?.cwd))
    return;
  if (!PRESENTATION_TOOLS.includes(execution.name))
    return "LingGo presentation sessions may only use registered transit tools. Open a development session for coding.";
}
