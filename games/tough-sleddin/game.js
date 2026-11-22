// Tough Sleddin: the page. The course and the sled are logic.mjs, the 3D worlds world.js and scenes.js. Menu (the
// goat rides by itself behind it) -> each of the three worlds: its name and a 3-2-1 while the camera swings in
// behind the goat, then left and right until the one crash -> its card -> after the third, the final score (all
// three added up) with the results text.
import { SCENES, makeCourse, newRun, step, botInput, feet, FT, MPH, CRASH_WORDS, shareRows, fmt } from './logic.mjs';
import { createWorld } from './world.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const prefs = Object.assign({ sound: true, seen: false }, store.get('tough-sleddin.prefs', {}));
const savePrefs = () => store.set('tough-sleddin.prefs', prefs);
function player() { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.handle ? p : null; } catch (e) { return null; } }
const bestKey = () => `tough-sleddin.best.${(player() || {}).handle || 'guest'}`;
const bests = () => Object.assign({ s: [0, 0, 0], total: 0 }, store.get(bestKey(), {}));
const mph = (v) => Math.round(v * MPH);

/* ---------------- sound: made on the spot ---------------- */
let ac = null, wind = null, carve = null;
function audio() {
  if (!prefs.sound) return null;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch (e) { return null; }
}
function noise(a) {
  const n = a.sampleRate * 2, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
let NOISE = null;
// a filtered noise that loops, its filter and loudness set every frame (the wind, the saucer on the snow)
function loop(a, type, f, q = 0.7) {
  NOISE = NOISE || noise(a);
  const s = a.createBufferSource(); s.buffer = NOISE; s.loop = true;
  const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = a.createGain(); g.gain.value = 0;
  s.connect(fl).connect(g).connect(a.destination); s.start();
  return { fl, g, stop() { try { g.gain.setTargetAtTime(0, a.currentTime, 0.1); s.stop(a.currentTime + 0.5); } catch (e) { /* stopped */ } } };
}
function tone(f, dur = 0.12, { type = 'triangle', vol = 0.06, at = 0, f2 = 0 } = {}) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
function thump(vol = 0.35, f = 220, dur = 0.5) {
  const a = audio(); if (!a) return;
  NOISE = NOISE || noise(a);
  const s = a.createBufferSource(); s.buffer = NOISE;
  const l = a.createBiquadFilter(); l.type = 'lowpass'; l.frequency.setValueAtTime(f, a.currentTime); l.frequency.exponentialRampToValueAtTime(40, a.currentTime + dur);
  const g = a.createGain(); g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  s.connect(l).connect(g).connect(a.destination); s.start(); s.stop(a.currentTime + dur + 0.05);
}
// a goat's "maa-aa-aa": a buzzy tone with a wobble through a mouth-shaped filter
function bleat(at = 0) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), bp = a.createBiquadFilter(), g = a.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(430, t); o.frequency.linearRampToValueAtTime(360, t + 0.75);
  lfo.frequency.value = 9; lg.gain.value = 38; lfo.connect(lg).connect(o.frequency);
  bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 2.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.05); g.gain.setValueAtTime(0.16, t + 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(bp).connect(g).connect(a.destination);
  o.start(t); lfo.start(t); o.stop(t + 0.85); lfo.stop(t + 0.85);
}
const sfx = {
  click: () => tone(660, 0.06, { vol: 0.04 }),
  beep: () => tone(660, 0.16, { type: 'square', vol: 0.04 }),
  go: () => { [1568, 2093, 1760, 2349, 1976, 2637].forEach((f, i) => tone(f, 0.18, { type: 'sine', vol: 0.05, at: i * 0.05 })); tone(880, 0.3, { type: 'square', vol: 0.04 }); },
  jump: () => tone(380, 0.28, { type: 'sine', vol: 0.07, f2: 980 }),
  land: () => thump(0.25, 400, 0.25),
  crash: () => { thump(0.5, 260, 0.7); bleat(0.12); [1320, 1760, 2200].forEach((f, i) => tone(f, 0.2, { type: 'sine', vol: 0.03, at: 0.4 + i * 0.12 })); },
  flag: () => [1046, 1318, 1568].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.045, at: i * 0.07 })),
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, { vol: 0.06, at: i * 0.1 })),
};
function startLoops() {
  const a = audio(); if (!a || wind) return;
  wind = loop(a, 'bandpass', 500, 0.6);
  carve = loop(a, 'highpass', 2600, 0.7);
}
function stopLoops() { if (wind) { wind.stop(); carve.stop(); wind = carve = null; } }
// little sounds of each place now and then: birdsong in the pines, bells in the village, chimes on the ice
let ambAt = 0;
function ambience(t, scene) {
  if (!ac || t < ambAt) return;
  ambAt = t + 2.5 + Math.random() * 4;
  if (scene === 0) { const f = 2400 + Math.random() * 1200; [0, 0.09, 0.2].forEach((d) => tone(f * (1 + Math.random() * 0.15), 0.07, { type: 'sine', vol: 0.012, at: d })); }
  else if (scene === 1) { const f = [523, 659, 784][Math.floor(Math.random() * 3)]; tone(f, 2.2, { type: 'sine', vol: 0.012 }); tone(f * 2.76, 1.4, { type: 'sine', vol: 0.005 }); }
  else { [1568, 2093, 2637].forEach((f, i) => tone(f * (0.9 + Math.random() * 0.2), 1.6, { type: 'sine', vol: 0.008, at: i * 0.14 })); }
}
function paintSound() {
  $('soundBtn').setAttribute('aria-pressed', String(prefs.sound));
  $('soundBtn').innerHTML = prefs.sound
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
}

