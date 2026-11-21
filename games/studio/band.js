/* Studio: the band. Plays what music.mjs says each bar holds with Web Audio: synthesized drums
   (five kits), piano and electric piano, four synths, a plucked-string guitar (Karplus-Strong, strummed
   string by string), bass and 808. A lookahead scheduler a beat at a time, so a change of key,
   tempo, instrument or groove lands on the next beat. Everything is made here; nothing downloads. */
import { barEvents, GENRES, formBars, sectionAt, songForm } from './music.mjs';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const KITS = {   // kick: start Hz, end Hz, decay s, click; snare: band Hz, decay s, body Hz; hats: highpass Hz
  pop: { kick: [150, 44, 0.42, 0.5], snare: [1900, 0.17, 190], hat: 7500 },
  edm: { kick: [170, 42, 0.5, 0.6], snare: [2100, 0.2, 200], hat: 8000 },
  trap: { kick: [165, 50, 0.24, 0.7], snare: [2300, 0.15, 215], hat: 8500 },
  rock: { kick: [122, 52, 0.3, 0.85], snare: [1700, 0.22, 180], hat: 6600 },
  dusty: { kick: [112, 48, 0.36, 0.35], snare: [1500, 0.2, 170], hat: 6000, lp: 5200 },
};
const GUITAR = { acoustic: [0.62, 3.0], clean: [0.42, 2.4], nylon: [0.32, 2.2], drive: [0.7, 3.6] };   // brightness, ring (s)

function makeNoise(ctx, secs = 2) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
export function makeIR(ctx, secs, pow = 2.4, pre = 0) {
  const n = Math.floor(ctx.sampleRate * secs), p = Math.floor(ctx.sampleRate * pre), b = ctx.createBuffer(2, n + p, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i + p] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, pow); }
  return b;
}
function crackleBuf(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * 0.04;
    if (Math.random() < 0.00025) { const a = (Math.random() * 0.8 + 0.2) * (Math.random() < 0.5 ? -1 : 1); for (let k = 0; k < 30 && i + k < d.length; k++) d[i + k] += a * Math.exp(-k / 5); }
  }
  return b;
}
function pianoWave(ctx) {   // a struck string's harmonics, softer up high
  const amp = [0, 1, 0.52, 0.34, 0.22, 0.15, 0.09, 0.07, 0.045, 0.03, 0.02];
  return ctx.createPeriodicWave(new Float32Array(amp.length), Float32Array.from(amp));
}
function softClip(k) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
  return c;
}
/* an envelope: up to peak in a, decays (time constant tau) until off, then lets go in rel */
function env(p, t, peak, a, off, tau, rel) {
  off = Math.max(off, t + a + 0.002);
  const held = Math.max(peak * Math.exp(-(off - t - a) / tau), 0.00012);
  p.setValueAtTime(0.0001, t);
  p.exponentialRampToValueAtTime(peak, t + a);
  p.exponentialRampToValueAtTime(held, off);
  p.exponentialRampToValueAtTime(0.0001, off + rel);
  return off + rel + 0.02;
}

export class Band {
  constructor(ctx, out, clickOut = out) {
    this.ctx = ctx; this.out = out; this.clickOut = clickOut;
    this.song = null; this.playing = false; this.bar = 0; this.beat = 0;
    this.marks = []; this.hits = []; this.fns = {}; this.ks = new Map();
    this.noise = makeNoise(ctx); this.pw = pianoWave(ctx); this.ir = makeIR(ctx, 1.7, 2.6);
    this.curve = softClip(10); this.curve808 = softClip(2.2);
    this.timer = 0;
  }
  on(name, fn) { (this.fns[name] ||= []).push(fn); }
  emit(name, data) { for (const fn of this.fns[name] || []) { try { fn(data); } catch (e) { console.error(e); } } }

