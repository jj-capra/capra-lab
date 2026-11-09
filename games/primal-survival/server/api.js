/* Primal Survival — API logic, independent of how it is hosted.
 *
 * Nothing in here knows about http, Netlify, or the filesystem. It takes a
 * store with get/set/list and returns the four operations the game needs, so
 * identical verification code runs behind a plain Node server locally and
 * behind a Netlify Function in production. Only the store and the thin
 * request wrapper differ.
 *
 * Key shapes:
 *   season/<seed>   the frozen ladder for a season, written once at open
 *   run/<seed>/<hash>   one blob per verified run
 *
 * Runs are stored one key per run rather than appended to a season array.
 * That matters on a serverless host: two players submitting in the same second
 * are two different keys, so neither can clobber the other. An array would
 * need a transaction the blob store does not offer.
 */
import { ROLES } from '../shared/constants.js';
import { resolveSquad, runSeason, squadRating, runHash, hashStr } from '../shared/engine.js';
import { gradeFor } from '../shared/grade.js';
import { rankFor, emptyStats, applyRun } from '../shared/ranks.js';
import { createProfiles, handleOf, NAME_MAX } from '../../../lab/profiles.js';
import { BEST_OF, MAX_ROUNDS, winsNeeded, roundSeed, roundWinner } from '../shared/versus.js';

export const LADDER_SIZE = 240;

export const seedForNow = (d = new Date()) => d.toISOString().slice(0, 10);

