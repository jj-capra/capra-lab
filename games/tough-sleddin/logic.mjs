// Tough Sleddin: the courses and the sled (JC, Nov 22 2026: "a game like Sled Surfer game with immersive worlds
// a goat traverses on a saucer sled. These are all winter scenes. The user just has left and right arrows at the
// bottom and try to see how far they can make it. Just one life per scene, three scenes and once they have crashed
// in each scene their final score shows."). Pure: no page, no three.js, so the tests run it and the world draws
// from the same numbers.
//
// The world inside is in meters (x across, d down the hill from the start, height y); everything a player sees
// is US measures (JC, Nov 22 2026: "Only US measurements should be used"): the score in feet, speed in mph.
// x, d and y: three.js puts a point at
// (x, y, -d). The track snakes left and right (center(d)), narrows as you go, and drops 0.2 m every meter with
// gentle rolls; past its edge a snowbank rises into the trees. Obstacles come in rows 10 m apart, and every row
// with something in it leaves a gap you can reach from the last one at the speed you'll be going.
//
// Twice as fast since the first day (JC, Nov 22 2026: "Double the speed"): every speed doubled, the sideways push
// raised to match, and the course stretched down the hill (rows, bends, the run-in, how soon it gets hard) so it
// keeps coming at you about as often as before, only faster.

export const ROW = 10;           // meters between rows of obstacles
export const FIRST = 140;        // a clear run-in before the first row
export const SLOPE = 0.2;        // the hill drops this much a meter
export const SLED_R = 0.8;       // the saucer's radius for crashes
export const STEER = 52;         // m/s² of sideways push from an arrow
export const LAT_MAX = 15;       // fastest sideways speed
export const G = 18;             // gravity in the air (a bit floaty: it's a cartoon)
export const RAMP_H = 0.9, RAMP_LEN = 3.6, JUMP_V = 7;   // a jump: off the ramp's lip at 7 m/s up (under a second in the air)
// how long a jump lasts, off a lip h above the snow at vy up (landing back on the snow)
export const airTime = (h, vy) => (vy + Math.sqrt(vy * vy + 2 * G * h)) / G;
export const AIR_T = airTime(RAMP_H, JUMP_V);
export const EDGE = 1.2;         // past the track's edge by this much is the tree line

// What can be in the way: r (crash radius), h (how high you must be flying to clear it; 99: you can't), and
// barriers (logs, fences, crevasses) that run across the track: hd (half their depth down the hill).
export const KINDS = {
  pine: { r: 0.85, h: 99 }, rock: { r: 1.05, h: 1.3 }, stump: { r: 0.6, h: 0.7 }, log: { barrier: true, hd: 0.55, h: 0.9 },
  snowman: { r: 0.75, h: 2.1 }, gifts: { r: 0.85, h: 1.1 }, xmas: { r: 1.0, h: 99 }, lamp: { r: 0.35, h: 99 }, fence: { barrier: true, hd: 0.3, h: 1.2 },
  spire: { r: 0.95, h: 99 }, berg: { r: 1.25, h: 1.7 }, drift: { r: 1.15, h: 0.9 }, crevasse: { barrier: true, hd: 0.9, h: 0.15 },
};

// Things to ride up and fly off: the snow kicker everywhere, and each world's own big jumps (JC, Nov 22 2026: "There
// should be some rooftops and other unique things they can jump"): longer, higher, a harder launch, over a second in
// the air, and the goat spins (world.js). len and h: the ride up (h above the snow at the lip), vy: the launch,
// hw: half its width. Come at a big one from the side where it's already up high and you hit it.
export const JUMPS = {
  ramp: { len: RAMP_LEN, h: RAMP_H, vy: JUMP_V, hw: 2.2, name: 'Ramp' },
  cabin: { len: 7, h: 2.5, vy: 9, hw: 3.3, big: true, name: 'Cabin roof' },       // a log cabin snowed in to its eaves
  trunk: { len: 9, h: 2.2, vy: 8.6, hw: 1.5, big: true, name: 'Log ride' },       // a fallen giant pine propped on a boulder
  roof: { len: 7, h: 2.6, vy: 9.4, hw: 3.4, big: true, name: 'Rooftop' },         // a cottage snowed in to its eaves
  stall: { len: 5.5, h: 2, vy: 8.8, hw: 2.6, big: true, name: 'Market stall' },   // a market stall's snowy lean-to roof
  igloo: { len: 6, h: 2.3, vy: 9, hw: 2.8, big: true, name: 'Igloo' },            // a drift up and over an igloo
  slab: { len: 8, h: 2.4, vy: 9.4, hw: 2.6, big: true, name: 'Ice slab' },        // a tipped-up slab of glacier ice
};

