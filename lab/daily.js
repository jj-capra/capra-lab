/* The daily challenge boards, the server side (the rules are public/lab/daily-boards.mjs).
 *
 * Store `capra-lab-daily`:
 *   d/<board>/<date>  { board, date, runs: { handle: { at } }, entries: { handle: { name, points, ms, at, detail } },
 *                       settled, winner }
 *   open              { list: ['<board>|<date>'] }  days with entries not settled yet
 *
 * Par-Tee Time's Daily 3 posts hole by hole (POST /api/daily/golf, below).
 * Games with a server (Mind Heist, No Cap) call begin() when an official daily run starts and post()
 * when it ends. Games without one (Three Clue Crew, Puzzled Spin) go through the routes, and this file
 * checks their answers against the same daily puzzles the page dealt:
 *   POST /api/daily/start  { name, code, board }           begin today's run (the clock starts the first time)
 *   POST /api/daily/finish { name, code, board, answers }  Three Clue Crew: the ten picks in order;
 *                                                           Puzzled Spin: [{ q, left, pts } | null] for the five
 *   POST /api/daily/golf   { name, code, board: 'par-tee-time', scores, open }
 *                                                           Par-Tee Time's Daily 3, hole by hole: the strokes so
 *                                                           far (kept once heard, never changed) and the hole that
 *                                                           is opening. A hole opened before and never finished
 *                                                           (left part way) goes down as double par. The third
 *                                                           hole posts the round: net of the handicap the run
 *                                                           started with, to par; timed from the first start.
 *   GET  /api/daily/board?b=&d=                             a board (today unless d=), plus yesterday's winner
 *                                                           (and the Daily 3's holes on the golf board)
 *   GET  /api/daily/today                                   today's leader on every board
 * Days settle lazily: any call after midnight Pacific settles the days still open, paying each winner
 * WIN_PAY with a `why` that mints the trophy (lab/wallet.js). */
import { mutate, SKIP } from './casstore.js';
import { walletDay } from '../public/lab/wallet-catalog.mjs';
import { BOARDS, WIN_MIN, WIN_PAY, ranked, winWhy, isLow, GOLF_HOLES, GOLF_MAX, golfNo } from '../public/lab/daily-boards.mjs';
import { cleanHcp, strokesFor } from '../public/lab/handicap-rules.mjs';
import { GOLF } from './heist-library.mjs';
import { ROUNDS } from '../games/three-clue-crew/rounds.js';
import { dailySet, dayNumber as tccDay, PER_GAME } from '../games/three-clue-crew/logic.mjs';
import { puzzle, check, dailySeed, dayNumber as spinDay, solvePoints, PER_RUN } from '../games/puzzled-spin/logic.mjs';

export const STORE = 'capra-lab-daily';
const SHOW = 20, OPEN_KEEP = 400;
function fail(status, error, code) { const e = new Error(error); e.status = status; e.code = code || null; return e; }
const keyOf = (board, date) => `d/${board}/${date}`;
const blank = (board, date) => ({ board, date, runs: {}, entries: {}, settled: false, winner: null });
// The Daily 3: one hole from each third of Par-Tee Time's courses (easy, middle, hard), three different
// themes, the same for everyone that day.
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const THIRDS = [[0, 1, 2], [3, 4, 5], [6, 7]];
export function golfDeal(date) {
  const r = seeded('par-tee-time:daily:' + date), used = new Set(), holes = [];
  for (const third of THIRDS) {
    let pool = GOLF.filter((h) => third.includes(h.ci) && !used.has(h.theme));
    if (!pool.length) pool = GOLF.filter((h) => third.includes(h.ci));
    const h = pool[Math.floor(r() * pool.length)];
    used.add(h.theme);
    holes.push({ id: h.id, name: h.name, par: h.par });
  }
  return { no: golfNo(date), holes, par: holes.reduce((a, h) => a + h.par, 0) };
}
function dayBefore(date) { const t = Date.parse(date + 'T12:00:00Z') - 86400000; return new Date(t).toISOString().slice(0, 10); }
function dayAfter(date) { const t = Date.parse(date + 'T12:00:00Z') + 86400000; return new Date(t).toISOString().slice(0, 10); }

