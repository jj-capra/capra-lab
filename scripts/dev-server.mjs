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
import { createCrew, routeCrew } from '../lab/crew.js';
import { memoryStore } from '../lab/stores.js';
import { createApi, route } from '../games/primal-survival/server/api.js';
import { makeHandler as mindHeist } from '../games/mind-heist/src/server/api.mjs';
import { memoryStore as mhMemory } from '../games/mind-heist/src/server/store.mjs';
import { createApi as goatApi } from '../games/goat-getaway/server/api.js';
import { memoryStore as goatMemory } from '../games/goat-getaway/server/store.js';
import { createApi as punchApi } from '../games/punchline/server/api.js';
import { memoryStore as punchMemory } from '../games/punchline/server/store.js';
import { loadDecks as punchDecks } from '../games/punchline/server/load.mjs';
import { createApi as classifiedApi } from '../games/classified/server/api.js';
import { memoryStore as classifiedMemory } from '../games/classified/server/store.js';
import { loadContent as classifiedContent } from '../games/classified/server/content.mjs';
import { createApi as noCapApi } from '../games/no-cap/server/api.js';
import { memoryStore as noCapMemory } from '../games/no-cap/server/store.js';
import { loadDecks as noCapDecks } from '../games/no-cap/server/load.mjs';
import { createApi as screensaverApi } from '../games/screensaver/server/api.js';
import { memoryStore as screensaverMemory } from '../games/screensaver/server/store.js';
import { createApi as parTeeApi } from '../games/par-tee-time/server/api.js';
import { memoryStore as parTeeMemory } from '../games/par-tee-time/server/store.js';
import { createCards } from '../lab/cards.js';
import { createWallet } from '../lab/wallet.js';
import { memoryStore as casMemory } from '../lab/casstore.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT) || 8790;
const labStore = memoryStore();
const profiles = createProfiles(labStore);
const crew = createCrew(labStore);   // Capra's Lab: make JJ-Capra / DA_ROMAN_EMPIRE locally to try it
// The lab's daily Card Draw (/api/cards/*); games that check their own cards get it too.
// /api/cards/__clock?add=ms moves its day (local only) so a test can draw again tomorrow
let cardsOffset = 0;
const cards = createCards({ store: casMemory(), clock: () => Date.now() + cardsOffset,
  verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; } });
// The lab wallet (/api/wallet/*): diamonds, amber, shards. Games with a server pay into it directly.
// /api/wallet/__clock?add=ms moves its day (local only)
let walletOffset = 0;
const wallet = createWallet({ store: casMemory(), clock: () => Date.now() + walletOffset,
  verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; } });
const primal = createApi(memoryStore(), profiles);
// Mind Heist checks lab keys against the same profiles, as its function does on Netlify
const mhStore = mhMemory();
let mhOffset = 0; // moved by /mind-heist/__clock, so Mind Heist's browser tests can skip ahead
const mh = mindHeist(mhStore, { clock: () => Date.now() + mhOffset, labCheck: async (name, code) => {
  const p = await profiles.verify(name, code);
  return p ? { name: p.name, handle: p.handle } : null;
}, labRole: (handle) => crew.role(handle), cards, wallet });

// Goat Getaway pays amber and diamonds into the lab wallet; /goat-getaway/__clock?add=ms
// moves its clock (local only) so a test can reach tomorrow's ribbon
let goatOffset = 0;
const goat = goatApi({ store: goatMemory(), wallet, clock: () => Date.now() + goatOffset,
  verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; } });

// Punchline reads its decks straight from games/punchline/decks/ (Netlify uses the built copy)
const punch = punchApi({ store: punchMemory(), decks: punchDecks(), role: (handle) => crew.role(handle),
  verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; } });

// Classified reads its content straight from games/classified/content/; /classified/__clock?add=ms
// moves its clock (local only) so a test can reach the next mission drop
let classifiedOffset = 0;
const classified = classifiedApi({ store: classifiedMemory(), content: classifiedContent(), role: (handle) => crew.role(handle), clock: () => Date.now() + classifiedOffset,
  verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; } });

// No Cap reads its decks straight from games/no-cap/decks/; /no-cap/__clock?add=ms moves its clock
let noCapOffset = 0;
const noCap = noCapApi({ store: noCapMemory(), decks: noCapDecks(path.join(ROOT, '..', 'games', 'no-cap')), role: (handle) => crew.role(handle), clock: () => Date.now() + noCapOffset, cards,
  verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; } });

