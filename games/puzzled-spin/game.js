// Puzzled Spin: the page. The puzzle maker and the rules are in logic.mjs.
// A run is five puzzles at one grade level, each against its own clock (JC's spec, Nov 12 2026).
import { TIERS, tierOf, PER_RUN, puzzle, check, looksSame, hash, labDay, dayNumber, dailySeed,
  STREAK_GAP, streakMult, solvePoints, isFast } from './logic.mjs';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const prefs = Object.assign({ tier: 1, sound: true }, store.get('ps.prefs', {}));
if (!TIERS.some((t) => t.id === prefs.tier)) prefs.tier = 1;
const savePrefs = () => store.set('ps.prefs', prefs);
const num = (n) => Number(n).toLocaleString('en-US');

/* ---------- how the patterns look ---------- */
const SOLID = [
  { color: '#FF4D4D', shape: 'circle' }, { color: '#3D7BFF', shape: 'square' },
  { color: '#FFD23F', shape: 'star' }, { color: '#3DDC84', shape: 'triangle' },
];
const PATTERN_COLORS = ['#3D7BFF', '#FF5A5A', '#FFD23F', '#3DDC84'];
const STYLES = ['stripes', 'zigzag', 'dots', 'solid'];
const patternStyle = (i) => STYLES[(Math.floor(i / 2) + (i % 2) * 2) % 4];
const HALF_COLORS = ['#FFD23F', '#FF3D8B', '#29D3F0', '#5BE38A', '#FF9A4D', '#8C6CFF'];

(function defs() {
  const d = $('defs');
  let out = '';
  for (let i = 0; i < 8; i++) {
    const c = PATTERN_COLORS[Math.floor(i / 2)], st = patternStyle(i);
    let mark = '';
    if (st === 'stripes') mark = '<path d="M-2 2l4-4M0 12L12 0M10 14l4-4" stroke="#120E18" stroke-width="2.4"/>';
    if (st === 'zigzag') mark = '<path d="M0 8l3-5 3 5 3-5 3 5" fill="none" stroke="#120E18" stroke-width="1.9" stroke-linejoin="round"/>';
    if (st === 'dots') mark = '<circle cx="3" cy="3" r="1.9" fill="#120E18"/><circle cx="9" cy="9" r="1.9" fill="#120E18"/>';
    out += `<pattern id="pt${i}" patternUnits="userSpaceOnUse" width="12" height="12"><rect width="12" height="12" fill="${c}"/>${mark}</pattern>`;
  }
  d.innerHTML = out;
})();

