/* Capra Lab profiles: the guarantees every game relies on. */
import assert from 'node:assert/strict';
import { createProfiles, routeProfiles, handleOf, NAME_MAX } from '../profiles.js';
import { createCrew, routeCrew } from '../crew.js';
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

await test('guessing a key is slowed per name: 8 misses lock it for 10 minutes, then it opens again', async () => {
  let t = Date.parse('2026-11-06T12:00:00Z');
  const p = createProfiles(memoryStore(), { now: () => t });
  const { code } = await p.create({ name: 'Target' });
  await p.create({ name: 'Bystander' });
  const wrong = code === '111111' ? '222222' : '111111';
  for (let i = 0; i < 7; i++) assert.equal((await p.signIn({ name: 'Target', code: wrong })).status, 401);
  /* a right key before the limit clears the count */
  assert.ok((await p.signIn({ name: 'Target', code })).identity);
  for (let i = 0; i < 8; i++) await p.signIn({ name: 'Target', code: wrong });
  const locked = await p.signIn({ name: 'Target', code });
  assert.equal(locked.status, 429);
  assert.equal(await p.verify('Target', code), null, 'games see a locked name as no match');
  assert.equal((await p.rotateKey({ name: 'Target', code })).status, 429);
  /* other names are untouched, and a name that does not exist still looks like a wrong key */
  assert.equal((await p.signIn({ name: 'Nobody', code: wrong })).status, 401);
  t += 10 * 60 * 1000 + 1;
  assert.ok((await p.signIn({ name: 'Target', code })).identity, 'opens again after 10 minutes');
});

await test('handles are stable', () => {
  assert.equal(handleOf('  Billy  Goat! '), 'billy-goat');
});

await test('names go up to 17 characters, so every game shows them whole', async () => {
  assert.equal(NAME_MAX, 17);
  const p = createProfiles(memoryStore());
  const r = await p.create({ name: 'DA_ROMAN_EMPIRE_XYZ' });
  assert.equal(r.identity.name, 'DA_ROMAN_EMPIRE_X');
});

await test("Capra's Lab: the owner has master controls, the crew gets in, everyone else sees nothing", async () => {
  const store = memoryStore();
  const p = createProfiles(store), crew = createCrew(store);
  const jj = await p.create({ name: 'JJ-Capra' }), rome = await p.create({ name: 'DA_ROMAN_EMPIRE' });
  const kid = await p.create({ name: 'Kid Goat' }), rando = await p.create({ name: 'Rando' });
  const ask = (who, extra = {}) => routeCrew(p, crew, { name: who.identity.name, code: who.code, ...extra });
  const me = await ask(jj);
  assert.equal(me.role, 'owner');
  assert.deepEqual(me.crew.map(c => c.name), ['DA_ROMAN_EMPIRE'], 'his son is on the crew from the start');
  assert.equal((await ask(rome)).role, 'crew');
  assert.equal((await ask(rome)).crew, undefined, 'only the owner sees the crew list');
  assert.equal((await ask(rando)).role, null);
  assert.equal((await routeCrew(p, crew, { name: 'JJ-Capra', code: '000000' })).status, 401, 'never without the key');
  assert.equal((await ask(rome, { op: 'crew-add', crewName: 'Rando' })).status, 403, 'the crew cannot change the crew');
  assert.equal((await ask(jj, { op: 'crew-add', crewName: 'Nobody Yet' })).status, 404, 'only names that exist');
  const added = await ask(jj, { op: 'crew-add', crewName: 'kid goat' });
  assert.deepEqual(added.crew.map(c => c.name), ['DA_ROMAN_EMPIRE', 'Kid Goat']);
  assert.equal((await ask(kid)).role, 'crew');
  await ask(jj, { op: 'crew-remove', handle: 'kid-goat' });
  assert.equal((await ask(kid)).role, null);
  assert.equal(await crew.role('jj-capra'), 'owner');
});

console.log('\n' + passed + ' passed');
