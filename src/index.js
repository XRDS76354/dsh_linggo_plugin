import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { Store } from "./store.js";
import { PRESENTATION_TOOLS, presentationOf, toolDenial } from "./policy.js";

export const name = "linggo";
export const inject = {
  tools: { required: true },
  connection: { required: true },
  webServer: { required: false },
  agents: { required: false },
};

const PRESENTATION_PROMPT = `You are the LingGo transit workbench assistant in a presentation session.
Only use LingGo tools to query project data, operate the map and run registered tasks.
You cannot run shell commands or edit code here. When the user asks for code changes or new features,
suggest the "交接给开发工作台" (development handoff) action on the left panel instead.
Never invent transit data: when data is missing, say which data the project needs.`;

export const OPERATIONS = [
  "launch",
  "state",
  "createProject",
  "directory",
  "handoff",
  "handoffOpened",
  "handoffArchive",
];

export async function apply(ctx) {
  const root = join(process.env.DSH_HOME || join(homedir(), ".dsh"), "linggo");
  await mkdir(join(root, "projects"), { recursive: true });
  const store = new Store(root);

  // Final authority: every tool execution, including PTC sub-calls, passes this guard.
  ctx.effect(() => ctx.tools.guard((exec) => toolDenial(root, exec)));

  ctx.tools.register(
    defineTool({
      name: "linggo_status",
      description:
        "Read the current LingGo project and its data readiness. Does not import or invent transit data.",
      parameters: {},
      output: {
        schema: {
          type: "object",
          properties: {
            stage: { type: "string", required: true },
            projectId: { type: "string" },
            projectName: { type: "string" },
            dataReady: { type: "boolean", required: true },
            missing: { type: "array", items: { type: "string" }, required: true },
          },
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
      },
      execute: async (_args, exec) => {
        const scope = presentationOf(root, exec?.agent?.session?.header?.cwd);
        const state = await store.read();
        const project = state.projects.find((p) => p.id === scope?.projectId);
        const versions = state.dataVersions.filter((v) => v.projectId === project?.id);
        return {
          stage: "integration",
          ...(project ? { projectId: project.id, projectName: project.name } : {}),
          dataReady: versions.length > 0,
          missing: versions.length > 0 ? [] : ["published data version"],
        };
      },
    }),
  );

  // Hide non-transit tools and explain the boundary; the guard above still decides.
  const installed = new Map();
  const install = (agent) => {
    if (installed.has(agent) || !presentationOf(root, agent.session?.header?.cwd)) return;
    const lifts = [agent.ctx.tools.restrict({ allow: PRESENTATION_TOOLS })];
    const fiber = agent.ctx.inject(["systemPrompt"], (scope) => {
      scope.systemPrompt.section({
        name: "linggo:presentation",
        order: scope.systemPrompt.getSectionOrder("TOOLS_SDK") + 1,
        text: PRESENTATION_PROMPT,
        interpolate: false,
      });
    });
    lifts.push(() => fiber.dispose());
    installed.set(agent, lifts);
  };
  ctx.on("agent/created", ({ agent }) => install(agent));
  ctx.on("agent/disposed", ({ agent }) => installed.delete(agent));
  if (ctx.agents) for (const agent of ctx.agents.list()) install(agent);
  // Live restrictions stay until the agent ends (fail closed); only the prompt fibers belong to this plugin.
  ctx.effect(() => () => {
    for (const lifts of installed.values()) void lifts[1]?.();
    installed.clear();
  });

  const requireProject = (state, id) => {
    const project = state.projects.find((p) => p.id === id);
    if (!project) throw Error("Unknown project");
    return project;
  };

  const handle = async (operation, input) => {
    switch (operation) {
      case "launch": {
        if (!ctx.webServer) throw Error("This DSH Host has no web server; open LingGo from DSH Web");
        const url = new URL(ctx.connection.authenticatedUrl(`http://127.0.0.1:${ctx.webServer.port}/`));
        url.hash = input.desktop === true ? "linggo=1&desktopReturn=1" : "linggo=1";
        return { url: url.href };
      }
      case "state":
        return store.read();
      case "createProject":
        return store.createProject(input);
      case "directory": {
        requireProject(await store.read(), input.projectId);
        if (!["presentation", "development"].includes(input.mode)) throw Error("Invalid session mode");
        const cwd = store.projectDir(input.projectId, input.mode);
        await mkdir(cwd, { recursive: true });
        return { cwd };
      }
      case "handoff":
        return store.createHandoff(input);
      case "handoffOpened":
        return store.markHandoffOpened(input);
      case "handoffArchive":
        return store.archiveHandoff(input);
    }
  };

  for (const operation of OPERATIONS) {
    ctx.connection.fetch.register({
      path: `/api/linggo.${operation}`,
      methods: ["POST"],
      requestBody: "buffered",
      fetch: async (request) => {
        let envelope;
        try {
          envelope = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (
          !envelope ||
          typeof envelope !== "object" ||
          envelope.type !== "client-request" ||
          typeof envelope.rpcId !== "string" ||
          envelope.method !== `linggo.${operation}`
        )
          return new Response("Invalid RPC envelope", { status: 400 });
        let result;
        try {
          request.signal.throwIfAborted();
          const input = envelope.payload && typeof envelope.payload === "object" ? envelope.payload : {};
          result = { ok: true, value: await handle(operation, input) };
        } catch (error) {
          result = { ok: false, error: { code: "LINGGO_REQUEST_FAILED", message: error.message, details: {} } };
        }
        return Response.json({ type: "server-response", rpcId: envelope.rpcId, result });
      },
    });
  }
}
