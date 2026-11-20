/* IRL: the page. Pick a challenge, prop the phone up, step back: the camera finds your body with
   MediaPipe's pose model (run right on the phone from ./vendor and ./models, nothing sent anywhere),
   logic.mjs turns the body points into reps, holds, hits and dribbles, and the lab wallet pays.
   Two players (JC, Nov 15 2026) stand side by side, a half of the screen each; the tracker finds both
   bodies and splitPlayers sorts them left and right. Any camera the phone offers can be picked,
   the 0.5× ultra-wide too when the browser is given it.
   Tests set window.__irlFake before load and feed made-up bodies through window.__irl.feed(frame)
   ({ lm, world } for one player, { people: [{ lm, world }, ...] } for two). */
import { CHALLENGES, ORDER, COUNTERS, BONES, P, SILOS, TWO_UP, framing, shareRow, splitPlayers, winnerOf, MIN_TO_PAY } from './logic.mjs';
import { drawSport, drawBackdrop, drawPuppet, drawWorkout, setLite } from './scene.js';
import { MOVES, WORKOUT, workoutRow } from './workout.mjs';
import { flyTitle } from './sports.mjs';
import { CRAFTS } from '../send-it/logic.mjs';
import { drawAvatar, lookFor } from '/lab/avatar.mjs';
import { SKINS, FURS, SHIRTS } from '/lab/avatar-catalog.mjs';

const $ = (id) => document.getElementById(id);
const FAKE = !!window.__irlFake;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } } };
const me = () => { const p = store.get('capra-lab.profile', null); return p && p.name && p.code ? p : null; };
const prefs = Object.assign({ sound: true, cam: 'front', mirror: true, scene: true, players: 1, guest: 'Player 2', youRight: false, names: ['Player 1', 'Player 2'], place: 'field' }, store.get('irl.prefs', {}));
const savePrefs = () => store.set('irl.prefs', prefs);
/* Going easy on the phone (JC, Nov 15 2026: IRL froze on his son's iPhone 17 and ran fine on his 16 Pro
   Max). The camera, the tracker and the scene all share the phone's chips, and a phone that heats up
   slows down. The page times every tracker frame: when they keep taking too long it steps down a level
   (level 1: a softer canvas and fewer tracker frames; level 2: softer again, fewer again, a smaller
   camera picture and no halftone dots or crowd sway) and remembers it on this phone for two weeks. The
   camera sheet's "Easy on the phone" switch (prefs.lite) goes straight to level 2. If the phone's GPU
   gives out on the tracker, it's rebuilt on the CPU (and stays there on this phone). */
const PERF = (() => { const p = store.get('irl.perf', null); return p && Date.now() - (p.at || 0) < 14 * 864e5 ? { level: Math.min(2, p.level | 0), cpu: !!p.cpu } : { level: 0, cpu: false }; })();
const savePerf = () => store.set('irl.perf', { level: PERF.level, cpu: PERF.cpu, at: Date.now() });
const perfLevel = () => (prefs.lite ? 2 : PERF.level);
const dprNow = () => Math.min([2, 1.5, 1][perfLevel()], window.devicePixelRatio || 1);
setLite(perfLevel() >= 2);
const NAME_MAX = 17;
const PCOL = ['#29D3F0', '#FF3D8B'];      // two players: the left one cyan, the right one magenta
const SIDE = ['LEFT', 'RIGHT'];
// Two players: whose phone it is (their side gets the pay and the best), and both names.
const ownerSide = () => (me() ? (prefs.youRight ? 1 : 0) : -1);
function duoNames() {
  const p = me(), clip = (n, d) => (String(n || '').trim().slice(0, NAME_MAX) || d);
  if (!p) return [clip(prefs.names[0], 'Player 1'), clip(prefs.names[1], 'Player 2')];
  const you = clip(p.name, 'You'), guest = clip(prefs.guest, 'Player 2');
  return prefs.youRight ? [guest, you] : [you, guest];
}
const bestKey = () => 'irl.best.' + ((me() || {}).handle || 'guest');
const bests = () => store.get(bestKey(), {});
const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const scoreText = (kind, n) => (kind === 'wallsit' ? fmt(n) : String(n));

function show(name) {
  for (const s of document.querySelectorAll('[data-screen]')) s.hidden = s.dataset.screen !== name;
  window.scrollTo(0, 0);
  if (name !== 'stage') sleepWorld();
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
  // the sports: a ball rumbling down the lane, pins crashing, the crowd, a whoosh, the swish and the clank
  roll: () => tone(70, 0, 1.6, 'sawtooth', 0.035, 50),
  pins: (n = 5) => { for (let i = 0; i < Math.min(8, n + 2); i++) tone(500 + Math.random() * 900, i * 0.035, 0.09, 'square', 0.04, 160); },
  cheer: () => { for (let i = 0; i < 10; i++) tone(300 + Math.random() * 500, i * 0.05, 0.3, 'sawtooth', 0.015, 250 + Math.random() * 300); },
  whoosh: () => tone(500, 0, 0.35, 'sine', 0.05, 140),
  swish: () => { tone(1800, 0, 0.18, 'sine', 0.04, 900); tone(1200, 0.05, 0.2, 'triangle', 0.04, 700); },
  clank: () => { tone(420, 0, 0.12, 'square', 0.07, 380); tone(640, 0.02, 0.18, 'triangle', 0.05, 600); },
  pok: () => { tone(900, 0, 0.05, 'square', 0.06, 400); tone(240, 0, 0.08, 'sine', 0.08, 120); },
};
function say(text) {
  if (!prefs.sound || !('speechSynthesis' in window) || !text) return;
  try { const u = new SpeechSynthesisUtterance(text); u.rate = 1.15; u.pitch = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* no voice here */ }
}
function paintSound() {
  $('soundBtn').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${prefs.sound ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'}</svg>`;
  $('soundBtn').setAttribute('aria-pressed', String(prefs.sound));
}
$('soundBtn').onclick = () => { prefs.sound = !prefs.sound; savePrefs(); paintSound(); if (prefs.sound) sfx.beep(); };
paintSound();
$('helpBtn').onclick = () => { $('veil').hidden = false; $('helpX').focus(); };
$('helpX').onclick = () => { $('veil').hidden = true; };
$('veil').addEventListener('click', (e) => { if (e.target === $('veil')) $('veil').hidden = true; });

/* ---------- home ---------- */
// "60 seconds · goal 20 reps", "Five frames · goal 70 pins", "Hold up to 3:00 · goal 60 s"
function challengeLine(k, upper = false) {
  const c = CHALLENGES[k];
  const s = k === 'wallsit' ? `Hold up to ${fmt(c.secs)} · goal ${c.goal} s` : c.workout ? `${c.moves} moves · about ${Math.round(c.secs / 60)} minutes · goal ${c.goal} ${c.units}` : c.frames ? `${c.frames} frames · goal ${c.goal} ${c.units}` : c.untimed ? `One flight · goal ${c.goal} ${c.units}` : `${c.secs} seconds · goal ${c.goal} ${c.units}`;
  return upper ? s.toUpperCase() : s;
}
function renderHome() {
  const b = bests(), two = prefs.players === 2;
  for (const el of document.querySelectorAll('#who button')) el.setAttribute('aria-checked', String(Number(el.dataset.n) === prefs.players));
  $('whoNote').textContent = two ? 'Side by side, a half of the screen each. Push-ups stay solo: the camera has to see you side-on.' : 'Just you. Switch to 2 players for a head-to-head.';
  $('cards').innerHTML = ORDER.map((k) => {
    const c = CHALLENGES[k], solo = two && !TWO_UP.includes(k);
    const what = challengeLine(k);
    return `<button type="button" class="ch" data-k="${k}" style="--c:${c.color}"><span class="em" aria-hidden="true">${c.emoji}</span>
      <span><b>${esc(c.name.toUpperCase())}</b><small>${solo ? '<i class="solo">SOLO ONLY</i> ' : ''}${esc(c.blurb)} ${esc(what)}</small></span>
      <span class="best">${b[k] != null ? esc(scoreText(k, b[k])) : '–'}<span>BEST</span></span></button>`;
  }).join('');
  for (const el of $('cards').querySelectorAll('.ch')) el.onclick = () => openChallenge(el.dataset.k);
}
for (const el of document.querySelectorAll('#who button')) el.onclick = () => { prefs.players = Number(el.dataset.n); savePrefs(); renderHome(); };

/* ---------- the camera and the motion tracker ---------- */
const video = $('video'), canvas = $('overlay'), ctx = canvas.getContext('2d'), pipCv = $('pipCv'), pipCtx = pipCv.getContext('2d');
// The scene up front with the camera in the corner (the sports games always), or the camera full screen.
const sceneOn = () => !!(S && CHALLENGES[S.kind].sport) || prefs.scene !== false;
function applyView() {
  const cam = $('cam');
  cam.classList.toggle('scene', sceneOn()); cam.classList.toggle('camera', !sceneOn()); cam.classList.toggle('two', !!(S && S.two));
  const b = box();
  cam.style.setProperty('--pip-ar', `${Math.round(b.aspect * 1000)} / 1000`);
}
video.addEventListener('loadedmetadata', () => applyView());
video.addEventListener('resize', () => applyView());
/* The player as a puppet in the scenes: their lab avatar drawn as a comic body that copies their pose
   (JC, Nov 15 2026: "My profile should be my IRL character": a failed look request used to leave him in
   the free look for the whole visit). The phone owner wears their saved look: what the Capra Lab button
   already has this visit or the last look this phone saw (irl.look) shows straight away, then the
   wallet's answer (/api/wallet/looks) settles it. A request that fails is asked again (2, 5, 15, 30 s,
   when a challenge opens, when the page comes back); only the wallet saying there's no saved look gives
   the free look picked from the handle. The other player of two is looked up by the name typed for
   them, so a lab player gets their own look too. */
const handleOf = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
const myHandle = () => { const p = me(); return p ? String(p.handle || handleOf(p.name)).toLowerCase() : ''; };
const LOOK = { mine: null, of: '', sure: false, asking: null, retry: 0, tries: 0, guests: new Map() };
function puppetLook(seed, saved = null) {
  const l = lookFor(seed, saved), animal = l.base === 'animal';
  const img = new Image(), look = { head: img, bmp: null, skin: animal ? FURS[l.fur] : SKINS[l.skin], shirt: SHIRTS[l.shirt], pants: '#2B3A67' };
  // drawn onto a canvas once: a picture made of SVG costs Safari a full redraw every frame
  img.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 240; c.getContext('2d').drawImage(img, 0, 0, 240, 240); look.bmp = c; } catch { /* the SVG still draws */ } };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(drawAvatar(l, { plain: true }).replace('<svg ', '<svg width="300" height="300" '));
  return look;
}
// The wallet's saved look for a handle: the look, null when none is saved, or it throws (no answer).
async function savedLookOf(h) {
  const r = await fetch('/api/wallet/looks?h=' + encodeURIComponent(h), { cache: 'no-store' });
  if (!r.ok) throw new Error('looks ' + r.status);
  const j = await r.json();
  if (!j || !j.looks || !(h in j.looks)) throw new Error('no looks');
  return j.looks[h] || null;
}
function wearMine(h, saved, sure) {
  const key = h + ':' + JSON.stringify(saved || null);
  if (!LOOK.mine || LOOK.of !== key) { LOOK.mine = puppetLook(h, saved); LOOK.of = key; }
  if (sure) { LOOK.sure = true; store.set('irl.look', { h, look: saved || null }); }
}
function loadMyLook() {
  const h = myHandle();
  if (LOOK.of && !LOOK.of.startsWith(h + ':')) { LOOK.mine = null; LOOK.of = ''; LOOK.sure = false; }   // someone else signed in
  if (!h) return Promise.resolve();
  if (!LOOK.sure) {
    // the Capra Lab button's wallet this visit (checked on every try: it may answer before we do)
    let w = null;
    try { const c = JSON.parse(sessionStorage.getItem('capra-lab.wallet') || 'null'); if (c && c.w && 'look' in c.w && String(c.who || '').toLowerCase() === h) w = c.w; } catch { /* private mode */ }
    const kept = store.get('irl.look', null);
    if (w) wearMine(h, w.look, false);
    else if (!LOOK.mine && kept && kept.h === h) wearMine(h, kept.look, false);
  }
  if (LOOK.asking) return LOOK.asking;
  clearTimeout(LOOK.retry);
  LOOK.asking = savedLookOf(h)
    .then((saved) => { LOOK.tries = 0; if (myHandle() === h) wearMine(h, saved, true); })
    .catch(() => {
      LOOK.tries++;
      // nothing known yet: a plain comic head meanwhile, never someone else's look
      if (!LOOK.mine && myHandle() === h) { LOOK.mine = { head: null, bmp: null, skin: SKINS[0], shirt: '#2D6BFF', pants: '#2B3A67' }; LOOK.of = h + ':?'; }
      LOOK.retry = setTimeout(loadMyLook, [2, 5, 15, 30][Math.min(3, LOOK.tries - 1)] * 1000);
    })
    .finally(() => { LOOK.asking = null; });
  return LOOK.asking;
}
// The other player: their lab look when the name typed for them is a lab player's, else a free look.
function guestLook(name) {
  const h = handleOf(name) || 'guest';
  let g = LOOK.guests.get(h);
  if (!g) {
    g = { look: puppetLook(h, null) };
    LOOK.guests.set(h, g);
    if (h.length >= 2 && h !== myHandle()) savedLookOf(h).then((saved) => { if (saved) g.look = puppetLook(h, saved); }).catch(() => { g.again = true; });
  }
  return g.look;
}
window.addEventListener('capra-wallet:changed', (e) => { const d = e && e.detail, h = myHandle(); if (h && d && 'look' in d) wearMine(h, d.look || null, true); });
window.addEventListener('storage', (e) => { if (!e.key || e.key === 'capra-lab.profile') loadMyLook(); });
const plLook = (pl) => (pl.own ? LOOK.mine || (pl.look ||= puppetLook('guest')) : guestLook(pl.name));
let stream = null, landmarker = null, loadingModel = null, raf = 0, lastVideoTime = -1, wake = null, poses = 1, camLand = null;
async function loadModel() {
  if (landmarker) return landmarker;
  loadingModel ||= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import('./vendor/vision_bundle.mjs');
    const files = await FilesetResolver.forVisionTasks(new URL('./vendor/wasm', location.href).href);
    // our own canvas for the tracker's WebGL, so we hear when the phone takes it away (and rebuild)
    const surface = () => {
      const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
      if (c.addEventListener) c.addEventListener('webglcontextlost', (e) => { if (e.preventDefault) e.preventDefault(); rebuildTracker(); });
      return c;
    };
    const opts = (delegate) => ({ baseOptions: { modelAssetPath: new URL('./models/pose_landmarker_lite.task', location.href).href, delegate }, canvas: surface(),
      runningMode: 'VIDEO', numPoses: poses, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    if (!PERF.cpu) { try { return await PoseLandmarker.createFromOptions(files, opts('GPU')); } catch { /* the CPU, then */ } }
    return await PoseLandmarker.createFromOptions(files, opts('CPU'));
  })();
  try { landmarker = await loadingModel; } catch (e) { loadingModel = null; throw e; }
  return landmarker;
}
// One body or two: the tracker looks for as many people as there are players.
async function setPoses(n) {
  if (poses === n) return;
  poses = n;
  if (landmarker) { try { await landmarker.setOptions({ numPoses: n }); } catch { /* keeps looking for the old count */ } }
}
/* The cameras. Front and back by which way they face; after the first camera permission the browser
   names every lens it offers, and one called "Ultra Wide" is the 0.5× (iPhone lists it as "Back Ultra
   Wide Camera" when Safari is given it). A back camera that zooms out past 1× is the 0.5× too. Any
   other lenses are offered by their own names. The choice is kept in prefs.cam: front, back, wide or
   dev:<the lens's name>. */
