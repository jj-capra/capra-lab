// Classified's agents: comic spy avatars, drawn as inline SVG from a small spec (no photos; JC's
// call). Used by the page, the reveal and the share page.
//
//   { skin, hair, hairColor, eyes, mouth, gear, bg }   each an index into the lists below

const INK = '#120E18';
export const SKINS = ['#FBD9C0', '#F1C09A', '#D9A074', '#B97A4E', '#8E5634', '#5E3A22'];
export const HAIR_COLORS = ['#1B1420', '#5A3720', '#A0602C', '#E3B04B', '#C8432B', '#7A7F8C', '#6B4BD6'];
export const BGS = ['#FF3D8B', '#29D3F0', '#FFD23F', '#5BE38A', '#FF9A4D', '#B79CFF', '#F06AA6', '#4CC9A0'];
export const HAIRS = ['buzz', 'swoop', 'spiky', 'curly', 'long', 'bun', 'afro', 'mohawk', 'bald'];
export const EYES = ['dots', 'wide', 'sleepy', 'wink'];
export const MOUTHS = ['smile', 'grin', 'smirk', 'oh'];
export const GEAR = ['none', 'shades', 'fedora', 'beanie', 'earpiece', 'mustache', 'eyepatch'];
export const PARTS = { skin: SKINS.length, hair: HAIRS.length, hairColor: HAIR_COLORS.length, eyes: EYES.length, mouth: MOUTHS.length, gear: GEAR.length, bg: BGS.length };

// A valid spec from anything (bad or missing parts become 0).
export function cleanAvatar(a) {
  const out = {};
  for (const [k, n] of Object.entries(PARTS)) {
    const v = Math.floor(Number(a && a[k]));
    out[k] = v >= 0 && v < n ? v : 0;
  }
  return out;
}
export function randomAvatar(rand = Math.random) {
  const out = {};
  for (const [k, n] of Object.entries(PARTS)) out[k] = Math.floor(rand() * n);
  return out;
}

