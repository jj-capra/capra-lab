// Punchline's server. JSON in, JSON out; a Capra Lab sign-in, when there is one, rides in the body
// (`lab: { name, code }`), never in the address.
//
//   POST /today                          today's drop (ten cards, answers included: it's solo and
//                                        unranked) and the decks a host can pick from
//   POST /rooms        { deckId, late }  host a party game -> { code, pid, tok }
//   POST /rooms/:code/join  { name }     join with the code -> { pid, tok, room }
//   POST /rooms/:code  { pid, tok }      the room as this player sees it (without them: as a guest)
//   POST /rooms/:code/start              host: the ten cards start on the server's clock
//   POST /rooms/:code/answer {i, pick}   your tile for card i (one tap, while it's up)
//   POST /rooms/:code/again {deckId}     host: back to the lobby with a fresh deal
//
// Store `punchline`: r/<CODE> rooms. Answers stay on the server until a card's reveal.
import { CARDS_PER_GAME, COUNTDOWN_MS, schedule, beatAt, points, askOf, findMs } from '../shared/rules.mjs';
import { dailyDeck, deal, pacificDate, mulberry32, seedOf } from './daily.js';
import { variantOf } from './variants.mjs';
import { mutate, SKIP } from './store.js';

// Punchline was a JJ Brew (JC, Nov 7 2026) and went live on Nov 8 2026: everyone gets today's drop
// and can host. Set true to put it back behind Capra's Lab (only members see the drop and host;
// anyone with a room link can still join).
export const BREW = false;
const MAX_PLAYERS = 12;
const ROOM_HOURS = 8;
// A card's sign (never its answer) goes out this long before it shows, so every phone has it
// ready when the clock gets there.
const PREFETCH_MS = 2500;

