// Color by Numbers: the cuddly animals. One chibi body (a big round head, a little round body, sitting
// and facing you) dressed up as each species: its ears, face, markings and tail.
import { INK, darker, lighter, eyes, cheeks, smile } from './art-kit.mjs';
import { prop, accessory } from './art-props.mjs';

const NOSE = '#4a3340';
const PINK = '#ffb3c8';

// Each species: its colors, ears, face and tail. Pictures can change any color.
export const SPECIES = {
  bear:     { body: '#c68a5c', light: '#f4d6b0', ear: 'round', face: 'muzzle' },
  teddy:    { body: '#d9a066', light: '#fbe6c4', ear: 'round', face: 'muzzle', marks: ['patch'] },
  polar:    { body: '#f4f7fb', light: '#fffdf6', inner: '#d7e3f2', ear: 'round', face: 'muzzle' },
  panda:    { body: '#fbfaf7', light: '#fbfaf7', dark: '#4a4352', ear: 'round', face: 'panda', limbs: 'dark' },
  koala:    { body: '#aaa7ba', light: '#ebe8f2', ear: 'fluffy', face: 'koala' },
  puppy:    { body: '#eab57c', light: '#fff1dc', earC: '#a8683f', ear: 'floppy', face: 'muzzle', tail: 'wag' },
  dalmatian:{ body: '#fbfaf7', light: '#fbfaf7', earC: '#4a4352', spot: '#4a4352', ear: 'floppy', face: 'muzzle', tail: 'wag', marks: ['spots', 'eyespot'] },
  beagle:   { body: '#cf8a4c', light: '#fffaf1', earC: '#8a5530', ear: 'floppy', face: 'blaze', tail: 'wag' },
  kitten:   { body: '#f5a65b', light: '#fff1de', inner: PINK, ear: 'pointy', face: 'cat', tail: 'long', marks: ['tabby'] },
  greycat:  { body: '#b3b6c9', light: '#f0f1f7', inner: PINK, ear: 'pointy', face: 'cat', tail: 'long' },
  calico:   { body: '#fbf7f0', light: '#fbf7f0', inner: PINK, patchA: '#f0a050', patchB: '#5a4a4a', ear: 'pointy', face: 'cat', tail: 'long', marks: ['calico'] },
  bunny:    { body: '#f3ecf6', light: '#ffffff', inner: PINK, ear: 'long', face: 'bunny', tail: 'puff' },
  brownbunny:{ body: '#c9a07a', light: '#f7e7d4', inner: PINK, ear: 'long', face: 'bunny', tail: 'puff' },
  fox:      { body: '#f08a3c', light: '#fff4e6', dark: '#5a3d3a', inner: '#fff4e6', ear: 'tall', face: 'fox', tail: 'fox', limbs: 'dark' },
  redpanda: { body: '#d9653b', light: '#fff2e3', dark: '#5a3a33', inner: '#fff2e3', ear: 'pointy', face: 'redpanda', tail: 'ringed', limbs: 'dark' },
  mouse:    { body: '#c9bfd6', light: '#f3eef8', inner: PINK, ear: 'mouse', face: 'mouse', tail: 'thin' },
  hamster:  { body: '#f2c38b', light: '#fff3e3', inner: PINK, ear: 'small', face: 'hamster' },
  pig:      { body: '#ffb8c6', light: '#ffd3dc', snout: '#ff90a8', inner: '#ff90a8', ear: 'pig', face: 'pig', tail: 'curly' },
  lamb:     { body: '#fffaf0', light: '#f6dcc0', dark: '#8a6a5a', ear: 'side', face: 'lamb', marks: ['wool'] },
  cow:      { body: '#fbfaf7', light: '#fbfaf7', snout: '#ffb3c1', spot: '#6b4f45', ear: 'side', face: 'cow', marks: ['spots', 'horns'], tail: 'tuft' },
  lion:     { body: '#f5bb4e', light: '#fff1d0', mane: '#d9822f', ear: 'small', face: 'muzzle', marks: ['mane'], tail: 'tuft' },
  tiger:    { body: '#f4993e', light: '#fff4e3', stripe: '#4a3340', ear: 'round', face: 'muzzle', marks: ['stripes'], tail: 'tigertail' },
  raccoon:  { body: '#a39eb0', light: '#f0edf4', dark: '#4e4858', ear: 'pointy', face: 'raccoon', tail: 'ringed', limbs: 'dark' },
  monkey:   { body: '#a8754f', light: '#f3d3ad', ear: 'monkey', face: 'monkey', tail: 'curlylong' },
  elephant: { body: '#aeb9d8', light: '#c9d2ea', inner: '#ffc4d4', ear: 'elephant', face: 'trunk', tail: 'thin' },
  deer:     { body: '#d49a62', light: '#fff0dc', inner: '#fff0dc', ear: 'deer', face: 'muzzle', marks: ['fawn'], tail: 'puff' },
  squirrel: { body: '#d9884a', light: '#fbe3c8', inner: '#fbe3c8', ear: 'tufted', face: 'mouse', tail: 'squirrel' },
  hedgehog: { body: '#f2d6b6', light: '#fff1e0', spikes: '#8e6a4f', ear: 'small', face: 'mouse', marks: ['spikes'] },
  pony:     { body: '#f6c9a0', light: '#fde7d3', hoof: '#a8735a', mane: ['#b0603a', '#d98a52'], ear: 'leaf', face: 'pony', legs: 'pony', marks: ['ponymane'], tail: 'pony' },
  unicorn:  { body: '#fdf4ff', light: '#ffe9f6', hoof: '#c9a7e6', horn: '#ffd257', mane: ['#ff8fc8', '#b48cff', '#7fd4ff'], ear: 'leaf', face: 'pony', legs: 'pony', marks: ['ponymane', 'horn'], tail: 'pony' },
};

