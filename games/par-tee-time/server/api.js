// Par-Tee Time's online rooms at /par-tee-time/api/* (JC, Nov 9 2026: "Par-Tee Time needs to be
// playable online against a friend").
//
// The page's online mode was built for Claude's room capability: each phone keeps a "presence"
// (its name and ball, the match the host dealt, its latest shots and chat line) and watches the
// other phone's. This server is that room for Capra Lab, polled by the page (see labRoom() in
// index.html). The shooter's phone works out where every ball comes to rest and sends it with the
// shot, so the other phone replays the shot and snaps to the same spot: the server only relays.
//
//   POST /rooms/:code/join      { peer, role: 'host'|'guest', presence }  -> { peers }
//   POST /rooms/:code/presence  { peer, presence }                        -> { peers }
//   POST /rooms/:code/peers     { peer }                                  -> { peers }   (the poll)
//   POST /rooms/:code/leave     { peer }                                  -> { ok }
//
// Store `par-tee-time`: r/<CODE> = { at, peers: { <peer>: { role, presence, seen } } }.
// A phone that hasn't checked in for ACTIVE_MS has left; a room nobody has touched for ROOM_MS is
// free for a new game.
//
// The Masters Course (two courses mixed into 18 holes, three tries to beat the course best, loot and
// trophies) lives in masters.js under /masters/*; it needs `verify` (Capra Lab profiles).
import { mutate, SKIP } from './store.js';
import { createMasters } from './masters.js';

export const ACTIVE_MS = 30000;       // gone after 30 s without a check-in (a locked phone comes back)
export const SEEN_EVERY = 8000;       // a poll only writes when the last check-in is this old
export const ROOM_MS = 8 * 3600e3;
export const MAX_PRESENCE = 8000;     // characters of JSON per phone

const fail = (status, error, code) => { const e = new Error(error); e.status = status; e.code = code; throw e; };
const CODE = /^[A-Z0-9]{4}$/, PEER = /^[a-z0-9]{8,32}$/;

export function createApi({ store, verify = null, clock = () => Date.now() }) {
  const masters = createMasters({ store, verify, clock });
  const active = (room, now) => Object.entries(room.peers || {}).filter(([, p]) => now - p.seen < ACTIVE_MS);
  const view = (room, now) => ({ peers: active(room, now).map(([peer, p]) => ({ peer, role: p.role, presence: p.presence })) });
  const fresh = (now) => ({ at: now, peers: {} });
  function presenceOf(body) {
    const pr = body.presence;
    if (pr == null) return null;
    if (typeof pr !== 'object' || Array.isArray(pr)) fail(400, 'Bad presence.');
    if (JSON.stringify(pr).length > MAX_PRESENCE) fail(413, 'That message is too big.');
    return pr;
  }

  async function route(method, path, body) {
    const now = clock();
    if (method !== 'POST') fail(405, 'Use POST.');
    if (path.startsWith('/masters/')) return masters.route(path, body);
    const m = path.match(/^\/rooms\/([A-Za-z0-9]{4})\/(join|presence|peers|leave)$/);
    if (!m) fail(404, 'Not found.');
    const code = m[1].toUpperCase(), what = m[2], key = 'r/' + code, peer = String(body.peer || '');
    if (!CODE.test(code)) fail(400, 'Codes are four letters or numbers.');
    if (!PEER.test(peer)) fail(400, 'Bad player id.');

    if (what === 'join') {
      const role = body.role === 'host' ? 'host' : 'guest', presence = presenceOf(body) || {};
      const out = await mutate(store, key, (room) => {
        if (now - (room.at || 0) > ROOM_MS && !active(room, now).length) Object.assign(room, fresh(now));
        const others = active(room, now).filter(([id]) => id !== peer);
        if (role === 'host' && others.some(([, p]) => p.role === 'host')) fail(409, 'That code is taken.', 'taken');
        if (role === 'guest' && !others.some(([, p]) => p.role === 'host')) fail(404, 'No game with that code right now. Check it with your friend, or ask them to create one.', 'no_room');
        if (others.length >= 2) fail(409, 'That game is full.', 'full');
        for (const [id, p] of Object.entries(room.peers)) if (now - p.seen >= ACTIVE_MS) delete room.peers[id];
        room.peers[peer] = { role, presence, seen: now };
        room.at = now;
      }, () => fresh(now));
      return view(out.data, now);
    }

    if (what === 'presence') {
      const presence = presenceOf(body) || {};
      const out = await mutate(store, key, (room) => {
        const p = room.peers && room.peers[peer];
        if (!p) fail(410, 'You left that game. Join it again with the code.', 'gone');
        p.presence = presence; p.seen = now; room.at = now;
      });
      if (!out) fail(404, 'No game with that code.', 'no_room');
      return view(out.data, now);
    }

    if (what === 'peers') {
      const out = await mutate(store, key, (room) => {
        const p = room.peers && room.peers[peer];
        if (!p) fail(410, 'You left that game. Join it again with the code.', 'gone');
        if (now - p.seen < SEEN_EVERY) return SKIP;   // a read most of the time; a write every few seconds
        p.seen = now; room.at = now;
      });
      if (!out) fail(404, 'No game with that code.', 'no_room');
      return view(out.data, now);
    }

    // leave
    await mutate(store, key, (room) => {
      if (!room.peers || !room.peers[peer]) return SKIP;
      delete room.peers[peer];
    });
    return { ok: true };
  }

  async function handle(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/par-tee-time/, '').replace(/^\/api/, '') || '/';
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    try {
      return Response.json(await route(req.method, path, body || {}), { headers: { 'cache-control': 'no-store' } });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error('par-tee-time:', e);
      return Response.json({ error: status === 500 ? 'Something went wrong. Try again.' : e.message, code: e.code || null }, { status, headers: { 'cache-control': 'no-store' } });
    }
  }
  return { route, handle };
}
