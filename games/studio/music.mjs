/* Studio: the music. Keys, chords, the genres' progressions and grooves, the song's sections and
   what every part plays in a bar (barEvents). No audio and no DOM here: band.js plays these events,
   and the test checks them. */

export const NOTE_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const NOTE_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const MAJOR_FLATS = new Set([1, 3, 5, 8, 10]);      // D♭ E♭ F A♭ B♭ major
const MINOR_FLATS = new Set([0, 2, 3, 5, 7, 10]);   // C D E♭ F G B♭ minor
export const mod12 = (n) => ((n % 12) + 12) % 12;
export const flatKey = (pc, minor) => (minor ? MINOR_FLATS : MAJOR_FLATS).has(mod12(pc));
export const noteName = (pc, flat) => (flat ? NOTE_FLAT : NOTE_SHARP)[mod12(pc)];
export const keyName = (pc, minor) => noteName(pc, flatKey(pc, minor)) + (minor ? ' minor' : ' major');
export const midiName = (m) => NOTE_SHARP[mod12(Math.round(m))] + (Math.floor(Math.round(m) / 12) - 1);
export const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };

/* Chords are written as roman numerals against the major scale of the key's tonic, so a minor key's
   chords carry flats (i, ♭VI, ♭III, ♭VII). Upper case is major, lower case minor, ° diminished;
   then an extension: 7 (dominant on a major chord, minor seventh on a minor one), maj7, 9, maj9, 6,
   add9, sus2, sus4. */
const DEG = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
const CHORD_RE = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°)?(maj9|maj7|add9|sus2|sus4|7|9|6)?$/;
export function parseChord(sym) {
  const m = CHORD_RE.exec(sym);
  if (!m) throw new Error('studio: no such chord ' + sym);
  const [, acc, rn, dim, ext = ''] = m;
  const up = rn === rn.toUpperCase();
  const deg = mod12(DEG[rn.toUpperCase()] + (acc === 'b' ? -1 : acc === '#' ? 1 : 0));
  let iv = dim ? [0, 3, 6] : up ? [0, 4, 7] : [0, 3, 7];
  if (ext === 'sus2') iv = [0, 2, 7];
  if (ext === 'sus4') iv = [0, 5, 7];
  if (ext === '7') iv = [...iv, dim ? 9 : 10];
  if (ext === 'maj7') iv = [...iv, 11];
  if (ext === '9') iv = [...iv, 10, 14];
  if (ext === 'maj9') iv = [...iv, 11, 14];
  if (ext === '6') iv = [...iv, 9];
  if (ext === 'add9') iv = [...iv, 14];
  return { sym, deg, acc, up, dim: !!dim, ext, iv };
}
// "Am7", "B♭", "Fmaj7" in a key (a flat numeral is spelled flat, a sharp one sharp, else the key's way)
export function chordName(sym, keyPc, minor) {
  const c = parseChord(sym);
  const flat = c.acc === 'b' ? true : c.acc === '#' ? false : flatKey(keyPc, minor);
  const root = noteName(keyPc + c.deg, flat);
  const q = c.dim ? '°' : c.up ? '' : 'm';
  const ext = { '': '', 7: c.dim ? '7' : '7', maj7: 'maj7', 9: '9', maj9: 'maj9', 6: '6', add9: 'add9', sus2: 'sus2', sus4: 'sus4' }[c.ext];
  if (c.ext === 'sus2' || c.ext === 'sus4') return root + ext;
  return root + q + ext;
}
export const chordPcs = (c, keyPc) => [...new Set(c.iv.map((i) => mod12(keyPc + c.deg + i)))];

/* What the auto-tune may land on over a chord: the chord's own notes, plus the key's notes that sit
   at least a whole step from all of them (so it never lands a half step off a chord note: always
   sounds right, even when the song borrows a chord from outside the key). */
export function tuneSet(keyPc, minor, sym) {
  const c = parseChord(sym), tones = chordPcs(c, keyPc), set = new Array(12).fill(false);
  for (const t of tones) set[t] = true;
  for (const s of SCALES[minor ? 'minor' : 'major']) {
    const pc = mod12(keyPc + s);
    if (!tones.some((t) => mod12(t - pc) === 1 || mod12(pc - t) === 1)) set[pc] = true;
  }
  return set;
}

/* Voicings. Keys: the chord's notes stacked from the inversion that sits closest to the middle (so
   the hands barely move from chord to chord); five-note chords drop their fifth. Guitar: a low root
   and the shape an open chord would ring (power chords for a driven guitar). Bass: the root low. */
export function keysVoicing(c, keyPc, center = 62) {
  let pcs = c.iv.map((i) => mod12(keyPc + c.deg + i));
  if (pcs.length >= 5) pcs = pcs.filter((_, i) => c.iv[i] !== 7);
  pcs = [...new Set(pcs)];
  let best = null;
  for (let k = 0; k < pcs.length; k++) {
    const rot = pcs.slice(k).concat(pcs.slice(0, k));
    for (const base of [center - 12, center - 7]) {
      const notes = [];
      let n = base + mod12(rot[0] - base);
      for (const pc of rot) { while (mod12(n) !== pc || (notes.length && n <= notes[notes.length - 1])) n++; notes.push(n); }
      const mean = notes.reduce((a, b) => a + b, 0) / notes.length;
      let cost = Math.abs(mean - center) + (notes[notes.length - 1] - notes[0]) * 0.15;
      for (let j = 1; j < notes.length; j++) if (notes[j] - notes[j - 1] === 1) cost += j === notes.length - 1 ? 6 : 2.5;   // no half-step rub up top
      if (!best || cost < best.cost) best = { notes, cost };
    }
  }
  return best.notes;
}
export function guitarVoicing(c, keyPc, power = false) {
  const rootPc = mod12(keyPc + c.deg);
  const r = 40 + mod12(rootPc - 4);                    // E2 to D♯3
  if (power) return [r, r + 7, r + 12];
  const third = c.iv[1], fifth = c.iv[2];
  const sev = c.iv.find((i) => i === 9 || i === 10 || i === 11);
  let notes = [r, r + fifth, r + 12, r + 12 + third, r + 12 + fifth, r + 24];   // an open chord: R 5 R 3 5 R
  if (sev != null) notes = [r, r + fifth, r + sev, r + 12 + third, r + 12 + fifth];   // R 5 7 3 5
  if (c.iv.includes(14)) notes = [r, r + third, r + (sev ?? fifth), r + 14, r + 12 + fifth];
  notes = [...new Set(notes)].filter((n) => n <= 77).sort((a, b) => a - b);
  return r >= 47 ? notes.slice(0, 5) : notes;
}
const BASS_TONE = { R: 0, '5': 7, O: 12, '3': null, '6': 9, '7': 10, L: -5 };
export function bassNote(c, keyPc, ch, low808 = false) {
  const rootPc = mod12(keyPc + c.deg);
  const r = (low808 ? 28 : 33) + mod12(rootPc - (low808 ? 4 : 9));   // A1 to G♯2 (808: E1 to D♯2)
  const off = ch === '3' ? c.iv[1] : BASS_TONE[ch] ?? 0;
  return r + off;
}