// Draw a critter at the current spot. o: { pose: 'sit' | 'head', eyes, mouth, prop, acc: [...], colors }
export function critter(p, kind, o = {}) {
  const sp = { ...SPECIES[kind], ...(o.colors || {}) };
  const marks = new Set([...(sp.marks || []), ...(o.marks || [])]);
  const body = sp.body, light = sp.light, dark = sp.dark || NOSE;
  const limb = sp.limbs === 'dark' ? dark : body;
  const [hrx, hry] = sp.head || (sp.face === 'pony' ? [74, 76] : sp.face === 'cat' ? [86, 72] : sp.face === 'hamster' ? [84, 76] : [82, 74]);
  const HY = -50;
  const head = p.ell(0, HY, hrx, hry);
  const acc = o.acc || [];
  const sit = o.pose !== 'head';
  const hold = o.prop && sit;

  // ---- behind everything: tail, wings, long hair ----
  if (sit && sp.tail) tail(p, sp.tail, sp, kind);
  if (acc.includes('wings')) accessory(p, 'wings', { y: 40 });
  if (acc.includes('feathers')) accessory(p, 'feathers', { y: 40, c: o.wingC });
  if (marks.has('spikes')) p.fill(p.star(0, -10, 128, 100, 16, -90), sp.spikes);
  if (marks.has('ponymane')) {
    const [m1, m2 = m1, m3 = m2] = sp.mane;
    p.fill(p.blob([[-40, -118], [-82, -96], [-100, -40], [-96, 20], [-110, 60], [-70, 40], [-60, -20]]), m2);
    p.fill(p.blob([[40, -118], [86, -100], [104, -40], [100, 10], [116, 54], [76, 36], [62, -20]]), m3);
    if (!sit) p.fill(p.blob([[-96, 20], [-118, 90], [-60, 110], [-70, 40]]), m1);
  }

  // ---- the body ----
  if (sit) {
    const bodyD = p.ell(0, 66, 62, 60);
    if (marks.has('wool')) p.fill(p.star(0, 64, 72, 62, 11, -90), body);
    else p.fill(bodyD, body);
    p.shade(bodyD, p.ell(-12, 54, 62, 60), body);
    if (sp.face !== 'pony' && !marks.has('wool')) p.fill(p.ell(0, 80, 38, 40), light, { clip: bodyD, t: kind === 'panda' || kind === 'polar' || kind === 'bunny' ? 1 : 0, keep: true });
    if (marks.has('spots')) for (const [x, y, r] of [[-36, 50, 13], [30, 96, 11], [44, 46, 9]]) p.fill(p.ell(x, y, r, r * 0.85, 20), sp.spot, { clip: bodyD, t: 1, keep: true });
    if (marks.has('fawn')) for (const [x, y] of [[-40, 40], [-46, 66], [42, 44], [48, 70], [-30, 100]]) p.fill(p.ell(x, y, 6, 4.5), '#fffaf0', { clip: bodyD, t: 1, keep: true, w: 2 });
    if (marks.has('calico')) { p.fill(p.ell(-40, 52, 26, 22, 20), sp.patchA, { clip: bodyD, t: 1, keep: true }); p.fill(p.ell(44, 98, 22, 18), sp.patchB, { clip: bodyD, t: 1, keep: true }); }
    if (marks.has('stripes')) for (const s of [-1, 1]) for (const y of [46, 74]) p.fill(p.blob([[s * 64, y - 6], [s * 40, y], [s * 64, y + 7]], 0.6), sp.stripe, { clip: bodyD, t: 1, keep: true, w: 0 });
    // legs and feet
    if (sp.legs === 'pony') {
      for (const s of [-1, 1]) {
        const haunch = p.ell(s * 54, 108, 30, 26);
        p.fill(haunch, body);
        p.fill(p.ell(s * 66, 128, 18, 9), sp.hoof, { t: 1, keep: true });
      }
    } else {
      for (const s of [-1, 1]) {
        p.fill(p.ell(s * 34, 124, 25, 17), limb);
        if (marks.has('wool') || kind === 'lamb') continue;
        p.fill(p.ell(s * 34, 127, 12, 8), sp.inner && sp.inner !== light ? sp.inner : lighter(limb === dark ? '#9b8aa6' : light, 0.1), { keep: true });
      }
    }
    if (hold) { p.push(0, 70, o.propScale || 1); prop(p, o.prop, o.propOpts || {}); p.pop(); }
    // arms (front legs for ponies)
    for (const s of [-1, 1]) {
      if (sp.legs === 'pony') {
        p.fill(p.rrect(s * 26 - 13, 40, 26, 92, 13), body);
        p.fill(p.rrect(s * 26 - 13, 116, 26, 16, 6), sp.hoof, { t: 1, keep: true });
      } else if (hold) p.fill(p.ell(s * 34, 62, 15, 22, s * -40), limb);
      else p.fill(p.ell(s * 52, 64, 16, 27, s * -18), limb);
    }
    if (marks.has('wool')) p.fill(p.ell(0, 4, 40, 16), body, { t: 1, keep: true });
  } else {
    // a portrait: the shoulders at the bottom
    const bodyD = p.ell(0, 120, 100, 80);
    if (marks.has('wool')) p.fill(p.star(0, 120, 110, 98, 13, -90), body);
    else p.fill(bodyD, body);
    if (sp.face !== 'pony' && !marks.has('wool')) p.fill(p.ell(0, 130, 54, 60), light, { clip: bodyD, t: 1, keep: true });
  }

  if (marks.has('mane')) p.fill(p.star(0, HY + 4, 118, 100, 13, -90), sp.mane);
  if (acc.includes('scarf')) accessory(p, 'scarf', { c: o.scarfC });
  if (acc.includes('bowtie')) accessory(p, 'bowtie', { c: o.bowC });

  // ---- ears behind the head ----
  backEars(p, sp, HY);
  if (marks.has('horns')) for (const s of [-1, 1]) p.fill(p.blob([[s * 30, -112], [s * 44, -140], [s * 52, -136], [s * 48, -108]]), '#f6e3b8', { t: 1, keep: true });

  // ---- the head ----
  p.fill(head, body);
  headMarks(p, sp, marks, head, HY, hrx, hry, kind);
  p.shade(head, p.ell(-12, HY - 12, hrx, hry), body);

  // ---- the face ----
  faceOf(p, sp, o, HY, kind);

  // ---- front ears, hair, horn, hats ----
  frontEars(p, sp, HY);
  if (marks.has('wool')) p.fill(p.cloud(0, -112, 92, 44, 4), body);
  if (marks.has('ponymane')) {
    const [m1, m2 = m1, m3 = m2] = sp.mane;
    p.fill(p.blob([[-6, -128], [-34, -122], [-52, -100], [-36, -84], [-18, -100]]), m1);
    p.fill(p.blob([[2, -130], [34, -126], [50, -104], [32, -90], [14, -106]]), m3 === m1 ? m2 : m2, { t: 0 });
  }
  if (marks.has('horn')) {
    const hornD = p.blob([[-13, -118], [0, -186], [13, -118], [0, -112]], 0.35);
    p.fill(hornD, sp.horn);
    for (const y of [-134, -152, -168]) p.fill(p.poly([[-20, y + 6], [20, y - 4], [20, y + 2], [-20, y + 12]]), darker(sp.horn, 0.18), { clip: hornD, t: 1, w: 1.6 });
  }
  for (const a of acc) if (!['wings', 'feathers', 'scarf', 'bowtie'].includes(a)) accessory(p, a, { head: [hrx, hry, HY], c: o.accC, kind });
}

