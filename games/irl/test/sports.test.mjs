// IRL's sports games (bowling, QB Throw, free throws, tennis), played with made-up bodies.
//   node games/irl/test/sports.test.mjs
import assert from 'node:assert/strict';
import { bowlScore, bowlNext, bowlSim, rack, bowling, qbThrow, routeAt, isOpen, aimOf, hoops, tennis, HOOPS, LANE, sendIt, makeAir, FLY, flyTitle } from '../sports.mjs';
import { squatter } from './bodies.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  ', name); };
let seed = 5; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// a standing player, both hands set where we want them (picture x, y)
const base = squatter(178, 'front');
function body(hands = {}, dx = 0) {
  const lm = base.lm.map((p) => ({ ...p, x: p.x + dx }));
  for (const [i, xy] of Object.entries(hands)) { lm[i] = { ...lm[i], x: xy[0] + dx, y: xy[1], visibility: 0.95 }; if (+i === 15) lm[19] = { ...lm[19], x: xy[0] + dx, y: xy[1] + 0.01, visibility: 0.95 }; if (+i === 16) lm[20] = { ...lm[20], x: xy[0] + dx, y: xy[1] + 0.01, visibility: 0.95 }; }
  return { lm, world: base.world, aspect: 0.75 };
}
const L = base.lm, hipY = (L[23].y + L[24].y) / 2, shY = (L[11].y + L[12].y) / 2, noseY = L[0].y, noseX = L[0].x;
const restR = [L[16].x, L[16].y], restL = [L[15].x, L[15].y];
function play(counter, frames, from = 0, dt = 33) { let t = from; const out = []; for (const f of frames) { out.push(counter.update({ ...f, t })); t += dt; } return { out, t }; }

test('bowling: frames, strikes, spares and the last frame score like real bowling', () => {
  assert.equal(bowlScore([10, 10, 10, 10, 10, 10, 10], 5).total, 150, 'a perfect five frames');
  const s = bowlScore([7, 3, 10, 9, 0, 0, 0, 5, 5, 6], 5);
  assert.deepEqual(s.frames.map((f) => f.score), [20, 39, 48, 48, 64]);
  assert.deepEqual(s.frames[0].marks, ['7', '/']);
  assert.deepEqual(s.frames[1].marks, ['X']);
  assert.deepEqual(s.frames[4].marks, ['5', '/', '6']);
  assert.equal(s.done, true);
  assert.deepEqual(bowlScore([0, 10, 0, 0], 2).frames[0].marks, ['-', '/'], 'ten on the second ball is a spare, not a strike');
  // a strike waits for its two bonus balls before it counts
  const open = bowlScore([10, 4], 5);
  assert.equal(open.frames[0].score, null); assert.equal(open.total, 0);
  // what comes next: the second ball of a frame keeps the pins, a strike racks fresh, the last frame's bonus balls
  assert.deepEqual(bowlNext([], 5), { frame: 1, ball: 1, fresh: true, done: false });
  assert.deepEqual(bowlNext([7], 5), { frame: 1, ball: 2, fresh: false, done: false });
  assert.deepEqual(bowlNext([10], 5), { frame: 2, ball: 1, fresh: true, done: false });
  assert.deepEqual(bowlNext([10, 10, 10, 10, 10], 5), { frame: 5, ball: 2, fresh: true, done: false });
  assert.deepEqual(bowlNext([10, 10, 10, 10, 3, 7], 5), { frame: 5, ball: 3, fresh: true, done: false });
  assert.equal(bowlNext([10, 10, 10, 10, 3, 4], 5).done, true);
});

