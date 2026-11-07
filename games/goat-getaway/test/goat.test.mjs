// Goat Getaway: the daily pen, the clock, the race board, Blue Ribbons and the diamonds it pays
// into Mind Heist.  node games/goat-getaway/test/goat.test.mjs
import assert from 'node:assert/strict';
import { createApi } from '../server/api.js';
import { memoryStore } from '../server/store.js';
import { daily, raceView, practicePens, TIER_NAMES } from '../server/daily.js';
import { solve, replay, isValid } from '../shared/puzzle.mjs';

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const LAB = {
  ann: { name: 'Ann', code: '111111' }, bo: { name: 'Bo', code: '222222' },
  cy: { name: 'Cy', code: '333333' }, di: { name: 'Di', code: '444444' },
};
function rig(start) {
  let t = start;
  const store = memoryStore(), mh = memoryStore();
  const verify = async (name, code) => {
    const p = Object.entries(LAB).find(([, v]) => v.name.toLowerCase() === name.toLowerCase() && v.code === code);
    return p ? { name: p[1].name, handle: p[0] } : null;
  };
  const api = createApi({ store, mh, verify, clock: () => t });
  const call = async (path, body = {}) => {
    const res = await api.handle(new Request('https://capra-lab.netlify.app/goat-getaway/api' + path, { method: 'POST', body: JSON.stringify(body) }));
    return { status: res.status, ...(await res.json()) };
  };
  return { store, mh, call, tick: (ms) => { t += ms; } };
}
const as = (who, extra = {}) => ({ lab: LAB[who], ...extra });

test('every pen is a real puzzle, its par is exact, and each weekday has its tier', () => {
  for (let i = 0; i < 14; i++) {
    const day = new Date(Date.UTC(2026, 10, 2 + i)).toISOString().slice(0, 10);
    const t = daily(day);
    assert.ok(isValid(t.board), day);
    assert.equal(t.tierName, TIER_NAMES[i % 7]);
    if (i < 7) assert.equal(solve(t.board).par, t.par, `${day} par`);
  }
  assert.equal(daily('2026-11-02').no, 1, 'pen numbers carry on from Vault Jam');
  assert.equal(daily('2026-11-08').tierName, 'G.O.A.T.', 'Sunday is the hardest');
  const pens = practicePens();
  assert.equal(pens.length, 200);
  assert.ok(pens[0][1] <= pens[199][1], 'practice pens go easiest first');
});

test('hidden until opened, server-timed, two diamonds at par, then nothing more', async () => {
  const R = rig(Date.parse('2026-11-03T18:00:00Z'));
  let j = await R.call('/today', as('ann'));
  assert.equal(j.status, 200, j.error);
  assert.equal(j.pen.board, null, 'the board stays hidden until you open the pen');
  assert.equal(j.pen.day, 'Tuesday');
  const t = daily('2026-11-03');
  assert.equal(j.pen.par, t.par);
  const o = await R.call('/open', as('ann'));
  assert.equal(o.pen.board, t.board);
  const best = solve(t.board);
  assert.equal((await R.call('/solve', as('ann', { moves: best.path.slice(0, -1) }))).status, 400, 'not out yet');
  assert.equal((await R.call('/solve', as('ann', { moves: [['A', 9]] }))).status, 400, 'illegal slide');
  assert.equal((await R.call('/solve', as('cy', { moves: best.path }))).status, 409, 'open first');
  assert.equal((await R.call('/solve', { lab: { name: 'Ann', code: '000000' }, moves: best.path })).status, 401, 'a wrong key');
  R.tick(41000);
  let s = await R.call('/solve', as('ann', { moves: best.path, date: '2026-11-03' }));
  assert.equal(s.status, 200, s.error);
  assert.equal(s.ms, 41000, 'the clock runs from opening the pen');
  assert.equal(s.gained, 2, 'a getaway at par earns two diamonds');
  assert.equal(s.race.rank, 1);
  R.tick(5000);
  s = await R.call('/solve', as('ann', { moves: best.path }));
  assert.equal(s.gained, 0, 'again earns nothing');
  assert.equal(s.ms, 41000, 'and keeps the first time');
  j = await R.call('/today', as('ann'));
  assert.equal(j.pen.board, t.board, 'opened today, so the board comes back');
  assert.equal(j.me.ms, 41000);
  assert.equal(j.me.parGem, true);
});

