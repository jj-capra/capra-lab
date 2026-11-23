// The daily challenge boards: node lab/test/daily.test.mjs
import assert from 'node:assert/strict';
import { createDaily, golfDeal } from '../daily.js';
import { GOLF } from '../heist-library.mjs';
import { createWallet } from '../wallet.js';
import { memoryStore, mutate } from '../casstore.js';
import { ranked, WIN_MIN, BOARDS, fmtMs, winWhy } from '../../public/lab/daily-boards.mjs';
import { trophyName, trophyKind } from '../../public/lab/heist-rules.mjs';
import { ROUNDS } from '../../games/three-clue-crew/rounds.js';
import { dailySet, dayNumber as tccDay } from '../../games/three-clue-crew/logic.mjs';
import { puzzle, dailySeed, dayNumber as spinDay, solvePoints } from '../../games/puzzled-spin/logic.mjs';
import { makeCourse, newRun, step, botInput, feet, H, logInput, daySeed as sledSeed } from '../../games/tough-sleddin/logic.mjs';
import { fmtPoints } from '../../public/lab/daily-boards.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (e) { console.log('FAIL', name); console.error(e); process.exitCode = 1; }
}
function setup(at = '2026-11-14T20:00:00Z') {
  let now = Date.parse(at);   // noon Pacific
  const players = { 'JJ-Capra': 'jj-capra', Roman: 'roman', Mia: 'mia' };
  const hcps = { Mia: 6 };
  const verify = async (name, code) => (players[name] && code === 'k' ? { name, handle: players[name], hcp: hcps[name] || 0 } : null);
  const wallet = createWallet({ store: memoryStore(), clock: () => now, verify });
  const dstore = memoryStore();
  const daily = createDaily({ store: dstore, wallet, verify, clock: () => now });
  const call = (path, body) => daily.route('POST', '/api/daily/' + path, body, new URLSearchParams());
  const get = (path) => daily.route('GET', '/api/daily/' + path.split('?')[0], null, new URLSearchParams(path.split('?')[1] || ''));
  return { daily, wallet, dstore, verify, call, get, tick: (ms) => { now += ms; }, now: () => now };
}
const JJ = { name: 'JJ-Capra', code: 'k' }, RO = { name: 'Roman', code: 'k' }, MIA = { name: 'Mia', code: 'k' };
const me = (h, n) => ({ handle: h, name: n });

await test('the boards: four games, most points then fastest wins', () => {
  assert.ok(BOARDS['three-clue-crew:4'] && BOARDS['puzzled-spin:1'] && BOARDS['mind-heist'] && BOARDS['no-cap:kids']);
  const r = ranked({ a: { points: 9, ms: 90000, at: 3 }, b: { points: 10, ms: 120000, at: 2 }, c: { points: 9, ms: 60000, at: 1 }, d: { points: 9, ms: 60000, at: 0 } });
  assert.deepEqual(r.map((e) => e.handle), ['b', 'd', 'c', 'a']);
  assert.equal(fmtMs(125000), '2:05');
  assert.equal(trophyName({ game: 'three-clue-crew', why: winWhy('three-clue-crew:4', '2026-11-14') }), 'Three Clue Crew #1 · 9–12 · Nov 14');
});

await test('Three Clue Crew: the server checks the ten and times the run from its first start', async () => {
  const g = setup(), board = 'three-clue-crew:4';
  const ids = dailySet(ROUNDS[4].length, 4, tccDay('2026-11-14'));
  await assert.rejects(g.call('finish', { ...JJ, board, answers: [] }), /Start today/);
  const s = await g.call('start', { ...JJ, board });
  assert.equal(s.first, true);
  g.tick(90000);
  const again = await g.call('start', { ...JJ, board });
  assert.equal(again.first, false, 'starting again keeps the first clock');
  const picks = ids.map((id, i) => (i < 8 ? ROUNDS[4][id].answer : 'nope'));
  const r = await g.call('finish', { ...JJ, board, answers: picks });
  assert.equal(r.points, 8); assert.equal(r.ms, 90000);
  assert.equal(r.list[0].name, 'JJ-Capra'); assert.equal(r.me.rank, 1);
  // a second finish doesn't change the first
  const r2 = await g.call('finish', { ...JJ, board, answers: ids.map((id) => ROUNDS[4][id].answer) });
  assert.equal(r2.already, true); assert.equal(r2.list[0].points, 8);
  // a faster 8 beats it, a 9 beats both
  await g.call('start', { ...RO, board }); g.tick(30000);
  await g.call('finish', { ...RO, board, answers: picks });
  await g.call('start', { ...MIA, board }); g.tick(200000);
  const last = await g.call('finish', { ...MIA, board, answers: ids.map((id, i) => (i < 9 ? ROUNDS[4][id].answer : 'x')) });
  assert.deepEqual(last.list.map((e) => e.name), ['Mia', 'Roman', 'JJ-Capra']);
  assert.equal(last.of, 3);
});

