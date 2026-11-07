// Don't Look!: the page. Pick a level and a deck, hold the phone on your forehead, flip it up
// when you get the word and down to pass. Words and decks live in words.js; tilt reading and
// dealing in logic.js.
import { LEVELS, DECKS, MIX, PICTURES } from './words.js';
import { createTilt, deal, remember, wordsFor, decksAt } from './logic.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIMES = [60, 90, 120];
const FLASH_MS = 650;      // how long GOT IT / PASS fills the screen
const HOLD_MS = 900;       // how long the phone sits upright on a forehead before the countdown

/* ---------- saved on this device (best-effort: private mode can refuse) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* fine */ } },
};
const prefs = Object.assign({ level: 1, time: 60, sound: true, upMeans: 'got' }, store.get('dont-look.prefs', {}));
if (!LEVELS.some((l) => l.id === prefs.level)) prefs.level = 1;
if (!TIMES.includes(prefs.time)) prefs.time = 60;
const savePrefs = () => store.set('dont-look.prefs', prefs);
// The Capra Lab player on this phone, if any (the lab keeps it under capra-lab.profile).
const lab = (() => { const p = store.get('capra-lab.profile', null); return p && p.name ? p : null; })();

/* ---------- screens ---------- */
let screen = 'home';
function show(name) {
  screen = name;
  document.querySelectorAll('[data-screen]').forEach((el) => { el.hidden = el.dataset.screen !== name; });
  if (name !== 'stage') window.scrollTo(0, 0);
  orient();
}

// The round plays sideways. If the page itself turned (rotation lock off), nothing to do. If it
// stayed in portrait while the phone is on its side (rotation lock on), the stage turns itself to
// match, using the tilt sensor to tell which way. Otherwise, before the round starts, ask to turn it.
const landscape = () => window.innerWidth >= window.innerHeight;
const sidewaysOK = () => landscape() || sensor.side !== 0;
let turned = 0;
function orient() {
  const stage = document.querySelector('.stage');
  const turn = screen === 'stage' && round && round.tilt && !landscape() ? sensor.side : 0;
  if (turn !== turned) {
    turned = turn;
    stage.classList.toggle('turned', !!turn);
    stage.style.width = turn ? window.innerHeight + 'px' : '';
    stage.style.height = turn ? window.innerWidth + 'px' : '';
    stage.style.transform = turn ? `translate(-50%, -50%) rotate(${turn}deg)` : '';
    fitWord();
  }
  $('rotate').hidden = !(screen === 'stage' && round && round.tilt && !sidewaysOK() && (round.mode === 'forehead' || round.mode === 'count'));
}

/* ---------- tilt ---------- */
const NEEDS_ASK = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
// side: which way the phone is turned on its side (90 or -90), kept until it's held upright in portrait again
const sensor = { tilt: createTilt(), on: false, last: 0, asked: false, blocked: false, side: 0 };
const tiltLive = () => sensor.on && performance.now() - sensor.last < 1500;

function onOrient(e) {
  if (e.beta == null || e.gamma == null) return;
  const now = performance.now();
  sensor.on = true;
  sensor.last = now;
  const flip = sensor.tilt.feed(e.beta, e.gamma, now);
  // Which edge of the phone points up: its right edge (xUp) or its top edge (yUp).
  const b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
  const xUp = -Math.cos(b) * Math.sin(g), yUp = Math.sin(b);
  if (Math.abs(xUp) > 0.7) sensor.side = xUp > 0 ? 90 : -90;
  else if (Math.abs(yUp) > 0.7) sensor.side = 0;
  if (!$('settings').hidden) paintMeter();
  if (screen === 'stage') orient();
  if (round) roundTilt(flip, now);
}
// Listen from the start; on iPhone nothing arrives until the player allows it.
addEventListener('deviceorientation', onOrient);

// iPhone asks once per visit, and only from a tap: call this first thing in a tap handler.
function askTilt() {
  if (!NEEDS_ASK || sensor.asked) return Promise.resolve();
  sensor.asked = true;
  return DeviceOrientationEvent.requestPermission()
    .then((r) => { if (r !== 'granted') sensor.blocked = true; })
    .catch(() => { sensor.blocked = true; });
}
async function waitForTilt(ms) {
  const t = performance.now();
  while (!tiltLive() && performance.now() - t < ms) await sleep(50);
  return tiltLive();
}