const back = {
  long: (c) => `<path d="M24 62C22 34 38 22 60 22s38 12 36 40l4 42H20z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
  afro: (c) => `<circle cx="60" cy="52" r="42" fill="${c}" stroke="${INK}" stroke-width="4"/>`,
  bun: (c) => `<circle cx="60" cy="20" r="13" fill="${c}" stroke="${INK}" stroke-width="4"/>`,
};
const front = {
  buzz: (c) => `<path d="M27 58C28 34 42 26 60 26s32 8 33 32c-9-10-20-14-33-14S36 48 27 58z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
  swoop: (c) => `<path d="M26 60C24 32 42 22 62 23c22 1 34 14 32 36-6-12-18-18-30-16 6 4 8 8 8 12-14-8-30-8-46 5z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
  spiky: (c) => `<path d="M26 60l2-20-8-6 12-4 2-14 12 8 8-12 8 11 10-10 4 14 14 0-6 12 8 8-10 2c2 4 2 8 0 11-10-10-22-14-34-14S34 52 26 60z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
  curly: (c) => `<g fill="${c}" stroke="${INK}" stroke-width="3.5">${[[34, 40], [44, 30], [57, 26], [70, 27], [82, 33], [89, 45], [30, 52], [90, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10"/>`).join('')}</g>`,
  long: (c) => `<path d="M28 60C26 36 40 25 60 25s34 11 32 35c-8-12-18-17-32-17S34 48 28 60z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
  bun: (c) => `<path d="M28 58C29 36 42 28 60 28s31 8 32 30c-9-9-20-13-32-13S37 49 28 58z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
  afro: () => '',
  mohawk: (c) => `<path d="M52 44L50 8l10 6 10-6-2 36z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
  bald: () => `<path d="M44 36q8-4 14-3" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5" fill="none"/>`,
};
const eyes = {
  dots: () => `<circle cx="47" cy="64" r="4.5" fill="${INK}"/><circle cx="73" cy="64" r="4.5" fill="${INK}"/>`,
  wide: () => `<g stroke="${INK}" stroke-width="3"><circle cx="47" cy="63" r="8" fill="#fff"/><circle cx="73" cy="63" r="8" fill="#fff"/></g><circle cx="49" cy="64" r="3.6" fill="${INK}"/><circle cx="75" cy="64" r="3.6" fill="${INK}"/>`,
  sleepy: () => `<path d="M40 64q7 5 14 0M66 64q7 5 14 0" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  wink: () => `<circle cx="47" cy="64" r="4.5" fill="${INK}"/><path d="M66 65q7-6 14 0" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
};
const mouths = {
  smile: () => `<path d="M49 80q11 9 22 0" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  grin: () => `<path d="M47 78h26q-2 13-13 13t-13-13z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`,
  smirk: () => `<path d="M50 82q12 2 20-6" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  oh: () => `<ellipse cx="60" cy="82" rx="5" ry="6" fill="${INK}"/>`,
};
const gear = {
  none: () => '',
  shades: () => `<path d="M34 58h52v4l-4 10H66l-4-8h-4l-4 8H38l-4-10z" fill="${INK}"/><path d="M40 61h10M70 61h10" stroke="#fff" stroke-width="2" opacity=".55"/>`,
  fedora: () => `<path d="M14 40q46-16 92 0-4 6-12 6H26q-8 0-12-6z" fill="#3B3346" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M32 40c0-18 10-28 28-28s28 10 28 28z" fill="#3B3346" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M33 34h54" stroke="#C8432B" stroke-width="6"/>`,
  beanie: () => `<path d="M26 52c0-24 14-34 34-34s34 10 34 34z" fill="#C8432B" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><rect x="23" y="46" width="74" height="12" rx="5" fill="#E05A44" stroke="${INK}" stroke-width="4"/><circle cx="60" cy="16" r="6" fill="#FFF8EC" stroke="${INK}" stroke-width="3"/>`,
  earpiece: () => `<path d="M95 62q8 0 8 10t-10 14l-20 2" stroke="${INK}" stroke-width="3" fill="none"/><circle cx="96" cy="64" r="6" fill="#3B3346" stroke="${INK}" stroke-width="3"/><circle cx="72" cy="88" r="3" fill="${INK}"/>`,
  mustache: () => `<path d="M40 76q10-8 20-2 10-6 20 2-8 6-20 1-12 5-20-1z" fill="${INK}"/>`,
  eyepatch: () => `<path d="M28 50l64 22" stroke="${INK}" stroke-width="3"/><ellipse cx="73" cy="64" rx="10" ry="9" fill="${INK}"/>`,
};

// The avatar as an SVG string. size is the rendered width in pixels.
export function avatar(spec, size = 64, label = '') {
  const a = cleanAvatar(spec);
  const skin = SKINS[a.skin], hair = HAIR_COLORS[a.hairColor], style = HAIRS[a.hair], g = GEAR[a.gear];
  const hatted = g === 'fedora' || g === 'beanie';
  const body = `<rect width="120" height="120" rx="22" fill="${BGS[a.bg]}"/>`
    + `<circle cx="18" cy="18" r="40" fill="#fff" opacity=".14"/>`
    + `<path d="M14 124c2-22 18-32 46-32s44 10 46 32z" fill="#C9A66B" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
    + `<path d="M44 94l16 18 16-18" fill="#FFF8EC" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M56 100l4 24 4-24z" fill="${INK}"/>`
    + (!hatted && back[style] ? back[style](hair) : '')
    + `<circle cx="27" cy="66" r="7" fill="${skin}" stroke="${INK}" stroke-width="3.5"/><circle cx="93" cy="66" r="7" fill="${skin}" stroke="${INK}" stroke-width="3.5"/>`
    + `<ellipse cx="60" cy="64" rx="33" ry="35" fill="${skin}" stroke="${INK}" stroke-width="4"/>`
    + `<ellipse cx="42" cy="76" rx="5" ry="3" fill="#FF7A8A" opacity=".35"/><ellipse cx="78" cy="76" rx="5" ry="3" fill="#FF7A8A" opacity=".35"/>`
    + (hatted ? '' : front[style](hair))
    + eyes[EYES[a.eyes]]() + mouths[MOUTHS[a.mouth]]() + gear[g]();
  return `<svg class="agent-av" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${label.replace(/"/g, '&quot;')}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
