/* Studio: the page. Home (your songs and recordings), the studio (the universe on the camera, the
   band, your voice, the beat bar and the chorus countdown, recording), and the sheets that pick the
   song, the voice and the look. A free playground: no score, no pay; what you keep is the songs you
   save (localStorage, per lab player) and the recordings you capture (IndexedDB, on this phone). */
import { GENRES, GENRE_ORDER, INSTRUMENTS, BEATS, defaultSong, songInfo, songName, hookOf, hookNames, keyName, noteName, flatKey, formOf, formBars, midiName, parseChord, guitarVoicing } from './music.mjs';
import { Band } from './band.js';
import { Voice, TUNES, CHARS, HARMONIES } from './voice.js';
import { createMoves } from './moves.mjs';
import { createUniverse, UNIVERSES, STYLES, chordColor } from './aura.js';

const $ = (s) => document.querySelector(s);
const FAKE = !!window.__studioFake || /[?&]fake\b/.test(location.search);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
const myHandle = () => { const p = store.get('capra-lab.profile', null); return (p && p.handle) || 'guest'; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtTime = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

/* ---------- settings ---------- */
const DEF = {
  voice: { tune: 'hard', harmony: 0, char: 'natural', space: true, echo: false, radio: false, volume: 1, phones: false, monitor: true },
  look: { universe: 'glow', style: 'glow', bg: 'space', chordColors: true, trails: true, moveSounds: true, camera: 'front', recMode: 'video' },
};
const saved = store.get('studio.prefs', {});
const prefs = {
  song: { ...defaultSong(saved.song && GENRES[saved.song.genre] ? saved.song.genre : 'pop'), ...(saved.song || {}) },
  voice: { ...DEF.voice, ...(saved.voice || {}) },
  look: { ...DEF.look, ...(saved.look || {}) },
  seen: !!saved.seen,
};
if (!GENRES[prefs.song.genre]) prefs.song = defaultSong('pop');
prefs.look.universe = { nebula: 'glow', deep: 'starlight' }[prefs.look.universe] || prefs.look.universe;
if (!UNIVERSES[prefs.look.universe]) prefs.look.universe = 'glow';
if (!STYLES[prefs.look.style]) prefs.look.style = 'glow';
let saveT = 0;
const savePrefs = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set('studio.prefs', prefs), 250); };

/* ---------- the universe ---------- */
const sky = $('#sky'), video = $('#cam');
const universe = createUniverse(sky);
let quality = 0, slowFrames = 0, fastFrames = 0;
function fit() {
  if (!universe) return;
  const dpr = Math.min(window.devicePixelRatio || 1, quality >= 1 ? 1.1 : 1.5) * (quality >= 2 ? 0.75 : 1);
  universe.resize(sky.clientWidth * dpr, sky.clientHeight * dpr);
}
window.addEventListener('resize', fit);
if (universe) { fit(); universe.quality(0); }

/* ---------- audio ---------- */
let A = null;
function setSession(mic) { try { if (navigator.audioSession) navigator.audioSession.type = mic ? 'play-and-record' : 'playback'; } catch { /* not this browser */ } }
function audioUp() {
  if (A) { if (A.ctx.state !== 'running') A.ctx.resume().catch(() => {}); return A; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  setSession(false);
  const ctx = new AC({ latencyHint: 'interactive' });
  const limiter = () => { const c = ctx.createDynamicsCompressor(); c.threshold.value = -5; c.knee.value = 5; c.ratio.value = 12; c.attack.value = 0.002; c.release.value = 0.16; return c; };
  const speakers = ctx.createGain(), lim = limiter(); speakers.connect(lim); lim.connect(ctx.destination);
  const rec = ctx.createGain(), recLim = limiter(); rec.connect(recLim);
  let recDest = null;
  try { recDest = ctx.createMediaStreamDestination(); recLim.connect(recDest); } catch { /* no recording here */ }
  const bandOut = ctx.createGain(); bandOut.gain.value = 0.9; bandOut.connect(speakers);
  const recDelay = ctx.createDelay(1); recDelay.delayTime.value = 0.06; bandOut.connect(recDelay); recDelay.connect(rec);
  const voiceOut = ctx.createGain(), monitor = ctx.createGain(); voiceOut.connect(monitor); monitor.connect(speakers); voiceOut.connect(rec);
  const band = new Band(ctx, bandOut, speakers), voice = new Voice(ctx, voiceOut);
  band.setSong(prefs.song);
  band.on('end', onSongEnd);
  voice.set(prefs.voice); voice.setTempo(prefs.song.bpm);
  voice.load().then(() => estimateLatency());
  try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(); } catch { /* fine */ }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  A = { ctx, speakers, rec, recDest, bandOut, recDelay, voiceOut, monitor, band, voice };
  applyMonitor();
  return A;
}
const outLatency = () => (A ? (A.ctx.outputLatency || 0) + (A.ctx.baseLatency || 0) : 0);
function applyMonitor() {
  if (!A) return;
  const v = prefs.voice, g = v.monitor ? (v.phones ? 1 : 0.55) : 0;
  A.monitor.gain.setTargetAtTime(g, A.ctx.currentTime, 0.03);
}
// the band reaches the recording late by what the singer's voice takes to come back in
function estimateLatency() {
  if (!A) return;
  const tr = A.voice.stream && A.voice.stream.getAudioTracks()[0], st = tr && tr.getSettings ? tr.getSettings() : {};
  const inp = typeof st.latency === 'number' ? st.latency : 0.012;
  const tune = A.voice.node && !(prefs.voice.tune === 'off' && prefs.voice.char === 'natural' && !+prefs.voice.harmony) ? 0.03 : 0;
  A.recDelay.delayTime.setTargetAtTime(clamp(outLatency() + inp + tune + 0.005, 0.02, 0.35), A.ctx.currentTime, 0.02);
}

/* ---------- screens ---------- */
let screen = 'home';
function show(name) {
  screen = name;
  $('#home').hidden = name !== 'home';
  $('#studio').hidden = name !== 'studio';
  closeSheets();
  if (name === 'home') renderHome();
}

