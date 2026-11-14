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
};
export const ORDER = ['squat', 'pushup', 'wallsit', 'targets', 'dribble'];
export const MIN_TO_PAY = { squat: 3, pushup: 3, wallsit: 10, targets: 3, dribble: 10 };

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
  if (kind === 'targets') return any([P.LW, P.RW]) ? { ok: true, say: 'Ready' } : { ok: false, say: 'Show us your hands' };
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
export const COUNTERS = { squat: squats, pushup: pushups, wallsit, targets, dribble: dribbles };

// The results text's row: ten squares filled by how much of the goal you got (⚡ on a new best).
export function shareRow(score, goal, best = false) {
  const n = Math.max(0, Math.min(10, Math.round((score / goal) * 10)));
  return '🟩'.repeat(n) + '⬛'.repeat(10 - n) + (best ? '⚡' : '');
}
