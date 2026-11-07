// Goat Getaway's pieces, drawn in comic ink: the goat, hay bales, apple crates, tractors and posts.
// Each is drawn lying flat (2 or 3 cells wide, 1 tall); standing pieces are the same art turned.

const INK = '#120E18';
const PAPER = '#FFF8EC';

// The goat, side view, heading right for the gate (200 x 100).
const GOAT = `
  <rect x="6" y="8" width="188" height="84" rx="22" fill="#FFD23F" stroke="${INK}" stroke-width="5"/>
  <path d="M30 66 q-12 -6 -10 -20" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="82" cy="58" rx="52" ry="22" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>
  <path d="M52 76 v10 M70 78 v9 M98 78 v9 M116 76 v10" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="74" cy="56" rx="12" ry="7" fill="#E9D6B8"/>
  <path d="M126 50 q4 -18 22 -22" fill="none" stroke="${PAPER}" stroke-width="16" stroke-linecap="round"/>
  <path d="M126 50 q4 -18 22 -22" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 0"/>
  <path d="M138 30 q8 -14 26 -12 q16 2 18 18 q1 12 -9 16 l-14 4 q-16 2 -22 -12 z" fill="${PAPER}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M150 22 q-4 -14 -18 -16" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <path d="M160 20 q2 -14 -10 -18" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <path d="M142 34 q-14 2 -18 10 q10 2 18 -4" fill="${PAPER}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="166" cy="34" r="4.5" fill="${INK}"/>
  <circle cx="167.5" cy="32.5" r="1.4" fill="${PAPER}"/>
  <path d="M180 44 q-4 3 -9 1" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M168 54 q2 10 -2 16 q-6 -6 -6 -14" fill="${INK}"/>
  <path d="M132 56 q8 6 16 2" fill="none" stroke="#E4572E" stroke-width="6" stroke-linecap="round"/>`;

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
  if (id === 'A') return 'The goat. Slide it right, out the gate.';
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
