/* IRL's scenes (JC, Nov 15 2026: "an animation as the main view that syncs to my movement. Much like how
   NEX Playground displays an animation with a camera view of the players on the upper or bottom
   corner"). The page shows one of these full screen and the camera picture small in a corner.
     - the four sports games are worlds of their own, seen through a little 3D camera (cam3): a bowling
       lane, a football field from behind the quarterback, a basketball hoop from the free-throw line,
       a tennis court from behind the baseline. What the player holds (ball, football, racket) is drawn
       in the front and follows their hand.
     - the other challenges keep their own play area (the camera picture's shape, where targets, shots
       and silos already live) and get a backdrop around it and the player's lab avatar as a comic
       puppet that copies their pose (drawPuppet), instead of the camera picture.
   Comic look: flat colors, ink outlines, halftone dots. Nothing here reads the camera. */
import { LANE, routeAt, defenderAt, isOpen, tennisBall, tennisBack, HOOPS, FLY } from './sports.mjs';
import { drawRear } from '../send-it/rear.mjs';   // Send It!'s contraptions from behind (public/send-it/ next door)

const INK = '#120E18', PAPER = '#FFF8EC';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const seenP = (p, min = 0.45) => !!p && (p.visibility == null || p.visibility > min);

// A camera in a scene: at (x, y, z) looking along +z, tipped down by `pitch` radians, `f` pixels of
// focal length, the middle of the view at (cx, cy). project(x, y, z) answers the screen spot and the
// scale there (pixels a meter), or null behind the camera.
export function cam3({ x = 0, y = 1.5, z = -3, pitch = 0, f = 500, cx = 0, cy = 0 }) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return (px, py, pz) => {
    const dx = px - x, dy = py - y, dz = pz - z;
    const yy = dy * cp + dz * sp, zz = dz * cp - dy * sp;
    if (zz < 0.05) return null;
    const k = f / zz;
    return { x: cx + dx * k, y: cy - yy * k, k, z: zz };
  };
}
function poly(ctx, pts, fill, stroke = INK, lw = 3) {
  const ps = pts.filter(Boolean);
  if (ps.length < 3) return;
  ctx.beginPath(); ps.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function seg(ctx, a, b, color, w) { if (!a || !b) return; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke(); }
/* Light mode (Nov 15 2026: IRL froze on an iPhone 17 that ran it alongside the camera and the tracker):
   the page turns it on when the phone is struggling, or the player does in the camera sheet. Scenes then
   skip the halftone dots and the crowd's sway. */
const LITE = { on: false };
export const setLite = (on) => { LITE.on = !!on; };
const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// Halftone dots over a region (the comic print look): one fill with a pattern of two dots, rows offset
// by half a gap (it was a fill per dot, thousands a frame, the heaviest thing in a scene).
const DOT_PATS = new Map();
function dots(ctx, r, color = 'rgba(255,248,236,0.08)', gap = 9) {
  if (LITE.on) return;
  let pat = DOT_PATS.get(color + gap);
  if (!pat) {
    const k = 2, c = canvasOf(gap * k, gap * 2 * k), g = c.getContext('2d');
    g.scale(k, k); g.fillStyle = color;
    for (const [x, y] of [[0, gap / 2], [gap, gap / 2], [gap / 2, gap * 1.5]]) { g.beginPath(); g.arc(x, y, 1.2, 0, Math.PI * 2); g.fill(); }
    pat = ctx.createPattern(c, 'repeat');
    if (pat.setTransform && typeof DOMMatrix === 'function') pat.setTransform(new DOMMatrix([1 / k, 0, 0, 1 / k, 0, 0]));
    DOT_PATS.set(color + gap, pat);
  }
  ctx.save(); ctx.fillStyle = pat; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore();
}
// A still layer: what doesn't move in a scene, painted once into its own canvas (again only when `key`
// or the rectangle changes) and copied each frame. One per side of the screen; switching games lets the
// last game's go (a canvas only gives its memory back to iPhone when it's shrunk to nothing).
const LAYERS = new Map();
function still(ctx, kind, key, rect, paint) {
  const id = kind + (rect.x > 1 ? 'R' : 'L'), dpr = ctx.getTransform ? ctx.getTransform().a || 1 : 1;
  for (const [k, L] of LAYERS) if (!k.startsWith(kind)) { L.c.width = L.c.height = 0; LAYERS.delete(k); }
  const w = Math.max(1, Math.round(rect.w * dpr)), h = Math.max(1, Math.round(rect.h * dpr));
  const full = [key, rect.x, rect.y, rect.w, rect.h, dpr, LITE.on, fontsIn()].join('|');
  let L = LAYERS.get(id);
  if (!L) { L = { c: canvasOf(w, h), key: '' }; LAYERS.set(id, L); }
  if (L.key !== full) {
    if (L.c.width !== w || L.c.height !== h) { L.c.width = w; L.c.height = h; }
    const g = L.c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, -rect.x * dpr, -rect.y * dpr); g.clearRect(rect.x, rect.y, rect.w, rect.h);
    paint(g); L.key = full;
  }
  ctx.drawImage(L.c, rect.x, rect.y, rect.w, rect.h);
}
function label(ctx, text, x, y, size, fill = PAPER, stroke = INK, align = 'center') {
  ctx.font = `${Math.round(size)}px Bangers, Impact, "Arial Narrow Bold", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.16); ctx.strokeStyle = stroke; ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
// The player's hand on screen, for what they hold: the hand (wrist or finger) mapped from their part of
// the camera picture into the scene's frame. Answers null when the camera can't see it.
export function handIn(lm, i, rect, info) {
  const p = lm && (seenP(lm[i]) ? lm[i] : seenP(lm[i + 4]) ? lm[i + 4] : null);
  if (!p) return null;
  const sx = info.mirror ? 1 - p.x : p.x, [a, z] = info.range;
  return { x: rect.x + clamp((sx - a) / (z - a), -0.1, 1.1) * rect.w, y: rect.y + clamp(p.y, 0, 1.1) * rect.h, p };
}
const handsOf = (lm, rect, info) => [handIn(lm, 15, rect, info), handIn(lm, 16, rect, info)];

/* ---------------------------------------------------------------------------------------------------
   The player as a puppet: their lab avatar's head on a comic body whose joints are their joints.
   look: { head (an Image of the avatar), skin, shirt, pants }.
   --------------------------------------------------------------------------------------------------- */
export function drawPuppet(ctx, lm, at, look, ring = null) {
  const ok = (i) => seenP(lm[i]);
  const pt = (i) => (ok(i) ? at(lm[i]) : null);
  const ls = pt(11), rs = pt(12), lh = pt(23), rh = pt(24);
  if (!ls && !rs) return;
  const sw = ls && rs ? Math.max(18, Math.hypot(ls.x - rs.x, ls.y - rs.y)) : 40;
  const limb = (a, b, w, color) => { if (!a || !b) return; seg(ctx, a, b, INK, w + 6); seg(ctx, a, b, color, w); };
  // the shadow under the feet (in the player's color, two players)
  const feet = [pt(27), pt(28), pt(31), pt(32)].filter(Boolean);
  if (feet.length) {
    const fy = Math.max(...feet.map((p) => p.y)), fx = feet.reduce((s, p) => s + p.x, 0) / feet.length;
    ctx.save(); ctx.beginPath(); ctx.ellipse(fx, fy + 4, sw * 0.9, sw * 0.22, 0, 0, Math.PI * 2); ctx.fillStyle = ring ? ring + '66' : 'rgba(5,3,10,0.35)'; ctx.fill(); ctx.restore();
  }
  const pants = look.pants || '#2B3A67', shoe = INK;
  limb(lh, pt(25), sw * 0.36, pants); limb(pt(25), pt(27), sw * 0.3, pants);
  limb(rh, pt(26), sw * 0.36, pants); limb(pt(26), pt(28), sw * 0.3, pants);
  for (const [a, f] of [[27, 31], [28, 32]]) { const A = pt(a), F = pt(f); if (A && F) limb(A, F, sw * 0.22, shoe); }
  // the torso: shoulders to hips, a little wider than the joints
  if (ls && rs) {
    const hl = lh || { x: ls.x, y: ls.y + sw * 1.4 }, hr = rh || { x: rs.x, y: rs.y + sw * 1.4 };
    const mid = { x: (ls.x + rs.x + hl.x + hr.x) / 4, y: (ls.y + rs.y + hl.y + hr.y) / 4 }, grow = (p, k) => ({ x: mid.x + (p.x - mid.x) * k, y: mid.y + (p.y - mid.y) * k });
    poly(ctx, [grow(ls, 1.18), grow(rs, 1.18), grow(hr, 1.1), grow(hl, 1.1)], look.shirt || '#2D6BFF', INK, 4);
    // the neck
    const nk = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
    limb(nk, { x: nk.x, y: nk.y - sw * 0.35 }, sw * 0.28, look.skin || '#E8B07E');
  }
  limb(ls, pt(13), sw * 0.3, look.shirt || '#2D6BFF'); limb(pt(13), pt(15) || pt(19), sw * 0.24, look.skin || '#E8B07E');
  limb(rs, pt(14), sw * 0.3, look.shirt || '#2D6BFF'); limb(pt(14), pt(16) || pt(20), sw * 0.24, look.skin || '#E8B07E');
  for (const i of [15, 16]) { const h = pt(i) || pt(i + 4); if (h) { ctx.beginPath(); ctx.arc(h.x, h.y, sw * 0.17, 0, Math.PI * 2); ctx.fillStyle = look.skin || '#E8B07E'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); } }
  // the head: the avatar drawing, centered between the ears (or on the nose), a big comic head
  const el = pt(7), er = pt(8), nose = pt(0);
  let hc = null, hw = sw * 0.9;
  if (el && er) { hc = { x: (el.x + er.x) / 2, y: (el.y + er.y) / 2 - sw * 0.05 }; hw = Math.max(hw, Math.hypot(el.x - er.x, el.y - er.y) * 1.5); }
  else if (nose) hc = { x: nose.x, y: nose.y - sw * 0.12 };
  else if (ls && rs) hc = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 - sw * 0.75 };
  if (!hc) return;
  hw = Math.min(hw, sw * 1.3) * 1.15;
  // the avatar drawn once onto a canvas when it loaded (look.bmp): Safari redraws an SVG picture from
  // scratch every time it's put on a canvas
  const img = look.bmp || (look.head && look.head.complete && look.head.naturalWidth ? look.head : null);
  if (img) {
    // the avatar's head sits at (50, 50.5) of its 100 box, 35 wide; draw its top three quarters
    const D = (hw / 35) * 100, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    ctx.drawImage(img, 0, 0, iw, ih * 0.74, hc.x - D * 0.5, hc.y - D * 0.505, D, D * 0.74);
  } else {
    ctx.beginPath(); ctx.ellipse(hc.x, hc.y, hw * 0.5, hw * 0.58, 0, 0, Math.PI * 2); ctx.fillStyle = look.skin || '#E8B07E'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  }
}

/* ---------------------------------------------------------------------------------------------------
   Backdrops for the challenges that keep their own play area (the camera picture's shape, `play`).
   W × H is the whole screen; the floor line is where the player's feet would be.
   --------------------------------------------------------------------------------------------------- */
const BACK = {
  squat: 'gym', pushup: 'gym', wallsit: 'wall', dribble: 'court', targets: 'carnival', keeper: 'stadium', avocado: 'kitchen', derby: 'farm', workout: 'gym',
};
// What doesn't move is painted once into a canvas the size of the screen and copied each frame; only the
// carnival's bulbs and the crowd are drawn live. `dpr` is the canvas's pixels per screen point.
const BG = { c: null, key: '' };
const fontsIn = () => { try { return document.fonts ? document.fonts.check('20px Bangers') : true; } catch { return true; } };
export function drawBackdrop(ctx, kind, W, H, play, t, cheer = 0, dpr = 1) {
  const kindOf = BACK[kind] || 'gym', floor = play.y + play.h * 0.9;
  const key = [kindOf, Math.round(W), Math.round(H), Math.round(floor), dpr, LITE.on, fontsIn()].join('|');
  if (BG.key !== key) {
    const w = Math.max(1, Math.round(W * dpr)), h = Math.max(1, Math.round(H * dpr));
    if (!BG.c) BG.c = canvasOf(w, h);
    else if (BG.c.width !== w || BG.c.height !== h) { BG.c.width = w; BG.c.height = h; }
    const g = BG.c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    backdropStill(g, kindOf, W, H, floor);
    BG.key = key;
  }
  ctx.drawImage(BG.c, 0, 0, W, H);
  if (kindOf === 'carnival') {
    // the bulbs blink, two colors swapping
    for (const on of [0, 1]) {
      ctx.beginPath();
      for (let x = 14; x < W; x += 34) if (((Math.floor(t / 300) + x) % 2) === on) { ctx.moveTo(x + 5, floor * 0.2); ctx.arc(x, floor * 0.2, 5, 0, Math.PI * 2); }
      ctx.fillStyle = on ? '#FFD23F' : '#FFF3B0'; ctx.fill();
    }
  } else if (kindOf === 'stadium') {
    const bob = (i) => (cheer ? Math.max(0, Math.sin((t - cheer) / 80 + i)) * 10 * Math.max(0, 1 - (t - cheer) / 900) : 0);
    crowd(ctx, 0, floor * 0.45, W, floor * 0.5, t, bob);
  }
}
function backdropStill(ctx, kindOf, W, H, floor) {
  const sky = { gym: ['#2A2140', '#3B2E58'], wall: ['#5A2E2E', '#3E2222'], court: ['#1F2B4A', '#2F3E66'], carnival: ['#3B1747', '#5C2266'], stadium: ['#0E1630', '#1B2A55'], kitchen: ['#E8F4F2', '#CFE6E2'], farm: ['#7FD3FF', '#D8F2FF'] }[kindOf];
  const g = ctx.createLinearGradient(0, 0, 0, floor);
  g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, floor);
  const floorCol = { gym: '#C9925A', wall: '#7A6A5A', court: '#D9A066', carnival: '#6B4226', stadium: '#3E9B4F', kitchen: '#B7895B', farm: '#5DBB4F' }[kindOf];
  ctx.fillStyle = floorCol; ctx.fillRect(0, floor, W, H - floor);
  // floor boards or grass stripes running away from you
  ctx.save(); ctx.strokeStyle = 'rgba(18,14,24,0.18)'; ctx.lineWidth = 2;
  const vx = W / 2;
  ctx.beginPath();
  for (let i = -8; i <= 8; i++) { ctx.moveTo(vx + i * W * 0.04, floor); ctx.lineTo(vx + i * W * 0.22, H); }
  for (let k = 1; k < 5; k++) { const y = floor + (H - floor) * (k / 5) ** 1.6; ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(0, floor); ctx.lineTo(W, floor); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  if (kindOf === 'gym' || kindOf === 'wall') {
    if (kindOf === 'wall') {
      ctx.save(); ctx.strokeStyle = 'rgba(18,14,24,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let y = 0, r = 0; y < floor; y += 26, r++) { ctx.moveTo(0, y); ctx.lineTo(W, y); for (let x = (r % 2) * 30; x < W; x += 60) { ctx.moveTo(x, y); ctx.lineTo(x, y + 26); } }
      ctx.stroke(); ctx.restore();
    } else {
      // gym banners and a dumbbell rack along the wall
      for (let i = 0; i < 4; i++) { const x = W * (0.12 + i * 0.25); poly(ctx, [{ x: x - 30, y: 0 }, { x: x + 30, y: 0 }, { x: x + 30, y: floor * 0.32 }, { x, y: floor * 0.26 }, { x: x - 30, y: floor * 0.32 }], ['#FFD23F', '#FF3D8B', '#29D3F0', '#5BE38A'][i], INK, 3); }
      ctx.fillStyle = 'rgba(18,14,24,0.55)'; ctx.fillRect(0, floor - 30, W, 8);
      for (let x = 20; x < W; x += 46) { ctx.fillStyle = INK; ctx.fillRect(x, floor - 40, 26, 6); ctx.beginPath(); ctx.arc(x, floor - 37, 9, 0, Math.PI * 2); ctx.arc(x + 26, floor - 37, 9, 0, Math.PI * 2); ctx.fill(); }
      label(ctx, 'IRL GYM', W / 2, Math.max(28, floor * 0.12), Math.min(48, W * 0.07), '#FFD23F');
    }
  } else if (kindOf === 'court') {
    // the hoop on the back wall and the key on the floor
    const hx = W / 2, hy = Math.max(40, floor * 0.3);
    poly(ctx, [{ x: hx - 60, y: hy - 40 }, { x: hx + 60, y: hy - 40 }, { x: hx + 60, y: hy + 30 }, { x: hx - 60, y: hy + 30 }], PAPER, INK, 4);
    poly(ctx, [{ x: hx - 20, y: hy - 6 }, { x: hx + 20, y: hy - 6 }, { x: hx + 20, y: hy + 22 }, { x: hx - 20, y: hy + 22 }], null, '#E8322E', 4);
    ctx.beginPath(); ctx.ellipse(hx, hy + 30, 26, 7, 0, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = '#FF7A1A'; ctx.stroke();
    poly(ctx, [{ x: W * 0.36, y: floor }, { x: W * 0.64, y: floor }, { x: W * 0.8, y: H }, { x: W * 0.2, y: H }], 'rgba(255,61,139,0.35)', PAPER, 3);
  } else if (kindOf === 'carnival') {
    for (let i = 0; i < 12; i++) { const x0 = (W / 12) * i; poly(ctx, [{ x: x0, y: 0 }, { x: x0 + W / 12, y: 0 }, { x: x0 + W / 24, y: floor * 0.18 }], i % 2 ? '#FF3D8B' : PAPER, INK, 2); }
    ctx.fillStyle = '#8A5A36'; ctx.fillRect(0, floor - 26, W, 26); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(-2, floor - 26, W + 4, 26);
    label(ctx, 'SMASH-O-RAMA', W / 2, Math.max(26, floor * 0.1), Math.min(40, W * 0.06), '#FFD23F');
  } else if (kindOf === 'stadium') {
    // floodlights (the crowd in the stands is drawn live)
    for (const fx of [0.08, 0.92]) { const x = W * fx; ctx.fillStyle = '#FFF6C2'; ctx.beginPath(); ctx.arc(x, 30, 16, 0, Math.PI * 2); ctx.fill(); ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#FFF6C2'; ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(W / 2 - 160, floor); ctx.lineTo(W / 2 + 160, floor); ctx.closePath(); ctx.fill(); ctx.restore(); }
  } else if (kindOf === 'kitchen') {
    ctx.save(); ctx.strokeStyle = 'rgba(18,14,24,0.12)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let y = 0; y < floor; y += 36) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    for (let x = 0; x < W; x += 36) { ctx.moveTo(x, 0); ctx.lineTo(x, floor); }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#8C5CFF'; ctx.fillRect(0, floor - 18, W, 18); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(-2, floor - 18, W + 4, 18);
    label(ctx, 'GUAC SHACK', W / 2, Math.max(26, floor * 0.1), Math.min(40, W * 0.06), '#5BE38A');
  } else if (kindOf === 'farm') {
    ctx.fillStyle = '#7CCB5A'; ctx.beginPath(); ctx.moveTo(0, floor * 0.75); ctx.quadraticCurveTo(W * 0.3, floor * 0.55, W * 0.6, floor * 0.72); ctx.quadraticCurveTo(W * 0.85, floor * 0.6, W, floor * 0.7); ctx.lineTo(W, floor); ctx.lineTo(0, floor); ctx.closePath(); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#FFF8EC'; for (let x = 0; x < W; x += 40) ctx.fillRect(x, floor - 26, 6, 26);
    ctx.fillRect(0, floor - 22, W, 4); ctx.fillRect(0, floor - 12, W, 4);
    ctx.fillStyle = '#FFE66B'; ctx.beginPath(); ctx.arc(W * 0.85, 40, 22, 0, Math.PI * 2); ctx.fill();
  }
  dots(ctx, { x: 0, y: 0, w: W, h: H }, kindOf === 'kitchen' || kindOf === 'farm' ? 'rgba(18,14,24,0.05)' : 'rgba(255,248,236,0.05)');
}
// The crowd in the stands: a body and a head each, every color drawn as one shape (a fill each person
// was a few hundred fills a frame). Light mode stops the sway; a cheer still bounces them.
function crowd(ctx, x0, y0, w, h, t, bob = () => 0) {
  const cols = ['#FF3D8B', '#29D3F0', '#FFD23F', '#5BE38A', '#C77DFF', '#FF8A3D'], skins = ['#F6C8A0', '#CF935F', '#86522E', '#E8B07E'];
  ctx.fillStyle = 'rgba(18,14,24,0.6)'; ctx.fillRect(x0, y0, w, h);
  const sway = LITE.on ? 0 : 1.5, spots = [];
  let i = 0;
  for (let row = 0; row < 3; row++) for (let x = x0 + 10 + (row % 2) * 12; x < x0 + w; x += 24, i++) spots.push({ x, y: y0 + 16 + row * (h / 3.2) - bob(i) - Math.sin(t / 400 + i) * sway, i });
  cols.forEach((c, k) => { ctx.beginPath(); for (const s of spots) if (s.i % cols.length === k) { ctx.moveTo(s.x + 9, s.y + 10); ctx.arc(s.x, s.y + 10, 9, 0, Math.PI, true); } ctx.fillStyle = c; ctx.fill(); });
  skins.forEach((c, k) => { ctx.beginPath(); for (const s of spots) if (s.i % skins.length === k) { ctx.moveTo(s.x + 6, s.y); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); } ctx.fillStyle = c; ctx.fill(); });
}

/* ---------------------------------------------------------------------------------------------------
   The four sports worlds. Each takes the screen rectangle it owns (all of it alone, a half for two),
   the game's counter, the time, and { lm, mirror, range, color, aspect } for what the player holds.
   --------------------------------------------------------------------------------------------------- */
export function drawSport(ctx, kind, rect, c, t, info) {
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  if (kind === 'bowling') bowlingScene(ctx, rect, c, t, info);
  else if (kind === 'qb') qbScene(ctx, rect, c, t, info);
  else if (kind === 'hoops') hoopsScene(ctx, rect, c, t, info);
  else if (kind === 'tennis') tennisScene(ctx, rect, c, t, info);
  else if (kind === 'sendit') sendItScene(ctx, rect, c, t, info);
  ctx.restore();
}

/* ---- BOWLING: the lane from behind the ball, pins far ahead, the scoresheet on top ---- */
// The camera behind the ball: zoomed so the pins stand `pins` of the way down (below the scoresheet).
function bowlingCam(rect, pins = 0.29) {
  const f = Math.min(rect.h * 4.2, rect.w * 8);
  return cam3({ x: 0, y: 1.0, z: -3.6, pitch: 0.0365 + ((0.5 - pins) * rect.h) / f, f, cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2 });
}
// The scoresheet's spot: under the top bar on a narrow screen, else up between its buttons; a name
// above it for two players.
function sheetBox(rect, c, info) {
  const n = c && c.card ? c.card.frames.length : 5, bw = Math.min(rect.w < 560 ? 52 : 64, (rect.w - 70) / n), bh = bw * 0.82;
  const top = rect.y + (rect.w < 560 ? (info.top || 60) : 8), y0 = top + (info.name ? 22 : 0);
  return { n, bw, bh, top, y0, bottom: y0 + bh };
}
function pinShape(ctx, x, y, k, tip = 0, dirX = 0, alpha = 1) {
  const h = 0.38 * k, w = 0.12 * k;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
  ctx.rotate(tip * (Math.PI / 2) * (dirX >= 0 ? 1 : -1) * (Math.abs(dirX) > 0.3 ? 1 : 0.35));
  if (Math.abs(dirX) <= 0.3) ctx.scale(1, 1 - tip * 0.7);
  ctx.beginPath();
  ctx.moveTo(-w * 0.32, 0);
  ctx.bezierCurveTo(-w * 0.62, -h * 0.25, -w * 0.55, -h * 0.45, -w * 0.22, -h * 0.62);
  ctx.bezierCurveTo(-w * 0.18, -h * 0.72, -w * 0.38, -h * 0.9, 0, -h);
  ctx.bezierCurveTo(w * 0.38, -h * 0.9, w * 0.18, -h * 0.72, w * 0.22, -h * 0.62);
  ctx.bezierCurveTo(w * 0.55, -h * 0.45, w * 0.62, -h * 0.25, w * 0.32, 0);
  ctx.closePath();
  ctx.fillStyle = PAPER; ctx.fill(); ctx.lineWidth = Math.max(1, k * 0.012); ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = '#E8322E'; ctx.fillRect(-w * 0.2, -h * 0.72, w * 0.4, h * 0.035); ctx.fillRect(-w * 0.22, -h * 0.66, w * 0.44, h * 0.035);
  ctx.restore();
}
// The alley, the lanes, the masking panel and the neighbors' pins: none of it moves (a still layer).
function bowlingAlley(ctx, rect, P) {
  const L = LANE, half = L.w / 2;
  // the alley: a warm wall with big pop dots
  const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h * 0.4);
  g.addColorStop(0, '#E9E3F2'); g.addColorStop(1, '#CFC6E0');
  ctx.fillStyle = g; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const dotsAt = [[0.1, 0.06, 0.07, '#B6E36A'], [0.3, 0.02, 0.05, '#FFB14A'], [0.55, 0.08, 0.06, '#7CC8FF'], [0.78, 0.03, 0.08, '#FF8DBE'], [0.92, 0.12, 0.05, '#FFD23F'], [0.42, 0.16, 0.035, '#C77DFF']];
  for (const [fx, fy, r, col] of dotsAt) { ctx.beginPath(); ctx.arc(rect.x + rect.w * fx, rect.y + rect.h * fy, rect.h * r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); }
  dots(ctx, rect, 'rgba(18,14,24,0.05)');
  // the lanes: ours and a neighbor each side
  for (const off of [-1.63, 1.63, 0]) {
    const lane = (x0, x1, z0, z1, col, lw = 2) => poly(ctx, [P(off + x0, 0, z0), P(off + x1, 0, z0), P(off + x1, 0, z1), P(off + x0, 0, z1)], col, INK, lw);
    lane(-half - L.gutter, -half, -1.2, L.len + L.deck, '#4A4458');               // gutters
    lane(half, half + L.gutter, -1.2, L.len + L.deck, '#4A4458');
    lane(-half, half, -1.2, 0, off ? '#C8A47A' : '#D9B385');                        // approach
    lane(-half, half, 0, L.len - 0.4, off ? '#E7CBA3' : '#F2D9AE');                  // the lane
    lane(-half, half, L.len - 0.4, L.len + L.deck, off ? '#EEDCC0' : '#FAEBD0');      // the pin deck
    if (off) continue;
    // boards, the foul line, the arrows and the dots
    ctx.save(); ctx.strokeStyle = 'rgba(138,90,54,0.22)'; ctx.lineWidth = 1;
    for (let b = -half; b <= half + 1e-6; b += L.w / 13) { const a = P(b, 0, 0), z = P(b, 0, L.len - 0.4); if (a && z) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(z.x, z.y); ctx.stroke(); } }
    ctx.restore();
    poly(ctx, [P(-half, 0, -0.02), P(half, 0, -0.02), P(half, 0, 0.04), P(-half, 0, 0.04)], '#E8322E', null);
    for (let i = -3; i <= 3; i++) { const x = i * 0.12, z = 4.6 + Math.abs(i) * 0.3; poly(ctx, [P(x - 0.025, 0, z), P(x + 0.025, 0, z), P(x, 0, z + 0.2)], '#29D3F0', null); }
    for (let i = -2; i <= 2; i++) { const p = P(i * 0.15, 0, 2.1); if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, p.k * 0.012), 0, Math.PI * 2); ctx.fillStyle = '#8A5A36'; ctx.fill(); } }
  }
  // the pinsetter's masking panel over the three lanes
  const m0 = P(-2.5, 1.3, L.len + 1.0), m1 = P(2.5, 0.55, L.len + 1.0);
  if (m0 && m1) {
    poly(ctx, [{ x: m0.x, y: m0.y }, { x: m1.x, y: m0.y }, { x: m1.x, y: m1.y }, { x: m0.x, y: m1.y }], '#B6E36A', INK, 3);
    for (const off of [-1.63, 0, 1.63]) { const a = P(off - 0.6, 0.9, L.len + 0.99), b = P(off + 0.6, 0.62, L.len + 0.99); if (a && b) poly(ctx, [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }], '#FF9F1C', INK, 2); }
    ctx.fillStyle = '#1F1A2A'; const d0 = P(-half - L.gutter, 0.55, L.len + 0.99), d1 = P(half + L.gutter, 0, L.len + 0.99); if (d0 && d1) ctx.fillRect(d0.x, d0.y, d1.x - d0.x, d1.y - d0.y);
    // the neighbors' pins, standing far off
    for (const off of [-1.63, 1.63]) for (let k = 0; k < 4; k++) for (let i = 0; i <= k; i++) { const p = P(off + (i - k / 2) * L.pinGap, 0, L.len + k * L.rowDz); if (p) pinShape(ctx, p.x, p.y, p.k, 0, 0, 0.9); }
  }
}
function bowlingScene(ctx, rect, c, t, info) {
  const sb = sheetBox(rect, c, info);
  const pinsAt = Math.max(0.29, (sb.bottom - rect.y) / rect.h + 0.11);
  const P = bowlingCam(rect, pinsAt), L = LANE, half = L.w / 2;
  still(ctx, 'bowling', pinsAt.toFixed(4), rect, (ctx) => bowlingAlley(ctx, rect, P));
  // our pins, far ones first
  const pins = [...(c ? c.pins : [])].filter((p) => !p.gone).sort((a, b) => b.z - a.z);
  for (const p of pins) { const s = P(p.x, 0, p.z); if (s) pinShape(ctx, s.x, s.y, s.k, p.down ? p.tip : 0, p.tx); }
  // the ball rolling down the lane
  const ball = c && c.ball;
  if (ball && !ball.gone) {
    const s = P(ball.x, ball.gutter ? -0.05 : 0, ball.z), r = s && Math.max(3, L.ballR * s.k);
    if (s) {
      ctx.beginPath(); ctx.ellipse(s.x, s.y, r * 1.1, r * 0.35, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(18,14,24,0.25)'; ctx.fill();
      bowlBall(ctx, s.x, s.y - r, r, ball.spin, info.color);
    }
  }
  // ready: where the ball will leave the foul line, and the ball in your hand following it
  if (c && c.phase === 'ready') {
    const a = P(c.aim, 0, 0.3), b = P(c.aim, 0, 6);
    if (a && b) {
      ctx.save(); ctx.setLineDash([8, 10]); seg(ctx, a, b, 'rgba(255,255,255,0.8)', 3); ctx.restore();
      poly(ctx, [P(c.aim - 0.07, 0, 0.2), P(c.aim + 0.07, 0, 0.2), P(c.aim, 0, 0.55)], '#FFD23F', INK, 2);
    }
    const hs = handsOf(info.lm, rect, info).filter(Boolean);
    const h = hs.sort((p, q) => q.y - p.y)[0];
    const r = Math.min(rect.w, rect.h) * 0.11;
    const bx = h ? clamp(h.x, rect.x + r, rect.x + rect.w - r) : rect.x + rect.w / 2 + (a ? a.x - (rect.x + rect.w / 2) : 0);
    const by = h ? clamp(rect.y + rect.h * 0.62 + (h.y - (rect.y + rect.h * 0.55)) * 0.9, rect.y + rect.h * 0.45, rect.y + rect.h - r * 0.5) : rect.y + rect.h - r;
    bowlBall(ctx, bx, by, r, t / 900, info.color);
  }
  scoresheet(ctx, rect, c, info, sb);
}
function bowlBall(ctx, x, y, r, spin, color = '#C77DFF') {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.25, color); g.addColorStop(1, shade(color, 0.55));
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = Math.max(2, r * 0.08); ctx.strokeStyle = INK; ctx.stroke();
  ctx.rotate(spin);
  ctx.fillStyle = 'rgba(18,14,24,0.75)';
  for (const [dx, dy] of [[-0.18, -0.3], [0.14, -0.32], [-0.02, -0.08]]) { ctx.beginPath(); ctx.arc(dx * r, dy * r, r * 0.09, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function shade(hex, k) {
  const n = parseInt(String(hex).slice(1), 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
}
// The scoresheet across the top: each frame's balls and running score, the frame being bowled lit.
function scoresheet(ctx, rect, c, info, sb) {
  if (!c || !c.card) return;
  const card = c.card, nx = c.next, { n, bw, bh, y0 } = sb, x0 = rect.x + rect.w / 2 - (bw * n + 50) / 2;
  if (info.name) label(ctx, info.name.toUpperCase(), rect.x + rect.w / 2, sb.top + 10, 18, info.color || PAPER);
  // the total so far, after the frames
  const tot = card.total;
  card.frames.forEach((f, i) => {
    const x = x0 + i * bw, now = !nx.done && nx.frame === i + 1;
    ctx.fillStyle = now ? '#FFB14A' : '#7A4A2A'; ctx.fillRect(x, y0, bw, bh * 0.38);
    ctx.fillStyle = now ? '#FFE3B8' : '#FCE9D2'; ctx.fillRect(x, y0 + bh * 0.38, bw, bh * 0.62);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y0, bw, bh);
    ctx.font = `${Math.round(bh * 0.3)}px Bangers, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = PAPER; ctx.fillText(String(i + 1), x + bw / 2, y0 + bh * 0.2);
    ctx.fillStyle = '#7A4A2A'; ctx.font = `800 ${Math.round(bh * 0.2)}px Inter, system-ui, sans-serif`;
    f.marks.forEach((m, k) => ctx.fillText(m, x + bw * (0.22 + k * 0.28), y0 + bh * 0.5));
    if (f.score != null) { ctx.font = `${Math.round(bh * 0.3)}px Bangers, Impact, sans-serif`; ctx.fillText(String(f.score), x + bw / 2, y0 + bh * 0.8); }
  });
  const tx = x0 + bw * n + 6;
  if (tx + 46 < rect.x + rect.w) { ctx.fillStyle = INK; ctx.fillRect(tx, y0, 44, bh); ctx.strokeStyle = PAPER; ctx.lineWidth = 2; ctx.strokeRect(tx, y0, 44, bh); label(ctx, String(tot), tx + 22, y0 + bh * 0.55, bh * 0.45, '#FFD23F'); }
}

