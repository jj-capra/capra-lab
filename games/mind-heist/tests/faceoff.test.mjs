// Face-off rules for joke decks (engine only, no HTTP).   node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/server/engine.mjs';

const cat = (n) => ({ name: 'Cat ' + n, questions: [100, 200, 300, 400].map(v => ({ value: v, q: `Setup ${n}-${v}?`, options: ['Punch A', 'Punch B', 'Punch C', 'Punch D'], answer: 1, fact: 'Bonus: a bonus groan.' })) });
const JOKES = { id: 'jokes-t', title: 'Test Jokes', kind: 'jokes', categories: [cat(1), cat(2), cat(3)] };
const TRIVIA = { id: 'triv-t', title: 'Test Trivia', kind: null, categories: [cat(4), cat(5), cat(6)] };
const lookup = (id) => (id === TRIVIA.id ? TRIVIA : JOKES);

function game({ clock = 30, deck = JOKES } = {}) {
  let now = 1_800_000_000_000;
  const host = { pid: 'H', name: 'Hana', avatar: '🦝' };
  const room = E.newRoom({ kind: 'invite', code: 'JOKE', host, deck, settings: { clock, hacker: true, doubles: 2, take: true }, seed: 42, now });
  for (const [pid, name] of [['A', 'Ann'], ['B', 'Bo'], ['C', 'Cy']]) E.addMember(room, { pid, name }, now);
  const act = (pid, a, at = now) => E.act(room, pid ? { pid } : null, a, at, lookup);
  for (const t of ['start', 'toss', 'draft', 'autoDraft']) act('H', { type: t });
  const g = {
    room, act, lookup,
    get now() { return now; },
    tick(ms) { now += ms; E.settle(room, now); },
    view(pid) { return E.view(room, pid, now); },
    // Pick the first open tile as the crew on the turn, then let the setup intro run out.
    pick() {
      const who = E.picker(room);
      const spot = room.board.flatMap((col, c) => col.tiles.map((t, r) => [c, r, t])).find(x => !x[2].res);
      act(who, { type: 'pick', c: spot[0], r: spot[1] });
      return { who, tile: spot[2] };
    },
    lock(pid, i, after = 0) { now += after; act(pid, { type: 'lock', i }); },
    ans() { return room.board[room.cur.c].tiles[room.cur.r].ans; },
    wrong(n = 1) { return (g.ans() + n) % 4; },
  };
  return g;
}

test('face-off: a joke board has no specials and no take tiles', () => {
  const g = game();
  for (const col of g.room.board) for (const t of col.tiles) { assert.equal(t.sp, null); assert.ok(!t.tk); }
  const t = game({ deck: TRIVIA });
  assert.ok(t.room.board.some(col => col.tiles.some(x => x.sp)), 'a trivia board still gets its specials');
});

test('face-off: setup first, secret picks, fastest right punchline wins and picks next', () => {
  const g = game();
  const from = g.room.turn;
  const { who } = g.pick();
  const d = g.room.cur.duel;
  assert.ok(d, 'every joke tile is a face-off');
  assert.equal(d.mids[from], who);
  const rival = d.mids[1 - from];
  assert.ok(g.room.crews[1 - from].mem.includes(rival));
  // The setup shows on its own; the punchlines come after the intro.
  let v = g.view(rival);
  assert.equal(v.phase, 'intro');
  assert.ok(v.cur.q);
  assert.equal(v.cur.opts, null);
  g.tick(E.DUEL_INTRO_MS);
  assert.equal(g.room.phase, 'ask');
  // Only the two players lock in; teammates can only suggest.
  const mate = g.room.crews[from].mem.find(id => id !== who);
  if (mate) assert.throws(() => g.lock(mate, 0), /face-off/);
  assert.throws(() => g.act(who, { type: 'fifty' }), /Lifelines/);
  assert.throws(() => g.act(who, { type: 'timeout' }), /Lifelines/);
  // Both right: the faster one wins.
  g.lock(rival, g.ans(), 1200);
  v = g.view(who);
  assert.equal(v.cur.duel.locked[1 - from], true);
  assert.equal(v.cur.duel.picks[1 - from], null, 'the other pick stays secret');
  assert.equal(v.cur.ans, undefined);
  assert.throws(() => g.lock(rival, 0), /Already/);
  g.lock(who, g.ans(), 900);
  assert.equal(g.room.phase, 'reveal');
  const cur = g.room.cur;
  assert.equal(cur.duel.winner, 1 - from);
  assert.equal(cur.mid, rival);
  assert.equal(g.room.crews[1 - from].haul, cur.delta);
  assert.equal(g.room.crews[from].haul, 0);
  v = g.view(who);
  assert.deepEqual(v.cur.duel.at.map(x => x != null), [true, true]);
  assert.equal(v.cur.factAt, cur.revealAt + E.DUEL_VERDICT_MS);
  // Only the winner skips the bonus groan.
  assert.throws(() => g.act(who, { type: 'next' }), /can skip/);
  const seats = g.room.crews.map(c => c.seat);
  g.act(rival, { type: 'next' });
  assert.equal(g.room.phase, 'board');
  assert.equal(g.room.turn, 1 - from, 'the winning crew picks next');
  assert.deepEqual(g.room.crews.map(c => c.seat), seats.map(s => s + 1), 'both players step down');
});