await test('Puzzled Spin: pictures must be whole and the clocks must add up', async () => {
  const g = setup(), board = 'puzzled-spin:1', no = spinDay('2026-11-14');
  await g.call('start', { ...JJ, board });
  g.tick(120000);
  const answers = [];
  for (let i = 0; i < 5; i++) {
    const p = puzzle(1, i, dailySeed(1, no, i));
    answers.push({ q: p.start.map((row) => row.map(() => 0)), left: p.time - 10, pts: solvePoints(p.time - 10, i) });
  }
  const total = answers.reduce((a, x) => a + x.pts, 0);
  const r = await g.call('finish', { ...JJ, board, answers });
  assert.equal(r.points, total); assert.equal(r.list[0].points, total);
  // a broken picture is refused
  await g.call('start', { ...RO, board }); g.tick(120000);
  const bad = answers.map((a, i) => (i === 2 ? { ...a, q: puzzle(1, 2, dailySeed(1, no, 2)).start } : a));
  await assert.rejects(g.call('finish', { ...RO, board, answers: bad }), /isn’t whole/);
  // claiming the pictures took less real time than they did on the clock is refused
  await g.call('start', { ...MIA, board }); g.tick(5000);
  const slow = answers.map((a) => ({ ...a, left: 0 }));
  await assert.rejects(g.call('finish', { ...MIA, board, answers: slow }), /don’t add up/);
  // points over the most a picture can pay are capped
  g.tick(400000);
  const greedy = answers.map((a) => ({ ...a, pts: 1e9 }));
  const r3 = await g.call('finish', { ...MIA, board, answers: greedy });
  const most = [0, 1, 2, 3, 4].reduce((a, i) => { const p = puzzle(1, i, dailySeed(1, no, i)); return a + solvePoints(p.time, 4) + 10 * p.n * p.n; }, 0);
  assert.equal(r3.points, most, 'each picture capped at the most it can pay');
});

await test('midnight: the #1 of every board takes a trophy and a diamond, alone or not', async () => {
  const g = setup(), board = 'mind-heist';
  await g.daily.begin(board, me('jj-capra', 'JJ-Capra'));
  await g.daily.post(board, me('jj-capra', 'JJ-Capra'), 2400, 300000);
  await g.daily.begin(board, me('roman', 'Roman'));
  await g.daily.post(board, me('roman', 'Roman'), 3100, 420000);
  // a lone player on another board wins too (JC, Nov 16 2026)
  await g.daily.post('no-cap:kids', me('mia', 'Mia'), 900, 100000);
  assert.equal(WIN_MIN, 1);
  g.tick(13 * 3600e3);                      // past midnight Pacific
  const v = await g.get('board?b=mind-heist');
  assert.equal(v.of, 0, 'a new day, an empty board');
  assert.equal(v.yesterday.name, 'Roman');
  const w = await g.wallet.wallet('roman');
  assert.equal(w.diamonds, 1);
  const box = await g.wallet.trophyCase('roman');
  assert.equal(box.trophies.length, 1);
  assert.equal(trophyName(box.trophies[0]), 'Mind Heist #1 · Daily drop · Nov 14');
  assert.equal((await g.wallet.wallet('mia')).diamonds, 1, 'a lone #1 wins too');
  assert.equal(trophyName((await g.wallet.trophyCase('mia')).trophies[0]), 'No Cap #1 · Kids · Nov 14');
  assert.equal((await g.wallet.wallet('jj-capra')).diamonds, 0, 'only the #1');
  // settling twice pays once
  await g.daily.settle(board, '2026-11-14');
  await g.get('today');
  assert.equal((await g.wallet.wallet('roman')).diamonds, 1);
  // yesterday's day is closed: no late posts
  await g.daily.post(board, me('mia', 'Mia'), 9999, 1, null, '2026-11-14');
  assert.equal((await g.daily.view(board, '2026-11-14')).of, 2);
});

