/* The carnival (Target Smash): a midway at dusk. You stand in the SMASH-O-RAMA booth under its striped awning,
   prizes on the shelf behind you; past it the Ferris wheel turns with its lights chasing, the carousel spins,
   striped tents glow, string lights zigzag overhead, balloons bob, a high striker waits with its bell. A hit
   throws confetti from the target, every tenth sends the striker's puck up to ring the bell and fireworks over
   the wheel. */
import { THREE, rng, NOISE, FOG, shaderMat, patchStandard, skyDome, bursts, glow, merge, mat, propMat, noiseLoop, ping, rumble, bulbs, wordsTex, panel, STARS } from './core.js';

const BULB = ['#ffd23f', '#ff3d8b', '#29d3f0', '#5be38a', '#fff3b0'];

export default function buildCarnival(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(61);
  const fog = new THREE.FogExp2('#3b1e4f', 0.012);
  scene.fog = fog;

  scene.add(skyDome(U, /* glsl */ `${STARS}
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) {
      float h = d.y;
      vec3 col = mix(S(1.0, 0.55, 0.32), S(0.78, 0.28, 0.5), smoothstep(-0.02, 0.12, h));
      col = mix(col, S(0.22, 0.1, 0.36), smoothstep(0.1, 0.45, h));
      col = mix(col, S(0.05, 0.04, 0.14), smoothstep(0.4, 0.9, h));
      col += vec3(0.9, 0.9, 1.0) * stars(d) * smoothstep(0.25, 0.6, h);
      vec2 uv = d.xz / max(h + 0.08, 0.04) * 0.5 + vec2(uTime * 0.005, 0.0);
      col = mix(col, mix(S(1.0, 0.5, 0.45), S(0.35, 0.18, 0.4), smoothstep(0.05, 0.35, h)), smoothstep(0.58, 0.8, fbm(uv)) * smoothstep(0.02, 0.1, h) * 0.6);
      return col;
    }`));

  const hemi = new THREE.HemisphereLight('#a070ff', '#3a1a28', 0.9);
  const key = new THREE.DirectionalLight('#ffd9a0', 1.6);
  key.position.set(0.3, 1.0, -0.55).normalize().multiplyScalar(30);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 80 });
  key.shadow.radius = 5; key.shadow.bias = -0.0005;
  const warm = new THREE.PointLight('#ffb050', 10, 9, 1.5); warm.position.set(0, 2.5, -0.4);
  const pinkL = new THREE.PointLight('#ff3d8b', 16, 20, 1.5); pinkL.position.set(-7, 3, -8);
  const cyanL = new THREE.PointLight('#29d3f0', 14, 20, 1.5); cyanL.position.set(7, 3, -9);
  scene.add(hemi, key, key.target, warm, pinkL, cyanL);

  // the midway: packed dirt and sawdust, popcorn and tickets dropped, pools of colored light
  const groundMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.9 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz;
      vec3 g = mix(S(0.36, 0.27, 0.2), S(0.5, 0.39, 0.28), vnoise(p * 2.0));
      g = mix(g, S(0.72, 0.6, 0.4), smoothstep(0.75, 0.85, vnoise(p * 14.0)) * 0.5);
      vec2 c = floor(p * 9.0); float s = h21(c);
      g = mix(g, S(1.0, 0.92, 0.6), step(0.985, s) * step(length(fract(p * 9.0) - 0.5), 0.3));
      g = mix(g, S(0.95, 0.2, 0.3), step(0.996, h21(c + 3.0)) * step(abs(fract(p.x * 9.0) - 0.5), 0.3) * step(abs(fract(p.y * 9.0) - 0.5), 0.15));
      diffuseColor.rgb = g;
    }`,
    post: /* glsl */ `{
      outgoingLight += diffuseColor.rgb * (vec3(1.0, 0.24, 0.55) * 2.0 * exp(-length(vWP.xz - vec2(-7.0, -8.0)) * 0.35) + vec3(0.16, 0.8, 0.95) * 2.0 * exp(-length(vWP.xz - vec2(7.0, -9.0)) * 0.35) + vec3(1.0, 0.75, 0.3) * 1.5 * exp(-length(vWP.xz - vec2(0.0, -1.0)) * 0.6));
    }`,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.z = -150; ground.receiveShadow = true; scene.add(ground);

  const props = propMat(U, { rough: 0.6, emitK: 2.6 });
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);

  /* ---- the booth: striped posts, a scalloped awning high overhead, the prize shelf behind ---- */
  const booth = [];
  for (const x of [-3.0, 3.0]) for (let k = 0; k < 7; k++) booth.push({ geo: C(0.13, 0.13, 0.42, 12), color: k % 2 ? '#fff8ec' : '#e8322e', matrix: mat(x, 0.21 + k * 0.42, -1.2) });
  for (let i = 0; i < 12; i++) {
    const x = -3.0 + (i + 0.5) * 0.5;
    booth.push({ geo: B(0.5, 0.06, 1.4), color: i % 2 ? '#fff8ec' : '#e8322e', matrix: mat(x, 3.05, -0.75, -0.25) });
    booth.push({ geo: new THREE.CylinderGeometry(0.25, 0.25, 0.06, 14, 1, false, 0, Math.PI), color: i % 2 ? '#fff8ec' : '#e8322e', matrix: mat(x, 2.88, -0.08, Math.PI / 2, 0, Math.PI / 2) });
  }
  booth.push({ geo: B(6.4, 0.3, 0.12), color: '#ffd23f', matrix: mat(0, 3.28, -1.45) });
  // the prize shelf behind you: low, so the midway shows over it
  booth.push({ geo: B(6.2, 1.25, 0.6), color: '#5a2a7a', matrix: mat(0, 0.62, -3.0) });
  booth.push({ geo: B(6.3, 0.08, 0.7), color: '#ffd23f', matrix: mat(0, 1.28, -3.0) });
  for (let i = 0; i < 9; i++) booth.push({ geo: B(0.08, 1.2, 0.02), color: '#ff3d8b', matrix: mat(-2.8 + i * 0.7, 0.62, -2.69) });
  // prizes: teddy bears in candy colors, sitting on the shelves
  const teddy = ['#ff8ad0', '#7ce0ff', '#ffd23f', '#a8ff8a', '#c79bff', '#ff9a5a'];
  for (let i = 0; i < 9; i++) {
    const y = 1.32, x = -2.75 + i * 0.69, col = teddy[i % 6], s = 0.85 + (i % 3) * 0.12, z = -3.0;
    booth.push({ geo: new THREE.SphereGeometry(0.17 * s, 12, 10), color: col, matrix: mat(x, y + 0.17 * s, z) });
    booth.push({ geo: new THREE.SphereGeometry(0.13 * s, 12, 10), color: col, matrix: mat(x, y + 0.42 * s, z + 0.02) });
    booth.push({ geo: new THREE.SphereGeometry(0.05 * s, 8, 6), color: col, matrix: mat(x - 0.1 * s, y + 0.53 * s, z) });
    booth.push({ geo: new THREE.SphereGeometry(0.05 * s, 8, 6), color: col, matrix: mat(x + 0.1 * s, y + 0.53 * s, z) });
    booth.push({ geo: new THREE.SphereGeometry(0.03 * s, 6, 5), color: '#120e18', matrix: mat(x, y + 0.42 * s, z + 0.14) });
    booth.push({ geo: new THREE.SphereGeometry(0.06 * s, 8, 6), color: '#fff8ec', matrix: mat(x, y + 0.36 * s, z + 0.13) });
  }
  scene.add(new THREE.Mesh(merge(booth), props));
  const sign = panel(wordsTex([['SMASH-O-RAMA', '#ffd23f']], { w: 1024, h: 192, size: 0.62, glow: '#ff3d8b' }), 5.4, 1.0, { glowK: 0.8 });
  sign.position.set(0, 3.32, -1.38); scene.add(sign);
  // bulbs round the awning
  const awn = [];
  for (let i = 0; i <= 24; i++) awn.push([-3.0 + i * 0.25, 2.86, -0.05, i % 5]);
  for (let i = 0; i <= 10; i++) { awn.push([-3.0, 0.3 + i * 0.25, -1.05, i % 5]); awn.push([3.0, 0.3 + i * 0.25, -1.05, (i + 2) % 5]); }
  const awnBulbs = bulbs(U, awn, BULB, { size: 0.16, chase: 1.2 }); scene.add(awnBulbs);

  /* ---- the Ferris wheel: a rim of chasing lights, spokes, swinging cars, turning slowly ---- */
  const wheel = new THREE.Group(); wheel.position.set(9, 15.5, -42); scene.add(wheel);
  const R = 13, spokes = [], wpts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    spokes.push({ geo: B(0.12, R, 0.12), color: '#e8e2f4', matrix: mat(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0, 0, 0, a - Math.PI / 2) });
    spokes.push({ geo: B(0.12, R, 0.12), color: '#e8e2f4', matrix: mat(Math.cos(a) * R / 2, Math.sin(a) * R / 2, -1.2, 0, 0, a - Math.PI / 2) });
  }
  spokes.push({ geo: new THREE.TorusGeometry(R, 0.12, 6, 80), color: '#f4f0ff', matrix: mat(0, 0, 0) });
  spokes.push({ geo: new THREE.TorusGeometry(R, 0.12, 6, 80), color: '#f4f0ff', matrix: mat(0, 0, -1.2) });
  spokes.push({ geo: C(0.6, 0.6, 1.6, 16), color: '#ffd23f', matrix: mat(0, 0, -0.6, Math.PI / 2) });
  wheel.add(new THREE.Mesh(merge(spokes), props));
  for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2; wpts.push([Math.cos(a) * R, Math.sin(a) * R, 0.15, i % 5]); }
  for (let i = 0; i < 16; i++) for (let k = 1; k < 6; k++) { const a = (i / 16) * Math.PI * 2; wpts.push([Math.cos(a) * R * k / 6, Math.sin(a) * R * k / 6, 0.15, (i + k) % 5]); }
  wheel.add(bulbs(U, wpts, BULB, { size: 0.55, chase: 0.6, strength: 1.4 }));
  const cars = [];
  const carGeo = merge([{ geo: B(1.6, 1.1, 1.0), color: '#ff3d8b', matrix: mat(0, -1.1, 0) }, { geo: B(1.8, 0.12, 1.2), color: '#ffd23f', matrix: mat(0, -0.45, 0) }, { geo: C(0.04, 0.04, 0.7, 5), color: '#ccc', matrix: mat(0, -0.2, 0) }]);
  const carCols = ['#ff3d8b', '#29d3f0', '#5be38a', '#ffd23f', '#c77dff', '#ff8a3d'];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(carGeo, propMat(U, { rough: 0.5 }));
    m.material = new THREE.MeshStandardMaterial({ color: carCols[i % 6], roughness: 0.5 });
    wheel.add(m); cars.push({ m, a: (i / 16) * Math.PI * 2 });
  }
  // its legs, on the ground
  scene.add(new THREE.Mesh(merge([-1, 1].flatMap((s) => [{ geo: B(0.35, 17.5, 0.35), color: '#d8d0e8', matrix: mat(9 + s * 4.2, 7.7, -41.4, 0, 0, s * 0.27) }, { geo: B(0.35, 17.5, 0.35), color: '#d8d0e8', matrix: mat(9 + s * 4.2, 7.7, -43.6, 0, 0, s * 0.27) }])), props));

  /* ---- the carousel: a striped tent roof, lights, horses going round ---- */
  const caro = new THREE.Group(); caro.position.set(-12, 0, -24); scene.add(caro);
  const roof = [];
  for (let i = 0; i < 16; i++) roof.push({ geo: new THREE.ConeGeometry(5.2, 2.2, 16, 1, true, (i / 16) * Math.PI * 2, Math.PI * 2 / 16), color: i % 2 ? '#fff8ec' : '#e8322e', matrix: mat(0, 4.6, 0) });
  roof.push({ geo: C(5.25, 5.25, 0.5, 32, 1, true), color: '#ffd23f', matrix: mat(0, 3.35, 0) });
  roof.push({ geo: C(0.35, 0.35, 3.4, 12), color: '#ffd23f', matrix: mat(0, 1.7, 0) });
  roof.push({ geo: C(5.0, 5.0, 0.35, 32), color: '#7a3a9a', matrix: mat(0, 0.17, 0) });
  roof.push({ geo: new THREE.SphereGeometry(0.35, 10, 8), color: '#ffd23f', matrix: mat(0, 5.9, 0) });
  caro.add(new THREE.Mesh(merge(roof), props));
  const spin = new THREE.Group(); caro.add(spin);
  const horses = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, x = Math.cos(a) * 3.6, z = Math.sin(a) * 3.6;
    const h = new THREE.Mesh(merge([
      { geo: B(1.0, 0.4, 0.3), color: i % 2 ? '#fff8ec' : '#ffd0e8', matrix: mat(0, 0, 0) },
      { geo: B(0.25, 0.55, 0.25), color: i % 2 ? '#fff8ec' : '#ffd0e8', matrix: mat(0.5, 0.3, 0, 0, 0, -0.4) },
      { geo: B(0.12, 0.12, 0.32), color: '#e8322e', matrix: mat(0.05, 0.25, 0) },
      { geo: C(0.03, 0.03, 3.0, 6), color: '#ffd23f', matrix: mat(0, 0.9, 0) },
    ]), props);
    h.position.set(x, 1.2, z); h.rotation.y = -a; spin.add(h); horses.push({ h, a });
  }
  const cpts = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; cpts.push([Math.cos(a) * 5.3, 3.35, Math.sin(a) * 5.3, i % 5]); }
  caro.add(bulbs(U, cpts, BULB, { size: 0.3, chase: 1.5 }));

  /* ---- striped tents, a popcorn stand, a high striker, balloons ---- */
  const tents = [];
  const TENT = [['#29d3f0', '#fff8ec', 5, -14, 2.6], ['#5be38a', '#fff8ec', -6, -12, 2.2], ['#ff8a3d', '#fff8ec', 15, -20, 3.0], ['#c77dff', '#ffd23f', -18, -36, 3.4], ['#ff3d8b', '#fff8ec', 20, -48, 3.5], ['#ffd23f', '#e8322e', -4, -30, 2.8]];
  for (const [c1, c2, x, z, s] of TENT) {
    for (let i = 0; i < 12; i++) tents.push({ geo: new THREE.ConeGeometry(s, s * 1.1, 12, 1, true, (i / 12) * Math.PI * 2, Math.PI * 2 / 12), color: i % 2 ? c2 : c1, matrix: mat(x, s * 0.9 + s * 0.55, z) });
    tents.push({ geo: C(s * 0.98, s * 0.98, s * 0.9, 12, 1, true), color: c1, matrix: mat(x, s * 0.45, z) });
    tents.push({ geo: B(s * 0.7, s * 0.6, 0.05), color: '#ffcf80', matrix: mat(x, s * 0.3, z + s * 0.98), emit: 0.8 });
    tents.push({ geo: new THREE.ConeGeometry(0.12, 0.6, 6), color: c1, matrix: mat(x, s * 2.3, z) });
  }
  // popcorn stand
  tents.push({ geo: B(1.4, 1.0, 0.9), color: '#e8322e', matrix: mat(4.6, 0.5, -5.2) });
  tents.push({ geo: B(1.3, 0.9, 0.85), color: '#fff3b0', matrix: mat(4.6, 1.45, -5.2), emit: 0.35 });
  tents.push({ geo: B(1.6, 0.15, 1.1), color: '#ffd23f', matrix: mat(4.6, 2.0, -5.2) });
  // the high striker: a tall board, a scale up it, the bell at the top, the pad at the bottom
  tents.push({ geo: B(0.5, 6.0, 0.18), color: '#2b5ad6', matrix: mat(-4.6, 3.0, -5.4) });
  for (let i = 0; i < 10; i++) tents.push({ geo: B(0.42, 0.06, 0.2), color: ['#5be38a', '#ffd23f', '#ff8a3d', '#e8322e'][Math.min(3, i >> 2)], matrix: mat(-4.6, 0.8 + i * 0.5, -5.3) });
  tents.push({ geo: new THREE.SphereGeometry(0.32, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), color: '#ffd23f', matrix: mat(-4.6, 6.15, -5.3) });
  tents.push({ geo: B(0.9, 0.25, 0.9), color: '#e8322e', matrix: mat(-4.6, 0.12, -5.0) });
  scene.add(new THREE.Mesh(merge(tents), props));
  const puck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.12), new THREE.MeshStandardMaterial({ color: '#ff2a1a', emissive: '#ff2a1a', emissiveIntensity: 0.6 }));
  puck.position.set(-4.6, 0.5, -5.25); scene.add(puck);
  const bellGlow = glow(U, '#ffd23f', 2.4, 0); bellGlow.position.set(-4.6, 6.2, -5.1); scene.add(bellGlow);
  const strikerSign = panel(wordsTex([['TEST YOUR STRENGTH', '#ffd23f']], { w: 1024, h: 160, size: 0.55 }), 2.6, 0.4, { glowK: 0.4 });
  strikerSign.position.set(-4.6, 6.8, -5.3); scene.add(strikerSign);
  // balloons tied to the popcorn stand, bobbing
  const balloonGroup = new THREE.Group(); scene.add(balloonGroup);
  const balloons = [];
  for (let i = 0; i < 9; i++) {
    const col = BULB[i % 5] === '#fff3b0' ? '#ff6b2c' : BULB[i % 5];
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.05 }));
    b.scale.y = 1.2; const base = new THREE.Vector3(4.0 + (i % 3) * 0.35, 2.9 + Math.floor(i / 3) * 0.32, -5.3 + (i % 2) * 0.2);
    b.position.copy(base); balloonGroup.add(b); balloons.push({ b, base, ph: r() * 6 });
  }

  /* ---- string lights zigzagging over the midway ---- */
  const zig = [];
  for (let k = 0; k < 6; k++) {
    const z0 = -4 - k * 5, a = new THREE.Vector3(-9, 5.2, z0), b = new THREE.Vector3(9, 5.0, z0 - 2.5);
    for (let i = 0; i <= 26; i++) { const u = i / 26, p = new THREE.Vector3().lerpVectors(a, b, u); p.y -= Math.sin(u * Math.PI) * 1.1; zig.push([p.x, p.y, p.z, (i + k) % 5]); }
  }
  scene.add(bulbs(U, zig, BULB, { size: 0.26, chase: 0.8, strength: 1.2 }));
  const lightGlows = [[-7, 3, -8, '#ff3d8b'], [7, 3, -9, '#29d3f0'], [4.6, 1.5, -4.7, '#fff3b0']].map(([x, y, z, c]) => { const g = glow(U, c, 6, 0.35); g.position.set(x, y, z); scene.add(g); return g; });

  /* ---- confetti, fireworks ---- */
  const confetti = bursts(U, { n: 300, shape: 'petal', grav: -2.2, drag: 1.6 });
  const fireworks = bursts(U, { n: 600, shape: 'drop', grav: -2.5, drag: 0.9, blend: THREE.AdditiveBlending, order: 25 });
  scene.add(confetti.mesh, fireworks.mesh);
  let ringAt = -99;
  const bang = (ac, t0) => { rumble(ac, t0, 0.8, { lp: 700, lp2: 80, vol: 0.12, attack: 0.005 }); rumble(ac, t0 + 0.05, 1.2, { lp: 3000, lp2: 600, vol: 0.03, brown: false, attack: 0.2 }); };
  function firework(ac, k = 0) {
    const t0 = k * 0.45;
    setTimeout(() => {
      const p = { x: 9 + (Math.random() - 0.5) * 30, y: 22 + Math.random() * 10, z: -45 - Math.random() * 10 };
      fireworks.emit(p, 80, { speed: 7, sphere: true, size: 0.5, life: 1.8, colors: [BULB[(Math.random() * 4) | 0], '#ffffff', BULB[(Math.random() * 4) | 0]], spread: 0.2, jitter: 0.15 });
    }, t0 * 1000);
    if (ac) bang(ac, t0 + 0.12);
  }

  const place = {
    scene, fog, key, camH: 1.35, exposure: 1.1,
    pup: { tint: new THREE.Color(0.92, 0.86, 0.95), rim: new THREE.Color('#ff3d8b').multiplyScalar(0.9), rimDir: [-0.75, 0.4], rim2: new THREE.Color('#29d3f0').multiplyScalar(0.8), rimDir2: [0.75, 0.4] },
    update(dt, t) {
      wheel.rotation.z = t * 0.06;
      for (const c of cars) { const a = c.a + wheel.rotation.z; c.m.position.set(Math.cos(c.a) * R, Math.sin(c.a) * R, -0.6); c.m.rotation.z = -wheel.rotation.z + Math.sin(t * 1.3 + c.a) * 0.06; }
      spin.rotation.y = t * 0.45;
      horses.forEach((h, i) => { h.h.position.y = 1.2 + Math.sin(t * 2.4 + i * 1.3) * 0.25; });
      balloons.forEach((b) => { b.b.position.set(b.base.x + Math.sin(t * 0.9 + b.ph) * 0.06, b.base.y + Math.sin(t * 1.3 + b.ph) * 0.05, b.base.z); });
      // the striker: the puck shoots up and rings the bell, then drops
      const k = t - ringAt;
      puck.position.y = k < 0.55 ? 0.5 + 5.5 * Math.sin((k / 0.55) * Math.PI / 2) : k < 1.6 ? 6.0 - 5.5 * ((k - 0.55) / 1.05) ** 2 : 0.5;
      bellGlow.material.uniforms.uK.value = k > 0.5 && k < 2 ? Math.max(0, 1.4 * (1 - (k - 0.5) / 1.5)) * (0.7 + 0.3 * Math.sin(t * 40)) : 0;
      lightGlows.forEach((g, i) => { g.material.uniforms.uK.value = 0.3 + 0.06 * Math.sin(t * 3 + i * 2); });
    },
    pulse(kind, at) {
      const p = at.pos || { x: at.foot.x, y: 1.2, z: 0.25 };
      if (kind === 'rep') confetti.emit(p, 22, { speed: 2.2, up: 0.5, size: 0.06, life: 1.6, colors: ['#ffd23f', '#ff3d8b', '#29d3f0', '#5be38a', '#fff8ec'], spread: 0.2 });
      else if (kind === 'big') {
        ringAt = U.uTime.value;
        confetti.emit(p, 40, { speed: 3, up: 0.6, size: 0.07, life: 2.2, colors: ['#ffd23f', '#ff3d8b', '#29d3f0', '#5be38a'], spread: 0.4 });
        for (let k = 0; k < 3; k++) firework(at.ac, k);
        if (at.ac) setTimeout(() => { ping(at.ac, 1760, 0, 1.4, { vol: 0.06 }); ping(at.ac, 2637, 0, 1.0, { vol: 0.03 }); }, 520);
      }
    },
    ambience(ac) {
      const crowdN = noiseLoop(ac, { hp: 200, lp: 1400, gain: 0.018, swell: 0.4 });
      // a carousel waltz, quiet, on a loop
      let alive = true, tm = 0, n = 0;
      const tune = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1046, 988, 784, 587, 494];
      const step = () => { if (!alive) return; const f = tune[n % tune.length]; ping(ac, f, 0, 0.32, { type: 'triangle', vol: 0.012 }); if (n % 3 === 0) ping(ac, f / 4, 0, 0.4, { type: 'square', vol: 0.006 }); n++; tm = setTimeout(step, 230); };
      step();
      return { stop() { alive = false; clearTimeout(tm); crowdN.stop(); } };
    },
    quality() {},
  };
  return place;
}
