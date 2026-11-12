// Netlify Function entry. Capra Lab builds this into netlify/functions/mind-heist.mjs, and it
// serves every /mind-heist/api/* request (see config below).
import { getStore } from '@netlify/blobs';
import { makeHandler } from './server/api.mjs';
import { netlifyStore } from './server/store.mjs';
import { createProfiles } from '../../../lab/profiles.js';
import { createCrew } from '../../../lab/crew.js';
import { blobStore, PROFILE_STORE } from '../../../lab/stores.js';
import { createCards, STORE as CARD_STORE } from '../../../lab/cards.js';
import { blobsStore as casBlobs } from '../../../lab/casstore.js';

export default async function (req) {
  // getStore reads the Blobs context injected for this invocation, so bind it per request.
  // Capra Lab profiles live in the same site, so a lab name and key are checked right here.
  const labStore = await blobStore(PROFILE_STORE);
  const profiles = createProfiles(labStore);
  const crew = createCrew(labStore);   // Capra's Lab: who may see and host the hidden decks
  const labCheck = async (name, code) => {
    const p = await profiles.verify(name, code);
    return p ? { name: p.name, handle: p.handle } : null;
  };
  // Moles and Hidden 50/50s come from the lab's daily Card Draw (lab/cards.js)
  const cards = createCards({ store: casBlobs(getStore, CARD_STORE) });
  return makeHandler(netlifyStore(getStore), { labCheck, labRole: (handle) => crew.role(handle), cards })(req);
}

// Route the function straight to /mind-heist/api/*. A path-configured function runs before
// redirect rules, so the app's fallback in Capra Lab's netlify.toml can't swallow API calls.
export const config = { path: '/mind-heist/api/*' };
