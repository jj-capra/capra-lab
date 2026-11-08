// Punchline: the page. Today's drop (ten cards, solo, the same for everyone), party games hosted
// from any deck (every phone runs the same clock from the server's start time), and the round:
// the four-square (spot the sign that's off, or the punchline that lands), then the reveal.
import { schedule, beatAt, points, findMs, LETTERS, COUNTDOWN_MS } from '/punchline/shared/rules.mjs';
import { panel, fitText, ring } from '/punchline/art.js';

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const API = '/punchline/api';
const BASE = '/punchline/';
const MAX_PLAYERS = 12;

/* ---------- saved on this device (best-effort: private mode can refuse) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* fine */ } },
};
const prefs = Object.assign({ sound: true, late: false, deckId: null, name: '' }, store.get('punchline.prefs', {}));
const savePrefs = () => store.set('punchline.prefs', prefs);
// The Capra Lab player on this phone (the lab keeps it under capra-lab.profile).
const lab = (() => { const p = store.get('capra-lab.profile', null); return p && p.name && p.code ? p : null; })();
let keyBad = false;   // the lab key didn't match: play as a guest with a nickname
const signedIn = () => !!(lab && !keyBad);
const labBody = () => (signedIn() ? { lab: { name: lab.name, code: lab.code } } : {});

/* ---------- little helpers ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let toastTimer = 0;
function toast(msg, kind = '') {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast' + (kind ? ' ' + kind : ''); }, kind === 'err' ? 5000 : 3200);
}
function confetti() {
  if (reduced()) return;
  const colors = ['#FFD23F', '#FF3D8B', '#29D3F0', '#5BE38A', '#FFF8EC'];
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    p.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
    p.style.animationDelay = Math.random() * 0.4 + 's';
    if (i % 3 === 0) p.style.borderRadius = '50%';
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3600);
}
const fitSoon = (el) => { fitText(el); if (document.fonts) document.fonts.ready.then(() => fitText(el)); };
async function share(text, url) {
  try {
    if (navigator.share) { await navigator.share({ title: 'Punchline', text, url }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url ? `${text}\n${url}` : text); toast('Copied. Paste it anywhere.'); } catch (e) { toast(url || text); }
}

/* ---------- the server, and its clock ---------- */
// Every phone plays from the server's clock: each answer carries the server's `now`, and the
// sample with the shortest round trip sets the offset.
const samples = [];
let offset = 0;
const srvNow = () => Date.now() + offset;
async function api(path, body = {}) {
  const t0 = Date.now();
  let res, j;
  try {
    res = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    j = await res.json();
  } catch (e) {
    const err = new Error('Can’t reach Punchline. Check your connection and try again.');
    err.status = 0;
    throw err;
  }
  const t1 = Date.now(), now = j.now || (j.room && j.room.now);
  if (now) {
    samples.push([t1 - t0, now - (t0 + t1) / 2]);
    if (samples.length > 10) samples.shift();
    offset = samples.reduce((a, b) => (b[0] < a[0] ? b : a))[1];
  }
  if (!res.ok) { const e = new Error(j.error || 'Something went wrong. Try again.'); e.status = res.status; throw e; }
  return j;
}

/* ---------- sound, made on the spot (Web Audio) ---------- */
let ac = null;
function audio() {
  if (!prefs.sound) return null;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { return null; }
  return ac;
}
function tone(freq, dur, type = 'square', vol = 0.05, when = 0, slide = 0) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.06, freq = 2000, when = 0, type = 'bandpass') {
  const a = audio(); if (!a) return;
  const t = a.currentTime + when, n = Math.ceil(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t + dur + 0.02);
}
const SFX = {
  tick: () => tone(880, 0.05, 'square', 0.04),
  slam: () => { noise(0.12, 0.09, 400, 0, 'lowpass'); tone(110, 0.12, 'triangle', 0.08); },
  deal: () => { for (let k = 0; k < 4; k++) noise(0.05, 0.05, 3200, k * 0.07); },
  flip: () => noise(0.06, 0.05, 3600),
  fizz: () => { noise(0.6, 0.05, 6000, 0, 'highpass'); tone(1400, 0.5, 'sawtooth', 0.015, 0, -1100); },
  pick: () => tone(660, 0.07, 'triangle', 0.09),
  right: () => { tone(784, 0.1, 'triangle', 0.09); tone(1046, 0.18, 'triangle', 0.09, 0.09); },
  wrong: () => tone(150, 0.3, 'sawtooth', 0.05, 0, -50),
  meh: () => tone(300, 0.25, 'triangle', 0.05, 0, -120),
  rimshot: () => { noise(0.09, 0.14, 1800); tone(180, 0.08, 'triangle', 0.08); noise(0.09, 0.14, 1800, 0.17); tone(180, 0.08, 'triangle', 0.08, 0.17); noise(0.7, 0.07, 8000, 0.34, 'highpass'); },
  join: () => { tone(523, 0.07, 'square', 0.04); tone(784, 0.1, 'square', 0.04, 0.07); },
  fanfare: () => [523, 659, 784, 1046, 784, 1046].forEach((f, k) => tone(f, k === 5 ? 0.4 : 0.13, 'square', 0.045, k * 0.12)),
};
const sfx = (name) => { try { SFX[name] && SFX[name](); } catch (e) { /* no sound is fine */ } };
function drawSound() {
  for (const b of $$('.snd')) {
    b.setAttribute('aria-pressed', String(prefs.sound));
    b.setAttribute('aria-label', prefs.sound ? 'Sound on' : 'Sound off');
    b.innerHTML = prefs.sound
      ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  }
}

