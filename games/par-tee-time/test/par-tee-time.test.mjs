// Par-Tee Time's online rooms: node games/par-tee-time/test/par-tee-time.test.mjs
import assert from 'node:assert/strict';
import { createApi, ACTIVE_MS, SEEN_EVERY } from '../server/api.js';
import { memoryStore } from '../server/store.js';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (e) { console.log('FAIL', name); console.error(e); process.exitCode = 1; }
}
function setup() {
  let now = Date.parse('2026-11-09T18:00:00Z');
  const store = memoryStore();
  const api = createApi({ store, clock: () => now });
  const call = (path, body) => api.route('POST', path, body);
  return { call, store, tick: (ms) => { now += ms; } };
}
const HOST = 'hostphone0001', GUEST = 'guestphone001', THIRD = 'thirdphone001';

await test('a host opens a room, a friend joins with the code, each sees the other', async () => {
  const g = setup();
  let r = await g.call('/rooms/ABCD/join', { peer: HOST, role: 'host', presence: {} });
  assert.equal(r.peers.length, 1);
  await assert.rejects(g.call('/rooms/WXYZ/join', { peer: GUEST, role: 'guest' }), (e) => e.code === 'no_room', 'a wrong code says so');
  await g.call('/rooms/ABCD/presence', { peer: HOST, presence: { v: 1, role: 'host', name: 'JJ', color: '#f7f1e1' } });
  r = await g.call('/rooms/abcd/join', { peer: GUEST, role: 'guest', presence: {} });
  assert.equal(r.peers.length, 2, 'codes are case-blind');
  assert.equal(r.peers.find((p) => p.peer === HOST).presence.name, 'JJ');
  await g.call('/rooms/ABCD/presence', { peer: GUEST, presence: { v: 1, role: 'guest', name: 'Roman' } });
  r = await g.call('/rooms/ABCD/peers', { peer: HOST });
  assert.equal(r.peers.find((p) => p.peer === GUEST).presence.name, 'Roman');
});

await test('a taken code, a full game, and bad input', async () => {
  const g = setup();
  await g.call('/rooms/ABCD/join', { peer: HOST, role: 'host' });
  await assert.rejects(g.call('/rooms/ABCD/join', { peer: THIRD, role: 'host' }), (e) => e.code === 'taken');
  await g.call('/rooms/ABCD/join', { peer: GUEST, role: 'guest' });
  await assert.rejects(g.call('/rooms/ABCD/join', { peer: THIRD, role: 'guest' }), (e) => e.code === 'full');
  const again = await g.call('/rooms/ABCD/join', { peer: GUEST, role: 'guest' });
  assert.equal(again.peers.length, 2, 'the same phone joining again is fine');
  await assert.rejects(g.call('/rooms/AB/join', { peer: HOST, role: 'host' }), /Not found/);
  await assert.rejects(g.call('/rooms/ABCD/peers', { peer: 'x' }), /player id/);
  await assert.rejects(g.call('/rooms/ABCD/presence', { peer: HOST, presence: { big: 'x'.repeat(9000) } }), /too big/);
  await assert.rejects(g.call('/rooms/ABCD/peers', { peer: THIRD }), (e) => e.code === 'gone');
});

await test('shots relay through presence; polls mostly read', async () => {
  const g = setup();
  await g.call('/rooms/ABCD/join', { peer: HOST, role: 'host' });
  await g.call('/rooms/ABCD/join', { peer: GUEST, role: 'guest' });
  const shot = { m: 'match1', n: 1, hi: 0, by: 0, a: 0.5, p: 0.6, sx: 0, sy: 0, t0: 0, res: { b: [['p0', 120, 80, 0, 0, 0]] } };
  await g.call('/rooms/ABCD/presence', { peer: HOST, presence: { v: 1, role: 'host', shot, shots: [shot] } });
  const r = await g.call('/rooms/ABCD/peers', { peer: GUEST });
  assert.deepEqual(r.peers.find((p) => p.peer === HOST).presence.shot, shot);
  const etag = (await g.store.get('r/ABCD')).etag;
  g.tick(1000);
  await g.call('/rooms/ABCD/peers', { peer: GUEST });
  assert.equal((await g.store.get('r/ABCD')).etag, etag, 'a quick poll doesn’t write');
  g.tick(SEEN_EVERY);
  await g.call('/rooms/ABCD/peers', { peer: GUEST });
  assert.notEqual((await g.store.get('r/ABCD')).etag, etag, 'every few seconds it marks the phone seen');
});

await test('a locked phone drops out, then comes back; leaving frees the seat', async () => {
  const g = setup();
  await g.call('/rooms/ABCD/join', { peer: HOST, role: 'host' });
  await g.call('/rooms/ABCD/join', { peer: GUEST, role: 'guest' });
  g.tick(ACTIVE_MS - 5000);
  await g.call('/rooms/ABCD/peers', { peer: HOST });
  g.tick(6000);
  let r = await g.call('/rooms/ABCD/peers', { peer: HOST });
  assert.deepEqual(r.peers.map((p) => p.peer), [HOST], 'the quiet phone has left');
  r = await g.call('/rooms/ABCD/peers', { peer: GUEST });
  assert.equal(r.peers.length, 2, 'it checks in again and it’s back');
  await g.call('/rooms/ABCD/leave', { peer: GUEST });
  r = await g.call('/rooms/ABCD/peers', { peer: HOST });
  assert.equal(r.peers.length, 1);
  r = await g.call('/rooms/ABCD/join', { peer: THIRD, role: 'guest' });
  assert.equal(r.peers.length, 2, 'someone else can take the seat');
});

await test('the function answers over HTTP', async () => {
  const api = createApi({ store: memoryStore() });
  const res = await api.handle(new Request('http://x/par-tee-time/api/rooms/QQQQ/join', { method: 'POST', body: JSON.stringify({ peer: GUEST, role: 'guest' }) }));
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, 'no_room');
  const ok = await api.handle(new Request('http://x/par-tee-time/api/rooms/QQQQ/join', { method: 'POST', body: JSON.stringify({ peer: HOST, role: 'host' }) }));
  assert.equal(ok.status, 200);
});

console.log(`\nPar-Tee Time: ${passed} tests passed`);
