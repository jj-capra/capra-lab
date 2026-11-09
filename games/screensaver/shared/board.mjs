// Screensaver's boards (JC, Nov 8 2026): a box bounces like an old screensaver, pauses, and you
// guess which corner it will hit dead on. Pure and shared, so every phone and the server build the
// same boards from the same seed (the daily run is the same for everyone).
//
// The board is free cells on a grid; the box is one cell and moves one cell diagonally a step.
// A wall stops it across (it flips left/right) or down (it flips up/down); blocked both ways at
// once is a perfect corner, and the round ends there. Later boards are rooms joined at their
// corners, with a gap just wide enough for the box to slip through.

export const GUESS_MS = 25000;
export const LIVES = 3;
export const MAX_LEVEL = 40;

/* ---------- seeded randomness ---------- */
export function hash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
// Fisher-Yates with the seeded rng (never sort() with a random comparator: Safari and Chrome sort
// differently, and every phone has to build the same board the server scores).
function shuffle(r, a) { const o = a.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; }
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

/* ---------- the field ---------- */
export function field(rooms) {
  const W = Math.max(...rooms.map(([x, , w]) => x + w)), H = Math.max(...rooms.map(([, y, , h]) => y + h));
  const free = new Uint8Array(W * H);
  for (const [x, y, w, h] of rooms) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) free[j * W + i] = 1;
  const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && free[y * W + x] === 1;
  return { W, H, rooms, ok };
}

// Every corner pocket the box can sit snug in: blocked across and down at once, facing (dx, dy).
export function pockets(f) {
  const out = [];
  for (let y = 0; y < f.H; y++) for (let x = 0; x < f.W; x++) {
    if (!f.ok(x, y)) continue;
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
      if (!f.ok(x + dx, y) && !f.ok(x, y + dy)) out.push({ x, y, dx, dy });
    }
  }
  return out.map((p, i) => ({ ...p, id: i }));
}

// One step: move diagonally, flipping on walls. Returns the new state and what happened.
export function step(f, s) {
  let { x, y, vx, vy } = s;
  for (let tries = 0; tries < 4; tries++) {
    const cx = f.ok(x + vx, y), cy = f.ok(x, y + vy);
    if (!cx && !cy) return { x, y, vx, vy, corner: true };
    if (!cx) { vx = -vx; continue; }
    if (!cy) { vy = -vy; continue; }
    if (!f.ok(x + vx, y + vy)) { vx = -vx; vy = -vy; continue; }   // the tip of a wall: straight back
    return { x: x + vx, y: y + vy, vx, vy, bounced: vx !== s.vx || vy !== s.vy };
  }
  return { x, y, vx, vy, corner: true };
}

// Run from a start until a perfect corner (or give up). path[i] is the box after i steps;
// bounces lists the steps where it changed direction.
export function run(f, start, maxSteps = 6000) {
  const path = [start], bounces = [];
  let s = start;
  const seen = new Set();
  for (let i = 0; i < maxSteps; i++) {
    const key = `${s.x},${s.y},${s.vx},${s.vy}`;
    if (seen.has(key)) return null;          // a loop that never finds a corner
    seen.add(key);
    const n = step(f, s);
    if (n.corner) return { path, bounces, hit: { x: s.x, y: s.y, dx: n.vx, dy: n.vy } };
    if (n.bounced) bounces.push(i + 1);
    s = { x: n.x, y: n.y, vx: n.vx, vy: n.vy };
    path.push(s);
  }
  return null;
}

/* ---------- how hard a level is ---------- */
export function plan(n) {
  const size = Math.min(28, 5 + Math.round(n * 1.1));
  return {
    size,
    rooms: n >= 16 ? 4 : n >= 11 ? 3 : n >= 6 ? 2 : 1,
    rem: Math.min(6, Math.floor((n - 1) / 2)),          // bounces left after the pause
    pre: Math.min(3, Math.floor(n / 4)),                 // most bounces shown before it
  };
}

