/* The break-in selfie (roadmap: "take a selfie capturing their trophy room and behind is the other users
   hologram. This should be epic for trolling and for sharing on social media or in text message").
   A 1080 × 1350 picture (the shape Instagram and texts show whole): the raider up front with what they
   took, the owner's hologram glowing behind them, the owner's trophy room around them, comic captions. */
import { drawAvatar } from '/lab/avatar.mjs';
import { trophySvg, seeded, troveDefs, coinHeap, chest, crown, chalice, mask, gem, pearls, sparkle } from './art.js';

const W = 1080, H = 1350, INK = '#120E18';
const FONT = 'Bangers, Impact, "Arial Narrow Bold", sans-serif';

// One drawing as a picture for the canvas. A piece that won't load comes back null and is left out, so
// one bad drawing can't spoil the whole selfie (Safari gives up on an SVG picture at its first XML slip).
function load(svg, w, h) {
  return new Promise((ok) => {
    const img = new Image();
    const done = (v) => { clearTimeout(t); ok(v); };
    const t = setTimeout(() => done(null), 6000);
    img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => done(img));
    img.onerror = () => done(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', `<svg width="${w}" height="${h}" `));
  });
}
// The room behind: the owner's treasure trove (stone, torches, trophies on the ledges, a heap of gold,
// chests, relics). No text: SVG pictures can't use the page's fonts, so every word is drawn on the canvas.
function roomSvg(trophies, seed = '') {
  const id = 'sv', rnd = seeded('selfie:' + seed);
  const slots = [[120, 360], [300, 360], [780, 360], [960, 360], [120, 640], [300, 640], [780, 640], [960, 640]];
  let ledges = '';
  for (const y of [360, 640]) for (const x0 of [30, 690]) {
    ledges += `<path d="M${x0 + 30} ${y + 22}l18 30h36l18-30M${x0 + 246} ${y + 22}l18 30h36l18-30" fill="#3A2C45" stroke="${INK}" stroke-width="5"/>`;
    ledges += `<rect x="${x0}" y="${y}" width="360" height="22" fill="#4A3A55" stroke="${INK}" stroke-width="6"/><rect x="${x0 + 3}" y="${y + 3}" width="354" height="7" fill="#E09A1C"/>`;
  }
  let items = '';
  trophies.slice(0, slots.length).forEach((t, i) => {
    const [x, y] = slots[i], w = 140;
    items += trophySvg(t.kind, { stolen: !!t.from }).replace('<svg ', `<svg x="${x - w / 2}" y="${y - w * 1.2 + 6}" width="${w}" height="${w * 1.2}" `);
  });
  // empty ledge spots hold relics
  const relic = [(x, y) => chalice(id, x, y, 2.7), (x, y) => crown(id, x, y, 2.6), (x, y) => mask(id, x, y - 56, 2.6), (x, y) => gem(x - 24, y - 16, 3, '#5BE38A') + gem(x + 20, y - 14, 3.2, '#3D7BFF') + gem(x, y - 40, 3, '#FF3D5A')];
  for (let i = trophies.length; i < slots.length; i++) items += relic[i % 4](slots[i][0], slots[i][1]);
  const heap = coinHeap(id, { x0: -30, x1: 1110, side: 1130, peak: 960, bottom: 1370, coins: 150, r: 16, rnd });
  let front = chest(id, 975, 1160, 2.2, 'gold', null, rnd) + crown(id, 870, 1060, 2.2, 12) + chalice(id, 1010, 1010, 2, -8);
  front += gem(700, 1040, 3, '#FF3D5A', -12) + gem(90, 1050, 3, '#B79CFF', 10) + pearls(820, 1120, 930, 1150, 18, 9, 6);
  let sparks = '';
  [[200, 230], [880, 520], [60, 760], [1010, 780], [470, 900], [640, 980], [150, 980], [560, 360]].forEach(([x, y], k) => { sparks += sparkle(x, y, 14 + (k % 3) * 5, k); });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <defs>${troveDefs(id)}
    <radialGradient id="g" cx=".55" cy=".42" r=".55"><stop offset="0" stop-color="#29D3F0" stop-opacity=".26"/><stop offset="1" stop-color="#29D3F0" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="#1A1220"/>
    ${stoneWallBig(rnd)}
    <rect width="${W}" height="${H}" fill="url(#${id}-warm)"/>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    ${ledges}${items}
    ${heap.svg}${front}${sparks}
  </svg>`;
}
function stoneWallBig(rnd) {
  const tones = ['#2E2233', '#2A1F30', '#35283C', '#30233A'];
  let out = '';
  for (let y = 0, row = 0; y < 1000; y += 66, row++) for (let x = row % 2 ? -70 : 0; x < W; x += 140) out += `<rect x="${x + 3}" y="${y + 3}" width="134" height="60" rx="7" fill="${tones[Math.floor(rnd() * 4)]}" stroke="#160E1B" stroke-width="6"/>`;
  return out;
}
// The hologram: the owner in cyan light with scan lines, drawn on its own canvas first.
function hologram(img, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, size, size);
  g.globalCompositeOperation = 'source-atop';
  const grad = g.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(140, 245, 255, 0.78)'); grad.addColorStop(1, 'rgba(41, 160, 240, 0.7)');
  g.fillStyle = grad; g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = 'rgba(0, 0, 0, 0.42)';
  for (let y = 0; y < size; y += 9) g.fillRect(0, y, size, 3);
  g.fillStyle = 'rgba(0, 0, 0, 0.6)';
  g.fillRect(0, size * 0.62, size, 10);
  return c;
}
function fit(g, text, max, size) {
  let s = size;
  g.font = `${s}px ${FONT}`;
  while (s > 20 && g.measureText(text).width > max) { s -= 2; g.font = `${s}px ${FONT}`; }
  return s;
}
function box(g, x, y, w, h, fill, tilt = 0) {
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(tilt);
  g.fillStyle = '#05030A'; g.fillRect(-w / 2 + 12, -h / 2 + 14, w, h);
  g.fillStyle = fill; g.fillRect(-w / 2, -h / 2, w, h);
  g.lineWidth = 8; g.strokeStyle = INK; g.strokeRect(-w / 2, -h / 2, w, h);
  g.restore();
}
function burst(g, cx, cy, r, fill, n = 14) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.62 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
}

export async function makeSelfie({ owner, ownerLook, raider, raiderLook, took, trophies = [] }) {
  try { await document.fonts.load(`80px Bangers`); } catch { /* the fallback font will do */ }
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const [bg, holoImg, meImg, prize] = await Promise.all([
    load(roomSvg(trophies, owner), W, H),
    load(drawAvatar(ownerLook, { plain: true }), 900, 900),
    load(drawAvatar(raiderLook, { plain: true }), 1000, 1000),
    took && took.pick === 'trophy' ? load(trophySvg(took.kind, { stolen: true }), 300, 360) : Promise.resolve(null),
  ]);
  if (bg) g.drawImage(bg, 0, 0, W, H);
  else { g.fillStyle = '#1B1528'; g.fillRect(0, 0, W, H); }

  // the owner's hologram, big and behind
  const hx = 360, hy = 130, hs = 760;
  g.save();
  const cone = g.createLinearGradient(0, hy + hs, 0, hy);
  cone.addColorStop(0, 'rgba(140, 245, 255, 0.5)'); cone.addColorStop(1, 'rgba(41, 211, 240, 0)');
  g.fillStyle = cone;
  g.beginPath(); g.moveTo(hx + hs * 0.36, hy + hs + 30); g.lineTo(hx + hs * 0.64, hy + hs + 30); g.lineTo(hx + hs * 0.98, hy + 20); g.lineTo(hx + hs * 0.02, hy + 20); g.closePath(); g.fill();
  g.shadowColor = 'rgba(41, 211, 240, 0.95)'; g.shadowBlur = 46;
  g.globalAlpha = 0.9;
  if (holoImg) g.drawImage(hologram(holoImg, 900), hx, hy, hs, hs);
  g.restore();
  g.save();
  g.fillStyle = '#0B4E5C'; g.strokeStyle = INK; g.lineWidth = 7;
  g.beginPath(); g.ellipse(hx + hs / 2, hy + hs + 34, 210, 40, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#8CF5FF'; g.beginPath(); g.ellipse(hx + hs / 2, hy + hs + 28, 150, 24, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  // the raider up front, with the prize held up beside them
  g.save();
  g.shadowColor = 'rgba(5, 3, 10, 0.7)'; g.shadowBlur = 0; g.shadowOffsetX = 18; g.shadowOffsetY = 20;
  if (meImg) g.drawImage(meImg, -110, 470, 940, 940);
  g.restore();
  if (prize) {
    burst(g, 820, 930, 230, '#FFD23F', 16);
    g.save(); g.translate(820, 930); g.rotate(0.1);
    g.shadowColor = '#05030A'; g.shadowOffsetX = 12; g.shadowOffsetY = 14;
    g.drawImage(prize, -150, -190, 300, 360);
    g.restore();
  } else if (took && took.pick === 'loot') {
    burst(g, 830, 960, 220, '#FFD23F', 16);
    g.save(); g.translate(830, 960);
    g.fillStyle = '#C08A2E'; g.strokeStyle = INK; g.lineWidth = 8;
    g.beginPath(); g.moveTo(-110, 120); g.quadraticCurveTo(-150, -10, -50, -70); g.lineTo(50, -70); g.quadraticCurveTo(150, -10, 110, 120); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-60, -70); g.lineTo(-30, -110); g.lineTo(30, -110); g.lineTo(60, -70); g.fillStyle = '#A9741F'; g.fill(); g.stroke();
    g.font = `110px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#FFE27A'; g.lineWidth = 6; g.strokeText('$', 0, 70); g.fillText('$', 0, 70);
    g.restore();
  }

  // captions
  g.save();
  box(g, 40, 40, 640, 190, '#FFD23F', -0.03);
  g.translate(360, 135); g.rotate(-0.03);
  g.fillStyle = INK; g.textAlign = 'center';
  g.font = `56px ${FONT}`; g.fillText('I BROKE INTO', 0, -18);
  const line = `${owner.toUpperCase()}’S TROPHY ROOM`;
  const s = fit(g, line, 580, 64);
  g.font = `${s}px ${FONT}`; g.fillText(line, 0, 52);
  g.restore();

  burst(g, 920, 140, 120, '#FF3D3D', 12);
  g.save(); g.translate(920, 150); g.rotate(0.12);
  g.font = `64px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.lineWidth = 7; g.strokeStyle = INK;
  g.strokeText('HEIST!', 0, 0); g.fillText('HEIST!', 0, 0);
  g.restore();

  box(g, 40, 1180, 1000, 130, '#FFF8EC', 0.012);
  g.save(); g.translate(540, 1245); g.rotate(0.012); g.textAlign = 'center'; g.fillStyle = INK;
  const what = took ? `TOOK: ${String(took.name || '').toUpperCase()}` : 'IN AND OUT';
  const s2 = fit(g, what, 920, 52);
  g.font = `${s2}px ${FONT}`; g.fillText(what, 0, -4);
  g.font = '700 28px Inter, system-ui, sans-serif'; g.fillStyle = '#5B4370';
  g.fillText(`${raider} · capra-lab.netlify.app/trophy-room`, 0, 40);
  g.restore();

  // halftone and the ink frame
  g.save(); g.globalAlpha = 0.07; g.fillStyle = '#fff';
  for (let y = 6; y < H; y += 14) for (let x = (y / 14) % 2 ? 13 : 6; x < W; x += 14) { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); }
  g.restore();
  g.lineWidth = 24; g.strokeStyle = INK; g.strokeRect(12, 12, W - 24, H - 24);

  // The picture as a file to share and save; if the phone won't hand it over, the canvas itself is shown.
  let blob = null;
  try { blob = await new Promise((ok) => { const t = setTimeout(() => ok(null), 8000); c.toBlob((b) => { clearTimeout(t); ok(b); }, 'image/png'); }); } catch { blob = null; }
  let url = blob ? URL.createObjectURL(blob) : null;
  if (!url) { try { url = c.toDataURL('image/png'); } catch { url = null; } }
  return { blob, url, canvas: c, missing: [bg, holoImg, meImg].filter((x) => !x).length };
}
