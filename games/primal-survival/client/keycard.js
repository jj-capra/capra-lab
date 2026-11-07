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
import { INK, PAPER, BONE, BLOOD, SKY, FLARE } from './palette.js';

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

/* ---------- the card itself ----------
 * Drawn as a printed card: flat inks, a halftone screen, a heavy keyline, and
 * the title's plates a hair out of register. Same vocabulary as the rest of
 * the game, so a card screenshotted into a group chat still reads as this.
 */


/* a dot screen, drawn by hand because canvas has no pattern primitive for it */
function halftone(c, x, y, w, h, color, step) {
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = color;
  for (let j = y; j < y + h; j += step) {
    for (let i = x; i < x + w; i += step) {
      c.beginPath(); c.arc(i, j, step * 0.26, 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}
/* a box with a hard offset shadow — the same device every panel in the UI uses */
function plate(c, x, y, w, h, fill, drop = 9) {
  c.fillStyle = INK; c.fillRect(x + drop, y + drop, w, h);
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  c.lineWidth = 6; c.strokeStyle = INK; c.strokeRect(x, y, w, h);
}
/* an animal, inked: fat keyline under a flat fill.
 * `fill` of null draws the keyline only — an empty slot waiting to be filled. */
function paintShape(c, d, cx, cy, scale, fill) {
  if (!d || typeof Path2D === 'undefined') return;
  c.save();
  c.translate(cx, cy); c.scale(scale, scale); c.translate(-60, -72);
  const p = new Path2D(d);
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (fill) {
    c.strokeStyle = INK; c.lineWidth = 9; c.stroke(p);
    c.fillStyle = fill; c.fill(p);
  } else {
    c.strokeStyle = 'rgba(17,6,11,.42)'; c.lineWidth = 5; c.stroke(p);
  }
  c.restore();
}
function paintCreature(c, name, cx, cy, scale, fill) {
  paintShape(c, SHAPES[SHAPE_OF[name] || 'cat'], cx, cy, scale, fill);
}
const anton = size => size + 'px Anton, Impact, "Arial Narrow", sans-serif';
const sans  = (size, w) => (w || 700) + ' ' + size + 'px ui-sans-serif, system-ui, sans-serif';

/* `squad` is optional — the five animals from their best run, if there is one */
export function drawKeyCard(canvas, { name, code, rank, stats, squad = [], site = '' }) {
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  const mid = W / 2;

  c.fillStyle = BLOOD; c.fillRect(0, 0, W, H);
  halftone(c, 0, 0, W, H, 'rgba(17,6,11,.26)', 11);

  /* Burst behind the title, faded out before it reaches the edges — rays that
   * run the full card flatten everything else on it. */
  const burstY = 250;
  c.save();
  c.translate(mid, burstY);
  for (let i = 0; i < 44; i++) {
    c.rotate((Math.PI * 2) / 44);
    c.fillStyle = i % 2 ? 'rgba(255,208,46,.17)' : 'transparent';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(1000, -78); c.lineTo(1000, 78); c.closePath(); c.fill();
  }
  c.restore();
  const fade = c.createRadialGradient(mid, burstY, 90, mid, burstY, 620);
  fade.addColorStop(0, 'rgba(224,42,42,0)');
  fade.addColorStop(1, BLOOD);
  c.fillStyle = fade; c.fillRect(0, 0, W, H);
  halftone(c, 0, 0, W, H, 'rgba(17,6,11,.14)', 11);

  c.lineWidth = 14; c.strokeStyle = INK;
  c.strokeRect(7, 7, W - 14, H - 14);

  c.textAlign = 'center';

  /* title, plates offset the way a cheap press would leave them */
  const titleY = 190;
  c.font = anton(96);
  c.fillStyle = SKY;   c.fillText('PRIMAL SURVIVAL', mid + 6, titleY);
  c.fillStyle = FLARE; c.fillText('PRIMAL SURVIVAL', mid - 6, titleY);
  c.fillStyle = INK;   c.fillText('PRIMAL SURVIVAL', mid, titleY + 7);
  c.fillStyle = BONE;  c.fillText('PRIMAL SURVIVAL', mid, titleY);

  /* caption box */
  const cw = 300, ch = 58;
  plate(c, mid - cw / 2, titleY + 28, cw, ch, FLARE, 7);
  c.fillStyle = INK; c.font = sans(23, 800);
  c.fillText('F I E L D   K E Y', mid, titleY + 28 + 38);

  /* The block is measured first and then centred, so a profile with no runs
   * yet gets a composed card rather than a title and a hole. */
  const hasSquad = squad.length > 0;
  const hasStats = !!(stats && stats.runs);
  let y = 486;
  if (hasSquad) {
    const scales = squad.map(a => 0.70 + 0.55 * Math.min(1, Math.log10(a.kg + 1) / 4.9));
    const gap = 18;
    const span = scales.reduce((n, s) => n + 118 * s, 0) + gap * (squad.length - 1);
    const k = Math.min(1, (W - 200) / span);
    let x = mid - (span * k) / 2;
    squad.forEach((a, i) => {
      const s = scales[i] * k, wide = 118 * s;
      paintCreature(c, a.name, x + wide / 2, y, s, BONE);
      x += wide + gap * k;
    });
    c.strokeStyle = INK; c.lineWidth = 7;
    c.beginPath(); c.moveTo(110, y + 4); c.lineTo(W - 110, y + 4); c.stroke();
    y += 96;
  } else {
    /* No runs yet. Rather than leave a red void, show the row as empty slots
     * so a new player can see what the card is going to become. */
    const ghosts = ['theropod', 'elephant', 'cat', 'raptorbird', 'shark'];
    const gap = 26, sc = 0.9;
    const span = ghosts.length * 118 * sc + gap * (ghosts.length - 1);
    let x = mid - span / 2;
    ghosts.forEach(k => {
      paintShape(c, SHAPES[k], x + (118 * sc) / 2, y, sc, null);
      x += 118 * sc + gap;
    });
    c.strokeStyle = 'rgba(17,6,11,.42)'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(110, y + 4); c.lineTo(W - 110, y + 4); c.stroke();
    c.fillStyle = 'rgba(17,6,11,.62)'; c.font = sans(24, 800);
    c.fillText('YOUR BEST FIVE WILL STAND HERE', mid, y + 48);
    y += 128;   /* the caption needs room under it before the name */
  }

  /* name */
  c.fillStyle = BONE; c.font = anton(104);
  c.fillText(String(name).toUpperCase(), mid, y + 54);
  c.fillStyle = INK; c.font = anton(40);
  c.fillText(String(rank || 'Drifter').toUpperCase(), mid, y + 108);

  /* the key, which is the point of the card */
  const bw = 700, bh = 196, bx = mid - bw / 2, by = y + 150;
  plate(c, bx, by, bw, bh, PAPER, 10);
  halftone(c, bx, by, bw, bh, 'rgba(17,6,11,.10)', 9);
  c.fillStyle = INK;
  c.font = sans(22, 800);
  c.fillText('Y O U R   K E Y', mid, by + 46);
  c.font = anton(112);
  c.fillText(String(code).split('').join(' '), mid, by + 155);

  /* career */
  if (hasStats) {
    const cells = [
      [stats.runs.toLocaleString(), 'RUNS'],
      [stats.bestDays.toLocaleString(), 'BEST RUN'],
      [stats.totalDays.toLocaleString(), 'DAYS SURVIVED']
    ];
    const tw = 288, th = 132, ty = by + bh + 44;
    cells.forEach(([v, l], i) => {
      const cx = mid + (i - 1) * (tw + 14);
      plate(c, cx - tw / 2, ty, tw, th, BONE, 7);
      c.fillStyle = INK; c.font = anton(62);
      c.fillText(v, cx, ty + 78);
      c.font = sans(18, 800);
      c.fillText(l, cx, ty + 110);
    });
  }

  c.fillStyle = INK;
  c.font = sans(25, 700);
  c.fillText('Drop this card on the sign-in screen to get back in.', mid, H - 118);
  c.font = sans(21, 600);
  c.fillText('Keep it. It is the only way back to this name.', mid, H - 86);

  if (site) {
    plate(c, mid - 230, H - 62, 460, 42, INK, 0);
    c.fillStyle = FLARE; c.font = sans(21, 800);
    c.fillText(site, mid, H - 32);
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