/* ---------- camera, mic and the tracker ---------- */
let camStream = null, micOn = false, camDenied = false;
const tcv = document.createElement('canvas'), tctx = tcv.getContext('2d', { willReadFrequently: false });
let tracker = null, trackerLoad = null, trackerFail = false, trackErrs = 0, lastVidT = -1, lastTs = 0, trackMs = 0, lastTrackAt = 0, maskU8 = null, maskW = 0, maskH = 0;
let xf = [1, -1, 0, 1], lastPersonAt = 0, personSeen = false;
const movers = [createMoves(), createMoves(), createMoves(), createMoves()];
let hands = [null, null], head = null;
const mirrored = () => prefs.look.camera !== 'back';
const micConstraints = () => ({ echoCancellation: !prefs.voice.phones, noiseSuppression: false, autoGainControl: false, channelCount: 1 });
function camConstraints() {
  return { facingMode: prefs.look.camera === 'back' ? 'environment' : 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };
}
async function startMedia() {
  if (FAKE) { startFake(); return; }
  const md = navigator.mediaDevices;
  if (!md || !md.getUserMedia) { hint('This browser has no camera or mic for Studio. The band still plays.', 6000); return; }
  setSession(true);
  const wantCam = prefs.look.camera !== 'off';
  let s = null;
  try { s = await md.getUserMedia({ video: wantCam ? camConstraints() : false, audio: micConstraints() }); }
  catch {
    if (wantCam) { try { s = await md.getUserMedia({ video: camConstraints(), audio: false }); } catch { /* no camera either */ } }
    if (!s) { try { s = await md.getUserMedia({ video: false, audio: micConstraints() }); } catch { /* nothing */ } }
  }
  if (screen !== 'studio') { if (s) for (const t of s.getTracks()) t.stop(); return; }
  if (!s) {
    camDenied = true; micOn = false; setSession(false); paintMic();
    hint('Camera and mic are off, so the band plays on its own. To sing and see your aura, allow both for this site in Settings, then come back.', 8000);
    return;
  }
  const v = s.getVideoTracks(), a = s.getAudioTracks();
  if (v.length) await useCamera(new MediaStream(v));
  if (a.length) { audioUp().voice.attach(new MediaStream(a)); micOn = true; } else { micOn = false; setSession(false); }
  paintMic(); estimateLatency();
}
async function useCamera(stream) {
  stopCamera();
  camStream = stream;
  video.srcObject = stream;
  await video.play().catch(() => {});
  startTracker();
}
function stopCamera() {
  if (camStream) for (const t of camStream.getTracks()) t.stop();
  camStream = null; video.srcObject = null; lastVidT = -1;
  if (universe) universe.noVideo();
}
async function switchCamera() {
  if (FAKE) return;
  if (prefs.look.camera === 'off') { stopCamera(); return; }
  try { await useCamera(await navigator.mediaDevices.getUserMedia({ video: camConstraints(), audio: false })); }
  catch { toast('That camera would not open'); }
}
async function setMic(on) {
  if (FAKE) { micOn = on; paintMic(); return; }
  const a = audioUp();
  if (!on) { a.voice.detach(); micOn = false; setSession(false); paintMic(); return; }
  setSession(true);
  try { a.voice.attach(await navigator.mediaDevices.getUserMedia({ audio: micConstraints() })); micOn = true; }
  catch { micOn = false; setSession(false); toast('The mic is blocked for this site'); }
  paintMic(); estimateLatency();
}
function stopMedia() {
  stopCamera();
  if (A) A.voice.detach();
  micOn = false; setSession(false);
  stopFake();
}
async function startTracker() {
  if (tracker || trackerFail || FAKE) return;
  trackerLoad ||= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import('/irl/vendor/vision_bundle.mjs');
    const files = await FilesetResolver.forVisionTasks(new URL('/irl/vendor/wasm', location.href).href);
    const surface = () => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas'));
    const opts = (delegate) => ({ baseOptions: { modelAssetPath: new URL('/irl/models/pose_landmarker_lite.task', location.href).href, delegate }, canvas: surface(),
      runningMode: 'VIDEO', numPoses: 4, outputSegmentationMasks: true, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    try { return await PoseLandmarker.createFromOptions(files, opts('GPU')); } catch { return await PoseLandmarker.createFromOptions(files, opts('CPU')); }
  })();
  try { tracker = await trackerLoad; hintSoon(); }
  catch (e) { console.warn('studio: no tracker', e); trackerFail = true; trackerLoad = null; if (universe) universe.noMask(); }
}
// screen point (0..1, y down) from a picture point, through the same cover-and-mirror as the sky
function toScreen(p) { return { x: (p.x - xf[2]) / xf[0], y: 1 - (p.y - xf[3]) / xf[1], visibility: p.visibility }; }
function coverXf(vw, vh, W, H, mirror) {
  const ca = W / H, va = vw / vh;
  let fx = 1, fy = 1;
  if (va > ca) fx = ca / va; else fy = va / ca;
  return [mirror ? -fx : fx, -fy, mirror ? 0.5 + fx / 2 : 0.5 - fx / 2, 0.5 + fy / 2];
}
/* Someone in the picture: they're cut out of it, and the picture moves with the tracker's frames so
   the cut-out always fits. Nobody (or no tracker): the whole room through the filter, every frame.
   The tracker runs as often as this phone can spare (its own time times 2.2, 40 ms at least). */
const cutout = (now) => !!fake || (!!tracker && !trackerFail && now / 1000 - lastPersonAt < 1.5);
function trackStep(now) {
  if (!camStream || !universe || video.readyState < 2 || !video.videoWidth) return;
  const vt = video.currentTime;
  if (vt === lastVidT) return;
  const vw = video.videoWidth, vh = video.videoHeight;
  xf = coverXf(vw, vh, sky.width, sky.height, mirrored());
  const due = now - lastTrackAt >= Math.max(40, trackMs * 2.2);
  if (!tracker || trackerFail || !due) { if (!cutout(now)) { lastVidT = vt; universe.video(video, xf); } return; }
  lastVidT = vt; lastTrackAt = now;
  universe.video(video, xf);
  const s = 320 / Math.max(vw, vh), tw = Math.round(vw * s), th = Math.round(vh * s);
  if (tcv.width !== tw || tcv.height !== th) { tcv.width = tw; tcv.height = th; }
  tctx.drawImage(video, 0, 0, tw, th);
  const t0 = performance.now(), ts = Math.max(t0, lastTs + 1);
  lastTs = ts;
  try { tracker.detectForVideo(tcv, ts, (res) => onPose(res)); trackErrs = 0; }
  catch (e) { if (++trackErrs > 8) { trackerFail = true; console.warn('studio: the tracker stopped', e); universe.noMask(); } }
  trackMs = trackMs * 0.9 + (performance.now() - t0) * 0.1;
}
let maskF = null;
function onPose(res) {
  const people = res.landmarks || [], masks = res.segmentationMasks || [];
  const now = performance.now() / 1000;
  if (masks.length) {
    // everyone in the picture: one mask each, put together
    const w = masks[0].width, h = masks[0].height;
    if (!maskU8 || maskU8.length !== w * h) { maskU8 = new Uint8Array(w * h); maskF = new Float32Array(w * h); maskW = w; maskH = h; }
    maskF.set(masks[0].getAsFloat32Array());
    for (let k = 1; k < masks.length; k++) { const f = masks[k].getAsFloat32Array(); if (f.length === maskF.length) for (let i = 0; i < f.length; i++) if (f[i] > maskF[i]) maskF[i] = f[i]; }
    for (let i = 0; i < maskF.length; i++) maskU8[i] = (maskU8[i] * 0.35 + maskF[i] * 165.75) | 0;
    universe.mask(maskU8, w, h);
  } else if (maskU8) {   // nobody there: the cut-out fades away
    for (let i = 0; i < maskU8.length; i++) maskU8[i] = (maskU8[i] * 0.6) | 0;
    universe.mask(maskU8, maskW, maskH);
  }
  takePeople(people.map((lm) => lm.map(toScreen)), now);
}
// people left to right (so each keeps their own move reader), every hand trails stardust, the
// nearest head steers the parallax
function takePeople(list, now) {
  list = list.slice(0, 4).sort((a, b) => a[0].x - b[0].x);
  if (list.length) { lastPersonAt = now; personSeen = true; }
  const aspect = sky.width / Math.max(1, sky.height);
  hands = []; let best = null;
  movers.forEach((mv, i) => {
    const out = mv.update(list[i] || null, now, aspect);
    hands.push(...out.hands);
    if (out.head && (!best || (out.body && out.body.sw > best.sw))) best = { head: out.head, sw: out.body ? out.body.sw : 0 };
    for (const e of out.events) onMove(e);
  });
  if (best) head = best.head;
}
const takePose = (pts, now) => takePeople(pts ? [pts] : [], now);
function onMove(e) {
  if (!universe) return;
  const col = auraCol;
  if (e.type === 'clap') {
    universe.burst(e.x, e.y, 110, col, 1.1); universe.ring(e.x, e.y);
    if (prefs.look.moveSounds && A && A.band.playing) A.band.moveClap(A.ctx.currentTime);
  } else if (e.type === 'nova') {
    nova = 1;
    universe.burst(e.x, e.y, 220, [1, 0.95, 0.85], 1.7, 1.3); universe.ring(e.x, e.y);
    if (prefs.look.moveSounds && A && A.band.playing) A.band.moveSwell(A.ctx.currentTime);
  }
}

