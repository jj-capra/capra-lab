// No Cap's server (JC, Nov 8 2026). JSON in, JSON out; a Capra Lab sign-in, when there is one,
// rides in the body (`lab: { name, code }`). Every room call carries the player's seat { pid, tok }.
//
//   POST /hello                              who's asking, and the decks: { brew, role, canHost, decks }
//   POST /rooms   { kind, deckId, name? }    open a room: 'live' (friends, a topic draft) or 'solo'
//   POST /rooms/:code                        the room as this player sees it
//   POST /rooms/:code/join   { name? }       join a live room with the code or the link
//   POST /rooms/:code/deck   { deckId }      host, in the lobby or after a game: the deck
//   POST /rooms/:code/start                  host: lay out the pile and start the draft (live, 2+ players)
//   POST /rooms/:code/pick   { k, c }        the draft: pick k takes pile card c
//   POST /rooms/:code/play   { i, c }        turn i: play card c from your hand at everyone else
//   POST /rooms/:code/tap    { i, k }        tap claim k of card i: a fact, or the cap (busted)
//   POST /rooms/:code/shield                 raise a Cap Shield (a card from the lab's daily draw,
//                                            lab/cards.js `nc-shield`): the first cap you tap in
//                                            this game doesn't bust you. One a player a game.
//   POST /rooms/:code/go     { i }           solo: show card i
//   POST /rooms/:code/again  { deckId? }     host, after a game: deal again
//   POST /rooms/:code/remove { who }         host: take someone out
//   POST /rooms/:code/challenge              solo, finished: make a "beat my score" link
//   POST /challenges/:id                     a challenge and its board
//   POST /challenges/:id/play { name? }      take it: a solo room with the same cards
//
// Store `no-cap`: r/<CODE> rooms (12 hours), c/<id> challenges.
import { MAX_PLAYERS, MIN_LIVE, CARDS_PER_GAME, FIND_MS, REVEAL_MS, PICK_MS, CHOOSE_MS, POINTS, NAME_MAX, handSize, claims, cardPoints } from '../shared/rules.mjs';
import { mutate, SKIP } from './store.js';

// No Cap is a JJ Brew (JC, Nov 8 2026): only Capra's Lab can open a room or play solo. Room links
// and challenge links still work for anyone a member sends them to. Set false when JC says live.
export const BREW = false;   // live for everyone since Nov 9 2026 (a JJ Brew before that)