test('par later the same day still pays; the race keeps the first time', async () => {
  const R = rig(Date.parse('2026-11-03T18:00:00Z'));
  const t = daily('2026-11-03'), best = solve(t.board);
  await R.call('/open', as('bo'));
  R.tick(20000);
  const detour = [[best.path[0][0], best.path[0][1]], [best.path[0][0], -best.path[0][1]], ...best.path];
  assert.ok(replay(t.board, detour).out);
  let s = await R.call('/solve', as('bo', { moves: detour }));
  assert.equal(s.gained, 1);
  assert.equal(s.ms, 20000);
  s = await R.call('/solve', as('bo', { moves: best.path }));
  assert.equal(s.gained, 1, 'par later still earns the par diamond');
  assert.equal(s.ms, 20000, 'but the race time is the first getaway');
});

test('top five by lab name, fastest first, and a Blue Ribbon for the day’s fastest', async () => {
  const R = rig(Date.parse('2026-11-03T18:00:00Z'));
  const t = daily('2026-11-03'), best = solve(t.board);
  for (const [who, ms] of [['ann', 41000], ['bo', 20000], ['cy', 15000], ['di', 60000]]) {
    await R.call('/open', as(who));
    R.tick(ms);
    await R.call('/solve', as(who, { moves: best.path }));
  }
  let j = await R.call('/today', as('ann'));
  assert.deepEqual(j.race.top.map((x) => x.name), ['Cy', 'Bo', 'Ann', 'Di']);
  assert.equal(j.race.rank, 3);
  assert.equal(j.race.solvers, 4);
  assert.equal(j.race.fastest, 15000);
  assert.ok(j.race.top[0].lead && !j.race.top[1].lead);
  const guest = await R.call('/today');
  assert.equal(guest.me, null);
  assert.equal(guest.race.top.length, 4, 'everyone can see the board');
  // next day: Cy gets the ribbon, once
  R.tick(24 * 3600e3);
  const c = await R.call('/today', as('cy'));
  assert.deepEqual(c.me.ribbonNews, ['2026-11-03']);
  assert.equal(c.me.ribbons, 1);
  assert.equal(c.pen.board, null, 'a new day hides the new pen');
  assert.equal(c.pen.day, 'Wednesday');
  assert.deepEqual((await R.call('/today', as('cy'))).me.ribbonNews, [], 'announced once');
  assert.deepEqual((await R.call('/today', as('bo'))).me.ribbonNews, []);
  assert.equal((await R.call('/solve', as('cy', { moves: best.path, date: '2026-11-03' }))).status, 409, 'yesterday’s pen is closed');
});

test('diamonds land on the linked Mind Heist profile, or wait there until one is linked', async () => {
  const R = rig(Date.parse('2026-11-03T18:00:00Z'));
  const t = daily('2026-11-03'), best = solve(t.board);
  // Ann has a Mind Heist profile linked to her lab name; Bo doesn't yet.
  await R.mh.set('l/ann', { pid: 'PANN000001' });
  await R.mh.set('p/PANN000001', { pid: 'PANN000001', name: 'Ann', gems: 3 });
  assert.equal((await R.call('/today', as('ann'))).me.mindHeist, true);
  assert.equal((await R.call('/today', as('bo'))).me.mindHeist, false);
  await R.call('/open', as('ann'));
  let s = await R.call('/solve', as('ann', { moves: best.path }));
  assert.equal(s.paid, 'mind-heist');
  assert.equal((await R.mh.get('p/PANN000001')).data.gems, 5);
  await R.call('/open', as('bo'));
  s = await R.call('/solve', as('bo', { moves: best.path }));
  assert.equal(s.paid, 'waiting');
  assert.deepEqual((await R.mh.get('gg/bo')).data, { gems: 2 });
});

test('guests can open and solve the pen, but nothing is recorded or paid', async () => {
  const R = rig(Date.parse('2026-11-03T18:00:00Z'));
  const t = daily('2026-11-03'), best = solve(t.board);
  const o = await R.call('/open');
  assert.equal(o.guest, true);
  assert.equal(o.pen.board, t.board);
  const s = await R.call('/solve', { moves: best.path });
  assert.equal(s.status, 200);
  assert.equal(s.guest, true);
  assert.equal(s.moves, t.par);
  assert.equal((await R.call('/today')).race.solvers, 0);
  assert.equal(R.mh.map.size, 0);
});

test('the race view never ranks you when you have no time', () => {
  const v = raceView({ e: { a: [1000, 5, 1, 'A'], b: [900, 9, 2, 'B'] } }, 'zed');
  assert.equal(v.rank, null);
  assert.deepEqual(v.top.map((x) => x.name), ['B', 'A']);
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; } catch (e) { console.error('FAIL', name); throw e; }
}
console.log(`Goat Getaway: ${passed} tests passed`);
