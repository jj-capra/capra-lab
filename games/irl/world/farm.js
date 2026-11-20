/* The ballfield (Silo Derby): a farm ballpark on a summer afternoon. You stand at home plate on the dirt, chalk
   batter's boxes either side; the outfield runs away behind you to a green fence (SILO DERBY on it), a cornfield
   past it with the farm's real silos, a red barn and a farmhouse, hills and puffy clouds. Bleachers of fans line
   both sides, light towers, a wooden scoreboard. The game's silos (the targets, drawn by the page) hang over it
   all. A hit gets the crowd up, a corner pocket sets off fireworks over the scoreboard and the organ plays Charge. */
import { THREE, rng, shaderMat, patchStandard, skyDome, bursts, glow, merge, mat, propMat, noiseLoop, ping, rumble, crowd, stands, wordsTex, panel, canvasTex, clumps } from './core.js';

function cornTexture() {
  return canvasTex(256, 512, (g, W, H) => {
    const r = rng(17);
    for (let k = 0; k < 7; k++) {
      const x = 30 + r() * (W - 60), lean = (r() - 0.5) * 30, top = H * (0.04 + r() * 0.12);
      g.strokeStyle = '#4f7a2a'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + lean * 0.3, H * 0.5, x + lean, top + 30); g.stroke();
      // long leaves arching off the stalk
      for (let i = 0; i < 7; i++) {
        const y = H * (0.25 + i * 0.1), s = i % 2 ? 1 : -1, len = 60 + r() * 40;
        g.strokeStyle = i % 3 ? '#5f9a32' : '#4a8a28'; g.lineWidth = 7 - i * 0.5;
        g.beginPath(); g.moveTo(x + lean * (1 - y / H), y); g.quadraticCurveTo(x + s * len * 0.6, y - 30, x + s * len, y + 20 + r() * 20); g.stroke();
      }
      // an ear of corn in its husk, the tassel on top
      g.fillStyle = '#8ab83a'; g.beginPath(); g.ellipse(x + lean * 0.5 + 10, H * 0.5, 9, 26, 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f2d36a'; g.beginPath(); g.ellipse(x + lean * 0.5 + 12, H * 0.47, 5, 14, 0.3, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#d9b24a'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x + lean, top + 30); g.lineTo(x + lean + (i - 2.5) * 7, top - 10 + (i % 2) * 8); g.stroke(); }
    }
  });
}

