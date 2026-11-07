// Arcade: a small chiptune band played live in Web Audio, plus DJ hype and bleak stings.
// No audio files: everything is synthesized, so it costs nothing to load.
//
// Modes (JC: video-game music in between, epic on right answers, bleak when it goes wrong):
//   board  full groove while a tile is being picked
//   ask    a tense, filtered version while a question is up
//   hot    ask plus double-time hats for the last seconds
//   drop   the full groove with the lead hook, right after a right answer
//   bleak  slow, cold, minor; after a wrong answer and for the crew that lost
const BPM = 126, STEP = 60 / BPM / 4;            // a 16th note
const BLEAK_BPM = 56, BLEAK_STEP = 60 / BLEAK_BPM / 4;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// A minor, i–VI–III–VII: the heroic loop every 8-bit boss level wishes it had.
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const BASS = [33, 29, 36, 31];
const LEAD = [
  [76, null, 81, null, 79, 76, null, 74],
  [72, null, 72, 74, 76, null, 72, null],
  [79, null, 76, null, 74, 72, null, 69],
  [71, null, 74, null, 79, null, 76, 74],
];
// D minor, i–VI–iv–V, very slow.
const BLEAK_CHORDS = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];
const BLEAK_MEL = [69, 65, 62, 61];

function pulse(ctx, duty) {
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return ctx.createPeriodicWave(re, im);
}
function noiseBuffer(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export function createArcade(ctx, out) {
  const bus = ctx.createGain(); bus.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 16000; lp.Q.value = 0.7;
  bus.connect(lp).connect(out);
  const bleakBus = ctx.createGain(); bleakBus.gain.value = 0; bleakBus.connect(out);
  const p12 = pulse(ctx, 0.125), p25 = pulse(ctx, 0.25);
  const noise = noiseBuffer(ctx);
  let mode = null, timer = null, nextT = 0, step = 0, bleakNext = 0, bleakStep = 0, level = 0.5;

  function note(dest, wave, f, t, d, vol, { attack = 0.004, release = 0.05, detune = 0, type = null } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    if (type) o.type = type; else o.setPeriodicWave(wave);
    o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, d - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(dest); o.start(t); o.stop(t + d + 0.02);
  }
  function hit(dest, t, { f = 8000, type = 'highpass', d = 0.05, vol = 0.1, q = 0.8 } = {}) {
    const s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(flt).connect(g).connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  }
  function kick(t, vol = 0.5) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 0.25);
  }

  function playStep(t, s) {
    const bar = Math.floor(s / 16) % 4, i = s % 16;
    const full = mode === 'board' || mode === 'drop';
    const chord = CHORDS[bar];
    // drums
    if (full ? i % 4 === 0 : i % 8 === 0) kick(t, mode === 'drop' ? 0.6 : 0.45);
    if (full && (i === 4 || i === 12)) { hit(bus, t, { f: 1800, type: 'bandpass', d: 0.14, vol: 0.22, q: 0.7 }); hit(bus, t, { f: 6000, d: 0.08, vol: 0.08 }); }
    if (!full && i === 12 && bar % 2 === 1) hit(bus, t, { f: 1800, type: 'bandpass', d: 0.1, vol: 0.12 });
    const hat = mode === 'hot' ? true : i % 2 === 0 && i % 4 !== 0;
    if (hat) hit(bus, t, { f: 9000, d: mode === 'hot' ? 0.03 : 0.045, vol: mode === 'hot' ? 0.07 : 0.06 });
    // octave bass on 8ths
    if (i % 2 === 0) note(bus, p25, mtof(BASS[bar] + (i % 4 === 2 ? 12 : 0)), t, STEP * 1.8, full ? 0.11 : 0.09);
    // arpeggio on 16ths
    const arp = [0, 1, 2, 1][i % 4];
    note(bus, p12, mtof(chord[arp] + 12), t, STEP * 0.9, full ? 0.035 : 0.03);
    // lead hook (and a fifth below on the drop)
    if (full && i % 2 === 0) {
      const m = LEAD[bar][i / 2];
      if (m && (mode === 'drop' || Math.floor(s / 64) % 2 === 1)) {
        note(bus, p25, mtof(m), t, STEP * 1.9, 0.06);
        if (mode === 'drop') note(bus, p12, mtof(m - 12), t, STEP * 1.9, 0.035, { detune: 8 });
      }
    }
  }
  function playBleak(t, s) {
    const bar = Math.floor(s / 16) % 4, i = s % 16;
    if (i === 0) {
      const d = BLEAK_STEP * 16;
      for (const m of BLEAK_CHORDS[bar]) for (const det of [-9, 9]) note(bleakBus, null, mtof(m), t, d, 0.03, { attack: 1.4, release: 1.2, detune: det, type: 'sawtooth' });
      note(bleakBus, null, mtof(38), t, d, 0.09, { attack: 0.8, release: 1, type: 'sine' });
      hit(bleakBus, t, { f: 500, type: 'bandpass', d: d, vol: 0.02, q: 2 });
    }
    if (i === 8) note(bleakBus, null, mtof(BLEAK_MEL[bar]), t, BLEAK_STEP * 8, 0.05, { attack: 0.05, release: 1.5, type: 'triangle' });
  }

  function tick() {
    const ahead = ctx.currentTime + 0.15;
    if (mode && mode !== 'bleak') {
      if (nextT < ctx.currentTime - 0.05) nextT = ctx.currentTime + 0.02;
      while (nextT < ahead) { playStep(nextT, step); nextT += STEP; step = (step + 1) % 128; }
    }
    if (mode === 'bleak') {
      if (bleakNext < ctx.currentTime - 0.05) bleakNext = ctx.currentTime + 0.02;
      while (bleakNext < ahead) { playBleak(bleakNext, bleakStep); bleakNext += BLEAK_STEP; bleakStep = (bleakStep + 1) % 64; }
    }
  }
  function fade(g, v, s = 0.4) { const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v, t + s); }
  function filterFor(m) {
    const t = ctx.currentTime, f = m === 'ask' ? 1300 : m === 'hot' ? 2600 : 16000;
    lp.frequency.cancelScheduledValues(t); lp.frequency.setValueAtTime(lp.frequency.value, t); lp.frequency.exponentialRampToValueAtTime(f, t + 0.35);
    lp.Q.value = m === 'ask' || m === 'hot' ? 4 : 0.7;
  }
  return {
    get mode() { return mode; },
    set(m, vol = level) {
      level = vol;
      if (!timer) timer = setInterval(tick, 25);
      if (m === 'bleak') {
        if (mode !== 'bleak') { bleakStep = 0; bleakNext = ctx.currentTime + 0.35; }
        fade(bus, 0, 0.25); fade(bleakBus, vol * 1.3, 1.2);
      } else {
        if (mode === 'bleak' || !mode) { step = m === 'drop' ? 0 : step; nextT = ctx.currentTime + 0.05; }
        if (m === 'drop' && mode !== 'drop') { step = 0; nextT = ctx.currentTime + 0.05; }
        filterFor(m); fade(bleakBus, 0, 0.5); fade(bus, vol, mode === 'bleak' ? 0.8 : 0.3);
      }
      mode = m;
      tick();
    },
    stop(s = 0.5) {
      if (!mode) return;
      fade(bus, 0, s); fade(bleakBus, 0, s);
      mode = null;
      setTimeout(() => { if (!mode && timer) { clearInterval(timer); timer = null; } }, s * 1000 + 100);
    },
    kill() { if (timer) clearInterval(timer); timer = null; mode = null; },
  };
}

