/* IRL's sports games (JC, Nov 15 2026: "an animation as the main view that syncs to my movement. Much
   like how NEX Playground displays an animation with a camera view of the players... I want bowling and
   QB throw etc."; his picks for the rest: basketball free throws and a tennis rally).
   Each counter reads the same body points as logic.mjs's (MediaPipe's 33, 0 to 1 across and down the
   camera picture) and plays a little world the page draws (scene.js): a bowling lane, a football field,
   a basketball hoop, a tennis court. No DOM here, so the tests can play them.

   Every counter takes { mirror, range }: `mirror` when the picture shows flipped (so "left" means the
   player's screen left), `range` the part of the screen this player owns ([0, 1] alone, a half each for
   two), so stepping across your part of the screen moves you across your lane. */

import { CRAFTS, craftOf, seeded, PIER } from '../send-it/logic.mjs';   // the same path from public/irl/ to public/send-it/

const P = { NOSE: 0, LS: 11, RS: 12, LE: 13, RE: 14, LW: 15, RW: 16, LI: 19, RI: 20, LH: 23, RH: 24, LK: 25, RK: 26 };
const seen = (p, min = 0.5) => !!p && (p.visibility == null || p.visibility >= min);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avg = (ps, k) => ps.reduce((s, p) => s + p[k], 0) / ps.length;

// The player's body: the middle and width of the shoulders, the heights of the head, shoulders and hips.
export function bodyOf(lm) {
  if (!lm) return null;
  const sh = [lm[P.LS], lm[P.RS]].filter((p) => seen(p));
  if (!sh.length) return null;
  const hp = [lm[P.LH], lm[P.RH]].filter((p) => seen(p));
  const cx = avg(sh, 'x'), shY = avg(sh, 'y');
  const hipY = hp.length ? avg(hp, 'y') : shY + 0.25;
  const sw = sh.length === 2 ? Math.max(0.05, Math.abs(sh[0].x - sh[1].x)) : 0.12;
  const nose = seen(lm[P.NOSE]) ? lm[P.NOSE] : null;
  const kn = [lm[P.LK], lm[P.RK]].filter((p) => seen(p));
  return { cx, shY, hipY, sw, headY: nose ? nose.y : shY - 0.12, noseX: nose ? nose.x : cx, torso: Math.max(0.06, hipY - shY), kneeY: kn.length ? avg(kn, 'y') : hipY + 0.2 };
}

// Both hands over the last moments (the wrist, or the index finger when the wrist is hidden), and how
// fast each is going: picture widths and heights a second.
function hands() {
  const H = { 15: [], 16: [] }, ALT = { 15: 19, 16: 20 };
  return {
    push(lm, t) {
      for (const w of [15, 16]) {
        const p = seen(lm[w], 0.4) ? lm[w] : seen(lm[ALT[w]], 0.4) ? lm[ALT[w]] : null, h = H[w];
        if (!p) { h.length = 0; continue; }
        h.push({ x: p.x, y: p.y, t });
        while (h.length > 2 && t - h[0].t > 400) h.shift();
      }
    },
    at(w) { const h = H[w]; return h.length ? h[h.length - 1] : null; },
    vel(w, back = 60) {
      const h = H[w];
      if (h.length < 2) return null;
      const a = h[h.length - 1];
      let o = h[0];
      for (let i = h.length - 2; i >= 0; i--) if (a.t - h[i].t >= back) { o = h[i]; break; }
      const dt = (a.t - o.t) / 1000;
      return dt > 0 ? { vx: (a.x - o.x) / dt, vy: (a.y - o.y) / dt } : null;
    },
    // the fastest upward speed in the last `ms` (picture heights a second, up is positive)
    peakUp(w, ms = 160) {
      const h = H[w];
      let best = 0;
      for (let i = h.length - 1; i > 0 && h[h.length - 1].t - h[i].t <= ms; i--) {
        const dt = (h[i].t - h[i - 1].t) / 1000;
        if (dt > 0) best = Math.max(best, (h[i - 1].y - h[i].y) / dt);
      }
      return best;
    },
  };
}
// Screen x (0 left, 1 right, as the picture shows) and where it falls in the player's own range.
const screenX = (x, mirror) => (mirror ? 1 - x : x);
const inRange = (sx, range) => clamp((sx - range[0]) / Math.max(0.05, range[1] - range[0]), 0, 1);

/* ===================================================================================================
   BOWLING: five frames on a real lane, real scoring. The camera sits behind the ball. Swing your arm
   down past your hip and roll it forward up past your waist: how fast the hand comes up is how fast the
   ball goes, where you stand in your part of the screen is where it leaves the foul line, the hand's
   sideways flick at the release hooks it. The pins are a little physics world seen from above (meters):
   circles that knock each other over.
   =================================================================================================== */
