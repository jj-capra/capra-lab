/* Pure SVG builders. Nothing here touches the document — they return strings,
 * which keeps them usable for server-side image rendering later.
 *
 * Everything here is drawn as print: flat process inks, a halftone screen on
 * every ground, a heavy black keyline around each shape, and the registration
 * deliberately a hair off. No gradients, no blurs, no soft shadows — a press
 * cannot make those, so neither does this.
 */
import { SHAPES, SHAPE_OF } from './shapes.js';
import { ROLE_LABEL, BIOME_CLIMATE } from '../shared/constants.js';
import { rating } from '../shared/engine.js';

import { INK, BONE, ROLE_INK, figureOn } from './palette.js';

/* role type sits on the same side as the figure: ink on light grounds */
const typeOn = figureOn;

export function nameFit(n) {
  if (n.length <= 11) return [10.5, [n]];
  if (n.length <= 17) return [8.4, [n]];
  const half = Math.floor(n.length / 2);
  let a = '';
  for (const w of n.split(' ')) {
    if (!a || a.length + w.length + 1 <= half) a = (a + ' ' + w).trim(); else break;
  }
  return [7.6, [a, n.slice(a.length).trim()]];
}

/* A halftone screen, drawn as a real dot grid so it prints at any size.
 * Defined once per SVG and referenced, or a pool of forty cards would carry
 * forty identical pattern definitions. */
function screen(id, dot, size) {
  return '<pattern id="' + id + '" width="' + size + '" height="' + size +
    '" patternUnits="userSpaceOnUse">' +
    '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + (size * 0.26) +
    '" fill="' + dot + '"/></pattern>';
}

/* The ground behind the animal: a horizon band, screened, with the terrain
 * drawn into it. Water gets swell lines, land gets a treeline. */
export function scene(a, w, groundY) {
  const ink = 'rgba(17,6,11,.34)';
  let o = '';
  if (BIOME_CLIMATE[a.biomes[0]] === 'water' || a.climate === 'water') {
    for (let i = 0; i < 3; i++) {
      const y = groundY - 13 + i * 6.5;
      let d = 'M6 ' + y;
      for (let x = 6; x < w - 6; x += 16) d += ' q4 -3.4 8 0 t8 0';
      o += '<path d="' + d + '" fill="none" stroke="' + ink + '" stroke-width="2"/>';
    }
  } else {
    for (let x = 8; x < w - 4; x += 13) {
      const h = 11 + ((x * 7) % 13);
      o += '<path d="M' + (x - h * 0.44) + ' ' + groundY + ' L' + x + ' ' + (groundY - h) +
           ' L' + (x + h * 0.44) + ' ' + groundY + ' Z" fill="' + ink + '"/>';
    }
  }
  return o;
}

/* An animal, inked. Drawn twice: a fat black keyline underneath, the fill on
 * top, which is how a flat colour reads as drawn rather than pasted. */
function creature(name, cx, cy, scale, fill) {
  const d = SHAPES[SHAPE_OF[name] || 'cat'];
  const g = '<g transform="translate(' + cx + ' ' + cy + ') scale(' + scale.toFixed(3) +
            ') translate(-60 -72)">';
  return g +
    '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="9" ' +
    'stroke-linejoin="round" stroke-linecap="round"/>' +
    '<path d="' + d + '" fill="' + fill + '" stroke="' + fill + '" stroke-width="2" ' +
    'stroke-linejoin="round" stroke-linecap="round"/></g>';
}

/* mode 'full' = the whole card. mode 'mark' = the animal and its ground only,
 * for the places a full card would be illegible. */
export function badge(a, role, mode) {
  const W = 120, H = 152;
  const uid = 'p' + (a.id != null ? a.id : 0) + (role || '') + (mode || '');
  const ink = ROLE_INK[role] || ROLE_INK.apex;
  const sc = 0.60 + 0.20 * Math.min(1, Math.log10(a.kg + 1) / 4.9);

  if (mode === 'mark') {
    return '<svg class="badge" viewBox="0 0 120 120" aria-hidden="true">' +
      '<defs>' + screen('s' + uid, 'rgba(17,6,11,.30)', 5) + '</defs>' +
      '<rect x="3" y="3" width="114" height="114" fill="' + ink + '" stroke="' + INK + '" stroke-width="6"/>' +
      '<rect x="3" y="3" width="114" height="114" fill="url(#s' + uid + ')"/>' +
      creature(a.name, 60, 92, sc * 0.78, figureOn(role)) +
      '</svg>';
  }

  const f = nameFit(a.name), fs = f[0], lines = f[1];
  const nameY = lines.length === 1 ? 24 : 19;
  let tx = '';
  lines.forEach(function (l, i) {
    tx += '<tspan x="60" dy="' + (i === 0 ? 0 : fs + 1.6) + '">' + l.toUpperCase() + '</tspan>';
  });

  return '<svg class="badge" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
    '<defs>' + screen('s' + uid, 'rgba(17,6,11,.26)', 5) + '</defs>' +
    /* the card: role ink, screened, with a heavy keyline */
    '<rect x="3" y="3" width="' + (W - 6) + '" height="' + (H - 6) + '" fill="' + ink + '"/>' +
    '<rect x="3" y="3" width="' + (W - 6) + '" height="' + (H - 6) + '" fill="url(#s' + uid + ')"/>' +
    scene(a, W, 114) +
    creature(a.name, 60, 108, sc, figureOn(role)) +
    /* name plate across the top */
    '<rect x="3" y="3" width="' + (W - 6) + '" height="' + (nameY + fs * lines.length - 8) +
      '" fill="' + INK + '"/>' +
    '<text x="60" y="' + nameY + '" text-anchor="middle" font-family="Anton, Impact, sans-serif" ' +
      'font-size="' + fs + '" fill="' + BONE + '" letter-spacing=".3">' + tx + '</text>' +
    /* the rating, stamped bottom-right over everything */
    '<rect x="' + (W - 42) + '" y="' + (H - 36) + '" width="39" height="33" fill="' + INK + '"/>' +
    '<text x="' + (W - 22.5) + '" y="' + (H - 12) + '" text-anchor="middle" ' +
      'font-family="Anton, Impact, sans-serif" font-size="23" fill="' + ink + '">' +
      rating(a, role) + '</text>' +
    /* the role, small, bottom-left */
    '<text x="9" y="' + (H - 12) + '" font-family="Anton, Impact, sans-serif" font-size="10" ' +
      'fill="' + typeOn(role) + '" letter-spacing=".9">' + ROLE_LABEL[role].toUpperCase() + '</text>' +
    '<rect x="3" y="3" width="' + (W - 6) + '" height="' + (H - 6) + '" fill="none" stroke="' + INK +
      '" stroke-width="6"/>' +
    '</svg>';
}

