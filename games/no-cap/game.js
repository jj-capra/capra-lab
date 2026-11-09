// No Cap's page (JC, Nov 8 2026): home, the deck picker, the lobby, a card (read → find → reveal),
// the final, and challenge links. The server holds every answer; a phone only learns the cap at
// the reveal (or when it's the reader's turn).
import { SHELVES, pieces } from './shared/rules.mjs';

const API = '/no-cap/api';
const $ = (id) => document.getElementById(id);
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const lab = () => { const p = store.get('capra-lab.profile'); return p && p.name && p.code ? { name: p.name, code: p.code } : null; };
const SEATS = 'capra-lab.nocap.seats', NAME = 'capra-lab.nocap.name', SHELF = 'capra-lab.nocap.shelf';

/* ---------- the server, and its clock ---------- */
const samples = [];
let offset = 0;
const srvNow = () => Date.now() + offset;
async function api(path, body = {}) {
  const t0 = Date.now();
  let res, j;
  const me = lab();
  try {
    res = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(me ? { ...body, lab: me } : body) });
    j = await res.json();
  } catch (e) {
    const err = new Error('Can’t reach the game. Check your connection and try again.');
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

let toastT = null;
function toast(text, err = false) {
  const t = $('toast');
  t.textContent = text;
  t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.className = 'toast' + (err ? ' err' : ''); }, 2600);
}
async function share(text, url) {
  try { if (navigator.share) { await navigator.share({ title: 'No Cap', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Link copied. Paste it to your friends.'); } catch (e) { toast(url); }
}
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  window.scrollTo(0, 0);
}
function sheet(html, onReady) {
  const v = document.createElement('div');
  v.className = 'veil';
  v.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><button class="round-btn x" type="button" aria-label="Close">✕</button>${html}</div>`;
  const close = () => v.remove();
  v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('.x')) close(); });
  document.body.appendChild(v);
  if (onReady) onReady(v.querySelector('.sheet'), close);
  return close;
}
const myName = () => (lab() ? lab().name : (store.get(NAME, '') || ''));
const typedName = (input) => { const n = (input.value || '').trim(); if (n) store.set(NAME, n); return n; };

function help() {
  sheet(`<h2>How No Cap works</h2><ul>
    <li><b>Every card is one sentence with four claims.</b> Three are facts. One is cap: made up.</li>
    <li><b>Live with friends:</b> everyone takes turns reading. The reader’s phone shows which part is cap; they read it out loud with a straight face.</li>
    <li><b>Find the three facts.</b> When the reader is done, the four claims pop up on your phone. Tap the facts one at a time. Tap the cap and you’re busted for that card.</li>
    <li><b>Points:</b> 50 a fact, 100 more for all three, up to 100 more for speed. Busted keeps nothing. The reader gets 50 for every friend they bust.</li>
    <li><b>Solo and challenges:</b> play ten cards on your own, then send a friend the same ten and see who scores higher.</li>
  </ul>`);
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-help]')) help(); });

/* ---------- the deck picker ---------- */
function pickDeck(title, onPick) {
  const decks = (hello && hello.decks) || [];
  let shelf = store.get(SHELF, SHELVES[0].id);
  if (!decks.some((d) => d.shelf === shelf)) shelf = (decks[0] || {}).shelf || SHELVES[0].id;
  sheet(`<h2>${esc(title)}</h2><div class="shelves" role="tablist"></div><div class="decks"></div>`, (el, close) => {
    const draw = () => {
      el.querySelector('.shelves').innerHTML = SHELVES.filter((s) => decks.some((d) => d.shelf === s.id))
        .map((s) => `<button type="button" role="tab" data-s="${s.id}" aria-pressed="${s.id === shelf}">${esc(s.name)}</button>`).join('');
      el.querySelector('.decks').innerHTML = decks.filter((d) => d.shelf === shelf)
        .map((d) => `<button class="deck" type="button" data-d="${esc(d.id)}"><small>${esc((SHELVES.find((s) => s.id === d.shelf) || {}).who || '')} · ${d.count} CARDS</small><b>${esc(d.title)}</b><span>${esc(d.blurb)}</span></button>`).join('')
        || '<p class="note">No decks on this shelf yet.</p>';
    };
    draw();
    el.addEventListener('click', (e) => {
      const s = e.target.closest('[data-s]');
      if (s) { shelf = s.dataset.s; store.set(SHELF, shelf); draw(); return; }
      const d = e.target.closest('[data-d]');
      if (d) { close(); onPick(decks.find((x) => x.id === d.dataset.d)); }
    });
  });
}

/* ---------- home ---------- */
let hello = null;
async function home(code = '') {
  stop();
  show('home');
  if (location.pathname !== '/no-cap/' && !code) history.replaceState(null, '', '/no-cap/');
  const me = lab();
  $('nameField').hidden = !!me;
  $('joinNameField').hidden = !!me;
  $('nameIn').value = $('joinNameIn').value = myName();
  $('asLine').textContent = me ? `Playing as ${me.name}` : '';
  $('asLine').hidden = !me;
  if (code) { $('codeIn').value = code; $('joinCard').style.order = -1; $('joinBtn').focus(); }
  try {
    hello = await api('/hello');
    $('brewNote').hidden = !hello.brew;
    $('startCard').hidden = !hello.canHost;
  } catch (e) { toast(e.message, true); }
}
async function open(kind) {
  const me = lab();
  const name = me ? me.name : typedName($('nameIn'));
  if (!name) { toast('Type your name first.', true); $('nameIn').focus(); return; }
  pickDeck(kind === 'solo' ? 'Pick a deck to play' : 'Pick a deck for the room', async (d) => {
    try { enter(await api('/rooms', { kind, deckId: d.id, name })); }
    catch (e) { toast(e.message, true); }
  });
}
$('hostBtn').onclick = () => open('live');
$('soloBtn').onclick = () => open('solo');
$('joinBtn').onclick = async () => {
  const code = $('codeIn').value.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) { toast('A room code is four letters.', true); return; }
  const me = lab();
  const name = me ? me.name : typedName($('joinNameIn'));
  if (!name) { toast('Type your name first.', true); $('joinNameIn').focus(); return; }
  const s = (store.get(SEATS, {}) || {})[code] || {};
  try { enter(await api(`/rooms/${code}/join`, { name, pid: s.pid, tok: s.tok })); }
  catch (e) { toast(e.message, true); }
};
$('codeIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('joinBtn').click(); });

/* ---------- a room ---------- */
let seat = null, room = null, timer = null, raf = null, busy = false, soloDone = false;
const pending = new Set();
function saveSeat(code, pid, tok) {
  const all = store.get(SEATS, {}) || {};
  all[code] = { pid, tok, at: Date.now() };
  for (const k of Object.keys(all)) if (Date.now() - (all[k].at || 0) > 12 * 3600e3) delete all[k];
  store.set(SEATS, all);
}
function enter(r) {
  soloDone = false;
  seat = { code: r.code, pid: r.pid, tok: r.tok };
  saveSeat(r.code, r.pid, r.tok);
  if (location.pathname !== '/no-cap/' + r.code) history.replaceState(null, '', '/no-cap/' + r.code);
  room = r.room;
  render();
}
const body = (extra = {}) => ({ pid: seat.pid, tok: seat.tok, ...extra });
async function refresh() {
  if (!seat || busy) return schedule();
  try { room = (await api(`/rooms/${seat.code}`, body())).room; render(); }
  catch (e) { if (e.status === 404) { toast(e.message, true); home(); return; } schedule(2500); }
}
async function act(op, extra = {}) {
  busy = true;
  try { room = (await api(`/rooms/${seat.code}/${op}`, body(extra))).room; }
  catch (e) { toast(e.message, true); }
  finally { busy = false; }
  render();
}
function stop() { clearTimeout(timer); timer = null; cancelAnimationFrame(raf); raf = null; }
function schedule(force) {
  clearTimeout(timer);
  if (!room || !seat) return;
  let ms = force;
  if (ms == null) {
    const now = srvNow(), t = room.t || {};
    if (room.phase === 'lobby') ms = 2500;
    else if (room.phase === 'over') ms = room.kind === 'live' ? 3000 : null;
    else if (room.kind === 'solo') ms = room.stage === 'find' ? Math.max(200, t.findEnd - now + 150) : null;
    else if (room.stage === 'read') ms = 1500;
    else if (room.stage === 'find') ms = Math.min(2000, Math.max(200, t.findEnd - now + 150));
    else if (room.stage === 'reveal') ms = Math.max(200, t.revealEnd - now + 150);
  }
  if (ms != null) timer = setTimeout(refresh, document.hidden ? Math.max(ms, 6000) : ms);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && seat) refresh(); });
document.addEventListener('click', (e) => { if (e.target.closest('[data-leave]')) { seat = null; room = null; home(); } });

function render() {
  if (!room) return;
  $('lobbyDeck').textContent = $('playDeck').textContent = room.deck ? room.deck.title : 'No Cap';
  const me = room.players.find((p) => p.pid === room.me);
  $('myScore').textContent = me ? me.score : 0;
  if (room.phase === 'lobby') { show('lobby'); renderLobby(); }
  else if (room.phase === 'over' && room.kind === 'live') { showOnce('play'); renderFinal(); }
  else if (room.kind === 'solo' && room.final && soloDone) { showOnce('play'); renderSoloFinal(); return; }
  else { showOnce('play'); renderPlay(); }
  schedule();
}
function showOnce(id) { if ($(id).hidden) show(id); }

function renderLobby() {
  const r = room, url = `${location.origin}/no-cap/${r.code}`;
  const people = r.players.map((p) => `<li>${esc(p.name)}${p.host ? ' <small>HOST</small>' : ''}${r.host && !p.host ? ` <button type="button" data-rm="${p.pid}" aria-label="Remove ${esc(p.name)}">✕</button>` : ''}</li>`).join('');
  $('lobbyBody').innerHTML = `
    <section class="card codebox"><span class="muted" style="font-weight:900;font-size:12px;letter-spacing:.1em">ROOM CODE</span><b>${esc(r.code)}</b>
      <button class="btn wide" type="button" id="shareBtn">Send the link</button></section>
    <section class="card"><h2>${r.players.length} in the room</h2><ul class="people">${people}</ul>
      <p class="note">Everyone takes turns reading. The reader sees which part is cap and reads it out loud with a straight face; everyone else finds the three facts on their phone.</p></section>
    <section class="card"><h2>${esc(r.deck.title)}</h2>
      ${r.host ? `<button class="btn alt wide" type="button" id="deckBtn">Change the deck</button>
        <button class="btn big wide" type="button" id="startBtn" ${r.players.length < 2 ? 'disabled' : ''}>${r.players.length < 2 ? 'Waiting for friends' : 'Start'}</button>`
        : `<p class="note">Waiting for ${esc(r.hostName)} to start.</p>`}
    </section>`;
  $('shareBtn').onclick = () => share(`Join my No Cap game. Room ${r.code}`, url);
  if ($('deckBtn')) $('deckBtn').onclick = () => pickDeck('Pick a deck for the room', (d) => act('deck', { deckId: d.id }));
  if ($('startBtn')) $('startBtn').onclick = () => act('start');
  for (const b of document.querySelectorAll('[data-rm]')) b.onclick = () => act('remove', { who: b.dataset.rm });
}

// The sentence, with the cap marked (the reader's view, and everyone's at the reveal).
function sentence(c, markCap) {
  return `<p class="sentence">${pieces(c.say).map((p) => p.i < 0 ? esc(p.t)
    : `<span class="cl${markCap && p.i === c.cap ? ' capped' : ''}">${esc(p.t)}</span>${markCap && p.i === c.cap ? '<span class="tag">CAP</span>' : ''}`).join('')}</p>`;
}
const nameOf = (pid) => { const p = room.players.find((x) => x.pid === pid); return p ? p.name : 'Someone'; };

function renderPlay() {
  const r = room, el = $('playBody'), mineIsReader = r.reader && r.reader === r.me;
  const hud = `<div class="hud"><span>CARD <b>${r.i + 1}</b> OF ${r.n}</span><span>${r.kind === 'live' && r.readerName ? `🎤 ${esc(r.readerName)}` : esc(r.deck.title)}</span></div>`;
  cancelAnimationFrame(raf);
  if (r.stage === 'ready') {
    el.innerHTML = `${hud}<div class="banner"><div class="big">Card ${r.i + 1}</div><p class="note">Four claims. Three are facts, one is cap. Tap the facts one at a time; tap the cap and you’re busted.</p></div>
      <button class="btn big wide" type="button" id="goBtn">Go</button>`;
    $('goBtn').onclick = () => act('go', { i: r.i });
    return;
  }
  if (r.stage === 'read') {
    if (mineIsReader) {
      el.innerHTML = `${hud}<div class="banner"><div class="mic">🎤</div><div class="big">You’re reading</div>
        <p class="note">Read it out loud, slow and steady. The cap is marked: keep a straight face.</p></div>
        ${sentence(r.card, true)}
        <button class="btn big wide" type="button" id="readBtn">Done reading: start the clock</button>`;
      $('readBtn').onclick = () => act('read', { i: r.i });
    } else {
      el.innerHTML = `${hud}<div class="banner"><div class="mic">🎤</div><div class="big">${esc(r.readerName || 'The reader')} is reading</div>
        <p class="note">Listen close and watch their face. The four claims pop up here when they’re done.</p></div>
        ${r.host ? '<button class="btn alt sm" type="button" id="nudgeBtn" style="justify-self:center">Reader stuck? Start the clock</button>' : ''}`;
      if ($('nudgeBtn')) $('nudgeBtn').onclick = () => act('read', { i: r.i });
    }
    return;
  }
  if (r.stage === 'find' && mineIsReader) {
    el.innerHTML = `${hud}<div class="clock" id="clock"><i></i></div><div class="banner"><div class="big">They’re hunting</div>
      <p class="note" id="huntLine">${r.doneCount} of ${r.hunting} done</p></div>${sentence(r.card, true)}`;
    tickClock();
    return;
  }
  if (r.stage === 'find') {
    const m = r.mine, done = m.done;
    const status = m.busted ? '<p class="status bad">CAP! You’re busted on this one.</p>'
      : m.found.length === 3 ? '<p class="status good">All three. No cap.</p>'
      : `<p class="status">${m.found.length} of 3 facts</p>`;
    el.innerHTML = `${hud}<div class="clock" id="clock"><i></i></div>
      <h2 style="text-align:center;font-size:30px;color:var(--yellow)">Find the three facts</h2>
      <div class="claims">${r.card.claims.map((t, k) => {
        const cls = m.found.includes(k) ? ' fact' : m.busted && m.pick === k ? ' cap' : '';
        const stamp = m.found.includes(k) ? '<span class="stamp">NO CAP</span>' : m.busted && m.pick === k ? '<span class="stamp">CAP!</span>' : '';
        return `<button class="claim${cls}${done ? ' done' : ''}${pending.has(k) ? ' wait' : ''}" type="button" data-k="${k}" ${done || cls ? 'disabled' : ''}>${esc(t)}${stamp}</button>`;
      }).join('')}</div>${status}
      ${r.kind === 'live' ? `<p class="note" style="text-align:center">${r.doneCount} of ${r.hunting} done</p>` : ''}`;
    for (const b of el.querySelectorAll('[data-k]:not(:disabled)')) b.onclick = () => tap(Number(b.dataset.k));
    tickClock();
    return;
  }
  // the reveal
  const c = r.card, m = r.mine, mine = (r.round || {})[r.me];
  const verdict = mineIsReader ? `You fooled ${mine ? mine.fooled : 0}` : m.busted ? 'Busted' : m.found.length === 3 ? 'No cap!' : 'Time’s up';
  const pts = mine ? mine.pts : 0;
  const rows = Object.entries(r.round || {}).sort((a, b) => b[1].pts - a[1].pts).map(([pid, x]) => {
    const how = x.reader ? `🎤 fooled ${x.fooled}` : x.busted ? '💥 busted' : x.found === 3 ? '⭐ all three' : `${x.found} of 3`;
    return `<li class="${pid === r.me ? 'me' : ''}"><span class="nm">${esc(nameOf(pid))}</span><span class="how">${how}</span><b>+${x.pts}</b></li>`;
  }).join('');
  el.innerHTML = `${hud}<div class="banner"><div class="big">${esc(verdict)}</div>${pts ? `<p class="status good">+${pts}</p>` : ''}</div>
    <div class="claims">${c.claims.map((t, k) => `<button class="claim done ${k === c.cap ? 'cap' : 'fact'}" type="button" disabled>${esc(t)}<span class="stamp">${k === c.cap ? 'CAP' : 'NO CAP'}</span></button>`).join('')}</div>
    <div class="real"><small>THE REAL STORY</small><span>${esc(c.real)}</span></div>
    ${r.kind === 'live' ? `<ul class="scores">${rows}</ul><p class="note" style="text-align:center" id="nextLine"></p>` : ''}
    ${r.kind === 'solo' ? `<button class="btn big wide" type="button" id="nextBtn">${r.final ? 'See your score' : 'Next card'}</button>` : ''}`;
  if ($('nextBtn')) $('nextBtn').onclick = () => { if (r.final) { soloDone = true; render(); } else act('go', { i: r.i + 1 }); };
  if ($('nextLine')) {
    const line = () => {
      const left = Math.max(0, Math.ceil((r.t.revealEnd - srvNow()) / 1000));
      const n = $('nextLine'); if (!n) return;
      n.textContent = r.i + 1 >= r.n ? `Final scores in ${left}…` : `Next card in ${left}…`;
      if (left > 0) raf = requestAnimationFrame(line);
    };
    line();
  }
}
function tickClock() {
  const t = room.t;
  const step = () => {
    const c = $('clock'); if (!c || !t.findEnd) return;
    const left = Math.max(0, t.findEnd - srvNow()), frac = left / (t.find || 25000);
    c.firstElementChild.style.transform = `scaleX(${frac})`;
    c.classList.toggle('low', left < 5000);
    if (left > 0) raf = requestAnimationFrame(step);
  };
  step();
}
async function tap(k) {
  if (pending.has(k)) return;
  pending.add(k);
  renderPlay();
  try {
    const before = room.mine.found.length;
    room = (await api(`/rooms/${seat.code}/tap`, body({ i: room.i, k }))).room;
    if (room.mine && room.mine.busted && navigator.vibrate) navigator.vibrate(160);
    if (room.mine && room.mine.found.length > before && room.mine.found.length === 3) toast('All three. No cap!');
  } catch (e) { toast(e.message, true); }
  finally { pending.delete(k); }
  render();
}

function renderFinal() {
  const r = room, f = r.final || r.players;
  const top = f[0];
  $('playBody').innerHTML = `<div class="banner"><div class="mic">🏆</div><div class="big">${esc(top ? top.name : '')} wins</div><p class="note">${esc(r.deck.title)} · ${r.n} cards</p></div>
    <ul class="scores">${f.map((p, i) => `<li class="${i === 0 ? 'top' : ''} ${p.pid === r.me ? 'me' : ''}"><span class="nm">${i + 1}. ${esc(p.name)}</span><span class="how"></span><b>${p.score}</b></li>`).join('')}</ul>
    ${r.host ? `<button class="btn big wide" type="button" id="againBtn">Deal again</button><button class="btn alt wide" type="button" id="newDeckBtn">Pick another deck</button>`
      : `<p class="note" style="text-align:center">Waiting for ${esc(r.hostName)} to deal again.</p>`}`;
  if ($('againBtn')) $('againBtn').onclick = () => act('again');
  if ($('newDeckBtn')) $('newDeckBtn').onclick = () => pickDeck('Pick the next deck', (d) => act('again', { deckId: d.id }));
}

function renderSoloFinal() {
  stop();
  const r = room, me = r.players[0];
  const url = r.made ? `${location.origin}/no-cap/c/${r.made}` : null;
  const text = `I scored ${me.score} on No Cap: ${r.deck.title}. Beat it.`;
  $('playBody').innerHTML = `<div class="banner"><div class="big">Your score</div></div><div class="bigscore">${me.score}</div>
    <p class="note" style="text-align:center">${esc(r.deck.title)} · ${r.n} cards</p>
    <div id="boardBox"></div>
    ${r.challenge ? '' : `<button class="btn big wide" type="button" id="challBtn">${url ? 'Send the challenge again' : 'Challenge a friend'}</button>`}
    <button class="btn alt wide" type="button" id="againSolo">Play another deck</button>`;
  $('againSolo').onclick = () => { seat = null; room = null; home().then(() => open('solo')); };
  if ($('challBtn')) $('challBtn').onclick = async () => {
    if (url) return share(text, url);
    await act('challenge');   // render() comes back here with room.made set
    if (room.made) share(text, `${location.origin}/no-cap/c/${room.made}`);
  };
  renderSoloFinalBoard();
}
async function renderSoloFinalBoard() {
  const id = room.challenge || room.made;
  if (!id) return;
  try {
    const ch = (await api(`/challenges/${id}`)).challenge;
    const box = $('boardBox'); if (!box) return;
    box.innerHTML = `<section class="card"><h2>The board</h2><ul class="scores">${ch.board.map((b, i) => `<li class="${i === 0 ? 'top' : ''}"><span class="nm">${i + 1}. ${esc(b.name)}</span><span class="how">${b.by ? 'set it' : ''}</span><b>${b.score}</b></li>`).join('')}</ul></section>`;
  } catch (e) { /* the board is a bonus */ }
}

/* ---------- a challenge link ---------- */
async function challenge(id) {
  show('chall');
  const el = $('challBody');
  el.innerHTML = '<p class="note">Opening the challenge…</p>';
  try {
    const ch = (await api(`/challenges/${id}`)).challenge;
    const me = lab();
    el.innerHTML = `<div class="hero"><h1 class="logo" style="font-size:clamp(44px,14vw,72px)">NO CAP</h1></div>
      <section class="card"><h2>${esc(ch.by.name)} scored ${ch.by.score}</h2>
        <p class="note">${esc(ch.deck.title)} · ${ch.n} cards. Same cards, same order. Four claims each: find the three facts, don’t tap the cap.</p>
        ${me ? `<p class="as">Playing as ${esc(me.name)}</p>` : `<label class="field"><span>YOUR NAME</span><input id="chName" maxlength="17" autocomplete="off" placeholder="Name" value="${esc(myName())}"></label>`}
        <button class="btn big wide" type="button" id="takeBtn">Take the challenge</button></section>
      <section class="card"><h2>The board</h2><ul class="scores">${ch.board.map((b, i) => `<li class="${i === 0 ? 'top' : ''}"><span class="nm">${i + 1}. ${esc(b.name)}</span><span class="how">${b.by ? 'set it' : ''}</span><b>${b.score}</b></li>`).join('')}</ul></section>`;
    $('takeBtn').onclick = async () => {
      const name = me ? me.name : typedName($('chName'));
      if (!name) { toast('Type your name first.', true); return; }
      try { enter(await api(`/challenges/${id}/play`, { name })); }
      catch (e) { toast(e.message, true); }
    };
  } catch (e) { el.innerHTML = `<section class="card"><h2>Hmm</h2><p class="note">${esc(e.message)}</p><a class="btn wide" href="/no-cap/">No Cap home</a></section>`; }
}

/* ---------- start ---------- */
(async function boot() {
  const path = location.pathname.replace(/^\/no-cap/, '').replace(/\/$/, '');
  const c = path.match(/^\/c\/([a-z0-9]{8})$/);
  if (c) return challenge(c[1]);
  const r = path.match(/^\/([A-Z]{4})$/);
  if (r) {
    const s = (store.get(SEATS, {}) || {})[r[1]];
    if (s) {
      seat = { code: r[1], pid: s.pid, tok: s.tok };
      try { room = (await api(`/rooms/${r[1]}`, body())).room; if (room.me) { render(); return; } } catch (e) { /* gone: join fresh */ }
      seat = null; room = null;
    }
    return home(r[1]);
  }
  home();
})();