const screensaver = screensaverApi({ store: screensaverMemory(), role: (handle) => crew.role(handle), cards, wallet,
  verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; } });

// Par-Tee Time's online rooms and Masters Course; /par-tee-time/__clock?add=ms moves its clock
// (local only) so a test can reach a 7-day trophy
let parTeeOffset = 0;
const parTee = parTeeApi({ store: parTeeMemory(), clock: () => Date.now() + parTeeOffset, wallet,
  verify: async (name, code) => { const p = await profiles.verify(name, code); return p ? { name: p.name, handle: p.handle } : null; } });

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

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
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
  if (url.pathname.startsWith('/goat-getaway/api/')) return toFunction(req, res, (r) => goat.handle(r));
  if (url.pathname.startsWith('/punchline/api/')) return toFunction(req, res, (r) => punch.handle(r));
  if (url.pathname.startsWith('/classified/api/')) return toFunction(req, res, (r) => classified.handle(r));
  if (url.pathname.startsWith('/no-cap/api/')) return toFunction(req, res, (r) => noCap.handle(r));
  if (url.pathname.startsWith('/screensaver/api/')) return toFunction(req, res, (r) => screensaver.handle(r));
  if (url.pathname.startsWith('/par-tee-time/api/')) return toFunction(req, res, (r) => parTee.handle(r));
  if (url.pathname === '/api/cards/__clock') {
    cardsOffset += Number(url.searchParams.get('add') || 0);
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ offset: cardsOffset }));
  }
  if (url.pathname === '/api/cards/__give') {        // local only: ?handle=jj-capra&k=sp-life,nc-shield puts cards in a hand
    const handle = url.searchParams.get('handle') || '';
    for (const k of (url.searchParams.get('k') || '').split(',').filter(Boolean)) await cards.give(handle, { id: 'dev' + Math.random().toString(36).slice(2, 10), k, at: Date.now() });
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(await cards.hand(handle)));
  }
  if (url.pathname.startsWith('/api/cards/')) return toFunction(req, res, (r) => cards.handle(r));
  if (url.pathname === '/api/wallet/__clock') {
    walletOffset += Number(url.searchParams.get('add') || 0);
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ offset: walletOffset }));
  }
  if (url.pathname.startsWith('/api/wallet/')) return toFunction(req, res, (r) => wallet.handle(r));
  if (url.pathname === '/par-tee-time/__clock') {
    parTeeOffset += Number(url.searchParams.get('add') || 0);
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ offset: parTeeOffset }));
  }
  if (url.pathname === '/no-cap/__clock') {
    noCapOffset += Number(url.searchParams.get('add') || 0);
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ offset: noCapOffset }));
  }
  if (url.pathname === '/classified/__clock') {
    classifiedOffset += Number(url.searchParams.get('add') || 0);
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ offset: classifiedOffset }));
  }
  if (url.pathname === '/goat-getaway/__clock') {
    goatOffset += Number(url.searchParams.get('add') || 0);
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ offset: goatOffset }));
  }
  const body = req.method === 'POST' ? await readBody(req) : null;
  if (url.pathname.startsWith('/api/profile/capras-lab') && req.method === 'POST') return json(res, await routeCrew(profiles, crew, body));
  if (url.pathname.startsWith('/api/profile')) {
    return json(res, await routeProfiles(profiles, req.method, url.pathname, url.searchParams, body));
  }
  if (url.pathname.startsWith('/primal-survival/api/')) {
    return json(res, await route(primal, req.method, url.pathname, url.searchParams, body));
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/primal-survival' || rel === '/mind-heist' || rel === '/goat-getaway' || rel === '/punchline' || rel === '/classified' || rel === '/no-cap' || rel === '/screensaver') { res.writeHead(301, { location: rel + '/' }); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    // Mind Heist's invite links (/mind-heist/ABCD, /r/, /c/, /tv/, /jam) load its app, as netlify.toml does
    // Punchline's room links (/punchline/ABCD) load its page, as netlify.toml does
    // Classified's room links (/classified/ABCD) and share files (/classified/file/<id>) too
    const app = err && (rel.startsWith('/mind-heist/') ? 'mind-heist' : rel.startsWith('/punchline/') ? 'punchline' : rel.startsWith('/classified/') ? 'classified' : rel.startsWith('/no-cap/') ? 'no-cap' : null);
    if (app) return fs.readFile(path.join(ROOT, app, 'index.html'), (e2, page) => {
      if (e2) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': 'text/html' }); res.end(page);
    });
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('Capra Lab on http://localhost:' + PORT));
