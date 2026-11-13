// Puzzled Spin: the art maker, the puzzle maker and the rules, with no page in sight so they can be tested.
//
// Every puzzle is a comic-style art piece with mirror symmetry, cut into square tiles. The tiles sit in
// the right places but some are turned the wrong way; spin them until the picture is whole (JC, Nov 12
// 2026: "Start with simple two-color mirrored patterns and work to kaleidoscopes. Gradually building
// from basic to masterpiece. Make it look like a comic art piece. This is a hands on game of spinning
// and selecting until they complete the pattern.").
//
// The art lives on a board n units wide (one unit per tile, (0,0) top left). It's a stack of layers;
// each layer is a color and some parts (circles, rings, polygons). The same parts draw the SVG and
// answer "what color is here?", which is how a tile knows which turns leave it looking the same.

export const PER_RUN = 5;

// A run is five puzzles that climb the art ladder: [level, grid size, tiles turned ('all' = every tile
// that can look wrong)]. K–1 and 2nd–3rd see the goal picture and a glow on every tile that's right;
// middle and high school have only the picture's own symmetry, and a peek that costs time.
export const TIERS = [
  { id: 1, name: 'Early Spatial Learners', short: 'K–1', grades: 'K–1', baseTime: 60, perTile: 0, glow: true, goal: true, peek: false, lineBonus: 0,
    stages: [[1, 2, 1], [2, 2, 2], [3, 2, 2], [4, 2, 3], [5, 3, 4]] },
  { id: 2, name: 'Developing Spatial Thinkers', short: '2–3', grades: '2nd–3rd', baseTime: 45, perTile: 4, glow: true, goal: true, peek: false, lineBonus: 5,
    stages: [[3, 3, 4], [4, 3, 6], [5, 3, 'all'], [6, 3, 'all'], [7, 4, 'all']] },
  { id: 3, name: 'Middle School', short: '6–8', grades: '6–8', baseTime: 40, perTile: 4, glow: false, goal: false, peek: true, lineBonus: 0,
    stages: [[5, 4, 'all'], [6, 4, 'all'], [7, 4, 'all'], [8, 4, 'all'], [9, 5, 'all']] },
  { id: 4, name: 'High School', short: '9–12', grades: '9–12', baseTime: 45, perTile: 3.5, glow: false, goal: false, peek: true, lineBonus: 0,
    stages: [[7, 4, 'all'], [8, 5, 'all'], [9, 5, 'all'], [10, 5, 'all'], [11, 6, 'all']] },
];
export const tierOf = (id) => TIERS.find((t) => t.id === id) || TIERS[0];

// The art ladder: what each level is called on the board and how many colors it uses.
export const LEVELS = {
  1: { name: 'Two-Tone', colors: 2 },
  2: { name: 'Twin Shapes', colors: 2 },
  3: { name: 'Ripples', colors: 2 },
  4: { name: 'Triple Treat', colors: 3 },
  5: { name: 'Kaleidoscope', colors: 3 },
  6: { name: 'Star Bloom', colors: 3 },
  7: { name: 'Flower Burst', colors: 4 },
  8: { name: 'Sunburst', colors: 4 },
  9: { name: 'Pop Mandala', colors: 5 },
  10: { name: 'Grand Mandala', colors: 5 },
  11: { name: 'Masterpiece', colors: 6 },
};

