// Par-Tee Time's Masters Course at /par-tee-time/api/masters/* (JC, Nov 11 2026: "allow users to
// create a mixed 18 holes of two different courses they can save and send to anyone in text as a
// challenge ... If they maintain their course best for a whole week they get a trophy. Each person
// they beat per match they get loot. This challenge is not in real time. It is just a chance at
// three challenges to best the course designer ... the designer can come back and best any new
// records that best them in the same amount of tries (three).")
//
// The rules, as built:
//   - A course is 18 holes from exactly two of the game's courses. The page sends the hole ids;
//     the server checks their shape only (it doesn't know the hole data).
//   - A counted round is a try. Starting one uses it up (quitting, or leaving it open TRY_MS, burns
//     it). The page posts the 18 hole scores when the round is done. Practice is page-only.
//   - The designer sets the first course best with up to three tries (and while no best exists, a
//     designer whose three tries all burned gets three more, so a course can't be stuck). Nobody
//     else can try until a best exists.
//   - Tries are per player per era. An era ends each time the best changes hands; then everyone but
//     the new holder has three tries at the new best. The holder can't try against their own best,
//     except the designer in era 0, who can use the rest of their three tries to lower it.
//   - Lower total beats it; a tie does not. Beat it and you hold the course best and get 1 loot;
//     the player you took it from (designer included) gets three fresh tries, as everyone does.
//   - Use up your three tries in an era without beating it and the holder gets 1 loot.
//   - Hold the best 7 days straight (TROPHY_MS) and you earn one trophy for that course, once per
//     holder per era, awarded lazily by whatever request next touches the course.
//
//   POST /masters/me      { lab }                                   your cabinet: loot, trophies, courses
//   POST /masters/player  { handle }                                anyone's loot and trophies (trophy room)
//   POST /masters/create  { lab, name, courses: [a, b], order, holes: [18 ids] }   -> { course }
//   POST /masters/course  { id, lab? }                              the course page
//   POST /masters/try     { id, lab }                               start a try: -> { try, left, course }
//   POST /masters/score   { id, lab, try, scores: [18 ints] }       post a try -> { result, course }
//   POST /masters/quit    { id, lab, try }                          burn an unfinished try
//   POST /masters/remove  { id, lab }                               the designer retires a course
//
// Store `par-tee-time` (beside the rooms' r/<CODE>):
//   m/<id>       { id, name, by, at, courses, order, holes, era, best, players, log, trophies, owed, retired }
//   mp/<handle>  { handle, name, loot, trophies: [{ course, name, at }], courses, played, keys }
// Loot and trophies are decided inside the course's compare-and-swap (as `owed`), then credited to
// each player's record idempotently (by key) and cleared from the course, so a retry can't pay twice.
import { mutate, SKIP } from './store.js';

export const HOLES = 18;
export const TRIES = 3;
export const TROPHY_MS = 7 * 24 * 3600e3;
export const TRY_MS = 4 * 3600e3;          // an unfinished try burns after four hours
export const MAX_COURSES = 12;             // courses a player can have built at once
export const MAX_PLAYED = 12;              // courses kept under "Challenges"
export const NAME_LEN = 24;
export const MAX_SCORE = 15;
export const ORDERS = ['alternate', 'split', 'climb', 'shuffle'];
const LOG_KEEP = 20, LOG_SHOW = 8, KEYS_KEEP = 300;

const fail = (status, error, code) => { const e = new Error(error); e.status = status; e.code = code || null; throw e; };
const ID = /^[a-z0-9]{6}$/, TRY_ID = /^[a-z0-9]{10}$/, HANDLE = /^[a-z0-9-]{1,24}$/;
const COURSE_ID = /^[a-z0-9][a-z0-9-]{0,23}$/, HOLE_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
const ABC = 'abcdefghijkmnpqrstuvwxyz23456789';   // 32 letters, so a byte maps evenly
function rid(n) { const b = new Uint8Array(n); crypto.getRandomValues(b); return [...b].map((x) => ABC[x % 32]).join(''); }
export function cleanCourseName(s) { return String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim(); }

