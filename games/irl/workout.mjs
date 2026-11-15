/* IRL's Full Body Workout (JC, Nov 15 2026: "a workout that is a full body workout with standing knee
   crunches and other exercises to strengthen the core and build speed and agility").
   A circuit of eight standing moves, each on the clock, with a short rest between that shows what's
   next: Jumping Jacks (warm-up), Standing Knee Crunches (core), High Knees (speed), Squats (legs),
   Cross Crunches (core, the obliques), Skater Hops (agility), Reaction Drill (speed and agility) and
   Burpees (the finisher). Every move counts reps from the body points the tracker finds; the score is
   all the reps added up. No floor moves but the burpee's dip, so it works in front of a TV.
   No camera and no DOM here: the tests feed it made-up bodies. Squats come from logic.mjs (passed in,
   so the two files don't import each other). */

export const WORKOUT = {
  ready: 5,     // seconds to read the first move before it starts
  rest: 10,     // seconds between moves
  plan: [['jacks', 30], ['crunch', 40], ['knees', 30], ['squat', 40], ['cross', 40], ['skate', 30], ['react', 40], ['burpee', 30]],
};
// Each move: its name (short, for the score bar), what it works, how to do it, and the reps that count
// as a good set of it (a 🟩 in the results text).
export const MOVES = {
  jacks: { name: 'Jumping Jacks', short: 'Jumping Jacks', emoji: '⭐', works: 'warm-up', target: 20, how: 'Jump your feet out wide and swing your hands up over your head, then jump back together.' },
  crunch: { name: 'Standing Knee Crunches', short: 'Knee Crunches', emoji: '🦵', works: 'core', target: 16, how: 'Arms straight up. Drive one knee up to your waist and pull your elbows down to meet it. Switch knees every time.' },
  knees: { name: 'High Knees', short: 'High Knees', emoji: '🏃', works: 'speed', target: 40, how: 'Run in place as fast as you can, knees up to your waist, arms pumping.' },
  squat: { name: 'Squats', short: 'Squats', emoji: '🪑', works: 'legs', target: 15, how: 'Sit back like there’s a chair behind you until your thighs are level, then stand all the way up.' },
  cross: { name: 'Cross Crunches', short: 'Cross Crunches', emoji: '🌀', works: 'core', target: 16, how: 'Hands behind your head. Bring one knee up and twist so the opposite elbow comes down to it. Switch sides.' },
  skate: { name: 'Skater Hops', short: 'Skater Hops', emoji: '⛸️', works: 'agility', target: 20, how: 'Hop side to side like a speed skater, landing on one foot, the other swinging behind.' },
  react: { name: 'Reaction Drill', short: 'Reaction Drill', emoji: '⚡', works: 'speed + agility', target: 14, how: 'Watch the arrows and move fast: step LEFT or RIGHT, DUCK down low, or REACH up high.' },
  burpee: { name: 'Burpees', short: 'Burpees', emoji: '🔥', works: 'full body', target: 5, how: 'Squat down, hands to the floor, kick or step back to a plank, come back up and jump with your hands up high.' },
};
export const WORKOUT_GOAL = 150;
// The whole thing, in seconds (ready, every move and the rests between).
export const workoutSecs = (w = WORKOUT) => w.ready + w.plan.reduce((s, [, secs]) => s + secs, 0) + w.rest * (w.plan.length - 1);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const seen = (p, min = 0.5) => !!p && (p.visibility == null || p.visibility >= min);
function seeded(seed = 1) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* The body in one frame, in picture heights both ways (x stretched by the picture's width over height,
   so a distance across is the same as one up and down): the joints the camera sees, the middle of the
   shoulders and hips, the torso's length and the shoulders' width. null when it can't see shoulders
   and hips. */
