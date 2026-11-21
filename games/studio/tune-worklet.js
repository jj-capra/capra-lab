/* Studio: the auto-tune, an AudioWorklet (runs on the audio thread).
   Hearing the note: YIN on the voice brought down to about 12 kHz, every 12 ms.
   Moving it: pitch-synchronous overlap-add (PSOLA): two-period Hann grains cut from the voice at its
   own pitch marks and laid back down at the new spacing, so the voice keeps its own sound (no
   flanging). Grains read faster or slower than real time move the formants too (Chipmunk, Deep).
   The note it moves to: the nearest one the main thread allows (the song's chord and key), held
   unless the voice moves clearly away (no warble between two notes). Hard tune gets there at once
   (the robot snap), Natural eases over 70 ms and leaves a little of the singer's own pitch.
   Two harmony voices sing the chord's next notes above the lead, one each side.
   It adds 23 ms (the grains need a voice's lowest period, 90 Hz, twice over).
   Also: claps and beeps the mic hears, with the exact audio-clock time they arrived (for the clap
   sync, while `onsets` is on), and a gate (`duck`, a level) that closes the voice when only the
   band's echo from the phone's speaker is coming in.
   Messages in: { on, speed, strength, shift, formant, harmony, allowed[12], chord[pcs], gate, duck, onsets }.
   Messages out (20 a second): { f0, m, tgt, level }; and { onset: time } as they happen. */
const mod12 = (n) => ((n % 12) + 12) % 12;

class StudioTune extends AudioWorkletProcessor {
  constructor() {
    super();
    const sr = sampleRate;
    this.sr = sr;
    this.L = 16384; this.mask = this.L - 1;
    this.inp = new Float32Array(this.L); this.olaL = new Float32Array(this.L); this.olaR = new Float32Array(this.L);
    this.n = 0;
    this.LAT = Math.round(0.023 * sr);
    // hearing the note
    this.D = Math.max(1, Math.round(sr / 12000)); this.dsr = sr / this.D;
    this.W = Math.round(this.dsr * 0.032); this.tauMin = Math.max(2, Math.floor(this.dsr / 1000)); this.tauMax = Math.ceil(this.dsr / 90);
    this.dN = this.W + this.tauMax + 2; this.dbuf = new Float32Array(this.dN * 2); this.dpos = 0; this.dcount = 0;
    this.acc = 0; this.accN = 0; this.hop = Math.round(this.dsr * 0.012); this.sinceHop = 0;
    this.diff = new Float32Array(this.tauMax + 2);
    this.lp1 = 0; this.lp2 = 0; this.lpa = 1 - Math.exp(-2 * Math.PI * 1400 / sr);
    this.T = Math.round(0.008 * sr); this.voiced = false; this.lastVoiced = -1e9; this.f0 = 0; this.m = 0; this.tgt = 60;
    // the lead and two harmonies (left, right)
    this.voices = [0, 1, 2].map((i) => ({ next: -1, anchor: 0, anchorT: 0, lastMark: null, semis: 0, want: 0, last: 0,
      gain: i ? 0.5 : 1, panL: i === 1 ? 0.9 : i === 2 ? 0.3 : 1, panR: i === 1 ? 0.3 : i === 2 ? 0.9 : 1 }));
    this.s = { on: false, speed: 0.07, strength: 0.75, shift: 0, formant: 1, harmony: 0, allowed: new Array(12).fill(true), chord: [0, 4, 7], gate: 0.006, duck: 0, onsets: false };
    this.envF = 0; this.envS = 0; this.lastOnset = -1e9; this.g = 1; this.hold = 0;
    this.aF = 1 - Math.exp(-1 / (0.0005 * sr)); this.rF = 1 - Math.exp(-1 / (0.012 * sr)); this.aS = 1 - Math.exp(-1 / (0.3 * sr));
    this.wet = 0; this.level = 0; this.postAt = 0; this.slip = 0;
    this.port.onmessage = (e) => { if (e.data && typeof e.data === 'object') Object.assign(this.s, e.data); };
  }

  nearestAllowed(x) {
    const r = Math.round(x), al = this.s.allowed;
    let best = r, bd = 99;
    for (let k = -6; k <= 6; k++) { const c = r + k; if (al[mod12(c)] && Math.abs(c - x) < bd) { bd = Math.abs(c - x); best = c; } }
    return best;
  }
  chordAbove(x) {
    const ch = this.s.chord && this.s.chord.length ? this.s.chord : [0, 4, 7];
    for (let c = Math.ceil(x); c < Math.ceil(x) + 13; c++) if (ch.includes(mod12(c))) return c;
    return Math.ceil(x) + 4;
  }

