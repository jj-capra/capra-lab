// Small deterministic helpers. Boards are built from a seed so a Challenge
// replays the exact same board (same specials, same option order, same 50/50).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash32(...parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= 0x2f; h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(len, cryptoObj = globalThis.crypto) {
  const bytes = new Uint8Array(len);
  cryptoObj.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += CODE_CHARS[b % CODE_CHARS.length];
  return out;
}

export function randomHex(bytes = 24, cryptoObj = globalThis.crypto) {
  const b = new Uint8Array(bytes);
  cryptoObj.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function randomSeed(cryptoObj = globalThis.crypto) {
  const b = new Uint32Array(1);
  cryptoObj.getRandomValues(b);
  return b[0] >>> 0;
}
