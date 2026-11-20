/* The football stadium (QB Throw): a night game under the floodlights, from behind the quarterback. The field mowed in
   five-yard stripes, the yard lines and numbers, the hash marks, the line of scrimmage glowing, the end zone with
   CAPRA in it, the goal posts, stands packed on three sides, the scoreboard. Your linemen and receivers (your
   color) and theirs (dark) are the game's: routes and coverage from sports.mjs, run out in 3D, legs going. The
   football flies its arc. A catch brings the crowd up, a touchdown sets off fireworks. */
import { THREE, rng, NOISE, shaderMat, patchStandard, skyDome, bursts, glow, merge, mat, propMat, noiseLoop, rumble, crowd, stands, canvasTex, athletes, STARS } from './core.js';
import { routeAt, defenderAt } from '../sports.mjs';

const HALF = 26.65;

export default function buildQB(env) {
  const { U } = env;
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2('#141c38', 0.006);
  scene.fog = fog;

  scene.add(skyDome(U, /* glsl */ `${STARS}
    vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
    vec3 sky(vec3 d) { float h = d.y; return mix(S(0.25, 0.3, 0.48), S(0.02, 0.03, 0.09), smoothstep(0.0, 0.45, h)) + vec3(0.8) * stars(d) * smoothstep(0.3, 0.7, h) * 0.5; }`));

  const hemi = new THREE.HemisphereLight('#b8c4ff', '#24402a', 1.1);
  const key = new THREE.DirectionalLight('#f4f6ff', 2.2); key.position.set(-30, 40, 20);
  const fill = new THREE.DirectionalLight('#e0e8ff', 1.2); fill.position.set(30, 35, -10);
  scene.add(hemi, key, fill);

  // the field: stripes, yard lines every five, hash marks, the sidelines; the end zone (z 30..40) is purple
  const fieldMat = patchStandard(new THREE.MeshStandardMaterial({ roughness: 0.92 }), U, {
    decl: /* glsl */ `vec3 S(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }
      float ln(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.03, abs(d)); }`,
    diffuse: /* glsl */ `{
      vec2 p = vec2(vWP.x, -vWP.z);
      float inF = step(abs(p.x), ${HALF.toFixed(2)});
      vec3 g = mix(S(0.2, 0.5, 0.24), S(0.25, 0.58, 0.28), step(0.5, fract(p.y / 10.0 + 0.5)));
      g *= 0.9 + 0.2 * vnoise(p * vec2(30.0, 2.0)) * 0.5 + 0.08 * vnoise(p * 4.0);
      float ez = step(30.0, p.y) * step(p.y, 40.0);
      g = mix(g, mix(S(0.42, 0.2, 0.6), S(0.48, 0.24, 0.66), vnoise(p * 3.0)), ez);
      float lines = ln(fract(p.y / 5.0 + 0.5) * 5.0 - 2.5, 0.12) * step(-15.0, p.y) * step(p.y, 30.01);
      lines = max(lines, ln(abs(p.x) - ${HALF.toFixed(2)}, 0.2) * step(-20.0, p.y) * step(p.y, 40.0));
      lines = max(lines, ln(p.y - 40.0, 0.2) * inF);
      lines = max(lines, ln(abs(p.x) - 3.1, 0.06) * ln(fract(p.y + 0.5) - 0.5, 0.8) * step(p.y, 30.0) * step(-15.0, p.y) * (1.0 - step(0.6, abs(fract(p.y + 0.5) - 0.5)) ));
      g = mix(g, S(0.96, 0.96, 0.94), lines * (inF + ln(abs(p.x) - ${HALF.toFixed(2)}, 0.2)));
      // beyond the sidelines: the bench area, then the track
      g = mix(g, S(0.18, 0.36, 0.2), step(${(HALF + 0.2).toFixed(2)}, abs(p.x)) * step(abs(p.x), 32.0));
      g = mix(g, S(0.55, 0.22, 0.2), step(32.0, abs(p.x)) + step(43.0, p.y) * (1.0 - step(32.0, abs(p.x))));
      diffuseColor.rgb = g;
    }`,
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), fieldMat);
  field.rotation.x = -Math.PI / 2; field.position.z = -40; scene.add(field);
  // the numbers on the field, CAPRA in the end zone, the scrimmage line glowing
  const numTex = (n) => canvasTex(256, 160, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = `${Math.round(h * 0.9)}px Bangers, Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f6f6f2'; g.fillText(n, w / 2, h / 2 + 6); });
  for (const z of [10, 20]) for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), new THREE.MeshStandardMaterial({ map: numTex(String(z)), transparent: true, roughness: 0.9 })); m.rotation.x = -Math.PI / 2; m.rotation.z = sx > 0 ? Math.PI / 2 : -Math.PI / 2; m.position.set(sx * 15, 0.01, -z); scene.add(m); }
  const ezTex = canvasTex(1024, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = `${Math.round(h * 0.8)}px Bangers, Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 14; g.strokeStyle = '#2a1040'; g.strokeText('C A P R A', w / 2, h / 2 + 8); g.fillStyle = '#ffd23f'; g.fillText('C A P R A', w / 2, h / 2 + 8); });
  const ez = new THREE.Mesh(new THREE.PlaneGeometry(36, 9), new THREE.MeshStandardMaterial({ map: ezTex, transparent: true, roughness: 0.9 })); ez.rotation.x = -Math.PI / 2; ez.position.set(0, 0.01, -35); scene.add(ez);
  const scrim = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 0.22), new THREE.MeshBasicMaterial({ color: '#29d3f0', toneMapped: false, transparent: true, opacity: 0.9 })); scrim.rotation.x = -Math.PI / 2; scrim.position.set(0, 0.012, 0); scene.add(scrim);

  /* ---- goal posts, pylons, the stands and their crowd, floodlights, the scoreboard ---- */
  const props = propMat(U, { rough: 0.5, emitK: 2.4 });
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
  const park = [
    { geo: C(0.15, 0.15, 3.0), color: '#ffd23f', matrix: mat(0, 1.5, -41.2) },
    { geo: C(0.12, 0.12, 1.3), color: '#ffd23f', matrix: mat(0, 3.0, -40.6, Math.PI / 2) },
    { geo: C(0.1, 0.1, 5.64), color: '#ffd23f', matrix: mat(0, 3.0, -40, 0, 0, Math.PI / 2) },
    { geo: C(0.08, 0.08, 9), color: '#ffd23f', matrix: mat(-2.82, 7.5, -40) },
    { geo: C(0.08, 0.08, 9), color: '#ffd23f', matrix: mat(2.82, 7.5, -40) },
  ];
  for (const [x, z] of [[-HALF, -30], [HALF, -30], [-HALF, -40], [HALF, -40]]) park.push({ geo: B(0.12, 0.45, 0.12), color: '#ff8a3d', matrix: mat(x, 0.22, z) });
  for (let k = 0; k < 18; k++) {
    park.push({ geo: B(0.95, 0.5, 70), color: k % 2 ? '#262a40' : '#2e3350', matrix: mat(-(34 + k * 0.95), 1.2 + k * 0.5, -12) });
    park.push({ geo: B(0.95, 0.5, 70), color: k % 2 ? '#262a40' : '#2e3350', matrix: mat(34 + k * 0.95, 1.2 + k * 0.5, -12) });
    park.push({ geo: B(70, 0.5, 0.95), color: k % 2 ? '#262a40' : '#2e3350', matrix: mat(0, 1.2 + k * 0.5, -(45 + k * 0.95)) });
  }
  park.push({ geo: B(18, 7, 0.6), color: '#101420', matrix: mat(0, 17, -63) });
  const towers = [[-45, 30], [45, 30], [-45, -55], [45, -55]];
  for (const [x, z] of towers) { park.push({ geo: B(0.8, 34, 0.8), color: '#5a6070', matrix: mat(x, 17, -z) }); park.push({ geo: B(6, 3.4, 0.5), color: '#2a2e3a', matrix: mat(x, 35, -z) }); }
  scene.add(new THREE.Mesh(merge(park), props));
  const glare = towers.map(([x, z]) => { const g = glow(U, '#eef2ff', 34, 0.6); g.position.set(x, 35, -z + 0.6); scene.add(g); return g; });
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), 48);
  { let k = 0; for (const [x, z] of towers) for (let i = 0; i < 12; i++) lamps.setMatrixAt(k++, mat(x - 2.4 + (i % 4) * 1.6, 34.2 + Math.floor(i / 4) * 1.0, -z + 0.4)); }
  scene.add(lamps);
  const fans = crowd(U, [...stands(-30, 30, -34.6, 1.8, 18, { dz: -0.95, dy: 0.5, axis: 'z', step: 0.7, seed: 21 }).map(([x, y, z]) => [x, y, -z - 12]), ...stands(-30, 30, 34.6, 1.8, 18, { dz: 0.95, dy: 0.5, axis: 'z', step: 0.7, seed: 22 }).map(([x, y, z]) => [x, y, -z - 12]), ...stands(-32, 32, -45.6, 1.8, 18, { dz: -0.95, dy: 0.5, step: 0.7, seed: 23 })], { size: 0.9, light: '#c8d0ff' });
  scene.add(fans.mesh);
  const sbTex = canvasTex(512, 200, (g, w, h) => { g.fillStyle = '#05070d'; g.fillRect(0, 0, w, h); g.font = `${Math.round(h * 0.3)}px Bangers, Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#29d3f0'; g.fillText('CAPRA LAB', w / 2, h * 0.32); g.fillStyle = '#ffd23f'; g.font = `${Math.round(h * 0.36)}px Bangers, Impact, sans-serif`; g.fillText('HOME  21 · 17  AWAY', w / 2, h * 0.75); });
  const sb = new THREE.Mesh(new THREE.PlaneGeometry(17, 6.4), new THREE.MeshBasicMaterial({ map: sbTex, toneMapped: false })); sb.position.set(0, 17, -62.6); scene.add(sb);

  /* ---- the players and the ball ---- */
  const team = athletes(U, 16); scene.add(team.group);
  const ballMat = patchStandard(new THREE.MeshStandardMaterial({ color: '#8a4b22', roughness: 0.5 }), U, {
    vdecl: 'varying vec3 vLoc;', vertex: 'vLoc = position;', decl: 'varying vec3 vLoc;',
    diffuse: 'if (abs(vLoc.x) < 0.12 && vLoc.y > 0.85) diffuseColor.rgb = vec3(0.95); if (abs(abs(vLoc.z) - 0.75) < 0.04) diffuseColor.rgb = vec3(0.95);',
  });
  const football = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), ballMat); football.scale.set(0.11, 0.11, 0.18); scene.add(football);
  const fwork = bursts(U, { n: 500, shape: 'drop', grav: -2.5, drag: 0.9, blend: THREE.AdditiveBlending, order: 25 });
  scene.add(fwork.mesh);
  let cheer = 0;

  const place = {
    scene, fog, sport: true, exposure: 1.0,
    pup: { tint: new THREE.Color(1, 1, 1), rim: new THREE.Color(0, 0, 0), rimDir: [0, 1] },
    update(dt, t) {
      cheer = Math.max(0, cheer - dt * 0.45); fans.cheer.value = Math.min(1, cheer);
      glare.forEach((g, i) => { g.material.uniforms.uK.value = 0.55 + 0.04 * Math.sin(t * 1.7 + i); });
    },
    view(v, now) {
      const c = v.c, us = v.color || '#ff8a3d', them = '#2b2530';
      const play = c && c.play, s = c ? c.since(now) : -9;
      let k = 0;
      for (let i = -2; i <= 2; i++) {
        team.set(k++, { x: i * 1.4, z: 0.8, face: Math.PI, color: us, accent: '#f4f4f4', pants: '#f4f4f4', run: s > 0 ? s * 0.25 : 0 });
        team.set(k++, { x: i * 1.5 + 0.4, z: -0.9, face: 0, color: them, accent: '#c8ccd6', pants: '#c8ccd6', run: s > 0 ? s * 0.25 + 1 : 0 });
      }
      if (play) {
        play.recv.forEach((rcv) => {
          const p = routeAt(rcv, s), d = defenderAt(rcv, s), p2 = routeAt(rcv, s + 0.05);
          const face = Math.atan2(p2.x - p.x, -(p2.z - p.z));       // the way they run (0 faces the camera)
          team.set(k++, { x: p.x, z: -p.z, face: s > 0 ? face : Math.PI, run: s > 0 ? s : 0, color: us, accent: '#f4f4f4', pants: '#f4f4f4', swing: c.ball && c.lock && c.lock.r === rcv ? 1 : 0 });
          team.set(k++, { x: d.x, z: -d.z, face: s > 0 ? face : 0, run: s > 0 ? s + 0.3 : 0, color: them, accent: '#c8ccd6', pants: '#c8ccd6' });
        });
      }
      while (k < 16) team.set(k++, { visible: false });
      team.commit();
      const ball = c && c.ball;
      football.visible = !!ball;
      if (ball) {
        const u = Math.max(0, Math.min(1, (now - ball.from) / (ball.land - ball.from))), dist = Math.hypot(ball.to.x, ball.to.z + 7);
        const x = 0.3 + (ball.to.x - 0.3) * u, z = -7 + (ball.to.z + 7) * u, y = 2.2 + (1.3 - 2.2) * u + (3 + dist * 0.12) * 4 * u * (1 - u);
        football.position.set(x, y, -z);
        football.lookAt(ball.to.x, 1.3, -ball.to.z); football.rotateZ(now / 60);
      }
    },
    pulse(kind, at) {
      if (kind === 'rep') { cheer = 1.4; if (at.ac) rumble(at.ac, 0, 2.0, { lp: 1800, lp2: 500, vol: 0.07, brown: false, attack: 0.25 }); }
      else if (kind === 'big') {
        cheer = 2;
        for (let k = 0; k < 4; k++) setTimeout(() => fwork.emit({ x: (Math.random() - 0.5) * 50, y: 26 + Math.random() * 8, z: -52 - Math.random() * 8 }, 70, { speed: 7, sphere: true, size: 0.5, life: 1.8, colors: ['#ffd23f', '#29d3f0', '#ff3d8b', '#ffffff', '#c77dff'], spread: 0.2, jitter: 0.15 }), k * 380);
        if (at.ac) { rumble(at.ac, 0, 2.4, { lp: 1800, lp2: 500, vol: 0.09, brown: false, attack: 0.2 }); for (let k = 0; k < 4; k++) rumble(at.ac, 0.15 + k * 0.38, 0.8, { lp: 700, lp2: 80, vol: 0.09, attack: 0.005 }); }
      }
    },
    ambience(ac) {
      const murmur = noiseLoop(ac, { hp: 250, lp: 1600, gain: 0.03, swell: 0.5 });
      const low = noiseLoop(ac, { hp: 40, lp: 220, gain: 0.02, brown: true });
      return { stop() { murmur.stop(); low.stop(); } };
    },
    quality() {},
  };
  void rng; void NOISE; void shaderMat;
  return place;
}
