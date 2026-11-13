// Puzzled Spin: the page. The art, the puzzles and the rules are in logic.mjs.
// A run is five comic art pieces that climb from two-tone mirrors to a kaleidoscope masterpiece; each is
// cut into tiles, some turned the wrong way. Tap a tile to spin it until the picture is whole.
import { TIERS, tierOf, PER_RUN, puzzle, check, artSvg, hash, labDay, dayNumber, dailySeed, stageOf, LEVELS,
  solvePoints, isFast, PEEK_COST } from './logic.mjs';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const prefs = Object.assign({ tier: 1, sound: true }, store.get('ps.prefs', {}));
if (!TIERS.some((t) => t.id === prefs.tier)) prefs.tier = 1;
const savePrefs = () => store.set('ps.prefs', prefs);
const num = (n) => Number(n).toLocaleString('en-US');

/* ---------- art in the page: every piece is drawn once and tiles show slices of it ---------- */
const defs = $('defs');
const drawn = new Set();
function addArt(art, id) {
  if (drawn.has(id)) return;
  drawn.add(id);
  defs.insertAdjacentHTML('beforeend', artSvg(art, id));
}
const slice = (id, r, c) => `<svg viewBox="${c} ${r} 1 1" preserveAspectRatio="none" aria-hidden="true"><use href="#${id}"/></svg>`;
const whole = (id, n) => `<svg viewBox="0 0 ${n} ${n}" aria-hidden="true"><use href="#${id}"/></svg>`;

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
  click: () => { tone(660, 0.08); tone(990, 0.12, 'triangle', 0.05, 0.06); },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'triangle', 0.06, i * 0.09)),
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
  const first = stageOf(t.id, 0), last = stageOf(t.id, PER_RUN - 1);
  const bits = [`${LEVELS[first.level].name} (${first.n}×${first.n}) up to ${LEVELS[last.level].name} (${last.n}×${last.n})`];
  if (t.goal) bits.push('the finished picture shows the whole time');
  if (t.glow) bits.push('tiles get a ✓ when they\'re right');
  if (t.peek) bits.push('only the picture\'s symmetry to go on, plus a peek that costs 3 seconds');
  if (t.lineBonus) bits.push(`+${t.lineBonus}s for every row or column you finish`);
  bits.push(t.perTile ? 'more time for bigger pictures' : `${t.baseTime} seconds a picture`);
  return bits.join(' · ');
}
function dailyState() {
  const day = labDay();
  const st = store.get('ps.daily2', {});
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
  $('dailySub').textContent = d ? `No. ${no} · done: ${num(d.score)} pts, ${d.solved}/${PER_RUN} pictures` : `No. ${no} · the same five for everyone`;
  const best = store.get('ps.best2', {})[t.id];
  $('bestLine').textContent = best ? `Your best ${t.name} run: ${num(best)} points.` : '';
  // the logo: a little kaleidoscope cut in four, one tile always spinning home
  const lp = puzzle(1, 4, hash('logo:' + labDay()));
  addArt(lp.art, 'logo-art');
  $('logoTiles').innerHTML = [0, 1, 2, 3].map((k) => `<i><svg viewBox="${(k % 2) * 1.5} ${Math.floor(k / 2) * 1.5} 1.5 1.5" aria-hidden="true"><use href="#logo-art"/></svg></i>`).join('');
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
  run = { kind, tier, no, base, at: Date.now(), i: 0, score: 0, streak: 0, marks: [], solved: 0, pieces: [] };
  if (kind === 'daily') {
    // a daily run counts once started: leaving it ends it
    const st = dailyState();
    st.tiers[tier] = { score: 0, solved: 0, marks: [] };
    store.set('ps.daily2', st);
  }
  show('play');
  $('backText').textContent = 'MENU';
  $('playBack').classList.remove('arm');
  startPuzzle();
}
const seedFor = (r, i) => (r.kind === 'daily' ? dailySeed(r.tier, r.no, i) : hash(`${r.base}:${i}`));

