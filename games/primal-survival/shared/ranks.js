/* Lifetime progression.
 *
 * Grades in shared/grade.js describe one run — how a single squad did. This is
 * the other axis: who the player is across every run they have ever finished.
 * The currency is total days survived, so a long career of ordinary seasons and
 * a short career of great ones both get somewhere, and nothing is ever lost by
 * playing. It only ever goes up.
 *
 * Ranks are deliberately named away from the grade names. A run can be graded
 * Apex; a player is never "Apex", they are a Warden. Seeing both words on one
 * screen should never be ambiguous.
 */
export const RANKS = [
  { at: 0,      name: 'Drifter',     note: 'no ground of your own yet' },
  { at: 120,    name: 'Forager',     note: 'you know where to look' },
  { at: 400,    name: 'Tracker',     note: 'you can read what passed through' },
  { at: 1000,   name: 'Stalker',     note: 'you get close before it knows' },
  { at: 2200,   name: 'Hunter',      note: 'you pick the fight and you win it' },
  { at: 4500,   name: 'Pack Leader', note: 'the others follow your read of the ground' },
  { at: 8000,   name: 'Alpha',       note: 'nothing here disputes it' },
  { at: 14000,  name: 'Warden',      note: 'the whole range answers to you' },
  { at: 24000,  name: 'Primeval',    note: 'older than the things you hunt' },
  { at: 40000,  name: 'Ancient',     note: 'you were here before the ice' }
];

/* The rank a career sits at, plus how far into it. `next` is null at the top. */
export function rankFor(totalDays) {
  const days = Math.max(0, Number(totalDays) || 0);
  let i = 0;
  while (i + 1 < RANKS.length && days >= RANKS[i + 1].at) i++;
  const cur = RANKS[i], next = RANKS[i + 1] || null;
  return {
    index: i,
    name: cur.name,
    note: cur.note,
    at: cur.at,
    next: next ? next.name : null,
    toNext: next ? next.at - days : 0,
    progress: next ? (days - cur.at) / (next.at - cur.at) : 1
  };
}

/* A blank career, so every reader agrees on the shape. */
export function emptyStats() {
  return {
    runs: 0,
    totalDays: 0,
    bestDays: 0,
    bestGrade: null,
    bestSquad: null,
    perfect: 0,
    kills: 0,
    stuns: 0,
    routs: 0,
    close: 0,
    rallies: 0,
    firstAt: null,
    lastAt: null
  };
}

/* Fold one verified run into a career. Pure, so the server can apply it and a
 * client can preview the same numbers without them drifting apart. */
export function applyRun(stats, run) {
  const s = { ...emptyStats(), ...stats };
  s.runs += 1;
  s.totalDays += run.days;
  if (run.days > s.bestDays) {
    s.bestDays = run.days;
    s.bestGrade = run.grade;
    s.bestSquad = run.squad || null;   /* the five the card shows */
  }
  if (run.perfect) s.perfect += 1;
  s.kills += run.kills || 0;
  s.stuns += run.stuns || 0;
  s.routs += run.routs || 0;
  s.close += run.close || 0;
  s.rallies += run.rallies || 0;
  s.firstAt = s.firstAt || run.at;
  s.lastAt = run.at;
  return s;
}
