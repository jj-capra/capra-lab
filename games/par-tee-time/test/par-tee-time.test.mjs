// Par-Tee Time's online rooms: node games/par-tee-time/test/par-tee-time.test.mjs
import assert from 'node:assert/strict';
import { createApi, ACTIVE_MS, SEEN_EVERY } from '../server/api.js';
import { memoryStore } from '../server/store.js';
import { createWallet } from '../../../lab/wallet.js';

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
function msetup({ wallet: withWallet = false } = {}) {
  let now = Date.parse('2026-11-12T18:00:00Z');
  const store = memoryStore();
  const wallet = withWallet ? createWallet({ store: memoryStore(), clock: () => now }) : null;
  const handleOf = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const HCP = {};
  const verify = async (name, code) => (KEYS[name] && KEYS[name] === code ? { name, handle: handleOf(name), salt: 'never-sent', hcp: HCP[name] || 0 } : null);
  const api = createApi({ store, verify, clock: () => now, wallet });
  const lab = (name) => ({ name, code: KEYS[name] });
  const call = (what, body) => api.route('POST', '/masters/' + what, body);
  const card = (total, n = 18) => { const s = Array(n).fill(Math.floor(total / n)); for (let i = 0, r = total - s[0] * n; r > 0; i++, r--) s[i]++; return s; };
  const holesOf = async (id) => (await store.get('m/' + id)).data.holes.length;
  const start = (id, who) => call('try', { id, lab: lab(who) });
  const post = async (id, who, t, total) => call('score', { id, lab: lab(who), try: t, scores: card(total, await holesOf(id)) });
  const round = async (id, who, total) => { const t = await start(id, who); return post(id, who, t.try, total); };
  const view = async (id, who) => (await call('course', { id, lab: who ? lab(who) : undefined })).course;
  const loot = async (who) => (await call('player', { handle: handleOf(who) })).loot;
  // an 18-hole course from before Nov 13 2026 (they can't be built any more, but they still play)
  let n = 0;
  const make = async (by = 'JJ-Capra', extra = {}) => {
    const id = 'old' + String(++n).padStart(3, '0'), h = handleOf(by);
    await store.set('m/' + id, { id, name: 'JJ’s Masters', by: { handle: h, name: by }, at: now, courses: ['boardwalk', 'gauntlet'], order: 'alternate', holes: HOLE_IDS, era: 0, best: null, players: {}, log: [], trophies: [], owed: [], retired: 0, ...extra });
    const p = (await store.get('mp/' + h))?.data || { handle: h, name: by, loot: 0, trophies: [], courses: [], played: [], keys: [] };
    p.courses.unshift(id);
    await store.set('mp/' + h, p);
    return view(id, by);
  };
  // a course built now: 8 holes, any hole of any course
  const make8 = async (by = 'JJ-Capra', extra = {}) => (await call('create', { lab: lab(by), name: 'JJ’s Clocks', holes: CLOCKS, courses: CLOCK_COURSES, theme: 'clock', ...extra })).course;
  return { call, store, lab, card, start, post, round, view, loot, make, make8, wallet, HCP, tick: (ms) => { now += ms; } };
}
const HOLE_IDS = ['b-clock', 'g-pinball', 'b-highway', 'g-pool', 'b-moon', 'g-clock', 'b-lagoon', 'g-windmill', 'b-hardwood', 'g-highway', 'b-windmill', 'g-vault', 'b-pool', 'g-hardwood', 'b-vault', 'g-moon', 'b-pinball', 'g-lagoon'];
const code = (c) => (e) => e.code === c;
const CLOCKS = ['b-clock', 'e-clock', 'clock', 'm-clock', 'a-clock', 'h-clock', 'g-clock', 'l-clock'];
const CLOCK_COURSES = ['boardwalk', 'pier', 'party', 'neon', 'afterhours', 'graveyard', 'gauntlet', 'boss'];
const MIXED = ['b-highway', 'g-clock', 'pool', 'm-moon', 'a-vault', 'e-pinball', 'h-lagoon', 'g-windmill'];

