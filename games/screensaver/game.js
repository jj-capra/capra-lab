// Screensaver's page (JC, Nov 8 2026): a box bounces like an old screensaver, pauses, and you have
// 25 seconds to call the corner it will hit dead on. The boards come from shared/board.mjs, the
// same module the server scores runs with, so today's run is the same on every phone.
import { level, points, field, GUESS_MS, LIVES, MAX_LEVEL } from '/screensaver/shared/board.mjs';

const API = '/screensaver/api';
const $ = (id) => document.getElementById(id);
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
const lab = () => { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? { name: p.name, code: p.code } : null; } catch (e) { return null; } };
const COLORS = ['#3BE7FF', '#FF4FB4', '#FFD23F', '#62FF8A', '#B98CFF', '#FF8A3B', '#F4F6FF'];
const LETTERS = 'ABCDEFGHIJKLMNOP';
const mark = new Image();
mark.src = '/lab/capra-lab-mark.png';

async function api(path, body = {}) {
  const me = lab();
  let res, j;
  try {
    res = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(me ? { ...body, lab: me } : body) });
    j = await res.json();
  } catch (e) { const err = new Error('Can’t reach the server. Check your connection.'); err.status = 0; throw err; }
  if (!res.ok) { const e = new Error(j.error || 'Something went wrong.'); e.status = res.status; throw e; }
  return j;
}
let toastT = null;
function toast(text) { const t = $('toast'); t.textContent = text; t.className = 'toast show'; clearTimeout(toastT); toastT = setTimeout(() => { t.className = 'toast'; }, 2600); }
function show(id) { for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id; window.scrollTo(0, 0); }
function help() {
  const v = document.createElement('div');
  v.className = 'veil';
  v.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><button class="round-btn x" type="button" aria-label="Close">✕</button><h2>HOW TO PLAY</h2><ul>
    <li><b>The box bounces like an old screensaver.</b> Off a wall it flips. Into a corner, dead on, and it stops.</li>
    <li><b>It pauses mid-flight.</b> You get 25 seconds to tap the corner it will hit. Picture the rest of its path, bounce by bounce.</li>
    <li><b>Then it plays out.</b> Right corner: 100 points and more for each level, plus up to 100 for a fast call.</li>
    <li><b>Three wrong corners and the run is over.</b> Boards grow, the box shrinks, it bounces more before the corner, and later boards are rooms joined at their corners. The box slips through the gaps.</li>
    <li><b>Today’s run</b> is the same boards for everyone, and your first run of the day goes on the board. Practice is new boards every time.</li>
  </ul></div>`;
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('.x')) v.remove(); });
  document.body.appendChild(v);
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-help]')) help(); });

/* ---------- drawing a board ---------- */
// The walls: every edge between a free cell and a wall, as line segments.
function walls(f) {
  const seg = [];
  for (let y = 0; y < f.H; y++) for (let x = 0; x < f.W; x++) {
    if (!f.ok(x, y)) continue;
    if (!f.ok(x, y - 1)) seg.push([x, y, x + 1, y]);
    if (!f.ok(x, y + 1)) seg.push([x, y + 1, x + 1, y + 1]);
    if (!f.ok(x - 1, y)) seg.push([x, y, x, y + 1]);
    if (!f.ok(x + 1, y)) seg.push([x + 1, y, x + 1, y + 1]);
  }
  return seg;
}
function fit(canvas, W, H, maxH) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const cssW = canvas.parentElement.clientWidth - 16;
  const pad = 10;
  const unit = Math.max(4, Math.min((cssW - pad * 2) / W, (maxH - pad * 2) / H));
  const w = Math.round(W * unit + pad * 2), h = Math.round(H * unit + pad * 2);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; canvas.style.margin = '0 auto';
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, unit, pad, w, h };
}
function drawBoard(g, view) {
  const { ctx, unit, pad, w, h } = g;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate(pad, pad);
  for (const [x, y, rw, rh] of view.rooms) { ctx.fillStyle = '#070A1E'; ctx.fillRect(x * unit, y * unit, rw * unit, rh * unit); }
  // faint dots on the grid, so a sharp eye can count
  if (unit >= 9) {
    ctx.fillStyle = 'rgba(120, 140, 255, 0.16)';
    for (let y = 0; y <= view.H; y++) for (let x = 0; x <= view.W; x++) if (view.f.ok(x, y) || view.f.ok(x - 1, y - 1)) ctx.fillRect(x * unit - 1, y * unit - 1, 2, 2);
  }
  ctx.strokeStyle = '#3BE7FF'; ctx.lineWidth = Math.max(2, unit * 0.14); ctx.lineCap = 'square';
  ctx.shadowColor = 'rgba(59, 231, 255, 0.7)'; ctx.shadowBlur = 8;
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of view.walls) { ctx.moveTo(x1 * unit, y1 * unit); ctx.lineTo(x2 * unit, y2 * unit); }
  ctx.stroke();
  ctx.restore();
}
function drawBox(g, x, y, color, glow = 0) {
  const { ctx, unit, pad } = g;
  const inset = unit * 0.06, s = unit - inset * 2, r = Math.min(8, unit * 0.22);
  const px = pad + x * unit + inset, py = pad + y * unit + inset;
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = 10 + glow * 30;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(px, py, s, s, r); ctx.fill();
  ctx.shadowBlur = 0;
  if (mark.complete && mark.naturalWidth && s >= 16) ctx.drawImage(mark, px + s * 0.14, py + s * 0.14, s * 0.72, s * 0.72);
  ctx.restore();
}

/* ---------- home: an idle screensaver ---------- */
let demoRaf = null;
function demo() {
  const cv = $('demo');
  const W = 16, H = 12, rooms = [[0, 0, W, H]], f = field(rooms);
  const view = { W, H, rooms, f, walls: walls(f) };
  const g = (() => {
    const dpr = Math.min(3, window.devicePixelRatio || 1), w = cv.clientWidth || 320, h = w * 3 / 4;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const unit = Math.min(w / W, h / H);
    return { ctx, unit, pad: (w - W * unit) / 2, w, h };
  })();
  let x = 1, y = 3, vx = 1, vy = 1, c = 0, t0 = performance.now(), last = { x, y };
  cancelAnimationFrame(demoRaf);
  const tick = (t) => {
    const k = (t - t0) / 260;
    if (k >= 1) {
      t0 = t; last = { x, y };
      if (x + vx < 0 || x + vx > W - 1) { vx = -vx; c++; }
      if (y + vy < 0 || y + vy > H - 1) { vy = -vy; c++; }
      x += vx; y += vy;
    }
    const kk = Math.min(1, (t - t0) / 260);
    drawBoard(g, view);
    drawBox(g, last.x + (x - last.x) * kk, last.y + (y - last.y) * kk, COLORS[c % COLORS.length]);
    if (!$('home').hidden) demoRaf = requestAnimationFrame(tick);
  };
  demoRaf = requestAnimationFrame(tick);
}

let hello = null;
async function home() {
  stopGame();
  show('home');
  demo();
  try {
    hello = await api('/hello');
    $('brewNote').hidden = !hello.brew;
    const d = new Date(hello.date + 'T12:00:00');
    $('todayTitle').textContent = 'TODAY’S RUN · ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    if (hello.mine) {
      $('todayNote').textContent = `You scored ${hello.mine.score} today: level ${hello.mine.level}, #${hello.mine.rank} of ${hello.mine.of}. Play it again for fun; only your first run counts.`;
      $('dailyBtn').textContent = 'Play today’s boards again';
    } else if (!lab()) {
      $('todayNote').textContent = 'The same boards for everyone today. Three wrong corners and the run is over. Sign in to Capra Lab to post your score.';
    }
    board(hello.date);
  } catch (e) { toast(e.message); }
}
async function board(date, box = $('board'), me = null) {
  try {
    const b = await api('/board', { date });
    const mine = me || (lab() ? lab().name : null);
    box.innerHTML = b.top.length ? b.top.slice(0, 10).map((r, i) => `<li class="${r.name === mine ? 'me' : ''}"><span>${i + 1}</span><span class="nm">${esc(r.name)}<small>level ${r.level} · ${r.right} right</small></span><b>${r.score}</b></li>`).join('')
      : '<li><span></span><span class="nm muted">Nobody yet today. Be first.</span><b></b></li>';
  } catch (e) { box.innerHTML = `<li><span></span><span class="nm muted">${esc(e.message)}</span><b></b></li>`; }
}
$('dailyBtn').onclick = () => start(hello && !hello.mine ? 'daily' : 'replay');
$('practiceBtn').onclick = () => start('practice');

