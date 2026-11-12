// Capra Lab's wallet (diamonds, amber, shards) at /api/wallet/* (path set below, so netlify.toml has no
// rule for it). The logic is lab/wallet.js; what pays what is public/lab/wallet-catalog.mjs.
import { getStore } from '@netlify/blobs';
import { createWallet, STORE } from '../../lab/wallet.js';
import { blobsStore } from '../../lab/casstore.js';
import { createProfiles } from '../../lab/profiles.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';

export default async function (req) {
  const profiles = createProfiles(await blobStore(PROFILE_STORE));
  return createWallet({
    store: blobsStore(getStore, STORE),
    verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; },
  }).handle(req);
}

export const config = { path: '/api/wallet/*', rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
