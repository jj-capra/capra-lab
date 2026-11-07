// HTTP API for Mind Heist. One handler, mounted at /api/* by Netlify.
import { calendar, deck as getDeck, dropNo, summary, isOpen, pacificDate, suddenPool, jokeOfDay } from './content.mjs';
import * as E from './engine.mjs';
import * as P from './profiles.mjs';
import { randomCode, randomHex, randomSeed } from './rng.mjs';
import * as C from './cards.mjs';
import { emoRow } from '../shared/emoji.mjs';

E.setSuddenPool(suddenPool);

const AVATARS = ['🦝', '🦊', '🐈‍⬛', '🦉', '🐍', '🦈', '🐙', '👾', '🤖', '🦖', '🐸', '🦄', '🐼', '🐯', '🦩', '🐝', '🐺', '🦔', '🐢', '🦜', '🕶️', '🎭', '💎', '🧠'];

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };
const SKIP = Symbol('skip');
const PEER_ID = /^[A-Z0-9]{6,16}\.[a-z0-9]{4,10}$/;
const CARD_ACTS = { mole: 'You don’t have a Mole card.', hfifty: 'You don’t have a Hidden 50/50 card.' };

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function cleanName(name) {
  const n = String(name || '').trim().replace(/\s+/g, ' ');
  if (n.length < 2 || n.length > 16) bad('Pick a name between 2 and 16 characters.');
  if (/[<>]/.test(n)) bad('Names can’t use < or >.');
  return n;
}
// Capra Lab names run to 24 characters; Mind Heist's to 16.
function labName(n) {
  const s = String(n || '').replace(/[<>]/g, '').trim().replace(/\s+/g, ' ').slice(0, 16).trim();
  return s.length >= 2 ? s : 'Lab player';
}

// Capra Lab (capra-lab.netlify.app) serves Mind Heist at /mind-heist/ and keeps one profile per
// player for every game: a name and a six-digit key. Asking the lab whether a name and key match
// is the only check there is, so a stolen Mind Heist sign-in can't claim someone's lab name.
const labUrl = () => (typeof process !== 'undefined' && process.env && process.env.CAPRA_LAB_URL) || 'https://capra-lab.netlify.app';
async function askCapraLab(name, code) {
  name = String(name || '').slice(0, 40);
  code = String(code || '').replace(/\D/g, '');
  if (!name.trim() || code.length !== 6) return null;
  let res;
  try {
    res = await fetch(labUrl() + '/api/profile/signin', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, code }), signal: AbortSignal.timeout(8000),
    });
  } catch (e) { bad('Capra Lab didn’t answer. Try again in a moment.', 503); }
  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) bad(res.status === 429 ? 'Too many tries on that Capra Lab name. Wait a few minutes.' : 'Capra Lab didn’t answer. Try again in a moment.', res.status === 429 ? 429 : 503);
  const d = await res.json().catch(() => null);
  return d && /^[a-z0-9-]{2,24}$/.test(String(d.handle || '')) ? { name: String(d.name || name), handle: d.handle } : null;
}

function cleanAvatar(a) { return AVATARS.includes(a) ? a : AVATARS[0]; }
function cleanTheme(t) { return E.THEMES.includes(t) ? t : E.DEFAULTS.theme; }

