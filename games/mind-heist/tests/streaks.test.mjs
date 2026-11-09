// JC, Nov 5 2026: four in a row at most, a take uses up the taker's turn, two players skip the
// captain draw, joke setups get 25 seconds, and the four-button emoji row.   node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/server/engine.mjs';
import { makeHandler } from '../src/server/api.mjs';
import { memoryStore } from '../src/server/store.mjs';
import { emoRow, EMO_ROW } from '../src/shared/emoji.mjs';

const cat = (n) => ({ name: 'Cat ' + n, questions: [100, 200, 300, 400].map(v => ({ value: v, q: `Q ${n}-${v}?`, options: ['A', 'B', 'C', 'D'], answer: 2, fact: 'Fact.' })) });
const TRIVIA = { id: 'triv-t', title: 'Test Trivia', kind: null, categories: [cat(1), cat(2), cat(3)] };
const JOKES = { id: 'jokes-t', title: 'Test Jokes', kind: 'jokes', categories: [cat(4), cat(5), cat(6)] };
const lookup = (id) => (id === JOKES.id ? JOKES : TRIVIA);
const ALL_ON = { clock: 30, hacker: true, fifty: true, doubles: 2, take: true, cards: true };

function game({ players = 2, deck = TRIVIA, settings = ALL_ON, seed = 7 } = {}) {
  let now = 1_800_000_000_000;
  const room = E.newRoom({ kind: 'invite', code: 'TEST', host: { pid: 'p0', name: 'JC', avatar: '🦝' }, deck, settings, seed, now });
  for (let i = 1; i < players; i++) E.addMember(room, { pid: 'p' + i, name: 'P' + i }, now);
  const act = (pid, a) => { now += 5; E.act(room, { pid }, a, now, lookup); };
  return {
    room, act,
    tick(ms) { now += ms; E.settle(room, now); },
    get now() { return now; },
    setup() { act('p0', { type: 'start' }); if (room.phase === 'captains') act('p0', { type: 'toss' }); act('p0', { type: 'draft' }); if (room.phase === 'draft') act('p0', { type: 'autoDraft' }); },
  };
}
const cells = (room) => room.board.flatMap((col, c) => col.tiles.map((t, r) => ({ t, c, r })));
const open = (room, pred = () => true) => cells(room).find(x => !x.t.res && pred(x.t));

// Play one tile: the hot seat picks it and answers right or wrong (a take, if any, misses).
function play(g, x, right) {
  const { room } = g;
  g.act(E.picker(room), { type: 'pick', c: x.c, r: x.r });
  if (room.phase === 'intro') g.tick(E.INTRO_MS);
  const ans = x.t.ans;
  g.act(room.cur.mid, { type: 'lock', i: right ? ans : (ans + 1) % 4 });
  if (room.phase === 'ask' && room.cur.take) g.act(room.cur.mid, { type: 'lock', i: (ans + 3) % 4 });
  g.tick(E.REVEAL_MS);
}

test('two players: no captain draw, straight to the coin flip', () => {
  const g = game({ players: 2 });
  g.act('p0', { type: 'start' });
  assert.equal(g.room.phase, 'toss', 'skips the captains screen');
  assert.equal(g.room.crews.length, 2);
  assert.deepEqual(g.room.crews.map(c => c.mem.length), [1, 1], 'each player is a crew of one');
  assert.ok(g.room.toss === 0 || g.room.toss === 1);
  const v = E.view(g.room, 'p1', g.now);
  assert.equal(v.toss, g.room.toss, 'the toss shows right away');
  g.act('p0', { type: 'draft' });
  assert.equal(g.room.phase, 'board', 'nobody to draft');
  assert.equal(g.room.turn, g.room.toss, 'the toss winner picks the first tile');

  const g3 = game({ players: 3 });
  g3.act('p0', { type: 'start' });
  assert.equal(g3.room.phase, 'captains', 'three or more still draw captains');
});

test('someone who joins during the coin flip is not drafted twice', () => {
  const g = game({ players: 3 });
  g.act('p0', { type: 'start' });
  g.act('p0', { type: 'toss' });
  E.addMember(g.room, { pid: 'late', name: 'Late' }, g.now);
  g.act('p0', { type: 'draft' });
  assert.ok(!(g.room.draft && g.room.draft.pool || []).includes('late'), 'already on a crew');
  if (g.room.phase === 'draft') g.act('p0', { type: 'autoDraft' });
  const all = g.room.crews.flatMap(c => c.mem);
  assert.equal(all.length, new Set(all).size, 'nobody on two crews');
  assert.equal(all.length, 4);
});

