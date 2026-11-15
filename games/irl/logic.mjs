/* IRL: real moves in front of the phone's camera (JC, Nov 14 2026: "an IRL game that has different
   challenges like dribbling a basketball and reaching out and touching targets that appear... pushups.
   Wall sits. Squats etc. this earns more Amber and other loot").
   The camera picture stays on the phone: MediaPipe's pose model finds 33 body points a frame
   ({ x, y } from 0 to 1 across and down the picture, plus `visibility`), and this file turns those
   points into reps, holds, hits and dribbles. No camera here, so the tests can feed it made-up bodies. */

// The body points MediaPipe numbers (its 33-point pose).
export const P = { NOSE: 0, LS: 11, RS: 12, LE: 13, RE: 14, LW: 15, RW: 16, LI: 19, RI: 20, LH: 23, RH: 24, LK: 25, RK: 26, LA: 27, RA: 28 };
// The lines of the stick figure drawn over the camera (no face: it looks better without).
export const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [15, 19], [16, 20], [27, 31], [28, 32]];

export const CHALLENGES = {
  squat: {
    name: 'Squats', emoji: '🦵', secs: 60, goal: 20, unit: 'rep', units: 'reps', color: '#FFD23F',
    blurb: 'As many as you can in a minute.',
    setup: 'Prop your phone up 6 to 8 feet away, facing you, so it sees all of you from head to feet.',
    how: 'Sit back like there’s a chair behind you until your thighs are level, then stand all the way up. A rep counts when you stand.',
  },
  pushup: {
    name: 'Push-ups', emoji: '💪', secs: 60, goal: 15, unit: 'rep', units: 'reps', color: '#FF7A59',
    blurb: 'As many as you can in a minute.',
    setup: 'Stand your phone on the floor 4 to 6 feet off to your side, so it sees you side-on from head to feet.',
    how: 'Body straight like a plank. Lower until your elbows bend past a right angle, then push all the way up. A rep counts at the top.',
  },
  wallsit: {
    name: 'Wall Sit', emoji: '🧱', secs: 180, goal: 60, unit: 'second', units: 'seconds', color: '#B79CFF',
    blurb: 'Hold it as long as you can (3 minutes tops).',
    setup: 'Phone 6 to 8 feet away and side-on to you, so it sees you from head to feet against the wall.',
    how: 'Back flat on the wall, slide down until your knees are bent like you’re sitting in a chair. The clock runs while you hold it; stand up and it stops.',
  },
  targets: {
    name: 'Target Smash', emoji: '🎯', secs: 45, goal: 25, unit: 'target', units: 'targets', color: '#29D3F0',
    blurb: 'Smack the targets that pop up around you.',
    setup: 'Phone at chest height 5 to 7 feet away, facing you, so it sees you from head to waist with room to reach.',
    how: 'Targets pop up on the screen around you. Reach out and hit each one with a hand before it fades. Hits in a row build a combo.',
  },
  dribble: {
    name: 'Dribble Drill', emoji: '🏀', secs: 30, goal: 40, unit: 'dribble', units: 'dribbles', color: '#5BE38A',
    blurb: 'Pound the ball for 30 seconds.',
    setup: 'Phone 8 to 10 feet away, facing you, so it sees you from head to knees, dribbling hand and all.',
    how: 'Dribble hard and low. The camera follows your dribbling hand: every bounce of your hand down and back up is one dribble.',
  },
  // JC, Nov 14 2026: "defend a soccer goal"
  keeper: {
    name: 'Goalkeeper', emoji: '🧤', secs: 45, goal: 12, unit: 'save', units: 'saves', color: '#FF3D8B',
    blurb: 'Shots fly at your goal. Stop them.',
    setup: 'Phone at waist height 7 to 9 feet away, facing you, so it sees you from head to feet with room to dive both ways.',
    how: 'You’re in goal. Shots come at you high, low, left and right, and get faster. Get a hand (or a foot, for the low ones) on the ball before it reaches you.',
  },
  // JC, Nov 14 2026: "a game that cuts flying avocados and the more slices per avocado as they fall the
  // points triple for each consecutive cut"
  avocado: {
    name: 'Avocado Chop', emoji: '🥑', secs: 45, goal: 250, unit: 'point', units: 'points', color: '#9BE564',
    blurb: 'Slice the flying avocados. Every extra cut triples.',
    setup: 'Phone at chest height 5 to 7 feet away, facing you, so it sees you from head to waist with room to swing.',
    how: 'Avocados fly up in front of you. Swipe your hands through them fast. The first cut on an avocado is 1 point, then 3, 9, 27 and 81 for each cut on the same one before it falls. Don’t chop the chili peppers.',
  },
  // JC, Nov 14 2026: "a baseball game where you swing at rapid balls and you are hitting them into silos
  // with different point values. Like a home run derby but more like skeeball"
  derby: {
    name: 'Silo Derby', emoji: '⚾', secs: 60, goal: 300, unit: 'point', units: 'points', color: '#FFB627',
    blurb: 'Crush pitches into the silos. Skee-ball scoring.',
    setup: 'Phone at chest height 7 to 9 feet away, facing you, so it sees you from head to knees with room to swing.',
    how: 'Pitches come right at you, faster and faster. Swing your hands through like you’re holding a bat as the ball gets to you. Swing hard to reach the back silos (100 in the corners, 50 in the middle); a softer hit lands in the front row (10 to 30). Swing early to pull it into a corner, late to go the other way.',
  },
};
export const ORDER = ['squat', 'pushup', 'wallsit', 'targets', 'dribble', 'keeper', 'avocado', 'derby'];
export const MIN_TO_PAY = { squat: 3, pushup: 3, wallsit: 10, targets: 3, dribble: 10, keeper: 3, avocado: 10, derby: 30 };

