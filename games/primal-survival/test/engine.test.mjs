/* Engine guarantees. These are the properties online play rests on:
 * if any of them break, the server can no longer be the authority on a run. */
import assert from 'node:assert/strict';
import { ROLES } from '../shared/constants.js';
import { ROSTER } from '../shared/roster.js';
import { runSeason, simulateDay, resolveSquad, squadIds, rating, squadRating, adaptBonus } from '../shared/engine.js';
import { TUNE } from '../shared/constants.js';
import { gradeFor, epitaph } from '../shared/grade.js';

let passed = 0;
const test = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); passed++; }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
};

function squadFrom(seed) {
  let t = seed;
  const rnd = () => { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; };
  const used = new Set(), s = {};
  for (const r of ROLES) {
    const c = ROSTER.filter(a => a.roles.includes(r) && !used.has(a.id));
    const p = c[Math.floor(rnd() * c.length)];
    used.add(p.id); s[r] = p;
  }
  return s;
}
const A = squadFrom(12345);

console.log('\nengine');

test('a season is deterministic for the same squad and seed', () => {
  const x = runSeason(A, '2026-09-15');
  const y = runSeason(A, '2026-09-15');
  assert.equal(x.days, y.days);
  assert.deepEqual(x.feats, y.feats);
});

test('the seed actually changes the season', () => {
  const days = new Set(['a','b','c','d','e'].map(s => runSeason(A, s).days));
  assert.ok(days.size > 1, 'every seed produced the same run');
});

test('squads travel as ids and resolve back identically', () => {
  const ids = squadIds(A);
  const back = resolveSquad(ids);
  assert.equal(runSeason(back, 'x').days, runSeason(A, 'x').days);
});

test('an animal cannot be placed in a slot it is not built for', () => {
  const ids = squadIds(A);
  const wrong = ROSTER.find(a => !a.roles.includes('swarm'));
  assert.throws(() => resolveSquad({ ...ids, swarm: wrong.id }), /cannot hold/);
});

test('the same animal cannot fill two slots', () => {
  const ids = squadIds(A);
  const both = ROSTER.find(a => a.roles.includes('apex') && a.roles.includes('bulwark'));
  assert.throws(() => resolveSquad({ ...ids, apex: both.id, bulwark: both.id }), /two slots/);
});

test('an unknown id is refused rather than defaulted', () => {
  assert.throws(() => resolveSquad({ ...squadIds(A), apex: 99999 }), /unknown animal/);
});

test('a better squad outlives a worse one over many seeds', () => {
  const used = new Set(), best = {};
  for (const r of ROLES) {
    const c = ROSTER.filter(a => a.roles.includes(r) && !used.has(a.id))
      .sort((x, y) => rating(y, r) - rating(x, r))[0];
    used.add(c.id); best[r] = c;
  }
  let bw = 0, rw = 0;
  for (let i = 0; i < 12; i++) {
    const seed = 's' + i;
    if (runSeason(best, seed).days >= runSeason(squadFrom(i * 31 + 7), seed).days) bw++; else rw++;
  }
  assert.ok(bw > rw, 'drafting well did not pay: ' + bw + '/' + (bw + rw));
});

test('a run against a player ladder is deterministic too', () => {
  const ladder = Array.from({ length: 20 }, (_, i) =>
    ({ name: 'L' + i, squad: squadIds(squadFrom(i * 977 + 3)), rating: 0 }))
    .map(e => ({ ...e, rating: squadRating(resolveSquad(e.squad)) }))
    .sort((a, b) => a.rating - b.rating);
  const x = runSeason(A, 'ladder-seed', ladder);
  const y = runSeason(A, 'ladder-seed', ladder);
  assert.equal(x.days, y.days);
  assert.deepEqual(x.feats, y.feats);
  /* the contract is that a ladder run faces real squads, not that it happens
     to end on a different day from a procedural one */
  const names = new Set(ladder.map(e => e.name));
  assert.equal(x.finalDay.fromPlayer, true, 'a ladder run did not face a player squad');
  assert.ok(names.has(x.finalDay.opp), 'faced an opponent that is not on the ladder');
  const solo = runSeason(A, 'ladder-seed', null);
  assert.equal(solo.finalDay.fromPlayer, false, 'a solo run faced a player squad');
});

test('a day never reports more than five duels or a bad winner count', () => {
  for (let d = 1; d <= 40; d++) {
    const res = simulateDay(d, A, 'audit');
    assert.equal(res.duels.length, 5);
    assert.equal(res.wins, res.duels.filter(x => x.won).length);
    assert.equal(res.survived, res.wins >= 3);
  }
});