  setSong(song) {
    const was = this.song;
    this.song = { ...song };
    this.genre = GENRES[this.song.genre] || GENRES.pop;
    this.kit = KITS[this.genre.kit] || KITS.pop;
    this.form = songForm(this.song);   // a hummed song: its own parts
    if (was && was.genre !== song.genre && this.playing) {
      if (!this.song.loop && this.bar >= formBars(this.form)) this.bar = this.form.find((s) => s.kind === 'verse').start;
      this.retone();
    }
    this.dirty = true;
    if (this.playing && this.echo) this.echo.delayTime.setTargetAtTime(Math.min(1.9, 0.75 * 60 / this.song.bpm), this.ctx.currentTime, 0.05);
  }

  /* one session of buses a play, so stopping cuts every note already on its way */
  buses() {
    const c = this.ctx, B = {};
    B.sess = c.createGain(); B.sess.connect(this.out);
    B.gap = c.createGain(); B.gap.connect(B.sess);
    B.filter = c.createBiquadFilter(); B.filter.type = 'lowpass'; B.filter.frequency.value = 20000; B.filter.Q.value = 0.8; B.filter.connect(B.gap);
    B.pre = c.createGain(); B.pre.connect(B.filter);
    B.drums = c.createGain(); B.drums.gain.value = 0.8;
    B.chords = c.createGain(); B.chords.gain.value = 0.62;
    B.duckC = c.createGain(); B.chords.connect(B.duckC); B.duckC.connect(B.pre);
    B.bass = c.createGain(); B.bass.gain.value = 0.8;
    B.duckB = c.createGain(); B.bass.connect(B.duckB); B.duckB.connect(B.pre);
    B.arp = c.createGain(); B.arp.gain.value = 0.6; B.arp.connect(B.pre);
    B.echo = c.createDelay(2); B.echo.delayTime.value = Math.min(1.9, 0.75 * 60 / this.song.bpm);
    const fb = c.createGain(); fb.gain.value = 0.32; const eLp = c.createBiquadFilter(); eLp.frequency.value = 3200;
    const eOut = c.createGain(); eOut.gain.value = 0.4;
    B.arp.connect(B.echo); B.echo.connect(eLp); eLp.connect(fb); fb.connect(B.echo); eLp.connect(eOut); eOut.connect(B.pre);
    this.echo = B.echo;
    B.rev = c.createConvolver(); B.rev.buffer = this.ir;
    B.revSend = c.createGain(); B.revSend.connect(B.rev);
    const revOut = c.createGain(); revOut.gain.value = 0.3; B.rev.connect(revOut); revOut.connect(B.pre);
    B.chords.connect(B.revSend); B.arp.connect(B.revSend);
    B.drive = c.createWaveShaper(); B.drive.curve = this.curve; B.drive.oversample = '2x';
    const cab = c.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 3600; cab.Q.value = 0.9;
    const dg = c.createGain(); dg.gain.value = 0.42; B.drive.connect(cab); cab.connect(dg); dg.connect(B.chords);
    B.sub = c.createWaveShaper(); B.sub.curve = this.curve808; const subOut = c.createGain(); subOut.gain.value = 0.3; B.sub.connect(subOut); subOut.connect(B.bass);
    B.drumOut = B.drums;
    this.B = B;
    this.retone();
    return B;
  }
  // the kit's color: dusty genres go through a soft, dark tape; lo-fi gets vinyl crackle
  retone() {
    const B = this.B, c = this.ctx;
    if (!B) return;
    try { B.drums.disconnect(); } catch { /* new */ }
    if (B.tape) { try { B.tape.disconnect(); } catch { /* gone */ } B.tape = null; }
    if (this.kit.lp) {
      B.tape = c.createBiquadFilter(); B.tape.type = 'lowpass'; B.tape.frequency.value = this.kit.lp;
      B.drums.connect(B.tape); B.tape.connect(B.pre);
    } else B.drums.connect(B.pre);
    B.drums.connect(B.revSend);
    if (B.crackle) { try { B.crackle.stop(); } catch { /* stopped */ } B.crackle = null; }
    if (this.genre.crackle) {
      const s = c.createBufferSource(); s.buffer = this.crackle ||= crackleBuf(c); s.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.5;
      const g = c.createGain(); g.gain.value = 0.55;
      s.connect(bp); bp.connect(g); g.connect(B.sess); s.start(); B.crackle = s;
    }
  }

