/* The trophy room's drawings, in the lab's comic style (ink outlines, hard shadows, halftone): the
   trophies, the vault the security camera watches (with the owner's hologram), the trap hall, the loot
   pile. Every function returns an SVG string. */
import { drawAvatar } from '/lab/avatar.mjs';
import { TRAPS } from '/lab/heist-rules.mjs';

const INK = '#120E18';
let n = 0;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const svgUri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const avatarImg = (look, x, y, w, extra = '') => `<image href="${svgUri(drawAvatar(look, { plain: true }))}" x="${x}" y="${y}" width="${w}" height="${w}" ${extra}/>`;

/* ---------- trophies (viewBox 0 0 100 120) ---------- */
const GOLD = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF4B0"/><stop offset=".35" stop-color="#FFD23F"/><stop offset=".7" stop-color="#E09A1C"/><stop offset="1" stop-color="#9C5A0E"/></linearGradient>`;
function plinth(label) {
  return `<path d="M22 98h56l4 18H18Z" fill="#3A2A4A" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="30" y="88" width="40" height="11" rx="2" fill="#5B4370" stroke="${INK}" stroke-width="3"/>
    <rect x="33" y="103" width="34" height="8" rx="1.5" fill="#FFE27A" stroke="${INK}" stroke-width="2"/>
    ${label ? `<text x="50" y="109.6" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="7" fill="${INK}" letter-spacing=".5">${esc(label)}</text>` : ''}`;
}
const shine = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75"/>`;
export function trophySvg(kind, { stolen = false, size = '' } = {}) {
  const g = 'tg' + (++n);
  let body = '';
  if (kind === 'masters') {
    body = `<path d="M30 20h40v14c0 16-8 28-20 30-12-2-20-14-20-30Z" fill="url(#${g})" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M30 26c-14 0-16 18-2 22M70 26c14 0 16 18 2 22" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <path d="M30 26c-14 0-16 18-2 22M70 26c14 0 16 18 2 22" fill="none" stroke="#FFD23F" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M45 63h10v16h-10Z" fill="url(#${g})" stroke="${INK}" stroke-width="3"/>
      <path d="M36 79h28l3 9H33Z" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M57 21V3" stroke="${INK}" stroke-width="2.6"/><path d="M57 3l14 4.5-14 4.5Z" fill="#FF3D8B" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="44" cy="17" r="5" fill="#fff" stroke="${INK}" stroke-width="2.4"/><circle cx="42.6" cy="15.8" r=".9" fill="${INK}" opacity=".35"/><circle cx="45.4" cy="17.6" r=".9" fill="${INK}" opacity=".35"/>
      ${shine('M36 29c0 10 3 18 8 24')}`;
  } else if (kind === 'goat') {
    body = `<path d="M33 30c-12-4-16-16-10-26 2 9 7 14 15 16M67 30c12-4 16-16 10-26-2 9-7 14-15 16" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M50 22c13 0 20 9 20 20 0 12-8 22-12 30H42c-4-8-12-18-12-30 0-11 7-20 20-20Z" fill="url(#${g})" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M27 38c-6-1-11 2-12 6 5 1 10 0 14-3M73 38c6-1 11 2 12 6-5 1-10 0-14-3" fill="url(#${g})" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <circle cx="42" cy="42" r="3" fill="${INK}"/><circle cx="58" cy="42" r="3" fill="${INK}"/>
      <path d="M44 58q6 4 12 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M46 72l4 14 4-14" fill="url(#${g})" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M38 80h24l4 8H34Z" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${shine('M38 32c-3 5-3 12 0 18')}`;
  } else if (kind === 'screen') {
    body = `<rect x="18" y="10" width="64" height="48" rx="6" fill="url(#${g})" stroke="${INK}" stroke-width="3.2"/>
      <rect x="25" y="17" width="50" height="34" rx="3" fill="#1B1730" stroke="${INK}" stroke-width="2.6"/>
      <text x="50" y="44" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="24" fill="#FFD23F" stroke="${INK}" stroke-width="1">#1</text>
      <path d="M44 58h12l3 18H41Z" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M34 76h32l3 12H31Z" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${shine('M29 21v10')}`;
  } else if (kind === 'brain') {
    body = `<path d="M50 6l26 22-26 56L24 28Z" fill="#B79CFF" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M24 28h52M38 28l12-22 12 22-12 56Z" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M30 26l8-12" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
  } else {
    body = `<path d="M50 6l11 24 26 3-19 18 5 26-23-13-23 13 5-26L13 33l26-3Z" fill="url(#${g})" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M45 72h10v16H45Z" fill="url(#${g})" stroke="${INK}" stroke-width="3"/>
      ${shine('M41 24l-6 12')}`;
  }
  const tag = stolen ? `<g transform="rotate(-12 50 60)"><rect x="14" y="52" width="72" height="16" rx="2" fill="#FF3D3D" stroke="${INK}" stroke-width="2.6"/><text x="50" y="64.5" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="13" fill="#fff" letter-spacing="1.5">STOLEN</text></g>` : '';
  const sz = size ? ` width="${size}" height="${Math.round(size * 1.2)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"${sz} aria-hidden="true"><defs>${GOLD(g)}</defs>${body}${plinth(kind === 'masters' ? 'MASTERS' : kind === 'goat' ? 'AT PAR' : kind === 'screen' ? 'HIGH SCORE' : '')}${tag}</svg>`;
}

/* ---------- the loot pile ---------- */
function lootPile(loot, x, y, s = 1) {
  const a = Math.min(9, Math.ceil(((loot && loot.amber) || 0) / 25)), sh = Math.min(6, Math.ceil(((loot && loot.shards) || 0) / 3));
  if (!a && !sh) return `<g transform="translate(${x} ${y}) scale(${s})"><text x="0" y="0" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="11" fill="#8A7FA0">EMPTY</text></g>`;
  let out = '';
  const spots = [[0, 0], [-13, 2], [13, 2], [-6, -9], [7, -9], [-20, -6], [20, -6], [0, -18], [-13, -16]];
  for (let i = 0; i < a; i++) { const [px, py] = spots[i]; out += `<path transform="translate(${px} ${py})" d="M0-7l6.5 3.5v7L0 7l-6.5-3.5v-7Z" fill="#F2B33D" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path transform="translate(${px} ${py})" d="M-3-3.5l3-2" stroke="#FFF2C2" stroke-width="1.6" stroke-linecap="round"/>`; }
  const shs = [[-24, 6], [24, 6], [-28, -4], [28, -4], [-17, 10], [17, 10]];
  for (let i = 0; i < sh; i++) { const [px, py] = shs[i]; out += `<path transform="translate(${px} ${py}) rotate(${i % 2 ? 14 : -14})" d="M0-12l5 7-2 9h-6l-2-9Z" fill="#7FD4FF" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`; }
  return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="9" rx="34" ry="6" fill="#000" opacity=".35"/>${out}</g>`;
}

/* ---------- the vault (CAM 2): 400 × 250 ---------- */
// The hologram: the owner's avatar in cyan light over a projector disc, flickering (class holo).
function hologram(look, cx, base, w, id) {
  return `<g class="holo-rig">
    <polygon points="${cx - w * 0.16},${base} ${cx + w * 0.16},${base} ${cx + w * 0.46},${base - w * 1.02} ${cx - w * 0.46},${base - w * 1.02}" fill="url(#${id}-cone)"/>
    <g class="holo" filter="url(#${id}-holo)">${avatarImg(look, cx - w / 2, base - w * 1.06, w, 'opacity=".92"')}</g>
    <rect x="${cx - w / 2}" y="${base - w * 1.06}" width="${w}" height="${w}" fill="url(#${id}-scan)" class="holo-scan"/>
    <ellipse cx="${cx}" cy="${base + 2}" rx="${w * 0.3}" ry="${w * 0.07}" fill="#0B4E5C" stroke="${INK}" stroke-width="2.4"/>
    <ellipse cx="${cx}" cy="${base}" rx="${w * 0.22}" ry="${w * 0.045}" fill="#8CF5FF" class="holo-disc"/>
  </g>`;
}
export function vaultSvg(room, { lock = false, pick = false, id = 'v' + (++n), holo = true } = {}) {
  const trophies = room.trophies || [];
  const shelfY = [96, 156], slots = [[44, 0], [100, 0], [300, 0], [356, 0], [44, 1], [100, 1], [300, 1], [356, 1]];
  let shelf = '';
  for (const y of shelfY) shelf += `<rect x="14" y="${y}" width="116" height="8" fill="#5B4370" stroke="${INK}" stroke-width="2.4"/><rect x="270" y="${y}" width="116" height="8" fill="#5B4370" stroke="${INK}" stroke-width="2.4"/>`;
  let items = '';
  trophies.slice(0, slots.length).forEach((t, i) => {
    const [x, row] = slots[i], w = 46, y = shelfY[row] - w * 1.2 + 2;
    items += `<g class="${pick ? 'pickable' : ''}" data-tid="${esc(t.id)}"><image href="${svgUri(trophySvg(t.kind, { stolen: !!t.from }))}" x="${x - w / 2}" y="${y}" width="${w}" height="${w * 1.2}"/>${pick ? `<rect x="${x - w / 2 - 3}" y="${y - 3}" width="${w + 6}" height="${w * 1.2 + 6}" rx="6" fill="transparent" class="hit"/>` : ''}</g>`;
  });
  if (trophies.length > slots.length) items += `<text x="200" y="244" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="13" fill="#FFD23F">+${trophies.length - slots.length} MORE</text>`;
  if (!trophies.length) items += `<text x="72" y="84" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="12" fill="#8A7FA0" letter-spacing="1">NO TROPHIES YET</text>`;
  // the floor in perspective
  let floor = '';
  for (let i = -6; i <= 6; i++) floor += `<line x1="${200 + i * 16}" y1="168" x2="${200 + i * 70}" y2="250" stroke="#2E2540" stroke-width="1.4"/>`;
  for (const y of [178, 192, 211, 236]) floor += `<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#2E2540" stroke-width="1.4"/>`;
  const lasers = lock
    ? `<g><rect x="0" y="0" width="400" height="250" fill="#FF2A2A" opacity=".14" class="alarm-wash"/>${[60, 120, 180, 240, 300, 340].map((x) => `<rect x="${x}" y="0" width="10" height="250" fill="#5B5466" stroke="${INK}" stroke-width="2"/>`).join('')}
       <g transform="rotate(-8 200 125)"><rect x="96" y="104" width="208" height="40" rx="4" fill="#FF3D3D" stroke="${INK}" stroke-width="3"/><text x="200" y="134" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="30" fill="#fff" letter-spacing="3">LOCKDOWN</text></g></g>`
    : `<g class="lasers">${[[0, 206, 400, 232], [0, 236, 400, 204], [0, 222, 400, 222]].map(([a, b, c, d], i) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#FF2A55" stroke-width="2" class="laser l${i}"/>`).join('')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" class="scene vault" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="${id}-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2140"/><stop offset="1" stop-color="#150F22"/></linearGradient>
      <linearGradient id="${id}-cone" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8CF5FF" stop-opacity=".55"/><stop offset="1" stop-color="#29D3F0" stop-opacity="0"/></linearGradient>
      <pattern id="${id}-scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#C9FBFF" opacity=".35"/></pattern>
      <filter id="${id}-holo" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="matrix" values="0.10 0.18 0.05 0 0.02  0.25 0.55 0.15 0 0.30  0.25 0.50 0.20 0 0.42  0 0 0 0.85 0"/><feGaussianBlur stdDeviation=".35"/></filter>
      <radialGradient id="${id}-glow" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#29D3F0" stop-opacity=".28"/><stop offset="1" stop-color="#29D3F0" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="400" height="168" fill="url(#${id}-wall)"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${i * 50 + 2}" y="6" width="46" height="70" rx="3" fill="#251C38" stroke="#110C1C" stroke-width="2"/><circle cx="${i * 50 + 8}" cy="12" r="1.6" fill="#4A3D63"/><circle cx="${i * 50 + 42}" cy="12" r="1.6" fill="#4A3D63"/>`).join('')}
    <rect y="168" width="400" height="82" fill="#1B1528"/>${floor}
    <ellipse cx="200" cy="140" rx="150" ry="110" fill="url(#${id}-glow)"/>
    ${shelf}${items}
    ${holo && room.look !== undefined ? hologram(room.look, 200, 196, 128, id) : ''}
    ${lootPile(room.loot, 314, 202, 1.25)}
    <rect x="0" y="0" width="400" height="250" fill="none" stroke="${INK}" stroke-width="4"/>
    ${lasers}
  </svg>`;
}

/* ---------- the trap hall (CAM 1): 400 × 250, a quad split like a real security monitor ---------- */
// One feed a trap: the trap's room lit in its color, its sign and what it is, lasers sweeping; the trap
// the raider is at pulses, a cleared one is stamped CLEARED, the one that caught them CAUGHT.
export function hallSvg(traps, { at = -1, done = [], id = 'h' + (++n) } = {}) {
  const cells = [[0, 0], [201, 0], [0, 126], [201, 126]];
  let out = '';
  traps.slice(0, 4).forEach((t, k) => {
    const T = TRAPS[t.kind] || TRAPS.trivia, [x, y] = cells[k], w = 199, h = 124, cx = x + w / 2;
    const passed = done[k] === 'ok', caught = done[k] === 'caught', here = k === at;
    const sub = t.label || T.what;
    out += `<g class="trap-frame${here ? ' here' : ''}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-room)"/>
      <ellipse cx="${cx}" cy="${y + h * 0.42}" rx="${w * 0.42}" ry="${h * 0.44}" fill="${T.color}" opacity="${passed ? 0.06 : 0.16}"/>
      <polygon points="${x},${y + h} ${x + 34},${y + h * 0.7} ${x + w - 34},${y + h * 0.7} ${x + w},${y + h}" fill="#221A33"/>
      <line x1="${x + 34}" y1="${y + h * 0.7}" x2="${x + w - 34}" y2="${y + h * 0.7}" stroke="#3A2E52" stroke-width="1.5"/>
      ${passed ? '' : `<g class="beams b${k % 3}">${[0.3, 0.52].map((f, i) => `<line x1="${x + 2}" y1="${y + h * f}" x2="${x + w - 2}" y2="${y + h * (f + (i ? -0.14 : 0.16))}" stroke="#FF2A55" stroke-width="1.8" class="laser l${(k + i) % 3}"/>`).join('')}</g>`}
      <text x="${cx}" y="${y + h * 0.42}" text-anchor="middle" font-size="38" opacity="${passed ? 0.45 : 1}">${T.emoji}</text>
      <text x="${cx}" y="${y + h * 0.42 + 24}" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="19" fill="${T.color}" letter-spacing="1" stroke="${INK}" stroke-width="3" paint-order="stroke">${k + 1} · ${esc(T.name.toUpperCase())}</text>
      <text x="${cx}" y="${y + h * 0.42 + 37}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="9.5" fill="#E8E0F5" stroke="${INK}" stroke-width="2.4" paint-order="stroke">${esc(sub)}</text>
      ${passed ? `<g transform="rotate(-10 ${cx} ${y + h * 0.34})"><rect x="${cx - 52}" y="${y + h * 0.34 - 15}" width="104" height="30" rx="3" fill="none" stroke="#5BE38A" stroke-width="3"/><text x="${cx}" y="${y + h * 0.34 + 9}" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="24" fill="#5BE38A" letter-spacing="2">CLEARED</text></g>` : ''}
      ${caught ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FF2A2A" opacity=".22" class="alarm-wash"/><g transform="rotate(-10 ${cx} ${y + h * 0.34})"><rect x="${cx - 50}" y="${y + h * 0.34 - 15}" width="100" height="30" rx="3" fill="#FF3D3D" stroke="${INK}" stroke-width="3"/><text x="${cx}" y="${y + h * 0.34 + 9}" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="24" fill="#fff" letter-spacing="2">CAUGHT</text></g>` : ''}
      ${here ? `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="none" stroke="#FFD23F" stroke-width="4"/>` : ''}
    </g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" class="scene hall" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="${id}-room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E1730"/><stop offset="1" stop-color="#120D1E"/></linearGradient></defs>
    <rect width="400" height="250" fill="#05030A"/>${out}
    <rect x="0" y="0" width="400" height="250" fill="none" stroke="${INK}" stroke-width="4"/>
  </svg>`;
}
