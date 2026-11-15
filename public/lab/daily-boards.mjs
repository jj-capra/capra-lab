/* The daily challenge boards (JC, Nov 14 2026: "Three clue crew, and the puzzle, mind heist, and no cap
   to have a daily challenge leaderboard. More trophies to win. The most points the fastest wins").
   One board a game a day (a board a tier or shelf where the game has them): most points wins, a tie goes
   to the faster run, then the earlier one. Your first official run of the day is the one that counts.
   When the day closes (midnight Pacific), the #1 of a board with at least WIN_MIN players takes a
   trophy and a diamond (lab/daily.js settles it; the diamond mints the trophy in lab/wallet.js).

   Shared by the server (lab/daily.js) and the board card (/lab/daily.js). */

export const WIN_MIN = 2;                 // players on a board for its #1 to take the trophy
export const WIN_PAY = { diamonds: 1 };   // a rare feat, checked by a server: a diamond (and so a trophy)

const tiers = (game, title, emoji, unit) => Object.fromEntries([['1', 'K–1'], ['2', '2–3'], ['3', '6–8'], ['4', '9–12']]
  .map(([id, v]) => [`${game}:${id}`, { game, title, variant: v, emoji, unit }]));
export const BOARDS = {
  ...tiers('three-clue-crew', 'Three Clue Crew', '🔍', 'right'),
  ...tiers('puzzled-spin', 'Puzzled Spin', '🌀', 'pts'),
  'mind-heist': { game: 'mind-heist', title: 'Mind Heist', variant: 'Daily drop', emoji: '🧠', unit: '$' },
  'no-cap:kids': { game: 'no-cap', title: 'No Cap', variant: 'Kids', emoji: '🧢', unit: 'pts' },
  'no-cap:middle': { game: 'no-cap', title: 'No Cap', variant: 'Middle School', emoji: '🧢', unit: 'pts' },
  'no-cap:high': { game: 'no-cap', title: 'No Cap', variant: 'High School', emoji: '🧢', unit: 'pts' },
  'no-cap:adult': { game: 'no-cap', title: 'No Cap', variant: 'Young Adults', emoji: '🧢', unit: 'pts' },
};
export const boardName = (id) => { const b = BOARDS[id]; return b ? `${b.title} · ${b.variant}` : id; };

// Most points, then the fastest, then the first in.
export function ranked(entries) {
  return Object.entries(entries || {}).map(([handle, e]) => ({ handle, ...e }))
    .sort((a, b) => b.points - a.points || a.ms - b.ms || a.at - b.at)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}
export function fmtPoints(id, n) {
  const u = (BOARDS[id] || {}).unit;
  if (u === '$') return '$' + Number(n || 0).toLocaleString('en-US');
  if (u === 'right') return `${n}/10`;
  return Number(n || 0).toLocaleString('en-US');
}
export function fmtMs(ms) {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
// How a daily win reads on the trophy (the wallet keeps `why`).
export const winWhy = (id, date) => `#1 on ${boardName(id)}, ${date}`;
