// Color by Numbers: the page. The pictures are library.mjs (drawn with art-*.mjs), the levels and the
// spots are logic.mjs, the drawing is render.mjs. Pick a level and a picture, tap a color, fill its
// spots; progress is kept per player, picture and level; a finished picture can be saved or texted.
import { PICTURES, CATS, parts as partsOf, byId } from './library.mjs';
import { LEVELS, levelOf, levelParts, buildPuzzle, packPoles, unpackPoles, keyFor, R } from './logic.mjs';
import { partMap, drawPuzzle, drawPart, lineScale, BLANK } from './render.mjs';
import { hexRgb } from './art-kit.mjs';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
const prefs = Object.assign({ level: 0, sound: true, cat: 'all', zoomTips: 0 }, store.get('cbn.prefs', {}));
if (!LEVELS.some((l) => l.id === prefs.level)) prefs.level = 0;
const savePrefs = () => store.set('cbn.prefs', prefs);
function player() { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.handle ? p : null; } catch (e) { return null; } }
const who = () => (player() || {}).handle || 'guest';
// progress: { 'id@lv': { f: spots filled (packed), s: seconds, sl: slips, by: {num: slips}, d: done, at, n: spots, c: filled } }
let prog = {}, thumbs = {};
function loadProgress() { prog = store.get(`cbn.prog.${who()}`, {}); thumbs = store.get(`cbn.thumbs.${who()}`, {}); }
function saveProgress() { store.set(`cbn.prog.${who()}`, prog); }
function saveThumbs() {
  // the gallery's little pictures of work in progress: the 60 most recent
  const keys = Object.keys(thumbs).sort((a, b) => ((prog[b] || {}).at || 0) - ((prog[a] || {}).at || 0));
  for (const k of keys.slice(60)) delete thumbs[k];
  while (!store.set(`cbn.thumbs.${who()}`, thumbs) && Object.keys(thumbs).length) delete thumbs[keys.pop()];
}
loadProgress();

const time = (s) => { s = Math.max(0, Math.round(s)); return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const lum = (c) => { const [r, g, b] = hexRgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const textOn = (c) => (lum(c) > 0.62 ? '#120E18' : '#ffffff');
const CHEERS = ['YOU DID IT!', 'MASTERPIECE!', 'SO PRETTY!', 'AMAZING!', 'BEAUTIFUL!', 'WOW!'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- sound: soft pops, made on the spot ---------- */
let ac = null;
function tone(freq, dur = 0.08, type = 'triangle', vol = 0.05, at = 0) {
  if (!prefs.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* no audio here */ }
}
const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319];
let popAt = 0;
const sfx = {
  pop(n) { const now = performance.now(); if (now - popAt < 45) return; popAt = now; const f = SCALE[(n - 1) % SCALE.length]; tone(f, 0.09, 'sine', 0.06); tone(f * 2, 0.05, 'triangle', 0.02, 0.01); },
  click: () => tone(660, 0.06, 'triangle', 0.04),
  boop: () => { tone(260, 0.12, 'triangle', 0.05); tone(200, 0.14, 'triangle', 0.04, 0.08); },
  color: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, i * 0.07)),
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.06, i * 0.1)),
};
function paintSound() {
  $('soundBtn').setAttribute('aria-pressed', String(prefs.sound));
  $('soundBtn').innerHTML = prefs.sound
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
}

/* ---------- screens ---------- */
function show(name) {
  for (const s of document.querySelectorAll('[data-screen]')) s.hidden = s.dataset.screen !== name;
  if (name !== 'paint') scrollTo(0, 0);
}

