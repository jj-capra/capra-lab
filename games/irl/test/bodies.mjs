import { P } from '../logic.mjs';
// Made-up bodies for IRL's tests: a person in meters (y down) seen from the front or the side, as
// MediaPipe would report it (`world` 3D centered on the hips, `lm` 0..1 across and down the picture).
const rad = (d) => (d * Math.PI) / 180;
export const ASPECT = 0.75;   // a phone held upright: 480 × 640

// A person in meters (y down) seen from the front or the side, as MediaPipe would report it: `world`
// (3D, centered on the hips) and `lm` (0..1 across and down the picture).
export function person(side, pts, { view = 'front', vis = 0.95, jitter = 0 } = {}) {
  // pts: name -> [forward, down, sideways] in meters
  const idx = { nose: [0], sh: [11, 12], el: [13, 14], wr: [15, 16], idx: [19, 20], hip: [23, 24], knee: [25, 26], ank: [27, 28], foot: [31, 32] };
  const world = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  for (const [name, [f, y, lat]] of Object.entries(pts)) {
    idx[name].forEach((i, k) => {
      const l = idx[name].length === 1 ? 0 : (k === 0 ? -lat : lat);
      const j = () => (Math.random() - 0.5) * jitter;
      world[i] = view === 'front' ? { x: l + j(), y: y + j(), z: -f + j(), visibility: vis } : { x: f + j(), y: y + j(), z: l + j(), visibility: vis };
    });
  }
  const hy = (world[23].y + world[24].y) / 2, hx = (world[23].x + world[24].x) / 2, hz = (world[23].z + world[24].z) / 2;
  const w = world.map((p) => ({ ...p, x: p.x - hx, y: p.y - hy, z: p.z - hz }));
  const lm = w.map((p) => ({ x: 0.5 + (p.x * 0.36) / ASPECT, y: 0.5 + p.y * 0.36, z: p.z, visibility: p.visibility }));
  return { lm, world: w, aspect: ASPECT };
}
// Squatting to a knee angle (side profile: forward, down), ankles on the floor.
export function squatter(knee, view = 'front') {
  const L = 0.45, phi = rad((180 - knee) / 2);
  const ank = [0, 0], kn = [L * Math.sin(phi), -L * Math.cos(phi)];
  const v = [ank[0] - kn[0], ank[1] - kn[1]].map((c) => c / L);
  const r = (a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  const c1 = r(rad(knee)), c2 = r(-rad(knee)), dir = c1[1] < c2[1] ? c1 : c2;
  const hip = [kn[0] + dir[0] * L, kn[1] + dir[1] * L], lean = rad((180 - knee) * 0.35);
  const sh = [hip[0] + 0.5 * Math.sin(lean), hip[1] - 0.5 * Math.cos(lean)];
  return person('', { nose: [sh[0] + 0.05, sh[1] - 0.25, 0], sh: [...sh, 0.18], el: [sh[0] + 0.15, sh[1] + 0.25, 0.2], wr: [sh[0] + 0.3, sh[1] + 0.4, 0.2], idx: [sh[0] + 0.33, sh[1] + 0.45, 0.2],
    hip: [...hip, 0.1], knee: [...kn, 0.12], ank: [...ank, 0.12], foot: [0.15, 0.02, 0.12] }, { view });
}
// A push-up seen side-on at an elbow angle; plank=false stands the same arms up instead.
export function pusher(elbow, plank = true) {
  const D = 2 * 0.3 * Math.sin(rad(elbow / 2)), off = Math.sqrt(Math.max(0, 0.09 - (D / 2) ** 2));
  if (!plank) return person('', { nose: [0, -1.45, 0], sh: [0, -1.25, 0.18], el: [0.1, -1.25 + D / 2, 0.2], wr: [0, -1.25 + D, 0.2], idx: [0, -1.2 + D, 0.2], hip: [0, -0.85, 0.1], knee: [0, -0.45, 0.1], ank: [0, 0, 0.1], foot: [0.1, 0, 0.1] }, { view: 'side' });
  const S = [-0.5, -D], A = [0.9, 0], at = (u) => [S[0] + (A[0] - S[0]) * u, S[1] + (A[1] - S[1]) * u];
  return person('', { nose: [-0.72, -D - 0.05, 0], sh: [...S, 0.18], el: [S[0] + off, -D / 2, 0.22], wr: [S[0], 0, 0.22], idx: [S[0] - 0.05, 0, 0.22],
    hip: [...at(0.36), 0.1], knee: [...at(0.68), 0.1], ank: [...A, 0.1], foot: [1.0, 0, 0.1] }, { view: 'side' });
}
export function sitter(knee = 90, hipA = 90) {
  if (knee > 150) return squatter(178, 'side');
  return person('', { nose: [0, -1.2, 0], sh: [0, -0.95, 0.18], el: [0.1, -0.7, 0.2], wr: [0.25, -0.55, 0.2], idx: [0.3, -0.55, 0.2], hip: [0, -0.45, 0.1], knee: [0.45, -0.45, 0.12], ank: [0.45, 0, 0.12], foot: [0.55, 0, 0.12] }, { view: 'side' });
}
