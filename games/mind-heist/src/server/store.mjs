// Storage adapters. Both expose get(key) -> {data, etag} | null and
// set(key, data, {onlyIfNew, onlyIfMatch}) -> {modified, etag}.

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
    async del(key) { map.delete(key); },
  };
}

export function netlifyStore(getStore) {
  const s = getStore({ name: 'mind-heist-daily', consistency: 'strong' });
  return {
    async get(key) {
      const r = await s.getWithMetadata(key, { type: 'json' });
      return r ? { data: r.data, etag: r.etag } : null;
    },
    async set(key, data, opts = {}) {
      const o = {};
      if (opts.onlyIfNew) o.onlyIfNew = true;
      // If a read came back without an ETag, fall back to a plain write.
      else if (opts.onlyIfMatch) o.onlyIfMatch = opts.onlyIfMatch;
      return s.setJSON(key, data, o);
    },
    async del(key) { await s.delete(key); },
  };
}