/* ---------------- the world ---------------- */
let W = null;
const q0 = store.get('tough-sleddin.q', 0);
try { W = createWorld($('world'), { level: q0 }); W.setQuality(q0); } catch (e) { $('noGl').hidden = false; }
let quality = q0;

/* ---------------- the game ---------------- */
// mode: menu | intro (name and 3-2-1) | play | crash | card | results
let mode = 'menu', C = null, st = null, sceneIdx = 0, run = null, modeAt = 0, lastFlag = 0, wasAir = false;
const keys = { left: false, right: false }, held = { left: new Set(), right: new Set() };
const input = () => ((keys.right || held.right.size) ? 1 : 0) - ((keys.left || held.left.size) ? 1 : 0);
const now = () => performance.now() / 1000;

function show(which) {
  $('menu').hidden = $('menuBar').hidden = which !== 'menu';
  $('hud').hidden = !['intro', 'play', 'crash', 'card'].includes(which);
  $('arrows').hidden = !['intro', 'play'].includes(which);
  $('cardLayer').hidden = which !== 'card';
  $('results').hidden = which !== 'results';
}
function paintMenu() {
  const b = bests();
  $('scenes').innerHTML = SCENES.map((s, i) => `<div class="scene"><i aria-hidden="true">${s.emoji}</i><b>${s.name.toUpperCase()}</b><small>${b.s[i] ? `best ${fmt(b.s[i])} ft` : s.time}</small></div>`).join('');
  $('bestLine').textContent = b.total ? `Your best total: ${fmt(b.total)} ft` : 'Three worlds, one life in each. Your score is all three added up.';
}
// the goat riding by itself behind the menu
function menuRide() {
  if (!W) return;
  C = makeCourse(Math.floor(Math.random() * 1e9), 0);
  W.load(0, C);
  st = newRun(C);
  st.d = 30; st.x = C.center(30); st.y = C.height(st.x, 30);
  mode = 'menu'; modeAt = now();
}
function startGame() {
  audio(); sfx.click();
  run = { id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, results: [] };
  startScene(0);
}
function startScene(i) {
  sceneIdx = i;
  C = makeCourse(Math.floor(Math.random() * 1e9), i);
  W.clearCrash();
  W.load(i, C);
  st = newRun(C);
  const S = SCENES[i];
  $('hudScene').textContent = `${S.emoji} ${S.name.toUpperCase()}`;
  $('hudOf').textContent = `WORLD ${i + 1} OF 3`;
  $('hudBest').textContent = bests().s[i] ? `${fmt(bests().s[i])} ft` : '—';
  $('introOf').textContent = `WORLD ${i + 1} OF 3`;
  $('introName').textContent = S.name.toUpperCase();
  $('introBlurb').textContent = S.blurb;
  $('intro').hidden = false;
  $('wipe').hidden = true;
  $('count').hidden = true;
  paintHud();
  mode = 'intro'; modeAt = now(); lastCount = -1; lastFlag = 0; wasAir = false;
  show('intro');
}
let lastCount = -1;
function paintHud() {
  $('hudDist').textContent = `${fmt(feet(st))} ft`;
  $('hudSpeed').textContent = `${mph(st.v)} MPH${st.ice ? ' · ICE!' : ''}`;
}
function toast(text) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
  $('toasts').appendChild(el); setTimeout(() => el.remove(), 1400);
}
function crashed() {
  mode = 'crash'; modeAt = now();
  W.crash(st);
  sfx.crash();
  if (navigator.vibrate) try { navigator.vibrate([60, 40, 120]); } catch (e) { /* no buzz */ }
  $('wipeText').textContent = ['WIPEOUT!', 'BONK!', 'OOF!', 'KA-THUNK!', 'SNOW-PLANT!'][Math.floor(Math.random() * 5)];
  $('wipe').hidden = false;
  $('count').hidden = true;
  $('arrows').hidden = true;
  keys.left = keys.right = false; held.left.clear(); held.right.clear(); paintArrows();
  const ft = feet(st), b = bests();
  run.results.push({ scene: sceneIdx, ft, hit: st.crashed.kind, best: ft > (b.s[sceneIdx] || 0) });
}
function showCard() {
  mode = 'card'; modeAt = now();
  $('wipe').hidden = true;
  const r = run.results[run.results.length - 1], S = SCENES[r.scene];
  $('dots').innerHTML = SCENES.map((_, i) => `<i class="${i < run.results.length ? 'on' : ''}"></i>`).join('');
  $('cardK').textContent = `${S.emoji} ${S.name.toUpperCase()}`;
  $('cardM').textContent = `${fmt(r.ft)} ft`;
  $('cardWhy').textContent = r.hit === 'trees' ? 'Off the trail and into the trees!' : `You hit ${CRASH_WORDS[r.hit] || 'something'}!`;
  $('cardPb').hidden = !r.best;
  $('cardBtn').textContent = r.scene < 2 ? `Next: ${SCENES[r.scene + 1].emoji} ${SCENES[r.scene + 1].name} ▶` : 'See my final score ▶';
  show('card');
  setTimeout(() => $('cardBtn').focus({ preventScroll: true }), 50);
}
function nextFromCard() {
  sfx.click();
  if (sceneIdx < 2) startScene(sceneIdx + 1);
  else showResults();
}
function showResults() {
  mode = 'results'; modeAt = now();
  stopLoops();
  const b = bests(), total = run.results.reduce((a, r) => a + r.ft, 0), pb = total > (b.total || 0);
  // keep the bests (each world's, and the total)
  run.results.forEach((r) => { if (r.ft > (b.s[r.scene] || 0)) b.s[r.scene] = r.ft; });
  if (pb) b.total = total;
  store.set(bestKey(), b);
  $('resTotal').textContent = `${fmt(total)} ft`;
  $('resPb').hidden = !pb;
  $('resRows').innerHTML = run.results.map((r) => { const S = SCENES[r.scene]; return `<div class="row"><i aria-hidden="true">${S.emoji}</i><div><b>${S.name.toUpperCase()}</b><small>${r.hit === 'trees' ? 'into the trees' : `hit ${CRASH_WORDS[r.hit] || 'something'}`}</small></div><strong>${fmt(r.ft)} ft${r.best ? '<sup>BEST</sup>' : ''}</strong></div>`; }).join('');
  $('resBest').textContent = pb ? 'Your best total ever!' : `Your best total: ${fmt(b.total)} ft`;
  // the lab wallet: amber for finishing all three, a shard for a new best total
  $('resPaid').textContent = player() ? '' : 'Make a Capra Lab profile on the hub to earn amber every time you sled.';
  if (window.CapraWallet) {
    CapraWallet.earn('tough-sleddin', 'run', run.id);
    if (pb && total >= 1500) CapraWallet.earn('tough-sleddin', 'best', run.id);
  }
  // the results text, the same card in every Capra Lab game
  const box = $('resShare');
  box.innerHTML = '';
  if (window.CapraShare) {
    const text = CapraShare.text({ emoji: '🛷', game: 'Tough Sleddin', sub: '3 winter worlds',
      lines: [...run.results.map((r) => `${SCENES[r.scene].name} ${fmt(r.ft)} ft`), `Total ${fmt(total)} ft${pb ? ' 👑 new best' : ''}`], grid: shareRows(run.results) });
    box.innerHTML = '<lab-text-share></lab-text-share>';
    box.firstChild.set({ emoji: '🛷', title: 'Tough Sleddin', text, url: `${location.origin}/tough-sleddin/` });
  }
  sfx.win();
  show('results');
}
function toMenu() { sfx.click(); stopLoops(); paintMenu(); show('menu'); menuRide(); }

