// Color by Numbers: things to hold and things to wear. A prop is drawn about 60 across around the
// spot it's placed at (a critter holds it in front of its tummy); the big pictures draw the same props
// scaled up, some with a face.
import { INK, darker, lighter, face, cheeks } from './art-kit.mjs';

export function prop(p, kind, o = {}) {
  const fn = PROPS[kind];
  if (fn) fn(p, o);
  if (o.face) face(p, o.faceX || 0, o.faceY || 0, o.faceS || 0.5, o.faceO || {});
}

const PROPS = {
  heart(p, o) { p.fill(p.heart(0, 2, 30), o.c || '#ff6f91'); p.fill(p.ell(-12, -8, 7, 5, -30), '#ffffff', { t: 2, keep: true, w: 0 }); },
  star(p, o) { p.fill(p.star(0, 0, 34, 16), o.c || '#ffd84a'); },
  balloon(p, o) {
    const c = o.c || '#ff6f91';
    p.line(p.curve([[0, 0], [30, -60], [60, -120], [92, -176]]), 2.2);
    p.fill(p.poly([[86, -184], [100, -184], [93, -174]]), c, { t: 1, keep: true, w: 1.6 });
    p.fill(p.ell(93, -222, 32, 38), c);
    p.fill(p.ell(80, -236, 6, 10, 20), '#ffffff', { t: 2, keep: true, w: 0 });
  },
  balloons(p, o) {
    const cs = o.cs || ['#ff6f91', '#7fd4ff', '#ffd84a'];
    const at = [[-60, -210], [10, -240], [80, -206]];
    at.forEach(([x, y]) => p.line(p.curve([[0, 0], [x * 0.5, y * 0.5], [x, y + 34]]), 2));
    at.forEach(([x, y], i) => { p.fill(p.ell(x, y, 28, 33), cs[i]); p.fill(p.ell(x - 10, y - 12, 5, 9, 20), '#ffffff', { t: 2, keep: true, w: 0 }); });
  },
  flower(p, o) {
    p.line(p.curve([[0, 30], [2, 0], [0, -24]]), 4, '#4f9a52');
    p.fill(p.ell(12, 10, 12, 6, -30), '#6cc070', { t: 1, keep: true });
    p.fill(p.star(0, -30, 26, 16, 6, -90), o.c || '#ff8fc8');
    p.fill(p.circ(0, -30, 9), o.c2 || '#ffd84a');
  },
  bouquet(p, o) {
    p.fill(p.poly([[-24, -6], [24, -6], [6, 40], [-6, 40]]), o.wrap || '#b9e3ff');
    for (const [x, y, c] of [[-20, -26, '#ff8fc8'], [20, -26, '#ffd84a'], [0, -44, '#b48cff']]) { p.fill(p.star(x, y, 20, 13, 6), c); p.fill(p.circ(x, y, 6), '#fff2a8', { t: 1, keep: true }); }
  },
  icecream(p, o) {
    const cone = p.poly([[-20, -6], [20, -6], [0, 44]]);
    p.fill(cone, '#e9b26b');
    for (const x of [-20, 0, 20]) { p.line(p.curve([[x - 14, -6], [x + 14, 44]]), 1.6, darker('#e9b26b', 0.3)); p.parts[p.parts.length - 1].clip = cone; p.line(p.curve([[x + 14, -6], [x - 14, 44]]), 1.6, darker('#e9b26b', 0.3)); p.parts[p.parts.length - 1].clip = cone; }
    p.fill(p.circ(0, -20, 22), o.c || '#ffb3d1');
    p.fill(p.circ(0, -44, 18), o.c2 || '#b9f0d6');
    p.fill(p.circ(4, -64, 7), '#ff4d6d', { keep: true });
  },
  cupcake(p, o) {
    const wrap = p.poly([[-28, 0], [28, 0], [20, 36], [-20, 36]]);
    p.fill(wrap, o.c2 || '#7fd4ff');
    for (const x of [-12, 0, 12]) p.line(p.curve([[x * 1.3, 0], [x, 36]]), 1.8, darker(o.c2 || '#7fd4ff', 0.3));
    p.fill(p.cloud(0, -8, 64, 34, 3), o.c || '#ffb3d1');
    p.fill(p.blob([[-14, -26], [0, -46], [14, -26], [0, -20]], 0.8), o.c || '#ffb3d1', { keep: true });
    p.fill(p.circ(0, -48, 8), '#ff4d6d', { keep: true });
  },
  ball(p, o) {
    const b = p.circ(0, 0, 30);
    p.fill(b, '#ffffff');
    p.fill(p.ell(-14, 0, 12, 34), o.c || '#ff6f6f', { clip: b });
    p.fill(p.ell(14, 0, 12, 34), o.c2 || '#7fd4ff', { clip: b });
    p.fill(p.circ(0, -30, 7), o.c3 || '#ffd84a', { clip: b, t: 1, keep: true });
  },
  bone(p, o) { p.fill(p.blob([[-30, -10], [-22, -18], [-14, -8], [14, -8], [22, -18], [30, -10], [26, 0], [30, 10], [22, 18], [14, 8], [-14, 8], [-22, 18], [-30, 10], [-26, 0]], 0.8), '#fff5e0'); },
  yarn(p, o) {
    const c = o.c || '#ff8fc8';
    p.fill(p.circ(0, 0, 28), c);
    for (const r of [[-16, -20, 16, 18], [-24, 0, 24, 6], [-14, 16, 20, -18]]) p.line(p.curve([[r[0], r[1]], [0, (r[1] + r[3]) / 2 + 6], [r[2], r[3]]]), 2, darker(c, 0.3));
    p.line(p.curve([[24, 14], [40, 28], [30, 40], [46, 46]]), 2.4, darker(c, 0.15));
  },
  carrot(p, o) {
    p.fill(p.blob([[-6, -34], [8, -28], [16, -38], [10, -24], [22, -26], [4, -18]], 0.6), '#5fb85f', { t: 1, keep: true });
    p.fill(p.blob([[-14, -18], [16, -20], [4, 34]], 0.5), '#ff9a3c');
    for (const y of [-6, 8]) p.line(p.curve([[-6, y], [2, y + 2]]), 2, darker('#ff9a3c', 0.3));
  },
  egg(p, o) {
    const e = p.ell(0, 0, 26, 34);
    p.fill(e, o.c || '#bfe8ff');
    p.fill(p.wave(-30, 30, -2, 6, 3, 12), o.c2 || '#ff9fc8', { clip: e });
    for (const [x, y] of [[-10, -18], [10, -16], [0, 22]]) p.fill(p.circ(x, y, 3.5), '#ffffff', { clip: e, t: 2, keep: true, w: 0 });
  },
  honey(p, o) {
    const pot = p.blob([[-30, -14], [30, -14], [34, 18], [20, 36], [-20, 36], [-34, 18]], 0.9);
    p.fill(pot, '#e8a24a');
    p.fill(p.rrect(-26, -24, 52, 14, 6), '#c47c32');
    p.fill(p.blob([[-24, -12], [24, -12], [18, -2], [10, 8], [4, -2], [-8, 6], [-14, -4]], 0.8), '#ffd84a', { clip: pot, t: 1, keep: true });
    p.fill(p.rrect(-16, 6, 32, 18, 5), '#fff3c4', { t: 1, keep: true, w: 2 });
  },
  gift(p, o) {
    const c = o.c || '#7fd4ff', r = o.c2 || '#ff6f91';
    p.fill(p.rrect(-28, -14, 56, 46, 5), c);
    p.fill(p.rect(-6, -14, 12, 46), r, { keep: true });
    p.fill(p.ell(-12, -22, 13, 8, 20), r);
    p.fill(p.ell(12, -22, 13, 8, -20), r);
    p.fill(p.circ(0, -18, 5), darker(r, 0.15), { t: 1, keep: true });
  },
  fish(p, o) {
    const c = o.c || '#ff9a3c';
    p.fill(p.poly([[18, 0], [36, -16], [36, 16]]), darker(c, 0.1));
    p.fill(p.ell(-6, 0, 28, 18), c);
    p.ink(p.circ(-20, -3, 3.5), INK);
  },
  acorn(p, o) {
    p.fill(p.ell(0, 10, 20, 24), '#c98a4b');
    p.fill(p.blob([[-26, -6], [0, -24], [26, -6], [0, 2]], 0.8), '#8a5a33');
    p.line(p.curve([[0, -22], [4, -32]]), 3.5, '#6b4423');
  },
  lollipop(p, o) {
    p.fill(p.rect(-3, 0, 6, 50), '#fff5e0', { w: 2 });
    const c = p.circ(0, -18, 28);
    p.fill(c, o.c || '#ff8fc8');
    const sw = []; for (let i = 0; i <= 26; i++) { const a = i * 0.55, r = 2 + i * 0.86; sw.push([Math.cos(a) * r, -18 + Math.sin(a) * r]); }
    p.line(p.curve(sw), 4.5, o.c2 || '#ffffff');
  },
  bamboo(p, o) {
    const s = p.rrect(-8, -70, 16, 120, 6);
    p.fill(s, '#8fd16a');
    for (const y of [-40, -8, 24]) p.line(p.curve([[-8, y], [8, y]]), 2.4, darker('#8fd16a', 0.35));
    p.fill(p.ell(22, -56, 18, 7, -30), '#5fb85f', { t: 1, keep: true });
    p.fill(p.ell(-20, -20, 16, 6, 30), '#5fb85f', { t: 1, keep: true });
  },
  teacup(p, o) {
    const c = o.c || '#ffd3e3';
    p.fill(p.ell(0, 34, 44, 10), o.c2 || '#b9e3ff');
    p.fill(p.ell(36, 8, 12, 14), c, { w: 3 });
    p.fill(p.ell(36, 8, 6, 8), '#ffffff', { t: 1, keep: true, w: 2 });
    p.fill(`M${p.pt(-34, -8)}C${p.pt(-34, 40)} ${p.pt(34, 40)} ${p.pt(34, -8)}Z`, c);
    p.fill(p.ell(0, -8, 34, 8), '#c8946a', { t: 1, keep: true });
    p.fill(p.heart(0, 14, 8), '#ff6f91', { t: 1, keep: true, w: 2 });
  },
  donut(p, o) {
    const ring = `${p.circ(0, 0, 32)}${p.circ(0, 0, 11)}`;
    p.fill(ring, '#e6ae6a', { rule: 'evenodd' });
    p.fill(`${p.blob([[-28, -8], [-20, -26], [0, -32], [22, -26], [30, -6], [24, 10], [12, 4], [0, 14], [-12, 4], [-24, 12]], 0.9)}${p.circ(0, 0, 11)}`, o.c || '#ff8fc8', { rule: 'evenodd' });
    for (const [x, y, r, c] of [[-16, -14, 30, '#7fd4ff'], [14, -18, -20, '#ffd84a'], [20, -2, 60, '#ffffff'], [-20, 2, -50, '#b48cff']]) p.ink(p.rrect(x - 4, y - 1.5, 8, 3, 1.5), c, { w: 0 });
  },
  strawberry(p, o) {
    p.fill(p.blob([[-30, -12], [0, -20], [30, -12], [24, 16], [0, 40], [-24, 16]], 0.9), '#ff5a6e');
    p.fill(p.star(0, -18, 20, 9, 6), '#5fb85f');
    for (const [x, y] of [[-14, -2], [6, -4], [-4, 12], [14, 10], [-14, 18], [4, 26]]) p.ink(p.ell(x, y, 2, 3), '#fff3b0');
  },
  cake(p, o) {
    p.fill(p.ell(0, 30, 50, 10), '#b9e3ff');
    p.fill(p.rrect(-36, -4, 72, 34, 8), o.c || '#ffd3e3');
    p.fill(p.wave(-36, 36, -2, 4, 4, 8), o.c2 || '#ffffff', { keep: true });
    p.fill(p.rect(-3, -26, 6, 22), '#7fd4ff', { w: 2 });
    p.fill(p.blob([[0, -40], [5, -30], [0, -26], [-5, -30]], 0.8), '#ffb03a', { t: 1, keep: true, w: 1.6 });
  },
  seed(p, o) { p.fill(p.blob([[0, -18], [10, -4], [6, 16], [-6, 16], [-10, -4]], 0.9), '#5a5060'); p.fill(p.blob([[0, -12], [4, 0], [0, 12], [-3, 0]], 0.9), '#e9e3d6', { t: 1, keep: true, w: 0 }); },
  wand(p, o) { p.line(p.curve([[0, 30], [14, -20]]), 4, '#b48cff'); p.fill(p.star(16, -30, 18, 8), o.c || '#ffd84a'); },
  umbrella(p, o) {
    p.line(p.curve([[0, 40], [0, -30]]), 3.5, INK);
    p.fill(`M${p.pt(-50, -30)}C${p.pt(-50, -84)} ${p.pt(50, -84)} ${p.pt(50, -30)}C${p.pt(36, -40)} ${p.pt(20, -40)} ${p.pt(16, -30)}C${p.pt(8, -40)} ${p.pt(-8, -40)} ${p.pt(-16, -30)}C${p.pt(-20, -40)} ${p.pt(-36, -40)} ${p.pt(-50, -30)}Z`, o.c || '#ff6f91');
  },
  book(p, o) { p.fill(p.rrect(-30, -22, 60, 44, 4), o.c || '#7fd4ff'); p.fill(p.rect(-26, -18, 24, 36), '#ffffff', { t: 1, keep: true, w: 2 }); p.fill(p.rect(2, -18, 24, 36), '#ffffff', { t: 1, keep: true, w: 2 }); },
  sunflower(p, o) { p.line(p.curve([[0, 40], [0, -10]]), 4, '#4f9a52'); p.fill(p.star(0, -24, 30, 20, 10), '#ffcc3a'); p.fill(p.circ(0, -24, 12), '#8a5a33'); },
};

