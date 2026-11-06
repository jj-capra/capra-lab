/* Capra Lab profiles: the guarantees every game relies on. */
import assert from 'node:assert/strict';
import { createProfiles, routeProfiles, handleOf } from '../profiles.js';
import { memoryStore } from '../stores.js';

let passed = 0;
const test = async (name, fn) => {
  try { await fn(); console.log('  ok   ' + name); passed++; }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
};
const q = (s = '') => new URLSearchParams(s);

console.log('lab profiles');

await test('create returns the key once and never stores it in the clear', async () => {
  const store = memoryStore();
  const r = await createProfiles(store).create({ name: 'JC' });
  assert.match(r.code, /^\d{6}$/);
  assert.equal(r.identity.handle, 'jc');
  const raw = await store.get('profile/jc');
  assert.ok(raw.codeHash && raw.salt);
  assert.ok(!JSON.stringify(raw).includes(r.code));
});

await test('names are unique regardless of case or spacing', async () => {
  const p = createProfiles(memoryStore());
  await p.create({ name: 'Billy Goat' });
  const again = await p.create({ name: 'billy-goat' });
  assert.equal(again.status, 409);
});

await test('sign in needs the right key, and a wrong name looks the same as a wrong key', async () => {
  const p = createProfiles(memoryStore());
  const { code } = await p.create({ name: 'JC' });
  assert.equal((await p.signIn({ name: 'jc', code })).identity.name, 'JC');
  const wrongKey = await p.signIn({ name: 'JC', code: code === '111111' ? '222222' : '111111' });
  const wrongName = await p.signIn({ name: 'Nobody', code });
  assert.equal(wrongKey.status, 401);
  assert.deepEqual(wrongKey, wrongName);
});

await test('a new key retires the old one', async () => {
  const p = createProfiles(memoryStore());
  const { code } = await p.create({ name: 'JC' });
  const fresh = await p.rotateKey({ name: 'JC', code });
  assert.notEqual(fresh.code, code);
  assert.equal((await p.signIn({ name: 'JC', code })).status, 401);
  assert.ok((await p.signIn({ name: 'JC', code: fresh.code })).identity);
});

await test('the routes never return the hash or salt', async () => {
  const p = createProfiles(memoryStore());
  const made = await routeProfiles(p, 'POST', '/api/profile/create', q(), { name: 'Router' });
  const got = await routeProfiles(p, 'GET', '/api/profile', q('name=Router'));
  const signed = await routeProfiles(p, 'POST', '/api/profile/signin', q(), { name: 'Router', code: made.code });
  for (const r of [made, got, signed]) {
    assert.equal(r.name, 'Router');
    assert.ok(!('codeHash' in r) && !('salt' in r));
  }
  assert.equal(got.code, undefined);
});

await test('one profile works in a game: Primal Survival banks a run against it', async () => {
  const { createApi } = await import('../../games/primal-survival/server/api.js');
  const { ROLES } = await import('../../games/primal-survival/shared/constants.js');
  const { ROSTER } = await import('../../games/primal-survival/shared/roster.js');
  const lab = createProfiles(memoryStore());
  const { code } = await lab.create({ name: 'Lab Player' });

  const ps = createApi(memoryStore(), lab);
  const used = new Set(), squad = {};
  for (const r of ROLES) { const a = ROSTER.find(x => x.roles.includes(r) && !used.has(x.id)); used.add(a.id); squad[r] = a.id; }
  const run = await ps.submitRun({ squad, name: 'Lab Player', code });
  assert.ok(run.verified && run.career);
  const seen = await ps.getProfile('lab player');
  assert.equal(seen.stats.runs, 1);
  /* and the game never wrote an identity of its own */
  assert.equal((await ps.signIn({ name: 'Lab Player', code })).name, 'Lab Player');
});

await test('handles are stable', () => {
  assert.equal(handleOf('  Billy  Goat! '), 'billy-goat');
});

console.log('\n' + passed + ' passed');
