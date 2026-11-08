// Punchline: deck loading and checks, the daily drop, the clock, scoring, and a whole party game
// through the API.  node games/punchline/test/punchline.test.mjs
import assert from 'node:assert/strict';
import { createApi, BREW } from '../server/api.js';
import { memoryStore } from '../server/store.js';
import { loadDecks, problems, litText } from '../server/load.mjs';
import { dailyDeck, deal, thanksgiving, pacificDate } from '../server/daily.js';
import { schedule, beatAt, points, findMs, askOf, CARDS_PER_GAME, COUNTDOWN_MS, FIND_MS, REVEAL_MS } from '../shared/rules.mjs';
import { variantOf, fixedLines, flaw, marks } from '../server/variants.mjs';
import { mulberry32, seedOf } from '../server/daily.js';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

// A small library: two family sign decks, one Late Night sign deck, one brew, one joke deck.
const signCard = (d, k, extra = {}) => ({
  id: `${d}/${k}`, type: 'sign', scene: 'storefront', where: 'Main St', kind: 'misprint',
  sign: ['FRESH BREAD', `DAY ${k}`], options: [`Right ${k}`, `Wrong ${k}a`, `Wrong ${k}b`, `Wrong ${k}c`], answer: 0,
  caption: `Card ${k}.`, ...extra,
});
const deck = (id, extra = {}, n = 12) => ({ id, title: id.toUpperCase(), type: 'signs', shelf: 'family', blurb: '', cards: Array.from({ length: n }, (_, k) => signCard(id, k + 1)), ...extra });
const jokeDeck = (id) => ({
  id, title: id, type: 'jokes', shelf: 'family', blurb: '',
  cards: Array.from({ length: 12 }, (_, k) => ({ id: `${id}/${k + 1}`, type: 'joke', setup: `Why did the goat ${k}?`, options: ['a' + k, 'b' + k, 'c' + k, 'd' + k], answer: 2, caption: 'Ba-dum.' })),
});
const teeDeck = (id) => ({ ...deck(id, { type: 'tees' }), cards: deck(id).cards.map((c) => ({ ...c, scene: 'tee', kind: 'back', back: ['THE', 'PUNCHLINE'], art: ['wolf'] })) });
const DECKS = [deck('burnt'), deck('menu'), deck('roasted', { shelf: 'late' }), deck('secret', { brew: true }), jokeDeck('jokes-1'), jokeDeck('jokes-24'), teeDeck('ugly')];

const LAB = { 'jj-capra': { name: 'JJ-Capra', code: '111111' }, ann: { name: 'Ann', code: '222222' } };
const ROLES = { 'jj-capra': 'owner' };
function rig(start = Date.UTC(2026, 10, 9, 20)) {
  let t = start;
  const store = memoryStore();
  const verify = async (name, code) => {
    const p = Object.entries(LAB).find(([, v]) => v.name.toLowerCase() === String(name).toLowerCase() && v.code === code);
    return p ? { name: p[1].name, handle: p[0] } : null;
  };
  const api = createApi({ store, decks: DECKS, verify, role: async (h) => ROLES[h] || null, clock: () => t });
  const call = async (path, body = {}) => {
    const res = await api.handle(new Request('https://capra-lab.netlify.app/punchline/api' + path, { method: 'POST', body: JSON.stringify(body) }));
    return { status: res.status, ...(await res.json()) };
  };
  return { store, call, now: () => t, tick: (ms) => { t += ms; }, to: (ms) => { t = ms; } };
}
const as = (who, extra = {}) => ({ lab: LAB[who], ...extra });

test('the real decks load and pass the structural checks', () => {
  const decks = loadDecks();
  assert.ok(decks.length >= 30, `only ${decks.length} decks`);
  assert.deepEqual(problems(decks), []);
  const jokes = decks.filter((d) => d.type === 'jokes');
  assert.equal(jokes.length, 30);
  for (const d of jokes) for (const c of d.cards) assert.ok(!/^Bonus:/.test(c.caption), c.id);
});

