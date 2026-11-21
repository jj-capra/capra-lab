/* Studio: the voice. The mic goes through the auto-tune (tune-worklet.js), then the voice's sound
   (Robot: a ring modulator over a hard snap to the chord; Radio: a small speaker, squeezed and a
   little broken up), a vocal compressor, and the sends (Space: a long starry reverb; Echo: a
   dotted-eighth delay in time with the song). Out to `out`, which the page sends to the recording
   (and, with wired headphones only, to your ears: anything else is too slow to sing with). */
import { makeIR } from './band.js';

export const TUNES = { off: 'Off', natural: 'Natural', hard: 'Hard' };
export const CHARS = { natural: 'Natural', chipmunk: 'Chipmunk', deep: 'Deep', robot: 'Robot' };
export const HARMONIES = { 0: 'Solo', 1: 'Duet', 2: 'Choir' };
const CHAR = { natural: [0, 1], chipmunk: [12, 1.45], deep: [-7, 0.8], robot: [0, 1] };

export class Voice {
  constructor(ctx, out) {
    this.ctx = ctx; this.out = out; this.node = null; this.src = null; this.level = 0; this.pitch = null; this.onOnset = null; this.onPitch = null; this.duckAt = -1;
    this.opts = { tune: 'hard', harmony: 0, char: 'natural', space: true, echo: false, radio: false, volume: 1 };
    this.allowed = new Array(12).fill(true); this.chord = [0, 4, 7]; this.root = 0;
    const c = ctx;
    this.input = c.createGain();
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85; hp.Q.value = 0.7;
    this.input.connect(hp); this.hp = hp;
    this.post = c.createGain();          // after the tune (or straight from hp without a worklet)
    // robot: ring modulation, mixed in
    this.robotDry = c.createGain(); this.robotWet = c.createGain(); this.robotWet.gain.value = 0;
    this.ring = c.createGain(); this.ring.gain.value = 0;
    this.ringOsc = c.createOscillator(); this.ringOsc.type = 'sine'; this.ringOsc.frequency.value = 72;
    const rDepth = c.createGain(); rDepth.gain.value = 1; this.ringOsc.connect(rDepth); rDepth.connect(this.ring.gain); this.ringOsc.start();
    const comb = c.createDelay(0.05); comb.delayTime.value = 0.0085; const combFb = c.createGain(); combFb.gain.value = 0.45;
    this.post.connect(this.robotDry); this.post.connect(this.ring); this.ring.connect(comb); comb.connect(combFb); combFb.connect(comb); comb.connect(this.robotWet);
    this.mid = c.createGain(); this.robotDry.connect(this.mid); this.robotWet.connect(this.mid);
    // radio: a small speaker
    this.radioDry = c.createGain(); this.radioWet = c.createGain(); this.radioWet.gain.value = 0;
    const bhp = c.createBiquadFilter(); bhp.type = 'highpass'; bhp.frequency.value = 450;
    const blp = c.createBiquadFilter(); blp.type = 'lowpass'; blp.frequency.value = 3200;
    const peak = c.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 1700; peak.gain.value = 8; peak.Q.value = 1.2;
    const sh = c.createWaveShaper(); const n = 512, curve = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(4 * x) / Math.tanh(4); } sh.curve = curve;
    this.mid.connect(this.radioDry); this.mid.connect(bhp); bhp.connect(blp); blp.connect(peak); peak.connect(sh); sh.connect(this.radioWet);
    // the vocal: presence, a compressor, the level
    this.bus = c.createGain(); this.radioDry.connect(this.bus); this.radioWet.connect(this.bus);
    const pres = c.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3200; pres.gain.value = 3; pres.Q.value = 0.8;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -26; this.comp.ratio.value = 4; this.comp.knee.value = 8; this.comp.attack.value = 0.004; this.comp.release.value = 0.12;
    this.vol = c.createGain(); this.vol.gain.value = 1.25;
    this.bus.connect(pres); pres.connect(this.comp); this.comp.connect(this.vol); this.vol.connect(out);
    // sends
    this.spaceSend = c.createGain(); this.spaceSend.gain.value = 0;
    const rev = c.createConvolver(); rev.buffer = makeIR(c, 3.4, 2.2, 0.035);
    const revRet = c.createGain(); revRet.gain.value = 0.9;
    this.vol.connect(this.spaceSend); this.spaceSend.connect(rev); rev.connect(revRet); revRet.connect(out);
    this.echoSend = c.createGain(); this.echoSend.gain.value = 0;
    this.delay = c.createDelay(2); this.delay.delayTime.value = 0.4;
    const fb = c.createGain(); fb.gain.value = 0.36; const elp = c.createBiquadFilter(); elp.frequency.value = 3000; const ehp = c.createBiquadFilter(); ehp.type = 'highpass'; ehp.frequency.value = 300;
    const echoRet = c.createGain(); echoRet.gain.value = 0.55;
    this.vol.connect(this.echoSend); this.echoSend.connect(this.delay); this.delay.connect(elp); elp.connect(ehp); ehp.connect(fb); fb.connect(this.delay); ehp.connect(echoRet); echoRet.connect(out);
    this.hp.connect(this.post);   // until the auto-tune is loaded
  }
  async load() {
    if (this.node || !this.ctx.audioWorklet) return !!this.node;
    try {
      await this.ctx.audioWorklet.addModule(new URL('./tune-worklet.js', import.meta.url).href);
      this.node = new AudioWorkletNode(this.ctx, 'studio-tune', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
      this.node.port.onmessage = (e) => { const d = e.data || {}; if (d.onset != null) { if (this.onOnset) this.onOnset(d.onset); return; } this.level = d.level || 0; this.pitch = d.f0 > 0 ? d : null; if (this.pitch && this.onPitch) this.onPitch(d); };
      this.hp.disconnect(); this.hp.connect(this.node); this.node.connect(this.post);
      this.apply();
      return true;
    } catch (e) { console.warn('studio: no auto-tune here', e); return false; }
  }
  attach(stream) {
    this.detach();
    if (!stream || !stream.getAudioTracks().length) return;
    this.stream = stream;
    this.src = this.ctx.createMediaStreamSource(stream);
    this.src.connect(this.input);
  }
  detach() {
    if (this.src) { try { this.src.disconnect(); } catch { /* gone */ } this.src = null; }
    if (this.stream) for (const t of this.stream.getAudioTracks()) t.stop();
    this.stream = null; this.level = 0; this.pitch = null;
  }
  get live() { return !!this.src; }
  // claps and beeps the mic hears, with their audio-clock times (the clap sync)
  listen(on) { if (this.node) this.node.port.postMessage({ onsets: !!on }); }
  // every note heard, 50 times a second with its audio-clock time (humming a part)
  notes(on) { if (this.node) this.node.port.postMessage({ rate: on ? 0.02 : 0.05 }); }
  // the level under which the voice is only the band's echo off the speaker (0: always open)
  setDuck(level) {
    const v = Math.round(level * 2000) / 2000;
    if (v === this.duckAt || !this.node) return;
    this.duckAt = v; this.node.port.postMessage({ duck: v });
  }
  set(o) { Object.assign(this.opts, o); this.apply(); }
  setChord(info) {
    if (!info) return;
    this.allowed = info.tune; this.chord = info.pcs; this.root = info.root;
    this.apply(true);
  }
  setTempo(bpm) { this.delay.delayTime.setTargetAtTime(Math.min(1.9, 0.75 * 60 / bpm), this.ctx.currentTime, 0.05); }
  apply(chordOnly) {
    const o = this.opts, t = this.ctx.currentTime, tc = 0.03;
    const robot = o.char === 'robot';
    if (this.node) {
      const [shift, formant] = CHAR[o.char] || CHAR.natural;
      const tune = robot ? 'hard' : o.tune;
      const msg = {
        allowed: robot ? this.allowed.map((_, i) => this.chord.includes(i)) : this.allowed,
        chord: this.chord,
      };
      if (!chordOnly) Object.assign(msg, {
        on: tune !== 'off', speed: tune === 'hard' ? 0.003 : 0.07, strength: tune === 'hard' ? 1 : 0.75,
        shift, formant, harmony: +o.harmony || 0,
      });
      this.node.port.postMessage(msg);
    }
    if (chordOnly) return;
    this.robotWet.gain.setTargetAtTime(robot ? 0.9 : 0, t, tc); this.robotDry.gain.setTargetAtTime(robot ? 0.35 : 1, t, tc);
    this.radioWet.gain.setTargetAtTime(o.radio ? 0.8 : 0, t, tc); this.radioDry.gain.setTargetAtTime(o.radio ? 0 : 1, t, tc);
    this.spaceSend.gain.setTargetAtTime(o.space ? 0.42 : 0, t, tc);
    this.echoSend.gain.setTargetAtTime(o.echo ? 0.4 : 0, t, tc);
    this.vol.gain.setTargetAtTime(1.25 * (o.volume ?? 1), t, tc);
  }
}
