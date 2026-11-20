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
    emit(o, count, { speed = 2, up = 0.6, size = 0.06, life = 1, color = '#ffffff', colors = null, spread = 0.1, dir = null, jitter = 0.4 } = {}) {
      const t = U.uTime.value;
      for (let k = 0; k < count; k++) {
        const i = next; next = (next + 1) % n;
        const a = Math.random() * Math.PI * 2, el = up + (1 - up) * Math.random() * 0.6, sp = speed * (1 - jitter + Math.random() * jitter * 2);
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