/* a stand-in camera for tests and screenshots (?fake): a drawn figure, its mask and its points */
let fake = null;
function startFake() {
  const cv = document.createElement('canvas'), mc = document.createElement('canvas');
  fake = { cv, mc, t0: performance.now(), last: 0 };
  personSeen = true;
}
function stopFake() { fake = null; }
function fakeStep(now) {
  if (!fake || !universe) return;
  if (now - fake.last < 60) return;
  fake.last = now;
  const land = innerWidth > innerHeight, W = land ? 640 : 360, H = land ? 360 : 640, t = (now - fake.t0) / 1000;
  for (const c of [fake.cv, fake.mc]) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const g = fake.cv.getContext('2d'), m = fake.mc.getContext('2d', { willReadFrequently: true });
  const u = Math.min(H / 900, W / 520), cx = W / 2 + Math.sin(t * 0.7) * 18 * u, hy = H * 0.5;
  const wave = Math.sin(t * 2.2), up = window.__studioFakeUp ? 1 : 0;
  const lw = { x: cx - 150 * u, y: up ? hy - 170 * u : hy + 190 * u + wave * 70 * u }, rw = { x: cx + 150 * u + Math.cos(t * 1.7) * 20 * u, y: up ? hy - 170 * u : hy + 170 * u - wave * 80 * u };
  const shape = (ctx, paint) => {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    paint(ctx, 'shirt'); ctx.beginPath(); ctx.moveTo(cx - 120 * u, hy + 110 * u); ctx.quadraticCurveTo(cx, hy + 95 * u, cx + 120 * u, hy + 110 * u); ctx.lineTo(cx + 150 * u, H); ctx.lineTo(cx - 150 * u, H); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 42 * u; ctx.beginPath(); ctx.moveTo(cx - 105 * u, hy + 116 * u); ctx.lineTo((cx - 105 * u + lw.x) / 2 - 30 * u, (hy + 116 * u + lw.y) / 2 + 30 * u); ctx.lineTo(lw.x, lw.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 105 * u, hy + 116 * u); ctx.lineTo((cx + 105 * u + rw.x) / 2 + 30 * u, (hy + 116 * u + rw.y) / 2 + 30 * u); ctx.lineTo(rw.x, rw.y); ctx.stroke();
    paint(ctx, 'skin'); ctx.beginPath(); ctx.arc(lw.x, lw.y, 22 * u, 0, 7); ctx.arc(rw.x, rw.y, 22 * u, 0, 7); ctx.fill();
    ctx.fillRect(cx - 22 * u, hy + 50 * u, 44 * u, 50 * u);
    ctx.beginPath(); ctx.ellipse(cx, hy, 56 * u, 68 * u, 0, 0, 7); ctx.fill();
    paint(ctx, 'hair'); ctx.beginPath(); ctx.ellipse(cx, hy - 34 * u, 60 * u, 40 * u, 0, Math.PI, 0); ctx.fill();
  };
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#5a5f6e'); bg.addColorStop(1, '#2c2a33'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  shape(g, (c, k) => { c.fillStyle = c.strokeStyle = k === 'shirt' ? '#3a6fd8' : k === 'skin' ? '#e3ad8c' : '#2a1a14'; });
  g.fillStyle = '#2a1a14'; g.beginPath(); g.arc(cx - 20 * u, hy - 5 * u, 6 * u, 0, 7); g.arc(cx + 20 * u, hy - 5 * u, 6 * u, 0, 7); g.fill();
  g.strokeStyle = '#a0564a'; g.lineWidth = 5 * u; g.beginPath(); g.arc(cx, hy + 18 * u, 18 * u, 0.2, Math.PI - 0.2); g.stroke();
  m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
  shape(m, (c) => { c.fillStyle = c.strokeStyle = '#fff'; });
  xf = coverXf(W, H, sky.width, sky.height, false);
  universe.video(fake.cv, xf);
  const px = fake.mc.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data, u8 = new Uint8Array(W * H);
  for (let i = 0; i < u8.length; i++) u8[i] = px[i * 4];
  universe.mask(u8, W, H);
  const P = (x, y, v = 0.99) => ({ x: x / W, y: y / H, visibility: v });
  const lm = Array.from({ length: 33 }, () => P(cx, H * 1.2, 0.1));
  lm[0] = P(cx, hy); lm[11] = P(cx + 105 * u, hy + 116 * u); lm[12] = P(cx - 105 * u, hy + 116 * u);
  lm[15] = P(rw.x, rw.y); lm[16] = P(lw.x, lw.y); lm[19] = P(rw.x, rw.y - 10 * u); lm[20] = P(lw.x, lw.y - 10 * u);
  takePose(lm.map(toScreen), now / 1000);
}

/* ---------- the song ---------- */
let currentSong = null;   // the saved song being worked on, if one was opened
let draftSeed = Date.now();   // keeps a new song's name the same between its recordings and its save
const draftName = () => songName(prefs.song, draftSeed);
const genre = () => GENRES[prefs.song.genre];
function songChanged(retime) {
  if (A) { A.band.setSong(prefs.song); if (retime) A.voice.setTempo(prefs.song.bpm); }
  paintTitle(); buildTimeline(); paintSongSheet(); savePrefs();
  if (A && prefs.song.inst === 'guitar') setTimeout(() => warmGuitar(), 30);
}
function warmGuitar() {
  if (!A) return;
  const g = genre(), seen = new Set();
  for (let b = 0; b < Math.min(formBars(formOf(g)), 32); b++) { const i = songInfo(prefs.song, b); if (!i || seen.has(i.sym)) continue; seen.add(i.sym); }
  // the band builds each string's pluck the first time it's played; build the progression's now
  for (const sym of seen) A.band.warm(guitarVoicing(parseChord(sym), prefs.song.key, g.power && g.tone.guitar === 'drive'), g.tone.guitar);
}
function titleText() {
  const g = genre();
  return currentSong ? currentSong.name : `${g.emoji} ${g.name} · ${keyName(prefs.song.key, g.minor).replace(' major', '').replace(' minor', 'm')} · ${prefs.song.bpm}`;
}
function paintTitle() { $('#songTitle').textContent = titleText(); }
const KIND_COLOR = { intro: '#7A6BFF', verse: '#2A9DF4', pre: '#FFB13F', chorus: '#FF3D8B', bridge: '#3FCB86', outro: '#7A6BFF' };
const KIND_SHORT = { intro: 'IN', verse: 'V', pre: 'PRE', chorus: 'CH', bridge: 'BR', outro: 'OUT' };
let tlForm = null, tlBtns = [];
function buildTimeline() {
  const g = genre(), form = formOf(g), tl = $('#tl'), headEl = $('#tlHead');
  tl.textContent = ''; tl.appendChild(headEl);
  tlForm = form;
  tlBtns = form.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.style.flex = String(s.bars); b.style.setProperty('--c', KIND_COLOR[s.kind]);
    b.textContent = s.kind === 'chorus' ? (g.labels && g.labels.chorus ? g.labels.chorus.toUpperCase() : 'CH') : s.kind === 'verse' ? 'V' + s.n : KIND_SHORT[s.kind];
    b.setAttribute('aria-label', 'Go to ' + s.title);
    b.addEventListener('click', () => cueSection(i));
    tl.insertBefore(b, headEl);
    return b;
  });
}
function cueSection(i) {
  const s = tlForm[i], a = audioUp();
  if (!a) return;
  if (a.band.playing && !pendingRec) { a.band.cue(s.start); toast('→ ' + s.title + ' next bar'); }
  else if (!rec) startSong(s.start);
}
function startSong(bar = 0, countIn = 0) {
  const a = audioUp();
  if (!a) return;
  a.band.setSong(prefs.song);
  a.band.play(bar, { countIn });
  paintPlay();
}
function stopSong() {
  if (rec || pendingRec) stopRecord();
  if (A) A.band.stop();
  paintPlay(); setBig('');
}
function onSongEnd() {
  paintPlay(); setBig('');
  if (rec) stopRecord();
  else hint('That\'s the song. ▶ to go again, or ⏺ to record it.', 4000);
}

