// Punchline's comic panels: one inline SVG per card (400 × 280), ink outlines, flat color and
// halftone dots, the sign's words drawn into the scene. A `~` in a sign line darkens the letter
// after it (a burnt-out bulb or tube): "~BOWLING" reads OWLING.
//
// Text is sized from its longest line, then game.js squeezes any line that still overflows
// (fitText) once the fonts have loaded.

const INK = '#120E18';
let uid = 0;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

import { letters } from './shared/glyphs.mjs';
export { letters };
const visible = (line) => line.replace(/~/g, '');

// Average glyph width per font size, used to pick a size that fits before the real measure.
const FONTS = {
  disp: { family: 'Bangers, Impact, sans-serif', k: 0.47, weight: 400, ls: 1 },
  sans: { family: 'Inter, system-ui, sans-serif', k: 0.66, weight: 800, ls: 0 },
  hand: { family: '"Permanent Marker", "Comic Sans MS", cursive', k: 0.62, weight: 400, ls: 0 },
};

// The letters to circle at the reveal (set by panel() while it draws the odd tile).
let MARKS = null;
const glyphs = (l, k) => letters(l).map((g, i) => {
  const cls = [g.off && 'off', MARKS && MARKS[k] && MARKS[k].includes(i) && 'diff'].filter(Boolean).join(' ');
  return cls ? `<tspan class="${cls}">${esc(g.c)}</tspan>` : esc(g.c);
}).join('');

// The sign's lines centered in a box. o: { font, fills (one per line or one), size, lh, cls, shadow }
function words(lines, box, o) {
  const f = FONTS[o.font || 'disp'];
  const n = Math.max(lines.length, 1), lh = o.lh || 1.1;
  const longest = Math.max(1, ...lines.map((l) => visible(l).length));
  const size = Math.min(o.size || 64, box.h / (n * lh), box.w / (longest * f.k));
  const cx = box.x + box.w / 2;
  const first = box.y + box.h / 2 - ((n - 1) * size * lh) / 2 + size * 0.36;
  const fills = [].concat(o.fills || INK);
  const line = (l, k, extra = '') => {
    const y = first + k * size * lh;
    const spans = glyphs(l, k);
    return `<text x="${cx}" y="${y.toFixed(1)}" text-anchor="middle" font-family='${f.family}' font-weight="${f.weight}" font-size="${size.toFixed(1)}" letter-spacing="${f.ls}" fill="${fills[k % fills.length]}" data-fit="${box.w}" ${extra}>${spans}</text>`;
  };
  let out = '';
  if (o.shadow) out += `<g class="shade" fill="${o.shadow}" transform="translate(${o.shadowAt || '2.5 3'})">${lines.map((l, k) => line(l, k).replace(/fill="[^"]*"/, `fill="${o.shadow}"`)).join('')}</g>`;
  if (o.glow) out += `<g class="glowl" filter="url(#${o.glow})">${lines.map((l, k) => line(l, k)).join('')}</g>`;
  out += `<g class="${o.cls || 'lit'}">${lines.map((l, k) => line(l, k)).join('')}</g>`;
  return out;
}

// A small one-line label (business names, tabs).
function label(text, box, o = {}) {
  if (!text) return '';
  const f = FONTS[o.font || 'disp'];
  const size = Math.min(o.size || 22, box.h * 0.8, box.w / (text.length * f.k));
  return `<text x="${box.x + box.w / 2}" y="${(box.y + box.h / 2 + size * 0.36).toFixed(1)}" text-anchor="middle" font-family='${f.family}' font-weight="${f.weight}" font-size="${size.toFixed(1)}" letter-spacing="${f.ls}" fill="${o.fill || INK}" data-fit="${box.w}">${esc(text)}</text>`;
}

const defs = (id, extra = '') => `<defs>
  <pattern id="dots${id}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${INK}"/></pattern>
  ${extra}</defs>`;
const dots = (id, op = 0.1) => `<rect width="400" height="280" fill="url(#dots${id})" opacity="${op}"/>`;
const frame = `<rect x="2" y="2" width="396" height="276" fill="none" stroke="${INK}" stroke-width="5"/>`;
const post = (x, y, w, h, fill = '#8b5a3c') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${INK}" stroke-width="4"/>`;

