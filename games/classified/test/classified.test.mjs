// Classified: avatars, the word filter, the content checks, and a whole night through the API:
// the briefing, missions dropping and swapping, counter-intel, Who Said It, the Yearbook, the
// Declassified reveal and the share page.  node games/classified/test/classified.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createApi, BREW } from '../server/api.js';
import { memoryStore } from '../server/store.js';
import { loadContent, problems } from '../server/content.mjs';
import { redact } from '../server/filter.mjs';
import { avatar, cleanAvatar, randomAvatar, PARTS } from '../shared/avatar.mjs';
import { MISSION_EVERY, PROMPT_EVERY, GUESS_MS, SHOW_MS, START_MISSIONS, MAX_ACCUSE, POINTS, PROMPTS, AWARDS } from '../shared/rules.mjs';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const pad = (n) => String(n).padStart(3, '0');
const CONTENT = {
  missions: Array.from({ length: 40 }, (_, i) => (i % 2
    ? { id: 'm' + pad(i + 1), text: `Get {target} to say word number ${i + 1}.`, target: true }
    : { id: 'm' + pad(i + 1), text: `Quietly do thing number ${i + 1}.`, target: false })),
  prompts: Array.from({ length: 14 }, (_, i) => ({ id: 'p' + pad(i + 1), text: `Question number ${i + 1}?` })),
  awards: Array.from({ length: 14 }, (_, i) => ({ id: 'y' + pad(i + 1), text: `Most likely to do thing ${i + 1}` })),
};

const LAB = { 'jj-capra': { name: 'JJ-Capra', code: '111111' }, ann: { name: 'Ann', code: '222222' } };
const ROLES = { 'jj-capra': 'owner' };
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function rig(start = Date.UTC(2026, 10, 14, 4)) {
  let t = start;
  const store = memoryStore();
  const verify = async (name, code) => {
    const p = Object.entries(LAB).find(([, v]) => v.name.toLowerCase() === String(name).toLowerCase() && v.code === code);
    return p ? { name: p[1].name, handle: p[0] } : null;
  };
  const api = createApi({ store, content: CONTENT, verify, role: async (h) => ROLES[h] || null, clock: () => t, rand: seeded(7) });
  const call = async (path, body = {}) => {
    const res = await api.handle(new Request('https://capra-lab.netlify.app/classified/api' + path, { method: 'POST', body: JSON.stringify(body) }));
    return { status: res.status, ...(await res.json()) };
  };
  const raw = async (code) => (await store.get('r/' + code)).data;
  return { store, call, raw, tick: (ms) => { t += ms; }, now: () => t };
}
const as = (who, extra = {}) => ({ lab: LAB[who], ...extra });
const seatOf = (r) => ({ pid: r.pid, tok: r.tok });

test('avatars: any spec draws, bad parts fall back, random ones are valid', () => {
  assert.deepEqual(cleanAvatar({ skin: 99, hair: -1, gear: 'x' }), { skin: 0, hair: 0, hairColor: 0, eyes: 0, mouth: 0, gear: 0, bg: 0 });
  for (let i = 0; i < 50; i++) {
    const a = randomAvatar(seeded(i));
    for (const [k, n] of Object.entries(PARTS)) assert.ok(a[k] >= 0 && a[k] < n, k);
    const svg = avatar(a, 64, 'Agent "X"');
    assert.match(svg, /^<svg[^>]*viewBox="0 0 120 120"/);
    assert.ok(!svg.includes('undefined'), 'every part draws');
  }
});

test('the word filter redacts the strong stuff and leaves ordinary words alone', () => {
  assert.equal(redact('what the fuck'), 'what the ▇▇▇');
  for (const ok of ['spicy noodles at night', 'a cockroach', 'prickly pear', 'Dickens', 'my sextet', 'Scunthorpe? no: Essex']) assert.equal(redact(ok), ok);
});

