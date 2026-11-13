// Three Clue Crew: everything that doesn't touch the page, so it can be tested on its own.
// Three one-word clues, four choices, one answer (JC's spec, Nov 12 2026).

export const TIERS = [
  { id: 1, name: 'Early Readers', grades: 'K–1', short: 'K–1' },
  { id: 2, name: 'Developing Readers', grades: '2nd–3rd', short: '2–3' },
  { id: 3, name: 'Middle School', grades: '6–8', short: '6–8' },
  { id: 4, name: 'High School', grades: '9–12', short: '9–12' },
];
export const PER_GAME = 10;

// "Bark, Fur, Tail | Dog | Cat, Fish, Bird | A dog barks..." → { clues, answer, wrong, why }
export function parse(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const [clues, answer, wrong, ...why] = line.split(' | ');
    return {
      clues: clues.split(',').map((s) => s.trim()),
      answer: (answer || '').trim(),
      wrong: (wrong || '').split(',').map((s) => s.trim()),
      why: why.join(' | ').trim(),
    };
  });
}

// A small seeded random number generator, so a day's set is the same on every phone.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function shuffle(items, random = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The lab's day (Pacific time) and the daily number: No. 1 is Nov 12 2026, launch day.
export const FIRST_DAY = '2026-11-12';
export function labDay(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function dayNumber(day = labDay()) {
  return Math.round((Date.parse(day + 'T12:00:00Z') - Date.parse(FIRST_DAY + 'T12:00:00Z')) / 86400000) + 1;
}

// Today's ten for a tier, the same for everyone. The bank is dealt in shuffled passes, so a round
// comes back only after every other round in the tier has had its day.
export function dailySet(count, tier, no, n = PER_GAME) {
  const per = Math.max(1, Math.floor(count / n));
  const pass = Math.floor((no - 1) / per);
  const slot = (no - 1) % per;
  const order = shuffle([...Array(count).keys()], rng(hash(`tcc:${tier}:${pass}`)));
  return order.slice(slot * n, slot * n + n);
}

// A practice set: rounds this phone hasn't seen yet come first.
export function quickSet(count, seen = [], n = PER_GAME, random = Math.random) {
  const old = new Set(seen);
  const all = [...Array(count).keys()];
  const fresh = shuffle(all.filter((i) => !old.has(i)), random);
  const stale = shuffle(all.filter((i) => old.has(i)), random);
  return [...fresh, ...stale].slice(0, n);
}
// Remember what was played; start over once the whole tier has been seen.
export function remember(seen = [], played = [], count = 0) {
  const next = [...new Set([...seen, ...played])].filter((i) => i >= 0 && i < count);
  return next.length >= count ? [...new Set(played)] : next;
}

// The four choices in a fixed order for a given seed.
export function choices(round, random = Math.random) {
  return shuffle([round.answer, ...round.wrong], random);
}

// How a game went, as the results card shows it.
export function rank(right, n = PER_GAME) {
  const r = right / n;
  if (r === 1) return 'PERFECT GAME!';
  if (r >= 0.8) return 'CLUE MASTER!';
  if (r >= 0.6) return 'SHARP THINKER!';
  if (r >= 0.4) return 'GETTING THERE!';
  return 'KEEP PLAYING!';
}
