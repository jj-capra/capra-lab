// Studio: the music (keys, chords, every genre, the song's form, what plays each bar), the auto-tune
// worklet (fed made-up voices), and the move reader (claps, hands up).   node games/studio/test/studio.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  GENRES, GENRE_ORDER, BEATS, FORM, parseChord, chordName, chordPcs, tuneSet, keysVoicing, guitarVoicing, bassNote, hits, formOf, formBars,
  sectionAt, chordSymAt, barsUntil, nextBar, barEvents, songInfo, songName, defaultSong, keyName, hookOf, hookNames, midiName,
} from '../music.mjs';
import { createMoves } from '../moves.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  ', name); };
const names = (syms, key, minor) => syms.map((s) => chordName(s, key, minor)).join(' ');

test('chords from numerals: quality, sevenths, borrowed flats, spelled the key\'s way', () => {
  assert.deepEqual(parseChord('I').iv, [0, 4, 7]);
  assert.deepEqual(parseChord('vi').iv, [0, 3, 7]);
  assert.deepEqual(parseChord('V7').iv, [0, 4, 7, 10]);
  assert.deepEqual(parseChord('ii7').iv, [0, 3, 7, 10]);
  assert.deepEqual(parseChord('IVmaj7').iv, [0, 4, 7, 11]);
  assert.deepEqual(parseChord('vii°').iv, [0, 3, 6]);
  assert.equal(parseChord('bVII').deg, 10);
  assert.equal(parseChord('bVI').deg, 8);
  assert.throws(() => parseChord('VIII'));
  assert.equal(names(['I', 'V', 'vi', 'IV'], 0, false), 'C G Am F');
  assert.equal(names(['i', 'bVI', 'bIII', 'bVII'], 9, true), 'Am F C G');
  assert.equal(names(['i', 'bVI', 'bIII', 'bVII'], 0, true), 'Cm A♭ E♭ B♭');
  assert.equal(names(['ii7', 'V7', 'Imaj7', 'vi7'], 5, false), 'Gm7 C7 Fmaj7 Dm7');
  assert.equal(names(['IVmaj7', 'V7', 'iii7', 'vi'], 0, false), 'Fmaj7 G7 Em7 Am');
  assert.equal(names(['i', 'bVII', 'bVI', 'V'], 9, true), 'Am G F E');
  assert.equal(keyName(10, false), 'B♭ major');
  assert.equal(keyName(1, true), 'C♯ minor');
  assert.equal(midiName(69), 'A4');
});

test('fourteen genres, each with its famous progression, grooves that exist and fit, a sound per instrument', () => {
  assert.equal(GENRE_ORDER.length, 14);
  assert.deepEqual([...GENRE_ORDER].sort(), Object.keys(GENRES).sort());
  const famous = { pop: 'I–V–vi–IV', sadpop: 'vi–IV–I–V', lofi: 'ii7–V7–Imaj7–vi7', anime: 'IVmaj7–V7–iii7–vi', flamenco: 'i–♭VII–♭VI–V', doowop: 'I–vi–IV–V', trap: 'i–♭VI–♭III–♭VII' };
  for (const [id, hook] of Object.entries(famous)) assert.equal(hookOf(GENRES[id]), hook, id);
  assert.equal(hookNames(GENRES.blues, 9), 'A7 D7 E7');
  for (const id of GENRE_ORDER) {
    const g = GENRES[id], grid = g.grid || 16;
    assert.ok(g.name && g.emoji && g.blurb && g.bpm >= 60 && g.bpm <= 160, id);
    assert.ok(g.beats.length >= 2, id + ' has drum styles to pick from');
    for (const b of g.beats) { assert.ok(BEATS[b], id + ': ' + b); assert.equal(BEATS[b].grid || 16, grid, id + ': ' + b + ' fits the grid'); }
    for (const part of ['comp', 'compChorus', 'bass', 'bassChorus', 'arp']) if (g[part]) assert.equal(g[part].length, grid, id + ' ' + part);
    for (const inst of ['synth', 'piano', 'guitar']) assert.ok(g.tone[inst], id + ' ' + inst);
    for (const k of ['verse', 'chorus', 'pre', 'bridge', 'intro', 'outro']) if (g[k]) for (const s of g[k]) parseChord(s);
  }
  for (const [id, beat] of Object.entries(BEATS)) {
    const grid = beat.grid || 16;
    for (const v of ['k', 's', 'c', 'h', 'o', 'r', 'p']) for (const row of [beat[v], beat.ch && beat.ch[v]]) {
      if (!row) continue;
      assert.ok(row.length === grid || row.length === grid * 2, id + ' ' + v + ' is ' + row.length + ' long');
      assert.match(row, /^[Xxgrt.1-9]+$/, id + ' ' + v);
    }
  }
});

