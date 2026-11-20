/* The snowfall: a clearing in a pine forest at night, snow drifting down. The northern lights wave over the
   mountains, the moon is up, stars twinkle; a log cabin glows warm through the trees with smoke from its chimney,
   lanterns line the trail to it, a snowman with a red scarf keeps you company and the frozen pond shines. Your
   breath puffs in the cold. A rep kicks up snow, every tenth sends a shooting star over and the snowman waves, a
   new move makes the northern lights flare. */
import { THREE, rng, NOISE, FOG, shaderMat, patchStandard, skyDome, quadInstances, bursts, glow, merge, mat, propMat, noiseLoop, ping } from './core.js';

const MOON = new THREE.Vector3(-0.42, 0.16, -0.9).normalize();      // low over the mountains, through the gap in the trees
// the snow's height: flat where things stand (16 m round the clearing), drifts beyond, rising toward the far trees
function snowH(x, z) {
  const d = Math.hypot(x, z * 1.1);
  const drift = (Math.sin(x * 0.21 + z * 0.13) * 0.5 + Math.sin(x * 0.07 - z * 0.19) * 0.5) * 0.5 * Math.min(1, Math.max(0, (d - 16) / 10));
  return drift + Math.sin(x * 0.6 + z * 0.4) * 0.05 + (d > 60 ? (d - 60) * 0.06 : 0);
}
const clearAt = (x, z) => Math.hypot(x, z * 1.15) < 5.2 || (z > -1 && Math.abs(x) < 4 + Math.max(0, z));