const seen = (p, min = 0.5) => !!p && (p.visibility == null || p.visibility >= min);
// The angle at b (degrees). With 3D points (MediaPipe's world landmarks, in meters) it's the true
// angle whichever way the player faces the phone; with picture points x is stretched by the picture's
// width over height so the angle is at least true on screen.
export function angle(a, b, c, aspect = 1) {
  const ax = (a.x - b.x) * aspect, ay = a.y - b.y, az = (a.z ?? 0) - (b.z ?? 0);
  const cx = (c.x - b.x) * aspect, cy = c.y - b.y, cz = (c.z ?? 0) - (b.z ?? 0);
  const d = Math.hypot(ax, ay, az) * Math.hypot(cx, cy, cz);
  if (!d) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, (ax * cx + ay * cy + az * cz) / d))) * 180) / Math.PI;
}
// A frame: { lm, world, t, aspect }. Angles use `world` (3D, so facing the phone or side-on both work)
// and fall back to the picture points; visibility always comes from the picture points.
function joints(f, ids) {
  const lm = f.lm || [], w = f.world;
  if (!ids.every((i) => seen(lm[i]))) return null;
  return w && ids.every((i) => w[i]) ? { pts: ids.map((i) => w[i]), aspect: 1 } : { pts: ids.map((i) => lm[i]), aspect: f.aspect || 1 };
}
function jointAngle(f, a, b, c) { const j = joints(f, [a, b, c]); return j ? angle(j.pts[0], j.pts[1], j.pts[2], j.aspect) : null; }
// The side of the body the camera sees better (side-on, one arm or leg hides the other).
function sideOf(lm, ids) {
  const score = (s) => ids[s].reduce((n, i) => n + ((lm[i] && lm[i].visibility) ?? 1), 0);
  return score(0) >= score(1) ? ids[0] : ids[1];
}
const LEG = [[P.LH, P.LK, P.LA], [P.RH, P.RK, P.RA]];
const ARM = [[P.LS, P.LE, P.LW], [P.RS, P.RE, P.RW]];
export function kneeAngle(f) {
  const got = LEG.map(([h, k, a]) => jointAngle(f, h, k, a)).filter((x) => x != null);
  return got.length ? got.reduce((s, x) => s + x, 0) / got.length : null;
}
export function elbowAngle(f) {
  const [s, e, w] = sideOf(f.lm || [], ARM);
  return jointAngle(f, s, e, w);
}
// Whether the camera can see what a challenge needs, and what to tell the player if not.
export function framing(kind, lm) {
  if (!lm) return { ok: false, say: 'Step into the picture' };
  const any = (ids) => ids.some((i) => seen(lm[i], 0.6));
  if (!any([P.LS, P.RS])) return { ok: false, say: 'We can’t see your shoulders' };
  if (kind === 'targets' || kind === 'keeper' || kind === 'avocado' || kind === 'derby') return any([P.LW, P.RW]) ? { ok: true, say: 'Ready' } : { ok: false, say: 'Show us your hands' };
  if (kind === 'dribble') {
    if (!any([P.LH, P.RH])) return { ok: false, say: 'Step back: we can’t see your hips' };
    return any([P.LW, P.RW]) ? { ok: true, say: 'Ready' } : { ok: false, say: 'Show us your dribbling hand' };
  }
  if (!any([P.LH, P.RH])) return { ok: false, say: 'Step back: we can’t see your hips' };
  if (!any([P.LK, P.RK])) return { ok: false, say: 'Step back: we can’t see your knees' };
  if (!any([P.LA, P.RA])) return { ok: false, say: 'Step back: we can’t see your feet' };
  return { ok: true, say: 'Ready' };
}

/* Each counter's update(frame) answers { rep } when one counts, plus `say` for the coach line and
   `meter` (0 to 1) for the gauge. */