export const INK = '#120E18';
export const POP = {
  cream: '#FFF4DC', yellow: '#FFD23F', red: '#FF3B3B', blue: '#2D6BFF', cyan: '#29D3F0',
  magenta: '#FF3D8B', green: '#3DDC84', orange: '#FF8A3D', purple: '#8C5CFF',
};
// Two-color pairs that pop like a comic panel (background first).
const PAIRS = [['yellow', 'blue'], ['cream', 'red'], ['cyan', 'magenta'], ['orange', 'purple'], ['yellow', 'red'], ['cream', 'blue'], ['green', 'purple'], ['magenta', 'yellow']];

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
const pickOne = (list, random) => list[Math.floor(random() * list.length)];
function shuffle(items, random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- shapes (board units, around the center) ---------- */
const TAU = Math.PI * 2;
const circle = (cx, cy, r) => ({ kind: 'circle', cx, cy, r });
const ring = (cx, cy, r1, r2) => ({ kind: 'ring', cx, cy, r1, r2 });
const poly = (pts) => ({ kind: 'poly', pts });
const at = (C, r, a) => [C + r * Math.sin(a), C - r * Math.cos(a)]; // angle 0 points up, clockwise
function regular(C, k, r, phase = 0) { return poly([...Array(k).keys()].map((i) => at(C, r, phase + (TAU * i) / k))); }
function star(C, k, rOut, rIn, phase = 0) {
  return poly([...Array(2 * k).keys()].map((i) => at(C, i % 2 ? rIn : rOut, phase + (Math.PI * i) / k)));
}
function petal(C, a, rIn, rOut, w) {
  const pts = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) { const t = i / steps; const r = rIn + t * (rOut - rIn); pts.push(at(C, r, a + w * Math.sin(Math.PI * t) * (1 - 0.35 * t))); }
  for (let i = steps - 1; i > 0; i--) { const t = i / steps; const r = rIn + t * (rOut - rIn); pts.push(at(C, r, a - w * Math.sin(Math.PI * t) * (1 - 0.35 * t))); }
  return poly(pts);
}
const petals = (C, k, rIn, rOut, w, phase = 0) => [...Array(k).keys()].map((i) => petal(C, phase + (TAU * i) / k, rIn, rOut, w));
function heart(C, s) {
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const t = (TAU * i) / 48;
    const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push([C + (x / 17) * s, C - (y / 17) * s + s * 0.12]);
  }
  return poly(pts);
}
function cross(C, s, w) {
  return poly([[C - w, C - s], [C + w, C - s], [C + w, C - w], [C + s, C - w], [C + s, C + w], [C + w, C + w], [C + w, C + s], [C - w, C + s], [C - w, C + w], [C - s, C + w], [C - s, C - w], [C - w, C - w]]);
}
function rays(C, k, R, phase = 0) {
  const out = [];
  for (let i = 0; i < k; i += 2) out.push(poly([[C, C], at(C, R, phase + (TAU * i) / k), at(C, R, phase + (TAU * (i + 0.5)) / k), at(C, R, phase + (TAU * (i + 1)) / k)]));
  return out;
}
const corners = (n, r) => [circle(0, 0, r), circle(n, 0, r), circle(0, n, r), circle(n, n, r)];
function bigShape(kind, C, R) {
  if (kind === 'circle') return [circle(C, C, 0.74 * R)];
  if (kind === 'diamond') return [regular(C, 4, 0.86 * R)];
  if (kind === 'square') return [regular(C, 4, 0.78 * R, Math.PI / 4)];
  if (kind === 'heart') return [heart(C, 0.8 * R)];
  if (kind === 'star') return [star(C, 5, 0.86 * R, 0.4 * R)];
  return [cross(C, 0.8 * R, 0.3 * R)];
}

/* ---------- the art ladder ---------- */
// Pick k colors: a two-color pair first, then the rest of the comic palette.
function palette(k, random) {
  const pair = pickOne(PAIRS, random);
  const rest = shuffle(Object.keys(POP).filter((c) => !pair.includes(c)), random);
  return [...pair, ...rest].slice(0, k).map((c) => POP[c]);
}

