// IRL's Full Body Workout: each move counted from made-up bodies, then the whole circuit on its clock.
//   node games/irl/test/workout.test.mjs
import assert from 'node:assert/strict';
import { jacks, kneeCrunch, highKnees, skaters, reaction, burpees, workout, workoutRow, workoutSecs, WORKOUT, MOVES, bodyOf } from '../workout.mjs';
import { COUNTERS, CHALLENGES, TWO_UP, MIN_TO_PAY, framing } from '../logic.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  ', name); };

/* A person standing in an upright picture (480 × 640), about four fifths of its height, facing the phone:
   their left on the picture's right, as the camera sees them. `pose` moves joints (picture x, y);
   `hide` lists joints the camera can't see; `dx` shifts the whole body across. */
const IDX = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28 };
const STAND = { nose: [0.5, 0.15], ls: [0.57, 0.27], rs: [0.43, 0.27], le: [0.59, 0.4], re: [0.41, 0.4], lw: [0.6, 0.52], rw: [0.4, 0.52],
  lh: [0.54, 0.53], rh: [0.46, 0.53], lk: [0.54, 0.7], rk: [0.46, 0.7], la: [0.54, 0.87], ra: [0.46, 0.87] };
function fig(pose = {}, { hide = [], dx = 0, dy = 0 } = {}) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0 }));
  const all = { ...STAND, ...pose };
  for (const [k, [x, y]] of Object.entries(all)) lm[IDX[k]] = { x: x + dx, y: y + dy, z: 0, visibility: hide.includes(k) ? 0.05 : 0.95 };
  for (const [a, b] of [[15, 19], [16, 20], [27, 31], [28, 32], [0, 7], [0, 8]]) lm[b] = { ...lm[a], y: lm[a].y + 0.01 };
  return { lm, world: null, aspect: 0.75 };
}
function run(counter, frames, { from = 0, dt = 33 } = {}) { let t = from; const out = []; for (const f of frames) { out.push(counter.update({ ...f, t })); t += dt; } return { out, t, reps: out.filter((r) => r && r.rep).length }; }
const hold = (f, n) => Array(n).fill(f);

// poses
const CLOSED = fig();
const OPEN = fig({ lw: [0.66, 0.08], rw: [0.34, 0.08], le: [0.63, 0.18], re: [0.37, 0.18], la: [0.6, 0.87], ra: [0.4, 0.87], lk: [0.57, 0.7], rk: [0.43, 0.7] });
const ARMS_ONLY = fig({ lw: [0.66, 0.08], rw: [0.34, 0.08], le: [0.63, 0.18], re: [0.37, 0.18] });
const ARMS_UP = { lw: [0.56, 0.02], rw: [0.44, 0.02], le: [0.58, 0.12], re: [0.42, 0.12] };
const kneeUp = (side, arms = {}) => fig({ ...(side === 'L' ? { lk: [0.53, 0.54], la: [0.55, 0.71] } : { rk: [0.47, 0.54], ra: [0.45, 0.71] }), ...arms });

test('the workout: eight moves with knee crunches, about six minutes, solo or two players, paid from 40 reps', () => {
  assert.equal(WORKOUT.plan.length, 8);
  assert.ok(WORKOUT.plan.some(([k]) => k === 'crunch'), 'standing knee crunches');
  assert.equal(workoutSecs(), 355);
  assert.equal(CHALLENGES.workout.secs, workoutSecs());
  assert.ok(TWO_UP.includes('workout'));
  assert.equal(MIN_TO_PAY.workout, 40);
  for (const [k] of WORKOUT.plan) assert.ok(MOVES[k] && MOVES[k].how && MOVES[k].target > 0, k);
  assert.equal(framing('workout', CLOSED.lm).ok, true, 'needs the whole body, like squats');
  assert.equal(framing('workout', fig({}, { hide: ['la', 'ra'] }).lm).ok, false);
});

