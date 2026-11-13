// Puzzled Spin: the puzzle maker and the rules, with no page in sight so they can be tested.
//
// A grid of square tiles. Every tile edge carries a pattern, and where two tiles touch their edges must
// match. The tiles sit in the right places but start turned the wrong way; spin them until the whole
// grid locks (JC's spec, Nov 12 2026). The picture never matters, only the edges.
//
// Edges, in a tile's own clockwise order: 0 top, 1 right, 2 bottom, 3 left.
// A pattern is a number (the same whichever way you look at it), or for the dual-tone tiers a pair
// "a.b": two halves, listed clockwise. Two touching edges run in opposite clockwise directions, so a
// pair matches its mirror: "a.b" on one tile meets "b.a" on the other.

export const PER_RUN = 5;

export const TIERS = [
  { id: 1, name: 'Early Spatial Learners', short: 'K–1', grades: 'K–1', n: 2, time: 60, kind: 'solid', types: [3, 4], scramble: 'some', lineBonus: 0, streak: false },
  { id: 2, name: 'Developing Spatial Thinkers', short: '2–3', grades: '2nd–3rd', n: 3, time: 45, kind: 'pattern', types: [5, 6], scramble: 'all', lineBonus: 5, streak: false },
  { id: 3, name: 'Middle School', short: '6–8', grades: '6–8', n: 4, time: 40, kind: 'duo', types: [8, 10], scramble: 'all', lineBonus: 0, streak: true },
  { id: 4, name: 'High School', short: '9–12', grades: '9–12', n: 5, time: 50, kind: 'twin', types: [12, 14], scramble: 'all', lineBonus: 3, streak: true },
];
export const tierOf = (id) => TIERS.find((t) => t.id === id) || TIERS[0];

// How many patterns each kind can draw from (the page knows what they look like).
export const SOLID = 4;          // red circle, blue square, yellow star, green triangle
export const PATTERN = 8;        // four colors, each in two line patterns
export const HALVES = { duo: 5, twin: 6 };

/* ---------- random numbers, seeded so a day's puzzles are the same on every phone ---------- */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const int = (random, lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
function shuffle(items, random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- edges ---------- */
export const mirror = (e) => (typeof e === 'string' ? e.split('.').reverse().join('.') : e);
// What a tile shows on side s when it's turned q quarter turns clockwise.
export const shown = (tile, q, s) => tile[((s - q) % 4 + 4) % 4];
// Do these two edges lock together? (a on one tile, b on the tile it touches)
export const fits = (a, b) => a === mirror(b);

// The pattern set for one puzzle.
function pickTypes(tier, random) {
  const k = int(random, tier.types[0], tier.types[1]);
  if (tier.kind === 'solid') return shuffle([...Array(SOLID).keys()], random).slice(0, k);
  if (tier.kind === 'pattern') {
    // look-alikes on purpose: both patterns of a color go in together where they can
    const colors = shuffle([0, 1, 2, 3], random);
    const out = [];
    for (const c of colors) { out.push(c * 2, c * 2 + 1); }
    return out.slice(0, k);
  }
  const h = HALVES[tier.kind];
  const pairs = [];
  for (let a = 0; a < h; a++) for (let b = 0; b < h; b++) if (a !== b) pairs.push(`${a}.${b}`);
  const all = shuffle(pairs, random);
  if (tier.kind === 'duo') return all.slice(0, k);
  // twin: mirror-image twins on purpose, so a tile turned the wrong way looks right at a glance
  const out = [];
  for (const p of all) {
    if (out.length >= k) break;
    if (out.includes(p)) continue;
    out.push(p);
    const m = mirror(p);
    if (out.length < k && out.length < 8 && !out.includes(m)) out.push(m);
  }
  return out;
}

// A solved grid: tiles[r][c] = [top, right, bottom, left] in the tile's own clockwise order.
export function solved(tier, random) {
  const n = tier.n;
  const types = pickTypes(tier, random);
  const deal = shuffle(types, random);
  let d = 0;
  const any = () => (d < deal.length ? deal[d++] : types[Math.floor(random() * types.length)]);
  // horizontal edges read left to right, vertical edges top to bottom; inner edges first so every
  // pattern shows up somewhere tiles meet
  const H = Array.from({ length: n + 1 }, () => Array(n));
  const V = Array.from({ length: n }, () => Array(n + 1));
  const inner = [], outer = [];
  for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) (r > 0 && r < n ? inner : outer).push(['H', r, c]);
  for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) (c > 0 && c < n ? inner : outer).push(['V', r, c]);
  for (const [k, r, c] of [...shuffle(inner, random), ...shuffle(outer, random)]) (k === 'H' ? H : V)[r][c] = any();
  const tiles = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) row.push([H[r][c], V[r][c + 1], mirror(H[r + 1][c]), mirror(V[r][c])]);
    tiles.push(row);
  }
  return { n, types, tiles };
}

