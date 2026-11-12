/* Capra Lab's daily Card Draw, the server side. The cards themselves, the odds and the day are in
 * public/lab/cards-catalog.mjs (the pages read the same file).
 *
 * Every lab player (by handle) has one record in the `capra-lab-cards` store, `h/<handle>`:
 *   { day, today: [4 cards], hand: [{ id, k, at }], used }
 * `day` is the last day they drew (Pacific); `today` is what they flipped that day; `hand` is every
 * prize card they hold until a game spends it.
 *
 * Routes (POST, every body carries the lab sign-in { name, code }):
 *   /api/cards/me     your hand and today's draw, if you've drawn
 *   /api/cards/draw   today's four cards (a second call the same day returns the same four)
 *   /api/cards/use    { k } spends one card of a kind the page plays itself (`self` in the catalog)
 *
 * Games with their own server (Screensaver, No Cap, Mind Heist) spend cards with take() and hand
 * them back with give() if the game refuses the play. */
import { DRAW, PRIZE_ODDS, HOLD_EACH, KINDS, DUDS, drawDay } from '../public/lab/cards-catalog.mjs';
import { mutate, SKIP } from './casstore.js';

export const STORE = 'capra-lab-cards';
const keyOf = (handle) => 'h/' + handle;
const blank = () => ({ day: null, today: [], hand: [], used: 0 });
const HANDLE = /^[a-z0-9-]{2,24}$/;

function fail(status, error, code) {
  const e = new Error(error);
  e.status = status; e.code = code || null;
  return e;
}
function counts(hand) {
  const out = {};
  for (const c of hand || []) out[c.k] = (out[c.k] || 0) + 1;
  return out;
}

export function createCards({ store, clock = () => Date.now(), random = Math.random, verify = null }) {
  let seq = 0;
  const newId = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : Date.now().toString(36)) + (++seq).toString(36);
  const check = (handle) => { if (!HANDLE.test(String(handle || ''))) throw fail(400, 'That isn’t a lab player.'); };

  function view(rec, now = clock()) {
    const day = drawDay(now);
    const r = rec || blank();
    return {
      day,
      drawn: r.day === day,
      today: r.day === day ? r.today : null,
      hand: counts(r.hand),
      cards: (r.hand || []).map((c) => ({ id: c.id, k: c.k })),
      used: r.used || 0,
    };
  }
  async function read(handle) {
    check(handle);
    const got = await store.get(keyOf(handle));
    return got ? got.data : blank();
  }

  // Today's four cards. Each is a prize (PRIZE_ODDS) of a kind you have room for, or a dud.
  async function draw(handle) {
    check(handle);
    const now = clock(), day = drawDay(now);
    const { data } = await mutate(store, keyOf(handle), (r) => {
      if (r.day === day) return SKIP;
      r.hand ||= [];
      const have = counts(r.hand), today = [];
      for (let i = 0; i < DRAW; i++) {
        const open = Object.keys(KINDS).filter((k) => (have[k] || 0) < HOLD_EACH);
        if (open.length && random() < PRIZE_ODDS) {
          const k = open[Math.floor(random() * open.length) % open.length];
          const card = { id: newId(), k, at: now };
          r.hand.push(card);
          have[k] = (have[k] || 0) + 1;
          today.push({ k, id: card.id });
        } else today.push({ k: 'dud', n: Math.floor(random() * DUDS.length) % DUDS.length });
      }
      r.day = day;
      r.today = today;
    }, blank);
    return view(data, now);
  }

  // Spend one card of a kind; null when you have none.
  async function take(handle, k) {
    check(handle);
    if (!KINDS[k]) throw fail(400, 'That isn’t a card.');
    let card = null;
    await mutate(store, keyOf(handle), (r) => {
      card = null;                     // a retry after someone else wrote starts over
      const i = (r.hand || []).findIndex((c) => c.k === k);
      if (i < 0) return SKIP;
      card = r.hand.splice(i, 1)[0];
      r.used = (r.used || 0) + 1;
    });
    return card;
  }
  // Hand a card back (the game refused the play).
  async function give(handle, card) {
    if (!card || !card.id) return;
    check(handle);
    await mutate(store, keyOf(handle), (r) => {
      r.hand ||= [];
      if (r.hand.some((c) => c.id === card.id)) return SKIP;
      r.hand.push(card);
      r.used = Math.max(0, (r.used || 0) - 1);
    }, blank);
  }
  async function count(handle, k) {
    return counts((await read(handle)).hand)[k] || 0;
  }
  async function hand(handle) {
    return view(await read(handle));
  }

  async function route(method, path, body) {
    if (method !== 'POST') throw fail(405, 'Use POST.');
    const action = path.replace(/^.*\/api\/cards\/?/, '').replace(/\/$/, '');
    if (!['me', 'draw', 'use'].includes(action)) throw fail(404, 'Not found.');
    if (!verify) throw fail(500, 'Cards can’t check sign-ins here.');
    const name = String((body && body.name) || ''), code = String((body && body.code) || '');
    const who = name && code ? await verify(name, code) : null;
    if (!who) throw fail(401, 'Sign in to Capra Lab to draw cards.', 'signin');
    if (action === 'me') return hand(who.handle);
    if (action === 'draw') return draw(who.handle);
    const k = String(body.k || '');
    if (!KINDS[k]) throw fail(400, 'That isn’t a card.');
    if (!KINDS[k].self) throw fail(400, `${KINDS[k].gameName} plays that card itself.`);
    const card = await take(who.handle, k);
    if (!card) throw fail(409, `You’re out of ${KINDS[k].name} cards. Draw again tomorrow.`, 'none');
    return { ok: true, card: { id: card.id, k: card.k }, ...(await hand(who.handle)) };
  }

  async function handleRequest(req) {
    const url = new URL(req.url);
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    let body = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Bad request.' }), { status: 400, headers }); }
    }
    try {
      return new Response(JSON.stringify(await route(req.method, url.pathname, body)), { status: 200, headers });
    } catch (e) {
      const status = e.status || 500;
      const error = status === 500 && /blob/i.test(e.message) ? 'The card store didn’t answer just then. Try again in a moment.' : e.message;
      return new Response(JSON.stringify({ error, code: e.code || null }), { status, headers });
    }
  }

  return { draw, take, give, count, hand, view, route, handle: handleRequest };
}
