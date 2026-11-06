/* Primal Survival — local development server.
 *
 * A plain Node http server with no dependencies, so `node server/index.js`
 * just runs. It shares every line of API logic with the deployed Netlify
 * Function: both call route() from ./api.js. The only difference is the store
 * (a JSON file here, Netlify Blobs there) and the request wrapper.
 *
 * Because they share the router, an endpoint that works locally works
 * deployed, and the engine that scores a run is the same module the browser
 * imports.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi, route, seedForNow } from './api.js';
import { fileStore } from './stores.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const PORT = process.env.PORT || 8787;

const api = createApi(fileStore(path.join(HERE, 'data', 'db.json')));

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
               '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png' };

function send(res, code, body) {
  res.writeHead(code, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => {
      raw += c;
      if (raw.length > 1e5) { reject(new Error('body too large')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(e); } });
  });
}

/* Serves the module tree in place, matching how Netlify publishes it:
 * / is client/index.html, and /shared/* resolves next to /client/*. */
function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/client/index.html'
            : pathname === '/app.js' ? '/client/app.js'
            : pathname;
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) return send(res, 403, { error: 'no' });
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, { error: 'not found' });
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

export const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);

  try {
    const body = req.method === 'POST' ? await readBody(req) : null;
    const out = await route(api, req.method, url.pathname, url.searchParams, body);
    if (out && out.status) return send(res, out.status, { error: out.error });
    send(res, 200, out);
  } catch (e) {
    send(res, 400, { error: e.message });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, async () => {
    const s = await api.getSeason();
    console.log('Primal Survival on http://localhost:' + PORT);
    console.log('season ' + s.seed + ' · ladder ' + s.ladderSize + ' · runs ' + s.runs);
  });
}
export { api, seedForNow };