export const LANE = { w: 1.05, len: 18.29, gutter: 0.24, ballR: 0.109, pinR: 0.06, rowDz: 0.264, pinGap: 0.3048, deck: 1.0 };
export const BOWL = { frames: 5, up: 0.7, full: 2.6, slow: 5.6, fast: 9.4 };
// The ten pins, numbered as a bowler sees them: 1 in front, 2 and 3, 4 5 6, then 7 8 9 10 across the back.
export function rack() {
  const pins = [];
  let n = 0;
  for (let k = 0; k < 4; k++) for (let i = 0; i <= k; i++) pins.push({ id: ++n, x: (i - k / 2) * LANE.pinGap, z: LANE.len + k * LANE.rowDz, vx: 0, vz: 0, down: false, tip: 0, tx: 0, tz: 1 });
  return pins;
}
// Two circles meeting (a ball and a pin, or two pins): they bounce apart. Answers how hard they met.
function collide(a, b, ra, rb, ma, mb, e) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = ra + rb;
  if (d >= min || d === 0) return 0;
  const nx = dx / d, nz = dz / d;
  // push them apart, then trade momentum along the line between them
  const over = min - d, wa = mb / (ma + mb), wb = ma / (ma + mb);
  a.x -= nx * over * wa; a.z -= nz * over * wa; b.x += nx * over * wb; b.z += nz * over * wb;
  const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (rel >= 0) return 0;
  const j = (-(1 + e) * rel) / (1 / ma + 1 / mb);
  a.vx -= (j / ma) * nx; a.vz -= (j / ma) * nz; b.vx += (j / mb) * nx; b.vz += (j / mb) * nz;
  return -rel;
}
// One roll down the lane: roll = { x0 (meters from the middle at the foul line), speed (m/s), angle
// (radians, + to the right), hook (sideways m/s² in the back half) }. step(dt) moves the world on.
export function bowlSim(roll, standing) {
  const L = LANE, half = L.w / 2, edge = half + L.gutter;
  const ball = { x: clamp(roll.x0, -half + L.ballR, half - L.ballR), z: 0, vx: roll.speed * Math.sin(roll.angle || 0), vz: roll.speed * Math.cos(roll.angle || 0), gutter: false, gone: false, spin: 0 };
  const pins = standing.filter((p) => !p.down).map((p) => ({ ...p, vx: 0, vz: 0, down: false, tip: 0 }));
  let t = 0, done = false, hitAt = null;
  function knock(p, by) {
    if (p.down) return;
    p.down = true;
    const s = Math.hypot(p.vx, p.vz) || 1;
    p.tx = p.vx / s; p.tz = p.vz / s;
    if (by && hitAt == null) hitAt = t;
  }
  function tick(dt) {
    t += dt;
    if (!ball.gone) {
      if (!ball.gutter && ball.z > L.len * 0.45 && ball.z < L.len) ball.vx += (roll.hook || 0) * 0.1 * ball.vz * dt;   // so much hook a meter
      ball.x += ball.vx * dt; ball.z += ball.vz * dt; ball.spin += (Math.hypot(ball.vx, ball.vz) / L.ballR) * dt;
      ball.vz *= 1 - 0.012 * dt;
      if (!ball.gutter && Math.abs(ball.x) > half + L.ballR * 0.3 && ball.z < L.len - 0.2) { ball.gutter = true; ball.x = Math.sign(ball.x) * (half + L.gutter / 2); ball.vx = 0; }
      if (ball.z > L.len + L.deck + 0.4) ball.gone = true;
    }
    if (!ball.gone && !ball.gutter) for (const p of pins) { const hit = collide(ball, p, L.ballR, L.pinR, 6.8, 1.5, 0.7); if (hit > 0.15) knock(p, true); }
    for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
      const a = pins[i], b = pins[j];
      if (!a.down && !b.down) continue;                       // two standing pins never move each other
      const hit = collide(a, b, L.pinR, L.pinR, 1.5, 1.5, 0.75);
      if (hit > 0.15) { knock(a, true); knock(b, true); }
    }
    for (const p of pins) {
      if (!p.down) continue;
      p.x += p.vx * dt; p.z += p.vz * dt;
      const k = Math.max(0, 1 - 0.8 * dt); p.vx *= k; p.vz *= k;
      p.tip = Math.min(1, p.tip + dt * 4);
      // the kickback boards throw a pin back in; past the deck it drops into the pit
      if (Math.abs(p.x) > edge) { p.x = Math.sign(p.x) * edge; p.vx *= -0.85; }
      if (p.z > L.len + L.deck) p.gone = true;
    }
    done = (ball.gone && pins.every((p) => p.gone || Math.hypot(p.vx, p.vz) < 0.06)) || t > 7;
  }
  return {
    ball, pins,
    get t() { return t; }, get done() { return done; }, get hitAt() { return hitAt; },
    step(dt) { let left = dt; while (left > 1e-6 && !done) { const h = Math.min(1 / 240, left); tick(h); left -= h; } return done; },
    run() { while (!done) tick(1 / 240); return this; },
    // the pins still standing, back in their spots (the sweep straightens them up for the next ball)
    standing() { return standing.filter((s) => pins.some((p) => p.id === s.id && !p.down)); },
    downCount() { return pins.filter((p) => p.down).length; },
  };
}
// Bowling's scoring for a game of `frames` frames (the last frame plays like a tenth: a strike or a
// spare there earns its bonus balls). Answers each frame's marks and running score, the total of the
// frames that are settled, and whether the game is over.
export function bowlScore(rolls, frames = BOWL.frames) {
  const out = [];
  let i = 0, run = 0, total = 0;
  for (let f = 0; f < frames; f++) {
    const last = f === frames - 1, r = rolls.slice(i);
    const fr = { marks: [], score: null };
    if (!r.length) { out.push(fr); continue; }
    if (!last) {
      if (r[0] === 10) {
        fr.marks = ['X'];
        if (r.length >= 3) run += 10 + r[1] + r[2], fr.score = run;
        i += 1;
      } else {
        fr.marks = [r[0] ? String(r[0]) : '-'];
        if (r.length >= 2) {
          fr.marks.push(r[0] + r[1] === 10 ? '/' : r[1] ? String(r[1]) : '-');
          if (r[0] + r[1] === 10) { if (r.length >= 3) run += 10 + r[2], fr.score = run; }
          else run += r[0] + r[1], fr.score = run;
        }
        i += 2;
      }
    } else {
      const b = r.slice(0, 3);
      let up = 10, fresh = true;
      for (const n of b) {
        if (fresh && n === 10) fr.marks.push('X');
        else if (!fresh && n === up) { fr.marks.push('/'); fresh = true; up = 10; }
        else { fr.marks.push(n ? String(n) : '-'); if (fresh) { up = 10 - n; fresh = false; } else { up = 10; fresh = true; } }
      }
      const need = b[0] === 10 || (b.length >= 2 && b[0] + b[1] === 10) ? 3 : 2;
      if (b.length >= need) run += b.reduce((s, n) => s + n, 0), fr.score = run;
      i += b.length;
    }
    if (fr.score != null) total = fr.score;
    out.push(fr);
  }
  return { frames: out, total, done: out.length === frames && out[frames - 1].score != null };
}
// Where the game is: which frame and ball comes next, and whether the next ball gets a fresh rack.
export function bowlNext(rolls, frames = BOWL.frames) {
  let i = 0;
  for (let f = 0; f < frames; f++) {
    const last = f === frames - 1;
    if (!last) {
      if (i >= rolls.length) return { frame: f + 1, ball: 1, fresh: true, done: false };
      if (rolls[i] === 10) { i += 1; continue; }
      if (i + 1 >= rolls.length) return { frame: f + 1, ball: 2, fresh: false, done: false };
      i += 2;
    } else {
      const b = rolls.slice(i);
      if (b.length === 0) return { frame: f + 1, ball: 1, fresh: true, done: false };
      if (b.length === 1) return { frame: f + 1, ball: 2, fresh: b[0] === 10, done: false };
      if (b.length === 2) {
        if (b[0] === 10) return { frame: f + 1, ball: 3, fresh: b[1] === 10, done: false };
        if (b[0] + b[1] === 10) return { frame: f + 1, ball: 3, fresh: true, done: false };
      }
      return { frame: f, ball: 0, fresh: false, done: true };
    }
  }
  return { frame: frames, ball: 0, fresh: false, done: true };
}