test('the real content, once written, passes the checks', () => {
  if (!['missions', 'prompts', 'yearbook'].every((f) => fs.existsSync(new URL(`../content/${f}.json`, import.meta.url)))) { console.log('     (content not written yet)'); return; }
  const c = loadContent();
  assert.deepEqual(problems(c), []);
  assert.ok(c.missions.length >= 60 && c.prompts.length >= 40 && c.awards.length >= 30, 'enough of each');
});

test('the checks catch broken content', () => {
  const bad = structuredClone(CONTENT);
  bad.missions[0].target = true;          // says target but has no {target}
  bad.missions[1].target = false;         // has {target} but says no
  bad.prompts[2].id = 'p001';
  bad.awards[3].text = 'x'.repeat(61);
  const out = problems(bad).join('\n');
  for (const want of ['m001: target missions use', 'm002: uses {target}', 'duplicate id p001', 'y004: over 60']) assert.match(out, new RegExp(want.replace(/[{}]/g, '\\$&')));
});

test('while it is a JJ Brew, only Capra’s Lab opens files; anyone with the code joins', async () => {
  assert.equal(BREW, true);
  const { call } = rig();
  assert.equal((await call('/hello')).canHost, false);
  assert.equal((await call('/hello', as('ann'))).canHost, false);
  assert.equal((await call('/hello', as('jj-capra'))).role, 'owner');
  assert.equal((await call('/rooms', { name: 'Zed' })).status, 403);
  assert.equal((await call('/rooms', as('ann'))).status, 403);
  assert.equal((await call('/rooms', { lab: { name: 'JJ-Capra', code: '000000' } })).status, 401);
  const host = await call('/rooms', as('jj-capra'));
  assert.equal(host.status, 200);
  assert.match(host.code, /^[A-Z]{4}$/);
  assert.match(host.room.op, /^[A-Z' ]+$/);
  assert.equal(host.room.phase, 'lobby');
  const zed = await call(`/rooms/${host.code}/join`, { name: 'Zed', avatar: { skin: 2, hair: 3 } });
  assert.equal(zed.status, 200);
  assert.equal(zed.room.me.avatar.skin, 2);
  assert.ok(zed.room.me.codename.length > 3);
});

async function night() {
  const R = rig();
  const { call } = R;
  const host = await call('/rooms', as('jj-capra'));
  const code = host.code;
  const H = seatOf(host);
  const ann = await call(`/rooms/${code}/join`, as('ann'));
  const zed = await call(`/rooms/${code}/join`, { name: 'Zed' });
  return { ...R, code, H, A: seatOf(ann), Z: seatOf(zed), ids: { H: host.pid, A: ann.pid, Z: zed.pid } };
}

test('the briefing: agents change their look and codename, the host rerolls the operation, 3 agents to start', async () => {
  const { call, code, H, A, Z, raw } = await night();
  const before = (await call(`/rooms/${code}`, A)).room.me.codename;
  const me = await call(`/rooms/${code}/me`, { ...A, avatar: { skin: 5, hair: 6, gear: 2 }, reroll: true });
  assert.equal(me.room.me.avatar.gear, 2);
  assert.notEqual(me.room.me.codename, before);
  assert.equal((await call(`/rooms/${code}/op`, A)).status, 403);
  const op1 = (await raw(code)).op;
  await call(`/rooms/${code}/op`, H);
  assert.equal(typeof (await raw(code)).op, 'string');
  assert.equal((await call(`/rooms/${code}/start`, Z)).status, 403);
  await call(`/rooms/${code}/remove`, { ...H, agent: Z.pid });
  assert.equal((await call(`/rooms/${code}/start`, H)).status, 409, 'two agents is too few');
  assert.equal((await call(`/rooms/${code}`, Z)).room.me, undefined, 'a removed agent loses their seat');
  void op1;
});

test('a whole night and its reveal', async () => {
  const { call, code, H, A, Z, ids, tick, raw, store } = await night();
  const kid = await call(`/rooms/${code}/join`, { name: 'Kid' });
  const K = seatOf(kid);
  const start = await call(`/rooms/${code}/start`, H);
  assert.equal(start.room.phase, 'night');
  assert.equal(start.room.missions.length, START_MISSIONS);
  assert.equal(start.room.prompts.length, 2);
  assert.equal(start.room.awards.length, AWARDS);
  assert.equal((await call(`/rooms/${code}/me`, { ...A, reroll: true })).status, 409, 'looks are locked once the night starts');

  // missions: targets are other agents, by name; a new one every 45 minutes; swaps run out
  let v = (await call(`/rooms/${code}`, A)).room;
  for (const m of v.missions) assert.ok(!m.text.includes('{target}') && !/Ann/.test(m.text), 'targets are someone else, by name');
  tick(MISSION_EVERY + 1000);
  v = (await call(`/rooms/${code}`, A)).room;
  assert.equal(v.missions.length, START_MISSIONS + 1);
  const firstText = v.missions[0].text;
  v = (await call(`/rooms/${code}/mission`, { ...A, slot: 0, act: 'swap' })).room;
  assert.notEqual(v.missions[0].text, firstText);
  await call(`/rooms/${code}/mission`, { ...A, slot: 1, act: 'swap' });
  assert.equal((await call(`/rooms/${code}/mission`, { ...A, slot: 2, act: 'swap' })).status, 409, 'two swaps a night');
  v = (await call(`/rooms/${code}/mission`, { ...A, slot: 0, act: 'done' })).room;
  assert.equal(v.missions[0].status, 'done');
  assert.equal((await call(`/rooms/${code}/mission`, { ...A, slot: 0, act: 'done' })).status, 409);
  assert.match(v.news[0].text, /completed a mission/);

  // counter-intel: Zed accuses Ann; the four choices include her real active mission
  let acc = await call(`/rooms/${code}/accuse`, { ...Z, agent: ids.A });
  assert.equal(acc.room.accusing.choices.length, 4);
  let room = await raw(code);
  const realIdx = room.pending[ids.Z].real;
  const burned = await call(`/rooms/${code}/accuse`, { ...Z, agent: ids.A, pick: realIdx });
  assert.equal(burned.burned, true);
  assert.ok(burned.mission);
  v = (await call(`/rooms/${code}`, A)).room;
  assert.ok(v.missions.some((m) => m.status === 'burned' && m.by), 'Ann sees which mission was burned, and by whom');
  // a miss costs the accuser and pays the accused
  acc = await call(`/rooms/${code}/accuse`, { ...K, agent: ids.Z });
  room = await raw(code);
  const miss = await call(`/rooms/${code}/accuse`, { ...K, agent: ids.Z, pick: (room.pending[ids.K = kid.pid].real + 1) % 4 });
  assert.equal(miss.burned, false);
  assert.equal(miss.mission, null, 'a miss doesn’t say which one was real');
  for (let i = 1; i < MAX_ACCUSE; i++) {
    const a1 = await call(`/rooms/${code}/accuse`, { ...K, agent: ids.Z });
    const a2 = await call(`/rooms/${code}/accuse`, { ...K, agent: ids.Z, pick: 0 });
    assert.equal(a1.status + a2.status, 400, `accusation ${i + 1}: ${a1.error || ''} ${a2.error || ''}`);
  }
  assert.equal((await call(`/rooms/${code}/accuse`, { ...K, agent: ids.Z })).status, 409, 'three accusations a night');

  // Who Said It: only open questions; the host drops the next early; a new one every 30 minutes anyway
  assert.equal((await call(`/rooms/${code}/answer`, { ...A, k: 3, text: 'too early' })).status, 409, 'three open at 45 minutes, not four');
  tick(PROMPT_EVERY);
  v = (await call(`/rooms/${code}`, A)).room;
  assert.equal(v.prompts.length, 4, 'two at the start, then one every 30 minutes (75 minutes in)');
  await call(`/rooms/${code}/drop`, H);
  assert.equal((await call(`/rooms/${code}`, A)).room.prompts.length, 5);
  const answers = { H: 'pineapple on everything', A: 'I alphabetize my snacks', Z: 'what the fuck is a waffle', K: 'I can whistle with my nose' };
  for (const [who, text] of Object.entries(answers)) {
    const seat = { H, A, Z, K }[who];
    await call(`/rooms/${code}/answer`, { ...seat, k: 0, text });
    await call(`/rooms/${code}/answer`, { ...seat, k: 1, text: text + ' (again)' });
  }
  v = (await call(`/rooms/${code}`, Z)).room;
  assert.equal(v.prompts[0].mine, 'what the ▇▇▇ is a waffle', 'strong words come out redacted');
  assert.equal(v.prompts[0].count, 4);

  // the Yearbook: one vote per award, never for yourself
  assert.equal((await call(`/rooms/${code}/vote`, { ...A, k: 0, for: ids.A })).status, 400);
  for (const seat of [H, Z, K]) await call(`/rooms/${code}/vote`, { ...seat, k: 0, for: ids.A });
  await call(`/rooms/${code}/vote`, { ...A, k: 0, for: ids.H });
  await call(`/rooms/${code}/vote`, { ...A, k: 1, for: ids.Z });

  // a late arrival gets missions of their own
  const late = await call(`/rooms/${code}/join`, { name: 'Late' });
  assert.equal(late.room.missions.length, START_MISSIONS);

  // Declassified
  assert.equal((await call(`/rooms/${code}/declassify`, A)).status, 403);
  const dec = await call(`/rooms/${code}/declassify`, H);
  assert.equal(dec.room.phase, 'reveal');
  assert.equal(dec.room.step.type, 'title');
  assert.ok(dec.room.file);
  assert.equal((await call(`/rooms/${code}/join`, { name: 'Too Late' })).status, 409);
  assert.equal((await call(`/rooms/${code}/answer`, { ...A, k: 0, text: 'x' })).status, 409, 'answers lock at the reveal');
  room = await raw(code);
  const guessSteps = room.reveal.steps.filter((s) => s.type === 'guess');
  assert.equal(guessSteps.length, 8, 'eight guess rounds from eight answers');
  assert.equal(new Set(guessSteps.map((s) => s.author)).size, 4, 'every author gets featured');

  // round one: everyone but the author guesses; it ends as soon as they're all in
  await call(`/rooms/${code}/next`, H);
  v = (await call(`/rooms/${code}`, A)).room;
  assert.equal(v.step.type, 'guess');
  assert.equal(v.step.author, undefined, 'no author during the guess');
  const author = room.reveal.steps[1].author;
  const seats = { [ids.H]: H, [ids.A]: A, [ids.Z]: Z, [kid.pid]: K, [late.pid]: seatOf(late) };
  assert.equal((await call(`/rooms/${code}/guess`, { ...seats[author], step: 1, for: ids.H === author ? ids.A : ids.H })).status, 400, 'no guessing your own');
  for (const [pid, seat] of Object.entries(seats)) if (pid !== author) await call(`/rooms/${code}/guess`, { ...seat, step: 1, for: author });
  await call(`/rooms/${code}/fire`, { ...A, step: 1 });
  await call(`/rooms/${code}/fire`, { ...Z, step: 1 });
  tick(10);
  v = (await call(`/rooms/${code}`, A)).room;
  assert.equal(v.step.type, 'who', 'everyone guessed, so the answer shows');
  assert.equal(v.step.author, author);
  assert.equal(v.step.right, 4);
  assert.equal(v.step.fire, 2);
  // round two moves on by itself when the clock runs out, and its answer after that
  tick(SHOW_MS);
  v = (await call(`/rooms/${code}`, A)).room;
  assert.equal(v.step.type, 'guess');
  assert.equal(v.step.i, 3);
  await call(`/rooms/${code}/hide`, { ...H, step: 3 });
  v = (await call(`/rooms/${code}`, A)).room;
  assert.ok(v.step.i > 3, 'a hidden answer is skipped');
  tick(GUESS_MS + SHOW_MS);

  // skip ahead to the missions: the target confirms or denies
  room = await raw(code);
  const annStep = room.reveal.steps.findIndex((s) => s.type === 'agent' && s.pid === ids.A);
  for (let i = (await call(`/rooms/${code}`, H)).room.step.i; i < annStep; i++) await call(`/rooms/${code}/next`, H);
  v = (await call(`/rooms/${code}`, A)).room;
  assert.equal(v.step.type, 'agent');
  assert.equal(v.step.agent, ids.A);
  const done = v.step.missions.find((m) => m.status === 'done');
  assert.ok(done && v.step.missions.some((m) => m.status === 'burned') && v.step.missions.some((m) => m.status === 'open'));
  if (done.target) {
    const tseat = seats[done.target];
    assert.equal((await call(`/rooms/${code}/confirm`, { ...(done.target === ids.Z ? H : Z), step: annStep, card: done.card, ok: true })).status === 400 || done.target === ids.H, true);
    await call(`/rooms/${code}/confirm`, { ...tseat, step: annStep, card: done.card, ok: true });
  }

  // the awards and the final scores
  room = await raw(code);
  const awardStep = room.reveal.steps.findIndex((s) => s.type === 'award' && s.k === 0);
  for (let i = annStep; i < awardStep; i++) await call(`/rooms/${code}/next`, H);
  v = (await call(`/rooms/${code}`, Z)).room;
  assert.equal(v.step.type, 'award');
  assert.deepEqual(v.step.winners, [ids.A]);
  assert.equal(v.step.votes, 3);
  for (let i = awardStep; i < room.reveal.steps.length; i++) await call(`/rooms/${code}/next`, H);
  v = (await call(`/rooms/${code}`, Z)).room;
  assert.equal(v.step.type, 'final');
  const ann = v.step.scores.find((s) => s.id === ids.A);
  const zed = v.step.scores.find((s) => s.id === ids.Z);
  assert.ok(ann.missions >= POINTS.mission, 'Ann scored her mission');
  assert.ok(zed.burns >= POINTS.burn, 'Zed scored the burn');
  assert.ok(zed.cover >= POINTS.coverHeld * MAX_ACCUSE, 'Zed held cover three times');
  assert.equal(ann.answers, 2 * POINTS.answer);

  // the share page: highlights only, codenames only
  const file = await call(`/files/${v.file}`);
  assert.equal(file.status, 200);
  const text = JSON.stringify(file.file);
  for (const name of ['JJ-Capra', 'Ann', 'Zed', 'Kid']) assert.ok(!new RegExp(`"${name}"|\\b${name}\\b(?! )`).test(text.replace(/AGENT [A-Z' ]+/g, '')), `no real name (${name}) on the share page`);
  assert.equal(file.file.highlights.length, 1, 'only the answer the room fired up');
  assert.equal(file.file.awards[0].winners[0], (await raw(code)).players[ids.A].codename);
  assert.ok(file.file.missions.length >= 1 && file.file.redacted >= 1);
  assert.ok(!text.includes('I can whistle') || file.file.highlights.some((h) => h.text.includes('whistle')), 'unvoted answers stay off');
  // the file outlives the room
  await store.set('r/' + code, null);
  const again = await call(`/files/${v.file}`);
  assert.equal(again.status, 200);
  assert.equal(again.file.op, file.file.op);
  assert.equal((await call('/files/zzzzzzzzzz')).status, 404);
});

let passed = 0;
for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (e) { console.error('FAIL', name); console.error(e); process.exitCode = 1; }
}
console.log(`${passed}/${tests.length} passed`);