/* ---------- sound (made on the fly, nothing to download) ---------- */
let ac = null;
function audio() {
  if (!prefs.sound) return null;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { return null; }
  return ac;
}
function tone(freq, start, dur, type = 'triangle', vol = 0.18, endFreq = 0) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}
const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* not on iPhone */ } };
const sfx = {
  got() { tone(784, 0, 0.12); tone(1175, 0.1, 0.22); buzz(40); },
  pass() { tone(320, 0, 0.3, 'square', 0.07, 150); buzz([30, 40, 30]); },
  tick() { tone(1250, 0, 0.05, 'square', 0.05); },
  count() { tone(523, 0, 0.16, 'triangle', 0.2); },
  go() { tone(880, 0, 0.12, 'triangle', 0.22); tone(1318, 0.1, 0.3, 'triangle', 0.2); },
  end() { tone(240, 0, 0.55, 'sawtooth', 0.11, 170); tone(180, 0.04, 0.6, 'sawtooth', 0.09, 130); buzz(300); },
};

/* ---------- keep the screen on during a round ---------- */
let wake = null;
async function keepAwake(on) {
  try {
    if (on && !wake && 'wakeLock' in navigator) {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    } else if (!on && wake) { const w = wake; wake = null; await w.release(); }
  } catch (e) { /* not available: fine */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && round) keepAwake(true); });

/* ---------- home ---------- */
let deckId = null;
const deckById = (id) => (id === 'mix' ? MIX : DECKS.find((d) => d.id === id));
const levelOf = (id) => LEVELS.find((l) => l.id === id);

