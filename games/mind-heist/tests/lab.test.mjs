// Capra Lab profiles: POST /api/me/lab links a lab name to one Mind Heist profile.
// The lab is faked here; the real check asks capra-lab.netlify.app/api/profile/signin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler } from '../src/server/api.mjs';
import { memoryStore } from '../src/server/store.mjs';
import { createCards } from '../../../lab/cards.js';
import { memoryStore as casMemory } from '../../../lab/casstore.js';

const LAB = { 'jj capra': { code: '123456', handle: 'jj-capra', name: 'JJ Capra' }, 'kit': { code: '654321', handle: 'kit', name: 'Kit' } };

function rig({ cards = null } = {}) {
  const store = memoryStore();
  const asked = [];
  const labCheck = async (name, code) => {
    asked.push(name);
    const p = LAB[String(name).toLowerCase()];
    return p && p.code === code ? { name: p.name, handle: p.handle } : null;
  };
  const h = makeHandler(store, { clock: () => Date.parse('2026-11-06T17:00:00Z'), labCheck, cards });
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
  assert.ok(d.me.name.length <= 17 && d.me.name.length >= 2, d.me.name);
});

test('a 15-letter lab name like DA_ROMAN_EMPIRE comes through whole (names go to 17)', async () => {
  const h = makeHandler(memoryStore(), { labCheck: async () => ({ name: 'DA_ROMAN_EMPIRE', handle: 'da-roman-empire' }) });
  const res = await h(new Request('https://x.test/api/me/lab', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x', code: '111111', create: true }) }));
  assert.equal((await res.json()).me.name, 'DA_ROMAN_EMPIRE');
});

// Capra's Lab (JC, Nov 2026): the owner hides decks from the public; he and his crew still host
// them (trivia nights) and play them solo; the public never sees them anywhere, and a hidden deck
// can't go out as a challenge link.
test("Capra's Lab: hidden decks are for the owner and his crew only", async () => {
  const store = memoryStore();
  const PEOPLE = { 'jj-capra': ['JJ-Capra', '111111'], 'da-roman-empire': ['DA_ROMAN_EMPIRE', '222222'], 'kit': ['Kit', '333333'] };
  const labCheck = async (name, code) => {
    const e = Object.entries(PEOPLE).find(([, [n, c]]) => n.toLowerCase() === String(name).toLowerCase() && c === code);
    return e ? { name: e[1][0], handle: e[0] } : null;
  };
  const labRole = async (handle) => ({ 'jj-capra': 'owner', 'da-roman-empire': 'crew' }[handle] || null);
  const h = makeHandler(store, { clock: () => Date.parse('2026-11-08T05:00:00Z'), labCheck, labRole });
  const call = async (method, path, body, who) => {
    const headers = { 'content-type': 'application/json' };
    if (who) headers.authorization = `Bearer ${who.pid}.${who.token}`;
    const res = await h(new Request('https://x.test/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }));
    return { status: res.status, ...(await res.json()) };
  };
  const lab = (handle) => ({ name: PEOPLE[handle][0], code: PEOPLE[handle][1] });
  const join = async (handle) => { const r = await call('POST', '/me/lab', { ...lab(handle), create: true, avatar: '🦊' }); assert.equal(r.status, 200, r.error); return r; };
  const jj = await join('jj-capra'), rome = await join('da-roman-empire'), kit = await join('kit');
  const pub = await call('GET', '/home', null, kit);
  const deckId = pub.vault.find(d => !d.date && d.kind !== 'jokes').id;   // a classic, open to everyone so far

  assert.equal((await call('POST', '/lab/decks', { lab: lab('kit') })).status, 403, 'the public has no panel');
  assert.equal((await call('POST', '/lab/decks', { lab: { name: 'JJ-Capra', code: '000000' } })).status, 401, 'never without the key');
  assert.equal((await call('POST', '/lab/decks/set', { lab: lab('da-roman-empire'), id: deckId, hidden: true })).status, 403, 'only the owner hides decks');
  const set = await call('POST', '/lab/decks/set', { lab: lab('jj-capra'), id: deckId, hidden: true });
  assert.equal(set.status, 200, set.error);
  assert.equal(set.decks.find(d => d.id === deckId).hidden, true);
  assert.equal((await call('POST', '/lab/decks', { lab: lab('da-roman-empire') })).role, 'crew', 'the crew sees the list');

  const after = await call('GET', '/home', null, kit);
  assert.ok(!after.vault.some(d => d.id === deckId), 'gone from the public vault');
  assert.equal(after.brews, undefined);
  assert.equal(after.lab, undefined);
  const mine = await call('GET', '/home', null, jj);
  assert.equal(mine.lab, 'owner');
  assert.ok(mine.brews.some(d => d.id === deckId), 'the owner still has it');
  assert.equal((await call('GET', '/home', null, rome)).lab, 'crew');

  assert.equal((await call('POST', '/rooms', { kind: 'invite', deckId }, kit)).status, 400, 'the public cannot host it');
  assert.equal((await call('POST', '/rooms', { kind: 'solo', deckId }, kit)).status, 400, 'or play it solo');
  const night = await call('POST', '/rooms', { kind: 'invite', deckId }, jj);
  assert.equal(night.status, 200, night.error);
  assert.equal((await call('POST', '/rooms', { kind: 'solo', deckId }, rome)).status, 200, 'the crew can play it');
  // A finished solo run on a hidden deck can't become a challenge link.
  const run = await call('POST', '/rooms', { kind: 'solo', deckId }, jj);
  const r = (await store.get('r/' + run.code)).data; r.phase = 'final'; r.recorded = true; await store.set('r/' + run.code, r);
  const ch = await call('POST', '/challenges', { code: run.code }, jj);
  assert.equal(ch.status, 400);
  assert.match(ch.error, /challenge/);

  assert.equal((await call('POST', '/lab/decks/set', { lab: lab('jj-capra'), id: deckId, hidden: false })).status, 200);
  assert.ok((await call('GET', '/home', null, kit)).vault.some(d => d.id === deckId), 'shown again');
});

// Goat Getaway (Capra Lab's daily puzzle) pays diamonds into Mind Heist: onto the linked profile,
// or into gg/<handle> until the lab player has one. Linking claims them, once.
test('Goat Getaway diamonds waiting for a lab player arrive when they link, and only once', async () => {
  const R = rig();
  await R.store.set('gg/jj-capra', { gems: 3 });
  const made = await R.call('POST', '/me/lab', { ...jj, create: true, avatar: '🦊' });
  assert.equal(made.status, 200, made.error);
  assert.equal(made.goatGems, 3);
  assert.equal(made.me.gems, 3);
  assert.deepEqual((await R.store.get('gg/jj-capra')).data, { gems: 0 });
  const again = await R.call('POST', '/me/lab', jj);
  assert.equal(again.goatGems, 0);
  assert.equal(again.me.gems, 3, 'claimed once');
  // More landed in gg/ in a race with the link: home picks them up.
  await R.store.set('gg/jj-capra', { gems: 2 });
  const home = await R.call('GET', '/home', null, again);
  assert.equal(home.goatGems, 2);
  assert.equal(home.me.gems, 5);
  assert.equal((await R.call('GET', '/home', null, again)).goatGems, 0);
});

test('the lab’s daily Card Draw: Moles and Hidden 50/50s wait in the lab hand; the old draw points there', async () => {
  const cards = createCards({ store: casMemory() });
  const R = rig({ cards });
  const made = await R.call('POST', '/me/lab', { ...jj, create: true, avatar: '🦊' });
  await cards.give('jj-capra', { id: 'L1', k: 'mh-mole', at: 0 });
  await cards.give('jj-capra', { id: 'L2', k: 'sp-life', at: 0 });     // another game's card stays out of Mind Heist
  const me = await R.call('GET', '/me', null, made);
  assert.deepEqual(me.me.hand.map((c) => c.k), ['mole'], 'the lab’s Mole shows in the hand');
  const draw = await R.call('POST', '/draw', {}, made);
  assert.equal(draw.status, 410);
  assert.match(draw.error, /moved to Capra Lab/);
  // a refused play (no such room) hands the lab card back
  const act = await R.call('POST', '/rooms/ZZZZ/act', { type: 'mole', i: 0 }, made);
  assert.notEqual(act.status, 200);
  assert.equal(await cards.count('jj-capra', 'mh-mole'), 1, 'the Mole went back in the lab hand');
  const none = await R.call('POST', '/rooms/ZZZZ/act', { type: 'hfifty' }, made);
  assert.equal(none.status, 409, 'no Hidden 50/50 anywhere');
});
