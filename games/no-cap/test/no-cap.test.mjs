// No Cap: rules, decks, a topic draft with friends, a solo run and a challenge.   node games/no-cap/test/no-cap.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from '../server/api.js';
import { memoryStore } from '../server/store.js';
import { createCards } from '../../../lab/cards.js';
import { loadDecks, problems } from '../server/load.mjs';
import { claims, pieces, plain, cardPoints, FIND_MS, PICK_MS, CHOOSE_MS, REVEAL_MS, POINTS } from '../shared/rules.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
const test = async (name, fn) => {
  try { await fn(); console.log('ok   ' + name); passed++; }
  catch (e) { console.log('FAIL ' + name + '\n     ' + (e.stack || e.message)); process.exitCode = 1; }
};

const fake = (id, shelf = 'kids', n = 12) => ({
  id, title: 'Test ' + id, shelf, blurb: 'A test deck.',
  cards: Array.from({ length: n }, (_, i) => ({
    id: id + i, cap: [2, 0, 3, 1][i % 4], about: `Thing number ${i}`,
    say: `[claim one about thing number ${i}], [claim two about thing number ${i}], [claim three about thing number ${i}], and [claim four about thing number ${i}].`,
    real: 'What really happened.', src: ['a', 'b', 'c', 'd'],
  })),
});

function setup({ crew = ['jj-capra'], cards = null } = {}) {
  let now = 1_800_000_000_000;
  const store = memoryStore();
  const api = createApi({
    store, decks: [fake('alpha'), fake('beta', 'adult')], cards,
    verify: async (name, code) => (code === '123456' ? { name, handle: name.toLowerCase() } : null),
    role: async (h) => (crew.includes(h) ? (h === 'jj-capra' ? 'owner' : 'crew') : null),
    clock: () => now,
  });
  const call = (p, body = {}) => api.route('POST', p, body);
  return { api, store, call, tick: (ms) => { now += ms; }, get now() { return now; } };
}
const JJ = { lab: { name: 'JJ-Capra', code: '123456' } };

await test('a card is four bracketed claims; points add up', async () => {
  const say = '[Sharks are older than trees], [the yo-yo is from the 1980s], [a day on Venus is longer than its year], and [Nintendo began in 1889].';
  assert.deepEqual(claims(say), ['Sharks are older than trees', 'the yo-yo is from the 1980s', 'a day on Venus is longer than its year', 'Nintendo began in 1889']);
  assert.equal(pieces(say).filter((p) => p.i >= 0).length, 4);
  assert.equal(plain(say).includes('['), false);
  assert.equal(cardPoints(2, true, 1000), 0, 'busted keeps nothing');
  assert.equal(cardPoints(2, false, FIND_MS), 2 * POINTS.fact);
  assert.equal(cardPoints(3, false, 0), 3 * POINTS.fact + POINTS.allThree + POINTS.speed);
  assert.ok(cardPoints(3, false, 5000) > cardPoints(3, false, 20000), 'quicker scores more');
});

await test('the real decks pass the checks', async () => {
  const decks = loadDecks(ROOT);
  for (const d of decks) assert.deepEqual(problems(d), [], d.id);
  console.log(`     ${decks.length} decks, ${decks.reduce((n, d) => n + d.cards.length, 0)} cards`);
});

await test('live for everyone: a guest with a name opens a room, a friend joins with the link', async () => {
  const g = setup();
  const hi = await g.call('/hello', {});
  assert.equal(hi.brew, false);
  assert.equal(hi.canHost, true);
  assert.equal(hi.decks.length, 2, 'everyone sees the decks');
  await assert.rejects(g.call('/rooms', { kind: 'live', deckId: 'alpha' }), /name/);
  const h = await g.call('/rooms', { kind: 'live', deckId: 'alpha', name: 'Guest Host' });
  const j = await g.call(`/rooms/${h.code}/join`, { name: 'Guest Friend' });
  assert.ok(j.pid, 'a guest with the link joins');
  const s = await g.call('/rooms', { kind: 'solo', deckId: 'beta', ...JJ });
  assert.ok(s.code, 'signed-in players play as their lab name');
});

