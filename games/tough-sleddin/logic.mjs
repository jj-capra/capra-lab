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
// gentle rolls; past its edge a snowbank rises into the trees. Obstacles come in rows 6 m apart, and every row
// with something in it leaves a gap you can reach from the last one at the speed you'll be going.

export const ROW = 6;            // meters between rows of obstacles
export const FIRST = 70;         // a clear run-in before the first row
export const SLOPE = 0.2;        // the hill drops this much a meter
export const SLED_R = 0.8;       // the saucer's radius for crashes
export const STEER = 34;         // m/s² of sideways push from an arrow
export const LAT_MAX = 11;       // fastest sideways speed
export const G = 18;             // gravity in the air (a bit floaty: it's a cartoon)
export const RAMP_H = 0.9, RAMP_LEN = 3.6, JUMP_V = 7;   // a jump: off the ramp's lip at 7 m/s up (under a second in the air)
export const EDGE = 1.2;         // past the track's edge by this much is the tree line

// What can be in the way: r (crash radius), h (how high you must be flying to clear it; 99: you can't), and
// barriers (logs, fences, crevasses) that run across the track: hd (half their depth down the hill).
export const KINDS = {
  pine: { r: 0.85, h: 99 }, rock: { r: 1.05, h: 1.3 }, stump: { r: 0.6, h: 0.7 }, log: { barrier: true, hd: 0.55, h: 0.9 },
  snowman: { r: 0.75, h: 2.1 }, gifts: { r: 0.85, h: 1.1 }, xmas: { r: 1.0, h: 99 }, lamp: { r: 0.35, h: 99 }, fence: { barrier: true, hd: 0.3, h: 1.2 },
  spire: { r: 0.95, h: 99 }, berg: { r: 1.25, h: 1.7 }, drift: { r: 1.15, h: 0.9 }, crevasse: { barrier: true, hd: 0.9, h: 0.15 },
};

// The three runs, one life each, played in order.
export const SCENES = [
  { id: 'pinewood', name: 'Pinewood Run', emoji: '🌲', time: 'a sunny morning',
    blurb: 'A sunny morning in the snowy pines. Dodge the trees and rocks; hit a snow ramp to fly over the logs.',
    v0: 15, vMax: 34, acc: 0.3, width: 12, narrow: 3.5, dens: [0.3, 0.72], kinds: { pine: 5, rock: 3, stump: 2 }, barrier: 'log', pBarrier: 0.1, pRamp: 0.07 },
  { id: 'village', name: 'Lantern Village', emoji: '🏘️', time: 'dusk',
    blurb: 'Down the main street at dusk, lanterns lit. Snowmen, presents and fences everywhere.',
    v0: 16, vMax: 36, acc: 0.32, width: 11, narrow: 3, dens: [0.36, 0.78], kinds: { snowman: 4, gifts: 3, xmas: 3, lamp: 1 }, barrier: 'fence', pBarrier: 0.11, pRamp: 0.08 },
  { id: 'glacier', name: 'Aurora Glacier', emoji: '🧊', time: 'night',
    blurb: 'Under the northern lights. Ice spires, crevasses to jump, and slippery ice that slides you sideways.',
    v0: 17, vMax: 38, acc: 0.34, width: 11.5, narrow: 3, dens: [0.32, 0.75], kinds: { spire: 5, berg: 3, drift: 2 }, barrier: 'crevasse', pBarrier: 0.11, pRamp: 0.07, ice: true },
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
  let lastGap = center(FIRST), lastGapD = 0, lastRampD = -99, since = 9, cool = 0, iceUpTo = 0, gapAt = 0;
  const flights = [];        // [from, to] meters spent in the air after a ramp: you can barely steer there

  // the track: straight at first, curvier as you go
  function center(d) {
    const k = clamp(d / 600, 0, 1);
    return k * (10 * Math.sin(d / 120 + P[0]) + 4 * Math.sin(d / 53 + P[1]) + 1.5 * Math.sin(d / 31 + P[2]));
  }
  const halfWidth = (d) => S.width - S.narrow * clamp(d / 2500, 0, 1);
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
    const k = clamp(d / 3000, 0, 1), dens = S.dens[0] + (S.dens[1] - S.dens[0]) * k;
    if (cool > 0) { cool--; since++; return; }
    if (rr() > dens) { since++; return; }
    // where the way through is: no farther from the last gap than you can steer before you get there (for a
    // barrier, before its ramp, 14 m sooner)
    const pick = rr(), barrier = d > 260 && since >= 2 && pick < S.pBarrier && d - 14 - lastRampD > 32;
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
      const ramp = { d: d - 14, x: c + gap, hw: 2.3 };
      row.ramp = ramp; ramps.push(ramp); lastRampD = ramp.d; flights.push([ramp.d + RAMP_LEN, ramp.d + RAMP_LEN + 32]);
      // nothing in the way of the ramp or just after the barrier
      cool = 2;
      since = 0;
      return;
    }
    if (pick < S.pBarrier + S.pRamp && since >= 2 && d - 2 - lastRampD > 32) {
      const ramp = { d: d - 2, x: c + gap, hw: 2.1 };
      row.ramp = ramp; ramps.push(ramp); lastRampD = ramp.d; flights.push([ramp.d + RAMP_LEN, ramp.d + RAMP_LEN + 32]);
    }
    // a scatter of things, never in the gap
    const n = 1 + Math.floor(rr() * (1.4 + 2.6 * k));
    const kinds = Object.entries(S.kinds), total = kinds.reduce((a, [, w]) => a + w, 0);
    for (let tries = 0; tries < n * 6 && row.obs.length < n; tries++) {
      const rel = (rr() * 2 - 1) * (hw - 0.6);
      if (Math.abs(rel - gap) < 3.4) continue;
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
      const j = Math.floor(iceUpTo / 90), rr = rng(hash(seed, sceneIdx, j, 9));
      if (S.ice && iceUpTo > 150 && rr() < 0.35 + 0.35 * clamp(iceUpTo / 3000, 0, 1)) {
        const d = iceUpTo + rr() * 40, len = 14 + rr() * 16, hw = halfWidth(d);
        const full = rr() < 0.3, w = full ? hw + 1 : 3 + rr() * 4;
        ice.push({ d, len, x: center(d) + (full ? 0 : (rr() * 2 - 1) * (hw - w)), hw: w });
      }
      iceUpTo += 90;
    }
  }
  function ensure(d) {
    while (FIRST + rows.length * ROW < d + 220) makeRow(rows.length);
    makeIce(d + 260);
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
    rampAt(x, d) { ensure(d); for (const r of ramps) if (d >= r.d && d <= r.d + RAMP_LEN && Math.abs(x - r.x) < r.hw) return r; return null; },
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
  return { t: 0, d: 0, x: C.center(0), y: C.height(C.center(0), 0), h: 0, vx: 0, vy: 0, v: C.S.v0, air: false, ramp: null, ice: false, jumps: 0, airTime: 0, crashed: null, jumpedAt: -9, landedAt: -9 };
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
      st.ramp = r;
      if (st.d >= r.d + RAMP_LEN) { st.ramp = null; st.air = true; st.vy = JUMP_V; st.h = RAMP_H; st.jumps++; st.jumpedAt = st.t; }
      else st.h = RAMP_H * Math.max(0, (st.d - r.d) / RAMP_LEN);
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
};

// The goat that rides by itself behind the menu: steer for the next way through.
export function botInput(st, C) {
  const row = C.nextGap(st.d + 3);
  const tx = row && row.d - st.d < 40 ? row.gap : C.center(st.d + 14);
  const err = tx - (st.x + st.vx * 0.32);
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
