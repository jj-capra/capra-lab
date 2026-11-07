// Vault Jam on the server: which puzzle is today's, and the day's race board.
// Puzzles come from src/shared/jam-puzzles.json (made by dev/make-jam.mjs).
import DATA from '../shared/jam-puzzles.json' with { type: 'json' };
import { dayDiff } from './content.mjs';

export const JAM_EPOCH = '2026-11-02';   // a Monday; puzzle No. 1
export const HAND_MAX = 3;
export const PRIZE_ODDS = 0.25;          // a prize card in the daily draw; doubled with a diamond
export const DUDS = 6;                   // dud flavors (the client names them per look)
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const split = (s) => ({ board: s.slice(0, 36), par: Number(s.slice(36)) });

// Monday is the easiest tier, Sunday the hardest. Each tier cycles on its own.
export function daily(today) {
  const n = dayDiff(JAM_EPOCH, today);
  const [y, m, d] = today.split('-').map(Number);
  const tier = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const list = DATA.tiers[tier];
  const week = Math.floor(n / 7);
  const { board, par } = split(list[((week % list.length) + list.length) % list.length]);
  return { no: n + 1, date: today, tier, day: DAY_NAMES[tier], board, par };
}

export const practiceList = () => DATA.practice;

/* The day's race board, blob j/<date>: { e: { pid: [ms, moves, at, name, avatar] } }.
   Times are measured by the server from opening the vault to the first solve. */
const better = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

export function leader(board) {
  let best = null;
  for (const [pid, e] of Object.entries((board && board.e) || {})) if (!best || better(e, best[1]) < 0) best = [pid, e];
  return best ? best[0] : null;
}

export function raceView(board, me, friends) {
  const all = Object.entries((board && board.e) || {});
  const lead = leader(board);
  const circle = new Set([...(friends || []), me]);
  const top = all.filter(([pid]) => circle.has(pid)).sort((a, b) => better(a[1], b[1])).slice(0, 5)
    .map(([pid, e]) => ({ name: e[3], avatar: e[4], ms: e[0], moves: e[1], me: pid === me, lead: pid === lead }));
  const mine = board && board.e && board.e[me];
  const rank = mine ? 1 + all.filter(([, e]) => better(e, mine) < 0).length : null;
  const fastest = lead ? board.e[lead][0] : null;
  return { top, rank, solvers: all.length, fastest, leading: lead === me };
}
