/* Pure SVG builders. Nothing here touches the document — they return strings,
   which keeps them usable for server-side image rendering later. */
import { SHAPES, SHAPE_OF, SHIELD, INNER } from './shapes.js';
import { ROLE_LABEL, BIOME_CLIMATE } from '../shared/constants.js';
import { rating } from '../shared/engine.js';

export function nameFit(n) {
  if (n.length <= 12) return [9.0, [n]];
  if (n.length <= 18) return [7.4, [n]];
  const half = Math.floor(n.length / 2);
  let a = '';
  for (const w of n.split(' ')) {
    if (!a || a.length + w.length + 1 <= half) a = (a + ' ' + w).trim(); else break;
  }
  return [6.8, [a, n.slice(a.length).trim()]];
}
/* the ground behind the animal: waves for sea creatures, a treeline for everything else */
export function scene(a) {
  if (a.climate === 'water') {
    let o = '';
    for (let i = 0; i < 3; i++) {
      const y = 90 + i * 7;
      o += '<path d="M16 ' + y + ' q7 -4.5 14 0 t14 0 t14 0 t14 0 t14 0" fill="none" ' +
           'stroke="var(--moss2)" stroke-width="1.8"/>';
    }
    return o;
  }
  let o = '';
  [[20,16],[34,22],[48,14],[60,25],[74,17],[88,21],[100,13]].forEach(function (t) {
    const x = t[0], h = t[1], w = h * 0.46;
    o += '<path d="M' + (x - w) + ' 104 L' + x + ' ' + (104 - h) + ' L' + (x + w) + ' 104 Z" fill="var(--moss2)"/>';
  });
  return o + '<path d="M14 104 H106" stroke="var(--moss2)" stroke-width="1.6"/>';
}
/* mode 'full' = name, treeline, role and number. mode 'mark' = shield and silhouette only */
export function badge(a, role, mode) {
  const key = SHAPE_OF[a.name] || 'cat';
  const sc = 0.55 + 0.17 * Math.min(1, Math.log10(a.kg + 1) / 4.9);
  const base = mode === 'mark' ? 112 : 104;
  let o = '<svg class="badge" viewBox="0 0 120 152" aria-hidden="true">' +
    '<path d="' + SHIELD + '" fill="var(--moss)" stroke="var(--ochre)" stroke-width="3"/>' +
    '<path d="' + INNER + '" fill="none" stroke="var(--brass-d)" stroke-width="1"/>' +
    (mode === 'mark' ? '' : scene(a)) +
    '<g transform="translate(60 ' + base + ') scale(' + sc.toFixed(3) + ') translate(-60 -72)">' +
    '<path d="' + SHAPES[key] + '" fill="var(--bone)" stroke="var(--bone)" stroke-width="2.2" ' +
    'stroke-linejoin="round" stroke-linecap="round"/></g>';
  if (mode !== 'mark') {
    const f = nameFit(a.name), fs = f[0], lines = f[1];
    let tx = '';
    lines.forEach(function (l, i) {
      tx += '<tspan x="60" dy="' + (i === 0 ? 0 : fs + 1.4) + '">' + l + '</tspan>';
    });
    o += '<path d="M15 27 H105" stroke="var(--brass-d)" stroke-width="0.8"/>' +
      '<text x="60" y="' + (lines.length === 1 ? 21 : 17) + '" text-anchor="middle" ' +
      'font-family="var(--serif)" font-size="' + fs + '" fill="var(--ochre)">' + tx + '</text>' +
      '<path d="M28 111 H92" stroke="var(--brass-d)" stroke-width="0.8"/>' +
      '<text x="60" y="121" text-anchor="middle" font-family="var(--serif)" font-size="6.2" ' +
      'fill="var(--ochre)" letter-spacing="1.4">' + ROLE_LABEL[role].toUpperCase() + '</text>' +
      '<text x="60" y="137" text-anchor="middle" font-family="var(--serif)" font-size="14" ' +
      'font-weight="700" fill="var(--bone)">' + rating(a, role) + '</text>' +
      '<circle cx="16" cy="13" r="1.6" fill="var(--brass-d)"/>' +
      '<circle cx="104" cy="13" r="1.6" fill="var(--brass-d)"/>';
  }
  return o + '</svg>';
}

