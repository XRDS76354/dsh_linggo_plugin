window.__ModuleLoader__.load({id:"dsh-linggo-plugin",factory:function(require){var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  draftPrompt: () => draftPrompt,
  inject: () => inject,
  isWorkbenchLocation: () => isWorkbenchLocation
});
module.exports = __toCommonJS(client_exports);
var import_react6 = __toESM(require("react"), 1);

// src/icons.jsx
var import_react = __toESM(require("react"), 1);
var h = import_react.default.createElement;
var P = {
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  folder: "M3 6h6l2 3h10v10H3z",
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  layers: "M12 2 2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  search: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.3-4.3",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2",
  send: "M4 12h16M14 6l6 6-6 6",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  briefcase: "M3 7h18v12H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"
};
function Icon({ name, size = 16, className = "", title }) {
  const d2 = P[name] ?? P.folder;
  return h(
    "svg",
    {
      className: "linggo-icon " + className,
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "butt",
      strokeLinejoin: "miter",
      "aria-hidden": title ? void 0 : true,
      role: title ? "img" : void 0
    },
    title ? h("title", null, title) : null,
    h("path", { d: d2 })
  );
}

// src/locales.js
var zh = {
  panel: "\u516C\u4EA4\u5DE5\u4F5C\u53F0",
  "common.cancel": "\u53D6\u6D88",
  "wb.subtitle": "\u516C\u4EA4\u6570\u636E\u5DE5\u4F5C\u53F0",
  "wb.project": "\u5F53\u524D\u9879\u76EE",
  "wb.noProject": "\u8FD8\u6CA1\u6709\u9879\u76EE\u3002\u4E3A\u4E00\u4E2A\u57CE\u5E02\u6216\u533A\u57DF\u521B\u5EFA\u9879\u76EE\u3002",
  "wb.newProjectName": "\u65B0\u9879\u76EE\u540D\u79F0\uFF08\u57CE\u5E02\u6216\u533A\u57DF\uFF09",
  "wb.createProject": "\u521B\u5EFA\u9879\u76EE",
  "wb.sessions": "\u5C55\u793A\u4F1A\u8BDD",
  "wb.newSession": "\u65B0\u5EFA\u5C55\u793A\u4F1A\u8BDD",
  "wb.noSessions": "\u6B64\u9879\u76EE\u8FD8\u6CA1\u6709\u5C55\u793A\u4F1A\u8BDD\u3002",
  "wb.untitled": "\u672A\u547D\u540D\u4F1A\u8BDD",
  "wb.running": "\u8FD0\u884C\u4E2D",
  "wb.data": "\u6570\u636E",
  "wb.noData": "\u5C1A\u672A\u5BFC\u5165\u6570\u636E\u96C6",
  "wb.versions": "{count} \u4E2A\u6570\u636E\u7248\u672C",
  "wb.tasks": "\u4EFB\u52A1",
  "wb.noTasks": "\u6682\u65E0\u4EFB\u52A1\u3002",
  "wb.handoff": "\u4EA4\u63A5\u7ED9\u5F00\u53D1\u5DE5\u4F5C\u53F0",
  "wb.handoffSummary": "\u5F00\u53D1\u4EFB\u52A1\u6458\u8981",
  "wb.handoffPlaceholder": "\u8BF4\u660E\u9700\u8981\u5728\u5F00\u53D1\u4F1A\u8BDD\u4E2D\u5B9E\u73B0\u6216\u4FEE\u6539\u7684\u529F\u80FD",
  "wb.preview": "\u9884\u89C8\u4EA4\u63A5",
  "wb.previewTitle": "\u4EA4\u63A5\u9884\u89C8",
  "wb.previewNote": "\u786E\u8BA4\u540E\u4EC5\u4FDD\u5B58\u4EA4\u63A5\u8BB0\u5F55\u3002\u8BF7\u5728 DSH \u5F00\u53D1\u9875\u6253\u5F00\uFF1B\u652F\u6301\u65F6\u4F1A\u9884\u586B\u8349\u7A3F\uFF0C\u65E7\u7248\u9700\u590D\u5236\u7C98\u8D34\u3002\u4E0D\u4F1A\u81EA\u52A8\u53D1\u9001\u6216\u6267\u884C\u3002",
  "wb.noSource": "\u6765\u6E90\u5C55\u793A\u4F1A\u8BDD\uFF1A\u65E0",
  "wb.confirm": "\u786E\u8BA4\u4FDD\u5B58\u4EA4\u63A5",
  "wb.handoffSaved": "\u4EA4\u63A5\u5DF2\u4FDD\u5B58\u3002\u8BF7\u5728 DSH \u5F00\u53D1\u9875\u5DE6\u4FA7\u7684\u201C\u516C\u4EA4\u5DE5\u4F5C\u53F0\u201D\u9762\u677F\u4E2D\u6253\u5F00\u3002",
  "wb.return": "\u8FD4\u56DE DSH",
  "wb.devWeb": "\u6253\u5F00 DSH \u5F00\u53D1\u9875",
  "wb.devDesktop": "\u8FD4\u56DE DSH \u684C\u9762",
  "wb.map": "\u5730\u56FE\u4E0E\u5206\u6790",
  "wb.welcome": "\u4F60\u7684\u516C\u4EA4\u6570\u636E\u5DE5\u4F5C\u7A7A\u95F4",
  "wb.mapNoData": "\u5730\u56FE\u3001\u5206\u6790\u4E0E\u56DE\u653E\u6839\u636E\u5DF2\u53D1\u5E03\u7684\u6570\u636E\u8303\u56F4\u663E\u793A\u3002\u8BF7\u7528\u5BFC\u5165\u5411\u5BFC\u5BFC\u5165\u81EA\u5DF1\u7684\u6570\u636E\uFF0C\u5F53\u524D\u9879\u76EE\u7F3A\u5C11\uFF1A",
  "wb.mapPending": "\u5DF2\u6709\u6570\u636E\u7248\u672C\uFF0C\u5730\u56FE\u56FE\u5C42\u5C06\u5728\u5730\u56FE\u6A21\u5757\u542F\u7528\u540E\u663E\u793A\u3002",
  "wb.mapHint": "\u53F3\u4FA7\u662F DSH \u539F\u751F\u5BF9\u8BDD\uFF0C\u4EC5\u53EF\u67E5\u8BE2\u548C\u4F7F\u7528\u516C\u4EA4\u5DE5\u5177\uFF1B\u5199\u4EE3\u7801\u8BF7\u4EA4\u63A5\u5230\u5F00\u53D1\u4F1A\u8BDD\u3002",
  "wb.tabWorkspace": "\u5DE5\u4F5C\u533A",
  "wb.tabChat": "\u5BF9\u8BDD",
  "wb.chat": "\u5BF9\u8BDD",
  "wb.workspaceTitle": "LingGo \xB7 {name} \xB7 \u5C55\u793A",
  "need.routes": "\u7EBF\u8DEF\u4E0E\u65B9\u5411",
  "need.stops": "\u7AD9\u70B9\u4E0E\u7AD9\u5E8F",
  "need.timetable": "\u65F6\u523B\u8868\uFF08\u8BA1\u5212\u73ED\u6B21\uFF09",
  "need.ridership": "\u5206\u65F6\u6BB5\u5BA2\u6D41\u6216 OD",
  "cover.title": "\u9009\u62E9\u5C55\u793A\u4F1A\u8BDD",
  "cover.body": "\u8FD9\u91CC\u53EA\u663E\u793A\u5F53\u524D\u9879\u76EE\u7684\u5C55\u793A\u4F1A\u8BDD\uFF0C\u5F00\u53D1\u4F1A\u8BDD\u4E0D\u4F1A\u51FA\u73B0\u5728\u6B64\u9875\u9762\u3002",
  "cover.noProject": "\u8BF7\u5148\u5728\u5DE6\u4FA7\u521B\u5EFA\u6216\u9009\u62E9\u9879\u76EE\u3002",
  "cover.restore": "\u6062\u590D\u6700\u8FD1\u7684\u5C55\u793A\u4F1A\u8BDD",
  "ctx.dataVersion": "\u6570\u636E\u7248\u672C\uFF1A{value}",
  "ctx.scenario": "\u60C5\u666F\uFF1A{value}",
  "ctx.results": "\u7ED3\u679C\u5F15\u7528\uFF1A{value}",
  "ctx.none": "\u65E0",
  "draft.title": "\u3010LingGo \u5F00\u53D1\u4EA4\u63A5\u3011{name}",
  "draft.context": "\u4E0A\u4E0B\u6587\uFF1A",
  "draft.project": "\u9879\u76EE\uFF1A{name}\uFF08{id}\uFF09",
  "draft.source": "\u6765\u6E90\u5C55\u793A\u4F1A\u8BDD\uFF1A{id}",
  "draft.footer": "\uFF08\u6B64\u8349\u7A3F\u7531 LingGo \u5C55\u793A\u9875\u4EA4\u63A5\u751F\u6210\uFF0C\u8BF7\u68C0\u67E5\u540E\u518D\u53D1\u9001\u3002\uFF09",
  "dev.title": "LingGo \u516C\u4EA4\u5DE5\u4F5C\u53F0",
  "dev.intro": "\u4E09\u680F\u516C\u4EA4\u5DE5\u4F5C\u53F0\u662F\u72EC\u7ACB\u9875\u9762\uFF0C\u4E0E\u8FD9\u91CC\u5171\u4EAB\u9879\u76EE\u6570\u636E\uFF0C\u4F46\u4F1A\u8BDD\u4E92\u76F8\u72EC\u7ACB\u3002\u5C55\u793A\u9875\u63D0\u4EA4\u7684\u5F00\u53D1\u4EA4\u63A5\u663E\u793A\u5728\u4E0B\u65B9\u3002",
  "dev.openWeb": "\u6253\u5F00\u4E09\u680F\u5DE5\u4F5C\u53F0 \u2197",
  "dev.openBrowser": "\u5728\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00\u4E09\u680F\u5DE5\u4F5C\u53F0 \u2197",
  "dev.connecting": "\u6B63\u5728\u51C6\u5907\u94FE\u63A5\u2026",
  "dev.projects": "\u9879\u76EE\uFF08{count}\uFF09",
  "dev.noProjects": "\u8FD8\u6CA1\u6709\u9879\u76EE\uFF0C\u8BF7\u5728\u4E09\u680F\u5DE5\u4F5C\u53F0\u4E2D\u521B\u5EFA\u3002",
  "dev.inbox": "\u5F00\u53D1\u4EA4\u63A5",
  "dev.showArchived": "\u663E\u793A\u5DF2\u5F52\u6863",
  "dev.empty": "\u6682\u65E0\u5F00\u53D1\u4EA4\u63A5\u3002",
  "dev.archived": "\u5DF2\u5F52\u6863",
  "dev.open": "\u6253\u5F00\u5F00\u53D1\u4F1A\u8BDD\u5E76\u586B\u5165\u8349\u7A3F",
  "dev.reopen": "\u56DE\u5230\u5F00\u53D1\u4F1A\u8BDD",
  "dev.archive": "\u5F52\u6863",
  "dev.drafted": "\u5DF2\u6253\u5F00\u5F00\u53D1\u4F1A\u8BDD\uFF0C\u4EA4\u63A5\u5185\u5BB9\u5DF2\u586B\u5165\u8F93\u5165\u6846\u3002\u68C0\u67E5\u540E\u518D\u53D1\u9001\u3002",
  "dev.preserved": "\u5DF2\u6253\u5F00\u5F00\u53D1\u4F1A\u8BDD\u3002\u8F93\u5165\u6846\u4E2D\u5DF2\u6709\u8349\u7A3F\uFF0C\u672A\u8986\u76D6\u3002",
  "dev.draftBlocked": "\u5F00\u53D1\u4F1A\u8BDD\u8349\u7A3F\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
  "dev.workspaceUnavailable": "\u5DE5\u4F5C\u533A\u5C1A\u672A\u5C31\u7EEA\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
  "dev.manualDraft": "\u5F53\u524D DSH \u4E0D\u652F\u6301\u5B89\u5168\u9884\u586B\u8349\u7A3F\u3002\u5148\u590D\u5236\u4E0B\u65B9\u4EA4\u63A5\u5185\u5BB9\uFF0C\u518D\u6253\u5F00\u5F00\u53D1\u4F1A\u8BDD\u7C98\u8D34\uFF1B\u73B0\u6709\u8349\u7A3F\u4E0D\u4F1A\u88AB\u8986\u76D6\u3002",
  "dev.handoffContent": "\u4EA4\u63A5\u5B8C\u6574\u5185\u5BB9",
  "dev.copyDraft": "\u590D\u5236\u4EA4\u63A5\u5185\u5BB9",
  "dev.copied": "\u4EA4\u63A5\u5185\u5BB9\u5DF2\u590D\u5236\u3002\u6253\u5F00\u5F00\u53D1\u4F1A\u8BDD\uFF0C\u7C98\u8D34\u5E76\u68C0\u67E5\u540E\u518D\u53D1\u9001\u3002",
  "dev.openManual": "\u6253\u5F00\u5F00\u53D1\u4F1A\u8BDD",
  "dev.manualOpened": "\u5F00\u53D1\u4F1A\u8BDD\u5DF2\u6253\u5F00\u3002\u8BF7\u7C98\u8D34\u5DF2\u590D\u5236\u7684\u4EA4\u63A5\u5185\u5BB9\uFF0C\u68C0\u67E5\u540E\u518D\u53D1\u9001\u3002",
  "dev.unknownProject": "\u4EA4\u63A5\u6240\u5C5E\u9879\u76EE\u4E0D\u5B58\u5728\u3002",
  "dev.workspaceTitle": "LingGo \xB7 {name} \xB7 \u5F00\u53D1"
};
var en = {
  panel: "Transit workbench",
  "common.cancel": "Cancel",
  "wb.subtitle": "Transit data workbench",
  "wb.project": "Project",
  "wb.noProject": "No projects yet. Create one per city or region.",
  "wb.newProjectName": "New project name (city or region)",
  "wb.createProject": "Create project",
  "wb.sessions": "Presentation sessions",
  "wb.newSession": "New presentation session",
  "wb.noSessions": "No presentation sessions for this project yet.",
  "wb.untitled": "Untitled session",
  "wb.running": "Running",
  "wb.data": "Data",
  "wb.noData": "No datasets imported yet.",
  "wb.versions": "{count} data versions",
  "wb.tasks": "Tasks",
  "wb.noTasks": "No tasks.",
  "wb.handoff": "Hand off to development",
  "wb.handoffSummary": "Development task summary",
  "wb.handoffPlaceholder": "Describe the feature to build or change in a development session",
  "wb.preview": "Preview handoff",
  "wb.previewTitle": "Handoff preview",
  "wb.previewNote": "Confirming only saves the handoff. Open it in DSH: supported hosts prefill a draft; older hosts use copy/paste. Nothing is sent or executed automatically.",
  "wb.noSource": "Source presentation session: none",
  "wb.confirm": "Save handoff",
  "wb.handoffSaved": "Handoff saved. Open it from the Transit workbench panel on the DSH development page.",
  "wb.return": "Back to DSH",
  "wb.devWeb": "Open the DSH development page",
  "wb.devDesktop": "Return to DSH desktop",
  "wb.map": "Map and analysis",
  "wb.welcome": "Your transit data workspace",
  "wb.mapNoData": "Map, analysis and replay follow the extent of published data. Import your own data with the wizard; this project still needs:",
  "wb.mapPending": "Data versions exist; layers appear once the map module is enabled.",
  "wb.mapHint": "The native DSH conversation on the right can only query and use transit tools; hand off coding to a development session.",
  "wb.tabWorkspace": "Workspace",
  "wb.tabChat": "Chat",
  "wb.chat": "Chat",
  "wb.workspaceTitle": "LingGo \xB7 {name} \xB7 presentation",
  "need.routes": "Routes and directions",
  "need.stops": "Stops and stop sequences",
  "need.timetable": "Timetable (planned trips)",
  "need.ridership": "Time-binned ridership or OD",
  "cover.title": "Choose a presentation session",
  "cover.body": "Only this project's presentation sessions appear here; development sessions never do.",
  "cover.noProject": "Create or choose a project on the left first.",
  "cover.restore": "Restore the latest presentation session",
  "ctx.dataVersion": "Data version: {value}",
  "ctx.scenario": "Scenario: {value}",
  "ctx.results": "Result refs: {value}",
  "ctx.none": "none",
  "draft.title": "[LingGo development handoff] {name}",
  "draft.context": "Context:",
  "draft.project": "Project: {name} ({id})",
  "draft.source": "Source presentation session: {id}",
  "draft.footer": "(Draft generated from a LingGo handoff. Review before sending.)",
  "dev.title": "LingGo transit workbench",
  "dev.intro": "The three-column workbench is a separate page that shares project data with this one; sessions stay separate. Handoffs from it appear below.",
  "dev.openWeb": "Open the three-column workbench \u2197",
  "dev.openBrowser": "Open the three-column workbench in a browser \u2197",
  "dev.connecting": "Preparing link\u2026",
  "dev.projects": "Projects ({count})",
  "dev.noProjects": "No projects yet; create one in the workbench.",
  "dev.inbox": "Development handoffs",
  "dev.showArchived": "Show archived",
  "dev.empty": "No handoffs.",
  "dev.archived": "Archived",
  "dev.open": "Open a development session with the draft",
  "dev.reopen": "Return to the development session",
  "dev.archive": "Archive",
  "dev.drafted": "Development session opened with the handoff in the input box. Review before sending.",
  "dev.preserved": "Development session opened. Its existing draft was kept.",
  "dev.draftBlocked": "The development session draft is unavailable; try again shortly.",
  "dev.workspaceUnavailable": "The workspace is not ready; try again shortly.",
  "dev.manualDraft": "This DSH cannot safely prefill drafts. Copy the handoff below, then open the development session and paste it. Existing drafts are preserved.",
  "dev.handoffContent": "Full handoff content",
  "dev.copyDraft": "Copy handoff",
  "dev.copied": "Handoff copied. Open the development session, paste and review before sending.",
  "dev.openManual": "Open development session",
  "dev.manualOpened": "Development session opened. Paste the copied handoff and review before sending.",
  "dev.unknownProject": "The handoff's project no longer exists.",
  "dev.workspaceTitle": "LingGo \xB7 {name} \xB7 development"
};
Object.assign(zh, {
  "data.import": "\u5BFC\u5165\u6570\u636E\u2026",
  "data.versions": "\u6570\u636E\u7248\u672C",
  "tab.map": "\u5730\u56FE",
  "tab.import": "\u5BFC\u5165\u6570\u636E",
  "tab.settings": "\u8BBE\u7F6E",
  "job.running": "\u8FD0\u884C\u4E2D",
  "job.queued": "\u6392\u961F\u4E2D",
  "job.done": "\u5DF2\u5B8C\u6210",
  "job.failed": "\u5931\u8D25",
  "job.cancelled": "\u5DF2\u53D6\u6D88",
  "job.cancel": "\u53D6\u6D88\u4EFB\u52A1",
  "entity.stops": "\u7AD9\u70B9",
  "entity.routes": "\u7EBF\u8DEF",
  "entity.route_stops": "\u7EBF\u8DEF\u7AD9\u5E8F",
  "entity.trips": "\u65F6\u523B\u8868",
  "entity.ridership": "\u5BA2\u6D41",
  "entity.od": "OD",
  "entity.demand": "\u9010\u7B14\u9700\u6C42",
  "entity.gps": "\u8F66\u8F86 GPS",
  "entity.vehicles": "\u8F66\u8F86",
  "entity.depots": "\u8F66\u573A",
  "field.stop_id": "\u7AD9\u70B9\u7F16\u53F7",
  "field.stop_name": "\u7AD9\u70B9\u540D\u79F0",
  "field.lon": "\u7ECF\u5EA6",
  "field.lat": "\u7EAC\u5EA6",
  "field.route_id": "\u7EBF\u8DEF\u7F16\u53F7",
  "field.route_name": "\u7EBF\u8DEF\u540D\u79F0",
  "field.direction": "\u65B9\u5411",
  "field.geometry": "\u7EBF\u8DEF\u51E0\u4F55",
  "field.seq": "\u7AD9\u5E8F",
  "field.trip_id": "\u73ED\u6B21\u7F16\u53F7",
  "field.departure_time": "\u53D1\u8F66\u65F6\u95F4",
  "field.origin_stop_id": "\u8D77\u70B9\u7AD9",
  "field.dest_stop_id": "\u7EC8\u70B9\u7AD9",
  "field.count": "\u4EBA\u6B21",
  "field.start_time": "\u53D1\u8F66\u65F6\u95F4",
  "field.end_time": "\u5230\u8FBE\u65F6\u95F4",
  "field.service_id": "\u670D\u52A1\u65E5",
  "field.vehicle_id": "\u8F66\u8F86\u7F16\u53F7",
  "field.time_bin": "\u65F6\u6BB5",
  "field.boardings": "\u4E0A\u8F66\u4EBA\u6570",
  "field.alightings": "\u4E0B\u8F66\u4EBA\u6570",
  "field.date": "\u65E5\u671F",
  "field.o_stop_id": "\u8D77\u70B9\u7AD9",
  "field.d_stop_id": "\u7EC8\u70B9\u7AD9",
  "field.o_lon": "\u8D77\u70B9\u7ECF\u5EA6",
  "field.o_lat": "\u8D77\u70B9\u7EAC\u5EA6",
  "field.d_lon": "\u7EC8\u70B9\u7ECF\u5EA6",
  "field.d_lat": "\u7EC8\u70B9\u7EAC\u5EA6",
  "field.trips": "\u4EBA\u6B21",
  "field.request_id": "\u8BF7\u6C42\u7F16\u53F7",
  "field.request_time": "\u8BF7\u6C42\u65F6\u95F4",
  "field.earliest": "\u6700\u65E9\u51FA\u53D1",
  "field.latest": "\u6700\u665A\u5230\u8FBE",
  "field.passengers": "\u4EBA\u6570",
  "field.time": "\u65F6\u95F4",
  "field.speed": "\u901F\u5EA6",
  "field.capacity": "\u8F7D\u5BA2\u91CF",
  "field.depot_id": "\u8F66\u573A\u7F16\u53F7",
  "field.depot_name": "\u8F66\u573A\u540D\u79F0",
  "field.type": "\u7C7B\u578B",
  "col.x": "\u51E0\u4F55 X\uFF08\u7ECF\u5EA6\uFF09",
  "col.y": "\u51E0\u4F55 Y\uFF08\u7EAC\u5EA6\uFF09",
  "col.geometry": "\u51E0\u4F55\u7EBF",
  "crs.WGS84": "WGS84\uFF08GPS\uFF09",
  "crs.GCJ02": "GCJ-02\uFF08\u9AD8\u5FB7/\u817E\u8BAF\uFF09",
  "crs.BD09": "BD-09\uFF08\u767E\u5EA6\uFF09",
  "crs.EPSG": "\u6295\u5F71\u5750\u6807\uFF08EPSG\uFF09",
  "tf.none": "\u539F\u503C",
  "tf.wkt_lon": "WKT \u70B9\u53D6\u7ECF\u5EA6",
  "tf.wkt_lat": "WKT \u70B9\u53D6\u7EAC\u5EA6",
  "tf.seq_hundreds": "\u7AD9\u5E8F\u767E\u4F4D\u4F5C\u65B9\u5411",
  "imp.title": "\u5BFC\u5165\u6570\u636E",
  "imp.intro": "\u6570\u636E\u7559\u5728\u672C\u673A\uFF1A\u63D2\u4EF6\u8BFB\u53D6\u6E90\u6587\u4EF6\u6216\u6570\u636E\u5E93\uFF0C\u6309\u4F60\u786E\u8BA4\u7684\u5B57\u6BB5\u6620\u5C04\u8F6C\u6362\u4E3A\u6807\u51C6\u5B9E\u4F53\uFF0C\u5E76\u53D1\u5E03\u4E3A\u65B0\u7684\u4E0D\u53EF\u53D8\u6570\u636E\u7248\u672C\u3002\u4E0D\u4F1A\u6267\u884C\u6A21\u578B\u751F\u6210\u7684\u4EE3\u7801\u3002",
  "imp.step1": "1. \u6570\u636E\u6E90",
  "imp.sourceType": "\u6570\u636E\u6E90\u7C7B\u578B",
  "imp.file": "\u672C\u673A\u6587\u4EF6\u6216\u6587\u4EF6\u5939",
  "imp.path": "\u6587\u4EF6\u8DEF\u5F84",
  "imp.pathHint": "\u7EDD\u5BF9\u8DEF\u5F84\uFF0C\u4F8B\u5982 /data/city/route_stops.csv",
  "imp.formats": "\u652F\u6301 CSV\u3001TSV\u3001Excel\uFF08.xlsx\uFF09\u3001GeoJSON\u3001Shapefile\uFF08.shp \u6216\u542B .shp \u7684 .zip\uFF09\u3001GTFS\uFF08.zip \u6216\u6587\u4EF6\u5939\uFF09\u3002",
  "imp.pgTable": "\u8868\u540D\uFF08\u53EF\u9009\uFF0Cschema.table\uFF09",
  "imp.pgNote": "\u4EE5\u53EA\u8BFB\u4E8B\u52A1\u8FDE\u63A5\uFF1B\u8FDE\u63A5\u4E32\u53EA\u7528\u4E8E\u672C\u6B21\u8BFB\u53D6\uFF0C\u4E0D\u5199\u5165\u6570\u636E\u7248\u672C\u6216\u4EFB\u52A1\u8BB0\u5F55\u3002",
  "imp.inspect": "\u68C0\u67E5\u6570\u636E",
  "imp.noTables": "\u6CA1\u6709\u627E\u5230\u53EF\u8BFB\u53D6\u7684\u8868\u3002",
  "imp.step2": "2. \u5B57\u6BB5\u6620\u5C04",
  "imp.table": "\u8868",
  "imp.rows": "\u884C",
  "imp.tableInfo": "{rows} \u884C \xB7 {cols} \u5217 \xB7 \u51E0\u4F55\uFF1A{geometry}",
  "imp.gtfs": "\u8BC6\u522B\u4E3A GTFS\uFF1A\u5C06\u8F6C\u6362\u4E3A\u7AD9\u70B9\u3001\u7EBF\u8DEF\u3001\u7EBF\u8DEF\u7AD9\u5E8F\u548C\u65F6\u523B\u8868\uFF0C\u65E0\u9700\u9010\u5217\u6620\u5C04\u3002",
  "imp.entity": "\u76EE\u6807\u6570\u636E",
  "imp.crs": "\u6E90\u5750\u6807\u7CFB",
  "imp.mode": "\u5408\u5E76\u65B9\u5F0F",
  "imp.append": "\u5728\u5F53\u524D\u7248\u672C\u57FA\u7840\u4E0A\u8FFD\u52A0/\u8865\u5145",
  "imp.replace": "\u66FF\u6362\u6B64\u7C7B\u6570\u636E",
  "imp.mappingNote": "\u5DF2\u6309\u5217\u540D\u81EA\u52A8\u5EFA\u8BAE\uFF0C\u8BF7\u9010\u9879\u786E\u8BA4\u3002* \u4E3A\u5FC5\u586B\uFF1B\u672A\u6620\u5C04\u7684\u5FC5\u586B\u9879\u4F1A\u5728\u9884\u89C8\u65F6\u62A5\u9519\u3002",
  "imp.unmapped": "\uFF08\u4E0D\u6620\u5C04\uFF09",
  "imp.transform": "\u8F6C\u6362",
  "imp.preview": "\u9884\u89C8\u6620\u5C04\u7ED3\u679C",
  "imp.step3": "3. \u9884\u89C8\u4E0E\u786E\u8BA4",
  "imp.sampled": "\u9884\u89C8\u57FA\u4E8E\u524D 500 \u884C\u62BD\u6837\uFF0C\u6E90\u6570\u636E\u5171 {total} \u884C\uFF1B\u6B63\u5F0F\u5BFC\u5165\u5904\u7406\u5168\u90E8\u6570\u636E\u3002",
  "imp.rEntity": "\u6570\u636E",
  "imp.rIn": "\u8BFB\u5165",
  "imp.rOut": "\u4FDD\u7559",
  "imp.rDup": "\u91CD\u590D",
  "imp.rDrop": "\u4E22\u5F03\u539F\u56E0",
  "imp.sample": "{entity}\u6837\u4F8B\uFF08\u5DF2\u8F6C\u6362\u4E3A WGS84\uFF09",
  "imp.confirmNote": "\u786E\u8BA4\u540E\u5728\u540E\u53F0\u8FD0\u884C\u5BFC\u5165\u4EFB\u52A1\uFF0C\u53EF\u5728\u5DE6\u4FA7\u4EFB\u52A1\u4E2D\u53D6\u6D88\uFF1B\u6210\u529F\u540E\u53D1\u5E03\u4E3A\u65B0\u7684\u6570\u636E\u7248\u672C\uFF0C\u65E7\u7248\u672C\u4FDD\u7559\u53EF\u5207\u6362\u3002",
  "imp.confirm": "\u786E\u8BA4\u5BFC\u5165",
  "imp.back": "\u8FD4\u56DE\u4FEE\u6539",
  "imp.working": "\u5904\u7406\u4E2D\u2026",
  "set.title": "\u8BBE\u7F6E",
  "set.python": "Python \u6570\u636E\u73AF\u5883",
  "set.pythonHelp": "\u6570\u636E\u5904\u7406\u5728\u72EC\u7ACB Python \u8FDB\u7A0B\u4E2D\u8FD0\u884C\uFF0C\u4E0D\u7EE7\u627F DSH \u7684\u6A21\u578B\u51ED\u636E\u3002\u521D\u59CB\u5316\uFF1A\u5728\u63D2\u4EF6\u76EE\u5F55\u8FD0\u884C npm run setup:python\u3002",
  "set.pythonPath": "Python \u89E3\u91CA\u5668\u8DEF\u5F84\uFF08\u7559\u7A7A\u4F7F\u7528\u63D2\u4EF6\u73AF\u5883\uFF09",
  "set.amap": "\u9AD8\u5FB7\u5730\u56FE\uFF08\u53EF\u9009\uFF09",
  "set.amapHelp": "\u672A\u914D\u7F6E\u65F6\u4F7F\u7528\u5185\u7F6E\u753B\u5E03\u5730\u56FE\u3002\u914D\u7F6E Web \u7AEF JS API Key \u540E\u53EF\u5207\u6362\u9AD8\u5FB7\u5E95\u56FE\uFF1B\u6570\u636E\u6309 WGS84 \u5B58\u50A8\uFF0C\u663E\u793A\u65F6\u8F6C\u6362\u4E3A GCJ-02\u3002",
  "set.amapCode": "\u5B89\u5168\u5BC6\u94A5",
  "set.save": "\u4FDD\u5B58\u8BBE\u7F6E",
  "set.saved": "\u5DF2\u4FDD\u5B58\u3002",
  "map.loading": "\u6B63\u5728\u52A0\u8F7D\u5730\u56FE\u6570\u636E\u2026",
  "map.noGeometry": "\u5F53\u524D\u6570\u636E\u7248\u672C\u6CA1\u6709\u53EF\u663E\u793A\u7684\u5750\u6807\u3002",
  "map.canvas": "\u5185\u7F6E\u753B\u5E03",
  "map.amap": "\u9AD8\u5FB7\u5730\u56FE",
  "map.engine": "\u5E95\u56FE",
  "map.truncated": "\u7EBF\u8DEF\u8F83\u591A\uFF0C\u4EC5\u663E\u793A\u90E8\u5206",
  "map.summary": "{routes} \u6761\u7EBF\u8DEF \xB7 {stops} \u4E2A\u7AD9\u70B9",
  "map.search": "\u641C\u7D22\u7EBF\u8DEF",
  "map.routes": "\u7EBF\u8DEF",
  "map.trips": "{n} \u73ED",
  "map.reset": "\u663E\u793A\u5168\u90E8",
  "map.actions": "\u667A\u80FD\u4F53\u5730\u56FE\u64CD\u4F5C",
  "map.noActions": "\u5BF9\u8BDD\u4E2D\u7684\u5730\u56FE\u64CD\u4F5C\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\uFF0C\u70B9\u51FB\u53EF\u91CD\u653E\u3002",
  "map.replay": "\u70B9\u51FB\u91CD\u653E",
  "map.dir": "\u65B9\u5411 {dir}\uFF1A{n} \u7AD9\uFF0C{from} \u2192 {to}",
  "map.stopRoutes": "\u7ECF\u8FC7 {n} \u6761\u7EBF\u8DEF\uFF1A",
  "map.missing": "\u5F53\u524D\u7248\u672C\u4ECD\u7F3A\u5C11\uFF1A{list}",
  "act.show_route": "\u663E\u793A\u7EBF\u8DEF",
  "act.show_stop": "\u663E\u793A\u7AD9\u70B9",
  "act.show_all": "\u663E\u793A\u5168\u90E8",
  "act.clear": "\u6E05\u9664"
});
Object.assign(en, {
  "data.import": "Import data\u2026",
  "data.versions": "Data versions",
  "tab.map": "Map",
  "tab.import": "Import",
  "tab.settings": "Settings",
  "job.running": "Running",
  "job.queued": "Queued",
  "job.done": "Done",
  "job.failed": "Failed",
  "job.cancelled": "Cancelled",
  "job.cancel": "Cancel job",
  "entity.stops": "Stops",
  "entity.routes": "Routes",
  "entity.route_stops": "Route stops",
  "entity.trips": "Timetable",
  "entity.ridership": "Ridership",
  "entity.od": "OD",
  "entity.demand": "Trip requests",
  "entity.gps": "Vehicle GPS",
  "entity.vehicles": "Vehicles",
  "entity.depots": "Depots",
  "field.stop_id": "Stop ID",
  "field.stop_name": "Stop name",
  "field.lon": "Longitude",
  "field.lat": "Latitude",
  "field.route_id": "Route ID",
  "field.route_name": "Route name",
  "field.direction": "Direction",
  "field.geometry": "Route geometry",
  "field.seq": "Sequence",
  "field.trip_id": "Trip ID",
  "field.departure_time": "Departure",
  "field.origin_stop_id": "Origin stop",
  "field.dest_stop_id": "Destination stop",
  "field.count": "Count",
  "field.start_time": "Departure",
  "field.end_time": "Arrival",
  "field.service_id": "Service day",
  "field.vehicle_id": "Vehicle ID",
  "field.time_bin": "Time bin",
  "field.boardings": "Boardings",
  "field.alightings": "Alightings",
  "field.date": "Date",
  "field.o_stop_id": "Origin stop",
  "field.d_stop_id": "Destination stop",
  "field.o_lon": "Origin lon",
  "field.o_lat": "Origin lat",
  "field.d_lon": "Destination lon",
  "field.d_lat": "Destination lat",
  "field.trips": "Trips",
  "field.request_id": "Request ID",
  "field.request_time": "Request time",
  "field.earliest": "Earliest",
  "field.latest": "Latest",
  "field.passengers": "Passengers",
  "field.time": "Time",
  "field.speed": "Speed",
  "field.capacity": "Capacity",
  "field.depot_id": "Depot ID",
  "field.depot_name": "Depot name",
  "field.type": "Type",
  "col.x": "Geometry X (lon)",
  "col.y": "Geometry Y (lat)",
  "col.geometry": "Line geometry",
  "crs.WGS84": "WGS84 (GPS)",
  "crs.GCJ02": "GCJ-02 (AMap/Tencent)",
  "crs.BD09": "BD-09 (Baidu)",
  "crs.EPSG": "Projected (EPSG)",
  "tf.none": "As is",
  "tf.wkt_lon": "WKT point lon",
  "tf.wkt_lat": "WKT point lat",
  "tf.seq_hundreds": "Hundreds of sequence as direction",
  "imp.title": "Import data",
  "imp.intro": "Data stays on this machine: the plugin reads the source, converts it to standard entities with the field mapping you confirm, and publishes a new immutable data version. No model-generated code runs.",
  "imp.step1": "1. Source",
  "imp.sourceType": "Source type",
  "imp.file": "Local file or folder",
  "imp.path": "File path",
  "imp.pathHint": "Absolute path, e.g. /data/city/route_stops.csv",
  "imp.formats": "CSV, TSV, Excel (.xlsx), GeoJSON, Shapefile (.shp or a .zip with one), GTFS (.zip or folder).",
  "imp.pgTable": "Table (optional, schema.table)",
  "imp.pgNote": "Connects read-only; the connection string is used for this read only and never stored in versions or jobs.",
  "imp.inspect": "Inspect",
  "imp.noTables": "No readable table found.",
  "imp.step2": "2. Field mapping",
  "imp.table": "Table",
  "imp.rows": "rows",
  "imp.tableInfo": "{rows} rows \xB7 {cols} columns \xB7 geometry: {geometry}",
  "imp.gtfs": "Detected GTFS: converted to stops, routes, route stops and timetable without column mapping.",
  "imp.entity": "Target data",
  "imp.crs": "Source CRS",
  "imp.mode": "Merge",
  "imp.append": "Add to the current version",
  "imp.replace": "Replace this data",
  "imp.mappingNote": "Suggested from column names; confirm each one. * is required.",
  "imp.unmapped": "(not mapped)",
  "imp.transform": "Transform",
  "imp.preview": "Preview mapping",
  "imp.step3": "3. Preview and confirm",
  "imp.sampled": "Preview uses the first 500 of {total} rows; the import processes all of them.",
  "imp.rEntity": "Data",
  "imp.rIn": "Read",
  "imp.rOut": "Kept",
  "imp.rDup": "Duplicates",
  "imp.rDrop": "Dropped",
  "imp.sample": "{entity} sample (converted to WGS84)",
  "imp.confirmNote": "The import runs as a background job you can cancel on the left; on success it becomes a new data version and older versions stay selectable.",
  "imp.confirm": "Confirm import",
  "imp.back": "Back",
  "imp.working": "Working\u2026",
  "set.title": "Settings",
  "set.python": "Python data environment",
  "set.pythonHelp": "Data runs in a separate Python process that does not inherit DSH model credentials. Set up with npm run setup:python in the plugin folder.",
  "set.pythonPath": "Python interpreter (empty = plugin environment)",
  "set.amap": "AMap (optional)",
  "set.amapHelp": "Without a key the built-in canvas map is used. With a Web JS API key you can switch to AMap tiles; data is stored as WGS84 and shown as GCJ-02.",
  "set.amapCode": "Security code",
  "set.save": "Save",
  "set.saved": "Saved.",
  "map.loading": "Loading map data\u2026",
  "map.noGeometry": "This data version has no coordinates to show.",
  "map.canvas": "Built-in canvas",
  "map.amap": "AMap",
  "map.engine": "Base map",
  "map.truncated": "many routes, partial",
  "map.summary": "{routes} routes \xB7 {stops} stops",
  "map.search": "Search routes",
  "map.routes": "Routes",
  "map.trips": "{n} trips",
  "map.reset": "Show all",
  "map.actions": "Agent map actions",
  "map.noActions": "Map actions from the conversation appear here; click to replay.",
  "map.replay": "Click to replay",
  "map.dir": "Direction {dir}: {n} stops, {from} \u2192 {to}",
  "map.stopRoutes": "{n} routes: ",
  "map.missing": "This version still lacks: {list}",
  "act.show_route": "Show route",
  "act.show_stop": "Show stop",
  "act.show_all": "Show all",
  "act.clear": "Clear"
});
Object.assign(zh, {
  "tab.analysis": "\u5206\u6790",
  "tab.analysisCount": "\u5206\u6790\uFF08{n}\uFF09",
  "act.show_run": "\u663E\u793A\u7ED3\u679C",
  "an.noData": "\u5F53\u524D\u9879\u76EE\u8FD8\u6CA1\u6709\u6570\u636E\u7248\u672C\u3002\u5148\u5BFC\u5165\u6570\u636E\uFF0C\u518D\u8FD0\u884C\u7B97\u6CD5\u3002",
  "an.loading": "\u6B63\u5728\u8BFB\u53D6\u7B97\u6CD5\u2026",
  "an.proposals": "\u667A\u80FD\u4F53\u5EFA\u8BAE\u7684\u8FD0\u884C",
  "an.batch": "{n} \u7EC4\u53C2\u6570",
  "an.fromAgent": "\u6765\u81EA\u5C55\u793A\u4F1A\u8BDD\u667A\u80FD\u4F53 \xB7 {time}\u3002\u9884\u89C8\u5E76\u786E\u8BA4\u540E\u624D\u4F1A\u8FD0\u884C\u3002",
  "an.preview": "\u9884\u89C8\u8FD0\u884C",
  "an.dismiss": "\u5FFD\u7565",
  "an.algorithms": "\u7B97\u6CD5",
  "an.choose": "\u9009\u62E9\u7B97\u6CD5\u2026",
  "an.user": "\u81EA\u5B9A\u4E49",
  "an.inputs": "\u4F7F\u7528\u6570\u636E\uFF08* \u4E3A\u5FC5\u9700\uFF0C\u62EC\u53F7\u5185\u4E3A\u884C\u6570\uFF09\uFF1A",
  "an.userWarning": "\u81EA\u5B9A\u4E49 Python \u4EE3\u7801\uFF08SHA-256 {sha}\u2026\uFF09\uFF1A\u63A5\u53E3\u4E0E\u7ED3\u679C\u6821\u9A8C\u4E0D\u7B49\u4E8E\u4EE3\u7801\u5B89\u5168\uFF0C\u5B83\u4EE5\u4F60\u7684\u7528\u6237\u6743\u9650\u5728\u672C\u673A\u8FD0\u884C\uFF0C\u6CA1\u6709\u6C99\u7BB1\u3002",
  "an.sweep": "\u53C2\u6570\u5BF9\u6BD4",
  "an.noSweep": "\u4E0D\u5BF9\u6BD4\uFF08\u5355\u6B21\u8FD0\u884C\uFF09",
  "an.sweepValues": "\u53D6\u503C\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u6700\u591A 10 \u4E2A",
  "an.remove": "\u79FB\u9664\u6B64\u7B97\u6CD5",
  "an.previewTitle": "\u8FD0\u884C\u9884\u89C8",
  "an.data": "\u6570\u636E",
  "an.required": "\u5FC5\u9700",
  "an.rows": "\u884C\u6570",
  "an.previewNote": "\u5C06\u5728\u6570\u636E\u7248\u672C {version} \u4E0A\u8FD0\u884C\u3002\u8FD0\u884C\u4E3A\u540E\u53F0\u4EFB\u52A1\uFF0C\u53EF\u5728\u5DE6\u4FA7\u4EFB\u52A1\u4E2D\u53D6\u6D88\uFF1B\u7ED3\u679C\u4FDD\u5B58\u4E3A\u4E0D\u53EF\u53D8\u8BB0\u5F55\u3002",
  "an.confirm": "\u786E\u8BA4\u8FD0\u884C\uFF08{n} \u7EC4\uFF09",
  "an.started": "\u5DF2\u5F00\u59CB\u8FD0\u884C\uFF0C\u8FDB\u5EA6\u89C1\u5DE6\u4FA7\u4EFB\u52A1\u3002",
  "an.register": "\u6CE8\u518C\u81EA\u5B9A\u4E49\u7B97\u6CD5",
  "an.registerHint": "\u6309\u63D2\u4EF6\u5185 python/templates/linggo_algorithm.py \u6A21\u677F\u7F16\u5199\uFF0C\u5148\u7528 python -m linggo_data.selfcheck \u81EA\u68C0\u3002",
  "an.registerPath": "\u7B97\u6CD5 .py \u6587\u4EF6\u7684\u672C\u673A\u8DEF\u5F84",
  "an.showSource": "\u67E5\u770B\u6E90\u4EE3\u7801",
  "an.reviewed": "\u6211\u5DF2\u5BA1\u9605\u4EE5\u4E0A\u4EE3\u7801\uFF0C\u786E\u8BA4\u4EE5\u6211\u7684\u7528\u6237\u6743\u9650\u5728\u672C\u673A\u8FD0\u884C",
  "an.registerConfirm": "\u786E\u8BA4\u6CE8\u518C",
  "an.registered": "\u5DF2\u6CE8\u518C\uFF1A{name}",
  "an.runs": "\u8FD0\u884C\u7ED3\u679C",
  "an.noRuns": "\u8FD8\u6CA1\u6709\u8FD0\u884C\u7ED3\u679C\u3002",
  "an.time": "\u65F6\u95F4",
  "an.algorithm": "\u7B97\u6CD5",
  "an.kpi": "\u5173\u952E\u6307\u6807",
  "an.check": "\u7EA6\u675F\u6821\u9A8C",
  "an.synthetic": "\u5B9E\u9A8C\u9700\u6C42",
  "an.valid": "\u901A\u8FC7",
  "an.invalid": "{n} \u9879\u8FDD\u53CD",
  "an.unchecked": "\u672A\u6821\u9A8C",
  "an.runMeta": "\u6570\u636E\u7248\u672C {version} \xB7 \u7ED3\u679C {id}",
  "an.showOnMap": "\u5728\u5730\u56FE\u4E0A\u56DE\u653E",
  "an.validation": "\u7EA6\u675F\u6821\u9A8C",
  "an.validNote": "\u72EC\u7ACB\u6821\u9A8C\u5668\u9010\u6761\u68C0\u67E5\u4E86\u7ED3\u679C\uFF0C\u6CA1\u6709\u53D1\u73B0\u8FDD\u53CD\u7EA6\u675F\u3002",
  "an.uncheckedNote": "\u81EA\u5B9A\u4E49\u7C7B\u578B\uFF08custom\uFF09\u6CA1\u6709\u5185\u7F6E\u6821\u9A8C\u5668\uFF0C\u7ED3\u679C\u672A\u7ECF\u7EA6\u675F\u68C0\u67E5\u3002",
  "an.assumptions": "\u5047\u8BBE\u4E0E\u8BF4\u660E",
  "an.rejected": "\u672A\u670D\u52A1\u7684\u9700\u6C42",
  "an.request": "\u9700\u6C42",
  "an.pax": "\u4EBA\u6570",
  "an.reason": "\u539F\u56E0",
  "an.blocks": "\u8F66\u6B21\u94FE",
  "an.vehicle": "\u8F66\u8F86",
  "an.tripCount": "\u73ED\u6B21\u6570",
  "an.start": "\u5F00\u59CB",
  "an.end": "\u7ED3\u675F",
  "an.routes": "\u7EBF\u8DEF",
  "an.unassigned": "\u672A\u53C2\u4E0E\u914D\u8F66\u7684\u73ED\u6B21",
  "an.gaps": "\u8FD0\u529B\u7F3A\u53E3",
  "an.headways": "\u53D1\u8F66\u95F4\u9694",
  "an.route": "\u7EBF\u8DEF",
  "an.direction": "\u65B9\u5411",
  "an.bin": "\u65F6\u6BB5",
  "an.load": "\u8BBE\u8BA1\u5BA2\u6D41\uFF08\u4EBA/\u65F6\uFF09",
  "an.headway": "\u95F4\u9694\uFF08\u5206\uFF09",
  "an.capacity": "\u8FD0\u529B\uFF08\u4EBA/\u65F6\uFF09",
  "an.shortfall": "\u7F3A\u53E3\uFF08\u4EBA/\u65F6\uFF09",
  "opt.data": "\u9879\u76EE\u6570\u636E",
  "opt.synthetic": "\u5B9E\u9A8C\u751F\u6210",
  "kpi.requests": "\u9700\u6C42\u6570",
  "kpi.served": "\u5DF2\u670D\u52A1",
  "kpi.service_rate": "\u670D\u52A1\u7387",
  "kpi.vehicles": "\u8F66\u8F86\u6570",
  "kpi.vehicles_used": "\u51FA\u8F66\u6570",
  "kpi.avg_wait_min": "\u5E73\u5747\u7B49\u5F85\uFF08\u5206\uFF09",
  "kpi.avg_ride_min": "\u5E73\u5747\u4E58\u8F66\uFF08\u5206\uFF09",
  "kpi.avg_ride_ratio": "\u5E73\u5747\u7ED5\u884C\u6BD4",
  "kpi.vehicle_km": "\u8F66\u516C\u91CC",
  "kpi.passenger_km": "\u4EBA\u516C\u91CC",
  "kpi.rejected_by_reason": "\u62D2\u7EDD\u539F\u56E0",
  "kpi.trips": "\u73ED\u6B21\u6570",
  "kpi.assigned": "\u5DF2\u914D\u8F66\u73ED\u6B21",
  "kpi.unassigned": "\u672A\u914D\u8F66\u73ED\u6B21",
  "kpi.vehicles_required": "\u9700\u8981\u8F66\u8F86",
  "kpi.peak_concurrent": "\u9AD8\u5CF0\u540C\u65F6\u5728\u9014",
  "kpi.vehicles_available": "\u73B0\u6709\u8F66\u8F86",
  "kpi.gap": "\u8F66\u8F86\u7F3A\u53E3",
  "kpi.avg_trips_per_vehicle": "\u8F66\u5747\u73ED\u6B21",
  "kpi.deadhead_km": "\u7A7A\u9A76\u516C\u91CC",
  "kpi.routes": "\u7EBF\u8DEF\u6570",
  "kpi.directions": "\u7EBF\u8DEF\u65B9\u5411\u6570",
  "kpi.gap_bins": "\u7F3A\u53E3\u65F6\u6BB5\u6570",
  "kpi.max_shortfall_ph": "\u6700\u5927\u7F3A\u53E3\uFF08\u4EBA/\u65F6\uFF09",
  "kpi.feasible": "\u53EF\u884C",
  "map.play": "\u64AD\u653E",
  "map.pause": "\u6682\u505C",
  "map.time": "\u56DE\u653E\u65F6\u95F4",
  "map.noTracks": "\u8FD9\u4E2A\u7ED3\u679C\u6CA1\u6709\u8F66\u8F86\u8F68\u8FF9\u3002",
  "map.activeVehicles": "\u5728\u9014\u8F66\u8F86 {n} / {total}",
  "map.closeRun": "\u5173\u95ED\u7ED3\u679C\u56FE\u5C42",
  "map.runLoading": "\u6B63\u5728\u52A0\u8F7D\u7ED3\u679C\u2026"
});
Object.assign(en, {
  "tab.analysis": "Analysis",
  "tab.analysisCount": "Analysis ({n})",
  "act.show_run": "Show result",
  "an.noData": "This project has no data version yet. Import data before running algorithms.",
  "an.loading": "Loading algorithms\u2026",
  "an.proposals": "Runs proposed by the assistant",
  "an.batch": "{n} parameter sets",
  "an.fromAgent": "From the presentation assistant \xB7 {time}. Nothing runs until you preview and confirm.",
  "an.preview": "Preview run",
  "an.dismiss": "Dismiss",
  "an.algorithms": "Algorithms",
  "an.choose": "Choose an algorithm\u2026",
  "an.user": "custom",
  "an.inputs": "Data used (* required, row counts in brackets): ",
  "an.userWarning": "Custom Python code (SHA-256 {sha}\u2026): interface and result checks do not make code safe. It runs on this computer with your user permissions and no sandbox.",
  "an.sweep": "Compare parameter",
  "an.noSweep": "No comparison (single run)",
  "an.sweepValues": "Values, comma separated, up to 10",
  "an.remove": "Remove this algorithm",
  "an.previewTitle": "Run preview",
  "an.data": "Data",
  "an.required": "Required",
  "an.rows": "Rows",
  "an.previewNote": "Runs on data version {version} as a background job you can cancel in Tasks; results are stored as immutable records.",
  "an.confirm": "Confirm run ({n})",
  "an.started": "Run started; see Tasks for progress.",
  "an.register": "Register a custom algorithm",
  "an.registerHint": "Start from python/templates/linggo_algorithm.py in the plugin and check it with python -m linggo_data.selfcheck.",
  "an.registerPath": "Local path of the algorithm .py file",
  "an.showSource": "Show source",
  "an.reviewed": "I reviewed this code and accept that it runs with my user permissions",
  "an.registerConfirm": "Register",
  "an.registered": "Registered: {name}",
  "an.runs": "Results",
  "an.noRuns": "No results yet.",
  "an.time": "Time",
  "an.algorithm": "Algorithm",
  "an.kpi": "Key indicators",
  "an.check": "Constraint check",
  "an.synthetic": "synthetic demand",
  "an.valid": "Passed",
  "an.invalid": "{n} violations",
  "an.unchecked": "Not checked",
  "an.runMeta": "Data version {version} \xB7 result {id}",
  "an.showOnMap": "Replay on map",
  "an.validation": "Constraint check",
  "an.validNote": "An independent validator checked every constraint and found no violation.",
  "an.uncheckedNote": "Kind custom has no built-in validator; the result was not constraint-checked.",
  "an.assumptions": "Assumptions",
  "an.rejected": "Requests not served",
  "an.request": "Request",
  "an.pax": "Passengers",
  "an.reason": "Reason",
  "an.blocks": "Vehicle blocks",
  "an.vehicle": "Vehicle",
  "an.tripCount": "Trips",
  "an.start": "Start",
  "an.end": "End",
  "an.routes": "Routes",
  "an.unassigned": "Trips not assigned",
  "an.gaps": "Capacity gaps",
  "an.headways": "Headways",
  "an.route": "Route",
  "an.direction": "Direction",
  "an.bin": "Time bin",
  "an.load": "Design load (pax/h)",
  "an.headway": "Headway (min)",
  "an.capacity": "Capacity (pax/h)",
  "an.shortfall": "Shortfall (pax/h)",
  "opt.data": "Project data",
  "opt.synthetic": "Synthetic",
  "kpi.requests": "Requests",
  "kpi.served": "Served",
  "kpi.service_rate": "Service rate",
  "kpi.vehicles": "Vehicles",
  "kpi.vehicles_used": "Vehicles used",
  "kpi.avg_wait_min": "Avg wait (min)",
  "kpi.avg_ride_min": "Avg ride (min)",
  "kpi.avg_ride_ratio": "Avg detour ratio",
  "kpi.vehicle_km": "Vehicle km",
  "kpi.passenger_km": "Passenger km",
  "kpi.rejected_by_reason": "Rejections",
  "kpi.trips": "Trips",
  "kpi.assigned": "Assigned trips",
  "kpi.unassigned": "Unassigned trips",
  "kpi.vehicles_required": "Vehicles required",
  "kpi.peak_concurrent": "Peak in service",
  "kpi.vehicles_available": "Vehicles available",
  "kpi.gap": "Vehicle gap",
  "kpi.avg_trips_per_vehicle": "Trips per vehicle",
  "kpi.deadhead_km": "Deadhead km",
  "kpi.routes": "Routes",
  "kpi.directions": "Route directions",
  "kpi.gap_bins": "Gap time bins",
  "kpi.max_shortfall_ph": "Max shortfall (pax/h)",
  "kpi.feasible": "Feasible",
  "map.play": "Play",
  "map.pause": "Pause",
  "map.time": "Replay time",
  "map.noTracks": "This result has no vehicle tracks.",
  "map.activeVehicles": "Vehicles in service {n} / {total}",
  "map.closeRun": "Close result layer",
  "map.runLoading": "Loading result\u2026"
});
Object.assign(zh, {
  "ui.projectPanel": "\u9879\u76EE",
  "ui.addProject": "\u65B0\u5EFA\u9879\u76EE",
  "ui.expand": "\u5C55\u5F00",
  "ui.collapse": "\u6298\u53E0",
  "ui.searchSessions": "\u641C\u7D22\u4F1A\u8BDD",
  "ui.datasets": "\u6570\u636E\u96C6",
  "ui.datasetCount": "{count} \u4E2A\u6570\u636E\u96C6",
  "ui.showMore": "\u663E\u793A\u66F4\u591A\uFF08{count}\uFF09",
  "ui.noSearchResults": "\u6CA1\u6709\u5339\u914D\u7684\u4F1A\u8BDD",
  "ui.maxMap": "\u6700\u5927\u5316 / \u8FD8\u539F\u5730\u56FE",
  "ui.maxChat": "\u6700\u5927\u5316 / \u8FD8\u539F\u5BF9\u8BDD",
  "ui.resetLayout": "\u91CD\u7F6E\u5E03\u5C40",
  "ui.resizeLeft": "\u8C03\u6574\u9879\u76EE\u680F\u5BBD\u5EA6",
  "ui.resizeChat": "\u8C03\u6574\u5BF9\u8BDD\u680F\u5BBD\u5EA6",
  "ui.toggleLeft": "\u6298\u53E0 / \u5C55\u5F00\u9879\u76EE\u680F",
  "ui.toggleChat": "\u6298\u53E0 / \u5C55\u5F00\u5BF9\u8BDD\u680F",
  "ui.quality": "\u6570\u636E\u63D0\u793A \xB7 \u7F3A\u5931 {missing} \u9879 / \u8D28\u91CF\u63D0\u9192 {warnings} \u9879",
  "set.baidu": "\u767E\u5EA6\u5730\u56FE",
  "set.baiduHelp": "\u6D4F\u89C8\u5668\u7AEF AK\uFF0C\u9700\u5F00\u542F JavaScript API 4.0 \u670D\u52A1\u5E76\u914D\u7F6E\u6765\u6E90\u9650\u5236\u3002\u66F4\u6362\u5DF2\u52A0\u8F7D\u7684\u5BC6\u94A5\u540E\u8BF7\u5237\u65B0\u9875\u9762\u3002",
  "map.baidu": "\u767E\u5EA6\u5730\u56FE",
  "map.retry": "\u91CD\u8BD5",
  "map.reloadKey": "\u5BC6\u94A5\u5DF2\u6539\u53D8\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u52A0\u8F7D\u65B0\u5BC6\u94A5\u3002\u6682\u7528\u7EAF\u753B\u5E03\u3002",
  "map.missingKey": "\u6B64\u5E95\u56FE\u5C1A\u672A\u914D\u7F6E\u5BC6\u94A5\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u6DFB\u52A0\u3002\u6682\u7528\u7EAF\u753B\u5E03\u3002",
  "map.coordinateConflict": "\u9875\u9762\u5DF2\u6709\u767E\u5EA6\u5730\u56FE\u4F7F\u7528\u5176\u4ED6\u5750\u6807\u7CFB\uFF0C\u8BF7\u5237\u65B0\u3002\u6682\u7528\u7EAF\u753B\u5E03\u3002",
  "map.sdkFailure": "\u5730\u56FE SDK \u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u3001\u5BC6\u94A5\u53CA\u6765\u6E90\u9650\u5236\u3002\u6682\u7528\u7EAF\u753B\u5E03\uFF0C\u53EF\u91CD\u8BD5\u6216\u5207\u6362\u5E95\u56FE\u3002",
  "map.showAll": "\u5168\u90E8\u663E\u793A",
  "map.hideStops": "\u9690\u85CF\u7AD9\u70B9",
  "map.showStops": "\u663E\u793A\u7AD9\u70B9",
  "map.hideAll": "\u5168\u90E8\u9690\u85CF",
  "map.details": "\u7EBF\u8DEF\u8BE6\u60C5",
  "map.closeDetail": "\u5173\u95ED\u7EBF\u8DEF\u8BE6\u60C5",
  "map.direction": "\u7EBF\u8DEF\u65B9\u5411",
  "map.originalDirection": "\u539F\u59CB\u65B9\u5411",
  "map.missingValue": "\u672A\u63D0\u4F9B",
  "map.importedGeometry": "\u51E0\u4F55\u6765\u6E90\uFF1A\u5BFC\u5165\u7EBF\u8DEF\u51E0\u4F55",
  "map.stopConnections": "\u51E0\u4F55\u6765\u6E90\uFF1A\u7AD9\u95F4\u8FDE\u63A5\uFF08\u975E\u9053\u8DEF\u8F68\u8FF9\uFF09",
  "map.stopDetail": "\u7AD9\u70B9\u8BE6\u60C5",
  "map.closeStop": "\u5173\u95ED\u7AD9\u70B9\u8BE6\u60C5",
  "map.visible": "\u663E\u793A\u7EBF\u8DEF",
  "map.search": "\u641C\u7D22\u7EBF\u8DEF\u3001\u8D77\u70B9\u6216\u7EC8\u70B9",
  "map.truncated": "\u540E\u7AEF\u5DF2\u622A\u65AD\u5730\u56FE\u65B9\u5411\u6570\u636E\uFF1B\u5F53\u524D\u4E0D\u662F\u5B8C\u6574\u8DEF\u7F51\u3002"
});
Object.assign(en, {
  "ui.projectPanel": "Projects",
  "ui.addProject": "New project",
  "ui.expand": "Expand",
  "ui.collapse": "Collapse",
  "ui.searchSessions": "Search conversations",
  "ui.datasets": "Datasets",
  "ui.datasetCount": "{count} datasets",
  "ui.showMore": "Show more ({count})",
  "ui.noSearchResults": "No matching conversations",
  "ui.maxMap": "Maximize / restore map",
  "ui.maxChat": "Maximize / restore chat",
  "ui.resetLayout": "Reset layout",
  "ui.resizeLeft": "Resize projects",
  "ui.resizeChat": "Resize chat",
  "ui.toggleLeft": "Toggle projects",
  "ui.toggleChat": "Toggle chat",
  "ui.quality": "Data notices \xB7 {missing} missing / {warnings} warnings",
  "set.baidu": "Baidu Maps",
  "set.baiduHelp": "Browser AK with JSAPI 4.0 enabled and allowed origins configured. Refresh after changing a loaded key.",
  "map.baidu": "Baidu Maps",
  "map.retry": "Retry",
  "map.reloadKey": "Key changed. Refresh to load it. Using canvas temporarily.",
  "map.missingKey": "Configure this map key in Settings. Using canvas temporarily.",
  "map.coordinateConflict": "An existing Baidu map uses another coordinate system. Refresh. Using canvas temporarily.",
  "map.sdkFailure": "Map SDK failed to load. Check network, key and allowed origins; retry or switch maps. Using canvas temporarily.",
  "map.showAll": "Show all",
  "map.hideStops": "Hide stops",
  "map.showStops": "Show stops",
  "map.hideAll": "Hide all",
  "map.details": "Route details",
  "map.closeDetail": "Close route details",
  "map.direction": "Route direction",
  "map.originalDirection": "Original direction",
  "map.missingValue": "Not provided",
  "map.importedGeometry": "Geometry: imported route",
  "map.stopConnections": "Geometry: stop connections (not road tracks)",
  "map.stopDetail": "Stop details",
  "map.closeStop": "Close stop details",
  "map.visible": "Show route",
  "map.search": "Search routes or endpoints",
  "map.truncated": "The backend truncated map directions; this is not the complete network."
});
Object.assign(zh, { "map.engine": "\u5730\u56FE\u5E95\u56FE", "map.reset": "\u5168\u7F51\u89C6\u91CE" });
Object.assign(en, { "map.engine": "Map provider", "map.reset": "Fit network" });
Object.assign(zh, { "ui.jobCounts": "\u8FD0\u884C {running} \xB7 \u5931\u8D25 {failed}" });
Object.assign(en, { "ui.jobCounts": "{running} running \xB7 {failed} failed" });
Object.assign(zh, { "map.noTimetable": "\u672C\u7248\u672C\u672A\u63D0\u4F9B\u65F6\u523B\u8868\uFF0C\u73ED\u6B21\u6570\u672A\u77E5" });
Object.assign(en, {
  "map.noTimetable": "No timetable in this version; trip count unknown"
});
Object.assign(zh, {
  "set.amapHelp": "\u9AD8\u5FB7 Web JS Key \u4E0E\u5B89\u5168\u5BC6\u94A5\u3002\u914D\u7F6E\u540E\u9ED8\u8BA4\u4F7F\u7528\u7070\u767D\u5E95\u56FE\uFF1B\u6570\u636E\u4FDD\u5B58 WGS84\uFF0C\u4EC5\u663E\u793A\u8F6C\u6362\u4E3A GCJ02\u3002\u66F4\u6362\u5DF2\u52A0\u8F7D\u5BC6\u94A5\u540E\u5237\u65B0\u3002"
});
Object.assign(en, {
  "set.amapHelp": "AMap Web JS key and security code. Configured maps default to whitesmoke; only display coordinates use GCJ02. Refresh after changing a loaded key."
});

// src/data.jsx
var import_react5 = __toESM(require("react"), 1);

// src/workbench-ui.jsx
var import_react2 = __toESM(require("react"), 1);

// src/layout.js
var DEFAULT_LAYOUT = Object.freeze({
  leftWidth: 272,
  chatWidth: 400,
  leftOpen: true,
  chatOpen: true
});
var LAYOUT_KEY = "linggo.layout.v1";
var clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function normalizeLayout(value = {}) {
  if (!value || typeof value !== "object") value = {};
  return {
    leftWidth: Number.isFinite(value.leftWidth) ? clamp(value.leftWidth, 220, 420) : DEFAULT_LAYOUT.leftWidth,
    chatWidth: Number.isFinite(value.chatWidth) ? clamp(value.chatWidth, 320, 760) : DEFAULT_LAYOUT.chatWidth,
    leftOpen: typeof value.leftOpen === "boolean" ? value.leftOpen : true,
    chatOpen: typeof value.chatOpen === "boolean" ? value.chatOpen : true
  };
}
function computeLayout(width, preferences, focus = "normal") {
  const p = normalizeLayout(preferences);
  const mobile = width < 900;
  if (mobile)
    return {
      mobile: true,
      left: width,
      chat: width,
      center: width,
      reserved: width
    };
  if (focus === "chat")
    return { mobile: false, left: 0, chat: width, center: 0, reserved: 0 };
  if (focus === "map")
    return { mobile: false, left: 0, chat: 0, center: width, reserved: width };
  const centerFloor = 400;
  const centerPreferred = 560;
  const chatFloor = p.chatOpen ? 320 : 40;
  let left = p.leftOpen ? p.leftWidth : 48;
  const fits = (side) => width - side - chatFloor - 16;
  if (fits(left) < centerPreferred && fits(48) >= centerPreferred) left = 48;
  if (fits(left) < centerFloor) left = 48;
  const chatCeiling = Math.min(
    p.chatWidth,
    760,
    width * 0.6,
    Math.max(chatFloor, width - left - centerFloor - 16)
  );
  const chat = p.chatOpen ? Math.min(p.chatWidth, chatCeiling) : 40;
  const center = width - left - chat - 16;
  return { mobile: false, left, chat, center, reserved: width - chat - 8 };
}
function readPreference(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function writePreference(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

// src/compat-client.js
var FRAME_SELECTOR = "div:has(> [data-rightbar-col])";
function applyPresentationGeometry(document2, geometry, { view, focus, chatOpen }) {
  const root = document2.documentElement;
  root.style.setProperty("--linggo-left", `${geometry.left}px`);
  root.style.setProperty("--linggo-reserved", `${geometry.reserved}px`);
  root.style.setProperty(
    "--linggo-width",
    `${geometry.mobile || focus === "chat" ? 0 : geometry.reserved + (focus === "map" ? 0 : 8)}px`
  );
  root.setAttribute("data-linggo-focus", focus);
  root.setAttribute("data-linggo-view", view);
  root.toggleAttribute(
    "data-linggo-chat-closed",
    focus === "map" || focus === "normal" && !chatOpen
  );
  return () => {
    for (const key of ["--linggo-left", "--linggo-reserved", "--linggo-width"])
      root.style.removeProperty(key);
    for (const key of [
      "data-linggo-focus",
      "data-linggo-view",
      "data-linggo-chat-closed"
    ])
      root.removeAttribute(key);
  };
}
function createClientAdapter(ctx, { api, t, source = "linggo" }) {
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
    "slots.register": ctx.slots?.register
  };
  const missing = Object.entries(required).filter(([, fn]) => typeof fn !== "function").map(([key]) => key);
  if (missing.length)
    throw Error(`LingGo: missing required DSH APIs: ${missing.join(", ")}`);
  const capabilities = Object.freeze({
    draftInitialization: typeof ctx.conversation?.input?.requestDraftInitialization === "function"
  });
  const openSession = (id) => ctx.uiWorkspace.openSession(id);
  const workspaceFor = async (project, mode = "development") => {
    const { cwd } = await api("directory", { projectId: project.id, mode });
    const view = await ctx.workspaces.create({ path: cwd });
    const title = t(
      mode === "development" ? "dev.workspaceTitle" : "wb.workspaceTitle",
      { name: project.name }
    );
    if (view.title !== title)
      await ctx.workspaces.rename(view.workspaceId, title);
    for (let i = 0; i < 40; i++) {
      if (ctx.workspaces.list.getSnapshot().items.some((w2) => w2.workspaceId === view.workspaceId))
        return view;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw Error(t("dev.workspaceUnavailable"));
  };
  const initializeDraft = (binding, prompt) => {
    if (!capabilities.draftInitialization) return "manual";
    if (!binding) throw Error(t("dev.draftBlocked"));
    const result = ctx.conversation.input.requestDraftInitialization(binding, {
      prompt
    });
    if (!["applied", "preserved"].includes(result))
      throw Error(t("dev.draftBlocked"));
    return result;
  };
  const ensureProjectWorkspaces = async (projectId) => {
    const project = (await api("state")).projects.find(
      (p) => p.id === projectId
    );
    if (!project) throw Error(t("dev.unknownProject"));
    const presentation = await workspaceFor(project, "presentation");
    const development = await workspaceFor(project, "development");
    return { project, presentation, development };
  };
  const newPresentation = async (projectId) => {
    const { project, presentation } = await ensureProjectWorkspaces(projectId);
    return openSession(
      await ctx.sessions.create({ workspaceId: presentation.workspaceId })
    );
  };
  const openHandoff = async (item, project, prompt) => {
    if (!project) throw Error(t("dev.unknownProject"));
    const workspace = await workspaceFor(project);
    if (item.devSessionId && ctx.sessions.list.getSnapshot().byId[item.devSessionId]) {
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
  const mountWorkbench = (props, component) => ctx.slots.inject(
    "shell.overlay",
    () => ctx.slots.register(
      {
        name: "shell.overlay",
        id: "linggo-workbench",
        inject: () => ({ ...props })
      },
      component
    )
  );
  const mountDevelopment = (props, component, icon) => {
    ctx.slots.inject(
      "main",
      () => ctx.slots.register(
        { name: "main", key: "linggo", inject: () => ({ ...props }) },
        component
      )
    );
    ctx.slots.inject(
      "sidebar.panellist",
      () => ctx.slots.register(
        {
          name: "sidebar.panellist",
          id: "linggo",
          order: 10,
          label: () => t("panel")
        },
        icon
      )
    );
  };
  return {
    capabilities,
    openSession,
    ensureProjectWorkspaces,
    newPresentation,
    openHandoff,
    mountWorkbench,
    mountDevelopment
  };
}
function installPresentationStyle(document2, style2, enabled) {
  const el = document2.createElement("style");
  el.dataset.linggo = "";
  el.textContent = style2;
  document2.head.append(el);
  if (enabled) document2.documentElement.setAttribute("data-linggo", "");
  return () => {
    el.remove();
    for (const key of ["--linggo-left", "--linggo-reserved", "--linggo-width"]) document2.documentElement.style.removeProperty(key);
    for (const key of [
      "data-linggo",
      "data-linggo-blocked",
      "data-linggo-view",
      "data-linggo-focus",
      "data-linggo-chat-closed"
    ])
      document2.documentElement.removeAttribute(key);
  };
}

// src/workbench-ui.jsx
var h2 = import_react2.default.createElement;
function useWorkbenchLayout(view) {
  const [prefs, setPrefs] = (0, import_react2.useState)(
    () => normalizeLayout(readPreference(localStorage, LAYOUT_KEY, {}))
  );
  const [width, setWidth] = (0, import_react2.useState)(() => window.innerWidth);
  const [focus, setFocus] = (0, import_react2.useState)("normal");
  const geometry = computeLayout(width, prefs, focus);
  (0, import_react2.useEffect)(() => {
    const observer = new ResizeObserver(
      () => setWidth(document.documentElement.clientWidth)
    );
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);
  (0, import_react2.useEffect)(
    () => applyPresentationGeometry(document, geometry, {
      view,
      focus: geometry.mobile ? "normal" : focus,
      chatOpen: geometry.mobile ? true : prefs.chatOpen
    }),
    [width, prefs, focus, view]
  );
  const update = (next, persist = true) => {
    const p = normalizeLayout(next);
    setPrefs(p);
    if (persist) writePreference(localStorage, LAYOUT_KEY, p);
  };
  const reset = () => {
    setFocus("normal");
    update({ ...DEFAULT_LAYOUT });
  };
  return { prefs, geometry, focus, setFocus, update, reset };
}
function Splitter({ side, layout, t }) {
  const { prefs, geometry, update } = layout;
  const drag = (0, import_react2.useRef)(null), frame = (0, import_react2.useRef)(null), latest = (0, import_react2.useRef)(prefs);
  latest.current = prefs;
  (0, import_react2.useEffect)(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    []
  );
  const end = (e) => {
    if (!drag.current) return;
    cancelAnimationFrame(frame.current);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    const pending = drag.current.pending;
    drag.current = null;
    if (pending !== void 0) change(pending);
    else update(latest.current);
  };
  const field = side === "left" ? "leftWidth" : "chatWidth";
  const open = side === "left" ? prefs.leftOpen && geometry.left > 48 : prefs.chatOpen;
  const change = (value, persist = true) => {
    const maximum = side === "left" ? Math.min(420, window.innerWidth - (prefs.chatOpen ? 320 : 40) - 416) : Math.min(
      760,
      window.innerWidth * 0.6,
      window.innerWidth - geometry.left - 416
    );
    update(
      {
        ...latest.current,
        [field]: Math.max(
          side === "left" ? 220 : 320,
          Math.min(maximum, value)
        )
      },
      persist
    );
  };
  return h2(
    "div",
    {
      className: `linggo-splitter ${side}`,
      role: "separator",
      tabIndex: open ? 0 : -1,
      "aria-label": t(side === "left" ? "ui.resizeLeft" : "ui.resizeChat"),
      "aria-orientation": "vertical",
      "aria-valuemin": side === "left" ? 220 : 320,
      "aria-valuemax": side === "left" ? 420 : 760,
      "aria-valuenow": prefs[field],
      onKeyDown: (e) => {
        if (!open) return;
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          change(
            prefs[field] + (e.key === "ArrowRight" ? 1 : -1) * (side === "left" ? 1 : -1) * (e.shiftKey ? 40 : 10)
          );
        }
        if (e.key === "Home") {
          e.preventDefault();
          change(DEFAULT_LAYOUT[field]);
        }
      },
      onDoubleClick: () => open && change(DEFAULT_LAYOUT[field]),
      onPointerDown: (e) => {
        if (!open || e.button !== 0 || e.target.closest("button")) return;
        drag.current = {
          x: e.clientX,
          start: side === "left" ? geometry.left : geometry.chat
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      },
      onPointerMove: (e) => {
        if (!drag.current) return;
        const value = drag.current.start + (e.clientX - drag.current.x) * (side === "left" ? 1 : -1);
        drag.current.pending = value;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => change(value, false));
      },
      onPointerUp: end,
      onPointerCancel: end
    },
    h2(
      "button",
      {
        type: "button",
        className: "linggo-rail-toggle",
        title: t(open ? "ui.collapse" : "ui.expand"),
        "aria-label": t(side === "left" ? "ui.toggleLeft" : "ui.toggleChat"),
        onClick: () => update({
          ...prefs,
          [side === "left" ? "leftOpen" : "chatOpen"]: !open
        })
      },
      side === "left" ? open ? "\u2039" : "\u203A" : open ? "\u203A" : "\u2039"
    )
  );
}
function useSectionState(id, defaultOpen = false) {
  const key = "linggo.section." + id;
  const [open, setOpen] = (0, import_react2.useState)(() => {
    const stored = readPreference(localStorage, key, defaultOpen);
    return typeof stored === "boolean" ? stored : defaultOpen;
  });
  const value = (0, import_react2.useRef)(open);
  const update = (0, import_react2.useCallback)((next) => {
    const resolved = typeof next === "function" ? next(value.current) : next;
    value.current = resolved === true;
    writePreference(localStorage, key, value.current);
    setOpen(value.current);
  }, [key]);
  return [open, update];
}
function SideSection({
  id,
  title,
  badge,
  icon,
  actions,
  children,
  open,
  onOpenChange,
  collapsedSummary,
  className = ""
}) {
  const bodyId = `linggo-section-${id}-body`;
  return h2(
    "section",
    {
      className: `linggo-section ${open ? "open" : "closed"} ${className}`,
      "data-section": id,
      "aria-label": title
    },
    h2(
      "div",
      { className: "linggo-section-header" },
      h2(
        "button",
        {
          className: "linggo-section-heading",
          type: "button",
          "aria-label": title,
          "aria-expanded": open,
          "aria-controls": bodyId,
          onClick: () => onOpenChange(!open)
        },
        h2(
          "span",
          { className: "linggo-section-slot", "aria-hidden": "true" },
          h2("span", { className: "linggo-section-symbol" }, icon),
          h2("svg", {
            className: "linggo-chevron",
            width: 16,
            height: 16,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 2
          }, h2("path", { d: "m9 5 7 7-7 7" }))
        ),
        h2("span", { className: "linggo-section-title" }, title),
        badge ? h2("span", { className: "linggo-count" }, badge) : null
      ),
      actions ? h2("div", { className: "linggo-section-actions" }, actions) : null
    ),
    !open && collapsedSummary,
    h2(
      "div",
      { id: bodyId, className: "linggo-section-body", hidden: !open },
      open ? children : null
    )
  );
}
function Modal({ title, children, onClose, closeLabel }) {
  const ref = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    const before = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (before?.isConnected) before.focus();
    };
  }, []);
  return h2(
    "dialog",
    {
      ref,
      className: "linggo-modal linggo-root",
      "aria-label": title,
      onCancel: (e) => {
        e.preventDefault();
        onClose();
      },
      onKeyDown: (e) => e.stopPropagation()
    },
    h2(
      "header",
      null,
      h2("h2", null, title),
      h2("button", { onClick: onClose, "aria-label": closeLabel }, "\xD7")
    ),
    children
  );
}
var workbenchStyle = `
.linggo-workspace{border-right:0;grid-template-columns:var(--linggo-left) 6px minmax(0,1fr);width:var(--linggo-reserved);}
.linggo-workspace>aside{padding:0;display:flex;flex-direction:column;min-height:0;overflow:hidden;background:var(--c-side);}
.linggo-workspace>main{padding:0;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;}
.linggo-brand{display:flex;align-items:center;justify-content:space-between;padding:18px 16px 12px;gap:8px;padding-top:max(18px,var(--dsh-frame-top-clearance,0px));}
.linggo-brand>div{min-width:0;}
.linggo-brand strong{display:block;font-size:15px;letter-spacing:-.3px;line-height:1.2;}
.linggo-brand small{display:block;font-size:11px;color:var(--c-cap);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.linggo-brand button{width:28px;height:28px;padding:0;margin:0;border-radius:8px;justify-content:center;flex:none;}
.linggo-project-picker{padding:0 16px 12px;display:flex;align-items:center;gap:6px;}
.linggo-project-picker select{min-width:0;margin:0;height:32px;padding:4px 10px;border-radius:8px;}
.linggo-project-picker small{font-size:12px;color:var(--c-cap);}
/* DSH WorkspaceBrowser .sectionHeader/.iconButton: 36px header, 28px actions.
   LingGo deliberately gives all section titles primary ink and 14px/500. */
.linggo-sidebar-body{flex:1;min-height:0;overflow:auto;padding:0 10px 12px;scrollbar-gutter:stable;display:flex;flex-direction:column;gap:12px;}
.linggo-section{min-width:0;flex:none;}
.linggo-section-header{display:flex;align-items:center;gap:4px;height:36px;padding:0 2px;margin-bottom:4px;border-radius:8px;}
.linggo-root .linggo-section-heading{flex:1;min-width:0;display:flex;align-items:center;gap:6px;height:36px;border:0;border-radius:8px;background:transparent;padding:0 4px;margin:0;justify-content:flex-start;font-size:14px;font-weight:500;color:var(--c-text);}
.linggo-section-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;line-height:20px;}
/* DSH Rows: folder by default, expand arrow on row hover; share one slot. */
.linggo-section-slot{position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;color:var(--c-cap);}
.linggo-section-symbol{display:inline-flex;}
.linggo-chevron{position:absolute;inset:2px 0;opacity:0;transition:transform .12s ease;}
.linggo-section.open .linggo-chevron{transform:rotate(90deg);}
.linggo-section-header:is(:hover,:focus-within) .linggo-chevron{opacity:1;}
.linggo-section-header:is(:hover,:focus-within) .linggo-section-symbol{opacity:0;}
.linggo-icon{flex:none;}
.linggo-section-actions{flex:none;display:flex;align-items:center;gap:4px;}
.linggo-root .linggo-section-actions button{width:28px;height:28px;padding:0;margin:0;justify-content:center;border:0;background:transparent;color:var(--c-sub);border-radius:6px;}
.linggo-root .linggo-section-actions button:hover,.linggo-root .linggo-section-heading:hover{background:var(--c-hover);color:var(--c-text);}
.linggo-section-body{padding:0 4px;display:grid;gap:2px;}
.linggo-section-body[hidden]{display:none;}
.linggo-count{font-size:11px;color:var(--c-cap);font-weight:400;line-height:16px;flex:none;white-space:nowrap;}
.linggo-section-summary{display:block;min-width:0;margin:0;padding:2px 8px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:20px;color:var(--c-sub);}
.linggo-section.closed>.linggo-section-summary{margin:0 4px;}
.linggo-sidebar-list{list-style:none;margin:0;padding:0;min-width:0;}
.linggo-sidebar-list>li{min-width:0;margin:0;padding:0;}
/* DSH Rows .sessionRow/.title/.time: a single compact row and trailing metadata. */
.linggo-root .linggo-sidebar-row{display:flex;align-items:center;gap:8px;width:100%;min-width:0;height:32px;margin:0;padding:0 8px;border:0;border-radius:8px;background:transparent;text-align:left;color:var(--c-text);}
.linggo-root .linggo-sidebar-row:hover,.linggo-root .linggo-sidebar-row[aria-current="true"]{background:var(--c-hover);}
.linggo-row-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:400;line-height:20px;color:var(--c-text);}
.linggo-row-meta{flex:none;display:inline-flex;align-items:center;gap:4px;font-size:11px;line-height:16px;color:var(--c-cap);white-space:nowrap;font-variant-numeric:tabular-nums;}
.linggo-row-meta .running{color:var(--c-accent);font-size:8px;}
.linggo-root .linggo-show-more{display:flex;align-items:center;height:28px;margin:0;padding:0 8px;border:0;background:transparent;border-radius:6px;font-size:12px;color:var(--c-cap);text-align:left;justify-self:start;}
.linggo-root .linggo-show-more:hover{background:transparent;color:var(--c-sub);}
.linggo-root :is(.linggo-section-heading,.linggo-section-actions button,.linggo-sidebar-row,.linggo-show-more):focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--c-accent));outline-offset:-2px;}
.linggo-session-section .linggo-section-body>input{height:32px;border-radius:8px;margin:0 0 4px;}
@media(prefers-reduced-motion:reduce){.linggo-chevron{transition:none;}}
.linggo-sidebar-footer{border-top:1px solid var(--c-line);padding:12px 14px;display:grid;gap:6px;background:var(--c-side);}
.linggo-sidebar-footer button,.linggo-sidebar-footer a{justify-content:center;margin:0!important;height:34px;border-radius:10px;}
.linggo-splitter{position:relative;touch-action:none;cursor:col-resize;z-index:20;width:6px;}
.linggo-splitter:before{content:'';position:absolute;left:2px;top:0;bottom:0;width:1px;background:transparent;transition:background .12s ease,width .12s ease,left .12s ease;}
.linggo-splitter:hover:before,.linggo-splitter:focus:before{width:2px;left:2px;background:var(--c-accent);}
.linggo-splitter.right{position:fixed;left:var(--linggo-reserved);top:var(--dsh-frame-top-clearance,0px);bottom:0;width:6px;pointer-events:auto;}
.linggo-rail-toggle{position:absolute;left:-8px;top:48%;width:22px;height:36px;padding:0!important;margin:0!important;justify-content:center;opacity:0;border-radius:8px;background:var(--c-bg);box-shadow:0 2px 8px #0002;}
.linggo-splitter:hover .linggo-rail-toggle,.linggo-splitter:focus-within .linggo-rail-toggle{opacity:1;}
.linggo-icon-rail{display:flex;flex-direction:column;align-items:center;gap:10px;padding-top:18px;width:48px;}
.linggo-icon-rail button{width:34px;height:34px;justify-content:center;padding:0;margin:0;border-radius:10px;}
.linggo-icon-rail b{color:var(--c-accent);margin-bottom:6px;font-size:15px;}
.linggo-toolbar{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--c-line);min-height:52px;flex-wrap:wrap;padding-top:max(10px,var(--dsh-frame-top-clearance,0px));background:var(--c-bg);}
.linggo-toolbar .linggo-tabbar{border:0;margin:0;}
.linggo-toolbar-spacer{flex:1;}
.linggo-toolbar button{margin:0;white-space:nowrap;}
.linggo-toolbar button.quiet{border:0;background:transparent;color:var(--c-sub);}
.linggo-main-content{flex:1;min-height:0;overflow:auto;padding:24px 28px;}
.linggo-main-content.map{display:flex;flex-direction:column;padding:0;overflow:hidden;}
.linggo-quality{flex:none;margin:0;padding:8px 16px;font-size:11px;background:var(--c-hover);border-bottom:1px solid var(--c-line);}
.linggo-quality summary{cursor:pointer;color:var(--c-sub);}
.linggo-quality ul{max-height:120px;overflow:auto;margin:6px 0 0;padding-left:18px;}
.linggo-modal{width:min(540px,calc(100vw - 32px));max-height:80vh;overflow:auto;padding:20px;border:1px solid var(--c-line);border-radius:16px;background:var(--c-bg);color:var(--c-text);box-shadow:0 16px 64px #0003;}
.linggo-modal::backdrop{background:#0005;}
.linggo-modal header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.linggo-modal header h2{font-size:16px;}
.linggo-modal header button{border:0;}
.linggo-modal textarea{min-height:140px;}
.linggo-chat-rail{position:fixed;right:0;top:var(--dsh-frame-top-clearance,0px);bottom:0;width:44px;background:var(--c-side);border-left:1px solid var(--c-line);pointer-events:auto;display:flex;align-items:center;flex-direction:column;padding-top:18px;gap:12px;}
.linggo-chat-rail button{padding:6px;width:32px;height:32px;justify-content:center;border-radius:10px;}
.linggo-chat-controls{position:fixed;right:10px;top:max(52px,var(--dsh-frame-top-clearance,0px));z-index:30;pointer-events:auto;display:flex;gap:6px;}
.linggo-chat-controls button{height:28px;padding:2px 10px;background:var(--c-bg);opacity:.92;border-radius:8px;}
.linggo-toast{position:fixed;bottom:16px;left:60px;max-width:min(500px,80vw);padding:10px 14px;border-radius:12px;background:var(--c-bg);border:1px solid var(--c-line);box-shadow:0 6px 30px #0002;z-index:100;pointer-events:auto;}
html[data-linggo-focus="chat"] .linggo-workspace,html[data-linggo-focus="chat"] .linggo-splitter{display:none;}
html[data-linggo-focus="map"] .linggo-workspace{border-right:0;grid-template-columns:0 0 minmax(0,1fr);width:100vw;}
html[data-linggo-focus="map"] .linggo-workspace>aside,html[data-linggo-focus="map"] .linggo-splitter{visibility:hidden;}
@media(max-width:899px){
.linggo-workspace{top:44px;width:100%;grid-template-columns:1fr;grid-template-rows:minmax(0,1fr);overflow:hidden;}
.linggo-workspace>aside{display:none;}
.linggo-splitter,.linggo-chat-controls,.linggo-chat-rail{display:none;}
.linggo-workspace>main{padding:0;}
.linggo-toolbar{padding-top:8px;}
html[data-linggo-view="project"] .linggo-workspace>aside{display:flex;}
html[data-linggo-view="project"] .linggo-workspace>main{display:none;}
html[data-linggo-view="map"] .linggo-workspace>aside{display:none;}
html[data-linggo-view="chat"] .linggo-workspace{display:none;}
.linggo-sidebar-body{overflow:auto;}
.linggo-session-section .linggo-list li{min-height:44px;}
}
`;

// src/sidebar-model.js
var SIDEBAR_PAGE_SIZE = 5;
var ENTITY_ORDER = [
  "stops",
  "routes",
  "route_stops",
  "trips",
  "ridership",
  "od",
  "demand",
  "gps",
  "vehicles",
  "depots"
];
function limitSidebarRows(rows, limit, keep = () => false) {
  let ordinary = 0;
  const visible = rows.filter((row) => keep(row) || ordinary++ < limit);
  return { rows: visible, hiddenCount: rows.length - visible.length };
}
function projectDatasets(state, projectId) {
  const datasets = state.dataVersions.filter((item) => item.projectId === projectId);
  const currentId = state.projects.find((item) => item.id === projectId)?.currentVersionId;
  return {
    datasets,
    current: datasets.find((item) => item.id === currentId) ?? datasets.at(-1)
  };
}
function datasetEntities(dataset) {
  return ENTITY_ORDER.filter((key) => dataset.entities?.[key]);
}
function datasetLabel(t, dataset) {
  const entities = datasetEntities(dataset);
  return entities.length ? entities.slice(0, 3).map((key) => t("entity." + key)).join(" \xB7 ") + (entities.length > 3 ? " \u2026" : "") : dataset.id.slice(0, 8);
}
function datasetSummary(t, dataset) {
  if (!dataset) return t("wb.noData");
  const counts = datasetEntities(dataset).slice(0, 2).map(
    (key) => t("entity." + key) + " " + dataset.entities[key].rows.toLocaleString()
  );
  return [datasetLabel(t, dataset), ...counts].join(" \xB7 ");
}
function isActiveJob(job) {
  return job.status === "running" || job.status === "queued";
}
function newestJobs(jobs, projectId) {
  return jobs.filter((job) => job.projectId === projectId).slice().sort(
    (a2, b2) => Number(isActiveJob(b2)) - Number(isActiveJob(a2)) || (b2.finishedAt ?? b2.createdAt).localeCompare(a2.finishedAt ?? a2.createdAt)
  );
}
function observeJobAttention(storage, projectId, jobs, previous) {
  const key = "linggo.section.jobs.attention." + projectId;
  const stored = previous ?? readPreference(storage, key, []);
  const seen = new Set(Array.isArray(stored) ? stored.filter((token) => typeof token === "string" && /^(active|failed):.+/.test(token)) : []);
  let shouldOpen = false;
  for (const job of jobs) {
    if (job.projectId !== projectId) continue;
    const phase = isActiveJob(job) ? "active" : job.status === "failed" ? "failed" : null;
    if (!phase) continue;
    const token = phase + ":" + job.id;
    if (!seen.has(token)) {
      seen.add(token);
      shouldOpen = true;
    }
  }
  const tokens = [...seen];
  if (shouldOpen) writePreference(storage, key, tokens);
  return { tokens, shouldOpen };
}

// src/map-view.jsx
var import_react4 = __toESM(require("react"), 1);

// src/map-model.js
function outOfChina(lon, lat) {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
}
function gcj([lon, lat]) {
  if (outOfChina(lon, lat)) return [lon, lat];
  const a2 = 6378245, ee = 0.006693421622965943, x = lon - 105, y2 = lat - 35;
  let dLat = -100 + 2 * x + 3 * y2 + 0.2 * y2 * y2 + 0.1 * x * y2 + 0.2 * Math.sqrt(Math.abs(x));
  dLat += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  dLat += (20 * Math.sin(y2 * Math.PI) + 40 * Math.sin(y2 / 3 * Math.PI)) * 2 / 3;
  dLat += (160 * Math.sin(y2 / 12 * Math.PI) + 320 * Math.sin(y2 * Math.PI / 30)) * 2 / 3;
  let dLon = 300 + x + 2 * y2 + 0.1 * x * x + 0.1 * x * y2 + 0.1 * Math.sqrt(Math.abs(x));
  dLon += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
  dLon += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
  dLon += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
  const rad = lat / 180 * Math.PI;
  let magic = Math.sin(rad);
  magic = 1 - ee * magic * magic;
  const sq = Math.sqrt(magic);
  dLat = dLat * 180 / (a2 * (1 - ee) / (magic * sq) * Math.PI);
  dLon = dLon * 180 / (a2 / sq * Math.cos(rad) * Math.PI);
  return [lon + dLon, lat + dLat];
}
function wgs(p) {
  let q = [...p];
  for (let i = 0; i < 4; i++) {
    const g2 = gcj(q);
    q = [q[0] + p[0] - g2[0], q[1] + p[1] - g2[1]];
  }
  return q;
}
var colors = [
  "#4275dc",
  "#16a58a",
  "#df8741",
  "#9663d4",
  "#d95877",
  "#248dab"
];
function routeColor(id) {
  let n = 0;
  for (const c of String(id)) n = n * 31 + c.charCodeAt(0) >>> 0;
  return colors[n % colors.length];
}
var STOP_RADIUS = 3;
var STOP_RADIUS_SELECTED = 4.5;
function bounds(points) {
  let b2 = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of points) {
    if (!p || !p.every(Number.isFinite)) continue;
    b2 = [
      Math.min(b2[0], p[0]),
      Math.min(b2[1], p[1]),
      Math.max(b2[2], p[0]),
      Math.max(b2[3], p[1])
    ];
  }
  return Number.isFinite(b2[0]) ? b2 : null;
}
function mapModel(data) {
  const stops = new Map(data.stops.map((s2) => [s2[0], s2])), routes = /* @__PURE__ */ new Map(), through = /* @__PURE__ */ new Map();
  const lines = data.routes.map((r2, i) => ({
    ...r2,
    key: r2.id + "/" + r2.dir + "/" + i,
    source: r2.geometry?.length > 1 ? "geometry" : "connections",
    path: r2.geometry?.length > 1 ? r2.geometry : r2.stops.map((id) => stops.get(id)).filter(Boolean).map((s2) => [s2[2], s2[3]])
  }));
  for (const l of lines) {
    l.bounds = bounds(l.path);
    if (!routes.has(l.id)) routes.set(l.id, []);
    routes.get(l.id).push(l);
    for (const id of l.stops) {
      if (!through.has(id)) through.set(id, /* @__PURE__ */ new Set());
      through.get(id).add(l.id);
    }
  }
  return {
    stops,
    lines,
    routes,
    through,
    bbox: data.bbox ?? bounds(lines.flatMap((l) => l.path)),
    routeCount: routes.size
  };
}
function intersects(a2, b2) {
  return a2 && b2 && a2[0] <= b2[2] && a2[2] >= b2[0] && a2[1] <= b2[3] && a2[3] >= b2[1];
}
function segmentDistance(p, a2, b2) {
  const dx = b2[0] - a2[0], dy = b2[1] - a2[1], d2 = dx * dx + dy * dy;
  const u = d2 ? Math.max(0, Math.min(1, ((p[0] - a2[0]) * dx + (p[1] - a2[1]) * dy) / d2)) : 0;
  return Math.hypot(p[0] - a2[0] - u * dx, p[1] - a2[1] - u * dy);
}
function simplify(path, project, tolerance = 1.5) {
  if (path.length < 3) return path;
  const result = [path[0]];
  let last = project(path[0]);
  for (let i = 1; i < path.length - 1; i++) {
    const p = project(path[i]);
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= tolerance) {
      result.push(path[i]);
      last = p;
    }
  }
  result.push(path.at(-1));
  return result;
}
function hitLine(point, lines, project, threshold = 7) {
  let hit = null, dist = threshold;
  for (const l of lines)
    for (let i = 1; i < l.path.length; i++) {
      const d2 = segmentDistance(
        point,
        project(l.path[i - 1]),
        project(l.path[i])
      );
      if (d2 < dist) {
        hit = l;
        dist = d2;
      }
    }
  return hit;
}
function visibleScene(scene, project, box) {
  const { model, visible, selection, showStops = true } = scene;
  const lines = model.lines.filter(
    (l) => visible.has(l.id) && (l.id === selection.routeId || intersects(l.bounds, box))
  ).map((l) => ({
    ...l,
    path: simplify(l.path, project, l.id === selection.routeId ? 0.5 : 1.5)
  }));
  if (!showStops) return { lines, stops: [] };
  const allowed = /* @__PURE__ */ new Set();
  for (const l of model.lines) {
    if (!visible.has(l.id)) continue;
    for (const id of l.stops) allowed.add(id);
  }
  const priority = new Set(
    model.lines.filter((l) => l.id === selection.routeId && visible.has(l.id)).flatMap((l) => l.stops)
  );
  if (selection.stopId) priority.add(selection.stopId);
  const cells = /* @__PURE__ */ new Map(), stops = [];
  for (const s2 of model.stops.values()) {
    const id = s2[0];
    const isPriority = priority.has(id);
    if (!isPriority && !allowed.has(id)) continue;
    const p = [s2[2], s2[3]];
    if (!isPriority && !intersects([p[0], p[1], p[0], p[1]], box)) continue;
    const px = project(p);
    if (isPriority) {
      stops.push({ point: p, ids: [id], selected: true });
      continue;
    }
    const key = Math.floor(px[0] / 24) + ":" + Math.floor(px[1] / 24);
    if (cells.has(key)) continue;
    cells.set(key, true);
    stops.push({ point: p, ids: [id], selected: false });
  }
  return { lines, stops };
}

