// Goat Getaway: the daily sliding-block puzzle (it was Mind Heist's Vault Jam until Nov 2026).
// Shared by the server (checks a solve by replaying it), the client (plays it) and
// dev/make-puzzles.mjs (makes them).
//
// A board is a 36-character string, row by row on a 6×6 pen:
//   '.' empty, 'A' the goat (always flat, on row 2, leaves through the gate on the
//   right), 'B'…'Z' hay bales, crates and tractors, 'x' a post that never moves.
// Every piece slides only along its own length. One slide, any distance, is one move.
// The goat is out when it reaches the gate (columns 4–5 of row 2).

export const N = 6;
export const EXIT_ROW = 2;

export function pieces(board) {
  const out = {};
  for (let i = 0; i < 36; i++) {
    const ch = board[i];
    if (!ch || ch === '.' || ch === 'x') continue;
    const r = (i / 6) | 0, c = i % 6;
    const p = out[ch];
    if (!p) out[ch] = { id: ch, r, c, len: 1, h: null };
    else { p.len += 1; if (p.h === null) p.h = r === p.r; }
  }
  return out;
}

export function isValid(board) {
  if (typeof board !== 'string' || !/^[.xA-Z]{36}$/.test(board)) return false;
  const ps = pieces(board);
  const a = ps.A;
  if (!a || !a.h || a.r !== EXIT_ROW || a.len !== 2) return false;
  for (const p of Object.values(ps)) {
    if (p.len < 2 || p.len > 3) return false;
    for (let k = 0; k < p.len; k++) {
      const i = p.h ? p.r * 6 + p.c + k : (p.r + k) * 6 + p.c;
      if (board[i] !== p.id) return false;
    }
  }
  return true;
}

export const solved = (board) => board[EXIT_ROW * 6 + 4] === 'A' && board[EXIT_ROW * 6 + 5] === 'A';

// Slide piece `id` by `d` cells (negative = left/up). Returns the new board, or null
// when something is in the way or the piece would leave the floor.
export function slide(board, id, d) {
  d |= 0;
  if (!d) return null;
  const p = pieces(board)[id];
  if (!p || p.len < 2) return null;
  const head = p.h ? p.c : p.r;
  const to = head + d;
  if (to < 0 || to + p.len > N) return null;
  const at = (k) => (p.h ? p.r * 6 + k : k * 6 + p.c);
  const step = d > 0 ? 1 : -1;
  for (let k = d > 0 ? head + p.len : head - 1; d > 0 ? k < to + p.len : k >= to; k += step) {
    if (board[at(k)] !== '.') return null;
  }
  const b = board.split('');
  for (let k = 0; k < p.len; k++) b[at(head + k)] = '.';
  for (let k = 0; k < p.len; k++) b[at(to + k)] = id;
  return b.join('');
}

// How far a piece can go each way: { min: -n, max: +n }.
export function reach(board, id) {
  const p = pieces(board)[id];
  if (!p) return { min: 0, max: 0 };
  const head = p.h ? p.c : p.r;
  const at = (k) => (p.h ? p.r * 6 + k : k * 6 + p.c);
  let min = 0, max = 0;
  for (let k = head - 1; k >= 0 && board[at(k)] === '.'; k--) min--;
  for (let k = head + p.len; k < N && board[at(k)] === '.'; k++) max++;
  return { min, max };
}

// Replay a list of moves ([id, d] pairs). Returns { ok, n, board, out }.
export function replay(board, moves, maxMoves = 500) {
  if (!Array.isArray(moves) || moves.length > maxMoves) return { ok: false, n: 0, board, out: false };
  let b = board, n = 0;
  for (const m of moves) {
    if (!Array.isArray(m) || typeof m[0] !== 'string' || !Number.isInteger(m[1])) return { ok: false, n, board: b, out: false };
    const nb = slide(b, m[0], m[1]);
    if (!nb) return { ok: false, n, board: b, out: false };
    b = nb; n += 1;
    if (solved(b)) return { ok: true, n, board: b, out: n === moves.length };
  }
  return { ok: true, n, board: b, out: false };
}

// Fewest moves to get the jewel out (breadth-first). Returns { par, path } or null.
export function solve(board, cap = 400000) {
  if (solved(board)) return { par: 0, path: [] };
  // Pieces never turn or change length, so work out their lines once.
  const ps = Object.values(pieces(board)).map(p => ({ id: p.id, len: p.len, h: p.h, line: p.h ? p.r : p.c }));
  const cell = (p, k) => (p.h ? p.line * 6 + k : k * 6 + p.line);
  const prev = new Map([[board, null]]);
  let frontier = [board];
  while (frontier.length) {
    const next = [];
    for (const b of frontier) {
      for (const p of ps) {
        const first = b.indexOf(p.id, p.h ? p.line * 6 : 0);
        const head = p.h ? first - p.line * 6 : (first - p.line) / 6;
        const moves = [];
        for (let k = head - 1; k >= 0 && b[cell(p, k)] === '.'; k--) moves.push(k - head);
        for (let k = head + p.len; k < N && b[cell(p, k)] === '.'; k++) moves.push(k - p.len + 1 - head);
        for (const d of moves) {
          const arr = b.split('');
          for (let k = 0; k < p.len; k++) arr[cell(p, head + k)] = '.';
          for (let k = 0; k < p.len; k++) arr[cell(p, head + d + k)] = p.id;
          const nb = arr.join('');
          const id = p.id;
          if (prev.has(nb)) continue;
          prev.set(nb, [b, id, d]);
          if (solved(nb)) {
            const path = [];
            for (let s = nb; prev.get(s); s = prev.get(s)[0]) path.unshift([prev.get(s)[1], prev.get(s)[2]]);
            return { par: path.length, path };
          }
          if (prev.size > cap) return null;
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  return null;
}