/* ---------- recording ---------- */
let rec = null, pendingRec = false, recCv = null, recCtx = null;
function pickType(isVideo) {
  const list = isVideo ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  for (const t of list) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch { /* next */ } }
  return '';
}
function recToggle() {
  if (rec || pendingRec) { stopRecord(); return; }
  const a = audioUp();
  if (!a || !window.MediaRecorder || !a.recDest) { toast('This browser can\'t record here'); return; }
  closeSheets();
  if (!a.band.playing) { a.band.setSong(prefs.song); a.band.play(0, { countIn: 2 }); pendingRec = true; }
  else startRecorder();
  paintPlay(); paintRec();
}
function startRecorder() {
  pendingRec = false;
  const isVideo = prefs.look.recMode !== 'audio' && !!universe && !!sky.captureStream;
  const tracks = [];
  if (isVideo) {
    const land = innerWidth > innerHeight;
    recCv ||= document.createElement('canvas');
    recCv.width = land ? 1280 : 720; recCv.height = land ? 720 : 1280;
    recCtx = recCv.getContext('2d');
    composite(performance.now(), 0);
    tracks.push(...recCv.captureStream(30).getVideoTracks());
  }
  tracks.push(...A.recDest.stream.getAudioTracks());
  const type = pickType(isVideo);
  let mr;
  try { mr = new MediaRecorder(new MediaStream(tracks), type ? { mimeType: type, videoBitsPerSecond: 3500000, audioBitsPerSecond: 192000 } : undefined); }
  catch { try { mr = new MediaRecorder(new MediaStream(tracks)); } catch (e) { toast('Recording didn\'t start'); console.warn(e); paintRec(); return; } }
  const r = { mr, chunks: [], isVideo, type: mr.mimeType || type, t0: performance.now(), song: { ...prefs.song }, name: currentSong ? currentSong.name : draftName(), thumb: null, title: currentSong ? currentSong.name : draftName() };
  mr.ondataavailable = (e) => { if (e.data && e.data.size) r.chunks.push(e.data); };
  mr.onstop = () => finishTake(r);
  mr.start(1000);
  rec = r;
  paintRec();
}
function stopRecord() {
  if (pendingRec && !rec) { pendingRec = false; if (A) A.band.stop(); paintPlay(); paintRec(); setBig(''); return; }
  if (!rec) return;
  const r = rec;
  rec = null;
  try { if (r.mr.state !== 'inactive') r.mr.stop(); } catch { finishTake(r); }
  paintRec();
}
function composite(now, el) {
  if (!recCtx) return;
  const W = recCv.width, H = recCv.height, sw = sky.width, sh = sky.height, c = recCtx;
  const s = Math.max(W / sw, H / sh), dw = sw * s, dh = sh * s;
  c.drawImage(sky, (W - dw) / 2, (H - dh) / 2, dw, dh);
  const u = Math.min(W, H) / 720;
  if (el < 4.2 && rec) {
    const a = el < 3.2 ? Math.min(1, el * 3) : Math.max(0, 1 - (el - 3.2));
    c.save(); c.globalAlpha = a; c.textAlign = 'center';
    let fs = 88 * u;
    c.font = `${Math.round(fs)}px Bangers, Impact, sans-serif`;
    const tw = c.measureText(rec.title).width;
    if (tw > W * 0.86) { fs *= W * 0.86 / tw; c.font = `${Math.round(fs)}px Bangers, Impact, sans-serif`; }
    c.lineWidth = 10 * u; c.strokeStyle = 'rgba(5,3,10,0.85)'; c.fillStyle = '#FFF';
    const y = H * 0.24;
    c.strokeText(rec.title, W / 2, y); c.fillText(rec.title, W / 2, y);
    c.font = `800 ${Math.round(26 * u)}px Inter, system-ui, sans-serif`; c.fillStyle = '#FFD23F'; c.lineWidth = 6 * u;
    const by = myHandle() !== 'guest' ? 'by ' + (store.get('capra-lab.profile', {}).name || '') : '';
    if (by) { c.strokeText(by, W / 2, y + 46 * u); c.fillText(by, W / 2, y + 46 * u); }
    c.restore();
  }
  c.save(); c.globalAlpha = 0.75; c.textAlign = 'right'; c.font = `${Math.round(30 * u)}px Bangers, Impact, sans-serif`; c.fillStyle = '#FFF';
  c.fillText('STUDIO · CAPRA LAB', W - 24 * u, H - 24 * u); c.restore();
}
function snapThumb() {
  try {
    const src = recCv && rec && rec.isVideo ? recCv : sky, w = 240, h = Math.round(w * 4 / 3), t = document.createElement('canvas');
    t.width = w; t.height = h;
    const s = Math.max(w / src.width, h / src.height);
    t.getContext('2d').drawImage(src, (w - src.width * s) / 2, (h - src.height * s) / 2, src.width * s, src.height * s);
    return t.toDataURL('image/jpeg', 0.72);
  } catch { return null; }
}
async function finishTake(r) {
  const type = (r.type || '').split(';')[0] || (r.isVideo ? 'video/webm' : 'audio/webm');
  if (!r.chunks.length) { toast('Nothing was recorded'); return; }
  const blob = new Blob(r.chunks, { type });
  const n = (await Takes.all().catch(() => [])).filter((t) => t.handle === myHandle()).length + 1;
  const take = { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), handle: myHandle(), name: r.name + (n > 1 ? ' · take ' + n : ''), made: Date.now(),
    dur: (performance.now() - r.t0) / 1000, kind: r.isVideo ? 'video' : 'audio', type, size: blob.size, blob, thumb: r.thumb || snapThumb(), song: r.song, voice: { ...prefs.voice }, look: { ...prefs.look } };
  try { await Takes.put(take); } catch (e) { console.warn(e); toast('This phone is out of room for recordings'); }
  openTake(take, true);
}