/* ---------- a run ---------- */
const G = { mode: null, seed: null, n: 0, lives: LIVES, score: 0, picks: [], lv: null, view: null, g: null, raf: null, timer: null, phase: null, pick: null, pausedAt: 0 };
function stopGame() { cancelAnimationFrame(G.raf); clearTimeout(G.timer); G.raf = null; G.phase = null; }
function start(mode) {
  cancelAnimationFrame(demoRaf);
  Object.assign(G, { mode, seed: mode === 'practice' ? 'p:' + Math.random().toString(36).slice(2) : 'ss:' + hello.date, n: 0, lives: LIVES, score: 0, picks: [] });
  show('game');
  next();
}
$('quitBtn').onclick = () => home();
function hud() {
  $('lvl').textContent = 'LEVEL ' + G.n;
  $('pts').textContent = G.score;
  $('lives').innerHTML = Array.from({ length: LIVES }, (_, i) => (i < G.lives ? '♥' : '<i>♥</i>')).join('');
}
function osd(text, pause = false) { const o = $('osd'); o.textContent = text; o.className = 'osd' + (pause ? ' pause' : ''); }

function next() {
  stopGame();
  G.n++;
  const lv = level(G.seed, G.n), f = field(lv.rooms);
  G.lv = lv;
  G.view = { W: lv.W, H: lv.H, rooms: lv.rooms, f, walls: walls(f) };
  // which steps changed direction, for the color on each bounce
  G.colors = [0];
  for (let i = 1; i < lv.path.length; i++) {
    const a = lv.path[i - 1], b = lv.path[i];
    G.colors.push(G.colors[i - 1] + (a.vx !== b.vx || a.vy !== b.vy ? 1 : 0));
  }
  const room = window.innerHeight - 320;
  G.g = fit($('cv'), lv.W, lv.H, Math.max(240, Math.min(room, $('cv').parentElement.clientWidth)));
  G.pick = null;
  hud();
  $('prompt').innerHTML = '<p class="say">Watch it…</p>';
  osd('▶ PLAY');
  // the stretch before the pause takes about two seconds, however long it is
  const speed = Math.min(10, Math.max(3, lv.pause / 1.9));
  play(0, lv.pause, speed, () => pause());
}
// Animate the box from path[a] to path[b] at `speed` steps a second.
function play(a, b, speed, done) {
  const t0 = performance.now();
  const tick = (t) => {
    const k = Math.min(b, a + Math.max(0, (t - t0) / 1000) * speed);   // a frame's time can come just before t0
    frame(k);
    if (k >= b) { G.raf = null; done(); return; }
    G.raf = requestAnimationFrame(tick);
  };
  G.raf = requestAnimationFrame(tick);
}
function frame(k, extra = {}) {
  const { path } = G.lv;
  const i = Math.floor(k), f = k - i, p = path[i], q = path[Math.min(i + 1, path.length - 1)];
  drawBoard(G.g, G.view);
  // a short fading trail shows which way it's going
  const { ctx, unit, pad } = G.g;
  for (let j = Math.max(0, i - 12); j <= i; j++) {
    const a = (j - (i - 12)) / 13;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + a * 0.22})`;
    const s = unit * (0.18 + a * 0.12);
    ctx.fillRect(pad + (path[j].x + 0.5) * unit - s / 2, pad + (path[j].y + 0.5) * unit - s / 2, s, s);
  }
  if (extra.markers) markers(extra);
  drawBox(G.g, p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f, COLORS[G.colors[i] % COLORS.length], extra.glow || 0);
  if (extra.flash) flash(extra.flash);
}
const pocketAt = (p) => ({ x: G.g.pad + (p.x + 0.5) * G.g.unit, y: G.g.pad + (p.y + 0.5) * G.g.unit });
function markers({ result }) {
  const { ctx, unit } = G.g;
  const r = Math.max(12, Math.min(22, unit * 0.48));
  G.lv.pockets.forEach((p, i) => {
    const c = pocketAt(p);
    const isPick = G.pick === p.id, isAns = result && p.id === G.lv.answer;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isAns ? '#62FF8A' : isPick ? (result ? '#FF4D5E' : '#FFD23F') : 'rgba(255, 210, 63, 0.85)';
    ctx.fillStyle = isAns ? 'rgba(98, 255, 138, 0.35)' : isPick ? 'rgba(255, 210, 63, 0.35)' : 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F4F6FF'; ctx.font = `${Math.round(r * 1.25)}px VT323, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LETTERS[i] || '?', c.x, c.y + 1);
    ctx.restore();
  });
}
function flash(k) {
  const p = G.lv.pockets[G.lv.answer], c = pocketAt(p), { ctx, unit } = G.g;
  ctx.save();
  ctx.strokeStyle = `rgba(98, 255, 138, ${1 - k})`; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(c.x, c.y, unit * (0.6 + k * 3), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function pause() {
  G.phase = 'pause';
  G.pausedAt = performance.now();
  osd('❚❚ PAUSE', true);
  $('prompt').innerHTML = '<p class="say">Where will it hit? Tap a corner.</p><div class="timer" id="timer"><i></i></div>';
  const tick = (t) => {
    if (G.phase !== 'pause') return;
    const left = Math.min(GUESS_MS, Math.max(0, GUESS_MS - (t - G.pausedAt)));
    frame(G.lv.pause, { markers: true });
    const bar = $('timer');
    if (bar) { bar.firstElementChild.style.transform = `scaleX(${left / GUESS_MS})`; bar.classList.toggle('low', left < 6000); }
    if (left <= 0) return choose(-1);
    G.raf = requestAnimationFrame(tick);
  };
  G.raf = requestAnimationFrame(tick);
}
$('cv').addEventListener('pointerdown', (e) => {
  if (G.phase !== 'pause') return;
  const rect = $('cv').getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
  let best = null, bd = Infinity;
  for (const p of G.lv.pockets) { const c = pocketAt(p), d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = p; } }
  if (best && bd <= Math.max(30, G.g.unit * 0.9)) choose(best.id);
});
function choose(id) {
  if (G.phase !== 'pause') return;
  cancelAnimationFrame(G.raf);
  G.phase = 'reveal';
  G.pick = id;
  const ms = Math.round(performance.now() - G.pausedAt);
  G.picks.push({ c: id, ms });
  osd('▶ PLAY');
  $('prompt').innerHTML = `<p class="say">${id < 0 ? 'Time’s up!' : `Locked in: ${LETTERS[G.lv.pockets.findIndex((p) => p.id === id)]}`}</p>`;
  const left = G.lv.path.length - 1 - G.lv.pause;
  const speed = Math.min(26, Math.max(6, left / 2.4));
  const t0 = performance.now(), a = G.lv.pause, b = G.lv.path.length - 1;
  const tick = (t) => {
    const k = Math.min(b, a + Math.max(0, (t - t0) / 1000) * speed);   // a frame's time can come just before t0
    frame(k, { markers: true });
    if (k >= b) return land(ms);
    G.raf = requestAnimationFrame(tick);
  };
  G.raf = requestAnimationFrame(tick);
}
function land(ms) {
  const right = G.pick === G.lv.answer;
  const pts = right ? points(G.n, ms) : 0;
  if (right) G.score += pts; else G.lives--;
  hud();
  const ans = LETTERS[G.lv.pockets.findIndex((p) => p.id === G.lv.answer)];
  const over = G.lives <= 0 || G.n >= MAX_LEVEL;
  $('prompt').innerHTML = right
    ? `<p class="say good">PERFECT CORNER! +${pts}</p>`
    : `<p class="say bad">${G.pick < 0 ? 'Time!' : 'Nope.'} It hit ${ans}.</p>`;
  $('prompt').insertAdjacentHTML('beforeend', `<button class="btn wide" type="button" id="nextBtn">${over ? 'See your run' : 'Next board'}</button>`);
  $('nextBtn').onclick = () => (over ? finish() : next());
  if (navigator.vibrate) navigator.vibrate(right ? 30 : [60, 40, 60]);
  const t0 = performance.now();
  const tick = (t) => {
    const k = Math.min(1, Math.max(0, (t - t0) / 900));
    frame(G.lv.path.length - 1, { markers: true, result: true, glow: 1 - k, flash: k });
    if (k < 1) G.raf = requestAnimationFrame(tick);
  };
  G.raf = requestAnimationFrame(tick);
  if (!over) G.timer = setTimeout(() => { if (G.phase === 'reveal') next(); }, 3200);
}

async function finish() {
  stopGame();
  show('over');
  const right = G.picks.filter((p, i) => p.c === level(G.seed, i + 1).answer).length;
  const el = $('overBody');
  el.innerHTML = `<div class="card" style="text-align:center"><h2>RUN OVER</h2><div class="big">${G.score}</div>
      <p class="note">Level ${G.n} · ${right} perfect corner${right === 1 ? '' : 's'}${G.mode === 'practice' ? ' · practice' : G.mode === 'replay' ? ' · not counted' : ''}</p><p class="note" id="postLine"></p></div>
    <section class="card" id="overBoard" ${G.mode === 'practice' ? 'hidden' : ''}><h2>TODAY’S BOARD</h2><ul class="board" id="board2"></ul></section>
    <button class="btn wide" type="button" id="againBtn">Practice run</button>
    <button class="btn alt wide" type="button" id="homeBtn">Home</button>`;
  $('againBtn').onclick = () => start('practice');
  $('homeBtn').onclick = () => home();
  if (G.mode === 'daily') {
    if (!lab()) { $('postLine').textContent = 'Sign in to Capra Lab to put your runs on the board.'; }
    else {
      try {
        const r = await api('/run', { date: hello.date, picks: G.picks });
        $('postLine').textContent = r.counted ? `#${r.rank} of ${r.of} today.` : 'Your first run today is the one on the board.';
        hello.mine = { score: r.score, level: r.level, rank: r.rank, of: r.of };
      } catch (e) { $('postLine').textContent = e.message; }
    }
  }
  if (G.mode !== 'practice') board(hello.date, $('board2'));
}

window.addEventListener('resize', () => { if (!$('home').hidden) demo(); });
home();
