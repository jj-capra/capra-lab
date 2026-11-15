// IRL: the counters, fed made-up bodies (no camera here).  node games/irl/test/irl.test.mjs
import assert from 'node:assert/strict';
import { P, CHALLENGES, ORDER, COUNTERS, squats, pushups, wallsit, dribbles, targets, keeper, avocados, derby, SILOS, CUT_POINTS, TWO_UP, splitPlayers, bodyX, winnerOf, framing, shareRow, angle, MIN_TO_PAY } from '../logic.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  ', name); };
import { person, squatter, pusher, sitter, ASPECT } from './bodies.mjs';

const run = (counter, frames, dt = 33) => { let t = 0, out = []; for (const f of frames) { out.push(counter.update({ ...f, t })); t += dt; } return out; };
function cycle(make, from, to, frames = 20) {
  const out = [];
  for (let i = 0; i < frames; i++) out.push(make(from + (to - from) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frames))));
  return out;
}

test('the challenges: eight, each with a goal, a clock and setup words', () => {
  assert.deepEqual(ORDER, ['squat', 'pushup', 'wallsit', 'targets', 'dribble', 'keeper', 'avocado', 'derby']);
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

test('silo derby: timing aims the hit, swing speed carries it, skee-ball points', () => {
  assert.deepEqual(SILOS.map((x) => x.pts), [100, 50, 100, 10, 20, 30, 20, 10]);
  let seed = 3; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const g = derby({ rand });
  const base = squatter(178, 'front');
  const beltY = (base.lm[P.LS].y + base.lm[P.LH].y) / 2;
  const frame = (x, t) => {
    const lm = base.lm.map((p) => ({ ...p }));
    for (const i of [P.LW, P.RW, P.LI, P.RI]) lm[i] = { ...lm[i], x, y: beltY, visibility: 0.95 };
    return { lm, aspect: ASPECT, t };
  };
  let t = 0;
  const idle = () => { const r = g.update(frame(0.3, t)); t += 16; return r; };
  // swing: the hands sweep from x0 to x1 in `dur` ms, fastest around `at`
  const swing = (at, x0, x1, dur = 100) => {
    const out = [];
    while (t < at + 400) {
      const u = Math.max(0, Math.min(1, (t - (at - dur * 0.7)) / dur));
      const r = g.update(frame(x0 + (x1 - x0) * u, t)); t += 16;
      if (r.hit || r.strike || r.foul || r.grounder) out.push(r);
      if (out.length) break;
    }
    return out[0] || {};
  };
  const nextPitch = () => { while (!g.pitch) idle(); return g.pitch; };
  // on time and hard: the middle of the back row
  let pc = nextPitch();
  assert.ok(pc.to.y > 0.3 && pc.from.y > 1, 'it comes from the phone to the belt');
  let r = swing(pc.arrive, 0.3, 0.75);
  assert.ok(r.hit, 'contact'); assert.equal(r.hit.row, 0); assert.equal(r.hit.pts, 50);
  // early and hard, hands going right: pulled into the right corner (100)
  pc = nextPitch();
  r = swing(pc.arrive - 130, 0.3, 0.75);
  assert.equal(r.hit && r.hit.pts, 100); assert.ok(g.silos[r.hit.silo].lane === 1);
  // late and hard, hands going right: the other way, the left corner
  pc = nextPitch();
  r = swing(pc.arrive + 130, 0.3, 0.75);
  assert.equal(r.hit && r.hit.pts, 100); assert.ok(g.silos[r.hit.silo].lane === -1);
  // a soft swing on time: the front row's 30
  pc = nextPitch();
  r = swing(pc.arrive, 0.35, 0.65, 110);
  assert.ok(r.hit, 'soft contact'); assert.equal(r.hit.row, 1); assert.equal(r.hit.pts, 30);
  assert.equal(g.score, 280); assert.equal(g.homers, 3); assert.equal(g.best, 4);
  // way early: a strike; no swing at all: a strike
  pc = nextPitch();
  r = swing(pc.arrive - 400, 0.3, 0.75);
  assert.ok(r.strike && r.say.includes('early'));
  // a swing long before the ball gets there (getting set) doesn't count: the pitch is still coming
  pc = nextPitch();
  const id = pc.id;
  const far = pc.arrive - 900;
  while (t < far + 200) { const u = Math.max(0, Math.min(1, (t - (far - 70)) / 100)); g.update(frame(0.3 + 0.45 * u, t)); t += 16; }
  assert.ok(g.pitch && g.pitch.id === id, 'still coming');
  for (let k = 0; k < 40; k++) { g.update(frame(0.75 - k * 0.01, t)); t += 16; }   // hands drift back
  let looked0 = null;
  while (!looked0) { const x = g.update(frame(0.35, t)); t += 16; if (x.strike) looked0 = x; }
  pc = nextPitch();
  let looked = null;
  while (!looked) { const x = idle(); if (x.strike) looked = x; }
  assert.equal(g.strikes, 3); assert.equal(g.best, 4);
  // the very edge of the window: a foul
  pc = nextPitch();
  r = swing(pc.arrive + 220, 0.3, 0.75);
  assert.ok(r.foul, 'foul'); assert.equal(g.fouls, 1);
  // a ball flies to its silo and drops in
  const fl = { from: { x: 0.5, y: 0.5 }, to: { x: 0.2, y: 0.1 }, born: 0, row: 0 };
  const top = g.flyer(fl, 375), end = g.flyer(fl, 750);
  assert.ok(top.y < 0.1, 'it arcs up'); assert.ok(Math.abs(end.x - 0.2) < 1e-9 && Math.abs(end.y - 0.1) < 1e-9);
  // silos sit across the top of the play area, back row above the front
  assert.ok(g.silos.every((x) => x.x >= 0.08 && x.x <= 0.92));
  assert.ok(g.silos.filter((x) => x.row === 0).every((x) => x.y < g.silos.find((y) => y.row === 1).y));
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

test('two players: who is who, a half each, and who won', () => {
  // every challenge but push-ups (side-on, one player would hide the other) works for two
  assert.deepEqual(TWO_UP, ORDER.filter((k) => k !== 'pushup'));
  for (const k of TWO_UP) assert.ok(CHALLENGES[k].setup2, k);
  // two bodies, in either order from the tracker: sorted by where they stand on screen
  const at = (x) => { const b = squatter(178); return { lm: b.lm.map((q) => ({ ...q, x: x + (q.x - 0.5) * 0.4 })), world: b.world }; };
  const a = at(0.3), b = at(0.7);
  assert.deepEqual(splitPlayers([b, a]), [a, b]);
  // mirrored (the picture shows flipped), the one at picture x 0.7 shows on the left
  assert.deepEqual(splitPlayers([a, b], true), [b, a]);
  assert.ok(Math.abs(bodyX(a.lm) - 0.3) < 0.02 && Math.abs(bodyX(a.lm, true) - 0.7) < 0.02);
  // one body alone belongs to the half it stands in; nobody is nobody
  assert.deepEqual(splitPlayers([b]), [null, b]);
  assert.deepEqual(splitPlayers([a]), [a, null]);
  assert.deepEqual(splitPlayers([a], true), [null, a]);
  assert.deepEqual(splitPlayers([]), [null, null]);
  assert.deepEqual(splitPlayers([{ lm: null }]), [null, null]);
  assert.equal(winnerOf([12, 9]), 0); assert.equal(winnerOf([3, 9]), 1); assert.equal(winnerOf([7, 7]), -1);
  // each player's avocados, shots, pitches and silos stay in their own half
  const half = { x0: 0.55, x1: 0.95, y0: 0.1, y1: 0.86 };
  let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const av = avocados({ rand, bounds: { x0: 0.55, x1: 0.95 } });
  for (let t = 0; t < 20000; t += 33) av.update({ lm: [], t });
  assert.ok(av.items.length > 0);
  const k = keeper({ rand, bounds: half }), right = at(0.75);
  k.update({ lm: right.lm, t: 700 });
  assert.ok(k.shot && k.shot.to.x >= 0.55 && k.shot.to.x <= 0.95 && k.shot.from.x > 0.6, 'the shot comes from in front of the right half');
  const d = derby({ rand, bounds: half });
  d.update({ lm: right.lm, t: 800 });
  assert.ok(d.pitch && d.pitch.from.x > 0.6 && d.pitch.to.x >= 0.55, 'the pitch comes to the right half');
  assert.ok(d.silos.every((x) => x.x >= 0.55 && x.x <= 0.95), 'silos in the right half');
});

test('avocados fly up inside their bounds', () => {
  let seed = 11; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const av = avocados({ rand, bounds: { x0: 0.05, x1: 0.45 } }), xs = [];
  for (let t = 0; t < 15000; t += 33) { av.update({ lm: [], t }); for (const it of av.items) if (it.y > 1) xs.push(it.x); }
  assert.ok(xs.length && xs.every((x) => x >= 0.05 && x <= 0.45), 'launched in the left half');
});

console.log(`\nIRL: ${passed} tests passed`);
