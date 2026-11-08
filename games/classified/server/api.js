// Classified's server. JSON in, JSON out; a Capra Lab sign-in, when there is one, rides in the body
// (`lab: { name, code }`). Every room call carries the player's seat { pid, tok }.
//
//   POST /hello                         who's asking: { brew, role, canHost, name }
//   POST /rooms        { name?, avatar } open a new file (host) -> { code, pid, tok, room }
//   POST /rooms/:code/join              join with the code or the link -> { pid, tok, room }
//   POST /rooms/:code                   the room as this player sees it
//   POST /rooms/:code/me   { avatar?, reroll? }   change your agent (before the night starts)
//   POST /rooms/:code/op                host: a new operation name (before the night starts)
//   POST /rooms/:code/start             host: the night begins (3+ agents)
//   POST /rooms/:code/mission { slot, act: 'done' | 'swap' }
//   POST /rooms/:code/accuse  { agent } -> four missions to pick from; { agent, pick } -> burned or not
//   POST /rooms/:code/answer  { k, text }   a Who Said It answer (empty deletes)
//   POST /rooms/:code/vote    { k, for }    a Yearbook vote
//   POST /rooms/:code/drop                  host: open the next question now
//   POST /rooms/:code/remove  { agent }     host: take someone out of the file
//   POST /rooms/:code/declassify            host: the reveal begins
//   POST /rooms/:code/next                  host: next part of the reveal
//   POST /rooms/:code/guess   { step, for } who wrote this answer?
//   POST /rooms/:code/fire    { step }      vote the answer on screen onto the share page
//   POST /rooms/:code/confirm { step, card, ok }   the target says whether a mission really happened
//   POST /rooms/:code/hide    { step }      host: keep the answer on screen off the share page
//   POST /files/:id                         the share page's highlights
//
// Store `classified`: r/<CODE> rooms (36 hours), f/<id> the share files.
import {
  MAX_PLAYERS, MIN_PLAYERS, START_MISSIONS, MAX_MISSIONS, MAX_SWAPS, MISSION_EVERY, PROMPTS, PROMPT_EVERY, AWARDS, MAX_ACCUSE,
  ANSWER_MAX, GUESS_ROUNDS, GUESS_MS, SHOW_MS, ROOM_HOURS, POINTS, missionsAt, promptsAt,
} from '../shared/rules.mjs';
import { cleanAvatar, randomAvatar } from '../shared/avatar.mjs';
import { codename as newCodename, operationName } from './names.mjs';
import { tidy } from './filter.mjs';
import { mutate, SKIP } from './store.js';

// A JJ Brew (JC, Nov 2026): while true, only Capra's Lab members can open a file; anyone with a
// room link can join it, and anyone with a share link can read its highlights.
export const BREW = true;

