/* Send It!: the page. Pick a contraption, tap PUSH to run it off the pier, then tilt the phone (or drag
   on a computer) to fly it. The flight itself is logic.mjs; this file draws the pier, the water, the wind
   and the contraptions in the lab's comic style, reads the phone's tilt and pays the lab wallet.
   Tests: window.__sendit (state, start, tilt) drives it without a real phone. */
import { CRAFTS, craftOf, createFlight, launchSpeed, PIER, DECK, PUSH_MS, titleFor, shareRow } from './logic.mjs';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } } };
const me = () => { const p = store.get('capra-lab.profile', null); return p && p.name && p.code ? p : null; };
const prefs = Object.assign({ sound: true, craft: 'goat' }, store.get('sendit.prefs', {}));
const savePrefs = () => store.set('sendit.prefs', prefs);
const bestKey = () => 'sendit.best.' + ((me() || {}).handle || 'guest');
const bests = () => store.get(bestKey(), {});
const INK = '#120E18';
function show(id) { for (const s of ['home', 'game', 'results']) $(s).hidden = s !== id; window.scrollTo(0, 0); }

/* ---------- sound (made here) ---------- */
let ac = null;
const audio = () => { if (!prefs.sound) return null; try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; } };
function tone(f, t0, dur, type = 'square', vol = 0.06, f2 = 0) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.12, lp = 900) {
  const a = audio(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = 'lowpass'; f.frequency.value = lp; g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
const sfx = {
  beep: () => tone(660, 0, 0.12, 'square', 0.06),
  push: () => tone(140 + Math.random() * 40, 0, 0.06, 'square', 0.05, 90),
  launch: () => { tone(300, 0, 0.6, 'sawtooth', 0.05, 900); noise(0.6, 0.08, 1400); },
  stall: () => { tone(220, 0, 0.18, 'square', 0.06); tone(180, 0.2, 0.18, 'square', 0.06); },
  blast: () => noise(0.8, 0.18, 2400),
  splash: () => { noise(1.1, 0.3, 700); tone(90, 0, 0.5, 'sine', 0.12, 40); },
  cheer: () => { noise(1.4, 0.07, 3000); tone(880, 0.1, 0.2, 'triangle', 0.06); tone(1320, 0.3, 0.3, 'triangle', 0.06); },
};
function paintSound() {
  $('soundBtn').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${prefs.sound ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'}</svg>`;
  $('soundBtn').setAttribute('aria-pressed', String(prefs.sound));
}

/* ---------- the contraptions, drawn (nose to the right, about 90 × 60 around the middle) ---------- */
function outline(c, fill, lw = 3) { if (fill) { c.fillStyle = fill; c.fill(); } c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
function pilot(c, x, y, r = 7, helmet = '#E8322E') {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); outline(c, '#F2C39A', 2.4);
  c.beginPath(); c.arc(x, y - 1, r, Math.PI, 0); c.closePath(); outline(c, helmet, 2.4);
  c.beginPath(); c.arc(x + r * 0.45, y + 1, r * 0.32, 0, Math.PI * 2); outline(c, '#BDF3FF', 1.8);
  c.beginPath(); c.moveTo(x - r, y + 1); c.lineTo(x + r * 0.1, y + 1); c.lineWidth = 1.8; c.stroke();
}
function prop(c, x, y, t, len = 12) {
  c.save(); c.translate(x, y);
  c.beginPath(); c.ellipse(0, 0, 3, len * (0.25 + 0.75 * Math.abs(Math.sin(t * 40))), 0, 0, Math.PI * 2); outline(c, 'rgba(255,248,236,0.85)', 2);
  c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); outline(c, '#FFD23F', 2);
  c.restore();
}
const DRAW = {
  goat(c, t) {
    // a striped hang-glider wing, a goat hanging from the bar in goggles
    c.save();
    c.beginPath(); c.moveTo(-46, -20); c.quadraticCurveTo(-4, -46, 46, -26); c.lineTo(40, -19); c.quadraticCurveTo(-2, -34, -46, -20); c.closePath();
    c.fillStyle = '#FFD23F'; c.fill();
    c.save(); c.clip(); c.fillStyle = '#FF3D8B'; for (let x = -40; x < 50; x += 22) c.fillRect(x, -50, 9, 40); c.restore();
    outline(c, null);
    c.beginPath(); c.moveTo(0, -31); c.lineTo(-10, 6); c.moveTo(0, -31); c.lineTo(12, 6); c.moveTo(-14, 6); c.lineTo(16, 6); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.ellipse(0, 15, 18, 7.5, -0.05, 0, Math.PI * 2); outline(c, '#FFF8EC', 2.6);
    for (const lx of [-12, -5, 6, 12]) { c.beginPath(); c.moveTo(lx, 20); c.lineTo(lx - 4, 26 + Math.sin(t * 9 + lx) * 1.5); c.lineWidth = 2.4; c.stroke(); }
    c.beginPath(); c.ellipse(21, 10, 8, 6.5, 0.2, 0, Math.PI * 2); outline(c, '#FFF8EC', 2.6);
    c.beginPath(); c.moveTo(17, 5); c.quadraticCurveTo(12, -4, 6, -2); c.moveTo(21, 4); c.quadraticCurveTo(19, -5, 13, -5); c.lineWidth = 2.6; c.strokeStyle = '#8A7FA0'; c.stroke();
    c.beginPath(); c.arc(24, 9, 2.6, 0, Math.PI * 2); outline(c, '#BDF3FF', 1.6);
    c.beginPath(); c.moveTo(26, 15); c.lineTo(24, 20); c.lineTo(22, 15); outline(c, '#FFF8EC', 1.6);
    c.beginPath(); c.moveTo(-18, 13); c.lineTo(-24, 10); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
    c.restore();
  },
  tub(c, t) {
    // a clawfoot tub with cardboard wings, the duck riding up front
    c.beginPath(); c.moveTo(-18, 0); c.lineTo(14, 0); c.lineTo(4, -30); c.lineTo(-30, -28); c.closePath(); outline(c, '#C98A4B');
    c.beginPath(); c.moveTo(-24, -20); c.lineTo(4, -20); c.lineWidth = 3; c.strokeStyle = '#E8D9B0'; c.stroke();
    c.beginPath(); c.moveTo(-36, -6); c.lineTo(36, -6); c.quadraticCurveTo(36, 16, 18, 16); c.lineTo(-20, 16); c.quadraticCurveTo(-36, 16, -36, -6); c.closePath(); outline(c, '#F3F0FF');
    c.beginPath(); c.moveTo(-38, -6); c.lineTo(38, -6); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
    for (const fx of [-22, 20]) { c.beginPath(); c.arc(fx, 18, 4, 0, Math.PI * 2); outline(c, '#FFD23F', 2.2); }
    pilot(c, -8, -14);
    c.beginPath(); c.ellipse(26, -10, 7, 5, 0, 0, Math.PI * 2); outline(c, '#FFD23F', 2.2);
    c.beginPath(); c.arc(31, -17, 4.5, 0, Math.PI * 2); outline(c, '#FFD23F', 2.2);
    c.beginPath(); c.moveTo(35, -17); c.lineTo(40, -16); c.lineTo(35, -14); outline(c, '#FF8A3D', 1.8);
    c.beginPath(); c.arc(32, -18, 1, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
  },
  couch(c, t) {
    // a red couch with plywood wings on legs and a tiny propeller
    c.beginPath(); c.rect(-30, -36, 62, 6); outline(c, '#C98A4B');
    c.beginPath(); c.moveTo(-20, -30); c.lineTo(-18, -12); c.moveTo(16, -30); c.lineTo(14, -6); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.rect(-38, -24, 13, 32); outline(c, '#C42828');
    c.beginPath(); c.rect(-30, -4, 64, 14); outline(c, '#E8322E');
    c.beginPath(); c.rect(26, -12, 11, 14); outline(c, '#C42828');
    c.beginPath(); c.moveTo(-8, -4); c.lineTo(-8, 10); c.moveTo(12, -4); c.lineTo(12, 10); c.lineWidth = 2; c.strokeStyle = 'rgba(18,14,24,0.55)'; c.stroke();
    for (const lx of [-26, 28]) { c.beginPath(); c.rect(lx, 10, 4, 6); outline(c, '#7A4A24', 2); }
    pilot(c, -4, -12, 7, '#29D3F0');
    prop(c, 40, -4, t);
  },
  taco(c, t) {
    // a giant taco shell, lettuce and tomato along the top, the pilot peeking out
    pilot(c, 0, -22, 7, '#5BE38A');
    c.beginPath(); c.arc(0, 10, 34, Math.PI, 0); c.closePath(); outline(c, '#FFB627');
    c.beginPath(); for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI, rr = 30 + (i % 2 ? 4 : 0); c.lineTo(Math.cos(a) * rr, 10 + Math.sin(a) * rr); }
    c.lineWidth = 4; c.strokeStyle = '#5BE38A'; c.stroke();
    for (const a of [3.5, 4.3, 5.2, 5.9]) { c.beginPath(); c.arc(Math.cos(a) * 27, 10 + Math.sin(a) * 27, 3.4, 0, Math.PI * 2); outline(c, '#E8322E', 1.6); }
    for (const [dx, dy] of [[-16, 2], [6, -6], [18, 4], [-4, 6]]) { c.beginPath(); c.arc(dx, dy, 1.6, 0, Math.PI * 2); c.fillStyle = 'rgba(120,70,10,0.5)'; c.fill(); }
    prop(c, 36, 6, t);
  },
  pizza(c, t) {
    // a biplane made of two pizza boxes, pepperoni on the wings
    c.beginPath(); c.rect(-36, -30, 68, 7); outline(c, '#F4E3C1');
    c.beginPath(); c.rect(-32, -2, 62, 7); outline(c, '#F4E3C1');
    for (const x of [-22, 18]) { c.beginPath(); c.moveTo(x, -23); c.lineTo(x, -2); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke(); }
    for (const [x, y] of [[-26, -26.5], [-8, -26.5], [10, -26.5], [-20, 1.5], [4, 1.5]]) { c.beginPath(); c.arc(x, y, 2.4, 0, Math.PI * 2); outline(c, '#E8322E', 1.4); }
    c.beginPath(); c.moveTo(-30, -14); c.lineTo(26, -16); c.lineTo(34, -8); c.lineTo(-26, -6); c.closePath(); outline(c, '#C98A4B');
    c.beginPath(); c.moveTo(-30, -14); c.lineTo(-40, -22); c.lineTo(-36, -8); outline(c, '#C98A4B', 2.4);
    pilot(c, 2, -20, 6.5, '#FFD23F');
    prop(c, 37, -12, t);
  },
  cart(c, t, s) {
    // a shopping cart with cardboard wings and two leaf blowers strapped on the back
    if (s && s.boostT > 0) {
      for (let i = 0; i < 6; i++) { const d = 14 + i * 9 + Math.sin(t * 50 + i) * 3; c.beginPath(); c.arc(-44 - d, -6 + Math.sin(t * 30 + i * 2) * 4, 6 + i * 1.5, 0, Math.PI * 2); c.fillStyle = `rgba(255,${180 - i * 18},60,${0.7 - i * 0.1})`; c.fill(); }
    }
    c.beginPath(); c.moveTo(-14, -18); c.lineTo(18, -20); c.lineTo(6, -40); c.lineTo(-26, -38); c.closePath(); outline(c, '#C98A4B');
    c.beginPath(); c.moveTo(-30, -18); c.lineTo(26, -18); c.lineTo(18, 6); c.lineTo(-24, 6); c.closePath(); outline(c, 'rgba(201,217,232,0.55)');
    c.lineWidth = 1.6; c.strokeStyle = INK;
    for (let x = -22; x <= 20; x += 7) { c.beginPath(); c.moveTo(x, -18); c.lineTo(x - (x > 0 ? 1 : -1) * 2, 6); c.stroke(); }
    for (let y = -12; y <= 2; y += 6) { c.beginPath(); c.moveTo(-28 + (y + 18) * 0.15, y); c.lineTo(24 - (y + 18) * 0.25, y); c.stroke(); }
    c.beginPath(); c.moveTo(-30, -18); c.lineTo(-38, -28); c.lineTo(-30, -30); c.lineWidth = 3; c.stroke();
    for (const wx of [-18, 14]) { c.beginPath(); c.arc(wx, 11, 4.5, 0, Math.PI * 2); outline(c, '#2A2140', 2.2); }
    for (const by of [-12, -2]) { c.beginPath(); c.rect(-46, by - 3.5, 18, 7); outline(c, '#FF8A3D', 2.2); }
    pilot(c, -2, -26, 7, '#FF3D8B');
  },
};
export function drawCraft(c, id, x, y, scale, theta, t, s) {
  c.save(); c.translate(x, y); c.rotate(-theta); c.scale(scale, scale);
  c.lineJoin = 'round'; c.lineCap = 'round';
  (DRAW[id] || DRAW.goat)(c, t, s);
  c.restore();
}

/* ---------- home ---------- */
function renderHome() {
  const b = bests();
  $('crafts').innerHTML = CRAFTS.map((c) => `<button type="button" class="craft" role="radio" data-c="${c.id}" aria-checked="${c.id === prefs.craft}" aria-pressed="${c.id === prefs.craft}">
      <canvas width="300" height="144" aria-hidden="true"></canvas>${b[c.id] ? `<span class="best">${b[c.id]} FT</span>` : ''}
      <b>${esc(c.name.toUpperCase())}</b><small>${esc(c.blurb)}</small>
      <span class="stats"><span>LIFT</span><i style="--v:${Math.round((c.lift / 1.5) * 100)}%;--c:#5BE38A"></i><span>SLICK</span><i style="--v:${Math.round((0.6 / c.drag) * 100)}%;--c:#29D3F0"></i><span>STALL-PROOF</span><i style="--v:${Math.round((c.stall / 20) * 100)}%;--c:#FFD23F"></i>${c.boost ? `<span>BLASTS</span><span style="color:#FF8A3D">× ${c.boost}</span>` : ''}</span></button>`).join('');
  for (const el of $('crafts').querySelectorAll('.craft')) {
    const cv = el.querySelector('canvas'), cx = cv.getContext('2d');
    cx.clearRect(0, 0, cv.width, cv.height);
    drawCraft(cx, el.dataset.c, 150, 80, 1.7, 0.08, 0.3);
    el.onclick = () => { prefs.craft = el.dataset.c; savePrefs(); for (const o of $('crafts').querySelectorAll('.craft')) { const on = o.dataset.c === prefs.craft; o.setAttribute('aria-pressed', String(on)); o.setAttribute('aria-checked', String(on)); } };
  }
}

/* ---------- the phone's tilt (or a finger, on a computer or when motion is off) ---------- */
const tilt = { ok: false, v: null };
function onTilt(e) {
  if (e.beta == null) return;
  const ang = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
  // upright: the front-back tilt; turned sideways: the side tilt, signed by which way it's turned
  tilt.v = ang === 90 ? -e.gamma : (ang === 270 || ang === -90) ? e.gamma : e.beta;
  tilt.ok = true;
}
let motionAsked = false;
async function askMotion() {
  if (motionAsked) return tilt.ok;
  motionAsked = true;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const r = await DeviceOrientationEvent.requestPermission();
      if (r !== 'granted') { $('motionNote').textContent = 'Motion is off, so drag up and down on the screen to fly. (Turn on Motion & Orientation for this site in Settings to tilt.)'; return false; }
    }
    window.addEventListener('deviceorientation', onTilt);
    return true;
  } catch { return false; }
}

