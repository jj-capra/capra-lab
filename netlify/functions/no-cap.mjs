// No Cap's server at /no-cap/api/* (path set below, so netlify.toml has no rule for it).
// Rooms and challenges live in the `no-cap` store; the decks are baked in by scripts/build.mjs
// (games/no-cap/server/decks.gen.mjs, without their sources). Capra's Lab roles come from the
// profile store.
import { getStore } from '@netlify/blobs';
import { createApi } from '../../games/no-cap/server/api.js';
import { blobsStore } from '../../games/no-cap/server/store.js';
import { DECKS } from '../../games/no-cap/server/decks.gen.mjs';
import { createProfiles } from '../../lab/profiles.js';
import { createCrew } from '../../lab/crew.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';
import { createCards, STORE as CARD_STORE } from '../../lab/cards.js';
import { blobsStore as casBlobs } from '../../lab/casstore.js';

export default async function (req) {
  // Blobs context is per invocation, so bind the stores per request.
  const labStore = await blobStore(PROFILE_STORE);
  const profiles = createProfiles(labStore), crew = createCrew(labStore);
  return createApi({
    store: blobsStore(getStore, 'no-cap'),
    decks: DECKS,
    verify: (name, code) => profiles.verify(name, code),
    role: (handle) => crew.role(handle),
    cards: createCards({ store: casBlobs(getStore, CARD_STORE) }),   // Cap Shields from the daily draw
  }).handle(req);
}

export const config = {
  path: '/no-cap/api/*',
  // A party is a dozen phones on one wifi, each checking in every couple of seconds.
  rateLimit: { windowLimit: 1200, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