/* ---------- stings ---------- */
export function stings(ctx, out) {
  const noise = noiseBuffer(ctx);
  const n = (t, d, { f = 2000, type = 'bandpass', q = 1, vol = 0.1, sweep = null } = {}) => {
    const s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.loop = true; flt.type = type; flt.Q.value = q; flt.frequency.setValueAtTime(f, t);
    if (sweep) flt.frequency.exponentialRampToValueAtTime(sweep, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, d / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(flt).connect(g).connect(out); s.start(t); s.stop(t + d + 0.05);
  };
  const o = (t, d, f, { type = 'sawtooth', vol = 0.1, to = null, attack = 0.01, detune = 0 } = {}) => {
    const x = ctx.createOscillator(), g = ctx.createGain();
    x.type = type; x.frequency.setValueAtTime(f, t); x.detune.value = detune;
    if (to) x.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, d - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    x.connect(g).connect(out); x.start(t); x.stop(t + d + 0.02);
  };
  // Air horn: stacked saws with a little scoop up into the note.
  const hornBus = ctx.createBiquadFilter(); hornBus.type = 'lowpass'; hornBus.frequency.value = 3200; hornBus.connect(out);
  const horn = (t, d) => {
    for (const [mul, det, vol] of [[1, 0, 0.07], [1, 14, 0.06], [2, -6, 0.035], [1.5, 4, 0.03]]) {
      const x = ctx.createOscillator(), g = ctx.createGain();
      x.type = 'sawtooth'; x.detune.value = det;
      x.frequency.setValueAtTime(440 * mul * 0.92, t); x.frequency.exponentialRampToValueAtTime(466 * mul, t + 0.05);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.setValueAtTime(vol, t + d - 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      x.connect(g).connect(hornBus); x.start(t); x.stop(t + d + 0.02);
    }
  };
  const boom = (t, vol = 0.55) => {
    const x = ctx.createOscillator(), g = ctx.createGain();
    x.frequency.setValueAtTime(130, t); x.frequency.exponentialRampToValueAtTime(36, t + 0.6);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    x.connect(g).connect(out); x.start(t); x.stop(t + 1.15);
    n(t, 1.3, { f: 6000, type: 'highpass', vol: 0.06 });
    n(t, 0.18, { f: 1500, vol: 0.18 });
  };
  const scratch = (t, vol = 0.12) => {
    const pts = [[0, 300], [0.06, 1400], [0.12, 220], [0.2, 1100], [0.3, 160]];
    const x = ctx.createOscillator(), g = ctx.createGain(), flt = ctx.createBiquadFilter();
    x.type = 'sawtooth'; flt.type = 'bandpass'; flt.Q.value = 2;
    pts.forEach(([dt, f]) => { x.frequency.linearRampToValueAtTime(f, t + dt); flt.frequency.linearRampToValueAtTime(f * 2, t + dt); });
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    x.connect(flt).connect(g).connect(out); x.start(t); x.stop(t + 0.4);
    n(t, 0.34, { f: 900, sweep: 3000, q: 3, vol: vol * 0.6 });
  };
  return {
    // Right answer: two quick horn blasts and a long one, a riser, then the drop.
    hype(big = false) {
      const t = ctx.currentTime + 0.02;
      horn(t, 0.12); horn(t + 0.17, 0.12); horn(t + 0.34, big ? 0.6 : 0.42);
      const r = t + (big ? 0.5 : 0.4), rd = big ? 0.9 : 0.6;
      n(r, rd, { f: 300, sweep: 7000, q: 1.2, vol: 0.09 });
      o(r, rd, 180, { type: 'square', vol: 0.025, to: 1400, attack: rd * 0.8 });
      if (big) { scratch(r + rd - 0.3, 0.08); horn(r + rd + 0.5, 0.18); horn(r + rd + 0.72, 0.5); }
      boom(r + rd, big ? 0.65 : 0.55);
      return (r + rd - ctx.currentTime) * 1000;
    },
    // Wrong answer: the record scratches to a halt, then a low thud.
    flop() {
      const t = ctx.currentTime + 0.02;
      scratch(t, 0.14);
      o(t + 0.32, 0.9, 98, { type: 'sine', vol: 0.3, to: 40 });
      o(t + 0.32, 0.7, 196, { type: 'sawtooth', vol: 0.03, to: 92 });
    },
    // Losing the game: a slow, cold fall.
    lose() {
      const t = ctx.currentTime + 0.05;
      [[64, 0], [62, 0.45], [60, 0.9], [59, 1.35]].forEach(([m, dt]) => {
        o(t + dt, 0.6, mtof(m), { type: 'triangle', vol: 0.07, attack: 0.04 });
        o(t + dt, 0.6, mtof(m - 12), { type: 'sawtooth', vol: 0.015, attack: 0.04, detune: 7 });
      });
      o(t + 1.8, 2.6, mtof(45), { type: 'sawtooth', vol: 0.04, attack: 0.3, detune: -10 });
      o(t + 1.8, 2.6, mtof(33), { type: 'sine', vol: 0.12, attack: 0.3 });
    },
    // Tile picked: a laser zap.
    zap() { const t = ctx.currentTime + 0.01; o(t, 0.16, 1800, { type: 'square', vol: 0.04, to: 220 }); o(t + 0.05, 0.12, 1200, { type: 'triangle', vol: 0.04, to: 160 }); },
    horn: (d = 0.4) => horn(ctx.currentTime + 0.02, d),
  };
}