/* recordings live in IndexedDB on this phone */
const Takes = (() => {
  let p = null;
  const open = () => p ||= new Promise((res, rej) => {
    const r = indexedDB.open('capra-studio', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('takes', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => { p = null; rej(r.error); };
  });
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction('takes', mode), req = fn(tx.objectStore('takes'));
      tx.oncomplete = () => res(req && 'result' in req ? req.result : undefined); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  };
  return { all: () => run('readonly', (s) => s.getAll()), put: (v) => run('readwrite', (s) => s.put(v)), del: (id) => run('readwrite', (s) => s.delete(id)) };
})();
const extOf = (type) => (/mp4/.test(type) ? (/audio/.test(type) ? 'm4a' : 'mp4') : /webm/.test(type) ? 'webm' : 'bin');
const fileName = (t) => (t.name || 'studio').replace(/[^\w\- ·]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) + '.' + extOf(t.type);
let openTakeUrl = null, theTake = null;
function openTake(t, fresh) {
  theTake = t;
  closeSheets();
  if (openTakeUrl) URL.revokeObjectURL(openTakeUrl);
  openTakeUrl = URL.createObjectURL(t.blob);
  const box = $('#takeMedia');
  box.textContent = '';
  const m = document.createElement(t.kind === 'video' ? 'video' : 'audio');
  m.className = 'player'; m.controls = true; m.playsInline = true; m.setAttribute('playsinline', ''); m.preload = 'metadata'; m.src = openTakeUrl;
  if (t.kind === 'video' && t.thumb) m.poster = t.thumb;
  box.appendChild(m);
  $('#takeHead').textContent = fresh ? 'YOUR TAKE' : 'RECORDING';
  $('#takeName').value = t.name;
  $('#takeNote').textContent = `${fmtTime(t.dur || 0)} · ${(t.size / 1048576).toFixed(1)} MB · ${new Date(t.made).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}. Share sends it to Messages, Photos (Save Video) and more.`;
  $('#takeDel').textContent = 'Delete'; $('#takeDel').classList.remove('red');
  openSheet('takeSheet');
}
async function shareTake() {
  const t = theTake;
  if (!t) return;
  const file = new File([t.blob], fileName(t), { type: t.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t.name }); } catch (e) { if (e && e.name !== 'AbortError') toast('Sharing didn\'t work, try Save to phone'); }
  } else saveTakeFile();
}
function saveTakeFile() {
  const t = theTake;
  if (!t) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(t.blob); a.download = fileName(t);
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
}

/* ---------- saved songs (per lab player) ---------- */
const songsKey = () => 'studio.songs.' + myHandle();
const loadSongs = () => store.get(songsKey(), []);
function saveSong(asNew) {
  const name = ($('#songName').value || '').trim().slice(0, 40) || draftName();
  const list = loadSongs(), now = Date.now();
  const entry = { id: !asNew && currentSong ? currentSong.id : 's' + now.toString(36), name, song: { ...prefs.song }, voice: { ...prefs.voice }, look: { universe: prefs.look.universe, chordColors: prefs.look.chordColors }, made: !asNew && currentSong ? currentSong.made : now, updated: now };
  const i = list.findIndex((s) => s.id === entry.id);
  if (i >= 0) list[i] = entry; else list.unshift(entry);
  if (!store.set(songsKey(), list)) { toast('Couldn\'t save on this phone'); return; }
  currentSong = entry;
  paintTitle(); closeSheets(); toast('Saved “' + name + '”');
}
function openSong(entry) {
  currentSong = entry;
  prefs.song = { ...defaultSong(entry.song.genre), ...entry.song };
  const { phones, monitor } = prefs.voice;
  prefs.voice = { ...DEF.voice, ...(entry.voice || {}), phones, monitor };
  if (entry.look) Object.assign(prefs.look, { universe: entry.look.universe || prefs.look.universe, chordColors: entry.look.chordColors ?? prefs.look.chordColors });
  savePrefs();
  enterStudio();
}
function deleteSong(id) { store.set(songsKey(), loadSongs().filter((s) => s.id !== id)); if (currentSong && currentSong.id === id) currentSong = null; renderHome(); }

/* ---------- home ---------- */
async function renderHome() {
  const songs = loadSongs(), list = $('#songList');
  $('#songCount').textContent = songs.length ? songs.length + (songs.length === 1 ? ' SONG' : ' SONGS') : '';
  list.textContent = '';
  if (!songs.length) list.innerHTML = '<p class="empty">Songs you save in the studio show up here, ready to pick up where you left off.</p>';
  for (const s of songs) {
    const g = GENRES[s.song.genre] || GENRES.pop;
    const row = document.createElement('div');
    row.className = 'song'; row.setAttribute('role', 'button'); row.tabIndex = 0;
    row.innerHTML = `<span class="em">${g.emoji}</span><span><b></b><small></small></span><button class="x" type="button" aria-label="Delete">✕</button>`;
    row.querySelector('b').textContent = s.name;
    row.querySelector('small').textContent = `${g.name} · ${keyName(s.song.key, g.minor)} · ${s.song.bpm} bpm · ${INSTRUMENTS[s.song.inst] || ''}`;
    const go = () => openSong(s);
    row.addEventListener('click', (e) => { if (!e.target.closest('.x, .sure')) go(); });
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    row.querySelector('.x').addEventListener('click', (e) => {
      e.stopPropagation();
      const x = e.currentTarget, sure = document.createElement('span');
      sure.className = 'sure'; sure.innerHTML = '<button class="yes" type="button">Delete</button><button type="button">Keep</button>';
      sure.querySelector('.yes').addEventListener('click', (ev) => { ev.stopPropagation(); deleteSong(s.id); });
      sure.lastChild.addEventListener('click', (ev) => { ev.stopPropagation(); sure.replaceWith(x); });
      x.replaceWith(sure);
    });
    list.appendChild(row);
  }
  const box = $('#takeList');
  let takes = [];
  try { takes = (await Takes.all()).filter((t) => t.handle === myHandle()).sort((a, b) => b.made - a.made); } catch { /* no storage */ }
  $('#takeCount').textContent = takes.length ? takes.length + (takes.length === 1 ? ' TAKE' : ' TAKES') : '';
  box.textContent = '';
  if (!takes.length) { box.innerHTML = '<p class="empty" style="grid-column:1/-1">Record in the studio (⏺) and your videos and audio takes land here to watch, share or save.</p>'; return; }
  for (const t of takes) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'take';
    b.innerHTML = `${t.thumb ? '<img alt="">' : ''}<span class="kind">${t.kind === 'video' ? '🎬' : '🎧'} ${fmtTime(t.dur || 0)}</span><span class="meta"><b></b><small></small></span>`;
    if (t.thumb) b.querySelector('img').src = t.thumb;
    b.querySelector('b').textContent = t.name;
    b.querySelector('small').textContent = new Date(t.made).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    b.addEventListener('click', () => openTake(t, false));
    box.appendChild(b);
  }
}

/* ---------- the studio ---------- */
let wake = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { /* the screen may dim */ }
}
function enterStudio() {
  const a = audioUp();   // inside the tap, so iPhone lets the sound start
  if (a) { a.band.setSong(prefs.song); a.voice.set(prefs.voice); a.voice.setTempo(prefs.song.bpm); }
  show('studio');
  paintTitle(); buildTimeline(); paintAll();
  keepAwake(true);
  startMedia();
  if (!prefs.seen) { prefs.seen = true; savePrefs(); setTimeout(() => { if (screen === 'studio') openSheet('songSheet'); }, 400); }
  else hint('▶ to play, ⏺ to record. Clap, or put both hands up ✨', 4500);
  studioAt = performance.now();
}
function leaveStudio() {
  if (rec || pendingRec) stopRecord();
  if (A) A.band.stop();
  stopMedia(); keepAwake(false);
  paintPlay(); setBig('');
  show('home');
}
let studioAt = 0, hintTimer = 0;
function hint(text, ms = 3500) {
  const h = $('#hint');
  h.textContent = text; h.classList.remove('off');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => h.classList.add('off'), ms);
}
function hintSoon() { setTimeout(() => { if (screen === 'studio' && !personSeen) hint('Step back so the camera sees you from the waist up', 4000); }, 2500); }
let toastTimer = 0;
function toast(text) { const t = $('#toast'); t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200); }