// node_modules/@baidumap/jsapi-loader/dist/index.mjs
var A = "api.map.baidu.com";
var r = {
  NOTLOAD: "notload",
  LOADING: "loading",
  LOADED: "loaded",
  FAILED: "failed"
};
var d = {
  "3.0": { query: ["v=3.0"], ns: "BMap" },
  gl: { query: ["v=1.0", "type=webgl"], ns: "BMapGL" },
  "4.0": { query: ["v=4.0"], ns: "BMap" }
};
var w = Object.keys(d);
function L(e, n) {
  const o = e.serviceHost ? e.serviceHost : e.protocol + "://" + A + "/", i = d[e.version].query.slice();
  return !e.serviceHost && e.ak && i.push("ak=" + encodeURIComponent(e.ak)), i.push("callback=" + n), o + "api?" + i.join("&");
}
function m(e) {
  const n = d[e].ns;
  return typeof window < "u" ? window[n] : void 0;
}
function D(e) {
  e = e || {};
  const n = e.globalConfig || {}, o = {
    ak: e.ak || "",
    version: e.version || "4.0",
    serviceHost: e.serviceHost || "",
    protocol: e.protocol || "https",
    timeout: e.timeout || 0,
    globalConfig: {
      apiVersion: n.apiVersion || "",
      uiVersion: n.uiVersion || "",
      coordType: n.coordType || ""
    }
  };
  return o.serviceHost && !/\/$/.test(o.serviceHost) && (S('serviceHost \u672B\u5C3E\u5E94\u5E26 "/"\uFF0C\u5DF2\u81EA\u52A8\u8865\u9F50'), o.serviceHost += "/"), o;
}
function E(e) {
  if (w.indexOf(e.version) === -1)
    throw new Error(
      "[bmap-loader] \u4E0D\u652F\u6301\u7684 version: " + e.version + "\uFF0C\u53EF\u9009\u503C\uFF1A" + w.join(" / ")
    );
  if (!e.ak && !e.serviceHost)
    throw new Error("[bmap-loader] \u5FC5\u987B\u63D0\u4F9B ak\uFF0C\u6216\u914D\u7F6E serviceHost \u4F7F\u7528\u4EE3\u7406\u6A21\u5F0F");
}
function O(e, n) {
  return n ? n.version !== e.version ? "\u4E0D\u5141\u8BB8\u5728\u540C\u4E00\u9875\u9762\u6DF7\u7528\u591A\u4E2A\u7248\u672C JSAPI\uFF08\u5DF2\u52A0\u8F7D " + n.version + "\uFF0C\u672C\u6B21\u8BF7\u6C42 " + e.version + "\uFF09" : e.ak && n.ak && e.ak !== n.ak ? "\u4E0D\u5141\u8BB8\u4F7F\u7528\u591A\u4E2A\u4E0D\u4E00\u81F4\u7684 ak" : "" : "";
}
function S(e) {
  typeof console < "u" && console.warn && console.warn("[bmap-loader] " + e);
}
function k(e, n) {
  n = n || {};
  const o = n.timeout || 0;
  let i = null, t = false;
  function c() {
    i && (clearTimeout(i), i = null);
  }
  return {
    promise: new Promise(function(T, l) {
      if (typeof document > "u") {
        l(new Error("[bmap-loader] \u53EA\u80FD\u5728\u6D4F\u89C8\u5668\u73AF\u5883\u4F7F\u7528"));
        return;
      }
      const u = document.createElement("script");
      u.type = "text/javascript", u.src = e, u.onerror = function() {
        t || (t = true, c(), l(new Error("[bmap-loader] JSAPI \u811A\u672C\u52A0\u8F7D\u5931\u8D25: " + e)));
      }, o > 0 && (i = setTimeout(function() {
        t || (t = true, c(), l(new Error("[bmap-loader] JSAPI \u52A0\u8F7D\u8D85\u65F6(" + o + "ms)")));
      }, o)), (document.body || document.head || document.documentElement).appendChild(u);
    }),
    cancel: function() {
      t = true, c();
    }
  };
}
var a = r.NOTLOAD;
var s = null;
var f = null;
var H = 0;
function g() {
  return a;
}
function b() {
  if (a = r.NOTLOAD, s = null, f = null, typeof window < "u")
    try {
      delete window.BMap, delete window.BMapGL, delete window._BMapSecurityConfig;
    } catch {
      window.BMap = void 0, window.BMapGL = void 0, window._BMapSecurityConfig = void 0;
    }
}
function I(e) {
  let n;
  try {
    n = D(e), E(n);
  } catch (o) {
    return Promise.reject(o);
  }
  if (a === r.LOADING || a === r.LOADED) {
    const o = O(n, f);
    return o ? Promise.reject(new Error("[bmap-loader] " + o)) : s;
  }
  return a === r.FAILED && b(), a = r.LOADING, f = n, s = new Promise(function(o, i) {
    if (typeof window > "u" || typeof document > "u") {
      a = r.FAILED, s = null, i(new Error("[bmap-loader] \u53EA\u80FD\u5728\u6D4F\u89C8\u5668\u73AF\u5883\u4F7F\u7528"));
      return;
    }
    if (window[d[n.version].ns]) {
      typeof console < "u" && console.warn && console.warn("[bmap-loader] \u68C0\u6D4B\u5230\u5DF2\u5B58\u5728\u7684\u767E\u5EA6\u5730\u56FE\u5168\u5C40\u5BF9\u8C61\uFF0C\u76F4\u63A5\u590D\u7528"), a = r.LOADED, o(v(m(n.version), n));
      return;
    }
    n.serviceHost && (window._BMapSecurityConfig = { serviceHost: n.serviceHost });
    const t = "__bmapJSApiOnLoad_" + H++, c = k(L(n, t), { timeout: n.timeout });
    window[t] = function() {
      c.cancel(), y(t), a = r.LOADED, o(v(m(n.version), n));
    }, c.promise.catch(function(p) {
      y(t), a = r.FAILED, s = null, i(p);
    });
  }), s;
}
function v(e, n) {
  const o = typeof window < "u" && window.BMapGL || e, i = n.globalConfig || {};
  return o && (i.apiVersion && (o.apiVersion = i.apiVersion), i.uiVersion && (o.uiVersion = i.uiVersion), i.coordType && (o.coordType = i.coordType)), e;
}
function y(e) {
  if (!(typeof window > "u"))
    try {
      delete window[e];
    } catch {
      window[e] = void 0;
    }
}
var h3 = { load: I, reset: b, getStatus: g };