// The three runs, one life each, played in order.
export const SCENES = [
  { id: 'pinewood', name: 'Pinewood Run', emoji: '🌲', time: 'a sunny morning',
    blurb: 'A sunny morning in the snowy pines. Dodge the trees and rocks; hit a snow ramp to fly over the logs.',
    v0: 30, vMax: 68, acc: 0.6, width: 12, narrow: 3.5, dens: [0.3, 0.72], kinds: { pine: 5, rock: 3, stump: 2 }, barrier: 'log', pBarrier: 0.1, pRamp: 0.2, jumps: ['cabin', 'trunk'], pBig: 0.45 },
  { id: 'village', name: 'Lantern Village', emoji: '🏘️', time: 'dusk',
    blurb: 'Down the main street at dusk, lanterns lit. Snowmen, presents and fences everywhere.',
    v0: 32, vMax: 72, acc: 0.64, width: 11, narrow: 3, dens: [0.36, 0.78], kinds: { snowman: 4, gifts: 3, xmas: 3, lamp: 1 }, barrier: 'fence', pBarrier: 0.11, pRamp: 0.2, jumps: ['roof', 'roof', 'stall'], pBig: 0.5 },
  { id: 'glacier', name: 'Aurora Glacier', emoji: '🧊', time: 'night',
    blurb: 'Under the northern lights. Ice spires, crevasses to jump, and slippery ice that slides you sideways.',
    v0: 37, vMax: 82, acc: 0.75, width: 11.5, narrow: 3, dens: [0.32, 0.75], kinds: { spire: 5, berg: 3, drift: 2 }, barrier: 'crevasse', pBarrier: 0.11, pRamp: 0.2, jumps: ['igloo', 'slab'], pBig: 0.45, ice: true },
];

// ---- seeded randomness ----
export function hash(...xs) {
  let h = 2166136261;
  for (const x of xs) { h ^= x >>> 0; h = Math.imul(h, 16777619); h ^= h >>> 13; }
  return h >>> 0;
}
export const rng = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// how fast the sled is going once it has come d meters (speed climbs with time, from v0 to vMax)
export function speedAt(S, d) { return Math.min(S.vMax, Math.sqrt(S.v0 * S.v0 + 2 * S.acc * d)); }

/* A course: one scene with one seed. Rows are made in order as they're needed (each row's gap walks on from the
   last), so the same seed always makes the same run. */
