// Par-Tee Time's hole data, loaded straight out of the page: node games/par-tee-time/test/holes.test.mjs
// (also run from par-tee-time.test.mjs, so `npm test` covers it).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The engine and the hole data are plain script between the engine banner and the renderer banner.
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const a = src.indexOf('PAR-TEE TIME · engine'), b = src.indexOf('PAR-TEE TIME · renderer');
assert.ok(a > 0 && b > a, 'the engine and renderer banners are still in the page');
const code = src.slice(src.lastIndexOf("'use strict';", a), src.lastIndexOf("'use strict';", b));
// eslint-disable-next-line no-new-func
const E = new Function(code + '\nreturn { COURSE_SETS, HOLE_DEFS, TUNE, compileHole, buildNav, inPoly, vlen, R };')();
const { COURSE_SETS, HOLE_DEFS, TUNE, compileHole, buildNav, inPoly, vlen, R } = E;

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok  ', name); }
  catch (e) { console.log('FAIL', name); console.error(e); process.exitCode = 1; }
}

test('eight courses of nine holes, 72 holes in all', () => {
  assert.equal(COURSE_SETS.length, 8);
  for (const c of COURSE_SETS) assert.equal(c.holes.length, 9, c.id + ' has nine holes');
  assert.equal(HOLE_DEFS.length, 72);
  assert.equal(new Set(COURSE_SETS.map(c => c.id)).size, 8, 'course ids are unique');
  assert.equal(new Set(HOLE_DEFS.map(d => d.id)).size, 72, 'hole ids are unique');
  for (const c of COURSE_SETS) for (const gi of c.idx) assert.equal(HOLE_DEFS[gi].course, c.id);
});

test('every course has a name, a tag and a blurb, and covers all nine themes', () => {
  const themes = ['windmill', 'pool', 'lagoon', 'highway', 'vault', 'hardwood', 'moon', 'pinball', 'clock'];
  for (const c of COURSE_SETS) {
    assert.ok(c.name && c.tag && c.blurb, c.id);
    assert.deepEqual(c.holes.map(d => d.theme).sort(), themes.slice().sort(), c.id + ' plays each theme once');
  }
});

test('the first four courses keep their hole numbers (saved settings and online matches use them)', () => {
  const first = ['b-clock', 'b-highway', 'b-moon', 'b-lagoon', 'b-hardwood', 'b-windmill', 'b-pool', 'b-vault', 'b-pinball',
    'pool', 'clock', 'pinball', 'hardwood', 'highway', 'windmill', 'lagoon', 'moon', 'vault',
    'a-hardwood', 'a-pinball', 'a-pool', 'a-clock', 'a-windmill', 'a-lagoon', 'a-moon', 'a-highway', 'a-vault',
    'g-pinball', 'g-pool', 'g-clock', 'g-windmill', 'g-highway', 'g-vault', 'g-hardwood', 'g-moon', 'g-lagoon'];
  assert.deepEqual(HOLE_DEFS.slice(0, 36).map(d => d.id), first);
  assert.deepEqual(COURSE_SETS.filter(c => ['boardwalk', 'party', 'afterhours', 'gauntlet'].includes(c.id)).map(c => c.idx[0]), [0, 9, 18, 27]);
});

test('every hole has a name, a tee, a cup, a par and a measured TUNE entry', () => {
  for (const d of HOLE_DEFS) {
    assert.ok(d.name && d.blurb, d.id + ' has a name and blurb');
    assert.ok(d.tee && Number.isFinite(d.tee.x) && Number.isFinite(d.tee.y), d.id + ' has a tee');
    assert.ok(d.cup && Number.isFinite(d.cup.x) && Number.isFinite(d.cup.y), d.id + ' has a cup');
    assert.ok(Number.isInteger(d.par) && d.par >= 2 && d.par <= 6, d.id + ' has a par');
    const t = TUNE[d.id];
    assert.ok(Array.isArray(t) && t.length === 3 && t[0] === d.par, d.id + ' has a TUNE entry matching its par');
  }
});

test('tees and cups sit on open green, and every tee has a path to its cup', () => {
  for (const d of HOLE_DEFS) {
    const h = compileHole(d);
    for (const [nm, p] of [['tee', h.tee], ['cup', h.cup]]) {
      assert.ok(inPoly(p.x, p.y, h.fairway), `${d.id} ${nm} is on the fairway`);
      assert.ok(!h.solids.some(s => inPoly(p.x, p.y, s.poly)), `${d.id} ${nm} is not inside a wall`);
      assert.ok(!h.hazardsC.some(z => z.poly && inPoly(p.x, p.y, z.poly)), `${d.id} ${nm} is not in the water`);
      assert.ok(!h.pockets.some(q => vlen(p.x - q.x, p.y - q.y) < q.r + R), `${d.id} ${nm} is clear of the pockets`);
    }
    assert.ok(buildNav(h).at(h.tee.x, h.tee.y) < 9000, d.id + ' tee can reach the cup');
  }
});

console.log(`\nPar-Tee Time holes: ${passed} tests passed`);
