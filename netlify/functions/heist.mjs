// Trophy rooms and trap houses at /api/heist/* (path set below, so netlify.toml has no rule for it).
// The logic is lab/heist.js; trophies and coins stay in the wallet (lab/wallet.js).
import { getStore } from '@netlify/blobs';
import { createHeist, STORE } from '../../lab/heist.js';
import { createWallet, STORE as WALLET_STORE } from '../../lab/wallet.js';
import { blobsStore } from '../../lab/casstore.js';
import { createProfiles } from '../../lab/profiles.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';

export default async function (req) {
  const profiles = createProfiles(await blobStore(PROFILE_STORE));
  const verify = async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; };
  const lookup = async (handle) => { const r = await profiles.get(handle); return r && r.identity ? r.identity : null; };
  const wallet = createWallet({ store: blobsStore(getStore, WALLET_STORE), verify });
  return createHeist({ store: blobsStore(getStore, STORE), wallet, verify, lookup }).handle(req);
}

export const config = { path: '/api/heist/*', rateLimit: { windowLimit: 150, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
