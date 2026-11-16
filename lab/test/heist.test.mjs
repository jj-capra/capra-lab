// Trophy rooms and trap houses: node lab/test/heist.test.mjs
import assert from 'node:assert/strict';
import { createHeist, GOAT_PENS } from '../heist.js';
import { createWallet, shelf } from '../wallet.js';
import { memoryStore } from '../casstore.js';
import { TRIVIA, HOLES } from '../heist-library.mjs';
import { ROUNDS } from '../../games/three-clue-crew/rounds.js';
import { puzzle } from '../../games/puzzled-spin/logic.mjs';
import { solve } from '../../games/goat-getaway/shared/puzzle.mjs';
import { CATCH_PAY, BREAK_PAY, LOOT_MAX, QUIZ, SPIN, LOCKDOWN_MS, KINDS, TRAPS, cleanTraps, lootOf } from '../../public/lab/heist-rules.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (e) { console.log('FAIL', name); console.error(e); process.exitCode = 1; }
}
function setup() {
  let now = Date.parse('2026-11-14T18:00:00Z');        // 10 am Pacific
  const players = { 'JJ-Capra': 'jj-capra', Roman: 'roman', Mia: 'mia' };
  const names = Object.fromEntries(Object.entries(players).map(([n, h]) => [h, n]));
  const verify = async (name, code) => (players[name] && code === 'k' ? { name, handle: players[name] } : null);
  const lookup = async (h) => (names[h] ? { name: names[h], handle: h } : null);
  const walletStore = memoryStore(), store = memoryStore();
  const wallet = createWallet({ store: walletStore, clock: () => now, verify });
  const heist = createHeist({ store, wallet, verify, lookup, clock: () => now });
  const call = (path, body) => heist.route('POST', '/api/heist/' + path, body, new URLSearchParams());
  const get = (path) => heist.route('GET', '/api/heist/' + path.split('?')[0], null, new URLSearchParams(path.split('?')[1] || ''));
  const raidRec = (id) => store.map.get('x/' + id).data;
  return { heist, wallet, call, get, store, walletStore, raidRec, tick: (ms) => { now += ms; }, now: () => now };
}
const JJ = { name: 'JJ-Capra', code: 'k' }, RO = { name: 'Roman', code: 'k' }, MIA = { name: 'Mia', code: 'k' };

// Play the current trap right (or wrong) using what the server stored.
async function play(g, who, raid, right = true) {
  let r = (await g.call('raid', { ...who, raid: raid.id, go: true })).raid;
  const t = r.trap;
  const rec = g.raidRec(raid.id), c = rec.traps[rec.step];
  if (t.kind === 'trivia' || t.kind === 'clues') {
    for (let i = 0; i < QUIZ.n && r.state === 'run' && r.step === t.step; i++) {
      if (i) r = (await g.call('raid', { ...who, raid: raid.id, go: true })).raid;
      const ans = t.kind === 'trivia' ? TRIVIA[c.qs[i]].a : c.ord[i].indexOf(0);
      const res = await g.call('answer', { ...who, raid: raid.id, i, pick: right ? ans : (ans + 1) % 4 });
      assert.equal(res.ok, right);
      r = res.raid;
    }
    return r;
  }
  if (t.kind === 'spin') {
    const p = puzzle(SPIN.tier, SPIN.stage, t.seed);
    g.tick(5000);
    const q = right ? p.start.map((row) => row.map(() => 0)) : p.start;
    return (await g.call('answer', { ...who, raid: raid.id, q })).raid;
  }
  if (t.kind === 'goat') {
    const s = solve(t.board);
    g.tick(60000);
    return (await g.call('answer', { ...who, raid: raid.id, moves: right ? s.path : s.path.slice(0, 3) })).raid;
  }
  g.tick(30000);
  return (await g.call('answer', { ...who, raid: raid.id, strokes: right ? t.hole.par : t.hole.par + 2 })).raid;
}

await test('the library: hard questions, tough holes, Billy pens', () => {
  assert.ok(TRIVIA.length >= 100 && TRIVIA.every((q) => q.v >= 400 && q.o.length === 4 && q.a >= 0 && q.a < 4));
  assert.ok(HOLES.length >= 10 && HOLES.every((h) => h.par >= 3));
  assert.ok(GOAT_PENS.length >= 40 && GOAT_PENS.every((p) => p.board.length === 36 && p.par >= 14 && p.par <= 17));
  assert.ok(ROUNDS[4].length >= 50);
  assert.deepEqual([...KINDS].sort(), ['clues', 'goat', 'golf', 'spin', 'trivia']);
  assert.deepEqual(cleanTraps(['golf', 'golf', 'nope']).map((t) => t.kind), ['golf', 'golf', 'goat', 'golf']);
  assert.deepEqual(lootOf({ amber: 5000, shards: 7 }), { amber: LOOT_MAX.amber, shards: 1 });
});

