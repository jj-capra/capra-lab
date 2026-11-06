/* API guarantees, run against the in-memory store.
 *
 * These exercise server/api.js directly — no http, no Netlify — because that
 * module is the whole of the API. If these pass, the local server and the
 * deployed function both behave this way, since both only wrap route().
 */
import assert from 'node:assert/strict';
import { createApi, route, seedForNow } from '../server/api.js';
import { memoryStore } from '../server/stores.js';
import { ROLES } from '../shared/constants.js';
import { ROSTER } from '../shared/roster.js';

let passed = 0;
const test = async (name, fn) => {
  try { await fn(); console.log('  ok   ' + name); passed++; }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
};

const pick = seed => {
  let t = seed;
  const r = () => { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; };
  const used = new Set(), o = {};
  for (const R of ROLES) {
    const c = ROSTER.filter(a => a.roles.includes(R) && !used.has(a.id));
    const p = c[Math.floor(r() * c.length)];
    used.add(p.id); o[R] = p.id;
  }
  return o;
};
const fresh = () => createApi(memoryStore());
const TODAY = seedForNow();
const q = (s = '') => new URLSearchParams(s);

console.log('\napi');

await test('a cold store still opens a season and plays', async () => {
  const api = fresh();
  const s = await api.getSeason(TODAY);
  assert.equal(s.seed, TODAY);
  assert.equal(s.ladderSize, 0);
  const out = await api.submitRun({ name: 'JC', seed: TODAY, squad: pick(42) });
  assert.equal(out.verified, true);
  assert.ok(out.days >= 0 && out.days <= 365);
});

await test('the server ignores anything the client claims about its result', async () => {
  const api = fresh();
  const honest = await api.submitRun({ name: 'a', seed: TODAY, squad: pick(99) });
  const api2 = fresh();
  const liar = await api2.submitRun({
    name: 'b', seed: TODAY, squad: pick(99),
    days: 365, perfect: true, grade: 'S', rank: 'Legend', place: 1,
    feats: { kills: 99999 }
  });
  assert.equal(liar.days, honest.days, 'a claimed result changed the verdict');
  assert.equal(liar.grade, honest.grade);
  assert.notEqual(liar.days, 365);
});

await test('an illegal squad is refused, not scored', async () => {
  const api = fresh();
  const wrong = ROSTER.find(a => !a.roles.includes('swarm'));
  const bad = await api.submitRun({ name: 'x', seed: TODAY, squad: { ...pick(7), swarm: wrong.id } });
  assert.equal(bad.status, 400);
  assert.match(bad.error, /cannot hold/);
  const unknown = await api.submitRun({ name: 'x', seed: TODAY, squad: { ...pick(7), apex: 99999 } });
  assert.equal(unknown.status, 400);
  const board = await api.getLeaderboard(TODAY);
  assert.equal(board.entries.length, 0, 'a refused run reached the board');
});

await test('resubmitting the same squad is a duplicate, not a second entry', async () => {
  const api = fresh();
  const squad = pick(11);
  const a = await api.submitRun({ name: 'JC', seed: TODAY, squad });
  const b = await api.submitRun({ name: 'JC', seed: TODAY, squad });
  assert.equal(b.duplicate, true);
  assert.equal(b.days, a.days);
  const board = await api.getLeaderboard(TODAY);
  assert.equal(board.entries.length, 1);
});

await test('concurrent submissions all survive', async () => {
  const api = fresh();
  /* one key per run, so simultaneous writes cannot clobber each other */
  await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      api.submitRun({ name: 'p' + i, seed: TODAY, squad: pick(i * 977 + 3) })));
  const board = await api.getLeaderboard(TODAY, 100);
  assert.equal(board.entries.length, 12, 'lost a run to a race');
});

await test('the board ranks by days, best first', async () => {
  const api = fresh();
  for (let i = 0; i < 8; i++) await api.submitRun({ name: 'p' + i, seed: TODAY, squad: pick(i * 31 + 5) });
  const board = await api.getLeaderboard(TODAY, 100);
  const days = board.entries.map(e => e.days);
  assert.deepEqual(days, days.slice().sort((a, b) => b - a));
  assert.equal(board.entries[0].place, 1);
});

