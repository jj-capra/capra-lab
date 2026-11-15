// IRL: the counters, fed made-up bodies (no camera here).  node games/irl/test/irl.test.mjs
import assert from 'node:assert/strict';
import { P, CHALLENGES, ORDER, COUNTERS, squats, pushups, wallsit, dribbles, targets, keeper, avocados, CUT_POINTS, framing, shareRow, angle, MIN_TO_PAY } from '../logic.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  ', name); };
import { person, squatter, pusher, sitter, ASPECT } from './bodies.mjs';

const run = (counter, frames, dt = 33) => { let t = 0, out = []; for (const f of frames) { out.push(counter.update({ ...f, t })); t += dt; } return out; };
function cycle(make, from, to, frames = 20) {
  const out = [];
  for (let i = 0; i < frames; i++) out.push(make(from + (to - from) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frames))));
  return out;
}

test('the challenges: seven, each with a goal, a clock and setup words', () => {
  assert.deepEqual(ORDER, ['squat', 'pushup', 'wallsit', 'targets', 'dribble', 'keeper', 'avocado']);
  for (const k of ORDER) {
    const c = CHALLENGES[k];
    assert.ok(c.name && c.emoji && c.secs > 0 && c.goal > 0 && c.setup && c.how, k);
    assert.ok(COUNTERS[k] && MIN_TO_PAY[k] > 0, k);
  }
  assert.equal(Math.round(angle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })), 90);
  assert.equal(Math.round(angle({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 1 })), 90);
});

test('squats count when you stand back up, facing the phone or side-on', () => {
  for (const view of ['front', 'side']) {
    const c = squats(), frames = [];
    for (let r = 0; r < 5; r++) frames.push(...cycle((k) => squatter(k, view), 175, 80, 24));
    run(c, frames);
    assert.equal(c.score, 5, view);
  }
  // half squats don't count
  const half = squats();
  run(half, [].concat(...Array.from({ length: 4 }, () => cycle((k) => squatter(k), 175, 135, 24))));
  assert.equal(half.score, 0);
});

test('squats work from the picture alone too (no 3D points)', () => {
  const c = squats();
  const frames = [].concat(...Array.from({ length: 3 }, () => cycle((k) => { const p = squatter(k, 'front'); return { lm: p.lm, aspect: p.aspect }; }, 175, 80, 24)));
  run(c, frames);
  assert.equal(c.score, 3);
});

test('push-ups count at the top, only in a plank', () => {
  const c = pushups();
  run(c, [].concat(...Array.from({ length: 6 }, () => cycle((e) => pusher(e), 172, 80, 20))));
  assert.equal(c.score, 6);
  const shallow = pushups();
  run(shallow, [].concat(...Array.from({ length: 4 }, () => cycle((e) => pusher(e), 172, 120, 20))));
  assert.equal(shallow.score, 0, 'not low enough');
  const standing = pushups();
  const outs = run(standing, [].concat(...Array.from({ length: 4 }, () => cycle((e) => pusher(e, false), 172, 70, 20))));
  assert.equal(standing.score, 0, 'arm curls standing up are not push-ups');
  assert.ok(outs.some((o) => /plank/.test(o.say)));
});

test('the wall sit clock runs while you hold, and stops when you stand', () => {
  const c = wallsit(180);
  run(c, Array.from({ length: 10 * 30 }, () => sitter(90)), 1000 / 30);   // 10 s held
  assert.ok(c.score >= 9 && c.score <= 10, `held ${c.score}`);
  const outs = run(c, Array.from({ length: 3 * 30 }, () => sitter(178)), 1000 / 30);
  assert.ok(c.over && outs.some((o) => o.done), 'standing up ends it');
  assert.ok(c.score >= 9 && c.score <= 10);
  // it caps at the challenge's limit
  const cap = wallsit(5);
  const o2 = run(cap, Array.from({ length: 8 * 30 }, () => sitter(90)), 1000 / 30);
  assert.equal(cap.score, 5); assert.ok(o2.some((o) => o.done));
});