/* ---------- puzzles: built once per picture and level ---------- */
const puzzles = new Map();
function puzzleFor(id, lv) {
  const key = keyFor(id, lv);
  if (puzzles.has(key)) return puzzles.get(key);
  const lp = levelParts(partsOf(id), lv);
  const P = buildPuzzle({ parts: lp, partLabel: partMap(lp), lv, seedKey: id });
  P.parts = lp; P.id = id; P.key = key;
  P.total = P.units.filter((u) => !u.auto).length;
  // each spot's box (for redrawing just around a fill)
  P.ubox = P.units.map(() => [R, R, -1, -1]);
  for (let i = 0; i < R * R; i++) { const u = P.map[i]; if (u < 0) continue; const b = P.ubox[u], x = i % R, y = (i - x) / R; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
  if (puzzles.size > 12) puzzles.delete(puzzles.keys().next().value);
  puzzles.set(key, P);
  return P;
}

/* ---------- home: levels, kinds, the gallery ---------- */
const lineArt = new Map();
let thumbCv = null;
function artFor(id, lv) {
  const k = keyFor(id, lv);
  if (lineArt.has(k)) return lineArt.get(k);
  thumbCv = thumbCv || Object.assign(document.createElement('canvas'), { width: 240, height: 240 });
  const ctx = thumbCv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 240, 240);
  ctx.setTransform(0.6, 0, 0, 0.6, 0, 0);
  lineScale(1.25);
  for (const part of levelParts(partsOf(id), lv)) drawPart(ctx, part, part.k === 'fill' ? BLANK : part.k === 'line' ? null : part.c);
  lineScale(1);
  const url = thumbCv.toDataURL('image/png');
  lineArt.set(k, url);
  return url;
}
const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); fillThumb(e.target); }
}, { rootMargin: '300px' }) : null;
function fillThumb(img) {
  const { id, lv } = img.dataset;
  const k = keyFor(id, +lv);
  img.src = thumbs[k] || artFor(id, +lv);
}
function tileHtml(pic, lv) {
  const k = keyFor(pic.id, lv), pr = prog[k];
  const pct = pr && pr.n ? Math.floor((100 * pr.c) / pr.n) : 0;
  const badge = pr && pr.d ? '<span class="star" aria-label="finished">⭐</span>' : pr && pr.c ? `<span class="ring" style="--p:${pct}" data-p="${pct}%"></span>` : '';
  return `<button class="tile" type="button" data-id="${pic.id}"><span class="pic"><img alt="" data-id="${pic.id}" data-lv="${lv}">${badge}</span><b>${pic.title}</b></button>`;
}
function observeImgs(root) {
  for (const img of root.querySelectorAll('img[data-id]')) { if (io) io.observe(img); else fillThumb(img); }
}
function paintHome() {
  loadProgress();
  const lv = prefs.level, L = levelOf(lv);
  $('levels').innerHTML = LEVELS.map((l) => `<button type="button" role="radio" aria-checked="${l.id === lv}" data-lv="${l.id}"><i aria-hidden="true">${l.emoji}</i><b>${l.name.toUpperCase()}</b><small>${l.grades}</small></button>`).join('');
  $('levelInfo').textContent = L.note;
  // keep coloring: pictures started at this level, newest first
  const going = PICTURES.filter((p) => { const pr = prog[keyFor(p.id, lv)]; return pr && pr.c && !pr.d; })
    .sort((a, b) => prog[keyFor(b.id, lv)].at - prog[keyFor(a.id, lv)].at);
  $('keepBox').hidden = !going.length;
  $('keep').innerHTML = going.map((p) => tileHtml(p, lv)).join('');
  $('cats').innerHTML = [{ id: 'all', name: 'All', emoji: '✨' }, ...CATS].map((c) => `<button type="button" aria-pressed="${prefs.cat === c.id}" data-cat="${c.id}"><span aria-hidden="true">${c.emoji}</span>${c.name}</button>`).join('');
  const list = PICTURES.filter((p) => prefs.cat === 'all' || p.cat === prefs.cat);
  const done = list.filter((p) => (prog[keyFor(p.id, lv)] || {}).d).length;
  $('galCount').textContent = `${list.length} pictures · ${done} finished at ${L.name}`;
  $('gallery').innerHTML = list.map((p) => tileHtml(p, lv)).join('');
  observeImgs($('keep')); observeImgs($('gallery'));
}
$('levels').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lv]'); if (!b) return;
  prefs.level = +b.dataset.lv; savePrefs(); sfx.click(); paintHome();
});
$('cats').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  prefs.cat = b.dataset.cat; savePrefs(); sfx.click(); paintHome();
  b.scrollIntoView && document.querySelector(`#cats [data-cat="${prefs.cat}"]`)?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
});
for (const box of [$('gallery'), $('keep')]) box.addEventListener('click', (e) => {
  const t = e.target.closest('.tile'); if (!t) return;
  sfx.click();
  const pr = prog[keyFor(t.dataset.id, prefs.level)];
  if (pr && pr.d) openFinished(t.dataset.id, prefs.level);
  else openPicture(t.dataset.id, prefs.level);
});

/* ---------- painting ---------- */
const stage = $('stage'), cv = $('pic'), fxc = $('fx');
const ctx = cv.getContext('2d'), fx = fxc.getContext('2d');
let cur = null;           // { id, lv, key, P, filled: Set, sel, slips, by, secs, since }
let W = 0, H = 0, dpr = 1, fs = 1;
const view = { z: 1, x: 0, y: 0 };
const MAXZ = [2.5, 4, 7, 12];
const MAXF = [40, 30, 22, 18];

