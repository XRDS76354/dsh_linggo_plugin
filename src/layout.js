export const DEFAULT_LAYOUT = Object.freeze({
  leftWidth: 264,
  chatWidth: 420,
  leftOpen: true,
  chatOpen: true,
});
export const LAYOUT_KEY = "linggo.layout.v1";
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function normalizeLayout(value = {}) {
  if (!value || typeof value !== "object") value = {};
  return {
    leftWidth: Number.isFinite(value.leftWidth)
      ? clamp(value.leftWidth, 220, 420)
      : 264,
    chatWidth: Number.isFinite(value.chatWidth)
      ? clamp(value.chatWidth, 320, 760)
      : 420,
    leftOpen: typeof value.leftOpen === "boolean" ? value.leftOpen : true,
    chatOpen: typeof value.chatOpen === "boolean" ? value.chatOpen : true,
  };
}
export function computeLayout(width, preferences, focus = "normal") {
  const p = normalizeLayout(preferences);
  const mobile = width < 900;
  if (mobile)
    return {
      mobile: true,
      left: width,
      chat: width,
      center: width,
      reserved: width,
    };
  if (focus === "chat")
    return { mobile: false, left: 0, chat: width, center: 0, reserved: 0 };
  if (focus === "map")
    return { mobile: false, left: 0, chat: 0, center: width, reserved: width };
  let left = p.leftOpen ? p.leftWidth : 48;
  const chatMin = p.chatOpen ? 320 : 40;
  if (width - left - chatMin - 16 < 400) left = 48;
  const chat = p.chatOpen
    ? Math.min(p.chatWidth, 760, width * 0.6, width - left - 416)
    : 40;
  const center = width - left - chat - 16;
  return { mobile: false, left, chat, center, reserved: width - chat - 8 };
}
export function readPreference(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writePreference(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private/limited storage: remain usable. */
  }
}
