/* IRL's 3D places: the parts every place shares (JC, Nov 19 2026: "Bring the glacial max level of detail to the
   3d rendering of IRL. I want more vivid scenery and lighting"). three.js, the same family Glacial Maw draws with
   (r186), bundled with these files by scripts/build.mjs into public/irl/world.js. Everything is made here, from
   geometry, canvas textures and shaders: no pictures to download. */
import * as THREE from 'three';
export { THREE };

// A small seeded random (mulberry32), so a place looks the same every visit.
export const rng = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const NOISE = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float fbm3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
`;

// Fog the same way three's FogExp2 does it, for the hand-written shaders.
export const FOG = /* glsl */ `
uniform vec3 uFogCol; uniform float uFogDen;
vec3 fogIt(vec3 c, float d) { float f = 1.0 - exp(-uFogDen * uFogDen * d * d); return mix(c, uFogCol, clamp(f, 0.0, 1.0)); }
`;

/* The player's reflection in a wet or polished floor. The puppet is drawn on a flat card standing where the
   player stands (z = 0), facing the camera, which sits at (0, h, D) looking straight ahead (uCam = h, D). A floor
   point between them reflects the card's point that its ray, carried on under the floor, meets mirrored. */
export const PUP = /* glsl */ `
uniform sampler2D uPup; uniform vec4 uPupRect; uniform vec2 uCam;
vec4 pupRefl(vec3 wp, vec2 wob) {
  float D = uCam.y, h = uCam.x;
  if (wp.z <= 0.01 || wp.z >= D - 0.05) return vec4(0.0);
  float s = D / (D - wp.z);
  vec2 q = vec2(s * wp.x, h * (s - 1.0)) + wob;
  vec2 uv = vec2((q.x - uPupRect.x) / (uPupRect.y - uPupRect.x), (q.y - uPupRect.z) / (uPupRect.w - uPupRect.z));
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(uPup, uv);
}
`;

// The uniforms every place's shaders share (one object each, so a change reaches every material).
export function shared() {
  return {
    uTime: { value: 0 }, uFlash: { value: 0 },
    uFogCol: { value: new THREE.Color('#888') }, uFogDen: { value: 0.01 },
    uPup: { value: null }, uPupRect: { value: new THREE.Vector4(-1, 1, -1, 1) }, uCam: { value: new THREE.Vector2(1.3, 4.5) },
    uSun: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
  };
}

// A hand-written material with the shared uniforms (by reference) and its own.
export function shaderMat(U, { vertex, fragment, uniforms = {}, ...opts }) {
  return new THREE.ShaderMaterial({ uniforms: { ...U, ...uniforms }, vertexShader: vertex, fragmentShader: fragment, ...opts });
}

/* A three.js standard material (lights, shadows, fog) with a place's own surface worked out in the shader from
   the world position (vWP): parts.decl (functions), parts.diffuse (sets diffuseColor, after vertex colors), parts.rough (sets
   roughnessFactor), parts.emissive (adds to totalEmissiveRadiance), parts.post (changes outgoingLight); in the vertex
   shader parts.vbegin (moves `transformed`, the local position: swaying) and parts.vertex (after the world position). */
let patchN = 0;
export function patchStandard(mat, U, parts) {
  const key = 'p' + (++patchN);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, parts.uniforms || {});
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;\nuniform float uTime;\n' + (parts.vdecl || ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (parts.vbegin || ''))
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wp4 = vec4(transformed, 1.0);
        vec3 wn3 = objectNormal;
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4; wn3 = mat3(instanceMatrix) * wn3;
        #endif
        vWP = (modelMatrix * wp4).xyz; vWN = normalize(mat3(modelMatrix) * wn3);
        ${parts.vertex || ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vWN;
        uniform float uTime; uniform float uFlash;
        ${NOISE}
        ${parts.pup ? PUP : ''}
        ${parts.decl || ''}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + (parts.diffuse || ''))
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + (parts.rough || ''))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + (parts.emissive || ''))
      .replace('#include <opaque_fragment>', (parts.post || '') + '\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

/* The sky: a big ball around the camera drawn at the far plane (so it only fills what nothing else covers).
   `body` defines vec3 sky(vec3 d) for a direction d. */
export function skyDome(U, body, uniforms = {}) {
  const m = shaderMat(U, {
    uniforms,
    vertex: /* glsl */ `varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragment: /* glsl */ `varying vec3 vDir; uniform float uTime; uniform float uFlash; uniform vec3 uSun; ${NOISE} ${body}
      void main() { gl_FragColor = vec4(sky(normalize(vDir)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), m);
  mesh.frustumCulled = false; mesh.renderOrder = -10;
  return mesh;
}

// A quad a thing, many things in one draw: the quad runs x -0.5..0.5, y 0..1. attrs: [name, size, fill(arr, o, i)].
export function quadInstances(n, attrs) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  for (const [name, size, fill] of attrs) {
    const a = new Float32Array(n * size);
    if (fill) for (let i = 0; i < n; i++) fill(a, i * size, i);
    g.setAttribute(name, new THREE.InstancedBufferAttribute(a, size));
  }
  g.instanceCount = n;
  return g;
}

/* Bursts: little things thrown from a spot (splashes, snow puffs, petals, chaff, breath) that fly, fall and fade,
   all in the shader. emit(origin, n, opts) takes the next n of the pool. shape: 'dot' (soft round), 'drop'
   (bright with a soft edge), 'petal' (a spinning oval), 'puff' (a soft cloud that grows). */
export function bursts(U, { n = 240, shape = 'dot', grav = -6, drag = 0.001, blend = THREE.NormalBlending, opacity = 1, order = 22 } = {}) {
  const g = quadInstances(n, [['aO', 4, (a, o) => { a[o + 3] = -999; }], ['aV', 4], ['aC', 4]]);
  const m = shaderMat(U, {
    uniforms: { uGrav: { value: grav }, uDrag: { value: drag }, uOp: { value: opacity } },
    vertex: /* glsl */ `
      attribute vec4 aO; attribute vec4 aV; attribute vec4 aC;
      uniform float uTime; uniform float uGrav; uniform float uDrag;
      varying vec2 vUv; varying float vK; varying vec3 vCol;
      void main() {
        float age = uTime - aO.w, life = aC.w;
        if (age < 0.0 || age > life) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
        float k = age / life, go = (1.0 - exp(-uDrag * age)) / uDrag;
        vec3 p = aO.xyz + aV.xyz * go + vec3(0.0, 0.5 * uGrav * age * age, 0.0);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float sz = aV.w * ${shape === 'puff' ? '(0.35 + 1.4 * k)' : '(1.0 - 0.45 * k)'};
        vec2 c = vec2(position.x, position.y - 0.5);
        ${shape === 'petal' ? 'float a = aO.w * 37.0 + age * (3.0 + fract(aO.w * 17.0) * 5.0); c = mat2(cos(a), -sin(a), sin(a), cos(a)) * (c * vec2(1.0, 0.55 + 0.45 * abs(sin(age * 6.0 + aO.w))));' : ''}
        mv.xy += c * sz;
        gl_Position = projectionMatrix * mv;
        vUv = vec2(position.x + 0.5, position.y); vK = k; vCol = aC.rgb;
      }`,
    fragment: /* glsl */ `
      uniform float uOp; varying vec2 vUv; varying float vK; varying vec3 vCol;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        ${shape === 'drop' ? 'float a = smoothstep(1.0, 0.35, r);' : shape === 'petal' ? 'float a = smoothstep(1.0, 0.85, r);' : shape === 'puff' ? 'float a = smoothstep(1.0, 0.0, r) * 0.55;' : 'float a = smoothstep(1.0, 0.2, r);'}
        a *= uOp * (1.0 - vK * vK);
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: blend,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false; mesh.renderOrder = order;
  let next = 0;
  const O = g.attributes.aO, V = g.attributes.aV, C = g.attributes.aC, col = new THREE.Color();
  return {
    mesh,
    // origin {x,y,z}; opts: speed, up (0 sideways .. 1 straight up), size, life, color (or colors), spread (x/z of the
    // start), dir (an added push {x,y,z})
    emit(o, count, { speed = 2, up = 0.6, size = 0.06, life = 1, color = '#ffffff', colors = null, spread = 0.1, dir = null, jitter = 0.4, sphere = false } = {}) {
      const t = U.uTime.value;
      for (let k = 0; k < count; k++) {
        const i = next; next = (next + 1) % n;
        const a = Math.random() * Math.PI * 2, el = sphere ? Math.random() * 2 - 1 : up + (1 - up) * Math.random() * 0.6, sp = speed * (1 - jitter + Math.random() * jitter * 2);
        const h = Math.sqrt(Math.max(0, 1 - el * el));
        O.setXYZW(i, o.x + (Math.random() - 0.5) * spread, o.y + (Math.random() - 0.5) * spread * 0.4, o.z + (Math.random() - 0.5) * spread, t + Math.random() * 0.04);
        V.setXYZW(i, Math.cos(a) * h * sp + (dir ? dir.x : 0), el * sp + (dir ? dir.y : 0), Math.sin(a) * h * sp + (dir ? dir.z : 0), size * (0.6 + Math.random() * 0.8));
        col.set(colors ? colors[(Math.random() * colors.length) | 0] : color);
        C.setXYZW(i, col.r, col.g, col.b, life * (0.6 + Math.random() * 0.6));
      }
      O.needsUpdate = V.needsUpdate = C.needsUpdate = true;
    },
  };
}