function openPicture(id, lv) {
  const pic = byId(id); if (!pic) return;
  show('paint');
  $('paintBody').className = `paint-body lv${lv}`;
  $('pTitle').textContent = pic.title;
  $('pSub').textContent = `${levelOf(lv).emoji} ${levelOf(lv).name}`;
  $('palette').innerHTML = '';
  $('burst').hidden = true;
  $('mixing').hidden = false;
  cur = null;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  // let the screen show "Mixing the paints" before the work
  setTimeout(() => requestAnimationFrame(() => {
    const P = puzzleFor(id, lv), key = keyFor(id, lv), pr = prog[key] || {};
    const filled = unpackPoles(pr.f, P.map);
    for (const u of [...filled]) if (P.units[u].auto) filled.delete(u);
    cur = { id, lv, key, P, filled, sel: 0, slips: pr.sl || 0, by: { ...(pr.by || {}) }, secs: pr.s || 0, since: performance.now(), done: false };
    $('mixing').hidden = true;
    paintPalette();
    selectColor(nextColor(0), false);
    layout(true);
    paintMeter();
    if (lv >= 2 && prefs.zoomTips < 3) { prefs.zoomTips++; savePrefs(); const h = $('zoomHint'); h.hidden = false; h.style.opacity = 1; setTimeout(() => { h.style.opacity = 0; setTimeout(() => { h.hidden = true; }, 500); }, 3200); }
  }), 30);
}
function counts() {
  const left = new Map();
  if (!cur) return left;
  cur.P.units.forEach((u, i) => { if (!u.auto && !cur.filled.has(i)) left.set(u.num, (left.get(u.num) || 0) + 1); });
  return left;
}
function paintPalette() {
  const left = counts();
  $('palette').innerHTML = cur.P.palette.map((p) => {
    const l = left.get(p.num) || 0, pct = p.count ? Math.round((100 * (p.count - l)) / p.count) : 100;
    return `<button class="sw${l ? '' : ' done'}" type="button" role="radio" aria-checked="false" aria-label="Color ${p.num}${l ? `, ${l} left` : ', all done'}" data-n="${p.num}" style="--c:${p.color};--tx:${textOn(p.color)};--p:${pct}">${p.num}</button>`;
  }).join('');
}
function paintSwatch(n) {
  const b = $('palette').querySelector(`[data-n="${n}"]`); if (!b) return;
  const p = cur.P.palette[n - 1], l = counts().get(n) || 0;
  b.style.setProperty('--p', p.count ? Math.round((100 * (p.count - l)) / p.count) : 100);
  b.classList.toggle('done', !l);
  b.setAttribute('aria-label', `Color ${n}${l ? `, ${l} left` : ', all done'}`);
}
function paintMeter() {
  const n = cur.filled.size, t = cur.P.total;
  $('pMeter').style.width = `${t ? (100 * n) / t : 0}%`;
  $('pSub').textContent = `${levelOf(cur.lv).emoji} ${levelOf(cur.lv).name} · ${n}/${t}`;
}
function nextColor(after) {
  const left = counts(), pal = cur.P.palette;
  for (let k = 0; k < pal.length; k++) { const n = ((after + k) % pal.length) + 1; if (left.get(n)) return n; }
  return 0;
}
function selectColor(n, sound = true) {
  if (!cur) return;
  cur.sel = n;
  for (const b of $('palette').querySelectorAll('.sw')) { const on = +b.dataset.n === n; b.classList.toggle('sel', on); b.setAttribute('aria-checked', String(on)); }
  const b = $('palette').querySelector(`[data-n="${n}"]`);
  if (b) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: sound ? 'smooth' : 'auto' });
  if (sound) sfx.click();
  dirty();
}
$('palette').addEventListener('click', (e) => { const b = e.target.closest('.sw'); if (b && cur) selectColor(+b.dataset.n); });