function startPuzzle() {
  const t = tierOf(run.tier);
  const p = puzzle(run.tier, run.i, seedFor(run, run.i));
  const id = `art-${run.kind}-${run.tier}-${run.no}-${run.base}-${run.i}`;
  addArt(p.art, id);
  run.p = p;
  run.id = id;
  run.q = p.start.map((row) => row.slice());
  run.deg = p.start.map((row) => row.map((q) => q * 90));
  run.ever = new Set();
  run.lines = new Set();
  run.over = false;
  run.timeLeft = p.time;
  run.endsAt = 0;
  const board = $('board');
  board.className = 'board';
  board.style.gridTemplateColumns = `repeat(${p.n}, 1fr)`;
  board.style.setProperty('--gap', p.n >= 5 ? '3px' : p.n >= 4 ? '4px' : '6px');
  board.style.setProperty('--badge', p.n >= 4 ? '16px' : '22px');
  board.innerHTML = '';
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell';
    b.setAttribute('aria-label', `Tile, row ${r + 1}, column ${c + 1}`);
    b.innerHTML = slice(id, r, c);
    b.querySelector('svg').style.transform = `rotate(${run.deg[r][c]}deg)`;
    wire(b, r, c);
    board.appendChild(b);
  }
  $('which').innerHTML = `<small>PICTURE ${run.i + 1} OF ${PER_RUN}</small>${p.name.toUpperCase()}`;
  $('score').textContent = num(run.score);
  // the goal picture (younger tiers) or the peek button (older)
  $('goal').hidden = !t.goal;
  $('peekBtn').hidden = !t.peek;
  if (t.goal) $('goalArt').innerHTML = whole(id, p.n);
  $('peekArt').innerHTML = whole(id, p.n);
  $('peek').hidden = true;
  $('hint').textContent = t.id === 1
    ? 'Make it look like the goal picture! Tap a tile to spin it. Tiles with a ✓ are already right.'
    : t.glow ? 'Tap a tile to spin it ↻ · swipe left to spin it back ↺ · ✓ tiles are right'
      : 'Tap to spin ↻ · swipe left to spin back ↺ · use the symmetry: every piece mirrors';
  paintMarks();
  paintStreak();
  paintTime();
  refresh(false);
  // a quick GO! then the clock starts
  const ov = $('overlay');
  ov.className = 'overlay go';
  ov.innerHTML = `<h2>${run.i === 0 ? 'SPIN!' : run.i === PER_RUN - 1 ? 'MASTERPIECE!' : 'GO!'}</h2>`;
  ov.hidden = false;
  run.ready = false;
  setTimeout(() => {
    if (!run || run.over) return;
    ov.hidden = true;
    run.ready = true;
    run.endsAt = performance.now() + p.time * 1000;
    loop();
  }, run.i === PER_RUN - 1 ? 900 : 650);
}

function wire(b, r, c) {
  let x0 = 0, y0 = 0, down = false;
  b.addEventListener('pointerdown', (e) => { down = true; x0 = e.clientX; y0 = e.clientY; b.classList.add('press'); });
  b.addEventListener('pointerup', (e) => {
    b.classList.remove('press');
    if (!down) return;
    down = false;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    turn(r, c, Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy) && dx < 0 ? -1 : 1);
  });
  b.addEventListener('pointercancel', () => { down = false; b.classList.remove('press'); });
  b.addEventListener('pointerleave', () => b.classList.remove('press'));
  // keyboard: Enter or Space spins clockwise, Shift spins back
  b.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(r, c, e.shiftKey ? -1 : 1); }
  });
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

// Glow the tiles that are right (younger tiers), pay for new ones and for whole rows and columns, and
// finish when the picture is whole.
function refresh(live) {
  const p = run.p, t = tierOf(run.tier);
  const st = check(p, run.q);
  const cells = $('board').children;
  const fresh = [];
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
    const cell = cells[r * p.n + c];
    const k = `${r},${c}`;
    const right = st.ok[r][c];
    if (t.glow) cell.classList.toggle('ok', right);
    if (!live && right) run.ever.add(k); // tiles that start right pay nothing
    if (live && right && !run.ever.has(k)) { run.ever.add(k); fresh.push(cell); }
  }
  if (!live) return;
  if (fresh.length) {
    sfx.click();
    if (t.glow) {
      for (const cell of fresh) { run.score += 10; floatAt(cell, '+10'); cell.classList.remove('pop'); void cell.offsetWidth; cell.classList.add('pop'); }
      $('score').textContent = num(run.score);
    }
  }
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
    el.className = m || (i === run.i ? 'now' : '');
    el.textContent = m === 'fast' ? '⚡' : m === 'ok' ? '✓' : m === 'miss' ? '✗' : '';
    box.appendChild(el);
  }
}
function paintStreak() {
  const b = $('streak');
  const m = Math.min(3, 1 + 0.5 * run.streak);
  b.textContent = `SPIN STREAK x${m}`;
  b.classList.toggle('on', run.streak > 0);
}

