// Color by Numbers: the levels and how a picture becomes spots to color. Pure (no page), so the tests
// can run it; the page hands in the region map (which part shows at each pixel, render.mjs partMap).
//
// One picture, four levels (JC: "my 1st grade daughter all the way up to adults"):
//   Crayon (K-1st): the picture's big shapes, at most 8 colors, tiny bits colored already.
//   Marker (2nd-4th): plus cheeks, spots, stripes and the little details, up to 12 colors.
//   Paintbrush (5th-8th): plus shading on every friend, the background cut into glass shards, 16 colors.
//   Stained Glass (teens & grown-ups): everything big cut into glass shards lit from the top left
//     (light, middle and dark of each color), up to 28 colors and hundreds of spots.
import { hexRgb, rgbHex, tone } from './art-kit.mjs';

export const R = 400;
export const LEVELS = [
  { id: 0, name: 'Crayon', emoji: '🖍️', grades: 'K–1st', note: 'Big spaces, a few colors, and the tiny bits done for you.', maxColors: 8, minR: 7.5, cut: 0 },
  { id: 1, name: 'Marker', emoji: '🖊️', grades: '2nd–4th', note: 'Rosy cheeks, spots, stripes and more little details.', maxColors: 12, minR: 5, cut: 0 },
  { id: 2, name: 'Paintbrush', emoji: '🖌️', grades: '5th–8th', note: 'Shading on every friend and a sky cut into glass. Pinch to zoom.', maxColors: 16, minR: 3.6, cut: 1, cell: 46 },
  { id: 3, name: 'Stained Glass', emoji: '💎', grades: 'Teens & grown-ups', note: 'Hundreds of glass pieces with light and shadow in every color. Pinch to zoom.', maxColors: 28, minR: 2.7, cut: 2, cell: 25 },
];
export const levelOf = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];

// The parts a level paints: details above the level are drawn already (keep) or left out.
export function levelParts(parts, lv) {
  const out = [];
  for (const p of parts) {
    if (p.k !== 'fill' || (p.t || 0) <= lv) out.push(p);
    else if (p.keep) out.push({ ...p, k: 'ink' });
  }
  return out;
}

export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- stained glass: a jittered grid of seeds and the Voronoi cell around each ----
export function makeCells(seedKey, S) {
  const rand = rng(hash(seedKey));
  const nx = Math.ceil(R / S) + 1, ny = nx;
  const seeds = new Float64Array(nx * ny * 2);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = (j * nx + i) * 2;
    seeds[k] = (i + 0.5) * S - S * 0.25 + (rand() - 0.5) * 0.7 * S;
    seeds[k + 1] = (j + 0.5) * S - S * 0.25 + (rand() - 0.5) * 0.7 * S;
  }
  const near = (i, j) => {
    const out = [];
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const a = i + di, b = j + dj;
      if ((di || dj) && a >= 0 && b >= 0 && a < nx && b < ny) out.push(b * nx + a);
    }
    return out;
  };
  const polys = [], edges = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const id = j * nx + i, sx = seeds[id * 2], sy = seeds[id * 2 + 1];
    let poly = [[sx - 3 * S, sy - 3 * S], [sx + 3 * S, sy - 3 * S], [sx + 3 * S, sy + 3 * S], [sx - 3 * S, sy + 3 * S]];
    const nb = near(i, j);
    for (const o of nb) poly = halfPlane(poly, sx, sy, seeds[o * 2], seeds[o * 2 + 1]);
    polys.push(poly);
    // which neighbor each edge faces
    for (let k = 0; k < poly.length; k++) {
      const [x1, y1] = poly[k], [x2, y2] = poly[(k + 1) % poly.length], mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      let best = -1, bd = 1e9;
      const d0 = Math.hypot(mx - sx, my - sy);
      for (const o of nb) { const d = Math.abs(Math.hypot(mx - seeds[o * 2], my - seeds[o * 2 + 1]) - d0); if (d < bd) { bd = d; best = o; } }
      if (best > id && bd < 0.5) edges.push({ a: id, b: best, x1, y1, x2, y2 });
    }
  }
  return { S, nx, ny, seeds, polys, edges };
}
// keep the side of the bisector nearer (sx, sy)
function halfPlane(poly, sx, sy, ox, oy) {
  const nx = ox - sx, ny = oy - sy, c = (ox * ox + oy * oy - sx * sx - sy * sy) / 2;
  const inside = ([x, y]) => x * nx + y * ny <= c;
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const da = a[0] * nx + a[1] * ny - c, db = b[0] * nx + b[1] * ny - c, t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
// which cell each pixel is in
export function cellMap(cells) {
  const { S, nx, ny, seeds } = cells;
  const map = new Int32Array(R * R);
  for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
    const px = x + 0.5, py = y + 0.5;
    const ci = Math.min(nx - 1, Math.floor((px + S * 0.25) / S)), cj = Math.min(ny - 1, Math.floor((py + S * 0.25) / S));
    let best = 0, bd = 1e18;
    for (let j = Math.max(0, cj - 2); j <= Math.min(ny - 1, cj + 2); j++) for (let i = Math.max(0, ci - 2); i <= Math.min(nx - 1, ci + 2); i++) {
      const id = j * nx + i, dx = px - seeds[id * 2], dy = py - seeds[id * 2 + 1], d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = id; }
    }
    map[y * R + x] = best;
  }
  return map;
}