/* ---- the view: fit, zoom, pan ---- */
// The picture is square: as big as fits, the colors under it (upright) or beside it (sideways).
const sideways = () => matchMedia('(orientation: landscape) and (min-width: 600px)').matches;
function sizeStage() {
  const body = $('paintBody'), cs = getComputedStyle(body), pal = $('palette');
  const bw = body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const bh = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  let side;
  if (sideways()) { pal.style.maxHeight = ''; side = Math.min(bh, bw - 170 - 16); }
  else {
    pal.style.maxHeight = 'none';
    const need = Math.min(pal.scrollHeight, bh * 0.4);
    side = Math.min(bw, bh - need - 10);
    pal.style.maxHeight = `${Math.max(70, bh - side - 10)}px`;
  }
  side = Math.max(180, Math.floor(side));
  stage.style.width = stage.style.height = `${side}px`;
}
function layout(reset) {
  sizeStage();
  const r = stage.getBoundingClientRect();
  W = Math.max(1, r.width - 6); H = Math.max(1, r.height - 6);
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  for (const c of [cv, fxc]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  fs = Math.min(W, H) / R;
  if (reset) { view.z = 1; view.x = (W - R * fs) / 2; view.y = (H - R * fs) / 2; }
  clampView();
  full();
}
function clampView() {
  const zmax = MAXZ[cur ? cur.lv : 0];
  view.z = Math.min(zmax, Math.max(1, view.z));
  const S = R * fs * view.z;
  view.x = S <= W ? (W - S) / 2 : Math.min(40, Math.max(W - S - 40, view.x));
  view.y = S <= H ? (H - S) / 2 : Math.min(40, Math.max(H - S - 40, view.y));
  $('fitBtn').hidden = view.z < 1.05;
}
const toPic = (sx, sy) => [(sx - view.x) / (fs * view.z), (sy - view.y) / (fs * view.z)];
const toScreen = (px, py) => [view.x + px * fs * view.z, view.y + py * fs * view.z];

/* ---- drawing: the whole picture when still, a quick stretched copy while fingers move ---- */
const snap = document.createElement('canvas'), base = document.createElement('canvas');
let snapView = null, baseDirty = true, raf = 0, moving = false, settleT = 0, patch = null, needFull = false;
// something changed: the whole picture (dirty()) or just around one spot (dirty(box))
function dirty(box) {
  baseDirty = true;
  if (box && !needFull) patch = patch ? [Math.min(patch[0], box[0]), Math.min(patch[1], box[1]), Math.max(patch[2], box[2]), Math.max(patch[3], box[3])] : box.slice();
  else { needFull = true; patch = null; }
  if (!raf) raf = requestAnimationFrame(() => {
    raf = 0;
    if (moving) { quick(); return; }
    if (needFull || !patch) full(); else part(patch);
    patch = null; needFull = false;
  });
}
// redraw one patch of the picture (picture units), numbers and all
function part(box) {
  if (!cur) return;
  const sc = fs * view.z, pad = 4;
  const x0 = Math.max(0, Math.floor((view.x + (box[0] - pad) * sc) * dpr)), y0 = Math.max(0, Math.floor((view.y + (box[1] - pad) * sc) * dpr));
  const x1 = Math.min(cv.width, Math.ceil((view.x + (box[2] + 1 + pad) * sc) * dpr)), y1 = Math.min(cv.height, Math.ceil((view.y + (box[3] + 1 + pad) * sc) * dpr));
  if (x1 <= x0 || y1 <= y0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.fillStyle = '#ebe5f1'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  const k = dpr * sc;
  ctx.setTransform(k, 0, 0, k, dpr * view.x, dpr * view.y);
  lineScale(1 / Math.pow(view.z, 0.72));
  const r = [(x0 / dpr - view.x) / sc, (y0 / dpr - view.y) / sc, (x1 / dpr - view.x) / sc, (y1 / dpr - view.y) / sc];
  drawPuzzle(ctx, cur.P, { filled: cur.filled, sel: cur.sel, all: cur.done }, r);
  lineScale(1);
  if (!cur.done) numbers(r);
  ctx.restore();
  snap.getContext('2d').drawImage(cv, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
}
function full() {
  if (!cur) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ebe5f1'; ctx.fillRect(0, 0, cv.width, cv.height);
  const k = dpr * fs * view.z;
  ctx.setTransform(k, 0, 0, k, dpr * view.x, dpr * view.y);
  lineScale(1 / Math.pow(view.z, 0.72));
  drawPuzzle(ctx, cur.P, { filled: cur.filled, sel: cur.sel, all: cur.done });
  lineScale(1);
  if (!cur.done) numbers();
  snap.width = cv.width; snap.height = cv.height;
  snap.getContext('2d').drawImage(cv, 0, 0);
  snapView = { ...view };
}
function numbers(r = null) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const sc = fs * view.z, maxF = MAXF[cur.lv];
  const units = cur.P.units;
  let lastFont = '';
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.auto || cur.filled.has(i)) continue;
    const on = u.num === cur.sel;
    for (const l of u.labels) {
      if (r && (l.x + l.r < r[0] || l.x - l.r > r[2] || l.y + l.r < r[1] || l.y - l.r > r[3])) continue;
      const sx = view.x + l.x * sc, sy = view.y + l.y * sc;
      if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
      const f = Math.min(maxF, l.r * sc * (u.num > 9 ? 0.98 : 1.28));
      if (f < 7) {
        if (on && l.r * sc > 1.6) { ctx.fillStyle = '#5a4a6e'; ctx.beginPath(); ctx.arc(sx, sy, Math.min(2.4, l.r * sc * 0.6), 0, 7); ctx.fill(); }
        continue;
      }
      const font = `${on ? 800 : 700} ${(Math.round(f * 2) / 2).toFixed(1)}px Inter, system-ui, sans-serif`;
      if (font !== lastFont) { ctx.font = font; lastFont = font; }
      ctx.fillStyle = on ? '#2a1e36' : '#8c8499';
      ctx.fillText(String(u.num), sx, sy + f * 0.04);
    }
  }
}
function ensureBase() {
  if (!baseDirty && base.width) return;
  base.width = base.height = 800;
  const b = base.getContext('2d');
  b.setTransform(2, 0, 0, 2, 0, 0);
  drawPuzzle(b, cur.P, { filled: cur.filled, sel: cur.sel, all: cur.done });
  baseDirty = false;
}
function quick() {
  if (!cur) return;
  ensureBase();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ebe5f1'; ctx.fillRect(0, 0, cv.width, cv.height);
  const k = dpr * fs * view.z;
  ctx.drawImage(base, dpr * view.x, dpr * view.y, R * k, R * k);
  if (snapView) {
    const s = view.z / snapView.z;
    ctx.drawImage(snap, dpr * (view.x - snapView.x * s), dpr * (view.y - snapView.y * s), snap.width * s, snap.height * s);
  }
}
function moved() {
  clampView();
  moving = true;
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; quick(); });
  clearTimeout(settleT);
  settleT = setTimeout(() => { moving = false; full(); }, 140);
}

