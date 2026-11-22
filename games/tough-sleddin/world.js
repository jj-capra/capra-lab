/* Tough Sleddin: the 3D side. three.js (r186, the family IRL and Glacial Maw draw with), sharing IRL's world kit
   (games/irl/world/core.js: the sky dome, shader-patched materials, bursts, glows, merged props), bundled with the
   game by scripts/build.mjs into public/tough-sleddin/game.js. Everything is made here from geometry, canvas
   textures and shaders: nothing to download.

   The course comes from logic.mjs (the same numbers the sled rides on): the snow is built in 50 m chunks ahead
   of the goat and dropped behind it, each chunk with its slice of the track, its obstacles and the scene's
   scenery along the banks. The three places are scenes.js. */
import { THREE, shared, shaderMat, quadInstances, bursts, merge, mat, canvasTex } from '../irl/world/core.js';
import { KINDS, RAMP_LEN, RAMP_H, SLOPE, EDGE } from './logic.mjs';
import { SCENE_BUILDERS } from './scenes.js';

const CHUNK = 50, AHEAD = 340, BEHIND = 40;
const INK = new THREE.Color('#1a1222');

export function createWorld(canvas, { level = 0 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: level === 0, powerPreference: 'high-performance', stencil: false, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const U = shared();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1200);
  let quality = level, place = null, C = null, sceneIdx = -1;
  const chunks = new Map();
  let crash = null, lastSpray = 0;

  /* ---------------- the goat on its saucer ---------------- */
  const goat = buildGoat(U);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(20,24,60,0.55)'); r.addColorStop(1, 'rgba(20,24,60,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }),
    transparent: true, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 2;
  // snow thrown up behind the saucer, the big poof of a crash, sparkle dust in the air
  const spray = bursts(U, { n: 520, shape: 'dot', grav: -7, drag: 1.2, opacity: 0.95 });
  const poof = bursts(U, { n: 220, shape: 'puff', grav: -1.2, drag: 2.2, opacity: 0.8 });
  const dizzy = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(starGeo(), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
    s.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.45, 0, Math.sin((i / 3) * Math.PI * 2) * 0.45);
    dizzy.add(s);
  }
  dizzy.visible = false;

  /* ---------------- falling snow that streams past at your speed ---------------- */
  const FLAKES = 3600;
  const flakeMat = shaderMat(U, {
    uniforms: { uCam: { value: new THREE.Vector3() }, uTravel: { value: 0 }, uFlakeCol: { value: new THREE.Color('#eef4ff') }, uFlakeK: { value: 1 }, uFall: { value: 1.2 }, uWind: { value: 0.6 } },
    vertex: /* glsl */ `attribute vec4 aF; uniform float uTime; uniform vec3 uCam; uniform float uTravel; uniform float uFall; uniform float uWind; varying vec2 vUv; varying float vA;
      void main() {
        vec3 box = vec3(36.0, 20.0, 60.0);
        vec3 p = aF.xyz * box;
        p.x += uTime * uWind + sin(uTime * 0.8 + aF.w * 30.0) * 0.6;
        p.y -= uTime * uFall * (0.7 + aF.w * 0.6);
        p.z += uTravel;
        p = mod(p, box) - box * vec3(0.5, 0.45, 0.8);
        vec3 w = uCam + p;
        vec4 mv = viewMatrix * vec4(w, 1.0);
        float dist = -mv.z;
        float sz = 0.05 + 0.05 * fract(aF.w * 13.0);
        mv.xy += vec2(position.x, position.y - 0.5) * sz;
        gl_Position = projectionMatrix * mv;
        vUv = vec2(position.x + 0.5, position.y);
        vA = smoothstep(0.4, 2.0, dist) * (1.0 - smoothstep(30.0, 46.0, dist));
      }`,
    fragment: /* glsl */ `uniform vec3 uFlakeCol; uniform float uFlakeK; varying vec2 vUv; varying float vA;
      void main() { float a = smoothstep(1.0, 0.15, length(vUv - 0.5) * 2.0) * vA * uFlakeK; if (a < 0.01) discard; gl_FragColor = vec4(uFlakeCol, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
  const flakes = new THREE.Mesh(quadInstances(FLAKES, [['aF', 4, (a, o) => a.set([Math.random(), Math.random(), Math.random(), Math.random()], o)]]), flakeMat);
  flakes.frustumCulled = false; flakes.renderOrder = 20;

  /* ---------------- the snow, chunk by chunk ---------------- */
  const tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
  function terrainGeo(k) {
    const cols = 40, rows = 10, W = 95, d0 = k * CHUNK;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array((cols + 1) * (rows + 1) * 3), nor = new Float32Array(pos.length), tr = new Float32Array((cols + 1) * (rows + 1) * 2), idx = [];
    for (let j = 0; j <= rows; j++) {
      const d = d0 + (j / rows) * CHUNK, c = C.center(d), hw = C.halfWidth(d);
      for (let i = 0; i <= cols; i++) {
        // columns bunch up over the track and spread out over the banks
        const s = (i / cols) * 2 - 1, u = Math.sign(s) * (Math.abs(s) < 0.3 ? (Math.abs(s) / 0.3) * (hw + 2) : hw + 2 + ((Math.abs(s) - 0.3) / 0.7) ** 1.6 * (W - hw - 2));
        const x = c + u, y = C.height(x, d), o = (j * (cols + 1) + i) * 3;
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = -d;
        tr[(o / 3) * 2] = u; tr[(o / 3) * 2 + 1] = hw;     // across the track and its half width, for the snow's look
        const e = 0.6, dx = (C.height(x + e, d) - C.height(x - e, d)) / (2 * e), dz = -(C.height(x, d + e) - C.height(x, d - e)) / (2 * e);
        tmpV.set(-dx, 1, -dz).normalize();
        nor[o] = tmpV.x; nor[o + 1] = tmpV.y; nor[o + 2] = tmpV.z;
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c2 = a + cols + 1, d2 = c2 + 1; idx.push(a, b, c2, b, d2, c2); }     // facing up
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(tr, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
  // a thing on the snow: its matrix, standing on the ground at (x, d)
  const at = (x, d, yaw = 0, s = 1, dy = 0) => mat(x, C.height(x, d) + dy, -d, 0, yaw, 0, s);
  function buildChunk(k) {
    const group = new THREE.Group(), d0 = k * CHUNK, d1 = d0 + CHUNK;
    const ground = new THREE.Mesh(terrainGeo(k), place.snowMat);
    ground.userData.own = true;
    group.add(ground);
    // instances by kind: the scene's scenery and the course's obstacles
    const lists = {};
    const put = (kind, m) => (lists[kind] || (lists[kind] = [])).push(m);
    for (const o of C.obstacles(d0, d1)) {
      if (o.barrier) place.barrier(o, { put, at, C, group });
      else put(o.kind, at(o.x, o.d, o.yaw, o.s));
    }
    for (const r of C.ramps(d0, d1)) group.add(rampMesh(r));
    for (const p of C.ice(d0 - 40, d1)) if (p.d >= d0 && p.d < d1) group.add(iceMesh(p));
    place.decorate(k, d0, d1, { put, at, C, group, quality });
    for (const [kind, ms] of Object.entries(lists)) {
      const K = place.kinds[kind];
      if (!K || !ms.length) continue;
      const im = new THREE.InstancedMesh(K.geo, K.mat || place.props, ms.length);
      ms.forEach((m, i) => im.setMatrixAt(i, m));
      im.computeBoundingSphere();
      group.add(im);
    }
    place.scene.add(group);
    return { group };
  }
  // a chunk's own geometry (the snow, ice, crevasses, signs, lights) goes with it; shared shapes stay
  function dropChunk(ch) {
    place.scene.remove(ch.group);
    ch.group.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      else if (o.isMesh && o.userData.full) { o.geometry.dispose(); if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      else if (o.isMesh && o.userData.own) o.geometry.dispose();
    });
    if (ch.group.userData.bulbs) for (const b of ch.group.userData.bulbs) { b.geometry.dispose(); b.material.dispose(); }
  }
  // (behind the menu the camera looks back up the hill, so more of it is kept)
  function syncChunks(d, behind = BEHIND) {
    const k0 = Math.floor((d - behind) / CHUNK), k1 = Math.floor((d + AHEAD) / CHUNK);
    for (const [k, ch] of chunks) if (k < k0 || k > k1) { dropChunk(ch); chunks.delete(k); }
    // one new chunk a frame at most, the nearest first (no hitch from building several at once)
    let built = 0;
    for (let k = Math.max(0, k0); k <= k1 && built < (chunks.size < 3 ? 9 : 1); k++) if (!chunks.has(k)) { chunks.set(k, buildChunk(k)); built++; }
  }

  /* ---------------- ramps and ice ---------------- */
  const GEOS = {};
  function rampMesh(r) {
    if (!GEOS.ramp) {
      // a snow kicker: a wedge with rounded shoulders, flags either side
      const w = new THREE.Shape(); w.moveTo(0, 0); w.lineTo(RAMP_LEN, RAMP_H); w.lineTo(RAMP_LEN + 0.4, RAMP_H - 0.25); w.lineTo(RAMP_LEN + 0.6, 0); w.closePath();
      const wedge = new THREE.ExtrudeGeometry(w, { depth: 1, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 2 });
      wedge.rotateY(Math.PI / 2); wedge.translate(-0.5, 0, 0);
      GEOS.ramp = { wedge, flag: merge([
        { geo: new THREE.CylinderGeometry(0.04, 0.05, 1.8, 6), color: '#2b2b33', matrix: mat(0, 0.9, 0) },
        { geo: new THREE.BoxGeometry(0.02, 0.4, 0.55), color: '#ff5a2a', matrix: mat(0, 1.6, -0.28), emit: 0.6 },
      ]) };
    }
    const g = new THREE.Group();
    const y0 = C.height(r.x, r.d), y1 = C.height(r.x, r.d + RAMP_LEN);
    const m = new THREE.Mesh(GEOS.ramp.wedge, place.rampMat);
    m.position.set(r.x, y0, -r.d); m.scale.set(r.hw * 2, 1, 1);
    m.rotation.x = Math.atan2(y1 - y0, RAMP_LEN);     // lying on the slope
    g.add(m);
    for (const s of [-1, 1]) { const f = new THREE.Mesh(GEOS.ramp.flag, place.props); f.position.set(r.x + s * (r.hw + 0.3), C.height(r.x + s * (r.hw + 0.3), r.d + RAMP_LEN), -(r.d + RAMP_LEN)); g.add(f); }
    return g;
  }
  function iceMesh(p) {
    const cols = 6, rows = 8, g = new THREE.BufferGeometry(), pos = [], idx = [];
    for (let j = 0; j <= rows; j++) {
      const d = p.d + (j / rows) * p.len;
      for (let i = 0; i <= cols; i++) { const x = p.x + ((i / cols) * 2 - 1) * p.hw; pos.push(x, C.height(x, d) + 0.04, -d); }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i; idx.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, place.iceMat); m.userData.own = true; m.renderOrder = 1;
    return m;
  }

  /* ---------------- loading a place ---------------- */
  function load(idx, course) {
    if (place) { for (const ch of chunks.values()) dropChunk(ch); chunks.clear(); }
    C = course;
    if (idx !== sceneIdx) {
      if (place) place.dispose && place.dispose();
      sceneIdx = idx;
      place = SCENE_BUILDERS[idx]({ U, THREE, C, renderer });
      place.scene.add(goat.root, shadow, spray.mesh, poof.mesh, dizzy, flakes);
      renderer.toneMappingExposure = place.exposure || 1;
      flakeMat.uniforms.uFlakeCol.value.set(place.flakes?.color || '#eef4ff');
      flakeMat.uniforms.uFlakeK.value = place.flakes?.k ?? 1;
      flakeMat.uniforms.uFall.value = place.flakes?.fall ?? 1.2;
      U.uFogCol.value.copy(place.scene.fog.color); U.uFogDen.value = place.scene.fog.density;
    }
    place.reset && place.reset(C);
    crash = null;
    goat.reset();
    dizzy.visible = false;
    syncChunks(0);
  }

  /* ---------------- each frame ---------------- */
  const cam = { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0, fov: 60, roll: 0, shake: 0, ready: false };
  const tilt = { x: 0, z: 0 };
  const ground = (x, d) => C.height(x, d);
  // the snow's slope at a spot: down the hill (negative: it drops) and across (positive: rising to the right)
  const slopeAt = (x, d) => [(ground(x, d + 0.9) - ground(x, d - 0.9)) / 1.8, (ground(x + 0.9, d) - ground(x - 0.9, d)) / 1.8];
  function frame(st, { mode = 'play', dt = 1 / 60, t = 0, input = 0, intro = 1 } = {}) {
    if (!place) return;
    U.uTime.value = t;
    const S = C.S;
    const d = st.d, gx = st.x, gy = st.y;
    syncChunks(d, mode === 'menu' || intro < 1 ? 140 : BEHIND);
    // the goat: leans into the turn, turns its nose the way it's sliding, the saucer spins
    const yaw = Math.atan2(-st.vx, st.v) * 0.8;
    if (!crash) {
      goat.root.position.set(gx, gy, -d);
      goat.root.rotation.set(0, 0, 0);
      goat.saucer.rotation.y += dt * (2.2 + Math.abs(st.vx) * 0.5 + (st.air ? 4 : 0));
      // the saucer lies on the snow: front down the hill, tipped up the bank (it was once tilted the wrong way and
      // its back half sank into the snow); up a ramp it tips up, off the lip nose up, then nose down to land
      const [fall, across] = slopeAt(gx, d);
      const pitch = st.air ? Math.max(-0.42, Math.min(0.3, st.vy * 0.035)) + Math.atan(fall) * 0.4 : Math.atan(fall) + (st.ramp ? Math.atan(RAMP_H / RAMP_LEN) : 0);
      const roll = st.air ? 0 : Math.atan(across);
      const kt = Math.min(1, dt * 14);
      tilt.x += (pitch - tilt.x) * kt; tilt.z += (roll - tilt.z) * kt;
      goat.saucer.position.set(0, 0.03, 0);
      goat.saucer.rotation.x = tilt.x;
      goat.saucer.rotation.z = tilt.z - st.vx * 0.012;
      goat.rider.rotation.set(tilt.x * 0.85 - 0.05 + (st.air ? -0.1 : 0), yaw, tilt.z * 0.6 - st.vx * 0.035 - input * 0.12);
      goat.flap(t, st.v);
    } else goat.tumble(crash, t, dt, ground);
    // its shadow on the snow (lying on the slope there), smaller and fainter the higher it flies
    const gp = crash ? goat.rider.getWorldPosition(tmpS) : goat.root.position;
    const shx = gp.x, shd = -gp.z;
    const gr = ground(shx, shd), [sf, sa] = slopeAt(shx, shd);
    const lift = Math.max(0, gp.y - gr - (crash ? 0.25 : 0));
    shadow.position.set(shx, gr + 0.07, -shd);
    shadow.scale.setScalar(2.3 / (1 + lift * 0.35));
    shadow.material.opacity = 1 / (1 + lift * 0.5);
    shadow.rotation.set(-Math.PI / 2 + Math.atan(sf), -Math.atan(sa), 0);
    // snow thrown up: more when carving, a burst on landing, none in the air
    if (mode !== 'idle' && !st.air && !crash && t - lastSpray > 1 / 50) {
      lastSpray = t;
      const carve = Math.min(1, Math.abs(st.vx) / 8 + Math.abs(input) * 0.4);
      const back = { x: gx + Math.sin(yaw) * 0.5 - Math.sign(st.vx) * 0.5 * carve, y: gy + 0.12, z: -d + 0.85 };
      spray.emit(back, Math.round(2 + carve * 5 + st.v / 14), { speed: 1.4 + carve * 2.6, up: 0.55, size: 0.07, life: 0.6, colors: place.sprayCols, spread: 0.7, dir: { x: -st.vx * 0.25, y: 0.6, z: st.v * 0.12 } });
    }
    if (st.landedAt > 0 && Math.abs(st.t - st.landedAt) < 1e-6 + dt * 0.6) {
      spray.emit({ x: gx, y: gy + 0.1, z: -d }, 40, { speed: 3.2, up: 0.4, size: 0.09, life: 0.8, colors: place.sprayCols, spread: 1.3 });
      cam.shake = Math.max(cam.shake, 0.18);
    }
    // the camera
    const v01 = Math.max(0, Math.min(1, (st.v - S.v0) / (S.vMax - S.v0)));
    const k = 1 - Math.exp(-dt * 7);
    let px, py, pz, lx, ly, lz;
    if (crash) {
      // swing round from behind to the open side (toward the middle of the track, away from the trees) to watch
      // the goat land in the snow, always up above the snow there (it once sank into the hill and the goat
      // seemed to float over nothing)
      const g = goat.rider.getWorldPosition(tmpV);
      const e = easeIO(Math.min(1, (t - crash.t0) / 1.4));
      const side = Math.sign(C.center(crash.d) - crash.x) || 1;
      // (high up and looking down on it, over the posts and trees around, and with the goat in the top half of the
      // picture: the card comes up over the bottom half)
      px = g.x + side * 5 * e; pz = g.z + 8.2 * (1 - e) - 1.5 * e;
      py = Math.max(g.y + 4.4 * (1 - e) + 5.8 * e, ground(px, -pz) + 1.9);
      lx = g.x; ly = g.y + 0.4 - 1.9 * e; lz = g.z;
    } else {
      // (it pulls back a little and looks farther ahead as you speed up: at full speed the next 2 seconds are 140 m)
      const back = 8.2 + v01 * 1.2, ahead = 30 + v01 * 14;
      const play = { px: gx * 0.92 + C.center(d + 10) * 0.08, py: gy + 2.9 + v01 * 0.5 + SLOPE * back, pz: -d + back, lx: gx * 0.8 + C.center(d + ahead + 4) * 0.2, ly: gy - SLOPE * ahead + 0.2, lz: -d - ahead };
      if (mode === 'menu' || intro < 1) {
        // in front of the goat looking back up at it, swinging round behind it as the countdown runs
        const a = Math.sin(t * 0.25) * 0.6;
        const front = { px: gx + Math.sin(a) * 8.5, py: gy + 2.2 - SLOPE * 9, pz: -d - Math.cos(a) * 9.5, lx: gx, ly: gy + 1.1, lz: -d };
        const e = mode === 'menu' ? 0 : easeIO(intro);
        px = front.px + (play.px - front.px) * e; py = front.py + (play.py - front.py) * e; pz = front.pz + (play.pz - front.pz) * e;
        lx = front.lx + (play.lx - front.lx) * e; ly = front.ly + (play.ly - front.ly) * e; lz = front.lz + (play.lz - front.lz) * e;
        if (mode === 'menu' || intro < 1) { cam.x = px; cam.y = py; cam.z = pz; cam.lx = lx; cam.ly = ly; cam.lz = lz; cam.ready = true; }
      } else ({ px, py, pz, lx, ly, lz } = play);
    }
    if (!cam.ready) { cam.x = px; cam.y = py; cam.z = pz; cam.lx = lx; cam.ly = ly; cam.lz = lz; cam.ready = true; }
    // z and the look follow tightly (the hill doesn't lag), x and y ease
    // (sideways it keeps up quicker: at full tilt you cross the track in a second)
    cam.x += (px - cam.x) * Math.min(1, k * 2); cam.y += (py - cam.y) * Math.min(1, k * 1.6); cam.z += (pz - cam.z) * Math.min(1, k * 3);
    cam.lx += (lx - cam.lx) * Math.min(1, k * 2); cam.ly += (ly - cam.ly) * Math.min(1, k * 1.6); cam.lz += (lz - cam.lz) * Math.min(1, k * 3);
    // never under the snow (the banks rise steeply past the edges)
    cam.y = Math.max(cam.y, ground(cam.x, -cam.z) + 1.1);
    cam.shake *= Math.exp(-dt * 6);
    const sh = cam.shake;
    camera.position.set(cam.x + (Math.random() - 0.5) * sh, cam.y + (Math.random() - 0.5) * sh, cam.z);
    camera.lookAt(cam.lx, cam.ly, cam.lz);
    cam.roll += ((crash || mode === 'menu' ? 0 : -st.vx * 0.012 - input * 0.02) - cam.roll) * k;
    camera.rotateZ(cam.roll);
    const fov = (mode === 'menu' ? 52 : 58 + v01 * 16) + (st.air ? 3 : 0);
    if (Math.abs(fov - camera.fov) > 0.05) { camera.fov += (fov - camera.fov) * k; camera.updateProjectionMatrix(); }
    // snow streams past at your speed
    flakeMat.uniforms.uCam.value.copy(camera.position);
    flakeMat.uniforms.uTravel.value = d;
    place.update(dt, t, { st, camera, goat: goat.root.position, d, mode });
    renderer.render(place.scene, camera);
  }

  function doCrash(st) {
    const o = st.crashed;
    crash = { t0: U.uTime.value, x: st.x, d: st.d, y: st.y, vx: st.vx, v: st.v, kind: o.kind };
    const p = { x: st.x, y: st.y + 0.5, z: -st.d };
    poof.emit(p, 60, { speed: 4.5, up: 0.5, size: 0.9, life: 1.6, colors: place.sprayCols, spread: 1.2, dir: { x: st.vx * 0.2, y: 0.5, z: -st.v * 0.12 } });
    spray.emit(p, 90, { speed: 6, up: 0.45, size: 0.1, life: 1.2, colors: place.sprayCols, spread: 1.2, dir: { x: 0, y: 1, z: -st.v * 0.15 } });
    if (o.o && place.hit) place.hit(o.o, p);
    cam.shake = 0.6;
    goat.startTumble(crash);
    dizzy.visible = false;
  }
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality >= 2 ? 1 : quality === 1 ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // sideways the picture is wide: see a little more of the hill, not a squashed one
    camera.updateProjectionMatrix();
  }
  return {
    camera, renderer, U,
    place: () => place,
    load, frame, resize,
    crash: doCrash,
    clearCrash() { crash = null; goat.reset(); dizzy.visible = false; },
    dizzyAt(t) {
      // stars round the goat's head once it's down
      if (!crash) return;
      const h = goat.head.getWorldPosition(tmpV);
      dizzy.visible = t - crash.t0 > 1.1;
      dizzy.position.set(h.x, h.y + 0.45, h.z); dizzy.rotation.y = t * 4;
    },
    setQuality(q) { quality = q; flakes.geometry.instanceCount = q >= 2 ? FLAKES / 4 : q === 1 ? FLAKES / 2 : FLAKES; resize(); },
    stats: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, chunks: chunks.size, quality, scene: sceneIdx }),
    dispose() { for (const ch of chunks.values()) dropChunk(ch); chunks.clear(); renderer.dispose(); },
  };
}
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function starGeo() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.05 : 0.12; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }); g.center();
  return g;
}

/* ---------------- the goat ----------------
   A cream goat with curly horns, a red scarf and goggles pushed up on its head, sitting on a red saucer and
   holding the rim, nose downhill (-z). An ink outline round it (the lab's comic look). */
function buildGoat(U) {
  const root = new THREE.Group();
  const saucer = new THREE.Group(), rider = new THREE.Group();
  saucer.rotation.order = 'ZXY';     // the spin is its own; the tilt to the snow stays put while it spins
  root.add(saucer, rider);
  const mats = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 });
  const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h), Cy = (a, b, h, s = 16) => new THREE.CylinderGeometry(a, b, h, s);
  const CREAM = '#f4ecde', CREAM2 = '#e9dfcc', HORN = '#cfa874', PINK = '#f2c3b8', DARK = '#2a2230', RED = '#e2383c';
  // the saucer (its own group so it spins under the goat): a dish, a white rim, handles, dots that show the spin
  const dish = merge([
    { geo: Cy(0.98, 0.82, 0.16, 36), color: '#e8343c', matrix: mat(0, 0.08, 0) },
    { geo: Cy(0.8, 0.78, 0.02, 36), color: '#ff6b6f', matrix: mat(0, 0.17, 0) },
    { geo: new THREE.TorusGeometry(0.95, 0.065, 8, 40), color: '#f6f6f8', matrix: mat(0, 0.17, 0, Math.PI / 2) },
    ...Array.from({ length: 8 }, (_, i) => ({ geo: S(0.07, 8, 6), color: i % 2 ? '#ffd23f' : '#29d3f0', matrix: mat(Math.cos((i / 8) * Math.PI * 2) * 0.95, 0.22, Math.sin((i / 8) * Math.PI * 2) * 0.95), emit: 0.2 })),
    { geo: new THREE.TorusGeometry(0.11, 0.025, 6, 12), color: DARK, matrix: mat(0.98, 0.22, 0, 0, 0, Math.PI / 2) },
    { geo: new THREE.TorusGeometry(0.11, 0.025, 6, 12), color: DARK, matrix: mat(-0.98, 0.22, 0, 0, 0, Math.PI / 2) },
  ]);
  saucer.add(new THREE.Mesh(dish, mats), outline(dish, 0.022));
  // the goat
  const body = [
    { geo: S(0.45), color: CREAM, matrix: mat(0, 0.6, 0.1, 0, 0, 0, [1, 0.88, 1.12]) },
    { geo: S(0.2, 12, 10), color: CREAM2, matrix: mat(0.3, 0.33, 0.12, 0, 0, 0, [0.7, 0.55, 1.3]) },        // back legs folded forward
    { geo: S(0.2, 12, 10), color: CREAM2, matrix: mat(-0.3, 0.33, 0.12, 0, 0, 0, [0.7, 0.55, 1.3]) },
    { geo: new THREE.CapsuleGeometry(0.08, 0.42, 4, 8), color: CREAM2, matrix: mat(0.25, 0.42, -0.42, -0.95, 0, 0.15) },   // front legs reaching for the rim
    { geo: new THREE.CapsuleGeometry(0.08, 0.42, 4, 8), color: CREAM2, matrix: mat(-0.25, 0.42, -0.42, -0.95, 0, -0.15) },
    { geo: S(0.095, 10, 8), color: DARK, matrix: mat(0.28, 0.27, -0.66) },
    { geo: S(0.095, 10, 8), color: DARK, matrix: mat(-0.28, 0.27, -0.66) },
    { geo: S(0.11, 10, 8), color: '#ffffff', matrix: mat(0, 0.78, 0.58) },          // tail tuft
    { geo: Cy(0.16, 0.2, 0.3, 14), color: CREAM, matrix: mat(0, 0.92, -0.22, 0.35) },   // neck
    { geo: new THREE.TorusGeometry(0.2, 0.08, 10, 22), color: RED, matrix: mat(0, 0.9, -0.2, Math.PI / 2 - 0.35) },     // scarf
  ];
  const bodyGeo = merge(body);
  rider.add(new THREE.Mesh(bodyGeo, mats), outline(bodyGeo, 0.025));
  const head = new THREE.Group(); head.position.set(0, 1.12, -0.36);
  const headParts = [
    { geo: S(0.33, 22, 16), color: CREAM, matrix: mat(0, 0, 0, 0, 0, 0, [1, 0.95, 1.08]) },
    { geo: S(0.2, 16, 12), color: PINK, matrix: mat(0, -0.12, -0.27, 0, 0, 0, [1.05, 0.82, 1.0]) },          // snout
    { geo: S(0.035, 8, 6), color: '#7a4a4a', matrix: mat(0.07, -0.08, -0.46) },
    { geo: S(0.035, 8, 6), color: '#7a4a4a', matrix: mat(-0.07, -0.08, -0.46) },
    { geo: S(0.065, 12, 10), color: '#16101c', matrix: mat(0.15, 0.06, -0.27) },          // eyes
    { geo: S(0.065, 12, 10), color: '#16101c', matrix: mat(-0.15, 0.06, -0.27) },
    { geo: S(0.022, 8, 6), color: '#ffffff', matrix: mat(0.17, 0.09, -0.33), emit: 0.5 },
    { geo: S(0.022, 8, 6), color: '#ffffff', matrix: mat(-0.13, 0.09, -0.33), emit: 0.5 },
    { geo: S(0.05, 10, 8), color: '#ff9fb4', matrix: mat(0.23, -0.06, -0.2, 0, 0, 0, [1, 0.6, 0.6]) },   // cheeks
    { geo: S(0.05, 10, 8), color: '#ff9fb4', matrix: mat(-0.23, -0.06, -0.2, 0, 0, 0, [1, 0.6, 0.6]) },
    { geo: new THREE.ConeGeometry(0.07, 0.24, 10), color: CREAM2, matrix: mat(0, -0.32, -0.22, Math.PI) },     // beard
    // curly horns sweeping back
    { geo: new THREE.TorusGeometry(0.15, 0.05, 8, 14, Math.PI * 1.2), color: HORN, matrix: mat(0.13, 0.27, 0.02, 0, Math.PI / 2, 0.2) },
    { geo: new THREE.TorusGeometry(0.15, 0.05, 8, 14, Math.PI * 1.2), color: HORN, matrix: mat(-0.13, 0.27, 0.02, 0, Math.PI / 2, -0.2) },
    // floppy ears out to the sides
    { geo: S(0.13, 12, 8), color: CREAM2, matrix: mat(0.36, 0.02, 0.02, 0, 0, -0.45, [1.6, 0.45, 0.8]) },
    { geo: S(0.13, 12, 8), color: CREAM2, matrix: mat(-0.36, 0.02, 0.02, 0, 0, 0.45, [1.6, 0.45, 0.8]) },
    // goggles pushed up on the forehead
    { geo: new THREE.TorusGeometry(0.33, 0.025, 6, 30), color: '#2a2a3a', matrix: mat(0, 0.16, -0.02, 0.35) },
    { geo: new THREE.TorusGeometry(0.075, 0.025, 8, 16), color: '#ffd23f', matrix: mat(0.1, 0.2, -0.29, -0.3) },
    { geo: new THREE.TorusGeometry(0.075, 0.025, 8, 16), color: '#ffd23f', matrix: mat(-0.1, 0.2, -0.29, -0.3) },
    { geo: Cy(0.07, 0.07, 0.02, 16), color: '#29d3f0', matrix: mat(0.1, 0.2, -0.29, Math.PI / 2 - 0.3), emit: 0.5 },
    { geo: Cy(0.07, 0.07, 0.02, 16), color: '#29d3f0', matrix: mat(-0.1, 0.2, -0.29, Math.PI / 2 - 0.3), emit: 0.5 },
  ];
  const headGeo = merge(headParts);
  const glowMat = mats.clone();
  head.add(new THREE.Mesh(headGeo, glowMat), outline(headGeo, 0.02));
  rider.add(head);
  // the scarf's tails, flapping behind
  const tails = [0, 1].map((i) => {
    const g = new THREE.Group(); g.position.set(0.08 - i * 0.16, 0.95, 0.0);
    const geo = merge([{ geo: new THREE.BoxGeometry(0.13, 0.03, 0.42), color: RED, matrix: mat(0, 0, 0.21) }, { geo: new THREE.BoxGeometry(0.13, 0.032, 0.06), color: '#ffffff', matrix: mat(0, 0, 0.36) }]);
    g.add(new THREE.Mesh(geo, mats));
    rider.add(g);
    return g;
  });
  let tumbleState = null;
  return {
    root, saucer, rider, head,
    reset() {
      tumbleState = null;
      root.position.set(0, 0, 0); root.rotation.set(0, 0, 0);
      rider.position.set(0, 0, 0); rider.rotation.set(0, 0, 0);
      saucer.position.set(0, 0, 0); saucer.rotation.set(0, 0, 0);
      head.rotation.set(0, 0, 0);
    },
    flap(t, v) {
      tails.forEach((g, i) => { g.rotation.x = -0.25 + Math.sin(t * (9 + v * 0.16) + i * 1.7) * (0.25 + v * 0.004); g.rotation.y = Math.sin(t * 5 + i) * 0.2; });
      head.rotation.y = Math.sin(t * 0.9) * 0.08; head.rotation.x = Math.sin(t * 1.7) * 0.03;
    },
    startTumble(c) {
      // the saucer skids on, the goat flies off it in a tumble and lands in the snow
      tumbleState = { c, vx: c.vx * 0.3, vy: 5.5, vz: -Math.min(14, c.v * 0.3), x: 0, y: 0.3, z: 0, spin: 7 + Math.random() * 4, sx: 0, sz: 0, svz: -Math.min(22, c.v * 0.4), rest: false };
    },
    // ground(x, d): the snow's height (the real hill, its rolls and banks: the goat lands on it, not in it)
    tumble(c, t, dt, ground) {
      const T = tumbleState;
      if (!T) return;
      root.position.set(c.x, c.y, -c.d);
      // the rider
      if (!T.rest) {
        T.vy -= 16 * dt; T.x += T.vx * dt; T.y += T.vy * dt; T.z += T.vz * dt;
        const gyRel = ground(c.x + T.x, c.d - T.z) - c.y;
        if (T.y < gyRel + 0.25) {
          T.y = gyRel + 0.25;
          if (T.vy < 0) { if (Math.abs(T.vy) > 3) { T.vy = -T.vy * 0.35; T.vz *= 0.6; T.vx *= 0.6; T.spin *= 0.5; } else { T.rest = true; T.vy = 0; } }
        }
        rider.rotation.x += T.spin * dt; rider.rotation.z += T.spin * 0.3 * dt;
      } else {
        // sliding to a stop on the snow
        T.vz *= Math.exp(-dt * 3); T.vx *= Math.exp(-dt * 3); T.x += T.vx * dt; T.z += T.vz * dt;
        T.y = ground(c.x + T.x, c.d - T.z) - c.y + 0.25;
      }
      rider.position.set(T.x, T.y, T.z);
      // the saucer skids on down the hill on the snow
      T.svz *= Math.exp(-dt * 1.6); T.sz += T.svz * dt; T.sx += c.vx * 0.4 * dt * Math.exp(-(t - c.t0) * 1.6);
      saucer.position.set(T.sx, ground(c.x + T.sx, c.d - T.sz) - c.y + 0.03, T.sz);
      saucer.rotation.y += dt * 9 * Math.exp(-(t - c.t0));
    },
  };
}
// an ink outline: the shape again, pushed out along its normals, back faces only
function outline(geo, w) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uW: { value: w }, uC: { value: INK } },
    vertexShader: 'uniform float uW; void main() { vec3 p = position + normal * uW; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 1.0); }',
    side: THREE.BackSide,
  });
  return new THREE.Mesh(geo, m);
}
void KINDS; void EDGE;