// Chamfer distance (in 1/3 pixels) from each pixel to the nearest edge of its spot.
export function distances(map) {
  const N = R * R, d = new Int32Array(N), BIG = 1 << 28;
  for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
    const i = y * R + x, u = map[i];
    d[i] = u < 0 || x === 0 || y === 0 || x === R - 1 || y === R - 1 || map[i - 1] !== u || map[i + 1] !== u || map[i - R] !== u || map[i + R] !== u ? 0 : BIG;
  }
  for (let y = 1; y < R - 1; y++) for (let x = 1; x < R - 1; x++) {
    const i = y * R + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], d[i - 1] + 3, d[i - R] + 3, d[i - R - 1] + 4, d[i - R + 1] + 4);
  }
  for (let y = R - 2; y > 0; y--) for (let x = R - 2; x > 0; x--) {
    const i = y * R + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], d[i + 1] + 3, d[i + R] + 3, d[i + R + 1] + 4, d[i + R - 1] + 4);
  }
  return d;
}

// ---- colors ----
function lab(hex) {
  const lin = hexRgb(hex).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const X = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047, Y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722, Z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
export function hsl(hex) {
  const [r, g, b] = hexRgb(hex).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
// Merge the closest colors (by eye, weighted toward keeping the big ones) until there are at most n.
// weights: color -> pixels; bgOf: color -> share of it that's background (the sky merges with the
// grass before it turns the unicorn blue).
export function reducePalette(weights, n, bgOf = new Map()) {
  const cs = [...weights.entries()].map(([c, w]) => ({ c, w, lab: lab(c), to: c, bg: (bgOf.get(c) || 0) > 0.5 }));
  const alive = cs.slice();
  while (alive.length > n) {
    let bi = 0, bj = 1, bd = Infinity;
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const d = dist2(alive[i].lab, alive[j].lab) * Math.min(alive[i].w, alive[j].w) ** 0.25 * (alive[i].bg !== alive[j].bg ? 4 : 1);
      if (d < bd) { bd = d; bi = i; bj = j; }
    }
    const [keep, lose] = alive[bi].w >= alive[bj].w ? [alive[bi], alive[bj]] : [alive[bj], alive[bi]];
    keep.w += lose.w;
    for (const c of cs) if (c.to === lose.c) c.to = keep.c;
    alive.splice(alive.indexOf(lose), 1);
  }
  const map = new Map(cs.map((c) => [c.c, c.to]));
  // crayon-box order: the rainbow first, then browns and greys from light to dark
  const order = alive.map((a) => a.c).sort((a, b) => {
    const [ha, sa, la] = hsl(a), [hb, sb, lb] = hsl(b), ga = sa < 0.16 || la > 0.94, gb = sb < 0.16 || lb > 0.94;
    if (ga !== gb) return ga ? 1 : -1;
    if (ga) return lb - la;
    return ((ha + 20) % 360) - ((hb + 20) % 360);
  });
  return { map, order };
}
const LIGHT = (c) => tone(c, hsl(c)[2] > 0.84 ? 0.035 : 0.07), DARK = (c) => tone(c, -0.12);

// ---- the puzzle: spots to color ----
// partLabel: Int32Array (R*R), which fill part shows at each pixel (-1 none). Returns
//   units: [{ part, color, num, auto, px, labels: [{x, y, r}], cells: [cell ids] | null, pole: [x, y] }]
//   palette: [{ num, color }], map: Int32Array unit at each pixel (-1 none), cut: Set of cut parts,
//   cells (for drawing the shards) or null.
export function buildPuzzle({ parts, partLabel, lv, seedKey }) {
  const L = levelOf(lv), N = R * R;
  // which parts are cut into glass
  const area = new Map();
  for (let i = 0; i < N; i++) { const p = partLabel[i]; if (p >= 0) area.set(p, (area.get(p) || 0) + 1); }
  let cells = null, cmap = null;
  const cut = new Set();
  if (L.cut) {
    for (const [p, a] of area) if (L.cut === 1 ? parts[p].bg && a > L.cell * L.cell * 1.5 : a > L.cell * L.cell * 2.2) cut.add(p);
    if (cut.size) { cells = makeCells(`${seedKey}:${lv}`, L.cell); cmap = cellMap(cells); }
  }
  // first cut: one spot per (part, cell)
  const keyOf = new Map(), unitPart = [], unitCells = [];
  let map = new Int32Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    const p = partLabel[i];
    if (p < 0) continue;
    const k = cut.has(p) ? p * 65536 + cmap[i] : p * 65536 + 65535;
    let u = keyOf.get(k);
    if (u == null) { u = unitPart.length; keyOf.set(k, u); unitPart.push(p); unitCells.push(cut.has(p) ? [cmap[i]] : null); }
    map[i] = u;
  }
  // slivers of glass join the piece next to them in the same part
  let d = distances(map);
  const maxD = (m, dd, n) => { const a = new Int32Array(n); for (let i = 0; i < N; i++) if (m[i] >= 0 && dd[i] > a[m[i]]) a[m[i]] = dd[i]; return a; };
  let inR = maxD(map, d, unitPart.length);
  const minD = Math.round(L.minR * 3);
  const parent = unitPart.map((_, i) => i);
  const find = (u) => { while (parent[u] !== u) u = parent[u] = parent[parent[u]]; return u; };
  if (cut.size) {
    const small = unitPart.map((p, u) => u).filter((u) => cut.has(unitPart[u]) && inR[u] < minD);
    if (small.length) {
      const border = new Map();
      for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
        const i = y * R + x, u = map[i];
        if (u < 0) continue;
        for (const j of [x < R - 1 ? i + 1 : -1, y < R - 1 ? i + R : -1]) {
          if (j < 0) continue;
          const v = map[j];
          if (v < 0 || v === u || unitPart[v] !== unitPart[u]) continue;
          const k1 = u * 1e6 + v, k2 = v * 1e6 + u;
          border.set(k1, (border.get(k1) || 0) + 1); border.set(k2, (border.get(k2) || 0) + 1);
        }
      }
      const nbrs = new Map();
      for (const [k, c] of border) { const u = Math.floor(k / 1e6), v = k % 1e6; if (!nbrs.has(u)) nbrs.set(u, []); nbrs.get(u).push([v, c]); }
      small.sort((a, b) => inR[a] - inR[b]);
      for (const u of small) {
        const list = (nbrs.get(u) || []).sort((a, b) => b[1] - a[1]);
        if (!list.length) continue;
        const ru = find(u), rv = find(list[0][0]);
        if (ru !== rv) parent[ru] = rv;
      }
    }
  }
  // renumber the spots after joining
  const newId = new Map(), part2 = [], cells2 = [];
  for (let u = 0; u < unitPart.length; u++) {
    const r = find(u);
    if (!newId.has(r)) { newId.set(r, part2.length); part2.push(unitPart[r]); cells2.push(unitCells[r] ? [] : null); }
    const nu = newId.get(r);
    if (unitCells[u]) cells2[nu].push(...unitCells[u]);
  }
  const remap = unitPart.map((_, u) => newId.get(find(u)));
  for (let i = 0; i < N; i++) if (map[i] >= 0) map[i] = remap[map[i]];
  d = distances(map);
  const n = part2.length;
  inR = maxD(map, d, n);
  // islands: a spot split in two (the sky either side of a friend) gets a number in each piece
  const comp = new Int32Array(N).fill(-1), labels = part2.map(() => []), px = new Int32Array(n);
  const sx = new Float64Array(n), sy = new Float64Array(n);
  const stack = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (map[s] < 0 || comp[s] >= 0) continue;
    const u = map[s];
    let top = 0, best = s, bd = -1, size = 0;
    stack[top++] = s; comp[s] = s;
    while (top) {
      const i = stack[--top];
      size++;
      if (d[i] > bd) { bd = d[i]; best = i; }
      const x = i % R, y = (i - x) / R;
      if (x > 0 && map[i - 1] === u && comp[i - 1] < 0) { comp[i - 1] = s; stack[top++] = i - 1; }
      if (x < R - 1 && map[i + 1] === u && comp[i + 1] < 0) { comp[i + 1] = s; stack[top++] = i + 1; }
      if (y > 0 && map[i - R] === u && comp[i - R] < 0) { comp[i - R] = s; stack[top++] = i - R; }
      if (y < R - 1 && map[i + R] === u && comp[i + R] < 0) { comp[i + R] = s; stack[top++] = i + R; }
    }
    labels[u].push({ x: (best % R) + 0.5, y: Math.floor(best / R) + 0.5, r: bd / 3, size });
  }
  for (let i = 0; i < N; i++) { const u = map[i]; if (u >= 0) { px[u]++; sx[u] += i % R; sy[u] += Math.floor(i / R); } }
  // each part's box, for the light across the glass
  const box = new Map();
  for (let i = 0; i < N; i++) {
    const u = map[i]; if (u < 0) continue;
    const p = part2[u]; if (!cut.has(p)) continue;
    const x = i % R, y = (i - x) / R;
    const b = box.get(p) || [x, y, x, y];
    if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
    box.set(p, b);
  }
  const units = part2.map((p, u) => {
    let color = parts[p].c;
    if (cut.has(p)) {
      const b = box.get(p), cx = sx[u] / px[u], cy = sy[u] / px[u];
      const v = ((cx - b[0]) / Math.max(1, b[2] - b[0]) + (cy - b[1]) / Math.max(1, b[3] - b[1])) / 2;
      if (L.cut === 1) color = v < 0.5 ? LIGHT(color) : color;
      else color = v < 0.36 ? LIGHT(color) : v > 0.64 ? DARK(color) : color;
    }
    const big = labels[u].reduce((a, b) => (b.r > a.r ? b : a), labels[u][0]);
    const keep = labels[u].filter((l) => l === big || l.r * 3 >= minD).map(({ x, y, r }) => ({ x, y, r }));
    return { part: p, color, num: 0, auto: inR[u] < minD, px: px[u], labels: keep, cells: cells2[u], pole: big ? [Math.floor(big.x), Math.floor(big.y)] : [0, 0] };
  });
  // the palette
  const weights = new Map(), bgPx = new Map();
  for (const un of units) if (!un.auto) {
    weights.set(un.color, (weights.get(un.color) || 0) + un.px);
    if (parts[un.part].bg) bgPx.set(un.color, (bgPx.get(un.color) || 0) + un.px);
  }
  const bgOf = new Map([...weights].map(([c, w]) => [c, (bgPx.get(c) || 0) / w]));
  const { map: to, order } = reducePalette(weights, L.maxColors, bgOf);
  const numOf = new Map(order.map((c, i) => [c, i + 1]));
  for (const un of units) {
    if (un.auto) continue;
    un.color = to.get(un.color);
    un.num = numOf.get(un.color);
  }
  const palette = order.map((color, i) => ({ num: i + 1, color, count: units.filter((un) => un.num === i + 1).length }));
  return { units, palette, map, cut, cells, lv };
}

// Progress is saved as the spots' number points (one pixel inside each), so a saved picture still
// lines up if the cutting ever changes a little.
export const packPoles = (units, filled) => units.filter((u, i) => filled.has(i)).map((u) => (u.pole[1] * R + u.pole[0]).toString(36)).join('.');
export function unpackPoles(s, map) {
  const out = new Set();
  if (!s) return out;
  for (const k of s.split('.')) { const i = parseInt(k, 36); if (i >= 0 && i < R * R && map[i] >= 0) out.add(map[i]); }
  return out;
}
export const keyFor = (id, lv) => `${id}@${lv}`;
void rgbHex;
