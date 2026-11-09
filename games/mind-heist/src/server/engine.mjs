// Mind Heist game engine. Pure and deterministic: every function takes `now`
// and mutates the room object it is given. The API layer handles storage,
// auth and profiles; this file is only the rules.
//
// Room kinds
//   invite  everyone joins from the link on their own device
//   party   one screen; the host types names and acts for every guest
//   solo    one player, one crew (also used for Challenge runs)

import { cleanEmoji } from '../shared/emoji.mjs';
import { mulberry32, hash32, shuffle } from './rng.mjs';

export const INTRO_MS = 2800;          // Double / Hacker takeover before the question
// After an answer: the verdict (right or wrong, the answer on the board), then the fun fact
// on its own screen. Invite games move on by themselves after both; only the player who
// answered can skip the fun fact (JC, Nov 2026).
export const VERDICT_MS = 3500;
export const FACT_MS = 9000;
export const REVEAL_MS = VERDICT_MS + FACT_MS;
export const CREW_TIMEOUT_MS = 30000;  // one per crew per game, options hidden
export const ADD_MS = 10000;           // host "+10s"
export const SD_MS = 20000;            // sudden-death clock
export const SD_REVEAL_MS = 7000;
export const HEAT_BONUS = 100;         // 3rd straight right answer and beyond
export const WIN_BONUS = 250;
export const MAX_PLAYERS = 30;
export const CLOCKS = [0, 20, 30, 45, 60];
// Joke decks: every tile is a face-off (JC, Nov 2026). One player from each crew sees the
// setup, then the punchlines, and both pick in secret against the clock. A replay shows where the
// picks landed and measures the times: the fastest right punchline wins the money and the next
// pick. If nobody gets it, the picks clear and the punchlines go blank for one more try.
export const DUEL_INTRO_MS = 25000;    // the setup on its own before the punchlines (JC: time to read it and think)
export const DUEL_MISS_MS = 5200;      // round one's replay (nobody right) before the blank round
export const DUEL_BLANK_MS = 15000;    // the blank round's clock (shorter if the game clock is)
export const DUEL_VERDICT_MS = 6500;   // the replay and ruling before the bonus groan
export const THEMES = ['heist', 'office', 'bar', 'sports', 'popup', 'gameshow', 'arcade']; // looks only; no effect on the rules

export const JOKES_LIVE_ONLY = 'Joke decks are live face-offs. Host a game with your crew to play one.';

export class GameError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const fail = (msg, status) => { throw new GameError(msg, status); };

export const DEFAULTS = { clock: 30, hacker: true, fifty: true, doubles: 1, take: false, mic: false, cards: true, theme: 'heist' };
export const TAKE_TILES = 6;           // Take mode: half the board
export const HACKER_RUN = 3;           // beat the Hacker and your crew picks the next three
// No crew picks more than four tiles in a row (JC, Nov 2026: with every option on, one crew could
// pick six). A Hacker run is cut to fit, and a Double that can't add a pick plays as a plain tile.
export const MAX_STREAK = 4;
// And nobody picks more than two in a row (JC, Nov 8 2026, a two-player game: "The host is
// picking too many tiles in a row"). A crew of one stops at two; crews of two or more at four.
export const PLAYER_STREAK = 2;
// A special only shows up while there are enough tiles left to use it.
export const DOUBLE_MIN_LEFT = 3;      // the Double plus at least two more
export const HACKER_MIN_LEFT = 4;      // the Hacker plus a full run of three

/* ---------------- board ---------------- */

export function buildBoard(deck, seed, { hackers = 1, doubles = 1, takes = 0 } = {}) {
  const rand = mulberry32(seed);
  const board = deck.categories.slice(0, 3).map(cat => ({
    name: cat.name,
    tiles: cat.questions.slice(0, 4).map(q => {
      const ord = shuffle([0, 1, 2, 3], rand);
      return { v: q.value, sp: null, q: q.q, opts: ord.map(i => q.options[i]), ans: ord.indexOf(q.answer), fact: q.fact || '', res: null };
    }),
  }));
  const cells = [];
  board.forEach((col, c) => col.tiles.forEach((t, r) => cells.push([c, r])));
  const order = shuffle(cells, rand);
  const used = new Set();
  const take = (pred) => {
    const hit = order.find(([c, r]) => !used.has(c + ':' + r) && pred(c, r));
    if (hit) used.add(hit[0] + ':' + hit[1]);
    return hit;
  };
  const hackCols = new Set();
  for (let i = 0; i < hackers; i++) {
    const hit = take((c, r) => board[c].tiles[r].v >= 200 && !hackCols.has(c)) || take((c, r) => board[c].tiles[r].v >= 200) || take(() => true);
    if (hit) { board[hit[0]].tiles[hit[1]].sp = 'hacker'; hackCols.add(hit[0]); }
  }
  for (let i = 0; i < doubles; i++) {
    const hit = take(() => true);
    if (hit) board[hit[0]].tiles[hit[1]].sp = 'double';
  }
  // Take tiles: up to two per column, on plain tiles only.
  let marked = 0;
  const perCol = [0, 0, 0];
  const mark = (pred) => {
    const hit = take((c, r) => !board[c].tiles[r].sp && pred(c, r));
    if (hit) { board[hit[0]].tiles[hit[1]].tk = true; perCol[hit[0]] += 1; marked += 1; }
    return hit;
  };
  while (marked < takes && mark((c) => perCol[c] < Math.ceil(takes / 3)));
  while (marked < takes && mark(() => true));
  return board;
}

// A special that turned up too late to use plays as a plain tile (the board itself never changes).
export const spOf = (t) => (t && !t.off ? t.sp : null);

// The two wrong options a 50/50 removes, fixed per board so Challenge runs match.
export function fiftyRemoves(seed, c, r, ans) {
  const rand = mulberry32(hash32(seed, 'fifty', c, r));
  return shuffle([0, 1, 2, 3].filter(i => i !== ans), rand).slice(0, 2).sort();
}

/* ---------------- room setup ---------------- */

export function newRoom({ kind, code, host, deck, deckNo = null, settings = {}, seed, now, challengeId = null }) {
  // Joke decks are live face-offs only (JC: solo, with no clock pressure, kills the fun).
  if (kind === 'solo' && deck.kind === 'jokes') fail(JOKES_LIVE_ONLY);
  const s = { ...DEFAULTS, ...settings };
  if (!THEMES.includes(s.theme)) s.theme = DEFAULTS.theme;
  if (!CLOCKS.includes(s.clock)) s.clock = 30;
  s.doubles = Math.max(0, Math.min(2, s.doubles | 0));
  s.hacker = !!s.hacker; s.fifty = !!s.fifty; s.take = !!s.take; s.mic = !!s.mic && kind === 'invite';
  // Power cards (Mole, Hidden 50/50) need everyone on their own phone: invite games only.
  s.cards = !!s.cards && kind === 'invite';
  const room = {
    code, kind, v: 1, created: now, updated: now, hostId: host.pid, seed: seed >>> 0, rn: 0, game: 1,
    deckId: deck.id, deckTitle: deck.title, deckKind: deck.kind || null, deckNo, settings: s, challengeId,
    members: {}, order: [], guestN: 0,
    phase: 'lobby', phaseAt: now, captains: null, toss: null, crews: null, draft: null, rematch: false,
    turn: 0, board: null, cur: null, pause: null, undo: [], st: {}, feed: [], reactions: [], sudden: null,
    winner: null, results: null, recorded: false, mvp: null,
  };
  if (kind === 'invite' || kind === 'solo') addMember(room, { pid: host.pid, name: host.name, avatar: host.avatar }, now);
  if (kind === 'solo') {
    const mid = host.pid;
    room.crews = [newCrew(mid, [mid])];
    startBoard(room, deck, 0, now);
  }
  return room;
}

function newCrew(cap, mem) {
  return { cap, mem, haul: 0, seat: 0, heat: 0, fifty: false, tout: false, right: 0, wrong: 0, behind: 0 };
}

export function addMember(room, { pid = null, name, avatar = '🦝', guest = false }, now) {
  if (room.order.length >= MAX_PLAYERS) fail('This room is full.');
  const id = guest ? 'g' + (++room.guestN) : pid;
  if (room.members[id]) return room.members[id];
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (!clean) fail('Add a name first.');
  if (guest && Object.values(room.members).some(m => m.name.toLowerCase() === clean.toLowerCase())) fail(`${clean} is already in.`);
  const m = { id, pid, name: clean, avatar, guest, spec: false, joined: now };
  room.members[id] = m;
  room.order.push(id);
  // Joining mid-game: land on the smaller crew so nobody waits for a draft.
  if (room.crews && room.kind !== 'solo' && room.crews.length === 2) {
    const k = room.crews[0].mem.length <= room.crews[1].mem.length ? 0 : 1;
    room.crews[k].mem.push(id);
    pushFeed(room, now, `${clean} joined ${crewName(room, k)}`, k);
  }
  return m;
}

