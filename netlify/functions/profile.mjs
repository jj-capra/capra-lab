/* Capra Lab profiles API: /api/profile/* (netlify.toml routes it here).
 * The logic is in lab/profiles.js; this file only turns Requests into calls. */
import { createProfiles, routeProfiles } from '../../lab/profiles.js';
import { blobStore, PROFILE_STORE } from '../../lab/stores.js';
import { cacheOnSuccess } from '../../games/primal-survival/server/once.js';

const JSON_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'cache-control': 'no-store'
};

/* build the store once per warm instance, but never cache a failed build */
const getProfiles = cacheOnSuccess(() => blobStore(PROFILE_STORE).then(createProfiles));

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: JSON_HEADERS });
  const url = new URL(req.url);
  let body = null;
  if (req.method === 'POST') {
    try { body = await req.json(); }
    catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers: JSON_HEADERS }); }
  }
  try {
    const out = await routeProfiles(await getProfiles(), req.method, url.pathname, url.searchParams, body);
    const status = out && out.status ? out.status : 200;
    return new Response(JSON.stringify(out && out.status ? { error: out.error } : out), { status, headers: JSON_HEADERS });
  } catch (e) {
    const store = /blob/i.test(e.message);
    return new Response(JSON.stringify({
      error: store ? 'The profile store did not answer just then. Try again in a moment.' : e.message
    }), { status: 500, headers: JSON_HEADERS });
  }
}
