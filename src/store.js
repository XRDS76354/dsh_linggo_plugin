import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export function nonempty(value, label, max = 4000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw Error(`Invalid ${label}`);
  return value.trim();
}
/** Serial atomic updates; an interrupted write never replaces the last valid state. */
export class Store {
  constructor(root) {
    this.root = root;
    this.tail = Promise.resolve();
  }
  async read() {
    try {
      return JSON.parse(await readFile(join(this.root, "state.json"), "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") return { schema: 1, projects: [], handoffs: [] };
      throw e;
    }
  }
  update(fn) {
    const job = this.tail.then(async () => {
      const state = await this.read();
      const result = await fn(state);
      await mkdir(this.root, { recursive: true });
      const temp = join(this.root, `.state-${randomUUID()}.tmp`);
      await writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
      await rename(temp, join(this.root, "state.json"));
      return result;
    });
    this.tail = job.catch(() => {});
    return job;
  }
  async createProject(input) {
    const name = nonempty(input.name, "project name", 100);
    return this.update(async (s) => {
      const project = {
        id: randomUUID(),
        name,
        createdAt: new Date().toISOString(),
      };
      await mkdir(join(this.root, "projects", project.id, "presentation"), {
        recursive: true,
      });
      await mkdir(join(this.root, "projects", project.id, "development"), {
        recursive: true,
      });
      s.projects.push(project);
      return project;
    });
  }
  async createHandoff(input) {
    const summary = nonempty(input.summary, "summary");
    return this.update((s) => {
      if (!s.projects.some((p) => p.id === input.projectId))
        throw Error("Unknown project");
      const handoff = {
        id: randomUUID(),
        projectId: input.projectId,
        summary,
        createdAt: new Date().toISOString(),
      };
      s.handoffs.push(handoff);
      return handoff;
    });
  }
}