await test('masters: new courses are 8 holes, any hole of any course, by theme or picked; bad input is refused', async () => {
  const g = msetup();
  await assert.rejects(g.call('create', { name: 'x', holes: CLOCKS, courses: CLOCK_COURSES }), code('guest'));
  await assert.rejects(g.call('create', { lab: { name: 'JJ-Capra', code: '999999' }, name: 'x', holes: CLOCKS, courses: CLOCK_COURSES }), code('bad_key'));
  await assert.rejects(g.make8('JJ-Capra', { name: 'x'.repeat(25) }), code('bad_name'));
  await assert.rejects(g.make8('JJ-Capra', { name: '  ' }), code('bad_name'));
  await assert.rejects(g.make8('JJ-Capra', { holes: HOLE_IDS }), code('bad_holes'), 'no more 18-hole courses');
  await assert.rejects(g.make8('JJ-Capra', { holes: CLOCKS.slice(0, 7) }), code('bad_holes'));
  await assert.rejects(g.make8('JJ-Capra', { holes: [...CLOCKS.slice(0, 7), CLOCKS[0]] }), code('bad_holes'), 'eight different holes');
  await assert.rejects(g.make8('JJ-Capra', { holes: [...CLOCKS.slice(0, 7), '<b>'] }), code('bad_holes'));
  await assert.rejects(g.make8('JJ-Capra', { courses: [] }), code('bad_courses'));
  await assert.rejects(g.make8('JJ-Capra', { theme: 'Clock!' }), code('bad_theme'));
  const c = await g.make8();
  assert.equal(c.v, 2);
  assert.deepEqual(c.holes, CLOCKS);
  assert.equal(c.theme, 'clock');
  assert.equal(c.order, 'theme');
  assert.equal(c.live, false, 'not live until the designer plays their one chance');
  assert.equal(c.me.left, 1);
  assert.equal(c.me.limit, 1);
  assert.equal(c.me.oneChance, true);
  const mix = await g.make8('JJ-Capra', { name: 'Grab Bag', holes: MIXED, courses: ['boardwalk', 'gauntlet', 'party', 'neon', 'afterhours', 'pier', 'graveyard'], theme: null });
  assert.equal(mix.theme, null);
  assert.equal(mix.order, 'pick');
  assert.equal(mix.courses.length, 7);
  const me = await g.call('me', { lab: g.lab('JJ-Capra') });
  assert.deepEqual(me.courses.map((x) => x.id), [mix.id, c.id]);
  assert.equal(me.courses[0].v, 2);
  await assert.rejects(g.start(c.id, 'Roman'), (e) => e.code === 'no_best' && /one chance/.test(e.message), 'nobody else until the designer plays');
});

await test('masters: the designer has one chance; it sets the best, posts the course, and there is no second', async () => {
  const g = msetup();
  const { id } = await g.make8();
  const t = await g.start(id, 'JJ-Capra');
  assert.equal(t.left, 0);
  await assert.rejects(g.call('score', { id, lab: g.lab('JJ-Capra'), try: t.try, scores: g.card(30, 18) }), code('bad_scores'), 'eight scores, not eighteen');
  const r = await g.post(id, 'JJ-Capra', t.try, 31);
  assert.equal(r.result.kind, 'set');
  assert.equal(r.course.best.total, 31);
  assert.equal(r.course.best.scores.length, 8);
  assert.equal(r.course.live, true);
  assert.equal(r.course.me.holder, true);
  assert.equal(r.course.me.canTry, false);
  await assert.rejects(g.start(id, 'JJ-Capra'), code('holder'), 'no lowering it: one chance');
  // anyone with the invite: three tries, as before
  const roman = await g.view(id, 'Roman');
  assert.equal(roman.me.left, 3);
  assert.equal(roman.me.limit, 3);
  let x = await g.round(id, 'Roman', 31);
  assert.equal(x.result.tie, true);
  x = await g.round(id, 'Roman', 29);
  assert.equal(x.result.kind, 'took');
  assert.equal(await g.loot('Roman'), 1);
  // the designer was dethroned: now three tries to take it back, like anyone
  const jj = await g.view(id, 'JJ-Capra');
  assert.equal(jj.me.left, 3);
  assert.equal(jj.me.oneChance, false);
  x = await g.round(id, 'JJ-Capra', 28);
  assert.equal(x.result.kind, 'took');
});

await test('masters: a one chance that burns posts the course with no best; the first to finish sets it', async () => {
  const g = msetup();
  const { id } = await g.make8();
  const t = await g.start(id, 'JJ-Capra');
  let c = (await g.call('quit', { id, lab: g.lab('JJ-Capra'), try: t.try })).course;
  assert.equal(c.live, true);
  assert.equal(c.best, null);
  assert.equal(c.me.left, 0);
  await assert.rejects(g.start(id, 'JJ-Capra'), (e) => e.code === 'no_tries' && /one chance/.test(e.message), 'quitting doesn’t buy a second chance');
  const r = await g.round(id, 'Roman', 34);
  assert.equal(r.result.kind, 'set');
  assert.equal(r.course.best.name, 'Roman');
  // the same for a one chance left open four hours
  const c2 = await g.make8('Kade', { name: 'Kade Cup' });
  await g.start(c2.id, 'Kade');
  g.tick(4 * 3600e3);
  c = await g.view(c2.id, 'Roman');
  assert.equal(c.live, true);
  assert.equal(c.me.canTry, true);
});

