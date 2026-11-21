// Color by Numbers: the drawing kit. Every picture is a list of parts in painting order, each a closed
// SVG path ("M x y C ... Z", already placed on the 400 x 400 page):
//   { k: 'fill', d, c, t, keep, w, clip, out, bg }   a spot to color (c is its finished color)
//   { k: 'ink',  d, c, w }                            drawn already (pupils, shine, little details)
//   { k: 'line', d, c, w }                            a stroke on top (mouths, whiskers, lashes)
// t: the first level that colors it (0 Little, 1 Kid, 2 Big Kid, 3 Grown-up). Below that level a part
// with `keep` is drawn already (ink) and one without is left out. clip: drawn only inside that path;
// out: drawn only outside that path (a shade is the part with a shifted copy of itself cut out).
// bg: background, cut into stained-glass shards from Big Kid up.

export const SIZE = 400;
export const INK = '#3a2747';
export const OUT_W = 3.2;

const r1 = (v) => Math.round(v * 10) / 10;
const K = 0.5523;

// colors
export function mix(a, b, f) {
  const pa = hexRgb(a), pb = hexRgb(b);
  return rgbHex(pa.map((v, i) => v + (pb[i] - v) * f));
}
export const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rgbHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const darker = (c, f = 0.2) => mix(c, '#2a1838', f);
// the same color lighter or deeper (by lightness, keeping its hue: a shadow on the sky stays blue)
export function tone(c, dl) {
  const [r, g, b] = hexRgb(c).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = Math.max(0.06, Math.min(0.97, l + dl));
  s = Math.min(1, s * (dl < 0 ? 1.12 : 0.96) + (dl < 0 && s > 0.05 ? 0.04 : 0));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return rgbHex([f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => v * 255));
}
export const lighter = (c, f = 0.35) => mix(c, '#ffffff', f);

export class Pic {
  constructor() { this.parts = []; this.m = [1, 0, 0, 1, 0, 0]; this.stack = []; this.tag = null; }
  // place a drawing: move to (x, y), scale, turn (degrees), mirror left to right
  push(x = 0, y = 0, s = 1, rot = 0, flip = false) {
    this.stack.push(this.m);
    const [a, b, c, d, e, f] = this.m;
    const r = (rot * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r), sx = flip ? -s : s;
    // m * T(x,y) * R * S
    const e2 = a * x + c * y + e, f2 = b * x + d * y + f;
    const a1 = a * cs + c * sn, b1 = b * cs + d * sn, c1 = -a * sn + c * cs, d1 = -b * sn + d * cs;
    this.m = [a1 * sx, b1 * sx, c1 * s, d1 * s, e2, f2];
    return this;
  }
  pop() { this.m = this.stack.pop() || [1, 0, 0, 1, 0, 0]; return this; }
  get sc() { const [a, b, c, d] = this.m; return Math.sqrt(Math.abs(a * d - b * c)); }
  P(x, y) { const [a, b, c, d, e, f] = this.m; return [a * x + c * y + e, b * x + d * y + f]; }
  pt(x, y) { const [X, Y] = this.P(x, y); return `${r1(X)} ${r1(Y)}`; }

