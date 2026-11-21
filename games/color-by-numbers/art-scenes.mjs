// Color by Numbers: the places (backgrounds drawn on the whole 400 x 400 page) and the big things that
// can be a picture on their own (a castle, a hot air balloon, a rocket...).
import { INK, darker, lighter, face, cheeks } from './art-kit.mjs';
import { prop } from './art-props.mjs';

const SKY = '#bfe6ff', GRASS = '#7cc96a', WHITE = '#ffffff';
const bg = (o = {}) => ({ bg: true, ...o });

export function scene(p, kind, o = {}) { (SCENES[kind] || SCENES.meadow)(p, o); }

function sky(p, c) { p.fill(p.rect(0, 0, 400, 400), c, bg()); }
function ground(p, c, y = 300, amp = 6) { p.fill(p.wave(-10, 410, y, amp, 3, 410), c, bg()); }
function sun(p, x, y, r = 34, c = '#ffd84a', faceIt = false) { p.fill(p.circ(x, y, r), c); if (faceIt) face(p, x, y + 2, r / 40); }
function cloud(p, x, y, w, h, t = 0, c = WHITE) { p.fill(p.cloud(x, y, w, h, w > 100 ? 4 : 3), c, { t, keep: true }); }
function flowers(p, at, t = 1) {
  for (const [x, y, c] of at) { p.fill(p.star(x, y, 13, 8, 5), c, { t, keep: true }); p.fill(p.circ(x, y, 4.5), '#ffe066', { t: t + 1, keep: true, w: 1.6 }); }
}
function tulip(p, x, y, c, s = 1, t = 0) {
  p.push(x, y, s);
  p.line(p.curve([[0, 0], [2, 40], [0, 80]]), 4, '#4f9a52');
  p.fill(p.ell(12, 50, 16, 7, -40), '#6cc070', { t: 1, keep: true });
  p.fill(p.blob([[-18, -24], [-10, -8], [0, -22], [10, -8], [18, -24], [16, 8], [0, 16], [-16, 8]], 0.7), c, { t, keep: true });
  p.pop();
}
export function pine(p, x, y, s = 1, t = 0, c = '#4fae6a') {
  p.push(x, y, s);
  p.fill(p.rect(-8, 40, 16, 22), '#9a6a4a', { t: 1, keep: true });
  p.fill(p.poly([[-46, 46], [46, 46], [0, -10]]), c, { t, keep: true });
  p.fill(p.poly([[-38, 14], [38, 14], [0, -40]]), c, { t, keep: true });
  p.fill(p.poly([[-28, -18], [28, -18], [0, -66]]), c, { t, keep: true });
  p.pop();
}
export function tree(p, x, y, s = 1, t = 0, c = '#6cc070') {
  p.push(x, y, s);
  p.fill(p.rrect(-12, 0, 24, 70, 8), '#a8724f', { t, keep: true });
  p.fill(p.cloud(0, -20, 110, 90, 3), c, { t, keep: true });
  for (const [ax, ay] of [[-24, -26], [20, -10], [4, -46]]) p.fill(p.circ(ax, ay, 7), '#ff6f6f', { t: 2, keep: true, w: 2 });
  p.pop();
}
function mushroom(p, x, y, s = 1, t = 1) {
  p.push(x, y, s);
  p.fill(p.rrect(-10, -6, 20, 30, 8), '#fff3e0', { t, keep: true });
  p.fill(`M${p.pt(-30, 0)}C${p.pt(-30, -40)} ${p.pt(30, -40)} ${p.pt(30, 0)}Z`, '#ff6f6f', { t, keep: true });
  for (const [dx, dy] of [[-12, -14], [10, -18]]) p.fill(p.circ(dx, dy, 5), WHITE, { t: t + 1, keep: true, w: 1.6 });
  p.pop();
}
function bubbles(p, at, t = 1) { for (const [x, y, r] of at) p.fill(p.circ(x, y, r), '#e3f7ff', { t, keep: true, w: 2 }); }
function stars(p, at, c = '#ffe066', t = 0) { for (const [x, y, r, tt] of at) p.fill(p.star(x, y, r, r * 0.48), c, { t: tt != null ? tt : t, keep: true }); }
function sparkles(p, at, c = WHITE) { for (const [x, y, r] of at) p.ink(p.star(x, y, r, r * 0.3, 4), c, { w: 0 }); }

