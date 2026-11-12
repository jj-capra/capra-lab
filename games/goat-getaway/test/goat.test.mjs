// Goat Getaway: the daily pen, the clock, the race board, Blue Ribbons and what it pays into the
// lab wallet.  node games/goat-getaway/test/goat.test.mjs
import assert from 'node:assert/strict';
import { createApi, HINT_MS } from '../server/api.js';
import { memoryStore } from '../server/store.js';
import { createWallet } from '../../../lab/wallet.js';
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
  const store = memoryStore(), walletStore = memoryStore();
  const wallet = createWallet({ store: walletStore, clock: () => t });
  const verify = async (name, code) => {
    const p = Object.entries(LAB).find(([, v]) => v.name.toLowerCase() === name.toLowerCase() && v.code === code);
    return p ? { name: p[1].name, handle: p[0] } : null;
  };
  const api = createApi({ store, wallet, verify, clock: () => t });
  const call = async (path, body = {}) => {
    const res = await api.handle(new Request('https://capra-lab.netlify.app/goat-getaway/api' + path, { method: 'POST', body: JSON.stringify(body) }));
    return { status: res.status, ...(await res.json()) };
  };
  return { store, wallet, walletStore, call, tick: (ms) => { t += ms; } };
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

test('the lab wallet: amber for getting out, a diamond at par, each once a day', async () => {
  const R = rig(Date.parse('2026-11-03T18:00:00Z'));
  const t = daily('2026-11-03'), best = solve(t.board);
  await R.call('/open', as('ann'));
  let s = await R.call('/solve', as('ann', { moves: best.path }));
  assert.deepEqual(s.paid, { amber: 30, diamonds: 1 }, 'out at par: amber and a diamond');
  let w = await R.wallet.wallet('ann');
  assert.deepEqual([w.amber, w.diamonds], [30, 1]);
  s = await R.call('/solve', as('ann', { moves: best.path }));
  assert.equal(s.paid, null, 'again pays nothing');
  // Bo gets out the long way first (amber), then at par later (the diamond)
  await R.call('/open', as('bo'));
  const long = [...best.path];
  const r0 = replay(t.board, long);
  assert.ok(r0.ok && r0.out);
  const extra = (() => {   // a getaway over par: wiggle a piece there and back first
    for (const id of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') for (const d of [1, -1, 2, -2]) {
      const m = [[id, d], [id, -d]];
      const r = replay(t.board, [...m, ...best.path]);
      if (r.ok && r.out && r.n > t.par) return [...m, ...best.path];
    }
    return null;
  })();
  assert.ok(extra, 'found a getaway over par');
  {
    s = await R.call('/solve', as('bo', { moves: extra }));
    assert.deepEqual(s.paid, { amber: 30 }, 'over par: amber only');
    s = await R.call('/solve', as('bo', { moves: best.path }));
    assert.deepEqual(s.paid, { diamonds: 1 }, 'par later: the diamond');
    w = await R.wallet.wallet('bo');
    assert.deepEqual([w.amber, w.diamonds], [30, 1]);
  }
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
  assert.equal(R.walletStore.map.size, 0, 'a guest gets nothing paid');
});

test('a hint is the best next move from where you are; on today’s pen it costs time and the par diamond', async () => {
  const R = rig(Date.parse('2026-11-08T18:00:00Z'));
  const t = daily('2026-11-08');
  const best = solve(t.board);
  // a guest gets hints too, nothing counted
  let h = await R.call('/hint', { moves: [] });
  assert.equal(h.status, 200, h.error);
  assert.deepEqual(h.move, best.path[0]);
  assert.equal(h.left, best.par);
  assert.equal(h.hints, 0);
  // from partway in: the hint continues from there
  h = await R.call('/hint', { moves: best.path.slice(0, 5) });
  assert.equal(h.left, best.par - 5);
  assert.equal((await R.call('/hint', { moves: [['A', 9]] })).status, 400, 'moves that don’t fit');
  assert.equal((await R.call('/hint', as('ann', { moves: [] }))).status, 409, 'open first');
  await R.call('/open', as('ann'));
  h = await R.call('/hint', as('ann', { moves: [] }));
  assert.equal(h.hints, 1);
  assert.equal(h.penalty, HINT_MS);
  await R.call('/hint', as('ann', { moves: best.path.slice(0, 1) }));
  R.tick(60000);
  const s = await R.call('/solve', as('ann', { moves: best.path }));
  assert.equal(s.status, 200, s.error);
  assert.equal(s.ms, 60000 + 2 * HINT_MS, 'two hints add 30 seconds');
  assert.equal(s.gained, 1, 'out earns a diamond; hints skip the par one');
  assert.equal(s.me.hints, 2);
  // a hint after you're out doesn't change your time
  R.tick(1000);
  const later = await R.call('/hint', as('ann', { moves: [] }));
  assert.equal(later.penalty, 0);
  assert.equal((await R.call('/today', as('ann'))).me.ms, 60000 + 2 * HINT_MS);
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
