/* Trophy rooms and trap houses (JC, roadmap step 6: "I want a trophy room and it is on top of a trap room
   of different obstacles. Each user created their trap house from a library of hard trivia questions,
   tough golf holes, an impossible goat getaway, etc. They start with a max of four traps but they can all
   be the same thing or mix matched." Nov 14 2026: anyone can watch a room "almost like they are given
   security camera access but they can only get to the room after making it through the trap house").
   JC's picks (Nov 14 2026): all four kinds of trap (hard trivia, a golf hole, puzzles and clues, a Goat
   Getaway pen); a raider who makes it takes their pick of one trophy or the loot; caught means locked
   out of that room for the day (one try a room a day) and the owner gets amber; trophies are Masters
   trophies plus one for every rare feat that pays a diamond.

   Shared by the server (lab/heist.js, lab/wallet.js) and the page (/trophy-room/). */

export const SLOTS = 4;                       // traps in a house to start (lab levels add more later)
export const DEFAULT_TRAPS = ['trivia', 'spin', 'goat', 'golf'];

export const TRAPS = {
  trivia: { name: 'Brain Drain', what: 'Hard trivia', emoji: '🧠', game: 'Mind Heist', color: '#B79CFF',
    rule: 'Three hard Mind Heist questions, 20 seconds each. Two wrong and the alarm goes.' },
  clues:  { name: 'Clue Lock', what: 'Three clues', emoji: '🔎', game: 'Three Clue Crew', color: '#5BE38A',
    rule: 'Three high school Three Clue Crew rounds, 20 seconds each. Two wrong and the alarm goes.' },
  spin:   { name: 'Spin Vault', what: 'A Masterpiece puzzle', emoji: '🌀', game: 'Puzzled Spin', color: '#29D3F0',
    rule: 'Spin the tiles of a Puzzled Spin Masterpiece back into the picture before the clock runs out.' },
  goat:   { name: 'Goat Pen', what: 'A Billy pen', emoji: '🐐', game: 'Goat Getaway', color: '#FFD23F',
    rule: 'Get the goat out of a Billy pen (about 15 moves) in 5 minutes, without going way over par. No hints.' },
  golf:   { name: 'Sand Trap', what: 'A tough hole', emoji: '⛳', game: 'Par-Tee Time', color: '#FF7A59',
    rule: 'Sink a hole from the Hard courses or tougher, at par or better.' },
};
export const KINDS = Object.keys(TRAPS);

// The numbers each trap plays by (the server checks every one).
export const QUIZ = { n: 3, strikes: 2, secs: 20, grace: 4 };     // trivia and clues
export const SPIN = { tier: 4, stage: 4, grace: 4 };              // Puzzled Spin: High School's last picture (a Masterpiece)
// Billy pens (14 to 17 moves), the top of Goat Getaway's daily week since JC found the old top (Old Ram and
// G.O.A.T., up to 36 moves) too hard, Nov 14 2026; moves at most par + over
export const GOAT = { tiers: [3], secs: 300, over: 12, grace: 5 };
export const GOLF = { secs: 900, perStroke: 2500 };               // a stroke takes at least this long, start to rest
export const RAID_MS = 60 * 60e3;                                 // a break-in has an hour, all traps together
export const PICK_MS = 15 * 60e3;                                 // and a quarter of an hour inside to choose

// What it pays and what it costs.
export const CATCH_PAY = { amber: 15 };       // the owner, for every raider a trap catches
export const BREAK_PAY = { shards: 2 };       // the raider who gets all the way in (a win pays shards)
export const LOOT_SHARE = 0.2;                // the loot: a fifth of the owner's amber and shards...
export const LOOT_MAX = { amber: 200, shards: 20 };   // ...up to this much
export const LOCKDOWN_MS = 6 * 3600e3;        // after a break-in the alarm resets and the room is shut this long

export function lootOf(w) {
  const out = {};
  for (const k of Object.keys(LOOT_MAX)) {
    const n = Math.min(LOOT_MAX[k], Math.floor(Math.max(0, (w && w[k]) || 0) * LOOT_SHARE));
    if (n > 0) out[k] = n;
  }
  return out;
}

// A trophy is minted for every diamond a game's server pays (lab/wallet.js pay), except moving old
// diamonds over from Mind Heist's store.
export function trophyKind(t) {
  const g = t && t.game;
  if (g === 'par-tee-time') return /^#1 on /.test(String(t.why || '')) ? 'golf' : 'masters';   // the Daily 3's #1, or a Masters
  if (g === 'goat-getaway') return 'goat';
  if (g === 'screensaver') return 'screen';
  if (g === 'mind-heist') return 'brain';
  if (g === 'three-clue-crew') return 'clues';
  if (g === 'puzzled-spin') return 'spin';
  if (g === 'no-cap') return 'cap';
  return 'star';
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function trophyName(t) {
  const why = String((t && t.why) || '');
  const k = trophyKind(t);
  // a daily board win (lab/daily.js): "#1 on Three Clue Crew · 9–12, 2026-11-14"
  const daily = /^#1 on (.+?) · (.+), (\d{4})-(\d{2})-(\d{2})$/.exec(why);
  if (daily) return `${daily[1]} #1 · ${daily[2]} · ${MONTHS[Number(daily[4]) - 1]} ${Number(daily[5])}`;
  if (k === 'masters') { const m = /on (.+)$/.exec(why); return m ? `Masters Trophy · ${m[1]}` : 'Masters Trophy'; }
  if (k === 'goat') return 'Golden Goat · out at par';
  if (k === 'screen') { const m = /, (\d{4}-\d{2}-\d{2})$/.exec(why); return m ? `Screensaver #1 · ${m[1]}` : 'Screensaver #1'; }
  return why ? why.charAt(0).toUpperCase() + why.slice(1) : 'Trophy';
}

// One trap from the owner's setup: { kind, pick } (pick: a golf hole id or a pen number, else random).
export function cleanTraps(list, holes = null, pens = null) {
  const out = [];
  for (const t of Array.isArray(list) ? list.slice(0, SLOTS) : []) {
    const kind = typeof t === 'string' ? t : t && t.kind;
    if (!TRAPS[kind]) continue;
    let pick = t && typeof t === 'object' && t.pick != null ? t.pick : null;
    if (kind === 'golf') pick = typeof pick === 'string' && (!holes || holes.some((h) => h.id === pick)) ? pick : null;
    else if (kind === 'goat') pick = Number.isInteger(pick) && pick >= 0 && (!pens || pick < pens) ? pick : null;
    else pick = null;
    out.push(pick == null ? { kind } : { kind, pick });
  }
  while (out.length < SLOTS) out.push({ kind: DEFAULT_TRAPS[out.length] });
  return out;
}