function tail(p, t, sp, kind) {
  const c = sp.body;
  if (t === 'puff') p.fill(p.cloud(64, 112, 34, 30, 3), sp.light === '#ffffff' ? '#ffffff' : lighter(sp.light, 0.2));
  else if (t === 'wag') p.fill(p.blob([[48, 100], [86, 74], [104, 40], [96, 34], [76, 66], [44, 86]], 0.9), sp.earC || c);
  else if (t === 'long') p.fill(p.blob([[46, 110], [96, 104], [118, 60], [108, 18], [96, 22], [102, 62], [86, 90], [44, 94]], 0.9), c);
  else if (t === 'fox') {
    const d = p.blob([[40, 118], [100, 120], [140, 80], [138, 20], [112, 40], [100, 84], [52, 92]], 0.95);
    p.fill(d, c);
    p.fill(p.ell(134, 26, 24, 30, 20), sp.light, { clip: d });
  } else if (t === 'ringed' || t === 'tigertail') {
    const d = p.blob([[40, 116], [98, 120], [132, 84], [132, 30], [108, 34], [104, 80], [50, 92]], 0.95);
    p.fill(d, c);
    const ring = t === 'ringed' ? sp.dark : sp.stripe;
    for (const [x, y, r] of [[128, 40, 0], [122, 70, 20], [100, 100, 50]]) p.fill(p.ell(x, y, 26, 8, r), ring, { clip: d, t: 1, keep: true });
  } else if (t === 'curly') p.line(p.curve([[52, 112], [76, 108], [80, 92], [68, 90], [70, 102], [90, 104]]), 4, darker(c, 0.25));
  else if (t === 'thin') p.line(p.curve([[50, 116], [92, 118], [112, 96], [100, 76], [114, 64]]), 5, darker(c, 0.2));
  else if (t === 'curlylong') p.fill(p.blob([[46, 114], [100, 116], [120, 76], [110, 40], [84, 44], [90, 62], [102, 70], [98, 96], [52, 98]], 0.9), c);
  else if (t === 'tuft') { p.line(p.curve([[50, 116], [92, 116], [108, 88]]), 4.5, darker(c, 0.15)); p.fill(p.blob([[104, 92], [100, 70], [118, 72], [122, 90]]), sp.mane || sp.spot || darker(c, 0.3)); }
  else if (t === 'squirrel') {
    const d = p.blob([[36, 120], [96, 118], [128, 60], [120, -20], [90, -70], [52, -60], [70, -20], [86, 40], [52, 90]], 0.95);
    p.fill(d, c);
    p.fill(p.blob([[96, -52], [116, -10], [104, 50], [100, -10]], 0.9), lighter(c, 0.3), { clip: d, t: 1, keep: true, w: 0 });
  } else if (t === 'pony') {
    const [m1, m2 = m1, m3 = m2] = sp.mane;
    p.fill(p.blob([[52, 96], [108, 70], [140, 90], [130, 140], [104, 112], [70, 110]]), m1);
    p.fill(p.blob([[60, 104], [104, 100], [132, 150], [92, 146], [76, 120]]), m2);
    if (m3 !== m2) p.fill(p.blob([[96, 80], [126, 64], [150, 70], [138, 96], [118, 88]]), m3, { t: 1, keep: true });
  }
}