export default function buildSnow(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(33);
  const fog = new THREE.FogExp2('#1b2b54', 0.011);
  scene.fog = fog;
  U.uSun.value.copy(MOON);
  const A = { uAur: { value: 1 }, uShoot: { value: -99 }, uShootA: { value: new THREE.Vector3(-0.6, 0.55, -0.6).normalize() }, uShootB: { value: new THREE.Vector3(0.5, 0.3, -0.8).normalize() } };

  /* ---- the sky: night blue, stars, the moon and its halo, the northern lights, a shooting star now and then ---- */
  scene.add(skyDome(U, /* glsl */ `
    uniform float uAur; uniform float uShoot; uniform vec3 uShootA; uniform vec3 uShootB;
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 aurora(vec3 d) {
      vec3 acc = vec3(0.0);
      float az = atan(d.x, -d.z);
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float base = 0.1 + fi * 0.06 + sin(az * 2.6 + uTime * 0.12 + fi * 1.9) * 0.07 + sin(az * 6.3 - uTime * 0.27 + fi) * 0.025;
        float hgt = d.y - base;
        float curtain = smoothstep(-0.01, 0.015, hgt) * exp(-max(hgt, 0.0) * (5.0 + fi * 2.0));
        float rays = 0.45 + 0.55 * sin(az * 70.0 + fi * 5.0 + vnoise(vec2(az * 14.0, uTime * 0.35 + fi)) * 7.0);
        float span = smoothstep(-1.5, -0.5, az + fi * 0.3) * smoothstep(1.7, 0.6, az - fi * 0.2);
        vec3 c = mix(S(0.25, 1.0, 0.62), S(0.7, 0.3, 1.0), smoothstep(0.02, 0.22, hgt));
        c = mix(c, S(0.2, 0.9, 1.0), 0.25 * fi);
        acc += c * curtain * rays * span * (0.65 + 0.35 * sin(uTime * 0.45 + fi * 2.1));
      }
      return acc * uAur;
    }
    vec3 sky(vec3 d) {
      float h = d.y;
      vec3 col = mix(S(0.17, 0.26, 0.46), S(0.02, 0.035, 0.09), smoothstep(-0.02, 0.6, h));
      // stars
      vec2 g = floor(d.xz / (h + 1.2) * 340.0);
      float st = step(0.9965, h21(g)) * smoothstep(0.03, 0.2, h);
      col += vec3(0.9, 0.95, 1.0) * st * (0.5 + 0.5 * sin(uTime * 3.0 + h21(g + 7.0) * 40.0)) * 1.4;
      col += aurora(d) * 1.4;
      // the moon, its craters, its halo
      float md = max(dot(d, uSun), 0.0);
      float disk = smoothstep(0.99965, 0.9998, md);
      col = mix(col, S(0.95, 0.95, 0.88) * (0.8 + 0.2 * vnoise(d.xy * 400.0)) * 3.0, disk);
      col += S(0.6, 0.7, 1.0) * (pow(md, 400.0) * 0.6 + pow(md, 30.0) * 0.12);
      // a few thin clouds drifting across
      vec2 uv = d.xz / max(h + 0.1, 0.05) * 0.6 + vec2(uTime * 0.006, 0.0);
      col = mix(col, S(0.2, 0.26, 0.42) + S(0.6, 0.65, 0.8) * pow(md, 20.0), smoothstep(0.6, 0.85, fbm(uv)) * 0.5 * smoothstep(0.0, 0.15, h));
      // a shooting star
      float k = (uTime - uShoot) / 0.9;
      if (k > 0.0 && k < 1.2) {
        vec3 head = normalize(mix(uShootA, uShootB, min(k, 1.0))), tail = normalize(mix(uShootA, uShootB, max(0.0, k - 0.22)));
        vec3 ab = head - tail; float tt = clamp(dot(d - tail, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
        float dd = length(d - (tail + ab * tt));
        col += vec3(1.0, 0.95, 0.85) * smoothstep(0.004, 0.0, dd) * tt * (1.0 - smoothstep(0.9, 1.2, k)) * 4.0;
      }
      return col;
    }`, A));
  const moonGlow = glow(U, '#9fb8ff', 120, 0.45, { order: -5 });
  scene.add(moonGlow);

  /* ---- mountains behind the forest, snow on their tops ---- */
  {
    const g = new THREE.PlaneGeometry(1000, 160, 140, 10), p = g.attributes.position, cols = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), back = (y + 80) / 160;
      const ridge = Math.abs(Math.sin(x * 0.011 + 1.3)) * 0.55 + Math.abs(Math.sin(x * 0.027 + 0.4)) * 0.3 + Math.abs(Math.sin(x * 0.071)) * 0.15;
      const h = ridge * 120 * Math.sin(back * Math.PI * 0.5);
      p.setZ(i, h);
      const c = new THREE.Color('#2b3c63').lerp(new THREE.Color('#dfe8ff'), Math.min(1, Math.max(0, (h - 45) / 35)));
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, fog: false }));   // seen through the night air, not lost in it
    m.rotation.x = -Math.PI / 2; m.position.set(0, -2, -300);
    scene.add(m);
  }

  /* ---- light: the moon from behind and to the left, the snow bouncing the sky's blue, a warm cabin ---- */
  const hemi = new THREE.HemisphereLight('#5a78c0', '#dce6ff', 1.0);
  const key = new THREE.DirectionalLight('#b3cbff', 1.8);
  key.position.set(-0.5, 0.75, -0.55).normalize().multiplyScalar(40);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 90 });
  key.shadow.radius = 5; key.shadow.bias = -0.0005;
  const cabinLight = new THREE.PointLight('#ffa548', 30, 18, 1.5); cabinLight.position.set(5.2, 2.0, -10.2);
  scene.add(hemi, key, key.target, cabinLight);

  /* ---- the snow: soft drifts, a trodden trail to the cabin, glints that twinkle ---- */
  const groundGeo = new THREE.PlaneGeometry(240, 240, 110, 110);
  {
    const p = groundGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = -p.getY(i) - 100;
      p.setZ(i, snowH(x, z));
    }
    groundGeo.computeVertexNormals();
  }
  const snowMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.75 }), U, {
    decl: /* glsl */ `
      vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      float trail(vec2 p) {   // from the clearing to the cabin's door
        vec2 a = vec2(0.0, -3.0), b = vec2(4.4, -9.6), ab = b - a;
        float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
        float d = length(p - (a + ab * t) - vec2(sin(t * 6.0) * 0.4, 0.0));
        return 1.0 - smoothstep(0.35, 0.7, d);
      }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz;
      vec3 sn = mix(S(0.84, 0.89, 1.0), S(0.95, 0.97, 1.0), vnoise(p * 0.8));
      sn = mix(sn, S(0.7, 0.78, 0.95), trail(p) * 0.45);
      diffuseColor.rgb = sn;
    }`,
    post: /* glsl */ `{
      // glints: tiny ice crystals catching the moon, each twinkling on its own
      vec2 c = floor(vWP.xz * 70.0);
      float s = h21(c), tw = 0.5 + 0.5 * sin(uTime * (2.0 + s * 5.0) + s * 60.0);
      float d = length(vWP - cameraPosition);
      outgoingLight += vec3(0.85, 0.92, 1.0) * step(0.993, s) * tw * tw * smoothstep(14.0, 2.0, d) * 2.2;
    }`,
  });
  const ground = new THREE.Mesh(groundGeo, snowMat);
  ground.rotation.x = -Math.PI / 2; ground.position.z = -100; ground.receiveShadow = true;
  scene.add(ground);

  /* ---- the frozen pond, mirroring the northern lights and the moon ---- */
  const pondMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.15, color: '#28406e' }), U, {
    uniforms: A,
    decl: /* glsl */ `uniform float uAur; uniform vec3 uSun; vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }`,
    post: /* glsl */ `{
      vec3 V = normalize(vWP - cameraPosition), R = reflect(V, vec3(0.0, 1.0, 0.0));
      float az = atan(R.x, -R.z);
      vec3 env = mix(S(0.17, 0.26, 0.46), S(0.03, 0.05, 0.12), smoothstep(0.0, 0.5, R.y));
      env += S(0.25, 1.0, 0.62) * smoothstep(0.15, 0.3, R.y) * smoothstep(0.55, 0.3, R.y) * smoothstep(-1.4, -0.4, az) * smoothstep(1.6, 0.5, az) * uAur * (0.6 + 0.4 * sin(az * 40.0 + uTime));
      env += vec3(0.8, 0.85, 1.0) * pow(max(dot(R, uSun), 0.0), 300.0) * 3.0;
      float cracks = smoothstep(0.02, 0.0, abs(vnoise(vWP.xz * 1.3) - 0.5)) * 0.3;
      outgoingLight = mix(outgoingLight, env, 0.7) + vec3(0.6, 0.7, 0.9) * cracks;
    }`,
  });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 48), pondMat);
  pond.rotation.x = -Math.PI / 2; pond.position.set(-5.5, 0.03, -10); pond.scale.set(4.2, 2.6, 1); scene.add(pond);

  /* ---- the forest: snowy pines, hundreds of them in one draw ---- */
  const props = propMat(U, { rough: 0.85, emitK: 3 });
  const pineParts = [{ geo: new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6), color: '#4a3324', matrix: mat(0, 0.7, 0) }];
  for (let k = 0; k < 4; k++) {
    const y = 1.0 + k * 1.15, rad = 1.6 - k * 0.34, h = 1.8 - k * 0.2;
    pineParts.push({ geo: new THREE.ConeGeometry(rad, h, 7), color: k % 2 ? '#1f4a3a' : '#24533f', matrix: mat(0, y + h / 2, 0) });
    pineParts.push({ geo: new THREE.ConeGeometry(rad * 0.72, h * 0.42, 7), color: '#e8f0ff', matrix: mat(0, y + h * 0.82, 0) });
  }
  const pineGeo = merge(pineParts);
  const trees = [];
  for (let i = 0; i < 4000 && trees.length < 760; i++) {
    const a = r() * Math.PI * 2, d = 9 + Math.pow(r(), 0.7) * 110, x = Math.cos(a) * d, z = Math.sin(a) * d - 6;
    if (z > 2 || clearAt(x, z) || Math.abs(x) > (2.5 - z) * 1.05 + 4) continue;
    // a valley through the trees behind you: the mountains, the moon and the northern lights show through it
    if (z < -9 && Math.abs(x + 4 + z * 0.12) < 5 + (-z - 9) * 0.32 && r() < 0.92) continue;
    if (Math.hypot(x - 5.5, z + 12) < 4.5 || Math.hypot(x + 5.5, (z + 10) * 1.4) < 5.6) continue;     // the cabin, the pond
    trees.push([x, z, 0.7 + r() * 0.9]);
  }
  const forest = new THREE.InstancedMesh(pineGeo, props, trees.length);
  trees.forEach(([x, z, s], i) => forest.setMatrixAt(i, mat(x, snowH(x, z) - 0.1, z, 0, r() * 6, 0, [s, s * (0.9 + r() * 0.35), s])));
  scene.add(forest);

  /* ---- the log cabin, the lanterns, the snowman and his sled ---- */
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
  const prism = (w, d, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g; };
  const cabin = [];
  for (let i = 0; i < 9; i++) {
    cabin.push({ geo: C(0.17, 0.17, 5.4, 8), color: i % 2 ? '#6b4428' : '#5c3a22', matrix: mat(0, 0.17 + i * 0.32, 2.0, 0, 0, Math.PI / 2) });
    cabin.push({ geo: C(0.17, 0.17, 4.4, 8), color: i % 2 ? '#5c3a22' : '#6b4428', matrix: mat(-2.6, 0.17 + i * 0.32, 0, Math.PI / 2) });
    cabin.push({ geo: C(0.17, 0.17, 4.4, 8), color: i % 2 ? '#5c3a22' : '#6b4428', matrix: mat(2.6, 0.17 + i * 0.32, 0, Math.PI / 2) });
  }
  cabin.push({ geo: B(5.2, 2.9, 4.0), color: '#4a2f1c', matrix: mat(0, 1.45, 0) });
  cabin.push({ geo: prism(6.2, 5.4, 2.2), color: '#3a2a20', matrix: mat(0, 2.9, 0) });
  cabin.push({ geo: prism(6.4, 5.6, 2.25), color: '#eef3ff', matrix: mat(0, 3.02, 0) });
  cabin.push({ geo: B(0.9, 1.7, 0.1), color: '#3b2416', matrix: mat(0.6, 0.95, 2.2) });
  for (const x of [-1.5, 1.9]) { cabin.push({ geo: B(0.95, 0.8, 0.1), color: '#ffb35a', matrix: mat(x, 1.6, 2.2), emit: 1.4 }); cabin.push({ geo: B(1.1, 0.08, 0.14), color: '#eef3ff', matrix: mat(x, 2.05, 2.25) }); cabin.push({ geo: B(0.06, 0.8, 0.12), color: '#3b2416', matrix: mat(x, 1.6, 2.24) }); }
  cabin.push({ geo: B(0.7, 2.4, 0.7), color: '#6d6a72', matrix: mat(1.6, 4.0, -0.8) });
  cabin.push({ geo: B(0.8, 0.12, 0.8), color: '#eef3ff', matrix: mat(1.6, 5.22, -0.8) });
  cabin.push({ geo: new THREE.SphereGeometry(0.1, 8, 6), color: '#ffcf8a', matrix: mat(1.35, 2.3, 2.3), emit: 3 });
  const cab = new THREE.Mesh(merge(cabin), props); cab.position.set(5.6, 0, -12.6); cab.rotation.y = -0.55; scene.add(cab);
  const chimneyAt = new THREE.Vector3(1.6, 5.4, -0.8).applyMatrix4(cab.matrixWorld.compose(cab.position, cab.quaternion, cab.scale));
  const porchGlow = glow(U, '#ffb35a', 2.4, 0.8); porchGlow.position.set(1.35, 2.3, 2.4).applyMatrix4(cab.matrixWorld); scene.add(porchGlow);
  const winGlows = [-1.5, 1.9].map((x) => { const g = glow(U, '#ffa548', 2.2, 0.5); g.position.set(x, 1.6, 2.4).applyMatrix4(cab.matrixWorld); scene.add(g); return g; });
  // lanterns along the trail
  const lanternAt = [[1.4, -4.4], [2.6, -6.8], [3.9, -8.9], [-3.4, -6.4]];
  const lanternParts = [];
  for (const [x, z] of lanternAt) {
    lanternParts.push({ geo: C(0.05, 0.06, 1.1, 6), color: '#2b2b33', matrix: mat(x, 0.55, z) });
    lanternParts.push({ geo: B(0.24, 0.3, 0.24), color: '#ffc46b', matrix: mat(x, 1.25, z), emit: 2.2 });
    lanternParts.push({ geo: new THREE.ConeGeometry(0.22, 0.14, 4), color: '#2b2b33', matrix: mat(x, 1.47, z, 0, Math.PI / 4) });
    lanternParts.push({ geo: new THREE.ConeGeometry(0.2, 0.1, 4), color: '#eef3ff', matrix: mat(x, 1.53, z, 0, Math.PI / 4) });
  }
  scene.add(new THREE.Mesh(merge(lanternParts), props));
  const lanternGlows = lanternAt.map(([x, z]) => { const g = glow(U, '#ffb04a', 1.5, 0.7); g.position.set(x, 1.25, z); scene.add(g); return g; });
  // the snowman: three balls, coal eyes and buttons, a carrot, a red scarf, a top hat, stick arms that wave
  const sm = new THREE.Group(); sm.position.set(-1.9, 0, -4.4); sm.rotation.y = 0.35; scene.add(sm);
  sm.add(new THREE.Mesh(merge([
    { geo: new THREE.SphereGeometry(0.52, 18, 14), color: '#f4f7ff', matrix: mat(0, 0.45, 0) },
    { geo: new THREE.SphereGeometry(0.38, 18, 14), color: '#f4f7ff', matrix: mat(0, 1.1, 0) },
    { geo: new THREE.SphereGeometry(0.27, 18, 14), color: '#f4f7ff', matrix: mat(0, 1.6, 0) },
    { geo: new THREE.SphereGeometry(0.035, 6, 5), color: '#111', matrix: mat(-0.09, 1.67, 0.24) },
    { geo: new THREE.SphereGeometry(0.035, 6, 5), color: '#111', matrix: mat(0.09, 1.67, 0.24) },
    { geo: new THREE.ConeGeometry(0.045, 0.3, 8), color: '#ff7a1a', matrix: mat(0, 1.6, 0.38, Math.PI / 2) },
    { geo: new THREE.SphereGeometry(0.04, 6, 5), color: '#111', matrix: mat(0, 1.2, 0.37) },
    { geo: new THREE.SphereGeometry(0.04, 6, 5), color: '#111', matrix: mat(0, 1.02, 0.38) },
    { geo: new THREE.TorusGeometry(0.27, 0.07, 8, 20), color: '#d6262b', matrix: mat(0, 1.38, 0, Math.PI / 2) },
    { geo: B(0.12, 0.42, 0.05), color: '#d6262b', matrix: mat(0.16, 1.2, 0.27, 0.2, 0, 0.15) },
    { geo: C(0.25, 0.25, 0.04, 16), color: '#1a1a22', matrix: mat(0, 1.84, 0) },
    { geo: C(0.17, 0.17, 0.32, 16), color: '#1a1a22', matrix: mat(0, 2.0, 0) },
    { geo: C(0.175, 0.175, 0.06, 16), color: '#d6262b', matrix: mat(0, 1.9, 0) },
  ]), props));
  const armL = new THREE.Mesh(merge([{ geo: C(0.02, 0.03, 0.75, 5), color: '#5a3b22', matrix: mat(0, 0.37, 0) }, { geo: C(0.012, 0.015, 0.2, 4), color: '#5a3b22', matrix: mat(0.06, 0.68, 0, 0, 0, -0.6) }]), props);
  const armR = armL.clone();
  armL.position.set(-0.34, 1.15, 0); armL.rotation.z = 1.0; armR.position.set(0.34, 1.15, 0); armR.rotation.z = -1.0;
  sm.add(armL, armR);
  scene.add(new THREE.Mesh(merge([
    { geo: B(0.5, 0.06, 1.2), color: '#c4262b', matrix: mat(0, 0.18, 0) },
    { geo: B(0.04, 0.12, 1.3), color: '#888', matrix: mat(-0.22, 0.06, 0.02) },
    { geo: B(0.04, 0.12, 1.3), color: '#888', matrix: mat(0.22, 0.06, 0.02) },
  ]), props).translateX(-1.1).translateZ(-4.9).rotateY(0.9));

  /* ---- snow falling: soft flakes, a few big blurry ones close to the camera ---- */
  const flakeN = 4200;
  const flakeMat = shaderMat(U, {
    uniforms: { uSwirl: { value: 0 }, uSwirlX: { value: 0 } },
    vertex: /* glsl */ `attribute vec4 aF; uniform float uTime; uniform float uSwirl; uniform float uSwirlX; varying vec2 vUv; varying float vA;
      void main() {
        float H = 7.5, sp = 0.55 + aF.w * 0.5;
        float ph = fract(aF.y + uTime * sp / H);
        vec3 p = vec3(aF.x, H * (1.0 - ph) - 0.2, aF.z);
        p.x += sin(uTime * 0.7 + aF.w * 30.0) * 0.35 + sin(uTime * 0.23 + aF.w * 11.0) * 0.6 + uTime * 0.12;
        p.z += cos(uTime * 0.5 + aF.w * 21.0) * 0.25;
        // a whirl around you when you move big
        vec2 rel = p.xz - vec2(uSwirlX, 0.2); float rr = length(rel);
        float sw = uSwirl * exp(-rr * 0.8);
        p.xz = vec2(uSwirlX, 0.2) + mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * rel; p.y += sw * 0.3;
        p.x = mod(p.x + 10.0, 20.0) - 10.0;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        float sz = 0.022 + 0.018 * fract(aF.w * 17.0);
        mv.xy += vec2(position.x, position.y - 0.5) * sz;
        gl_Position = projectionMatrix * mv;
        vUv = vec2(position.x + 0.5, position.y); vA = smoothstep(0.3, 1.0, dist) * (1.0 - smoothstep(16.0, 26.0, dist));
      }`,
    fragment: /* glsl */ `varying vec2 vUv; varying float vA;
      void main() { float a = smoothstep(1.0, 0.15, length(vUv - 0.5) * 2.0) * vA * 0.9; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.92, 0.95, 1.0), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
  const flakes = new THREE.Mesh(quadInstances(flakeN, [['aF', 4, (a, o) => a.set([(r() - 0.5) * 20, r(), -18 + r() * 21, r()], o)]]), flakeMat);
  flakes.frustumCulled = false; flakes.renderOrder = 20; scene.add(flakes);
  const bokehMat = shaderMat(U, {
    vertex: /* glsl */ `attribute vec4 aF; uniform float uTime; varying vec2 vUv;
      void main() {
        float ph = fract(aF.y + uTime * (0.05 + aF.w * 0.04));
        vec3 rel = vec3(aF.x * 1.6 + sin(uTime * 0.4 + aF.w * 20.0) * 0.2, (0.5 - ph) * 2.6, -0.6 - aF.z * 0.9);
        vec4 mv = vec4(rel, 1.0);
        mv.xy += vec2(position.x, position.y - 0.5) * (0.05 + aF.w * 0.06);
        gl_Position = projectionMatrix * mv; vUv = vec2(position.x + 0.5, position.y);
      }`,
    fragment: /* glsl */ `varying vec2 vUv;
      void main() { float r = length(vUv - 0.5) * 2.0; float a = (smoothstep(1.0, 0.6, r) * 0.6 + smoothstep(1.0, 0.85, r) * 0.25) * 0.28; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, depthTest: false,
  });
  const bokeh = new THREE.Mesh(quadInstances(26, [['aF', 4, (a, o) => a.set([r() - 0.5, r(), r(), r()], o)]]), bokehMat);
  bokeh.frustumCulled = false; bokeh.renderOrder = 30; scene.add(bokeh);

  /* ---- breath in the cold, snow kicked up, chimney smoke ---- */
  const puffs = bursts(U, { n: 90, shape: 'puff', grav: 0.25, drag: 1.6, opacity: 0.45 });
  const kick = bursts(U, { n: 200, shape: 'dot', grav: -4, drag: 1.4 });
  scene.add(puffs.mesh, kick.mesh);
  let smokeAt = 0, waveAt = -99, flareAt = -99;
  const breathAt = [0, 1.4];
  const chime = (ac, t0 = 0) => [1568, 1976, 2349, 3136].forEach((f, i) => ping(ac, f, t0 + i * 0.09, 1.6, { vol: 0.03 }));

  const place = {
    scene, fog, key, camH: 1.45, exposure: 1.12,
    pup: { tint: new THREE.Color(0.82, 0.87, 1.0), rim: new THREE.Color('#a9c6ff').multiplyScalar(0.9), rimDir: [-0.7, 0.6], rim2: new THREE.Color('#ffaa55').multiplyScalar(0.55), rimDir2: [0.8, 0.2] },
    update(dt, t, info) {
      const cam = env.camera.position;
      moonGlow.position.copy(cam).addScaledVector(MOON, 420); moonGlow.lookAt(cam);
      // the northern lights breathe, and flare after a move starts
      A.uAur.value = 0.9 + 0.15 * Math.sin(t * 0.3) + Math.max(0, 1 - (t - flareAt) / 4) * 1.4;
      // the snowman waves after a big one
      const w = t - waveAt;
      armR.rotation.z = w < 2.4 ? -2.2 + Math.sin(w * 9) * 0.45 : -1.0 + Math.sin(t * 0.8) * 0.04;
      flakeMat.uniforms.uSwirl.value = Math.max(0, flakeMat.uniforms.uSwirl.value - dt * 0.8);
      lanternGlows.forEach((g, i) => { g.material.uniforms.uK.value = 0.62 + Math.sin(t * 7 + i * 3) * 0.05 + Math.sin(t * 13 + i) * 0.03; });
      if (t - smokeAt > 0.5) { smokeAt = t; puffs.emit(chimneyAt, 1, { speed: 0.35, up: 1, size: 0.7, life: 4, color: '#9aa6c4', spread: 0.15, dir: { x: 0.25, y: 0.3, z: 0 } }); }
      // breath: a little cloud from each player's mouth every few seconds
      info.players.forEach((p, i) => {
        if (!p || !p.head || t - (breathAt[i] || 0) < 2.6) return;
        breathAt[i] = t;
        const h = info.toWorld(p.head.x, p.head.y, 0.18);
        puffs.emit({ x: h.x, y: h.y - 0.08, z: h.z }, 3, { speed: 0.35, up: 0.2, size: 0.16, life: 1.6, color: '#e8eeff', spread: 0.04, dir: { x: 0, y: 0.05, z: 0.35 } });
      });
    },
    pulse(kind, at) {
      const f = at.foot, t = U.uTime.value;
      if (kind === 'rep') kick.emit(f, 14, { speed: 1.5, up: 0.6, size: 0.04, life: 1.1, colors: ['#ffffff', '#dfe8ff', '#cfdcff'], spread: 0.6 });
      else if (kind === 'big') {
        A.uShoot.value = t;
        const s = Math.random() < 0.5 ? 1 : -1;
        A.uShootA.value.set(-0.6 * s, 0.6 + Math.random() * 0.15, -0.6).normalize(); A.uShootB.value.set(0.45 * s, 0.32, -0.85).normalize();
        waveAt = t; flakeMat.uniforms.uSwirl.value = 1.6; flakeMat.uniforms.uSwirlX.value = f.x;
        kick.emit({ x: f.x, y: 0.3, z: f.z }, 30, { speed: 2.4, up: 0.5, size: 0.045, life: 1.6, colors: ['#ffffff', '#dfe8ff'], spread: 1.0 });
        if (at.ac) chime(at.ac);
      } else if (kind === 'move') { flareAt = t; if (at.ac) ping(at.ac, 1046, 0, 2.2, { vol: 0.04 }); }
    },
    ambience(ac) {
      const wind = noiseLoop(ac, { hp: 120, lp: 650, gain: 0.03, swell: 0.8 });
      const hush = noiseLoop(ac, { hp: 2500, lp: 7000, gain: 0.006, swell: 0.5 });
      return { stop() { wind.stop(); hush.stop(); } };
    },
    quality(level) {
      flakes.geometry.instanceCount = level ? flakeN / 2 : flakeN;
      forest.count = level ? Math.floor(trees.length * 0.6) : trees.length;
    },
  };
  return place;
}
