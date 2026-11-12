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

/* ---------------- the Masters Course ---------------- */
const KEYS = { 'JJ-Capra': '111111', Roman: '222222', Kade: '333333', DA_ROMAN_EMPIRE: '444444' };
function msetup() {
  let now = Date.parse('2026-11-12T18:00:00Z');
  const store = memoryStore();
  const handleOf = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const verify = async (name, code) => (KEYS[name] && KEYS[name] === code ? { name, handle: handleOf(name), salt: 'never-sent' } : null);
  const api = createApi({ store, verify, clock: () => now });
  const lab = (name) => ({ name, code: KEYS[name] });
  const call = (what, body) => api.route('POST', '/masters/' + what, body);
  const card = (total) => { const s = Array(18).fill(Math.floor(total / 18)); for (let i = 0, r = total - s[0] * 18; r > 0; i++, r--) s[i]++; return s; };
  const start = (id, who) => call('try', { id, lab: lab(who) });
  const post = (id, who, t, total) => call('score', { id, lab: lab(who), try: t, scores: card(total) });
  const round = async (id, who, total) => { const t = await start(id, who); return post(id, who, t.try, total); };
  const view = async (id, who) => (await call('course', { id, lab: who ? lab(who) : undefined })).course;
  const loot = async (who) => (await call('player', { handle: handleOf(who) })).loot;
  const make = async (by = 'JJ-Capra', extra = {}) => (await call('create', { lab: lab(by), name: 'JJ’s Masters', courses: ['boardwalk', 'gauntlet'], order: 'alternate', holes: HOLE_IDS, ...extra })).course;
  return { call, store, lab, card, start, post, round, view, loot, make, tick: (ms) => { now += ms; } };
}
const HOLE_IDS = ['b-clock', 'g-pinball', 'b-highway', 'g-pool', 'b-moon', 'g-clock', 'b-lagoon', 'g-windmill', 'b-hardwood', 'g-highway', 'b-windmill', 'g-vault', 'b-pool', 'g-hardwood', 'b-vault', 'g-moon', 'b-pinball', 'g-lagoon'];
const code = (c) => (e) => e.code === c;

await test('masters: a signed-in player builds a course; guests and bad input are refused', async () => {
  const g = msetup();
  await assert.rejects(g.call('create', { name: 'x', courses: ['boardwalk', 'gauntlet'], order: 'alternate', holes: HOLE_IDS }), code('guest'));
  await assert.rejects(g.call('create', { lab: { name: 'JJ-Capra', code: '999999' }, name: 'x', courses: ['boardwalk', 'gauntlet'], order: 'alternate', holes: HOLE_IDS }), code('bad_key'));
  await assert.rejects(g.make('JJ-Capra', { name: 'x'.repeat(25) }), code('bad_name'));
  await assert.rejects(g.make('JJ-Capra', { name: '  ' }), code('bad_name'));
  await assert.rejects(g.make('JJ-Capra', { courses: ['boardwalk', 'boardwalk'] }), code('bad_courses'));
  await assert.rejects(g.make('JJ-Capra', { courses: ['boardwalk'] }), code('bad_courses'));
  await assert.rejects(g.make('JJ-Capra', { order: 'random' }), code('bad_order'));
  await assert.rejects(g.make('JJ-Capra', { holes: HOLE_IDS.slice(0, 17) }), code('bad_holes'));
  await assert.rejects(g.make('JJ-Capra', { holes: [...HOLE_IDS.slice(0, 17), HOLE_IDS[0]] }), code('bad_holes'), 'eighteen different holes');
  await assert.rejects(g.make('JJ-Capra', { holes: [...HOLE_IDS.slice(0, 17), '<b>'] }), code('bad_holes'));
  const c = await g.make();
  assert.match(c.id, /^[a-z0-9]{6}$/);
  assert.equal(c.name, 'JJ’s Masters');
  assert.deepEqual(c.holes, HOLE_IDS);
  assert.equal(c.best, null);
  assert.equal(c.me.designer, true);
  assert.equal(c.me.left, 3);
  const me = await g.call('me', { lab: g.lab('JJ-Capra') });
  assert.deepEqual(me.courses.map((x) => x.id), [c.id], 'it shows under My courses');
  assert.equal(me.loot, 0);
  assert.deepEqual(me.trophies, []);
  await assert.rejects(g.call('me', {}), code('guest'));
  const guest = await g.view(c.id);
  assert.equal(guest.me, null, 'anyone can read the course page');
  assert.equal(guest.holes.length, 18);
  await assert.rejects(g.start(c.id, 'Roman'), code('no_best'), 'no challenges until the designer sets a best');
  await assert.rejects(g.start(c.id), code('guest'));
  await assert.rejects(g.view('zzzzzz'), code('no_course'));
  await assert.rejects(g.view('../x'), code('bad_id'));
  assert.ok(!JSON.stringify(me).includes('111111') && !JSON.stringify(c).includes('111111') && !JSON.stringify(me).includes('never-sent'), 'no key or profile secrets come back');
});

