/* The rooftop: a city roof at night in pouring rain. Neon signs (magenta GYM on the stair hut, CAPRA across the
   street in cyan, a billboard), a water tower, string lights over the roof, steam from the vents, a skyline of
   lit windows fading into the rain, lightning in the clouds. The wet roof mirrors it all, the puppet too, and the
   puddles ring with drops. A rep splashes, every tenth brings lightning down close with a crack of thunder, a new
   move flickers the neon and rolls thunder far off. */
import { THREE, rng, NOISE, FOG, PUP, shaderMat, patchStandard, skyDome, quadInstances, bursts, canvasTex, glow, merge, mat, propMat, noiseLoop, rumble } from './core.js';

const FALL = new THREE.Vector3(1.1, -9.5, 0.6);
// the lights the wet roof mirrors and the rain catches: [x, y, z, size], color
const LIGHTS = [
  [[-3.72, 2.3, -3.35, 0.5], [1.0, 0.12, 0.62], 3.2],     // GYM, magenta, on the stair hut
  [[14, 4.6, -26.9, 3.0], [0.15, 0.85, 1.0], 6.0],          // CAPRA across the street, cyan
  [[-17, 6.5, -30, 3.5], [1.0, 0.75, 0.25], 4.0],         // the billboard
  [[-4.6, 2.35, -3.3, 0.25], [1.0, 0.68, 0.35], 2.2],     // the lamp over the hut's door
  [[-2.4, 2.75, -4.6, 0.15], [1.0, 0.72, 0.38], 1.0],     // string lights
  [[-0.2, 2.55, -4.6, 0.15], [1.0, 0.72, 0.38], 1.0],
  [[2.0, 2.65, -4.6, 0.15], [1.0, 0.72, 0.38], 1.0],
  [[-5.2, 6.7, -4.6, 0.12], [1.0, 0.1, 0.08], 1.4],       // the antenna's red light
];
const NL = LIGHTS.length;

// A neon sign on a canvas: the tubes glow, a white-hot core down the middle.
function neonTex(text, color, w, h, { vertical = false, font = 'Bangers, Impact, "Arial Black", sans-serif', size = 0.62 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const draw = (lw, col, blur) => {
      g.save(); g.shadowColor = color; g.shadowBlur = blur; g.lineWidth = lw; g.strokeStyle = col;
      if (vertical) { const n = text.length, step = h / n; g.font = `${Math.round(Math.min(w, step) * size * 1.25)}px ${font}`; [...text].forEach((ch, i) => g.strokeText(ch, w / 2, step * (i + 0.5))); }
      else { g.font = `${Math.round(h * size)}px ${font}`; g.strokeText(text, w / 2, h / 2); }
      g.restore();
    };
    draw(h * 0.05, color, h * 0.12); draw(h * 0.025, color, h * 0.05); draw(h * 0.008, '#ffffff', 0);
  }, { mips: true });
}

