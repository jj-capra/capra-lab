// Par-Tee Time's server at /par-tee-time/api/* (path set below, so netlify.toml has no rule for it).
// Online rooms and the Masters Course live in the `par-tee-time` store; the page polls while two
// phones play. Masters players are checked against Capra Lab's profiles.
import { getStore } from '@netlify/blobs';
import { createApi } from '../../games/par-tee-time/server/api.js';
import { blobsStore } from '../../games/par-tee-time/server/store.js';
import { createProfiles } from '../../lab/profiles.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';
import { createWallet, STORE as WALLET_STORE } from '../../lab/wallet.js';
import { blobsStore as casBlobs } from '../../lab/casstore.js';

export default async function (req) {
  const profiles = createProfiles(await blobStore(PROFILE_STORE));
  return createApi({
    store: blobsStore(getStore, 'par-tee-time'),
    verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; },
    wallet: createWallet({ store: casBlobs(getStore, WALLET_STORE) }),   // Masters loot and trophies pay shards and diamonds
  }).handle(req);
}

// Two phones poll about once a second while a friend lines up (two on the same Wi-Fi share an IP).
export const config = { path: '/par-tee-time/api/*', rateLimit: { windowLimit: 400, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