const priorSeed = seed => {
  const d = new Date(seed + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
const cleanName = s => String(s || '').replace(/[^\w \-'.]/g, '').trim().slice(0, 24) || 'Anonymous';
const seasonKey = seed => 'season/' + seed;
const runPrefix = seed => 'run/' + seed + '/';
const statsKey = handle => 'stats/' + handle;

/* ---------------- head to head ----------------
 * A match is a handful of small blobs, so the two players never write the same
 * one (the store has no transactions):
 *   vs/<CODE>                 the match: best of, the host's seat
 *   vs/<CODE>/p1              the rival's seat, written once when they join
 *   vs/<CODE>/r<N>/<slot>     a player's locked five for round N
 *   vs/<CODE>/r<N>/res        both runs, written once both are locked (pure,
 *                             so two writers write the same thing)
 *   vs/<CODE>/next            the rematch's code
 * A seat is a name plus a random token the phone keeps; a signed-in player's
 * name comes from their Capra Lab profile. */
const VS_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const vsCode = s => String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
const vsKey = code => 'vs/' + code;
const newToken = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(12)),
  b => b.toString(16).padStart(2, '0')).join('');
const vsName = s => String(s || '').replace(/[^\w \-'.]/g, '').trim().slice(0, NAME_MAX);

/* ---------------- profiles ----------------
 * Identity belongs to Capra Lab (lab/profiles.js): one name and six-digit key
 * for every game in the lab. This game keeps only its own career stats,
 * under stats/<handle> in its own store. */
export { handleOf };

/* what a profile looks like to anyone: lab identity plus this game's career */
function publicProfile(identity, stats) {
  return { ...identity, stats, rank: rankFor(stats.totalDays) };
}

/* `profiles` is the lab-wide identity store. Left out (tests, the local dev
 * server), identities live in this game's own store under profile/<handle>. */
export function createApi(store, profiles = createProfiles(store)) {
  async function statsFor(handle) {
    const rec = await store.get(statsKey(handle));
    return rec && rec.stats ? rec.stats : emptyStats();
  }

  /* A season's ladder is frozen the moment the season opens. Squads submitted
   * today become tomorrow's opposition — which is also what keeps verification
   * honest: the ladder cannot move under a run already in progress. */
  async function season(seed = seedForNow()) {
    const existing = await store.get(seasonKey(seed));
    if (existing) return existing;

    const yesterday = priorSeed(seed);
    let source = await store.list(runPrefix(yesterday));
    /* a quiet day should not empty the ladder — carry the previous one forward */
    if (!source.length) {
      const prev = await store.get(seasonKey(yesterday));
      source = prev ? prev.ladder : [];
    }
    const ladder = source
      .map(r => ({ name: r.name, squad: r.squad, rating: r.rating }))
      .sort((a, b) => a.rating - b.rating)
      .slice(0, LADDER_SIZE);

    const fresh = { seed, opened: new Date().toISOString(), ladder };
    await store.set(seasonKey(seed), fresh);
    return fresh;
  }

  function place(entry, runs) {
    return {
      days: entry.days, grade: entry.grade, rank: entry.rank, perfect: entry.perfect,
      feats: { kills: entry.kills, stuns: entry.stuns, routs: entry.routs, close: entry.close },
      place: runs.filter(r => r.days > entry.days).length + 1,
      of: runs.length
    };
  }

  /* who is sitting down: a verified Capra Lab profile, or a guest's name */
  async function vsWho(body) {
    if (body.name && body.code) {
      const p = await profiles.verify(body.name, body.code);
      if (!p) return { status: 401, error: 'That key does not match that name.' };
      return { name: p.name, handle: p.handle };
    }
    const name = vsName(body.name);
    if (!name) return { status: 400, error: 'Type a name first.' };
    return { name, handle: null };
  }

  async function vsSeat(code, tok) {
    const meta = await store.get(vsKey(code));
    if (!meta) return { status: 404, error: 'No match with that code.' };
    if (tok && tok === meta.host.tok) return { slot: 0 };
    const p1 = (await store.list(vsKey(code) + '/')).find(x => x.kind === 'p1');
    if (tok && p1 && tok === p1.tok) return { slot: 1 };
    return { status: 403, error: 'You are not playing in this match.' };
  }

  /* The whole match as both phones see it. A round's squads stay hidden until
   * both are locked; then both runs are played (once) and stored. */
  async function vsView(code) {
    const meta = await store.get(vsKey(code));
    if (!meta) return null;
    const parts = await store.list(vsKey(code) + '/');
    const p1 = parts.find(x => x.kind === 'p1');
    const next = parts.find(x => x.kind === 'next');
    const seat = p => (p ? { name: p.name, handle: p.handle || null } : null);
    const need = winsNeeded(meta.bestOf);
    const score = [0, 0], rounds = [];
    let round = 1, winner = null;
    for (let n = 1; n <= MAX_ROUNDS; n++) {
      const locks = [0, 1].map(k => parts.find(x => x.kind === 'lock' && x.round === n && x.slot === k));
      if (!locks[0] && !locks[1]) { round = n; break; }
      const r = { n, locked: locks.map(Boolean) };
      rounds.push(r);
      if (!locks[0] || !locks[1]) { round = n; break; }
      let res = parts.find(x => x.kind === 'res' && x.round === n);
      if (!res) {
        const seed = roundSeed(code, n);
        const runs = locks.map(l => runSeason(resolveSquad(l.squad), seed, null, { fair: true }));
        res = {
          kind: 'res', round: n,
          days: runs.map(x => x.days), kills: runs.map(x => x.feats.kills),
          at: locks.map(l => l.at),
          winner: roundWinner(...runs.map((x, k) => ({ days: x.days, kills: x.feats.kills, at: locks[k].at })))
        };
        await store.set(vsKey(code) + '/r' + n + '/res', res);
      }
      Object.assign(r, { squads: locks.map(l => l.squad), days: res.days, kills: res.kills, winner: res.winner,
        first: res.at && res.at[0] !== res.at[1] ? (res.at[0] < res.at[1] ? 0 : 1) : null });
      if (res.winner >= 0) score[res.winner] += 1;
      if (score[0] >= need || score[1] >= need) { winner = score[0] >= need ? 0 : 1; round = n; break; }
      round = n + 1;
    }
    /* fifteen rounds without a winner: whoever leads takes it, level is a draw */
    if (winner == null && rounds.length >= MAX_ROUNDS && rounds.every(r => r.winner != null)) {
      winner = score[0] === score[1] ? -1 : score[0] > score[1] ? 0 : 1;
    }
    return {
      code, bestOf: meta.bestOf, need, created: meta.created,
      players: [seat(meta.host), seat(p1)],
      rounds, round, score, winner, next: next ? next.code : null
    };
  }

  return {
    seedForNow, season,

    async getSeason(seed) {
      const s = await season(seed);
      const runs = await store.list(runPrefix(s.seed));
      return { seed: s.seed, opened: s.opened, ladderSize: s.ladder.length, runs: runs.length };
    },

    /* The frozen opponents. The client pulls these once and simulates locally,
     * so the year animates with no network round trip per day. */
    async getLadder(seed) {
      const s = await season(seed);
      return { seed: s.seed, ladder: s.ladder.map(e => ({ name: e.name, squad: e.squad })) };
    },

    /* Today's board: the best single run of this season. */
    async getLeaderboard(seed, limit = 25) {
      const s = await season(seed);
      const runs = await store.list(runPrefix(s.seed));
      const n = Math.min(100, Number(limit) || 25);
      return {
        scope: 'today', seed: s.seed,
        entries: runs
          .sort((a, b) => b.days - a.days || a.at.localeCompare(b.at))
          .slice(0, n)
          .map((r, i) => ({ place: i + 1, name: r.name, handle: r.handle, days: r.days,
                            grade: r.grade, rank: r.rank, kills: r.kills, at: r.at }))
      };
    },

    /* All time: total days survived across every run a profile has banked.
     * Guests do not appear here — there is nothing to add them up against. */
    async getLifetime(limit = 25) {
      const careers = await store.list('stats/');
      const n = Math.min(100, Number(limit) || 25);
      return {
        scope: 'lifetime',
        entries: careers
          .filter(p => p.stats && p.stats.runs > 0)
          .sort((a, b) => b.stats.totalDays - a.stats.totalDays ||
                          b.stats.bestDays - a.stats.bestDays)
          .slice(0, n)
          .map((p, i) => ({
            place: i + 1, name: p.name, handle: p.handle,
            totalDays: p.stats.totalDays, runs: p.stats.runs,
            bestDays: p.stats.bestDays, bestGrade: p.stats.bestGrade,
            perfect: p.stats.perfect, rank: rankFor(p.stats.totalDays).name
          }))
      };
    },

    /* ---------------- profiles ---------------- */

    async createProfile(body) {
      const r = await profiles.create(body);
      if (r.status) return r;
      /* the only time the key is ever returned */
      return { ...publicProfile(r.identity, emptyStats()), code: r.code, isNew: true };
    },

    async signIn(body) {
      const r = await profiles.signIn(body);
      if (r.status) return r;
      return publicProfile(r.identity, await statsFor(r.identity.handle));
    },

    async rotateKey(body) {
      const r = await profiles.rotateKey(body);
      if (r.status) return r;
      return { ...publicProfile(r.identity, await statsFor(r.identity.handle)), code: r.code };
    },

    async getProfile(name) {
      const r = await profiles.get(name);
      if (r.status) return r;
      return publicProfile(r.identity, await statsFor(r.identity.handle));
    },

    /* ---------------- head to head ---------------- */

    async vsNew(body) {
      const bestOf = BEST_OF.includes(Number(body.bestOf)) ? Number(body.bestOf) : 3;
      const who = await vsWho(body);
      if (who.status) return who;
      let code = '';
      for (let i = 0; i < 20 && !code; i++) {
        const c = Array.from({ length: 4 }, () => VS_ALPHA[Math.floor(Math.random() * VS_ALPHA.length)]).join('');
        if (!(await store.get(vsKey(c)))) code = c;
      }
      if (!code) return { status: 503, error: 'No free match codes. Try again.' };
      const seat = { name: who.name, handle: who.handle, tok: newToken() };
      await store.set(vsKey(code), { code, bestOf, created: new Date().toISOString(), host: seat });
      return { code, slot: 0, tok: seat.tok, match: await vsView(code) };
    },

    async vsJoin(body) {
      const code = vsCode(body.m);
      const meta = await store.get(vsKey(code));
      if (!meta) return { status: 404, error: 'No match with that code.' };
      const parts = await store.list(vsKey(code) + '/');
      const p1 = parts.find(x => x.kind === 'p1');
      /* the same phone coming back keeps its seat */
      if (body.tok && body.tok === meta.host.tok) return { code, slot: 0, tok: meta.host.tok, match: await vsView(code) };
      if (body.tok && p1 && body.tok === p1.tok) return { code, slot: 1, tok: p1.tok, match: await vsView(code) };
      if (p1) return { status: 409, error: 'That match already has two players.' };
      const who = await vsWho(body);
      if (who.status) return who;
      if (who.handle && who.handle === meta.host.handle) return { status: 409, error: 'That is your own match. Send the link to your rival.' };
      const seat = { kind: 'p1', name: who.name, handle: who.handle, tok: newToken(), at: new Date().toISOString() };
      await store.set(vsKey(code) + '/p1', seat);
      return { code, slot: 1, tok: seat.tok, match: await vsView(code) };
    },

    async vsGet(m) {
      const code = vsCode(m);
      const view = await vsView(code);
      return view || { status: 404, error: 'No match with that code.' };
    },

    /* Lock in five for the current round. Each player writes only their own blob. */
    async vsLock(body) {
      const code = vsCode(body.m);
      const seat = await vsSeat(code, body.tok);
      if (seat.status) return seat;
      const view = await vsView(code);
      if (view.winner != null) return { status: 409, error: 'This match is over.' };
      if (!view.players[1]) return { status: 409, error: 'Your rival has not joined yet.' };
      if (Number(body.round) !== view.round) return { status: 409, error: 'That round is already over.', match: view };
      const ids = {};
      for (const r of ROLES) ids[r] = Number(body.squad?.[r]);
      try { resolveSquad(ids); }
      catch (e) { return { status: 400, error: e.message }; }
      const cur = view.rounds[view.round - 1];
      if (cur && cur.locked[seat.slot]) return { status: 409, error: 'Your five are already locked in.', match: view };
      await store.set(vsKey(code) + '/r' + view.round + '/' + seat.slot,
        { kind: 'lock', round: view.round, slot: seat.slot, squad: ids, at: new Date().toISOString() });
      return { ok: true, match: await vsView(code) };
    },

    /* Rematch: the same two seats, a fresh match. The code comes from the old
     * one, so both phones tapping at once land in the same match. */
    async vsAgain(body) {
      const code = vsCode(body.m);
      const seat = await vsSeat(code, body.tok);
      if (seat.status) return seat;
      const view = await vsView(code);
      if (view.winner == null) return { status: 409, error: 'Finish this match first.' };
      const meta = await store.get(vsKey(code));
      const p1 = (await store.list(vsKey(code) + '/')).find(x => x.kind === 'p1');
      for (let salt = 0; salt < 30; salt++) {
        const h = hashStr('again:' + code + ':' + salt);
        const next = Array.from({ length: 4 }, (_, i) => VS_ALPHA[(h >>> (i * 5)) % VS_ALPHA.length]).join('');
        const there = await store.get(vsKey(next));
        if (there && there.host.tok !== meta.host.tok) continue;   /* taken by someone else */
        if (!there) {
          await store.set(vsKey(next), { code: next, bestOf: meta.bestOf, created: new Date().toISOString(), host: meta.host, from: code });
          await store.set(vsKey(next) + '/p1', { ...p1, at: new Date().toISOString() });
          await store.set(vsKey(code) + '/next', { kind: 'next', code: next });
        }
        return { code: next, slot: seat.slot, tok: body.tok, match: await vsView(next) };
      }
      return { status: 503, error: 'Could not open a rematch. Start a new match.' };
    },

    /* The client sends five animal ids. The server plays the year itself. */
    async submitRun(body) {
      const seed = String(body.seed || seedForNow()).slice(0, 32);
      const s = await season(seed);

      const ids = {};
      for (const r of ROLES) ids[r] = Number(body.squad?.[r]);
      let squad;
      try { squad = resolveSquad(ids); }
      catch (e) { return { status: 400, error: e.message }; }

      const result = runSeason(squad, seed, s.ladder);
      const g = gradeFor(result.days);
      const hash = runHash(ids, seed, result.days);

      /* a signed-in run carries its profile; a guest run is just a name */
      let profile = null;
      if (body.name && body.code) {
        profile = await profiles.verify(body.name, body.code);
        if (!profile) return { status: 401, error: 'That key does not match that name.' };
      }

      const runs = await store.list(runPrefix(seed));
      const already = runs.find(r => r.hash === hash);
      /* a duplicate must not bank its stats a second time */
      if (already) return { verified: true, duplicate: true, ...place(already, runs) };

      const entry = {
        hash,
        name: profile ? profile.name : cleanName(body.name),
        handle: profile ? profile.handle : null,
        squad: ids, rating: squadRating(squad),
        days: result.days, perfect: result.perfect, grade: g.letter, rank: g.rank,
        kills: result.feats.kills, stuns: result.feats.stuns,
        routs: result.feats.routs, close: result.feats.close,
        rallies: (result.rallyDays || []).length,
        at: new Date().toISOString()
      };
      await store.set(runPrefix(seed) + hash, entry);

      let career = null;
      if (profile) {
        /* re-read: a run submitted from two tabs must not lose either result */
        const fresh = (await store.get(statsKey(profile.handle))) ||
                      { handle: profile.handle, stats: emptyStats() };
        fresh.name = profile.name;
        fresh.stats = applyRun(fresh.stats, entry);
        await store.set(statsKey(fresh.handle), fresh);
        career = { stats: fresh.stats, rank: rankFor(fresh.stats.totalDays) };
      }
      return { verified: true, duplicate: false, ...place(entry, runs.concat(entry)), career };
    }
  };
}

/* One router for both hosts, so the API surface cannot drift between them.
 * Returns a plain object; the caller decides how to put it on the wire. */
export async function route(api, method, pathname, query, body) {
  const op = pathname.replace(/\/+$/, '').split('/').pop();
  const seed = query.get('seed') || undefined;
  const limit = query.get('limit');
  if (method === 'GET' && op === 'season') return api.getSeason(seed);
  if (method === 'GET' && op === 'ladder') return api.getLadder(seed);
  if (method === 'GET' && op === 'leaderboard') {
    return query.get('scope') === 'lifetime'
      ? api.getLifetime(limit)
      : api.getLeaderboard(seed, limit);
  }
  if (method === 'GET' && op === 'profile') return api.getProfile(query.get('name'));
  if (method === 'POST' && op === 'runs') return api.submitRun(body || {});
  if (method === 'POST' && op === 'create') return api.createProfile(body || {});
  if (method === 'POST' && op === 'signin') return api.signIn(body || {});
  if (method === 'POST' && op === 'key') return api.rotateKey(body || {});
  if (method === 'GET' && op === 'vs') return api.vsGet(query.get('m'));
  if (method === 'POST' && op === 'vs-new') return api.vsNew(body || {});
  if (method === 'POST' && op === 'vs-join') return api.vsJoin(body || {});
  if (method === 'POST' && op === 'vs-lock') return api.vsLock(body || {});
  if (method === 'POST' && op === 'vs-again') return api.vsAgain(body || {});
  return { status: 404, error: 'no such route: ' + method + ' /' + op };
}
