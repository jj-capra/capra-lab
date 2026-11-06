/* The Capra Lab key card: a player's profile as a picture.
 *
 * There is no email and no password reset, so this picture is the backup. The
 * name and six-digit key are printed on it for a person to read (which is why a
 * screenshot still works), and also written into the PNG's own bytes as a tEXt
 * chunk, so choosing the picture on the sign-in screen signs you straight in.
 * The hidden copy does not survive re-encoding (a screenshot, an edit), which
 * is exactly why the printed one exists too.
 *
 * Adapted from Primal Survival's Field Key, which pioneered the trick.
 */

export const KEYWORD = 'capra-lab-key';
/* cards made by games before the lab owned profiles carry their own keyword */
const ALSO_ACCEPT = ['primal-survival-key'];

const W = 1080, H = 1350;
const INK = '#120E18', NIGHT = '#16141F', PAPER = '#FFF8EC';
const YELLOW = '#FFD23F', MAGENTA = '#FF3D8B', CYAN = '#29D3F0';
const DISPLAY = 'Bangers, Impact, "Arial Narrow Bold", sans-serif';
const BODY = 'Inter, system-ui, -apple-system, sans-serif';

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

/* Insert a tEXt chunk immediately before IEND. Walks the chunk chain rather
   than searching for the bytes "IEND", which can occur inside image data. */
export function embedInPng(pngBytes, keyword, text) {
  const data = new TextEncoder().encode(keyword + '\0' + text);
  const type = new TextEncoder().encode('tEXt');
  const body = new Uint8Array(type.length + data.length);
  body.set(type, 0); body.set(data, type.length);
  const chunk = new Uint8Array(4 + body.length + 4);
  chunk.set(u32(data.length), 0);
  chunk.set(body, 4);
  chunk.set(u32(crc32(body)), 4 + body.length);

  let pos = 8;
  while (pos < pngBytes.length) {
    const len = (pngBytes[pos] << 24 | pngBytes[pos + 1] << 16 | pngBytes[pos + 2] << 8 | pngBytes[pos + 3]) >>> 0;
    const kind = String.fromCharCode(pngBytes[pos + 4], pngBytes[pos + 5], pngBytes[pos + 6], pngBytes[pos + 7]);
    if (kind === 'IEND') break;
    pos += 12 + len;
  }
  const out = new Uint8Array(pngBytes.length + chunk.length);
  out.set(pngBytes.subarray(0, pos), 0);
  out.set(chunk, pos);
  out.set(pngBytes.subarray(pos), pos + chunk.length);
  return out;
}

/* Read a tEXt chunk back out by keyword, or null if this is just a picture. */
export function readFromPng(pngBytes, keyword = KEYWORD) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (pngBytes[i] !== sig[i]) return null;
  let pos = 8;
  while (pos + 12 <= pngBytes.length) {
    const len = (pngBytes[pos] << 24 | pngBytes[pos + 1] << 16 | pngBytes[pos + 2] << 8 | pngBytes[pos + 3]) >>> 0;
    const kind = String.fromCharCode(pngBytes[pos + 4], pngBytes[pos + 5], pngBytes[pos + 6], pngBytes[pos + 7]);
    if (kind === 'IEND') return null;
    if (kind === 'tEXt') {
      const data = pngBytes.subarray(pos + 8, pos + 8 + len);
      const nul = data.indexOf(0);
      if (nul > 0 && new TextDecoder().decode(data.subarray(0, nul)) === keyword) {
        return new TextDecoder().decode(data.subarray(nul + 1));
      }
    }
    pos += 12 + len;
  }
  return null;
}

/* ---------- drawing ---------- */
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* display type with the comic misprint the hub uses */
function misprint(c, text, x, y, size, fill) {
  c.font = '400 ' + size + 'px ' + DISPLAY;
  const off = Math.max(2, Math.round(size / 40));
  c.fillStyle = MAGENTA; c.fillText(text, x + off, y);
  c.fillStyle = CYAN; c.fillText(text, x - off, y);
  c.fillStyle = fill; c.fillText(text, x, y);
}

