/* The stadium (Goalkeeper): a soccer stadium at night. You're in goal: a real goal stands behind you (sized each
   frame to the goal the game plays, so the shots still line up), its net bulging when one goes in. A striped
   pitch, the box's lines, LED boards scrolling CAPRA LAB, stands packed with fans, floodlights glaring. A save
   brings the crowd up with phone flashes going off, a goal makes them groan and the net ripple, every fifth save
   sets off fireworks over the stands. */
import { THREE, rng, NOISE, FOG, shaderMat, patchStandard, skyDome, bursts, glow, merge, mat, propMat, noiseLoop, rumble, crowd, stands, wordsTex, canvasTex, STARS } from './core.js';

const GOAL_Z = -0.65, NET_D = 1.5;

export default function buildStadium(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(81);
  const fog = new THREE.FogExp2('#1a2340', 0.006);
  scene.fog = fog;

  scene.add(skyDome(U, /* glsl */ `${STARS}
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) {
      float h = d.y;
      vec3 col = mix(S(0.3, 0.34, 0.5), S(0.03, 0.04, 0.1), smoothstep(0.0, 0.5, h));
      return col + vec3(0.9) * stars(d) * smoothstep(0.3, 0.7, h) * 0.6;
    }`));

  const hemi = new THREE.HemisphereLight('#a8b8ff', '#2a3a2a', 1.0);
  const key = new THREE.DirectionalLight('#f0f4ff', 2.6);
  key.position.set(-0.55, 1.0, -0.5).normalize().multiplyScalar(30);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 80 });
  key.shadow.radius = 4; key.shadow.bias = -0.0005;
  const fill = new THREE.DirectionalLight('#dfe6ff', 1.2); fill.position.set(0.7, 0.9, 0.4);
  scene.add(hemi, key, key.target, fill);

  // the pitch: mowed in stripes, the goal line and the box's lines
  const pitchMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.9 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      float ln(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.02, abs(d)); }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz; float gz = ${GOAL_Z.toFixed(2)};
      float stripe = step(0.5, fract((p.y - gz) / 5.0));
      vec3 g = mix(S(0.16, 0.42, 0.16), S(0.22, 0.52, 0.2), stripe);
      g *= 0.88 + 0.24 * vnoise(p * vec2(40.0, 3.0)) * 0.6 + 0.1 * vnoise(p * 5.0);
      float lines = ln(p.y - gz, 0.12) * step(abs(p.x), 34.0);
      lines = max(lines, ln(abs(p.x) - 9.16, 0.12) * step(gz, p.y) * step(p.y, gz + 5.5));
      lines = max(lines, ln(p.y - gz - 5.5, 0.12) * step(abs(p.x), 9.16));
      lines = max(lines, ln(abs(p.x) - 20.16, 0.12) * step(gz, p.y) * step(p.y, gz + 16.5));
      g = mix(g, S(0.95, 0.96, 0.92), lines);
      // grass going dark beyond the pitch's edge, under the stands
      g = mix(g, S(0.08, 0.1, 0.12), step(p.y, gz - 6.0) + step(34.0, abs(p.x)));
      diffuseColor.rgb = g;
    }`,
  });
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), pitchMat);
  pitch.rotation.x = -Math.PI / 2; pitch.position.z = -80; pitch.receiveShadow = true; scene.add(pitch);

  /* ---- the goal: posts, crossbar and a net, rebuilt to fit the game's goal ---- */
  const netMat = shaderMat(U, {
    uniforms: { uBulge: { value: 0 }, uBX: { value: 0 } },
    vertex: /* glsl */ `uniform float uBulge; uniform float uBX; uniform float uTime; varying vec2 vP; varying float vD;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        float back = smoothstep(${(GOAL_Z - 0.2).toFixed(2)}, ${(GOAL_Z - NET_D).toFixed(2)}, w.z);
        w.z -= back * uBulge * 0.5 * exp(-pow(w.x - uBX, 2.0) * 0.8 - pow(w.y - 0.9, 2.0) * 1.2) * (0.6 + 0.4 * sin(uTime * 20.0));
        vP = position.xy * 7.0 + position.zz * 7.0; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragment: /* glsl */ `varying vec2 vP; varying float vD;
      void main() {
        vec2 d = abs(fract(vP) - 0.5); float w = fwidth(vP.x) * 0.7 + 0.03;
        float a = (1.0 - smoothstep(0.0, w, min(d.x, d.y) - 0.0)) * 0.75;
        if (a < 0.04) discard;
        gl_FragColor = vec4(vec3(0.95, 0.96, 1.0), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const postMat = new THREE.MeshStandardMaterial({ color: '#f6f7fa', roughness: 0.35, metalness: 0.1 });
  const goals = [0, 1].map(() => {
    const g = new THREE.Group();
    const post = new THREE.CylinderGeometry(0.06, 0.06, 1, 14); post.translate(0, 0.5, 0);
    const pl = new THREE.Mesh(post, postMat), pr = new THREE.Mesh(post, postMat), bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 14), postMat);
    bar.rotation.z = Math.PI / 2;
    for (const m of [pl, pr, bar]) m.castShadow = true;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 12, 12), netMat), top = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 8, 8), netMat), sideL = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 6, 6), netMat), sideR = sideL.clone();
    for (const m of [back, top, sideL, sideR]) m.renderOrder = 9;
    g.add(pl, pr, bar, back, top, sideL, sideR); scene.add(g);
    return { g, pl, pr, bar, back, top, sideL, sideR };
  });
  function fitGoals(info) {
    const b = info.play, halves = info.two ? [[0, 0.5], [0.5, 1]] : [[0, 1]];
    goals.forEach((G, i) => {
      const h = halves[i]; G.g.visible = !!h; if (!h) return;
      const [a, z] = h, L = b.x + b.w * (a + 0.04 * (z - a)), R = b.x + b.w * (z - 0.04 * (z - a)), T = b.y + b.h * 0.07;
      const x0 = info.rayAt(L, b.y + b.h * 0.5, GOAL_Z).x, x1 = info.rayAt(R, b.y + b.h * 0.5, GOAL_Z).x, top = Math.max(1.4, info.rayAt((L + R) / 2, T, GOAL_Z).y);
      const w = x1 - x0, cx = (x0 + x1) / 2;
      G.pl.position.set(x0, 0, GOAL_Z); G.pl.scale.y = top; G.pr.position.set(x1, 0, GOAL_Z); G.pr.scale.y = top;
      G.bar.position.set(cx, top, GOAL_Z); G.bar.scale.y = w + 0.12;
      G.back.position.set(cx, top * 0.45, GOAL_Z - NET_D); G.back.scale.set(w, top * 0.9, 1);
      const slope = Math.hypot(NET_D, top * 0.1);
      G.top.position.set(cx, top * 0.95, GOAL_Z - NET_D / 2); G.top.rotation.set(-Math.PI / 2 + Math.atan2(top * 0.1, NET_D), 0, 0); G.top.scale.set(w, slope, 1);
      for (const [m, x] of [[G.sideL, x0], [G.sideR, x1]]) { m.position.set(x, top * 0.47, GOAL_Z - NET_D / 2); m.rotation.y = Math.PI / 2; m.scale.set(NET_D, top * 0.94, 1); }
    });
  }

  /* ---- the stands, packed; the LED boards; the floodlights ---- */
  const props = propMat(U, { rough: 0.7, emitK: 2.4 });
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const tiers = [];
  for (let k = 0; k < 20; k++) tiers.push({ geo: B(90, 0.45, 0.95), color: k % 2 ? '#2b2f45' : '#323752', matrix: mat(0, 1.0 + k * 0.45, -12.5 - k * 0.9) });
  for (const sx of [-1, 1]) for (let k = 0; k < 16; k++) tiers.push({ geo: B(0.95, 0.45, 40), color: k % 2 ? '#2b2f45' : '#323752', matrix: mat(sx * (26 + k * 0.9), 1.0 + k * 0.45, -6) });
  tiers.push({ geo: B(92, 1.6, 0.4), color: '#1d2133', matrix: mat(0, 0.8, -11.8) });
  // the roof's edge over the far stand, its lights
  tiers.push({ geo: B(96, 0.6, 6), color: '#e8ecf4', matrix: mat(0, 14.5, -28) });
  scene.add(new THREE.Mesh(merge(tiers), props));
  const fans = crowd(U, [...stands(-44, 44, -12.6, 1.6, 20, { dz: -0.9, dy: 0.45, seed: 5 }), ...stands(-24, 13, 26, 1.6, 16, { dz: 0.9, dy: 0.45, axis: 'z', seed: 6 }), ...stands(-24, 13, -26, 1.6, 16, { dz: -0.9, dy: 0.45, axis: 'z', seed: 7 })], { size: 0.85, light: '#c8d0ff' });
  scene.add(fans.mesh);
  // LED boards along the goal line, the words scrolling
  const ledTex = canvasTex(2048, 128, (g, w, h) => {
    g.fillStyle = '#05060c'; g.fillRect(0, 0, w, h);
    const items = [['CAPRA LAB', '#29d3f0'], ['IRL', '#ffd23f'], ['SAVE IT!', '#5be38a'], ['GOAT GETAWAY', '#ff8a3d'], ['MIND HEIST', '#c77dff'], ['PAR-TEE TIME', '#ff3d8b']];
    g.font = `${Math.round(h * 0.7)}px Bangers, Impact, "Arial Black", sans-serif`; g.textBaseline = 'middle';
    let x = 20; for (let k = 0; k < 2; k++) for (const [t, c] of items) { g.fillStyle = c; g.fillText(t, x, h / 2 + 4); x += g.measureText(t).width + 90; }
  }, { repeat: true });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(60, 0.9), new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false }));
  led.position.set(0, 0.45, -8); ledTex.repeat.set(2, 1); scene.add(led);
  const ledSide = led.clone(); ledSide.material = led.material; ledSide.position.set(-22, 0.45, 0); ledSide.rotation.y = Math.PI / 2; scene.add(ledSide);
  const ledSide2 = ledSide.clone(); ledSide2.position.x = 22; ledSide2.rotation.y = -Math.PI / 2; scene.add(ledSide2);
  // floodlight towers, their banks of lamps glaring
  const towers = [];
  const towerAt = [[-34, -34], [34, -34], [-38, 20], [38, 20]];
  for (const [x, z] of towerAt) { towers.push({ geo: B(0.6, 30, 0.6), color: '#5a6070', matrix: mat(x, 15, z) }); towers.push({ geo: B(5, 3, 0.4), color: '#2a2e3a', matrix: mat(x, 31, z) }); }
  scene.add(new THREE.Mesh(merge(towers), props));
  const flood = [];
  for (const [x, z] of towerAt) for (let i = 0; i < 12; i++) flood.push([x - 2 + (i % 4) * 1.3, 30.2 + Math.floor(i / 4) * 0.9, z + 0.3, 0]);
  const glare = towerAt.map(([x, z]) => { const g = glow(U, '#eef2ff', 26, 0.6); g.position.set(x, 31, z + 0.5); scene.add(g); return g; });
  const lampDots = (() => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), flood.length);
    flood.forEach(([x, y, z], i) => m.setMatrixAt(i, mat(x, y, z))); return m;
  })();
  scene.add(lampDots);
  // a big screen over the far stand
  const screenTex = wordsTex([['CAPRA LAB', '#29d3f0'], ['KEEPER CAM', '#ffd23f']], { w: 512, h: 256, bg: '#0b0e1c', size: 0.36 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })); screen.position.set(-18, 18, -27.5); scene.add(screen);

  /* ---- flashes in the crowd, confetti, fireworks ---- */
  const flashes = bursts(U, { n: 160, shape: 'drop', grav: 0, drag: 0.001, blend: THREE.AdditiveBlending, order: 23 });
  const fireworks = bursts(U, { n: 500, shape: 'drop', grav: -2.5, drag: 0.9, blend: THREE.AdditiveBlending, order: 25 });
  scene.add(flashes.mesh, fireworks.mesh);
  let cheer = 0, groan = 0, bulge = 0;
  function photoFlashes(n) { for (let i = 0; i < n; i++) flashes.emit({ x: (Math.random() - 0.5) * 80, y: 2 + Math.random() * 9, z: -13 - Math.random() * 18 }, 1, { speed: 0, size: 0.6, life: 0.12 + Math.random() * 0.1, color: '#ffffff', spread: 0 }); }
  const roar = (ac, vol = 0.08) => rumble(ac, 0, 2.2, { lp: 1800, lp2: 500, vol, brown: false, attack: 0.25 });

  const place = {
    scene, fog, key, camH: 1.3, exposure: 1.0,
    pup: { tint: new THREE.Color(0.95, 0.96, 1.0), rim: new THREE.Color('#e8eeff').multiplyScalar(0.7), rimDir: [-0.7, 0.6], rim2: new THREE.Color('#e8eeff').multiplyScalar(0.45), rimDir2: [0.7, 0.6] },
    update(dt, t, info) {
      fitGoals(info);
      ledTex.offset.x = (t * 0.03) % 1;
      cheer = Math.max(0, cheer - dt * 0.5); groan = Math.max(0, groan - dt * 0.5); bulge = Math.max(0, bulge - dt * 0.8);
      fans.cheer.value = Math.min(1, cheer);
      netMat.uniforms.uBulge.value = bulge;
      if (cheer > 0.3 && Math.random() < cheer * 0.6) photoFlashes(2);
      if (Math.random() < 0.08) photoFlashes(1);
      glare.forEach((g, i) => { g.material.uniforms.uK.value = 0.55 + 0.03 * Math.sin(t * 2 + i); });
    },
    pulse(kind, at) {
      const p = at.pos || at.foot;
      if (kind === 'save' || kind === 'rep') { cheer = 1.4; if (at.ac) roar(at.ac); }
      else if (kind === 'goal') { bulge = 1.2; netMat.uniforms.uBX.value = p.x; groan = 1; if (at.ac) rumble(at.ac, 0, 1.6, { lp: 500, lp2: 200, vol: 0.06, brown: true, attack: 0.2 }); }
      if (kind === 'big') {
        cheer = 2;
        for (let k = 0; k < 4; k++) setTimeout(() => fireworks.emit({ x: (Math.random() - 0.5) * 50, y: 24 + Math.random() * 8, z: -30 - Math.random() * 8 }, 70, { speed: 6.5, sphere: true, size: 0.45, life: 1.7, colors: ['#ffd23f', '#29d3f0', '#ff3d8b', '#ffffff', '#5be38a'], spread: 0.2, jitter: 0.15 }), k * 380);
        if (at.ac) { roar(at.ac, 0.1); for (let k = 0; k < 4; k++) rumble(at.ac, 0.15 + k * 0.38, 0.8, { lp: 700, lp2: 80, vol: 0.1, attack: 0.005 }); }
      }
    },
    ambience(ac) {
      const murmur = noiseLoop(ac, { hp: 250, lp: 1600, gain: 0.03, swell: 0.5 });
      const low = noiseLoop(ac, { hp: 40, lp: 220, gain: 0.02, brown: true });
      return { stop() { murmur.stop(); low.stop(); } };
    },
    quality() {},
  };
  return place;
}
