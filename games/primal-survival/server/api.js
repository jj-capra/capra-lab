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
import { resolveSquad, runSeason, squadRating, runHash } from '../shared/engine.js';
import { gradeFor } from '../shared/grade.js';
import { rankFor, emptyStats, applyRun } from '../shared/ranks.js';
import { createProfiles, handleOf } from '../../../lab/profiles.js';

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
  return { status: 404, error: 'no such route: ' + method + ' /' + op };
}
