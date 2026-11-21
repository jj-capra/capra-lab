// Color by Numbers: the library draws, the levels cut it the way they should, and a puzzle built from
// a region map has every spot numbered on itself. (The real pictures' region maps need a canvas; the
// whole library is checked level by level in a browser before shipping, see games/color-by-numbers/CLAUDE.md.)
import assert from 'node:assert/strict';
import { PICTURES, CATS, parts } from '../library.mjs';
import { LEVELS, levelParts, makeCells, cellMap, buildPuzzle, reducePalette, packPoles, unpackPoles, keyFor, R } from '../logic.mjs';
import { EARN } from '../../../public/lab/wallet-catalog.mjs';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok', name); };

test('100 pictures with names, kinds and unique ids', () => {
  assert.equal(PICTURES.length, 100);
  assert.equal(new Set(PICTURES.map((p) => p.id)).size, 100);
  assert.equal(new Set(PICTURES.map((p) => p.title)).size, 100);
  for (const p of PICTURES) assert.match(p.id, /^[a-z0-9-]+$/, p.id);
  const cats = new Set(CATS.map((c) => c.id));
  for (const p of PICTURES) assert.ok(cats.has(p.cat), `${p.id}: ${p.cat}`);
  for (const c of CATS) assert.ok(PICTURES.filter((p) => p.cat === c.id).length >= 7, `${c.id} has pictures`);
  assert.ok(PICTURES.filter((p) => p.cat === 'unicorns').length >= 10, 'plenty of unicorns');
  assert.ok(PICTURES.filter((p) => p.cat === 'dolls').length >= 10, 'plenty of dolls');
  assert.ok(PICTURES.filter((p) => p.cat === 'puppies').length >= 10, 'plenty of puppies');
});

test('every picture draws clean parts on the page', () => {
  const PATH = /^M[-\d. ]+(?:[LCMZ][-\d. ]*)*$/;
  for (const pic of PICTURES) {
    const ps = parts(pic.id);
    assert.ok(ps.length >= 15, `${pic.id}: ${ps.length} parts`);
    assert.ok(ps.filter((p) => p.k === 'fill' && !(p.t > 0)).length >= 4, `${pic.id}: things to color at Crayon`);
    for (const p of ps) {
      assert.ok(['fill', 'ink', 'line'].includes(p.k), `${pic.id}: kind ${p.k}`);
      for (const d of [p.d, p.clip, p.out].filter(Boolean)) {
        assert.ok(!/NaN|undefined|Infinity/.test(d), `${pic.id}: a broken path`);
        assert.match(d.replace(/\s+/g, ' '), PATH, `${pic.id}: path syntax`);
      }
      assert.match(p.c, /^#[0-9a-f]{6}$/, `${pic.id}: color ${p.c}`);
      assert.ok(p.w >= 0 && Number.isFinite(p.w), `${pic.id}: line width`);
      if (p.k === 'fill') assert.ok([0, 1, 2, 3].includes(p.t || 0), `${pic.id}: level ${p.t}`);
    }
    // it stays on the page (give or take an outline)
    const nums = ps.flatMap((p) => p.d.match(/-?\d+(?:\.\d+)?/g).map(Number));
    assert.ok(Math.min(...nums) > -260 && Math.max(...nums) < 660, `${pic.id}: drawn near the page`);
  }
});

test('four levels, each harder than the last', () => {
  assert.deepEqual(LEVELS.map((l) => l.name), ['Crayon', 'Marker', 'Paintbrush', 'Stained Glass']);
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].maxColors > LEVELS[i - 1].maxColors);
    assert.ok(LEVELS[i].minR < LEVELS[i - 1].minR);
  }
  assert.equal(LEVELS[0].cut, 0);
  assert.equal(LEVELS[3].cut, 2);
});

test('details above a level are drawn already or left out', () => {
  const ps = [
    { k: 'fill', d: 'M0 0L1 1Z', c: '#ff0000', t: 0, w: 1 },
    { k: 'fill', d: 'M0 0L1 1Z', c: '#00ff00', t: 1, keep: true, w: 1 },
    { k: 'fill', d: 'M0 0L1 1Z', c: '#0000ff', t: 2, w: 1 },
    { k: 'line', d: 'M0 0L1 1', c: '#000000', w: 1 },
  ];
  assert.deepEqual(levelParts(ps, 0).map((p) => p.k + p.c), ['fill#ff0000', 'ink#00ff00', 'line#000000']);
  assert.deepEqual(levelParts(ps, 1).map((p) => p.k + p.c), ['fill#ff0000', 'fill#00ff00', 'line#000000']);
  assert.equal(levelParts(ps, 3).filter((p) => p.k === 'fill').length, 3);
  // and every real picture has more to color as the levels go up
  for (const pic of PICTURES.slice(0, 20)) {
    const counts = LEVELS.map((l) => levelParts(parts(pic.id), l.id).filter((p) => p.k === 'fill').length);
    for (let i = 1; i < counts.length; i++) assert.ok(counts[i] >= counts[i - 1], `${pic.id}: ${counts}`);
  }
});

