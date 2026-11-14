/* Capra Lab profiles: one player identity for every game in the lab.
 *
 * A profile is a name and a six-digit key, nothing else. No email, no phone,
 * no password rules. The name is the lookup and the key is the proof, so the
 * key is the whole account. This is the scheme Primal Survival and Mind Heist
 * already used, lifted to the lab so a player signs up once and every game
 * knows them.
 *
 * Each game keeps its own stats in its own store, keyed by the profile's
 * handle. Nothing game-specific lives here, so a new game never has to touch
 * this file: it calls verify() when a player submits something, and reads or
 * writes its own stats beside it.
 *
 * Key shape:   profile/<handle>   { name, handle, salt, codeHash, created, lastKeyAt, hcp, hcpAt }
 *
 * The one shared setting is the golf handicap (hcp, set at hcpAt; public/lab/handicap-rules.mjs),
 * kept here because more than one place reads it and a weekly lock only works in one place.
 *
 * Keys are stored as a salted SHA-256. Six digits is not much entropy, but a
 * dump of the store should still not hand over every account.
 *
 * Guessing is slowed per name, not per address (games ask from Netlify's own
 * servers, so every guess can come from the same address): after 8 wrong keys
 * in 10 minutes the name stops accepting any key, right or wrong, until the 10
 * minutes are up. At that pace a guesser needs over a year for one name.
 *
 *              fails/<handle>     { n, since }
 */

import { HCP_MAX, cleanHcp, hcpNext } from '../public/lab/handicap-rules.mjs';

/* Names are up to 17 characters (JC, Nov 2026), so every game can show the whole name. */
export const NAME_MAX = 17;

export const handleOf = name =>
  String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);

const profileKey = handle => 'profile/' + handle;
const failKey = handle => 'fails/' + handle;
export const LOCK_AFTER = 8;
export const LOCK_MS = 10 * 60 * 1000;