// Rooms joined at their corners: each new room hangs off a corner of the last, overlapping it by
// a small square the box can slip through, and touches nothing else.
function layout(r, p) {
  if (p.rooms === 1) {
    const w = p.size + int(r, -1, 2), h = p.size + int(r, -2, 1);
    return [[0, 0, Math.max(4, w), Math.max(4, h)]];
  }
  for (let tries = 0; tries < 60; tries++) {
    const side = Math.max(5, Math.round(p.size * (p.rooms === 2 ? 0.62 : p.rooms === 3 ? 0.5 : 0.44)));
    const rooms = [[0, 0, side + int(r, -1, 1), side + int(r, -1, 1)]];
    let okLayout = true;
    for (let k = 1; k < p.rooms && okLayout; k++) {
      const [px, py, pw, ph] = rooms[k - 1];
      const w = side + int(r, -1, 2), h = side + int(r, -1, 2), lap = 2;
      const dirs = shuffle(r, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      let placed = null;
      for (const [dx, dy] of dirs) {
        const x = dx > 0 ? px + pw - lap : px - w + lap;
        const y = dy > 0 ? py + ph - lap : py - h + lap;
        const cand = [x, y, w, h];
        const clash = rooms.some((q, qi) => qi !== k - 1 && overlap(q, cand, 1));
        if (!clash) { placed = cand; break; }
      }
      if (!placed) okLayout = false; else rooms.push(placed);
    }
    if (!okLayout) continue;
    const mx = Math.min(...rooms.map((q) => q[0])), my = Math.min(...rooms.map((q) => q[1]));
    return rooms.map(([x, y, w, h]) => [x - mx, y - my, w, h]);
  }
  return [[0, 0, p.size, p.size]];
}
const overlap = (a, b, pad = 0) => a[0] < b[0] + b[2] + pad && b[0] < a[0] + a[2] + pad && a[1] < b[1] + b[3] + pad && b[1] < a[1] + a[3] + pad;

// Level n of a seed: the board, the stretch shown before the pause, the rest, and the answer.
export function level(seed, n) {
  const r = rng(hash(`${seed}:${n}`));
  const p = plan(n);
  for (let attempt = 0; attempt < 400; attempt++) {
    const want = { ...p, rem: Math.max(0, p.rem - Math.floor(attempt / 80)) };
    const rooms = layout(r, want);
    const f = field(rooms);
    const cells = [];
    for (let y = 0; y < f.H; y++) for (let x = 0; x < f.W; x++) if (f.ok(x, y)) cells.push([x, y]);
    const [sx, sy] = pick(r, cells);
    const res = run(f, { x: sx, y: sy, vx: pick(r, [-1, 1]), vy: pick(r, [-1, 1]) });
    if (!res) continue;
    // bounces in [S, P] are shown, bounces in (P, T) are left to work out
    const T = res.path.length - 1, B = res.bounces;
    const rem = Math.min(want.rem + (want.rem > 0 && r() < 0.35 ? 1 : 0), B.length);
    if (rem < want.rem) continue;
    const k = B.length - rem;                       // B[k] is the first bounce left (B[k] = T when none)
    const pre = Math.min(int(r, 0, want.pre), k);   // bounces shown before the pause
    const lastShown = k > 0 ? B[k - 1] : 0, next = k < B.length ? B[k] : T;
    const lo = lastShown + 2, hi = next - 2;        // pause off the walls, mid-flight
    if (hi < lo) continue;
    const P = int(r, lo, hi);
    // start a few steps before the first bounce shown (or before the pause when none is)
    const floor = k - pre - 1 >= 0 ? B[k - pre - 1] + 1 : 0;
    const anchor = pre > 0 ? B[k - pre] : P;
    const S = Math.max(floor, anchor - int(r, pre > 0 ? 3 : 4, pre > 0 ? 7 : 9));
    if (P - S < 3) continue;
    const pk = pockets(f);
    const answer = pk.find((q) => q.x === res.hit.x && q.y === res.hit.y && q.dx === res.hit.dx && q.dy === res.hit.dy);
    if (!answer || pk.length < 4) continue;
    return { n, seed, W: f.W, H: f.H, rooms, path: res.path.slice(S), pause: P - S, pockets: pk, answer: answer.id, shown: B.filter((b) => b > S && b <= P).length, left: B.filter((b) => b > P).length };
  }
  // a plain square that always works: from (0, 1) heading down-right on an odd board hits a corner
  return level(seed + '!', Math.max(1, n - 1));
}

/* ---------- scoring ---------- */
export function points(n, ms) {
  const left = Math.max(0, GUESS_MS - Math.max(0, ms));
  return 100 + 20 * (n - 1) + Math.round(100 * left / GUESS_MS);
}
// A whole run from its guesses: [{ c: pocket id or -1, ms }]. Stops at the third miss.
export function score(seed, picks) {
  let total = 0, lives = LIVES, n = 0, right = 0;
  for (const g of picks.slice(0, MAX_LEVEL)) {
    n++;
    const lv = level(seed, n);
    if (g && g.c === lv.answer) { total += points(n, Number(g.ms) || 0); right++; }
    else if (--lives <= 0) break;
  }
  return { score: total, level: n, right, over: lives <= 0 };
}
