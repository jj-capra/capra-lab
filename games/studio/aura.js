/* Studio: the universe and your aura (WebGL 2, all drawn here, nothing to download).
   Three passes a frame:
   - the deep sky: a nebula (domain-warped noise in the universe's three colors, dark dust lanes), a
     spiral galaxy and a ringed planet, drawn at half size into its own texture and only every
     third frame (it drifts slowly), seen with a little parallax as your head moves;
   - the main pass: three layers of twinkling stars (nearer ones move more with your head, all of
     them stretch into hyperspace when a chorus lands), shockwave rings from claps, then you: cut out
     of the camera picture by the pose model's person mask, with an aura made from the mask blurred
     at several sizes, licking upward like flame, colored by the chord (or the universe), breathing
     with the kick and blazing when you sing; a rim of that light on your edges;
   - stardust: additive point sprites from your hands, claps, a hands-up supernova, your voice.
   Without a mask (no tracker) the picture is laid over the sky like a dream; without a camera an orb
   of light stands in for you. */

export const UNIVERSES = {
  glow: { name: 'Cosmic Glow', a: [0.5, 0.16, 0.72], b: [0.1, 0.26, 0.78], c: [1.0, 0.62, 0.78], deep: [0.02, 0.014, 0.07], aura: [1.0, 0.82, 0.58], shadow: [0.26, 0.12, 0.6], hi: [1.0, 0.86, 0.62] },
  starlight: { name: 'Starlight', a: [0.1, 0.24, 0.66], b: [0.3, 0.14, 0.6], c: [0.55, 0.85, 1.0], deep: [0.0, 0.008, 0.04], aura: [0.6, 0.88, 1.0], shadow: [0.12, 0.16, 0.55], hi: [0.62, 0.93, 1.0] },
  aurora: { name: 'Aurora', a: [0.04, 0.62, 0.48], b: [0.3, 0.18, 0.85], c: [0.3, 1.0, 0.62], deep: [0.0, 0.03, 0.055], aura: [0.45, 1.0, 0.8], shadow: [0.1, 0.18, 0.5], hi: [0.7, 1.0, 0.9] },
  supernova: { name: 'Supernova', a: [0.95, 0.36, 0.06], b: [0.7, 0.06, 0.28], c: [1.0, 0.82, 0.36], deep: [0.055, 0.012, 0.015], aura: [1.0, 0.72, 0.35], shadow: [0.4, 0.1, 0.4], hi: [1.0, 0.8, 0.5] },
  candy: { name: 'Cotton Candy', a: [1.0, 0.45, 0.75], b: [0.35, 0.65, 1.0], c: [1.0, 0.9, 0.55], deep: [0.06, 0.03, 0.09], aura: [1.0, 0.68, 0.88], shadow: [0.42, 0.18, 0.6], hi: [1.0, 0.82, 0.8] },
};
export const STYLES = { glow: 'Cosmic Glow', field: 'Aura Field' };
// a chord's color by where its root sits in the key (I gold, IV green, V blue, vi violet ...)
const HUE = [48, 0, 22, 32, 330, 140, 100, 205, 350, 275, 175, 300];
export function chordColor(deg) {
  const h = HUE[((deg % 12) + 12) % 12] / 360, s = 0.78, v = 1;
  const f = (n) => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5), f(3), f(1)];
}

