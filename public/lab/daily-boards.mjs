/* The daily challenge boards (JC, Nov 14 2026: "Three clue crew, and the puzzle, mind heist, and no cap
   to have a daily challenge leaderboard. More trophies to win. The most points the fastest wins"; and
   later that night: "Par-Tee Time needs a daily three hole challenge with a leaderboard and trophy too"; and
   Nov 22 2026: "Tough sledding just needs a longest leaderboard for the day. Same thing, they get a trophy").
   One board a game a day (a board a tier or shelf where the game has them): most points wins, a tie goes
   to the faster run, then the earlier one. Golf boards (`low`) go the other way: fewest strokes wins
   (net of the player's handicap, kept to par), then the faster round. Your first official run of the day is the one that counts.
   When the day closes (midnight Pacific), the #1 of a board with at least WIN_MIN players takes a
   trophy and a diamond (lab/daily.js settles it; the diamond mints the trophy in lab/wallet.js).

   Shared by the server (lab/daily.js) and the board card (/lab/daily.js). */

// Players on a board for its #1 to take the trophy. It was 2 until JC, Nov 16 2026 (first on all four
// boards he played, alone on each, and no trophies): a #1 who played alone wins too.
export const WIN_MIN = 1;
export const WIN_PAY = { diamonds: 1 };   // a rare feat, checked by a server: a diamond (and so a trophy)

const tiers = (game, title, emoji, unit) => Object.fromEntries([['1', 'K–1'], ['2', '2–3'], ['3', '6–8'], ['4', '9–12']]
  .map(([id, v]) => [`${game}:${id}`, { game, title, variant: v, emoji, unit }]));
export const BOARDS = {
  ...tiers('three-clue-crew', 'Three Clue Crew', '🔍', 'right'),
  ...tiers('puzzled-spin', 'Puzzled Spin', '🌀', 'pts'),
  'mind-heist': { game: 'mind-heist', title: 'Mind Heist', variant: 'Daily drop', emoji: '🧠', unit: '$' },
  // Par-Tee Time's Daily 3: three holes a day, one from each third of the courses (lab/daily.js deals them)
  'par-tee-time': { game: 'par-tee-time', title: 'Par-Tee Time', variant: 'Daily 3', emoji: '⛳', unit: 'topar', low: true },
  'no-cap:kids': { game: 'no-cap', title: 'No Cap', variant: 'Kids', emoji: '🧢', unit: 'pts' },
  'no-cap:middle': { game: 'no-cap', title: 'No Cap', variant: 'Middle School', emoji: '🧢', unit: 'pts' },
  'no-cap:high': { game: 'no-cap', title: 'No Cap', variant: 'High School', emoji: '🧢', unit: 'pts' },
  'no-cap:adult': { game: 'no-cap', title: 'No Cap', variant: 'Young Adults', emoji: '🧢', unit: 'pts' },
  // Tough Sleddin's Today's run: the day's three courses, the same for everyone; the longest total wins (feet)
  'tough-sleddin': { game: 'tough-sleddin', title: 'Tough Sleddin', variant: 'Today’s run', emoji: '🛷', unit: 'ft' },
};
export const boardName = (id) => { const b = BOARDS[id]; return b ? `${b.title} · ${b.variant}` : id; };

// Most points (fewest on a golf board), then the fastest, then the first in.
export function ranked(entries, low = false) {
  return Object.entries(entries || {}).map(([handle, e]) => ({ handle, ...e }))
    .sort((a, b) => (low ? a.points - b.points : b.points - a.points) || a.ms - b.ms || a.at - b.at)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}
export const isLow = (id) => !!(BOARDS[id] && BOARDS[id].low);
// The Daily 3: holes a day, the most a hole can go down as, and its day number (No. 1 was Nov 14 2026).
export const GOLF_HOLES = 3;
export const GOLF_MAX = 12;
export const golfNo = (date) => Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse('2026-11-14T12:00:00Z')) / 86400000) + 1;
export const toPar = (n) => (n === 0 ? 'E' : n > 0 ? `+${n}` : `−${-n}`);
export function fmtPoints(id, n) {
  const u = (BOARDS[id] || {}).unit;
  if (u === '$') return '$' + Number(n || 0).toLocaleString('en-US');
  if (u === 'right') return `${n}/10`;
  if (u === 'topar') return toPar(Number(n) || 0);
  if (u === 'ft') return Number(n || 0).toLocaleString('en-US') + ' ft';
  return Number(n || 0).toLocaleString('en-US');
}
export function fmtMs(ms) {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
// The board's rule, in a line.
export function ruleOf(id, winMin) {
  const how = isLow(id) ? 'Fewest strokes wins (net: your golf handicap’s share comes off), shown to par; a tie goes to the faster round. Your first round of the day counts.'
    : (BOARDS[id] || {}).unit === 'ft' ? 'The longest run wins: all three worlds added up, on today’s courses (the same for everyone). Your first run of the day counts; leave a world part way and it goes down as 0 ft.'
    : 'Most points wins; a tie goes to the faster run. Your first run of the day counts.';
  return `${how} At midnight the #1 takes a trophy for their trophy room and a 💎${winMin > 1 ? ` (when ${winMin} or more played)` : ''}.`;
}
// How a daily win reads on the trophy (the wallet keeps `why`).
export const winWhy = (id, date) => `#1 on ${boardName(id)}, ${date}`;