test('joke face-off: the setup shows on its own for 25 seconds', () => {
  assert.equal(E.DUEL_INTRO_MS, 25000);
  const g = game({ players: 2, deck: JOKES, settings: { clock: 30 } });
  g.setup();
  const x = open(g.room);
  g.act(E.picker(g.room), { type: 'pick', c: x.c, r: x.r });
  assert.equal(g.room.phase, 'intro');
  assert.equal(g.room.cur.introUntil - g.now, 25000);
  const v = E.view(g.room, 'p1', g.now);
  assert.ok(v.cur.q, 'the setup is up');
  assert.equal(v.cur.opts, null, 'punchlines wait');
  g.tick(24000);
  assert.equal(g.room.phase, 'intro', 'still reading at 24 s');
  g.tick(1000);
  assert.equal(g.room.phase, 'ask', 'punchlines at 25 s');
  // The host can still skip ahead.
  g.act(g.room.cur.duel.mids[0], { type: 'lock', i: x.t.ans });
  g.act(g.room.cur.duel.mids[1], { type: 'lock', i: x.t.ans });
  assert.equal(g.room.phase, 'reveal');
  g.tick(E.DUEL_VERDICT_MS + E.FACT_MS);
  assert.equal(g.room.phase, 'board');
  const y = open(g.room);
  g.act(E.picker(g.room), { type: 'pick', c: y.c, r: y.r });
  assert.equal(g.room.phase, 'intro');
  g.act('p0', { type: 'next' });
  assert.equal(g.room.phase, 'ask', 'host skip still works');
});

test('no crew picks more than four tiles in a row, with every option on', () => {
  for (const players of [2, 3, 4, 6]) for (let seed = 1; seed <= 300; seed++) {
    const g = game({ players, seed });
    g.setup();
    let last = null, n = 0, guard = 0;
    let r = seed;
    const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    while (g.room.phase === 'board' && guard++ < 40) {
      const k = g.room.turn;
      n = k === last ? n + 1 : 1; last = k;
      assert.ok(n <= E.streakCap(g.room, k), `seed ${seed}, ${players} players: crew ${k} picked ${n} in a row`);
      assert.ok(n <= (players === 2 ? 2 : E.MAX_STREAK), `seed ${seed}, ${players} players: crew ${k} picked ${n} in a row`);
      const left = cells(g.room).filter(x => !x.t.res);
      play(g, left[Math.floor(rnd() * left.length)], rnd() < 0.75);
    }
  }
});

test('beat the Hacker on the second pick in a row: the run is cut to two', () => {
  const g = game({ players: 4, settings: { ...ALL_ON, take: false } });
  g.setup();
  const A = g.room.turn;
  const dbl = open(g.room, t => t.sp === 'double');
  play(g, dbl, true);
  assert.equal(g.room.turn, A, 'the Double keeps the turn');
  const hk = open(g.room, t => t.sp === 'hacker');
  g.act(E.picker(g.room), { type: 'pick', c: hk.c, r: hk.r });
  assert.equal(E.view(g.room, 'p0', g.now).cur.runIf, 2, 'the takeover says two picks follow');
  g.tick(E.INTRO_MS);
  g.act(g.room.cur.mid, { type: 'lock', i: hk.t.ans });
  assert.deepEqual(g.room.run, { crew: A, left: 2 });
  assert.match(g.room.feed[g.room.feed.length - 1].text, /picks the next 2 tiles/);
  g.tick(E.REVEAL_MS);
  for (let i = 0; i < 2; i++) { assert.equal(g.room.turn, A); play(g, open(g.room, t => !t.sp), false); }
  assert.equal(g.room.turn, 1 - A, 'four in a row, then the turn passes');
  assert.equal(g.room.run, null);
});

test('a Double inside a Hacker run plays as a plain tile', () => {
  const g = game({ players: 4, settings: { ...ALL_ON, take: false } });
  g.setup();
  const A = g.room.turn;
  play(g, open(g.room, t => t.sp === 'hacker'), true);
  assert.deepEqual(g.room.run, { crew: A, left: 3 }, 'a run that starts the streak is still three');
  const dbl = open(g.room, t => t.sp === 'double');
  g.act(E.picker(g.room), { type: 'pick', c: dbl.c, r: dbl.r });
  assert.equal(g.room.phase, 'ask', 'no Double takeover');
  assert.equal(E.view(g.room, 'p0', g.now).cur.sp, null);
  g.act(g.room.cur.mid, { type: 'lock', i: dbl.t.ans });
  g.tick(E.REVEAL_MS);
  play(g, open(g.room, t => !t.sp), true);
  play(g, open(g.room, t => !t.sp), true);
  assert.equal(g.room.turn, 1 - A, 'still four in a row: Hacker plus three');
  assert.equal(E.view(g.room, 'p0', g.now).board[dbl.c].tiles[dbl.r].sp, null, 'never shows as a Double');
});