export function players(room) { return room.order.filter(id => room.members[id] && !room.members[id].spec); }
export function crewOf(room, mid) {
  if (!room.crews) return -1;
  return room.crews.findIndex(c => c.mem.includes(mid));
}
export function crewName(room, k) {
  const c = room.crews && room.crews[k];
  if (!c) return k ? 'Aqua crew' : 'Bubblegum crew';
  const m = room.members[c.cap];
  // Two players: each is a crew of one, so the name is the crew (JJ-Capra, not JJ-Capra's crew).
  const duo = room.crews.length === 2 && room.crews.every(x => x.mem.length === 1);
  return m ? (duo ? m.name : `${m.name}'s crew`) : (k ? 'Aqua crew' : 'Bubblegum crew');
}
export function picker(room, k = room.turn) {
  if (!room.crews) return null;
  const crew = room.crews[k];
  if (!crew) return null;
  const list = crew.mem.filter(id => room.members[id]);
  if (!list.length) return null;
  return list[crew.seat % list.length];
}
// Joke decks play every tile as a face-off when there are two crews.
const isDuel = (room) => room.deckKind === 'jokes' && room.kind !== 'solo' && !!room.crews && room.crews.length === 2;
function rand(room) {
  room.rn = (room.rn || 0) + 1;
  return mulberry32(hash32(room.seed, 'rn', room.rn, room.game))();
}
function pushFeed(room, now, text, crew = null, kind = 'info') {
  room.feed.push({ t: now, text, crew, kind });
  if (room.feed.length > 14) room.feed.splice(0, room.feed.length - 14);
}
function stat(room, mid) {
  return (room.st[mid] ||= { earn: 0, right: 0, wrong: 0, big: 0, clutch: 0, hack: 0, dbl: 0, fire: 0, picks: 0 });
}

/* ---------------- permissions ---------------- */

const isHost = (room, actor) => actor && actor.pid && actor.pid === room.hostId;
// A guest's moves are always made by the host. In party rooms the host acts for everyone.
function actsFor(room, actor, mid) {
  if (!mid) return false;
  if (isHost(room, actor)) return true;
  const m = room.members[mid];
  return !!(m && !m.guest && actor && actor.pid === m.pid);
}
function onCrew(room, actor, k) {
  if (isHost(room, actor)) return true;
  const c = room.crews && room.crews[k];
  return !!(c && actor && c.mem.includes(actor.pid));
}

/* ---------------- game flow ---------------- */

function startBoard(room, deck, turn, now) {
  if (!room.board) {
    // Joke decks are face-offs: no Hacker, Double or Take tiles on those boards.
    const jokes = room.deckKind === 'jokes';
    const hackers = room.settings.hacker && !jokes ? 1 : 0;
    const takes = room.settings.take && room.kind !== 'solo' && !jokes ? TAKE_TILES : 0;
    room.board = buildBoard(deck, room.seed, { hackers, doubles: jokes ? 0 : room.settings.doubles, takes });
  }
  room.turn = turn;
  room.run = null;
  room.streak = null;
  room.phase = 'board';
  room.phaseAt = now;
  pushFeed(room, now, room.kind === 'solo' ? 'Run started. Pick any tile.' : `${crewName(room, turn)} picks first.`, room.kind === 'solo' ? null : turn, 'start');
}

function tilesLeft(room) {
  return room.board.reduce((n, col) => n + col.tiles.filter(t => !t.res).length, 0);
}

// How many tiles in a row crew k has picked, counting the one on the clock.
function streakOf(room, k) { return room.streak && room.streak.crew === k ? room.streak.n : 0; }
// The most tiles crew k may pick in a row: two per player on it, never more than four.
export function streakCap(room, k) {
  const c = room.crews && room.crews[k];
  const n = c ? c.mem.filter(id => room.members[id]).length : 1;
  return Math.min(MAX_STREAK, PLAYER_STREAK * Math.max(1, n));
}
// The picks a Hacker run would give crew k now, cut so the crew stays within its cap.
function runIf(room, k) { return Math.max(0, Math.min(HACKER_RUN, streakCap(room, k) - streakOf(room, k))); }

function startAsk(room, now, clockMs = room.settings.clock * 1000) {
  const cur = room.cur;
  cur.phase = 'ask';
  cur.askAt = now;
  cur.pausedMs = 0;
  cur.clock = clockMs;
  cur.deadline = cur.clock ? now + cur.clock : null;
  cur.left = null;
  room.phase = 'ask';
  room.phaseAt = now;
}

function clockLeft(room, now) {
  const cur = room.cur;
  if (!cur || !cur.clock) return null;
  if (cur.left != null) return cur.left;
  return Math.max(0, cur.deadline - now);
}

function resolve(room, picked, now) {
  const cur = room.cur;
  const tile = room.board[cur.c].tiles[cur.r];
  const crew = room.crews[cur.crew];
  const left = clockLeft(room, now);
  // Snapshot for the host's undo: the question as it stood, clock frozen at the lock.
  const snap = JSON.parse(JSON.stringify(stripUndo(room)));
  if (snap.cur) { snap.cur.left = left; snap.cur.deadline = null; }
  snap.pause = { by: 'host', at: now };
  room.undo.push(JSON.stringify(snap));
  if (room.undo.length > 3) room.undo.shift();
  const right = picked != null && picked === tile.ans;
  settleMole(room, picked, right, now);
  // Take mode: a miss on a Take tile hands the other crew one shot at it.
  if (!right && tile.tk && !cur.take && room.crews.length === 2) return startTake(room, picked, now);
  if (cur.take) return resolveTake(room, picked, right, left, now);
  let delta = 0, bonus = 0;
  if (right) {
    delta = tile.v;
    if (spOf(tile) === 'hacker') delta = tile.v * 2;
    if (spOf(tile) === 'double' && room.kind === 'solo') delta = tile.v * 2;
    if (crew.heat >= 2) bonus = HEAT_BONUS;
    crew.heat += 1;
    crew.right += 1;
  } else {
    if (spOf(tile) === 'hacker') delta = -tile.v;
    crew.heat = 0;
    crew.wrong += 1;
  }
  const total = delta + bonus;
  crew.haul += total;
  if (room.crews.length === 2) {
    const other = room.crews[1 - cur.crew];
    crew.behind = Math.max(crew.behind, other.haul - crew.haul);
    other.behind = Math.max(other.behind, crew.haul - other.haul);
  }
  const s = stat(room, cur.mid);
  s.earn += total; s.picks += 1;
  if (right) {
    s.right += 1;
    if (tile.v === 400) s.big += 1;
    if (left != null && left <= 3000) s.clutch += 1;
    if (spOf(tile) === 'hacker') s.hack += 1;
    if (spOf(tile) === 'double') s.dbl += 1;
    if (bonus) s.fire += 1;
  } else s.wrong += 1;
  tile.res = { crew: cur.crew, mid: cur.mid, right, picked, delta: total, fifty: cur.removed ? 1 : 0, at: now };
  // Beat the Hacker in a crew game and your crew picks the next three tiles in a row.
  if (right && spOf(tile) === 'hacker' && room.crews.length === 2) {
    const left = runIf(room, cur.crew);
    room.run = left > 0 ? { crew: cur.crew, left } : null;
  }
  Object.assign(cur, { phase: 'reveal', picked, right, delta, bonus, revealAt: now, left: null, deadline: null, lockedLeft: left });
  cur.nextAt = room.kind === 'invite' ? now + REVEAL_MS : null;
  cur.nextLeft = null;
  room.pause = null;
  room.phase = 'reveal';
  room.phaseAt = now;
  const who = room.members[cur.mid] ? room.members[cur.mid].name : 'Someone';
  const what = `${room.board[cur.c].name} $${tile.v}`;
  if (cur.hidden) pushFeed(room, now, `${crewName(room, cur.crew)} had a Hidden 50/50 on that one`, cur.crew, 'fifty');
  if (right) {
    pushFeed(room, now, `${who} got ${what} right (+$${total})`, cur.crew, 'right');
    if (room.run && room.run.crew === cur.crew && spOf(tile) === 'hacker') pushFeed(room, now, `Hacker beaten. ${crewName(room, cur.crew)} picks the next ${room.run.left === 1 ? 'tile' : `${room.run.left} tiles`}.`, cur.crew, 'hacker');
  } else if (picked == null) pushFeed(room, now, `${who} ran out of time on ${what}${delta ? ` (-$${-delta})` : ''}`, cur.crew, 'wrong');
  else pushFeed(room, now, `${who} missed ${what}${delta ? ` (-$${-delta})` : ''}`, cur.crew, 'wrong');
}

