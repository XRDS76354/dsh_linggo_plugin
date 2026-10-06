import React, { useEffect, useRef, useState } from "react";
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

export function SideSection({
  id,
  title,
  badge,
  icon,
  actions,
  children,
  initial = false,
  className = "",
}) {
  const key = "linggo.section." + id;
  const [open, setOpen] = useState(
    () => readPreference(localStorage, key, initial) === true,
  );
  return h(
    "section",
    { className: `linggo-section ${open ? "open" : "closed"} ${className}` },
    h(
      "div",
      { className: "linggo-section-header" },
      h(
        "button",
        {
          className: "linggo-section-heading",
          "aria-expanded": open,
          onClick: () => {
            setOpen(!open);
            writePreference(localStorage, key, !open);
          },
        },
        h("span", {
          className: "linggo-chevron",
          "aria-hidden": "true",
        }, open ? "▾" : "▸"),
        icon || null,
        h("span", { className: "linggo-section-title" }, title),
        badge ? h("span", { className: "linggo-count" }, badge) : null,
      ),
      actions
        ? h("div", { className: "linggo-section-actions" }, actions)
        : null,
    ),
    open && h("div", { className: "linggo-section-body" }, children),
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
.linggo-sidebar-body{flex:1;min-height:0;overflow:auto;padding:0 10px 12px;scrollbar-gutter:stable;display:flex;flex-direction:column;gap:2px;}
.linggo-section{border-top:1px solid var(--c-line);}
.linggo-section:first-child{border-top:0;}
.linggo-section-header{display:flex;align-items:center;gap:2px;height:36px;padding:0 2px;margin-bottom:2px;border-radius:8px;}
.linggo-section-header:hover{background:var(--c-hover);}
.linggo-section-heading{flex:1;min-width:0;display:flex;align-items:center;gap:6px;height:36px;border:0!important;border-radius:0!important;background:transparent!important;padding:0 4px!important;margin:0!important;justify-content:flex-start!important;font-weight:500!important;font-size:14px!important;color:var(--c-text)!important;}
.linggo-section-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;}
.linggo-chevron{flex:none;width:14px;font-size:10px;color:var(--c-cap);opacity:0;transition:opacity .12s ease;}
.linggo-section-header:hover .linggo-chevron,.linggo-section-heading:focus-visible .linggo-chevron{opacity:1;}
.linggo-section.open .linggo-chevron{opacity:.7;}
.linggo-icon{flex:none;opacity:.85;}
.linggo-section-actions{flex:none;display:flex;align-items:center;gap:2px;}
.linggo-section-actions button{width:28px;height:28px;padding:0!important;margin:0!important;justify-content:center;border:0!important;background:transparent!important;color:var(--c-sub);border-radius:6px!important;}
.linggo-section-actions button:hover{background:var(--c-hover);color:var(--c-text);}
.linggo-section-heading:hover{background:transparent!important;color:var(--c-text)!important;}
.linggo-section-body{padding:0 4px 14px;display:grid;gap:2px;}
.linggo-count{font-size:11px;color:var(--c-cap);font-weight:400;background:transparent;border:0;padding:0 2px;line-height:1;flex:none;}
.linggo-chevron{display:inline-block;width:18px;color:var(--c-cap);font-size:11px;}
.linggo-section-heading>span:first-child{display:inline-flex;align-items:center;gap:4px;min-width:0;}

.linggo-session-section .linggo-section-body>input{height:32px;border-radius:8px;margin:0;}
.linggo-session-section .linggo-list{max-height:none;overflow:visible;display:grid;gap:2px;}
.linggo-session-section .linggo-list li{display:flex;align-items:center;gap:8px;padding:0 8px;height:32px;border-radius:8px;}
.linggo-session-section .linggo-list li[aria-current="true"]{background:color-mix(in srgb, var(--c-accent) 10%, transparent);border-left-color:var(--c-accent);font-weight:500;}
.linggo-session-section .linggo-list li:hover{background:var(--c-hover);}
.linggo-session-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px!important;font-weight:400;color:var(--c-text)!important;line-height:20px;}
.linggo-session-meta{flex:none;font-size:11px!important;color:var(--c-cap)!important;line-height:1;}
.linggo-session-meta .running{color:var(--c-accent);}
.linggo-session-date{padding:10px 8px 4px;color:var(--c-cap);font-size:11px;font-weight:500;list-style:none;}
.linggo-current-version{background:transparent;border:0;padding:6px 8px;border-radius:8px;margin:0;display:grid;gap:3px;}
.linggo-current-version strong{font-size:13px;font-weight:600;}
.linggo-current-version small{font-size:11px;color:var(--c-cap);}
.linggo-entities{display:grid;gap:3px;margin:6px 0 0;}
.linggo-entities>div{display:flex;justify-content:space-between;gap:8px;color:var(--c-sub);font-size:11px;}
.linggo-entities>div span:last-child{color:var(--c-text);font-variant-numeric:tabular-nums;}
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