/* ---------------- the loop ---------------- */
const H = 1 / 120;
let acc = 0, last = now(), frames = [], slowSince = 0;
function frame() {
  requestAnimationFrame(frame);
  if (!W || !st) return;
  const t = now(), dt = Math.min(0.05, t - last); last = t;
  const inp = window.__sledAuto && C ? botInput(st, C) : input();
  if (mode === 'menu') {
    // the goat rides itself; a crash just starts it again
    acc += dt;
    while (acc >= H) { step(st, botInput(st, C), H, C); acc -= H; }
    if (st.crashed || st.d > 2500) menuRide();
    W.frame(st, { mode: 'menu', dt, t, input: botInput(st, C) });
  } else if (mode === 'intro') {
    const e = t - modeAt;
    // the name for a moment, then 3, 2, 1, GO! while the camera swings in behind the goat
    const n = e < 1.2 ? -1 : e < 1.95 ? 3 : e < 2.7 ? 2 : e < 3.45 ? 1 : 0;
    if (n !== lastCount && n >= 0) {
      lastCount = n;
      $('intro').hidden = true;
      const c = $('count'); c.hidden = false; c.textContent = n ? n : 'GO!'; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
      if (n) sfx.beep(); else { sfx.go(); startLoops(); }
    }
    if (e >= 3.45) { mode = 'play'; modeAt = t; acc = 0; setTimeout(() => { if (mode === 'play') $('count').hidden = true; }, 500); }
    W.frame(st, { mode: 'intro', dt, t, input: inp, intro: Math.min(1, Math.max(0, (e - 0.9) / 2.5)) });
  } else if (mode === 'play') {
    acc += dt;
    while (acc >= H && !st.crashed) { step(st, inp, H, C); acc -= H; }
    if (st.air && !wasAir) sfx.jump();
    if (!st.air && wasAir) sfx.land();
    wasAir = st.air;
    const ft = feet(st);
    if (Math.floor(ft / 1000) > lastFlag) { lastFlag = Math.floor(ft / 1000); toast(`${fmt(lastFlag * 1000)} ft!`); sfx.flag(); }
    if (wind) {
      const a = ac, k = (st.v - C.S.v0) / (C.S.vMax - C.S.v0);
      wind.fl.frequency.setTargetAtTime(380 + k * 900, a.currentTime, 0.1); wind.g.gain.setTargetAtTime(0.025 + k * 0.05, a.currentTime, 0.1);
      carve.g.gain.setTargetAtTime(st.air ? 0 : (st.ice ? 0.018 : 0.006) + Math.abs(st.vx) * 0.0035, a.currentTime, 0.06);
    }
    ambience(t, sceneIdx);
    paintHud();
    if (st.crashed) crashed();
    W.frame(st, { mode: 'play', dt, t, input: inp });
  } else {
    if (mode === 'crash' && t - modeAt > 1.8) showCard();
    if (wind) { wind.g.gain.setTargetAtTime(0, ac.currentTime, 0.3); carve.g.gain.setTargetAtTime(0, ac.currentTime, 0.1); }
    W.frame(st, { mode: 'crash', dt, t });
    W.dizzyAt(t);
  }
  govern(dt, t);
}
// a phone that can't keep up gets a lighter world (kept on this phone)
function govern(dt, t) {
  if (mode !== 'play') { frames = []; return; }
  frames.push(dt); if (frames.length > 90) frames.shift();
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  if (frames.length >= 90 && avg > 1 / 40 && quality < 2) {
    if (!slowSince) slowSince = t;
    else if (t - slowSince > 2) { quality++; W.setQuality(quality); store.set('tough-sleddin.q', quality); frames = []; slowSince = 0; }
  } else slowSince = 0;
}

