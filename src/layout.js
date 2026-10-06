export const DEFAULT_LAYOUT = Object.freeze({
  leftWidth: 272,
  chatWidth: 400,
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
      : DEFAULT_LAYOUT.leftWidth,
    chatWidth: Number.isFinite(value.chatWidth)
      ? clamp(value.chatWidth, 320, 760)
      : DEFAULT_LAYOUT.chatWidth,
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
  // Prefer a roomy map: compress sides before shrinking the center.
  // Absolute floor stays 400 so narrow desktops remain usable.
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
    Math.max(chatFloor, width - left - centerFloor - 16),
  );
  const chat = p.chatOpen ? Math.min(p.chatWidth, chatCeiling) : 40;
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