const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const ABC = 'abcdefghijkmnpqrstuvwxyz23456789';
const ROOM_ABC = 'BCDFGHJKLMNPQRSTVWXZ';
const cleanName = (s) => tidy(String(s || '').replace(/[^\p{L}\p{N} ._'!?-]/gu, ''), 17);

export function createApi({ store, content, verify, role = async () => null, clock = () => Date.now(), rand = Math.random }) {
  const rid = (n, abc = ABC) => Array.from({ length: n }, () => abc[Math.floor(rand() * abc.length)]).join('');
  const shuffle = (list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const missionById = Object.fromEntries(content.missions.map((m) => [m.id, m]));

  async function who(body) {
    const lab = body && body.lab;
    if (!lab || !lab.name || !lab.code) return null;
    const p = await verify(String(lab.name).slice(0, 40), String(lab.code).slice(0, 12));
    if (!p) fail(401, 'Your Capra Lab name and key don’t match. Sign in to Capra Lab again.');
    return { name: p.name, handle: p.handle, role: await role(p.handle) };
  }
  const canHost = (me) => !BREW || !!(me && me.role);

  /* ---------- the room ---------- */
  const expired = (room, now) => now - room.created > ROOM_HOURS * 3600e3;
  async function load(code, now) {
    const g = await store.get('r/' + code);
    if (!g || expired(g.data, now)) fail(404, 'No file with that code. Check it and try again.');
    return g.data;
  }
  function seat(room, body) {
    const pid = String(body.pid || ''), p = room.players[pid];
    if (!p || p.tok !== String(body.tok || '')) fail(403, 'You’re not in this file. Join with the code first.');
    return pid;
  }
  const nameOf = (room, pid) => (room.players[pid] ? room.players[pid].name : (room.gone && room.gone[pid] ? room.gone[pid].name : 'someone'));
  const codeOf = (room, pid) => (room.players[pid] ? room.players[pid].codename : (room.gone && room.gone[pid] ? room.gone[pid].codename : 'AN AGENT'));
  const missionText = (room, card, codenames = false) => missionById[card.mid].text.replace('{target}', card.target ? (codenames ? `AGENT ${codeOf(room, card.target)}` : nameOf(room, card.target)) : 'someone');

  function addPlayer(room, { name, me, avatar, now }) {
    const taken = new Set(Object.values(room.players).map((p) => p.name.toLowerCase()));
    for (let k = 2; taken.has(name.toLowerCase()); k++) name = `${name.slice(0, 15)} ${k}`;
    const pid = rid(10), tok = rid(20);
    room.players[pid] = {
      name, tok, joined: now, codename: newCodename(rand, Object.values(room.players).map((p) => p.codename)),
      avatar: avatar ? cleanAvatar(avatar) : randomAvatar(rand), ...(me ? { lab: me.handle } : {}),
    };
    room.order.push(pid);
    if (room.phase === 'night') deal(room, pid, now);
    return { pid, tok };
  }

  // A hand of missions: the ones that will drop over the night plus the spares that come in when
  // you swap one. Targets go round the other agents so nobody is everyone's mark.
  function deal(room, pid, now) {
    const others = shuffle(room.order.filter((x) => x !== pid && room.players[x]));
    const used = new Set(Object.values(room.decks).flatMap((d) => d.cards.map((c) => c.mid)));
    const fresh = shuffle(content.missions.filter((m) => !used.has(m.id) && (others.length || !m.target)));
    const pool = fresh.length >= MAX_MISSIONS + MAX_SWAPS ? fresh : shuffle(content.missions.filter((m) => others.length || !m.target));
    let t = 0;
    const cards = pool.slice(0, MAX_MISSIONS + MAX_SWAPS).map((m) => ({ mid: m.id, target: m.target ? others[t++ % others.length] : null, status: 'active', at: 0 }));
    room.decks[pid] = { start: now, cards, slots: cards.slice(0, MAX_MISSIONS).map((_, i) => i), spare: MAX_MISSIONS, swaps: 0, accused: 0 };
  }
  const visibleSlots = (room, pid, now) => {
    const d = room.decks[pid];
    if (!d) return [];
    const until = room.reveal ? room.reveal.frozen : now;
    return d.slots.slice(0, missionsAt(until - d.start));
  };
  const openPrompts = (room, now) => (room.startedAt ? promptsAt((room.reveal ? room.reveal.frozen : now) - room.startedAt, room.opened) : 0);

  /* ---------- scores ---------- */
  function scores(room) {
    const s = {};
    const add = (pid, k, v) => { if (s[pid]) { s[pid][k] = (s[pid][k] || 0) + v; s[pid].total += v; } };
    for (const pid of Object.keys(room.players)) s[pid] = { total: 0, done: 0 };
    const until = room.reveal ? room.reveal.frozen : Infinity;
    for (const [pid, d] of Object.entries(room.decks)) {
      for (const idx of d.slots.slice(0, missionsAt(until - d.start))) {
        const c = d.cards[idx];
        if (c.status !== 'done') continue;
        const ok = room.reveal && room.reveal.confirms[`${pid}:${idx}`];
        if (ok === false) continue;   // the target said it never happened
        add(pid, 'missions', POINTS.mission + (ok === true ? POINTS.confirmed : 0));
        if (s[pid]) s[pid].done++;
      }
    }
    for (const b of room.burns) {
      if (b.ok) add(b.by, 'burns', POINTS.burn);
      else { add(b.by, 'burns', POINTS.wrongAccuse); add(b.agent, 'cover', POINTS.coverHeld); }
    }
    for (const a of Object.values(room.answers)) for (const [pid, text] of Object.entries(a)) if (text) add(pid, 'answers', POINTS.answer);
    if (room.reveal) {
      room.reveal.steps.forEach((st, i) => {
        if (st.type !== 'guess') return;
        for (const [pid, g] of Object.entries(room.reveal.guesses[i] || {})) {
          if (g === st.author) add(pid, 'guesses', POINTS.guess); else add(st.author, 'fooled', POINTS.fooled);
        }
      });
    }
    return s;
  }

  /* ---------- the reveal ---------- */
  // The step the reveal is on: guess rounds and their answers move on by themselves.
  function effective(room, now) {
    const r = room.reveal;
    let i = r.i, at = r.at;
    for (;;) {
      const st = r.steps[i];
      if (!st || i >= r.steps.length - 1) break;
      const key = `${st.k}:${st.author}`;
      let dur = st.type === 'guess' ? GUESS_MS : st.type === 'who' ? SHOW_MS : 0;
      if (st.type === 'guess') {
        const need = Object.keys(room.players).filter((p) => p !== st.author).length;
        const got = Object.keys(r.guesses[i] || {}).length;
        if (r.hidden.includes(key) || (need && got >= need)) dur = Math.min(dur, Math.max(0, (r.lastGuess[i] || at) - at));
      }
      if (!dur && st.type !== 'guess') break;
      if (now < at + dur) break;
      at += dur; i++;
    }
    return { i, at };
  }
  function buildReveal(room, now) {
    const steps = [{ type: 'title' }];
    // guess rounds: spread over as many authors and questions as possible
    const byAuthor = {};
    for (const [k, a] of Object.entries(room.answers)) for (const [pid, text] of Object.entries(a)) if (text && room.players[pid]) (byAuthor[pid] ||= []).push(+k);
    const authors = shuffle(Object.keys(byAuthor));
    for (const pid of authors) byAuthor[pid] = shuffle(byAuthor[pid]);
    const picked = [], usedK = {};
    while (picked.length < GUESS_ROUNDS && authors.some((p) => byAuthor[p].length)) {
      for (const pid of authors) {
        if (picked.length >= GUESS_ROUNDS || !byAuthor[pid].length) continue;
        // prefer a question that hasn't come up yet
        byAuthor[pid].sort((a, b) => (usedK[a] || 0) - (usedK[b] || 0));
        const k = byAuthor[pid].shift();
        usedK[k] = (usedK[k] || 0) + 1;
        picked.push({ k, author: pid });
      }
    }
    if (Object.keys(room.players).length >= MIN_PLAYERS) for (const p of shuffle(picked)) steps.push({ type: 'guess', ...p }, { type: 'who', ...p });
    steps.push({ type: 'missions' });
    for (const pid of room.order) if (room.players[pid] && room.decks[pid]) steps.push({ type: 'agent', pid });
    steps.push({ type: 'awards' });
    room.awards.forEach((_, k) => steps.push({ type: 'award', k }));
    steps.push({ type: 'final' });
    return { steps, i: 0, at: now, frozen: now, guesses: {}, lastGuess: {}, fire: {}, hidden: [], confirms: {} };
  }
  function awardResult(room, k) {
    const tally = {};
    for (const [voter, pid] of Object.entries(room.votes[k] || {})) if (room.players[voter] && room.players[pid]) tally[pid] = (tally[pid] || 0) + 1;
    const top = Math.max(0, ...Object.values(tally));
    return { winners: top ? Object.keys(tally).filter((p) => tally[p] === top) : [], votes: top };
  }
  function agentMissions(room, pid, codenames = false) {
    const d = room.decks[pid];
    return visibleSlots(room, pid, 0).map((idx) => {
      const c = d.cards[idx];
      return {
        card: idx, text: missionText(room, c, codenames), status: c.status === 'active' ? 'open' : c.status,
        by: c.by ? codeOf(room, c.by) : null, target: c.target, confirm: room.reveal ? (room.reveal.confirms[`${pid}:${idx}`] ?? null) : null,
      };
    });
  }

  /* ---------- what one player sees ---------- */
  function view(room, me, now) {
    const players = room.order.filter((pid) => room.players[pid]).map((pid) => {
      const p = room.players[pid];
      return { id: pid, name: p.name, codename: p.codename, avatar: p.avatar, host: pid === room.host, me: pid === me };
    });
    const out = { now, code: room.code, phase: room.phase, op: room.op, host: me === room.host, players, startedAt: room.startedAt || null };
    if (me && room.players[me]) out.me = { id: me, name: room.players[me].name, codename: room.players[me].codename, avatar: room.players[me].avatar };
    if (room.phase === 'night' && me && room.decks[me]) {
      const d = room.decks[me];
      out.missions = visibleSlots(room, me, now).map((idx, slot) => {
        const c = d.cards[idx];
        return { slot, text: missionText(room, c), status: c.status, at: c.at || null, by: c.by ? codeOf(room, c.by) : null };
      });
      const n = missionsAt(now - d.start);
      out.nextMissionAt = n < MAX_MISSIONS ? d.start + (n - START_MISSIONS + 1) * MISSION_EVERY : null;
      out.swapsLeft = MAX_SWAPS - d.swaps;
      out.accusesLeft = MAX_ACCUSE - d.accused;
      const open = openPrompts(room, now);
      out.prompts = room.prompts.slice(0, open).map((p, k) => ({ k, text: p.text, mine: (room.answers[k] || {})[me] || '', count: Object.values(room.answers[k] || {}).filter(Boolean).length }));
      out.promptTotal = PROMPTS;
      const due = room.startedAt + (open - 1) * PROMPT_EVERY;
      out.nextPromptAt = open < PROMPTS ? Math.max(now, due) : null;
      out.awards = room.awards.map((a, k) => ({ k, text: a.text, vote: (room.votes[k] || {})[me] || null, count: Object.keys(room.votes[k] || {}).length }));
      if (room.pending[me]) out.accusing = { agent: room.pending[me].agent, choices: room.pending[me].choices.map((c) => missionText(room, c)) };
      out.news = room.news.slice(-8).reverse();
    }
    if (room.phase === 'reveal') {
      const { i, at } = effective(room, now);
      const st = room.reveal.steps[i], r = room.reveal;
      const s = { type: st.type, i, total: r.steps.length, at };
      if (st.type === 'guess' || st.type === 'who') {
        const key = `${st.k}:${st.author}`;
        const hidden = r.hidden.includes(key);
        Object.assign(s, { prompt: room.prompts[st.k].text, answer: hidden ? null : room.answers[st.k][st.author], hidden, fire: (r.fire[key] || []).length, fired: !!(me && (r.fire[key] || []).includes(me)) });
        const gi = st.type === 'guess' ? i : i - 1;
        if (st.type === 'guess') {
          s.endsAt = at + GUESS_MS;
          s.mine = st.author === me;
          s.myGuess = me ? (r.guesses[i] || {})[me] || null : null;
          s.guessed = Object.keys(r.guesses[i] || {}).length;
          s.need = players.filter((p) => p.id !== st.author).length;
        } else {
          s.endsAt = at + SHOW_MS;
          s.author = st.author;
          s.guesses = r.guesses[gi] || {};
          s.right = Object.values(s.guesses).filter((g) => g === st.author).length;
          s.myGuess = me ? s.guesses[me] || null : null;
        }
      } else if (st.type === 'agent') {
        Object.assign(s, { agent: st.pid, missions: agentMissions(room, st.pid) });
      } else if (st.type === 'award') {
        Object.assign(s, { text: room.awards[st.k].text, ...awardResult(room, st.k) });
      } else if (st.type === 'final') {
        const sc = scores(room);
        s.scores = players.map((p) => ({ id: p.id, ...sc[p.id] })).sort((a, b) => b.total - a.total);
        s.file = room.file;
      } else if (st.type === 'title') {
        s.counts = { missions: Object.values(room.decks).reduce((n, d) => n + d.cards.filter((c) => c.status === 'done').length, 0), burns: room.burns.filter((b) => b.ok).length, answers: Object.values(room.answers).reduce((n, a) => n + Object.values(a).filter(Boolean).length, 0) };
      }
      out.step = s;
      out.file = room.file;
    }
    return out;
  }

  /* ---------- the share page: highlights only, codenames only ---------- */
  function snapshot(room, id) {
    const sc = scores(room);
    const agents = room.order.filter((p) => room.players[p]).map((p) => ({ codename: room.players[p].codename, avatar: room.players[p].avatar, score: sc[p].total, done: sc[p].done }))
      .sort((a, b) => b.score - a.score);
    const missions = [];
    let redacted = 0;
    for (const pid of room.order) {
      if (!room.players[pid] || !room.decks[pid]) continue;
      for (const m of agentMissions(room, pid, true)) {
        if (m.status === 'done' && m.confirm !== false) missions.push({ codename: room.players[pid].codename, text: m.text, confirmed: m.confirm === true });
        else if (m.status === 'open') redacted++;
      }
    }
    const highlights = [];
    if (room.reveal) {
      for (const [key, who_] of Object.entries(room.reveal.fire)) {
        if (!who_.length || room.reveal.hidden.includes(key)) continue;
        const [k, author] = key.split(':');
        const text = (room.answers[k] || {})[author];
        if (text && room.players[author]) highlights.push({ prompt: room.prompts[k].text, text, codename: room.players[author].codename, fire: who_.length });
      }
      highlights.sort((a, b) => b.fire - a.fire);
    }
    return {
      id, op: room.op, date: new Date(room.reveal ? room.reveal.frozen : room.created).toISOString(),
      agents, top: agents[0] ? agents[0].codename : null,
      awards: room.awards.map((a, k) => ({ text: a.text, winners: awardResult(room, k).winners.map((p) => room.players[p].codename) })).filter((a) => a.winners.length),
      missions, redacted, burns: room.burns.filter((b) => b.ok).length, highlights: highlights.slice(0, 3),
    };
  }

  const news = (room, now, text) => { room.news.push({ at: now, text }); if (room.news.length > 30) room.news.splice(0, room.news.length - 30); };

  /* ---------- routes ---------- */
  async function change(code, now, body, fn) {
    let out;
    const res = await mutate(store, 'r/' + code, (room) => {
      if (expired(room, now)) fail(404, 'No file with that code. Check it and try again.');
      const me = seat(room, body);
      out = fn(room, me);
      return out === SKIP ? SKIP : undefined;
    });
    if (!res) fail(404, 'No file with that code. Check it and try again.');
    return { room: view(res.data, String(body.pid), now), ...(out && out !== SKIP ? out : {}) };
  }
  const hostOnly = (room, me) => { if (me !== room.host) fail(403, 'Only the host can do that.'); };
  const inPhase = (room, ...phases) => { if (!phases.includes(room.phase)) fail(409, room.phase === 'reveal' ? 'This file is being declassified.' : room.phase === 'lobby' ? 'The night hasn’t started yet.' : 'The night already started.'); };

  async function route(method, path, body) {
    const now = clock();
    if (method !== 'POST') fail(405, 'Use POST.');
    if (path === '/hello') {
      const me = await who(body);
      return { now, brew: BREW, role: me ? me.role : null, name: me ? me.name : null, canHost: canHost(me) };
    }
    if (path === '/rooms') {
      const me = await who(body);
      if (!canHost(me)) fail(403, 'Classified is still being tested in Capra’s Lab. Only the lab’s crew can open a file for now.');
      const name = me ? me.name : cleanName(body.name);
      if (!name) fail(400, 'Type your name first.');
      for (let tries = 0; tries < 6; tries++) {
        const code = rid(4, ROOM_ABC);
        const room = { code, created: now, host: null, op: operationName(rand), phase: 'lobby', players: {}, order: [], decks: {}, gone: {},
          startedAt: null, opened: 0, prompts: [], answers: {}, awards: [], votes: {}, burns: [], pending: {}, news: [], reveal: null, file: null };
        const s = addPlayer(room, { name, me, avatar: body.avatar, now });
        room.host = s.pid;
        const w = await store.set('r/' + code, room, { onlyIfNew: true });
        if (w && w.modified) return { ...s, code, room: view(room, s.pid, now) };
      }
      fail(503, 'Couldn’t find a free code. Try again.');
    }
    const fm = path.match(/^\/files\/([a-z0-9]{10})$/);
    if (fm) {
      const g = await store.get('f/' + fm[1]);
      if (!g) fail(404, 'No file by that link. It may have been shredded.');
      if (g.data.snap && g.data.final) return { now, file: g.data.snap };
      const r = await store.get('r/' + g.data.code);
      if (!r || !r.data.reveal) { if (g.data.snap) return { now, file: g.data.snap }; fail(404, 'This file was never declassified.'); }
      const snap = snapshot(r.data, fm[1]);
      const final = r.data.reveal.steps[effective(r.data, now).i].type === 'final';
      if (final || !g.data.snap) await store.set('f/' + fm[1], { ...g.data, snap, final });
      return { now, file: snap };
    }
    const m = path.match(/^\/rooms\/([A-Z]{4})(\/[a-z]+)?$/);
    if (!m) fail(404, 'Not found.');
    const code = m[1], op = m[2] || '';
    if (!op) {
      const room = await load(code, now);
      const p = room.players[String(body.pid || '')];
      return { room: view(room, p && p.tok === String(body.tok || '') ? String(body.pid) : null, now) };
    }
    if (op === '/join') {
      const me = await who(body);
      let out = null;
      const res = await mutate(store, 'r/' + code, (room) => {
        if (expired(room, now)) fail(404, 'No file with that code. Check it and try again.');
        const mine = me && Object.entries(room.players).find(([, p]) => p.lab === me.handle);
        if (mine) { out = { pid: mine[0], tok: mine[1].tok }; return SKIP; }
        if (room.phase === 'reveal') fail(409, 'This file is already being declassified. Too late to join.');
        if (Object.keys(room.players).length >= MAX_PLAYERS) fail(409, `This file is full (${MAX_PLAYERS} agents).`);
        const name = me ? me.name : cleanName(body.name);
        if (!name) fail(400, 'Type your name first.');
        out = addPlayer(room, { name, me, avatar: body.avatar, now });
        news(room, now, `AGENT ${room.players[out.pid].codename} joined the operation.`);
      });
      if (!res) fail(404, 'No file with that code. Check it and try again.');
      return { ...out, room: view(res.data, out.pid, now) };
    }
    if (op === '/me') return change(code, now, body, (room, me) => {
      inPhase(room, 'lobby');
      const p = room.players[me];
      if (body.avatar) p.avatar = cleanAvatar(body.avatar);
      if (body.reroll) p.codename = newCodename(rand, Object.values(room.players).map((x) => x.codename));
    });
    if (op === '/op') return change(code, now, body, (room, me) => { hostOnly(room, me); inPhase(room, 'lobby'); room.op = operationName(rand); });
    if (op === '/start') return change(code, now, body, (room, me) => {
      hostOnly(room, me); inPhase(room, 'lobby');
      if (Object.keys(room.players).length < MIN_PLAYERS) fail(409, `You need at least ${MIN_PLAYERS} agents to start.`);
      room.phase = 'night';
      room.startedAt = now;
      room.prompts = shuffle(content.prompts).slice(0, PROMPTS).map((p) => ({ id: p.id, text: p.text }));
      room.awards = shuffle(content.awards).slice(0, AWARDS).map((a) => ({ id: a.id, text: a.text }));
      for (const pid of room.order) if (room.players[pid]) deal(room, pid, now);
      news(room, now, `${room.op} is a go.`);
    });
    if (op === '/mission') return change(code, now, body, (room, me) => {
      inPhase(room, 'night');
      const d = room.decks[me], slot = Number(body.slot);
      const vis = visibleSlots(room, me, now);
      if (!(slot >= 0 && slot < vis.length)) fail(404, 'No mission there.');
      const c = d.cards[vis[slot]];
      if (c.status !== 'active') fail(409, c.status === 'burned' ? 'That mission was burned.' : 'That mission is already done.');
      if (body.act === 'done') {
        c.status = 'done'; c.at = now;
        news(room, now, `AGENT ${room.players[me].codename} completed a mission.`);
      } else if (body.act === 'swap') {
        if (d.swaps >= MAX_SWAPS || d.spare >= d.cards.length) fail(409, 'No swaps left.');
        c.status = 'swapped'; c.at = now;
        d.slots[slot] = d.spare++;
        d.swaps++;
      } else fail(400, 'Done or swap?');
    });
    if (op === '/accuse') return change(code, now, body, (room, me) => {
      inPhase(room, 'night');
      const d = room.decks[me], agent = String(body.agent || '');
      if (!room.players[agent] || agent === me) fail(404, 'Pick another agent.');
      if (body.pick == null) {
        if (d.accused >= MAX_ACCUSE) fail(409, 'You’re out of accusations.');
        const theirs = room.decks[agent];
        const live = visibleSlots(room, agent, now).map((idx) => [idx, theirs.cards[idx]]).filter(([, c]) => c.status === 'active');
        if (!live.length) fail(409, `AGENT ${room.players[agent].codename} has nothing active right now. Your accusation wasn’t used.`);
        const onMe = live.filter(([, c]) => c.target === me);
        const [idx, real] = (onMe.length ? onMe : live)[Math.floor(rand() * (onMe.length || live.length))];
        const own = new Set(theirs.cards.map((c) => c.mid));
        const decoys = shuffle(content.missions.filter((x) => !own.has(x.id) && !!x.target === !!real.target)).slice(0, 3)
          .map((x) => ({ mid: x.id, target: real.target }));
        const choices = shuffle([{ mid: real.mid, target: real.target }, ...decoys]);
        room.pending[me] = { agent, card: idx, choices, real: choices.findIndex((c) => c.mid === real.mid) };
        return;
      }
      const p = room.pending[me];
      if (!p || p.agent !== agent) fail(409, 'Start the accusation again.');
      const pick = Number(body.pick);
      if (!(pick >= 0 && pick < p.choices.length)) fail(400, 'Pick one of the four.');
      delete room.pending[me];
      d.accused++;
      const card = room.decks[agent].cards[p.card];
      const ok = pick === p.real && card.status === 'active';
      if (ok) { card.status = 'burned'; card.by = me; card.at = now; }
      room.burns.push({ by: me, agent, card: p.card, ok, at: now });
      news(room, now, ok ? `AGENT ${room.players[me].codename} burned one of AGENT ${room.players[agent].codename}’s missions!`
        : `AGENT ${room.players[me].codename} accused AGENT ${room.players[agent].codename} and missed.`);
      return { burned: ok, mission: ok ? missionText(room, card) : null };
    });
    if (op === '/answer') return change(code, now, body, (room, me) => {
      inPhase(room, 'night');
      const k = Number(body.k);
      if (!(k >= 0 && k < openPrompts(room, now))) fail(409, 'That question isn’t open yet.');
      const text = tidy(body.text, ANSWER_MAX);
      room.answers[k] ||= {};
      if (text) room.answers[k][me] = text; else delete room.answers[k][me];
    });
    if (op === '/vote') return change(code, now, body, (room, me) => {
      inPhase(room, 'night');
      const k = Number(body.k), pick = String(body.for || '');
      if (!room.awards[k]) fail(404, 'No such award.');
      if (pick === me) fail(400, 'No voting for yourself, agent.');
      if (!room.players[pick]) fail(404, 'Pick another agent.');
      room.votes[k] ||= {};
      room.votes[k][me] = pick;
    });
    if (op === '/drop') return change(code, now, body, (room, me) => {
      hostOnly(room, me); inPhase(room, 'night');
      const open = openPrompts(room, now);
      if (open >= PROMPTS) fail(409, 'Every question is already out.');
      room.opened = open + 1;
      news(room, now, 'New question in Who Said It.');
    });
    if (op === '/remove') return change(code, now, body, (room, me) => {
      hostOnly(room, me); inPhase(room, 'lobby', 'night');
      const agent = String(body.agent || '');
      if (!room.players[agent] || agent === room.host) fail(404, 'Pick another agent.');
      room.gone[agent] = { name: room.players[agent].name, codename: room.players[agent].codename };
      delete room.players[agent];
      delete room.decks[agent];
      delete room.pending[agent];
      room.order = room.order.filter((p) => p !== agent);
    });
    if (op === '/declassify') {
      const out = await change(code, now, body, (room, me) => {
        hostOnly(room, me); inPhase(room, 'night');
        room.phase = 'reveal';
        room.reveal = buildReveal(room, now);
        room.pending = {};
        room.file = rid(10);
      });
      // the share file points back at the room until the reveal ends, then keeps its own copy
      if (out.room.file) await store.set('f/' + out.room.file, { code, created: now }, { onlyIfNew: true });
      return out;
    }
    if (op === '/next') return change(code, now, body, (room, me) => {
      hostOnly(room, me); inPhase(room, 'reveal');
      const { i } = effective(room, now);
      if (i >= room.reveal.steps.length - 1) return SKIP;
      room.reveal.i = i + 1;
      room.reveal.at = now;
    });
    if (op === '/guess' || op === '/fire' || op === '/confirm' || op === '/hide') return change(code, now, body, (room, me) => {
      inPhase(room, 'reveal');
      const r = room.reveal, { i } = effective(room, now), st = r.steps[i];
      // a fire sent during a guess still counts once its answer is showing (the same answer)
      const sameAnswer = op === '/fire' && st.type === 'who' && Number(body.step) === i - 1;
      if (Number(body.step) !== i && !sameAnswer) fail(409, 'The reveal moved on.');
      if (op === '/guess') {
        if (st.type !== 'guess') fail(409, 'Guessing is over for that one.');
        if (st.author === me) fail(400, 'That’s your answer. Act natural.');
        const pick = String(body.for || '');
        if (!room.players[pick] || pick === me) fail(400, 'Pick another agent.');
        r.guesses[i] ||= {};
        if (r.guesses[i][me]) return SKIP;
        r.guesses[i][me] = pick;
        r.lastGuess[i] = now;
        // once everyone's in, the round ends now (effective() reads lastGuess); pin the clock so
        // a later guess can't stretch it
        return;
      }
      if (op === '/fire') {
        if (st.type !== 'guess' && st.type !== 'who') fail(409, 'Nothing to vote on right now.');
        const key = `${st.k}:${st.author}`;
        const list = r.fire[key] ||= [];
        const at = list.indexOf(me);
        if (at >= 0) list.splice(at, 1); else list.push(me);
        return;
      }
      if (op === '/confirm') {
        if (st.type !== 'agent') fail(409, 'Nothing to confirm right now.');
        const card = room.decks[st.pid] && room.decks[st.pid].cards[Number(body.card)];
        if (!card || card.target !== me || card.status !== 'done') fail(400, 'That mission wasn’t about you.');
        r.confirms[`${st.pid}:${Number(body.card)}`] = !!body.ok;
        return;
      }
      hostOnly(room, me);
      if (st.type !== 'guess' && st.type !== 'who') fail(409, 'Nothing to hide right now.');
      const key = `${st.k}:${st.author}`;
      if (!r.hidden.includes(key)) r.hidden.push(key);
    });
    fail(404, 'Not found.');
  }

  async function handle(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/classified/, '').replace(/^\/api/, '') || '/';
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    try {
      return Response.json(await route(req.method, path, body || {}), { headers: { 'cache-control': 'no-store' } });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error('classified:', e);
      return Response.json({ error: status === 500 ? 'Something went wrong at headquarters. Try again.' : e.message }, { status, headers: { 'cache-control': 'no-store' } });
    }
  }

  return { route, handle, scores };
}