test('face-off: a slow right answer beats a fast wrong one', () => {
  const g = game();
  const from = g.room.turn;
  const { who } = g.pick();
  g.tick(E.DUEL_INTRO_MS);
  const rival = g.room.cur.duel.mids[1 - from];
  g.lock(who, g.wrong(), 300);
  g.lock(rival, g.ans(), 9000);
  assert.equal(g.room.cur.duel.winner, 1 - from);
  assert.equal(g.room.cur.right, true);
});

test('face-off: nobody right means a replay, then a blank round from memory', () => {
  const g = game();
  const from = g.room.turn;
  const { who } = g.pick();
  g.tick(E.DUEL_INTRO_MS);
  const rival = g.room.cur.duel.mids[1 - from];
  const w1 = g.wrong(1), w2 = g.wrong(2);
  g.lock(who, w1, 500);
  g.lock(rival, w2, 500);
  assert.equal(g.room.phase, 'ask');
  assert.equal(g.room.cur.duel.stage, 'miss');
  let v = g.view('H');
  assert.deepEqual(v.cur.duel.picks.slice().sort(), [w1, w2].sort(), 'the replay shows both misses');
  assert.equal(v.cur.ans, undefined, 'but not the answer');
  assert.throws(() => g.lock(who, g.ans()), /replay/);
  g.tick(E.DUEL_MISS_MS);
  const d = g.room.cur.duel;
  assert.equal(d.round, 2);
  assert.equal(d.stage, 'pick');
  assert.deepEqual(d.struck.slice().sort(), [w1, w2].sort());
  v = g.view(who);
  assert.ok(v.cur.opts.every(o => o === ''), 'the punchlines go blank');
  assert.ok(v.cur.q, 'the setup stays');
  assert.deepEqual(v.cur.duel.picks, [null, null], 'the picks clear');
  assert.equal(g.room.cur.clock, Math.min(30000, E.DUEL_BLANK_MS));
  assert.throws(() => g.lock(who, w1), /out/);
  g.lock(rival, g.ans(), 2000);
  g.tick(g.room.cur.clock);  // the other player never locks: the clock settles it
  assert.equal(g.room.phase, 'reveal');
  assert.equal(g.room.cur.duel.winner, 1 - from);
  v = g.view(who);
  assert.ok(v.cur.opts.every(o => o), 'the reveal shows the punchlines again');
});