export function bowling({ frames = BOWL.frames, mirror = false, range = [0, 1] } = {}) {
  const H = hands(), rolls = [];
  let pins = rack(), sim = null, phase = 'ready', low = {}, cool = 0, aimX = 0, lastT = null, shown = null, last = null;
  const next = () => bowlNext(rolls, frames);
  return {
    frames,
    get score() { return bowlScore(rolls, frames).total; },
    get rolls() { return rolls; },
    get card() { return bowlScore(rolls, frames); },
    get next() { return next(); },
    get pins() { return sim ? sim.pins : pins; },
    get ball() { return sim ? sim.ball : null; },
    get phase() { return phase; },
    get aim() { return aimX; },
    get last() { return last; },
    get strikes() { return bowlScore(rolls, frames).frames.reduce((n, f) => n + f.marks.filter((m) => m === 'X').length, 0); },
    get spares() { return bowlScore(rolls, frames).frames.reduce((n, f) => n + f.marks.filter((m) => m === '/').length, 0); },
    update(f) {
      const lm = f.lm || [], t = f.t, aspect = f.aspect || 1;
      const dt = lastT == null ? 0 : Math.min(0.1, (t - lastT) / 1000);
      lastT = t;
      H.push(lm, t);
      const b = bodyOf(lm);
      if (b) aimX = (inRange(screenX(b.cx, mirror), range) - 0.5) * 2 * (LANE.w / 2 - LANE.ballR - 0.02);
      if (phase === 'rolling') {
        sim.step(dt);
        if (sim.done) {
          const down = sim.downCount(), before = shown;
          rolls.push(down);
          const st = next(), firstBall = before.ball === 1 || before.fresh;
          const mark = down === 10 && before.fresh ? 'strike' : !before.fresh && down === before.up ? 'spare' : down === 0 ? (sim.ball.gutter ? 'gutter' : 'miss') : 'pins';
          last = { down, mark, frame: before.frame, ball: before.ball, firstBall };
          pins = st.done ? sim.pins : st.fresh ? rack() : sim.standing();
          phase = 'settle'; cool = t + 1500;
          return { rep: true, rolled: last, say: mark === 'strike' ? 'STRIKE!' : mark === 'spare' ? 'SPARE!' : mark === 'gutter' ? 'Gutter ball' : `${down} down`, done: st.done };
        }
        return { say: sim.hitAt != null ? '' : 'Rolling…' };
      }
      if (phase === 'settle') {
        if (t < cool) return {};
        phase = 'ready'; sim = null;
        return { reset: true, say: next().ball === 1 ? `Frame ${next().frame}` : 'Pick up the spare' };
      }
      if (next().done) return { done: true };
      if (!b) { for (const w of [15, 16]) low[w] = null; return { say: 'Step into the picture' }; }
      // the swing: a hand drops to (or below) the hip, then comes up fast past the waist toward the pins
      for (const w of [15, 16]) {
        const p = H.at(w);
        if (!p) { low[w] = null; continue; }
        if (p.y > b.hipY - b.torso * 0.12) low[w] = t;
        const v = H.vel(w);
        if (low[w] != null && t - low[w] < 650 && p.y < b.hipY - b.torso * 0.4 && v && -v.vy >= BOWL.up) {
          const up = Math.max(-v.vy, H.peakUp(w));
          const u = clamp((up - BOWL.up) / (BOWL.full - BOWL.up), 0, 1);
          const sx = (mirror ? -v.vx : v.vx) * aspect;
          const st = next();
          shown = { ...st, up: pins.filter((q) => !q.down).length };
          const roll = { x0: aimX, speed: BOWL.slow + (BOWL.fast - BOWL.slow) * u, angle: clamp(sx * 0.012, -0.025, 0.025), hook: clamp(sx * 0.4, -0.8, 0.8) };
          sim = bowlSim(roll, pins);
          phase = 'rolling'; low = {};
          return { roll, say: 'Rolling…', pitch: true };
        }
      }
      return { say: next().ball === 1 ? 'Swing it back and roll!' : 'Roll for the spare' };
    },
  };
}