test('voicings: keys near the middle, no half-step rub up top; guitar from a low root; bass low', () => {
  for (const id of GENRE_ORDER) {
    const g = GENRES[id];
    for (const s of new Set([...g.verse, ...g.chorus])) {
      const c = parseChord(s), k = keysVoicing(c, g.key);
      assert.ok(k.length >= 3 && k.length <= 4, s);
      assert.ok(k[0] >= 48 && k[k.length - 1] <= 77, id + ' ' + s + ' ' + k);
      assert.ok(k[k.length - 1] - k[k.length - 2] !== 1, id + ' ' + s + ' rubs at the top: ' + k);
      for (let i = 1; i < k.length; i++) assert.ok(k[i] > k[i - 1]);
      const gv = guitarVoicing(c, g.key);
      assert.ok(gv[0] >= 40 && gv[0] <= 51 && gv[gv.length - 1] <= 77 && gv.length >= 4, id + ' ' + s + ' guitar ' + gv);
      const pcs = new Set(chordPcs(c, g.key));
      for (const n of gv) assert.ok(pcs.has(n % 12), id + ' ' + s + ' guitar note outside the chord');
      assert.ok(bassNote(c, g.key, 'R') >= 33 && bassNote(c, g.key, 'R') <= 44);
      assert.ok(bassNote(c, g.key, 'R', true) >= 28 && bassNote(c, g.key, 'R', true) <= 39);
    }
  }
  assert.deepEqual(guitarVoicing(parseChord('I'), 4, true), [40, 47, 52], 'a power chord is root, fifth, octave');
});

test('the auto-tune\'s notes: the chord\'s own, plus the key\'s that sit a whole step clear of them', () => {
  const pcs = (set) => set.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(pcs(tuneSet(0, false, 'I')), [0, 2, 4, 7, 9]);
  assert.deepEqual(pcs(tuneSet(0, false, 'IV')), [0, 2, 5, 7, 9]);
  assert.deepEqual(pcs(tuneSet(9, true, 'V')), [2, 4, 8, 11], 'over E in A minor: the leading tone, never G');
  assert.deepEqual(pcs(tuneSet(0, false, 'Imaj7')), [0, 2, 4, 7, 9, 11]);
  for (const id of GENRE_ORDER) for (const s of GENRES[id].chorus) {
    const set = tuneSet(GENRES[id].key, GENRES[id].minor, s);
    for (const t of chordPcs(parseChord(s), GENRES[id].key)) assert.ok(set[t], id + ' ' + s + ' allows its own notes');
  }
});