  // ---- shapes (local coordinates in, page path out) ----
  ell(cx, cy, rx, ry = rx, rot = 0) {
    const r = (rot * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
    const L = (x, y) => this.pt(cx + x * cs - y * sn, cy + x * sn + y * cs);
    const kx = rx * K, ky = ry * K;
    return `M${L(rx, 0)}C${L(rx, ky)} ${L(kx, ry)} ${L(0, ry)}C${L(-kx, ry)} ${L(-rx, ky)} ${L(-rx, 0)}C${L(-rx, -ky)} ${L(-kx, -ry)} ${L(0, -ry)}C${L(kx, -ry)} ${L(rx, -ky)} ${L(rx, 0)}Z`;
  }
  circ(cx, cy, r) { return this.ell(cx, cy, r, r); }
  poly(pts) { return 'M' + pts.map(([x, y]) => this.pt(x, y)).join('L') + 'Z'; }
  rect(x, y, w, h) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); }
  // a smooth closed curve through the points (Catmull-Rom); k < 1 is tighter
  blob(pts, k = 1) { return spline(this, pts, true, k); }
  curve(pts, k = 1) { return spline(this, pts, false, k); }
  rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    const c = r * (1 - K);
    return `M${this.pt(x + r, y)}L${this.pt(x + w - r, y)}C${this.pt(x + w - c, y)} ${this.pt(x + w, y + c)} ${this.pt(x + w, y + r)}` +
      `L${this.pt(x + w, y + h - r)}C${this.pt(x + w, y + h - c)} ${this.pt(x + w - c, y + h)} ${this.pt(x + w - r, y + h)}` +
      `L${this.pt(x + r, y + h)}C${this.pt(x + c, y + h)} ${this.pt(x, y + h - c)} ${this.pt(x, y + h - r)}` +
      `L${this.pt(x, y + r)}C${this.pt(x, y + c)} ${this.pt(x + c, y)} ${this.pt(x + r, y)}Z`;
  }
  star(cx, cy, R, r = R * 0.48, n = 5, rot = -90) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = ((rot + (i * 180) / n) * Math.PI) / 180, rr = i % 2 ? r : R;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return this.blob(pts, 0.12);
  }
  heart(cx, cy, s) {
    const P = (x, y) => this.pt(cx + x * s, cy + y * s);
    return `M${P(0, 0.95)}C${P(-0.35, 0.7)} ${P(-1, 0.25)} ${P(-1, -0.25)}C${P(-1, -0.75)} ${P(-0.45, -1)} ${P(0, -0.55)}C${P(0.45, -1)} ${P(1, -0.75)} ${P(1, -0.25)}C${P(1, 0.25)} ${P(0.35, 0.7)} ${P(0, 0.95)}Z`;
  }
  // a band between two arcs (rainbows): center, radii, from/to angles in degrees (0 = right, -90 = up)
  arcBand(cx, cy, r0, r1_, a0 = 180, a1 = 360, steps = 24) {
    const pts = [];
    for (let i = 0; i <= steps; i++) { const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180; pts.push([cx + Math.cos(a) * r1_, cy + Math.sin(a) * r1_]); }
    for (let i = steps; i >= 0; i--) { const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180; pts.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]); }
    return this.poly(pts);
  }
  // a fluffy cloud: bumps along the top over a flat-ish bottom
  cloud(cx, cy, w, h, bumps = 4) {
    const pts = [];
    for (let i = 0; i <= bumps; i++) {
      const x = cx - w / 2 + (w * i) / bumps;
      const lift = Math.sin((i / bumps) * Math.PI);
      pts.push([x, cy - h * 0.25 - lift * h * 0.55]);
      if (i < bumps) pts.push([x + w / bumps / 2, cy - h * 0.12 - lift * h * 0.62 - h * 0.14]);
    }
    pts.push([cx + w / 2 + h * 0.18, cy + h * 0.15], [cx + w / 4, cy + h * 0.42], [cx - w / 4, cy + h * 0.42], [cx - w / 2 - h * 0.18, cy + h * 0.15]);
    return this.blob(pts, 0.9);
  }
  // a wavy band from x0 to x1 whose top wobbles around y, down to y2
  wave(x0, x1, y, amp, n, y2) {
    const pts = [];
    for (let i = 0; i <= n * 2; i++) pts.push([x0 + ((x1 - x0) * i) / (n * 2), y + (i % 2 ? -amp : amp)]);
    let d = 'M' + this.pt(x0, y2) + 'L' + this.pt(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1], [x, y_] = pts[i], mx = (px + x) / 2;
      d += `C${this.pt(mx, py)} ${this.pt(mx, y_)} ${this.pt(x, y_)}`;
    }
    return d + 'L' + this.pt(x1, y2) + 'Z';
  }
  // a hill: a smooth hump from x0 to x1 peaking at (px, py), down to y2
  hill(x0, y0, px, py, x1, y1, y2) {
    return `M${this.pt(x0, y2)}L${this.pt(x0, y0)}C${this.pt(x0 + (px - x0) * 0.5, py)} ${this.pt(px - (px - x0) * 0.3, py)} ${this.pt(px, py)}` +
      `C${this.pt(px + (x1 - px) * 0.3, py)} ${this.pt(x1 - (x1 - px) * 0.5, y1)} ${this.pt(x1, y1)}L${this.pt(x1, y2)}Z`;
  }

  // ---- parts ----
  ow(f = 1) { return r1(Math.max(1.4, OUT_W * this.sc * f)); }
  fill(d, c, o = {}) { const w = o.w != null ? r1(o.w * this.sc) : this.ow(); this.parts.push({ k: 'fill', d, c, t: 0, ...o, w, ...(this.tag ? { g: this.tag } : {}) }); return d; }
  ink(d, c = INK, o = {}) { const w = o.w != null ? r1(o.w * this.sc) : 0; this.parts.push({ k: 'ink', d, c, ...o, w }); return d; }
  line(d, w = 3, c = INK) { this.parts.push({ k: 'line', d, c, w: r1(Math.max(1, w * this.sc)) }); return d; }
  // a shadow on part `d` (a darker crescent): `shifted` is the same shape moved toward the light
  shade(d, shifted, c, t = 2) { return this.fill(d, tone(c, -0.1), { t, out: shifted, w: 1.2 / this.sc, soft: true }); }
}

