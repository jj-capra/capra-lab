/* IRL: the page. Pick a challenge, prop the phone up, step back: the camera finds your body with
   MediaPipe's pose model (run right on the phone from ./vendor and ./models, nothing sent anywhere),
   logic.mjs turns the body points into reps, holds, hits and dribbles, and the lab wallet pays.
   Tests set window.__irlFake before load and feed made-up bodies through window.__irl.feed(frame). */
import { CHALLENGES, ORDER, COUNTERS, BONES, P, SILOS, framing, shareRow, MIN_TO_PAY } from './logic.mjs';

const $ = (id) => document.getElementById(id);
const FAKE = !!window.__irlFake;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } } };
const me = () => { const p = store.get('capra-lab.profile', null); return p && p.name && p.code ? p : null; };
const prefs = Object.assign({ sound: true }, store.get('irl.prefs', {}));
const bestKey = () => 'irl.best.' + ((me() || {}).handle || 'guest');
const bests = () => store.get(bestKey(), {});
const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const scoreText = (kind, n) => (kind === 'wallsit' ? fmt(n) : String(n));

function show(name) {
  for (const s of document.querySelectorAll('[data-screen]')) s.hidden = s.dataset.screen !== name;
  window.scrollTo(0, 0);
}

/* ---------- sound and voice (made here; the voice counts so you can hear it across the room) ---------- */
let ac = null;
const audio = () => { if (!prefs.sound) return null; try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; } };
function tone(f, t0, dur, type = 'square', vol = 0.08, f2 = 0) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  beep: () => tone(660, 0, 0.14, 'square', 0.07),
  go: () => { tone(990, 0, 0.35, 'square', 0.08); tone(1320, 0.05, 0.3, 'triangle', 0.06); },
  rep: () => { tone(520, 0, 0.07, 'triangle', 0.1); tone(780, 0.06, 0.12, 'triangle', 0.1); },
  smash: () => { tone(1200, 0, 0.05, 'square', 0.06, 300); tone(180, 0, 0.18, 'sawtooth', 0.06, 60); },
  miss: () => tone(170, 0, 0.2, 'sawtooth', 0.05, 120),
  whistle: () => { tone(2100, 0, 0.18, 'sine', 0.09, 2400); tone(2100, 0.24, 0.5, 'sine', 0.09, 2350); },
  kick: () => { tone(110, 0, 0.14, 'sine', 0.16, 45); tone(700, 0, 0.04, 'square', 0.03, 200); },
  save: () => { tone(260, 0, 0.08, 'square', 0.08, 120); tone(880, 0.05, 0.12, 'triangle', 0.09); tone(1320, 0.12, 0.16, 'triangle', 0.08); },
  goal: () => { tone(150, 0, 0.55, 'sawtooth', 0.07); tone(155, 0, 0.55, 'square', 0.03); },
  slice: (n = 1) => { tone(2200, 0, 0.07, 'sawtooth', 0.025, 500); tone(380 * Math.pow(1.26, n), 0.03, 0.14, 'triangle', 0.1); },
  spicy: () => { tone(600, 0, 0.35, 'square', 0.06, 120); tone(90, 0.05, 0.3, 'sawtooth', 0.05); },
  thud: () => tone(120, 0, 0.12, 'sine', 0.06, 70),
  // Silo Derby: the pitch's whoosh, the crack of the bat, the skee-ball clunk as it drops in
  pitch: () => tone(900, 0, 0.32, 'sine', 0.03, 220),
  crack: (p = 1) => { tone(2400, 0, 0.04, 'square', 0.09, 900); tone(160 + p * 120, 0, 0.12, 'sawtooth', 0.08, 60); },
  drop: (pts = 10) => { tone(140, 0, 0.09, 'square', 0.07, 80); tone(pts >= 100 ? 1320 : pts >= 50 ? 990 : 660, 0.08, 0.22, 'triangle', 0.09); if (pts >= 100) tone(1760, 0.2, 0.3, 'triangle', 0.08); },
  strike: () => { tone(330, 0, 0.12, 'square', 0.05); tone(220, 0.12, 0.25, 'square', 0.05); },
};
function say(text) {
  if (!prefs.sound || !('speechSynthesis' in window) || !text) return;
  try { const u = new SpeechSynthesisUtterance(text); u.rate = 1.15; u.pitch = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* no voice here */ }
}
function paintSound() {
  $('soundBtn').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${prefs.sound ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'}</svg>`;
  $('soundBtn').setAttribute('aria-pressed', String(prefs.sound));
}
$('soundBtn').onclick = () => { prefs.sound = !prefs.sound; store.set('irl.prefs', prefs); paintSound(); if (prefs.sound) sfx.beep(); };
paintSound();
$('helpBtn').onclick = () => { $('veil').hidden = false; $('helpX').focus(); };
$('helpX').onclick = () => { $('veil').hidden = true; };
$('veil').addEventListener('click', (e) => { if (e.target === $('veil')) $('veil').hidden = true; });

/* ---------- home ---------- */
function renderHome() {
  const b = bests();
  $('cards').innerHTML = ORDER.map((k) => {
    const c = CHALLENGES[k];
    const what = k === 'wallsit' ? `Hold up to ${fmt(c.secs)} · goal ${c.goal} s` : `${c.secs} seconds · goal ${c.goal} ${c.units}`;
    return `<button type="button" class="ch" data-k="${k}" style="--c:${c.color}"><span class="em" aria-hidden="true">${c.emoji}</span>
      <span><b>${esc(c.name.toUpperCase())}</b><small>${esc(c.blurb)} ${esc(what)}</small></span>
      <span class="best">${b[k] != null ? esc(scoreText(k, b[k])) : '–'}<span>BEST</span></span></button>`;
  }).join('');
  for (const el of $('cards').querySelectorAll('.ch')) el.onclick = () => openChallenge(el.dataset.k);
}

/* ---------- the camera and the motion tracker ---------- */
const video = $('video'), canvas = $('overlay'), ctx = canvas.getContext('2d');
let stream = null, facing = 'user', landmarker = null, loadingModel = null, raf = 0, lastVideoTime = -1, wake = null;
async function loadModel() {
  if (landmarker) return landmarker;
  loadingModel ||= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import('./vendor/vision_bundle.mjs');
    const files = await FilesetResolver.forVisionTasks(new URL('./vendor/wasm', location.href).href);
    const opts = (delegate) => ({ baseOptions: { modelAssetPath: new URL('./models/pose_landmarker_lite.task', location.href).href, delegate },
      runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    try { return await PoseLandmarker.createFromOptions(files, opts('GPU')); }
    catch { return await PoseLandmarker.createFromOptions(files, opts('CPU')); }
  })();
  try { landmarker = await loadingModel; } catch (e) { loadingModel = null; throw e; }
  return landmarker;
}
async function startCamera() {
  stopCamera();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { const e = new Error('no camera'); e.name = 'NotSupportedError'; throw e; }
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
  video.srcObject = stream;
  video.classList.toggle('mirror', facing === 'user');
  await video.play().catch(() => {});
}
function stopCamera() {
  if (stream) for (const t of stream.getTracks()) t.stop();
  stream = null; video.srcObject = null;
}
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { /* the screen may dim; fine */ }
}
const mirrored = () => FAKE || facing === 'user';
// Where the picture sits on screen (letterboxed, the whole camera picture shows).
function box() {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const vw = FAKE ? 480 : video.videoWidth || 480, vh = FAKE ? 640 : video.videoHeight || 640;
  const s = Math.min(W / vw, H / vh), dw = vw * s, dh = vh * s;
  return { W, H, ox: (W - dw) / 2, oy: (H - dh) / 2, dw, dh, aspect: vw / vh };
}
const toScreen = (b, p) => [b.ox + (mirrored() ? 1 - p.x : p.x) * b.dw, b.oy + p.y * b.dh];