/* ---- effects: bursts, hint rings, confetti (their own canvas, so the picture isn't redrawn) ---- */
const bits = [], rings = [];
let fxRaf = 0;
function fxLoop() {
  fxRaf = 0;
  fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxc.width, fxc.height);
  fx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const now = performance.now();
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i], t = (now - b.t0) / b.life;
    if (t >= 1) { bits.splice(i, 1); continue; }
    b.x += b.vx; b.y += b.vy; b.vy += b.g; b.rot += b.vr;
    fx.save(); fx.globalAlpha = 1 - t * t; fx.translate(b.x, b.y); fx.rotate(b.rot);
    fx.fillStyle = b.c; fx.strokeStyle = '#3a2747'; fx.lineWidth = 1.5;
    if (b.k === 'star') { fx.beginPath(); for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5, r = k % 2 ? b.s * 0.45 : b.s; fx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } fx.closePath(); fx.fill(); fx.stroke(); }
    else { fx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); }
    fx.restore();
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i], t = (now - r.t0) / r.life;
    if (t >= 1) { rings.splice(i, 1); continue; }
    const [sx, sy] = toScreen(r.px, r.py), base = Math.max(14, r.r * fs * view.z);
    for (const k of [0, 0.5]) {
      const tt = (t * 2.4 + k) % 1;
      fx.globalAlpha = (1 - tt) * (1 - t * 0.5);
      fx.strokeStyle = r.c; fx.lineWidth = 4;
      fx.beginPath(); fx.arc(sx, sy, base + tt * 26, 0, Math.PI * 2); fx.stroke();
    }
    fx.globalAlpha = 1;
  }
  if (bits.length || rings.length) fxRaf = requestAnimationFrame(fxLoop);
}
const kick = () => { if (!fxRaf) fxRaf = requestAnimationFrame(fxLoop); };
function burst(sx, sy, c, n = 9) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 2.6;
    bits.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 0.12, c, s: 5 + Math.random() * 4, k: Math.random() < 0.5 ? 'star' : 'bit', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, t0: performance.now(), life: 520 + Math.random() * 200 });
  }
  kick();
}
function confetti() {
  const cs = ['#FF3D8B', '#FFD23F', '#29D3F0', '#5BE38A', '#B57CFF', '#FF9A3C'];
  for (let i = 0; i < 120; i++) bits.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2.5, g: 0.05, c: pick(cs), s: 7 + Math.random() * 7, k: Math.random() < 0.3 ? 'star' : 'bit', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, t0: performance.now(), life: 2200 + Math.random() * 1200 });
  kick();
}

/* ---- tapping and painting ---- */
function unitAt(sx, sy) {
  if (!cur) return -1;
  const [px, py] = toPic(sx, sy);
  const ix = Math.floor(px), iy = Math.floor(py);
  const map = cur.P.map;
  const at = (x, y) => (x >= 0 && y >= 0 && x < R && y < R ? map[y * R + x] : -1);
  let u = at(ix, iy);
  if (u >= 0) return u;
  // on an eye or a line: the nearest spot within a fingertip
  const reach = Math.min(10, Math.ceil(9 / (fs * view.z)));
  for (let rr = 1; rr <= reach; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== rr) continue;
    u = at(ix + dx, iy + dy);
    if (u >= 0) return u;
  }
  return -1;
}
let saveT = 0;
function fill(i, sx, sy) {
  const u = cur.P.units[i];
  cur.filled.add(i);
  sfx.pop(u.num);
  if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) { /* no buzz */ }
  burst(sx, sy, u.color, 8);
  paintSwatch(u.num);
  paintMeter();
  dirty(cur.P.ubox[i]);
  clearTimeout(saveT); saveT = setTimeout(save, 600);
  if (cur.filled.size >= cur.P.total) { finish(); return; }
  if (!counts().get(u.num)) {
    sfx.color();
    const b = $('palette').querySelector(`[data-n="${u.num}"]`);
    if (b) b.classList.add('wiggle'), setTimeout(() => b.classList.remove('wiggle'), 500);
    const n = nextColor(u.num);
    setTimeout(() => { if (cur && !cur.done && cur.sel === u.num) selectColor(n, false); }, 380);
  }
}
function tap(sx, sy) {
  if (!cur || cur.done) return;
  const i = unitAt(sx, sy);
  if (i < 0) return;
  const u = cur.P.units[i];
  if (u.auto || cur.filled.has(i)) { burst(sx, sy, '#ffffff', 4); return; }
  if (u.num === cur.sel) { fill(i, sx, sy); return; }
  // not this color: show which one it is (no penalty, just a nudge)
  sfx.boop();
  cur.slips++; cur.by[cur.sel] = (cur.by[cur.sel] || 0) + 1;
  const b = $('palette').querySelector(`[data-n="${u.num}"]`);
  if (b) { b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); setTimeout(() => b.classList.remove('wiggle'), 520); b.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }); }
  const l = u.labels[0];
  rings.push({ px: l ? l.x : toPic(sx, sy)[0], py: l ? l.y : toPic(sx, sy)[1], r: l ? l.r : 6, c: '#8c8499', t0: performance.now(), life: 700 });
  kick();
}
// slide a finger across spots of the chosen color to fill them all
function paintAlong(x0, y0, x1, y1) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let k = 1; k <= steps; k++) {
    const sx = x0 + ((x1 - x0) * k) / steps, sy = y0 + ((y1 - y0) * k) / steps;
    const [px, py] = toPic(sx, sy), ix = Math.floor(px), iy = Math.floor(py);
    if (ix < 0 || iy < 0 || ix >= R || iy >= R) continue;
    const i = cur.P.map[iy * R + ix];
    if (i < 0 || cur.filled.has(i)) continue;
    const u = cur.P.units[i];
    if (!u.auto && u.num === cur.sel) { fill(i, sx, sy); if (!cur || cur.done) return; }
  }
}

