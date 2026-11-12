// Screensaver's server (JC, Nov 8 2026): today's date, the daily board, and posting a run.
// The boards come from shared/board.mjs, so the server replays a run from its guesses and scores
// it itself. One run counts per player per day (Pacific time); later runs are practice.
//
//   POST /hello  { lab? }                 { now, date, brew, canPlay, mine }
//   POST /board  { date? }                today's top runs
//   POST /run    { date, picks, lab, life? }  post the day's run: picks = [{ c, ms }]
//
// An Extra Life card from the lab's daily Card Draw (JC, Nov 2026; lab/cards.js, kind `ss-life`)
// gives today's counted run a fourth heart. The page sends `life` and the card is spent only when
// the run needed it (it went on past the third miss); the server then scores it with four lives.
//
// Store `screensaver`: d/<date> = { runs: { <handle>: { name, score, level, right, at } }, paid? }.
//
// The lab wallet (lab/wallet.js; JC, Nov 12 2026: pay by how rare): today's counted run pays RUN_PAY;
// the day's #1 gets DAY_TOP_PAY, settled the first time anyone says hello after that day ends
// (`paid` on the day's board holds who got it, so it's paid once).
import { score, MAX_LEVEL, LIVES } from '../shared/board.mjs';
import { mutate, SKIP } from './store.js';

// Screensaver is a JJ Brew (JC, Nov 8 2026): only Capra's Lab plays and posts. Set false when JC
// says it goes live (and take brew.js out of the page and the tile out of #clGames).
export const BREW = false;   // live for everyone since Nov 9 2026 (a JJ Brew before that)

const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
export const dayOf = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(ms));
export const daySeed = (date) => 'ss:' + date;
export const RUN_PAY = { amber: 30 }, DAY_TOP_PAY = { diamonds: 1 };

export function createApi({ store, verify, role = async () => null, clock = () => Date.now(), cards = null, wallet = null }) {
  async function who(body) {
    const lab = body && body.lab;
    if (!lab || !lab.name || !lab.code) return null;
    const p = await verify(String(lab.name).slice(0, 40), String(lab.code).slice(0, 12));
    if (!p) fail(401, 'Your Capra Lab name and key don’t match. Sign in to Capra Lab again.');
    return { name: p.name, handle: p.handle, role: await role(p.handle) };
  }
  const canPlay = (me) => !BREW || !!(me && me.role);

  function top(doc) {
    const runs = Object.entries((doc && doc.runs) || {}).map(([handle, r]) => ({ handle, ...r }));
    runs.sort((a, b) => b.score - a.score || b.level - a.level || a.at - b.at);
    return runs;
  }
  const rankOf = (list, handle) => { const i = list.findIndex((r) => r.handle === handle); return i < 0 ? null : i + 1; };
  const publicRow = (r) => ({ name: r.name, score: r.score, level: r.level, right: r.right });

  // The last two days' #1s get their diamond (once: `paid` is set in the same compare-and-swap).
  async function settle(now) {
    if (!wallet) return;
    for (const back of [1, 2]) {
      const date = dayOf(now - back * 86400000);
      if (date === dayOf(now)) continue;
      const g = await store.get('d/' + date);
      if (!g || !g.data || g.data.paid) continue;
      const first = top(g.data)[0];
      if (!first) continue;
      let won = false;
      await mutate(store, 'd/' + date, (doc) => { won = false; if (doc.paid) return SKIP; doc.paid = first.handle; won = true; });
      if (won) await wallet.pay(first.handle, DAY_TOP_PAY, { game: 'screensaver', why: `#1 on Screensaver, ${date}` }).catch((e) => console.error('screensaver: wallet pay failed', e.message));
    }
  }

  async function route(method, path, body) {
    const now = clock(), today = dayOf(now);
    if (method !== 'POST') fail(405, 'Use POST.');
    if (path === '/hello') {
      const me = await who(body);
      await settle(now).catch((e) => console.error('screensaver: settle failed', e.message));
      let mine = null;
      if (me) {
        const g = await store.get('d/' + today);
        const list = top(g && g.data), r = list.find((x) => x.handle === me.handle);
        if (r) mine = { ...publicRow(r), rank: rankOf(list, me.handle), of: list.length };
      }
      return { now, date: today, brew: BREW, role: me ? me.role : null, name: me ? me.name : null, canPlay: canPlay(me), mine };
    }
    if (path === '/board') {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || '')) ? body.date : today;
      const g = await store.get('d/' + date);
      const list = top(g && g.data);
      return { now, date, count: list.length, top: list.slice(0, 25).map(publicRow) };
    }
    if (path === '/run') {
      const me = await who(body);
      if (!me) fail(401, 'Sign in to Capra Lab to post a run.');
      if (!canPlay(me)) fail(403, 'Screensaver is still being tested in Capra’s Lab.');
      if (body.date !== today) fail(409, 'That was yesterday’s run. Today’s boards are new.');
      const picks = Array.isArray(body.picks) ? body.picks.slice(0, MAX_LEVEL).map((p) => ({ c: Number.isInteger(p && p.c) ? p.c : -1, ms: Math.min(25000, Math.max(0, Number(p && p.ms) || 0)) })) : [];
      let res = score(daySeed(today), picks);
      // the Extra Life: only for the run that counts, and only if it went on past the third miss
      let card = null;
      if (body.life && cards && res.over && picks.length > res.level) {
        const g = await store.get('d/' + today);
        if (!(g && g.data && g.data.runs && g.data.runs[me.handle])) {
          card = await cards.take(me.handle, 'ss-life');
          if (card) res = score(daySeed(today), picks, LIVES + 1);
        }
      }
      let counted = false;
      const out = await mutate(store, 'd/' + today, (doc) => {
        doc.runs ||= {};
        counted = false;
        if (doc.runs[me.handle]) return SKIP;               // the first run of the day counts
        doc.runs[me.handle] = { name: me.name, score: res.score, level: res.level, right: res.right, at: now, ...(card ? { life: 1 } : {}) };
        counted = true;
      }, () => ({ runs: {} }));
      if (card && !counted) { await cards.give(me.handle, card); card = null; }
      let paid = null;
      if (counted && wallet) paid = (await wallet.pay(me.handle, RUN_PAY, { game: 'screensaver', why: 'today’s run' }).catch(() => ({ paid: null }))).paid;
      const list = top(out.data);
      return { now, ...res, counted, life: !!card, paid, rank: rankOf(list, me.handle), of: list.length, top: list.slice(0, 25).map(publicRow) };
    }
    fail(404, 'Not found.');
  }

  async function handle(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/screensaver/, '').replace(/^\/api/, '') || '/';
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    try {
      return Response.json(await route(req.method, path, body || {}), { headers: { 'cache-control': 'no-store' } });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error('screensaver:', e);
      return Response.json({ error: status === 500 ? 'Something went wrong. Try again.' : e.message }, { status, headers: { 'cache-control': 'no-store' } });
    }
  }
  return { route, handle };
}
