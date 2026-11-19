// Goat Getaway's pieces, drawn in comic ink: the goat, hay bales, apple crates, tractors and posts.
// Each is drawn lying flat (2 or 3 cells wide, 1 tall); standing pieces are the same art turned.

const INK = '#120E18';
const PAPER = '#FFF8EC';

// The goat seen from above, heading right for the gate (200 x 100). JC, Nov 18 2026: "an actual animated
// goat from aerial view that is moving slightly" instead of a block. Its parts are named groups the page
// animates (index.html): gg-head looks around, gg-earL/R flick, gg-tail wags, gg-body breathes, and when
// it walks out (.walk) the legs step in diagonal pairs (gg-legA, gg-legB).
const FUR = PAPER, SHADE = '#E9D6B8', PINK = '#F2B8A0', HORN = '#9C8564';
const LEG = (x, top) => {
  const y = top ? 11 : 71;
  return `<rect x="${x}" y="${y}" width="12" height="18" rx="6" fill="${FUR}" stroke="${INK}" stroke-width="4"/>
    <rect x="${x + 1}" y="${top ? y - 2 : y + 11}" width="10" height="9" rx="4" fill="${INK}"/>`;
};
const GOAT = `
  <g class="gg-legA">${LEG(108, true)}${LEG(44, false)}</g>
  <g class="gg-legB">${LEG(108, false)}${LEG(44, true)}</g>
  <g class="gg-tail"><path d="M37 50 q-10 -11 -22 -12 q5 12 0 24 q12 -1 22 -12 z" fill="${FUR}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M22 46 l7 3 M22 54 l7 -3" stroke="${SHADE}" stroke-width="3" stroke-linecap="round"/></g>
  <g class="gg-body">
    <ellipse cx="84" cy="50" rx="51" ry="29" fill="${FUR}" stroke="${INK}" stroke-width="5"/>
    <path d="M58 29 q20 -7 36 2 q-6 13 -24 13 q-15 -1 -12 -15 z" fill="#C9874A" stroke="${INK}" stroke-width="2.5"/>
    <path d="M92 63 q14 -5 24 2 q-5 9 -16 8 q-9 -2 -8 -10 z" fill="#C9874A" stroke="${INK}" stroke-width="2.5"/>
    <path d="M40 50 q46 -5 92 0" fill="none" stroke="${SHADE}" stroke-width="5" stroke-linecap="round"/>
    <path d="M46 37 l7 3 M66 67 l8 1 M112 37 l6 3 M44 62 l7 -2" stroke="${SHADE}" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g class="gg-head">
    <ellipse cx="136" cy="50" rx="15" ry="15.5" fill="${FUR}" stroke="${INK}" stroke-width="4"/>
    <path d="M136 33 q9 17 0 34" fill="none" stroke="#E4572E" stroke-width="8" stroke-linecap="round"/>
    <circle cx="134" cy="71" r="5" fill="#FFD23F" stroke="${INK}" stroke-width="2.5"/>
    <g class="gg-earL"><path d="M158 37 q-4 -22 -20 -30 q-2 18 10 32 z" fill="${FUR}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M154 34 q-3 -13 -11 -19 q-1 10 5 18 z" fill="${PINK}"/></g>
    <g class="gg-earR"><path d="M158 63 q-4 22 -20 30 q-2 -18 10 -32 z" fill="${FUR}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M154 66 q-3 13 -11 19 q-1 -10 5 -18 z" fill="${PINK}"/></g>
    <path d="M144 50 C144 33 156 28 170 30 C186 33 197 41 197 50 C197 59 186 67 170 70 C156 72 144 67 144 50 Z" fill="${FUR}" stroke="${INK}" stroke-width="5"/>
    <path d="M165 40 Q148 35 133 27 Q146 42 165 47 Z" fill="${HORN}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M165 60 Q148 65 133 73 Q146 58 165 53 Z" fill="${HORN}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M158 39.5 l-1.5 5 M151 37.5 l-2 4.5 M144 34.5 l-2 4 M158 60.5 l-1.5 -5 M151 62.5 l-2 -4.5 M144 65.5 l-2 -4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M168 46 q4 4 0 8" fill="none" stroke="${SHADE}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="188" cy="50" rx="7.5" ry="10" fill="${PINK}" stroke="${INK}" stroke-width="3"/>
    <path d="M190 46 h1.5 M190 54 h1.5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="174" cy="35" r="4.2" fill="${INK}"/><circle cx="175.4" cy="33.6" r="1.3" fill="${PAPER}"/>
    <circle cx="174" cy="65" r="4.2" fill="${INK}"/><circle cx="175.4" cy="63.6" r="1.3" fill="${PAPER}"/>
  </g>`;

