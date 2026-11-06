/* The Field Key — a profile as a picture.
 *
 * A six-digit code is easy to lose and there is no email to recover it with, so
 * the card is the backup: the code is printed on it for a human, and written
 * into the PNG's own bytes for the machine. Drop the card on the sign-in screen
 * and it signs you in. It is a photo in a camera roll that happens to be a key.
 *
 * The trick is a tEXt chunk. PNG is a chain of length-type-data-CRC chunks, and
 * decoders ignore chunk types they do not know, so an extra one rides along
 * untouched through saving, sending and re-downloading. It does NOT survive
 * re-encoding — a screenshot of the card, or anything that re-compresses it, is
 * just a picture. The printed code covers that case, which is why both exist.
 */
import { SHAPES, SHAPE_OF } from './shapes.js';

const W = 1080, H = 1350;
const KEYWORD = 'primal-survival-key';

/* ---------- PNG chunk surgery ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
const u32 = n => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

/* Insert a tEXt chunk immediately before IEND. */
export function embedInPng(pngBytes, keyword, text) {
  const data = new TextEncoder().encode(keyword + '\0' + text);
  const type = new TextEncoder().encode('tEXt');
  const body = new Uint8Array(type.length + data.length);
  body.set(type, 0); body.set(data, type.length);

  const chunk = new Uint8Array(4 + body.length + 4);
  chunk.set(u32(data.length), 0);
  chunk.set(body, 4);
  chunk.set(u32(crc32(body)), 4 + body.length);

  /* walk the chunk chain rather than searching for bytes — "IEND" can occur
     inside compressed image data by chance, and splicing there corrupts the file */
  let pos = 8;  /* past the PNG signature */
  while (pos < pngBytes.length) {
    const len = (pngBytes[pos] << 24 | pngBytes[pos+1] << 16 | pngBytes[pos+2] << 8 | pngBytes[pos+3]) >>> 0;
    const kind = String.fromCharCode(pngBytes[pos+4], pngBytes[pos+5], pngBytes[pos+6], pngBytes[pos+7]);
    if (kind === 'IEND') break;
    pos += 12 + len;
  }
  const out = new Uint8Array(pngBytes.length + chunk.length);
  out.set(pngBytes.subarray(0, pos), 0);
  out.set(chunk, pos);
  out.set(pngBytes.subarray(pos), pos + chunk.length);
  return out;
}

/* Read our tEXt chunk back out, or null if this is just a picture. */
export function readFromPng(pngBytes, keyword = KEYWORD) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (pngBytes[i] !== sig[i]) return null;
  let pos = 8;
  while (pos + 12 <= pngBytes.length) {
    const len = (pngBytes[pos] << 24 | pngBytes[pos+1] << 16 | pngBytes[pos+2] << 8 | pngBytes[pos+3]) >>> 0;
    const kind = String.fromCharCode(pngBytes[pos+4], pngBytes[pos+5], pngBytes[pos+6], pngBytes[pos+7]);
    if (kind === 'IEND') return null;
    if (kind === 'tEXt') {
      const data = pngBytes.subarray(pos + 8, pos + 8 + len);
      const nul = data.indexOf(0);
      if (nul > 0) {
        const k = new TextDecoder().decode(data.subarray(0, nul));
        if (k === keyword) return new TextDecoder().decode(data.subarray(nul + 1));
      }
    }
    pos += 12 + len;
  }
  return null;
}

/* ---------- the card itself ---------- */
const BARK = '#0F1512', MOSS = '#22302A';
const BRASS = '#C6A664', BRASS_D = '#8A7038', BONE = '#E8E3D3', ASH = '#8A978C';

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
/* an animal silhouette, drawn from the same path data the badges use */
function creature(c, name, cx, cy, scale, color) {
  const d = SHAPES[SHAPE_OF[name] || 'cat'];
  if (!d || typeof Path2D === 'undefined') return;
  c.save();
  c.translate(cx, cy);
  c.scale(scale, scale);
  c.translate(-60, -72);
  c.fillStyle = color; c.strokeStyle = color; c.lineWidth = 2.2;
  c.lineJoin = 'round'; c.lineCap = 'round';
  const p = new Path2D(d);
  c.fill(p); c.stroke(p);
  c.restore();
}