await test('a diamond mints a trophy; moving old diamonds and plain amber do not', async () => {
  const g = setup();
  await g.wallet.pay('jj-capra', { diamonds: 1 }, { game: 'par-tee-time', why: 'Masters trophy on Clockwork' });
  await g.wallet.pay('jj-capra', { diamonds: 3 }, { game: 'mind-heist', why: 'Mind Heist diamonds moved to the lab', trophy: false });
  await g.wallet.pay('jj-capra', { amber: 30 }, { game: 'goat-getaway', why: 'got the goat out' });
  await g.wallet.pay('jj-capra', { diamonds: 1 }, { game: 'goat-getaway', why: 'out at par' });
  const box = await g.wallet.trophyCase('jj-capra');
  assert.deepEqual(box.trophies.map((t) => t.game), ['par-tee-time', 'goat-getaway']);
  // a wallet from before trophies finds them in its log
  const old = { log: [{ at: 1, game: 'screensaver', why: '#1 on Screensaver, 2026-11-10', diamonds: 1 }, { at: 2, game: 'mind-heist', why: 'Mind Heist diamonds moved to the lab', diamonds: 4 }] };
  assert.deepEqual(shelf(old, 'roman').map((t) => t.why), ['#1 on Screensaver, 2026-11-10']);
});

await test('a wallet from before trophies gets its next trophy once (the Nov 16 doubles show once too)', async () => {
  const g = setup();
  await g.walletStore.set('w/roman', { diamonds: 1, amber: 0, shards: 0, log: [{ at: 1, game: 'screensaver', why: '#1 on Screensaver, 2026-11-10', diamonds: 1 }], items: [], look: null });
  await g.wallet.pay('roman', { diamonds: 1 }, { game: 'mind-heist', why: '#1 on Mind Heist · Daily drop, 2026-11-14' });
  await g.wallet.pay('roman', { diamonds: 2 }, { game: 'mind-heist', why: 'Mind Heist diamonds moved to the lab', trophy: false });
  let box = await g.wallet.trophyCase('roman');
  assert.deepEqual(box.trophies.map((t) => t.why), ['#1 on Screensaver, 2026-11-10', '#1 on Mind Heist · Daily drop, 2026-11-14']);
  // a shelf stored with the double shows it once, and the next write keeps it once
  const at = g.now(), why = '#1 on No Cap · Kids, 2026-11-15';
  await g.walletStore.set('w/mia', { diamonds: 1, log: [], items: [], trophies: [{ id: 't' + at.toString(36) + 'abc', at, game: 'no-cap', why, orig: 'mia', d: 1 }, { id: 't' + at.toString(36), at, game: 'no-cap', why, orig: 'mia', d: 1 }] });
  assert.equal((await g.wallet.trophyCase('mia')).trophies.length, 1);
  g.tick(1000);
  await g.wallet.pay('mia', { diamonds: 1 }, { game: 'par-tee-time', why: '#1 on Par-Tee Time · Daily 3, 2026-11-15' });
  box = await g.wallet.trophyCase('mia');
  assert.deepEqual(box.trophies.map((t) => t.game), ['no-cap', 'par-tee-time']);
  assert.equal(g.walletStore.map.get('w/mia').data.trophies.length, 2);
});

await test('anyone can watch a room; the owner sees the library and sets traps', async () => {
  const g = setup();
  await g.wallet.pay('jj-capra', { diamonds: 1 }, { game: 'par-tee-time', why: 'Masters trophy on Clockwork' });
  const pub = await g.get('room?h=jj-capra');
  assert.equal(pub.owner.name, 'JJ-Capra');
  assert.equal(pub.trophies.length, 1);
  assert.equal(pub.trophies[0].name, 'Masters Trophy · Clockwork');
  assert.deepEqual(pub.traps.map((t) => t.kind), ['trivia', 'spin', 'goat', 'golf']);
  assert.equal(pub.me, undefined);
  await assert.rejects(g.get('room?h=nobody-here'), /no trophy room/);
  const mine = await g.call('room', { ...JJ });
  assert.equal(mine.me.own, true);
  assert.ok(mine.library.holes.length && mine.library.pens.length);
  const set = await g.call('traps', { ...JJ, traps: [{ kind: 'goat', pick: 2 }, 'goat', { kind: 'golf', pick: HOLES[0].id }, 'clues'] });
  assert.deepEqual(set.traps.map((t) => t.kind), ['goat', 'goat', 'golf', 'clues']);
  assert.equal(set.traps[0].pick, 2);
  assert.match(set.traps[2].label, /par/);
  const list = await g.get('rooms');
  assert.equal(list.rooms[0].h, 'jj-capra');
  const theirs = await g.call('room', { ...RO, h: 'jj-capra' });
  assert.equal(theirs.me.canRaid, true);
  await assert.rejects(g.call('start', { ...JJ, h: 'jj-capra' }), /your own room/);
});