/* silhouette sized by real mass, standing on a common ground line */
/* ---------- the battlefield: everything you have drafted, standing together ---------- */
export function fieldSVG(biome, members) {
  const W = 340, GROUND = 112;
  let back = '';
  if (biome && BIOME_CLIMATE[biome] === 'water') {
    for (let i = 0; i < 3; i++) {
      const y = GROUND - 16 + i * 8;
      let d = 'M8 ' + y;
      for (let x = 8; x < W - 8; x += 28) d += ' q7 -5 14 0 t14 0';
      back += '<path d="' + d + '" fill="none" stroke="var(--moss2)" stroke-width="2"/>';
    }
  } else {
    for (let x = 14; x < W - 8; x += 23) {
      const h = 16 + ((x * 7) % 17);
      back += '<path d="M' + (x - h * 0.44) + ' ' + GROUND + ' L' + x + ' ' + (GROUND - h) +
              ' L' + (x + h * 0.44) + ' ' + GROUND + ' Z" fill="var(--moss2)"/>';
    }
  }
  back += '<path d="M6 ' + GROUND + ' H' + (W - 6) + '" stroke="var(--brass-d)" stroke-width="1.2"/>';
  /* lay them out left to right by their own width, then shrink the whole rank to fit */
  let cast = '';
  const GAP = 7, PAD = 12;
  const scales = members.map(m => 0.30 + 0.50 * Math.min(1, Math.log10(m.a.kg + 1) / 4.9));
  let span = scales.reduce((n, sc) => n + 116 * sc, 0) + GAP * Math.max(0, members.length - 1);
  const k = Math.min(1, (W - PAD * 2) / Math.max(1, span));
  let x = PAD + ((W - PAD * 2) - span * k) / 2;
  members.forEach(function (m, i) {
    const sc = scales[i] * k, wide = 116 * sc;
    cast += '<g transform="translate(' + (x + wide / 2).toFixed(1) + ' ' + GROUND + ') scale(' +
      sc.toFixed(3) + ') translate(-60 -72)"><path d="' + SHAPES[SHAPE_OF[m.a.name] || 'cat'] +
      '" fill="var(--bone)" stroke="var(--bone)" stroke-width="2.2" stroke-linejoin="round" ' +
      'stroke-linecap="round"/></g>';
    x += wide + GAP * k;
  });
  /* crop to the action so the panel costs almost no vertical space */
  return '<svg viewBox="0 44 ' + W + ' 76" aria-hidden="true">' + back + cast + '</svg>';
}
/* ---------- the five discs ---------- */
export function discSVG(a, role) {
  let o = '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<circle cx="50" cy="50" r="46" fill="var(--moss)" stroke="var(--ochre)" stroke-width="3"/>' +
    '<circle cx="50" cy="50" r="40" fill="none" stroke="var(--brass-d)" stroke-width="1"/>';
  if (a) {
    o += '<g transform="translate(50 72) scale(0.50) translate(-60 -72)"><path d="' +
      SHAPES[SHAPE_OF[a.name] || 'cat'] + '" fill="var(--bone)" stroke="var(--bone)" stroke-width="2.2" ' +
      'stroke-linejoin="round" stroke-linecap="round"/></g>' +
      '<text x="50" y="88" text-anchor="middle" font-family="var(--serif)" font-size="14" ' +
      'font-weight="700" fill="var(--ochre)">' + rating(a, role) + '</text>';
  } else {
    o += '<text x="50" y="54" text-anchor="middle" font-family="var(--serif)" font-size="13" ' +
      'fill="var(--brass-d)">' + ROLE_LABEL[role] + '</text>';
  }
  return o + '</svg>';
}