// A hay bale from above (200 x 100): straw and two bands of twine.
const HAY = (fill, dark) => `
  <rect x="7" y="9" width="186" height="82" rx="12" fill="${fill}" stroke="${INK}" stroke-width="5"/>
  <path d="M22 26 l14 -4 M48 34 l16 2 M80 24 l12 4 M108 38 l14 -3 M150 26 l16 3 M30 62 l16 3 M62 72 l12 -4 M96 60 l16 2 M128 74 l12 -3 M160 62 l14 4 M172 44 l12 -2 M20 46 l10 2"
    stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
  <path d="M64 10 v80 M136 10 v80" stroke="#7A4E2D" stroke-width="6"/>
  <path d="M64 10 v80 M136 10 v80" stroke="${INK}" stroke-width="1.5" stroke-dasharray="4 6" opacity=".55"/>`;

// A wooden crate of apples (200 x 100).
const CRATE = `
  <rect x="7" y="9" width="186" height="82" rx="10" fill="#C9874A" stroke="${INK}" stroke-width="5"/>
  <path d="M12 36 h176 M12 64 h176" stroke="${INK}" stroke-width="3" opacity=".7"/>
  <path d="M16 14 l168 72" stroke="#9C5E2E" stroke-width="7"/>
  <g stroke="${INK}" stroke-width="3">
    <circle cx="44" cy="26" r="11" fill="#E4572E"/><circle cx="96" cy="74" r="11" fill="#E4572E"/>
    <circle cx="150" cy="30" r="11" fill="#3BB273"/><circle cx="168" cy="72" r="10" fill="#E4572E"/>
    <circle cx="36" cy="72" r="10" fill="#3BB273"/>
  </g>
  <path d="M44 15 v-4 M96 63 v-4 M150 19 v-4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;

// A tractor from above (300 x 100): big back wheels, small front ones, the seat and the hood.
const TRACTOR = (body) => `
  <rect x="34" y="4" width="64" height="24" rx="8" fill="${INK}"/>
  <rect x="34" y="72" width="64" height="24" rx="8" fill="${INK}"/>
  <path d="M42 8 v16 M54 8 v16 M66 8 v16 M78 8 v16 M90 8 v16 M42 76 v16 M54 76 v16 M66 76 v16 M78 76 v16 M90 76 v16" stroke="#3a3346" stroke-width="3"/>
  <rect x="228" y="12" width="40" height="16" rx="6" fill="${INK}"/>
  <rect x="228" y="72" width="40" height="16" rx="6" fill="${INK}"/>
  <rect x="16" y="24" width="264" height="52" rx="18" fill="${body}" stroke="${INK}" stroke-width="5"/>
  <rect x="120" y="32" width="146" height="36" rx="12" fill="rgba(255,255,255,.18)" stroke="${INK}" stroke-width="3"/>
  <path d="M248 36 v28 M258 38 v24" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="190" cy="40" r="6" fill="${INK}"/><circle cx="190" cy="40" r="2.5" fill="#777"/>
  <rect x="44" y="34" width="44" height="32" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
  <rect x="50" y="40" width="20" height="20" rx="6" fill="#2a2433"/>
  <path d="M24 34 v32" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;