// A Mole's anonymous tip is settled when the answer locks. If the crew on the clock
// locked the tip and it was wrong, the mole's crew takes the tile's value.
function settleMole(room, picked, right, now) {
  const cur = room.cur;
  const tip = cur.tip;
  if (!tip) return;
  const tile = room.board[cur.c].tiles[cur.r];
  const used = picked != null && picked === tip.i;
  const won = used && !right;
  const v = won ? tile.v : 0;
  cur.moleRes = { by: tip.by, crew: tip.crew, on: cur.crew, i: tip.i, used, won, v };
  cur.tip = null;
  const mole = room.members[tip.by] ? room.members[tip.by].name : 'The mole';
  if (won) {
    const mc = room.crews[tip.crew], other = room.crews[cur.crew];
    mc.haul += v;
    mc.behind = Math.max(mc.behind, other.haul - mc.haul);
    other.behind = Math.max(other.behind, mc.haul - other.haul);
    const s = stat(room, tip.by);
    s.earn += v; s.moles = (s.moles || 0) + 1;
    pushFeed(room, now, `The mole got ${crewName(room, cur.crew)}! ${mole} takes $${v} for ${crewName(room, tip.crew)}`, tip.crew, 'mole');
  } else if (used) pushFeed(room, now, `${crewName(room, cur.crew)} trusted an anonymous tip and it was right. ${mole} was the mole.`, cur.crew, 'mole');
  else pushFeed(room, now, `${crewName(room, cur.crew)} didn't fall for ${mole}'s tip`, cur.crew, 'mole');
}

// The crew on the clock missed a Take tile: the other crew's hot seat gets one shot.
function startTake(room, picked, now) {
  const cur = room.cur;
  const tile = room.board[cur.c].tiles[cur.r];
  const from = cur.crew, fromMid = cur.mid;
  const crew = room.crews[from];
  crew.heat = 0;
  crew.wrong += 1;
  const s = stat(room, fromMid);
  s.picks += 1; s.wrong += 1;
  const to = 1 - from;
  const other = room.crews[to];
  const list = other.mem.filter(id => room.members[id]);
  const who = room.members[fromMid] ? room.members[fromMid].name : 'Someone';
  const what = `${room.board[cur.c].name} $${tile.v}`;
  if (!list.length) {
    // Nobody on the other crew to take it: settle it as a plain miss.
    tile.res = { crew: from, mid: fromMid, right: false, picked, delta: 0, at: now };
    Object.assign(cur, { phase: 'reveal', picked, right: false, delta: 0, bonus: 0, revealAt: now, left: null, deadline: null, lockedLeft: null });
    cur.nextAt = room.kind === 'invite' ? now + REVEAL_MS : null;
    room.pause = null; room.phase = 'reveal'; room.phaseAt = now;
    return;
  }
  cur.orig = { crew: from, mid: fromMid, picked };
  cur.take = true;
  if (cur.hidden) { cur.hiddenOrig = cur.hidden; cur.hidden = null; }
  cur.tip = null;
  cur.crew = to;
  cur.mid = list[other.seat % list.length];
  cur.sug = {};
  cur.takeAt = now;
  room.pause = null;
  startAsk(room, now);
  pushFeed(room, now, `${who} ${picked == null ? 'ran out of time on' : 'missed'} ${what}. ${crewName(room, to)} can take it.`, to, 'take');
}

function resolveTake(room, picked, right, left, now) {
  const cur = room.cur;
  const tile = room.board[cur.c].tiles[cur.r];
  const crew = room.crews[cur.crew];
  const delta = right ? tile.v : 0;
  crew.haul += delta;
  if (right) crew.right += 1; else crew.wrong += 1;
  const other = room.crews[cur.orig.crew];
  crew.behind = Math.max(crew.behind, other.haul - crew.haul);
  other.behind = Math.max(other.behind, crew.haul - other.haul);
  const s = stat(room, cur.mid);
  s.earn += delta;
  s.takes = (s.takes || 0) + (right ? 1 : 0);
  if (right) { s.right += 1; if (tile.v === 400) s.big += 1; if (left != null && left <= 3000) s.clutch += 1; } else s.wrong += 1;
  tile.res = right
    ? { crew: cur.crew, mid: cur.mid, right: true, picked, delta, take: true, from: cur.orig.crew, at: now }
    : { crew: cur.orig.crew, mid: cur.orig.mid, right: false, picked: cur.orig.picked, delta: 0, take: true, both: true, at: now };
  Object.assign(cur, { phase: 'reveal', picked, right, delta, bonus: 0, revealAt: now, left: null, deadline: null, lockedLeft: left });
  cur.nextAt = room.kind === 'invite' ? now + REVEAL_MS : null;
  cur.nextLeft = null;
  room.pause = null;
  room.phase = 'reveal';
  room.phaseAt = now;
  const who = room.members[cur.mid] ? room.members[cur.mid].name : 'Someone';
  const what = `${room.board[cur.c].name} $${tile.v}`;
  if (right) pushFeed(room, now, `${who} took ${what} for ${crewName(room, cur.crew)} (+$${delta})`, cur.crew, 'right');
  else pushFeed(room, now, `Nobody got ${what}`, cur.crew, 'wrong');
}

/* ---------------- face-offs (joke decks) ---------------- */

const secs = (ms) => (ms / 1000).toFixed(1) + 's';

function duelLock(room, actor, a, now, host) {
  const cur = room.cur, d = cur.duel;
  if (d.stage !== 'pick') fail('Hang on, the replay is up.', 409);
  if (room.pause && room.pause.by === 'host' && !host) fail('The host paused the game.', 409);
  let k = a.crew === 0 || a.crew === 1 ? a.crew : -1;
  // A player locks for themselves; the host locks for a guest (or for anyone in a party room).
  if (k < 0) k = d.mids.findIndex(id => { const m = id && room.members[id]; return !!(m && !m.guest && actor && actor.pid && actor.pid === m.pid); });
  if (k < 0 && host) {
    const open = [0, 1].filter(j => d.picks[j] == null && room.members[d.mids[j]] && (room.kind === 'party' || room.members[d.mids[j]].guest));
    if (open.length === 1) k = open[0];
  }
  if (k < 0 || !actsFor(room, actor, d.mids[k])) fail('Only the two players in the face-off lock in.', 403);
  if (d.picks[k] != null) fail('Already locked in.', 409);
  const i = a.i | 0;
  if (i < 0 || i > 3) fail('Pick A, B, C or D.');
  if (d.struck.includes(i)) fail('That punchline is already out.');
  if (room.pause) resumeClock(room, now);
  d.picks[k] = i;
  d.at[k] = Math.max(0, now - cur.askAt - (cur.pausedMs || 0));
  if (d.picks.every(p => p != null)) duelSettle(room, now);
}

// Both locked (or the clock ran out): the fastest right punchline wins. Nobody right in round
// one: the replay shows the misses, then the punchlines go blank for round two.
function duelSettle(room, now) {
  const cur = room.cur, d = cur.duel;
  const tile = room.board[cur.c].tiles[cur.r];
  const right = d.picks.map(p => p != null && p === tile.ans);
  d.log.push({ round: d.round, picks: d.picks.slice(), at: d.at.slice(), right });
  let k = -1;
  if (right[0] && right[1]) k = d.at[0] < d.at[1] ? 0 : d.at[1] < d.at[0] ? 1 : d.from;
  else if (right[0]) k = 0;
  else if (right[1]) k = 1;
  if (k < 0 && d.round === 1) {
    d.stage = 'miss';
    d.missUntil = now + DUEL_MISS_MS;
    cur.deadline = null; cur.left = null;
    pushFeed(room, now, 'Nobody landed the punchline. It goes blank: who was paying attention?', null, 'duel');
    return;
  }
  resolveDuel(room, k, now);
}

function duelBlank(room, now) {
  const cur = room.cur, d = cur.duel;
  d.struck = [...new Set(d.picks.filter(p => p != null))];
  d.round = 2; d.stage = 'pick'; d.blank = true; d.missUntil = null;
  d.picks = [null, null]; d.at = [null, null];
  cur.sug = {};
  const base = room.settings.clock * 1000;
  startAsk(room, now, base ? Math.min(base, DUEL_BLANK_MS) : 0);
}

