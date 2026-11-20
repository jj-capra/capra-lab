/* The wheat field: golden hour on a farm, the sun low behind the player, wind rolling waves through the wheat.
   A dirt track runs off past a red barn and a windmill; hay bales, a scarecrow, a tractor, power poles marching
   to the hills, birds over the field, butterflies and pollen in the sunlight. A rep kicks up chaff, every tenth
   flushes a flock of birds out of the wheat on a gust, a new move sends a gust and a birdsong. */
import { THREE, rng, NOISE, FOG, shaderMat, patchStandard, skyDome, quadInstances, bursts, canvasTex, glow, merge, mat, propMat, noiseLoop, ping } from './core.js';

const WIND = new THREE.Vector2(0.92, 0.38).normalize();
// the dirt track: straight out behind the player, then bending away to the left
const pathX = (z) => (z > -6 ? 0 : Math.sin((-z - 6) * 0.035) * 9);
const CLEAR = 2.2;
const clear = (x, z) => Math.hypot(x, z * 1.1) < CLEAR || (z < 0 && Math.abs(x - pathX(z)) < 0.95) || (z > -0.4 && Math.abs(x) < 2.6 + Math.max(0, z) * 0.6);

const GUST = /* glsl */ `
uniform vec2 uWind; uniform float uBoost;
float gust(vec2 p, float t) {
  float w = dot(p, uWind), n = vnoise(p * 0.045 + vec2(t * 0.07, 0.0));
  return pow(0.5 + 0.5 * sin(w * 0.15 - t * 1.5 + n * 5.0), 3.0) * (1.0 + uBoost) + uBoost * 0.25;
}`;

// Wheat stalks painted on a canvas: a clump of stems, each with its head of grains and long whiskers.
function wheatTexture() {
  return canvasTex(256, 512, (g, W, H) => {
    const r = rng(11);
    for (let k = 0; k < 17; k++) {
      const x0 = 18 + r() * (W - 36), lean = (r() - 0.5) * 60, top = H * (0.06 + r() * 0.22), hx = x0 + lean;
      const grad = g.createLinearGradient(0, H, 0, top);
      grad.addColorStop(0, '#6b5424'); grad.addColorStop(0.5, '#b8913f'); grad.addColorStop(1, '#e9c56a');
      g.strokeStyle = grad; g.lineWidth = 3.2 + r() * 1.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, H); g.quadraticCurveTo(x0 + lean * 0.2, H * 0.55, hx, top + 70); g.stroke();
      // the head: grains up both sides, whiskers off them
      const len = 64 + r() * 22, ang = Math.atan2(lean, H) * 0.6;
      g.save(); g.translate(hx, top + 70); g.rotate(ang);
      for (let i = 0; i < 9; i++) {
        const y = -i * (len / 9), w = 6.5 - i * 0.35;
        for (const s of [-1, 1]) {
          g.fillStyle = i % 2 ? '#f2cf74' : '#e3b553';
          g.beginPath(); g.ellipse(s * w * 0.55, y, w * 0.6, 7.5, s * 0.35, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(250,226,150,0.85)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(s * w, y - 3); g.lineTo(s * (w + 10 + r() * 8), y - 34 - r() * 16); g.stroke();
        }
      }
      g.restore();
    }
  });
}

