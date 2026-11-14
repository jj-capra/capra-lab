/* Trophy rooms and trap houses, the server side (JC, Nov 14 2026; the rules and numbers are in
 * public/lab/heist-rules.mjs). Anyone can watch a player's room on the security cameras; getting in
 * means making it through the owner's four traps in one go, one try a room a day. Caught: the owner
 * gets amber. In: the raider takes one trophy or the loot, and the room shuts for a while.
 *
 * Store `capra-lab-heist`:
 *   r/<handle>   the room: { handle, name, traps, lock, day, tries: { raider: 'run'|'caught'|'in' },
 *                log, caught, broken }
 *   x/<id>       a break-in: { id, owner, raider, at, until, state, step, traps, cur, res, took }
 *                state: run → caught | inside → done (or gone: time ran out inside)
 *   index        the room list: { rooms: [{ h, name, n, at }] }
 * Trophies and coins stay in the wallet (lab/wallet.js trophyCase, takeTrophy, takeLoot).
 *
 * Routes (/api/heist/*):
 *   GET  rooms                   the room list (most trophies first)
 *   GET  room?h=                 one room, as the cameras see it
 *   POST room   { h }            the same, plus `me` (signed in: can I break in?) and, for the owner, the trap library
 *   POST traps  { traps }        the owner sets the trap house: up to SLOTS of { kind, pick }
 *   POST start  { h }            break in: spends today's try, hands back the raid
 *   POST raid   { raid, go }     where the raid stands; `go` opens the current trap (its clock starts). Golf and
 *                                the goat pen open once: opening one again (the raider left its page) is caught
 *   POST answer { raid, ... }    one answer: { i, pick } for trivia and clues, { q } spin, { moves } goat,
 *                                { strokes } golf, or { give: true } to walk out (caught)
 *   POST take   { raid, pick, id }  inside: pick 'trophy' (id) or 'loot' (or 'none' in an empty room)
 * Every POST carries the lab sign-in { name, code }. */
import { mutate, SKIP } from './casstore.js';
import { walletDay } from '../public/lab/wallet-catalog.mjs';
import { SLOTS, TRAPS, QUIZ, SPIN, GOAT, GOLF, RAID_MS, PICK_MS, CATCH_PAY, BREAK_PAY, LOCKDOWN_MS,
  cleanTraps, trophyName, trophyKind } from '../public/lab/heist-rules.mjs';
import { TRIVIA, HOLES } from './heist-library.mjs';
import { ROUNDS } from '../games/three-clue-crew/rounds.js';
import { puzzle, check as spinCheck } from '../games/puzzled-spin/logic.mjs';
import PENS from '../games/goat-getaway/shared/puzzles.mjs';
import { replay } from '../games/goat-getaway/shared/puzzle.mjs';

export const STORE = 'capra-lab-heist';
const HANDLE = /^[a-z0-9-]{2,24}$/, RAID = /^[a-z0-9]{12}$/;
const CLUES = ROUNDS[4];
export const GOAT_PENS = GOAT.tiers.flatMap((t) => PENS.tiers[t]).map((s) => ({ board: s.slice(0, 36), par: Number(s.slice(36)) }));
const HOLE = Object.fromEntries(HOLES.map((h) => [h.id, h]));
const LOG_KEEP = 30, LOG_SHOW = 10, INDEX_KEEP = 80;
const ABC = 'abcdefghijkmnpqrstuvwxyz23456789';

