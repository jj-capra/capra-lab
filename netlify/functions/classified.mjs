// Classified's server at /classified/api/* (path set below, so netlify.toml has no rule for it).
// Rooms and share files live in the `classified` store; the missions, questions and awards are
// baked in by scripts/build.mjs (games/classified/server/content.gen.mjs). Capra's Lab roles come
// from the profile store.
import { getStore } from '@netlify/blobs';
import { createApi } from '../../games/classified/server/api.js';
import { blobsStore } from '../../games/classified/server/store.js';
import { CONTENT } from '../../games/classified/server/content.gen.mjs';
import { createProfiles } from '../../lab/profiles.js';
import { createCrew } from '../../lab/crew.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';

export default async function (req) {
  // Blobs context is per invocation, so bind the stores per request.
  const labStore = await blobStore(PROFILE_STORE);
  const profiles = createProfiles(labStore), crew = createCrew(labStore);
  return createApi({
    store: blobsStore(getStore, 'classified'),
    content: CONTENT,
    verify: (name, code) => profiles.verify(name, code),
    role: (handle) => crew.role(handle),
  }).handle(req);
}

export const config = {
  path: '/classified/api/*',
  // Generous: a sleepover is a dozen phones on one wifi.
  rateLimit: { windowLimit: 1200, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
