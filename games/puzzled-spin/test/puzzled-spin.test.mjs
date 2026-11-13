// Puzzled Spin: the art, the puzzles and the rules.  node games/puzzled-spin/test/puzzled-spin.test.mjs
import assert from 'node:assert/strict';
import { TIERS, LEVELS, PER_RUN, makeArt, colorAt, sameTurns, puzzle, check, stageOf, artSvg, halftoneStep, rng, hash,
  dayNumber, labDay, dailySeed, solvePoints, isFast } from '../logic.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; };
const zero = (p) => p.start.map((row) => row.map(() => 0));

// every color index that shows anywhere on the board
function colorsOn(art) {
  const seen = new Set();
  const k = 60;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) seen.add(colorAt(art, ((i + 0.5) / k) * art.n, ((j + 0.5) / k) * art.n));
  return seen;
}

test('the ladder climbs: two colors, then three, up to a six-color masterpiece', () => {
  for (let level = 1; level <= 11; level++) {
    for (let s = 1; s <= 12; s++) {
      const n = level <= 4 ? 2 : level <= 8 ? 4 : 5;
      const art = makeArt(level, n, rng(level * 1000 + s));
      const used = colorsOn(art);
      assert.equal(art.colors.length, LEVELS[level].colors, `level ${level}: palette size`);
      assert.equal(used.size, LEVELS[level].colors, `level ${level} seed ${s}: ${used.size} colors show, wanted ${LEVELS[level].colors}`);
      assert.equal(new Set(art.colors).size, art.colors.length, `level ${level}: colors are all different`);
    }
  }
});

test('every picture is mirrored left to right and top to bottom', () => {
  for (let level = 1; level <= 11; level++) {
    const n = 4, art = makeArt(level, n, rng(77 + level));
    let off = 0, total = 0;
    for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) {
      const x = ((i + 0.5) / 40) * n, y = ((j + 0.5) / 40) * n;
      total++;
      if (colorAt(art, x, y) !== colorAt(art, n - x, y)) off++;
      // hearts and five-point stars only mirror left to right
      if (![1, 2, 4].includes(level) && colorAt(art, x, y) !== colorAt(art, x, n - y)) off++;
    }
    assert.ok(off / total < 0.02, `level ${level}: ${off} of ${total} points break the mirror`);
  }
});

test('each tier runs five pictures that climb the ladder, and K–1 starts with a 2×2 two-tone', () => {
  for (const t of TIERS) {
    assert.equal(t.stages.length, PER_RUN);
    const levels = t.stages.map((s) => s[0]);
    for (let i = 1; i < levels.length; i++) assert.ok(levels[i] > levels[i - 1], `tier ${t.id} climbs`);
    const sizes = t.stages.map((s) => s[1]);
    for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] >= sizes[i - 1], `tier ${t.id} grids never shrink`);
  }
  assert.deepEqual(stageOf(1, 0), { level: 1, n: 2, turn: 1 });
  assert.equal(LEVELS[stageOf(4, 4).level].name, 'Masterpiece');
});

test('puzzles start broken, turn the right number of tiles and put back together', () => {
  for (const t of TIERS) for (let i = 0; i < PER_RUN; i++) for (let s = 1; s <= 8; s++) {
    const p = puzzle(t.id, i, hash(`${t.id}:${i}:${s}`));
    const { n, turn } = stageOf(t.id, i);
    assert.equal(p.n, n);
    assert.ok(check(p, zero(p)).done, `tier ${t.id} stage ${i} seed ${s}: the picture is whole unturned`);
    const st = check(p, p.start);
    assert.ok(!st.done, `tier ${t.id} stage ${i} seed ${s}: starts broken`);
    const wrong = st.ok.flat().filter((x) => !x).length;
    if (turn === 'all') {
      const movable = p.same.flat().filter((x) => x.length < 4).length;
      assert.equal(wrong, movable, `tier ${t.id} stage ${i}: every tile that can look wrong does`);
      assert.ok(movable >= (n * n) / 2);
    } else assert.equal(wrong, turn, `tier ${t.id} stage ${i} seed ${s}: ${wrong} wrong, wanted ${turn}`);
    assert.ok(p.time >= t.baseTime);
  }
});

test('a tile is right at any turn that looks the same, and only those', () => {
  // a 3×3 kaleidoscope: the center tile looks the same every way round
  const p = puzzle(1, 4, 99);
  assert.equal(p.n, 3);
  assert.deepEqual(p.same[1][1], [0, 1, 2, 3], 'the center of a kaleidoscope can face any way');
  const q = zero(p);
  q[1][1] = 2;
  assert.ok(check(p, q).done);
  // a corner of a 2×2 two-tone has one right way
  const k = puzzle(1, 0, 5);
  assert.deepEqual(k.same[0][0], [0]);
  const q2 = zero(k);
  q2[0][0] = 1;
  const st = check(k, q2);
  assert.ok(!st.done && !st.ok[0][0] && st.ok[1][1]);
  assert.equal(st.rows[0], false);
  assert.equal(st.rows[1], true);
  assert.equal(st.cols[1], true);
  // sameTurns agrees with itself
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) assert.deepEqual(sameTurns(p.art, r, c), p.same[r][c]);
});

test('the same seed makes the same puzzle, and a day has its own five', () => {
  assert.deepEqual(puzzle(3, 2, 42).start, puzzle(3, 2, 42).start);
  assert.deepEqual(puzzle(3, 2, 42).art.colors, puzzle(3, 2, 42).art.colors);
  const a = dailySeed(2, 5, 0), b = dailySeed(2, 5, 1), c = dailySeed(3, 5, 0);
  assert.ok(a !== b && a !== c);
  assert.equal(dayNumber('2026-11-12'), 1);
  assert.equal(labDay(Date.parse('2026-11-13T07:59:00Z')), '2026-11-12');
});

test('the drawing: one pattern and one group per piece, halftone dots that line up with the tiles', () => {
  const p = puzzle(4, 4, 7);
  const svg = artSvg(p.art, 'art-x');
  assert.ok(svg.startsWith('<pattern id="art-x-ht"'));
  assert.ok(svg.includes('<g id="art-x">'));
  assert.ok(!/NaN|undefined/.test(svg));
  for (const n of [2, 3, 4, 5, 6]) {
    const step = halftoneStep(n);
    assert.ok(Math.abs(1 / step - Math.round(1 / step)) < 1e-9, `n ${n}: a whole number of dots a tile`);
  }
});

test('points: time bonus and Spin Streak', () => {
  assert.equal(solvePoints(20, 0), 200);
  assert.equal(solvePoints(20, 1), 300);
  assert.equal(solvePoints(20, 9), 600, 'the streak stops at x3');
  assert.ok(isFast(20, 40) && !isFast(19.9, 40));
});

console.log(`Puzzled Spin: ${passed} tests passed`);