const roomKey = (h) => 'r/' + h, raidKey = (id) => 'x/' + id;
function fail(status, error, code) { const e = new Error(error); e.status = status; e.code = code || null; return e; }
function rid(n) { const b = new Uint8Array(n); crypto.getRandomValues(b); return [...b].map((x) => ABC[x % 32]).join(''); }
const rand = (n) => { const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0] % n; };
function pickN(n, k) { const out = new Set(); while (out.size < Math.min(n, k)) out.add(rand(n)); return [...out]; }
function perm4() { const a = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const freshRoom = (handle, name = '') => ({ handle, name, traps: cleanTraps([]), lock: 0, day: null, tries: {}, log: [], caught: 0, broken: 0 });
const isQuiz = (k) => k === 'trivia' || k === 'clues';
const spins = new Map();
function spinOf(seed) {
  if (!spins.has(seed)) { if (spins.size > 200) spins.clear(); spins.set(seed, puzzle(SPIN.tier, SPIN.stage, seed)); }
  return spins.get(seed);
}
// How long a trap's clock runs once it's open (ms), grace included.
function limitOf(t) {
  if (isQuiz(t.kind)) return (QUIZ.secs + QUIZ.grace) * 1000;
  if (t.kind === 'spin') return (spinOf(t.seed).time + SPIN.grace) * 1000;
  if (t.kind === 'goat') return (GOAT.secs + GOAT.grace) * 1000;
  return GOLF.secs * 1000;
}
const penOf = (t) => GOAT_PENS[t.pen] || GOAT_PENS[0];
const maxMoves = (t) => penOf(t).par + GOAT.over;

export function createHeist({ store, wallet, verify = null, lookup = null, clock = () => Date.now() }) {
  const nameOf = async (h, cache) => {
    if (cache && cache.has(h)) return cache.get(h);
    let n = h;
    try { const p = lookup ? await lookup(h) : null; if (p && p.name) n = p.name; } catch { /* the handle will do */ }
    if (cache) cache.set(h, n);
    return n;
  };
  async function readRoom(h) { const got = await store.get(roomKey(h)); return got ? got.data : null; }
  function roll(room, day) { if (room.day !== day) { room.day = day; room.tries = {}; } room.tries ||= {}; }
  function note(room, e) { (room.log ||= []).push(e); if (room.log.length > LOG_KEEP) room.log.splice(0, room.log.length - LOG_KEEP); }
  async function index(h, name, n, now) {
    await mutate(store, 'index', (x) => {
      x.rooms ||= [];
      const i = x.rooms.findIndex((r) => r.h === h);
      const was = i >= 0 ? x.rooms[i] : null;
      if (was && was.name === name && was.n === n && now - was.at < 3600e3) return SKIP;
      if (i >= 0) x.rooms.splice(i, 1);
      x.rooms.unshift({ h, name, n, at: now });
      if (x.rooms.length > INDEX_KEEP) x.rooms.length = INDEX_KEEP;
    }, () => ({ rooms: [] })).catch(() => {});
  }

  /* ---------- what the cameras see ---------- */
  function trapLabel(t) {
    const T = TRAPS[t.kind];
    if (t.kind === 'golf' && t.pick && HOLE[t.pick]) return `${HOLE[t.pick].name} · par ${HOLE[t.pick].par}`;
    if (t.kind === 'goat' && t.pick != null && GOAT_PENS[t.pick]) return `Pen ${t.pick + 1} · par ${GOAT_PENS[t.pick].par}`;
    return T.what;
  }
  async function roomView(h, me = null) {
    if (!HANDLE.test(h)) throw fail(400, 'That isn’t a trophy room.');
    const now = clock(), cache = new Map();
    const [room, box] = await Promise.all([readRoom(h), wallet.trophyCase(h)]);
    const name = (room && room.name) || await nameOf(h, cache);
    if (!room && name === h && !box.trophies.length && !(me && me.handle === h)) {
      // no room, no trophies and nobody by that name: say so rather than show an empty vault
      const p = lookup ? await lookup(h).catch(() => null) : null;
      if (!p) throw fail(404, 'There’s no trophy room by that name.', 'none');
    }
    const r = room || freshRoom(h, name);
    cache.set(h, name);
    const trophies = [];
    for (const t of box.trophies.slice().reverse()) {
      trophies.push({ id: t.id, at: t.at, kind: trophyKind(t), name: trophyName(t), game: t.game, orig: t.orig || h,
        origName: t.orig && t.orig !== h ? await nameOf(t.orig, cache) : name, from: t.from || null, fromName: t.fromName || null, took: t.took || null });
    }
    const out = {
      owner: { handle: h, name }, look: box.look, trophies, loot: box.loot,
      traps: r.traps.map((t) => ({ kind: t.kind, pick: t.pick ?? null, label: trapLabel(t) })),
      lock: r.lock > now ? r.lock : 0, caught: r.caught || 0, broken: r.broken || 0,
      log: (r.log || []).slice(-LOG_SHOW).reverse(), now,
    };
    if (me) {
      const day = walletDay(now);
      const tried = r.day === day && r.tries ? r.tries[me.handle] || null : null;
      const own = me.handle === h;
      out.me = { handle: me.handle, own, tried, raid: tried && r.raids ? r.raids[me.handle] || null : null,
        canRaid: !own && !tried && !(r.lock > now), why: own ? 'own' : tried ? 'tried' : r.lock > now ? 'lockdown' : null };
      if (own) {
        out.library = { holes: HOLES.map((x) => ({ id: x.id, name: x.name, par: x.par, course: x.course })), pens: GOAT_PENS.map((p) => p.par) };
        out.log = (r.log || []).slice().reverse();
        if (!room || room.name !== me.name) await mutate(store, roomKey(h), (x) => { if (x.name === me.name) return SKIP; x.name = me.name; }, () => freshRoom(h, me.name));
        await index(h, me.name, trophies.length, now);
      }
    }
    return out;
  }
  async function rooms() {
    const got = await store.get('index');
    const list = got ? got.data.rooms || [] : [];
    return { rooms: list.slice().sort((a, b) => b.n - a.n || b.at - a.at).slice(0, 40) };
  }

  /* ---------- the owner's traps ---------- */
  async function setTraps(me, list) {
    const traps = cleanTraps(list, HOLES, GOAT_PENS.length);
    if (!Array.isArray(list) || !list.length) throw fail(400, 'Pick your traps.');
    await mutate(store, roomKey(me.handle), (x) => { x.traps = traps; x.name = me.name; }, () => freshRoom(me.handle, me.name));
    return roomView(me.handle, me);
  }

  /* ---------- breaking in ---------- */
  function content(t) {
    if (t.kind === 'trivia') return { kind: t.kind, qs: pickN(TRIVIA.length, QUIZ.n) };
    if (t.kind === 'clues') return { kind: t.kind, qs: pickN(CLUES.length, QUIZ.n), ord: Array.from({ length: QUIZ.n }, perm4) };
    if (t.kind === 'spin') return { kind: t.kind, seed: (rand(0x7fffffff) + 1) };
    if (t.kind === 'goat') return { kind: t.kind, pen: t.pick != null && GOAT_PENS[t.pick] ? t.pick : rand(GOAT_PENS.length) };
    return { kind: 'golf', hole: t.pick && HOLE[t.pick] ? t.pick : HOLES[rand(HOLES.length)].id };
  }
  async function start(me, h) {
    if (!HANDLE.test(h)) throw fail(400, 'That isn’t a trophy room.');
    if (h === me.handle) throw fail(400, 'That’s your own room. Send the link to someone who thinks they can get in.', 'own');
    const now = clock(), day = walletDay(now), id = rid(12);
    const ownerName = await nameOf(h);
    let traps = null;
    await mutate(store, roomKey(h), (r) => {
      roll(r, day);
      traps = null;
      if (r.tries[me.handle]) throw fail(409, 'You already tried this room today. Come back tomorrow.', 'tried');
      if (r.lock > now) throw fail(409, 'This room is on lockdown after a break-in. Try again later.', 'lockdown');
      r.tries[me.handle] = 'run';
      (r.raids ||= {});
      if (r.raids.day !== day) r.raids = { day };
      r.raids[me.handle] = id;
      r.name ||= ownerName;
      traps = r.traps.slice(0, SLOTS);
    }, () => freshRoom(h, ownerName));
    const raid = { id, owner: h, ownerName, raider: me.handle, raiderName: me.name, at: now, until: now + RAID_MS, state: 'run', step: 0,
      traps: traps.map(content), cur: { i: 0, strikes: 0, shown: null, marks: [] }, res: [], took: null };
    await store.set(raidKey(id), raid, { onlyIfNew: true });
    return raidView(raid, now);
  }

  // Time running out: a quiz question unanswered in time counts as wrong; any other trap, or the whole
  // raid running out, means caught. Returns true when it changed something.
  function settle(x, now) {
    if (x.state === 'inside' && now > (x.insideAt || x.at) + PICK_MS) { x.state = 'gone'; return true; }
    if (x.state !== 'run') return false;
    if (now > x.until) { catchAt(x, now); return true; }
    const t = x.traps[x.step];
    if (!x.cur.shown || now <= x.cur.shown + limitOf(t)) return false;
    if (isQuiz(t.kind)) { quizMark(x, t, false, now); return true; }
    catchAt(x, now); return true;
  }
  function catchAt(x, now) { x.state = 'caught'; x.caughtAt = now; x.res[x.step] = { ok: false, marks: x.cur.marks || [] }; }
  function pass(x, now) {
    x.res[x.step] = { ok: true, marks: x.cur.marks || [] };
    x.step += 1;
    x.cur = { i: 0, strikes: 0, shown: null, marks: [] };
    if (x.step >= x.traps.length) { x.state = 'inside'; x.insideAt = now; }
  }
  function quizMark(x, t, ok, now) {
    x.cur.marks.push(ok ? 1 : 0);
    if (!ok) x.cur.strikes += 1;
    x.cur.i += 1; x.cur.shown = null;
    if (x.cur.strikes >= QUIZ.strikes) catchAt(x, now);
    else if (x.cur.i >= QUIZ.n) pass(x, now);
  }

  function trapPublic(x, now) {
    const t = x.traps[x.step];
    if (!t || x.state !== 'run') return null;
    const base = { kind: t.kind, step: x.step };
    if (!x.cur.shown) return { ...base, open: false };
    const left = Math.max(0, x.cur.shown + limitOf(t) - now - (isQuiz(t.kind) ? QUIZ.grace : t.kind === 'spin' ? SPIN.grace : t.kind === 'goat' ? GOAT.grace : 0) * 1000);
    base.open = true; base.left = left;
    if (t.kind === 'trivia') {
      const q = TRIVIA[t.qs[x.cur.i]];
      return { ...base, i: x.cur.i, n: QUIZ.n, strikes: x.cur.strikes, q: { q: q.q, o: q.o, c: q.c, d: q.d, v: q.v } };
    }
    if (t.kind === 'clues') {
      const r = CLUES[t.qs[x.cur.i]], all = [r.answer, ...r.wrong];
      return { ...base, i: x.cur.i, n: QUIZ.n, strikes: x.cur.strikes, q: { clues: r.clues, o: t.ord[x.cur.i].map((k) => all[k]) } };
    }
    if (t.kind === 'spin') return { ...base, seed: t.seed, tier: SPIN.tier, stage: SPIN.stage };
    if (t.kind === 'goat') { const p = penOf(t); return { ...base, board: p.board, par: p.par, max: maxMoves(t), pen: t.pen }; }
    const h = HOLE[t.hole];
    return { ...base, hole: { id: h.id, name: h.name, par: h.par, course: h.course } };
  }
  function raidView(x, now = clock()) {
    return {
      id: x.id, owner: { handle: x.owner, name: x.ownerName }, raider: { handle: x.raider, name: x.raiderName },
      state: x.state, step: x.step, until: x.until, now,
      traps: x.traps.map((t, i) => ({ kind: t.kind, res: x.res[i] ? (x.res[i].ok ? 'ok' : 'caught') : null, marks: x.res[i] ? x.res[i].marks : null })),
      trap: trapPublic(x, now), took: x.took || null,
      pickBy: x.state === 'inside' ? (x.insideAt || x.at) + PICK_MS : null,
    };
  }
  async function readRaid(me, id) {
    if (!RAID.test(String(id || ''))) throw fail(400, 'That isn’t a break-in.');
    const got = await store.get(raidKey(id));
    if (!got) throw fail(404, 'That break-in is over.', 'gone');
    if (got.data.raider !== me.handle) throw fail(403, 'That’s someone else’s break-in.');
    return got.data;
  }
  // Change a raid; when it ends up caught, settle with the room and pay the owner once.
  async function change(me, id, fn) {
    await readRaid(me, id);
    const now = clock();
    let before = null, out = null;
    const r = await mutate(store, raidKey(id), (x) => {
      before = x.state; out = null;
      const moved = settle(x, now);
      if (x.state !== 'run' && x.state !== 'inside') return moved ? undefined : SKIP;
      const res = fn ? fn(x, now) : SKIP;
      if (res === SKIP) return moved ? undefined : SKIP;
      out = res;
    });
    const x = r.data;
    if (before !== x.state) await after(x, before, now);
    return { ...(out || {}), raid: raidView(x, now) };
  }
  async function after(x, before, now) {
    if (x.state === 'caught') {
      const t = x.traps[x.step];
      await mutate(store, roomKey(x.owner), (r) => {
        if (r.tries && r.tries[x.raider] === 'run') r.tries[x.raider] = 'caught';
        r.caught = (r.caught || 0) + 1;
        note(r, { at: now, h: x.raider, name: x.raiderName, what: 'caught', kind: t.kind, step: x.step });
      }, () => freshRoom(x.owner, x.ownerName));
      await wallet.pay(x.owner, CATCH_PAY, { game: 'trophy-room', why: `caught ${x.raiderName} in your ${TRAPS[t.kind].name}`, trophy: false }).catch(() => {});
    } else if (x.state === 'inside') {
      await mutate(store, roomKey(x.owner), (r) => { if (r.tries && r.tries[x.raider] === 'run') r.tries[x.raider] = 'in'; else return SKIP; }).catch(() => {});
    } else if (x.state === 'gone' && before === 'inside') {
      await brokeIn(x, { pick: 'none', name: 'nothing (ran out of time)' }, now);
    }
  }
  async function brokeIn(x, took, now) {
    await mutate(store, roomKey(x.owner), (r) => {
      r.broken = (r.broken || 0) + 1;
      r.lock = now + LOCKDOWN_MS;
      note(r, { at: now, h: x.raider, name: x.raiderName, what: 'in', took: took.name, pick: took.pick });
    }, () => freshRoom(x.owner, x.ownerName));
    await wallet.pay(x.raider, BREAK_PAY, { game: 'trophy-room', why: `broke into ${x.ownerName}’s trophy room`, trophy: false }).catch(() => {});
  }

  // Golf and the goat pen play on their own game's page; opening one a second time means the raider
  // left it part way (a reload would let them start the hole over), and leaving a trap trips the alarm.
  async function open(me, id, go) {
    return change(me, id, (x, now) => {
      if (x.state !== 'run' || !go) return SKIP;
      const t = x.traps[x.step];
      if (x.cur.shown) {
        if (t.kind !== 'golf' && t.kind !== 'goat') return SKIP;
        x.cur.left = true; catchAt(x, now);
        return { left: true };
      }
      x.cur.shown = now;
    });
  }
  async function answer(me, id, body) {
    return change(me, id, (x, now) => {
      if (x.state !== 'run') throw fail(409, 'You’re past the traps.', 'not_running');
      const t = x.traps[x.step];
      if (body.give) { x.cur.left = true; catchAt(x, now); return { ok: false, why: 'You walked out of the trap.' }; }
      if (!x.cur.shown) throw fail(409, 'Open the trap first.', 'closed');
      if (isQuiz(t.kind)) {
        if (Number(body.i) !== x.cur.i) return { ok: false, stale: true };   // its clock ran out first
        const pick = Number.isInteger(body.pick) ? body.pick : -1;
        const right = t.kind === 'trivia' ? TRIVIA[t.qs[x.cur.i]].a : t.ord[x.cur.i].indexOf(0);
        const ok = pick === right && now <= x.cur.shown + limitOf(t);
        const why = t.kind === 'clues' ? CLUES[t.qs[x.cur.i]].why : '';
        quizMark(x, t, ok, now);
        return { ok, right, why };
      }
      const late = now > x.cur.shown + limitOf(t);
      let ok = false, why = '';
      if (t.kind === 'spin') {
        const p = spinOf(t.seed);
        const q = Array.isArray(body.q) && body.q.length === p.n && body.q.every((row) => Array.isArray(row) && row.length === p.n && row.every(Number.isInteger)) ? body.q : null;
        ok = !!q && spinCheck(p, q).done && !late;
        why = !q || !spinCheck(p, q).done ? 'The picture isn’t whole.' : late ? 'Out of time.' : '';
      } else if (t.kind === 'goat') {
        const p = penOf(t), moves = Array.isArray(body.moves) ? body.moves : [];
        const r = replay(p.board, moves, 400);
        ok = r.ok && r.out && moves.length <= maxMoves(t) && !late;
        why = !(r.ok && r.out) ? 'The goat isn’t out.' : moves.length > maxMoves(t) ? `Too many moves (${moves.length}; the most is ${maxMoves(t)}).` : late ? 'Out of time.' : '';
      } else {
        const h = HOLE[t.hole], n = Number(body.strokes);
        if (!Number.isInteger(n) || n < 1 || n > 15) throw fail(400, 'That isn’t a score.');
        const quick = now - x.cur.shown < n * GOLF.perStroke * 0.4;
        ok = n <= h.par && !late && !quick;
        why = n > h.par ? `${n} on a par ${h.par}.` : late ? 'Out of time.' : quick ? 'That was too quick to be real.' : '';
      }
      x.cur.marks = [ok ? 1 : 0];
      if (ok) pass(x, now); else catchAt(x, now);
      return { ok, why };
    });
  }
  async function take(me, id, pick, tid) {
    const x0 = await readRaid(me, id);
    const now = clock();
    if (x0.state !== 'inside') { const v = await change(me, id, null); if (v.raid.state !== 'inside') throw fail(409, 'You’re not in the trophy room.', 'not_inside'); }
    if (!['trophy', 'loot', 'none'].includes(pick)) throw fail(400, 'Take a trophy or the loot.');
    // claim the pick first so two taps can't take twice; put it back if the wallet says no
    const claimed = await mutate(store, raidKey(id), (x) => {
      if (x.state !== 'inside') throw fail(409, 'You already took something.', 'taken');
      x.state = 'done'; x.took = { pick, at: now };
    });
    let took;
    try {
      const box = await wallet.trophyCase(x0.owner);
      if (pick === 'trophy') {
        const r = await wallet.takeTrophy(x0.owner, me.handle, String(tid || ''), { fromName: x0.ownerName, toName: me.name });
        took = { pick, id: r.trophy.id, name: r.name, kind: trophyKind(r.trophy) };
      } else if (pick === 'loot') {
        const r = await wallet.takeLoot(x0.owner, me.handle, { fromName: x0.ownerName, toName: me.name });
        if (!Object.keys(r.loot).length) throw fail(409, 'The loot pile is empty. Take a trophy instead.', 'empty');
        took = { pick, loot: r.loot, name: Object.entries(r.loot).map(([k, n]) => `${n} ${k}`).join(' and ') };
      } else {
        if (box.trophies.length || Object.keys(box.loot).length) throw fail(400, 'There’s something to take. Pick it.');
        took = { pick, name: 'bragging rights' };
      }
    } catch (e) {
      await mutate(store, raidKey(id), (x) => { if (x.state === 'done' && x.took && x.took.at === now) { x.state = 'inside'; x.took = null; } else return SKIP; }).catch(() => {});
      throw e;
    }
    const r = await mutate(store, raidKey(id), (x) => { x.took = { ...took, at: now }; });
    await brokeIn(r.data, took, now);
    return { took, raid: raidView(r.data, now), claimed: !!claimed };
  }

  /* ---------- the wire ---------- */
  async function route(method, path, body, query) {
    const action = path.replace(/^.*\/api\/heist\/?/, '').replace(/\/$/, '');
    if (method === 'GET' && action === 'rooms') return rooms();
    if (method === 'GET' && action === 'room') return roomView(String(query.get('h') || '').toLowerCase());
    if (method !== 'POST') throw fail(405, 'Use POST.');
    if (!['room', 'traps', 'start', 'raid', 'answer', 'take'].includes(action)) throw fail(404, 'Not found.');
    if (!verify) throw fail(500, 'The trophy rooms can’t check sign-ins here.');
    const name = String((body && body.name) || ''), code = String((body && body.code) || '');
    const me = name && code ? await verify(name, code) : null;
    if (!me) throw fail(401, 'Sign in to Capra Lab to break in.', 'signin');
    if (action === 'room') return roomView(String(body.h || me.handle).toLowerCase(), me);
    if (action === 'traps') return setTraps(me, body.traps);
    if (action === 'start') return start(me, String(body.h || '').toLowerCase());
    if (action === 'raid') return open(me, body.raid, !!body.go);
    if (action === 'answer') return answer(me, body.raid, body);
    return take(me, body.raid, String(body.pick || ''), body.id);
  }
  async function handleRequest(req) {
    const url = new URL(req.url);
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    let body = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Bad request.' }), { status: 400, headers }); }
    }
    try {
      return new Response(JSON.stringify(await route(req.method, url.pathname, body, url.searchParams)), { status: 200, headers });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error('heist', e);
      const error = status === 500 ? 'The trophy rooms didn’t answer just then. Try again in a moment.' : e.message;
      return new Response(JSON.stringify({ error, code: e.code || null }), { status, headers });
    }
  }
  return { roomView, rooms, setTraps, start, open, answer, take, route, handle: handleRequest };
}