// src/analysis.jsx
var import_react3 = __toESM(require("react"), 1);
var h4 = import_react3.default.createElement;
var analysisStyle = `
.linggo-analysis{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start;}
.linggo-analysis section{min-width:0;}
.linggo-analysis pre{max-height:320px;overflow:auto;font-size:11px;background:var(--c-side);padding:8px;border-radius:6px;white-space:pre;}
.linggo-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin:6px 0;}
.linggo-kpis div{border:1px solid var(--c-line);border-radius:6px;padding:4px 8px;font-size:12px;}
.linggo-kpis b{display:block;font-size:15px;}
.linggo-tag{display:inline-block;font-size:11px;padding:0 6px;border-radius:4px;background:#fff3bf;color:#7a5b00;margin-left:6px;}
.linggo-tag.ok{background:#d3f9d8;color:#2b8a3e;}
.linggo-tag.bad{background:#ffe3e3;color:#c92a2a;}
.linggo-replay{display:flex;gap:6px;align-items:center;font-size:12px;}
.linggo-replay input{flex:1;}
@media(max-width:1100px){.linggo-analysis{grid-template-columns:1fr;}}
`;
var KEY_KPIS = {
  drt: ["service_rate", "served", "requests", "avg_wait_min", "avg_ride_ratio", "vehicles_used"],
  fleet: ["vehicles_required", "vehicles_available", "gap", "peak_concurrent", "unassigned", "deadhead_km"],
  tripgen: ["trips", "gap_bins", "max_shortfall_ph", "vehicles_required", "vehicles_available", "feasible"]
};
function label(t, key, fallback) {
  const r2 = t(key);
  return typeof r2 === "string" && r2 && !r2.endsWith(key) ? r2 : fallback;
}
function fmtValue(key, v2) {
  if (v2 === null || v2 === void 0) return "\u2014";
  if (typeof v2 === "boolean") return v2 ? "\u2713" : "\u2717";
  if (key === "service_rate") return `${(v2 * 100).toFixed(1)}%`;
  if (typeof v2 === "object") return Object.entries(v2).map(([k2, n]) => `${k2} ${n}`).join("\uFF1B") || "\u2014";
  return String(v2);
}
function clock(s2) {
  if (s2 === null || s2 === void 0 || !Number.isFinite(s2)) return "\u2014";
  const v2 = Math.round(s2);
  return `${String(Math.floor(v2 / 3600)).padStart(2, "0")}:${String(Math.floor(v2 % 3600 / 60)).padStart(2, "0")}`;
}
function Table({ columns, rows, labels }) {
  return h4(
    "table",
    { className: "linggo-table" },
    h4("thead", null, h4("tr", null, ...columns.map((c) => h4("th", { key: c }, labels?.[c] ?? c)))),
    h4("tbody", null, ...rows.map((r2, i) => h4("tr", { key: i }, ...columns.map((c) => h4("td", { key: c, title: String(r2[c] ?? "") }, fmtValue(c, r2[c]))))))
  );
}
function initialForm(algorithm) {
  return Object.fromEntries(Object.entries(algorithm.params).map(([k2, s2]) => [k2, s2.type === "boolean" ? s2.default : String(s2.default ?? "")]));
}
function parseValue(spec, raw) {
  if (spec.type === "boolean") return Boolean(raw);
  if (spec.type === "integer" || spec.type === "number") return raw === "" ? void 0 : Number(raw);
  return raw;
}
function ParamForm({ t, algorithm, form, setForm, sweep, setSweep }) {
  const numeric = Object.entries(algorithm.params).filter(([, s2]) => s2.type === "integer" || s2.type === "number");
  return h4(
    import_react3.default.Fragment,
    null,
    h4(
      "div",
      { className: "linggo-grid", style: { gridTemplateColumns: "minmax(0,1fr) 160px" } },
      ...Object.entries(algorithm.params).flatMap(([k2, s2]) => [
        h4("label", { key: k2 + "l", htmlFor: `lg-p-${k2}`, title: k2 }, s2.label ?? k2, s2.min !== void 0 ? ` (${s2.min}\u2013${s2.max})` : ""),
        s2.type === "boolean" ? h4("input", { key: k2, id: `lg-p-${k2}`, type: "checkbox", checked: Boolean(form[k2]), onChange: (e) => setForm({ ...form, [k2]: e.target.checked }) }) : s2.type === "enum" ? h4("select", { key: k2, id: `lg-p-${k2}`, value: form[k2], onChange: (e) => setForm({ ...form, [k2]: e.target.value }) }, ...s2.options.map((o) => h4("option", { key: o, value: o }, label(t, "opt." + o, o)))) : h4("input", { key: k2, id: `lg-p-${k2}`, value: form[k2] ?? "", inputMode: s2.type === "string" ? "text" : "decimal", onChange: (e) => setForm({ ...form, [k2]: e.target.value }) })
      ])
    ),
    numeric.length > 0 && h4(
      "div",
      { className: "linggo-row", style: { marginTop: 6 } },
      h4("small", { style: { flex: "none" } }, t("an.sweep")),
      h4(
        "select",
        { "aria-label": t("an.sweep"), value: sweep.param, onChange: (e) => setSweep({ ...sweep, param: e.target.value }) },
        h4("option", { value: "" }, t("an.noSweep")),
        ...numeric.map(([k2, s2]) => h4("option", { key: k2, value: k2 }, s2.label ?? k2))
      ),
      sweep.param && h4("input", { "aria-label": t("an.sweepValues"), placeholder: t("an.sweepValues"), value: sweep.values, onChange: (e) => setSweep({ ...sweep, values: e.target.value }) })
    )
  );
}
function paramSetsOf(algorithm, form, sweep) {
  const base = {};
  for (const [k2, s2] of Object.entries(algorithm.params)) {
    const v2 = parseValue(s2, form[k2]);
    if (v2 !== void 0) base[k2] = v2;
  }
  if (!sweep.param) return [base];
  const values = sweep.values.split(/[,，\s]+/).filter(Boolean).map(Number);
  return values.length ? values.map((v2) => ({ ...base, [sweep.param]: v2 })) : [base];
}
function AnalysisView({ t, api, project, version, jobs, refreshJobs, run, busy, onShowRun }) {
  const [algorithms, setAlgorithms] = (0, import_react3.useState)(null);
  const [loadError, setLoadError] = (0, import_react3.useState)("");
  const [proposals, setProposals] = (0, import_react3.useState)([]);
  const [runs, setRuns] = (0, import_react3.useState)([]);
  const [selected, setSelected] = (0, import_react3.useState)("");
  const [form, setForm] = (0, import_react3.useState)({});
  const [sweep, setSweep] = (0, import_react3.useState)({ param: "", values: "" });
  const [preview, setPreview] = (0, import_react3.useState)(null);
  const [register, setRegister] = (0, import_react3.useState)({ path: "", shown: null, reviewed: false });
  const [detail, setDetail] = (0, import_react3.useState)(null);
  const loadAlgorithms = () => api("algorithms", { projectId: project }).then(setAlgorithms, (e) => setLoadError(e.message));
  const loadRuns = () => api("runs", { projectId: project }).then(setRuns, () => {
  });
  (0, import_react3.useEffect)(() => {
    setAlgorithms(null);
    setPreview(null);
    setDetail(null);
    loadAlgorithms();
    loadRuns();
  }, [project]);
  (0, import_react3.useEffect)(() => {
    let stop = false, timer;
    const poll = async () => {
      await api("proposals", { projectId: project }).then(setProposals, () => {
      });
      if (!stop) timer = setTimeout(poll, 2500);
    };
    poll();
    return () => (stop = true, clearTimeout(timer));
  }, [project]);
  const runningRuns = jobs.filter((j) => j.kind === "run" && j.status === "running").length;
  (0, import_react3.useEffect)(() => {
    if (!runningRuns) loadRuns();
  }, [runningRuns, jobs.length]);
  const algorithm = algorithms?.find((a2) => a2.id === selected);
  const choose = (id) => {
    setSelected(id);
    const a2 = algorithms.find((x) => x.id === id);
    if (a2) setForm(initialForm(a2));
    setSweep({ param: "", values: "" });
    setPreview(null);
  };
  const doPreview = (request) => run(async () => {
    setPreview(null);
    const value = await api("previewRun", { projectId: project, ...request });
    setPreview({ request, value });
  });
  const confirm = () => run(async () => {
    await api("startRun", { projectId: project, ...preview.request, paramSets: preview.value.paramSets, previewToken: preview.value.previewToken });
    setPreview(null);
    await refreshJobs();
    setProposals(await api("proposals", { projectId: project }));
    return t("an.started");
  });
  const openRun = (id) => run(async () => {
    setDetail(await api("runResult", { projectId: project, runId: id }));
  });
  if (!version) return h4("p", { className: "linggo-note" }, t("an.noData"));
  if (loadError) return h4("p", { className: "linggo-error" }, loadError);
  if (!algorithms) return h4("p", { className: "linggo-note" }, t("an.loading"));
  const left = h4(
    "section",
    null,
    proposals.length > 0 && h4(
      import_react3.default.Fragment,
      null,
      h4("h3", null, t("an.proposals")),
      ...proposals.map(
        (p) => h4(
          "div",
          { key: p.id, className: "linggo-card", style: { padding: 8 } },
          h4("strong", null, p.algorithmName),
          p.paramSets.length > 1 && h4("span", { className: "linggo-tag" }, t("an.batch", { n: String(p.paramSets.length) })),
          p.reason && h4("p", { style: { margin: "4px 0" } }, p.reason),
          h4("small", null, t("an.fromAgent", { time: new Date(p.at).toLocaleTimeString() })),
          h4(
            "div",
            { className: "linggo-row" },
            h4("button", { className: "primary", disabled: busy, onClick: () => doPreview({ algorithmId: p.algorithmId, paramSets: p.paramSets, proposalId: p.id }) }, t("an.preview")),
            h4("button", { disabled: busy, onClick: () => run(async () => {
              await api("dismissProposal", { id: p.id });
              setProposals(await api("proposals", { projectId: project }));
            }) }, t("an.dismiss"))
          )
        )
      )
    ),
    h4("h3", null, t("an.algorithms")),
    h4(
      "select",
      { "aria-label": t("an.algorithms"), value: selected, onChange: (e) => choose(e.target.value) },
      h4("option", { value: "" }, t("an.choose")),
      ...algorithms.map((a2) => h4("option", { key: a2.id, value: a2.id }, `${a2.name}${a2.source === "user" ? " \xB7 " + t("an.user") : ""}`))
    ),
    algorithm && h4(
      "div",
      { className: "linggo-card", style: { padding: 8 } },
      h4("p", { style: { margin: "0 0 6px" } }, algorithm.description),
      h4(
        "small",
        null,
        t("an.inputs"),
        algorithm.inputs.map((i) => `${t("entity." + i.entity)}${i.required ? "*" : ""}\uFF08${version.entities?.[i.entity]?.rows ?? 0}\uFF09`).join("\u3001")
      ),
      algorithm.source === "user" && h4("p", { className: "linggo-error" }, t("an.userWarning", { sha: algorithm.sha256.slice(0, 12) })),
      h4(ParamForm, { t, algorithm, form, setForm, sweep, setSweep }),
      h4(
        "div",
        { className: "linggo-row", style: { marginTop: 8 } },
        h4("button", { className: "primary", disabled: busy, onClick: () => doPreview({ algorithmId: algorithm.id, paramSets: paramSetsOf(algorithm, form, sweep) }) }, t("an.preview")),
        algorithm.source === "user" && h4("button", { disabled: busy, onClick: () => run(async () => {
          await api("removeAlgorithm", { projectId: project, id: algorithm.id });
          setSelected("");
          await loadAlgorithms();
        }) }, t("an.remove"))
      )
    ),
    preview && h4(
      "div",
      { className: "linggo-card", role: "region", "aria-label": t("an.previewTitle"), style: { padding: 8 } },
      h4("strong", null, t("an.previewTitle"), "\uFF1A", preview.value.algorithm.name),
      h4(Table, {
        columns: ["label", "required", "rows"],
        labels: { label: t("an.data"), required: t("an.required"), rows: t("an.rows") },
        rows: preview.value.inputs
      }),
      h4(Table, {
        columns: Object.keys(preview.value.paramSets[0]),
        labels: Object.fromEntries(Object.entries(preview.value.algorithm.params).map(([k2, s2]) => [k2, s2.label ?? k2])),
        rows: preview.value.paramSets
      }),
      ...preview.value.blocking.map((b2, i) => h4("p", { key: "b" + i, className: "linggo-error" }, b2)),
      ...preview.value.warnings.map((w2, i) => h4("p", { key: "w" + i, className: "linggo-error" }, "\u26A0 " + w2)),
      h4("small", null, t("an.previewNote", { version: preview.value.versionId.slice(0, 8) })),
      h4(
        "div",
        { className: "linggo-row" },
        h4("button", { className: "primary", disabled: busy || !preview.value.previewToken || runningRuns > 0, onClick: confirm }, t("an.confirm", { n: String(preview.value.paramSets.length) })),
        h4("button", { onClick: () => setPreview(null) }, t("common.cancel"))
      )
    ),
    h4("h3", null, t("an.register")),
    h4("small", null, t("an.registerHint")),
    h4("input", {
      "aria-label": t("an.registerPath"),
      placeholder: t("an.registerPath"),
      value: register.path,
      onChange: (e) => setRegister({ path: e.target.value, shown: null, reviewed: false })
    }),
    h4("button", { disabled: busy || !register.path.trim(), onClick: () => run(async () => setRegister({ ...register, shown: await api("algorithmSource", { projectId: project, path: register.path.trim() }), reviewed: false })) }, t("an.showSource")),
    register.shown && h4(
      "div",
      { className: "linggo-card", style: { padding: 8 } },
      h4("small", null, `SHA-256 ${register.shown.sha256} \xB7 ${register.shown.size} B`),
      h4("pre", null, register.shown.source),
      h4("p", { className: "linggo-error" }, register.shown.warning),
      h4("label", null, h4("input", { type: "checkbox", checked: register.reviewed, onChange: (e) => setRegister({ ...register, reviewed: e.target.checked }) }), " ", t("an.reviewed")),
      h4(
        "button",
        {
          className: "primary",
          disabled: busy || !register.reviewed,
          onClick: () => run(async () => {
            const item = await api("registerAlgorithm", { projectId: project, path: register.shown.path, sha256: register.shown.sha256 });
            setRegister({ path: "", shown: null, reviewed: false });
            await loadAlgorithms();
            return t("an.registered", { name: item.meta.name });
          })
        },
        t("an.registerConfirm")
      )
    )
  );
  const right = h4(
    "section",
    null,
    h4("h3", null, t("an.runs")),
    !runs.length && h4("small", null, t("an.noRuns")),
    runs.length > 0 && h4(
      "table",
      { className: "linggo-table" },
      h4("thead", null, h4("tr", null, h4("th", null, t("an.time")), h4("th", null, t("an.algorithm")), h4("th", null, t("an.kpi")), h4("th", null, t("an.check")))),
      h4(
        "tbody",
        null,
        ...runs.slice(0, 50).map(
          (r2) => h4(
            "tr",
            { key: r2.id, style: { cursor: "pointer", fontWeight: detail?.run.id === r2.id ? 600 : void 0 }, onClick: () => openRun(r2.id) },
            h4("td", null, new Date(r2.createdAt).toLocaleString(void 0, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })),
            h4("td", null, r2.algorithmName, r2.synthetic && h4("span", { className: "linggo-tag" }, t("an.synthetic"))),
            h4("td", null, (KEY_KPIS[r2.kind] ?? []).slice(0, 3).map((k2) => `${label(t, "kpi." + k2, k2)} ${fmtValue(k2, r2.summary?.[k2])}`).join("\uFF1B")),
            h4("td", null, h4("span", { className: `linggo-tag ${r2.validation?.ok ? "ok" : "bad"}` }, r2.validation?.checked === false ? t("an.unchecked") : r2.validation?.ok ? t("an.valid") : t("an.invalid", { n: String(r2.validation?.count ?? "?") })))
          )
        )
      )
    ),
    detail && h4(ResultDetail, { t, detail, onShowRun })
  );
  return h4("div", { className: "linggo-analysis" }, left, right);
}
function ResultDetail({ t, detail, onShowRun }) {
  const { run, result } = detail;
  const kpis = Object.entries(result.summary ?? {});
  return h4(
    "div",
    { className: "linggo-card", style: { padding: 8 } },
    h4("strong", null, run.algorithmName),
    run.synthetic && h4("span", { className: "linggo-tag" }, t("an.synthetic")),
    h4("div", null, h4("small", null, t("an.runMeta", { version: run.versionId.slice(0, 8), id: run.id }))),
    h4("div", { className: "linggo-kpis" }, ...kpis.map(([k2, v2]) => h4("div", { key: k2 }, label(t, "kpi." + k2, k2), h4("b", null, fmtValue(k2, v2))))),
    (run.kind === "drt" || run.kind === "fleet") && h4("button", { className: "primary", onClick: () => onShowRun(run.id) }, t("an.showOnMap")),
    h4("h4", null, t("an.validation")),
    result.validation?.checked === false ? h4("small", null, t("an.uncheckedNote")) : result.validation?.ok ? h4("small", null, t("an.validNote")) : h4("ul", null, ...result.validation.violations.slice(0, 20).map((v2, i) => h4("li", { key: i, className: "linggo-error" }, v2))),
    result.assumptions?.length > 0 && h4(import_react3.default.Fragment, null, h4("h4", null, t("an.assumptions")), h4("ul", null, ...result.assumptions.map((a2, i) => h4("li", { key: i }, a2)))),
    run.kind === "drt" && h4(
      import_react3.default.Fragment,
      null,
      h4("h4", null, t("an.rejected")),
      h4(Table, {
        columns: ["request_id", "request_time", "passengers", "reason"],
        labels: { request_id: t("an.request"), request_time: t("an.time"), passengers: t("an.pax"), reason: t("an.reason") },
        rows: result.requests.filter((r2) => !r2.served).slice(0, 100).map((r2) => ({ ...r2, request_time: clock(r2.request_time) }))
      })
    ),
    run.kind === "fleet" && h4(
      import_react3.default.Fragment,
      null,
      h4("h4", null, t("an.blocks")),
      h4(Table, {
        columns: ["vehicle_id", "trips", "start", "end", "routes"],
        labels: { vehicle_id: t("an.vehicle"), trips: t("an.tripCount"), start: t("an.start"), end: t("an.end"), routes: t("an.routes") },
        rows: result.blocks.slice(0, 200).map((b2) => ({ vehicle_id: b2.vehicle_id, trips: b2.trips.length, start: clock(b2.start), end: clock(b2.end), routes: [...new Set(b2.trips.map((x) => x.route_id))].join(",") }))
      }),
      result.unassigned?.length > 0 && h4(import_react3.default.Fragment, null, h4("h4", null, t("an.unassigned")), h4(Table, { columns: ["trip_id", "reason"], rows: result.unassigned.slice(0, 100) }))
    ),
    run.kind === "tripgen" && h4(
      import_react3.default.Fragment,
      null,
      result.gaps?.length > 0 && h4(import_react3.default.Fragment, null, h4("h4", null, t("an.gaps")), h4(Table, { columns: Object.keys(result.gaps[0]), rows: result.gaps.slice(0, 100) })),
      h4("h4", null, t("an.headways")),
      h4(Table, {
        columns: ["route_id", "direction", "bin", "design_load_ph", "headway_min", "capacity_ph", "shortfall_ph"],
        labels: { route_id: t("an.route"), direction: t("an.direction"), bin: t("an.bin"), design_load_ph: t("an.load"), headway_min: t("an.headway"), capacity_ph: t("an.capacity"), shortfall_ph: t("an.shortfall") },
        rows: result.headways.slice(0, 300)
      })
    )
  );
}
function km(a2, b2) {
  const r2 = Math.PI / 180, dLat = (b2[1] - a2[1]) * r2, dLon = (b2[0] - a2[0]) * r2;
  const s2 = Math.sin(dLat / 2) ** 2 + Math.cos(a2[1] * r2) * Math.cos(b2[1] * r2) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(s2));
}
function buildOverlay(run, result) {
  const vehicles = [];
  let t0 = Infinity, t1 = -Infinity;
  if (run.kind === "drt") {
    const speed = result.params?.speed_kmh ?? 25, detour = result.params?.detour_factor ?? 1.3;
    for (const v2 of result.vehicles) {
      if (!v2.stops.length) continue;
      const first = v2.stops[0];
      const leave = first.arrive - km(v2.start, [first.lon, first.lat]) * detour * 3600 / speed;
      const track = [{ t: leave, p: v2.start }];
      for (const s2 of v2.stops) track.push({ t: s2.arrive, p: [s2.lon, s2.lat] }, { t: s2.depart, p: [s2.lon, s2.lat] });
      vehicles.push({ id: v2.vehicle_id, track, hold: true });
    }
  } else if (run.kind === "fleet") {
    for (const b2 of result.blocks) {
      const track = [];
      for (const x of b2.trips) track.push({ t: x.start, p: x.from }, { t: x.end, p: x.to });
      vehicles.push({ id: b2.vehicle_id, track, hold: false });
    }
  }
  for (const v2 of vehicles) {
    t0 = Math.min(t0, v2.track[0].t);
    t1 = Math.max(t1, v2.track.at(-1).t);
  }
  const requests = run.kind === "drt" ? result.requests.map((r2) => ({ o: r2.o, served: r2.served, t: r2.request_time })) : [];
  return { kind: run.kind, name: run.algorithmName, synthetic: run.synthetic, vehicles, requests, range: vehicles.length ? [t0, t1] : null };
}
function positionAt(v2, t) {
  const tr = v2.track;
  if (t < tr[0].t) return v2.hold ? tr[0].p : null;
  if (t >= tr.at(-1).t) return v2.hold ? tr.at(-1).p : null;
  let lo = 0, hi = tr.length - 1;
  while (hi - lo > 1) {
    const mid = lo + hi >> 1;
    if (tr[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a2 = tr[lo], b2 = tr[hi], f2 = b2.t > a2.t ? (t - a2.t) / (b2.t - a2.t) : 0;
  return [a2.p[0] + (b2.p[0] - a2.p[0]) * f2, a2.p[1] + (b2.p[1] - a2.p[1]) * f2];
}
function overlayBox(overlay) {
  const pts = overlay.vehicles.flatMap((v2) => v2.track.map((x) => x.p)).concat(overlay.requests.map((r2) => r2.o));
  if (!pts.length) return null;
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}
var PALETTE = ["#3c6df0", "#e8590c", "#2b8a3e", "#ae3ec9", "#1098ad", "#f08c00", "#c2255c", "#5c940d"];
var vehicleColor = (i) => PALETTE[i % PALETTE.length];
function drawOverlay(g2, px, overlay, time) {
  if (overlay.kind === "drt") {
    g2.lineWidth = 1.5;
    g2.globalAlpha = 0.45;
    overlay.vehicles.slice(0, 300).forEach((v2, i) => {
      g2.strokeStyle = vehicleColor(i);
      g2.beginPath();
      v2.track.forEach((x, k2) => {
        const [sx, sy] = px(x.p);
        k2 ? g2.lineTo(sx, sy) : g2.moveTo(sx, sy);
      });
      g2.stroke();
    });
    g2.globalAlpha = 1;
    for (const r2 of overlay.requests) {
      if (r2.served || r2.t > time) continue;
      const [x, y2] = px(r2.o);
      g2.strokeStyle = "#c92a2a";
      g2.lineWidth = 1.5;
      g2.beginPath();
      g2.moveTo(x - 3, y2 - 3);
      g2.lineTo(x + 3, y2 + 3);
      g2.moveTo(x + 3, y2 - 3);
      g2.lineTo(x - 3, y2 + 3);
      g2.stroke();
    }
  }
  overlay.vehicles.forEach((v2, i) => {
    const p = positionAt(v2, time);
    if (!p) return;
    const [x, y2] = px(p);
    g2.fillStyle = vehicleColor(i);
    g2.strokeStyle = "#fff";
    g2.lineWidth = 1.5;
    g2.beginPath();
    g2.arc(x, y2, 5, 0, Math.PI * 2);
    g2.fill();
    g2.stroke();
  });
}
function Replay({ t, overlay, time, setTime, onClose }) {
  const [playing, setPlaying] = (0, import_react3.useState)(false);
  const [t0, t1] = overlay.range ?? [0, 0];
  (0, import_react3.useEffect)(() => {
    if (!playing) return;
    const step = Math.max((t1 - t0) / 400, 1);
    const timer = setInterval(() => setTime((v2) => v2 + step >= t1 ? (setPlaying(false), t1) : v2 + step), 100);
    return () => clearInterval(timer);
  }, [playing, t0, t1]);
  const active = (0, import_react3.useMemo)(() => overlay.vehicles.filter((v2) => positionAt(v2, time) && (!v2.hold || time >= v2.track[0].t && time <= v2.track.at(-1).t)).length, [overlay, time]);
  return h4(
    "div",
    { className: "linggo-card", style: { padding: 6 } },
    h4("small", null, overlay.name, overlay.synthetic && h4("span", { className: "linggo-tag" }, t("an.synthetic"))),
    overlay.range ? h4(
      "div",
      { className: "linggo-replay" },
      h4("button", { "aria-label": playing ? t("map.pause") : t("map.play"), onClick: () => (time >= t1 && setTime(t0), setPlaying(!playing)) }, playing ? "\u275A\u275A" : "\u25B6"),
      h4("input", { type: "range", "aria-label": t("map.time"), min: t0, max: t1, step: 10, value: time, onChange: (e) => setTime(Number(e.target.value)) }),
      h4("span", null, clock(time))
    ) : h4("small", null, t("map.noTracks")),
    h4("small", null, t("map.activeVehicles", { n: String(active), total: String(overlay.vehicles.length) })),
    h4("button", { onClick: onClose }, t("map.closeRun"))
  );
}

// src/map-adapters.js
var amapLoad;
var amapKey;
var amapCode;
var baiduKey;
function loadAmap(settings) {
  if (amapKey && (amapKey !== settings.amapKey || amapCode !== (settings.amapSecurityCode ?? "")))
    return Promise.reject(Error("reload"));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapLoad) return amapLoad;
  amapKey = settings.amapKey;
  amapCode = settings.amapSecurityCode ?? "";
  amapLoad = new Promise((resolve, reject) => {
    window._AMapSecurityConfig = { securityJsCode: amapCode };
    const script = document.createElement("script");
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      script.onload = script.onerror = null;
      if (ok) resolve(window.AMap);
      else {
        script.remove();
        reject(Error("network"));
      }
    };
    const timer = setTimeout(() => finish(false), 15e3);
    script.src = "https://webapi.amap.com/maps?v=2.0&key=" + encodeURIComponent(settings.amapKey);
    script.onload = () => finish(!!window.AMap);
    script.onerror = () => finish(false);
    document.head.append(script);
  }).catch((e) => {
    amapLoad = null;
    amapKey = null;
    throw e;
  });
  return amapLoad;
}
var lightStyle = [
  { featureType: "land", elementType: "geometry", stylers: { color: "#e6eaed" } },
  { featureType: "water", elementType: "geometry", stylers: { color: "#b7d2e0" } },
  { featureType: "green", elementType: "geometry", stylers: { color: "#c5d8bf" } },
  { featureType: "building", elementType: "geometry", stylers: { color: "#d5dce2" } },
  {
    featureType: "highway",
    elementType: "geometry",
    stylers: { color: "#ffffff", "visibility": "on" }
  },
  {
    featureType: "highway",
    elementType: "geometry.stroke",
    stylers: { color: "#c5ccd2" }
  },
  {
    featureType: "arterial",
    elementType: "geometry",
    stylers: { color: "#f7f8f9", "visibility": "on" }
  },
  {
    featureType: "arterial",
    elementType: "geometry.stroke",
    stylers: { color: "#d0d6db" }
  },
  {
    featureType: "local",
    elementType: "geometry",
    stylers: { color: "#f2f4f5", "visibility": "on" }
  },
  {
    featureType: "local",
    elementType: "geometry.stroke",
    stylers: { color: "#dce1e5" }
  },
  {
    featureType: "railway",
    elementType: "geometry",
    stylers: { color: "#c5ccd2", "visibility": "on" }
  },
  {
    featureType: "boundary",
    elementType: "geometry",
    stylers: { color: "#9aa7b2", "visibility": "on" }
  },
  {
    featureType: "boundary",
    elementType: "geometry.stroke",
    stylers: { color: "#8a97a3" }
  },
  {
    featureType: "manmade",
    elementType: "geometry",
    stylers: { color: "#d5dce2" }
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: { color: "#3d4a55", "visibility": "on" }
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: { color: "#e6eaed", weight: 2 }
  },
  {
    featureType: "all",
    elementType: "labels.icon",
    stylers: { "visibility": "on" }
  },
  // Keep district/city names; drop only noisy POI icons.
  { featureType: "poi", elementType: "labels.icon", stylers: { "visibility": "off" } },
  { featureType: "poi", elementType: "labels.text.fill", stylers: { color: "#6b7782" } }
];
async function createMapAdapter(engine, host, settings, { onSelect, onChange, isActive = () => true }) {
  let scene = null, disposed = false, rendered = null, objects = [], listeners = [], raf, motionRaf, lastBase = null;
  const native = document.createElement("div");
  native.className = "linggo-native-map";
  const canvas = document.createElement("canvas");
  canvas.className = "linggo-render-map";
  let map, SDK, view = { cx: 0, cy: 0, s: 1e3, k: 1 }, initial = false;
  try {
    if (engine === "amap") {
      SDK = await loadAmap(settings);
      if (!isActive()) throw Error("cancelled");
      host.append(native);
      map = new SDK.Map(native, {
        mapStyle: "amap://styles/whitesmoke",
        zoom: 11,
        center: [105, 35],
        viewMode: "2D",
        resizeEnable: true,
        rotateEnable: false,
        pitchEnable: false
      });
    }
    if (engine === "baidu") {
      if (baiduKey && baiduKey !== settings.baiduAK) throw Error("reload");
      const preexisting = !!window.BMap;
      SDK = await h3.load({
        ak: settings.baiduAK,
        version: "4.0",
        timeout: 15e3
      }).catch(() => {
        throw Error("network");
      });
      if (!isActive()) throw Error("cancelled");
      if (preexisting && SDK.coordType !== void 0 && SDK.coordType !== window.BMAP_COORD_GCJ02)
        throw Error("coordinates");
      SDK.coordType = window.BMAP_COORD_GCJ02;
      baiduKey = settings.baiduAK;
      host.append(native);
      map = new SDK.Map(native, {
        enableAutoResize: true,
        fixCenterWhenResize: true,
        enableRotate: false,
        enableTilt: false,
        enableMapClick: false
      });
      map.centerAndZoom(new SDK.Point(105, 35), 11);
      map.enableScrollWheelZoom();
      map.setMapStyle({ styleJson: lightStyle });
    }
  } catch (e) {
    map?.destroy?.();
    native.remove();
    canvas.remove();
    throw e;
  }
  host.append(canvas);
  if (engine === "canvas") {
    native.remove();
    canvas.style.pointerEvents = "auto";
    canvas.style.touchAction = "none";
  } else canvas.style.pointerEvents = "none";
  const width = () => host.clientWidth || 1, height = () => host.clientHeight || 1;
  const project = (p) => {
    if (engine === "canvas")
      return [
        (p[0] - view.cx) * view.s * view.k + width() / 2,
        (view.cy - p[1]) * view.s + height() / 2
      ];
    const q = gcj(p), pt = engine === "amap" ? map.lngLatToContainer(q) : map.pointToPixel(new SDK.Point(...q));
    return [pt.x ?? pt.getX(), pt.y ?? pt.getY()];
  };
  const unproject = (p) => {
    if (engine === "canvas")
      return [
        view.cx + (p[0] - width() / 2) / (view.s * view.k),
        view.cy - (p[1] - height() / 2) / view.s
      ];
    const q = engine === "amap" ? map.containerToLngLat(p) : map.pixelToPoint(new SDK.Pixel(...p));
    return wgs([q.lng ?? q.getLng(), q.lat ?? q.getLat()]);
  };
  const getViewport = () => bounds([unproject([0, height()]), unproject([width(), 0])]);
  function setViewport(box, fit = true) {
    if (!box) return;
    initial = true;
    if (engine === "canvas") {
      view = {
        cx: (box[0] + box[2]) / 2,
        cy: (box[1] + box[3]) / 2,
        k: Math.cos((box[1] + box[3]) * Math.PI / 360),
        s: 1
      };
      view.s = Math.min(
        width() * (fit ? 0.84 : 1) / Math.max((box[2] - box[0]) * view.k, 1e-6),
        height() * (fit ? 0.84 : 1) / Math.max(box[3] - box[1], 1e-6),
        2e6
      );
    } else if (engine === "amap") {
      map.setBounds(
        new SDK.Bounds(gcj(box.slice(0, 2)), gcj(box.slice(2, 4))),
        false,
        fit ? [40, 40, 40, 40] : [0, 0, 0, 0]
      );
    } else
      map.setViewport(
        [
          new SDK.Point(...gcj(box.slice(0, 2))),
          new SDK.Point(...gcj(box.slice(2, 4)))
        ],
        {
          margins: fit ? [40, 40, 40, 40] : [0, 0, 0, 0],
          enableAnimation: false
        }
      );
    schedule();
  }
  const listen = (target, event, fn) => {
    engine === "amap" ? target.on(event, fn) : target.addEventListener(event, fn);
    listeners.push(
      () => engine === "amap" ? target.off(event, fn) : target.removeEventListener(event, fn)
    );
  };
  const clearObjects = () => {
    for (const o of objects)
      engine === "amap" ? map.remove(o) : map.removeOverlay(o);
    objects = [];
    listeners.splice(0).forEach((fn) => fn());
  };
  const pickStop = (cluster) => {
    if (cluster.ids.length === 1) onSelect({ stopId: cluster.ids[0] });
    else {
      const pts = cluster.ids.map((id) => scene.model.stops.get(id)).map((s2) => [s2[2], s2[3]]);
      const b2 = bounds(pts);
      const pad = 6e-4;
      setViewport([b2[0] - pad, b2[1] - pad, b2[2] + pad, b2[3] + pad]);
    }
  };
  function draw() {
    if (disposed || !scene || !initial || !host.clientWidth || !host.clientHeight)
      return;
    const w2 = width(), ht = height(), dpr = window.devicePixelRatio || 1;
    canvas.width = w2 * dpr;
    canvas.height = ht * dpr;
    const g2 = canvas.getContext("2d");
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    g2.clearRect(0, 0, w2, ht);
    const viewport = [...getViewport(), w2, ht].join(",");
    const baseChanged = engine === "canvas" || !lastBase || lastBase.model !== scene.model || lastBase.visible !== scene.visible || lastBase.selection !== scene.selection || lastBase.viewport !== viewport;
    if (baseChanged) {
      rendered = visibleScene(scene, project, getViewport());
      if (engine !== "canvas") clearObjects();
      for (const l of rendered.lines) {
        if (l.path.length < 2) continue;
        const selected = l.id === scene.selection.routeId && (scene.selection.direction == null || scene.selection.direction === l.dir);
        const color = routeColor(l.id), weight = selected ? 4 : 1.7, opacity = scene.selection.routeId ? selected ? 1 : 0.25 : 0.65;
        if (engine === "canvas") {
          g2.strokeStyle = color;
          g2.lineWidth = weight;
          g2.globalAlpha = opacity;
          g2.beginPath();
          l.path.forEach((p, i) => {
            const [x, y2] = project(p);
            i ? g2.lineTo(x, y2) : g2.moveTo(x, y2);
          });
          g2.stroke();
          g2.globalAlpha = 1;
        } else {
          const path = l.path.map(gcj), o = engine === "amap" ? new SDK.Polyline({
            path,
            strokeColor: color,
            strokeWeight: weight,
            strokeOpacity: opacity,
            zIndex: selected ? 20 : 10
          }) : new SDK.Polyline(
            path.map((p) => new SDK.Point(...p)),
            {
              strokeColor: color,
              strokeWeight: weight,
              strokeOpacity: opacity
            }
          );
          listen(
            o,
            "click",
            () => onSelect({ routeId: l.id, direction: l.dir })
          );
          engine === "amap" ? map.add(o) : map.addOverlay(o);
          objects.push(o);
        }
      }
      for (const st of rendered.stops) {
        const [x, y2] = project(st.point), r2 = st.selected ? STOP_RADIUS_SELECTED : STOP_RADIUS, color = st.selected ? "#4275dc" : "#71808a";
        if (engine === "canvas") {
          g2.fillStyle = "#fff";
          g2.strokeStyle = color;
          g2.lineWidth = 1.25;
          g2.beginPath();
          g2.arc(x, y2, r2, 0, Math.PI * 2);
          g2.fill();
          g2.stroke();
        } else {
          const p = gcj(st.point);
          let o;
          if (engine === "amap")
            o = new SDK.CircleMarker({
              center: p,
              radius: r2,
              fillColor: "#fff",
              strokeColor: color,
              strokeWeight: 1.25,
              fillOpacity: 1,
              zIndex: 30
            });
          else {
            const px = map.pixelToPoint(new SDK.Pixel(x + r2, y2));
            const radius = map.getDistance(new SDK.Point(...p), px);
            o = new SDK.Circle(new SDK.Point(...p), radius, {
              fillColor: "#fff",
              fillOpacity: 1,
              strokeColor: color,
              strokeWeight: 1.25
            });
          }
          listen(o, "click", () => pickStop(st));
          engine === "amap" ? map.add(o) : map.addOverlay(o);
          objects.push(o);
        }
      }
      lastBase = {
        model: scene.model,
        visible: scene.visible,
        selection: scene.selection,
        viewport
      };
    }
    if (scene.overlay) drawOverlay(g2, project, scene.overlay, scene.time);
    onChange?.();
  }
  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  }
  let drag = null;
  const down = (e) => {
    if (engine !== "canvas") return;
    drag = { x: e.clientX, y: e.clientY, view: { ...view }, moved: false };
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved ||= Math.abs(dx) + Math.abs(dy) > 3;
    view.cx = drag.view.cx - dx / (view.s * view.k);
    view.cy = drag.view.cy + dy / view.s;
    schedule();
  };
  const up = (e) => {
    if (!drag) return;
    const d2 = drag;
    drag = null;
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    if (d2.moved) return;
    const rect = canvas.getBoundingClientRect(), p = [e.clientX - rect.left, e.clientY - rect.top];
    const st = rendered?.stops.find(
      (s2) => Math.hypot(...project(s2.point).map((n, i) => n - p[i])) < 9
    );
    if (st) pickStop(st);
    else {
      const l = hitLine(p, rendered?.lines ?? [], project);
      if (l) onSelect({ routeId: l.id, direction: l.dir });
    }
  };
  const wheel = (e) => {
    if (engine !== "canvas") return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect(), p = [e.clientX - rect.left, e.clientY - rect.top], q = unproject(p);
    view.s = Math.max(5, Math.min(2e6, view.s * (e.deltaY < 0 ? 1.25 : 0.8)));
    view.cx = q[0] - (p[0] - width() / 2) / (view.s * view.k);
    view.cy = q[1] + (p[1] - height() / 2) / view.s;
    schedule();
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", () => drag = null);
  canvas.addEventListener("wheel", wheel, { passive: false });
  const mapListeners = [];
  if (map) {
    for (const event of ["moveend", "zoomend", "resize"]) {
      const fn = () => schedule();
      engine === "amap" ? map.on(event, fn) : map.addEventListener(event, fn);
      mapListeners.push(
        () => engine === "amap" ? map.off(event, fn) : map.removeEventListener(event, fn)
      );
    }
    for (const event of engine === "amap" ? ["mapmove", "zoomchange"] : ["moving", "zooming"]) {
      const fn = () => {
        cancelAnimationFrame(motionRaf);
        motionRaf = requestAnimationFrame(() => {
          if (disposed || !scene) return;
          const g2 = canvas.getContext("2d");
          g2.clearRect(0, 0, width(), height());
          if (scene.overlay) drawOverlay(g2, project, scene.overlay, scene.time);
          onChange?.();
        });
      };
      engine === "amap" ? map.on(event, fn) : map.addEventListener(event, fn);
      mapListeners.push(
        () => engine === "amap" ? map.off(event, fn) : map.removeEventListener(event, fn)
      );
    }
  }
  const resize = () => {
    if (map) {
      if (engine === "baidu") map.checkResize();
    }
    schedule();
  };
  return {
    render(next) {
      scene = next;
      schedule();
    },
    resize,
    project,
    getViewport,
    setViewport,
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(motionRaf);
      if (map) {
        clearObjects();
        mapListeners.forEach((fn) => fn());
        map.destroy?.();
      }
      canvas.remove();
      native.remove();
      scene = null;
    }
  };
}

