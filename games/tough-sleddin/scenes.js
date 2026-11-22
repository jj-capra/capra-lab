/* Tough Sleddin: the three winter places, one builder each (world.js asks them for their scene, materials,
   obstacle shapes and scenery, chunk by chunk).
   - Pinewood Run: a sunny morning in a deep pine forest, mountains white against a blue sky, log cabins with
     smoke curling up, diamond dust glinting in the sun.
   - Lantern Village: down the main street at dusk, the sky going from orange to deep blue, houses with warm
     windows and wreaths, lamp posts and string lights across the street, a church on the hill, snow falling.
   - Aurora Glacier: night under the northern lights, stars and a low moon, glowing ice spires and crystal
     clusters, igloos lit from inside, slippery ice that mirrors the sky. */
import { THREE, rng, skyDome, glow, merge, mat, propMat, patchStandard, bursts, bulbs, wordsTex, panel } from '../irl/world/core.js';
import { SLOPE, EDGE, RAMP_LEN, FT } from './logic.mjs';

const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const Cy = (a, b, h, s = 10) => new THREE.CylinderGeometry(a, b, h, s);
const Sp = (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);
const Co = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
function prism(w, d, h) { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g; }
const SNOW = '#f2f6ff';

// ---- the snow under the sled: soft drifts, a groomed corduroy track, glints that twinkle ----
function snowMaterial(U, { a = '#e9f0ff', b = '#f8faff', bank = '#cdd9f5', glint = '#ffffff', glintK = 2.2, track = 0.07, ripple = 0.04 }) {
  const m = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.78 }), U, {
    uniforms: { uSA: { value: new THREE.Color(a) }, uSB: { value: new THREE.Color(b) }, uBank: { value: new THREE.Color(bank) }, uGl: { value: new THREE.Color(glint) } },
    vdecl: 'attribute vec2 aT; varying vec2 vT;', vertex: 'vT = aT;',
    decl: /* glsl */ `varying vec2 vT; uniform vec3 uSA; uniform vec3 uSB; uniform vec3 uBank; uniform vec3 uGl;`,
    diffuse: /* glsl */ `{
      float u = vT.x, hw = vT.y, au = abs(u);
      float onT = 1.0 - smoothstep(hw - 0.5, hw + 1.0, au);
      vec3 sn = mix(uSA, uSB, vnoise(vWP.xz * 0.3) * 0.7 + vnoise(vWP.xz * 1.7) * 0.3);
      // corduroy on the groomed track, two old sled grooves wandering down it
      float cord = 0.5 + 0.5 * sin(u * 8.5);
      sn *= 1.0 - cord * onT * ${track.toFixed(3)};
      float groove = smoothstep(0.18, 0.0, abs(u - 2.4 - sin(vWP.z * 0.05) * 1.6)) + smoothstep(0.18, 0.0, abs(u + 3.1 + sin(vWP.z * 0.043 + 2.0) * 1.8));
      sn *= 1.0 - groove * onT * 0.08;
      // wind ripples across the hill (a mark every few meters rushing at you: the snow shows your speed)
      float rip = 0.5 + 0.5 * sin(vWP.z * 1.05 + sin(vWP.x * 0.31) * 1.8 + vnoise(vWP.xz * vec2(0.2, 0.12)) * 5.0);
      sn *= 1.0 - smoothstep(0.55, 1.0, rip) * ${ripple.toFixed(3)};
      // the banks: bluer where they turn from the light
      sn = mix(sn, uBank, (1.0 - onT) * (0.35 - 0.3 * clamp(vWN.y, 0.0, 1.0)) * 1.4);
      diffuseColor.rgb = sn;
    }`,
    post: /* glsl */ `{
      vec2 c = floor(vWP.xz * 55.0);
      float s = h21(c), tw = 0.5 + 0.5 * sin(uTime * (2.0 + s * 5.0) + s * 60.0);
      float d = length(vWP - cameraPosition);
      outgoingLight += uGl * step(0.992, s) * tw * tw * smoothstep(24.0, 3.0, d) * ${glintK.toFixed(2)};
    }`,
  });
  return m;
}
function rampMaterial(U, col = '#f4f8ff') { return new THREE.MeshStandardMaterial({ color: col, roughness: 0.65 }); }
// The mountains on the horizon, drawn in the sky itself (a ring of geometry out there once showed as a striped wall
// with a band of sky under it, JC: "it doesn't look good"): a far range pale in the haze and a nearer, darker one,
// sharp peaks with snow on top (brighter on the side facing the sun or moon), and under the horizon a sea of clouds
// filling the valley (the fog's colour, lit on top: `sea`), so the far end of the snow fades straight into it.
// Appended to a sky dome whose own sky is sky0().
function ranges({ far, near, snow, shade, sea, hFar = 0.07, hNear = 0.04, sharp = 1, seed = 1, snowFar = 0.62, snowNear = 0.85, hazeFar = 0.45, hazeNear = 0.18 }) {
  const r = rng(seed), ph = () => `vec4(${[r(), r(), r(), r()].map((v) => (v * 6.2832).toFixed(3)).join(', ')})`;
  const c = (hex) => { const k = new THREE.Color(hex); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
  const f = (v) => v.toFixed(4);
  return /* glsl */ `
  uniform vec3 uFogCol;
  float rdg(float x) { return pow(1.0 - abs(sin(x)), 1.6); }
  float range(float az, vec4 p) { return 0.42 * rdg(az * 2.0 + p.x) + 0.3 * rdg(az * 5.0 + p.y) + ${f(0.17 * sharp)} * rdg(az * 11.0 + p.z) + ${f(0.07 * sharp)} * rdg(az * 23.0 + p.w); }
  vec3 peaks(vec3 col, float e, float az, float side, vec4 p, float H, float snowAt, vec3 rock, float hz) {
    float top = H * (0.22 + range(az, p));
    float cov = smoothstep(top + 0.0012, top - 0.0012, e);
    if (cov <= 0.0) return col;
    float dh = range(az + 0.003, p) - range(az - 0.003, p);
    float lit = clamp(0.5 + dh * 60.0 * side, 0.0, 1.0);
    float sn = smoothstep(-0.0015, 0.0015, e - H * snowAt + 0.008 * (vnoise(vec2(az * 80.0, e * 300.0)) - 0.5));
    vec3 m = mix(rock * (0.85 + 0.3 * lit), mix(${c(shade)}, ${c(snow)}, lit), sn);
    m = mix(m, uFogCol, hz + (1.0 - hz) * (1.0 - smoothstep(-0.015, top * 0.8, e)));
    return mix(col, m, cov);
  }
  vec3 sky(vec3 d) {
    vec3 col = sky0(d);
    float az = atan(d.x, -d.z), e = d.y, side = sin(az - atan(uSun.x, -uSun.z));
    col = peaks(col, e, az, side, ${ph()}, ${f(hFar)}, ${f(snowFar)}, ${c(far)}, ${f(hazeFar)});
    col = peaks(col, e, az, side, ${ph()}, ${f(hNear)}, ${f(snowNear)}, ${c(near)}, ${f(hazeNear)});
    // the sea of clouds below (billows shrinking toward the horizon, drifting; plain haze right at the horizon
    // where they'd shimmer, and plain haze far below where the snow's own fog meets it)
    if (e < 0.0) {
      vec2 q = d.xz / max(-e, 0.004) * 0.32 + vec2(uTime * 0.012, uTime * 0.004);
      float b = smoothstep(0.4, 0.8, fbm(q)) * smoothstep(-0.002, -0.03, e) * smoothstep(-0.32, -0.12, e);
      vec3 sea = mix(uFogCol * 0.94, ${c(sea)}, b * 0.6) + ${c(sea)} * 0.12 * smoothstep(-0.05, 0.0, e);
      col = mix(col, sea, smoothstep(0.0, -0.012, e));
    }
    return col;
  }`;
}
// a start arch with the place's name, and distance flags down the run
function startArch(U, props, name, colors) {
  const g = new THREE.Group();
  const posts = new THREE.Mesh(merge([
    { geo: Cy(0.18, 0.22, 10.5, 8), color: colors.post, matrix: mat(-9, 5.25, 0) },
    { geo: Cy(0.18, 0.22, 10.5, 8), color: colors.post, matrix: mat(9, 5.25, 0) },
    { geo: Co(0.5, 0.6, 8), color: SNOW, matrix: mat(-9, 10.7, 0) },
    { geo: Co(0.5, 0.6, 8), color: SNOW, matrix: mat(9, 10.7, 0) },
  ]), props);
  const tex = wordsTex([name.toUpperCase(), 'TOUGH SLEDDIN'], { w: 1024, h: 256, bg: colors.bg, size: 0.36 });
  const sign = panel(tex, 17, 4.25, { glowK: colors.glow || 0, side: THREE.DoubleSide });
  sign.position.set(0, 8.4, 0);
  g.add(posts, sign);
  return g;
}

/* =================== Pinewood Run =================== */
function pinewood({ U }) {
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2('#cfe2f8', 0.0045);
  scene.fog = fog;
  const SUN = new THREE.Vector3(-0.35, 0.32, -0.88).normalize();
  U.uSun.value.copy(SUN);
  const sky = skyDome(U, /* glsl */ `
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky0(vec3 d) {
      float h = max(d.y, -0.2);
      vec3 col = mix(S(0.80, 0.90, 1.0), S(0.30, 0.55, 0.92), smoothstep(-0.02, 0.55, h));
      float sd = max(dot(d, uSun), 0.0);
      col += S(1.0, 0.92, 0.75) * (pow(sd, 6.0) * 0.25 + pow(sd, 60.0) * 0.5);
      col = mix(col, S(1.0, 0.98, 0.92) * 4.0, smoothstep(0.9993, 0.9997, sd));
      // big soft clouds drifting
      vec2 uv = d.xz / max(h + 0.12, 0.05) * 0.5 + vec2(uTime * 0.004, 0.0);
      float cl = smoothstep(0.52, 0.8, fbm(uv));
      vec3 cc = mix(S(0.82, 0.86, 0.94), S(1.0, 1.0, 1.0), smoothstep(0.0, 0.4, fbm(uv + 1.7))) + S(1.0, 0.9, 0.7) * pow(sd, 8.0) * 0.4;
      col = mix(col, cc, cl * smoothstep(0.02, 0.18, h) * 0.85);
      return col;
    }` + ranges({ far: '#9ab2da', near: '#6684b8', snow: '#ffffff', shade: '#b4c6ea', sea: '#ffffff', seed: 3, hFar: 0.075, hNear: 0.042 }));
  scene.add(sky);
  const sunGlow = glow(U, '#fff2cc', 160, 0.55, { order: -5 });
  scene.add(sunGlow);
  const hemi = new THREE.HemisphereLight('#bcd4ff', '#eef2ff', 0.85);
  const sun = new THREE.DirectionalLight('#ffeacc', 1.9);
  sun.position.set(-0.5, 0.75, 0.5);
  scene.add(hemi, sun, sun.target);

  const props = propMat(U, { rough: 0.85, emitK: 2.2 });
  // a snowy pine: a trunk and four tiers, each with a snow cap
  const pineParts = (dark = '#1f4d38', light = '#2a5e44') => {
    const ps = [{ geo: Cy(0.14, 0.2, 1.4, 6), color: '#4a3324', matrix: mat(0, 0.7, 0) }];
    for (let k = 0; k < 4; k++) {
      const y = 1.0 + k * 1.2, rad = 1.75 - k * 0.36, h = 1.9 - k * 0.2;
      ps.push({ geo: Co(rad, h, 7), color: k % 2 ? dark : light, matrix: mat(0, y + h / 2, 0) });
      ps.push({ geo: Co(rad * 0.74, h * 0.45, 7), color: SNOW, matrix: mat(0, y + h * 0.8, 0) });
    }
    return ps;
  };
  const kinds = {
    pine: { geo: merge(pineParts()) },
    pine2: { geo: merge(pineParts('#244b3a', '#2f6047')) },
    rock: { geo: merge([
      { geo: new THREE.DodecahedronGeometry(1.0, 0), color: '#7d8494', matrix: mat(0, 0.55, 0, 0, 0, 0, [1.1, 0.8, 1]) },
      { geo: new THREE.DodecahedronGeometry(0.62, 0), color: '#8e95a4', matrix: mat(0.5, 0.45, 0.3, 0.4, 0.3, 0) },
      { geo: new THREE.SphereGeometry(0.85, 10, 6, 0, Math.PI * 2, 0, 1.0), color: SNOW, matrix: mat(0, 0.75, 0, 0, 0, 0, [1.15, 0.6, 1.05]) },
    ]) },
    stump: { geo: merge([
      { geo: Cy(0.5, 0.6, 0.7, 10), color: '#6b4428', matrix: mat(0, 0.35, 0) },
      { geo: Cy(0.52, 0.52, 0.12, 10), color: SNOW, matrix: mat(0, 0.74, 0) },
      { geo: Cy(0.12, 0.14, 0.5, 5), color: '#5c3a22', matrix: mat(0.55, 0.2, 0, 0, 0, 1.2) },
    ]) },
    log: { geo: merge([
      { geo: Cy(0.42, 0.42, 1, 10), color: '#6b4428', matrix: mat(0, 0.42, 0, 0, 0, Math.PI / 2) },
      { geo: Cy(0.3, 0.3, 1.002, 10), color: '#c99a62', matrix: mat(0, 0.42, 0, 0, 0, Math.PI / 2, [1, 1, 1]) },
      { geo: Bx(1, 0.14, 0.5), color: SNOW, matrix: mat(0, 0.84, 0) },
    ]) },
    bush: { geo: merge([{ geo: Sp(1, 10, 7), color: SNOW, matrix: mat(0, 0.25, 0, 0, 0, 0, [1.3, 0.75, 1.1]) }, { geo: Sp(0.7, 9, 6), color: '#e6eefc', matrix: mat(0.7, 0.2, 0.3) }]) },
    cabin: { geo: cabinGeo() },
  };
  const snowMat = snowMaterial(U, { a: '#dce7fb', b: '#f6f9ff', bank: '#a9bfe8', glint: '#fff6e0', track: 0.1 });
  const smoke = bursts(U, { n: 160, shape: 'puff', grav: 0.3, drag: 1.4, opacity: 0.4 });
  scene.add(smoke.mesh);
  // diamond dust: tiny ice glinting in the sun in the air ahead
  const dust = bursts(U, { n: 260, shape: 'drop', grav: -0.15, drag: 0.6, opacity: 0.9, blend: THREE.AdditiveBlending });
  scene.add(dust.mesh);
  let chimneys = [], lastSmoke = 0, lastDust = 0;
  const arch = startArch(U, props, 'Pinewood Run', { post: '#6b4428', bg: '#2a5e44' });
  scene.add(arch);
  let markers = [];
  return {
    scene, props, snowMat, kinds, exposure: 0.92,
    rampMat: rampMaterial(U), iceMat: null,
    sprayCols: ['#ffffff', '#eef4ff', '#dfe8ff'],
    flakes: { color: '#ffffff', k: 0.7, fall: 1.0 },
    reset(C) { chimneys = []; arch.position.set(C.center(12), C.height(C.center(12), 12), -12); for (const m of markers) scene.remove(m); markers = []; },
    barrier(o, { put, C }) { put('log', mat(o.x, C.height(o.x, o.d), -o.d, 0, 0, 0, [o.x1 - o.x0, 1, 1])); },
    decorate(k, d0, d1, { put, at, C, group, quality }) {
      const r = rng(k * 131 + 7);
      for (const s of [-1, 1]) {
        // the tree line right along the bank
        for (let d = d0 + r() * 2; d < d1; d += 2.2 + r() * 1.6) {
          const hw = C.halfWidth(d), u = s * (hw + EDGE + 0.6 + r() * 2.8);
          put(r() < 0.5 ? 'pine' : 'pine2', at(C.center(d) + u, d, r() * 6, 0.9 + r() * 0.7));
        }
        // the forest beyond
        const n = quality >= 1 ? 22 : 40;
        for (let i = 0; i < n; i++) {
          const d = d0 + r() * (d1 - d0), hw = C.halfWidth(d), u = s * (hw + 6 + Math.pow(r(), 0.8) * 80);
          put(r() < 0.5 ? 'pine' : 'pine2', at(C.center(d) + u, d, r() * 6, 1.0 + r() * 1.1));
        }
        for (let i = 0; i < 4; i++) { const d = d0 + r() * (d1 - d0), u = s * (C.halfWidth(d) + 2 + r() * 10); put('bush', at(C.center(d) + u, d, r() * 6, 0.6 + r() * 0.8, -0.1)); }
      }
      // a cabin in a clearing now and then, smoke from its chimney
      if (k > 1 && r() < 0.35) {
        const s = r() < 0.5 ? -1 : 1, d = d0 + 10 + r() * 30, u = s * (C.halfWidth(d) + 12 + r() * 8), x = C.center(d) + u;
        const yaw = s < 0 ? Math.PI / 2 : -Math.PI / 2;
        put('cabin', at(x, d, yaw, 1));
        const ch = new THREE.Vector3(1.6, 5.4, -0.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(x, C.height(x, d), -d));
        chimneys.push(ch);
        const win = glow(U, '#ffb35a', 2.2, 0.35); win.position.set(x - s * 2.3, C.height(x, d) + 1.6, -d); group.add(win);
      }
      // a flag every 1,000 ft
      for (let f = Math.ceil((d0 * FT) / 1000) * 1000; f < d1 * FT; f += 1000) if (f > 0) group.add(distFlag(U, props, f, C, '#2a5e44'));
    },
    update(dt, t, { mode, camera, goat, d }) {
      sky.position.copy(camera.position);
      arch.visible = mode !== 'menu';
      sunGlow.position.copy(camera.position).addScaledVector(SUN, 420); sunGlow.lookAt(camera.position);
      chimneys = chimneys.filter((c) => c.z < -(d - 60));
      if (t - lastSmoke > 0.35) { lastSmoke = t; for (const c of chimneys) smoke.emit(c, 1, { speed: 0.4, up: 1, size: 1.1, life: 4, color: '#c9d2e6', spread: 0.2, dir: { x: 0.5, y: 0.4, z: 0 } }); }
      if (t - lastDust > 0.05) { lastDust = t; dust.emit({ x: goat.x + (Math.random() - 0.5) * 24, y: goat.y + 1 + Math.random() * 6, z: goat.z - 6 - Math.random() * 20 }, 2, { speed: 0.3, up: 0.2, size: 0.05, life: 2.2, colors: ['#fff6d8', '#ffffff'], spread: 2 }); }
    },
    hit(o, p) { smoke.emit(p, 14, { speed: 2.5, up: 0.5, size: 1.2, life: 1.4, color: '#f4f8ff', spread: 1 }); },
  };
}

/* =================== Lantern Village =================== */
function village({ U }) {
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2('#4a4677', 0.0068);
  scene.fog = fog;
  const DUSK = new THREE.Vector3(-0.25, 0.08, -0.96).normalize();
  const MOON = new THREE.Vector3(0.5, 0.42, -0.75).normalize();
  U.uSun.value.copy(DUSK);
  const M = { uMoon: { value: MOON } };
  const sky = skyDome(U, /* glsl */ `
    uniform vec3 uMoon;
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky0(vec3 d) {
      float h = d.y;
      float glowAz = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0);
      vec3 col = mix(S(1.0, 0.62, 0.42), S(0.55, 0.42, 0.72), smoothstep(-0.02, 0.18, h));
      col = mix(col, S(0.12, 0.14, 0.36), smoothstep(0.12, 0.6, h));
      col += S(1.0, 0.55, 0.3) * pow(glowAz, 4.0) * smoothstep(0.35, 0.0, h) * 0.6;
      // first stars
      vec2 g = floor(d.xz / (h + 1.2) * 300.0);
      col += vec3(1.0) * step(0.9975, h21(g)) * smoothstep(0.25, 0.55, h) * (0.6 + 0.4 * sin(uTime * 2.5 + h21(g + 3.0) * 40.0));
      // a crescent moon
      float md = dot(d, uMoon), sd2 = dot(d, normalize(uMoon + vec3(0.012, 0.01, 0.0)));
      col = mix(col, S(1.0, 0.96, 0.86) * 3.0, smoothstep(0.99955, 0.99975, md) * (1.0 - smoothstep(0.99955, 0.99975, sd2)));
      col += S(0.6, 0.6, 0.9) * pow(max(md, 0.0), 200.0) * 0.4;
      // clouds lit pink from below
      vec2 uv = d.xz / max(h + 0.12, 0.05) * 0.5 + vec2(uTime * 0.003, 0.0);
      float cl = smoothstep(0.55, 0.82, fbm(uv));
      col = mix(col, mix(S(0.95, 0.55, 0.55), S(0.3, 0.28, 0.5), smoothstep(0.05, 0.4, h)), cl * smoothstep(0.02, 0.15, h) * 0.75);
      return col;
    }` + ranges({ far: '#45437e', near: '#2d2e5c', snow: '#f6cddb', shade: '#7270ad', sea: '#c99bc4', seed: 8, hFar: 0.062, hNear: 0.035 }), M);
  scene.add(sky);
  const hemi = new THREE.HemisphereLight('#8a86d8', '#e6dcff', 0.95);
  const key = new THREE.DirectionalLight('#ffb48e', 0.55);
  key.position.set(-0.4, 0.5, -0.8);
  const fill = new THREE.DirectionalLight('#8fa2ff', 0.5); fill.position.set(0.5, 0.6, 0.6);
  scene.add(hemi, key, fill);
  const props = propMat(U, { rough: 0.8, emitK: 3.2 });
  const WARM = '#ffc06a';
  const house = (wall, roof, trim) => merge([
    { geo: Bx(6, 4.2, 6), color: wall, matrix: mat(0, 2.1, 0) },
    { geo: prism(6.9, 6.8, 2.8), color: roof, matrix: mat(0, 4.2, 0, 0, Math.PI / 2) },
    { geo: prism(7.0, 6.9, 2.86), color: SNOW, matrix: mat(0, 4.36, 0, 0, Math.PI / 2, 0, [0.98, 0.9, 1]) },
    { geo: Bx(0.8, 2.2, 0.8), color: '#6d5a5a', matrix: mat(1.6, 5.4, 1.4) },
    { geo: Bx(0.9, 0.18, 0.9), color: SNOW, matrix: mat(1.6, 6.55, 1.4) },
    // the front (+x, facing the street): a door, a wreath, windows aglow, a porch light
    { geo: Bx(0.12, 2.0, 1.1), color: trim, matrix: mat(3.02, 1.0, 0) },
    { geo: new THREE.TorusGeometry(0.28, 0.09, 6, 14), color: '#2f8a4a', matrix: mat(3.1, 1.55, 0, 0, Math.PI / 2) },
    { geo: Sp(0.07, 6, 5), color: '#ff3b3b', matrix: mat(3.15, 1.3, 0), emit: 0.8 },
    { geo: Bx(0.1, 1.0, 1.0), color: WARM, matrix: mat(3.02, 2.4, -1.9), emit: 1.6 },
    { geo: Bx(0.1, 1.0, 1.0), color: WARM, matrix: mat(3.02, 2.4, 1.9), emit: 1.6 },
    { geo: Bx(0.14, 0.12, 1.2), color: SNOW, matrix: mat(3.06, 1.85, -1.9) },
    { geo: Bx(0.14, 0.12, 1.2), color: SNOW, matrix: mat(3.06, 1.85, 1.9) },
    { geo: Bx(0.1, 0.8, 0.8), color: WARM, matrix: mat(0, 4.9, 3.42, 0, Math.PI / 2), emit: 1.4 },
    { geo: Sp(0.12, 8, 6), color: '#ffd28a', matrix: mat(3.15, 2.25, 0.8), emit: 3 },
  ]);
  const xmasParts = (lit) => {
    const ps = [{ geo: Cy(0.14, 0.2, 0.9, 6), color: '#4a3324', matrix: mat(0, 0.45, 0) }, { geo: Bx(0.7, 0.4, 0.7), color: '#b0302f', matrix: mat(0, 0.2, 0) }];
    for (let k = 0; k < 4; k++) { const y = 0.8 + k * 0.9, rad = 1.3 - k * 0.27, h = 1.4 - k * 0.15; ps.push({ geo: Co(rad, h, 9), color: '#1f5a3a', matrix: mat(0, y + h / 2, 0) }); ps.push({ geo: Co(rad * 0.72, h * 0.35, 9), color: SNOW, matrix: mat(0, y + h * 0.84, 0) }); }
    const cs = ['#ff3b3b', '#ffd23f', '#29d3f0', '#ff6bd6'];
    for (let i = 0; i < (lit ? 18 : 12); i++) { const y = 1.0 + (i / 18) * 3.1, rad = 1.2 - (y - 0.8) * 0.3, a = i * 2.4; ps.push({ geo: Sp(0.1, 6, 5), color: cs[i % 4], matrix: mat(Math.cos(a) * rad, y, Math.sin(a) * rad), emit: 1.8 }); }
    ps.push({ geo: new THREE.OctahedronGeometry(0.28, 0), color: '#ffd23f', matrix: mat(0, 4.55, 0), emit: 2.5 });
    return ps;
  };
  const kinds = {
    snowman: { geo: merge([
      { geo: Sp(0.62, 16, 12), color: SNOW, matrix: mat(0, 0.55, 0) }, { geo: Sp(0.46, 16, 12), color: SNOW, matrix: mat(0, 1.32, 0) }, { geo: Sp(0.33, 16, 12), color: SNOW, matrix: mat(0, 1.92, 0) },
      { geo: Sp(0.045, 6, 5), color: '#111', matrix: mat(-0.11, 2.0, -0.29) }, { geo: Sp(0.045, 6, 5), color: '#111', matrix: mat(0.11, 2.0, -0.29) },
      { geo: Co(0.06, 0.36, 8), color: '#ff7a1a', matrix: mat(0, 1.92, -0.46, -Math.PI / 2) },
      { geo: Sp(0.05, 6, 5), color: '#111', matrix: mat(0, 1.42, -0.45) }, { geo: Sp(0.05, 6, 5), color: '#111', matrix: mat(0, 1.2, -0.46) },
      { geo: new THREE.TorusGeometry(0.33, 0.085, 8, 20), color: '#d6262b', matrix: mat(0, 1.66, 0, Math.PI / 2) },
      { geo: Bx(0.14, 0.5, 0.06), color: '#d6262b', matrix: mat(0.2, 1.45, -0.32, 0.2, 0, 0.15) },
      { geo: Cy(0.3, 0.3, 0.05, 14), color: '#1a1a22', matrix: mat(0, 2.2, 0) }, { geo: Cy(0.2, 0.2, 0.4, 14), color: '#1a1a22', matrix: mat(0, 2.42, 0) },
      { geo: Cy(0.205, 0.205, 0.08, 14), color: '#2f8a4a', matrix: mat(0, 2.3, 0) },
      { geo: Cy(0.025, 0.035, 0.9, 5), color: '#5a3b22', matrix: mat(-0.62, 1.5, 0, 0, 0, 1.0) }, { geo: Cy(0.025, 0.035, 0.9, 5), color: '#5a3b22', matrix: mat(0.62, 1.5, 0, 0, 0, -1.0) },
    ]) },
    gifts: { geo: merge([
      { geo: Bx(1.1, 0.8, 1.1), color: '#e63946', matrix: mat(0, 0.4, 0, 0, 0.3) }, { geo: Bx(0.2, 0.82, 1.12), color: '#ffd23f', matrix: mat(0, 0.4, 0, 0, 0.3) },
      { geo: Bx(0.8, 0.6, 0.8), color: '#2a9d8f', matrix: mat(0.15, 1.1, 0.05, 0, -0.4) }, { geo: Bx(0.82, 0.62, 0.16), color: '#ffffff', matrix: mat(0.15, 1.1, 0.05, 0, -0.4) },
      { geo: Bx(0.5, 0.4, 0.5), color: '#9b5de5', matrix: mat(-0.05, 1.6, 0, 0, 0.6) },
      { geo: new THREE.TorusGeometry(0.12, 0.04, 6, 10), color: '#ffd23f', matrix: mat(-0.05, 1.86, 0) },
    ]) },
    xmas: { geo: merge(xmasParts(true)) },
    lamp: { geo: merge([
      { geo: Cy(0.08, 0.12, 4, 8), color: '#22222c', matrix: mat(0, 2, 0) }, { geo: Cy(0.2, 0.25, 0.3, 8), color: '#22222c', matrix: mat(0, 0.15, 0) },
      { geo: Bx(0.45, 0.6, 0.45), color: '#ffcf7a', matrix: mat(0, 4.3, 0), emit: 3 }, { geo: Co(0.42, 0.35, 4), color: '#22222c', matrix: mat(0, 4.78, 0, 0, Math.PI / 4) },
      { geo: Co(0.38, 0.2, 4), color: SNOW, matrix: mat(0, 4.92, 0, 0, Math.PI / 4) },
      { geo: new THREE.TorusGeometry(0.22, 0.07, 6, 12), color: '#2f8a4a', matrix: mat(0, 3.4, 0, Math.PI / 2) }, { geo: Bx(0.3, 0.2, 0.06), color: '#d6262b', matrix: mat(0, 3.4, -0.25) },
    ]) },
    picket: { geo: merge([
      { geo: Bx(0.16, 1.15, 0.08), color: '#fbfbff', matrix: mat(0, 0.58, 0) }, { geo: Co(0.115, 0.18, 4), color: '#fbfbff', matrix: mat(0, 1.24, 0, 0, Math.PI / 4) },
      { geo: Bx(0.5, 0.1, 0.06), color: '#e9e6f2', matrix: mat(0, 0.35, 0.06) }, { geo: Bx(0.5, 0.1, 0.06), color: '#e9e6f2', matrix: mat(0, 0.85, 0.06) },
      { geo: Bx(0.2, 0.08, 0.12), color: SNOW, matrix: mat(0, 1.3, 0) },
    ]) },
    houseA: { geo: house('#c0473f', '#5a3a3a', '#3a2a2a') },
    houseB: { geo: house('#3f6fb0', '#2e3550', '#f4f0e6') },
    houseC: { geo: house('#e3b23c', '#6b3a2a', '#3a2a2a') },
    houseD: { geo: house('#5f9e6e', '#3a2f3a', '#f4f0e6') },
    tree: { geo: merge(xmasParts(false)) },
    church: { geo: merge([
      { geo: Bx(10, 7, 16), color: '#d8d2e6', matrix: mat(0, 3.5, 0) }, { geo: prism(11, 16.5, 5), color: SNOW, matrix: mat(0, 7, 0) },
      { geo: Bx(4, 14, 4), color: '#d8d2e6', matrix: mat(0, 7, -9) }, { geo: Co(3.0, 7, 4), color: '#5a5a7a', matrix: mat(0, 17.5, -9, 0, Math.PI / 4) },
      { geo: Bx(0.2, 3.4, 1.6), color: WARM, matrix: mat(5.05, 3.6, -3), emit: 1.6 }, { geo: Bx(0.2, 3.4, 1.6), color: WARM, matrix: mat(5.05, 3.6, 3), emit: 1.6 },
      { geo: Cy(1.0, 1.0, 0.2, 16), color: '#ffe08a', matrix: mat(0, 11, -6.9, Math.PI / 2), emit: 2.2 },
    ]) },
  };
  const snowMat = snowMaterial(U, { a: '#cfd0f2', b: '#e9e8ff', bank: '#8e8ccf', glint: '#ffe2b0', glintK: 1.6, track: 0.1 });
  const smoke = bursts(U, { n: 220, shape: 'puff', grav: 0.3, drag: 1.4, opacity: 0.35 });
  scene.add(smoke.mesh);
  const arch = startArch(U, props, 'Lantern Village', { post: '#22222c', bg: '#b0302f', glow: 0.3 });
  scene.add(arch);
  let chimneys = [], lastSmoke = 0;
  const LIGHTS = ['#ff4b4b', '#ffd23f', '#3fd47a', '#4bb8ff', '#ff7ae0'];
  return {
    scene, props, snowMat, kinds, exposure: 1.1,
    rampMat: rampMaterial(U, '#ece8ff'), iceMat: null,
    sprayCols: ['#ffffff', '#f2eeff', '#e6e0ff'],
    flakes: { color: '#fff6ea', k: 0.95, fall: 1.5 },
    reset(C) { chimneys = []; arch.position.set(C.center(12), C.height(C.center(12), 12), -12); },
    barrier(o, { put, C }) {
      // a white picket fence across the street
      for (let x = o.x0 + 0.25; x < o.x1; x += 0.5) put('picket', mat(x, C.height(x, o.d), -o.d, 0, 0, 0, 1));
    },
    decorate(k, d0, d1, { put, at, C, group, quality }) {
      const r = rng(k * 197 + 3), glows = [], strings = [];
      const houses = ['houseA', 'houseB', 'houseC', 'houseD'];
      for (const s of [-1, 1]) {
        // houses along the street, fronts to it
        for (let d = d0 + (s > 0 ? 3 : 10) + r() * 4; d < d1; d += 13 + r() * 5) {
          const u = s * (C.halfWidth(d) + 8 + r() * 3), x = C.center(d) + u;
          put(houses[Math.floor(r() * 4)], at(x, d, s < 0 ? 0 : Math.PI, 1, -0.2));
          if (r() < 0.6) chimneys.push(new THREE.Vector3(x + (s < 0 ? 1.6 : -1.6), C.height(x, d) + 6.5, -d + (s < 0 ? 1.4 : -1.4)));
          glows.push([x - s * 3.2, C.height(x, d) + 2.4, -d - 1.9, 4], [x - s * 3.2, C.height(x, d) + 2.4, -d + 1.9, 4]);
        }
        // the second row and trees in the yards
        for (let i = 0; i < (quality >= 1 ? 2 : 4); i++) { const d = d0 + r() * (d1 - d0), u = s * (C.halfWidth(d) + 24 + r() * 30); put(houses[Math.floor(r() * 4)], at(C.center(d) + u, d, r() < 0.5 ? 0 : Math.PI, 1, -0.2)); }
        for (let i = 0; i < 6; i++) { const d = d0 + r() * (d1 - d0), u = s * (C.halfWidth(d) + 3.2 + r() * 2.5); put(r() < 0.35 ? 'snowman' : 'tree', at(C.center(d) + u, d, r() * 6, 0.7 + r() * 0.4)); }
        // lamp posts along the curb
        for (let d = d0 + (s > 0 ? 0 : 7.5); d < d1; d += 15) {
          const u = s * (C.halfWidth(d) + EDGE + 0.5), x = C.center(d) + u, y = C.height(x, d);
          put('lamp', mat(x, y, -d)); glows.push([x, y + 4.3, -d, 3]);
        }
      }
      // string lights across the street
      for (let d = d0 + 7.5; d < d1; d += 30) {
        const hw = C.halfWidth(d) + EDGE + 0.5, xa = C.center(d) - hw, xb = C.center(d) + hw, ya = C.height(xa, d) + 4.1, yb = C.height(xb, d) + 4.1;
        for (let i = 0; i <= 28; i++) { const f = i / 28, sag = Math.sin(f * Math.PI) * 1.4; strings.push([xa + (xb - xa) * f, ya + (yb - ya) * f - sag, -d, i % LIGHTS.length]); }
      }
      // a church up the hill now and then
      if (r() < 0.25) { const s = r() < 0.5 ? -1 : 1, d = d0 + 25, u = s * (C.halfWidth(d) + 55), x = C.center(d) + u; put('church', at(x, d, s < 0 ? 0 : Math.PI, 1, -0.3)); glows.push([x - s * 0.5, C.height(x, d) + 11, -d + 6.9, 0]); }
      const warm = bulbs(U, glows.map((g) => [g[0], g[1], g[2], 0]), ['#ffb04a'], { size: 2.6, strength: 0.5, order: 16 });
      const lit = bulbs(U, strings, LIGHTS, { size: 0.42, chase: 1.5, strength: 1.5, order: 17 });
      group.add(warm, lit);
      group.userData.bulbs = [warm, lit];
      for (let f = Math.ceil((d0 * FT) / 1000) * 1000; f < d1 * FT; f += 1000) if (f > 0) group.add(distFlag(U, props, f, C, '#b0302f'));
    },
    update(dt, t, { mode, camera, d }) {
      sky.position.copy(camera.position);
      arch.visible = mode !== 'menu';
      chimneys = chimneys.filter((c) => c.z < -(d - 60) && c.z > -(d + 200));
      if (t - lastSmoke > 0.3) { lastSmoke = t; for (const c of chimneys) smoke.emit(c, 1, { speed: 0.35, up: 1, size: 1.2, life: 4.5, color: '#8b86b8', spread: 0.2, dir: { x: 0.3, y: 0.3, z: 0 } }); }
    },
    hit(o, p) { smoke.emit(p, 14, { speed: 2.5, up: 0.5, size: 1.2, life: 1.4, color: '#f4f0ff', spread: 1 }); },
  };
}

/* =================== Aurora Glacier =================== */
function glacier({ U }) {
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2('#101c3e', 0.006);
  scene.fog = fog;
  const MOON = new THREE.Vector3(0.42, 0.14, -0.9).normalize();
  U.uSun.value.copy(MOON);
  const A = { uAur: { value: 1.2 } };
  const AURORA = /* glsl */ `
    uniform float uAur;
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 aurora(vec3 d) {
      vec3 acc = vec3(0.0);
      float az = atan(d.x, -d.z);
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float base = 0.12 + fi * 0.07 + sin(az * 2.2 + uTime * 0.1 + fi * 1.9) * 0.08 + sin(az * 5.7 - uTime * 0.23 + fi) * 0.03;
        float hgt = d.y - base;
        float curtain = smoothstep(-0.01, 0.02, hgt) * exp(-max(hgt, 0.0) * (4.0 + fi * 1.6));
        float rays = 0.7 + 0.3 * sin(az * 34.0 + fi * 5.0 + vnoise(vec2(az * 8.0, uTime * 0.25 + fi)) * 5.0);
        float span = smoothstep(-2.6, -1.2, az + fi * 0.4) * smoothstep(2.8, 1.3, az - fi * 0.3);
        vec3 c = mix(S(0.2, 1.0, 0.6), S(0.75, 0.3, 1.0), smoothstep(0.03, 0.25, hgt));
        c = mix(c, S(0.2, 0.85, 1.0), 0.3 * mod(fi, 2.0));
        acc += c * curtain * rays * span * (0.6 + 0.4 * sin(uTime * 0.4 + fi * 2.1));
      }
      return acc * uAur;
    }`;
  const sky = skyDome(U, AURORA + /* glsl */ `
    vec3 sky0(vec3 d) {
      float h = d.y;
      vec3 col = mix(S(0.1, 0.17, 0.36), S(0.015, 0.025, 0.07), smoothstep(-0.02, 0.6, h));
      vec2 g = floor(d.xz / (h + 1.2) * 360.0);
      col += vec3(0.9, 0.95, 1.0) * step(0.996, h21(g)) * smoothstep(0.03, 0.2, h) * (0.5 + 0.5 * sin(uTime * 3.0 + h21(g + 7.0) * 40.0)) * 1.5;
      col += aurora(d) * 0.75;
      float md = max(dot(d, uSun), 0.0);
      col = mix(col, S(0.95, 0.96, 1.0) * (0.8 + 0.2 * vnoise(d.xy * 400.0)) * 3.0, smoothstep(0.99965, 0.9998, md));
      col += S(0.6, 0.75, 1.0) * (pow(md, 400.0) * 0.6 + pow(md, 25.0) * 0.12);
      return col;
    }` + ranges({ far: '#2e4886', near: '#1e2f60', snow: '#d2e2ff', shade: '#5a74b6', sea: '#7f9fd8', snowFar: 0.5, snowNear: 0.75, seed: 13, hFar: 0.075, hNear: 0.04, sharp: 1.8 }), A);
  scene.add(sky);
  const moonGlow = glow(U, '#9fc4ff', 110, 0.45, { order: -5 });
  scene.add(moonGlow);
  const hemi = new THREE.HemisphereLight('#5a7cd0', '#e2eeff', 1.35);
  const key = new THREE.DirectionalLight('#b6d2ff', 1.6); key.position.set(0.4, 0.6, -0.7);
  const aur = new THREE.DirectionalLight('#5cffb0', 0.45); aur.position.set(-0.5, 0.7, -0.4);
  scene.add(hemi, key, aur);
  const props = propMat(U, { rough: 0.35, metal: 0.05, emitK: 2.6 });
  // ice: glassy blue with a glow from inside
  const crystal = (h, r0, tint, n = 5) => {
    const ps = [];
    const R = rng(Math.round(h * 100 + r0 * 10));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R(), lean = 0.15 + R() * 0.35, hh = h * (i === 0 ? 1 : 0.4 + R() * 0.45), rr = r0 * (i === 0 ? 1 : 0.5 + R() * 0.3);
      const off = i === 0 ? 0 : r0 * 0.9;
      ps.push({ geo: Co(rr, hh, 6), color: tint, matrix: mat(Math.cos(a) * off, hh / 2, Math.sin(a) * off, Math.sin(a) * (i ? lean : 0), 0, -Math.cos(a) * (i ? lean : 0)), emit: 0.55 + R() * 0.4 });
    }
    ps.push({ geo: Sp(r0 * 1.4, 10, 6), color: SNOW, matrix: mat(0, 0, 0, 0, 0, 0, [1, 0.35, 1]) });
    return ps;
  };
  const kinds = {
    // a glowing ice marker at the track's edge every few meters: lights rushing past in the dark (JC, Nov 22 2026:
    // "Aurora glacier is notably slower feeling")
    beacon: { geo: merge([
      { geo: Cy(0.07, 0.1, 1.3, 6), color: '#cfe8ff', matrix: mat(0, 0.65, 0) },
      { geo: new THREE.OctahedronGeometry(0.26, 0), color: '#7fe3ff', matrix: mat(0, 1.55, 0, 0, 0, 0, [1, 1.6, 1]), emit: 2.4 },
    ]) },
    beacon2: { geo: merge([
      { geo: Cy(0.07, 0.1, 1.3, 6), color: '#cfe8ff', matrix: mat(0, 0.65, 0) },
      { geo: new THREE.OctahedronGeometry(0.26, 0), color: '#b496ff', matrix: mat(0, 1.55, 0, 0, 0, 0, [1, 1.6, 1]), emit: 2.4 },
    ]) },
    spire: { geo: merge(crystal(4.2, 0.7, '#7fe3ff')) },
    spire2: { geo: merge(crystal(6, 1.0, '#a68bff', 6)) },
    spire3: { geo: merge(crystal(3, 0.6, '#6dffc8', 4)) },
    berg: { geo: merge([
      { geo: new THREE.IcosahedronGeometry(1.3, 0), color: '#cfe8ff', matrix: mat(0, 0.8, 0, 0, 0, 0, [1, 0.85, 1]) },
      { geo: new THREE.IcosahedronGeometry(0.8, 0), color: '#9fd4ff', matrix: mat(0.6, 0.5, 0.4), emit: 0.25 },
      { geo: new THREE.SphereGeometry(1.0, 10, 6, 0, Math.PI * 2, 0, 0.9), color: SNOW, matrix: mat(0, 1.25, 0, 0, 0, 0, [1.1, 0.5, 1]) },
    ]) },
    drift: { geo: merge([{ geo: Sp(1.2, 12, 8), color: SNOW, matrix: mat(0, 0.1, 0, 0, 0, 0, [1.3, 0.7, 1.1]) }, { geo: Sp(0.8, 10, 7), color: '#e2ecff', matrix: mat(0.8, 0.0, 0.4) }]) },
    bigberg: { geo: merge([
      { geo: new THREE.IcosahedronGeometry(6, 0), color: '#b9dcff', matrix: mat(0, 3, 0, 0, 0, 0, [1.2, 1.1, 1]) },
      { geo: new THREE.IcosahedronGeometry(4, 0), color: '#8fc8ff', matrix: mat(5, 2, 2), emit: 0.2 },
      { geo: new THREE.SphereGeometry(5.5, 10, 6, 0, Math.PI * 2, 0, 0.8), color: SNOW, matrix: mat(0, 7.2, 0, 0, 0, 0, [1.3, 0.4, 1.1]) },
    ]) },
    igloo: { geo: merge([
      { geo: new THREE.SphereGeometry(2.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), color: '#f4f8ff', matrix: mat(0, 0, 0) },
      { geo: Cy(0.9, 0.9, 1.6, 12, 1), color: '#f4f8ff', matrix: mat(2.3, 0.6, 0, 0, 0, Math.PI / 2) },
      { geo: Cy(0.62, 0.62, 0.1, 12), color: '#ffb24a', matrix: mat(3.12, 0.55, 0, 0, 0, Math.PI / 2), emit: 2.6 },
    ]) },
  };
  const snowMat = snowMaterial(U, { a: '#c3d2f3', b: '#e6eeff', bank: '#8299d2', glint: '#bfe6ff', glintK: 2.6, track: 0.1, ripple: 0.14 });
  // ice that mirrors the northern lights, with cracks in it
  const iceMat = patchStandard(new THREE.MeshStandardMaterial({ color: '#7fb3ff', roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.92 }), U, {
    uniforms: A,
    decl: AURORA + 'uniform vec3 uSun;',
    post: /* glsl */ `{
      vec3 V = normalize(vWP - cameraPosition), R = reflect(V, vec3(0.0, 1.0, 0.0));
      vec3 env = mix(S(0.12, 0.2, 0.42), S(0.02, 0.04, 0.1), smoothstep(0.0, 0.5, R.y)) + aurora(R) * 0.9;
      env += vec3(0.8, 0.88, 1.0) * pow(max(dot(R, uSun), 0.0), 300.0) * 3.0;
      float cracks = smoothstep(0.03, 0.0, abs(vnoise(vWP.xz * 0.9) - 0.5)) * 0.5 + smoothstep(0.02, 0.0, abs(vnoise(vWP.xz * 2.3 + 4.0) - 0.5)) * 0.3;
      outgoingLight = mix(outgoingLight, env, 0.75) + vec3(0.65, 0.85, 1.0) * cracks;
    }`,
  });
  iceMat.depthWrite = false;
  // a crevasse: a deep blue slot with glowing walls
  const crevMat = patchStandard(new THREE.MeshStandardMaterial({ color: '#06102a', roughness: 0.9 }), U, {
    vdecl: 'attribute float aEdge; varying float vEdge;', vertex: 'vEdge = aEdge;',
    decl: 'varying float vEdge;',
    emissive: 'totalEmissiveRadiance += vec3(0.25, 0.7, 1.0) * pow(abs(vEdge), 6.0) * (1.4 + 0.4 * sin(uTime * 3.0 + vWP.x));',
  });
  const glitter = bursts(U, { n: 300, shape: 'drop', grav: 0.05, drag: 0.5, opacity: 0.9, blend: THREE.AdditiveBlending });
  scene.add(glitter.mesh);
  const arch = startArch(U, props, 'Aurora Glacier', { post: '#9fd4ff', bg: '#16234a', glow: 0.35 });
  scene.add(arch);
  let lastGl = 0;
  return {
    scene, props, snowMat, kinds, exposure: 1.2, iceMat,
    rampMat: rampMaterial(U, '#dfeaff'),
    sprayCols: ['#ffffff', '#dff0ff', '#bfe0ff'],
    flakes: { color: '#e4f0ff', k: 1, fall: 0.9 },
    reset(C) { arch.position.set(C.center(12), C.height(C.center(12), 12), -12); },
    barrier(o, { C, group }) {
      const cols = 14, g = new THREE.BufferGeometry(), pos = [], edge = [], idx = [];
      for (let j = 0; j <= 2; j++) {
        const d = o.d - o.hd + (j / 2) * o.hd * 2;
        for (let i = 0; i <= cols; i++) { const x = o.x0 + (i / cols) * (o.x1 - o.x0); pos.push(x, C.height(x, d) + 0.03, -d); edge.push(j - 1); }
      }
      for (let j = 0; j < 2; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i; idx.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1); }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, crevMat); m.userData.own = true;
      group.add(m);
      const lip = bulbs(U, Array.from({ length: Math.ceil((o.x1 - o.x0) / 0.8) }, (_, i) => { const x = o.x0 + i * 0.8; return [x, C.height(x, o.d) + 0.15, -(o.d - o.hd), 0]; }), ['#59d8ff'], { size: 0.5, strength: 0.7 });
      group.add(lip); (group.userData.bulbs || (group.userData.bulbs = [])).push(lip);
    },
    decorate(k, d0, d1, { put, at, C, group, quality }) {
      const r = rng(k * 151 + 11), glows = [];
      const spires = ['spire', 'spire2', 'spire3'], gcol = ['#59d8ff', '#a68bff', '#5dffc0'];
      // the markers down both edges, every 12 m
      for (let d = Math.ceil(d0 / 12) * 12; d < d1; d += 12) for (const s of [-1, 1]) {
        const x = C.center(d) + s * (C.halfWidth(d) + EDGE + 0.5), j = (d / 12 + (s > 0 ? 1 : 0)) % 2;
        put(j ? 'beacon2' : 'beacon', at(x, d));
        glows.push([x, C.height(x, d) + 1.55, -d, j ? 1 : 0]);
      }
      for (const s of [-1, 1]) {
        for (let d = d0 + r() * 3; d < d1; d += 3 + r() * 3) {
          const u = s * (C.halfWidth(d) + EDGE + 0.8 + r() * 3), x = C.center(d) + u, i = Math.floor(r() * 3), sc = 0.7 + r() * 0.8;
          put(spires[i], at(x, d, r() * 6, sc));
          if (r() < 0.4) glows.push([x, C.height(x, d) + 1.5 * sc, -d, i]);
        }
        const n = quality >= 1 ? 10 : 20;
        for (let i = 0; i < n; i++) {
          const d = d0 + r() * (d1 - d0), u = s * (C.halfWidth(d) + 7 + Math.pow(r(), 0.8) * 75), x = C.center(d) + u, j = Math.floor(r() * 3);
          if (r() < 0.25) put('bigberg', at(x, d, r() * 6, 0.6 + r() * 0.8, -1));
          else { const sc = 1 + r() * 1.6; put(spires[j], at(x, d, r() * 6, sc)); if (r() < 0.35) glows.push([x, C.height(x, d) + 2 * sc, -d, j]); }
        }
        for (let i = 0; i < 4; i++) { const d = d0 + r() * (d1 - d0), u = s * (C.halfWidth(d) + 2.5 + r() * 8); put('drift', at(C.center(d) + u, d, r() * 6, 0.8 + r() * 0.8, -0.2)); }
      }
      if (k > 1 && r() < 0.3) {
        const s = r() < 0.5 ? -1 : 1, d = d0 + 15 + r() * 20, u = s * (C.halfWidth(d) + 10 + r() * 6), x = C.center(d) + u;
        put('igloo', at(x, d, s < 0 ? 0 : Math.PI, 1, -0.1));
        glows.push([x - s * 3.2, C.height(x, d) + 0.6, -d, 3]);
      }
      const gl = bulbs(U, glows, [...gcol, '#ffb24a'], { size: 3.2, strength: 0.32, order: 16 });
      group.add(gl); (group.userData.bulbs || (group.userData.bulbs = [])).push(gl);
      for (let f = Math.ceil((d0 * FT) / 1000) * 1000; f < d1 * FT; f += 1000) if (f > 0) group.add(distFlag(U, props, f, C, '#16234a'));
    },
    update(dt, t, { mode, camera, goat }) {
      sky.position.copy(camera.position);
      arch.visible = mode !== 'menu';
      moonGlow.position.copy(camera.position).addScaledVector(MOON, 420); moonGlow.lookAt(camera.position);
      A.uAur.value = 0.85 + 0.2 * Math.sin(t * 0.35);
      if (t - lastGl > 0.04) { lastGl = t; glitter.emit({ x: goat.x + (Math.random() - 0.5) * 26, y: goat.y + 0.5 + Math.random() * 5, z: goat.z - 4 - Math.random() * 24 }, 2, { speed: 0.25, up: 0.5, size: 0.06, life: 2.4, colors: ['#9fe8ff', '#c9b6ff', '#a8ffd8'], spread: 2 }); }
    },
    hit(o, p) { glitter.emit(p, 30, { speed: 3, up: 0.5, size: 0.12, life: 1.2, colors: ['#9fe8ff', '#ffffff'], spread: 1, sphere: true }); },
  };
}

