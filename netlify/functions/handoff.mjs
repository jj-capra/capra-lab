// Invite hand-off from Safari to the Home Screen app at /api/handoff/* (path set below, so netlify.toml
// has no rule for it). The logic is lab/handoff.js.
import { getStore } from '@netlify/blobs';
import { createHandoff, STORE } from '../../lab/handoff.js';
import { blobsStore } from '../../lab/casstore.js';
import { createProfiles } from '../../lab/profiles.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';

export default async function (req, context) {
  const profiles = createProfiles(await blobStore(PROFILE_STORE));
  return createHandoff({
    store: blobsStore(getStore, STORE),
    verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; },
  }).handle(req, context);
}

export const config = { path: '/api/handoff/*', rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