// JC, Nov 8 2026, a two-player game: "The host is picking too many tiles in a row."
test('two players: nobody picks more than two tiles in a row', () => {
  const g = game({ players: 2, settings: { ...ALL_ON, take: false } });
  g.setup();
  const A = g.room.turn;
  const hk = open(g.room, t => t.sp === 'hacker');
  g.act(E.picker(g.room), { type: 'pick', c: hk.c, r: hk.r });
  assert.equal(E.view(g.room, 'p0', g.now).cur.runIf, 1, 'beat the Hacker and one pick follows');
  g.tick(E.INTRO_MS);
  g.act(g.room.cur.mid, { type: 'lock', i: hk.t.ans });
  assert.deepEqual(g.room.run, { crew: A, left: 1 });
  assert.match(g.room.feed[g.room.feed.length - 1].text, /picks the next tile\./);
  g.tick(E.REVEAL_MS);
  assert.equal(g.room.turn, A, 'the Hacker keeps the turn for one more');
  // A Double on that second pick can't add a third: it plays plain and the turn passes.
  const dbl = open(g.room, t => t.sp === 'double');
  g.act(E.picker(g.room), { type: 'pick', c: dbl.c, r: dbl.r });
  assert.equal(g.room.phase, 'ask', 'no Double takeover on a second straight pick');
  g.act(g.room.cur.mid, { type: 'lock', i: dbl.t.ans });
  g.tick(E.REVEAL_MS);
  assert.equal(g.room.turn, 1 - A, 'two in a row, then the turn passes');
  assert.equal(E.view(g.room, 'p0', g.now).streak.max, 2);

  // A Double on a first pick still gives the second.
  const h = game({ players: 2, settings: { ...ALL_ON, hacker: false, take: false } });
  h.setup();
  const B = h.room.turn;
  play(h, open(h.room, t => t.sp === 'double'), true);
  assert.equal(h.room.turn, B, 'the Double keeps the turn');
  play(h, open(h.room, t => !t.sp), true);
  assert.equal(h.room.turn, 1 - B, 'then it passes');
});

test('the play-by-play says right or missed, never both', () => {
  const g = game({ players: 2, settings: { ...ALL_ON, take: false } });
  g.setup();
  for (let i = 0; i < 6 && g.room.phase === 'board'; i++) {
    const before = g.room.feed.length;
    const right = i % 2 === 0;
    play(g, open(g.room), right);
    const lines = g.room.feed.slice(before).map(f => f.text).join(' | ');
    if (right) assert.doesNotMatch(lines, /missed|ran out/, lines);
    else assert.doesNotMatch(lines, /got .* right/, lines);
    assert.doesNotMatch(lines, /-\$-/, lines);
  }
});

test('a Double still gives another pick when it fits under four', () => {
  const g = game({ players: 4, settings: { ...ALL_ON, hacker: false, take: false } });
  g.setup();
  const A = g.room.turn;
  const first = E.picker(g.room);
  const dbl = open(g.room, t => t.sp === 'double');
  play(g, dbl, true);
  assert.equal(g.room.turn, A);
  assert.notEqual(E.picker(g.room), first, 'a crewmate takes the extra pick');
});