/* ---------- keep the screen awake during a game ---------- */
let wake = null;
async function wakeLock() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* fine */ } }
function releaseWake() { try { if (wake) wake.release(); } catch (e) { /* fine */ } wake = null; }

/* ---------- state ---------- */
const S = {
  today: null,     // POST /today
  deckId: null,    // the deck the host picked
  invite: null,    // the room code in the address (/punchline/ABCD)
  seat: null,      // { code, pid, tok }: this phone's place in a party game
  room: null,      // the last room view
  gameNo: 0,
  game: null,      // what the round is playing: { mode: 'solo' | 'room', title, cards, times, results, players }
  picks: {},       // this phone's letters this game, by card
  pickMs: {},      // solo: how long after the letters each pick came
  screen: 'home',
};

function show(name) {
  for (const id of ['home', 'lobby', 'round', 'final']) $(id).hidden = id !== name;
  if (name !== 'round') { cancelAnimationFrame(raf); $('count').hidden = true; }
  if (S.screen !== name) window.scrollTo(0, 0);
  S.screen = name;
}

/* ---------- sheets ---------- */
function openSheet(id) { $(id).hidden = false; const f = $(id).querySelector('button, input'); if (f) f.focus({ preventScroll: true }); }
function closeSheet(id) { $(id).hidden = true; }

/* ================= HOME ================= */
async function loadHome() {
  show('home');
  $('wrap-home').classList.toggle('invite', !!S.invite);
  renderJoin();
  renderRejoin();
  let t;
  try { t = await api('/today', labBody()); } catch (e) {
    if (e.status === 401 && lab) {
      keyBad = true; $('keyWarn').hidden = false; renderJoin();
      try { t = await api('/today', {}); } catch (e2) { toast(e2.message, 'err'); return; }
    } else { toast(e.message, 'err'); return; }
  }
  S.today = t;
  $('brewNote').hidden = !(t.brew && t.role);
  renderDrop();
  renderHost();
}

function savedDrop() { const d = store.get('punchline.daily', null); return d && S.today && S.today.daily && d.date === S.today.daily.date ? d : null; }
const KIND_NAMES = { signs: 'WRONG SIGNS', tees: 'UGLY Ts', jokes: 'JOKES' };
function renderDrop() {
  const d = S.today && S.today.daily;
  $('dropCard').hidden = !d;
  if (!d) return;
  $('dropNo').textContent = d.no;
  $('dropKind').textContent = KIND_NAMES[d.deck.type] || '';
  $('dropTitle').textContent = d.deck.title;
  $('dropBlurb').textContent = d.deck.blurb || '';
  const done = savedDrop();
  $('dropPlay').hidden = !!done;
  $('dropDone').hidden = !done;
  if (done) { $('doneScore').textContent = fmt(done.score); $('doneMarks').textContent = done.marks; }
}

function hostDecks() { return (S.today && S.today.decks) || []; }
function pickDefaultDeck() {
  const decks = hostDecks().filter((d) => prefs.late || d.shelf !== 'late');
  const saved = decks.find((d) => d.id === (S.deckId || prefs.deckId));
  return saved || decks.find((d) => d.type === 'signs') || decks[0] || null;
}
function deckTags(d) {
  return `<span class="tag ${d.type}">${KIND_NAMES[d.type] || ''}</span>${d.shelf === 'late' ? '<span class="tag late">LATE NIGHT</span>' : ''}${d.brew ? '<span class="tag brew">🔒 JJ BREW</span>' : ''}`;
}
function renderHost() {
  const t = S.today;
  $('hostCard').hidden = !(t && t.canHost);
  if (!t || !t.canHost) return;
  const d = pickDefaultDeck();
  S.deckId = d ? d.id : null;
  $('deckName').textContent = d ? d.title : 'Pick a deck';
  $('deckMeta').innerHTML = d ? `${deckTags(d)}<span>${d.count} cards</span>` : '';
  $('lateSw').checked = $('lateSw2').checked = !!prefs.late;
  $('hostBtn').disabled = !d;
}
function setLate(on) {
  prefs.late = !!on; savePrefs();
  $('lateSw').checked = $('lateSw2').checked = prefs.late;
  if (!prefs.late) { const d = hostDecks().find((x) => x.id === S.deckId); if (d && d.shelf === 'late') S.deckId = null; }
  renderHost();
  if (!$('deckSheet').hidden) renderShelves();
}