export function createDaily({ store, wallet = null, verify = null, clock = () => Date.now() }) {
  const today = () => walletDay(clock());
  function check1(board) { if (!BOARDS[board]) throw fail(400, 'That isn’t a daily board.'); }

  // Today's official run starts (the first call; later ones hand back the same start).
  async function begin(board, me) {
    check1(board);
    const now = clock(), date = today();
    let first = false, run = null, posted = false;
    await mutate(store, keyOf(board, date), (d) => {
      d.runs ||= {};
      first = !d.runs[me.handle];
      if (first) d.runs[me.handle] = BOARDS[board].game === 'par-tee-time' ? { at: now, hcp: cleanHcp(me.hcp || 0), scores: [], opened: null } : { at: now };
      run = d.runs[me.handle]; posted = !!(d.entries && d.entries[me.handle]);
      if (!first) return SKIP;
    }, () => blank(board, date));
    return { board, date, first, at: run.at, posted, now };
  }
  // A finished official run goes on the board (once: the first finish is the one that counts).
  async function post(board, me, points, ms, detail = null, date = today()) {
    check1(board);
    const now = clock();
    let added = false;
    await mutate(store, keyOf(board, date), (d) => {
      added = false;
      d.entries ||= {};
      if (d.entries[me.handle] || d.settled) return SKIP;
      d.entries[me.handle] = { name: String(me.name || me.handle).slice(0, 17), points: Math.max(0, Math.round(points) || 0), ms: Math.max(0, Math.round(ms) || 0), at: now, detail };
      added = true;
    }, () => blank(board, date));
    if (added) await mutate(store, 'open', (o) => {
      o.list ||= [];
      const k = `${board}|${date}`;
      if (o.list.includes(k)) return SKIP;
      o.list.push(k);
      if (o.list.length > OPEN_KEEP) o.list.splice(0, o.list.length - OPEN_KEEP);
    }, () => ({ list: [] })).catch(() => {});
    return view(board, date, me);
  }

  // Close a past day: the #1 of a board with enough players takes the trophy and the diamond.
  function winnerOf(d, board) {
    const list = ranked(d.entries, isLow(board));
    return list.length >= WIN_MIN ? { handle: list[0].handle, name: list[0].name, points: list[0].points, ms: list[0].ms, of: list.length } : null;
  }
  async function payWinner(board, date, winner) {
    if (winner && wallet) await wallet.pay(winner.handle, WIN_PAY, { game: BOARDS[board].game, why: winWhy(board, date) }).catch((e) => console.error('daily pay', e));
  }
  async function settle(board, date) {
    let winner = null, flipped = false;
    await mutate(store, keyOf(board, date), (d) => {
      flipped = false; winner = null;      // a retried write starts over, so nobody is paid twice
      if (d.settled) return SKIP;
      winner = winnerOf(d, board);
      d.settled = true; d.winner = winner; flipped = true;
    }).catch(() => { flipped = false; });
    if (flipped) await payWinner(board, date, winner);
    return winner;
  }
  /* Days closed while a board needed two players (Nov 14 2026 until JC's call on Nov 16: a lone #1 wins
     too) left their lone #1 with nothing. Once, the first call after this went live closes them again
     under today's rule and pays them; `fix/solo` marks it done. */
  const FIRST_DAY = '2026-11-14';
  let soloFixed = false;
  async function fixSoloWins() {
    if (soloFixed) return 0;
    if (await store.get('fix/solo')) { soloFixed = true; return 0; }
    const t = today();
    let paid = 0;
    for (let date = FIRST_DAY; date < t; date = dayAfter(date)) {
      for (const board of Object.keys(BOARDS)) {
        const d = await read(board, date);
        if (!d || !d.settled || d.winner || !Object.keys(d.entries || {}).length) continue;
        let winner = null, flipped = false;
        await mutate(store, keyOf(board, date), (x) => {
          flipped = false; winner = null;
          if (!x.settled || x.winner) return SKIP;
          winner = winnerOf(x, board);
          if (!winner) return SKIP;
          x.winner = winner; x.resettled = clock(); flipped = true;
        }).catch(() => { flipped = false; });
        if (flipped) { await payWinner(board, date, winner); paid++; }
      }
    }
    await mutate(store, 'fix/solo', (f) => { if (f.at) return SKIP; f.at = clock(); f.paid = paid; }, () => ({})).catch(() => {});
    soloFixed = true;
    return paid;
  }
  async function settleDue() {
    const got = await store.get('open');
    const list = got ? got.data.list || [] : [];
    const t = today(), due = list.filter((k) => k.split('|')[1] < t);
    if (!due.length) return 0;
    for (const k of due) { const [b, d] = k.split('|'); await settle(b, d); }
    await mutate(store, 'open', (o) => { o.list = (o.list || []).filter((k) => !due.includes(k)); }, () => ({ list: [] })).catch(() => {});
    return due.length;
  }

  async function read(board, date) { const got = await store.get(keyOf(board, date)); return got ? got.data : null; }
  // Yesterday's winner, or its leader if the day hasn't been settled yet.
  function yesterdayOf(prev) {
    if (!prev) return null;
    if (prev.settled) return prev.winner ? { name: prev.winner.name, points: prev.winner.points, ms: prev.winner.ms, of: prev.winner.of } : null;
    const top = ranked(prev.entries, isLow(prev.board))[0];
    return top ? { name: top.name, points: top.points, ms: top.ms, of: Object.keys(prev.entries).length, pending: true } : null;
  }
  async function view(board, date = today(), me = null) {
    check1(board);
    const d = await read(board, date);
    const list = ranked(d ? d.entries : {}, isLow(board));
    const prev = await read(board, dayBefore(date));
    const out = {
      board, date, today: today(), of: list.length,
      list: list.slice(0, SHOW).map((e) => ({ rank: e.rank, name: e.name, handle: e.handle, points: e.points, ms: e.ms })),
      yesterday: yesterdayOf(prev),
      winMin: WIN_MIN,
    };
    if (BOARDS[board].game === 'par-tee-time') out.deal = golfDeal(date);
    if (me) {
      const mine = list.find((e) => e.handle === me.handle);
      out.me = mine ? { rank: mine.rank, points: mine.points, ms: mine.ms } : { started: !!(d && d.runs && d.runs[me.handle]) };
    }
    return out;
  }
  async function leaders() {
    const date = today(), out = [];
    for (const id of Object.keys(BOARDS)) {
      const d = await read(id, date);
      const list = ranked(d ? d.entries : {}, isLow(id));
      if (list.length) out.push({ board: id, of: list.length, top: { name: list[0].name, points: list[0].points, ms: list[0].ms } });
    }
    return { date, boards: out };
  }

  /* ---------- the games without a server: check their answers here ---------- */
  function scoreClues(board, date, answers) {
    const tier = Number(board.split(':')[1]);
    const ids = dailySet(ROUNDS[tier].length, tier, tccDay(date));
    if (!Array.isArray(answers) || answers.length !== ids.length) throw fail(400, 'That isn’t a full ten.');
    const marks = ids.map((id, i) => (String(answers[i] ?? '') === ROUNDS[tier][id].answer ? 1 : 0));
    const right = marks.reduce((a, b) => a + b, 0);
    return { points: right, detail: { right, of: PER_GAME, marks } };
  }
  function scoreSpin(board, date, answers, elapsed) {
    const tier = Number(board.split(':')[1]), no = spinDay(date);
    if (!Array.isArray(answers) || answers.length > PER_RUN) throw fail(400, 'That isn’t a run of five.');
    let total = 0, used = 0, solved = 0;
    const marks = [];
    for (let i = 0; i < PER_RUN; i++) {
      const a = answers[i];
      const p = puzzle(tier, i, dailySeed(tier, no, i));
      if (!a || !Array.isArray(a.q)) { marks.push(0); continue; }   // ran out of time, or never reached
      const q = a.q.length === p.n && a.q.every((r) => Array.isArray(r) && r.length === p.n && r.every(Number.isInteger)) ? a.q : null;
      if (!q || !check(p, q).done) throw fail(400, `Picture ${i + 1} isn’t whole.`);
      const left = Math.max(0, Math.min(p.time, Number(a.left) || 0));
      const most = solvePoints(p.time, 4) + 10 * p.n * p.n;     // the best a picture can pay (streak x3, every tile bonus)
      const pts = Math.max(0, Math.min(most, Math.round(Number(a.pts) || 0)));
      total += pts; used += p.time - left; solved++; marks.push(1);
    }
    // the clock on the pictures can't add up to more than the run really took
    if (used * 1000 > elapsed + 20000) throw fail(400, 'Those times don’t add up.');
    return { points: total, detail: { solved, of: PER_RUN, marks } };
  }
  async function finish(board, me, answers) {
    check1(board);
    const game = BOARDS[board].game;
    if (game === 'par-tee-time') throw fail(400, 'The Daily 3 posts hole by hole (golf).');
    if (game !== 'three-clue-crew' && game !== 'puzzled-spin') throw fail(400, 'That game posts its own daily runs.');
    const date = today(), d = await read(board, date);
    const run = d && d.runs && d.runs[me.handle];
    if (!run) throw fail(409, 'Start today’s run first.', 'not_started');
    if (d.entries && d.entries[me.handle]) return { ...(await view(board, date, me)), already: true };
    const elapsed = clock() - run.at;
    const s = game === 'three-clue-crew' ? scoreClues(board, date, answers) : scoreSpin(board, date, answers, elapsed);
    const out = await post(board, me, s.points, elapsed, s.detail, date);
    return { ...out, points: s.points, ms: elapsed };
  }

  /* ---------- Par-Tee Time's Daily 3, hole by hole ---------- */
  const golfOut = (deal, run, extra = {}) => ({ holes: deal.holes, no: deal.no, par: deal.par, scores: run ? run.scores || [] : [], opened: run ? run.opened : null, hcp: run ? run.hcp || 0 : 0, ...extra });
  async function golf(board, me, scores, open) {
    if (BOARDS[board].game !== 'par-tee-time') throw fail(400, 'That board isn’t golf.');
    const date = today(), deal = golfDeal(date), now = clock();
    let run = null, left = null, done = false, entry = null;
    const got = await mutate(store, keyOf(board, date), (d) => {
      left = null; done = false; entry = null;
      const r = d.runs && d.runs[me.handle];
      if (!r) throw fail(409, 'Start today’s round first.', 'not_started');
      if (d.entries && d.entries[me.handle]) { run = r; done = true; return SKIP; }
      r.scores ||= [];
      const before = JSON.stringify(r);
      // the strokes so far: what's kept stays; new holes are added in order
      const sent = Array.isArray(scores) ? scores.slice(0, GOLF_HOLES) : [];
      for (let i = r.scores.length; i < sent.length; i++) {
        const n = Math.round(Number(sent[i]));
        if (!Number.isFinite(n) || n < 1) break;
        r.scores.push(Math.min(GOLF_MAX, n));
      }
      // the hole opening: one opened before and never finished was left part way (double par)
      if (Number.isInteger(open) && open === r.scores.length && open < GOLF_HOLES) {
        if (r.opened === open) { r.scores.push(Math.min(GOLF_MAX, deal.holes[open].par * 2)); left = open; r.opened = null; }   // the page opens the next one itself
        else r.opened = open;
      }
      if (r.scores.length >= GOLF_HOLES) {
        const gross = r.scores.reduce((a, b) => a + b, 0), st = strokesFor(r.hcp || 0, GOLF_HOLES);
        d.entries ||= {};
        if (!d.settled) {
          entry = { name: String(me.name || me.handle).slice(0, 17), points: gross - st - deal.par, ms: Math.max(0, now - r.at), at: now, detail: { scores: r.scores.slice(), gross, st, hcp: r.hcp || 0 } };
          d.entries[me.handle] = entry;
        }
        r.opened = null; done = true;
      }
      run = r;
      if (JSON.stringify(r) === before && !entry) return SKIP;
    });
    if (!got || !run) throw fail(409, 'Start today’s round first.', 'not_started');
    if (entry) await mutate(store, 'open', (o) => {
      o.list ||= [];
      const k = `${board}|${date}`;
      if (o.list.includes(k)) return SKIP;
      o.list.push(k);
      if (o.list.length > OPEN_KEEP) o.list.splice(0, o.list.length - OPEN_KEEP);
    }, () => ({ list: [] })).catch(() => {});
    const out = { golf: golfOut(deal, run, { left, done }) };
    if (done) out.view = await view(board, date, me);
    return out;
  }

  /* ---------- the wire ---------- */
  async function route(method, path, body, query) {
    const action = path.replace(/^.*\/api\/daily\/?/, '').replace(/\/$/, '');
    await settleDue().catch((e) => console.error('daily settle', e));
    await fixSoloWins().catch((e) => console.error('daily solo fix', e));
    if (method === 'GET' && action === 'board') return view(String(query.get('b') || ''), /^\d{4}-\d{2}-\d{2}$/.test(query.get('d') || '') ? query.get('d') : today());
    if (method === 'GET' && action === 'today') return leaders();
    if (method !== 'POST') throw fail(405, 'Use POST.');
    if (!['start', 'finish', 'board', 'golf'].includes(action)) throw fail(404, 'Not found.');
    if (!verify) throw fail(500, 'The daily boards can’t check sign-ins here.');
    const name = String((body && body.name) || ''), code = String((body && body.code) || '');
    const me = name && code ? await verify(name, code) : null;
    if (!me) throw fail(401, 'Sign in to Capra Lab to get on the board.', 'signin');
    const board = String(body.board || '');
    if (action === 'board') return view(board, today(), me);
    if (action === 'start') {
      const b = await begin(board, me), v = await view(board, b.date, me);
      if (BOARDS[board].game !== 'par-tee-time') return { ...b, view: v };
      const d = await read(board, b.date);
      return { ...b, view: v, golf: golfOut(v.deal, d.runs[me.handle], { done: !!(d.entries && d.entries[me.handle]) }) };
    }
    if (action === 'golf') { check1(board); return golf(board, me, body.scores, body.open == null ? null : Number(body.open)); }
    return finish(board, me, body.answers);
  }
  async function handleRequest(req) {
    const url = new URL(req.url);
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Bad request.' }), { status: 400, headers }); } }
    try { return new Response(JSON.stringify(await route(req.method, url.pathname, body, url.searchParams)), { status: 200, headers }); }
    catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error('daily', e);
      return new Response(JSON.stringify({ error: status === 500 ? 'The daily board didn’t answer just then. Try again in a moment.' : e.message, code: e.code || null }), { status, headers });
    }
  }
  return { begin, post, view, settle, settleDue, fixSoloWins, leaders, finish, golf, route, handle: handleRequest, today };
}
