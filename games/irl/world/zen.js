/* The zen studio: a wooden studio at golden hour, its shoji doors slid open onto a garden. The sun goes down
   behind the far mountains and pours in through the doorway in shafts full of dust; its light lies on the
   polished floor around your long shadow. Out there: raked gravel circling mossy rocks, a koi pond with fish
   gliding under the sunset, a cherry tree letting go of its petals (they drift in), bamboo swaying, a stone
   lantern, a bamboo deer-scarer that fills and clacks. Inside: paper lanterns, a bonsai, incense, a gong.
   A rep sends petals swirling, every tenth rings the gong, a new move makes a koi jump. */
import { THREE, rng, NOISE, PUP, shaderMat, patchStandard, skyDome, quadInstances, bursts, canvasTex, glow, merge, mat, propMat, noiseLoop, ping, rumble } from './core.js';

const SUN = new THREE.Vector3(0.22, 0.07, -1).normalize();          // where it shows, low in the doorway
const WALL_Z = -4.2, OPEN_W = 3.3, OPEN_H = 2.95, CEIL = 3.6, GARDEN_Y = -0.16;

export default function buildZen(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(55);
  const fog = new THREE.FogExp2('#f2a77a', 0.006);
  scene.fog = fog;
  U.uSun.value.copy(SUN);
  const Z = { uGong: { value: 0 }, uLant: { value: 1 } };

  /* ---- the sky: a sunset, orange at the sun to violet overhead, streaks of pink cloud ---- */
  scene.add(skyDome(U, /* glsl */ `
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) {
      float h = d.y, sd = max(dot(d, uSun), 0.0);
      vec3 col = mix(S(1.0, 0.6, 0.36), S(0.86, 0.48, 0.62), smoothstep(0.02, 0.25, h));
      col = mix(col, S(0.36, 0.3, 0.62), smoothstep(0.22, 0.7, h));
      col += S(1.0, 0.55, 0.2) * pow(sd, 10.0) * 1.3 + S(1.0, 0.85, 0.55) * pow(sd, 120.0) * 3.0 + vec3(18.0, 13.0, 8.0) * smoothstep(0.9993, 0.9996, sd);
      vec2 uv = vec2(d.x / max(h + 0.05, 0.03) * 0.25, h * 9.0) + vec2(uTime * 0.004, 0.0);
      float c = smoothstep(0.55, 0.8, fbm(uv * vec2(1.0, 3.0))) * smoothstep(0.02, 0.1, h) * smoothstep(0.5, 0.15, h);
      col = mix(col, mix(S(1.0, 0.55, 0.45), S(0.7, 0.36, 0.55), smoothstep(0.05, 0.3, h)) + S(1.0, 0.6, 0.3) * pow(sd, 6.0), c * 0.75);
      return col;
    }`));
  const sunGlow = glow(U, '#ff9a4a', 170, 0.85, { order: -5 });
  scene.add(sunGlow);

  /* ---- far off: mountains in layers of haze, a pagoda on a hill ---- */
  const ridge = (z, h, seed, color, xoff = 0) => {
    const g = new THREE.PlaneGeometry(900, 1, 160, 1), p = g.attributes.position, rr = rng(seed), o = rr() * 50;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), top = p.getY(i) > 0; p.setY(i, top ? h * (0.45 + 0.35 * Math.sin(x * 0.012 + o) + 0.2 * Math.sin(x * 0.037 + o * 2)) : -30); }
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, fog: false }));
    m.position.set(xoff, GARDEN_Y, z); return m;
  };
  scene.add(ridge(-420, 110, 1, '#c07a8c'), ridge(-300, 80, 2, '#9c5c78'), ridge(-190, 50, 3, '#7a4562'), ridge(-110, 26, 4, '#5a3550'));
  {
    const pg = [];
    for (let k = 0; k < 5; k++) { pg.push({ geo: new THREE.BoxGeometry(5 - k * 0.6, 2.4, 5 - k * 0.6), color: '#3e2438', matrix: mat(0, 1.2 + k * 3.2, 0) }); pg.push({ geo: new THREE.ConeGeometry((7 - k * 0.7) * 0.75, 1.2, 4), color: '#2e1a2a', matrix: mat(0, 2.9 + k * 3.2, 0, 0, Math.PI / 4) }); }
    pg.push({ geo: new THREE.CylinderGeometry(0.1, 0.1, 4, 5), color: '#2e1a2a', matrix: mat(0, 18.5, 0) });
    const pag = new THREE.Mesh(merge(pg), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    pag.position.set(-38, 12, -112); scene.add(pag);
  }

  /* ---- light: the low sun through the doorway (the walls shade the rest), a warm room ---- */
  const hemi = new THREE.HemisphereLight('#ffd2a8', '#6b4630', 0.55);
  const key = new THREE.DirectionalLight('#ffb36b', 3.0);
  key.position.set(0.22, 0.42, -1).normalize().multiplyScalar(30);
  key.target.position.set(0, 0, -1.5);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 70 });
  key.shadow.radius = 3; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
  const bounce = new THREE.PointLight('#ff9c5a', 6, 9, 1.4); bounce.position.set(0.4, 0.6, -1.0);
  const lampL = new THREE.PointLight('#ffb070', 3, 6, 1.6); lampL.position.set(-2.3, 2.3, -1.4);
  scene.add(hemi, key, key.target, bounce, lampL);

  /* ---- the floor: polished wooden planks mirroring the doorway, the lanterns and you ---- */
  const floorMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.42 }), U, {
    uniforms: Z, pup: true,
    decl: /* glsl */ `
      uniform float uLant;
      vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      // what the doorway shows, seen in the floor: the sunset over the garden
      vec3 doorway(vec3 H) {
        float y = H.y;
        vec3 garden = mix(S(0.42, 0.36, 0.26), S(0.75, 0.62, 0.48), smoothstep(-0.2, 0.6, y));
        vec3 skyc = mix(S(1.0, 0.62, 0.38), S(0.86, 0.5, 0.6), smoothstep(1.2, 2.6, y));
        return mix(garden, skyc, smoothstep(0.55, 1.0, y)) + S(1.0, 0.7, 0.4) * exp(-pow((H.x - 0.6) * 1.2, 2.0) - pow((y - 0.9) * 2.0, 2.0)) * 0.7;
      }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz; float pw = 0.19, pi = floor(p.x / pw), fx = fract(p.x / pw);
      float off = h21(vec2(pi, 3.0)) * 3.0, pj = floor((p.y + off) / 2.4), fz = fract((p.y + off) / 2.4);
      float tone = h21(vec2(pi, pj));
      vec3 wood = mix(S(0.58, 0.38, 0.2), S(0.74, 0.52, 0.3), tone);
      float grain = vnoise(vec2(p.x * 40.0, p.y * 2.2 + tone * 9.0)) * 0.6 + vnoise(vec2(p.x * 90.0, p.y * 5.0)) * 0.4;
      wood *= 0.82 + 0.3 * grain;
      float seam = (1.0 - smoothstep(0.0, 0.035, fx)) + (1.0 - smoothstep(0.0, 0.006, fz));
      diffuseColor.rgb = mix(wood, S(0.18, 0.1, 0.06), clamp(seam, 0.0, 1.0) * 0.8);
    }`,
    post: /* glsl */ `{
      vec3 V = normalize(vWP - cameraPosition);
      vec3 N = normalize(vec3((vnoise(vWP.xz * vec2(30.0, 3.0)) - 0.5) * 0.03, 1.0, 0.0));
      vec3 Rf = reflect(V, N);
      vec3 refl = S(0.16, 0.1, 0.07);
      if (Rf.z < -0.01) {
        float t = (${WALL_Z.toFixed(2)} - vWP.z) / Rf.z;
        vec3 H = vWP + Rf * t;
        float blur = 0.04 + t * 0.03;
        float inDoor = smoothstep(${OPEN_W.toFixed(2)} + blur, ${OPEN_W.toFixed(2)} - blur, abs(H.x)) * smoothstep(${OPEN_H.toFixed(2)} + blur, ${OPEN_H.toFixed(2)} - blur, H.y);
        refl = mix(S(0.28, 0.19, 0.13), doorway(H), inDoor);
      }
      // the lanterns, streaked a little down the polish
      for (int i = 0; i < 2; i++) {
        vec3 L = i == 0 ? vec3(-2.3, 2.45, -1.4) : vec3(2.5, 2.55, -2.6);
        vec3 toL = L - vWP; float t = max(dot(toL, Rf), 0.05); vec3 off = vWP + Rf * t - L;
        refl += S(1.0, 0.55, 0.25) * uLant * exp(-pow(abs(off.x) / t / 0.05, 2.0) - pow(length(off.yz) / t / 0.12, 2.0)) * 2.5;
      }
      vec4 pr = pupRefl(vWP, vec2(0.0));
      refl = mix(refl, pr.rgb * 0.75, pr.a * 0.85);
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-V, N), 0.0), 5.0);
      outgoingLight = mix(outgoingLight, refl, clamp(0.18 + fres * 0.8, 0.0, 0.85));
    }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, WALL_Z + 5); floor.receiveShadow = true;
  scene.add(floor);

  /* ---- the room: the back wall round the doorway, side walls of glowing shoji, the ceiling and its beams ---- */
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
  const shojiTex = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#f6ead2'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(255,190,120,0.25)'); grd.addColorStop(1, 'rgba(255,160,90,0.05)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#4a2e1c'; g.lineWidth = 7;
    for (let x = 0; x <= w; x += w / 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += h / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.lineWidth = 16; g.strokeRect(0, 0, w, h);
  });
  // the paper glows with the evening behind it
  const shojiMat = new THREE.MeshStandardMaterial({ map: shojiTex, emissive: '#ffb878', emissiveMap: shojiTex, emissiveIntensity: 0.55, roughness: 0.9 });
  const wallMat = propMat(U, { rough: 0.85 });
  const walls = [];
  const sideW = 8 - OPEN_W;
  walls.push({ geo: B(sideW, CEIL, 0.25), color: '#d9c7a8', matrix: mat(-(OPEN_W + sideW / 2), CEIL / 2, WALL_Z - 0.12) });
  walls.push({ geo: B(sideW, CEIL, 0.25), color: '#d9c7a8', matrix: mat(OPEN_W + sideW / 2, CEIL / 2, WALL_Z - 0.12) });
  walls.push({ geo: B(OPEN_W * 2 + 0.4, CEIL - OPEN_H, 0.25), color: '#d9c7a8', matrix: mat(0, (CEIL + OPEN_H) / 2, WALL_Z - 0.12) });
  walls.push({ geo: B(OPEN_W * 2 + 0.6, 0.24, 0.34), color: '#5a3820', matrix: mat(0, OPEN_H + 0.12, WALL_Z) });           // the lintel
  for (const x of [-OPEN_W - 0.12, OPEN_W + 0.12, -7.9, 7.9]) walls.push({ geo: B(0.26, CEIL, 0.3), color: '#5a3820', matrix: mat(x, CEIL / 2, WALL_Z) });
  walls.push({ geo: B(16, 0.12, 0.3), color: '#5a3820', matrix: mat(0, 0.06, WALL_Z) });                                     // the sill
  for (const sx of [-1, 1]) {
    walls.push({ geo: B(0.25, CEIL, 10), color: '#d9c7a8', matrix: mat(sx * 5.2, CEIL / 2, WALL_Z + 5) });
    for (let z = WALL_Z; z <= WALL_Z + 9; z += 1.8) walls.push({ geo: B(0.3, CEIL, 0.2), color: '#5a3820', matrix: mat(sx * 5.05, CEIL / 2, z) });
  }
  walls.push({ geo: B(16, 0.2, 12), color: '#3b2618', matrix: mat(0, CEIL + 0.1, WALL_Z + 5) });                             // the ceiling
  for (let z = WALL_Z + 0.5; z < WALL_Z + 10; z += 1.4) walls.push({ geo: B(11, 0.22, 0.2), color: '#4a2e1a', matrix: mat(0, CEIL - 0.11, z) });
  const room = new THREE.Mesh(merge(walls), wallMat);
  room.castShadow = true; room.receiveShadow = true;
  scene.add(room);
  // shoji panels: slid open to either side of the doorway, closed along the side walls (glowing)
  const shoji = (x, y, z, ry, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), shojiMat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  for (const sx of [-1, 1]) {
    shoji(sx * (OPEN_W + 1.0), OPEN_H / 2, WALL_Z + 0.02, 0, 1.6, OPEN_H);
    shoji(sx * (OPEN_W + 2.65), OPEN_H / 2, WALL_Z + 0.01, 0, 1.6, OPEN_H);
    for (let z = WALL_Z + 0.9; z <= WALL_Z + 8.5; z += 1.8) shoji(sx * 5.06, OPEN_H / 2 + 0.05, z, -sx * Math.PI / 2, 1.6, OPEN_H);
  }
  // the scroll with its brush circle
  const ensoTex = canvasTex(256, 640, (g, w, h) => {
    g.fillStyle = '#f3ead6'; g.fillRect(0, 0, w, h); g.fillStyle = '#6b3a22'; g.fillRect(0, 0, w, 22); g.fillRect(0, h - 26, w, 26);
    g.strokeStyle = '#1a1412'; g.lineCap = 'round';
    for (let a = 0.35; a < Math.PI * 1.9; a += 0.02) { g.lineWidth = 20 * (1 - a / 7) + 4; g.beginPath(); g.arc(w / 2, h * 0.42, 80, a, a + 0.03); g.stroke(); }
    g.fillStyle = '#c4262b'; g.fillRect(w * 0.62, h * 0.72, 30, 30);
  });
  const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.55), new THREE.MeshStandardMaterial({ map: ensoTex, roughness: 0.9 }));
  scroll.position.set(-5.06, 1.65, -1.3); scroll.rotation.y = Math.PI / 2; scene.add(scroll);
  const scroll2 = scroll.clone(); scroll2.position.set(-OPEN_W - 2.6, 1.7, WALL_Z + 0.04); scroll2.rotation.y = 0; scene.add(scroll2);

  /* ---- the light pouring in: shafts from the doorway, dust turning in them ---- */
  const sunIn = new THREE.Vector3(-0.22, -0.42, 1).normalize();
  const shaftMat = shaderMat(U, {
    vertex: /* glsl */ `attribute float aK; varying float vK; varying vec3 vP; void main() { vK = aK; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `uniform float uTime; varying float vK; varying vec3 vP; ${NOISE}
      void main() {
        float streak = 0.5 + 0.5 * vnoise(vec2(vP.x * 2.6 + vP.y * 1.3, uTime * 0.05));
        float a = (1.0 - smoothstep(0.05, 1.0, vK)) * streak * 0.07;
        gl_FragColor = vec4(vec3(1.0, 0.7, 0.4) * a, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
  });
  {
    // the doorway pushed along the light: a slanted box of light, aK 0 at the doorway to 1 at its far end
    const L = 7.5, corners = [[-OPEN_W, 0.02], [OPEN_W, 0.02], [OPEN_W, OPEN_H], [-OPEN_W, OPEN_H]];
    const pos = [], kk = [];
    const at = (cx, cy, k) => [cx + sunIn.x * L * k, cy + sunIn.y * L * k, WALL_Z + sunIn.z * L * k];
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = corners[i], [bx, by] = corners[(i + 1) % 4];
      const q = [at(ax, ay, 0), at(bx, by, 0), at(bx, by, 1), at(ax, ay, 1)], qk = [0, 0, 1, 1];
      for (const j of [0, 2, 1, 0, 3, 2]) { pos.push(...q[j]); kk.push(qk[j]); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aK', new THREE.Float32BufferAttribute(kk, 1));
    const sh = new THREE.Mesh(g, shaftMat);
    sh.material.side = THREE.DoubleSide;
    sh.renderOrder = 14; scene.add(sh);
  }
  const dustN = 260;
  const dustMat = shaderMat(U, {
    vertex: /* glsl */ `attribute vec4 aD; uniform float uTime; varying vec2 vUv; varying float vA;
      void main() {
        float k = fract(aD.w + uTime * 0.01);
        vec3 p = vec3(aD.x + sin(uTime * 0.2 + aD.w * 30.0) * 0.3, aD.y + sin(uTime * 0.15 + aD.w * 17.0) * 0.25, ${WALL_Z.toFixed(2)} + aD.z + sin(uTime * 0.1 + aD.w * 9.0) * 0.4);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        mv.xy += vec2(position.x, position.y - 0.5) * 0.012;
        gl_Position = projectionMatrix * mv; vUv = vec2(position.x + 0.5, position.y);
        vA = 0.5 + 0.5 * sin(uTime * 1.5 + aD.w * 40.0);
      }`,
    fragment: /* glsl */ `varying vec2 vUv; varying float vA;
      void main() { float a = smoothstep(1.0, 0.0, length(vUv - 0.5) * 2.0) * (0.3 + 0.7 * vA); gl_FragColor = vec4(vec3(1.0, 0.8, 0.55) * a * 1.5, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  // dust only where the light is: start in the doorway, carried along the shaft
  const dust = new THREE.Mesh(quadInstances(dustN, [['aD', 4, (a, o) => { const k = r() * 6, x = (r() - 0.5) * OPEN_W * 2, y = r() * OPEN_H; a.set([x + sunIn.x * k, y + sunIn.y * k, sunIn.z * k, r()], o); }]]), dustMat);
  dust.frustumCulled = false; dust.renderOrder = 21; scene.add(dust);

  /* ---- inside: paper lanterns, a gong, a bonsai, incense, a cushion ---- */
  const props = propMat(U, { rough: 0.6, emitK: 2.8 });
  const lantern = (x, y, z) => {
    const g = new THREE.Group(); g.position.set(x, CEIL, z);
    g.add(new THREE.Mesh(merge([
      { geo: C(0.01, 0.01, CEIL - y - 0.3, 4), color: '#222', matrix: mat(0, -(CEIL - y - 0.3) / 2, 0) },
      { geo: C(0.12, 0.12, 0.06, 14), color: '#1a1a1a', matrix: mat(0, -(CEIL - y) + 0.33, 0) },
      { geo: new THREE.SphereGeometry(0.28, 18, 14), color: '#e8402f', matrix: mat(0, -(CEIL - y), 0, 0, 0, 0, [1, 1.25, 1]), emit: 1.1 },
      { geo: C(0.12, 0.12, 0.06, 14), color: '#1a1a1a', matrix: mat(0, -(CEIL - y) - 0.34, 0) },
      { geo: B(0.02, 0.2, 0.02), color: '#ffd23f', matrix: mat(0, -(CEIL - y) - 0.46, 0) },
    ]), props));
    const gl = glow(U, '#ff8a4a', 1.6, 0.7); gl.position.set(0, -(CEIL - y), 0.05); g.add(gl);
    scene.add(g); return { g, gl };
  };
  const lanterns = [lantern(-2.3, 2.45, -1.4), lantern(2.5, 2.55, -2.6)];
  // the gong on its frame
  scene.add(new THREE.Mesh(merge([
    { geo: B(0.12, 2.1, 0.12), color: '#4a2a18', matrix: mat(-0.75, 1.05, 0) },
    { geo: B(0.12, 2.1, 0.12), color: '#4a2a18', matrix: mat(0.75, 1.05, 0) },
    { geo: B(1.85, 0.14, 0.16), color: '#4a2a18', matrix: mat(0, 2.1, 0) },
    { geo: B(0.5, 0.08, 0.5), color: '#3a2214', matrix: mat(-0.75, 0.04, 0) },
    { geo: B(0.5, 0.08, 0.5), color: '#3a2214', matrix: mat(0.75, 0.04, 0) },
  ]), props).translateX(-3.6).translateZ(-2.7).rotateY(0.35));
  const gong = new THREE.Group(); gong.position.set(-3.6, 2.03, -2.7); gong.rotation.y = 0.35; scene.add(gong);
  const gongMat = patchStandard(new THREE.MeshStandardMaterial({ color: '#c8932e', metalness: 0.85, roughness: 0.28 }), U, {
    uniforms: Z, decl: 'uniform float uGong;',
    emissive: 'float rr = length(vWP.xy - vec2(-3.6, 1.35)); totalEmissiveRadiance += vec3(1.0, 0.7, 0.3) * uGong * (0.6 + 0.4 * sin(rr * 40.0 - uTime * 30.0));',
  });
  const disc = new THREE.Mesh(C(0.62, 0.62, 0.06, 40), gongMat); disc.rotation.x = Math.PI / 2; disc.position.y = -0.68;
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10), gongMat); boss.scale.z = 0.5; boss.position.set(0, -0.68, 0.04);
  gong.add(disc, boss, new THREE.Mesh(merge([{ geo: C(0.008, 0.008, 0.08, 4), color: '#c4262b', matrix: mat(-0.35, -0.04, 0) }, { geo: C(0.008, 0.008, 0.08, 4), color: '#c4262b', matrix: mat(0.35, -0.04, 0) }]), props));
  // the bonsai on its stand, the incense, a cushion
  const bon = [{ geo: B(1.1, 0.35, 0.6), color: '#3a2214', matrix: mat(0, 0.18, 0) }, { geo: B(0.6, 0.22, 0.36), color: '#2b3a67', matrix: mat(0, 0.46, 0) }];
  for (let k = 0; k < 5; k++) bon.push({ geo: C(0.035 - k * 0.004, 0.05 - k * 0.005, 0.24, 6), color: '#5a3a22', matrix: mat(Math.sin(k * 1.3) * 0.08, 0.66 + k * 0.18, 0, 0, 0, Math.sin(k * 1.7) * 0.5) });
  for (const [x, y, z, s] of [[-0.25, 1.35, 0, 0.26], [0.18, 1.5, 0.05, 0.3], [0.32, 1.22, -0.05, 0.2], [-0.05, 1.62, -0.02, 0.22], [-0.38, 1.14, 0.06, 0.16]]) bon.push({ geo: new THREE.IcosahedronGeometry(s, 1), color: '#3f7a3a', matrix: mat(x, y, z, 0, 0, 0, [1, 0.55, 0.8]) });
  scene.add(new THREE.Mesh(merge(bon), props).translateX(3.4).translateZ(-2.2).rotateY(-0.3));
  scene.add(new THREE.Mesh(merge([{ geo: B(0.75, 0.1, 0.75), color: '#7a2a3a', matrix: mat(0, 0.05, 0) }, { geo: new THREE.SphereGeometry(0.06, 8, 6), color: '#ffd23f', matrix: mat(0, 0.11, 0) }]), props).translateX(2.2).translateZ(-1.0).rotateY(0.2));
  const incenseAt = new THREE.Vector3(2.75, 0.9, -2.15);
  scene.add(new THREE.Mesh(merge([{ geo: C(0.09, 0.07, 0.08, 12), color: '#2a2a2e', matrix: mat(0, 0.6, 0) }, { geo: C(0.005, 0.005, 0.28, 3), color: '#8a4a2a', matrix: mat(0, 0.76, 0, 0.15) }, { geo: new THREE.SphereGeometry(0.012, 6, 4), color: '#ff5a1a', matrix: mat(0.02, 0.9, 0), emit: 4 }]), props).translateX(2.73).translateZ(-2.15));

  /* ---- the garden ---- */
  // the veranda outside the doorway, the step down
  scene.add(new THREE.Mesh(merge([
    { geo: B(16, 0.1, 1.1), color: '#7a5434', matrix: mat(0, -0.06, WALL_Z - 0.7) },
    { geo: new THREE.CylinderGeometry(0.35, 0.42, 0.12, 7), color: '#8a8378', matrix: mat(0.4, -0.12, WALL_Z - 1.6, 0, 0.3, 0, [1.3, 1, 1]) },
  ]), props));
  const ROCKS = [[-1.6, -7.2, 0.7], [1.9, -9.6, 0.9], [-0.2, -12.0, 0.6], [3.6, -6.6, 0.45]];
  const gravelMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.95 }), U, {
    uniforms: { uRocks: { value: ROCKS.map(([x, z, s]) => new THREE.Vector3(x, z, s)) } },
    decl: /* glsl */ `uniform vec3 uRocks[${ROCKS.length}]; vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz;
      // raked lines across the garden, turning into rings round each rock
      float lines = p.y * 9.0, near = 0.0;
      for (int i = 0; i < ${ROCKS.length}; i++) { float d = length(p - uRocks[i].xy); float w = 1.0 - smoothstep(uRocks[i].z + 0.9, uRocks[i].z + 1.4, d); if (w > near) { near = w; lines = mix(lines, d * 9.0, w); } }
      float rake = 0.5 + 0.5 * sin(lines * 6.2832);
      vec3 g = mix(S(0.72, 0.68, 0.6), S(0.88, 0.85, 0.78), rake) * (0.9 + 0.2 * vnoise(p * 30.0));
      // moss under the rocks
      for (int i = 0; i < ${ROCKS.length}; i++) { float d = length(p - uRocks[i].xy) - uRocks[i].z * 1.05; g = mix(g, mix(S(0.25, 0.4, 0.12), S(0.38, 0.55, 0.18), vnoise(p * 6.0)), 1.0 - smoothstep(0.0, 0.25 + vnoise(p * 3.0) * 0.2, d)); }
      diffuseColor.rgb = g;
    }`,
  });
  const gravel = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), gravelMat);
  gravel.rotation.x = -Math.PI / 2; gravel.position.set(0, GARDEN_Y, WALL_Z - 16); gravel.receiveShadow = true; scene.add(gravel);
  const rockParts = ROCKS.map(([x, z, s], i) => ({ geo: new THREE.DodecahedronGeometry(s, 1), color: ['#5e5a55', '#4f4b47', '#6a645c', '#575049'][i], matrix: mat(x, GARDEN_Y + s * 0.35, z, r(), r() * 3, r() * 0.4, [1.2, 0.75, 1]) }));
  scene.add(new THREE.Mesh(merge(rockParts), propMat(U, { rough: 0.95 })));
  // a stone lantern
  scene.add(new THREE.Mesh(merge([
    { geo: C(0.3, 0.38, 0.2, 6), color: '#8a8378', matrix: mat(0, 0.1, 0) },
    { geo: C(0.12, 0.14, 0.8, 8), color: '#8a8378', matrix: mat(0, 0.6, 0) },
    { geo: B(0.5, 0.12, 0.5), color: '#8a8378', matrix: mat(0, 1.06, 0) },
    { geo: B(0.36, 0.34, 0.36), color: '#7d766b', matrix: mat(0, 1.29, 0) },
    { geo: B(0.24, 0.2, 0.38), color: '#ffcf80', matrix: mat(0, 1.29, 0), emit: 1.6 },
    { geo: new THREE.ConeGeometry(0.5, 0.36, 6), color: '#8a8378', matrix: mat(0, 1.64, 0) },
    { geo: new THREE.SphereGeometry(0.08, 8, 6), color: '#8a8378', matrix: mat(0, 1.86, 0) },
  ]), props).translateX(2.7).translateY(GARDEN_Y).translateZ(-7.6));
  const toroGlow = glow(U, '#ffb050', 1.2, 0.6); toroGlow.position.set(2.7, GARDEN_Y + 1.29, -7.35); scene.add(toroGlow);
  // the koi pond, the fish under the sunset, a little red bridge
  const POND = { x: -1.4, z: -9.6, rx: 2.6, rz: 1.5 };
  const koiN = 7;
  const koiMat = shaderMat(U, {
    uniforms: { uJump: { value: -99 } },
    vertex: /* glsl */ `attribute vec4 aK; uniform float uTime; uniform float uJump; varying vec2 vUv; varying float vK;
      void main() {
        float sp = 0.25 + aK.w * 0.25, a = uTime * sp + aK.w * 20.0, rr = 0.45 + aK.z * 0.5;
        vec2 c = vec2(${POND.x.toFixed(2)} + cos(a) * ${POND.rx.toFixed(2)} * rr, ${POND.z.toFixed(2)} + sin(a) * ${POND.rz.toFixed(2)} * rr);
        vec2 dir = normalize(vec2(-sin(a) * ${POND.rx.toFixed(2)}, cos(a) * ${POND.rz.toFixed(2)}));
        float y = ${(GARDEN_Y - 0.12).toFixed(2)};
        // one koi leaps when a move starts
        float j = uTime - uJump;
        if (aK.w < 0.15 && j > 0.0 && j < 1.1) { y += 4.0 * j * (1.1 - j) * 1.3; }
        vec2 side = vec2(-dir.y, dir.x);
        float wig = sin(uTime * 6.0 + aK.w * 9.0 + position.y * 5.0) * 0.06 * (1.0 - position.y);
        vec2 xz = c + dir * (position.y - 0.5) * 0.55 + side * (position.x * 0.2 * (1.0 - abs(position.y - 0.55) * 1.4) + wig);
        gl_Position = projectionMatrix * viewMatrix * vec4(xz.x, y, xz.y, 1.0);
        vUv = vec2(position.x + 0.5, position.y); vK = aK.w;
      }`,
    fragment: /* glsl */ `varying vec2 vUv; varying float vK; ${NOISE}
      void main() {
        vec2 p = vUv - 0.5; float body = length(p * vec2(1.8, 1.0)) - 0.45; if (body > 0.0) discard;
        float spots = step(0.55, vnoise(vUv * 6.0 + vK * 30.0));
        vec3 col = vK < 0.5 ? mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.95, 0.9), spots) : mix(vec3(1.0, 0.95, 0.9), vec3(0.95, 0.25, 0.05), spots);
        if (vK > 0.85) col = mix(col, vec3(0.05), step(0.7, vnoise(vUv * 9.0)));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
  const koi = new THREE.Mesh(quadInstances(koiN, [['aK', 4, (a, o, i) => a.set([0, 0, r(), i / koiN + 0.02], o)]]), koiMat);
  koi.frustumCulled = false; scene.add(koi);
  const waterMat = shaderMat(U, {
    vertex: /* glsl */ `varying vec3 vWp; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragment: /* glsl */ `uniform float uTime; uniform vec3 uSun; varying vec3 vWp; ${NOISE}
      vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      void main() {
        vec2 w = vec2(vnoise(vWp.xz * 4.0 + uTime * 0.3), vnoise(vWp.xz * 4.0 - uTime * 0.25)) - 0.5;
        vec3 V = normalize(vWp - cameraPosition), R = reflect(V, normalize(vec3(w.x * 0.15, 1.0, w.y * 0.15)));
        vec3 sk = mix(S(1.0, 0.6, 0.36), S(0.5, 0.3, 0.6), smoothstep(0.02, 0.5, R.y)) + S(1.0, 0.7, 0.4) * pow(max(dot(R, uSun), 0.0), 60.0) * 3.0;
        float fres = 0.1 + 0.9 * pow(1.0 - max(dot(-V, vec3(0.0, 1.0, 0.0)), 0.0), 4.0);
        vec3 col = mix(S(0.05, 0.16, 0.16), sk, fres);
        gl_FragColor = vec4(col, 0.55 + fres * 0.4);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 40), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set(POND.x, GARDEN_Y + 0.02, POND.z); water.scale.set(POND.rx, POND.rz, 1); water.renderOrder = 8; scene.add(water);
  scene.add(new THREE.Mesh(merge([
    ...Array.from({ length: 9 }, (_, i) => { const a = i / 8 * Math.PI; return { geo: B(0.3, 0.07, 0.9), color: '#c8322a', matrix: mat(-1.2 + i * 0.3, Math.sin(a) * 0.45, 0, 0, 0, -Math.cos(a) * 0.95) }; }),
    { geo: B(2.7, 0.06, 0.05), color: '#a8261f', matrix: mat(0, 0.75, 0.42) },
    { geo: B(2.7, 0.06, 0.05), color: '#a8261f', matrix: mat(0, 0.75, -0.42) },
  ]), props).translateX(POND.x + 1.7).translateY(GARDEN_Y).translateZ(POND.z - 0.3).rotateY(0.9));
  // the deer-scarer: a bamboo tube that fills, tips, clacks on its stone
  const tube = new THREE.Mesh(merge([{ geo: C(0.06, 0.06, 0.9, 10), color: '#9ab048', matrix: mat(0, 0, 0, 0, 0, Math.PI / 2) }]), props);
  const tubePivot = new THREE.Group(); tubePivot.position.set(POND.x - 2.2, GARDEN_Y + 0.45, POND.z + 0.9); tubePivot.rotation.y = 0.4; tubePivot.add(tube); tube.position.x = 0.15; scene.add(tubePivot);
  scene.add(new THREE.Mesh(merge([{ geo: B(0.06, 0.5, 0.06), color: '#7a8a3a', matrix: mat(0, 0.25, 0.1) }, { geo: B(0.06, 0.5, 0.06), color: '#7a8a3a', matrix: mat(0, 0.25, -0.1) }]), props).translateX(POND.x - 2.2).translateY(GARDEN_Y).translateZ(POND.z + 0.9));
  // the cherry tree: a dark trunk, a cloud of pink blossom
  {
    const tp = [{ geo: C(0.16, 0.24, 2.2, 8), color: '#3a2420', matrix: mat(0, 1.1, 0, 0, 0, 0.08) }];
    for (const [a, l] of [[0.7, 1.6], [-0.6, 1.4], [0.2, 1.2], [1.4, 1.1], [-1.3, 1.2]]) tp.push({ geo: C(0.05, 0.1, l, 6), color: '#3a2420', matrix: mat(Math.sin(a) * l * 0.4, 2.2 + Math.cos(a) * l * 0.35, 0, 0, a * 0.3, -a * 0.8) });
    const pinks = ['#ffb7d0', '#ffc9dc', '#f79ac0', '#ffd8e6', '#f28cb6'];
    for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = Math.pow(r(), 0.5) * 2.0; tp.push({ geo: new THREE.IcosahedronGeometry(0.45 + r() * 0.4, 1), color: pinks[i % 5], matrix: mat(Math.cos(a) * d, 2.9 + r() * 1.2 - d * 0.25, Math.sin(a) * d * 0.7), emit: 0.12 }); }
    scene.add(new THREE.Mesh(merge(tp), propMat(U, { rough: 0.9, emitK: 1.5 })).translateX(3.9).translateY(GARDEN_Y).translateZ(-10.2));
  }
  // the bamboo grove, swaying
  const bambooParts = [{ geo: C(0.06, 0.07, 7, 7), color: '#7a9a3a', matrix: mat(0, 3.5, 0) }];
  for (let y = 0.6; y < 7; y += 0.7) bambooParts.push({ geo: C(0.075, 0.075, 0.05, 7), color: '#5a7a2a', matrix: mat(0, y, 0) });
  // leaves: long narrow blades in sprays off the top half
for (let k = 0; k < 26; k++) { const a = k * 2.4, y = 3.6 + (k / 26) * 3.2, l = 0.45 + (k % 3) * 0.1; bambooParts.push({ geo: new THREE.SphereGeometry(0.5, 6, 4), color: ['#5d8a2e', '#4c7a26', '#6b9a36'][k % 3], matrix: mat(Math.cos(a) * l * 0.5, y, Math.sin(a) * l * 0.5, 0, -a, -0.5, [l, 0.03, 0.09]) }); }
  const bambooMat = patchStandard(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), U, {
    vbegin: /* glsl */ `{
      vec2 base = vec2(0.0);
      #ifdef USE_INSTANCING
        base = instanceMatrix[3].xz;
      #endif
      float h = max(position.y, 0.0) / 7.0;
      transformed.x += (sin(uTime * 0.9 + base.x * 0.7) * 0.25 + sin(uTime * 2.1 + base.y) * 0.05) * h * h;
    }`,
  });
  const stalks = [];
  for (let i = 0; i < 70 && stalks.length < 34; i++) { const x = -3.4 - r() * 6, z = -6.8 - r() * 7; if (Math.hypot(x - POND.x, (z - POND.z) * 1.4) < 3) continue; stalks.push([x, z, 0.8 + r() * 0.5]); }
  const bamboo = new THREE.InstancedMesh(merge(bambooParts), bambooMat, stalks.length);
  stalks.forEach(([x, z, s], i) => bamboo.setMatrixAt(i, mat(x, GARDEN_Y, z, (r() - 0.5) * 0.1, r() * 6, (r() - 0.5) * 0.1, [1, s, 1])));
  scene.add(bamboo);
  // the garden wall with its tiled roof, closing off the garden
  scene.add(new THREE.Mesh(merge([
    { geo: B(40, 1.3, 0.4), color: '#d8c3a0', matrix: mat(0, GARDEN_Y + 0.65, -16.5) },
    { geo: B(40, 0.16, 1.0), color: '#3a3438', matrix: mat(0, GARDEN_Y + 1.38, -16.5) },
    { geo: B(40, 0.1, 0.7), color: '#4a444a', matrix: mat(0, GARDEN_Y + 1.5, -16.5) },
  ]), props));

  /* ---- petals: falling from the cherry and drifting in on the breeze; a flurry on every rep ---- */
  const petalN = 420;
  const petalMat = shaderMat(U, {
    uniforms: { uGust: { value: 0 } },
    vertex: /* glsl */ `attribute vec4 aP; uniform float uTime; uniform float uGust; varying vec2 vUv; varying float vC;
      void main() {
        float life = 9.0 + aP.w * 6.0, k = fract(uTime / life + aP.w * 7.0);
        vec3 p = vec3(aP.x + k * 2.5 * (0.5 + aP.w), 4.2 - k * 4.8 + sin(k * 12.0 + aP.w * 30.0) * 0.2, aP.z + k * 13.0 * (0.6 + aP.w * 0.6));
        p.x += sin(uTime * 0.8 + aP.w * 20.0) * 0.4 + uGust * sin(aP.w * 40.0) * 1.2;
        p.y = max(p.y, ${GARDEN_Y.toFixed(2)} + 0.02);
        if (p.z > ${WALL_Z.toFixed(2)} && p.y < 0.01) p.y = 0.01;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float a = uTime * (2.0 + aP.w * 3.0) + aP.w * 50.0;
        vec2 c = vec2(position.x, position.y - 0.5);
        c = mat2(cos(a), -sin(a), sin(a), cos(a)) * c * vec2(1.0, 0.45 + 0.55 * abs(sin(uTime * 3.0 + aP.w * 9.0)));
        mv.xy += c * 0.05;
        gl_Position = projectionMatrix * mv; vUv = vec2(position.x + 0.5, position.y); vC = aP.w;
      }`,
    fragment: /* glsl */ `varying vec2 vUv; varying float vC;
      void main() { vec2 p = vUv - 0.5; float d = length(p * vec2(1.0, 1.4)); if (d > 0.5 || (p.y > 0.3 && abs(p.x) < 0.06)) discard;
        vec3 col = mix(vec3(1.0, 0.72, 0.84), vec3(1.0, 0.86, 0.92), vC); gl_FragColor = vec4(col * (1.0 - d * 0.4), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
  const petals = new THREE.Mesh(quadInstances(petalN, [['aP', 4, (a, o) => a.set([3.9 + (r() - 0.5) * 4, 0, -10.2 + (r() - 0.5) * 2.5, r()], o)]]), petalMat);
  petals.frustumCulled = false; scene.add(petals);
  const flurry = bursts(U, { n: 160, shape: 'petal', grav: -0.6, drag: 1.8 });
  const smoke = bursts(U, { n: 40, shape: 'puff', grav: 0.12, drag: 1.0, opacity: 0.3 });
  const splash = bursts(U, { n: 40, shape: 'drop', grav: -7, drag: 0.3 });
  scene.add(flurry.mesh, smoke.mesh, splash.mesh);

  /* ---- sounds: wind chimes now and then, the deer-scarer's clack, the gong ---- */
  const PENTA = [1046, 1175, 1397, 1568, 1760, 2093, 2349];
  const chimes = (ac, n = 4) => { for (let i = 0; i < n; i++) ping(ac, PENTA[(Math.random() * PENTA.length) | 0], i * (0.12 + Math.random() * 0.2), 2.4, { vol: 0.018 }); };
  const gongSound = (ac) => {
    [[82, 1.0, 7], [164.6, 0.6, 6], [231, 0.45, 5], [329.5, 0.4, 4.5], [412, 0.28, 4], [548, 0.2, 3.2], [83.2, 0.5, 7]].forEach(([f, v, d]) => ping(ac, f, 0, d, { vol: 0.07 * v, attack: 0.012 }));
    rumble(ac, 0, 0.25, { lp: 1600, lp2: 300, vol: 0.06, brown: false, attack: 0.005 });
  };
  const clack = (ac) => { rumble(ac, 0, 0.09, { lp: 2400, lp2: 900, vol: 0.12, brown: false, attack: 0.002 }); ping(ac, 420, 0, 0.18, { vol: 0.06, type: 'triangle', f2: 380 }); };

  let gongAt = -99, jumpAt = -99, lanternPulse = 0, smokeAt = 0, tipAt = 6, tipping = -99;
  const place = {
    scene, fog, key, camH: 1.25, exposure: 1.05,
    pup: { tint: new THREE.Color(1.0, 0.9, 0.8), rim: new THREE.Color('#ffa64d').multiplyScalar(1.0), rimDir: [-0.6, 0.75], rim2: new THREE.Color('#ff8a3d').multiplyScalar(0.8), rimDir2: [0.6, 0.75] },
    update(dt, t) {
      const cam = env.camera.position;
      sunGlow.position.copy(cam).addScaledVector(SUN, 420); sunGlow.lookAt(cam);
      // the gong swings and shimmers after it's struck
      const g = t - gongAt;
      gong.rotation.x = g < 6 ? Math.sin(g * 5.5) * 0.16 * Math.exp(-g * 0.7) : 0;
      Z.uGong.value = g < 3 ? Math.exp(-g * 1.2) : 0;
      lanternPulse = Math.max(0, lanternPulse - dt * 0.6);
      Z.uLant.value = 1 + lanternPulse;
      lanterns.forEach((l, i) => { l.g.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.03; l.g.rotation.x = Math.sin(t * 0.5 + i) * 0.02; l.gl.material.uniforms.uK.value = 0.7 * (1 + lanternPulse) + Math.sin(t * 9 + i * 4) * 0.03; });
      petalMat.uniforms.uGust.value = Math.max(0, petalMat.uniforms.uGust.value - dt * 0.5);
      if (t - smokeAt > 0.6) { smokeAt = t; smoke.emit(incenseAt, 1, { speed: 0.12, up: 1, size: 0.09, life: 4, color: '#d8ccc0', spread: 0.01, dir: { x: 0.02, y: 0.12, z: 0 } }); }
      // the deer-scarer tips every 11 s or so
      if (t > tipAt) { tipAt = t + 10 + Math.random() * 3; tipping = t; if (place.ac) setTimeout(() => place.ac && clack(place.ac), 450); }
      const k = t - tipping;
      tube.rotation.z = k < 0.45 ? -0.5 * (k / 0.45) : k < 2.5 ? -0.5 + 0.5 * Math.min(1, (k - 0.45) / 0.5) * (1 + Math.sin((k - 0.45) * 12) * 0.15 * Math.exp(-(k - 0.45) * 3)) : 0.3 * Math.sin(Math.min(1, (t - tipping - 2.5) / 8) * Math.PI / 2);
      if (k > 0.45 && k < 0.5) splash.emit({ x: POND.x - 2.0, y: GARDEN_Y + 0.15, z: POND.z + 0.95 }, 6, { speed: 0.8, up: 0.8, size: 0.02, life: 0.5, color: '#cfe8ff', spread: 0.1 });
      const jj = t - jumpAt;
      if (jj > 1.05 && jj < 1.12) splash.emit({ x: POND.x + 1.0, y: GARDEN_Y + 0.05, z: POND.z }, 14, { speed: 1.4, up: 0.8, size: 0.03, life: 0.7, color: '#dff0ff', spread: 0.3 });
    },
    pulse(kind, at) {
      const f = at.foot, t = U.uTime.value;
      if (kind === 'rep') flurry.emit({ x: f.x, y: 0.5, z: f.z }, 10, { speed: 1.1, up: 0.55, size: 0.05, life: 2.2, colors: ['#ffb7d0', '#ffd8e6', '#f79ac0'], spread: 0.9 });
      else if (kind === 'big') {
        gongAt = t; petalMat.uniforms.uGust.value = 1.2;
        flurry.emit({ x: f.x, y: 1.0, z: f.z }, 34, { speed: 1.8, up: 0.4, size: 0.055, life: 3, colors: ['#ffb7d0', '#ffd8e6', '#f79ac0', '#ffffff'], spread: 1.6 });
        if (at.ac) gongSound(at.ac);
      } else if (kind === 'move') {
        jumpAt = t; lanternPulse = 1.2;
        koiMat.uniforms.uJump.value = t;
        if (at.ac) chimes(at.ac, 5);
      }
    },
    ambience(ac) {
      place.ac = ac;
      const air = noiseLoop(ac, { hp: 200, lp: 900, gain: 0.014, swell: 0.6 });
      const trickle = noiseLoop(ac, { hp: 2500, lp: 6000, gain: 0.005, swell: 0.4 });
      let alive = true, tm = 0;
      const ring = () => { if (!alive) return; chimes(ac, 2 + ((Math.random() * 3) | 0)); tm = setTimeout(ring, 7000 + Math.random() * 9000); };
      tm = setTimeout(ring, 3000);
      return { stop() { alive = false; place.ac = null; clearTimeout(tm); air.stop(); trickle.stop(); } };
    },
    quality(level) {
      petals.geometry.instanceCount = level ? petalN / 2 : petalN;
      dust.geometry.instanceCount = level ? dustN / 2 : dustN;
    },
  };
  return place;
}