// Peek (middle and high school): hold to see the finished piece; each peek costs 3 seconds.
function peekOn(e) {
  if (e) e.preventDefault();
  if (!run || run.over || !run.ready || !$('peek').hidden) return;
  $('peek').hidden = false;
  run.endsAt -= PEEK_COST * 1000;
  floatAt($('timePill'), `−${PEEK_COST}s`);
}
function peekOff() { $('peek').hidden = true; }
$('peekBtn').addEventListener('pointerdown', peekOn);
$('peekBtn').addEventListener('pointerup', peekOff);
$('peekBtn').addEventListener('pointerleave', peekOff);
$('peekBtn').addEventListener('pointercancel', peekOff);
$('peekBtn').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') peekOn(e); });
$('peekBtn').addEventListener('keyup', peekOff);

// The picture comes together: the gaps close and it's one piece of art.
function reveal() {
  $('board').classList.add('done');
  for (const cell of $('board').children) cell.classList.remove('ok');
  peekOff();
}

function solvedPuzzle() {
  const p = run.p;
  run.over = true;
  cancelAnimationFrame(raf);
  const left = Math.max(0, run.timeLeft);
  const pts = solvePoints(left, run.streak);
  const fast = isFast(left, p.time);
  run.score += pts;
  run.solved++;
  run.marks[run.i] = fast ? 'fast' : 'ok';
  run.streak = fast ? run.streak + 1 : 0;
  run.pieces[run.i] = { id: run.id, n: p.n, name: p.name, done: true };
  reveal();
  sfx.win();
  $('score').textContent = num(run.score);
  $('timePill').classList.remove('low');
  paintMarks();
  const title = run.i === PER_RUN - 1 ? 'MASTERPIECE!' : fast ? 'LIGHTNING!' : pickCheer();
  setTimeout(() => between(title, `+${num(pts)}`, `${Math.ceil(left)} seconds left${fast ? ' · fast! Spin Streak up' : ''}`), 1400);
}
const CHEERS = ['WHAM!', 'KA-POW!', 'BEAUTIFUL!', 'NAILED IT!', 'ZAP!', 'BOOM!'];
const pickCheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

function timeUp() {
  const p = run.p;
  run.over = true;
  run.timeLeft = 0;
  paintTime();
  run.marks[run.i] = 'miss';
  run.streak = 0;
  run.pieces[run.i] = { id: run.id, n: p.n, name: p.name, done: false };
  sfx.miss();
  paintMarks();
  paintStreak();
  // show the answer: every wrong tile spins home, then the picture comes together
  const cells = $('board').children;
  for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
    const q = run.q[r][c];
    if (!p.same[r][c].includes(q)) {
      run.deg[r][c] += q === 3 ? 90 : q === 1 ? -90 : 180;
      run.q[r][c] = 0;
      cells[r * p.n + c].querySelector('svg').style.transform = `rotate(${run.deg[r][c]}deg)`;
    }
  }
  setTimeout(reveal, 450);
  setTimeout(() => between('TIME!', '', 'Here\'s the finished piece. Spin Streak reset.'), 1300);
}
function between(title, pts, line) {
  saveDailyProgress();
  const last = run.i >= PER_RUN - 1;
  const ov = $('overlay');
  ov.className = 'overlay end';
  ov.innerHTML = `<div class="card"><div class="burst"><h2>${title}</h2></div><p>${pts ? `<b class="pts">${pts}</b>` : ''}${line}</p><button class="btn big" type="button" id="nextBtn">${last ? 'SEE YOUR GALLERY ▸' : 'NEXT PICTURE ▸'}</button></div>`;
  ov.hidden = false;
  const btn = $('nextBtn');
  btn.onclick = () => { ov.hidden = true; if (last) finish(); else { run.i++; startPuzzle(); } };
  setTimeout(() => btn.focus({ preventScroll: true }), 50);
}
function saveDailyProgress() {
  if (run.kind !== 'daily') return;
  const st = dailyState();
  st.tiers[run.tier] = { score: run.score, solved: run.solved, marks: run.marks.slice() };
  store.set('ps.daily2', st);
}

