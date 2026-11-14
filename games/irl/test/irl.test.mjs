// IRL: the counters, fed made-up bodies (no camera here).  node games/irl/test/irl.test.mjs
import assert from 'node:assert/strict';
import { P, CHALLENGES, ORDER, COUNTERS, squats, pushups, wallsit, dribbles, targets, framing, shareRow, angle, MIN_TO_PAY } from '../logic.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  ', name); };
import { person, squatter, pusher, sitter, ASPECT } from './bodies.mjs';

const run = (counter, frames, dt = 33) => { let t = 0, out = []; for (const f of frames) { out.push(counter.update({ ...f, t })); t += dt; } return out; };
function cycle(make, from, to, frames = 20) {
  const out = [];
  for (let i = 0; i < frames; i++) out.push(make(from + (to - from) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frames))));
  return out;
}

test('the challenges: five, each with a goal, a clock and setup words', () => {
  assert.deepEqual(ORDER, ['squat', 'pushup', 'wallsit', 'targets', 'dribble']);
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