export function bodyOf(f) {
  const lm = (f && f.lm) || [], a = (f && f.aspect) || 0.75;
  const pt = (i, min = 0.5) => (seen(lm[i], min) ? { x: lm[i].x * a, y: lm[i].y } : null);
  const ls = pt(11), rs = pt(12), lh = pt(23), rh = pt(24);
  if (!(ls || rs) || !(lh || rh)) return null;
  const mid = (p, q) => (p && q ? { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } : p || q);
  const sh = mid(ls, rs), hp = mid(lh, rh), torso = Math.max(0.05, hp.y - sh.y);
  return {
    a, sh, hp, torso, shW: ls && rs ? Math.max(0.02, Math.abs(ls.x - rs.x)) : torso * 0.6,
    nose: pt(0), ls, rs, lh, rh, le: pt(13, 0.4), re: pt(14, 0.4), lw: pt(15, 0.4) || pt(19, 0.4), rw: pt(16, 0.4) || pt(20, 0.4),
    lk: pt(25), rk: pt(26), la: pt(27, 0.4) || pt(31, 0.4), ra: pt(28, 0.4) || pt(32, 0.4),
  };
}
const headY = (B) => (B.nose ? B.nose.y : B.sh.y - B.torso * 0.4);
const hands = (B) => [B.lw, B.rw].filter(Boolean);
// How high each knee is: 0 standing, 1 up level with the hip. The thigh's standing length is the
// longest hip-to-knee drop seen (fading slowly, in case the player steps closer).
function kneeLifts() {
  const thigh = { L: 0, R: 0 };
  return (B) => {
    const out = [];
    for (const [k, hip, knee] of [['L', B.lh || B.hp, B.lk], ['R', B.rh || B.hp, B.rk]]) {
      if (!knee) continue;
      const gap = knee.y - hip.y;
      thigh[k] = Math.max(thigh[k] * 0.999, gap, B.torso * 0.55);
      out.push({ k, knee, lift: clamp(1 - gap / thigh[k], 0, 1.4) });
    }
    return out;
  };
}

/* ---- the moves: each update(frame) answers { rep, say, meter } like the other counters ---- */

