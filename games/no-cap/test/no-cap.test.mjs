// No Cap: rules, decks, a live game with a reader, a solo run and a challenge.   node games/no-cap/test/no-cap.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from '../server/api.js';
import { memoryStore } from '../server/store.js';
import { loadDecks, problems } from '../server/load.mjs';
import { claims, pieces, plain, cardPoints, FIND_MS, READ_MS, REVEAL_MS, POINTS } from '../shared/rules.mjs';

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

function setup({ crew = ['jj-capra'] } = {}) {
  let now = 1_800_000_000_000;
  const store = memoryStore();
  const api = createApi({
    store, decks: [fake('alpha'), fake('beta', 'adult')],
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

await test('JJ Brew: only Capra’s Lab starts games; links still work for guests', async () => {
  const g = setup();
  const hi = await g.call('/hello', {});
  assert.equal(hi.brew, true);
  assert.equal(hi.canHost, false);
  assert.deepEqual(hi.decks, [], 'the public sees no decks');
  await assert.rejects(g.call('/rooms', { kind: 'live', deckId: 'alpha', name: 'Guest' }), /Capra’s Lab/);
  const crew = await g.call('/hello', JJ);
  assert.equal(crew.canHost, true);
  assert.equal(crew.decks.length, 2);
  const h = await g.call('/rooms', { kind: 'live', deckId: 'alpha', ...JJ });
  const j = await g.call(`/rooms/${h.code}/join`, { name: 'Guest Friend' });
  assert.ok(j.pid, 'a guest with the link joins');
});

await test('a live game: the reader reads, everyone else finds the facts, busted on the cap', async () => {
  const g = setup();
  const h = await g.call('/rooms', { kind: 'live', deckId: 'alpha', ...JJ });
  const a = await g.call(`/rooms/${h.code}/join`, { name: 'DA_ROMAN_EMPIRE' });
  const b = await g.call(`/rooms/${h.code}/join`, { name: 'Bee' });
  const seat = { [h.pid]: h, [a.pid]: a, [b.pid]: b };
  const as = (s, extra = {}) => ({ pid: s.pid, tok: s.tok, ...extra });
  await assert.rejects(g.call(`/rooms/${h.code}/start`, as(a)), /Only the host/);
  let v = (await g.call(`/rooms/${h.code}/start`, as(h))).room;
  assert.equal(v.n, 9, 'three players read three cards each');
  assert.equal(v.stage, 'read');
  const reader = seat[v.reader];
  const others = [h, a, b].filter((s) => s !== reader);
  const rv = (await g.call(`/rooms/${h.code}`, as(reader))).room;
  assert.ok(rv.card && rv.card.say && rv.card.cap != null, 'the reader sees the card and the cap');
  const lv = (await g.call(`/rooms/${h.code}`, as(others[0]))).room;
  assert.equal(lv.card, undefined, 'listeners hear it, they don’t read it');
  assert.match(lv.about, /^Thing number \d+$/, 'everyone sees what the card is about');
  assert.equal(lv.about, rv.card.about);
  await assert.rejects(g.call(`/rooms/${h.code}/tap`, as(others[0], { i: 0, k: 0 })), /Time’s up/);
  g.tick(4000);
  v = (await g.call(`/rooms/${h.code}/read`, as(reader, { i: 0 }))).room;
  assert.equal(v.stage, 'find');
  const fv = (await g.call(`/rooms/${h.code}`, as(others[0]))).room;
  assert.equal(fv.card.claims.length, 4);
  assert.equal(fv.card.cap, undefined, 'nobody hunting sees the cap');
  await assert.rejects(g.call(`/rooms/${h.code}/tap`, as(reader, { i: 0, k: 0 })), /reader/);
  const cap = rv.card.cap, facts = [0, 1, 2, 3].filter((k) => k !== cap);
  // one finds all three fast; the other gets busted on the cap after one fact
  g.tick(2000);
  for (const k of facts) await g.call(`/rooms/${h.code}/tap`, as(others[0], { i: 0, k }));
  await g.call(`/rooms/${h.code}/tap`, as(others[1], { i: 0, k: facts[0] }));
  v = (await g.call(`/rooms/${h.code}/tap`, as(others[1], { i: 0, k: cap }))).room;
  assert.equal(v.stage, 'reveal', 'everyone done: the reveal comes early');
  assert.equal(v.card.cap, cap);
  assert.ok(v.card.real);
  assert.equal(v.round[others[1].pid].busted, true);
  assert.equal(v.round[others[1].pid].pts, 0);
  assert.equal(v.round[others[0].pid].pts, cardPoints(3, false, 2000) + POINTS.first, 'first to find all three gets the bonus');
  assert.equal(v.round[others[0].pid].first, true);
  assert.equal(v.round[reader.pid].pts, POINTS.fooled, 'the reader scores for fooling one');
  g.tick(REVEAL_MS);
  v = (await g.call(`/rooms/${h.code}`, as(h))).room;
  assert.equal(v.i, 1);
  assert.equal(v.stage, 'read');
  assert.notEqual(v.reader, reader.pid, 'the next card has the next reader');
  // a reader who never taps Done: the clock starts on its own
  g.tick(READ_MS);
  v = (await g.call(`/rooms/${h.code}`, as(h))).room;
  assert.equal(v.stage, 'find');
  // both find all three: the quicker one scores more and gets "first"
  const reader2 = seat[v.reader], others2 = [h, a, b].filter((s) => s !== reader2);
  const cap2 = (await g.call(`/rooms/${h.code}`, as(reader2))).room.card.cap, facts2 = [0, 1, 2, 3].filter((k) => k !== cap2);
  g.tick(3000);
  for (const k of facts2) await g.call(`/rooms/${h.code}/tap`, as(others2[0], { i: 1, k }));
  g.tick(9000);
  for (const k of facts2) v = (await g.call(`/rooms/${h.code}/tap`, as(others2[1], { i: 1, k }))).room;
  assert.equal(v.stage, 'reveal');
  const quick = v.round[others2[0].pid], slow = v.round[others2[1].pid];
  assert.equal(quick.first, true);
  assert.equal(slow.first, false);
  assert.equal(quick.pts, cardPoints(3, false, 3000) + POINTS.first);
  assert.equal(slow.pts, cardPoints(3, false, 12000));
  assert.ok(quick.pts > slow.pts, 'the quicker to answer gets more points');
  g.tick(REVEAL_MS);
  // nobody taps: time runs out, reveal, next
  g.tick(READ_MS);
  v = (await g.call(`/rooms/${h.code}`, as(h))).room;
  assert.equal(v.stage, 'find');
  g.tick(FIND_MS);
  v = (await g.call(`/rooms/${h.code}`, as(h))).room;
  assert.equal(v.stage, 'reveal');
  // play it out
  for (let i = 0; i < 40 && v.phase !== 'over'; i++) { g.tick(READ_MS + FIND_MS + REVEAL_MS); v = (await g.call(`/rooms/${h.code}`, as(h))).room; }
  assert.equal(v.phase, 'over');
  assert.equal(v.final.length, 3);
  assert.ok(v.final[0].score >= v.final[2].score);
  v = (await g.call(`/rooms/${h.code}/again`, as(h, { deckId: 'beta' }))).room;
  assert.equal(v.phase, 'play');
  assert.equal(v.deck.id, 'beta');
  assert.equal(v.players.every((p) => p.score === 0), true, 'a fresh game');
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