/* ---------- checking a grid ---------- */
// For turns q[r][c]: which inner sides fit, which tiles are locked (every inner side fits), which
// rows and columns are locked, and whether the whole grid is done.
export function check(p, q) {
  const n = p.n;
  const side = Array.from({ length: n }, () => Array.from({ length: n }, () => [null, null, null, null]));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const t = p.tiles[r][c], a = q[r][c];
    if (c + 1 < n) {
      const ok = fits(shown(t, a, 1), shown(p.tiles[r][c + 1], q[r][c + 1], 3));
      side[r][c][1] = ok; side[r][c + 1][3] = ok;
    }
    if (r + 1 < n) {
      const ok = fits(shown(t, a, 2), shown(p.tiles[r + 1][c], q[r + 1][c], 0));
      side[r][c][2] = ok; side[r + 1][c][0] = ok;
    }
  }
  const locked = side.map((row) => row.map((s) => s.every((x) => x !== false)));
  const rows = locked.map((row) => row.every(Boolean));
  const cols = [...Array(n).keys()].map((c) => locked.every((row) => row[c]));
  return { side, locked, rows, cols, done: rows.every(Boolean) };
}

// Turns that leave a tile looking exactly the same (a tile of four identical edges can't be wrong).
export function looksSame(tile, turn) {
  return [0, 1, 2, 3].every((s) => shown(tile, turn, s) === tile[s]);
}

// Tiles that fit all but one of their inner sides when turned wrong: the "false friends".
export function falseFriends(p) {
  const n = p.n, zero = p.tiles.map((row) => row.map(() => 0));
  let count = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const inner = [r > 0, c < n - 1, r < n - 1, c > 0].filter(Boolean).length;
    if (inner < 3) continue;
    for (const t of [1, 2, 3]) {
      if (looksSame(p.tiles[r][c], t)) continue;
      const q = zero.map((row) => row.slice());
      q[r][c] = t;
      const fit = check(p, q).side[r][c].filter((x) => x === true).length;
      if (fit === inner - 1) { count++; break; }
    }
  }
  return count;
}

/* ---------- a whole puzzle ---------- */
// The solved grid plus the starting turns. K–1 turns one or two tiles; the rest turn every tile.
export function puzzle(tierId, seed) {
  const tier = tierOf(tierId);
  const random = rng(seed);
  // middle school and up: keep the version with the most false friends out of a few tries
  let p = solved(tier, random);
  if (tier.streak) {
    let best = falseFriends(p);
    for (let i = 0; i < 5; i++) {
      const next = solved(tier, random);
      const f = falseFriends(next);
      if (f > best) { p = next; best = f; }
    }
  }
  const n = tier.n;
  for (let tries = 0; tries < 50; tries++) {
    const q = p.tiles.map((row) => row.map(() => 0));
    const cells = shuffle([...Array(n * n).keys()], random);
    const spin = tier.scramble === 'some' ? cells.slice(0, int(random, 1, 2)) : cells;
    for (const i of spin) {
      const r = Math.floor(i / n), c = i % n;
      const ways = shuffle([1, 2, 3], random).filter((t) => !looksSame(p.tiles[r][c], t));
      if (ways.length) q[r][c] = ways[0];
    }
    if (!check(p, q).done) return { ...p, tier: tier.id, start: q, time: tier.time };
  }
  // every tile looked the same however it turned: make a fresh one
  return puzzle(tierId, hash(String(seed) + 'again'));
}

/* ---------- days ---------- */
export const FIRST_DAY = '2026-11-12';
export function labDay(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function dayNumber(day = labDay()) {
  return Math.round((Date.parse(day + 'T12:00:00Z') - Date.parse(FIRST_DAY + 'T12:00:00Z')) / 86400000) + 1;
}
// Today's five for a tier: the same for everyone.
export const dailySeed = (tierId, no, i) => hash(`ps:${tierId}:${no}:${i}`);

/* ---------- points ---------- */
// A locked tile is worth 10, times the Spin Streak (middle school and up: locks within 2.5 seconds of
// each other build the streak, up to x5). A solved grid pays 100 plus 5 a second left, times the combo
// (each fast solve, with at least half the clock left, adds x0.5, up to x3).
export const STREAK_GAP = 2500;
export const streakMult = (tier, streak) => (tierOf(tier).streak ? Math.min(5, Math.max(1, streak)) : 1);
export const solvePoints = (secondsLeft, combo) => Math.round((100 + 5 * Math.max(0, Math.ceil(secondsLeft))) * Math.min(3, 1 + 0.5 * Math.max(0, combo)));
export const isFast = (secondsLeft, time) => secondsLeft >= time / 2;
