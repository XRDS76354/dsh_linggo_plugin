import React from "react";
const h = React.createElement;

/** Render only the plugin's durable local introduction through DSH's public keyed node seat.
 * Ordinary injected context is hidden by DSH's Chat visibility policy on both supported versions.
 * This contribution does not replace any native message, composer or tool renderer.
 */
export function installDemoIntroduction(ctx) {
  const dispose = ctx.uiConversation.events.register({
    kind: "linggo-demo-introduction",
    target: "chat",
    match: (event) => event.type === "user/message" && event.surfaceOp === "append" && event.data.source?.kind === "linggo-demo"
      ? { id: String(event.data.id), role: "start" } : null,
    start: (_context, match) => match.event.data,
    update: (context) => context.state,
    buildViewNode: (context) => ({
      key: context.key, id: context.id, target: "chat", kind: "linggo-demo-introduction",
      anchorSeq: context.start.event.seq, visibility: "visible", location: { kind: "session" }, data: context.state,
    }),
  });
  ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({ name: "conversation.chat.node", key: "linggo-demo-introduction" },
    ({ node }) => h("section", { "aria-label": "插件内置说明 · 真实线网地图演示", style: { padding: "16px 0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" } },
      ...node.data.content.filter((b) => b.type === "text").map((b, i) => h("p", { key: i, style: { margin: 0 } }, b.text)))));
  return dispose;
}