test('bowling: the pins fall like pins (the pocket strikes, the edge leaves some, the gutter none)', () => {
  const run = (roll) => bowlSim(roll, rack()).run();
  assert.equal(run({ x0: 0.05, speed: 8.5, angle: 0, hook: 0 }).downCount(), 10, 'the pocket at speed');
  const edge = run({ x0: 0.38, speed: 7.5, angle: 0, hook: 0 }).downCount();
  assert.ok(edge > 0 && edge < 10, 'the edge of the lane clips a few');
  const g = run({ x0: 0.4, speed: 7, angle: 0.03, hook: 0 });
  assert.equal(g.downCount(), 0); assert.ok(g.ball.gutter, 'into the gutter');
  // the second ball only sees the pins left standing
  const first = run({ x0: 0.3, speed: 7.5, angle: 0, hook: 0 }), left = first.standing();
  assert.equal(left.length, 10 - first.downCount());
  const second = bowlSim({ x0: left[0].x, speed: 7.5, angle: 0, hook: 0 }, left).run();
  assert.ok(second.downCount() >= 1 && second.downCount() <= left.length);
});

test('bowling: an arm swing rolls the ball, and a whole game plays out', () => {
  const c = bowling({ frames: 5 });
  let t = 0;
  const step = (f, n = 1) => { let r; for (let i = 0; i < n; i++) { r = c.update({ ...f, t }); t += 33; } return r; };
  // standing still: nothing rolls
  step(body(), 20);
  assert.equal(c.phase, 'ready');
  let games = 0, rolled = 0;
  while (!c.next.done && games < 40) {
    games++;
    step(body({ 16: [restR[0], hipY + 0.06] }), 4);                         // the hand swings down past the hip
    let r = null;
    for (const y of [hipY - 0.02, hipY - 0.08, hipY - 0.14, hipY - 0.2, shY]) { r = step(body({ 16: [restR[0], y] })); if (c.phase === 'rolling') break; }
    assert.equal(c.phase, 'rolling', 'the forward swing rolls it');
    rolled++;
    let res = null;
    for (let i = 0; i < 400 && c.phase === 'rolling'; i++) { const o = step(body()); if (o.rolled) res = o; }
    assert.ok(res && res.rolled.down >= 0, 'the roll comes back with pins down');
    step(body(), 50);                                                         // the sweep
  }
  assert.equal(c.next.done, true);
  assert.ok(rolled >= 6 && rolled <= 11, `five frames take 6 to 11 balls (${rolled})`);
  assert.equal(c.score, c.card.total);
  assert.ok(c.score > 0);
});

test('bowling: where you stand is where the ball leaves the foul line', () => {
  const c = bowling({ frames: 5 });
  c.update({ ...body({}, -0.2), t: 0 });
  const left = c.aim;
  c.update({ ...body({}, 0.2), t: 33 });
  assert.ok(left < -0.1 && c.aim > 0.1, 'moving across the picture moves the ball across the lane');
  const m = bowling({ frames: 5, mirror: true });
  m.update({ ...body({}, -0.2), t: 0 });
  assert.ok(m.aim > 0.1, 'mirrored, the picture\'s left is the screen\'s right');
  assert.ok(Math.abs(c.aim) <= LANE.w / 2);
});

test('QB Throw: routes, the open man, aim, the throw, the catch and the sack', () => {
  // the slant breaks first, the go comes open last
  const sl = { kind: 'slant', x: -8 }, go = { kind: 'go', x: -14 };
  assert.ok(isOpen(sl, 1.2) && !isOpen(go, 1.2) && isOpen(go, 3) && !isOpen(sl, 3));
  assert.ok(routeAt(sl, 2).x > -8, 'the slant cuts inside');
  assert.ok(routeAt(go, 3).z > 20, 'the go runs deep');
  assert.ok(aimOf({ x: -10, z: 10 }) < 0 && aimOf({ x: 10, z: 10 }) > 0);
  const c = qbThrow({ rand });
  let t = 0;
  const step = (f, n = 1) => { let r; for (let i = 0; i < n; i++) { r = c.update({ ...f, t }); t += 33; } return r; };
  step(body(), 40);
  assert.ok(c.play, 'a play is called');
  // wait for the snap, then hold the ball up and find the open receiver
  while (c.since(t) < 0.9) step(body());
  const s = c.since(t), target = c.play.recv.find((r) => isOpen(r, s + 0.6)) || c.play.recv[0];
  const want = aimOf(routeAt(target, s + 0.15));
  const sw = Math.abs(L[11].x - L[12].x);
  const handX = noseX + want * sw * 1.5;
  step(body({ 16: [handX, noseY - 0.08] }), 6);
  assert.ok(c.lock, 'the target locks onto a receiver');
  // throw: the hand comes down hard
  let threw = null;
  for (const y of [noseY + 0.02, noseY + 0.12, shY + 0.1]) { const r = step(body({ 16: [handX, y] })); if (r.threw) threw = r; }
  assert.ok(threw, 'the throw is seen');
  let done = null;
  for (let i = 0; i < 120 && !done; i++) { const r = step(body()); if (r.caught || r.incomplete || r.picked) done = r; }
  assert.ok(done, 'the ball comes down');
  assert.equal(c.atts, 1);
  // no throw at all: sacked
  const d = qbThrow({ rand });
  let u = 0, sacked = false;
  for (let i = 0; i < 400 && !sacked; i++) { const r = d.update({ ...body(), t: u }); u += 33; if (r.sacked) sacked = true; }
  assert.ok(sacked && d.sacks === 1);
});