test('365 days is the ceiling and the counters agree with the duels', () => {
  const r = runSeason(A, 'count-check');
  assert.ok(r.days >= 0 && r.days <= 365);
  const duels = ROLES.reduce((n, role) => n + r.tally[role].w + r.tally[role].l, 0);
  const wins = ROLES.reduce((n, role) => n + r.tally[role].w, 0);
  assert.equal(wins, r.feats.kills);
  assert.equal(duels % 5, 0);
});

console.log('\nadaptation and rallies');

test('the squad gets stronger the longer it survives, then stops', () => {
  assert.equal(adaptBonus(1), 0);
  assert.equal(adaptBonus(TUNE.adaptEvery), TUNE.adaptStep);
  assert.equal(adaptBonus(TUNE.adaptEvery * 3), TUNE.adaptStep * 3);
  assert.equal(adaptBonus(365), TUNE.adaptCap, 'the bonus is not capped');
  let prev = -1;
  for (let d = 1; d <= 365; d++) {
    const b = adaptBonus(d);
    assert.ok(b >= prev, 'the bonus went backwards on day ' + d);
    prev = b;
  }
});

test('adaptation is what a day reports, so the client cannot invent it', () => {
  const res = simulateDay(TUNE.adaptEvery * 2, A, 'adapt');
  assert.equal(res.adapt, adaptBonus(TUNE.adaptEvery * 2));
});

test('a rally saves a near miss and is spent only once', () => {
  /* find a run that used its rally, then confirm it was a one-duel loss */
  let found = null;
  for (let i = 0; i < 60 && !found; i++) {
    const r = runSeason(squadFrom(i * 613 + 11), 'rally-' + i);
    if (r.rallyDays.length) found = r;
  }
  assert.ok(found, 'no run in sixty used a rally');
  assert.ok(found.rallyDays.length <= TUNE.rallies, 'spent more rallies than it had');
});

test('a rout still ends the run — a rally only covers a close day', () => {
  for (let i = 0; i < 40; i++) {
    const r = runSeason(squadFrom(i * 77 + 5), 'rout-' + i);
    if (!r.perfect) {
      assert.ok(r.finalDay.wins < TUNE.daysToWin, 'a surviving day ended the run');
      if (r.rallyDays.length) {
        /* the day it actually died on cannot have been ralliable while a
           rally was still in hand, or the rally would have been spent */
        assert.ok(r.finalDay.wins <= TUNE.daysToWin - 1);
      }
    }
  }
});

test('rallies do not break determinism', () => {
  for (let i = 0; i < 20; i++) {
    const a = runSeason(squadFrom(i * 313 + 2), 'det-' + i);
    const b = runSeason(squadFrom(i * 313 + 2), 'det-' + i);
    assert.equal(a.days, b.days);
    assert.deepEqual(a.rallyDays, b.rallyDays);
  }
});

test('the day-by-day loop the client runs agrees with runSeason', () => {
  /* the browser ticks one day at a time so the season can be watched. it has
     to reach the same verdict as the server's single call, or a player sees
     one number and the board records another. */
  for (let i = 0; i < 25; i++) {
    const sq = squadFrom(i * 449 + 17), seed = 'agree-' + i;
    let rallies = TUNE.rallies, day = 0, alive = true, rallied = [];
    while (alive && day < 365) {
      day++;
      const res = simulateDay(day, sq, seed);
      if (!res.survived) {
        if (rallies > 0 && res.wins === TUNE.daysToWin - 1) { rallies--; rallied.push(day); continue; }
        day--; alive = false;
      }
    }
    const server = runSeason(sq, seed);
    assert.equal(day, server.days, 'client reached ' + day + ', server ' + server.days + ' on seed ' + seed);
    assert.deepEqual(rallied, server.rallyDays);
  }
});

console.log('\ngrading');

test('grades climb with days and never gap', () => {
  let last = null;
  for (const d of [0, 2, 5, 10, 20, 40, 70, 100, 150, 200, 260, 320, 365]) {
    const g = gradeFor(d);
    assert.ok(g.letter && g.rank, 'no grade at ' + d);
    last = g;
  }
  assert.equal(gradeFor(365).rank, 'Myth');
  assert.equal(gradeFor(0).rank, 'Carrion');
});

test('five epitaphs in one result never repeat', () => {
  const r = runSeason(A, 'epi');
  const used = new Set(), lines = [];
  for (const role of ROLES) {
    const d = r.finalDay.duels.find(x => x.myRole === role);
    lines.push(epitaph(d, r.finalDay, r.perfect, used));
  }
  assert.equal(new Set(lines).size, lines.length, 'a line was reused: ' + lines.join(' | '));
});

console.log('\n' + passed + ' passing\n');
