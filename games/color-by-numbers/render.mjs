// Color by Numbers: drawing parts on a canvas (the page, the thumbnails, the saved picture and the
// region map all draw through here, so they always agree).
import { INK } from './art-kit.mjs';

const P2D = new Map();
export function path(d) {
  let p = P2D.get(d);
  if (!p) { p = new Path2D(d); P2D.set(d, p); if (P2D.size > 20000) P2D.clear(); }
  return p;
}
const BIG = 'M-50 -50H450V450H-50Z';
// Zoomed in, lines grow slower than the picture (or a 10x zoom would draw 30-pixel outlines).
let LS = 1;
export function lineScale(v) { LS = v; }

// Clip to a part's area (its own clip, and outside its `out`).
export function clipTo(ctx, part) {
  if (part.clip) ctx.clip(path(part.clip));
  if (part.out) ctx.clip(path(BIG + part.out), 'evenodd');
}

// Draw one part. fill: the color to paint it (null: no fill). o.outline: false skips the ink outline.
export function drawPart(ctx, part, fill, o = {}) {
  const pp = path(part.d);
  const rule = part.rule || 'nonzero';
  if (part.k === 'line') {
    if (o.lines === false) return;
    if (part.clip) { ctx.save(); ctx.clip(path(part.clip)); }
    ctx.strokeStyle = o.ink || part.c || INK; ctx.lineWidth = part.w * LS; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke(pp);
    if (part.clip) ctx.restore();
    return;
  }
  const clipped = part.clip || part.out;
  if (clipped) { ctx.save(); clipTo(ctx, part); }
  if (fill) { ctx.fillStyle = fill; ctx.fill(pp, rule); }
  if (part.w > 0 && o.outline !== false) {
    ctx.strokeStyle = o.ink || INK; ctx.lineWidth = part.w * LS; ctx.lineJoin = 'round';
    if (part.soft) ctx.globalAlpha = 0.55;
    ctx.stroke(pp);
    ctx.globalAlpha = 1;
  }
  if (clipped) {
    ctx.restore();
    // the clip's own edge gets its line back (a stripe painted over the head's outline)
    if (part.clip && o.outline !== false && part.w > 0 && !part.soft) { ctx.strokeStyle = o.ink || INK; ctx.lineWidth = Math.max(2, part.w) * LS; ctx.stroke(path(part.clip)); }
  }
}

// The finished picture, every part in its own color (the level decides which parts exist: see logic.mjs).
export function drawFinished(ctx, parts) {
  for (const part of parts) drawPart(ctx, part, part.k === 'line' ? null : part.c);
}

// ---- the region map: which part shows at each pixel (fill parts by index, -1 for ink, lines, nothing) ----
function bbox(d) {
  const n = d.match(/-?\d+(?:\.\d+)?/g) || [];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i + 1 < n.length; i += 2) { const x = +n[i], y = +n[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}
export function partMap(parts, R = 400) {
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(R, R) : Object.assign(document.createElement('canvas'), { width: R, height: R });
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const label = new Int32Array(R * R).fill(-1);
  parts.forEach((part, i) => {
    let [x0, y0, x1, y1] = bbox(part.d);
    if (part.clip) { const c = bbox(part.clip); x0 = Math.max(x0, c[0]); y0 = Math.max(y0, c[1]); x1 = Math.min(x1, c[2]); y1 = Math.min(y1, c[3]); }
    const pad = part.k === 'line' ? part.w : 1;
    x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad));
    x1 = Math.min(R, Math.ceil(x1 + pad)); y1 = Math.min(R, Math.ceil(y1 + pad));
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    ctx.clearRect(x0, y0, w, h);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    ctx.fillStyle = '#000'; ctx.strokeStyle = '#000';
    if (part.k === 'line') {
      if (part.clip) ctx.clip(path(part.clip));
      ctx.lineWidth = part.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path(part.d));
    } else {
      clipTo(ctx, part);
      ctx.fill(path(part.d), part.rule || 'nonzero');
    }
    ctx.restore();
    const img = ctx.getImageData(x0, y0, w, h).data, v = part.k === 'fill' ? i : -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (img[(y * w + x) * 4 + 3] >= 128) label[(y0 + y) * R + x0 + x] = v;
  });
  return label;
}