  analyze() {
    const b = this.dbuf, o = this.dpos, W = this.W, tmax = this.tauMax, d = this.diff;
    let e = 0;
    for (let j = 0; j < W; j++) { const v = b[o + j]; e += v * v; }
    const rms = Math.sqrt(e / W);
    if (rms < this.s.gate) { this.heard(0); return; }
    d[0] = 1;
    let run = 0, found = -1;
    for (let tau = 1; tau <= tmax; tau++) {
      let s = 0;
      for (let j = 0; j < W; j++) { const v = b[o + j] - b[o + j + tau]; s += v * v; }
      run += s; d[tau] = run > 0 ? s * tau / run : 1;
    }
    for (let tau = this.tauMin; tau <= tmax; tau++) {
      if (d[tau] < 0.14) { while (tau + 1 <= tmax && d[tau + 1] < d[tau]) tau++; found = tau; break; }
    }
    if (found < 0) {
      let best = 1, bt = -1;
      for (let tau = this.tauMin; tau <= tmax; tau++) if (d[tau] < best) { best = d[tau]; bt = tau; }
      if (best < 0.28) found = bt;
    }
    if (found < 0) { this.heard(0); return; }
    const y0 = d[Math.max(1, found - 1)], y1 = d[found], y2 = d[Math.min(tmax, found + 1)], den = y0 - 2 * y1 + y2;
    const tauF = found + (den !== 0 ? Math.max(-1, Math.min(1, 0.5 * (y0 - y2) / den)) : 0);
    this.heard(this.dsr / tauF);
  }
  heard(f0) {
    if (f0 > 0) {
      // an octave slip (the detector catching half or twice the note for a frame) is ignored
      if (this.voiced && this.f0 > 0) { const r = f0 / this.f0; if ((Math.abs(r - 2) < 0.06 || Math.abs(r - 0.5) < 0.03) && this.slip < 3) { this.slip++; return; } }
      this.slip = 0;
      this.voiced = true; this.lastVoiced = this.n; this.f0 = f0; this.T = this.sr / f0;
      this.m = 69 + 12 * Math.log2(f0 / 440);
      this.choose();
    } else {
      this.voiced = false;
      if (this.n - this.lastVoiced > 0.15 * this.sr) {
        this.T = Math.round(0.008 * this.sr);
        this.voices[0].want = this.s.shift;
      }
    }
  }
  choose() {
    const s = this.s, sh = this.m + s.shift;
    let tgt = this.tgt;
    if (!(s.allowed[mod12(tgt)] && Math.abs(sh - tgt) < 0.62)) tgt = this.nearestAllowed(sh);
    this.tgt = tgt;
    this.voices[0].want = s.on ? s.shift + (tgt - sh) * s.strength : s.shift;
    const base = s.on ? tgt : Math.round(sh);
    const h1 = this.chordAbove(base + 3), h2 = this.chordAbove(h1 + 3);
    this.voices[1].want = h1 - this.m;
    this.voices[2].want = h2 - this.m;
  }

