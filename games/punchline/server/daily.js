// Today's drop: one family deck a day, the same for everyone (Pacific time), Wrong Signs, jokes and
// Ugly Ts taking turns, ten cards dealt from it. Late Night decks never drop.
import { CARDS_PER_GAME } from '../shared/rules.mjs';

export const EPOCH = '2026-11-08';   // drop No. 1
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
export const pacificDate = (ms) => fmt.format(new Date(ms));
export function dayDiff(a, b) {
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}
export function thanksgiving(y) {
  const dow = new Date(Date.UTC(y, 10, 1)).getUTCDay();
  return `${y}-11-${String(1 + ((4 - dow + 7) % 7) + 21).padStart(2, '0')}`;
}
// The seasonal joke decks keep the days they had in Mind Heist.
const PINS = { turkey: 'jokes-24', monster: 'jokes-19', winter: 'jokes-30' };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const seedOf = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
export function shuffle(list, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Ten cards from a deck: { card, order, odd }. A joke's punchlines go in a dealt order (order[k] is
// the option shown on tile k); a sign's odd one out lands on tile `odd`.
export function deal(deck, seed, n = CARDS_PER_GAME) {
  const rand = mulberry32(seedOf(seed));
  return shuffle(deck.cards, rand).slice(0, n).map((card) => ({ card, order: shuffle([0, 1, 2, 3], rand), odd: Math.floor(rand() * 4) }));
}

export function dailyDeck(decks, today) {
  const fam = decks.filter((d) => d.shelf === 'family' && !d.brew);
  const signs = fam.filter((d) => d.type === 'signs'), jokes = fam.filter((d) => d.type === 'jokes'), tees = fam.filter((d) => d.type === 'tees');
  const byId = (id) => fam.find((d) => d.id === id);
  const md = today.slice(5);
  const pinned = today === thanksgiving(+today.slice(0, 4)) ? byId(PINS.turkey)
    : md === '10-31' ? byId(PINS.monster)
      : (md === '12-01' || md === '12-21' || md === '12-24') ? byId(PINS.winter) : null;
  const n = dayDiff(EPOCH, today);
  if (pinned) return { no: n + 1, deck: pinned };
  const cycleJokes = jokes.filter((d) => d.id !== PINS.turkey && d.id !== PINS.winter);
  const mod = (k, len) => ((k % len) + len) % len;
  // signs, jokes, shirts, signs, jokes, shirts... (whichever shelves have decks)
  const turns = [signs, cycleJokes, tees].filter((l) => l.length);
  if (!turns.length) return { no: n + 1, deck: null };
  const list = turns[mod(n, turns.length)];
  return { no: n + 1, deck: list[mod(Math.floor(n / turns.length), list.length)] };
}