await test('caught: the owner gets amber, the raider is out of that room for the day', async () => {
  const g = setup();
  await g.call('traps', { ...JJ, traps: ['trivia', 'clues', 'spin', 'golf'] });
  let raid = await g.call('start', { ...RO, h: 'jj-capra' });
  assert.equal(raid.state, 'run');
  assert.equal(raid.trap.open, false);
  raid = await play(g, RO, raid, true);
  assert.equal(raid.step, 1);
  raid = await play(g, RO, raid, false);    // two wrong clues
  assert.equal(raid.state, 'caught');
  assert.deepEqual(raid.traps.map((t) => t.res), ['ok', 'caught', null, null]);
  assert.equal((await g.wallet.wallet('jj-capra')).amber, CATCH_PAY.amber);
  const room = await g.call('room', { ...RO, h: 'jj-capra' });
  assert.equal(room.me.tried, 'caught');
  assert.equal(room.me.canRaid, false);
  assert.equal(room.caught, 1);
  assert.equal(room.log[0].what, 'caught');
  await assert.rejects(g.call('start', { ...RO, h: 'jj-capra' }), /already tried/);
  g.tick(24 * 3600e3);
  assert.equal((await g.call('room', { ...RO, h: 'jj-capra' })).me.canRaid, true);
});

await test('one slip on a quiz is allowed; a late answer counts as wrong; time out on a puzzle is caught', async () => {
  const g = setup();
  await g.call('traps', { ...JJ, traps: ['trivia', 'spin', 'spin', 'spin'] });
  let raid = await g.call('start', { ...MIA, h: 'jj-capra' });
  raid = (await g.call('raid', { ...MIA, raid: raid.id, go: true })).raid;
  const rec = g.raidRec(raid.id), qs = rec.traps[0].qs;
  let r = await g.call('answer', { ...MIA, raid: raid.id, i: 0, pick: (TRIVIA[qs[0]].a + 1) % 4 });
  assert.equal(r.ok, false); assert.equal(r.right, TRIVIA[qs[0]].a);
  await g.call('raid', { ...MIA, raid: raid.id, go: true });
  g.tick((QUIZ.secs + QUIZ.grace + 1) * 1000);         // let question 2's clock run out
  r = await g.call('answer', { ...MIA, raid: raid.id, i: 1, pick: TRIVIA[qs[1]].a });
  assert.equal(r.raid.state, 'caught');
  // a fresh room: a spin puzzle left too long
  const g2 = setup();
  await g2.call('traps', { ...JJ, traps: ['spin', 'spin', 'spin', 'spin'] });
  let x = await g2.call('start', { ...MIA, h: 'jj-capra' });
  x = (await g2.call('raid', { ...MIA, raid: x.id, go: true })).raid;
  const p = puzzle(SPIN.tier, SPIN.stage, x.trap.seed);
  g2.tick((p.time + SPIN.grace + 1) * 1000);
  x = (await g2.call('raid', { ...MIA, raid: x.id })).raid;
  assert.equal(x.state, 'caught');
});

