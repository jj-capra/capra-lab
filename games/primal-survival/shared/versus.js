/* Primal Survival — head to head (JC, Nov 8 2026: "best of five or best of
 * three in head to head deck building and then run").
 *
 * Two players, each on their own phone. Every round both draft five from the
 * same spins, then both squads run the same year (simulateDay's fair mode: the
 * same ground, matchups and rolls for both). The longer run takes the round;
 * the first to win most of the rounds takes the match. Pure and shared, so the
 * server and both phones agree on every spin and every result.
 */
import { hashStr, rngFrom } from './engine.js';
import { COMBOS } from './roster.js';

export const BEST_OF = [3, 5];
export const MAX_ROUNDS = 15;          /* dead-even rounds replay, but not forever */
export const winsNeeded = bestOf => Math.floor(bestOf / 2) + 1;
export const roundSeed = (code, round) => 'vs:' + code + ':' + round;

/* The order both players' spin k tries the hunting grounds in. A player takes
 * the first one that still has an animal for an open slot, which is the first
 * one for both of them unless their drafts have gone very different ways. */
export function spinOrder(code, round, k) {
  const rnd = rngFrom(hashStr(roundSeed(code, round) + ':spin:' + k));
  const order = COMBOS.map((c, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.map(i => COMBOS[i]);
}

/* A respin's pick from the grounds that fit, the same roll for both players. */
export function respinRoll(code, round, k, axis) {
  return rngFrom(hashStr(roundSeed(code, round) + ':respin:' + axis + ':' + k))();
}

/* Who takes a round: more days, then more duels won across the run, then
 * whoever locked in first (the same spins often lead two players to the same
 * five, and the same five live the same year). Only a dead heat to the
 * millisecond (-1) plays the round again. */
export function roundWinner(a, b) {
  if (a.days !== b.days) return a.days > b.days ? 0 : 1;
  if (a.kills !== b.kills) return a.kills > b.kills ? 0 : 1;
  if (a.at && b.at && a.at !== b.at) return a.at < b.at ? 0 : 1;
  return -1;
}