test('jumping jacks: hands up with the feet out is a rep, back together before the next', () => {
  const c = jacks();
  const frames = []; for (let i = 0; i < 10; i++) frames.push(...hold(CLOSED, 6), ...hold(OPEN, 6));
  assert.equal(run(c, frames).reps, 10);
  const c2 = jacks(), r = run(c2, [...hold(CLOSED, 5), ...hold(ARMS_ONLY, 5)]);
  assert.equal(r.reps, 0, 'arms alone don’t count when the camera sees the feet');
  assert.equal(r.out.at(-1).say, 'Jump your feet out too!');
  const c3 = jacks(), hidden = (f) => ({ ...f, lm: f.lm.map((p, i) => ([27, 28, 31, 32].includes(i) ? { ...p, visibility: 0.05 } : p)) });
  assert.equal(run(c3, [...hold(hidden(CLOSED), 5), ...hold(hidden(ARMS_ONLY), 5), ...hold(hidden(CLOSED), 5), ...hold(hidden(ARMS_ONLY), 5)]).reps, 2, 'feet out of the picture: the arms count');
});

test('standing knee crunches: knee up and the elbows down to it, either knee, each knee once per lift', () => {
  const crunchL = kneeUp('L', { le: [0.55, 0.47], re: [0.47, 0.45], lw: [0.52, 0.3], rw: [0.48, 0.3] });
  const crunchR = kneeUp('R', { le: [0.53, 0.45], re: [0.45, 0.47], lw: [0.52, 0.3], rw: [0.48, 0.3] });
  const up = fig(ARMS_UP);
  const c = kneeCrunch();
  const frames = []; for (let i = 0; i < 6; i++) frames.push(...hold(up, 8), ...hold(i % 2 ? crunchR : crunchL, 8));
  assert.equal(run(c, frames).reps, 6);
  // the knee up with the arms still overhead: no crunch yet
  const c2 = kneeCrunch(), r = run(c2, [...hold(up, 8), ...hold(kneeUp('L', ARMS_UP), 8)]);
  assert.equal(r.reps, 0);
  assert.equal(r.out.at(-1).say, 'Elbows down to your knee!');
  // holding the knee up doesn't keep counting
  assert.equal(run(kneeCrunch(), [...hold(up, 5), ...hold(crunchL, 40)]).reps, 1);
});

test('cross crunches: only the opposite elbow down to the knee counts', () => {
  const same = kneeUp('L', { le: [0.55, 0.47], lw: [0.52, 0.2], re: [0.36, 0.22], rw: [0.45, 0.14] });
  const opposite = kneeUp('L', { re: [0.5, 0.47], rw: [0.47, 0.2], le: [0.64, 0.22], lw: [0.55, 0.14] });
  const behindHead = fig({ le: [0.64, 0.22], re: [0.36, 0.22], lw: [0.55, 0.14], rw: [0.45, 0.14] });
  const c = kneeCrunch({ cross: true });
  const r = run(c, [...hold(behindHead, 6), ...hold(same, 8)]);
  assert.equal(r.reps, 0, 'same side');
  assert.equal(r.out.at(-1).say, 'Right elbow to that knee!');
  assert.equal(run(kneeCrunch({ cross: true }), [...hold(behindHead, 6), ...hold(opposite, 8), ...hold(behindHead, 6), ...hold(opposite, 8)]).reps, 2);
});