const SCENES = {
  tee(c, id) { return tee(c, id, false); },
  neon(c, id) {
    const glow = `glow${id}`;
    return defs(id, `<filter id="${glow}" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
      <linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140B26"/><stop offset="1" stop-color="#2E1748"/></linearGradient>
      <pattern id="brick${id}" width="40" height="20" patternUnits="userSpaceOnUse"><rect width="40" height="20" fill="#3B2140"/><path d="M0 .5H40M0 10.5H40M10 0V10M30 10V20" stroke="#24122B" stroke-width="2"/></pattern>`)
      + `<rect width="400" height="280" fill="url(#sky${id})"/><rect y="24" width="400" height="256" fill="url(#brick${id})"/>`
      + `<circle cx="352" cy="18" r="9" fill="#FFF3C4" opacity=".8"/>`
      + `<path d="M70 44V34M330 44V34" stroke="${INK}" stroke-width="4"/>`
      + `<rect x="34" y="42" width="332" height="156" rx="16" fill="#120A1C" stroke="${INK}" stroke-width="5"/>`
      + `<rect x="42" y="50" width="316" height="140" rx="11" fill="none" stroke="#2D2140" stroke-width="2"/>`
      + `<g class="neon">${words(c.sign, { x: 54, y: 58, w: 292, h: 124 }, { font: 'disp', fills: ['#FF4FA3', '#3EE8FF', '#FFE14D', '#7CFF6B'], glow, size: 62 })}</g>`
      + `<rect x="110" y="212" width="180" height="26" fill="#E4572E" stroke="${INK}" stroke-width="4"/>`
      + label(c.where, { x: 118, y: 213, w: 164, h: 24 }, { fill: '#FFF8EC' })
      + `<rect x="166" y="238" width="68" height="42" fill="#1A1222" stroke="${INK}" stroke-width="4"/>`
      + dots(id, 0.08) + frame;
  },
  marquee(c, id) {
    let bulbs = '';
    for (let x = 40; x <= 360; x += 20) bulbs += `<circle cx="${x}" cy="70" r="5"/><circle cx="${x}" cy="214" r="5"/>`;
    for (let y = 90; y <= 194; y += 20) bulbs += `<circle cx="28" cy="${y}" r="5"/><circle cx="372" cy="${y}" r="5"/>`;
    return defs(id) + `<rect width="400" height="280" fill="#8FD3FF"/><rect y="14" width="400" height="266" fill="#E9D8B4"/>`
      + `<path d="M0 14H400" stroke="${INK}" stroke-width="4"/>`
      + `<rect x="74" y="24" width="252" height="36" fill="#C8333A" stroke="${INK}" stroke-width="4"/>`
      + label(c.where || 'NOW SHOWING', { x: 84, y: 26, w: 232, h: 32 }, { fill: '#FFF8EC', size: 26 })
      + `<rect x="18" y="62" width="364" height="162" rx="6" fill="#2A2A33" stroke="${INK}" stroke-width="5"/>`
      + `<rect x="38" y="80" width="324" height="124" fill="#FFF8EC" stroke="${INK}" stroke-width="3"/>`
      + `<path d="M38 111H362M38 142H362M38 173H362" stroke="#D9D2C3" stroke-width="2"/>`
      + `<g class="bulbs" fill="#FFE14D" stroke="${INK}" stroke-width="1.5">${bulbs}</g>`
      + `<g class="board">${words(c.sign, { x: 48, y: 84, w: 304, h: 116 }, { font: 'sans', size: 30, lh: 1.08 })}</g>`
      + post(64, 224, 18, 56, '#6B6B78') + post(318, 224, 18, 56, '#6B6B78')
      + dots(id, 0.07) + frame;
  },
  storefront(c, id) {
    let stripes = '';
    for (let x = 0; x < 400; x += 40) stripes += `<rect x="${x}" y="134" width="20" height="30" fill="#C8333A"/>`;
    let scallops = '';
    for (let x = 0; x < 400; x += 20) scallops += `<path d="M${x} 164q10 14 20 0" fill="${(x / 20) % 2 ? '#FFF8EC' : '#C8333A'}" stroke="${INK}" stroke-width="3"/>`;
    return defs(id, `<pattern id="brk${id}" width="36" height="18" patternUnits="userSpaceOnUse"><rect width="36" height="18" fill="#C96B4A"/><path d="M0 .5H36M0 9.5H36M9 0V9M27 9V18" stroke="#A9533A" stroke-width="2"/></pattern>`)
      + `<rect width="400" height="280" fill="#9FE3FF"/><rect y="18" width="400" height="262" fill="url(#brk${id})"/>`
      + `<rect x="30" y="30" width="340" height="100" rx="8" fill="#1F6F5C" stroke="${INK}" stroke-width="5"/>`
      + `<rect x="38" y="38" width="324" height="84" rx="5" fill="none" stroke="#F3D27A" stroke-width="2"/>`
      + words(c.sign, { x: 48, y: 42, w: 304, h: 76 }, { font: 'disp', fills: '#FFF4C9', shadow: '#0B3A2F', size: 52 })
      + `<rect x="0" y="134" width="400" height="30" fill="#FFF8EC"/>${stripes}<path d="M0 134H400" stroke="${INK}" stroke-width="4"/>${scallops}`
      + `<rect x="34" y="186" width="208" height="94" fill="#BFEFFF" stroke="${INK}" stroke-width="5"/>`
      + `<path d="M52 200l30-12M52 216l52-22" stroke="#fff" stroke-width="4" opacity=".7"/>`
      + label(c.where, { x: 46, y: 218, w: 184, h: 34 }, { fill: '#0E4F5C', size: 26 })
      + `<rect x="264" y="186" width="100" height="94" fill="#7A3B2E" stroke="${INK}" stroke-width="5"/><rect x="278" y="198" width="72" height="40" fill="#BFEFFF" stroke="${INK}" stroke-width="3"/><circle cx="346" cy="250" r="5" fill="#FFD23F" stroke="${INK}" stroke-width="2"/>`
      + dots(id, 0.07) + frame;
  },
  billboard(c, id) {
    return defs(id) + `<rect width="400" height="280" fill="#9FDCFF"/><circle cx="350" cy="40" r="22" fill="#FFE27A" stroke="${INK}" stroke-width="3"/>`
      + `<path d="M0 238C80 222 160 230 230 240S360 236 400 228V280H0Z" fill="#6CC46B" stroke="${INK}" stroke-width="4"/>`
      + post(92, 180, 18, 74) + post(290, 180, 18, 74)
      + `<rect x="36" y="178" width="328" height="9" fill="#5B5B66" stroke="${INK}" stroke-width="3"/>`
      + `<path d="M110 22l-12-10M290 22l12-10" stroke="${INK}" stroke-width="4"/><rect x="88" y="6" width="20" height="10" rx="3" fill="#5B5B66" stroke="${INK}" stroke-width="3"/><rect x="292" y="6" width="20" height="10" rx="3" fill="#5B5B66" stroke="${INK}" stroke-width="3"/>`
      + `<rect x="18" y="22" width="364" height="156" fill="#FFF8EC" stroke="${INK}" stroke-width="5"/>`
      + words(c.sign, { x: 30, y: 30, w: 340, h: c.where ? 108 : 138 }, { font: 'disp', fills: [INK, '#E4572E', INK, '#2F6BFF'], size: 60 })
      + (c.where ? `<rect x="18" y="146" width="364" height="32" fill="#FF3D8B" stroke="${INK}" stroke-width="4"/>` + label(c.where, { x: 30, y: 148, w: 340, h: 28 }, { fill: '#FFF8EC' }) : '')
      + dots(id, 0.07) + frame;
  },
  road(c, id) {
    return defs(id) + `<rect width="400" height="280" fill="#A6E1FF"/>`
      + `<path d="M0 220H400V280H0Z" fill="#7BBF5A"/><path d="M150 280L190 220H210L250 280Z" fill="#6B6F78" stroke="${INK}" stroke-width="3"/><path d="M200 230V244M200 254V272" stroke="#FFE14D" stroke-width="4"/>`
      + post(112, 190, 14, 90, '#9AA4AD') + post(274, 190, 14, 90, '#9AA4AD')
      + (c.where ? `<rect x="140" y="12" width="120" height="30" rx="5" fill="#0B7A43" stroke="${INK}" stroke-width="4"/>` + label(c.where, { x: 146, y: 14, w: 108, h: 26 }, { font: 'sans', fill: '#FFFFFF', size: 16 }) : '')
      + `<rect x="34" y="40" width="332" height="152" rx="14" fill="#0B7A43" stroke="${INK}" stroke-width="5"/>`
      + `<rect x="42" y="48" width="316" height="136" rx="9" fill="none" stroke="#FFFFFF" stroke-width="3"/>`
      + words(c.sign, { x: 54, y: 56, w: 292, h: 120 }, { font: 'sans', fills: '#FFFFFF', size: 34 })
      + dots(id, 0.06) + frame;
  },
  banner(c, id) {
    return defs(id, `<pattern id="fence${id}" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0L14 14M14 0L0 14" stroke="#9AA4AD" stroke-width="1.6"/></pattern>`)
      + `<rect width="400" height="280" fill="#B9E6FF"/><rect y="236" width="400" height="44" fill="#7BBF5A"/>`
      + `<rect x="44" y="60" width="312" height="180" fill="url(#fence${id})"/><path d="M44 60H356" stroke="#6B6F78" stroke-width="4"/>`
      + `<rect x="0" y="40" width="46" height="240" fill="#B5523B" stroke="${INK}" stroke-width="4"/><rect x="354" y="40" width="46" height="240" fill="#B5523B" stroke="${INK}" stroke-width="4"/>`
      + `<rect x="-4" y="30" width="54" height="14" fill="#E8D3B0" stroke="${INK}" stroke-width="3"/><rect x="350" y="30" width="54" height="14" fill="#E8D3B0" stroke="${INK}" stroke-width="3"/>`
      + `<rect x="40" y="8" width="320" height="32" fill="#2F3E8F" stroke="${INK}" stroke-width="4"/>`
      + label(c.where || 'WELCOME', { x: 50, y: 10, w: 300, h: 28 }, { fill: '#FFD23F' })
      + `<path d="M46 86L62 80M46 214L62 214M354 86L338 80M354 214L338 214" stroke="#C9B48A" stroke-width="3"/>`
      + `<path d="M60 74Q200 66 340 74V222Q200 214 60 222Z" fill="#FFFFFF" stroke="${INK}" stroke-width="4"/>`
      + `<g fill="#D9D2C3" stroke="${INK}" stroke-width="2"><circle cx="68" cy="82" r="4"/><circle cx="332" cy="82" r="4"/><circle cx="68" cy="214" r="4"/><circle cx="332" cy="214" r="4"/></g>`
      + words(c.sign, { x: 78, y: 86, w: 244, h: 124 }, { font: 'disp', fills: ['#E4572E', '#2F3E8F'], size: 50 })
      + dots(id, 0.06) + frame;
  },
  plaque(c, id) {
    return defs(id) + `<rect width="400" height="280" fill="#D9DEE6"/><rect y="250" width="400" height="30" fill="#9AA3B0"/><path d="M0 250H400" stroke="${INK}" stroke-width="4"/>`
      + `<rect x="292" y="26" width="96" height="226" fill="#B07A4A" stroke="${INK}" stroke-width="5"/>`
      + `<rect x="304" y="40" width="72" height="74" fill="#DBEFF7" stroke="${INK}" stroke-width="3"/>`
      + label(c.where, { x: 307, y: 62, w: 66, h: 26 }, { font: 'sans', fill: '#33414D', size: 13 })
      + `<circle cx="304" cy="150" r="6" fill="#FFD23F" stroke="${INK}" stroke-width="2.5"/>`
      + `<rect x="18" y="44" width="258" height="166" rx="8" fill="#20262E" stroke="${INK}" stroke-width="5"/>`
      + `<rect x="26" y="52" width="242" height="150" rx="5" fill="none" stroke="#D4AF37" stroke-width="2.5"/>`
      + `<g fill="#D4AF37"><circle cx="34" cy="60" r="3"/><circle cx="260" cy="60" r="3"/><circle cx="34" cy="194" r="3"/><circle cx="260" cy="194" r="3"/></g>`
      + words(c.sign, { x: 38, y: 62, w: 218, h: 130 }, { font: 'sans', fills: '#F4F1E8', size: 30 })
      + `<rect x="60" y="226" width="40" height="24" rx="4" fill="#5B8C5A" stroke="${INK}" stroke-width="3"/><path d="M80 226c-8-18 6-26 0-38M80 226c10-14 18-12 22-24" stroke="#3E7A3D" stroke-width="5" fill="none" stroke-linecap="round"/>`
      + dots(id, 0.06) + frame;
  },
  trail(c, id) {
    let trees = '';
    for (const [x, s] of [[20, 1], [70, 1.3], [130, 0.9], [270, 1.1], [330, 1.4], [385, 1]]) trees += `<path d="M${x} ${200 - 120 * s}L${x - 34 * s} 210H${x + 34 * s}Z" fill="#2F7D4F" stroke="${INK}" stroke-width="3"/>`;
    return defs(id) + `<rect width="400" height="280" fill="#BFE9FF"/>${trees}<rect y="206" width="400" height="74" fill="#7BBF5A" stroke="${INK}" stroke-width="4"/>`
      + post(80, 182, 18, 98, '#7A4A28') + post(302, 182, 18, 98, '#7A4A28')
      + (c.where ? `<rect x="106" y="10" width="188" height="32" rx="6" fill="#8A5330" stroke="${INK}" stroke-width="4"/>` + label(c.where, { x: 114, y: 12, w: 172, h: 28 }, { fill: '#FFF1CF' }) + `<path d="M150 42V50M250 42V50" stroke="${INK}" stroke-width="4"/>` : '')
      + `<rect x="30" y="48" width="340" height="140" rx="12" fill="#A0643A" stroke="${INK}" stroke-width="5"/>`
      + `<path d="M44 74Q140 66 240 76T356 70M44 160Q150 152 250 164T356 156M60 116Q120 110 170 118" stroke="#8A5330" stroke-width="2.5" fill="none"/>`
      + words(c.sign, { x: 46, y: 58, w: 308, h: 120 }, { font: 'disp', fills: '#FFF1CF', shadow: '#4E2C14', shadowAt: '-1.5 2', size: 54 })
      + dots(id, 0.06) + frame;
  },
  chalk(c, id) {
    return defs(id) + `<rect width="400" height="280" fill="#F2D8B0"/><rect y="244" width="400" height="36" fill="#CFC6BB" stroke="${INK}" stroke-width="4"/>`
      + `<rect x="0" y="0" width="400" height="44" fill="#2F7D4F" stroke="${INK}" stroke-width="4"/>`
      + label(c.where || 'CAFE', { x: 20, y: 4, w: 360, h: 36 }, { fill: '#FFF1CF', size: 28 })
      + `<rect x="300" y="64" width="88" height="110" fill="#BFEFFF" stroke="${INK}" stroke-width="4"/>`
      + `<path d="M74 256L96 60M326 256L304 60" stroke="#6E4325" stroke-width="7" stroke-linecap="round"/>`
      + `<rect x="64" y="56" width="272" height="182" rx="8" fill="#8A5330" stroke="${INK}" stroke-width="5"/>`
      + `<rect x="76" y="68" width="248" height="158" rx="4" fill="#2B3A34" stroke="${INK}" stroke-width="2"/>`
      + `<path d="M90 214q8-6 16 0t16 0" stroke="#F4F4EE" stroke-width="2" fill="none" opacity=".5"/>`
      + words(c.sign, { x: 86, y: 76, w: 228, h: 136 }, { font: 'hand', fills: ['#F4F4EE', '#FFE9A8', '#F4F4EE', '#BDE8FF'], size: 34, lh: 1.12 })
      + dots(id, 0.05) + frame;
  },
  yard(c, id) {
    let blades = '';
    for (let x = 6; x < 400; x += 14) blades += `<path d="M${x} 280l3-${10 + (x * 7) % 9}l3 ${10 + (x * 7) % 9}" fill="#4FA34E"/>`;
    return defs(id) + `<rect width="400" height="280" fill="#AEE4FF"/><rect x="0" y="40" width="400" height="160" fill="#F3E3C3"/><path d="M0 70H400M0 100H400M0 130H400M0 160H400" stroke="#D9C6A0" stroke-width="3"/>`
      + `<rect y="196" width="400" height="84" fill="#6CC46B" stroke="${INK}" stroke-width="4"/>${blades}`
      + `<rect x="192" y="206" width="16" height="74" fill="#A0643A" stroke="${INK}" stroke-width="4"/>`
      + (c.where ? `<rect x="140" y="246" width="120" height="24" fill="#FFFFFF" stroke="${INK}" stroke-width="3" transform="rotate(3 200 258)"/>` + `<g transform="rotate(3 200 258)">${label(c.where, { x: 146, y: 247, w: 108, h: 22 }, { font: 'hand', size: 14 })}</g>` : '')
      + `<g transform="rotate(-2 200 124)"><rect x="46" y="34" width="308" height="178" fill="#D9A86C" stroke="${INK}" stroke-width="5"/>`
      + `<path d="M60 52H340M60 194H340" stroke="#C4925A" stroke-width="2"/>`
      + words(c.sign, { x: 62, y: 46, w: 276, h: 154 }, { font: 'hand', fills: ['#1A1A1A', '#B3122E', '#1A1A1A', '#1F4FB5'], size: 40, lh: 1.08 })
      + `</g>` + dots(id, 0.05) + frame;
  },
  restroom(c, id) {
    return defs(id, `<pattern id="tile${id}" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#E8F1F2"/><path d="M0 .5H28M.5 0V28" stroke="#C3D2D5" stroke-width="2"/></pattern>`)
      + `<rect width="400" height="280" fill="url(#tile${id})"/>`
      + `<rect x="118" y="152" width="164" height="128" fill="#3B6EA5" stroke="${INK}" stroke-width="5"/><rect x="134" y="168" width="132" height="44" fill="#4C80B8" stroke="${INK}" stroke-width="2"/><rect x="250" y="226" width="22" height="8" rx="3" fill="#D9DEE6" stroke="${INK}" stroke-width="2"/>`
      + (c.where ? `<rect x="296" y="186" width="92" height="26" fill="#FFF8EC" stroke="${INK}" stroke-width="3"/>` + label(c.where, { x: 300, y: 187, w: 84, h: 24 }, { font: 'sans', size: 12 }) : '')
      + `<rect x="24" y="24" width="352" height="118" rx="12" fill="#F7F7F2" stroke="${INK}" stroke-width="5"/>`
      + `<g fill="#2F6BFF" stroke="${INK}" stroke-width="2"><circle cx="70" cy="52" r="10"/><path d="M56 68h28l-4 34h-6v26h-8v-26h-6z"/></g>`
      + `<path d="M104 36V130" stroke="#D9DEE6" stroke-width="3"/>`
      + words(c.sign, { x: 114, y: 34, w: 252, h: 98 }, { font: 'sans', size: 30 })
      + dots(id, 0.05) + frame;
  },
};