// src/map-view.jsx
var h5 = import_react4.default.createElement;
var ENGINE_KEY = "linggo.map.provider";
var STOPS_KEY = "linggo.map.showStops";
function MapView({
  t,
  api,
  project,
  versionId,
  hasTrips,
  runId,
  onRun
}) {
  const [data, setData] = (0, import_react4.useState)(null), [error, setError] = (0, import_react4.useState)(""), [settings, setSettings] = (0, import_react4.useState)(null), [engine, setEngine] = (0, import_react4.useState)(null), [failure, setFailure] = (0, import_react4.useState)(""), [retry, setRetry] = (0, import_react4.useState)(0);
  const [selection, setSelection] = (0, import_react4.useState)({}), [visible, setVisible] = (0, import_react4.useState)(/* @__PURE__ */ new Set()), [panel, setPanel] = (0, import_react4.useState)("routes"), [collapsed, setCollapsed] = (0, import_react4.useState)(false), [detailCollapsed, setDetailCollapsed] = (0, import_react4.useState)(false), [search, setSearch] = (0, import_react4.useState)(""), [width, setWidth] = (0, import_react4.useState)(0), [actions, setActions] = (0, import_react4.useState)([]), [overlay, setOverlay] = (0, import_react4.useState)(null), [time, setTime] = (0, import_react4.useState)(0), [anchor, setAnchor] = (0, import_react4.useState)(null), [showStops, setShowStops] = (0, import_react4.useState)(
    () => readPreference(localStorage, STOPS_KEY, true) !== false
  );
  const alive = (0, import_react4.useRef)(true);
  (0, import_react4.useEffect)(
    () => () => {
      alive.current = false;
    },
    []
  );
  const host = (0, import_react4.useRef)(null), adapter = (0, import_react4.useRef)(null), camera = (0, import_react4.useRef)(null), selectionRef = (0, import_react4.useRef)(selection), modelRef = (0, import_react4.useRef)(null), actionRef = (0, import_react4.useRef)(null);
  selectionRef.current = selection;
  const model = (0, import_react4.useMemo)(() => data ? mapModel(data) : null, [data]);
  modelRef.current = model;
  const select = (next, locate = false) => {
    setSelection(
      (old) => next.routeId ? { routeId: next.routeId, direction: next.direction } : next.stopId ? { ...old, stopId: next.stopId } : {}
    );
    if (next.routeId) {
      setVisible((old) => /* @__PURE__ */ new Set([...old, next.routeId]));
      setPanel("detail");
      setDetailCollapsed(false);
    }
    if (locate) {
      const m2 = modelRef.current;
      let b2;
      if (next.stopId) {
        const s2 = m2?.stops.get(next.stopId);
        if (s2) b2 = [s2[2] - 3e-3, s2[3] - 3e-3, s2[2] + 3e-3, s2[3] + 3e-3];
      } else
        b2 = bounds(
          (m2?.routes.get(next.routeId) ?? []).filter((l) => next.direction == null || l.dir === next.direction).flatMap((l) => l.path)
        );
      adapter.current?.setViewport(b2);
    }
  };
  (0, import_react4.useEffect)(() => {
    let live = true;
    api("mapData", { projectId: project, versionId }).then(
      (d2) => {
        if (live) {
          setData(d2);
          setVisible(new Set(d2.routes.map((l) => l.id)));
        }
      },
      (e) => live && setError(e.message)
    );
    return () => live = false;
  }, [project, versionId]);
  (0, import_react4.useEffect)(() => {
    let live = true;
    api("settings", {}).then(
      (s2) => {
        if (!live) return;
        setSettings(s2);
        const saved = readPreference(localStorage, ENGINE_KEY, null);
        setEngine(
          ["amap", "baidu", "canvas"].includes(saved) ? saved : s2.amapKey ? "amap" : s2.baiduAK ? "baidu" : "canvas"
        );
      },
      () => {
        if (live) {
          setSettings({});
          setEngine("canvas");
        }
      }
    );
    return () => live = false;
  }, []);
  (0, import_react4.useEffect)(() => {
    let live = true;
    setOverlay(null);
    if (runId)
      api("runResult", { projectId: project, runId }).then(
        ({ run, result }) => {
          if (!live) return;
          const o = buildOverlay(run, result);
          setOverlay(o);
          setTime(o.range?.[0] ?? 0);
          adapter.current?.setViewport(overlayBox(o));
        },
        (e) => live && setError(e.message)
      );
    return () => live = false;
  }, [project, runId]);
  const applyAction = (a2) => {
    if (a2.versionId !== versionId) return;
    if (a2.action === "show_run") onRun?.(a2.target.runId);
    else if (["clear", "show_all"].includes(a2.action)) {
      setSelection({});
      if (a2.action === "show_all")
        setVisible(new Set(modelRef.current?.routes.keys()));
      else onRun?.(null);
      adapter.current?.setViewport(modelRef.current?.bbox);
    } else select({ ...a2.target, direction: a2.target?.directions?.[0] }, true);
  };
  actionRef.current = applyAction;
  (0, import_react4.useEffect)(() => {
    let stop2 = false, since = null, timer;
    const poll = async () => {
      try {
        const r2 = await api("mapActions", {
          projectId: project,
          since: since ?? 0
        });
        if (stop2) return;
        const fresh = r2.actions.filter((a2) => a2.versionId === versionId);
        if (since !== null && fresh.length) actionRef.current(fresh.at(-1));
        setActions(
          (old) => [
            ...old,
            ...r2.actions.filter((a2) => !old.some((b2) => b2.seq === a2.seq))
          ].slice(-30)
        );
        since = r2.seq;
      } catch {
      }
      if (!stop2) timer = setTimeout(poll, 1500);
    };
    poll();
    return () => {
      stop2 = true;
      clearTimeout(timer);
    };
  }, [project, versionId]);
  (0, import_react4.useEffect)(() => {
    if (!model?.bbox || !settings || !engine || !host.current) return;
    let live = true, own = null, fitted = false;
    const initialViewport = camera.current ?? model.bbox;
    const initialFit = !camera.current;
    const el = host.current;
    setFailure("");
    const updateAnchor = () => {
      const s2 = modelRef.current?.stops.get(selectionRef.current.stopId);
      if (!s2 || !own) return;
      const p = own.project([s2[2], s2[3]]);
      setAnchor(p);
    };
    const start = async () => {
      let actual = engine;
      try {
        if (engine === "amap" && !settings.amapKey || engine === "baidu" && !settings.baiduAK)
          throw Error("missing");
        own = await createMapAdapter(actual, el, settings, {
          onSelect: select,
          onChange: updateAnchor,
          isActive: () => live
        });
      } catch (e) {
        if (!live) return;
        setFailure(
          e.message === "reload" ? t("map.reloadKey") : e.message === "missing" ? t("map.missingKey") : e.message === "coordinates" ? t("map.coordinateConflict") : t("map.sdkFailure")
        );
        actual = "canvas";
        own = await createMapAdapter(actual, el, settings, {
          onSelect: select,
          onChange: updateAnchor,
          isActive: () => live
        });
      }
      if (!live) {
        own?.destroy();
        return;
      }
      adapter.current = own;
      if (el.clientWidth && el.clientHeight) {
        own.setViewport(initialViewport, initialFit);
        fitted = true;
      }
      own.render(sceneRef.current);
    };
    start();
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
      if (own && !fitted && el.clientWidth && el.clientHeight) {
        own.setViewport(initialViewport, initialFit);
        fitted = true;
      }
      own?.resize();
    });
    ro.observe(el);
    return () => {
      live = false;
      ro.disconnect();
      if (own) {
        if (fitted) camera.current = own.getViewport();
        own.destroy();
      }
      if (adapter.current === own) adapter.current = null;
    };
  }, [model, settings, engine, retry]);
  const sceneRef = (0, import_react4.useRef)(null);
  sceneRef.current = { model, visible, selection, overlay, time, showStops };
  (0, import_react4.useEffect)(() => {
    adapter.current?.render(sceneRef.current);
    const s2 = model?.stops.get(selection.stopId);
    setAnchor(
      s2 && adapter.current ? adapter.current.project([s2[2], s2[3]]) : null
    );
  }, [model, visible, selection, overlay, time, showStops]);
  if (!versionId)
    return h5("p", { className: "linggo-note" }, t("wb.mapNoData"));
  if (error && !model)
    return h5(
      "p",
      { className: "linggo-error" },
      error,
      h5(
        "button",
        {
          onClick: () => {
            setError("");
            api("mapData", { projectId: project, versionId }).then(
              (d2) => alive.current && setData(d2),
              (e) => alive.current && setError(e.message)
            );
          }
        },
        t("map.retry")
      )
    );
  if (!model) return h5("p", { className: "linggo-note" }, t("map.loading"));
  if (!model.bbox)
    return h5("p", { className: "linggo-note" }, t("map.noGeometry"));
  const wide = width >= 900, lines = model.routes.get(selection.routeId) ?? [], line = lines.find((l) => l.dir === selection.direction) ?? lines[0], stop = model.stops.get(selection.stopId);
  const q = search.trim().toLowerCase();
  const matches = (l) => `${l.id} ${l.name} ${model.stops.get(l.stops[0])?.[1] ?? ""} ${model.stops.get(l.stops.at(-1))?.[1] ?? ""}`.toLowerCase().includes(q);
  const routes = [...model.routes.values()].map((lines2) => q ? lines2.find(matches) : lines2[0]).filter(Boolean);
  const changeEngine = (e) => {
    camera.current = adapter.current?.getViewport() ?? camera.current;
    setEngine(e.target.value);
    writePreference(localStorage, ENGINE_KEY, e.target.value);
  };
  return h5(
    "div",
    { className: "linggo-mapwrap", "data-map-width": wide ? "wide" : "narrow" },
    h5("div", {
      className: "linggo-map-host",
      ref: host,
      "aria-label": t("wb.map")
    }),
    h5(
      "div",
      { className: "linggo-map-tools" },
      h5(
        "button",
        {
          className: "primary",
          onClick: () => {
            setPanel("routes");
            setCollapsed(!collapsed || !wide && panel === "detail");
          },
          "aria-expanded": !collapsed && (!wide ? panel === "routes" : true)
        },
        t("map.routes")
      ),
      h5(
        "button",
        {
          "aria-label": t("map.reset"),
          onClick: () => adapter.current?.setViewport(model.bbox)
        },
        "\u2316 " + t("map.reset")
      ),
      h5(
        "button",
        {
          type: "button",
          "aria-pressed": !showStops,
          title: t(showStops ? "map.hideStops" : "map.showStops"),
          onClick: () => {
            setShowStops((old) => {
              const next = !old;
              writePreference(localStorage, STOPS_KEY, next);
              return next;
            });
          }
        },
        t(showStops ? "map.hideStops" : "map.showStops")
      ),
      h5(
        "span",
        { className: "linggo-map-stat" },
        t("map.summary", {
          routes: String(model.routeCount),
          stops: String(model.stops.size)
        })
      ),
      h5(
        "select",
        {
          "aria-label": t("map.engine"),
          value: engine ?? "canvas",
          onChange: changeEngine
        },
        h5("option", { value: "amap" }, t("map.amap")),
        h5("option", { value: "baidu" }, t("map.baidu")),
        h5("option", { value: "canvas" }, t("map.canvas"))
      )
    ),
    error && h5(
      "div",
      { className: "linggo-sdk-error", role: "alert" },
      error,
      h5("button", { onClick: () => setError("") }, "\xD7")
    ),
    failure && h5(
      "div",
      { className: "linggo-sdk-error", role: "alert" },
      failure,
      h5("button", { onClick: () => setRetry(retry + 1) }, t("map.retry"))
    ),
    data.truncated && h5(
      "div",
      { className: "linggo-map-warning", role: "status" },
      t("map.truncated")
    ),
    !collapsed && (wide || panel === "routes") && h5(
      "section",
      {
        className: "linggo-route-panel linggo-map-card",
        "aria-label": t("map.routes")
      },
      h5(
        "header",
        null,
        h5("strong", null, t("map.routes")),
        h5("span", { className: "linggo-count" }, String(model.routeCount)),
        h5(
          "button",
          {
            "aria-label": t("ui.collapse"),
            onClick: () => setCollapsed(true)
          },
          "\u2212"
        )
      ),
      h5(
        "small",
        null,
        t("map.summary", {
          routes: String(model.routeCount),
          stops: String(model.stops.size)
        })
      ),
      h5("input", {
        "aria-label": t("map.search"),
        placeholder: t("map.search"),
        value: search,
        onChange: (e) => setSearch(e.target.value)
      }),
      h5(
        "div",
        { className: "linggo-route-actions" },
        h5(
          "button",
          { onClick: () => setVisible(new Set(model.routes.keys())) },
          t("map.showAll")
        ),
        h5(
          "button",
          { onClick: () => setVisible(/* @__PURE__ */ new Set()) },
          t("map.hideAll")
        )
      ),
      h5(VirtualRoutes, {
        routes,
        model,
        visible,
        selection,
        t,
        onSelect: (l) => select({ routeId: l.id, direction: l.dir }, true),
        onVisibility: (id, show) => setVisible((old) => {
          const next = new Set(old);
          show ? next.add(id) : next.delete(id);
          return next;
        })
      }),
      h5(
        "details",
        { className: "linggo-map-history" },
        h5("summary", null, t("map.actions")),
        h5(
          "ul",
          { className: "linggo-list" },
          ...actions.slice().reverse().map(
            (a2) => h5(
              "li",
              { key: a2.seq },
              h5(
                "button",
                {
                  disabled: a2.versionId !== versionId,
                  onClick: () => applyAction(a2)
                },
                t("act." + a2.action) + " " + (a2.target?.name ?? a2.target?.routeId ?? a2.target?.stopId ?? "")
              )
            )
          )
        )
      )
    ),
    line && (wide || panel === "detail") && h5(
      "section",
      {
        className: "linggo-detail-panel linggo-map-card",
        "aria-label": t("map.details")
      },
      h5(
        "header",
        null,
        h5("strong", null, line.name || line.id),
        h5(
          "button",
          {
            "aria-label": t("ui.collapse"),
            onClick: () => setDetailCollapsed(!detailCollapsed)
          },
          detailCollapsed ? "+" : "\u2212"
        ),
        h5(
          "button",
          {
            "aria-label": t("map.closeDetail"),
            onClick: () => {
              setSelection((old) => ({
                ...old,
                routeId: null,
                direction: null
              }));
              if (!wide) setPanel("routes");
            }
          },
          "\xD7"
        )
      ),
      !detailCollapsed && h5(
        import_react4.default.Fragment,
        null,
        h5(
          "select",
          {
            "aria-label": t("map.direction"),
            value: line.key,
            onChange: (e) => select(
              {
                routeId: line.id,
                direction: lines.find((l) => l.key === e.target.value)?.dir
              },
              true
            )
          },
          ...lines.map(
            (l) => h5(
              "option",
              { value: l.key, key: l.key },
              t("map.originalDirection") + ": " + (l.dir ?? t("map.missingValue"))
            )
          )
        ),
        h5(
          "p",
          { className: "linggo-endpoints" },
          (model.stops.get(line.stops[0])?.[1] ?? t("map.missingValue")) + " \u2192 " + (model.stops.get(line.stops.at(-1))?.[1] ?? t("map.missingValue"))
        ),
        h5(
          "small",
          null,
          hasTrips ? t("map.trips", { n: String(line.trips ?? 0) }) : t("map.noTimetable")
        ),
        h5(
          "small",
          null,
          t(
            line.source === "geometry" ? "map.importedGeometry" : "map.stopConnections"
          )
        ),
        h5(
          "ol",
          { className: "linggo-stop-list" },
          ...line.stops.map(
            (id, i) => h5(
              "li",
              { key: id + "/" + i },
              h5(
                "button",
                { onClick: () => select({ stopId: id }, true) },
                model.stops.get(id)?.[1] ?? id
              )
            )
          )
        )
      )
    ),
    stop && h5(
      "section",
      {
        className: "linggo-stop-popup linggo-map-card",
        style: {
          left: Math.max(
            wide && !collapsed ? 316 : 8,
            Math.min(
              (anchor?.[0] ?? width / 2) + 10,
              wide && line ? width - 576 : width - 276
            )
          ),
          top: Math.max(
            80,
            Math.min(
              (anchor?.[1] ?? 120) - 40,
              (host.current?.clientHeight ?? 600) - 200
            )
          )
        },
        "aria-label": t("map.stopDetail")
      },
      h5(
        "header",
        null,
        h5("strong", null, stop[1] || stop[0]),
        h5(
          "button",
          {
            "aria-label": t("map.closeStop"),
            onClick: () => setSelection((old) => ({ ...old, stopId: null }))
          },
          "\xD7"
        )
      ),
      h5("small", null, stop[0]),
      h5(
        "div",
        { className: "linggo-route-chips" },
        ...[...model.through.get(stop[0]) ?? []].map(
          (id) => h5(
            "button",
            { key: id, onClick: () => select({ routeId: id }, true) },
            model.routes.get(id)?.[0]?.name || id
          )
        )
      )
    ),
    overlay && h5(
      "div",
      { className: "linggo-replay-bar" },
      h5(Replay, { t, overlay, time, setTime, onClose: () => onRun?.(null) })
    ),
    h5(
      "span",
      { className: "linggo-maptag" },
      t(failure ? "map.canvas" : "map." + (engine ?? "canvas"))
    )
  );
}
function VirtualRoutes({
  routes,
  model,
  visible,
  selection,
  t,
  onSelect,
  onVisibility
}) {
  const ref = (0, import_react4.useRef)(null), [top, setTop] = (0, import_react4.useState)(0), [height, setHeight] = (0, import_react4.useState)(300);
  const rowHeight = 58;
  (0, import_react4.useEffect)(() => {
    const ro = new ResizeObserver(() => setHeight(ref.current.clientHeight));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  (0, import_react4.useEffect)(() => {
    if (ref.current) ref.current.scrollTop = 0;
    setTop(0);
  }, [routes.length]);
  const start = Math.max(0, Math.floor(top / rowHeight) - 3), end = Math.min(routes.length, Math.ceil((top + height) / rowHeight) + 3);
  return h5(
    "div",
    {
      ref,
      className: "linggo-virtual-routes",
      onScroll: (e) => setTop(e.currentTarget.scrollTop),
      role: "list",
      "aria-label": t("map.routes")
    },
    h5(
      "div",
      { style: { height: routes.length * rowHeight, position: "relative" } },
      ...routes.slice(start, end).map(
        (l, i) => h5(
          "div",
          {
            key: l.id,
            className: "linggo-route-row",
            "aria-current": selection.routeId === l.id ? "true" : void 0,
            role: "listitem",
            style: {
              position: "absolute",
              top: (start + i) * rowHeight,
              height: rowHeight,
              left: 0,
              right: 0
            }
          },
          h5("input", {
            type: "checkbox",
            "aria-label": t("map.visible") + " " + (l.name || l.id),
            checked: visible.has(l.id),
            onChange: (e) => onVisibility(l.id, e.target.checked)
          }),
          h5("span", {
            className: "linggo-line-color",
            style: { background: routeColor(l.id) }
          }),
          h5(
            "button",
            { onClick: () => onSelect(l), title: l.name || l.id },
            h5("span", null, l.name || l.id),
            h5(
              "small",
              null,
              (model.stops.get(l.stops[0])?.[1] ?? "\u2014") + " \u2192 " + (model.stops.get(l.stops.at(-1))?.[1] ?? "\u2014")
            )
          )
        )
      )
    )
  );
}
var mapStyle = `
@container(max-height:560px){.linggo-mapwrap:has(.linggo-stop-popup) .linggo-route-panel,.linggo-mapwrap:has(.linggo-stop-popup) .linggo-detail-panel{display:none;}}
.linggo-mapwrap{container-type:size;position:relative;flex:1;min-height:0;isolation:isolate;overflow:hidden;background:#eef1f4;}
.linggo-map-host,.linggo-native-map,.linggo-render-map{position:absolute;inset:0;width:100%;height:100%;}
.linggo-map-host{z-index:0;}
.linggo-render-map{z-index:2;}
/* Unified glass toolbar */
.linggo-map-tools{position:absolute;left:12px;right:12px;top:12px;display:flex;align-items:center;gap:8px;pointer-events:none;z-index:6;padding:6px 8px;border-radius:12px;background:color-mix(in srgb, var(--c-bg) 92%, transparent);border:1px solid var(--c-line);box-shadow:0 4px 18px #182c4014;backdrop-filter:blur(10px);}
.linggo-map-tools>*{pointer-events:auto;}
.linggo-map-tools button{margin:0;min-height:32px;border-radius:8px;white-space:nowrap;}
.linggo-map-tools select{width:120px;margin:0 0 0 auto;height:32px;border-radius:8px;background:var(--c-bg);}
.linggo-map-tools .linggo-map-stat{margin-left:4px;font-size:11px;color:var(--c-sub);white-space:nowrap;}
.linggo-map-card{position:absolute;background:color-mix(in srgb, var(--c-bg) 96%, transparent);color:var(--c-text);border:1px solid var(--c-line);border-radius:14px;box-shadow:0 8px 28px #182c4018;z-index:5;overflow:hidden;}
.linggo-map-card header{display:flex;align-items:center;gap:6px;min-width:0;padding:2px 0 4px;}
.linggo-map-card header strong{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;}
.linggo-map-card header button{border:0;padding:2px 8px;margin:0;background:transparent;border-radius:6px;}
.linggo-map-card header .linggo-count{flex:none;}
/* Left route drawer */
.linggo-route-panel{left:12px;top:64px;width:280px;max-height:calc(100% - 96px);padding:12px 12px 10px;display:flex;flex-direction:column;gap:8px;}
.linggo-route-panel>small{font-size:11px;color:var(--c-cap);}
.linggo-route-actions{display:flex;gap:6px;}
.linggo-route-actions button{flex:1;justify-content:center;font-size:12px;margin:0;height:30px;border-radius:8px;}
.linggo-virtual-routes{height:400px;max-height:48vh;min-height:72px;overflow:auto;flex:1;overscroll-behavior:contain;margin:0 -2px;}
.linggo-route-row{display:flex;align-items:center;gap:8px;padding:8px 6px;border-radius:10px;}
.linggo-route-row:hover{background:var(--c-hover);}
.linggo-route-row[aria-current=true]{background:color-mix(in srgb, var(--c-accent) 10%, transparent);}
.linggo-route-row input{width:14px;margin:0;flex:none;}
.linggo-route-row button{border:0;display:block;min-width:0;flex:1;text-align:left;background:transparent;padding:0;margin:0;}
.linggo-route-row button span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500;line-height:1.3;}
.linggo-route-row button small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--c-cap);margin-top:2px;}
.linggo-line-color{width:3px;height:32px;border-radius:2px;flex:none;}
.linggo-map-history{font-size:11px;color:var(--c-sub);}
.linggo-map-history summary{cursor:pointer;padding:4px 0;}
.linggo-map-history ul{max-height:100px;overflow:auto;}
.linggo-map-history li{padding:0;}
.linggo-map-history button{font-size:11px;white-space:normal;text-align:left;}
/* Right detail peek */
.linggo-detail-panel{right:12px;top:64px;width:300px;max-height:calc(100% - 96px);padding:12px 14px;overflow:auto;}
.linggo-endpoints{font-size:12px;margin:8px 0;color:var(--c-sub);}
.linggo-stop-list{padding-left:18px;margin:0;max-height:32vh;overflow:auto;}
.linggo-stop-list li{padding:0;}
.linggo-stop-list button{border:0;background:transparent;font-size:12px;text-align:left;margin:0;padding:5px 6px;width:100%;border-radius:6px;}
.linggo-stop-list button:hover{background:var(--c-hover);}
/* Compact stop bubble */
.linggo-stop-popup{width:240px;max-height:180px;overflow:auto;padding:10px 12px;z-index:8;}
.linggo-route-chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;}
.linggo-route-chips button{font-size:11px;padding:3px 8px;margin:0;border-radius:999px;}
/* Replay bottom bar */
.linggo-replay-bar{position:absolute;bottom:28px;left:12px;right:12px;min-height:48px;background:color-mix(in srgb, var(--c-bg) 94%, transparent);border:1px solid var(--c-line);border-radius:12px;padding:8px 14px;z-index:9;box-shadow:0 4px 18px #182c4014;}
.linggo-replay-bar .linggo-replay{margin:0;}
.linggo-maptag{position:absolute;bottom:8px;right:10px;background:color-mix(in srgb, var(--c-bg) 88%, transparent);padding:2px 8px;border-radius:6px;color:var(--c-cap);font-size:11px;pointer-events:none;z-index:3;}
.linggo-sdk-error,.linggo-map-warning{position:absolute;bottom:36px;left:12px;right:12px;background:var(--c-bg);border:1px solid var(--c-line);border-radius:10px;padding:10px 12px;z-index:10;font-size:12px;box-shadow:0 4px 18px #182c4014;}
.linggo-map-warning{bottom:88px;}
/* Narrow map: drawers stack as mutually exclusive sheets */
.linggo-mapwrap[data-map-width=narrow] .linggo-route-panel,
.linggo-mapwrap[data-map-width=narrow] .linggo-detail-panel{left:12px;right:12px;width:auto;max-height:calc(100% - 120px);}
.linggo-mapwrap[data-map-width=narrow] .linggo-stop-popup{top:auto!important;bottom:32px;left:12px!important;width:calc(100% - 24px);max-height:150px;}
.linggo-mapwrap:has(.linggo-replay-bar) .linggo-route-panel,
.linggo-mapwrap:has(.linggo-replay-bar) .linggo-detail-panel{max-height:calc(100% - 168px);}
.linggo-mapwrap:has(.linggo-replay-bar)[data-map-width=narrow] .linggo-stop-popup{bottom:200px;}
.linggo-mapwrap:has(.linggo-stop-popup):has(.linggo-replay-bar)[data-map-width=narrow] .linggo-route-panel,
.linggo-mapwrap:has(.linggo-stop-popup):has(.linggo-replay-bar)[data-map-width=narrow] .linggo-detail-panel{max-height:calc(100% - 340px);}
.linggo-mapwrap:has(.linggo-stop-popup)[data-map-width=narrow] .linggo-route-panel,
.linggo-mapwrap:has(.linggo-stop-popup)[data-map-width=narrow] .linggo-detail-panel{max-height:calc(100% - 280px);}
`;

// src/data.jsx
var h6 = import_react5.default.createElement;
var dataStyle = `
.linggo-tabbar{display:flex;gap:2px;border-bottom:1px solid var(--c-line);margin:-8px 0 12px;}
.linggo-tabbar button{border:0!important;border-bottom:2px solid transparent!important;border-radius:0!important;margin:0!important;}
.linggo-tabbar button[aria-pressed="true"]{border-bottom-color:var(--c-accent)!important;font-weight:600;}
.linggo-table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;display:block;overflow:auto;max-height:280px;}
.linggo-table th,.linggo-table td{border:1px solid var(--c-line);padding:3px 6px;text-align:left;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;}
.linggo-table th{background:var(--c-side);position:sticky;top:0;}
.linggo-grid{display:grid;grid-template-columns:120px minmax(0,1fr) 150px;gap:4px 8px;align-items:center;}
.linggo-grid label{font-size:12px;}
.linggo-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.linggo-row>*{flex:1;min-width:120px;}
.linggo-progress{height:4px;background:var(--c-line);border-radius:2px;overflow:hidden;margin:4px 0;}
.linggo-progress>div{height:100%;background:var(--c-accent);}
/* Task rows share the DSH list rhythm; only live/error details add another line. */
.linggo-task-row{display:flex;align-items:center;gap:8px;min-height:32px;padding:0 8px;}
.linggo-task-row .linggo-row-title{flex:1;}
.linggo-task-row .linggo-task-active{color:var(--c-accent);}
.linggo-task-row .linggo-task-failed{color:var(--c-err);}
.linggo-root .linggo-task-cancel{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;background:transparent;margin:0;padding:0;color:var(--c-sub);border-radius:6px;}
.linggo-root .linggo-task-cancel:hover{background:var(--c-hover);color:var(--c-text);}
.linggo-root .linggo-task-cancel:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--c-accent));outline-offset:-2px;}
.linggo-task-detail{padding:0 8px 6px;min-width:0;}
.linggo-task-detail .linggo-progress{height:3px;margin:0 0 4px;}
.linggo-task-message{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;color:var(--c-cap);}
.linggo-task-detail .linggo-error{color:var(--c-err);font-size:11px;line-height:16px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;}
`;
function DataSummary({
  t,
  api,
  project,
  state,
  jobs,
  refresh,
  refreshJobs,
  run,
  busy,
  openImport
}) {
  const { datasets, current } = projectDatasets(state, project);
  const [dataOpen, setDataOpen] = useSectionState("data", false);
  const [jobsOpen, setJobsOpen] = useSectionState("jobs", false);
  const [datasetLimit, setDatasetLimit] = (0, import_react5.useState)(SIDEBAR_PAGE_SIZE);
  const [jobLimit, setJobLimit] = (0, import_react5.useState)(SIDEBAR_PAGE_SIZE);
  const attention = (0, import_react5.useRef)(/* @__PURE__ */ new Map());
  const orderedJobs = newestJobs(jobs, project);
  const active = orderedJobs.filter(isActiveJob);
  const failed = orderedJobs.filter((job) => job.status === "failed");
  const visibleDatasets = limitSidebarRows(
    datasets.slice().reverse(),
    datasetLimit,
    (item) => item.id === current?.id
  );
  const visibleJobs = limitSidebarRows(
    orderedJobs,
    jobLimit,
    (job) => isActiveJob(job) || job.id === failed[0]?.id
  );
  (0, import_react5.useEffect)(() => {
    setDatasetLimit(SIDEBAR_PAGE_SIZE);
  }, [project, dataOpen]);
  (0, import_react5.useEffect)(() => {
    setJobLimit(SIDEBAR_PAGE_SIZE);
  }, [project, jobsOpen]);
  (0, import_react5.useEffect)(() => {
    const next = observeJobAttention(localStorage, project, jobs, attention.current.get(project));
    attention.current.set(project, next.tokens);
    if (next.shouldOpen) setJobsOpen(true);
  }, [project, jobs, setJobsOpen]);
  const renderJob = (job) => h6(
    "li",
    { key: job.id, className: "linggo-task" },
    h6(
      "div",
      { className: "linggo-task-row" },
      h6("span", { className: "linggo-row-title", title: job.title }, job.title),
      h6(
        "span",
        { className: "linggo-row-meta" + (isActiveJob(job) ? " linggo-task-active" : job.status === "failed" ? " linggo-task-failed" : "") },
        t("job." + job.status)
      ),
      job.status === "running" && h6(
        "button",
        {
          type: "button",
          className: "linggo-task-cancel",
          title: t("job.cancel"),
          "aria-label": t("job.cancel"),
          disabled: busy,
          onClick: () => run(async () => {
            await api("cancelJob", { id: job.id });
            await refreshJobs();
          })
        },
        h6(Icon, { name: "close", size: 14 })
      )
    ),
    job.status === "running" && h6(
      "div",
      { className: "linggo-task-detail" },
      h6(
        "div",
        {
          className: "linggo-progress",
          role: "progressbar",
          "aria-label": job.title,
          "aria-valuemin": 0,
          "aria-valuemax": 100,
          "aria-valuenow": Math.round(job.progress * 100)
        },
        h6("div", {
          style: { width: Math.round(job.progress * 100) + "%" }
        })
      ),
      job.message && h6("small", { className: "linggo-task-message", title: job.message }, job.message)
    ),
    job.error && h6(
      "div",
      { className: "linggo-task-detail" },
      h6("small", { className: "linggo-error", title: job.error }, job.error)
    )
  );
  const summaryText = datasetSummary(t, current);
  const summary = h6("div", { className: "linggo-section-summary", title: summaryText }, summaryText);
  return h6(
    import_react5.default.Fragment,
    null,
    h6(
      SideSection,
      {
        id: "data",
        title: t("wb.data"),
        badge: datasets.length ? t("ui.datasetCount", { count: datasets.length }) : "",
        icon: h6(Icon, { name: "database", size: 16 }),
        open: dataOpen,
        onOpenChange: setDataOpen,
        collapsedSummary: summary,
        actions: h6(
          "button",
          {
            type: "button",
            title: t("data.import"),
            "aria-label": t("data.import"),
            disabled: busy || !project,
            onClick: openImport
          },
          h6(Icon, { name: "plus", size: 16 })
        )
      },
      summary,
      h6(
        "ul",
        { className: "linggo-sidebar-list", "aria-label": t("ui.datasets") },
        ...visibleDatasets.rows.map((item) => h6(
          "li",
          { key: item.id },
          h6(
            "button",
            {
              type: "button",
              className: "linggo-sidebar-row",
              disabled: busy,
              "aria-current": item.id === current?.id ? "true" : void 0,
              title: datasetSummary(t, item),
              onClick: () => run(async () => {
                await api("selectVersion", { projectId: project, versionId: item.id });
                await refresh();
              })
            },
            h6("span", { className: "linggo-row-title" }, datasetLabel(t, item)),
            h6("span", { className: "linggo-row-meta" }, new Date(item.createdAt).toLocaleDateString())
          )
        ))
      ),
      visibleDatasets.hiddenCount > 0 && h6(
        "button",
        { type: "button", className: "linggo-show-more", onClick: () => setDatasetLimit((value) => value + SIDEBAR_PAGE_SIZE) },
        t("ui.showMore", { count: visibleDatasets.hiddenCount })
      )
    ),
    h6(
      SideSection,
      {
        id: "jobs",
        title: t("wb.tasks"),
        icon: h6(Icon, { name: "list", size: 16 }),
        open: jobsOpen,
        onOpenChange: setJobsOpen,
        badge: active.length || failed.length ? t("ui.jobCounts", {
          running: String(active.length),
          failed: String(failed.length)
        }) : ""
      },
      !orderedJobs.length && h6("small", { className: "linggo-section-summary" }, t("wb.noTasks")),
      h6("ul", { className: "linggo-sidebar-list", "aria-label": t("wb.tasks") }, ...visibleJobs.rows.map(renderJob)),
      visibleJobs.hiddenCount > 0 && h6(
        "button",
        { type: "button", className: "linggo-show-more", onClick: () => setJobLimit((value) => value + SIDEBAR_PAGE_SIZE) },
        t("ui.showMore", { count: visibleJobs.hiddenCount })
      )
    )
  );
}
var EMPTY_SOURCE = { type: "file", path: "", dsn: "", table: "" };
function ImportWizard({ t, api, project, onDone, onCancel }) {
  const [source, setSource] = (0, import_react5.useState)(EMPTY_SOURCE);
  const [info, setInfo] = (0, import_react5.useState)(null);
  const [tableName, setTableName] = (0, import_react5.useState)("");
  const [mapping, setMappingRaw] = (0, import_react5.useState)(null);
  const [preview, setPreview] = (0, import_react5.useState)(null);
  const [error, setError] = (0, import_react5.useState)("");
  const [busy, setBusy] = (0, import_react5.useState)(false);
  const cleanSource = () => source.type === "postgis" ? { type: "postgis", dsn: source.dsn, table: source.table || void 0 } : { type: "file", path: source.path };
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };
  const setMapping = (m2) => {
    setMappingRaw(m2);
    setPreview(null);
  };
  const table = info?.tables.find((x) => x.name === tableName);
  const chooseTable = (inf, name, entity) => {
    const tb = inf.tables.find((x) => x.name === name);
    setTableName(name);
    if (inf.kind === "gtfs") return setMapping({ entity: "gtfs" });
    const ent = entity ?? tb.entity ?? "route_stops";
    setMapping({
      entity: ent,
      table: name,
      crs: tb.crs ?? "WGS84",
      mode: "append",
      fields: tb.suggestions[ent] ?? {},
      defaults: {}
    });
  };
  const inspect = () => run(async () => {
    setInfo(null);
    setMapping(null);
    const inf = await api("inspect", {
      projectId: project,
      source: cleanSource()
    });
    if (!inf.tables.length) throw Error(t("imp.noTables"));
    setInfo(inf);
    chooseTable(inf, inf.tables[0].name);
  });
  const doPreview = () => run(async () => {
    setPreview(
      await api("preview", {
        projectId: project,
        source: cleanSource(),
        mapping
      })
    );
  });
  const confirm = () => run(async () => {
    await api("startImport", {
      projectId: project,
      source: cleanSource(),
      mapping,
      previewToken: preview.previewToken
    });
    onDone();
  });
  const fields = mapping && mapping.entity !== "gtfs" ? info.entities[mapping.entity].fields : {};
  const columns = table?.columns ?? [];
  const transformsFor = (f2) => Object.keys(info.transforms).filter(
    (x) => !x || f2 === "lon" && x === "wkt_lon" || f2 === "lat" && x === "wkt_lat" || f2 === "direction" && x === "seq_hundreds"
  );
  const epsg = mapping?.crs?.startsWith("EPSG:");
  return h6(
    "div",
    { style: { maxWidth: 860 } },
    h6("h2", null, t("imp.title")),
    h6("p", { className: "linggo-note" }, t("imp.intro")),
    h6("h3", null, t("imp.step1")),
    h6(
      "div",
      { className: "linggo-row" },
      h6(
        "select",
        {
          "aria-label": t("imp.sourceType"),
          value: source.type,
          onChange: (e) => (setSource({ ...EMPTY_SOURCE, type: e.target.value }), setInfo(null), setMapping(null))
        },
        h6("option", { value: "file" }, t("imp.file")),
        h6("option", { value: "postgis" }, "PostGIS")
      )
    ),
    source.type === "file" ? h6("input", {
      "aria-label": t("imp.path"),
      placeholder: t("imp.pathHint"),
      value: source.path,
      onChange: (e) => setSource({ ...source, path: e.target.value })
    }) : h6(
      import_react5.default.Fragment,
      null,
      h6("input", {
        "aria-label": "DSN",
        type: "password",
        placeholder: "postgresql://user:password@host:5432/db",
        value: source.dsn,
        onChange: (e) => setSource({ ...source, dsn: e.target.value })
      }),
      h6("input", {
        "aria-label": t("imp.pgTable"),
        placeholder: t("imp.pgTable"),
        value: source.table,
        onChange: (e) => setSource({ ...source, table: e.target.value })
      }),
      h6("small", null, t("imp.pgNote"))
    ),
    h6("small", null, t("imp.formats")),
    h6(
      "button",
      {
        className: "primary",
        disabled: busy || !(source.type === "file" ? source.path.trim() : source.dsn.trim()),
        onClick: inspect
      },
      t("imp.inspect")
    ),
    h6("button", { onClick: onCancel }, t("common.cancel")),
    info && mapping && h6(
      import_react5.default.Fragment,
      null,
      h6("h3", null, t("imp.step2")),
      info.tables.length > 1 && h6(
        "select",
        {
          "aria-label": t("imp.table"),
          value: tableName,
          onChange: (e) => chooseTable(info, e.target.value)
        },
        ...info.tables.map(
          (x) => h6(
            "option",
            { key: x.name, value: x.name },
            `${x.name}\uFF08${x.rows ?? "?"} ${t("imp.rows")}\uFF09`
          )
        )
      ),
      table && h6(
        "small",
        null,
        t("imp.tableInfo", {
          rows: String(table.rows ?? "?"),
          cols: String(table.columns.length),
          geometry: table.geometry ?? "-"
        })
      ),
      table && h6(SampleTable, { columns: table.columns, rows: table.sample }),
      info.kind === "gtfs" ? h6("p", { className: "linggo-note" }, t("imp.gtfs")) : h6(
        import_react5.default.Fragment,
        null,
        h6(
          "div",
          { className: "linggo-row" },
          h6(
            "label",
            null,
            t("imp.entity"),
            h6(
              "select",
              {
                value: mapping.entity,
                onChange: (e) => chooseTable(info, tableName, e.target.value)
              },
              ...ENTITY_ORDER.map(
                (k2) => h6("option", { key: k2, value: k2 }, t("entity." + k2))
              )
            )
          ),
          h6(
            "label",
            null,
            t("imp.crs"),
            h6(
              "select",
              {
                value: epsg ? "EPSG" : mapping.crs,
                onChange: (e) => setMapping({
                  ...mapping,
                  crs: e.target.value === "EPSG" ? "EPSG:4549" : e.target.value
                })
              },
              ...["WGS84", "GCJ02", "BD09"].map(
                (c) => h6("option", { key: c, value: c }, t("crs." + c))
              ),
              h6("option", { value: "EPSG" }, t("crs.EPSG"))
            )
          ),
          epsg && h6(
            "label",
            null,
            "EPSG",
            h6("input", {
              value: mapping.crs.slice(5),
              onChange: (e) => setMapping({
                ...mapping,
                crs: "EPSG:" + e.target.value.replace(/\D/g, "")
              })
            })
          ),
          h6(
            "label",
            null,
            t("imp.mode"),
            h6(
              "select",
              {
                value: mapping.mode,
                onChange: (e) => setMapping({ ...mapping, mode: e.target.value })
              },
              h6("option", { value: "append" }, t("imp.append")),
              h6("option", { value: "replace" }, t("imp.replace"))
            )
          )
        ),
        h6("small", null, t("imp.mappingNote")),
        h6(
          "div",
          {
            className: "linggo-grid",
            role: "group",
            "aria-label": t("imp.step2")
          },
          ...Object.entries(fields).flatMap(([f2, spec]) => {
            const cur = mapping.fields[f2] ?? {
              column: "",
              transform: ""
            };
            const set = (patch) => {
              const next = { ...cur, ...patch };
              const all = { ...mapping.fields };
              if (next.column) all[f2] = next;
              else delete all[f2];
              setMapping({ ...mapping, fields: all });
            };
            const tf = transformsFor(f2);
            return [
              h6(
                "label",
                { key: f2 + "l" },
                t("field." + f2),
                spec.required ? " *" : ""
              ),
              h6(
                "select",
                {
                  key: f2 + "c",
                  "aria-label": t("field." + f2),
                  value: cur.column,
                  onChange: (e) => set({ column: e.target.value })
                },
                h6("option", { value: "" }, t("imp.unmapped")),
                ...columns.map(
                  (c) => h6("option", { key: c, value: c }, columnLabel(t, c))
                )
              ),
              tf.length > 1 ? h6(
                "select",
                {
                  key: f2 + "t",
                  "aria-label": t("imp.transform"),
                  value: cur.transform ?? "",
                  onChange: (e) => set({ transform: e.target.value })
                },
                ...tf.map(
                  (x) => h6(
                    "option",
                    { key: x, value: x },
                    t("tf." + (x || "none"))
                  )
                )
              ) : h6("span", { key: f2 + "t" })
            ];
          })
        )
      ),
      h6(
        "button",
        { className: "primary", disabled: busy, onClick: doPreview },
        t("imp.preview")
      )
    ),
    preview && h6(
      import_react5.default.Fragment,
      null,
      h6("h3", null, t("imp.step3")),
      preview.sampled && h6(
        "small",
        null,
        t("imp.sampled", { total: String(preview.rowsTotal ?? "?") })
      ),
      h6(
        "table",
        { className: "linggo-table" },
        h6(
          "thead",
          null,
          h6(
            "tr",
            null,
            ...[
              "imp.rEntity",
              "imp.rIn",
              "imp.rOut",
              "imp.rDup",
              "imp.rDrop"
            ].map((k2) => h6("th", { key: k2 }, t(k2)))
          )
        ),
        h6(
          "tbody",
          null,
          ...preview.report.map(
            (r2) => h6(
              "tr",
              { key: r2.entity },
              h6("td", null, t("entity." + r2.entity)),
              h6("td", null, r2.rowsIn),
              h6("td", null, r2.rowsOut),
              h6("td", null, r2.duplicates),
              h6(
                "td",
                null,
                Object.entries(r2.dropped ?? {}).map(([k2, n]) => `${k2} ${n}`).join("\uFF1B") || "0"
              )
            )
          )
        )
      ),
      ...Object.entries(preview.sample).map(
        ([entity, rows]) => h6(
          "div",
          { key: entity },
          h6(
            "small",
            null,
            t("imp.sample", { entity: t("entity." + entity) })
          ),
          rows.length ? h6(SampleTable, {
            columns: Object.keys(rows[0]),
            rows: rows.map((r2) => Object.values(r2))
          }) : h6("small", null, "\u2014")
        )
      ),
      h6("p", { className: "linggo-note" }, t("imp.confirmNote")),
      h6(
        "button",
        { className: "primary", disabled: busy, onClick: confirm },
        t("imp.confirm")
      ),
      h6(
        "button",
        { disabled: busy, onClick: () => setPreview(null) },
        t("imp.back")
      )
    ),
    busy && h6("p", { className: "linggo-note", role: "status" }, t("imp.working")),
    error && h6("p", { className: "linggo-error", role: "alert" }, error)
  );
}
function columnLabel(t, c) {
  return { __x: t("col.x"), __y: t("col.y"), __geometry: t("col.geometry") }[c] ?? c;
}
function SampleTable({ columns, rows }) {
  return h6(
    "table",
    { className: "linggo-table" },
    h6(
      "thead",
      null,
      h6("tr", null, ...columns.map((c, i) => h6("th", { key: i, title: c }, c)))
    ),
    h6(
      "tbody",
      null,
      ...rows.slice(0, 8).map(
        (r2, i) => h6(
          "tr",
          { key: i },
          ...r2.map((v2, j) => h6("td", { key: j, title: v2 }, v2))
        )
      )
    )
  );
}
function SettingsView({ t, api }) {
  const [form, setForm] = (0, import_react5.useState)(null);
  const [env, setEnv] = (0, import_react5.useState)(null);
  const [msg, setMsg] = (0, import_react5.useState)("");
  const [error, setError] = (0, import_react5.useState)("");
  const check = () => api("env", {}).then(setEnv, (e) => setEnv({ ok: false, error: e.message }));
  (0, import_react5.useEffect)(() => {
    api("settings", {}).then(setForm, (e) => setError(e.message));
    check();
  }, []);
  if (!form) return h6("p", { className: "linggo-note" }, error || "\u2026");
  const field = (key, label2, type = "text") => h6(
    "label",
    { key },
    label2,
    h6("input", {
      type,
      value: form[key] ?? "",
      onChange: (e) => setForm({ ...form, [key]: e.target.value })
    })
  );
  return h6(
    "div",
    { style: { maxWidth: 640 } },
    h6("h2", null, t("set.title")),
    h6("h3", null, t("set.python")),
    env ? env.ok ? h6(
      "small",
      null,
      `${env.python} \xB7 Python ${env.version}`,
      h6("br"),
      Object.entries(env.modules).map(([m2, ok]) => `${m2} ${ok ? "\u2713" : "\u2717"}`).join(" \xB7 ")
    ) : h6("p", { className: "linggo-error" }, env.error) : h6("small", null, "\u2026"),
    h6("small", null, t("set.pythonHelp")),
    field("python", t("set.pythonPath")),
    h6("h3", null, t("set.amap")),
    h6("small", null, t("set.amapHelp")),
    field("amapKey", "Key"),
    field("amapSecurityCode", t("set.amapCode"), "password"),
    h6("h3", null, t("set.baidu")),
    h6("small", null, t("set.baiduHelp")),
    field("baiduAK", "AK", "password"),
    h6(
      "button",
      {
        className: "primary",
        onClick: async () => {
          setError("");
          try {
            await api("saveSettings", form);
            setMsg(t("set.saved"));
            check();
          } catch (e) {
            setError(e.message);
          }
        }
      },
      t("set.save")
    ),
    msg && h6("p", { className: "linggo-note", role: "status" }, msg),
    error && h6("p", { className: "linggo-error", role: "alert" }, error)
  );
}

// src/client.jsx
var h7 = import_react6.default.createElement;
var inject = [
  "slots",
  "sessions",
  "workspaces",
  "uiWorkspace",
  "connection",
  "conversation",
  "layout",
  "locale"
];
var NS = "linggo";
var FRAME = FRAME_SELECTOR;
var LAST_PROJECT = "linggo.project";
var style = `
html[data-linggo]{--linggo-width:64%;}
html[data-linggo] ${FRAME}{padding-left:var(--linggo-width);grid-template-columns:0 minmax(0,1fr) 0!important;}
html[data-linggo] ${FRAME}>:first-child{visibility:hidden;}
html[data-linggo] ${FRAME}>:nth-child(2){grid-column:2;}
html[data-linggo] ${FRAME}>[data-side]{display:none;}
html[data-linggo] [data-rightbar-col],html[data-linggo] [aria-label="\u6253\u5F00\u53F3\u4FA7\u8FB9\u680F"],html[data-linggo] [aria-label="Open right sidebar"]{display:none!important;}
html[data-linggo][data-linggo-blocked] ${FRAME}>:nth-child(2),html[data-linggo][data-linggo-chat-closed] ${FRAME}>:nth-child(2){visibility:hidden;}
.linggo-root{--c-bg:var(--dsw-alias-bg-base,#fff);--c-side:var(--dsw-specific-sidebar-fill,#f6f7f9);--c-text:var(--dsw-alias-label-primary,#1f2329);--c-sub:var(--dsw-alias-label-secondary,#646a73);--c-cap:var(--dsw-alias-label-tertiary,#8f959e);--c-line:var(--dsw-alias-border-l3,#e4e6eb);--c-hover:var(--dsw-alias-interactive-bg-hover,#0000000d);--c-accent:var(--dsw-alias-state-business-primary,#3c6df0);--c-err:var(--dsw-alias-state-error-primary,#d83931);color:var(--c-text);font-family:var(--dsw-font-family,system-ui);font-size:13px;line-height:1.5;}
.linggo-root *{box-sizing:border-box;}
.linggo-root h2{font-size:15px;margin:0 0 4px;}
.linggo-root h3{font-size:12px;font-weight:600;color:var(--c-sub);margin:18px 0 6px;text-transform:none;}
.linggo-root small,.linggo-cap{display:block;color:var(--c-cap);font-size:12px;}
.linggo-root button,.linggo-root .linggo-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border:1px solid var(--c-line);border-radius:var(--dsw-radius-md,8px);background:var(--c-bg);color:var(--c-text);cursor:pointer;font:inherit;text-decoration:none;margin:2px 4px 2px 0;}
.linggo-root button:hover,.linggo-root .linggo-btn:hover{background:var(--c-hover);}
.linggo-root button.primary{background:var(--c-accent);border-color:var(--c-accent);color:#fff;}
.linggo-root button:disabled{opacity:.5;cursor:default;}
.linggo-root input,.linggo-root textarea,.linggo-root select{width:100%;padding:6px 8px;margin:4px 0;border:1px solid var(--c-line);border-radius:var(--dsw-radius-sm,6px);background:var(--c-bg);color:var(--c-text);font:inherit;}
.linggo-root textarea{min-height:72px;resize:vertical;}
.linggo-error{color:var(--c-err);white-space:pre-wrap;}
.linggo-note{color:var(--c-sub);}
.linggo-list{list-style:none;margin:0;padding:0;}
.linggo-list li{padding:6px 8px;border-radius:var(--dsw-radius-sm,6px);cursor:pointer;display:flex;justify-content:space-between;gap:8px;}
.linggo-list li:hover{background:var(--c-hover);}
.linggo-list li[aria-current="true"]{background:var(--c-hover);font-weight:600;}
.linggo-list li span:last-child{color:var(--c-cap);font-size:12px;white-space:nowrap;}
.linggo-card{border:1px solid var(--c-line);border-radius:var(--dsw-radius-md,8px);padding:10px;margin:8px 0;}
.linggo-workspace{position:fixed;inset:0 auto 0 0;width:var(--linggo-width);pointer-events:auto;display:grid;grid-template-columns:260px minmax(0,1fr);background:var(--c-bg);border-right:1px solid var(--c-line);}
.linggo-workspace>aside{padding:16px;padding-top:max(16px,var(--dsh-frame-top-clearance,0px));border-right:1px solid var(--c-line);overflow:auto;background:var(--c-side);}
.linggo-workspace>main{overflow:auto;padding:24px;padding-top:max(24px,var(--dsh-frame-top-clearance,0px));}
.linggo-empty{max-width:520px;margin:12vh auto 0;text-align:left;}
.linggo-empty ul{color:var(--c-sub);padding-left:18px;}
.linggo-cover{position:fixed;top:0;bottom:0;left:var(--linggo-width);right:0;pointer-events:auto;display:grid;place-items:center;padding:24px;background:var(--c-bg);}
.linggo-cover>div{max-width:360px;text-align:center;}
.linggo-tabs{display:none;}
.linggo-panel{height:100%;overflow:auto;padding:24px 32px;padding-top:max(24px,var(--dsh-frame-top-clearance,0px));max-width:860px;}
@media(max-width:899px){
  html[data-linggo]{--linggo-width:0px;}
  html[data-linggo] ${FRAME}{padding-top:44px;}
  .linggo-tabs{display:flex;position:fixed;top:0;left:0;right:0;height:44px;align-items:center;justify-content:center;gap:4px;background:var(--c-side);border-bottom:1px solid var(--c-line);pointer-events:auto;}
  .linggo-tabs button[aria-pressed="true"]{background:var(--c-hover);font-weight:600;}
  .linggo-workspace{top:44px;width:100%;grid-template-columns:1fr;grid-template-rows:auto 1fr;overflow:auto;}
  .linggo-workspace>aside{border-right:0;border-bottom:1px solid var(--c-line);padding-top:16px;}
  html[data-linggo-view="chat"] .linggo-workspace{display:none;}
  html[data-linggo-view="workspace"] ${FRAME}>:nth-child(2){visibility:hidden;}
  .linggo-cover{top:44px;left:0;}
  html[data-linggo-view="workspace"] .linggo-cover{display:none;}
}
${dataStyle}${analysisStyle}${workbenchStyle}${mapStyle}
@media(max-width:899px){html[data-linggo-view="project"] ${FRAME}>:nth-child(2),html[data-linggo-view="map"] ${FRAME}>:nth-child(2){visibility:hidden;}html[data-linggo-view="chat"] .linggo-cover{display:grid;}html:not([data-linggo-view="chat"]) .linggo-cover{display:none;}}`;
var norm = (p) => (p ?? "").replaceAll("\\", "/").replace(/\/+$/, "");
var presentationProject = (cwd) => /\/linggo\/projects\/([\w-]+)\/presentation(\/|$)/.exec(norm(cwd))?.[1];
var when = (iso) => {
  const d2 = new Date(iso);
  return isNaN(d2) ? "" : d2.toLocaleString(void 0, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};
var sessionTime = (row) => when(
  typeof row.updatedAt === "number" ? new Date(row.updatedAt).toISOString() : row.updatedAt
);
function useAsync(t) {
  const [error, setError] = (0, import_react6.useState)(""), [busy, setBusy] = (0, import_react6.useState)(false), [note, setNote] = (0, import_react6.useState)("");
  const run = async (fn) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const message = await fn();
      if (typeof message === "string") setNote(message);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };
  return {
    error,
    busy,
    note,
    run,
    clear: () => {
      setError("");
      setNote("");
    }
  };
}
function useLinggoState(api, onReset) {
  const [state, setState] = (0, import_react6.useState)({
    projects: [],
    handoffs: [],
    dataVersions: []
  });
  const [loadError, setLoadError] = (0, import_react6.useState)("");
  const refresh = () => api("state", {}).then(
    (s2) => {
      setState(s2);
      setLoadError("");
      return s2;
    },
    (e) => setLoadError(e.message)
  );
  (0, import_react6.useEffect)(() => {
    refresh();
    return onReset(refresh);
  }, []);
  return { state, refresh, loadError };
}
function contextLines(t, handoff, state) {
  const c = handoff.context ?? {};
  const version = state.dataVersions?.find((v2) => v2.id === c.dataVersionId);
  return [
    t("ctx.dataVersion", {
      value: version?.label ?? c.dataVersionId ?? t("ctx.none")
    }),
    t("ctx.scenario", { value: c.scenarioId ?? t("ctx.none") }),
    t("ctx.results", {
      value: c.resultRefs?.length ? c.resultRefs.join(", ") : t("ctx.none")
    })
  ];
}
function draftPrompt(t, handoff, project, state) {
  return [
    t("draft.title", { name: project?.name ?? handoff.projectId }),
    "",
    handoff.summary,
    "",
    t("draft.context"),
    `- ${t("draft.project", { name: project?.name ?? "", id: handoff.projectId })}`,
    ...contextLines(t, handoff, state).map((line) => `- ${line}`),
    handoff.sourceSessionId ? `- ${t("draft.source", { id: handoff.sourceSessionId })}` : "",
    "",
    t("draft.footer")
  ].filter((line, i, all) => line !== "" || all[i - 1] !== "").join("\n");
}
function Workbench({
  t,
  api,
  onReset,
  newPresentation,
  openSession,
  ensureProjectWorkspaces,
  useSessions,
  useWorkspaces
}) {
  const { state, refresh, loadError } = useLinggoState(api, onReset);
  const { error, busy, note, run, clear } = useAsync(t);
  const projectRef = (0, import_react6.useRef)("");
  const [project, setProjectRaw] = (0, import_react6.useState)(
    () => localStorage.getItem(LAST_PROJECT) ?? ""
  );
  projectRef.current = project;
  const [name, setName] = (0, import_react6.useState)("");
  const [summary, setSummary] = (0, import_react6.useState)("");
  const [preview, setPreview] = (0, import_react6.useState)(false);
  const [view, setView] = (0, import_react6.useState)("map");
  const layout = useWorkbenchLayout(view);
  const [projectDialog, setProjectDialog] = (0, import_react6.useState)(false);
  const [handoffDialog, setHandoffDialog] = (0, import_react6.useState)(false);
  const [sessionSearch, setSessionSearch] = (0, import_react6.useState)("");
  const [searchOpen, setSearchOpen] = (0, import_react6.useState)(false);
  const [sessionsOpen, setSessionsOpen] = useSectionState("sessions", true);
  const [sessionLimit, setSessionLimit] = (0, import_react6.useState)(SIDEBAR_PAGE_SIZE);
  const searchInput = (0, import_react6.useRef)(null);
  const [tab, setTab] = (0, import_react6.useState)("map");
  const [jobs, setJobs] = (0, import_react6.useState)([]);
  const [runId, setRunId] = (0, import_react6.useState)(null);
  const [proposalCount, setProposalCount] = (0, import_react6.useState)(0);
  (0, import_react6.useEffect)(() => {
    setSessionLimit(SIDEBAR_PAGE_SIZE);
  }, [project, sessionSearch, sessionsOpen]);
  (0, import_react6.useEffect)(() => {
    setSessionSearch("");
    setSearchOpen(false);
  }, [project]);
  (0, import_react6.useEffect)(() => {
    if (searchOpen && sessionsOpen) searchInput.current?.focus();
  }, [searchOpen, sessionsOpen]);
  const sessions = useSessions((s2) => s2);
  const archived = useWorkspaces((s2) => s2.archivedSessionIds);
  const setProject = (id) => {
    setProjectRaw(id);
    localStorage.setItem(LAST_PROJECT, id);
  };
  const current = (0, import_react6.useMemo)(
    () => Object.values(sessions.byId).find(
      (row) => (row.retainedBy?.mainView ?? 0) > 0
    ),
    [sessions]
  );
  const currentProject = presentationProject(current?.cwd);
  const known = state.projects.some((p) => p.id === project);
  const selected = state.projects.find((p) => p.id === project);
  const blocked = !known || currentProject !== project;
  const history = (0, import_react6.useMemo)(
    () => sessions.ids.map((id) => sessions.byId[id]).filter(
      (row) => row && row.origin !== "subagent" && presentationProject(row.cwd) === project && !archived.includes(row.id) && (!row.blank || row.id === current?.id)
    ).sort((a2, b2) => String(b2.updatedAt).localeCompare(String(a2.updatedAt))),
    [sessions, archived, project, current?.id]
  );
  (0, import_react6.useEffect)(() => {
    const root = document.documentElement;
    if (blocked) root.setAttribute("data-linggo-blocked", "");
    else root.removeAttribute("data-linggo-blocked");
    return () => {
      root.removeAttribute("data-linggo-blocked");
    };
  }, [blocked, view]);
  (0, import_react6.useEffect)(() => {
    if (state.projects.length && !known) setProject(state.projects[0].id);
  }, [state.projects, known]);
  const params = new URLSearchParams(location.hash.slice(1));
  const devUrl = new URL(location.href);
  devUrl.hash = "";
  devUrl.searchParams.delete("linggo");
  const restore = () => history[0] ? openSession(history[0].id) : newPresentation(project);
  const versions = state.dataVersions.filter((v2) => v2.projectId === project);
  const currentVersion = versions.find((v2) => v2.id === selected?.currentVersionId) ?? versions.at(-1);
  const refreshJobs = () => known ? api("jobs", { projectId: project }).then(
    (list) => {
      if (projectRef.current === project) setJobs(list);
    },
    () => {
    }
  ) : Promise.resolve();
  const running = jobs.some((j) => j.status === "running");
  (0, import_react6.useEffect)(() => {
    setJobs([]);
    refreshJobs();
  }, [project, known]);
  (0, import_react6.useEffect)(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      const list = await api("jobs", { projectId: project }).catch(() => null);
      if (!list || projectRef.current !== project) return;
      setJobs(list);
      if (!list.some((j) => j.status === "running")) refresh();
    }, 1e3);
    return () => clearInterval(timer);
  }, [running, project]);
  (0, import_react6.useEffect)(() => {
    setRunId(null);
    if (!known) return;
    let stop = false, timer;
    const poll = async () => {
      await api("proposals", { projectId: project }).then(
        (list) => {
          if (!stop && projectRef.current === project)
            setProposalCount(list.length);
        },
        () => {
        }
      );
      if (!stop) timer = setTimeout(poll, 3e3);
    };
    poll();
    return () => (stop = true, clearTimeout(timer));
  }, [project, known]);
  const filteredHistory = history.filter(
    (row) => (row.displayTitle || t("wb.untitled")).toLowerCase().includes(sessionSearch.toLowerCase())
  );
  const visibleHistory = limitSidebarRows(
    filteredHistory,
    sessionLimit,
    (row) => row.id === current?.id || row.running || row.runningSubagentCount > 0
  );
  const sessionRows = visibleHistory.rows.map(
    (row) => h7(
      "li",
      { key: row.id },
      h7(
        "button",
        {
          type: "button",
          className: "linggo-sidebar-row",
          "aria-current": row.id === current?.id ? "true" : void 0,
          title: row.displayTitle || t("wb.untitled"),
          onClick: () => {
            openSession(row.id);
            setView("chat");
          }
        },
        h7("span", { className: "linggo-row-title" }, row.displayTitle || t("wb.untitled")),
        h7(
          "span",
          { className: "linggo-row-meta" },
          row.running && h7("span", { className: "running", "aria-label": t("job.running") }, "\u25CF"),
          sessionTime(row)
        )
      )
    )
  );
  const aside = h7(
    "aside",
    { "aria-label": t("ui.projectPanel") },
    !layout.geometry.mobile && layout.geometry.left <= 48 ? h7(
      "div",
      { className: "linggo-icon-rail" },
      h7("b", null, "L"),
      h7(
        "button",
        {
          title: t("ui.expand"),
          onClick: () => layout.update({ ...layout.prefs, leftOpen: true })
        },
        "\u203A"
      ),
      h7(
        "button",
        {
          title: t("ui.addProject"),
          onClick: () => setProjectDialog(true)
        },
        "+"
      ),
      h7(
        "button",
        {
          title: t("wb.newSession"),
          disabled: !known,
          onClick: () => run(() => newPresentation(project))
        },
        "\u270E"
      ),
      h7(
        "button",
        {
          title: t("wb.handoff"),
          disabled: !known,
          onClick: () => setHandoffDialog(true)
        },
        "\u2197"
      )
    ) : h7(
      import_react6.default.Fragment,
      null,
      h7(
        "div",
        { className: "linggo-brand" },
        h7(
          "div",
          { className: "linggo-brand-text" },
          h7("strong", null, "LingGo"),
          h7("small", null, t("wb.subtitle"))
        ),
        h7(
          "button",
          {
            title: t("ui.addProject"),
            "aria-label": t("ui.addProject"),
            onClick: () => setProjectDialog(true)
          },
          h7(Icon, { name: "plus", size: 16 })
        )
      ),
      h7(
        "div",
        { className: "linggo-project-picker" },
        state.projects.length ? h7(
          "select",
          {
            "aria-label": t("wb.project"),
            value: project,
            onChange: (e) => setProject(e.target.value)
          },
          ...state.projects.map(
            (p) => h7("option", { key: p.id, value: p.id }, p.name)
          )
        ) : h7("small", null, t("wb.noProject"))
      ),
      h7(
        "div",
        { className: "linggo-sidebar-body" },
        h7(
          SideSection,
          {
            id: "sessions",
            title: t("wb.sessions"),
            badge: history.length ? String(history.length) : "",
            icon: h7(Icon, { name: "message", size: 16 }),
            className: "linggo-session-section",
            open: sessionsOpen,
            onOpenChange: setSessionsOpen,
            actions: h7(
              import_react6.default.Fragment,
              null,
              h7(
                "button",
                {
                  title: t("ui.searchSessions"),
                  "aria-label": t("ui.searchSessions"),
                  onClick: () => {
                    if (!sessionsOpen || !searchOpen) {
                      setSessionsOpen(true);
                      setSearchOpen(true);
                    } else {
                      setSearchOpen(false);
                      setSessionSearch("");
                    }
                  }
                },
                h7(Icon, { name: "search", size: 15 })
              ),
              h7(
                "button",
                {
                  title: t("wb.newSession"),
                  "aria-label": t("wb.newSession"),
                  disabled: busy || !known,
                  onClick: () => run(async () => {
                    await newPresentation(project);
                    setSessionSearch("");
                    setSearchOpen(false);
                    setSessionsOpen(true);
                  })
                },
                h7(Icon, { name: "plus", size: 16 })
              )
            )
          },
          searchOpen && h7("input", {
            className: "linggo-inline-search",
            ref: searchInput,
            "aria-label": t("ui.searchSessions"),
            placeholder: t("ui.searchSessions"),
            value: sessionSearch,
            onChange: (e) => setSessionSearch(e.target.value)
          }),
          h7(
            "ul",
            { className: "linggo-sidebar-list", "aria-label": t("wb.sessions") },
            ...sessionRows
          ),
          visibleHistory.hiddenCount > 0 && h7("button", {
            type: "button",
            className: "linggo-show-more",
            onClick: () => setSessionLimit((n) => n + SIDEBAR_PAGE_SIZE)
          }, t("ui.showMore", { count: String(visibleHistory.hiddenCount) })),
          !filteredHistory.length && h7(
            "small",
            null,
            t(sessionSearch ? "ui.noSearchResults" : "wb.noSessions")
          )
        ),
        known && h7(DataSummary, {
          t,
          api,
          project,
          state,
          jobs,
          refresh,
          refreshJobs,
          run,
          busy,
          openImport: () => (setTab("import"), setView("map"))
        })
      ),
      h7(
        "div",
        { className: "linggo-sidebar-footer" },
        h7(
          "button",
          { disabled: !known, onClick: () => setHandoffDialog(true) },
          "\u2197 " + t("wb.handoff")
        ),
        h7(
          "a",
          {
            className: "linggo-btn",
            href: devUrl.href,
            target: "_blank",
            rel: "noopener"
          },
          t("wb.devWeb")
        ),
        params.get("desktopReturn") === "1" && h7(
          "a",
          { className: "linggo-btn", href: "dsh://open" },
          t("wb.devDesktop")
        )
      )
    )
  );
  const dialogs = h7(
    import_react6.default.Fragment,
    null,
    projectDialog && h7(
      Modal,
      {
        title: t("ui.addProject"),
        closeLabel: t("common.cancel"),
        onClose: () => setProjectDialog(false)
      },
      h7("input", {
        autoFocus: true,
        "aria-label": t("wb.newProjectName"),
        placeholder: t("wb.newProjectName"),
        maxLength: 100,
        value: name,
        onChange: (e) => setName(e.target.value)
      }),
      h7(
        "button",
        {
          className: "primary",
          disabled: busy || !name.trim(),
          onClick: () => run(async () => {
            const p = await api("createProject", { name });
            await refresh();
            setProject(p.id);
            await ensureProjectWorkspaces(p.id);
            setName("");
            setProjectDialog(false);
          })
        },
        t("wb.createProject")
      )
    ),
    handoffDialog && h7(
      Modal,
      {
        title: t("wb.handoff"),
        closeLabel: t("common.cancel"),
        onClose: () => setHandoffDialog(false)
      },
      h7("textarea", {
        autoFocus: true,
        "aria-label": t("wb.handoffSummary"),
        placeholder: t("wb.handoffPlaceholder"),
        maxLength: 4e3,
        value: summary,
        onChange: (e) => {
          setSummary(e.target.value);
          setPreview(false);
        }
      }),
      !preview ? h7(
        "button",
        {
          disabled: !summary.trim() || busy,
          onClick: () => setPreview(true)
        },
        t("wb.preview")
      ) : h7(
        "div",
        {
          className: "linggo-card",
          role: "region",
          "aria-label": t("wb.previewTitle")
        },
        h7("strong", null, t("wb.previewTitle")),
        h7("p", null, summary),
        h7(
          "small",
          null,
          selected?.name,
          h7("br"),
          ...contextLines(
            t,
            { context: { dataVersionId: currentVersion?.id } },
            state
          ).flatMap((line) => [line, h7("br")])
        ),
        h7("p", { className: "linggo-note" }, t("wb.previewNote")),
        h7(
          "button",
          {
            className: "primary",
            disabled: busy,
            onClick: () => run(async () => {
              await api("handoff", {
                projectId: project,
                summary,
                context: { dataVersionId: currentVersion?.id },
                sourceSessionId: currentProject === project ? current?.id : void 0
              });
              setSummary("");
              setPreview(false);
              setHandoffDialog(false);
              await refresh();
              return t("wb.handoffSaved");
            })
          },
          t("wb.confirm")
        )
      )
    )
  );
  const missing = currentVersion ? currentVersion.missing ?? [] : ["routes", "stops", "timetable", "ridership"];
  const empty = h7(
    "div",
    { className: "linggo-empty" },
    h7("h2", null, selected ? selected.name : t("wb.welcome")),
    h7("p", { className: "linggo-note" }, t("wb.mapNoData")),
    h7("ul", null, ...missing.map((k2) => h7("li", { key: k2 }, t("need." + k2)))),
    known && h7(
      "button",
      { className: "primary", onClick: () => setTab("import") },
      t("data.import")
    ),
    h7("small", null, t("wb.mapHint"))
  );
  const main = h7(
    "main",
    { "aria-label": t("wb.map") },
    h7(
      "nav",
      { className: "linggo-toolbar" },
      h7(
        "div",
        { className: "linggo-tabbar" },
        ...["map", "analysis"].map(
          (k2) => h7(
            "button",
            { key: k2, "aria-pressed": tab === k2, onClick: () => setTab(k2) },
            k2 === "analysis" && proposalCount ? t("tab.analysisCount", { n: String(proposalCount) }) : t("tab." + k2)
          )
        )
      ),
      h7("span", { className: "linggo-toolbar-spacer" }),
      ...["import", "settings"].map(
        (k2) => h7(
          "button",
          {
            key: k2,
            className: "quiet",
            disabled: k2 === "import" && !known,
            "aria-pressed": tab === k2,
            onClick: () => setTab(k2)
          },
          t("tab." + k2)
        )
      ),
      h7(
        "button",
        {
          className: "quiet",
          title: t("ui.maxMap"),
          "aria-label": t("ui.maxMap"),
          onClick: () => layout.setFocus(layout.focus === "map" ? "normal" : "map")
        },
        layout.focus === "map" ? "\u2199" : "\u2922"
      ),
      h7(
        "button",
        {
          className: "quiet",
          title: t("ui.resetLayout"),
          "aria-label": t("ui.resetLayout"),
          onClick: layout.reset
        },
        "\u21BA"
      )
    ),
    h7(
      "div",
      { className: "linggo-main-content " + (tab === "map" ? "map" : "") },
      tab === "import" && known ? h7(ImportWizard, {
        key: project,
        t,
        api,
        project,
        onCancel: () => setTab("map"),
        onDone: () => {
          setTab("map");
          refreshJobs();
        }
      }) : tab === "settings" ? h7(SettingsView, { t, api }) : tab === "analysis" && known ? h7(AnalysisView, {
        key: project,
        t,
        api,
        project,
        version: currentVersion,
        jobs,
        refreshJobs,
        run,
        busy,
        onShowRun: (id) => (setRunId(id), setTab("map"))
      }) : currentVersion ? h7(
        import_react6.default.Fragment,
        null,
        (missing.length > 0 || currentVersion.warnings?.length > 0) && h7(
          "details",
          { className: "linggo-quality" },
          h7(
            "summary",
            null,
            t("ui.quality", {
              missing: String(missing.length),
              warnings: String(
                currentVersion.warnings?.length ?? 0
              )
            })
          ),
          h7(
            "ul",
            null,
            missing.length > 0 && h7(
              "li",
              null,
              t("map.missing", {
                list: missing.map((k2) => t("need." + k2)).join("\u3001")
              })
            ),
            ...(currentVersion.warnings ?? []).map(
              (w2, i) => h7("li", { key: i }, w2)
            )
          )
        ),
        h7(MapView, {
          key: project + "/" + currentVersion.id,
          t,
          api,
          project,
          versionId: currentVersion.id,
          hasTrips: !!currentVersion.entities?.trips,
          runId,
          onRun: setRunId
        })
      ) : empty
    )
  );
  return h7(
    "div",
    { className: "linggo-root" },
    h7(
      "nav",
      { className: "linggo-tabs", "aria-label": "LingGo" },
      h7(
        "button",
        {
          "aria-pressed": view === "project",
          onClick: () => setView("project")
        },
        t("ui.projectPanel")
      ),
      h7(
        "button",
        { "aria-pressed": view === "map", onClick: () => setView("map") },
        t("tab.map")
      ),
      h7(
        "button",
        { "aria-pressed": view === "chat", onClick: () => setView("chat") },
        t("wb.tabChat")
      )
    ),
    h7(
      "section",
      { className: "linggo-workspace" },
      aside,
      h7(Splitter, { side: "left", layout, t }),
      main
    ),
    layout.focus === "normal" && h7(Splitter, { side: "right", layout, t }),
    !layout.prefs.chatOpen && layout.focus === "normal" && h7(
      "div",
      { className: "linggo-chat-rail" },
      h7(
        "button",
        {
          title: t("ui.toggleChat"),
          onClick: () => layout.update({ ...layout.prefs, chatOpen: true })
        },
        "\u2039"
      ),
      h7("span", null, t("wb.chat"))
    ),
    layout.focus !== "map" && layout.prefs.chatOpen && h7(
      "div",
      { className: "linggo-chat-controls" },
      h7(
        "button",
        {
          "aria-label": t("ui.maxChat"),
          onClick: () => layout.setFocus(layout.focus === "chat" ? "normal" : "chat")
        },
        layout.focus === "chat" ? "\u2199" : "\u2922"
      )
    ),
    dialogs,
    (error || loadError || note) && h7(
      "div",
      {
        className: "linggo-toast",
        role: error || loadError ? "alert" : "status"
      },
      error || loadError || note,
      h7("button", { onClick: clear }, "\xD7")
    ),
    blocked && (layout.focus !== "map" || layout.geometry.mobile) && (layout.prefs.chatOpen || layout.focus === "chat" || layout.geometry.mobile) && h7(
      "div",
      {
        className: "linggo-cover",
        role: "region",
        "aria-label": t("wb.chat")
      },
      h7(
        "div",
        null,
        h7("h2", null, t("cover.title")),
        h7(
          "p",
          { className: "linggo-note" },
          known ? t("cover.body") : t("cover.noProject")
        ),
        known && h7(
          "button",
          {
            className: "primary",
            disabled: busy,
            onClick: () => run(restore)
          },
          history[0] ? t("cover.restore") : t("wb.newSession")
        ),
        known && history[0] && h7(
          "button",
          {
            disabled: busy,
            onClick: () => run(() => newPresentation(project))
          },
          t("wb.newSession")
        )
      )
    )
  );
}
function PanelIcon({ size = 20 }) {
  return h7(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      "aria-hidden": true
    },
    h7("rect", { x: 4, y: 3.5, width: 16, height: 14, rx: 3 }),
    h7("path", { d: "M4 11h16M8 21l1.5-3.5M16 21l-1.5-3.5" }),
    h7("circle", { cx: 8.5, cy: 14.5, r: 0.8, fill: "currentColor" }),
    h7("circle", { cx: 15.5, cy: 14.5, r: 0.8, fill: "currentColor" })
  );
}
function DevPanel({ t, api, onReset, openHandoff, capabilities, useSessions }) {
  const { state, refresh, loadError } = useLinggoState(api, onReset);
  const { error, busy, note, run, clear } = useAsync(t);
  const [showArchived, setShowArchived] = (0, import_react6.useState)(false);
  const known = useSessions((s2) => s2.byId);
  const desktop = location.protocol !== "http:" && location.protocol !== "https:";
  const [launch, setLaunch] = (0, import_react6.useState)("");
  const webUrl = new URL(location.href);
  webUrl.hash = "linggo=1";
  const fetchLaunch = () => api("launch", { desktop: true }).then(
    (r2) => setLaunch(r2.url),
    () => setLaunch("")
  );
  (0, import_react6.useEffect)(() => {
    if (desktop) fetchLaunch();
  }, []);
  const projects = Object.fromEntries(state.projects.map((p) => [p.id, p]));
  const handoffs = state.handoffs.filter((x) => showArchived || !x.archivedAt).sort((a2, b2) => b2.createdAt.localeCompare(a2.createdAt));
  return h7(
    "div",
    { className: "linggo-root linggo-panel" },
    h7("h2", null, t("dev.title")),
    h7("p", { className: "linggo-note" }, t("dev.intro")),
    desktop ? h7(
      "a",
      {
        className: "linggo-btn",
        href: launch || void 0,
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-disabled": !launch,
        // Authenticated links are single-use; prepare the next one after each click.
        onClick: () => setTimeout(fetchLaunch, 500)
      },
      launch ? t("dev.openBrowser") : t("dev.connecting")
    ) : h7(
      "a",
      {
        className: "linggo-btn",
        href: webUrl.href,
        target: "_blank",
        rel: "noopener"
      },
      t("dev.openWeb")
    ),
    h7("h3", null, t("dev.projects", { count: String(state.projects.length) })),
    state.projects.length ? h7("small", null, state.projects.map((p) => p.name).join(" \xB7 ")) : h7("small", null, t("dev.noProjects")),
    h7(
      "h3",
      null,
      t("dev.inbox"),
      " ",
      h7(
        "label",
        { style: { fontWeight: 400 } },
        h7("input", {
          type: "checkbox",
          style: { width: "auto" },
          checked: showArchived,
          onChange: (e) => setShowArchived(e.target.checked)
        }),
        " ",
        t("dev.showArchived")
      )
    ),
    !handoffs.length && h7("small", null, t("dev.empty")),
    ...handoffs.map((item) => {
      const reuse = item.devSessionId && known[item.devSessionId];
      return h7(
        "article",
        { key: item.id, className: "linggo-card" },
        h7(
          "small",
          null,
          `${projects[item.projectId]?.name ?? item.projectId} \xB7 ${when(item.createdAt)}${item.archivedAt ? " \xB7 " + t("dev.archived") : ""}`
        ),
        h7(
          "p",
          { style: { whiteSpace: "pre-wrap", margin: "6px 0" } },
          item.summary
        ),
        h7("small", null, contextLines(t, item, state).join(" \xB7 ")),
        !capabilities.draftInitialization && h7("p", { className: "linggo-note" }, t("dev.manualDraft")),
        h7(
          "details",
          { open: !capabilities.draftInitialization },
          h7("summary", null, t("dev.handoffContent")),
          h7("textarea", {
            readOnly: true,
            "aria-label": t("dev.handoffContent"),
            value: draftPrompt(t, item, projects[item.projectId], state)
          }),
          h7(
            "button",
            {
              disabled: busy,
              onClick: () => run(async () => {
                await navigator.clipboard.writeText(
                  draftPrompt(t, item, projects[item.projectId], state)
                );
                return t("dev.copied");
              })
            },
            t("dev.copyDraft")
          )
        ),
        h7(
          "div",
          { style: { marginTop: 8 } },
          h7(
            "button",
            {
              className: "primary",
              disabled: busy,
              onClick: () => run(async () => {
                const outcome = await openHandoff(
                  item,
                  projects[item.projectId],
                  state
                );
                await refresh();
                return outcome === "manual" ? t("dev.manualOpened") : outcome === "preserved" ? t("dev.preserved") : t("dev.drafted");
              })
            },
            reuse ? t("dev.reopen") : t(
              capabilities.draftInitialization ? "dev.open" : "dev.openManual"
            )
          ),
          !item.archivedAt && h7(
            "button",
            {
              disabled: busy,
              onClick: () => run(async () => {
                await api("handoffArchive", { id: item.id });
                await refresh();
              })
            },
            t("dev.archive")
          )
        )
      );
    }),
    (error || loadError) && h7("p", { className: "linggo-error", role: "alert" }, error || loadError),
    note && h7("p", { className: "linggo-note", role: "status" }, note)
  );
}
function isWorkbenchLocation(loc = location) {
  return new URLSearchParams(loc.hash.slice(1)).get("linggo") === "1" || new URLSearchParams(loc.search).get("linggo") === "1";
}
function apply(ctx) {
  const enabled = isWorkbenchLocation();
  ctx.effect(() => ctx.locale.register(NS, { zh, en }));
  const t = ctx.locale.bind(NS);
  const api = async (operation, payload) => {
    const r2 = await ctx.connection.rpc.call(
      "/api",
      `linggo.${operation}`,
      payload
    );
    if (!r2.ok) throw Error(r2.error.message);
    return r2.value;
  };
  const resets = /* @__PURE__ */ new Set();
  ctx.on("connection/reset", () => resets.forEach((fn) => fn()));
  const onReset = (fn) => {
    resets.add(fn);
    return () => resets.delete(fn);
  };
  const adapter = createClientAdapter(ctx, { api, t });
  const { openSession, newPresentation, capabilities } = adapter;
  const openHandoff = (item, project, state) => adapter.openHandoff(item, project, draftPrompt(t, item, project, state));
  ctx.effect(() => installPresentationStyle(document, style, enabled));
  if (enabled) {
    adapter.mountWorkbench(
      {
        t,
        api,
        onReset,
        newPresentation,
        openSession,
        ensureProjectWorkspaces: adapter.ensureProjectWorkspaces
      },
      Workbench
    );
  } else {
    adapter.mountDevelopment(
      { t, api, onReset, openHandoff, capabilities },
      DevPanel,
      PanelIcon
    );
  }
}
return module.exports;}});
