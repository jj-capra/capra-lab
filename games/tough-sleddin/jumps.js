/* Tough Sleddin: the big jumps, one shape each (JC, Nov 22 2026: "There should be some rooftops and other unique
   things they can jump"). Each is built for its spot on the hill: the riding surface runs straight from its foot
   (0, 0, 0) up to its lip (0, rise, -len), the same line the sled rides (logic.mjs: h above the snow rising evenly
   to the lip), and everything else hangs off that line: walls and props go down past the snow, which hides them.
   Upright (not tilted to the hill), so walls stand straight. One merged geometry with colours and glow
   (the place's prop material draws it). */
import { THREE, merge, mat, rng } from '../irl/world/core.js';

const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const Sp = (r, a = 12, b = 8) => new THREE.SphereGeometry(r, a, b);
const Cy = (a, b, h, s = 10) => new THREE.CylinderGeometry(a, b, h, s);
const SNOW = '#f4f7ff', INK = '#1a1222';

// a solid whose side view (s down the hill from the foot, y up) is pts, w wide across the hill
function prism(pts, w) {
  const sh = new THREE.Shape();
  pts.forEach(([s, y], i) => (i ? sh.lineTo(s, y) : sh.moveTo(s, y)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
  g.rotateY(Math.PI / 2); g.translate(-w / 2, 0, 0);     // s runs down the hill (-z), the depth across (x)
  return g;
}
// a slab lying along the line from (s0, y0) to (s1, y1), its top on the line, t thick, w wide, at x
function slab(s0, y0, s1, y1, w, t, x = 0) {
  const L = Math.hypot(s1 - s0, y1 - y0), a = Math.atan2(y1 - y0, s1 - s0), nx = Math.cos(a), ny = Math.sin(a);
  return { geo: Bx(w, t, L), matrix: mat(x, (y0 + y1) / 2 - (t / 2) * nx, -(s0 + s1) / 2 - (t / 2) * ny, a, 0, 0) };
}
// little coloured lights along a line (string lights on the eaves)
function lights(parts, s0, y0, s1, y1, x, cols, step = 0.7) {
  const n = Math.max(2, Math.round(Math.hypot(s1 - s0, y1 - y0) / step));
  for (let i = 0; i <= n; i++) { const k = i / n; parts.push({ geo: Sp(0.09, 8, 6), color: cols[i % cols.length], matrix: mat(x, y0 + (y1 - y0) * k - 0.05, -(s0 + (s1 - s0) * k)), emit: 1.6 }); }
}
const along = (rise, len) => (s) => (rise * s) / len;      // the roof line's height s down from the foot

/* A house snowed in to its eaves (the village's cottage, Pinewood's log cabin): the uphill roof is the ride, the
   ridge the lip; the far roof drops away to the eaves over the front wall, lit windows, a chimney. */
function house({ len, hw, rise, R, log }) {
  const parts = [], roof = along(rise, len), w = hw * 2, back = 3.3, drop = 1.3;
  const wall = log ? '#7a4a2c' : ['#c94f3d', '#3f6fa8', '#e0a93e', '#5f8f5a', '#a8566e'][Math.floor(R() * 5)];
  const trim = log ? '#4e2e1a' : '#fff4e2', shingle = log ? '#5a4535' : ['#b8383c', '#2f5a9a', '#3f7a4a', '#7a3a6a'][Math.floor(R() * 4)];
  // the walls, under the roof line, down past the snow
  parts.push({ geo: prism([[0, -8], [0, -0.35], [len, rise - 0.35], [len + back, rise - 0.35 - drop], [len + back, -8]], w - 0.3), color: wall });
  if (log) for (let y = -6; y < rise; y += 0.42) parts.push({ geo: Bx(0.06, 0.07, len + back), color: '#4e2e1a', matrix: mat(hw - 0.22, y, -(len + back) / 2) }, { geo: Bx(0.06, 0.07, len + back), color: '#4e2e1a', matrix: mat(-hw + 0.22, y, -(len + back) / 2) });
  // the ride: the roof, its shingles showing down both sides of the snow on it, a trim along its edges
  parts.push({ ...slab(-0.2, -0.02, len, rise - 0.02, w + 0.2, 0.24), color: shingle });
  for (let s = 0.5; s < len; s += 0.55) for (const sx of [-1, 1]) parts.push({ geo: Bx(0.62, 0.03, 0.05), color: log ? '#3e2e24' : '#1a1222', matrix: mat(sx * (hw - 0.2), along(rise, len)(s) - 0.005, -s) });
  for (const sx of [-1, 1]) parts.push({ ...slab(-0.2, 0.02, len, rise + 0.02, 0.12, 0.3, sx * (hw + 0.06)), color: trim });
  parts.push({ ...slab(-0.2, 0.03, len, rise + 0.03, w - 1.25, 0.3), color: SNOW });
  // over the ridge: the far roof down to the eaves, snow on it, icicles
  parts.push({ ...slab(len, rise - 0.04, len + back + 0.5, rise - drop - 0.35, w + 0.35, 0.22), color: shingle });
  parts.push({ ...slab(len, rise, len + back + 0.5, rise - drop - 0.3, w, 0.3), color: SNOW });
  parts.push({ geo: Bx(w + 0.4, 0.22, 0.3), color: SNOW, matrix: mat(0, rise + 0.02, -len, Math.PI / 4) });      // the snowy ridge
  for (let x = -hw + 0.3; x < hw; x += 0.45) parts.push({ geo: new THREE.ConeGeometry(0.05, 0.25 + R() * 0.35, 5), color: '#d6ecff', matrix: mat(x, rise - drop - 0.75, -(len + back + 0.45), Math.PI), emit: 0.15 });
  // lit windows down the sides where they're out of the snow, and on the front
  for (const sx of [-1, 1]) for (const s of [len * 0.62, len * 0.95]) parts.push({ geo: Bx(0.08, 0.7, 0.9), color: '#ffc46a', matrix: mat(sx * (hw - 0.22), roof(s) - 1.15, -s), emit: 1.6 }, { geo: Bx(0.1, 0.84, 0.12), color: trim, matrix: mat(sx * (hw - 0.21), roof(s) - 1.15, -s) });
  const fz = -(len + back - 0.02), fy = rise - drop - 1.05;
  parts.push({ geo: Bx(1.0, 1.7, 0.1), color: log ? '#3a2416' : '#5a2f2a', matrix: mat(0, fy - 0.6, fz - 0.03) });
  for (const sx of [-1, 1]) parts.push({ geo: Bx(1.0, 0.8, 0.08), color: '#ffc46a', matrix: mat(sx * (hw * 0.55), fy, fz - 0.03), emit: 1.6 });
  if (!log) parts.push({ geo: new THREE.TorusGeometry(0.32, 0.1, 6, 14), color: '#2f7a46', matrix: mat(0, fy + 0.65, fz - 0.1) }, { geo: Sp(0.08, 6, 5), color: '#e2383c', matrix: mat(0, fy + 0.35, fz - 0.14) });
  // a chimney just over the ridge at one end (standing up behind the ridge as you come: a house), off the line
  const cx = (R() < 0.5 ? -1 : 1) * (hw - 0.45), cs = len + 1.3, cy = rise - ((drop + 0.3) * 1.3) / (back + 0.5);
  parts.push({ geo: Bx(0.7, 2.6, 0.7), color: log ? '#7d7f86' : '#9a4a3c', matrix: mat(cx, cy + 0.7, -cs) }, { geo: Bx(0.86, 0.22, 0.86), color: log ? '#5d6068' : '#6e3026', matrix: mat(cx, cy + 2.0, -cs) }, { geo: Sp(0.42, 8, 6), color: SNOW, matrix: mat(cx, cy + 2.15, -cs, 0, 0, 0, [1.1, 0.4, 1.1]) });
  // string lights along both eaves of the ride (the village) / lanterns (the cabin)
  if (!log) for (const sx of [-1, 1]) lights(parts, 0.2, 0.05, len - 0.1, rise + 0.02, sx * (hw + 0.16), ['#ff5a5a', '#ffd23f', '#5be38a', '#29d3f0']);
  else for (const sx of [-1, 1]) parts.push({ geo: Sp(0.16, 10, 8), color: '#ffb04a', matrix: mat(sx * (hw + 0.1), rise - 0.3, -len + 0.3), emit: 2.2 });
  return parts;
}

/* A fallen giant pine, propped on a boulder: ride its back up to the broken top. */
function trunk({ len, hw, rise, R }) {
  const parts = [], rad = 1.15, L = Math.hypot(len + 1.2, rise), a = Math.atan2(rise, len);
  const ny = Math.cos(a), nz = Math.sin(a);
  // the trunk (its top along the line), a strip of snow on its back
  parts.push({ geo: Cy(rad * 0.92, rad, L, 14), color: '#6b4a32', matrix: mat(0, rise / 2 - rad * ny, -(len + 1.2) / 2 + 0.6 - rad * nz, Math.PI / 2 + a, 0, 0) });
  parts.push({ ...slab(-0.6, 0, len + 0.4, rise + 0.03, hw * 1.25, 0.16), color: SNOW });
  for (let i = 0; i < 9; i++) { const s = R() * len, y = along(rise, len)(s), sx = R() < 0.5 ? -1 : 1; parts.push({ geo: Bx(0.05, 0.4 + R() * 0.3, 0.05), color: '#3e2a1c', matrix: mat(sx * rad * 0.7, y - rad * 1.1, -s, 0, 0, sx * 0.4) }); }
  // bark rings and the cut-looking top end, branch stubs out to the sides
  for (let s = 0.8; s < len; s += 1.4) parts.push({ geo: new THREE.TorusGeometry(rad * 0.98, 0.05, 5, 16), color: '#4e3424', matrix: mat(0, along(rise, len)(s) - rad * ny, -s - rad * nz, a, 0, 0) });
  parts.push({ geo: Cy(rad * 0.9, rad * 0.9, 0.08, 14), color: '#d9b27a', matrix: mat(0, (rise * (len + 0.62)) / len - rad * ny, -(len + 0.62) - rad * nz, Math.PI / 2 + a, 0, 0) });
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { const s = len * (0.35 + k * 0.4) + R(), y = along(rise, len)(s) - rad; parts.push({ geo: Cy(0.12, 0.2, 1.6, 6), color: '#5a3d28', matrix: mat(sx * (rad + 0.6), y, -s, 0, 0, sx * -1.1) }, { geo: Sp(0.3, 6, 5), color: SNOW, matrix: mat(sx * (rad + 1.2), y + 0.5, -s, 0, 0, 0, [1.2, 0.5, 1]) }); }
  // the boulder under its top, snow on it
  parts.push({ geo: new THREE.IcosahedronGeometry(1.5, 0), color: '#7a7f8c', matrix: mat(0.2, rise - 2.6, -len + 0.4, 0.3, 0.6, 0) });
  parts.push({ geo: Sp(1.2, 10, 6, 0, Math.PI * 2, 0, 1.2), color: SNOW, matrix: mat(0.6, rise - 1.7, -len - 0.6, 0, 0, 0, [1, 0.4, 1]) });
  return parts;
}

/* A market stall in the snow: its snowy canvas roof is the ride; a striped awning at the lip, a counter of
   presents and cocoa, lanterns. */
function stall({ len, hw, rise, R }) {
  const parts = [], w = hw * 2, col = ['#e2383c', '#2f7a46', '#3f6fa8'][Math.floor(R() * 3)];
  parts.push({ geo: prism([[0, -8], [0, -0.3], [len, rise - 0.3], [len, -8]], w - 0.3), color: '#7a5236' });      // the back and sides, buried
  parts.push({ ...slab(-0.2, 0, len, rise, w, 0.24), color: SNOW });
  parts.push({ ...slab(-0.2, -0.05, len, rise - 0.05, w + 0.3, 0.12), color: col });
  // the awning hanging off the lip: stripes
  const n = Math.round(w / 0.5);
  for (let i = 0; i < n; i++) parts.push({ geo: Bx(w / n, 0.55, 0.06), color: i % 2 ? '#fff4e2' : col, matrix: mat(-hw + (i + 0.5) * (w / n), rise - 0.55, -len - 0.18, -0.25, 0, 0) });
  // posts and a counter under it, with presents and steaming cups, a lantern each side
  for (const sx of [-1, 1]) parts.push({ geo: Cy(0.08, 0.08, 6, 6), color: '#5a3d28', matrix: mat(sx * (hw - 0.2), rise - 3.3, -len + 0.15) }, { geo: Sp(0.18, 10, 8), color: '#ffb04a', matrix: mat(sx * (hw - 0.2), rise - 0.85, -len - 0.1), emit: 2.4 });
  parts.push({ geo: Bx(w - 0.6, 0.9, 0.7), color: '#8a5a3a', matrix: mat(0, rise - 1.75, -len + 0.5) }, { geo: Bx(w - 0.4, 0.08, 0.8), color: '#fff4e2', matrix: mat(0, rise - 1.27, -len + 0.5) });
  for (let i = 0; i < 6; i++) parts.push({ geo: Bx(0.3, 0.3, 0.3), color: ['#ff5a5a', '#ffd23f', '#29d3f0', '#5be38a', '#ff3d8b'][i % 5], matrix: mat(-hw + 0.8 + i * ((w - 1.6) / 5), rise - 1.08, -len + 0.45, 0, R(), 0), emit: 0.25 });
  return parts;
}

/* Up a packed drift and over an igloo, lit inside. */
function igloo({ len, hw, rise, R }) {
  const parts = [], Rd = 2.5, w = hw * 2;
  parts.push({ geo: prism([[0, -8], [0, -0.2], [len, rise - 0.2], [len + 0.6, rise - 0.6], [len + 0.6, -8]], w), color: '#e8f0ff' });
  parts.push({ ...slab(-0.3, 0, len, rise, w, 0.25), color: SNOW });
  // the dome beyond the lip, its top level with it, blocks marked in rings; its door facing down the hill, lit
  const cz = -(len + 0.9), cy = rise - Rd;
  parts.push({ geo: new THREE.SphereGeometry(Rd, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), color: '#f2f7ff', matrix: mat(0, cy, cz) });
  for (let k = 1; k < 5; k++) { const ph = (k / 5) * (Math.PI / 2), r = Rd * Math.cos(ph) + 0.01; parts.push({ geo: new THREE.TorusGeometry(r, 0.03, 4, 28), color: '#b9cdf0', matrix: mat(0, cy + Rd * Math.sin(ph), cz, Math.PI / 2, 0, 0) }); }
  parts.push({ geo: Cy(0.95, 0.95, 1.8, 12, 1), color: '#f2f7ff', matrix: mat(0, cy + 0.55, cz - Rd + 0.1, Math.PI / 2, 0, 0) });
  parts.push({ geo: Cy(0.66, 0.66, 0.08, 12), color: '#ffb24a', matrix: mat(0, cy + 0.5, cz - Rd - 0.85, Math.PI / 2, 0, 0), emit: 2.6 });
  // ice blocks along the drift
  for (const sx of [-1, 1]) for (let s = 0.6; s < len; s += 1.3) parts.push({ geo: Bx(0.7, 0.5, 0.9), color: R() < 0.5 ? '#cfe6ff' : '#a9d4ff', matrix: mat(sx * (hw + 0.2), along(rise, len)(s) - 0.2, -s, 0, R() * 0.4, 0), emit: 0.12 });
  return parts;
}

/* A slab of glacier ice tipped up on a block, glowing blue, crystals round its foot. */
function iceSlab({ len, hw, rise, R }) {
  const parts = [], w = hw * 2;
  parts.push({ ...slab(-0.4, 0, len, rise, w, 0.8), color: '#8fd0ff', emit: 0.35 });
  parts.push({ ...slab(-0.4, 0.01, len, rise + 0.01, w * 0.86, 0.05), color: '#d8f0ff', emit: 0.25 });
  parts.push({ geo: new THREE.IcosahedronGeometry(1.9, 0), color: '#6fb8ff', matrix: mat(0, rise - 2.3, -len + 0.7, 0.4, 0.3, 0), emit: 0.25 });
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    const s = 1 + k * (len / 3) + R(), hh = 1.2 + R() * 1.4;
    parts.push({ geo: new THREE.ConeGeometry(0.3 + R() * 0.2, hh, 5), color: ['#7fe3ff', '#a68bff', '#6dffc8'][k % 3], matrix: mat(sx * (hw + 0.5 + R() * 0.4), along(rise, len)(s) - 0.9 + hh / 2, -s, 0, 0, sx * -0.25), emit: 0.7 });
  }
  return parts;
}

const BUILD = { roof: (o) => house(o), cabin: (o) => house({ ...o, log: true }), trunk, stall, igloo, slab: iceSlab };

// The shape of a big jump r whose lip stands `rise` above its foot.
export function jumpGeo(r, rise) {
  const R = rng(Math.round(r.d * 10 + r.x * 100));
  return merge(BUILD[r.kind]({ len: r.len, hw: r.hw, rise, R }));
}
export const hasJumpGeo = (kind) => !!BUILD[kind];
void INK;