// A canvas texture painted once.
export function canvasTex(w, h, paint, { srgb = true, repeat = false, mips = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (!mips) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  t.anisotropy = 4;
  return t;
}

// A soft glow facing the camera (lamps, the moon's halo, neon): additive, so it brightens what's behind.
const GLOW_GEO = new THREE.PlaneGeometry(1, 1);
export function glow(U, color, size, strength = 1, { order = 15, pulse = 0 } = {}) {
  const m = shaderMat(U, {
    uniforms: { uCol: { value: new THREE.Color(color) }, uK: { value: strength }, uPulse: { value: pulse } },
    vertex: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `uniform vec3 uCol; uniform float uK; varying vec2 vUv;
      void main() { float r = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - r), 2.2) * uK; if (a < 0.003) discard; gl_FragColor = vec4(uCol * a, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(GLOW_GEO, m);
  mesh.scale.setScalar(size); mesh.renderOrder = order;
  return mesh;
}

// Merges simple parts (each { geo, color, matrix }) into one mesh with vertex colors: one draw for a whole prop.
export function merge(parts) {
  let count = 0;
  const geos = parts.map((p) => { const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo.clone()); if (p.matrix) g.applyMatrix4(p.matrix); count += g.attributes.position.count; return { g, c: new THREE.Color(p.color), e: p.emit || 0 }; });
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3), emi = new Float32Array(count);
  let o = 0;
  for (const { g, c, e } of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < n; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; emi[o + i] = e; }
    o += n; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('aEmit', new THREE.BufferAttribute(emi, 1));
  out.computeBoundingSphere();
  return out;
}
// A matrix from position, rotation (x, y, z) and scale (number or [x, y, z]).
export function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  const sc = Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s);
  return m.compose(new THREE.Vector3(x, y, z), q, sc);
}
// The standard material for merged props: vertex colors, and parts with aEmit glow in their own color.
export function propMat(U, { rough = 0.8, metal = 0, emitK = 2.5 } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal });
  return patchStandard(m, U, {
    vdecl: 'attribute float aEmit; varying float vEmit;', vertex: 'vEmit = aEmit;',
    decl: 'varying float vEmit;',
    emissive: `totalEmissiveRadiance += vColor.rgb * vEmit * ${emitK.toFixed(2)};`,
  });
}

/* Sounds made in Web Audio, quiet under the voice that counts the reps. */
const NOISE_BUFS = new WeakMap();
export function noiseBuf(ac, brown = false) {
  let m = NOISE_BUFS.get(ac);
  if (!m) { m = {}; NOISE_BUFS.set(ac, m); }
  const k = brown ? 'b' : 'w';
  if (m[k]) return m[k];
  const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  m[k] = b;
  return b;
}
// A noise that loops (rain, wind), filtered; `swell` slowly rises and falls (wind gusts). Answers stop().
export function noiseLoop(ac, { hp = 200, lp = 8000, gain = 0.03, brown = false, swell = 0 } = {}) {
  const src = ac.createBufferSource(); src.buffer = noiseBuf(ac, brown); src.loop = true;
  const h = ac.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
  const l = ac.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp;
  const g = ac.createGain(); g.gain.value = 0.0001;
  g.gain.setTargetAtTime(gain, ac.currentTime, 1.2);
  src.connect(h).connect(l).connect(g).connect(ac.destination);
  let lfo = null;
  if (swell) {
    lfo = ac.createOscillator(); lfo.frequency.value = 0.09;
    const lg = ac.createGain(); lg.gain.value = gain * swell;
    lfo.connect(lg).connect(g.gain); lfo.start();
  }
  src.start();
  return { stop() { try { g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.3); src.stop(ac.currentTime + 1.5); if (lfo) lfo.stop(ac.currentTime + 1.5); } catch { /* stopped already */ } } };
}
// A plain tone (bells, chirps, the gong's partials).
export function ping(ac, f, t0, dur, { type = 'sine', vol = 0.05, f2 = 0, attack = 0.005 } = {}) {
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.05);
}
// A burst of filtered noise (thunder, a splash, a whoosh).
export function rumble(ac, t0, dur, { lp = 300, lp2 = 60, vol = 0.2, brown = true, attack = 0.04 } = {}) {
  const src = ac.createBufferSource(); src.buffer = noiseBuf(ac, brown); src.loop = true;
  const l = ac.createBiquadFilter(); l.type = 'lowpass';
  const g = ac.createGain(), t = ac.currentTime + t0;
  l.frequency.setValueAtTime(lp, t); l.frequency.exponentialRampToValueAtTime(Math.max(20, lp2), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(l).connect(g).connect(ac.destination); src.start(t); src.stop(t + dur + 0.1);
}

/* A crowd: people in the stands as flat cutouts facing the camera (a body, a head, arms that go up when they
   cheer), thousands in one draw. spots: [[x, y, z], ...]; uCheer 0..1 makes them jump and throw their arms up. */
export function crowd(U, spots, { size = 0.9, light = '#ffffff', seed = 1 } = {}) {
  const r = rng(seed);
  const SH = ['#ff3d8b', '#29d3f0', '#ffd23f', '#5be38a', '#c77dff', '#ff8a3d', '#f4f4f4', '#3d6bff', '#e8322e', '#1d1d24'];
  const SK = ['#f6c8a0', '#cf935f', '#86522e', '#e8b07e', '#5a3720'];
  const cs = new THREE.Color(), ck = new THREE.Color();
  const g = quadInstances(spots.length, [
    ['aP', 4, (a, o, i) => a.set([spots[i][0], spots[i][1], spots[i][2], r()], o)],
    ['aS', 3, (a, o) => { cs.set(SH[(r() * SH.length) | 0]); a.set([cs.r, cs.g, cs.b], o); }],
    ['aK', 3, (a, o) => { ck.set(SK[(r() * SK.length) | 0]); a.set([ck.r, ck.g, ck.b], o); }],
  ]);
  const m = shaderMat(U, {
    uniforms: { uCheer: { value: 0 }, uLight: { value: new THREE.Color(light) }, uSize: { value: size } },
    vertex: /* glsl */ `attribute vec4 aP; attribute vec3 aS; attribute vec3 aK; uniform float uTime; uniform float uCheer; uniform float uSize;
      varying vec2 vUv; varying vec3 vS; varying vec3 vK; varying float vD; varying float vArm;
      void main() {
        float ph = aP.w * 40.0, hop = (0.03 * sin(uTime * 2.0 + ph) + uCheer * max(0.0, sin(uTime * 11.0 + ph)) * 0.25) * uSize;
        vec4 mv = modelViewMatrix * vec4(aP.xyz + vec3(0.0, hop, 0.0), 1.0);
        mv.xy += vec2(position.x * 0.62, position.y) * uSize;
        gl_Position = projectionMatrix * mv;
        vUv = vec2(position.x + 0.5, position.y); vS = aS; vK = aK; vD = -mv.z;
        vArm = clamp(uCheer * 1.4 + step(0.93, fract(aP.w * 7.0 + floor(uTime * 0.25 + aP.w) * 0.37)) * 0.8, 0.0, 1.0);
      }`,
    fragment: /* glsl */ `uniform vec3 uLight; varying vec2 vUv; varying vec3 vS; varying vec3 vK; varying float vD; varying float vArm; ${FOG}
      void main() {
        vec2 p = vUv;
        float head = length((p - vec2(0.5, 0.78)) * vec2(1.0, 0.75)) - 0.16;
        float body = max(abs(p.x - 0.5) - 0.3, max(p.y - 0.62, -p.y)) - 0.06 * step(0.55, p.y);
        float armL = length(vec2(p.x - mix(0.16, 0.12, vArm), clamp(p.y, mix(0.25, 0.6, vArm), mix(0.55, 0.98, vArm)) - p.y)) - 0.07;
        float armR = length(vec2(p.x - mix(0.84, 0.88, vArm), clamp(p.y, mix(0.25, 0.6, vArm), mix(0.55, 0.98, vArm)) - p.y)) - 0.07;
        vec3 col; float d;
        if (head < 0.0) { col = vK; d = head; } else if (body < 0.0) { col = vS; d = body; } else if (min(armL, armR) < 0.0) { col = vArm > 0.5 ? vK : vS; d = min(armL, armR); } else discard;
        col = mix(col * 0.35, col, smoothstep(0.0, 0.03, -d)) * uLight;
        gl_FragColor = vec4(fogIt(col, vD), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
  return { mesh, cheer: m.uniforms.uCheer, light: m.uniforms.uLight };
}
// Rows of seats rising away: answers crowd spots. (x0..x1 across, z0 the front row, rows going back by dz and up by dy)
export function stands(x0, x1, z0, y0, rows, { step = 0.62, dz = -0.9, dy = 0.45, gaps = 0.08, seed = 3, axis = 'x' } = {}) {
  const r = rng(seed), out = [];
  for (let k = 0; k < rows; k++) for (let x = x0; x <= x1; x += step) {
    if (r() < gaps) continue;
    const jx = x + (r() - 0.5) * step * 0.3;
    out.push(axis === 'x' ? [jx, y0 + k * dy, z0 + k * dz] : [z0 + k * dz, y0 + k * dy, jx]);
  }
  return out;
}

/* Bulbs: glowing dots (string lights, a ferris wheel, a marquee) in one draw, additive. pts: [[x, y, z, colorIndex]];
   chase > 0 runs the lights round in a chase. Children of `parent` turn with it. */
export function bulbs(U, pts, colors, { size = 0.16, chase = 0, strength = 1.6, order = 16 } = {}) {
  const cols = colors.map((c) => new THREE.Color(c));
  const g = quadInstances(pts.length, [['aB', 4, (a, o, i) => a.set([pts[i][0], pts[i][1], pts[i][2], i], o)], ['aC', 3, (a, o, i) => { const n = cols.length, c = cols[((Math.round(pts[i][3] ?? i) % n) + n) % n]; a.set([c.r, c.g, c.b], o); }]]);
  const m = shaderMat(U, {
    uniforms: { uChase: { value: chase }, uK: { value: strength }, uSize: { value: size } },
    vertex: /* glsl */ `attribute vec4 aB; attribute vec3 aC; uniform float uTime; uniform float uChase; uniform float uSize; varying vec2 vUv; varying vec3 vC;
      void main() {
        vec4 mv = modelViewMatrix * vec4(aB.xyz, 1.0);
        mv.xy += vec2(position.x, position.y - 0.5) * uSize;
        gl_Position = projectionMatrix * mv; vUv = vec2(position.x + 0.5, position.y);
        float on = uChase > 0.0 ? 0.35 + 0.65 * step(0.5, fract(aB.w / 3.0 - uTime * uChase)) : 1.0;
        vC = aC * on;
      }`,
    fragment: /* glsl */ `uniform float uK; varying vec2 vUv; varying vec3 vC;
      void main() { float r = length(vUv - 0.5) * 2.0; float a = (smoothstep(1.0, 0.0, r) * 0.6 + smoothstep(0.35, 0.1, r)) * uK; if (a < 0.01) discard;
        gl_FragColor = vec4(vC * a + vec3(smoothstep(0.25, 0.0, r)) * 0.6 * uK, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = order;
  return mesh;
}

// Comic words on a canvas (signs, banners, scoreboards): Bangers with an ink outline.
export function wordsTex(lines, { w = 512, h = 256, bg = null, fill = '#fff8ec', stroke = '#120e18', size = 0.4, font = 'Bangers, Impact, "Arial Black", sans-serif', glow = null } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) { if (typeof bg === 'function') bg(g, w, h); else { g.fillStyle = bg; g.fillRect(0, 0, w, h); } }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const L = Array.isArray(lines) ? lines : [lines];
    L.forEach((ln, i) => {
      const [text, col = fill] = Array.isArray(ln) ? ln : [ln];
      const sz = Math.round(h * size), y = h * ((i + 0.5) / L.length);
      g.font = `${sz}px ${font}`;
      if (glow) { g.shadowColor = glow; g.shadowBlur = sz * 0.3; }
      if (stroke) { g.lineWidth = sz * 0.14; g.strokeStyle = stroke; g.strokeText(text, w / 2, y); }
      g.shadowBlur = 0; g.fillStyle = col; g.fillText(text, w / 2, y);
    });
  });
}
// A flat picture standing in the world (signs, banners), lit or glowing.
export function panel(tex, w, h, { glowK = 0, rough = 0.7, side = THREE.FrontSide } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: rough, transparent: true, alphaTest: 0.05, side });
  if (glowK) { m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = tex; m.emissiveIntensity = glowK; }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

/* City blocks: boxes whose windows are worked out in the shader, lit at random (a few flicker). list: [[x, z, w, d,
   top]] standing on `base`. */
export function cityBlocks(U, list, { base = -60, litFrom = 0.6, day = 0 } = {}) {
  const r = rng(77);
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const m = patchStandard(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.2 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }`,
    diffuse: day
      ? /* glsl */ `diffuseColor.rgb = mix(mix(S(0.55, 0.32, 0.26), S(0.78, 0.66, 0.5), vColor.r), S(0.42, 0.45, 0.52), step(0.7, vColor.b));`
      : /* glsl */ `diffuseColor.rgb = mix(S(0.08, 0.08, 0.11), S(0.16, 0.15, 0.2), vColor.r);`,
    emissive: /* glsl */ `{
      vec3 n = vWN; float seed = vColor.g * 97.0;
      if (abs(n.y) < 0.5) {
        vec2 f = abs(n.z) > 0.5 ? vec2(vWP.x, vWP.y) : vec2(vWP.z, vWP.y);
        vec2 cs = vec2(2.3, 3.4), c = floor(f / cs), q = fract(f / cs);
        float win = step(0.2, q.x) * step(q.x, 0.8) * step(0.25, q.y) * step(q.y, 0.78);
        float s = h21(c + seed), on = step(${litFrom.toFixed(2)} - vColor.b * 0.25, s);
        if (s > 0.985) on *= step(0.35, fract(uTime * 0.6 + s * 13.0));
        vec3 wc = s > 0.93 ? S(0.55, 0.78, 1.0) : s > 0.9 ? S(0.7, 0.55, 1.0) : mix(S(1.0, 0.72, 0.4), S(1.0, 0.86, 0.6), h21(c * 1.7));
        totalEmissiveRadiance += wc * win * on * (1.1 + 0.6 * h21(c * 3.1 + seed)) * ${day ? '0.35' : '1.0'};
        ${day ? 'diffuseColor.rgb = mix(diffuseColor.rgb, S(0.2, 0.3, 0.42), win * 0.85);' : ''}
      }
    }`,
  });
  const mesh = new THREE.InstancedMesh(geo, m, list.length);
  const col = new THREE.Color();
  list.forEach(([x, z, w, d, top], i) => { mesh.setMatrixAt(i, mat(x, base, z, 0, 0, 0, [w, top - base, d])); mesh.setColorAt(i, col.setRGB(r(), r(), r())); });
  return mesh;
}

/* Clumps of plants on crossed cards, thousands in one draw, swaying in the wind (wheat, corn, reeds). pts: [[x, z,
   scale]]; tex: the painted clump (alpha); height in meters. */
export function clumps(U, pts, tex, { height = 1, width = 0.84, sun = '#ffd9a0', amb = '#8fa0c8', sway = 0.12, seed = 9 } = {}) {
  const r = rng(seed);
  const g = new THREE.BufferGeometry(), P = [], UV = [], I = [];
  for (let k = 0; k < 2; k++) {
    const a = k * Math.PI / 2, cx = Math.cos(a) * width / 2, cz = Math.sin(a) * width / 2, b = P.length / 3;
    P.push(-cx, 0, -cz, cx, 0, cz, cx, height, cz, -cx, height, -cz); UV.push(0, 0, 1, 0, 1, 1, 0, 1); I.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I);
  const aW = new Float32Array(pts.length * 2); pts.forEach((p, i) => { aW[i * 2] = r(); aW[i * 2 + 1] = r(); });
  g.setAttribute('aW', new THREE.InstancedBufferAttribute(aW, 2));
  const m = shaderMat(U, {
    uniforms: { uMap: { value: tex }, uSunCol: { value: new THREE.Color(sun) }, uAmb: { value: new THREE.Color(amb) }, uSway: { value: sway } },
    vertex: /* glsl */ `uniform float uTime; uniform float uSway; attribute vec2 aW; ${NOISE}
      varying vec2 vUv; varying float vD; varying float vT; varying float vH;
      void main() {
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float h = uv.y, w = sin(uTime * 1.3 + wp.x * 0.3 + wp.z * 0.2 + aW.x * 2.0) * 0.6 + vnoise(wp.xz * 0.05 + uTime * 0.1) * 0.8;
        wp.x += h * h * w * uSway; wp.z += h * h * w * uSway * 0.3;
        vec4 mv = viewMatrix * wp; gl_Position = projectionMatrix * mv;
        vUv = uv; vD = -mv.z; vT = aW.y; vH = h;
      }`,
    fragment: /* glsl */ `uniform sampler2D uMap; uniform vec3 uSunCol; uniform vec3 uAmb; ${FOG}
      varying vec2 vUv; varying float vD; varying float vT; varying float vH;
      void main() { vec4 c = texture2D(uMap, vUv); if (c.a < 0.35) discard;
        vec3 col = c.rgb * (uAmb + uSunCol * (0.45 + 0.7 * vH)) * (0.82 + vT * 0.36) * mix(0.45, 1.0, smoothstep(0.0, 0.7, vH));
        gl_FragColor = vec4(fogIt(col, vD), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(g, m, pts.length);
  pts.forEach(([x, z, s], i) => mesh.setMatrixAt(i, mat(x, 0, z, 0, r() * Math.PI, 0, [s, s * (0.9 + r() * 0.2), s])));
  mesh.frustumCulled = false;
  return mesh;
}
// A night or dusk sky's stars (add to a sky body): call stars(d) → brightness.
export const STARS = /* glsl */ `float stars(vec3 d) { vec2 g = floor(d.xz / (d.y + 1.2) * 340.0); return step(0.9965, h21(g)) * smoothstep(0.03, 0.2, d.y) * (0.5 + 0.5 * sin(uTime * 3.0 + h21(g + 7.0) * 40.0)); }`;

/* Athletes: players made of parts (torso, pads, head or helmet, two legs, two arms, a shadow), a few draws for a
   whole team, posed each frame: set(i, { x, z (three's), face (radians: 0 faces +z, the camera; π faces away), run (a phase: legs and
   arms swing), color, accent, skin, swing (an arm raised 0..1), helmet }). commit() after the last. */
export function athletes(U, n, { height = 1.9, helmet = true } = {}) {
  const k = height / 1.9;
  const solid = (geo, count = n) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.55 }), count); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; return m; };
  const torsoG = new THREE.BoxGeometry(0.5 * k, 0.62 * k, 0.32 * k); torsoG.translate(0, 0.31 * k, 0);
  const padsG = new THREE.BoxGeometry(0.66 * k, 0.16 * k, 0.4 * k);
  const headG = new THREE.SphereGeometry(0.16 * k, 14, 10);
  const legG = new THREE.CylinderGeometry(0.085 * k, 0.07 * k, 0.88 * k, 8); legG.translate(0, -0.44 * k, 0);
  const armG = new THREE.CylinderGeometry(0.065 * k, 0.055 * k, 0.62 * k, 8); armG.translate(0, -0.31 * k, 0);
  const shadowG = new THREE.CircleGeometry(0.42 * k, 18); shadowG.rotateX(-Math.PI / 2);
  const torso = solid(torsoG), pads = solid(padsG), head = solid(headG), legs = solid(legG, n * 2), arms = solid(armG, n * 2);
  const shadows = new THREE.InstancedMesh(shadowG, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }), n);
  shadows.renderOrder = 2; shadows.frustumCulled = false;
  const group = new THREE.Group(); group.add(torso, pads, head, legs, arms, shadows);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), ZERO = new THREE.Vector3(0, 0, 0), col = new THREE.Color();
  const put = (mesh, i, x, y, z, rx, ry, rz, s = S1) => { E.set(rx, ry, rz, 'YXZ'); Q.setFromEuler(E); mesh.setMatrixAt(i, M.compose(V.set(x, y, z), Q, s)); };
  const hide = (mesh, i) => mesh.setMatrixAt(i, M.compose(ZERO, Q.identity(), ZERO));
  return {
    group,
    set(i, o) {
      if (!o || o.visible === false) { for (const m of [torso, pads, head, shadows]) hide(m, i); for (const s of [0, 1]) { hide(legs, i * 2 + s); hide(arms, i * 2 + s); } return; }
      const { x, z, face = 0, run = 0, swing = 0 } = o, hip = 0.9 * k;
      const sw = Math.sin(run * 11) * (run ? 0.7 : 0), bob = run ? Math.abs(Math.sin(run * 11)) * 0.05 : 0;
      const fx = Math.sin(face), fz = Math.cos(face), sx = fz, sz = -fx;
      put(torso, i, x, hip + bob, z, run ? 0.18 : 0.05, face, 0);
      put(pads, i, x, hip + 0.58 * k + bob, z, 0, face, 0);
      put(head, i, x - fx * 0.02, hip + 0.8 * k + bob, z - fz * 0.02, 0, face, 0);
      for (const s of [-1, 1]) {
        put(legs, i * 2 + (s > 0 ? 1 : 0), x + sx * 0.13 * s * k, hip + bob, z + sz * 0.13 * s * k, sw * s, face, 0);
        const up = s > 0 ? swing : 0;
        put(arms, i * 2 + (s > 0 ? 1 : 0), x + sx * 0.36 * s * k, hip + 0.58 * k + bob, z + sz * 0.36 * s * k, -sw * s * 0.8 - up * 2.6, face, s * (0.15 + up * 0.3));
      }
      put(shadows, i, x, 0.008, z, 0, 0, 0);
      torso.setColorAt(i, col.set(o.color || '#ff8a3d'));
      pads.setColorAt(i, col.set(o.color || '#ff8a3d').multiplyScalar(0.85));
      head.setColorAt(i, col.set(o.helmet ?? helmet ? (o.accent || '#f4f4f4') : (o.skin || '#cf935f')));
      for (const s of [0, 1]) { legs.setColorAt(i * 2 + s, col.set(o.pants || '#f4f4f4')); arms.setColorAt(i * 2 + s, col.set(o.sleeves ? o.color : (o.skin || '#cf935f'))); }
    },
    commit() {
      for (const m of [torso, pads, head, legs, arms, shadows]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    },
  };
}