const VS = `#version 300 es
in vec2 aP; out vec2 vUv;
void main(){ vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;

const NOISE = `
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p, float oct){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ if (float(i) >= oct) break; s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= 0.5; } return s; }
vec3 hue(float h){ return clamp(abs(fract(h + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
`;

/* the deep sky, half size, every third frame */
const SKY_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform vec2 uRes; uniform float uT, uOct;
uniform vec3 uCa, uCb, uCc;
${NOISE}
vec3 galaxy(vec2 p){
  float a = 0.5; p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p; p.y *= 2.6;
  float r = length(p), th = atan(p.y, p.x);
  float arms = 0.5 + 0.5 * cos(2.0 * th - 6.5 * log(r + 0.015) + uT * 0.03);
  float core = exp(-r * 38.0), disk = exp(-r * 8.0) * (0.25 + 0.75 * pow(arms, 3.0)) * (0.7 + 0.3 * vn(p * 40.0));
  return vec3(1.0, 0.88, 0.72) * core * 1.4 + mix(uCb, vec3(0.9, 0.85, 1.0), 0.55) * disk * 0.75;
}
vec4 planet(vec2 q, float R, out vec3 glow){
  float d = length(q);
  vec2 rq = mat2(cos(0.38), -sin(0.38), sin(0.38), cos(0.38)) * q;
  float rr = length(vec2(rq.x, rq.y * 4.2)) / R;
  float ring = smoothstep(1.32, 1.38, rr) * smoothstep(2.25, 2.1, rr) * (0.5 + 0.3 * sin(rr * 46.0) + 0.2 * sin(rr * 131.0));
  ring *= 1.0 - 0.8 * smoothstep(1.6, 1.64, rr) * smoothstep(1.74, 1.7, rr);
  vec3 rc = mix(uCc, vec3(1.0, 0.9, 0.75), 0.5);
  bool near = rq.y < 0.0;
  vec3 col = vec3(0.0); float cov = 0.0;
  if (!near) { col = rc * 0.6; cov = ring * 0.7; }
  if (d < R) {
    vec2 s = q / R; vec3 n = vec3(s, sqrt(max(0.0, 1.0 - dot(s, s))));
    float lam = max(0.0, dot(n, normalize(vec3(-0.6, 0.5, 0.65))));
    float band = sin(n.y * 18.0 + vn(n.xy * 6.0) * 3.0) * 0.5 + 0.5;
    vec3 base = mix(mix(uCa, uCc, band), vec3(0.95, 0.85, 0.75), 0.25);
    col = base * (0.05 + 0.95 * lam) + mix(uCb, vec3(0.6, 0.8, 1.0), 0.4) * pow(1.0 - n.z, 3.0) * 0.8;
    cov = 1.0;
  }
  if (near) { col = mix(col, rc * 0.75, ring * 0.85); cov = max(cov, ring * 0.85); }
  glow = mix(uCb, vec3(0.7, 0.85, 1.0), 0.5) * exp(-max(0.0, d - R) / (R * 0.18)) * 0.35 * (1.0 - cov);
  return vec4(col, cov);
}
void main(){
  vec2 uv = (vUv - 0.5) * 1.12 + 0.5;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * asp, uv.y - 0.5);
  vec2 q = vec2(fbm(p * 1.3 + vec2(0.0, uT * 0.012), uOct), fbm(p * 1.3 + vec2(5.2, 1.3) - uT * 0.009, uOct));
  float n = fbm(p * 1.7 + 2.3 * q + vec2(uT * 0.018, 0.0), uOct);
  float dust = fbm(p * 3.6 + q * 1.6 + 10.0, uOct - 1.0);
  vec3 col = mix(uCa, uCb, smoothstep(0.25, 0.75, q.x));
  col = mix(col, uCc, smoothstep(0.58, 0.95, n) * 0.85);
  float dens = smoothstep(0.32, 0.86, n) * (0.5 + 0.5 * q.y);
  dens *= 1.0 - 0.7 * smoothstep(0.45, 0.72, dust);
  col *= dens * 0.9;
  col += mix(uCc, vec3(1.0), 0.5) * pow(smoothstep(0.7, 1.0, n), 3.0) * 0.5;
  // a galaxy up one side, a ringed planet low on the other
  float side = asp > 1.0 ? 1.0 : 0.0;
  col += galaxy(p - vec2(-0.32 * asp + side * 0.1, 0.3));
  vec2 pc = vec2(0.36 * asp + 0.1 * (1.0 - side), -0.36 + side * 0.06);
  vec3 glow;
  vec4 pl = planet(p - pc, 0.13 + 0.03 * side, glow);
  col = mix(col, pl.rgb, pl.a) + glow;
  frag = vec4(col, 1.0);
}`;

const MAIN_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform vec2 uRes; uniform float uT, uOct;
uniform sampler2D uSky, uVid, uMask;
uniform vec4 uXf;
uniform float uHasVid, uHasMask, uHasPerson;
uniform vec3 uDeep, uAura;
uniform float uBeat, uVoice, uEnergy, uWarp, uNova, uDim;
uniform vec2 uHead;
uniform vec4 uRing[4];
uniform vec3 uOrb;
uniform vec3 uShadow, uHi;
uniform float uStyle, uBg;
${NOISE}
/* Cosmic Glow's grade: shadows slide into twilight indigo and violet, highlights into champagne gold
   (or cyan), blacks turn velvet; the middle (faces) barely moves */
vec3 grade(vec3 v){
  float l = dot(v, vec3(0.299, 0.587, 0.114));
  vec3 c = mix(vec3(l), v, 1.06);
  float sh = 1.0 - smoothstep(0.0, 0.55, l), hi = smoothstep(0.5, 1.0, l);
  c += (uShadow - dot(uShadow, vec3(0.3333))) * sh * 0.7;
  c += (uHi - dot(uHi, vec3(0.3333))) * hi * 0.45;
  c += uShadow * 0.16 * (1.0 - l);
  c = clamp(c, 0.0, 1.0);
  return mix(c, c * c * (3.0 - 2.0 * c), 0.18);
}
vec3 starLayer(vec2 p, float dens, float seed, float bright){
  vec2 g = p * dens, id = floor(g), f = fract(g) - 0.5;
  float r = h21(id + seed);
  if (r < 0.84) return vec3(0.0);
  vec2 off = vec2(h21(id + seed + 7.1), h21(id + seed + 3.7)) - 0.5;
  float d = length(f - off * 0.7);
  float k = (r - 0.84) / 0.16, size = 0.035 + 0.09 * k * k;
  float tw = 0.6 + 0.4 * sin(uT * (1.2 + 3.0 * h21(id + 9.0)) + r * 40.0);
  float s = pow(max(0.0, 1.0 - d / size), 2.2) + 0.25 * k * max(0.0, 1.0 - abs(f.x - off.x * 0.7) * 30.0) * max(0.0, 1.0 - abs(f.y - off.y * 0.7) * 4.0) * step(0.9, r);
  vec3 col = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.86, 0.7), h21(id + 2.3));
  return col * s * tw * bright;
}
vec3 stars(vec2 p, float boost){
  vec3 c = vec3(0.0);
  vec2 hp = (uHead - 0.5);
  c += starLayer(p + hp * 0.02, 70.0, 1.0, 0.7);
  c += starLayer(p + hp * 0.05, 34.0, 11.0, 1.0);
  c += starLayer(p + hp * 0.1, 15.0, 23.0, 1.25);
  return c * boost;
}
void main(){
  vec2 uv = vUv;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * asp, uv.y - 0.5);
  // shockwaves bend the sky
  vec2 bend = vec2(0.0); vec3 ringCol = vec3(0.0);
  for (int i = 0; i < 4; i++){
    vec4 R = uRing[i];
    if (R.w <= 0.0) continue;
    vec2 d = vec2((uv.x - R.x) * asp, uv.y - R.y);
    float l = length(d), band = exp(-pow((l - R.z) / 0.018, 2.0)) * R.w;
    bend += normalize(d + 1e-5) * band * 0.025;
    ringCol += mix(uAura, vec3(1.0), 0.4) * band * 0.9;
  }
  vec2 sp = p + bend;
  vec2 skyUv = (uv - 0.5) / 1.12 + 0.5 + (uHead - 0.5) * vec2(-0.03, -0.02) + bend;
  vec3 col = uDeep + texture(uSky, skyUv).rgb * (1.0 + 0.22 * uBeat * uEnergy + 0.6 * uNova);
  float sb = 1.0 + 0.5 * uBeat + 0.8 * uNova;
  if (uWarp > 0.01){
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 6; i++) acc += stars(sp * (1.0 - float(i) * 0.06 * uWarp), sb);
    col += acc / (6.0 - 4.0 * uWarp) ;
    col += uAura * 0.18 * uWarp * smoothstep(0.9, 0.0, length(p));
  } else col += stars(sp, sb);
  col += ringCol;

  // you
  float m = 0.0; vec3 person = vec3(0.0);
  float inten = 0.75 + 1.5 * uVoice + 0.6 * uBeat * (0.4 + uEnergy) + 2.0 * uNova;
  vec2 c = vec2((uHead.x - 0.5) * asp, uHead.y - 0.5 - 0.15);
  vec3 irid = hue(atan(p.y - c.y, p.x - c.x) / 6.2832 + uT * 0.04);
  vec3 auraCol = mix(uAura, irid, 0.28);
  vec3 starCol = mix(uHi, uAura, 0.45);   // the glow: starlight, leaning to the chord
  const vec3 LUM = vec3(0.299, 0.587, 0.114);
  if (uHasVid > 0.5){
    vec2 iuv = uv * uXf.xy + uXf.zw;
    float inside = step(0.0, iuv.x) * step(iuv.x, 1.0) * step(0.0, iuv.y) * step(iuv.y, 1.0);
    vec3 vid = texture(uVid, iuv).rgb;
    vec3 blur = textureLod(uVid, iuv, 3.5).rgb * 0.55 + textureLod(uVid, iuv, 5.2).rgb * 0.45;
    // halation: the bright parts bloom, starlit and a little nebula-colored
    vec3 hot = max(blur - 0.52, 0.0) * 1.6;
    float hl = dot(hot, vec3(0.3333));
    vec3 bloom = mix(hot, uHi * hl * 1.5, 0.5) + uAura * hl * 0.35;
    vec3 g = grade(vid);
    if (uHasMask > 0.5){
      float m0 = texture(uMask, iuv).r;
      m = smoothstep(0.38, 0.68, m0) * inside;
      float reach = 0.4 * uEnergy + 0.5 * uBeat * uEnergy + 0.6 * uNova;
      float b1 = textureLod(uMask, iuv, 1.8).r;
      float b3 = textureLod(uMask, iuv, 3.0).r;
      float outside = (1.0 - m) * inside;
      if (uStyle < 0.5){
        // a soft backlit halo of starlight, breathing with the beat, blooming when you sing
        float b4 = textureLod(uMask, iuv, 4.2 + reach * 0.4).r, b6 = textureLod(uMask, iuv, 6.0 + reach * 0.5).r;
        float shimmer = 0.85 + 0.15 * vn(vec2(uv.x * 5.0, uv.y * 3.0 - uT * 0.6));
        float halo = (b3 * 0.7 + b4 * 0.62 + b6 * 0.42) * outside * shimmer;
        col += starCol * halo * inten * 0.72;
      } else {
        // the aura field: color rippling out along your outline, flames licking up
        float n1 = vn(vec2(uv.x * 6.0, uv.y * 4.0 - uT * 1.5)), n2 = vn(vec2(uv.x * 12.0 + 5.0, uv.y * 8.0 - uT * 2.4));
        vec2 lick = vec2((n1 - 0.5) * 0.04, (n1 * 0.6 + n2 * 0.4) * 0.07 * (0.6 + inten * 0.3));
        float b3l = textureLod(uMask, iuv + lick * 0.5, 3.0).r;
        float b4 = textureLod(uMask, iuv + lick, 4.1 + reach * 0.4).r;
        float b5 = textureLod(uMask, iuv + lick * 1.3, 5.1 + reach * 0.5).r;
        float b6 = textureLod(uMask, iuv + lick * 1.6, 6.1 + reach * 0.5).r;
        vec3 c2 = mix(uAura.gbr, irid, 0.55);
        float field = b5 * 0.9 + b6 * 0.9, bands = 0.5 + 0.5 * sin(field * 24.0 - uT * 3.0 - uBeat * 1.5);
        vec3 aura = auraCol * (b3l * 0.85 + b4 * 0.55) * 1.05;
        aura += mix(auraCol, c2, bands) * smoothstep(0.02, 0.55, field) * (0.38 + 0.34 * bands) * 0.85;
        aura += mix(auraCol, vec3(1.0), 0.35) * smoothstep(0.2, 0.65, b4) * smoothstep(0.4, 0.92, n2 + n1 * 0.4) * 0.55;
        col += aura * outside * inten;
      }
      col += bloom * b3 * outside * 0.6;
      if (uBg > 0.5){
        // your own room, dimmed to twilight, stars in its shadows
        float l = dot(vid, LUM);
        col = (g * 0.55 + bloom * 0.3) * inside + col * (0.3 + 0.55 * (1.0 - l));
      }
      // you: graded, a starlight rim on your edges, your highlights blooming
      float rim = clamp(m - b1, 0.0, 1.0);
      person = g + bloom * 0.45 + starCol * rim * (0.9 + 0.5 * inten) + starCol * 0.03 * inten;
      if (uHasPerson < 0.5) m = 0.0;
    } else {
      // no cut-out (yet): the whole picture through the filter, the sky showing in its shadows
      float l = dot(vid, LUM);
      col = (g + bloom * 0.5) * inside + col * (0.25 + 0.5 * (1.0 - l * inside));
    }
  } else if (uOrb.z > 0.0){
    vec2 oc = vec2((uOrb.x - 0.5) * asp, uOrb.y - 0.5);
    float d = length(p - oc), R = uOrb.z * (1.0 + 0.06 * uBeat + 0.1 * uVoice);
    float sw = vn(vec2(atan(p.y - oc.y, p.x - oc.x) * 3.0 + uT * 0.8, d * 18.0 - uT * 1.5));
    m = smoothstep(R, R - 0.004, d);
    person = mix(starCol, vec3(1.0), 0.55 + 0.3 * sw) * (0.8 + 0.4 * (1.0 - d / R));
    col += starCol * exp(-max(0.0, d - R) / (R * (0.5 + 0.4 * sw))) * inten * 0.7;
  }
  col = 1.0 - exp(-col * 1.15);
  col = mix(col, person, m);
  float vig = pow(length(uv - 0.5) * 1.3, 2.6);
  col = col * (1.0 - 0.4 * vig) + uShadow * 0.03 * vig;
  col *= uDim;
  col += (h21(gl_FragCoord.xy + fract(uT) * 100.0) - 0.5) * 0.018;
  frag = vec4(col, 1.0);
}`;

const PTS_VS = `#version 300 es
in vec2 aP; in float aS; in vec4 aC; in float aK; out vec4 vC; out float vK;
void main(){ gl_Position = vec4(aP * 2.0 - 1.0, 0.0, 1.0); gl_PointSize = aS; vC = aC; vK = aK; }`;
const PTS_FS = `#version 300 es
precision mediump float;
in vec4 vC; in float vK; out vec4 frag;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = dot(q, q);
  if (vK > 0.5){   // bokeh: a soft disc with a brighter rim, like an out-of-focus light
    float d = sqrt(r), disc = smoothstep(1.0, 0.86, d) * (0.5 + 0.5 * smoothstep(0.55, 0.95, d));
    float a = disc * vC.a;
    frag = vec4(vC.rgb * a, a); return;
  }
  float core = exp(-r * 7.0);
  float star = exp(-abs(q.x) * 12.0) * exp(-abs(q.y) * 2.2) + exp(-abs(q.y) * 12.0) * exp(-abs(q.x) * 2.2);
  float a = (core + star * 0.45) * vC.a;
  frag = vec4(vC.rgb * a, a);
}`;

function compile(gl, vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

const MAXP = 1400, PKEYS = ['kind', 'x', 'y', 'vx', 'vy', 'life', 'max', 'size', 'r', 'g', 'b', 'rise'];
export function createUniverse(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  let P = null, lost = false;
  const S = { w: 1, h: 1, frame: 0, sky: null, skyFbo: null, skyW: 0, skyH: 0, vid: null, mask: null, vidOk: false, maskOk: false, maskW: 0, maskH: 0, xf: [1, -1, 0, 1], oct: 5, quad: null, pbuf: null, pvao: null, qvao: null };
  const parts = { n: 0, kind: new Float32Array(MAXP), x: new Float32Array(MAXP), y: new Float32Array(MAXP), vx: new Float32Array(MAXP), vy: new Float32Array(MAXP), life: new Float32Array(MAXP), max: new Float32Array(MAXP), size: new Float32Array(MAXP), r: new Float32Array(MAXP), g: new Float32Array(MAXP), b: new Float32Array(MAXP), rise: new Float32Array(MAXP) };
  const pdata = new Float32Array(MAXP * 8);
  const rings = [];

  function texture(filter) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function build() {
    P = { sky: compile(gl, VS, SKY_FS), main: compile(gl, VS, MAIN_FS), pts: compile(gl, PTS_VS, PTS_FS) };
    S.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, S.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    S.qvao = gl.createVertexArray(); gl.bindVertexArray(S.qvao);
    for (const pr of [P.sky, P.main]) { const loc = gl.getAttribLocation(pr.p, 'aP'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); }
    S.pbuf = gl.createBuffer(); S.pvao = gl.createVertexArray(); gl.bindVertexArray(S.pvao); gl.bindBuffer(gl.ARRAY_BUFFER, S.pbuf);
    gl.bufferData(gl.ARRAY_BUFFER, pdata.byteLength, gl.DYNAMIC_DRAW);
    const a = (n) => gl.getAttribLocation(P.pts.p, n);
    gl.enableVertexAttribArray(a('aP')); gl.vertexAttribPointer(a('aP'), 2, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(a('aS')); gl.vertexAttribPointer(a('aS'), 1, gl.FLOAT, false, 32, 8);
    gl.enableVertexAttribArray(a('aC')); gl.vertexAttribPointer(a('aC'), 4, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(a('aK')); gl.vertexAttribPointer(a('aK'), 1, gl.FLOAT, false, 32, 28);
    gl.bindVertexArray(null);
    S.vid = texture(gl.LINEAR_MIPMAP_LINEAR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255])); gl.generateMipmap(gl.TEXTURE_2D);
    S.mask = texture(gl.LINEAR_MIPMAP_LINEAR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([0])); gl.generateMipmap(gl.TEXTURE_2D);
    S.maskW = 1; S.maskH = 1;
    S.sky = texture(gl.LINEAR); S.skyFbo = gl.createFramebuffer(); S.skyW = 0;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    S.vidOk = false; S.maskOk = false; S.frame = 0;
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; try { build(); } catch (e) { console.error(e); } });
  try { build(); } catch (e) { console.error('studio: the universe would not build', e); return null; }

  function sizeSky() {
    const w = Math.max(2, Math.round(S.w / 2)), h = Math.max(2, Math.round(S.h / 2));
    if (w === S.skyW && h === S.skyH) return;
    S.skyW = w; S.skyH = h;
    gl.bindTexture(gl.TEXTURE_2D, S.sky); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, S.skyFbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, S.sky, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    S.frame = 0;
  }

  function spawn(x, y, vx, vy, life, size, col, rise = 0.04, kind = 0) {
    let i = parts.n;
    if (i >= MAXP) { i = Math.floor(Math.random() * MAXP); } else parts.n++;
    parts.kind[i] = kind; parts.x[i] = x; parts.y[i] = y; parts.vx[i] = vx; parts.vy[i] = vy; parts.life[i] = life; parts.max[i] = life; parts.size[i] = size;
    parts.r[i] = col[0]; parts.g[i] = col[1]; parts.b[i] = col[2]; parts.rise[i] = rise;
  }
  const jitter = (c, k = 0.25) => [Math.min(1, c[0] + (Math.random() - 0.5) * k + 0.15), Math.min(1, c[1] + (Math.random() - 0.5) * k + 0.15), Math.min(1, c[2] + (Math.random() - 0.5) * k + 0.15)];

  const api = {
    gl, get lost() { return lost; },
    resize(w, h) {
      w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      S.w = w; S.h = h;
      sizeSky();
    },
    quality(level) { S.oct = level >= 2 ? 3 : level >= 1 ? 4 : 5; S.frame = 0; },
    // the camera frame (and the transform from screen to picture: picture = screen * xy + zw)
    video(src, xf) {
      if (lost) return;
      gl.bindTexture(gl.TEXTURE_2D, S.vid);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D); S.vidOk = true; } catch { /* not ready yet */ }
      if (xf) S.xf = xf;
    },
    mask(u8, w, h) {
      if (lost) return;
      gl.bindTexture(gl.TEXTURE_2D, S.mask);
      if (w !== S.maskW || h !== S.maskH) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, u8); S.maskW = w; S.maskH = h; }
      else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RED, gl.UNSIGNED_BYTE, u8);
      gl.generateMipmap(gl.TEXTURE_2D);
      S.maskOk = true;
    },
    noVideo() { S.vidOk = false; S.maskOk = false; },
    noMask() { S.maskOk = false; },
    ring(x, y) { rings.push({ x, y: 1 - y, t: 0 }); if (rings.length > 4) rings.shift(); },
    burst(x, y, n, col, speed = 1, size = 1) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = (0.15 + Math.random() * 0.9) * speed;
        spawn(x, 1 - y, Math.cos(a) * v * S.h / S.w, Math.sin(a) * v, 0.6 + Math.random() * 1.1, (5 + Math.random() * 14) * size * (S.h / 900), jitter(col, 0.4), 0.02);
      }
    },
    // stardust trailing a hand (x, y screen 0..1 top down; speed in screen heights a second)
    trail(h, col, dt) {
      const n = Math.min(6, Math.floor(1 + h.speed * 9 * (dt * 30)) + (Math.random() < 0.5 ? 1 : 0));
      for (let i = 0; i < n; i++) {
        spawn(h.x + (Math.random() - 0.5) * 0.012, 1 - h.y + (Math.random() - 0.5) * 0.012, -h.vx * 0.12 + (Math.random() - 0.5) * 0.05, h.vy * 0.12 + (Math.random() - 0.5) * 0.05,
          0.5 + Math.random() * 0.9, (3 + Math.random() * 8 + h.speed * 6) * (S.h / 900), jitter(col), 0.05);
      }
    },
    motes(x, y, n, col) { for (let i = 0; i < n; i++) spawn(x + (Math.random() - 0.5) * 0.08, 1 - y + (Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.06, 0.05 + Math.random() * 0.12, 1 + Math.random() * 1.4, (2.5 + Math.random() * 6) * (S.h / 900), jitter(col, 0.3), 0.06); },
    get particles() { return parts.n; },

    render(st) {
      if (lost || !P) return;
      const dt = Math.min(0.1, st.dt || 1 / 30);
      S.frame++;
      // the deep sky, every third frame
      if (S.frame % 3 === 1 || S.frame < 3) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, S.skyFbo); gl.viewport(0, 0, S.skyW, S.skyH);
        gl.useProgram(P.sky.p); gl.bindVertexArray(S.qvao);
        const u = P.sky.u, pal = st.palette;
        gl.uniform2f(u.uRes, S.skyW, S.skyH); gl.uniform1f(u.uT, st.t); gl.uniform1f(u.uOct, S.oct);
        gl.uniform3fv(u.uCa, pal.a); gl.uniform3fv(u.uCb, pal.b); gl.uniform3fv(u.uCc, pal.c);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.viewport(0, 0, S.w, S.h);
      gl.disable(gl.BLEND);
      gl.useProgram(P.main.p); gl.bindVertexArray(S.qvao);
      const u = P.main.u, pal = st.palette;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.sky); gl.uniform1i(u.uSky, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.vid); gl.uniform1i(u.uVid, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, S.mask); gl.uniform1i(u.uMask, 2);
      gl.uniform2f(u.uRes, S.w, S.h); gl.uniform1f(u.uT, st.t); gl.uniform1f(u.uOct, S.oct);
      gl.uniform4fv(u.uXf, S.xf);
      const hasVid = S.vidOk && st.camera !== false;
      gl.uniform1f(u.uHasVid, hasVid ? 1 : 0); gl.uniform1f(u.uHasMask, hasVid && S.maskOk && st.cutout !== false ? 1 : 0); gl.uniform1f(u.uHasPerson, 1);
      gl.uniform3fv(u.uDeep, pal.deep); gl.uniform3fv(u.uAura, st.aura || pal.aura);
      gl.uniform3fv(u.uShadow, pal.shadow || [0.25, 0.12, 0.6]); gl.uniform3fv(u.uHi, pal.hi || [1, 0.86, 0.62]);
      gl.uniform1f(u.uStyle, st.style === 'field' ? 1 : 0); gl.uniform1f(u.uBg, st.bg === 'room' ? 1 : 0);
      gl.uniform1f(u.uBeat, st.beat || 0); gl.uniform1f(u.uVoice, st.voice || 0); gl.uniform1f(u.uEnergy, st.energy ?? 0.5);
      gl.uniform1f(u.uWarp, st.warp || 0); gl.uniform1f(u.uNova, st.nova || 0); gl.uniform1f(u.uDim, st.dim ?? 1);
      const head = st.head || { x: 0.5, y: 0.35 };
      gl.uniform2f(u.uHead, head.x, 1 - head.y);
      const rv = new Float32Array(16);
      for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > 1.2) rings.splice(i, 1); }
      rings.forEach((r, i) => { rv[i * 4] = r.x; rv[i * 4 + 1] = r.y; rv[i * 4 + 2] = r.t * 0.75; rv[i * 4 + 3] = Math.max(0, 1 - r.t / 1.2); });
      gl.uniform4fv(u.uRing, rv);
      const orb = !hasVid && st.orb ? st.orb : null;
      gl.uniform3f(u.uOrb, orb ? orb.x : 0.5, orb ? 1 - orb.y : 0.5, orb ? orb.r : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // the air: soft bokeh and fine starlight flecks drifting up through the frame
      if (st.air !== false) {
        let nb = 0, nf = 0;
        for (let i = 0; i < parts.n; i++) { if (parts.kind[i] > 0.5) nb++; else if (parts.kind[i] > 0) nf++; }
        const hi = pal.hi || pal.aura, cols = [hi, pal.c, pal.aura];
        if (nb < 16 && Math.random() < 0.25) spawn(Math.random(), Math.random() * 0.9, (Math.random() - 0.5) * 0.01, 0.006 + Math.random() * 0.01, 7 + Math.random() * 8, (20 + Math.random() * 46) * (S.h / 900), cols[(Math.random() * 3) | 0], 0, 1);
        if (nf < 40 && Math.random() < 0.5) spawn(Math.random(), Math.random(), (Math.random() - 0.5) * 0.006, 0.004 + Math.random() * 0.01, 5 + Math.random() * 6, (2 + Math.random() * 3.5) * (S.h / 900), jitter(hi, 0.2), 0, 0.25);
      }
      // stardust
      let k = 0;
      for (let i = 0; i < parts.n; i++) {
        parts.life[i] -= dt;
        if (parts.life[i] <= 0) {
          const j = --parts.n;
          for (const key of PKEYS) parts[key][i] = parts[key][j];
          i--; continue;
        }
        if (parts.kind[i] === 0) { const damp = Math.pow(0.35, dt); parts.vx[i] *= damp; parts.vy[i] = parts.vy[i] * damp + parts.rise[i] * dt; }
        parts.x[i] += parts.vx[i] * dt; parts.y[i] += parts.vy[i] * dt;
        const f = parts.life[i] / parts.max[i], bokeh = parts.kind[i] > 0.5;
        const tw = bokeh ? Math.min(1, (1 - f) * 4, f * 3) : 0.75 + 0.25 * Math.sin((st.t + i) * 9);
        pdata[k++] = parts.x[i]; pdata[k++] = parts.y[i]; pdata[k++] = parts.size[i] * (bokeh ? 1 : 0.5 + 0.5 * f);
        pdata[k++] = parts.r[i]; pdata[k++] = parts.g[i]; pdata[k++] = parts.b[i]; pdata[k++] = bokeh ? tw * 0.12 : parts.kind[i] > 0 ? tw * Math.min(1, (1 - f) * 5, f * 3) * 0.9 : Math.min(1, f * 1.6) * tw;
        pdata[k++] = parts.kind[i];
      }
      if (parts.n) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(P.pts.p); gl.bindVertexArray(S.pvao); gl.bindBuffer(gl.ARRAY_BUFFER, S.pbuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, pdata.subarray(0, parts.n * 8));
        gl.drawArrays(gl.POINTS, 0, parts.n);
        gl.disable(gl.BLEND);
      }
      gl.bindVertexArray(null);
    },
  };
  return api;
}