// A fence post from above (100 x 100).
const POST = `
  <circle cx="50" cy="50" r="38" fill="#9C6B45" stroke="${INK}" stroke-width="5"/>
  <circle cx="50" cy="50" r="24" fill="none" stroke="#6E4528" stroke-width="3"/>
  <circle cx="50" cy="50" r="11" fill="none" stroke="#6E4528" stroke-width="3"/>
  <path d="M50 12 v12" stroke="#6E4528" stroke-width="3"/>`;

const TRACTOR_COLORS = ['#E4572E', '#3BB273', '#3A86FF', '#FF9F1C', '#C77DFF'];
const HAYS = [['#F2C14E', '#C8962E'], ['#EBCB72', '#B68C3A']];

// What a piece looks like: the goat, a hay bale or crate (2 long), a tractor (3 long).
export function pieceArt(id, len, flat) {
  const n = id.charCodeAt(0) - 66;
  let art, w;
  if (id === 'A') { art = GOAT; w = 200; }
  else if (len === 3) { art = TRACTOR(TRACTOR_COLORS[((n % 5) + 5) % 5]); w = 300; }
  else if (n % 3 === 2) { art = CRATE; w = 200; }
  else { const [f, d] = HAYS[((n % 2) + 2) % 2]; art = HAY(f, d); w = 200; }
  if (flat) return `<svg viewBox="0 0 ${w} 100" aria-hidden="true">${art}</svg>`;
  return `<svg viewBox="0 0 100 ${w}" aria-hidden="true"><g transform="translate(100 0) rotate(90)">${art}</g></svg>`;
}
export const postArt = () => `<svg viewBox="0 0 100 100" aria-hidden="true">${POST}</svg>`;

export function pieceName(id, len, flat) {
  if (id === 'A') return 'The goat. Clear its path and it walks out the gate.';
  const n = id.charCodeAt(0) - 66;
  const what = len === 3 ? 'tractor' : n % 3 === 2 ? 'apple crate' : 'hay bale';
  return `${flat ? 'Side-to-side' : 'Up-and-down'} ${what}`;
}

// A goat head for the title and the page's tab icon.
export const GOAT_HEAD = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M34 30 q-6 -20 -24 -22" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M66 30 q6 -20 24 -22" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M30 40 q-20 -4 -26 8 q14 6 26 0" fill="${PAPER}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M70 40 q20 -4 26 8 q-14 6 -26 0" fill="${PAPER}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M30 34 q20 -12 40 0 q6 24 -6 40 q-14 10 -28 0 q-12 -16 -6 -40z" fill="${PAPER}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="40" cy="46" r="5" fill="${INK}"/><circle cx="60" cy="46" r="5" fill="${INK}"/>
  <circle cx="41.5" cy="44.5" r="1.6" fill="${PAPER}"/><circle cx="61.5" cy="44.5" r="1.6" fill="${PAPER}"/>
  <ellipse cx="50" cy="66" rx="10" ry="7" fill="#F2B8A0" stroke="${INK}" stroke-width="4"/>
  <path d="M46 66 h1 M53 66 h1" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M44 82 q6 14 12 0" fill="${INK}"/>
</svg>`;

// A Blue Ribbon rosette (for the day's fastest getaway).
export const RIBBON = `<svg viewBox="0 0 80 104" aria-hidden="true">
  <path d="M24 52 L12 100 L26 92 L34 102 L40 58 Z" fill="#1F4FCC" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M56 52 L68 100 L54 92 L46 102 L40 58 Z" fill="#1F4FCC" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M40 4 l7 6 9 -2 3 9 9 3 -2 9 6 7 -6 7 2 9 -9 3 -3 9 -9 -2 -7 6 -7 -6 -9 2 -3 -9 -9 -3 2 -9 -6 -7 6 -7 -2 -9 9 -3 3 -9 9 2 z"
    fill="#2F6BFF" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="40" cy="40" r="17" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
  <path d="M40 28 l3.5 7.2 7.9 1.1 -5.7 5.6 1.4 7.9 -7.1 -3.8 -7.1 3.8 1.4 -7.9 -5.7 -5.6 7.9 -1.1 z" fill="#FFD23F" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
</svg>`;