export function makeArt(level, n, random) {
  const C = n / 2, R = n / 2;
  const L = Math.max(1, Math.min(11, level));
  const col = palette(LEVELS[L].colors, random);
  const layers = [];
  const add = (color, parts, ht = false) => layers.push({ color, parts, ht });
  let bgRays = null;
  const shapes = ['circle', 'diamond', 'square', 'heart', 'star', 'cross'];
  if (L === 1) {
    add(1, bigShape(pickOne(shapes, random), C, R));
  } else if (L === 2) {
    const v = pickOne(['target', 'corners', 'diamonds'], random);
    if (v === 'target') { add(1, [ring(C, C, 0.5 * R, 0.86 * R)]); add(1, [circle(C, C, 0.28 * R)]); }
    else if (v === 'corners') { add(1, corners(n, 0.42 * R)); add(1, bigShape(pickOne(['heart', 'star', 'circle', 'diamond'], random), C, 0.82 * R)); }
    else { add(1, [regular(C, 4, 0.92 * R)]); add(0, [regular(C, 4, 0.62 * R)]); add(1, [regular(C, 4, 0.32 * R)]); }
  } else if (L === 3) {
    const sq = random() < 0.5;
    const bands = [0.95, 0.72, 0.5, 0.28];
    bands.forEach((f, i) => add(i % 2 ? 0 : 1, [sq ? regular(C, 4, f * R) : circle(C, C, f * 0.86 * R)]));
    add(1, corners(n, 0.3 * R));
  } else if (L === 4) {
    add(2, corners(n, 0.4 * R), true);
    add(1, bigShape(pickOne(['circle', 'diamond', 'square'], random), C, R));
    add(2, bigShape(pickOne(['heart', 'star', 'cross'], random), C, 0.62 * R));
  } else if (L === 5) {
    const k = pickOne([4, 8], random);
    add(1, petals(C, k, 0.12 * R, 0.96 * R, k === 4 ? 0.62 : 0.34, k === 4 ? 0 : Math.PI / 8));
    add(2, corners(n, 0.34 * R), true);
    add(2, [circle(C, C, 0.3 * R)]);
    add(0, [circle(C, C, 0.13 * R)]);
  } else if (L === 6) {
    add(1, [star(C, 8, 0.96 * R, 0.46 * R)]);
    add(2, petals(C, 8, 0.2 * R, 0.66 * R, 0.24, Math.PI / 8));
    add(1, [circle(C, C, 0.22 * R)]);
    add(2, [circle(C, C, 0.1 * R)]);
  } else if (L === 7) {
    add(3, [ring(C, C, 0.84 * R, 0.98 * R)], true);
    add(1, petals(C, 8, 0.12 * R, 0.8 * R, 0.3));
    add(2, petals(C, 8, 0.12 * R, 0.5 * R, 0.22, Math.PI / 8));
    add(2, [...Array(8).keys()].map((i) => circle(...at(C, 0.91 * R, Math.PI / 8 + (TAU * i) / 8), 0.07 * R)));
    add(3, [circle(C, C, 0.2 * R)]);
    add(0, [circle(C, C, 0.09 * R)]);
  } else if (L === 8) {
    bgRays = 1;
    add(2, [circle(C, C, 0.8 * R)]);
    add(3, petals(C, 8, 0.1 * R, 0.76 * R, 0.3, Math.PI / 8));
    add(1, [star(C, 8, 0.56 * R, 0.26 * R)]);
    add(2, [circle(C, C, 0.18 * R)]);
    add(3, corners(n, 0.28 * R), true);
  } else if (L === 9) {
    bgRays = 1;
    add(4, corners(n, 0.42 * R), true);
    add(2, [ring(C, C, 0.78 * R, 0.94 * R)], true);
    add(3, petals(C, 8, 0.14 * R, 0.82 * R, 0.28));
    add(4, petals(C, 8, 0.14 * R, 0.6 * R, 0.2, Math.PI / 8));
    add(2, [star(C, 8, 0.42 * R, 0.22 * R, Math.PI / 8)]);
    add(0, [circle(C, C, 0.14 * R)]);
  } else if (L === 10) {
    bgRays = 1;
    add(3, [circle(C, C, 0.97 * R)], true);
    add(4, petals(C, 16, 0.3 * R, 0.95 * R, 0.13));
    add(2, petals(C, 8, 0.14 * R, 0.74 * R, 0.27, Math.PI / 8));
    add(1, [star(C, 8, 0.5 * R, 0.24 * R)]);
    add(4, [...Array(8).keys()].map((i) => circle(...at(C, 0.62 * R, (TAU * i) / 8), 0.06 * R)));
    add(0, [circle(C, C, 0.16 * R)]);
    add(3, [circle(C, C, 0.07 * R)]);
  } else {
    bgRays = 1;
    add(5, corners(n, 0.46 * R), true);
    add(2, [circle(C, C, 0.98 * R)], true);
    add(3, petals(C, 16, 0.4 * R, 0.96 * R, 0.12, Math.PI / 16));
    add(4, petals(C, 8, 0.2 * R, 0.86 * R, 0.24));
    add(5, petals(C, 8, 0.16 * R, 0.6 * R, 0.2, Math.PI / 8));
    add(1, [ring(C, C, 0.36 * R, 0.44 * R)]);
    add(3, [...Array(16).keys()].map((i) => circle(...at(C, 0.4 * R, (TAU * i) / 16), 0.04 * R)));
    add(1, [star(C, 8, 0.32 * R, 0.16 * R, Math.PI / 8)]);
    add(0, [circle(C, C, 0.11 * R)]);
  }
  // sunburst behind it all: color 1 rays on the background, like a comic splash panel
  if (bgRays) layers.unshift({ color: 1, parts: rays(C, 24, n * 1.5, Math.PI / 24), ht: false, rays: true });
  return { level: L, n, colors: col, layers, name: LEVELS[L].name };
}