// Squats: down when the knees bend under 105° or the hips drop more than half a thigh below where
// they stand; a rep when the player stands back up (knees past 148° and hips back up).
export function squats() {
  let down = false, reps = 0, ema = null, last = -1e9, downAt = 0, thigh = 0, low = 180;
  return {
    get score() { return reps; },
    update(f) {
      const lm = f.lm || [], t = f.t;
      const k = kneeAngle(f);
      // how far the hips have dropped toward the knees, against the longest thigh seen standing
      const legs = [[P.LH, P.LK], [P.RH, P.RK]].filter(([h, kn]) => seen(lm[h]) && seen(lm[kn]));
      let drop = null;
      if (legs.length) {
        const gap = legs.reduce((sum, [h, kn]) => sum + (lm[kn].y - lm[h].y), 0) / legs.length;
        thigh = Math.max(thigh * 0.999, gap);
        drop = thigh > 0.02 ? Math.max(0, 1 - gap / thigh) : null;
      }
      if (k == null && drop == null) return { say: 'We can’t see your legs' };
      ema = k == null ? ema : ema == null ? k : ema * 0.45 + k * 0.55;
      const bend = Math.max(ema != null ? (172 - ema) / 72 : 0, drop != null ? drop / 0.6 : 0);
      const meter = Math.max(0, Math.min(1, bend));
      const isDown = (ema != null && ema < 105) || (drop != null && drop > 0.5);
      // standing up needs every sign we have to agree (a knee angle from a flat picture can look
      // straight while the player is still down)
      const isUp = (ema == null || ema > 148) && (drop == null || drop < 0.2);
      if (!down && isDown) { down = true; downAt = t; low = ema ?? 180; return { say: 'Now stand up!', meter }; }
      if (down) {
        if (ema != null) low = Math.min(low, ema);
        if (isUp && t - last > 350 && t - downAt > 250) { down = false; reps++; last = t; return { rep: true, say: low < 90 ? 'Deep one!' : 'Nice!', meter }; }
        return { say: 'Now stand up!', meter };
      }
      return { say: meter > 0.45 ? 'Lower…' : 'Squat down', meter };
    },
  };
}
// Push-ups: only in a plank (body close to flat and straight from shoulder to ankle), down under 95°
// at the elbow, a rep when the arms straighten past 150°.
export function pushups() {
  let down = false, reps = 0, ema = null, last = -1e9;
  return {
    get score() { return reps; },
    update(f) {
      const lm = f.lm || [], t = f.t;
      const e = elbowAngle(f);
      const [s, h, a] = sideOf(lm, [[P.LS, P.LH, P.LA], [P.RS, P.RH, P.RA]]);
      const body = joints(f, [s, h]);
      if (e == null || !body) return { say: 'We can’t see your arms' };
      const [S, H] = body.pts, dx = (S.x - H.x) * body.aspect, dy = S.y - H.y, dz = (S.z ?? 0) - (H.z ?? 0);
      const flat = Math.abs(dy) < Math.hypot(dx, dz) * 0.8;
      const line = jointAngle(f, s, h, a);
      const straight = line == null || line > 140;
      ema = ema == null ? e : ema * 0.45 + e * 0.55;
      const meter = Math.max(0, Math.min(1, (165 - ema) / 85));
      if (!flat || !straight) return { say: flat ? 'Keep your body straight' : 'Get into a plank', meter: 0 };
      if (!down && ema < 95) { down = true; return { say: 'Push!', meter }; }
      if (down) {
        if (ema > 150 && t - last > 350) { down = false; reps++; last = t; return { rep: true, say: 'Nice!', meter }; }
        return { say: 'Push!', meter };
      }
      return { say: ema < 125 ? 'Lower…' : 'Go down', meter };
    },
  };
}
// Wall sit: holding while the knees and hips both bend between about 62° and 125°. Standing up for
// more than 2 seconds after the hold has started ends it.
export function wallsit(max = 180) {
  let held = 0, started = false, lastT = null, outSince = null, over = false;
  return {
    get score() { return Math.floor(held / 1000); },
    get over() { return over; },
    update(f) {
      const lm = f.lm || [], t = f.t;
      const dt = lastT == null ? 0 : Math.min(250, t - lastT);
      lastT = t;
      if (over) return { say: 'Done!' };
      const k = kneeAngle(f);
      const [s, h, kn] = sideOf(lm, [[P.LS, P.LH, P.LK], [P.RS, P.RH, P.RK]]);
      const hip = jointAngle(f, s, h, kn);
      const holding = k != null && hip != null && k >= 62 && k <= 122 && hip >= 62 && hip <= 128;
      if (holding) {
        started = true; outSince = null; held += dt;
        if (held >= max * 1000) { held = max * 1000; over = true; return { say: 'Maxed out!', meter: 1, done: true }; }
        return { say: k > 105 ? 'Lower, thighs flat!' : 'Hold it!', meter: Math.min(1, held / (max * 1000)), holding: true };
      }
      if (!started) return { say: k == null ? 'We can’t see your legs' : 'Slide down the wall', meter: 0 };
      outSince ??= t;
      if (t - outSince > 2000) { over = true; return { say: 'You stood up', done: true }; }
      return { say: 'Get back down!', meter: Math.min(1, held / (max * 1000)) };
    },
  };
}
// Dribbles: the hand that moves most, below the shoulders; one dribble is a drop of at least a fifth
// of the torso and back up again (a little dead zone keeps jitter from counting). Picture points only.
export function dribbles() {
  let count = 0, last = -1e9, hand = null;
  const ys = { 15: null, 16: null }, travel = { 15: 0, 16: 0 };
  let dir = 1, ext = null, prevExt = null;
  return {
    get score() { return count; },
    update(f) {
      const lm = f.lm || [], t = f.t;
      const sh = [P.LS, P.RS].filter((i) => seen(lm[i])), hp = [P.LH, P.RH].filter((i) => seen(lm[i]));
      if (!sh.length || !hp.length) return { say: 'We can’t see your body' };
      const shY = sh.reduce((sum, i) => sum + lm[i].y, 0) / sh.length, hpY = hp.reduce((sum, i) => sum + lm[i].y, 0) / hp.length;
      const torso = Math.max(0.05, hpY - shY), amp = torso * 0.2;
      for (const w of [P.LW, P.RW]) {
        if (!seen(lm[w], 0.4)) continue;
        if (ys[w] != null) travel[w] = travel[w] * 0.92 + Math.abs(lm[w].y - ys[w]);
        ys[w] = ys[w] == null ? lm[w].y : ys[w] * 0.35 + lm[w].y * 0.65;
      }
      const pick = [P.LW, P.RW].filter((w) => ys[w] != null && ys[w] > shY).sort((x, y) => travel[y] - travel[x])[0];
      if (pick == null) return { say: 'Dribble below your shoulders' };
      if (pick !== hand && (hand == null || travel[pick] > travel[hand] * 1.6)) { hand = pick; ext = null; prevExt = null; }
      const y = ys[hand];
      if (ext == null) { ext = y; dir = 1; return { say: 'Pound it!' }; }
      let rep = false;
      if (dir > 0) {                       // the hand going down
        if (y > ext) ext = y;
        else if (ext - y > amp * 0.4) { prevExt = ext; ext = y; dir = -1; }    // passed the bottom
      } else {                             // the hand coming up
        if (y < ext) ext = y;
        else if (y - ext > amp * 0.4) {                                    // passed the top
          if (prevExt != null && prevExt - ext >= amp && t - last > 110) { count++; last = t; rep = true; }
          prevExt = ext; ext = y; dir = 1;
        }
      }
      return { rep, say: rep ? '' : 'Pound it!', hand };
    },
  };
}
// Targets: one at a time somewhere the player has to reach, gone after `life` ms. A hit is a wrist or
// index finger within the target's radius. `bounds` keeps targets inside the part of the picture on
// screen. Random numbers come from `rand` so a test can replay a game.
export function targets({ life = 2600, r = 0.075, rand = Math.random, bounds = { x0: 0.08, x1: 0.92, y0: 0.08, y1: 0.62 } } = {}) {
  let hits = 0, misses = 0, combo = 0, best = 0, cur = null, next = 0, n = 0;
  const hands = (lm) => [P.LW, P.RW, P.LI, P.RI].map((i) => lm[i]).filter((p) => seen(p, 0.45));
  function spawn(lm, t, aspect) {
    const hs = hands(lm);
    // the torso: targets go out to the sides and up, where it takes a reach, not on the chest
    const sh = [lm[P.LS], lm[P.RS]].filter((p) => seen(p));
    const cx = sh.length ? sh.reduce((a, p) => a + p.x, 0) / sh.length : 0.5;
    const half = sh.length === 2 ? Math.abs(sh[0].x - sh[1].x) / 2 : 0.1;
    const top = sh.length ? Math.min(...sh.map((p) => p.y)) : 0.3;
    for (let tries = 0; tries < 40; tries++) {
      const x = bounds.x0 + rand() * (bounds.x1 - bounds.x0), y = bounds.y0 + rand() * (bounds.y1 - bounds.y0);
      const onChest = Math.abs(x - cx) < half + r * 0.8 && y > top - r;
      const nearHand = hs.some((h) => Math.hypot((h.x - x) * aspect, h.y - y) < 0.28);
      if ((!onChest && !nearHand) || tries === 39) { cur = { x, y, born: t, id: ++n }; return; }
    }
  }
  return {
    get score() { return hits; },
    get misses() { return misses; },
    get best() { return best; },
    get target() { return cur; },
    radius: r,
    update(f) {
      const lm = f.lm || [], t = f.t, aspect = f.aspect || 1;
      if (!cur) { if (t >= next) spawn(lm, t, aspect); return { say: 'Smack it!' }; }
      const hit = hands(lm).some((h) => Math.hypot((h.x - cur.x) * aspect, h.y - cur.y) <= r);
      if (hit) {
        hits++; combo++; best = Math.max(best, combo);
        const at = cur; cur = null; next = t + 180;
        return { rep: true, hit: at, combo, say: combo >= 3 ? `${combo} in a row!` : 'Smash!' };
      }
      if (t - cur.born > life) { misses++; combo = 0; const at = cur; cur = null; next = t + 250; return { miss: at, say: 'Too slow!' }; }
      return { say: 'Smack it!', left: 1 - (t - cur.born) / life };
    },
  };
}

