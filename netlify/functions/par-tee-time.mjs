// Par-Tee Time's online rooms at /par-tee-time/api/* (path set below, so netlify.toml has no rule for it).
// Rooms live in the `par-tee-time` store; the page polls while two phones play.
import { getStore } from '@netlify/blobs';
import { createApi } from '../../games/par-tee-time/server/api.js';
import { blobsStore } from '../../games/par-tee-time/server/store.js';

export default async function (req) {
  return createApi({ store: blobsStore(getStore, 'par-tee-time') }).handle(req);
}

// Two phones poll about once a second while a friend lines up (two on the same Wi-Fi share an IP).
export const config = { path: '/par-tee-time/api/*', rateLimit: { windowLimit: 400, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
