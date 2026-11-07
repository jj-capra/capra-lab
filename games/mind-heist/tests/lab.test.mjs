// Capra Lab profiles: POST /api/me/lab links a lab name to one Mind Heist profile.
// The lab is faked here; the real check asks capra-lab.netlify.app/api/profile/signin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler } from '../src/server/api.mjs';
import { memoryStore } from '../src/server/store.mjs';

const LAB = { 'jj capra': { code: '123456', handle: 'jj-capra', name: 'JJ Capra' }, 'kit': { code: '654321', handle: 'kit', name: 'Kit' } };

function rig() {
  const store = memoryStore();
  const asked = [];
  const labCheck = async (name, code) => {
    asked.push(name);
    const p = LAB[String(name).toLowerCase()];
    return p && p.code === code ? { name: p.name, handle: p.handle } : null;
  };
  const h = makeHandler(store, { clock: () => Date.parse('2026-11-06T17:00:00Z'), labCheck });
  const call = async (method, path, body, who) => {
    const headers = { 'content-type': 'application/json' };
    if (who) headers.authorization = `Bearer ${who.pid}.${who.token}`;
    const res = await h(new Request('https://x.test/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }));
    return { status: res.status, ...(await res.json()) };
  };
  return { store, call, asked };
}
const jj = { name: 'JJ Capra', code: '123456' };

test('a wrong lab key is refused and changes nothing', async () => {
  const R = rig();
  const r = await R.call('POST', '/me/lab', { name: 'JJ Capra', code: '000000' });
  assert.equal(r.status, 401);
  assert.equal(await R.store.get('l/jj-capra'), null);
});

test('a new lab player chooses, then a new profile is made under the lab name and stays linked', async () => {
  const R = rig();
  const first = await R.call('POST', '/me/lab', jj);
  assert.equal(first.status, 200);
  assert.equal(first.choose, true);
  assert.equal(first.name, 'JJ Capra');
  assert.equal(first.token, undefined);

  const made = await R.call('POST', '/me/lab', { ...jj, create: true, avatar: '🦊' });
  assert.equal(made.status, 200, made.error);
  assert.equal(made.me.name, 'JJ Capra');
  assert.equal(made.me.avatar, '🦊');
  assert.equal(made.me.lab, 'jj-capra');

  // Another device: the lab name and key alone sign in to the same profile.
  const again = await R.call('POST', '/me/lab', jj);
  assert.equal(again.status, 200);
  assert.equal(again.pid, made.pid);
  assert.notEqual(again.token, made.token);
  const me = await R.call('GET', '/me', null, again);
  assert.equal(me.me.name, 'JJ Capra');
  // and asking to create again doesn't make a second one
  const twice = await R.call('POST', '/me/lab', { ...jj, create: true });
  assert.equal(twice.pid, made.pid);
});

test('an old Mind Heist profile comes along with its key, stats intact', async () => {
  const R = rig();
  const old = await R.call('POST', '/me', { name: 'Goat', avatar: '🦝' });
  const p = (await R.store.get('p/' + old.pid)).data;
  p.haul = 4200; p.games = 7;
  await R.store.set('p/' + old.pid, p);

  const r = await R.call('POST', '/me/lab', { ...jj, key: old.me.key.toLowerCase() });
  assert.equal(r.status, 200, r.error);
  assert.equal(r.pid, old.pid);
  assert.equal(r.me.haul, 4200);
  assert.equal(r.me.games, 7);
  assert.equal(r.me.name, 'JJ Capra');
  assert.equal(r.me.lab, 'jj-capra');
  // the old sign-in on the first device keeps working
  assert.equal((await R.call('GET', '/me', null, old)).status, 200);
  // a bad key says so
  assert.equal((await R.call('POST', '/me/lab', { name: 'Kit', code: '654321', key: 'AAAAA-AAAAA' })).status, 404);
});

test('a guest profile made inside the lab links itself when the player signs in to the lab', async () => {
  const R = rig();
  const guest = await R.call('POST', '/me', { name: 'Guest', avatar: '🦉' });
  const r = await R.call('POST', '/me/lab', jj, guest);
  assert.equal(r.status, 200, r.error);
  assert.equal(r.pid, guest.pid);
  assert.equal(r.me.name, 'JJ Capra');
});

test('one Mind Heist profile belongs to one lab player', async () => {
  const R = rig();
  const made = await R.call('POST', '/me/lab', { ...jj, create: true });
  // Kit is signed in on JJ's phone with JJ's Mind Heist sign-in: no silent takeover
  const kit = await R.call('POST', '/me/lab', { name: 'Kit', code: '654321' }, made);
  assert.equal(kit.choose, true);
  // and bringing JJ's key is refused
  const steal = await R.call('POST', '/me/lab', { name: 'Kit', code: '654321', key: made.me.key });
  assert.equal(steal.status, 409);
  assert.equal(await R.store.get('l/kit'), null);
});

test('a linked profile keeps its lab name; the avatar can still change', async () => {
  const R = rig();
  const made = await R.call('POST', '/me/lab', { ...jj, create: true, avatar: '🦊' });
  const u = await R.call('POST', '/me/update', { name: 'Someone Else', avatar: '🐙' }, made);
  assert.equal(u.status, 200);
  assert.equal(u.me.name, 'JJ Capra');
  assert.equal(u.me.avatar, '🐙');
  // unlinked profiles rename as before
  const plain = await R.call('POST', '/me', { name: 'Plain', avatar: '🦉' });
  assert.equal((await R.call('POST', '/me/update', { name: 'Plainer' }, plain)).me.name, 'Plainer');
});

test('Capra Lab not answering is a 503, not a sign-in', async () => {
  const store = memoryStore();
  const h = makeHandler(store, { labCheck: async () => { const e = new Error('down'); throw e; } });
  const res = await h(new Request('https://x.test/api/me/lab', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(jj) }));
  assert.equal(res.status, 500);
  // the real check turns an outage into a 503 with a message
  process.env.CAPRA_LAB_URL = 'http://127.0.0.1:9';
  const h2 = makeHandler(memoryStore());
  const res2 = await h2(new Request('https://x.test/api/me/lab', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(jj) }));
  assert.equal(res2.status, 503);
  assert.match((await res2.json()).error, /Capra Lab/);
  delete process.env.CAPRA_LAB_URL;
});

test('long lab names fit Mind Heist names', async () => {
  const store = memoryStore();
  const h = makeHandler(store, { labCheck: async () => ({ name: 'The Extremely Long Goat Name', handle: 'the-extremely-long-goat' }) });
  const res = await h(new Request('https://x.test/api/me/lab', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x', code: '111111', create: true }) }));
  const d = await res.json();
  assert.equal(res.status, 200, d.error);
  assert.ok(d.me.name.length <= 16 && d.me.name.length >= 2, d.me.name);
});