test('stained glass cells: every pixel in the cell of its nearest seed', () => {
  const cells = makeCells('test', 25), map = cellMap(cells);
  const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  for (let k = 0; k < 400; k++) {
    const x = Math.floor((k * 97) % R), y = Math.floor((k * 61 + 13) % R);
    assert.ok(inPoly(cells.polys[map[y * R + x]], x + 0.5, y + 0.5), `pixel ${x},${y}`);
  }
  assert.ok(cells.edges.length > 300);
  assert.deepEqual(makeCells('test', 25).seeds, cells.seeds, 'the same picture cuts the same way every time');
});

// a little picture as a region map: sky (bg), a big round friend, a small cheek, an eye (ink)
function sample() {
  const parts = [
    { k: 'fill', d: '', c: '#bfe6ff', t: 0, bg: true },
    { k: 'fill', d: '', c: '#f5a65b', t: 0 },
    { k: 'fill', d: '', c: '#ff9fbf', t: 0 },
  ];
  const lab = new Int32Array(R * R);
  for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
    const i = y * R + x;
    lab[i] = 0;
    if ((x - 200) ** 2 + (y - 220) ** 2 < 120 ** 2) lab[i] = 1;
    if ((x - 150) ** 2 + (y - 240) ** 2 < 14 ** 2) lab[i] = 2;
    if ((x - 240) ** 2 + (y - 200) ** 2 < 8 ** 2) lab[i] = -1;
  }
  return { parts, lab };
}

test('a puzzle: every spot numbered on itself, colors in order, glass from Paintbrush up', () => {
  const { parts: ps, lab } = sample();
  const sizes = [];
  for (const L of LEVELS) {
    const P = buildPuzzle({ parts: ps, partLabel: lab, lv: L.id, seedKey: 'sample' });
    const live = P.units.filter((u) => !u.auto);
    sizes.push(live.length);
    assert.ok(P.palette.length <= L.maxColors);
    for (const u of live) {
      assert.ok(u.num >= 1 && u.num <= P.palette.length);
      assert.equal(P.palette[u.num - 1].color, u.color);
      assert.ok(u.labels.length >= 1);
      for (const l of u.labels) assert.equal(P.map[Math.floor(l.y) * R + Math.floor(l.x)], P.units.indexOf(u));
    }
    if (L.cut === 0) assert.equal(live.length, 3, `${L.name}: sky, friend, cheek`);
    if (L.cut === 1) assert.ok(P.cut.has(0) && !P.cut.has(1), 'Paintbrush cuts only the background');
    if (L.cut === 2) assert.ok(P.cut.has(0) && P.cut.has(1) && !P.cut.has(2), 'Stained Glass cuts everything big');
    // the eye isn't a spot
    assert.equal(P.map[200 * R + 240], -1);
  }
  assert.ok(sizes[3] > sizes[2] && sizes[2] > sizes[1], `more spots each level: ${sizes}`);
});

test('a tiny bit is colored already at Crayon and a spot at Marker', () => {
  const { parts: ps, lab } = sample();
  ps.push({ k: 'fill', d: '', c: '#ffd84a', t: 0 });
  for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) if ((x - 300) ** 2 + (y - 60) ** 2 < 6 ** 2) lab[y * R + x] = 3;
  const c = buildPuzzle({ parts: ps, partLabel: lab, lv: 0, seedKey: 's' });
  const m = buildPuzzle({ parts: ps, partLabel: lab, lv: 1, seedKey: 's' });
  const at = (P) => P.units[P.map[60 * R + 300]];
  assert.ok(at(c).auto, 'Crayon fills the tiny one in');
  assert.ok(!at(m).auto && at(m).labels.length === 1, 'Marker colors it');
});

test('palettes: merged to fit, the sky never turns a friend blue', () => {
  const w = new Map([['#fdf4ff', 500], ['#d6efff', 9000], ['#c9e6ff', 2000], ['#ff8fc8', 300], ['#ff9fcf', 200], ['#7cc96a', 6000]]);
  const bg = new Map([['#d6efff', 1], ['#c9e6ff', 1], ['#7cc96a', 1]]);
  const { map, order } = reducePalette(w, 4, bg);
  assert.equal(order.length, 4);
  assert.equal(map.get('#fdf4ff'), '#fdf4ff', 'the white unicorn stays white');
  assert.equal(map.get('#c9e6ff'), '#d6efff', 'the two skies merge');
  assert.equal(map.get('#ff9fcf'), '#ff8fc8', 'the two pinks merge');
});

test('saved progress finds its spots again', () => {
  const { parts: ps, lab } = sample();
  const P = buildPuzzle({ parts: ps, partLabel: lab, lv: 3, seedKey: 'sample' });
  const filled = new Set(P.units.map((u, i) => i).filter((i) => !P.units[i].auto && i % 3 === 0));
  const back = unpackPoles(packPoles(P.units, filled), P.map);
  assert.deepEqual([...back].sort((a, b) => a - b), [...filled].sort((a, b) => a - b));
  assert.equal(keyFor('happy-puppy', 2), 'happy-puppy@2');
  assert.equal(unpackPoles('', P.map).size, 0);
});

test('the wallet pays for finished pictures', () => {
  assert.ok(EARN['color-by-numbers'].picture.amber > 0);
  assert.ok(EARN['color-by-numbers'].masterpiece.shards > 0);
});

console.log(`color by numbers: ${n} tests passed`);