/* ===================================================================================================
   QB THROW: you're the quarterback, the camera behind you, three receivers running routes (a quick
   slant, an out, a deep go), each covered by a defender who loses a step at his own moment: the slant
   comes open first, the go last. Hold the ball up over your head and move it left or right: the target
   on the field follows your hand and locks onto the nearest receiver. Then throw: a hard throw reaches
   the deep man, a soft one only the short. Hit an open receiver for the catch and yards; a covered one
   can be picked off. A deep catch is a touchdown. Take too long and you're sacked. Yards are your score.
   =================================================================================================== */
export const QB = { cock: 0.02, fast: 1.3, full: 3.4, sack: 4.4, snap: 1100, endZone: 30, td: 10, lock: 0.32, aimSpan: 1.5 };
const ROUTES = {
  slant: { need: 0, open: [0.7, 2.6], speed: 7.6 },
  out: { need: 0.3, open: [1.6, 3.5], speed: 7.2 },
  go: { need: 0.55, open: [2.4, 4.6], speed: 8.6 },
};
// Where a receiver is s seconds after the snap (yards: x across the field, z downfield from the line).
export function routeAt(r, s) {
  const R = ROUTES[r.kind], sp = R.speed, d = Math.max(0, s) * sp;
  if (r.kind === 'slant') { const cut = 4; if (d <= cut) return { x: r.x, z: d }; const k = (d - cut) / Math.SQRT2; return { x: r.x - Math.sign(r.x) * k, z: cut + k }; }
  if (r.kind === 'out') { const cut = 11; if (d <= cut) return { x: r.x, z: d }; return { x: r.x + Math.sign(r.x) * (d - cut), z: cut + Math.min(1.2, (d - cut) * 0.15) }; }
  return { x: r.x, z: d };
}
export const isOpen = (r, s) => s >= ROUTES[r.kind].open[0] && s <= ROUTES[r.kind].open[1];
// The defender's spot: a step behind and inside the receiver, more when beaten.
export function defenderAt(r, s) {
  const p = routeAt(r, s), q = routeAt(r, s - 0.08), dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz) || 1;
  const gap = isOpen(r, s) ? 2.6 : 0.8;
  return { x: p.x - (dx / d) * gap - Math.sign(r.x) * 0.4, z: p.z - (dz / d) * gap };
}
// The direction from the quarterback (7 yards behind the line) to a spot, as the aim reads it: -1 far
// left of the screen to 1 far right.
const QB_Z = -7;
export const aimOf = (p) => clamp(Math.atan2(p.x, p.z - QB_Z) / 0.9, -1, 1);
export function qbThrow({ mirror = false, range = [0, 1], rand = Math.random } = {}) {
  const H = hands();
  let yards = 0, comps = 0, atts = 0, ints = 0, sacks = 0, tds = 0, n = 0, play = null, next = 600, ball = null, aim = 0, cocked = {}, aimHist = [], lock = null, result = null;
  function newPlay(t) {
    n++;
    const side = rand() < 0.5 ? -1 : 1;
    play = { id: n, born: t, snap: t + QB.snap, thrown: false, recv: [{ kind: 'slant', x: -side * (7 + rand() * 2) }, { kind: 'out', x: side * (10 + rand() * 2) }, { kind: 'go', x: -side * (13 + rand() * 2) }] };
  }
  const since = (t) => (t - play.snap) / 1000;
  // which receiver the aim points at (where he is now, as the player sees him), and where the ball has
  // to go to meet him
  function target(a, s) {
    let best = null;
    for (const r of play.recv) {
      const now = routeAt(r, s), off = Math.abs(aimOf(now) - a);
      if (off >= QB.lock || (best && off >= best.off)) continue;
      let p = now, T = 0;
      for (let k = 0; k < 3; k++) { T = 0.35 + Math.hypot(p.x, p.z - QB_Z) / 24; p = routeAt(r, s + T); }
      best = { r, p, T, off, now };
    }
    return best;
  }
  return {
    get score() { return Math.max(0, yards); },
    get comps() { return comps; }, get atts() { return atts; }, get ints() { return ints; }, get sacks() { return sacks; }, get tds() { return tds; },
    get play() { return play; }, get ball() { return ball; }, get aim() { return aim; }, get lock() { return lock; }, get result() { return result; },
    since(t) { return play ? since(t) : -9; },
    update(f) {
      const lm = f.lm || [], t = f.t, aspect = f.aspect || 1;
      H.push(lm, t);
      const b = bodyOf(lm);
      if (ball && t >= ball.land) {
        const out = ball.out; ball = null; result = { ...out, at: t };
        next = t + 1500; play = null;
        return out.catch
          ? { rep: true, caught: out, say: out.td ? 'TOUCHDOWN!' : `Caught! ${out.yards} yards` }
          : { [out.int ? 'picked' : 'incomplete']: out, say: out.int ? 'Picked off!' : out.short ? 'Underthrown' : 'Incomplete' };
      }
      if (!play && !ball) { if (t >= next) { newPlay(t); result = null; return { huddle: true, say: 'Hut… hut…' }; } return {}; }
      if (!play || play.thrown) return {};
      const s = since(t);
      if (s >= 0 && s > QB.sack) {
        sacks++; yards -= 3; result = { sack: true, at: t }; play = null; next = t + 1600;
        return { sacked: true, say: 'SACKED! Throw it sooner' };
      }
      if (!b) return { say: 'Step into the picture' };
      // the ball up over your head: the target follows your hand
      let up = null;
      for (const w of [15, 16]) { const p = H.at(w); if (p && p.y < b.headY - QB.cock) { cocked[w] = t; if (!up || p.y < up.p.y) up = { w, p }; } }
      if (up) {
        aim = clamp((screenX(up.p.x, mirror) - screenX(b.noseX, mirror)) / (b.sw * QB.aimSpan), -1, 1);
        aimHist.push({ a: aim, t }); while (aimHist.length && t - aimHist[0].t > 400) aimHist.shift();
        lock = s >= 0 ? target(aim, s) : null;
      }
      // the throw: a hand that was up comes down fast
      for (const w of [15, 16]) {
        const v = H.vel(w), p = H.at(w);
        if (!v || !p || cocked[w] == null || t - cocked[w] > 600) continue;
        const sp = Math.hypot(v.vx * aspect, v.vy);
        if (sp < QB.fast || v.vy < 0.4 || p.y < b.headY - QB.cock) continue;
        if (s < 0) return { say: 'Wait for the snap!' };
        const old = aimHist.find((h) => t - h.t <= 220) || { a: aim };
        const power = clamp((sp - QB.fast) / (QB.full - QB.fast), 0, 1);
        const tg = target(old.a, s);
        play.thrown = true; atts++; cocked = {};
        let out;
        if (!tg) {
          const p2 = { x: Math.tan(old.a * 0.9) * 22, z: 15 };
          out = { catch: false, at: p2, miss: true };
          ball = { from: t, land: t + 900, to: p2, out };
        } else {
          const R = ROUTES[tg.r.kind], openAt = isOpen(tg.r, s + tg.T);
          if (power + 0.02 < R.need) out = { catch: false, short: true, int: !openAt && rand() < 0.35, at: { x: tg.p.x * 0.7, z: tg.p.z * 0.6 } };
          else if (openAt || rand() < 0.4) {
            const yac = Math.round(openAt ? 2 + rand() * 6 : rand() * 2), gain = Math.max(1, Math.round(tg.p.z + yac));
            const td = tg.p.z + yac >= QB.endZone - 4;
            out = { catch: true, r: tg.r.kind, yards: gain, td, at: tg.p };
          } else out = { catch: false, int: rand() < 0.55, at: tg.p };
          if (out.catch) { comps++; yards += out.yards + (out.td ? QB.td : 0); if (out.td) tds++; }
          if (out.int) ints++;
          ball = { from: t, land: t + tg.T * 1000, to: out.at, out, r: tg.r };
        }
        lock = null;
        return { threw: { power, aim: old.a, target: tg && tg.r.kind }, say: 'Let it fly!', pitch: true };
      }
      if (s < 0) return { say: 'Ball up! Wait for the snap' };
      const open = play.recv.find((r) => isOpen(r, s));
      return { say: up ? (lock ? (isOpen(lock.r, s) ? 'OPEN! Throw it!' : 'Covered…') : 'Aim at a receiver') : open ? 'Ball up! Find the open man' : 'Ball up over your head' };
    },
  };
}