const pts = new Map();
let gest = null;
const local = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left - 3, e.clientY - r.top - 3]; };
stage.addEventListener('pointerdown', (e) => {
  if (!cur || cur.done) return;
  e.preventDefault();
  try { stage.setPointerCapture(e.pointerId); } catch (er) { /* fine */ }
  const [x, y] = local(e);
  pts.set(e.pointerId, [x, y]);
  if (pts.size === 1) gest = { kind: 'maybe', x0: x, y0: y, lx: x, ly: y, t0: performance.now() };
  else if (pts.size === 2) {
    const [a, b] = [...pts.values()];
    gest = { kind: 'pinch', d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], v0: { ...view } };
  }
});
stage.addEventListener('pointermove', (e) => {
  if (!pts.has(e.pointerId) || !gest) return;
  const [x, y] = local(e);
  pts.set(e.pointerId, [x, y]);
  if (gest.kind === 'pinch' && pts.size >= 2) {
    const [a, b] = [...pts.values()];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const v0 = gest.v0, z = Math.min(MAXZ[cur.lv], Math.max(1, v0.z * (d / gest.d0)));
    const px = (gest.m0[0] - v0.x) / (fs * v0.z), py = (gest.m0[1] - v0.y) / (fs * v0.z);
    view.z = z; view.x = m[0] - px * fs * z; view.y = m[1] - py * fs * z;
    moved();
    return;
  }
  if (gest.kind === 'maybe') {
    if (Math.hypot(x - gest.x0, y - gest.y0) < 8) return;
    const i = unitAt(gest.x0, gest.y0), u = i >= 0 ? cur.P.units[i] : null;
    if (u && !u.auto && u.num === cur.sel && !cur.filled.has(i)) { gest.kind = 'paint'; fill(i, gest.x0, gest.y0); }
    else if (view.z > 1.01) gest.kind = 'pan';
    else if (u && !u.auto && u.num === cur.sel) gest.kind = 'paint';
    else gest.kind = 'none';
  }
  if (gest.kind === 'paint' && cur && !cur.done) paintAlong(gest.lx, gest.ly, x, y);
  else if (gest.kind === 'pan') { view.x += x - gest.lx; view.y += y - gest.ly; moved(); }
  gest.lx = x; gest.ly = y;
});
function up(e) {
  if (!pts.has(e.pointerId)) return;
  pts.delete(e.pointerId);
  if (gest && gest.kind === 'maybe' && pts.size === 0 && performance.now() - gest.t0 < 700) tap(gest.x0, gest.y0);
  if (pts.size === 0) gest = null;
  else if (gest && gest.kind === 'pinch') { const [p] = [...pts.values()]; gest = { kind: 'pan', lx: p[0], ly: p[1] }; }
}
stage.addEventListener('pointerup', up);
stage.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); if (!pts.size) gest = null; });
stage.addEventListener('wheel', (e) => {
  if (!cur) return;
  e.preventDefault();
  const [x, y] = local(e), z0 = view.z;
  const z = Math.min(MAXZ[cur.lv], Math.max(1, z0 * Math.exp(-e.deltaY * 0.0022)));
  const px = (x - view.x) / (fs * z0), py = (y - view.y) / (fs * z0);
  view.z = z; view.x = x - px * fs * z; view.y = y - py * fs * z;
  moved();
}, { passive: false });
// iOS: stop the page itself from zooming under a pinch
for (const ev of ['gesturestart', 'gesturechange']) stage.addEventListener(ev, (e) => e.preventDefault());

let animT = 0;
function animateTo(z, cx, cy, ms = 420) {
  // zoom so picture point (cx, cy) lands in the middle
  cancelAnimationFrame(animT);
  const from = { ...view }, zz = Math.min(MAXZ[cur.lv], Math.max(1, z));
  const to = { z: zz, x: W / 2 - cx * fs * zz, y: H / 2 - cy * fs * zz };
  const t0 = performance.now();
  const step = () => {
    const t = Math.min(1, (performance.now() - t0) / ms), e = 1 - (1 - t) ** 3;
    view.z = from.z + (to.z - from.z) * e; view.x = from.x + (to.x - from.x) * e; view.y = from.y + (to.y - from.y) * e;
    clampView();
    if (t < 1) { moving = true; quick(); animT = requestAnimationFrame(step); } else { moving = false; full(); }
  };
  animT = requestAnimationFrame(step);
}
$('fitBtn').onclick = () => { if (cur) { sfx.click(); animateTo(1, R / 2, R / 2); } };
$('hintBtn').onclick = () => {
  if (!cur || cur.done) return;
  sfx.click();
  if (!counts().get(cur.sel)) selectColor(nextColor(cur.sel || 0), false);
  // the spot of this color nearest the middle of the view
  const [cx, cy] = toPic(W / 2, H / 2);
  let best = null, bd = Infinity;
  cur.P.units.forEach((u, i) => {
    if (u.auto || u.num !== cur.sel || cur.filled.has(i)) return;
    for (const l of u.labels) { const d = Math.hypot(l.x - cx, l.y - cy) - l.r * 3; if (d < bd) { bd = d; best = l; } }
  });
  if (!best) return;
  const onScreen = best.r * fs * view.z;
  const [sx, sy] = toScreen(best.x, best.y);
  if (onScreen < 10 || sx < 0 || sy < 0 || sx > W || sy > H) animateTo(Math.max(view.z, 12 / (best.r * fs)), best.x, best.y);
  rings.push({ px: best.x, py: best.y, r: best.r, c: '#FF3D8B', t0: performance.now(), life: 1800 });
  kick();
};

