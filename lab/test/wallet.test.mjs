// The lab's wallet: node lab/test/wallet.test.mjs
import assert from 'node:assert/strict';
import { createWallet } from '../wallet.js';
import { memoryStore } from '../casstore.js';
import { DAY_CAP, EARN, walletDay } from '../../public/lab/wallet-catalog.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (e) { console.log('FAIL', name); console.error(e); process.exitCode = 1; }
}
function setup() {
  let now = Date.parse('2026-11-12T18:00:00Z');        // 10 am Pacific
  const players = { 'JJ-Capra': 'jj-capra', Roman: 'roman' };
  const verify = async (name, code) => (players[name] && code === 'right-key' ? { name, handle: players[name] } : null);
  const w = createWallet({ store: memoryStore(), clock: () => now, verify });
  const call = (path, body) => w.route('POST', '/api/wallet/' + path, body);
  return { w, call, tick: (ms) => { now += ms; }, now: () => now };
}
const JJ = { name: 'JJ-Capra', code: 'right-key' };

await test('a new wallet is empty; a game pays what it says, once per game', async () => {
  const g = setup();
  let r = await g.call('me', JJ);
  assert.deepEqual([r.diamonds, r.amber, r.shards], [0, 0, 0]);
  assert.equal(r.gm.linked, false);
  r = await g.call('earn', { ...JJ, game: 'swerve-planet', event: 'run', ref: 'run-1' });
  assert.deepEqual(r.paid, { amber: EARN['swerve-planet'].run.amber });
  assert.equal(r.amber, 20);
  const again = await g.call('earn', { ...JJ, game: 'swerve-planet', event: 'run', ref: 'run-1' });
  assert.deepEqual(again.paid, {}, 'the same run pays once');
  assert.equal(again.amber, 20);
  r = await g.call('earn', { ...JJ, game: 'swerve-planet', event: 'best', ref: 'run-1' });
  assert.deepEqual(r.paid, { shards: 1 }, 'a best on the same run is its own thing');
  assert.equal(r.today['swerve-planet'].amber, 20);
  assert.equal(r.log[0].game, 'swerve-planet');
  await assert.rejects(g.call('earn', { ...JJ, game: 'swerve-planet', event: 'diamonds' }), /doesn’t pay/);
  await assert.rejects(g.call('earn', { ...JJ, game: 'nope', event: 'run' }), /doesn’t pay/);
  await assert.rejects(g.call('earn', { ...JJ, game: 'swerve-planet', event: 'name' }), /doesn’t pay/);
});

await test('each game is capped a day; a new day starts over; other games have their own cap', async () => {
  const g = setup();
  let total = 0, r;
  for (let i = 0; i < 12; i++) { r = await g.call('earn', { ...JJ, game: 'par-tee-time', event: 'round', ref: 'r' + i }); total += r.paid.amber || 0; }
  assert.equal(total, DAY_CAP.amber);
  assert.equal(r.capped, true);
  for (let i = 0; i < 6; i++) await g.call('earn', { ...JJ, game: 'par-tee-time', event: 'win', ref: 'w' + i });
  assert.equal((await g.call('me', JJ)).shards, DAY_CAP.shards);
  r = await g.call('earn', { ...JJ, game: 'no-cap', event: 'game', ref: 'x' });
  assert.equal(r.paid.amber, 25, 'No Cap still pays');
  g.tick(24 * 3600e3);
  r = await g.call('earn', { ...JJ, game: 'par-tee-time', event: 'round', ref: 'r0' });
  assert.equal(r.paid.amber, 30, 'tomorrow pays again, even the same ref');
  assert.equal(r.amber, DAY_CAP.amber + 25 + 30);
});

await test('a game’s server pays diamonds; pages never can', async () => {
  const g = setup();
  const r = await g.w.pay('jj-capra', { diamonds: 1, amber: 30 }, { game: 'goat-getaway', why: 'out at par' });
  assert.deepEqual(r.paid, { diamonds: 1, amber: 30 });
  assert.equal(r.diamonds, 1);
  assert.equal(r.log[0].why, 'out at par');
  const none = await g.w.pay('jj-capra', { diamonds: 0, amber: -5 });
  assert.deepEqual(none.paid, {}, 'nothing negative or empty is paid');
  assert.equal(none.amber, 30);
});

await test('Glacial Maw: link brings the hunter’s balance in; syncs merge both ways and never go below zero', async () => {
  const g = setup();
  await g.call('earn', { ...JJ, game: 'mind-heist', event: 'game', ref: 'a' });            // 30 amber from the lab
  await assert.rejects(g.call('sync', { ...JJ, game: 'glacial-maw', d: { amber: 500 } }), (e) => e.code === 'not_linked');
  let r = await g.call('sync', { ...JJ, game: 'glacial-maw', link: true, hunter: 'u123', d: { amber: 4200, shards: 9, diamonds: 2 } });
  assert.deepEqual([r.amber, r.shards, r.diamonds], [4230, 9, 2], 'the hunter’s balance joins the lab’s');
  assert.equal(r.gm.linked, true);
  r = await g.call('sync', { ...JJ, game: 'glacial-maw', d: { amber: -1200, shards: 3 } });
  assert.deepEqual([r.amber, r.shards], [3030, 12]);
  r = await g.call('sync', { ...JJ, game: 'glacial-maw', d: { amber: -99999 } });
  assert.equal(r.amber, 0, 'never below zero');
  await assert.rejects(g.call('sync', { ...JJ, game: 'glacial-maw', d: { amber: 200000 } }), /more amber than one sync/);
  await assert.rejects(g.call('sync', { ...JJ, game: 'swerve-planet', d: { amber: 1 } }), /Only Glacial Maw/);
});

await test('sign-in, bad routes, and two pages paying at once', async () => {
  const g = setup();
  await assert.rejects(g.call('me', { name: 'JJ-Capra', code: 'nope' }), (e) => e.status === 401);
  await assert.rejects(g.w.route('GET', '/api/wallet/me', JJ), (e) => e.status === 405);
  await assert.rejects(g.call('spend', JJ), (e) => e.status === 404);
  await Promise.all(Array.from({ length: 8 }, (_, i) => g.call('earn', { ...JJ, game: 'punchline', event: 'game', ref: 'p' + i })));
  assert.equal((await g.call('me', JJ)).amber, 150, 'eight at once still stop at the cap');
  const res = await g.w.handle(new Request('http://x/api/wallet/me', { method: 'POST', body: JSON.stringify(JJ) }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).day, walletDay(g.now()));
});

console.log(`\nWallet: ${passed} tests passed`);