test('high knees: every knee up past halfway counts, fast; low knees get "higher"', () => {
  const L = fig({ lk: [0.53, 0.6], la: [0.55, 0.77] }), R = fig({ rk: [0.47, 0.6], ra: [0.45, 0.77] });
  const frames = []; for (let i = 0; i < 20; i++) frames.push(...hold(i % 2 ? R : L, 3), ...hold(CLOSED, 2));
  const r = run(highKnees(), frames);
  assert.equal(r.reps, 20);
  assert.match(r.out.at(-1).say, /Keep it up|Flying/);
  const lowL = fig({ lk: [0.53, 0.66], la: [0.55, 0.83] }), lowR = fig({ rk: [0.47, 0.66], ra: [0.45, 0.83] });
  const low = []; for (let i = 0; i < 8; i++) low.push(...hold(i % 2 ? lowR : lowL, 4), ...hold(CLOSED, 4));
  const r2 = run(highKnees(), low);
  assert.equal(r2.reps, 0);
  assert.equal(r2.out.at(-1).say, 'Knees higher!');
});

test('skater hops: each landing on the other side is a hop; standing still is none', () => {
  const frames = [...hold(CLOSED, 30)]; for (let i = 0; i < 10; i++) frames.push(...hold(fig({}, { dx: i % 2 ? -0.09 : 0.09 }), 15));
  const c = skaters(), r = run(c, frames);
  assert.equal(r.reps, 10);
  assert.ok(c.zone && c.zone.d > 0 && Math.abs(c.zone.x - 0.5) < 0.06, 'the floor marks sit around where you hop');
  assert.equal(run(skaters(), hold(CLOSED, 200)).reps, 0);
});

test('reaction drill: cues once you’re ready; moving the right way in time is a hit, timed; wrong way or late is a miss', () => {
  const pose = { left: fig({}, { dx: 0.1 }), right: fig({}, { dx: -0.1 }), duck: fig({}, { dy: 0.14 }), reach: fig(ARMS_UP) };   // mirrored: picture right is screen left
  const c = reaction({ seed: 7, mirror: true });
  let t = 0, hits = 0, cues = 0, react = null;
  for (let i = 0; i < 900; i++, t += 33) {
    const cue = c.cue;
    const f = cue && t - cue.at > 300 ? pose[cue.kind] : CLOSED;
    const r = c.update({ ...f, t });
    if (r.cue) cues++;
    if (r.hit) { hits++; react = r.hit.ms; }
    assert.ok(!r.miss, 'no misses when you do what it says');
  }
  assert.ok(cues >= 12 && hits === cues - (c.cue ? 1 : 0), `${hits} hits of ${cues} cues`);
  assert.ok(react >= 300 && react < 450, 'timed from the cue');
  assert.equal(c.fastest, Math.min(...c.times));
  // standing still: misses, too slow
  const c2 = reaction({ seed: 7, mirror: true }); let miss = 0;
  for (let i = 0, t2 = 0; i < 300; i++, t2 += 33) if (c2.update({ ...CLOSED, t: t2 }).miss) miss++;
  assert.ok(miss >= 3 && c2.score === 0);
  // the wrong way
  const c3 = reaction({ seed: 3, mirror: true }); let wrong = 0;
  for (let i = 0, t3 = 0; i < 600; i++, t3 += 33) {
    const cue = c3.cue;
    const f = cue && (cue.kind === 'left' || cue.kind === 'right') && t3 - cue.at > 200 ? pose[cue.kind === 'left' ? 'right' : 'left'] : cue && t3 - cue.at > 200 ? pose[cue.kind] : CLOSED;
    const r = c3.update({ ...f, t: t3 });
    if (r.miss && r.miss.wrong) wrong++;
  }
  assert.ok(wrong >= 2, 'stepping the wrong way is a miss');
});

test('burpees: down to the floor, then up with a jump and the hands high', () => {
  const low = fig({ nose: [0.5, 0.5], ls: [0.57, 0.58], rs: [0.43, 0.58], le: [0.6, 0.72], re: [0.4, 0.72], lw: [0.6, 0.86], rw: [0.4, 0.86], lh: [0.55, 0.7], rh: [0.45, 0.7], lk: [0.6, 0.76], rk: [0.4, 0.76] });
  const jump = fig(ARMS_UP, { dy: -0.03 });
  const frames = [...hold(CLOSED, 10)]; for (let i = 0; i < 4; i++) frames.push(...hold(low, 12), ...hold(CLOSED, 4), ...hold(jump, 6), ...hold(CLOSED, 6));
  assert.equal(run(burpees(), frames).reps, 4);
  const r = run(burpees(), [...hold(CLOSED, 10), ...hold(low, 12), ...hold(CLOSED, 10)]);
  assert.equal(r.reps, 0, 'standing back up without the jump');
  assert.equal(r.out.at(-1).say, 'Jump and reach up!');
});