  get grid() { return this.genre.grid || 16; }
  play(fromBar = 0, { countIn = 0, at = 0 } = {}) {
    if (!this.song) return;
    this.stop(true);
    const c = this.ctx;
    this.buses();
    this.playing = true; this.endAt = 0; this.cueBar = null; this.endBar = null;
    this.bar = fromBar - countIn; this.beat = 0; this.marks = []; this.barEv = null;
    this.nextT = Math.max(at, c.currentTime + 0.06);
    this.B.filter.frequency.setValueAtTime(20000, this.nextT);
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
    this.emit('play', { bar: fromBar });
  }
  stop(quiet) {
    if (this.timer) clearInterval(this.timer);
    this.timer = 0;
    const B = this.B, c = this.ctx;
    if (B) {
      const t = c.currentTime;
      B.sess.gain.cancelScheduledValues(t); B.sess.gain.setValueAtTime(B.sess.gain.value, t); B.sess.gain.linearRampToValueAtTime(0, t + 0.06);
      if (B.crackle) { try { B.crackle.stop(t + 0.1); } catch { /* stopped */ } }
      setTimeout(() => { try { B.sess.disconnect(); } catch { /* gone */ } }, 4000);
      this.B = null;
    }
    const was = this.playing;
    this.playing = false;
    if (was && !quiet) this.emit('stop', {});
  }
  cue(bar) { if (this.playing) this.cueBar = bar; }

  tick() {
    const c = this.ctx, ahead = c.currentTime + 0.3;
    if (this.endAt && c.currentTime >= this.endAt) { this.stop(true); this.emit('end', {}); return; }
    while (this.playing && !this.endAt && this.nextT < ahead) {
      const bpm = this.song.bpm, beatDur = 60 / bpm, grid = this.grid, beatLen = grid / 4, stepDur = beatDur / beatLen;
      const t0 = this.nextT;
      if (this.bar < 0) {   // the count-in: clicks (the speakers only, never the recording)
        this.click(t0, this.beat === 0 ? 1 : 0.6);
      } else {
        if (this.beat === 0 || this.dirty || !this.barEv) { this.barEv = barEvents(this.song, this.bar, this.endBar); this.dirty = false; }
        for (const e of this.barEv) {
          if (e.step < this.beat * beatLen || e.step >= (this.beat + 1) * beatLen) { if (!(e.step >= grid && this.beat === 3)) continue; }
          const t = t0 + (this.swing(e.step) - this.beat * beatLen) * stepDur;
          try { this.play1(e, t, stepDur, beatDur); } catch (err) { console.error(err); }
        }
      }
      this.marks.push({ t: t0, bar: this.bar, beat: this.beat, bpm, grid });
      if (this.marks.length > 48) this.marks.splice(0, this.marks.length - 48);
      if (this.beat === 0) this.emit('bar', { bar: this.bar, t: t0 });
      this.beat++; this.nextT += beatDur;
      if (this.beat === 4) {
        this.beat = 0;
        if (this.bar < 0) this.bar++;
        else if (this.cueBar != null) { this.bar = this.cueBar; this.cueBar = null; }
        else {
          const n = this.nextBarOf(this.bar);
          if (n < 0) { this.endAt = this.endAt || this.nextT + 2.6; break; }
          this.bar = n;
        }
      }
    }
  }
  /* the bar after this one: a sing-along loop goes on until its clip's last chord (`endBar`) */
  nextBarOf(bar) {
    if (this.song.loop) return this.endBar != null && bar >= this.endBar ? -1 : bar + 1;
    const form = this.form, n = bar + 1, at = sectionAt(form, n);
    if (this.song.keepGoing && (!at || at.s.kind === 'outro')) { const v = form.filter((s) => s.kind === 'verse'); return (v[1] || v[0]).start; }
    return at ? n : -1;
  }
  swing(step) {
    const g = this.genre, grid = this.grid;
    if (grid !== 16) return step;
    const i = Math.round(step);
    if (Math.abs(step - i) > 1e-3) return step;
    if (g.swing16 && i % 2 === 1) return step + g.swing16 / 3;
    if (g.swing8 && i % 4 === 2) return step + g.swing8 * 2 / 3;
    if (g.swing8 && i % 2 === 1) return step + g.swing8 / 3;
    return step;
  }
  hit(t, v) { this.hits.push({ t, v }); if (this.hits.length > 80) this.hits.splice(0, 20); }
  // seconds since the last of these hits was heard (Infinity if none lately)
  since(kinds, now) {
    for (let i = this.hits.length - 1; i >= 0; i--) { const h = this.hits[i]; if (h.t <= now && kinds.includes(h.v)) return now - h.t; }
    return Infinity;
  }
  /* where the song is at audio time `now`: bar, beat, how far into the beat */
  position(now) {
    let m = null;
    for (let i = this.marks.length - 1; i >= 0; i--) if (this.marks[i].t <= now) { m = this.marks[i]; break; }
    if (!m) return null;
    const beatDur = 60 / m.bpm;
    return { bar: m.bar, beat: m.beat, frac: Math.min(1, (now - m.t) / beatDur), bpm: m.bpm, t: m.t };
  }
  // the next sixteenth (for a clap from the camera) and the next bar line
  nextStep(now) {
    const p = this.playing && this.position(now);
    if (!p) return now + 0.01;
    const stepDur = 60 / p.bpm / 4, k = Math.ceil((now - p.t) / stepDur - 0.15);
    return p.t + Math.max(0, k) * stepDur;
  }
  nextBarTime(now) {
    const p = this.playing && this.position(now);
    if (!p) return null;
    return p.t + (4 - p.beat) * 60 / p.bpm;
  }