function newCode() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(100000 + (n[0] % 900000));
}
function newSalt() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function hashCode(code, salt) {
  const data = new TextEncoder().encode(salt + ':' + code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}
/* compare without leaking where two hashes differ */
function sameHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* what a profile looks like to anyone: never the hash or the salt (the golf handicap is public:
 * it shows beside scores) */
export const publicIdentity = p => ({ name: p.name, handle: p.handle, created: p.created, hcp: cleanHcp(p.hcp || 0), hcpAt: p.hcpAt || 0 });

/* one message for a wrong name and a wrong key, so this cannot be used to discover names */
const NO_MATCH = { status: 401, error: 'No profile with that name and key.' };
const LOCKED = { status: 429, error: 'Too many wrong keys for that name. Wait 10 minutes and try again.' };

export function createProfiles(store, { now = () => Date.now() } = {}) {
  /* the wrong-key count for a name, or null once its 10 minutes are up */
  async function fails(handle) {
    const f = await store.get(failKey(handle));
    return f && now() - f.since < LOCK_MS ? f : null;
  }
  const locked = async handle => ((await fails(handle)) || { n: 0 }).n >= LOCK_AFTER;

  /* the profile when the name and key match; null otherwise, and null while the name is locked */
  async function verify(name, code) {
    const handle = handleOf(name);
    const p = await store.get(profileKey(handle));
    if (!p) return null;
    const f = await fails(handle);
    if (f && f.n >= LOCK_AFTER) return null;
    if (sameHash(p.codeHash, await hashCode(String(code || '').trim(), p.salt))) {
      if (f) await store.set(failKey(handle), { n: 0, since: 0 });
      return p;
    }
    await store.set(failKey(handle), f ? { n: f.n + 1, since: f.since } : { n: 1, since: now() });
    return null;
  }

  return {
    verify,
    locked: name => locked(handleOf(name)),

    /* The only time a key is ever returned in the clear, apart from rotateKey. */
    async create(body) {
      const name = String(body.name || '').trim().slice(0, NAME_MAX);
      const handle = handleOf(name);
      if (handle.length < 2) return { status: 400, error: 'Pick a name with at least two letters or numbers.' };
      if (await store.get(profileKey(handle))) return { status: 409, error: 'That name is taken. Try another.' };
      const code = newCode(), salt = newSalt();
      const p = { name, handle, salt, codeHash: await hashCode(code, salt), created: new Date().toISOString() };
      await store.set(profileKey(handle), p);
      return { identity: publicIdentity(p), code };
    },

    async signIn(body) {
      const p = await verify(body.name, body.code);
      if (p) return { identity: publicIdentity(p) };
      return (await locked(handleOf(body.name))) ? LOCKED : NO_MATCH;
    },

    /* Cuts a fresh key and retires the old one. Being signed in is the only
     * proof of possession there is, so this is the whole recovery story: keep
     * a key card, or keep the key. */
    async rotateKey(body) {
      const p = await verify(body.name, body.code);
      if (!p) return (await locked(handleOf(body.name))) ? LOCKED : NO_MATCH;
      const code = newCode();
      p.salt = newSalt();
      p.codeHash = await hashCode(code, p.salt);
      p.lastKeyAt = new Date().toISOString();
      await store.set(profileKey(p.handle), p);
      return { identity: publicIdentity(p), code };
    },

    /* The golf handicap (public/lab/handicap-rules.mjs): 0 to HCP_MAX, changed at most once a week
     * (the first time any time). Par-Tee Time's Masters reads it from the profile, so it can't be
     * picked per round. */
    async setHandicap(body) {
      const p = await verify(body.name, body.code);
      if (!p) return (await locked(handleOf(body.name))) ? LOCKED : NO_MATCH;
      const n = Number(body.hcp);
      if (!Number.isInteger(n) || n < 0 || n > HCP_MAX) return { status: 400, error: `A handicap is a whole number from 0 to ${HCP_MAX}.` };
      if (n === cleanHcp(p.hcp || 0) && p.hcpAt) return { identity: publicIdentity(p) };
      const next = hcpNext(p.hcpAt || 0);
      if (next && now() < next) return { status: 429, error: 'You can change your handicap once a week.', next };
      p.hcp = n; p.hcpAt = now();
      await store.set(profileKey(p.handle), p);
      return { identity: publicIdentity(p) };
    },

    async get(name) {
      const p = await store.get(profileKey(handleOf(name)));
      return p ? { identity: publicIdentity(p) } : { status: 404, error: 'No profile by that name.' };
    }
  };
}

/* The lab-wide profile API, for the hub and any game that only needs identity.
 *   POST /api/profile/create   { name }         -> { name, handle, created, code }
 *   POST /api/profile/signin   { name, code }   -> { name, handle, created }
 *   POST /api/profile/key      { name, code }   -> { name, handle, created, code }
 *   POST /api/profile/handicap { name, code, hcp } -> { name, handle, created, hcp, hcpAt }
 *   GET  /api/profile?name=                     -> { name, handle, created, hcp, hcpAt }
 * Like the games' routers it keys off the last path segment, so it works
 * behind any prefix. */
export async function routeProfiles(profiles, method, pathname, query, body) {
  const op = pathname.replace(/\/+$/, '').split('/').pop();
  const flat = r => (r.status ? r : { ...r.identity, ...(r.code ? { code: r.code } : {}) });
  if (method === 'POST' && op === 'create') return flat(await profiles.create(body || {}));
  if (method === 'POST' && op === 'signin') return flat(await profiles.signIn(body || {}));
  if (method === 'POST' && op === 'key') return flat(await profiles.rotateKey(body || {}));
  if (method === 'POST' && op === 'handicap') return flat(await profiles.setHandicap(body || {}));
  if (method === 'GET' && op === 'profile') return flat(await profiles.get(query.get('name')));
  return { status: 404, error: 'no such route: ' + method + ' /' + op };
}
