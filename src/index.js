import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { Store } from "./store.js";
import { toolDenial, isPresentationDirectory } from "./policy.js";
export const name = "linggo";
export const inject = ["tools", "connection", "webServer"];
/** Stage-one capability probe. Project persistence will replace this directory in stage two. */
export async function apply(ctx) {
  const root = join(
    process.env.DSH_HOME || join(homedir(), ".dsh"),
    "linggo",
    "presentation",
  );
  await mkdir(root, { recursive: true });
  ctx.effect(() => ctx.tools.guard((exec) => toolDenial(root, exec)));
  ctx.tools.register(
    defineTool({
      name: "linggo_status",
      description:
        "Read LingGo workbench readiness. Does not import or invent transit data.",
      parameters: {},
      output: {
        schema: {
          type: "object",
          properties: {
            stage: { type: "string", required: true },
            dataReady: { type: "boolean", required: true },
          },
          additionalProperties: false,
        },
        render: (_args, value) => [
          { type: "text", text: JSON.stringify(value) },
        ],
      },
      execute: async () => ({ stage: "integration-preview", dataReady: false }),
    }),
  );
  const store = new Store(join(root, ".."));
  const directories = async () => {
    const state = await store.read();
    return state.projects.map((p) =>
      join(store.root, "projects", p.id, "presentation"),
    );
  };
  let presentationRoots = await directories();
  ctx.effect(() =>
    ctx.tools.guard((exec) =>
      presentationRoots.map((r) => toolDenial(r, exec)).find(Boolean),
    ),
  );
  const handle = async (endpoint, payload, signal) => {
    try {
      signal.throwIfAborted();
      const input = payload && typeof payload === "object" ? payload : {};
      let value;
      if (endpoint === "launch") {
        const url = new URL(
          ctx.connection.authenticatedUrl(
            `http://127.0.0.1:${ctx.webServer.port}/`,
          ),
        );
        url.hash = "linggo=1";
        if (input.desktop === true) url.hash = "linggo=1&desktopReturn=1";
        value = { url: url.href };
      } else if (endpoint === "state") value = await store.read();
      else if (endpoint === "createProject") {
        value = await store.createProject(input);
        presentationRoots = await directories();
      } else if (endpoint === "handoff")
        value = await store.createHandoff(input);
      else if (endpoint === "directory") {
        const state = await store.read();
        if (!state.projects.some((p) => p.id === input.projectId))
          throw Error("Unknown project");
        if (!["presentation", "development"].includes(input.mode))
          throw Error("Invalid session mode");
        value = {
          cwd: join(store.root, "projects", input.projectId, input.mode),
        };
      } else throw Error("Unknown LingGo operation");
      return { ok: true, value };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "LINGGO_REQUEST_FAILED",
          message: error.message,
          details: {},
        },
      };
    }
  };
  for (const operation of [
    "state",
    "createProject",
    "handoff",
    "directory",
    "launch",
  ]) {
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
        const result = await handle(
          operation,
          envelope.payload,
          request.signal,
        );
        return Response.json({
          type: "server-response",
          rpcId: envelope.rpcId,
          result,
        });
      },
    });
  }
  ctx.on("agent/created", ({ agent }) => {
    if (
      [root, ...presentationRoots].some((r) =>
        isPresentationDirectory(r, agent.session.header.cwd),
      )
    ) {
      agent.ctx.tools.restrict({ allow: ["linggo_status"] });
    }
  });
}
