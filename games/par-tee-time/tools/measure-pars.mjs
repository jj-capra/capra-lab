// Measures Par-Tee Time pars headlessly: the NPC skill levels play holes with the page's own engine
// and planner, under the game's turn rules (planner -> pickShot noise -> roll up to 14 s; water,
// lasers, pockets and black holes cost a stroke and put the ball back where it was hit; sinking the
// 8 takes a stroke back). The planner always finishes its search here (in the game it stops after
// 2.6 s of thinking), so these are full-strength numbers. TUNE's par is the Hustler average rounded.
//   node games/par-tee-time/tools/measure-pars.mjs '<hole id regex>' [runs] [rookie:8,hustler:16] [cap] [seed]
import { readFileSync } from 'node:fs';
function loadEngine(file = new URL('../index.html', import.meta.url)) {
  const src = readFileSync(file, 'utf8');
  const a = src.indexOf('PAR-TEE TIME · engine'), b = src.indexOf('PAR-TEE TIME · renderer');
  const code = src.slice(src.lastIndexOf("'use strict';", a), src.lastIndexOf("'use strict';", b));
  // eslint-disable-next-line no-new-func
  return new Function(code + '\nreturn { compileHole, buildNav, makePlanner, pickShot, SKILLS, newBall, cloneBall, makeWorld, applyShot, runToRest, HOLE_DEFS, inPoly, vlen, R, TUNE };')();
}
const E = loadEngine();
const { compileHole, buildNav, makePlanner, pickShot, SKILLS, newBall, cloneBall, makeWorld, applyShot, runToRest, HOLE_DEFS, inPoly, vlen, R, TUNE } = E;

function rng32(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function placeFree(h, balls, b, x, y) {
  for (let r = 0; r < 60; r += 4) for (let k = 0; k < (r ? 12 : 1); k++) {
    const a = k * Math.PI * 2 / 12, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (!inPoly(px, py, h.fairway)) continue;
    if (balls.some(o => o !== b && !o.out && vlen(o.x - px, o.y - py) < 2 * R + 1)) continue;
    b.x = px; b.y = py; return;
  }
  b.x = x; b.y = y;
}

function playHole(def, skillName, seed, cap = 10, log = null) {
  const skill = SKILLS[skillName], rng = rng32(seed);
  const h = compileHole(def), nav = buildNav(h);
  let balls = h.objects.map((o, i) => newBall({ id: 'o' + i, kind: 'o', n: o.n, x: o.x, y: o.y }));
  const me = newBall({ id: 'p0', kind: 'p', owner: 0, x: h.tee.x, y: h.tee.y });
  balls.push(me);
  let strokes = 0, clock = rng() * 40;
  const outs = {}; let stuck = 0, slow = 0;
  while (strokes < cap) {
    const bs = balls.map(cloneBall), si = bs.findIndex(b => b.id === 'p0');
    const t0 = clock + 2.0 + rng() * 0.5;
    const P = makePlanner(h, nav, bs, si, t0, skill);
    const tp = performance.now();
    while (!P.work(1e9));
    if (performance.now() - tp > 2600) slow++;
    const sh = pickShot(P.results, skill, rng);
    const tS = t0 + (sh.delay || 0) + (sh.dt || 0);
    const from = { x: me.x, y: me.y };
    strokes++;
    const S = makeWorld(h, balls, tS); S.quiet = true;
    applyShot(me, sh.a, sh.p, sh.sx, sh.sy, S);
    runToRest(S, 14);
    clock = S.t + 1.5;
    let eight = false, holed = false;
    const keep = [];
    for (const b of balls) {
      if (!b.out) { keep.push(b); continue; }
      if (b.kind === 'o') { if (b.n === 8) eight = true; continue; }
      if (b.out === 'cup') { holed = true; continue; }
      outs[b.out] = (outs[b.out] || 0) + 1;
      b.out = null; b.vx = b.vy = 0; keep.push(b); strokes++; b.restore = true;
    }
    balls = keep;
    for (const b of balls) if (b.restore) { b.restore = false; placeFree(h, balls, b, from.x, from.y); }
    if (eight) strokes = Math.max(0, strokes - 1);
    if (log) log.push({ a: +sh.a.toFixed(3), p: +sh.p.toFixed(2), x: Math.round(me.x), y: Math.round(me.y), out: Object.keys(outs).join(','), score: +sh.planned.score.toFixed(2) });
    if (holed) return { strokes: Math.max(1, strokes), outs, stuck, slow, holed: true };
    if (nav.at(me.x, me.y) >= 9000) stuck++;
  }
  return { strokes: cap, outs, stuck, slow, holed: false };
}

{
  const re = new RegExp(process.argv[2] || '.');
  const runs = +(process.argv[3] || 6);
  const skills = (process.argv[4] || 'rookie,hustler').split(',');
  const cap = +(process.argv[5] || 10);
  const seed0 = +(process.argv[6] || 1);
  for (const def of HOLE_DEFS) {
    if (!re.test(def.id)) continue;
    const row = [def.id.padEnd(14), 'par', def.par, 'tune', JSON.stringify(TUNE[def.id] || null)];
    for (const skr of skills) {
      const [sk, rr] = skr.split(':'); const runsK = rr ? +rr : runs;
      let tot = 0, miss = 0, stuck = 0, slow = 0; const outs = {};
      const t = performance.now();
      for (let k = 0; k < runsK; k++) {
        const r = playHole(def, sk, seed0 * 1000 + k * 7919 + 13);
        tot += r.strokes; if (!r.holed) miss++; stuck += r.stuck; slow += r.slow;
        for (const [o, n] of Object.entries(r.outs)) outs[o] = (outs[o] || 0) + n;
      }
      row.push(`| ${sk} ${(tot / runsK).toFixed(2)} n${runsK}${miss ? ' miss' + miss : ''}${stuck ? ' STUCK' + stuck : ''} outs${JSON.stringify(outs)} ${((performance.now() - t) / runsK / 1000).toFixed(1)}s`);
    }
    console.log(row.join(' '));
  }
}