function backEars(p, sp, HY) {
  const c = sp.earC || (sp.limbs === 'dark' && sp.face === 'panda' ? sp.dark : sp.body);
  const inner = sp.inner || sp.light;
  for (const s of [-1, 1]) {
    switch (sp.ear) {
      case 'round':
        p.fill(p.circ(s * 58, HY - 58, 26), c);
        if (sp.face !== 'panda') p.fill(p.circ(s * 58, HY - 56, 14), inner);
        break;
      case 'small':
        p.fill(p.circ(s * 56, HY - 60, 18), c);
        p.fill(p.circ(s * 56, HY - 58, 9), inner, { keep: true });
        break;
      case 'mouse':
        p.fill(p.circ(s * 66, HY - 52, 38), c);
        p.fill(p.circ(s * 66, HY - 50, 24), inner, { t: 0 });
        break;
      case 'fluffy':
        p.fill(p.star(s * 74, HY - 38, 42, 36, 9), c);
        p.fill(p.circ(s * 74, HY - 38, 22), sp.light);
        break;
      case 'pointy': case 'tall': case 'tufted': {
        const tip = sp.ear === 'tall' ? -114 : sp.ear === 'tufted' ? -94 : -98;
        p.fill(p.blob([[s * 22, HY - 62], [s * 64, HY + tip], [s * 86, HY - 30]], 0.3), c);
        p.fill(p.blob([[s * 38, HY - 56], [s * 62, HY + tip + 24], [s * 74, HY - 38]], 0.3), sp.face === 'raccoon' ? sp.dark : inner, { keep: true });
        if (sp.ear === 'tufted') p.line(p.curve([[s * 62, HY + tip + 6], [s * 66, HY + tip - 10], [s * 58, HY + tip - 18]]), 3);
        break;
      }
      case 'long':
        p.fill(p.ell(s * 32, HY - 108, 21, 54, s * 10), c);
        p.fill(p.ell(s * 32, HY - 104, 10, 40, s * 10), inner, { t: 0 });
        break;
      case 'leaf': case 'deer':
        if (sp.ear === 'deer') { p.fill(p.ell(s * 86, HY - 46, 34, 16, s * -24), c); p.fill(p.ell(s * 86, HY - 46, 20, 8, s * -24), inner, { keep: true }); }
        else { p.fill(p.ell(s * 46, HY - 72, 15, 28, s * 24), c); p.fill(p.ell(s * 46, HY - 70, 7, 17, s * 24), PINK, { keep: true }); }
        break;
      case 'elephant':
        p.fill(p.ell(s * 84, HY - 4, 52, 62, s * 10), c);
        p.fill(p.ell(s * 86, HY - 2, 34, 44, s * 10), inner, { t: 0 });
        break;
      case 'monkey':
        p.fill(p.circ(s * 86, HY + 2, 22), c);
        p.fill(p.circ(s * 86, HY + 2, 12), sp.light, { keep: true });
        break;
      default: break;
    }
  }
}