await test('masters: the designer sets the first best with up to three tries and can lower it', async () => {
  const g = msetup();
  const { id } = await g.make();
  const t1 = await g.start(id, 'JJ-Capra');
  assert.equal(t1.left, 2);
  assert.match(t1.try, /^[a-z0-9]{10}$/);
  await assert.rejects(g.call('score', { id, lab: g.lab('JJ-Capra'), try: t1.try, scores: g.card(54).slice(0, 17) }), code('bad_scores'));
  await assert.rejects(g.call('score', { id, lab: g.lab('JJ-Capra'), try: t1.try, scores: [0, ...g.card(54).slice(1)] }), code('bad_scores'));
  await assert.rejects(g.call('score', { id, lab: g.lab('JJ-Capra'), try: t1.try, scores: [16, ...g.card(54).slice(1)] }), code('bad_scores'));
  await assert.rejects(g.call('score', { id, lab: g.lab('JJ-Capra'), try: t1.try, scores: [2.5, ...g.card(54).slice(1)] }), code('bad_scores'));
  let r = await g.post(id, 'JJ-Capra', t1.try, 54);
  assert.equal(r.result.kind, 'set');
  assert.equal(r.course.best.total, 54);
  assert.equal(r.course.best.name, 'JJ-Capra');
  assert.equal(r.course.best.scores.length, 18);
  await assert.rejects(g.post(id, 'JJ-Capra', t1.try, 50), code('try_over'), 'a try posts once');
  r = await g.round(id, 'JJ-Capra', 52);
  assert.equal(r.result.kind, 'lowered');
  assert.equal(r.course.best.total, 52);
  assert.equal(r.course.era, 0, 'lowering your own best is not a change of hands');
  r = await g.round(id, 'JJ-Capra', 56);
  assert.equal(r.result.kind, 'missed');
  assert.equal(r.course.best.total, 52);
  assert.equal(r.course.me.left, 0);
  await assert.rejects(g.start(id, 'JJ-Capra'), code('no_tries'));
  assert.equal(await g.loot('JJ-Capra'), 0, 'setting a best pays nothing');
  assert.deepEqual(r.course.log.map((e) => [e.name, e.total, e.kind]), [['JJ-Capra', 56, 'missed'], ['JJ-Capra', 52, 'lowered'], ['JJ-Capra', 54, 'set']]);
});

await test('masters: a challenger gets three tries; a tie does not beat it; the holder gets loot', async () => {
  const g = msetup();
  const { id } = await g.make();
  await g.round(id, 'JJ-Capra', 52);
  assert.equal((await g.view(id, 'Roman')).me.left, 3);
  let r = await g.round(id, 'Roman', 58);
  assert.equal(r.result.kind, 'missed');
  assert.equal(r.course.me.left, 2);
  r = await g.round(id, 'Roman', 53);
  assert.equal(r.result.holderGotLoot, false);
  assert.equal(await g.loot('JJ-Capra'), 0, 'no loot until all three are used');
  r = await g.round(id, 'Roman', 52);
  assert.equal(r.result.kind, 'missed', 'a tie does not beat it');
  assert.equal(r.result.tie, true);
  assert.equal(r.result.holderGotLoot, true);
  assert.equal(r.course.best.name, 'JJ-Capra');
  assert.equal(r.course.me.left, 0);
  assert.equal(r.course.me.why, 'no_tries');
  assert.equal(await g.loot('JJ-Capra'), 1, 'the holder beat Roman: one loot');
  assert.equal(await g.loot('Roman'), 0);
  await assert.rejects(g.start(id, 'Roman'), code('no_tries'));
  const me = await g.call('me', { lab: g.lab('Roman') });
  assert.deepEqual(me.played.map((x) => x.id), [id], 'the course shows under Challenges');
  assert.equal(me.played[0].me.left, 0);
});