function resolveDuel(room, k, now) {
  const cur = room.cur, d = cur.duel;
  const tile = room.board[cur.c].tiles[cur.r];
  // The host's undo goes back to the start of this round, paused, picks cleared.
  const snap = JSON.parse(JSON.stringify(stripUndo(room)));
  if (snap.cur) {
    const sd = snap.cur.duel;
    sd.log = sd.log.slice(0, -1); sd.picks = [null, null]; sd.at = [null, null]; sd.stage = 'pick';
    snap.cur.left = snap.cur.clock || null; snap.cur.deadline = null;
  }
  snap.pause = { by: 'host', at: now };
  room.undo.push(JSON.stringify(snap));
  if (room.undo.length > 3) room.undo.shift();
  const last = d.log[d.log.length - 1];
  d.stage = 'done'; d.winner = k;
  for (const j of [0, 1]) {
    const s = stat(room, d.mids[j]);
    s.picks += 1;
    if (j !== k && !last.right[j]) s.wrong += 1;
  }
  let delta = 0, bonus = 0;
  if (k >= 0) {
    const crew = room.crews[k], other = room.crews[1 - k];
    delta = tile.v;
    if (crew.heat >= 2) bonus = HEAT_BONUS;
    crew.heat += 1; crew.right += 1; crew.haul += delta + bonus;
    other.heat = 0;
    if (!last.right[1 - k]) other.wrong += 1;
    crew.behind = Math.max(crew.behind, other.haul - crew.haul);
    other.behind = Math.max(other.behind, crew.haul - other.haul);
    const s = stat(room, d.mids[k]);
    s.earn += delta + bonus; s.right += 1; s.duels = (s.duels || 0) + 1;
    if (tile.v === 400) s.big += 1;
    if (bonus) s.fire += 1;
    cur.crew = k; cur.mid = d.mids[k];
  } else {
    for (const c of room.crews) { c.heat = 0; c.wrong += 1; }
    cur.crew = d.from; cur.mid = d.mids[d.from];
  }
  const total = delta + bonus;
  const picked = last.picks[cur.crew];
  tile.res = { crew: cur.crew, mid: cur.mid, right: k >= 0, picked, delta: total, duel: true, both: k < 0, at: now };
  Object.assign(cur, { phase: 'reveal', picked, right: k >= 0, delta, bonus, revealAt: now, left: null, deadline: null, lockedLeft: null, verdictMs: DUEL_VERDICT_MS });
  cur.nextAt = room.kind === 'invite' ? now + DUEL_VERDICT_MS + FACT_MS : null;
  cur.nextLeft = null;
  room.pause = null;
  room.phase = 'reveal';
  room.phaseAt = now;
  const what = `${room.board[cur.c].name} $${tile.v}`;
  const nm = (id) => (room.members[id] ? room.members[id].name : 'Someone');
  if (k >= 0) {
    const both = last.right[0] && last.right[1];
    pushFeed(room, now, `${nm(d.mids[k])} won the face-off on ${what} (+$${total}${both ? `, faster by ${secs(Math.abs(last.at[0] - last.at[1]))}` : ''})`, k, 'right');
  } else pushFeed(room, now, `Nobody got ${what}`, null, 'wrong');
}

// After a face-off both players step down, and the winning crew picks the next tile.
function advanceDuel(room, now) {
  const cur = room.cur;
  for (const c of room.crews) c.seat += 1;
  room.cur = null;
  room.pause = null;
  if (!tilesLeft(room)) { room.run = null; return finishBoard(room, now); }
  const w = cur.duel.winner;
  room.turn = w >= 0 ? w : 1 - cur.duel.from;
  room.phase = 'board';
  room.phaseAt = now;
}

function stripUndo(room) { const { undo, ...rest } = room; return rest; }

function advance(room, now) {
  const cur = room.cur;
  if (cur.duel) return advanceDuel(room, now);
  const tile = room.board[cur.c].tiles[cur.r];
  // The crew that picked the tile (not a crew that took it) decides who's next.
  const k = cur.take ? cur.orig.crew : cur.crew;
  const again = spOf(tile) === 'double' && tile.res && tile.res.right && room.kind !== 'solo';
  room.crews[k].seat += 1;
  // Taking a missed Take tile uses up that player's turn: a crewmate picks next.
  if (cur.take) room.crews[cur.crew].seat += 1;
  room.cur = null;
  room.pause = null;
  if (!tilesLeft(room)) { room.run = null; return finishBoard(room, now); }
  const run = room.run && room.run.crew === k ? room.run : null;
  if (again && run) run.left += 1; // a Double inside a Hacker run adds a pick (only while under the cap)
  let keep = again || (run && run.left > 0);
  if (run && run.left <= 0) room.run = null;
  const capped = keep && room.crews.length === 2 && streakOf(room, k) >= streakCap(room, k);
  if (capped) { keep = false; room.run = null; }
  if (room.crews.length === 2) room.turn = keep ? k : 1 - k;
  room.phase = 'board';
  room.phaseAt = now;
  if (again && keep) pushFeed(room, now, `Double! ${crewName(room, room.turn)} picks again.`, room.turn, 'double');
  if (capped) pushFeed(room, now, `${crewName(room, k)} picked ${streakOf(room, k)} in a row. ${crewName(room, room.turn)} is up.`, room.turn, 'info');
}

function finishBoard(room, now) {
  if (room.kind === 'solo' || room.crews.length < 2) return finalize(room, 0, now);
  const [a, b] = room.crews.map(c => c.haul);
  if (a === b) return startSudden(room, 1, now);
  finalize(room, a > b ? 0 : 1, now);
}

let SUDDEN_POOL = () => [];
export function setSuddenPool(fn) { SUDDEN_POOL = fn; }

function startSudden(room, round, now) {
  const pool = SUDDEN_POOL(now, room.deckId);
  if (!pool.length) return finalize(room, -1, now);
  const pick = pool[Math.floor(rand(room) * pool.length)];
  const ord = shuffle([0, 1, 2, 3], () => rand(room));
  room.sudden = {
    round, from: pick.from, q: pick.q.q, opts: ord.map(i => pick.q.options[i]), ans: ord.indexOf(pick.q.answer),
    fact: pick.q.fact || '', picks: [null, null], startAt: now, deadline: now + SD_MS, revealed: false, revealAt: null,
  };
  room.phase = 'sudden';
  room.phaseAt = now;
  room.cur = null;
  pushFeed(room, now, round === 1 ? 'Dead even. Sudden death.' : `Still tied. Sudden death round ${round}.`, null, 'sudden');
}

function revealSudden(room, now) {
  const sd = room.sudden;
  sd.revealed = true;
  sd.revealAt = now;
}

function suddenNext(room, now) {
  const sd = room.sudden;
  const r = sd.picks.map(p => p === sd.ans);
  if (r[0] !== r[1]) { room.suddenWin = r[0] ? 0 : 1; return finalize(room, room.suddenWin, now); }
  if (sd.round < 3) return startSudden(room, sd.round + 1, now);
  finalize(room, -1, now);
}

function finalize(room, winner, now) {
  room.phase = 'final';
  room.phaseAt = now;
  room.cur = null;
  room.pause = null;
  room.winner = winner;
  let mvp = null, best = -Infinity;
  for (const id of players(room)) {
    const e = (room.st[id] || {}).earn || 0;
    if (e > best) { best = e; mvp = id; }
  }
  room.mvp = room.kind === 'solo' ? null : mvp;
  if (room.kind === 'solo') pushFeed(room, now, `Run complete: $${room.crews[0].haul}`, null, 'final');
  else if (winner === -1) pushFeed(room, now, 'A dead heat. The crews split the vault.', null, 'final');
  else pushFeed(room, now, `${crewName(room, winner)} pulled off the heist`, winner, 'final');
}

/* ---------------- timers ---------------- */

// Advance anything that is due. Returns true when the room changed.
export function settle(room, now) {
  let changed = false;
  for (let guard = 0; guard < 6; guard++) {
    const step = settleOnce(room, now);
    if (!step) break;
    changed = true;
  }
  if (room.reactions.length && room.reactions[0].t < now - 15000) {
    room.reactions = room.reactions.filter(r => r.t >= now - 15000);
  }
  return changed;
}

