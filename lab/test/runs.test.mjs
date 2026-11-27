// The Daily Runs (public/lab/runs.js): every game with a daily trophy, in order, and what comes next.  node lab/test/runs.test.mjs
import assert from 'node:assert/strict';
import { walletDay } from '../../public/lab/wallet-catalog.mjs';
import { BOARDS } from '../../public/lab/daily-boards.mjs';
import { trophyKind } from '../../public/lab/heist-rules.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.window = { dispatchEvent() {}, addEventListener() {} };
globalThis.Event = class { constructor(t) { this.type = t; } };
const { RUNS, session, startRuns, markDone, nextAfter, runUrl } = await import('../../public/lab/runs.js');

let n = 0;
const test = async (name, fn) => { await fn(); n++; console.log('ok -', name); };

await test('every game whose daily can win a trophy is in the Daily Runs, once, with its own trophy', () => {
  const games = RUNS.map((r) => r.game);
  assert.equal(new Set(games).size, games.length);
  for (const b of Object.values(BOARDS)) assert.ok(games.includes(b.game), `${b.game} has a daily board`);
  for (const g of ['goat-getaway', 'screensaver']) assert.ok(games.includes(g), `${g} pays a daily diamond`);
  for (const g of games) assert.notEqual(trophyKind({ game: g, why: '#1 on x · y, 2026-11-27' }), 'star', `${g} has trophy art`);
  for (const r of RUNS) { assert.ok(r.go && r.emoji && r.what, r.game); assert.equal(runUrl(r), `/${r.game}/?runs`); }
});

await test('a run of the day: started from the hub, what is done skipped, round to the start, then done', () => {
  assert.equal(session(), null, 'a guest has none');
  localStorage.setItem('capra-lab.profile', JSON.stringify({ name: 'JJ-Capra', handle: 'jj-capra', code: '111111' }));
  assert.equal(session(), null);
  assert.equal(nextAfter(null).game, RUNS[0].game, 'nothing started: the first');
  const s = startRuns(['puzzled-spin']);
  assert.equal(s.day, walletDay()); assert.deepEqual(s.done, ['puzzled-spin']);
  assert.equal(nextAfter('three-clue-crew').game, 'no-cap', 'what the servers say is done is skipped');
  markDone('tough-sleddin'); markDone('tough-sleddin'); markDone('not-a-game');
  assert.deepEqual(session().done, ['puzzled-spin', 'tough-sleddin']);
  assert.equal(nextAfter('par-tee-time').game, 'mind-heist');
  assert.equal(nextAfter('mind-heist').game, 'three-clue-crew', 'round to the start for any skipped');
  for (const r of RUNS) markDone(r.game);
  assert.equal(nextAfter('mind-heist'), null, 'all done');
  // a new day, or someone else signed in: a fresh start
  localStorage.setItem('capra-lab.runs', JSON.stringify({ ...session(), day: '2026-01-01' }));
  assert.equal(session(), null);
  startRuns();
  localStorage.setItem('capra-lab.profile', JSON.stringify({ name: 'Roman', handle: 'da-roman-empire', code: '222222' }));
  assert.equal(session(), null);
});

console.log(`\nDaily Runs: ${n} tests passed`);
