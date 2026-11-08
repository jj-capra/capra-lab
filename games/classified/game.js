// Classified: the page. A file opens in the evening (the briefing), runs all night (secret
// missions, counter-intel, Who Said It, the Yearbook) and is declassified when the host taps it:
// every phone follows the same reveal. The share page shows the highlights, codenames only.
import { avatar, randomAvatar, PARTS } from '/classified/shared/avatar.mjs';
import { MIN_PLAYERS, MAX_PLAYERS, ANSWER_MAX } from '/classified/shared/rules.mjs';

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const API = '/classified/api';
const BASE = '/classified/';

/* ---------- saved on this device (best-effort: private mode can refuse) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* fine */ } },
};
const prefs = Object.assign({ sound: true, name: '' }, store.get('classified.prefs', {}));
const savePrefs = () => store.set('classified.prefs', prefs);
const lab = (() => { const p = store.get('capra-lab.profile', null); return p && p.name && p.code ? p : null; })();
let keyBad = false;
const signedIn = () => !!(lab && !keyBad);
const labBody = () => (signedIn() ? { lab: { name: lab.name, code: lab.code } } : {});

/* ---------- little helpers ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
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
  const colors = ['#D7263D', '#FFD23F', '#EBD6A6', '#FFF8EC', '#29D3F0'];
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
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3600);
}
async function share(text, url) {
  try { if (navigator.share) { await navigator.share({ title: 'Classified', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url ? `${text}\n${url}` : text); toast('Copied. Paste it anywhere.'); } catch (e) { toast(url || text); }
}
const fmtLeft = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};
const clockTime = (ms) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const av = (p, size = 56) => avatar(p.avatar, size, p.codename ? `Agent ${p.codename}` : '');

/* ---------- the server, and its clock ---------- */
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
    const err = new Error('Can’t reach headquarters. Check your connection and try again.');
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

/* ---------- sound (Web Audio, made on the spot) ---------- */
let ac = null;
function audio() {
  if (!prefs.sound) return null;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { return null; }
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
  stamp: () => { noise(0.14, 0.14, 300, 0, 'lowpass'); tone(90, 0.12, 'triangle', 0.1); },
  type: () => noise(0.03, 0.05, 4000),
  tick: () => tone(1000, 0.04, 'square', 0.03),
  join: () => { tone(523, 0.07, 'square', 0.04); tone(784, 0.1, 'square', 0.04, 0.07); },
  right: () => { tone(784, 0.1, 'triangle', 0.09); tone(1046, 0.18, 'triangle', 0.09, 0.09); },
  wrong: () => tone(150, 0.3, 'sawtooth', 0.05, 0, -50),
  sting: () => [196, 233, 294, 392].forEach((f, k) => tone(f, 0.22, 'sawtooth', 0.035, k * 0.1)),
  fanfare: () => [523, 659, 784, 1046, 784, 1046].forEach((f, k) => tone(f, k === 5 ? 0.4 : 0.13, 'square', 0.045, k * 0.12)),
};
const sfx = (n) => { try { SFX[n] && SFX[n](); } catch (e) { /* fine */ } };
function drawSound() {
  for (const b of $$('.snd')) {
    b.setAttribute('aria-pressed', String(prefs.sound));
    b.setAttribute('aria-label', prefs.sound ? 'Sound on' : 'Sound off');
    b.innerHTML = prefs.sound
      ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  }
}

/* ---------- state ---------- */
const S = { hello: null, invite: null, seat: null, room: null, screen: 'home', tab: 'missions', step: -1, drafts: {} };
function show(name) {
  for (const id of ['home', 'lobby', 'night', 'reveal', 'file']) $(id).hidden = id !== name;
  if (S.screen !== name) window.scrollTo(0, 0);
  S.screen = name;
}
function openSheet(id) { $(id).hidden = false; }
function closeSheet(id) { $(id).hidden = true; }
let confirmFn = null;
function ask(title, note, yes, fn) {
  $('cfTitle').textContent = title; $('cfNote').textContent = note; $('cfYes').textContent = yes;
  confirmFn = fn; openSheet('confirmSheet');
}

/* ================= HOME ================= */
async function loadHome() {
  show('home');
  $('wrap-home').classList.toggle('invite', !!S.invite);
  renderJoin(); renderRejoin();
  try { S.hello = await api('/hello', labBody()); } catch (e) {
    if (e.status === 401 && lab) { keyBad = true; $('keyWarn').hidden = false; renderJoin(); try { S.hello = await api('/hello', {}); } catch (e2) { toast(e2.message, 'err'); return; } }
    else { toast(e.message, 'err'); return; }
  }
  $('brewNote').hidden = !(S.hello.brew && S.hello.role);
  $('hostCard').hidden = !S.hello.canHost || !!S.invite;
}
function renderJoin() {
  $('inviteHead').hidden = !S.invite;
  $('inviteCode').textContent = S.invite || '';
  $('joinTitle').textContent = S.invite ? 'REPORT FOR DUTY' : 'JOIN AN OPERATION';
  $('codeField').hidden = !!S.invite;
  $('nameField').hidden = signedIn();
  $('asField').hidden = !signedIn();
  if (signedIn()) $('asName').innerHTML = `<img src="/lab/capra-lab-mark.png" alt="" width="26" height="26"> ${esc(lab.name)}`;
  if (!$('nameIn').value) $('nameIn').value = prefs.name || '';
  $('joinNote').hidden = !!lab;
}
function renderRejoin() {
  const seat = store.get('classified.seat', null);
  const on = !!(seat && !S.invite && Date.now() - seat.at < 36 * 3600e3);
  $('rejoinCard').hidden = !on;
  if (on) $('rejoinCode').textContent = seat.code;
}

