// Invite hand-off from Safari to the Home Screen app.  node lab/test/handoff.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandoff, cleanUrl, cleanFp, TTL } from '../handoff.js';
import { memoryStore } from '../casstore.js';

const PHONE = { os: '18_6', sw: 440, sh: 956, dpr: 3, tz: 'America/Los_Angeles', lang: 'en-US' };
const HOME = { ip: '73.1.2.3', place: 'US/WA/Spokane' };
const verify = async (name, code) => (code === '111111' ? { name, handle: name.toLowerCase() } : null);
const make = (clock = () => now) => createHandoff({ store: memoryStore(), verify, clock });
let now = 1_000_000;

test('only paths on this site can be handed over', () => {
  assert.equal(cleanUrl('/par-tee-time/#4821'), '/par-tee-time/#4821');
  assert.equal(cleanUrl('/no-cap/c/abc?x=1'), '/no-cap/c/abc?x=1');
  for (const bad of ['https://evil.example/', '//evil.example', '/\\evil', 'javascript:alert(1)', '/a b', '/api/wallet/me', '', null, '/' + 'x'.repeat(500)]) assert.equal(cleanUrl(bad), null, String(bad));
  assert.equal(cleanFp({}), null);
  assert.ok(cleanFp(PHONE));
});

test('Safari drops an invite and the app on the same phone picks it up once', async () => {
  const h = make();
  assert.deepEqual(await h.drop({ url: '/par-tee-time/#4821', fp: PHONE }, HOME), { ok: true, ttl: TTL });
  now += 30_000;
  const got = await h.claim({ fp: PHONE }, HOME);
  assert.equal(got.url, '/par-tee-time/#4821');
  assert.deepEqual(await h.claim({ fp: PHONE }, HOME), { url: null }, 'it opens once');
});

test('iCloud Private Relay: a different address in the same city still matches the phone', async () => {
  const h = make();
  await h.drop({ url: '/mind-heist/ABCD', fp: PHONE }, { ip: '172.226.1.1', place: 'US/WA/Spokane' });
  assert.equal((await h.claim({ fp: PHONE }, HOME)).url, '/mind-heist/ABCD');
});

test('another phone on the same wifi, or the same phone somewhere else, gets nothing', async () => {
  const h = make();
  await h.drop({ url: '/no-cap/K9QZ', fp: PHONE }, HOME);
  assert.equal((await h.claim({ fp: { ...PHONE, sw: 390, sh: 844 } }, HOME)).url, null, 'other phone, same network');
  assert.equal((await h.claim({ fp: PHONE }, { ip: '8.8.8.8', place: 'US/OR/Portland' })).url, null, 'elsewhere');
  assert.equal((await h.claim({ fp: PHONE }, HOME)).url, '/no-cap/K9QZ');
});

test('signed in on both sides it matches by profile, wherever the phone is', async () => {
  const h = make();
  await h.drop({ url: '/punchline/#ROOM', fp: PHONE, name: 'JJ-Capra', code: '111111' }, HOME);
  assert.equal((await h.claim({ fp: { ...PHONE, os: '' }, name: 'JJ-Capra', code: '111111' }, { ip: '1.1.1.1', place: 'US/ID/Boise' })).url, '/punchline/#ROOM');
  // a wrong key is just no profile: it falls back to the phone, which doesn't match here
  await h.drop({ url: '/punchline/#ROOM2', fp: PHONE, name: 'JJ-Capra', code: '111111' }, HOME);
  assert.equal((await h.claim({ fp: { ...PHONE, sw: 1 }, name: 'JJ-Capra', code: '999999' }, { ip: '1.1.1.1', place: 'x' })).url, null);
});

test('an invite waits five minutes, and the newest one wins', async () => {
  const h = make();
  await h.drop({ url: '/screensaver/?old=1', fp: PHONE }, HOME);
  now += TTL + 1;
  assert.equal((await h.claim({ fp: PHONE }, HOME)).url, null, 'too old');
  await h.drop({ url: '/classified/#a', fp: PHONE }, HOME);
  now += 1000;
  await h.drop({ url: '/classified/#b', fp: PHONE }, { ip: '172.226.9.9', place: HOME.place });
  assert.equal((await h.claim({ fp: PHONE }, HOME)).url, '/classified/#b');
  assert.equal((await h.claim({ fp: PHONE }, HOME)).url, null, 'the older one went with it');
});

test('the request handler: POST only, bad links refused', async () => {
  const h = make();
  const req = (path, body, method = 'POST') => new Request('http://x' + path, { method, headers: { 'content-type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body) : undefined });
  let r = await h.handle(req('/api/handoff/drop', { url: 'https://evil.example', fp: PHONE }), { ip: HOME.ip });
  assert.equal(r.status, 400);
  r = await h.handle(req('/api/handoff/drop', { url: '/no-cap/AB12', fp: PHONE }), { ip: HOME.ip, geo: { country: { code: 'US' }, subdivision: { code: 'WA' }, city: 'Spokane' } });
  assert.equal(r.status, 200);
  r = await h.handle(req('/api/handoff/claim', { fp: PHONE }), { ip: '9.9.9.9', geo: { country: { code: 'US' }, subdivision: { code: 'WA' }, city: 'Spokane' } });
  assert.equal((await r.json()).url, '/no-cap/AB12');
  r = await h.handle(req('/api/handoff/nope', {}), { ip: HOME.ip });
  assert.equal(r.status, 404);
});
