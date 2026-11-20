/* IRL's 3D places for the workouts (JC, Nov 19 2026: "Bring the glacial max level of detail to the 3d rendering of
   IRL. I want more vivid scenery and lighting with workouts in the pouring rain on a wheat field", then "A peaceful
   snow fall, a zen studio. Make it fun but immersive", "*separate scenes"): four places, each a world of its own:
     field    a golden wheat field at sunset, the wind rolling through it;
     rooftop  a city rooftop at night in pouring rain, neon, lightning;
     snow     a snowy clearing at night, snow falling, the northern lights;
     zen      a wooden studio open onto a zen garden at golden hour, cherry petals drifting in.
   The player is their lab puppet, drawn by scene.js onto a canvas the page hands over, standing in the place on a
   card (a cutout, lit by the place, casting a shadow, mirrored in a wet or polished floor, rain falling in front of
   it). The camera is fixed and set up so the card covers exactly the camera picture's rectangle on screen: what
   the page draws over it (the workout's arrows, cones and rest card) lines up with the puppet. Each place reacts
   to the reps: pulse('rep'), pulse('big') every tenth, pulse('move') when a new move starts.
   Built by scripts/build.mjs (esbuild, three.js bundled in) into public/irl/world.js; the page imports it only
   when a workout opens with the scene on and the phone isn't on its lightest level. */
import { THREE, shared, shaderMat, canvasTex } from './core.js';
import field from './field.js';
import rooftop from './rooftop.js';
import snow from './snow.js';
import zen from './zen.js';

const BUILD = { field, rooftop, snow, zen };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function worldOK() {
  try { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); const ok = !!g; if (g) g.getExtension('WEBGL_lose_context')?.loseContext(); return ok; } catch { return false; }
}

/* hooks: audio() answers an AudioContext when sounds may play (else null); level() the phone's level (0 full,
   1 eased off). */