export function makeHandler(store, { clock = () => Date.now(), labCheck = askCapraLab } = {}) {
  /* ---------- storage helpers ---------- */
  async function mutate(key, fn, { create = null } = {}) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const got = await store.get(key);
      if (!got && !create) bad('Not found.', 404);
      const data = got ? got.data : create();
      const out = await fn(data);
      if (out === SKIP) return { data, skipped: true };
      const res = got
        ? await store.set(key, data, got.etag ? { onlyIfMatch: got.etag } : {})
        : await store.set(key, data, { onlyIfNew: true });
      if (res.modified) return { data, result: out };
      await new Promise(r => setTimeout(r, 15 + Math.random() * 40 * (attempt + 1)));
    }
    bad('The game is busy. Try that again.', 503);
  }
  const getJSON = async (key) => { const g = await store.get(key); return g ? g.data : null; };

  async function makeProfile(name, avatar, theme, now) {
    for (let i = 0; i < 5; i++) {
      const pid = randomCode(10);
      const token = randomHex(24);
      const key = randomCode(5) + '-' + randomCode(5);
      const p = P.newProfile({ pid, name, avatar, tokenHash: await sha256(token), key, now });
      if (theme != null) p.theme = cleanTheme(theme);
      const w = await store.set('p/' + pid, p, { onlyIfNew: true });
      if (!w.modified) continue;
      await store.set('k/' + key, { pid }, { onlyIfNew: true });
      return { pid, token, p };
    }
    bad('Could not make a profile. Try again.', 503);
  }
  // The profile behind a key like ABCDE-FGHJK.
  async function byKey(raw) {
    const key = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (key.length !== 10) bad('Keys look like ABCDE-FGHJK.');
    const k = await getJSON('k/' + key.slice(0, 5) + '-' + key.slice(5));
    if (!k) bad('That key doesn’t match a profile.', 404);
    return k;
  }

  async function auth(req, required = true) {
    const h = req.headers.get('authorization') || '';
    const m = h.match(/^Bearer ([A-Z0-9]+)\.([a-f0-9]{48})$/);
    if (!m) { if (required) bad('Make a profile first.', 401); return null; }
    const p = await getJSON('p/' + m[1]);
    if (!p || !p.tokens.includes(await sha256(m[2]))) { if (required) bad('Your sign-in expired. Use your key to sign back in.', 401); return null; }
    return { pid: p.pid, profile: p };
  }

  const roomKey = (code) => 'r/' + String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Vault Jam trophies (from before it became Goat Getaway): each day you solved is checked once
  // the day is over. The day's fastest solve anywhere wins it. Returns the profile and the days won.
  async function settleTrophies(me, today) {
    const due = (me.profile.jamPend || []).filter(d => d < today);
    if (!due.length) return { profile: me.profile, won: [] };
    const won = [];
    for (const d of due) {
      const b = await getJSON('j/' + d);
      if (b && C.leader(b) === me.pid) won.push(d);
    }
    const { data } = await mutate('p/' + me.pid, (p) => {
      p.jamPend = (p.jamPend || []).filter(d => d >= today);
      p.trophies ||= [];
      for (const d of won) if (!p.trophies.includes(d)) p.trophies.push(d);
    });
    return { profile: data, won };
  }

  // Diamonds a lab player earned in Goat Getaway before they had a Mind Heist profile wait in
  // gg/<handle>. Take them (compare-and-swap, so they're counted once) and return how many.
  async function claimGoatGems(handle) {
    if (!handle) return 0;
    for (let i = 0; i < 5; i++) {
      const g = await store.get('gg/' + handle);
      const n = g && g.data ? Math.max(0, Math.floor(Number(g.data.gems) || 0)) : 0;
      if (!n) return 0;
      const w = await store.set('gg/' + handle, { gems: 0 }, g.etag ? { onlyIfMatch: g.etag } : {});
      if (w && w.modified) return n;
    }
    return 0;
  }

  async function mutateRoom(code, fn, now) {
    return mutate(roomKey(code), async (room) => {
      const r = await fn(room);
      if (r === SKIP) return SKIP;
      E.settle(room, now);
      room.v += 1;
      room.updated = now;
      return r;
    });
  }

  async function bankResults(code, now) {
    let snap = null;
    const claim = await mutateRoom(code, (room) => {
      if (room.phase !== 'final' || room.recorded) return SKIP;
      room.recorded = 'pending';
      snap = JSON.parse(JSON.stringify(room));
    }, now);
    if (claim.skipped || !snap) return;
    const room = snap;
    const today = pacificDate(now);
    const cal = calendar(now);
    const grid = room.kind === 'solo' ? E.gridOf(room) : null;
    const results = {};
    const ids = E.players(room).filter(id => room.members[id] && !room.members[id].guest && room.members[id].pid);
    await Promise.all(ids.map(async (mid) => {
      try {
        await mutate('p/' + room.members[mid].pid, (p) => {
          const official = room.kind === 'solo' && !room.challengeId && cal.featured && room.deckId === cal.featured.id
            && !(p.daily && p.daily.date === today) && !room.ended;
          results[mid] = P.applyGame(p, room, mid, now, { official, grid });
        });
      } catch (e) { /* a missing profile should not block the others */ }
    }));
    if (room.challengeId && room.kind === 'solo') {
      const pid = room.hostId;
      const score = room.crews[0].haul;
      try {
        const ch = (await mutate('c/' + room.challengeId, (c) => {
          c.takers[pid] = { name: room.members[pid].name, avatar: room.members[pid].avatar, score, grid, at: now };
        })).data;
        const by = ch.by.pid;
        const outcome = score > ch.by.score ? 'w' : score < ch.by.score ? 'l' : 't';
        const tally = (rec, o) => { const t = rec || [0, 0, 0]; t[o === 'w' ? 0 : o === 'l' ? 1 : 2] += 1; return t; };
        await mutate('p/' + pid, (p) => {
          P.addFriend(p, by);
          p.h2h ||= {}; p.h2h[by] = tally(p.h2h[by], outcome);
          if (outcome === 'w' && !p.badges.challenger) { p.badges.challenger = today; (results[pid].badges ||= []).push('challenger'); }
        });
        await mutate('p/' + by, (p) => {
          P.addFriend(p, pid);
          p.h2h ||= {}; p.h2h[pid] = tally(p.h2h[pid], outcome === 'w' ? 'l' : outcome === 'l' ? 'w' : 't');
          if (outcome === 'l' && !p.badges.challenger) p.badges.challenger = today;
        });
        if (results[pid]) results[pid].challenge = { vs: ch.by.name, avatar: ch.by.avatar, theirs: ch.by.score, mine: score, outcome };
      } catch (e) { /* challenge record missing: keep the run */ }
    }
    await mutateRoom(code, (r) => { r.recorded = true; r.results = results; }, now);
  }

  /* ---------- routes ---------- */
  async function route(req, path, url, now) {
    const method = req.method;
    const body = method === 'POST' ? await req.json().catch(() => ({})) : {};
    let m;

    if (path === '/home' && method === 'GET') {
      const cal = calendar(now);
      const me = await auth(req, false);
      const tr = me ? await settleTrophies(me, cal.today) : null;
      let goatGems = 0;
      if (me && tr.profile.lab) {
        goatGems = await claimGoatGems(tr.profile.lab);
        if (goatGems) tr.profile = (await mutate('p/' + me.pid, (p) => { p.gems = (p.gems || 0) + goatGems; })).data;
      }
      return json(200, {
        now, date: cal.today, encore: cal.encore, nextExists: cal.nextExists,
        today: summary(cal.featured, { encore: cal.encore }),
        joke: summary(jokeOfDay(now)),
        vault: cal.vault.map(d => summary(d)),
        me: me ? P.privateProfile(tr.profile, cal.today) : null,
        trophyNews: tr ? tr.won : [],
        goatGems,
      });
    }

    if (path === '/me' && method === 'POST') {
      const { pid, token, p } = await makeProfile(cleanName(body.name), cleanAvatar(body.avatar), body.theme, now);
      return json(200, { pid, token, me: P.privateProfile(p, pacificDate(now)) });
    }
    if (path === '/me' && method === 'GET') {
      const me = await auth(req);
      return json(200, { me: P.privateProfile(me.profile, pacificDate(now)) });
    }
    if (path === '/me/update' && method === 'POST') {
      const me = await auth(req);
      const { data } = await mutate('p/' + me.pid, (p) => {
        if (body.name != null && !p.lab) p.name = cleanName(body.name); // a lab profile's name comes from Capra Lab
        if (body.avatar != null) p.avatar = cleanAvatar(body.avatar);
        if (body.theme != null) p.theme = cleanTheme(body.theme);
        if (body.emo != null) p.emo = emoRow(body.emo);
      });
      return json(200, { me: P.privateProfile(data, pacificDate(now)) });
    }
    if (path === '/me/restore' && method === 'POST') {
      const k = await byKey(body.key);
      const token = randomHex(24);
      const hash = await sha256(token);
      const { data } = await mutate('p/' + k.pid, (p) => { p.tokens = [...p.tokens.slice(-5), hash]; });
      return json(200, { pid: k.pid, token, me: P.privateProfile(data, pacificDate(now)) });
    }

    // Inside Capra Lab: sign in as the lab player's Mind Heist profile, linking one the first time.
    //   { name, code }               the lab name and key (checked with Capra Lab)
    //   + nothing                    links the profile this device is signed in to, if it isn't linked yet,
    //                                or answers { choose: true } so the player can pick:
    //   + { create: true, avatar }   a new Mind Heist profile under the lab name
    //   + { key: 'ABCDE-FGHJK' }     the Mind Heist profile behind that key, stats and all
    // Once linked, the lab name always signs in to that profile, on any device.
    if (path === '/me/lab' && method === 'POST') {
      const who = await labCheck(body.name, body.code);
      if (!who) bad('That Capra Lab name and key don’t match. Sign in to Capra Lab again.', 401);
      const linkKey = 'l/' + who.handle;
      let pid = ((await getJSON(linkKey)) || {}).pid || null;
      if (!pid) {
        let pick = null;
        if (body.key != null) pick = (await byKey(body.key)).pid;
        else if (body.create) pick = (await makeProfile(labName(who.name), cleanAvatar(body.avatar), body.theme, now)).pid;
        else { const me = await auth(req, false); if (me && !me.profile.lab) pick = me.pid; }
        if (!pick) return json(200, { choose: true, name: labName(who.name) });
        const p0 = await getJSON('p/' + pick);
        if (!p0) bad('That key doesn’t match a profile.', 404);
        if (p0.lab && p0.lab !== who.handle) bad('That Mind Heist profile already belongs to another Capra Lab player.', 409);
        const w = await store.set(linkKey, { pid: pick, at: now }, { onlyIfNew: true });
        pid = w.modified ? pick : ((await getJSON(linkKey)) || {}).pid;
        if (!pid) bad('The game is busy. Try that again.', 503);
      }
      const token = randomHex(24);
      const hash = await sha256(token);
      const goatGems = await claimGoatGems(who.handle);
      const { data } = await mutate('p/' + pid, (p) => {
        p.tokens = [...p.tokens.slice(-5), hash]; p.lab = who.handle; p.name = labName(who.name);
        if (goatGems) p.gems = (p.gems || 0) + goatGems;
      });
      return json(200, { pid, token, goatGems, me: P.privateProfile(data, pacificDate(now)) });
    }

    /* ---- diamonds (earned in Goat Getaway) and the daily draw ---- */
    if (path === '/draw' && method === 'POST') {
      const today = pacificDate(now);
      const me = await auth(req);
      let card = null;
      const { data } = await mutate('p/' + me.pid, (p) => {
        if (p.draw && p.draw.day === today) bad('You already drew today. A new card waits after midnight.', 409);
        p.hand ||= [];
        if (p.hand.length >= C.HAND_MAX) bad(`Your hand is full (${C.HAND_MAX}). Play a card in a game first.`, 409);
        const gem = !!body.gem;
        if (gem && !(p.gems > 0)) bad('You need a diamond for that. Get the goat out in today’s Goat Getaway to earn one.', 409);
        if (gem) p.gems -= 1;
        const roll = randomSeed() / 4294967296;
        if (roll < C.PRIZE_ODDS * (gem ? 2 : 1)) {
          card = { k: randomSeed() % 2 ? 'mole' : 'hfifty', id: randomHex(4), at: now };
          p.hand.push(card);
        } else card = { k: 'dud', n: randomSeed() % C.DUDS };
        p.draw = { day: today, gem, card: { k: card.k, n: card.n ?? null } };
      });
      return json(200, { now, card: { k: card.k, n: card.n ?? null }, vault: P.vaultOf(data, today) });
    }

    if (path === '/friends' && method === 'GET') {
      const me = await auth(req);
      const today = pacificDate(now);
      const ids = (me.profile.friends || []).slice(-150);
      const list = (await Promise.all(ids.map(id => getJSON('p/' + id)))).filter(Boolean).map(p => P.publicProfile(p, today, me.pid));
      return json(200, { me: P.publicProfile(me.profile, today), friends: list, date: today });
    }
    if (path === '/friends/remove' && method === 'POST') {
      const me = await auth(req);
      const other = String(body.pid || '');
      await mutate('p/' + me.pid, (p) => { p.friends = (p.friends || []).filter(f => f !== other); });
      try { await mutate('p/' + other, (p) => { p.friends = (p.friends || []).filter(f => f !== me.pid); }); } catch (e) { /* gone */ }
      return json(200, { ok: true });
    }

    if (path === '/rooms' && method === 'POST') {
      const me = await auth(req);
      const kind = ['invite', 'party', 'solo'].includes(body.kind) ? body.kind : 'invite';
      const d = getDeck(body.deckId) || calendar(now).featured;
      if (!d || !isOpen(d.id, now)) bad('That deck hasn’t dropped yet.');
      const host = { pid: me.pid, name: me.profile.name, avatar: me.profile.avatar };
      for (let i = 0; i < 6; i++) {
        const code = randomCode(kind === 'invite' ? 4 : 6);
        const settings = { ...(body.settings || {}) };
        settings.theme = cleanTheme(settings.theme || me.profile.theme);
        const room = E.newRoom({ kind, code, host, deck: d, deckNo: dropNo(d), settings, seed: randomSeed(), now });
        const w = await store.set(roomKey(code), room, { onlyIfNew: true });
        if (w.modified) return json(200, { code, room: E.view(room, me.pid, now) });
      }
      bad('Could not open a room. Try again.', 503);
    }

    if ((m = path.match(/^\/rooms\/([A-Za-z0-9]{4,8})$/)) && method === 'GET') {
      const code = m[1].toUpperCase();
      const tv = url.searchParams.get('tv') === '1';
      const me = tv ? null : await auth(req, false);
      const got = await store.get(roomKey(code));
      if (!got) bad('That room code doesn’t exist. Check the link.', 404);
      let room = got.data;
      if (E.settle(room, now)) {
        room.v += 1; room.updated = now;
        const w = await store.set(roomKey(code), room, got.etag ? { onlyIfMatch: got.etag } : {});
        if (!w.modified) { const again = await store.get(roomKey(code)); room = again.data; E.settle(room, now); }
      }
      if (room.phase === 'final' && !room.recorded) {
        await bankResults(code, now);
        room = (await store.get(roomKey(code))).data;
      }
      const since = Number(url.searchParams.get('v') || 0);
      if (since && since === room.v) return json(200, { same: true, v: room.v, now });
      return json(200, { room: E.view(room, me ? me.pid : null, now, { tv }) });
    }

    if ((m = path.match(/^\/rooms\/([A-Za-z0-9]{4,8})\/join$/)) && method === 'POST') {
      const me = await auth(req);
      const code = m[1].toUpperCase();
      let others = [];
      const { data: room } = await mutateRoom(code, (room) => {
        if (room.kind !== 'invite') bad('That room isn’t taking players.', 403);
        others = room.order.filter(id => id !== me.pid && room.members[id] && room.members[id].pid).map(id => room.members[id].pid);
        if (!room.members[me.pid]) E.addMember(room, { pid: me.pid, name: me.profile.name, avatar: me.profile.avatar }, now);
        else return SKIP;
      }, now);
      // Everyone you play with lands on your friends list, and you on theirs.
      const missing = others.filter(pid => !(me.profile.friends || []).includes(pid));
      if (missing.length) {
        await mutate('p/' + me.pid, (p) => { let n = 0; for (const o of missing) if (P.addFriend(p, o)) n++; if (!n) return SKIP; });
        await Promise.all(missing.map(o => mutate('p/' + o, (p) => { if (!P.addFriend(p, me.pid)) return SKIP; }).catch(() => null)));
      }
      const fresh = (await store.get(roomKey(code))).data;
      return json(200, { room: E.view(fresh, me.pid, now), friended: missing.length });
    }

    /* ---- direct links between phones (invite games) ----
       The server only makes introductions: each tab announces itself, then pairs of tabs
       swap WebRTC offers and answers through a small mailbox. After that, phones nudge each
       other the moment anything changes. Game state still only comes from the server. */
    if ((m = path.match(/^\/rooms\/([A-Za-z0-9]{4,8})\/peer$/)) && method === 'POST') {
      const me = await auth(req);
      const code = m[1].toUpperCase();
      const id = String(body.id || '');
      if (!PEER_ID.test(id) || !id.startsWith(me.pid + '.')) bad('That link id is not yours.', 403);
      const kind = body.kind === 'tv' ? 'tv' : 'play';
      const { data: room } = await mutateRoom(code, (room) => {
        if (room.kind !== 'invite') bad('Direct links are for invite games.');
        if (!room.members[me.pid] && me.pid !== room.hostId) bad('Join the room first.', 403);
        const peers = (room.peers ||= {});
        const had = !!peers[id];
        // One tab per person per kind: a reload replaces the old tab. Stale tabs age out.
        for (const [k, p] of Object.entries(peers)) if ((p.pid === me.pid && p.kind === kind && k !== id) || p.at < now - 6 * 3600e3) delete peers[k];
        if (body.gone) { if (!had) return SKIP; delete peers[id]; return; }
        if (had) { peers[id].at = now; return SKIP; }
        peers[id] = { pid: me.pid, kind, at: now };
      }, now);
      return json(200, { room: E.view(room, me.pid, now, { tv: kind === 'tv' }) });
    }
    if ((m = path.match(/^\/rooms\/([A-Za-z0-9]{4,8})\/sig$/)) && method === 'POST') {
      const me = await auth(req);
      const code = m[1].toUpperCase();
      const from = String(body.from || ''), to = String(body.to || '');
      if (!PEER_ID.test(from) || !from.startsWith(me.pid + '.') || !PEER_ID.test(to)) bad('Bad link ids.', 403);
      const d = body.d;
      if (!d || !['offer', 'answer'].includes(d.t) || typeof d.sdp !== 'string' || d.sdp.length > 20000) bad('Bad link message.');
      const got = await store.get(roomKey(code));
      if (!got) bad('That room code doesn’t exist.', 404);
      const peers = got.data.peers || {};
      if (!peers[from] || !peers[to]) bad('That phone left the room.', 409);
      await mutate(`sb/${code}/${to}`, (box) => {
        box.seq += 1;
        box.msgs = box.msgs.filter(x => x.at > now - 120000).slice(-30);
        box.msgs.push({ n: box.seq, from, d: { t: d.t, sdp: d.sdp }, at: now });
      }, { create: () => ({ seq: 0, msgs: [] }) });
      return json(200, { ok: true });
    }
    if ((m = path.match(/^\/rooms\/([A-Za-z0-9]{4,8})\/sig$/)) && method === 'GET') {
      const me = await auth(req);
      const code = m[1].toUpperCase();
      const peer = url.searchParams.get('peer') || '';
      if (!PEER_ID.test(peer) || !peer.startsWith(me.pid + '.')) bad('That link id is not yours.', 403);
      const since = Number(url.searchParams.get('since') || 0);
      const got = await store.get(`sb/${code}/${peer}`);
      const box = got ? got.data : { seq: 0, msgs: [] };
      return json(200, { seq: box.seq, msgs: box.msgs.filter(x => x.n > since && x.at > now - 120000) });
    }

    if ((m = path.match(/^\/rooms\/([A-Za-z0-9]{4,8})\/act$/)) && method === 'POST') {
      const me = await auth(req);
      const code = m[1].toUpperCase();
      const lookup = (id) => (isOpen(id, now) ? getDeck(id) : null);
      // Power cards live on the profile: take one from the hand, play it, and hand it
      // back if the game refuses the play.
      let card = null, hand;
      if (CARD_ACTS[body.type]) {
        const { data } = await mutate('p/' + me.pid, (p) => {
          const i = (p.hand || []).findIndex(c => c.k === body.type);
          if (i < 0) bad(CARD_ACTS[body.type], 409);
          card = p.hand.splice(i, 1)[0];
        });
        hand = data.hand;
      }
      let room;
      try {
        ({ data: room } = await mutateRoom(code, (room) => {
          try { E.act(room, { pid: me.pid }, body, now, lookup); }
          catch (e) { if (e instanceof E.GameError) bad(e.message, e.status); throw e; }
          if (body.type === 'deck' || body.type === 'rematch') {
            const d = getDeck(room.deckId); room.deckNo = d ? dropNo(d) : null;
          }
        }, now));
      } catch (e) {
        if (card) await mutate('p/' + me.pid, (p) => { (p.hand ||= []).push(card); }).catch(() => null);
        throw e;
      }
      let out = room;
      if (room.phase === 'final' && !room.recorded) {
        await bankResults(code, now);
        out = (await store.get(roomKey(code))).data;
      }
      return json(200, { room: E.view(out, me.pid, now), ...(hand ? { hand: hand.map(c => ({ id: c.id, k: c.k })) } : {}) });
    }

    if (path === '/challenges' && method === 'POST') {
      const me = await auth(req);
      const room = await getJSON(roomKey(body.code));
      if (!room || room.kind !== 'solo' || room.hostId !== me.pid) bad('Finish a solo run first.');
      if (room.phase !== 'final') bad('Finish the run first.');
      if (room.challengeId) bad('This run was already a challenge. Start a new run to send one.');
      if (room.challengeOut) return json(200, { id: room.challengeOut });
      const id = randomCode(7);
      const ch = {
        id, deckId: room.deckId, deckTitle: room.deckTitle, seed: room.seed, settings: room.settings, created: now,
        by: { pid: me.pid, name: me.profile.name, avatar: me.profile.avatar, score: room.crews[0].haul, grid: E.gridOf(room) }, takers: {},
      };
      await store.set('c/' + id, ch, { onlyIfNew: true });
      await mutateRoom(room.code, (r) => { r.challengeOut = id; }, now);
      return json(200, { id });
    }
    if ((m = path.match(/^\/challenges\/([A-Z0-9]{7})$/)) && method === 'GET') {
      const me = await auth(req, false);
      const ch = await getJSON('c/' + m[1]);
      if (!ch) bad('That challenge link doesn’t work. Ask for a new one.', 404);
      const takers = Object.entries(ch.takers).map(([pid, t]) => ({ pid, ...t })).sort((a, b) => b.score - a.score);
      const mine = me ? (me.pid === ch.by.pid ? { creator: true } : ch.takers[me.pid] || null) : null;
      return json(200, { id: ch.id, deck: { id: ch.deckId, title: ch.deckTitle }, by: ch.by, takers, mine, created: ch.created });
    }
    if ((m = path.match(/^\/challenges\/([A-Z0-9]{7})\/play$/)) && method === 'POST') {
      const me = await auth(req);
      const ch = await getJSON('c/' + m[1]);
      if (!ch) bad('That challenge link doesn’t work.', 404);
      if (ch.by.pid === me.pid) bad('That’s your own challenge. Send the link to a friend.');
      if (ch.takers[me.pid]) bad('You already took this challenge.');
      if (ch.runs && ch.runs[me.pid]) return json(200, { code: ch.runs[me.pid] });
      const d = getDeck(ch.deckId);
      const host = { pid: me.pid, name: me.profile.name, avatar: me.profile.avatar };
      for (let i = 0; i < 6; i++) {
        const code = randomCode(6);
        // Same board and rules as the challenger; the look is the taker's own.
        const settings = { ...ch.settings, theme: cleanTheme(me.profile.theme) };
        const room = E.newRoom({ kind: 'solo', code, host, deck: d, deckNo: dropNo(d), settings, seed: ch.seed, now, challengeId: ch.id });
        const w = await store.set(roomKey(code), room, { onlyIfNew: true });
        if (w.modified) {
          await mutate('c/' + ch.id, (c) => { (c.runs ||= {})[me.pid] = code; });
          return json(200, { code });
        }
      }
      bad('Could not start the run. Try again.', 503);
    }

    bad('Not found.', 404);
  }

  return async function handler(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/\.netlify\/functions\/(api|mind-heist)/, '').replace(/^\/mind-heist/, '').replace(/^\/api/, '') || '/';
    const now = clock();
    try {
      return await route(req, path, url, now);
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message });
      if (e instanceof E.GameError) return json(e.status, { error: e.message });
      console.error(e);
      return json(500, { error: 'Something broke on our side. Try again.' });
    }
  };
}
