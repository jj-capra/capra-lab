/* Send It!'s contraptions drawn from behind (for the chase camera): wings across, about 184 wide, the
   pilot in the middle. Shared by Send It! (game.js) and IRL's Send It! flight (games/irl/scene.js). */
const INK = '#120E18';
export function outline(c, fill, lw = 3) { if (fill) { c.fillStyle = fill; c.fill(); } c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
export const REAR = {
  goat(c, t) {
    c.beginPath(); c.moveTo(-92, 4); c.quadraticCurveTo(0, -40, 92, 4); c.lineTo(86, 10); c.quadraticCurveTo(0, -26, -86, 10); c.closePath();
    c.fillStyle = '#FFD23F'; c.fill(); c.save(); c.clip(); c.fillStyle = '#FF3D8B'; for (let x = -88; x < 92; x += 26) c.fillRect(x, -44, 11, 60); c.restore(); outline(c, null);
    c.beginPath(); c.moveTo(0, -18); c.lineTo(-20, 30); c.moveTo(0, -18); c.lineTo(20, 30); c.moveTo(-24, 30); c.lineTo(24, 30); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    // the goat from behind: horns, ears, a fluffy rump, a tail, dangling hooves
    c.beginPath(); c.moveTo(-7, 6); c.quadraticCurveTo(-16, -4, -10, -12); c.moveTo(7, 6); c.quadraticCurveTo(16, -4, 10, -12); c.lineWidth = 4; c.strokeStyle = '#8A7FA0'; c.stroke();
    c.beginPath(); c.ellipse(-13, 9, 6, 3, -0.4, 0, Math.PI * 2); c.ellipse(13, 9, 6, 3, 0.4, 0, Math.PI * 2); outline(c, '#FFF8EC', 2.4);
    c.beginPath(); c.ellipse(0, 18, 15, 13, 0, 0, Math.PI * 2); outline(c, '#FFF8EC', 3);
    c.beginPath(); c.ellipse(0, 9, 3, 5, 0, 0, Math.PI * 2); outline(c, '#FFF8EC', 2);
    for (const lx of [-7, 7]) { c.beginPath(); c.moveTo(lx, 29); c.lineTo(lx + Math.sin(t * 8 + lx) * 2, 40); c.lineWidth = 3.4; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.arc(lx + Math.sin(t * 8 + lx) * 2, 41, 2.4, 0, Math.PI * 2); c.fillStyle = INK; c.fill(); }
  },
  tub(c, t) {
    c.beginPath(); c.moveTo(-92, 0); c.lineTo(-30, -8); c.lineTo(-30, 6); c.lineTo(-88, 10); c.closePath(); outline(c, '#C98A4B');
    c.beginPath(); c.moveTo(92, 0); c.lineTo(30, -8); c.lineTo(30, 6); c.lineTo(88, 10); c.closePath(); outline(c, '#C98A4B');
    c.beginPath(); c.moveTo(-36, -4); c.lineTo(36, -4); c.quadraticCurveTo(36, 26, 0, 26); c.quadraticCurveTo(-36, 26, -36, -4); c.closePath(); outline(c, '#F3F0FF');
    c.beginPath(); c.ellipse(0, -4, 36, 7, 0, 0, Math.PI * 2); outline(c, '#F3F0FF'); c.beginPath(); c.ellipse(0, -4, 29, 4.5, 0, 0, Math.PI * 2); c.fillStyle = '#C9C2D6'; c.fill();
    for (const fx of [-20, 20]) { c.beginPath(); c.ellipse(fx, 28, 5, 4, 0, 0, Math.PI * 2); outline(c, '#FFD23F', 2.2); }
    rearPilot(c, -6, -14, 9, '#E8322E');
    c.beginPath(); c.arc(16, -12, 6, 0, Math.PI * 2); outline(c, '#FFD23F', 2.2);
  },
  couch(c, t) {
    c.beginPath(); c.rect(-94, -44, 188, 8); outline(c, '#C98A4B');
    c.beginPath(); c.moveTo(-50, -36); c.lineTo(-40, -18); c.moveTo(50, -36); c.lineTo(40, -18); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    rearPilot(c, 0, -26, 9, '#29D3F0');
    c.beginPath(); c.rect(-44, -20, 88, 34); outline(c, '#C42828');
    c.beginPath(); c.moveTo(-15, -20); c.lineTo(-15, 14); c.moveTo(15, -20); c.lineTo(15, 14); c.lineWidth = 2; c.strokeStyle = 'rgba(18,14,24,0.5)'; c.stroke();
    for (const ax of [-54, 44]) { c.beginPath(); c.rect(ax, -6, 10, 22); outline(c, '#E8322E'); }
    for (const lx of [-38, 34]) { c.beginPath(); c.rect(lx, 14, 4, 6); outline(c, '#7A4A24', 2); }
  },
  taco(c, t) {
    rearPilot(c, 0, -6, 9, '#5BE38A');
    c.beginPath(); c.moveTo(-62, -22); c.quadraticCurveTo(-62, 28, 0, 28); c.quadraticCurveTo(62, 28, 62, -22); c.lineTo(50, -22); c.quadraticCurveTo(50, 14, 0, 15); c.quadraticCurveTo(-50, 14, -50, -22); c.closePath(); outline(c, '#FFB627');
    c.beginPath(); for (let i = 0; i <= 10; i++) c.lineTo(-56 + (i % 2 ? 4 : 0), -22 + i * 3.5); c.lineWidth = 4; c.strokeStyle = '#5BE38A'; c.stroke();
    c.beginPath(); for (let i = 0; i <= 10; i++) c.lineTo(56 - (i % 2 ? 4 : 0), -22 + i * 3.5); c.stroke();
    for (const [x, y] of [[-30, 18], [8, 21], [34, 14]]) { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fillStyle = 'rgba(120,70,10,0.5)'; c.fill(); }
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 60, -6); c.lineTo(sd * 92, -2); c.lineTo(sd * 60, 4); c.closePath(); outline(c, '#F4E3C1', 2.4); }
  },
  pizza(c, t) {
    c.beginPath(); c.rect(-90, -36, 180, 8); outline(c, '#F4E3C1');
    c.beginPath(); c.rect(-82, 2, 164, 8); outline(c, '#F4E3C1');
    for (const x of [-56, 56]) { c.beginPath(); c.moveTo(x, -28); c.lineTo(x, 2); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); }
    for (const [x, y] of [[-74, -32], [-30, -32], [30, -32], [74, -32], [-64, 6], [64, 6]]) { c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); outline(c, '#E8322E', 1.4); }
    c.beginPath(); c.rect(-2.5, -50, 5, 16); outline(c, '#C98A4B', 2.2);
    c.beginPath(); c.rect(-18, -22, 36, 26); outline(c, '#C98A4B');
    rearPilot(c, 0, -26, 8, '#FFD23F');
  },
  cart(c, t, s) {
    c.beginPath(); c.moveTo(-90, -32); c.lineTo(90, -32); c.lineTo(72, -22); c.lineTo(-72, -22); c.closePath(); outline(c, '#C98A4B');
    rearPilot(c, 0, -30, 9, '#FF3D8B');
    c.beginPath(); c.moveTo(-36, -18); c.lineTo(36, -18); c.lineTo(28, 16); c.lineTo(-28, 16); c.closePath(); outline(c, 'rgba(201,217,232,0.55)');
    c.lineWidth = 1.6; c.strokeStyle = INK;
    for (let x = -28; x <= 28; x += 8) { c.beginPath(); c.moveTo(x, -18); c.lineTo(x * 0.8, 16); c.stroke(); }
    for (let y = -10; y <= 10; y += 7) { c.beginPath(); c.moveTo(-34 + (y + 18) * 0.2, y); c.lineTo(34 - (y + 18) * 0.2, y); c.stroke(); }
    c.beginPath(); c.moveTo(-40, -22); c.lineTo(40, -22); c.lineWidth = 5; c.stroke();
    for (const wx of [-24, 24]) { c.beginPath(); c.ellipse(wx, 22, 6, 5, 0, 0, Math.PI * 2); outline(c, '#2A2140', 2.4); }
    for (const bx of [-14, 14]) { c.beginPath(); c.arc(bx, 2, 8, 0, Math.PI * 2); outline(c, '#FF8A3D', 2.4); c.beginPath(); c.arc(bx, 2, 4, 0, Math.PI * 2); c.fillStyle = INK; c.fill(); }
    if (s && s.boostT > 0) for (let i = 0; i < 7; i++) { const r = 8 + i * 6 + Math.sin(t * 40 + i) * 2; c.beginPath(); c.arc((i % 2 ? 14 : -14) + Math.sin(t * 30 + i) * 6, 6 + i * 7, r, 0, Math.PI * 2); c.fillStyle = `rgba(255,${200 - i * 16},90,${0.55 - i * 0.06})`; c.fill(); }
  },
};
function rearPilot(c, x, y, r, helmet) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); outline(c, helmet, 2.6);
  c.beginPath(); c.moveTo(x - r, y + 1); c.lineTo(x + r, y + 1); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(x, y - r); c.lineTo(x, y + 1); c.lineWidth = 2; c.strokeStyle = 'rgba(255,248,236,0.7)'; c.stroke();
}
export function drawRear(c, id, x, y, scale, roll, t, s) {
  c.save(); c.translate(x, y); c.rotate(roll); c.scale(scale, scale);
  c.lineJoin = 'round'; c.lineCap = 'round';
  (REAR[id] || REAR.goat)(c, t, s);
  c.restore();
}

