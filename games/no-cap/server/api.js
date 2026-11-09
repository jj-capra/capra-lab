// No Cap's server (JC, Nov 8 2026). JSON in, JSON out; a Capra Lab sign-in, when there is one,
// rides in the body (`lab: { name, code }`). Every room call carries the player's seat { pid, tok }.
//
//   POST /hello                              who's asking, and the decks: { brew, role, canHost, decks }
//   POST /rooms   { kind, deckId, name? }    open a room: 'live' (friends, a reader) or 'solo'
//   POST /rooms/:code                        the room as this player sees it
//   POST /rooms/:code/join   { name? }       join a live room with the code or the link
//   POST /rooms/:code/deck   { deckId }      host, in the lobby or after a game: the deck
//   POST /rooms/:code/start                  host: deal and go (live, 2+ players)
//   POST /rooms/:code/read   { i }           the reader (or the host) is done reading card i
//   POST /rooms/:code/tap    { i, k }        tap claim k of card i: a fact, or the cap (busted)
//   POST /rooms/:code/go     { i }           solo: show card i
//   POST /rooms/:code/again  { deckId? }     host, after a game: deal again
//   POST /rooms/:code/remove { who }         host: take someone out
//   POST /rooms/:code/challenge              solo, finished: make a "beat my score" link
//   POST /challenges/:id                     a challenge and its board
//   POST /challenges/:id/play { name? }      take it: a solo room with the same cards
//
// Store `no-cap`: r/<CODE> rooms (12 hours), c/<id> challenges.
import { MAX_PLAYERS, MIN_LIVE, CARDS_PER_GAME, FIND_MS, REVEAL_MS, READ_MS, POINTS, NAME_MAX, claims, cardPoints } from '../shared/rules.mjs';
import { mutate, SKIP } from './store.js';

// No Cap is a JJ Brew (JC, Nov 8 2026): only Capra's Lab can open a room or play solo. Room links
// and challenge links still work for anyone a member sends them to. Set false when JC says live.
export const BREW = true;

