// The daily challenge boards at /api/daily/* (path set below, so netlify.toml has no rule for it).
// The logic is lab/daily.js; a day's winner is paid through the wallet (lab/wallet.js), which mints the trophy.
import { getStore } from '@netlify/blobs';
import { createDaily, STORE } from '../../lab/daily.js';
import { createWallet, STORE as WALLET_STORE } from '../../lab/wallet.js';
import { blobsStore } from '../../lab/casstore.js';
import { createProfiles } from '../../lab/profiles.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';

export default async function (req) {
  const profiles = createProfiles(await blobStore(PROFILE_STORE));
  const verify = async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; };
  const wallet = createWallet({ store: blobsStore(getStore, WALLET_STORE), verify });
  return createDaily({ store: blobsStore(getStore, STORE), wallet, verify }).handle(req);
}

export const config = { path: '/api/daily/*', rateLimit: { windowLimit: 150, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