const SCENES = {
  meadow(p, o) {
    sky(p, o.sky || SKY);
    sun(p, 62, 64, 34, '#ffd84a');
    cloud(p, 300, 76, 120, 46, 0);
    cloud(p, 168, 118, 80, 32, 0);
    p.fill(p.hill(-10, 280, 100, 232, 250, 300, 410), o.hill || '#a8e08a', bg());
    p.fill(p.hill(170, 300, 330, 228, 410, 262, 410), o.hill2 || '#94d47a', bg());
    ground(p, o.grass || GRASS, 300);
    flowers(p, [[36, 352, '#ff8fc8'], [372, 340, '#ffd84a'], [86, 384, '#b79cff'], [330, 384, '#ff8fc8']], 1);
  },
  rainbow(p, o) {
    sky(p, o.sky || '#d6efff');
    // Crayon colors three wide bands; from Marker up each one splits in two (six colors)
    const cs = ['#ff8fa8', '#ffb36b', '#ffe066', '#9be37a', '#7fc8ff', '#b79cff'];
    for (let i = 0; i < 6; i += 2) p.fill(p.arcBand(200, 330, 232 - (i + 2) * 15, 232 - i * 15), cs[i]);
    for (let i = 1; i < 6; i += 2) p.fill(p.arcBand(200, 330, 232 - (i + 1) * 15, 232 - i * 15), cs[i], { t: 1 });
    cloud(p, 54, 300, 120, 60, 0);
    cloud(p, 346, 300, 120, 60, 0);
    ground(p, o.grass || GRASS, 320, 5);
    sparkles(p, [[90, 80, 9], [320, 70, 7], [200, 40, 6]]);
  },
  night(p, o) {
    sky(p, o.sky || '#30386e');
    p.fill(p.circ(318, 74, 38), '#fff3b0', { out: p.circ(336, 60, 32) });
    stars(p, [[70, 60, 16, 0], [180, 40, 11, 1], [120, 130, 9, 1], [260, 140, 10, 1], [370, 170, 12, 0], [40, 180, 9, 1]]);
    p.fill(p.hill(-10, 290, 120, 240, 280, 300, 410), '#40588f', bg());
    ground(p, o.grass || '#4f7f72', 304);
  },
  sea(p, o) {
    p.fill(p.rect(0, 0, 400, 400), o.water || '#8fdcff', bg());
    p.fill(p.wave(-10, 410, 190, 10, 3, 410), '#6cc8f4', bg());
    p.fill(p.wave(-10, 410, 336, 8, 3, 410), '#ffe0a3', bg());
    for (const [x, h, c] of [[40, 130, '#5fbf7a'], [360, 110, '#4fae6a']]) p.fill(p.blob([[x - 10, 350], [x - 24, 350 - h * 0.5], [x - 6, 350 - h], [x + 16, 350 - h * 0.6], [x + 8, 350]], 0.9), c);
    p.fill(p.star(320, 360, 20, 9, 5), '#ff9a7a', { t: 1, keep: true });
    p.fill(p.blob([[70, 372], [90, 350], [110, 372], [90, 380]], 0.8), '#ffb3d1', { t: 2, keep: true });
    bubbles(p, [[70, 80, 12], [96, 120, 8], [330, 60, 10], [350, 100, 6], [300, 130, 7]]);
  },
  beach(p, o) {
    sky(p, o.sky || SKY);
    sun(p, 330, 62, 32);
    cloud(p, 110, 70, 110, 40, 0);
    p.fill(p.wave(-10, 410, 216, 5, 4, 410), '#5fc4f2', bg());
    p.fill(p.wave(-10, 410, 236, 4, 5, 410), '#8fdcff', bg());
    p.fill(p.wave(-10, 410, 290, 7, 2, 410), '#ffe0a3', bg());
    p.fill(p.star(54, 360, 18, 8, 5), '#ff9a7a', { t: 1, keep: true });
    p.fill(p.blob([[350, 372], [370, 350], [390, 372], [370, 380]], 0.8), '#ffb3d1', { t: 2, keep: true });
  },
  snow(p, o) {
    sky(p, o.sky || '#d4eaff');
    pine(p, 50, 230, 1.1, 0);
    pine(p, 360, 220, 1.2, 0, '#3f9c60');
    pine(p, 300, 250, 0.7, 1, '#56b874');
    p.fill(p.hill(-10, 300, 120, 262, 260, 310, 410), '#eef6ff', bg());
    ground(p, WHITE, 310, 7);
    sparkles(p, [[110, 60, 8], [200, 100, 6], [280, 50, 7], [160, 170, 5], [380, 120, 6], [30, 110, 6]], WHITE);
  },
  garden(p, o) {
    sky(p, o.sky || SKY);
    sun(p, 330, 60, 30);
    cloud(p, 110, 70, 100, 38, 1);
    const fence = p.rect(0, 220, 400, 90);
    for (let x = 6; x < 400; x += 44) p.fill(p.poly([[x, 310], [x, 236], [x + 16, 220], [x + 32, 236], [x + 32, 310]]), '#fff3e0', bg({ t: 1, keep: true }));
    p.fill(p.rect(0, 256, 400, 12), '#f1dcc0', bg({ t: 2, keep: true }));
    ground(p, o.grass || GRASS, 300);
    tulip(p, 40, 300, '#ff6f91', 1, 0);
    tulip(p, 360, 296, '#ffd84a', 1, 0);
    tulip(p, 80, 330, '#b79cff', 0.8, 1);
    void fence;
  },
  room(p, o) {
    p.fill(p.rect(0, 0, 400, 400), o.wall || '#ffe3ef', bg());
    for (let y = 24; y < 290; y += 48) for (let x = 24 + ((y / 48) % 2) * 24; x < 400; x += 48) p.ink(p.heart(x, y, 5), darker(o.wall || '#ffe3ef', 0.06));
    p.fill(p.rrect(250, 50, 120, 120, 10), WHITE, { t: 1, keep: true });
    p.fill(p.rect(262, 62, 96, 96), o.window || '#bfe6ff');
    p.fill(p.cloud(300, 120, 50, 22, 3), WHITE, { t: 2, keep: true });
    p.line(p.curve([[310, 62], [310, 158]]), 3); p.line(p.curve([[262, 110], [358, 110]]), 3);
    for (const s of [-1, 1]) p.fill(p.blob([[310 + s * 70, 40], [310 + s * 50, 40], [310 + s * 56, 110], [310 + s * 48, 186], [310 + s * 76, 186]], 0.7), o.curtain || '#ff9fc8');
    p.fill(p.rect(0, 300, 400, 100), o.floor || '#e9c49c', bg());
    for (const y of [330, 364]) p.line(p.curve([[0, y], [400, y]]), 1.6, darker(o.floor || '#e9c49c', 0.2));
    p.fill(p.ell(200, 360, 170, 34), o.rug || '#b79cff', bg());
    p.fill(p.ell(200, 360, 130, 22), lighter(o.rug || '#b79cff', 0.35), bg());
    p.fill(p.rrect(36, 70, 80, 64, 6), '#ffd84a', { t: 1, keep: true });
    p.fill(p.rect(46, 80, 60, 44), WHITE, { t: 2, keep: true, w: 2 });
    p.fill(p.heart(76, 102, 12), '#ff6f91', { t: 2, keep: true, w: 2 });
  },
  candy(p, o) {
    sky(p, o.sky || '#ffd6ec');
    cloud(p, 300, 70, 110, 40, 1, '#fff7fb');
    p.fill(p.hill(-10, 270, 90, 210, 230, 290, 410), '#b9f0d6', bg());
    p.fill(p.hill(150, 290, 320, 214, 410, 250, 410), '#c9b8ff', bg());
    ground(p, '#ffb3d1', 300, 8);
    for (const [x, y, s, c] of [[40, 230, 1.4, '#7fd4ff'], [362, 222, 1.5, '#ffd84a']]) { p.push(x, y, s); prop(p, 'lollipop', { c }); p.pop(); }
    for (const [x, c] of [[110, '#ff6f91'], [300, '#8fd16a']]) p.fill(`M${p.pt(x - 18, 380)}C${p.pt(x - 18, 344)} ${p.pt(x + 18, 344)} ${p.pt(x + 18, 380)}Z`, c);
  },
  space(p, o) {
    sky(p, o.sky || '#272b55');
    const pl = p.circ(320, 90, 40);
    p.fill(p.ell(320, 90, 72, 16, -16), '#ffe066', { t: 1, keep: true });
    p.fill(pl, '#ffb36b');
    p.fill(p.ell(320, 90, 72, 16, -16), '#ffe066', { out: p.rect(240, 30, 160, 60), t: 1, keep: true });
    p.fill(p.circ(70, 70, 24), '#7fd4ff');
    p.fill(p.circ(60, 62, 7), lighter('#7fd4ff', 0.4), { t: 2, keep: true, w: 1.6 });
    stars(p, [[160, 50, 10, 1], [230, 160, 8, 1], [40, 170, 9, 1], [380, 200, 8, 1]], '#ffe066');
    sparkles(p, [[120, 120, 6], [260, 40, 5], [350, 160, 5], [20, 30, 5]], WHITE);
    p.fill(p.wave(-10, 410, 320, 8, 2, 410), '#c9c3e6', bg());
    for (const [x, y, r] of [[60, 356, 14], [330, 362, 18], [200, 384, 10]]) p.fill(p.ell(x, y, r, r * 0.45), '#aaa2d4', { t: 1, keep: true });
  },
  party(p, o) {
    p.fill(p.rect(0, 0, 400, 400), o.wall || '#fff1c9', bg());
    p.line(p.curve([[0, 30], [100, 60], [200, 70], [300, 60], [400, 30]]), 2.4);
    const cs = ['#ff6f91', '#7fd4ff', '#ffd84a', '#8fd16a', '#b79cff'];
    for (let i = 0; i < 9; i++) { const x = 20 + i * 45, y = 30 + Math.sin((i / 8) * Math.PI) * 40; p.fill(p.poly([[x - 16, y], [x + 16, y + 2], [x, y + 34]]), cs[i % 5], { t: 1, keep: true }); }
    for (const [x, y, c] of [[50, 170, '#ff6f91'], [350, 160, '#7fd4ff']]) { p.line(p.curve([[x, y + 40], [x + 6, y + 110]]), 2); p.fill(p.ell(x, y, 30, 36), c); }
    p.fill(p.rect(0, 310, 400, 90), o.floor || '#ffd6ec', bg());
    for (const [x, y, c, r] of [[120, 120, '#ff6f91', 20], [280, 110, '#8fd16a', -30], [200, 150, '#7fd4ff', 50], [90, 260, '#ffd84a', 10], [320, 270, '#b79cff', -40]]) p.ink(p.push(x, y, 1, r) && p.rrect(-6, -2, 12, 4, 2), c), p.pop();
  },
  forest(p, o) {
    sky(p, o.sky || '#cdeeff');
    tree(p, 50, 210, 1.1, 0, '#5fbf7a');
    tree(p, 350, 200, 1.2, 0, '#4fae6a');
    tree(p, 290, 236, 0.7, 0, '#7fd08a');
    ground(p, o.grass || '#8fd16a', 300);
    mushroom(p, 40, 350, 1, 1);
    mushroom(p, 364, 360, 0.8, 2);
    flowers(p, [[110, 370, '#ffd84a'], [300, 380, '#ff8fc8']], 2);
  },
  castle(p, o) {
    sky(p, o.sky || '#d6efff');
    cloud(p, 70, 70, 100, 38, 1);
    cloud(p, 330, 60, 90, 34, 1);
    castle(p, 200, 250, 0.72, { back: true, c: o.castle || '#e8dcff' });
    p.fill(p.hill(-10, 300, 110, 270, 260, 310, 410), '#a8e08a', bg());
    ground(p, GRASS, 312);
  },
  clouds(p, o) {
    sky(p, o.sky || '#c9e6ff');
    sun(p, 330, 70, 34, '#ffe066');
    cloud(p, 70, 90, 90, 34, 1);
    sparkles(p, [[150, 60, 8], [250, 120, 6], [40, 170, 6]]);
    p.fill(p.blob([[-20, 330], [40, 290], [110, 300], [170, 270], [240, 286], [300, 266], [360, 290], [420, 300], [420, 420], [-20, 420]], 0.9), WHITE, bg());
    p.fill(p.blob([[-20, 370], [60, 340], [140, 356], [220, 336], [300, 352], [420, 340], [420, 420], [-20, 420]], 0.9), '#eaf4ff', bg());
  },
  pond(p, o) {
    sky(p, o.sky || SKY);
    cloud(p, 300, 64, 110, 40, 0);
    tree(p, 46, 200, 0.9, 1, '#6cc070');
    ground(p, GRASS, 250, 4);
    const water = p.ell(200, 330, 210, 80);
    p.fill(water, '#7fd4ff', bg());
    for (const y of [300, 340]) p.line(p.curve([[140, y], [170, y - 4], [200, y]]), 2, darker('#7fd4ff', 0.2));
    for (const [x, y, r] of [[80, 330, 30], [330, 350, 26]]) p.fill(`${p.circ(x, y, r)}`, '#5fbf7a', { out: p.poly([[x, y], [x + r * 1.2, y - r * 0.5], [x + r * 1.2, y + r * 0.3]]) });
    p.fill(p.star(80, 322, 12, 7, 6), '#ff9fc8', { t: 1, keep: true });
    for (const x of [360, 380]) { p.line(p.curve([[x, 260], [x + 2, 200]]), 3, '#4f9a52'); p.fill(p.rrect(x - 5, 196, 10, 26, 5), '#9a6a4a', { t: 1, keep: true }); }
  },
  farm(p, o) {
    sky(p, o.sky || SKY);
    sun(p, 60, 60, 30);
    cloud(p, 210, 70, 100, 36, 1);
    barn(p, 320, 200, 0.62);
    p.fill(p.hill(-10, 280, 80, 250, 230, 290, 410), '#a8e08a', bg());
    ground(p, GRASS, 296);
    for (let x = 0; x < 400; x += 50) p.fill(p.rect(x + 18, 260, 12, 50), '#fff3e0', bg({ t: 1, keep: true }));
    p.fill(p.rect(0, 272, 400, 10), '#fff3e0', bg({ t: 1, keep: true }));
  },
  stage(p, o) {
    p.fill(p.rect(0, 0, 400, 400), o.wall || '#5b3d7a', bg());
    p.fill(p.ell(200, 80, 150, 60), '#7a5aa0', bg());
    p.fill(p.rect(0, 300, 400, 100), '#e7b77a', bg());
    p.fill(p.ell(200, 340, 150, 34), '#fff3b0', bg({ t: 0 }));
    for (const s of [0, 1]) {
      const x = s ? 400 : 0, d = s ? -1 : 1;
      p.fill(p.blob([[x, -10], [x + d * 90, -10], [x + d * 70, 120], [x + d * 92, 250], [x + d * 60, 330], [x, 330]], 0.8), o.curtain || '#ff5a6e');
      p.line(p.curve([[x + d * 40, 0], [x + d * 34, 160], [x + d * 40, 320]]), 2, darker(o.curtain || '#ff5a6e', 0.25));
    }
    p.fill(p.wave(-10, 410, 10, 8, 5, -10), o.curtain || '#ff5a6e');
    sparkles(p, [[140, 150, 8], [270, 130, 7], [210, 60, 6]], '#fff3b0');
  },
  badge(p, o) {
    p.fill(p.rect(0, 0, 400, 400), o.paper || '#fff1f7', bg());
    p.fill(p.circ(200, 210, 178), o.ring || '#ffd6ec', bg());
    p.fill(p.circ(200, 210, 160), o.c || '#bfe6ff', bg());
    for (const [x, y, k] of [[34, 40, 'h'], [366, 44, 's'], [30, 370, 's'], [370, 366, 'h']]) {
      if (k === 'h') p.fill(p.heart(x, y, 18), o.h || '#ff8fb8');
      else p.fill(p.star(x, y, 22, 11), '#ffd84a');
    }
  },
  picnic(p, o) {
    SCENES.meadow(p, { ...o });
    const blanket = p.poly([[40, 330], [360, 330], [400, 400], [0, 400]]);
    p.fill(blanket, '#ff8fa8', bg());
    for (let i = 0; i < 6; i++) p.fill(p.poly([[40 + i * 54, 330], [64 + i * 54, 330], [i * 70 + 30, 400], [i * 70, 400]]), WHITE, { clip: blanket, t: 1, keep: true, w: 1.6 });
  },
  ice(p, o) {
    sky(p, o.sky || '#d4eaff');
    cloud(p, 300, 70, 110, 40, 1);
    p.fill(p.wave(-10, 410, 250, 5, 4, 410), '#5fb8f0', bg());
    p.fill(p.blob([[30, 330], [80, 290], [320, 284], [380, 310], [360, 370], [40, 372]], 0.6), WHITE, bg());
    p.fill(p.blob([[40, 352], [120, 340], [300, 344], [366, 336], [356, 370], [44, 372]], 0.6), '#d9ecff', bg());
    sparkles(p, [[60, 60, 7], [170, 110, 6], [380, 160, 6], [120, 200, 5]]);
  },
  savanna(p, o) {
    sky(p, o.sky || '#ffe8bf');
    sun(p, 300, 100, 54, '#ffb03a');
    p.fill(p.hill(-10, 290, 100, 260, 260, 300, 410), '#f2d48a', bg());
    p.fill(p.rrect(50, 160, 14, 140, 6), '#8a5a3c', { t: 0 });
    p.fill(p.blob([[0, 170], [40, 140], [110, 136], [150, 160], [110, 176], [20, 180]], 0.8), '#8fbf5a');
    ground(p, '#e8c66a', 300);
  },
  bamboo(p, o) {
    sky(p, o.sky || '#e4f7d6');
    for (const [x, t] of [[30, 0], [70, 1], [340, 0], [376, 1], [300, 1]]) {
      p.fill(p.rect(x - 9, -10, 18, 330), t ? '#a8dc7a' : '#8fd16a', { t, keep: true });
      for (const y of [60, 140, 220]) p.line(p.curve([[x - 9, y], [x + 9, y]]), 2.2, darker('#8fd16a', 0.35));
      p.fill(p.ell(x + 22, 90 + x % 50, 18, 7, -30), '#5fb85f', { t: 1, keep: true });
    }
    ground(p, '#9ad67c', 300);
  },
  sunset(p, o) {
    sky(p, '#ffc9a8');
    p.fill(p.rect(0, 120, 400, 140), '#ffb3c8', bg());
    p.fill(p.circ(200, 250, 70), '#ffe066', { out: p.rect(0, 250, 400, 150) });
    p.fill(p.wave(-10, 410, 250, 4, 5, 410), '#8fa8e6', bg());
    for (const y of [280, 310, 344]) p.line(p.curve([[120, y], [200, y - 4], [280, y]]), 2, darker('#8fa8e6', 0.18));
  },
  tea(p, o) {
    SCENES.room(p, o);
    p.fill(p.rrect(10, 300, 380, 30, 10), '#ffffff', bg());
    p.fill(p.wave(10, 390, 330, 5, 9, 352), '#ffffff', bg({ t: 1, keep: true }));
  },
};