export default function buildFarm(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(101);
  const fog = new THREE.FogExp2('#cfe2f4', 0.0035);
  scene.fog = fog;
  const SUN = new THREE.Vector3(0.4, 0.55, -0.73).normalize();
  U.uSun.value.copy(SUN);

  scene.add(skyDome(U, /* glsl */ `
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) {
      float h = d.y, sd = max(dot(d, uSun), 0.0);
      vec3 col = mix(S(0.82, 0.9, 0.98), S(0.28, 0.55, 0.92), smoothstep(0.0, 0.45, h)) + S(1.0, 0.95, 0.8) * pow(sd, 30.0) * 0.6;
      vec2 uv = d.xz / max(h + 0.05, 0.03) * 0.45 + vec2(uTime * 0.005, 0.002 * uTime);
      float n = fbm(uv * 1.2 + 2.0), c = smoothstep(0.5, 0.75, n) * smoothstep(0.0, 0.12, h);
      vec3 cloud = mix(S(1.0, 1.0, 1.0), S(0.7, 0.74, 0.84), smoothstep(0.5, 0.8, fbm(uv * 1.2 + 2.0 - uSun.xz * 0.06)));
      return mix(col, cloud, c * 0.92);
    }`));

  const hemi = new THREE.HemisphereLight('#cfe4ff', '#6a7a3a', 1.3);
  const key = new THREE.DirectionalLight('#fff4dc', 3.2);
  key.position.copy(SUN).multiplyScalar(30);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 80 });
  key.shadow.radius = 3; key.shadow.bias = -0.0005;
  scene.add(hemi, key, key.target);

  // the field: dirt round the plate, chalk boxes, the plate itself, grass mowed in checks out to the fence
  const fieldMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.9 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      float ln(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.02, abs(d)); }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz;
      // grass, mowed in a diamond check
      vec2 q = vec2(p.x + p.y, p.x - p.y) / 4.0;
      float chk = mod(floor(q.x) + floor(q.y), 2.0);
      vec3 g = mix(S(0.25, 0.52, 0.2), S(0.32, 0.6, 0.24), chk) * (0.9 + 0.2 * vnoise(p * 6.0));
      // the dirt: round the plate, and the base paths running off behind you
      float dirt = 1.0 - smoothstep(3.6, 3.75, length(p));
      dirt = max(dirt, (1.0 - smoothstep(0.7, 0.85, abs(abs(p.x) - (-p.y) * 0.75) )) * step(p.y, 0.0) * step(-24.0, p.y));
      vec3 d = mix(S(0.62, 0.42, 0.28), S(0.72, 0.5, 0.34), vnoise(p * 4.0)) * (0.92 + 0.15 * vnoise(p * 22.0));
      g = mix(g, d, dirt);
      // chalk: the batter's boxes either side of you, the foul lines
      float chalk = max(ln(abs(p.x) - 0.55, 0.06), ln(abs(p.x) - 1.75, 0.06)) * step(abs(p.y), 0.95);
      chalk = max(chalk, ln(abs(p.y) - 0.95, 0.06) * step(0.55, abs(p.x)) * step(abs(p.x), 1.75));
      chalk = max(chalk, ln(abs(p.x) - (-p.y) * 0.75, 0.08) * step(p.y, -1.0));
      g = mix(g, S(0.96, 0.95, 0.9), chalk);
      // home plate, just in front of your feet
      vec2 hp = p - vec2(0.0, 0.45); float plate = step(abs(hp.x), 0.22) * step(abs(hp.y), 0.16) * step(hp.y * 1.2 + abs(hp.x), 0.25);
      g = mix(g, S(0.98, 0.98, 0.96), plate);
      // the warning track by the fence
      g = mix(g, S(0.55, 0.38, 0.26), smoothstep(-31.0, -31.5, p.y) * step(-36.0, p.y));
      diffuseColor.rgb = g;
    }`,
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), fieldMat);
  field.rotation.x = -Math.PI / 2; field.position.z = -150; field.receiveShadow = true; scene.add(field);

  const props = propMat(U, { rough: 0.7, emitK: 2.2 });
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);

  /* ---- the fence, the scoreboard, light towers, bleachers ---- */
  const park = [];
  for (let x = -40; x <= 40; x += 4) park.push({ geo: B(4.02, 2.6, 0.25), color: x % 8 ? '#1f6a3a' : '#22743f', matrix: mat(x, 1.3, -33.5 - Math.abs(x) * 0.12, 0, Math.sign(x) * 0.12, 0) });
  for (let x = -40; x <= 40; x += 4) park.push({ geo: B(4.02, 0.14, 0.3), color: '#ffd23f', matrix: mat(x, 2.65, -33.5 - Math.abs(x) * 0.12, 0, Math.sign(x) * 0.12, 0) });
  // the scoreboard: a wooden board on legs past the fence in left
  park.push({ geo: B(9, 5, 0.4), color: '#2a4a2e', matrix: mat(-17, 7.5, -42) }, { geo: B(9.4, 0.3, 0.6), color: '#7a4a2a', matrix: mat(-17, 10.1, -42) });
  for (const x of [-20.5, -13.5]) park.push({ geo: B(0.3, 5.5, 0.3), color: '#6a4a2a', matrix: mat(x, 2.6, -42) });
  // light towers, bleachers
  for (const x of [-26, 26]) { park.push({ geo: B(0.5, 20, 0.5), color: '#9aa0aa', matrix: mat(x, 10, -12) }); park.push({ geo: B(4, 2.2, 0.4), color: '#5a606a', matrix: mat(x, 20.5, -12) }); }
  for (const sx of [-1, 1]) for (let k = 0; k < 9; k++) park.push({ geo: B(0.9, 0.4, 16), color: k % 2 ? '#c8ccd4' : '#b0b6c0', matrix: mat(sx * (8 + k * 0.9), 0.3 + k * 0.4, -6) });
  scene.add(new THREE.Mesh(merge(park), props));
  const fenceSign = panel(wordsTex([['SILO DERBY', '#ffd23f']], { w: 1024, h: 160, size: 0.66 }), 9, 1.4); fenceSign.position.set(0, 1.5, -33.3); scene.add(fenceSign);
  for (const [x, n] of [[-24, '330'], [0, '400'], [24, '330']]) { const s = panel(wordsTex([[n, '#fff8ec']], { w: 256, h: 128, size: 0.7 }), 1.6, 0.8); s.position.set(x, 1.8, -33.35 - Math.abs(x) * 0.12); s.rotation.y = Math.sign(x) * 0.12; scene.add(s); }
  const sbTex = canvasTex(512, 280, (g, w, h) => {
    g.fillStyle = '#1f3a24'; g.fillRect(0, 0, w, h);
    g.font = `${Math.round(h * 0.2)}px Bangers, Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; g.fillStyle = '#fff8ec'; g.fillText('SILO DERBY', w / 2, h * 0.2);
    g.font = `800 ${Math.round(h * 0.09)}px Inter, Arial, sans-serif`;
    for (let i = 0; i < 9; i++) { g.fillStyle = '#0d1a10'; g.fillRect(70 + i * 44, h * 0.34, 36, 40); g.fillStyle = '#ffd23f'; g.fillText(String(i + 1), 88 + i * 44, h * 0.31); g.fillStyle = '#fff8ec'; g.fillText(String((i * 7) % 4), 88 + i * 44, h * 0.43); }
    g.fillStyle = '#fff8ec'; g.textAlign = 'left'; g.fillText('HOME', 12, h * 0.43); g.fillText('SILOS', 12, h * 0.62);
    for (let i = 0; i < 9; i++) { g.fillStyle = '#0d1a10'; g.fillRect(70 + i * 44, h * 0.53, 36, 40); }
    g.textAlign = 'center'; g.font = `${Math.round(h * 0.13)}px Bangers, Impact, sans-serif`; g.fillStyle = '#ff8a3d'; g.fillText('CAPRA LAB FARM', w / 2, h * 0.9);
  });
  const sb = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 4.7), new THREE.MeshStandardMaterial({ map: sbTex, roughness: 0.8 })); sb.position.set(-17, 7.5, -41.78); scene.add(sb);
  const sbLights = []; for (let i = 0; i < 12; i++) sbLights.push([-21 + i * 0.73, 10.4, -41.7, i % 3]);
  const towerGlow = [-26, 26].map((x) => { const g = glow(U, '#fff6d8', 7, 0.18); g.position.set(x, 20.5, -11.7); scene.add(g); return g; });
  const fans = crowd(U, [...stands(-14, 2, 8.3, 0.75, 9, { dz: 0.9, dy: 0.4, axis: 'z', seed: 11 }), ...stands(-14, 2, -8.3, 0.75, 9, { dz: -0.9, dy: 0.4, axis: 'z', seed: 12 })], { size: 0.85, light: '#ffffff' });
  scene.add(fans.mesh);

  /* ---- past the fence: the cornfield, the farm (silos, barn, farmhouse), the hills ---- */
  const cornPts = [];
  for (let z = -36; z > -110; z -= 1.1) for (let x = -90; x <= 90; x += 1.1) { if (r() < 0.12) continue; if (Math.abs(x) > (8 - z) * 0.95) continue; cornPts.push([x + (r() - 0.5) * 0.6, z + (r() - 0.5) * 0.6, 0.9 + r() * 0.3]); }
  scene.add(clumps(U, cornPts, cornTexture(), { height: 2.3, width: 1.1, sun: '#fff0c8', amb: '#7f9ac0', sway: 0.15, seed: 4 }));
  const farm = [];
  for (const [x, z, h, rad, col] of [[-30, -120, 22, 4, '#c9cfd6'], [-22, -122, 18, 3.4, '#b8c0c8'], [26, -130, 24, 4.2, '#d4d8de']]) {
    farm.push({ geo: C(rad, rad, h, 24), color: col, matrix: mat(x, h / 2, z) });
    farm.push({ geo: new THREE.SphereGeometry(rad * 1.02, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), color: '#8a96a4', matrix: mat(x, h, z) });
    for (let y = 3; y < h; y += 3) farm.push({ geo: new THREE.TorusGeometry(rad * 1.01, 0.08, 4, 32), color: '#8a929c', matrix: mat(x, y, z, Math.PI / 2) });
  }
  const roof = (w, d, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w * 0.32, h * 0.6); s.lineTo(0, h); s.lineTo(w * 0.32, h * 0.6); s.lineTo(w / 2, 0); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g; };
  farm.push({ geo: B(14, 8, 18), color: '#b3261e', matrix: mat(4, 4, -124) }, { geo: roof(15, 19, 7), color: '#5a4a44', matrix: mat(4, 8, -124) }, { geo: B(5, 6, 0.3), color: '#f4ead7', matrix: mat(4, 3, -114.9) }, { geo: B(4.4, 5.4, 0.35), color: '#8e1d17', matrix: mat(4, 3, -114.85) });
  farm.push({ geo: B(9, 6, 8), color: '#f4f0e6', matrix: mat(-48, 3, -110) }, { geo: roof(10, 9, 4), color: '#3a4a6a', matrix: mat(-48, 6, -110) }, { geo: B(9.4, 0.3, 2), color: '#f4f0e6', matrix: mat(-48, 2.6, -105) });
  scene.add(new THREE.Mesh(merge(farm), props));
  {
    const g = new THREE.PlaneGeometry(900, 160, 120, 8), p = g.attributes.position, cols = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), back = (y + 80) / 160, hh = (Math.sin(x * 0.013 + 1) * 0.5 + 0.5) * 0.6 + (Math.sin(x * 0.04) * 0.5 + 0.5) * 0.4; p.setZ(i, hh * 30 * Math.sin(back * Math.PI * 0.5)); const c = new THREE.Color('#6a9a3a').lerp(new THREE.Color('#8aa8c8'), back * 0.8); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(0, -1, -220); scene.add(m);
  }

  const fireworks = bursts(U, { n: 500, shape: 'drop', grav: -2.5, drag: 0.9, blend: THREE.AdditiveBlending, order: 25 });
  const dust = bursts(U, { n: 60, shape: 'puff', grav: 0.15, drag: 2, opacity: 0.45 });
  scene.add(fireworks.mesh, dust.mesh);
  let cheer = 0;
  const charge = (ac) => [[392, 0], [523, 0.18], [659, 0.36], [784, 0.54], [659, 0.82], [784, 1.0]].forEach(([f, t0], i) => { ping(ac, f, t0, i === 5 ? 0.8 : 0.22, { type: 'square', vol: 0.03 }); ping(ac, f * 2, t0, i === 5 ? 0.8 : 0.22, { type: 'sine', vol: 0.02 }); });

  const place = {
    scene, fog, key, camH: 1.3, exposure: 1.0,
    pup: { tint: new THREE.Color(1.0, 0.98, 0.94), rim: new THREE.Color('#fff4d0').multiplyScalar(0.6), rimDir: [0.5, 0.8] },
    update(dt, t) {
      cheer = Math.max(0, cheer - dt * 0.45); fans.cheer.value = Math.min(1, cheer);
    },
    pulse(kind, at) {
      if (kind === 'rep') { cheer = 1.2; dust.emit({ x: at.foot.x, y: 0.05, z: at.foot.z }, 3, { speed: 0.5, up: 0.3, size: 0.3, life: 1.2, color: '#c8a07a', spread: 0.4 }); }
      else if (kind === 'big') {
        cheer = 2;
        for (let k = 0; k < 4; k++) setTimeout(() => fireworks.emit({ x: -17 + (Math.random() - 0.5) * 20, y: 20 + Math.random() * 8, z: -45 - Math.random() * 6 }, 70, { speed: 6.5, sphere: true, size: 0.45, life: 1.7, colors: ['#ffd23f', '#ff3d8b', '#29d3f0', '#ffffff', '#e8322e'], spread: 0.2, jitter: 0.15 }), k * 380);
        if (at.ac) { charge(at.ac); for (let k = 0; k < 4; k++) rumble(at.ac, 0.15 + k * 0.38, 0.8, { lp: 700, lp2: 80, vol: 0.08, attack: 0.005 }); }
      }
    },
    ambience(ac) {
      const cicadas = noiseLoop(ac, { hp: 4500, lp: 7500, gain: 0.006, swell: 0.9 });
      const murmur = noiseLoop(ac, { hp: 250, lp: 1300, gain: 0.014, swell: 0.4 });
      return { stop() { cicadas.stop(); murmur.stop(); } };
    },
    quality() {},
  };
  return place;
}
