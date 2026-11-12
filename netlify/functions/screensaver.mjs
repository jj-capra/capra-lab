// Screensaver's server at /screensaver/api/* (path set below, so netlify.toml has no rule for it).
// Daily boards live in the `screensaver` store; who's playing comes from Capra Lab's profiles.
import { getStore } from '@netlify/blobs';
import { createApi } from '../../games/screensaver/server/api.js';
import { blobsStore } from '../../games/screensaver/server/store.js';
import { createProfiles } from '../../lab/profiles.js';
import { createCrew } from '../../lab/crew.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';
import { createCards, STORE as CARD_STORE } from '../../lab/cards.js';
import { blobsStore as casBlobs } from '../../lab/casstore.js';

export default async function (req) {
  const labStore = await blobStore(PROFILE_STORE);
  const profiles = createProfiles(labStore), crew = createCrew(labStore);
  return createApi({
    store: blobsStore(getStore, 'screensaver'),
    verify: (name, code) => profiles.verify(name, code),
    role: (handle) => crew.role(handle),
    cards: createCards({ store: casBlobs(getStore, CARD_STORE) }),   // Extra Life cards from the daily draw
  }).handle(req);
}

export const config = { path: '/screensaver/api/*', rateLimit: { windowLimit: 300, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
