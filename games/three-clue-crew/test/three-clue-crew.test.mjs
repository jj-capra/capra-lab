// Three Clue Crew: the rounds and the daily logic.  node games/three-clue-crew/test/three-clue-crew.test.mjs
import assert from 'node:assert/strict';
import { ROUNDS } from '../rounds.js';
import { TIERS, PER_GAME, dailySet, quickSet, remember, choices, dayNumber, labDay, rng, rank } from '../logic.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; };

test('every tier has a big bank of well-formed rounds', () => {
  for (const t of TIERS) {
    const rs = ROUNDS[t.id];
    assert.ok(rs.length >= 150, `tier ${t.id} has only ${rs.length} rounds`);
    rs.forEach((r, i) => {
      const at = `tier ${t.id} round ${i + 1} (${r.clues.join(', ')})`;
      assert.equal(r.clues.length, 3, `${at}: three clues`);
      for (const c of r.clues) assert.ok(c && !/\s/.test(c), `${at}: "${c}" is one word`);
      assert.equal(r.wrong.length, 3, `${at}: three wrong choices`);
      const all = [r.answer, ...r.wrong].map((s) => s.toLowerCase());
      assert.equal(new Set(all).size, 4, `${at}: four different choices`);
      assert.ok(all.every(Boolean), `${at}: no empty choice`);
      assert.ok(r.why.length > 10, `${at}: says why`);
      const words = r.answer.toLowerCase().split(/[^a-z0-9²√]+/).filter(Boolean);
      for (const c of r.clues) assert.ok(!words.includes(c.toLowerCase()), `${at}: "${c}" gives away "${r.answer}"`);
      for (const s of [r.answer, ...r.wrong, ...r.clues]) assert.ok(!/[<>{}\\`]/.test(s), `${at}: odd character in "${s}"`);
    });
    const sets = rs.map((r) => r.clues.map((c) => c.toLowerCase()).sort().join(','));
    assert.equal(new Set(sets).size, sets.length, `tier ${t.id}: no two rounds share all three clues`);
  }
});

test('the daily ten are the same for everyone and never repeat until the bank is used up', () => {
  for (const t of TIERS) {
    const n = ROUNDS[t.id].length;
    assert.deepEqual(dailySet(n, t.id, 7), dailySet(n, t.id, 7));
    const per = Math.floor(n / PER_GAME);
    const seen = new Set();
    for (let no = 1; no <= per; no++) {
      const set = dailySet(n, t.id, no);
      assert.equal(set.length, PER_GAME);
      for (const i of set) { assert.ok(i >= 0 && i < n); assert.ok(!seen.has(i), `tier ${t.id} day ${no} repeats round ${i}`); seen.add(i); }
    }
    assert.notDeepEqual(dailySet(n, t.id, 1), dailySet(n, t.id, per + 1), 'the next pass is shuffled again');
  }
  assert.notDeepEqual(dailySet(160, 1, 3), dailySet(160, 2, 3), 'each tier has its own order');
});

test('day numbers start at No. 1 on launch day, in Pacific time', () => {
  assert.equal(dayNumber('2026-11-12'), 1);
  assert.equal(dayNumber('2026-11-13'), 2);
  assert.equal(dayNumber('2027-11-12'), 366);
  assert.equal(labDay(Date.parse('2026-11-13T07:30:00Z')), '2026-11-12', 'still the 12th at 11:30 pm in Spokane');
  assert.equal(labDay(Date.parse('2026-11-13T08:30:00Z')), '2026-11-13');
});

test('practice sets deal unseen rounds first and remember what was played', () => {
  const set = quickSet(20, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 10, rng(4));
  assert.ok(set.every((i) => i >= 10), 'all ten are new');
  assert.deepEqual(remember([1, 2], [3], 5), [1, 2, 3]);
  assert.deepEqual(remember([0, 1, 2, 3], [4], 5), [4], 'starts over once everything has been seen');
});

test('choices hold the answer and the three wrong ones, in a seeded order', () => {
  const r = ROUNDS[1][0];
  const a = choices(r, rng(11)), b = choices(r, rng(11));
  assert.deepEqual(a, b);
  assert.deepEqual([...a].sort(), [r.answer, ...r.wrong].sort());
  assert.equal(rank(10), 'PERFECT GAME!');
  assert.equal(rank(0), 'KEEP PLAYING!');
});

console.log(`Three Clue Crew: ${passed} tests passed (${TIERS.map((t) => ROUNDS[t.id].length).join(' + ')} rounds)`);