function settleOnce(room, now) {
  const cur = room.cur;
  if (room.pause && room.pause.by === 'crew' && now >= room.pause.until) {
    resumeClock(room, room.pause.until);
    return true;
  }
  if (room.pause) return false;
  if (room.phase === 'intro' && cur && now >= cur.introUntil) { startAsk(room, cur.introUntil); return true; }
  if (room.phase === 'ask' && cur && cur.duel && cur.duel.stage === 'miss') {
    if (now >= cur.duel.missUntil) { duelBlank(room, cur.duel.missUntil); return true; }
    return false;
  }
  if (room.phase === 'ask' && cur && cur.deadline && now >= cur.deadline) { if (cur.duel) duelSettle(room, cur.deadline); else resolve(room, null, cur.deadline); return true; }
  if (room.phase === 'reveal' && cur && cur.nextAt && now >= cur.nextAt) { advance(room, cur.nextAt); return true; }
  if (room.phase === 'sudden' && room.sudden) {
    const sd = room.sudden;
    if (!sd.revealed && (sd.picks.every(p => p != null) || now >= sd.deadline)) { revealSudden(room, Math.min(now, sd.deadline)); return true; }
    if (sd.revealed && room.kind === 'invite' && now >= sd.revealAt + SD_REVEAL_MS) { suddenNext(room, sd.revealAt + SD_REVEAL_MS); return true; }
  }
  return false;
}

function freezeClock(room, now) {
  const cur = room.cur;
  if (!cur) return;
  if (room.phase === 'ask' && cur.deadline) { cur.left = Math.max(0, cur.deadline - now); cur.deadline = null; }
  if (room.phase === 'reveal' && cur.nextAt) { cur.nextLeft = Math.max(0, cur.nextAt - now); cur.nextAt = null; }
  if (room.phase === 'intro' && cur.introUntil) { cur.introLeft = Math.max(0, cur.introUntil - now); cur.introUntil = null; }
}

function resumeClock(room, now) {
  const cur = room.cur;
  const p = room.pause;
  room.pause = null;
  if (!cur) return;
  // Paused time doesn't count toward a face-off time, and a paused replay picks up where it was.
  if (p && p.at != null && room.phase === 'ask') {
    const gap = Math.max(0, now - p.at);
    cur.pausedMs = (cur.pausedMs || 0) + gap;
    if (cur.duel && cur.duel.stage === 'miss' && cur.duel.missUntil) cur.duel.missUntil += gap;
  }
  if (room.phase === 'ask' && cur.left != null) { cur.deadline = now + cur.left; cur.left = null; }
  if (room.phase === 'reveal' && cur.nextLeft != null) { cur.nextAt = now + cur.nextLeft; cur.nextLeft = null; }
  if (room.phase === 'intro' && cur.introLeft != null) { cur.introUntil = now + cur.introLeft; cur.introLeft = null; }
}

/* ---------------- actions ---------------- */