// Things to wear, in the critter's own spot (the head at [rx, ry, centerY]).
export function accessory(p, kind, o = {}) {
  const [hrx = 82, hry = 74, HY = -50] = o.head || [];
  const top = HY - hry;
  switch (kind) {
    case 'bow': {
      const c = o.c || '#ff6f91';
      p.push(-hrx * 0.62, top + 22, 1, -18);
      p.fill(p.blob([[0, 0], [-34, -20], [-36, 16]], 0.5), c);
      p.fill(p.blob([[0, 0], [34, -20], [36, 16]], 0.5), c);
      p.fill(p.circ(0, 0, 9), darker(c, 0.15), { t: 1, keep: true });
      p.pop();
      break;
    }
    case 'bigbow': {
      const c = o.c || '#ff6f91';
      p.push(0, top + 6, 1.2);
      p.fill(p.blob([[0, 0], [-40, -24], [-42, 18]], 0.5), c);
      p.fill(p.blob([[0, 0], [40, -24], [42, 18]], 0.5), c);
      p.fill(p.circ(0, 0, 10), darker(c, 0.15), { t: 1, keep: true });
      p.pop();
      break;
    }
    case 'crown': {
      const c = o.c || '#ffd257';
      p.fill(p.poly([[-36, top + 12], [-40, top - 26], [-20, top - 6], [0, top - 34], [20, top - 6], [40, top - 26], [36, top + 12]]), c);
      for (const [x, cc] of [[-20, '#ff6f91'], [0, '#7fd4ff'], [20, '#b48cff']]) p.fill(p.circ(x, top + 2, 5), cc, { t: 1, keep: true, w: 2 });
      break;
    }
    case 'tiara': {
      const c = o.c || '#ffd257';
      p.fill(p.blob([[-44, top + 18], [-22, top + 2], [0, top - 22], [22, top + 2], [44, top + 18], [0, top + 8]], 0.5), c);
      p.fill(p.circ(0, top - 4, 6), '#ff8fc8', { t: 1, keep: true, w: 2 });
      break;
    }
    case 'flowercrown': {
      for (const [x, y, c] of [[-50, top + 22, '#ff8fc8'], [0, top + 2, '#ffd84a'], [50, top + 22, '#b48cff']]) {
        p.fill(p.ell(x + 16, y + 6, 12, 6, 30), '#6cc070', { t: 1, keep: true });
        p.fill(p.star(x, y, 20, 13, 6), c);
        p.fill(p.circ(x, y, 6), '#fff2a8', { t: 1, keep: true });
      }
      break;
    }
    case 'flower': {
      p.fill(p.star(hrx * 0.6, top + 26, 20, 13, 6), o.c || '#ff8fc8');
      p.fill(p.circ(hrx * 0.6, top + 26, 6), '#ffd84a', { t: 1, keep: true });
      break;
    }
    case 'partyhat': {
      const c = o.c || '#7fd4ff';
      p.push(22, top + 8, 1, 14);
      const hat = p.poly([[-26, 0], [26, 0], [0, -64]]);
      p.fill(hat, c);
      p.fill(p.rect(-30, -26, 60, 10), '#ffd84a', { clip: hat, t: 1, keep: true, w: 2 });
      p.fill(p.circ(0, -64, 9), '#ff6f91');
      p.pop();
      break;
    }
    case 'beanie': {
      const c = o.c || '#ff6f91';
      p.fill(`M${p.pt(-hrx + 6, top + 44)}C${p.pt(-hrx + 6, top - 20)} ${p.pt(hrx - 6, top - 20)} ${p.pt(hrx - 6, top + 44)}Z`, c);
      p.fill(p.rrect(-hrx + 2, top + 32, hrx * 2 - 4, 22, 11), lighter(c, 0.5));
      p.fill(p.cloud(0, top - 18, 34, 26, 3), '#ffffff');
      break;
    }
    case 'sunhat': {
      const c = o.c || '#ffe08a';
      p.fill(p.ell(0, top + 20, hrx + 30, 18), c);
      p.fill(`M${p.pt(-hrx * 0.6, top + 22)}C${p.pt(-hrx * 0.6, top - 34)} ${p.pt(hrx * 0.6, top - 34)} ${p.pt(hrx * 0.6, top + 22)}Z`, c);
      p.fill(p.rect(-hrx * 0.6, top + 4, hrx * 1.2, 12), '#ff8fc8', { t: 1, keep: true });
      break;
    }
    case 'scarf': {
      const c = o.c || '#ff6f6f';
      p.fill(p.rrect(18, 16, 26, 64, 10), c);
      p.fill(p.rrect(-64, 4, 128, 26, 13), c);
      p.fill(p.rect(18, 48, 26, 10), '#ffffff', { t: 1, keep: true, w: 2 });
      break;
    }
    case 'bowtie': {
      const c = o.c || '#ff6f6f';
      p.fill(p.blob([[0, 20], [-24, 6], [-24, 34]], 0.4), c);
      p.fill(p.blob([[0, 20], [24, 6], [24, 34]], 0.4), c);
      p.fill(p.circ(0, 20, 7), darker(c, 0.15), { t: 1, keep: true });
      break;
    }
    case 'wings': {
      const c = o.c || '#d9c7ff', c2 = lighter(c, 0.4);
      for (const s of [-1, 1]) {
        p.fill(p.ell(s * 84, -20, 46, 34, s * -30), c);
        p.fill(p.ell(s * 70, 54, 34, 26, s * 30), c2);
      }
      break;
    }
    case 'feathers': {
      const c = o.c || '#ffffff';
      for (const s of [-1, 1]) p.fill(p.blob([[s * 40, 10], [s * 100, -60], [s * 150, -50], [s * 130, -20], [s * 146, 0], [s * 120, 16], [s * 130, 36], [s * 80, 44]], 0.8), c);
      break;
    }
    case 'glasses': {
      for (const s of [-1, 1]) p.line(p.circ(s * 32, HY - 4, 17), 3);
      p.line(p.curve([[-15, HY - 6], [0, HY - 10], [15, HY - 6]]), 3);
      break;
    }
    default: break;
  }
}

export { cheeks };