// a flag at the side of the run every 1,000 ft
function distFlag(U, props, f, C, color) {
  const g = new THREE.Group(), m = f / FT;
  const x = C.center(m) + C.halfWidth(m) + EDGE + 0.4, y = C.height(x, m);
  const pole = new THREE.Mesh(merge([{ geo: Cy(0.06, 0.08, 3.2, 6), color: '#2b2b33', matrix: mat(0, 1.6, 0) }]), props);
  pole.userData.own = true;
  g.add(pole);
  const sign = panel(wordsTex([`${f.toLocaleString('en-US')} ft`], { w: 512, h: 256, bg: color, size: 0.5 }), 2.4, 1.2, { glowK: 0.25 });
  sign.position.set(-1.25, 2.6, 0.02); sign.userData.full = true;
  g.add(sign);
  g.position.set(x, y, -m); g.rotation.y = -0.25;
  return g;
}

function cabinGeo() {
  const parts = [];
  for (let i = 0; i < 9; i++) {
    parts.push({ geo: Cy(0.17, 0.17, 5.4, 8), color: i % 2 ? '#6b4428' : '#5c3a22', matrix: mat(0, 0.17 + i * 0.32, 2.0, 0, 0, Math.PI / 2) });
    parts.push({ geo: Cy(0.17, 0.17, 4.4, 8), color: i % 2 ? '#5c3a22' : '#6b4428', matrix: mat(-2.6, 0.17 + i * 0.32, 0, Math.PI / 2) });
    parts.push({ geo: Cy(0.17, 0.17, 4.4, 8), color: i % 2 ? '#5c3a22' : '#6b4428', matrix: mat(2.6, 0.17 + i * 0.32, 0, Math.PI / 2) });
  }
  parts.push({ geo: Bx(5.2, 2.9, 4.0), color: '#4a2f1c', matrix: mat(0, 1.45, 0) });
  parts.push({ geo: prism(6.2, 5.4, 2.2), color: '#3a2a20', matrix: mat(0, 2.9, 0) });
  parts.push({ geo: prism(6.4, 5.6, 2.25), color: '#f4f8ff', matrix: mat(0, 3.02, 0) });
  parts.push({ geo: Bx(0.9, 1.7, 0.1), color: '#3b2416', matrix: mat(0.6, 0.95, 2.2) });
  for (const x of [-1.5, 1.9]) { parts.push({ geo: Bx(0.95, 0.8, 0.1), color: '#ffb35a', matrix: mat(x, 1.6, 2.2), emit: 1.2 }); parts.push({ geo: Bx(1.1, 0.08, 0.14), color: '#f4f8ff', matrix: mat(x, 2.05, 2.25) }); }
  parts.push({ geo: Bx(0.7, 2.4, 0.7), color: '#6d6a72', matrix: mat(1.6, 4.0, -0.8) });
  parts.push({ geo: Bx(0.8, 0.12, 0.8), color: '#f4f8ff', matrix: mat(1.6, 5.22, -0.8) });
  return merge(parts);
}

export const SCENE_BUILDERS = [pinewood, village, glacier];
void SLOPE; void RAMP_LEN;
