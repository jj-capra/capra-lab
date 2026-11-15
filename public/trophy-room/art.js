/* The trophy room's drawings, in the lab's comic style (ink outlines, hard shadows, halftone): the
   trophies, the vault the security camera watches (a treasure trove since Nov 14 2026, JC: "I want the
   trophy room to look like a treasure trove of relics trophies and coins"), the owner's hologram, the trap
   hall. Every function returns an SVG string. */
import { drawAvatar } from '/lab/avatar.mjs';
import { TRAPS } from '/lab/heist-rules.mjs';

const INK = '#120E18';
let n = 0;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const svgUri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
// Drawings go inside a scene as nested <svg> elements, not as <image> pictures: a picture that fails to
// load shows a broken-image "?" in Safari, and an inline drawing can't fail that way.
const place = (svg, x, y, w, h) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
const avatarImg = (look, x, y, w) => place(drawAvatar(look, { plain: true }), x, y, w, w);

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
  } else if (kind === 'clues') {
    // Three Clue Crew: a gold magnifying glass, three clues in the lens
    body = `<path d="M60 48l15 17" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M60 48l15 17" stroke="url(#${g})" stroke-width="6.5" stroke-linecap="round"/>
      <circle cx="44" cy="32" r="22" fill="#BDF3FF" stroke="${INK}" stroke-width="3"/>
      <circle cx="44" cy="32" r="19" fill="none" stroke="url(#${g})" stroke-width="6"/><circle cx="44" cy="32" r="15.5" fill="none" stroke="${INK}" stroke-width="2"/><circle cx="44" cy="32" r="22.5" fill="none" stroke="${INK}" stroke-width="2.6"/>
      <circle cx="36" cy="33" r="3" fill="${INK}"/><circle cx="44" cy="33" r="3" fill="${INK}"/><circle cx="52" cy="33" r="3" fill="${INK}"/>
      <path d="M45 54h10v25h-10Z" fill="url(#${g})" stroke="${INK}" stroke-width="3"/>
      <path d="M36 79h28l3 9H33Z" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${shine('M33 22c-3 3-4 7-3 11')}`;
  } else if (kind === 'spin') {
    // Puzzled Spin: a gold disc with the spin spiral
    let sp = '';
    for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI * 5.2, r = 2 + 1.25 * t; sp += `${i ? 'L' : 'M'}${(50 + r * Math.cos(t)).toFixed(1)} ${(34 + r * Math.sin(t)).toFixed(1)}`; }
    body = `<circle cx="50" cy="34" r="28" fill="url(#${g})" stroke="${INK}" stroke-width="3.2"/>
      <circle cx="50" cy="34" r="23" fill="#29D3F0" stroke="${INK}" stroke-width="2.4"/>
      <path d="${sp}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M45 62h10v17h-10Z" fill="url(#${g})" stroke="${INK}" stroke-width="3"/>
      <path d="M36 79h28l3 9H33Z" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${shine('M31 22c-3 4-4 9-3 14')}`;
  } else if (kind === 'golf') {
    // Par-Tee Time's Daily 3: a golf ball on a gold tee, the pin beside it
    const dimples = [[38, 28], [46, 25], [54, 28], [34, 36], [42, 34], [50, 34], [58, 36], [38, 44], [46, 42], [54, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="#D6CCBE"/>`).join('');
    body = `<path d="M74 86V8" stroke="${INK}" stroke-width="2.8"/><path d="M74 8l-17 5.5 17 5.5Z" fill="#FF3D5A" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M34 56h24l-6 7h-12Z" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M43 63h6l-1 16h-4Z" fill="url(#${g})" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>
      <circle cx="46" cy="35" r="21" fill="#FFF8EC" stroke="${INK}" stroke-width="3.2"/>${dimples}
      <path d="M33 25c-4 4-5 10-3 15" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <path d="M36 79h28l3 9H33Z" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  } else if (kind === 'cap') {
    // No Cap: a gold cap under the red no-cap ring
    body = `<path d="M26 46c0-20 11-31 25-31s24 10 25 27l-1 4Z" fill="url(#${g})" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M74 42c9 0 17 2 19 6-2 4-12 5-20 4" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M50 15c-6 8-8 18-8 31" fill="none" stroke="${INK}" stroke-width="2.4"/><circle cx="51" cy="15" r="3" fill="url(#${g})" stroke="${INK}" stroke-width="2.2"/>
      <circle cx="50" cy="32" r="27" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="50" cy="32" r="27" fill="none" stroke="#FF3B5C" stroke-width="4.4"/>
      <path d="M31 51L69 13" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M31 51L69 13" stroke="#FF3B5C" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M45 60h10v19h-10Z" fill="url(#${g})" stroke="${INK}" stroke-width="3"/>
      <path d="M36 79h28l3 9H33Z" fill="url(#${g})" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  } else {
    body = `<path d="M50 6l11 24 26 3-19 18 5 26-23-13-23 13 5-26L13 33l26-3Z" fill="url(#${g})" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M45 72h10v16H45Z" fill="url(#${g})" stroke="${INK}" stroke-width="3"/>
      ${shine('M41 24l-6 12')}`;
  }
  const tag = stolen ? `<g transform="rotate(-12 50 60)"><rect x="14" y="52" width="72" height="16" rx="2" fill="#FF3D3D" stroke="${INK}" stroke-width="2.6"/><text x="50" y="64.5" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="13" fill="#fff" letter-spacing="1.5">STOLEN</text></g>` : '';
  const sz = size ? ` width="${size}" height="${Math.round(size * 1.2)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"${sz} aria-hidden="true"><defs>${GOLD(g)}</defs>${body}${plinth(kind === 'masters' ? 'MASTERS' : kind === 'goat' ? 'AT PAR' : kind === 'screen' ? 'HIGH SCORE' : ['clues', 'spin', 'cap', 'golf'].includes(kind) ? 'DAILY #1' : '')}${tag}</svg>`;
}

/* ---------- the treasure trove's pieces (shared with the selfie) ---------- */
// A seeded random, so a room's heap looks the same every time it's drawn.
export function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f1 = (v) => Math.round(v * 10) / 10;
// The gradients the pieces paint with, once per scene (id: the scene's prefix).
export function troveDefs(id) {
  return `<linearGradient id="${id}-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE98A"/><stop offset=".45" stop-color="#F5B82E"/><stop offset="1" stop-color="#A8600F"/></linearGradient>
    <linearGradient id="${id}-coin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF4B0"/><stop offset=".5" stop-color="#FFD23F"/><stop offset="1" stop-color="#D98E17"/></linearGradient>
    <radialGradient id="${id}-warm" cx=".5" cy=".62" r=".6"><stop offset="0" stop-color="#FFB627" stop-opacity=".42"/><stop offset=".6" stop-color="#FF8A1F" stop-opacity=".12"/><stop offset="1" stop-color="#FF8A1F" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-torch" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB627" stop-opacity=".5"/><stop offset="1" stop-color="#FFB627" stop-opacity="0"/></radialGradient>`;
}
// A coin lying down (r: its radius), or standing on its edge.
export function coin(id, x, y, r, rot = 0) {
  const sw = f1(Math.max(1, r * 0.24));
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})"><ellipse cy="${f1(r * 0.16)}" rx="${f1(r)}" ry="${f1(r * 0.46)}" fill="#B06A10" stroke="${INK}" stroke-width="${sw}"/><ellipse rx="${f1(r)}" ry="${f1(r * 0.46)}" fill="url(#${id}-coin)" stroke="${INK}" stroke-width="${sw}"/><ellipse rx="${f1(r * 0.58)}" ry="${f1(r * 0.25)}" fill="none" stroke="#B06A10" stroke-width="${f1(sw * 0.6)}"/></g>`;
}
export function coinUp(id, x, y, r, rot = 0) {
  const sw = f1(Math.max(1, r * 0.22));
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})"><circle r="${f1(r)}" fill="url(#${id}-coin)" stroke="${INK}" stroke-width="${sw}"/><circle r="${f1(r * 0.64)}" fill="none" stroke="#B06A10" stroke-width="${f1(sw * 0.7)}"/><path d="M0 ${f1(-r * 0.36)}l${f1(r * 0.11)} ${f1(r * 0.24)} ${f1(r * 0.26)} .02-${f1(r * 0.2)} ${f1(r * 0.16)}.08 ${f1(r * 0.26)}L0 ${f1(r * 0.16)}l-${f1(r * 0.22)} ${f1(r * 0.14)}.08-${f1(r * 0.26)}-${f1(r * 0.2)}-${f1(r * 0.16)} ${f1(r * 0.26)}-.02Z" fill="#B06A10"/></g>`;
}
// A heap of gold coins from x0 to x1: its sides at `side`, its top at `peak`, down to `bottom`.
// Returns the drawing and top(x), the heap's surface (for setting things on it).
export function coinHeap(id, { x0, x1, side, peak, bottom, coins = 60, r = 5.5, rnd }) {
  const cx = (x0 + x1) / 2, half = (x1 - x0) / 2, p1 = rnd() * 6, p2 = rnd() * 6, amp = r * 0.45;
  const top = (x) => { const u = (x - cx) / half, d = Math.max(0, 1 - u * u); return side - (side - peak) * Math.pow(d, 0.7) + amp * Math.sin(x * 0.19 / (r / 5.5) + p1) + amp * 0.6 * Math.sin(x * 0.47 / (r / 5.5) + p2); };
  const step = r * 1.6;
  let d = `M${f1(x0)} ${f1(bottom)}`;
  for (let x = x0; x <= x1 + 0.01; x += step) d += `L${f1(x)} ${f1(top(x))}`;
  d += `L${f1(x1)} ${f1(top(x1))}L${f1(x1)} ${f1(bottom)}Z`;
  const list = [];
  for (let i = 0; i < coins; i++) {
    const x = x0 + r * 1.5 + rnd() * (x1 - x0 - r * 3), t = top(x);
    list.push([x, t + r * 0.4 + Math.pow(rnd(), 1.7) * (bottom - t), (rnd() - 0.5) * 50, r * (0.82 + rnd() * 0.36)]);
  }
  list.sort((a, b) => a[1] - b[1]);
  let out = `<path d="${d}" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="${f1(r * 0.5)}" stroke-linejoin="round"/>`;
  for (const [x, y, rot, rr] of list) out += coin(id, x, y, rr, rot);
  // coins standing up out of the top, and a shine along it
  for (let i = 0; i < Math.round(coins / 9); i++) { const x = x0 + half * 0.3 + rnd() * half * 1.4; out += coinUp(id, x, top(x) + r * 0.3, r * 0.95, (rnd() - 0.5) * 50); }
  let sh = '';
  for (let x = cx - half * 0.5; x <= cx + half * 0.15; x += step) sh += `${sh ? 'L' : 'M'}${f1(x)} ${f1(top(x) + r * 0.9)}`;
  out += `<path d="${sh}" fill="none" stroke="#FFF6C8" stroke-width="${f1(r * 0.5)}" stroke-linecap="round" opacity=".55"/>`;
  return { svg: out, top };
}
// A treasure chest, lid thrown open, its bottom middle at (x, y). Inside: 'gold', the loot, or nothing.
export function chest(id, x, y, s, inside = 'gold', loot = null, rnd = Math.random) {
  let fill = '';
  if (inside === 'gold') {
    fill = `<path d="M-30 -36c4-12 14-14 22-10 6-8 18-6 22 0 8-4 16 2 16 10Z" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
    for (const [cx, cy, rr] of [[-18, -42, 5], [-6, -46, 5], [8, -45, 5], [20, -40, 4.6], [-2, -39, 4.6], [13, -38, 4.4]]) fill += coin(id, cx, cy, rr, (rnd() - 0.5) * 40);
    fill += coinUp(id, 4, -52, 5, 14);
    fill += `<path d="M14 -48l5 -6 5 6 -5 8Z" fill="#FF3D5A" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
  } else if (inside === 'loot') {
    const a = Math.min(8, Math.ceil(((loot && loot.amber) || 0) / 25)), sh = Math.min(5, Math.ceil(((loot && loot.shards) || 0) / 3));
    if (a || sh) {
      fill = `<path d="M-30 -36c4-10 14-12 22-8 6-6 18-5 22 0 8-3 16 2 16 8Z" fill="#C9781A" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
      const spots = [[-16, -40], [-4, -44], [9, -43], [20, -39], [-22, -37], [2, -38], [-10, -37], [14, -37]];
      for (let i = 0; i < a; i++) { const [px, py] = spots[i]; fill += `<path transform="translate(${px} ${py})" d="M0-6.5l6 3.2v6.6L0 6.5l-6-3.2v-6.6Z" fill="#F2B33D" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/><path transform="translate(${px} ${py})" d="M-3-3l3-2" stroke="#FFF2C2" stroke-width="1.5" stroke-linecap="round"/>`; }
      const shs = [[-11, -50, -14], [12, -52, 14], [0, -56, 0], [-22, -46, -24], [24, -46, 22]];
      for (let i = 0; i < sh; i++) { const [px, py, rr] = shs[i]; fill += `<path transform="translate(${px} ${py}) rotate(${rr})" d="M0-12l5 7-2 9h-6l-2-9Z" fill="#7FD4FF" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path transform="translate(${px} ${py}) rotate(${rr})" d="M-1-7l2-2" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`; }
    } else {
      fill = `<path d="M-22 -36l10 -14M-22 -36l18 -6M-22 -36l4 -18M-15 -46q4 3 8-1M-18 -41q5 2 9-2" stroke="#8A7FA0" stroke-width="1" fill="none" opacity=".8"/>`;
    }
  }
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">
    <ellipse cy="2" rx="40" ry="6" fill="#000" opacity=".35"/>
    <path d="M-32 -36l4-30q28-12 56 0l4 30Z" fill="#6B3D1C" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M-25 -39l3-22q22-8 44 0l3 22Z" fill="#2A170B"/>
    <path d="M-30 -52q30-10 60 0" fill="none" stroke="#F2B33D" stroke-width="4"/><path d="M-30 -52q30-10 60 0" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".6"/>
    ${fill}
    <rect x="-32" y="-36" width="64" height="36" rx="3" fill="#8A5428" stroke="${INK}" stroke-width="3"/>
    <path d="M-28 -14h18M4 -20h20M-26 -24h8M12 -8h14" stroke="#5E3417" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="-32" y="-36" width="64" height="7" fill="#F2B33D" stroke="${INK}" stroke-width="2.4"/>
    <rect x="-23" y="-36" width="7" height="36" fill="#F2B33D" stroke="${INK}" stroke-width="2.2"/><rect x="16" y="-36" width="7" height="36" fill="#F2B33D" stroke="${INK}" stroke-width="2.2"/>
    <rect x="-6" y="-27" width="12" height="13" rx="2" fill="#FFD23F" stroke="${INK}" stroke-width="2.2"/><path d="M0 -23v4" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
  </g>`;
}
// The relics.
const at = (x, y, s, rot, body) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})">${body}</g>`;
export function crown(id, x, y, s = 1, rot = 0) {
  return at(x, y, s, rot, `<path d="M-16-8l-2-18 10 11 8-15 8 15 10-11-2 18Z" fill="url(#${id}-coin)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <rect x="-16" y="-9" width="32" height="9" rx="1.5" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="-18" cy="-27" r="2.6" fill="#FFF8EC" stroke="${INK}" stroke-width="1.6"/><circle cx="0" cy="-31" r="2.8" fill="#FFF8EC" stroke="${INK}" stroke-width="1.6"/><circle cx="18" cy="-27" r="2.6" fill="#FFF8EC" stroke="${INK}" stroke-width="1.6"/>
    <circle cx="0" cy="-4.5" r="3" fill="#FF3D5A" stroke="${INK}" stroke-width="1.5"/><circle cx="-10" cy="-4.5" r="2.2" fill="#3D7BFF" stroke="${INK}" stroke-width="1.3"/><circle cx="10" cy="-4.5" r="2.2" fill="#5BE38A" stroke="${INK}" stroke-width="1.3"/>
    <path d="M-12-12l-1-6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`);
}
export function chalice(id, x, y, s = 1, rot = 0) {
  return at(x, y, s, rot, `<path d="M-10 0q10-9 20 0Z" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M-2.5-16h5v11h-5Z" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="2.2"/>
    <path d="M-12-38h24c0 14-5 21-12 22-7-1-12-8-12-22Z" fill="url(#${id}-coin)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <ellipse cy="-38" rx="12" ry="3" fill="#A8600F" stroke="${INK}" stroke-width="2.2"/>
    <circle cy="-28" r="3.2" fill="#5BE38A" stroke="${INK}" stroke-width="1.6"/><path d="M-8-34c0 5 1 8 3 11" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>`);
}
export function mask(id, x, y, s = 1, rot = 0) {
  return at(x, y, s, rot, `<path d="M0-20c13 0 15 14 13 24-2 9-8 15-13 15s-11-6-13-15c-2-10 0-24 13-24Z" fill="url(#${id}-coin)" stroke="${INK}" stroke-width="2.6"/>
    <path d="M-10-4q4-5 8 0-4 3-8 0ZM10-4q-4-5-8 0 4 3 8 0Z" fill="${INK}"/>
    <path d="M-11-11q5-4 9 0M11-11q-5-4-9 0M0-2l-2 8h4M-5 11q5 3 10 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M0-17l3 3-3 3-3-3Z" fill="#B79CFF" stroke="${INK}" stroke-width="1.4"/><path d="M-8-15c-2 3-3 7-2 11" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>`);
}
export function gem(x, y, s = 1, color = '#FF3D5A', rot = 0) {
  return at(x, y, s, rot, `<path d="M-6-3l3-4h6l3 4-6 10Z" fill="${color}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M-6-3h12M-3-7l1.5 4L0 7M3-7L1.5-3 0 7" stroke="${INK}" stroke-width=".9" fill="none" opacity=".55"/><path d="M-3.4-4.4l1.6-1.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>`);
}
export function pearls(x0, y0, x1, y1, sag, n = 9, r = 2.6) {
  let out = '';
  for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + sag * 4 * t * (1 - t); out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="#FFF8EC" stroke="${INK}" stroke-width="1.3"/>`; }
  return out;
}
export function sparkle(x, y, r, k = 0) {
  const q = f1(r * 0.2);
  return `<g transform="translate(${f1(x)} ${f1(y)})"><path class="spark s${k % 3}" d="M0-${r}L${q}-${q}L${r} 0L${q} ${q}L0 ${r}L-${q} ${q}L-${r} 0L-${q}-${q}Z" fill="#FFF6C8"/></g>`;
}
function torch(id, x, y) {
  return `<g transform="translate(${x} ${y})"><circle cy="-26" r="34" fill="url(#${id}-torch)"/>
    <path d="M-7 0h14l-4 9h-6Z" fill="#4A3A55" stroke="${INK}" stroke-width="2"/><rect x="-2.6" y="-15" width="5.2" height="16" fill="#7A4A24" stroke="${INK}" stroke-width="2"/>
    <g class="flame"><path d="M0-40c9 10 9 19 0 25-9-6-9-15 0-25Z" fill="#FF7A1A" stroke="${INK}" stroke-width="2"/><path d="M0-31c4 5 4 10 0 13-4-3-4-8 0-13Z" fill="#FFE27A"/></g></g>`;
}
// The owner's crest on the back wall: a giant coin over crossed swords.
function crest(id, cx, cy, r) {
  const sword = (rot) => `<g transform="translate(${cx} ${cy}) rotate(${rot})"><path d="M-2.6-${f1(r * 1.55)}L0-${f1(r * 1.72)}L2.6-${f1(r * 1.55)}V${r * 0.5}h-5.2Z" fill="#D9E2EE" stroke="${INK}" stroke-width="2"/><path d="M-10 ${r * 0.5}h20v4h-20Z" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="2"/><rect x="-2" y="${r * 0.5 + 4}" width="4" height="11" fill="#6B3D1C" stroke="${INK}" stroke-width="1.8"/><circle cy="${r * 0.5 + 18}" r="3.2" fill="#FF3D5A" stroke="${INK}" stroke-width="1.6"/></g>`;
  let dots = '';
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; dots += `<circle cx="${f1(cx + Math.cos(a) * r * 0.8)}" cy="${f1(cy + Math.sin(a) * r * 0.8)}" r="1.4" fill="#A8600F"/>`; }
  return `${sword(-50)}${sword(50)}
    <circle cx="${cx}" cy="${cy + 3}" r="${r}" fill="#A8600F" stroke="${INK}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}-coin)" stroke="${INK}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${f1(r * 0.66)}" fill="none" stroke="#A8600F" stroke-width="2"/>${dots}
    <path transform="translate(${cx} ${cy}) scale(${f1(r / 26)})" d="M0-12l3.5 7.5 8 .9-6 5.4 1.7 8L0 5.8-7.2 9.8l1.7-8-6-5.4 8-.9Z" fill="#FFF4B0" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M${cx - r * 0.6} ${cy - r * 0.35}a${f1(r * 0.7)} ${f1(r * 0.7)} 0 0 1 ${f1(r * 0.45)}-${f1(r * 0.4)}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`;
}
// Stone blocks for the back wall.
function stoneWall(w, h, rowH, blockW, rnd, sw = 2) {
  const tones = ['#2E2233', '#2A1F30', '#35283C', '#30233A'];
  let out = '';
  for (let y = 0, row = 0; y < h; y += rowH, row++) {
    for (let x = row % 2 ? -blockW / 2 : 0; x < w; x += blockW) out += `<rect x="${f1(x + sw / 2)}" y="${f1(y + sw / 2)}" width="${f1(blockW - sw)}" height="${f1(rowH - sw)}" rx="${f1(sw * 1.2)}" fill="${tones[Math.floor(rnd() * tones.length)]}" stroke="#160E1B" stroke-width="${sw}"/>`;
  }
  return out;
}

/* ---------- the vault (CAM 2): 400 × 250, a treasure trove ---------- */
// The hologram: the owner's avatar in cyan light over a projector disc, flickering (class holo).
function hologram(look, cx, base, w, id) {
  return `<g class="holo-rig">
    <polygon points="${cx - w * 0.16},${base} ${cx + w * 0.16},${base} ${cx + w * 0.46},${base - w * 1.02} ${cx - w * 0.46},${base - w * 1.02}" fill="url(#${id}-cone)"/>
    <g class="holo" filter="url(#${id}-holo)" opacity=".92">${avatarImg(look, cx - w / 2, base - w * 1.06, w)}</g>
    <rect x="${cx - w / 2}" y="${base - w * 1.06}" width="${w}" height="${w}" fill="url(#${id}-scan)" class="holo-scan"/>
    <ellipse cx="${cx}" cy="${base + 2}" rx="${w * 0.3}" ry="${w * 0.07}" fill="#0B4E5C" stroke="${INK}" stroke-width="2.4"/>
    <ellipse cx="${cx}" cy="${base}" rx="${w * 0.22}" ry="${w * 0.045}" fill="#8CF5FF" class="holo-disc"/>
  </g>`;
}
// How rich a room looks: the heap grows with the trophies and the loot.
export function richness(room) {
  const l = room.loot || {};
  return Math.min(1, 0.3 + (room.trophies || []).length * 0.09 + ((l.amber || 0) / 800) + ((l.shards || 0) / 80));
}
export function vaultSvg(room, { lock = false, pick = false, id = 'v' + (++n), holo = true } = {}) {
  const trophies = room.trophies || [];
  const rnd = seeded('trove:' + ((room.owner && room.owner.handle) || ''));
  const rich = richness(room);
  // the back wall: stone, torches, the crest, ledges for the first four trophies
  let back = stoneWall(400, 168, 24, 50, rnd);
  back += torch(id, 22, 70) + torch(id, 378, 70);
  back += crest(id, 200, 42, 23);
  for (const x0 of [14, 270]) back += `<path d="M${x0 + 10} 105l6 10h12l6-10M${x0 + 82} 105l6 10h12l6-10" fill="#3A2C45" stroke="${INK}" stroke-width="2"/><rect x="${x0}" y="96" width="116" height="9" fill="#4A3A55" stroke="${INK}" stroke-width="2.4"/><rect x="${x0 + 1.2}" y="97.2" width="113.6" height="2.6" fill="#E09A1C"/>`;
  // the heap: the hologram stands on top of it
  const heap = coinHeap(id, { x0: -10, x1: 410, side: 226 - rich * 8, peak: 190 - rich * 22, bottom: 262, coins: Math.round(70 + rich * 70), r: 5.4, rnd });
  const ledge = [[44, 96], [100, 96], [300, 96], [356, 96]];
  const onHeap = [82, 128, 272, 318].map((x) => [x, heap.top(x) + 7]);
  const slots = [...ledge, ...onHeap];
  const W = 46;
  const trophyAt = (t, i) => {
    const [x, base] = slots[i], y = base - W * 1.2 + 2;
    return `<g class="${pick ? 'pickable' : ''}" data-tid="${esc(t.id)}">${place(trophySvg(t.kind, { stolen: !!t.from }), x - W / 2, y, W, W * 1.2)}${pick ? `<rect x="${x - W / 2 - 3}" y="${y - 3}" width="${W + 6}" height="${W * 1.2 + 6}" rx="6" fill="transparent" class="hit"/>` : ''}</g>`;
  };
  let ledgeItems = '', heapItems = '';
  trophies.slice(0, slots.length).forEach((t, i) => { if (i < 4) ledgeItems += trophyAt(t, i); else heapItems += trophyAt(t, i) + coin(id, slots[i][0] - 14, slots[i][1] - 2, 5, -12) + coin(id, slots[i][0] + 15, slots[i][1] - 1, 5.2, 18); });
  // empty ledge spots hold relics, so even a new room is a trove
  const relics = [(x) => chalice(id, x, 95, 0.95), (x) => mask(id, x, 76, 0.95) + `<path d="M${x - 7} 95l7-17 7 17" fill="none" stroke="${INK}" stroke-width="2.4"/>`, (x) => crown(id, x, 95, 0.9), (x) => gem(x - 8, 90, 1.1, '#5BE38A') + gem(x + 6, 91, 1.2, '#3D7BFF') + gem(x - 1, 82, 1.1, '#FF3D5A')];
  for (let i = trophies.length; i < 4; i++) ledgeItems += relics[i](ledge[i][0]);
  const more = trophies.length > slots.length ? `<text x="200" y="244" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="13" fill="#FFE98A" stroke="${INK}" stroke-width="3" paint-order="stroke">+${trophies.length - slots.length} MORE</text>` : '';
  // up front: relics in the coins, the chests (the right one holds the loot), loose coins, sparkles
  let front = crown(id, 150, 238, 0.95, -14) + chalice(id, 252, 242, 0.85, 9) + mask(id, 300, 236, 0.8, 12);
  front += gem(116, 243, 1.1, '#FF3D5A', -10) + gem(186, 247, 1, '#3D7BFF', 8) + gem(222, 246, 1.05, '#5BE38A', -6) + gem(276, 247, 0.95, '#B79CFF', 12);
  front += chest(id, 40, 248, 0.82, 'gold', null, rnd) + pearls(58, 214, 96, 236, 6, 9, 2.2);
  front += chest(id, 360, 248, 0.82, 'loot', room.loot, rnd);
  for (const [x, y, r] of [[96, 247, 4.6], [208, 249, 4.4], [326, 247, 4.6], [176, 241, 4.2]]) front += coin(id, x, y, r, (rnd() - 0.5) * 40);
  let sparks = '';
  [[60, 186], [128, 162], [276, 170], [338, 186], [168, 226], [236, 222], [44, 150], [356, 150], [200, 70]].forEach(([x, y], k) => { sparks += sparkle(x, y, 4 + (k % 3) * 1.5, k); });
  const lasers = lock
    ? `<g><rect x="0" y="0" width="400" height="250" fill="#FF2A2A" opacity=".14" class="alarm-wash"/>${[60, 120, 180, 240, 300, 340].map((x) => `<rect x="${x}" y="0" width="10" height="250" fill="#5B5466" stroke="${INK}" stroke-width="2"/>`).join('')}
       <g transform="rotate(-8 200 125)"><rect x="96" y="104" width="208" height="40" rx="4" fill="#FF3D3D" stroke="${INK}" stroke-width="3"/><text x="200" y="134" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="30" fill="#fff" letter-spacing="3">LOCKDOWN</text></g></g>`
    : `<g class="lasers">${[[0, 206, 400, 232], [0, 236, 400, 204], [0, 222, 400, 222]].map(([a, b, c, d], i) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#FF2A55" stroke-width="2" class="laser l${i}"/>`).join('')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" class="scene vault" preserveAspectRatio="xMidYMid slice">
    <defs>
      ${troveDefs(id)}
      <linearGradient id="${id}-cone" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8CF5FF" stop-opacity=".55"/><stop offset="1" stop-color="#29D3F0" stop-opacity="0"/></linearGradient>
      <pattern id="${id}-scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#C9FBFF" opacity=".35"/></pattern>
      <filter id="${id}-holo" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="matrix" values="0.10 0.18 0.05 0 0.02  0.25 0.55 0.15 0 0.30  0.25 0.50 0.20 0 0.42  0 0 0 0.85 0"/><feGaussianBlur stdDeviation=".35"/></filter>
    </defs>
    <rect width="400" height="250" fill="#1A1220"/>
    ${back}
    <rect width="400" height="250" fill="url(#${id}-warm)"/>
    ${ledgeItems}
    ${heap.svg}
    ${heapItems}
    ${holo && room.look !== undefined ? hologram(room.look, 200, 196, 128, id) : ''}
    ${front}${sparks}${more}
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
