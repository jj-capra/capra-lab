// Goat Getaway's server at /goat-getaway/api/* (path set below, so netlify.toml has no rule for it).
// Its own store holds the pens' race boards and ribbons; diamonds go into Mind Heist's store.
import { getStore } from '@netlify/blobs';
import { createApi } from '../../games/goat-getaway/server/api.js';
import { blobsStore } from '../../games/goat-getaway/server/store.js';
import { netlifyStore } from '../../games/mind-heist/src/server/store.mjs';
import { createProfiles } from '../../lab/profiles.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';

export default async function (req) {
  // Blobs context is per invocation, so bind the stores per request.
  const profiles = createProfiles(await blobStore(PROFILE_STORE));
  return createApi({
    store: blobsStore(getStore, 'goat-getaway'),
    mh: netlifyStore(getStore),
    verify: (name, code) => profiles.verify(name, code),
  }).handle(req);
}

export const config = {
  path: '/goat-getaway/api/*',
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
