// No Cap: the numbers every phone and the server share (JC, Nov 8 2026).
// A card is one sentence with four claims: three facts and one cap (made up). A reader reads it
// out loud with a straight face; everyone else taps the three facts one at a time. Tap the cap
// and you're busted for that card.

export const SHELVES = [
  { id: 'kids', name: 'Kids', who: 'Elementary' },
  { id: 'middle', name: 'Middle School', who: 'Middle school' },
  { id: 'high', name: 'High School', who: 'High school' },
  { id: 'adult', name: 'Young Adults', who: 'Young adults' },
];
export const MAX_PLAYERS = 12;
export const MIN_LIVE = 3;            // a reader and at least two to fool
export const CARDS_PER_GAME = 10;     // a challenge run, and the most a live game deals
export const FIND_MS = 45000;         // the clock once the reader is done reading (JC, Nov 9 2026: 20 s more)
export const REVEAL_MS = 8000;        // live: the cap, the real story, the scores
export const READ_MS = 60000;         // a reader who never taps Done gets nudged on after this
export const SAY_MAX = 340, CLAIM_MIN = 12, CLAIM_MAX = 110, REAL_MAX = 170, ABOUT_MAX = 40;
export const NAME_MAX = 17;

export const POINTS = {
  fact: 50,          // each fact found (banked as you go)
  allThree: 100,     // all three without touching the cap
  speed: 150,        // up to this much more for finding all three fast (JC: "the quicker to answer gets more points")
  first: 50,         // live: the first player to find all three on a card
  fooled: 50,        // the reader, for every listener busted on their card
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
