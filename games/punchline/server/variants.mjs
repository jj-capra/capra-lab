// The four-square (JC, Nov 8 2026: "a four square of images and you have to pick the one that is
// different... a mix of burnt out signs, misspellings"). Three tiles show a sign the way it
// should read; one is off. This works out both versions of a card:
//
//   lights / peeled   right: every letter lit         off: the card's sign, dark letters and all
//   misprint          right: the fixed sign            off: the card's sign, typo and all
//   design / back     right: the card's sign           off: the same sign with one flaw made here
//                                                     (a dead bulb on neon and marquee signs,
//                                                     otherwise a typo), never one that spells
//                                                     something rude
//
// and which letters of the odd one differ, so the reveal can circle them.
import { letters } from '../shared/glyphs.mjs';

const strip = (line) => line.replace(/~/g, '');
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean);

// The fixed reading of a misprint ("BOAT RENTALS") laid out on the sign's own lines.
export function fixedLines(sign, reading) {
  const w = words(reading), counts = sign.map((l) => words(strip(l)).length);
  if (counts.reduce((a, b) => a + b, 0) === w.length) {
    let k = 0;
    return counts.map((n) => { const line = w.slice(k, k + n).join(' '); k += n; return line; });
  }
  // different word counts: wrap to about the same number of lines
  const out = [];
  let line = '';
  const width = Math.max(10, Math.ceil(reading.length / Math.max(1, sign.length)) + 2);
  for (const x of w) {
    if (line && (line + ' ' + x).length > Math.min(20, width)) { out.push(line); line = x; } else line = line ? line + ' ' + x : x;
  }
  if (line) out.push(line);
  return out;
}

// Never let a made-up flaw spell something a family deck shouldn't.
const RUDE = /(shit|fuck|fck|cunt|cock|dick|piss|tit|ass|arse|damn|hell|crap|butt|sex|porn|cum|fag|nazi|kill|die|dead|slut|whore|bitch|anal|anus|nude|boob|poo|pee|fart|vomit|puke|wtf)/gi;
// rude words a reading has that the sign didn't already (a Late Night shirt can say FARTED; a flaw
// can't add anything)
const rudeCount = (s) => (String(s).replace(/[^\p{L}]/gu, '').match(RUDE) || []).length + (String(s).match(RUDE) || []).length;
const LOOKALIKE = { E: 'F', F: 'E', O: 'Q', Q: 'O', C: 'G', G: 'C', M: 'N', N: 'M', U: 'V', V: 'U', P: 'R', R: 'P', I: 'L', L: 'I', H: 'N', K: 'X', T: 'Y', Y: 'T', B: 'R', D: 'O', A: 'R', S: 'Z', W: 'V', Z: 'S', J: 'I', X: 'K' };
const isLetter = (ch) => /\p{L}/u.test(ch);

export function flaw(lines, scene, rand) {
  const glow = scene === 'neon' || scene === 'marquee';
  const spots = [];
  lines.forEach((l, li) => { [...l].forEach((ch, ci) => { if (isLetter(ch)) spots.push([li, ci]); }); });
  if (!spots.length) return { off: lines.slice(), type: null };
  const before = lines.map(strip).join(' ');
  for (let tries = 0; tries < 40; tries++) {
    const [li, ci] = spots[Math.floor(rand() * spots.length)];
    const line = [...lines[li]];
    const kind = glow && rand() < 0.8 ? 'lights' : ['swap', 'look', 'double', 'drop'][Math.floor(rand() * 4)];
    let next = null;
    if (kind === 'lights') next = [...line.slice(0, ci), '~', ...line.slice(ci)];
    else if (kind === 'swap') { if (ci + 1 < line.length && isLetter(line[ci + 1]) && line[ci + 1] !== line[ci]) { next = line.slice(); [next[ci], next[ci + 1]] = [next[ci + 1], next[ci]]; } }
    else if (kind === 'look') {
      const up = line[ci].toUpperCase(), sub = LOOKALIKE[up];
      if (sub) { next = line.slice(); next[ci] = line[ci] === up ? sub : sub.toLowerCase(); }
    } else if (kind === 'double') { if (strip(lines[li]).length < 20) next = [...line.slice(0, ci + 1), line[ci], ...line.slice(ci + 1)]; }
    else if (kind === 'drop') { const word = (strip(lines[li]).match(/\S+/g) || []).find(() => true); if (word && strip(lines[li]).length > 4) next = [...line.slice(0, ci), ...line.slice(ci + 1)]; }
    if (!next) continue;
    const off = lines.slice();
    off[li] = next.join('');
    const reads = kind === 'lights' ? off.map((l) => l.replace(/~./g, '')).join(' ') : off.map(strip).join(' ');
    if (reads === before || rudeCount(reads) > rudeCount(before)) continue;
    return { off, type: kind === 'lights' ? 'lights' : 'typo' };
  }
  return { off: lines.slice(), type: null };
}

// Which letters of the odd line differ from the right one (indexes into letters(line)).
export function marks(base, off) {
  return off.map((line, li) => {
    const g = letters(line);
    const dark = g.map((x, i) => (x.off ? i : -1)).filter((i) => i >= 0);
    const a = g.map((x) => x.c), b = [...strip(base[li] || '')];
    // longest common subsequence: what's left over in the odd line is the difference
    const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const keep = new Set();
    let gap = -1;
    for (let i = 0, j = 0; i < n && j < m;) {
      if (a[i] === b[j]) { keep.add(i); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else { if (gap < 0) gap = i; j++; }
    }
    const diff = a.map((_, i) => i).filter((i) => !keep.has(i) && a[i] !== ' ');
    const out = [...new Set([...dark, ...diff])].sort((x, y) => x - y);
    // a letter dropped: circle where it went missing
    if (!out.length && a.join('') !== b.join('')) out.push(Math.max(0, Math.min(n - 1, gap < 0 ? n - 1 : gap)));
    return out;
  });
}

const STAMP = { lights: 'BULB OUT!', peeled: 'FADED!', typo: 'TYPO!', misprint: 'TYPO!' };

// Both versions of a sign card, the flaw's stamp, and what to say at the reveal.
export function variantOf(card, rand) {
  let base, off, type;
  if (card.kind === 'lights' || card.kind === 'peeled') { base = card.sign.map(strip); off = card.sign.slice(); type = card.kind; }
  else if (card.kind === 'misprint') { base = fixedLines(card.sign, card.options[card.answer]); off = card.sign.slice(); type = 'misprint'; }
  // no visible difference (no dark letters, same letters): make one
  if (!base || (!off.some((l) => l.includes('~')) && base.map(strip).join(' ') === off.map(strip).join(' '))) {
    base = card.sign.slice();
    const f = flaw(base, card.scene, rand);
    off = f.off; type = f.type || 'typo';
  }
  const reading = card.kind === 'lights' || card.kind === 'peeled' ? `It reads “${card.options[card.answer]}”`
    : card.kind === 'misprint' ? `It should say “${card.options[card.answer]}”`
      : card.kind === 'design' ? `${(card.ask || 'What does it look like it says?').replace(/\?$/, '')}: “${card.options[card.answer]}”`
        : '';
  return { base, off, stamp: STAMP[type] || 'OOPS.', reading, marks: marks(base, off) };
}