test('face-off: nobody in either round, nobody scores and the turn passes', () => {
  const g = game({ clock: 20 });
  const from = g.room.turn;
  g.pick();
  g.tick(E.DUEL_INTRO_MS);
  g.tick(20000);                       // nobody locks in round one
  assert.equal(g.room.cur.duel.stage, 'miss');
  g.tick(E.DUEL_MISS_MS);
  assert.equal(g.room.cur.duel.round, 2);
  g.tick(15000);                       // nor in the blank round
  assert.equal(g.room.phase, 'reveal');
  assert.equal(g.room.cur.right, false);
  assert.deepEqual(g.room.crews.map(c => c.haul), [0, 0]);
  const tile = g.room.board[g.room.cur.c].tiles[g.room.cur.r];
  assert.equal(tile.res.both, true);
  g.tick(E.DUEL_VERDICT_MS + E.FACT_MS);
  assert.equal(g.room.phase, 'board');
  assert.equal(g.room.turn, 1 - from, 'no winner: the other crew picks next');
});

test('face-off: paused time does not count, and the host locks for a guest', () => {
  const g = game();
  E.addMember(g.room, { name: 'Gus', guest: true }, g.now);
  // Put the guest up for the crew that doesn't pick.
  const from = g.room.turn;
  const other = g.room.crews[1 - from];
  other.mem = ['g1', ...other.mem.filter(id => id !== 'g1')];
  g.room.crews[from].mem = g.room.crews[from].mem.filter(id => id !== 'g1');
  other.seat = 0;
  const { who } = g.pick();
  g.tick(E.DUEL_INTRO_MS);
  assert.equal(g.room.cur.duel.mids[1 - from], 'g1');
  g.act('H', { type: 'pause' });
  g.tick(60000);
  g.act('H', { type: 'resume' });
  g.lock(who, g.ans(), 1500);
  assert.ok(g.room.cur.duel.at[from] < 2000, `paused time is left out (${g.room.cur.duel.at[from]})`);
  g.tick(1000);
  g.act('H', { type: 'lock', i: g.wrong(), crew: 1 - from });
  assert.equal(g.room.cur.duel.winner, from);
});

test('face-off: the host can undo a face-off back to the start of the round', () => {
  const g = game();
  const from = g.room.turn;
  const { who } = g.pick();
  g.tick(E.DUEL_INTRO_MS);
  const rival = g.room.cur.duel.mids[1 - from];
  g.lock(who, g.wrong(), 800);
  g.lock(rival, g.ans(), 400);
  const hauls = g.room.crews.map(c => c.haul);
  assert.equal(g.room.phase, 'reveal');
  g.act('H', { type: 'undo' });
  assert.equal(g.room.phase, 'ask');
  assert.equal(g.room.pause.by, 'host');
  assert.deepEqual(g.room.cur.duel.picks, [null, null]);
  assert.deepEqual(g.room.crews.map(c => c.haul), hauls.map((h, k) => (k === 1 - from ? h - g.room.board[g.room.cur.c].tiles[g.room.cur.r].v : h)));
  g.tick(5000);
  g.act('H', { type: 'resume' });
  g.lock(who, g.ans(), 700);   // 0.7s into the round once it resumes
  g.lock(rival, g.ans(), 300); // 1.0s
  assert.equal(g.room.cur.duel.winner, from, 'this time the picker was faster');
  assert.equal(g.room.cur.duel.at[from], 700, 'the undo pause doesn\'t count');
});

test('face-off: trivia decks play as before, and joke decks are live only (no solo runs)', () => {
  const t = game({ deck: TRIVIA });
  t.pick();
  assert.equal(t.room.cur.duel, undefined);
  const now = 1_800_000_000_000;
  const host = { pid: 'S', name: 'Sol', avatar: '🦉' };
  assert.throws(() => E.newRoom({ kind: 'solo', code: 'SOLO', host, deck: JOKES, seed: 3, now }), /live face-offs/);
  assert.throws(() => E.newRoom({ kind: 'solo', code: 'CHAL', host, deck: JOKES, seed: 3, now, challengeId: 'X' }), /live face-offs/);
  const solo = E.newRoom({ kind: 'solo', code: 'SOL2', host, deck: TRIVIA, seed: 3, now });
  solo.phase = 'final';
  assert.throws(() => E.act(solo, host, { type: 'deck', deckId: JOKES.id }, now, lookup), /live face-offs/);
  for (const kind of ['invite', 'party']) assert.ok(E.newRoom({ kind, code: 'LIVE', host, deck: JOKES, seed: 3, now }));
});