/* big numbers in the middle: the count-in and the chorus countdown */
let bigNow = '';
function setBig(main, small = '', word = false) {
  const key = main + '|' + small;
  if (key === bigNow) return;
  bigNow = key;
  const b = $('#big');
  b.textContent = '';
  if (!main) return;
  const d = document.createElement('div');
  d.className = 'pop' + (word ? ' word' : '');
  d.textContent = main;
  if (small) { const s = document.createElement('small'); s.textContent = small; d.appendChild(s); }
  b.appendChild(d);
}

/* ---------- sheets ---------- */
let openName = null;
function openSheet(name) {
  if (openName === name) { closeSheets(); return; }
  closeSheets();
  openName = name;
  $('#' + name).hidden = false;
  $('#veil').hidden = name !== 'takeSheet' && name !== 'saveSheet';
  for (const [id, sh] of [['dkSong', 'songSheet'], ['dkVoice', 'voiceSheet'], ['dkLook', 'lookSheet']]) $('#' + id).classList.toggle('on', sh === name);
  if (name === 'songSheet') paintSongSheet();
  if (name === 'voiceSheet') paintVoiceSheet();
  if (name === 'lookSheet') paintLookSheet();
  if (name === 'saveSheet') $('#songName').value = currentSong ? currentSong.name : draftName();
}
function closeSheets() {
  for (const s of document.querySelectorAll('.sheet')) s.hidden = true;
  $('#veil').hidden = true;
  if (openName === 'takeSheet') { const m = $('#takeMedia video, #takeMedia audio'); if (m) m.pause(); if (screen === 'home') renderHome(); }
  openName = null;
  for (const id of ['dkSong', 'dkVoice', 'dkLook']) $('#' + id).classList.remove('on');
}
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheets));
$('#veil').addEventListener('click', closeSheets);

function segment(box, items, isOn, onPick, render) {
  box.textContent = '';
  for (const [value, label] of items) {
    const b = document.createElement('button');
    b.type = 'button';
    if (render) render(b, value, label); else b.textContent = label;
    b.classList.toggle('on', isOn(value));
    b.addEventListener('click', () => onPick(value));
    box.appendChild(b);
  }
}
function paintSongSheet() {
  const g = genre(), s = prefs.song;
  const gbox = $('#genres');
  if (!gbox.childElementCount) {
    for (const id of GENRE_ORDER) {
      const G = GENRES[id], b = document.createElement('button');
      b.type = 'button'; b.className = 'gcard'; b.dataset.id = id;
      b.innerHTML = `<b><span>${G.emoji}</span><span></span></b><span class="num"></span><small></small>`;
      b.querySelector('b span:last-child').textContent = G.name;
      b.querySelector('.num').textContent = hookOf(G);
      b.querySelector('small').textContent = G.blurb;
      b.addEventListener('click', () => pickGenre(id));
      gbox.appendChild(b);
    }
  }
  for (const b of gbox.children) {
    b.classList.toggle('on', b.dataset.id === s.genre);
    const G = GENRES[b.dataset.id];
    b.querySelector('small').textContent = b.dataset.id === s.genre ? hookNames(G, s.key) + ' · ' + G.blurb : G.blurb;
  }
  const toneName = { saw: 'Saw lead', supersaw: 'Supersaw', bell: 'Bell', warm: 'Warm pad', grand: 'Grand', ep: 'Electric', acoustic: 'Acoustic', clean: 'Clean electric', nylon: 'Nylon', drive: 'Overdrive' };
  segment($('#insts'), [['piano', 'Piano'], ['synth', 'Synth'], ['guitar', 'Guitar']], (v) => v === s.inst, (v) => { prefs.song.inst = v; songChanged(); },
    (b, v, label) => { b.innerHTML = `<span class="ic">${v === 'piano' ? '🎹' : v === 'synth' ? '🎛️' : '🎸'}</span>${label}<small>${toneName[g.tone[v]]}</small>`; });
  segment($('#beats'), [...g.beats.map((id) => [id, BEATS[id].name]), ['off', 'No drums']], (v) => v === s.beat, (v) => { prefs.song.beat = v; songChanged(); });
  $('#keyHead').textContent = 'KEY · ' + keyName(s.key, g.minor).toUpperCase();
  segment($('#keys'), Array.from({ length: 12 }, (_, pc) => [pc, noteName(pc, flatKey(pc, g.minor)) + (g.minor ? 'm' : '')]), (v) => v === s.key, (v) => { prefs.song.key = v; songChanged(); if (currentSong) paintTitle(); });
  const r = $('#bpm'), lo = Math.max(56, Math.round(g.bpm * 0.7)), hi = Math.min(190, Math.round(g.bpm * 1.3));
  r.min = lo; r.max = hi; r.value = s.bpm; $('#bpmVal').textContent = s.bpm;
  $('#keepGoing').classList.toggle('on', !!s.keepGoing);
}
function pickGenre(id) {
  const G = GENRES[id];
  prefs.song = { ...prefs.song, genre: id, key: G.key, bpm: G.bpm, beat: G.beats[0] };
  draftSeed = Date.now();
  songChanged(true);
  if (A && !A.band.playing && !pendingRec) startSong(0);
}
function setBpm(v) {
  const g = genre();
  prefs.song.bpm = clamp(Math.round(v), Math.max(56, Math.round(g.bpm * 0.7)), Math.min(190, Math.round(g.bpm * 1.3)));
  $('#bpm').value = prefs.song.bpm; $('#bpmVal').textContent = prefs.song.bpm;
  if (A) { A.band.setSong(prefs.song); A.voice.setTempo(prefs.song.bpm); }
  paintTitle(); savePrefs();
}
$('#bpm').addEventListener('input', (e) => setBpm(+e.target.value));
$('#bpmDown').addEventListener('click', () => setBpm(prefs.song.bpm - 2));
$('#bpmUp').addEventListener('click', () => setBpm(prefs.song.bpm + 2));
$('#keepGoing').addEventListener('click', () => { prefs.song.keepGoing = !prefs.song.keepGoing; songChanged(); });