function finish() {
  cancelAnimationFrame(raf);
  for (let i = 0; i < PER_RUN; i++) if (!run.marks[i]) run.marks[i] = 'miss';
  saveDailyProgress();
  const r = run;
  run = null;
  showResults({ kind: r.kind, tier: r.tier, no: r.no, base: r.base, score: r.score, solved: r.solved, marks: r.marks, at: r.at });
}

/* ---------- results: the run as a comic page ---------- */
const MARK = { fast: '⚡', ok: '🟩', miss: '🟥' };
function showResults(res) {
  const t = tierOf(res.tier);
  res.marks = res.marks.slice();
  while (res.marks.length < PER_RUN) res.marks.push('miss');
  $('resTitle').textContent = res.kind === 'daily' ? `TODAY'S SPIN · NO. ${res.no} · ${t.name.toUpperCase()}` : `PRACTICE RUN · ${t.name.toUpperCase()}`;
  $('resNum').textContent = num(res.score);
  $('resOf').textContent = `${res.solved}/${PER_RUN} PICTURES`;
  // the gallery: each piece redrawn from its seed, unfinished ones faded
  const page = $('gallery');
  page.innerHTML = '';
  for (let i = 0; i < PER_RUN; i++) {
    const seed = res.kind === 'daily' ? dailySeed(res.tier, res.no, i) : hash(`${res.base}:${i}`);
    const p = puzzle(res.tier, i, seed);
    const id = `art-${res.kind}-${res.tier}-${res.no}-${res.base}-${i}`;
    addArt(p.art, id);
    const m = res.marks[i];
    const el = document.createElement('figure');
    el.className = `panel${m === 'miss' ? ' miss' : ''}${i === PER_RUN - 1 ? ' wide' : ''}`;
    el.innerHTML = `${whole(id, p.n)}<figcaption>${i + 1}. ${p.name}${m === 'fast' ? ' ⚡' : m === 'miss' ? ' · unfinished' : ''}</figcaption>`;
    page.appendChild(el);
  }
  const bests = store.get('ps.best2', {});
  let bestLine = '';
  if (!res.replay) {
    if (!bests[t.id] || res.score > bests[t.id]) { if (bests[t.id]) bestLine = `New best! (was ${num(bests[t.id])})`; bests[t.id] = res.score; store.set('ps.best2', bests); }
    else bestLine = `Your best: ${num(bests[t.id])}`;
    // The lab wallet: amber for a finished run, a shard for finishing all five (once per run).
    const ref = res.kind === 'daily' ? `daily:${res.tier}:${res.no}` : `practice:${res.tier}:${res.at}`;
    if (window.CapraWallet) {
      CapraWallet.earn('puzzled-spin', 'run', ref);
      if (res.solved === PER_RUN) CapraWallet.earn('puzzled-spin', 'clear', ref);
    }
  } else if (bests[t.id]) bestLine = `Your best: ${num(bests[t.id])}`;
  $('resBest').textContent = bestLine;
  // The results text, the same card in every Capra Lab game: ⚡ fast, 🟩 finished, 🟥 time ran out.
  const box = $('resShare');
  box.innerHTML = '';
  if (window.CapraShare) {
    const text = CapraShare.text({ emoji: '🌀', game: 'Puzzled Spin', no: res.kind === 'daily' ? res.no : undefined,
      sub: res.kind === 'daily' ? t.name : `Practice · ${t.name}`,
      lines: [`${res.solved}/${PER_RUN} pictures · ${num(res.score)} pts`],
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
$('soundBtn').onclick = () => { prefs.sound = !prefs.sound; savePrefs(); paintSound(); if (prefs.sound) sfx.click(); };
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