await test('all the way in: take a trophy, the room locks down, the raider is paid', async () => {
  const g = setup();
  await g.wallet.pay('jj-capra', { diamonds: 1 }, { game: 'par-tee-time', why: 'Masters trophy on Clockwork' });
  await g.wallet.pay('jj-capra', { amber: 500, shards: 10 }, { game: 'dev', why: 'test' });
  await g.call('traps', { ...JJ, traps: ['trivia', 'spin', 'goat', 'golf'] });
  let raid = await g.call('start', { ...RO, h: 'jj-capra' });
  for (let i = 0; i < 4; i++) raid = await play(g, RO, raid, true);
  assert.equal(raid.state, 'inside');
  assert.ok(raid.pickBy);
  const room = await g.get('room?h=jj-capra');
  await assert.rejects(g.call('take', { ...RO, raid: raid.id, pick: 'trophy', id: 'nope' }), /isn’t on the shelf/);
  const r = await g.call('take', { ...RO, raid: raid.id, pick: 'trophy', id: room.trophies[0].id });
  assert.equal(r.took.name, 'Masters Trophy · Clockwork');
  assert.equal(r.raid.state, 'done');
  await assert.rejects(g.call('take', { ...RO, raid: raid.id, pick: 'loot' }), /not in the trophy room/);
  const roman = await g.get('room?h=roman');
  assert.equal(roman.trophies.length, 1);
  assert.equal(roman.trophies[0].fromName, 'JJ-Capra');
  assert.equal(roman.trophies[0].origName, 'JJ-Capra');
  assert.equal((await g.get('room?h=jj-capra')).trophies.length, 0);
  assert.equal((await g.wallet.wallet('roman')).shards, BREAK_PAY.shards);
  const after = await g.call('room', { ...MIA, h: 'jj-capra' });
  assert.equal(after.me.why, 'lockdown');
  assert.equal(after.broken, 1);
  await assert.rejects(g.call('start', { ...MIA, h: 'jj-capra' }), /lockdown/);
  g.tick(LOCKDOWN_MS + 1000);
  assert.equal((await g.call('room', { ...MIA, h: 'jj-capra' })).me.canRaid, true);
});

await test('or the loot: a fifth of the owner’s amber and shards', async () => {
  const g = setup();
  await g.wallet.pay('jj-capra', { amber: 400, shards: 10 }, { game: 'dev', why: 'test' });
  await g.call('traps', { ...JJ, traps: ['golf', 'golf', 'golf', 'golf'] });
  let raid = await g.call('start', { ...MIA, h: 'jj-capra' });
  for (let i = 0; i < 4; i++) raid = await play(g, MIA, raid, true);
  const r = await g.call('take', { ...MIA, raid: raid.id, pick: 'loot' });
  assert.deepEqual(r.took.loot, { amber: 80, shards: 2 });
  const jj = await g.wallet.wallet('jj-capra'), mia = await g.wallet.wallet('mia');
  assert.deepEqual([jj.amber, jj.shards], [320, 8]);
  assert.deepEqual([mia.amber, mia.shards], [80, 2 + BREAK_PAY.shards]);
  // golf too quick to be real, or over par, is caught
  const g2 = setup();
  await g2.call('traps', { ...JJ, traps: ['golf', 'golf', 'golf', 'golf'] });
  let x = await g2.call('start', { ...MIA, h: 'jj-capra' });
  x = (await g2.call('raid', { ...MIA, raid: x.id, go: true })).raid;
  const q = await g2.call('answer', { ...MIA, raid: x.id, strokes: 1 });
  assert.equal(q.ok, false); assert.match(q.why, /too quick/);
});

await test('someone else can’t drive your break-in; the goat pen replays the moves', async () => {
  const g = setup();
  await g.call('traps', { ...JJ, traps: ['goat', 'goat', 'goat', 'goat'] });
  let raid = await g.call('start', { ...RO, h: 'jj-capra' });
  await assert.rejects(g.call('raid', { ...MIA, raid: raid.id }), /someone else’s/);
  raid = (await g.call('raid', { ...RO, raid: raid.id, go: true })).raid;
  assert.equal(raid.trap.board.length, 36);
  assert.equal(raid.trap.max, raid.trap.par + 12);
  const r = await g.call('answer', { ...RO, raid: raid.id, moves: [['B', 1]] });
  assert.equal(r.ok, false);
  assert.equal(r.raid.state, 'caught');
  assert.ok(TRAPS.goat.rule);
  // leaving the goat pen's page part way and opening it again trips the alarm
  const g2 = setup();
  await g2.call('traps', { ...JJ, traps: ['goat', 'goat', 'goat', 'goat'] });
  let x = await g2.call('start', { ...RO, h: 'jj-capra' });
  await g2.call('raid', { ...RO, raid: x.id, go: true });
  x = await g2.call('raid', { ...RO, raid: x.id });
  assert.equal(x.raid.state, 'run');
  x = await g2.call('raid', { ...RO, raid: x.raid.id, go: true });
  assert.equal(x.left, true);
  assert.equal(x.raid.state, 'caught');
});

console.log(`\nTrophy rooms: ${passed} tests passed`);
