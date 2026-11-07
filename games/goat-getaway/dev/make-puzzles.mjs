// Makes the Goat Getaway pens: shared/puzzles.mjs (moved here from Mind Heist's Vault Jam, Nov 2026).
//   node dev/make-puzzles.mjs [seed]
// Lays out random floors, explores every position reachable from each one, and keeps
// the position farthest from a solve (the hardest puzzle hiding in that layout).
// Each kept puzzle is re-solved with the shared solver, so par is exact.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../../mind-heist/src/server/rng.mjs';
import { solve, isValid } from '../shared/puzzle.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '../shared/puzzles.mjs');
const rand = mulberry32(Number(process.argv[2] || 20261103));

// Daily tiers, Monday (0) to Sunday (6): fewest moves allowed [lo, hi].
const TIERS = [[5, 7], [8, 10], [11, 13], [14, 17], [18, 22], [23, 28], [29, 60]];
// How many of each weekday; the daily calendar cycles through each tier on its own.
const PER_TIER = [53, 53, 53, 53, 40, 30, 26];
const PRACTICE = { easy: [[5, 10], 60], medium: [[11, 19], 70], hard: [[20, 60], 70] };
const CLUSTER_CAP = 150000;

function layout(nPieces, walls) {
  const g = new Array(36).fill('.');
  const ps = [];
  const free = (cells) => cells.every(i => g[i] === '.');
  const put = (h, len, r, c) => {
    const cells = [];
    for (let k = 0; k < len; k++) cells.push(h ? r * 6 + c + k : (r + k) * 6 + c);
    if (!free(cells)) return false;
    const id = String.fromCharCode(65 + ps.length);
    cells.forEach(i => { g[i] = id; });
    ps.push({ h, len, fix: h ? r : c, pos: h ? c : r });
    return true;
  };
  put(true, 2, 2, (rand() * 3) | 0);
  for (let w = 0; w < walls; w++) {
    const i = (rand() * 36) | 0;
    if (g[i] === '.' && ((i / 6) | 0) !== 2) g[i] = 'x';
  }
  for (let tries = 0; ps.length < nPieces && tries < 300; tries++) {
    const h = rand() < 0.5, len = rand() < 0.72 ? 2 : 3;
    const r = (rand() * (h ? 6 : 7 - len)) | 0, c = (rand() * (h ? 7 - len : 6)) | 0;
    if (h && r === 2) continue; // a flat piece on the jewel's row would block the door for good
    put(h, len, r, c);
  }
  return { ps, walls: g.map((ch, i) => (ch === 'x' ? i : -1)).filter(i => i >= 0) };
}

// A layout from a board string (the jewel first), used to mutate good finds.
function fromBoard(board) {
  const ps = [], walls = [];
  const order = ['A', ...[...new Set(board.replace(/[.xA]/g, ''))]];
  for (const id of order) {
    const cells = [...board].map((ch, i) => (ch === id ? i : -1)).filter(i => i >= 0);
    const h = cells.length > 1 && cells[1] - cells[0] === 1;
    const r = (cells[0] / 6) | 0, c = cells[0] % 6;
    ps.push({ h, len: cells.length, fix: h ? r : c, pos: h ? c : r });
  }
  [...board].forEach((ch, i) => { if (ch === 'x') walls.push(i); });
  return { ps, walls };
}

// Small change to a good board: drop a piece and/or add one somewhere free.
function mutate(board) {
  const g = board.split('');
  const ids = [...new Set(board.replace(/[.xA]/g, ''))];
  const op = rand();
  if ((op < 0.45 || ids.length > 13) && ids.length > 5) {
    const id = ids[(rand() * ids.length) | 0];
    for (let i = 0; i < 36; i++) if (g[i] === id) g[i] = '.';
  }
  if (op >= 0.3) {
    for (let tries = 0; tries < 60; tries++) {
      const h = rand() < 0.5, len = rand() < 0.6 ? 2 : 3;
      const r = (rand() * (h ? 6 : 7 - len)) | 0, c = (rand() * (h ? 7 - len : 6)) | 0;
      if (h && r === 2) continue;
      const cells = [];
      for (let k = 0; k < len; k++) cells.push(h ? r * 6 + c + k : (r + k) * 6 + c);
      if (cells.every(i => g[i] === '.')) { cells.forEach(i => { g[i] = 'z'; }); break; }
    }
  }
  // Re-letter (the new piece is 'z' until now).
  const map = { A: 'A', '.': '.', x: 'x' };
  let next = 66;
  return fromBoard(g.map(ch => (map[ch] ??= String.fromCharCode(next++))).join(''));
}