test('the circuit: ready, then each move on its clock with rests, reps added up, done at the end', () => {
  const c = COUNTERS.workout({ seed: 2, mirror: true });
  const starts = [], rests = [];
  let t = 0, done = false;
  for (; t < (workoutSecs() + 2) * 1000; t += 50) {
    const work = c.phase === 'work' ? c.key : null;
    // do jumping jacks during the jacks, squats during the squats, stand still otherwise
    const step = Math.floor(t / 400) % 2;
    const f = work === 'jacks' ? (step ? OPEN : CLOSED) : work === 'squat' ? (step ? fig({ nose: [0.5, 0.28], ls: [0.57, 0.39], rs: [0.43, 0.39], le: [0.6, 0.5], re: [0.4, 0.5], lw: [0.62, 0.45], rw: [0.38, 0.45], lh: [0.55, 0.62], rh: [0.45, 0.62], lk: [0.6, 0.68], rk: [0.4, 0.68] }) : CLOSED) : CLOSED;
    const r = c.update({ ...f, t });
    if (r.start) starts.push(r.start.name);
    if (r.rest) rests.push(r.next.name);
    if (r.done) { done = true; break; }
  }
  assert.equal(done, true);
  assert.ok(Math.abs(t - workoutSecs() * 1000) <= 50);
  assert.deepEqual(starts, WORKOUT.plan.map(([k]) => MOVES[k].name));
  assert.equal(rests.length, 8, 'the ready before the first move and a rest before each of the others');
  assert.equal(rests[0], 'Jumping Jacks');
  assert.ok(c.reps[0] >= 30 && c.reps[0] <= 40, `jacks ${c.reps[0]}`);
  assert.ok(c.reps[3] >= 10, `squats ${c.reps[3]} (logic.mjs's squat counter)`);
  assert.equal(c.score, c.reps.reduce((s, n) => s + n, 0));
  assert.equal(c.update({ ...CLOSED, t: t + 50 }).say, 'Done!');
  assert.equal(workoutRow([25, 3, 0, 15, 0, 0, 0, 5]), '🟩🟨⬛🟩⬛⬛⬛🟩');
  assert.equal(workoutRow([0, 0, 0, 0, 0, 0, 0, 0], true), '⬛⬛⬛⬛⬛⬛⬛⬛⚡');
});

test('two players on one clock: the same moves at the same moments, the same reaction cues', () => {
  const a = COUNTERS.workout({ seed: 9, mirror: true }), b = COUNTERS.workout({ seed: 9, mirror: true });
  const cuesA = [], cuesB = [];
  for (let t = 1000; t < 300000; t += 33) {
    const ra = a.update({ ...CLOSED, t }), rb = b.update({ ...CLOSED, t });
    assert.equal(a.phase + a.station, b.phase + b.station);
    if (ra.cue) cuesA.push(ra.cue); if (rb.cue) cuesB.push(rb.cue);
  }
  assert.ok(cuesA.length >= 5);
  assert.deepEqual(cuesA, cuesB);
});

test('the body measure: picture heights both ways, null without shoulders and hips', () => {
  const B = bodyOf(CLOSED);
  assert.ok(Math.abs(B.torso - 0.26) < 1e-9 && Math.abs(B.shW - 0.105) < 1e-9);
  assert.equal(bodyOf(fig({}, { hide: ['lh', 'rh'] })), null);
});

console.log(`\n${passed} workout tests passed`);
