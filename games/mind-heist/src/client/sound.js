// Music and sound effects.
// - Menus and lobbies: JC's menu-theme.mp3. The haul reveal (final screen) plays it too for
//   the winners and the big screen; the crew that lost gets the bleak loop instead.
// - Live play: the Arcade band (arcade.js), synthesized: 'arcade:board', 'arcade:ask',
//   'arcade:hot' (last seconds), 'arcade:drop' (after a right answer), 'bleak' (after a miss).
// - Sudden death: JC's theme.mp3 ("The Edge of the Clock").
// Everything runs through Web Audio because iOS ignores HTMLAudioElement.volume.
// iPhone + Open mic: when the mic opens, iOS changes the audio hardware's sample rate and an
// AudioContext made before that crackles like static. So the context is closed before the
// mic opens and rebuilt after (beforeMic / afterMic), and music stays off while on air.
import { createArcade, stings } from './arcade.js';
import { asset } from './base.js';

const KEY = 'mh.sound';
let on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}

let ctx = null, master = null, sfxBus = null, musicBus = null, arcade = null, st = null;
const tracks = {};       // mp3 name -> { el, gain }
let want = null;         // what the screen wants: an mp3 name, 'arcade:<mode>', 'bleak' or null
let talk = false;        // Open mic is on air: music off, effects quieter
let holdUntil = 0;       // a hype sting is building to its drop: keep the band quiet until then
let micBusy = false;     // the context is closed while the mic opens
let rebuilds = 0;        // how many times the engine was rebuilt for the mic (tests read it)
const listeners = new Set();

function ensure() {
  if (micBusy) return null;
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  // A gentle limiter so a horn on top of the drop can't clip a phone speaker.
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
  lim.connect(ctx.destination);
  master = ctx.createGain(); master.gain.value = on ? 1 : 0; master.connect(lim);
  sfxBus = ctx.createGain(); sfxBus.gain.value = talk ? 0.5 : 0.9; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = talk ? 0 : 1; musicBus.connect(master);
  arcade = createArcade(ctx, musicBus);
  st = stings(ctx, sfxBus);
  return ctx;
}

function track(name) {
  if (tracks[name]) return tracks[name];
  const c = ensure(); if (!c) return null;
  const el = new Audio(asset(`${name}.mp3`));
  el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous';
  const src = c.createMediaElementSource(el);
  const gain = c.createGain(); gain.gain.value = 0;
  src.connect(gain).connect(musicBus);
  return (tracks[name] = { el, gain });
}

const BASE = { 'menu-theme': 0.32, theme: 0.36 };
// Levels matched by ear-and-meter to JC's mp3s (about -25 dB RMS at their volume).
const BAND = { board: 0.85, ask: 0.72, hot: 0.8, drop: 0.95, bleak: 0.75 };
const isBand = (n) => !!n && (n.startsWith('arcade:') || n === 'bleak');

function apply(fade = 0.6) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (want && !isBand(want)) track(want);
  for (const [name, tr] of Object.entries(tracks)) {
    const target = name === want ? BASE[name] : 0;
    tr.gain.gain.cancelScheduledValues(t);
    tr.gain.gain.setValueAtTime(tr.gain.gain.value, t);
    tr.gain.gain.linearRampToValueAtTime(target, t + fade);
    if (target > 0 && tr.el.paused) tr.el.play().catch(() => {});
    if (target === 0 && !tr.el.paused) setTimeout(() => { if (want !== name) tr.el.pause(); }, fade * 1000 + 60);
  }
  if (isBand(want) && Date.now() >= holdUntil) {
    const mode = want === 'bleak' ? 'bleak' : want.slice(7);
    if (arcade.mode !== mode) arcade.set(mode, BAND[mode] || 0.5);
  } else if (arcade && arcade.mode && !(isBand(want) && Date.now() < holdUntil && want === 'arcade:drop')) arcade.stop(isBand(want) ? 0.12 : 0.5);
}