function frameLoop() {
  cancelAnimationFrame(raf);
  const step = () => {
    if (!S || S.phase === 'done') return;
    if (!FAKE && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      try {
        const res = landmarker.detectForVideo(video, performance.now());
        handle({ lm: (res.landmarks && res.landmarks[0]) || null, world: (res.worldLandmarks && res.worldLandmarks[0]) || null, t: performance.now(), aspect: (video.videoWidth || 480) / (video.videoHeight || 640) });
      } catch (e) { /* one bad frame; keep going */ }
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

/* ---------- drawing: the comic stick figure, targets, pops ---------- */
function draw(f) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), b = box();
  if (canvas.width !== Math.round(b.W * dpr) || canvas.height !== Math.round(b.H * dpr)) { canvas.width = Math.round(b.W * dpr); canvas.height = Math.round(b.H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, b.W, b.H);
  if (FAKE) { ctx.fillStyle = '#1B1528'; ctx.fillRect(b.ox, b.oy, b.dw, b.dh); }
  const color = S ? CHALLENGES[S.kind].color : '#FFD23F';
  const lm = f && f.lm;
  if (S && S.kind === 'keeper') drawGoal(b);
  if (S && S.kind === 'derby' && S.counter) drawSilos(b, f ? f.t : performance.now());
  if (lm) {
    const ok = (i) => lm[i] && (lm[i].visibility == null || lm[i].visibility > 0.45);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, c] of [[11, '#120E18'], [6, color]]) {
      ctx.lineWidth = w; ctx.strokeStyle = c;
      ctx.beginPath();
      for (const [a, z] of BONES) if (ok(a) && ok(z)) { const [x1, y1] = toScreen(b, lm[a]), [x2, y2] = toScreen(b, lm[z]); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
      ctx.stroke();
    }
    for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
      if (!ok(i)) continue;
      const [x, y] = toScreen(b, lm[i]);
      ctx.beginPath(); ctx.arc(x, y, i === 15 || i === 16 ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = i === 15 || i === 16 ? '#FFF8EC' : color; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#120E18'; ctx.stroke();
    }
    if (ok(P.NOSE)) { const [x, y] = toScreen(b, lm[P.NOSE]); ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.stroke(); }
  }
  // the target
  const tg = S && S.phase === 'live' && S.kind === 'targets' ? S.counter.target : null;
  if (tg) {
    const [x, y] = toScreen(b, tg), r = S.counter.radius * b.dh * 1.05;
    const left = Math.max(0, 1 - (performance.now() - (S.tgShown.get(tg.id) || performance.now())) / 2600);
    if (!S.tgShown.has(tg.id)) S.tgShown.set(tg.id, performance.now());
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(5,3,10,0.35)'; ctx.beginPath(); ctx.arc(5, 7, r, 0, Math.PI * 2); ctx.fill();
    for (const [rr, c] of [[1, '#FF3D8B'], [0.68, '#FFF8EC'], [0.36, '#FF3D8B']]) { ctx.beginPath(); ctx.arc(0, 0, r * rr, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#120E18'; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.lineWidth = 6; ctx.strokeStyle = '#FFD23F'; ctx.stroke();
    ctx.restore();
  }
  if (S && S.phase === 'live' && S.kind === 'keeper') drawBall(b, f ? f.t : performance.now());
  if (S && S.phase === 'live' && S.kind === 'avocado') { drawTrails(b, f); drawAvocados(b, f ? f.t : performance.now()); }
  if (S && S.phase === 'live' && S.kind === 'derby') { drawBat(b, f); drawPitch(b, f ? f.t : performance.now()); drawFlyers(b, f ? f.t : performance.now()); }
}
// Silo Derby: a row of grain silos across the top of the picture, the back row big (100, 50, 100), the
// front row smaller (10, 20, 30, 20, 10); a silo glows when a ball drops in.
function drawSilos(b, t) {
  for (const sl of S.counter.silos) {
    const [x, y] = toScreen(b, sl), r = sl.r * b.dh, w = r * 1.5, h = r * 2.1, hot = S.lit && S.lit[sl.i] && t - S.lit[sl.i] < 650;
    const body = sl.pts >= 100 ? '#E8322E' : sl.pts >= 50 ? '#3D7BFF' : sl.pts >= 30 ? '#5BE38A' : sl.pts >= 20 ? '#B79CFF' : '#29D3F0';
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.94;
    if (hot) { ctx.beginPath(); ctx.arc(0, h * 0.2, w * 1.25, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,214,63,0.45)'; ctx.fill(); }
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#120E18'; ctx.lineJoin = 'round';
    // the silo: a tin barrel with a dome, bands, and the hole at the top the ball drops into
    ctx.beginPath(); ctx.rect(-w / 2, -h * 0.15, w, h); ctx.fillStyle = body; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(18,14,24,0.45)'; ctx.lineWidth = 2;
    for (const k of [0.25, 0.55]) { ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.15 + h * k); ctx.lineTo(w / 2, -h * 0.15 + h * k); ctx.stroke(); }
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#120E18';
    ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.15); ctx.quadraticCurveTo(0, -h * 0.75, w / 2, -h * 0.15); ctx.closePath(); ctx.fillStyle = '#C9C2D6'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -h * 0.32, w * 0.24, w * 0.09, 0, 0, Math.PI * 2); ctx.fillStyle = '#120E18'; ctx.fill();
    // the points, big on the barrel
    ctx.font = `${Math.round(r * (sl.pts >= 100 ? 0.95 : 1.05))}px Bangers, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = '#120E18'; ctx.strokeText(String(sl.pts), 0, h * 0.42); ctx.fillStyle = '#FFF8EC'; ctx.fillText(String(sl.pts), 0, h * 0.42);
    ctx.restore();
  }
}
// The bat: from the hands out along the forearm, a fat comic bat (and a swoosh when it's moving fast).
function drawBat(b, f) {
  const lm = f && f.lm; if (!lm) return;
  const ok = (i) => lm[i] && (lm[i].visibility == null || lm[i].visibility > 0.45);
  const hands = [P.LW, P.RW].filter(ok); if (!hands.length) return;
  const hx = hands.reduce((a, i) => a + lm[i].x, 0) / hands.length, hy = hands.reduce((a, i) => a + lm[i].y, 0) / hands.length;
  // point the bat away from the elbows (both arms together, like a grip)
  const els = [[P.LE, P.LW], [P.RE, P.RW]].filter(([e, w]) => ok(e) && ok(w));
  let dx = 0, dy = -1;
  if (els.length) { dx = els.reduce((a, [e, w]) => a + (lm[w].x - lm[e].x) * b.dw, 0); dy = els.reduce((a, [e, w]) => a + (lm[w].y - lm[e].y) * b.dh, 0); if (mirrored()) dx = -dx; }
  const d = Math.hypot(dx, dy) || 1, L = b.dh * 0.26;
  const [x0, y0] = toScreen(b, { x: hx, y: hy }), x1 = x0 + (dx / d) * L, y1 = y0 + (dy / d) * L;
  S.batPath ||= [];
  S.batPath.push({ x: x1, y: y1, t: f.t }); while (S.batPath.length && f.t - S.batPath[0].t > 140) S.batPath.shift();
  if (S.batPath.length > 2) {
    ctx.beginPath(); S.batPath.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,248,236,0.28)'; ctx.stroke();
  }
  ctx.save(); ctx.translate(x0, y0); ctx.rotate(Math.atan2(dy, dx));
  ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(L * 0.45, -5); ctx.quadraticCurveTo(L * 0.8, -11, L, -10); ctx.quadraticCurveTo(L + 9, 0, L, 10); ctx.quadraticCurveTo(L * 0.8, 11, L * 0.45, 5); ctx.lineTo(-8, 4); ctx.closePath();
  ctx.fillStyle = '#C98A4B'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#120E18'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(L * 0.5, -3); ctx.lineTo(L * 0.92, -6); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,248,236,0.55)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(-9, 0, 6, 0, Math.PI * 2); ctx.fillStyle = '#120E18'; ctx.fill();
  ctx.restore();
}
function baseball(x, y, r, spin) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#FFF8EC'; ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.strokeStyle = '#E8322E';
  ctx.beginPath(); ctx.arc(-r * 1.25, 0, r * 0.85, -0.75, 0.75); ctx.stroke();                     // the two red seams
  ctx.beginPath(); ctx.arc(r * 1.25, 0, r * 0.85, Math.PI - 0.75, Math.PI + 0.75); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.lineWidth = Math.max(2, r * 0.1); ctx.strokeStyle = '#120E18'; ctx.stroke();
  ctx.restore();
}
function drawPitch(b, t) {
  const ball = S.counter.ball(t); if (!ball) return;
  const [x, y] = toScreen(b, ball), r = Math.max(4, ball.r * b.dh);
  const [fx, fy] = toScreen(b, S.counter.pitch.from), dx = x - fx, dy = y - fy, d = Math.hypot(dx, dy) || 1;
  ctx.save(); ctx.strokeStyle = 'rgba(255,248,236,0.5)'; ctx.lineCap = 'round';
  for (const k of [-0.5, 0, 0.5]) { const ox = (-dy / d) * r * k, oy = (dx / d) * r * k; ctx.lineWidth = Math.max(2, r * 0.16); ctx.beginPath(); ctx.moveTo(x - (dx / d) * r * 1.2 + ox, y - (dy / d) * r * 1.2 + oy); ctx.lineTo(x - (dx / d) * r * 2.6 + ox, y - (dy / d) * r * 2.6 + oy); ctx.stroke(); }
  // the sweet spot: a ring that tightens onto the ball as it arrives
  if (ball.p > 0.55 && ball.p < 1.15) { ctx.beginPath(); ctx.arc(x, y, r + 6 + Math.max(0, 1 - ball.p) * 40, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = ball.p >= 0.85 ? '#5BE38A' : '#FFD23F'; ctx.stroke(); }
  ctx.restore();
  baseball(x, y, r, t / 70);
}
function drawFlyers(b, t) {
  for (const fl of S.counter.flyers) {
    const p = S.counter.flyer(fl, t);
    if (p.u >= 1) continue;
    const [x, y] = toScreen(b, p);
    baseball(x, y, Math.max(4, p.r * b.dh), t / 50);
  }
}
// Goalkeeper: the goal frame around the picture (posts, crossbar, a faint net) and the ball coming in.
function drawGoal(b) {
  const L = b.ox + b.dw * 0.04, R = b.ox + b.dw * 0.96, T = b.oy + b.dh * 0.07, B = b.oy + b.dh;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,248,236,0.12)'; ctx.lineWidth = 1.5;
  for (let x = L; x <= R; x += 22) { ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, B); ctx.stroke(); }
  for (let y = T; y <= B; y += 22) { ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke(); }
  ctx.lineCap = 'round';
  for (const [w, c] of [[16, '#120E18'], [10, '#FFF8EC']]) {
    ctx.lineWidth = w; ctx.strokeStyle = c;
    ctx.beginPath(); ctx.moveTo(L, B); ctx.lineTo(L, T); ctx.lineTo(R, T); ctx.lineTo(R, B); ctx.stroke();
  }
  ctx.restore();
}
function drawBall(b, t) {
  const ball = S.counter.ball(t); if (!ball) return;
  const [x, y] = toScreen(b, ball), r = Math.max(4, ball.r * b.dh), sh = S.counter.shot;
  const [fx, fy] = toScreen(b, sh.from);
  ctx.save();
  // speed lines back toward where it came from
  const dx = x - fx, dy = y - fy, d = Math.hypot(dx, dy) || 1;
  ctx.strokeStyle = 'rgba(255,248,236,0.55)'; ctx.lineCap = 'round';
  for (const k of [-0.55, 0, 0.55]) {
    const ox = (-dy / d) * r * k, oy = (dx / d) * r * k;
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.beginPath(); ctx.moveTo(x - (dx / d) * r * 1.2 + ox, y - (dy / d) * r * 1.2 + oy); ctx.lineTo(x - (dx / d) * r * (2.2 + ball.p) + ox, y - (dy / d) * r * (2.2 + ball.p) + oy); ctx.stroke();
  }
  if (ball.p >= 0.55) { ctx.beginPath(); ctx.arc(x, y, r + 10, 0, Math.PI * 2); ctx.lineWidth = 6; ctx.strokeStyle = '#FFD23F'; ctx.stroke(); }
  ctx.translate(x, y); ctx.rotate(t / 160);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#FFF8EC'; ctx.fill();
  const pent = (cx, cy, rr, rot) => { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = rot + (i * 2 * Math.PI) / 5; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = '#120E18'; ctx.fill(); };
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  pent(0, 0, r * 0.36, -Math.PI / 2);
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; pent(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.32, a + Math.PI); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.lineWidth = Math.max(2, r * 0.1); ctx.strokeStyle = '#120E18'; ctx.stroke();
  ctx.restore();
}
// Avocado Chop: a slash streak behind each hand, then the avocados (whole, split, sliced) and chilis.
function drawTrails(b, f) {
  const lm = f && f.lm, t = f ? f.t : performance.now();
  S.trails ||= { L: [], R: [] };
  for (const [k, w, i] of [['L', P.LW, P.LI], ['R', P.RW, P.RI]]) {
    const pt = lm && [lm[i], lm[w]].find((p) => p && (p.visibility == null || p.visibility > 0.45));
    const tr = S.trails[k];
    if (pt) tr.push({ x: pt.x, y: pt.y, t });
    while (tr.length && t - tr[0].t > 170) tr.shift();
    if (tr.length < 2) continue;
    for (const [lw, c] of [[14, 'rgba(155,229,100,0.35)'], [6, '#FFF8EC']]) {
      ctx.beginPath();
      tr.forEach((q, j) => { const [x, y] = toScreen(b, q); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = c; ctx.stroke();
    }
  }
}
function drawAvocados(b, t) {
  for (const it of S.counter.items) {
    const [x, y] = toScreen(b, it), r = it.r * b.dh;
    ctx.save();
    ctx.translate(x, y);
    if (it.fade) ctx.globalAlpha = Math.max(0, 1 - (t - it.fade) / 450);
    if (it.kind === 'chili') {
      ctx.rotate(it.spin);
      ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.2); ctx.quadraticCurveTo(-r * 0.2, -r * 0.7, r * 0.6, -r * 0.35); ctx.quadraticCurveTo(r * 1.1, -r * 0.1, r * 0.9, r * 0.5);
      ctx.quadraticCurveTo(r * 0.2, r * 0.1, -r * 0.9, r * 0.25); ctx.closePath();
      ctx.fillStyle = '#E8322E'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#120E18'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(-r * 1.25, -r * 0.25); ctx.lineWidth = 5; ctx.strokeStyle = '#3E8E2F'; ctx.stroke();
      ctx.restore(); continue;
    }
    const shape = (s) => { ctx.beginPath(); ctx.moveTo(0, -r * s); ctx.bezierCurveTo(r * 0.55 * s, -r * s, r * 0.85 * s, r * 0.25 * s, r * 0.8 * s, r * 0.5 * s); ctx.bezierCurveTo(r * 0.7 * s, r * 1.05 * s, -r * 0.7 * s, r * 1.05 * s, -r * 0.8 * s, r * 0.5 * s); ctx.bezierCurveTo(-r * 0.85 * s, r * 0.25 * s, -r * 0.55 * s, -r * s, 0, -r * s); ctx.closePath(); };
    if (!it.cuts) {
      ctx.rotate(Math.sin(it.spin) * 0.6);
      shape(1); ctx.fillStyle = '#365E22'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#120E18'; ctx.stroke();
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.2, r * 0.18, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
      ctx.restore(); continue;
    }
    // split along the first cut; the halves drift apart and tip, sliced again by every later cut
    const a = it.lines[0], gap = 4 + it.cuts * 4 + (it.fade ? (t - it.fade) / 12 : 0);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(Math.cos(a + Math.PI / 2) * gap * side, Math.sin(a + Math.PI / 2) * gap * side);
      ctx.rotate(side * (0.12 + it.cuts * 0.05));
      ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.rect(-r * 2, side > 0 ? 0 : -r * 2, r * 4, r * 2); ctx.clip(); ctx.rotate(-a);
      shape(1); ctx.fillStyle = '#365E22'; ctx.fill();
      shape(0.84); ctx.fillStyle = '#D8EE7C'; ctx.fill();
      shape(0.5); ctx.fillStyle = '#F2F7B5'; ctx.fill();
      // the pit stays in one half, sitting on the cut
      if (side < 0) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 0.3, 0, Math.PI * 2); ctx.fillStyle = '#8A5A2B'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#120E18'; ctx.stroke(); ctx.restore(); }
      shape(1); ctx.lineWidth = 3.5; ctx.strokeStyle = '#120E18'; ctx.stroke();
      for (const l of it.lines.slice(1)) { ctx.save(); ctx.rotate(l); ctx.beginPath(); ctx.moveTo(-r * 1.1, 0); ctx.lineTo(r * 1.1, 0); ctx.lineWidth = 3; ctx.strokeStyle = '#120E18'; ctx.stroke(); ctx.restore(); }
      ctx.restore(); ctx.restore();
    }
    ctx.restore();
  }
}
function flashCam() { const c = $('cam'); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }
function pop(text, at) {
  const el = document.createElement('div');
  el.className = 'pop'; el.textContent = text;
  if (at) { const b = box(), [x, y] = toScreen(b, at), r = $('cam').getBoundingClientRect(); el.style.left = r.left + x + 'px'; el.style.top = r.top + y + 'px'; }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 750);
}

/* ---------- a challenge ---------- */
let S = null;   // { kind, phase: setup | wait | count | live | done, counter, okSince, startAt, score, ... }
let ticker = 0;
async function openChallenge(kind) {
  const C = CHALLENGES[kind];
  S = { kind, phase: 'setup', counter: null, okSince: null, startAt: 0, score: 0, tgShown: new Map(), lastFrame: null, lostSince: null };
  show('stage');
  $('stTitle').textContent = C.name.toUpperCase();
  $('hud').hidden = true; $('meter').hidden = true; $('coach').hidden = true; $('camAlert').hidden = true; $('countdown').innerHTML = '';
  $('setup').hidden = false;
  $('setup').style.setProperty('--c', C.color);
  $('setup').innerHTML = `<div class="top"><span class="em" aria-hidden="true">${C.emoji}</span><h2>${esc(C.name.toUpperCase())}<small>${kind === 'wallsit' ? `HOLD UP TO ${fmt(C.secs)} · GOAL ${C.goal} SECONDS` : `${C.secs} SECONDS · GOAL ${C.goal} ${C.units.toUpperCase()}`}</small></h2></div>
    <ol class="steps"><li>${esc(C.setup)}</li><li>${esc(C.how)}</li><li>Tap <b>Start</b>, then walk to your spot. The countdown starts by itself when the camera sees you.</li></ol>
    <div class="status" id="status"><i></i><span id="statusTxt">Starting the camera…</span></div>
    <div class="row"><button class="btn" type="button" id="startBtn" disabled>START</button></div>
    <p class="fine">The picture stays on your phone. Nothing is recorded or sent.</p>`;
  $('startBtn').onclick = begin;
  draw(null);
  frameLoop();
  if (FAKE) { setStatus('Camera ready (test)', ''); $('startBtn').disabled = false; return; }
  try {
    await startCamera();
    if (!S || S.kind !== kind) return;
    setStatus('Warming up the motion tracker… the first time takes a few seconds.', '');
    await loadModel();
    if (!S || S.kind !== kind) return;
    setStatus('Ready when you are. Tap Start.', 'ok');
    $('startBtn').disabled = false;
  } catch (e) { cameraTrouble(e); }
}
function setStatus(text, kind) {
  const s = $('status'); if (!s) return;
  s.className = 'status' + (kind ? ' ' + kind : '');
  $('statusTxt').textContent = text;
}
function cameraTrouble(e) {
  const blocked = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
  const none = e && (e.name === 'NotFoundError' || e.name === 'NotSupportedError' || e.name === 'OverconstrainedError');
  $('camAlert').hidden = false;
  $('camAlert').innerHTML = blocked
    ? `<h3>CAMERA'S BLOCKED</h3><p>IRL needs the camera to see you move (the picture never leaves your phone).</p><p>On iPhone: Settings → Apps → Safari → Camera → Ask or Allow. Then come back and try again.</p><div class="row"><button class="btn" type="button" id="retryCam">TRY AGAIN</button></div>`
    : none
      ? `<h3>NO CAMERA</h3><p>We couldn’t find a camera on this device. IRL works on a phone or tablet with a camera.</p>`
      : `<h3>THAT DIDN'T START</h3><p>The motion tracker didn’t load (${esc((e && e.message) || 'unknown')}). Check your signal and try again.</p><div class="row"><button class="btn" type="button" id="retryCam">TRY AGAIN</button></div>`;
  setStatus(blocked ? 'Camera blocked' : 'Not ready', 'bad');
  const r = $('retryCam'); if (r) r.onclick = () => openChallenge(S ? S.kind : 'squat');
}
function begin() {
  if (!S) return;
  audio(); say(' ');      // a tap unlocks sound and voice on iPhone
  keepAwake(true);
  S.phase = 'wait'; S.okSince = null;
  $('setup').hidden = true;
  coach('Get in your spot', 'warn');
}
function coach(text, kind = '') {
  const el = $('coach');
  el.hidden = false;
  if (el.textContent !== text) el.textContent = text;
  el.className = 'coach' + (kind ? ' ' + kind : '');
}
function handle(f) {
  if (!S) return;
  S.lastFrame = f;
  if (S.phase !== 'live') draw(f);
  const C = CHALLENGES[S.kind];
  if (S.phase === 'setup') {
    if (!$('startBtn').disabled) { const fr = framing(S.kind, f.lm); setStatus(fr.ok ? 'We can see you. Tap Start.' : `${fr.say}. You can still tap Start and get in place.`, fr.ok ? 'ok' : ''); }
    return;
  }
  if (S.phase === 'wait') {
    const fr = framing(S.kind, f.lm);
    if (fr.ok) { S.okSince ??= f.t; coach('Hold still…', 'ok'); if (f.t - S.okSince > 1200) countdown(); }
    else { S.okSince = null; coach(fr.say, 'warn'); }
    return;
  }
  if (S.phase !== 'live') return;
  if (!f.lm) { S.lostSince ??= f.t; if (f.t - S.lostSince > 1500) coach('We lost you! Step back in', 'warn'); }
  else S.lostSince = null;
  const r = S.counter.update(f);
  draw(f);   // after the update, so a target that just popped up shows this frame
  if (r.rep) {
    S.score = S.counter.score;
    $('count').textContent = scoreText(S.kind, S.score);
    if (S.kind === 'targets') { sfx.smash(); pop(r.combo >= 3 ? `x${r.combo}!` : 'SMASH!', r.hit); }
    else if (S.kind === 'keeper') { sfx.save(); pop(r.streak >= 3 ? `${r.streak} IN A ROW!` : 'SAVE!', r.save); if (S.score % 5 === 0) say(`${S.score} saves`); }
    else if (S.kind === 'avocado') { /* each cut pops its own points below */ }
    else if (S.kind === 'derby') {
      const h = r.hit, sl = S.counter.silos[h.silo];
      sfx.crack(h.power); pop(h.row === 0 ? 'CRACK!' : 'POP!', h.from);
      setTimeout(() => { if (!S || S.kind !== 'derby') return; (S.lit ||= {})[h.silo] = performance.now(); sfx.drop(h.pts); pop(`+${h.pts}`, sl); if (h.pts >= 100) flashCam(); }, 760);
      if (h.pts >= 100) say('Corner pocket!');
    }
    else { sfx.rep(); pop(S.kind === 'dribble' ? 'BOUNCE!' : r.say && r.say !== 'Nice!' ? r.say.toUpperCase() : 'REP!'); }
    if (S.kind === 'squat' || S.kind === 'pushup') say(String(S.score));
    else if (S.kind === 'dribble' && S.score % 10 === 0) say(String(S.score));
  }
  if (r.miss) { sfx.miss(); pop('MISS', r.miss); }
  if (S.kind === 'keeper') {
    if (r.shot) sfx.kick();
    if (r.goal) { sfx.goal(); pop('GOAL!', r.goal); flashCam(); $('count').textContent = String(S.counter.score); }
  }
  if (S.kind === 'derby') {
    if (r.pitch) sfx.pitch();
    if (r.strike) { sfx.strike(); pop('STRIKE!', S.lastBallAt); }
    if (r.foul) { sfx.miss(); pop('FOUL!', r.foul); }
    if (r.grounder) { sfx.thud(); pop('GROUNDER', r.grounder); }
    const bl = S.counter.ball(f.t); if (bl) S.lastBallAt = { x: bl.x, y: bl.y };
  }
  if (S.kind === 'avocado') {
    for (const e of r.events || []) {
      if (e.cut) { sfx.slice(e.cut.n); pop(e.cut.guac ? `+${e.cut.pts} GUAC!` : `+${e.cut.pts}`, e.cut); }
      if (e.spicy) { sfx.spicy(); pop('🌶️ −25', e.spicy); flashCam(); }
      if (e.drop) sfx.thud();
    }
    if (S.counter.score !== S.score) { S.score = S.counter.score; $('count').textContent = String(S.score); }
  }
  if (S.kind === 'wallsit') { const s = S.counter.score; if (s !== S.score) { S.score = s; $('count').textContent = scoreText('wallsit', s); if (s && s % 10 === 0) say(`${s} seconds`); } }
  if (r.say && !(S.lostSince && f.t - S.lostSince > 1500)) coach(r.say, r.rep ? 'ok' : '');
  if (r.meter != null) $('meterFill').style.height = Math.round(r.meter * 100) + '%';
  if (r.done) finish();
}
// Where targets may pop up: inside the camera picture, below the counter and clock, above the coach
// line, and in reach (the top two thirds of the picture).
function targetBounds(r = 0.075, yMax = 0.68) {
  const b = box(), cam = $('cam').getBoundingClientRect();
  const hudBottom = $('hud').getBoundingClientRect().bottom - cam.top, coachTop = $('coach').getBoundingClientRect().top - cam.top;
  const toY = (px) => (px - b.oy) / b.dh;
  const y0 = Math.max(0.08, toY(hudBottom + 12) + r), y1 = Math.min(yMax, toY(coachTop - 12) - r);
  const mx = Math.min(0.2, (r * 1.05 * b.dh + 14) / b.dw);   // the whole ring stays on screen
  return { x0: mx, x1: 1 - mx, y0: Math.min(y0, 0.4), y1: Math.max(y1, Math.min(y0, 0.4) + 0.15) };
}
// Silo Derby's silos, kept above the player and clear of the score and the clock: the back row (100,
// 50, 100) in the gap between those two at the top of the picture, the front row (10 to 30) just under them.
function derbyLayout() {
  const b = box(), cam = $('cam').getBoundingClientRect();
  const L = $('hud').querySelector('.count').getBoundingClientRect(), R = $('clockBox').getBoundingClientRect();
  // screen spots first (0..1 across the picture as it shows), then into the picture's own x (mirrored
  // for the front camera), so a silo lands where it was measured
  const y = (p) => (p - cam.top - b.oy) / b.dh, sx = (p) => (p - cam.left - b.ox) / b.dw, px = (v) => (mirrored() ? 1 - v : v);
  const lRight = L.left + Math.max(L.width, 124);            // the score box grows to four digits
  const gapPx = R.left - lRight - 12, rf = 0.042;
  let rb = Math.min(0.05, gapPx / 3.6 / 1.5 / b.dh);
  const hudY = y(Math.max(L.bottom, R.bottom) + 8);
  let back, fy;
  if (rb >= 0.036) {
    // room between the score and the clock: the back row up there, the front row just under them
    const half = (rb * 1.5 * b.dh) / 2 / b.dw, top = Math.max(0.005, y(cam.top + 4)) + rb * 1.6;
    const gapL = sx(lRight + 6) + half, gapR = sx(R.left - 6) - half, mid = (gapL + gapR) / 2, spread = Math.max(0, (gapR - gapL) / 2);
    back = (lane) => ({ x: px(mid + lane * spread), y: top, r: rb });
    fy = Math.max(hudY, top + rb * 3.4) + rf * 1.6;
  } else {
    // a narrow phone: both rows under the score and the clock
    rb = 0.045;
    const top = hudY + rb * 1.6;
    back = (lane) => ({ x: px(0.5 + lane * 0.3), y: top, r: rb });
    fy = top + rb * 1.8 + rf * 1.6;
  }
  return SILOS.map(({ row, lane }) => (row ? { x: px(0.5 + lane * 0.19), y: fy, r: rf } : back(lane)));
}
function countdown() {
  S.phase = 'count';
  coach('Get ready!', 'ok');
  const steps = ['3', '2', '1', 'GO!'];
  steps.forEach((n, i) => setTimeout(() => {
    if (!S || S.phase !== 'count') return;
    $('countdown').innerHTML = `<b>${n}</b>`;
    if (i < 3) { sfx.beep(); say(n); } else { sfx.go(); say('Go!'); }
    if (i === 3) setTimeout(go, 500);
  }, i * 900));
}
function go() {
  if (!S || S.phase !== 'count') return;
  const C = CHALLENGES[S.kind];
  $('countdown').innerHTML = '';
  S.phase = 'live'; S.startAt = performance.now(); S.score = 0;
  $('hud').hidden = false; $('meter').hidden = !(S.kind === 'squat' || S.kind === 'pushup' || S.kind === 'wallsit');
  S.counter = S.kind === 'wallsit' ? COUNTERS.wallsit(C.secs)
    : S.kind === 'targets' ? COUNTERS.targets({ bounds: targetBounds() })
    : S.kind === 'keeper' ? COUNTERS.keeper({ bounds: targetBounds(0.075, 0.9) })
    : S.kind === 'derby' ? COUNTERS.derby({ bounds: targetBounds(0.06, 0.9), layout: derbyLayout() })
    : COUNTERS[S.kind]();
  S.trails = null; S.batPath = null; S.lit = null;
  $('count').textContent = scoreText(S.kind, 0);
  $('clock').textContent = S.kind === 'wallsit' ? fmt(C.goal) : fmt(C.secs);
  $('clockBox').classList.remove('low');
  $('countUnit').textContent = S.kind === 'wallsit' ? 'held' : C.units;
  $('clockLbl').textContent = S.kind === 'wallsit' ? 'to the goal' : 'left';
  coach('GO!', 'ok');
  clearInterval(ticker);
  ticker = setInterval(() => {
    if (!S || S.phase !== 'live') return clearInterval(ticker);
    const el = (performance.now() - S.startAt) / 1000;
    if (S.kind === 'wallsit') {
      // the wall sit's own clock is the held time (big, on the left); this one counts down to the goal
      const held = S.counter.score;
      $('clock').textContent = held >= C.goal ? 'GOAL!' : fmt(C.goal - held);
      $('clockLbl').textContent = held >= C.goal ? `max ${fmt(C.secs)}` : 'to the goal';
      if (held >= C.goal && !S.goalSaid) { S.goalSaid = true; sfx.go(); pop('GOAL!'); }
      if (el > C.secs + 30) finish();
      return;
    }
    const left = Math.max(0, C.secs - el);
    $('clock').textContent = fmt(Math.ceil(left));
    $('clockBox').classList.toggle('low', left <= 5);
    if (left <= 3.05 && left > 0 && Math.ceil(left) !== S.lastTick) { S.lastTick = Math.ceil(left); sfx.beep(); }
    if (left <= 0) finish();
  }, 100);
}
async function finish() {
  if (!S || S.phase === 'done') return;
  const kind = S.kind, C = CHALLENGES[kind], score = S.counter ? S.counter.score : 0;
  S.phase = 'done';
  clearInterval(ticker); cancelAnimationFrame(raf);
  sfx.whistle(); say(kind === 'wallsit' ? `Time! ${score} seconds` : `Time! ${score}`);
  stopCamera(); keepAwake(false);
  const b = bests(), prev = b[kind], newBest = score >= MIN_TO_PAY[kind] && (prev == null || score > prev);
  if (newBest) { b[kind] = score; store.set(bestKey(), b); }
  const beat = score >= C.goal;
  // the card first, the pay as it comes back
  $('resCard').innerHTML = `<p class="kick">${C.emoji} ${esc(C.name)}${kind === 'wallsit' ? '' : ` · ${C.secs} seconds`}</p>
    <p class="big">${esc(scoreText(kind, score))}<small>${kind === 'wallsit' ? 'HELD' : esc((score === 1 ? C.unit : C.units).toUpperCase())}</small></p>
    ${newBest ? '<span class="burst gold">NEW PERSONAL BEST!</span>' : beat ? '<span class="burst">GOAL SMASHED!</span>' : ''}
    <p class="stats"><span>🎯 Goal ${esc(scoreText(kind, C.goal))}</span><span>🏆 Best ${prev == null && !newBest ? '–' : esc(scoreText(kind, Math.max(prev ?? 0, newBest ? score : 0)))}</span>${kind === 'targets' ? `<span>💥 Best combo ${S.counter.best}</span><span>Missed ${S.counter.misses}</span>` : ''}${kind === 'keeper' ? `<span>🥅 Let in ${S.counter.goals}</span><span>🔥 Best streak ${S.counter.best}</span>` : ''}${kind === 'derby' ? `<span>⚾ ${S.counter.hits} hits</span><span>🚀 ${S.counter.homers} deep</span><span>🔥 Best streak ${S.counter.best}</span><span>Strikes ${S.counter.strikes}</span>` : ''}${kind === 'avocado' ? `<span>🔪 ${S.counter.cuts} cuts</span><span>🥑 Most on one ${S.counter.most}</span>${S.counter.spicy ? `<span>🌶️ ${S.counter.spicy}</span>` : ''}<span>Dropped ${S.counter.dropped}</span>` : ''}</p>
    <p class="paid" id="paidLine"></p>`;
  show('results');
  const shareText = window.CapraShare ? CapraShare.text({ emoji: '💪', game: 'IRL', sub: C.name,
    lines: [`${kind === 'wallsit' ? `${fmt(score)} held` : `${score} ${score === 1 ? C.unit : C.units} in ${C.secs} s`}${newBest ? ' · new best' : ''}`],
    grid: [shareRow(score, C.goal, newBest)] }) : '';
  if (window.CapraShare) {
    $('resShare').innerHTML = '<lab-text-share></lab-text-share>';
    $('resShare').firstChild.set({ emoji: '💪', title: 'IRL', text: shareText, url: `${location.origin}/irl/` });
  }
  const line = $('paidLine');
  if (!me()) { line.innerHTML = '<a href="/#profile" style="color:inherit">Make your Capra Lab profile</a> to get paid for every challenge.'; return; }
  if (score < MIN_TO_PAY[kind]) { line.textContent = `Do at least ${scoreText(kind, MIN_TO_PAY[kind])} ${kind === 'wallsit' ? 'held' : C.units} to get paid.`; line.style.color = 'rgba(255,248,236,.7)'; return; }
  if (!window.CapraWallet) return;
  const day = dayKey(), paid = { amber: 0, shards: 0 };
  const add = (r) => { if (r && r.paid) for (const k of Object.keys(r.paid)) paid[k] = (paid[k] || 0) + r.paid[k]; };
  add(await CapraWallet.earn('irl', 'set', `${kind}-${day}-${Date.now()}`));
  if (beat) add(await CapraWallet.earn('irl', 'goal', `goal-${kind}-${day}`));
  if (newBest) add(await CapraWallet.earn('irl', 'best', `best-${kind}-${score}`));
  const bits = [];
  if (paid.amber) bits.push(`+${paid.amber} amber`);
  if (paid.shards) bits.push(`+${paid.shards} shard${paid.shards === 1 ? '' : 's'}`);
  line.textContent = bits.length ? `Paid into your wallet: ${bits.join(', ')}` : 'You’ve hit today’s IRL pay limit. Come back tomorrow for more.';
}
function leave() {
  if (S && S.phase === 'live') return finish();
  S = null; clearInterval(ticker); cancelAnimationFrame(raf); stopCamera(); keepAwake(false);
  renderHome(); show('home');
}
$('backBtn').onclick = leave;
$('flipBtn').onclick = async () => {
  if (FAKE || !S) return;
  facing = facing === 'user' ? 'environment' : 'user';
  try { await startCamera(); } catch (e) { cameraTrouble(e); }
};
$('homeBtn').onclick = () => { S = null; renderHome(); show('home'); };
$('againBtn').onclick = () => { const k = S ? S.kind : 'squat'; openChallenge(k); };
document.addEventListener('visibilitychange', () => {
  if (!S || FAKE) return;
  if (document.visibilityState === 'hidden') { if (S.phase === 'live') finish(); else if (S.phase !== 'done') stopCamera(); }
  else if (S.phase === 'setup' || S.phase === 'wait') startCamera().catch(cameraTrouble);
});

// tests drive the page with made-up bodies
window.__irl = { feed: (f) => handle({ aspect: 0.75, ...f, t: f.t ?? performance.now() }), state: () => S, open: openChallenge, finish };

renderHome();
if (/^#(squat|pushup|wallsit|targets|dribble|keeper|avocado|derby)$/.test(location.hash)) openChallenge(location.hash.slice(1));