test('the song: intro, verses with a build, choruses, a bridge, the outro; 64 bars (the blues does twelves)', () => {
  const f = formOf(GENRES.pop);
  assert.deepEqual(f.map((s) => s.kind), FORM.map(([k]) => k));
  assert.equal(formBars(f), 64);
  assert.deepEqual(f.map((s) => s.title), ['Intro', 'Verse 1', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Pre-Chorus', 'Chorus', 'Bridge', 'Chorus', 'Outro']);
  assert.deepEqual(formOf(GENRES.edm).map((s) => s.label).slice(0, 4), ['Intro', 'Verse', 'Build', 'Drop']);
  assert.equal(formOf(GENRES.trap)[3].label, 'Hook');
  const b = formOf(GENRES.blues);
  assert.equal(formBars(b), 56);
  assert.deepEqual(b.filter((s) => s.kind === 'verse' || s.kind === 'chorus').map((s) => s.bars), [12, 12, 12, 12]);
  assert.equal(chordSymAt(GENRES.blues, b, 4 + 4), 'IV7', 'the blues goes to IV in its fifth bar');
  assert.equal(chordSymAt(GENRES.pop, f, 16), 'I', 'the chorus starts on its own progression');
  assert.equal(sectionAt(f, 16).s.kind, 'chorus');
  assert.equal(sectionAt(f, 64), null);
  assert.equal(barsUntil(f, 12), 4);
  assert.equal(barsUntil(f, 15), 1);
  assert.equal(barsUntil(f, 56), null, 'no chorus after the last one');
  assert.equal(nextBar(f, 63, false), -1, 'the song ends');
  assert.equal(nextBar(f, 59, true), f.find((s) => s.kind === 'verse' && s.n === 2).start, 'keep going: back to the second verse');
});

test('what each bar plays: crash on the chorus, a roll into it, the EDM build and its silent beat, the ending', () => {
  const pop = defaultSong('pop'), at = (song, bar, t) => barEvents(song, bar).filter((e) => !t || e.t === t);
  const has = (ev, v, step) => ev.some((e) => e.t === 'd' && e.v === v && (step == null || e.step === step));
  assert.ok(!at(pop, 0, 'd').some((e) => e.v === 'k'), 'no kick in the intro');
  assert.ok(at(pop, 0, 'c')[0].pad, 'the intro\'s chords are held');
  assert.ok(!at(pop, 0, 'b').length, 'no bass in the intro');
  assert.ok(has(at(pop, 16), 'x', 0), 'a crash on the chorus downbeat');
  assert.ok(at(pop, 16, 'a').length > 4, 'the chorus\'s arpeggio');
  assert.ok(!at(pop, 4, 'a').length, 'no arpeggio in the verse');
  const roll = at(pop, 15, 'd').filter((e) => e.v === 's');
  assert.ok(roll.length >= 12 && roll[roll.length - 1].vel > roll[0].vel, 'a rising snare roll into the chorus');
  assert.ok(at(pop, 14).some((e) => e.t === 'f' && e.k === 'riser'), 'a riser two bars before the chorus');
  assert.ok(at(pop, 16).some((e) => e.t === 'f' && e.k === 'filter' && e.kind === 'chorus'));
  const edm = defaultSong('edm');
  assert.ok(has(at(edm, 0), 'k'), 'EDM\'s intro keeps its kick');
  const lastBuild = at(edm, 15);
  assert.ok(lastBuild.some((e) => e.t === 'f' && e.k === 'gap' && e.step === 12), 'the beat before the drop goes silent');
  assert.ok(!lastBuild.some((e) => e.t === 'd' && e.step >= 12), 'nothing plays in it');
  assert.ok(at(edm, 12).some((e) => e.t === 'f' && e.k === 'riser' && e.bars === 4), 'the riser climbs the whole build');
  const end = at(pop, 63);
  assert.ok(has(end, 'x', 0) && end.some((e) => e.t === 'f' && e.k === 'end'), 'the last bar: one big hit, then the end');
  assert.ok(end.find((e) => e.t === 'c').dur >= 32, 'the last chord rings');
  assert.ok(at({ ...pop, beat: 'off' }, 20, 'd').length === 0, 'no drums when the beat is off');
  const doo = at(defaultSong('doowop'), 20);
  assert.ok(doo.every((e) => e.step <= 12), 'the 12/8 genre counts in twelfths');
  assert.equal(doo.filter((e) => e.t === 'c').length, 12, 'doo-wop piano triplets');
  const trap = at(defaultSong('trap'), 20, 'b');
  assert.ok(trap.length && trap.every((e) => e.b808), 'trap\'s bass is the 808');
  for (const id of GENRE_ORDER) for (const inst of ['piano', 'synth', 'guitar']) {
    const song = { ...defaultSong(id), inst }, bars = formBars(formOf(GENRES[id]));
    for (let bar = 0; bar < bars; bar++) for (const e of barEvents(song, bar)) {
      assert.ok(Number.isFinite(e.step) && e.step >= 0, id + ' ' + bar);
      if (e.notes) assert.ok(e.notes.every(Number.isFinite) && e.dur > 0, id + ' ' + inst + ' ' + bar);
      if (e.note != null) assert.ok(Number.isFinite(e.note) && e.dur > 0, id + ' ' + bar);
    }
  }
});

test('the beat bar\'s numbers: section, chord now and next, bars to the chorus (or drop, or hook)', () => {
  const pop = defaultSong('pop');
  const a = songInfo(pop, 12);
  assert.equal(a.title, 'Pre-Chorus'); assert.equal(a.toChorus, 4); assert.equal(a.chord, 'F');
  const b = songInfo(pop, 15);
  assert.equal(b.toChorus, 1); assert.equal(b.next, 'C');
  assert.equal(songInfo(defaultSong('edm'), 13).chorusLabel, 'Drop');
  assert.equal(songInfo(pop, 63).next, null);
  assert.ok(songInfo({ ...pop, keepGoing: true }, 60).toChorus > 0, 'keep going: another chorus is always coming');
  assert.match(songName(pop, 5000), /^\w+ Pop in C$/);
  assert.match(songName(defaultSong('trap'), 5000), / Trap in Am$/);
  assert.equal(hits('X.x.r...t.......').length, 1 + 1 + 2 + 3);
});

/* the worklet, run here with stand-ins for the audio thread */
const workletSrc = fs.readFileSync(fileURLToPath(new URL('../tune-worklet.js', import.meta.url)), 'utf8');
function worklet(sr = 48000) {
  let Cls;
  class AWP { constructor() { this.port = { postMessage: (m) => { this.last = m; } }; } }
  new Function('AudioWorkletProcessor', 'registerProcessor', 'sampleRate', workletSrc)(AWP, (n, c) => { assert.equal(n, 'studio-tune'); Cls = c; }, sr);
  return new Cls();
}
function voice(sr, f, secs) {   // a buzzy voice-like tone with a little vibrato
  const n = Math.floor(sr * secs), x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) { ph += 2 * Math.PI * f * (1 + 0.004 * Math.sin(2 * Math.PI * 5 * i / sr)) / sr; let v = 0; for (let h = 1; h <= 8; h++) v += Math.sin(h * ph) / h; x[i] = v * 0.15; }
  return x;
}
function run(p, x) {
  const L = new Float32Array(x.length), R = new Float32Array(x.length);
  for (let i = 0; i + 128 <= x.length; i += 128) { const oL = new Float32Array(128), oR = new Float32Array(128); p.process([[x.subarray(i, i + 128)]], [[oL, oR]]); L.set(oL, i); R.set(oR, i); }
  return { L, R };
}
function pitchOf(sr, x, from, len) {   // autocorrelation, the first strong peak, refined
  const r = (tau) => { let s = 0, a = 0, b = 0; for (let j = 0; j < len; j++) { s += x[from + j] * x[from + j + tau]; a += x[from + j] ** 2; b += x[from + j + tau] ** 2; } return s / Math.sqrt(a * b + 1e-12); };
  let best = 0;
  const lo = Math.floor(sr / 1000), hi = Math.floor(sr / 60), rs = [];
  for (let t = lo; t < hi; t++) { rs[t] = r(t); best = Math.max(best, rs[t]); }
  let t = lo; while (t < hi && !(rs[t] > best * 0.97 && rs[t] >= (rs[t + 1] ?? 0))) t++;
  const y0 = rs[t - 1], y1 = rs[t], y2 = rs[t + 1], den = y0 - 2 * y1 + y2;
  return sr / (t + (den ? 0.5 * (y0 - y2) / den : 0));
}
const A_C_E = (() => { const a = new Array(12).fill(false); a[9] = a[0] = a[4] = true; return a; })();
const near = (f, want, pct = 1.2) => assert.ok(Math.abs(f / want - 1) * 100 < pct, `${f.toFixed(1)} Hz, wanted ${want}`);

test('auto-tune: hears the note and moves it onto the allowed one (hard), part way (natural), not at all (off)', () => {
  for (const sr of [48000, 44100]) {
    const off = worklet(sr), x = voice(sr, 226, 1.2);
    near(pitchOf(sr, run(off, x).L, sr * 0.6, sr * 0.08), 226);
    const hard = worklet(sr);
    Object.assign(hard.s, { on: true, speed: 0.003, strength: 1, allowed: A_C_E });
    near(pitchOf(sr, run(hard, x).L, sr * 0.6, sr * 0.08), 220);
    assert.ok(Math.abs(hard.f0 - 226) < 3, 'it heard 226 Hz: ' + hard.f0);
    assert.equal(hard.last.tgt, 57, 'and aimed for A3');
  }
  const nat = worklet();
  Object.assign(nat.s, { on: true, speed: 0.07, strength: 0.75, allowed: A_C_E });
  const f = pitchOf(48000, run(nat, voice(48000, 226, 1.2)).L, 28800, 3840);
  assert.ok(f < 224.5 && f > 220.5, 'natural leaves a little of the singer: ' + f.toFixed(1));
  const up = worklet();
  Object.assign(up.s, { on: true, speed: 0.003, strength: 1, allowed: A_C_E });
  near(pitchOf(48000, run(up, voice(48000, 246, 1.2)).L, 28800, 3840), 261.63, 1.5);   // B isn't allowed: up to C
  const low = worklet();
  Object.assign(low.s, { on: true, speed: 0.003, strength: 1, allowed: A_C_E });
  near(pitchOf(48000, run(low, voice(48000, 113, 1.4)).L, 33600, 4800), 110);   // a low voice to A2
});

test('auto-tune: chipmunk an octave up, harmonies on the chord\'s notes to each side, and it keeps its level', () => {
  const chip = worklet();
  Object.assign(chip.s, { on: false, shift: 12, formant: 1.45 });
  near(pitchOf(48000, run(chip, voice(48000, 220, 1.2)).L, 28800, 3840), 440, 1.5);
  const h = worklet();
  Object.assign(h.s, { on: true, speed: 0.003, strength: 1, allowed: A_C_E, harmony: 2, chord: [9, 0, 4] });
  const x = voice(48000, 220, 1.2), { L, R } = run(h, x);
  const g = (sig, f) => { const k = 2 * Math.cos(2 * Math.PI * f / 48000); let s1 = 0, s2 = 0; for (let j = 28800; j < 48000; j++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * (j - 28800) / 19200), s0 = sig[j] * w + k * s1 - s2; s2 = s1; s1 = s0; } return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - k * s1 * s2)); };
  assert.ok(g(L, 261.63) > 2.5 * g(R, 261.63), 'the third (C4) sings on the left');
  assert.ok(g(R, 329.63) > 2.5 * g(L, 329.63), 'the fifth (E4) on the right');
  let ei = 0, eo = 0;
  for (let j = 28800; j < 48000; j++) { ei += x[j] ** 2; eo += L[j] ** 2; }
  const solo = worklet(); Object.assign(solo.s, { on: true, speed: 0.003, strength: 1, allowed: A_C_E });
  const s = run(solo, x).L; let es = 0; for (let j = 28800; j < 48000; j++) es += s[j] ** 2;
  assert.ok(Math.abs(Math.sqrt(es / ei) - 1) < 0.15, 'tuned, the voice is as loud as it came in: ' + Math.sqrt(es / ei).toFixed(2));
  const quiet = worklet(); Object.assign(quiet.s, { on: true, allowed: A_C_E });
  run(quiet, new Float32Array(48000));
  assert.equal(quiet.last.f0, 0, 'silence has no pitch');
});

