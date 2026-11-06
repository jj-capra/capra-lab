/* Capra Lab storage adapters (the same ones Primal Survival uses). Each
 * exposes get, set and list, so the profile code never learns where it runs.
 *
 *   fileStore   local development: one JSON file on disk
 *   blobStore   Netlify: Netlify Blobs, which functions get with no setup
 *   memoryStore tests
 */

/* ---------------- local disk ---------------- */
export function fileStore(file) {
  const fsp = import('node:fs/promises');
  let cache = null, writing = null;

  async function read() {
    if (cache) return cache;
    const fs = await fsp;
    try { cache = JSON.parse(await fs.readFile(file, 'utf8')); }
    catch { cache = {}; }
    return cache;
  }
  async function flush() {
    const fs = await fsp;
    const path = await import('node:path');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(cache));
  }
  return {
    async get(key) { return (await read())[key] ?? null; },
    async set(key, value) {
      (await read())[key] = value;
      /* collapse bursts of writes into one disk hit */
      writing = writing || Promise.resolve().then(async () => { writing = null; await flush(); });
      return writing;
    },
    async list(prefix) {
      const db = await read();
      return Object.keys(db).filter(k => k.startsWith(prefix)).map(k => db[k]);
    }
  };
}

/* ---------------- Netlify Blobs ----------------
 * getStore() needs no credentials inside a Netlify Function — the runtime
 * injects them. Locally it needs siteID and token, which `netlify dev`
 * supplies, so the same code path works in both. */

/* One network blip should not become a player-visible failure. Two quick
 * retries cover the transient case; anything that fails three times in a row
 * is a real outage and deserves to surface. */
export async function withRetry(label, fn, attempts = 3, pause = 120) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      last = e;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, pause * (i + 1)));
    }
  }
  last.message = 'blob ' + label + ': ' + last.message;
  throw last;
}

/* the one store every game reads identities from */
export const PROFILE_STORE = 'capra-lab-profiles';

export async function blobStore(name) {
  const { getStore } = await import('@netlify/blobs');
  const store = getStore({ name, consistency: 'strong' });
  return {
    async get(key) {
      return withRetry('get ' + key, () => store.get(key, { type: 'json' }));
    },
    async set(key, value) {
      return withRetry('set ' + key, () => store.setJSON(key, value));
    },
    async list(prefix) {
      const { blobs } = await withRetry('list ' + prefix, () => store.list({ prefix }));
      /* a season's runs are read on every board view, so fetch them together */
      const out = await Promise.all(blobs.map(b =>
        withRetry('get ' + b.key, () => store.get(b.key, { type: 'json' }))));
      return out.filter(Boolean);
    }
  };
}

/* ---------------- memory ---------------- */
export function memoryStore(seed = {}) {
  const db = { ...seed };
  return {
    async get(key) { return db[key] ?? null; },
    async set(key, value) { db[key] = value; },
    async list(prefix) {
      return Object.keys(db).filter(k => k.startsWith(prefix)).map(k => db[k]);
    }
  };
}