// Jumping jacks: a rep when the hands go up over the head with the feet out wide (wider than the
// shoulders), after being down by the sides with the feet back together. Feet the camera can't see
// don't hold it up.
export function jacks() {
  let open = false, reps = 0, last = -1e9;
  return {
    get score() { return reps; },
    update(f) {
      const B = bodyOf(f), t = f.t;
      if (!B) return { say: 'We can’t see you' };
      const hs = hands(B);
      if (!hs.length) return { say: 'Show us your hands' };
      const hy = headY(B), downLine = B.sh.y + B.torso * 0.25, top = Math.min(...hs.map((h) => h.y));
      const up = hs.every((h) => h.y < hy + B.torso * 0.05), down = hs.every((h) => h.y > downLine);
      const feet = B.la && B.ra ? Math.abs(B.la.x - B.ra.x) / B.shW : null;
      const wide = feet == null || feet > 1.2, narrow = feet == null || feet < 0.95;
      const meter = clamp((downLine - top) / Math.max(0.05, downLine - hy), 0, 1);
      if (!open && up && wide && t - last > 250) { open = true; reps++; last = t; return { rep: true, say: reps % 5 ? 'Nice!' : `${reps}!`, meter }; }
      if (open && down && narrow) open = false;
      if (!open && up && !wide) return { say: 'Jump your feet out too!', meter };
      return { say: open ? 'Back together' : 'Out and up!', meter };
    },
  };
}
// Knee crunches: a knee up near the hip (0.55 of the way) while an elbow or hand comes down to it,
// within three quarters of a torso. `cross`: only the opposite arm counts (a twist across the body).
// That knee has to drop again before it counts again.
export function kneeCrunch({ cross = false } = {}) {
  let reps = 0, last = -1e9;
  const lifts = kneeLifts(), up = { L: false, R: false }, done = { L: false, R: false };
  return {
    get score() { return reps; },
    update(f) {
      const B = bodyOf(f), t = f.t;
      if (!B) return { say: 'We can’t see you' };
      let best = null;
      for (const l of lifts(B)) {
        if (l.lift < 0.3) { up[l.k] = false; done[l.k] = false; } else if (l.lift >= 0.55) up[l.k] = true;
        if (!best || l.lift > best.lift) best = l;
      }
      if (!best) return { say: 'We can’t see your knees' };
      const meter = clamp(best.lift, 0, 1);
      if (up[best.k] && !done[best.k]) {
        const arm = (cross ? (best.k === 'L' ? [B.re, B.rw] : [B.le, B.lw]) : [B.le, B.lw, B.re, B.rw]).filter(Boolean);
        // arms the camera can't see (hands behind the head) don't hold the rep up
        const near = arm.length ? Math.min(...arm.map((p) => Math.hypot(p.x - best.knee.x, p.y - best.knee.y))) : 0;
        if (near <= B.torso * (cross ? 0.8 : 0.75) && t - last > 300) { done[best.k] = true; reps++; last = t; return { rep: true, say: cross ? 'Twist!' : 'Crunch!', meter }; }
        return { say: cross ? `${best.k === 'L' ? 'Right' : 'Left'} elbow to that knee!` : 'Elbows down to your knee!', meter };
      }
      return { say: cross ? 'Knee up, twist across' : 'Knee up, elbows down', meter };
    },
  };
}
// High knees: every knee that comes up past 0.45 of the way to the hip (and drops back) is one. The coach
// asks for more speed under two a second, more height when the knees stop short.
export function highKnees() {
  let reps = 0;
  const lifts = kneeLifts(), up = { L: false, R: false }, peak = { L: 0, R: 0 }, at = { L: -1e9, R: -1e9 }, times = [];
  let short = 0;
  return {
    get score() { return reps; },
    update(f) {
      const B = bodyOf(f), t = f.t;
      if (!B) return { say: 'We can’t see you' };
      const ls = lifts(B);
      if (!ls.length) return { say: 'We can’t see your knees' };
      let rep = false, meter = 0;
      for (const l of ls) {
        meter = Math.max(meter, clamp(l.lift, 0, 1));
        if (!up[l.k] && l.lift >= 0.45 && t - at[l.k] > 120) { up[l.k] = true; at[l.k] = t; reps++; rep = true; times.push(t); short = 0; }
        else if (up[l.k] && l.lift < 0.2) up[l.k] = false;
        else if (!up[l.k]) { peak[l.k] = Math.max(peak[l.k], l.lift); if (l.lift < 0.1 && peak[l.k] > 0.22) { short++; peak[l.k] = 0; } }
        if (up[l.k]) peak[l.k] = 0;
      }
      while (times.length && t - times[0] > 3000) times.shift();
      const rate = times.length / 3;
      return { rep, meter, say: short >= 2 ? 'Knees higher!' : rate < 2 ? 'Faster!' : rate > 3.2 ? 'Flying!' : 'Keep it up!' };
    },
  };
}
// Skater hops: side to side. Home is where you've been standing lately (it follows you, slowly); a hop
// counts each time your hips land half a shoulder-width past it on the other side.
export function skaters() {
  let reps = 0, last = -1e9, home = null, side = 0, sw = null, lastT = null;
  const st = { zone: null };
  return {
    get score() { return reps; },
    get zone() { return st.zone; },
    update(f) {
      const B = bodyOf(f), t = f.t;
      const dt = lastT == null ? 0 : Math.min(250, t - lastT);
      lastT = t;
      if (!B) return { say: 'We can’t see you' };
      const x = B.hp.x;
      sw = sw == null ? B.shW : sw * 0.95 + B.shW * 0.05;
      home = home == null ? x : home + (x - home) * (1 - Math.exp(-dt / 1200));
      const d = Math.max(0.03, sw * 0.5), off = x - home;
      const feetY = Math.max(...[B.la, B.ra].filter(Boolean).map((p) => p.y), B.hp.y + B.torso * 1.6);
      st.zone = { x: home / B.a, d: (d * 1.7) / B.a, y: Math.min(1, feetY) };
      const s = off > d ? 1 : off < -d ? -1 : 0, meter = clamp(Math.abs(off) / d, 0, 1);
      if (s && s !== side && t - last > 200) { side = s; reps++; last = t; return { rep: true, say: reps % 5 ? 'Hop!' : `${reps}!`, meter }; }
      return { say: side ? 'Now the other way!' : 'Hop side to side!', meter };
    },
  };
}
/* Reaction drill: a cue at a time, LEFT, RIGHT (as the screen shows them), DUCK or REACH, once you're
   back in the middle and standing. Do it within the window (1.7 s, a little less with every hit) and
   it's a rep, timed; the wrong way or too late is a miss. `mirror` when the picture shows mirrored, so
   left on the screen is left for the player. Seeded: two players get the same cues. */