// ---- big things ----
export function castle(p, x, y, s = 1, o = {}) {
  const c = o.c || '#e8dcff', roof = o.roof || '#ff8fc8', dark = darker(c, 0.12);
  p.push(x, y, s);
  for (const tx of [-130, 130]) {
    p.fill(p.rect(tx - 34, -120, 68, 180), c);
    p.fill(p.poly([[tx - 44, -116], [tx + 44, -116], [tx, -200]]), roof);
    p.fill(p.rrect(tx - 12, -80, 24, 34, 12), '#7fc8ff', { t: 1, keep: true });
    p.line(p.curve([[tx, -200], [tx, -236]]), 3); p.fill(p.poly([[tx, -236], [tx + 30, -226], [tx, -216]]), '#ffd84a', { t: 1, keep: true, w: 2 });
  }
  p.fill(p.rect(-100, -60, 200, 120), c);
  for (let i = 0; i < 5; i++) p.fill(p.rect(-100 + i * 44, -84, 24, 26), c);
  p.fill(p.rect(-40, -180, 80, 130), dark);
  p.fill(p.poly([[-52, -176], [52, -176], [0, -280]]), roof);
  p.fill(p.rrect(-14, -150, 28, 38, 14), '#7fc8ff', { t: 1, keep: true });
  p.fill(`M${p.pt(-34, 60)}L${p.pt(-34, 0)}C${p.pt(-34, -40)} ${p.pt(34, -40)} ${p.pt(34, 0)}L${p.pt(34, 60)}Z`, o.door || '#c48a5a');
  for (const hx of [-70, 70]) p.fill(p.heart(hx, -10, 12), '#ff8fc8', { t: 2, keep: true, w: 2 });
  p.pop();
}
export function barn(p, x, y, s = 1) {
  p.push(x, y, s);
  p.fill(p.poly([[-120, -40], [0, -130], [120, -40], [120, 130], [-120, 130]]), '#ff6f6f');
  p.fill(p.poly([[-134, -34], [0, -146], [134, -34], [120, -24], [0, -122], [-120, -24]]), '#ffffff');
  p.fill(p.rect(-44, 30, 88, 100), '#ffffff');
  p.fill(p.rect(-36, 38, 72, 88), '#c84a4a', { t: 1, keep: true });
  p.line(p.curve([[-36, 38], [36, 126]]), 3); p.line(p.curve([[36, 38], [-36, 126]]), 3);
  p.fill(p.circ(0, -50, 22), '#ffe066', { t: 1, keep: true });
  p.pop();
}
export function house(p, x, y, s = 1, o = {}) {
  p.push(x, y, s);
  p.fill(p.rect(60, -150, 30, 60), '#c98a6a');
  p.fill(p.rrect(-110, -60, 220, 170, 8), o.wall || '#fff1c9');
  p.fill(p.poly([[-140, -50], [0, -170], [140, -50]]), o.roof || '#ff8f8f');
  p.fill(`M${p.pt(-28, 110)}L${p.pt(-28, 30)}C${p.pt(-28, 0)} ${p.pt(28, 0)} ${p.pt(28, 30)}L${p.pt(28, 110)}Z`, o.door || '#7fc8ff');
  p.fill(p.circ(16, 66, 4), '#ffd84a', { t: 2, keep: true, w: 1.6 });
  for (const wx of [-74, 74]) { p.fill(p.rrect(wx - 24, -20, 48, 46, 6), '#bfe6ff'); p.line(p.curve([[wx, -20], [wx, 26]]), 2.4); p.line(p.curve([[wx - 24, 3], [wx + 24, 3]]), 2.4); p.fill(p.rrect(wx - 30, 26, 60, 14, 4), '#ff9fc8', { t: 1, keep: true }); }
  p.fill(p.circ(0, -90, 18), '#ffffff', { t: 1, keep: true });
  p.fill(p.heart(0, -90, 9), '#ff6f91', { t: 2, keep: true, w: 2 });
  p.pop();
}
export function hotair(p, x, y, s = 1, o = {}) {
  const cs = o.cs || ['#ff6f91', '#ffd84a', '#7fd4ff'];
  p.push(x, y, s);
  for (const sx of [-30, 30]) p.line(p.curve([[sx * 1.6, 40], [sx, 110]]), 2.4);
  p.fill(p.rrect(-36, 104, 72, 50, 8), '#c98a5a');
  p.fill(p.rect(-36, 104, 72, 12), '#a8724f', { t: 1, keep: true });
  const bal = p.blob([[0, -150], [96, -100], [104, -10], [50, 60], [0, 70], [-50, 60], [-104, -10], [-96, -100]], 0.9);
  p.fill(bal, cs[0]);
  p.fill(p.ell(0, -40, 36, 112), cs[1], { clip: bal });
  p.fill(p.ell(0, -40, 12, 112), cs[2], { clip: bal, t: 1, keep: true });
  for (const sx of [-1, 1]) p.fill(p.ell(sx * 92, -40, 22, 100), cs[2], { clip: bal });
  if (o.face) face(p, 0, -40, 1.2);
  p.pop();
}
export function rocket(p, x, y, s = 1, o = {}) {
  p.push(x, y, s);
  p.fill(p.blob([[-24, 100], [0, 170], [24, 100]], 0.6), '#ffb03a');
  p.fill(p.blob([[-12, 100], [0, 140], [12, 100]], 0.6), '#ffe066', { t: 1, keep: true });
  for (const sx of [-1, 1]) p.fill(p.poly([[sx * 40, 30], [sx * 80, 110], [sx * 34, 100]]), o.fin || '#ff6f6f');
  const body = p.blob([[0, -150], [44, -80], [48, 40], [36, 104], [-36, 104], [-48, 40], [-44, -80]], 0.9);
  p.fill(body, o.c || '#f4f6fb');
  p.fill(p.rect(-60, -150, 120, 50), o.fin || '#ff6f6f', { clip: body });
  p.fill(p.circ(0, -20, 26), '#9adfff');
  p.fill(p.circ(-8, -28, 8), '#ffffff', { t: 2, keep: true, w: 0 });
  p.fill(p.rect(-60, 70, 120, 14), o.fin || '#ff6f6f', { clip: body });
  if (o.face) face(p, 0, 34, 0.8);
  p.pop();
}
export function mushroomHouse(p, x, y, s = 1) {
  p.push(x, y, s);
  p.fill(p.rrect(-70, -20, 140, 140, 40), '#fff3e0');
  p.fill(`M${p.pt(-24, 120)}L${p.pt(-24, 60)}C${p.pt(-24, 30)} ${p.pt(24, 30)} ${p.pt(24, 60)}L${p.pt(24, 120)}Z`, '#c98a5a');
  p.fill(p.circ(-40, 20, 16), '#bfe6ff'); p.fill(p.circ(42, 30, 14), '#bfe6ff', { t: 1, keep: true });
  const cap = `M${p.pt(-150, 0)}C${p.pt(-160, -150)} ${p.pt(160, -150)} ${p.pt(150, 0)}C${p.pt(100, 20)} ${p.pt(-100, 20)} ${p.pt(-150, 0)}Z`;
  p.fill(cap, '#ff6f6f');
  for (const [dx, dy, r] of [[-80, -50, 20], [0, -90, 24], [80, -50, 20], [-30, -30, 12], [44, -20, 12]]) p.fill(p.circ(dx, dy, r), '#ffffff', { clip: cap, t: r > 14 ? 0 : 1, keep: true });
  p.pop();
}
export function sailboat(p, x, y, s = 1) {
  p.push(x, y, s);
  p.line(p.curve([[0, 60], [0, -150]]), 4);
  p.fill(p.poly([[6, -146], [96, 40], [6, 40]]), '#ffffff');
  p.fill(p.poly([[-6, -120], [-80, 40], [-6, 40]]), '#ffd84a');
  p.fill(p.poly([[0, -150], [40, -136], [0, -122]]), '#ff6f91', { t: 1, keep: true });
  p.fill(`M${p.pt(-120, 52)}L${p.pt(120, 52)}C${p.pt(100, 110)} ${p.pt(-100, 110)} ${p.pt(-120, 52)}Z`, '#ff6f6f');
  p.fill(p.rect(-130, 62, 260, 10), '#ffffff', { clip: `M${p.pt(-120, 52)}L${p.pt(120, 52)}C${p.pt(100, 110)} ${p.pt(-100, 110)} ${p.pt(-120, 52)}Z`, t: 1, keep: true });
  p.pop();
}
export function sunFace(p, x, y, r = 60) {
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; p.push(x + Math.cos(a) * (r + 22), y + Math.sin(a) * (r + 22), 1, (a * 180) / Math.PI + 90); p.fill(p.blob([[-12, 10], [0, -16], [12, 10]], 0.6), '#ffb03a', { t: i % 2 ? 1 : 0, keep: true }); p.pop(); }
  p.fill(p.circ(x, y, r), '#ffe066');
  face(p, x, y + 6, r / 40);
}
export { cheeks };