test('taking a missed Take tile uses up the taker’s turn', () => {
  const g = game({ players: 4, settings: { ...ALL_ON, hacker: false, doubles: 0 } });
  g.setup();
  const A = g.room.turn, B = 1 - A;
  const tk = open(g.room, t => t.tk);
  g.act(E.picker(g.room), { type: 'pick', c: tk.c, r: tk.r });
  g.act(g.room.cur.mid, { type: 'lock', i: (tk.t.ans + 1) % 4 });
  assert.equal(g.room.cur.crew, B);
  const taker = g.room.cur.mid;
  g.act(taker, { type: 'lock', i: tk.t.ans });
  g.tick(E.REVEAL_MS);
  assert.equal(g.room.turn, B, 'the turn passes as usual');
  assert.notEqual(E.picker(g.room), taker, 'a crewmate of the taker picks next');

  // Over whole games with two players a side, nobody is ever in the hot seat twice in a row.
  for (let seed = 1; seed <= 300; seed++) {
    const h = game({ players: 4, seed });
    h.setup();
    let r = seed, last = null, guard = 0;
    const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    const seen = [];
    while (h.room.phase === 'board' && guard++ < 40) {
      const left = cells(h.room).filter(x => !x.t.res);
      const x = left[Math.floor(rnd() * left.length)];
      const who = E.picker(h.room);
      seen.push(who);
      h.act(who, { type: 'pick', c: x.c, r: x.r });
      if (h.room.phase === 'intro') h.tick(E.INTRO_MS);
      const right = rnd() < 0.6;
      h.act(h.room.cur.mid, { type: 'lock', i: right ? x.t.ans : (x.t.ans + 1) % 4 });
      if (h.room.phase === 'ask' && h.room.cur.take) { seen.push(h.room.cur.mid); h.act(h.room.cur.mid, { type: 'lock', i: rnd() < 0.5 ? x.t.ans : (x.t.ans + 3) % 4 }); }
      h.tick(E.REVEAL_MS);
    }
    for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1], `seed ${seed}: ${seen[i]} was up twice in a row`);
    assert.ok(last === null);
  }
});

/* ---------------- the emoji row (through the API) ---------------- */

function rig(start = Date.parse('2026-11-05T17:00:00Z')) {
  const store = memoryStore();
  let t = start;
  const h = makeHandler(store, { clock: () => t });
  const call = async (method, path, body, who) => {
    const headers = { 'content-type': 'application/json' };
    if (who) headers.authorization = `Bearer ${who.pid}.${who.token}`;
    const res = await h(new Request('https://x.test/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }));
    return { status: res.status, ...(await res.json()) };
  };
  const make = async (name) => { const r = await call('POST', '/me', { name, avatar: '🦊' }); return { pid: r.pid, token: r.token, me: r.me }; };
  return { call, make, tick: (ms) => { t += ms; } };
}

test('emoji row: four picks saved on the profile, defaults for everyone else', async () => {
  assert.deepEqual(emoRow(null), EMO_ROW);
  assert.deepEqual(emoRow(['🫠', '🫠', '🖕', 'lol', '🇧🇷']), ['🫠', '🇧🇷', '🔥', '😂'], 'no repeats, no rude ones, topped up');
  const R = rig();
  const a = await R.make('Ann');
  assert.deepEqual(a.me.emo, EMO_ROW, 'a new profile starts with the defaults');
  const r = await R.call('POST', '/me/update', { emo: ['😭', '🫡', '🤌', '👀'] }, a);
  assert.equal(r.status, 200, r.error);
  assert.deepEqual(r.me.emo, ['😭', '🫡', '🤌', '👀']);
  assert.deepEqual((await R.call('GET', '/me', null, a)).me.emo, ['😭', '🫡', '🤌', '👀'], 'it sticks');
});

test('emoji row: one batch can carry four different emoji, still one batch per 1.5 s', async () => {
  const R = rig();
  const host = await R.make('Host'), p = await R.make('Pat');
  const room = await R.call('POST', '/rooms', { kind: 'invite', deckId: 'office-warm-up' }, host);
  assert.equal(room.status, 200, room.error);
  const code = room.room.code;
  await R.call('POST', `/rooms/${code}/join`, null, p);
  let r = await R.call('POST', `/rooms/${code}/act`, { type: 'react', m: [{ e: '🔥', c: 5 }, { e: '😂', c: 3 }, { e: '🖕', c: 2 }, { e: '💀', c: 40 }, { e: '👏', c: 1 }], id: 'abc.1' }, p);
  assert.equal(r.status, 200, r.error);
  const got = r.room.reactions.map(x => [x.e, x.c, x.id]);
  assert.deepEqual(got, [['🔥', 5, 'abc.1.0'], ['😂', 3, 'abc.1.1'], ['💀', 12, 'abc.1.2']], 'four at most, rude ones dropped, counts capped');
  r = await R.call('POST', `/rooms/${code}/act`, { type: 'react', m: [{ e: '👏', c: 1 }] }, p);
  assert.equal(r.status, 429, 'still one batch per 1.5 s');
  R.tick(1600);
  r = await R.call('POST', `/rooms/${code}/act`, { type: 'react', e: '🫡', c: 2, id: 'abc.2' }, p);
  assert.equal(r.status, 200, 'the one-emoji form still works');
  assert.deepEqual(r.room.reactions.at(-1).id, 'abc.2');
});
