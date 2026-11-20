/* The bowling alley (Bowling): cosmic bowling. A glossy maple lane that mirrors the pins and the ball, arrows and
   dots, the foul line, neon running down the gutters, lanes either side with their own pins, a glowing CAPRA LANES
   masking unit over the pins, a mirror ball throwing colored spots that drift over the lanes, star murals under
   blacklight. The pins and the ball are the game's own (sports.mjs bowlSim), seen through scene.js's camera
   behind the foul line; each player of two gets their own lane's state. A strike flashes the lights and showers
   confetti over the pins, a spare a smaller burst. Sport coordinates (x across, z down the lane) are three's
   (x, y, -z). */
import { THREE, rng, NOISE, shaderMat, patchStandard, bursts, glow, merge, mat, propMat, noiseLoop, rumble, canvasTex, bulbs, panel } from './core.js';

const L = { w: 1.05, len: 18.29, gutter: 0.24, ballR: 0.109, rowDz: 0.264, pinGap: 0.3048, deck: 1.0 };
const NEON = ['#ff3d8b', '#29d3f0', '#c77dff', '#5be38a', '#ffd23f'];

function pinGeometry() {
  const prof = [[0, 0], [0.026, 0], [0.042, 0.03], [0.058, 0.1], [0.06, 0.13], [0.052, 0.18], [0.034, 0.235], [0.029, 0.26], [0.031, 0.29], [0.036, 0.32], [0.032, 0.35], [0.02, 0.372], [0, 0.381]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  const p = g.attributes.position, cols = [];
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), red = (y > 0.24 && y < 0.255) || (y > 0.268 && y < 0.283); cols.push(...(red ? [0.85, 0.08, 0.06] : [1, 1, 1])); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return g;
}

