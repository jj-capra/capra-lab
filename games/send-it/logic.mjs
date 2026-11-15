/* Send It! (JC, Nov 14 2026: "a game called Send It! The game is a vehicle or airworthy vessel of their
   choice is selected and they try to get it as far as possible using their phone motion to not stall or
   take on too much opposing wind or have too much drag. Make the choices funny").
   A homemade flying machine gets pushed off the end of a pier, 30 feet above the water; the player tilts
   the phone to raise or lower the nose. Too steep and it stalls, too flat and drag eats the speed, and
   the wind comes in bands: headwind (red) and tailwind (green) at different heights along the way.
   Everything is in feet and seconds. No DOM here, so the tests can fly it. */

export const PIER = 30;                 // the deck, feet above the water
export const DECK = 60;                 // feet of deck to push on, ending at x = 0 (the edge)
export const PUSH_MS = 3000;            // the run-up: tap PUSH as fast as you can
export const G = 24;                    // gravity, ft/s² (a touch floatier than real, so a flight lasts)

// The contraptions. lift and drag scale the aerodynamics, mass how much the wind and gravity push it
// around, stall the angle of attack (degrees) where the wing gives up, boost the leaf-blower blasts.
export const CRAFTS = [
  { id: 'goat', name: 'G.O.A.T. Glider', emoji: '🐐', blurb: 'The best glider on the pier, according to the goat.', lift: 1.2, drag: 0.85, mass: 0.85, stall: 12, boost: 0, color: '#FFD23F' },
  { id: 'tub', name: 'Flying Bathtub', emoji: '🛁', blurb: 'Heavy and splashy, but it almost never stalls. The duck is co-pilot.', lift: 0.95, drag: 1.25, mass: 1.35, stall: 19, boost: 0, color: '#F3F0FF' },
  { id: 'couch', name: 'Couch Glider', emoji: '🛋️', blurb: 'Enormous wings, enormous drag. Comfy, though.', lift: 1.45, drag: 1.55, mass: 1.15, stall: 14, boost: 0, color: '#E8322E' },
  { id: 'taco', name: 'Taco Wing', emoji: '🌮', blurb: 'Slick and quick. Stalls the second you get greedy.', lift: 1.0, drag: 0.7, mass: 0.95, stall: 9, boost: 0, color: '#FFB627' },
  { id: 'pizza', name: 'Pizza Box Biplane', emoji: '🍕', blurb: 'Light as a feather, so headwinds toss it around.', lift: 1.25, drag: 0.95, mass: 0.6, stall: 13, boost: 0, color: '#C98A4B' },
  { id: 'cart', name: 'Leaf-Blower Cart', emoji: '🛒', blurb: 'Flies like a brick, but tap for one of three leaf-blower blasts.', lift: 0.75, drag: 1.15, mass: 1.1, stall: 16, boost: 3, color: '#29D3F0' },
];
export const craftOf = (id) => CRAFTS.find((c) => c.id === id) || CRAFTS[0];

// The run-up: every tap of PUSH adds speed (a crew of friends shoving it down the deck).
export const launchSpeed = (taps) => 14 + Math.min(26, Math.max(0, taps) * 1.2);