const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const getJSON = async (s, k) => { const g = await s.get(k); return g ? g.data : null; };
const rid = (n, abc = 'abcdefghijkmnpqrstuvwxyz23456789') => Array.from({ length: n }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
const ROOM_ABC = 'BCDFGHJKLMNPQRSTVWXZ';   // no vowels, so no codes spell words
const cleanName = (s) => String(s || '').replace(/[^\p{L}\p{N} ._'!?-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 17);

// The right answer for a dealt card: the odd tile for a sign, the real punchline for a joke.
const answerOf = ({ card, order, odd }) => (card.type === 'joke' ? order.indexOf(card.answer) : odd);

// A card as the phones see it. A sign carries both versions (`base` for three tiles, `off` for the
// odd one at `odd`); the caption, what it reads, the circled letters and a shirt's back wait for
// the reveal. `seed` makes a made-up flaw the same on every phone and every poll.
function publicCard(d, revealed, seed) {
  const { card, order } = d;
  let out;
  if (card.type === 'joke') out = { type: 'joke', setup: card.setup, ask: askOf(card), options: order.map((k) => card.options[k]) };
  else {
    const v = variantOf(card, mulberry32(seedOf(`${seed}:${card.id}`)));
    out = { type: 'sign', scene: card.scene, where: card.where, kind: card.kind, ask: askOf(card), base: v.base, off: v.off, odd: d.odd,
      ...(card.art ? { art: card.art } : {}), ...(card.arc ? { arc: true } : {}) };
    if (revealed) Object.assign(out, { stamp: v.stamp, reading: v.reading, marks: v.marks, ...(card.back ? { back: card.back } : {}) });
  }
  if (revealed) { out.answer = answerOf(d); out.caption = card.caption; }
  return out;
}

export function createApi({ store, decks, verify, role = async () => null, clock = () => Date.now() }) {
  const byId = Object.fromEntries(decks.map((d) => [d.id, d]));
  const dealOf = (room) => room.deal.map(({ id, order, odd }) => ({ card: byId[id.split('/')[0]].cards.find((c) => c.id === id), order, odd }));
  const seedFor = (room) => `${room.code}:${room.game}`;

  async function who(body) {
    const lab = body && body.lab;
    if (!lab || !lab.name || !lab.code) return null;
    const p = await verify(String(lab.name).slice(0, 40), String(lab.code).slice(0, 12));
    if (!p) fail(401, 'Your Capra Lab name and key don’t match. Sign in to Capra Lab again.');
    return { name: p.name, handle: p.handle, role: await role(p.handle) };
  }
  const canHost = (me) => !BREW || !!(me && me.role);

  // Decks marked brew (a JJ Brew inside Punchline) only show up for Capra's Lab.
  function deckList(crew) {
    return decks.filter((d) => crew || !d.brew)
      .map((d) => ({ id: d.id, title: d.title, type: d.type, shelf: d.shelf, blurb: d.blurb, count: d.cards.length, ...(d.brew ? { brew: true } : {}) }));
  }

  function newDeal(deckId, late, seed, crew) {
    const d = byId[deckId];
    if (!d || (d.brew && !crew)) fail(404, 'No deck by that name.');
    if (d.shelf === 'late' && !late) fail(400, 'Turn on Late Night to play that deck.');
    return deal(d, seed, Math.min(CARDS_PER_GAME, d.cards.length)).map(({ card, order, odd }) => ({ id: card.id, order, odd }));
  }

  // The room as one player sees it: cards so far, results of revealed cards, scores.
  function view(room, me, now) {
    const dealt = dealOf(room);
    const times = room.startAt ? room.times : [];
    const at = times.length ? beatAt(times, now) : { i: 0, beat: 'lobby' };
    const shown = times.filter((t) => t.at - PREFETCH_MS <= now).length;
    const revealedN = times.filter((t) => t.reveal <= now).length;
    const scores = Object.fromEntries(Object.keys(room.players).map((pid) => [pid, 0]));
    const results = [];
    for (let i = 0; i < revealedN; i++) {
      const ans = Object.entries((room.answers || {})[i] || {});
      const answer = answerOf(dealt[i]), window = findMs(dealt[i].card);
      const right = ans.filter(([, [pick]]) => pick === answer).sort((a, b) => a[1][1] - b[1][1]);
      const first = right.length ? right[0][0] : null;
      const gained = {};
      for (const [pid, [, ms]] of right) { gained[pid] = points(ms, window, pid === first); scores[pid] = (scores[pid] || 0) + gained[pid]; }
      const mine = me && (room.answers[i] || {})[me];
      results.push({
        i, answer, right: right.map(([pid]) => room.players[pid] ? room.players[pid].name : '?'),
        first: first && room.players[first] ? room.players[first].name : null,
        mine: me ? { pick: mine ? mine[0] : null, ok: !!(mine && mine[0] === answer), gained: gained[me] || 0 } : null,
      });
    }
    const cur = (room.answers || {})[at.i] || {};
    return {
      now, code: room.code, game: room.game, deck: { id: room.deckId, title: byId[room.deckId].title, type: byId[room.deckId].type },
      late: !!room.late, host: me === room.host, startAt: room.startAt || null, times,
      beat: at.beat, i: at.i,
      players: Object.entries(room.players).map(([pid, p]) => ({ name: p.name, score: scores[pid] || 0, me: pid === me, host: pid === room.host, locked: !!cur[pid] }))
        .sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : 1)),
      cards: dealt.slice(0, shown).map((d, i) => publicCard(d, i < revealedN, seedFor(room))),
      results,
      me: me && room.players[me] ? { name: room.players[me].name, picks: Object.fromEntries(Object.entries(room.answers || {}).map(([i, a]) => [i, a[me] ? a[me][0] : null]).filter(([, v]) => v != null)) } : null,
    };
  }

  async function loadRoom(code, now) {
    const room = await getJSON(store, 'r/' + code);
    if (!room || now - room.created > ROOM_HOURS * 3600e3) fail(404, 'No game with that code. Check it and try again.');
    return room;
  }
  const player = (room, body) => {
    const pid = String(body.pid || ''), p = room.players[pid];
    if (!p || p.tok !== String(body.tok || '')) fail(403, 'You’re not in this game. Join with the code first.');
    return pid;
  };

  async function route(method, path, body) {
    const now = clock();
    if (path === '/today' && method === 'POST') {
      const me = await who(body);
      if (BREW && !(me && me.role)) return { now, brew: true, role: null, canHost: false, daily: null, decks: [] };
      const today = pacificDate(now);
      const { no, deck } = dailyDeck(decks, today);
      const daily = deck ? {
        no, date: today, deck: { id: deck.id, title: deck.title, type: deck.type, blurb: deck.blurb },
        cards: deal(deck, 'daily:' + today).map((d) => publicCard(d, true, 'daily:' + today)),
      } : null;
      return { now, brew: BREW, role: me ? me.role : null, name: me ? me.name : null, canHost: canHost(me), daily, decks: deckList(!!(me && me.role)) };
    }
    if (path === '/rooms' && method === 'POST') {
      const me = await who(body);
      if (!canHost(me)) fail(403, 'Punchline is still being tested in Capra’s Lab. Only the lab’s crew can host for now.');
      const name = me ? me.name : cleanName(body.name);
      if (!name) fail(400, 'Type your name first.');
      const late = !!body.late;
      for (let tries = 0; tries < 6; tries++) {
        const code = rid(4, ROOM_ABC), pid = rid(10), tok = rid(20), crew = !!(me && me.role);
        const room = {
          code, created: now, game: 1, host: pid, deckId: String(body.deckId || ''), late, crew,
          deal: newDeal(String(body.deckId || ''), late, code + ':1', crew),
          players: { [pid]: { name, tok, joined: now, ...(me ? { lab: me.handle } : {}) } },
          startAt: null, times: [], answers: {},
        };
        const w = await store.set('r/' + code, room, { onlyIfNew: true });
        if (w && w.modified) return { code, pid, tok, room: view(room, pid, now) };
      }
      fail(503, 'Couldn’t find a free room code. Try again.');
    }
    const m = path.match(/^\/rooms\/([A-Z]{4})(\/[a-z]+)?$/);
    if (!m) fail(404, 'Not found.');
    const code = m[1], op = m[2] || '';
    if (method !== 'POST') fail(405, 'Use POST.');
    if (!op) {
      const room = await loadRoom(code, now);
      const p = room.players[String(body.pid || '')];
      return { room: view(room, p && p.tok === String(body.tok || '') ? String(body.pid) : null, now) };
    }
    if (op === '/join') {
      const me = await who(body);
      let out = null;
      const res = await mutate(store, 'r/' + code, (room) => {
        if (now - room.created > ROOM_HOURS * 3600e3) fail(404, 'No game with that code. Check it and try again.');
        const mine = me && Object.entries(room.players).find(([, p]) => p.lab === me.handle);
        if (mine) { out = { pid: mine[0], tok: mine[1].tok }; return SKIP; }
        if (Object.keys(room.players).length >= MAX_PLAYERS) fail(409, 'This game is full (12 players).');
        let name = me ? me.name : cleanName(body.name);
        if (!name) fail(400, 'Type your name first.');
        const taken = new Set(Object.values(room.players).map((p) => p.name.toLowerCase()));
        for (let k = 2; taken.has(name.toLowerCase()); k++) name = `${name.slice(0, 15)} ${k}`;
        const pid = rid(10), tok = rid(20);
        room.players[pid] = { name, tok, joined: now, ...(me ? { lab: me.handle } : {}) };
        out = { pid, tok };
      });
      if (!res) fail(404, 'No game with that code. Check it and try again.');
      return { ...out, room: view(res.data, out.pid, now) };
    }
    if (op === '/start' || op === '/again') {
      const res = await mutate(store, 'r/' + code, (room) => {
        if (player(room, body) !== room.host) fail(403, 'Only the host can do that.');
        if (op === '/start') {
          if (room.startAt) fail(409, 'This game already started.');
          room.startAt = now + COUNTDOWN_MS;
          room.times = schedule(dealOf(room).map((d) => d.card), room.startAt);
        } else {
          const end = room.times.length ? room.times[room.times.length - 1].end : 0;
          if (room.startAt && now < end) fail(409, 'Let this game finish first.');
          const late = body.late == null ? room.late : !!body.late;
          room.game += 1;
          room.deckId = String(body.deckId || room.deckId);
          room.late = late;
          room.deal = newDeal(room.deckId, late, `${code}:${room.game}`, room.crew);
          room.startAt = null; room.times = []; room.answers = {};
        }
      });
      if (!res) fail(404, 'No game with that code. Check it and try again.');
      return { room: view(res.data, String(body.pid), now) };
    }
    if (op === '/answer') {
      const i = Number(body.i), pick = Number(body.pick);
      if (!(pick >= 0 && pick <= 3) || !Number.isInteger(i)) fail(400, 'Pick A, B, C or D.');
      let first = null;
      const res = await mutate(store, 'r/' + code, (room) => {
        const pid = player(room, body);
        const t = room.times[i];
        if (!t || now < t.at) fail(409, 'Not yet: that card isn’t up.');
        if (now >= t.reveal) fail(409, 'Too late for that one.');
        room.answers[i] ||= {};
        if (room.answers[i][pid]) { first = room.answers[i][pid][0]; return SKIP; }   // one tap per card
        room.answers[i][pid] = [pick, now - t.at];
        first = pick;
      });
      if (!res) fail(404, 'No game with that code. Check it and try again.');
      return { ok: true, pick: first };
    }
    fail(404, 'Not found.');
  }

  async function handle(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/punchline/, '').replace(/^\/api/, '') || '/';
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    try {
      return Response.json(await route(req.method, path, body || {}), { headers: { 'cache-control': 'no-store' } });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error('punchline:', e);
      return Response.json({ error: status === 500 ? 'Something went wrong backstage. Try again.' : e.message }, { status, headers: { 'cache-control': 'no-store' } });
    }
  }

  return { route, handle };
}
