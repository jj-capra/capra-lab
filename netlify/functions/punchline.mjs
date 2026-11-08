// Punchline's server at /punchline/api/* (path set below, so netlify.toml has no rule for it).
// Rooms live in the `punchline` store; the decks are baked in by scripts/build.mjs
// (games/punchline/server/decks.gen.mjs). Capra's Lab roles come from the profile store.
import { getStore } from '@netlify/blobs';
import { createApi } from '../../games/punchline/server/api.js';
import { blobsStore } from '../../games/punchline/server/store.js';
import { DECKS } from '../../games/punchline/server/decks.gen.mjs';
import { createProfiles } from '../../lab/profiles.js';
import { createCrew } from '../../lab/crew.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';

export default async function (req) {
  // Blobs context is per invocation, so bind the stores per request.
  const labStore = await blobStore(PROFILE_STORE);
  const profiles = createProfiles(labStore), crew = createCrew(labStore);
  return createApi({
    store: blobsStore(getStore, 'punchline'),
    decks: DECKS,
    verify: (name, code) => profiles.verify(name, code),
    role: (handle) => crew.role(handle),
  }).handle(req);
}

export const config = {
  path: '/punchline/api/*',
  // Generous: a sleepover is a dozen phones on one wifi, all polling the same room.
  rateLimit: { windowLimit: 1200, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