// ---------- Ugly Ts ----------
// The clip-art kit, each drawn in a 60 × 60 box in the print color (p); details cut back out in
// the shirt color (t).
const STAMPS = {
  wolf: (p, t) => `<path d="M8 58l6-22-6-6 10 1 4-17 6 10 8-18 2 14 12 6-10 4 2 10 6 18z" fill="${p}"/><circle cx="31" cy="27" r="1.8" fill="${t}"/>`,
  moon: (p) => `<path d="M36 6a25 25 0 1 0 18 40A21 21 0 1 1 36 6z" fill="${p}"/>`,
  dolphin: (p, t) => `<path d="M4 42C12 18 34 8 50 14l4-8 2 10c4 2 4 6 2 9-10-6-24-4-32 6-4 5-4 11-2 17l-8-8-6 6z" fill="${p}"/><circle cx="46" cy="20" r="1.6" fill="${t}"/>`,
  eagle: (p, t) => `<path d="M30 18L2 6l10 18L0 28l18 6 12 22 12-22 18-6-12-4L58 6z" fill="${p}"/><path d="M27 20l3-6 3 6z" fill="${t}"/>`,
  lightning: (p) => `<path d="M36 2L12 34h16l-6 24 26-36H32z" fill="${p}"/>`,
  flame: (p, t) => `<path d="M30 2c10 14 20 22 16 38-2 12-10 18-16 18-10 0-18-8-16-20 2-8 8-10 8-18 6 6 8 10 8 14 4-8 4-20 0-32z" fill="${p}"/><path d="M30 34c4 6 8 10 6 16-2 4-4 6-6 6-4 0-8-4-6-10 1-4 4-6 6-12z" fill="${t}"/>`,
  taco: (p, t) => `<path d="M4 46a26 26 0 0 1 52 0z" fill="${p}"/><path d="M10 40q4-6 8 0t8 0 8 0 8 0 8 0" stroke="${t}" stroke-width="3" fill="none"/>`,
  cat: (p, t) => `<path d="M10 22L13 4l12 10h10L47 4l3 18c4 22-6 32-20 32S6 44 10 22z" fill="${p}"/><circle cx="22" cy="28" r="3.5" fill="${t}"/><circle cx="38" cy="28" r="3.5" fill="${t}"/><path d="M27 37l3 3 3-3" stroke="${t}" stroke-width="2.5" fill="none"/>`,
  pizza: (p, t) => `<path d="M4 8q26-10 52 0L30 58z" fill="${p}"/><circle cx="22" cy="18" r="4.5" fill="${t}"/><circle cx="38" cy="20" r="4" fill="${t}"/><circle cx="30" cy="36" r="4" fill="${t}"/>`,
  cactus: (p) => `<path d="M24 58V12a6 6 0 0 1 12 0v46zM24 36H16a4 4 0 0 1-4-4V20a4 4 0 0 1 8 0v8h4zM36 30h6v-12a4 4 0 0 1 8 0v14a4 4 0 0 1-4 4H36z" fill="${p}"/>`,
  duck: (p, t) => `<path d="M8 40c0-8 8-12 20-12 4 0 6-2 6-6a12 12 0 1 1 18 6c6 4 6 10 4 16-4 10-14 12-26 12S8 50 8 40z" fill="${p}"/><path d="M52 22l8 2-8 4z" fill="${p}"/><circle cx="44" cy="18" r="2.4" fill="${t}"/>`,
  star: (p) => `<path d="M30 2l8 18 20 2-15 13 5 20-18-10-18 10 5-20L2 22l20-2z" fill="${p}"/>`,
  heart: (p) => `<path d="M30 56S4 40 4 20A13 13 0 0 1 30 14a13 13 0 0 1 26 6c0 20-26 36-26 36z" fill="${p}"/>`,
  'arrow-up': (p) => `<path d="M30 2l24 26H40v30H20V28H6z" fill="${p}"/>`,
  'arrow-down': (p) => `<path d="M30 58L6 32h14V2h20v30h14z" fill="${p}"/>`,
};
export const STAMP_NAMES = Object.keys(STAMPS);

