// Goat Getaway's server. Every call is a POST with an optional Capra Lab sign-in in the body
// (`lab: { name, code }`), never in the address. Without one you can still play the pen; with
// one the clock runs, the race board takes your time, ribbons are yours and diamonds go to
// your Mind Heist profile.
//
//   POST /today  { lab? }                -> today's pen (the board only once you've opened it),
//                                           your day, your ribbons, the top five
//   POST /open   { lab? }                -> the board; with a sign-in, the clock starts now
//   POST /solve  { lab?, date, moves }   -> replays the moves; first getaway is your time,
//                                           +1 diamond, +1 more at par
//   POST /hint   { lab?, date, moves }   -> the best next move from where you are (Nov 8 2026: JC
//                                           couldn't crack a Sunday pen). With a sign-in it's
//                                           counted: each hint adds HINT_MS to your first
//                                           getaway's time, and a day with hints earns no par
//                                           diamond, so the race board stays fair.
//
// Store `goat-getaway`: p/<handle> { day, pend, ribbons }, j/<date> the day's race board.
// Diamonds are written to Mind Heist's store: straight onto the linked profile (l/<handle> ->
// p/<pid>), or into gg/<handle> until that player links one in Mind Heist, which claims them.
import { replay, solve } from '../shared/puzzle.mjs';
import { daily, raceView, leader, pacificDate } from './daily.js';
import { mutate, SKIP } from './store.js';

export const HINT_MS = 15000;
const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const getJSON = async (s, k) => { const g = await s.get(k); return g ? g.data : null; };