/* ---------------- controls ---------------- */
function paintArrows() { $('left').classList.toggle('on', keys.left || held.left.size > 0); $('right').classList.toggle('on', keys.right || held.right.size > 0); }
for (const side of ['left', 'right']) {
  const b = $(side);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (er) { /* fine */ } held[side].add(e.pointerId); paintArrows(); audio(); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, (e) => { held[side].delete(e.pointerId); paintArrows(); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; paintArrows(); e.preventDefault(); }
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; paintArrows(); e.preventDefault(); }
  else if (e.key === 'Escape' && !$('help').hidden) $('help').hidden = true;
});
addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  paintArrows();
});
addEventListener('blur', () => { keys.left = keys.right = false; held.left.clear(); held.right.clear(); paintArrows(); });
// a phone call or the home button mid-run: the run waits (the clock that speeds you up stops too)
document.addEventListener('visibilitychange', () => { last = now(); if (document.hidden) stopLoops(); else if (mode === 'play') startLoops(); });

$('startBtn').onclick = startGame;
$('cardBtn').onclick = nextFromCard;
$('againBtn').onclick = startGame;
$('menuBtn').onclick = toMenu;
$('soundBtn').onclick = () => { prefs.sound = !prefs.sound; savePrefs(); paintSound(); if (!prefs.sound) stopLoops(); else sfx.click(); };
$('helpBtn').onclick = () => { $('help').hidden = false; $('helpClose').focus(); };
$('helpClose').onclick = () => { $('help').hidden = true; if (!prefs.seen) { prefs.seen = true; savePrefs(); } };
addEventListener('resize', () => W && W.resize());
if (window.visualViewport) visualViewport.addEventListener('resize', () => W && W.resize());
// the stage itself changing size (the lab's fill script stretching it to the bottom of the screen in the Home Screen
// app sends no resize event): the picture follows it, so nothing is left short at the bottom
if (window.ResizeObserver) new ResizeObserver(() => W && W.resize()).observe($('world'));