export function createWorld(canvas, hooks = {}) {
  const level0 = hooks.level ? hooks.level() : 0;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: level0 === 0, powerPreference: 'default', stencil: false, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const U = shared();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.matrixAutoUpdate = true;
  const T0 = performance.now();

  /* ---- the puppet's card ---- */
  const pupU = { uTint: { value: new THREE.Color(1, 1, 1) }, uRim: { value: new THREE.Color(0, 0, 0) }, uRimDir: { value: new THREE.Vector2(-0.7, 0.7) },
    uRim2: { value: new THREE.Color(0, 0, 0) }, uRimDir2: { value: new THREE.Vector2(0.7, 0.5) }, uPx: { value: new THREE.Vector2(1 / 512, 1 / 512) } };
  const pupMat = shaderMat(U, {
    uniforms: pupU,
    vertex: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `
      uniform sampler2D uPup; uniform vec3 uTint; uniform vec3 uRim; uniform vec2 uRimDir; uniform vec3 uRim2; uniform vec2 uRimDir2; uniform vec2 uPx; uniform float uFlash;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(uPup, vUv);
        if (c.a < 0.1) discard;
        // the edge on the light's side catches it (the ink outline glows there)
        float n = texture2D(uPup, vUv + uRimDir * uPx * 6.0).a;
        float n2 = texture2D(uPup, vUv + uRimDir2 * uPx * 6.0).a;
        float rim = c.a * (1.0 - n), rim2 = c.a * (1.0 - n2);
        vec3 col = c.rgb * (uTint + vec3(0.8, 0.85, 1.0) * uFlash) + uRim * rim + uRim2 * rim2;
        gl_FragColor = vec4(col, c.a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthTest: true, depthFunc: THREE.AlwaysDepth, depthWrite: true, toneMapped: false, side: THREE.DoubleSide,
  });
  const pup = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pupMat);
  pup.renderOrder = 5; pup.castShadow = true; pup.frustumCulled = false;
  const pupDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5, side: THREE.DoubleSide });
  pup.customDepthMaterial = pupDepth;
  // three hands the card's own map and alpha test to its shadow, so the card's material carries them too
  pupMat.alphaTest = 0.5;
  let pupTex = null, pupW = 0, pupH = 0;
  // a soft dark patch under each player's feet, so they stand on the floor
  const blobTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.5, 'rgba(0,0,0,0.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }, { srgb: false });
  const blobs = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 2; m.visible = false;
    return m;
  });

  /* ---- places ---- */
  const places = {};
  let P = null;
  const L = { W: 0, H: 0, dpr: 1, play: null, players: [], pupDirty: false, pup: null, level: level0 };
  const G = { ground: null, hist: [], ppm: 1, yH: 0, cx: 0 };
  const env = { THREE, U, renderer, camera, level: () => L.level };

  function place(name) {
    if (!BUILD[name]) name = 'field';
    if (P && P.name === name) return;
    stopAmb();
    if (!places[name]) { places[name] = BUILD[name](env); places[name].name = name; places[name].quality?.(L.level); }
    P = places[name];
    P.scene.add(pup, ...blobs);
    renderer.toneMappingExposure = P.exposure ?? 1;
    pupU.uTint.value.copy(P.pup.tint); pupU.uRim.value.copy(P.pup.rim); pupU.uRimDir.value.set(...P.pup.rimDir);
    pupU.uRim2.value.copy(P.pup.rim2 || new THREE.Color(0, 0, 0)); pupU.uRimDir2.value.set(...(P.pup.rimDir2 || [0.7, 0.5]));
    if (P.key) P.key.shadow.mapSize.setScalar(L.level ? 512 : 1024);
    G.ground = null; G.hist.length = 0;
    // the first frame of a new place compiles its shaders: do it now, not mid-move
    try { renderer.compile(P.scene, camera); } catch { /* compiled on the first draw instead */ }
  }

  // Screen point (CSS px) to the card's plane (z = 0 where the player stands), in meters.
  const toWorld = (sx, sy, z = 0) => ({ x: (sx - G.cx) / G.ppm, y: (P ? P.camH : 1.3) - (sy - G.yH) / G.ppm, z });

  function layout(dt) {
    const play = L.play, W = L.W, H = L.H, now = U.uTime.value;
    // meters to pixels where the player stands: a full body takes about 80% of the camera picture's height
    const ppm = (play.h * 0.8) / 1.75;
    // the floor line: the lowest foot seen in the last 1.2 s (so a jump doesn't lift the floor), eased
    let low = null;
    for (const p of L.players) if (p && p.foot != null) low = Math.max(low ?? -1e9, p.foot);
    if (low != null) G.hist.push([now, low]);
    while (G.hist.length && now - G.hist[0][0] > 1.2) G.hist.shift();
    const seen = G.hist.length ? Math.max(...G.hist.map((h) => h[1])) : null;
    const target = clamp(seen != null ? seen + 4 : play.y + play.h * 0.92, play.y + play.h * 0.55, play.y + play.h + 10);
    G.ground = G.ground == null ? target : G.ground + (target - G.ground) * (1 - Math.exp(-dt / 0.45));
    // the camera sees what a phone's camera sees (about 72° corner to corner of the picture), so the player
    // stands as far off as a real player would: about 2 m upright, 3 m sideways
    const f = Math.hypot(play.w, play.h) / 2 / Math.tan((36 * Math.PI) / 180), D = f / ppm;
    const hC = P.camH, yH = G.ground - hC * ppm, cx = W / 2, n = 0.1;
    Object.assign(G, { ppm, yH, cx, D });
    camera.position.set(0, hC, D); camera.rotation.set(0, 0, 0); camera.updateMatrixWorld();
    camera.projectionMatrix.makePerspective((-cx / f) * n, ((W - cx) / f) * n, (yH / f) * n, (-(H - yH) / f) * n, n, 1000);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    U.uCam.value.set(hC, D);
    const x0 = (play.x - cx) / ppm, x1 = (play.x + play.w - cx) / ppm, yt = hC - (play.y - yH) / ppm, yb = hC - (play.y + play.h - yH) / ppm;
    pup.position.set((x0 + x1) / 2, (yt + yb) / 2, 0); pup.scale.set(x1 - x0, yt - yb, 1);
    U.uPupRect.value.set(x0, x1, yb, yt);
    L.players.forEach((p, i) => { const b = blobs[i]; if (!b) return; b.visible = !!(p && p.fx != null); if (b.visible) { b.position.set((p.fx - cx) / ppm, 0.006, 0.05); b.scale.set(1.0, 0.42, 1); } });
    for (let i = L.players.length; i < blobs.length; i++) blobs[i].visible = false;
  }

  /* ---- sounds: the place's own, while sounds may play ---- */
  let amb = null, ambAt = 0;
  function stopAmb() { if (amb) { amb.stop(); amb = null; } }
  function ambience(now) {
    if (now - ambAt < 1000) return;
    ambAt = now;
    const ac = hooks.audio ? hooks.audio() : null;
    if (ac && !amb && P && P.ambience) amb = P.ambience(ac);
    else if (!ac && amb) stopAmb();
  }

  /* ---- the loop: its own, at most 30 frames a second (24 eased off) ---- */
  let raf = 0, running = false, lastDraw = 0, sizeKey = '';
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden || !P || !L.play || !L.W || !L.pup) return;
    if (lastDraw && now - lastDraw < 1000 / (L.level ? 24 : 30) - 4) return;
    const dt = Math.min(0.1, lastDraw ? (now - lastDraw) / 1000 : 0.016);
    lastDraw = now;
    U.uTime.value = (now - T0) / 1000;
    const pr = Math.min(L.level ? 1 : 1.5, L.dpr || 1), key = [L.W, L.H, pr].join('x');
    if (key !== sizeKey) { renderer.setPixelRatio(pr); renderer.setSize(L.W, L.H, false); sizeKey = key; }
    // the puppet's canvas: a new size means a new texture (WebGL can't grow one in place)
    const src = L.pup;
    if (!pupTex || src.width !== pupW || src.height !== pupH) {
      if (pupTex) pupTex.dispose();
      pupTex = new THREE.CanvasTexture(src); pupTex.colorSpace = THREE.SRGBColorSpace; pupTex.generateMipmaps = false; pupTex.minFilter = THREE.LinearFilter;
      pupW = src.width; pupH = src.height; U.uPup.value = pupTex; pupDepth.map = pupTex; pupDepth.needsUpdate = true;
      pupMat.map = pupTex; pupMat.needsUpdate = true;
      pupU.uPx.value.set(1 / pupW, 1 / pupH);
    } else if (L.pupDirty) pupTex.needsUpdate = true;
    L.pupDirty = false;
    layout(dt);
    P.update(dt, U.uTime.value, { toWorld, players: L.players, W: L.W, H: L.H });
    if (P.fog) { U.uFogCol.value.copy(P.fog.color); U.uFogDen.value = P.fog.density; }
    renderer.render(P.scene, camera);
    ambience(now);
  }

  return {
    place,
    get current() { return P && P.name; },
    // the page's latest: { W, H, dpr, play, players: [{ foot, fx, head: {x, y} }], pup (canvas), pupDirty }
    set(o) { if (o.pupDirty) L.pupDirty = true; const d = L.pupDirty; Object.assign(L, o); L.pupDirty = d; },
    pulse(kind, i = 0) {
      if (!P || !P.pulse || !L.play) return;
      const p = L.players[i] || L.players[0];
      const foot = p && p.fx != null ? { x: (p.fx - G.cx) / G.ppm, y: 0.02, z: 0.1 } : { x: 0, y: 0.02, z: 0.1 };
      const head = p && p.head ? toWorld(p.head.x, p.head.y, 0.15) : { x: foot.x, y: 1.6, z: 0.15 };
      P.pulse(kind, { foot, head, i, ac: hooks.audio ? hooks.audio() : null });
    },
    quality(level) {
      if (level === L.level) return;
      L.level = level; sizeKey = '';
      for (const p of Object.values(places)) {
        p.quality?.(level);
        if (p.key) { p.key.shadow.mapSize.setScalar(level ? 512 : 1024); if (p.key.shadow.map) { p.key.shadow.map.dispose(); p.key.shadow.map = null; } }
      }
    },
    start() { if (running) return; running = true; canvas.style.display = 'block'; lastDraw = 0; raf = requestAnimationFrame(frame); },
    // put away: no drawing, the canvas shrunk (iPhone gets the memory back), the sounds stopped
    sleep() { running = false; cancelAnimationFrame(raf); stopAmb(); canvas.style.display = 'none'; renderer.setSize(1, 1, false); sizeKey = ''; },
    get running() { return running; },
    debug: () => ({ place: P && P.name, info: renderer.info.render, mem: renderer.info.memory, programs: renderer.info.programs?.length, ground: G.ground, ppm: G.ppm }),
  };
}