function renderJoin() {
  const inv = S.invite;
  $('inviteHead').hidden = !inv;
  $('inviteCode').textContent = inv || '';
  $('joinTitle').textContent = inv ? 'JUMP IN' : 'JOIN A GAME';
  $('codeField').hidden = !!inv;
  $('nameField').hidden = signedIn();
  $('asField').hidden = !signedIn();
  if (signedIn()) $('asName').innerHTML = `<img src="/lab/capra-lab-mark.png" alt="" width="26" height="26"> ${esc(lab.name)}`;
  if (!$('nameIn').value) $('nameIn').value = prefs.name || '';
  $('joinNote').hidden = !!lab;
}
function renderRejoin() {
  const seat = store.get('punchline.seat', null);
  const show_ = !!(seat && !S.invite && Date.now() - seat.at < 8 * 3600e3);
  $('rejoinCard').hidden = !show_;
  if (show_) $('rejoinCode').textContent = seat.code;
}

/* ---------- the deck picker ---------- */
let sheetMode = 'host';   // 'host' picks for the home screen; 'room' deals it to the room
let sheetPick = null;
const SHELVES = [
  ['WRONG SIGNS', (d) => d.type === 'signs' && d.shelf !== 'late'],
  ['UGLY Ts', (d) => d.type === 'tees' && d.shelf !== 'late'],
  ['JOKES', (d) => d.type === 'jokes' && d.shelf !== 'late'],
  ['LATE NIGHT', (d) => d.shelf === 'late'],
];
async function openDecks(mode) {
  sheetMode = mode;
  if (!S.today) { try { S.today = await api('/today', labBody()); } catch (e) { toast(e.message, 'err'); return; } }
  sheetPick = mode === 'room' && S.room ? S.room.deck.id : S.deckId;
  $('lateSw2').checked = !!prefs.late;
  renderShelves();
  $('deckGo').hidden = mode !== 'room';
  openSheet('deckSheet');
}
function renderShelves() {
  const decks = hostDecks();
  let html = '';
  for (const [name, fits] of SHELVES) {
    if (name === 'LATE NIGHT' && !prefs.late) continue;
    const list = decks.filter(fits);
    if (!list.length) continue;
    html += `<section class="shelf"><h3>${name}${name === 'LATE NIGHT' ? ' <span class="tag late">14+</span>' : ''}</h3><div class="decks">`
      + list.map((d) => `<button class="deckrow${d.id === sheetPick ? ' on' : ''}" type="button" data-deck="${esc(d.id)}" aria-pressed="${d.id === sheetPick}"><b>${esc(d.title)}</b><span class="tags">${d.brew ? '<span class="tag brew">🔒</span>' : ''}</span><small>${esc(d.blurb || '')} · ${d.count} cards</small></button>`).join('')
      + '</div></section>';
  }
  if (!prefs.late) html += '<p class="note">Turn on Late Night to see the high school decks.</p>';
  $('deckShelves').innerHTML = html || '<p class="note">No decks yet.</p>';
}
async function dealToRoom() {
  if (!S.seat || !sheetPick) return;
  $('deckGo').disabled = true;
  try {
    const r = await api(`/rooms/${S.seat.code}/again`, { pid: S.seat.pid, tok: S.seat.tok, deckId: sheetPick, late: prefs.late });
    closeSheet('deckSheet');
    onRoom(r.room);
  } catch (e) { toast(e.message, 'err'); } finally { $('deckGo').disabled = false; }
}

/* ---------- hosting and joining ---------- */
function takeSeat(code, pid, tok) {
  S.seat = { code, pid, tok, at: Date.now() };
  store.set('punchline.seat', S.seat);
  history.replaceState(null, '', BASE + code);
}
function dropSeat() {
  S.seat = null; S.room = null; S.game = null; S.gameNo = 0;
  store.set('punchline.seat', null);
  clearTimeout(pollT);
  releaseWake();
  if (location.pathname !== BASE) history.replaceState(null, '', BASE);
}
async function hostGame() {
  if (!S.deckId) return;
  $('hostBtn').disabled = true;
  try {
    const r = await api('/rooms', { ...labBody(), name: prefs.name, deckId: S.deckId, late: !!prefs.late });
    S.invite = null;
    takeSeat(r.code, r.pid, r.tok);
    onRoom(r.room);
    sfx('join');
  } catch (e) { toast(e.message, 'err'); } finally { $('hostBtn').disabled = false; }
}
async function joinGame(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (code.length !== 4) { toast('Room codes are 4 letters.', 'err'); $('codeIn').focus(); return; }
  const name = $('nameIn').value.trim();
  if (!signedIn() && !name) { toast('Type your name first.', 'err'); $('nameIn').focus(); return; }
  if (!signedIn()) { prefs.name = name; savePrefs(); }
  try {
    const r = await api(`/rooms/${code}/join`, signedIn() ? labBody() : { name });
    takeSeat(code, r.pid, r.tok);
    onRoom(r.room);
    sfx('join');
  } catch (e) {
    if (e.status === 401 && lab) { keyBad = true; $('keyWarn').hidden = false; renderJoin(); }
    toast(e.message, 'err');
  }
}
async function resume(seat) {
  S.seat = seat;
  try {
    const r = await api(`/rooms/${seat.code}`, { pid: seat.pid, tok: seat.tok });
    if (!r.room.me) { dropSeat(); return false; }
    history.replaceState(null, '', BASE + seat.code);
    onRoom(r.room);
    return true;
  } catch (e) {
    if (e.status === 404 || e.status === 403) dropSeat(); else { S.seat = null; toast(e.message, 'err'); }
    return false;
  }
}
function leave() {
  closeSheet('leaveSheet');
  dropSeat();
  S.invite = null;
  loadHome();
}

