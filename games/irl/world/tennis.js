/* Center court (Tennis Rally): a sunny afternoon in a tennis stadium, from behind your baseline. Blue hard court in
   its green surround, the lines, the net with its white tape and posts, the umpire's chair, sponsor boards, the
   stands all round, the scoreboard, a few gulls over the bowl. Your opponent is the game's (tennisOpp in scene.js),
   running to the ball and swinging; the ball is the game's too (coming in, bouncing, going back), fuzzy and
   yellow with its shadow. A return gets a ripple of applause, a winner the crowd up and a burst of confetti. */
import { THREE, rng, shaderMat, patchStandard, skyDome, bursts, glow, merge, mat, propMat, noiseLoop, rumble, crowd, stands, canvasTex, athletes } from './core.js';
import { tennisBall, tennisBack } from '../sports.mjs';
import { tennisOpp } from '../scene.js';

const CL = 23.77, D = 5.485, S = 4.115, NET = CL / 2;

export default function buildTennis(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2('#c8dcf0', 0.004);
  scene.fog = fog;
  const SUN = new THREE.Vector3(-0.4, 0.75, -0.5).normalize();
  U.uSun.value.copy(SUN);

  scene.add(skyDome(U, /* glsl */ `
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) { float h = d.y; vec3 col = mix(S(0.8, 0.9, 1.0), S(0.25, 0.52, 0.92), smoothstep(0.0, 0.5, h));
      vec2 uv = d.xz / max(h + 0.05, 0.03) * 0.45 + vec2(uTime * 0.005, 0.0);
      return mix(col, S(1.0, 1.0, 1.0), smoothstep(0.55, 0.78, fbm(uv)) * smoothstep(0.02, 0.15, h) * 0.85); }`));

  const hemi = new THREE.HemisphereLight('#d8e8ff', '#5a7a5a', 1.3);
  const key = new THREE.DirectionalLight('#fff4e0', 3.0); key.position.copy(SUN).multiplyScalar(40);
  scene.add(hemi, key);

  // the court: blue inside the doubles lines, green round it, the lines
  const courtMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.75 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      float ln(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.015, abs(d)); }`,
    diffuse: /* glsl */ `{
      vec2 p = vec2(vWP.x, -vWP.z);
      float inC = step(abs(p.x), ${D.toFixed(3)}) * step(0.0, p.y) * step(p.y, ${CL.toFixed(2)});
      vec3 c = mix(mix(S(0.2, 0.5, 0.36), S(0.24, 0.55, 0.4), vnoise(p * 2.0)), mix(S(0.16, 0.36, 0.72), S(0.2, 0.42, 0.78), vnoise(p * 3.0)), inC);
      c *= 0.94 + 0.08 * vnoise(p * 40.0);
      float L = 0.0, wl = 0.05;
      L = max(L, ln(abs(p.x) - ${D.toFixed(3)}, wl) * step(0.0, p.y) * step(p.y, ${CL.toFixed(2)}));
      L = max(L, ln(abs(p.x) - ${S.toFixed(3)}, wl) * step(0.0, p.y) * step(p.y, ${CL.toFixed(2)}));
      L = max(L, ln(p.y, 0.08) * step(abs(p.x), ${D.toFixed(3)})); L = max(L, ln(p.y - ${CL.toFixed(2)}, 0.08) * step(abs(p.x), ${D.toFixed(3)}));
      L = max(L, ln(abs(p.y - ${NET.toFixed(3)}) - 6.4, wl) * step(abs(p.x), ${S.toFixed(3)}));
      L = max(L, ln(p.x, wl) * step(abs(p.y - ${NET.toFixed(3)}), 6.4));
      L = max(L, ln(p.x, wl) * (step(abs(p.y), 0.15) + step(abs(p.y - ${CL.toFixed(2)}), 0.15)));
      diffuseColor.rgb = mix(c, S(0.96, 0.96, 0.95), L);
    }`,
  });
  const court = new THREE.Mesh(new THREE.PlaneGeometry(40, 56), courtMat);
  court.rotation.x = -Math.PI / 2; court.position.z = -NET; scene.add(court);

  /* ---- the net, the posts, the umpire's chair, sponsor boards, the stands and their crowd ---- */
  const netMat = shaderMat(U, {
    vertex: /* glsl */ `varying vec2 vP; varying float vY; void main() { vP = position.xy * 18.0; vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `varying vec2 vP; varying float vY;
      void main() { vec2 d = abs(fract(vP) - 0.5); float w = fwidth(vP.x) * 0.6 + 0.04; float a = (1.0 - smoothstep(0.0, w, min(d.x, d.y))) * 0.8;
        if (vY > 0.93) { gl_FragColor = vec4(vec3(0.97), 1.0); } else { if (a < 0.05) discard; gl_FragColor = vec4(vec3(0.08, 0.08, 0.1), a); }
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const netGeo = new THREE.PlaneGeometry(2 * D + 1.0, 1.0, 20, 1);
  { const p = netGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), top = p.getY(i) > 0; p.setY(i, top ? 0.914 + (Math.abs(x) / (D + 0.5)) * 0.156 : 0); } }
  const net = new THREE.Mesh(netGeo, netMat); net.position.z = -NET; net.renderOrder = 9; scene.add(net);
  const props = propMat(U, { rough: 0.55, emitK: 2 });
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
  const park = [
    { geo: C(0.05, 0.05, 1.07), color: '#2a5a3a', matrix: mat(-D - 0.5, 0.535, -NET) }, { geo: C(0.05, 0.05, 1.07), color: '#2a5a3a', matrix: mat(D + 0.5, 0.535, -NET) },
    // the umpire's chair
    { geo: B(0.08, 2.0, 0.08), color: '#1f4a2e', matrix: mat(-7.2, 1.0, -NET - 0.3) }, { geo: B(0.08, 2.0, 0.08), color: '#1f4a2e', matrix: mat(-7.8, 1.0, -NET - 0.3) },
    { geo: B(0.08, 2.0, 0.08), color: '#1f4a2e', matrix: mat(-7.2, 1.0, -NET + 0.3) }, { geo: B(0.08, 2.0, 0.08), color: '#1f4a2e', matrix: mat(-7.8, 1.0, -NET + 0.3) },
    { geo: B(0.8, 0.12, 0.8), color: '#1f4a2e', matrix: mat(-7.5, 2.0, -NET) }, { geo: B(0.8, 0.7, 0.08), color: '#1f4a2e', matrix: mat(-7.9, 2.4, -NET) },
    { geo: B(0.5, 0.5, 0.35), color: '#f4f4f4', matrix: mat(-7.45, 2.35, -NET) }, { geo: new THREE.SphereGeometry(0.16, 10, 8), color: '#cf935f', matrix: mat(-7.45, 2.82, -NET) },
    // the walls round the court, the boards on them
    { geo: B(30, 1.2, 0.2), color: '#1f4a3a', matrix: mat(0, 0.6, -(CL + 6.6)) }, { geo: B(30, 1.2, 0.2), color: '#1f4a3a', matrix: mat(0, 0.6, 6.4) },
    { geo: B(0.2, 1.2, 36), color: '#1f4a3a', matrix: mat(-11.4, 0.6, -NET) }, { geo: B(0.2, 1.2, 36), color: '#1f4a3a', matrix: mat(11.4, 0.6, -NET) },
  ];
  for (let k = 0; k < 20; k++) {
    park.push({ geo: B(34, 0.5, 0.9), color: k % 2 ? '#e8e2d4' : '#d8d0c0', matrix: mat(0, 1.4 + k * 0.5, -(CL + 7.2 + k * 0.9)) });
    for (const sx of [-1, 1]) park.push({ geo: B(0.9, 0.5, 40), color: k % 2 ? '#e8e2d4' : '#d8d0c0', matrix: mat(sx * (12 + k * 0.9), 1.4 + k * 0.5, -NET) });
  }
  park.push({ geo: B(10, 4.4, 0.5), color: '#1a2a20', matrix: mat(0, 13.5, -(CL + 26)) });
  scene.add(new THREE.Mesh(merge(park), props));
  const boardTex = canvasTex(2048, 96, (g, w, h) => { g.fillStyle = '#1f4a3a'; g.fillRect(0, 0, w, h); g.font = `${Math.round(h * 0.68)}px Bangers, Impact, sans-serif`; g.textBaseline = 'middle'; let x = 30; for (let k = 0; k < 3; k++) for (const t of ['CAPRA LAB', 'IRL', 'RALLY']) { g.fillStyle = '#fff8ec'; g.fillText(t, x, h / 2 + 3); x += g.measureText(t).width + 120; } }, { repeat: true });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 1.0), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.6 })); back.position.set(0, 0.6, -(CL + 6.48)); scene.add(back);
  const sbTex = canvasTex(512, 220, (g, w, h) => { g.fillStyle = '#0a140e'; g.fillRect(0, 0, w, h); g.font = `${Math.round(h * 0.22)}px Bangers, Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.fillText('CENTER COURT', w / 2, h * 0.25); g.font = `800 ${Math.round(h * 0.16)}px Inter, Arial, sans-serif`; g.fillStyle = '#fff8ec'; g.textAlign = 'left'; g.fillText('YOU', 40, h * 0.55); g.fillText('CPU', 40, h * 0.8); g.textAlign = 'right'; g.fillText('6  4  15', w - 40, h * 0.55); g.fillText('3  4  30', w - 40, h * 0.8); });
  const sb = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 4.0), new THREE.MeshBasicMaterial({ map: sbTex, toneMapped: false })); sb.position.set(0, 13.5, -(CL + 25.7)); scene.add(sb);
  const fans = crowd(U, [...stands(-16, 16, -(CL + 7.2), 2.1, 20, { dz: -0.9, dy: 0.5, step: 0.6, seed: 41 }), ...stands(-30, 6, 12, 2.1, 20, { dz: 0.9, dy: 0.5, axis: 'z', step: 0.6, seed: 42 }), ...stands(-30, 6, -12, 2.1, 20, { dz: -0.9, dy: 0.5, axis: 'z', step: 0.6, seed: 43 })], { size: 0.85, light: '#ffffff' });
  scene.add(fans.mesh);

  /* ---- the opponent and their racket, the ball and its shadow ---- */
  const opp = athletes(U, 1, { helmet: false }); scene.add(opp.group);
  const racket = new THREE.Group(); scene.add(racket);
  racket.add(new THREE.Mesh(merge([
    { geo: C(0.015, 0.015, 0.32, 6), color: '#e8322e', matrix: mat(0, 0.16, 0) },
    { geo: new THREE.TorusGeometry(0.15, 0.012, 6, 20), color: '#1d1d24', matrix: mat(0, 0.47, 0, 0, 0, 0, [1, 1.3, 1]) },
  ]), props));
  const ballMat = patchStandard(new THREE.MeshStandardMaterial({ color: '#d9f24a', roughness: 0.9 }), U, {
    vdecl: 'varying vec3 vLoc;', vertex: 'vLoc = normalize(position);', decl: 'varying vec3 vLoc;',
    diffuse: 'float seam = abs(vLoc.z - 0.45 * sin(atan(vLoc.y, vLoc.x) * 2.0)); diffuseColor.rgb = mix(vec3(0.96), diffuseColor.rgb, smoothstep(0.03, 0.07, seam));',
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), ballMat); scene.add(ball);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.09, 14), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 2; scene.add(shadow);
  // gulls over the bowl
  const gulls = new THREE.Group(); scene.add(gulls);
  const gullGeo = new THREE.BufferGeometry(); gullGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.2, -0.8, 0.1, 0, 0, 0, -0.2, 0, 0, 0.2, 0, 0, -0.2, 0.8, 0.1, 0], 3)); gullGeo.computeVertexNormals();
  const gullList = [0, 1, 2].map((i) => { const m = new THREE.Mesh(gullGeo, new THREE.MeshBasicMaterial({ color: '#f4f4f4', side: THREE.DoubleSide })); gulls.add(m); return { m, ph: i * 2.1 }; });
  const confetti = bursts(U, { n: 200, shape: 'petal', grav: -1.8, drag: 1.6 });
  scene.add(confetti.mesh);
  let cheer = 0;

  const place = {
    scene, fog, sport: true, exposure: 1.0,
    pup: { tint: new THREE.Color(1, 1, 1), rim: new THREE.Color(0, 0, 0), rimDir: [0, 1] },
    update(dt, t) {
      cheer = Math.max(0, cheer - dt * 0.5); fans.cheer.value = Math.min(1, cheer);
      boardTex.offset.x = (t * 0.02) % 1;
      gullList.forEach((g) => { const a = t * 0.25 + g.ph; g.m.position.set(Math.cos(a) * 18, 22 + Math.sin(a * 2) * 2, -NET - 10 + Math.sin(a) * 12); g.m.rotation.y = -a; g.m.scale.y = 1 + Math.sin(t * 6 + g.ph) * 0.6; });
    },
    view(v, now) {
      const c = v.c, bk = c && c.back, bl = c && c.ball;
      const ox = tennisOpp(c, now), swingNow = bl && now - bl.born < 220, moving = !!bk;
      opp.set(0, { x: ox, z: -(CL + 0.8), face: 0, run: moving ? now / 1000 : 0, color: '#ff3d8b', pants: '#f4f4f4', skin: '#cf935f', helmet: false, swing: swingNow ? 1 : 0.2 });
      opp.commit();
      racket.position.set(ox + 0.42, 1.25, -(CL + 0.8) + 0.1); racket.rotation.set(0, 0, swingNow ? -1.6 : -0.4);
      let bp = null;
      if (bl) bp = tennisBall(bl, now); else if (bk) bp = tennisBack(bk, now);
      ball.visible = shadow.visible = !!bp;
      if (bp) { ball.position.set(bp.x, Math.max(0.07, bp.y), -bp.z); ball.rotation.x = now / 90; shadow.position.set(bp.x, 0.006, -bp.z); shadow.material.opacity = Math.max(0.08, 0.4 - bp.y * 0.12); }
    },
    pulse(kind, at) {
      cheer = kind === 'big' ? 2 : 0.8;
      if (kind === 'big') confetti.emit({ x: 0, y: 3, z: -NET }, 60, { speed: 3, up: 0.6, size: 0.08, life: 2.5, colors: ['#ffd23f', '#ff3d8b', '#29d3f0', '#ffffff'], spread: 4 });
      if (at.ac) rumble(at.ac, 0, kind === 'big' ? 2.2 : 1.1, { lp: 2400, lp2: 900, vol: kind === 'big' ? 0.08 : 0.035, brown: false, attack: kind === 'big' ? 0.15 : 0.05 });
    },
    ambience(ac) {
      const murmur = noiseLoop(ac, { hp: 300, lp: 1400, gain: 0.014, swell: 0.4 });
      return { stop() { murmur.stop(); } };
    },
    quality() {},
  };
  void rng; void glow;
  return place;
}
