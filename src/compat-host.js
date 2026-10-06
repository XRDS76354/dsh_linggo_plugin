/** Missing security hooks must stop activation before business APIs are exposed. */
export function requireHostCapabilities(ctx) {
  const required = {
    "tools.guard": ctx.tools?.guard,
    "tools.register": ctx.tools?.register,
    "connection.fetch.register": ctx.connection?.fetch?.register,
  };
  const missing = Object.entries(required).filter(([, fn]) => typeof fn !== "function").map(([key]) => key);
  if (missing.length) throw Error(`LingGo: required DSH security/transport APIs unavailable: ${missing.join(", ")}`);
}

export function authenticatedWorkbenchUrl(ctx, desktop) {
  if (!ctx.webServer || typeof ctx.connection?.authenticatedUrl !== "function")
    throw Error("This DSH Host cannot create an authenticated browser link; open LingGo from DSH Web");
  const url = new URL(ctx.connection.authenticatedUrl(`http://127.0.0.1:${ctx.webServer.port}/`));
  url.hash = desktop === true ? "linggo=1&desktopReturn=1" : "linggo=1";
  return url.href;
}