export function createApi({ store, mh = null, verify, clock = () => Date.now() }) {
  async function who(body) {
    const lab = body && body.lab;
    if (!lab || !lab.name || !lab.code) return null;
    const p = await verify(String(lab.name).slice(0, 40), String(lab.code).slice(0, 12));
    if (!p) fail(401, 'Your Capra Lab name and key don’t match. Sign in to Capra Lab again.');
    return { name: p.name, handle: p.handle };
  }

  // Blue Ribbons: each day you got out is checked once that day is over. The day's fastest
  // getaway anywhere (ties: fewer moves, then earlier) wins it.
  async function settle(me, today) {
    const rec = await getJSON(store, 'p/' + me.handle);
    const due = ((rec && rec.pend) || []).filter((d) => d < today);
    if (!due.length) return { rec, won: [] };
    const won = [];
    for (const d of due) if (leader(await getJSON(store, 'j/' + d)) === me.handle) won.push(d);
    const { data } = await mutate(store, 'p/' + me.handle, (r) => {
      r.pend = (r.pend || []).filter((d) => d >= today);
      r.ribbons ||= [];
      for (const d of won) if (!r.ribbons.includes(d)) r.ribbons.push(d);
    });
    return { rec: data, won };
  }

  const linked = async (handle) => !!(mh && ((await getJSON(mh, 'l/' + handle)) || {}).pid);

  async function payMindHeist(handle, n) {
    if (!mh || n <= 0) return null;
    try {
      const link = await getJSON(mh, 'l/' + handle);
      if (link && link.pid && (await mutate(mh, 'p/' + link.pid, (p) => { p.gems = (p.gems || 0) + n; }))) return 'mind-heist';
      await mutate(mh, 'gg/' + handle, (o) => { o.gems = (o.gems || 0) + n; }, () => ({ gems: 0 }));
      return 'waiting';
    } catch (e) {
      console.error('goat-getaway: diamonds for', handle, 'not paid:', e.message);
      return null;
    }
  }

  const penOut = (t, withBoard) => ({ no: t.no, date: t.date, day: t.day, tier: t.tier, tierName: t.tierName, par: t.par, board: withBoard ? t.board : null });
  const mine = (rec, today) => {
    const d = rec && rec.day && rec.day.date === today ? rec.day : null;
    const ribbons = (rec && rec.ribbons) || [];
    return { open: d ? d.open : null, ms: d ? d.ms ?? null : null, moves: d ? d.moves ?? null : null, best: d ? d.best ?? null : null, parGem: !!(d && d.parGem), hints: d ? d.hints || 0 : 0, ribbons: ribbons.length, ribbonList: ribbons.slice(-30) };
  };

  async function route(method, path, body) {
    if (method !== 'POST') fail(405, 'Use POST.');
    const now = clock(), today = pacificDate(now), t = daily(today);
    if (path === '/today') {
      const me = await who(body);
      const race = await getJSON(store, 'j/' + today);
      if (!me) return { now, pen: penOut(t, false), me: null, race: raceView(race, null) };
      const { rec, won } = await settle(me, today);
      const m = mine(rec, today);
      return { now, pen: penOut(t, m.open != null), me: { name: me.name, ...m, ribbonNews: won, mindHeist: await linked(me.handle) }, race: raceView(race, me.handle) };
    }
    if (path === '/open') {
      const me = await who(body);
      if (!me) return { now, pen: penOut(t, true), me: null, guest: true };
      const { data } = await mutate(store, 'p/' + me.handle, (r) => {
        if (r.day && r.day.date === today) return SKIP;
        r.day = { date: today, open: now, ms: null, moves: null, best: null, parGem: false };
      }, () => ({ pend: [], ribbons: [] }));
      return { now, pen: penOut(t, true), me: { name: me.name, ...mine(data, today) } };
    }
    if (path === '/solve') {
      if (String((body && body.date) || today) !== today) fail(409, 'That pen closed at midnight. Today’s is waiting.');
      const r = replay(t.board, body && body.moves);
      if (!r.ok || !r.out) fail(400, 'That doesn’t get the goat out. Try again.');
      const me = await who(body);
      if (!me) return { now, guest: true, moves: r.n, par: t.par };
      let first = false, gained = 0, ms = null;
      const res = await mutate(store, 'p/' + me.handle, (rec) => {
        if (!rec.day || rec.day.date !== today) fail(409, 'Open today’s pen first.');
        first = rec.day.ms == null;
        let changed = first;
        if (first) {
          rec.day.ms = Math.max(0, now - rec.day.open) + (rec.day.hints || 0) * HINT_MS;
          rec.day.moves = r.n;
          gained += 1;
          rec.pend = [...(rec.pend || []).filter((d) => d !== today), today].slice(-10);
        }
        if (rec.day.best == null || r.n < rec.day.best) { rec.day.best = r.n; changed = true; }
        if (r.n <= t.par && !rec.day.parGem && !rec.day.hints) { rec.day.parGem = true; gained += 1; changed = true; }
        ms = rec.day.ms;
        if (!changed) return SKIP;
      });
      if (!res) fail(409, 'Open today’s pen first.');
      let board;
      if (first) {
        board = (await mutate(store, 'j/' + today, (b) => {
          b.e ||= {};
          if (b.e[me.handle] || Object.keys(b.e).length >= 5000) return SKIP;
          b.e[me.handle] = [ms, r.n, now, me.name];
        }, () => ({ d: today, e: {} }))).data;
      } else board = await getJSON(store, 'j/' + today);
      const paid = gained ? await payMindHeist(me.handle, gained) : null;
      return { now, first, gained, paid, ms, moves: r.n, par: t.par, me: { name: me.name, ...mine(res.data, today) }, race: raceView(board, me.handle) };
    }
    if (path === '/hint') {
      if (String((body && body.date) || today) !== today) fail(409, 'That pen closed at midnight. Today’s is waiting.');
      const r = replay(t.board, body && body.moves);
      if (!r.ok) fail(400, 'Those moves don’t fit today’s pen. Reset it and try again.');
      if (r.out || r.n < ((body && body.moves) || []).length) fail(409, 'The goat’s already out!');
      const s = solve(r.board);
      if (!s || !s.path.length) fail(409, 'No hint from here. Reset the pen and try again.');
      const me = await who(body);
      let hints = 0, counted = false;
      if (me) {
        const res = await mutate(store, 'p/' + me.handle, (rec) => {
          if (!rec.day || rec.day.date !== today) fail(409, 'Open today’s pen first.');
          rec.day.hints = (rec.day.hints || 0) + 1;
          counted = rec.day.ms == null;   // only hints before your first getaway cost time
        });
        if (!res) fail(409, 'Open today’s pen first.');
        hints = res.data.day.hints;
      }
      return { now, move: s.path[0], left: s.par, hints, penalty: counted ? HINT_MS : 0 };
    }
    fail(404, 'Not found.');
  }

  // Netlify Functions v2: Request in, Response out.
  async function handle(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/goat-getaway/, '').replace(/^\/api/, '') || '/';
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    try {
      return Response.json(await route(req.method, path, body), { headers: { 'cache-control': 'no-store' } });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error('goat-getaway:', e);
      return Response.json({ error: status === 500 ? 'Something went wrong in the barn. Try again.' : e.message }, { status, headers: { 'cache-control': 'no-store' } });
    }
  }

  return { route, handle };
}