/* ---------- the room: news from the server ---------- */
let pollT = 0;
function onRoom(v) {
  if (!S.seat) return;
  if (!v.me) { toast('You’re not in that game any more.', 'err'); dropSeat(); loadHome(); return; }
  if (v.game !== S.gameNo) { S.gameNo = v.game; S.picks = {}; }
  for (const [i, p] of Object.entries(v.me.picks || {})) S.picks[i] = p;
  const before = S.room;
  S.room = v;
  if (!v.startAt) {
    if (before && before.players.length < v.players.length && S.screen === 'lobby') sfx('join');
    renderLobby(v);
    if (S.screen !== 'lobby') show('lobby');
  } else {
    S.game = { mode: 'room', title: v.deck.title, cards: v.cards, times: v.times, results: v.results, players: v.players };
    if (beatAt(v.times, srvNow()).beat === 'over') { if (S.screen !== 'final') finish(); else renderFinal(); }
    else if (S.screen !== 'round') startRound();
    else refreshRound();
  }
  schedulePoll();
}
async function poll() {
  clearTimeout(pollT);
  if (!S.seat) return;
  try {
    const r = await api(`/rooms/${S.seat.code}`, { pid: S.seat.pid, tok: S.seat.tok });
    onRoom(r.room);
    return;
  } catch (e) {
    if (e.status === 404) { toast('That game has closed.', 'err'); dropSeat(); loadHome(); return; }
  }
  pollT = setTimeout(poll, 2000);
}
// Ask for news only when something can have changed: a card's sign a moment before it shows, the
// answers at each reveal, the locked-in count while the letters are up, and the lobby now and then.
function schedulePoll() {
  clearTimeout(pollT);
  const v = S.room;
  if (!v || !S.seat) return;
  let wait = 2000;
  if (v.startAt) {
    const now = srvNow(), at = beatAt(v.times, now);
    if (at.beat === 'over') wait = 3500;
    else {
      const marks = [];
      for (const t of v.times) marks.push(t.at - 2000, t.reveal + 150, t.end + 150);
      const next = Math.min(...marks.filter((m) => m > now + 40));
      wait = Number.isFinite(next) ? next - now : 2000;
      if (at.beat === 'find') wait = Math.min(wait, 1500);   // the locked-in count
      if ((at.beat !== 'countdown' && !v.cards[at.i]) || (at.beat === 'reveal' && !v.results[at.i])) wait = Math.min(wait, 500);
    }
  }
  pollT = setTimeout(poll, clamp(wait, 250, 8000));
}

/* ================= LOBBY ================= */
function renderLobby(v) {
  $('roomCode').textContent = v.code;
  $('roomUrl').textContent = location.host + BASE + v.code;
  $('pCount').textContent = `${v.players.length} of ${MAX_PLAYERS}`;
  // redraw the list only when it changes, and only a new arrival pops in
  const ul = $('lobbyPlayers');
  const had = new Set(JSON.parse(ul.dataset.names || '[]'));
  const list = v.players.map((p) => `<li class="${p.me ? 'me' : ''}${had.has(p.name) ? ' old' : ''}"><i aria-hidden="true">${p.host ? '👑' : '🎤'}</i>${esc(p.name)}${p.me ? ' <span class="muted">(you)</span>' : ''}</li>`).join('');
  const names = JSON.stringify(v.players.map((p) => p.name));
  if (ul.dataset.names !== names) { ul.innerHTML = list; ul.dataset.names = names; }
  $('lobbyDeck').innerHTML = `${esc(v.deck.title)} <span class="tag ${v.deck.type}">${KIND_NAMES[v.deck.type] || ''}</span>${v.late ? ' <span class="tag late">LATE NIGHT</span>' : ''}`;
  $('startBtn').hidden = !v.host;
  $('lobbyDeckBtn').hidden = !v.host;
  $('waitNote').hidden = v.host;
  $('startBtn').textContent = v.players.length > 1 ? `Start the game (${v.players.length} players)` : 'Start the game';
}
async function startGame() {
  $('startBtn').disabled = true;
  try { const r = await api(`/rooms/${S.seat.code}/start`, { pid: S.seat.pid, tok: S.seat.tok }); onRoom(r.room); } catch (e) { toast(e.message, 'err'); }
  finally { $('startBtn').disabled = false; }
}