test('the checks catch broken cards', () => {
  const bad = deck('bad');
  bad.cards[0].options[1] = bad.cards[0].options[0];
  bad.cards[1].scene = 'moon';
  bad.cards[2].sign = ['THIS LINE IS FAR TOO LONG TO FIT'];
  bad.cards[3].kind = 'lights';
  Object.assign(bad.cards[4], { kind: 'lights', sign: ['~BOWLING'], options: ['BOWLING', 'OWLING', 'HOWLING', 'OWNING'], answer: 0 });
  const shirts = teeDeck('shirts');
  shirts.cards[0].art = ['skull'];
  shirts.cards[1].back = ['THIS BACK LINE IS WAY TOO LONG'];
  shirts.cards[2].scene = 'storefront';
  const out = problems([bad, deck('bad', {}, 9), shirts]).join('\n');
  for (const want of ['two options are the same', 'unknown scene moon', 'over 20 characters', 'lights card with no dark letter', 'duplicate deck id', '9 cards',
    'should read "OWLING"', 'unknown clip art skull', 'back line over 20', 'need scene "tee"']) assert.match(out, new RegExp(want));
});

test('burnt-out letters read the way the sign looks', () => {
  assert.equal(litText('~BOWLING'), 'OWLING');
  assert.equal(litText('PARK~S AND REC'), 'PARK AND REC');
});

test('the daily drop takes turns (signs, jokes, shirts), never shows Late Night or brews, and keeps the holidays', () => {
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    const day = new Date(Date.UTC(2026, 10, 8 + i)).toISOString().slice(0, 10);
    const { no, deck: d } = dailyDeck(DECKS, day);
    assert.equal(no, i + 1);
    assert.ok(d.shelf === 'family' && !d.brew, day);
    if (day !== thanksgiving(2026)) assert.equal(d.type, ['signs', 'jokes', 'tees'][i % 3], day);
    seen.add(d.id);
  }
  assert.ok(seen.has('burnt') && seen.has('menu') && seen.has('jokes-1') && seen.has('ugly'));
  assert.equal(dailyDeck(DECKS.filter((d) => d.type !== 'tees'), '2026-11-09').deck.type, 'jokes', 'two shelves still alternate');
  assert.equal(thanksgiving(2026), '2026-11-26');
  assert.equal(dailyDeck(DECKS, '2026-11-26').deck.id, 'jokes-24');
  assert.equal(pacificDate(Date.UTC(2026, 10, 9, 7)), '2026-11-08');   // 11pm the night before in California
});

test('dealing is the same for the same seed; the odd one and the right punchline land on every tile', () => {
  const a = deal(DECKS[0], 'x'), b = deal(DECKS[0], 'x'), c = deal(DECKS[0], 'y');
  assert.equal(a.length, CARDS_PER_GAME);
  assert.deepEqual(a.map((d) => [d.card.id, d.order, d.odd]), b.map((d) => [d.card.id, d.order, d.odd]));
  assert.notDeepEqual(a.map((d) => d.card.id), c.map((d) => d.card.id));
  assert.equal(new Set(Array.from({ length: 40 }, (_, k) => deal(DECKS[0], 's' + k)[0].odd)).size, 4);
  assert.equal(new Set(Array.from({ length: 40 }, (_, k) => deal(DECKS[4], 's' + k)[0].order.indexOf(2))).size, 4);
});

test('the four-square: every sign has a right version and an odd one, and the odd letters get circled', () => {
  const rnd = (s) => mulberry32(seedOf(s));
  // burnt out: three lit, one with the bulb out
  const lights = { id: 'x/1', type: 'sign', scene: 'neon', kind: 'lights', sign: ['~BOWLING', 'ALL NIGHT'], options: ['OWLING ALL NIGHT', 'b', 'c', 'd'], answer: 0 };
  let v = variantOf(lights, rnd('a'));
  assert.deepEqual(v.base, ['BOWLING', 'ALL NIGHT']);
  assert.deepEqual(v.off, ['~BOWLING', 'ALL NIGHT']);
  assert.deepEqual(v.marks, [[0], []]);
  assert.equal(v.stamp, 'BULB OUT!');
  assert.match(v.reading, /OWLING ALL NIGHT/);
  // a misprint: three fixed, one with the typo
  const typo = { id: 'x/2', type: 'sign', scene: 'storefront', kind: 'misprint', sign: ['GOAT RENTALS', 'BY THE HOUR'], options: ['BOAT RENTALS BY THE HOUR', 'b', 'c', 'd'], answer: 0 };
  v = variantOf(typo, rnd('b'));
  assert.deepEqual(v.base, ['BOAT RENTALS', 'BY THE HOUR']);
  assert.deepEqual(v.off, typo.sign);
  assert.deepEqual(v.marks, [[0], []]);
  assert.deepEqual(fixedLines(['LET’S EAT', 'GRANDMA!'], 'LET’S EAT, GRANDMA!'), ['LET’S EAT,', 'GRANDMA!']);
  // a design card gets a flaw made for it, the same one for the same seed, never a rude one
  const design = { id: 'x/3', type: 'sign', scene: 'billboard', kind: 'design', sign: ['SHIFT MANAGER', 'WANTED'], options: ['a', 'b', 'c', 'd'], answer: 0 };
  for (let k = 0; k < 60; k++) {
    const w = variantOf(design, rnd('d' + k));
    assert.notDeepEqual(w.off, w.base);
    assert.ok(w.marks.some((m) => m.length), 'something to circle');
    assert.ok(!/SHIT|SH IT/.test(w.off.join(' ').replace(/~./g, '')), 'no flaw spells a swear: ' + w.off);
    assert.deepEqual(variantOf(design, rnd('d' + k)).off, w.off);
  }
  // neon signs mostly lose a bulb; a dropped letter is circled where it went missing
  const neon = Array.from({ length: 40 }, (_, k) => flaw(['OPEN LATE'], 'neon', rnd('n' + k)).type);
  assert.ok(neon.filter((t) => t === 'lights').length > 20);
  assert.deepEqual(marks(['BREAD'], ['BRED']), [[3]], 'the circle goes where the letter went missing');
});