await test('with friends: a snake draft of topic cards, then everyone plays their cards in pick order', async () => {
  const g = setup();
  const h = await g.call('/rooms', { kind: 'live', deckId: 'alpha', ...JJ });
  const a = await g.call(`/rooms/${h.code}/join`, { name: 'Ana' });
  const b = await g.call(`/rooms/${h.code}/join`, { name: 'Bee' });
  const as = (s, x = {}) => ({ pid: s.pid, tok: s.tok, ...x });
  const seat = { [h.pid]: h, [a.pid]: a, [b.pid]: b };
  await assert.rejects(g.call(`/rooms/${h.code}/start`, as(a)), /host/);
  let v = (await g.call(`/rooms/${h.code}/start`, as(h))).room;
  assert.equal(v.stage, 'draft');
  assert.equal(v.draft.total, 6, 'three players: two topic cards each');
  assert.equal(v.draft.pile.length, 6);
  assert.ok(v.draft.pile.every((x) => /^Thing number/.test(x.about) && x.by == null), 'the pile shows topics only');
  assert.equal(JSON.stringify(v).includes('claim one'), false, 'no card text during the draft');
  const order = v.order.map((p) => p.pid), pile = v.draft.pile;
  const capOf = (c) => [2, 0, 3, 1][Number(pile[c].about.split(' ').pop()) % 4];
  assert.deepEqual(order.slice().sort(), [h.pid, a.pid, b.pid].sort(), 'a random order of everyone');
  // snake: 1 2 3 3 2 1
  const snake = [0, 1, 2, 2, 1, 0].map((k) => order[k]);
  await assert.rejects(g.call(`/rooms/${h.code}/pick`, as(seat[snake[1]], { k: 0, c: 0 })), /not your pick/);
  for (let k = 0; k < 4; k++) {
    assert.equal(v.draft.picker, snake[k], 'pick ' + k);
    g.tick(2000);
    v = (await g.call(`/rooms/${h.code}/pick`, as(seat[snake[k]], { k, c: 5 - k }))).room;
  }
  await assert.rejects(g.call(`/rooms/${h.code}/pick`, as(seat[snake[4]], { k: 4, c: 5 })), /taken/);
  // pick 4 runs out its clock: the next card on the pile (card 0) is theirs; then the last pick
  g.tick(PICK_MS + 10);
  v = (await g.call(`/rooms/${h.code}`, as(h))).room;
  assert.equal(v.draft.k, 5);
  assert.equal(v.draft.pile[0].by, snake[4], 'a missed pick takes the next card on the pile');
  v = (await g.call(`/rooms/${h.code}/pick`, as(seat[snake[5]], { k: 5, c: 1 }))).room;

  // the play: the same order as the draft, one card each, around twice
  assert.equal(v.stage, 'choose');
  assert.equal(v.reader, order[0]);
  assert.equal(v.n, 6);
  const first = seat[order[0]], others = [order[1], order[2]].map((p) => seat[p]);
  let mine = (await g.call(`/rooms/${h.code}`, as(first))).room;
  assert.deepEqual(mine.myHand.map((x) => x.c).sort(), [1, 5], 'your hand is what you drafted');
  assert.equal(mine.card, undefined, 'you only know your topics until the card is played');
  await assert.rejects(g.call(`/rooms/${h.code}/play`, as(others[0], { i: 0, c: 4 })), /not your turn/);
  await assert.rejects(g.call(`/rooms/${h.code}/play`, as(first, { i: 0, c: 4 })), /from your hand/);
  g.tick(3000);
  v = (await g.call(`/rooms/${h.code}/play`, as(first, { i: 0, c: 5 }))).room;
  assert.equal(v.stage, 'find');
  assert.equal(v.about, pile[5].about);
  const cap = capOf(5), facts = [0, 1, 2, 3].filter((k) => k !== cap);
  assert.equal(v.card.cap, cap, 'whoever played it sees the cap');
  const ov = (await g.call(`/rooms/${h.code}`, as(others[0]))).room;
  assert.equal(ov.card.claims.length, 4);
  assert.equal(ov.card.cap, undefined, 'hunters don’t');
  await assert.rejects(g.call(`/rooms/${h.code}/tap`, as(first, { i: 0, k: facts[0] })), /your card/);
  // one finds all three, the quicker; the other taps the cap
  g.tick(2000);
  for (const k of facts) await g.call(`/rooms/${h.code}/tap`, as(others[0], { i: 0, k }));
  g.tick(1000);
  v = (await g.call(`/rooms/${h.code}/tap`, as(others[1], { i: 0, k: cap }))).room;
  assert.equal(v.stage, 'reveal', 'everyone done: straight to the reveal');
  assert.equal(v.round[others[0].pid].pts, cardPoints(3, false, 2000) + POINTS.first);
  assert.equal(v.round[others[1].pid].pts, 0);
  assert.equal(v.round[first.pid].pts, POINTS.fooled, 'the one who played it scores for fooling a friend');
  assert.equal(v.card.real, 'What really happened.');
  // the next turn belongs to the second in the order; a turn left alone plays their next card
  g.tick(REVEAL_MS);
  v = (await g.call(`/rooms/${h.code}`, as(h))).room;
  assert.equal(v.stage, 'choose'); assert.equal(v.reader, order[1]); assert.equal(v.i, 1);
  g.tick(CHOOSE_MS + 10);
  v = (await g.call(`/rooms/${h.code}`, as(h))).room;
  assert.equal(v.stage, 'find', 'the clock played it for them');
  // run it out
  for (let i = 0; i < 40 && v.phase !== 'over'; i++) { g.tick(CHOOSE_MS + FIND_MS + REVEAL_MS); v = (await g.call(`/rooms/${h.code}`, as(h))).room; }
  assert.equal(v.phase, 'over');
  assert.equal(v.final.length, 3);
  assert.ok(v.final[0].score >= v.final[1].score);
  for (const p of v.final) { assert.equal(p.marks.length, 6); assert.equal(p.marks.filter((m) => m === 'own').length, 2, 'two of the six were their own cards'); }
  assert.equal(v.final.find((p) => p.pid === others[0].pid).marks[0], 'first');
  assert.equal(v.final.find((p) => p.pid === others[1].pid).marks[0], 'bust');
  // deal again: a new draft
  v = (await g.call(`/rooms/${h.code}/again`, as(h, { deckId: 'beta' }))).room;
  assert.equal(v.stage, 'draft'); assert.equal(v.deck.id, 'beta'); assert.equal(v.players[0].score, 0);
});

