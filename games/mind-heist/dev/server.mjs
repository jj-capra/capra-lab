// Local server that mirrors Netlify: public/ static files, SPA fallback, /api/* to the function.
//   node dev/server.mjs [port]            in-memory store, source handler, test clock at /__clock
//   node dev/server.mjs [port] --bundle   the built netlify/functions/api.mjs over a local Blobs server
//   add --delay 200 to make every API call take 200 ms longer, like the real server
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const port = Number(process.argv[2]) || 8787;
const bundle = process.argv.includes('--bundle');
const di = process.argv.indexOf('--delay');
const delay = di > 0 ? Number(process.argv[di + 1]) || 0 : 0;
let offset = 0;

let handler;
let devStore = null; // in-memory mode only: lets tests hand out cards at /__give
if (bundle) {
  const { BlobsServer } = await import('@netlify/blobs/server');
  const dir = fs.mkdtempSync(path.join(process.env.SCRATCH || '/tmp', 'mh-blobs-'));
  const bs = new BlobsServer({ directory: dir, token: 'dev', port: 0 });
  const { port: bport } = await bs.start();
  process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ edgeURL: `http://localhost:${bport}`, uncachedEdgeURL: `http://localhost:${bport}`, token: 'dev', siteID: 'dev-site' })).toString('base64');
  const mod = await import(path.join(ROOT, 'netlify/functions/api.mjs')); // node build.mjs builds it here when run on its own
  handler = mod.default;
  const realNow = Date.now;
  Date.now = () => realNow() + offset; // lets /__clock shift the bundled function's clock too
  console.log('using the bundled function over a local Blobs server');
} else {
  const { makeHandler } = await import(path.join(ROOT, 'src/server/api.mjs'));
  const { memoryStore } = await import(path.join(ROOT, 'src/server/store.mjs'));
  devStore = memoryStore();
  handler = makeHandler(devStore, { clock: () => Date.now() + offset });
}

const TYPES = { '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === '/__clock') {
    offset += Number(url.searchParams.get('add') || 0);
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ offset })); return;
  }
  if (url.pathname === '/__give' && devStore) {
    // Test hook: /__give?pid=P&cards=mole,hfifty&gems=2 sets a profile's hand and diamonds.
    const got = await devStore.get('p/' + url.searchParams.get('pid'));
    if (!got) { res.writeHead(404); res.end('{}'); return; }
    const cards = (url.searchParams.get('cards') || '').split(',').filter(Boolean);
    got.data.hand = cards.map((k, i) => ({ id: 'dev' + i, k }));
    if (url.searchParams.has('gems')) got.data.gems = Number(url.searchParams.get('gems'));
    await devStore.set('p/' + got.data.pid, got.data);
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ hand: got.data.hand })); return;
  }
  if (url.pathname === '/__peek' && devStore) {
    // Test hook: the answer to the question on the clock in room ?code=, so a browser test can
    // stage a fooled crew. Dev server only; the real API never sends an answer before the reveal.
    const got = await devStore.get('r/' + url.searchParams.get('code'));
    const r = got && got.data;
    const t = r && r.cur && r.board[r.cur.c].tiles[r.cur.r];
    const specials = r && r.board ? r.board.flatMap((col, c) => col.tiles.map((x, k) => (x.sp ? [c, k, x.sp] : null)).filter(Boolean)) : [];
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ans: t ? t.ans : null, hidden: r && r.cur && r.cur.hidden ? r.cur.hidden.rm : null, specials })); return;
  }
  if (url.pathname.startsWith('/api/')) {
    if (delay) await new Promise(r => setTimeout(r, delay)); // --delay ms: act like a far-away server
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await handler(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  let file = path.join(PUB, decodeURIComponent(url.pathname));
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUB, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Mind Heist on http://localhost:${port}`));