await test('days closed under the two-player rule pay their lone #1, once', async () => {
  const g = setup();
  await g.daily.post('no-cap:adult', me('jj-capra', 'JJ-Capra'), 1669, 189000);
  await g.daily.post('puzzled-spin:1', me('mia', 'Mia'), 3408, 80000);
  g.tick(86400e3);                          // Nov 15
  await g.daily.post('par-tee-time', me('jj-capra', 'JJ-Capra'), -4, 143000);
  // how the old rule left them: closed, nobody paid
  for (const k of ['no-cap:adult/2026-11-14', 'puzzled-spin:1/2026-11-14', 'par-tee-time/2026-11-15']) await mutate(g.dstore, 'd/' + k, (d) => { d.settled = true; d.winner = null; });
  await g.dstore.set('open', { list: [] });
  g.tick(13 * 3600e3);                      // Nov 16 morning
  assert.equal(await g.daily.fixSoloWins(), 3);
  assert.equal((await g.wallet.wallet('jj-capra')).diamonds, 2);
  assert.equal((await g.wallet.wallet('mia')).diamonds, 1);
  const names = (await g.wallet.trophyCase('jj-capra')).trophies.map(trophyName).sort();
  assert.deepEqual(names, ['No Cap #1 · Young Adults · Nov 14', 'Par-Tee Time #1 · Daily 3 · Nov 15']);
  assert.equal((await g.get('board?b=par-tee-time')).yesterday.name, 'JJ-Capra');
  // once: again, on this server or a fresh one, pays nothing
  assert.equal(await g.daily.fixSoloWins(), 0);
  const again = createDaily({ store: g.dstore, wallet: g.wallet, verify: g.verify, clock: g.now });
  assert.equal(await again.fixSoloWins(), 0);
  await again.route('GET', '/api/daily/today', null, new URLSearchParams());
  assert.equal((await g.wallet.wallet('jj-capra')).diamonds, 2);
  assert.equal((await g.wallet.wallet('mia')).diamonds, 1);
});

await test('the routes want a sign-in; today lists every board with a leader', async () => {
  const g = setup();
  await assert.rejects(g.call('start', { board: 'mind-heist' }), /Sign in/);
  await assert.rejects(g.call('start', { ...JJ, board: 'nope' }), /isn’t a daily board/);
  await assert.rejects(g.call('finish', { ...JJ, board: 'mind-heist', answers: [] }), /posts its own/);
  await g.daily.post('no-cap:high', me('roman', 'Roman'), 1200, 200000);
  const t = await g.get('today');
  assert.deepEqual(t.boards.map((b) => b.board), ['no-cap:high']);
});

