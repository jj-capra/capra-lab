/* The arena (Free Throws): an NBA-style arena from the free-throw line. Glossy hardwood, the painted key, the glass
   backboard with its square, the orange rim and a net that snaps on a swish, the stanchion, the shot clock; the
   stands packed behind the basket, banners in the rafters, a jumbotron, an LED ribbon round the bowl. The ball is
   the game's shot (hoopBall in scene.js: in the air, through, off the rim, short), on fire after three in a row.
   A make brings the crowd up, a streak sets the jumbotron alight. Sport coordinates are three's (x, y, -z). */
import { THREE, rng, shaderMat, patchStandard, bursts, glow, merge, mat, propMat, noiseLoop, rumble, crowd, stands, canvasTex, bulbs } from './core.js';
import { hoopBall } from '../scene.js';

const HOOP = { x: 0, y: 3.05, z: 4.19, r: 0.23, board: 4.57 };

export default function buildHoops(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2('#120e24', 0.012);
  scene.fog = fog;
  scene.background = new THREE.Color('#0a0816');

  const hemi = new THREE.HemisphereLight('#c8c0ff', '#3a2a20', 0.9);
  const key = new THREE.DirectionalLight('#fff6e8', 2.6); key.position.set(3, 12, 2);
  const spot = new THREE.PointLight('#fff2dc', 14, 14, 1.4); spot.position.set(0, 7, -3);
  scene.add(hemi, key, spot);

  // the floor: maple planks, the key painted, the lines; glossy, with the lights shining in it
  const floorMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.22 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      float ln(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.02, abs(d)); }`,
    diffuse: /* glsl */ `{
      vec2 p = vec2(vWP.x, -vWP.z);
      float pi = floor(p.x / 0.08), pz = floor((p.y + h21(vec2(pi, 1.0)) * 3.0) / 2.6);
      vec3 w = mix(S(0.82, 0.6, 0.36), S(0.9, 0.7, 0.44), h21(vec2(pi, pz))) * (0.92 + 0.12 * vnoise(vec2(p.x * 30.0, p.y * 3.0)));
      float key_ = step(abs(p.x), 2.45) * step(0.0, p.y) * step(p.y, 5.8);
      w = mix(w, mix(S(0.85, 0.15, 0.45), S(0.92, 0.22, 0.5), vnoise(p * 2.0)), key_ * 0.92);
      float lines = max(ln(abs(p.x) - 2.45, 0.06) * step(0.0, p.y) * step(p.y, 5.8), ln(p.y, 0.06) * step(abs(p.x), 2.45));
      lines = max(lines, ln(length(p) - 1.8, 0.06));
      lines = max(lines, ln(p.y - 5.8, 0.08) * step(abs(p.x), 8.0));
      lines = max(lines, ln(length(p - vec2(0.0, 4.19)) - 6.75, 0.06) * step(p.y, 5.8));
      w = mix(w, S(0.96, 0.95, 0.92), lines);
      // the lights' glints on the polish
      diffuseColor.rgb = w;
    }`,
    post: /* glsl */ `{
      vec3 V = normalize(vWP - cameraPosition), R = reflect(V, vec3(0.0, 1.0, 0.0));
      float glints = 0.0;
      for (int i = 0; i < 5; i++) { vec3 L = vec3(-6.0 + float(i) * 3.0, 9.0, -2.0 - float(i) * 1.5); vec3 d = normalize(L - vWP); glints += pow(max(dot(R, d), 0.0), 600.0); }
      outgoingLight += vec3(1.0, 0.95, 0.85) * glints * 1.6;
      outgoingLight = mix(outgoingLight, vec3(0.08, 0.06, 0.12), 0.12 * pow(1.0 - max(dot(-V, vec3(0.0, 1.0, 0.0)), 0.0), 3.0));
    }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = -5; scene.add(floor);

  /* ---- the basket: stanchion, board, square, rim, shot clock ---- */
  const props = propMat(U, { rough: 0.45, emitK: 2.6 });
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s);
  const basket = [
    { geo: B(1.2, 1.0, 1.6), color: '#1d2a6a', matrix: mat(0, 0.5, -7.2) },
    { geo: C(0.12, 0.14, 3.1), color: '#2b3a8a', matrix: mat(0, 2.0, -7.0, -0.18) },
    { geo: B(0.14, 0.14, 2.4), color: '#2b3a8a', matrix: mat(0, 3.4, -5.8) },
    { geo: B(1.85, 0.05, 0.05), color: '#f4f4f4', matrix: mat(0, 3.95, -HOOP.board) },
    { geo: B(1.85, 0.05, 0.05), color: '#f4f4f4', matrix: mat(0, 2.9, -HOOP.board) },
    { geo: B(0.05, 1.1, 0.05), color: '#f4f4f4', matrix: mat(-0.915, 3.42, -HOOP.board) },
    { geo: B(0.05, 1.1, 0.05), color: '#f4f4f4', matrix: mat(0.915, 3.42, -HOOP.board) },
    { geo: B(0.6, 0.04, 0.03), color: '#e8322e', matrix: mat(0, 3.5, -HOOP.board + 0.02) }, { geo: B(0.6, 0.04, 0.03), color: '#e8322e', matrix: mat(0, 3.05, -HOOP.board + 0.02) },
    { geo: B(0.04, 0.45, 0.03), color: '#e8322e', matrix: mat(-0.3, 3.27, -HOOP.board + 0.02) }, { geo: B(0.04, 0.45, 0.03), color: '#e8322e', matrix: mat(0.3, 3.27, -HOOP.board + 0.02) },
    { geo: new THREE.TorusGeometry(HOOP.r, 0.018, 8, 32), color: '#ff6a1a', matrix: mat(0, HOOP.y, -HOOP.z, Math.PI / 2) },
    { geo: B(0.2, 0.05, 0.18), color: '#ff6a1a', matrix: mat(0, HOOP.y, -HOOP.z - 0.25) },
    { geo: B(0.6, 0.35, 0.3), color: '#15151c', matrix: mat(0, 4.15, -HOOP.board - 0.05) },
    { geo: B(0.45, 0.22, 0.02), color: '#ff2a1a', matrix: mat(0, 4.15, -HOOP.board + 0.11), emit: 1.6 },
  ];
  scene.add(new THREE.Mesh(merge(basket), props));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.83, 1.07), new THREE.MeshStandardMaterial({ color: '#dfefff', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, depthWrite: false }));
  glass.position.set(0, 3.42, -HOOP.board); glass.renderOrder = 6; scene.add(glass);
  // the net: strings from the rim down to a narrower ring, pulled tight by a swish
  const NN = 16, netGeo = new THREE.BufferGeometry(); netGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NN * 4 * 2 * 3 * 2), 3));
  const net = new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: '#f4f4f4' })); scene.add(net);
  function netShape(swish, wob) {
    const a = netGeo.attributes.position.array; let o = 0;
    const pt = (i, k) => { const ang = (i / NN) * Math.PI * 2, rad = HOOP.r * (1 - k * 0.11) - swish * k * 0.03, y = HOOP.y - k * 0.11 - swish * k * 0.03; return [Math.cos(ang) * rad + wob * k * 0.01, y, -HOOP.z + Math.sin(ang) * rad]; };
    for (let i = 0; i < NN; i++) for (let k = 0; k < 4; k++) { const p0 = pt(i, k); a.set(p0, o); a.set(pt(i + 0.5, k + 1), o + 3); a.set(p0, o + 6); a.set(pt(i - 0.5, k + 1), o + 9); o += 12; }
    netGeo.attributes.position.needsUpdate = true;
  }
  netShape(0, 0);

  /* ---- the arena: stands, banners, the jumbotron, the LED ribbon ---- */
  const bowl = [];
  for (let k = 0; k < 22; k++) bowl.push({ geo: B(40, 0.5, 0.9), color: k % 2 ? '#2a2246' : '#33295a', matrix: mat(0, 0.8 + k * 0.5, -(10 + k * 0.9)) });
  for (const sx of [-1, 1]) for (let k = 0; k < 16; k++) bowl.push({ geo: B(0.9, 0.5, 24), color: k % 2 ? '#2a2246' : '#33295a', matrix: mat(sx * (9 + k * 0.9), 0.8 + k * 0.5, -4) });
  bowl.push({ geo: B(40, 1.0, 0.3), color: '#10101a', matrix: mat(0, 0.5, -9.5) });
  // the courtside seats and the scorer's table
  for (let i = 0; i < 18; i++) bowl.push({ geo: B(0.5, 0.5, 0.5), color: '#c8322e', matrix: mat(-8.5 + i, 0.25, -8.6) });
  scene.add(new THREE.Mesh(merge(bowl), props));
  const fans = crowd(U, [...stands(-19, 19, -10.4, 1.3, 22, { dz: -0.9, dy: 0.5, step: 0.62, seed: 31 }), ...stands(-15, 7, 9.4, 1.3, 16, { dz: 0.9, dy: 0.5, axis: 'z', step: 0.62, seed: 32 }), ...stands(-15, 7, -9.4, 1.3, 16, { dz: -0.9, dy: 0.5, axis: 'z', step: 0.62, seed: 33 }), ...Array.from({ length: 16 }, (_, i) => [-8.4 + i * 1.05, 0.9, -8.5])], { size: 0.85, light: '#e0d8ff' });
  scene.add(fans.mesh);
  const ledTex = canvasTex(2048, 96, (g, w, h) => { g.fillStyle = '#05050a'; g.fillRect(0, 0, w, h); g.font = `${Math.round(h * 0.75)}px Bangers, Impact, sans-serif`; g.textBaseline = 'middle'; let x = 10; for (let k = 0; k < 3; k++) for (const [t, c] of [['CAPRA LAB', '#29d3f0'], ['FREE THROWS', '#ffd23f'], ['IRL', '#ff3d8b'], ['DEFENSE!', '#5be38a']]) { g.fillStyle = c; g.fillText(t, x, h / 2 + 3); x += g.measureText(t).width + 70; } }, { repeat: true });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.7), new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false })); led.position.set(0, 6.6, -14.9); scene.add(led);
  // the jumbotron, hanging over center court
  const jumboCv = document.createElement('canvas'); jumboCv.width = 512; jumboCv.height = 256;
  const jumboTex = new THREE.CanvasTexture(jumboCv); jumboTex.colorSpace = THREE.SRGBColorSpace;
  let jumboKey = '';
  const paintJumbo = (fire) => {
    const k = fire ? 'fire' : 'calm'; if (k === jumboKey) return; jumboKey = k;
    const g = jumboCv.getContext('2d'), w = 512, h = 256;
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, fire ? '#ff6a1a' : '#1a1440'); gr.addColorStop(1, fire ? '#ffd23f' : '#3a2a80');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.font = `${Math.round(h * 0.36)}px Bangers, Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = '#120e18';
    const t = fire ? 'ON FIRE!' : 'FREE THROWS'; g.strokeText(t, w / 2, h * 0.42); g.fillStyle = '#fff8ec'; g.fillText(t, w / 2, h * 0.42);
    g.font = `800 ${Math.round(h * 0.11)}px Inter, Arial, sans-serif`; g.fillStyle = fire ? '#120e18' : '#29d3f0'; g.fillText('CAPRA LAB ARENA', w / 2, h * 0.78);
    jumboTex.needsUpdate = true;
  };
  paintJumbo(false);
  const jumbo = new THREE.Group(); jumbo.position.set(0, 10.5, -6); scene.add(jumbo);
  jumbo.add(new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.0, 5.4), new THREE.MeshStandardMaterial({ color: '#15151c', roughness: 0.5 })));
  for (let k = 0; k < 4; k++) { const sc = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 2.6), new THREE.MeshBasicMaterial({ map: jumboTex, toneMapped: false })); sc.position.set(Math.sin(k * Math.PI / 2) * 2.71, 0, Math.cos(k * Math.PI / 2) * 2.71); sc.rotation.y = k * Math.PI / 2; jumbo.add(sc); }
  // banners in the rafters
  const banner = (lines, col) => canvasTex(256, 512, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = '#fff8ec'; g.fillRect(14, 14, w - 28, h - 28); g.fillStyle = col; g.fillRect(24, 24, w - 48, h - 48); g.font = `${Math.round(w * 0.24)}px Bangers, Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffd23f'; lines.forEach((ln, i) => g.fillText(ln, w / 2, h * (0.3 + i * 0.22))); });
  [[['CAPRA', 'CHAMPS', '2026'], '#5a2a9a'], [['IRL', 'HOOPS', '★'], '#1d4aa8'], [['FREE', 'THROW', 'KINGS'], '#a8261f'], [['GOAT', 'MODE', '💯'], '#1f7a4a']].forEach(([lines, col], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), new THREE.MeshStandardMaterial({ map: banner(lines, col), roughness: 0.8, side: THREE.DoubleSide }));
    m.position.set(-6 + i * 4, 11.5, -16); scene.add(m);
  });
  const lights = []; for (let i = 0; i < 24; i++) lights.push([-11 + (i % 12) * 2, 13 + Math.floor(i / 12), -8 - Math.floor(i / 12) * 6, 0]);
  scene.add(bulbs(U, lights, ['#fff6e0'], { size: 0.9, strength: 0.9 }));

  /* ---- the ball, its flames ---- */
  const ballMat = patchStandard(new THREE.MeshStandardMaterial({ color: '#e8641a', roughness: 0.6 }), U, {
    vdecl: 'varying vec3 vLoc;', vertex: 'vLoc = normalize(position);', decl: 'varying vec3 vLoc;',
    diffuse: /* glsl */ `{ vec3 q = vLoc; float s2 = abs(abs(q.z) - 0.55 - 0.25 * q.y * q.y); float seam = min(min(abs(q.x), abs(q.y)), s2);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03), 1.0 - smoothstep(0.03, 0.06, seam)); diffuseColor.rgb *= 0.9 + 0.2 * h21(floor(q.xy * 40.0)); }`,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), ballMat); scene.add(ball);
  const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false })); ballShadow.rotation.x = -Math.PI / 2; ballShadow.renderOrder = 2; scene.add(ballShadow);
  const flames = bursts(U, { n: 200, shape: 'puff', grav: 2.5, drag: 1.5, opacity: 0.9, blend: THREE.AdditiveBlending });
  const confetti = bursts(U, { n: 200, shape: 'petal', grav: -1.8, drag: 1.6 });
  scene.add(flames.mesh, confetti.mesh);
  let cheer = 0, fire = false, lastFlame = 0;

  const place = {
    scene, fog, sport: true, exposure: 1.05,
    pup: { tint: new THREE.Color(1, 1, 1), rim: new THREE.Color(0, 0, 0), rimDir: [0, 1] },
    update(dt, t) {
      cheer = Math.max(0, cheer - dt * 0.45); fans.cheer.value = Math.min(1, cheer);
      ledTex.offset.x = (t * 0.03) % 1;
    },
    view(v, now, t) {
      const c = v.c, shot = c && c.shot;
      fire = !!(c && c.streak >= 3); paintJumbo(fire);
      const bp = hoopBall(shot, now);
      ball.visible = ballShadow.visible = !!bp;
      if (bp) {
        ball.position.set(bp.x, bp.y, -bp.z); ball.rotation.x = now / 120;
        ballShadow.position.set(bp.x, 0.006, -bp.z); ballShadow.material.opacity = Math.max(0.05, 0.35 - bp.y * 0.07);
        if (fire && t - lastFlame > 0.03) { lastFlame = t; flames.emit({ x: bp.x, y: bp.y - 0.05, z: -bp.z }, 2, { speed: 0.4, up: 0.9, size: 0.14, life: 0.45, colors: ['#ff6a1a', '#ffd23f', '#ff3d1a'], spread: 0.12 }); }
      }
      const swish = shot && shot.done && shot.make && now - shot.end < 500 ? Math.sin(((now - shot.end) / 500) * Math.PI) : 0;
      netShape(swish, swish ? Math.sin(now / 40) : 0);
    },
    pulse(kind, at) {
      cheer = kind === 'big' ? 2 : 1.3;
      if (kind === 'big') confetti.emit({ x: 0, y: 6, z: -6 }, 60, { speed: 2.5, up: 0.2, size: 0.08, life: 3, colors: ['#ffd23f', '#ff6a1a', '#29d3f0', '#ff3d8b'], spread: 3 });
      if (at.ac) rumble(at.ac, 0, 2.0, { lp: 1800, lp2: 500, vol: kind === 'big' ? 0.09 : 0.06, brown: false, attack: 0.2 });
    },
    ambience(ac) {
      const murmur = noiseLoop(ac, { hp: 250, lp: 1500, gain: 0.025, swell: 0.5 });
      const low = noiseLoop(ac, { hp: 40, lp: 220, gain: 0.018, brown: true });
      return { stop() { murmur.stop(); low.stop(); } };
    },
    quality() {},
  };
  void rng; void shaderMat; void glow;
  return place;
}
