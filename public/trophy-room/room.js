/* Trophy rooms and trap houses: the page (JC, Nov 14 2026). Anyone watches a room on its security
   cameras; signed-in players break in through the owner's four traps (one try a room a day), and the
   owner builds the trap house. The server is lab/heist.js at /api/heist/*; the numbers are
   /lab/heist-rules.mjs. Golf holes play in Par-Tee Time and goat pens in Goat Getaway (#trap=<raid>),
   which send the raider back here (#raid=<raid>).
     /trophy-room/#r=<handle>   a room          /trophy-room/#rooms   the room list
     /trophy-room/#raid=<id>    a break-in      /trophy-room/         your own room (or the list) */
import { drawAvatar, lookFor } from '/lab/avatar.mjs';
import { TRAPS, KINDS, SLOTS, QUIZ, CATCH_PAY, BREAK_PAY } from '/lab/heist-rules.mjs';
import { words } from '/lab/wallet-catalog.mjs';
import { trophySvg, vaultSvg, hallSvg } from './art.js';
import { makeSelfie } from './selfie.js';

const $ = (id) => document.getElementById(id);
const app = $('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const handleOf = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
const me = () => { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? { ...p, handle: p.handle || handleOf(p.name) } : null; } catch { return null; } };
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } } };
const prefs = Object.assign({ sound: true }, store.get('trophy-room.prefs', {}));
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const possessive = (name) => `${name}’${/s$/i.test(name) ? '' : 's'}`;
const clockTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function ago(ms, now = Date.now()) {
  const s = Math.max(0, (now - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

/* ---------- the server ---------- */
async function api(path, body = {}) {
  const p = me();
  const r = await fetch('/api/heist/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, name: p && p.name, code: p && p.code }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'The cameras lost signal. Try again.'); e.status = r.status; e.code = j.code; throw e; }
  return j;
}
async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'The cameras lost signal. Try again.'); e.status = r.status; e.code = j.code; throw e; }
  return j;
}
const looks = new Map();
async function loadLooks(handles) {
  const want = [...new Set(handles)].filter((h) => h && !looks.has(h));
  if (want.length) {
    try { const j = await getJSON('/api/wallet/looks?h=' + encodeURIComponent(want.join(','))); for (const h of want) looks.set(h, lookFor(h, j.looks && j.looks[h])); }
    catch { for (const h of want) looks.set(h, lookFor(h, null)); }
  }
}
const lookOf = (h) => looks.get(h) || lookFor(h, null);
const walletChanged = () => window.dispatchEvent(new CustomEvent('capra-wallet:changed', { detail: null }));

/* ---------- sound (Web Audio, made here) ---------- */
let ac = null;
const audio = () => { if (!prefs.sound) return null; try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; } };
function tone(f, t0, dur, type = 'square', vol = 0.08, f2 = 0) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  tap: () => tone(880, 0, 0.05, 'triangle', 0.05),
  spin: () => tone(520, 0, 0.06, 'triangle', 0.05, 760),
  right: () => { tone(660, 0, 0.1, 'triangle', 0.09); tone(990, 0.09, 0.16, 'triangle', 0.09); },
  wrong: () => tone(160, 0, 0.32, 'sawtooth', 0.07, 110),
  siren: () => { for (let i = 0; i < 4; i++) { tone(620, i * 0.5, 0.25, 'sawtooth', 0.06, 980); tone(980, i * 0.5 + 0.25, 0.25, 'sawtooth', 0.06, 620); } },
  open: () => { tone(220, 0, 0.5, 'sawtooth', 0.04, 110); [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35 + i * 0.09, 0.3, 'triangle', 0.08)); },
  cash: () => { tone(1320, 0, 0.08, 'square', 0.05); tone(1760, 0.07, 0.25, 'square', 0.05); },
  shutter: () => { tone(2400, 0, 0.03, 'square', 0.05, 900); tone(1200, 0.06, 0.05, 'square', 0.04, 500); },
};
function paintSound() {
  $('soundBtn').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${prefs.sound ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'}</svg>`;
  $('soundBtn').setAttribute('aria-pressed', String(prefs.sound));
}
$('soundBtn').addEventListener('click', () => { prefs.sound = !prefs.sound; store.set('trophy-room.prefs', prefs); paintSound(); if (prefs.sound) sfx.tap(); });
paintSound();

/* ---------- toast, sheet, timers ---------- */
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800); }
function sheet(html, label, { keep = false } = {}) {
  const top = keep ? $('sheet').scrollTop : 0;
  $('sheet').innerHTML = `<button class="round x" type="button" id="sheetX" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>${html}`;
  $('sheet').setAttribute('aria-label', label || 'Trophy room');
  $('veil').hidden = false;
  $('sheetX').onclick = closeSheet;
  $('sheet').scrollTop = top;
  if (!keep) setTimeout(() => { const f = $('sheet').querySelector('button:not(.x), a'); if (f) f.focus({ preventScroll: true }); }, 30);
}
function closeSheet() { $('veil').hidden = true; $('sheet').innerHTML = ''; }
$('veil').addEventListener('click', (e) => { if (e.target === $('veil')) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('veil').hidden) closeSheet(); });
let timers = [];
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(() => clearTimeout(t)); return t; };
const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(() => clearInterval(t)); return t; };
function clearTimers() { timers.forEach((f) => f()); timers = []; }
let nav = 0;   // bumps on every screen change, so a late answer can't draw over a newer screen
function countdown(el, ms, onEnd) {
  const end = Date.now() + ms, total = Math.max(ms, 1), my = nav;
  const bar = el.querySelector('i'), label = el.dataset.label ? $(el.dataset.label) : null;
  const tick = () => {
    if (my !== nav) return;
    const left = Math.max(0, end - Date.now());
    if (bar) bar.style.transform = `scaleX(${left / total})`;
    el.classList.toggle('low', left < Math.min(5000, total * 0.25));
    if (label) label.textContent = fmtClock(left);
    if (left <= 0) { stop(); onEnd && onEnd(); }
  };
  const t = setInterval(tick, 100);
  const stop = () => clearInterval(t);
  timers.push(stop);
  tick();
  return stop;
}
const fmtClock = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function stamp(now = Date.now()) {
  const d = new Date(now), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function monitor(id, camName) {
  return `<div class="mon" id="${id}"><div class="scene-box"></div><div class="noise"></div><i class="corner c1"></i><i class="corner c2"></i><i class="corner c3"></i><i class="corner c4"></i>
    <div class="hud"><div><span class="cam-name">${camName}</span><span class="rec">REC</span></div><div><span class="cam-clock">${stamp()}</span><span class="cam-tag"></span></div></div></div>`;
}
function setScene(mon, svg, name, cut = true) {
  if (!mon) return;
  mon.querySelector('.scene-box').innerHTML = svg;
  if (name) mon.querySelector('.cam-name').textContent = name;
  if (cut) { mon.classList.remove('cut'); void mon.offsetWidth; mon.classList.add('cut'); }
}
function tickClocks() { every(() => document.querySelectorAll('.cam-clock').forEach((el) => { el.textContent = stamp(); }), 1000); }

/* ---------- routing ---------- */
function route() {
  nav++; clearTimers(); closeSheet();
  const h = location.hash || '';
  let m;
  if ((m = /^#raid=([a-z0-9]{12})$/.exec(h))) return showRaid(m[1]);
  if ((m = /^#r=([a-z0-9-]{2,24})$/i.exec(h))) return showRoom(m[1].toLowerCase());
  if (h === '#rooms') return showRooms();
  const p = me();
  return p ? showRoom(p.handle) : showRooms();
}
window.addEventListener('hashchange', route);
function spinner(text = 'LOADING THE CAMERAS…') { app.innerHTML = `<div class="spinner">${text}</div>`; window.scrollTo(0, 0); }
function failed(e, back = '#rooms') {
  app.innerHTML = `<section class="card center"><h3>NO SIGNAL</h3><p>${esc(e.message)}</p><div class="row"><a class="btn sm" href="${back}">BACK</a></div></section>`;
}

/* ---------- a room on the cameras ---------- */
async function showRoom(h) {
  spinner();
  const my = nav;
  let room;
  try {
    room = me() ? await api('room', { h }).catch((e) => { if (e.status === 401) return getJSON('/api/heist/room?h=' + h); throw e; }) : await getJSON('/api/heist/room?h=' + h);
    await loadLooks([h]);
  } catch (e) { if (my === nav) failed(e); return; }
  if (my !== nav) return;
  room.look = lookOf(h);
  renderRoom(room);
}
function trapsList(traps) {
  return `<ul class="traps">${traps.map((t, i) => { const T = TRAPS[t.kind]; return `<li style="--c:${T.color}"><span class="em">${T.emoji}</span><div><b>${i + 1} · ${esc(T.name)}</b><span>${esc(t.label)} · ${esc(T.game)}</span><span>${esc(T.rule)}</span></div></li>`; }).join('')}</ul>`;
}
function trophyCard(t, own, ownerName, tag = 'div') {
  const by = t.from ? `<small class="stolen">Stolen from ${esc(t.fromName || t.from)}</small>` : '';
  const won = `<small>Won by ${esc(t.origName || ownerName)}${t.at ? ' · ' + new Date(t.at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</small>`;
  return `<${tag} class="trophy"${tag === 'button' ? ` type="button" data-tid="${esc(t.id)}" aria-pressed="false"` : ''}>${trophySvg(t.kind, { stolen: !!t.from })}<b>${esc(t.name)}</b>${won}${by}</${tag}>`;
}
function logLine(e) {
  const T = e.kind ? TRAPS[e.kind] : null;
  const what = e.what === 'caught' ? `🚨 <span><b>${esc(e.name)}</b> got caught in the ${esc(T ? T.name : 'trap house')}</span>`
    : `🔓 <span><b>${esc(e.name)}</b> broke in and took ${esc(e.took || 'something')}</span>`;
  return `<li>${what}<time>${ago(e.at)}</time></li>`;
}
function renderRoom(room) {
  const p = me(), own = !!(room.me && room.me.own), name = room.owner.name, h = room.owner.handle;
  const n = room.trophies.length;
  app.innerHTML = `<div class="cctv">
    <div class="head"><p class="kick">🎥 Security cameras · live</p><h2>${esc(possessive(name))}<small>TROPHY ROOM</small></h2>
      <p class="stats"><span>🏆 ${plural(n, 'trophy', 'trophies')}</span><span>🚨 ${room.caught} caught</span><span>🔓 ${plural(room.broken, 'break-in')}</span></p></div>
    ${monitor('mon', 'CAM 02 · VAULT')}
    <div class="cams" role="tablist" aria-label="Cameras"><button type="button" role="tab" data-cam="1" aria-selected="false">CAM 1 · TRAP HALL</button><button type="button" role="tab" data-cam="2" aria-selected="true">CAM 2 · VAULT</button></div></div>
    <section class="card break" id="act"></section>
    ${own ? `<section class="card" id="editor"></section>` : `<section class="card"><h3>THE TRAP HOUSE <span class="tag">IN THIS ORDER</span></h3>${trapsList(room.traps)}</section>`}
    <section class="card"><h3>THE TROVE</h3>${n ? `<div class="shelf">${room.trophies.map((t) => trophyCard(t, own, name)).join('')}</div>` : `<p class="empty">${own ? 'No trophies yet. Finish #1 on a daily board (Three Clue Crew, Puzzled Spin, Mind Heist, No Cap or Par-Tee Time’s Daily 3), win a Masters, get a Goat Getaway pen out at par or take #1 on Screensaver, and a trophy lands in your trove. So does one taken from someone else’s room.' : `No trophies in the trove yet. The loot chest is still worth a look.`}</p>`}
      ${room.loot && Object.keys(room.loot).length ? `<p class="fine">💰 The loot chest right now: ${esc(words(room.loot).replace(/\+/g, ''))}.</p>` : ''}</section>
    <section class="card"><h3>SECURITY LOG</h3>${room.log.length ? `<ul class="log">${room.log.map(logLine).join('')}</ul>` : '<p class="empty">Quiet so far. Nobody has tried the traps.</p>'}</section>
    <p class="center"><a class="link" href="#rooms">Watch other trophy rooms →</a></p>`;
  window.scrollTo(0, 0);
  const mon = $('mon');
  mon.querySelector('.cam-tag').textContent = '@' + h;
  let cam = 2, auto = true;
  const draw = (c, cut) => {
    cam = c;
    setScene(mon, c === 2 ? vaultSvg(room, { lock: !!room.lock }) : hallSvg(room.traps), c === 2 ? 'CAM 02 · VAULT' : 'CAM 01 · TRAP HALL', cut);
    app.querySelectorAll('.cams button').forEach((b) => b.setAttribute('aria-selected', String(Number(b.dataset.cam) === c)));
  };
  draw(2, false);
  app.querySelectorAll('.cams button').forEach((b) => { b.onclick = () => { auto = false; sfx.tap(); draw(Number(b.dataset.cam), true); }; });
  every(() => { if (auto) draw(cam === 2 ? 1 : 2, true); }, 7000);
  tickClocks();
  renderAct(room, p, own);
  if (own) renderEditor(room);
}
function renderAct(room, p, own) {
  const box = $('act'), name = room.owner.name, m = room.me;
  box.classList.remove('go');
  if (!p) {
    box.innerHTML = `<h3>BREAK IN</h3><p>Anyone can watch the cameras. To get past ${esc(possessive(name))} traps you need a Capra Lab profile.</p><div class="row"><a class="btn" href="/#profile">MAKE MY PROFILE</a></div>`;
    return;
  }
  if (!m) {
    box.innerHTML = `<h3>BREAK IN</h3><p>Your Capra Lab key didn’t match, so you’re watching as a guest.</p><div class="row"><a class="btn" href="/#profile">SIGN IN AGAIN</a></div>`;
    return;
  }
  if (own) {
    box.innerHTML = `<h3>YOUR ROOM</h3><p>Anyone can watch these cameras. Getting in means getting past your four traps, and every raider they catch pays you ${CATCH_PAY.amber} amber.</p>
      ${room.lock ? `<p class="fine">🔒 Lockdown after a break-in until ${clockTime(room.lock)}.</p>` : ''}
      <div class="row"><button class="btn" type="button" id="dare">📲 DARE A FRIEND</button></div>`;
    $('dare').onclick = () => dare(room.owner.handle);
    return;
  }
  if (m.tried === 'run' && m.raid) {
    box.innerHTML = `<h3>YOU’RE MID-HEIST</h3><p>Your break-in here is still going. The clock is running.</p><div class="row"><a class="btn red" href="#raid=${esc(m.raid)}">BACK TO IT</a></div>`;
    return;
  }
  if (m.tried) {
    const back = m.raid ? `<div class="row"><a class="btn dark sm" href="#raid=${esc(m.raid)}">${m.tried === 'caught' ? 'SEE YOUR MUGSHOT' : '📸 SEE YOUR SELFIE'}</a></div>` : '';
    box.innerHTML = m.tried === 'caught'
      ? `<h3>CAUGHT TODAY</h3><p>${esc(possessive(name))} traps got you today. You can try this room again tomorrow. Other rooms are fair game.</p>${back}`
      : `<h3>ALREADY IN</h3><p>You broke into this room today. One try a room a day.</p>${back}`;
    return;
  }
  if (room.lock) {
    box.innerHTML = `<h3>🔒 LOCKDOWN</h3><p>Someone broke in, so the alarm is resetting. This room opens again at ${clockTime(room.lock)}.</p>`;
    return;
  }
  box.classList.add('go');
  box.innerHTML = `<h3>BREAK IN</h3><p>${plural(room.traps.length, 'trap')} stand between you and ${esc(possessive(name))} trophies. Get through them all in one go and take your pick: one trophy or the loot.</p>
    <div class="row"><button class="btn red" type="button" id="breakIn">🚨 BREAK IN</button></div>
    <p class="fine">One try a day. If a trap catches you, ${esc(name)} gets ${CATCH_PAY.amber} amber and you’re locked out of this room until tomorrow. Make it and you get ${words(BREAK_PAY).replace('+', '')} on top.</p>`;
  $('breakIn').onclick = () => {
    sfx.tap();
    sheet(`<h3>READY?</h3><p>${room.traps.map((t, i) => `${i + 1}. ${TRAPS[t.kind].emoji} ${esc(TRAPS[t.kind].name)}`).join('<br>')}</p>
      <p>Each trap’s clock starts when you open it. Golf holes play in Par-Tee Time and goat pens in Goat Getaway: once you start one, finish it there. Leaving a trap trips the alarm.</p>
      <div class="row"><button class="btn dark" type="button" id="notYet">NOT YET</button><button class="btn red" type="button" id="goIn">BREAK IN</button></div>`, 'Break in');
    $('notYet').onclick = closeSheet;
    $('goIn').onclick = async () => {
      $('goIn').disabled = true;
      try { const r = await api('start', { h: room.owner.handle }); closeSheet(); location.hash = '#raid=' + r.id; }
      catch (e) { closeSheet(); toast(e.message); route(); }
    };
  };
}
async function dare(handle) {
  const url = `${location.origin}/trophy-room/#r=${handle}`, text = 'Think you can break into my Capra Lab trophy room? Four traps, one try a day. 🏆🔒';
  try { if (navigator.share) { await navigator.share({ title: 'My trophy room', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text + ' ' + url); toast('Link copied. Send it to someone who thinks they can get in.'); }
  catch { toast(url); }
}

/* ---------- the owner's trap house ---------- */
function trapLabel(t, lib) {
  if (t.kind === 'golf' && t.pick) { const x = lib.holes.find((hh) => hh.id === t.pick); if (x) return `${x.name} · par ${x.par}`; }
  if (t.kind === 'goat' && t.pick != null && lib.pens[t.pick] != null) return `Pen ${t.pick + 1} · par ${lib.pens[t.pick]}`;
  return t.kind === 'golf' ? 'A random tough hole' : t.kind === 'goat' ? 'A random Billy pen' : TRAPS[t.kind].what;
}
function renderEditor(room) {
  const lib = room.library || { holes: [], pens: [] };
  const saved = JSON.stringify(room.traps.map((t) => ({ kind: t.kind, pick: t.pick ?? null })));
  let traps = JSON.parse(saved);
  const paint = () => {
    const changed = JSON.stringify(traps) !== saved;
    $('editor').innerHTML = `<h3>YOUR TRAP HOUSE <span class="tag">${SLOTS} TRAPS</span></h3>
      <p class="muted" style="margin-bottom:12px">Raiders hit these in order. Mix them up or stack the same trap four times. Tap one to change it.</p>
      <div class="slots">${traps.map((t, i) => { const T = TRAPS[t.kind]; return `<button type="button" class="slot" data-i="${i}" style="--c:${T.color}"><span class="n">TRAP ${i + 1}</span><span class="ed">EDIT</span><span class="em">${T.emoji}</span><b>${esc(T.name)}</b><small>${esc(trapLabel(t, lib))}</small></button>`; }).join('')}</div>
      ${changed ? `<div class="row"><button class="btn dark sm" type="button" id="undoTraps">UNDO</button><button class="btn" type="button" id="saveTraps">SAVE TRAPS</button></div>` : ''}`;
    $('editor').querySelectorAll('.slot').forEach((b) => { b.onclick = () => pick(Number(b.dataset.i)); });
    if (changed) {
      $('undoTraps').onclick = () => { traps = JSON.parse(saved); paint(); };
      $('saveTraps').onclick = async () => {
        $('saveTraps').disabled = true;
        try { const r = await api('traps', { traps }); r.look = lookOf(room.owner.handle); toast('Trap house saved. Good luck to them.'); renderRoom(r); }
        catch (e) { toast(e.message); $('saveTraps').disabled = false; }
      };
    }
  };
  const pick = (i) => {
    const cur = { ...traps[i] };
    let first = true;
    const draw = () => {
      const T = TRAPS[cur.kind], keep = !first; first = false;
      const sub = cur.kind === 'golf'
        ? `<p class="kick" style="margin-top:6px">Which hole</p><div class="pick-list" role="radiogroup">${[['', 'A random tough hole every raid']].concat(lib.holes.map((x) => [x.id, `${x.name} · ${x.course} · par ${x.par}`])).map(([v, l]) => `<button type="button" role="radio" data-v="${esc(v)}" aria-checked="${(cur.pick || '') === v}">${esc(l)}</button>`).join('')}</div>`
        : cur.kind === 'goat'
          ? `<p class="kick" style="margin-top:6px">Which pen</p><div class="pick-list" role="radiogroup">${[['', 'A random Billy pen every raid']].concat(lib.pens.map((par, k) => [String(k), `Pen ${k + 1} · par ${par}${par >= 17 ? ' · toughest' : ''}`])).map(([v, l]) => `<button type="button" role="radio" data-v="${v}" aria-checked="${(cur.pick == null ? '' : String(cur.pick)) === v}">${esc(l)}</button>`).join('')}</div>`
          : '';
      sheet(`<h3>TRAP ${i + 1}</h3>
        <div class="choices" role="radiogroup">${KINDS.map((k) => { const K = TRAPS[k]; return `<button type="button" class="choice" role="radio" data-k="${k}" aria-checked="${k === cur.kind}" style="--c:${K.color}"><span class="em">${K.emoji}</span><span><b>${esc(K.name)}</b><small>${esc(K.rule)}</small></span></button>`; }).join('')}</div>
        ${sub}<div class="row"><button class="btn" type="button" id="useTrap">USE ${esc(T.name.toUpperCase())}</button></div>`, 'Pick a trap', { keep });
      $('sheet').querySelectorAll('.choice').forEach((b) => { b.onclick = () => { sfx.tap(); if (cur.kind !== b.dataset.k) { cur.kind = b.dataset.k; cur.pick = null; } draw(); }; });
      $('sheet').querySelectorAll('.pick-list button').forEach((b) => { b.onclick = () => { sfx.tap(); const v = b.dataset.v; cur.pick = v === '' ? null : cur.kind === 'goat' ? Number(v) : v; draw(); }; });
      $('useTrap').onclick = () => { traps[i] = { kind: cur.kind, pick: cur.pick ?? null }; closeSheet(); paint(); };
    };
    draw();
  };
  paint();
}

/* ---------- the room list ---------- */
async function showRooms() {
  spinner();
  const my = nav;
  let list = [];
  try { list = (await getJSON('/api/heist/rooms')).rooms || []; await loadLooks(list.map((r) => r.h)); }
  catch (e) { /* the search still works */ }
  if (my !== nav) return;
  const p = me();
  app.innerHTML = `
    <div class="head"><p class="kick">🎥 Every room has cameras</p><h2>TROPHY ROOMS</h2>
      <p class="stats muted"><span>Watch anyone’s room. Get past their traps and take a trophy.</span></p></div>
    <form class="search" id="find" autocomplete="off"><input id="findName" maxlength="17" placeholder="A player’s Capra Lab name" aria-label="Capra Lab name" autocapitalize="off" spellcheck="false"><button class="btn sm" type="submit">WATCH</button></form>
    ${p ? `<div class="row"><a class="btn" href="#r=${esc(p.handle)}">🏆 MY TROPHY ROOM</a></div>` : `<section class="card"><h3>YOUR OWN ROOM</h3><p>Make a Capra Lab profile to get a trophy room, build its trap house and break into other rooms.</p><div class="row"><a class="btn" href="/#profile">MAKE MY PROFILE</a></div></section>`}
    <section class="card"><h3>ON THE CAMERAS <span class="tag">MOST TROPHIES FIRST</span></h3>
      ${list.length ? `<ul class="rooms">${list.map((r) => `<li><a href="#r=${esc(r.h)}"><span class="face">${drawAvatar(lookOf(r.h), { tight: true })}</span><b>${esc(r.name)}</b><span class="n">🏆 ${r.n}</span></a></li>`).join('')}</ul>` : '<p class="empty">No rooms on the list yet. Open yours and it shows up here.</p>'}</section>`;
  window.scrollTo(0, 0);
  $('find').onsubmit = (e) => { e.preventDefault(); const h = handleOf($('findName').value); if (h.length >= 2) location.hash = '#r=' + h; };
}

/* ---------- the break-in ---------- */
async function showRaid(id) {
  if (!me()) { app.innerHTML = `<section class="card"><h3>SIGN IN</h3><p>Break-ins need your Capra Lab profile.</p><div class="row"><a class="btn" href="/#profile">SIGN IN</a></div></section>`; return; }
  spinner('CUTTING THE WIRES…');
  const my = nav;
  try { const r = await api('raid', { raid: id }); if (my === nav) renderRaid(r.raid); }
  catch (e) { if (my === nav) failed(e); }
}
function stepsHtml(x) {
  return `<ol class="steps">${x.traps.map((t, i) => { const T = TRAPS[t.kind]; const cls = t.res === 'ok' ? 'ok' : t.res === 'caught' ? 'caught' : x.state === 'run' && i === x.step ? 'now' : ''; return `<li class="${cls}"><span>${t.res === 'ok' ? '✅' : t.res === 'caught' ? '🚨' : T.emoji}</span>${i + 1}</li>`; }).join('')}<li class="${x.state === 'inside' || x.state === 'done' ? 'ok' : ''}"><span>🏆</span>IN</li></ol>`;
}
function renderRaid(x, flash = '') {
  nav++; clearTimers(); closeSheet();
  const owner = x.owner.name;
  app.innerHTML = `<div class="head"><p class="kick">🚨 Breaking in</p><h2>${esc(possessive(owner))}<small>TROPHY ROOM</small></h2>${stepsHtml(x)}</div><div class="stage" id="stage"></div>`;
  window.scrollTo(0, 0);
  if (flash) toast(flash);
  const st = $('stage');
  if (x.state === 'run') {
    const t = x.trap;
    if (!t || !t.open) return intro(x, st);
    if (t.kind === 'trivia' || t.kind === 'clues') return quiz(x, st);
    if (t.kind === 'spin') return spin(x, st);
    return walkedOut(x, st);
  }
  if (x.state === 'caught') return caught(x, st);
  if (x.state === 'inside') return inside(x, st);
  if (x.state === 'done') return done(x, st);
  st.innerHTML = `<section class="card center"><h3>OUT OF TIME</h3><p>You made it in but took too long to choose, so you got out with nothing. The traps still count as beaten.</p><div class="row"><a class="btn sm" href="#rooms">MORE ROOMS</a></div></section>`;
}
function intro(x, st) {
  const t = x.traps[x.step], T = TRAPS[t.kind];
  const goBtn = t.kind === 'golf' ? `<a class="btn" href="/par-tee-time/#trap=${x.id}">⛳ TEE OFF IN PAR-TEE TIME</a>`
    : t.kind === 'goat' ? `<a class="btn" href="/goat-getaway/#trap=${x.id}">🐐 OPEN THE PEN IN GOAT GETAWAY</a>`
    : `<button class="btn" type="button" id="go">GO</button>`;
  st.innerHTML = `${monitor('mon', 'CAM 01 · TRAP HALL')}
    <section class="card intro" style="--c:${T.color}"><p class="kick">Trap ${x.step + 1} of ${x.traps.length}</p><div class="big">${T.emoji}</div><h3>${esc(T.name.toUpperCase())}</h3><p>${esc(T.rule)}</p>
      <div class="row">${goBtn}</div>
      <p class="fine">${t.kind === 'golf' || t.kind === 'goat' ? 'Once it opens, finish it there. Leaving the page part way trips the alarm.' : 'The clock starts when you tap GO.'}</p></section>`;
  setScene($('mon'), hallSvg(x.traps, { at: x.step, done: x.traps.map((tt) => tt.res) }), 'CAM 01 · TRAP HALL', false);
  $('mon').querySelector('.cam-tag').textContent = 'YOU ARE HERE';
  tickClocks();
  const go = $('go');
  if (go) go.onclick = async () => {
    go.disabled = true; sfx.tap();
    try { renderRaid((await api('raid', { raid: x.id, go: true })).raid); }
    catch (e) { toast(e.message); go.disabled = false; }
  };
}
function quiz(x, st) {
  const t = x.trap, T = TRAPS[t.kind], q = t.q, my = nav;
  st.innerHTML = `<section class="card" style="--c:${T.color}">
      <div class="qtop"><span>${T.emoji} ${esc(T.name.toUpperCase())} · ${t.i + 1} OF ${t.n}</span><span class="strikes" aria-label="${t.strikes} of ${QUIZ.strikes} strikes">${Array.from({ length: QUIZ.strikes }, (_, k) => `<i class="${k < t.strikes ? 'on' : ''}">${k < t.strikes ? '✕' : ''}</i>`).join('')}</span></div>
      <div class="timer" id="tm"><i></i></div>
      ${t.kind === 'trivia' ? `<p class="kick">${esc(q.d)} · ${esc(q.c)} · ${q.v}</p><p class="q">${esc(q.q)}</p>` : `<p class="kick" style="text-align:center">What connects all three?</p><div class="clues">${q.clues.map((c) => `<span>${esc(c)}</span>`).join('')}</div>`}
      <div class="opts">${q.o.map((o, k) => `<button class="opt" type="button" data-k="${k}">${esc(o)}</button>`).join('')}</div>
      <p class="verdict" id="verdict" role="status"></p></section>`;
  let locked = false;
  const answer = async (k) => {
    if (locked) return; locked = true; stop();
    const btns = [...st.querySelectorAll('.opt')];
    btns.forEach((b) => { b.disabled = true; });
    let res;
    try { res = await api('answer', { raid: x.id, i: t.i, pick: k }); }
    catch (e) { toast(e.message); return later(() => showRaid(x.id), 1200); }
    if (my !== nav) return;
    if (res.stale || res.right == null) return renderRaid(res.raid);
    btns.forEach((b, j) => { b.classList.add(j === res.right ? 'right' : j === k ? 'wrong' : 'dim'); });
    const v = $('verdict');
    if (res.ok) { sfx.right(); v.className = 'verdict good'; v.textContent = 'Right!'; }
    else { sfx.wrong(); v.className = 'verdict bad'; v.textContent = k < 0 ? 'Too slow!' : 'Wrong!'; }
    later(async () => {
      const r = res.raid;
      if (r.state === 'run' && r.step === x.step) {
        try { renderRaid((await api('raid', { raid: x.id, go: true })).raid); } catch (e) { toast(e.message); showRaid(x.id); }
      } else renderRaid(r, r.state === 'run' ? `${T.name} cleared!` : '');
    }, res.ok ? 1000 : 1700);
  };
  st.querySelectorAll('.opt').forEach((b) => { b.onclick = () => answer(Number(b.dataset.k)); });
  const stop = countdown($('tm'), t.left, () => answer(-1));
}
async function spin(x, st) {
  const t = x.trap, T = TRAPS.spin, my = nav;
  st.innerHTML = '<div class="spinner">LOADING THE PICTURE…</div>';
  let L;
  try { L = await import('/puzzled-spin/logic.mjs'); } catch (e) { st.innerHTML = '<section class="card"><p>Couldn’t load the puzzle. Check your signal.</p></section>'; return; }
  if (my !== nav) return;
  const p = L.puzzle(t.tier, t.stage, t.seed), n = p.n, aid = 'sa' + t.seed;
  const q = p.start.map((r) => r.slice());
  st.innerHTML = `<section class="card" style="--c:${T.color}">
      <div class="qtop"><span>${T.emoji} SPIN VAULT · ${esc(String(p.name || 'MASTERPIECE').toUpperCase())}</span><span id="spinLeft">${fmtClock(t.left)}</span></div>
      <div class="timer" id="tm" data-label="spinLeft"><i></i></div>
      <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${L.artSvg(p.art, aid)}</defs></svg>
      <div class="spin-grid" id="grid" style="grid-template-columns:repeat(${n},1fr)">${q.map((row, r) => row.map((v, c) => `<button type="button" data-r="${r}" data-c="${c}" aria-label="Tile ${r + 1}, ${c + 1}"><svg viewBox="${c} ${r} 1 1" preserveAspectRatio="none" aria-hidden="true" style="transform:rotate(${v * 90}deg)"><use href="#${aid}"/></svg></button>`).join('')).join('')}</div>
      <p class="verdict" id="verdict" role="status">Tap a tile to turn it. Make the picture whole.</p></section>`;
  let locked = false;
  const submit = async () => {
    locked = true; stop();
    $('grid').classList.add('done');
    try {
      const res = await api('answer', { raid: x.id, q });
      if (my !== nav) return;
      if (res.ok) { sfx.right(); $('verdict').className = 'verdict good'; $('verdict').textContent = 'The picture’s whole. Vault open!'; }
      later(() => renderRaid(res.raid, res.ok ? 'Spin Vault cleared!' : ''), res.ok ? 1100 : 300);
    } catch (e) { toast(e.message); later(() => showRaid(x.id), 1200); }
  };
  $('grid').querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      if (locked) return;
      const r = Number(b.dataset.r), c = Number(b.dataset.c);
      q[r][c] += 1; sfx.spin();
      b.firstChild.style.transform = `rotate(${q[r][c] * 90}deg)`;
      if (L.check(p, q).done) submit();
    };
  });
  const stop = countdown($('tm'), t.left, async () => {
    if (locked) return; locked = true;
    try { renderRaid((await api('raid', { raid: x.id })).raid); } catch (e) { showRaid(x.id); }
  });
}
async function walkedOut(x, st) {
  const T = TRAPS[x.trap.kind];
  st.innerHTML = `<section class="card center"><h3>YOU LEFT THE ${esc(T.name.toUpperCase())}</h3><p>That trap was open in ${esc(T.game)}, and leaving it part way trips the alarm.</p></section>`;
  try { const r = await api('answer', { raid: x.id, give: true }); later(() => renderRaid(r.raid), 1400); } catch (e) { toast(e.message); }
}
function shareRows(x) {
  return x.traps.map((t) => `${TRAPS[t.kind].emoji} ${t.marks && t.marks.length ? t.marks.map((m) => (m ? '🟩' : '🟥')).join('') : t.res === 'caught' ? '🟥' : t.res === 'ok' ? '🟩' : '⬛'}`);
}
function caught(x, st) {
  const p = me(), at = x.traps.findIndex((t) => t.res === 'caught'), T = TRAPS[(x.traps[at] || x.traps[x.step] || x.traps[0]).kind];
  const past = x.traps.filter((t) => t.res === 'ok').length;
  st.innerHTML = `${monitor('mon', 'CAM 01 · TRAP HALL')}
    <section class="card alarm-card"><div class="burst">CAUGHT!</div>
      <p>The ${esc(T.name)} got you${past ? ` after ${plural(past, 'trap')}` : ''}. ${esc(x.owner.name)} gets ${CATCH_PAY.amber} amber, and you’re locked out of this room until tomorrow.</p>
      <div class="mug">${drawAvatar(lookOf(p.handle), { plain: true })}<div class="placard">${esc(p.name.toUpperCase())}<br>CAUGHT · ${esc(T.name.toUpperCase())} · ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()}</div></div>
      <div class="share" id="share"></div>
      <div class="row"><a class="btn dark sm" href="#r=${esc(x.owner.handle)}">CAMERAS</a><a class="btn sm" href="#rooms">OTHER ROOMS</a></div></section>`;
  const mon = $('mon');
  mon.classList.add('alarm');
  setScene(mon, hallSvg(x.traps, { at, done: x.traps.map((t) => t.res) }), 'CAM 01 · TRAP HALL · ALARM', false);
  mon.querySelector('.cam-tag').textContent = 'INTRUDER';
  tickClocks();
  sfx.siren();
  loadLooks([p.handle]).then(() => { const m = st.querySelector('.mug svg'); if (m) m.outerHTML = drawAvatar(lookOf(p.handle), { plain: true }); });
  shareCard($('share'), CapraShareText('🚨', `caught in ${possessive(x.owner.name)} trap house`, [`Made it past ${past} of ${x.traps.length} traps`], shareRows(x)), '🚨', x.owner.handle);
}
function CapraShareText(emoji, sub, lines, grid) {
  return window.CapraShare ? window.CapraShare.text({ emoji, game: 'Trophy Room', sub, lines, grid }) : [`${emoji} Trophy Room · ${sub}`, ...lines, ...grid].join('\n');
}
function shareCard(el, text, emoji, handle) {
  const put = () => {
    if (!window.CapraShare || !el) return;
    el.innerHTML = '<lab-text-share></lab-text-share>';
    el.firstChild.set({ emoji, title: 'Trophy Room', text, url: `https://capra-lab.netlify.app/trophy-room/#r=${handle}` });
  };
  if (window.CapraShare) put(); else window.addEventListener('load', put, { once: true });
}
async function inside(x, st) {
  const my = nav;
  sfx.open();
  st.innerHTML = '<div class="spinner">THE VAULT DOOR SWINGS OPEN…</div>';
  let room;
  try { room = await getJSON('/api/heist/room?h=' + x.owner.handle); await loadLooks([x.owner.handle]); }
  catch (e) { st.innerHTML = `<section class="card"><p>${esc(e.message)}</p><div class="row"><button class="btn sm" type="button" onclick="location.reload()">TRY AGAIN</button></div></section>`; return; }
  if (my !== nav) return;
  room.look = lookOf(x.owner.handle);
  const loot = room.loot || {}, hasLoot = Object.keys(loot).length > 0, empty = !room.trophies.length && !hasLoot;
  st.innerHTML = `<section class="card intro"><div class="burst win">YOU’RE IN!</div><p>Take one thing before the guards come back: <b id="pickLeft"></b></p></section>
    ${monitor('mon', 'CAM 02 · VAULT')}
    <section class="card"><h3>TAKE ONE</h3>
      ${room.trophies.length ? `<div class="shelf">${room.trophies.map((t) => trophyCard(t, false, room.owner.name, 'button')).join('')}</div>` : ''}
      ${hasLoot ? `<div class="row"><button type="button" class="loot-pick" id="lootPick" aria-pressed="false"><span class="em">💰</span><span><b>THE LOOT</b><small>${esc(words(loot).replace(/\+/g, ''))} out of ${esc(possessive(room.owner.name))} stash</small></span></button></div>` : ''}
      ${empty ? `<p>The trove’s cleaned out. No trophies, nothing in the loot chest. You still get the selfie and the bragging rights.</p>` : ''}
      <div class="row"><button class="btn" type="button" id="take" ${empty ? '' : 'disabled'}>${empty ? 'TAKE THE BRAGGING RIGHTS' : 'PICK SOMETHING'}</button></div></section>`;
  const mon = $('mon');
  setScene(mon, vaultSvg(room, { pick: true }), 'CAM 02 · VAULT', false);
  mon.querySelector('.cam-tag').textContent = 'DOOR OPEN';
  tickClocks();
  const timer = document.createElement('div'); timer.className = 'timer'; timer.dataset.label = 'pickLeft'; timer.innerHTML = '<i></i>'; timer.hidden = true; st.appendChild(timer);
  countdown(timer, Math.max(0, (x.pickBy || 0) - (x.now || Date.now())), () => showRaid(x.id));
  let choice = empty ? { pick: 'none' } : null;
  const choose = (c, label) => {
    choice = c; sfx.tap();
    st.querySelectorAll('.trophy[data-tid]').forEach((b) => b.setAttribute('aria-pressed', String(c.pick === 'trophy' && b.dataset.tid === c.id)));
    if ($('lootPick')) $('lootPick').setAttribute('aria-pressed', String(c.pick === 'loot'));
    $('take').disabled = false; $('take').textContent = `TAKE ${label.toUpperCase()}`;
  };
  st.querySelectorAll('.trophy[data-tid]').forEach((b) => { b.onclick = () => { const t = room.trophies.find((tt) => tt.id === b.dataset.tid); choose({ pick: 'trophy', id: t.id }, 'the trophy'); }; });
  mon.querySelectorAll('.pickable').forEach((g) => { g.addEventListener('click', () => { const t = room.trophies.find((tt) => tt.id === g.dataset.tid); if (t) { choose({ pick: 'trophy', id: t.id }, 'the trophy'); const b = st.querySelector(`.trophy[data-tid="${CSS.escape(t.id)}"]`); if (b) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }); });
  if ($('lootPick')) $('lootPick').onclick = () => choose({ pick: 'loot' }, 'the loot');
  $('take').onclick = async () => {
    if (!choice) return;
    $('take').disabled = true;
    try {
      const r = await api('take', { raid: x.id, pick: choice.pick, id: choice.id });
      sfx.cash(); walletChanged();
      renderRaid(r.raid);
    } catch (e) { toast(e.message); $('take').disabled = false; if (e.code === 'gone' || e.code === 'empty') later(() => showRaid(x.id), 900); }
  };
}
async function done(x, st) {
  const p = me(), took = x.took || { name: 'something' }, owner = x.owner.name, my = nav;
  st.innerHTML = `<section class="card intro"><div class="burst win">HEIST!</div>
      <p>You took <b>${esc(took.name)}</b> from ${esc(possessive(owner))} trophy room${took.pick === 'trophy' ? '. It’s in your trove now, marked stolen' : ''}. Plus ${esc(words(BREAK_PAY).replace('+', ''))} for the break-in.</p></section>
    <section class="card"><h3>THE SELFIE</h3><p class="muted" style="margin-bottom:12px">You, the loot and ${esc(possessive(owner))} hologram. Made for the group chat.</p>
      <div class="selfie selfie-wait" id="selfieBox" role="img" aria-label="The selfie is developing"><span>📸 DEVELOPING…</span></div>
      <div class="row"><button class="btn" type="button" id="shareShot" disabled>📲 SHARE</button><a class="btn alt" id="saveShot" download="trophy-room-selfie.png" aria-disabled="true">SAVE</a></div>
      <p class="fine center" id="selfieTip">Or press and hold the picture to save it to Photos.</p>
      <div class="share" id="share"></div></section>
    <div class="row"><a class="btn dark sm" href="#r=${esc(p.handle)}">MY ROOM</a><a class="btn dark sm" href="#rooms">MORE ROOMS</a></div>`;
  shareCard($('share'), CapraShareText('🏆', `broke into ${possessive(owner)}`, [`Took: ${took.name}`], shareRows(x)), '🏆', x.owner.handle);
  let room = { trophies: [] };
  try { room = await getJSON('/api/heist/room?h=' + x.owner.handle); } catch { /* an empty room behind is fine */ }
  await loadLooks([x.owner.handle, p.handle]);
  if (my !== nav) return;
  let shot = null;
  try { shot = await makeSelfie({ owner, ownerLook: lookOf(x.owner.handle), raider: p.name, raiderLook: lookOf(p.handle), took, trophies: room.trophies || [] }); }
  catch (e) { shot = null; }
  if (my !== nav) return;
  const box = $('selfieBox');
  if (!shot || (!shot.url && !shot.canvas)) {
    box.innerHTML = '<span>The selfie didn’t come out on this phone. The text below still shares the heist.</span>';
    $('selfieTip').hidden = true;
    return;
  }
  const fl = document.createElement('div'); fl.className = 'shot-flash'; document.body.appendChild(fl); later(() => fl.remove(), 600);
  sfx.shutter();
  const alt = `Selfie in ${possessive(owner)} trophy room with their hologram behind`;
  if (shot.url) {
    const img = new Image(); img.className = 'selfie'; img.id = 'selfie'; img.alt = alt; img.src = shot.url;
    box.replaceWith(img);
    $('saveShot').href = shot.url; $('saveShot').removeAttribute('aria-disabled');
  } else {
    // the phone wouldn't turn the canvas into a picture file: show the canvas itself (a screenshot still works)
    shot.canvas.className = 'selfie'; shot.canvas.id = 'selfie'; shot.canvas.setAttribute('role', 'img'); shot.canvas.setAttribute('aria-label', alt);
    box.replaceWith(shot.canvas);
    $('saveShot').hidden = true;
    $('selfieTip').textContent = 'Take a screenshot to keep it.';
  }
  const file = shot.blob ? new File([shot.blob], 'trophy-room-selfie.png', { type: 'image/png' }) : null;
  $('shareShot').disabled = false;
  $('shareShot').onclick = async () => {
    const text = `I broke into ${possessive(owner)} trophy room and took ${took.name}. 🏆 https://capra-lab.netlify.app/trophy-room/#r=${x.owner.handle}`;
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    $('saveShot').click();
  };
}

route();