await test('Par-Tee Time’s Daily 3: three holes a day, hole by hole, fewest net strokes wins', async () => {
  const g = setup(), board = 'par-tee-time';
  const deal = golfDeal('2026-11-14');
  assert.equal(deal.holes.length, 3); assert.equal(deal.no, 1);
  const info = deal.holes.map((h) => GOLF.find((x) => x.id === h.id));
  assert.ok(info[0].ci <= 2 && info[1].ci >= 3 && info[1].ci <= 5 && info[2].ci >= 6, 'easy, middle, hard');
  assert.equal(new Set(info.map((h) => h.theme)).size, 3, 'three themes');
  assert.deepEqual(golfDeal('2026-11-14'), deal);
  assert.equal((await g.get('board?b=par-tee-time')).deal.holes[0].id, deal.holes[0].id, 'guests get the holes too');
  await assert.rejects(g.call('golf', { ...JJ, board, scores: [], open: 0 }), /Start today/);
  await assert.rejects(g.call('finish', { ...JJ, board, answers: [] }), /hole by hole/);
  // JJ: par, par, one over (gross par + 1, scratch)
  const s = await g.call('start', { ...JJ, board });
  assert.deepEqual(s.golf.scores, []); assert.equal(s.golf.holes.length, 3);
  await g.call('golf', { ...JJ, board, scores: [], open: 0 });
  g.tick(60000);
  const p = deal.holes.map((h) => h.par);
  let r = await g.call('golf', { ...JJ, board, scores: [p[0]], open: 1 });
  assert.deepEqual(r.golf.scores, [p[0]]); assert.equal(r.golf.opened, 1);
  // a kept hole can't be changed
  r = await g.call('golf', { ...JJ, board, scores: [1, p[1]], open: 2 });
  assert.deepEqual(r.golf.scores, [p[0], p[1]]);
  g.tick(60000);
  r = await g.call('golf', { ...JJ, board, scores: [p[0], p[1], p[2] + 1] });
  assert.equal(r.golf.done, true);
  assert.equal(r.view.list[0].points, 1, 'one over par'); assert.equal(r.view.list[0].ms, 120000);
  // Roman leaves hole 2 part way and comes back: it goes down as double par
  await g.call('start', { ...RO, board });
  await g.call('golf', { ...RO, board, scores: [], open: 0 });
  await g.call('golf', { ...RO, board, scores: [p[0] - 1], open: 1 });
  r = await g.call('start', { ...RO, board });
  assert.deepEqual(r.golf.scores, [p[0] - 1]); assert.equal(r.golf.opened, 1);
  r = await g.call('golf', { ...RO, board, scores: [p[0] - 1], open: 1 });
  assert.equal(r.golf.left, 1); assert.deepEqual(r.golf.scores, [p[0] - 1, p[1] * 2]); assert.equal(r.golf.opened, null);
  // the page then opens the next hole: that's a fresh open, not a second penalty
  r = await g.call('golf', { ...RO, board, scores: r.golf.scores, open: 2 });
  assert.equal(r.golf.left, null); assert.equal(r.golf.scores.length, 2); assert.equal(r.golf.opened, 2);
  r = await g.call('golf', { ...RO, board, scores: [...r.golf.scores, p[2]] });
  assert.equal(r.view.list.find((e) => e.name === 'Roman').points, p[1] - 1);
  // Mia's handicap 6 takes 1 off three holes: two over on the card is one over net; faster than JJ, so she leads
  await g.call('start', { ...MIA, board });
  g.tick(30000);
  r = await g.call('golf', { ...MIA, board, scores: [p[0] + 1, p[1], p[2] + 1] });
  assert.deepEqual(r.view.list.map((e) => e.name).slice(0, 2), ['Mia', 'JJ-Capra'], 'fewest net strokes, then the faster round');
  assert.equal(r.view.list[0].points, 1);
  // a second round today changes nothing
  r = await g.call('golf', { ...MIA, board, scores: [1, 1, 1] });
  assert.equal(r.golf.done, true); assert.equal(r.view.list[0].points, 1);
  // midnight: the #1 takes the Daily 3 trophy
  g.tick(13 * 3600e3);
  await g.get('today');
  const box = await g.wallet.trophyCase('mia');
  assert.equal(trophyKind(box.trophies[0]), 'golf');
  assert.equal(trophyName(box.trophies[0]), 'Par-Tee Time #1 · Daily 3 · Nov 14');
  assert.equal((await g.wallet.wallet('mia')).diamonds, 1);
});