/* ================= TODAY'S DROP (solo) ================= */
function playDrop() {
  const d = S.today && S.today.daily;
  if (!d) return;
  S.picks = {}; S.pickMs = {};
  S.game = { mode: 'solo', title: d.deck.title, cards: d.cards, times: schedule(d.cards, Date.now() + COUNTDOWN_MS), results: [], players: null, no: d.no, date: d.date };
  audio();
  startRound();
}

/* ================= THE ROUND ================= */
// The four-square: four tiles. A sign shows the same panel four times, one of them off (a dead
// bulb, a typo); tap it. A joke shows its setup over four punchlines; tap the one that lands.
// Then the odd sign zooms in with the difference circled, or the punchline lights up.
let raf = 0;
const cur = { i: -1, beat: '', waiting: false, revealed: -1, gridFor: -1, count: -1, beatName: '', secs: -1 };
const clock = () => (S.game && S.game.mode === 'solo' ? Date.now() : srvNow());

function startRound() {
  show('round');
  Object.assign(cur, { i: -1, beat: '', waiting: false, revealed: -1, gridFor: -1, count: -1, beatName: '', secs: -1 });
  $('countDeck').textContent = S.game.title;
  $('myScore').textContent = fmt(myScore());
  $('grid').innerHTML = '';
  $('panel').hidden = true;
  $('ask').textContent = '';
  $('status').textContent = '';
  wakeLock();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}
function loop() {
  raf = requestAnimationFrame(loop);
  const g = S.game;
  if (!g) return;
  const now = clock(), at = beatAt(g.times, now);
  if (at.i !== cur.i || at.beat !== cur.beat || cur.waiting) enter(at.i, at.beat, now);
  if (S.screen === 'round') tick(at, now);
}
// A poll brought news: fill in whatever the current beat was waiting for.
function refreshRound() {
  if (cur.beat === 'find' && S.game.mode === 'room') lockedLine();
  if (cur.beat === 'reveal' && cur.revealed !== cur.i && revealReady(cur.i)) showReveal(cur.i);
}
function enter(i, beat) {
  const g = S.game, wasWaiting = cur.waiting;
  cur.i = i; cur.beat = beat; cur.waiting = false;
  if (beat === 'over') { finish(); return; }
  $('count').hidden = beat !== 'countdown';
  if (beat === 'countdown') { $('cardNo').textContent = `CARD 0/${g.times.length}`; return; }
  const card = g.cards[i];
  if (!card) { cur.waiting = true; if (!wasWaiting) showWait(); return; }
  $('cardNo').textContent = `CARD ${i + 1}/${g.times.length}`;
  if (cur.gridFor !== i) drawCard(i, card);
  if (beat === 'find') {
    if (S.picks[i] != null) markPicked(S.picks[i]);
    if (g.mode === 'room') lockedLine(); else if (S.picks[i] == null) status(card.type === 'joke' ? 'Tap the punchline that lands' : 'Tap the one that’s different');
  } else if (beat === 'reveal') {
    if (!revealReady(i)) { cur.waiting = true; if (!wasWaiting) status('Drumroll…'); return; }
    if (cur.revealed !== i) showReveal(i);
  }
}
function showWait() {
  $('panel').hidden = true;
  $('grid').className = 'grid4';
  $('grid').innerHTML = '<div class="wait">…</div>';
  cur.gridFor = -1;
}
function drawCard(i, card) {
  const grid = $('grid'), p = $('panel');
  $('caption').hidden = true;
  $('stamp').hidden = true;
  $('ask').textContent = card.ask || '';
  p.classList.remove('spin', 'zoom', 'big');
  p.style.transform = '';
  if (card.type === 'joke') {
    p.hidden = false;
    $('panelArt').innerHTML = panel(card);
    const bubble = $('bubble');
    bubble.hidden = false;
    bubble.textContent = card.setup;
    bubble.classList.toggle('long', card.setup.length > 90);
    grid.className = 'grid4 jokes deal';
    grid.innerHTML = card.options.map((o, k) => `<button class="tile txt" type="button" data-k="${k}" style="--c: var(--${LETTERS[k]})"><span class="ltr">${LETTERS[k]}</span><span class="say">${esc(o)}</span><span class="lock">LOCKED IN</span></button>`).join('');
  } else {
    p.hidden = true;
    $('bubble').hidden = true;
    grid.className = 'grid4 signs deal';
    grid.innerHTML = [0, 1, 2, 3].map((k) => `<button class="tile art" type="button" data-k="${k}" aria-label="Tile ${LETTERS[k]}">${panel(card, { lines: k === card.odd ? card.off : card.base })}<span class="ltr" aria-hidden="true">${LETTERS[k]}</span><span class="lock">LOCKED IN</span></button>`).join('');
    fitSoon(grid);
  }
  cur.gridFor = i;
  sfx('deal');
}
function markPicked(k) {
  const grid = $('grid');
  grid.classList.add('locked');
  for (const el of grid.querySelectorAll('.tile')) el.classList.toggle('picked', +el.dataset.k === k);
}
function lockedLine() {
  const ps = (S.room && S.room.players) || [];
  const n = ps.filter((p) => p.locked || (p.me && S.picks[cur.i] != null)).length;
  status(S.picks[cur.i] != null ? `You’re locked in · <b>${n}</b> of ${ps.length} in` : `<b>${n}</b> of ${ps.length} locked in`);
}
function pick(k) {
  const g = S.game, i = cur.i;
  if (!g || cur.beat !== 'find' || S.picks[i] != null || !g.cards[i]) return;
  const ms = clock() - g.times[i].at;
  S.picks[i] = k; S.pickMs[i] = ms;
  markPicked(k);
  sfx('pick');
  try { navigator.vibrate && navigator.vibrate(18); } catch (e) { /* fine */ }
  if (g.mode === 'solo') { status(`Locked in at ${(ms / 1000).toFixed(1)}s`); return; }
  lockedLine();
  const send = (tries) => api(`/rooms/${S.seat.code}/answer`, { pid: S.seat.pid, tok: S.seat.tok, i, pick: k })
    .then((r) => { if (r.pick != null && r.pick !== k) { S.picks[i] = r.pick; if (cur.i === i) markPicked(r.pick); } })
    .catch((e) => { if (e.status === 0 && tries > 0) setTimeout(() => send(tries - 1), 400); else if (cur.i === i) toast(e.message, 'err'); });
  send(2);
}