export function makeCourse(seed, sceneIdx) {
  const S = SCENES[sceneIdx];
  const r0 = rng(hash(seed, sceneIdx, 77));
  const P = Array.from({ length: 8 }, () => r0() * Math.PI * 2);
  const rows = [];           // { d, gap (absolute x), obs: [...], ramp }
  const obstacles = [];      // every obstacle, in order down the hill
  const ramps = [], ice = [];
  let lastGap = center(FIRST), lastGapD = 0, lastLand = -99, since = 9, cool = 0, iceUpTo = 0, gapAt = 0;

  // the track: straight at first, curvier as you go
  function center(d) {
    const k = clamp(d / 1200, 0, 1);
    return k * (10 * Math.sin(d / 200 + P[0]) + 4 * Math.sin(d / 88 + P[1]) + 1.5 * Math.sin(d / 52 + P[2]));
  }
  const halfWidth = (d) => S.width - S.narrow * clamp(d / 5000, 0, 1);
  // a ramp of a kind with its foot at d: where it is and how far it flies you (a jump lasts the same time whatever
  // the speed, so the same ramp flies you farther later on); nothing else goes on it until you've landed
  const flights = [];        // [from, to] meters spent in the air after a ramp: you can barely steer there
  function addRamp(kind, foot, x) {
    const J = JUMPS[kind], lip = foot + J.len;
    const ramp = { kind, d: foot, x, hw: J.hw, len: J.len, h: J.h, vy: J.vy, big: !!J.big };
    const fly = speedAt(S, lip) * airTime(J.h, J.vy) + 2;
    ramps.push(ramp); flights.push([lip, lip + fly]); lastLand = lip + fly;
    return ramp;
  }
  // the snow: down the hill, gentle rolls, a bank past the edge rising into the trees
  function bank(e) { return e <= 0 ? 0 : 2.2 * (1 - Math.exp(-e / 3)) + 0.1 * e + 0.6 * Math.sin(e * 0.21 + P[5]) * Math.min(1, e / 12); }
  function height(x, d) {
    const u = Math.abs(x - center(d)) - halfWidth(d);
    return -SLOPE * d + 0.9 * Math.sin(d / 37 + P[3]) + 0.5 * Math.sin(d / 14.3 + P[4]) + bank(u);
  }

  function makeRow(i) {
    const d = FIRST + i * ROW, rr = rng(hash(seed, sceneIdx, i, 5));
    const hw = halfWidth(d), c = center(d);
    const row = { d, gap: null, obs: [], ramp: null };
    rows.push(row);
    const k = clamp(d / 6000, 0, 1), dens = S.dens[0] + (S.dens[1] - S.dens[0]) * k;
    if (cool > 0) { cool--; since++; return; }
    if (rr() > dens) { since++; return; }
    // where the way through is: no farther from the last gap than you can steer before you get there (for a
    // barrier, before its ramp, 14 m sooner)
    const pick = rr(), barrier = d > 450 && since >= 2 && pick < S.pBarrier && d - 14 > lastLand + 8;
    const to = d - (barrier ? 14 : 0);
    let run = to - lastGapD;
    for (const [a, b] of flights) run -= 0.75 * Math.max(0, Math.min(b, to) - Math.max(a, lastGapD));
    const v = speedAt(S, d), reach = Math.min(hw * 2, (Math.max(0, run) / v) * LAT_MAX * 0.5);
    // walked on the ground (not along the track's curve): the track bending doesn't move the way through
    const lim = hw - 2.3;
    const abs = clamp(lastGap + (rr() * 2 - 1) * reach, c - lim, c + lim), gap = abs - c;
    lastGap = abs; lastGapD = d; row.gap = abs;
    if (barrier) {
      // a barrier across the track: a ramp in front of it (on the gap) flies you over; a way round at one edge
      const side = gap > 0 ? -1 : 1, edgeGap = 3.3;
      const x0 = side < 0 ? c - hw + edgeGap : c - hw - 1, x1 = side < 0 ? c + hw + 1 : c + hw - edgeGap;
      const o = { kind: S.barrier, d, x: (x0 + x1) / 2, x0, x1, ...KINDS[S.barrier], s: 1, yaw: 0 };
      row.obs.push(o); obstacles.push(o);
      row.ramp = addRamp('ramp', d - 14, c + gap); row.ramp.barrier = true;
      // nothing in the way of the ramp or just after the barrier
      cool = 2;
      since = 0;
      return;
    }
    // a jump on the way through (its lip just past the row): a snow ramp, or one of the world's big ones
    const bigPick = rr(), kind = d > 350 && bigPick < S.pBig ? S.jumps[Math.floor(rr() * S.jumps.length)] : 'ramp', J = JUMPS[kind];
    let clear = 3.4;
    if (pick < S.pBarrier + S.pRamp && since >= 1 && d + 1.6 - J.len > lastLand + 8) {
      // a big one stays on the snow (inside the edges), as close to the way through as that allows
      const x = J.big ? clamp(c + gap, c - hw + J.hw + 0.3, c + hw - J.hw - 0.3) : c + gap;
      row.ramp = addRamp(kind, d + 1.6 - J.len, x);
      // (and room to go round it on the way through: a lane either side)
      if (J.big) clear = Math.max(clear, Math.abs(x - (c + gap)) + J.hw + 2.6);
    }
    // a scatter of things, never in the gap
    const n = 1 + Math.floor(rr() * (1.4 + 2.6 * k));
    const kinds = Object.entries(S.kinds), total = kinds.reduce((a, [, w]) => a + w, 0);
    for (let tries = 0; tries < n * 6 && row.obs.length < n; tries++) {
      const rel = (rr() * 2 - 1) * (hw - 0.6);
      if (Math.abs(rel - gap) < clear) continue;
      if (row.obs.some((o) => Math.abs(o.x - (c + rel)) < 2.4)) continue;
      let w = rr() * total, kind = kinds[0][0];
      for (const [kk, ww] of kinds) { if ((w -= ww) <= 0) { kind = kk; break; } }
      if (kind === 'lamp' && Math.abs(rel) < hw - 3) kind = 'snowman';      // lamp posts stand near the edges
      const o = { kind, d: d + (rr() - 0.5) * 2, x: c + rel, ...KINDS[kind], s: 0.85 + rr() * 0.35, yaw: rr() * Math.PI * 2 };
      row.obs.push(o); obstacles.push(o);
    }
    since = 0;
  }
  // slippery patches on the glacier (ice slides you: little grip, little drag)
  function makeIce(upTo) {
    while (iceUpTo < upTo) {
      const j = Math.floor(iceUpTo / 150), rr = rng(hash(seed, sceneIdx, j, 9));
      if (S.ice && iceUpTo > 260 && rr() < 0.35 + 0.35 * clamp(iceUpTo / 6000, 0, 1)) {
        const d = iceUpTo + rr() * 66, len = 24 + rr() * 26, hw = halfWidth(d);
        const full = rr() < 0.3, w = full ? hw + 1 : 3 + rr() * 4;
        // never on the way into a jump over a crevasse (you'd slide past its ramp)
        const onRun = ramps.some((r) => r.barrier && d < r.d + r.len && d + len > r.d - 40);
        if (!onRun) ice.push({ d, len, x: center(d) + (full ? 0 : (rr() * 2 - 1) * (hw - w)), hw: w });
      }
      iceUpTo += 150;
    }
  }
  function ensure(d) {
    while (FIRST + rows.length * ROW < d + 400) makeRow(rows.length);
    makeIce(d + 360);      // (behind the rows, so it knows where the crevasse jumps are)
  }
  // things between d0 and d1 (generated as needed)
  function between(list, d0, d1) {
    ensure(d1);
    const out = [];
    for (let i = list.length - 1; i >= 0; i--) { const o = list[i]; if (o.d < d0 - 20) break; if (o.d >= d0 && o.d < d1) out.push(o); }
    return out.reverse();
  }
  return {
    S, seed, scene: sceneIdx, center, halfWidth, height, ensure, rows,
    obstacles: (d0, d1) => between(obstacles, d0, d1),
    ramps: (d0, d1) => between(ramps, d0, d1),
    ice: (d0, d1) => { ensure(d1); return ice.filter((p) => p.d + p.len >= d0 && p.d < d1); },
    rampAt(x, d) { ensure(d); for (let i = ramps.length - 1; i >= 0; i--) { const r = ramps[i]; if (r.d < d - 30) break; if (d >= r.d && d <= r.d + r.len && Math.abs(x - r.x) < r.hw) return r; } return null; },
    onIce(x, d) { ensure(d); for (const p of ice) if (d >= p.d && d <= p.d + p.len && Math.abs(x - p.x) < p.hw) return true; return false; },
    // the next way through at or after d (for the goat that rides by itself behind the menu)
    nextGap(d) {
      ensure(d);
      while (gapAt > 0 && rows[gapAt - 1].d >= d) gapAt--;
      for (let i = gapAt; i < rows.length; i++) { const r = rows[i]; if (r.d < d) { gapAt = i + 1; continue; } if (r.gap != null) return r; }
      return null;
    },
  };
}

