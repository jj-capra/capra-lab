// The lab's daily Card Draw: node lab/test/cards.test.mjs
import assert from 'node:assert/strict';
import { createCards } from '../cards.js';
import { memoryStore } from '../casstore.js';
import { DRAW, HOLD_EACH, KINDS, drawDay } from '../../public/lab/cards-catalog.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (e) { console.log('FAIL', name); console.error(e); process.exitCode = 1; }
}
function setup({ odds = null } = {}) {
  let now = Date.parse('2026-11-12T15:00:00Z');       // 7 am Pacific
  let i = 0;
  const seq = odds || [0.1, 0.0, 0.9, 0.5, 0.1, 0.3, 0.95, 0.2];
  const random = () => seq[i++ % seq.length];
  const store = memoryStore();
  const players = { 'JJ-Capra': 'jj-capra', Roman: 'roman' };
  const verify = async (name, code) => (players[name] && code === 'right-key' ? { name, handle: players[name] } : null);
  const cards = createCards({ store, clock: () => now, random, verify });
  const call = (path, body) => cards.route('POST', '/api/cards/' + path, body);
  return { cards, call, store, tick: (ms) => { now += ms; }, now: () => now };
}
const JJ = { name: 'JJ-Capra', code: 'right-key' };
// every card a prize, of kinds 0, 2 (Swerve life), 3 and 5 (mulligan) in the catalog's order
const MIXED = [0.0, 0.0, 0.0, 0.34, 0.0, 0.5, 0.0, 0.9];

await test('four cards a day; the same four on a second call; a new draw after midnight Pacific', async () => {
  const g = setup();
  let r = await g.call('me', JJ);
  assert.equal(r.drawn, false);
  assert.equal(r.today, null);
  r = await g.call('draw', JJ);
  assert.equal(r.today.length, DRAW);
  assert.equal(r.drawn, true);
  const prizes = r.today.filter((c) => c.k !== 'dud');
  assert.ok(prizes.length > 0 && prizes.length < DRAW, 'some prizes, some duds');
  assert.equal(r.cards.length, prizes.length, 'every prize lands in the hand');
  const again = await g.call('draw', JJ);
  assert.deepEqual(again.today, r.today, 'drawing twice the same day gives the same four');
  assert.equal(again.cards.length, r.cards.length);
  g.tick(8 * 3600e3);                                   // 3 pm Pacific, same day
  assert.equal((await g.call('me', JJ)).drawn, true);
  g.tick(10 * 3600e3);                                  // 1 am Pacific the next day
  assert.notEqual(drawDay(g.now()), r.day);
  assert.equal((await g.call('me', JJ)).drawn, false, 'a new day, a new draw');
  const next = await g.call('draw', JJ);
  assert.ok(next.cards.length >= r.cards.length, 'yesterday’s cards stay in the hand');
});

await test('no more than three of a kind; a full kind is never drawn', async () => {
  const g = setup({ odds: [0.0] });                     // every card a prize, always the first open kind
  for (let d = 0; d < 6; d++) { await g.call('draw', JJ); g.tick(24 * 3600e3); }
  const r = await g.call('me', JJ);
  for (const k of Object.keys(KINDS)) assert.ok((r.hand[k] || 0) <= HOLD_EACH, k);
  assert.equal(r.cards.length, Object.keys(KINDS).length * HOLD_EACH, 'all six kinds full');
  g.tick(24 * 3600e3);
  const full = await g.call('draw', JJ);
  assert.ok(full.today.every((c) => c.k === 'dud'), 'with every kind full, all four are duds');
});

await test('a page spends its own cards; others belong to the game’s server', async () => {
  const g = setup({ odds: MIXED });
  await g.call('draw', JJ);
  const have = await g.call('me', JJ);
  const selfKind = Object.keys(have.hand).find((k) => KINDS[k].self);
  const serverKind = Object.keys(have.hand).find((k) => !KINDS[k].self);
  assert.ok(selfKind && serverKind);
  const used = await g.call('use', { ...JJ, k: selfKind });
  assert.equal(used.ok, true);
  assert.equal(used.hand[selfKind] || 0, (have.hand[selfKind] || 0) - 1);
  assert.equal(used.used, 1);
  await assert.rejects(g.call('use', { ...JJ, k: serverKind }), /plays that card itself/);
  await assert.rejects(g.call('use', { ...JJ, k: 'nope' }), /isn’t a card/);
  while ((await g.cards.count('jj-capra', selfKind)) > 0) await g.call('use', { ...JJ, k: selfKind });
  await assert.rejects(g.call('use', { ...JJ, k: selfKind }), (e) => e.status === 409 && e.code === 'none');
});

await test('a game server takes a card and hands it back if the play is refused', async () => {
  const g = setup({ odds: MIXED });
  await g.call('draw', JJ);
  const k = Object.keys((await g.call('me', JJ)).hand)[0];
  const before = await g.cards.count('jj-capra', k);
  const card = await g.cards.take('jj-capra', k);
  assert.ok(card && card.k === k);
  assert.equal(await g.cards.count('jj-capra', k), before - 1);
  await g.cards.give('jj-capra', card);
  await g.cards.give('jj-capra', card);
  assert.equal(await g.cards.count('jj-capra', k), before, 'handing back twice only returns it once');
  assert.equal(await g.cards.take('roman', k), null, 'nothing to take from an empty hand');
});

await test('sign-in, bad routes and a race to spend the last card', async () => {
  const g = setup({ odds: MIXED });
  await assert.rejects(g.call('me', { name: 'JJ-Capra', code: 'wrong' }), (e) => e.status === 401 && e.code === 'signin');
  await assert.rejects(g.call('me', {}), (e) => e.status === 401);
  await assert.rejects(g.cards.route('GET', '/api/cards/me', JJ), (e) => e.status === 405);
  await assert.rejects(g.call('steal', JJ), (e) => e.status === 404);
  await g.call('draw', JJ);
  const k = Object.keys((await g.call('me', JJ)).hand).find((x) => KINDS[x].self);
  while ((await g.cards.count('jj-capra', k)) > 1) await g.cards.take('jj-capra', k);
  const both = await Promise.allSettled([g.call('use', { ...JJ, k }), g.call('use', { ...JJ, k })]);
  assert.equal(both.filter((r) => r.status === 'fulfilled').length, 1, 'the last card is spent once');
  const res = await g.cards.handle(new Request('http://x/api/cards/me', { method: 'POST', body: JSON.stringify(JJ) }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).drawn, true);
});

console.log(`\nCard Draw: ${passed} tests passed`);