function seg(el, options, current, pick) {
  el.innerHTML = '';
  for (const o of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(o.value === current));
    b.innerHTML = `<b>${o.big}</b>${o.small ? `<small>${o.small}</small>` : ''}`;
    b.setAttribute('aria-label', o.label || o.big);
    b.onclick = () => pick(o.value);
    el.appendChild(b);
  }
}
function paintHome() {
  seg($('levels'), LEVELS.map((l) => ({ value: l.id, big: l.grades, small: l.name, label: `${l.name}, grades ${l.grades}` })), prefs.level,
    (v) => { prefs.level = v; savePrefs(); paintHome(); });
  seg($('times'), TIMES.map((t) => ({ value: t, big: `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, label: `${t} seconds` })), prefs.time,
    (v) => { prefs.time = v; savePrefs(); paintHome(); });
  const grid = $('decks');
  grid.innerHTML = '';
  for (const d of [MIX, ...decksAt(DECKS, prefs.level)]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'deck' + (d.id === 'mix' ? ' mix' : '');
    b.style.setProperty('--deck', d.color);
    b.innerHTML = `<span class="badge" aria-hidden="true">${d.emoji}</span><strong>${d.name}</strong>`;
    b.onclick = () => openReady(d.id);
    grid.appendChild(b);
  }
  if (lab) { $('who').hidden = false; $('who').querySelector('b').textContent = lab.name; }
}

/* ---------- ready ---------- */
function paintFlipWords() {
  const upGot = prefs.upMeans === 'got';
  $('ruleUp').innerHTML = upGot ? 'Flip <b>up</b> when you get it' : 'Flip <b>up</b> to pass';
  $('ruleDown').innerHTML = upGot ? 'Flip <b>down</b> to pass' : 'Flip <b>down</b> when you get it';
  $('artUp').textContent = upGot ? 'GOT IT' : 'PASS';
  $('artDown').textContent = upGot ? 'PASS' : 'GOT IT';
  $('artUp').setAttribute('fill', upGot ? '#5BE38A' : '#FF9A4D');
  $('artDown').setAttribute('fill', upGot ? '#FF9A4D' : '#5BE38A');
  $('helpFlip').innerHTML = upGot
    ? 'Got it? Flip the phone <b class="up">UP</b> (screen to the ceiling). Stuck? Flip it <b class="down">DOWN</b> to pass.'
    : 'Got it? Flip the phone <b class="up">DOWN</b> (screen to the floor). Stuck? Flip it <b class="down">UP</b> to pass.';
  $('meterUp').textContent = upGot ? 'GOT IT' : 'PASS';
  $('meterDown').textContent = upGot ? 'PASS' : 'GOT IT';
}
function openReady(id) {
  deckId = id;
  const d = deckById(id);
  const lvl = levelOf(prefs.level);
  $('readyDeck').style.setProperty('--deck', d.color);
  if (id === 'mix') $('readyDeck').style.background = 'linear-gradient(135deg, #FFD23F 0 25%, #FF5DA2 25% 50%, #29D3F0 50% 75%, #5BE38A 75%)';
  else $('readyDeck').style.background = '';
  $('readyEmoji').textContent = d.emoji;
  $('readyName').textContent = d.name;
  $('readyLevel').textContent = `${lvl.name.toUpperCase()} · ${lvl.grades} · ${prefs.time} SECONDS`;
  paintFlipWords();
  show('ready');
}
$('goBtn').onclick = async () => {
  const asking = askTilt(); // must happen inside the tap on iPhone
  audio();
  await asking;
  const tilt = await waitForTilt(NEEDS_ASK ? 900 : 350);
  if (NEEDS_ASK && sensor.blocked && !tilt) {
    $('readyNote').textContent = 'Tilt is turned off for this site, so GOT IT and PASS buttons will show on the screen. To use tilt, close Safari all the way, open Capra Lab again and tap Allow.';
  }
  startRound(tilt);
};
$('readyBack').onclick = () => { show('home'); };

/* ---------- the round ---------- */
// round: { deck, key, words, queue, next, current, results[], tilt, mode, endsAt, waiting, flashDone, lastTick }
let round = null;
let clock = 0;
let timers = [];
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; clearInterval(clock); clock = 0; };

function stagePart(part) {
  orient();
  $('forehead').hidden = part !== 'forehead';
  $('count').hidden = part !== 'count';
  $('word').hidden = part !== 'word';
  $('pic').hidden = !(part === 'word' && $('pic').textContent);
  $('taps').hidden = !(part === 'word' && round && !round.tilt);
}
function paintTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  $('timePill').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('timePill').classList.toggle('low', s <= 10 && round && round.mode === 'play');
}
function paintScore() { $('score').textContent = round ? round.results.filter((r) => r.kind === 'got').length : 0; }

function startRound(tilt) {
  clearTimers();
  const d = deckById(deckId);
  const words = wordsFor(DECKS, deckId, prefs.level);
  const key = `${deckId}:${prefs.level}`;
  const seen = store.get('dont-look.seen', {});
  round = { deck: d, key, words, queue: deal(words, seen[key] || []), next: 0, current: null, results: [], tilt, mode: 'forehead', endsAt: 0, waiting: false, flashDone: false, lastTick: 0, ended: false };
  document.querySelector('.stage').style.setProperty('--deck', id2color(d));
  $('flash').hidden = true;
  paintScore();
  paintTime(prefs.time * 1000);
  show('stage');
  keepAwake(true);
  if (tilt) { sensor.tilt.disarm(); stagePart('forehead'); }
  else countdown();
}
const id2color = (d) => (d.id === 'mix' ? '#FFD23F' : d.color);

const useTaps = () => { if (round && round.mode === 'forehead') { round.tilt = false; countdown(); } };
$('useTaps').onclick = useTaps;
$('rotateTaps').onclick = useTaps;

function countdown() {
  round.mode = 'count';
  stagePart('count');
  const steps = ['3', '2', '1'];
  steps.forEach((n, i) => later(() => {
    const el = $('count');
    el.textContent = n;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    sfx.count();
  }, i * 800));
  later(beginPlay, steps.length * 800);
}

function beginPlay() {
  round.mode = 'play';
  round.endsAt = performance.now() + prefs.time * 1000;
  sfx.go();
  if (round.tilt) sensor.tilt.disarm(); // the first answer starts from upright
  showNext();
  clock = setInterval(tick, 100);
}

function tick() {
  if (!round || round.mode !== 'play') return;
  const left = round.endsAt - performance.now();
  paintTime(left);
  const s = Math.ceil(left / 1000);
  if (s <= 5 && s > 0 && s !== round.lastTick) { round.lastTick = s; sfx.tick(); }
  if (left <= 0) timeUp();
}

function nextWord() {
  if (round.next >= round.queue.length) {
    // Ran through the whole deck: deal it again, leaving out what this round already had.
    const used = new Set(round.results.map((r) => r.word));
    const again = deal(round.words.filter((w) => !used.has(w)));
    round.queue = again.length ? again : deal(round.words);
    round.next = 0;
  }
  return round.queue[round.next++];
}

function showNext() {
  round.current = nextWord();
  round.waiting = false;
  $('flash').hidden = true;
  const el = $('word');
  el.textContent = round.current;
  $('pic').textContent = PICTURES[round.current] || '';
  stagePart('word');
  fitWord();
}

// Biggest size that fits the word in the middle of the screen without breaking it mid-word.
function fitWord() {
  const el = $('word');
  if (el.hidden) return;
  const box = $('stageMain');
  const pic = $('pic');
  const maxH = box.clientHeight - 8 - (pic.hidden ? 0 : pic.offsetHeight + 4);
  let size = Math.min(maxH * 0.9, box.clientWidth * 0.3, 240);
  el.style.fontSize = size + 'px';
  for (let i = 0; i < 40 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > maxH); i++) {
    size *= 0.93;
    el.style.fontSize = size + 'px';
  }
}
addEventListener('resize', () => { if (screen === 'stage') { turned = null; orient(); fitWord(); } });

function answer(kind) {
  if (!round || round.mode !== 'play' || round.waiting) return;
  round.results.push({ word: round.current, kind });
  round.waiting = true;
  round.flashDone = false;
  paintScore();
  $('flashText').textContent = kind === 'got' ? 'GOT IT!' : 'PASS';
  $('flash').className = 'flash ' + kind;
  $('flash').hidden = false;
  kind === 'got' ? sfx.got() : sfx.pass();
  later(() => { round.flashDone = true; tryNext(); }, FLASH_MS);
}

// After a flash, the next word shows once the phone is back upright (or right away with buttons).
function tryNext() {
  if (!round || round.mode !== 'play' || !round.waiting || !round.flashDone) return;
  if (round.tilt && tiltLive() && !sensor.tilt.armed) return;
  showNext();
}

function roundTilt(flip, now) {
  if (round.mode === 'forehead') {
    if (sensor.tilt.restingFor(now) >= HOLD_MS && sidewaysOK()) countdown();
    return;
  }
  if (round.mode !== 'play') return;
  if (round.waiting) { tryNext(); return; }
  if (flip && round.tilt) flipped(flip);
}
const flipped = (dir) => answer((dir === 'up') === (prefs.upMeans === 'got') ? 'got' : 'pass');

function timeUp() {
  if (!round || round.ended) return;
  round.ended = true;
  clearTimers();
  if (round.current && !round.waiting) round.results.push({ word: round.current, kind: 'none' });
  round.mode = 'over';
  paintTime(0);
  $('flashText').textContent = "TIME'S UP!";
  $('flash').className = 'flash over';
  $('flash').hidden = false;
  sfx.end();
  later(() => finish("TIME'S UP!"), 1700);
}

function endEarly() {
  if (!round || round.ended) return;
  round.ended = true;
  clearTimers();
  if (round.mode === 'play' && round.current && !round.waiting) round.results.push({ word: round.current, kind: 'none' });
  finish(round.results.length ? 'ROUND OVER' : null);
}
$('endBtn').onclick = endEarly;

function finish(title) {
  keepAwake(false);
  const r = round;
  round = null;
  clearTimers();
  // remember what came up so the next rounds start with fresh words
  const seen = store.get('dont-look.seen', {});
  const shown = r.results.map((x) => x.word);
  if (shown.length) { seen[r.key] = remember(seen[r.key] || [], shown, r.words); store.set('dont-look.seen', seen); }
  if (!title) { show('ready'); return; }

  const got = r.results.filter((x) => x.kind === 'got').length;
  $('resTitle').textContent = title;
  $('resNum').textContent = got;
  $('resOf').textContent = got === 1 ? 'word guessed' : 'words guessed';
  const lvl = levelOf(prefs.level);
  $('resDeck').textContent = `${r.deck.emoji} ${r.deck.name} · ${lvl.name}`;
  const list = $('resList');
  list.innerHTML = '';
  if (!r.results.length) list.innerHTML = '<li class="none"><i>–</i>No words this round</li>';
  for (const x of r.results) {
    const li = document.createElement('li');
    li.className = x.kind;
    li.innerHTML = `<i aria-hidden="true">${x.kind === 'got' ? '✓' : x.kind === 'pass' ? '✗' : '…'}</i>`;
    li.append(document.createTextNode(x.word));
    li.setAttribute('aria-label', `${x.word}: ${x.kind === 'got' ? 'got it' : x.kind === 'pass' ? 'passed' : 'time ran out'}`);
    list.appendChild(li);
  }
  show('results');
}

$('tapGot').onclick = () => answer('got');
$('tapPass').onclick = () => answer('pass');
$('againBtn').onclick = () => {
  const asking = askTilt();
  audio();
  asking.then(() => waitForTilt(NEEDS_ASK ? 900 : 350)).then((tilt) => startRound(tilt));
};
$('decksBtn').onclick = () => show('home');
$('resBack').onclick = () => show('home');

// Keyboard (computers): up and down arrows flip, Escape ends the round.
addEventListener('keydown', (e) => {
  if (!round) return;
  if (e.key === 'Escape') { endEarly(); return; }
  if (round.mode !== 'play') return;
  if (e.key === 'ArrowUp') { e.preventDefault(); flipped('up'); }
  if (e.key === 'ArrowDown') { e.preventDefault(); flipped('down'); }
});

/* ---------- help and settings ---------- */
function openSheet(id) { $(id).hidden = false; const b = $(id).querySelector('.btn'); if (b) b.focus(); }
function closeSheet(id) { $(id).hidden = true; }
$('helpBtn').onclick = () => openSheet('help');
$('helpBtn2').onclick = () => openSheet('help');
$('helpClose').onclick = () => { closeSheet('help'); store.set('dont-look.helped', true); };
$('setBtn').onclick = () => { paintSettings(); openSheet('settings'); };
$('setClose').onclick = () => closeSheet('settings');
$('tiltOn').onclick = () => { askTilt().then(() => sleep(400)).then(paintSettings); };

function paintSettings() {
  seg($('soundSeg'), [{ value: true, big: 'On' }, { value: false, big: 'Off' }], prefs.sound, (v) => { prefs.sound = v; savePrefs(); paintSettings(); if (v) sfx.got(); });
  seg($('flipSeg'), [{ value: 'got', big: 'Got it' }, { value: 'pass', big: 'Pass' }], prefs.upMeans, (v) => { prefs.upMeans = v; savePrefs(); paintSettings(); paintFlipWords(); });
  paintFlipWords();
  $('tiltOn').hidden = !(NEEDS_ASK && !sensor.asked);
  $('tiltStatus').textContent = tiltLive() ? 'Tilt is on.'
    : sensor.blocked ? 'Tilt is turned off for this site. Close Safari all the way, open Capra Lab again and tap Allow when it asks.'
      : NEEDS_ASK && !sensor.asked ? 'iPhone asks before a site can read the tilt. Tap Turn on tilt, then Allow.'
        : 'No tilt reading yet. On a computer, use the GOT IT and PASS buttons or the arrow keys.';
  paintMeter();
}
function paintMeter() {
  const v = sensor.tilt.value == null ? 0 : Math.max(-1, Math.min(1, sensor.tilt.value));
  $('meterDot').style.left = `${50 + v * 46}%`;
  if (tiltLive() && $('tiltStatus').textContent !== 'Tilt is on.') $('tiltStatus').textContent = 'Tilt is on.';
}

/* ---------- start ---------- */
paintHome();
paintFlipWords();
show('home');
if (!store.get('dont-look.helped', false)) openSheet('help');
