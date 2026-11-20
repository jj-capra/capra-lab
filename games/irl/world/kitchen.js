/* The Guac Shack (Avocado Chop): a bright little kitchen at noon. Blue and yellow tiles, a wide serving window onto
   a sunny street of painted houses, paper flags (papel picado) strung across the ceiling and the street, copper
   pans on a rack, chili strings by the window, jars on the shelves, plants. On the counter behind you: a stone
   bowl of guacamole, limes, tomatoes, an onion, cilantro, a basket of avocados, a bowl of chips. A cut flicks
   green bits off the avocado, guacamole sets the flags dancing and throws confetti with a marimba run. */
import { THREE, rng, shaderMat, patchStandard, skyDome, bursts, glow, merge, mat, propMat, noiseLoop, ping, canvasTex } from './core.js';

const WALL_Z = -3.3;
const FLAG = ['#ff3d8b', '#29d3f0', '#ffd23f', '#5be38a', '#c77dff', '#ff8a3d'];

export default function buildKitchen(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(91);
  const fog = new THREE.FogExp2('#cfe8ff', 0.004);
  scene.fog = fog;
  const SUN = new THREE.Vector3(-0.35, 0.75, -0.55).normalize();
  U.uSun.value.copy(SUN);

  scene.add(skyDome(U, /* glsl */ `
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) { float h = d.y; vec3 col = mix(S(0.75, 0.88, 1.0), S(0.25, 0.55, 0.95), smoothstep(0.0, 0.5, h));
      vec2 uv = d.xz / max(h + 0.06, 0.03) * 0.5 + vec2(uTime * 0.004, 0.0);
      return mix(col, S(1.0, 1.0, 1.0), smoothstep(0.55, 0.8, fbm(uv)) * smoothstep(0.02, 0.15, h) * 0.8); }`));

  const hemi = new THREE.HemisphereLight('#fff2d8', '#b06a40', 1.3);
  const key = new THREE.DirectionalLight('#fff0d0', 3.4);
  key.position.copy(SUN).multiplyScalar(30); key.target.position.set(0, 0, -1);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 70 });
  key.shadow.radius = 3; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
  const fillL = new THREE.PointLight('#ffd8a8', 6, 10, 1.3); fillL.position.set(0, 2.6, 1.0);
  scene.add(hemi, key, key.target, fillL);

  // the floor: terracotta tiles
  const floorMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.6 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz / 0.42, c = floor(p), f = fract(p);
      vec3 t = mix(S(0.72, 0.36, 0.22), S(0.82, 0.46, 0.28), h21(c)) * (0.9 + 0.2 * vnoise(vWP.xz * 6.0));
      float grout = 1.0 - smoothstep(0.0, 0.04, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
      diffuseColor.rgb = mix(t, S(0.85, 0.8, 0.72), grout * 0.85);
    }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = WALL_Z + 4.5; floor.receiveShadow = true; scene.add(floor);
  // the street outside
  const streetMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.9 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }`,
    diffuse: /* glsl */ `{ vec2 p = vWP.xz / vec2(0.5, 0.3); vec2 c = floor(p + vec2(0.5 * mod(floor(p.y), 2.0), 0.0)), f = fract(p + vec2(0.5 * mod(floor(p.y), 2.0), 0.0));
      vec3 st = mix(S(0.62, 0.58, 0.52), S(0.75, 0.7, 0.62), h21(c)); diffuseColor.rgb = mix(st, S(0.4, 0.38, 0.34), 1.0 - smoothstep(0.0, 0.06, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)))); }`,
  });
  const street = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), streetMat);
  street.rotation.x = -Math.PI / 2; street.position.set(0, -0.02, WALL_Z - 20); street.receiveShadow = true; scene.add(street);

  /* ---- the room: tiled walls round the serving window, the ceiling ---- */
  const tileTex = canvasTex(256, 256, (g, w) => {
    const s = w / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const X = x * s, Y = y * s;
      g.fillStyle = '#f6f1e4'; g.fillRect(X, Y, s, s);
      g.fillStyle = (x + y) % 2 ? '#1f4fa8' : '#e8a51f';
      g.beginPath(); g.arc(X + s / 2, Y + s / 2, s * 0.28, 0, Math.PI * 2); g.fill();
      g.fillStyle = (x + y) % 2 ? '#e8a51f' : '#1f4fa8';
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.ellipse(X + s / 2 + Math.cos(a) * s * 0.36, Y + s / 2 + Math.sin(a) * s * 0.36, s * 0.1, s * 0.05, a, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#1f4fa8'; for (const [cx, cy] of [[X, Y], [X + s, Y], [X, Y + s], [X + s, Y + s]]) { g.beginPath(); g.arc(cx, cy, s * 0.14, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = 'rgba(120,110,95,0.6)'; g.lineWidth = 2; g.strokeRect(X, Y, s, s);
    }
  }, { repeat: true });
  const tileMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.25 });
  const wallParts = (w, h, x, y, z, ry = 0, rep = 1) => { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * rep, uv.getY(i) * h * rep); const m = new THREE.Mesh(g, tileMat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
  const OW = 1.9, O0 = 1.0, O1 = 2.6;
  wallParts(8 - OW, 3.4, -(OW + (8 - OW) / 2), 1.7, WALL_Z); wallParts(8 - OW, 3.4, OW + (8 - OW) / 2, 1.7, WALL_Z);
  wallParts(OW * 2, O0, 0, O0 / 2, WALL_Z); wallParts(OW * 2, 3.4 - O1, 0, (3.4 + O1) / 2, WALL_Z);
  wallParts(9, 3.4, -5.5, 1.7, WALL_Z + 4.5, Math.PI / 2); wallParts(9, 3.4, 5.5, 1.7, WALL_Z + 4.5, -Math.PI / 2);
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s);
  const props = propMat(U, { rough: 0.55, emitK: 2 });
  const room = [
    { geo: B(14, 0.2, 10), color: '#e8dcc4', matrix: mat(0, 3.5, WALL_Z + 4.5) },
    { geo: B(OW * 2 + 0.3, 0.12, 0.4), color: '#7a4a2a', matrix: mat(0, O0, WALL_Z + 0.1) },
    { geo: B(OW * 2 + 0.3, 0.14, 0.3), color: '#7a4a2a', matrix: mat(0, O1 + 0.07, WALL_Z) },
    { geo: B(0.14, O1 - O0, 0.3), color: '#7a4a2a', matrix: mat(-OW - 0.07, (O0 + O1) / 2, WALL_Z) },
    { geo: B(0.14, O1 - O0, 0.3), color: '#7a4a2a', matrix: mat(OW + 0.07, (O0 + O1) / 2, WALL_Z) },
    // the counter behind you: a wooden top on a tiled base
    { geo: B(7.2, 0.9, 0.7), color: '#d9c8a8', matrix: mat(0, 0.45, -2.15) },
    { geo: B(7.4, 0.08, 0.8), color: '#8a5a32', matrix: mat(0, 0.94, -2.15) },
    // shelves either side of the window
    { geo: B(1.6, 0.06, 0.3), color: '#8a5a32', matrix: mat(-3.3, 1.7, WALL_Z + 0.15) }, { geo: B(1.6, 0.06, 0.3), color: '#8a5a32', matrix: mat(-3.3, 2.3, WALL_Z + 0.15) },
    { geo: B(1.6, 0.06, 0.3), color: '#8a5a32', matrix: mat(3.3, 1.7, WALL_Z + 0.15) }, { geo: B(1.6, 0.06, 0.3), color: '#8a5a32', matrix: mat(3.3, 2.3, WALL_Z + 0.15) },
    // the pan rack over the counter
    { geo: B(3.4, 0.05, 0.05), color: '#3a2a20', matrix: mat(0, 2.95, -1.9) },
    { geo: C(0.01, 0.01, 0.5, 4), color: '#3a2a20', matrix: mat(-1.6, 3.2, -1.9) }, { geo: C(0.01, 0.01, 0.5, 4), color: '#3a2a20', matrix: mat(1.6, 3.2, -1.9) },
  ];
  // jars and pots on the shelves
  const JAR = ['#d6262b', '#e8a51f', '#7a3a1a', '#5a8a2a', '#f4f0e0', '#b04a1a'];
  for (const sx of [-1, 1]) for (const y of [1.73, 2.33]) for (let i = 0; i < 5; i++) {
    const x = sx * 3.3 - 0.6 + i * 0.3, h = 0.16 + (i % 3) * 0.05;
    room.push({ geo: C(0.08, 0.08, h, 12), color: JAR[(i + (y > 2 ? 2 : 0) + (sx > 0 ? 1 : 0)) % 6], matrix: mat(x, y + h / 2, WALL_Z + 0.16) });
    room.push({ geo: C(0.085, 0.085, 0.03, 12), color: '#c8a050', matrix: mat(x, y + h + 0.015, WALL_Z + 0.16) });
  }
  // copper pans hanging from the rack
  for (let i = 0; i < 5; i++) { const x = -1.3 + i * 0.65, rad = 0.13 + (i % 2) * 0.05; room.push({ geo: C(rad, rad * 0.8, 0.07, 18), color: '#c8743a', matrix: mat(x, 2.7 - rad, -1.9, Math.PI / 2) }); room.push({ geo: B(0.04, 0.3, 0.02), color: '#8a4a22', matrix: mat(x, 2.82, -1.9) }); }
  // chili strings by the window
  for (const sx of [-1, 1]) for (let k = 0; k < 9; k++) room.push({ geo: new THREE.ConeGeometry(0.05, 0.18, 6), color: k % 3 ? '#d6262b' : '#a81818', matrix: mat(sx * (OW + 0.35) + Math.sin(k * 2.1) * 0.05, 2.5 - k * 0.15, WALL_Z + 0.12, Math.PI, 0, Math.sin(k) * 0.4) });
  // on the counter: the guacamole bowl, limes, tomatoes, an onion, cilantro, avocados, chips, a cutting board
  room.push({ geo: C(0.24, 0.16, 0.16, 18), color: '#5a5550', matrix: mat(-0.9, 1.06, -2.1) });
  room.push({ geo: new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), color: '#7fb83a', matrix: mat(-0.9, 1.1, -2.1, 0, 0, 0, [1, 0.5, 1]) });
  for (let i = 0; i < 5; i++) room.push({ geo: new THREE.SphereGeometry(0.055, 10, 8), color: '#6ac22a', matrix: mat(-0.4 + i * 0.12, 1.03, -2.0 + (i % 2) * 0.1) });
  for (let i = 0; i < 3; i++) room.push({ geo: new THREE.SphereGeometry(0.075, 12, 10), color: '#e8322e', matrix: mat(0.35 + i * 0.16, 1.05, -2.15 + (i % 2) * 0.08) });
  room.push({ geo: new THREE.SphereGeometry(0.09, 12, 10), color: '#f4ecd8', matrix: mat(0.95, 1.06, -2.0) });
  for (let i = 0; i < 6; i++) room.push({ geo: new THREE.IcosahedronGeometry(0.06, 0), color: '#3a8a2a', matrix: mat(1.25 + (i % 3) * 0.06, 1.04 + Math.floor(i / 3) * 0.04, -2.1) });
  room.push({ geo: C(0.28, 0.22, 0.12, 16), color: '#c8a050', matrix: mat(-2.2, 1.04, -2.15) });
  for (let i = 0; i < 6; i++) room.push({ geo: new THREE.SphereGeometry(0.08, 12, 10), color: '#2f4a1f', matrix: mat(-2.3 + (i % 3) * 0.12, 1.13 + Math.floor(i / 3) * 0.06, -2.15 + (i % 2) * 0.08, 0, 0, 0.6, [0.8, 1.15, 0.8]) });
  room.push({ geo: C(0.22, 0.14, 0.1, 16), color: '#d6262b', matrix: mat(2.1, 1.03, -2.15) });
  for (let i = 0; i < 9; i++) room.push({ geo: new THREE.ConeGeometry(0.06, 0.01, 3), color: '#f2c84a', matrix: mat(2.1 + Math.sin(i * 2.3) * 0.1, 1.09 + (i % 3) * 0.015, -2.15 + Math.cos(i * 2.3) * 0.08, 0.3 * Math.sin(i), i, 0) });
  room.push({ geo: B(0.6, 0.04, 0.35), color: '#b8864a', matrix: mat(0.0, 0.98, -2.2) });
  // a plant in the corner, a pothos trailing from the top shelf
  room.push({ geo: C(0.25, 0.2, 0.45, 14), color: '#c8643a', matrix: mat(4.6, 0.22, -2.6) });
  for (let i = 0; i < 9; i++) room.push({ geo: new THREE.SphereGeometry(0.22, 8, 6), color: i % 2 ? '#3f8a3a' : '#2f7a2a', matrix: mat(4.6 + Math.cos(i * 0.7) * 0.25, 0.6 + (i % 4) * 0.22, -2.6 + Math.sin(i * 0.7) * 0.2, 0, i, 0, [1, 0.5, 1]) });
  for (let i = 0; i < 7; i++) room.push({ geo: new THREE.SphereGeometry(0.05, 6, 5), color: '#4a9a3a', matrix: mat(-3.9 + Math.sin(i) * 0.04, 2.3 - i * 0.12, WALL_Z + 0.25, 0, 0, 0, [1, 0.6, 1]) });
  scene.add(new THREE.Mesh(merge(room), props));

  /* ---- outside: painted houses, a palm, a cactus, more flags ---- */
  const HOUSE = ['#ff7aa8', '#ffd23f', '#3ad6c8', '#ff8a3d', '#8a7aff', '#7ae07a', '#f4f0e0'];
  const out = [];
  for (let i = 0; i < 9; i++) {
    const x = -16 + i * 4, w = 3.8, h = 3.5 + (i % 3) * 1.6, z = WALL_Z - 9;
    out.push({ geo: B(w, h, 3), color: HOUSE[i % 7], matrix: mat(x, h / 2, z) });
    out.push({ geo: B(w + 0.2, 0.25, 3.2), color: '#f4f0e0', matrix: mat(x, h, z) });
    for (const dx of [-0.9, 0.9]) out.push({ geo: B(0.7, 1.0, 0.05), color: '#2a4a7a', matrix: mat(x + dx, h - 1.3, z + 1.52) }, { geo: B(0.9, 0.08, 0.15), color: '#7a4a2a', matrix: mat(x + dx, h - 1.85, z + 1.55) });
    out.push({ geo: B(0.9, 1.7, 0.05), color: '#6a3a1a', matrix: mat(x, 0.85, z + 1.52) });
  }
  out.push({ geo: C(0.15, 0.22, 6, 8), color: '#8a6a3a', matrix: mat(4.5, 3, WALL_Z - 6, 0, 0, 0.08) });
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; out.push({ geo: B(2.2, 0.06, 0.5), color: '#3f8a2a', matrix: mat(4.5 + Math.cos(a) * 1.0 + 0.24, 5.9 - 0.3, WALL_Z - 6 + Math.sin(a) * 1.0, 0, -a, -0.45) }); }
  out.push({ geo: C(0.35, 0.3, 0.5, 12), color: '#c8643a', matrix: mat(-2.6, 0.25, WALL_Z - 3) }, { geo: C(0.13, 0.15, 0.9, 10), color: '#4a8a3a', matrix: mat(-2.6, 0.9, WALL_Z - 3) }, { geo: C(0.08, 0.08, 0.4, 8), color: '#4a8a3a', matrix: mat(-2.4, 1.0, WALL_Z - 3, 0, 0, -0.9) });
  scene.add(new THREE.Mesh(merge(out), propMat(U, { rough: 0.8 })));

  /* ---- papel picado: strings of cut-paper flags, fluttering ---- */
  const flagMat = shaderMat(U, {
    uniforms: { uFlutter: { value: 0 } },
    vertex: /* glsl */ `attribute vec3 aF; attribute vec3 aC; uniform float uTime; uniform float uFlutter; varying vec2 vUv; varying vec3 vC;
      void main() {
        float sw = sin(uTime * 2.2 + aF.x * 3.0 + aF.z) * (0.12 + uFlutter * 0.5) * position.y;
        vec3 p = vec3(aF.x + position.x * 0.32, aF.y - (1.0 - position.y) * 0.36, aF.z + sw * 0.9);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vUv = vec2(position.x + 0.5, position.y); vC = aC;
      }`,
    fragment: /* glsl */ `varying vec2 vUv; varying vec3 vC;
      void main() {
        vec2 p = vUv; if (p.y < 0.12 && abs(fract(p.x * 4.0) - 0.5) > p.y * 4.0) discard;
        vec2 c = fract(p * vec2(4.0, 3.5)) - 0.5; if (length(c) < 0.18 && p.y > 0.2 && p.y < 0.85) discard;
        if (abs(p.x - 0.5) < 0.06 && abs(p.y - 0.5) < 0.2) discard;
        gl_FragColor = vec4(vC * (0.85 + 0.15 * p.y), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
  const flagsPts = [];
  const string = (a, b, n, sag) => { for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, p = new THREE.Vector3().lerpVectors(a, b, u); p.y -= Math.sin(u * Math.PI) * sag; flagsPts.push([p.x, p.y, p.z, i]); } };
  string(new THREE.Vector3(-5.4, 3.3, 0.6), new THREE.Vector3(5.4, 3.3, -0.6), 22, 0.4);
  string(new THREE.Vector3(-5.4, 3.3, -1.2), new THREE.Vector3(5.4, 3.3, -2.8), 22, 0.35);
  for (let k = 0; k < 3; k++) string(new THREE.Vector3(-14, 4.6, WALL_Z - 4 - k * 2), new THREE.Vector3(14, 4.6, WALL_Z - 5 - k * 2), 40, 0.8);
  const fg = new THREE.InstancedBufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3)); fg.setIndex([0, 1, 2, 0, 2, 3]);
  const aF = new Float32Array(flagsPts.length * 3), aC = new Float32Array(flagsPts.length * 3), cc = new THREE.Color();
  flagsPts.forEach(([x, y, z, i], k) => { aF.set([x, y, z], k * 3); cc.set(FLAG[(i + k) % FLAG.length]); aC.set([cc.r, cc.g, cc.b], k * 3); });
  fg.setAttribute('aF', new THREE.InstancedBufferAttribute(aF, 3)); fg.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 3)); fg.instanceCount = flagsPts.length;
  const flags = new THREE.Mesh(fg, flagMat); flags.frustumCulled = false; scene.add(flags);
  const sunBeam = glow(U, '#fff2c8', 3.8, 0.35); sunBeam.position.set(0, 1.8, WALL_Z + 0.2); scene.add(sunBeam);

  const bits = bursts(U, { n: 260, shape: 'dot', grav: -6, drag: 0.6 });
  const confetti = bursts(U, { n: 220, shape: 'petal', grav: -2, drag: 1.5 });
  scene.add(bits.mesh, confetti.mesh);
  let flutter = 0;
  const MARIMBA = [523, 659, 784, 1046, 784, 1046, 1318];

  const place = {
    scene, fog, key, camH: 1.3, exposure: 1.0,
    pup: { tint: new THREE.Color(1.0, 0.97, 0.92), rim: new THREE.Color('#fff0c0').multiplyScalar(0.7), rimDir: [-0.4, 0.9] },
    update(dt) {
      flutter = Math.max(0, flutter - dt * 0.6);
      flagMat.uniforms.uFlutter.value = flutter;
    },
    pulse(kind, at) {
      const p = at.pos || { x: at.foot.x, y: 1.2, z: 0.25 };
      if (kind === 'rep') bits.emit(p, 14, { speed: 2.2, up: 0.4, size: 0.04, life: 0.9, colors: ['#7fb83a', '#c8e06a', '#4a7a1a', '#e8e08a'], spread: 0.1 });
      else if (kind === 'big') {
        flutter = 1.6;
        bits.emit(p, 30, { speed: 3, up: 0.5, size: 0.05, life: 1.1, colors: ['#7fb83a', '#c8e06a'], spread: 0.2 });
        confetti.emit({ x: p.x, y: 2.6, z: 0 }, 50, { speed: 2.2, up: 0.2, size: 0.07, life: 2.6, colors: FLAG, spread: 2 });
        if (at.ac) MARIMBA.forEach((f, i) => ping(at.ac, f, i * 0.07, 0.35, { type: 'triangle', vol: 0.05 }));
      }
    },
    ambience(ac) {
      const sizzle = noiseLoop(ac, { hp: 3000, lp: 9000, gain: 0.008, swell: 0.6 });
      const street = noiseLoop(ac, { hp: 150, lp: 900, gain: 0.012, swell: 0.4 });
      let alive = true, tm = 0;
      const bird = () => { if (!alive) return; for (let i = 0; i < 3; i++) { const f = 2400 + Math.random() * 1600; ping(ac, f, i * 0.1, 0.08, { vol: 0.015, f2: f * 1.3 }); } tm = setTimeout(bird, 4000 + Math.random() * 6000); };
      tm = setTimeout(bird, 2500);
      return { stop() { alive = false; clearTimeout(tm); sizzle.stop(); street.stop(); } };
    },
    quality() {},
  };
  return place;
}