/* The battlefield: your five standing together on today's ground. */
export function fieldSVG(biome, members) {
  const W = 340, GROUND = 112;
  const water = biome && BIOME_CLIMATE[biome] === 'water';
  let back = '<defs>' + screen('fs', 'rgba(255,248,238,.09)', 6) + '</defs>' +
    '<rect width="' + W + '" height="126" fill="url(#fs)"/>';

  if (water) {
    for (let i = 0; i < 3; i++) {
      const y = GROUND - 16 + i * 8;
      let d = 'M8 ' + y;
      for (let x = 8; x < W - 8; x += 28) d += ' q7 -5 14 0 t14 0';
      back += '<path d="' + d + '" fill="none" stroke="#19C6D8" stroke-width="2.5" opacity=".5"/>';
    }
  } else {
    for (let x = 14; x < W - 8; x += 23) {
      const h = 16 + ((x * 7) % 17);
      back += '<path d="M' + (x - h * 0.44) + ' ' + GROUND + ' L' + x + ' ' + (GROUND - h) +
              ' L' + (x + h * 0.44) + ' ' + GROUND + ' Z" fill="#E02A2A" opacity=".40"/>';
    }
  }
  back += '<path d="M0 ' + GROUND + ' H' + W + '" stroke="#FFD02E" stroke-width="3"/>';

  /* lay them out by their own width, then shrink the rank to fit */
  let cast = '';
  const GAP = 7, PAD = 12;
  const scales = members.map(m => 0.34 + 0.56 * Math.min(1, Math.log10(m.a.kg + 1) / 4.9));
  const span = scales.reduce((n, s) => n + 116 * s, 0) + GAP * Math.max(0, members.length - 1);
  const k = Math.min(1, (W - PAD * 2) / Math.max(1, span));
  let x = PAD + ((W - PAD * 2) - span * k) / 2;
  members.forEach(function (m, i) {
    const s = scales[i] * k, wide = 116 * s;
    cast += creature(m.a.name, x + wide / 2, GROUND, s, BONE);
    x += wide + GAP * k;
  });
  /* cropped to the action, but tall enough to anchor the foot of the season
     screen, which otherwise trails off into empty page on a phone */
  return '<svg viewBox="0 30 ' + W + ' 90" aria-hidden="true">' + back + cast + '</svg>';
}

/* The five slots, as stamped tokens. Empty ones name the job. */
export function discSVG(a, role) {
  const ink = ROLE_INK[role] || ROLE_INK.apex;
  const uid = 'd' + role + (a ? a.id : 'x');
  let o = '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<defs>' + screen('s' + uid, 'rgba(17,6,11,.28)', 6) + '</defs>' +
    '<rect x="4" y="4" width="92" height="92" fill="' + (a ? ink : '#1D0F16') + '"/>';
  if (a) o += '<rect x="4" y="4" width="92" height="92" fill="url(#s' + uid + ')"/>';
  if (a) {
    o += creature(a.name, 50, 76, 0.55, figureOn(role)) +
      '<rect x="4" y="70" width="34" height="26" fill="' + INK + '"/>' +
      '<text x="21" y="90" text-anchor="middle" font-family="Anton, Impact, sans-serif" ' +
      'font-size="19" fill="' + ink + '">' + rating(a, role) + '</text>';
  } else {
    o += '<text x="50" y="56" text-anchor="middle" font-family="Anton, Impact, sans-serif" ' +
      'font-size="13" fill="' + ink + '" letter-spacing=".6">' +
      ROLE_LABEL[role].toUpperCase() + '</text>';
  }
  return o + '<rect x="4" y="4" width="92" height="92" fill="none" stroke="' + INK +
    '" stroke-width="6"/></svg>';
}