// ---- a puzzle as it stands: blank spots, the chosen color's spots lit, filled spots in color ----
export const BLANK = '#f7f4fa', LIT = '#d4cce0';
const SHARDS = new WeakMap();
function shardInfo(P) {
  let s = SHARDS.get(P);
  if (s) return s;
  const byPart = new Map(), cellUnit = new Map();
  P.units.forEach((u, i) => {
    if (!byPart.has(u.part)) byPart.set(u.part, []);
    byPart.get(u.part).push(i);
    if (u.cells) for (const c of u.cells) cellUnit.set(u.part * 65536 + c, i);
  });
  const clips = new Map(), edges = new Map();
  if (P.cells) {
    for (const p of P.cut) {
      let d = '';
      for (const e of P.cells.edges) {
        const ua = cellUnit.get(p * 65536 + e.a), ub = cellUnit.get(p * 65536 + e.b);
        if (ua !== ub) d += `M${e.x1.toFixed(1)} ${e.y1.toFixed(1)}L${e.x2.toFixed(1)} ${e.y2.toFixed(1)}`;
      }
      edges.set(p, new Path2D(d));
    }
    P.units.forEach((u, i) => { if (u.cells) clips.set(i, new Path2D(u.cells.map((c) => 'M' + P.cells.polys[c].map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z').join(''))); });
  }
  const pbox = P.parts.map((part) => {
    const b = bbox(part.d), pad = (part.w || 0) + 2;
    if (part.clip) { const c = bbox(part.clip); b[0] = Math.max(b[0], c[0]); b[1] = Math.max(b[1], c[1]); b[2] = Math.min(b[2], c[2]); b[3] = Math.min(b[3], c[3]); }
    return [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad];
  });
  s = { byPart, clips, edges, pbox };
  SHARDS.set(P, s);
  return s;
}
// P: the puzzle plus its level's parts (P.parts). st: { filled: Set, sel: number, all: true for finished }
// rect (optional, picture units): only parts that reach into it are drawn (the caller clips to it).
export function drawPuzzle(ctx, P, st, rect = null) {
  const { byPart, clips, edges, pbox } = shardInfo(P);
  const colorOf = (i) => { const u = P.units[i]; return st.all || u.auto || st.filled.has(i) ? u.color : st.sel === u.num ? LIT : BLANK; };
  P.parts.forEach((part, p) => {
    if (rect) { const b = pbox[p]; if (b[2] < rect[0] || b[0] > rect[2] || b[3] < rect[1] || b[1] > rect[3]) return; }
    if (part.k !== 'fill') { drawPart(ctx, part, part.k === 'line' ? null : part.c); return; }
    const us = byPart.get(p);
    if (!us) { drawPart(ctx, part, st.all ? part.c : BLANK); return; }
    if (!P.cut.has(p)) { drawPart(ctx, part, colorOf(us[0])); return; }
    // glass: one clip to the part, then each piece is a plain polygon fill
    ctx.save(); clipTo(ctx, part); ctx.clip(path(part.d), part.rule || 'nonzero');
    ctx.fillStyle = BLANK; ctx.fillRect(pbox[p][0] - 2, pbox[p][1] - 2, pbox[p][2] - pbox[p][0] + 4, pbox[p][3] - pbox[p][1] + 4);
    for (const i of us) {
      const c = colorOf(i);
      if (c === BLANK) continue;
      ctx.fillStyle = c; ctx.fill(clips.get(i));
    }
    ctx.strokeStyle = INK; ctx.globalAlpha = 0.7; ctx.lineWidth = (P.lv >= 3 ? 1.3 : 1.5) * LS; ctx.lineJoin = 'round';
    ctx.stroke(edges.get(p)); ctx.restore();
    drawPart(ctx, part, null);
  });
}