/* ===================================================================================================
   FREE THROWS: the camera on the free-throw line, the hoop ahead. Hold the ball at your chest and shoot
   it up over your head: a smooth, medium push drops it in (too soft falls short, too hard bricks off the
   back), hands in line with your nose keeps it straight. 45 seconds, as many makes as you can.
   =================================================================================================== */
export const HOOPS = { up: 0.9, full: 3.3, sweet: 0.5, band: 0.16, wide: 0.5, flight: 950 };
export function hoops({ mirror = false, range = [0, 1], rand = Math.random } = {}) {
  const H = hands();
  let makes = 0, shots = 0, streak = 0, best = 0, swishes = 0, shot = null, next = 0, low = {};
  return {
    get score() { return makes; }, get shots() { return shots; }, get best() { return best; }, get swishes() { return swishes; }, get streak() { return streak; },
    get shot() { return shot; },
    update(f) {
      const lm = f.lm || [], t = f.t, aspect = f.aspect || 1;
      H.push(lm, t);
      if (shot) {
        if (!shot.done) {
          if (t < shot.born + HOOPS.flight) return {};
          shot.done = true; shot.end = t; next = t + 700;
          const s = shot;
          if (s.make) { makes++; streak++; best = Math.max(best, streak); if (s.kind === 'swish') swishes++; return { rep: true, made: s, say: streak >= 3 ? `${streak} straight! On fire!` : s.kind === 'swish' ? 'SWISH!' : 'In off the rim!' }; }
          streak = 0;
          return { miss: s, say: s.kind === 'short' ? 'Short! A little more push' : s.kind === 'long' ? 'Long! Ease up' : s.kind === 'wide' ? 'Wide! Square up' : 'Rimmed out!' };
        }
        if (t < next) return {};
        shot = null;
      }
      const b = bodyOf(lm);
      if (!b) return { say: 'Step into the picture' };
      // the shot: the hands come up from below the chin to over the head, fast
      const ws = [15, 16].map((w) => ({ w, p: H.at(w) })).filter((o) => o.p);
      for (const { w, p } of ws) {
        if (p.y > b.headY + b.torso * 0.25) low[w] = t;
        const v = H.vel(w);
        if (low[w] == null || t - low[w] > 800 || p.y > b.headY - b.torso * 0.15 || !v || -v.vy < HOOPS.up) continue;
        const up = Math.max(-v.vy, H.peakUp(w)), power = clamp((up - HOOPS.up) / (HOOPS.full - HOOPS.up), 0, 1);
        const hx = ws.reduce((s, o) => s + o.p.x, 0) / ws.length;
        const lat = ((screenX(hx, mirror) - screenX(b.noseX, mirror)) * aspect) / (b.sw * aspect);
        const dErr = power - HOOPS.sweet, q = Math.hypot(dErr / HOOPS.band, lat / HOOPS.wide);
        let kind, make;
        if (q < 0.55) { kind = 'swish'; make = true; }
        else if (q < 1) { make = rand() < 1 - ((q - 0.55) / 0.45) * 0.75; kind = make ? 'rim' : 'rimout'; }
        else { make = false; kind = Math.abs(lat) / HOOPS.wide > Math.abs(dErr) / HOOPS.band ? 'wide' : dErr < 0 ? 'short' : 'long'; }
        shots++; low = {};
        shot = { born: t, power, lat: clamp(lat, -1.5, 1.5), dErr, kind, make, done: false };
        return { shot, say: 'Shot’s up…', pitch: true };
      }
      return { say: 'Ball at your chest… shoot!' };
    },
  };
}

