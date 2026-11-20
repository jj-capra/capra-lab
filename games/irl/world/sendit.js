/* Send It! over the sea (IRL's body-flown Send It!): a summer afternoon, a chase camera behind your contraption.
   An ocean with rolling swell and the sun glittering on it, the long pier you pushed off (pilings, railings, a
   crowd along the rails, the pink SEND IT! arch at the end), buoys every 100 feet, sailboats and a lighthouse on
   the far headlands, gulls. The air is the game's (makeAir in sports.mjs): green updrafts as glowing columns of
   rising air, red downdrafts sinking, their rings on the water. The contraption is Send It!'s own drawing from
   behind (rear.mjs), stood up in the sky as a cutout, its shadow on the water. An updraft sparkles, the splash
   throws water everywhere. Feet; sport coordinates (x across, z out from the pier) are three's (x, y, -z). */
import { THREE, rng, NOISE, FOG, shaderMat, skyDome, bursts, glow, merge, mat, propMat, noiseLoop, rumble, ping, crowd, quadInstances } from './core.js';
import { drawRear } from '../../send-it/rear.mjs';
import { FLY } from '../sports.mjs';

const PIER = 30;

export default function buildSendIt(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(131);
  const fog = new THREE.FogExp2('#cfe4f6', 0.00045);
  scene.fog = fog;
  const SUN = new THREE.Vector3(0.35, 0.42, -0.84).normalize();
  U.uSun.value.copy(SUN);

  scene.add(skyDome(U, /* glsl */ `
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) {
      float h = d.y, sd = max(dot(d, uSun), 0.0);
      vec3 col = mix(S(0.82, 0.9, 0.98), S(0.24, 0.52, 0.92), smoothstep(0.0, 0.45, h)) + S(1.0, 0.92, 0.75) * pow(sd, 12.0) * 0.8 + vec3(14.0, 12.0, 9.0) * smoothstep(0.9993, 0.9996, sd);
      vec2 uv = d.xz / max(h + 0.04, 0.03) * 0.45 + vec2(uTime * 0.004, 0.0);
      float c = smoothstep(0.52, 0.76, fbm(uv * 1.2)) * smoothstep(0.01, 0.12, h);
      return mix(col, mix(S(1.0, 1.0, 1.0), S(0.72, 0.76, 0.86), smoothstep(0.5, 0.8, fbm(uv * 1.2 - uSun.xz * 0.05))), c * 0.9);
    }`));
  const sunGlow = glow(U, '#fff2c8', 160, 0.7, { order: -5 }); scene.add(sunGlow);

  const hemi = new THREE.HemisphereLight('#d8e8ff', '#3a6a8a', 1.3);
  const key = new THREE.DirectionalLight('#fff4dc', 2.8); key.position.copy(SUN).multiplyScalar(400);
  scene.add(hemi, key);

  /* ---- the ocean: swell, sun glitter, the sky in it ---- */
  const seaMat = shaderMat(U, {
    vertex: /* glsl */ `varying vec3 vWp; varying float vD; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWp = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragment: /* glsl */ `uniform float uTime; uniform vec3 uSun; varying vec3 vWp; varying float vD; ${NOISE} ${FOG}
      vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      float hgt(vec2 p) { return vnoise(p * 0.02 + vec2(uTime * 0.05, uTime * 0.03)) * 0.6 + vnoise(p * 0.07 - vec2(uTime * 0.11, 0.0)) * 0.3 + vnoise(p * 0.25 + uTime * 0.3) * 0.1; }
      void main() {
        vec2 p = vWp.xz; float e = 0.6;
        vec3 n = normalize(vec3(hgt(p - vec2(e, 0.0)) - hgt(p + vec2(e, 0.0)), 0.25, hgt(p - vec2(0.0, e)) - hgt(p + vec2(0.0, e))));
        n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(200.0, 2500.0, vD)));
        vec3 V = normalize(vWp - cameraPosition), R = reflect(V, n);
        vec3 skyc = mix(S(0.82, 0.9, 0.98), S(0.3, 0.55, 0.9), smoothstep(0.0, 0.5, R.y));
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-V, n), 0.0), 5.0);
        vec3 col = mix(mix(S(0.02, 0.18, 0.3), S(0.05, 0.32, 0.42), hgt(p) * 0.8), skyc, fres);
        float gl = pow(max(dot(R, uSun), 0.0), 220.0) * (0.5 + h21(floor(p * 0.6) + floor(uTime * 6.0)) * 1.5);
        col += vec3(1.0, 0.95, 0.85) * gl * 4.0;
        col += vec3(0.9) * smoothstep(0.82, 0.95, hgt(p * 1.7)) * 0.08;
        gl_FragColor = vec4(fogIt(col, vD), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.z = -4000; scene.add(sea);

  /* ---- the pier: deck, pilings, railings, lamps, the crowd, the SEND IT! arch at the end ---- */
  const props = propMat(U, { rough: 0.7, emitK: 2 });
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
  const pier = [
    { geo: B(18, 1.2, 420), color: '#a8743f', matrix: mat(0, PIER - 0.6, 210) },
    { geo: B(18.4, 0.3, 420), color: '#7a4a24', matrix: mat(0, PIER - 1.3, 210) },
  ];
  for (let z = 0; z < 420; z += 12) for (const x of [-8, 0, 8]) pier.push({ geo: C(0.7, 0.8, PIER + 6, 8), color: '#5a3a20', matrix: mat(x, (PIER - 6) / 2 - 3, z + 1) });
  for (const x of [-9, 9]) { pier.push({ geo: B(0.3, 0.3, 420), color: '#f4f0e6', matrix: mat(x, PIER + 3.5, 210) }); for (let z = 0; z < 420; z += 6) pier.push({ geo: B(0.25, 3.5, 0.25), color: '#f4f0e6', matrix: mat(x, PIER + 1.75, z) }); }
  for (let z = 10; z < 420; z += 40) for (const x of [-8.6, 8.6]) { pier.push({ geo: C(0.2, 0.25, 12, 6), color: '#2a3a4a', matrix: mat(x, PIER + 6, z) }); pier.push({ geo: new THREE.SphereGeometry(0.8, 10, 8), color: '#fff2c8', matrix: mat(x, PIER + 12.3, z), emit: 1.2 }); }
  // the arch over the end of the pier, the ramp
  for (const x of [-9, 9]) pier.push({ geo: B(1.2, 13, 1.2), color: '#ff3d8b', matrix: mat(x, PIER + 6.5, 0.5) });
  pier.push({ geo: B(19.4, 4.4, 1.0), color: '#ff3d8b', matrix: mat(0, PIER + 12, 0.5) });
  pier.push({ geo: B(10, 0.8, 8), color: '#ffd23f', matrix: mat(0, PIER + 0.2, 3, -0.1) });
  scene.add(new THREE.Mesh(merge(pier), props));
  const archTex = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 220; const g = c.getContext('2d'); g.fillStyle = '#ff3d8b'; g.fillRect(0, 0, 1024, 220); g.font = '170px Bangers, Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 18; g.strokeStyle = '#120e18'; g.strokeText('SEND IT!', 512, 118); g.fillStyle = '#ffd23f'; g.fillText('SEND IT!', 512, 118); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const arch = new THREE.Mesh(new THREE.PlaneGeometry(19, 4.2), new THREE.MeshStandardMaterial({ map: archTex, roughness: 0.7, side: THREE.DoubleSide })); arch.position.set(0, PIER + 12, 1.05); scene.add(arch);
  const fans = crowd(U, Array.from({ length: 84 }, (_, i) => { const side = i % 2 ? -1 : 1; return [side * (6.5 + r() * 2), PIER + 2.9, 4 + Math.floor(i / 2) * 1.6 + r()]; }), { size: 5.4, light: '#ffffff' });
  scene.add(fans.mesh);

  /* ---- far off: headlands, a lighthouse, sailboats ---- */
  {
    const g = new THREE.PlaneGeometry(16000, 400, 160, 4), p = g.attributes.position, cols = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), back = (y + 200) / 400; const hh = Math.max(0, Math.sin(x * 0.0011 + 0.6) * 0.6 + Math.sin(x * 0.004) * 0.25 + 0.1); p.setZ(i, hh * 260 * Math.sin(back * Math.PI)); const c = new THREE.Color('#6a8a6a').lerp(new THREE.Color('#9ab0c8'), 0.5 + back * 0.3); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false })); m.rotation.x = -Math.PI / 2; m.position.set(0, -2, -6500); scene.add(m);
  }
  const far = [
    { geo: C(9, 13, 70, 12), color: '#f4f0e6', matrix: mat(1800, 120, -5200) }, { geo: C(9.5, 9.5, 12, 12), color: '#e8322e', matrix: mat(1800, 92, -5200) },
    { geo: C(11, 11, 8, 12), color: '#2a2a30', matrix: mat(1800, 158, -5200) }, { geo: C(6, 6, 8, 12), color: '#fff6c8', matrix: mat(1800, 166, -5200), emit: 2 },
  ];
  for (let i = 0; i < 9; i++) { const x = (r() - 0.5) * 3000, z = -1500 - r() * 3000, s = 1 + r(); far.push({ geo: B(6 * s, 2 * s, 18 * s), color: '#f4f4f4', matrix: mat(x, s, z) }, { geo: new THREE.ConeGeometry(6 * s, 24 * s, 3), color: i % 3 ? '#fff8ec' : '#ff3d8b', matrix: mat(x, 14 * s, z, 0, r() * 3, 0, [0.15, 1, 1]) }); }
  scene.add(new THREE.Mesh(merge(far), propMat(U, { rough: 0.8, emitK: 3 })));
  const lampGlow = glow(U, '#fff2b0', 60, 0.6); lampGlow.position.set(1800, 166, -5190); scene.add(lampGlow);

  /* ---- the course: buoys every 100 feet, the air's columns ---- */
  const buoyN = 30;
  const buoys = new THREE.InstancedMesh(merge([{ geo: new THREE.ConeGeometry(1.6, 4.5, 10), color: '#ff7a1a', matrix: mat(0, 2.25, 0) }, { geo: C(1.7, 1.7, 0.6, 10), color: '#f4f4f4', matrix: mat(0, 1.3, 0) }, { geo: new THREE.SphereGeometry(0.5, 8, 6), color: '#fff6c8', matrix: mat(0, 4.8, 0), emit: 2 }]), props, buoyN);
  buoys.frustumCulled = false; scene.add(buoys);
  const zoneMat = (up) => shaderMat(U, {
    uniforms: { uUp: { value: up ? 1 : -1 }, uCol: { value: new THREE.Color(up ? '#5be38a' : '#ff5a5a') } },
    vertex: /* glsl */ `varying vec2 vUv; varying float vD; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragment: /* glsl */ `uniform float uTime; uniform float uUp; uniform vec3 uCol; varying vec2 vUv; varying float vD; ${NOISE}
      void main() {
        float y = vUv.y * 9.0 - uTime * 0.9 * uUp, x = vUv.x * 18.0;
        float chev = smoothstep(0.12, 0.0, abs(fract(y + abs(fract(x) - 0.5) * 0.6 * uUp) - 0.5) - 0.38);
        float streak = smoothstep(0.7, 1.0, vnoise(vec2(x * 3.0, y * 0.5)));
        float a = (0.05 + chev * 0.22 + streak * 0.1) * pow(1.0 - vUv.y, 1.5) * smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(1400.0, 2200.0, vD));
        gl_FragColor = vec4(uCol * a * 0.8, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const colGeo = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true); colGeo.translate(0, 0.5, 0);
  const ringGeo = new THREE.RingGeometry(0.93, 1, 40); ringGeo.rotateX(-Math.PI / 2);
  const upMat = zoneMat(true), downMat = zoneMat(false);
  const ringUp = new THREE.MeshBasicMaterial({ color: '#5be38a', transparent: true, opacity: 0.7, depthWrite: false }), ringDown = new THREE.MeshBasicMaterial({ color: '#ff5a5a', transparent: true, opacity: 0.7, depthWrite: false });
  const zones = Array.from({ length: 14 }, () => { const col = new THREE.Mesh(colGeo, upMat), ring = new THREE.Mesh(ringGeo, ringUp); col.renderOrder = 12; ring.renderOrder = 3; scene.add(col, ring); return { col, ring }; });

  /* ---- the contraption: Send It!'s drawing from behind, stood up in the sky ---- */
  const craftCv = document.createElement('canvas'); craftCv.width = craftCv.height = 256;
  const craftTex = new THREE.CanvasTexture(craftCv); craftTex.colorSpace = THREE.SRGBColorSpace;
  const craft = new THREE.Mesh(new THREE.PlaneGeometry(19, 19), new THREE.MeshBasicMaterial({ map: craftTex, transparent: true, alphaTest: 0.05, toneMapped: false, side: THREE.DoubleSide }));
  craft.renderOrder = 14; scene.add(craft);
  const craftShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: '#02121c', transparent: true, opacity: 0.35, depthWrite: false }));
  craftShadow.rotation.x = -Math.PI / 2; craftShadow.renderOrder = 3; scene.add(craftShadow);
  // gulls riding along
  const gullGeo = new THREE.BufferGeometry(); gullGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.6, -2.4, 0.3, 0, 0, 0, -0.6, 0, 0, 0.6, 0, 0, -0.6, 2.4, 0.3, 0], 3));
  const gulls = [0, 1, 2, 3].map((i) => { const m = new THREE.Mesh(gullGeo, new THREE.MeshBasicMaterial({ color: '#f8f8f8', side: THREE.DoubleSide })); scene.add(m); return { m, ph: i * 1.7 }; });
  const spray = bursts(U, { n: 400, shape: 'drop', grav: -30, drag: 0.6 });
  const sparkle = bursts(U, { n: 160, shape: 'drop', grav: 0, drag: 1.2, blend: THREE.AdditiveBlending });
  scene.add(spray.mesh, sparkle.mesh);
  let lastSt = null;

  const place = {
    scene, fog, sport: true, exposure: 1.0,
    pup: { tint: new THREE.Color(1, 1, 1), rim: new THREE.Color(0, 0, 0), rimDir: [0, 1] },
    update(dt, t) {
      const cam = env.camera.position;
      sunGlow.position.copy(cam).addScaledVector(SUN, 420); sunGlow.lookAt(cam);
      void t;
    },
    view(v, now, t) {
      const c = v.c, st = c ? c.state : { x: 0, y: PIER, z: -60, roll: 0, craft: 'goat', camX: 0 };
      lastSt = st;
      // the buoys from just behind to well ahead
      const z0 = Math.max(100, Math.ceil((st.z - 60) / 100) * 100);
      for (let i = 0; i < buoyN; i++) { const z = z0 + Math.floor(i / 2) * 100, x = i % 2 ? FLY.half + 6 : -FLY.half - 6; buoys.setMatrixAt(i, mat(x, Math.sin(t * 1.3 + i) * 0.4 - 0.3, -z, Math.sin(t + i) * 0.06, 0, Math.cos(t * 1.1 + i) * 0.06, z % 500 ? 1 : 1.4)); }
      buoys.instanceMatrix.needsUpdate = true;
      // the air: the columns near the craft
      const list = c ? c.air.zones.filter((q) => q.z1 > st.z - 80 && q.z0 < st.z + 1600) : [];
      zones.forEach((Z, i) => {
        const q = list[i]; Z.col.visible = Z.ring.visible = !!q; if (!q) return;
        const up = q.kind === 'up', zc = (q.z0 + q.z1) / 2, rz = (q.z1 - q.z0) / 2;
        Z.col.material = up ? upMat : downMat; Z.ring.material = up ? ringUp : ringDown;
        Z.col.position.set(q.x, 0, -zc); Z.col.scale.set(q.r, 95, rz);
        Z.ring.position.set(q.x, 0.4, -zc); Z.ring.scale.set(q.r, 1, rz);
      });
      // the contraption, drawn fresh (it banks, its parts move)
      const g = craftCv.getContext('2d');
      g.clearRect(0, 0, 256, 256);
      drawRear(g, st.craft, 128, 140, 1.2, st.roll || 0, now / 1000, null);
      craftTex.needsUpdate = true;
      const y = Math.max(0.5, st.y);
      craft.position.set(st.x, y + 0.9, -st.z);
      craft.lookAt(env.camera.position.x, y + 0.9 + (env.camera.position.y - y) * 0.2, env.camera.position.z);
      craftShadow.position.set(st.x, 0.3, -st.z); craftShadow.scale.set(7 * (1 - Math.min(0.6, y / 160)), 2.2, 1); craftShadow.material.opacity = Math.max(0.08, 0.4 - y / 300);
      gulls.forEach((G) => { const a = t * 0.6 + G.ph; G.m.position.set(st.x + Math.cos(a) * 40, y + 16 + Math.sin(a * 1.3) * 5, -(st.z + 60 + Math.sin(a) * 30)); G.m.rotation.y = -a; G.m.scale.y = 1 + Math.sin(t * 7 + G.ph) * 0.7; });
    },
    pulse(kind, at) {
      const st = lastSt; if (!st) return;
      const p = { x: st.x, y: Math.max(0.5, st.y), z: -st.z };
      if (kind === 'splash') { spray.emit({ x: p.x, y: 0.5, z: p.z }, 160, { speed: 26, up: 0.75, size: 1.2, life: 1.8, colors: ['#ffffff', '#cfefff', '#a8dcf0'], spread: 6 }); if (at.ac) rumble(at.ac, 0, 1.6, { lp: 1800, lp2: 200, vol: 0.12, brown: false, attack: 0.01 }); }
      else if (kind === 'rep') { sparkle.emit(p, 30, { speed: 8, up: 0.5, size: 0.9, life: 1, colors: ['#5be38a', '#fff8a0', '#ffffff'], spread: 6 }); if (at.ac) [880, 1175, 1568].forEach((f, i) => ping(at.ac, f, i * 0.06, 0.4, { vol: 0.025 })); }
      else if (kind === 'move') { fans.cheer.value = 1; setTimeout(() => { fans.cheer.value = 0; }, 2500); }
    },
    ambience(ac) {
      const surf = noiseLoop(ac, { hp: 150, lp: 900, gain: 0.03, swell: 0.9 });
      const wind = noiseLoop(ac, { hp: 500, lp: 2500, gain: 0.012, swell: 0.6 });
      return { stop() { surf.stop(); wind.stop(); } };
    },
    quality() {},
  };
  void quadInstances;
  return place;
}
