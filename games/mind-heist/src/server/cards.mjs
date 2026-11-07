// The daily card draw, and the last of Vault Jam.
// Vault Jam left Mind Heist on Nov 7 2026 and became its own Capra Lab game, Goat Getaway
// (games/goat-getaway/). Diamonds now come from there: it adds them straight to a linked
// profile, or leaves them in gg/<handle> until that lab player links one here (claimGoatGems
// in api.mjs).
export const HAND_MAX = 3;
export const PRIZE_ODDS = 0.25;          // a prize card in the daily draw; doubled with a diamond
export const DUDS = 6;                   // dud flavors (the client names them per look)

// Vault Jam's race boards (j/<date>, { e: { pid: [ms, moves, at, name, avatar] } }) stay in the
// store so trophies for the last days it ran (jamPend on a profile) are still settled.
const better = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
export function leader(board) {
  let best = null;
  for (const [pid, e] of Object.entries((board && board.e) || {})) if (!best || better(e, best[1]) < 0) best = [pid, e];
  return best ? best[0] : null;
}