export default function buildRooftop(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(21);
  const fog = new THREE.FogExp2('#2a2346', 0.005);
  scene.fog = fog;
  const R = { uFlashDir: { value: new THREE.Vector3(0.3, 0.4, -1).normalize() }, uNeon: { value: 1 } };

  /* ---- the sky: low storm clouds lit from below by the city, lightning inside them ---- */
  scene.add(skyDome(U, /* glsl */ `
    uniform vec3 uFlashDir;
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) {
      float h = d.y;
      vec3 glowC = mix(S(0.55, 0.26, 0.42), S(0.75, 0.42, 0.30), smoothstep(0.3, -0.3, d.x));
      vec3 col = mix(glowC, S(0.03, 0.03, 0.07), smoothstep(-0.02, 0.4, h));
      vec2 uv = d.xz / max(h + 0.1, 0.05) * 0.9 + vec2(uTime * 0.035, uTime * 0.06);
      float n = fbm(uv), c = smoothstep(0.32, 0.78, n);
      vec3 cloud = mix(S(0.05, 0.045, 0.09), S(0.36, 0.19, 0.33), smoothstep(0.35, 0.0, h) * (0.6 + 0.4 * fbm3(uv * 2.0)));
      col = mix(col, cloud, c * 0.88);
      col += S(0.75, 0.8, 1.0) * uFlash * (0.25 + 1.6 * pow(max(dot(d, uFlashDir), 0.0), 5.0)) * (0.35 + c);
      return col;
    }`, R));

  /* ---- light: the dark, two neon colors, a lamp; a cold light from above that lightning floods ---- */
  const hemi = new THREE.HemisphereLight('#3d3a6e', '#120e1c', 1.0);
  const key = new THREE.DirectionalLight('#b8c8ff', 0.5);
  key.position.set(-0.5, 0.8, -0.45).normalize().multiplyScalar(40);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 90 });
  key.shadow.radius = 5; key.shadow.bias = -0.0005;
  const pink = new THREE.PointLight('#ff2a9a', 14, 12, 1.6); pink.position.set(-3.4, 2.4, -3.0);
  const cyan = new THREE.PointLight('#29d8ff', 18, 16, 1.6); cyan.position.set(6.5, 3.2, -1.5);
  const lamp = new THREE.PointLight('#ffb35c', 6, 7, 1.8); lamp.position.set(-4.6, 2.2, -3.0);
  scene.add(hemi, key, key.target, pink, cyan, lamp);

  /* ---- the roof: wet tar, seams, puddles that ring with drops and mirror the lights ---- */
  const LP = LIGHTS.map(([p]) => new THREE.Vector4(...p)), LC = LIGHTS.map(([, c, k]) => new THREE.Vector3(c[0] * k, c[1] * k, c[2] * k));
  const RU = { uL: { value: LP }, uLC: { value: LC }, ...R };
  const roofMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.5, color: '#ffffff' }), U, {
    uniforms: RU, pup: true,
    decl: /* glsl */ `
      uniform vec4 uL[${NL}]; uniform vec3 uLC[${NL}]; uniform vec3 uFlashDir; uniform float uNeon;
      vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      float puddleOf(vec2 p) { return smoothstep(0.56, 0.64, fbm3(p * 0.42 + 3.1)) ; }
      // rain on the puddles: a ring now and then in each little cell; answers the ring's slope (x, z) and its brightness
      vec3 ripple(vec2 p) {
        vec3 o = vec3(0.0);
        for (int k = 0; k < 2; k++) {
          vec2 q = p * (k == 0 ? 6.3 : 8.9) + float(k) * 11.3, c = floor(q), f = fract(q) - 0.5;
          float s = h21(c), ph = fract(uTime * (0.9 + s * 0.8) + s * 7.0);
          vec2 d = f - (vec2(h21(c + 3.1), h21(c + 7.7)) - 0.5) * 0.5;
          float rr = length(d), ring = ph * 0.42, w = 0.035;
          float a = (1.0 - ph) * (1.0 - smoothstep(0.0, w, abs(rr - ring)));
          o.xy += normalize(d + 1e-4) * a; o.z += a;
        }
        return o;
      }
      vec3 nightEnv(vec3 R) {
        vec3 glowC = mix(S(0.55, 0.26, 0.42), S(0.75, 0.42, 0.30), smoothstep(0.3, -0.3, R.x));
        return mix(glowC, S(0.03, 0.03, 0.07), smoothstep(-0.02, 0.4, R.y)) + S(0.75, 0.8, 1.0) * uFlash * 0.8;
      }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz;
      vec3 tar = mix(S(0.10, 0.10, 0.12), S(0.16, 0.15, 0.17), vnoise(p * 4.0));
      tar = mix(tar, S(0.06, 0.06, 0.07), smoothstep(0.6, 0.8, vnoise(p * 13.0)) * 0.5);
      float seam = 1.0 - smoothstep(0.0, 0.03, abs(fract(p.x / 2.4) - 0.5) - 0.47);
      tar = mix(tar, S(0.2, 0.2, 0.22), seam * 0.6);
      diffuseColor.rgb = tar;
    }`,
    rough: 'roughnessFactor = mix(0.42, 0.06, puddleOf(vWP.xz));',
    post: /* glsl */ `{
      float pd = puddleOf(vWP.xz);
      vec3 rp = ripple(vWP.xz);
      vec3 V = normalize(vWP - cameraPosition);
      vec3 N = normalize(vec3(rp.x * 0.25 * pd + (vnoise(vWP.xz * 9.0) - 0.5) * 0.08 * (1.0 - pd), 1.0, rp.y * 0.25 * pd));
      vec3 Rf = reflect(V, N);
      vec3 refl = nightEnv(Rf);
      // the lights, streaked down the wet roof as wet ground streaks them
      vec3 lit = vec3(0.0);
      for (int i = 0; i < ${NL}; i++) {
        vec3 L = uL[i].xyz, toL = L - vWP;
        float t = max(dot(toL, Rf), 0.05);
        vec3 off = vWP + Rf * t - L;
        float ah = abs(off.x) / t, av = length(off.yz) / t, sz = uL[i].w / t;
        float k = (i == 1 || i == 0 || i == 2) ? uNeon : 1.0;
        refl += uLC[i] * k * exp(-pow(ah / (sz + 0.012), 2.0) - pow(av / (sz * 3.5 + 0.06), 2.0)) * 1.4;
        float dd = length(toL);
        lit += uLC[i] * k * uL[i].w / (1.0 + dd * dd * 0.35);
      }
      vec4 pr = pupRefl(vWP, rp.xy * 0.06);
      refl = mix(refl, pr.rgb * 0.85, pr.a * mix(0.55, 1.0, pd));
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-V, N), 0.0), 5.0);
      float wet = mix(0.32, 1.0, pd);
      outgoingLight += diffuseColor.rgb * lit * 0.6;
      outgoingLight = mix(outgoingLight, refl, clamp(wet * (0.3 + fres * 0.9), 0.0, 1.0));
      outgoingLight += vec3(0.42, 0.46, 0.56) * rp.z * pd * 0.3 * (1.0 + uFlash * 3.0);
    }`,
  });
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), roofMat);
  roof.rotation.x = -Math.PI / 2; roof.position.set(0, 0, -0.2); roof.receiveShadow = true;
  scene.add(roof);

  /* ---- what stands on the roof: the parapet, the stair hut, the water tower, HVAC units, vents, an antenna ---- */
  const props = propMat(U, { rough: 0.55 });
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
  const parts = [
    { geo: B(26, 0.95, 0.35), color: '#3a3440', matrix: mat(0, 0.47, -7.2) },
    { geo: B(26.2, 0.08, 0.5), color: '#7b7f8c', matrix: mat(0, 0.98, -7.2) },
    // the stair hut: brick, a door with a little window, OPEN sign light over it
    { geo: B(2.7, 2.7, 2.5), color: '#5b2f2a', matrix: mat(-5.2, 1.35, -4.6) },
    { geo: B(2.9, 0.18, 2.7), color: '#2a2a30', matrix: mat(-5.2, 2.78, -4.6) },
    { geo: B(1.0, 2.0, 0.08), color: '#20232b', matrix: mat(-4.75, 1.0, -3.33) },
    { geo: B(0.42, 0.3, 0.09), color: '#ffcc80', matrix: mat(-4.75, 1.55, -3.32), emit: 0.8 },
    { geo: B(0.18, 0.12, 0.12), color: '#ffcf8a', matrix: mat(-4.6, 2.35, -3.3), emit: 3 },
    // the antenna on the hut
    { geo: C(0.03, 0.05, 3.9, 6), color: '#8a8f99', matrix: mat(-5.2, 4.75, -4.6) },
    { geo: B(1.2, 0.04, 0.04), color: '#8a8f99', matrix: mat(-5.2, 5.8, -4.6) },
    { geo: B(0.8, 0.04, 0.04), color: '#8a8f99', matrix: mat(-5.2, 6.2, -4.6) },
    { geo: new THREE.SphereGeometry(0.08, 8, 6), color: '#ff2015', matrix: mat(-5.2, 6.72, -4.6), emit: 4 },
    // HVAC units with fan grilles, vents with caps
    { geo: B(1.5, 1.0, 1.1), color: '#8d929c', matrix: mat(3.0, 0.5, -2.7) },
    { geo: C(0.42, 0.42, 0.06, 20), color: '#25272d', matrix: mat(3.0, 1.02, -2.7) },
    { geo: B(1.2, 0.85, 1.0), color: '#7f848e', matrix: mat(-2.4, 0.42, -6.3) },
    { geo: C(0.35, 0.35, 0.05, 18), color: '#25272d', matrix: mat(-2.4, 0.86, -6.3) },
    { geo: C(0.12, 0.12, 1.1, 10), color: '#9aa0aa', matrix: mat(1.6, 0.55, -6.0) },
    { geo: C(0.28, 0.2, 0.18, 12), color: '#9aa0aa', matrix: mat(1.6, 1.15, -6.0) },
    { geo: C(0.1, 0.1, 0.8, 10), color: '#9aa0aa', matrix: mat(-0.9, 0.4, -6.5) },
    { geo: C(0.22, 0.16, 0.15, 12), color: '#9aa0aa', matrix: mat(-0.9, 0.85, -6.5) },
  ];
  // the water tower: legs and braces, a wooden tank with hoops, a pointed roof
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) parts.push({ geo: C(0.08, 0.08, 3.6, 8), color: '#3d3a3f', matrix: mat(5.6 + sx * 1.05, 1.8, -5.6 + sz * 1.05) });
  for (const y of [1.2, 2.5]) { parts.push({ geo: B(2.2, 0.06, 0.06), color: '#3d3a3f', matrix: mat(5.6, y, -4.55) }); parts.push({ geo: B(0.06, 0.06, 2.2), color: '#3d3a3f', matrix: mat(4.55, y, -5.6) }); }
  parts.push({ geo: C(1.55, 1.6, 2.7, 24), color: '#6b4a33', matrix: mat(5.6, 4.95, -5.6) });
  for (const y of [3.95, 4.7, 5.45, 6.1]) parts.push({ geo: new THREE.TorusGeometry(1.6, 0.035, 6, 32), color: '#2b2a2d', matrix: mat(5.6, y, -5.6, Math.PI / 2) });
  parts.push({ geo: new THREE.ConeGeometry(1.75, 1.2, 24), color: '#3b3236', matrix: mat(5.6, 6.9, -5.6) });
  scene.add(new THREE.Mesh(merge(parts), props));

  /* ---- neon: GYM down the hut's corner, CAPRA across the street, a billboard ---- */
  const neonMat = (tex, color) => shaderMat(U, {
    uniforms: { uMap: { value: tex }, uCol: { value: new THREE.Color(color) }, uNeon: R.uNeon },
    vertex: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `uniform sampler2D uMap; uniform float uNeon; varying vec2 vUv;
      void main() { vec4 c = texture2D(uMap, vUv); float a = c.a * uNeon; if (a < 0.01) discard; gl_FragColor = vec4(c.rgb * 2.2 * a, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const sign = (tex, color, w, h, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), neonMat(tex, color)); m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 12; scene.add(m); return m; };
  const gymTex = neonTex('GYM', '#ff2aa0', 128, 384, { vertical: true });
  // its backing board, sticking out from the hut's corner
  scene.add(new THREE.Mesh(merge([{ geo: B(0.06, 1.75, 0.62), color: '#15121a', matrix: mat(0, 0, 0) }, { geo: B(0.3, 0.05, 0.05), color: '#666', matrix: mat(-0.15, 0.6, 0) }, { geo: B(0.3, 0.05, 0.05), color: '#666', matrix: mat(-0.15, -0.6, 0) }]), props).translateX(-3.56).translateY(2.0).translateZ(-3.6));
  sign(gymTex, '#ff2aa0', 0.66, 1.85, -3.52, 2.0, -3.6, Math.PI / 2 - 0.35);
  sign(gymTex, '#ff2aa0', 0.66, 1.85, -3.6, 2.0, -3.6, -Math.PI / 2 - 0.35).visible = false;
  const capraTex = neonTex('CAPRA', '#2ad8ff', 1024, 256);
  sign(capraTex, '#2ad8ff', 13, 3.25, 14, 4.6, -26.9, 0);
  const bbTex = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ffd23f'); gr.addColorStop(1, '#ff6b2c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#120e18'; g.fillRect(0, h * 0.82, w, h * 0.18);
    g.font = `${Math.round(h * 0.34)}px Bangers, Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = h * 0.05; g.strokeStyle = '#120e18'; g.strokeText('NO PAIN', w / 2, h * 0.27); g.strokeText('NO GAIN', w / 2, h * 0.6);
    g.fillStyle = '#fff8ec'; g.fillText('NO PAIN', w / 2, h * 0.27); g.fillStyle = '#ff2aa0'; g.fillText('NO GAIN', w / 2, h * 0.6);
    g.font = `800 ${Math.round(h * 0.09)}px Inter, Arial, sans-serif`; g.fillStyle = '#ffd23f'; g.fillText('CAPRA LAB · IRL', w / 2, h * 0.91);
  });
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(13, 6.5), new THREE.MeshStandardMaterial({ map: bbTex, emissive: '#ffffff', emissiveMap: bbTex, emissiveIntensity: 0.9, roughness: 0.6 }));
  bb.position.set(-17, 6.5, -30.5); bb.rotation.y = 0.35; scene.add(bb);
  scene.add(new THREE.Mesh(merge([-4.5, 4.5].map((dx) => ({ geo: B(0.25, 4.6, 0.25), color: '#2a2830', matrix: mat(-17 + dx * 0.94, 1.0, -30.7 - dx * 0.34) }))), props));

  /* ---- string lights from the hut to the water tower ---- */
  const bulbs = [], bulbGlows = [];
  {
    const a = new THREE.Vector3(-3.85, 2.75, -4.6), b = new THREE.Vector3(4.55, 3.2, -4.6), n = 12, pts = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector3().lerpVectors(a, b, u).add(new THREE.Vector3(0, -Math.sin(u * Math.PI) * 0.55, 0))); }
    const wire = new THREE.BufferGeometry().setFromPoints(pts);
    scene.add(new THREE.Line(wire, new THREE.LineBasicMaterial({ color: '#111' })));
    const bp = [];
    for (let i = 1; i <= n; i++) { const u = i / (n + 1); const p = new THREE.Vector3().lerpVectors(a, b, u).add(new THREE.Vector3(0, -Math.sin(u * Math.PI) * 0.55 - 0.08, 0)); bulbs.push(p); bp.push({ geo: new THREE.SphereGeometry(0.06, 8, 6), color: '#ffcf8a', matrix: mat(p.x, p.y, p.z), emit: 4 }); }
    scene.add(new THREE.Mesh(merge(bp), props));
    for (const p of bulbs) { const g = glow(U, '#ffb04a', 0.9, 0.55); g.position.copy(p); scene.add(g); bulbGlows.push(g); }
  }
  const gymGlow = glow(U, '#ff2aa0', 4.5, 0.55); gymGlow.position.set(-3.5, 2.0, -3.5); scene.add(gymGlow);
  const capraGlow = glow(U, '#2ad8ff', 28, 0.4); capraGlow.position.set(14, 4.6, -26.6); scene.add(capraGlow);
  const lampGlow = glow(U, '#ffb35c', 1.6, 0.9); lampGlow.position.set(-4.6, 2.35, -3.25); scene.add(lampGlow);
  const redGlow = glow(U, '#ff2015', 1.2, 0.9); redGlow.position.set(-5.2, 6.72, -4.55); scene.add(redGlow);

  /* ---- the skyline: hundreds of buildings, every window worked out in the shader ---- */
  const blds = [];
  const addRow = (z0, z1, xs, top0, top1, wmin, wmax, skip = () => false) => {
    for (let x = -xs; x < xs;) {
      const w = wmin + r() * (wmax - wmin), d = wmin + r() * (wmax - wmin), z = z0 - r() * (z0 - z1), top = top0 + r() ** 1.6 * (top1 - top0);
      if (!skip(x + w / 2, z)) blds.push([x + w / 2, z, w, d, top]);
      x += w + 1 + r() * 4;
    }
  };
  blds.push([14, -33.5, 15, 13, 8.5], [-17, -37, 14, 12, 1.5]);      // CAPRA's building, the billboard's
  addRow(-30, -44, 70, -9, 9, 7, 16, (x) => Math.abs(x) < 10 || Math.abs(x - 14) < 11 || Math.abs(x + 17) < 10);
  addRow(-60, -105, 160, -12, 30, 10, 24);
  addRow(-125, -205, 260, -4, 70, 14, 30);
  addRow(-225, -330, 360, 6, 135, 18, 36);
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const bMat = patchStandard(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.2 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }`,
    diffuse: /* glsl */ `diffuseColor.rgb = mix(S(0.08, 0.08, 0.11), S(0.16, 0.15, 0.2), vColor.r);`,
    emissive: /* glsl */ `{
      vec3 n = vWN; float seed = vColor.g * 97.0;
      if (abs(n.y) < 0.5) {
        vec2 f = abs(n.z) > 0.5 ? vec2(vWP.x, vWP.y) : vec2(vWP.z, vWP.y);
        vec2 cs = vec2(2.3, 3.4), c = floor(f / cs), q = fract(f / cs);
        float win = step(0.2, q.x) * step(q.x, 0.8) * step(0.25, q.y) * step(q.y, 0.78);
        float s = h21(c + seed), on = step(0.6 - vColor.b * 0.25, s);
        if (s > 0.985) on *= step(0.35, fract(uTime * 0.6 + s * 13.0));
        vec3 wc = s > 0.93 ? S(0.55, 0.78, 1.0) : s > 0.9 ? S(0.7, 0.55, 1.0) : mix(S(1.0, 0.72, 0.4), S(1.0, 0.86, 0.6), h21(c * 1.7));
        totalEmissiveRadiance += wc * win * on * (1.1 + 0.6 * h21(c * 3.1 + seed));
      } else totalEmissiveRadiance += S(0.12, 0.1, 0.16) * step(0.7, h21(floor(vWP.xz * 0.5) + seed)) * 0.3;
    }`,
  });
  const city = new THREE.InstancedMesh(bGeo, bMat, blds.length);
  const col = new THREE.Color(), tops = [];
  blds.forEach(([x, z, w, d, top], i) => {
    city.setMatrixAt(i, mat(x, -60, z, 0, 0, 0, [w, top + 60, d]));
    city.setColorAt(i, col.setRGB(r(), r(), r()));
    if (top > 55 && tops.length < 7) tops.push(new THREE.Vector3(x, top + 0.8, z));
  });
  scene.add(city);
  // red lights blinking on the tallest towers
  const towerLights = tops.map((p) => { const g = glow(U, '#ff2a1a', 9, 0.9); g.position.copy(p); scene.add(g); return g; });

  /* ---- the rain: streaks lit by the neon, curtains of it far off, splashes on the roof ---- */
  const rainN = 7000;
  const rainMat = shaderMat(U, {
    uniforms: { uFall: { value: FALL } },
    vertex: /* glsl */ `
      attribute vec4 aR; uniform float uTime; uniform vec3 uFall;
      varying float vA; varying float vX; varying float vY; varying vec3 vCol;
      void main() {
        float H = 9.0, sp = -uFall.y * (0.85 + aR.w * 0.3);
        float ph = fract(aR.y + uTime * sp / H);
        vec3 p = vec3(aR.x + uFall.x / -uFall.y * H * ph, H * (1.0 - ph) - 0.6, aR.z + uFall.z / -uFall.y * H * ph);
        p.x = mod(p.x + 9.0, 18.0) - 9.0;
        vec3 axis = normalize(uFall), toCam = normalize(cameraPosition - p), side = normalize(cross(axis, toCam));
        float dist = length(cameraPosition - p), w = 0.006 + dist * 0.0019, len = 0.5 + aR.w * 0.4;
        vec3 wp = p + side * position.x * w * 2.0 - axis * position.y * len;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
        vA = smoothstep(0.35, 1.3, dist) * (0.4 + 0.45 * aR.w) * (1.0 - smoothstep(14.0, 22.0, dist));
        vX = position.x * 2.0; vY = position.y;
        vCol = vec3(0.5, 0.55, 0.72) + vec3(1.0, 0.18, 0.65) * smoothstep(0.5, -5.0, p.x) * 1.1 + vec3(0.15, 0.85, 1.0) * smoothstep(-0.5, 6.0, p.x)
          + vec3(1.0, 0.72, 0.4) * exp(-length(p - vec3(0.0, 2.7, -4.6)) * 0.5) * 1.2;
      }`,
    fragment: /* glsl */ `uniform float uFlash; varying float vA; varying float vX; varying float vY; varying vec3 vCol;
      void main() { float a = vA * (1.0 - vX * vX) * (1.0 - vY * 0.6); gl_FragColor = vec4(vCol * (1.0 + uFlash * 3.0) * a, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const rain = new THREE.Mesh(quadInstances(rainN, [['aR', 4, (a, o) => a.set([(r() - 0.5) * 18, r(), -14 + r() * 18, r()], o)]]), rainMat);
  rain.frustumCulled = false; rain.renderOrder = 20; scene.add(rain);
  const curtainMat = shaderMat(U, {
    vertex: /* glsl */ `varying vec2 vUv; varying float vD; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragment: /* glsl */ `uniform float uTime; uniform float uFlash; varying vec2 vUv; varying float vD; ${NOISE}
      void main() {
        float col = floor(vUv.x * 900.0), s = h21(vec2(col, 1.0));
        float y = fract(vUv.y * (2.0 + s * 2.0) + uTime * (1.4 + s) + s * 9.0);
        float a = step(0.55, s) * smoothstep(0.0, 0.15, y) * (1.0 - smoothstep(0.2, 0.45, y)) * 0.11;
        a *= smoothstep(0.0, 0.3, vUv.y) * (0.7 + 0.3 * vnoise(vec2(vUv.x * 6.0, uTime * 0.3)));
        gl_FragColor = vec4(vec3(0.75, 0.68, 0.95) * a * (1.0 + uFlash * 4.0), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  for (const [z, w, h] of [[-16, 60, 26], [-38, 110, 46], [-80, 220, 80]]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), curtainMat); c.position.set(0, h / 2 - 22, z); c.renderOrder = 19; scene.add(c); }
  const splashN = 260;
  const splashMat = shaderMat(U, {
    vertex: /* glsl */ `attribute vec4 aS; uniform float uTime; varying vec2 vUv; varying float vK;
      void main() {
        float per = 0.55 + aS.w * 0.5, ph = fract(uTime / per + aS.w * 13.0), k = ph / 0.22;
        if (k > 1.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
        float cyc = floor(uTime / per + aS.w * 13.0);
        vec3 p = vec3(aS.x + (fract(sin(cyc * 12.9 + aS.w * 78.2) * 437.5) - 0.5) * 1.2, 0.0, aS.z + (fract(sin(cyc * 4.1 + aS.w * 31.7) * 917.3) - 0.5) * 1.2);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        mv.xy += vec2(position.x * 0.12 * (0.5 + k), position.y * 0.09 * (0.4 + k));
        gl_Position = projectionMatrix * mv; vUv = vec2(position.x + 0.5, position.y); vK = k;
      }`,
    fragment: /* glsl */ `uniform float uFlash; varying vec2 vUv; varying float vK;
      void main() {
        vec2 p = vUv - vec2(0.5, 0.0);
        float crown = smoothstep(0.08, 0.0, abs(length(p * vec2(1.0, 1.6)) - 0.42)) * step(0.05, vUv.y);
        float drops = smoothstep(0.07, 0.0, length(vec2(abs(p.x) - 0.32, vUv.y - 0.7 * vK - 0.1)));
        float a = (crown + drops) * (1.0 - vK) * 0.75;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(0.7, 0.78, 0.95) * a * (1.0 + uFlash * 2.0), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const splashes = new THREE.Mesh(quadInstances(splashN, [['aS', 4, (a, o) => a.set([(r() - 0.5) * 10, 0, -6.8 + r() * 10, r()], o)]]), splashMat);
  splashes.frustumCulled = false; splashes.renderOrder = 18; scene.add(splashes);

  /* ---- steam from the vents, splashes at your feet ---- */
  const steam = bursts(U, { n: 60, shape: 'puff', grav: 0.4, drag: 1.5, opacity: 0.35 });
  const drops = bursts(U, { n: 220, shape: 'drop', grav: -9, drag: 0.4, blend: THREE.AdditiveBlending });
  scene.add(steam.mesh, drops.mesh);
  let steamAt = 0;

  /* ---- lightning: a forked bolt, the flash, thunder after it ---- */
  const boltGeo = new THREE.BufferGeometry();
  const boltMat = shaderMat(U, {
    uniforms: { uBolt: { value: 0 } },
    vertex: /* glsl */ `attribute vec2 aB; varying vec2 vB; void main() { vB = aB; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `uniform float uBolt; varying vec2 vB;
      void main() { float x = abs(vB.x); float a = vB.y < 0.5 ? (1.0 - x * x) : pow(1.0 - x, 2.0) * 0.28; a *= uBolt; if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a * (vB.y < 0.5 ? 6.0 : 2.0), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const bolt = new THREE.Mesh(boltGeo, boltMat); bolt.frustumCulled = false; bolt.renderOrder = 16; scene.add(bolt);
  const strikes = [];
  let nextStrike = 4 + r() * 6;
  function makeBolt(x0, z0, near) {
    const pos = [], ab = [];
    const seg = (a, b, w) => {
      const d = new THREE.Vector3().subVectors(b, a), side = new THREE.Vector3(d.y, -d.x, 0).normalize();
      for (const [ww, k] of [[w, 0], [w * 9, 1]]) {
        const s = side.clone().multiplyScalar(ww);
        const A0 = a.clone().sub(s), A1 = a.clone().add(s), B0 = b.clone().sub(s), B1 = b.clone().add(s);
        pos.push(...A0.toArray(), ...A1.toArray(), ...B1.toArray(), ...A0.toArray(), ...B1.toArray(), ...B0.toArray());
        ab.push(-1, k, 1, k, 1, k, -1, k, 1, k, -1, k);
      }
    };
    const path = (a, b, rough, w, depth) => {
      let pts = [a, b];
      for (let it = 0; it < 6; it++) {
        const out = [pts[0]];
        for (let i = 0; i + 1 < pts.length; i++) {
          const m = pts[i].clone().lerp(pts[i + 1], 0.5), L = pts[i].distanceTo(pts[i + 1]);
          m.x += (Math.random() - 0.5) * L * rough; m.z += (Math.random() - 0.5) * L * rough * 0.3;
          out.push(m, pts[i + 1]);
        }
        pts = out;
      }
      for (let i = 0; i + 1 < pts.length; i++) seg(pts[i], pts[i + 1], w);
      if (depth > 0) for (let k = 0; k < 3; k++) {
        const i = 4 + ((Math.random() * (pts.length * 0.6)) | 0), p = pts[Math.min(i, pts.length - 1)];
        path(p, p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 30, -12 - Math.random() * 20, 0)), 0.5, w * 0.55, depth - 1);
      }
    };
    const top = new THREE.Vector3(x0 + (Math.random() - 0.5) * 20, 70, z0), bottom = new THREE.Vector3(x0, near ? -20 : -40, z0);
    path(top, bottom, 0.45, near ? 0.32 : 0.55, 1);
    boltGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    boltGeo.setAttribute('aB', new THREE.Float32BufferAttribute(ab, 2));
    R.uFlashDir.value.set(x0, 30, z0).normalize();
  }
  function strike(near, ac) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = near ? side * (12 + Math.random() * 16) : (Math.random() - 0.5) * 300, z = near ? -28 - Math.random() * 20 : -150 - Math.random() * 120;
    makeBolt(x, z, near);
    const t = U.uTime.value;
    strikes.push({ t, amp: near ? 1.0 : 0.55 }, { t: t + 0.09, amp: near ? 0.7 : 0.3 }, { t: t + 0.24, amp: near ? 0.85 : 0.4 });
    key.position.set(x, 40, z).normalize().multiplyScalar(40); key.position.y = Math.abs(key.position.y) + 10;
    if (ac) { const dist = Math.hypot(x, z); rumble(ac, Math.min(2.4, dist / 343), near ? 3.2 : 4.5, { lp: near ? 900 : 260, lp2: 40, vol: near ? 0.3 : 0.14, attack: near ? 0.01 : 0.3 }); }
  }
  let neonOff = 0;

  const place = {
    scene, fog, key, camH: 1.4, exposure: 1.15,
    pup: { tint: new THREE.Color(0.74, 0.72, 0.88), rim: new THREE.Color('#ff2a9a').multiplyScalar(1.1), rimDir: [-0.75, 0.4], rim2: new THREE.Color('#2ad8ff').multiplyScalar(0.9), rimDir2: [0.75, 0.35] },
    update(dt, t) {
      // lightning on its own every so often, far off
      if (t > nextStrike) { strike(false, place.ac); nextStrike = t + 8 + Math.random() * 12; }
      let f = 0;
      for (let i = strikes.length - 1; i >= 0; i--) { const s = strikes[i], a = t - s.t; if (a > 1.2) { strikes.splice(i, 1); continue; } if (a >= 0) f = Math.max(f, s.amp * Math.exp(-a * 11)); }
      U.uFlash.value = f; boltMat.uniforms.uBolt.value = Math.min(1, f * 2.2);
      hemi.intensity = 1.0 + f * 6; key.intensity = 0.5 + f * 9;
      if (f < 0.01) key.position.set(-0.5, 0.8, -0.45).normalize().multiplyScalar(40);
      // the neon buzzes now and then, and blacks out a moment when a move starts
      const buzz = Math.sin(t * 37) > 0.97 && Math.sin(t * 0.7) > 0.6 ? 0.55 : 1;
      R.uNeon.value = (t < neonOff ? (Math.sin(t * 60) > 0 ? 0.15 : 0.9) : 1) * buzz;
      gymGlow.material.uniforms.uK.value = 0.55 * R.uNeon.value; capraGlow.material.uniforms.uK.value = 0.4 * R.uNeon.value;
      const blink = Math.sin(t * 3.0) > 0.4 ? 1 : 0.08;
      redGlow.material.uniforms.uK.value = 0.9 * blink; towerLights.forEach((g, i) => { g.material.uniforms.uK.value = (Math.sin(t * 2.2 + i * 1.7) > 0.5 ? 1 : 0.05) * 0.9; });
      if (t - steamAt > 0.35) { steamAt = t; steam.emit({ x: 1.6, y: 1.25, z: -6.0 }, 1, { speed: 0.5, up: 1, size: 0.5, life: 2.6, color: '#8e86a8', spread: 0.1 }); steam.emit({ x: -0.9, y: 0.92, z: -6.5 }, 1, { speed: 0.45, up: 1, size: 0.45, life: 2.4, color: '#8e86a8', spread: 0.1 }); }
    },
    pulse(kind, at) {
      const f = at.foot;
      if (kind === 'rep') drops.emit(f, 16, { speed: 2.2, up: 0.75, size: 0.03, life: 0.7, colors: ['#bfd8ff', '#ff8ad0', '#8ae8ff'], spread: 0.45 });
      else if (kind === 'big') { strike(true, at.ac); drops.emit(f, 30, { speed: 2.8, up: 0.7, size: 0.035, life: 0.9, colors: ['#bfd8ff', '#ffffff'], spread: 0.7 }); }
      else if (kind === 'move') { neonOff = U.uTime.value + 0.7; strike(false, at.ac); }
    },
    ambience(ac) {
      place.ac = ac;
      const hiss = noiseLoop(ac, { hp: 700, lp: 9000, gain: 0.045 });
      const patter = noiseLoop(ac, { hp: 150, lp: 900, gain: 0.03, swell: 0.3 });
      const hum = noiseLoop(ac, { hp: 30, lp: 110, gain: 0.03, brown: true });
      return { stop() { place.ac = null; hiss.stop(); patter.stop(); hum.stop(); } };
    },
    quality(level) {
      rain.geometry.instanceCount = level ? rainN / 2 : rainN;
      splashes.geometry.instanceCount = level ? splashN / 2 : splashN;
    },
  };
  return place;
}
