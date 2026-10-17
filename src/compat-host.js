import { BUILD, capabilities, compatibilityConfig, missingCapabilities } from "./compatibility.js";

export const hostCapabilities = (ctx) => capabilities(ctx, compatibilityConfig.hostRequired, compatibilityConfig.hostOptional);
export async function hostCompatibility(ctx, operations) {
  let runtime = null;
  try { runtime = (await import("@deepseek-ai/dsh-app-boot")).getDshRuntimeVersion(); } catch { /* Diagnostic only, never infer a version. */ }
  return { ...BUILD, runtime, capabilities: hostCapabilities(ctx), operations: [...operations] };
}
/** Missing security hooks must stop activation before business APIs are exposed. */
export function requireHostCapabilities(ctx) {
  const missing = missingCapabilities(hostCapabilities(ctx));
  if (missing.length) throw Error(`LingGo: required DSH security/transport APIs unavailable: ${missing.join(", ")}`);
}

export function authenticatedWorkbenchUrl(ctx, desktop) {
  if (!ctx.webServer || typeof ctx.connection?.authenticatedUrl !== "function")
    throw Error("This DSH Host cannot create an authenticated browser link; open LingGo from DSH Web");
  const url = new URL(ctx.connection.authenticatedUrl(`http://127.0.0.1:${ctx.webServer.port}/`));
  url.hash = desktop === true ? "linggo=1&desktopReturn=1" : "linggo=1";
  return url.href;
}
