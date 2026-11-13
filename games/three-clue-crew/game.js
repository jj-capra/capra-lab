// Three Clue Crew: the page. The rounds are in rounds.js, the daily and practice logic in logic.mjs.
// A game is ten rounds: three one-word clues, four choices, and the host says whether you got it and
// why the clues connect (JC's spec, Nov 12 2026).
import { ROUNDS } from './rounds.js';
import { TIERS, PER_GAME, dailySet, quickSet, remember, choices, rng, hash, labDay, dayNumber, rank } from './logic.mjs';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const pick = (list, random = Math.random) => list[Math.floor(random() * list.length)];
const prefs = Object.assign({ tier: 1, read: {} }, store.get('tcc.prefs', {}));
if (!TIERS.some((t) => t.id === prefs.tier)) prefs.tier = 1;
const savePrefs = () => store.set('tcc.prefs', prefs);
const tierOf = (id) => TIERS.find((t) => t.id === id);
// Read aloud: on for K–1 unless it's been turned off, off for the rest unless it's been turned on.
const readOn = () => (prefs.read[prefs.tier] != null ? prefs.read[prefs.tier] : prefs.tier === 1);

/* ---------- the host ---------- */
const HELLO = [
  'Welcome, welcome, WELCOME to Three Clue Crew! Three clues, four answers and one big brain: yours! Which grade level are we playing today?',
  'Hello, Clue Crew! I\'m your host, and tonight\'s contestant looks SHARP. Pick a grade level and let\'s play!',
  'It\'s time for everybody\'s favorite game show: THREE CLUE CREW! Choose your level and let\'s find out what connects the clues!',
];
const ROUND_IN = ['Round {n}! Here come your clues…', 'Clue Crew, assemble! Round {n}…', 'Eyes up! Round {n}, coming at you…', 'Ooh, I like this one. Round {n}…', 'Round {n}! What do these three have in common?', 'Here we go, round {n}. Think it through!'];
const LAST_IN = ['Final round! Make it count…', 'Last one! Bring it home…'];
const YES = ['That\'s RIGHT!', 'Nailed it!', 'Ding, ding, ding!', 'You got it!', 'Brilliant!', 'The crowd goes wild!', 'Correct-a-mundo!', 'Big brain move!'];
const NO = ['Ooh, so close!', 'Not this time!', 'Nice try!', 'Oof! Good guess, though.', 'The buzzer says no!'];
const BYE = {
  10: 'A PERFECT GAME! Ten for ten! Folks, we have a genius in the building!',
  hi: 'What a performance! You really know how to connect the clues.',
  mid: 'Solid game! A few tricky ones, but you held your own.',
  lo: 'Every Clue Crew legend starts somewhere. Come back and try again!',
};

/* ---------- speaking (read aloud) ---------- */
function say(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = prefs.tier <= 2 ? 0.9 : 1;
    speechSynthesis.speak(u);
  } catch (e) { /* no voice on this device */ }
}
const hush = () => { try { speechSynthesis.cancel(); } catch (e) { /* fine */ } };

/* ---------- screens ---------- */
function show(name) {
  for (const s of document.querySelectorAll('[data-screen]')) s.hidden = s.dataset.screen !== name;
  scrollTo(0, 0);
  if (name !== 'play') hush();
}

/* ---------- today's game, kept so you can leave and come back ---------- */
function dailyState() {
  const day = labDay();
  const all = store.get('tcc.daily', {});
  if (all.day !== day) return { day, tiers: {} };
  return all;
}
function saveDaily(st) { store.set('tcc.daily', st); }

/* ---------- home ---------- */
function paintHome() {
  $('homeHost').textContent = pick(HELLO);
  const seg = $('tiers');
  seg.innerHTML = '';
  for (const t of TIERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(t.id === prefs.tier));
    b.setAttribute('aria-label', `${t.name}, grades ${t.grades}`);
    b.innerHTML = `<b>${esc(t.short)}</b><small>${esc(t.name)}</small>`;
    b.onclick = () => { prefs.tier = t.id; savePrefs(); paintHome(); };
    seg.appendChild(b);
  }
  const no = dayNumber();
  const st = dailyState().tiers[prefs.tier];
  const t = tierOf(prefs.tier);
  if (st && st.done) {
    const right = st.answers.filter((a) => a.right).length;
    $('dailySub').textContent = `No. ${no} · done: ${right}/${PER_GAME}`;
    $('dailyNote').textContent = `You've played today's ${t.name} ten. Tap it to see your results again, or play a Quick 10. New rounds tomorrow!`;
  } else if (st && st.answers.length) {
    $('dailySub').textContent = `No. ${no} · round ${st.answers.length + 1} of ${PER_GAME}`;
    $('dailyNote').textContent = 'Pick up where you left off.';
  } else {
    $('dailySub').textContent = `No. ${no} · the same ten for everyone`;
    $('dailyNote').textContent = '';
  }
}

/* ---------- a game ---------- */
let game = null;

