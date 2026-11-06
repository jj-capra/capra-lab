/* Netlify Function (v2) — the whole API behind one endpoint.
 *
 * Capra Lab's netlify.toml sends /primal-survival/api/* here. The work is done by the shared router in
 * server/api.js, so this file is only translation: Request in, Response out.
 *
 * The engine that scores a run is the same module the browser imports. A
 * client can submit any five ids it likes; those five are what gets simulated.
 */
import { createApi, route } from '../../server/api.js';
import { blobStore } from '../../server/stores.js';
import { cacheOnSuccess } from '../../server/once.js';
import { createProfiles } from '../../../../lab/profiles.js';
import { blobStore as labStore, PROFILE_STORE } from '../../../../lab/stores.js';

const JSON_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'cache-control': 'no-store'
};

/* Functions stay warm between invocations, so build the store once — but only
 * cache a SUCCESSFUL build. Caching the promise unconditionally means a single
 * cold-start hiccup is remembered as a rejected promise for the life of the
 * instance, and every later request to it fails the same way. That is what
 * "the score store is unavailable" looked like in the wild: fine for some
 * players, broken for hours for whoever kept landing on a poisoned instance. */
/* Game data lives in this game's store; who a player is lives in Capra Lab's. */
const getApi = cacheOnSuccess(async () =>
  createApi(await blobStore('primal-survival'), createProfiles(await labStore(PROFILE_STORE))));

/* A crude per-instance rate limit. It is not a security boundary — instances
 * come and go — but it stops one enthusiastic tester filling the board. */
const hits = new Map();
/* a family shares one address, so this has to clear a household playing together */
const LIMIT = 120, WINDOW = 60 * 60 * 1000;
function overLimit(ip) {
  const now = Date.now();
  const seen = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  seen.push(now);
  hits.set(ip, seen);
  if (hits.size > 5000) hits.clear();
  return seen.length > LIMIT;
}

export default async function handler(req, context) {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: JSON_HEADERS });

  const url = new URL(req.url);
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';

  /* Only submissions are limited. Signing in and making a profile must not be,
   * or a household behind one IP locks itself out while getting set up. */
  const isRunPost = req.method === 'POST' && /\/runs\/?$/.test(url.pathname);
  if (isRunPost && overLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Too many runs from here. Try again later.' }),
      { status: 429, headers: JSON_HEADERS });
  }

  let body = null;
  if (req.method === 'POST') {
    try { body = await req.json(); }
    catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers: JSON_HEADERS }); }
  }

  try {
    const api = await getApi();
    const out = await route(api, req.method, url.pathname, url.searchParams, body);
    const status = out && out.status ? out.status : 200;
    const payload = out && out.status ? { error: out.error } : out;
    return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
  } catch (e) {
    /* the usual cause is Blobs not being reachable. say so plainly — the client
       treats any API failure as offline and keeps the game playable. */
    const blobs = /blob/i.test(e.message);
    return new Response(JSON.stringify({
      error: blobs
        ? 'The score store did not answer just then. Try again in a moment — this is usually brief.'
        : e.message
    }), { status: 500, headers: JSON_HEADERS });
  }
}

/* No `config.path` here on purpose. Capra Lab's netlify.toml owns the
 * /primal-survival/api/* mapping, and the router keys off the last path
 * segment, so any prefix works. */
