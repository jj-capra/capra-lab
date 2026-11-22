// Tough Sleddin: the courses always leave a way through, the sled steers, jumps, slides and crashes the way
// it should, and the score is feet.
import assert from 'node:assert/strict';
import { SCENES, KINDS, ROW, FIRST, LAT_MAX, RAMP_LEN, AIR_T, MPH, makeCourse, newRun, step, botInput, feet, FT, shareRows, speedAt, CRASH_WORDS } from '../logic.mjs';
import { EARN } from '../../../public/lab/wallet-catalog.mjs';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok', name); };
const H = 1 / 120;

test('three winter worlds, each with its own things in the way', () => {
  assert.deepEqual(SCENES.map((s) => s.name), ['Pinewood Run', 'Lantern Village', 'Aurora Glacier']);
  for (const S of SCENES) {
    for (const k of Object.keys(S.kinds)) assert.ok(KINDS[k] && !KINDS[k].barrier, `${S.id}: ${k}`);
    assert.ok(KINDS[S.barrier].barrier, `${S.id}: its barrier`);
    assert.ok(S.vMax > S.v0 && S.acc > 0);
    for (const k of [...Object.keys(S.kinds), S.barrier]) assert.ok(CRASH_WORDS[k], `${k} has words for the card`);
  }
  assert.ok(SCENES[2].ice, 'the glacier has ice');
  // twice the first day's speeds (JC: "Double the speed"): over 65 mph from the start, past 150 at the top
  for (const S of SCENES) assert.ok(S.v0 * MPH > 65 && S.vMax * MPH > 150, `${S.id}: fast`);
});

test('the same seed makes the same run', () => {
  const a = makeCourse(42, 1), b = makeCourse(42, 1);
  const pa = a.obstacles(0, 1500).map((o) => [o.kind, o.d.toFixed(2), o.x.toFixed(2)].join()), pb = b.obstacles(0, 1500).map((o) => [o.kind, o.d.toFixed(2), o.x.toFixed(2)].join());
  assert.deepEqual(pa, pb);
  assert.ok(pa.length > 40);
  assert.notDeepEqual(makeCourse(43, 1).obstacles(0, 1500).map((o) => o.x), a.obstacles(0, 1500).map((o) => o.x));
});

test('every row leaves a gap, and you can steer from one gap to the next', () => {
  for (let s = 0; s < 3; s++) for (let seed = 1; seed <= 12; seed++) {
    const C = makeCourse(seed * 101, s);
    C.ensure(4000);
    let last = null;
    for (const row of C.rows) {
      if (row.gap == null) continue;
      for (const o of row.obs) {
        if (o.barrier) {
          // a barrier: its ramp sits on the gap, and there's a way round at one edge
          assert.ok(row.ramp && Math.abs(row.ramp.x - row.gap) < 0.01, 'a ramp in front of the barrier');
          const hw = C.halfWidth(row.d), c = C.center(row.d);
          assert.ok(o.x0 - (c - hw) >= 3 || (c + hw) - o.x1 >= 3, 'a way round the barrier');
        } else assert.ok(Math.abs(o.x - row.gap) >= 3.4 - 1e-9, `${o.kind} out of the gap`);
      }
      if (last) {
        const v = speedAt(C.S, row.d), dist = row.d - last.d;
        // walked at half your sideways speed; where the track bends hard and the gap has to stay on it, still
        // well within your full sideways speed
        assert.ok(Math.abs(row.gap - last.gap) <= (dist / v) * LAT_MAX * 0.8 + 1e-6, `gap reachable at ${row.d}`);
      }
      last = row;
    }
    // a jump lands before the next ramp (you can't take a ramp you're flying over)
    const rs = C.ramps(0, 4000);
    for (let i = 1; i < rs.length; i++) assert.ok(rs[i].d - rs[i - 1].d > speedAt(C.S, rs[i - 1].d) * AIR_T + RAMP_LEN, `ramps apart at ${rs[i].d}`);
    assert.equal(C.rows[0].d, FIRST);
    assert.equal(C.rows[1].d - C.rows[0].d, ROW);
  }
});

test('a goat that steers for the gaps gets a long way in every world', () => {
  for (let s = 0; s < 3; s++) {
    const far = [];
    for (let seed = 1; seed <= 12; seed++) {
      const C = makeCourse(seed * 7919, s), st = newRun(C);
      while (!st.crashed && st.d < 6000) step(st, botInput(st, C), H, C);
      far.push(st.d);
    }
    far.sort((a, b) => a - b);
    assert.ok(far[6] > 2400, `${SCENES[s].name}: half the rides past 2,400 m (median ${far[6].toFixed(0)})`);
  }
});

test('steering: the arrows push you sideways, letting go settles you', () => {
  const C = makeCourse(5, 0), st = newRun(C), x0 = st.x;
  for (let i = 0; i < 60; i++) step(st, 1, H, C);
  assert.ok(st.x > x0 + 1 && st.vx > 5, 'right arrow');
  for (let i = 0; i < 120; i++) step(st, 0, H, C);
  assert.ok(Math.abs(st.vx) < 0.5, 'let go and it settles');
  for (let i = 0; i < 400; i++) step(st, -1, H, C);
  assert.ok(st.vx >= -LAT_MAX - 1e-9, 'never faster sideways than the most');
});

