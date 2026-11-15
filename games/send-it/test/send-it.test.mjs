// Send It!: the contraptions, the flight model, the wind and the scoring.   node games/send-it/test/send-it.test.mjs
import assert from 'node:assert/strict';
import { CRAFTS, craftOf, createFlight, makeWind, launchSpeed, coeffs, titleFor, shareRow, PIER, PITCH_UP, PITCH_DOWN } from '../logic.mjs';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  ', name); };
const R = Math.PI / 180;
function fly(id, pilot, { speed = 34, seed = 7, blastEvery = 0 } = {}) {
  const f = createFlight(id, { speed, seed });
  for (let n = 0; !f.state.splashed && n < 20000; n++) f.step(1 / 120, pilot(f.state, f.craft), blastEvery && n % blastEvery === 0 && n > 120);
  return f.state;
}
// a steady pilot: hold the angle of attack at a share of the stall angle
const holder = (share) => (s, c) => { const want = s.theta - s.alpha + c.stall * R * share; return Math.max(-1, Math.min(1, want >= 0 ? want / PITCH_UP : want / PITCH_DOWN)); };

test('six funny contraptions, each with its numbers', () => {
  assert.equal(CRAFTS.length, 6);
  for (const c of CRAFTS) assert.ok(c.name && c.emoji && c.blurb && c.lift > 0 && c.drag > 0 && c.mass > 0 && c.stall > 0, c.id);
  assert.equal(craftOf('nope').id, CRAFTS[0].id);
  assert.equal(CRAFTS.filter((c) => c.boost).length, 1, 'only the cart has leaf blowers');
  assert.ok(launchSpeed(0) < launchSpeed(10) && launchSpeed(1000) === launchSpeed(22), 'more taps, faster, up to a point');
});

test('it leaves the pier at 30 feet and splashes down out in the water', () => {
  const s = fly('goat', holder(0.75));
  assert.equal(PIER, 30);
  assert.ok(s.splashed && s.y === 0);
  assert.ok(s.distance > 150 && s.distance < 450, `a good glide: ${Math.round(s.distance)} ft`);
  assert.ok(s.t > 6, 'it stays up a while');
});

test('nose up too far stalls it and it drops short; flying smart goes much farther', () => {
  const greedy = fly('goat', () => 1), smart = fly('goat', holder(0.75));
  assert.ok(greedy.stalls >= 1, 'a stall');
  assert.ok(greedy.distance < smart.distance * 0.5, `stalled ${Math.round(greedy.distance)} vs ${Math.round(smart.distance)}`);
  const c = craftOf('goat');
  assert.ok(coeffs(c, c.stall * R * 1.2, false).cl < coeffs(c, c.stall * R * 0.9, false).cl, 'lift falls off past the stall');
  assert.ok(coeffs(c, 0.3, true).cd > coeffs(c, 0.1, false).cd, 'and drag jumps');
});

test('drag matters: the slick ones out-glide the couch with the same pilot', () => {
  const couch = fly('couch', holder(0.75)), taco = fly('taco', holder(0.75));
  assert.ok(taco.distance > couch.distance, `taco ${Math.round(taco.distance)} vs couch ${Math.round(couch.distance)}`);
});

test('a harder push launches farther', () => {
  assert.ok(fly('tub', holder(0.75), { speed: launchSpeed(25) }).distance > fly('tub', holder(0.75), { speed: launchSpeed(2) }).distance);
});

test('the wind comes in bands of headwind and tailwind, the same for a seed', () => {
  const w = makeWind(42), w2 = makeWind(42);
  assert.deepEqual(w.bands, w2.bands);
  assert.ok(w.bands.some((b) => b.w < 0) && w.bands.some((b) => b.w > 0), 'both kinds');
  const tail = w.bands.find((b) => b.w > 0), mid = { x: (tail.x0 + tail.x1) / 2, y: (tail.y0 + tail.y1) / 2 };
  assert.ok(w.at(mid.x, mid.y) > 4, 'inside a tailwind band it pushes you along');
  // a flight's distance depends on its wind
  const spread = [1, 2, 3, 4, 5, 6].map((seed) => fly('pizza', holder(0.75), { seed }).distance);
  assert.ok(Math.max(...spread) - Math.min(...spread) > 20, 'the wind changes the flight');
});

test('the leaf blower: three blasts and no more, and they carry the cart farther', () => {
  const none = fly('cart', holder(0.75)), blasts = fly('cart', holder(0.75), { blastEvery: 240 });
  assert.equal(blasts.boosts, 0);
  assert.ok(blasts.distance > none.distance + 30, `${Math.round(blasts.distance)} vs ${Math.round(none.distance)}`);
  const goat = fly('goat', holder(0.75), { blastEvery: 240 });
  assert.equal(goat.boosts, 0, 'nothing to blast without blowers');
});

test('titles and the results row', () => {
  assert.equal(titleFor(10), 'Belly Flop'); assert.equal(titleFor(150), 'Pelican Pro'); assert.equal(titleFor(320), 'SENT IT!');
  assert.equal(shareRow(95), '🟦🟦🟦⬜⬜⬜⬜⬜⬜⬜🌊');
  assert.equal(shareRow(999), '🟦'.repeat(10) + '🌊');
});

console.log(`\nSend It!: ${passed} tests passed`);