test('dribbles count each bounce of the hand, and ignore jitter', () => {
  const c = dribbles(), base = person('', { nose: [0, -1.45, 0], sh: [0, -1.25, 0.18], el: [0, -1.0, 0.25], wr: [0, -0.8, 0.3], idx: [0, -0.75, 0.3], hip: [0, -0.85, 0.1], knee: [0, -0.45, 0.1], ank: [0, 0, 0.1], foot: [0.1, 0, 0.1] });
  const frames = [];
  for (let i = 0; i < 30 * 8; i++) {   // 8 seconds at 30 fps, 2.5 bounces a second
    const lm = base.lm.map((p) => ({ ...p }));
    lm[P.RW] = { ...lm[P.RW], y: 0.62 + 0.07 * Math.sin((2 * Math.PI * 2.5 * i) / 30) + (Math.random() - 0.5) * 0.006 };
    lm[P.LW] = { ...lm[P.LW], y: lm[P.LW].y + (Math.random() - 0.5) * 0.006 };
    frames.push({ lm, aspect: ASPECT });
  }
  run(c, frames, 1000 / 30);
  assert.ok(c.score >= 18 && c.score <= 21, `counted ${c.score} of 20`);
  const still = dribbles();
  run(still, Array.from({ length: 90 }, () => { const lm = base.lm.map((p) => ({ ...p, y: p.y + (Math.random() - 0.5) * 0.01 })); return { lm, aspect: ASPECT }; }), 1000 / 30);
  assert.equal(still.score, 0, 'standing still counts nothing');
});

test('targets: reach and hit them; too slow is a miss; hits in a row build a combo', () => {
  let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const g = targets({ rand, life: 2000 });
  const base = squatter(178, 'front');
  let t = 0, hits = 0;
  const frame = (hand) => { const lm = base.lm.map((p) => ({ ...p })); if (hand) lm[P.RW] = { ...lm[P.RW], x: hand.x, y: hand.y }; return { lm, aspect: ASPECT, t }; };
  for (let i = 0; i < 5; i++) {
    g.update(frame(null)); t += 300;                          // a target appears
    const at = g.target; assert.ok(at, 'a target is up');
    assert.ok(at.x >= 0.08 && at.x <= 0.92 && at.y >= 0.08 && at.y <= 0.62, 'inside the picture');
    const r = g.update(frame({ x: at.x + 0.02, y: at.y })); t += 300;
    if (r.rep) hits++;
  }
  assert.equal(hits, 5); assert.equal(g.best, 5);
  g.update(frame(null)); t += 2500;
  const r = g.update(frame(null));
  assert.ok(r.miss, 'left alone too long, it fades'); assert.equal(g.misses, 1);
});

test('goalkeeper: a hand on the ball once it is close is a save; leave it and it is a goal', () => {
  let seed = 11; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const g = keeper({ rand });
  const base = squatter(178, 'front');
  // hands and feet are out of play (hidden) unless a test puts one on the ball
  const frame = (hand, t) => {
    const lm = base.lm.map((p, i) => ([15, 16, 19, 20, 27, 28, 31, 32].includes(i) ? { ...p, visibility: 0.1 } : { ...p }));
    if (hand) { lm[P.RW] = { ...lm[P.RW], x: hand.x, y: hand.y, visibility: 0.95 }; lm[P.RI] = { ...lm[P.RI], x: hand.x, y: hand.y, visibility: 0.95 }; }
    return { lm, aspect: ASPECT, t };
  };
  let t = 0, saves = 0, kinds = new Set();
  for (let i = 0; i < 6; i++) {
    while (!g.shot) { g.update(frame(null, t)); t += 33; }
    kinds.add(g.shot.kind);
    const s = g.shot;
    assert.ok(s.to.x >= 0.08 && s.to.x <= 0.92 && s.to.y >= 0.1 && s.to.y <= 0.86, 'aimed inside the picture');
    // too early to save: the ball is still far off
    const early = g.ball(t);
    const r0 = g.update(frame({ x: early.x, y: early.y }, t)); t += 33;
    assert.ok(!r0.rep, 'a far-off ball can’t be saved yet');
    while (g.shot && g.ball(t).p < 0.7) { g.update(frame(null, t)); t += 33; }
    const b = g.ball(t);
    const r = g.update(frame({ x: b.x + 0.02, y: b.y }, t)); t += 33;
    if (r.rep) saves++;
  }
  assert.equal(saves, 6); assert.equal(g.best, 6);
  while (!g.shot) { g.update(frame(null, t)); t += 33; }
  let goal = false;
  for (let i = 0; i < 200 && !goal; i++) { goal = !!g.update(frame(null, t)).goal; t += 33; }
  assert.ok(goal, 'left alone, it goes in'); assert.equal(g.goals, 1);
  assert.ok(kinds.size >= 2, 'shots come from different places');
});