/* ===================================================================================================
   TENNIS RALLY: the camera behind your baseline, the other player across the net. Each ball comes to
   your forehand or backhand; swing your racket hand across as it reaches you. Swing early to go
   cross-court, late to go down the line, hard into a corner for a winner. Every return is a point, a
   winner is 5. A whiff (or a swing too soft to clear the net) ends the rally.
   =================================================================================================== */
export const TENNIS = { min: 1.2, full: 2.8, win: 230, net: 0.12, court: 23.77, half: 4.115 };
export function tennis({ mirror = false, range = [0, 1], rand = Math.random } = {}) {
  let points = 0, returns = 0, winners = 0, rally = 0, best = 0, n = 0, ball = null, back = null, next = 900, swing = null, cool = 0;
  const hist = [];
  function feed(t, from) {
    n++;
    const side = rand() < 0.5 ? -1 : 1, dur = Math.max(950, 1550 - n * 18) * (0.9 + rand() * 0.2);
    ball = { id: n, born: t, dur, arrive: t + dur, side, from: from || { x: (rand() - 0.5) * 4, z: TENNIS.court }, bounce: { x: side * (0.6 + rand() * 0.5), z: 5 + rand() * 2.5 }, to: { x: side * 0.95, z: 0.4 } };
  }
  return {
    get score() { return points; }, get returns() { return returns; }, get winners() { return winners; }, get best() { return best; }, get rally() { return rally; },
    get ball() { return ball; }, get back() { return back; },
    update(f) {
      const lm = f.lm || [], t = f.t, aspect = f.aspect || 1;
      if (back && t >= back.land) {
        const bk = back; back = null;
        if (bk.winner) { next = t + 1300; return { say: 'WINNER!' }; }
        feed(t, bk.to);
      }
      const b = bodyOf(lm);
      // the swing: the hands sweep sideways fast between the head and the knees
      const hs = [15, 16, 19, 20].map((i) => lm[i]).filter((p) => seen(p, 0.45));
      let out = null;
      if (hs.length && b) {
        const hx = avg(hs, 'x'), hy = avg(hs, 'y');
        hist.push({ x: hx, y: hy, t }); while (hist.length && t - hist[0].t > 160) hist.shift();
        let o = hist[0];
        for (let i = hist.length - 1; i >= 0; i--) if (t - hist[i].t >= 60) { o = hist[i]; break; }
        const vx = o && t > o.t ? ((hx - o.x) * aspect) / ((t - o.t) / 1000) : 0;
        const inZone = hy > b.headY - 0.05 && hy < b.kneeY + 0.05;
        if (!swing && t >= cool && inZone && Math.abs(vx) >= TENNIS.min) swing = { t, speed: Math.abs(vx), vx, start: t };
        else if (swing) {
          if (Math.abs(vx) > swing.speed && Math.sign(vx) === Math.sign(swing.vx)) { swing.speed = Math.abs(vx); swing.t = t; swing.vx = vx; }
          if (Math.abs(vx) < TENNIS.min * 0.5 || t - swing.start > 170 || Math.sign(vx) !== Math.sign(swing.vx)) {
            const sw = swing; swing = null; cool = t + 400;
            if (ball && Math.abs(sw.t - ball.arrive) <= TENNIS.win) {
              const dt = sw.t - ball.arrive, power = clamp((sw.speed - TENNIS.min) / (TENNIS.full - TENNIS.min), 0, 1) * (0.6 + 0.4 * (1 - Math.abs(dt) / TENNIS.win));
              const dir = clamp(-dt / (TENNIS.win * 0.8), -1, 1) * -ball.side;     // early pulls it across, late sends it down the line
              const from = { x: ball.to.x, z: ball.to.z };
              ball = null;
              if (power < TENNIS.net) { rally = 0; next = t + 1200; out = { net: from, say: 'Into the net! Swing through it' }; }
              else {
                const land = { x: clamp(dir * 3.6, -3.9, 3.9), z: TENNIS.court - 1.5 - rand() * 3 };
                const winner = power >= 0.7 && Math.abs(dir) >= 0.55 && rand() < 0.55;
                returns++; rally++; best = Math.max(best, rally); points += winner ? 5 : 1; if (winner) { winners++; rally = 0; }
                back = { born: t, land: t + 900 - power * 250, from, to: land, power, winner };
                out = { rep: true, hit: { power, dir, winner, from }, say: winner ? 'WINNER! +5' : rally >= 5 ? `${rally}-shot rally!` : power > 0.7 ? 'Smoked it!' : 'Nice return!' };
              }
            }
          }
        }
      } else { hist.length = 0; swing = null; }
      if (out) return out;
      if (!ball && !back) { if (t >= next) { feed(t); return { pitch: true, say: 'Here it comes' }; } return { say: best ? `Best rally ${best}` : 'Ready…' }; }
      if (ball && t - ball.arrive > TENNIS.win && !swing) {
        const missed = ball; ball = null; rally = 0; next = t + 1200;
        return { miss: missed.to, say: 'Missed it! Swing as it gets to you' };
      }
      return { say: ball && (t - ball.born) / ball.dur > 0.6 ? 'SWING!' : 'Here it comes…' };
    },
  };
}
// Where a tennis ball is: coming in (over the net, a bounce, up to you) or going back.
export function tennisBall(bl, t) {
  const u = clamp((t - bl.born) / bl.dur, 0, 1.3), split = 0.62;
  if (u <= split) { const k = u / split; return { x: bl.from.x + (bl.bounce.x - bl.from.x) * k, z: bl.from.z + (bl.bounce.z - bl.from.z) * k, y: 1.0 * (1 - k) + 1.2 * 4 * k * (1 - k), u }; }
  const k = (u - split) / (1 - split), kk = Math.min(k, 1);
  return { x: bl.bounce.x + (bl.to.x - bl.bounce.x) * k, z: bl.bounce.z + (bl.to.z - bl.bounce.z) * k, y: Math.max(0, 0.95 * kk + 0.6 * 4 * kk * (1 - kk) - (k > 1 ? (k - 1) * 2 : 0)), u };
}
export function tennisBack(bk, t) {
  const k = clamp((t - bk.born) / (bk.land - bk.born), 0, 1);
  return { x: bk.from.x + (bk.to.x - bk.from.x) * k, z: bk.from.z + (bk.to.z - bk.from.z) * k, y: 0.95 * (1 - k) + 2.0 * 4 * k * (1 - k), k };
}

