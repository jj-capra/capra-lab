// Invite hand-off: from Safari to the Home Screen app (JC, Nov 13 2026: "When I send a text invite and
// select it when I have my Capra lab as a Home Screen app, it goes to my browser. Can it look for this
// iPhone Home Screen app and push it to that?").
//
// iOS can't do that: a link tapped in Messages always opens in Safari, and Safari can't open a Home
// Screen web app (only App Store apps can claim links). The two don't share storage either, so in
// Safari the player usually isn't signed in. So the invite waits here for a few minutes instead:
// Safari drops it (POST /api/handoff/drop { url, fp, name?, code? }) and the Home Screen app, the next
// time it opens or comes back to the front, picks it up (POST /api/handoff/claim { fp, name?, code? })
// and offers to open it.
//
// Matching the two sides: by lab profile when Safari has one (exact); otherwise by the phone itself:
// the same network address and the same phone (iOS version, screen, time zone, language), or, for
// iCloud Private Relay, the same city and the same phone. Only hashes are kept, never the address.
// A drop is good for TTL and opens once. The url is only ever a path on this site.
import { createHash } from 'node:crypto';

export const STORE = 'capra-lab-handoff';
export const TTL = 5 * 60 * 1000;
const SALT = 'capra-lab-handoff-v1';

const fail = (status, error) => Object.assign(new Error(error), { status });
const hash = (...parts) => createHash('sha256').update([SALT, ...parts].join('|')).digest('hex').slice(0, 40);

// Only a path on this site: no other host, no scheme, nothing odd.
export function cleanUrl(u) {
  const s = String(u || '');
  if (!s.startsWith('/') || s.startsWith('//') || s.startsWith('/\\') || s.length > 400) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(s)) return null;
  if (/^\/api\//.test(s)) return null;
  return s;
}
// The phone, as both sides can see it (Safari and the Home Screen app report the same values).
export function cleanFp(fp) {
  const f = fp && typeof fp === 'object' ? fp : {};
  const part = (v, n = 40) => String(v == null ? '' : v).slice(0, n).replace(/[|]/g, '');
  const out = [part(f.os, 24), part(f.sw, 6), part(f.sh, 6), part(f.dpr, 6), part(f.tz, 48), part(f.lang, 24)].join('|');
  return out.replace(/\|/g, '') ? out : null;
}

export function createHandoff({ store, verify, clock = () => Date.now() }) {
  const keysFor = async (body, where) => {
    const keys = [];
    if (body && body.name && body.code && verify) {
      const who = await verify(String(body.name), String(body.code)).catch(() => null);
      if (who && who.handle) keys.push('h/' + who.handle);
    }
    const fp = cleanFp(body && body.fp);
    if (fp && where.ip) keys.push('d/' + hash('ip', where.ip, fp));
    if (fp && where.place) keys.push('g/' + hash('place', where.place, fp));
    return keys;
  };

  async function drop(body, where = {}) {
    const url = cleanUrl(body && body.url);
    if (!url) throw fail(400, 'That isn’t a Capra Lab link.');
    const keys = await keysFor(body, where);
    if (!keys.length) return { ok: false };
    const at = clock();
    await Promise.all(keys.map((k) => store.set(k, { url, at })));
    return { ok: true, ttl: TTL };
  }

  async function claim(body, where = {}) {
    const keys = await keysFor(body, where);
    const now = clock();
    const found = (await Promise.all(keys.map(async (k) => ({ k, e: await store.get(k) }))))
      .filter((x) => x.e && x.e.data && x.e.data.url && now - x.e.data.at < TTL)
      .sort((a, b) => b.e.data.at - a.e.data.at);
    if (!found.length) return { url: null };
    // the newest drop; it opens once (whoever clears it first gets it), and anything older for this
    // phone goes with it, so the app never offers a second, stale invite right after
    const best = found[0];
    const r = await store.set(best.k, { url: null, at: 0 }, { onlyIfMatch: best.e.etag });
    if (r && r.modified === false) return { url: null };
    await Promise.all(found.slice(1).map((x) => store.set(x.k, { url: null, at: 0 }, { onlyIfMatch: x.e.etag }).catch(() => null)));
    return { url: best.e.data.url, at: best.e.data.at };
  }

  async function route(method, path, body, where) {
    const action = path.replace(/^\/api\/handoff\/?/, '').replace(/\/$/, '');
    if (method !== 'POST') throw fail(405, 'Use POST.');
    if (action === 'drop') return drop(body, where);
    if (action === 'claim') return claim(body, where);
    throw fail(404, 'Not found.');
  }

  async function handleRequest(req, context = {}) {
    const url = new URL(req.url);
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    let body = {};
    try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Bad request.' }), { status: 400, headers }); }
    const geo = context.geo || {};
    const where = {
      ip: context.ip || req.headers.get('x-nf-client-connection-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '',
      place: [geo.country && geo.country.code, geo.subdivision && geo.subdivision.code, geo.city].filter(Boolean).join('/'),
    };
    try {
      return new Response(JSON.stringify(await route(req.method, url.pathname, body, where)), { status: 200, headers });
    } catch (e) {
      const status = e.status || 500;
      return new Response(JSON.stringify({ error: status === 500 ? 'Try again in a moment.' : e.message }), { status, headers });
    }
  }

  return { drop, claim, route, handle: handleRequest };
}