await test('masters: taking the best pays loot and gives the dethroned holder three fresh tries', async () => {
  const g = msetup();
  const { id } = await g.make();
  await g.round(id, 'JJ-Capra', 52);
  await g.round(id, 'Roman', 55);
  await g.round(id, 'Roman', 54);
  let r = await g.round(id, 'Kade', 50);
  assert.equal(r.result.kind, 'took');
  assert.deepEqual(r.result.beat, { name: 'JJ-Capra', total: 52 });
  assert.equal(r.course.best.name, 'Kade');
  assert.equal(r.course.best.from, 'JJ-Capra');
  assert.equal(r.course.era, 1);
  assert.equal(r.course.me.holder, true);
  assert.equal(r.course.me.canTry, false);
  assert.equal(await g.loot('Kade'), 1);
  await assert.rejects(g.start(id, 'Kade'), code('holder'), 'the holder defends, no tries');
  let jj = await g.view(id, 'JJ-Capra');
  assert.equal(jj.me.left, 3, 'the designer gets three fresh tries at the new best');
  assert.equal(jj.me.takenFrom, true);
  assert.equal((await g.view(id, 'Roman')).me.left, 3, 'a new era: everyone else gets three fresh tries too');
  r = await g.round(id, 'JJ-Capra', 50);
  assert.equal(r.result.kind, 'missed');
  assert.equal(r.result.tie, true);
  r = await g.round(id, 'JJ-Capra', 49);
  assert.equal(r.result.kind, 'took', 'the designer takes it back');
  assert.equal(r.course.era, 2);
  assert.equal(await g.loot('JJ-Capra'), 1);
  const kade = await g.view(id, 'Kade');
  assert.equal(kade.me.left, 3);
  assert.equal(kade.me.takenFrom, true);
  assert.equal(kade.me.canTry, true);
  // Kade uses all three and misses: the holder (JJ) beat him
  await g.round(id, 'Kade', 60); await g.round(id, 'Kade', 55);
  r = await g.round(id, 'Kade', 51);
  assert.equal(r.result.holderGotLoot, true);
  assert.equal(await g.loot('JJ-Capra'), 2);
  assert.equal(await g.loot('Kade'), 1);
});

await test('masters: quitting burns a try; starting again burns the open one; a stale try times out', async () => {
  const g = msetup();
  const { id } = await g.make();
  await g.round(id, 'JJ-Capra', 52);
  const t1 = await g.start(id, 'Roman');
  let r = await g.call('quit', { id, lab: g.lab('Roman'), try: t1.try });
  assert.equal(r.course.me.left, 2, 'quitting burns it');
  assert.equal(r.course.log[0].kind, 'quit');
  await assert.rejects(g.post(id, 'Roman', t1.try, 40), code('try_over'));
  r = await g.call('quit', { id, lab: g.lab('Roman'), try: t1.try });
  assert.equal(r.course.me.left, 2, 'quitting twice is harmless');
  const t2 = await g.start(id, 'Roman');
  const t3 = await g.start(id, 'Roman');                       // t2 left unfinished: burned
  assert.equal(t3.left, 0);
  await assert.rejects(g.post(id, 'Roman', t2.try, 40), code('try_over'));
  g.tick(4 * 3600e3);                                          // t3 sits open four hours
  const v = await g.view(id, 'Roman');
  assert.equal(v.log[0].kind, 'timeout');
  assert.equal(v.me.open, false);
  assert.equal(await g.loot('JJ-Capra'), 1, 'three burned tries: the holder beat Roman');
  await assert.rejects(g.post(id, 'Roman', t3.try, 40), code('try_over'));
  // a designer whose three tries all burn before any best gets three more
  const c2 = await g.make('Kade', { name: 'Kade Cup' });
  for (let k = 0; k < 3; k++) { const t = await g.start(c2.id, 'Kade'); await g.call('quit', { id: c2.id, lab: g.lab('Kade'), try: t.try }); }
  assert.equal((await g.view(c2.id, 'Kade')).me.left, 3, 'no best yet: the designer is never stuck');
  const t = await g.start(c2.id, 'Kade');
  assert.equal(t.left, 2);
});