test('the clock: find then reveal, jokes get reading time, points reward speed and the first right tap', () => {
  const cards = DECKS[0].cards.slice(0, 3);
  const times = schedule(cards, 1000);
  assert.equal(times[0].at, 1000);
  assert.equal(times[0].reveal, 1000 + FIND_MS);
  assert.equal(times[0].end, times[0].reveal + REVEAL_MS);
  assert.equal(times[1].at, times[0].end);
  assert.deepEqual(beatAt(times, 999), { i: 0, beat: 'countdown' });
  assert.equal(beatAt(times, times[0].reveal - 1).beat, 'find');
  assert.equal(beatAt(times, times[0].reveal).beat, 'reveal');
  assert.deepEqual(beatAt(times, times[2].end), { i: 2, beat: 'over' });
  const joke = { type: 'joke', setup: 'Why did the goat cross the road?', options: ['a'.repeat(30), 'b'.repeat(30), 'c'.repeat(30), 'd'.repeat(30)] };
  assert.ok(findMs(joke) > 9000 && findMs(joke) <= 16000);
  assert.equal(points(0, FIND_MS, false), 200);
  assert.equal(points(0, FIND_MS, true), 250);
  assert.equal(points(FIND_MS, FIND_MS, false), 100);
  assert.ok(points(3000, FIND_MS, false) < points(2000, FIND_MS, false));
  assert.equal(askOf({ type: 'sign', kind: 'lights' }), 'Which one is different?');
  assert.equal(askOf(joke), 'Which punchline lands?');
});

test('while it is a JJ Brew, only Capra’s Lab sees the drop and hosts', async () => {
  assert.equal(BREW, true);
  const { call } = rig();
  const guest = await call('/today');
  assert.equal(guest.brew, true);
  assert.equal(guest.daily, null);
  assert.deepEqual(guest.decks, []);
  const ann = await call('/today', as('ann'));
  assert.equal(ann.canHost, false);
  assert.equal((await call('/rooms', { name: 'Zed', deckId: 'burnt' })).status, 403);
  assert.equal((await call('/rooms', as('ann', { deckId: 'burnt' }))).status, 403);
  assert.equal((await call('/today', { lab: { name: 'JJ-Capra', code: '999999' } })).status, 401);
  const jj = await call('/today', as('jj-capra'));
  assert.equal(jj.role, 'owner');
  assert.equal(jj.canHost, true);
  assert.equal(jj.daily.cards.length, CARDS_PER_GAME);
  assert.ok(jj.daily.cards.every((c) => c.answer >= 0 && c.caption));
  assert.ok(jj.decks.some((d) => d.id === 'secret' && d.brew), 'the lab sees brew decks');
  assert.ok(jj.decks.some((d) => d.id === 'roasted' && d.shelf === 'late'));
});

test('Late Night decks need the switch', async () => {
  const { call } = rig();
  const no = await call('/rooms', as('jj-capra', { deckId: 'roasted' }));
  assert.equal(no.status, 400);
  assert.match(no.error, /Late Night/);
  const yes = await call('/rooms', as('jj-capra', { deckId: 'roasted', late: true }));
  assert.equal(yes.status, 200);
  assert.equal(yes.room.late, true);
  assert.equal((await call('/rooms', as('jj-capra', { deckId: 'nope' }))).status, 404);
});