test('the run speeds up, and the score is feet', () => {
  const C = makeCourse(7, 1), st = newRun(C);
  const v0 = st.v;
  for (let i = 0; i < 120 * 10 && !st.crashed; i++) step(st, botInput(st, C), H, C);
  assert.ok(st.v > v0, 'faster after 10 s');
  assert.equal(feet(st), Math.floor(st.d * FT));
  assert.ok(feet(st) > st.d * 3, 'feet, not meters');
});

test('a ramp: up its slope, off the lip, under a second in the air, back down', () => {
  const C = makeCourse(11, 0);
  C.ensure(2000);
  const r = C.ramps(200, 2000)[0];
  assert.ok(r, 'a ramp somewhere');
  const st = newRun(C);
  st.d = r.d - 5; st.x = r.x; st.t = 20;
  let launched = null, landed = null, peak = 0;
  for (let i = 0; i < 600 && !landed; i++) {
    st.x = r.x; st.vx = 0;
    step(st, 0, H, C);
    if (st.air && launched == null) { launched = st.d; assert.ok(st.d >= r.d + RAMP_LEN - 0.5, 'off the lip'); }
    if (st.air) peak = Math.max(peak, st.h);
    if (launched != null && !st.air) landed = st.d;
  }
  assert.ok(launched != null && landed != null, 'up and down again');
  assert.ok(peak > 1.5 && peak < 3.5, `a good hop (${peak.toFixed(2)})`);
  const secs = (landed - launched) / st.v;
  assert.ok(secs > 0.6 && secs < 1.2, `${secs.toFixed(2)} s in the air`);
});

test("a barrier: hit it on the snow and you crash, fly over it from its ramp and you don't", () => {
  let C, row;
  for (let seed = 1; seed < 60 && !row; seed++) { C = makeCourse(seed, 0); C.ensure(3000); row = C.rows.find((r) => r.obs.some((o) => o.barrier)); }
  assert.ok(row, 'a barrier somewhere');
  const o = row.obs.find((x) => x.barrier);
  const along = (x0, from) => { const st = newRun(C); st.d = from; st.x = x0; st.t = 30; for (let i = 0; i < 1200 && !st.crashed && st.d < row.d + 5; i++) { st.x = x0; st.vx = 0; step(st, 0, H, C); } return st; };
  // on the snow beside the ramp, after it (the rows just before a barrier are kept empty)
  const hit = along(row.ramp.x + (row.ramp.x > o.x ? -row.ramp.hw - 1.2 : row.ramp.hw + 1.2), row.d - 8);
  assert.equal(hit.crashed && hit.crashed.kind, o.kind, 'hit the barrier on the snow');
  const flew = along(row.ramp.x, row.ramp.d - 1);
  assert.equal(flew.crashed, null, 'flew over it from the ramp');
  assert.ok(flew.jumps >= 1);
});

test('into the trees past the edge, into a tree on the track', () => {
  const C = makeCourse(3, 0), st = newRun(C);
  for (let i = 0; i < 1200 && !st.crashed; i++) step(st, 1, H, C);
  assert.equal(st.crashed && st.crashed.kind, 'trees');
  const C2 = makeCourse(3, 0); C2.ensure(1000);
  const pine = C2.obstacles(100, 1000).find((o) => o.kind === 'pine');
  const s2 = newRun(C2); s2.d = pine.d - 4; s2.x = pine.x; s2.t = 10;
  for (let i = 0; i < 240 && !s2.crashed; i++) { s2.x = pine.x; step(s2, 0, H, C2); }
  assert.equal(s2.crashed && s2.crashed.kind, 'pine');
});

test('ice on the glacier slides you', () => {
  const C = makeCourse(9, 2); C.ensure(3000);
  const p = C.ice(150, 3000)[0];
  assert.ok(p, 'some ice');
  const slide = (onIce) => {
    const st = newRun(C); st.t = 20;
    st.d = onIce ? p.d + 1 : p.d + p.len + 40; st.x = onIce ? p.x : C.center(st.d);
    step(st, 0, H, C);
    st.vx = 6;
    for (let i = 0; i < 30; i++) { if (onIce) { st.d = Math.min(st.d, p.d + p.len - 2); st.x = Math.max(p.x - p.hw + 0.5, Math.min(p.x + p.hw - 0.5, st.x)); } step(st, 0, H, C); }
    return { vx: st.vx, ice: st.ice };
  };
  const ice = slide(true), snow = slide(false);
  assert.ok(ice.ice, 'on the ice');
  assert.ok(ice.vx > snow.vx * 2, `keeps sliding on ice (${ice.vx.toFixed(2)} vs ${snow.vx.toFixed(2)})`);
});

test('the results text: a row a world, a square a thousand feet, ⚡ for a best', () => {
  const rows = shareRows([{ scene: 0, ft: 3500, best: true }, { scene: 1, ft: 900, best: false }, { scene: 2, ft: 14000, best: false }]);
  assert.equal(rows[0], '🌲 🟩🟩🟩⬛⬛⬛⬛⬛⬛⬛⚡');
  assert.equal(rows[1], '🏘️ ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛');
  assert.equal(rows[2], '🧊 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩');
});

test('the wallet pays for a run of all three and a new best', () => {
  assert.ok(EARN['tough-sleddin'].run.amber > 0);
  assert.ok(EARN['tough-sleddin'].best.shards > 0);
});

console.log(`Tough Sleddin: ${n} tests passed`);