function startDaily() {
  const tier = prefs.tier, no = dayNumber();
  const all = dailyState();
  let st = all.tiers[tier];
  if (!st) { st = { ids: dailySet(ROUNDS[tier].length, tier, no), answers: [], done: false }; all.tiers[tier] = st; saveDaily(all); }
  game = { kind: 'daily', tier, no, ids: st.ids, answers: st.answers.slice(), seed: hash(`tcc:${tier}:${no}`) };
  if (st.done) { results(); return; }
  show('play');
  nextRound();
}
function startQuick() {
  const tier = prefs.tier;
  const seen = store.get('tcc.seen', {});
  game = { kind: 'quick', tier, ids: quickSet(ROUNDS[tier].length, seen[tier] || []), answers: [], seed: (Math.random() * 2 ** 32) >>> 0, at: Date.now() };
  show('play');
  nextRound();
}

function paintDots() {
  const box = $('dots');
  box.innerHTML = '';
  const reviewing = game.current && game.current.done;
  for (let i = 0; i < PER_GAME; i++) {
    const d = document.createElement('i');
    const a = game.answers[i];
    if (a) d.className = a.right ? 'r' : 'w';
    else if (i === game.answers.length && !reviewing) d.className = 'now';
    box.appendChild(d);
  }
  $('count').textContent = `${Math.min(game.answers.length + (reviewing ? 0 : 1), PER_GAME)}/${PER_GAME}`;
  $('readBtn').setAttribute('aria-pressed', String(readOn()));
}

let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

function nextRound() {
  clearTimers();
  const i = game.answers.length;
  if (i >= PER_GAME) { results(); return; }
  const r = ROUNDS[game.tier][game.ids[i]];
  const random = rng(game.seed + i * 7919);
  game.current = { r, opts: choices(r, random), done: false };
  paintDots();
  const host = $('playHost');
  host.className = 'bubble';
  host.textContent = (i === PER_GAME - 1 ? pick(LAST_IN) : pick(ROUND_IN)).replace('{n}', i + 1);
  const clues = $('clues');
  clues.innerHTML = r.clues.map((c, k) => `<div class="clue" aria-label="Clue ${k + 1}: ${esc(c)}"><span><small>CLUE ${k + 1}</small><span class="w">${esc(c)}</span></span></div>`).join('');
  fitClues();
  const box = $('choices');
  box.innerHTML = '';
  game.current.opts.forEach((o, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.innerHTML = `<i>${'ABCD'[k]}</i><span>${esc(o)}</span>`;
    b.onclick = () => answer(o, b);
    box.appendChild(b);
  });
  $('nextBtn').hidden = true;
  const cards = [...clues.children];
  cards.forEach((c, k) => later(() => c.classList.add('in'), 250 + k * 380));
  later(() => [...box.children].forEach((b) => b.classList.add('in')), 250 + 3 * 380 + 100);
  if (readOn()) later(() => readRound(), 400);
}
// Each clue word stays whole: shrink it until it fits its card.
function fitClues() {
  for (const card of $('clues').children) {
    const w = card.querySelector('.w');
    w.style.fontSize = '';
    const room = card.clientWidth - 12;
    let size = parseFloat(getComputedStyle(w).fontSize);
    for (let i = 0; i < 16 && w.scrollWidth > room && size > 12; i++) { size -= 1.5; w.style.fontSize = `${size}px`; }
  }
}
addEventListener('resize', () => { if (game && game.current) fitClues(); });
if (document.fonts) document.fonts.ready.then(() => { if (game && game.current) fitClues(); });

function readRound() {
  if (!game || !game.current) return;
  const { r, opts, done } = game.current;
  if (done) return;
  say(`Your three clues: ${r.clues.join('. ')}. Is it ${opts.slice(0, 3).join(', ')}, or ${opts[3]}?`);
}

function answer(choice, btn) {
  const cur = game.current;
  if (!cur || cur.done) return;
  cur.done = true;
  clearTimers();
  // show everything at once in case they tapped mid-animation
  for (const c of $('clues').children) c.classList.add('in');
  const right = choice === cur.r.answer;
  for (const b of $('choices').children) {
    b.classList.add('in');
    b.disabled = true;
    const val = b.querySelector('span').textContent;
    if (val === cur.r.answer) b.classList.add('right');
    else if (b === btn) b.classList.add('wrong');
    else b.classList.add('dim');
  }
  game.answers.push({ id: game.ids[game.answers.length], pick: choice, right });
  if (game.kind === 'daily') {
    const all = dailyState();
    const st = all.tiers[game.tier] || { ids: game.ids, answers: [], done: false };
    st.answers = game.answers.slice();
    st.done = game.answers.length >= PER_GAME;
    all.tiers[game.tier] = st;
    saveDaily(all);
  }
  const host = $('playHost');
  const line = right ? pick(YES) : pick(NO);
  host.className = `bubble ${right ? 'right' : 'wrong'}`;
  host.innerHTML = `<b class="say">${esc(line)}</b>${right ? '' : `The answer is <b>${esc(cur.r.answer)}</b>. `}${esc(cur.r.why)}`;
  if (readOn()) say(`${line} ${right ? '' : `The answer is ${cur.r.answer}.`} ${cur.r.why}`);
  paintDots();
  const last = game.answers.length >= PER_GAME;
  $('nextBtn').textContent = last ? 'SEE RESULTS ▸' : 'NEXT ROUND ▸';
  $('nextBtn').hidden = false;
  $('nextBtn').focus({ preventScroll: true });
}

