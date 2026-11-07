// One emoji (any skin tone, flag, keycap or ZWJ sequence), or null. Shared by the server
// (reactions through the API) and the client (reactions over direct links).
const SHAPE = /^[\p{Extended_Pictographic}\p{Emoji_Component}‍️⃣\u{e0020}-\u{e007f}]{1,24}$/u;
const REAL = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;
// Reactions float across a shared work screen, so a few rude ones are left out.
const RUDE = ['🖕', '🍆', '🍑', '💦', '🔞'];
const TONES = /[\u{1f3fb}-\u{1f3ff}]/gu;

export function cleanEmoji(s) {
  if (typeof s !== 'string' || !SHAPE.test(s) || !REAL.test(s)) return null;
  const base = s.replace(TONES, '').replace(/️/g, '');
  if (RUDE.some(r => base.includes(r))) return null;
  return s;
}

// The four emoji buttons in a game come from the player's profile (JC, Nov 2026).
export const EMO_ROW = ['🔥', '😂', '💀', '👏'];
export function emoRow(list) {
  const out = [];
  for (const x of Array.isArray(list) ? list.slice(0, 12) : []) { const e = cleanEmoji(x); if (e && !out.includes(e) && out.length < 4) out.push(e); }
  for (const d of EMO_ROW) if (out.length < 4 && !out.includes(d)) out.push(d);
  return out;
}
