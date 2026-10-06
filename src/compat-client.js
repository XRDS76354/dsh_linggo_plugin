/** Public DSH integration seams. Business UI must not select an implementation by version. */
export const FRAME_SELECTOR = "div:has(> [data-rightbar-col])";
export function applyPresentationGeometry(
  document,
  geometry,
  { view, focus, chatOpen },
) {
  const root = document.documentElement;
  root.style.setProperty("--linggo-left", `${geometry.left}px`);
  root.style.setProperty("--linggo-reserved", `${geometry.reserved}px`);
  root.style.setProperty(
    "--linggo-width",
    `${geometry.mobile || focus === "chat" ? 0 : geometry.reserved + (focus === "map" ? 0 : 8)}px`,
  );
  root.setAttribute("data-linggo-focus", focus);
  root.setAttribute("data-linggo-view", view);
  root.toggleAttribute(
    "data-linggo-chat-closed",
    focus === "map" || (focus === "normal" && !chatOpen),
  );
  return () => {
    for (const key of ["--linggo-left", "--linggo-reserved", "--linggo-width"])
      root.style.removeProperty(key);
    for (const key of [
      "data-linggo-focus",
      "data-linggo-view",
      "data-linggo-chat-closed",
    ])
      root.removeAttribute(key);
  };
}

export function createClientAdapter(ctx, { api, t, source = "linggo" }) {
  const required = {
    "uiWorkspace.openSession": ctx.uiWorkspace?.openSession,
    "uiWorkspace.openWorkspace": ctx.uiWorkspace?.openWorkspace,
    "sessions.create": ctx.sessions?.create,
    "sessions.using": ctx.sessions?.using,
    "sessions.binding": ctx.sessions?.binding,
    "sessions.list.getSnapshot": ctx.sessions?.list?.getSnapshot,
    "workspaces.create": ctx.workspaces?.create,
    "workspaces.rename": ctx.workspaces?.rename,
    "workspaces.list.getSnapshot": ctx.workspaces?.list?.getSnapshot,
    "slots.inject": ctx.slots?.inject,
    "slots.register": ctx.slots?.register,
  };
  const missing = Object.entries(required)
    .filter(([, fn]) => typeof fn !== "function")
    .map(([key]) => key);
  if (missing.length)
    throw Error(`LingGo: missing required DSH APIs: ${missing.join(", ")}`);

  const capabilities = Object.freeze({
    draftInitialization:
      typeof ctx.conversation?.input?.requestDraftInitialization === "function",
  });
  const openSession = (id) => ctx.uiWorkspace.openSession(id);
  const workspaceFor = async (project, mode = "development") => {
    const { cwd } = await api("directory", { projectId: project.id, mode });
    const view = await ctx.workspaces.create({ path: cwd });
    const title = t(
      mode === "development" ? "dev.workspaceTitle" : "wb.workspaceTitle",
      { name: project.name },
    );
    if (view.title !== title)
      await ctx.workspaces.rename(view.workspaceId, title);
    // Navigation resolves from the published workspace list, rather than the create response.
    for (let i = 0; i < 40; i++) {
      if (
        ctx.workspaces.list
          .getSnapshot()
          .items.some((w) => w.workspaceId === view.workspaceId)
      )
        return view;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw Error(t("dev.workspaceUnavailable"));
  };
  const initializeDraft = (binding, prompt) => {
    // rc.2 lacks the generation-safe draft initializer. Keep its native composer untouched.
    if (!capabilities.draftInitialization) return "manual";
    if (!binding) throw Error(t("dev.draftBlocked"));
    const result = ctx.conversation.input.requestDraftInitialization(binding, {
      prompt,
    });
    if (!["applied", "preserved"].includes(result))
      throw Error(t("dev.draftBlocked"));
    return result;
  };
  const newPresentation = async (projectId) => {
    const project = (await api("state")).projects.find(
      (p) => p.id === projectId,
    );
    if (!project) throw Error(t("dev.unknownProject"));
    const workspace = await workspaceFor(project, "presentation");
    return openSession(
      await ctx.sessions.create({ workspaceId: workspace.workspaceId }),
    );
  };
  const openHandoff = async (item, project, prompt) => {
    if (!project) throw Error(t("dev.unknownProject"));
    const workspace = await workspaceFor(project);
    if (
      item.devSessionId &&
      ctx.sessions.list.getSnapshot().byId[item.devSessionId]
    ) {
      return ctx.sessions.using(item.devSessionId, { source }, async (ref) => {
        await ref.ready;
        const result = initializeDraft(ref.binding, prompt);
        await openSession(item.devSessionId);
        return result;
      });
    }
    let devSessionId, outcome;
    await ctx.uiWorkspace.openWorkspace(workspace.workspaceId, (id) => {
      devSessionId = id;
      outcome = initializeDraft(ctx.sessions.binding(id), prompt);
    });
    if (!devSessionId) throw Error(t("dev.draftBlocked"));
    await api("handoffOpened", { id: item.id, devSessionId });
    return outcome;
  };
  const mountWorkbench = (props, component) =>
    ctx.slots.inject("shell.overlay", () =>
      ctx.slots.register(
        {
          name: "shell.overlay",
          id: "linggo-workbench",
          inject: () => ({ ...props }),
        },
        component,
      ),
    );
  const mountDevelopment = (props, component, icon) => {
    ctx.slots.inject("main", () =>
      ctx.slots.register(
        { name: "main", key: "linggo", inject: () => ({ ...props }) },
        component,
      ),
    );
    ctx.slots.inject("sidebar.panellist", () =>
      ctx.slots.register(
        {
          name: "sidebar.panellist",
          id: "linggo",
          order: 10,
          label: () => t("panel"),
        },
        icon,
      ),
    );
  };
  return {
    capabilities,
    openSession,
    newPresentation,
    openHandoff,
    mountWorkbench,
    mountDevelopment,
  };
}

export function installPresentationStyle(document, style, enabled) {
  const el = document.createElement("style");
  el.dataset.linggo = "";
  el.textContent = style;
  document.head.append(el);
  if (enabled) document.documentElement.setAttribute("data-linggo", "");
  return () => {
    el.remove();
    for (const key of ["--linggo-left", "--linggo-reserved", "--linggo-width"]) document.documentElement.style.removeProperty(key);
    for (const key of [
      "data-linggo",
      "data-linggo-blocked",
      "data-linggo-view",
      "data-linggo-focus",
      "data-linggo-chat-closed",
    ])
      document.documentElement.removeAttribute(key);
  };
}
