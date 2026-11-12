/* Capra Lab's wallet, the server side: diamonds, amber and shards, one wallet per lab player. The
 * currencies, what each game pays and the caps are in public/lab/wallet-catalog.mjs.
 *
 * Store `capra-lab-wallet`, `w/<handle>`:
 *   { diamonds, amber, shards, day, today: { [game]: { amber, shards, refs } }, gm: { hunters, at }, log }
 *
 * Routes (POST, every body carries the lab sign-in { name, code }):
 *   /api/wallet/me     the balances, what's been earned today and the last few payments
 *   /api/wallet/earn   { game, event, ref }  a game page claims what a finished game pays (EARN):
 *                      at most DAY_CAP a game a day, and a `ref` already paid pays nothing
 *   /api/wallet/sync   { game: 'glacial-maw', d: { amber, shards, diamonds }, link?, hunter? }
 *                      Glacial Maw's difference since it last synced; it gets the totals back.
 *                      The first sync (`link`) brings the hunter's whole balance in.
 *
 * Games with their own server pay with pay(handle, { diamonds, amber, shards }, { game, why }):
 * they checked the feat, so no cap. */
import { COINS, ORDER, DAY_CAP, EARN, SYNC_MAX, walletDay } from '../public/lab/wallet-catalog.mjs';
import { mutate, SKIP } from './casstore.js';

export const STORE = 'capra-lab-wallet';
const keyOf = (handle) => 'w/' + handle;
const HANDLE = /^[a-z0-9-]{2,24}$/;
const LOG_KEEP = 40, REFS_KEEP = 60, HUNTERS_KEEP = 8;
const blank = () => ({ diamonds: 0, amber: 0, shards: 0, day: null, today: {}, gm: null, log: [] });

function fail(status, error, code) {
  const e = new Error(error);
  e.status = status; e.code = code || null;
  return e;
}
const int = (n) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : 0);