// ---- the sled ----
export function newRun(C) {
  return { t: 0, d: 0, x: C.center(0), y: C.height(C.center(0), 0), h: 0, vx: 0, vy: 0, v: C.S.v0, air: false, ramp: null, ice: false, jumps: 0, airTime: 0, crashed: null, jumpedAt: -9, landedAt: -9, big: null, airT: 0 };
}

// One step of dt seconds. input: -1 left, 0, +1 right. Answers the run (changed in place).
export function step(st, input, dt, C) {
  if (st.crashed) return st;
  const S = C.S;
  st.t += dt;
  st.v = Math.min(S.vMax, S.v0 + S.acc * st.t);
  st.d += st.v * dt;
  st.ice = !st.air && C.onIce(st.x, st.d);
  // steering: snappy on snow, a slide on ice, a little in the air
  const grip = st.air ? 0.35 : st.ice ? 0.3 : 1;
  st.vx += input * STEER * grip * dt;
  const drag = st.air ? 0.2 : st.ice ? (input ? 0.12 : 0.3) : (input ? 1.3 : 6);
  st.vx *= Math.exp(-drag * dt);
  st.vx = clamp(st.vx, -LAT_MAX, LAT_MAX);
  st.x += st.vx * dt;
  // h: how high over the snow (riding up a ramp, then flying off its lip; measured from the snow, so a jump
  // lasts the same whatever the hill does under it)
  if (st.air) {
    st.vy -= G * dt; st.h += st.vy * dt; st.airTime += dt;
    if (st.h <= 0) { st.h = 0; st.air = false; st.vy = 0; st.landedAt = st.t; }
  } else {
    const r = st.ramp || C.rampAt(st.x, st.d);
    if (r && Math.abs(st.x - r.x) < r.hw + 0.3) {
      // a big one is ridden from its foot: come at it from the side where it's already up past your knees and you
      // hit its side (lower down you hop on)
      if (!st.ramp && r.big && r.h * (st.d - r.d) / r.len > 0.9) return crash(st, r.kind, r);
      st.ramp = r;
      if (st.d >= r.d + r.len) {
        st.ramp = null; st.air = true; st.vy = r.vy; st.h = r.h; st.jumps++; st.jumpedAt = st.t;
        st.big = r.big ? r.kind : null; st.airT = airTime(r.h, r.vy);
      } else st.h = r.h * Math.max(0, (st.d - r.d) / r.len);
    } else if (st.ramp && st.h > 0.2) {
      // steered off its side on the way up: you drop off it (no snap down to the snow)
      st.ramp = null; st.air = true; st.vy = 0; st.big = null; st.jumpedAt = st.t; st.airT = airTime(st.h, 0);
    } else { st.ramp = null; st.h = 0; }
  }
  st.y = C.height(st.x, st.d) + st.h;
  // the tree line past the snowbank
  if (Math.abs(st.x - C.center(st.d)) > C.halfWidth(st.d) + EDGE) return crash(st, 'trees', null);
  for (const o of C.obstacles(st.d - 3, st.d + 3)) {
    if (st.h > o.h) continue;
    if (o.barrier) {
      if (Math.abs(st.d - o.d) < o.hd + SLED_R * 0.6 && st.x > o.x0 - SLED_R * 0.5 && st.x < o.x1 + SLED_R * 0.5) return crash(st, o.kind, o);
    } else if (Math.hypot(st.x - o.x, st.d - o.d) < o.r * o.s + SLED_R) return crash(st, o.kind, o);
  }
  return st;
}
function crash(st, kind, o) { st.crashed = { kind, o, d: st.d, x: st.x, v: st.v, vx: st.vx, t: st.t }; return st; }
export const FT = 3.28084, MPH = 2.23694;
// the score: feet down the hill
export const feet = (st) => Math.floor((st.crashed ? st.crashed.d : st.d) * FT);