test('avocado chop: a fast swipe cuts, every cut on the same one triples, chilis cost 25', () => {
  assert.deepEqual(CUT_POINTS, [1, 3, 9, 27, 81]);
  let seed = 5; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const g = avocados({ rand, chili: 0 });
  const base = squatter(178, 'front');
  const away = { x: 0.02, y: 0.98 };
  const frame = (L, R, t) => {
    const lm = base.lm.map((p) => ({ ...p }));
    // a hand not in play is hidden, so each swipe starts fresh (moving it back through would cut too)
    for (const [w, i, h] of [[P.LW, P.LI, L], [P.RW, P.RI, R]]) { lm[w] = { ...lm[w], ...(h || away), visibility: h ? 0.95 : 0.1 }; lm[i] = { ...lm[i], ...(h || away), visibility: 0.1 }; }
    return { lm, aspect: ASPECT, t };
  };
  let t = 0;
  while (!g.items.length) { g.update(frame(null, null, t)); t += 33; }
  const it = g.items[0];
  while (it.y > 0.7) { g.update(frame(null, null, t)); t += 33; }
  // a slow drift through it does nothing
  const ahead = (k) => it.y + it.vy * (0.033 * k);
  const sy = ahead(1);
  g.update(frame({ x: it.x - 0.01, y: sy }, null, t)); t += 33;
  const slow = g.update(frame({ x: it.x + 0.01, y: sy }, null, t)); t += 33;
  assert.ok(!slow.rep, 'too slow to cut');
  g.update(frame(null, null, t)); t += 33;
  // three fast swipes, a quarter second apart: 1 + 3 + 9
  let got = [];
  for (let k = 0; k < 3; k++) {
    g.update(frame({ x: it.x - 0.2, y: ahead(1) }, null, t)); t += 33;
    const r = g.update(frame({ x: it.x + 0.2, y: ahead(0) }, null, t)); t += 33;
    if (r.cut) got.push(r.cut.pts);
    for (let w = 0; w < 7; w++) { g.update(frame(null, null, t)); t += 33; }
  }
  assert.deepEqual(got, [1, 3, 9]);
  assert.equal(g.score, 13); assert.equal(g.most, 3);
  // a chili: −25, but never below zero
  const h = avocados({ rand, chili: 1 });
  let t2 = 0;
  while (!h.items.some((x) => x.kind === 'chili')) { h.update(frame(null, null, t2)); t2 += 33; if (t2 > 20000) break; }
  const c = h.items.find((x) => x.kind === 'chili');
  assert.ok(c, 'a chili shows up');
  h.update(frame({ x: c.x - 0.2, y: c.y }, null, t2)); t2 += 33;
  const r = h.update(frame({ x: c.x + 0.2, y: c.y + c.vy * 0.033 }, null, t2));
  assert.ok(r.spicy); assert.equal(h.score, 0); assert.equal(h.spicy, 1);
  // avocados nobody touches fall and count as dropped
  const d = avocados({ rand, chili: 0 });
  for (let tt = 0; tt < 6000; tt += 33) d.update(frame(null, null, tt));
  assert.ok(d.dropped >= 2, `dropped ${d.dropped}`);
});

test('framing tells you what the camera is missing', () => {
  const p = squatter(178);
  assert.equal(framing('squat', p.lm).ok, true);
  const noFeet = p.lm.map((q, i) => (i >= 27 ? { ...q, visibility: 0.1 } : q));
  assert.match(framing('squat', noFeet).say, /feet/);
  assert.equal(framing('targets', noFeet).ok, true, 'targets only need the top half');
  assert.equal(framing('squat', null).ok, false);
});

test('the results row fills toward the goal', () => {
  assert.equal(shareRow(10, 20), '🟩🟩🟩🟩🟩⬛⬛⬛⬛⬛');
  assert.equal(shareRow(30, 20, true), '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⚡');
  assert.equal(shareRow(0, 20), '⬛'.repeat(10));
});

console.log(`\nIRL: ${passed} tests passed`);