/* The grooves: a voice a row, a character a step ('X' loud, 'x' normal, 'g' ghost, 'r' a quick
   double, 't' a triplet roll, '.' rest). Rows of 32 are two bars. ch: rows added (or, null, taken
   out) in the chorus. k kick, s snare, c clap, h hat, o open hat, r rim, p shaker. */
export const BEATS = {
  radio: { name: 'Radio', k: 'X.......X.x.....', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', ch: { c: '....X.......X...', o: '..............x.', p: 'x.xxx.xxx.xxx.xx' } },
  fourfloor: { name: 'Four on the Floor', k: 'X...X...X...X...', c: '....X.......X...', h: '..x...x...x...x.', ch: { h: 'x.x.x.x.x.x.x.x.', o: '..x...x...x...x.', p: 'xxxxxxxxxxxxxxxx' } },
  stomp: { name: 'Stomp & Clap', k: 'X.X.....X.X.....', c: '....X.......X...', p: '..x...x...x...x.', ch: { h: 'x.x.x.x.x.x.x.x.', s: '....x.......x...' } },
  ballad: { name: 'Ballad', k: 'X.......x.......', r: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', ch: { k: 'X.......X.x.....', s: '....X.......X...', r: null } },
  halftime: { name: 'Half-Time', k: 'X.........x.....', s: '........X.......', h: 'x.x.x.x.x.x.x.x.', ch: { c: '........X.......', o: '......x.......x.' } },
  trap: { name: 'Trap', k: 'X......x..X.....X......x..x..x..', s: '........X...............X.......', c: '........X...............X.......',
    h: 'x.x.x.x.x.x.x.x.x.x.x.xtx.x.rrrr', ch: { o: '..............x...............x.' } },
  drill: { name: 'Drill', k: 'X.....X...X.....X..x..X...X.....', s: '........X...............X..X....', h: 'x..x..x.x..x..x.x..x..x.x.rx..x.', ch: { c: '........X...............X.......' } },
  boombap: { name: 'Boom Bap', k: 'X.........X.....X......x..X..x..', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', ch: { o: '......x.........' } },
  dusty: { name: 'Dusty', k: 'X..x......X.....', s: '....X.......X..g', h: 'x.xgx.x.x.xgx.x.', ch: { p: '..x...x...x...x.' } },
  lofi: { name: 'Lazy', k: 'X......x.x......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', ch: { p: '..x...x...x...x.' } },
  rimshot: { name: 'Rimshot', k: 'X.....x...X.....', r: '....X.......X...', h: 'xx.xxx.xxx.xxx.x', ch: { s: '....x.......x...' } },
  rnb: { name: 'Silk', k: 'X..x......x.....', s: '....X.......X...', r: 'g..g..g......g..', h: 'xxxxxxxxxxxxxxxx', ch: { c: '....X.......X...' } },
  slowjam: { name: 'Slow Jam', k: 'X.......x.x.....', s: '........X.......', h: 'x.x.x.x.x.x.x.x.x.x.x.x.x.x.xtxt', ch: { c: '........X.......' } },
  house: { name: 'House', k: 'X...X...X...X...', c: '....X.......X...', o: '..x...x...x...x.', h: '.x.x.x.x.x.x.x.x', ch: { p: 'xxxxxxxxxxxxxxxx', s: '....X.......X...' } },
  bigroom: { name: 'Big Room', k: 'X...X...X...X...', c: '....X.......X...', h: '..x...x...x...x.', ch: { s: '....X.......X...', o: '..x...x...x...x.', h: 'x.x.x.x.x.x.x.x.' } },
  future: { name: 'Future Bass', k: 'X.........X.....', s: '........X.......', c: '........X.......', h: 'x.x.x.x.x.x.x.x.', ch: { o: '......x.......x.', p: 'x.xxx.xxx.xxx.xx' } },
  rock: { name: 'Rock', k: 'X.....x.X.......', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', ch: { h: null, o: 'x.x.x.x.x.x.x.x.', k: 'X.....x.X.x.....' } },
  driving: { name: 'Driving', k: 'X...X.X.X...X.X.', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', ch: { h: null, o: 'x.x.x.x.x.x.x.x.' } },
  train: { name: 'Train Beat', k: 'X.......X.......', s: 'g.g.X.g.g.g.X.g.', p: 'xxxxxxxxxxxxxxxx', ch: { h: 'x.x.x.x.x.x.x.x.', s: 'g.g.X.ggg.g.X.gg' } },
  dembow: { name: 'Dembow', k: 'X...X...X...X...', s: '...x..x....x..x.', h: 'x.x.x.x.x.x.x.x.', ch: { c: '...x..x....x..x.', p: 'xxxxxxxxxxxxxxxx' } },
  perreo: { name: 'Perreo', k: 'X...X...X...X...', s: '...x..x....x..x.', c: '...x..x....x..x.', h: 'xxxxxxxxxxxxxxxx', ch: { o: '..x...x...x...x.' } },
  shuffle: { name: 'Shuffle', k: 'X.......X.......', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', ch: { h: null, o: 'x.x.x.x.x.x.x.x.', k: 'X.....x.X.......' } },
  jpop: { name: 'J-Pop Drive', k: 'X.....X.X.....x.', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', ch: { o: '..x...x...x...x.', c: '....X.......X...', k: 'X.x...X.X.x...x.' } },
  rumba: { name: 'Rumba', k: 'X..x....X..x....', s: '....X.......X...', c: '..x...x...x...x.', p: 'x.xxx.xxx.xxx.xx', ch: { o: '......x.......x.' } },
  doowop: { name: '’50s Shuffle', grid: 12, k: 'X.....X.....', s: '...X.....X..', h: 'x.xx.xx.xx.x', ch: { c: '...X.....X..', h: 'xxxxxxxxxxxx' } },
  slowrock: { name: 'Slow Rock', grid: 12, k: 'X.....X..x..', s: '...X.....X..', h: 'xxxxxxxxxxxx', ch: { o: 'x.....x.....', k: 'X..x..X..x..' } },
};

/* The genres: the progressions each section plays (the chorus's is the genre's famous one), the
   grooves that go with it, how the chords and bass move (comp and bass rows: X x g hits, '-' holds
   the note on; bass notes R root, 5 fifth, O octave, 3 third, 6 sixth, 7 flat seventh), the chorus's
   arpeggio (digits: notes of the chord up from the bottom) and each instrument's sound for it. */
export const GENRES = {
  pop: { name: 'Pop', emoji: '🎤', minor: false, key: 0, bpm: 112, beats: ['radio', 'fourfloor', 'stomp'], kit: 'pop',
    verse: ['vi', 'IV', 'I', 'V'], pre: ['IV', 'IV', 'V', 'V'], chorus: ['I', 'V', 'vi', 'IV'], bridge: ['IV', 'V', 'vi', 'vi'],
    comp: 'X..x..x...x.x...', compChorus: 'X.x.x.x.X.x.x.x.', bass: 'R.....R.R.....R.', bassChorus: 'R.R.R.R.R.R.R.R.', arp: '0.1.2.1.3.1.2.1.',
    tone: { synth: 'saw', piano: 'grand', guitar: 'acoustic' }, blurb: 'The four chords behind half the radio' },
  sadpop: { name: 'Sad Pop', emoji: '🌧️', minor: false, key: 7, bpm: 80, beats: ['ballad', 'halftime', 'radio'], kit: 'pop',
    verse: ['vi', 'IV', 'I', 'V'], pre: ['ii', 'ii', 'IV', 'V'], chorus: ['vi', 'IV', 'I', 'V'], bridge: ['IV', 'I', 'V', 'vi'],
    comp: 'X.......x.......', compChorus: 'X...x...X...x.x.', bass: 'R-------R-----5-', bassChorus: 'R---R---R---R-5-', arp: '0..1..2.3..2..1.',
    tone: { synth: 'warm', piano: 'grand', guitar: 'acoustic' }, blurb: 'Heartbreak in four chords' },
  trap: { name: 'Trap', emoji: '🔥', minor: true, key: 9, bpm: 140, beats: ['trap', 'drill', 'halftime'], kit: 'trap', b808: true,
    verse: ['i', 'bVI', 'bIII', 'bVII'], pre: ['iv', 'iv', 'V', 'V'], chorus: ['i', 'bVI', 'bIII', 'bVII'], bridge: ['bVI', 'bVII', 'i', 'i'],
    comp: 'X.......X.......', bass: 'R------R--R-----', bassChorus: 'R------R--R---O-', arp: '0.2.4.2.1.3.4.3.',
    tone: { synth: 'bell', piano: 'grand', guitar: 'clean' }, labels: { chorus: 'Hook' }, blurb: 'Dark bells, rolling hats, 808s' },
  boombap: { name: 'Boom Bap', emoji: '📻', minor: true, key: 2, bpm: 90, swing16: 0.5, beats: ['boombap', 'dusty'], kit: 'dusty',
    verse: ['i7', 'iv7', 'bVImaj7', 'V7'], pre: ['bVImaj7', 'bVImaj7', 'V7', 'V7'], chorus: ['i7', 'iv7', 'bVImaj7', 'V7'], bridge: ['iv7', 'iv7', 'i7', 'V7'],
    comp: 'X.....x...X.....', compChorus: 'X.....x...X...x.', bass: 'R-----R-..R-..5-', arp: '0...2...1...3...',
    tone: { synth: 'warm', piano: 'ep', guitar: 'clean' }, labels: { chorus: 'Hook' }, blurb: 'Jazzy chops for a cypher' },
  lofi: { name: 'Lo-Fi', emoji: '☕', minor: false, key: 5, bpm: 78, swing16: 0.55, crackle: true, beats: ['lofi', 'rimshot'], kit: 'dusty',
    verse: ['ii7', 'V7', 'Imaj7', 'vi7'], pre: ['IVmaj7', 'IVmaj7', 'iii7', 'VI7'], chorus: ['ii7', 'V7', 'Imaj7', 'vi7'], bridge: ['IVmaj7', 'iii7', 'ii7', 'V7'],
    comp: 'X......x........', compChorus: 'X.....x...x.....', bass: 'R---..R-5---..3-', arp: '0..1..2..3..2...',
    tone: { synth: 'warm', piano: 'ep', guitar: 'clean' }, blurb: 'Rainy-window jazz on vinyl' },
  rnb: { name: 'R&B', emoji: '💜', minor: false, key: 3, bpm: 88, swing16: 0.25, beats: ['rnb', 'slowjam'], kit: 'pop',
    verse: ['Imaj7', 'iii7', 'vi7', 'IVmaj7'], pre: ['ii7', 'ii7', 'V9', 'V9'], chorus: ['IVmaj7', 'iii7', 'ii7', 'Imaj7'], bridge: ['vi9', 'vi9', 'IVmaj7', 'V9'],
    comp: 'X.......x..x....', compChorus: 'X..x....X..x..x.', bass: 'R--R------R-5-O-', arp: '0.1.2.3.4.3.2.1.',
    tone: { synth: 'warm', piano: 'ep', guitar: 'clean' }, blurb: 'Silky sevenths that slide down' },
  edm: { name: 'EDM', emoji: '⚡', minor: false, key: 7, bpm: 126, beats: ['house', 'bigroom', 'future'], kit: 'edm', sidechain: true, build: true, introDrums: true,
    verse: ['vi', 'IV', 'I', 'V'], pre: ['vi', 'IV', 'I', 'V'], chorus: ['vi', 'IV', 'I', 'V'], bridge: ['IV', 'IV', 'V', 'V'],
    comp: '..X...x...X...x.', compChorus: 'X.......X.......', bass: '..R...R...R...R.', bassChorus: 'R.R.R.R.R.R.R.R.', arp: '0123012301230123',
    tone: { synth: 'supersaw', piano: 'grand', guitar: 'clean' }, labels: { pre: 'Build', chorus: 'Drop', bridge: 'Breakdown' }, blurb: 'Build it up, then drop' },
  rock: { name: 'Rock', emoji: '🎸', minor: false, key: 4, bpm: 128, beats: ['rock', 'driving', 'stomp'], kit: 'rock', power: true,
    verse: ['I', 'bVII', 'IV', 'I'], pre: ['IV', 'IV', 'V', 'V'], chorus: ['I', 'V', 'bVII', 'IV'], bridge: ['vi', 'IV', 'vi', 'V'],
    comp: 'm.m.m.m.m.m.m.m.', compChorus: 'X.......X...x.x.', bass: 'R.R.R.R.R.R.R.R.', arp: '0.1.2.1.0.1.2.1.',
    tone: { synth: 'saw', piano: 'grand', guitar: 'drive' }, blurb: 'Big guitars, the ♭VII swagger' },
  country: { name: 'Country', emoji: '🤠', minor: false, key: 7, bpm: 104, beats: ['train', 'radio', 'stomp'], kit: 'rock',
    verse: ['I', 'IV', 'I', 'V'], pre: ['IV', 'IV', 'V', 'V'], chorus: ['IV', 'I', 'V', 'vi'], bridge: ['vi', 'IV', 'I', 'V'],
    comp: 'X..xX.x.X..xX.x.', bass: 'R...5...R...5...', arp: '0.1.2.3.2.1.2.3.',
    tone: { synth: 'saw', piano: 'grand', guitar: 'acoustic' }, blurb: 'Three chords and the truth' },
  reggaeton: { name: 'Reggaeton', emoji: '🌴', minor: true, key: 11, bpm: 94, beats: ['dembow', 'perreo'], kit: 'pop',
    verse: ['i', 'bVI', 'bIII', 'bVII'], pre: ['bVI', 'bVI', 'bVII', 'bVII'], chorus: ['i', 'bVII', 'bVI', 'bVII'], bridge: ['bVI', 'bVII', 'i', 'i'],
    comp: 'X..X..X.X..X..X.', bass: 'R--R--R-R--R--R-', arp: '0.2.1.2.0.2.1.3.',
    tone: { synth: 'bell', piano: 'grand', guitar: 'nylon' }, blurb: 'The dembow that never stops' },
  blues: { name: 'Blues', emoji: '🎷', minor: false, key: 9, bpm: 96, swing8: 0.66, beats: ['shuffle', 'stomp'], kit: 'rock',
    verse: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    chorus: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    intro: ['V7', 'IV7', 'I7', 'V7'], outro: ['I7', 'IV7', 'I7', 'I7'],
    form: [['intro', 4], ['verse', 12], ['chorus', 12], ['verse', 12], ['chorus', 12], ['outro', 4]],
    comp: 'X.x.X.x.X.x.X.x.', bass: 'R.3.5.6.O.6.5.3.', arp: '0.1.2.3.2.1.0.1.',
    tone: { synth: 'saw', piano: 'grand', guitar: 'clean' }, blurb: 'Twelve bars, shuffled' },
  anime: { name: 'Anime', emoji: '🌸', minor: false, key: 2, bpm: 148, beats: ['jpop', 'radio', 'fourfloor'], kit: 'rock',
    verse: ['vi', 'IV', 'V', 'I'], pre: ['ii7', 'ii7', 'V', 'V'], chorus: ['IVmaj7', 'V7', 'iii7', 'vi'], bridge: ['ii7', 'V7', 'Imaj7', 'vi7'],
    comp: 'X.x.x.x.X.x.x.x.', compChorus: 'X.xX.xX.X.xX.x.x', bass: 'R.R.R.R.R.R.R.R.', bassChorus: 'R.O.R.O.R.O.R.O.', arp: '0123432101234321',
    tone: { synth: 'saw', piano: 'grand', guitar: 'drive' }, blurb: 'The Royal Road of every opening' },
  flamenco: { name: 'Flamenco', emoji: '💃', minor: true, key: 9, bpm: 116, beats: ['rumba', 'halftime'], kit: 'rock',
    verse: ['i', 'bVII', 'bVI', 'V'], pre: ['iv', 'iv', 'V', 'V'], chorus: ['i', 'bVII', 'bVI', 'V'], bridge: ['bVI', 'bVI', 'V', 'V'],
    comp: 'X..x..x.X..x..x.', compChorus: 'X.xX.xX.X.xX.xX.', bass: 'R.....5.R.....5.', arp: '0.1.2.1.0.1.2.1.',
    tone: { synth: 'bell', piano: 'grand', guitar: 'nylon' }, blurb: 'The Andalusian walk down' },
  doowop: { name: 'Doo-Wop', emoji: '🎙️', minor: false, key: 0, bpm: 72, grid: 12, beats: ['doowop', 'slowrock'], kit: 'rock',
    verse: ['I', 'vi', 'IV', 'V'], pre: ['IV', 'IV', 'V', 'V'], chorus: ['I', 'vi', 'IV', 'V'], bridge: ['IV', 'iv', 'I', 'V'],
    comp: 'XxxXxxXxxXxx', bass: 'R..3..5..6..', arp: '012321012321',
    tone: { synth: 'warm', piano: 'grand', guitar: 'clean' }, blurb: 'The ’50s slow dance' },
};
export const GENRE_ORDER = ['pop', 'sadpop', 'trap', 'rnb', 'edm', 'lofi', 'boombap', 'rock', 'country', 'reggaeton', 'anime', 'blues', 'flamenco', 'doowop'];
export const INSTRUMENTS = { synth: 'Synth', piano: 'Piano', guitar: 'Guitar' };

// The chorus's progression in numerals, shown on the genre's card: "I–V–vi–IV"
export const hookOf = (g) => (g.form ? '12-bar blues' : g.chorus.map((s) => s.replace(/b/g, '♭')).join('–'));
export const hookNames = (g, keyPc) => g.chorus.slice(0, g.form ? 12 : 4).filter((s, i, a) => !g.form || a.indexOf(s) === i).map((s) => chordName(s, keyPc, g.minor)).join(' ');

/* The song: intro, two verses and choruses with a build before each, a bridge, the last chorus and
   an outro (64 bars; the blues does its twelves). */
export const FORM = [['intro', 4], ['verse', 8], ['pre', 4], ['chorus', 8], ['verse', 8], ['pre', 4], ['chorus', 8], ['bridge', 8], ['chorus', 8], ['outro', 4]];
const LABEL = { intro: 'Intro', verse: 'Verse', pre: 'Pre-Chorus', chorus: 'Chorus', bridge: 'Bridge', outro: 'Outro' };
export const ENERGY = { intro: 0.25, verse: 0.5, pre: 0.7, chorus: 1, bridge: 0.35, outro: 0.3, loop: 0.8 };
export function formOf(g) {
  let start = 0;
  const count = {};
  return (g.form || FORM).map(([kind, bars]) => {
    count[kind] = (count[kind] || 0) + 1;
    const s = { kind, bars, start, n: count[kind], label: (g.labels && g.labels[kind]) || LABEL[kind] };
    start += bars;
    return s;
  }).map((s, i, all) => ({ ...s, title: s.kind === 'verse' && all.filter((o) => o.kind === 'verse').length > 1 ? s.label + ' ' + s.n : s.label }));
}
export const formBars = (form) => form[form.length - 1].start + form[form.length - 1].bars;
export function sectionAt(form, bar) {
  for (let i = 0; i < form.length; i++) { const s = form[i]; if (bar >= s.start && bar < s.start + s.bars) return { i, s, barIn: bar - s.start }; }
  return null;
}
export function chordSymAt(g, form, bar) {
  const at = sectionAt(form, bar);
  if (!at) return g.chorus[0];
  const prog = g[at.s.kind] || (at.s.kind === 'intro' || at.s.kind === 'outro' ? g.verse : g.chorus);
  return prog[at.barIn % prog.length];
}
// Bars from `bar` until the next section of a kind starts (0 = it starts this bar), or null.
export function barsUntil(form, bar, kind = 'chorus') {
  for (const s of form) if (s.kind === kind && s.start > bar) return s.start - bar;
  return null;
}
// The bar after this one: the outro when the song's done, or (keep going) back to the second verse.
export function nextBar(form, bar, keepGoing) {
  const n = bar + 1, at = sectionAt(form, n);
  if (keepGoing && (!at || at.s.kind === 'outro')) { const verses = form.filter((s) => s.kind === 'verse'); return (verses[1] || verses[0]).start; }
  return at ? n : -1;
}

/* Sing a song (JC, Nov 20 2026: kids singing a song they know, as a short clip). The band loops one
   progression with no song form and the singer brings the words and the tune: a chord progression
   belongs to nobody, so Studio never names, plays or shows anyone's song. The loops are written in a
   major key; a minor genre plays them in its relative major (the same notes: A minor's Am F C G is
   C major's vi IV I V), so the key Studio hears you hum always fits whichever you pick. */
export const LOOPS = {
  genre: { name: 'This genre’s own', blurb: 'The chorus chords of the genre you picked' },
  four: { name: 'The four chords', prog: ['I', 'V', 'vi', 'IV'], blurb: 'Behind more pop hits than any other' },
  sad: { name: 'Sad four', prog: ['vi', 'IV', 'I', 'V'], blurb: 'The same four from the sad side' },
  fifties: { name: '’50s', prog: ['I', 'vi', 'IV', 'V'], blurb: 'Doo-wop, slow dances, old love songs' },
  three: { name: 'Three chords', prog: ['I', 'IV', 'V', 'IV'], blurb: 'Rock, country and campfire songs' },
  two: { name: 'Two chords', prog: ['I', 'IV'], blurb: 'Back and forth, a bar each' },
  walk: { name: 'Walk down', prog: ['vi', 'V', 'IV', 'III'], blurb: 'The Andalusian walk: flamenco and surf' },
  royal: { name: 'Royal Road', prog: ['IVmaj7', 'V7', 'iii7', 'vi'], end: 'vi', blurb: 'Anime openings and J-pop' },
  jazzy: { name: 'Jazzy', prog: ['ii7', 'V7', 'Imaj7', 'vi7'], end: 'Imaj7', blurb: 'Lo-fi beats and old standards' },
  blues: { name: 'Twelve-bar blues', prog: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'], blurb: 'The blues and old rock ’n’ roll' },
};
export const LOOP_ORDER = Object.keys(LOOPS);
// What a song's loop plays: the chords, the key and mode they're named in, and the chord it ends on.
export function loopSpec(song) {
  const g = GENRES[song.genre] || GENRES.pop, key = song.key ?? g.key, L = LOOPS[song.loop];
  if (!L || !L.prog) return { prog: g.chorus, key, minor: g.minor, end: g.chorus.find((s) => parseChord(s).deg === 0) || (g.minor ? 'i' : 'I') };
  return { prog: L.prog, key: g.minor ? mod12(key + 3) : key, minor: false, end: L.end || L.prog[0] };
}
// A loop's chords by name in the song's key, each once: "C G Am F"
export function loopChords(song, id = song.loop) {
  const sp = loopSpec({ ...song, loop: id });
  return [...new Set(sp.prog)].map((s) => chordName(s, sp.key, sp.minor)).join(' ');
}
const phraseOf = (n) => (n >= 8 ? n : 8);   // a crash and a fill every eight bars (the blues: every twelve)
/* A clip's length in bars before its last big chord: whole rounds of four bars (of twelve for the
   blues), as close as that gets to the seconds asked for with the ending bar counted in. */
export function clipBars(song, seconds) {
  const sp = loopSpec(song), unit = sp.prog.length >= 8 ? sp.prog.length : 4, bar = 240 / (song.bpm || 100);
  return Math.max(1, Math.round((seconds - bar) / bar / unit)) * unit;
}
/* The key of a hummed tune: how long each note was sung (a count per pitch class) matched against
   the Krumhansl-Kessler profiles of all 24 keys, then said in the genre's own mode through the
   relative key (a tune in A minor is C in a major genre: the same notes, so every loop fits). */
const KK = { major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], minor: [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] };
export function keyFromNotes(hist, minor = false) {
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length, hm = avg(hist);
  let best = { k: 0, m: false }, bestR = -2;
  for (const m of [false, true]) {
    const prof = KK[m ? 'minor' : 'major'], pm = avg(prof);
    for (let k = 0; k < 12; k++) {
      let num = 0, dh = 0, dp = 0;
      for (let i = 0; i < 12; i++) { const h = hist[(k + i) % 12] - hm, p = prof[i] - pm; num += h * p; dh += h * h; dp += p * p; }
      const r = dh && dp ? num / Math.sqrt(dh * dp) : -1;
      if (r > bestR) { bestR = r; best = { k, m }; }
    }
  }
  return best.m === minor ? best.k : mod12(best.k + (minor ? 9 : 3));
}

/* A row of a groove or a part into hits: [{ step, vel, ch }] ('r' and 't' split a step). */
const VEL = { X: 1, x: 0.72, g: 0.36, m: 0.7, r: 0.6, t: 0.55 };
export function hits(row, bar = 0, grid = 16) {
  if (!row) return [];
  const len = row.length, off = len > grid ? (bar % Math.round(len / grid)) * grid : 0, out = [];
  for (let i = 0; i < grid; i++) {
    const ch = row[off + i];
    if (!ch || ch === '.' || ch === '-') continue;
    if (ch === 'r') { out.push({ step: i, vel: VEL.r, ch }, { step: i + 0.5, vel: VEL.r * 0.85, ch }); continue; }
    if (ch === 't') { for (let k = 0; k < 3; k++) out.push({ step: i + k / 3, vel: VEL.t * (0.8 + k * 0.1), ch }); continue; }
    const vel = VEL[ch] ?? (/[1-9]/.test(ch) ? +ch / 9 : 0.72);
    out.push({ step: i, vel, ch });
  }
  return out;
}
// How long each hit of a comp or bass row holds: up to the next hit, or through its '-' holds.
function holds(row, i, grid, sustain) {
  let n = 1;
  while (i + n < grid && row[i + n] === '-') n++;
  if (sustain) { n = 1; while (i + n < grid && (row[i + n] === '.' || row[i + n] === '-')) n++; }
  return n;
}

export function grooveFor(beat, kind) {
  const rows = {};
  for (const v of ['k', 's', 'c', 'h', 'o', 'r', 'p']) if (beat[v]) rows[v] = beat[v];
  if (kind === 'chorus') for (const [v, row] of Object.entries(beat.ch || {})) { if (row === null) delete rows[v]; else rows[v] = row; }
  return rows;
}

/* Everything that plays in one bar, for one song ({ genre, key, inst, beat, bpm }). Events:
   d drum (v: k s c h o r p x crash), c chord (notes, strum, mute), b bass (note, glide), a arpeggio,
   f effect (riser, gap, filter, end). Steps are sixteenths (twelfths for a 12/8 genre).
   Sing a song (song.loop): the loop played like a chorus without the arpeggio (room for the singer),
   a crash and a fill every phrase, and at `endBar` one big last chord. */
export function barEvents(song, bar, endBar = null) {
  let g = GENRES[song.genre] || GENRES.pop, form, key = song.key ?? g.key;
  if (song.loop) {
    if (endBar != null && bar > endBar) return [];
    const sp = loopSpec(song), phrase = phraseOf(sp.prog.length), ending = endBar != null && bar === endBar;
    g = { ...g, chorus: sp.prog, outro: [sp.end], arp: null, loop: true };
    key = sp.key;
    form = [{ kind: ending ? 'outro' : 'chorus', bars: ending ? 1 : phrase, start: 0, n: 1 }];
    bar = ending ? 0 : ((bar % phrase) + phrase) % phrase;
  } else form = formOf(g);
  const at = sectionAt(form, bar);
  if (!at) return [];
  const grid = g.grid || 16, beatLen = grid / 4;
  const { s, barIn, i: si } = at, kind = s.kind, last = barIn === s.bars - 1;
  const next = form[si + 1], nextKind = next ? next.kind : null;
  const intoChorus = last && nextKind === 'chorus';
  const beat = song.beat === 'off' ? null : BEATS[song.beat] && (BEATS[song.beat].grid || 16) === grid ? BEATS[song.beat] : BEATS[g.beats[0]];
  const sym = chordSymAt(g, form, bar), c = parseChord(sym);
  const inst = song.inst || 'piano', tone = g.tone[inst];
  const ev = [];
  const D = (v, step, vel) => ev.push({ t: 'd', v, step, vel });

  /* drums */
  if (beat) {
    const rows = grooveFor(beat, kind);
    const build = (kind === 'pre' && g.build) || ((kind === 'pre' || kind === 'bridge') && last && nextKind === 'chorus');
    if (kind === 'intro' || kind === 'outro') {
      const endHit = kind === 'outro' && last;
      if (endHit) { D('x', 0, 0.9); D('k', 0, 1); }
      else {
        for (const h of hits(rows.h || rows.p, bar, grid)) D(rows.h ? 'h' : 'p', h.step, h.vel * 0.6);
        if (g.introDrums && kind === 'intro') for (const h of hits(rows.k, bar, grid)) D('k', h.step, h.vel * 0.8);
        if (kind === 'intro' && last) for (let k = 0; k < beatLen; k++) D('s', grid - beatLen + k, 0.3 + 0.15 * k);
      }
    } else if (kind === 'bridge' && !last) {
      D('k', 0, 0.9); if (barIn % 2 === 1) D('k', grid / 2 + beatLen / 2, 0.5);
      for (const h of hits(rows.h || rows.p, bar, grid)) D('h', h.step, h.vel * 0.5);
      D('r', beatLen, 0.5); D('r', beatLen * 3, 0.5);
    } else {
      const cut = build && g.build;
      for (const [v, row] of Object.entries(rows)) {
        for (const h of hits(row, bar, grid)) {
          if (cut && last && h.step >= grid - beatLen) continue;            // EDM: the last beat before the drop is silent
          if (build && last && v === 'k' && h.step >= grid / 2) continue;   // the kick sits out the end of the build
          if (build && (v === 's' || v === 'c') && (last || (g.build && barIn >= s.bars - 2))) continue;
          D(v, h.step, h.vel);
        }
      }
      if (kind === 'chorus' && barIn === 0) D('x', 0, 1);
      if (kind === 'chorus' && barIn === 4) D('x', 0, 0.55);
      if (build) {
        // the snare roll: every beat, then eighths, then sixteenths (the EDM build climbs over all of it)
        const span = g.build ? s.bars : 1, k = g.build ? barIn : 0;
        const step = g.build ? [beatLen, beatLen, beatLen / 2, beatLen / 4][Math.min(3, Math.floor(k * 4 / span))] : null;
        if (g.build) { for (let p = 0; p < grid - (last ? beatLen : 0); p += step) D('s', p, 0.35 + 0.6 * ((k * grid + p) / (span * grid))); }
        else { for (let p = 0; p < grid; p += p < grid / 2 ? beatLen / 2 : beatLen / 4) D('s', p, 0.35 + 0.6 * (p / grid)); }
      } else if (last && (g.loop || nextKind === 'chorus' || nextKind === 'pre' || nextKind === 'verse' || nextKind === 'bridge') && kind !== 'pre') {
        for (let k = 0; k < beatLen; k++) D('s', grid - beatLen + k, 0.4 + 0.15 * k);   // a little fill into the next part
      }
    }
  }

  /* chords */
  const voicing = inst === 'guitar' ? guitarVoicing(c, key, g.power && tone === 'drive') : keysVoicing(c, key, tone === 'bell' ? 67 : 62);
  const big = kind === 'chorus' && inst !== 'guitar' ? [...voicing, voicing[voicing.length - 1] + (voicing.length > 3 ? 12 : 12)] : voicing;
  const sustainKind = kind === 'intro' || kind === 'bridge' || kind === 'outro';
  if (kind === 'outro' && last) ev.push({ t: 'c', notes: voicing, step: 0, dur: grid * 2, vel: 0.85, tone, strum: 'd' });
  else if (sustainKind) {
    const parts = kind === 'bridge' ? 2 : 1;
    for (let p = 0; p < parts; p++) ev.push({ t: 'c', notes: voicing, step: p * grid / parts, dur: grid / parts, vel: kind === 'bridge' ? 0.62 : 0.55, tone, strum: 'd', pad: true });
  } else {
    const row = kind === 'chorus' && g.compChorus ? g.compChorus : g.comp;
    const sustain = tone === 'supersaw' || tone === 'warm' || g.comp === 'X.......X.......';
    for (const h of hits(row, bar, grid)) {
      const i = Math.floor(h.step), dur = holds(row, i, grid, true);
      const dir = grid === 12 ? 'd' : i % 4 === 0 ? 'd' : 'u';
      const mute = h.ch === 'm';
      if (intoChorus && g.build && h.step >= grid - beatLen) continue;
      ev.push({ t: 'c', notes: kind === 'chorus' ? big : voicing, step: h.step, dur: sustain ? dur : Math.min(dur, beatLen * 2), vel: h.vel * (kind === 'chorus' ? 1 : 0.85), tone, strum: dir, mute });
    }
  }

  /* bass */
  if (kind !== 'intro' || g.introDrums) {
    const b808 = !!g.b808;
    if (kind === 'intro' || kind === 'bridge' || (kind === 'outro' && !last)) {
      if (kind !== 'intro') ev.push({ t: 'b', note: bassNote(c, key, 'R', b808), step: 0, dur: grid, vel: 0.7, b808 });
    } else if (kind === 'outro' && last) ev.push({ t: 'b', note: bassNote(c, key, 'R', b808), step: 0, dur: grid * 2, vel: 0.8, b808 });
    else if (kind === 'pre' && last && !g.build && !b808) {
      for (let p = 0; p < grid; p += beatLen / 2) ev.push({ t: 'b', note: bassNote(c, key, 'R', b808), step: p, dur: beatLen / 2, vel: 0.55 + 0.4 * p / grid, b808 });
    } else {
      const row = kind === 'chorus' && g.bassChorus ? g.bassChorus : g.bass;
      for (let i = 0; i < grid; i++) {
        const ch = row[i];
        if (!ch || ch === '.' || ch === '-') continue;
        if (intoChorus && g.build && i >= grid - beatLen) continue;
        const dur = holds(row, i, grid, false);
        const note = bassNote(c, key, ch, b808);
        const glide = b808 && ch === 'O' ? bassNote(c, key, 'R', b808) : null;
        ev.push({ t: 'b', note, step: i, dur, vel: ch === 'R' ? 0.85 : 0.7, b808, glide });
      }
    }
  }

  /* the chorus's arpeggio */
  if (kind === 'chorus' && g.arp) {
    const top = keysVoicing(c, key, 72);
    for (let i = 0; i < grid; i++) {
      const ch = g.arp[i];
      if (!ch || ch === '.') continue;
      const d = +ch, note = top[d % top.length] + 12 * Math.floor(d / top.length);
      ev.push({ t: 'a', note, step: i, dur: 2, vel: 0.5, tone: inst === 'guitar' ? 'pluckGuitar' : inst === 'piano' ? 'grand' : tone === 'supersaw' ? 'pluck' : tone === 'warm' ? 'bell' : 'pluck' });
    }
  }

  /* effects: the filter by section, the riser into a chorus, the gap before a drop, the end */
  if (barIn === 0) ev.push({ t: 'f', k: 'filter', kind, bars: s.bars, step: 0 });
  const riserBars = g.build && kind === 'pre' ? s.bars : 2;
  if ((kind === 'pre' || kind === 'bridge') && nextKind === 'chorus' && barIn === s.bars - riserBars) ev.push({ t: 'f', k: 'riser', bars: riserBars, step: 0 });
  if (intoChorus && g.build) ev.push({ t: 'f', k: 'gap', step: grid - beatLen });
  if (kind === 'outro' && last) ev.push({ t: 'f', k: 'end', step: grid, tail: g.loop ? 1.6 : 2.6 });
  return ev;
}

/* Where the song is, for the beat bar: section, bar in it, the chord now and next, bars until the
   next chorus (or drop, or hook). */
export function songInfo(song, bar, endBar = null) {
  if (song.loop) {   // sing a song: the loop's chord now and next, then the last big chord
    const sp = loopSpec(song), n = sp.prog.length, ending = endBar != null && bar >= endBar, i = ((bar % n) + n) % n;
    const sym = ending ? sp.end : sp.prog[i], c = parseChord(sym);
    const nextSym = ending ? null : endBar != null && bar + 1 >= endBar ? sp.end : sp.prog[(i + 1) % n];
    return {
      i: 0, kind: ending ? 'end' : 'loop', title: ending ? 'The end' : 'Sing along', label: 'Sing along', barIn: i, bars: n, loop: true,
      sym, chord: chordName(sym, sp.key, sp.minor), deg: c.deg, next: nextSym ? chordName(nextSym, sp.key, sp.minor) : null,
      toChorus: null, chorusLabel: '', energy: ENERGY.loop, tune: tuneSet(sp.key, sp.minor, sym), pcs: chordPcs(c, sp.key), root: mod12(sp.key + c.deg),
    };
  }
  const g = GENRES[song.genre] || GENRES.pop, form = formOf(g), at = sectionAt(form, bar), key = song.key ?? g.key;
  if (!at) return null;
  const sym = chordSymAt(g, form, bar), nb = nextBar(form, bar, song.keepGoing);
  const nextSym = nb >= 0 ? chordSymAt(g, form, nb) : null;
  let toChorus = barsUntil(form, bar, 'chorus');
  if (toChorus == null && song.keepGoing) { const v2 = nextBar(form, form[form.length - 1].start - 1, true); toChorus = (formBars(form) - 4 - bar) + (barsUntil(form, v2, 'chorus') ?? 0); }
  const c = parseChord(sym);
  return {
    i: at.i, kind: at.s.kind, title: at.s.title, label: at.s.label, barIn: at.barIn, bars: at.s.bars,
    sym, chord: chordName(sym, key, g.minor), deg: c.deg, next: nextSym ? chordName(nextSym, key, g.minor) : null,
    toChorus, chorusLabel: (g.labels && g.labels.chorus) || 'Chorus', energy: ENERGY[at.s.kind],
    tune: tuneSet(key, g.minor, sym), pcs: chordPcs(c, key), root: (key + c.deg) % 12,
  };
}

// A song's name to start with: "Cosmic Pop in C"
const WORDS = ['Cosmic', 'Nebula', 'Starlight', 'Orbit', 'Galaxy', 'Comet', 'Supernova', 'Moonlit', 'Stardust', 'Aurora', 'Lunar', 'Solar'];
export function songName(song, n = Date.now()) {
  const g = GENRES[song.genre] || GENRES.pop, key = song.key ?? g.key;
  return WORDS[Math.abs(Math.floor(n / 1000)) % WORDS.length] + ' ' + (song.loop ? 'Sing-Along' : g.name) + ' in ' + noteName(key, flatKey(key, g.minor)) + (g.minor ? 'm' : '');
}
export const defaultSong = (genre = 'pop') => ({ genre, key: GENRES[genre].key, bpm: GENRES[genre].bpm, inst: 'piano', beat: GENRES[genre].beats[0], keepGoing: false, loop: null, clip: 30 });