// `actor` is { pid } for a signed-in player or null. `deckLookup(id)` returns a deck.
export function act(room, actor, a, now, deckLookup) {
  if (!a || typeof a.type !== 'string') fail('Unknown action.');
  settle(room, now);
  const host = isHost(room, actor);
  const needHost = () => { if (!host) fail('Only the host can do that.', 403); };
  const phase = room.phase;
  const inPhase = (...p) => { if (!p.includes(phase)) fail('That move is not available right now.', 409); };

  switch (a.type) {
    /* lobby */
    case 'settings': {
      needHost(); inPhase('lobby');
      const s = room.settings;
      if (a.clock != null && CLOCKS.includes(+a.clock)) s.clock = +a.clock;
      if (a.hacker != null) s.hacker = !!a.hacker;
      if (a.fifty != null) s.fifty = !!a.fifty;
      if (a.doubles != null) s.doubles = Math.max(0, Math.min(2, a.doubles | 0));
      if (a.take != null) s.take = !!a.take;
      if (a.cards != null) s.cards = !!a.cards && room.kind === 'invite';
      if (a.theme != null && THEMES.includes(a.theme)) s.theme = a.theme;
      return;
    }
    case 'mic': {
      // Open mic is for friends playing from different homes; off when everyone's on a work call.
      needHost();
      if (room.kind !== 'invite') fail('Open mic is for invite games.');
      room.settings.mic = !!a.on;
      return;
    }
    case 'theme': {
      // The room's look can change at any point; it never touches the rules.
      needHost();
      if (!THEMES.includes(a.theme)) fail('Unknown look.');
      room.settings.theme = a.theme;
      return;
    }
    case 'deck': {
      needHost(); inPhase('lobby', 'final');
      const d = deckLookup(a.deckId);
      if (!d) fail('That deck is not open yet.');
      if (room.kind === 'solo' && d.kind === 'jokes') fail(JOKES_LIVE_ONLY);
      room.deckId = d.id; room.deckTitle = d.title; room.deckKind = d.kind || null; room.deckNo = a.deckNo ?? null;
      return;
    }
    case 'addGuest': {
      needHost();
      if (room.kind === 'solo') fail('Solo runs have one player.');
      addMember(room, { name: a.name, guest: true, avatar: a.avatar || pickGuestAvatar(room) }, now);
      return;
    }
    case 'remove': {
      needHost();
      const m = room.members[a.mid];
      if (!m) fail('That player already left.');
      if (m.pid && m.pid === room.hostId) fail('The host stays in the room.');
      delete room.members[a.mid];
      room.order = room.order.filter(id => id !== a.mid);
      if (room.crews) for (const c of room.crews) {
        const len = c.mem.length, i = c.mem.indexOf(a.mid);
        if (i < 0) continue;
        const at = len ? c.seat % len : 0;
        c.mem.splice(i, 1);
        // Keep the same person up next: shift the seat back if someone before them left.
        c.seat = c.mem.length ? (i < at ? at - 1 : at % c.mem.length) : 0;
        if (c.cap === a.mid && c.mem.length) c.cap = c.mem[0];
      }
      if (room.draft) room.draft.pool = room.draft.pool.filter(id => id !== a.mid);
      if (room.captains && room.captains.includes(a.mid) && phase === 'captains') room.captains = null;
      return;
    }
    case 'spectate': {
      needHost(); inPhase('lobby');
      const me = room.members[actor.pid];
      if (!me) fail('Join the room first.');
      me.spec = !me.spec;
      return;
    }
    case 'start': {
      needHost(); inPhase('lobby');
      if (room.kind === 'solo') fail('Solo runs start on their own.');
      const ps = players(room);
      if (ps.length < 2) fail('You need at least two players to split into crews.');
      room.captains = drawCaptains(room, ps);
      // Two players are both captains: straight to the coin flip (JC).
      if (ps.length === 2) return flipCoin(room, now);
      room.phase = 'captains'; room.phaseAt = now;
      return;
    }
    case 'reroll': {
      needHost(); inPhase('captains');
      const ps = players(room);
      if (ps.length < 3) fail('Every player is already a captain.');
      room.captains = drawCaptains(room, ps);
      room.phaseAt = now;
      return;
    }
    case 'toss': {
      needHost(); inPhase('captains');
      if (!room.captains) fail('Draw captains first.');
      return flipCoin(room, now);
    }
    case 'draft': {
      needHost(); inPhase('toss');
      if (room.rematch) { room.rematch = false; return startBoard(room, deckLookup(room.deckId), room.toss, now); }
      const pool = players(room).filter(id => crewOf(room, id) < 0);
      if (!pool.length) return startBoard(room, deckLookup(room.deckId), room.toss, now);
      room.draft = { turn: room.toss, pool, log: [] };
      room.phase = 'draft'; room.phaseAt = now;
      return;
    }
    case 'pickMate': {
      inPhase('draft');
      const d = room.draft;
      const cap = room.crews[d.turn].cap;
      if (!actsFor(room, actor, cap)) fail(`It's ${room.members[cap].name}'s pick.`, 403);
      if (!d.pool.includes(a.mid)) fail('That player is already on a crew.');
      d.pool = d.pool.filter(id => id !== a.mid);
      room.crews[d.turn].mem.push(a.mid);
      d.log.push({ crew: d.turn, mid: a.mid });
      d.turn = 1 - d.turn;
      if (!d.pool.length) finishDraft(room, deckLookup, now);
      return;
    }
    case 'autoDraft': {
      needHost(); inPhase('draft');
      const d = room.draft;
      for (const id of shuffle(d.pool, () => rand(room))) { room.crews[d.turn].mem.push(id); d.log.push({ crew: d.turn, mid: id }); d.turn = 1 - d.turn; }
      d.pool = [];
      finishDraft(room, deckLookup, now);
      return;
    }
    case 'undoDraft': {
      needHost(); inPhase('draft');
      const last = room.draft.log.pop();
      if (!last) fail('Nothing to undo.');
      const mem = room.crews[last.crew].mem;
      mem.splice(mem.lastIndexOf(last.mid), 1);
      room.draft.pool.push(last.mid);
      room.draft.turn = last.crew;
      return;
    }
    case 'move': {
      needHost();
      if (!room.crews || room.kind === 'solo') fail('Crews are not set yet.');
      const k = a.crew === 1 ? 1 : 0;
      if (!room.members[a.mid]) fail('That player left.');
      for (const c of room.crews) { const i = c.mem.indexOf(a.mid); if (i >= 0) c.mem.splice(i, 1); if (c.cap === a.mid) c.cap = c.mem[0] || a.mid; }
      room.crews[k].mem.push(a.mid);
      return;
    }

    /* board */
    case 'pick': {
      inPhase('board');
      if (room.pause) fail('The game is paused.', 409);
      const who = picker(room);
      if (!who) fail('That crew has no players. Move someone over first.');
      if (!actsFor(room, actor, who)) fail(`It's ${room.members[who]?.name || 'another player'}'s pick.`, 403);
      const col = room.board[a.c];
      const tile = col && col.tiles[a.r];
      if (!tile) fail('That tile is not on the board.');
      if (tile.res) fail('That tile is already cracked.');
      // Specials only show up while there are tiles left to use them. Too late and they stay plain.
      const remaining = tilesLeft(room);
      if (tile.sp === 'double' && remaining < DOUBLE_MIN_LEFT) tile.off = true;
      if (tile.sp === 'hacker' && remaining < HACKER_MIN_LEFT) tile.off = true;
      if (room.run && room.run.crew === room.turn) room.run.left -= 1;
      if (!room.streak || room.streak.crew !== room.turn) room.streak = { crew: room.turn, n: 0 };
      room.streak.n += 1;
      // A Double that can't add a pick (the crew's cap reached already, or a Hacker run that
      // already reaches it) plays as a plain tile.
      if (tile.sp === 'double' && room.kind !== 'solo' && room.crews.length === 2) {
        const n = room.streak.n, run = room.run && room.run.crew === room.turn ? room.run.left : 0, cap = streakCap(room, room.turn);
        if (n >= cap || run >= cap - n) tile.off = true;
      }
      room.cur = { c: a.c, r: a.r, crew: room.turn, mid: who, phase: 'intro', removed: null, sug: {}, pickedAt: now };
      const rival = isDuel(room) ? picker(room, 1 - room.turn) : null;
      if (rival) {
        const mids = [null, null];
        mids[room.turn] = who; mids[1 - room.turn] = rival;
        room.cur.duel = { from: room.turn, mids, round: 1, stage: 'pick', picks: [null, null], at: [null, null], struck: [], blank: false, log: [], winner: null };
        room.cur.introUntil = now + DUEL_INTRO_MS;
        room.phase = 'intro'; room.phaseAt = now;
        pushFeed(room, now, `Face-off: ${room.members[who].name} vs ${room.members[rival].name}`, room.turn, 'duel');
      } else if (spOf(tile)) {
        room.cur.introUntil = now + INTRO_MS;
        room.phase = 'intro'; room.phaseAt = now;
        pushFeed(room, now, spOf(tile) === 'hacker' ? `The Hacker is in ${room.members[who].name}'s tile` : `${room.members[who].name} found the Double`, room.turn, spOf(tile));
      } else startAsk(room, now);
      return;
    }
    case 'skip': {
      needHost(); inPhase('board');
      const who = picker(room);
      room.crews[room.turn].seat += 1;
      pushFeed(room, now, `Host skipped ${room.members[who]?.name || 'a player'}`, room.turn);
      return;
    }

    /* question */
    case 'lock': {
      inPhase('ask');
      const cur = room.cur;
      if (cur.duel) return duelLock(room, actor, a, now, host);
      if (!actsFor(room, actor, cur.mid)) fail(`${room.members[cur.mid]?.name || 'The hot seat'} locks the answer.`, 403);
      if (room.pause && room.pause.by === 'host' && !host) fail('The host paused the game.', 409);
      const i = a.i | 0;
      if (i < 0 || i > 3) fail('Pick A, B, C or D.');
      if (cur.removed && cur.removed.includes(i)) fail('The 50/50 removed that option.');
      if (cur.hidden && cur.hidden.rm.includes(i)) fail('Your Hidden 50/50 removed that option.');
      if (room.pause) resumeClock(room, now);
      resolve(room, i, now);
      return;
    }
    case 'noAnswer': {
      needHost(); inPhase('ask');
      if (room.cur.duel) {
        if (room.cur.duel.stage !== 'pick') fail('The replay is already up.', 409);
        if (room.pause) resumeClock(room, now);
        return duelSettle(room, now);
      }
      resolve(room, null, now);
      return;
    }
    case 'suggest': {
      inPhase('ask');
      const cur = room.cur;
      if (cur.duel) {
        // Face-off: each crew whispers to its own player.
        if (!actor || !actor.pid || crewOf(room, actor.pid) < 0) fail('Join a crew to suggest.', 403);
        if (cur.duel.stage !== 'pick') fail('Hang on, the replay is up.', 409);
      } else if (!actor || !actor.pid || !room.crews[cur.crew].mem.includes(actor.pid)) fail('Only the crew on the clock can suggest.', 403);
      if (a.i == null) delete cur.sug[actor.pid];
      else { const i = a.i | 0; if (i < 0 || i > 3) fail('Pick A, B, C or D.'); cur.sug[actor.pid] = i; }
      return;
    }
    case 'fifty': {
      inPhase('ask');
      const cur = room.cur;
      if (cur.duel) fail('Lifelines sit out the face-off.');
      const crew = room.crews[cur.crew];
      if (!room.settings.fifty) fail('50/50 is off in this game.');
      if (cur.take) fail('No lifelines on a take.');
      if (!(actsFor(room, actor, cur.mid) || actsFor(room, actor, crew.cap))) fail('The hot seat or captain calls the 50/50.', 403);
      if (crew.fifty) fail('Your crew already used its 50/50.');
      if (cur.hidden) fail('Your crew is already down to two.', 409);
      if (room.pause && room.pause.by === 'crew') fail('Finish the timeout first.', 409);
      crew.fifty = true;
      const tile = room.board[cur.c].tiles[cur.r];
      cur.removed = fiftyRemoves(room.seed, cur.c, cur.r, tile.ans);
      for (const [pid, i] of Object.entries(cur.sug)) if (cur.removed.includes(i)) delete cur.sug[pid];
      pushFeed(room, now, `${crewName(room, cur.crew)} used the 50/50`, cur.crew, 'fifty');
      return;
    }
    /* power cards (the API takes the card from the player's hand first) */
    case 'mole': {
      inPhase('ask');
      const cur = room.cur;
      if (cur.duel) fail('Lifelines sit out the face-off.');
      if (!room.settings.cards) fail('Power cards are off in this game.');
      if (!room.crews || room.crews.length !== 2) fail('A Mole needs two crews.');
      const mine = actor && actor.pid ? crewOf(room, actor.pid) : -1;
      if (mine < 0 || mine === cur.crew) fail('Play the Mole while the other crew is answering.', 403);
      if (cur.tip) fail('Someone already slipped them a tip on this one.', 409);
      const i = a.i | 0;
      if (i < 0 || i > 3) fail('Pick A, B, C or D.');
      if (cur.removed && cur.removed.includes(i)) fail('The 50/50 already removed that option.');
      if (cur.take && cur.orig.picked === i) fail('That option is already struck out.');
      cur.tip = { i, by: actor.pid, crew: mine, at: now };
      return;
    }
    case 'hfifty': {
      inPhase('ask');
      const cur = room.cur;
      if (cur.duel) fail('Lifelines sit out the face-off.');
      if (!room.settings.cards) fail('Power cards are off in this game.');
      if (cur.take) fail('No lifelines on a take.');
      const mine = actor && actor.pid ? crewOf(room, actor.pid) : -1;
      if (mine !== cur.crew) fail('Play the Hidden 50/50 when your crew is answering.', 403);
      if (cur.removed || cur.hidden) fail('This question is already down to two.', 409);
      if (room.pause && room.pause.by === 'crew') fail('Finish the timeout first.', 409);
      const tile = room.board[cur.c].tiles[cur.r];
      cur.hidden = { rm: fiftyRemoves((room.seed ^ 0x5bd1e995) >>> 0, cur.c, cur.r, tile.ans), by: actor.pid, at: now };
      for (const [pid, i] of Object.entries(cur.sug)) if (cur.hidden.rm.includes(i)) delete cur.sug[pid];
      const st = stat(room, actor.pid);
      st.hf = (st.hf || 0) + 1;
      return;
    }
    case 'timeout': {
      inPhase('ask');
      const cur = room.cur;
      if (cur.duel) fail('Lifelines sit out the face-off.');
      const crew = room.crews[cur.crew];
      if (!(actsFor(room, actor, cur.mid) || actsFor(room, actor, crew.cap))) fail('The hot seat or captain calls the timeout.', 403);
      if (cur.take) fail('No lifelines on a take.');
      if (crew.tout) fail('Your crew already used its timeout.');
      if (room.pause) fail('The clock is already stopped.', 409);
      crew.tout = true;
      freezeClock(room, now);
      room.pause = { by: 'crew', crew: cur.crew, at: now, until: now + CREW_TIMEOUT_MS };
      pushFeed(room, now, `${crewName(room, cur.crew)} called a timeout`, cur.crew, 'timeout');
      return;
    }
    case 'resume': {
      if (!room.pause) fail('The game is not paused.', 409);
      if (room.pause.by === 'host') needHost();
      else {
        const crew = room.crews[room.pause.crew];
        if (!(host || actsFor(room, actor, room.cur && room.cur.mid) || actsFor(room, actor, crew.cap))) fail('The crew on the clock or the host resumes.', 403);
      }
      resumeClock(room, now);
      return;
    }
    case 'pause': {
      needHost();
      if (!['board', 'intro', 'ask', 'reveal', 'sudden'].includes(phase)) fail('Nothing to pause yet.', 409);
      if (room.pause && room.pause.by === 'host') return;
      if (!room.pause) freezeClock(room, now);
      room.pause = { by: 'host', at: now };
      return;
    }
    case 'addTime': {
      needHost(); inPhase('ask');
      const cur = room.cur;
      if (!cur.clock) fail('The clock is off in this game.');
      if (cur.deadline) cur.deadline += ADD_MS; else if (cur.left != null) cur.left += ADD_MS;
      cur.clock += ADD_MS;
      pushFeed(room, now, 'Host added 10 seconds', cur.crew, 'time');
      return;
    }

    /* reveal */
    case 'next': {
      if (phase === 'intro') { needHost(); startAsk(room, now); return; }
      inPhase('reveal');
      const cur = room.cur;
      // Only the player who answered (or took) the tile skips the fun fact. The host steps in
      // only for a guest's turn or a player who has left; party rooms run on the host's screen.
      const who = room.members[cur.mid];
      const mine = !!(actor && actor.pid && who && who.pid === actor.pid);
      const stepIn = host && (!who || who.guest || room.kind === 'party');
      if (!(room.kind === 'solo' || mine || stepIn)) fail(`${who ? who.name : 'The player who answered'} can skip the fun fact.`, 403);
      if (room.pause && !host) fail('The host paused the game.', 409);
      advance(room, now);
      return;
    }
    case 'undo': {
      needHost(); inPhase('reveal', 'board', 'final');
      if (room.recorded) fail('Scores are already banked for this game.');
      const snap = room.undo.pop();
      if (!snap) fail('Nothing to undo.');
      const prev = JSON.parse(snap);
      const keep = { undo: room.undo, v: room.v, members: room.members, order: room.order, reactions: room.reactions, guestN: room.guestN };
      for (const k of Object.keys(room)) delete room[k];
      Object.assign(room, prev, keep);
      // Back on the question, paused by the host, clock frozen where it was at the lock.
      room.pause = { by: 'host', at: now };
      if (room.cur && room.cur.duel && room.phase === 'ask') { room.cur.askAt = now; room.cur.pausedMs = 0; }
      pushFeed(room, now, 'Host undid the last answer', null, 'undo');
      return;
    }

    /* sudden death */
    case 'sdLock': {
      inPhase('sudden');
      const sd = room.sudden;
      if (sd.revealed) fail('Already revealed.', 409);
      let k = a.crew === 1 ? 1 : a.crew === 0 ? 0 : crewOf(room, actor && actor.pid);
      if (k < 0) fail('Only crew captains lock sudden death.', 403);
      if (!actsFor(room, actor, room.crews[k].cap)) fail('Captains lock sudden death.', 403);
      if (sd.picks[k] != null) fail('Your crew already locked.');
      const i = a.i | 0;
      if (i < 0 || i > 3) fail('Pick A, B, C or D.');
      sd.picks[k] = i;
      settle(room, now);
      return;
    }
    case 'sdNext': {
      needHost(); inPhase('sudden');
      if (!room.sudden.revealed) revealSudden(room, now);
      else suddenNext(room, now);
      return;
    }

    /* end */
    case 'end': {
      needHost();
      if (phase === 'final') return;
      if (!room.board || !room.crews) { room.phase = 'lobby'; return; }
      room.ended = true;
      const hauls = room.crews.map(c => c.haul);
      finalize(room, room.kind === 'solo' || hauls.length < 2 ? 0 : hauls[0] === hauls[1] ? -1 : hauls[0] > hauls[1] ? 0 : 1, now);
      return;
    }
    case 'rematch': {
      needHost(); inPhase('final');
      if (room.kind === 'solo') fail('Start a new run from the menu.');
      const d = deckLookup(a.deckId || room.deckId);
      if (!d) fail('That deck is not open yet.');
      room.game += 1;
      room.deckId = d.id; room.deckTitle = d.title; room.deckKind = d.kind || null; room.deckNo = a.deckNo ?? null;
      room.seed = hash32(room.seed, 'rematch', room.game);
      room.board = null; room.cur = null; room.pause = null; room.undo = []; room.st = {}; room.sudden = null; room.run = null; room.streak = null;
      room.winner = null; room.results = null; room.recorded = false; room.mvp = null; room.suddenWin = null; room.ended = false;
      for (const c of room.crews) Object.assign(c, { haul: 0, seat: 0, heat: 0, fifty: false, tout: false, right: 0, wrong: 0, behind: 0 });
      room.toss = rand(room) < 0.5 ? 0 : 1;
      room.rematch = true;
      room.phase = 'toss'; room.phaseAt = now;
      return;
    }
    case 'newCrews': {
      needHost(); inPhase('final');
      room.game += 1;
      room.seed = hash32(room.seed, 'newcrews', room.game);
      Object.assign(room, { board: null, cur: null, pause: null, undo: [], st: {}, sudden: null, run: null, streak: null, winner: null, results: null,
        recorded: false, mvp: null, crews: null, captains: null, toss: null, draft: null, rematch: false, suddenWin: null, ended: false });
      room.phase = 'lobby'; room.phaseAt = now;
      return;
    }

    /* reactions */
    case 'react': {
      // Emoji from the four-button row. Phones linked directly send spam to each other; only
      // phones that can't reach everyone that way send a batch here, at most every 1.5 s:
      // m = up to four [{ e, c }] (c = how many taps), or one e and c.
      const mid = actor && actor.pid && room.members[actor.pid] ? actor.pid : null;
      if (!mid) fail('Join the room to react.', 403);
      const list = (Array.isArray(a.m) ? a.m.slice(0, 4) : [{ e: a.e, c: a.c }])
        .map(x => ({ e: cleanEmoji(x && x.e), c: Math.max(1, Math.min(12, (x && x.c) | 0 || 1)) }))
        .filter(x => x.e);
      if (!list.length) fail('Unknown reaction.');
      if (room.reactions.some(r => r.mid === mid && r.t > now - 1500)) fail('Easy on the spam button.', 429);
      const base = typeof a.id === 'string' && /^[A-Za-z0-9.]{1,29}$/.test(a.id) ? a.id : null;
      list.forEach((x, i) => {
        const id = base ? (list.length > 1 ? `${base}.${i}` : base) : null;
        room.reactions.push({ mid, e: x.e, c: x.c, id, t: now, n: (room.reactN = (room.reactN || 0) + 1) });
      });
      if (room.reactions.length > 40) room.reactions.splice(0, room.reactions.length - 40);
      return;
    }
    default:
      fail('Unknown action.');
  }
}