const TUNE_NOTE = { hard: 'The snap: every note lands right on the song, the famous robotic pop sound.', natural: 'Nudged gently toward the song, still sounds like you.', off: 'Your own voice, just the effects.' };
function voiceChanged() { if (A) A.voice.set(prefs.voice); applyMonitor(); estimateLatency(); paintVoiceSheet(); savePrefs(); }
function paintVoiceSheet() {
  const v = prefs.voice;
  $('#micTog').classList.toggle('on', micOn);
  $('#micNote').textContent = micOn ? 'Sing or talk, it all goes through your sound' : camDenied ? 'Blocked: allow the mic for this site in Settings' : 'Off: tap to turn it on';
  segment($('#tunes'), Object.entries(TUNES), (k) => k === v.tune, (k) => { v.tune = k; voiceChanged(); });
  $('#tuneNote').textContent = TUNE_NOTE[v.tune] + (v.char === 'robot' ? ' (Robot always snaps hard.)' : '');
  segment($('#harms'), Object.entries(HARMONIES), (k) => +k === +v.harmony, (k) => { v.harmony = +k; voiceChanged(); });
  segment($('#chars'), Object.entries(CHARS), (k) => k === v.char, (k) => { v.char = k; voiceChanged(); });
  const fx = [['space', '🌌 Space'], ['echo', '🔁 Echo'], ['radio', '📻 Radio']];
  segment($('#fx'), fx, (k) => !!v[k], (k) => { v[k] = !v[k]; voiceChanged(); });
  $('#vvol').value = v.volume; $('#vvolVal').textContent = Math.round(v.volume * 100) + '%';
  $('#phonesTog').classList.toggle('on', !!v.phones);
  $('#monTog').classList.toggle('on', !!v.monitor);
}
$('#micTog').addEventListener('click', () => setMic(!micOn));
$('#vvol').addEventListener('input', (e) => { prefs.voice.volume = +e.target.value; $('#vvolVal').textContent = Math.round(prefs.voice.volume * 100) + '%'; if (A) A.voice.set(prefs.voice); savePrefs(); });
$('#phonesTog').addEventListener('click', () => {
  prefs.voice.phones = !prefs.voice.phones;
  if (prefs.voice.phones) prefs.voice.monitor = true;
  voiceChanged();
  if (micOn && !FAKE) setMic(true);   // the mic again, with or without echo-cancelling
});
$('#monTog').addEventListener('click', () => { prefs.voice.monitor = !prefs.voice.monitor; voiceChanged(); });

function paintLookSheet() {
  const L = prefs.look;
  segment($('#unis'), Object.entries(UNIVERSES).map(([k, u]) => [k, u.name]), (k) => k === L.universe, (k) => { L.universe = k; paintLookSheet(); savePrefs(); },
    (b, k, label) => {
      const u = UNIVERSES[k], css = (c) => `rgb(${c.map((x) => Math.round(x * 255)).join(',')})`;
      b.className = 'sw'; b.style.background = `radial-gradient(circle at 30% 30%, ${css(u.c)}, ${css(u.a)} 45%, ${css(u.b)} 75%, ${css(u.deep)})`;
      b.innerHTML = '<span></span>'; b.firstChild.textContent = label; b.setAttribute('aria-label', label);
    });
  segment($('#styles'), Object.entries(STYLES), (k) => k === L.style, (k) => { L.style = k; paintLookSheet(); savePrefs(); });
  segment($('#bgs'), [['space', '🌌 Deep space'], ['room', '🛋️ My room, starlit']], (k) => k === L.bg, (k) => { L.bg = k; paintLookSheet(); savePrefs(); });
  $('#chordTog').classList.toggle('on', !!L.chordColors);
  $('#trailTog').classList.toggle('on', !!L.trails);
  $('#moveTog').classList.toggle('on', !!L.moveSounds);
  segment($('#cams'), [['front', 'Front (selfie)'], ['back', 'Back'], ['off', 'Off']], (k) => k === L.camera, (k) => { L.camera = k; paintLookSheet(); savePrefs(); switchCamera(); });
  segment($('#recModes'), [['video', '🎬 Video'], ['audio', '🎧 Audio only']], (k) => k === L.recMode, (k) => { L.recMode = k; paintLookSheet(); savePrefs(); });
}
for (const [id, key] of [['#chordTog', 'chordColors'], ['#trailTog', 'trails'], ['#moveTog', 'moveSounds']]) $(id).addEventListener('click', () => { prefs.look[key] = !prefs.look[key]; paintLookSheet(); savePrefs(); });

function paintPlay() {
  const on = !!(A && A.band.playing);
  $('#playIc').innerHTML = on ? '<rect x="6" y="5" width="4.5" height="14" rx="1"/><rect x="13.5" y="5" width="4.5" height="14" rx="1"/>' : '<path d="M7 4.5v15l13-7.5z"/>';
  $('#playBtn').setAttribute('aria-label', on ? 'Stop' : 'Play');
}
function paintRec() {
  const on = !!rec || pendingRec;
  $('#recBtn').classList.toggle('on', on);
  $('#recBtn').setAttribute('aria-label', on ? 'Stop recording' : 'Record');
  $('#titlePill').classList.toggle('recording', !!rec);
}
function paintMic() { $('#dkVoice').classList.toggle('off', !micOn); $('#micIc').textContent = micOn ? '🎤' : '🔇'; if (openName === 'voiceSheet') paintVoiceSheet(); }
function paintAll() { paintPlay(); paintRec(); paintMic(); }

$('#enter').addEventListener('click', () => { currentSong = null; enterStudio(); });
$('#back').addEventListener('click', leaveStudio);
$('#titlePill').addEventListener('click', () => (rec ? null : openSheet('songSheet')));
$('#saveBtn').addEventListener('click', () => openSheet('saveSheet'));
$('#dkSong').addEventListener('click', () => openSheet('songSheet'));
$('#dkVoice').addEventListener('click', () => openSheet('voiceSheet'));
$('#dkLook').addEventListener('click', () => openSheet('lookSheet'));
$('#playBtn').addEventListener('click', () => { const a = audioUp(); if (!a) return; if (a.band.playing || pendingRec) stopSong(); else startSong(0); });
$('#dkTop').addEventListener('click', () => { if (rec) return; if (A && A.band.playing) startSong(0); else setBig(''); });
$('#recBtn').addEventListener('click', recToggle);
$('#saveDo').addEventListener('click', () => saveSong(false));
$('#saveNew').addEventListener('click', () => saveSong(true));
$('#songName').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveSong(false); });
$('#takeShare').addEventListener('click', shareTake);
$('#takeSave').addEventListener('click', saveTakeFile);
$('#takeSong').addEventListener('click', () => { const t = theTake; if (!t || !t.song) return; currentSong = null; prefs.song = { ...defaultSong(t.song.genre), ...t.song }; if (t.voice) Object.assign(prefs.voice, t.voice); savePrefs(); closeSheets(); if (screen === 'studio') { songChanged(true); if (A) A.voice.set(prefs.voice); } else enterStudio(); });
$('#takeDel').addEventListener('click', async (e) => {
  const b = e.currentTarget;
  if (!b.classList.contains('red')) { b.classList.add('red'); b.textContent = 'Tap again to delete'; return; }
  if (theTake) await Takes.del(theTake.id).catch(() => {});
  theTake = null; closeSheets(); toast('Recording deleted'); renderHome();
});
$('#takeName').addEventListener('change', async (e) => {
  if (!theTake) return;
  theTake.name = e.target.value.trim().slice(0, 48) || theTake.name;
  await Takes.put(theTake).catch(() => {});
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (rec || pendingRec) stopRecord(); if (A && A.band.playing) stopSong(); }
  else if (screen === 'studio') keepAwake(true);
});