test('a whole party game: join, start, answers stay secret until the reveal, scores and a rematch', async () => {
  const { call, tick, to, now } = rig();
  const host = await call('/rooms', as('jj-capra', { deckId: 'burnt' }));
  assert.equal(host.status, 200);
  assert.match(host.code, /^[A-Z]{4}$/);
  assert.equal(host.room.beat, 'lobby');
  assert.equal(host.room.host, true);
  const code = host.code;
  const H = { pid: host.pid, tok: host.tok };

  // anyone with the code can join; names are made unique
  const ann = await call(`/rooms/${code}/join`, as('ann'));
  const zed = await call(`/rooms/${code}/join`, { name: 'Zed' });
  const zed2 = await call(`/rooms/${code}/join`, { name: 'zed' });
  assert.equal(zed2.room.me.name, 'zed 2');
  assert.equal((await call(`/rooms/${code}/join`, { name: '   ' })).status, 400);
  assert.equal((await call('/rooms/QQQQ/join', { name: 'Lost' })).status, 404);
  // a lab player who joins twice gets their seat back
  const ann2 = await call(`/rooms/${code}/join`, as('ann'));
  assert.equal(ann2.pid, ann.pid);
  const A = { pid: ann.pid, tok: ann.tok }, Z = { pid: zed.pid, tok: zed.tok };
  assert.equal((await call(`/rooms/${code}`, A)).room.players.length, 4);

  // only the host starts
  assert.equal((await call(`/rooms/${code}/start`, Z)).status, 403);
  const started = await call(`/rooms/${code}/start`, H);
  assert.equal(started.room.beat, 'countdown');
  assert.equal(started.room.times.length, CARDS_PER_GAME);
  assert.equal(started.room.startAt, now() + COUNTDOWN_MS);
  assert.equal(started.room.cards.length, 0, 'no card before the countdown ends');
  assert.equal((await call(`/rooms/${code}/start`, H)).status, 409);
  const times = started.room.times;

  // just before the card is up: phones already have both versions, but no taps yet
  to(times[0].at - 1000);
  let v = (await call(`/rooms/${code}`, Z)).room;
  assert.equal(v.cards.length, 1);
  assert.equal((await call(`/rooms/${code}/answer`, { ...Z, i: 0, pick: 0 })).status, 409, 'no taps before the card is up');
  to(times[0].at + 10);
  v = (await call(`/rooms/${code}`, Z)).room;
  assert.equal(v.beat, 'find');
  assert.equal(v.cards[0].answer, undefined);
  assert.equal(v.cards[0].caption, undefined);
  assert.equal(v.cards[0].marks, undefined, 'no circles before the reveal');
  assert.notDeepEqual(v.cards[0].base, v.cards[0].off);
  const answer = deal(DECKS[0], code + ':1')[0].odd;
  assert.equal(v.cards[0].odd, answer);

  // the find: taps land, one per player, and nobody sees anyone's pick yet
  to(times[0].at + 500);
  assert.equal((await call(`/rooms/${code}/answer`, { ...A, i: 0, pick: answer })).status, 200);
  tick(1500);
  assert.equal((await call(`/rooms/${code}/answer`, { ...Z, i: 0, pick: (answer + 1) % 4 })).status, 200);
  tick(500);
  const late = await call(`/rooms/${code}/answer`, { ...H, i: 0, pick: answer });
  assert.equal(late.status, 200);
  const again = await call(`/rooms/${code}/answer`, { ...Z, i: 0, pick: answer });
  assert.equal(again.pick, (answer + 1) % 4, 'the first tap counts');
  assert.equal((await call(`/rooms/${code}/answer`, { pid: Z.pid, tok: 'nope', i: 0, pick: 1 })).status, 403);
  v = (await call(`/rooms/${code}`, Z)).room;
  assert.equal(v.cards[0].answer, undefined);
  assert.equal(v.results.length, 0);
  assert.equal(v.players.filter((p) => p.locked).length, 3);
  assert.deepEqual(v.me.picks, { 0: (answer + 1) % 4 });

  // the reveal: the answer, the caption, the scores
  to(times[0].reveal + 10);
  assert.equal((await call(`/rooms/${code}/answer`, { ...zed2, i: 0, pick: answer })).status, 409, 'too late');
  v = (await call(`/rooms/${code}`, A)).room;
  assert.equal(v.beat, 'reveal');
  assert.equal(v.cards[0].answer, answer);
  assert.equal(v.cards[0].caption, 'Card ' + DECKS[0].cards.find((c) => c.id === deal(DECKS[0], code + ':1')[0].card.id).id.split('/')[1] + '.');
  assert.equal(v.results[0].first, 'Ann');
  assert.deepEqual(v.results[0].right.sort(), ['Ann', 'JJ-Capra']);
  assert.equal(v.results[0].mine.gained, points(500, FIND_MS, true));
  assert.ok(v.cards[0].marks.some((m) => m.length) && v.cards[0].stamp, 'the reveal circles the difference and stamps it');
  assert.equal(v.players[0].name, 'Ann');
  assert.equal(v.players[0].score, points(500, FIND_MS, true));
  assert.equal(v.players[1].score, points(2500, FIND_MS, false));
  assert.equal(v.players.find((p) => p.name === 'Zed').score, 0);

  // a guest (code only, no seat) can watch but has no picks
  const watch = (await call(`/rooms/${code}`)).room;
  assert.equal(watch.me, null);
  assert.equal(watch.cards.length, 1);

  // no rematch mid-game; after the last card, the host deals again (Late Night still needs the switch)
  assert.equal((await call(`/rooms/${code}/again`, H)).status, 409);
  to(times[times.length - 1].end + 1);
  v = (await call(`/rooms/${code}`, A)).room;
  assert.equal(v.beat, 'over');
  assert.equal(v.cards.length, CARDS_PER_GAME);
  assert.equal(v.results.length, CARDS_PER_GAME);
  assert.equal((await call(`/rooms/${code}/again`, { ...H, deckId: 'roasted' })).status, 400);
  const re = await call(`/rooms/${code}/again`, { ...H, deckId: 'jokes-1' });
  assert.equal(re.status, 200);
  assert.equal(re.room.beat, 'lobby');
  assert.equal(re.room.game, 2);
  assert.equal(re.room.deck.type, 'jokes');
  assert.ok(re.room.players.every((p) => p.score === 0));
  assert.equal(re.room.players.length, 4);
});

