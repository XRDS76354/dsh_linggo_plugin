import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  computeLayout,
  DEFAULT_LAYOUT,
  LAYOUT_KEY,
  normalizeLayout,
  readPreference,
  writePreference,
} from "./layout.js";
import { applyPresentationGeometry } from "./compat-client.js";
const h = React.createElement;

export function useWorkbenchLayout(view) {
  const [prefs, setPrefs] = useState(() =>
    normalizeLayout(readPreference(localStorage, LAYOUT_KEY, {})),
  );
  const [width, setWidth] = useState(() => window.innerWidth);
  const [focus, setFocus] = useState("normal");
  const geometry = computeLayout(width, prefs, focus);
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      setWidth(document.documentElement.clientWidth),
    );
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);
  useEffect(
    () =>
      applyPresentationGeometry(document, geometry, {
        view,
        focus: geometry.mobile ? "normal" : focus,
        chatOpen: geometry.mobile ? true : prefs.chatOpen,
      }),
    [width, prefs, focus, view],
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

export function Splitter({ side, layout, t }) {
  const { prefs, geometry, update } = layout;
  const drag = useRef(null),
    frame = useRef(null),
    latest = useRef(prefs);
  latest.current = prefs;
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  const end = (e) => {
    if (!drag.current) return;
    cancelAnimationFrame(frame.current);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    const pending = drag.current.pending;
    drag.current = null;
    if (pending !== undefined) change(pending);
    else update(latest.current);
  };
  const field = side === "left" ? "leftWidth" : "chatWidth";
  const open =
    side === "left" ? prefs.leftOpen && geometry.left > 48 : prefs.chatOpen;
  const change = (value, persist = true) => {
    const maximum =
      side === "left"
        ? Math.min(420, window.innerWidth - (prefs.chatOpen ? 320 : 40) - 416)
        : Math.min(
            760,
            window.innerWidth * 0.6,
            window.innerWidth - geometry.left - 416,
          );
    update(
      {
        ...latest.current,
        [field]: Math.max(
          side === "left" ? 220 : 320,
          Math.min(maximum, value),
        ),
      },
      persist,
    );
  };
  return h(
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
            prefs[field] +
              (e.key === "ArrowRight" ? 1 : -1) *
                (side === "left" ? 1 : -1) *
                (e.shiftKey ? 40 : 10),
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
          start: side === "left" ? geometry.left : geometry.chat,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      },
      onPointerMove: (e) => {
        if (!drag.current) return;
        const value =
          drag.current.start +
          (e.clientX - drag.current.x) * (side === "left" ? 1 : -1);
        drag.current.pending = value;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => change(value, false));
      },
      onPointerUp: end,
      onPointerCancel: end,
    },
    h(
      "button",
      {
        type: "button",
        className: "linggo-rail-toggle",
        title: t(open ? "ui.collapse" : "ui.expand"),
        "aria-label": t(side === "left" ? "ui.toggleLeft" : "ui.toggleChat"),
        onClick: () =>
          update({
            ...prefs,
            [side === "left" ? "leftOpen" : "chatOpen"]: !open,
          }),
      },
      side === "left" ? (open ? "‹" : "›") : open ? "›" : "‹",
    ),
  );
}

/** Plugin-owned preferences; never write the host's sidebar/layout keys. */
export function useSectionState(id, defaultOpen = false) {
  const key = "linggo.section." + id;
  const [open, setOpen] = useState(() => {
    const stored = readPreference(localStorage, key, defaultOpen);
    return typeof stored === "boolean" ? stored : defaultOpen;
  });
  const value = useRef(open);
  const update = useCallback((next) => {
    const resolved = typeof next === "function" ? next(value.current) : next;
    value.current = resolved === true;
    writePreference(localStorage, key, value.current);
    setOpen(value.current);
  }, [key]);
  return [open, update];
}

export function SideSection({
  id,
  title,
  badge,
  icon,
  actions,
  children,
  open,
  onOpenChange,
  collapsedSummary,
  className = "",
}) {
  const bodyId = `linggo-section-${id}-body`;
  return h(
    "section",
    {
      className: `linggo-section ${open ? "open" : "closed"} ${className}`,
      "data-section": id,
      "aria-label": title,
    },
    h(
      "div",
      { className: "linggo-section-header" },
      h(
        "button",
        {
          className: "linggo-section-heading",
          type: "button",
          "aria-label": title,
          "aria-expanded": open,
          "aria-controls": bodyId,
          onClick: () => onOpenChange(!open),
        },
        h("span", { className: "linggo-section-slot", "aria-hidden": "true" },
          h("span", { className: "linggo-section-symbol" }, icon),
          h("svg", {
            className: "linggo-chevron",
            width: 16, height: 16, viewBox: "0 0 24 24",
            fill: "none", stroke: "currentColor", strokeWidth: 2,
          }, h("path", { d: "m9 5 7 7-7 7" })),
        ),
        h("span", { className: "linggo-section-title" }, title),
        badge ? h("span", { className: "linggo-count" }, badge) : null,
      ),
      actions
        ? h("div", { className: "linggo-section-actions" }, actions)
        : null,
    ),
    !open && collapsedSummary,
    h("div", { id: bodyId, className: "linggo-section-body", hidden: !open },
      open ? children : null,
    ),
  );
}

export function Modal({ title, children, onClose, closeLabel }) {
  const ref = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (before?.isConnected) before.focus();
    };
  }, []);
  return h(
    "dialog",
    {
      ref,
      className: "linggo-modal linggo-root",
      "aria-label": title,
      onCancel: (e) => {
        e.preventDefault();
        onClose();
      },
      onKeyDown: (e) => e.stopPropagation(),
    },
    h(
      "header",
      null,
      h("h2", null, title),
      h("button", { onClick: onClose, "aria-label": closeLabel }, "×"),
    ),
    children,
  );
}

export const workbenchStyle = `
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
