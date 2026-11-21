// Color by Numbers: the rest of the cast (birds, sea friends, bugs, dinos, dragons) and the dolls.
// Each is drawn around its own center, about 300 tall, the same chibi way as the critters.
import { INK, darker, lighter, eyes, cheeks, smile } from './art-kit.mjs';
import { prop, accessory } from './art-props.mjs';

const ORANGE = '#ffa23a';

export function friend(p, kind, o = {}) { (FRIENDS[kind] || FRIENDS.chick)(p, o); }

const FRIENDS = {
  owl(p, o) {
    const c = o.c || '#a77bd6', light = o.light || '#f1e3ff';
    for (const s of [-1, 1]) p.fill(p.blob([[s * 30, -96], [s * 70, -140], [s * 84, -80]], 0.4), c);
    const body = p.ell(0, 10, 92, 112);
    p.fill(body, c);
    p.shade(body, p.ell(-14, -4, 92, 112), c);
    const belly = p.ell(0, 56, 58, 62);
    p.fill(belly, light, { clip: body });
    for (const [x, y] of [[-24, 34], [0, 34], [24, 34], [-12, 60], [12, 60], [-24, 86], [0, 86], [24, 86]]) p.line(p.curve([[x - 8, y], [x, y + 7], [x + 8, y]]), 2, darker(light, 0.3));
    for (const s of [-1, 1]) p.fill(p.ell(s * 88, 30, 24, 54, s * -12), darker(c, 0.15));
    for (const s of [-1, 1]) p.fill(p.circ(s * 36, -40, 36), o.disc || '#fff6e8');
    eyes(p, 36, -40, { rx: 13, ry: 15, kind: o.eyes || 'open' });
    p.fill(p.blob([[-10, -18], [10, -18], [0, -2]], 0.6), ORANGE, { t: 1, keep: true });
    for (const s of [-1, 1]) p.fill(p.blob([[s * 18, 118], [s * 30, 112], [s * 42, 118], [s * 30, 128]], 0.8), ORANGE, { t: 1, keep: true });
    cheeks(p, 62, -12);
    if (o.acc) for (const a of o.acc) accessory(p, a, { head: [80, 90, -40] });
  },
  penguin(p, o) {
    const c = o.c || '#3f4a6b';
    for (const s of [-1, 1]) p.fill(p.ell(s * 44, 128, 26, 12), ORANGE);
    const body = p.ell(0, 16, 84, 116);
    p.fill(body, c);
    for (const s of [-1, 1]) p.fill(p.ell(s * 84, 34, 20, 50, s * -20), darker(c, 0.1));
    const front = p.blob([[0, -56], [30, -86], [62, -64], [62, -20], [56, 60], [0, 118], [-56, 60], [-62, -20], [-62, -64], [-30, -86]], 0.9);
    p.fill(front, '#ffffff', { clip: body });
    p.shade(body, p.ell(-12, 4, 84, 116), c);
    eyes(p, 28, -42, { kind: o.eyes || 'open' });
    p.fill(p.blob([[-12, -24], [12, -24], [0, -8]], 0.6), ORANGE);
    cheeks(p, 46, -18);
    if (o.acc) for (const a of o.acc) accessory(p, a, { head: [70, 70, -40], c: o.accC });
  },
  chick(p, o) {
    const c = o.c || '#ffd84a';
    if (o.egg) p.fill(p.ell(0, 70, 84, 70), '#fffaf0', { t: 0 });
    for (const s of [-1, 1]) p.fill(p.blob([[s * 30, -92], [s * 4, -120], [s * 10, -88]], 0.6), c);
    const body = p.ell(0, 10, 92, 96);
    p.fill(body, c);
    p.shade(body, p.ell(-12, -2, 92, 96), c);
    for (const s of [-1, 1]) p.fill(p.ell(s * 88, 30, 20, 34, s * -30), darker(c, 0.06));
    eyes(p, 32, -18, { kind: o.eyes || 'open' });
    p.fill(o.duck ? p.ell(0, 10, 22, 11) : p.blob([[-12, 0], [12, 0], [0, 16]], 0.6), ORANGE);
    cheeks(p, 52, 8);
    if (!o.egg) for (const s of [-1, 1]) p.fill(p.blob([[s * 16, 104], [s * 30, 98], [s * 44, 104], [s * 30, 114]], 0.8), ORANGE, { t: 1, keep: true });
    if (o.egg) {
      const shell = p.poly([[-90, 40], [-70, 20], [-50, 44], [-30, 18], [-10, 44], [10, 18], [30, 44], [50, 18], [70, 44], [90, 22], [86, 90], [60, 130], [0, 142], [-60, 130], [-86, 90]]);
      p.fill(shell, o.shell || '#fff3e0');
      p.fill(p.wave(-100, 100, 92, 5, 4, 104), '#bfe8ff', { clip: shell, t: 1, keep: true });
    }
    if (o.acc) for (const a of o.acc) accessory(p, a, { head: [70, 70, -40], c: o.accC });
  },
  fish(p, o) {
    const c = o.c || ORANGE;
    p.fill(p.blob([[60, 0], [124, -56], [112, 0], [124, 56]], 0.6), darker(c, 0.08));
    p.fill(p.blob([[-40, -60], [10, -98], [40, -60]], 0.6), darker(c, 0.08));
    const body = p.ell(-10, 0, 100, 70);
    p.fill(body, c);
    if (o.stripes) for (const x of [-50, 10]) p.fill(p.ell(x, 0, 14, 80), '#ffffff', { clip: body });
    p.shade(body, p.ell(-20, -12, 100, 70), c);
    p.fill(p.ell(10, 30, 26, 14, -24), darker(c, 0.12), { t: 1, keep: true });
    p.ink(p.circ(-60, -14, 13), INK); p.ink(p.circ(-56, -18, 5), '#ffffff');
    smile(p, -76, 16, 9);
    p.fill(p.ell(-40, 14, 10, 6), '#ff9fbf', { t: 1, keep: true, w: 0 });
  },
  whale(p, o) {
    const c = o.c || '#7fb6ff', light = o.light || '#e3f1ff';
    if (o.spout !== false) { p.fill(p.blob([[-20, -120], [-40, -170], [-10, -150], [0, -186], [10, -150], [40, -170], [20, -120]], 0.8), '#bfe8ff'); }
    p.fill(p.blob([[110, -10], [150, -60], [176, -40], [150, -10], [176, 20], [150, 30]], 0.7), c);
    const body = p.blob([[-150, 10], [-120, -90], [0, -112], [110, -50], [130, 20], [60, 80], [-60, 90], [-140, 60]], 0.9);
    p.fill(body, c);
    p.fill(p.blob([[-150, 30], [-60, 40], [40, 46], [110, 30], [60, 88], [-60, 96], [-140, 64]], 0.9), light, { clip: body });
    for (const y of [56, 72]) p.line(p.curve([[-110, y], [-40, y + 6], [30, y]]), 2, darker(light, 0.25));
    p.shade(body, p.blob([[-162, 0], [-132, -100], [-12, -122], [98, -60], [118, 10], [48, 70], [-72, 80], [-152, 50]], 0.9), c);
    p.fill(p.ell(-20, 40, 26, 14, 30), darker(c, 0.1), { t: 1, keep: true });
    if (o.horn) {
      const tusk = p.blob([[-128, -60], [-200, -150], [-118, -76]], 0.3);
      p.fill(tusk, '#fff3c4');
      for (const k of [0.3, 0.55, 0.78]) { const x = -128 + (-200 + 128) * k, y = -64 + (-150 + 64) * k; p.line(p.curve([[x - 6, y + 8], [x + 8, y - 2]]), 1.8, darker('#fff3c4', 0.35)); }
    }
    p.ink(p.ell(-86, -24, 11, 13), INK); p.ink(p.circ(-82, -29, 4.5), '#ffffff');
    smile(p, -110, 2, 14);
    p.fill(p.ell(-60, 0, 13, 8), '#ff9fbf', { t: 1, keep: true, w: 0 });
  },
  octopus(p, o) {
    const c = o.c || '#ff8fc8';
    const tents = [[-96, 30, -150, 110], [-50, 50, -80, 140], [0, 56, 0, 150], [50, 50, 80, 140], [96, 30, 150, 110]];
    for (const [x0, y0, x1, y1] of tents) {
      const sx = Math.sign(x1) || 1;
      p.fill(p.blob([[x0 - 22, y0], [x0 + 22, y0], [x1 + 10 * sx, y1 - 30], [x1 + 30 * sx, y1], [x1, y1 + 14], [x1 - 14 * sx, y1 - 10], [x0 - 12, y0 + 50]], 0.85), darker(c, 0.06));
    }
    const head = p.ell(0, -30, 104, 96);
    p.fill(head, c);
    for (const [x, y, r] of [[-50, -84, 12], [40, -96, 9], [62, -54, 7], [-20, -110, 6]]) p.fill(p.circ(x, y, r), lighter(c, 0.4), { clip: head, t: 1, keep: true });
    p.shade(head, p.ell(-14, -44, 104, 96), c);
    eyes(p, 36, -18, { rx: 12, ry: 14, kind: o.eyes || 'open' });
    smile(p, 0, 16, 12, 'open');
    cheeks(p, 64, 6);
    if (o.acc) for (const a of o.acc) accessory(p, a, { head: [100, 96, -30], c: o.accC });
  },
  turtle(p, o) {
    const c = o.c || '#8fd16a', shellC = o.shell || '#6aa84f';
    for (const x of [-70, -30, 40, 80]) p.fill(p.ell(x, 50, 18, 22), c);
    p.fill(p.ell(-118, 30, 14, 9), c);
    p.fill(p.circ(118, -10, 42), c);
    p.ink(p.ell(126, -18, 8, 10), INK); p.ink(p.circ(129, -22, 3.5), '#ffffff');
    smile(p, 132, 6, 9);
    p.fill(p.ell(144, 0, 8, 5), '#ff9fbf', { t: 1, keep: true, w: 0 });
    const shell = `M${p.pt(-120, 40)}C${p.pt(-120, -90)} ${p.pt(110, -90)} ${p.pt(110, 40)}Z`;
    p.fill(shell, shellC);
    p.fill(p.poly([[-26, -36], [22, -36], [40, -6], [22, 24], [-26, 24], [-44, -6]]), lighter(shellC, 0.25), { clip: shell, t: 1, keep: true });
    for (const [x, y] of [[-80, -4], [70, -4], [-4, -64]]) p.fill(p.circ(x, y, 20), lighter(shellC, 0.25), { clip: shell, t: 2, keep: true });
    p.fill(p.rrect(-128, 30, 246, 22, 11), o.rim || '#ffe08a');
  },
  crab(p, o) {
    const c = o.c || '#ff6f61';
    for (const s of [-1, 1]) for (const k of [0, 1, 2]) p.fill(p.ell(s * (60 + k * 22), 56 + k * 4, 9, 26, s * (40 + k * 12)), darker(c, 0.1));
    for (const s of [-1, 1]) {
      p.line(p.curve([[s * 70, 0], [s * 100, -40], [s * 110, -70]]), 7, darker(c, 0.1));
      p.fill(p.blob([[s * 96, -64], [s * 140, -112], [s * 150, -80], [s * 122, -76], [s * 146, -54], [s * 120, -40]], 0.8), c);
    }
    for (const s of [-1, 1]) p.line(p.curve([[s * 24, -40], [s * 30, -80]]), 5);
    for (const s of [-1, 1]) { p.ink(p.circ(s * 30, -86, 14), '#ffffff', { w: 3 }); p.ink(p.circ(s * 30, -84, 7), INK); }
    const body = p.ell(0, 10, 100, 64);
    p.fill(body, c);
    p.shade(body, p.ell(-12, -2, 100, 64), c);
    smile(p, 0, 18, 14, 'open');
    cheeks(p, 54, 6);
  },
  seal(p, o) {
    const c = o.c || '#eef2f8';
    for (const s of [-1, 1]) p.fill(p.ell(s * 50, 120, 46, 14, s * 10), darker(c, 0.06));
    const body = p.blob([[0, -120], [70, -96], [92, -10], [96, 80], [50, 124], [-50, 124], [-96, 80], [-92, -10], [-70, -96]], 0.9);
    p.fill(body, c);
    p.shade(body, p.blob([[-12, -132], [58, -108], [80, -22], [84, 68], [38, 112], [-62, 112], [-108, 68], [-104, -22], [-82, -108]], 0.9), c);
    for (const s of [-1, 1]) p.fill(p.ell(s * 84, 50, 18, 42, s * -28), darker(c, 0.06));
    eyes(p, 34, -50, { rx: 13, ry: 16, kind: o.eyes || 'open' });
    p.ink(p.blob([[-10, -26], [10, -26], [0, -16]], 0.7), INK);
    smile(p, 0, -6, 9, 'w');
    for (const s of [-1, 1]) for (const dy of [-6, 4]) p.line(p.curve([[s * 24, -16 + dy], [s * 64, -20 + dy * 2]]), 2);
    cheeks(p, 58, -20);
    if (o.acc) for (const a of o.acc) accessory(p, a, { head: [70, 70, -60], c: o.accC });
  },
  frog(p, o) {
    const c = o.c || '#7ed36f', light = o.light || '#e6f7c8';
    for (const s of [-1, 1]) p.fill(p.ell(s * 66, 118, 40, 16), c);
    const body = p.ell(0, 66, 76, 64);
    p.fill(body, c);
    p.fill(p.ell(0, 80, 48, 44), light, { clip: body });
    for (const s of [-1, 1]) p.fill(p.ell(s * 44, 92, 18, 28, s * -10), darker(c, 0.08));
    for (const s of [-1, 1]) p.fill(p.circ(s * 52, -80, 34), c);
    const head = p.ell(0, -30, 104, 66);
    p.fill(head, c);
    p.shade(head, p.ell(-12, -40, 104, 66), c);
    for (const s of [-1, 1]) p.fill(p.circ(s * 52, -82, 24), '#ffffff', { t: 1, keep: true });
    eyes(p, 52, -82, { rx: 11, ry: 13, kind: o.eyes || 'open' });
    p.line(p.curve([[-50, -14], [0, 8], [50, -14]]), 3.4);
    cheeks(p, 70, -20);
    if (o.acc) for (const a of o.acc) accessory(p, a, { head: [90, 60, -60], c: o.accC });
  },
  dino(p, o) {
    const c = o.c || '#8fd16a', light = o.light || '#e9f8c9', spike = o.spike || '#ffb03a';
    // back plates first
    for (const [x, y, r] of [[-134, 30, -60], [-100, -10, -40], [-56, -40, -20], [-6, -50, 0]]) p.fill(p.blob([[x - 16, y + 10], [x, y - 26], [x + 16, y + 10]], 0.4), spike, { t: o.wings ? 1 : 0, keep: true });
    if (o.wings) for (const s of [0]) p.fill(p.blob([[-30, -30], [-80, -130], [-30, -110], [0, -150], [20, -96], [60, -110], [30, -20]], 0.6), o.wingC || lighter(c, 0.3));
    for (const x of [-60, 20]) p.fill(p.rrect(x - 20, 60, 40, 70, 18), c);
    p.fill(p.blob([[-40, 60], [-170, 70], [-196, 40], [-150, 40], [-60, 0]], 0.8), c);
    const body = p.ell(-20, 40, 96, 74);
    p.fill(body, c);
    p.fill(p.ell(-6, 66, 56, 46), light, { clip: body });
    if (o.spots !== false) for (const [x, y, r] of [[-70, 10, 10], [-40, -10, 7], [-90, 40, 6]]) p.fill(p.circ(x, y, r), darker(c, 0.18), { clip: body, t: 1, keep: true });
    const head = p.ell(70, -60, 80, 70);
    p.fill(head, c);
    p.shade(head, p.ell(58, -72, 80, 70), c);
    p.fill(p.ell(110, -36, 46, 30), light, { clip: head, t: 1, keep: true });
    if (o.horns) for (const x of [44, 92]) p.fill(p.blob([[x - 10, -118], [x, -150], [x + 10, -118]], 0.5), '#fff3c4');
    for (const x of [44, 100]) { p.ink(p.ell(x, -70, 10, 12), INK); p.ink(p.circ(x + 3, -74, 4), '#ffffff'); }
    smile(p, 76, -38, 14);
    for (const x of [24, 124]) p.fill(p.ell(x, -46, 11, 7), '#ff9fbf', { t: 1, keep: true, w: 0 });
    for (const [x, y, r] of [[38, 4, -50], [58, 18, -30]]) p.fill(p.ell(x, y, 9, 17, r), c);
    if (o.prop) { p.push(30, 34, 0.8); prop(p, o.prop, o.propOpts || {}); p.pop(); }
  },
  butterfly(p, o) {
    const c = o.c || '#b48cff', c2 = o.c2 || '#ff8fc8';
    for (const s of [-1, 1]) {
      const up = p.ell(s * 84, -50, 76, 66, s * -20);
      p.fill(up, c);
      p.fill(p.circ(s * 96, -60, 24), c2, { clip: up, t: 1, keep: true });
      const lo = p.ell(s * 62, 60, 52, 50, s * 20);
      p.fill(lo, c2);
      p.fill(p.circ(s * 66, 66, 16), c, { clip: lo, t: 2, keep: true });
    }
    for (const s of [-1, 1]) { p.line(p.curve([[s * 8, -86], [s * 22, -130], [s * 40, -146]]), 3); p.ink(p.circ(s * 40, -146, 7), INK); }
    p.fill(p.rrect(-16, -60, 32, 150, 16), '#6b4f6f');
    p.fill(p.circ(0, -70, 30), '#6b4f6f');
    eyes(p, 12, -72, { rx: 5, ry: 7 });
    smile(p, 0, -58, 6);
  },
  bee(p, o) {
    p.fill(p.ell(-6, -78, 34, 46, -20), '#e3f5ff');
    p.fill(p.ell(40, -70, 30, 40, 20), '#e3f5ff');
    p.fill(p.poly([[96, 14], [124, 0], [96, -8]]), INK, { t: 1, keep: true });
    const body = p.ell(0, 0, 104, 76);
    p.fill(body, '#ffd84a');
    for (const x of [8, 52]) p.fill(p.rect(x, -90, 22, 180), '#4a3a40', { clip: body });
    p.shade(body, p.ell(-12, -10, 104, 76), '#ffd84a');
    for (const s of [-1, 1]) { p.line(p.curve([[-56 + s * 12, -70], [-58 + s * 26, -112]]), 3); p.ink(p.circ(-58 + s * 26, -116, 6), INK); }
    p.push(-54, 0);
    eyes(p, 20, -10, { rx: 9, ry: 11 });
    smile(p, 0, 14, 9);
    cheeks(p, 34, 6, '#ff9fbf', 9, 6);
    p.pop();
  },
  ladybug(p, o) {
    p.fill(p.circ(0, -78, 46), '#4a3a40');
    eyes(p, 18, -84, { rx: 7, ry: 9 });
    smile(p, 0, -64, 8);
    const shell = p.circ(0, 20, 100);
    p.fill(shell, o.c || '#ff5a5a');
    for (const [x, y, r] of [[-46, -20, 18], [46, -20, 18], [-56, 46, 14], [56, 46, 14], [-24, 84, 12], [24, 84, 12]]) p.fill(p.circ(x, y, r), '#4a3a40', { clip: shell, t: 1, keep: true });
    p.line(p.curve([[0, -80], [0, 120]]), 3);
    p.shade(shell, p.circ(-12, 8, 100), o.c || '#ff5a5a');
  },
  snail(p, o) {
    p.fill(p.blob([[-150, 90], [-130, 50], [60, 50], [130, 20], [140, -40], [160, -50], [168, 30], [120, 90]], 0.8), o.body || '#ffd9a8');
    for (const s of [-1, 1]) { p.line(p.curve([[130 + s * 8, -36], [130 + s * 20, -80]]), 3); p.ink(p.circ(130 + s * 20, -84, 6), INK); }
    const shell = p.circ(-30, -20, 86);
    p.fill(shell, o.c || '#b48cff');
    p.fill(p.circ(-24, -16, 54), lighter(o.c || '#b48cff', 0.3), { t: 1, keep: true });
    p.fill(p.circ(-20, -12, 24), o.c || '#b48cff', { t: 2, keep: true });
    p.ink(p.ell(142, -2, 6, 8), INK);
    smile(p, 150, 18, 7);
  },
};

