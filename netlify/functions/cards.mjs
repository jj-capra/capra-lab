// Capra Lab's daily Card Draw at /api/cards/* (path set below, so netlify.toml has no rule for it).
// The logic is lab/cards.js; the cards are public/lab/cards-catalog.mjs.
import { getStore } from '@netlify/blobs';
import { createCards, STORE } from '../../lab/cards.js';
import { blobsStore } from '../../lab/casstore.js';
import { createProfiles } from '../../lab/profiles.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';

export default async function (req) {
  const profiles = createProfiles(await blobStore(PROFILE_STORE));
  return createCards({
    store: blobsStore(getStore, STORE),
    verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; },
  }).handle(req);
}

export const config = { path: '/api/cards/*', rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