test('QB Throw: a hard throw to an open receiver is a completion for yards', () => {
  let completions = 0;
  for (let k = 0; k < 12; k++) {
    seed = 11 + k;
    const c = qbThrow({ rand });
    let t = 0;
    const step = (f) => { const r = c.update({ ...f, t }); t += 33; return r; };
    for (let i = 0; i < 40; i++) step(body());
    while (c.since(t) < 1.0) step(body());
    const s = c.since(t), target = c.play.recv.find((r) => r.kind === 'slant');
    const sw = Math.abs(L[11].x - L[12].x), handX = noseX + aimOf(routeAt(target, s + 0.15)) * sw * 1.5;
    for (let i = 0; i < 5; i++) step(body({ 16: [handX, noseY - 0.08] }));
    for (const y of [noseY + 0.04, noseY + 0.16, shY + 0.14]) step(body({ 16: [handX, y] }));
    for (let i = 0; i < 90; i++) { const r = step(body()); if (r.caught) { completions++; break; } if (r.incomplete || r.picked) break; }
  }
  assert.ok(completions >= 6, `most quick slants are caught (${completions}/12)`);
});

test('free throws: a smooth medium push goes in, too soft falls short, off to the side misses', () => {
  const shoot = (up, dx = 0) => {
    const c = hoops({ rand: () => 0.5 });
    let t = 0;
    const step = (f) => { const r = c.update({ ...f, t }); t += 33; return r; };
    const hx = noseX + dx;
    for (let i = 0; i < 5; i++) step(body({ 15: [hx - 0.02, shY + 0.05], 16: [hx + 0.02, shY + 0.05] }));
    let y = shY + 0.05, out = null;
    for (let i = 0; i < 8 && !out; i++) { y -= up * 0.033; const r = step(body({ 15: [hx - 0.02, y], 16: [hx + 0.02, y] })); if (r.shot) out = r.shot; }
    assert.ok(out, 'the shot goes up');
    let res = null;
    for (let i = 0; i < 60 && !res; i++) { const r = step(body()); if (r.made || r.miss) res = r; }
    return { shot: out, res, c };
  };
  const mid = HOOPS.up + (HOOPS.full - HOOPS.up) * HOOPS.sweet;
  const good = shoot(mid);
  assert.ok(good.res.made, 'right in the sweet spot');
  assert.equal(good.c.score, 1);
  const soft = shoot(HOOPS.up + 0.05);
  assert.ok(soft.res.miss && soft.shot.kind === 'short', 'a soft push is short');
  const wide = shoot(mid, 0.12);
  assert.ok(wide.res.miss, 'hands way off to the side miss');
});

