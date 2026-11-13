// Don't Look!: the decks and the tilt logic.  node games/dont-look/test/dont-look.test.mjs
import assert from 'node:assert/strict';
import { LEVELS, DECKS, MIX } from '../words.js';
import { faceUp, createTilt, deal, remember, wordsFor, decksAt } from '../logic.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('every deck has a name, an emoji, a color and decent lists', () => {
  const ids = new Set();
  for (const d of DECKS) {
    assert.ok(d.id && !ids.has(d.id), 'unique id ' + d.id); ids.add(d.id);
    assert.ok(d.name && d.emoji && /^#[0-9A-F]{6}$/i.test(d.color), d.id);
    for (const [lvl, words] of Object.entries(d.words)) {
      assert.ok(LEVELS.some((l) => String(l.id) === lvl), `${d.id}: level ${lvl}`);
      assert.ok(words.length >= 90, `${d.id} level ${lvl} has only ${words.length} words`);
      for (const w of words) {
        assert.ok(w.length >= 2 && w.length <= 34, `${d.id} ${lvl}: length of "${w}"`);
        assert.ok(!/[?<>{}\\]/.test(w), `${d.id} ${lvl}: odd character in "${w}"`);
      }
    }
  }
  assert.ok(!ids.has(MIX.id));
});

test('a word shows up once per level, across every deck (so Mix It Up never repeats)', () => {
  for (const l of LEVELS) {
    const seen = new Map();
    for (const d of DECKS) for (const w of d.words[l.id] || []) {
      const k = w.toLowerCase();
      assert.ok(!seen.has(k), `level ${l.id}: "${w}" is in ${seen.get(k)} and ${d.id}`);
      seen.set(k, d.id);
    }
  }
});

test('every level has plenty of decks', () => {
  for (const l of LEVELS) assert.ok(decksAt(DECKS, l.id).length >= 12, `level ${l.id}`);
  assert.equal(wordsFor(DECKS, 'mix', 1).length, DECKS.reduce((n, d) => n + (d.words[1] || []).length, 0));
  for (const d of DECKS) for (const l of LEVELS) assert.ok((d.words[l.id] || []).length >= 90, `${d.id} has a full deck at level ${l.id}`);
});

test('faceUp: flat is 1, upright on a forehead is 0 either way round, face down is -1', () => {
  near(faceUp(0, 0), 1, 'flat');
  near(faceUp(0, 90), 0, 'sideways one way');
  near(faceUp(0, -90), 0, 'sideways the other way');
  near(faceUp(180, 0), -1, 'face down');
  assert.ok(faceUp(0, 45) > 0.6, 'tipped 45 degrees screen-up');
  assert.ok(faceUp(180, 45) < -0.6, 'tipped 45 degrees screen-down');
  // around upright, beta flips between 0 and 180 while gamma passes 90: the reading stays near 0
  assert.ok(Math.abs(faceUp(0, 89) - faceUp(180, 89)) < 0.04);
});

test('tilt: one flip per tip, and the next only after coming back upright', () => {
  const t = createTilt({ smooth: 1 });
  // starts tilted: nothing counts until it has been upright
  assert.equal(t.feed(0, 30, 0), null);
  assert.equal(t.armed, false);
  assert.equal(t.feed(0, 88, 10), null);
  assert.equal(t.armed, true);
  // screen to the ceiling (gamma heads toward 0 from 90 with beta 0)
  assert.equal(t.feed(0, 40, 20), 'up');
  assert.equal(t.feed(0, 20, 30), null, 'holding it up is still one answer');
  assert.equal(t.feed(0, 10, 40), null);
  // back upright, then screen to the floor (beta 180 side)
  assert.equal(t.feed(0, 85, 50), null);
  assert.equal(t.feed(180, 40, 60), 'down');
  assert.equal(t.feed(180, 50, 70), null);
});

test('tilt: small wobbles on a forehead are not answers, and resting time is tracked', () => {
  const t = createTilt();
  let now = 0;
  for (let i = 0; i < 40; i++) { now += 50; assert.equal(t.feed(i % 2 ? 0 : 180, 78 + (i % 5), now), null); }
  assert.ok(t.restingFor(now) >= 1900, 'resting about two seconds');
  t.disarm();
  assert.equal(t.armed, false);
});

test('dealing puts unseen words first, and the memory starts over once the deck is used up', () => {
  const words = ['a', 'b', 'c', 'd', 'e'];
  const order = deal(words, ['a', 'b']);
  assert.deepEqual(new Set(order.slice(0, 3)), new Set(['c', 'd', 'e']));
  assert.equal(order.length, 5);
  assert.deepEqual(remember(['a'], ['b', 'c'], words), ['a', 'b', 'c']);
  assert.deepEqual(remember(['a', 'b', 'c'], ['d', 'e'], words), ['d', 'e']);
  assert.deepEqual(remember(['gone'], ['a'], words), ['a'], 'words no longer in the deck drop out');
});

console.log(`Don't Look!: ${passed} tests passed (${DECKS.length} decks, ${DECKS.reduce((n, d) => n + Object.values(d.words).flat().length, 0)} words)`);