await test('two players get four cards each; a big room tops the pile up from the shelf', async () => {
  const g = setup();
  const h = await g.call('/rooms', { kind: 'live', deckId: 'alpha', ...JJ });
  const a = await g.call(`/rooms/${h.code}/join`, { name: 'Ana' });
  const as = (s, x = {}) => ({ pid: s.pid, tok: s.tok, ...x });
  let v = (await g.call(`/rooms/${h.code}/start`, as(h))).room;
  assert.equal(v.draft.total, 8);
  // nobody picks: the clock drafts all eight, four each
  g.tick(8 * PICK_MS + 10);
  v = (await g.call(`/rooms/${h.code}`, as(a))).room;
  assert.equal(v.stage, 'choose');
  assert.equal(v.myHand.length, 4);
  // 8 players need 16 cards: a 12-card deck is topped up from its shelf
  const big = createApi({ store: memoryStore(), decks: [fake('alpha'), fake('gamma'), fake('beta', 'adult')], verify: async () => null, clock: () => g.now });
  const bh = await big.route('POST', '/rooms', { kind: 'live', deckId: 'alpha', name: 'P0' });
  for (let k = 1; k < 8; k++) await big.route('POST', `/rooms/${bh.code}/join`, { name: 'P' + k });
  const bv = (await big.route('POST', `/rooms/${bh.code}/start`, { pid: bh.pid, tok: bh.tok })).room;
  assert.equal(bv.draft.total, 16);
});

