// Storage with compare-and-swap (the same shape as Goat Getaway's and Mind Heist's adapters):
// get(key) -> { data, etag } | null and set(key, data, { onlyIfNew, onlyIfMatch }) -> { modified, etag }.

export function memoryStore() {
  const map = new Map();
  let n = 0;
  return {
    map,
    async get(key) {
      const e = map.get(key);
      return e ? { data: structuredClone(e.data), etag: e.etag } : null;
    },
    async set(key, data, opts = {}) {
      const e = map.get(key);
      if (opts.onlyIfNew && e) return { modified: false };
      if (opts.onlyIfMatch && (!e || e.etag !== opts.onlyIfMatch)) return { modified: false };
      const etag = `"${++n}"`;
      map.set(key, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
  };
}

export function blobsStore(getStore, name) {
  const s = getStore({ name, consistency: 'strong' });
  return {
    async get(key) {
      const r = await s.getWithMetadata(key, { type: 'json' });
      return r ? { data: r.data, etag: r.etag } : null;
    },
    async set(key, data, opts = {}) {
      const o = {};
      if (opts.onlyIfNew) o.onlyIfNew = true;
      else if (opts.onlyIfMatch) o.onlyIfMatch = opts.onlyIfMatch;
      return s.setJSON(key, data, o);
    },
  };
}

export const SKIP = Symbol('skip');

// Read, change, write back only if nobody else wrote in between; retry if they did.
export async function mutate(store, key, fn, create = null) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const got = await store.get(key);
    if (!got && !create) return null;
    const data = got ? got.data : create();
    if ((await fn(data)) === SKIP) return { data, skipped: true };
    const res = got ? await store.set(key, data, got.etag ? { onlyIfMatch: got.etag } : {}) : await store.set(key, data, { onlyIfNew: true });
    if (res && res.modified) return { data };
    await new Promise((r) => setTimeout(r, 15 + Math.random() * 40 * (attempt + 1)));
  }
  const e = new Error('The room is busy. Try that again.');
  e.status = 503;
  throw e;
}