// The player's body on screen: the middle of the shoulders, how wide they are, and the heights of the
// head, hips and knees (with guesses where the camera can't see).
function frame(lm) {
  const sh = [lm[P.LS], lm[P.RS]].filter((p) => seen(p));
  const cx = sh.length ? sh.reduce((a, p) => a + p.x, 0) / sh.length : 0.5;
  const shY = sh.length ? sh.reduce((a, p) => a + p.y, 0) / sh.length : 0.35;
  const sw = sh.length === 2 ? Math.max(0.08, Math.abs(sh[0].x - sh[1].x)) : 0.14;
  const avg = (ids, d) => { const ps = ids.map((i) => lm[i]).filter((p) => seen(p)); return ps.length ? ps.reduce((a, p) => a + p.y, 0) / ps.length : d; };
  const hipY = avg([P.LH, P.RH], shY + 0.22), kneeY = avg([P.LK, P.RK], hipY + 0.2), headY = seen(lm[P.NOSE]) ? lm[P.NOSE].y : shY - 0.1;
  return { cx, sw, shY, hipY, kneeY, headY };
}
const clampIn = (v, a, b) => Math.max(a, Math.min(b, v));

// Goalkeeper: the phone is the shooter. One shot at a time is struck from right in front of the phone
// (big, at the bottom of the picture) and flies away to a spot around the player (high, low, left,
// right, over the head), shrinking as it goes. Once it's close to the player (the last 45% of its
// flight) a hand, finger or foot on the ball is a save; if it gets all the way past, it's a goal.
// Shots get quicker as the game goes on.
export function keeper({ rand = Math.random, flight = 1500, gap = 900, bounds = { x0: 0.08, x1: 0.92, y0: 0.1, y1: 0.86 } } = {}) {
  let saves = 0, goals = 0, streak = 0, best = 0, shot = null, next = 600, n = 0;
  const R0 = 0.2, R1 = 0.072;
  const stoppers = (lm) => [P.LW, P.RW, P.LI, P.RI, 27, 28, 31, 32].map((i) => lm[i]).filter((p) => seen(p, 0.45));
  function shoot(lm, t) {
    const b = frame(lm), side = rand() < 0.5 ? -1 : 1, pick = rand();
    let x, y, kind;
    if (pick < 0.3) { kind = 'high'; x = b.cx + side * b.sw * (1.2 + rand() * 0.6); y = b.headY - 0.02 + rand() * 0.04; }
    else if (pick < 0.6) { kind = 'mid'; x = b.cx + side * b.sw * (1.4 + rand() * 0.7); y = (b.shY + b.hipY) / 2 + rand() * 0.06; }
    else if (pick < 0.85) { kind = 'low'; x = b.cx + side * b.sw * (0.8 + rand() * 0.8); y = b.kneeY + rand() * 0.06; }
    else { kind = 'top'; x = b.cx + (rand() - 0.5) * b.sw * 0.6; y = b.headY - 0.12; }
    x = clampIn(x, bounds.x0, bounds.x1); y = clampIn(y, bounds.y0, bounds.y1);
    n++;
    const dur = Math.max(750, flight - n * 35);
    shot = { id: n, born: t, dur, kind, from: { x: 0.5 + (x - 0.5) * 0.35, y: 1.08 }, to: { x, y } };
  }
  // where the ball is at time t, and how big
  function at(s, t) {
    // quick off the foot, easing as it reaches the player; the ball shrinks with distance
    const p = Math.max(0, (t - s.born) / s.dur), q = Math.min(1, p), e = 1 - (1 - q) ** 1.8;
    return { x: s.from.x + (s.to.x - s.from.x) * e, y: s.from.y + (s.to.y - s.from.y) * e, r: R1 + (R0 - R1) * (1 - q) ** 2.2, p };
  }
  return {
    get score() { return saves; },
    get goals() { return goals; },
    get best() { return best; },
    get shot() { return shot; },
    ball(t) { return shot ? at(shot, t) : null; },
    update(f) {
      const lm = f.lm || [], t = f.t, aspect = f.aspect || 1;
      if (!shot) { if (t >= next) { shoot(lm, t); return { say: 'Here it comes!', shot: true }; } return { say: streak >= 3 ? `${streak} saves in a row!` : 'Get set' }; }
      const b = at(shot, t);
      if (b.p >= 0.55 && stoppers(lm).some((h) => Math.hypot((h.x - b.x) * aspect, h.y - b.y) <= b.r + 0.03)) {
        saves++; streak++; best = Math.max(best, streak);
        const where = { x: b.x, y: b.y }; shot = null; next = t + Math.max(450, gap - n * 15);
        return { rep: true, save: where, streak, say: streak >= 3 ? `${streak} in a row!` : 'SAVE!' };
      }
      if (b.p >= 1.05) {
        goals++; streak = 0;
        const where = { x: b.x, y: b.y }; shot = null; next = t + Math.max(550, gap - n * 15);
        return { goal: where, say: 'Goal! Next one' };
      }
      return { say: b.p >= 0.55 ? 'Stop it!' : 'Here it comes!' };
    },
  };
}