/* fit a name to the width, shrinking rather than clipping */
function fitFont(c, text, weight, family, start, min, maxW) {
  let size = start;
  do { c.font = weight + ' ' + size + 'px ' + family; size -= 2; }
  while (c.measureText(text).width > maxW && size > min);
}

let logoPromise = null;
function loadLogo(src) {
  if (!logoPromise) {
    logoPromise = new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  return logoPromise;
}

export async function drawKeyCard(canvas, { name, code, site = '' }, logoSrc = '/assets/capra-lab-logo.png') {
  try {
    await Promise.all([
      document.fonts.load('120px Bangers'),
      document.fonts.load('800 60px Inter'),
      document.fonts.load('600 30px Inter')
    ]);
  } catch { /* fall back to system faces */ }
  const logo = await loadLogo(logoSrc);

  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  const mid = W / 2;

  /* night ground with a halftone screen */
  c.fillStyle = NIGHT; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,248,236,0.06)';
  for (let y = 6; y < H; y += 18) for (let x = 6; x < W; x += 18) {
    c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill();
  }

  /* yellow comic frame */
  c.lineWidth = 10; c.strokeStyle = YELLOW;
  roundRect(c, 34, 34, W - 68, H - 68, 44); c.stroke();

  if (logo) c.drawImage(logo, mid - 230, 70, 460, 460);

  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  misprint(c, 'CAPRA LAB', mid, 640, 132, PAPER);
  c.fillStyle = YELLOW;
  c.font = '800 30px ' + BODY;
  c.fillText('P L A Y E R   K E Y', mid, 696);

  /* the name */
  c.fillStyle = PAPER;
  fitFont(c, name, '800', BODY, 72, 36, W - 200);
  c.fillText(name, mid, 800);

  /* the six digits on a paper panel, ink on cream, impossible to misread */
  const px = 130, py = 846, pw = W - 260, ph = 220;
  c.fillStyle = '#05030A'; roundRect(c, px + 12, py + 14, pw, ph, 28); c.fill();
  c.fillStyle = PAPER; roundRect(c, px, py, pw, ph, 28); c.fill();
  c.lineWidth = 6; c.strokeStyle = INK; roundRect(c, px, py, pw, ph, 28); c.stroke();
  const digits = String(code).split('');
  c.font = '400 176px ' + DISPLAY;
  c.fillStyle = INK;
  const step = 118, gap = 44;
  const total = step * 6 + gap;
  let x = mid - total / 2 + step / 2;
  digits.forEach((d, i) => {
    c.fillText(d, x, py + 172);
    x += step + (i === 2 ? gap : 0);
  });

  c.fillStyle = PAPER;
  c.font = '600 32px ' + BODY;
  c.fillText('Your name + this key sign you in to every Capra Lab game.', mid, 1136);
  c.fillStyle = YELLOW;
  c.font = '800 32px ' + BODY;
  c.fillText('No email. No reset. Keep this picture.', mid, 1186);

  if (site) {
    c.fillStyle = 'rgba(255,248,236,0.7)';
    c.font = '600 28px ' + BODY;
    c.fillText(site, mid, 1262);
  }
  return canvas;
}

/* Render the card and hand back a PNG with the key inside it. */
export async function keyCardBlob(canvas, profile) {
  await drawKeyCard(canvas, profile);
  const raw = await new Promise(res => canvas.toBlob(res, 'image/png'));
  const bytes = new Uint8Array(await raw.arrayBuffer());
  const payload = JSON.stringify({ v: 1, name: profile.name, code: String(profile.code) });
  return new Blob([embedInPng(bytes, KEYWORD, payload)], { type: 'image/png' });
}

/* Read a chosen picture. Returns {name, code} or null when the key is not inside
   (a screenshot, or not a key card at all). */
export async function readKeyCardFile(file) {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    for (const k of [KEYWORD, ...ALSO_ACCEPT]) {
      const text = readFromPng(bytes, k);
      if (!text) continue;
      const p = JSON.parse(text);
      if (p && p.name && p.code) return { name: String(p.name), code: String(p.code) };
    }
    return null;
  } catch { return null; }
}