// A sled run the way the page rides it: the menu goat's steering for a while, then hands off until the crash.
function sledRide(date, world, secs) {
  const C = makeCourse(sledSeed(date), world), st = newRun(C), log = [];
  while (!st.crashed && st.t < 600) { const v = st.t < secs ? botInput(st, C) : 0; step(st, v, H, C); logInput(log, v); }
  return { log, ft: feet(st), t: st.t, hit: st.crashed && st.crashed.kind };
}
await test('Tough Sleddin’s Today’s run: world by world, ridden again on the server, the longest total wins', async () => {
  const g = setup('2026-11-22T20:00:00Z'), board = 'tough-sleddin', day = '2026-11-22';
  assert.equal(fmtPoints(board, 12345), '12,345 ft');
  assert.equal((await g.get('board?b=tough-sleddin')).no, 1, 'Today’s run No. 1 is Nov 22');
  await assert.rejects(g.call('sled', { ...JJ, board, open: 0 }), /Start today/);
  await assert.rejects(g.call('finish', { ...JJ, board, answers: [] }), /posts its own/);
  const w = [sledRide(day, 0, 20), sledRide(day, 1, 14), sledRide(day, 2, 9)];
  assert.ok(w.every((x) => x.hit && x.ft > 1000), 'three crashes, each a way down');
  // JJ sleds all three
  let s = await g.call('start', { ...JJ, board });
  assert.equal(s.sled.no, 1); assert.deepEqual(s.sled.worlds, []); assert.equal(s.sled.done, false);
  let r = await g.call('sled', { ...JJ, board, open: 0 });
  assert.equal(r.sled.opened, 0);
  // a world sledded faster than the clock has run since the start doesn't count
  await assert.rejects(g.call('sled', { ...JJ, board, world: 0, inputs: w[0].log }), /don’t add up/);
  g.tick(Math.ceil(w[0].t + 10) * 1000);
  r = await g.call('sled', { ...JJ, board, world: 0, inputs: w[0].log, open: 1 });
  assert.deepEqual(r.sled.worlds, [{ ft: w[0].ft, hit: w[0].hit }], 'the server rides it again: the same feet');
  assert.equal(r.sled.opened, 1);
  // the same world posted again (a retry) changes nothing; arrows that aren't arrows are turned away
  r = await g.call('sled', { ...JJ, board, world: 0, inputs: [0, 50] });
  assert.equal(r.sled.worlds.length, 1); assert.equal(r.sled.worlds[0].ft, w[0].ft);
  await assert.rejects(g.call('sled', { ...JJ, board, world: 1, inputs: [2, 5] }), /whole/);
  await assert.rejects(g.call('sled', { ...JJ, board, world: 1, inputs: [1, 5, 0] }), /whole/);
  g.tick(Math.ceil(w[1].t + w[2].t + 20) * 1000);
  r = await g.call('sled', { ...JJ, board, world: 1, inputs: w[1].log, open: 2 });
  r = await g.call('sled', { ...JJ, board, world: 2, inputs: w[2].log });
  const total = w[0].ft + w[1].ft + w[2].ft;
  assert.equal(r.sled.done, true);
  assert.equal(r.view.list[0].points, total); assert.equal(r.view.list[0].ms, Math.round((w[0].t + w[1].t + w[2].t) * 1000));
  // a second run today changes nothing
  s = await g.call('start', { ...JJ, board });
  assert.equal(s.first, false); assert.equal(s.sled.done, true);
  // Roman leaves Lantern Village part way and comes back: it goes down as 0 ft, then he sleds the glacier
  await g.call('start', { ...RO, board });
  await g.call('sled', { ...RO, board, open: 0 });
  g.tick(Math.ceil(w[0].t + 5) * 1000);
  await g.call('sled', { ...RO, board, world: 0, inputs: w[0].log, open: 1 });
  s = await g.call('start', { ...RO, board });
  assert.equal(s.sled.worlds.length, 1); assert.equal(s.sled.opened, 1);
  r = await g.call('sled', { ...RO, board, open: 1 });
  assert.equal(r.sled.left, 1); assert.deepEqual(r.sled.worlds[1], { ft: 0, hit: 'left' }); assert.equal(r.sled.opened, null);
  r = await g.call('sled', { ...RO, board, open: 2 });
  assert.equal(r.sled.left, null); assert.equal(r.sled.opened, 2, 'the next one opens fresh');
  g.tick(Math.ceil(w[2].t + 5) * 1000);
  r = await g.call('sled', { ...RO, board, world: 2, inputs: w[2].log });
  assert.deepEqual(r.view.list.map((e) => e.name), ['JJ-Capra', 'Roman']);
  assert.equal(r.view.list[1].points, w[0].ft + w[2].ft);
  // midnight: the longest run takes the trophy (a gold saucer) and a diamond
  g.tick(13 * 3600e3);
  await g.get('today');
  const box = await g.wallet.trophyCase('jj-capra');
  assert.equal(trophyKind(box.trophies[0]), 'sled');
  assert.equal(trophyName(box.trophies[0]), 'Tough Sleddin #1 · Today’s run · Nov 22');
  assert.equal((await g.wallet.wallet('jj-capra')).diamonds, 1);
});

console.log(`\nDaily boards: ${passed} tests passed`);
