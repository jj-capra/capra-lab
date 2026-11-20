/* The street court (Dribble Drill): an outdoor court in the city at sunset. Painted asphalt, a hoop with a chain
   net behind you, a chain-link fence, a graffiti wall, brownstones lighting up, streetlamps coming on, sneakers
   hanging from a wire, a boombox on the bench thumping a beat. The ball you dribble is a real basketball here
   (the page hands its spot over each frame) and casts its shadow. A dribble kicks up a little dust, every tenth
   a ball comes flying in from off court and swishes through the chain net. */
import { THREE, rng, NOISE, shaderMat, patchStandard, skyDome, bursts, glow, merge, mat, propMat, noiseLoop, ping, rumble, canvasTex, cityBlocks, panel } from './core.js';

export default function buildCourt(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(71);
  const fog = new THREE.FogExp2('#d9927a', 0.006);
  scene.fog = fog;
  const SUN = new THREE.Vector3(0.55, 0.1, -0.83).normalize();
  U.uSun.value.copy(SUN);

  scene.add(skyDome(U, /* glsl */ `
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) {
      float h = d.y, sd = max(dot(d, uSun), 0.0);
      vec3 col = mix(S(1.0, 0.62, 0.36), S(0.95, 0.5, 0.55), smoothstep(0.0, 0.2, h));
      col = mix(col, S(0.35, 0.38, 0.72), smoothstep(0.18, 0.7, h));
      col += S(1.0, 0.6, 0.3) * pow(sd, 8.0) * 1.2 + vec3(20.0, 14.0, 8.0) * smoothstep(0.9993, 0.9996, sd);
      vec2 uv = d.xz / max(h + 0.06, 0.03) * 0.5 + vec2(uTime * 0.004, 0.0);
      col = mix(col, mix(S(1.0, 0.55, 0.45), S(0.6, 0.4, 0.62), smoothstep(0.05, 0.4, h)) + S(1.0, 0.6, 0.3) * pow(sd, 5.0), smoothstep(0.6, 0.8, fbm(uv)) * smoothstep(0.02, 0.1, h) * 0.7);
      return col;
    }`));
  const sunGlow = glow(U, '#ff9a4a', 150, 0.8, { order: -5 }); scene.add(sunGlow);

  const hemi = new THREE.HemisphereLight('#ffc8a8', '#5a3a40', 1.0);
  const key = new THREE.DirectionalLight('#ffb070', 3.0);
  key.position.set(0.5, 0.45, -0.75).normalize().multiplyScalar(30);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 80 });
  key.shadow.radius = 4; key.shadow.bias = -0.0005;
  scene.add(hemi, key, key.target);

  // the court: asphalt, painted key and arcs, the cracks, a center circle with CAPRA on it
  const courtMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.85 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      float ln(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.02, abs(d)); }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz;
      vec3 a = mix(S(0.2, 0.2, 0.24), S(0.3, 0.29, 0.33), vnoise(p * 3.0));
      a = mix(a, S(0.14, 0.14, 0.17), smoothstep(0.62, 0.7, vnoise(p * 0.7)) * 0.4);
      float crack = 1.0 - smoothstep(0.0, 0.015, abs(vnoise(p * 1.5) - 0.5));
      a = mix(a, S(0.08, 0.08, 0.1), crack * 0.7);
      // the court is painted: blue inside the lines, red in the key behind you (the basket is at z = -6.4)
      vec2 q = p - vec2(0.0, -6.4);
      float inCourt = step(abs(p.x), 7.5) * step(-14.0, p.y) * step(p.y, 6.0);
      a = mix(a, mix(S(0.18, 0.32, 0.62), S(0.22, 0.38, 0.7), vnoise(p * 2.0)), inCourt * 0.85);
      float key_ = step(abs(q.x), 2.45) * step(0.0, q.y) * step(q.y, 5.8);
      a = mix(a, mix(S(0.72, 0.2, 0.2), S(0.8, 0.26, 0.22), vnoise(p * 2.0)), key_ * 0.9);
      float lines = max(ln(abs(q.x) - 2.45, 0.08) * step(0.0, q.y) * step(q.y, 5.8), ln(q.y - 5.8, 0.08) * step(abs(q.x), 2.45));
      lines = max(lines, ln(length(q - vec2(0.0, 5.8)) - 1.8, 0.08));
      lines = max(lines, ln(length(q) - 6.75, 0.08) * step(0.0, q.y));
      lines = max(lines, max(ln(abs(p.x) - 7.5, 0.1), ln(p.y + 14.0, 0.1)) * step(-14.0, p.y));
      lines = max(lines, ln(length(p - vec2(0.0, 4.0)) - 1.8, 0.08));
      a = mix(a, S(0.92, 0.9, 0.85), lines * inCourt * (0.75 + 0.25 * vnoise(p * 20.0)));
      diffuseColor.rgb = a;
    }`,
  });
  const court = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), courtMat);
  court.rotation.x = -Math.PI / 2; court.position.z = -100; court.receiveShadow = true; scene.add(court);

  const props = propMat(U, { rough: 0.6, emitK: 2.6 });
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);

  /* ---- the hoop behind you: pole, backboard with its square, an orange rim; the chain net hangs off it ---- */
  const hoop = [
    { geo: C(0.09, 0.11, 3.4, 10), color: '#3a4a5a', matrix: mat(0, 1.7, -7.6) },
    { geo: B(0.12, 0.12, 1.2), color: '#3a4a5a', matrix: mat(0, 3.35, -7.05) },
    { geo: B(1.8, 1.05, 0.06), color: '#e8eef4', matrix: mat(0, 3.45, -6.47) },
    { geo: B(0.6, 0.04, 0.07), color: '#e8322e', matrix: mat(0, 3.17, -6.43) },
    { geo: B(0.6, 0.04, 0.07), color: '#e8322e', matrix: mat(0, 3.6, -6.43) },
    { geo: B(0.04, 0.45, 0.07), color: '#e8322e', matrix: mat(-0.29, 3.39, -6.43) },
    { geo: B(0.04, 0.45, 0.07), color: '#e8322e', matrix: mat(0.29, 3.39, -6.43) },
    { geo: new THREE.TorusGeometry(0.23, 0.02, 6, 24), color: '#ff6a1a', matrix: mat(0, 3.05, -6.2, Math.PI / 2) },
  ];
  scene.add(new THREE.Mesh(merge(hoop), props));
  // the chain net: chain links down from the rim, swinging after a swish
  const netPts = [], netN = 12;
  for (let i = 0; i < netN; i++) for (let k = 0; k < 6; k++) netPts.push([i, k]);
  const netGeo = new THREE.BufferGeometry(); netGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(netN * 6 * 2 * 3 * 2), 3));
  const net = new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: '#c8cdd4' })); scene.add(net);
  let swishAt = -99;
  function netUpdate(t) {
    const a = netGeo.attributes.position.array, k0 = Math.max(0, 1 - (t - swishAt) / 1.6), wob = k0 * Math.sin((t - swishAt) * 18);
    let o = 0;
    const pt = (i, k) => { const ang = (i / netN) * Math.PI * 2, rad = 0.23 - k * 0.022, y = 3.05 - k * 0.075, sw = Math.sin(t * 1.5 + i) * 0.006 + wob * 0.03 * k / 5; return [Math.cos(ang) * rad + sw, y, -6.2 + Math.sin(ang) * rad + wob * 0.02 * k / 5]; };
    for (let i = 0; i < netN; i++) for (let k = 0; k < 5; k++) {
      const p0 = pt(i, k), p1 = pt(i + 0.5, k + 1), p2 = pt(i - 0.5, k + 1);
      a.set(p0, o); a.set(p1, o + 3); a.set(p0, o + 6); a.set(p2, o + 9); o += 12;
    }
    netGeo.attributes.position.needsUpdate = true; netGeo.setDrawRange(0, o / 3);
  }

  /* ---- the chain-link fence, the graffiti wall, benches, the boombox, sneakers on the wire ---- */
  const fenceMat = shaderMat(U, {
    vertex: /* glsl */ `varying vec2 vP; varying float vD; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = vec2(w.x + w.z, w.y); vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragment: /* glsl */ `varying vec2 vP; varying float vD;
      void main() {
        vec2 g = vP * 9.0; vec2 d = abs(fract(vec2(g.x + g.y, g.x - g.y) * 0.5) - 0.5);
        float w = fwidth(g.x) * 0.6 + 0.04;
        float wire = 1.0 - smoothstep(0.0, w, min(d.x, d.y));
        float a = wire * (1.0 - smoothstep(18.0, 40.0, vD)) * 0.85;
        if (a < 0.03) discard;
        gl_FragColor = vec4(vec3(0.62, 0.64, 0.68) * 0.9, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const fence = [];
  for (const [x, z, w, ry] of [[0, -14.3, 18, 0], [-9, -5, 18, Math.PI / 2], [9, -5, 18, Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.6), fenceMat); m.position.set(x, 1.8, z); m.rotation.y = ry; m.renderOrder = 9; scene.add(m);
  }
  for (let x = -9; x <= 9; x += 3) fence.push({ geo: C(0.04, 0.04, 3.7, 6), color: '#7a7f88', matrix: mat(x, 1.85, -14.3) });
  for (let z = -14; z <= 4; z += 3) { fence.push({ geo: C(0.04, 0.04, 3.7, 6), color: '#7a7f88', matrix: mat(-9, 1.85, z) }); fence.push({ geo: C(0.04, 0.04, 3.7, 6), color: '#7a7f88', matrix: mat(9, 1.85, z) }); }
  fence.push({ geo: C(0.03, 0.03, 18, 6), color: '#7a7f88', matrix: mat(0, 3.65, -14.3, 0, 0, Math.PI / 2) });
  // benches with the boombox, a few spare balls
  fence.push({ geo: B(2.6, 0.08, 0.45), color: '#2e8a5a', matrix: mat(-6.4, 0.48, -4.2) }, { geo: B(0.08, 0.48, 0.4), color: '#333', matrix: mat(-7.5, 0.24, -4.2) }, { geo: B(0.08, 0.48, 0.4), color: '#333', matrix: mat(-5.3, 0.24, -4.2) });
  fence.push({ geo: B(0.7, 0.36, 0.22), color: '#1d1d24', matrix: mat(-6.2, 0.7, -4.2) }, { geo: B(0.5, 0.05, 0.05), color: '#bbb', matrix: mat(-6.2, 0.95, -4.2) });
  fence.push({ geo: B(2.6, 0.08, 0.45), color: '#2e8a5a', matrix: mat(6.4, 0.48, -8.2) }, { geo: B(0.08, 0.48, 0.4), color: '#333', matrix: mat(5.3, 0.24, -8.2) }, { geo: B(0.08, 0.48, 0.4), color: '#333', matrix: mat(7.5, 0.24, -8.2) });
  for (const [x, z] of [[-4.6, -9.5], [5.2, -3.6], [7.7, -12]]) fence.push({ geo: new THREE.SphereGeometry(0.12, 14, 10), color: '#e8641a', matrix: mat(x, 0.12, z) });
  // streetlamps
  const lamps = [[-8.6, -13.8], [8.6, -13.8], [-8.6, 0.5], [8.6, 0.5]];
  for (const [x, z] of lamps) { fence.push({ geo: C(0.07, 0.1, 5.5, 8), color: '#2b3038', matrix: mat(x, 2.75, z) }); fence.push({ geo: B(0.9, 0.08, 0.14), color: '#2b3038', matrix: mat(x - Math.sign(x) * 0.42, 5.45, z) }); fence.push({ geo: B(0.42, 0.14, 0.28), color: '#fff0c0', matrix: mat(x - Math.sign(x) * 0.8, 5.38, z), emit: 2.0 }); }
  scene.add(new THREE.Mesh(merge(fence), props));
  const lampGlows = lamps.map(([x, z]) => { const g = glow(U, '#ffd9a0', 2.6, 0.45); g.position.set(x - Math.sign(x) * 0.8, 5.3, z); scene.add(g); return g; });
  const speakers = [-6.35, -6.05].map((x) => { const s = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshStandardMaterial({ color: '#444', roughness: 0.4 })); s.position.set(x, 0.7, -4.08); scene.add(s); return s; });
  // the graffiti wall behind the fence
  const graffiti = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#8a5a4a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 0 : 20; x < w; x += 40) { g.fillStyle = `rgba(${90 + ((x * 7 + y) % 40)},${50 + ((x + y * 3) % 25)},40,0.5)`; g.fillRect(x + 1, y + 1, 38, 14); }
    const tag = (text, x, y, size, fill, out, rot) => { g.save(); g.translate(x, y); g.rotate(rot); g.font = `${size}px Bangers, Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = size * 0.22; g.strokeStyle = '#120e18'; g.strokeText(text, 0, 0); g.lineWidth = size * 0.1; g.strokeStyle = out; g.strokeText(text, 0, 0); g.fillStyle = fill; g.fillText(text, 0, 0); g.restore(); };
    tag('IRL', 150, 130, 150, '#ffd23f', '#ff3d8b', -0.08); tag('BALL IS LIFE', 520, 120, 92, '#29d3f0', '#fff8ec', 0.04); tag('CAPRA', 860, 140, 120, '#5be38a', '#c77dff', -0.05);
    for (let i = 0; i < 26; i++) { g.fillStyle = ['#ffd23f', '#ff3d8b', '#29d3f0', '#5be38a'][i % 4]; g.globalAlpha = 0.8; g.beginPath(); g.arc((i * 97) % w, 30 + ((i * 53) % 200), 4 + (i % 4) * 2, 0, Math.PI * 2); g.fill(); g.fillRect((i * 97) % w - 1, 30 + ((i * 53) % 200), 3, 20 + (i % 3) * 10); }
    g.globalAlpha = 1;
  });
  const wall = panel(graffiti, 24, 5.4, { rough: 0.9 }); wall.position.set(0, 2.5, -16.5); scene.add(wall);
  // sneakers hanging from a wire over the court
  {
    const a = new THREE.Vector3(-14, 6.2, -10), b = new THREE.Vector3(14, 6.4, -11), pts = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(new THREE.Vector3().lerpVectors(a, b, u).add(new THREE.Vector3(0, -Math.sin(u * Math.PI) * 0.8, 0))); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#1a1a1a' })));
  }
  const shoes = new THREE.Group(); shoes.position.set(2.4, 5.62, -10.6); scene.add(shoes);
  shoes.add(new THREE.Mesh(merge([
    { geo: C(0.004, 0.004, 0.5, 3), color: '#eee', matrix: mat(-0.06, -0.25, 0, 0, 0, 0.2) }, { geo: C(0.004, 0.004, 0.45, 3), color: '#eee', matrix: mat(0.06, -0.22, 0, 0, 0, -0.2) },
    { geo: B(0.12, 0.1, 0.3), color: '#e8322e', matrix: mat(-0.11, -0.55, 0.05) }, { geo: B(0.12, 0.03, 0.31), color: '#f4f4f4', matrix: mat(-0.11, -0.61, 0.05) },
    { geo: B(0.12, 0.1, 0.3), color: '#e8322e', matrix: mat(0.11, -0.48, -0.03) }, { geo: B(0.12, 0.03, 0.31), color: '#f4f4f4', matrix: mat(0.11, -0.54, -0.03) },
  ]), props));

  /* ---- the city: brownstones and towers, lights coming on ---- */
  const blocks = [];
  const addRow = (z0, z1, xs, top0, top1, w0, w1, seed) => { const rr = rng(seed); for (let x = -xs; x < xs;) { const w = w0 + rr() * (w1 - w0), d = w0 + rr() * (w1 - w0), top = top0 + rr() ** 1.5 * (top1 - top0); blocks.push([x + w / 2, z0 - rr() * (z0 - z1), w, d, top]); x += w + 0.5 + rr() * 2; } };
  addRow(-24, -30, 45, 9, 18, 6, 11, 4); addRow(-45, -70, 110, 12, 40, 8, 18, 5); addRow(-90, -150, 200, 20, 85, 12, 26, 6);
  scene.add(cityBlocks(U, blocks, { base: 0, litFrom: 0.72, day: 1 }));

  /* ---- the basketball you dribble, and the one that swishes in ---- */
  const ballMat = patchStandard(new THREE.MeshStandardMaterial({ color: '#e8641a', roughness: 0.65 }), U, {
    vdecl: 'varying vec3 vLoc;', vertex: 'vLoc = normalize(position);', decl: 'varying vec3 vLoc;',
    diffuse: /* glsl */ `{
      vec3 q = vLoc; float s2 = abs(abs(q.z) - 0.55 - 0.25 * q.y * q.y);
      float seam = min(min(abs(q.x), abs(q.y)), s2);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03), 1.0 - smoothstep(0.03, 0.06, seam));
      diffuseColor.rgb *= 0.9 + 0.2 * h21(floor(q.xy * 40.0));
    }`,
  });
  const ballGeo = new THREE.SphereGeometry(1, 24, 16);
  const myBalls = [0, 1].map(() => { const m = new THREE.Mesh(ballGeo, ballMat); m.castShadow = true; m.visible = false; scene.add(m); return m; });
  const flyer = new THREE.Mesh(ballGeo, ballMat); flyer.scale.setScalar(0.12); flyer.visible = false; scene.add(flyer);
  const dust = bursts(U, { n: 120, shape: 'puff', grav: 0.1, drag: 2.5, opacity: 0.4 });
  scene.add(dust.mesh);
  let lampsOn = 0.4;

  const place = {
    scene, fog, key, camH: 1.35, exposure: 1.05,
    pup: { tint: new THREE.Color(1.0, 0.92, 0.86), rim: new THREE.Color('#ff9a4a').multiplyScalar(0.95), rimDir: [0.7, 0.5] },
    update(dt, t, info) {
      const cam = env.camera.position;
      sunGlow.position.copy(cam).addScaledVector(SUN, 420); sunGlow.lookAt(cam);
      netUpdate(t);
      // the balls being dribbled: where the page says, a little in front of the player, spinning
      myBalls.forEach((m, i) => {
        const b = info.balls[i];
        m.visible = !!b;
        if (!b) return;
        const p = info.toWorld(b.x, b.y, 0.12), rad = b.r / info.ppm;
        m.position.set(p.x, Math.max(rad, p.y), p.z); m.scale.setScalar(rad); m.rotation.x += dt * 5; m.rotation.z += dt * 2;
      });
      // the swish: a ball from off court, an arc into the rim, down through the net
      const k = (t - swishAt + 1.2) / 1.2;
      flyer.visible = k > 0 && k < 1.5;
      if (flyer.visible) {
        const u = Math.min(1, k), from = new THREE.Vector3(6, 1.8, -3), to = new THREE.Vector3(0, 3.05, -6.2);
        flyer.position.lerpVectors(from, to, u); flyer.position.y += Math.sin(u * Math.PI) * 2.4;
        if (k > 1) flyer.position.set(0, 3.05 - (k - 1) * 6, -6.2);
        flyer.rotation.x += dt * 9;
      }
      lampsOn = Math.max(0.45, lampsOn - dt * 0.4);
      lampGlows.forEach((g, i) => { g.material.uniforms.uK.value = lampsOn * (0.95 + 0.05 * Math.sin(t * 50 + i)); });
      // the boombox thumps
      const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 3.0)), 8);
      speakers.forEach((s) => s.scale.setScalar(1 + beat * 0.18));
    },
    pulse(kind, at) {
      const f = at.pos || at.foot;
      if (kind === 'rep') dust.emit({ x: f.x, y: 0.05, z: f.z }, 2, { speed: 0.4, up: 0.2, size: 0.18, life: 0.9, color: '#9a8f9a', spread: 0.15 });
      else if (kind === 'big') {
        swishAt = U.uTime.value + 1.2; lampsOn = 1.4;
        if (at.ac) setTimeout(() => { if (!at.ac) return; rumble(at.ac, 0, 0.35, { lp: 6000, lp2: 2000, vol: 0.05, brown: false, attack: 0.01 }); for (let i = 0; i < 6; i++) ping(at.ac, 3000 + Math.random() * 2000, i * 0.04, 0.12, { vol: 0.012 }); }, 1200);
      }
    },
    ambience(ac) {
      const city = noiseLoop(ac, { hp: 60, lp: 400, gain: 0.025, brown: true, swell: 0.4 });
      // the boombox: a quiet boom-bap
      let alive = true, tm = 0, n = 0;
      const step = () => { if (!alive) return; const s = n % 8; if (s === 0 || s === 5) ping(ac, 70, 0, 0.18, { vol: 0.08, f2: 45 }); if (s === 2 || s === 6) rumble(ac, 0, 0.12, { lp: 3000, lp2: 1200, vol: 0.03, brown: false, attack: 0.002 }); rumble(ac, 0, 0.03, { lp: 9000, lp2: 7000, vol: 0.006, brown: false, attack: 0.001 }); n++; tm = setTimeout(step, 1000 / 6); };
      step();
      return { stop() { alive = false; clearTimeout(tm); city.stop(); } };
    },
    quality() {},
  };
  return place;
}
