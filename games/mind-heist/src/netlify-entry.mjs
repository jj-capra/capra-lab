// Netlify Function entry. Capra Lab builds this into netlify/functions/mind-heist.mjs, and it
// serves every /mind-heist/api/* request (see config below).
import { getStore } from '@netlify/blobs';
import { makeHandler } from './server/api.mjs';
import { netlifyStore } from './server/store.mjs';
import { createProfiles } from '../../../lab/profiles.js';
import { blobStore, PROFILE_STORE } from '../../../lab/stores.js';

export default async function (req) {
  // getStore reads the Blobs context injected for this invocation, so bind it per request.
  // Capra Lab profiles live in the same site, so a lab name and key are checked right here.
  const profiles = createProfiles(await blobStore(PROFILE_STORE));
  const labCheck = async (name, code) => {
    const p = await profiles.verify(name, code);
    return p ? { name: p.name, handle: p.handle } : null;
  };
  return makeHandler(netlifyStore(getStore), { labCheck })(req);
}

// Route the function straight to /mind-heist/api/*. A path-configured function runs before
// redirect rules, so the app's fallback in Capra Lab's netlify.toml can't swallow API calls.
export const config = { path: '/mind-heist/api/*' };