export function createWallet({ store, clock = () => Date.now(), verify = null }) {
  const check = (handle) => { if (!HANDLE.test(String(handle || ''))) throw fail(400, 'That isn’t a lab player.'); };

  function view(w, now = clock()) {
    const r = w || blank(), day = walletDay(now);
    const today = r.day === day ? r.today || {} : {};
    const earned = {};
    for (const g of Object.keys(today)) earned[g] = { amber: today[g].amber || 0, shards: today[g].shards || 0, diamonds: today[g].diamonds || 0 };
    return {
      diamonds: r.diamonds || 0, amber: r.amber || 0, shards: r.shards || 0,
      day, today: earned,
      gm: r.gm && r.gm.hunters && r.gm.hunters.length ? { linked: true, at: r.gm.at || null } : { linked: false },
      log: (r.log || []).slice(-10).reverse(),
    };
  }
  async function read(handle) {
    check(handle);
    const got = await store.get(keyOf(handle));
    return got ? got.data : blank();
  }
  // a new day clears the per-game counts
  function roll(w, day) {
    if (w.day !== day) { w.day = day; w.today = {}; }
    w.today ||= {};
  }
  function note(w, now, game, why, pay) {
    (w.log ||= []).push({ at: now, game, why, ...pay });
    if (w.log.length > LOG_KEEP) w.log.splice(0, w.log.length - LOG_KEEP);
  }

  // A game's server pays for something it checked.
  async function pay(handle, amounts, { game = 'lab', why = '' } = {}) {
    check(handle);
    const now = clock(), day = walletDay(now);
    const add = {};
    for (const k of ORDER) { const n = int(amounts && amounts[k]); if (n > 0) add[k] = n; }
    if (!Object.keys(add).length) return { paid: {}, ...view(await read(handle), now) };
    const { data } = await mutate(store, keyOf(handle), (w) => {
      roll(w, day);
      for (const k of Object.keys(add)) w[k] = (w[k] || 0) + add[k];
      const t = (w.today[game] ||= {});
      for (const k of Object.keys(add)) t[k] = (t[k] || 0) + add[k];
      note(w, now, game, why, add);
    }, blank);
    return { paid: add, ...view(data, now) };
  }

  // A game page claims what a finished game pays; capped a game a day, a ref pays once.
  async function earn(handle, game, event, ref = '') {
    check(handle);
    const g = EARN[game], rule = g && event !== 'name' ? g[event] : null;
    if (!rule) throw fail(400, 'That game doesn’t pay for that.');
    const now = clock(), day = walletDay(now);
    ref = String(ref || '').slice(0, 80);
    let paid = {};
    const { data } = await mutate(store, keyOf(handle), (w) => {
      roll(w, day);
      paid = {};
      const t = (w.today[game] ||= {});
      t.refs ||= [];
      const tag = ref ? event + ':' + ref : '';
      if (tag && t.refs.includes(tag)) return SKIP;
      for (const k of ['amber', 'shards']) {
        const room = Math.max(0, DAY_CAP[k] - (t[k] || 0));
        const n = Math.min(int(rule[k]), room);
        if (n > 0) { paid[k] = n; t[k] = (t[k] || 0) + n; w[k] = (w[k] || 0) + n; }
      }
      if (tag) { t.refs.push(tag); if (t.refs.length > REFS_KEEP) t.refs.splice(0, t.refs.length - REFS_KEEP); }
      if (!Object.keys(paid).length && !tag) return SKIP;
      if (Object.keys(paid).length) note(w, now, game, rule.why || event, paid);
    }, blank);
    const capped = !Object.keys(paid).length;
    return { paid, capped, ...view(data, now) };
  }

  // Glacial Maw: apply its difference, never below zero, and send the totals back.
  async function sync(handle, d, { link = false, hunter = '' } = {}) {
    check(handle);
    const now = clock(), day = walletDay(now);
    const delta = {};
    for (const k of ORDER) {
      const n = int(d && d[k]);
      if (Math.abs(n) > SYNC_MAX[k]) throw fail(400, `That’s more ${COINS[k].many} than one sync can move.`);
      if (n) delta[k] = n;
    }
    hunter = String(hunter || '').slice(0, 60);
    let moved = {};
    const { data } = await mutate(store, keyOf(handle), (w) => {
      roll(w, day);
      moved = {};
      const linked = !!(w.gm && w.gm.hunters && w.gm.hunters.length);
      if (!link && !linked) throw fail(409, 'Link your Glacial Maw hunter to Capra Lab first.', 'not_linked');
      if (link) {
        w.gm ||= { hunters: [], at: now };
        if (hunter && !w.gm.hunters.includes(hunter)) w.gm.hunters.push(hunter);
        if (!w.gm.hunters.length) w.gm.hunters.push('hunter');
        if (w.gm.hunters.length > HUNTERS_KEEP) w.gm.hunters.splice(0, w.gm.hunters.length - HUNTERS_KEEP);
        w.gm.at = now;
      }
      for (const k of Object.keys(delta)) {
        const before = w[k] || 0, after = Math.max(0, before + delta[k]);
        if (after !== before) { moved[k] = after - before; w[k] = after; }
      }
      if (!Object.keys(moved).length && !link) return SKIP;
      const gains = {};
      for (const k of Object.keys(moved)) if (moved[k] > 0) gains[k] = moved[k];
      const t = (w.today['glacial-maw'] ||= {});
      for (const k of Object.keys(gains)) t[k] = (t[k] || 0) + gains[k];
      if (Object.keys(moved).length) note(w, now, 'glacial-maw', link ? 'linked a hunter' : 'hunting', moved);
    }, blank);
    return { moved, ...view(data, now) };
  }

  async function wallet(handle) { return view(await read(handle)); }

  async function route(method, path, body) {
    if (method !== 'POST') throw fail(405, 'Use POST.');
    const action = path.replace(/^.*\/api\/wallet\/?/, '').replace(/\/$/, '');
    if (!['me', 'earn', 'sync'].includes(action)) throw fail(404, 'Not found.');
    if (!verify) throw fail(500, 'The wallet can’t check sign-ins here.');
    const name = String((body && body.name) || ''), code = String((body && body.code) || '');
    const who = name && code ? await verify(name, code) : null;
    if (!who) throw fail(401, 'Sign in to Capra Lab to keep a wallet.', 'signin');
    if (action === 'me') return wallet(who.handle);
    if (action === 'earn') return earn(who.handle, String(body.game || ''), String(body.event || ''), body.ref);
    if (String(body.game || '') !== 'glacial-maw') throw fail(400, 'Only Glacial Maw syncs.');
    return sync(who.handle, body.d || {}, { link: !!body.link, hunter: body.hunter });
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
      const error = status === 500 && /blob/i.test(e.message) ? 'The wallet didn’t answer just then. Try again in a moment.' : e.message;
      return new Response(JSON.stringify({ error, code: e.code || null }), { status, headers });
    }
  }

  return { pay, earn, sync, wallet, view, route, handle: handleRequest };
}
