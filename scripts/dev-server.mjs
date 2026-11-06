/* Local Capra Lab: serves public/ and both APIs the way Netlify routes them,
 * with in-memory stores. For trying changes before a push.
 *
 *   npm run build && node scripts/dev-server.mjs     -> http://localhost:8790
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProfiles, routeProfiles } from '../lab/profiles.js';
import { memoryStore } from '../lab/stores.js';
import { createApi, route } from '../games/primal-survival/server/api.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT) || 8790;
const profiles = createProfiles(memoryStore());
const primal = createApi(memoryStore(), profiles);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };

function readBody(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve(null); } });
  });
}
function json(res, out) {
  const status = out && out.status ? out.status : 200;
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(out && out.status ? { error: out.error } : out));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const body = req.method === 'POST' ? await readBody(req) : null;
  if (url.pathname.startsWith('/api/profile')) {
    return json(res, await routeProfiles(profiles, req.method, url.pathname, url.searchParams, body));
  }
  if (url.pathname.startsWith('/primal-survival/api/')) {
    return json(res, await route(primal, req.method, url.pathname, url.searchParams, body));
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/primal-survival') { res.writeHead(301, { location: '/primal-survival/' }); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('Capra Lab on http://localhost:' + PORT));