// What you hit, for the card (and a cheeky line).
export const CRASH_WORDS = {
  trees: 'into the trees', pine: 'a pine tree', rock: 'a rock', stump: 'a stump', log: 'a log',
  snowman: 'a snowman', gifts: 'a pile of presents', xmas: 'a Christmas tree', lamp: 'a lamp post', fence: 'a fence',
  spire: 'an ice spire', berg: 'a block of ice', drift: 'a snow drift', crevasse: 'a crevasse',
  cabin: 'the side of a cabin', trunk: 'a giant log', roof: 'the side of a house', stall: 'a market stall', igloo: 'an igloo', slab: 'a slab of ice',
};

// The goat that rides by itself behind the menu: steer for the next way through.
export function botInput(st, C) {
  // (on a ramp, or when the next way through has one: line up with the ramp)
  const row = st.ramp ? null : C.nextGap(st.d + 3);
  const tx = st.ramp ? st.ramp.x : row && row.d - st.d < Math.max(40, st.v * 0.9) ? (row.ramp ? row.ramp.x : row.gap) : C.center(st.d + 28);
  const err = tx - (st.x + st.vx * 0.22);
  return Math.abs(err) < 0.35 ? 0 : Math.sign(err);
}

// ---- the results text (the same group-chat card every lab game uses) ----
// A row a scene: its emoji, a square for every 1,000 ft (ten at most), ⚡ for a new best there.
export function shareRows(results) {
  return results.map((r) => {
    const n = Math.min(10, Math.floor(r.ft / 1000));
    return `${SCENES[r.scene].emoji} ${'🟩'.repeat(n)}${'⬛'.repeat(10 - n)}${r.best ? '⚡' : ''}`;
  });
}
export const fmt = (m) => Math.round(m).toLocaleString('en-US');