/* ---- saving and finishing ---- */
function spent() { if (!cur) return 0; const now = performance.now(); cur.secs += (now - cur.since) / 1000; cur.since = now; return cur.secs; }
function save(thumb = false) {
  if (!cur) return;
  const P = cur.P;
  prog[cur.key] = { f: packPoles(P.units, cur.filled), s: Math.round(spent()), sl: cur.slips, by: cur.by, d: cur.done ? 1 : 0, at: Date.now(), n: P.total, c: cur.filled.size };
  saveProgress();
  if (thumb) {
    const t = document.createElement('canvas'); t.width = t.height = 200;
    const c = t.getContext('2d'); c.fillStyle = BLANK; c.fillRect(0, 0, 200, 200); c.setTransform(0.5, 0, 0, 0.5, 0, 0);
    lineScale(1.5);
    drawPuzzle(c, P, { filled: cur.filled, sel: 0, all: cur.done });
    lineScale(1);
    try { thumbs[cur.key] = t.toDataURL('image/jpeg', 0.82); saveThumbs(); } catch (e) { /* no room */ }
  }
}
function finish() {
  cur.done = true;
  spent();
  save(true);
  sfx.win();
  $('burstText').textContent = pick(CHEERS);
  $('burst').hidden = false;
  stage.classList.remove('cheer'); void stage.offsetWidth; stage.classList.add('cheer');
  confetti();
  animateTo(1, R / 2, R / 2, 500);
  const done = cur;
  setTimeout(() => { if (cur === done) showResults(done, true); }, 2600);
}
function leavePaint() {
  if (cur && !cur.done && cur.filled.size) save(true);
  else if (cur && !cur.done) save(false);
  cancelAnimationFrame(animT);
  cur = null;
  paintHome();
  show('home');
}
$('paintBack').onclick = () => { sfx.click(); leavePaint(); };
document.addEventListener('visibilitychange', () => {
  if (!cur) return;
  if (document.hidden) { spent(); save(!cur.done && cur.filled.size > 0); } else cur.since = performance.now();
});
addEventListener('pagehide', () => { if (cur && !cur.done) save(cur.filled.size > 0); });
if ('ResizeObserver' in window) new ResizeObserver(() => { if (cur && !$('paintBody').closest('[hidden]')) layout(false); }).observe($('paintBody'));
else addEventListener('resize', () => { if (cur) layout(false); });

/* ---------- results ---------- */
let res = null;
function openFinished(id, lv) {
  const P = puzzleFor(id, lv), key = keyFor(id, lv), pr = prog[key] || {};
  showResults({ id, lv, key, P, filled: new Set(), secs: pr.s || 0, slips: pr.sl || 0, by: pr.by || {}, done: true }, false);
}
function showResults(r, fresh) {
  res = r;
  cur = null;
  const pic = byId(r.id), L = levelOf(r.lv), P = r.P;
  const c = $('resPic').getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 800, 800); c.setTransform(2, 0, 0, 2, 0, 0);
  drawPuzzle(c, P, { filled: new Set(), all: true, sel: 0 });
  $('resRibbon').textContent = fresh ? pick(CHEERS) : 'FINISHED ⭐';
  $('resTitle').textContent = pic.title;
  $('resSub').textContent = `${L.emoji} ${L.name} · ${P.total} spots · ${P.palette.length} colors${r.secs ? ` · ${time(r.secs)}` : ''}`;
  $('againBtn').textContent = 'Color it again';
  $('againBtn').classList.remove('arm');
  // the lab wallet: amber for a finished picture, a shard for Paintbrush and Stained Glass (each picture and level pays once a day)
  $('resPaid').textContent = fresh && !player() ? 'Make a Capra Lab profile on the hub to earn amber for every picture you finish.' : '';
  if (fresh && window.CapraWallet) {
    CapraWallet.earn('color-by-numbers', 'picture', r.key);
    if (r.lv >= 2) CapraWallet.earn('color-by-numbers', 'masterpiece', r.key);
  }
  // the results text, the same card in every Capra Lab game: a square for each color, 🟩 every spot
  // filled right on the first try, 🟨 a tap or two on the wrong spot
  const box = $('resShare');
  box.innerHTML = '';
  if (window.CapraShare) {
    const sq = P.palette.map((p) => (r.by && r.by[p.num] ? '🟨' : '🟩'));
    const rows = [];
    for (let i = 0; i < sq.length; i += 10) rows.push(sq.slice(i, i + 10).join(''));
    const text = CapraShare.text({ emoji: '🎨', game: 'Color by Numbers', sub: pic.title,
      lines: [`${L.emoji} ${L.name} · ${P.total} spots · ${P.palette.length} colors`, r.secs ? `⏱️ ${time(r.secs)}` : ''], grid: rows });
    box.innerHTML = '<lab-text-share></lab-text-share>';
    box.firstChild.set({ emoji: '🎨', title: 'Color by Numbers', text, url: `${location.origin}/color-by-numbers/` });
  }
  show('results');
}
// the picture to keep: framed, with its name and who colored it
async function pictureBlob() {
  const pic = byId(res.id), L = levelOf(res.lv);
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1220;
  const g = c.getContext('2d');
  try { await document.fonts.load('40px Bangers'); } catch (e) { /* the fallback font is fine */ }
  g.fillStyle = '#FFF8EC'; g.fillRect(0, 0, 1080, 1220);
  g.save(); g.translate(40, 40); g.scale(2.5, 2.5);
  drawPuzzle(g, res.P, { filled: new Set(), all: true, sel: 0 });
  g.restore();
  g.strokeStyle = '#120E18'; g.lineWidth = 8; g.strokeRect(40, 40, 1000, 1000);
  g.fillStyle = '#120E18'; g.textAlign = 'center';
  g.font = '72px Bangers, Impact, sans-serif'; g.fillText(pic.title.toUpperCase(), 540, 1122);
  const p = player();
  g.font = '700 30px Inter, system-ui, sans-serif'; g.fillStyle = '#5a5266';
  g.fillText(`${p ? `Colored by ${p.name} · ` : ''}${L.name} · Capra Lab`, 540, 1176);
  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}