/* ---------- what color is here? ---------- */
function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inPart(p, x, y) {
  if (p.kind === 'circle') return (x - p.cx) ** 2 + (y - p.cy) ** 2 <= p.r * p.r;
  if (p.kind === 'ring') { const d = (x - p.cx) ** 2 + (y - p.cy) ** 2; return d >= p.r1 * p.r1 && d <= p.r2 * p.r2; }
  return inPoly(p.pts, x, y);
}
// The color index showing at (x, y): the top layer that covers it, else the background (0).
export function colorAt(art, x, y) {
  for (let i = art.layers.length - 1; i >= 0; i--) {
    const l = art.layers[i];
    if (l.parts.some((p) => inPart(p, x, y))) return l.color;
  }
  return 0;
}

/* ---------- tiles ---------- */
const SAMPLES = 16;
// The turns (0–3, clockwise) that leave tile (r, c) looking exactly as it should.
export function sameTurns(art, r, c) {
  const pts = [];
  for (let i = 0; i < SAMPLES; i++) for (let j = 0; j < SAMPLES; j++) pts.push([(i + 0.5) / SAMPLES, (j + 0.5) / SAMPLES]);
  const look = (u, v) => colorAt(art, c + u, r + v);
  const base = pts.map(([u, v]) => look(u, v));
  const out = [0];
  for (const q of [1, 2, 3]) {
    // a point turned q quarter turns clockwise about the tile's center
    const ok = pts.every(([u, v], k) => {
      let a = u - 0.5, b = v - 0.5;
      for (let t = 0; t < q; t++) [a, b] = [-b, a];
      return look(a + 0.5, b + 0.5) === base[k];
    });
    if (ok) out.push(q);
  }
  return out;
}

/* ---------- a whole puzzle ---------- */
export function stageOf(tierId, i) {
  const t = tierOf(tierId);
  const [level, n, turn] = t.stages[Math.max(0, Math.min(t.stages.length - 1, i))];
  return { level, n, turn };
}
export function timeFor(tier, turned) {
  return tier.perTile ? Math.max(tier.baseTime, Math.round(20 + tier.perTile * turned)) : tier.baseTime;
}

