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
import { makeHandler as mindHeist } from '../games/mind-heist/src/server/api.mjs';
import { memoryStore as mhMemory } from '../games/mind-heist/src/server/store.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT) || 8790;
const profiles = createProfiles(memoryStore());
const primal = createApi(memoryStore(), profiles);
// Mind Heist checks lab keys against the same profiles, as its function does on Netlify
const mhStore = mhMemory();
let mhOffset = 0; // moved by /mind-heist/__clock, so Mind Heist's browser tests can skip ahead
const mh = mindHeist(mhStore, { clock: () => Date.now() + mhOffset, labCheck: async (name, code) => {
  const p = await profiles.verify(name, code);
  return p ? { name: p.name, handle: p.handle } : null;
} });

// Mind Heist's handler speaks Request/Response (Netlify Functions v2)
async function toFunction(req, res, handler) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const r = await handler(new Request('http://localhost' + req.url, {
    method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
  }));
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

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

// Mind Heist's test hooks, the same as its own dev server's (local only; the real API has none):
//   __clock?add=ms moves its clock, __give?pid=&cards=&gems= sets a hand, __peek?code= shows the answer
async function mhHook(url, res) {
  const send = (o, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  const q = (k) => url.searchParams.get(k);
  if (url.pathname === '/mind-heist/__clock') { mhOffset += Number(q('add') || 0); return send({ offset: mhOffset }); }
  if (url.pathname === '/mind-heist/__give') {
    const got = await mhStore.get('p/' + q('pid'));
    if (!got) return send({}, 404);
    got.data.hand = (q('cards') || '').split(',').filter(Boolean).map((k, i) => ({ id: 'dev' + i, k }));
    if (url.searchParams.has('gems')) got.data.gems = Number(q('gems'));
    await mhStore.set('p/' + got.data.pid, got.data);
    return send({ hand: got.data.hand });
  }
  if (url.pathname === '/mind-heist/__peek') {
    const got = await mhStore.get('r/' + q('code'));
    const r = got && got.data;
    const t = r && r.cur && r.board[r.cur.c].tiles[r.cur.r];
    const specials = r && r.board ? r.board.flatMap((col, c) => col.tiles.map((x, k) => (x.sp ? [c, k, x.sp] : null)).filter(Boolean)) : [];
    return send({ ans: t ? t.ans : null, hidden: r && r.cur && r.cur.hidden ? r.cur.hidden.rm : null, specials });
  }
  return send({}, 404);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/mind-heist/api/')) return toFunction(req, res, mh);
  if (url.pathname.startsWith('/mind-heist/__')) return mhHook(url, res);
  const body = req.method === 'POST' ? await readBody(req) : null;
  if (url.pathname.startsWith('/api/profile')) {
    return json(res, await routeProfiles(profiles, req.method, url.pathname, url.searchParams, body));
  }
  if (url.pathname.startsWith('/primal-survival/api/')) {
    return json(res, await route(primal, req.method, url.pathname, url.searchParams, body));
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/primal-survival' || rel === '/mind-heist') { res.writeHead(301, { location: rel + '/' }); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    // Mind Heist's invite links (/mind-heist/ABCD, /r/, /c/, /tv/, /jam) load its app, as netlify.toml does
    if (err && rel.startsWith('/mind-heist/')) return fs.readFile(path.join(ROOT, 'mind-heist', 'index.html'), (e2, page) => {
      if (e2) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': 'text/html' }); res.end(page);
    });
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('Capra Lab on http://localhost:' + PORT));