export default function buildBowling(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const r = rng(111);
  const fog = new THREE.FogExp2('#0d0820', 0.02);
  scene.fog = fog;
  scene.background = new THREE.Color('#06040e');
  const BX = { uSpots: { value: 1 }, uFlash: U.uFlash };

  const hemi = new THREE.HemisphereLight('#6a5aff', '#1a0a2a', 0.7);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(0.6, 6, -14); key.target.position.set(0, 0, -19);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.5, bottom: -2.5, near: 1, far: 20 });
  key.shadow.mapSize.setScalar(1024); key.shadow.bias = -0.0004; key.shadow.radius = 3;
  const deckLight = new THREE.PointLight('#f0f4ff', 8, 6, 1.5); deckLight.position.set(0, 1.4, -18.4);
  const lanePink = new THREE.PointLight('#ff3d8b', 3, 10, 1.4); lanePink.position.set(-2, 1.5, -6);
  const laneCyan = new THREE.PointLight('#29d3f0', 3, 10, 1.4); laneCyan.position.set(2, 1.5, -10);
  scene.add(hemi, key, key.target, deckLight, lanePink, laneCyan);

  /* ---- the lanes: maple boards (ours glossy enough to mirror), arrows, dots, the foul line, gutters ---- */
  const laneMat = (ours) => patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.18, metalness: 0, transparent: ours, opacity: ours ? 0.72 : 1 }), U, {
    uniforms: BX,
    decl: /* glsl */ `uniform float uSpots; vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }`,
    diffuse: /* glsl */ `{
      vec2 p = vWP.xz; float lx = p.x - (${ours ? '0.0' : 'floor((p.x + 0.815) / 1.63) * 1.63'});
      float z = -p.y;
      float board = floor((lx + 0.525) / (1.05 / 39.0));
      vec3 wood = mix(S(0.86, 0.66, 0.42), S(0.95, 0.76, 0.5), h21(vec2(board, floor(z / 2.4))));
      wood *= 0.9 + 0.12 * vnoise(vec2(board * 3.0, z * 4.0));
      wood = mix(wood, S(0.55, 0.38, 0.22), (1.0 - smoothstep(0.0, 0.08, fract((lx + 0.525) / (1.05 / 39.0)))) * 0.35);
      if (z < 0.0) wood *= 0.78;                                      // the approach
      if (z > ${(L.len - 0.4).toFixed(2)}) wood = mix(wood, S(0.98, 0.94, 0.86), 0.4);   // the pin deck
      // the foul line, the arrows, the dots
      wood = mix(wood, S(0.85, 0.1, 0.12), step(abs(z), 0.03));
      for (int i = -3; i <= 3; i++) { float ax = float(i) * 0.12, az = 4.6 + abs(float(i)) * 0.3; vec2 q = vec2(lx - ax, z - az); if (q.y > 0.0 && q.y < 0.2 && abs(q.x) < 0.025 * (1.0 - q.y / 0.2)) wood = S(0.1, 0.55, 0.85); }
      for (int i = -2; i <= 2; i++) if (length(vec2(lx - float(i) * 0.15, z - 2.1)) < 0.012) wood = S(0.4, 0.25, 0.15);
      // the mirror ball's spots drifting over the boards
      vec2 sp = vec2(lx * 3.0 + uTime * 0.25, z * 0.6 - uTime * 0.4); vec2 cell = floor(sp), f = fract(sp) - 0.5;
      float spot = (1.0 - smoothstep(0.08, 0.14, length(f))) * step(0.6, h21(cell)) * uSpots;
      vec3 sc = h21(cell + 4.0) < 0.33 ? vec3(1.0, 0.3, 0.7) : h21(cell + 4.0) < 0.66 ? vec3(0.3, 0.9, 1.0) : vec3(0.8, 0.5, 1.0);
      wood += sc * spot * 0.35;
      diffuseColor.rgb = wood;
    }`,
  });
  const ourLane = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.len + L.deck + 1.2), laneMat(true));
  ourLane.rotation.x = -Math.PI / 2; ourLane.position.set(0, 0, -(L.len + L.deck - 1.2) / 2); ourLane.receiveShadow = true; ourLane.renderOrder = 4;
  scene.add(ourLane);
  // the lanes either side (left and right of ours and its gutters, so ours mirrors what's under it)
  const otherMat = laneMat(false), ow = 1.63 * 2.5 - 0.77;
  for (const sx of [-1, 1]) { const o = new THREE.Mesh(new THREE.PlaneGeometry(ow, L.len + L.deck + 1.2), otherMat); o.rotation.x = -Math.PI / 2; o.position.set(sx * (0.77 + ow / 2), -0.002, -(L.len + L.deck - 1.2) / 2); scene.add(o); }
  const props = propMat(U, { rough: 0.35, emitK: 3 });
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
  const alley = [];
  for (const off of [-3.26, -1.63, 0, 1.63, 3.26]) {
    for (const s of [-1, 1]) {
      const gx = off + s * (L.w / 2 + L.gutter / 2);
      alley.push({ geo: new THREE.CylinderGeometry(L.gutter / 2, L.gutter / 2, L.len + L.deck, 10, 1, true, Math.PI / 2, Math.PI), color: '#2a2438', matrix: mat(gx, 0.0, -(L.len + L.deck) / 2, Math.PI / 2, 0, 0) });
      // neon strips along the gutter's outer edge
      alley.push({ geo: B(0.025, 0.025, L.len), color: NEON[(Math.round(off / 1.63) + 5 + (s > 0 ? 1 : 0)) % 5], matrix: mat(off + s * (L.w / 2 + L.gutter + 0.03), 0.03, -L.len / 2), emit: 1.6 });
    }
    // the divider capping between lanes
    alley.push({ geo: B(0.08, 0.06, L.len + L.deck), color: '#3a3448', matrix: mat(off + L.w / 2 + L.gutter + 0.07, 0.03, -(L.len + L.deck) / 2) });
    // the pit behind the deck, dark
    alley.push({ geo: B(1.6, 0.9, 0.05), color: '#05030a', matrix: mat(off, 0.3, -(L.len + L.deck + 0.4)) });
    // ball returns between lanes on the approach
    if (off < 3) alley.push({ geo: new THREE.SphereGeometry(0.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), color: NEON[(Math.round(off / 1.63) + 7) % 5], matrix: mat(off + 0.815, 0, 1.6, 0, 0, 0, [0.5, 0.7, 1.2]) });
  }
  // the masking unit over the pins: a long panel, a lane number over each
  alley.push({ geo: B(9, 1.3, 0.4), color: '#120a24', matrix: mat(0, 1.45, -(L.len + 0.95)) });
  scene.add(new THREE.Mesh(merge(alley), props));
  const maskTex = canvasTex(2048, 300, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); NEON.forEach((c, i) => gr.addColorStop(i / 4, c));
    g.fillStyle = '#0a0518'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.fillStyle = NEON[i % 5]; g.globalAlpha = 0.5; g.beginPath(); g.arc((i * 233) % w, (i * 97) % h, 2 + (i % 4), 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1; g.font = `${Math.round(h * 0.42)}px Bangers, Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff3d8b'; g.shadowBlur = 30; g.fillStyle = gr; g.fillText('CAPRA LANES', w / 2, h * 0.42);
    g.shadowBlur = 0; g.font = `800 ${Math.round(h * 0.13)}px Inter, Arial, sans-serif`; g.fillStyle = '#fff8ec';
    for (let k = 0; k < 5; k++) g.fillText(String(11 + k), w * (0.1 + k * 0.2), h * 0.82);
  });
  const mask = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), new THREE.MeshBasicMaterial({ map: maskTex, toneMapped: false }));
  mask.position.set(0, 1.45, -(L.len + 0.74)); scene.add(mask);
  // the walls: star murals under blacklight, and the ceiling's tubes
  const muralTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#0a0620'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { g.fillStyle = NEON[i % 5]; g.globalAlpha = 0.3 + (i % 3) * 0.2; g.beginPath(); g.arc((i * 131) % w, (i * 71) % h, 1 + (i % 5), 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 0.85;
    for (const [x, y, rad, c] of [[150, 120, 60, '#c77dff'], [520, 90, 40, '#29d3f0'], [820, 150, 70, '#ff3d8b']]) { g.strokeStyle = c; g.lineWidth = 6; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(x, y, rad * 1.7, rad * 0.35, -0.3, 0, Math.PI * 2); g.stroke(); }
  }, { repeat: true });
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 4), new THREE.MeshBasicMaterial({ map: muralTex, toneMapped: false })); muralTex.repeat.set(3, 1); m.position.set(sx * 4.4, 2, -9); m.rotation.y = -sx * Math.PI / 2; scene.add(m); }
  const tubes = []; for (let z = 0; z > -20; z -= 2.5) for (const x of [-2.4, 0, 2.4]) tubes.push([x, 3.2, z, (Math.abs(z / 2.5) + x) % 5]);
  scene.add(bulbs(U, tubes, ['#8a5aff', '#c77dff'], { size: 0.5, strength: 0.6 }));
  // the mirror ball, turning
  const mball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 3), new THREE.MeshStandardMaterial({ color: '#dfe6f0', metalness: 1, roughness: 0.15, flatShading: true, emissive: '#3a3a60' }));
  mball.position.set(0.8, 3.0, -8); scene.add(mball);
  const ballGlow = glow(U, '#c7b8ff', 2.2, 0.35); ballGlow.position.copy(mball.position); scene.add(ballGlow);

  /* ---- the pins and the ball: the game's, mirrored in our lane ---- */
  const pinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, emissive: '#2a2a40' });
  const pinGeo = pinGeometry();
  const pins = [], mirrors = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(pinGeo, pinMat); m.castShadow = true; scene.add(m); pins.push(m);
    const mm = new THREE.Mesh(pinGeo, pinMat); mm.scale.y = -1; scene.add(mm); mirrors.push(mm);
  }
  // the neighbors' pins, standing far off
  {
    const n = 40, inst = new THREE.InstancedMesh(pinGeo, pinMat, n); let k = 0;
    for (const off of [-3.26, -1.63, 1.63, 3.26]) for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) inst.setMatrixAt(k++, mat(off + (i - row / 2) * L.pinGap, 0, -(L.len + row * L.rowDz)));
    scene.add(inst);
  }
  const ballMat = patchStandard(new THREE.MeshStandardMaterial({ color: '#c77dff', roughness: 0.12, metalness: 0.1 }), U, {
    vdecl: 'varying vec3 vLoc;', vertex: 'vLoc = position / ' + L.ballR.toFixed(3) + ';', decl: 'varying vec3 vLoc;',
    diffuse: /* glsl */ `{
      vec3 q = normalize(vLoc);
      float swirl = vnoise(q.xy * 3.0 + vnoise(q.yz * 4.0) * 2.0);
      diffuseColor.rgb = mix(diffuseColor.rgb * 0.45, diffuseColor.rgb * 1.2, smoothstep(0.35, 0.7, swirl));
      for (int i = 0; i < 3; i++) { vec3 h = normalize(i == 0 ? vec3(-0.18, 0.95, -0.3) : i == 1 ? vec3(0.16, 0.95, -0.32) : vec3(0.0, 0.97, -0.05)); if (dot(q, h) > 0.996) diffuseColor.rgb = vec3(0.02); }
    }`,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(L.ballR, 28, 18), ballMat); ball.castShadow = true; scene.add(ball);
  const ballMirror = new THREE.Mesh(ball.geometry, ballMat); ballMirror.scale.y = -1; scene.add(ballMirror);
  const up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3(), q = new THREE.Quaternion();

  const confetti = bursts(U, { n: 260, shape: 'petal', grav: -2, drag: 1.6 });
  scene.add(confetti.mesh);
  let flash = 0;

  const place = {
    scene, fog, key, sport: true, exposure: 1.1,
    pup: { tint: new THREE.Color(1, 1, 1), rim: new THREE.Color(0, 0, 0), rimDir: [0, 1] },
    update(dt, t) {
      mball.rotation.y = t * 0.6;
      flash = Math.max(0, flash - dt * 1.5);
      U.uFlash.value = flash * (0.5 + 0.5 * Math.sin(t * 30));
      hemi.intensity = 0.7 + flash * 2;
      BX.uSpots.value = 1 + flash * 3;
    },
    // one player's lane: their pins and ball
    view(v) {
      const c = v.c, list = c ? c.pins : [];
      for (let i = 0; i < 10; i++) {
        const p = list[i], m = pins[i], mm = mirrors[i];
        m.visible = mm.visible = !!(p && !p.gone);
        if (!m.visible) continue;
        m.position.set(p.x, 0, -p.z); mm.position.set(p.x, 0, -p.z);
        if (p.down && p.tip) {
          const dx = p.tx || 0, dz = -(p.tz ?? 1), d = Math.hypot(dx, dz) || 1;
          axis.set(dz / d, 0, -dx / d); q.setFromAxisAngle(axis, Math.min(1, p.tip) * Math.PI / 2 * 0.98);
          m.quaternion.copy(q); m.position.y = Math.sin(Math.min(1, p.tip) * Math.PI / 2) * 0.06;
        } else m.quaternion.identity();
        mm.quaternion.copy(m.quaternion); mm.quaternion.x *= -1; mm.quaternion.z *= -1; mm.position.y = -m.position.y;
      }
      const b = c && c.ball;
      ball.visible = ballMirror.visible = !!(b && !b.gone);
      if (ball.visible) {
        ball.position.set(b.x, L.ballR + (b.gutter ? -0.06 : 0), -b.z); ball.rotation.set(-(b.spin || 0), 0, 0);
        ballMirror.position.set(b.x, -L.ballR, -b.z); ballMirror.rotation.copy(ball.rotation);
        ballMat.color.set(v.color || '#c77dff');
      }
    },
    pulse(kind) {
      const p = { x: 0, y: 1.0, z: -(L.len + 0.3) };
      if (kind === 'big') { flash = 1.2; confetti.emit(p, 60, { speed: 2.4, up: 0.5, size: 0.06, life: 2.2, colors: NEON, spread: 1.2 }); }
      else if (kind === 'rep') { flash = 0.5; confetti.emit(p, 25, { speed: 1.8, up: 0.5, size: 0.05, life: 1.8, colors: NEON, spread: 0.8 }); }
    },
    ambience(ac) {
      const hum = noiseLoop(ac, { hp: 60, lp: 500, gain: 0.02, brown: true, swell: 0.3 });
      let alive = true, tm = 0;
      const crash = () => { if (!alive) return; rumble(ac, 0, 1.4, { lp: 260, lp2: 60, vol: 0.02, attack: 0.9 }); rumble(ac, 1.3, 0.5, { lp: 2500, lp2: 500, vol: 0.012, brown: false, attack: 0.005 }); tm = setTimeout(crash, 6000 + Math.random() * 8000); };
      tm = setTimeout(crash, 3000);
      return { stop() { alive = false; clearTimeout(tm); hum.stop(); } };
    },
    quality() {},
  };
  return place;
}