export function puzzle(tierId, i, seed) {
  const tier = tierOf(tierId);
  const { level, n, turn } = stageOf(tierId, i);
  const random = rng(seed);
  for (let attempt = 0; attempt < 30; attempt++) {
    const art = makeArt(level, n, random);
    const same = [];
    for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(sameTurns(art, r, c)); same.push(row); }
    const movable = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (same[r][c].length < 4) movable.push([r, c]);
    const want = turn === 'all' ? movable.length : turn;
    if (movable.length < Math.max(1, want) || (turn === 'all' && movable.length < (n * n) / 2)) continue;
    const start = Array.from({ length: n }, () => Array(n).fill(0));
    for (const [r, c] of shuffle(movable, random).slice(0, want)) {
      const wrong = [1, 2, 3].filter((q) => !same[r][c].includes(q));
      start[r][c] = pickOne(wrong, random);
    }
    return { tier: tier.id, i, level, n, art, same, start, turned: want, time: timeFor(tier, want), name: art.name };
  }
  throw new Error(`no puzzle for tier ${tierId} stage ${i}`);
}

// Which tiles look right with turns q, which rows and columns are whole, and whether the picture is done.
export function check(p, q) {
  const ok = p.same.map((row, r) => row.map((s, c) => s.includes(((q[r][c] % 4) + 4) % 4)));
  const rows = ok.map((row) => row.every(Boolean));
  const cols = ok[0].map((_, c) => ok.every((row) => row[c]));
  return { ok, rows, cols, done: rows.every(Boolean) };
}

/* ---------- drawing ---------- */
const f = (x) => Math.round(x * 1000) / 1000;
function partSvg(p) {
  if (p.kind === 'circle') return `<circle cx="${f(p.cx)}" cy="${f(p.cy)}" r="${f(p.r)}"/>`;
  if (p.kind === 'ring') {
    const { cx, cy, r1, r2 } = p;
    return `<path fill-rule="evenodd" d="M${f(cx - r2)} ${f(cy)}a${f(r2)} ${f(r2)} 0 1 0 ${f(2 * r2)} 0a${f(r2)} ${f(r2)} 0 1 0 ${f(-2 * r2)} 0zM${f(cx - r1)} ${f(cy)}a${f(r1)} ${f(r1)} 0 1 0 ${f(2 * r1)} 0a${f(r1)} ${f(r1)} 0 1 0 ${f(-2 * r1)} 0z"/>`;
  }
  return `<polygon points="${p.pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>`;
}
// The halftone dot grid lines up with the tiles (a whole number of dots a tile), so turning a tile
// never shows in the dots.
export function halftoneStep(n) { return 1 / Math.max(2, Math.round(16 / n)); }
// One art piece as SVG: a <pattern> for its halftone and a <g id> the tiles show slices of.
export function artSvg(art, id) {
  const n = art.n, sw = f(0.0125 * n + 0.012), step = f(halftoneStep(n));
  let out = `<pattern id="${id}-ht" patternUnits="userSpaceOnUse" width="${step}" height="${step}"><circle cx="${f(step / 2)}" cy="${f(step / 2)}" r="${f(step * 0.26)}" fill="${INK}" opacity="0.28"/></pattern>`;
  out += `<g id="${id}"><rect width="${n}" height="${n}" fill="${art.colors[0]}"/><rect width="${n}" height="${n}" fill="url(#${id}-ht)" opacity="0.5"/>`;
  for (const l of art.layers) {
    const body = l.parts.map(partSvg).join('');
    out += `<g fill="${art.colors[l.color]}" stroke="${INK}" stroke-width="${l.rays ? f(sw * 0.6) : sw}" stroke-linejoin="round">${body}</g>`;
    if (l.ht) out += `<g fill="url(#${id}-ht)">${body}</g>`;
  }
  return out + '</g>';
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
export const dailySeed = (tierId, no, i) => hash(`ps2:${tierId}:${no}:${i}`);

/* ---------- points ---------- */
// A finished picture pays 100 plus 5 a second left, times the Spin Streak: each fast solve in a row
// (at least half the clock left) adds x0.5, up to x3. Younger tiers also get 10 for each tile they turn
// right the first time.
export const solvePoints = (secondsLeft, streak) => Math.round((100 + 5 * Math.max(0, Math.ceil(secondsLeft))) * Math.min(3, 1 + 0.5 * Math.max(0, streak)));
export const isFast = (secondsLeft, time) => secondsLeft >= time / 2;
export const PEEK_COST = 3;