/* ===================================================================================================
   SEND IT! (JC, Nov 15 2026: "Put Send It in IRL and make it a flight path game where they move from side
   to side ... to stay up longer and hit updraft paths"). Send It!'s contraptions off the same pier, but
   flown with your body: flap your arms for three seconds to push it off (every flap is more speed), then
   step side to side to steer. It sinks all the way down; green updrafts lift it (they come in paths that
   snake across the water, so riding one leads to the next), red downdrafts shove it down, and arms out
   wide like wings glides farther (tip them to bank). Feet out from the pier when it splashes is the
   score. Feet and seconds; x across the water (±FLY.half), z out from the pier's edge, y up.
   =================================================================================================== */
export const FLY = { half: 40, deck: 60, push: 3000, sink: 4.4, grow: 1 / 300, lift: 16, down: 10, top: 80, wing: 0.8, steer: 34, base: 34, perPump: 1.6, pumpMax: 24, cap: 180 };
export const FLY_TITLES = [[0, 'Belly Flop'], [150, 'Pier Plunk'], [300, 'Seagull Status'], [600, 'Pelican Pro'], [1000, 'Sky Captain'], [1600, 'Thermal Ace'], [2500, 'SENT IT!']];
export const flyTitle = (ft) => FLY_TITLES.filter(([d]) => ft >= d).pop()[1];
// The air over the water: paths of updrafts that snake across, then open stretches with a downdraft or
// two to dodge, farther apart the farther out you get. Seeded, so two players fly the same sky.
export function makeAir(seed = 1) {
  const r = seeded(seed), zones = [];
  let z = 80, x = (r() - 0.5) * 36;
  while (z < 8000) {
    const n = 3 + Math.floor(r() * 3), dir = r() < 0.5 ? -1 : 1, step = 9 + r() * 12;
    for (let i = 0; i < n; i++) {
      const len = 60 + r() * 35;
      zones.push({ kind: 'up', x: clamp(x, -32, 32), z0: z, z1: z + len, r: 9 + r() * 4 });
      z += len + 16 + r() * 22;
      x += dir * step;
      if (Math.abs(x) > 30) x = clamp(x, -30, 30) - dir * step * 2;
    }
    const gap = 90 + r() * 90 + z / 40;
    for (let k = 0, dn = 1 + (r() < 0.55 ? 1 : 0); k < dn; k++) {
      const z0 = z + gap * (0.15 + k * 0.42);
      zones.push({ kind: 'down', x: clamp((r() - 0.5) * 60, -32, 32), z0, z1: z0 + 45 + r() * 25, r: 10 + r() * 5 });
    }
    z += gap;
    x = clamp(x + (r() - 0.5) * 34, -30, 30);
  }
  zones.sort((a, b) => a.z0 - b.z0);
  return {
    zones,
    at(px, pz) { for (const q of zones) { if (q.z0 > pz) break; if (pz <= q.z1 && Math.abs(px - q.x) <= q.r) return q; } return null; },
    next(pz, kind = 'up') { return zones.find((q) => q.kind === kind && q.z1 > pz + 5) || null; },
  };
}
export function sendIt({ mirror = false, range = [0, 1], seed = 1, craft = 'goat' } = {}) {
  const C = craftOf(craft), air = makeAir(seed), H = hands();
  const sinkMul = 1.25 - C.lift * 0.25, speedMul = 1.12 - C.drag * 0.12, steer = FLY.steer / C.mass;
  const s = { phase: 'push', craft: C.id, t0: null, pumps: 0, x: 0, camX: 0, y: PIER, z: -FLY.deck, vz: 0, vy: 0, roll: 0, zone: null, maxY: PIER, ups: 0, downs: 0, upT: 0, wings: false, flyT: 0, targetX: 0, speed: 0 };
  let lastT = null, dir = 0, ext = null, said = 0;
  return {
    craft: C, air, state: s,
    get score() { return Math.max(0, Math.round(s.z)); },
    get phase() { return s.phase; },
    get alt() { return Math.max(0, s.y); },
    get ups() { return s.ups; },
    get pumps() { return s.pumps; },
    update(f) {
      const lm = f.lm || [], t = f.t;
      const dt = lastT == null ? 0 : Math.min(0.1, (t - lastT) / 1000);
      lastT = t;
      H.push(lm, t);
      if (s.phase === 'done') return {};
      const b = bodyOf(lm);
      // where you stand in your part of the screen is where it heads across the water; arms out wide
      // glide it farther, and tipping them banks it
      let bank = 0;
      s.wings = false;
      if (b) {
        const u = inRange(screenX(b.cx, mirror), range);
        s.targetX = clamp((u - 0.5) * 2 * FLY.half * 1.3, -FLY.half + 2, FLY.half - 2);
        const l = H.at(15), r = H.at(16);
        if (l && r) {
          const out = Math.abs(l.x - r.x) > b.sw * 2.2, level = Math.abs(l.y - b.shY) < b.torso * 0.6 && Math.abs(r.y - b.shY) < b.torso * 0.6;
          s.wings = out && level;
          // the hand on the screen's right lower than the left banks right
          const [L, R] = screenX(l.x, mirror) < screenX(r.x, mirror) ? [l, r] : [r, l];
          if (out) bank = clamp((R.y - L.y) / (b.sw * 1.2), -1, 1);
          s.targetX = clamp(s.targetX + bank * 14, -FLY.half + 2, FLY.half - 2);
        }
      }
      if (s.phase === 'push') {
        s.t0 ??= t;
        // a flap: both hands (their middle) going down then back up by a good bit
        const hs = [H.at(15), H.at(16)].filter(Boolean);
        if (hs.length && b) {
          const y = hs.reduce((a, p) => a + p.y, 0) / hs.length, amp = b.torso * 0.22;
          if (ext == null) { ext = y; dir = 0; }
          else if (dir >= 0) { if (y > ext) ext = y; else if (ext - y > amp) { dir = -1; ext = y; } }
          else { if (y < ext) ext = y; else if (y - ext > amp) { dir = 1; ext = y; s.pumps++; } }
        }
        const k = Math.min(1, (t - s.t0) / FLY.push);
        s.z = -FLY.deck + FLY.deck * k * k;
        s.x += (s.targetX * 0.3 - s.x) * Math.min(1, dt * 2);
        s.camX = s.x;
        if (k >= 1) {
          s.phase = 'fly';
          s.speed = s.vz = (FLY.base + Math.min(FLY.pumpMax, s.pumps * FLY.perPump)) * speedMul;
          return { launched: { speed: s.vz, pumps: s.pumps }, say: 'SEND IT!' };
        }
        return { say: 'Flap your arms to push off!', meter: Math.min(1, (s.pumps * FLY.perPump) / FLY.pumpMax) };
      }
      // flying
      s.flyT += dt;
      const zone = air.at(s.x, s.z);
      const sink = (FLY.sink + s.z * FLY.grow) * sinkMul * (s.wings ? FLY.wing : 1);
      s.vy = -sink + (zone && zone.kind === 'up' ? FLY.lift : zone ? -FLY.down : 0);
      s.y = Math.min(FLY.top, s.y + s.vy * dt);
      s.z += s.vz * dt;
      const dx = s.targetX - s.x;
      s.x += clamp(dx, -steer * dt, steer * dt);
      s.camX += (s.x - s.camX) * Math.min(1, dt * 3);
      s.roll += (clamp(dx / 22, -0.6, 0.6) + bank * 0.25 - s.roll) * Math.min(1, dt * 5);
      s.maxY = Math.max(s.maxY, s.y);
      if (zone && zone.kind === 'up') s.upT += dt;
      let ev = {};
      if (zone !== s.zone) {
        if (zone && zone.kind === 'up') { s.ups++; ev = { updraft: zone, say: 'Updraft! Ride it up' }; }
        else if (zone) { s.downs++; ev = { downdraft: zone, say: 'Downdraft! Get out of it' }; }
        s.zone = zone;
      }
      if (s.y <= 0 || s.flyT > FLY.cap) {
        s.y = Math.max(0, s.y); s.phase = 'done';
        return { splash: true, done: true, say: `Splash! ${Math.round(s.z)} feet` };
      }
      if (ev.say) return ev;
      // the coach: toward the next updraft, or to spread your wings
      const nx = air.next(s.z);
      if (t - said > 900 && !zone) {
        said = t;
        if (nx && nx.z0 - s.z < 220 && Math.abs(nx.x - s.x) > nx.r) return { say: nx.x > s.x ? 'Updraft ahead: move right ▶' : '◀ Updraft ahead: move left' };
        if (!s.wings) return { say: 'Arms out like wings to glide' };
        return { say: s.y < 10 ? 'Low! Find an updraft' : 'Gliding…' };
      }
      return {};
    },
  };
}