// for checking the game by hand
window.__sled = {
  state: () => st && { mode, scene: sceneIdx, d: st.d, x: st.x, v: st.v, air: st.air, h: st.h, ice: st.ice, crashed: st.crashed && st.crashed.kind, results: run && run.results, stats: W && W.stats() },
  start: () => startGame(),
  scene: (i) => { run = { id: 'test', results: [] }; startScene(i); },
  // jump the run ahead to d meters (at the speed it would have by then)
  warp: (d) => { if (!st) return; const S = C.S; st.t = Math.min((S.vMax - S.v0) / S.acc, (Math.sqrt(S.v0 * S.v0 + 2 * S.acc * d) - S.v0) / S.acc) + Math.max(0, d - (S.vMax * S.vMax - S.v0 * S.v0) / (2 * S.acc)) / S.vMax; st.d = d; st.x = C.center(d); st.vx = 0; st.y = C.height(st.x, d); lastFlag = Math.floor((d * FT) / 1000); },
  crash: () => { if (st && mode === 'play') { st.crashed = { kind: 'rock', d: st.d, x: st.x, v: st.v, vx: st.vx, t: st.t }; } },
  next: () => nextFromCard(),
  skipIntro: () => { if (mode === 'intro') modeAt -= 3.4; },
  autopilot: (on) => { window.__sledAuto = on; },
  world: () => W,
};

paintSound();
paintMenu();
show('menu');
if (W) { W.resize(); menuRide(); requestAnimationFrame(frame); }