function revealReady(i) {
  const g = S.game;
  return g.mode === 'solo' ? true : !!(g.results[i] && g.cards[i] && g.cards[i].answer != null);
}
function myScore() {
  const g = S.game;
  if (!g) return 0;
  if (g.mode === 'solo') return g.results.reduce((s, r) => s + (r && r.mine ? r.mine.gained : 0), 0);
  const me = (g.players || []).find((p) => p.me);
  return me ? me.score : 0;
}
function showReveal(i) {
  cur.revealed = i;
  const g = S.game, card = g.cards[i], grid = $('grid'), p = $('panel');
  let answer, mine, ok, gained, line;
  if (g.mode === 'solo') {
    answer = card.answer; mine = S.picks[i]; ok = mine === answer;
    gained = ok ? points(S.pickMs[i], findMs(card), false) : 0;
    g.results[i] = { answer, mine: { pick: mine == null ? null : mine, ok, gained } };
    line = ok ? `<b>+${gained}</b> · found it in ${(S.pickMs[i] / 1000).toFixed(1)}s` : mine == null ? 'Too slow!' : `Not ${LETTERS[mine]}. It was ${LETTERS[answer]}.`;
  } else {
    const r = g.results[i];
    answer = r.answer; mine = r.mine ? r.mine.pick : S.picks[i]; ok = !!(r.mine && r.mine.ok); gained = r.mine ? r.mine.gained : 0;
    line = r.first ? `⚡ <b>${esc(r.first)}</b> got it first · ${r.right.length} of ${g.players.length} right` : 'Nobody got it!';
  }
  for (const el of grid.querySelectorAll('.tile')) {
    const k = +el.dataset.k;
    el.classList.toggle('right', k === answer);
    el.classList.toggle('wrong', k === mine && !ok);
    el.classList.toggle('mine', k === mine);
    el.classList.remove('picked');
  }
  grid.classList.remove('locked', 'deal');
  grid.classList.add('revealed');
  const stamp = $('stamp');
  if (card.type === 'joke') {
    stamp.textContent = 'BA-DUM-TSS!';
    stamp.classList.add('joke');
    sfx('rimshot');
    setTimeout(() => sfx(ok ? 'right' : mine == null ? 'meh' : 'wrong'), 650);
  } else {
    // the odd tile zooms up to fill the screen, its difference circled
    const tile = grid.querySelector(`.tile[data-k="${answer}"]`);
    const from = tile ? tile.getBoundingClientRect() : null;
    $('panelArt').innerHTML = panel(card, { lines: card.off, marks: card.marks });
    p.hidden = false;
    p.classList.add('big');
    grid.classList.add('gone');
    $('ask').textContent = card.reading || '';
    const to = p.getBoundingClientRect();
    if (from && to.width && !reduced()) {
      p.style.transition = 'none';
      p.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`;
      p.style.transformOrigin = '0 0';
      void p.offsetWidth;
      p.style.transition = 'transform 0.42s cubic-bezier(.2, 1.1, .4, 1)';
      p.style.transform = '';
    }
    const art = $('panelArt');
    const circle = () => { if (cur.i === i && !art.querySelector('.ring')) { fitText(art); ring(art.querySelector('svg')); } };
    setTimeout(() => (document.fonts ? document.fonts.ready.then(circle) : circle()), reduced() ? 0 : 450);
    stamp.textContent = card.stamp || 'OOPS.';
    stamp.classList.remove('joke');
    sfx('slam');
    setTimeout(() => sfx(ok ? 'right' : mine == null ? 'meh' : 'wrong'), 300);
    // a shirt with a punchline on the back turns around
    if (card.scene === 'tee' && card.back) {
      setTimeout(() => {
        if (cur.i !== i) return;
        p.classList.remove('spin'); void p.offsetWidth; p.classList.add('spin');
        setTimeout(() => { if (cur.i === i) { art.innerHTML = panel(card, { back: true, lines: card.off }); fitSoon(art); } }, reduced() ? 0 : 330);
      }, 1700);
    }
  }
  stamp.hidden = false;
  stamp.style.animation = 'none'; void stamp.offsetWidth; stamp.style.animation = '';
  if (card.caption) { $('caption').textContent = card.caption; $('caption').hidden = false; }
  popGain(ok ? `+${gained}` : mine == null ? 'TOO SLOW' : 'NOPE', !ok);
  const sc = $('myScore');
  sc.textContent = fmt(myScore());
  if (ok) { sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump'); }
  status(line);
}
function popGain(text, miss) {
  const box = $('status').getBoundingClientRect();   // just above the result line
  const el = document.createElement('div');
  el.className = 'gain' + (miss ? ' miss' : '');
  el.textContent = text;
  el.style.left = box.left + box.width / 2 + 'px';
  el.style.top = box.top - 52 + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}
function status(html) { $('status').innerHTML = html; }

function tick(at, now) {
  const g = S.game;
  if (at.beat === 'countdown') {
    const n = Math.max(1, Math.ceil((g.times[0].at - now) / 1000));
    if (n !== cur.count) { cur.count = n; const b = $('countNum'); b.textContent = n; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); sfx('tick'); }
    return;
  }
  const t = g.times[at.i];
  if (!t) return;
  const span = at.beat === 'find' ? [t.at, t.reveal] : [t.reveal, t.end];
  const left = span[1] - now;
  $('fuse').style.transform = `scaleX(${clamp(left / (span[1] - span[0]), 0, 1)})`;
  $('fuseBox').classList.toggle('hot', at.beat === 'find' && left < 3000);
  // the last three seconds tick
  const secs = at.beat === 'find' ? Math.ceil(left / 1000) : -1;
  if (secs !== cur.secs) { cur.secs = secs; if (secs > 0 && secs <= 3 && S.picks[at.i] == null) sfx('tick'); }
  const card = g.cards[at.i];
  const name = at.beat === 'find' ? (card && card.type === 'joke' ? 'PICK IT!' : 'FIND IT!') : 'REVEAL';
  if (name !== cur.beatName) { cur.beatName = name; $('beatName').textContent = name; }
}

/* ================= THE END ================= */
function finish() {
  cancelAnimationFrame(raf);
  releaseWake();
  show('final');
  if (S.game && S.game.mode === 'solo') renderSoloFinal(); else renderFinal();
  sfx('fanfare');
  confetti();
}
function renderFinal() {
  const v = S.room;
  if (!v) return;
  $('soloCard').hidden = true;
  $('podium').hidden = $('ranks').hidden = false;
  $('finalDeck').textContent = v.deck.title.toUpperCase();
  const ps = v.players.slice().sort((a, b) => b.score - a.score);
  const me = ps.findIndex((p) => p.me);
  $('finalTitle').textContent = me === 0 && ps.length > 1 ? 'YOU WIN!' : 'FINAL SCORES';
  const step = (p, k) => (p ? `<div class="p${k + 1}"><span class="who">${esc(p.name)}</span><span class="pts">${fmt(p.score)}</span><span class="step">${k + 1}</span></div>` : '<div></div>');
  $('podium').innerHTML = step(ps[1], 1) + step(ps[0], 0) + step(ps[2], 2);
  $('ranks').innerHTML = ps.slice(3).map((p, k) => `<li class="${p.me ? 'me' : ''}"><span>${k + 4}</span><span>${esc(p.name)}</span><b>${fmt(p.score)}</b></li>`).join('');
  $('againBtn').hidden = !v.host;
  $('againWait').hidden = v.host;
  $('shareBtn').textContent = 'Invite more friends';
  $('homeBtn').textContent = 'Leave the game';
}
function renderSoloFinal() {
  const g = S.game;
  $('soloCard').hidden = false;
  $('podium').hidden = $('ranks').hidden = true;
  $('againBtn').hidden = $('againWait').hidden = true;
  $('finalDeck').textContent = g.title.toUpperCase();
  const score = myScore(), right = g.results.filter((r) => r && r.mine && r.mine.ok).length;
  const marks = g.results.map((r) => (r && r.mine && r.mine.ok ? '🟩' : r && r.mine && r.mine.pick != null ? '🟥' : '⬛')).join('');
  $('finalTitle').textContent = right >= 9 ? 'COMEDY GOLD!' : right >= 6 ? 'NICE TIMING!' : right >= 3 ? 'TOUGH CROWD' : 'BOOOO!';
  $('soloNo').textContent = `TODAY’S DROP · No. ${g.no}`;
  $('soloScore').textContent = fmt(score);
  $('soloMarks').textContent = marks;
  $('soloLine').textContent = `${right} of ${g.results.length} right. A new drop lands at midnight (Pacific).`;
  $('shareBtn').textContent = 'Share your score';
  $('homeBtn').textContent = 'Back to Punchline';
  store.set('punchline.daily', { date: g.date, no: g.no, score, marks });
}
function shareFinal() {
  if (S.game && S.game.mode === 'solo') { const d = store.get('punchline.daily', {}); shareDrop(d); return; }
  if (S.seat) share(`Get in here: Punchline, game ${S.seat.code}`, location.origin + BASE + S.seat.code);
}
function shareDrop(d) {
  if (!d || d.score == null) return;
  share(`PUNCHLINE No. ${d.no} · ${fmt(d.score)} pts\n${d.marks}`, location.origin + BASE);
}

/* ================= wiring ================= */
function wire() {
  drawSound();
  for (const b of $$('.snd')) b.addEventListener('click', () => { prefs.sound = !prefs.sound; savePrefs(); drawSound(); if (prefs.sound) sfx('pick'); });
  for (const b of $$('.help')) b.addEventListener('click', () => openSheet('help'));
  for (const b of $$('.leave')) b.addEventListener('click', () => { if (S.game && S.game.mode === 'solo' && S.screen === 'round') { S.game = null; loadHome(); return; } if (S.screen === 'final' && S.game && S.game.mode === 'solo') { S.game = null; loadHome(); return; } openSheet('leaveSheet'); });
  $('leaveYes').addEventListener('click', leave);
  for (const v of $$('.veil')) {
    v.addEventListener('click', (e) => { if (e.target === v) v.hidden = true; });
    for (const b of v.querySelectorAll('[data-close]')) b.addEventListener('click', () => { v.hidden = true; });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { for (const v of $$('.veil')) v.hidden = true; return; }
    if (S.screen !== 'round' || e.target.closest('input')) return;
    const k = 'abcd'.indexOf(e.key.toLowerCase()), n = '1234'.indexOf(e.key);
    const idx = k >= 0 ? k : n;
    if (cur.beat === 'find' && idx >= 0) pick(idx);
  });

  // home
  $('dropPlay').addEventListener('click', playDrop);
  $('doneShare').addEventListener('click', () => shareDrop(savedDrop()));
  $('deckBtn').addEventListener('click', () => openDecks('host'));
  $('lateSw').addEventListener('change', (e) => setLate(e.target.checked));
  $('lateSw2').addEventListener('change', (e) => setLate(e.target.checked));
  $('hostBtn').addEventListener('click', hostGame);
  $('joinForm').addEventListener('submit', (e) => { e.preventDefault(); joinGame(S.invite || $('codeIn').value); });
  $('codeIn').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });
  $('rejoinBtn').addEventListener('click', async () => { const seat = store.get('punchline.seat', null); if (!seat || !(await resume(seat))) { toast('That game has closed.'); renderRejoin(); } });
  $('deckShelves').addEventListener('click', (e) => {
    const b = e.target.closest('[data-deck]');
    if (!b) return;
    sheetPick = b.dataset.deck;
    if (sheetMode === 'host') { S.deckId = sheetPick; prefs.deckId = sheetPick; savePrefs(); renderHost(); closeSheet('deckSheet'); return; }
    renderShelves();
  });
  $('deckGo').addEventListener('click', dealToRoom);

  // lobby
  $('startBtn').addEventListener('click', startGame);
  $('lobbyDeckBtn').addEventListener('click', () => openDecks('room'));
  $('inviteBtn').addEventListener('click', () => S.seat && share(`Get in here: Punchline, game ${S.seat.code}`, location.origin + BASE + S.seat.code));

  // the round: tap a tile
  $('grid').addEventListener('click', (e) => { const b = e.target.closest('.tile'); if (b && cur.beat === 'find') pick(+b.dataset.k); });
  $('grid').addEventListener('pointerdown', () => audio());

  // the end
  $('againBtn').addEventListener('click', () => openDecks('room'));
  $('shareBtn').addEventListener('click', shareFinal);
  $('homeBtn').addEventListener('click', () => { if (S.game && S.game.mode === 'solo') { S.game = null; loadHome(); } else leave(); });

  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.seat) poll(); if (!document.hidden && S.screen === 'round') wakeLock(); });
  document.addEventListener('pointerdown', () => audio(), { once: true });
}

async function boot() {
  wire();
  const m = location.pathname.match(/^\/punchline\/([A-Za-z]{4})\/?$/);
  const code = m && m[1].toUpperCase();
  const seat = store.get('punchline.seat', null);
  if (code) {
    if (seat && seat.code === code && (await resume(seat))) return;
    S.invite = code;
  }
  loadHome();
}
boot();