function frontEars(p, sp, HY) {
  const c = sp.earC || sp.body;
  for (const s of [-1, 1]) {
    switch (sp.ear) {
      case 'floppy':
        p.fill(p.blob([[s * 48, HY - 64], [s * 86, HY - 70], [s * 106, HY - 10], [s * 92, HY + 30], [s * 70, HY + 12], [s * 66, HY - 30]], 0.9), c);
        break;
      case 'side':
        p.fill(p.ell(s * 92, HY - 26, 26, 12, s * 18), sp.face === 'lamb' ? sp.light : c);
        if (sp.face === 'cow') p.fill(p.ell(s * 94, HY - 26, 14, 6, s * 18), PINK, { t: 1, keep: true, w: 0 });
        break;
      case 'pig':
        p.fill(p.blob([[s * 30, HY - 64], [s * 66, HY - 96], [s * 76, HY - 46]], 0.4), c);
        break;
      default: break;
    }
  }
}

function headMarks(p, sp, marks, head, HY, hrx, hry, kind) {
  const f = sp.face;
  if (f === 'panda') for (const s of [-1, 1]) p.fill(p.ell(s * 32, HY + 2, 19, 24, s * -28), sp.dark, { clip: head });
  if (f === 'fox') p.fill(p.blob([[-90, HY + 4], [-44, HY + 2], [0, HY + 24], [44, HY + 2], [90, HY + 4], [70, HY + 70], [0, HY + 80], [-70, HY + 70]], 0.8), sp.light, { clip: head });
  if (f === 'redpanda') {
    p.fill(p.blob([[-70, HY + 18], [-30, HY + 10], [0, HY + 26], [30, HY + 10], [70, HY + 18], [50, HY + 70], [0, HY + 80], [-50, HY + 70]], 0.8), sp.light, { clip: head });
    for (const s of [-1, 1]) p.fill(p.ell(s * 34, HY - 30, 13, 8, s * 10), sp.light, { clip: head, t: 1, keep: true });
  }
  if (f === 'raccoon') {
    p.fill(p.blob([[-86, HY - 14], [-40, HY - 26], [0, HY - 10], [40, HY - 26], [86, HY - 14], [80, HY + 12], [40, HY + 18], [0, HY + 6], [-40, HY + 18], [-80, HY + 12]], 0.8), sp.dark, { clip: head });
  }
  if (f === 'monkey') p.fill(p.blob([[-60, HY - 18], [-30, HY - 40], [0, HY - 22], [30, HY - 40], [60, HY - 18], [56, HY + 30], [0, HY + 62], [-56, HY + 30]], 0.85), sp.light, { clip: head });
  if (f === 'blaze') p.fill(p.blob([[-12, HY - 80], [12, HY - 80], [20, HY - 10], [44, HY + 40], [0, HY + 70], [-44, HY + 40], [-20, HY - 10]], 0.8), sp.light, { clip: head });
  if (f === 'lamb') { /* face is the head */ }
  if (marks.has('patch')) { /* teddy: a sewn patch */ p.fill(p.rrect(36, HY - 70, 22, 18, 5), '#f7a7c0', { clip: head, t: 1, keep: true, w: 2 }); }
  if (marks.has('eyespot')) p.fill(p.ell(-34, HY - 6, 22, 24, -10), sp.spot, { clip: head, t: 1, keep: true });
  if (marks.has('calico')) { p.fill(p.ell(-50, HY - 40, 34, 30, 20), sp.patchA, { clip: head }); p.fill(p.ell(56, HY - 44, 30, 26), sp.patchB, { clip: head, t: 1, keep: true }); }
  if (marks.has('spots') && kind === 'cow') p.fill(p.ell(48, HY - 40, 26, 22, 30), sp.spot, { clip: head, t: 1, keep: true });
  if (marks.has('tabby')) for (const x of [-16, 0, 16]) p.fill(p.ell(x, HY - 60, 4.5, 11), darker(sp.body, 0.22), { clip: head, t: 1, keep: true, w: 0 });
  if (marks.has('stripes')) {
    for (const x of [-14, 0, 14]) p.fill(p.ell(x, HY - 66, 4.5, 12), sp.stripe, { clip: head, t: 1, keep: true, w: 0 });
    for (const s of [-1, 1]) for (const y of [-10, 8]) p.fill(p.blob([[s * 90, HY + y - 6], [s * 62, HY + y], [s * 90, HY + y + 6]], 0.6), sp.stripe, { clip: head, t: 1, keep: true, w: 0 });
  }
}