/* ---- QB THROW: the field from behind the quarterback ---- */
const FIELD_HALF = 26.65;
function qbCam(rect) {
  const f = Math.min(rect.w * 0.67, rect.h * 1.5);
  return cam3({ x: 0, y: 3.5, z: -15, pitch: 0.14, f, cx: rect.x + rect.w / 2, cy: rect.y + rect.h * 0.45 });
}
function player(ctx, s, jersey, num = '', tag = null, run = 0) {
  if (!s) return;
  const k = s.k, h = 1.95 * k, w = 0.75 * k;
  ctx.save(); ctx.translate(s.x, s.y);
  ctx.beginPath(); ctx.ellipse(0, 0, w * 0.6, w * 0.18, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(5,3,10,0.3)'; ctx.fill();
  const lw = Math.max(1, k * 0.06), leg = Math.sin(run * 12) * w * 0.25;
  ctx.strokeStyle = INK; ctx.lineCap = 'round';
  ctx.lineWidth = w * 0.28; ctx.beginPath(); ctx.moveTo(-w * 0.15, -h * 0.45); ctx.lineTo(-w * 0.18 + leg, 0); ctx.moveTo(w * 0.15, -h * 0.45); ctx.lineTo(w * 0.18 - leg, 0); ctx.stroke();
  ctx.fillStyle = jersey; ctx.beginPath(); ctx.roundRect(-w * 0.45, -h * 0.82, w * 0.9, h * 0.42, w * 0.18); ctx.fill(); ctx.lineWidth = lw; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -h * 0.9, w * 0.3, 0, Math.PI * 2); ctx.fillStyle = shade(jersey, 0.7); ctx.fill(); ctx.stroke();
  if (num && k > 6) { ctx.fillStyle = PAPER; ctx.font = `${Math.round(h * 0.2)}px Bangers, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(num, 0, -h * 0.6); }
  ctx.restore();
  if (tag) label(ctx, tag.text, s.x, s.y - h - Math.max(10, k * 0.5), Math.max(12, Math.min(26, k * 0.9)), tag.color);
}
function qbScene(ctx, rect, c, t, info) {
  const P = qbCam(rect);
  ctx.fillStyle = '#0F1A3A'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // the stadium: stands and lights past the end zone
  const far = P(0, 0, 70);
  const horizon = far ? far.y : rect.y + rect.h * 0.2;
  crowd(ctx, rect.x, Math.max(rect.y, horizon - rect.h * 0.16), rect.w, rect.h * 0.16, t);
  // the field, mowed in five-yard stripes
  for (let z = -15; z < 50; z += 5) poly(ctx, [P(-FIELD_HALF - 4, 0, z), P(FIELD_HALF + 4, 0, z), P(FIELD_HALF + 4, 0, z + 5), P(-FIELD_HALF - 4, 0, z + 5)], (Math.floor(z / 5) % 2 ? '#3E9B4F' : '#46AB57'), null);
  poly(ctx, [P(-FIELD_HALF, 0, 30), P(FIELD_HALF, 0, 30), P(FIELD_HALF, 0, 40), P(-FIELD_HALF, 0, 40)], '#C77DFF', PAPER, 3);
  const ez = P(0, 0, 35);
  if (ez) label(ctx, 'C A P R A', ez.x, ez.y, Math.max(12, ez.k * 2.6), PAPER, '#5B2A86');
  ctx.save(); ctx.strokeStyle = PAPER;
  for (let z = -10; z <= 30; z += 5) { const a = P(-FIELD_HALF, 0, z), b = P(FIELD_HALF, 0, z); if (a && b) { ctx.lineWidth = Math.max(1, a.k * 0.12); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
  for (const x of [-FIELD_HALF, FIELD_HALF]) { const a = P(x, 0, -15), b = P(x, 0, 40); if (a && b) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
  for (let z = 1; z < 30; z++) for (const x of [-3.1, 3.1]) { const a = P(x - 0.4, 0, z), b = P(x + 0.4, 0, z); if (a && b) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
  ctx.restore();
  for (let z = 10; z <= 20; z += 10) for (const x of [-15, 15]) { const p = P(x, 0, z); if (p) label(ctx, String(z), p.x, p.y - 2, Math.max(9, p.k * 1.6), PAPER, 'rgba(0,0,0,0)'); }
  // the goal posts
  const gp = (x, y) => P(x, y, 40);
  if (gp(0, 0)) { seg(ctx, gp(0, 0), gp(0, 3), '#FFD23F', 4); seg(ctx, gp(-2.8, 3), gp(2.8, 3), '#FFD23F', 4); seg(ctx, gp(-2.8, 3), gp(-2.8, 9), '#FFD23F', 4); seg(ctx, gp(2.8, 3), gp(2.8, 9), '#FFD23F', 4); }
  // the line of scrimmage
  const l0 = P(-FIELD_HALF, 0, 0), l1 = P(FIELD_HALF, 0, 0);
  if (l0 && l1) { ctx.lineWidth = 3; ctx.strokeStyle = '#29D3F0'; ctx.beginPath(); ctx.moveTo(l0.x, l0.y); ctx.lineTo(l1.x, l1.y); ctx.stroke(); }
  const play = c && c.play, s = c ? c.since(t) : -9;
  const us = info.color || '#FF8A3D', them = '#2B2530';
  // the linemen
  const crowdOf = [];
  for (let i = -2; i <= 2; i++) { crowdOf.push({ z: -0.8, x: i * 1.4, col: us, num: String(70 + i) }); crowdOf.push({ z: 0.9, x: i * 1.5 + 0.4, col: them, num: '' }); }
  const people = crowdOf.map((p) => ({ ...p, s: P(p.x, 0, p.z) }));
  if (play) {
    play.recv.forEach((r, i) => {
      const p = routeAt(r, s), d = defenderAt(r, s), open = s >= 0 && isOpen(r, s);
      const locked = c.lock && c.lock.r === r;
      people.push({ s: P(d.x, 0, d.z), col: them, num: '', run: s, z: d.z });
      people.push({ s: P(p.x, 0, p.z), col: us, num: String([1, 8, 88][i]), run: s, z: p.z, tag: open ? { text: 'OPEN!', color: '#FFD23F' } : null, ring: open, locked });
    });
  }
  people.sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
  for (const p of people) {
    if (p.ring && p.s) { ctx.beginPath(); ctx.ellipse(p.s.x, p.s.y, p.s.k * 1.2, p.s.k * 0.35, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,214,63,0.45)'; ctx.fill(); }
    if (p.locked && p.s) { ctx.save(); ctx.beginPath(); ctx.ellipse(p.s.x, p.s.y, p.s.k * 1.6, p.s.k * 0.5, 0, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = '#FF3D8B'; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.restore(); }
    player(ctx, p.s, p.col, p.num, p.tag, p.run || 0);
  }
  // the target where the ball will meet the locked receiver
  if (c && c.lock && c.lock.p) { const q = P(c.lock.p.x, 0, c.lock.p.z); if (q) { ctx.beginPath(); ctx.ellipse(q.x, q.y, q.k * 1.4, q.k * 0.45, 0, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = '#FFD23F'; ctx.stroke(); seg(ctx, { x: q.x - q.k, y: q.y }, { x: q.x + q.k, y: q.y }, '#FFD23F', 2); } }
  // the ball in the air
  const ball = c && c.ball;
  if (ball) {
    const u = clamp((t - ball.from) / (ball.land - ball.from), 0, 1), dist = Math.hypot(ball.to.x, ball.to.z + 7);
    const pos = { x: lerp(0.3, ball.to.x, u), z: lerp(-7, ball.to.z, u), y: lerp(2.2, 1.3, u) + (3 + dist * 0.12) * 4 * u * (1 - u) };
    const sh = P(pos.x, 0, pos.z), bp = P(pos.x, pos.y, pos.z);
    if (sh) { ctx.beginPath(); ctx.ellipse(sh.x, sh.y, sh.k * 0.3, sh.k * 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(5,3,10,0.35)'; ctx.fill(); }
    if (bp) football(ctx, bp.x, bp.y, Math.max(5, bp.k * 0.32), t / 60);
  }
  const res = c && c.result;
  if (res && res.at && t - res.at < 1400 && res.catch === false && res.int) { /* the pick shows as a pop from the page */ }
  // the football in your hand, up over your head when you're set to throw
  if (play && !play.thrown) {
    const hs = handsOf(info.lm, rect, info).filter(Boolean).sort((a, b) => a.y - b.y);
    const h = hs[0], r = Math.min(rect.w, rect.h) * 0.075;
    if (h) football(ctx, clamp(h.x, rect.x + r, rect.x + rect.w - r), clamp(rect.y + rect.h * 0.55 + (h.y - (rect.y + rect.h * 0.3)) * 0.8, rect.y + rect.h * 0.4, rect.y + rect.h - r), r, -0.6);
  }
  // the pocket clock: a bar that runs out to the sack
  if (play && s >= 0 && !play.thrown) {
    const left = clamp(1 - s / 4.4, 0, 1), bw = Math.min(260, rect.w * 0.5), bx = rect.x + rect.w / 2 - bw / 2, by = rect.y + (rect.w < 560 ? (info.hud || 140) : 14);
    ctx.fillStyle = 'rgba(18,14,24,0.75)'; ctx.fillRect(bx, by, bw, 14); ctx.fillStyle = left > 0.35 ? '#5BE38A' : '#FF5A5A'; ctx.fillRect(bx + 2, by + 2, (bw - 4) * left, 10); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 14);
    label(ctx, 'POCKET', bx - 8, by + 7, 14, PAPER, INK, 'right');
  } else if (play && s < 0) {
    const p0 = P(0, 0, 0);
    if (p0) label(ctx, s > -0.5 ? 'HIKE!' : 'SET…', rect.x + rect.w / 2, rect.y + rect.h * 0.3, Math.min(54, rect.w * 0.09), '#FFD23F');
  }
}
function football(ctx, x, y, r, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r, 0, 0, Math.PI * 2); ctx.fillStyle = '#8A4B22'; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.strokeStyle = INK; ctx.stroke();
  ctx.strokeStyle = PAPER; ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.6, 0); ctx.stroke();
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.22, -r * 0.18); ctx.lineTo(i * r * 0.22, r * 0.18); ctx.stroke(); }
  ctx.restore();
}

/* ---- FREE THROWS: the hoop from the line ---- */
const HOOP = { x: 0, y: 3.05, z: 4.19, r: 0.23, board: 4.57 };
function hoopsCam(rect) {
  const f = Math.min(rect.h * 1.35, rect.w * 1.3);
  return cam3({ x: 0, y: 1.75, z: 0, pitch: -0.12, f, cx: rect.x + rect.w / 2, cy: rect.y + rect.h * 0.55 });
}
function hoopsScene(ctx, rect, c, t, info) {
  const P = hoopsCam(rect);
  // the arena: dark stands, the crowd, the floor
  ctx.fillStyle = '#1D1730'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const fl = P(0, 0, 9);
  const floorY = fl ? fl.y : rect.y + rect.h * 0.6;
  crowd(ctx, rect.x, rect.y + rect.h * 0.05, rect.w, Math.max(30, floorY - rect.y - rect.h * 0.05), t);
  ctx.fillStyle = 'rgba(29,23,48,0.55)'; ctx.fillRect(rect.x, rect.y, rect.w, floorY - rect.y);
  poly(ctx, [P(-9, 0, 0.3), P(9, 0, 0.3), P(9, 0, 9), P(-9, 0, 9)], '#D9A066', null);
  ctx.save(); ctx.strokeStyle = 'rgba(138,90,54,0.3)'; ctx.lineWidth = 1;
  for (let x = -9; x <= 9; x += 0.5) { const a = P(x, 0, 0.3), b = P(x, 0, 9); if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
  ctx.restore();
  // the key and the free-throw circle
  poly(ctx, [P(-2.45, 0, 0), P(2.45, 0, 0), P(2.45, 0, 5.8), P(-2.45, 0, 5.8)], '#FF3D8B', PAPER, 3);
  ctx.save(); ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.15) { const p = P(Math.cos(a) * 1.8, 0, Math.sin(a) * 1.8); if (p) (a ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); }
  ctx.lineWidth = 3; ctx.strokeStyle = PAPER; ctx.stroke(); ctx.restore();
  // the pole, the backboard, the rim and the net
  seg(ctx, P(0, 0, 6.2), P(0, 3.3, 6.2), '#2B2530', 10);
  seg(ctx, P(0, 3.3, 6.2), P(0, 3.3, HOOP.board), '#2B2530', 8);
  poly(ctx, [P(-0.915, 3.95, HOOP.board), P(0.915, 3.95, HOOP.board), P(0.915, 2.9, HOOP.board), P(-0.915, 2.9, HOOP.board)], 'rgba(255,255,255,0.85)', INK, 4);
  poly(ctx, [P(-0.3, 3.5, HOOP.board - 0.01), P(0.3, 3.5, HOOP.board - 0.01), P(0.3, 3.05, HOOP.board - 0.01), P(-0.3, 3.05, HOOP.board - 0.01)], null, '#E8322E', 4);
  const rimPts = (y, r) => { const pts = []; for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.2) pts.push(P(HOOP.x + Math.cos(a) * r, y, HOOP.z + Math.sin(a) * r)); return pts.filter(Boolean); };
  const shot = c && c.shot;
  const swish = shot && shot.done && shot.make && t - shot.end < 500 ? Math.sin(((t - shot.end) / 500) * Math.PI) : 0;
  const top = rimPts(HOOP.y, HOOP.r), bot = rimPts(HOOP.y - 0.42 - swish * 0.12, HOOP.r * 0.55);
  ctx.save(); ctx.strokeStyle = 'rgba(255,248,236,0.9)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < Math.min(top.length, bot.length); i += 2) { ctx.beginPath(); ctx.moveTo(top[i].x, top[i].y); ctx.lineTo(bot[(i + 2) % bot.length].x, bot[(i + 2) % bot.length].y); ctx.moveTo(top[i].x, top[i].y); ctx.lineTo(bot[(i + bot.length - 2) % bot.length].x, bot[(i + bot.length - 2) % bot.length].y); ctx.stroke(); }
  ctx.restore();
  // where the ball is: in the air, then through the net, off the rim or short
  let bp = null;
  if (shot) {
    const tx = HOOP.x + shot.lat * 0.32, tz = HOOP.z + clamp(shot.dErr, -1, 1) * 1.6;
    const u = clamp((t - shot.born) / HOOPS.flight, 0, 1);
    const from = { x: shot.lat * 0.08, y: 2.2, z: 1.1 };
    if (!shot.done) bp = { x: lerp(from.x, tx, u), z: lerp(from.z, tz, u), y: lerp(from.y, HOOP.y + 0.12, u) + 1.5 * 4 * u * (1 - u) };
    else {
      const k = clamp((t - shot.end) / 700, 0, 1);
      if (shot.make) bp = { x: HOOP.x + shot.lat * 0.05 * (1 - k), z: HOOP.z, y: HOOP.y + 0.1 - k * 2.6 };
      else if (shot.kind === 'long') bp = { x: tx, z: HOOP.board - 0.2 - k * 2.5, y: HOOP.y + 0.3 + 1.2 * 4 * k * (1 - k) - k * 2 };
      else if (shot.kind === 'short') bp = { x: tx, z: tz - k * 0.8, y: Math.max(0.12, HOOP.y - 0.1 - k * 3) };
      else bp = { x: tx + Math.sign(shot.lat || 1) * k * 1.4, z: HOOP.z - k * 0.5, y: HOOP.y + 0.2 + 0.6 * 4 * k * (1 - k) - k * 2.2 };
    }
  }
  const drawBall = (behind) => {
    if (!bp) return;
    const isBehind = bp.z > HOOP.z && bp.y < HOOP.y + 0.05;
    if (behind !== isBehind) return;
    const s = P(bp.x, bp.y, bp.z);
    if (s) basketball(ctx, s.x, s.y, Math.max(4, 0.12 * s.k), t / 120, c && c.streak >= 3);
  };
  drawBall(true);
  ctx.save(); ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.lineWidth = 5; ctx.strokeStyle = '#FF7A1A'; ctx.stroke(); ctx.restore();
  drawBall(false);
  if (bp && bp.y > 0.2) { const sh = P(bp.x, 0, bp.z); if (sh) { ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 0.14 * sh.k, 0.05 * sh.k, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(5,3,10,0.3)'; ctx.fill(); } }
  // the ball in your hands until you shoot
  if (!shot) {
    const hs = handsOf(info.lm, rect, info).filter(Boolean), r = Math.min(rect.w, rect.h) * 0.1;
    const h = hs.length ? { x: hs.reduce((s2, p) => s2 + p.x, 0) / hs.length, y: Math.min(...hs.map((p) => p.y)) } : null;
    const bx = h ? clamp(h.x, rect.x + r, rect.x + rect.w - r) : rect.x + rect.w / 2;
    const by = h ? clamp(rect.y + rect.h * 0.5 + (h.y - (rect.y + rect.h * 0.35)) * 1.0, rect.y + rect.h * 0.35, rect.y + rect.h - r * 0.6) : rect.y + rect.h - r;
    basketball(ctx, bx, by, r, 0.3, c && c.streak >= 3);
  }
}
function basketball(ctx, x, y, r, rot, fire = false) {
  ctx.save(); ctx.translate(x, y);
  if (fire) { for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc((Math.random() - 0.5) * r, r * (0.4 + Math.random() * 0.9), r * (0.5 - i * 0.06), 0, Math.PI * 2); ctx.fillStyle = i % 2 ? 'rgba(255,90,40,0.6)' : 'rgba(255,210,63,0.6)'; ctx.fill(); } }
  ctx.rotate(rot);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#F2711C'; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
  ctx.beginPath(); ctx.arc(-r * 1.15, 0, r * 0.75, -0.9, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(r * 1.15, 0, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  ctx.restore();
}

/* ---- TENNIS: the court from behind your baseline ---- */
function tennisCam(rect) {
  const f = Math.min(rect.h * 1.6, rect.w * 1.0);
  return cam3({ x: 0, y: 2.0, z: -3, pitch: 0.0745 + (0.2 * rect.h) / f, f, cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2 });
}
function tennisScene(ctx, rect, c, t, info) {
  const P = tennisCam(rect), CL = 23.77, D = 5.485, S = 4.115, NET = CL / 2;
  ctx.fillStyle = '#20345E'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const far = P(0, 0, CL + 6), farY = far ? far.y : rect.y + rect.h * 0.25;
  crowd(ctx, rect.x, Math.max(rect.y, farY - rect.h * 0.2), rect.w, Math.min(rect.h * 0.2, farY - rect.y), t);
  poly(ctx, [P(-12, 0, -4), P(12, 0, -4), P(12, 0, CL + 6), P(-12, 0, CL + 6)], '#3E9B6A', null);
  poly(ctx, [P(-D, 0, 0), P(D, 0, 0), P(D, 0, CL), P(-D, 0, CL)], '#3B6FD1', PAPER, 3);
  const line = (x0, z0, x1, z1) => seg(ctx, P(x0, 0, z0), P(x1, 0, z1), PAPER, 2.5);
  line(-S, 0, -S, CL); line(S, 0, S, CL); line(-S, NET - 6.4, S, NET - 6.4); line(-S, NET + 6.4, S, NET + 6.4); line(0, NET - 6.4, 0, NET + 6.4);
  // the other player across the net, chasing toward the ball
  const bk = c && c.back, bl = c && c.ball;
  let ox = 0;
  if (bk) ox = lerp(bk.from.x * 0.3, bk.to.x, clamp((t - bk.born) / (bk.land - bk.born), 0, 1));
  else if (bl) ox = bl.from.x;
  const swingNow = bl && t - bl.born < 220;
  const op = P(ox, 0, CL + 0.8);
  if (op) {
    player(ctx, op, '#FF3D8B', '', null, t / 1000);
    const k = op.k; ctx.save(); ctx.translate(op.x + k * 0.5, op.y - k * 1.3); ctx.rotate(swingNow ? -1.2 : -0.3); racket(ctx, 0, 0, k * 0.55); ctx.restore();
  }
  // the net
  const n0 = P(-D - 0.5, 0, NET), n1 = P(D + 0.5, 0, NET), t0 = P(-D - 0.5, 1.07, NET), t1 = P(D + 0.5, 0.914, NET);
  if (n0 && n1 && t0 && t1) {
    ctx.save(); ctx.fillStyle = 'rgba(18,14,24,0.45)'; ctx.beginPath(); ctx.moveTo(n0.x, n0.y); ctx.lineTo(n1.x, n1.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t0.x, t0.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,236,0.25)'; ctx.lineWidth = 1;
    for (let x = -D; x <= D; x += 0.5) { const a = P(x, 0, NET), b = P(x, 0.95, NET); if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
    ctx.restore();
    seg(ctx, t0, t1, PAPER, 4);
  }
  // the ball: coming in, or on its way back
  let bp = null;
  if (bl) bp = tennisBall(bl, t);
  else if (bk) bp = tennisBack(bk, t);
  if (bp) {
    const sh = P(bp.x, 0, bp.z), s = P(bp.x, bp.y, bp.z);
    if (sh) { ctx.beginPath(); ctx.ellipse(sh.x, sh.y, Math.max(2, 0.08 * sh.k), Math.max(1, 0.03 * sh.k), 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(5,3,10,0.4)'; ctx.fill(); }
    if (s) { const r = Math.max(3, 0.075 * s.k); ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fillStyle = '#D9F24A'; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.strokeStyle = INK; ctx.stroke(); ctx.beginPath(); ctx.arc(s.x - r * 0.9, s.y, r * 0.8, -0.8, 0.8); ctx.strokeStyle = PAPER; ctx.lineWidth = Math.max(1, r * 0.15); ctx.stroke(); }
    // the timing ring as it reaches you
    if (bl && bp.u > 0.7 && bp.u < 1.12) { const s2 = P(bl.to.x, bl.to.y ?? 0.95, bl.to.z); if (s2) { ctx.beginPath(); ctx.arc(s2.x, s2.y, 0.3 * s2.k + Math.max(0, 1 - bp.u) * 80, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = bp.u >= 0.88 ? '#5BE38A' : '#FFD23F'; ctx.stroke(); } }
  }
  // your racket, in your hand
  const hs = handsOf(info.lm, rect, info).filter(Boolean);
  const h = hs.sort((a, b) => Math.abs(b.x - (rect.x + rect.w / 2)) - Math.abs(a.x - (rect.x + rect.w / 2)))[0];
  if (h) {
    const r = Math.min(rect.w, rect.h) * 0.16, side = h.x < rect.x + rect.w / 2 ? -1 : 1;
    const x = clamp(h.x, rect.x + r * 0.3, rect.x + rect.w - r * 0.3), y = clamp(rect.y + rect.h * 0.62 + (h.y - (rect.y + rect.h * 0.5)) * 0.8, rect.y + rect.h * 0.4, rect.y + rect.h);
    ctx.save(); ctx.translate(x, y); ctx.rotate(side * 0.7); racket(ctx, 0, 0, r); ctx.restore();
  }
}
function racket(ctx, x, y, r) {
  ctx.save(); ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = r * 0.16; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.55); ctx.stroke();
  ctx.strokeStyle = '#E8322E'; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -r * 1.0, r * 0.36, r * 0.48, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,248,236,0.18)'; ctx.fill(); ctx.lineWidth = r * 0.09; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = r * 0.05; ctx.strokeStyle = '#FF3D8B'; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,236,0.7)'; ctx.lineWidth = 1;
  for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.09, -r * 1.45); ctx.lineTo(k * r * 0.09, -r * 0.55); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * 0.32, -r + k * r * 0.12); ctx.lineTo(r * 0.32, -r + k * r * 0.12); ctx.stroke(); }
  ctx.restore();
}

/* ---- SEND IT!: the chase camera behind the contraption, out over the water ---- */
function sendItCam(rect, st) {
  const f = Math.min(rect.w * 0.95, rect.h * 1.5);
  return cam3({ x: st.camX * 0.85, y: Math.max(6, st.y + 9), z: st.z - 46, pitch: 0.13, f, cx: rect.x + rect.w / 2, cy: rect.y + rect.h * 0.42 });
}
function cloud(ctx, x, y, r) {
  ctx.beginPath();
  for (const [dx, dy, k] of [[-1.1, 0.2, 0.6], [-0.4, -0.2, 0.85], [0.4, -0.15, 0.75], [1.1, 0.2, 0.6]]) ctx.arc(x + dx * r, y + dy * r, k * r, 0, Math.PI * 2);
  ctx.fillStyle = PAPER; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(18,14,24,0.5)'; ctx.stroke();
}
function sendItScene(ctx, rect, c, t, info) {
  const st = c ? c.state : { camX: 0, x: 0, y: 30, z: -60, roll: 0, phase: 'push', craft: 'goat', pumps: 0 };
  const P = sendItCam(rect, st);
  // the sky down to the horizon, the sun and a few clouds that drift past
  const hz = P(0, 0, st.z + 4000), horizon = hz ? hz.y : rect.y + rect.h * 0.35;
  const g = ctx.createLinearGradient(0, rect.y, 0, horizon);
  g.addColorStop(0, '#5EC8FF'); g.addColorStop(1, '#CFF1FF');
  ctx.fillStyle = g; ctx.fillRect(rect.x, rect.y, rect.w, horizon - rect.y + 1);
  ctx.beginPath(); ctx.arc(rect.x + rect.w * 0.82, rect.y + Math.max(30, (horizon - rect.y) * 0.35), Math.min(28, rect.w * 0.05), 0, Math.PI * 2); ctx.fillStyle = '#FFE66B'; ctx.fill();
  for (let i = 0; i < 5; i++) {
    const cx = rect.x + ((i * 0.27 + 0.1 - (st.z / 9000) * (1 + i * 0.3)) % 1 + 1) % 1 * rect.w, cy = rect.y + (horizon - rect.y) * (0.25 + (i % 3) * 0.18);
    cloud(ctx, cx, cy, Math.min(26, rect.w * 0.035) * (1 + (i % 2) * 0.4));
  }
  // the water: rolling stripes that rush toward you
  ctx.fillStyle = '#2E86DE'; ctx.fillRect(rect.x, horizon, rect.w, rect.y + rect.h - horizon);
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  const z0 = Math.floor((st.z - 40) / 30) * 30;
  for (let z = z0; z < st.z + 900; z += 30) { const a = P(-200, 0, z), b = P(200, 0, z); if (a && b) { ctx.lineWidth = clamp(a.k * 0.25, 1, 3); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
  ctx.restore();
  // buoys down both sides every 100 feet, with the distance
  for (let z = Math.max(100, Math.ceil((st.z - 30) / 100) * 100); z < st.z + 700; z += 100) {
    for (const x of [-FLY.half - 6, FLY.half + 6]) {
      const p = P(x, 0, z);
      if (!p) continue;
      const h = Math.max(4, p.k * 3);
      ctx.beginPath(); ctx.moveTo(p.x - h * 0.4, p.y); ctx.lineTo(p.x, p.y - h); ctx.lineTo(p.x + h * 0.4, p.y); ctx.closePath(); ctx.fillStyle = z % 500 ? '#FF7A1A' : '#FFD23F'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      if (p.k > 1.2) label(ctx, `${z}`, p.x, p.y - h - 8, Math.min(18, p.k * 2.4), PAPER);
    }
  }
  // the pier and its crowd, until it's well behind
  if (st.z < 80) {
    const deck = (x, z, y = 30) => P(x, y, z);
    poly(ctx, [deck(-9, -70), deck(9, -70), deck(9, 0), deck(-9, 0)], '#C98A4B', INK, 3);
    for (let z = -70; z <= 0; z += 10) for (const x of [-9, 9]) seg(ctx, deck(x, z, 30), deck(x, z, 0), '#7A4A24', 4);
    const a0 = deck(-9, 0, 30), a1 = deck(9, 0, 30), b0 = deck(-9, 0, 42), b1 = deck(9, 0, 42);
    if (a0 && a1 && b0 && b1) {
      seg(ctx, a0, b0, INK, 6); seg(ctx, a1, b1, INK, 6);
      poly(ctx, [b0, b1, deck(9, 0, 38), deck(-9, 0, 38)], '#FF3D8B', INK, 3);
      const m = deck(0, 0, 40);
      if (m) label(ctx, 'SEND IT!', m.x, m.y, Math.max(10, m.k * 3.2), '#FFD23F');
    }
  }
  // the updrafts (green, arrows rising) and downdrafts (red, arrows sinking), far ones first
  const zones = c ? c.air.zones.filter((q) => q.z1 > st.z - 30 && q.z0 < st.z + 800) : [];
  for (const q of zones.slice().reverse()) {
    const up = q.kind === 'up', zc = (q.z0 + q.z1) / 2, col = up ? '91,227,138' : '255,90,90';
    // its footprint on the water
    ctx.save(); ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.3) { const p = P(q.x + Math.cos(a) * q.r, 0, zc + Math.sin(a) * (q.z1 - q.z0) / 2); if (p) (a ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); }
    ctx.closePath(); ctx.fillStyle = `rgba(${col},0.35)`; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${col},0.9)`; ctx.stroke(); ctx.restore();
    // the column of moving air
    const fl = P(q.x - q.r, 0, q.z0), fr = P(q.x + q.r, 0, q.z0), tl = P(q.x - q.r, 90, q.z0), tr = P(q.x + q.r, 90, q.z0);
    if (fl && fr && tl && tr) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(fl.x, fl.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(tl.x, tl.y); ctx.closePath();
      ctx.fillStyle = `rgba(${col},0.16)`; ctx.fill(); ctx.clip();
      const k = fl.k, w = Math.abs(fr.x - fl.x), cx = (fl.x + fr.x) / 2, H = Math.abs(fl.y - tl.y);
      ctx.strokeStyle = `rgba(${up ? '230,255,236' : '255,235,235'},0.85)`; ctx.lineWidth = Math.max(2, k * 0.6); ctx.lineCap = 'round';
      const shift = ((t / 1000) * (up ? 1 : -1) * 18 * k) % (k * 12);
      for (let y = fl.y + shift - k * 12; y > tl.y - k * 12; y -= k * 12) for (const dx of [-0.25, 0.25]) {
        const x = cx + dx * w, d = up ? -1 : 1, s2 = Math.max(4, w * 0.12);
        ctx.beginPath(); ctx.moveTo(x - s2, y - d * s2 * 0.2); ctx.lineTo(x, y + d * s2 * 0.6 * -1); ctx.lineTo(x + s2, y - d * s2 * 0.2); ctx.stroke();
      }
      ctx.restore();
      if (H > 30 && up && q.z0 > st.z + 20) { const lp = P(q.x, 92, q.z0); if (lp && lp.k > 0.8) label(ctx, '⬆', lp.x, lp.y, Math.min(24, lp.k * 4), '#5BE38A'); }
    }
  }
  // the contraption's shadow on the water, then the contraption
  const sh = P(st.x, 0, st.z);
  if (sh) { ctx.beginPath(); ctx.ellipse(sh.x, sh.y, sh.k * 7, sh.k * 1.6, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(5,3,10,0.28)'; ctx.fill(); }
  const cp = P(st.x, Math.max(0.5, st.y), st.z);
  if (cp) drawRear(ctx, st.craft, cp.x, cp.y, (cp.k * 16) / 180, st.roll, t / 1000, null);
  // the push: the crew on the deck and the flap meter
  if (st.phase === 'push') {
    const n = c ? Math.min(1, (c.pumps * FLY.perPump) / FLY.pumpMax) : 0, bw = Math.min(240, rect.w * 0.5), bx = rect.x + rect.w / 2 - bw / 2, by = rect.y + rect.h * 0.62;
    label(ctx, 'FLAP!', rect.x + rect.w / 2, by - 26, Math.min(54, rect.w * 0.1), '#FFD23F');
    ctx.fillStyle = 'rgba(18,14,24,0.7)'; ctx.fillRect(bx, by, bw, 16); ctx.fillStyle = '#5BE38A'; ctx.fillRect(bx + 2, by + 2, (bw - 4) * n, 12); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 16);
  }
  // the altitude gauge down the right side (to the 80-foot ceiling), and wings when they're out
  if (st.phase !== 'push') {
    const gx = rect.x + rect.w - 30, gy0 = rect.y + (info.hud || 120), gy1 = rect.y + rect.h - 90, gh = gy1 - gy0;
    if (gh > 60) {
      ctx.fillStyle = 'rgba(18,14,24,0.6)'; ctx.fillRect(gx, gy0, 12, gh); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(gx, gy0, 12, gh);
      const yy = gy1 - (Math.min(FLY.top, Math.max(0, st.y)) / FLY.top) * gh;
      ctx.beginPath(); ctx.moveTo(gx - 4, yy); ctx.lineTo(gx - 16, yy - 7); ctx.lineTo(gx - 16, yy + 7); ctx.closePath(); ctx.fillStyle = st.y < 10 ? '#FF5A5A' : '#FFD23F'; ctx.fill(); ctx.stroke();
    }
    if (st.wings) label(ctx, 'WINGS OUT · GLIDING', rect.x + rect.w / 2, rect.y + (info.hud || 120) + 4, 16, '#5BE38A');
  }
}

/* ---------------------------------------------------------------------------------------------------
   The Full Body Workout (workout.mjs): the rest card between moves (REST, the seconds, what's next and a
   little coach figure doing it), the reaction drill's arrows and the skater hops' floor marks.
   info: { area (where the card may go: under the score bar, over the coach line), players: [{ c, color,
   mid (the middle of their part, screen x), toScreen }], two, t }.
   --------------------------------------------------------------------------------------------------- */
// The coach figure's key poses, in a box two units tall (head top 0, feet 2), x across the screen.
const J = ['hd', 'nk', 'ls', 'rs', 'le', 're', 'lw', 'rw', 'lh', 'rh', 'lk', 'rk', 'lf', 'rf'];
const STAND = { hd: [0, 0.2], nk: [0, 0.4], ls: [-0.24, 0.46], rs: [0.24, 0.46], le: [-0.32, 0.78], re: [0.32, 0.78], lw: [-0.34, 1.06], rw: [0.34, 1.06], lh: [-0.14, 1.06], rh: [0.14, 1.06], lk: [-0.15, 1.5], rk: [0.15, 1.5], lf: [-0.16, 1.95], rf: [0.16, 1.95] };
const pose = (o = {}) => ({ ...STAND, ...o });
const shift = (p, dx, dy = 0) => Object.fromEntries(J.map((k) => [k, [p[k][0] + dx, p[k][1] + dy]]));
const flip = (p) => Object.fromEntries(J.map((k) => { const m = k[0] === 'l' ? 'r' + k.slice(1) : k[0] === 'r' ? 'l' + k.slice(1) : k; return [k, [-p[m][0], p[m][1]]]; }));
const ARMS_UP = pose({ le: [-0.28, 0.16], re: [0.28, 0.16], lw: [-0.24, -0.12], rw: [0.24, -0.12] });
const SQUAT = { hd: [0, 0.6], nk: [0, 0.8], ls: [-0.24, 0.86], rs: [0.24, 0.86], le: [-0.32, 1.0], re: [0.32, 1.0], lw: [-0.22, 0.92], rw: [0.22, 0.92], lh: [-0.18, 1.42], rh: [0.18, 1.42], lk: [-0.36, 1.6], rk: [0.36, 1.6], lf: [-0.18, 1.95], rf: [0.18, 1.95] };
const CRUNCH = pose({ hd: [0.06, 0.34], nk: [0.05, 0.52], ls: [-0.18, 0.58], rs: [0.27, 0.58], le: [0.02, 0.86], re: [0.24, 0.9], lw: [-0.1, 0.62], rw: [0.12, 0.62], rh: [0.14, 1.06], rk: [0.16, 1.04], rf: [0.22, 1.46] });
const BEHIND = pose({ le: [-0.46, 0.36], re: [0.46, 0.36], lw: [-0.12, 0.16], rw: [0.12, 0.16] });
const TWIST = pose({ hd: [0.08, 0.3], nk: [0.06, 0.48], ls: [-0.12, 0.56], rs: [0.3, 0.5], le: [0.12, 0.9], lw: [-0.02, 0.3], re: [0.5, 0.42], rw: [0.16, 0.24], rk: [0.16, 1.04], rf: [0.24, 1.46] });
const KNEE = pose({ lk: [-0.14, 1.06], lf: [-0.12, 1.5], le: [-0.34, 0.62], lw: [-0.2, 0.5], re: [0.34, 0.86], rw: [0.4, 1.1] });
const SKATE = shift(pose({ lk: [-0.12, 1.48], lf: [-0.14, 1.95], rk: [-0.02, 1.52], rf: [-0.34, 1.8], le: [-0.1, 0.72], lw: [0.06, 0.92], re: [0.46, 0.62], rw: [0.6, 0.5] }), -0.42, 0.04);
const CROUCH = { hd: [0, 0.9], nk: [0, 1.05], ls: [-0.24, 1.1], rs: [0.24, 1.1], le: [-0.3, 1.45], re: [0.3, 1.45], lw: [-0.3, 1.9], rw: [0.3, 1.9], lh: [-0.16, 1.4], rh: [0.16, 1.4], lk: [-0.34, 1.55], rk: [0.34, 1.55], lf: [-0.18, 1.95], rf: [0.18, 1.95] };
const PLANK = { hd: [0, 1.4], nk: [0, 1.52], ls: [-0.24, 1.56], rs: [0.24, 1.56], le: [-0.3, 1.75], re: [0.3, 1.75], lw: [-0.3, 1.95], rw: [0.3, 1.95], lh: [-0.13, 1.68], rh: [0.13, 1.68], lk: [-0.14, 1.8], rk: [0.14, 1.8], lf: [-0.15, 1.92], rf: [0.15, 1.92] };
const DEMOS = {
  jacks: { ms: 420, keys: [pose({ lf: [-0.1, 1.95], rf: [0.1, 1.95], lk: [-0.12, 1.5], rk: [0.12, 1.5] }), pose({ le: [-0.5, 0.26], re: [0.5, 0.26], lw: [-0.6, -0.02], rw: [0.6, -0.02], lk: [-0.32, 1.5], rk: [0.32, 1.5], lf: [-0.5, 1.95], rf: [0.5, 1.95] })] },
  crunch: { ms: 520, keys: [ARMS_UP, CRUNCH, ARMS_UP, flip(CRUNCH)] },
  knees: { ms: 230, keys: [KNEE, flip(KNEE)] },
  squat: { ms: 800, keys: [pose({ le: [-0.3, 0.66], re: [0.3, 0.66], lw: [-0.22, 0.58], rw: [0.22, 0.58] }), SQUAT] },
  cross: { ms: 540, keys: [BEHIND, TWIST, BEHIND, flip(TWIST)] },
  skate: { ms: 620, keys: [SKATE, flip(SKATE)] },
  react: { ms: 380, keys: [STAND, shift(STAND, -0.42), STAND, SQUAT, STAND, shift(ARMS_UP, 0, -0.06), STAND, shift(STAND, 0.42)] },
  burpee: { ms: 520, keys: [STAND, CROUCH, PLANK, CROUCH, shift(ARMS_UP, 0, -0.2)] },
};
export function drawDemo(ctx, key, cx, cy, h, t, color = '#FF5E5B', skin = '#E8B07E') {
  const d = DEMOS[key] || DEMOS.jacks, n = d.keys.length, u = (t / d.ms) % n, i = Math.floor(u), k = 0.5 - 0.5 * Math.cos(Math.PI * (u - i));
  const A = d.keys[i], B = d.keys[(i + 1) % n], s = h / 2;
  const at = (j) => ({ x: cx + lerp(A[j][0], B[j][0], k) * s, y: cy - h / 2 + lerp(A[j][1], B[j][1], k) * s });
  const p = Object.fromEntries(J.map((j) => [j, at(j)])), w = Math.max(3, h * 0.055);
  const limb = (a, b, col, ww = w) => { seg(ctx, p[a], p[b], INK, ww + 4); seg(ctx, p[a], p[b], col, ww); };
  ctx.beginPath(); ctx.ellipse(cx + (p.lf.x + p.rf.x - 2 * cx) / 2, cy + h / 2, h * 0.2, h * 0.035, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(5,3,10,0.3)'; ctx.fill();
  limb('lh', 'lk', '#2B3A67'); limb('lk', 'lf', '#2B3A67'); limb('rh', 'rk', '#2B3A67'); limb('rk', 'rf', '#2B3A67');
  poly(ctx, [p.ls, p.rs, p.rh, p.lh], color, INK, 3);
  limb('ls', 'le', color); limb('le', 'lw', skin, w * 0.85); limb('rs', 're', color); limb('re', 'rw', skin, w * 0.85);
  ctx.beginPath(); ctx.arc(p.hd.x, p.hd.y, h * 0.1, 0, Math.PI * 2); ctx.fillStyle = skin; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
}
function roundBox(ctx, x, y, w, h, r, fill, stroke = INK, lw = 4) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
// Words that fit a width (shrinking the size), for the card's titles.
function fitLabel(ctx, text, x, y, size, maxW, fill, align = 'center') {
  ctx.font = `${Math.round(size)}px Bangers, Impact, sans-serif`;
  const w = ctx.measureText(text).width;
  label(ctx, text, x, y, w > maxW ? size * (maxW / w) : size, fill, INK, align);
}
// A fat comic arrow pointing `dir` (left, right, up, down), its middle at (x, y), `s` long.
function arrow(ctx, x, y, s, dir, fill) {
  const rot = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir];
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const L = s / 2, hw = s * 0.2, head = s * 0.42;
  poly(ctx, [{ x: -L, y: -hw * 0.55 }, { x: L - head, y: -hw * 0.55 }, { x: L - head, y: -hw * 1.5 }, { x: L, y: 0 }, { x: L - head, y: hw * 1.5 }, { x: L - head, y: hw * 0.55 }, { x: -L, y: hw * 0.55 }], fill, INK, Math.max(4, s * 0.05));
  ctx.restore();
}
export function drawWorkout(ctx, info) {
  const { area, players, t, two } = info, c0 = players[0] && players[0].c, cueArea = info.cueArea || area;
  if (!c0) return;
  // the skater hops' floor marks: two cones either side of where you've been hopping
  for (const pl of players) {
    const z = pl.c && pl.c.phase === 'work' && pl.c.zone;
    if (!z) continue;
    for (const sgn of [-1, 1]) {
      const p = pl.toScreen({ x: z.x + sgn * z.d, y: z.y }), r = Math.max(10, cueArea.h * 0.03);
      poly(ctx, [{ x: p.x - r, y: p.y }, { x: p.x, y: p.y - r * 2.2 }, { x: p.x + r, y: p.y }], '#FF7A1A', INK, 3);
      ctx.fillStyle = PAPER; ctx.fillRect(p.x - r * 0.45, p.y - r * 1.25, r * 0.9, r * 0.3);
    }
  }
  // the reaction drill's cue over each player's part
  for (const pl of players) {
    const cue = pl.c && pl.c.phase === 'work' && pl.c.cue;
    if (!cue) continue;
    const half = two ? cueArea.w / 2 : cueArea.w, s = Math.min(half * 0.55, cueArea.h * 0.5, 240), cx = pl.mid, cy = cueArea.y + s * 0.62;
    const left = Math.max(0, Math.min(1, (cue.until - t) / (cue.until - cue.at)));
    const col = two ? pl.color : '#FFD23F';
    const dir = { left: 'left', right: 'right', duck: 'down', reach: 'up' }[cue.kind];
    ctx.save(); ctx.globalAlpha = 0.96;
    arrow(ctx, cx, cy, s, dir, col);
    fitLabel(ctx, cue.kind.toUpperCase() + '!', cx, cy + s * 0.62, s * 0.36, half * 0.9, col);
    // the time left, a bar shrinking under it
    const bw = s * 0.9, by = cy + s * 0.92;
    roundBox(ctx, cx - bw / 2, by, bw, 12, 6, 'rgba(18,14,24,0.7)', INK, 3);
    roundBox(ctx, cx - bw / 2, by, bw * left, 12, 6, left > 0.35 ? '#5BE38A' : '#FF3D3D', null);
    ctx.restore();
  }
  // the rest card: shared (both players run the same clock)
  if (c0.phase !== 'rest') return;
  const mv = c0.move, first = c0.station === 0, secs = Math.max(0, Math.ceil(c0.left));
  const wide = area.w > area.h * 1.3;
  const cw = wide ? Math.min(area.w - 8, 600) : Math.min(area.w - 28, 360), ch = wide ? Math.min(area.h - 16, 260) : Math.min(area.h - 16, 420);
  if (ch < 120) return;
  const x = area.x + (area.w - cw) / 2, y = area.y + (area.h - ch) / 2;
  ctx.save();
  roundBox(ctx, x + 6, y + 8, cw, ch, 22, 'rgba(5,3,10,0.55)', null);
  roundBox(ctx, x, y, cw, ch, 22, '#221A33');
  dots(ctx, { x: x + 4, y: y + 4, w: cw - 8, h: ch - 8 }, 'rgba(255,248,236,0.06)');
  const tx = wide ? x + cw * 0.4 : x + cw / 2, tw = wide ? cw * 0.56 : cw - 32, align = wide ? 'left' : 'center';
  let ty = y + (wide ? 30 : 32);
  fitLabel(ctx, first ? 'GET READY' : 'REST', tx, ty, 30, tw - 60, PAPER, align);
  fitLabel(ctx, String(secs), x + cw - 34, y + 34, 44, 60, secs <= 3 ? '#FF3D3D' : '#FFD23F', 'center');
  ty += 30;
  ctx.font = '800 11.5px Inter, system-ui, sans-serif'; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,248,236,0.72)';
  ctx.fillText(`${first ? 'UP FIRST' : 'UP NEXT'} · ${c0.station + 1} OF ${info.moves} · ${mv.works.toUpperCase()}`, tx, ty);
  ty += wide ? 32 : 34;
  fitLabel(ctx, mv.name.toUpperCase(), tx, ty, wide ? 34 : 32, tw, '#FF5E5B', align);
  ty += wide ? 26 : 28;
  // how to do it, wrapped
  ctx.font = '700 13px Inter, system-ui, sans-serif'; ctx.fillStyle = PAPER; ctx.textAlign = align;
  const lines = [];
  for (const word of mv.how.split(' ')) { const cur = lines.length ? lines[lines.length - 1] : null; if (cur != null && ctx.measureText(cur + ' ' + word).width <= tw) lines[lines.length - 1] = cur + ' ' + word; else lines.push(word); }
  const lh = 17, room = wide ? Math.floor((y + ch - 14 - ty) / lh) + 1 : 4;
  lines.slice(0, Math.max(1, room)).forEach((ln, i) => ctx.fillText(ln, tx, ty + i * lh));
  ty += Math.min(lines.length, Math.max(1, room)) * lh;
  // the little coach doing it
  const fig = wide ? { cx: x + cw * 0.2, cy: y + ch / 2 + 4, h: Math.min(ch * 0.74, cw * 0.36) } : { cx: x + cw / 2, h: Math.max(60, y + ch - 18 - ty) * 0.92 };
  if (!wide) fig.cy = y + ch - 14 - fig.h / 2;
  ctx.beginPath(); ctx.arc(fig.cx, fig.cy, fig.h * 0.6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,94,91,0.16)'; ctx.fill();
  drawDemo(ctx, c0.key, fig.cx, fig.cy, fig.h, t, info.color || '#FF5E5B');
  ctx.restore();
}