await test('masters: handicaps: the net score takes the course best, and a try keeps the handicap it started with', async () => {
  const g = msetup();
  g.HCP['Roman'] = 6;                                   // 6 over 18 holes: 3 strokes off an 8-hole course
  const { id } = await g.make8();
  let r = await g.round(id, 'JJ-Capra', 26);           // scratch
  assert.equal(r.course.best.net, 26);
  assert.equal(r.course.best.strokes, 0);
  const v = await g.view(id, 'Roman');
  assert.equal(v.me.hcp, 6);
  assert.equal(v.me.strokes, 3);
  r = await g.round(id, 'Roman', 29);                   // net 26: a tie doesn't take it
  assert.equal(r.result.net, 26);
  assert.equal(r.result.strokes, 3);
  assert.equal(r.result.tie, true);
  assert.equal(r.result.kind, 'missed');
  const t = await g.start(id, 'Roman');
  g.HCP['Roman'] = 18;                                  // changing it mid-round changes nothing
  r = await g.post(id, 'Roman', t.try, 28);             // net 25 on the handicap it started with
  assert.equal(r.result.kind, 'took');
  assert.equal(r.course.best.total, 28);
  assert.equal(r.course.best.net, 25);
  assert.equal(r.course.best.hcp, 6);
  assert.deepEqual(r.result.beat, { name: 'JJ-Capra', total: 26, net: 26 });
  assert.equal(r.course.log[0].net, 25);
  // the scratch designer, three tries to take it back: 25 isn't enough, 24 is
  r = await g.round(id, 'JJ-Capra', 25);
  assert.equal(r.result.tie, true);
  r = await g.round(id, 'JJ-Capra', 24);
  assert.equal(r.result.kind, 'took');
  // an old best (no net) counts as net = total
  const old = await g.make();
  await g.round(old.id, 'JJ-Capra', 54);
  g.HCP['Roman'] = 4;                                   // 4 over 18 holes: 4 off an 18
  r = await g.round(old.id, 'Roman', 57);
  assert.equal(r.result.net, 53);
  assert.equal(r.result.kind, 'took');
});

await test('masters: an 18-hole course from before Nov 13 2026 still opens and plays by its old rules', async () => {
  const g = msetup();
  const c = await g.make();
  assert.equal(c.v, 1);
  assert.deepEqual(c.holes, HOLE_IDS);
  assert.equal(c.best, null);
  assert.equal(c.me.designer, true);
  assert.equal(c.me.left, 3, 'three tries for its designer, as it was');
  const me = await g.call('me', { lab: g.lab('JJ-Capra') });
  assert.deepEqual(me.courses.map((x) => x.id), [c.id], 'it shows under My courses');
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
  assert.deepEqual(r.result.beat, { name: 'JJ-Capra', total: 52, net: 52 });
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

await test('masters: the lab wallet gets a shard for every loot and a diamond for every trophy', async () => {
  const g = msetup({ wallet: true });
  const { id } = await g.make();
  await g.round(id, 'JJ-Capra', 52);
  await g.round(id, 'Roman', 50);                                  // Roman takes the best: one loot
  let r = await g.wallet.wallet('roman');
  assert.deepEqual([r.shards, r.diamonds], [1, 0]);
  g.tick(7 * 24 * 3600e3 + 1000);
  await g.view(id);                                                // seven days: Roman's trophy
  await g.view(id); await g.call('me', { lab: g.lab('Roman') });   // reads again pay nothing more
  r = await g.wallet.wallet('roman');
  assert.deepEqual([r.shards, r.diamonds], [1, 1]);
  assert.match(r.log[0].why, /Masters trophy/);
  assert.equal((await g.wallet.wallet('jj-capra')).shards, 0, 'setting a best pays nothing');
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
  for (let k = 0; k < 12; k++) ids.push((await g.make8('Roman', { name: 'Course ' + k })).id);
  await assert.rejects(g.make8('Roman', { name: 'One more' }), code('cap'));
  await assert.rejects(g.call('remove', { id: ids[3], lab: g.lab('JJ-Capra') }), code('not_yours'));
  await g.call('remove', { id: ids[3], lab: g.lab('Roman') });
  const me = await g.call('me', { lab: g.lab('Roman') });
  assert.equal(me.courses.length, 11);
  assert.ok(!me.courses.some((c) => c.id === ids[3]));
  const v = await g.view(ids[3], 'Roman');
  assert.equal(v.retired, true, 'the link still opens');
  assert.equal(v.me.canTry, false);
  await assert.rejects(g.start(ids[3], 'Roman'), code('retired'));
  await g.make8('Roman', { name: 'One more' });
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