function faceOf(p, sp, o, HY, kind) {
  const ek = o.eyes || 'open';
  const lashes = !!o.lashes;
  const f = sp.face;
  const mouth = o.mouth || 'w';
  if (f === 'muzzle' || f === 'blaze' || f === 'koala' || f === 'panda' || f === 'monkey' || f === 'lamb') {
    if (f === 'muzzle') p.fill(p.ell(0, HY + 32, 31, 23), sp.light);
    if (f === 'panda') p.fill(p.ell(0, HY + 32, 27, 20), '#ffffff', { t: 2 });
    eyes(p, 32, HY - 6, { kind: ek, lashes, rx: f === 'panda' ? 9 : 9.5 });
    if (f === 'koala') p.ink(p.ell(0, HY + 22, 15, 20), NOSE);
    else p.ink(p.blob([[-10, HY + 20], [10, HY + 20], [0, HY + 30]], 0.7), NOSE);
    if (f !== 'koala') p.line(p.curve([[0, HY + 28], [0, HY + 36]]), 3);
    smile(p, 0, HY + (f === 'koala' ? 50 : 38), 10, f === 'koala' ? 'smile' : mouth);
  } else if (f === 'cat' || f === 'mouse' || f === 'bunny' || f === 'hamster' || f === 'redpanda' || f === 'raccoon' || f === 'fox') {
    if (f === 'hamster') for (const s of [-1, 1]) p.fill(p.ell(s * 52, HY + 26, 30, 24), sp.light);
    if (f === 'raccoon' || f === 'redpanda') p.fill(p.ell(0, HY + 34, 26, 18), sp.light, { t: 1, keep: true });
    eyes(p, 32, HY - 4, { kind: ek, lashes, look: 0 });
    const nose = f === 'fox' || f === 'raccoon' || f === 'redpanda' ? NOSE : '#ff7f9f';
    p.ink(p.blob([[-8, HY + 20], [8, HY + 20], [0, HY + 28]], 0.7), nose, { w: 1.6 });
    smile(p, 0, HY + 34, 9, mouth);
    if (f === 'bunny') p.ink(p.rrect(-6, HY + 34, 12, 11, 3), '#ffffff', { w: 2 });
    if (f === 'cat' || f === 'mouse' || f === 'bunny') for (const s of [-1, 1]) for (const dy of [-6, 4]) p.line(p.curve([[s * 46, HY + 22 + dy], [s * 92, HY + 18 + dy * 2.2]]), 2.2);
  } else if (f === 'pig' || f === 'cow') {
    const big = f === 'cow';
    eyes(p, 34, HY - 10, { kind: ek, lashes });
    p.fill(p.ell(0, HY + (big ? 34 : 28), big ? 42 : 24, big ? 26 : 17), sp.snout);
    for (const s of [-1, 1]) p.ink(p.ell(s * (big ? 14 : 8), HY + (big ? 32 : 28), big ? 5 : 4, big ? 7 : 6), darker(sp.snout, 0.45));
    if (!big) smile(p, 0, HY + 52, 8, 'smile');
  } else if (f === 'trunk') {
    eyes(p, 34, HY - 12, { kind: ek, lashes });
    p.fill(p.blob([[-18, HY + 2], [18, HY + 2], [18, HY + 50], [30, HY + 74], [42, HY + 72], [46, HY + 88], [24, HY + 92], [2, HY + 64], [-12, HY + 40]], 0.8), sp.body);
    p.line(p.curve([[-6, HY + 30], [6, HY + 32]]), 2);
    p.line(p.curve([[-4, HY + 46], [10, HY + 48]]), 2);
  } else if (f === 'pony') {
    p.fill(p.ell(0, HY + 34, 44, 30), sp.light);
    eyes(p, 34, HY - 14, { kind: ek, lashes: o.lashes !== false, rx: 10, ry: 13 });
    for (const s of [-1, 1]) p.ink(p.ell(s * 14, HY + 30, 4, 5.5), darker(sp.light, 0.4));
    smile(p, 0, HY + 46, 11, 'smile');
  }
  if (o.cheeks !== false) cheeks(p, f === 'pony' ? 54 : 56, HY + (f === 'pony' ? 18 : 20));
}
