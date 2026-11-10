// Screensaver: the bouncing, the boards, scoring, the daily board.   node games/screensaver/test/screensaver.test.mjs
import assert from 'node:assert/strict';
import { field, pockets, step, run, level, score, points, plan, LIVES, GUESS_MS } from '../shared/board.mjs';
import { createApi, daySeed, dayOf } from '../server/api.js';
import { memoryStore } from '../server/store.js';

let passed = 0;
const test = async (name, fn) => {
  try { await fn(); console.log('ok   ' + name); passed++; }
  catch (e) { console.log('FAIL ' + name + '\n     ' + (e.stack || e.message)); process.exitCode = 1; }
};

await test('a box bounces off walls and stops dead in a corner', () => {
  const f = field([[0, 0, 5, 4]]);
  assert.equal(pockets(f).length, 4);
  let s = step(f, { x: 0, y: 0, vx: 1, vy: 1 });
  assert.deepEqual([s.x, s.y], [1, 1]);
  s = step(f, { x: 4, y: 1, vx: 1, vy: 1 });
  assert.equal(s.vx, -1, 'off the right wall');
  assert.deepEqual([s.x, s.y], [3, 2]);
  assert.equal(step(f, { x: 4, y: 3, vx: 1, vy: 1 }).corner, true, 'snug in the corner');
  const r = run(f, { x: 0, y: 1, vx: 1, vy: 1 });
  assert.ok(r && r.hit, 'reaches a corner');
  const pk = pockets(f).find((p) => p.x === r.hit.x && p.y === r.hit.y && p.dx === r.hit.dx && p.dy === r.hit.dy);
  assert.ok(pk, 'the corner it hits is one of the four');
  assert.equal(run(field([[0, 0, 5, 5]]), { x: 1, y: 0, vx: 1, vy: 1 }), null, 'some paths loop forever and are never used');
});

await test('rooms joined at their corners: the box slips through the gap', () => {
  const f = field([[0, 0, 6, 6], [4, 4, 6, 6]]);
  assert.equal(pockets(f).length, 6, 'two rooms lose the corners where they join');
  let s = { x: 2, y: 2, vx: 1, vy: 1 };
  for (let i = 0; i < 4; i++) s = step(f, s);
  assert.deepEqual([s.x, s.y], [6, 6], 'straight through the join into the second room');
});

await test('every level of a day builds, the same for everyone, and gets harder', () => {
  const seed = daySeed('2026-11-09');
  for (let n = 1; n <= 40; n++) {
    const a = level(seed, n), b = level(seed, n);
    assert.deepEqual(a, b, 'deterministic');
    assert.ok(a.pockets.length >= 4);
    assert.ok(a.pause >= 3 && a.pause < a.path.length - 1, `level ${n}: a pause mid-flight`);
    const end = a.path[a.path.length - 1], p = a.pockets[a.answer];
    assert.deepEqual([end.x, end.y], [p.x, p.y], 'the path ends in the answer');
    const f = field(a.rooms);
    assert.equal(step(f, end).corner, true, 'and stops there dead');
    for (let i = 1; i < a.path.length - 1; i++) assert.ok(!step(f, a.path[i - 1]).corner, 'no corner before the end');
  }
  assert.ok(plan(1).size < plan(20).size && plan(20).rooms > plan(1).rooms && plan(15).rem > plan(1).rem);
});

await test('scoring a run: points for right corners, three misses and out', () => {
  const seed = 'test-seed';
  const right = (n, ms = 0) => ({ c: level(seed, n).answer, ms });
  const wrong = (n) => ({ c: (level(seed, n).answer + 1) % level(seed, n).pockets.length, ms: 1000 });
  const r = score(seed, [right(1), right(2, GUESS_MS), wrong(3), right(4), wrong(5), wrong(6), right(7)]);
  assert.equal(r.right, 3);
  assert.equal(r.level, 6, 'the third miss ends it');
  assert.equal(r.over, true);
  assert.equal(r.score, points(1, 0) + points(2, GUESS_MS) + points(4, 0));
  assert.equal(LIVES, 3);
});

await test('the daily board: one counted run a day, scored by the server, open to everyone', async () => {
  let now = Date.parse('2026-11-09T18:00:00Z');
  const api = createApi({ store: memoryStore(), clock: () => now,
    verify: async (name, code) => (code === '123456' ? { name, handle: name.toLowerCase() } : null),
    role: async (h) => (h === 'jj-capra' ? 'owner' : null) });
  const call = (p, b = {}) => api.route('POST', p, b);
  const JJ = { lab: { name: 'JJ-Capra', code: '123456' } };
  const hi = await call('/hello', {});
  assert.equal(hi.date, dayOf(now));
  assert.equal(hi.brew, false);
  assert.equal(hi.canPlay, true, 'live for everyone');
  assert.equal((await call('/hello', JJ)).canPlay, true);
  const seed = daySeed(hi.date);
  const picks = [1, 2, 3].map((n) => ({ c: level(seed, n).answer, ms: 2000 }));
  const other = await call('/run', { date: hi.date, picks: picks.slice(0, 1), lab: { name: 'Stranger', code: '123456' } });
  assert.equal(other.counted, true, 'anyone signed in posts a run');
  const r = await call('/run', { date: hi.date, picks, ...JJ });
  assert.equal(r.counted, true);
  assert.equal(r.right, 3);
  assert.equal(r.score, score(seed, picks).score, 'the server scores it from the guesses');
  const again = await call('/run', { date: hi.date, picks: [], ...JJ });
  assert.equal(again.counted, false, 'the second run of the day is practice');
  const b = await call('/board', {});
  assert.equal(b.top[0].name, 'JJ-Capra');
  assert.equal(b.top[0].score, r.score);
  assert.equal((await call('/hello', JJ)).mine.rank, 1);
  await assert.rejects(call('/run', { date: '2026-11-08', picks, ...JJ }), /yesterday/);
});

console.log(`\nScreensaver: ${passed} tests passed`);