const TEES = ['#F06AA6', '#29D3F0', '#FFD23F', '#5BE38A', '#FF9A4D', '#B79CFF', '#FFF8EC', '#3B6EA5', '#E4572E', '#8A9099', '#2E8B57', '#7A3B9A'];
const DARK_TEES = new Set(['#3B6EA5', '#E4572E', '#8A9099', '#2E8B57', '#7A3B9A']);
const WALLS = ['#E9DCC3', '#CFE6E2', '#F2D3D3', '#DCD6F0', '#F3E6B5'];
const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const TEE_PATH = 'M168 22Q200 46 232 22L316 44L394 104L356 152L306 126L308 292H92L94 126L44 152L6 104L84 44Z';

function tee(c, id, back) {
  // the shirt's color comes from the right version, so all four tiles wear the same shirt
  const h = hash(c.id || (c.base || c.sign || []).join('|'));
  const shirt = TEES[h % TEES.length], wall = WALLS[(h >>> 4) % WALLS.length];
  const print = DARK_TEES.has(shirt) ? '#FFF8EC' : INK;
  const accent = DARK_TEES.has(shirt) ? '#FFD23F' : (shirt === '#FF9A4D' || shirt === '#F06AA6' ? '#2F3E8F' : '#C8333A');
  let pegs = '';
  for (let y = 20; y < 280; y += 22) for (let x = 12; x < 400; x += 22) pegs += `<circle cx="${x}" cy="${y}" r="2.2"/>`;
  let body = defs(id, `<clipPath id="shirt${id}"><path d="${TEE_PATH}"/></clipPath><path id="arc${id}" d="M114 116Q200 52 286 116"/>`)
    + `<rect width="400" height="280" fill="${wall}"/><g fill="rgba(18,14,24,.13)">${pegs}</g>`
    + `<path d="M0 8H400" stroke="#8A9099" stroke-width="6"/><path d="M200 8v10m-2 2l-40 18M202 20l40 18" stroke="${INK}" stroke-width="3" fill="none"/>`
    + `<path d="${TEE_PATH}" fill="${shirt}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + (back ? `<path d="M170 22Q200 34 230 22" stroke="${INK}" stroke-width="4" fill="none"/>`
      : `<path d="M168 22Q200 54 232 22" stroke="${INK}" stroke-width="4" fill="none"/><path d="M174 24Q200 46 226 24" stroke="${INK}" stroke-width="2" fill="none" opacity=".45"/>`)
    + `<path d="M94 126l-6-20M306 126l6-20" stroke="${INK}" stroke-width="2.5" opacity=".35"/>`;
  let print_ = '';
  if (back) {
    print_ = words(c.back || [], { x: 112, y: 62, w: 176, h: 168 }, { font: 'disp', fills: [print, accent], size: 52 });
  } else {
    const art = c.art || [];
    const lines = c.sign.slice();
    let top = 62;
    if (c.arc && lines.length) {
      const l = lines.shift();
      const size = Math.min(34, 190 / (visible(l).length * FONTS.disp.k));
      const spans = glyphs(l, 0);
      print_ += `<text class="arc" font-family='${FONTS.disp.family}' font-size="${size.toFixed(1)}" letter-spacing="1" fill="${accent}" text-anchor="middle"><textPath href="#arc${id}" startOffset="50%">${spans}</textPath></text>`;
      top = 112;
    }
    if (c.arc && MARKS) MARKS = MARKS.slice(1);
    const artH = art.length ? 66 : 0;
    const box = { x: 112, y: top, w: 176, h: 258 - top - artH };
    if (lines.length) print_ += words(lines, box, { font: 'disp', fills: art.length || c.arc ? print : [print, accent], size: c.arc ? 40 : 50 });
    if (art.length) {
      const n = art.length, sz = 58, gap = 6, x0 = 200 - (n * sz + (n - 1) * gap) / 2;
      print_ += art.map((a, k) => `<g transform="translate(${x0 + k * (sz + gap)} ${258 - artH + 4}) scale(${sz / 60})">${(STAMPS[a] || STAMPS.star)(k % 2 ? accent : print, shirt)}</g>`).join('');
      if (!lines.length && !c.arc) print_ = print_.replace(/translate\(([\d.]+) [\d.]+\)/g, (m, x) => `translate(${x} 140)`);
    }
  }
  body += `<g class="print" clip-path="url(#shirt${id})">${print_}<rect width="400" height="280" fill="url(#dots${id})" opacity=".08"/></g>`;
  // the price tag hanging off the sleeve says where it was found
  if (c.where) body += `<path d="M352 128l6 22" stroke="${INK}" stroke-width="2"/><g transform="rotate(8 360 172)"><rect x="318" y="150" width="78" height="40" rx="4" fill="#FFF8EC" stroke="${INK}" stroke-width="3"/><circle cx="330" cy="160" r="3" fill="none" stroke="${INK}" stroke-width="2"/>${label(c.where, { x: 322, y: 164, w: 70, h: 20 }, { font: 'sans', size: 12 })}</g>`;
  return body + frame;
}

// The stage for a joke: a comedy club, a mic and a spotlight. The setup goes in a speech bubble
// that game.js lays over the top of the panel.
function jokeStage(id) {
  return defs(id, `<radialGradient id="spot${id}" cx=".5" cy=".85" r=".6"><stop offset="0" stop-color="#FFF3C4" stop-opacity=".9"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient>
    <pattern id="brk${id}" width="40" height="20" patternUnits="userSpaceOnUse"><rect width="40" height="20" fill="#7A2E2E"/><path d="M0 .5H40M0 10.5H40M10 0V10M30 10V20" stroke="#5A1F22" stroke-width="2"/></pattern>`)
    + `<rect width="400" height="280" fill="url(#brk${id})"/><ellipse cx="200" cy="250" rx="190" ry="120" fill="url(#spot${id})"/>`
    + `<path d="M0 0H54Q40 140 58 280H0Z" fill="#B3122E" stroke="${INK}" stroke-width="4"/><path d="M400 0H346Q360 140 342 280H400Z" fill="#B3122E" stroke="${INK}" stroke-width="4"/>`
    + `<rect x="0" y="258" width="400" height="22" fill="#3A2416" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M232 258V196" stroke="${INK}" stroke-width="5"/><path d="M216 258h32" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M232 196l-16-22" stroke="${INK}" stroke-width="4"/><rect x="204" y="160" width="16" height="24" rx="8" fill="#5B5B66" stroke="${INK}" stroke-width="3" transform="rotate(-36 212 172)"/>`
    + dots(id, 0.08) + frame;
}

// The panel for a card. { lines } draws the sign with those lines instead (the four-square's two
// versions), { marks } tags the letters to circle, { back: true } turns a shirt around.
export function panel(card, { back = false, lines = null, marks = null } = {}) {
  const id = 'p' + (++uid);
  const c = lines ? { ...card, sign: lines } : card;
  MARKS = marks;
  let body;
  try { body = c.type === 'joke' ? jokeStage(id) : back && c.scene === 'tee' ? tee(c, id, true) : (SCENES[c.scene] || SCENES.storefront)(c, id); } finally { MARKS = null; }
  return `<svg class="panel-art" viewBox="0 0 400 280" role="img" aria-label="${esc(describe(c))}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// What a screen reader hears: the sign as it reads, dark letters left out.
export function describe(card) {
  if (card.type === 'joke') return card.setup;
  const read = card.sign.map((l) => letters(l).filter((g) => !g.off).map((g) => g.c).join('')).join(' / ');
  if (card.scene === 'tee') return `${card.where ? card.where + ': ' : ''}a T-shirt that says ${read}${card.art ? ', with clip art of ' + card.art.join(', ') : ''}`;
  return `${card.where ? card.where + ': ' : ''}a ${card.scene} sign that says ${read}`;
}

// The red ring a spot-the-difference answer key draws: around the letters that are off.
export function ring(svg) {
  if (!svg) return;
  const parts = [...svg.querySelectorAll('.lit .off, .lit .diff, .arc .off, .arc .diff')];
  if (!parts.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of parts) {
    let b;
    try { b = t.getBBox(); } catch (e) { continue; }
    if (!b || (!b.width && !b.height)) continue;
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
  }
  if (!Number.isFinite(x0)) return;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + 12, ry = (y1 - y0) / 2 + 9;
  const e = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  for (const [k, v] of Object.entries({ cx, cy, rx, ry, class: 'ring', transform: `rotate(-4 ${cx} ${cy})`, pathLength: 100 })) e.setAttribute(k, v);
  svg.appendChild(e);
}

// Squeeze any line that came out wider than its box once the real font has loaded.
export function fitText(root) {
  for (const t of root.querySelectorAll('text[data-fit]')) {
    t.removeAttribute('textLength');
    const max = +t.dataset.fit;
    let w = 0;
    try { w = t.getComputedTextLength(); } catch (e) { continue; }
    if (w > max) { t.setAttribute('textLength', String(max)); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
  }
}

export const SCENE_NAMES = Object.keys(SCENES);