  /* ---- one event ---- */
  play1(e, t, stepDur, beatDur) {
    const B = this.B;
    if (!B) return;
    // the page was busy and this note's moment slipped by: a little late still plays, more is dropped
    const now = this.ctx.currentTime;
    if (t < now && e.t !== 'f') { if (now - t > 0.06) return; t = now + 0.003; }
    if (e.t === 'd') this.drum(e.v, t, e.vel);
    else if (e.t === 'c') {
      const dur = e.dur * stepDur;
      if (GUITAR[e.tone]) this.strum(t, e.notes, dur, e.vel, e.tone, e.strum, e.mute, e.pad);
      else if (e.tone === 'grand' || e.tone === 'ep') this.keys(t, e.notes, dur, e.vel, e.tone, e.pad ? 0.018 : 0);
      else this.synth(t, e.notes, dur, e.vel, e.tone, e.pad);
      this.hit(t, 'chord');
    } else if (e.t === 'b') this.bassNote(t, e.note, e.dur * stepDur, e.vel, e.b808, e.glide);
    else if (e.t === 'a') this.arpNote(t, e.note, e.dur * stepDur, e.vel, e.tone);
    else if (e.t === 'f') this.effect(e, t, beatDur);
  }
  drum(v, t, vel) {
    if (v === 'k') { this.kick(t, vel); if (this.genre.sidechain) this.duck(t); }
    else if (v === 's') this.snare(t, vel);
    else if (v === 'c') this.clap(t, vel);
    else if (v === 'h') this.hat(t, vel, false);
    else if (v === 'o') this.hat(t, vel, true);
    else if (v === 'r') this.rim(t, vel);
    else if (v === 'p') this.shaker(t, vel);
    else if (v === 'x') this.crash(t, vel);
    if (v === 'k' || v === 's' || v === 'c' || v === 'x') this.hit(t, v);
  }
  noiseHit(t, v, dur, type, freq, dest, q = 0.7, pan = 0, attack = 0) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + attack); }
    else g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    s.connect(f); f.connect(g);
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest); } else g.connect(dest);
    s.start(t, Math.random() * 1.4); s.stop(t + attack + dur + 0.03);
    return g;
  }
  tone(t, type, f0, f1, glideT, v, dur, dest) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glideT);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.03);
    return g;
  }
  kick(t, v) {
    const [f0, f1, dec, click] = this.kit.kick, d = this.B.drums;
    this.tone(t, 'sine', f0, f1, 0.07, v * 0.85, dec, d);
    this.noiseHit(t, v * click * 0.45, 0.012, 'highpass', 1800, d);
  }
  snare(t, v) {
    const [bp, dec, body] = this.kit.snare, d = this.B.drums;
    this.noiseHit(t, v * 0.62, dec, 'bandpass', bp, d, 0.55);
    this.noiseHit(t, v * 0.22, dec * 0.75, 'highpass', 5500, d);
    this.tone(t, 'triangle', body * 1.25, body, 0.03, v * 0.42, 0.11, d);
  }
  clap(t, v) {
    const d = this.B.drums;
    for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.011, v * 0.55, 0.028, 'bandpass', 1250, d, 1.3);
    this.noiseHit(t + 0.03, v * 0.5, 0.2, 'bandpass', 1150, d, 0.9);
  }
  hat(t, v, open) { this.noiseHit(t, v * (open ? 0.2 : 0.24), open ? 0.3 : 0.045, 'highpass', this.kit.hat, this.B.drums, 0.7, 0.22); }
  rim(t, v) {
    this.tone(t, 'triangle', 1750, 1700, 0.01, v * 0.3, 0.035, this.B.drums);
    this.noiseHit(t, v * 0.25, 0.02, 'bandpass', 3200, this.B.drums, 2);
  }
  shaker(t, v) { this.noiseHit(t, v * 0.14, 0.06, 'bandpass', 6200, this.B.drums, 1.4, -0.3, 0.012); }
  crash(t, v) {
    this.noiseHit(t, v * 0.3, 1.7, 'highpass', 4600, this.B.drums, 0.5, 0.1);
    this.noiseHit(t, v * 0.14, 1.1, 'bandpass', 7800, this.B.drums, 0.8, -0.15);
  }
  // a click on the speaker path (never recorded); `hz` pitches it (the hum's click on the song's key)
  click(t, v, hz = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.value = hz || (v >= 1 ? 1760 : 1320);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(this.clickOut); o.start(t); o.stop(t + 0.1);
    return o;
  }
  duck(t) {
    for (const p of [this.B.duckC.gain, this.B.duckB.gain]) { p.setValueAtTime(0.28, t + 0.002); p.setTargetAtTime(1, t + 0.03, 0.085); }
  }

  /* keys: a struck piano string (its harmonics, darker as it rings) or an electric piano (FM tine) */
  keys(t, notes, dur, vel, tone, spread) {
    const c = this.ctx, dest = this.B.chords, n = notes.length;
    notes.forEach((m, i) => {
      const f = mtof(m), ti = t + i * spread, peak = vel * 0.2 / Math.sqrt(n * 0.55 + 0.45);
      const g = c.createGain();
      if (tone === 'grand') {
        const o = c.createOscillator(); o.setPeriodicWave(this.pw); o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 5;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(Math.min(15000, f * (5 + vel * 7)), ti); lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 2.4), ti + 1.5);
        const tau = 0.5 + 1.6 * Math.max(0, (88 - m) / 50);
        const end = env(g.gain, ti, peak, 0.004, ti + Math.max(0.18, dur), tau, 0.14);
        o.connect(lp); lp.connect(g); o.start(ti); o.stop(end);
      } else {
        const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain();
        car.frequency.value = f; mod.frequency.value = f; car.detune.value = (Math.random() - 0.5) * 6;
        mg.gain.setValueAtTime(f * (0.6 + vel * 1.1), ti); mg.gain.exponentialRampToValueAtTime(f * 0.12, ti + 0.7);
        mod.connect(mg); mg.connect(car.frequency);
        const end = env(g.gain, ti, peak * 1.1, 0.003, ti + Math.max(0.2, dur), 1.4, 0.16);
        car.connect(g); car.start(ti); mod.start(ti); car.stop(end); mod.stop(end);
      }
      g.connect(dest);
    });
  }
  /* synths: two detuned saws through a plucky filter, a seven-voice-ish supersaw, an FM bell, a warm pad */
  synth(t, notes, dur, vel, tone, pad) {
    const c = this.ctx, dest = this.B.chords, n = notes.length;
    notes.forEach((m, i) => {
      const f = mtof(m), g = c.createGain(), lp = c.createBiquadFilter(), oscs = [];
      lp.type = 'lowpass';
      const off = t + Math.max(0.12, dur * (pad ? 1 : 0.92));
      let end;
      if (tone === 'saw' || tone === 'supersaw') {
        const det = tone === 'saw' ? [-8, 8] : [-16, -5, 6, 15];
        for (const d of det) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d + (Math.random() - 0.5) * 3; oscs.push(o); }
        const peak = vel * (tone === 'saw' ? 0.2 : 0.13) / Math.sqrt(n * 0.5 + 0.5);
        if (tone === 'saw') { lp.Q.value = 2.5; lp.frequency.setValueAtTime(Math.min(9000, f * 10 * (0.5 + vel)), t); lp.frequency.exponentialRampToValueAtTime(Math.max(600, f * 3), t + (pad ? 1.5 : 0.28)); }
        else { lp.Q.value = 0.7; lp.frequency.value = pad ? 2400 : 7500; }
        end = env(g.gain, t, peak, pad ? 0.25 : tone === 'supersaw' ? 0.012 : 0.006, off, tone === 'supersaw' || pad ? 40 : 3, pad ? 0.6 : 0.16);
      } else if (tone === 'bell') {
        const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain();
        car.frequency.value = f; mod.frequency.value = f * 2; mg.gain.setValueAtTime(f * (1.2 + vel * 2), t); mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 1);
        mod.connect(mg); mg.connect(car.frequency); oscs.push(car, mod);
        lp.frequency.value = 9000;
        end = env(g.gain, t, vel * 0.26 / Math.sqrt(n * 0.5 + 0.5), 0.003, off, pad ? 3 : 1.1, 0.35);
        car.connect(lp); oscs.length = 0; car.start(t); mod.start(t); car.stop(end); mod.stop(end);
      } else {   // warm
        for (const [type, d] of [['triangle', -4], ['sine', 5]]) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = d; oscs.push(o); }
        lp.frequency.value = 1700; lp.Q.value = 0.5;
        end = env(g.gain, t, vel * 0.24 / Math.sqrt(n * 0.5 + 0.5), pad ? 0.35 : 0.05, off, 12, pad ? 0.7 : 0.35);
      }
      for (const o of oscs) { o.connect(lp); o.start(t); o.stop(end); }
      lp.connect(g);
      if (c.createStereoPanner && n > 1) { const p = c.createStereoPanner(); p.pan.value = (i / (n - 1) - 0.5) * 0.5; g.connect(p); p.connect(dest); } else g.connect(dest);
    });
  }
  /* guitar: Karplus-Strong strings (each note's pluck made once and kept), strummed down or up */
  ksBuf(m, tone) {
    const key = m + ':' + tone;
    let e = this.ks.get(key);
    if (e) return e;
    const c = this.ctx, sr = c.sampleRate, f = mtof(m), [bright, ring] = GUITAR[tone] || GUITAR.acoustic;
    const Nf = sr / f, N = Math.max(2, Math.floor(Nf)), len = Math.floor(sr * Math.min(ring, 2.6));
    const buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0), line = new Float32Array(N);
    let lp = 0;
    for (let i = 0; i < N; i++) { lp += ((Math.random() * 2 - 1) - lp) * bright; line[i] = lp; }
    // pluck position: a comb takes out some harmonics, as a pick a fifth of the way along does
    const pick = Math.max(1, Math.round(N / 5)), ex = line.slice();
    for (let i = 0; i < N; i++) line[i] = ex[i] - 0.6 * ex[(i + pick) % N];
    const loss = Math.pow(10, -3 / (ring * f)), s = 0.5;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const a = line[idx], b = line[(idx + 1) % N];
      d[i] = a;
      line[idx] = (a * (1 - s) + b * s) * loss;
      idx = (idx + 1) % N;
    }
    let peak = 0; for (let i = 0; i < Math.min(len, 4000); i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;
    e = { buf, rate: N / Nf };
    if (this.ks.size > 160) this.ks.delete(this.ks.keys().next().value);
    this.ks.set(key, e);
    return e;
  }
  warm(notes, tone) { for (const m of notes) this.ksBuf(m, tone); }
  strum(t, notes, dur, vel, tone, dir, mute, pad) {
    const c = this.ctx, dest = tone === 'drive' ? this.B.drive : this.B.chords;
    const order = dir === 'u' ? notes.slice(-4).reverse() : notes, spread = pad ? 0.03 : dir === 'u' ? 0.009 : 0.014;
    order.forEach((m, i) => {
      const ti = t + i * spread, { buf, rate } = this.ksBuf(m, tone);
      const s = c.createBufferSource(), g = c.createGain();
      s.buffer = buf; s.playbackRate.value = rate;
      const peak = vel * (tone === 'drive' ? 0.4 : 1) / Math.sqrt(order.length * 0.6) * (dir === 'u' ? 0.72 : 1);
      const off = mute ? ti + 0.1 : ti + Math.min(buf.duration - 0.1, Math.max(0.16, dur));
      g.gain.setValueAtTime(peak, ti); g.gain.setValueAtTime(peak, off); g.gain.exponentialRampToValueAtTime(0.0001, off + (mute ? 0.05 : 0.1));
      let node = s;
      if (mute) { const lp = c.createBiquadFilter(); lp.frequency.value = 1100; s.connect(lp); node = lp; }
      node.connect(g);
      if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = (i / Math.max(1, order.length - 1) - 0.5) * 0.6; g.connect(p); p.connect(dest); } else g.connect(dest);
      s.start(ti); s.stop(off + 0.15);
    });
  }
  arpNote(t, m, dur, vel, tone) {
    const c = this.ctx, dest = this.B.arp, f = mtof(m);
    if (tone === 'pluckGuitar') {
      const { buf, rate } = this.ksBuf(m, 'clean'), s = c.createBufferSource(), g = c.createGain();
      s.buffer = buf; s.playbackRate.value = rate; g.gain.setValueAtTime(vel * 0.95, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      s.connect(g); g.connect(dest); s.start(t); s.stop(t + 1); return;
    }
    if (tone === 'grand') { this.keysTo(dest, t, [m], dur, vel); return; }
    if (tone === 'bell') {
      const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
      car.frequency.value = f; mod.frequency.value = f * 3.01; mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.1, t + 0.6);
      mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(dest);
      const end = env(g.gain, t, vel * 0.3, 0.002, t + dur + 0.2, 0.5, 0.3);
      car.start(t); mod.start(t); car.stop(end); mod.stop(end); return;
    }
    const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(6000, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.2);
    const end = env(g.gain, t, vel * 0.22, 0.002, t + dur, 0.3, 0.1);
    o.connect(lp); lp.connect(g); g.connect(dest); o.start(t); o.stop(end);
  }
  keysTo(dest, t, notes, dur, vel) {
    const keep = this.B.chords;
    this.B.chords = dest;
    try { this.keys(t, notes, dur, vel, 'grand', 0); } finally { this.B.chords = keep; }
  }
  /* bass: electric (sine and a filtered saw), synth bass (EDM), upright (jazzy and old-time), 808 */
  bassNote(t, m, dur, vel, b808, glide) {
    const c = this.ctx, f = mtof(m), g = c.createGain(), kit = this.genre.kit, id = this.song.genre;
    if (b808) {
      const o = c.createOscillator();
      o.frequency.setValueAtTime(f * 1.3, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
      if (glide != null) { o.frequency.setValueAtTime(f, t + dur * 0.55); o.frequency.exponentialRampToValueAtTime(mtof(glide), t + dur * 0.55 + 0.09); }
      const end = env(g.gain, t, vel * 0.55, 0.004, t + Math.max(0.25, dur), 3, 0.08);
      o.connect(g); g.connect(this.B.sub); o.start(t); o.stop(end); return;
    }
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    const oscs = [];
    let end;
    if (kit === 'edm') {
      const a = c.createOscillator(), b = c.createOscillator(); a.type = 'sawtooth'; b.type = 'square'; a.frequency.value = f; b.frequency.value = f / 2;
      oscs.push([a, 0.5], [b, 0.35]); lp.Q.value = 6; lp.frequency.setValueAtTime(2200, t); lp.frequency.exponentialRampToValueAtTime(320, t + 0.2);
      end = env(g.gain, t, vel * 0.55, 0.003, t + Math.max(0.1, dur * 0.9), 2, 0.05);
    } else if (kit === 'dusty' || id === 'blues' || id === 'doowop') {
      const a = c.createOscillator(), b = c.createOscillator(); a.type = 'sine'; b.type = 'triangle'; a.frequency.setValueAtTime(f * 1.015, t); a.frequency.exponentialRampToValueAtTime(f, t + 0.05); b.frequency.value = f * 2;
      oscs.push([a, 1], [b, 0.18]); lp.frequency.value = 900;
      end = env(g.gain, t, vel * 0.45, 0.008, t + Math.max(0.12, dur), 0.7, 0.08);
    } else {
      const a = c.createOscillator(), b = c.createOscillator(); a.type = 'sine'; b.type = 'sawtooth'; a.frequency.value = f; b.frequency.value = f;
      oscs.push([a, 0.85], [b, 0.22]); lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.25);
      end = env(g.gain, t, vel * 0.42, 0.005, t + Math.max(0.1, dur * 0.95), 1.4, 0.06);
    }
    for (const [o, lvl] of oscs) { const og = c.createGain(); og.gain.value = lvl; o.connect(og); og.connect(lp); o.start(t); o.stop(end); }
    lp.connect(g); g.connect(this.B.bass);
  }
  effect(e, t, beatDur) {
    const B = this.B, c = this.ctx, barDur = beatDur * 4, f = B.filter.frequency;
    if (e.k === 'filter') {
      f.cancelScheduledValues(t);
      if (e.kind === 'intro') { f.setValueAtTime(450, t); f.exponentialRampToValueAtTime(18000, t + e.bars * barDur); }
      else if (e.kind === 'outro') { f.setValueAtTime(18000, t); f.exponentialRampToValueAtTime(380, t + e.bars * barDur + barDur); }
      else if (e.kind === 'bridge') { f.setValueAtTime(20000, t); f.exponentialRampToValueAtTime(2200, t + barDur); }
      else f.setValueAtTime(20000, t);
    } else if (e.k === 'riser') {
      const dur = e.bars * barDur, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise; s.loop = true; bp.type = 'bandpass'; bp.Q.value = 4;
      bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + dur); g.gain.setValueAtTime(0.0001, t + dur + 0.01);
      s.connect(bp); bp.connect(g); g.connect(B.pre); s.start(t); s.stop(t + dur + 0.05);
      const o = c.createOscillator(), og = c.createGain();
      o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(1100, t + dur);
      og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.035, t + dur); og.gain.setValueAtTime(0.0001, t + dur + 0.01);
      o.connect(og); og.connect(B.pre); o.start(t); o.stop(t + dur + 0.05);
      this.hit(t, 'riser');
    } else if (e.k === 'gap') {
      B.gap.gain.setValueAtTime(1, t - 0.005); B.gap.gain.linearRampToValueAtTime(0, t + 0.01); B.gap.gain.setValueAtTime(0, t + beatDur - 0.004); B.gap.gain.linearRampToValueAtTime(1, t + beatDur);
    } else if (e.k === 'end') {
      this.endAt = t + (e.tail ?? 2.6);
    }
  }

  /* moves from the camera: a clap on the next sixteenth, a cymbal swell into the next bar */
  moveClap(now) { if (!this.B) return; const t = this.nextStep(now); this.clap(t, 0.85); this.hit(t, 'c'); }
  moveSwell(now) {
    if (!this.B) return null;
    const t1 = this.nextBarTime(now);
    if (!t1 || t1 - now < 0.25) return null;
    const c = this.ctx, s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true; hp.type = 'highpass'; hp.frequency.value = 3500;
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.16, t1); g.gain.setValueAtTime(0.0001, t1 + 0.005);
    s.connect(hp); hp.connect(g); g.connect(this.B.drums); s.start(now); s.stop(t1 + 0.02);
    this.crash(t1, 0.8); this.hit(t1, 'x');
    return t1;
  }
}