const ROOM_HOURS = 12;
const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const ABC = 'abcdefghijkmnpqrstuvwxyz23456789';
const ROOM_ABC = 'BCDFGHJKLMNPQRSTVWXZ';
const cleanName = (s) => String(s || '').replace(/[^\p{L}\p{N} ._'!?-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

export function createApi({ store, decks, verify, role = async () => null, clock = () => Date.now(), rand = Math.random, cards = null }) {
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
  // Solo: ten cards from the deck (or a challenge's cards).
  function deal(room, now) {
    const d = deckOf(room.deckId);
    room.cards = room.fixed ? room.fixed.slice() : shuffle(d.cards.map((_, i) => i)).slice(0, Math.min(d.cards.length, CARDS_PER_GAME));
    room.goAt = {}; room.taps = {};
    room.startedAt = now; room.phase = 'play'; room.game = (room.game || 0) + 1;
  }
  // With friends (JC, Nov 11 2026): "a pile of enough topic cards for all players to have two topic
  // cards... Allow as little as two players with four cards each." The pile comes from the room's
  // deck, topped up from the same shelf when a big room needs more; the pick order is random.
  function dealDraft(room, now) {
    const d = deckOf(room.deckId);
    const n = room.order.length, want = n * handSize(n);
    let pool = shuffle(d.cards.map((_, c) => ({ d: d.id, c })));
    if (pool.length < want) {
      const more = decks.filter((x) => x.shelf === d.shelf && x.id !== d.id && !x.brew).flatMap((x) => x.cards.map((_, c) => ({ d: x.id, c })));
      pool = pool.concat(shuffle(more));
    }
    room.pile = pool.slice(0, Math.floor(Math.min(pool.length, want) / n) * n);   // the same number each
    room.draftOrder = shuffle(room.order);
    room.picks = {}; room.plays = {}; room.taps = {}; room.cards = null;
    room.startedAt = now; room.phase = 'play'; room.game = (room.game || 0) + 1;
  }
  const card = (room, i, tl) => {
    if (room.kind === 'solo') return byId[room.deckId].cards[room.cards[i]];
    const x = room.pile[tl.times[i] ? tl.times[i].c : tl.c];
    return byId[x.d].cards[x.c];
  };
  const pileCard = (room, c) => byId[room.pile[c].d].cards[room.pile[c].c];

  // Who hunts on a card: everyone still in the game but whoever played it.
  const listeners = (room, by) => room.order.filter((p) => room.players[p] && p !== by);
  // When everyone hunting card i was done (found all three or got busted), or null.
  function allDoneAt(room, i, by, from) {
    const ls = listeners(room, by);
    if (!ls.length) return from;
    const t = room.taps[i] || {};
    let last = from;
    for (const p of ls) { const x = t[p]; if (!x || x.doneAt == null) return null; last = Math.max(last, x.doneAt); }
    return last;
  }

  // Where the game is right now, worked out from what's been stored. Solo cards wait for the
  // player's Go, then find → reveal. `times` holds every card reached so far.
  function timeline(room, now) {
    if (room.phase !== 'play') return { over: room.phase === 'over', lobby: room.phase === 'lobby', times: [] };
    if (room.kind !== 'solo') return draftLine(room, now);
    const n = room.cards.length, times = [];
    for (let i = 0; i < n; i++) {
      const go = room.goAt[i];
      if (go == null) return { i, stage: 'ready', times };
      const done = allDoneAt(room, i, null, go);
      const findEnd = Math.min(go + FIND_MS, done == null ? Infinity : done);
      times.push({ start: go, findStart: go, findEnd, by: null });
      if (now < findEnd) return { i, stage: 'find', findStart: go, findEnd: go + FIND_MS, times };
      if (i === n - 1 || room.goAt[i + 1] == null) return { i, stage: 'reveal', findStart: go, findEnd, last: i === n - 1, over: i === n - 1, times };
    }
    return { over: true, times };
  }
  // With friends: the draft (snake picks on a clock), then one card a turn in pick order:
  // choose → find → reveal. Only what players did is stored (picks, plays, taps, each with its
  // time); a pick or a play that runs out its clock is the lowest card left, worked out the same
  // way every time it's asked, so nothing has to be written when a clock runs out.
  function draftLine(room, now) {
    const order = room.draftOrder, n = order.length, total = room.pile.length;
    const owner = Array(total).fill(null), hands = {};
    for (const p of order) hands[p] = [];
    const pickerAt = (k) => { const j = k % n; return order[Math.floor(k / n) % 2 ? n - 1 - j : j]; };
    let t = room.startedAt;
    for (let k = 0; k < total; k++) {
      const p = pickerAt(k), deadline = room.players[p] ? t + PICK_MS : t, pk = room.picks[k];
      let c;
      if (pk) { c = pk.c; t = pk.at; }
      else if (now >= deadline) { c = owner.indexOf(null); t = deadline; }
      else return { stage: 'draft', k, picker: p, start: t, deadline, owner, hands, order, total, times: [] };
      owner[c] = p; hands[p].push(c);
    }
    const used = new Set(), times = [], base = { owner, hands, order, total, times, used };
    for (let i = 0; i < total; i++) {
      const by = order[i % n], start = t, deadline = room.players[by] ? t + CHOOSE_MS : t, pl = room.plays[i];
      let c, findStart;
      if (pl) { c = pl.c; findStart = pl.at; }
      else if (now >= deadline) { c = hands[by].find((x) => !used.has(x)); findStart = deadline; }
      else return { ...base, i, stage: 'choose', by, start, deadline };
      used.add(c);
      const done = allDoneAt(room, i, by, findStart);
      const findEnd = Math.min(findStart + FIND_MS, done == null ? Infinity : done);
      const revealEnd = findEnd + REVEAL_MS;
      times.push({ by, c, start, findStart, findEnd, revealEnd });
      if (now < findEnd) return { ...base, i, stage: 'find', by, c, findStart, findEnd: findStart + FIND_MS };
      if (now < revealEnd) return { ...base, i, stage: 'reveal', by, c, findStart, findEnd, revealEnd, last: i === total - 1 };
      t = revealEnd;
    }
    return { ...base, over: true, end: t };
  }
  // A live game that has run to its end is over for good (so it can be dealt again).
  function settle(room, now) {
    if (room.phase === 'play' && room.kind === 'live' && timeline(room, now).over) room.phase = 'over';
  }

  /* ---------- scores ---------- */
  // Points per player per finished card, the totals, and each player's marks card by card
  // (for the results text): all | first | part | none | bust | own (the card they played).
  function results(room, now, line) {
    const tl = line || (room.phase === 'over' && room.kind === 'live' ? draftLine(room, Infinity) : timeline(room, now));
    const n = room.kind === 'solo' ? room.cards.length : (room.pile || []).length;
    const upto = tl.over ? Math.min(n, tl.times.length || n) : tl.stage === 'reveal' ? tl.i + 1 : tl.stage === 'draft' ? 0 : tl.i;
    const total = {}, per = [], marks = {};
    for (const p of room.order) { total[p] = 0; marks[p] = []; }
    for (let i = 0; i < upto; i++) {
      const t = room.taps[i] || {}, row = {};
      const at = tl.times[i], from = at ? at.findStart : null, by = at ? at.by : null;
      let fooled = 0;
      const ls = listeners(room, by);
      // with friends: the first to find all three on this card gets a bonus on top of the speed points
      const finishers = ls.filter((p) => t[p] && t[p].found.length === 3 && !t[p].busted);
      const firstAt = room.kind === 'live' && ls.length > 1 && finishers.length ? Math.min(...finishers.map((p) => t[p].doneAt)) : null;
      for (const p of ls) {
        const x = t[p] || { found: [], busted: false };
        let pts = cardPoints(x.found.length, x.busted, x.doneAt != null && from != null ? x.doneAt - from : FIND_MS);
        const first = firstAt != null && x.found.length === 3 && !x.busted && x.doneAt === firstAt;
        if (first) pts += POINTS.first;
        row[p] = { pts, found: x.found.length, busted: !!x.busted, first };
        if (x.busted) fooled++;
        total[p] += pts;
        marks[p].push(x.busted ? 'bust' : x.found.length === 3 ? (first ? 'first' : 'all') : x.found.length ? 'part' : 'none');
      }
      if (by && total[by] != null) { const pts = fooled * POINTS.fooled; row[by] = { pts, reader: true, fooled }; total[by] += pts; marks[by].push('own'); }
      per.push(row);
    }
    return { total, per, marks };
  }

  /* ---------- what a player sees ---------- */
  function view(room, me, now) {
    const tl = room.phase === 'over' && room.kind === 'live' ? draftLine(room, Infinity) : timeline(room, now);
    const res = results(room, now, tl);
    const live = room.kind === 'live';
    const nameOf = (p) => (room.players[p] ? room.players[p].name : 'Someone');
    const out = {
      now, code: room.code, kind: room.kind, phase: tl.over ? 'over' : room.phase, game: room.game || 0,
      deck: room.deckId ? { id: room.deckId, title: byId[room.deckId].title, shelf: byId[room.deckId].shelf } : null,
      host: me === room.host, me, hostName: room.players[room.host] ? room.players[room.host].name : 'The host',
      players: room.order.filter((p) => room.players[p]).map((p) => ({ pid: p, name: room.players[p].name, score: res.total[p] || 0, host: p === room.host })),
      n: live ? (room.pile || []).length : room.cards ? room.cards.length : 0, challenge: room.challenge || null, made: room.made || null,
      hand: handSize(room.order.filter((p) => room.players[p]).length),
      // your Cap Shield this game (lab players only): up until the first cap you tap, then used
      shield: me && room.players[me] && room.players[me].lab
        ? { up: room.players[me].shield === (room.game || 0) && room.players[me].shieldUsed !== (room.game || 0), used: room.players[me].shieldUsed === (room.game || 0) } : null,
    };
    if (room.phase === 'lobby' || (!room.cards && !room.pile)) return out;
    if (tl.over && live) {
      out.final = out.players.slice().sort((a, b) => b.score - a.score).map((p) => ({ ...p, marks: res.marks[p.pid] || [] }));
      return out;
    }
    if (live) {
      out.order = tl.order.map((p) => ({ pid: p, name: nameOf(p), left: tl.hands[p].filter((c) => !(tl.used && tl.used.has(c))).length }));
      out.myHand = (tl.hands[me] || []).map((c) => ({ c, about: pileCard(room, c).about, used: !!(tl.used && tl.used.has(c)) }));
    }
    if (tl.stage === 'draft') {
      out.stage = 'draft';
      out.draft = { k: tl.k, total: tl.total, picker: tl.picker, pickerName: nameOf(tl.picker),
        pile: room.pile.map((x, c) => ({ c, about: pileCard(room, c).about, by: tl.owner[c] })) };
      out.t = { start: tl.start, end: tl.deadline, pick: PICK_MS };
      return out;
    }
    const i = tl.i, by = tl.by || null;
    out.i = i; out.stage = tl.stage; out.reader = by; out.readerName = by ? nameOf(by) : null;
    if (tl.stage === 'choose') { out.t = { start: tl.start, end: tl.deadline, choose: CHOOSE_MS }; return out; }
    const c = card(room, i, tl);
    out.t = { findStart: tl.findStart || null, findEnd: tl.findEnd || null, revealEnd: tl.revealEnd || null, find: FIND_MS, reveal: REVEAL_MS };
    const mine = (room.taps[i] || {})[me];
    out.mine = mine ? { found: mine.found, busted: !!mine.busted, done: mine.doneAt != null, pick: mine.busted ? mine.pick : null, blocked: mine.blocked ?? null } : { found: [], busted: false, done: false, blocked: null };
    const ls = listeners(room, by);
    out.hunting = ls.length;
    out.doneCount = ls.filter((p) => ((room.taps[i] || {})[p] || {}).doneAt != null).length;
    out.about = c.about || null;
    if (tl.stage !== 'ready') out.card = { say: c.say, about: c.about || null, claims: claims(c.say) };
    if (out.card && (me === by || tl.stage === 'reveal')) out.card.cap = c.cap;
    if (tl.stage === 'reveal') {
      out.card.real = c.real;
      out.round = res.per[i] || {};
      if (tl.last && room.kind === 'solo') out.final = out.players.map((p) => ({ ...p, marks: res.marks[p.pid] || [] }));
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
    if (op === '/shield') {
      // the card comes out of the lab hand first, and goes back if the room refuses the shield
      const r0 = await load(code, now), pid = seat(r0, body), p = r0.players[pid], g0 = r0.game || 0;
      if (!cards || !p.lab) fail(401, 'Sign in to Capra Lab to play your cards.');
      if (timeline(r0, now).over || r0.phase === 'over') fail(409, 'This game is over.');
      if (p.shield === g0) fail(409, 'One shield a game. Yours is already up.');
      const got = await cards.take(p.lab, 'nc-shield');
      if (!got) fail(409, 'You’re out of Cap Shields. Win them in the daily Card Draw.');
      let room;
      try {
        room = await change(code, now, (room) => {
          const me = seat(room, body), q = room.players[me], g = room.game || 0;
          if (q.shield === g) fail(409, 'One shield a game. Yours is already up.');
          q.shield = g;
        });
      } catch (e) { await cards.give(p.lab, got); throw e; }
      return { room: view(room, pid, now) };
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
        dealDraft(room, now);
        return;
      }
      if (op === '/pick') {
        const c = Number(body.c);
        if (tl.stage !== 'draft' || Number(body.k) !== tl.k) return SKIP;   // the clock already moved it on
        if (me !== tl.picker) fail(403, 'It’s not your pick.');
        if (!Number.isInteger(c) || c < 0 || c >= tl.total || tl.owner[c] != null) fail(409, 'That card is taken. Pick another.');
        room.picks[tl.k] = { c, at: now };
        return;
      }
      if (op === '/play') {
        const c = Number(body.c);
        if (tl.stage !== 'choose' || Number(body.i) !== tl.i) return SKIP;
        if (me !== tl.by) fail(403, 'It’s not your turn.');
        if (!tl.hands[me].includes(c) || tl.used.has(c)) fail(409, 'Play a card from your hand.');
        room.plays[tl.i] = { c, at: now };
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
        if (me === tl.by) fail(403, 'That’s your card. They’re the ones hunting.');
        if (!(k >= 0 && k < 4)) fail(400, 'Pick one of the four.');
        const c = card(room, i, tl);
        const t = (room.taps[i] ||= {});
        const x = (t[me] ||= { found: [], busted: false, doneAt: null });
        if (x.doneAt != null || x.found.includes(k) || x.blocked === k) return SKIP;
        const p = room.players[me], g = room.game || 0;
        if (k === c.cap && p.shield === g && p.shieldUsed !== g) { p.shieldUsed = g; x.blocked = k; }   // the Cap Shield takes it
        else if (k === c.cap) { x.busted = true; x.pick = k; x.doneAt = now; }
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