/* ---------- a run ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let G = null, raf = 0;
function startRun(id = prefs.craft) {
  const craft = craftOf(id);
  G = { phase: 'count', craft, taps: 0, t0: performance.now(), pushAt: 0, flight: null, input: 0, touch: null, neutral: null, tiltHist: [], blast: false,
    splashAt: 0, drops: [], maxSpeed: 0, seed: (Math.random() * 2 ** 31) >>> 0, lastWarn: '', lastT: performance.now(), crowd: Array.from({ length: 14 }, (_, i) => ({ x: -DECK + 4 + i * 4.2, c: ['#FF3D8B', '#29D3F0', '#FFD23F', '#5BE38A', '#B79CFF', '#FF8A3D'][i % 6], p: Math.random() * 6 })) };
  show('game');
  $('pushBtn').hidden = true; $('pushbar').hidden = true; $('blastBtn').hidden = true; $('warn').hidden = true;
  say(`${craft.emoji} ${craft.name} on the pier. Get ready to push!`);
  ['3', '2', '1'].forEach((n, i) => setTimeout(() => { if (G && G.phase === 'count') { $('count3').textContent = n; sfx.beep(); } }, i * 700));
  setTimeout(() => { if (!G || G.phase !== 'count') return; $('count3').textContent = ''; beginPush(); }, 2100);
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}
function beginPush() {
  G.phase = 'push'; G.pushAt = performance.now(); G.taps = 0;
  $('pushBtn').hidden = false; $('pushbar').hidden = false; $('pushSub').textContent = 'TAP AS FAST AS YOU CAN';
  say('');
}
function launch() {
  const speed = launchSpeed(G.taps);
  G.flight = createFlight(G.craft.id, { speed, seed: G.seed });
  // level is however the phone was held during the run-up
  const h = G.tiltHist.slice(-12);
  G.neutral = tilt.ok && h.length ? h.reduce((a, b) => a + b, 0) / h.length : null;
  G.phase = 'fly';
  $('pushBtn').hidden = true; $('pushbar').hidden = true;
  $('blastBtn').hidden = !G.craft.boost; $('blastLeft').textContent = `${G.craft.boost} left`;
  sfx.launch();
  say(tilt.ok ? 'SEND IT! Tilt to fly: pull back to climb, push to dive.' : 'SEND IT! Drag up to climb, down to dive.');
  setTimeout(() => { if (G && G.phase === 'fly') $('say').hidden = true; }, 2600);
}
function say(text) { const el = $('say'); el.hidden = !text; el.textContent = text || ''; }
// -1 (nose down) to 1 (nose up): a finger beats the tilt while it's down
function controlInput() {
  if (G.touch) return G.touch.input;
  if (tilt.ok && G.neutral != null) return Math.max(-1, Math.min(1, (tilt.v - G.neutral) / 22));
  return G.input * 0.92;   // no tilt and no finger: settle back toward level
}
function frame(now) {
  if (!G) return;
  const dt = Math.min(0.05, (now - G.lastT) / 1000); G.lastT = now;
  if (tilt.ok && tilt.v != null) { G.tiltHist.push(tilt.v); if (G.tiltHist.length > 30) G.tiltHist.shift(); }
  if (G.phase === 'push') {
    const p = Math.min(1, (now - G.pushAt) / PUSH_MS);
    $('pushFill').style.width = Math.round(p * 100) + '%';
    $('pushSub').textContent = `${Math.round(launchSpeed(G.taps) * 0.68)} MPH`;
    if (p >= 1) launch();
  }
  if (G.phase === 'fly') {
    G.input = controlInput();
    // small fixed steps keep the flight the same on every phone
    let left = dt;
    while (left > 1e-6) { const h = Math.min(1 / 120, left); G.flight.step(h, G.input, G.blast); G.blast = false; left -= h; }
    const s = G.flight.state;
    G.maxSpeed = Math.max(G.maxSpeed, s.airspeed);
    hud(s);
    if (s.splashed) splash();
  }
  draw(now);
  if (G.phase === 'splash' && now - G.splashAt > 1500) return results();
  raf = requestAnimationFrame(frame);
}
function hud(s) {
  $('hudDist').textContent = Math.round(s.distance);
  $('hudAlt').textContent = `${Math.max(0, Math.round(s.y))} ft up`;
  $('hudSpd').textContent = `${Math.round(s.airspeed * 0.68)} mph`;
  const c = G.craft, near = s.alpha > (c.stall * Math.PI / 180) * 0.78;
  const w = s.stalled ? ['STALL! NOSE DOWN!', 'blink'] : near ? ['EASY ON THE NOSE', 'near'] : s.wind < -7 ? ['HEADWIND!', 'near'] : s.wind > 7 ? ['TAILWIND! RIDE IT', 'tail'] : null;
  const el = $('warn');
  if (!w) { el.hidden = true; G.lastWarn = ''; return; }
  if (G.lastWarn !== w[0]) {
    el.textContent = w[0]; el.className = 'warn' + (w[1] === 'blink' ? ' blink' : w[1] === 'near' ? ' near' : '');
    el.style.background = w[1] === 'tail' ? '#5BE38A' : ''; el.style.color = w[1] === 'tail' ? INK : '';
    if (w[1] === 'blink') sfx.stall();
    G.lastWarn = w[0];
  }
  el.hidden = false;
}
function splash() {
  G.phase = 'splash'; G.splashAt = performance.now();
  $('warn').hidden = true; $('blastBtn').hidden = true;
  const s = G.flight.state;
  for (let i = 0; i < 46; i++) G.drops.push({ x: s.x + (Math.random() - 0.5) * 6, y: 0, vx: (Math.random() - 0.5) * 34, vy: 18 + Math.random() * 38, r: 0.4 + Math.random() * 1.1 });
  sfx.splash();
  say(`SPLASH! ${Math.round(s.distance)} feet out.`);
}

/* ---------- drawing the world ---------- */
function view() {
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const top = $('game').querySelector('.hud').getBoundingClientRect().bottom - cv.getBoundingClientRect().top + 8;
  const waterY = H * 0.8, ppf = Math.max(2.2, Math.min((waterY - top) / 78, W / 95));
  return { W, H, waterY, ppf, top };
}
function draw(now) {
  const v = view(), { W, H, waterY, ppf, top } = v, t = now / 1000;
  const s = G.flight ? G.flight.state : null;
  // where the craft is (on the deck during the run-up)
  const pushP = G.phase === 'push' ? Math.min(1, (now - G.pushAt) / PUSH_MS) : G.phase === 'count' ? 0 : 1;
  const cx = s ? s.x : -DECK + 6 + (DECK - 6) * Math.pow(pushP, 1.6), cy = s ? s.y : PIER + 1.2;
  const camX = Math.max(-DECK - 4, cx - (W * 0.34) / ppf), camY = Math.max(0, cy - 66);
  const X = (x) => (x - camX) * ppf, Y = (y) => waterY - (y - camY) * ppf;
  // sky, sun, clouds, the far shore
  const sky = ctx.createLinearGradient(0, 0, 0, waterY); sky.addColorStop(0, '#5DB8F2'); sky.addColorStop(1, '#CDEBFF');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let yy = 6; yy < waterY; yy += 12) for (let xx = (yy / 12) % 2 ? 6 : 0; xx < W; xx += 12) { ctx.beginPath(); ctx.arc(xx, yy, 1.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.arc(W * 0.66 - camX * ppf * 0.02, top + 46, 30, 0, Math.PI * 2); ctx.fillStyle = '#FFE27A'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  for (let k = -2; k < 14; k++) {
    const wx = k * 140 + ((k * 37) % 50), sx = (wx - camX * 0.4) * ppf * 0.5;   // clouds drift by slower than the water
    const py = top + 30 + ((k * 13) % 5) * (waterY - top) * 0.07;
    if (sx < -120 || sx > W + 120) continue;
    ctx.save(); ctx.translate(sx, py);
    ctx.beginPath(); for (const [dx, dy, r] of [[0, 0, 18], [20, -8, 22], [42, 0, 17], [22, 6, 18]]) { ctx.moveTo(dx + r, dy); ctx.arc(dx, dy, r, 0, Math.PI * 2); }
    ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(18,14,24,0.5)'; ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#7FB59A'; ctx.beginPath(); ctx.moveTo(0, waterY);
  for (let xx = 0; xx <= W + 20; xx += 20) { const wx = xx / ppf + camX * 0.15; ctx.lineTo(xx, waterY - 16 - 10 * Math.sin(wx * 0.05) - 6 * Math.sin(wx * 0.13)); }
  ctx.lineTo(W, waterY); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(18,14,24,0.4)'; ctx.stroke();
  // the wind bands: red pushes back, green carries
  const wind = G.flight ? G.flight.wind : null;
  if (wind) for (const b of wind.bands) {
    const x0 = X(b.x0), x1 = X(b.x1); if (x1 < 0 || x0 > W) continue;
    const y0 = Y(b.y1), y1 = Y(b.y0), head = b.w < 0;
    ctx.fillStyle = head ? 'rgba(255,75,75,0.16)' : 'rgba(91,227,138,0.18)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeStyle = head ? 'rgba(196,32,32,0.55)' : 'rgba(30,140,70,0.55)'; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]);
    const sp = Math.abs(b.w) * ppf * 1.6, rows = Math.max(1, Math.round((y1 - y0) / 26));
    ctx.strokeStyle = head ? 'rgba(196,32,32,0.75)' : 'rgba(30,140,70,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let r = 0; r < rows; r++) {
      const yy = y0 + (r + 0.5) * ((y1 - y0) / rows);
      for (let k = 0; k < (x1 - x0) / 70 + 1; k++) {
        let ax = x0 + ((k * 70 + (head ? -1 : 1) * t * sp + r * 31) % (x1 - x0 + 70) + (x1 - x0 + 70)) % (x1 - x0 + 70) - 35;
        if (ax < x0 + 6 || ax > x1 - 30) continue;
        const d = head ? -1 : 1;
        ctx.beginPath(); ctx.moveTo(ax, yy); ctx.lineTo(ax + 24, yy); ctx.moveTo(ax + (d > 0 ? 24 : 0), yy); ctx.lineTo(ax + (d > 0 ? 17 : 7), yy - 6); ctx.moveTo(ax + (d > 0 ? 24 : 0), yy); ctx.lineTo(ax + (d > 0 ? 17 : 7), yy + 6); ctx.stroke();
      }
    }
  }
  // the water
  const sea = ctx.createLinearGradient(0, waterY, 0, H); sea.addColorStop(0, '#2E9BE0'); sea.addColorStop(1, '#14569A');
  ctx.fillStyle = sea; ctx.fillRect(0, waterY, W, H - waterY);
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  for (let r = 0; r < 4; r++) {
    const yy = waterY + 8 + r * ((H - waterY) / 4); ctx.beginPath();
    for (let xx = -10; xx <= W + 10; xx += 8) { const wx = xx / ppf + camX; ctx.lineTo(xx, yy + Math.sin(wx * 0.4 + t * 2 + r) * 2.5); }
    ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, waterY); ctx.lineTo(W, waterY); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  // buoys every 50 feet, and the best flag
  const best = bests()[G.craft.id];
  for (let d = 50; d <= 1500; d += 50) {
    const bx = X(d); if (bx < -30 || bx > W + 30) continue;
    buoy(bx, waterY, `${d}`, d % 100 === 0 ? '#E8322E' : '#FFF8EC', t);
  }
  if (best) { const bx = X(best); if (bx > -30 && bx < W + 30) buoy(bx, waterY, 'BEST', '#FFD23F', t, true); }
  // the pier: deck, pilings, railing, the crowd, the banner at the edge
  pier(X, Y, ppf, t);
  // the crew running it down the deck
  if (G.phase === 'push' || G.phase === 'count') crew(X(cx - 7), Y(PIER), ppf, t, G.phase === 'push');
  // the contraption
  const sc = (ppf * 16) / 90;
  if (G.phase !== 'splash' || now - G.splashAt < 120) drawCraft(ctx, G.craft.id, X(cx), Y(cy) - 4 * sc, sc, s ? s.theta : 0, t, s);
  // the splash
  if (G.phase === 'splash') {
    const dt = (now - G.splashAt) / 1000;
    for (const d of G.drops) { const x = d.x + d.vx * dt * 0.6, y = d.vy * dt - 16 * dt * dt; if (y < 0) continue; ctx.beginPath(); ctx.arc(X(x), Y(y), d.r * ppf, 0, Math.PI * 2); ctx.fillStyle = '#E6F6FF'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(X(s.x), waterY, (6 + dt * 14) * ppf * 0.5, 4 + dt * 6, 0, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
  }
  // the nose meter: how close the wing is to stalling
  if (s && G.phase === 'fly') noseMeter(v, s);
}
function buoy(x, waterY, label, color, t, flag = false) {
  const bob = Math.sin(t * 2.2 + x * 0.02) * 2;
  ctx.save(); ctx.translate(x, waterY + bob);
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(6, -16); ctx.lineTo(-6, -16); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(flag ? 34 : 26, -31); ctx.lineTo(0, -25); ctx.closePath(); ctx.fillStyle = flag ? '#FFD23F' : '#FFF8EC'; ctx.fill(); ctx.stroke();
  ctx.font = '12px Bangers, Impact, sans-serif'; ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, 3, -30.5);
  ctx.restore();
}
function pier(X, Y, ppf, t) {
  const x0 = X(-DECK - 60), x1 = X(0), top = Y(PIER), th = Math.max(8, 1.6 * ppf), water = Y(0);
  if (x1 < -10) return;
  ctx.fillStyle = '#5E3B1E';
  for (let px = -DECK - 56; px <= -1; px += 9) { const xx = X(px); ctx.fillRect(xx - 3, top + th, 6, water - top - th); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(xx - 3, top + th, 6, water - top - th); }
  ctx.fillStyle = '#9B6A3C'; ctx.fillRect(x0, top, x1 - x0, th); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeRect(x0, top, x1 - x0, th);
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(18,14,24,0.45)'; for (let px = -DECK - 56; px < 0; px += 4) { ctx.beginPath(); ctx.moveTo(X(px), top); ctx.lineTo(X(px), top + th); ctx.stroke(); }
  // the crowd behind the rail, bouncing
  for (const p of G.crowd) {
    const hx = X(p.x), jump = (G.phase === 'fly' || G.phase === 'splash' ? Math.abs(Math.sin(t * 6 + p.p)) * 8 : Math.abs(Math.sin(t * 3 + p.p)) * 3);
    ctx.beginPath(); ctx.arc(hx, top - 18 - jump, 7, 0, Math.PI * 2); ctx.fillStyle = '#F2C39A'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.rect(hx - 7, top - 11 - jump, 14, 11 + jump); ctx.fillStyle = p.c; ctx.fill(); ctx.stroke();
    if (G.phase === 'fly') { ctx.beginPath(); ctx.moveTo(hx - 6, top - 9 - jump); ctx.lineTo(hx - 12, top - 24 - jump); ctx.moveTo(hx + 6, top - 9 - jump); ctx.lineTo(hx + 12, top - 24 - jump); ctx.stroke(); }
  }
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(x0, top - 10); ctx.lineTo(X(-6), top - 10); ctx.stroke();
  // the launch edge: hazard stripes and the banner
  const ex = X(0);
  for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#FFD23F' : INK; ctx.fillRect(ex - 4 * (k + 1) * (ppf / 4), top, 4 * (ppf / 4), th); }
  ctx.beginPath(); ctx.moveTo(ex - 2, top); ctx.lineTo(ex - 2, top - 46); ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.translate(ex - 2, top - 46); ctx.rotate(Math.sin(t * 3) * 0.04);
  ctx.beginPath(); ctx.rect(-70, 0, 68, 22); ctx.fillStyle = '#FF3D8B'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
  ctx.font = '18px Bangers, Impact, sans-serif'; ctx.fillStyle = '#FFF8EC'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SEND IT!', -36, 12);
  ctx.restore();
}
function crew(x, deckY, ppf, t, running) {
  for (const k of [0, 1]) {
    const bx = x - k * 22, step = running ? Math.sin(t * 22 + k * 2) : 0;
    ctx.save(); ctx.translate(bx, deckY);
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-6 + step * 7, 0); ctx.moveTo(0, -18); ctx.lineTo(6 - step * 7, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(6, -34); ctx.moveTo(4, -30); ctx.lineTo(18, -26); ctx.stroke();
    ctx.beginPath(); ctx.arc(9, -40, 6, 0, Math.PI * 2); ctx.fillStyle = k ? '#29D3F0' : '#FFD23F'; ctx.fill(); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
  }
}
function noseMeter(v, s) {
  const c = G.craft, as = (c.stall * Math.PI) / 180, x = 14, h = Math.min(170, v.H * 0.26), y = v.waterY - h - 18, w = 18;
  const frac = Math.max(-0.3, Math.min(1.3, s.alpha / as));
  ctx.save();
  ctx.fillStyle = 'rgba(18,14,24,0.7)'; ctx.fillRect(x - 4, y - 22, w + 8, h + 30);
  const zone = (a, b, col) => { const ya = y + h - ((a + 0.3) / 1.6) * h, yb = y + h - ((b + 0.3) / 1.6) * h; ctx.fillStyle = col; ctx.fillRect(x, yb, w, ya - yb); };
  zone(-0.3, 0.75, '#5BE38A'); zone(0.75, 1, '#FFD23F'); zone(1, 1.3, '#FF4B4B');
  ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.strokeRect(x, y, w, h);
  const my = y + h - ((frac + 0.3) / 1.6) * h;
  ctx.beginPath(); ctx.moveTo(x - 6, my); ctx.lineTo(x + w + 6, my); ctx.lineWidth = 5; ctx.strokeStyle = '#FFF8EC'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.font = '12px Bangers, Impact, sans-serif'; ctx.fillStyle = '#FFF8EC'; ctx.textAlign = 'center'; ctx.fillText('NOSE', x + w / 2, y - 9);
  ctx.restore();
}

/* ---------- results ---------- */
async function results() {
  cancelAnimationFrame(raf);
  const s = G.flight.state, c = G.craft, ft = Math.round(s.distance), title = titleFor(ft);
  G.phase = 'done';
  const b = bests(), prev = b[c.id], newBest = ft >= 20 && (prev == null || ft > prev);
  if (newBest) { b[c.id] = ft; store.set(bestKey(), b); }
  if (ft >= 180) sfx.cheer();
  $('resCard').innerHTML = `<p class="kick">${c.emoji} ${esc(c.name)}</p>
    <p class="big">${ft}<small>FT</small></p>
    <span class="title">${esc(title)}</span>
    ${newBest && prev != null ? `<span class="pb">NEW BEST · WAS ${prev} FT</span>` : newBest ? '<span class="pb">FIRST FLIGHT IN THE BOOKS</span>' : prev != null ? `<span class="pb" style="background:#2C2340">BEST ${prev} FT</span>` : ''}
    <p class="res-stats"><span>⬆️ ${Math.round(s.maxY)} ft high</span><span>⏱️ ${s.t.toFixed(1)} s up</span><span>💨 ${Math.round(G.maxSpeed * 0.68)} mph top</span><span>${s.stalls ? `🥴 ${s.stalls} stall${s.stalls === 1 ? '' : 's'}` : '😎 no stalls'}</span>${s.tailT > 0.5 ? `<span>🟢 ${s.tailT.toFixed(1)} s tailwind</span>` : ''}${s.headT > 0.5 ? `<span>🔴 ${s.headT.toFixed(1)} s headwind</span>` : ''}</p>
    <p class="paid" id="paidLine"></p>`;
  show('results');
  if (window.CapraShare) {
    const text = CapraShare.text({ emoji: '🛫', game: 'Send It!', sub: c.name, lines: [`${ft} ft · ${title}${newBest && prev != null ? ' · new best' : ''}`], grid: [shareRow(ft)] });
    $('resShare').innerHTML = '<lab-text-share></lab-text-share>';
    $('resShare').firstChild.set({ emoji: '🛫', title: 'Send It!', text, url: `${location.origin}/send-it/` });
  }
  const line = $('paidLine');
  if (!me()) { line.innerHTML = '<a href="/#profile" style="color:inherit">Make your Capra Lab profile</a> to get paid for every flight.'; return; }
  if (!window.CapraWallet || ft < 10) return;
  const paid = { amber: 0, shards: 0 }, add = (r) => { if (r && r.paid) for (const k of Object.keys(r.paid)) paid[k] = (paid[k] || 0) + r.paid[k]; };
  add(await CapraWallet.earn('send-it', 'flight', `flight-${G.seed}`));
  if (newBest && prev != null && ft >= 60) add(await CapraWallet.earn('send-it', 'best', `best-${c.id}-${ft}`));
  const bits = [];
  if (paid.amber) bits.push(`+${paid.amber} amber`);
  if (paid.shards) bits.push(`+${paid.shards} shard${paid.shards === 1 ? '' : 's'}`);
  line.textContent = bits.length ? `Paid into your wallet: ${bits.join(', ')}` : '';
}

/* ---------- buttons and fingers ---------- */
$('goBtn').onclick = async () => { audio(); await askMotion(); startRun(prefs.craft); };
$('pushBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); if (!G || G.phase !== 'push') return; G.taps++; sfx.push(); });
$('blastBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); if (!G || G.phase !== 'fly' || !G.flight.state.boosts) return; G.blast = true; sfx.blast(); setTimeout(() => { if (G && G.flight) $('blastLeft').textContent = `${G.flight.state.boosts} left`; }, 30); });
const game = $('game');
game.addEventListener('pointerdown', (e) => {
  if (!G || e.target.closest('button')) return;
  G.touch = { id: e.pointerId, y0: e.clientY, from: G.input, input: G.input };
  try { game.setPointerCapture(e.pointerId); } catch { /* fine */ }
});
game.addEventListener('pointermove', (e) => { if (G && G.touch && e.pointerId === G.touch.id) G.touch.input = Math.max(-1, Math.min(1, G.touch.from + (G.touch.y0 - e.clientY) / 110)); });
const lift = (e) => { if (G && G.touch && e.pointerId === G.touch.id) G.touch = null; };
game.addEventListener('pointerup', lift); game.addEventListener('pointercancel', lift);
$('quitBtn').onclick = () => { G = null; cancelAnimationFrame(raf); renderHome(); show('home'); };
$('againBtn').onclick = () => startRun(G ? G.craft.id : prefs.craft);
$('pickBtn').onclick = () => { G = null; renderHome(); show('home'); };
$('soundBtn').onclick = () => { prefs.sound = !prefs.sound; savePrefs(); paintSound(); };
const openHelp = () => { $('help').hidden = false; $('helpClose').focus(); };
$('helpBtn').onclick = openHelp; $('resHelp').onclick = openHelp;
$('helpClose').onclick = () => { $('help').hidden = true; };
$('help').addEventListener('click', (e) => { if (e.target === $('help')) $('help').hidden = true; });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('help').hidden) { $('help').hidden = true; return; }
  if (!G) return;
  if (G.phase === 'push' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); G.taps++; sfx.push(); }
  if (G.phase === 'fly' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { G.touch = { id: 'key', y0: 0, from: 0, input: e.key === 'ArrowUp' ? 0.8 : -0.8 }; }
  if (G.phase === 'fly' && e.key === 'b') G.blast = true;
});
document.addEventListener('keyup', (e) => { if (G && G.touch && G.touch.id === 'key' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) G.touch = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden && G && G.phase === 'fly') G.touch = null; });

// tests drive the page without a real phone
window.__sendit = { state: () => G, start: startRun, tilt: (v) => { tilt.ok = true; tilt.v = v; }, push: (n) => { if (G) G.taps += n; } };

paintSound();
renderHome();