export const CUES = ['left', 'right', 'duck', 'reach'];
export function reaction({ seed = 1, mirror = false } = {}) {
  const rnd = seeded(seed ^ 0x51ed);
  let hits = 0, misses = 0, cue = null, nextAt = null, home = null, standY = null, lastKind = null, lastT = null;
  const times = [];
  return {
    get score() { return hits; },
    get misses() { return misses; },
    get cue() { return cue; },
    get fastest() { return times.length ? Math.min(...times) : null; },
    get times() { return times; },
    update(f) {
      const B = bodyOf(f), t = f.t;
      const dt = lastT == null ? 0 : Math.min(250, t - lastT);
      lastT = t;
      nextAt ??= t + 1200;
      if (!B) return { say: 'We can’t see you' };
      const sx = (mirror ? -1 : 1) * B.hp.x, d = B.shW * 0.6;
      const hy = headY(B), reach = hands(B).some((h) => h.y < hy - B.torso * 0.2);
      if (!cue) {
        // between cues: learn where the middle is and how tall you stand
        home = home == null ? sx : home + (sx - home) * (1 - Math.exp(-dt / 500));
        standY = standY == null ? B.sh.y : B.sh.y < standY ? standY + (B.sh.y - standY) * 0.5 : standY + (B.sh.y - standY) * (1 - Math.exp(-dt / 2500));
        const ready = Math.abs(sx - home) < d * 0.6 && B.sh.y < standY + B.torso * 0.15 && !reach;
        if (t >= nextAt && ready) {
          let kind = CUES[Math.floor(rnd() * CUES.length)];
          if (kind === lastKind) kind = CUES[(CUES.indexOf(kind) + 1 + Math.floor(rnd() * 3)) % CUES.length];
          lastKind = kind;
          cue = { kind, at: t, until: t + Math.max(1100, 1700 - hits * 30) };
          return { cue: kind, say: { left: 'LEFT!', right: 'RIGHT!', duck: 'DUCK!', reach: 'REACH!' }[kind] };
        }
        return { say: t >= nextAt ? 'Back to the middle' : 'Ready…' };
      }
      const off = sx - home, meter = clamp((t - cue.at) / (cue.until - cue.at), 0, 1);
      const did = { left: off < -d, right: off > d, duck: B.sh.y > standY + B.torso * 0.3, reach }[cue.kind];
      const wrong = (cue.kind === 'left' && off > d) || (cue.kind === 'right' && off < -d);
      if (did) {
        const ms = Math.round(t - cue.at), kind = cue.kind;
        hits++; times.push(ms); cue = null; nextAt = t + 450 + rnd() * 600;
        return { rep: true, hit: { kind, ms }, say: `${(ms / 1000).toFixed(2)} s!`, meter };
      }
      if (wrong || t > cue.until) {
        const kind = cue.kind;
        misses++; cue = null; nextAt = t + 700 + rnd() * 500;
        return { miss: { kind, wrong }, say: wrong ? 'Other way!' : 'Too slow!', meter: 1 };
      }
      return { say: { left: 'LEFT!', right: 'RIGHT!', duck: 'DUCK!', reach: 'REACH!' }[cue.kind], meter };
    },
  };
}
// Burpees: down (hands below the knees, or the shoulders dropped most of a torso), then back up standing
// tall with a hand up over the head (the jump) is one.
export function burpees() {
  let reps = 0, last = -1e9, down = false, standY = null, lastT = null;
  return {
    get score() { return reps; },
    update(f) {
      const B = bodyOf(f), t = f.t;
      const dt = lastT == null ? 0 : Math.min(250, t - lastT);
      lastT = t;
      if (!B) return { say: down ? 'Now back up!' : 'We can’t see you' };
      if (!down) standY = standY == null ? B.sh.y : B.sh.y < standY ? standY + (B.sh.y - standY) * 0.5 : standY + (B.sh.y - standY) * (1 - Math.exp(-dt / 3000));
      const knees = [B.lk, B.rk].filter(Boolean), kneeY = knees.length ? knees.reduce((s, k) => s + k.y, 0) / knees.length : B.hp.y + B.torso * 0.8;
      const low = hands(B).some((h) => h.y > kneeY) || B.sh.y > standY + B.torso * 0.7;
      const tall = B.sh.y < standY + B.torso * 0.2, reach = hands(B).some((h) => h.y < headY(B));
      const meter = clamp((B.sh.y - standY) / B.torso, 0, 1);
      if (!down && low) { down = true; return { say: 'Kick back, then jump up!', meter }; }
      if (down && tall && reach && t - last > 600) { down = false; reps++; last = t; return { rep: true, say: 'Boom!', meter }; }
      if (down) return { say: tall ? 'Jump and reach up!' : 'Now back up!', meter };
      return { say: 'Hands to the floor', meter };
    },
  };
}