await test("today's runs become tomorrow's ladder, weakest first", async () => {
  const store = memoryStore();
  const api = createApi(store);
  for (let i = 0; i < 10; i++) await api.submitRun({ name: 'p' + i, seed: TODAY, squad: pick(i * 613 + 9) });
  const d = new Date(TODAY + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const tomorrow = d.toISOString().slice(0, 10);
  const next = await api.getLadder(tomorrow);
  assert.equal(next.ladder.length, 10, 'the ladder did not carry over');
  const full = await api.season(tomorrow);
  const ratings = full.ladder.map(e => e.rating);
  assert.deepEqual(ratings, ratings.slice().sort((a, b) => a - b), 'ladder not sorted weakest first');
});

await test('a quiet day carries the ladder forward instead of emptying it', async () => {
  const store = memoryStore();
  const api = createApi(store);
  for (let i = 0; i < 6; i++) await api.submitRun({ name: 'p' + i, seed: TODAY, squad: pick(i * 71 + 2) });
  const step = n => {
    const d = new Date(TODAY + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  await api.season(step(1));               // inherits today's six
  const quiet = await api.getLadder(step(2)); // nobody played on day 1
  assert.equal(quiet.ladder.length, 6, 'a quiet day wiped the ladder');
});

await test('a season played against a ladder is reproducible', async () => {
  const store = memoryStore();
  const api = createApi(store);
  for (let i = 0; i < 12; i++) await api.submitRun({ name: 'p' + i, seed: TODAY, squad: pick(i * 149 + 4) });
  const d = new Date(TODAY + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const tomorrow = d.toISOString().slice(0, 10);
  const squad = pick(5150);
  const a = await api.submitRun({ name: 'again', seed: tomorrow, squad });
  const b = await api.submitRun({ name: 'again', seed: tomorrow, squad });
  assert.equal(b.days, a.days, 'the same squad scored differently against a frozen ladder');
  assert.equal(b.duplicate, true);
});

console.log('\nprofiles');

await test('creating a profile returns a key exactly once', async () => {
  const api = fresh();
  const p = await api.createProfile({ name: 'JC' });
  assert.equal(p.name, 'JC');
  assert.match(String(p.code), /^\d{6}$/);
  assert.equal(p.stats.runs, 0);
  assert.equal(p.rank.name, 'Drifter');
  /* every later read must not carry the key */
  const seen = await api.getProfile('JC');
  assert.equal(seen.code, undefined, 'a public read leaked the key');
  assert.equal(seen.codeHash, undefined);
  assert.equal(seen.salt, undefined);
});

await test('names are taken once', async () => {
  const api = fresh();
  await api.createProfile({ name: 'JC' });
  const again = await api.createProfile({ name: 'jc' });
  assert.equal(again.status, 409);
});

await test('signing in needs the right key, and says nothing useful when wrong', async () => {
  const api = fresh();
  const p = await api.createProfile({ name: 'JC' });
  const ok = await api.signIn({ name: 'JC', code: p.code });
  assert.equal(ok.name, 'JC');
  const bad = await api.signIn({ name: 'JC', code: '000000' });
  const missing = await api.signIn({ name: 'nobody', code: '123456' });
  assert.equal(bad.status, 401);
  /* identical message, so this cannot be used to find out which names exist */
  assert.equal(bad.error, missing.error);
});

await test('cutting a new key retires the old one', async () => {
  const api = fresh();
  const p = await api.createProfile({ name: 'JC' });
  const rotated = await api.rotateKey({ name: 'JC', code: p.code });
  assert.match(String(rotated.code), /^\d{6}$/);
  assert.notEqual(rotated.code, p.code);
  assert.equal((await api.signIn({ name: 'JC', code: p.code })).status, 401, 'the old key still works');
  assert.equal((await api.signIn({ name: 'JC', code: rotated.code })).name, 'JC');
});

await test('a signed run banks into a career', async () => {
  const api = fresh();
  const p = await api.createProfile({ name: 'JC' });
  const r1 = await api.submitRun({ name: 'JC', code: p.code, seed: TODAY, squad: pick(21) });
  assert.ok(r1.career, 'a signed run came back with no career');
  assert.equal(r1.career.stats.runs, 1);
  assert.equal(r1.career.stats.totalDays, r1.days);
  assert.equal(r1.career.stats.bestDays, r1.days);

  const r2 = await api.submitRun({ name: 'JC', code: p.code, seed: TODAY, squad: pick(22) });
  assert.equal(r2.career.stats.runs, 2);
  assert.equal(r2.career.stats.totalDays, r1.days + r2.days);
});

await test('a duplicate run does not bank twice', async () => {
  const api = fresh();
  const p = await api.createProfile({ name: 'JC' });
  const squad = pick(33);
  const a = await api.submitRun({ name: 'JC', code: p.code, seed: TODAY, squad });
  const b = await api.submitRun({ name: 'JC', code: p.code, seed: TODAY, squad });
  assert.equal(b.duplicate, true);
  const seen = await api.getProfile('JC');
  assert.equal(seen.stats.runs, 1, 'a replay inflated the career');
  assert.equal(seen.stats.totalDays, a.days);
});

await test('a wrong key cannot post a run under someone else name', async () => {
  const api = fresh();
  await api.createProfile({ name: 'JC' });
  const out = await api.submitRun({ name: 'JC', code: '000000', seed: TODAY, squad: pick(44) });
  assert.equal(out.status, 401);
  const seen = await api.getProfile('JC');
  assert.equal(seen.stats.runs, 0);
});

await test('guests can still play and still make the board', async () => {
  const api = fresh();
  const out = await api.submitRun({ name: 'Some Guest', seed: TODAY, squad: pick(55) });
  assert.equal(out.verified, true);
  assert.equal(out.career, null);
  const board = await api.getLeaderboard(TODAY);
  assert.equal(board.entries[0].name, 'Some Guest');
});

await test('the lifetime board ranks careers and leaves guests out', async () => {
  const api = fresh();
  const a = await api.createProfile({ name: 'Alpha' });
  const b = await api.createProfile({ name: 'Bravo' });
  for (let i = 0; i < 3; i++) await api.submitRun({ name: 'Alpha', code: a.code, seed: TODAY, squad: pick(i * 17 + 1) });
  await api.submitRun({ name: 'Bravo', code: b.code, seed: TODAY, squad: pick(900) });
  await api.submitRun({ name: 'Ghost', seed: TODAY, squad: pick(901) });

  const lb = await api.getLifetime(50);
  assert.equal(lb.scope, 'lifetime');
  assert.ok(!lb.entries.some(e => e.name === 'Ghost'), 'a guest reached the lifetime board');
  const days = lb.entries.map(e => e.totalDays);
  assert.deepEqual(days, days.slice().sort((x, y) => y - x));
  assert.equal(lb.entries[0].rank.length > 0, true);
});

await test('rank climbs with days survived', async () => {
  const { rankFor } = await import('../shared/ranks.js');
  assert.equal(rankFor(0).name, 'Drifter');
  assert.equal(rankFor(0).next, 'Forager');
  assert.equal(rankFor(1e9).name, 'Ancient');
  assert.equal(rankFor(1e9).next, null);
  let last = -1;
  for (let d = 0; d < 50000; d += 137) {
    const r = rankFor(d);
    assert.ok(r.index >= last, 'rank went backwards at ' + d);
    last = r.index;
  }
});

console.log('\nresilience');

await test('a failed store build is not cached — the next request retries', async () => {
  const { cacheOnSuccess } = await import('../server/once.js');
  let calls = 0;
  const get = cacheOnSuccess(async () => {
    calls++;
    if (calls < 3) throw new Error('cold start hiccup');
    return { ok: true };
  });
  await assert.rejects(get(), /hiccup/);
  await assert.rejects(get(), /hiccup/);
  const good = await get();
  assert.equal(good.ok, true);
  assert.equal(calls, 3, 'it did not retry after failing');
  /* and once it works it is cached, not rebuilt per request */
  await get(); await get();
  assert.equal(calls, 3, 'a healthy store was rebuilt on every call');
});

await test('a transient store error is retried before anyone sees it', async () => {
  const { withRetry } = await import('../server/stores.js');
  let n = 0;
  const out = await withRetry('get thing', async () => {
    if (++n < 3) throw new Error('ECONNRESET');
    return 'value';
  }, 3, 1);
  assert.equal(out, 'value');
  assert.equal(n, 3);
});

await test('a store that is genuinely down still surfaces, with the operation named', async () => {
  const { withRetry } = await import('../server/stores.js');
  let n = 0;
  await assert.rejects(
    withRetry('list run/', async () => { n++; throw new Error('503'); }, 3, 1),
    /blob list run\/: 503/);
  assert.equal(n, 3, 'it gave up early or retried too often');
});

console.log('\nrouter');

await test('every route resolves through the shared router', async () => {
  const api = fresh();
  assert.ok((await route(api, 'GET', '/api/season', q())).seed);
  assert.ok(Array.isArray((await route(api, 'GET', '/api/ladder', q())).ladder));
  assert.ok(Array.isArray((await route(api, 'GET', '/api/leaderboard', q('limit=5'))).entries));
  const posted = await route(api, 'POST', '/api/runs', q(), { name: 'r', seed: TODAY, squad: pick(3) });
  assert.equal(posted.verified, true);
});

await test('the Netlify splat path resolves the same as the bare path', async () => {
  const api = fresh();
  /* locally the path is /api/season; through the function it can arrive as
     /.netlify/functions/api/season — the router keys off the last segment */
  const direct = await route(api, 'GET', '/api/season', q());
  const splat = await route(api, 'GET', '/.netlify/functions/api/season', q());
  assert.equal(direct.seed, splat.seed);
});

await test('the profile routes resolve', async () => {
  const api = fresh();
  const made = await route(api, 'POST', '/api/profile/create', q(), { name: 'Router' });
  assert.match(String(made.code), /^\d{6}$/);
  const inOk = await route(api, 'POST', '/api/profile/signin', q(), { name: 'Router', code: made.code });
  assert.equal(inOk.name, 'Router');
  const keyed = await route(api, 'POST', '/api/profile/key', q(), { name: 'Router', code: made.code });
  assert.match(String(keyed.code), /^\d{6}$/);
  const got = await route(api, 'GET', '/api/profile', q('name=Router'));
  assert.equal(got.name, 'Router');
  const life = await route(api, 'GET', '/api/leaderboard', q('scope=lifetime'));
  assert.equal(life.scope, 'lifetime');
});

await test('an unknown route is a 404, not a crash', async () => {
  const api = fresh();
  const out = await route(api, 'GET', '/api/nope', q());
  assert.equal(out.status, 404);
});

console.log('\n' + passed + ' passing\n');