/* ---------- results ---------- */
function results() {
  clearTimers();
  const t = tierOf(game.tier);
  const right = game.answers.filter((a) => a.right).length;
  if (game.kind === 'quick') {
    const seen = store.get('tcc.seen', {});
    seen[game.tier] = remember(seen[game.tier] || [], game.ids, ROUNDS[game.tier].length);
    store.set('tcc.seen', seen);
  }
  $('resTitle').textContent = game.kind === 'daily' ? `TODAY'S 10 · NO. ${game.no} · ${t.name.toUpperCase()}` : `QUICK 10 · ${t.name.toUpperCase()}`;
  $('resNum').innerHTML = `${right}<span>/${PER_GAME}</span>`;
  $('resRank').textContent = rank(right);
  $('resHost').textContent = right === PER_GAME ? BYE[10] : right >= 7 ? BYE.hi : right >= 4 ? BYE.mid : BYE.lo;
  const list = $('resList');
  list.innerHTML = '';
  game.answers.forEach((a) => {
    const r = ROUNDS[game.tier][a.id];
    const li = document.createElement('li');
    li.className = a.right ? 'r' : 'w';
    li.innerHTML = `<i aria-hidden="true">${a.right ? '✓' : '✗'}</i><div><b>${esc(r.clues.join(' · '))} → ${esc(r.answer)}</b>${a.right ? '' : `<span>You picked ${esc(a.pick)}</span>`}</div>`;
    list.appendChild(li);
  });
  // The lab wallet: amber for finishing ten, a shard for a perfect ten (once per game).
  const ref = game.kind === 'daily' ? `daily:${game.tier}:${game.no}` : `quick:${game.tier}:${game.at}`;
  if (window.CapraWallet && !game.paid && game.answers.length >= PER_GAME) {
    game.paid = true;
    CapraWallet.earn('three-clue-crew', 'game', ref);
    if (right === PER_GAME) CapraWallet.earn('three-clue-crew', 'perfect', ref);
  }
  // The results text, the same card in every Capra Lab game: 🟩 right, 🟥 wrong.
  const box = $('resShare');
  box.innerHTML = '';
  if (window.CapraShare) {
    const text = CapraShare.text({ emoji: '🔍', game: 'Three Clue Crew', no: game.kind === 'daily' ? game.no : undefined,
      sub: game.kind === 'daily' ? t.name : `Quick 10 · ${t.name}`,
      lines: [`${right}/${PER_GAME} · ${rank(right).replace(/!$/, '')}`],
      grid: [game.answers.map((a) => (a.right ? '🟩' : '🟥')).join('')] });
    box.innerHTML = '<lab-text-share></lab-text-share>';
    box.firstChild.set({ emoji: '🔍', title: 'Three Clue Crew', text, url: `${location.origin}/three-clue-crew/` });
  }
  show('results');
}

/* ---------- buttons ---------- */
$('dailyBtn').onclick = startDaily;
$('quickBtn').onclick = startQuick;
$('moreBtn').onclick = startQuick;
$('levelBtn').onclick = () => { paintHome(); show('home'); };
$('resBack').onclick = () => { paintHome(); show('home'); };
$('playBack').onclick = () => { clearTimers(); paintHome(); show('home'); };
$('nextBtn').onclick = () => nextRound();
$('readBtn').onclick = () => {
  prefs.read[prefs.tier] = !readOn();
  savePrefs();
  $('readBtn').setAttribute('aria-pressed', String(readOn()));
  if (readOn()) { if (game && game.current && game.current.done) say($('playHost').textContent); else readRound(); } else hush();
};
$('helpBtn').onclick = () => { $('help').hidden = false; $('helpClose').focus(); };
$('helpClose').onclick = () => { $('help').hidden = true; };
$('help').addEventListener('click', (e) => { if (e.target === $('help')) $('help').hidden = true; });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('help').hidden) { $('help').hidden = true; return; }
  const play = !document.querySelector('[data-screen="play"]').hidden;
  if (!play || !game || !game.current) return;
  const k = 'abcd1234'.indexOf(e.key.toLowerCase());
  if (k >= 0 && !game.current.done) { const b = $('choices').children[k % 4]; if (b) b.click(); }
  else if ((e.key === 'Enter' || e.key === ' ') && game.current.done && document.activeElement !== $('nextBtn')) { e.preventDefault(); nextRound(); }
});

paintHome();
show('home');