function finishDraft(room, deckLookup, now) {
  room.draft = { ...room.draft, done: true };
  startBoard(room, deckLookup(room.deckId), 1 - room.toss, now);
}

function flipCoin(room, now) {
  room.toss = rand(room) < 0.5 ? 0 : 1;
  room.crews = room.captains.map(c => newCrew(c, [c]));
  room.phase = 'toss'; room.phaseAt = now;
}

function drawCaptains(room, ps) {
  const order = shuffle(ps, () => rand(room));
  return order.slice(0, 2);
}

const GUEST_AVATARS = ['🦊', '🦉', '🐙', '🦈', '🐸', '🦖', '🐼', '🐯', '🦄', '🐝', '🐺', '🦩', '🐨', '🦔', '🐢', '🦜'];
function pickGuestAvatar(room) { return GUEST_AVATARS[room.guestN % GUEST_AVATARS.length]; }

/* ---------------- views ---------------- */

// What one viewer is allowed to see. Answer keys and unrevealed specials never leave the server.
export function view(room, viewerPid, now, { tv = false } = {}) {
  const me = viewerPid && room.members[viewerPid] ? viewerPid : null;
  const host = !tv && viewerPid && viewerPid === room.hostId;
  const myCrew = me ? crewOf(room, me) : -1;
  const cur = room.cur;
  const tileOf = cur && room.board ? room.board[cur.c].tiles[cur.r] : null;
  const out = {
    code: room.code, kind: room.kind, v: room.v, now, game: room.game,
    me, host, hostId: room.hostId, myCrew,
    deck: { id: room.deckId, title: room.deckTitle, no: room.deckNo, kind: room.deckKind || null },
    settings: room.settings, phase: room.phase, phaseAt: room.phaseAt,
    challengeId: room.challengeId,
    members: room.order.filter(id => room.members[id]).map(id => {
      const m = room.members[id];
      return { id, name: m.name, avatar: m.avatar, guest: m.guest, spec: m.spec, crew: crewOf(room, id), isHost: !!(m.pid && m.pid === room.hostId) };
    }),
    captains: room.captains, toss: room.phase === 'captains' ? null : room.toss,
    crews: room.crews && room.crews.map(c => ({ cap: c.cap, mem: c.mem.filter(id => room.members[id]), haul: c.haul, seat: c.seat, heat: c.heat,
      fifty: c.fifty, tout: c.tout, right: c.right, wrong: c.wrong })),
    draft: room.draft && { turn: room.draft.turn, pool: room.draft.pool, last: room.draft.log[room.draft.log.length - 1] || null },
    turn: room.turn, picker: room.crews ? picker(room) : null,
    run: room.run ? { crew: room.run.crew, left: room.run.left } : null,
    streak: room.streak ? { crew: room.streak.crew, n: room.streak.n, max: streakCap(room, room.streak.crew) } : null,
    board: room.board && room.board.map(col => ({
      name: col.name,
      tiles: col.tiles.map(t => ({ v: t.v, taken: !!t.res, sp: t.res ? spOf(t) : null, tk: !!t.tk,
        res: t.res ? { crew: t.res.crew, mid: t.res.mid, right: t.res.right, delta: t.res.delta, take: !!t.res.take, both: !!t.res.both } : null })),
    })),
    pause: room.pause,
    feed: room.feed.slice(-8),
    reactions: room.reactions,
    winner: room.winner, mvp: room.mvp, suddenWin: room.suddenWin ?? null, ended: !!room.ended,
    results: room.phase === 'final' ? room.results : null,
    stats: room.phase === 'final' ? room.st : (me && room.st[me] ? { [me]: room.st[me] } : {}),
    canUndo: host && room.undo.length > 0 && !room.recorded,
    // Tabs open for direct links (invite games). Only people in the room, or the big screen, see them.
    peers: room.kind === 'invite' && (me || tv || host) ? Object.entries(room.peers || {}).map(([id, p]) => ({ id, pid: p.pid, kind: p.kind })) : [],
  };
  if (cur && tileOf) {
    const revealed = cur.phase === 'reveal';
    const crewHidden = room.pause && room.pause.by === 'crew';
    const c = {
      c: cur.c, r: cur.r, crew: cur.crew, mid: cur.mid, phase: cur.phase, v: tileOf.v, cat: room.board[cur.c].name,
      sp: spOf(tileOf), introUntil: cur.introUntil || null, introLeft: cur.introLeft ?? null, introMs: cur.duel ? DUEL_INTRO_MS : INTRO_MS,
      // Beat the Hacker and this many picks follow (cut to keep a crew within four in a row).
      runIf: spOf(tileOf) === 'hacker' && room.crews && room.crews.length === 2 ? (room.run && room.run.crew === cur.crew ? room.run.left : runIf(room, cur.crew)) : 0,
      // A face-off shows the setup during its intro; the punchlines come after.
      q: cur.phase === 'intro' && !cur.duel ? null : tileOf.q,
      opts: cur.phase === 'intro' || crewHidden ? null : cur.duel && cur.duel.blank && !revealed ? tileOf.opts.map(() => '') : tileOf.opts,
      removed: cur.removed, clock: cur.clock || 0, deadline: cur.deadline ?? null, left: cur.left ?? null, askAt: cur.askAt || null,
      tk: !!tileOf.tk,
      take: cur.take ? { from: cur.orig.crew, fromMid: cur.orig.mid, missed: cur.orig.picked, at: cur.takeAt } : null,
    };
    if (revealed) Object.assign(c, { ans: tileOf.ans, picked: cur.picked, right: cur.right, delta: cur.delta, bonus: cur.bonus,
      fact: tileOf.fact, nextAt: cur.nextAt, nextLeft: cur.nextLeft, lockedLeft: cur.lockedLeft,
      revealAt: cur.revealAt, factAt: cur.revealAt + (cur.verdictMs || VERDICT_MS) });
    // Crew suggestions are for that crew only (and a host who is not playing).
    const hostWatching = host && myCrew < 0;
    if (cur.duel && !revealed && !hostWatching) c.sug = Object.fromEntries(Object.entries(cur.sug).filter(([pid]) => crewOf(room, pid) === myCrew));
    else if (myCrew === cur.crew || hostWatching || revealed) c.sug = cur.sug; else c.sugCount = Object.keys(cur.sug).length;
    if (cur.duel) {
      // Picks stay secret (each crew sees only its own) until the replay.
      const d = cur.duel;
      const open = revealed || d.stage === 'miss';
      const ref = hostWatching || (host && room.kind === 'party');
      const see = (k) => open || ref || k === myCrew;
      c.duel = { from: d.from, mids: d.mids, round: d.round, stage: d.stage, blank: d.blank, struck: d.struck, winner: d.winner,
        missUntil: d.missUntil || null, missMs: DUEL_MISS_MS, locked: d.picks.map(p => p != null),
        picks: d.picks.map((p, k) => (see(k) ? p : null)), at: d.at.map((t, k) => (see(k) ? t : null)),
        log: d.log.map(l => ({ round: l.round, picks: l.picks, at: l.at, right: open || l.round < d.round ? l.right : [null, null] })) };
    }
    // Power cards. A Mole's tip is anonymous to the crew it targets; the mole's own crew
    // knows who sent it. A Hidden 50/50 shows only on the answering crew's phones.
    // Neither shows on the big screen until it's settled.
    const nm = (id) => (room.members[id] ? room.members[id].name : 'Someone');
    if (cur.tip) {
      if (myCrew === cur.tip.crew) c.tip = { i: cur.tip.i, by: cur.tip.by, name: nm(cur.tip.by), mine: true };
      else if (myCrew === cur.crew || hostWatching) c.tip = { i: cur.tip.i };
    }
    if (cur.moleRes) c.mole = { ...cur.moleRes, name: nm(cur.moleRes.by) };
    if (cur.hidden && myCrew === cur.crew && !revealed) c.hidden = cur.hidden.rm;
    const hid = cur.hidden || cur.hiddenOrig;
    if (hid && revealed) c.hidUsed = { rm: hid.rm, by: hid.by, name: nm(hid.by) };
    out.cur = c;
  } else out.cur = null;
  if (room.sudden) {
    const sd = room.sudden;
    out.sudden = { round: sd.round, from: sd.from, q: sd.q, opts: sd.opts, deadline: sd.deadline, startAt: sd.startAt,
      locked: sd.picks.map(p => p != null), revealed: sd.revealed, revealAt: sd.revealAt,
      picks: sd.revealed ? sd.picks : sd.picks.map((p, k) => (k === myCrew ? p : null)),
      ans: sd.revealed ? sd.ans : null, fact: sd.revealed ? sd.fact : null };
  }
  if (room.phase === 'final' && room.board) {
    // Recap for the results screen: every question with its answer.
    out.recap = room.board.map(col => ({ name: col.name, tiles: col.tiles.map(t => ({ v: t.v, sp: spOf(t), tk: !!t.tk, q: t.q, a: t.opts[t.ans], res: t.res && { right: t.res.right, mid: t.res.mid, delta: t.res.delta, take: !!t.res.take } })) }));
  }
  return out;
}

// Per-tile result codes for share grids and challenge comparisons.
export function gridOf(room) {
  return room.board.map(col => col.tiles.map(t => {
    if (!t.res) return '-';
    if (spOf(t) === 'hacker') return t.res.right ? 'H' : 'X';
    if (spOf(t) === 'double' && t.res.right) return 'D';
    return t.res.right ? 'R' : 'W';
  }).join('')).join('|');
}