/* The circuit: ready, then each move on its clock with a rest between. Two players run the same clock
   (it starts at each counter's first frame, the same frame for both). The counter answers the move's
   own events plus `start` (a move begins), `rest` (a rest begins: `next` is the move coming) and `done`. */
export function workout({ seed = 1, mirror = false, squats = null } = {}) {
  const plan = WORKOUT.plan, reps = plan.map(() => 0), parts = [];
  let at = WORKOUT.ready * 1000;
  parts.push({ i: 0, kind: 'rest', from: 0, to: at });
  plan.forEach(([, secs], i) => {
    parts.push({ i, kind: 'work', from: at, to: (at += secs * 1000) });
    if (i < plan.length - 1) parts.push({ i: i + 1, kind: 'rest', from: at, to: (at += WORKOUT.rest * 1000) });
  });
  const total = at;
  const make = (k) => (k === 'jacks' ? jacks() : k === 'crunch' ? kneeCrunch() : k === 'cross' ? kneeCrunch({ cross: true }) : k === 'knees' ? highKnees()
    : k === 'squat' ? (squats ? squats() : highKnees()) : k === 'skate' ? skaters() : k === 'react' ? reaction({ seed, mirror }) : burpees());
  let t0 = null, part = null, ctr = null, done = false, left = WORKOUT.ready;
  const moves = {};
  return {
    get score() { return reps.reduce((s, n) => s + n, 0); },
    get reps() { return reps; },
    get part() { return part; },
    get phase() { return done ? 'done' : part ? part.kind : 'rest'; },
    get station() { return part ? part.i : 0; },
    get move() { return MOVES[plan[part ? part.i : 0][0]]; },
    get key() { return plan[part ? part.i : 0][0]; },
    get left() { return left; },
    get total() { return total; },
    get counter() { return ctr; },
    get cue() { return ctr && ctr.cue !== undefined ? ctr.cue : null; },
    get zone() { return ctr && ctr.zone !== undefined ? ctr.zone : null; },
    get fastest() { return moves.react ? moves.react.fastest : null; },
    update(f) {
      const t = f.t;
      t0 ??= t;
      const el = t - t0;
      if (done) return { say: 'Done!' };
      if (el >= total) { done = true; left = 0; ctr = null; return { done: true, say: 'Workout done!' }; }
      const p = parts.find((q) => el >= q.from && el < q.to);
      const out = {};
      if (p !== part) {
        part = p;
        if (p.kind === 'work') { ctr = moves[plan[p.i][0]] = make(plan[p.i][0]); out.start = MOVES[plan[p.i][0]]; }
        else { ctr = null; out.rest = true; out.next = MOVES[plan[p.i][0]]; }
      }
      left = (p.to - el) / 1000;
      if (p.kind !== 'work') return { ...out, say: `Up next: ${MOVES[plan[p.i][0]].name}`, meter: 0 };
      const r = ctr.update(f) || {};
      if (r.rep) reps[p.i]++;
      return { ...r, ...out };
    },
  };
}
// The results text's row for a workout: a square a move, 🟩 a good set (its target), 🟨 some, ⬛ none.
export function workoutRow(reps, best = false) {
  return WORKOUT.plan.map(([k], i) => (reps[i] >= MOVES[k].target ? '🟩' : reps[i] > 0 ? '🟨' : '⬛')).join('') + (best ? '⚡' : '');
}