// Positions are packed into one number (base 5, one digit per piece); the
// occupancy grid is rebuilt per expansion. Edges are kept flat (CSR).
function explore({ ps, walls }) {
  const n = ps.length;
  const pow = ps.map((_, i) => 5 ** i);
  const start = ps.reduce((a, p, i) => a + p.pos * pow[i], 0);
  const occ = new Uint8Array(36);
  const pos = new Int8Array(n);
  const seen = new Map([[start, 0]]);
  const order = [start];
  const adj = [], off = [0];
  for (let qi = 0; qi < order.length; qi++) {
    const key = order[qi];
    let k = key;
    for (let i = 0; i < n; i++) { pos[i] = k % 5; k = (k - pos[i]) / 5; }
    occ.fill(0);
    for (const w of walls) occ[w] = 1;
    for (let i = 0; i < n; i++) {
      const p = ps[i];
      for (let t = 0; t < p.len; t++) occ[p.h ? p.fix * 6 + pos[i] + t : (pos[i] + t) * 6 + p.fix] = 1;
    }
    for (let i = 0; i < n; i++) {
      const p = ps[i], s = pos[i];
      const free = (c) => !occ[p.h ? p.fix * 6 + c : c * 6 + p.fix];
      for (let c = s - 1; c >= 0 && free(c); c--) push(key + (c - s) * pow[i]);
      for (let c = s + p.len; c < 6 && free(c); c++) push(key + (c - p.len + 1 - s) * pow[i]);
    }
    if (order.length > CLUSTER_CAP) return null;
    off.push(adj.length);
  }
  function push(nk) {
    let j = seen.get(nk);
    if (j === undefined) { j = order.length; seen.set(nk, j); order.push(nk); }
    adj.push(j);
  }
  // Distance from the nearest solved position (jewel at the door, column 4).
  const dist = new Int32Array(order.length).fill(-1);
  let frontier = [];
  order.forEach((key, i) => { if (key % 5 === 4) { dist[i] = 0; frontier.push(i); } });
  if (!frontier.length) return null;
  while (frontier.length) {
    const next = [];
    for (const i of frontier) for (let e = off[i]; e < off[i + 1]; e++) { const j = adj[e]; if (dist[j] < 0) { dist[j] = dist[i] + 1; next.push(j); } }
    frontier = next;
  }
  let best = 0;
  for (let i = 0; i < order.length; i++) if (dist[i] > dist[best]) best = i;
  return { key: order[best], d: dist[best], size: order.length };
}

function toBoard({ ps, walls }, key) {
  const g = new Array(36).fill('.');
  for (const w of walls) g[w] = 'x';
  ps.forEach((p, i) => {
    const s = Math.floor(key / 5 ** i) % 5;
    for (let k = 0; k < p.len; k++) g[p.h ? p.fix * 6 + s + k : (s + k) * 6 + p.fix] = String.fromCharCode(65 + i);
  });
  // Rename pieces in reading order so equal layouts compare equal (A stays the jewel).
  const map = { A: 'A', '.': '.', x: 'x' };
  let next = 66;
  return g.map(ch => (map[ch] ??= String.fromCharCode(next++))).join('');
}

const t0 = Date.now();
const tiers = TIERS.map(() => []);
const practice = { easy: [], medium: [], hard: [] };
const seenBoards = new Set();
const elite = [];
const want = () => tiers.some((t, i) => t.length < PER_TIER[i]) || Object.entries(PRACTICE).some(([k, [, n]]) => practice[k].length < n);
let tries = 0;
const LIMIT_MS = Number(process.env.JAM_MS || 40 * 60000);
while (want() && tries < 2000000 && Date.now() - t0 < LIMIT_MS) {
  tries++;
  const hardHunt = (tiers[5].length < PER_TIER[5] || tiers[6].length < PER_TIER[6] || practice.hard.length < PRACTICE.hard[1]) && tries % 2 === 0;
  let lay;
  if (hardHunt && elite.length && rand() < 0.85) lay = mutate(elite[(rand() * rand() * elite.length) | 0][0]);
  else lay = layout(hardHunt ? 11 + ((rand() * 4) | 0) : 6 + ((rand() * 8) | 0), rand() < 0.12 ? 1 : 0);
  if (lay.ps.length < 6) continue;
  const r = explore(lay);
  if (!r || r.d < 5) continue;
  const board = toBoard(lay, r.key);
  if (r.d >= 16) {
    elite.push([board, r.d]);
    elite.sort((a, b) => b[1] - a[1]);
    if (elite.length > 40) elite.length = 40;
  }
  if (seenBoards.has(board)) continue;
  const t = TIERS.findIndex(([lo, hi]) => r.d >= lo && r.d <= hi);
  let used = false;
  if (t >= 0 && tiers[t].length < PER_TIER[t]) { tiers[t].push([board, r.d]); used = true; }
  else for (const [k, [[lo, hi], n]] of Object.entries(PRACTICE)) {
    if (!used && r.d >= lo && r.d <= hi && practice[k].length < n) { practice[k].push([board, r.d]); used = true; }
  }
  if (used) seenBoards.add(board);
  if (tries % 250 === 0) console.log(tries, 'best', elite[0] && elite[0][1], tiers.map(t => t.length).join(' '), Object.values(practice).map(p => p.length).join(' '), ((Date.now() - t0) / 1000).toFixed(0) + 's');
}

// Check every puzzle with the shared solver: valid, solvable, par exact.
console.log('verifying…', ((Date.now() - t0) / 1000).toFixed(0) + 's');
let checked = 0;
for (const list of [...tiers, ...Object.values(practice)]) {
  for (const p of list) {
    if (!isValid(p[0])) throw new Error('bad board ' + p[0]);
    const s = solve(p[0], 2000000);
    if (!s || s.par !== p[1]) throw new Error(`par mismatch ${p[0]} ${p[1]} vs ${s && s.par}`);
    checked++;
  }
}
const enc = (l) => l.map(([b, d]) => `${b}${d}`);
fs.writeFileSync(OUT, '// Goat Getaway\'s pens, made by dev/make-puzzles.mjs (each re-solved so its par is exact).\n'
  + '// A plain module rather than JSON so Node, esbuild and Netlify\'s bundler all read it the same way.\n'
  + 'export default ' + JSON.stringify({
    made: new Date().toISOString().slice(0, 10), tiers: tiers.map(enc),
    practice: [...practice.easy, ...practice.medium, ...practice.hard].map(([b, d]) => `${b}${d}`),
  }) + ';\n');
console.log(`checked ${checked} puzzles; tiers ${tiers.map(t => t.length).join('/')}; practice ${Object.values(practice).map(p => p.length).join('/')}; ${tries} layouts tried in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
