// Goat Getaway's server at /goat-getaway/api/* (path set below, so netlify.toml has no rule for it).
// Its own store holds the pens' race boards and ribbons; amber and diamonds go into the lab wallet.
import { getStore } from '@netlify/blobs';
import { createApi } from '../../games/goat-getaway/server/api.js';
import { blobsStore } from '../../games/goat-getaway/server/store.js';
import { createWallet, STORE as WALLET_STORE } from '../../lab/wallet.js';
import { blobsStore as casBlobs } from '../../lab/casstore.js';
import { createProfiles } from '../../lab/profiles.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';

export default async function (req) {
  // Blobs context is per invocation, so bind the stores per request.
  const profiles = createProfiles(await blobStore(PROFILE_STORE));
  return createApi({
    store: blobsStore(getStore, 'goat-getaway'),
    wallet: createWallet({ store: casBlobs(getStore, WALLET_STORE) }),
    verify: (name, code) => profiles.verify(name, code),
  }).handle(req);
}

export const config = {
  path: '/goat-getaway/api/*',
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