$('saveBtn').onclick = async () => {
  if (!res) return;
  sfx.click();
  const blob = await pictureBlob();
  if (!blob) return;
  const name = `${res.id}.png`;
  const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  const phone = /iPhone|iPad|Android|Mobi/i.test(navigator.userAgent);
  if (phone && file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: byId(res.id).title }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
$('nextBtn').onclick = () => {
  if (!res) return;
  sfx.click();
  const lv = res.lv, list = PICTURES.filter((p) => p.cat === byId(res.id).cat);
  const all = [...list, ...PICTURES.filter((p) => !list.includes(p))];
  const start = all.findIndex((p) => p.id === res.id);
  for (let k = 1; k <= all.length; k++) {
    const p = all[(start + k) % all.length];
    if (!(prog[keyFor(p.id, lv)] || {}).d) { openPicture(p.id, lv); return; }
  }
  paintHome(); show('home');
};
let armT = 0;
$('againBtn').onclick = () => {
  if (!res) return;
  const b = $('againBtn');
  // starting over wipes the coloring, so it takes a second tap (no pop-ups in the lab)
  if (!b.classList.contains('arm')) {
    b.classList.add('arm'); b.textContent = 'Tap again to start over';
    clearTimeout(armT); armT = setTimeout(() => { b.classList.remove('arm'); b.textContent = 'Color it again'; }, 3000);
    return;
  }
  clearTimeout(armT);
  delete prog[res.key]; delete thumbs[res.key];
  saveProgress(); saveThumbs();
  openPicture(res.id, res.lv);
};
$('resBack').onclick = () => { sfx.click(); paintHome(); show('home'); };

/* ---------- buttons ---------- */
$('soundBtn').onclick = () => { prefs.sound = !prefs.sound; savePrefs(); paintSound(); if (prefs.sound) sfx.click(); };
$('helpBtn').onclick = () => { $('help').hidden = false; $('helpClose').focus(); };
$('helpClose').onclick = () => { $('help').hidden = true; };
$('help').addEventListener('click', (e) => { if (e.target === $('help')) $('help').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('help').hidden) $('help').hidden = true; });
addEventListener('capra-profile:changed', () => { if (!cur) paintHome(); });

// for checking the game by hand: window.__cbn.state(), .fillAll(), .open(id, lv)
window.__cbn = {
  state: () => cur && { id: cur.id, lv: cur.lv, filled: cur.filled.size, total: cur.P.total, sel: cur.sel, colors: cur.P.palette.length, view: { ...view }, done: cur.done },
  open: (id, lv) => openPicture(id, lv),
  fillAll(leave = 0) {
    if (!cur) return;
    const todo = cur.P.units.map((u, i) => i).filter((i) => !cur.P.units[i].auto && !cur.filled.has(i));
    for (const i of todo.slice(0, Math.max(0, todo.length - leave))) { cur.sel = cur.P.units[i].num; fill(i, W / 2, H / 2); if (!cur || cur.done) break; }
  },
  tapUnit(i) { const l = cur.P.units[i].labels[0]; const [sx, sy] = toScreen(l.x, l.y); tap(sx, sy); },
  puzzle: () => cur && cur.P,
  redraw() { const t = performance.now(); full(); return performance.now() - t; },
  repatch(i) { const t = performance.now(); part(cur.P.ubox[i]); return performance.now() - t; },
  toScreen: (x, y) => toScreen(x, y),
};

paintSound();
paintHome();
show('home');
