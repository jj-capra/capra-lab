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
  $('pushBtn').hidden = true; $('pushbar').hidden = true; $('blastBtn').hidden = true; $('warn').hidden = true; $('radarBox').hidden = true;
  CAM.phi = 0;
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
  $('blastBtn').hidden = !G.craft.boost; $('blastLeft').textContent = `${G.craft.boost} left`; $('radarBox').hidden = false;
  sfx.launch();
  say(tilt.ok ? 'SEND IT! Pull back to climb, dip to dive.' : 'SEND IT! Drag up to climb, down to dive.');
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

/* ---------- drawing the world: a chase camera right behind the contraption ----------
   JC, Nov 14 2026: "The view should change from right behind the vehicle or vessel so they can more see
   everything and the phone dip down and pull back makes more sense with the flight." The camera rides
   behind and a little above, pitching with the nose (CAM.follow of it), so pulling the phone back tips the
   whole view up into a climb and dipping it tips the water up into a dive. World: x ahead (feet), y up,
   z to the right. The radar strip at the bottom maps the wind ahead from the side. */
const CAM = { back: 48, up: 8, follow: 0.7, phi: 0 };
const SPAN = 16;                                      // feet across a contraption's wings, as drawn from behind
function view() {
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const top = $('game').querySelector('.hud').getBoundingClientRect().bottom - cv.getBoundingClientRect().top + 8;
  return { W, H, top, f: Math.min(H * 0.95, W * 2.1), sx0: W / 2, sy0: H * 0.38 };
}
// The camera for this frame, and project(x, y, z) → { x, y, k } on screen (k: pixels per foot there).
function makeCam(v, wx, wy, theta, dt) {
  CAM.phi += (theta * CAM.follow - CAM.phi) * Math.min(1, dt * 5);
  const ph = CAM.phi, c = Math.cos(ph), s = Math.sin(ph);
  const camX = wx - CAM.back * c - CAM.up * s, camY = Math.max(1.2, wy - CAM.back * s + CAM.up * c);
  const project = (x, y, z = 0) => {
    const dx = x - camX, dy = y - camY, fwd = dx * c + dy * s;
    if (fwd < 1) return null;
    const k = v.f / fwd;
    return { x: v.sx0 + z * k, y: v.sy0 - (dy * c - dx * s) * k, k, fwd };
  };
  return { camX, camY, c, s, project, horizon: v.sy0 + v.f * Math.tan(ph) };
}
function draw(now) {
  const v = view(), { W, H } = v, t = now / 1000;
  const dt = Math.min(0.05, (now - (G.drawT || now)) / 1000); G.drawT = now;
  const s = G.flight ? G.flight.state : null;
  const pushP = G.phase === 'push' ? Math.min(1, (now - G.pushAt) / PUSH_MS) : G.phase === 'count' ? 0 : 1;
  const px = s ? s.x : -DECK + 6 + (DECK - 6) * Math.pow(pushP, 1.6), py = s ? s.y : PIER + 2.2;
  const cam = makeCam(v, px, Math.max(py, 2.5), s && !s.splashed ? s.theta : 0, dt), P = cam.project;
  const hz = cam.horizon;
  // sky and the sun
  const sky = ctx.createLinearGradient(0, Math.min(hz, H) - H, 0, Math.min(hz, H)); sky.addColorStop(0, '#4FAEEB'); sky.addColorStop(1, '#D7F0FF');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let yy = 6; yy < Math.min(H, hz); yy += 12) for (let xx = (yy / 12) % 2 ? 6 : 0; xx < W; xx += 12) { ctx.beginPath(); ctx.arc(xx, yy, 1.4, 0, Math.PI * 2); ctx.fill(); }
  const sun = P(cam.camX + 4000, cam.camY + 1500, 1500);
  if (sun) { ctx.beginPath(); ctx.arc(sun.x, sun.y, 30, 0, Math.PI * 2); ctx.fillStyle = '#FFE27A'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); }
  // clouds far off, drifting closer as you fly
  for (let k = Math.floor(cam.camX / 300) + 2; k < Math.floor(cam.camX / 300) + 10; k++) {
    const h = (k * 2654435761) >>> 0, wx = k * 300 + (h % 140), wz = ((h >>> 8) % 1400) - 700, wy = 260 + ((h >>> 16) % 200);
    const q = P(wx, wy, wz); if (!q || q.fwd < 500 || q.fwd > 2600) continue;
    const r = Math.max(10, Math.min(34, q.k * 45));
    ctx.save(); ctx.translate(q.x, q.y); ctx.beginPath();
    for (const [dx, dy, rr] of [[0, 0, 1], [1.1, -0.45, 1.2], [2.3, 0, 0.95], [1.2, 0.35, 1]]) { ctx.moveTo((dx + rr) * r, dy * r); ctx.arc(dx * r, dy * r, rr * r, 0, Math.PI * 2); }
    ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(18,14,24,0.45)'; ctx.stroke(); ctx.restore();
  }
  // the water from the horizon down, bands rushing toward you, whitecaps
  if (hz < H) {
    const y0 = Math.max(0, hz);
    const sea = ctx.createLinearGradient(0, y0, 0, H); sea.addColorStop(0, '#7CC8F0'); sea.addColorStop(0.25, '#2E9BE0'); sea.addColorStop(1, '#14569A');
    ctx.fillStyle = sea; ctx.fillRect(0, y0, W, H - y0);
    // the far shore sitting on the horizon
    if (hz > -30) {
      ctx.fillStyle = '#7FB59A'; ctx.beginPath(); ctx.moveTo(0, hz);
      for (let xx = 0; xx <= W + 16; xx += 16) ctx.lineTo(xx, hz - 7 - 6 * Math.sin(xx * 0.021 + 1) - 4 * Math.sin(xx * 0.057));
      ctx.lineTo(W, hz); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(18,14,24,0.4)'; ctx.stroke();
    }
    const step = 8, first = Math.floor(cam.camX / step) * step + step;
    let prevY = null;
    for (let wx = first, i = 0; wx < cam.camX + 900; wx += step, i++) {
      const q = P(wx, 0, 0); if (!q) continue;
      if (prevY != null && Math.abs(prevY - q.y) < 1.2) break;
      if (prevY != null && ((wx / step) % 2 === 0)) { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(0, Math.min(q.y, prevY), W, Math.abs(prevY - q.y)); }
      prevY = q.y;
      if (q.fwd < 260) {
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1, q.k * 0.35); ctx.lineCap = 'round';
        for (let z = -150 + ((wx * 7) % 24); z <= 150; z += 24) {
          const a = P(wx, 0, z), b = P(wx, 0, z + 3.5); if (!a || !b || b.x < 0 || a.x > W) continue;
          const lift = Math.sin(wx * 0.3 + z + t * 3) * q.k * 0.25;
          ctx.beginPath(); ctx.moveTo(a.x, a.y + lift); ctx.quadraticCurveTo((a.x + b.x) / 2, a.y - q.k * 0.5 + lift, b.x, b.y + lift); ctx.stroke();
        }
      }
    }
    if (hz > 0) { ctx.beginPath(); ctx.moveTo(0, hz); ctx.lineTo(W, hz); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); }
  }
  // what's ahead, far to near: wind bands, buoys
  const wind = G.flight ? G.flight.wind : null;
  const items = [];
  if (wind) for (const b of wind.bands) if (b.x1 > cam.camX + 2) items.push({ d: Math.max(b.x0, cam.camX + 2), draw: () => windBand(b, cam, t, v) });
  const best = bests()[G.craft.id];
  for (let d = 50; d <= 1500; d += 50) if (d > cam.camX + 3 && d < cam.camX + 420) for (const z of [-17, 17]) items.push({ d, draw: () => buoy(P(d, 0, z), `${d}`, d % 100 === 0 ? '#E8322E' : '#FFF8EC', t, false) });
  if (best && best > cam.camX + 3) items.push({ d: best, draw: () => buoy(P(best, 0, 0), 'BEST', '#FFD23F', t, true) });
  items.sort((a, b) => b.d - a.d).forEach((it) => it.draw());
  // the pier on the run-up (once it's airborne the camera's out over the water)
  if (G.phase === 'count' || G.phase === 'push') pier(cam, t, v);
  // the shadow on the water, then the crew and the contraption
  const me = P(px, py, 0);
  const sh = P(px, 0, 0);
  if (sh && s && !s.splashed && py > 0.5) { ctx.beginPath(); ctx.ellipse(sh.x, sh.y, SPAN * sh.k * 0.42, Math.max(2, SPAN * sh.k * 0.06), 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(8,30,60,0.32)'; ctx.fill(); }
  if (G.phase === 'push' || G.phase === 'count') crew(cam, px, t, G.phase === 'push');
  if (me && (G.phase !== 'splash' || now - G.splashAt < 140)) {
    const sc = (SPAN * me.k) / 180, nose = s ? (s.theta - CAM.phi) * 90 : 0, roll = s ? Math.max(-0.12, Math.min(0.12, -s.wind * 0.006 + Math.sin(t * 1.3) * 0.03)) : 0;
    drawRear(ctx, G.craft.id, me.x, me.y - nose, sc, roll, t, s);
  }
  // the splash
  if (G.phase === 'splash' && me) {
    const st = (now - G.splashAt) / 1000;
    for (const d of G.drops) {
      const x = me.x + d.vx * st * me.k * 0.5, y = me.y - (d.vy * st - 18 * st * st) * me.k * 0.35;
      if (d.vy * st - 18 * st * st < -2) continue;
      ctx.beginPath(); ctx.arc(x, y, Math.max(3, d.r * me.k * 0.9), 0, Math.PI * 2); ctx.fillStyle = '#E6F6FF'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(me.x, me.y + 10, (40 + st * 160), 10 + st * 30, 0, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
  }
  // speed lines at the edges, a tint inside a wind band
  if (s && G.phase === 'fly') {
    const inBand = wind && wind.bands.find((b) => s.x >= b.x0 && s.x <= b.x1 && s.y >= b.y0 && s.y <= b.y1);
    if (inBand) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, inBand.w < 0 ? 'rgba(255,60,60,0.35)' : 'rgba(80,230,130,0.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    const n = Math.min(14, Math.max(0, Math.round((s.airspeed - 16) / 2)));
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.7, r0 = Math.max(W, H) * (0.42 + ((i * 37 + Math.floor(t * 9)) % 10) / 40);
      ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * (r0 + 40), H / 2 + Math.sin(a) * (r0 + 40)); ctx.stroke();
    }
    noseMeter(v, s);
  }
  radar(s, px, py, t);
}
// A wind band ahead: its front face (red headwind, green tailwind) and streaks of air blowing through it,
// toward you for a headwind and away for a tailwind.
function windBand(b, cam, t, v) {
  const P = cam.project, head = b.w < 0, x0 = Math.max(b.x0, cam.camX + 2), Z = 46;
  const col = head ? '255,75,75' : '91,227,138', ink = head ? 'rgba(196,32,32,0.7)' : 'rgba(30,140,70,0.75)';
  const a = P(x0, b.y1, -Z), bq = P(x0, b.y1, Z), c = P(x0, b.y0, Z), d = P(x0, b.y0, -Z);
  const ahead = b.x0 - cam.camX;
  if (a && bq && c && d && ahead > 2 && ahead < 280) {
    ctx.save(); ctx.globalAlpha = Math.max(0.15, Math.min(1, (280 - ahead) / 140));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bq.x, bq.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
    ctx.fillStyle = `rgba(${col},0.16)`; ctx.fill(); ctx.setLineDash([10, 7]); ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.stroke(); ctx.setLineDash([]);
    if (ahead < 200) {
      const fs = Math.max(12, Math.min(30, a.k * 4));
      ctx.font = `${fs}px Bangers, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 4; ctx.strokeStyle = INK; const label = head ? '← HEADWIND' : 'TAILWIND →';
      ctx.strokeText(label, (a.x + bq.x) / 2, a.y - 4); ctx.fillStyle = head ? '#FF6B6B' : '#5BE38A'; ctx.fillText(label, (a.x + bq.x) / 2, a.y - 4);
    }
    ctx.restore();
  }
  if (ahead > 320) return;
  b.parts ||= Array.from({ length: 70 }, (_, i) => ({ u: (i * 0.618) % 1, y: b.y0 + ((i * 0.381) % 1) * (b.y1 - b.y0), z: (((i * 0.731) % 1) - 0.5) * Z * 2 }));
  const len = b.x1 - b.x0, dir = head ? -1 : 1;
  ctx.strokeStyle = head ? 'rgba(255,90,90,0.85)' : 'rgba(110,240,150,0.9)'; ctx.lineCap = 'round';
  for (const p of b.parts) {
    const x = b.x0 + ((((p.u * len + dir * t * Math.abs(b.w) * 2.2) % len) + len) % len);
    if (x < cam.camX + 3) continue;
    const q1 = P(x, p.y, p.z), q2 = P(x + dir * 4, p.y, p.z); if (!q1 || !q2) continue;
    ctx.lineWidth = Math.max(1.5, q1.k * 0.3); ctx.beginPath(); ctx.moveTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); ctx.stroke();
  }
}
function buoy(q, label, color, t, flag) {
  if (!q || q.fwd > 600) return;
  const s = Math.max(0.25, Math.min(3, q.k / 9)), bob = Math.sin(t * 2.2 + q.fwd * 0.05) * 2 * s;
  ctx.save(); ctx.translate(q.x, q.y + bob); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(7, -18); ctx.lineTo(-7, -18); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, flag ? -52 : -40); ctx.stroke();
  const fy = flag ? -52 : -40, fw = flag ? 40 : 30;
  ctx.beginPath(); ctx.rect(1, fy, fw, 13); ctx.fillStyle = flag ? '#FFD23F' : '#FFF8EC'; ctx.fill(); ctx.stroke();
  ctx.font = '12px Bangers, Impact, sans-serif'; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 1 + fw / 2, fy + 7);
  ctx.restore();
}
// The pier from behind the contraption: the deck running to the edge, the crowd along both rails and
// the SEND IT! arch over the end.
function pier(cam, t, v) {
  const P = cam.project, Wd = 9;
  const quad = (pts, fill, lw = 3) => { const q = pts.map(([x, y, z]) => P(x, y, z)); if (q.some((p) => !p)) return false; ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); return true; };
  const near = Math.max(-DECK - 40, cam.camX + 1.5);
  if (near < 0) {
    quad([[near, PIER - 3, -Wd], [0, PIER - 3, -Wd], [0, 0, -Wd], [near, 0, -Wd]], '#5E3B1E', 2);
    quad([[near, PIER - 3, Wd], [0, PIER - 3, Wd], [0, 0, Wd], [near, 0, Wd]], '#5E3B1E', 2);
    quad([[near, PIER, -Wd], [0, PIER, -Wd], [0, PIER, Wd], [near, PIER, Wd]], '#9B6A3C');
    ctx.strokeStyle = 'rgba(18,14,24,0.4)'; ctx.lineWidth = 1.5;
    for (let x = Math.ceil(near / 3) * 3; x < 0; x += 3) { const a = P(x, PIER, -Wd), b = P(x, PIER, Wd); if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
    quad([[-0.01, PIER, -Wd], [-0.01, PIER, Wd], [-0.01, PIER - 1, Wd], [-0.01, PIER - 1, -Wd]], '#FFD23F', 2.5);
    // the crowd along both rails, far to near
    const people = [];
    for (const p of G.crowd) for (const side of [-1, 1]) if (p.x > cam.camX + 2) people.push({ ...p, z: side * (Wd + 1.5) });
    people.sort((a, b) => b.x - a.x);
    for (const p of people) {
      const q = P(p.x, PIER, p.z); if (!q) continue;
      const jump = (G.phase === 'fly' || G.phase === 'splash' ? Math.abs(Math.sin(t * 6 + p.p)) : Math.abs(Math.sin(t * 3 + p.p)) * 0.3) * q.k * 1.2;
      const bw = q.k * 1.7, bh = q.k * 3.2, hr = q.k * 0.95;
      ctx.beginPath(); ctx.rect(q.x - bw / 2, q.y - bh - jump, bw, bh); ctx.fillStyle = p.c; ctx.fill(); ctx.lineWidth = Math.max(1.5, q.k * 0.25); ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(q.x, q.y - bh - hr - jump, hr, 0, Math.PI * 2); ctx.fillStyle = '#F2C39A'; ctx.fill(); ctx.stroke();
      if (G.phase !== 'count') { ctx.beginPath(); ctx.moveTo(q.x - bw * 0.4, q.y - bh * 0.9 - jump); ctx.lineTo(q.x - bw * 0.8, q.y - bh * 1.5 - jump); ctx.moveTo(q.x + bw * 0.4, q.y - bh * 0.9 - jump); ctx.lineTo(q.x + bw * 0.8, q.y - bh * 1.5 - jump); ctx.stroke(); }
    }
    for (const z of [-Wd, Wd]) { const a = P(near, PIER + 3.4, z), b = P(0, PIER + 3.4, z); if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); } }
  }
  // the arch over the end of the pier
  const l0 = P(0, PIER, -Wd - 1), l1 = P(0, PIER + 12, -Wd - 1), r0 = P(0, PIER, Wd + 1), r1 = P(0, PIER + 12, Wd + 1), bl = P(0, PIER + 12, -Wd - 1), br = P(0, PIER + 9, Wd + 1);
  if (l0 && l1 && r0 && r1 && bl && br && l1.fwd > 16) {
    ctx.lineWidth = Math.max(3, l0.k * 0.5); ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(l0.x, l0.y); ctx.lineTo(l1.x, l1.y); ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.stroke();
    const h = l1.k * 3.2, wob = Math.sin(t * 3) * l1.k * 0.15;
    ctx.beginPath(); ctx.rect(l1.x, l1.y + wob, r1.x - l1.x, h); ctx.fillStyle = '#FF3D8B'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.font = `${Math.max(12, h * 0.78)}px Bangers, Impact, sans-serif`; ctx.fillStyle = '#FFF8EC'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeText('SEND IT!', (l1.x + r1.x) / 2, l1.y + wob + h / 2); ctx.fillText('SEND IT!', (l1.x + r1.x) / 2, l1.y + wob + h / 2);
  }
}
// The crew shoving it down the deck, seen from behind.
function crew(cam, px, t, running) {
  for (const z of [-3.2, 3.2]) {
    const q = cam.project(px - 7, PIER, z); if (!q) continue;
    const k = q.k, step = running ? Math.sin(t * 22 + z) : 0;
    ctx.save(); ctx.translate(q.x, q.y); ctx.lineCap = 'round'; ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(4, k * 0.55);
    ctx.beginPath(); ctx.moveTo(0, -k * 2.8); ctx.lineTo(-k * 0.7 + step * k * 0.5, 0); ctx.moveTo(0, -k * 2.8); ctx.lineTo(k * 0.7 - step * k * 0.5, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-k * 0.9, -k * 5.2); ctx.lineTo(k * 0.9, -k * 5.2); ctx.lineTo(k * 0.7, -k * 2.6); ctx.lineTo(-k * 0.7, -k * 2.6); ctx.closePath(); ctx.fillStyle = z < 0 ? '#FFD23F' : '#29D3F0'; ctx.fill(); ctx.lineWidth = Math.max(2, k * 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-k * 0.8, -k * 5); ctx.lineTo(-k * 1.2 * Math.sign(z) - k * 0.4, -k * 6.6); ctx.moveTo(k * 0.8, -k * 5); ctx.lineTo(-k * 1.2 * Math.sign(z) + k * 0.4, -k * 6.6); ctx.lineWidth = Math.max(3, k * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -k * 6.1, k * 0.85, 0, Math.PI * 2); ctx.fillStyle = '#5B3A1E'; ctx.fill(); ctx.lineWidth = Math.max(2, k * 0.25); ctx.stroke();
    ctx.restore();
  }
}
function noseMeter(v, s) {
  const c = G.craft, as = (c.stall * Math.PI) / 180, x = 14, h = Math.min(160, v.H * 0.22), y = v.top + 34, w = 18;
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
// The radar: the next 230 feet from the side (0 to 60 feet up), the wind bands in red and green, the
// buoys, and you, so you can pick the height to fly at.
const rc = $('radar'), rx = rc.getContext('2d');
function radar(s, px, py, t) {
  const box = rc.parentElement; if (box.hidden) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = rc.clientWidth, H = rc.clientHeight;
  if (rc.width !== Math.round(W * dpr) || rc.height !== Math.round(H * dpr)) { rc.width = Math.round(W * dpr); rc.height = Math.round(H * dpr); }
  rx.setTransform(dpr, 0, 0, dpr, 0, 0); rx.clearRect(0, 0, W, H);
  const from = px - 30, span = 260, top = 60, X = (x) => ((x - from) / span) * W, Y = (y) => H - 6 - (Math.min(top, y) / top) * (H - 12);
  rx.fillStyle = 'rgba(46,155,224,0.55)'; rx.fillRect(0, Y(0), W, H - Y(0));
  const wind = G.flight ? G.flight.wind : null;
  if (wind) for (const b of wind.bands) {
    if (b.x1 < from || b.x0 > from + span) continue;
    rx.fillStyle = b.w < 0 ? 'rgba(255,75,75,0.6)' : 'rgba(91,227,138,0.65)';
    rx.fillRect(X(b.x0), Y(b.y1), X(b.x1) - X(b.x0), Y(b.y0) - Y(b.y1));
  }
  rx.fillStyle = 'rgba(255,248,236,0.7)'; rx.font = '10px Bangers, Impact, sans-serif'; rx.textAlign = 'center';
  for (let d = 50; d <= 1500; d += 50) { const x = X(d); if (x < 0 || x > W) continue; rx.fillRect(x - 1, Y(0) - 5, 2, 5); rx.fillText(String(d), x, Y(0) - 7); }
  if (from < 0) { rx.fillStyle = '#9B6A3C'; rx.fillRect(Math.max(0, X(-DECK)), Y(PIER), X(0) - Math.max(0, X(-DECK)), 3); }
  // you: a little arrow pointing where the nose points
  const th = s ? s.theta : 0, mx = X(px), my = Y(Math.max(0, py));
  rx.save(); rx.translate(mx, my); rx.rotate(-th);
  rx.beginPath(); rx.moveTo(9, 0); rx.lineTo(-6, -5); rx.lineTo(-3, 0); rx.lineTo(-6, 5); rx.closePath(); rx.fillStyle = '#FFD23F'; rx.fill(); rx.lineWidth = 1.5; rx.strokeStyle = INK; rx.stroke();
  rx.restore();
  rx.fillStyle = 'rgba(255,248,236,0.6)'; rx.textAlign = 'left'; rx.fillText('RADAR', 6, 12);
}

/* ---------- the contraptions from behind (wings across, about 180 wide, the middle at 0,0) ---------- */
const REAR = {
  goat(c, t) {
    c.beginPath(); c.moveTo(-92, 4); c.quadraticCurveTo(0, -40, 92, 4); c.lineTo(86, 10); c.quadraticCurveTo(0, -26, -86, 10); c.closePath();
    c.fillStyle = '#FFD23F'; c.fill(); c.save(); c.clip(); c.fillStyle = '#FF3D8B'; for (let x = -88; x < 92; x += 26) c.fillRect(x, -44, 11, 60); c.restore(); outline(c, null);
    c.beginPath(); c.moveTo(0, -18); c.lineTo(-20, 30); c.moveTo(0, -18); c.lineTo(20, 30); c.moveTo(-24, 30); c.lineTo(24, 30); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    // the goat from behind: horns, ears, a fluffy rump, a tail, dangling hooves
    c.beginPath(); c.moveTo(-7, 6); c.quadraticCurveTo(-16, -4, -10, -12); c.moveTo(7, 6); c.quadraticCurveTo(16, -4, 10, -12); c.lineWidth = 4; c.strokeStyle = '#8A7FA0'; c.stroke();
    c.beginPath(); c.ellipse(-13, 9, 6, 3, -0.4, 0, Math.PI * 2); c.ellipse(13, 9, 6, 3, 0.4, 0, Math.PI * 2); outline(c, '#FFF8EC', 2.4);
    c.beginPath(); c.ellipse(0, 18, 15, 13, 0, 0, Math.PI * 2); outline(c, '#FFF8EC', 3);
    c.beginPath(); c.ellipse(0, 9, 3, 5, 0, 0, Math.PI * 2); outline(c, '#FFF8EC', 2);
    for (const lx of [-7, 7]) { c.beginPath(); c.moveTo(lx, 29); c.lineTo(lx + Math.sin(t * 8 + lx) * 2, 40); c.lineWidth = 3.4; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.arc(lx + Math.sin(t * 8 + lx) * 2, 41, 2.4, 0, Math.PI * 2); c.fillStyle = INK; c.fill(); }
  },
  tub(c, t) {
    c.beginPath(); c.moveTo(-92, 0); c.lineTo(-30, -8); c.lineTo(-30, 6); c.lineTo(-88, 10); c.closePath(); outline(c, '#C98A4B');
    c.beginPath(); c.moveTo(92, 0); c.lineTo(30, -8); c.lineTo(30, 6); c.lineTo(88, 10); c.closePath(); outline(c, '#C98A4B');
    c.beginPath(); c.moveTo(-36, -4); c.lineTo(36, -4); c.quadraticCurveTo(36, 26, 0, 26); c.quadraticCurveTo(-36, 26, -36, -4); c.closePath(); outline(c, '#F3F0FF');
    c.beginPath(); c.ellipse(0, -4, 36, 7, 0, 0, Math.PI * 2); outline(c, '#F3F0FF'); c.beginPath(); c.ellipse(0, -4, 29, 4.5, 0, 0, Math.PI * 2); c.fillStyle = '#C9C2D6'; c.fill();
    for (const fx of [-20, 20]) { c.beginPath(); c.ellipse(fx, 28, 5, 4, 0, 0, Math.PI * 2); outline(c, '#FFD23F', 2.2); }
    rearPilot(c, -6, -14, 9, '#E8322E');
    c.beginPath(); c.arc(16, -12, 6, 0, Math.PI * 2); outline(c, '#FFD23F', 2.2);
  },
  couch(c, t) {
    c.beginPath(); c.rect(-94, -44, 188, 8); outline(c, '#C98A4B');
    c.beginPath(); c.moveTo(-50, -36); c.lineTo(-40, -18); c.moveTo(50, -36); c.lineTo(40, -18); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    rearPilot(c, 0, -26, 9, '#29D3F0');
    c.beginPath(); c.rect(-44, -20, 88, 34); outline(c, '#C42828');
    c.beginPath(); c.moveTo(-15, -20); c.lineTo(-15, 14); c.moveTo(15, -20); c.lineTo(15, 14); c.lineWidth = 2; c.strokeStyle = 'rgba(18,14,24,0.5)'; c.stroke();
    for (const ax of [-54, 44]) { c.beginPath(); c.rect(ax, -6, 10, 22); outline(c, '#E8322E'); }
    for (const lx of [-38, 34]) { c.beginPath(); c.rect(lx, 14, 4, 6); outline(c, '#7A4A24', 2); }
  },
  taco(c, t) {
    rearPilot(c, 0, -6, 9, '#5BE38A');
    c.beginPath(); c.moveTo(-62, -22); c.quadraticCurveTo(-62, 28, 0, 28); c.quadraticCurveTo(62, 28, 62, -22); c.lineTo(50, -22); c.quadraticCurveTo(50, 14, 0, 15); c.quadraticCurveTo(-50, 14, -50, -22); c.closePath(); outline(c, '#FFB627');
    c.beginPath(); for (let i = 0; i <= 10; i++) c.lineTo(-56 + (i % 2 ? 4 : 0), -22 + i * 3.5); c.lineWidth = 4; c.strokeStyle = '#5BE38A'; c.stroke();
    c.beginPath(); for (let i = 0; i <= 10; i++) c.lineTo(56 - (i % 2 ? 4 : 0), -22 + i * 3.5); c.stroke();
    for (const [x, y] of [[-30, 18], [8, 21], [34, 14]]) { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fillStyle = 'rgba(120,70,10,0.5)'; c.fill(); }
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 60, -6); c.lineTo(sd * 92, -2); c.lineTo(sd * 60, 4); c.closePath(); outline(c, '#F4E3C1', 2.4); }
  },
  pizza(c, t) {
    c.beginPath(); c.rect(-90, -36, 180, 8); outline(c, '#F4E3C1');
    c.beginPath(); c.rect(-82, 2, 164, 8); outline(c, '#F4E3C1');
    for (const x of [-56, 56]) { c.beginPath(); c.moveTo(x, -28); c.lineTo(x, 2); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); }
    for (const [x, y] of [[-74, -32], [-30, -32], [30, -32], [74, -32], [-64, 6], [64, 6]]) { c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); outline(c, '#E8322E', 1.4); }
    c.beginPath(); c.rect(-2.5, -50, 5, 16); outline(c, '#C98A4B', 2.2);
    c.beginPath(); c.rect(-18, -22, 36, 26); outline(c, '#C98A4B');
    rearPilot(c, 0, -26, 8, '#FFD23F');
  },
  cart(c, t, s) {
    c.beginPath(); c.moveTo(-90, -32); c.lineTo(90, -32); c.lineTo(72, -22); c.lineTo(-72, -22); c.closePath(); outline(c, '#C98A4B');
    rearPilot(c, 0, -30, 9, '#FF3D8B');
    c.beginPath(); c.moveTo(-36, -18); c.lineTo(36, -18); c.lineTo(28, 16); c.lineTo(-28, 16); c.closePath(); outline(c, 'rgba(201,217,232,0.55)');
    c.lineWidth = 1.6; c.strokeStyle = INK;
    for (let x = -28; x <= 28; x += 8) { c.beginPath(); c.moveTo(x, -18); c.lineTo(x * 0.8, 16); c.stroke(); }
    for (let y = -10; y <= 10; y += 7) { c.beginPath(); c.moveTo(-34 + (y + 18) * 0.2, y); c.lineTo(34 - (y + 18) * 0.2, y); c.stroke(); }
    c.beginPath(); c.moveTo(-40, -22); c.lineTo(40, -22); c.lineWidth = 5; c.stroke();
    for (const wx of [-24, 24]) { c.beginPath(); c.ellipse(wx, 22, 6, 5, 0, 0, Math.PI * 2); outline(c, '#2A2140', 2.4); }
    for (const bx of [-14, 14]) { c.beginPath(); c.arc(bx, 2, 8, 0, Math.PI * 2); outline(c, '#FF8A3D', 2.4); c.beginPath(); c.arc(bx, 2, 4, 0, Math.PI * 2); c.fillStyle = INK; c.fill(); }
    if (s && s.boostT > 0) for (let i = 0; i < 7; i++) { const r = 8 + i * 6 + Math.sin(t * 40 + i) * 2; c.beginPath(); c.arc((i % 2 ? 14 : -14) + Math.sin(t * 30 + i) * 6, 6 + i * 7, r, 0, Math.PI * 2); c.fillStyle = `rgba(255,${200 - i * 16},90,${0.55 - i * 0.06})`; c.fill(); }
  },
};
function rearPilot(c, x, y, r, helmet) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); outline(c, helmet, 2.6);
  c.beginPath(); c.moveTo(x - r, y + 1); c.lineTo(x + r, y + 1); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(x, y - r); c.lineTo(x, y + 1); c.lineWidth = 2; c.strokeStyle = 'rgba(255,248,236,0.7)'; c.stroke();
}
function drawRear(c, id, x, y, scale, roll, t, s) {
  c.save(); c.translate(x, y); c.rotate(roll); c.scale(scale, scale);
  c.lineJoin = 'round'; c.lineCap = 'round';
  (REAR[id] || REAR.goat)(c, t, s);
  c.restore();
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