// Triangles from the center to each edge (whole, or split in two halves listed clockwise).
const TRI = ['0,0 100,0 50,50', '100,0 100,100 50,50', '100,100 0,100 50,50', '0,100 0,0 50,50'];
const HALF = [
  ['0,0 50,0 50,50', '50,0 100,0 50,50'],
  ['100,0 100,50 50,50', '100,50 100,100 50,50'],
  ['100,100 50,100 50,50', '50,100 0,100 50,50'],
  ['0,100 0,50 50,50', '0,50 0,0 50,50'],
];
const CENTROID = [[50, 17], [83, 50], [50, 83], [17, 50]];
function symbol(shape, x, y) {
  const s = 'fill="#FFF8EC" stroke="#120E18" stroke-width="2"';
  if (shape === 'circle') return `<circle cx="${x}" cy="${y}" r="7" ${s}/>`;
  if (shape === 'square') return `<rect x="${x - 6.5}" y="${y - 6.5}" width="13" height="13" rx="1.5" ${s}/>`;
  if (shape === 'triangle') return `<path d="M${x} ${y - 8}L${x + 8} ${y + 6}H${x - 8}z" ${s} stroke-linejoin="round"/>`;
  const pts = [];
  for (let k = 0; k < 10; k++) { const r = k % 2 ? 4 : 9, a = Math.PI / 5 * k - Math.PI / 2; pts.push(`${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${pts.join(' ')}" ${s} stroke-linejoin="round"/>`;
}
function tileSvg(kind, edges) {
  let body = '';
  edges.forEach((e, s) => {
    if (kind === 'solid') {
      body += `<polygon points="${TRI[s]}" fill="${SOLID[e].color}"/>`;
      body += symbol(SOLID[e].shape, ...CENTROID[s]);
    } else if (kind === 'pattern') {
      body += `<polygon points="${TRI[s]}" fill="url(#pt${e})"/>`;
    } else {
      const [a, b] = String(e).split('.').map(Number);
      body += `<polygon points="${HALF[s][0]}" fill="${HALF_COLORS[a]}"/><polygon points="${HALF[s][1]}" fill="${HALF_COLORS[b]}"/>`;
    }
  });
  const lines = '<path d="M0 0L100 100M100 0L0 100" stroke="#120E18" stroke-width="2.5"/>'
    + (kind === 'duo' || kind === 'twin' ? '<path d="M50 0V100M0 50H100" stroke="#120E18" stroke-width="1.2" opacity="0.55"/>' : '');
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${body}${lines}</svg>`;
}

/* ---------- sound: tiny blips, made on the spot ---------- */
let ac = null;
function tone(freq, dur = 0.08, type = 'triangle', vol = 0.05, at = 0) {
  if (!prefs.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* no audio here */ }
}
const sfx = {
  spin: () => tone(520, 0.04, 'square', 0.025),
  lock: (k = 0) => { tone(660 + k * 60, 0.09); tone(990 + k * 60, 0.12, 'triangle', 0.05, 0.07); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, i * 0.09)),
  miss: () => { tone(300, 0.2, 'sawtooth', 0.04); tone(200, 0.3, 'sawtooth', 0.04, 0.15); },
  tick: () => tone(880, 0.03, 'sine', 0.03),
};
function paintSound() {
  $('soundBtn').setAttribute('aria-pressed', String(prefs.sound));
  $('soundBtn').innerHTML = prefs.sound
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
}

/* ---------- screens ---------- */
function show(name) {
  for (const s of document.querySelectorAll('[data-screen]')) s.hidden = s.dataset.screen !== name;
  scrollTo(0, 0);
}

/* ---------- home ---------- */
function tierBlurb(t) {
  const bits = [`${t.n}×${t.n} grid`, `${t.types[0]}–${t.types[1]} patterns`, `${t.time} seconds a puzzle`];
  if (t.id === 1) bits.push('only one or two tiles start turned');
  if (t.lineBonus) bits.push(`+${t.lineBonus}s for every row or column you lock`);
  if (t.streak) bits.push('Spin Streak points for quick locks');
  if (t.kind === 'duo') bits.push('two-tone edges where direction matters');
  if (t.kind === 'twin') bits.push('mirror-image twins');
  return bits.join(' · ');
}
function dailyState() {
  const day = labDay();
  const st = store.get('ps.daily', {});
  return st.day === day ? st : { day, tiers: {} };
}
function paintHome() {
  const seg = $('tiers');
  seg.innerHTML = '';
  for (const t of TIERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(t.id === prefs.tier));
    b.setAttribute('aria-label', `${t.name}, grades ${t.grades}`);
    b.innerHTML = `<b>${t.short}</b><small>${t.name}</small>`;
    b.onclick = () => { prefs.tier = t.id; savePrefs(); paintHome(); };
    seg.appendChild(b);
  }
  const t = tierOf(prefs.tier);
  $('tierInfo').textContent = tierBlurb(t);
  const no = dayNumber();
  const d = dailyState().tiers[t.id];
  $('dailySub').textContent = d ? `No. ${no} · done: ${num(d.score)} pts, ${d.solved}/${PER_RUN} locked` : `No. ${no} · the same five for everyone`;
  const best = store.get('ps.best', {})[t.id];
  $('bestLine').textContent = best ? `Your best ${t.name} run: ${num(best)} points.` : '';
  // the logo: four little K–1 tiles
  const p = puzzle(1, hash(labDay()));
  $('logoTiles').innerHTML = p.tiles.flat().map((e) => tileSvg('solid', e)).join('');
  paintSound();
}

/* ---------- a run ---------- */
let run = null;
let raf = 0;

function startRun(kind) {
  const tier = prefs.tier, no = dayNumber();
  if (kind === 'daily') {
    const d = dailyState().tiers[tier];
    if (d) { showResults({ ...d, kind: 'daily', tier, no, replay: true }); return; }
  }
  const base = (Math.random() * 2 ** 32) >>> 0;
  run = { kind, tier, no, at: Date.now(), i: 0, score: 0, combo: 0, marks: [], solved: 0,
    seed: (i) => (kind === 'daily' ? dailySeed(tier, no, i) : hash(`${base}:${i}`)) };
  if (kind === 'daily') {
    // a daily run counts once started: leaving it ends it
    const st = dailyState();
    st.tiers[tier] = { score: 0, solved: 0, marks: [], started: true };
    store.set('ps.daily', st);
  }
  show('play');
  $('backText').textContent = 'MENU';
  $('playBack').classList.remove('arm');
  startPuzzle();
}

function startPuzzle() {
  const t = tierOf(run.tier);
  const p = puzzle(run.tier, run.seed(run.i));
  run.p = p;
  run.q = p.start.map((row) => row.slice());
  run.deg = p.start.map((row) => row.map((q) => q * 90));
  run.ever = new Set();
  run.lines = new Set();
  run.streak = 0;
  run.lastLock = 0;
  run.over = false;
  run.timeLeft = t.time;
  run.endsAt = 0;
  const board = $('board');
  board.className = 'board';
  board.style.gridTemplateColumns = `repeat(${p.n}, 1fr)`;
  board.style.setProperty('--gap', p.n >= 5 ? '4px' : '6px');
  board.innerHTML = '';
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell';
    b.dataset.r = r; b.dataset.c = c;
    b.setAttribute('aria-label', `Tile, row ${r + 1}, column ${c + 1}`);
    b.innerHTML = tileSvg(t.kind, p.tiles[r][c]) + '<i class="side s0"></i><i class="side s1"></i><i class="side s2"></i><i class="side s3"></i>';
    b.querySelector('svg').style.transform = `rotate(${run.deg[r][c]}deg)`;
    wire(b, r, c);
    board.appendChild(b);
  }
  $('which').textContent = `PUZZLE ${run.i + 1}/${PER_RUN}`;
  $('score').textContent = num(run.score);
  $('hint').textContent = t.id === 1 ? 'Find the tile that\'s turned wrong and tap it to spin it ↻' : 'Tap a tile to spin it ↻ · swipe left to spin it back ↺';
  paintMarks();
  paintCombo();
  $('streak').classList.remove('on');
  paintTime();
  refresh(false);
  // a quick GO! then the clock starts
  const ov = $('overlay');
  ov.className = 'overlay go';
  ov.innerHTML = `<h2>${run.i === 0 ? 'SPIN!' : 'GO!'}</h2>`;
  ov.hidden = false;
  run.ready = false;
  setTimeout(() => {
    if (!run || run.over) return;
    ov.hidden = true;
    run.ready = true;
    run.endsAt = performance.now() + t.time * 1000;
    loop();
  }, 650);
}

function wire(b, r, c) {
  let x0 = 0, y0 = 0, down = false;
  b.addEventListener('pointerdown', (e) => { down = true; x0 = e.clientX; y0 = e.clientY; });
  b.addEventListener('pointerup', (e) => {
    if (!down) return;
    down = false;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    turn(r, c, Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy) && dx < 0 ? -1 : 1);
  });
  b.addEventListener('pointercancel', () => { down = false; });
  // keyboard: Enter or Space spins clockwise, Shift spins back
  b.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(r, c, e.shiftKey ? -1 : 1); }
  });
  b.addEventListener('click', (e) => { if (e.detail === 0) e.preventDefault(); });
}

function turn(r, c, dir) {
  if (!run || run.over || !run.ready) return;
  run.deg[r][c] += dir * 90;
  run.q[r][c] = (((run.deg[r][c] / 90) % 4) + 4) % 4;
  const cell = $('board').children[r * run.p.n + c];
  cell.querySelector('svg').style.transform = `rotate(${run.deg[r][c]}deg)`;
  sfx.spin();
  refresh(true);
}

// Paint the seams and locks, pay for new locks and lines, and finish when the grid locks.
function refresh(live) {
  const p = run.p, t = tierOf(run.tier);
  const st = check(p, run.q);
  const cells = $('board').children;
  let newLocks = [];
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
    const cell = cells[r * p.n + c];
    const sides = cell.querySelectorAll('.side');
    st.side[r][c].forEach((ok, s) => sides[s].classList.toggle('on', ok === true));
    const was = cell.classList.contains('locked');
    cell.classList.toggle('locked', st.locked[r][c]);
    if (!live && st.locked[r][c]) run.ever.add(`${r},${c}`); // tiles that start locked pay nothing
    if (live && st.locked[r][c] && !was) {
      cell.classList.remove('pop'); void cell.offsetWidth; cell.classList.add('pop');
      const k = `${r},${c}`;
      if (!run.ever.has(k)) { run.ever.add(k); newLocks.push(cell); }
    }
  }
  if (!live) return;
  if (newLocks.length) {
    const now = performance.now();
    run.streak = now - run.lastLock <= STREAK_GAP ? run.streak + newLocks.length : newLocks.length;
    run.lastLock = now;
    const mult = streakMult(run.tier, run.streak);
    for (const cell of newLocks) {
      const pts = 10 * mult;
      run.score += pts;
      floatAt(cell, `+${pts}${mult > 1 ? ` x${mult}` : ''}`);
    }
    sfx.lock(Math.min(4, run.streak));
    const sb = $('streak');
    if (t.streak && mult > 1) { sb.textContent = `SPIN STREAK x${mult}`; sb.classList.add('on'); clearTimeout(run.streakT); run.streakT = setTimeout(() => sb.classList.remove('on'), STREAK_GAP); }
    $('score').textContent = num(run.score);
  }
  // rows and columns that lock for the first time buy time
  if (t.lineBonus && !st.done) {
    let gained = 0;
    st.rows.forEach((ok, i) => { if (ok && !run.lines.has('r' + i)) { run.lines.add('r' + i); gained += t.lineBonus; } });
    st.cols.forEach((ok, i) => { if (ok && !run.lines.has('c' + i)) { run.lines.add('c' + i); gained += t.lineBonus; } });
    if (gained) { run.endsAt += gained * 1000; floatAt($('timePill'), `+${gained}s`); }
  }
  if (st.done) solvedPuzzle();
}

function floatAt(el, text) {
  const r = el.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'float';
  f.textContent = text;
  f.style.left = `${r.left + r.width / 2}px`;
  f.style.top = `${r.top + r.height / 2}px`;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 950);
}

function paintTime() {
  const s = Math.max(0, Math.ceil(run.timeLeft));
  const pill = $('timePill');
  if (pill.textContent !== String(s)) { pill.textContent = String(s); if (s <= 5 && s > 0 && run.ready && !run.over) sfx.tick(); }
  pill.classList.toggle('low', s <= 10 && !run.over);
}
function loop() {
  cancelAnimationFrame(raf);
  const step = () => {
    if (!run || run.over || !run.ready) return;
    run.timeLeft = (run.endsAt - performance.now()) / 1000;
    paintTime();
    if (run.timeLeft <= 0) { timeUp(); return; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}
// Hidden tab: the clock waits.
document.addEventListener('visibilitychange', () => {
  if (!run || run.over || !run.ready) return;
  if (document.hidden) { run.pausedAt = performance.now(); cancelAnimationFrame(raf); }
  else if (run.pausedAt) { run.endsAt += performance.now() - run.pausedAt; run.pausedAt = 0; loop(); }
});

function paintMarks() {
  const box = $('marks');
  box.innerHTML = '';
  for (let i = 0; i < PER_RUN; i++) {
    const m = run.marks[i];
    const el = document.createElement('i');
    el.className = m === 'fast' ? 'fast' : m === 'ok' ? 'ok' : m === 'miss' ? 'miss' : i === run.i ? 'now' : '';
    el.textContent = m === 'fast' ? '⚡' : m === 'ok' ? '✓' : m === 'miss' ? '✗' : '';
    box.appendChild(el);
  }
}
function paintCombo() {
  const cb = $('combo');
  const m = Math.min(3, 1 + 0.5 * run.combo);
  cb.textContent = `COMBO x${m}`;
  cb.classList.toggle('on', run.combo > 0);
}

function solvedPuzzle() {
  const t = tierOf(run.tier);
  run.over = true;
  cancelAnimationFrame(raf);
  const left = Math.max(0, run.timeLeft);
  const pts = solvePoints(left, run.combo);
  const fast = isFast(left, t.time);
  run.score += pts;
  run.solved++;
  run.marks[run.i] = fast ? 'fast' : 'ok';
  run.combo = fast ? run.combo + 1 : 0;
  $('board').classList.add('done');
  sfx.win();
  $('score').textContent = num(run.score);
  $('timePill').classList.remove('low');
  paintMarks();
  between(fast ? 'LIGHTNING!' : 'LOCKED!', `+${num(pts)}`, `${Math.ceil(left)} seconds left${fast ? ' · fast solve, combo up!' : ''}`);
}
function timeUp() {
  run.over = true;
  run.timeLeft = 0;
  paintTime();
  run.marks[run.i] = 'miss';
  run.combo = 0;
  sfx.miss();
  paintMarks();
  // show the answer: every tile spins home
  const p = run.p, cells = $('board').children;
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
    const q = run.q[r][c];
    if (q !== 0 && !looksSame(p.tiles[r][c], q)) {
      run.deg[r][c] += (4 - q) * 90 > 180 ? -q * 90 : (4 - q) * 90;
      run.q[r][c] = 0;
      cells[r * p.n + c].querySelector('svg').style.transform = `rotate(${run.deg[r][c]}deg)`;
    }
  }
  setTimeout(() => { refresh(false); between('TIME!', '', 'Here\'s how it locks. Combo reset.'); }, 450);
}
function between(title, pts, line) {
  saveDailyProgress();
  const last = run.i >= PER_RUN - 1;
  const ov = $('overlay');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="card"><h2>${title}</h2>${pts ? `<div class="pts">${pts}</div>` : ''}<p>${line}</p><button class="btn big" type="button" id="nextBtn">${last ? 'RESULTS ▸' : 'NEXT PUZZLE ▸'}</button></div>`;
  ov.hidden = false;
  const btn = $('nextBtn');
  btn.onclick = () => { ov.hidden = true; if (last) finish(); else { run.i++; startPuzzle(); } };
  setTimeout(() => btn.focus({ preventScroll: true }), 50);
}
function saveDailyProgress() {
  if (run.kind !== 'daily') return;
  const st = dailyState();
  st.tiers[run.tier] = { score: run.score, solved: run.solved, marks: run.marks.slice(), started: true };
  store.set('ps.daily', st);
}

function finish() {
  cancelAnimationFrame(raf);
  for (let i = 0; i < PER_RUN; i++) if (!run.marks[i]) run.marks[i] = 'miss';
  saveDailyProgress();
  const r = run;
  run = null;
  showResults({ kind: r.kind, tier: r.tier, no: r.no, score: r.score, solved: r.solved, marks: r.marks, at: r.at });
}

/* ---------- results ---------- */
const MARK = { fast: '⚡', ok: '🟩', miss: '🟥' };
function showResults(res) {
  const t = tierOf(res.tier);
  $('resTitle').textContent = res.kind === 'daily' ? `TODAY'S SPIN · NO. ${res.no} · ${t.name.toUpperCase()}` : `PRACTICE RUN · ${t.name.toUpperCase()}`;
  $('resNum').textContent = num(res.score);
  $('resOf').textContent = `${res.solved}/${PER_RUN} LOCKED`;
  res.marks = res.marks.slice();
  while (res.marks.length < PER_RUN) res.marks.push('miss');
  $('resMarks').innerHTML = res.marks.map((m) => `<i class="${m}">${m === 'fast' ? '⚡' : m === 'ok' ? '✓' : '✗'}</i>`).join('');
  const bests = store.get('ps.best', {});
  let bestLine = '';
  if (!res.replay) {
    if (!bests[t.id] || res.score > bests[t.id]) { if (bests[t.id]) bestLine = `New best! (was ${num(bests[t.id])})`; bests[t.id] = res.score; store.set('ps.best', bests); }
    else bestLine = `Your best: ${num(bests[t.id])}`;
    // The lab wallet: amber for a finished run, a shard for locking all five (once per run).
    const ref = res.kind === 'daily' ? `daily:${res.tier}:${res.no}` : `practice:${res.tier}:${res.at}`;
    if (window.CapraWallet) {
      CapraWallet.earn('puzzled-spin', 'run', ref);
      if (res.solved === PER_RUN) CapraWallet.earn('puzzled-spin', 'clear', ref);
    }
  } else if (bests[t.id]) bestLine = `Your best: ${num(bests[t.id])}`;
  $('resBest').textContent = bestLine;
  // The results text, the same card in every Capra Lab game: ⚡ fast solve, 🟩 locked, 🟥 time ran out.
  const box = $('resShare');
  box.innerHTML = '';
  if (window.CapraShare) {
    const text = CapraShare.text({ emoji: '🌀', game: 'Puzzled Spin', no: res.kind === 'daily' ? res.no : undefined,
      sub: res.kind === 'daily' ? t.name : `Practice · ${t.name}`,
      lines: [`${res.solved}/${PER_RUN} locked · ${num(res.score)} pts`],
      grid: [res.marks.map((m) => MARK[m] || '⬛').join('')] });
    box.innerHTML = '<lab-text-share></lab-text-share>';
    box.firstChild.set({ emoji: '🌀', title: 'Puzzled Spin', text, url: `${location.origin}/puzzled-spin/` });
  }
  show('results');
}

/* ---------- buttons ---------- */
$('dailyBtn').onclick = () => startRun('daily');
$('practiceBtn').onclick = () => startRun('practice');
$('againBtn').onclick = () => startRun('practice');
$('levelBtn').onclick = () => { paintHome(); show('home'); };
$('resBack').onclick = () => { paintHome(); show('home'); };
$('soundBtn').onclick = () => { prefs.sound = !prefs.sound; savePrefs(); paintSound(); if (prefs.sound) sfx.lock(); };
let armT = 0;
$('playBack').onclick = () => {
  if (!run) { paintHome(); show('home'); return; }
  // leaving a daily run ends it, so it takes a second tap (no pop-ups in the lab)
  if (run.kind === 'daily' && !$('playBack').classList.contains('arm')) {
    $('playBack').classList.add('arm');
    $('backText').textContent = 'END RUN?';
    clearTimeout(armT);
    armT = setTimeout(() => { $('playBack').classList.remove('arm'); $('backText').textContent = 'MENU'; }, 3000);
    return;
  }
  clearTimeout(armT);
  cancelAnimationFrame(raf);
  if (run.kind === 'daily') { run.over = true; $('overlay').hidden = true; finish(); return; }
  run = null;
  $('overlay').hidden = true;
  paintHome();
  show('home');
};
$('helpBtn').onclick = () => { $('help').hidden = false; $('helpClose').focus(); };
$('helpClose').onclick = () => { $('help').hidden = true; };
$('help').addEventListener('click', (e) => { if (e.target === $('help')) $('help').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('help').hidden) $('help').hidden = true; });

paintHome();
show('home');