/* ---------- the frame loop ---------- */
let last = performance.now(), lastRender = 0, auraCol = UNIVERSES[prefs.look.universe].aura.slice(), vLevel = 0, energy = 0.4, warp = 0, nova = 0, lastSym = null, chorusBar = -9, pitchAt = 0, beatShown = -1, secShown = '';
function frame(now) {
  requestAnimationFrame(frame);
  const minGap = screen === 'studio' ? 30 : 40;
  if (now - lastRender < minGap) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now; lastRender = now;
  if (screen === 'studio') { if (fake) fakeStep(now); else trackStep(now); }

  const at = A ? A.ctx.currentTime - outLatency() : 0;
  const playing = !!(A && A.band.playing);
  const pos = playing ? A.band.position(at) : null;
  const info = pos && pos.bar >= 0 ? songInfo(prefs.song, pos.bar) : null;
  if (pendingRec && pos && (pos.bar >= 0 || (pos.bar === -1 && pos.beat >= 3))) { startRecorder(); paintRec(); }
  if (info && A && info.sym !== lastSym) { lastSym = info.sym; A.voice.setChord(info); }
  if (!info) lastSym = null;

  // what the sky hears and sees
  const beat = A ? Math.exp(-A.band.since(['k'], at) * 6) + 0.4 * Math.exp(-A.band.since(['s', 'c'], at) * 9) : 0;
  const lvl = micOn && A ? clamp((A.voice.level - 0.012) * 7, 0, 1) : 0;
  vLevel += (lvl - vLevel) * (lvl > vLevel ? 0.45 : 0.07);
  energy += ((info ? info.energy : 0.35) - energy) * 0.05;
  const pal = UNIVERSES[prefs.look.universe], target = prefs.look.chordColors && info ? chordColor(info.deg) : pal.aura;
  for (let i = 0; i < 3; i++) auraCol[i] += (target[i] - auraCol[i]) * 0.07;
  warp *= Math.pow(0.12, dt); nova *= Math.pow(0.18, dt);
  if (info && info.kind === 'chorus' && info.barIn === 0 && pos.bar !== chorusBar && pos.beat === 0) {
    chorusBar = pos.bar; warp = 1;
    if (universe) universe.burst(0.5, 0.4, 90, auraCol, 1.6, 1.1);
  }
  if (screen === 'studio' && universe) {
    if (prefs.look.trails) for (const h of hands) if (h) universe.trail(h, auraCol, dt);
    if (vLevel > 0.12 && head && Math.random() < vLevel * 1.4) universe.motes(head.x, head.y + 0.07, 1 + Math.round(vLevel * 2), auraCol);
  }
  if (universe) {
    const showCam = screen === 'studio' && prefs.look.camera !== 'off' && (!!camStream || !!fake);
    universe.render({ t: now / 1000, dt, palette: pal, aura: auraCol, style: prefs.look.style, bg: prefs.look.bg, air: true, beat: screen === 'studio' ? beat : 0.15 * beat, voice: vLevel, energy, warp, nova, head, camera: showCam,
      cutout: screen === 'studio' && cutout(now), orb: screen === 'studio' && !showCam ? { x: 0.5, y: 0.5, r: 0.11 } : null, dim: screen === 'studio' ? 1 : 0.72 });
    if (rec && rec.isVideo) {
      const el = (now - rec.t0) / 1000;
      composite(now, el);
      if (!rec.thumb && el > 4.4) rec.thumb = snapThumb();
    }
    // the phone keeping up: fewer pixels and less sky detail if frames run long
    if (screen === 'studio') {
      if (dt > 0.05) slowFrames++; else if (dt < 0.036) fastFrames++;
      if (slowFrames > 45 && quality < 2 && !window.__studioNoGovern) { quality++; slowFrames = 0; fit(); universe.quality(quality); }
      if (fastFrames > 600) { fastFrames = 0; slowFrames = Math.max(0, slowFrames - 10); }
    }
  }
  if (screen === 'studio') paintBeat(pos, info, now);
}
function paintBeat(pos, info, now) {
  // count-in
  if (pos && pos.bar < 0) {
    if ($('#secName').textContent !== 'Count-in') { $('#secName').textContent = 'Count-in'; $('#secBar').textContent = pendingRec ? 'recording next' : ''; }
    setBig(pos.bar === -1 ? String(4 - pos.beat) : 'GET IN PLACE', pos.bar === -1 ? (pendingRec ? 'recording' : '') : 'the song starts in 2 bars', pos.bar !== -1);
    paintDots(pos.beat);
    return;
  }
  if (!info) {
    if (secShown !== 'ready') {
      secShown = 'ready';
      $('#secName').textContent = 'Ready'; $('#secBar').textContent = 'Tap ▶ or a part'; $('#chordNow').textContent = '–'; $('#chordNext').innerHTML = '&nbsp;';
      $('#coming').hidden = true; $('#tlHead').style.left = '0%';
      tlBtns.forEach((b) => b.classList.remove('on'));
      if (!pendingRec) setBig('');
    }
    paintDots(-1);
  } else {
    const key = info.title + info.barIn + info.chord;
    if (secShown !== key) {
      secShown = key;
      $('#secName').textContent = info.title; $('#secBar').textContent = `bar ${info.barIn + 1} of ${info.bars}`;
      $('#chordNow').textContent = info.chord;
      $('#chordNext').textContent = info.next && info.next !== info.chord ? 'then ' + info.next : info.next ? 'stay' : 'the end';
      tlBtns.forEach((b, i) => b.classList.toggle('on', i === info.i));
      const c = $('#coming'), n = info.toChorus;
      if (n != null && n >= 2 && n <= 4 && info.kind !== 'chorus') {
        c.hidden = false; c.textContent = `${info.chorusLabel.toUpperCase()} IN ${n} BARS`; c.classList.toggle('drop', info.chorusLabel === 'Drop');
      } else c.hidden = true;
    }
    paintDots(pos.beat);
    if (tlForm) {
      const s = tlForm[info.i], total = formBars(tlForm);
      $('#tlHead').style.left = (((s.start + info.barIn + (pos.beat + pos.frac) / 4) / total) * 100).toFixed(2) + '%';
    }
    if (info.toChorus === 1) setBig(String(4 - pos.beat), info.chorusLabel.toUpperCase());
    else if (info.kind === 'chorus' && info.barIn === 0 && pos.beat === 0) setBig(info.chorusLabel.toUpperCase() + '!', '', true);
    else setBig('');
  }
  // the pitch you're singing
  const p = micOn && A && A.voice.pitch;
  if (p) {
    pitchAt = now;
    const pe = $('#pitch'); pe.hidden = false;
    $('#pitchSung').textContent = midiName(p.m); $('#pitchTo').textContent = midiName(p.tgt);
    $('#pitchNeedle').style.left = (21 + clamp((p.m - p.tgt) * 2, -1, 1) * 21).toFixed(1) + 'px';
  } else if (now - pitchAt > 700) $('#pitch').hidden = true;
  $('#micMeter').style.width = (vLevel * 100).toFixed(0) + '%';
  if (rec) $('#recTime').textContent = fmtTime((now - rec.t0) / 1000);
}
function paintDots(b) {
  if (b === beatShown) return;
  beatShown = b;
  const ds = $('#dots').children;
  for (let i = 0; i < 4; i++) ds[i].classList.toggle('on', i === b);
}

/* ---------- start ---------- */
show('home');
paintTitle(); buildTimeline();
requestAnimationFrame(frame);
if (!universe) $('#enterNote').textContent = 'This phone can\'t draw the universe (no WebGL 2), but the band and your voice still work';

// test hooks
window.__studio = {
  state: () => ({ screen, playing: !!(A && A.band.playing), bar: A && A.band.playing ? A.band.position(A.ctx.currentTime) : null, rec: !!rec, pendingRec, micOn, tracker: !!tracker, trackerFail, trackMs, quality, prefs: JSON.parse(JSON.stringify(prefs)), particles: universe ? universe.particles : 0, person: personSeen }),
  band: () => A && A.band, voice: () => A && A.voice, universe: () => universe, audio: () => A,
  pose: (pts) => takePose(pts, performance.now() / 1000),
  move: (type, x = 0.5, y = 0.4) => onMove({ type, x, y }),
};