export const Sound = {
  get on() { return on; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  // Call from any user gesture so browsers allow audio.
  unlock() { const c = ensure(); if (c && want) apply(); },
  music(name) {
    if (name === want) return;
    want = name;
    if (!ctx) return; // starts on the first tap
    apply();
  },
  // Open mic on air: music off so the crew can hear each other; effects quieter.
  voice(onAir) {
    talk = !!onAir;
    if (!ctx) return;
    const t = ctx.currentTime;
    musicBus.gain.setTargetAtTime(talk ? 0 : 1, t, 0.15);
    sfxBus.gain.setTargetAtTime(talk ? 0.5 : 0.9, t, 0.15);
  },
  // iPhone: close the audio engine before the mic opens, rebuild it after (see top).
  async beforeMic() {
    micBusy = true;
    const old = ctx;
    if (arcade) arcade.kill();
    for (const k of Object.keys(tracks)) { try { tracks[k].el.pause(); } catch (e) {} delete tracks[k]; }
    ctx = null; master = sfxBus = musicBus = arcade = st = null;
    if (old) { try { await old.close(); } catch (e) {} }
  },
  afterMic(onAir) {
    micBusy = false;
    rebuilds++;
    talk = !!onAir;
    if (ensure()) apply(0.3);
  },
  toggle() {
    on = !on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    const c = ensure();
    if (c) { master.gain.setTargetAtTime(on ? 1 : 0, c.currentTime, 0.05); apply(); }
    listeners.forEach(fn => fn(on));
    if (on) this.fx('tap');
  },
  fx(name, opt = {}) {
    if (!on) return;
    const c = ensure(); if (!c) return;
    const T = (f, d, o = {}) => tone(c, f, d, o);
    switch (name) {
      case 'tap': T(740, .06, { type: 'triangle', vol: .08 }); break;
      case 'slide': T(170, .07, { type: 'triangle', vol: .1, to: 120 }); T(90, .05, { type: 'square', vol: .03, at: .03 }); break;
      case 'jewel': [988, 1319, 1568, 1976].forEach((f, i) => T(f, .25, { type: 'triangle', vol: .09, at: i * .06 })); break;
      case 'flip': T(500, .05, { type: 'triangle', vol: .07, to: 900 }); T(1200, .06, { vol: .04, at: .05 }); break;
      case 'pick': st.zap(); break;
      case 'lock': T(220, .08, { type: 'square', vol: .06 }); T(330, .16, { type: 'triangle', vol: .1, at: .05 }); break;
      case 'join': T(660, .08, { vol: .09 }); T(990, .12, { vol: .08, at: .07 }); break;
      case 'tick': T(1250, .035, { type: 'square', vol: .035 }); break;
      // Right: air horns, a riser, then the band drops back in on the beat.
      case 'right': {
        const ms = st.hype(!!opt.big);
        holdUntil = Date.now() + ms;
        if (arcade && arcade.mode) arcade.stop(0.12);
        setTimeout(() => { if (ctx === c) apply(0.05); }, ms + 10);
        break;
      }
      // Wrong: the record scratches and the room goes cold (the band switches to bleak).
      case 'wrong': st.flop(); break;
      case 'lose': st.lose(); break;
      case 'horn': st.horn(0.35); break;
      case 'double': st.horn(0.18); [523, 659, 784, 1047, 1319].forEach((f, i) => T(f, .36, { type: 'triangle', vol: .1, at: .2 + i * .08 })); break;
      case 'hacker': for (let i = 0; i < 18; i++) T(180 + ((i * 197) % 900), .05, { type: 'square', vol: .045, at: i * .045 }); T(70, .9, { type: 'sawtooth', vol: .09, to: 45, at: .1 }); break;
      case 'timeout': T(523, .2, { type: 'triangle', vol: .1 }); T(392, .3, { type: 'triangle', vol: .1, at: .16 }); break;
      case 'pause': T(330, .14, { vol: .1 }); T(247, .24, { vol: .1, at: .12 }); break;
      case 'fifty': T(880, .08, { type: 'square', vol: .05 }); T(440, .12, { type: 'square', vol: .05, at: .08 }); break;
      case 'coin': for (let i = 0; i < 16; i++) T(1100 + (i % 2) * 280, .03, { type: 'square', vol: .03, at: i * (0.05 + i * .009) }); break;
      case 'land': T(523, .18, { type: 'triangle', vol: .12 }); T(784, .36, { type: 'triangle', vol: .1, at: .09 }); break;
      case 'react': T(990, .06, { vol: .05 }); break;
      // Face-off replay: a pick smacks into the grid like a pitch into the glove...
      case 'thud': T(150, .14, { type: 'square', vol: .1, to: 55 }); T(2400, .02, { type: 'triangle', vol: .04 }); T(70, .22, { type: 'sine', vol: .14, at: .01 }); break;
      // ...then the measuring chain rattles out to the times.
      case 'measure': for (let i = 0; i < 14; i++) T(420 + i * 55, .03, { type: 'square', vol: .03, at: i * .08 }); break;
      case 'win': st.horn(0.2); [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => T(f, .42, { type: 'triangle', vol: .11, at: .25 + i * .11 })); break;
      case 'badge': [880, 1175, 1568].forEach((f, i) => T(f, .25, { type: 'sine', vol: .09, at: i * .09 })); break;
    }
  },
  // For tests: what the engine is doing.
  state() { return { ctx: ctx ? ctx.state : null, rate: ctx ? ctx.sampleRate : null, want, band: arcade ? arcade.mode : null, talk, micBusy, rebuilds, music: musicBus ? musicBus.gain.value : null }; },
};

function tone(c, f, d, { type = 'sine', vol = .1, at = 0, to = null } = {}) {
  const t0 = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(sfxBus);
  o.start(t0); o.stop(t0 + d + 0.03);
}

// Any gesture (re)unlocks audio: browsers start contexts suspended, and a context rebuilt
// after the mic opens on an iPhone needs the next tap to start.
const kick = () => Sound.unlock();
window.addEventListener('pointerdown', kick);
window.addEventListener('keydown', kick);
if (typeof window !== 'undefined') window.__mhSound = Sound;