/* `squad` is optional — the five animals from their best run, if there is one */
export function drawKeyCard(canvas, { name, code, rank, stats, squad = [], site = '' }) {
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');

  c.fillStyle = BARK; c.fillRect(0, 0, W, H);

  /* card plate */
  const M = 56;
  const grad = c.createLinearGradient(0, M, 0, H - M);
  grad.addColorStop(0, MOSS); grad.addColorStop(1, '#16201B');
  c.fillStyle = grad;
  roundRect(c, M, M, W - M * 2, H - M * 2, 18); c.fill();
  c.strokeStyle = BRASS; c.lineWidth = 7;
  roundRect(c, M, M, W - M * 2, H - M * 2, 18); c.stroke();
  c.strokeStyle = BRASS_D; c.lineWidth = 2;
  roundRect(c, M + 18, M + 18, W - (M + 18) * 2, H - (M + 18) * 2, 10); c.stroke();

  /* rivets */
  c.fillStyle = BRASS_D;
  [[M + 40, M + 40], [W - M - 40, M + 40], [M + 40, H - M - 40], [W - M - 40, H - M - 40]]
    .forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill(); });

  const mid = W / 2;
  c.textAlign = 'center';

  c.fillStyle = BRASS;
  c.font = '700 60px Georgia, "Times New Roman", serif';
  c.fillText('PRIMAL SURVIVAL', mid, 196);

  c.fillStyle = ASH;
  c.font = '400 23px system-ui, sans-serif';
  c.fillText('F I E L D   K E Y', mid, 238);

  c.strokeStyle = BRASS_D; c.lineWidth = 2;
  c.beginPath(); c.moveTo(M + 70, 268); c.lineTo(W - M - 70, 268); c.stroke();

  /* the five from their best run, standing on a line */
  if (squad.length) {
    const scales = squad.map(a => 0.62 + 0.55 * Math.min(1, Math.log10(a.kg + 1) / 4.9));
    const gap = 16;
    let span = scales.reduce((n, s) => n + 118 * s, 0) + gap * (squad.length - 1);
    const k = Math.min(1, (W - 260) / span);
    let x = mid - (span * k) / 2;
    squad.forEach((a, i) => {
      const s = scales[i] * k, wide = 118 * s;
      creature(c, a.name, x + wide / 2, 420, s, BONE);
      x += wide + gap * k;
    });
    c.strokeStyle = BRASS_D; c.lineWidth = 2;
    c.beginPath(); c.moveTo(M + 90, 424); c.lineTo(W - M - 90, 424); c.stroke();
  }

  c.fillStyle = BONE;
  c.font = '600 72px Georgia, serif';
  c.fillText(name, mid, 540);

  c.fillStyle = BRASS;
  c.font = 'italic 34px Georgia, serif';
  c.fillText(rank || 'Drifter', mid, 592);

  /* the code, which is the point of the card */
  const bw = 620, bh = 190, bx = mid - bw / 2, by = 648;
  c.fillStyle = '#121A16';
  roundRect(c, bx, by, bw, bh, 12); c.fill();
  c.strokeStyle = BRASS; c.lineWidth = 3;
  roundRect(c, bx, by, bw, bh, 12); c.stroke();

  c.fillStyle = ASH;
  c.font = '400 20px system-ui, sans-serif';
  c.fillText('Y O U R   K E Y', mid, by + 44);
  c.fillStyle = BONE;
  c.font = '700 96px "SF Mono", ui-monospace, Consolas, monospace';
  c.fillText(String(code).split('').join(' '), mid, by + 142);

  /* career, if there is one */
  if (stats && stats.runs) {
    const cells = [
      [stats.runs.toLocaleString(), 'RUNS'],
      [stats.bestDays.toLocaleString(), 'BEST RUN'],
      [stats.totalDays.toLocaleString(), 'DAYS SURVIVED']
    ];
    const cw = 268, cy2 = 900;
    cells.forEach(([v, l], i) => {
      const cx = mid + (i - 1) * (cw + 16);
      c.fillStyle = '#121A16';
      roundRect(c, cx - cw / 2, cy2, cw, 132, 10); c.fill();
      c.strokeStyle = BRASS_D; c.lineWidth = 1.5;
      roundRect(c, cx - cw / 2, cy2, cw, 132, 10); c.stroke();
      c.fillStyle = BONE;
      c.font = '700 54px Georgia, serif';
      c.fillText(v, cx, cy2 + 72);
      c.fillStyle = ASH;
      c.font = '400 17px system-ui, sans-serif';
      c.fillText(l, cx, cy2 + 104);
    });
  }

  c.fillStyle = ASH;
  c.font = '400 25px system-ui, sans-serif';
  c.fillText('Drop this card on the sign-in screen to get back in.', mid, 1136);
  c.font = '400 21px system-ui, sans-serif';
  c.fillText('Keep it. It is the only way back to this name.', mid, 1172);

  if (site) {
    c.fillStyle = BRASS;
    c.font = '400 24px system-ui, sans-serif';
    c.fillText(site, mid, 1238);
  }
  return canvas;
}

/* Render the card and hand back a PNG with the credentials inside it. */
export async function keyCardBlob(canvas, profile) {
  drawKeyCard(canvas, profile);
  const raw = await new Promise(res => canvas.toBlob(res, 'image/png'));
  const bytes = new Uint8Array(await raw.arrayBuffer());
  const payload = JSON.stringify({ v: 1, name: profile.name, code: String(profile.code) });
  return new Blob([embedInPng(bytes, KEYWORD, payload)], { type: 'image/png' });
}

/* Read a dropped file. Returns {name, code} or null. */
export async function readKeyCardFile(file) {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    /* a Capra Lab key card works here too */
    const text = readFromPng(bytes) || readFromPng(bytes, 'capra-lab-key');
    if (!text) return null;
    const p = JSON.parse(text);
    return p && p.name && p.code ? { name: p.name, code: String(p.code) } : null;
  } catch { return null; }
}
