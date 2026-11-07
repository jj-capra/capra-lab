// Server tests: the real API handler over an in-memory store with ETag checks
// and a controllable clock.   node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler } from '../src/server/api.mjs';
import { memoryStore } from '../src/server/store.mjs';
import * as E from '../src/server/engine.mjs';

function rig(start = Date.parse('2026-11-02T17:00:00Z')) {
  const store = memoryStore();
  let t = start;
  const h = makeHandler(store, { clock: () => t });
  const call = async (method, path, body, who) => {
    const headers = { 'content-type': 'application/json' };
    if (who) headers.authorization = `Bearer ${who.pid}.${who.token}`;
    const res = await h(new Request('https://x.test/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }));
    const data = await res.json();
    return { status: res.status, ...data };
  };
  const make = async (name, avatar = '🦊') => { const r = await call('POST', '/me', { name, avatar }); assert.equal(r.status, 200, r.error); return { pid: r.pid, token: r.token, name }; };
  return { store, call, make, tick: (ms) => { t += ms; }, now: () => t, setNow: (v) => { t = v; } };
}

const act = (R, who, code, a) => R.call('POST', `/rooms/${code}/act`, a, who);
// Skip the fun fact as the player who answered (only they can, in invite games).
const skipFact = async (R, g) => { const v = (await R.call('GET', `/rooms/${g.code}`, null, g.host)).room; return act(R, g.byPid[v.cur.mid] || g.host, g.code, { type: 'next' }); };
const get = (R, who, code) => R.call('GET', `/rooms/${code}`, null, who);
function leakCheck(room, label) {
  // Before a reveal nobody may see the answer or unrevealed specials.
  if (room.cur && room.cur.phase !== 'reveal') assert.equal(room.cur.ans, undefined, label + ': answer leaked');
  for (const col of room.board || []) for (const t of col.tiles) if (!t.taken) assert.equal(t.sp, null, label + ': special leaked');
  assert.equal(JSON.stringify(room).includes('"tokens"'), false, label + ': tokens leaked');
}

test('profiles: create, read, restore with key, bad token', async () => {
  const R = rig();
  const r = await R.call('POST', '/me', { name: 'JC', avatar: '🦝' });
  assert.equal(r.status, 200);
  assert.match(r.me.key, /^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
  const me = await R.call('GET', '/me', null, { pid: r.pid, token: r.token });
  assert.equal(me.me.name, 'JC');
  const bad = await R.call('GET', '/me', null, { pid: r.pid, token: 'f'.repeat(48) });
  assert.equal(bad.status, 401);
  const back = await R.call('POST', '/me/restore', { key: r.me.key.toLowerCase() });
  assert.equal(back.status, 200);
  assert.equal(back.pid, r.pid);
  const again = await R.call('GET', '/me', null, { pid: back.pid, token: back.token });
  assert.equal(again.status, 200);
  assert.equal((await R.call('POST', '/me', { name: 'x' })).status, 400);
});

test('invite game: full flow with every rule', async () => {
  const R = rig();
  const host = await R.make('JC', '🦝');
  const ps = [];
  for (const n of ['Priya', 'Marcus', 'Elena', 'Sam', 'Tom']) ps.push(await R.make(n));
  const all = [host, ...ps];
  const byPid = Object.fromEntries(all.map(p => [p.pid, p]));
  const created = await R.call('POST', '/rooms', { kind: 'invite', settings: { clock: 30, hacker: true, fifty: true, doubles: 1 } }, host);
  assert.equal(created.status, 200, created.error);
  const code = created.code;
  assert.match(code, /^[A-Z0-9]{4}$/);
  for (const p of ps) { const j = await R.call('POST', `/rooms/${code}/join`, null, p); assert.equal(j.status, 200, j.error); }
  // Auto-friending
  const fr = await R.call('GET', '/friends', null, ps[4]);
  assert.equal(fr.friends.length, 5, 'last joiner is friends with everyone');
  const hf = await R.call('GET', '/friends', null, host);
  assert.equal(hf.friends.length, 5);
  // Only the host can start
  assert.equal((await act(R, ps[0], code, { type: 'start' })).status, 403);
  let v = (await act(R, host, code, { type: 'start' })).room;
  assert.equal(v.phase, 'captains');
  assert.equal(v.captains.length, 2);
  v = (await act(R, host, code, { type: 'toss' })).room;
  assert.equal(v.phase, 'toss');
  const toss = v.toss;
  v = (await act(R, host, code, { type: 'draft' })).room;
  assert.equal(v.phase, 'draft');
  assert.equal(v.draft.turn, toss);
  // Wrong captain can't pick
  // (the host may act for anyone, so only check this when the waiting captain isn't the host)
  const wrongCap = byPid[v.captains[1 - toss]];
  if (wrongCap !== host) assert.equal((await act(R, wrongCap, code, { type: 'pickMate', mid: v.draft.pool[0] })).status, 403);
  while (v.phase === 'draft') {
    const cap = byPid[v.crews[v.draft.turn].cap];
    v = (await act(R, cap, code, { type: 'pickMate', mid: v.draft.pool[0] })).room;
  }
  assert.equal(v.phase, 'board');
  assert.equal(v.turn, 1 - toss, 'loser of the toss picks the first tile');
  assert.equal(v.crews[0].mem.length + v.crews[1].mem.length, 6);
  leakCheck(v, 'board');

  // Play the whole board. Track rotation within each crew.
  const seen = [[], []];
  let usedFifty = false, usedTimeout = false, paused = false, gotDouble = false, gotHacker = false;
  let guard = 0;
  while (v.phase !== 'final' && v.phase !== 'sudden' && guard++ < 40) {
    if (v.phase === 'board') {
      const who = byPid[v.picker];
      const k = v.turn;
      const crew = v.crews[k];
      assert.equal(v.picker, crew.mem[crew.seat % crew.mem.length], 'picker follows crew order');
      seen[k].push(v.picker);
      // someone else can't pick
      const other = all.find(p => p.pid !== v.picker && p.pid !== host.pid);
      assert.equal((await act(R, other, code, { type: 'pick', c: 0, r: 0 })).status === 403 || v.board[0].tiles[0].taken, true);
      // Go for the specials first so both get played while they still count.
      const ib = (await R.store.get('r/' + code)).data.board;
      let c = 0, r = 0, found = false;
      for (let cc = 0; cc < 3 && !found; cc++) for (let rr = 0; rr < 4 && !found; rr++) if (!ib[cc].tiles[rr].res && ib[cc].tiles[rr].sp) { c = cc; r = rr; found = true; }
      if (!found) { outer: for (c = 0; c < 3; c++) for (r = 0; r < 4; r++) if (!v.board[c].tiles[r].taken) break outer; }
      v = (await act(R, who, code, { type: 'pick', c, r })).room;
      leakCheck(v, 'after pick');
      if (v.phase === 'intro') {
        assert.equal(v.cur.q, null, 'question hidden during takeover');
        if (v.cur.sp === 'double') gotDouble = true;
        if (v.cur.sp === 'hacker') gotHacker = true;
        R.tick(E.INTRO_MS + 10);
        v = (await get(R, who, code)).room;
      }
      assert.equal(v.phase, 'ask');
      leakCheck(v, 'ask');
      // crewmates suggest, other crew can't see the suggestions
      const mate = v.crews[v.cur.crew].mem.find(id => id !== v.cur.mid);
      if (mate) {
        const s = await act(R, byPid[mate], code, { type: 'suggest', i: 2 });
        assert.equal(s.status, 200, s.error);
        assert.equal(s.room.cur.sug[mate], 2);
        const rival = byPid[v.crews[1 - v.cur.crew].mem[0]];
        const rv = (await get(R, rival, code)).room;
        assert.equal(rv.cur.sug, undefined, 'rival crew cannot see suggestions');
        assert.equal(rv.cur.sugCount, 1);
      }
      if (!usedTimeout) {
        usedTimeout = true;
        R.tick(5000);
        const t = await act(R, who, code, { type: 'timeout' });
        assert.equal(t.status, 200, t.error);
        assert.equal(t.room.pause.by, 'crew');
        assert.equal(t.room.cur.opts, null, 'options hidden during crew timeout');
        assert.ok(Math.abs(t.room.cur.left - 25000) < 50);
        assert.equal((await act(R, who, code, { type: 'timeout' })).status, 400, 'one timeout per crew');
        R.tick(31000);
        const after = (await get(R, who, code)).room;
        assert.equal(after.pause, null, 'crew timeout ends on its own');
        assert.ok(after.cur.opts && after.cur.opts.length === 4);
        assert.ok(Math.abs(after.cur.deadline - R.now() - 24000) < 1500);
        v = after;
      }
      if (!paused && usedTimeout && v.cur.crew !== (v.crews.findIndex(x => x.tout))) {
        paused = true;
        const p1 = await act(R, host, code, { type: 'pause' });
        assert.equal(p1.room.pause.by, 'host');
        const left = p1.room.cur.left;
        R.tick(60000);
        const add = await act(R, host, code, { type: 'addTime' });
        assert.equal(add.room.cur.left, left + E.ADD_MS);
        if (who !== host) assert.equal((await act(R, who, code, { type: 'lock', i: 0 })).status, 409, 'cannot lock while host paused');
        v = (await act(R, host, code, { type: 'resume' })).room;
        assert.equal(v.pause, null);
      }
      if (!usedFifty) {
        usedFifty = true;
        const f = await act(R, who, code, { type: 'fifty' });
        assert.equal(f.status, 200, f.error);
        assert.equal(f.room.cur.removed.length, 2);
        v = f.room;
      }
      // Answer: right on even tiles taken so far, wrong on odd; never pick a removed option.
      const internal = (await R.store.get('r/' + code)).data;
      const tile = internal.board[v.cur.c].tiles[v.cur.r];
      const takenSoFar = v.board.flat().length;
      const n = internal.board.reduce((a, col) => a + col.tiles.filter(t => t.res).length, 0);
      const sp = tile.off ? null : tile.sp;
      const wantRight = sp ? true : n % 3 !== 1;
      let i = wantRight ? tile.ans : [0, 1, 2, 3].find(x => x !== tile.ans && !(v.cur.removed || []).includes(x));
      const before = v.crews.map(c => c.haul);
      const heat = v.crews[v.cur.crew].heat;
      const lk = await act(R, who, code, { type: 'lock', i });
      assert.equal(lk.status, 200, lk.error);
      v = lk.room;
      assert.equal(v.phase, 'reveal');
      assert.equal(v.cur.ans, tile.ans);
      let expect = wantRight ? tile.v * (sp === 'hacker' ? 2 : 1) + (heat >= 2 ? E.HEAT_BONUS : 0) : 0;
      assert.equal(v.crews[v.cur.crew].haul - before[v.cur.crew], expect, 'payout');
      const crewBefore = v.cur.crew;
      const wasDoubleRight = sp === 'double' && wantRight;
      const run = (await R.store.get('r/' + code)).data.run;
      const inRun = !!(run && run.crew === crewBefore && run.left > 0);
      R.tick(E.REVEAL_MS + 10);
      v = (await get(R, who, code)).room;
      if (v.phase === 'board') assert.equal(v.turn, wasDoubleRight || inRun ? crewBefore : 1 - crewBefore, 'Double and Hacker runs keep the turn');
    }
  }
  // A Double picked inside a Hacker run can't add a pick (four in a row at most), so it plays plain.
  const dbl = (await R.store.get('r/' + code)).data.board.flatMap(c => c.tiles).find(t => t.sp === 'double');
  assert.ok(gotHacker && (gotDouble || (dbl && dbl.off)), 'board had a Double and a Hacker tile');
  assert.ok(paused && usedFifty && usedTimeout, 'pause, 50/50 and timeout branches all ran');
  assert.equal(v.board.flatMap(c => c.tiles).filter(t => t.taken).length, 12, 'all 12 tiles played');
  for (const k of [0, 1]) {
    const crew = v.crews[k];
    // Everyone in a crew got a turn before anyone went twice.
    const first = seen[k].slice(0, crew.mem.length);
    assert.equal(new Set(first).size, Math.min(first.length, crew.mem.length), 'rotation covers the crew');
  }
  if (v.phase === 'sudden') {
    const sd = v.sudden;
    for (const k of [0, 1]) {
      const cap = byPid[v.crews[k].cap];
      const internal = (await R.store.get('r/' + code)).data;
      const r = await act(R, cap, code, { type: 'sdLock', i: k === 0 ? internal.sudden.ans : (internal.sudden.ans + 1) % 4 });
      assert.equal(r.status, 200, r.error);
      v = r.room;
    }
    assert.equal(v.sudden.revealed, true);
    R.tick(E.SD_REVEAL_MS + 10);
    v = (await get(R, host, code)).room;
  }
  assert.equal(v.phase, 'final');
  assert.ok(v.results, 'results banked');
  const winner = v.winner;
  for (const p of all) {
    const res = v.results[p.pid];
    assert.ok(res, 'result for ' + p.name);
    assert.equal(res.streak, 1);
    assert.ok(res.badges.includes('first_heist'));
  }
  const me = await R.call('GET', '/me', null, ps[0]);
  assert.equal(me.me.games, 1);
  assert.ok(me.me.recent.length === 1);
  // Banked once only
  await get(R, host, code); await get(R, host, code);
  assert.equal((await R.call('GET', '/me', null, ps[0])).me.games, 1, 'no double banking');
  assert.ok(winner === 0 || winner === 1 || winner === -1);
  // Rematch keeps crews
  const rm = await act(R, host, code, { type: 'rematch' });
  assert.equal(rm.status, 200, rm.error);
  assert.equal(rm.room.phase, 'toss');
  const go = await act(R, host, code, { type: 'draft' });
  assert.equal(go.room.phase, 'board');
  assert.equal(go.room.crews[0].haul, 0);
});

test('timer runs out: miss, hacker costs money, undo restores the question', async () => {
  const R = rig();
  const host = await R.make('Host');
  const a = await R.make('Ann');
  const { code } = await R.call('POST', '/rooms', { kind: 'invite', settings: { clock: 20 } }, host);
  await R.call('POST', `/rooms/${code}/join`, null, a);
  await act(R, host, code, { type: 'start' });
  await act(R, host, code, { type: 'toss' });
  let v = (await act(R, host, code, { type: 'draft' })).room;
  assert.equal(v.phase, 'board', 'two players skip the draft');
  const pmap = { [host.pid]: host, [a.pid]: a };
  // find a hacker tile from the inside
  const internal = (await R.store.get('r/' + code)).data;
  let hc = null;
  internal.board.forEach((col, c) => col.tiles.forEach((t, r) => { if (t.sp === 'hacker' && !hc) hc = { c, r, v: t.v }; }));
  assert.ok(hc);
  const who = pmap[v.picker];
  v = (await act(R, who, code, { type: 'pick', ...hc })).room;
  assert.equal(v.phase, 'intro');
  R.tick(E.INTRO_MS + 1);
  v = (await get(R, who, code)).room;
  assert.equal(v.phase, 'ask');
  R.tick(20001);
  v = (await get(R, who, code)).room;
  assert.equal(v.phase, 'reveal');
  assert.equal(v.cur.picked, null);
  assert.equal(v.crews[v.cur.crew].haul, -hc.v, 'Hacker fail costs the tile value');
  const u = await act(R, host, code, { type: 'undo' });
  assert.equal(u.status, 200, u.error);
  assert.equal(u.room.phase, 'ask');
  assert.equal(u.room.pause.by, 'host');
  assert.equal(u.room.crews[u.room.cur.crew].haul, 0);
  assert.equal(u.room.cur.left, 0);
  const add = await act(R, host, code, { type: 'addTime' });
  assert.equal(add.room.cur.left, 10000);
  const res = await act(R, host, code, { type: 'resume' });
  assert.ok(res.room.cur.deadline > R.now());
});

test('party mode: host acts for guests', async () => {
  const R = rig();
  const host = await R.make('Host');
  const { code } = await R.call('POST', '/rooms', { kind: 'party' }, host);
  for (const n of ['Ana', 'Ben', 'Cy', 'Di']) assert.equal((await act(R, host, code, { type: 'addGuest', name: n })).status, 200);
  assert.equal((await act(R, host, code, { type: 'addGuest', name: 'ana' })).status, 400, 'duplicate names blocked');
  const j = await R.call('POST', `/rooms/${code}/join`, null, await R.make('Rando'));
  assert.equal(j.status, 403, 'party rooms do not take joiners');
  await act(R, host, code, { type: 'start' });
  await act(R, host, code, { type: 'toss' });
  let v = (await act(R, host, code, { type: 'draft' })).room;
  v = (await act(R, host, code, { type: 'autoDraft' })).room;
  assert.equal(v.phase, 'board');
  for (let i = 0; i < 12; i++) {
    let c, r; outer: for (c = 0; c < 3; c++) for (r = 0; r < 4; r++) if (!v.board[c].tiles[r].taken) break outer;
    v = (await act(R, host, code, { type: 'pick', c, r })).room;
    if (v.phase === 'intro') v = (await act(R, host, code, { type: 'next' })).room;
    v = (await act(R, host, code, { type: 'lock', i: i % 4 })).room;
    assert.equal(v.cur.nextAt, null, 'party reveals wait for the host');
    v = (await act(R, host, code, { type: 'next' })).room;
  }
  if (v.phase === 'sudden') {
    v = (await act(R, host, code, { type: 'sdLock', crew: 0, i: 0 })).room;
    v = (await act(R, host, code, { type: 'sdLock', crew: 1, i: 1 })).room;
    v = (await act(R, host, code, { type: 'sdNext' })).room;
    while (v.phase === 'sudden') { v = (await act(R, host, code, { type: 'sdLock', crew: 0, i: 0 })).room; v = (await act(R, host, code, { type: 'sdLock', crew: 1, i: 1 })).room; v = (await act(R, host, code, { type: 'sdNext' })).room; }
  }
  assert.equal(v.phase, 'final');
  assert.deepEqual(Object.keys(v.results || {}), [], 'guests have no profiles to bank');
});

test('solo daily: official once per day, streaks, challenge head to head', async () => {
  const R = rig(Date.parse('2026-11-02T17:00:00Z'));
  const jc = await R.make('JC');
  const pal = await R.make('Pal');
  const playRun = async (who, code, rightAll) => {
    let v = (await get(R, who, code)).room;
    for (let n = 0; n < 12; n++) {
      let c, r; outer: for (c = 0; c < 3; c++) for (r = 0; r < 4; r++) if (!v.board[c].tiles[r].taken) break outer;
      v = (await act(R, who, code, { type: 'pick', c, r })).room;
      if (v.phase === 'intro') { R.tick(E.INTRO_MS + 1); v = (await get(R, who, code)).room; }
      const t = (await R.store.get('r/' + code)).data.board[c].tiles[r];
      v = (await act(R, who, code, { type: 'lock', i: rightAll ? t.ans : (t.ans + 1) % 4 })).room;
      v = (await act(R, who, code, { type: 'next' })).room;
    }
    return v;
  };
  const home = await R.call('GET', '/home', null, jc);
  const runA = await R.call('POST', '/rooms', { kind: 'solo', deckId: home.today.id }, jc);
  assert.equal(runA.room.phase, 'board');
  let v = await playRun(jc, runA.code, true);
  assert.equal(v.phase, 'final');
  assert.equal(v.results[jc.pid].official, true);
  assert.ok(v.results[jc.pid].badges.includes('flawless'));
  const score = v.crews[0].haul;
  // second run of the same drop the same day is practice
  const runB = await R.call('POST', '/rooms', { kind: 'solo', deckId: home.today.id }, jc);
  v = await playRun(jc, runB.code, false);
  assert.equal(v.results[jc.pid].official, false);
  assert.equal((await R.call('GET', '/me', null, jc)).me.today.score, score, 'daily score keeps the official run');
  // Challenge from the first run
  const ch = await R.call('POST', '/challenges', { code: runA.code }, jc);
  assert.equal(ch.status, 200, ch.error);
  const info = await R.call('GET', `/challenges/${ch.id}`, null, pal);
  assert.equal(info.by.score, score);
  assert.equal((await R.call('POST', `/challenges/${ch.id}/play`, null, jc)).status, 400, 'cannot take your own challenge');
  const play = await R.call('POST', `/challenges/${ch.id}/play`, null, pal);
  assert.equal(play.status, 200, play.error);
  // Same board as the challenger's run
  const a = (await R.store.get('r/' + runA.code)).data.board, b = (await R.store.get('r/' + play.code)).data.board;
  assert.deepEqual(b.map(c => c.tiles.map(t => [t.q, t.opts, t.sp])), a.map(c => c.tiles.map(t => [t.q, t.opts, t.sp])));
  v = await playRun(pal, play.code, false);
  assert.equal(v.results[pal.pid].challenge.outcome, 'l');
  assert.equal(v.results[pal.pid].official, false, 'challenge runs are not the daily');
  const pf = await R.call('GET', '/friends', null, pal);
  assert.equal(pf.friends[0].pid, jc.pid, 'challenges make friends');
  assert.deepEqual(pf.friends[0].vsYou, [1, 0, 0], 'JC is 1-0 against Pal');
  // Streak: next day +1, skip a day resets
  R.tick(24 * 3600e3);
  const run2 = await R.call('POST', '/rooms', { kind: 'solo' }, jc);
  v = await playRun(jc, run2.code, true);
  assert.equal(v.results[jc.pid].streak, 2);
  R.tick(3 * 24 * 3600e3);
  const run3 = await R.call('POST', '/rooms', { kind: 'solo' }, jc);
  v = await playRun(jc, run3.code, true);
  assert.equal(v.results[jc.pid].streak, 1, 'missed days reset the streak');
});

test('concurrent writes are not lost', async () => {
  const R = rig();
  const host = await R.make('Host');
  const ps = await Promise.all(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(n => R.make(n + n)));
  const { code } = await R.call('POST', '/rooms', { kind: 'invite' }, host);
  const joins = await Promise.all(ps.map(p => R.call('POST', `/rooms/${code}/join`, null, p)));
  joins.forEach(j => assert.equal(j.status, 200, j.error));
  const v = (await get(R, host, code)).room;
  assert.equal(v.members.length, 9, 'all simultaneous joins landed');
});

test('tv view and missing rooms', async () => {
  const R = rig();
  const host = await R.make('Host');
  const { code } = await R.call('POST', '/rooms', { kind: 'invite' }, host);
  const tv = await R.call('GET', `/rooms/${code}?tv=1`);
  assert.equal(tv.status, 200);
  assert.equal(tv.room.host, false);
  assert.equal((await R.call('GET', '/rooms/ZZZZ')).status, 404);
  const same = await R.call('GET', `/rooms/${code}?v=${tv.room.v}`);
  assert.equal(same.same, true);
});

test('looks: profile theme, room theme from the host, host can switch it any time', async () => {
  const R = rig();
  const host = await R.make('JC', '🦝');
  const pal = await R.make('Priya');
  // Profiles start on the Heist look and can change it; junk values fall back.
  assert.equal((await R.call('GET', '/me', null, host)).me.theme, 'heist');
  assert.equal((await R.call('POST', '/me/update', { theme: 'office' }, host)).me.theme, 'office');
  assert.equal((await R.call('POST', '/me/update', { theme: 'disco' }, pal)).me.theme, 'heist');
  await R.call('POST', '/me/update', { theme: 'bar' }, pal);
  // A new room takes the host's look unless the host picks one.
  const a = await R.call('POST', '/rooms', { kind: 'invite' }, host);
  assert.equal(a.room.settings.theme, 'office');
  const b = await R.call('POST', '/rooms', { kind: 'party', settings: { theme: 'bar' } }, host);
  assert.equal(b.room.settings.theme, 'bar');
  // Everyone in the room sees the host's look, not their own.
  await R.call('POST', `/rooms/${a.code}/join`, null, pal);
  assert.equal((await get(R, pal, a.code)).room.settings.theme, 'office');
  // Only the host can switch it, and it works mid-game too.
  assert.equal((await act(R, pal, a.code, { type: 'theme', theme: 'bar' })).status, 403);
  assert.equal((await act(R, host, a.code, { type: 'settings', theme: 'bar' })).room.settings.theme, 'bar');
  await act(R, host, a.code, { type: 'start' });
  const mid = await act(R, host, a.code, { type: 'theme', theme: 'heist' });
  assert.equal(mid.status, 200, mid.error);
  assert.equal(mid.room.settings.theme, 'heist');
  assert.equal((await act(R, host, a.code, { type: 'theme', theme: 'disco' })).status, 400);
  // A challenge taker plays the same board in their own look.
  const solo = await R.call('POST', '/rooms', { kind: 'solo' }, host);
  assert.equal(solo.room.settings.theme, 'office');
  let v = solo.room;
  for (let n = 0; n < 12 && v.phase !== 'final'; n++) {
    const col = v.board.findIndex(c => c.tiles.some(t => !t.taken));
    const row = v.board[col].tiles.findIndex(t => !t.taken);
    v = (await act(R, host, solo.code, { type: 'pick', c: col, r: row })).room;
    if (v.phase === 'intro') { R.tick(E.INTRO_MS + 10); v = (await get(R, host, solo.code)).room; }
    v = (await act(R, host, solo.code, { type: 'lock', i: 0 })).room;
    if (v.phase === 'reveal') v = (await act(R, host, solo.code, { type: 'next' })).room;
  }
  assert.equal(v.phase, 'final');
  const ch = await R.call('POST', '/challenges', { code: solo.code }, host);
  assert.equal(ch.status, 200, ch.error);
  const run = await R.call('POST', `/challenges/${ch.id}/play`, null, pal);
  assert.equal(run.status, 200, run.error);
  assert.equal((await get(R, pal, run.code)).room.settings.theme, 'bar');
});

// Two crews of two, straight to the board. Returns helpers that read the server's own copy.
async function crewGame(R, settings) {
  const host = await R.make('Host');
  const ps = [host];
  for (const n of ['Ann', 'Bo', 'Cy']) ps.push(await R.make(n));
  const byPid = Object.fromEntries(ps.map(p => [p.pid, p]));
  const { code } = await R.call('POST', '/rooms', { kind: 'invite', settings }, host);
  for (const p of ps.slice(1)) await R.call('POST', `/rooms/${code}/join`, null, p);
  await act(R, host, code, { type: 'start' });
  await act(R, host, code, { type: 'toss' });
  await act(R, host, code, { type: 'draft' });
  const v = (await act(R, host, code, { type: 'autoDraft' })).room;
  assert.equal(v.phase, 'board');
  const inside = async () => (await R.store.get('r/' + code)).data;
  const setInside = async (fn) => { const e = await R.store.get('r/' + code); fn(e.data); await R.store.set('r/' + code, e.data); };
  return { host, ps, byPid, code, inside, setInside };
}

test('Take mode: six visible Take tiles; a miss hands the other crew one shot', async () => {
  const R = rig();
  const g = await crewGame(R, { take: true, clock: 30 });
  let v = (await get(R, g.host, g.code)).room;
  const tk = v.board.flatMap((col, c) => col.tiles.map((t, r) => ({ ...t, c, r }))).filter(t => t.tk);
  assert.equal(tk.length, E.TAKE_TILES, 'half the board is Take tiles');
  const ib = (await g.inside()).board;
  for (const t of tk) assert.equal(ib[t.c].tiles[t.r].sp, null, 'Take tiles are never specials');
  assert.deepEqual([0, 1, 2].map(c => tk.filter(t => t.c === c).length), [2, 2, 2], 'two per category');

  // The crew up misses a Take tile.
  const A = v.turn, B = 1 - A;
  const t0 = tk[0];
  const pickerA = g.byPid[v.picker];
  v = (await act(R, pickerA, g.code, { type: 'pick', c: t0.c, r: t0.r })).room;
  assert.equal(v.phase, 'ask');
  assert.equal(v.cur.tk, true);
  const ans = ib[t0.c].tiles[t0.r].ans;
  const wrong = (ans + 1) % 4;
  let lk = await act(R, pickerA, g.code, { type: 'lock', i: wrong });
  assert.equal(lk.status, 200, lk.error);
  v = lk.room;
  assert.equal(v.phase, 'ask', 'still asking: the other crew gets a shot');
  assert.equal(v.cur.crew, B);
  assert.equal(v.cur.take.from, A);
  assert.equal(v.cur.take.missed, wrong);
  assert.equal(v.cur.ans, undefined, 'the answer stays hidden during the take');
  assert.equal(v.crews[A].haul, 0, 'a plain miss costs nothing');
  const taker = g.byPid[v.cur.mid];
  assert.ok(v.crews[B].mem.includes(taker.pid), 'the other crew answers');
  // Only the taker locks; no lifelines on a take; the missed option can be retried? No: it's out.
  const rivalA = v.crews[A].mem.map(id => g.byPid[id]).find(p => p !== g.host); // the host may act for anyone
  assert.equal((await act(R, rivalA, g.code, { type: 'lock', i: ans })).status, 403, 'the crew that missed cannot answer the take');
  assert.equal((await act(R, taker, g.code, { type: 'fifty' })).status, 400);
  assert.equal((await act(R, taker, g.code, { type: 'timeout' })).status, 400);
  lk = await act(R, taker, g.code, { type: 'lock', i: ans });
  v = lk.room;
  assert.equal(v.phase, 'reveal');
  assert.equal(v.cur.right, true);
  assert.equal(v.crews[B].haul, ib[t0.c].tiles[t0.r].v, 'the take pays the tile value');
  v = (await skipFact(R, g)).room;
  assert.equal(v.board[t0.c].tiles[t0.r].res.take, true);
  assert.equal(v.board[t0.c].tiles[t0.r].res.crew, B);
  assert.equal(v.turn, B, 'turn passes as usual after a take');

  // Time runs out on a Take tile, then the take also runs out: nobody scores.
  const t1 = tk[1];
  const pickerB = g.byPid[v.picker];
  v = (await act(R, pickerB, g.code, { type: 'pick', c: t1.c, r: t1.r })).room;
  R.tick(30001);
  v = (await get(R, g.host, g.code)).room;
  assert.equal(v.phase, 'ask');
  assert.equal(v.cur.crew, A, 'running out of time hands it over too');
  assert.equal(v.cur.take.missed, null);
  R.tick(30001);
  v = (await get(R, g.host, g.code)).room;
  assert.equal(v.phase, 'reveal');
  assert.equal(v.cur.right, false);
  const hauls = v.crews.map(c => c.haul);
  v = (await skipFact(R, g)).room;
  assert.equal(v.board[t1.c].tiles[t1.r].res.both, true);
  assert.deepEqual(v.crews.map(c => c.haul), hauls);
  assert.equal(v.turn, A);

  // Undo during a take goes back to the take, paused.
  const t2 = tk[2];
  v = (await act(R, g.byPid[v.picker], g.code, { type: 'pick', c: t2.c, r: t2.r })).room;
  const ans2 = (await g.inside()).board[t2.c].tiles[t2.r].ans;
  v = (await act(R, g.byPid[v.cur.mid], g.code, { type: 'lock', i: (ans2 + 1) % 4 })).room;
  v = (await act(R, g.byPid[v.cur.mid], g.code, { type: 'lock', i: (ans2 + 2) % 4 })).room;
  assert.equal(v.phase, 'reveal');
  const u = await act(R, g.host, g.code, { type: 'undo' });
  assert.equal(u.room.phase, 'ask');
  assert.ok(u.room.cur.take, 'undo lands back on the take');

  // Take mode off: no Take tiles.
  const R2 = rig();
  const g2 = await crewGame(R2, { take: false });
  assert.equal((await get(R2, g2.host, g2.code)).room.board.flatMap(c => c.tiles).filter(t => t.tk).length, 0);
});

test('Hacker: one tile; beat it and your crew picks the next three', async () => {
  const R = rig();
  const g = await crewGame(R, { hacker: true, doubles: 0 });
  const ib = (await g.inside()).board;
  const hackers = ib.flatMap((col, c) => col.tiles.map((t, r) => ({ ...t, c, r }))).filter(t => t.sp === 'hacker');
  assert.equal(hackers.length, 1, 'only one Hacker tile');
  let v = (await get(R, g.host, g.code)).room;
  const A = v.turn;
  const h = hackers[0];
  v = (await act(R, g.byPid[v.picker], g.code, { type: 'pick', c: h.c, r: h.r })).room;
  assert.equal(v.phase, 'intro');
  R.tick(E.INTRO_MS + 1);
  v = (await get(R, g.host, g.code)).room;
  v = (await act(R, g.byPid[v.cur.mid], g.code, { type: 'lock', i: h.ans })).room;
  assert.equal(v.crews[A].haul, h.v * 2, 'still pays double');
  v = (await skipFact(R, g)).room;
  assert.deepEqual(v.run, { crew: A, left: 3 });
  const pickers = [];
  for (let n = 0; n < 3; n++) {
    assert.equal(v.turn, A, `run pick ${n + 1} stays with the crew`);
    pickers.push(v.picker);
    const ib2 = (await g.inside()).board;
    let c, r; outer: for (c = 0; c < 3; c++) for (r = 0; r < 4; r++) if (!ib2[c].tiles[r].res) break outer;
    v = (await act(R, g.byPid[v.picker], g.code, { type: 'pick', c, r })).room;
    v = (await act(R, g.byPid[v.cur.mid], g.code, { type: 'lock', i: (ib2[c].tiles[r].ans + 1) % 4 })).room;
    v = (await skipFact(R, g)).room;
  }
  assert.equal(v.turn, 1 - A, 'after three picks the turn passes');
  assert.equal(v.run, null);
  assert.notEqual(pickers[0], pickers[1], 'run picks still rotate through the crew');
});

test('Specials only show up while there are enough tiles left to use them', async () => {
  const R = rig();
  const g = await crewGame(R, { hacker: true, doubles: 1 });
  // Clear the board down to three tiles: the Double, the Hacker and one plain tile.
  await g.setInside((room) => {
    const cells = room.board.flatMap((col, c) => col.tiles.map((t, r) => ({ t, c, r })));
    const keep = [cells.find(x => x.t.sp === 'double'), cells.find(x => x.t.sp === 'hacker'), cells.find(x => !x.t.sp)];
    for (const x of cells) if (!keep.includes(x)) x.t.res = { crew: 0, mid: room.crews[0].cap, right: false, picked: 0, delta: 0, at: 0 };
  });
  let v = (await get(R, g.host, g.code)).room;
  assert.equal(v.board.flatMap(c => c.tiles).filter(t => !t.taken).length, 3);
  const ib = (await g.inside()).board;
  const find = (sp) => { for (let c = 0; c < 3; c++) for (let r = 0; r < 4; r++) if (ib[c].tiles[r].sp === sp && !ib[c].tiles[r].res) return { c, r }; };
  // 3 left: the Hacker (needs 4) stays plain.
  const hk = find('hacker');
  v = (await act(R, g.byPid[v.picker], g.code, { type: 'pick', ...hk })).room;
  assert.equal(v.phase, 'ask', 'no Hacker takeover with three tiles left');
  assert.equal(v.cur.sp, null);
  v = (await act(R, g.byPid[v.cur.mid], g.code, { type: 'lock', i: ib[hk.c].tiles[hk.r].ans })).room;
  assert.equal(v.cur.delta, ib[hk.c].tiles[hk.r].v, 'pays as a plain tile');
  v = (await skipFact(R, g)).room;
  assert.equal(v.board[hk.c].tiles[hk.r].sp, null, 'never shows as a Hacker');
  // 2 left: the Double (needs 3) stays plain too.
  const db = find('double');
  v = (await act(R, g.byPid[v.picker], g.code, { type: 'pick', ...db })).room;
  assert.equal(v.phase, 'ask', 'no Double with two tiles left');
  assert.equal(v.cur.sp, null);

  // With three left the Double still shows up.
  const R2 = rig();
  const g2 = await crewGame(R2, { hacker: false, doubles: 1 });
  await g2.setInside((room) => {
    const cells = room.board.flatMap((col, c) => col.tiles.map((t, r) => ({ t, c, r })));
    const d = cells.find(x => x.t.sp === 'double');
    const plain = cells.filter(x => !x.t.sp).slice(0, 2);
    for (const x of cells) if (x !== d && !plain.includes(x)) x.t.res = { crew: 0, mid: room.crews[0].cap, right: false, picked: 0, delta: 0, at: 0 };
  });
  const ib2 = (await g2.inside()).board;
  let d2; for (let c = 0; c < 3; c++) for (let r = 0; r < 4; r++) if (ib2[c].tiles[r].sp === 'double') d2 = { c, r };
  let v2 = (await get(R2, g2.host, g2.code)).room;
  v2 = (await act(R2, g2.byPid[v2.picker], g2.code, { type: 'pick', ...d2 })).room;
  assert.equal(v2.phase, 'intro', 'the Double shows up with three tiles left');
});

test('direct links: tabs announce themselves and swap offers through a private mailbox', async () => {
  const R = rig();
  const host = await R.make('Host');
  const ann = await R.make('Ann');
  const eve = await R.make('Eve');
  const { code } = await R.call('POST', '/rooms', { kind: 'invite' }, host);
  await R.call('POST', `/rooms/${code}/join`, null, ann);
  const hId = host.pid + '.abc123', aId = ann.pid + '.def456';
  // You can only announce your own tab, and only in a room you're in.
  assert.equal((await R.call('POST', `/rooms/${code}/peer`, { id: ann.pid + '.zzz999' }, host)).status, 403);
  assert.equal((await R.call('POST', `/rooms/${code}/peer`, { id: eve.pid + '.qqq111' }, eve)).status, 403, 'not in the room');
  let r = await R.call('POST', `/rooms/${code}/peer`, { id: hId }, host);
  assert.equal(r.status, 200, r.error);
  r = await R.call('POST', `/rooms/${code}/peer`, { id: aId }, ann);
  assert.deepEqual(r.room.peers.map(p => p.id).sort(), [aId, hId].sort());
  const v = r.room.v;
  // Announcing again changes nothing (no version bump, no extra refetches).
  r = await R.call('POST', `/rooms/${code}/peer`, { id: aId }, ann);
  assert.equal(r.room.v, v);
  // A reload replaces the old tab.
  const aId2 = ann.pid + '.ghi789';
  r = await R.call('POST', `/rooms/${code}/peer`, { id: aId2 }, ann);
  assert.deepEqual(r.room.peers.map(p => p.id).sort(), [aId2, hId].sort());
  // Strangers see no tabs.
  assert.deepEqual((await R.call('GET', `/rooms/${code}`, null, eve)).room.peers, []);
  // Mailbox: only to and from tabs in the room; only the owner reads it.
  assert.equal((await R.call('POST', `/rooms/${code}/sig`, { from: hId, to: aId, d: { t: 'offer', sdp: 'v=0' } }, host)).status, 409, 'old tab is gone');
  r = await R.call('POST', `/rooms/${code}/sig`, { from: hId, to: aId2, d: { t: 'offer', sdp: 'v=0 offer' } }, host);
  assert.equal(r.status, 200, r.error);
  assert.equal((await R.call('POST', `/rooms/${code}/sig`, { from: aId2, to: hId, d: { t: 'offer', sdp: 'x' } }, host)).status, 403, 'cannot send as someone else');
  assert.equal((await R.call('GET', `/rooms/${code}/sig?peer=${aId2}`, null, host)).status, 403, 'cannot read someone else’s mail');
  let box = await R.call('GET', `/rooms/${code}/sig?peer=${aId2}&since=0`, null, ann);
  assert.equal(box.msgs.length, 1);
  assert.equal(box.msgs[0].from, hId);
  assert.equal(box.msgs[0].d.sdp, 'v=0 offer');
  box = await R.call('GET', `/rooms/${code}/sig?peer=${aId2}&since=${box.seq}`, null, ann);
  assert.equal(box.msgs.length, 0, 'since skips what you already read');
  // Messages age out after two minutes.
  await R.call('POST', `/rooms/${code}/sig`, { from: aId2, to: hId, d: { t: 'answer', sdp: 'v=0 answer' } }, ann);
  R.tick(121000);
  assert.equal((await R.call('GET', `/rooms/${code}/sig?peer=${hId}&since=0`, null, host)).msgs.length, 0);
  // Leaving removes the tab.
  r = await R.call('POST', `/rooms/${code}/peer`, { id: aId2, gone: true }, ann);
  assert.deepEqual(r.room.peers.map(p => p.id), [hId]);
  // Party rooms don't use links.
  const party = await R.call('POST', '/rooms', { kind: 'party' }, host);
  assert.equal((await R.call('POST', `/rooms/${party.code}/peer`, { id: hId }, host)).status, 400);
});

test('Open mic: host switch for invite games, off by default', async () => {
  const R = rig();
  const host = await R.make('Host');
  const ann = await R.make('Ann');
  const { code, room } = await R.call('POST', '/rooms', { kind: 'invite' }, host);
  assert.equal(room.settings.mic, false, 'off by default');
  await R.call('POST', `/rooms/${code}/join`, null, ann);
  assert.equal((await act(R, ann, code, { type: 'mic', on: true })).status, 403, 'only the host');
  assert.equal((await act(R, host, code, { type: 'mic', on: true })).room.settings.mic, true);
  await act(R, host, code, { type: 'start' });
  assert.equal((await act(R, host, code, { type: 'mic', on: false })).room.settings.mic, false, 'can switch mid-game');
  const party = await R.call('POST', '/rooms', { kind: 'party', settings: { mic: true } }, host);
  assert.equal(party.room.settings.mic, false, 'not for one-screen games');
  assert.equal((await act(R, host, party.code, { type: 'mic', on: true })).status, 400);
});

/* ---------- Vault Jam, diamonds, the daily draw and power cards ---------- */
import { solve, replay } from '../src/shared/jam.mjs';
import * as J from '../src/server/jam.mjs';

const setProfile = async (R, who, fn) => { const e = await R.store.get('p/' + who.pid); fn(e.data); await R.store.set('p/' + who.pid, e.data); };

test('Vault Jam: hidden until opened, server-timed, diamonds, top five, trophy', async () => {
  const R = rig(Date.parse('2026-11-03T18:00:00Z'));
  const a = await R.make('Ann'), b = await R.make('Bo'), c = await R.make('Cy'), d = await R.make('Di');
  // Ann and Bo are friends; Cy and Di are strangers to Ann.
  await setProfile(R, a, p => { p.friends = [b.pid]; });
  await setProfile(R, b, p => { p.friends = [a.pid]; });
  let j = await R.call('GET', '/jam', null, a);
  assert.equal(j.status, 200, j.error);
  assert.equal(j.jam.board, null, 'the board stays hidden until you open the vault');
  assert.equal(j.jam.day, 'Tuesday');
  const t = J.daily('2026-11-03');
  assert.equal(j.jam.par, t.par);
  assert.ok(t.par >= 8 && t.par <= 10, 'Tuesday is a Tuesday-sized puzzle');
  const o = await R.call('POST', '/jam/open', null, a);
  assert.equal(o.jam.board, t.board);
  const best = solve(t.board);
  assert.equal(best.par, t.par);
  assert.equal((await R.call('POST', '/jam/solve', { moves: best.path.slice(0, -1) }, a)).status, 400, 'not out yet');
  assert.equal((await R.call('POST', '/jam/solve', { moves: [['A', 9]] }, a)).status, 400, 'illegal slide');
  assert.equal((await R.call('POST', '/jam/solve', { moves: best.path }, c)).status, 409, 'open first');
  R.tick(41000);
  let s = await R.call('POST', '/jam/solve', { moves: best.path }, a);
  assert.equal(s.status, 200, s.error);
  assert.equal(s.ms, 41000, 'the clock runs from opening the vault');
  assert.equal(s.gained, 2, 'a solve at par earns two diamonds');
  assert.equal(s.vault.gems, 2);
  assert.equal(s.race.rank, 1);
  // Solving again earns nothing and doesn't change the time.
  R.tick(5000);
  s = await R.call('POST', '/jam/solve', { moves: best.path }, a);
  assert.equal(s.gained, 0);
  assert.equal(s.ms, 41000);
  // A longer solve: one diamond, then par later the same day adds the second.
  await R.call('POST', '/jam/open', null, b);
  R.tick(20000);
  const detour = [[best.path[0][0], best.path[0][1]], [best.path[0][0], -best.path[0][1]], ...best.path];
  assert.ok(replay(t.board, detour).out);
  s = await R.call('POST', '/jam/solve', { moves: detour }, b);
  assert.equal(s.gained, 1);
  assert.equal(s.ms, 20000);
  assert.equal(s.race.rank, 1, 'faster than Ann');
  s = await R.call('POST', '/jam/solve', { moves: best.path }, b);
  assert.equal(s.gained, 1, 'par later still earns the par diamond');
  assert.equal(s.ms, 20000, 'but the race time is the first solve');
  // Strangers race too, but only friends show by name.
  for (const [who, ms] of [[c, 15000], [d, 60000]]) {
    await R.call('POST', '/jam/open', null, who);
    R.tick(ms);
    await R.call('POST', '/jam/solve', { moves: best.path }, who);
  }
  j = await R.call('GET', '/jam', null, a);
  assert.deepEqual(j.race.top.map(x => x.name), ['Bo', 'Ann'], 'friends only, fastest first');
  assert.equal(j.race.solvers, 4);
  assert.equal(j.race.fastest, 15000, 'the fastest time anywhere, without a name');
  assert.equal(j.race.rank, 3);
  assert.equal(JSON.stringify(j).includes('Cy'), false, 'a stranger’s name never shows');
  // Next day: Cy (fastest anywhere) gets the trophy; Bo doesn't.
  R.tick(24 * 3600e3);
  const hc = await R.call('GET', '/home', null, c);
  assert.deepEqual(hc.trophyNews, ['2026-11-03']);
  assert.deepEqual(hc.me.trophyList, ['2026-11-03']);
  const hb = await R.call('GET', '/home', null, b);
  assert.deepEqual(hb.trophyNews, []);
  const again = await R.call('GET', '/home', null, c);
  assert.deepEqual(again.trophyNews, [], 'a trophy is announced once');
  const fr = await R.call('GET', '/friends', null, a);
  assert.equal(fr.friends[0].trophies, 0);
  // New day, new puzzle, hidden again.
  j = await R.call('GET', '/jam', null, a);
  assert.equal(j.jam.board, null);
  assert.equal(j.jam.day, 'Wednesday');
  assert.equal(j.vault.jam, null);
});

test('daily draw: once a day, a diamond doubles the odds, hand holds three', async () => {
  const R = rig(Date.parse('2026-11-03T18:00:00Z'));
  const a = await R.make('Ann');
  assert.equal((await R.call('POST', '/draw', { gem: true }, a)).status, 409, 'no diamonds yet');
  let r = await R.call('POST', '/draw', {}, a);
  assert.equal(r.status, 200, r.error);
  assert.ok(['mole', 'hfifty', 'dud'].includes(r.card.k));
  assert.equal((await R.call('POST', '/draw', {}, a)).status, 409, 'one draw a day');
  const me = await R.call('GET', '/me', null, a);
  assert.deepEqual(me.me.drew, r.card);
  // Odds over many days (reset the hand each time).
  const tally = async (gem, n) => {
    let prizes = 0;
    for (let i = 0; i < n; i++) {
      R.tick(24 * 3600e3);
      await setProfile(R, a, p => { p.hand = []; p.gems = 5; });
      const x = await R.call('POST', '/draw', { gem }, a);
      assert.equal(x.status, 200, x.error);
      assert.equal(x.vault.gems, gem ? 4 : 5);
      if (x.card.k !== 'dud') prizes++;
    }
    return prizes / n;
  };
  const plain = await tally(false, 400), boosted = await tally(true, 400);
  assert.ok(plain > 0.17 && plain < 0.33, `about 1 in 4 without a diamond (${plain})`);
  assert.ok(boosted > 0.41 && boosted < 0.59, `about 1 in 2 with one (${boosted})`);
  R.tick(24 * 3600e3);
  await setProfile(R, a, p => { p.hand = [{ id: 'a', k: 'mole' }, { id: 'b', k: 'mole' }, { id: 'c', k: 'hfifty' }]; });
  assert.equal((await R.call('POST', '/draw', {}, a)).status, 409, 'a full hand can’t draw');
});

async function cardGame(R, settings = {}) {
  const g = await crewGame(R, { take: true, ...settings });
  for (const p of g.ps) await setProfile(R, p, x => { x.hand = [{ id: 'm1', k: 'mole' }, { id: 'h1', k: 'hfifty' }]; });
  const v = (await get(R, g.host, g.code)).room;
  const A = v.turn, B = 1 - A;
  // People who are not the host, so a test never leans on the host acting for anyone.
  const onA = v.crews[A].mem.map(id => g.byPid[id]);
  const onB = v.crews[B].mem.map(id => g.byPid[id]);
  return { ...g, A, B, onA, onB };
}

test('Mole: anonymous tip to the other crew; lock it wrong and the mole’s crew takes the value', async () => {
  const R = rig();
  const g = await cardGame(R);
  let v = (await get(R, g.host, g.code)).room;
  assert.equal(v.settings.cards, true, 'power cards are on by default in invite games');
  const ib = (await g.inside()).board;
  const plain = v.board.flatMap((col, c) => col.tiles.map((t, r) => ({ c, r, tk: t.tk }))).filter(t => !t.tk && !ib[t.c].tiles[t.r].sp);
  const t0 = plain[0];
  v = (await act(R, g.byPid[v.picker], g.code, { type: 'pick', c: t0.c, r: t0.r })).room;
  const ans = ib[t0.c].tiles[t0.r].ans, wrong = (ans + 2) % 4;
  const mole = g.onB.find(p => p !== g.host) || g.onB[0];
  // Your own crew can't be moled by you; the card comes back.
  const own = g.onA.find(p => p !== g.host) || g.onA[0];
  assert.equal((await act(R, own, g.code, { type: 'mole', i: wrong })).status, 403);
  assert.equal((await R.call('GET', '/me', null, own)).me.hand.length, 2, 'refused plays hand the card back');
  const played = await act(R, mole, g.code, { type: 'mole', i: wrong });
  assert.equal(played.status, 200, played.error);
  assert.deepEqual(played.hand.map(c => c.k), ['hfifty'], 'the Mole card is used up');
  assert.equal(played.room.cur.tip.mine, true);
  assert.equal((await act(R, mole, g.code, { type: 'mole', i: wrong })).status, 409, 'no Mole card left');
  const other = g.onB.find(p => p !== mole);
  if (other) assert.equal((await act(R, other, g.code, { type: 'mole', i: ans })).status, 409, 'one tip per question');
  // What each screen sees.
  const seenA = (await get(R, own, g.code)).room.cur;
  assert.deepEqual(seenA.tip, { i: wrong }, 'the answering crew sees an anonymous tip');
  const seenB = other ? (await get(R, other, g.code)).room.cur : played.room.cur;
  assert.equal(seenB.tip.by, mole.pid, 'the mole’s crew knows who sent it');
  const tv = (await R.call('GET', `/rooms/${g.code}?tv=1`)).room.cur;
  assert.equal(tv.tip, undefined, 'nothing on the big screen');
  // The hot seat locks the tip. It was wrong: the mole's crew takes the tile value.
  const before = v.crews.map(c => c.haul);
  v = (await act(R, g.byPid[v.cur.mid], g.code, { type: 'lock', i: wrong })).room;
  assert.equal(v.phase, 'reveal');
  assert.equal(v.cur.mole.won, true);
  assert.equal(v.cur.mole.name, mole.name, 'the mole is unmasked');
  assert.equal(v.crews[g.B].haul, before[g.B] + ib[t0.c].tiles[t0.r].v);
  assert.equal(v.crews[g.A].haul, before[g.A]);
  assert.ok(v.feed.some(f => f.kind === 'mole' && f.text.startsWith('The mole got')));
  // A tip that's right helps the crew; the mole gets nothing.
  v = (await skipFact(R, g)).room;
  const t1 = plain.find(t => !v.board[t.c].tiles[t.r].taken);
  v = (await act(R, g.byPid[v.picker], g.code, { type: 'pick', c: t1.c, r: t1.r })).room;
  const ans1 = ib[t1.c].tiles[t1.r].ans;
  const rival = v.crews[1 - v.cur.crew].mem.map(id => g.byPid[id]).find(p => p !== g.host && p !== mole) || g.byPid[v.crews[1 - v.cur.crew].mem[0]];
  assert.equal((await act(R, rival, g.code, { type: 'mole', i: ans1 })).status, 200);
  const h0 = v.crews.map(c => c.haul);
  v = (await act(R, g.byPid[v.cur.mid], g.code, { type: 'lock', i: ans1 })).room;
  assert.equal(v.cur.mole.won, false);
  assert.equal(v.cur.mole.used, true);
  assert.equal(v.crews[1 - v.cur.crew].haul, h0[1 - v.cur.crew]);
});

test('Hidden 50/50: only the answering crew sees two options; never on a take', async () => {
  const R = rig();
  const g = await cardGame(R);
  let v = (await get(R, g.host, g.code)).room;
  const ib = (await g.inside()).board;
  const tiles = v.board.flatMap((col, c) => col.tiles.map((t, r) => ({ c, r, tk: t.tk }))).filter(t => !ib[t.c].tiles[t.r].sp);
  const tk = tiles.find(t => t.tk);
  v = (await act(R, g.byPid[v.picker], g.code, { type: 'pick', c: tk.c, r: tk.r })).room;
  const ans = ib[tk.c].tiles[tk.r].ans;
  const own = g.onA.find(p => p !== g.host) || g.onA[0];
  const rival = g.onB.find(p => p !== g.host) || g.onB[0];
  assert.equal((await act(R, rival, g.code, { type: 'hfifty' })).status, 403, 'only the crew answering');
  const h = await act(R, own, g.code, { type: 'hfifty' });
  assert.equal(h.status, 200, h.error);
  assert.equal(h.room.cur.hidden.length, 2);
  assert.equal(h.room.cur.hidden.includes(ans), false, 'never removes the answer');
  assert.equal(h.room.cur.opts.length, 4);
  const rv = (await get(R, rival, g.code)).room.cur;
  assert.equal(rv.hidden, undefined, 'the other crew doesn’t see it');
  assert.equal(rv.removed, null);
  assert.equal(JSON.stringify(rv).includes('hidden'), false);
  const tv = (await R.call('GET', `/rooms/${g.code}?tv=1`)).room.cur;
  assert.equal(tv.hidden, undefined, 'nor does the big screen');
  assert.equal((await get(R, rival, g.code)).room.feed.some(f => /hidden/i.test(f.text)), false, 'no feed line gives it away');
  assert.equal((await act(R, g.byPid[v.cur.mid], g.code, { type: 'fifty' })).status, 409, 'already down to two');
  const gone = h.room.cur.hidden[0];
  assert.equal((await act(R, g.byPid[v.cur.mid], g.code, { type: 'lock', i: gone })).status, 400);
  // Miss the Take tile: the take crew sees all four (minus the missed one), not the hidden cut.
  const wrong = [0, 1, 2, 3].find(i => i !== ans && !h.room.cur.hidden.includes(i));
  v = (await act(R, g.byPid[v.cur.mid], g.code, { type: 'lock', i: wrong })).room;
  assert.ok(v.cur.take);
  const takeView = (await get(R, rival, g.code)).room.cur;
  assert.equal(takeView.hidden, undefined);
  assert.equal((await act(R, rival, g.code, { type: 'hfifty' })).status, 400, 'no lifelines on a take');
  assert.equal((await R.call('GET', '/me', null, rival)).me.hand.length, 2, 'card handed back');
  v = (await act(R, g.byPid[takeView.mid], g.code, { type: 'lock', i: ans })).room;
  assert.equal(v.phase, 'reveal');
  assert.equal(v.cur.hidUsed.name, own.name, 'revealed to everyone after the answer');
});

test('Power cards: host switch, invite games only', async () => {
  const R = rig();
  const g = await cardGame(R, { cards: false });
  let v = (await get(R, g.host, g.code)).room;
  assert.equal(v.settings.cards, false);
  const ib = (await g.inside()).board;
  const t = v.board.flatMap((col, c) => col.tiles.map((x, r) => ({ c, r }))).find(x => !ib[x.c].tiles[x.r].sp && !v.board[x.c].tiles[x.r].tk);
  v = (await act(R, g.byPid[v.picker], g.code, { type: 'pick', c: t.c, r: t.r })).room;
  const rival = g.onB.find(p => p !== g.host) || g.onB[0];
  assert.equal((await act(R, rival, g.code, { type: 'mole', i: 0 })).status, 400);
  assert.equal((await R.call('GET', '/me', null, rival)).me.hand.length, 2, 'card handed back');
  const party = await R.call('POST', '/rooms', { kind: 'party', settings: { cards: true } }, g.host);
  assert.equal(party.room.settings.cards, false, 'party games share one screen: no cards');
  const lobby = await R.call('POST', '/rooms', { kind: 'invite' }, g.host);
  assert.equal(lobby.room.settings.cards, true);
  const off = await act(R, g.host, lobby.code, { type: 'settings', cards: false });
  assert.equal(off.room.settings.cards, false);
});

test('emoji reactions: any emoji, rude ones refused, batched and rate-limited without writes', async () => {
  const R = rig();
  const g = await crewGame(R, {});
  const p = g.ps[1];
  let r = await act(R, p, g.code, { type: 'react', e: '🇧🇷', c: 7, id: 'abc.1' });
  assert.equal(r.status, 200, r.error);
  const last = r.room.reactions[r.room.reactions.length - 1];
  assert.deepEqual([last.e, last.c, last.id], ['🇧🇷', 7, 'abc.1']);
  const v = r.room.v;
  r = await act(R, p, g.code, { type: 'react', e: '🔥' });
  assert.equal(r.status, 429, 'one batch per 1.5 s');
  assert.equal((await get(R, p, g.code)).room.v, v, 'a refused reaction writes nothing');
  R.tick(1600);
  for (const bad of ['🖕', '🖕🏽', 'lol', '<b>', '']) assert.equal((await act(R, p, g.code, { type: 'react', e: bad })).status, 400, bad);
  r = await act(R, p, g.code, { type: 'react', e: '🧑🏾‍💻', c: 99 });
  assert.equal(r.room.reactions[r.room.reactions.length - 1].c, 12, 'batches are capped');
});

test('fun fact: its own screen after the verdict; only the player who answered can skip it', async () => {
  const R = rig();
  const g = await crewGame(R, {});
  let v = (await get(R, g.host, g.code)).room;
  const ib = (await g.inside()).board;
  const t = v.board.flatMap((col, c) => col.tiles.map((x, r) => ({ c, r }))).find(x => !ib[x.c].tiles[x.r].sp);
  v = (await act(R, g.host, g.code, { type: 'pick', c: t.c, r: t.r })).room;
  const answerer = g.byPid[v.cur.mid];
  v = (await act(R, g.host, g.code, { type: 'lock', i: ib[t.c].tiles[t.r].ans })).room;
  assert.equal(v.phase, 'reveal');
  assert.ok(v.cur.fact.length > 0);
  assert.equal(v.cur.factAt, v.cur.revealAt + E.VERDICT_MS, 'the fact follows the verdict');
  assert.equal(v.cur.nextAt, v.cur.revealAt + E.VERDICT_MS + E.FACT_MS, 'and moves on by itself');
  const bystander = g.ps.find(p => p !== answerer && p !== g.host);
  if (answerer !== g.host) assert.equal((await act(R, g.host, g.code, { type: 'next' })).status, 403, 'not even the host');
  assert.equal((await act(R, bystander, g.code, { type: 'next' })).status, 403);
  v = (await act(R, answerer, g.code, { type: 'next' })).room;
  assert.equal(v.phase, 'board');
});