// Avocado Chop: avocados (and the odd chili) are thrown up from the bottom and fall back down. A cut
// is a hand swiping fast through one (the line a wrist or finger travels between two frames crosses
// it). Every cut on the same avocado triples: 1, 3, 9, 27, 81 points; after the fifth it's guac.
// A chili cut costs 25 points. Each hand can cut a given avocado once every 220 ms.
export const CUT_POINTS = [1, 3, 9, 27, 81];
export function avocados({ rand = Math.random, gravity = 1.5, chili = 0.12 } = {}) {
  let points = 0, n = 0, next = 400, lastT = null, most = 0, dropped = 0, spicy = 0, cuts = 0;
  const items = [], prev = {};
  const HANDS = { L: [P.LW, P.LI], R: [P.RW, P.RI] };
  function launch(t, k) {
    const x = 0.18 + rand() * 0.64, apex = 0.16 + rand() * 0.26, y = 1.06;
    const vy = -Math.sqrt(2 * gravity * (y - apex)), vx = (0.5 - x) * (0.25 + rand() * 0.35);
    items.push({ id: ++n, kind: k || (t > 6000 && rand() < chili ? 'chili' : 'avo'), x, y, vx, vy, r: 0.062, cuts: 0, spin: rand() * 6, lines: [], last: {}, born: t });
  }
  function segHits(ax, ay, bx, by, cx, cy, r, aspect) {
    // distance from the item's middle to the swipe's line, x in screen proportion
    const px = (bx - ax) * aspect, py = by - ay, qx = (cx - ax) * aspect, qy = cy - ay;
    const L = px * px + py * py, u = L ? Math.max(0, Math.min(1, (qx * px + qy * py) / L)) : 0;
    return Math.hypot(qx - u * px, qy - u * py) <= r;
  }
  return {
    get score() { return points; },
    get most() { return most; },
    get dropped() { return dropped; },
    get spicy() { return spicy; },
    get cuts() { return cuts; },
    get items() { return items; },
    update(f) {
      const lm = f.lm || [], t = f.t, aspect = f.aspect || 1;
      const dt = lastT == null ? 0 : Math.min(0.06, (t - lastT) / 1000);
      lastT = t;
      if (t >= next) {
        const many = t > 12000 && rand() < 0.35 ? (t > 25000 && rand() < 0.4 ? 3 : 2) : 1;
        for (let i = 0; i < many; i++) launch(t);
        next = t + Math.max(650, 1500 - t / 40) * (0.8 + rand() * 0.4);
      }
      for (const it of items) { it.vy += gravity * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.spin += dt * 3; }
      const events = [];
      for (const [hand, ids] of Object.entries(HANDS)) {
        for (const i of ids) {
          const p = lm[i], key = hand + i;
          if (!seen(p, 0.45)) { delete prev[key]; continue; }
          const q = prev[key]; prev[key] = { x: p.x, y: p.y, t };
          if (!q || t - q.t > 150) continue;
          const speed = Math.hypot((p.x - q.x) * aspect, p.y - q.y) / Math.max(0.016, (t - q.t) / 1000);
          if (speed < 0.9) continue;
          for (const it of items) {
            if (it.gone || (it.last[hand] && t - it.last[hand] < 220)) continue;
            if (!segHits(q.x, q.y, p.x, p.y, it.x, it.y, it.r, aspect)) continue;
            it.last[hand] = t;
            const ang = Math.atan2(p.y - q.y, (p.x - q.x) * aspect);
            if (it.kind === 'chili') { it.gone = true; spicy++; points = Math.max(0, points - 25); events.push({ spicy: { x: it.x, y: it.y } }); continue; }
            const pts = CUT_POINTS[it.cuts]; it.cuts++; cuts++; points += pts; most = Math.max(most, it.cuts);
            it.lines.push(ang);
            if (it.cuts >= CUT_POINTS.length) it.gone = true;
            events.push({ cut: { x: it.x, y: it.y, n: it.cuts, pts, guac: it.gone } });
          }
        }
      }
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.gone && !it.fade) it.fade = t;
        if ((it.fade && t - it.fade > 450) || (it.y > 1.2 && it.vy > 0)) {
          if (!it.fade && it.kind === 'avo' && it.cuts === 0) { dropped++; events.push({ drop: { x: it.x } }); }
          items.splice(i, 1);
        }
      }
      const big = events.filter((e) => e.cut).sort((a, b) => b.cut.pts - a.cut.pts)[0];
      return {
        rep: !!big, cut: big ? big.cut : null, events,
        spicy: events.find((e) => e.spicy)?.spicy || null, drop: events.some((e) => e.drop),
        say: big ? (big.cut.guac ? 'GUAC!' : big.cut.n >= 2 ? `x${big.cut.pts}!` : 'Slice!') : events.some((e) => e.spicy) ? 'Too spicy! −25' : 'Swipe through them!',
      };
    },
  };
}