test('tennis: swing as the ball arrives to return it, early goes cross-court; a whiff ends the rally', () => {
  const c = tennis({ rand });
  let t = 0;
  const step = (f) => { const r = c.update({ ...f, t }); t += 16; return r; };
  for (let i = 0; i < 80 && !c.ball; i++) step(body());
  assert.ok(c.ball, 'a ball is fed');
  const arrive = c.ball.arrive;
  while (t < arrive - 90) step(body({ 16: [restR[0] + 0.1, hipY - 0.05], 15: [restR[0] + 0.1, hipY - 0.05] }));
  let hit = null;
  for (let i = 0; i < 24 && !hit; i++) { const x = restR[0] + 0.1 - i * 0.05; const r = step(body({ 16: [x, hipY - 0.05], 15: [x, hipY - 0.05] })); if (r.hit) hit = r.hit; }
  assert.ok(hit, 'the swing returns it');
  assert.ok(c.score >= 1 && c.returns === 1);
  // the next ball comes back; stand still and it goes by
  let missed = false;
  for (let i = 0; i < 400 && !missed; i++) { const r = step(body()); if (r.miss) missed = true; }
  assert.ok(missed, 'no swing is a miss');
  assert.equal(c.rally, 0);
});

test('Send It!: flaps push it off, side to side steers, updrafts lift, the splash ends it', () => {
  // the same seed is the same sky (two players fly the same course)
  assert.deepEqual(makeAir(9).zones.slice(0, 5), makeAir(9).zones.slice(0, 5));
  const air = makeAir(9);
  assert.ok(air.zones.some((q) => q.kind === 'up') && air.zones.some((q) => q.kind === 'down'));
  const up = air.zones.find((q) => q.kind === 'up');
  assert.equal(air.at(up.x, (up.z0 + up.z1) / 2), up);
  assert.equal(air.at(up.x + up.r + 5, (up.z0 + up.z1) / 2) === up, false);
  const cx0 = (L[11].x + L[12].x) / 2;
  const stand = (u, extra = {}) => body(extra, u - cx0);
  const fly = (steerToUpdrafts, flaps) => {
    const c = sendIt({ seed: 4 });
    let t = 0;
    while (c.phase !== 'done' && t < 400000) {
      const s = c.state;
      let u = 0.5, hands = {};
      if (s.phase === 'push' && flaps) { const y = shY + (Math.floor(t / 200) % 2 ? 0.12 : -0.05); hands = { 15: [L[15].x, y], 16: [L[16].x, y] }; }
      if (s.phase === 'fly' && steerToUpdrafts) { const nx = c.air.at(s.x, s.z) || c.air.next(s.z); if (nx && nx.z0 - s.z < 300) u = 0.5 + nx.x / (2 * FLY.half * 1.3); }
      c.update({ ...stand(u, hands), t }); t += 33;
    }
    return c;
  };
  const lazy = fly(false, false), pilot = fly(true, true);
  assert.equal(lazy.pumps, 0); assert.ok(pilot.pumps >= 5, 'flapping counts');
  assert.ok(pilot.state.speed > lazy.state.speed, 'flaps launch it faster');
  assert.ok(pilot.ups > lazy.ups && pilot.score > lazy.score * 1.8, `riding the updrafts goes much farther (${pilot.score} vs ${lazy.score} ft)`);
  assert.equal(pilot.phase, 'done'); assert.equal(pilot.alt, 0, 'it ends in the water');
  // stepping across your part of the screen steers it across the water
  const c = sendIt({ seed: 4 });
  let t = 0;
  for (let i = 0; i < 120; i++) { c.update({ ...stand(0.5), t }); t += 33; }
  for (let i = 0; i < 60; i++) { c.update({ ...stand(0.75), t }); t += 33; }
  assert.ok(c.state.x > 10, 'stepping right flies right');
  const m = sendIt({ seed: 4, mirror: true });
  t = 0;
  for (let i = 0; i < 120; i++) { m.update({ ...stand(0.5), t }); t += 33; }
  for (let i = 0; i < 60; i++) { m.update({ ...stand(0.75), t }); t += 33; }
  assert.ok(m.state.x < -10, 'mirrored, the picture\'s right is the screen\'s left');
  assert.equal(flyTitle(0), 'Belly Flop'); assert.equal(flyTitle(2600), 'SENT IT!');
});

console.log(`\nIRL sports: ${passed} tests passed`);