const ROOM_HOURS = 12;
const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const ABC = 'abcdefghijkmnpqrstuvwxyz23456789';
const ROOM_ABC = 'BCDFGHJKLMNPQRSTVWXZ';
const cleanName = (s) => String(s || '').replace(/[^\p{L}\p{N} ._'!?-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

export function createApi({ store, decks, verify, role = async () => null, clock = () => Date.now(), rand = Math.random }) {
  const rid = (n, abc = ABC) => Array.from({ length: n }, () => abc[Math.floor(rand() * abc.length)]).join('');
  const shuffle = (list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const byId = Object.fromEntries(decks.map((d) => [d.id, d]));
  const deckList = (crew) => decks.filter((d) => crew || !d.brew)
    .map((d) => ({ id: d.id, title: d.title, shelf: d.shelf, blurb: d.blurb, count: d.cards.length }));
  const deckOf = (id, crew = true) => { const d = byId[id]; if (!d || (d.brew && !crew)) fail(404, 'No deck by that name.'); return d; };

  async function who(body) {
    const lab = body && body.lab;
    if (!lab || !lab.name || !lab.code) return null;
    const p = await verify(String(lab.name).slice(0, 40), String(lab.code).slice(0, 12));
    if (!p) fail(401, 'Your Capra Lab name and key don’t match. Sign in to Capra Lab again.');
    return { name: p.name, handle: p.handle, role: await role(p.handle) };
  }
  const canHost = (me) => !BREW || !!(me && me.role);

  /* ---------- rooms ---------- */
  const expired = (room, now) => now - room.created > ROOM_HOURS * 3600e3;
  async function load(code, now) {
    const g = await store.get('r/' + code);
    if (!g || expired(g.data, now)) fail(404, 'No game with that code. Check it and try again.');
    return g.data;
  }
  function seat(room, body) {
    const pid = String(body.pid || ''), p = room.players[pid];
    if (!p || p.tok !== String(body.tok || '')) fail(403, 'You’re not in this game. Join with the code first.');
    return pid;
  }
  function addPlayer(room, name, me, now) {
    const taken = new Set(Object.values(room.players).map((p) => p.name.toLowerCase()));
    for (let k = 2; taken.has(name.toLowerCase()); k++) name = `${name.slice(0, NAME_MAX - 3)} ${k}`;
    const pid = rid(10), tok = rid(20);
    room.players[pid] = { name, tok, joined: now, ...(me ? { lab: me.handle } : {}) };
    room.order.push(pid);
    return { pid, tok };
  }
  // A live game deals enough cards that everyone reads about the same number of times.
  function deal(room, now) {
    const d = deckOf(room.deckId);
    const n = room.kind === 'solo' ? 1 : room.order.length;
    const want = room.kind === 'solo' ? CARDS_PER_GAME : n * Math.max(1, Math.ceil(8 / n));
    room.cards = room.fixed ? room.fixed.slice() : shuffle(d.cards.map((_, i) => i)).slice(0, Math.min(d.cards.length, want));
    room.readers = room.kind === 'solo' ? [] : room.cards.map((_, k) => room.order[k % n]);
    room.readDone = {}; room.goAt = {}; room.taps = {};
    room.startedAt = now; room.phase = 'play'; room.game = (room.game || 0) + 1;
  }
  const card = (room, i) => byId[room.deckId].cards[room.cards[i]];

  // Who hunts on card i: everyone still in the game but its reader.
  const listeners = (room, i) => room.order.filter((p) => room.players[p] && p !== room.readers[i]);
  // When everyone hunting card i was done (found all three or got busted), or null.
  function allDoneAt(room, i, from) {
    const ls = listeners(room, i);
    if (!ls.length) return from;
    const t = room.taps[i] || {};
    let last = from;
    for (const p of ls) { const x = t[p]; if (!x || x.doneAt == null) return null; last = Math.max(last, x.doneAt); }
    return last;
  }

  // Where the game is right now, worked out from what's been stored: live cards go read → find →
  // reveal on the clock (the reader starts each find); solo cards wait for the player's Go.
  // `times` holds every card reached so far ({ start, findStart, findEnd, revealEnd }).
  function timeline(room, now) {
    if (room.phase !== 'play') return { over: room.phase === 'over', lobby: room.phase === 'lobby', times: [] };
    const n = room.cards.length, times = [];
    if (room.kind === 'solo') {
      for (let i = 0; i < n; i++) {
        const go = room.goAt[i];
        if (go == null) return { i, stage: 'ready', times };
        const done = allDoneAt(room, i, go);
        const findEnd = Math.min(go + FIND_MS, done == null ? Infinity : done);
        times.push({ start: go, findStart: go, findEnd });
        if (now < findEnd) return { i, stage: 'find', findStart: go, findEnd: go + FIND_MS, times };
        if (i === n - 1 || room.goAt[i + 1] == null) return { i, stage: 'reveal', findStart: go, findEnd, last: i === n - 1, over: i === n - 1, times };
      }
    }
    let t = room.startedAt;
    for (let i = 0; i < n; i++) {
      const start = t, rd = room.readDone[i];
      if (rd == null && now < start + READ_MS) return { i, stage: 'read', start, times };
      const findStart = rd != null ? rd : start + READ_MS;
      const done = allDoneAt(room, i, findStart);
      const findEnd = Math.min(findStart + FIND_MS, done == null ? Infinity : done);
      const revealEnd = findEnd + REVEAL_MS;
      times.push({ start, findStart, findEnd, revealEnd });
      if (now < findEnd) return { i, stage: 'find', start, findStart, findEnd: findStart + FIND_MS, times };
      if (now < revealEnd) return { i, stage: 'reveal', start, findStart, findEnd, revealEnd, last: i === n - 1, times };
      t = revealEnd;
    }
    return { over: true, end: t, times };
  }
  // A live game that has run to its end is over for good (so it can be dealt again).
  function settle(room, now) {
    if (room.phase === 'play' && room.kind === 'live' && timeline(room, now).over) room.phase = 'over';
  }

  /* ---------- scores ---------- */
  // Points per player per finished card, and the totals.
  function results(room, now) {
    const tl = timeline(room, now);
    const upto = tl.over ? room.cards.length : tl.stage === 'reveal' ? tl.i + 1 : tl.i;
    const total = {}, per = [];
    for (const p of room.order) total[p] = 0;
    for (let i = 0; i < upto; i++) {
      const t = room.taps[i] || {}, row = {};
      const from = tl.times[i] ? tl.times[i].findStart : null;
      let fooled = 0;
      // live: the first to find all three on this card gets a bonus on top of the speed points
      const finishers = listeners(room, i).filter((p) => t[p] && t[p].found.length === 3 && !t[p].busted);
      const firstAt = room.kind === 'live' && finishers.length ? Math.min(...finishers.map((p) => t[p].doneAt)) : null;
      for (const p of listeners(room, i)) {
        const x = t[p] || { found: [], busted: false };
        let pts = cardPoints(x.found.length, x.busted, x.doneAt != null && from != null ? x.doneAt - from : FIND_MS);
        const first = firstAt != null && x.found.length === 3 && !x.busted && x.doneAt === firstAt;
        if (first) pts += POINTS.first;
        row[p] = { pts, found: x.found.length, busted: !!x.busted, first };
        if (x.busted) fooled++;
        if (total[p] != null) total[p] += pts;
      }
      const r = room.readers[i];
      if (r) { const pts = fooled * POINTS.fooled; row[r] = { pts, reader: true, fooled }; if (total[r] != null) total[r] += pts; }
      per.push(row);
    }
    return { total, per };
  }

  /* ---------- what a player sees ---------- */
  function view(room, me, now) {
    const tl = timeline(room, now);
    const res = results(room, now);
    const out = {
      now, code: room.code, kind: room.kind, phase: tl.over ? 'over' : room.phase, game: room.game || 0,
      deck: room.deckId ? { id: room.deckId, title: byId[room.deckId].title, shelf: byId[room.deckId].shelf } : null,
      host: me === room.host, me, hostName: room.players[room.host] ? room.players[room.host].name : 'The host',
      players: room.order.filter((p) => room.players[p]).map((p) => ({ pid: p, name: room.players[p].name, score: res.total[p] || 0, host: p === room.host })),
      n: room.cards ? room.cards.length : 0, challenge: room.challenge || null, made: room.made || null,
    };
    if (room.phase === 'lobby' || !room.cards) return out;
    if (tl.over && room.kind === 'live') {
      out.final = out.players.slice().sort((a, b) => b.score - a.score);
      return out;
    }
    const i = tl.i, c = card(room, i), reader = room.readers[i] || null;
    out.i = i; out.stage = tl.stage; out.reader = reader;
    out.readerName = reader && room.players[reader] ? room.players[reader].name : null;
    out.t = { start: tl.start || null, findStart: tl.findStart || null, findEnd: tl.findEnd || null, revealEnd: tl.revealEnd || null, read: READ_MS, find: FIND_MS, reveal: REVEAL_MS };
    const mine = (room.taps[i] || {})[me];
    out.mine = mine ? { found: mine.found, busted: !!mine.busted, done: mine.doneAt != null, pick: mine.busted ? mine.pick : null } : { found: [], busted: false, done: false };
    const ls = listeners(room, i);
    out.hunting = ls.length;
    out.doneCount = ls.filter((p) => ((room.taps[i] || {})[p] || {}).doneAt != null).length;
    const showText = tl.stage === 'find' || tl.stage === 'reveal' || me === reader;
    out.about = c.about || null;
    if (showText) out.card = { say: c.say, about: c.about || null, claims: claims(c.say) };
    if (out.card && (me === reader || tl.stage === 'reveal')) out.card.cap = c.cap;
    if (tl.stage === 'reveal') {
      out.card.real = c.real;
      out.round = res.per[i] || {};
      if (tl.last && room.kind === 'solo') out.final = out.players;
    }
    return out;
  }

  const hostOnly = (room, me) => { if (me !== room.host) fail(403, 'Only the host can do that.'); };

  async function change(code, now, fn) {
    const r = await mutate(store, 'r/' + code, (room) => {
      if (expired(room, now)) fail(404, 'No game with that code. Check it and try again.');
      settle(room, now);
      return fn(room);
    });
    if (!r) fail(404, 'No game with that code. Check it and try again.');
    return r.data;
  }

  async function newRoom(kind, deckId, name, me, now, extra = {}) {
    for (let tries = 0; tries < 6; tries++) {
      const code = rid(4, ROOM_ABC);
      const room = { code, kind, created: now, host: null, deckId, phase: 'lobby', players: {}, order: [], cards: null, ...extra };
      const s = addPlayer(room, name, me, now);
      room.host = s.pid;
      if (kind === 'solo') deal(room, now);
      const w = await store.set('r/' + code, room, { onlyIfNew: true });
      if (w && w.modified) return { ...s, code, room: view(room, s.pid, now) };
    }
    fail(503, 'Couldn’t find a free code. Try again.');
  }

  async function route(method, path, body) {
    const now = clock();
    if (method !== 'POST') fail(405, 'Use POST.');
    if (path === '/hello') {
      const me = await who(body);
      const crew = !!(me && me.role);
      return { now, brew: BREW, role: me ? me.role : null, name: me ? me.name : null, canHost: canHost(me), decks: canHost(me) ? deckList(crew) : [] };
    }
    if (path === '/rooms') {
      const me = await who(body);
      if (!canHost(me)) fail(403, 'No Cap is still being tested in Capra’s Lab. Only the lab’s crew can start a game for now.');
      const kind = body.kind === 'solo' ? 'solo' : 'live';
      const d = deckOf(String(body.deckId || ''), !!(me && me.role));
      const name = me ? me.name : cleanName(body.name);
      if (!name) fail(400, 'Type your name first.');
      return newRoom(kind, d.id, name, me, now);
    }
    const cm = path.match(/^\/challenges\/([a-z0-9]{8})(\/play)?$/);
    if (cm) {
      const g = await store.get('c/' + cm[1]);
      if (!g) fail(404, 'No challenge by that link.');
      const ch = g.data;
      if (!cm[2]) return { now, challenge: challengeView(ch) };
      const me = await who(body);
      const name = me ? me.name : cleanName(body.name);
      if (!name) fail(400, 'Type your name first.');
      return newRoom('solo', ch.deckId, name, me, now, { fixed: ch.cards, challenge: ch.id });
    }
    const m = path.match(/^\/rooms\/([A-Z]{4})(\/[a-z]+)?$/);
    if (!m) fail(404, 'Not found.');
    const code = m[1], op = m[2] || '';
    if (!op) {
      const room = await load(code, now);
      const p = room.players[String(body.pid || '')];
      // a challenge run that ran out on the clock gets on the board the first time it's looked at
      if (room.kind === 'solo' && room.challenge && !room.posted && timeline(room, now).over) await recordTaker(room, now);
      return { room: view(room, p && p.tok === String(body.tok || '') ? String(body.pid) : null, now) };
    }
    if (op === '/join') {
      const me = await who(body);
      const name = me ? me.name : cleanName(body.name);
      if (!name) fail(400, 'Type your name first.');
      let s = null;
      const room = await change(code, now, (room) => {
        if (room.kind !== 'live') fail(409, 'That’s a solo run. Ask for a challenge link instead.');
        // the same phone (or the same lab player) coming back keeps its seat
        const back = String(body.pid || '') && room.players[body.pid] && room.players[body.pid].tok === String(body.tok || '') ? body.pid
          : me ? Object.keys(room.players).find((p) => room.players[p].lab === me.handle) : null;
        if (back) { s = { pid: back, tok: room.players[back].tok }; return SKIP; }
        if (room.order.length >= MAX_PLAYERS) fail(409, `That game is full (${MAX_PLAYERS} players).`);
        s = addPlayer(room, name, me, now);
      });
      return { ...s, code, room: view(room, s.pid, now) };
    }
    let me = null, room;
    room = await change(code, now, (room) => {
      me = seat(room, body);
      const tl = timeline(room, now);
      if (op === '/deck') {
        hostOnly(room, me);
        if (room.phase === 'play') fail(409, 'Change the deck after this game.');
        room.deckId = deckOf(String(body.deckId || '')).id;
        return;
      }
      if (op === '/start' || op === '/again') {
        hostOnly(room, me);
        if (room.kind !== 'live') fail(409, 'Solo runs start on their own.');
        if (op === '/start' && room.phase !== 'lobby') fail(409, 'This game already started.');
        if (op === '/again' && room.phase !== 'over') fail(409, 'Finish this game first.');
        if (body.deckId) room.deckId = deckOf(String(body.deckId)).id;
        if (room.order.filter((p) => room.players[p]).length < MIN_LIVE) fail(409, `You need at least ${MIN_LIVE} players.`);
        room.order = room.order.filter((p) => room.players[p]);
        deal(room, now);
        return;
      }
      if (op === '/read') {
        if (tl.stage !== 'read' || Number(body.i) !== tl.i) return SKIP;   // already going
        if (me !== room.readers[tl.i] && me !== room.host) fail(403, 'Only the reader can start the clock.');
        room.readDone[tl.i] = now;
        return;
      }
      if (op === '/go') {
        if (room.kind !== 'solo') fail(409, 'Only solo runs go card by card.');
        const i = Number(body.i);
        if (tl.stage === 'ready' && i === tl.i) { room.goAt[i] = now; return; }
        if (tl.stage === 'reveal' && !tl.last && i === tl.i + 1) { room.goAt[i] = now; return; }
        return SKIP;
      }
      if (op === '/tap') {
        const i = Number(body.i), k = Number(body.k);
        if (tl.stage !== 'find' || i !== tl.i) fail(409, 'Time’s up on that card.');
        if (me === room.readers[i]) fail(403, 'You’re the reader on this one.');
        if (!(k >= 0 && k < 4)) fail(400, 'Pick one of the four.');
        const c = card(room, i);
        const t = (room.taps[i] ||= {});
        const x = (t[me] ||= { found: [], busted: false, doneAt: null });
        if (x.doneAt != null || x.found.includes(k)) return SKIP;
        if (k === c.cap) { x.busted = true; x.pick = k; x.doneAt = now; }
        else { x.found.push(k); if (x.found.length === 3) x.doneAt = now; }
        return;
      }
      if (op === '/remove') {
        hostOnly(room, me);
        const p = String(body.who || '');
        if (!room.players[p] || p === room.host) fail(400, 'You can’t remove that player.');
        delete room.players[p];
        return;
      }
      if (op === '/challenge') {
        if (room.kind !== 'solo' || !tl.over) fail(409, 'Finish the run first.');
        if (room.made) return SKIP;
        room.made = rid(8);
        return;
      }
      fail(404, 'Not found.');
    });
    if (op === '/challenge' && room.made) await makeChallenge(room, now);
    if (room.kind === 'solo' && room.challenge && !room.posted && timeline(room, now).over) await recordTaker(room, now);
    return { room: view(room, me, now) };
  }

  /* ---------- challenges ---------- */
  function challengeView(ch) {
    return {
      id: ch.id, deck: { id: ch.deckId, title: byId[ch.deckId] ? byId[ch.deckId].title : ch.deckId, shelf: byId[ch.deckId] ? byId[ch.deckId].shelf : null },
      n: ch.cards.length, by: ch.by, board: ch.board.slice().sort((a, b) => b.score - a.score).slice(0, 50),
    };
  }
  async function makeChallenge(room, now) {
    const p = room.players[room.host];
    const score = results(room, now).total[room.host] || 0;
    await store.set('c/' + room.made, {
      id: room.made, created: now, deckId: room.deckId, cards: room.cards,
      by: { name: p.name, score }, board: [{ name: p.name, score, room: room.code, by: true }],
    }, { onlyIfNew: true });
  }
  async function recordTaker(room, now) {
    const p = room.players[room.host];
    const score = results(room, now).total[room.host] || 0;
    await mutate(store, 'c/' + room.challenge, (ch) => {
      if (ch.board.some((b) => b.room === room.code)) return SKIP;
      ch.board.push({ name: p.name, score, room: room.code });
      if (ch.board.length > 200) ch.board.splice(1, ch.board.length - 200);
    });
    // remember it on the room so looking again doesn't read the challenge every time
    await mutate(store, 'r/' + room.code, (r) => { if (r.posted) return SKIP; r.posted = true; });
    room.posted = true;
  }

  async function handle(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/no-cap/, '').replace(/^\/api/, '') || '/';
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    try {
      return Response.json(await route(req.method, path, body || {}), { headers: { 'cache-control': 'no-store' } });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error('no-cap:', e);
      return Response.json({ error: status === 500 ? 'Something went wrong. Try again.' : e.message }, { status, headers: { 'cache-control': 'no-store' } });
    }
  }

  return { route, handle, timeline, results };
}
