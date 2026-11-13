// Puzzled Spin: the puzzle maker and the rules.  node games/puzzled-spin/test/puzzled-spin.test.mjs
import assert from 'node:assert/strict';
import { TIERS, puzzle, solved, check, shown, fits, mirror, looksSame, falseFriends, rng, dayNumber, labDay, dailySeed, solvePoints, streakMult, isFast, PER_RUN } from '../logic.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; };
const zero = (p) => p.tiles.map((row) => row.map(() => 0));

test('edges: a pattern fits itself, a dual-tone pair fits its mirror image', () => {
  assert.ok(fits(3, 3));
  assert.ok(!fits(3, 4));
  assert.equal(mirror('1.4'), '4.1');
  assert.ok(fits('1.4', '4.1'));
  assert.ok(!fits('1.4', '1.4'), 'the same pair the same way round is a mirror twin, not a match');
  const tile = ['a', 'b', 'c', 'd'];
  assert.equal(shown(tile, 1, 1), 'a', 'one turn clockwise brings the top edge to the right');
  assert.equal(shown(tile, 3, 0), 'b', 'three turns bring the right edge to the top');
  assert.ok(looksSame([7, 7, 7, 7], 1));
  assert.ok(looksSame([1, 2, 1, 2], 2));
  assert.ok(!looksSame([1, 2, 1, 2], 1));
});

test('every tier makes solvable grids of the right size and pattern count', () => {
  for (const t of TIERS) {
    for (let s = 1; s <= 40; s++) {
      const p = puzzle(t.id, s * 7919);
      assert.equal(p.n, t.n);
      assert.equal(p.tiles.length, t.n);
      assert.ok(p.types.length >= t.types[0] && p.types.length <= t.types[1], `tier ${t.id}: ${p.types.length} patterns`);
      assert.ok(check(p, zero(p)).done, `tier ${t.id} seed ${s}: solved grid locks`);
      assert.ok(!check(p, p.start).done, `tier ${t.id} seed ${s}: starts scrambled`);
      assert.equal(p.time, t.time);
      // every pattern shows up where tiles meet (the grid has enough inner edges for all of them)
      const inner = new Set();
      for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
        if (c + 1 < p.n) inner.add(String(p.tiles[r][c][1]));
        if (r + 1 < p.n) inner.add(String(mirror(p.tiles[r][c][2])));
      }
      const innerCount = 2 * p.n * (p.n - 1);
      if (innerCount >= p.types.length) for (const ty of p.types) assert.ok(inner.has(String(ty)), `tier ${t.id} seed ${s}: pattern ${ty} sits on an inner edge`);
    }
  }
});

test('K–1 turns only one or two tiles; the other tiers turn every tile that can look different', () => {
  for (let s = 1; s <= 30; s++) {
    const p = puzzle(1, s);
    const turned = p.start.flat().filter((q) => q !== 0).length;
    assert.ok(turned >= 1 && turned <= 2, `K–1 seed ${s}: ${turned} tiles turned`);
  }
  for (const id of [2, 3, 4]) for (let s = 1; s <= 20; s++) {
    const p = puzzle(id, s);
    for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
      const tile = p.tiles[r][c];
      if ([1, 2, 3].some((t) => !looksSame(tile, t))) assert.notEqual(p.start[r][c], 0, `tier ${id} seed ${s}: tile ${r},${c} starts turned`);
    }
  }
});

test('the same seed makes the same puzzle, and a day has its own five', () => {
  assert.deepEqual(puzzle(3, 42), puzzle(3, 42));
  assert.notDeepEqual(puzzle(3, 42).tiles, puzzle(3, 43).tiles);
  const a = dailySeed(2, 5, 0), b = dailySeed(2, 5, 1), c = dailySeed(3, 5, 0);
  assert.ok(a !== b && a !== c);
  assert.equal(dayNumber('2026-11-12'), 1);
  assert.equal(dayNumber('2026-12-12'), 31);
  assert.equal(labDay(Date.parse('2026-11-13T07:59:00Z')), '2026-11-12');
  assert.equal(PER_RUN, 5);
});

test('check: locked tiles, rows and columns', () => {
  const p = puzzle(2, 99);
  const q = zero(p);
  q[0][0] = [1, 2, 3].find((t) => !looksSame(p.tiles[0][0], t));
  const st = check(p, q);
  assert.ok(!st.done);
  assert.equal(st.locked[0][0], false, 'the turned corner no longer fits');
  assert.equal(st.locked[2][2], true, 'the far corner still does');
  assert.equal(st.rows[2], true);
  assert.equal(st.cols[2], true);
  assert.equal(st.side[0][0][3], null, 'a side on the board edge never counts');
});

test('middle school and high school grids have false friends, and high school has mirror twins', () => {
  let friends = 0;
  for (let s = 1; s <= 10; s++) friends += falseFriends(puzzle(3, s));
  assert.ok(friends >= 10, `false friends in 10 middle school grids: ${friends}`);
  for (let s = 1; s <= 10; s++) {
    const p = puzzle(4, s);
    const twins = p.types.filter((ty) => p.types.includes(mirror(ty))).length / 2;
    assert.ok(twins >= 3, `high school seed ${s}: ${twins} mirror twins`);
  }
});

test('points: time bonus, combo and Spin Streak', () => {
  assert.equal(solvePoints(20, 0), 200);
  assert.equal(solvePoints(20, 1), 300);
  assert.equal(solvePoints(20, 9), 600, 'combo stops at x3');
  assert.equal(solvePoints(0, 0), 100);
  assert.equal(streakMult(1, 4), 1, 'no streak for K–1');
  assert.equal(streakMult(3, 4), 4);
  assert.equal(streakMult(4, 9), 5);
  assert.ok(isFast(20, 40) && !isFast(19.9, 40));
});

test('a scrambled grid can always be put back', () => {
  for (const t of TIERS) {
    const p = puzzle(t.id, 1234);
    assert.ok(check(p, zero(p)).done);
    // any tile that looks the same turned can't break it
    const q = zero(p);
    for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) if (looksSame(p.tiles[r][c], 2)) q[r][c] = 2;
    assert.ok(check(p, q).done);
  }
  const s = solved(TIERS[3], rng(5));
  assert.equal(s.tiles.flat().length, 25);
});

console.log(`Puzzled Spin: ${passed} tests passed`);