const cams = { listed: false, n: 0, devs: [], wide: null, zoomMin: null, others: [] };
async function listCams() {
  try {
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    cams.n = devs.length; cams.devs = devs; cams.listed = devs.some((d) => d.label);
    const wide = devs.find((d) => /ultra ?wide/i.test(d.label));
    cams.wide = wide ? wide.deviceId : null;
    cams.others = devs.length > 2 ? devs.filter((d) => d.label && d !== wide && !/^(front|back) camera$/i.test(d.label.trim()) && !/front|user|facetime/i.test(d.label)) : [];
  } catch { /* no list: front and back still work */ }
}
const hasWide = () => !!cams.wide || (cams.zoomMin != null && cams.zoomMin < 1);
const camName = (c = prefs.cam) => (c === 'front' ? 'Front camera' : c === 'back' ? 'Back camera' : c === 'wide' ? '0.5× ultra-wide' : String(c).slice(4));
async function startCamera() {
  stopCamera();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { const e = new Error('no camera'); e.name = 'NotSupportedError'; throw e; }
  // a picture the shape of the screen: wide (16:9) when the phone is sideways, so it fills a TV (1280 ×
  // 720 when the camera is the main view; smaller when it's only the corner box, smaller again in light
  // mode: the tracker shrinks every picture to 256 across anyway). 30 frames a second at most.
  const land = innerWidth > innerHeight, lite = perfLevel() >= 2;
  const [vw, vh] = land ? (lite ? [640, 360] : sceneOn() ? [960, 540] : [1280, 720]) : [640, 480];
  const size = { width: { ideal: vw }, height: { ideal: vh }, frameRate: { ideal: 30 } };
  const want = prefs.cam || 'front';
  const dev = want === 'wide' ? cams.wide : want.startsWith('dev:') ? (cams.devs.find((d) => d.label === want.slice(4)) || {}).deviceId : null;
  const facingMode = want === 'front' ? 'user' : 'environment';
  try { stream = await navigator.mediaDevices.getUserMedia({ video: dev ? { deviceId: { exact: dev }, ...size } : { facingMode, ...size }, audio: false }); }
  catch (e) {
    if (!dev || e.name === 'NotAllowedError' || e.name === 'SecurityError') throw e;
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', ...size }, audio: false });   // that lens is gone: the back camera
  }
  camLand = land;
  const track = stream.getVideoTracks()[0];
  if (want !== 'front' && track && track.getCapabilities) {
    try {
      const z = track.getCapabilities().zoom;
      if (z && typeof z.min === 'number') cams.zoomMin = z.min;
      if (want === 'wide' && !dev && z && z.min < 1) await track.applyConstraints({ advanced: [{ zoom: z.min }] });
    } catch { /* no zoom here */ }
  }
  video.srcObject = stream;
  video.classList.toggle('mirror', mirrored());
  await video.play().catch(() => {});
  applyView();
  if (!cams.listed) await listCams();
  paintCamRow();
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
// The picture shows mirrored (like a mirror) whichever camera: the players are always the ones being
// filmed and watching, on the phone or on a TV. Prefs can turn it off.
const mirrored = () => FAKE || prefs.mirror !== false;
// Where the picture sits on screen (letterboxed, the whole camera picture shows).
function box() {
  const W = canvas.clientWidth, H = canvas.clientHeight, land = W > H;
  const vw = FAKE ? (land ? 1280 : 480) : video.videoWidth || 480, vh = FAKE ? (land ? 720 : 640) : video.videoHeight || 640;
  const s = Math.min(W / vw, H / vh), dw = vw * s, dh = vh * s;
  return { W, H, ox: (W - dw) / 2, oy: (H - dh) / 2, dw, dh, aspect: vw / vh };
}
const toScreen = (b, p) => [b.ox + (mirrored() ? 1 - p.x : p.x) * b.dw, b.oy + p.y * b.dh];
// A player's part of the picture, as fractions across it as it shows (0 left, 1 right): all of it
// alone, a half each for two.
const sideRange = (i) => (S && S.two ? (i ? [0.5, 1] : [0, 0.5]) : [0, 1]);
// Screen fractions into the picture's own x (mirrored back), for the counters.
const toPic = (q) => (mirrored() ? { ...q, x0: 1 - q.x1, x1: 1 - q.x0 } : q);

/* The frame loop: a new camera frame goes to the tracker (no sooner than trackGap after the last), its
   bodies to handle(). A watchdog keeps it from freezing: a camera picture that stops is played again
   (then the camera restarted), a tracker that keeps failing is rebuilt on the CPU, and while the tracker
   gives nothing during play the game carries on with the last pose it saw. */
const trk = { lastDetect: 0, lastFresh: 0, lastHandle: 0, lastCoast: 0, errs: 0, rebuilding: false, kicked: 0, restarted: 0 };
const gov = { ema: 0, det: 0, rafEma: 0, last: 0, slowSince: null, since: 0 };
// the least time between tracker frames: fewer before the go (it only has to find you), fewer in light mode
const trackGap = () => { const l = perfLevel(); return S && (S.phase === 'live' || S.phase === 'count') ? [0, 40, 62][l] : [62, 80, 100][l]; };
function frameLoop() {
  cancelAnimationFrame(raf);
  trk.lastFresh = trk.lastHandle = trk.lastDetect = performance.now();
  Object.assign(gov, { ema: 0, det: 0, rafEma: 0, last: 0, slowSince: null, since: 0 });
  const step = () => {
    if (!S || S.phase === 'done') return;
    raf = requestAnimationFrame(step);
    if (FAKE) return;
    const now = performance.now();
    // how often the screen gets a turn: long gaps mean the phone can't keep up (the camera's own frame
    // rate, low in a dim room, doesn't count against it)
    if (gov.last && now - gov.last < 1000) gov.rafEma = gov.rafEma ? gov.rafEma * 0.92 + (now - gov.last) * 0.08 : now - gov.last;
    gov.last = now;
    if (stream && video.readyState >= 2) {
      const fresh = video.currentTime !== lastVideoTime;
      if (fresh) trk.lastFresh = now;
      if (landmarker && (fresh || now - trk.lastDetect > 250) && now - trk.lastDetect >= trackGap()) detect(now);
    }
    watchdog(now);
  };
  raf = requestAnimationFrame(step);
}
function detect(now) {
  let res;
  trk.lastDetect = now;
  try { res = landmarker.detectForVideo(video, now); trk.errs = 0; }
  catch { if (++trk.errs >= 8) rebuildTracker(); return; }
  const det = performance.now() - now;
  lastVideoTime = video.currentTime;
  const people = (res.landmarks || []).map((lm, i) => ({ lm, world: (res.worldLandmarks && res.worldLandmarks[i]) || null }));
  handle({ people, t: now, aspect: (video.videoWidth || 480) / (video.videoHeight || 640) });
  trk.lastHandle = performance.now();
  govern(trk.lastHandle - now, det, now);
}
function watchdog(now) {
  if (!S || S.phase === 'done' || document.hidden) return;
  if (stream) {
    if (video.paused && now - trk.kicked > 1000) { trk.kicked = now; video.play().catch(() => {}); }     // iPhone pauses it now and then
    if (now - trk.lastFresh > 4000 && now - trk.restarted > 8000) { trk.restarted = trk.lastFresh = now; startCamera().catch(cameraTrouble); }
  }
  if (S.phase === 'live' && now - trk.lastHandle > 220 && now - trk.lastCoast > 100) {
    trk.lastCoast = now;
    handle({ people: S.lastPeople || [], t: now, aspect: box().aspect });
  }
  if (landmarker && !trk.rebuilding && now - trk.lastHandle > 3000 && now - trk.lastFresh < 500) rebuildTracker();
}
async function rebuildTracker() {
  if (trk.rebuilding) return;
  trk.rebuilding = true; trk.errs = 0;
  const old = landmarker; landmarker = null; loadingModel = null;
  try { if (old) old.close(); } catch { /* gone already */ }
  if (!PERF.cpu) { PERF.cpu = true; savePerf(); }
  try { await loadModel(); } catch { /* the watchdog tries again */ }
  trk.rebuilding = false; trk.lastHandle = performance.now(); gov.since = 0;
}
// Steps down a level when tracker frames keep taking too long, or the screen keeps missing its turns. A
// tracker that's slow on its own (a phone's GPU busy with everything else) moves to the CPU first.
function govern(work, det, t) {
  gov.since ||= t;
  if (t - gov.since < 2000) return;       // the first frames warm the tracker up: slow, and no sign of anything
  gov.ema = gov.ema ? gov.ema * 0.9 + work * 0.1 : work;
  gov.det = gov.det ? gov.det * 0.9 + det * 0.1 : det;
  const gpuSlow = !PERF.cpu && gov.det > 60, slow = gpuSlow || (!prefs.lite && PERF.level < 2 && (gov.ema > [26, 32][PERF.level] || gov.rafEma > 60));
  if (!slow) { gov.slowSince = null; return; }
  gov.slowSince ??= t;
  if (t - gov.slowSince < 2500) return;
  if (gpuSlow) rebuildTracker();
  else { PERF.level++; savePerf(); setLite(perfLevel() >= 2); lay.at = 0; syncWorld(); }
  Object.assign(gov, { ema: 0, det: 0, rafEma: 0, last: 0, slowSince: null, since: 0 });
}

/* ---------- drawing: the comic stick figure, targets, pops ---------- */
// frames: one per player ({ lm } or nothing where the camera can't see them).
// A sports scene's part of the screen: all of it alone, a half each for two.
const sportRect = (i, b) => (S && S.two ? { x: i ? b.W / 2 : 0, y: 0, w: b.W / 2, h: b.H } : { x: 0, y: 0, w: b.W, h: b.H });
// Where the top bar and the score boxes end, so a scene's own boards sit clear of them. Measured at most
// every 400 ms (reading the page's layout every frame makes the browser lay it out again every frame).
const lay = { at: 0, top: 0, hud: 0, coachTop: 0, boxes: [], boxBottom: 0 };
function hudLayout(t) {
  if (lay.at && t - lay.at < 400 && t >= lay.at) return lay;
  const camTop = $('cam').getBoundingClientRect().top, top = $('backBtn').getBoundingClientRect().bottom - camTop + 6;
  const hudEls = [...document.querySelectorAll('#hud .count, #hud .clock, #hud .wk')].filter((el) => !el.hidden && el.offsetParent !== null);
  const hud = hudEls.length && !$('hud').hidden ? Math.max(...hudEls.map((el) => el.getBoundingClientRect().bottom)) - camTop + 8 : top;
  const coaches = [...document.querySelectorAll('.coach')].filter((el) => !el.hidden).map((el) => el.getBoundingClientRect().top - camTop - 10);
  const coachTop = coaches.length ? Math.min(...coaches) : $('cam').clientHeight - 80;
  // the score and clock boxes alone (cam-relative), for the workout's card and arrows
  const camLeft = $('cam').getBoundingClientRect().left;
  const boxes = $('hud').hidden ? [] : hudEls.filter((el) => !el.classList.contains('wk')).map((el) => { const r = el.getBoundingClientRect(); return { l: r.left - camLeft, r: r.right - camLeft, b: r.bottom - camTop }; });
  const boxBottom = boxes.length ? Math.max(...boxes.map((q) => q.b)) + 8 : top;
  return Object.assign(lay, { at: t, top, hud, coachTop, boxes, boxBottom });
}
function draw(frames, t = performance.now()) {
  const dpr = dprNow(), b = box();
  if (canvas.width !== Math.round(b.W * dpr) || canvas.height !== Math.round(b.H * dpr)) { canvas.width = Math.round(b.W * dpr); canvas.height = Math.round(b.H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, b.W, b.H);
  const scene = sceneOn(), w3 = scene && worldLive();
  if (!w3 && W3.world && W3.world.running && !worldFits()) sleepWorld();
  drawPip(frames);
  if (S && CHALLENGES[S.kind].sport) {
    const { top, hud } = hudLayout(t);
    for (const pl of S.players) drawSport(ctx, S.kind, sportRect(pl.i, b), pl.counter, t, { lm: frames && frames[pl.i] && frames[pl.i].lm, mirror: mirrored(), range: sideRange(pl.i), color: pl.color, aspect: b.aspect, top, hud, name: S.two ? pl.name : '' });
    if (S.two) drawDivider(b, true, false);
    return;
  }
  if (scene && !w3) drawBackdrop(ctx, S ? S.kind : 'squat', b.W, b.H, { x: b.ox, y: b.oy, w: b.dw, h: b.dh }, t, S ? Math.max(0, ...S.players.map((pl) => pl.cheerAt || 0)) : 0, dpr);
  else if (!scene && FAKE) { ctx.fillStyle = '#1B1528'; ctx.fillRect(b.ox, b.oy, b.dw, b.dh); }
  if (!S) return;
  // in a 3D place the puppets go on a canvas the size of the camera picture, which the place stands up as a cutout
  const ps = Math.min(1.25, dpr);
  if (w3) {
    const pw = Math.max(1, Math.round(b.dw * ps)), ph = Math.max(1, Math.round(b.dh * ps));
    if (pupCv.width !== pw || pupCv.height !== ph) { pupCv.width = pw; pupCv.height = ph; }
    pupCtx.setTransform(ps, 0, 0, ps, 0, 0); pupCtx.clearRect(0, 0, b.dw, b.dh);
  }
  if (S.two) drawDivider(b);
  const live = S.phase === 'live';
  for (const pl of S.players) {
    const f = frames && frames[pl.i], c = pl.counter, lm = f && f.lm;
    if (S.kind === 'keeper') drawGoal(b, ...sideRange(pl.i));
    if (S.kind === 'derby' && c) drawSilos(b, t, pl);
    if (lm && scene) {
      if (w3) drawPuppet(pupCtx, lm, (p) => { const [x, y] = toScreen(b, p); return { x: x - b.ox, y: y - b.oy }; }, plLook(pl), S.two ? pl.color : null, true);
      else drawPuppet(ctx, lm, (p) => { const [x, y] = toScreen(b, p); return { x, y }; }, plLook(pl), S.two ? pl.color : null);
      if (S.kind === 'dribble') drawDribbleBall(b, lm, pl);
    } else if (lm) drawBody(b, lm, pl.color);
    // the target
    const tg = live && S.kind === 'targets' ? c.target : null;
    if (tg) {
      const [x, y] = toScreen(b, tg), r = c.radius * b.dh * 1.05;
      if (!pl.tgShown.has(tg.id)) pl.tgShown.set(tg.id, t);
      const left = Math.max(0, 1 - (t - pl.tgShown.get(tg.id)) / 2600);
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(5,3,10,0.35)'; ctx.beginPath(); ctx.arc(5, 7, r, 0, Math.PI * 2); ctx.fill();
      const ring = S.two ? pl.color : '#FF3D8B';
      for (const [rr, cl] of [[1, ring], [0.68, '#FFF8EC'], [0.36, ring]]) { ctx.beginPath(); ctx.arc(0, 0, r * rr, 0, Math.PI * 2); ctx.fillStyle = cl; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#120E18'; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.lineWidth = 6; ctx.strokeStyle = '#FFD23F'; ctx.stroke();
      ctx.restore();
    }
    if (live && S.kind === 'keeper') drawBall(b, t, c);
    if (live && S.kind === 'avocado') { drawTrails(b, f, pl, t); drawAvocados(b, t, c); }
    if (live && S.kind === 'derby') { drawBat(b, f, pl, t); drawPitch(b, t, c); drawFlyers(b, t, c); }
  }
  if (w3) W3.world.set({ W: b.W, H: b.H, dpr, play: { x: b.ox, y: b.oy, w: b.dw, h: b.dh }, players: S.players.map((pl) => worldPlayer(b, frames && frames[pl.i] && frames[pl.i].lm)), pup: pupCv, pupDirty: true });
  if (live && S.kind === 'workout') {
    // the rest card: between the score and the clock from the top bar down when sideways alone, else
    // under them; the reaction arrows: under the top bar when sideways alone, else under the move bar
    const L = hudLayout(t), side = b.W > b.H && !S.two, h = (y) => Math.max(0, L.coachTop - y);
    let area = { x: 0, y: L.boxBottom, w: b.W, h: h(L.boxBottom) };
    if (side) {
      const x0 = Math.max(0, ...L.boxes.filter((q) => q.r < b.W / 2).map((q) => q.r)) + 12, x1 = Math.min(b.W, ...L.boxes.filter((q) => q.l > b.W / 2).map((q) => q.l)) - 12;
      area = { x: x0, y: L.top, w: Math.max(0, x1 - x0), h: h(L.top) };
    }
    const cueArea = side ? { x: 0, y: L.top, w: b.W, h: h(L.top) } : { x: 0, y: L.hud, w: b.W, h: h(L.hud) };
    drawWorkout(ctx, { area, cueArea, two: S.two, t, moves: WORKOUT.plan.length, color: CHALLENGES.workout.color,
      players: S.players.map((pl) => ({ c: pl.counter, color: pl.color, mid: b.ox + (b.dw * (sideRange(pl.i)[0] + sideRange(pl.i)[1])) / 2, toScreen: (p) => { const [x, y] = toScreen(b, p); return { x, y }; } })) });
  }
}
function drawBody(b, lm, color) {
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
// The camera picture in the corner box, with the stick figure the tracker sees (in each player's color).
function drawPip(frames) {
  if (!sceneOn()) return;
  const dpr = dprNow(), w = pipCv.clientWidth, h = pipCv.clientHeight;
  if (!w || !h) return;
  if (pipCv.width !== Math.round(w * dpr) || pipCv.height !== Math.round(h * dpr)) { pipCv.width = Math.round(w * dpr); pipCv.height = Math.round(h * dpr); }
  pipCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pipCtx.clearRect(0, 0, w, h);
  if (FAKE) { pipCtx.fillStyle = '#1B1528'; pipCtx.fillRect(0, 0, w, h); }
  if (!frames) return;
  frames.forEach((f, i) => {
    const lm = f && f.lm;
    if (!lm) return;
    const pl = S && S.players[i], col = pl ? (S.two ? pl.color : '#FFB14A') : '#FFB14A';
    const ok = (k) => lm[k] && (lm[k].visibility == null || lm[k].visibility > 0.45);
    const at = (p) => [(mirrored() ? 1 - p.x : p.x) * w, p.y * h];
    pipCtx.lineCap = 'round'; pipCtx.lineWidth = 2.5; pipCtx.strokeStyle = col; pipCtx.beginPath();
    for (const [a, z] of BONES) if (ok(a) && ok(z)) { const [x1, y1] = at(lm[a]), [x2, y2] = at(lm[z]); pipCtx.moveTo(x1, y1); pipCtx.lineTo(x2, y2); }
    pipCtx.stroke();
  });
}
// Dribble Drill in the scene: a basketball that bounces between the dribbling hand and the floor in time
// with the hand (the camera follows the hand, not the ball, so the ball is drawn from it).
function drawDribbleBall(b, lm, pl) {
  const ok = (k) => lm[k] && (lm[k].visibility == null || lm[k].visibility > 0.45);
  const hands = [P.LW, P.RW].filter(ok);
  if (!hands.length) return;
  const d = (pl.drib ||= { w: null, lo: 1, hi: 0 });
  const w = hands.length === 2 ? (d.w != null && hands.includes(d.w) ? d.w : hands.sort((a, c) => lm[c].y - lm[a].y)[0]) : hands[0];
  d.w = w;
  const y = lm[w].y;
  d.lo = Math.min(y, d.lo * 0.98 + y * 0.02); d.hi = Math.max(y, d.hi * 0.98 + y * 0.02);
  const span = Math.max(0.04, d.hi - d.lo), down = clampN((y - d.lo) / span, 0, 1);   // 0 hand up, 1 hand down
  const feet = [27, 28, 31, 32].filter(ok).map((k) => lm[k].y), floorY = feet.length ? Math.max(...feet) : Math.min(1, y + 0.3);
  const by = y + (floorY - y) * (1 - down) + 0.03;
  const [x, sy] = toScreen(b, { x: lm[w].x, y: by }), r = Math.max(8, b.dh * 0.04);
  ctx.save(); ctx.translate(x, sy - r);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#F2711C'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#120E18'; ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
  ctx.restore();
}
const clampN = (v, a, c) => Math.max(a, Math.min(c, v));
// Two players: a dashed line down the middle of the picture (or the screen, for the sports), and each
// name over its half until the go.
function drawDivider(b, full = false, names = true) {
  if (full) b = { ...b, ox: 0, oy: 0, dw: b.W, dh: b.H };
  const x = b.ox + b.dw / 2, top = Math.max(b.oy, 0), bot = Math.min(b.oy + b.dh, b.H);
  ctx.save();
  ctx.setLineDash([14, 12]); ctx.lineCap = 'round';
  for (const [w, c] of [[7, 'rgba(18,14,24,0.7)'], [3, 'rgba(255,248,236,0.75)']]) { ctx.lineWidth = w; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bot); ctx.stroke(); }
  ctx.setLineDash([]);
  if (S.phase !== 'live' && names) {
    const y = top + Math.min(110, b.H * 0.2);
    ctx.font = `${Math.round(Math.max(20, Math.min(34, b.dw / 22)))}px Bangers, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const pl of S.players) {
      const cx = b.ox + b.dw * (pl.i ? 0.75 : 0.25);
      ctx.lineWidth = 6; ctx.strokeStyle = '#120E18'; ctx.strokeText(pl.name.toUpperCase(), cx, y);
      ctx.fillStyle = pl.color; ctx.fillText(pl.name.toUpperCase(), cx, y);
    }
  }
  ctx.restore();
}
// Silo Derby: a row of grain silos across the top of the picture, the back row big (100, 50, 100), the
// front row smaller (10, 20, 30, 20, 10); a silo glows when a ball drops in.
function drawSilos(b, t, pl) {
  for (const sl of pl.counter.silos) {
    const [x, y] = toScreen(b, sl), r = sl.r * b.dh, w = r * 1.5, h = r * 2.1, hot = pl.lit && pl.lit[sl.i] && t - pl.lit[sl.i] < 650;
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
function drawBat(b, f, pl, t) {
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
  const path = (pl.batPath ||= []);
  path.push({ x: x1, y: y1, t }); while (path.length && t - path[0].t > 140) path.shift();
  if (path.length > 2) {
    ctx.beginPath(); path.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
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
function drawPitch(b, t, c) {
  const ball = c.ball(t); if (!ball) return;
  const [x, y] = toScreen(b, ball), r = Math.max(4, ball.r * b.dh);
  const [fx, fy] = toScreen(b, c.pitch.from), dx = x - fx, dy = y - fy, d = Math.hypot(dx, dy) || 1;
  ctx.save(); ctx.strokeStyle = 'rgba(255,248,236,0.5)'; ctx.lineCap = 'round';
  for (const k of [-0.5, 0, 0.5]) { const ox = (-dy / d) * r * k, oy = (dx / d) * r * k; ctx.lineWidth = Math.max(2, r * 0.16); ctx.beginPath(); ctx.moveTo(x - (dx / d) * r * 1.2 + ox, y - (dy / d) * r * 1.2 + oy); ctx.lineTo(x - (dx / d) * r * 2.6 + ox, y - (dy / d) * r * 2.6 + oy); ctx.stroke(); }
  // the sweet spot: a ring that tightens onto the ball as it arrives
  if (ball.p > 0.55 && ball.p < 1.15) { ctx.beginPath(); ctx.arc(x, y, r + 6 + Math.max(0, 1 - ball.p) * 40, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = ball.p >= 0.85 ? '#5BE38A' : '#FFD23F'; ctx.stroke(); }
  ctx.restore();
  baseball(x, y, r, t / 70);
}
function drawFlyers(b, t, c) {
  for (const fl of c.flyers) {
    const p = c.flyer(fl, t);
    if (p.u >= 1) continue;
    const [x, y] = toScreen(b, p);
    baseball(x, y, Math.max(4, p.r * b.dh), t / 50);
  }
}
// Goalkeeper: the goal frame around the picture (posts, crossbar, a faint net) and the ball coming in;
// for two players a goal each, around each half.
function drawGoal(b, a = 0, z = 1) {
  const L = b.ox + b.dw * (a + 0.04 * (z - a)), R = b.ox + b.dw * (z - 0.04 * (z - a)), T = b.oy + b.dh * 0.07, B = b.oy + b.dh;
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
function drawBall(b, t, c) {
  const ball = c.ball(t); if (!ball) return;
  const [x, y] = toScreen(b, ball), r = Math.max(4, ball.r * b.dh), sh = c.shot;
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
function drawTrails(b, f, pl, t) {
  const lm = f && f.lm;
  pl.trails ||= { L: [], R: [] };
  for (const [k, w, i] of [['L', P.LW, P.LI], ['R', P.RW, P.RI]]) {
    const pt = lm && [lm[i], lm[w]].find((p) => p && (p.visibility == null || p.visibility > 0.45));
    const tr = pl.trails[k];
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
function drawAvocados(b, t, c) {
  for (const it of c.items) {
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
function pop(text, at, side) {
  const el = document.createElement('div');
  el.className = 'pop' + (S && S.two ? ' sm' : ''); el.textContent = text;
  if (at) { const b = box(), [x, y] = toScreen(b, at), r = $('cam').getBoundingClientRect(); el.style.left = r.left + x + 'px'; el.style.top = r.top + y + 'px'; }
  else if (S && S.two && side != null) el.style.left = side ? '75%' : '25%';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 750);
}

/* ---------- a challenge ---------- */
let S = null;   // { kind, two, phase: setup | wait | count | live | done, players: [...], okSince, startAt }
let ticker = 0;
function newPlayer(i, two, C) {
  const names = two ? duoNames() : [(me() || {}).name || 'You'];
  return { i, name: names[i], color: two ? PCOL[i] : C.color, counter: null, score: 0, done: false, lostSince: null, own: !two || ownerSide() === i,
    tgShown: new Map(), lit: null, batPath: null, trails: null, lastBallAt: null, goalSaid: false };
}
async function openChallenge(kind) {
  const C = CHALLENGES[kind], two = prefs.players === 2 && TWO_UP.includes(kind);
  lay.at = 0;
  if (!LOOK.sure) loadMyLook();
  for (const [h, g] of LOOK.guests) if (g.again) LOOK.guests.delete(h);
  $('cam').classList.remove('resting');
  S = { kind, two, seed: (Math.random() * 1e9) >>> 0, phase: 'setup', players: [0, two ? 1 : null].filter((i) => i != null).map((i) => newPlayer(i, two, C)), okSince: null, startAt: 0, frames: null,
    tourPlace: kind === 'workout' ? TOUR[0] : TOUR[(Math.random() * TOUR.length) | 0] };
  show('stage');
  $('stage').classList.remove('live');
  $('stage').classList.toggle('two', two);
  $('stTitle').textContent = C.name.toUpperCase() + (two ? ' · 2P' : '');
  $('stTitle').classList.toggle('long', $('stTitle').textContent.length > 15);
  $('stage').classList.toggle('wkout', !!C.workout);
  if (!CRAFTS.some((c) => c.id === prefs.craft)) prefs.craft = 'goat';
  applyView();
  if (C.sport) for (const pl of S.players) pl.counter = makeCounter(kind, C, pl.i);   // the scene shows before the go
  $('hud').hidden = true; $('meterL').hidden = true; $('meterR').hidden = true; $('coach0').hidden = true; $('coach1').hidden = true; $('camAlert').hidden = true; $('countdown').innerHTML = '';
  $('setup').hidden = false;
  $('setup').style.setProperty('--c', C.color);
  $('setup').innerHTML = `<div class="top"><span class="em" aria-hidden="true">${C.emoji}</span><h2>${esc(C.name.toUpperCase())}<small>${two ? 'HEAD TO HEAD · ' : ''}${esc(challengeLine(kind, true))}</small></h2></div>
    <ol class="steps"><li>${esc(two ? C.setup2 : C.setup)}</li><li>${esc(C.how)}</li><li>Tap <b>Start</b>, then walk to your ${two ? 'spots' : 'spot'}. The countdown starts by itself when the camera sees ${two ? 'you both' : 'you'}.</li></ol>
    ${two ? '<div class="duo" id="duo"></div>' : ''}
    ${placesRow(kind)}
    ${kind === 'workout' ? `<p class="fine" style="margin-top:12px">THE MOVES, IN ORDER</p><div class="rides moves">${WORKOUT.plan.map(([k, secs]) => `<span class="ride"><span aria-hidden="true">${MOVES[k].emoji}</span>${esc(MOVES[k].short)} · ${secs}s</span>`).join('')}</div>` : ''}
    ${kind === 'sendit' ? `<p class="fine" style="margin-top:12px">${two ? 'YOUR CONTRAPTIONS (THE RIGHT PLAYER GETS THE NEXT ONE)' : 'YOUR CONTRAPTION'}</p><div class="rides" id="rides">${CRAFTS.map((c) => `<button type="button" class="ride" data-id="${c.id}" aria-pressed="${c.id === prefs.craft}"><span aria-hidden="true">${c.emoji}</span>${esc(c.name)}</button>`).join('')}</div>` : ''}
    <button type="button" class="camrow" id="camRow"><span aria-hidden="true">📷</span><span id="camName">${esc(camName())}</span><small>CHANGE</small></button>
    <p class="fine">The picture stays on your phone. Nothing is recorded or sent.</p>
    <div class="go"><div class="status" id="status"><i></i><span id="statusTxt">Starting the camera…</span></div>
    <div class="row"><button class="btn" type="button" id="startBtn" disabled>START</button></div></div>`;
  $('startBtn').onclick = begin;
  $('camRow').onclick = openCams;
  for (const el of document.querySelectorAll('#rides .ride')) el.onclick = () => {
    prefs.craft = el.dataset.id; savePrefs();
    for (const b of document.querySelectorAll('#rides .ride')) b.setAttribute('aria-pressed', String(b.dataset.id === prefs.craft));
    for (const pl of S.players) pl.counter = makeCounter(kind, C, pl.i);
    draw(S.frames);
  };
  for (const el of document.querySelectorAll('#places .ride')) el.onclick = () => {
    prefs.place = el.dataset.place; savePrefs();
    if (prefs.place === 'tour') S.tourPlace = TOUR[0];
    for (const b of document.querySelectorAll('#places .ride')) b.setAttribute('aria-pressed', String(b.dataset.place === el.dataset.place));
    syncWorld();
  };
  if (two) paintDuo();
  syncWorld();
  draw(null);
  frameLoop();
  if (FAKE) { setStatus('Camera ready (test)', ''); $('startBtn').disabled = false; return; }
  try {
    await setPoses(S.players.length);
    await startCamera();
    if (!S || S.kind !== kind) return;
    setStatus('Warming up the motion tracker… the first time takes a few seconds.', '');
    await loadModel();
    if (!S || S.kind !== kind) return;
    setStatus('Ready when you are. Tap Start.', 'ok');
    $('startBtn').disabled = false;
  } catch (e) { cameraTrouble(e); }
}
// Two players: the names, left and right as you face the screen. The phone's owner (their lab profile)
// keeps their own name and gets the pay and the best; the swap button moves them to the other side.
function paintDuo() {
  const el = $('duo'); if (!el || !S) return;
  const names = duoNames(), own = ownerSide();
  el.innerHTML = [0, 1].map((i) => `<label class="pl" style="--pc:${PCOL[i]}"><span>${SIDE[i]}${own === i ? ' · YOU' : ''}</span>${own === i
    ? `<b>${esc(names[i])}</b>` : `<input type="text" data-i="${i}" maxlength="${NAME_MAX}" value="${esc(names[i])}" autocomplete="off" spellcheck="false" aria-label="${SIDE[i]} player's name">`}</label>`)
    .join(`<button type="button" class="round-btn swap" id="swapBtn" aria-label="Swap sides">⇄</button>`) + '<p class="fine duo-fine">Left and right as you face the screen.</p>';
  for (const inp of el.querySelectorAll('input')) inp.oninput = () => {
    const i = Number(inp.dataset.i), v = inp.value.slice(0, NAME_MAX);
    if (own >= 0) prefs.guest = v; else prefs.names[i] = v;
    savePrefs();
    if (S && S.players[i]) S.players[i].name = duoNames()[i];
  };
  $('swapBtn').onclick = () => {
    if (own >= 0) prefs.youRight = !prefs.youRight; else prefs.names = [prefs.names[1], prefs.names[0]];
    savePrefs();
    const n = duoNames(); for (const pl of S.players) pl.name = n[pl.i];
    paintDuo(); draw(S.frames);
  };
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
      ? `<h3>NO CAMERA</h3><p>We couldn’t find ${prefs.cam === 'front' ? 'a camera' : 'that camera'} on this device. IRL works on a phone or tablet with a camera.</p>${prefs.cam !== 'front' ? '<div class="row"><button class="btn" type="button" id="frontCam">USE THE FRONT CAMERA</button></div>' : ''}`
      : `<h3>THAT DIDN'T START</h3><p>The motion tracker didn’t load (${esc((e && e.message) || 'unknown')}). Check your signal and try again.</p><div class="row"><button class="btn" type="button" id="retryCam">TRY AGAIN</button></div>`;
  setStatus(blocked ? 'Camera blocked' : 'Not ready', 'bad');
  const r = $('retryCam'); if (r) r.onclick = () => openChallenge(S ? S.kind : 'squat');
  const f = $('frontCam'); if (f) f.onclick = () => { prefs.cam = 'front'; savePrefs(); openChallenge(S ? S.kind : 'squat'); };
}

/* ---------- the 3D places (JC, Nov 19 2026: "Bring the glacial max level of detail to the 3d rendering of IRL. I
   want more vivid scenery and lighting with workouts in the pouring rain on a wheat field", then "A peaceful snow
   fall, a zen studio. Make it fun but immersive", "*separate scenes") ----------
   The workouts (the Full Body Workout, Squats, Push-ups, Wall Sit) play in a 3D place picked in the setup (or all
   four in turn, one a move, on the workout's Tour). world.js (built from world/ with three.js) draws it on its own
   canvas under the scene canvas; the puppets are drawn onto a canvas it stands in the place as a cutout. Light
   mode (level 2) and phones without WebGL 2 keep the comic gym. */
const PLACES = {
  field: { emoji: '🌾', name: 'Wheat Field' },
  rooftop: { emoji: '🌧️', name: 'Rainy Rooftop' },
  snow: { emoji: '❄️', name: 'Snowfall' },
  zen: { emoji: '🎋', name: 'Zen Studio' },
};
const TOUR = ['field', 'rooftop', 'snow', 'zen'];
const WORLD_KINDS = ['workout', 'squat', 'pushup', 'wallsit'];
const W3 = { world: null, loading: null, failed: false, gl: null };
const pupCv = document.createElement('canvas'), pupCtx = pupCv.getContext('2d');
function glOK() {
  if (W3.gl == null) { try { const g = document.createElement('canvas').getContext('webgl2'); W3.gl = !!g; if (g) g.getExtension('WEBGL_lose_context')?.loseContext(); } catch { W3.gl = false; } }
  return W3.gl;
}
const worldFits = () => !!S && WORLD_KINDS.includes(S.kind) && sceneOn() && perfLevel() < 2 && !W3.failed && glOK();
const placeNow = () => (prefs.place === 'tour' || !PLACES[prefs.place] ? (S && S.tourPlace) || 'field' : prefs.place);
const worldLive = () => !!(W3.world && W3.world.running && worldFits());
const worldPulse = (kind, i = 0) => { if (worldLive()) W3.world.pulse(kind, i); };
function sleepWorld() { if (W3.world && W3.world.running) W3.world.sleep(); }
// Wakes the place (loading world.js the first time), or puts it away when it doesn't fit now.
async function syncWorld() {
  if (!worldFits()) { sleepWorld(); return; }
  if (!W3.world) {
    W3.loading ||= import('./world.js')
      .then((m) => { W3.world = m.createWorld($('world3d'), { audio: () => (S && S.phase !== 'setup' && prefs.sound ? audio() : null), level: () => Math.min(1, perfLevel()) }); })
      .catch((e) => { W3.failed = true; console.warn('IRL: the 3D places didn’t load', e); });
    await W3.loading;
    if (!W3.world || !worldFits()) return;
  }
  W3.world.quality(Math.min(1, perfLevel()));
  W3.world.place(placeNow());
  W3.world.start();
  if (S) draw(S.frames);
}
// The setup's row of places (Tour only for the workout, which has moves to tour with).
function placesRow(kind) {
  if (!WORLD_KINDS.includes(kind) || !glOK() || !sceneOn()) return '';
  if (perfLevel() >= 2) return `<p class="fine" style="margin-top:12px">WHERE: THE IRL GYM. The 3D places rest while IRL goes easy on this phone (the camera button's “Easy on the phone”).</p>`;
  const opts = TOUR.map((k) => [k, PLACES[k]]).concat(kind === 'workout' ? [['tour', { emoji: '🔀', name: 'Tour all four' }]] : []);
  const cur = kind === 'workout' ? (PLACES[prefs.place] || prefs.place === 'tour' ? prefs.place : 'field') : placeNow();
  return `<p class="fine" style="margin-top:12px">WHERE YOU WORK OUT</p><div class="rides" id="places">${opts.map(([k, p]) => `<button type="button" class="ride" data-place="${k}" aria-pressed="${cur === k}"><span aria-hidden="true">${p.emoji}</span>${esc(p.name)}</button>`).join('')}</div>`;
}
// Where each player's feet and head are on screen, for the place (the floor line, the shadow, the breath).
function worldPlayer(b, lm) {
  if (!lm) return null;
  const ok = (i) => lm[i] && (lm[i].visibility == null || lm[i].visibility > 0.5);
  const feet = [27, 28, 29, 30, 31, 32].filter(ok).map((i) => toScreen(b, lm[i])), low = feet.concat([15, 16].filter(ok).map((i) => toScreen(b, lm[i])));
  const nose = ok(0) ? toScreen(b, lm[0]) : null;
  return { foot: low.length ? Math.max(...low.map((q) => q[1])) : null, fx: feet.length ? feet.reduce((a, q) => a + q[0], 0) / feet.length : null, head: nose ? { x: nose[0], y: nose[1] } : null };
}

/* ---------- the camera picker ---------- */
function paintCamRow() { const el = $('camName'); if (el) el.textContent = camName(); }
function openCams() {
  const opt = (v, em, title, blurb) => `<button type="button" class="opt" data-cam="${esc(v)}" aria-pressed="${prefs.cam === v}"><span class="em" aria-hidden="true">${em}</span><span><b>${esc(title)}</b><small>${esc(blurb)}</small></span></button>`;
  const back = FAKE || cams.n !== 1 || matchMedia('(pointer: coarse)').matches;     // a phone always has one
  $('camOpts').innerHTML = opt('front', '🤳', 'FRONT', 'Watch yourself on the phone’s screen.')
    + (back ? opt('back', '📷', 'BACK', 'The sharper camera. Mirror the screen to your TV and turn the phone around, so the back faces you.') : '')
    + (hasWide() ? opt('wide', '🔭', '0.5× ULTRA-WIDE', 'Sees the most of the room: stand closer, play bigger. Best for two players.') : '')
    + (cams.others.length ? `<p class="kick">MORE LENSES YOUR PHONE OFFERED</p>${cams.others.map((d) => opt('dev:' + d.label, '🎥', d.label.toUpperCase(), 'Try it: some phones only share their wide lens this way.')).join('')}` : '');
  $('camNote').textContent = hasWide() ? '' : cams.listed
    ? 'No 0.5× lens here: your phone didn’t hand its ultra-wide to the browser. Step back a little farther instead.'
    : 'More lenses (like the 0.5× ultra-wide) show up here once the camera has started.';
  $('mirrorChk').checked = prefs.mirror !== false;
  $('sceneChk').checked = prefs.scene !== false;
  $('liteChk').checked = !!prefs.lite;
  $('liteNote').textContent = !prefs.lite && PERF.level ? 'IRL already eased off a little on this phone by itself.' : '';
  for (const el of $('camOpts').querySelectorAll('.opt')) el.onclick = () => pickCam(el.dataset.cam);
  $('camVeil').hidden = false;
}
async function pickCam(v) {
  prefs.cam = v; savePrefs();
  $('camVeil').hidden = true;
  paintCamRow();
  if (FAKE || !S || S.phase === 'done') return;
  try { await startCamera(); } catch (e) { cameraTrouble(e); }
}
$('mirrorChk').onchange = () => { prefs.mirror = $('mirrorChk').checked; savePrefs(); video.classList.toggle('mirror', mirrored()); if (S) draw(S.frames); };
$('sceneChk').onchange = () => { prefs.scene = $('sceneChk').checked; savePrefs(); applyView(); syncWorld(); if (S) draw(S.frames); };
$('liteChk').onchange = () => {
  prefs.lite = $('liteChk').checked; savePrefs(); setLite(perfLevel() >= 2); lay.at = 0; syncWorld();
  $('liteNote').textContent = !prefs.lite && PERF.level ? 'IRL already eased off a little on this phone by itself.' : '';
  if (S) draw(S.frames);
  // a smaller camera picture too, before the go
  if (!FAKE && S && stream && (S.phase === 'setup' || S.phase === 'wait')) startCamera().catch(cameraTrouble);
};
$('camX').onclick = () => { $('camVeil').hidden = true; };
$('camVeil').addEventListener('click', (e) => { if (e.target === $('camVeil')) $('camVeil').hidden = true; });

/* ---------- playing ---------- */
function begin() {
  if (!S) return;
  audio(); say(' ');      // a tap unlocks sound and voice on iPhone
  keepAwake(true);
  S.phase = 'wait'; S.okSince = null;
  $('setup').hidden = true;
  for (const pl of S.players) coach(pl.i, 'Get in your spot', 'warn');
}
// The coach line: one at the bottom for one player, one under each half for two.
function coach(i, text, kind = '') {
  const el = $('coach' + i);
  el.hidden = false;
  if (el.textContent !== text) el.textContent = text;
  el.className = 'coach' + (S && S.two ? ' duo ' + (i ? 'r' : 'l') : '') + (kind ? ' ' + kind : '');
  if (S && S.two) el.style.setProperty('--pc', PCOL[i]);
}
const setCount = (i, text) => { $('count' + i).textContent = text; };
// Whether the camera sees what the challenge needs, for every player.
function frameCheck(frames) {
  const each = S.players.map((pl) => framing(S.kind, frames[pl.i] && frames[pl.i].lm));
  const bad = each.findIndex((fr) => !fr.ok);
  return { ok: bad < 0, each, say: bad < 0 ? 'Ready' : S.two ? `${S.players[bad].name}: ${each[bad].say}` : each[bad].say };
}
function handle(f) {
  if (!S) return;
  const people = f.people || (f.lm !== undefined ? [{ lm: f.lm, world: f.world }] : []);
  const mk = (p) => ({ lm: (p && p.lm) || null, world: (p && p.world) || null, t: f.t, aspect: f.aspect || 0.75 });
  const frames = S.two ? splitPlayers(people, mirrored()).map(mk) : [mk(people.find((p) => p && p.lm))];
  S.frames = frames; S.lastPeople = people;
  if (S.phase !== 'live') draw(frames, f.t);
  if (S.phase === 'setup') {
    if (!$('startBtn').disabled) { const w = frameCheck(frames); setStatus(w.ok ? (S.two ? 'We can see you both. Tap Start.' : 'We can see you. Tap Start.') : `${w.say}. You can still tap Start and get in place.`, w.ok ? 'ok' : ''); }
    return;
  }
  if (S.phase === 'wait') {
    const w = frameCheck(frames);
    if (w.ok) { S.okSince ??= f.t; for (const pl of S.players) coach(pl.i, 'Hold still…', 'ok'); if (f.t - S.okSince > 1200) countdown(); }
    else { S.okSince = null; w.each.forEach((fr, i) => coach(i, fr.ok ? 'Ready!' : fr.say, fr.ok ? 'ok' : 'warn')); }
    return;
  }
  if (S.phase !== 'live') return;
  for (const pl of S.players) play(pl, frames[pl.i]);
  draw(frames, f.t);   // after the updates, so a target that just popped up shows this frame
  if (S.players.every((pl) => pl.done)) finish();
}
// One player's frame: their counter, then the sounds, pops and coach line it calls for.
function play(pl, f) {
  if (pl.done) return;
  const t = f.t, solo = !S.two, i = pl.i;
  if (!f.lm) { pl.lostSince ??= t; if (t - pl.lostSince > 1500) coach(i, solo ? 'We lost you! Step back in' : 'Step back in!', 'warn'); }
  else pl.lostSince = null;
  const r = pl.counter.update(f);
  const c = pl.counter;
  if (CHALLENGES[S.kind].sport) return playSport(pl, r, f);
  if (CHALLENGES[S.kind].workout) return playWorkout(pl, r, f);
  if (r.rep) {
    pl.score = c.score;
    setCount(i, scoreText(S.kind, pl.score));
    if (S.kind === 'targets') { sfx.smash(); pop(r.combo >= 3 ? `x${r.combo}!` : 'SMASH!', r.hit); }
    else if (S.kind === 'keeper') { sfx.save(); pop(r.streak >= 3 ? `${r.streak} IN A ROW!` : 'SAVE!', r.save); if (solo && pl.score % 5 === 0) say(`${pl.score} saves`); }
    else if (S.kind === 'avocado') { /* each cut pops its own points below */ }
    else if (S.kind === 'derby') {
      const h = r.hit, sl = c.silos[h.silo];
      sfx.crack(h.power); pop(h.row === 0 ? 'CRACK!' : 'POP!', h.from);
      setTimeout(() => { if (!S || S.kind !== 'derby') return; (pl.lit ||= {})[h.silo] = performance.now(); sfx.drop(h.pts); pop(`+${h.pts}`, sl); if (h.pts >= 100) flashCam(); }, 760);
      if (solo && h.pts >= 100) say('Corner pocket!');
    }
    else { sfx.rep(); pop(S.kind === 'dribble' ? 'BOUNCE!' : r.say && r.say !== 'Nice!' ? r.say.toUpperCase() : 'REP!', null, i); }
    // the voice counts for one player (two at once would talk over each other)
    if (solo && (S.kind === 'squat' || S.kind === 'pushup')) say(String(pl.score));
    else if (solo && S.kind === 'dribble' && pl.score % 10 === 0) say(String(pl.score));
    if (S.kind === 'squat' || S.kind === 'pushup') worldPulse(pl.score % 10 === 0 ? 'big' : 'rep', i);
  }
  if (r.miss) { sfx.miss(); pop('MISS', r.miss); }
  if (S.kind === 'keeper') {
    if (r.shot) sfx.kick();
    if (r.goal) { sfx.goal(); pop('GOAL!', r.goal); flashCam(); setCount(i, String(c.score)); }
  }
  if (S.kind === 'derby') {
    if (r.pitch) sfx.pitch();
    if (r.strike) { sfx.strike(); pop('STRIKE!', pl.lastBallAt); }
    if (r.foul) { sfx.miss(); pop('FOUL!', r.foul); }
    if (r.grounder) { sfx.thud(); pop('GROUNDER', r.grounder); }
    const bl = c.ball(t); if (bl) pl.lastBallAt = { x: bl.x, y: bl.y };
  }
  if (S.kind === 'avocado') {
    for (const e of r.events || []) {
      if (e.cut) { sfx.slice(e.cut.n); pop(e.cut.guac ? `+${e.cut.pts} GUAC!` : `+${e.cut.pts}`, e.cut); }
      if (e.spicy) { sfx.spicy(); pop('🌶️ −25', e.spicy); flashCam(); }
      if (e.drop) sfx.thud();
    }
    if (c.score !== pl.score) { pl.score = c.score; setCount(i, String(pl.score)); }
  }
  if (S.kind === 'wallsit') { const sc = c.score; if (sc !== pl.score) { pl.score = sc; setCount(i, scoreText('wallsit', sc)); if (solo && sc && sc % 10 === 0) say(`${sc} seconds`); if (sc && sc % 10 === 0) worldPulse(sc % 30 === 0 ? 'big' : 'rep', i); } }
  if (r.say && !(pl.lostSince && t - pl.lostSince > 1500)) coach(i, r.say, r.rep ? 'ok' : '');
  if (r.meter != null) meterOf(i).querySelector('i').style.height = Math.round(r.meter * 100) + '%';
  if (r.done) {
    pl.done = true;
    if (!solo) { coach(i, `Done: ${scoreText(S.kind, c.score)}`, 'ok'); sfx.whistle(); }
  }
}
const meterOf = (i) => $(S && S.two && !i ? 'meterL' : 'meterR');
// The workout's score bar (between the score and the clock): the move, how far through, a dot a move.
function paintWk(c) {
  const key = c.phase + c.station;
  if (!S || S.wkKey === key) return;
  S.wkKey = key;
  const mv = c.move, n = WORKOUT.plan.length;
  $('wkName').textContent = (c.phase === 'done' ? 'Done!' : mv.short).toUpperCase();
  $('wkSub').textContent = c.phase === 'work' ? `${c.station + 1} of ${n} · ${mv.works}` : c.phase === 'done' ? `${n} moves` : `${c.station ? 'up next' : 'up first'} · ${mv.works}`;
  $('wkBar').hidden = c.phase !== 'work';      // a rest's card shows what's next (and takes the corner box's place too)
  $('cam').classList.toggle('resting', c.phase === 'rest');
  $('wkDots').innerHTML = WORKOUT.plan.map((_, i) => `<i class="${i < c.station || c.phase === 'done' ? 'on' : i === c.station ? 'now' : ''}"></i>`).join('');
  lay.at = 0;
}
// The workout's sounds, pops, voice and coach line. The whistle and the move names are called once (from
// the left player's clock: both run the same one).
function playWorkout(pl, r, f) {
  const i = pl.i, solo = !S.two, c = pl.counter, lead = i === 0;
  if (r.start && lead) { sfx.go(); say(r.start.name); paintWk(c); worldPulse('move', i); }
  if (r.rest && lead) {
    if (c.station > 0) { sfx.whistle(); say(`Rest. Next up: ${r.next.name}`); } else say(`First up: ${r.next.name}`);
    paintWk(c);
    // the tour: a new place for every move, there by the end of the rest
    if (prefs.place === 'tour' && S.kind === 'workout') {
      const p = TOUR[c.station % TOUR.length];
      if (p !== S.tourPlace) { S.tourPlace = p; if (worldLive()) { W3.world.place(p); pop(`${PLACES[p].emoji} ${PLACES[p].name.toUpperCase()}`); } }
    }
  }
  if (r.rep || r.hit) worldPulse(c.score && c.score % 10 === 0 ? 'big' : 'rep', i);
  if (r.cue) { sfx.beep(); if (solo) say(r.say); }
  // the reaction drill's pops go low, under the next arrow
  const [a, z] = sideRange(i), low = { x: mirrored() ? 1 - (a + z) / 2 : (a + z) / 2, y: 0.72 };
  if (r.hit) { sfx.smash(); pop(`${(r.hit.ms / 1000).toFixed(2)} s`, low); }
  if (r.miss) { sfx.miss(); pop(r.miss.wrong ? 'WRONG WAY' : 'TOO SLOW', low); }
  if (r.rep && !r.hit) {
    sfx.rep();
    const k = c.key, n = c.reps[c.station], counted = k === 'crunch' || k === 'cross' || k === 'squat' || k === 'burpee';
    if (counted) pop(r.say && r.say !== 'Nice!' ? r.say.toUpperCase() : 'REP!', null, i);
    if (solo && (counted || n % 10 === 0)) say(String(n));
  }
  if (c.score !== pl.score) { pl.score = c.score; setCount(i, String(pl.score)); }
  const line = c.phase === 'rest' ? (c.station ? (solo ? 'Catch your breath' : 'Rest up') : 'Get ready!') : r.say;
  if (line && !(pl.lostSince && f.t - pl.lostSince > 1500)) coach(i, line, r.rep ? 'ok' : '');
  if (r.meter != null) meterOf(i).querySelector('i').style.height = Math.round(r.meter * 100) + '%';
  if (r.done) { pl.done = true; if (!solo) coach(i, `Done: ${c.score} reps`, 'ok'); }
}
// The sports games' sounds, pops and voice.
function playSport(pl, r, f) {
  const i = pl.i, solo = !S.two, c = pl.counter, t = f.t;
  const cheer = () => { sfx.cheer(); pl.cheerAt = t; };
  if (S.kind === 'bowling') {
    if (r.roll) { sfx.roll(); pl.crashed = false; }
    if (c.phase === 'rolling' && !pl.crashed && c.pins.some((p) => p.down)) { pl.crashed = true; sfx.pins(c.pins.filter((p) => p.down).length); }
    if (r.rolled) {
      const m = r.rolled.mark;
      if (m === 'strike') { cheer(); flashCam(); pop('STRIKE!', null, i); if (solo) say('Strike!'); }
      else if (m === 'spare') { cheer(); pop('SPARE!', null, i); if (solo) say('Spare!'); }
      else if (m === 'gutter') { sfx.miss(); pop('GUTTER!', null, i); }
      else pop(String(r.rolled.down), null, i);
    }
  } else if (S.kind === 'qb') {
    if (r.huddle) sfx.beep();
    if (r.threw) sfx.whoosh();
    if (r.caught) { cheer(); pop(r.caught.td ? 'TOUCHDOWN!' : `+${r.caught.yards} YDS`, null, i); if (r.caught.td) { flashCam(); if (solo) say('Touchdown!'); } }
    if (r.incomplete) { sfx.thud(); pop('INCOMPLETE', null, i); }
    if (r.picked) { sfx.miss(); pop('PICKED OFF!', null, i); }
    if (r.sacked) { sfx.thud(); pop('SACKED!', null, i); }
  } else if (S.kind === 'hoops') {
    if (r.shot) sfx.whoosh();
    if (r.made) { r.made.kind === 'swish' ? sfx.swish() : sfx.clank(); setTimeout(() => sfx.swish(), 120); if (c.streak >= 3) cheer(); pop(c.streak >= 3 ? 'ON FIRE!' : r.made.kind === 'swish' ? 'SWISH!' : 'IN!', null, i); }
    if (r.miss) { sfx.clank(); pop(r.miss.kind === 'short' ? 'SHORT' : r.miss.kind === 'long' ? 'LONG' : r.miss.kind === 'wide' ? 'WIDE' : 'RIMMED OUT', null, i); }
  } else if (S.kind === 'sendit') {
    if (c.phase === 'push' && c.pumps !== pl.pumps) { pl.pumps = c.pumps; sfx.whoosh(); }
    if (r.launched) { sfx.cheer(); pop('SEND IT!', null, i); if (solo) say('Send it!'); }
    if (r.updraft) tone(300, 0, 0.5, 'triangle', 0.06, 900);
    if (r.downdraft) tone(700, 0, 0.5, 'sawtooth', 0.04, 160);
    if (r.splash) { sfx.thud(); tone(180, 0, 0.6, 'sawtooth', 0.05, 50); pop(`SPLASH! ${c.score} FT`, null, i); flashCam(); if (solo) say(`${c.score} feet!`); }
  } else if (S.kind === 'tennis') {
    if (r.pitch) sfx.pok();
    if (r.hit) { sfx.pok(); if (r.hit.winner) { cheer(); flashCam(); } pop(r.hit.winner ? 'WINNER!' : c.rally >= 5 ? `${c.rally} RALLY!` : 'NICE!', null, i); }
    if (r.net) { sfx.thud(); pop('NET!', null, i); }
    if (r.miss) { sfx.miss(); pop('MISSED', null, i); }
  }
  if (c.score !== pl.score) { pl.score = c.score; setCount(i, String(pl.score)); }
  if (r.say && !(pl.lostSince && t - pl.lostSince > 1500)) coach(i, r.say, r.rep ? 'ok' : '');
  if (r.done) { pl.done = true; if (!solo) { coach(i, `Done: ${scoreText(S.kind, c.score)}`, 'ok'); sfx.whistle(); } }
}

/* ---------- where things go on screen ---------- */
// The part of the picture a player's targets, shots and silos can use: their side of it, under the top
// bar, above the coach line, clear of the score boxes and the clock. Each box in the way is cut around
// from below or from the side, whichever leaves more room (on a phone held sideways, the side).
// Screen fractions across the picture (0 left, 1 right, as it shows) and down it.
function freeArea(side) {
  const b = box(), cam = $('cam').getBoundingClientRect();
  const fx = (px) => (px - cam.left - b.ox) / b.dw, fy = (py) => (py - cam.top - b.oy) / b.dh;
  const [a, z] = sideRange(side);
  const bar = $('backBtn').getBoundingClientRect();
  const coaches = [...document.querySelectorAll('.coach')].filter((el) => !el.hidden).map((el) => el.getBoundingClientRect().top);
  const coachTop = coaches.length ? Math.min(...coaches) : cam.bottom - 70;
  let A = { x0: a, x1: z, y0: Math.max(0, fy(bar.bottom + 8)), y1: Math.min(1, fy(coachTop - 10)) };
  const area = (q) => Math.max(0, q.x1 - q.x0) * b.dw * Math.max(0, q.y1 - q.y0) * b.dh;
  const boxes = [...document.querySelectorAll('#hud .count, #hud .clock')].filter((el) => !el.hidden && el.offsetParent !== null);
  if (sceneOn()) boxes.push($('pip'));
  for (const el of boxes) {
    const r = el.getBoundingClientRect();
    const R = { x0: fx(r.left - 8), x1: fx(r.right + 8), y0: fy(r.top - 8), y1: fy(r.bottom + 10) };
    if (R.x1 <= A.x0 || R.x0 >= A.x1 || R.y1 <= A.y0 || R.y0 >= A.y1) continue;     // not in the way
    const high = (R.y0 + R.y1) / 2 < (A.y0 + A.y1) / 2;
    const vert = high ? { ...A, y0: Math.max(A.y0, R.y1) } : { ...A, y1: Math.min(A.y1, R.y0) };
    const beside = (R.x0 + R.x1) / 2 < (A.x0 + A.x1) / 2 ? { ...A, x0: Math.max(A.x0, R.x1) } : { ...A, x1: Math.min(A.x1, R.x0) };
    A = area(beside) > area(vert) ? beside : vert;
  }
  return A;
}
// Where targets (and shots) may go: inside the free area with the whole ring on screen, and in reach
// (above yMax of the picture), as the counters want them (picture x).
function targetBounds(r = 0.075, yMax = 0.68, side = 0) {
  const b = box(), A = freeArea(side);
  const mx = Math.min(0.2, (r * 1.05 * b.dh + 14) / b.dw);   // the whole ring stays on screen
  let x0 = A.x0 + mx, x1 = A.x1 - mx;
  if (x1 - x0 < 0.12) { const m = (A.x0 + A.x1) / 2; x0 = m - 0.06; x1 = m + 0.06; }
  const y0 = Math.max(0.08, A.y0 + r), y1 = Math.min(yMax, A.y1 - r);
  const Y0 = Math.min(y0, 0.4);
  return toPic({ x0, x1, y0: Y0, y1: Math.max(y1, Y0 + 0.15) });
}
// Avocado Chop: thrown up across the middle of the picture, or across each player's half.
function avoBounds(side) {
  if (!S.two) return { x0: 0.18, x1: 0.82 };
  const b = box(), [a, z] = sideRange(side), m = Math.max(0.05, (0.062 * b.dh) / b.dw + 0.03);
  return toPic({ x0: a + m, x1: z - m });
}
// Silo Derby's silos, kept above the player and clear of the score and the clock: the back row (100,
// 50, 100) in the gap between those two at the top of the picture (each player's own gap, for two),
// the front row (10 to 30) just under them, or in the gap too when it's wide (a phone held sideways).
function derbyLayout(side = 0) {
  const b = box(), cam = $('cam').getBoundingClientRect();
  const y = (p) => (p - cam.top - b.oy) / b.dh, sx = (p) => (p - cam.left - b.ox) / b.dw, px = (v) => (mirrored() ? 1 - v : v);
  const [a, z] = sideRange(side), mid0 = (a + z) / 2;
  // the gap at the top of this side: from the box on its left to the box on its right (a score box
  // grows to four digits, so it's given 124 px)
  let gl = cam.left + b.ox + a * b.dw, gr = cam.left + b.ox + z * b.dw, hudBottom = cam.top;
  for (const el of document.querySelectorAll('#hud .count, #hud .clock')) {
    if (el.hidden || el.offsetParent === null) continue;
    const r = el.getBoundingClientRect();
    const L = el.id === 'countBox1' ? r.right - Math.max(r.width, 124) : r.left;      // the right score box grows leftward
    const R = el.id === 'countBox0' ? r.left + Math.max(r.width, 124) : r.right;
    if (sx(R) <= a || sx(L) >= z) continue;                                          // over the other player's half
    hudBottom = Math.max(hudBottom, r.bottom);
    if (sx((L + R) / 2) <= mid0) gl = Math.max(gl, R + 6); else gr = Math.min(gr, L - 6);
  }
  const gapPx = gr - gl - 12, hudY = y(hudBottom + 8);
  const spacing = 0.19 * (z - a);                                       // front row lanes, as picture fractions
  let rf = Math.min(0.042, (spacing * b.dw * 0.85) / 1.5 / b.dh);
  let rb = Math.min(0.05, gapPx / 3.6 / 1.5 / b.dh);
  let back, front;
  if (rb >= (S.two ? 0.03 : 0.036)) {
    const half = (rb * 1.5 * b.dh) / 2 / b.dw, top = Math.max(0.005, y(cam.top + 4)) + rb * 1.6;
    const gL = sx(gl) + half, gR = sx(gr) - half, mid = (gL + gR) / 2, spread = Math.max(0, (gR - gL) / 2);
    back = (lane) => ({ x: px(mid + lane * spread), y: top, r: rb });
    // a wide gap fits the front row too, just under the back row; else it goes under the score
    const fs = Math.min(spacing, (gR - gL) / 4.4), fr = Math.min(rf, (fs * b.dw * 0.85) / 1.5 / b.dh);
    if (fr >= 0.032 && top + rb * 3.4 + fr * 1.6 < hudY + rf * 1.6) front = (lane) => ({ x: px(mid + lane * fs), y: top + rb * 3.4, r: fr });
    else { const fy = Math.max(hudY, top + rb * 3.4) + rf * 1.6; front = (lane) => ({ x: px(mid0 + lane * spacing), y: fy, r: rf }); }
  } else {
    // no room up there (a narrow phone): both rows under the score and the clock
    rb = Math.min(0.045, ((z - a) * 0.3 * b.dw * 0.8) / 1.5 / b.dh);
    const top = hudY + rb * 1.6;
    back = (lane) => ({ x: px(mid0 + lane * 0.3 * (z - a)), y: top, r: rb });
    const fy = top + rb * 1.8 + rf * 1.6;
    front = (lane) => ({ x: px(mid0 + lane * spacing), y: fy, r: rf });
  }
  return SILOS.map(({ row, lane }) => (row ? front(lane) : back(lane)));
}
function countdown() {
  S.phase = 'count';
  for (const pl of S.players) coach(pl.i, 'Get ready!', 'ok');
  const steps = ['3', '2', '1', 'GO!'];
  steps.forEach((n, i) => setTimeout(() => {
    if (!S || S.phase !== 'count') return;
    $('countdown').innerHTML = `<b>${n}</b>`;
    if (i < 3) { sfx.beep(); say(n); } else { sfx.go(); say('Go!'); }
    if (i === 3) setTimeout(go, 500);
  }, i * 900));
}
// Send It!: the contraption you picked (the other player gets the next one along).
const craftFor = (side) => { const i = Math.max(0, CRAFTS.findIndex((c) => c.id === prefs.craft)); return CRAFTS[(i + (side || 0)) % CRAFTS.length].id; };
function makeCounter(kind, C, side) {
  if (C.sport) return COUNTERS[kind]({ mirror: mirrored(), range: sideRange(side), frames: C.frames, seed: S.seed, craft: craftFor(side) });
  if (kind === 'wallsit') return COUNTERS.wallsit(C.secs);
  if (kind === 'workout') return COUNTERS.workout({ seed: S.seed, mirror: mirrored() });
  if (kind === 'targets') return COUNTERS.targets({ bounds: targetBounds(0.075, 0.68, side) });
  if (kind === 'keeper') return COUNTERS.keeper({ bounds: targetBounds(0.075, 0.9, side) });
  if (kind === 'derby') return COUNTERS.derby({ bounds: targetBounds(0.06, 0.9, side), layout: derbyLayout(side) });
  if (kind === 'avocado') return COUNTERS.avocado({ bounds: avoBounds(side) });
  return COUNTERS[kind]();
}
function go() {
  if (!S || S.phase !== 'count') return;
  const C = CHALLENGES[S.kind], two = S.two;
  $('countdown').innerHTML = '';
  S.phase = 'live'; S.startAt = performance.now(); lay.at = 0;
  $('stage').classList.add('live');
  // the score boxes: yours alone, or one each side of the clock with the names (bowling keeps its
  // own scoresheet in the scene instead)
  $('hud').hidden = !!C.frames;
  $('countBox1').hidden = !two;
  for (const pl of S.players) {
    const bx = $('countBox' + pl.i);
    bx.classList.toggle('p', two);
    bx.style.setProperty('--pc', pl.color);
    $('countUnit' + pl.i).textContent = two ? pl.name : S.kind === 'wallsit' ? 'held' : C.units;
  }
  const metered = S.kind === 'squat' || S.kind === 'pushup' || S.kind === 'wallsit' || S.kind === 'workout';
  $('wkBar').hidden = !C.workout; S.wkKey = null;
  $('meterR').hidden = !metered; $('meterL').hidden = !(metered && two);
  for (const m of ['meterL', 'meterR']) $(m).querySelector('i').style.height = '0';
  for (const pl of S.players) {
    pl.counter = makeCounter(S.kind, C, pl.i);
    pl.score = 0; pl.done = false; pl.trails = null; pl.batPath = null; pl.lit = null; pl.goalSaid = false; pl.tgShown = new Map();
    setCount(pl.i, scoreText(S.kind, 0));
  }
  $('clock').textContent = C.workout ? String(WORKOUT.ready) : C.frames ? `1/${C.frames}` : C.untimed ? '30' : S.kind === 'wallsit' && !two ? fmt(C.goal) : S.kind === 'wallsit' ? '0:00' : fmt(C.secs);
  $('clockBox').classList.remove('low');
  $('clockLbl').textContent = C.workout ? 'get ready' : C.frames ? 'frame' : C.untimed ? 'feet up' : S.kind === 'wallsit' ? (two ? 'time' : 'to the goal') : 'left';
  for (const pl of S.players) coach(pl.i, 'GO!', 'ok');
  clearInterval(ticker);
  ticker = setInterval(() => {
    if (!S || S.phase !== 'live') return clearInterval(ticker);
    const el = (performance.now() - S.startAt) / 1000;
    if (C.workout) {
      // the circuit keeps its own clock: this move's seconds (or the rest's), beeps for the last three
      const c = S.players[0].counter, left = c.left;
      $('clock').textContent = String(Math.max(0, Math.ceil(left)));
      $('clockLbl').textContent = c.phase === 'work' ? 'left' : c.phase === 'done' ? 'done' : c.station === 0 ? 'get ready' : 'rest';
      $('clockBox').classList.toggle('low', c.phase === 'work' && left <= 3);
      if (c.phase !== 'done' && left <= 3.05 && left > 0 && Math.ceil(left) !== S.lastTick) { S.lastTick = Math.ceil(left); sfx.beep(); }
      paintWk(c);
      if (el > C.secs + 20) finish();
      return;
    }
    if (C.untimed) {
      // Send It! flies until the splash: the clock box shows how high you are (the lower of two)
      const up = Math.min(...S.players.filter((pl) => !pl.done).map((pl) => pl.counter.alt));
      $('clock').textContent = String(Math.round(Number.isFinite(up) ? up : 0));
      $('clockBox').classList.toggle('low', Number.isFinite(up) && up < 10);
      if (el > 300) finish();
      return;
    }
    if (C.frames) {
      // bowling runs frame by frame, not on the clock (ten minutes is the most a game can take)
      const fr = Math.min(...S.players.map((pl) => (pl.counter.next.done ? C.frames : pl.counter.next.frame)));
      $('clock').textContent = `${fr}/${C.frames}`;
      if (el > 600) finish();
      return;
    }
    if (S.kind === 'wallsit') {
      for (const pl of S.players) {
        const held = pl.counter.score;
        if (held >= C.goal && !pl.goalSaid) { pl.goalSaid = true; sfx.go(); pop('GOAL!', null, pl.i); }
      }
      if (!two) {
        // the wall sit's own clock is the held time (big, on the left); this one counts down to the goal
        const held = S.players[0].counter.score;
        $('clock').textContent = held >= C.goal ? 'GOAL!' : fmt(C.goal - held);
        $('clockLbl').textContent = held >= C.goal ? `max ${fmt(C.secs)}` : 'to the goal';
      } else $('clock').textContent = fmt(el);
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
const scoreLine = (kind, n, C) => (kind === 'wallsit' ? `${fmt(n)} held` : `${n} ${n === 1 ? C.unit : C.units}`);
// The phone owner's best and pay, from their own score (in a head-to-head, their side's).
function keepBest(kind, score) {
  const b = bests(), prev = b[kind], newBest = score >= MIN_TO_PAY[kind] && (prev == null || score > prev);
  if (newBest) { b[kind] = score; store.set(bestKey(), b); }
  return { prev, newBest };
}
async function payOwner(kind, score, beat, newBest, who = '') {
  const line = $('paidLine'), C = CHALLENGES[kind];
  if (!me()) { line.innerHTML = '<a href="/#profile" style="color:inherit">Make your Capra Lab profile</a> to get paid for every challenge.'; return; }
  if (score < MIN_TO_PAY[kind]) { line.textContent = `${who}Do at least ${scoreText(kind, MIN_TO_PAY[kind])} ${kind === 'wallsit' ? 'held' : C.units} to get paid.`; line.style.color = 'rgba(255,248,236,.7)'; return; }
  if (!window.CapraWallet) return;
  const day = dayKey(), paid = { amber: 0, shards: 0 };
  const add = (r) => { if (r && r.paid) for (const k of Object.keys(r.paid)) paid[k] = (paid[k] || 0) + r.paid[k]; };
  add(await CapraWallet.earn('irl', 'set', `${kind}-${day}-${Date.now()}`));
  if (beat) add(await CapraWallet.earn('irl', 'goal', `goal-${kind}-${day}`));
  if (newBest) add(await CapraWallet.earn('irl', 'best', `best-${kind}-${score}`));
  const bits = [];
  if (paid.amber) bits.push(`+${paid.amber} amber`);
  if (paid.shards) bits.push(`+${paid.shards} shard${paid.shards === 1 ? '' : 's'}`);
  line.textContent = bits.length ? `${who}Paid into your wallet: ${bits.join(', ')}` : 'You’ve hit today’s IRL pay limit. Come back tomorrow for more.';
}
function shareCard(text) {
  if (!window.CapraShare) return;
  $('resShare').innerHTML = '<lab-text-share></lab-text-share>';
  $('resShare').firstChild.set({ emoji: '💪', title: 'IRL', text, url: `${location.origin}/irl/` });
}
async function finish() {
  if (!S || S.phase === 'done') return;
  const kind = S.kind, C = CHALLENGES[kind], scores = S.players.map((pl) => (pl.counter ? pl.counter.score : 0));
  S.phase = 'done';
  $('stage').classList.remove('live');
  clearInterval(ticker); cancelAnimationFrame(raf);
  sfx.whistle();
  stopCamera(); keepAwake(false);
  if (S.two) return finishTwo(kind, C, scores);
  const score = scores[0], c = S.players[0].counter;
  say(kind === 'wallsit' ? `Time! ${score} seconds` : `Time! ${score}`);
  const { prev, newBest } = keepBest(kind, score), beat = score >= C.goal;
  // the card first, the pay as it comes back
  $('resCard').innerHTML = `<p class="kick">${C.emoji} ${esc(C.name)}${playedFor(kind)}</p>
    <p class="big">${esc(scoreText(kind, score))}<small>${kind === 'wallsit' ? 'HELD' : esc((score === 1 ? C.unit : C.units).toUpperCase())}</small></p>
    ${newBest ? '<span class="burst gold">NEW PERSONAL BEST!</span>' : beat ? '<span class="burst">GOAL SMASHED!</span>' : ''}
    <p class="stats"><span>🎯 Goal ${esc(scoreText(kind, C.goal))}</span><span>🏆 Best ${prev == null && !newBest ? '–' : esc(scoreText(kind, Math.max(prev ?? 0, newBest ? score : 0)))}</span>${c ? statBits(kind, c) : ''}</p>
    <p class="paid" id="paidLine"></p>`;
  show('results');
  if (window.CapraShare) shareCard(CapraShare.text({ emoji: '💪', game: 'IRL', sub: C.name,
    lines: [`${kind === 'wallsit' ? `${fmt(score)} held` : kind === 'workout' ? `${score} ${score === 1 ? C.unit : C.units} · ${C.moves} moves` : kind === 'sendit' ? `${score} feet · ${flyTitle(score)}` : `${score} ${score === 1 ? C.unit : C.units} in ${C.frames ? `${C.frames} frames` : `${C.secs} s`}`}${newBest ? ' · new best' : ''}`, ...(kind === 'bowling' && c ? [bowlMarks(c)] : [])],
    grid: [kind === 'workout' && c ? workoutRow(c.reps, newBest) : shareRow(score, C.goal, newBest)] }));
  payOwner(kind, score, beat, newBest);
}
const playedFor = (kind) => { const C = CHALLENGES[kind]; return kind === 'wallsit' ? '' : C.workout ? ` · ${C.moves} moves` : C.frames ? ` · ${C.frames} frames` : C.untimed ? '' : ` · ${C.secs} seconds`; };
// a bowling game's marks, frame by frame: "X 7/ 9- X X9/"
const bowlMarks = (c) => c.card.frames.map((f) => f.marks.join('') || '·').join(' ');
function statBits(kind, c) {
  if (kind === 'workout') return WORKOUT.plan.map(([k], i) => `<span>${MOVES[k].emoji} ${esc(MOVES[k].short)} ${c.reps[i]}</span>`).join('') + (c.fastest != null ? `<span>⚡ Fastest reaction ${(c.fastest / 1000).toFixed(2)} s</span>` : '');
  if (kind === 'sendit') return `<span>🛫 ${esc(c.craft.name)}</span><span>🏅 ${esc(flyTitle(c.score))}</span><span>⬆️ ${c.ups} updrafts</span><span>⛰️ ${Math.round(c.state.maxY)} ft high</span><span>⏱️ ${c.state.flyT.toFixed(0)} s up</span>`;
  if (kind === 'bowling') return `<span>🎳 ${bowlMarks(c)}</span><span>Strikes ${c.strikes}</span><span>Spares ${c.spares}</span>`;
  if (kind === 'qb') return `<span>🏈 ${c.comps}/${c.atts} completions</span><span>🙌 ${c.tds} TD</span>${c.ints ? `<span>Picked ${c.ints}</span>` : ''}${c.sacks ? `<span>Sacked ${c.sacks}</span>` : ''}`;
  if (kind === 'hoops') return `<span>🏀 ${c.score}/${c.shots} made</span><span>💦 ${c.swishes} swishes</span><span>🔥 Best streak ${c.best}</span>`;
  if (kind === 'tennis') return `<span>🎾 ${c.returns} returns</span><span>⚡ ${c.winners} winners</span><span>Best rally ${c.best}</span>`;
  if (kind === 'targets') return `<span>💥 Best combo ${c.best}</span><span>Missed ${c.misses}</span>`;
  if (kind === 'keeper') return `<span>🥅 Let in ${c.goals}</span><span>🔥 Best streak ${c.best}</span>`;
  if (kind === 'derby') return `<span>⚾ ${c.hits} hits</span><span>🚀 ${c.homers} deep</span><span>🔥 Best streak ${c.best}</span><span>Strikes ${c.strikes}</span>`;
  if (kind === 'avocado') return `<span>🔪 ${c.cuts} cuts</span><span>🥑 Most on one ${c.most}</span>${c.spicy ? `<span>🌶️ ${c.spicy}</span>` : ''}<span>Dropped ${c.dropped}</span>`;
  return '';
}
// Two players: both scores side by side, the winner crowned; the phone's owner is paid for their side.
function finishTwo(kind, C, scores) {
  const names = S.players.map((pl) => pl.name), w = winnerOf(scores), own = ownerSide();
  say(w < 0 ? 'Time! It’s a tie!' : `Time! ${names[w]} wins!`);
  const mine = own >= 0 ? scores[own] : null;
  const { newBest } = mine != null ? keepBest(kind, mine) : { newBest: false };
  const unitOf = (n) => (kind === 'wallsit' ? 'HELD' : (n === 1 ? C.unit : C.units).toUpperCase());
  $('resCard').innerHTML = `<p class="kick">${C.emoji} ${esc(C.name)} · head to head${playedFor(kind)}</p>
    <div class="vs">${S.players.map((pl) => `<div class="side${w === pl.i ? ' win' : ''}" style="--pc:${pl.color}"><span class="nm">${w === pl.i ? '👑 ' : ''}${esc(pl.name)}${own === pl.i ? ' <i>YOU</i>' : ''}</span>
      <b>${esc(scoreText(kind, scores[pl.i]))}</b><small>${esc(unitOf(scores[pl.i]))}</small>${pl.counter ? `<p class="stats">${statBits(kind, pl.counter)}</p>` : ''}</div>`).join('<span class="vsx" aria-hidden="true">VS</span>')}</div>
    ${w < 0 ? '<span class="burst">DEAD HEAT!</span>' : `<span class="burst gold">${esc(names[w].toUpperCase())} WINS!</span>`}
    ${newBest ? '<p class="paid" style="color:var(--yellow)">New personal best for you!</p>' : ''}
    <p class="stats"><span>🎯 Goal ${esc(scoreText(kind, C.goal))}</span></p>
    <p class="paid" id="paidLine"></p>`;
  show('results');
  const order = w === 1 ? [1, 0] : [0, 1];
  if (window.CapraShare) shareCard(CapraShare.text({ emoji: '💪', game: 'IRL', sub: `${C.name} · head to head`,
    lines: order.map((i) => `${i === w ? '👑 ' : ''}${names[i]} ${scoreLine(kind, scores[i], C)}`),
    grid: order.map((i) => (kind === 'workout' && S.players[i].counter ? workoutRow(S.players[i].counter.reps) : shareRow(scores[i], C.goal, false))) }));
  if (own >= 0) payOwner(kind, mine, mine >= C.goal, newBest, `${names[own]}: `);
  else payOwner(kind, 0, false, false);
}
function leave() {
  if (S && S.phase === 'live') return finish();
  S = null; clearInterval(ticker); cancelAnimationFrame(raf); stopCamera(); keepAwake(false);
  renderHome(); show('home');
}
$('backBtn').onclick = leave;
$('flipBtn').onclick = () => { if (S) openCams(); };
$('homeBtn').onclick = () => { S = null; renderHome(); show('home'); };
$('againBtn').onclick = () => { const k = S ? S.kind : 'squat'; openChallenge(k); };
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !LOOK.sure) loadMyLook();
  if (!S || FAKE) return;
  if (document.visibilityState === 'hidden') { if (S.phase === 'live') finish(); else if (S.phase !== 'done') stopCamera(); }
  else if (S.phase === 'setup' || S.phase === 'wait') startCamera().catch(cameraTrouble);
});
// Turning the phone: before the go, a fresh camera picture the new shape (wide when sideways); the
// overlay redraws to fit either way.
let turnT = 0;
addEventListener('resize', () => {
  clearTimeout(turnT);
  turnT = setTimeout(() => {
    lay.at = 0;
    if (!S || S.phase === 'done') return;
    draw(S.frames);
    const land = innerWidth > innerHeight;
    if (!FAKE && stream && camLand != null && land !== camLand && (S.phase === 'setup' || S.phase === 'wait')) startCamera().catch(cameraTrouble);
  }, 350);
});

// tests drive the page with made-up bodies
window.__irl = { feed: (f) => handle({ aspect: box().aspect, ...f, t: f.t ?? performance.now() }), state: () => S, open: openChallenge, finish, cams,
  perf: () => ({ level: perfLevel(), saved: { ...PERF }, gov: { ...gov }, trk: { ...trk }, dpr: dprNow(), tracker: landmarker }),
  world: () => ({ fits: worldFits(), live: worldLive(), failed: W3.failed, place: placeNow(), ...(W3.world ? W3.world.debug() : {}) }),
  pulse: (kind, i = 0) => worldPulse(kind, i) };

renderHome();
loadMyLook();
if (/^#(squat|pushup|wallsit|targets|dribble|keeper|avocado|derby|bowling|qb|hoops|tennis|sendit|workout)$/.test(location.hash)) openChallenge(location.hash.slice(1));