await test('masters: holding the best seven days straight earns one trophy per holder per era', async () => {
  const g = msetup();
  const { id } = await g.make();
  await g.round(id, 'JJ-Capra', 52);
  g.tick(7 * 24 * 3600e3 - 60e3);
  let v = await g.view(id);
  assert.equal(v.trophies.length, 0, 'not quite seven days');
  assert.equal(v.best.trophy, false);
  g.tick(120e3);
  v = await g.view(id);                                        // any read awards it
  assert.equal(v.trophies.length, 1);
  assert.equal(v.trophies[0].name, 'JJ-Capra');
  assert.equal(v.best.trophy, true);
  let jj = await g.call('player', { handle: 'jj-capra' });
  assert.equal(jj.trophies.length, 1);
  assert.equal(jj.trophies[0].course, id);
  assert.equal(jj.trophies[0].name, 'JJ’s Masters');
  assert.equal(new Date(jj.trophies[0].at).toISOString(), '2026-11-19T18:00:00.000Z', 'dated the day the seven days were up');
  g.tick(30 * 24 * 3600e3);
  await g.view(id); await g.view(id, 'Roman');
  jj = await g.call('me', { lab: g.lab('JJ-Capra') });
  assert.equal(jj.trophies.length, 1, 'once per holder per era');
  // a new holder starts a new clock; the trophy comes from the player's own cabinet read too
  await g.round(id, 'Roman', 50);
  g.tick(7 * 24 * 3600e3);
  const roman = await g.call('me', { lab: g.lab('Roman') });
  assert.equal(roman.trophies.length, 1, 'reading your cabinet awards a trophy that is due');
  assert.equal(roman.loot, 1);
  assert.equal((await g.call('player', { handle: 'jj-capra' })).trophies.length, 1);
  await assert.rejects(g.call('player', { handle: 'Bad Handle!' }), code('bad_handle'));
  const nobody = await g.call('player', { handle: 'nobody' });
  assert.deepEqual([nobody.loot, nobody.trophies], [0, []]);
});

await test('masters: loot and trophies are paid once even if a payout is retried', async () => {
  const g = msetup();
  const { id } = await g.make();
  await g.round(id, 'JJ-Capra', 52);
  await g.round(id, 'Kade', 50);
  assert.equal(await g.loot('Kade'), 1);
  const got = await g.store.get('m/' + id);
  assert.deepEqual(got.data.owed, [], 'paid and cleared');
  // as if the server stopped after paying but before clearing the course
  got.data.owed = [{ kind: 'loot', key: `l:${id}:0:took:kade`, handle: 'kade', name: 'Kade', course: id, courseName: 'JJ’s Masters', at: 1 }];
  await g.store.set('m/' + id, got.data);
  await g.view(id);
  assert.equal(await g.loot('Kade'), 1, 'not paid twice');
  assert.deepEqual((await g.store.get('m/' + id)).data.owed, []);
});

await test('masters: twelve courses a player; removing one frees a slot and retires its link', async () => {
  const g = msetup();
  const ids = [];
  for (let k = 0; k < 12; k++) ids.push((await g.make('Roman', { name: 'Course ' + k })).id);
  await assert.rejects(g.make('Roman', { name: 'One more' }), code('cap'));
  await assert.rejects(g.call('remove', { id: ids[3], lab: g.lab('JJ-Capra') }), code('not_yours'));
  await g.call('remove', { id: ids[3], lab: g.lab('Roman') });
  const me = await g.call('me', { lab: g.lab('Roman') });
  assert.equal(me.courses.length, 11);
  assert.ok(!me.courses.some((c) => c.id === ids[3]));
  const v = await g.view(ids[3], 'Roman');
  assert.equal(v.retired, true, 'the link still opens');
  assert.equal(v.me.canTry, false);
  await assert.rejects(g.start(ids[3], 'Roman'), code('retired'));
  await g.make('Roman', { name: 'One more' });
});

await test('masters: the function answers over HTTP', async () => {
  const api = createApi({ store: memoryStore(), verify: async () => null });
  const res = await api.handle(new Request('http://x/par-tee-time/api/masters/course', { method: 'POST', body: JSON.stringify({ id: 'abcdef' }) }));
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, 'no_course');
  const guest = await api.handle(new Request('http://x/par-tee-time/api/masters/me', { method: 'POST', body: '{}' }));
  assert.equal(guest.status, 401);
  const bad = await api.handle(new Request('http://x/par-tee-time/api/masters/me', { method: 'POST', body: JSON.stringify({ lab: { name: 'JJ-Capra', code: '123456' } }) }));
  const j = await bad.json();
  assert.equal(bad.status, 401);
  assert.equal(j.code, 'bad_key');
  assert.ok(!JSON.stringify(j).includes('123456'), 'a key is never echoed');
});

console.log(`\nPar-Tee Time: ${passed} tests passed`);

await import('./holes.test.mjs');
