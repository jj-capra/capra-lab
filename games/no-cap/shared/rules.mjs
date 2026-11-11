// No Cap: the numbers every phone and the server share (JC, Nov 8 2026).
// A card is one sentence with four claims about one topic: three facts and one cap (made up).
// Tap the three facts one at a time; tap the cap and you're busted for that card.
// With friends it's a draft (JC, Nov 11 2026): a pile of topic cards, a random order, snake picks
// (you only see each card's topic), then everyone plays their cards one at a time, in pick order,
// at the rest of the room.

export const SHELVES = [
  { id: 'kids', name: 'Kids', who: 'Elementary' },
  { id: 'middle', name: 'Middle School', who: 'Middle school' },
  { id: 'high', name: 'High School', who: 'High school' },
  { id: 'adult', name: 'Young Adults', who: 'Young adults' },
];
export const MAX_PLAYERS = 12;
export const MIN_LIVE = 2;            // JC: "Allow as little as two players with four cards each"
export const handSize = (players) => (players <= 2 ? 4 : 2);   // topic cards each
export const PICK_MS = 25000;         // a draft pick; after this the next card on the pile is yours
export const CHOOSE_MS = 25000;       // choosing which of your cards to play; then your next one goes
export const CARDS_PER_GAME = 10;     // a challenge run, and the most a live game deals
export const FIND_MS = 45000;         // the clock once the reader is done reading (JC, Nov 9 2026: 20 s more)
export const REVEAL_MS = 7000;        // with friends: the cap, the real story, the scores
export const SAY_MAX = 340, CLAIM_MIN = 12, CLAIM_MAX = 110, REAL_MAX = 170, ABOUT_MAX = 40;
export const NAME_MAX = 17;

export const POINTS = {
  fact: 50,          // each fact found (banked as you go)
  allThree: 100,     // all three without touching the cap
  speed: 150,        // up to this much more for finding all three fast (JC: "the quicker to answer gets more points")
  first: 50,         // with friends: the first to find all three on a card (when two or more hunt)
  fooled: 100,       // whoever played the card, for every friend busted on it
};

// The four claims of a card, in order: the text inside [brackets] in `say`.
export function claims(say) {
  return [...String(say).matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
}
// The sentence split into pieces: plain text and claims ({ t, i } with i = claim index or -1).
export function pieces(say) {
  const out = [];
  let last = 0, i = 0;
  for (const m of String(say).matchAll(/\[([^\]]+)\]/g)) {
    if (m.index > last) out.push({ t: say.slice(last, m.index), i: -1 });
    out.push({ t: m[1], i: i++ });
    last = m.index + m[0].length;
  }
  if (last < say.length) out.push({ t: say.slice(last), i: -1 });
  return out;
}
// The sentence as it's read out loud: brackets gone.
export const plain = (say) => String(say).replace(/[[\]]/g, '');

// Points for a finished card: `found` facts (0-3), busted or not, how long all three took.
export function cardPoints(found, busted, ms) {
  if (busted) return 0;
  let p = found * POINTS.fact;
  if (found === 3) p += POINTS.allThree + Math.round(POINTS.speed * Math.max(0, 1 - ms / FIND_MS));
  return p;
}