// Silo Derby: a home run derby scored like skee-ball. The phone is the pitcher: each pitch leaves from
// right in front of the phone (big, at the bottom of the picture) and comes in to the player's belt,
// shrinking, quicker as the game goes on. A swing is the hands sweeping sideways fast (the middle of the
// wrists and fingers, 1.2 picture-heights a second or more) between the head and the knees; the swing's
// moment is its fastest frame. Swinging within `win` ms of the ball arriving is contact:
//   - power is the swing's speed (full at 2.8) times how close the timing was (55% to 100%);
//   - the direction is the timing: early pulls the ball the way the hands were going, late sends it the
//     other way, right on time is the middle; at the very edge of the window it's a foul;
//   - a strong hit (power 0.6 or more) carries to the back row: 100 in the corners, 50 in the middle;
//     a softer one drops into the front row: 10, 20, 30 in the middle, 20, 10; a weak one is a grounder.
// A pitch with no swing, or a swing out of the window, is a strike. Silos sit across the top of the
// picture inside `bounds`; a hit flies to its silo (`flyers`) and drops in. A swing long before the
// ball gets there (more than 2.5 windows early: getting set, or the hands coming back) doesn't count.
export const SILOS = [
  { row: 0, lane: -1, pts: 100 }, { row: 0, lane: 0, pts: 50 }, { row: 0, lane: 1, pts: 100 },
  { row: 1, lane: -2, pts: 10 }, { row: 1, lane: -1, pts: 20 }, { row: 1, lane: 0, pts: 30 }, { row: 1, lane: 1, pts: 20 }, { row: 1, lane: 2, pts: 10 },
];
export const SWING = { min: 1.2, full: 2.8, back: 0.6, grounder: 0.12, foul: 0.92 };
export function derby({ rand = Math.random, flight = 1300, gap = 900, win = 230, bounds = { x0: 0.08, x1: 0.92, y0: 0.1, y1: 0.86 }, layout = null } = {}) {
  let points = 0, hits = 0, homers = 0, strikes = 0, fouls = 0, streak = 0, best = 0, pitch = null, next = 700, n = 0, swing = null, cool = 0;
  const hist = [], flyers = [];
  const mid = (bounds.x0 + bounds.x1) / 2, w = bounds.x1 - bounds.x0;
  // where the silos stand: `layout` (the page fits them around its score and clock), else a default
  const silos = SILOS.map((s, i) => ({ ...s, i, x: mid + s.lane * w * (s.row ? 0.19 : 0.34), y: bounds.y0 + (s.row ? 0.12 : 0.02), r: s.row ? 0.042 : 0.05, ...(layout && layout[i] ? layout[i] : {}) }));
  const R0 = 0.16, R1 = 0.05, FLY = 750;
  const handPts = (lm) => [P.LW, P.RW, P.LI, P.RI].map((i) => lm[i]).filter((p) => seen(p, 0.45));
  function throwIt(lm, t) {
    const b = frame(lm);
    n++;
    const zone = { x: clampIn(b.cx, bounds.x0, bounds.x1), y: clampIn((b.shY + b.hipY) / 2 + 0.03 + (rand() - 0.5) * 0.06, bounds.y0 + 0.2, bounds.y1) };
    const dur = Math.max(700, flight - n * 25) * (0.85 + rand() * 0.3);
    pitch = { id: n, born: t, dur, arrive: t + dur, kind: dur < 850 ? 'heater' : dur > 1150 ? 'changeup' : 'fastball', from: { x: 0.5 + (zone.x - 0.5) * 0.3, y: 1.08 }, to: zone };
  }
  function at(pc, t) {
    const p = (t - pc.born) / pc.dur, q = Math.min(1.25, Math.max(0, p)), e = 1 - (1 - Math.min(1, q)) ** 1.6;
    return { x: pc.from.x + (pc.to.x - pc.from.x) * e, y: pc.from.y + (pc.to.y - pc.from.y) * e - Math.max(0, q - 1) * 0.3, r: R1 + (R0 - R1) * (1 - Math.min(1, q)) ** 2, p };
  }
  function flyerAt(fl, t) {
    const u = Math.min(1, (t - fl.born) / FLY), h = 0.18 + (fl.row ? 0 : 0.12);
    return { x: fl.from.x + (fl.to.x - fl.from.x) * u, y: fl.from.y + (fl.to.y - fl.from.y) * u - h * 4 * u * (1 - u), r: 0.05 - 0.022 * u, u };
  }
  // contact: where the ball goes, from the swing's speed, direction and timing
  function contact(sw, t) {
    const dt = sw.t - pitch.arrive, q = 1 - Math.abs(dt) / win;
    const pull = clampIn(-dt / (win * 0.8), -1, 1), d = Math.sign(sw.vx) * pull;
    const power = clampIn((sw.speed - SWING.min) / (SWING.full - SWING.min), 0, 1) * (0.55 + 0.45 * q);
    const ball = at(pitch, sw.t), from = { x: ball.x, y: ball.y };
    pitch = null; next = t + Math.max(500, gap - n * 15);
    if (Math.abs(-dt / win) > SWING.foul) { fouls++; streak = 0; return { foul: from, say: dt < 0 ? 'Foul! A hair early' : 'Foul! A hair late' }; }
    if (power < SWING.grounder) { streak = 0; return { grounder: from, say: 'Grounder. Swing harder!' }; }
    const row = power >= SWING.back ? 0 : 1;
    const lane = row === 0 ? (d < -0.4 ? -1 : d > 0.4 ? 1 : 0) : clampIn(Math.round(d * 2.4), -2, 2);
    const silo = silos.find((s) => s.row === row && s.lane === lane);
    points += silo.pts; hits++; streak++; best = Math.max(best, streak);
    if (row === 0) homers++;
    const fl = { id: n, from, to: { x: silo.x, y: silo.y }, born: t, silo: silo.i, row, pts: silo.pts };
    flyers.push(fl);
    return { rep: true, hit: { ...fl, power, timing: q, dir: d }, say: silo.pts === 100 ? 'CORNER POCKET! 100' : row === 0 ? 'DEEP! 50' : silo.pts === 30 ? 'Line drive! 30' : `Base hit, ${silo.pts}` };
  }
  return {
    get score() { return points; },
    get hits() { return hits; },
    get homers() { return homers; },
    get strikes() { return strikes; },
    get fouls() { return fouls; },
    get best() { return best; },
    get pitch() { return pitch; },
    get flyers() { return flyers; },
    silos,
    ball(t) { return pitch ? at(pitch, t) : null; },
    flyer(fl, t) { return flyerAt(fl, t); },
    update(f) {
      const lm = f.lm || [], t = f.t, aspect = f.aspect || 1;
      for (let i = flyers.length - 1; i >= 0; i--) if (t - flyers[i].born > FLY + 500) flyers.splice(i, 1);
      // the hands: where they are, and how fast they're going sideways
      const hs = handPts(lm), b = frame(lm);
      let out = null;
      if (hs.length) {
        const hx = hs.reduce((a, p) => a + p.x, 0) / hs.length, hy = hs.reduce((a, p) => a + p.y, 0) / hs.length;
        hist.push({ x: hx, y: hy, t });
        while (hist.length && t - hist[0].t > 160) hist.shift();
        let o = hist[0];
        for (let i = hist.length - 1; i >= 0; i--) if (t - hist[i].t >= 60) { o = hist[i]; break; }   // the newest point 60 ms back
        const vx = o && t > o.t ? ((hx - o.x) * aspect) / ((t - o.t) / 1000) : 0;
        const inZone = hy > b.headY - 0.05 && hy < b.kneeY + 0.05;
        if (!swing && t >= cool && inZone && Math.abs(vx) >= SWING.min) swing = { t, speed: Math.abs(vx), vx, start: t };
        else if (swing) {
          if (Math.abs(vx) > swing.speed && Math.sign(vx) === Math.sign(swing.vx)) { swing.speed = Math.abs(vx); swing.t = t; swing.vx = vx; }
          if (Math.abs(vx) < SWING.min * 0.5 || t - swing.start > 160 || Math.sign(vx) !== Math.sign(swing.vx)) {
            const sw = swing; swing = null; cool = t + 450;
            if (pitch) {
              const dt = sw.t - pitch.arrive;
              if (Math.abs(dt) <= win) out = contact(sw, t);
              else if (dt < -win && dt > -win * 2.5) { strikes++; streak = 0; pitch = null; next = t + Math.max(550, gap - n * 15); out = { strike: true, early: true, say: 'Strike! Way early' }; }
            }
          }
        }
      } else { hist.length = 0; swing = null; }
      if (out) return out;
      if (!pitch) { if (t >= next) { throwIt(lm, t); return { pitch: true, say: 'Here’s the pitch!' }; } return { say: streak >= 3 ? `${streak} hits in a row!` : 'Batter up' }; }
      if (t - pitch.arrive > win && !swing) {
        strikes++; streak = 0; pitch = null; next = t + Math.max(550, gap - n * 15);
        return { strike: true, say: 'Strike! Swing at it' };
      }
      return { say: at(pitch, t).p > 0.7 ? 'SWING!' : 'Here it comes…' };
    },
  };
}

export const COUNTERS = { squat: squats, pushup: pushups, wallsit, targets, dribble: dribbles, keeper, avocado: avocados, derby };

// The results text's row: ten squares filled by how much of the goal you got (⚡ on a new best).
export function shareRow(score, goal, best = false) {
  const n = Math.max(0, Math.min(10, Math.round((score / goal) * 10)));
  return '🟩'.repeat(n) + '⬛'.repeat(10 - n) + (best ? '⚡' : '');
}
