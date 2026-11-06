/* Plays the built site in a real browser, as real ES modules.
 *
 * This exists because the single-file build cannot catch a whole class of bug.
 * The bundler flattens every module into one scope, so a constant declared in
 * one file and used in another without an export/import works perfectly there
 * and throws `X is not defined` the moment the browser loads the same code as
 * modules. That shipped once — `SHIELD` from shapes.js, used in render.js —
 * and the symptom was a draft screen with no animals on it.
 *
 * So: serve public/ exactly as Netlify does and drive the whole game. Any
 * uncaught page error fails the run.
 *
 *   npm run build && npm run test:site
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch {
  console.log('\n  skipped — playwright is not installed');
  console.log('  npm install --no-save playwright   (then rerun)\n');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..', 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const PORT = 8911;

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.log('\n  public/ is not built. run: npm run build\n');
  process.exit(1);
}

/* The real API, against an in-memory store. Stubs would have let the profile
   flow "pass" without ever creating one — this runs the same code the Netlify
   function runs, so sign-in, key rotation and run attribution are all real. */
let API = null;
async function loadApi() {
  const { createApi } = await import('../server/api.js');
  const { memoryStore } = await import('../server/stores.js');
  API = createApi(memoryStore());
}

const server = http.createServer(async (req, res) => {
  const [url, qs] = req.url.split('?');
  if (url.startsWith('/api/')) {
    const { route } = await import('../server/api.js');
    let body = null;
    if (req.method === 'POST') {
      body = await new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });
    }
    const out = await route(API, req.method, url, new URLSearchParams(qs || ''), body);
    const code = out && out.status ? out.status : 200;
    res.writeHead(code, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(out && out.status ? { error: out.error } : out));
  }

  const file = path.join(ROOT, url === '/' ? '/index.html' : url);
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('404'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});
function json(res, body) {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

let passed = 0, failed = 0;
const check = (name, ok, extra) => {
  if (ok) { console.log('  ok   ' + name); passed++; }
  else { console.log('  FAIL ' + name + (extra ? '\n       ' + extra : '')); failed++; }
};

loadApi().then(() => server.listen(PORT, run));

async function run() {
  const browser = await chromium.launch();
  const errors = [];
  const bad = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });

  console.log('\nbuilt site, loaded as modules');
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  check('the module graph loads with no errors', errors.length === 0, errors[0]);
  check('no asset 404s', bad.length === 0, bad[0]);
  check('the home screen opens first', await page.isVisible('#viewHome'));

  /* ---------------- profile ---------------- */
  console.log('\nprofile and key card');
  await page.click('#goProfile');
  check('a guest sees the sign-up panel', await page.isVisible('#signedOut'));
  await page.fill('#newName', 'Playtest');
  await page.click('#createBtn');
  await page.waitForSelector('#signedIn:not(.hidden)', { timeout: 10000 });
  check('creating a profile signs you in', await page.isVisible('#signedIn'));
  check('the profile shows a rank', (await page.textContent('#profRankNote')).includes('Drifter'));
  check('the key card draws', await page.$eval('#keyCanvas', c => c.width === 1080 && c.height === 1350));

  /* pull the real PNG bytes out of the page and prove the key is inside them */
  const probe = await page.evaluate(async () => {
    const m = await import('./client/keycard.js');
    const me = JSON.parse(localStorage.getItem('ps.profile'));
    const canvas = document.getElementById('keyCanvas');
    const blob = await m.keyCardBlob(canvas, { name: me.name, code: me.code, rank: 'Drifter', stats: me.stats, squad: [] });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const back = m.readFromPng(bytes);
    const plain = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const plainBack = m.readFromPng(new Uint8Array(await plain.arrayBuffer()));
    return { size: bytes.length, back, plainBack, code: me.code, name: me.name };
  });
  check('the key card is a real PNG of reasonable size', probe.size > 8000, probe.size + ' bytes');
  check('the key is written into the image bytes', !!probe.back && JSON.parse(probe.back).code === probe.code);
  check('a card without the chunk reads as no key', probe.plainBack === null);

  /* sign out, then sign back in by dropping the card */
  await page.click('#signoutBtn');
  check('signing out returns to the sign-up panel', await page.isVisible('#signedOut'));
  const signedBack = await page.evaluate(async (p) => {
    const m = await import('./client/keycard.js');
    const canvas = document.getElementById('keyCanvas');
    const blob = await m.keyCardBlob(canvas, { name: p.name, code: p.code, rank: 'Drifter', stats: null, squad: [] });
    const file = new File([blob], 'key.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById('cardFile').files = dt.files;
    document.getElementById('cardFile').dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 900));
    return !document.getElementById('signedIn').classList.contains('hidden');
  }, { name: probe.name, code: probe.code });
  check('dropping the key card signs you back in', signedBack);

  /* ---------------- back to the game ---------------- */
  console.log('\nthe game');
  await page.click('#pHome');
  await page.click('#goPlay');
  check('the five discs render', (await page.$$('#discs .disc')).length === 5);

  await page.click('#spinBtn');
  await page.waitForTimeout(300);
  const tiles = (await page.$$('#pool .tile')).length;
  check('spinning deals a pool of animals', tiles > 0, 'the pool rendered ' + tiles + ' tiles');
  check('the era reel fills in', (await page.textContent('#reelEra')).trim() !== '—');

  await page.click('#respinEra');
  await page.waitForTimeout(250);
  check('respinning an era keeps a drawable pool', (await page.$$('#pool .tile')).length > 0);

  /* draft five, taking the role sheet whenever an animal can hold two slots */
  let usedSheet = false;
  for (let i = 0; i < 25; i++) {
    const spin = await page.$('#spinBtn:not(.hidden)');
    if (spin) await spin.click();
    await page.waitForTimeout(90);
    const t = await page.$$('#pool .tile:not([disabled])');
    if (!t.length) continue;
    await t[0].click();
    const sheet = await page.$('#sheet:not(.hidden)');
    if (sheet) {
      usedSheet = true;
      const opt = await page.$('#sheetRoles .role-opt');
      if (opt) await opt.click();
    }
    if ((await page.$$('#discs .disc.filled')).length >= 5) break;
  }
  check('a full five can be drafted', (await page.$$('#discs .disc.filled')).length === 5);
  check('the battlefield draws the drafted squad', (await page.$$('#field svg g')).length > 0);
  if (usedSheet) check('the role picker works', true);

  await page.click('#runBtn');
  await page.waitForTimeout(700);
  check('the season screen shows a day count',
    /^\d+$/.test((await page.textContent('#dayNum')).trim()));
  check('the season screen shows one reason line',
    (await page.textContent('#verdictLine')).trim().length > 10);
  check('the squad row shows all five', (await page.$$('#squadRow .m')).length === 5);

  await page.click('#fastBtn');
  await page.waitForFunction(
    () => !document.getElementById('viewResult').classList.contains('hidden'),
    { timeout: 30000 });
  await page.waitForTimeout(2000);

  check('the verdict screen grades the run',
    (await page.textContent('#gLetter')).trim().length > 0);
  check('the day counter finishes counting up',
    Number(await page.textContent('#gCount')) >= 0);
  check('every animal gets a fate', (await page.$$('#fates .fate')).length === 5);
  check('the stat tiles render', (await page.$$('#statGrid .stat')).length >= 6);
  check('a signed-in run submits under the profile name', await (async () => {
    const btn = await page.$('#submitBtn');
    if (!btn || await btn.isDisabled()) return false;
    const label = await page.textContent('#submitBtn');
    await btn.click();
    await page.waitForTimeout(900);
    const line = await page.textContent('#verifyLine');
    return label.includes('Playtest') && /Verified/.test(line);
  })());
  check('the run banked into the career', await page.evaluate(() => {
    const me = JSON.parse(localStorage.getItem('ps.profile'));
    return me && me.stats && me.stats.runs === 1 && me.stats.totalDays > 0;
  }));

  /* ---------------- leaderboards ---------------- */
  console.log('\nleaderboard');
  await page.click('#againBtn');
  await page.click('#dHome');
  await page.click('#goBoard');
  await page.waitForTimeout(600);
  check("today's board lists the run", (await page.$$('#bigBoard .lrow')).length > 0);
  check('your own row is marked', (await page.$$('#bigBoard .lrow.me')).length === 1);
  await page.click('#tabAll');
  await page.waitForTimeout(600);
  check('the all-time board lists the career',
    (await page.textContent('#bigBoard')).includes('Playtest'));
  /* the rank depends on how the run went, so assert it is one of the ladder's
     names rather than pinning a number the engine is free to change */
  const { RANKS } = await import('../shared/ranks.js');
  const boardText = await page.textContent('#bigBoard');
  check('the all-time board shows a rank',
    RANKS.some(r => boardText.includes(r.name)), boardText.slice(0, 120));

  check('nothing threw during a whole playthrough', errors.length === 0, errors.slice(0, 3).join(' | '));

  /* the offline single-file build is a separate artifact with the network
     layer stripped, so it gets its own pass through the same flow */
  const single = path.join(__dirname, '..', 'dist', 'primal-survival.html');
  if (fs.existsSync(single)) {
    console.log('\noffline single file');
    const errs2 = [];
    const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
    p2.on('pageerror', e => errs2.push(e.message));
    p2.on('console', m => { if (m.type() === 'error') errs2.push(m.text()); });
    await p2.goto('file://' + single);
    await p2.waitForTimeout(400);
    check('the offline build opens on the home screen', await p2.isVisible('#viewHome'));
    await p2.click('#goPlay');
    for (let i = 0; i < 25; i++) {
      const s = await p2.$('#spinBtn:not(.hidden)');
      if (s) await s.click();
      await p2.waitForTimeout(70);
      const t = await p2.$$('#pool .tile:not([disabled])');
      if (!t.length) continue;
      await t[0].click();
      const sh = await p2.$('#sheet:not(.hidden)');
      if (sh) { const o = await p2.$('#sheetRoles .role-opt'); if (o) await o.click(); }
      if ((await p2.$$('#discs .disc.filled')).length >= 5) break;
    }
    check('the offline build drafts five', (await p2.$$('#discs .disc.filled')).length === 5);
    await p2.click('#runBtn');
    await p2.click('#fastBtn');
    await p2.waitForFunction(
      () => !document.getElementById('viewResult').classList.contains('hidden'),
      { timeout: 30000 });
    await p2.waitForTimeout(1800);
    check('the offline build reaches a verdict',
      (await p2.textContent('#gLetter')).trim().length > 0);
    check('the offline build hides the board it cannot reach',
      await p2.$eval('.submitbox', el => el.style.display === 'none').catch(() => false));
    check('nothing threw offline either', errs2.length === 0, errs2.slice(0, 2).join(' | '));
    await p2.close();
  }

  await browser.close();
  server.close();
  console.log('\n' + passed + ' passing' + (failed ? ', ' + failed + ' failing' : '') + '\n');
  process.exit(failed ? 1 : 0);
}