test('rooms fill at 12 and expire', async () => {
  const { call, tick } = rig();
  const host = await call('/rooms', as('jj-capra', { deckId: 'menu' }));
  for (let k = 1; k < 12; k++) assert.equal((await call(`/rooms/${host.code}/join`, { name: 'P' + k })).status, 200);
  assert.equal((await call(`/rooms/${host.code}/join`, { name: 'Late' })).status, 409);
  tick(9 * 3600e3);
  assert.equal((await call(`/rooms/${host.code}`, { pid: host.pid, tok: host.tok })).status, 404);
});

test('the back of a shirt stays secret until the reveal', async () => {
  const { call, to } = rig();
  const host = await call('/rooms', as('jj-capra', { deckId: 'ugly' }));
  const me = { pid: host.pid, tok: host.tok };
  const s = await call(`/rooms/${host.code}/start`, me);
  to(s.room.times[0].at + 1);
  let v = (await call(`/rooms/${host.code}`, me)).room;
  assert.equal(v.cards[0].scene, 'tee');
  assert.deepEqual(v.cards[0].art, ['wolf']);
  assert.equal(v.cards[0].back, undefined);
  assert.equal(v.cards[0].ask, 'Which one is different?');
  to(s.room.times[0].reveal + 1);
  v = (await call(`/rooms/${host.code}`, me)).room;
  assert.deepEqual(v.cards[0].back, ['THE', 'PUNCHLINE']);
});

test('joke cards play the same way', async () => {
  const { call, to } = rig();
  const host = await call('/rooms', as('jj-capra', { deckId: 'jokes-1' }));
  const s = await call(`/rooms/${host.code}/start`, { pid: host.pid, tok: host.tok });
  to(s.room.times[0].at + 1);
  const v = (await call(`/rooms/${host.code}`, { pid: host.pid, tok: host.tok })).room;
  assert.equal(v.cards[0].type, 'joke');
  assert.match(v.cards[0].setup, /goat/);
  assert.equal(v.cards[0].ask, 'Which punchline lands?');
});

let passed = 0;
for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (e) { console.error('FAIL', name); console.error(e); process.exitCode = 1; }
}
console.log(`${passed}/${tests.length} passed`);