/* moves */
const body = (o = {}) => {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.9, visibility: 0.1 }));
  const put = (i, x, y) => { lm[i] = { x, y, visibility: 0.95 }; };
  put(0, 0.5, 0.3); put(11, 0.6, 0.45); put(12, 0.4, 0.45);
  put(15, o.lw ? o.lw[0] : 0.35, o.lw ? o.lw[1] : 0.7); put(16, o.rw ? o.rw[0] : 0.65, o.rw ? o.rw[1] : 0.7);
  put(19, (o.lw ? o.lw[0] : 0.35), (o.lw ? o.lw[1] : 0.7) - 0.02); put(20, (o.rw ? o.rw[0] : 0.65), (o.rw ? o.rw[1] : 0.7) - 0.02);
  return lm;
};
test('moves: a fast clap, hands up for a supernova, trails with speed; no clap from hands resting together', () => {
  const m = createMoves();
  let t = 0, events = [];
  const feed = (lm, dt = 1 / 30) => { t += dt; const out = m.update(lm, t, 0.5); events.push(...out.events); return out; };
  for (let i = 0; i < 5; i++) feed(body({ lw: [0.2, 0.55], rw: [0.8, 0.55] }));
  feed(body({ lw: [0.38, 0.55], rw: [0.62, 0.55] }));
  feed(body({ lw: [0.48, 0.55], rw: [0.52, 0.55] }));
  assert.equal(events.filter((e) => e.type === 'clap').length, 1, 'a clap');
  assert.ok(Math.abs(events[0].x - 0.5) < 0.02);
  for (let i = 0; i < 30; i++) feed(body({ lw: [0.49, 0.55], rw: [0.51, 0.55] }));
  assert.equal(events.filter((e) => e.type === 'clap').length, 1, 'holding them together is not more claps');
  events = [];
  for (let i = 0; i < 12; i++) feed(body({ lw: [0.42, 0.1], rw: [0.58, 0.1] }));
  assert.equal(events.filter((e) => e.type === 'nova').length, 1, 'both hands up: one supernova');
  for (let i = 0; i < 60; i++) feed(body({ lw: [0.42, 0.1], rw: [0.58, 0.1] }));
  assert.equal(events.filter((e) => e.type === 'nova').length, 1, 'held up, still one');
  for (let i = 0; i < 3; i++) feed(body());
  for (let i = 0; i < 12; i++) feed(body({ lw: [0.42, 0.1], rw: [0.58, 0.1] }));
  assert.equal(events.filter((e) => e.type === 'nova').length, 2, 'down and up again: another');
  feed(body({ lw: [0.3, 0.6] }));
  const out = feed(body({ lw: [0.4, 0.6] }));
  assert.ok(out.hands[0] && out.hands[0].speed > 1, 'a hand moving fast has speed for its trail');
  assert.deepEqual(m.update(null, t + 1, 0.5).hands, [null, null], 'nobody there, no hands');
});

console.log(`Studio: ${passed} tests passed`);