// A seeded random, so a flight's wind can be replayed.
export function seeded(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// The wind: bands of air out over the water, each from x0 to x1 and from y0 to y1 feet up, blowing
// `w` ft/s (more than 0 is a tailwind, less a headwind). Outside the bands it's calm with a light gust.
export function makeWind(seed) {
  const r = seeded(seed), bands = [];
  let x = 25 + r() * 25;
  while (x < 700) {
    const len = 45 + r() * 70, low = r() < 0.5;
    const y0 = low ? 2 + r() * 8 : 18 + r() * 22, y1 = y0 + 12 + r() * 16;
    const tail = r() < 0.48;
    bands.push({ x0: x, x1: x + len, y0, y1, w: (tail ? 1 : -1) * (8 + r() * (tail ? 9 : 12)) });
    x += len + 15 + r() * 55;
  }
  return { bands, gust: r() * 6, at(px, py, t = 0) {
    let w = 1.5 * Math.sin(px / 37 + this.gust) + Math.sin(t * 1.7 + px / 13) * 0.8;
    for (const b of bands) {
      if (px < b.x0 || px > b.x1 || py < b.y0 || py > b.y1) continue;
      // full strength in the middle of a band, easing off at its edges
      const ex = Math.min(px - b.x0, b.x1 - px, 12) / 12, ey = Math.min(py - b.y0, b.y1 - py, 5) / 5;
      w += b.w * Math.min(ex, ey);
    }
    return w;
  } };
}

// Lift and drag for an angle of attack (radians): the lift climbs with the angle until the stall, then
// falls away; drag grows with lift squared, and jumps when the wing is stalled.
const RAD = Math.PI / 180;
export function coeffs(craft, alpha, stalled) {
  const as = craft.stall * RAD;
  let cl;
  if (stalled || alpha > as) cl = (0.25 + 4 * as) * 0.38;
  else cl = Math.max(-0.9, 0.25 + 4 * alpha);
  const cd = 0.11 * craft.drag + 0.06 * cl * cl + (stalled || alpha > as ? 0.45 : 0);
  return { cl, cd };
}

// One flight: push it off the pier at `speed` ft/s, then step(dt, input): input -1 (nose down) to 1 (nose
// up), boost true for a leaf-blower blast. State in feet and seconds.
export const PITCH_UP = 28 * RAD, PITCH_DOWN = 38 * RAD;
export function createFlight(craftId, { speed = 30, seed = 1 } = {}) {
  const craft = craftOf(craftId), wind = makeWind(seed);
  const K = 0.034 * craft.lift / craft.mass;          // lift and drag per (ft/s)² of airspeed
  const s = { x: 0, y: PIER, vx: speed, vy: 0, theta: 0, t: 0, alpha: 0, stalled: false, stallT: 0, stalls: 0, airspeed: speed, wind: 0, cd: 0, cl: 0,
    boosts: craft.boost, boostT: 0, maxY: PIER, splashed: false, distance: 0, headT: 0, tailT: 0 };
  function step(dt, input = 0, boost = false) {
    if (s.splashed) return s;
    dt = Math.min(0.05, dt);
    s.t += dt;
    // the nose follows the tilt; a stall drops it for a moment whatever the player does
    const target = input >= 0 ? input * PITCH_UP : input * PITCH_DOWN;
    if (s.stallT > 0) { s.stallT -= dt; s.theta -= 1.4 * dt; }
    else s.theta += Math.max(-2.6 * dt, Math.min(2.6 * dt, target - s.theta));
    s.theta = Math.max(-60 * RAD, Math.min(45 * RAD, s.theta));
    if (boost && s.boosts > 0 && s.boostT <= 0) { s.boosts--; s.boostT = 0.8; }
    // the air: the craft's speed through it, the angle it meets it at
    const w = wind.at(s.x, s.y, s.t);
    const ax0 = s.vx - w, ay0 = s.vy, V = Math.hypot(ax0, ay0) || 0.001;
    const gamma = Math.atan2(ay0, ax0);
    s.alpha = s.theta - gamma;
    const as = craft.stall * RAD;
    if (!s.stalled && s.alpha > as && V > 6) { s.stalled = true; s.stalls++; s.stallT = 0.7; }
    if (s.stalled && s.alpha < as * 0.6 && s.stallT <= 0) s.stalled = false;
    const { cl, cd } = coeffs(craft, s.alpha, s.stalled);
    s.cl = cl; s.cd = cd;
    const q = K * V * V;
    // lift is square to the air, drag against it
    const ux = ax0 / V, uy = ay0 / V;
    let ax = q * (cl * -uy - cd * ux), ay = q * (cl * ux - cd * uy) - G;
    if (s.boostT > 0) { s.boostT -= dt; ax += Math.cos(s.theta) * 11; ay += Math.sin(s.theta) * 11; }
    s.vx += ax * dt; s.vy += ay * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.airspeed = V; s.wind = w;
    if (w < -3) s.headT += dt; else if (w > 3) s.tailT += dt;
    s.maxY = Math.max(s.maxY, s.y);
    s.distance = Math.max(0, s.x);
    if (s.y <= 0) { s.y = 0; s.splashed = true; }
    if (s.t > 120) s.splashed = true;                 // nobody stays up two minutes
    return s;
  }
  return { craft, wind, state: s, step };
}

// The title a flight earns, by its distance in feet.
export const TITLES = [[0, 'Belly Flop'], [40, 'Pier Plunk'], [80, 'Seagull Status'], [130, 'Pelican Pro'], [180, 'Sky Captain'], [240, 'Pier Legend'], [300, 'SENT IT!']];
export const titleFor = (ft) => TITLES.filter(([d]) => ft >= d).pop()[1];
// The results text's row: a square for every 30 feet out to 300, then the splash.
export function shareRow(ft) {
  const n = Math.max(0, Math.min(10, Math.floor(ft / 30)));
  return '🟦'.repeat(n) + '⬜'.repeat(10 - n) + '🌊';
}