/* ---------- seats ---------- */
function takeSeat(code, pid, tok) {
  S.seat = { code, pid, tok, at: Date.now() };
  store.set('classified.seat', S.seat);
  history.replaceState(null, '', BASE + code);
}
function dropSeat() {
  S.seat = null; S.room = null; S.step = -1;
  store.set('classified.seat', null);
  clearTimeout(pollT);
  if (location.pathname !== BASE) history.replaceState(null, '', BASE);
}
async function openFile() {
  $('hostBtn').disabled = true;
  try {
    const r = await api('/rooms', { ...labBody(), name: prefs.name, avatar: randomAvatar() });
    takeSeat(r.code, r.pid, r.tok); sfx('stamp'); onRoom(r.room);
  } catch (e) { toast(e.message, 'err'); } finally { $('hostBtn').disabled = false; }
}
async function joinFile(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (code.length !== 4) { toast('File codes are 4 letters.', 'err'); $('codeIn').focus(); return; }
  const name = $('nameIn').value.trim();
  if (!signedIn() && !name) { toast('Type your name first.', 'err'); $('nameIn').focus(); return; }
  if (!signedIn()) { prefs.name = name; savePrefs(); }
  try {
    const r = await api(`/rooms/${code}/join`, signedIn() ? { ...labBody(), avatar: randomAvatar() } : { name, avatar: randomAvatar() });
    takeSeat(code, r.pid, r.tok); sfx('join'); onRoom(r.room);
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
function leave() { closeSheet('confirmSheet'); dropSeat(); S.invite = null; loadHome(); }

/* ---------- news from the server ---------- */
let pollT = 0;
async function act(path, extra = {}) {
  if (!S.seat) return null;
  try {
    const r = await api(`/rooms/${S.seat.code}${path}`, { pid: S.seat.pid, tok: S.seat.tok, ...extra });
    onRoom(r.room);
    return r;
  } catch (e) {
    // a tap that lands just as the reveal moves on: catch up quietly
    if (e.status === 409 && /moved on|over for that one|right now/.test(e.message)) { poll(); return null; }
    toast(e.message, 'err');
    if (e.status === 404) { dropSeat(); loadHome(); }
    return null;
  }
}
function onRoom(v) {
  if (!S.seat) return;
  if (!v.me) { toast('You’re not on this operation any more.', 'err'); dropSeat(); loadHome(); return; }
  const before = S.room;
  S.room = v;
  if (v.phase === 'lobby') { if (before && before.players.length < v.players.length) sfx('join'); renderLobby(v); if (S.screen !== 'lobby') show('lobby'); }
  else if (v.phase === 'night') { if (S.screen !== 'night') { show('night'); sfx('stamp'); } renderNight(v, before); }
  else if (v.phase === 'reveal') { if (S.screen !== 'reveal') { show('reveal'); S.step = -1; } renderReveal(v); }
  schedulePoll();
}
async function poll() {
  clearTimeout(pollT);
  if (!S.seat) return;
  try { const r = await api(`/rooms/${S.seat.code}`, { pid: S.seat.pid, tok: S.seat.tok }); onRoom(r.room); return; } catch (e) {
    if (e.status === 404) { toast('That file has been shredded.', 'err'); dropSeat(); loadHome(); return; }
  }
  pollT = setTimeout(poll, 4000);
}
function schedulePoll() {
  clearTimeout(pollT);
  const v = S.room;
  if (!v || !S.seat) return;
  let wait = v.phase === 'lobby' ? 2500 : v.phase === 'reveal' ? 1200 : 10000;   // the night: every 10 s (a whole night is hours)
  if (v.phase === 'reveal' && v.step && v.step.endsAt) wait = clamp(Math.min(wait, v.step.endsAt - srvNow() + 120), 250, 1200);
  pollT = setTimeout(poll, wait);
}

/* ================= BRIEFING ================= */
const PART_NAMES = { skin: 'FACE', hair: 'HAIR', hairColor: 'COLOR', eyes: 'EYES', mouth: 'MOUTH', gear: 'GEAR', bg: 'BACKDROP' };
let myLook = null, lookTimer = 0;
function renderLobby(v) {
  $('opName').textContent = v.op;
  $('opRoll').hidden = !v.host;
  $('roomCode').textContent = v.code;
  $('roomUrl').textContent = location.host + BASE + v.code;
  if (!myLook || !lookTimer) myLook = { ...v.me.avatar };
  drawMe(v);
  $('pCount').textContent = `${v.players.length} of ${MAX_PLAYERS}`;
  drawAgents($('lobbyAgents'), v.players);
  $('startBtn').hidden = !v.host;
  $('startBtn').disabled = v.players.length < MIN_PLAYERS;
  $('startBtn').textContent = v.players.length < MIN_PLAYERS ? `Need ${MIN_PLAYERS - v.players.length} more agent${MIN_PLAYERS - v.players.length === 1 ? '' : 's'}` : `Begin the operation (${v.players.length} agents)`;
  $('waitNote').hidden = v.host;
}
function drawMe(v) {
  $('meAvatar').innerHTML = avatar(myLook, 96, `Agent ${v.me.codename}`);
  $('meCodename').textContent = `AGENT ${v.me.codename}`;
  if (!$('parts').children.length) {
    $('parts').innerHTML = Object.keys(PARTS).map((k) => `<div class="part" data-part="${k}"><button type="button" data-d="-1" aria-label="Previous ${PART_NAMES[k].toLowerCase()}">‹</button><span>${PART_NAMES[k]}</span><button type="button" data-d="1" aria-label="Next ${PART_NAMES[k].toLowerCase()}">›</button></div>`).join('');
  }
}
function changeLook(next) {
  myLook = next;
  if (S.room) drawMe(S.room);
  clearTimeout(lookTimer);
  lookTimer = setTimeout(async () => { lookTimer = 0; await act('/me', { avatar: myLook }); }, 600);
}
const agentsKey = new WeakMap();
function drawAgents(ul, players, opts = {}) {
  const key = JSON.stringify(players.map((p) => [p.id, p.codename, p.avatar]));
  if (agentsKey.get(ul) === key) return;
  const had = new Set((ul.dataset.ids || '').split(',').filter(Boolean));
  ul.innerHTML = players.map((p) => `<li class="${had.size && !had.has(p.id) ? 'new' : ''}" ${opts.remove && !p.host ? `data-remove="${p.id}" role="button" tabindex="0"` : ''}>${p.host ? '<span class="tag" title="Host">👑</span>' : ''}${av(p, 64)}<span class="cn">${esc(p.codename)}</span><span class="nm">${esc(p.name)}${p.me ? ' (you)' : ''}</span></li>`).join('');
  ul.dataset.ids = players.map((p) => p.id).join(',');
  agentsKey.set(ul, key);
}

/* ================= THE NIGHT ================= */
function setTab(t) {
  S.tab = t;
  for (const b of $$('.tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === t));
  for (const k of ['missions', 'said', 'yearbook', 'agents']) $('tab-' + k).hidden = k !== t;
  const seen = store.get('classified.seen', {});
  if (S.room) {
    if (t === 'missions') seen.m = S.room.missions.length;
    if (t === 'said') seen.s = S.room.prompts.length;
    if (t === 'yearbook') seen.y = 1;
    store.set('classified.seen', { ...seen, code: S.room.code });
    drawBadges(S.room);
  }
}
function drawBadges(v) {
  let seen = store.get('classified.seen', {});
  if (seen.code !== v.code) seen = { code: v.code };
  const newM = Math.max(0, v.missions.length - (seen.m || 0));
  const openS = v.prompts.filter((p) => !p.mine).length;
  const openY = v.awards.filter((a) => !a.vote).length;
  const set = (id, n) => { $(id).hidden = !n; $(id).textContent = n; };
  set('badgeM', S.tab === 'missions' ? 0 : newM);
  set('badgeS', S.tab === 'said' ? 0 : openS);
  set('badgeY', S.tab === 'yearbook' ? 0 : openY);
}
function renderNight(v, before) {
  $('nightOp').textContent = v.op;
  if (before && before.phase === 'night' && v.missions.length > before.missions.length) { toast('New mission in your file.'); sfx('stamp'); }
  if (before && before.phase === 'night' && v.prompts.length > before.prompts.length) toast('New question in Who Said It.');
  drawMissions(v);
  drawPrompts(v);
  drawAwards(v);
  drawAgents($('nightAgents'), v.players, { remove: v.host });
  $('removeNote').hidden = !v.host;
  $('nightHost').hidden = !v.host;
  $('dropBtn').disabled = !v.nextPromptAt;
  $('accLeft').textContent = `${plural(v.accusesLeft, 'try', 'tries')} left`;
  $('accuseBtn').disabled = !v.accusesLeft;
  $('newsList').innerHTML = v.news.map((n) => `<li><time>${esc(clockTime(n.at))}</time>${esc(n.text)}</li>`).join('');
  drawBadges(v);
  if (S.tab === 'missions' || S.tab === 'said') setTab(S.tab);
  drawCountdowns();
}
function drawCountdowns() {
  const v = S.room;
  if (!v || v.phase !== 'night') return;
  $('nextMission').textContent = v.nextMissionAt ? `Next mission in ${fmtLeft(v.nextMissionAt - srvNow())}` : 'That’s every mission for tonight.';
  $('nextPrompt').textContent = v.nextPromptAt ? `Next question in ${fmtLeft(v.nextPromptAt - srvNow())}` : `That’s all ${v.promptTotal} questions.`;
}
function drawMissions(v) {
  const key = JSON.stringify(v.missions);
  const list = $('missionList');
  $('swapsLeft').textContent = `${plural(v.swapsLeft, 'swap')} left`;
  if (list.dataset.key === key) return;
  list.dataset.key = key;
  list.innerHTML = v.missions.map((m) => {
    const words = esc(m.text).split(' ').map((w) => `<span class="rd">${w}</span>`).join(' ');
    const st = m.status === 'done' ? '<span class="stamp green">COMPLETE</span>' : m.status === 'burned' ? `<span class="stamp">BURNED</span>` : '';
    return `<div class="mission ${m.status}" data-slot="${m.slot}">
      <div class="num"><span>MISSION ${m.slot + 1}</span>${m.status === 'active' ? '<span class="hold">HOLD TO READ</span>' : ''}</div>
      <div class="txt" tabindex="0" aria-label="${esc(m.text)}">${m.status === 'active' ? words : esc(m.text)}</div>
      ${m.status === 'burned' ? `<div class="note" style="color:#6B6476">Burned by AGENT ${esc(m.by)}.</div>` : ''}
      ${m.status === 'active' ? `<div class="acts"><button class="btn sm red" type="button" data-done="${m.slot}">Done ✓</button><button class="btn sm alt" type="button" data-swap="${m.slot}" ${v.swapsLeft ? '' : 'disabled'}>Swap</button></div>` : ''}
      ${st}</div>`;
  }).join('');
}
function drawPrompts(v) {
  const list = $('promptList');
  const key = v.prompts.map((p) => p.k).join(',');
  if (list.dataset.key !== key) {
    list.dataset.key = key;
    list.innerHTML = v.prompts.map((p) => `<div class="prompt" data-k="${p.k}"><b>${esc(p.text)}</b>
      <textarea maxlength="${ANSWER_MAX}" rows="2" placeholder="Your answer (nobody sees it until the reveal)" aria-label="${esc(p.text)}">${esc(S.drafts[p.k] ?? p.mine)}</textarea>
      <div class="meta"><span class="saved"></span><span class="cnt"></span></div></div>`).join('');
  }
  for (const p of v.prompts) {
    const box = list.querySelector(`.prompt[data-k="${p.k}"]`);
    const ta = box.querySelector('textarea');
    if (document.activeElement !== ta && S.drafts[p.k] == null) ta.value = p.mine;
    box.querySelector('.cnt').textContent = `${plural(p.count, 'agent')} answered`;
    if (S.drafts[p.k] == null) { const s = box.querySelector('.saved'); s.textContent = p.mine ? 'Saved ✓' : 'Not answered yet'; s.className = 'saved' + (p.mine ? ' ok' : ''); }
  }
}
const saveTimers = {};
function queueAnswer(k, text) {
  S.drafts[k] = text;
  const box = $('promptList').querySelector(`.prompt[data-k="${k}"] .saved`);
  if (box) { box.textContent = 'Saving…'; box.className = 'saved'; }
  clearTimeout(saveTimers[k]);
  saveTimers[k] = setTimeout(async () => {
    const r = await act('/answer', { k, text });
    if (r && S.drafts[k] === text) delete S.drafts[k];
    if (r) drawPrompts(S.room);
  }, 900);
}
function drawAwards(v) {
  const list = $('awardList');
  const key = JSON.stringify([v.awards, v.players.map((p) => [p.id, p.codename, p.avatar])]);
  if (list.dataset.key === key) return;
  list.dataset.key = key;
  const others = v.players.filter((p) => !p.me);
  list.innerHTML = v.awards.map((a) => `<div class="award"><b>${esc(a.text)}</b><div class="pick-row" role="group" aria-label="${esc(a.text)}">${others.map((p) => `<button type="button" data-award="${a.k}" data-for="${p.id}" aria-pressed="${a.vote === p.id}">${av(p, 48)}<span>${esc(p.name)}</span></button>`).join('')}</div></div>`).join('');
}

/* ---------- counter-intel ---------- */
let accAgent = null;
function openAccuse() {
  const v = S.room;
  accAgent = null;
  $('accTitle').textContent = 'WHO’S THE SPY?';
  $('accNote').textContent = 'Pick the agent you think is working a mission on you.';
  $('accChoices').hidden = true;
  $('accAgents').hidden = false;
  $('accAgents').innerHTML = v.players.filter((p) => !p.me).map((p) => `<button type="button" data-acc="${p.id}">${av(p, 56)}<b>${esc(p.codename)}</b><span>${esc(p.name)}</span></button>`).join('');
  openSheet('accuseSheet');
}
async function accuseStep1(id) {
  const r = await act('/accuse', { agent: id });
  if (!r) return;
  accAgent = id;
  const p = S.room.players.find((x) => x.id === id);
  $('accTitle').textContent = `AGENT ${p.codename}`;
  $('accNote').textContent = 'One of these is their real mission. Pick it to burn it. This uses one of your tries.';
  $('accAgents').hidden = true;
  $('accChoices').hidden = false;
  $('accChoices').innerHTML = r.room.accusing.choices.map((c, k) => `<button type="button" data-pick="${k}">${esc(c)}</button>`).join('');
}
async function accuseStep2(k) {
  const r = await act('/accuse', { agent: accAgent, pick: k });
  closeSheet('accuseSheet');
  if (!r) return;
  if (r.burned) { sfx('stamp'); toast('Mission burned! You caught them.'); } else { sfx('wrong'); toast('Wrong mission. Their cover held.', 'err'); }
}

/* ================= DECLASSIFIED ================= */
function renderReveal(v) {
  const st = v.step;
  $('revealOp').textContent = v.op;
  $('revealHost').hidden = !v.host || st.type === 'final';
  $('nextBtn').hidden = st.type === 'final';
  $('hideBtn').hidden = !(v.host && (st.type === 'guess' || st.type === 'who') && !st.hidden);
  const fresh = st.i !== S.step;
  S.step = st.i;
  const body = $('revealBody');
  const players = Object.fromEntries(v.players.map((p) => [p.id, p]));
  if (st.type === 'title') {
    if (fresh) {
      body.innerHTML = `<div class="rv-title"><span class="stamp slam">DECLASSIFIED</span><h2>${esc(v.op)}</h2>
        <div class="counts"><div><b>${st.counts.missions}</b><span>MISSIONS DONE</span></div><div><b>${st.counts.burns}</b><span>BURNED</span></div><div><b>${st.counts.answers}</b><span>ANSWERS</span></div></div>
        <p class="note">${v.host ? 'Tap Next when everyone’s looking.' : 'The host will take it from here.'}</p></div>`;
      sfx('stamp'); setTimeout(() => sfx('sting'), 300);
    }
    return;
  }
  if (st.type === 'guess' || st.type === 'who') {
    if (fresh) {
      body.innerHTML = `<div class="slip in"><small>WHO SAID IT?</small><div class="q">${esc(st.prompt)}</div><div class="a">${st.hidden ? '<span class="redact">this answer was hidden</span>' : esc(st.answer)}</div></div>
        <div class="fuse" id="rvFuse"><i></i></div><div id="rvPart"></div>
        <div class="rv-row"><span class="note" id="rvStatus"></span><button class="fire" type="button" id="fireBtn" aria-pressed="false">🔥 <span id="fireN">0</span></button></div>`;
      if (st.type === 'who') { sfx(st.myGuess === st.author ? 'right' : st.myGuess ? 'wrong' : 'stamp'); }
      else sfx('type');
    }
    $('fireBtn').setAttribute('aria-pressed', String(st.fired));
    $('fireN').textContent = st.fire;
    $('fireBtn').disabled = st.hidden;
    const part = $('rvPart');
    if (st.type === 'guess') {
      if (st.mine) part.innerHTML = '<p class="note" style="text-align:center;font-size:17px">This one’s yours. Act natural.</p>';
      else {
        const html = `<div class="guess-grid">${v.players.filter((p) => !p.me).map((p) => `<button type="button" data-guess="${p.id}" aria-pressed="${st.myGuess === p.id}" ${st.myGuess ? 'disabled' : ''}>${av(p, 52)}<b>${esc(p.codename)}</b><span>${esc(p.name)}</span></button>`).join('')}</div>`;
        if (fresh || part.dataset.guess !== String(st.myGuess)) { part.innerHTML = html; part.dataset.guess = String(st.myGuess); }
      }
      $('rvStatus').textContent = `${st.guessed} of ${st.need} guessed`;
    } else if (fresh) {
      const a = players[st.author];
      const right = Object.entries(st.guesses).filter(([, g]) => g === st.author).map(([p]) => players[p]).filter(Boolean);
      part.innerHTML = `<div class="author">${a ? av(a, 110) : ''}<span class="stamp slam">AGENT ${esc(a ? a.codename : '?')}</span><span class="note">${esc(a ? a.name : '')}</span></div>`;
      $('rvStatus').textContent = right.length ? `Got it: ${right.map((p) => p.name).join(', ')}` : 'Nobody saw that coming.';
    }
    return;
  }
  if (!fresh && st.type !== 'agent') return;
  if (st.type === 'missions' || st.type === 'awards') {
    body.innerHTML = `<div class="rv-title"><span class="stamp slam">${st.type === 'missions' ? 'THE MISSIONS' : 'THE YEARBOOK'}</span><p class="note">${st.type === 'missions' ? 'Every secret mission, out in the open. If one was about you, say whether it really happened.' : 'The votes are in.'}</p></div>`;
    sfx('stamp');
    return;
  }
  if (st.type === 'agent') {
    const a = players[st.agent];
    const key = JSON.stringify(st.missions);
    if (!fresh && body.dataset.key === key) return;
    body.dataset.key = key;
    const meId = v.me.id;
    body.innerHTML = `<div class="folder agent-file" data-tab="AGENT FILE"><div class="head">${a ? av(a, 76) : ''}<div><div class="cn">AGENT ${esc(a ? a.codename : '?')}</div><div class="nm">${esc(a ? a.name : '')}</div></div></div>
      ${st.missions.map((m) => `<div class="mission ${m.status === 'open' ? '' : m.status}"><div class="txt">${esc(m.text)}</div>
        ${m.status === 'done' ? `<span class="stamp green ${fresh ? 'slam' : ''}">${m.confirm === false ? 'DENIED' : m.confirm === true ? 'CONFIRMED' : 'COMPLETE'}</span>` : m.status === 'burned' ? `<span class="stamp ${fresh ? 'slam' : ''}">BURNED${m.by ? ' BY ' + esc(m.by) : ''}</span>` : `<span class="stamp gray ${fresh ? 'slam' : ''}">NEVER PULLED OFF</span>`}
        ${m.status === 'done' && m.target === meId ? `<div class="confirm">Did this really happen? <button class="btn sm ${m.confirm === true ? '' : 'alt'}" type="button" data-confirm="${m.card}" data-ok="1">Yes</button><button class="btn sm ${m.confirm === false ? 'red' : 'alt'}" type="button" data-confirm="${m.card}" data-ok="0">No way</button></div>` : ''}
      </div>`).join('') || '<p class="note">No missions on file.</p>'}</div>`;
    if (fresh) sfx('stamp');
    return;
  }
  if (st.type === 'award') {
    body.innerHTML = `<div class="award-big"><span class="stamp slam">YEARBOOK</span><h2>${esc(st.text)}</h2>
      <div class="winners">${st.winners.map((id) => players[id]).filter(Boolean).map((p) => `<div>${av(p, 120)}<span class="cn">AGENT ${esc(p.codename)}</span><span class="note">${esc(p.name)}</span></div>`).join('') || '<p class="note">Nobody voted on this one.</p>'}</div>
      ${st.votes ? `<p class="note">${plural(st.votes, 'vote')}</p>` : ''}</div>`;
    sfx('fanfare');
    return;
  }
  if (st.type === 'final') {
    const sc = st.scores;
    const step = (s, k) => { const p = s && players[s.id]; return p ? `<div class="p${k + 1}">${av(p, 56)}<span class="cn">${esc(p.codename)}</span><span class="pts">${s.total}</span><span class="step">${k + 1}</span></div>` : '<div></div>'; };
    const url = `${location.origin}${BASE}file/${st.file}`;
    body.innerHTML = `<div class="rv-title" style="padding-top:4px"><span class="stamp slam">TOP AGENT</span></div>
      <div class="podium">${step(sc[1], 1)}${step(sc[0], 0)}${step(sc[2], 2)}</div>
      <ol class="scores">${sc.map((s, k) => { const p = players[s.id]; return p ? `<li class="${p.me ? 'me' : ''}"><span>${k + 1}</span>${av(p, 36)}<span class="cn">${esc(p.codename)}<small>${esc(p.name)} · ${plural(s.done, 'mission')}${s.burns ? ` · burns ${s.burns > 0 ? '+' : ''}${s.burns}` : ''}${s.guesses ? ` · guesses +${s.guesses}` : ''}${s.fooled ? ` · fooled +${s.fooled}` : ''}</small></span><b>${s.total}</b></li>` : ''; }).join('')}</ol>
      <div class="folder" data-tab="THE FILE"><h2>SHARE THE FILE</h2><p class="note">The highlights page: missions pulled off, the awards and the answers the room fired up. Codenames only, no real names.</p>
      <button class="btn red" type="button" id="shareFile">Share the file</button><a class="btn alt" href="${esc(url)}" target="_blank" rel="noopener">Open the share page</a></div>
      <button class="link" type="button" id="doneBtn">Leave the operation</button>`;
    sfx('fanfare'); confetti();
    $('shareFile').addEventListener('click', () => share(`Operation ${v.op}: DECLASSIFIED`, url));
    $('doneBtn').addEventListener('click', leave);
  }
}
let fuseRaf = 0;
function fuseLoop() {
  fuseRaf = requestAnimationFrame(fuseLoop);
  const v = S.room;
  if (S.screen !== 'reveal' || !v || !v.step || !v.step.endsAt) return;
  const f = $('rvFuse');
  if (!f) return;
  const total = v.step.type === 'guess' ? 20000 : 7000;
  f.firstChild.style.transform = `scaleX(${clamp((v.step.endsAt - srvNow()) / total, 0, 1)})`;
}

/* ================= THE SHARE PAGE ================= */
async function loadFileView(id) {
  show('file');
  const body = $('fileBody');
  body.innerHTML = '<p class="note" style="text-align:center;padding:40px 0">Opening the file…</p>';
  let f;
  try { f = (await api(`/files/${id}`)).file; } catch (e) { body.innerHTML = `<div class="folder" data-tab="ERROR"><h2>FILE NOT FOUND</h2><p class="note">${esc(e.message)}</p></div>`; return; }
  const date = new Date(f.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const top = f.agents[0];
  document.title = `Operation ${f.op} · Classified`;
  body.innerHTML = `<div class="file-head"><span class="stamp">DECLASSIFIED</span><h1>${esc(f.op)}</h1><p class="note">${esc(date)} · ${plural(f.agents.length, 'agent')}</p></div>
    ${top ? `<div class="folder" data-tab="TOP AGENT" style="justify-items:center;text-align:center">${avatar(top.avatar, 120, 'Agent ' + top.codename)}<h2>AGENT ${esc(top.codename)}</h2><p class="note">${top.score} points · ${plural(top.done, 'mission')} pulled off</p></div>` : ''}
    <div class="folder" data-tab="PERSONNEL"><h2>THE TEAM</h2><ul class="agents">${f.agents.map((a) => `<li>${avatar(a.avatar, 64, 'Agent ' + a.codename)}<span class="cn">${esc(a.codename)}</span><span class="nm">${a.score} pts</span></li>`).join('')}</ul></div>
    ${f.awards.length ? `<div class="folder" data-tab="YEARBOOK"><h2>THE AWARDS</h2><ul class="mlist">${f.awards.map((a) => `<li><b>${esc(a.text.toUpperCase())}</b>AGENT ${a.winners.map(esc).join(' & AGENT ')}</li>`).join('')}</ul></div>` : ''}
    ${f.highlights.length ? `<div class="folder" data-tab="WHO SAID IT"><h2>THE ROOM’S FAVORITES</h2>${f.highlights.map((h) => `<div class="hl"><small>${esc(h.prompt)}</small><b>“${esc(h.text)}”</b><small>AGENT ${esc(h.codename)} · ${'🔥'.repeat(Math.min(5, h.fire))}</small></div>`).join('')}</div>` : ''}
    <div class="folder" data-tab="MISSIONS"><h2>MISSIONS PULLED OFF</h2>${f.missions.length ? `<ul class="mlist">${f.missions.map((m) => `<li><b>AGENT ${esc(m.codename)}${m.confirmed ? ' · CONFIRMED' : ''}</b>${esc(m.text)}</li>`).join('')}</ul>` : '<p class="note">Not one. Tough crowd.</p>'}
      <p class="note">${plural(f.redacted, 'mission')} never pulled off: <span class="redact">redacted forever</span>. ${plural(f.burns, 'mission')} burned by counter-intel.</p></div>
    <div class="card" style="text-align:center"><h2>RUN YOUR OWN OPERATION</h2><p class="note">Classified is a sleepover game on Capra Lab.</p><a class="btn red" href="/">Go to Capra Lab</a></div>`;
  $('fileShare').onclick = () => share(`Operation ${f.op}: DECLASSIFIED`, location.href);
}

/* ================= wiring ================= */
function wire() {
  drawSound();
  for (const b of $$('.snd')) b.addEventListener('click', () => { prefs.sound = !prefs.sound; savePrefs(); drawSound(); });
  for (const b of $$('.help')) b.addEventListener('click', () => openSheet('help'));
  for (const b of $$('.leave')) b.addEventListener('click', () => ask('LEAVE THE OPERATION?', 'You can come back with the code while the file is open.', 'Leave', leave));
  for (const v of $$('.veil')) {
    v.addEventListener('click', (e) => { if (e.target === v) v.hidden = true; });
    for (const b of v.querySelectorAll('[data-close]')) b.addEventListener('click', () => { v.hidden = true; });
  }
  $('cfYes').addEventListener('click', () => { const fn = confirmFn; confirmFn = null; closeSheet('confirmSheet'); if (fn) fn(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') for (const v of $$('.veil')) v.hidden = true; });

  // home
  $('hostBtn').addEventListener('click', openFile);
  $('joinForm').addEventListener('submit', (e) => { e.preventDefault(); joinFile(S.invite || $('codeIn').value); });
  $('codeIn').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });
  $('rejoinBtn').addEventListener('click', async () => { const seat = store.get('classified.seat', null); if (!seat || !(await resume(seat))) { toast('That file has closed.'); renderRejoin(); } });

  // briefing
  const recruit = () => S.seat && share(`You’ve been recruited. Operation ${S.room ? S.room.op : ''}: join with code ${S.seat.code}`, location.origin + BASE + S.seat.code);
  $('inviteBtn').addEventListener('click', recruit);
  $('inviteBtn2').addEventListener('click', recruit);
  $('opRoll').addEventListener('click', () => act('/op'));
  $('cnRoll').addEventListener('click', () => act('/me', { reroll: true }));
  $('avShuffle').addEventListener('click', () => changeLook(randomAvatar()));
  $('parts').addEventListener('click', (e) => {
    const b = e.target.closest('button'), part = e.target.closest('.part');
    if (!b || !part || !myLook) return;
    const k = part.dataset.part, n = PARTS[k];
    changeLook({ ...myLook, [k]: (myLook[k] + Number(b.dataset.d) + n) % n });
  });
  $('startBtn').addEventListener('click', () => ask('BEGIN THE OPERATION?', 'Missions go out to every agent now, and the team is locked in their looks. New agents can still join with the code.', 'Begin', () => act('/start')));

  // the night
  for (const b of $$('.tabs button')) b.addEventListener('click', () => setTab(b.dataset.tab));
  const ml = $('missionList');
  const peek = (e, on) => { const m = e.target.closest('.mission'); if (m && e.target.closest('.txt')) m.classList.toggle('peek', on); };
  ml.addEventListener('pointerdown', (e) => peek(e, true));
  ml.addEventListener('pointerup', (e) => peek(e, false));
  ml.addEventListener('pointerleave', (e) => peek(e, false), true);
  ml.addEventListener('pointercancel', (e) => peek(e, false));
  ml.addEventListener('contextmenu', (e) => { if (e.target.closest('.txt')) e.preventDefault(); });
  ml.addEventListener('keydown', (e) => { if (e.key === ' ' && e.target.closest('.txt')) { e.preventDefault(); peek(e, true); } });
  ml.addEventListener('keyup', (e) => { if (e.key === ' ') peek(e, false); });
  ml.addEventListener('click', (e) => {
    const d = e.target.closest('[data-done]'), s = e.target.closest('[data-swap]');
    if (d) ask('MISSION COMPLETE?', 'Only if you really pulled it off. It gets checked when the file is declassified.', 'Mark it done', async () => { if (await act('/mission', { slot: +d.dataset.done, act: 'done' })) sfx('stamp'); });
    if (s) ask('SWAP THIS MISSION?', `You get a new one now. ${plural(S.room.swapsLeft, 'swap')} left tonight.`, 'Swap it', () => act('/mission', { slot: +s.dataset.swap, act: 'swap' }));
  });
  $('promptList').addEventListener('input', (e) => { const p = e.target.closest('.prompt'); if (p && e.target.tagName === 'TEXTAREA') queueAnswer(+p.dataset.k, e.target.value); });
  $('awardList').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-award]');
    if (!b) return;
    for (const x of b.parentElement.children) x.setAttribute('aria-pressed', String(x === b));
    sfx('tick');
    await act('/vote', { k: +b.dataset.award, for: b.dataset.for });
  });
  $('nightAgents').addEventListener('click', (e) => {
    const li = e.target.closest('[data-remove]');
    if (!li || !S.room || !S.room.host) return;
    const p = S.room.players.find((x) => x.id === li.dataset.remove);
    if (p) ask(`REMOVE AGENT ${p.codename}?`, `${p.name} comes off the operation and loses their missions and answers.`, 'Remove', () => act('/remove', { agent: p.id }));
  });
  $('accuseBtn').addEventListener('click', openAccuse);
  $('accAgents').addEventListener('click', (e) => { const b = e.target.closest('[data-acc]'); if (b) accuseStep1(b.dataset.acc); });
  $('accChoices').addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) accuseStep2(+b.dataset.pick); });
  $('dropBtn').addEventListener('click', () => act('/drop'));
  $('declassBtn').addEventListener('click', () => ask('DECLASSIFY THE FILE?', 'Everything comes out now, on every phone: answers lock, missions end and the reveal begins. There’s no going back.', 'Declassify', () => act('/declassify')));

  // the reveal
  $('revealBody').addEventListener('click', (e) => {
    const g = e.target.closest('[data-guess]'), c = e.target.closest('[data-confirm]');
    if (g && S.room) { sfx('tick'); act('/guess', { step: S.room.step.i, for: g.dataset.guess }); }
    if (c && S.room) act('/confirm', { step: S.room.step.i, card: +c.dataset.confirm, ok: c.dataset.ok === '1' });
    if (e.target.closest('#fireBtn') && S.room) act('/fire', { step: S.room.step.i });
  });
  $('nextBtn').addEventListener('click', () => S.room && act('/next'));
  $('hideBtn').addEventListener('click', () => S.room && act('/hide', { step: S.room.step.i }));

  setInterval(drawCountdowns, 30000);
  fuseLoop();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.seat) poll(); });
  document.addEventListener('pointerdown', () => audio(), { once: true });
}

async function boot() {
  wire();
  const fm = location.pathname.match(/^\/classified\/file\/([a-z0-9]{10})\/?$/);
  if (fm) { loadFileView(fm[1]); return; }
  const m = location.pathname.match(/^\/classified\/([A-Za-z]{4})\/?$/);
  const code = m && m[1].toUpperCase();
  const seat = store.get('classified.seat', null);
  if (code) {
    if (seat && seat.code === code && (await resume(seat))) return;
    S.invite = code;
  } else if (seat && Date.now() - seat.at < 36 * 3600e3 && (await resume(seat))) return;
  loadHome();
}
boot();