function spline(p, pts, closed, k) {
  const n = pts.length;
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = 'M' + p.pt(...pts[0]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
    d += `C${p.pt(...c1)} ${p.pt(...c2)} ${p.pt(...p2)}`;
  }
  return closed ? d + 'Z' : d;
}

// The cute face every character shares: big shiny eyes, rosy cheeks.
export function eyes(p, x, y, { rx = 9.5, ry = 12, kind = 'open', lashes = false, look = 0 } = {}) {
  for (const s of [-1, 1]) {
    const cx = s * x;
    if (kind === 'happy') { p.line(p.curve([[cx - rx, y + 3], [cx, y - ry * 0.55], [cx + rx, y + 3]]), 3.4); continue; }
    if (kind === 'sleep') { p.line(p.curve([[cx - rx, y - 1], [cx, y + ry * 0.5], [cx + rx, y - 1]]), 3.4); if (lashes) lash(p, cx, y, s, true); continue; }
    if (kind === 'wink' && s > 0) { p.line(p.curve([[cx - rx, y + 3], [cx, y - ry * 0.55], [cx + rx, y + 3]]), 3.4); continue; }
    p.ink(p.ell(cx + look, y, rx, ry), INK);
    p.ink(p.circ(cx + look + rx * 0.3, y - ry * 0.38, rx * 0.4), '#ffffff');
    p.ink(p.circ(cx + look - rx * 0.32, y + ry * 0.38, rx * 0.17), '#ffffff');
    if (lashes) lash(p, cx, y - ry * 0.5, s, false);
  }
}
function lash(p, cx, y, s, down) {
  const dy = down ? 2 : 0;
  p.line(p.curve([[cx + s * 6, y - 4 + dy], [cx + s * 13, y - 9 + dy]]), 2.4);
  p.line(p.curve([[cx + s * 9, y + 1 + dy], [cx + s * 16, y - 2 + dy]]), 2.4);
}
export function cheeks(p, x, y, c = '#ff9fbf', rx = 12, ry = 7.5, t = 0) {
  for (const s of [-1, 1]) p.fill(p.ell(s * x, y, rx, ry), c, { t, keep: true, w: 1.4 });
}
export function smile(p, x, y, w = 10, kind = 'smile') {
  if (kind === 'w') p.line(p.curve([[x - w, y - 2], [x - w / 2, y + 3], [x, y - 1]]), 3) && p.line(p.curve([[x, y - 1], [x + w / 2, y + 3], [x + w, y - 2]]), 3);
  else if (kind === 'open') {
    p.fill(`M${p.pt(x - w, y)}C${p.pt(x - w, y + w * 1.3)} ${p.pt(x + w, y + w * 1.3)} ${p.pt(x + w, y)}Z`, '#e8607a', { t: 1, keep: true, w: 2.4 });
  } else p.line(p.curve([[x - w, y - 2], [x, y + w * 0.45], [x + w, y - 2]]), 3);
}
// a kawaii face for food and objects
export function face(p, x, y, s = 1, { kind = 'open', mouth = 'smile', blush = true } = {}) {
  p.push(x, y, s);
  eyes(p, 16, 0, { rx: 6, ry: 8, kind });
  smile(p, 0, 10, 7, mouth);
  if (blush) cheeks(p, 28, 8, '#ff9fbf', 7, 4.5);
  p.pop();
}