  grains(v, n) {
    const sOut = n - this.LAT, fr = this.s.formant || 1, T = this.T, H = T / fr;
    if (v.next < sOut - 1) { v.next = sOut + H; v.last = v.next; v.lastMark = null; v.semis = v.want; }
    let guard = 0;
    while (v.next - H <= sOut + 1 && guard++ < 8) {
      const dt = (v.next - v.last) / this.sr;
      v.last = v.next;
      v.semis += (v.want - v.semis) * (1 - Math.exp(-Math.max(0, dt) / Math.max(0.0015, this.s.speed)));
      const ratio = Math.pow(2, v.semis / 12);
      if (v.anchorT !== T || v.lastMark == null) { v.anchor = v.lastMark != null ? v.lastMark : v.next - T; v.anchorT = T; }
      let a = v.anchor + Math.floor((v.next - v.anchor) / T) * T;
      if (a + H * fr > n - 2) a -= T * Math.ceil((a + H * fr - (n - 2)) / T);
      v.lastMark = a;
      this.grain(v, a, v.next, H, fr, fr / ratio);
      v.next += T / ratio;
    }
  }
  grain(v, a, c, H, fr, scale) {
    const inp = this.inp, L = this.olaL, R = this.olaR, mask = this.mask, g = scale * v.gain, gl = g * v.panL, gr = g * v.panR;
    const c0 = Math.ceil(c - H), c1 = Math.floor(c + H), k = Math.PI / H;
    for (let t = c0; t <= c1; t++) {
      const u = t - c, w = 0.5 + 0.5 * Math.cos(u * k), pos = a + u * fr, ip = Math.floor(pos), f = pos - ip;
      const s0 = inp[ip & mask], s1 = inp[(ip + 1) & mask], y = (s0 + (s1 - s0) * f) * w;
      L[t & mask] += y * gl; R[t & mask] += y * gr;
    }
  }

  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || !out[0]) return true;
    const oL = out[0], oR = out[1] || out[0], inp = inputs[0], iL = inp && inp[0], iR = inp && inp[1];
    const s = this.s, frames = oL.length, mask = this.mask, sr = this.sr;
    const bypass = !s.on && !s.shift && !s.harmony && (s.formant || 1) === 1;
    const wetT = bypass ? 0 : 1, wa = 1 - Math.exp(-1 / (0.03 * sr)), nv = 1 + Math.min(2, s.harmony | 0);
    const t0 = typeof currentTime !== 'undefined' ? currentTime : this.n / sr, duck = s.duck || 0;
    const ga = 1 - Math.exp(-1 / (0.004 * sr)), gr = 1 - Math.exp(-1 / (0.12 * sr));
    let sq = 0;
    for (let i = 0; i < frames; i++) {
      const x = iL ? (iR ? (iL[i] + iR[i]) * 0.5 : iL[i]) : 0, n = this.n;
      sq += x * x;
      // claps and beeps: a sharp rise over the recent level
      const ax = Math.abs(x);
      this.envF += (ax - this.envF) * (ax > this.envF ? this.aF : this.rF);
      this.envS += (ax - this.envS) * this.aS;
      if (s.onsets && this.envF > 0.02 && this.envF > this.envS * 3.5 && n - this.lastOnset > 0.12 * sr) { this.lastOnset = n; this.port.postMessage({ onset: t0 + i / sr }); }
      // the speaker's echo of the band alone doesn't get through (held open 150 ms after the voice)
      if (duck > 0) { if (this.envF > duck) this.hold = Math.round(0.15 * sr); else if (this.hold > 0) this.hold--; }
      const gt = duck > 0 && this.hold <= 0 ? 0 : 1;
      this.g += (gt - this.g) * (gt > this.g ? ga : gr);
      this.inp[n & mask] = x;
      this.lp1 += (x - this.lp1) * this.lpa; this.lp2 += (this.lp1 - this.lp2) * this.lpa;
      this.acc += this.lp2;
      if (++this.accN >= this.D) {
        const y = this.acc / this.accN; this.acc = 0; this.accN = 0;
        this.dbuf[this.dpos] = y; this.dbuf[this.dpos + this.dN] = y;
        this.dpos = (this.dpos + 1) % this.dN; this.dcount++;
        if (++this.sinceHop >= this.hop && this.dcount >= this.dN) { this.sinceHop = 0; this.analyze(); }
      }
      if (wetT || this.wet > 0.0005) for (let k = 0; k < nv; k++) this.grains(this.voices[k], n);
      const so = (n - this.LAT) & mask, wl = this.olaL[so], wr = this.olaR[so];
      this.olaL[so] = 0; this.olaR[so] = 0;
      this.wet += (wetT - this.wet) * wa;
      oL[i] = (x * (1 - this.wet) + wl * this.wet) * this.g;
      if (oR !== oL) oR[i] = (x * (1 - this.wet) + wr * this.wet) * this.g;
      this.n = n + 1;
    }
    const rms = Math.sqrt(sq / frames);
    this.level = Math.max(rms, this.level * 0.92);
    if (this.n >= this.postAt) {
      this.postAt = this.n + Math.round(0.05 * sr);
      const voiced = this.voiced || this.n - this.lastVoiced < 0.08 * sr;
      this.port.postMessage({ f0: voiced ? this.f0 : 0, m: this.m, tgt: s.on ? this.tgt : Math.round(this.m + s.shift), level: this.level });
    }
    return true;
  }
}
registerProcessor('studio-tune', StudioTune);