// ---- the dolls ----
export const SKIN = ['#f9d7c0', '#f1c19a', '#d9a17a', '#b07a55', '#8a5a3c'];
export const HAIR = { brown: '#6b4430', blonde: '#f2c96a', black: '#3a2d3a', red: '#c4603a', pink: '#ff9fcf', lilac: '#b79cff', blue: '#7fc8ff' };

// o: { skin, hair, style: long|pigtails|buns|bob|curly|ponytail, dress, dress2, outfit: dress|princess|fairy|ballerina|mermaid|astronaut|coat|overalls, acc, prop, pose: 'sit'|'head', eyes }
export function doll(p, o = {}) {
  const skin = o.skin || SKIN[0], hair = o.hair || HAIR.brown, dress = o.dress || '#ff8fc8', dress2 = o.dress2 || lighter(dress, 0.45);
  const style = o.style || 'long', outfit = o.outfit || 'dress';
  const HY = -64, hr = 72;
  const head = p.ell(0, HY, hr, hr - 2);
  const full = o.pose !== 'head';
  const acc = o.acc || [];

  // behind: wings, long hair, pigtails
  if (outfit === 'fairy' || acc.includes('wings')) accessory(p, 'wings', { c: o.wingC || '#c9f0ff' });
  if (style === 'long') p.fill(p.blob([[-74, HY - 30], [-88, HY + 60], [-80, HY + 110], [-40, HY + 120], [40, HY + 120], [80, HY + 110], [88, HY + 60], [74, HY - 30], [0, HY - 80]], 0.9), hair);
  if (style === 'curly') p.fill(p.star(0, HY + 6, 104, 90, 14), hair);
  if (style === 'bob') p.fill(p.blob([[-80, HY - 20], [-86, HY + 50], [-60, HY + 66], [60, HY + 66], [86, HY + 50], [80, HY - 20], [0, HY - 80]], 0.9), hair);
  if (style === 'pigtails') for (const s of [-1, 1]) { p.fill(p.blob([[s * 64, HY - 20], [s * 110, HY + 10], [s * 118, HY + 70], [s * 96, HY + 96], [s * 84, HY + 40]], 0.9), hair); }
  if (style === 'ponytail') p.fill(p.blob([[20, HY - 70], [80, HY - 96], [118, HY - 40], [110, HY + 40], [90, HY - 10], [60, HY - 50]], 0.9), hair);
  if (style === 'buns') for (const s of [-1, 1]) p.fill(p.circ(s * 54, HY - 60, 28), hair);

  if (full) {
    // legs and shoes (or a mermaid's tail)
    if (outfit === 'mermaid') {
      const tail = p.blob([[-50, 40], [50, 40], [40, 100], [20, 130], [60, 150], [70, 172], [10, 160], [0, 140], [-10, 160], [-70, 172], [-60, 150], [-20, 130], [-40, 100]], 0.85);
      p.fill(tail, o.tail || '#5fd0c0');
      for (const y of [70, 100]) p.line(p.curve([[-30, y], [-15, y + 8], [0, y], [15, y + 8], [30, y]]), 2, darker(o.tail || '#5fd0c0', 0.3));
      p.fill(p.blob([[0, 140], [-10, 160], [-70, 172], [-60, 150], [-20, 130]], 0.85), darker(o.tail || '#5fd0c0', 0.1), { t: 1, keep: true });
      p.fill(p.blob([[0, 140], [10, 160], [70, 172], [60, 150], [20, 130]], 0.85), darker(o.tail || '#5fd0c0', 0.1), { t: 1, keep: true });
    } else {
      for (const s of [-1, 1]) {
        p.fill(p.rrect(s * 22 - 10, 80, 20, 54, 9), outfit === 'astronaut' ? '#f4f6fb' : outfit === 'overalls' ? '#7fb6ff' : skin);
        p.fill(p.ell(s * 26, 136, 20, 11), o.shoes || (outfit === 'ballerina' ? '#ffb3d1' : outfit === 'astronaut' ? '#9aa6c4' : '#b06a8a'));
      }
    }
    // the dress
    if (outfit === 'ballerina') {
      p.fill(p.rrect(-34, 4, 68, 62, 20), dress);
      p.fill(p.star(0, 64, 92, 76, 14, 0), dress2);
    } else if (outfit === 'mermaid') {
      p.fill(p.rrect(-32, 6, 64, 46, 18), skin);
      for (const s of [-1, 1]) p.fill(p.circ(s * 16, 20, 15), o.top || '#b48cff');
    } else if (outfit === 'astronaut') {
      p.fill(p.rrect(-46, 2, 92, 90, 26), '#f4f6fb');
      p.fill(p.rrect(-20, 30, 40, 26, 6), o.badge || '#7fb6ff', { t: 1, keep: true });
      p.fill(p.circ(-8, 43, 5), '#ff6f6f', { t: 2, keep: true }); p.fill(p.circ(8, 43, 5), '#ffd84a', { t: 2, keep: true });
    } else if (outfit === 'coat') {
      p.fill(p.blob([[-40, 4], [40, 4], [62, 96], [0, 104], [-62, 96]], 0.7), dress);
      p.line(p.curve([[0, 10], [0, 100]]), 2.4);
      for (const y of [36, 64]) p.fill(p.circ(10, y, 5), dress2, { t: 1, keep: true, w: 2 });
      p.fill(p.rrect(-62, 88, 124, 16, 8), '#ffffff', { t: 1, keep: true });
    } else if (outfit === 'overalls') {
      p.fill(p.rrect(-40, 4, 80, 60, 18), dress);
      p.fill(p.rrect(-38, 30, 76, 62, 16), '#7fb6ff');
      p.fill(p.rrect(-16, 36, 32, 20, 5), lighter('#7fb6ff', 0.4), { t: 1, keep: true });
    } else {
      const skirt = p.blob([[-30, 4], [30, 4], [44, 50], [72, 96], [0, 106], [-72, 96], [-44, 50]], 0.6);
      p.fill(skirt, dress);
      if (outfit === 'princess') { p.fill(p.wave(-80, 80, 72, 7, 5, 120), dress2, { clip: skirt, t: 1, keep: true }); for (const s of [-1, 1]) p.fill(p.circ(s * 34, 14, 17), dress2); }
      if (o.rainbow) for (const [i, cc] of ['#ff8fa8', '#ffd84a', '#8fd16a', '#7fc8ff'].entries()) p.fill(p.rect(-90, 48 + i * 14, 180, 14), cc, { clip: skirt, t: i % 2 ? 1 : 0, keep: true });
      if (o.dots) for (const [x, y] of [[-30, 70], [0, 60], [30, 76], [-12, 90], [18, 40], [-20, 36]]) p.fill(p.circ(x, y, 5), '#ffffff', { clip: skirt, t: 2, keep: true, w: 1.6 });
      if (o.apron) p.fill(p.rrect(-26, 40, 52, 50, 10), '#ffffff', { t: 1, keep: true });
      if (outfit === 'fairy') p.fill(p.wave(-80, 80, 88, 8, 6, 120), dress2, { clip: skirt, t: 1, keep: true });
    }
    // arms
    const armC = outfit === 'astronaut' ? '#f4f6fb' : outfit === 'coat' ? o.dress : skin;
    if (o.prop) {
      p.push(0, 56, o.propScale || 0.8); prop(p, o.prop, o.propOpts || {}); p.pop();
      for (const s of [-1, 1]) { p.fill(p.rrect(s * 40 - 9, 14, 18, 44, 9), armC, { t: 0 }); p.fill(p.circ(s * 30, 56, 10), outfit === 'astronaut' ? '#9aa6c4' : skin); }
    } else {
      for (const s of [-1, 1]) { p.fill(p.ell(s * 48, 40, 10, 32, s * -20), armC); p.fill(p.circ(s * 58, 70, 10), outfit === 'astronaut' ? '#9aa6c4' : skin); }
    }
    if (outfit === 'astronaut') p.line(p.circ(0, HY, 90), 3.4);
  } else {
    p.fill(p.rrect(-22, -10, 44, 54, 16), skin);
    p.fill(p.ell(0, 112, 112, 78), dress);
    p.fill(p.blob([[-26, 34], [0, 52], [26, 34], [34, 46], [0, 68], [-34, 46]], 0.8), dress2, { t: 1, keep: true });
  }

  // the head
  p.fill(head, skin);
  p.shade(head, p.ell(-10, HY - 10, hr, hr - 2), skin);
  eyes(p, 28, HY + 8, { rx: 10, ry: 13, kind: o.eyes || 'open', lashes: true });
  smile(p, 0, HY + 34, 9, o.mouth || 'smile');
  cheeks(p, 46, HY + 26, '#ff9fb0');
  // the front of the hair
  const bangs = style === 'curly'
    ? p.blob([[-70, HY - 10], [-50, HY - 66], [0, HY - 80], [50, HY - 66], [70, HY - 10], [44, HY - 34], [20, HY - 22], [0, HY - 38], [-20, HY - 22], [-44, HY - 34]], 0.9)
    : p.blob([[-74, HY + 10], [-66, HY - 48], [-20, HY - 78], [30, HY - 76], [70, HY - 46], [74, HY + 6], [56, HY - 26], [30, HY - 30], [8, HY - 40], [-14, HY - 24], [-40, HY - 30], [-60, HY - 10]], 0.9);
  p.fill(bangs, hair);
  p.fill(p.ell(-30, HY - 54, 14, 6, -20), lighter(hair, 0.35), { t: 2, keep: true, w: 0 });
  if (style === 'pigtails') for (const s of [-1, 1]) p.fill(p.circ(s * 70, HY - 10, 9), o.tie || '#ff6f91', { t: 1, keep: true });
  for (const a of acc) if (a !== 'wings') accessory(p, a, { head: [hr, hr - 2, HY], c: o.accC });
  if (outfit === 'princess' && !acc.includes('tiara') && !acc.includes('crown')) accessory(p, 'tiara', { head: [hr, hr - 2, HY] });
  if (outfit === 'fairy' && !o.prop) { p.push(70, 60, 0.8); prop(p, 'wand', {}); p.pop(); }
}
