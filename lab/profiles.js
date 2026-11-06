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
 * Key shape:   profile/<handle>   { name, handle, salt, codeHash, created, lastKeyAt }
 *
 * Keys are stored as a salted SHA-256. Six digits is not much entropy, but a
 * dump of the store should still not hand over every account.
 */

export const handleOf = name =>
  String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);

const profileKey = handle => 'profile/' + handle;

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

/* what a profile looks like to anyone: never the hash or the salt */
export const publicIdentity = p => ({ name: p.name, handle: p.handle, created: p.created });

/* one message for a wrong name and a wrong key, so this cannot be used to discover names */
const NO_MATCH = { status: 401, error: 'No profile with that name and key.' };

export function createProfiles(store) {
  async function verify(name, code) {
    const p = await store.get(profileKey(handleOf(name)));
    if (!p) return null;
    return sameHash(p.codeHash, await hashCode(String(code || '').trim(), p.salt)) ? p : null;
  }

  return {
    verify,

    /* The only time a key is ever returned in the clear, apart from rotateKey. */
    async create(body) {
      const name = String(body.name || '').trim().slice(0, 24);
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
      return p ? { identity: publicIdentity(p) } : NO_MATCH;
    },

    /* Cuts a fresh key and retires the old one. Being signed in is the only
     * proof of possession there is, so this is the whole recovery story: keep
     * a key card, or keep the key. */
    async rotateKey(body) {
      const p = await verify(body.name, body.code);
      if (!p) return NO_MATCH;
      const code = newCode();
      p.salt = newSalt();
      p.codeHash = await hashCode(code, p.salt);
      p.lastKeyAt = new Date().toISOString();
      await store.set(profileKey(p.handle), p);
      return { identity: publicIdentity(p), code };
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
 *   GET  /api/profile?name=                     -> { name, handle, created }
 * Like the games' routers it keys off the last path segment, so it works
 * behind any prefix. */
export async function routeProfiles(profiles, method, pathname, query, body) {
  const op = pathname.replace(/\/+$/, '').split('/').pop();
  const flat = r => (r.status ? r : { ...r.identity, ...(r.code ? { code: r.code } : {}) });
  if (method === 'POST' && op === 'create') return flat(await profiles.create(body || {}));
  if (method === 'POST' && op === 'signin') return flat(await profiles.signIn(body || {}));
  if (method === 'POST' && op === 'key') return flat(await profiles.rotateKey(body || {}));
  if (method === 'GET' && op === 'profile') return flat(await profiles.get(query.get('name')));
  return { status: 404, error: 'no such route: ' + method + ' /' + op };
}
