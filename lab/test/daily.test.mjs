// The daily challenge boards: node lab/test/daily.test.mjs
import assert from 'node:assert/strict';
import { createDaily } from '../daily.js';
import { createWallet } from '../wallet.js';
import { memoryStore } from '../casstore.js';
import { ranked, WIN_MIN, BOARDS, fmtMs, winWhy } from '../../public/lab/daily-boards.mjs';
import { trophyName } from '../../public/lab/heist-rules.mjs';
import { ROUNDS } from '../../games/three-clue-crew/rounds.js';
import { dailySet, dayNumber as tccDay } from '../../games/three-clue-crew/logic.mjs';
import { puzzle, dailySeed, dayNumber as spinDay, solvePoints } from '../../games/puzzled-spin/logic.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (e) { console.log('FAIL', name); console.error(e); process.exitCode = 1; }
}
function setup() {
  let now = Date.parse('2026-11-14T20:00:00Z');   // noon Pacific
  const players = { 'JJ-Capra': 'jj-capra', Roman: 'roman', Mia: 'mia' };
  const verify = async (name, code) => (players[name] && code === 'k' ? { name, handle: players[name] } : null);
  const wallet = createWallet({ store: memoryStore(), clock: () => now, verify });
  const daily = createDaily({ store: memoryStore(), wallet, verify, clock: () => now });
  const call = (path, body) => daily.route('POST', '/api/daily/' + path, body, new URLSearchParams());
  const get = (path) => daily.route('GET', '/api/daily/' + path.split('?')[0], null, new URLSearchParams(path.split('?')[1] || ''));
  return { daily, wallet, call, get, tick: (ms) => { now += ms; }, now: () => now };
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

await test('midnight: the #1 of a board with two or more takes a trophy and a diamond', async () => {
  const g = setup(), board = 'mind-heist';
  await g.daily.begin(board, me('jj-capra', 'JJ-Capra'));
  await g.daily.post(board, me('jj-capra', 'JJ-Capra'), 2400, 300000);
  await g.daily.begin(board, me('roman', 'Roman'));
  await g.daily.post(board, me('roman', 'Roman'), 3100, 420000);
  // a lone player on another board wins nothing
  await g.daily.post('no-cap:kids', me('mia', 'Mia'), 900, 100000);
  assert.equal(WIN_MIN, 2);
  g.tick(13 * 3600e3);                      // past midnight Pacific
  const v = await g.get('board?b=mind-heist');
  assert.equal(v.of, 0, 'a new day, an empty board');
  assert.equal(v.yesterday.name, 'Roman');
  const w = await g.wallet.wallet('roman');
  assert.equal(w.diamonds, 1);
  const box = await g.wallet.trophyCase('roman');
  assert.equal(box.trophies.length, 1);
  assert.equal(trophyName(box.trophies[0]), 'Mind Heist #1 · Daily drop · Nov 14');
  assert.equal((await g.wallet.wallet('mia')).diamonds, 0, 'one player is not a contest');
  // settling twice pays once
  await g.daily.settle(board, '2026-11-14');
  await g.get('today');
  assert.equal((await g.wallet.wallet('roman')).diamonds, 1);
  // yesterday's day is closed: no late posts
  await g.daily.post(board, me('mia', 'Mia'), 9999, 1, null, '2026-11-14');
  assert.equal((await g.daily.view(board, '2026-11-14')).of, 2);
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

console.log(`\nDaily boards: ${passed} tests passed`);
