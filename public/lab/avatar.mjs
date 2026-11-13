/* Capra Lab avatars, drawn: drawAvatar(look) → an SVG string (viewBox 0 0 100 100), comic style: thick
 * ink outlines, flat pop colors, halftone dots. Every part sits in its own <g data-layer="..."> (backdrop,
 * aura, hair-back, outfit-back, body, head, face, facewear, hair, glasses, hat, gadget, sparkle) so the
 * trophy room's hologram can pull the layers apart later. The choices and the shop are in
 * avatar-catalog.mjs. Show it in a round frame (the CSS rounds it). */
import { SKINS, FURS, HAIR_COLORS, SHIRTS, BGS, clean, randomLook } from './avatar-catalog.mjs';

const INK = '#120E18';
const SW = 2.4;
const STROKE = `stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"`;
const P = (d, fill, more = '') => `<path d="${d}" fill="${fill}" ${STROKE} ${more}/>`;
const E = (cx, cy, rx, ry, fill, more = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${STROKE} ${more}/>`;
const O = (cx, cy, r, fill, more = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${STROKE} ${more}/>`;
const bare = (s) => s.replace(STROKE, '');               // the same shape without the ink line
const line = (d, w = SW, color = INK, more = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${more}/>`;
const layer = (name, body) => (body ? `<g data-layer="${name}">${body}</g>` : '');
const mirror = (s) => `<g transform="translate(100 0) scale(-1 1)">${s}</g>`;
const both = (s) => s + mirror(s);

function mix(hex, to, t) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const c = (sh) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t);
  return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
}
const lighter = (h, t = 0.5) => mix(h, '#ffffff', t);
const darker = (h, t = 0.3) => mix(h, '#000000', t);
function star(cx, cy, rOut, rIn, k = 5, rot = 0) {
  const pts = [];
  for (let i = 0; i < 2 * k; i++) { const r = i % 2 ? rIn : rOut, a = rot + (Math.PI * i) / k - Math.PI / 2; pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`); }
  return pts.join(' ');
}
const sparkle = (x, y, s, fill = '#FFF8EC') => `<path d="M${x} ${y - s}Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y}Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s}Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y}Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z" fill="${fill}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
const heartPath = (cx, cy, s) => `M${cx} ${cy + s * 0.9}C${cx - s * 1.6} ${cy - s * 0.1} ${cx - s * 0.9} ${cy - s * 1.3} ${cx} ${cy - s * 0.45}C${cx + s * 0.9} ${cy - s * 1.3} ${cx + s * 1.6} ${cy - s * 0.1} ${cx} ${cy + s * 0.9}Z`;

let uid = 0;

/* ---------- each species: where the face goes and what makes it that animal ---------- */
// ey eye height, dx eye spread, my mouth height, ms mouth size, top the head's top (hats sit there).
const FACE = {
  person: { ey: 46, dx: 8, my: 59, ms: 1, top: 22 },
  goat: { ey: 44, dx: 8, my: 62, ms: 0.7, top: 25 },
  wolf: { ey: 43, dx: 9, my: 63, ms: 0.7, top: 23 },
  fox: { ey: 43, dx: 9, my: 63, ms: 0.7, top: 23 },
  cat: { ey: 45, dx: 8.5, my: 60.5, ms: 0.6, top: 28 },
  bear: { ey: 45, dx: 8, my: 61, ms: 0.7, top: 26 },
  panda: { ey: 45, dx: 8.5, my: 61, ms: 0.7, top: 26 },
  owl: { ey: 46, dx: 9, my: 0, ms: 0, top: 27 },
  bunny: { ey: 47, dx: 8, my: 61, ms: 0.65, top: 30 },
  frog: { ey: 38, dx: 11, my: 58, ms: 1.5, top: 32 },
  dino: { ey: 43, dx: 8.5, my: 62, ms: 0.9, top: 26 },
};

function animalBack(sp, f) {
  const lt = lighter(f, 0.55), dk = darker(f, 0.35);
  switch (sp) {
    case 'goat': return both(P('M41 30C37 18 30 12 22 14C28 17 33 23 35 34Z', '#EFE2C6') + line('M33 22l3 -1.5M31 18l3 -2', 1.4))
      + both(E(26, 44, 10, 4.6, f, 'transform="rotate(24 26 44)"'));
    case 'wolf': return both(P('M31 38L30 14L46 28Z', f) + bare(P('M33.5 33L33 20L41.5 28Z', dk)));
    case 'fox': return both(P('M31 38L29 11L46 28Z', f) + bare(P('M30.5 17L29 11L35 15.5Z', '#2B2530')) + bare(P('M33.5 33L32 20L41.5 28Z', '#FBF8F2')));
    case 'cat': return both(P('M31 40L32 18L46 30Z', f) + bare(P('M34 35L34.5 23L42 30Z', '#FF9EB8')));
    case 'bear': return both(O(33.5, 30, 7.5, f) + bare(O(33.5, 30, 3.8, lt)));
    case 'panda': return both(O(33.5, 30, 7.5, '#2B2530'));
    case 'owl': return both(P('M31 35L27 17L41 27Z', f));
    case 'bunny': return both(E(40.5, 18, 5.6, 15.5, f, 'transform="rotate(-8 40.5 18)"') + bare(E(40.5, 19, 2.6, 11, '#FF9EB8', 'transform="rotate(-8 40.5 19)"')));
    case 'frog': return both(O(39, 38, 9, f));
    case 'dino': return P('M40 29L43 14L48 26Z', '#FF8A3D') + P('M46 25L50 9L54 25Z', '#FF8A3D') + P('M52 26L57 14L60 29Z', '#FF8A3D');
    default: return '';
  }
}
function animalHead(sp, f) {
  const lt = lighter(f, 0.55), dk = darker(f, 0.35);
  switch (sp) {
    case 'goat': return E(50, 46, 18, 21.5, f) + bare(E(43, 33, 5.5, 3, '#fff', 'opacity="0.3" transform="rotate(-20 43 33)"'))
      + E(50, 59, 10.5, 8, lt) + `<ellipse cx="46.8" cy="57" rx="1.4" ry="1" fill="${INK}"/><ellipse cx="53.2" cy="57" rx="1.4" ry="1" fill="${INK}"/>`
      + P('M46 66.5Q50 81 54 66.5Q50 68.5 46 66.5Z', lt);
    case 'wolf':
    case 'fox': {
      const cheek = sp === 'fox' ? '#FBF8F2' : lt;
      return P('M29 40C29 26 39 21.5 50 21.5C61 21.5 71 26 71 40C73 50 68 60 62 66L50 71.5L38 66C32 60 27 50 29 40Z', f)
        + both(bare(P('M30 50L27 57L35 58.5L33 64L44 66L40 56Z', cheek)))
        + E(50, 60, 9, 7.5, cheek) + E(50, 55, 3.8, 2.8, INK)
        + bare(E(42, 31, 5, 2.6, '#fff', 'opacity="0.3" transform="rotate(-20 42 31)"'));
    }
    case 'cat': return E(50, 47, 20, 19, f) + bare(E(42, 35, 5, 2.6, '#fff', 'opacity="0.3" transform="rotate(-20 42 35)"'))
      + bare(E(46, 57.5, 5, 3.8, lt)) + bare(E(54, 57.5, 5, 3.8, lt)) + P('M47.6 53.6L52.4 53.6L50 56.2Z', '#FF8DAA')
      + both(line('M41 56.5L30 54.5M41 58.5L30 59.5', 1.2));
    case 'bear': return O(50, 47, 20.5, f) + bare(E(42, 35, 5, 2.6, '#fff', 'opacity="0.3" transform="rotate(-20 42 35)"'))
      + E(50, 58, 9, 7, lt) + E(50, 54.5, 3.6, 2.6, INK);
    case 'panda': return O(50, 47, 20.5, f) + both(bare(E(41.5, 46, 5.8, 7.4, '#2B2530', 'transform="rotate(28 41.5 46)"')))
      + E(50, 58, 9, 7, '#FBF8F2') + E(50, 54.5, 3.6, 2.6, INK);
    case 'owl': return E(50, 47, 21, 20, f) + bare(O(41, 46, 9.5, lt)) + bare(O(59, 46, 9.5, lt))
      + line('M41 63l3 2l3 -2l3 2l3 -2l3 2l3 -2', 1.3, dk) + P('M46.5 52L53.5 52L50 59.5Z', '#FFB13B');
    case 'bunny': return E(50, 49, 18, 18.5, f) + bare(E(43, 38, 5, 2.6, '#fff', 'opacity="0.3" transform="rotate(-20 43 38)"'))
      + bare(E(46, 58, 5, 4, lt)) + bare(E(54, 58, 5, 4, lt)) + P('M48 54.4L52 54.4L50 56.6Z', '#FF8DAA');
    case 'frog': return E(50, 52, 22.5, 16, f) + bare(E(42, 44, 6, 2.6, '#fff', 'opacity="0.28"'))
      + `<circle cx="47" cy="49" r="0.9" fill="${INK}"/><circle cx="53" cy="49" r="0.9" fill="${INK}"/>`;
    case 'dino': return E(50, 47, 20, 21, f) + bare(E(42, 35, 5, 2.6, '#fff', 'opacity="0.3" transform="rotate(-20 42 35)"'))
      + E(50, 58.5, 12, 8.5, lt) + `<ellipse cx="46.5" cy="55.5" rx="1.3" ry="1" fill="${INK}"/><ellipse cx="53.5" cy="55.5" rx="1.3" ry="1" fill="${INK}"/>`
      + bare(O(37, 52, 1.6, dk)) + bare(O(63, 52, 1.6, dk)) + bare(O(60, 33, 1.3, dk));
    default: return '';
  }
}

/* ---------- people ---------- */
function hairBack(style, hc) {
  switch (style) {
    case 'afro': return O(50, 37, 29, hc);
    case 'long': return P('M27 46C26 22 37 17 50 17C63 17 74 22 73 46L75 82C68 86 61 83 58 79L42 79C39 83 32 86 25 82Z', hc);
    case 'pony': return P('M65 29C81 28 86 46 79 62C76 53 72 46 66 42Z', hc) + O(67, 32, 3, '#FF3D8B');
    case 'bun': return O(50, 16, 7.5, hc);
    default: return '';
  }
}
function hairFront(style, hc) {
  const dk = darker(hc, 0.25);
  switch (style) {
    case 'short': return P('M30.5 43C29 26 38 19.5 50 19.5C62 19.5 71 26 69.5 43C66 34 60 30 52 31C47 27 40 30 36 33C33 35 31.5 38 30.5 43Z', hc);
    case 'buzz': return P('M31.6 38.5C31 25 40 21 50 21C60 21 69 25 68.4 38.5C62 31.5 38 31.5 31.6 38.5Z', hc)
      + [...Array(9).keys()].map((i) => `<circle cx="${36 + i * 3.6}" cy="${27 + (i % 2) * 2.5}" r="0.6" fill="${dk}"/>`).join('');
    case 'curly': return [[33, 35, 5.5], [32, 41, 4.2], [38, 27, 6], [46, 22.5, 6.2], [54, 22.5, 6.2], [62, 27, 6], [67, 35, 5.5], [68, 41, 4.2], [44, 29, 4.5], [56, 29, 4.5]].map(([x, y, r]) => O(x, y, r, hc)).join('');
    case 'afro': return [[34, 31, 5.5], [42, 25.5, 6], [50, 24, 6], [58, 25.5, 6], [66, 31, 5.5]].map(([x, y, r]) => O(x, y, r, hc)).join('');
    case 'long': return P('M30 52C27 30 36 19 50 19C64 19 73 30 70 52C68 41 64 33 56 31C50 34 42 33 36 36C33 40 31 45 30 52Z', hc);
    case 'pony': return P('M30.5 42C29 26 38 19.5 50 19.5C62 19.5 71 26 69.5 42C64 33 56 28 46 30C40 31 34 35 30.5 42Z', hc) + line('M46 30C50 26 58 26 64 30', 1.4, dk);
    case 'spiky': return P('M30 41L27.5 30L35 32L34 21L42 26L45 15.5L51 24L57 15.5L59 26L67 21L65 32L72.5 30L70 41C64 33 56 31 50 31C44 31 36 33 30 41Z', hc);
    case 'bun': return P('M30.5 42C29 26 38 20 50 20C62 20 71 26 69.5 42C66 31 58 27 50 27C42 27 34 31 30.5 42Z', hc) + line('M44 22C47 25 53 25 56 22', 1.3, dk);
    case 'braids': {
      const braid = (x) => [52, 59, 66, 73].map((y) => E(x, y, 4.2, 4.6, hc)).join('') + O(x, 78.5, 2.4, '#FF3D8B');
      return braid(28.5) + braid(71.5)
        + P('M30 44C29 26 38 19.5 50 19.5C62 19.5 71 26 70 44C67 32 59 27.5 50 27.5C41 27.5 33 32 30 44Z', hc) + line('M50 20L50 27.5', 1.4, dk);
    }
    case 'mohawk': return P('M44 34L41 11L47 18L50 6L53 18L59 11L56 34C53 31 47 31 44 34Z', hc);
    default: return '';
  }
}

/* ---------- faces (both kinds) ---------- */
function eyes(type, ey, dx, lid, big = false) {
  const one = (x, kind) => {
    const r = big ? 5.4 : 4.3;
    if (kind === 'happy') return line(`M${x - 4} ${ey + 1}Q${x} ${ey - 4.6} ${x + 4} ${ey + 1}`, 2.4);
    const w = kind === 'wide' ? r + 1 : r;
    let s = `<circle cx="${x}" cy="${ey}" r="${w}" fill="#fff" stroke="${INK}" stroke-width="1.8"/>`
      + `<circle cx="${x + 0.4}" cy="${ey + 0.5}" r="${kind === 'wide' ? 2.5 : 2.3}" fill="${INK}"/><circle cx="${x + 1.3}" cy="${ey - 0.7}" r="0.85" fill="#fff"/>`;
    if (kind === 'sleepy') s += `<path d="M${x - w} ${ey}A${w} ${w} 0 0 1 ${x + w} ${ey}Z" fill="${lid}" stroke="${INK}" stroke-width="1.8"/>`;
    if (kind === 'lashes') { const o = x < 50 ? -1 : 1; s += line(`M${x + o * 3} ${ey - 3.4}l${o * 2} -2M${x + o * 4.3} ${ey - 1.4}l${o * 2.4} -1`, 1.4); }
    return s;
  };
  if (type === 'wink') return one(50 - dx, 'round') + one(50 + dx, 'happy');
  return one(50 - dx, type) + one(50 + dx, type);
}
function brows(type, ey, dx, color) {
  if (type === 'none') return '';
  const by = ey - 7.5;
  const b = (x, lift = 0, w = 2.2) => line(`M${x - 4} ${by + 0.6 - lift}Q${x} ${by - 1.8 - lift} ${x + 4} ${by + 0.6 - lift}`, w, color);
  if (type === 'bold') return b(50 - dx, 0, 3.6) + b(50 + dx, 0, 3.6);
  if (type === 'raised') return b(50 - dx) + b(50 + dx, 2.6);
  if (type === 'fierce') return line(`M${50 - dx - 4.5} ${by - 1.6}L${50 - dx + 3.5} ${by + 1.4}`, 2.8, color) + line(`M${50 + dx + 4.5} ${by - 1.6}L${50 + dx - 3.5} ${by + 1.4}`, 2.8, color);
  return b(50 - dx) + b(50 + dx);
}
function mouth(type, my, s) {
  if (!s) return '';
  const w = 7 * s;
  switch (type) {
    case 'grin': return `<path d="M${50 - w - 1} ${my}Q50 ${my + 10 * s} ${50 + w + 1} ${my}Z" fill="#fff" ${STROKE}/>` + line(`M${50 - w + 1} ${my + 1.6}L${50 + w - 1} ${my + 1.6}`, 1);
    case 'open': return `<path d="M${50 - w + 1} ${my}Q50 ${my + 11 * s} ${50 + w - 1} ${my}Z" fill="#5A1A2A" ${STROKE}/>` + `<ellipse cx="50" cy="${my + 5.2 * s}" rx="${3 * s}" ry="${1.8 * s}" fill="#FF7A93"/>`;
    case 'smirk': return line(`M${50 - w + 1} ${my + 1.5}Q${51} ${my + 4 * s} ${50 + w} ${my - 1.5}`);
    case 'tongue': return line(`M${50 - w} ${my}Q50 ${my + 6 * s} ${50 + w} ${my}`) + `<path d="M${50.5} ${my + 2.8 * s}q${0.2} ${4.5 * s} ${2.6 * s} ${4.5 * s}q${2.4 * s} 0 ${2.2 * s} ${-4.8 * s}" fill="#FF7A93" stroke="${INK}" stroke-width="1.6"/>`;
    case 'o': return `<ellipse cx="50" cy="${my + 2}" rx="${2.6 * s}" ry="${3.2 * s}" fill="#5A1A2A" ${STROKE}/>`;
    default: return line(`M${50 - w} ${my}Q50 ${my + 6 * s} ${50 + w} ${my}`);
  }
}
function cheeks(type, ey, dx) {
  if (type === 'blush') return both(`<ellipse cx="${50 - dx - 4}" cy="${ey + 8.5}" rx="3.8" ry="2.2" fill="#FF6B8A" opacity="0.55"/>`);
  if (type === 'freckles') return both([[0, 0], [3, -1], [1.5, 2.5], [-2.5, 2]].map(([a, b]) => `<circle cx="${50 - dx - 3 + a}" cy="${ey + 8 + b}" r="0.75" fill="#9A5A3A"/>`).join(''));
  return '';
}

/* ---------- the shop ---------- */
const BODY = 'M9 102C10 86 26 77.5 41 76.5Q50 84 59 76.5C74 77.5 90 86 91 102Z';
function outfitBack(id, shirt) {
  if (id === 'outfit.hoodie' || id === 'outfit.labhoodie') return P('M29 81C29 70 39 65.5 50 65.5C61 65.5 71 70 71 81Q50 74 29 81Z', darker(id === 'outfit.labhoodie' ? '#2B2530' : shirt, 0.2));
  if (id === 'outfit.hero') return P('M17 80L6 103L94 103L83 80Z', '#FF3B3B');
  return '';
}
function outfit(id, shirt, skin) {
  const dk = darker(shirt, 0.22);
  switch (id) {
    case 'outfit.sweater': return P(BODY, shirt) + line('M14 92l5 -4l5 4l5 -4l5 4l5 -4l5 4l5 -4l5 4l5 -4l5 4l5 -4l5 4l5 -4l4 3', 2.2, '#FFF8EC') + P('M40 76.5Q50 87 60 76.5L57 78Q50 84 43 78Z', dk);
    case 'outfit.hoodie':
    case 'outfit.labhoodie': {
      const c = id === 'outfit.labhoodie' ? '#2B2530' : shirt;
      let s = P(BODY, c) + line('M46 81L45 92M54 81L55 92', 1.6) + O(45, 93, 1.3, '#FFF8EC') + O(55, 93, 1.3, '#FFF8EC') + P('M36 96L64 96L62 103L38 103Z', darker(c, 0.2));
      if (id === 'outfit.labhoodie') s += P('M47.5 84L47.5 88L43 96L57 96L52.5 88L52.5 84Z', '#29D3F0') + bare(P('M45.2 92L54.8 92L57 96L43 96Z', '#3DDC84'));
      return s;
    }
    case 'outfit.overalls': return P(BODY, shirt) + P('M36 85L64 85L67 103L33 103Z', '#3E64B8') + P('M36 85L31 77L35 76L40 85Z', '#3E64B8') + P('M64 85L69 77L65 76L60 85Z', '#3E64B8') + O(38, 87.5, 1.6, '#FFD23F') + O(62, 87.5, 1.6, '#FFD23F') + P('M44 91L56 91L56 97L44 97Z', darker('#3E64B8', 0.15));
    case 'outfit.labcoat': return P(BODY, '#FBF8F2') + P('M41 76.5Q50 84 59 76.5L54 96L50 88L46 96Z', shirt) + P('M41 76.5L46 96L42 86L37 80Z', '#E7E1D3') + P('M59 76.5L54 96L58 86L63 80Z', '#E7E1D3') + P('M64 88L74 88L73.5 95L64.5 95Z', '#E7E1D3') + line('M67 86.5L67 91', 1.6, '#2D6BFF');
    case 'outfit.jersey': return P(BODY, skin) + P('M22 103C22 90 28 82 35 79Q50 92 65 79C72 82 78 90 78 103Z', shirt) + line('M35 79Q50 92 65 79', 2.6, '#FFF8EC')
      + `<text x="50" y="100" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="12" font-weight="900" fill="#FFF8EC" stroke="${INK}" stroke-width="1" paint-order="stroke">23</text>`;
    case 'outfit.varsity': return P(BODY, shirt) + P('M9 102C10 89 18 81 26 79L30 102Z', '#FBF8F2') + P('M91 102C90 89 82 81 74 79L70 102Z', '#FBF8F2') + P('M41 76.5Q50 84 59 76.5L57 80Q50 87 43 80Z', '#FBF8F2')
      + `<text x="38" y="96" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="11" fill="#FFD23F" stroke="${INK}" stroke-width="1" paint-order="stroke">C</text>`;
    case 'outfit.tux': return P(BODY, '#2B2530') + P('M41 76.5Q50 84 59 76.5L50 101Z', '#FBF8F2') + P('M50 83L43.5 79.5L43.5 86.5Z', '#FF3B3B') + P('M50 83L56.5 79.5L56.5 86.5Z', '#FF3B3B') + O(50, 83, 1.6, darker('#FF3B3B', 0.3)) + O(50, 92, 0.9, INK) + O(50, 97, 0.9, INK);
    case 'outfit.hero': return P(BODY, '#2D6BFF') + P('M50 84L58 92L50 100L42 92Z', '#FFD23F') + P('M51.5 86L47 93L50.5 93L48.5 98L53 91L49.5 91Z', '#FF3B3B');
    case 'outfit.astronaut': return P(BODY, '#F2F2F6') + E(50, 77.5, 15, 4.6, '#C9CDD6') + P('M40 88L60 88L60 98L40 98Z', '#D9DCE4') + `<circle cx="44" cy="93" r="1.6" fill="#FF3B3B"/><circle cx="50" cy="93" r="1.6" fill="#3DDC84"/><circle cx="56" cy="93" r="1.6" fill="#FFD23F"/>`
      + P('M20 88L28 88L28 94L20 94Z', '#2D6BFF') + O(77, 91, 3.6, '#FF8A3D');
    default: return P(BODY, shirt) + line('M41 76.5Q50 84 59 76.5', 2.4);
  }
}
function facewear(id, f, hc) {
  const { ey, dx, my } = f;
  switch (id) {
    case 'facewear.bandage': return `<g transform="rotate(-25 ${50 + dx + 4} ${ey + 8})">${P(`M${50 + dx - 1} ${ey + 6}h10v4.4h-10Z`, '#F4C9A0')}<circle cx="${50 + dx + 2.5}" cy="${ey + 8.2}" r="0.5" fill="${INK}"/><circle cx="${50 + dx + 5.5}" cy="${ey + 8.2}" r="0.5" fill="${INK}"/></g>`;
    case 'facewear.sticker': return `<polygon points="${star(50 - dx - 4, ey + 9, 4.4, 1.9)}" fill="#FFD23F" ${STROKE} stroke-width="1.4"/>`;
    case 'facewear.mustache': { const y = (my || 60) - 3; return P(`M39 ${y + 1}C43 ${y - 4} 48 ${y - 3.5} 50 ${y - 1}C52 ${y - 3.5} 57 ${y - 4} 61 ${y + 1}C57 ${y + 2.5} 52 ${y + 1.5} 50 ${y}C48 ${y + 1.5} 43 ${y + 2.5} 39 ${y + 1}Z`, hc); }
    case 'facewear.paint': return both(P(`M${50 - dx - 4} ${ey + 6}h8v2.6h-8Z`, '#2B2530', 'stroke-width="1"'));
    case 'facewear.beard': return P('M30.5 50C31 68 40 77 50 77C60 77 69 68 69.5 50C67.5 57 62.5 61 58 63.5Q50 67 42 63.5C37.5 61 32.5 57 30.5 50Z', hc);
    case 'facewear.bolt': return P(`M${50 - dx - 2} ${ey - 11}L${50 - dx - 6} ${ey + 1}L${50 - dx - 1} ${ey + 1}L${50 - dx - 5} ${ey + 13}L${50 - dx + 5} ${ey - 3}L${50 - dx} ${ey - 3}L${50 - dx + 4} ${ey - 11}Z`, '#FFD23F', 'stroke-width="1.6"');
    default: return '';
  }
}
const mask = (f) => P(`M${50 - f.dx - 9} ${f.ey}C${50 - f.dx - 7} ${f.ey - 7} ${50 - f.dx + 2} ${f.ey - 7} 50 ${f.ey - 3}C${50 + f.dx - 2} ${f.ey - 7} ${50 + f.dx + 7} ${f.ey - 7} ${50 + f.dx + 9} ${f.ey}C${50 + f.dx + 7} ${f.ey + 7} ${50 + f.dx - 2} ${f.ey + 7} 50 ${f.ey + 3.5}C${50 - f.dx + 2} ${f.ey + 7} ${50 - f.dx - 7} ${f.ey + 7} ${50 - f.dx - 9} ${f.ey}Z`, '#2B2530');
function glasses(id, f) {
  const { ey, dx } = f, L = 50 - dx, R = 50 + dx;
  switch (id) {
    case 'glasses.specs': return O(L, ey, 6, 'rgba(255,255,255,0.18)', 'stroke-width="2"') + O(R, ey, 6, 'rgba(255,255,255,0.18)', 'stroke-width="2"') + line(`M${L + 6} ${ey}Q50 ${ey - 2.5} ${R - 6} ${ey}M${L - 6} ${ey - 1}L${L - 11} ${ey - 3}M${R + 6} ${ey - 1}L${R + 11} ${ey - 3}`, 2);
    case 'glasses.goggles': return P(`M${L - 13} ${ey - 3}h${2 * dx + 26}v6h${-(2 * dx + 26)}Z`, '#2B2530', 'stroke-width="1.4"') + O(L, ey, 6.6, '#9BE7FF', 'stroke="#FFD23F" stroke-width="3" fill-opacity="0.65"') + O(R, ey, 6.6, '#9BE7FF', 'stroke="#FFD23F" stroke-width="3" fill-opacity="0.65"') + line(`M${L - 2.5} ${ey - 2.5}l3 -1.5M${R - 2.5} ${ey - 2.5}l3 -1.5`, 1.3, '#fff');
    case 'glasses.shades': return P(`M${L - 7} ${ey - 4}h13q1 0 0.5 2l-1.5 5q-1 3.5 -5 3.5h-2q-4 0 -5 -3.5l-1 -5q-0.5 -2 1 -2Z`, '#1E1A24') + P(`M${R - 6} ${ey - 4}h13q1.5 0 1 2l-1 5q-1 3.5 -5 3.5h-2q-4 0 -5 -3.5l-1.5 -5q-0.5 -2 0.5 -2Z`, '#1E1A24') + line(`M${L + 6} ${ey - 3}L${R - 6} ${ey - 3}`, 2.2) + line(`M${L - 3} ${ey - 1.5}l3.5 -1M${R - 2} ${ey - 1.5}l3.5 -1`, 1.2, '#fff');
    case 'glasses.3d': return P(`M${L - 8} ${ey - 5}h${2 * dx + 16}v10h${-(2 * dx + 16)}Z`, '#FBF8F2', 'stroke-width="2"') + bare(P(`M${L - 6} ${ey - 3}h11v6h-11Z`, '#FF3B3B', 'opacity="0.85"')) + bare(P(`M${R - 5} ${ey - 3}h11v6h-11Z`, '#29D3F0', 'opacity="0.85"'));
    case 'glasses.hearts': return P(heartPath(L, ey, 5.2), '#FF3D8B', 'stroke-width="2"') + P(heartPath(R, ey, 5.2), '#FF3D8B', 'stroke-width="2"') + line(`M${L + 5} ${ey - 1}L${R - 5} ${ey - 1}`, 2);
    case 'glasses.stars': return `<polygon points="${star(L, ey, 7.2, 3.4)}" fill="#FFD23F" ${STROKE} stroke-width="2"/><polygon points="${star(R, ey, 7.2, 3.4)}" fill="#FFD23F" ${STROKE} stroke-width="2"/>` + line(`M${L + 5} ${ey}L${R - 5} ${ey}`, 2);
    case 'glasses.monocle': return O(R, ey, 6.4, 'rgba(255,255,255,0.2)', 'stroke="#E2B04A" stroke-width="2.4"') + line(`M${R + 4} ${ey + 5}Q${R + 6} ${ey + 14} ${R + 2} ${ey + 22}`, 1.2, '#E2B04A');
    case 'glasses.visor': return `<defs><linearGradient id="vz${uid}" x1="0" x2="1"><stop offset="0" stop-color="#8C5CFF"/><stop offset="1" stop-color="#29D3F0"/></linearGradient></defs>` + P(`M${L - 10} ${ey - 6}h${2 * dx + 20}q3 0 3 3v6q0 3 -3 3h${-(2 * dx + 20)}q-3 0 -3 -3v-6q0 -3 3 -3Z`, `url(#vz${uid})`) + line(`M${L - 6} ${ey}h${2 * dx + 12}`, 1.2, '#fff', 'stroke-dasharray="2 2" opacity="0.8"') + `<circle cx="${R + 7}" cy="${ey - 3}" r="1.1" fill="#3DDC84"/>`;
    case 'glasses.laser': return `<path d="M${L} ${ey}L104 ${ey + 22}L104 ${ey + 28}Z" fill="#FF3B3B" opacity="0.75"/><path d="M${R} ${ey}L104 ${ey + 8}L104 ${ey + 14}Z" fill="#FF3B3B" opacity="0.75"/>` + O(L, ey, 4, '#FF3B3B', 'stroke-width="1.6"') + O(R, ey, 4, '#FF3B3B', 'stroke-width="1.6"') + `<circle cx="${L}" cy="${ey}" r="1.6" fill="#FFF2B3"/><circle cx="${R}" cy="${ey}" r="1.6" fill="#FFF2B3"/>`;
    default: return '';
  }
}
function hat(id, top) {
  const t = top - 22;   // hats are drawn for a person's head; move them to this head's top
  let s = '';
  switch (id) {
    case 'hat.beanie': s = P('M29 36C29 17 71 17 71 36Z', '#FF3B3B') + P('M27.5 32h45v8h-45Z', darker('#FF3B3B', 0.2)) + O(50, 15, 5, '#FBF8F2') + line('M35 34v4M41 34v4M47 34v4M53 34v4M59 34v4M65 34v4', 1, INK, 'opacity="0.5"'); break;
    case 'hat.cap': s = P('M30 35C30 17 70 17 70 35Z', '#2D6BFF') + P('M68 31L80 35L69 37.5Z', darker('#2D6BFF', 0.2)) + P('M44 33.5h12v3h-12Z', '#FBF8F2', 'stroke-width="1.4"') + O(50, 18.5, 1.8, '#FFD23F'); break;
    case 'hat.party': s = P('M38 27L50 1L62 27Z', '#FF3D8B') + bare(P('M41.5 19.5L46 10L48 14Z', '#FFD23F')) + bare(P('M44 25L52 9L55 16Z', '#29D3F0')) + O(50, 2, 4, '#FFD23F') + line('M38 27L34 46M62 27L66 46', 1, INK, 'opacity="0.6"'); break;
    case 'hat.headphones': s = line('M27 46C27 13 73 13 73 46', 6) + line('M27 46C27 13 73 13 73 46', 3, '#8C5CFF') + P('M21 38h9q2 0 2 2v12q0 2 -2 2h-9q-2 0 -2 -2v-12q0 -2 2 -2Z', '#8C5CFF') + P('M70 38h9q2 0 2 2v12q0 2 -2 2h-9q-2 0 -2 -2v-12q0 -2 2 -2Z', '#8C5CFF'); break;
    case 'hat.bucket': s = P('M32 31C33 15 67 15 68 31Z', '#F2C14E') + P('M23 33C30 25 70 25 77 33C70 38 30 38 23 33Z', '#F2C14E') + line('M33 28Q50 31 67 28', 1.4, darker('#F2C14E', 0.3)); break;
    case 'hat.chef': s = P('M34 31C25 29 25 13 36 14C38 4 51 4 52 12C56 3 71 6 66 17C75 18 73 31 64 31Z', '#FBF8F2') + P('M34 25h32v8h-32Z', '#FBF8F2'); break;
    case 'hat.flowers': s = [[31, 36, '#FF3D8B'], [37, 27, '#FFD23F'], [45, 22, '#29D3F0'], [55, 22, '#FF8A3D'], [63, 27, '#8C5CFF'], [69, 36, '#FF3D8B']].map(([x, y, c]) => [0, 1, 2, 3, 4].map((k) => O(x + 3 * Math.cos((k * 2 * Math.PI) / 5), y + 3 * Math.sin((k * 2 * Math.PI) / 5), 2.4, c, 'stroke-width="1.2"')).join('') + O(x, y, 1.8, '#FFF2B3', 'stroke-width="1"')).join(''); break;
    case 'hat.cowboy': s = P('M35 28C35 10 65 10 65 28Z', '#A0662E') + line('M44 14Q50 19 56 14', 1.6) + P('M15 30C22 23 36 30 50 30C64 30 78 23 85 30C78 39 22 39 15 30Z', '#A0662E') + bare(P('M35.5 24h29v4h-29Z', '#2B2530')); break;
    case 'hat.propeller': s = P('M30 35C30 16 70 16 70 35Z', '#FF3B3B') + bare(P('M50 17C42 17 36 24 34 35L50 35Z', '#FFD23F')) + bare(P('M50 17C58 17 64 24 66 35L50 35Z', '#2D6BFF')) + P('M30 35C30 16 70 16 70 35Z', 'none') + line('M50 17L50 10', 2) + P('M50 10L35 6.5L35.5 12Z', '#3DDC84', 'stroke-width="1.6"') + P('M50 10L65 6.5L64.5 12Z', '#3DDC84', 'stroke-width="1.6"') + O(50, 10, 1.8, '#FBF8F2', 'stroke-width="1.4"'); break;
    case 'hat.tophat': s = P('M35.5 27L37 0L63 0L64.5 27Z', '#2B2530') + bare(P('M36.2 19h27.6v5h-27.6Z', '#FF3B3B')) + E(50, 28, 21, 4.5, '#2B2530'); break;
    case 'hat.wizard': s = P('M31 31C41 27 47 9 60 -3C57 11 62 23 69 31Z', '#5B3CC4') + `<polygon points="${star(48, 18, 3.4, 1.5)}" fill="#FFD23F"/><polygon points="${star(57, 8, 2.4, 1)}" fill="#FFD23F"/><polygon points="${star(58, 24, 2.2, 1)}" fill="#FFD23F"/>` + E(50, 31, 24, 5, '#5B3CC4'); break;
    case 'hat.viking': s = P('M31 30C22 28 15 17 17 6C21 17 28 21 35 21Z', '#EFE2C6') + P('M69 30C78 28 85 17 83 6C79 17 72 21 65 21Z', '#EFE2C6') + P('M29.5 35C29.5 14 70.5 14 70.5 35Z', '#B8BCC8') + P('M28.5 32h43v5h-43Z', '#9AA0AE') + [36, 43, 50, 57, 64].map((x) => `<circle cx="${x}" cy="34.5" r="0.9" fill="${INK}"/>`).join('') + line('M50 15L50 32', 2, darker('#B8BCC8', 0.3)); break;
    case 'hat.crown': s = P('M31.5 31L29 9L40 20L50 5L60 20L71 9L68.5 31Z', '#FFD23F') + P('M31 27h38v5h-38Z', '#F2B33D') + O(50, 20, 2.6, '#FF3B3B', 'stroke-width="1.4"') + O(39.5, 25, 1.8, '#2D6BFF', 'stroke-width="1.2"') + O(60.5, 25, 1.8, '#3DDC84', 'stroke-width="1.2"') + `<circle cx="50" cy="5" r="1.6" fill="#FFF8EC"/><circle cx="29" cy="9" r="1.4" fill="#FFF8EC"/><circle cx="71" cy="9" r="1.4" fill="#FFF8EC"/>`; break;
    case 'hat.halo': s = `<ellipse cx="50" cy="11" rx="18" ry="5" fill="none" stroke="#FFD23F" stroke-width="7" opacity="0.35"/>` + `<ellipse cx="50" cy="11" rx="17" ry="4.5" fill="none" stroke="${INK}" stroke-width="5.2"/><ellipse cx="50" cy="11" rx="17" ry="4.5" fill="none" stroke="#FFD23F" stroke-width="2.8"/>`; break;
    default: return '';
  }
  return t ? `<g transform="translate(0 ${t})">${s}</g>` : s;
}
function gadget(id) {
  switch (id) {
    case 'gadget.beaker': return P('M74 71L74 79L66 96L88 96L80 79L80 71Z', 'rgba(255,255,255,0.75)') + bare(P('M70.4 87L83.6 87L87.6 95.6L66.4 95.6Z', '#3DDC84')) + P('M74 71L74 79L66 96L88 96L80 79L80 71Z', 'none') + P('M72 70h10v3h-10Z', '#FBF8F2', 'stroke-width="1.6"') + O(76, 84, 1.4, '#fff', 'stroke-width="1"') + O(80, 80, 1, '#fff', 'stroke-width="0.9"') + O(78, 66, 1.6, 'rgba(61,220,132,0.7)', 'stroke-width="1"');
    case 'gadget.brush': return `<g transform="rotate(-35 80 86)">${P('M77.5 74h5v24h-5Z', '#A0662E')}${P('M76.5 70h7v5h-7Z', '#C9CDD6', 'stroke-width="1.6"')}${P('M77 70C77 63 80 59 80 59C80 59 83 63 83 70Z', '#FF3D8B')}</g>`;
    case 'gadget.ball': return O(80, 87, 11, '#FF8A3D') + line('M69 87h22M80 76v22M72.5 79.5Q80 87 72.5 94.5M87.5 79.5Q80 87 87.5 94.5', 1.5);
    case 'gadget.mic': return `<g transform="rotate(20 80 85)">${P('M77 82h6l-1.4 17h-3.2Z', '#2B2530')}${O(80, 77, 7, '#C9CDD6')}${line('M75 74l10 6M75 79l9 5M77 72l8 5', 1, INK, 'opacity="0.6"')}</g>`;
    case 'gadget.controller': return P('M67 82C63 82 61 92 63 97C65 101 70 99 73 95L87 95C90 99 95 101 97 97C99 92 97 82 93 82Z', '#2B2530') + P('M71 86h2v6h-2ZM69 88h6v2h-6Z', '#FBF8F2', 'stroke-width="0.6"') + `<circle cx="87" cy="87" r="1.6" fill="#FF3B3B"/><circle cx="91" cy="89.5" r="1.6" fill="#3DDC84"/><circle cx="87" cy="92" r="1.6" fill="#2D6BFF"/><circle cx="83" cy="89.5" r="1.6" fill="#FFD23F"/>`;
    case 'gadget.pin': return O(78, 90, 9, '#FFD23F') + P('M79.5 82.5L74 91L78 91L76 97.5L82.5 88.5L78.5 88.5Z', '#FF3B3B', 'stroke-width="1.4"');
    case 'gadget.kid': return P('M77 77C75 69 72 67 69 68C72 70 74 73 75 78Z', '#EFE2C6', 'stroke-width="1.6"') + P('M87 77C89 69 92 67 95 68C92 70 90 73 89 78Z', '#EFE2C6', 'stroke-width="1.6"') + E(73, 81, 5, 2.4, '#F2EBDD', 'stroke-width="1.6" transform="rotate(25 73 81)"') + E(91, 81, 5, 2.4, '#F2EBDD', 'stroke-width="1.6" transform="rotate(-25 91 81)"') + E(82, 86, 8.5, 10, '#F2EBDD', 'stroke-width="1.8"') + E(82, 92, 5, 3.8, '#FFFDF8', 'stroke-width="1.4"') + `<circle cx="78.5" cy="84" r="1.5" fill="${INK}"/><circle cx="85.5" cy="84" r="1.5" fill="${INK}"/><circle cx="80.5" cy="91.5" r="0.7" fill="${INK}"/><circle cx="83.5" cy="91.5" r="0.7" fill="${INK}"/>` + line('M80 94Q82 95.6 84 94', 1.1);
    case 'gadget.trophy': return P('M70 74h20v6q0 10 -10 11q-10 -1 -10 -11Z', '#FFD23F') + line('M70 77q-6 0 -5 5q1 4 6 4M90 77q6 0 5 5q-1 4 -6 4', 2) + P('M77.5 91h5v4h-5Z', '#F2B33D', 'stroke-width="1.6"') + P('M73 95h14v5h-14Z', '#2B2530', 'stroke-width="1.6"') + `<polygon points="${star(80, 81, 3.6, 1.6)}" fill="#FFF8EC"/>`;
    default: return '';
  }
}
function backdrop(id, bg, u) {
  const R = `<rect width="100" height="100" fill="${bg}"/>`;
  switch (id) {
    case 'backdrop.dots': return R + `<defs><pattern id="dt${u}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.7" fill="${INK}" opacity="0.2"/></pattern></defs><rect width="100" height="100" fill="url(#dt${u})"/>`;
    case 'backdrop.stripes': return R + [...Array(10).keys()].map((i) => `<path d="M${i * 22 - 40} 0L${i * 22 - 29} 0L${i * 22 - 129} 100L${i * 22 - 140} 100Z" fill="#fff" opacity="0.3" transform="translate(${50} 0)"/>`).join('');
    case 'backdrop.clouds': return `<rect width="100" height="100" fill="#7FD4FF"/>` + [[18, 22, 1], [80, 16, 0.8], [86, 58, 1.1], [12, 66, 0.9]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-13 5C-17 5 -17 -2 -12 -2C-12 -8 -3 -9 -1 -4C2 -10 12 -8 11 -1C17 -1 17 5 12 5Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/></g>`).join('');
    case 'backdrop.sunburst': return R + [...Array(12).keys()].map((i) => { const a = (i * Math.PI) / 6, b = a + Math.PI / 12; return `<path d="M50 45L${(50 + 90 * Math.cos(a)).toFixed(1)} ${(45 + 90 * Math.sin(a)).toFixed(1)}L${(50 + 90 * Math.cos(b)).toFixed(1)} ${(45 + 90 * Math.sin(b)).toFixed(1)}Z" fill="#fff" opacity="0.32"/>`; }).join('');
    case 'backdrop.pow': return `<rect width="100" height="100" fill="#FFD23F"/><polygon points="${star(50, 45, 62, 34, 12)}" fill="#FF3B3B" stroke="${INK}" stroke-width="2"/><polygon points="${star(50, 45, 44, 28, 12, 0.26)}" fill="#FF8A3D"/>`
      + `<defs><pattern id="pw${u}" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" fill="${INK}" opacity="0.18"/></pattern></defs><rect width="100" height="100" fill="url(#pw${u})"/>`;
    case 'backdrop.lab': return `<rect width="100" height="100" fill="#26315A"/>` + `<path d="M0 30h100" stroke="${INK}" stroke-width="2.4"/><rect x="0" y="30" width="100" height="3" fill="#8A5A36"/>`
      + [[10, '#3DDC84'], [22, '#FF3D8B'], [80, '#29D3F0'], [91, '#FFD23F']].map(([x, c]) => `<path d="M${x - 2} 16v5l-4 9h12l-4 -9v-5Z" fill="${c}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`).join('')
      + `<circle cx="14" cy="60" r="2" fill="#fff" opacity="0.2"/><circle cx="88" cy="70" r="3" fill="#fff" opacity="0.15"/>`;
    case 'backdrop.galaxy': return `<rect width="100" height="100" fill="#140C2E"/><ellipse cx="22" cy="28" rx="30" ry="14" fill="#FF3D8B" opacity="0.32" transform="rotate(-25 22 28)"/><ellipse cx="80" cy="66" rx="32" ry="12" fill="#29D3F0" opacity="0.28" transform="rotate(-25 80 66)"/>`
      + [[10, 10, 1], [30, 60, 0.8], [85, 20, 1.2], [70, 8, 0.7], [92, 45, 0.9], [8, 86, 1], [50, 6, 0.6], [16, 44, 0.7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('') + sparkle(88, 32, 3.2, '#FFF2B3') + sparkle(14, 70, 2.6);
    default: return R;
  }
}
function auraBack(id, u) {
  switch (id) {
    case 'effect.glow': return `<defs><radialGradient id="gl${u}"><stop offset="0.45" stop-color="#FFE27A" stop-opacity="0.95"/><stop offset="1" stop-color="#FFD23F" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="48" r="44" fill="url(#gl${u})"/>`;
    case 'effect.fire': return [[22, 96, 20, '#FF3B3B'], [78, 96, 20, '#FF3B3B'], [30, 90, 14, '#FF8A3D'], [70, 90, 14, '#FF8A3D'], [50, 88, 30, '#FF8A3D'], [50, 92, 18, '#FFD23F']].map(([x, y, h, c]) => `<path d="M${x - h * 0.5} ${y}C${x - h * 0.6} ${y - h * 0.8} ${x - h * 0.1} ${y - h * 1.1} ${x} ${y - h * 1.9}C${x + h * 0.25} ${y - h * 1.2} ${x + h * 0.7} ${y - h * 0.9} ${x + h * 0.5} ${y}Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`).join('');
    case 'effect.lightning': return [[16, 30, 1], [84, 30, -1], [12, 70, 1], [88, 70, -1]].map(([x, y, s]) => `<path d="M${x} ${y - 12}L${x - 5 * s} ${y + 1}L${x + 1 * s} ${y + 1}L${x - 4 * s} ${y + 14}L${x + 7 * s} ${y - 3}L${x + 1 * s} ${y - 3}L${x + 5 * s} ${y - 12}Z" fill="#29D3F0" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`).join('')
      + `<circle cx="50" cy="48" r="38" fill="none" stroke="#29D3F0" stroke-width="2" stroke-dasharray="4 6" opacity="0.7"/>`;
    default: return '';
  }
}
function auraFront(id) {
  switch (id) {
    case 'effect.sparkles': return sparkle(16, 20, 5, '#FFD23F') + sparkle(84, 24, 4) + sparkle(88, 62, 5.4, '#FFD23F') + sparkle(12, 58, 3.4) + sparkle(74, 8, 3, '#FFD23F');
    case 'effect.hologram': return `<rect width="100" height="100" fill="#29D3F0" opacity="0.18"/>` + [...Array(25).keys()].map((i) => `<rect y="${i * 4}" width="100" height="1.2" fill="#fff" opacity="0.14"/>`).join('') + `<rect y="40" width="100" height="3" fill="#8CF5FF" opacity="0.35"/>`;
    case 'effect.lightning': return sparkle(30, 12, 3, '#29D3F0') + sparkle(70, 12, 3, '#29D3F0');
    case 'effect.glow': return sparkle(18, 18, 3.4, '#FFF2B3') + sparkle(84, 74, 3, '#FFF2B3');
    default: return '';
  }
}

/* ---------- the whole avatar ---------- */
// tight: crop in on the face, for small spots like the Capra Lab button
export function drawAvatar(look, { title = '', tight = false } = {}) {
  const l = clean(look);
  const u = ++uid;
  const animal = l.base === 'animal';
  const f = FACE[animal ? l.species : 'person'];
  const fur = FURS[l.fur], skin = SKINS[l.skin], shirt = SHIRTS[l.shirt], hc = HAIR_COLORS[l.hairColor];
  const face = animal ? fur : skin;
  const browColor = animal ? darker(fur, 0.55) : darker(hc, 0.15);
  const neck = P('M43 58h14v22h-14Z', face);
  const head = animal
    ? animalHead(l.species, fur)
    : E(30.5, 48, 4, 5.4, skin) + E(69.5, 48, 4, 5.4, skin) + E(50, 45, 19.5, 22.5, skin) + bare(E(42, 31, 6, 3.2, '#fff', 'opacity="0.32" transform="rotate(-20 42 31)"'));
  const nose = animal ? '' : line('M48.6 53.2Q50 55.4 51.4 53.2', 1.6);
  const bunnyTeeth = animal && l.species === 'bunny' && ['smile', 'smirk', 'tongue'].includes(l.mouth) ? P('M48 62.2h4v3.6h-4Z', '#fff', 'stroke-width="1.2"') : '';
  const faceParts = (l.facewear === 'facewear.mask' ? mask(f) : '') + cheeks(l.cheeks, f.ey, f.dx)
    + eyes(l.eyes, f.ey, f.dx, face, animal && l.species === 'owl') + brows(l.brows, f.ey, f.dx, browColor) + nose + mouth(l.mouth, f.my, f.ms) + bunnyTeeth;
  // the character sits a little small in its frame so tall hats and gadgets stay inside a round crop
  const body = layer('backdrop', backdrop(l.backdrop, BGS[l.bg], u)) + '<g transform="translate(5 10) scale(0.9)">' + [
    layer('aura', auraBack(l.effect, u)),
    layer('hair-back', animal ? animalBack(l.species, fur) : hairBack(l.hair, hc)),
    layer('outfit-back', outfitBack(l.outfit, shirt)),
    layer('neck', neck),
    layer('body', outfit(l.outfit, shirt, skin)),
    layer('head', head),
    layer('face', faceParts),
    layer('facewear', facewear(l.facewear, f, animal ? darker(fur, 0.4) : hc)),
    layer('hair', animal ? '' : hairFront(l.hair, hc)),
    layer('glasses', glasses(l.glasses, f)),
    layer('hat', hat(l.hat, f.top)),
    layer('gadget', gadget(l.gadget) && `<g transform="translate(-6 -5)">${gadget(l.gadget)}</g>`),
    layer('sparkle', l.effect === 'effect.hologram' ? '' : auraFront(l.effect)),
  ].join('') + '</g>' + layer('scan', l.effect === 'effect.hologram' ? auraFront(l.effect) : '');
  const t = title ? `<title>${String(title).replace(/[<&]/g, '')}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${tight ? '12 12 76 76' : '0 0 100 100'}" role="img"${title ? '' : ' aria-hidden="true"'}>${t}${body}</svg>`;
}

// A player who hasn't saved a look yet still gets their own: a free look picked from their handle,
// the same on every page.
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function lookFor(handle, saved) {
  if (saved && typeof saved === 'object') return clean(saved);
  let h = 2166136261;
  for (const ch of String(handle || 'guest')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return randomLook(seeded(h));
}

export const avatarUri = (look) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(drawAvatar(look));
