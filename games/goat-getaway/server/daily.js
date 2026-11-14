// Which pen is today's, and the day's race board.
// Pens come from shared/puzzles.mjs (made by dev/make-puzzles.mjs).
import DATA from '../shared/puzzles.mjs';

export const EPOCH = '2026-11-02';       // a Monday; pen No. 1 (the numbering Vault Jam started)
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// How tough each weekday's pen is, from a kid's first hop to the greatest of all time.
export const TIER_NAMES = ['Kid', 'Yearling', 'Nanny', 'Billy', 'Mountain Goat', 'Old Ram', 'G.O.A.T.'];

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
export const pacificDate = (ms) => fmt.format(new Date(ms));
export function dayDiff(a, b) {
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

const split = (s) => ({ board: s.slice(0, 36), par: Number(s.slice(36)) });

// The week's climb. Until Nov 14 2026 it went one tier a day, Kid on Monday to the G.O.A.T. on Sunday
// (about 6 moves to about 32). JC, Nov 14 2026: "these daily challenges are too difficult"; his pick:
// top out near 15 moves. From EASY_FROM: Monday Kid, Tuesday and Wednesday Yearling, Thursday and Friday
// Nanny, Saturday and Sunday Billy. Old Ram and G.O.A.T. pens stay in practice and the trophy rooms.
export const EASY_FROM = '2026-11-15';
export const WEEK_TIERS = [0, 1, 1, 2, 2, 3, 3];
const OLD_WEEK = [0, 1, 2, 3, 4, 5, 6];

// Each tier cycles on its own; a tier on two days of the week takes two pens a week from its list.
export function daily(today) {
  const n = dayDiff(EPOCH, today);
  const [y, m, d] = today.split('-').map(Number);
  const wd = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const week = Math.floor(n / 7);
  const ladder = dayDiff(EASY_FROM, today) >= 0 ? WEEK_TIERS : OLD_WEEK;
  const tier = ladder[wd];
  const slots = ladder.filter((t) => t === tier).length, slot = ladder.slice(0, wd).filter((t) => t === tier).length;
  const list = DATA.tiers[tier], k = week * slots + slot;
  const { board, par } = split(list[((k % list.length) + list.length) % list.length]);
  return { no: n + 1, date: today, tier, day: DAY_NAMES[wd], tierName: TIER_NAMES[tier], board, par };
}

// Practice pens for the page: [board, par] pairs, easiest first.
export const practicePens = () => DATA.practice.map(split).sort((a, b) => a.par - b.par).map((p) => [p.board, p.par]);

/* The day's race board, blob j/<date>: { e: { handle: [ms, moves, at, name] } }.
   Times are measured by the server from opening the pen to the first getaway. */
const better = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

export function leader(board) {
  let best = null;
  for (const [who, e] of Object.entries((board && board.e) || {})) if (!best || better(e, best[1]) < 0) best = [who, e];
  return best ? best[0] : null;
}

// Today's five fastest by Capra Lab name (lab names are public, as on every lab board), plus yours.
export function raceView(board, me) {
  const all = Object.entries((board && board.e) || {}).sort((a, b) => better(a[1], b[1]));
  const lead = all.length ? all[0][0] : null;
  const top = all.slice(0, 5).map(([who, e]) => ({ name: e[3], ms: e[0], moves: e[1], me: who === me, lead: who === lead }));
  const at = me ? all.findIndex(([who]) => who === me) : -1;
  return { top, rank: at >= 0 ? at + 1 : null, solvers: all.length, fastest: lead ? all[0][1][0] : null, leading: !!me && lead === me };
}