const mKey = (id) => 'm/' + id, pKey = (h) => 'mp/' + h;
const freshPlayer = (me) => ({ handle: me.handle, name: me.name, loot: 0, trophies: [], courses: [], played: [], keys: [] });

export function createMasters({ store, verify, clock = () => Date.now() }) {
  async function who(body, required = true) {
    const lab = body && body.lab;
    if (!lab || typeof lab !== 'object' || !lab.name || !lab.code) {
      if (required) fail(401, 'Sign in to Capra Lab to build and challenge.', 'guest');
      return null;
    }
    const p = verify ? await verify(String(lab.name).slice(0, 40), String(lab.code).slice(0, 12)) : null;
    if (!p) fail(401, 'Your Capra Lab name and key don’t match. Sign in to Capra Lab again.', 'bad_key');
    return { name: String(p.name), handle: String(p.handle) };
  }
  const idOf = (body) => { const id = String((body && body.id) || '').toLowerCase(); if (!ID.test(id)) fail(400, 'That isn’t a Masters course link.', 'bad_id'); return id; };

  /* ---------- course rules ---------- */
  function owe(c, o) { (c.owed ||= []).push(o); }
  function log(c, e) { (c.log ||= []).unshift(e); if (c.log.length > LOG_KEEP) c.log.length = LOG_KEEP; }
  // A try ended without taking the best: if it was this player's third in the era, the holder beat them.
  function missed(c, h, t, now) {
    if (t.era === c.era && t.used >= TRIES && c.best && c.best.handle !== h) {
      owe(c, { kind: 'loot', key: `l:${c.id}:${c.era}:held:${h}`, handle: c.best.handle, name: c.best.name, course: c.id, courseName: c.name, at: now, beat: t.name });
    }
  }
  function burn(c, h, t, now, kind) {
    t.open = null; t.openAt = 0;
    log(c, { handle: h, name: t.name, total: null, kind, at: now });
    missed(c, h, t, now);
  }
  // Lazy upkeep on every touch: burn tries left open too long, and pay a 7-day hold its trophy.
  function sweep(c, now) {
    let changed = false;
    for (const [h, t] of Object.entries(c.players || {})) {
      if (t.open && now - t.openAt >= TRY_MS) { burn(c, h, t, now, 'timeout'); changed = true; }
    }
    const b = c.best;
    if (b && !b.trophy && now - b.since >= TROPHY_MS) {
      const at = b.since + TROPHY_MS;
      b.trophy = at;
      (c.trophies ||= []).push({ handle: b.handle, name: b.name, era: c.era, at });
      owe(c, { kind: 'trophy', key: `t:${c.id}:${c.era}`, handle: b.handle, name: b.name, course: c.id, courseName: c.name, at });
      changed = true;
    }
    return changed;
  }
  function triesFor(c, h) {
    const t = c.players && c.players[h];
    let used = t && t.era === c.era ? t.used : 0;
    if (!c.best && c.by.handle === h && used >= TRIES && !(t && t.open)) used = 0;   // a designer can't get stuck without a best
    return { t, used, left: Math.max(0, TRIES - used) };
  }
  function meView(c, me) {
    if (!me) return null;
    const designer = c.by.handle === me.handle, holder = !!(c.best && c.best.handle === me.handle);
    const { t, left } = triesFor(c, me.handle);
    let why = null;
    if (c.retired) why = 'retired';
    else if (!c.best && !designer) why = 'no_best';
    else if (holder && !(designer && c.era === 0)) why = 'holder';
    else if (!left) why = 'no_tries';
    return { handle: me.handle, designer, holder, left, canTry: !why, why, open: !!(t && t.open), pb: t && t.pb != null ? t.pb : null,
      takenFrom: !!(c.best && c.best.from && c.best.from.handle === me.handle) };
  }
  function bestView(c, now) {
    const b = c.best;
    return b ? { handle: b.handle, name: b.name, total: b.total, scores: b.scores, at: b.at, since: b.since, held: now - b.since, trophy: !!b.trophy, from: b.from ? b.from.name : null } : null;
  }
  function view(c, me, now) {
    return {
      id: c.id, name: c.name, by: c.by, at: c.at, courses: c.courses, order: c.order, holes: c.holes, era: c.era, retired: !!c.retired,
      best: bestView(c, now),
      log: (c.log || []).slice(0, LOG_SHOW).map((e) => ({ handle: e.handle, name: e.name, total: e.total, kind: e.kind, at: e.at })),
      trophies: (c.trophies || []).slice(-10).map((x) => ({ handle: x.handle, name: x.name, at: x.at })),
      challengers: Object.keys(c.players || {}).filter((h) => h !== c.by.handle).length,
      me: meView(c, me),
    };
  }
  function summary(c, me, now) {
    return { id: c.id, name: c.name, by: c.by, courses: c.courses, holes: c.holes, era: c.era, retired: !!c.retired, best: bestView(c, now), me: meView(c, me) };
  }

  /* ---------- storage ---------- */
  async function credit(o) {
    await mutate(store, pKey(o.handle), (p) => {
      p.keys ||= [];
      if (p.keys.includes(o.key)) return SKIP;
      p.keys.push(o.key);
      if (p.keys.length > KEYS_KEEP) p.keys.splice(0, p.keys.length - KEYS_KEEP);
      if (o.kind === 'loot') p.loot = (p.loot || 0) + 1;
      else (p.trophies ||= []).push({ course: o.course, name: o.courseName, at: o.at });
    }, () => freshPlayer(o));
  }
  async function flush(c) {
    const owed = (c && c.owed) || [];
    if (!owed.length) return;
    for (const o of owed) await credit(o);
    const done = new Set(owed.map((o) => o.key));
    await mutate(store, mKey(c.id), (x) => {
      const before = (x.owed || []).length;
      x.owed = (x.owed || []).filter((o) => !done.has(o.key));
      if (x.owed.length === before) return SKIP;
    });
  }
  // Change a course: upkeep first, then fn (which may return SKIP to leave it alone), then pay what's owed.
  async function change(id, now, fn) {
    let r;
    const out = await mutate(store, mKey(id), (c) => {
      const swept = sweep(c, now);
      r = fn ? fn(c) : SKIP;
      if (r === SKIP && !swept) return SKIP;
    });
    if (!out) fail(404, 'No Masters course with that link. Check it with your friend.', 'no_course');
    await flush(out.data);
    return out.data;
  }
  async function touch(id, now) { try { return await change(id, now, null); } catch (e) { if (e.code === 'no_course') return null; throw e; } }
  async function cabinet(handle, now, me) {
    const first = await store.get(pKey(handle));
    const p0 = first ? first.data : null;
    if (!p0) return { p: freshPlayer({ handle, name: me ? me.name : handle }), mine: [], played: [] };
    const ids = [...new Set([...(p0.courses || []), ...(p0.played || [])])];
    const courses = new Map();
    await Promise.all(ids.map(async (id) => { const c = await touch(id, now); if (c) courses.set(id, c); }));   // may pay trophies, so read the player after
    const got = await store.get(pKey(handle));
    const p = got ? got.data : p0;
    const list = (arr) => (arr || []).map((id) => courses.get(id)).filter(Boolean).map((c) => summary(c, me || { handle }, now));
    return { p, mine: list(p.courses), played: list((p.played || []).filter((id) => !(p.courses || []).includes(id))) };
  }
  const cabinetView = (p) => ({ handle: p.handle, name: p.name, loot: p.loot || 0, trophies: (p.trophies || []).map((t) => ({ course: t.course, name: t.name, at: t.at })) });

  /* ---------- routes ---------- */
  async function route(path, body) {
    const now = clock();
    const what = (path.match(/^\/masters\/([a-z]+)$/) || [])[1];

    if (what === 'player') {
      const handle = String(body.handle || '').toLowerCase();
      if (!HANDLE.test(handle)) fail(400, 'Bad player.', 'bad_handle');
      const { p } = await cabinet(handle, now, null);
      return cabinetView(p);
    }

    if (what === 'me') {
      const me = await who(body);
      const { p, mine, played } = await cabinet(me.handle, now, me);
      return { ...cabinetView(p), name: me.name, max: MAX_COURSES, courses: mine, played };
    }

    if (what === 'course') {
      const me = await who(body, false), id = idOf(body);
      const c = await change(id, now, null);
      return { now, course: view(c, me, now) };
    }

    if (what === 'create') {
      const me = await who(body);
      const name = cleanCourseName(body.name);
      if (!name) fail(400, 'Give your course a name.', 'bad_name');
      if (name.length > NAME_LEN) fail(400, `Course names are up to ${NAME_LEN} characters.`, 'bad_name');
      const courses = Array.isArray(body.courses) ? body.courses.map(String) : [];
      if (courses.length !== 2 || courses[0] === courses[1] || !courses.every((x) => COURSE_ID.test(x))) fail(400, 'Pick two different courses.', 'bad_courses');
      const order = String(body.order || '');
      if (!ORDERS.includes(order)) fail(400, 'Pick an order for the holes.', 'bad_order');
      const holes = Array.isArray(body.holes) ? body.holes.map(String) : [];
      if (holes.length !== HOLES || new Set(holes).size !== HOLES || !holes.every((x) => HOLE_ID.test(x))) fail(400, 'A Masters course is 18 different holes.', 'bad_holes');
      // claim a slot on the designer's shelf first, then write the course under a fresh id
      let id = '';
      for (let k = 0; k < 6 && !id; k++) { const x = rid(6); if (!(await store.get(mKey(x)))) id = x; }
      if (!id) fail(503, 'Couldn’t find a free link. Try again.');
      await mutate(store, pKey(me.handle), (p) => {
        p.name = me.name;
        p.courses ||= [];
        if (p.courses.length >= MAX_COURSES) fail(409, `You have ${MAX_COURSES} courses. Remove one to build another.`, 'cap');
        p.courses.unshift(id);
      }, () => freshPlayer(me));
      const c = { id, name, by: { handle: me.handle, name: me.name }, at: now, courses, order, holes, era: 0, best: null, players: {}, log: [], trophies: [], owed: [], retired: 0 };
      const made = await mutate(store, mKey(id), (x) => { if (x.id) fail(409, 'That link was just taken. Try again.'); Object.assign(x, c); }, () => ({}));
      return { now, course: view(made.data, me, now) };
    }

    if (what === 'try') {
      const me = await who(body), id = idOf(body), tryId = rid(10);
      let left = 0, noTries = false;
      const c = await change(id, now, (c) => {
        left = 0; noTries = false;                                     // mutate may run this again on a conflict
        const designer = c.by.handle === me.handle;
        if (c.retired) fail(409, 'The designer retired this course.', 'retired');
        if (!c.best && !designer) fail(409, `${c.by.name} hasn’t set the course best yet. Practice it until they do.`, 'no_best');
        if (c.best && c.best.handle === me.handle && !(designer && c.era === 0)) fail(409, 'You hold the course best. Send the link and let them come at you.', 'holder');
        c.players ||= {};
        const t = (c.players[me.handle] ||= { name: me.name, era: c.era, used: 0, open: null, openAt: 0, pb: null });
        t.name = me.name;
        if (t.open) burn(c, me.handle, t, now, 'quit');              // starting again burns the unfinished one
        if (t.era !== c.era) { t.era = c.era; t.used = 0; }
        if (!c.best && designer && t.used >= TRIES) t.used = 0;
        if (t.used >= TRIES) { noTries = true; return; }              // keep the burn, then say so
        t.used++; t.open = tryId; t.openAt = now;
        left = TRIES - t.used;
      });
      if (noTries) fail(409, 'No tries left on this course. If someone else takes the course best, you get three fresh ones.', 'no_tries');
      if (c.by.handle !== me.handle) {
        await mutate(store, pKey(me.handle), (p) => {
          p.name = me.name;
          const was = (p.played ||= []).indexOf(id);
          if (was === 0) return SKIP;
          if (was > 0) p.played.splice(was, 1);
          p.played.unshift(id);
          if (p.played.length > MAX_PLAYED) p.played.length = MAX_PLAYED;
        }, () => freshPlayer(me));
      }
      return { now, try: tryId, left, course: view(c, me, now) };
    }

    if (what === 'score') {
      const me = await who(body), id = idOf(body), tryId = String(body.try || '');
      if (!TRY_ID.test(tryId)) fail(400, 'Bad try.', 'bad_try');
      const scores = body.scores;
      if (!Array.isArray(scores) || scores.length !== HOLES || !scores.every((s) => Number.isInteger(s) && s >= 1 && s <= MAX_SCORE)) fail(400, `Scores are ${HOLES} whole numbers from 1 to ${MAX_SCORE}.`, 'bad_scores');
      const total = scores.reduce((a, b) => a + b, 0);
      let result = null;
      const c = await change(id, now, (c) => {
        const t = c.players && c.players[me.handle];
        if (!t || t.open !== tryId) fail(409, 'That try already ended (a try left open four hours, or one you started again, is burned).', 'try_over');
        t.open = null; t.openAt = 0; t.name = me.name;
        t.pb = t.pb == null ? total : Math.min(t.pb, total);
        const prev = c.best;
        let kind;
        if (!prev) { c.best = { handle: me.handle, name: me.name, total, scores, at: now, since: now, from: null, trophy: 0 }; kind = 'set'; }
        else if (prev.handle === me.handle) {
          if (total < prev.total) { Object.assign(prev, { name: me.name, total, scores, at: now }); kind = 'lowered'; } else kind = 'missed';
        } else if (total < prev.total) {
          owe(c, { kind: 'loot', key: `l:${c.id}:${c.era}:took:${me.handle}`, handle: me.handle, name: me.name, course: c.id, courseName: c.name, at: now, beat: prev.name });
          c.era += 1;
          c.best = { handle: me.handle, name: me.name, total, scores, at: now, since: now, from: { handle: prev.handle, name: prev.name, total: prev.total }, trophy: 0 };
          kind = 'took';
        } else kind = 'missed';
        log(c, { handle: me.handle, name: me.name, total, kind, at: now });
        if (kind === 'missed') missed(c, me.handle, t, now);
        result = { total, kind, tie: !!(prev && prev.handle !== me.handle && total === prev.total), beat: kind === 'took' ? { name: prev.name, total: prev.total } : null,
          holderGotLoot: kind === 'missed' && t.era === c.era && t.used >= TRIES && !!prev && prev.handle !== me.handle };
      });
      return { now, result, course: view(c, me, now) };
    }

    if (what === 'quit') {
      const me = await who(body), id = idOf(body), tryId = String(body.try || '');
      const c = await change(id, now, (c) => {
        const t = c.players && c.players[me.handle];
        if (!t || !t.open || t.open !== tryId) return SKIP;
        burn(c, me.handle, t, now, 'quit');
      });
      return { now, course: view(c, me, now) };
    }

    if (what === 'remove') {
      const me = await who(body), id = idOf(body);
      await change(id, now, (c) => {
        if (c.by.handle !== me.handle) fail(403, 'Only the designer can remove a course.', 'not_yours');
        if (c.retired) return SKIP;
        c.retired = now;
      });
      await mutate(store, pKey(me.handle), (p) => {
        const before = (p.courses || []).length;
        p.courses = (p.courses || []).filter((x) => x !== id);
        if (p.courses.length === before) return SKIP;
      });
      return { ok: true };
    }

    fail(404, 'Not found.');
  }
  return { route };
}