export default function buildField(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(7);
  const sun = new THREE.Vector3(-0.42, 0.12, -1).normalize();        // where the sun shows, low on the horizon
  U.uSun.value.copy(sun);
  const G = { uWind: { value: WIND }, uBoost: { value: 0 } };
  const fog = new THREE.FogExp2('#e9c79d', 0.0036);
  scene.fog = fog;

  /* ---- the sky: deep blue overhead to gold at the horizon, the sun's glow, clouds lit from below ---- */
  scene.add(skyDome(U, /* glsl */ `
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) {
      float h = d.y, sd = max(dot(d, uSun), 0.0);
      float warm = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0), 2.0);
      vec3 col = mix(mix(S(0.95, 0.86, 0.72), S(1.0, 0.74, 0.42), warm), S(0.47, 0.68, 0.95), smoothstep(0.0, 0.18, h));
      col = mix(col, S(0.16, 0.38, 0.82), smoothstep(0.16, 0.7, h));
      col += S(1.0, 0.62, 0.30) * pow(sd, 8.0) * 1.2 + S(1.0, 0.85, 0.6) * pow(sd, 90.0) * 4.0 + vec3(30.0) * pow(sd, 2400.0);
      // rays fanning out from the sun
      float ang = atan(d.x - uSun.x, d.y - uSun.y);
      col += S(1.0, 0.85, 0.6) * pow(sd, 5.0) * smoothstep(0.55, 1.0, vnoise(vec2(ang * 9.0, 0.0))) * 0.25 * smoothstep(-0.02, 0.1, h);
      // cumulus: puffy, gold where the sun gets under them, blue-grey on top
      vec2 uv = d.xz / max(h + 0.06, 0.03) * 0.5 + vec2(uTime * 0.004, uTime * 0.002);
      float n = fbm(uv * 1.1 + 3.0), c = smoothstep(0.52, 0.78, n) * smoothstep(0.0, 0.12, h);
      float lit = fbm(uv * 1.1 + 3.0 + uSun.xz * 0.08);
      vec3 cloud = mix(S(1.0, 0.72, 0.5), S(0.66, 0.66, 0.78), smoothstep(0.45, 0.75, lit) * 0.7 + smoothstep(0.1, 0.5, h) * 0.3);
      cloud += S(1.0, 0.6, 0.3) * pow(sd, 6.0) * 0.8;
      col = mix(col, cloud, c * 0.9);
      if (h < 0.0) col = mix(col, S(0.8, 0.65, 0.45), smoothstep(0.0, -0.05, h));
      return col;
    }`));
  const sunGlow = glow(U, '#ffb257', 160, 0.9, { order: -5 });
  const sunCore = glow(U, '#fff2c8', 30, 1.6, { order: -5 });
  scene.add(sunGlow, sunCore);

  /* ---- light: the low sun behind and to the left (its shadow falls toward you), the sky all round ---- */
  const hemi = new THREE.HemisphereLight('#b4cfff', '#c49a62', 1.6);
  const key = new THREE.DirectionalLight('#ffc78a', 3.2);
  key.position.set(-0.55, 0.55, -0.62).normalize().multiplyScalar(40);   // the shadow falls toward you and to the right
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 90 });
  key.shadow.radius = 7; key.shadow.bias = -0.0005;
  scene.add(hemi, key, key.target);

  /* ---- the ground: the dirt track and the trampled patch where you stand, the field's floor, gold far off ---- */
  const groundMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.95 }), U, {
    uniforms: G,
    decl: GUST + /* glsl */ `
      vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      float pathX(float z) { return z > -6.0 ? 0.0 : sin((-z - 6.0) * 0.035) * 9.0; }
      float dirtMask(vec2 p) {
        float e = (vnoise(p * 2.2) - 0.5) * 0.5;
        float m = 1.0 - smoothstep(${CLEAR.toFixed(2)} - 0.3, ${CLEAR.toFixed(2)} + 0.2, length(vec2(p.x, p.y * 1.1)) + e);
        if (p.y < 0.0) m = max(m, 1.0 - smoothstep(0.75, 1.05, abs(p.x - pathX(p.y)) + e * 0.5));
        if (p.y > -0.4) m = max(m, 1.0 - smoothstep(2.4, 2.9, abs(p.x) - max(0.0, p.y) * 0.6 + e));
        return m;
      }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz; float dist = length(vWP - cameraPosition);
      float dm = dirtMask(p);
      vec3 dirt = mix(S(0.47, 0.35, 0.22), S(0.60, 0.47, 0.30), vnoise(p * 3.0));
      dirt = mix(dirt, S(0.36, 0.26, 0.16), smoothstep(0.55, 0.8, vnoise(p * 9.0)) * 0.5);
      float straw = smoothstep(0.82, 0.9, vnoise(vec2(p.x * 22.0, p.y * 4.0) + vnoise(p * 6.0) * 3.0));
      dirt = mix(dirt, S(0.86, 0.70, 0.40), straw * 0.8);
      // two tire ruts down the track, grass between them
      if (p.y < -1.5) {
        float px = abs(vWP.x - pathX(p.y));
        dirt = mix(dirt, S(0.36, 0.26, 0.16), (1.0 - smoothstep(0.08, 0.16, abs(px - 0.46))) * 0.6);
        dirt = mix(dirt, S(0.42, 0.55, 0.22), (1.0 - smoothstep(0.1, 0.2, px)) * smoothstep(0.4, 0.7, vnoise(p * 7.0)));
      }
      float g = gust(p, uTime);
      vec3 under = mix(S(0.42, 0.31, 0.15), S(0.60, 0.46, 0.20), vnoise(p * 1.5));
      vec3 far = mix(S(0.86, 0.66, 0.30), S(0.98, 0.80, 0.42), vnoise(p * 0.08)) * (0.82 + 0.4 * g);
      vec3 field = mix(under, far, smoothstep(30.0, 85.0, dist));
      diffuseColor.rgb = mix(field, dirt, dm);
    }`,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.z = -500; ground.receiveShadow = true;
  scene.add(ground);

  /* ---- the wheat: clumps of painted stalks, thousands of them in one draw, bending in the gusts ---- */
  const wheatTex = wheatTexture();
  const pts = [];
  const D = 4.5;
  const zone = (z0, z1, step, scale) => {
    for (let z = z0; z < z1; z += step) for (let x = -95; x <= 95; x += step) {
      const jx = x + (r() - 0.5) * step, jz = z + (r() - 0.5) * step;
      if (Math.abs(jx) > (D - jz) * 0.9 + 3) continue;           // never in view
      if (clear(jx, jz)) continue;
      pts.push([jx, jz, scale * (0.85 + r() * 0.35), r() * Math.PI, r()]);
    }
  };
  zone(-12, 4, 0.42, 1); zone(-36, -12, 0.78, 1.25); zone(-80, -36, 1.5, 1.7);
  for (let i = pts.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }   // shuffled, so a smaller count is a fair share
  const clump = new THREE.BufferGeometry();
  {
    const P = [], UV = [], I = [];
    for (let k = 0; k < 2; k++) {
      const a = k * Math.PI / 2, cx = Math.cos(a) * 0.42, cz = Math.sin(a) * 0.42, b = P.length / 3;
      P.push(-cx, 0, -cz, cx, 0, cz, cx, 0.9, cz, -cx, 0.9, -cz);
      UV.push(0, 0, 1, 0, 1, 1, 0, 1);
      I.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    clump.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    clump.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    clump.setIndex(I);
  }
  const aW = new Float32Array(pts.length * 2);
  pts.forEach((p, i) => { aW[i * 2] = p[3]; aW[i * 2 + 1] = p[4]; });
  clump.setAttribute('aW', new THREE.InstancedBufferAttribute(aW, 2));
  const wheatMat = shaderMat(U, {
    uniforms: { ...G, uMap: { value: wheatTex }, uSunCol: { value: new THREE.Color('#ffcf8a').multiplyScalar(1.25) }, uAmb: { value: new THREE.Color('#8fa0c8').multiplyScalar(0.55) } },
    vertex: /* glsl */ `
      uniform float uTime; attribute vec2 aW; ${NOISE} ${GUST}
      varying vec2 vUv; varying float vG; varying float vD; varying float vT; varying float vH;
      void main() {
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float g = gust(wp.xz, uTime), h = uv.y;
        float bend = h * h * (0.10 + 0.45 * g + 0.05 * sin(uTime * 3.1 + aW.x * 6.28));
        wp.xz += uWind * bend * 0.6 * (0.8 + aW.y * 0.4);
        wp.y -= bend * bend * 0.3;
        vec4 mv = viewMatrix * wp;
        gl_Position = projectionMatrix * mv;
        vUv = uv; vG = g; vD = -mv.z; vT = aW.y; vH = h;
      }`,
    fragment: /* glsl */ `
      uniform sampler2D uMap; uniform vec3 uSunCol; uniform vec3 uAmb; ${FOG}
      varying vec2 vUv; varying float vG; varying float vD; varying float vT; varying float vH;
      void main() {
        vec4 c = texture2D(uMap, vUv);
        if (c.a < 0.35) discard;
        vec3 col = c.rgb * (uAmb + uSunCol * (0.45 + 0.75 * vH)) * (0.82 + vT * 0.36);
        col += vec3(1.0, 0.72, 0.32) * vG * vH * vH * 0.35;      // the bent heads catch the sun
        col *= mix(0.45, 1.0, smoothstep(0.0, 0.7, vH));
        col = fogIt(col, vD);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
  const wheat = new THREE.InstancedMesh(clump, wheatMat, pts.length);
  const m4 = new THREE.Matrix4();
  pts.forEach(([x, z, s, a], i) => wheat.setMatrixAt(i, mat(x, 0, z, 0, a, 0, [s * (1 + (i % 3) * 0.08), s * (0.9 + (i % 5) * 0.06), s])));
  wheat.frustumCulled = false;
  scene.add(wheat);

  /* ---- poppies and cornflowers at the edge of the wheat ---- */
  const flowerPts = [];
  for (let i = 0; i < 900 && flowerPts.length < 240; i++) {
    const a = r() * Math.PI * 2, d = CLEAR + 0.1 + r() * 6, x = Math.cos(a) * d * 1.4, z = Math.sin(a) * d - 2;
    if (clear(x, z) || Math.abs(x) > (D - z) * 0.9 + 1) continue;
    flowerPts.push([x, z, r()]);
  }
  const flowerMat = shaderMat(U, {
    uniforms: G,
    vertex: /* glsl */ `uniform float uTime; attribute vec4 aF; ${NOISE} ${GUST} varying vec2 vUv; varying float vC; varying float vD;
      void main() {
        vec3 base = aF.xyz; float g = gust(base.xz, uTime);
        float h = 0.55 + fract(aF.w * 7.0) * 0.35;
        vec3 top = base + vec3(uWind.x, 0.0, uWind.y) * g * 0.12 + vec3(0.0, h, 0.0);
        vec4 mv = viewMatrix * vec4(top, 1.0);
        mv.xy += vec2(position.x, position.y - 0.5) * 0.09;
        gl_Position = projectionMatrix * mv; vUv = vec2(position.x + 0.5, position.y); vC = aF.w; vD = -mv.z;
      }`,
    fragment: /* glsl */ `${FOG} varying vec2 vUv; varying float vC; varying float vD;
      void main() {
        vec2 p = vUv - 0.5; float a = atan(p.y, p.x), r = length(p) * 2.0;
        float petal = 0.75 + 0.25 * cos(a * 5.0);
        if (r > petal) discard;
        vec3 col = vC < 0.72 ? vec3(0.85, 0.06, 0.04) : vec3(0.15, 0.3, 0.95);
        col = mix(col, vec3(0.05, 0.03, 0.02), 1.0 - smoothstep(0.12, 0.28, r));
        gl_FragColor = vec4(fogIt(col * 1.1, vD), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const flowers = new THREE.Mesh(quadInstances(flowerPts.length, [['aF', 4, (a, o, i) => { a[o] = flowerPts[i][0]; a[o + 2] = flowerPts[i][1]; a[o + 3] = flowerPts[i][2]; }]]), flowerMat);
  flowers.frustumCulled = false;
  scene.add(flowers);

  /* ---- far off: rolling hills with trees, blue mountains behind ---- */
  const hills = (z0, depth, height, seed, c0, c1, seg = 120) => {
    const g = new THREE.PlaneGeometry(1100, depth, seg, 8), p = g.attributes.position, cols = [], rr = rng(seed);
    const off = rr() * 100;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), yy = p.getY(i), back = (yy + depth / 2) / depth;     // 0 front .. 1 back
      const hh = (Math.sin(x * 0.012 + off) * 0.5 + 0.5) * 0.6 + (Math.sin(x * 0.031 + off * 2) * 0.5 + 0.5) * 0.4;
      p.setZ(i, hh * height * Math.sin(back * Math.PI * 0.5));
      const c = new THREE.Color(c0).lerp(new THREE.Color(c1), Math.min(1, back + Math.sin(x * 0.05) * 0.15));
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, -0.5, z0 - depth / 2);
    return m;
  };
  scene.add(hills(-150, 120, 22, 3, '#c9a24b', '#6f8f3a'));
  scene.add(hills(-300, 100, 70, 5, '#7c8f9e', '#5b6a8f', 80));
  // a tree line along the hills
  {
    const n = 140, g = new THREE.IcosahedronGeometry(1, 1), trees = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: '#3f5a2a', roughness: 1, flatShading: true }), n);
    // a hedgerow along the foot of the hills (where they start from the ground)
    for (let i = 0; i < n; i++) { const x = -300 + i * 4.3 + r() * 3, z = -149 - r() * 5, s = 2.5 + r() * 3; trees.setMatrixAt(i, mat(x, s * 0.55, z, 0, 0, 0, [s, s * 1.25, s])); }
    scene.add(trees);
  }

  /* ---- the farm: red barn and silo, windmill, hay bales, scarecrow, tractor, power poles ---- */
  const props = propMat(U);
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const C = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
  const roofGeo = (w, d, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g; };
  const barn = merge([
    { geo: B(9, 5.5, 12), color: '#b3261e', matrix: mat(0, 2.75, 0) },
    { geo: roofGeo(10, 12.6, 3.8), color: '#4a3b36', matrix: mat(0, 5.5, 0) },
    { geo: B(3.6, 4.2, 0.2), color: '#f4ead7', matrix: mat(0, 2.1, 6.05) },
    { geo: B(3.2, 3.8, 0.24), color: '#8e1d17', matrix: mat(0, 2.1, 6.06) },
    { geo: B(0.25, 4.9, 0.28), color: '#f4ead7', matrix: mat(0, 2.1, 6.1, 0, 0, 0.71) },
    { geo: B(0.25, 4.9, 0.28), color: '#f4ead7', matrix: mat(0, 2.1, 6.1, 0, 0, -0.71) },
    { geo: B(1.4, 1.1, 0.2), color: '#ffcf6b', matrix: mat(0, 6.6, 6.05), emit: 0.9 },
    { geo: B(9.2, 0.25, 0.3), color: '#f4ead7', matrix: mat(0, 5.5, 6.1) },
    { geo: C(2.2, 2.2, 13), color: '#c9cfd6', matrix: mat(7.5, 6.5, -2) },
    { geo: new THREE.SphereGeometry(2.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), color: '#9aa3ad', matrix: mat(7.5, 13, -2) },
  ]);
  const barnM = new THREE.Mesh(barn, props); barnM.position.set(9, 0, -44); barnM.rotation.y = -0.5; scene.add(barnM);
  // the windmill: a lattice tower and a rotor that spins with the wind
  const towerParts = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) towerParts.push({ geo: C(0.08, 0.12, 12.4, 6), color: '#d7d4cc', matrix: mat(sx * 0.9, 6, sz * 0.9, sz * 0.07, 0, -sx * 0.07) });
  for (let y = 2; y < 12; y += 2.4) towerParts.push({ geo: B(2.2 - y * 0.1, 0.08, 0.08), color: '#c8c4bb', matrix: mat(0, y, 0.9 - y * 0.05) });
  towerParts.push({ geo: B(0.8, 0.6, 1.4), color: '#b8b3a8', matrix: mat(0, 12.5, 0) });
  towerParts.push({ geo: B(0.05, 1.6, 2.6), color: '#c23a2b', matrix: mat(0, 12.6, -1.6) });
  const mill = new THREE.Mesh(merge(towerParts), props); mill.position.set(-10, 0, -56); scene.add(mill);
  const blades = [];
  for (let i = 0; i < 14; i++) blades.push({ geo: B(0.42, 2.3, 0.04), color: i % 2 ? '#f0ece4' : '#d9d3c6', matrix: mat(Math.sin(i / 14 * Math.PI * 2) * 1.35, Math.cos(i / 14 * Math.PI * 2) * 1.35, 0, 0, 0.35, -i / 14 * Math.PI * 2) });
  blades.push({ geo: C(0.25, 0.25, 0.4, 10), color: '#8c877d', matrix: mat(0, 0, 0, Math.PI / 2) });
  const rotor = new THREE.Mesh(merge(blades), props); rotor.position.set(-10, 12.6, -55.1); scene.add(rotor);
  // round hay bales
  const bale = merge([{ geo: C(0.75, 0.75, 1.2, 20), color: '#d8b25a', matrix: mat(0, 0.75, 0, 0, 0, Math.PI / 2) }, { geo: C(0.62, 0.62, 1.22, 20), color: '#c99a40', matrix: mat(0, 0.75, 0, 0, 0, Math.PI / 2) }]);
  const bales = new THREE.InstancedMesh(bale, props, 6);
  [[-2.9, -4.2, 1.15], [2.2, -7.5, -1.2], [3.4, -6.6, 0.5], [-5.5, -14, 1.35], [6.5, -22, -1.0], [-3.8, -24, 0.9]].forEach(([x, z, a], i) => bales.setMatrixAt(i, mat(x, 0, z, 0, a, 0)));
  scene.add(bales);
  // the scarecrow: a cross, a plaid shirt, straw hat, pumpkin head
  const crow = merge([
    { geo: C(0.05, 0.06, 2.4, 6), color: '#6b4a2a', matrix: mat(0, 1.2, 0) },
    { geo: C(0.04, 0.04, 1.8, 6), color: '#6b4a2a', matrix: mat(0, 1.75, 0, 0, 0, Math.PI / 2) },
    { geo: B(0.62, 0.7, 0.3), color: '#3b6fb6', matrix: mat(0, 1.55, 0) },
    { geo: B(1.5, 0.18, 0.2), color: '#2f5a96', matrix: mat(0, 1.78, 0) },
    { geo: new THREE.SphereGeometry(0.24, 12, 10), color: '#ff8a1c', matrix: mat(0, 2.15, 0, 0, 0, 0, [1, 0.85, 1]) },
    { geo: C(0.4, 0.4, 0.04, 16), color: '#e6c36a', matrix: mat(0, 2.33, 0) },
    { geo: C(0.17, 0.2, 0.2, 12), color: '#e6c36a', matrix: mat(0, 2.43, 0) },
    { geo: C(0.18, 0.21, 0.06, 12), color: '#b3261e', matrix: mat(0, 2.38, 0) },
  ]);
  const scare = new THREE.Mesh(crow, props); scare.position.set(-2.4, 0, -10); scare.rotation.y = 0.25; scene.add(scare);
  // a red tractor parked at the end of a row
  const tractor = merge([
    { geo: B(1.4, 0.9, 2.4), color: '#c81e1e', matrix: mat(0, 1.1, 0) },
    { geo: B(1.2, 1.1, 1.1), color: '#c81e1e', matrix: mat(0, 1.9, -0.5) },
    { geo: B(1.25, 0.9, 1.0), color: '#9fd3ff', matrix: mat(0, 2.0, -0.5), emit: 0.15 },
    { geo: B(1.4, 0.1, 1.3), color: '#222', matrix: mat(0, 2.5, -0.5) },
    { geo: C(0.85, 0.85, 0.5, 18), color: '#1d1d1f', matrix: mat(-0.85, 0.85, -0.6, 0, 0, Math.PI / 2) },
    { geo: C(0.85, 0.85, 0.5, 18), color: '#1d1d1f', matrix: mat(0.85, 0.85, -0.6, 0, 0, Math.PI / 2) },
    { geo: C(0.5, 0.5, 0.35, 16), color: '#1d1d1f', matrix: mat(-0.75, 0.5, 0.9, 0, 0, Math.PI / 2) },
    { geo: C(0.5, 0.5, 0.35, 16), color: '#1d1d1f', matrix: mat(0.75, 0.5, 0.9, 0, 0, Math.PI / 2) },
    { geo: C(0.08, 0.08, 1, 8), color: '#555', matrix: mat(0.4, 2.3, 0.6) },
  ]);
  const trac = new THREE.Mesh(tractor, props); trac.position.set(4.2, 0, -19); trac.rotation.y = 0.9; scene.add(trac);
  // power poles marching off to the hills, wires sagging between them
  {
    const parts = [], wire = [];
    const poles = [];
    for (let z = -12; z > -320; z -= 26) poles.push([-15 - Math.sin(z * 0.01) * 4, z]);
    for (const [x, z] of poles) {
      parts.push({ geo: C(0.13, 0.17, 9, 7), color: '#5a4430', matrix: mat(x, 4.5, z) });
      parts.push({ geo: B(2.4, 0.14, 0.14), color: '#5a4430', matrix: mat(x, 8.4, z) });
    }
    scene.add(new THREE.Mesh(merge(parts), props));
    for (let i = 0; i + 1 < poles.length; i++) for (const dx of [-1.05, 0, 1.05]) {
      const [x0, z0] = poles[i], [x1, z1] = poles[i + 1];
      for (let k = 0; k < 8; k++) {
        const a = k / 8, b = (k + 1) / 8, sag = (u) => 8.5 - Math.sin(u * Math.PI) * 0.9;
        wire.push(x0 + dx + (x1 - x0) * a, sag(a), z0 + (z1 - z0) * a, x0 + dx + (x1 - x0) * b, sag(b), z0 + (z1 - z0) * b);
      }
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    scene.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#3b3028', transparent: true, opacity: 0.7 })));
  }

  /* ---- birds over the field (and a flock that bursts out of the wheat) ---- */
  const birdGeo = (n, hidden = false) => {
    const g = new THREE.InstancedBufferGeometry();
    // two wings: body point, tip, back point, each side
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, -1, 0, 0, 0, 0, -0.2, 0, 0, 0.25, 0, 0, -0.2, 1, 0, 0], 3));
    const a = new Float32Array(n * 4), b = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { a.set([(r() - 0.5) * 30, 18 + r() * 14, -60 - r() * 60, r()], i * 4); b.set([4 + r() * 2, (r() - 0.5) * 0.06, 0, hidden ? -500 : -999], i * 4); }
    g.setAttribute('aB', new THREE.InstancedBufferAttribute(a, 4)); g.setAttribute('aV', new THREE.InstancedBufferAttribute(b, 4));
    g.instanceCount = n;
    return g;
  };
  const birdMat = shaderMat(U, {
    vertex: /* glsl */ `uniform float uTime; attribute vec4 aB; attribute vec4 aV; varying float vD;
      void main() {
        vec3 p; float age = uTime - aV.w, s = 0.55;
        if (aV.w > -900.0) {
          // flushed out of the wheat: up and away, then gone
          if (age < 0.0 || age > 7.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
          p = aB.xyz + vec3(aV.x * age, aV.y * age + 1.2 * age * age * 0.5, aV.z * age);
          s = 0.32;
        } else {
          float span = 140.0, x = mod(aB.x + uTime * aV.x + aB.w * 40.0 + span * 0.5, span) - span * 0.5;
          p = vec3(x, aB.y + sin(uTime * 0.5 + aB.w * 6.0) * 1.5 + aV.y * x, aB.z);
        }
        float flap = sin(uTime * (age > 0.0 ? 14.0 : 9.0) + aB.w * 30.0);
        vec3 v = position * s; v.y += abs(position.x) * flap * 0.55 * s;
        vec4 mv = viewMatrix * vec4(p + v, 1.0);
        gl_Position = projectionMatrix * mv; vD = -mv.z;
      }`,
    fragment: /* glsl */ `${FOG} varying float vD; void main() { gl_FragColor = vec4(fogIt(vec3(0.05, 0.04, 0.06), vD * 0.6), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    side: THREE.DoubleSide,
  });
  const birds = new THREE.Mesh(birdGeo(14), birdMat); birds.frustumCulled = false; scene.add(birds);
  const flushGeo = birdGeo(16, true), flush = new THREE.Mesh(flushGeo, birdMat); flush.frustumCulled = false; scene.add(flush);

  /* ---- butterflies around you, and pollen glinting in the sun ---- */
  const flyN = 3;
  const flyMat = shaderMat(U, {
    vertex: /* glsl */ `uniform float uTime; attribute vec4 aF; varying vec2 vUv; varying float vK;
      void main() {
        float t = uTime * (0.35 + aF.w * 0.2) + aF.w * 20.0;
        vec3 c = vec3(aF.x + sin(t * 1.3) * 1.4 + sin(t * 0.37) * 0.8, 0.8 + sin(t * 1.9) * 0.35 + aF.y, aF.z + cos(t * 0.9) * 1.1);
        vec3 vel = vec3(1.3 * cos(t * 1.3) * 1.4, 0.0, -0.9 * sin(t * 0.9) * 1.1);
        float head = atan(vel.x, vel.z);
        float side = position.x < 0.0 ? -1.0 : 1.0;
        float flap = (0.25 + 0.95 * abs(sin(uTime * 15.0 + aF.w * 9.0))) * side;
        // a wing hinged on the body, then turned to the way it flies
        vec3 v = vec3(abs(position.x) * cos(flap) * side, abs(position.x) * sin(abs(flap)), (position.y - 0.5) * 0.9) * 0.14;
        v = vec3(v.x * cos(head) + v.z * sin(head), v.y, -v.x * sin(head) + v.z * cos(head));
        vec4 mv = viewMatrix * vec4(c + v, 1.0);
        gl_Position = projectionMatrix * mv; vUv = vec2(abs(position.x) * 2.0, position.y); vK = aF.w;
      }`,
    fragment: /* glsl */ `varying vec2 vUv; varying float vK;
      void main() {
        vec2 p = vUv - vec2(0.0, 0.5);
        float wing = length(p * vec2(1.0, 1.25)) - 0.62 - 0.2 * sin(atan(p.y, p.x) * 2.0);
        if (wing > 0.0) discard;
        vec3 fill = vK < 0.34 ? vec3(1.0, 0.42, 0.02) : vK < 0.67 ? vec3(0.12, 0.45, 1.0) : vec3(1.0, 0.95, 0.85);
        vec3 col = mix(fill, vec3(0.02), smoothstep(-0.13, -0.05, wing));
        // white spots along the dark edge, dark veins across the wing
        col = mix(col, vec3(1.0), step(-0.11, wing) * step(wing, -0.06) * step(0.55, fract(vUv.y * 7.0)));
        col = mix(col, vec3(0.02), (1.0 - smoothstep(0.0, 0.035, abs(fract(atan(p.y, p.x + 0.05) * 1.6) - 0.5))) * 0.7);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
  const flies = new THREE.Mesh(quadInstances(flyN, [['aF', 4, (a, o, i) => { a.set([[-1.8, 2.0, -0.6][i], [0.2, 0.5, 0][i], [-1.5, -2.6, 0.4][i], i / flyN + 0.1], o); }]]), flyMat);
  flies.geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0, 0, 0, 0, 1, 0, -0.5, 1, 0, 0, 0, 0, 0.5, 0, 0, 0.5, 1, 0, 0, 1, 0], 3));
  flies.geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  flies.frustumCulled = false; scene.add(flies);
  const motesN = 360;
  const moteMat = shaderMat(U, {
    vertex: /* glsl */ `uniform float uTime; attribute vec4 aM; varying vec2 vUv; varying float vA;
      void main() {
        vec3 p = aM.xyz + vec3(sin(uTime * 0.3 + aM.w * 20.0) * 0.6 + uTime * 0.25, sin(uTime * 0.5 + aM.w * 9.0) * 0.4, cos(uTime * 0.27 + aM.w * 13.0) * 0.5);
        p.x = mod(p.x + 9.0, 18.0) - 9.0;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        mv.xy += vec2(position.x, position.y - 0.5) * (0.02 + 0.012 * fract(aM.w * 31.0));
        gl_Position = projectionMatrix * mv; vUv = vec2(position.x + 0.5, position.y);
        vA = 0.5 + 0.5 * sin(uTime * 2.0 + aM.w * 50.0);
      }`,
    fragment: /* glsl */ `varying vec2 vUv; varying float vA;
      void main() { float a = smoothstep(1.0, 0.0, length(vUv - 0.5) * 2.0) * (0.35 + 0.65 * vA); gl_FragColor = vec4(vec3(1.0, 0.85, 0.55) * a * 1.6, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Mesh(quadInstances(motesN, [['aM', 4, (a, o) => a.set([(r() - 0.5) * 18, 0.3 + r() * 3.2, -12 + r() * 15, r()], o)]]), moteMat);
  motes.frustumCulled = false; motes.renderOrder = 21; scene.add(motes);

  /* ---- reacting to the reps ---- */
  const chaff = bursts(U, { n: 260, shape: 'dot', grav: -2.6, drag: 1.2 });
  const dust = bursts(U, { n: 40, shape: 'puff', grav: 0.15, drag: 2.0, opacity: 0.55 });
  scene.add(chaff.mesh, dust.mesh);
  let boost = 0, flushAt = -99;
  function flushBirds(at) {
    const A = flushGeo.attributes.aB, V = flushGeo.attributes.aV, t = U.uTime.value;
    for (let i = 0; i < flushGeo.instanceCount; i++) {
      A.setXYZW(i, at.x + (Math.random() - 0.5) * 6, 0.9, -6 - Math.random() * 10, Math.random());
      V.setXYZW(i, (Math.random() - 0.5) * 5 + 1.5, 2.5 + Math.random() * 2, -3 - Math.random() * 4, t + Math.random() * 0.5);
    }
    A.needsUpdate = V.needsUpdate = true; flushAt = t;
  }
  const chirp = (ac, t0 = 0, n = 3) => { for (let i = 0; i < n; i++) { const f = 2600 + Math.random() * 1400; ping(ac, f, t0 + i * 0.11, 0.09, { vol: 0.025, f2: f * (1.25 + Math.random() * 0.3) }); } };

  const place = {
    scene, fog, key, camH: 1.3, camD: D, exposure: 1.0,
    pup: { tint: new THREE.Color(1.0, 0.95, 0.88), rim: new THREE.Color('#ffb24d').multiplyScalar(0.85), rimDir: [-0.65, 0.55] },
    update(dt, t, info) {
      boost = Math.max(0, boost - dt * 0.4);
      G.uBoost.value = boost;
      rotor.rotation.z -= dt * (1.1 + boost * 4);
      // the sun's glow stays where the sky draws the sun
      const cam = env.camera.position;
      sunGlow.position.copy(cam).addScaledVector(sun, 420); sunCore.position.copy(sunGlow.position);
      sunGlow.lookAt(cam); sunCore.lookAt(cam);
      scare.rotation.z = Math.sin(t * 1.3) * 0.02 * (1 + boost * 3);
    },
    pulse(kind, at) {
      const f = at.foot;
      if (kind === 'rep') {
        chaff.emit(f, 12, { speed: 1.7, up: 0.65, size: 0.035, life: 1.3, colors: ['#f6d27a', '#e8b04a', '#fff1c4', '#c98f3a'], spread: 0.5 });
        dust.emit({ x: f.x, y: 0.1, z: f.z }, 3, { speed: 0.5, up: 0.3, size: 0.35, life: 1.3, color: '#c9a77a', spread: 0.6 });
      } else if (kind === 'big') {
        boost = 1.6; flushBirds(f);
        chaff.emit({ x: f.x, y: 0.6, z: f.z }, 40, { speed: 2.6, up: 0.4, size: 0.04, life: 2.2, colors: ['#f6d27a', '#fff1c4', '#e8b04a'], spread: 1.4 });
        if (at.ac) { chirp(at.ac, 0, 4); chirp(at.ac, 0.5, 3); }
      } else if (kind === 'move') {
        boost = Math.max(boost, 1.0);
        if (at.ac) chirp(at.ac, 0.1, 3);
      }
    },
    ambience(ac) {
      const wind = noiseLoop(ac, { hp: 250, lp: 1300, gain: 0.03, swell: 0.7 });
      let alive = true, tm = 0;
      const sing = () => { if (!alive) return; chirp(ac, 0, 2 + ((Math.random() * 3) | 0)); tm = setTimeout(sing, 2500 + Math.random() * 5000); };
      tm = setTimeout(sing, 1500);
      return { stop() { alive = false; clearTimeout(tm); wind.stop(); } };
    },
    quality(level) {
      wheat.count = level ? Math.floor(pts.length * 0.55) : pts.length;
      motes.geometry.instanceCount = level ? motesN / 3 : motesN;
    },
  };
  return place;
}