await test('a Cap Shield from the daily draw: the first cap you tap doesn’t bust you', async () => {
  const cards = createCards({ store: memoryStore() });
  const g = setup({ cards });
  await cards.give('jj-capra', { id: 's1', k: 'nc-shield', at: 0 });
  const s = await g.call('/rooms', { kind: 'solo', deckId: 'beta', ...JJ });
  const as = (x, extra = {}) => ({ pid: x.pid, tok: x.tok, ...extra });
  assert.deepEqual(s.room.shield, { up: false, used: false });
  let v = (await g.call(`/rooms/${s.code}/shield`, as(s))).room;
  assert.deepEqual(v.shield, { up: true, used: false });
  assert.equal(await cards.count('jj-capra', 'nc-shield'), 0, 'the card left the hand');
  await cards.give('jj-capra', { id: 's2', k: 'nc-shield', at: 0 });
  await assert.rejects(g.call(`/rooms/${s.code}/shield`, as(s)), /One shield a game/);
  assert.equal(await cards.count('jj-capra', 'nc-shield'), 1, 'a refused shield goes back in the hand');
  // card 1: tap all four; the cap is blocked and the three facts still count
  v = (await g.call(`/rooms/${s.code}/go`, as(s, { i: 0 }))).room;
  const cap0 = [2, 0, 3, 1][Number(v.about.match(/\d+/)[0]) % 4];     // the fake decks' caps go 2, 0, 3, 1
  v = (await g.call(`/rooms/${s.code}/tap`, as(s, { i: 0, k: cap0 }))).room;
  assert.equal(v.mine.blocked, cap0, 'the shield took the cap');
  assert.equal(v.mine.busted, false);
  for (let k = 0; k < 4; k++) if (k !== cap0) v = (await g.call(`/rooms/${s.code}/tap`, as(s, { i: 0, k }))).room;
  assert.equal(v.mine.busted, false);
  assert.equal(v.mine.found.length, 3);
  assert.deepEqual(v.shield, { up: false, used: true });
  assert.ok(v.players[0].score > 0, 'all three facts scored');
  // card 2: the shield is used up, so the cap busts
  g.tick(1000);
  v = (await g.call(`/rooms/${s.code}/go`, as(s, { i: 1 }))).room;
  const capK = [2, 0, 3, 1][Number(v.about.match(/\d+/)[0]) % 4];     // the fake decks' caps go 2, 0, 3, 1
  v = (await g.call(`/rooms/${s.code}/tap`, as(s, { i: 1, k: capK }))).room;
  assert.equal(v.mine.busted, true);
  // a guest has no lab hand
  const guest = await g.call('/rooms', { kind: 'live', deckId: 'alpha', name: 'Guest' });
  assert.equal(guest.room.shield, null);
  await assert.rejects(g.call(`/rooms/${guest.code}/shield`, as(guest)), /Sign in to Capra Lab/);
});

await test('solo run, then a challenge with a board', async () => {
  const g = setup();
  const s = await g.call('/rooms', { kind: 'solo', deckId: 'beta', ...JJ });
  const as = (x, extra = {}) => ({ pid: x.pid, tok: x.tok, ...extra });
  let v = s.room;
  assert.equal(v.n, 10);
  assert.equal(v.stage, 'ready');
  assert.equal(v.card, undefined, 'the card waits for Go');
  for (let i = 0; i < 10; i++) {
    v = (await g.call(`/rooms/${s.code}/go`, as(s, { i }))).room;
    assert.equal(v.stage, 'find');
    assert.equal(v.card.cap, undefined);
    g.tick(1500);
    const capGuess = i % 3 === 0 ? 0 : null;
    // tap the facts we can find by trying: the server answers each tap
    for (let k = 0; k < 4 && v.stage === 'find'; k++) {
      if (capGuess === 0 && k === 0) { v = (await g.call(`/rooms/${s.code}/tap`, as(s, { i, k }))).room; continue; }
      v = (await g.call(`/rooms/${s.code}/tap`, as(s, { i, k }))).room;
    }
    assert.equal(v.stage, 'reveal');
  }
  assert.ok(v.final, 'the last reveal carries the final');
  const score = v.players[0].score;
  assert.ok(score > 0);
  const c = (await g.call(`/rooms/${s.code}/challenge`, as(s))).room;
  assert.match(c.made, /^[a-z0-9]{8}$/);
  const ch = (await g.call(`/challenges/${c.made}`, {})).challenge;
  assert.equal(ch.by.score, score);
  assert.equal(ch.n, 10);
  const t = await g.call(`/challenges/${c.made}/play`, { name: 'Friend' });
  assert.deepEqual((await g.store.get('r/' + t.code)).data.cards, (await g.store.get('r/' + s.code)).data.cards, 'the same cards in the same order');
  for (let i = 0; i < 10; i++) {
    await g.call(`/rooms/${t.code}/go`, as(t, { i }));
    g.tick(FIND_MS);   // the friend lets every clock run out
  }
  await g.call(`/rooms/${t.code}`, as(t));
  const after = (await g.call(`/challenges/${c.made}`, {})).challenge;
  assert.equal(after.board.length, 2, 'the friend is on the board');
  assert.equal(after.board.find((b) => b.name === 'Friend').score, 0);
});

console.log(`\nNo Cap: ${passed} tests passed`);
