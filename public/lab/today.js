/* The hub's guided way through the lab (JC, Nov 27 2026: "Simplify the main menu to be more guided in navigation.
 * A welcome back the first time they open Capra Lab to flip their cards, then a check on their trophy haul and if
 * anyone tried to break into their trophy room. Then a “Start my Daily Runs” for all the games that have
 * trophies").
 *
 * TODAY on the hub: 1 flip today's cards, 2 your trophy haul, 3 the Daily Runs (every game with a trophy up for
 * grabs, done or not, and the button that starts the next one: /lab/runs.js). The first time a signed-in player
 * opens the hub each day (midnight Pacific), the same three steps come up as a walk-through: Welcome back and the
 * four cards (the Card Draw itself, /lab/card-draw.js, lives in that first step), the haul (trophies, the loot,
 * new ones and break-ins since the last look: the trophy room's own record, /api/heist/room), then the Daily Runs.
 * Kept on this phone: the day the walk-through came up (capra-lab.welcome) and when you last looked at the haul
 * (capra-lab.haul-seen). */
import { RUNS, runsStatus, startRuns, nextAfter, runUrl, session } from './runs.js';
import { walletDay } from './wallet-catalog.mjs';
import { TRAPS } from './heist-rules.mjs';
import { trophySvg, svgUri } from '/trophy-room/art.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const me = () => { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? p : null; } catch { return null; } };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const WELCOME_KEY = 'capra-lab.welcome', SEEN_KEY = 'capra-lab.haul-seen';
const DAY = 864e5;

let S = { cards: null, room: null, status: null, roomErr: false };

/* ---------- when you last looked at the haul ---------- */
const seenAt = (h) => { try { const s = JSON.parse(store.get(SEEN_KEY) || 'null'); return s && s.h === h ? s.at : 0; } catch { return 0; } };
const sinceOf = (h) => seenAt(h) || Date.now() - DAY;     // never looked: the last day
function ago(t) {
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
const sinceWords = (t) => (Date.now() - t < 20 * 3600e3 ? `since ${new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : Date.now() - t < 2 * DAY ? 'since yesterday' : `since ${new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);

/* ---------- the trophy room, as the owner sees it ---------- */
async function loadRoom() {
  const p = me();
  if (!p) { S.room = null; return; }
  try {
    const r = await fetch('/api/heist/room', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ h: p.handle, name: p.name, code: p.code }) });
    S.room = r.ok ? await r.json() : null;
    S.roomErr = !r.ok;
  } catch { S.room = null; S.roomErr = true; }
}
function haulNews(p) {
  const room = S.room, since = sinceOf(p.handle);
  if (!room) return { since, fresh: [], raids: [] };
  const fresh = (room.trophies || []).filter((t) => (t.took || t.at || 0) > since);
  const raids = (room.log || []).filter((e) => e.at > since);
  return { since, fresh, raids };
}
function raidLine(e) {
  const who = `<b>${esc(e.name || e.h)}</b>`;
  if (e.what === 'caught') { const T = TRAPS[e.kind] || {}; return `<i aria-hidden="true">🚨</i><span>${who} tried to break in and got caught in your ${esc(T.name || 'trap')}${T.emoji ? ` ${T.emoji}` : ''}.<small>${ago(e.at)} · you got the amber</small></span>`; }
  return `<i aria-hidden="true">💰</i><span>${who} made it through your traps and took ${esc(e.took || 'something')}.<small>${ago(e.at)}</small></span>`;
}
function paintHaul() {
  const p = me(), box = $('wbHaul');
  if (!box || !p) return;
  const room = S.room;
  if (!room) { box.innerHTML = `<p class="hl-none">${S.roomErr ? 'The trophy room didn’t answer just then. Your trophies are safe; check again in a bit.' : 'Checking your trophy room…'}</p>`; return; }
  const { since, fresh, raids } = haulNews(p);
  const loot = Object.entries(room.loot || {}).filter(([, n]) => n > 0);
  $('wbHaulSub').textContent = `Here’s what happened ${sinceWords(since)}.`;
  const stat = (n, label) => `<div class="hl-big"><b>${esc(n)}</b><small>${esc(label)}</small></div>`;
  // the loot pile: its amber up big, the rest under it
  const lootStat = loot.length ? stat(loot[0][1].toLocaleString('en-US'), `${loot[0][0].toUpperCase()} IN THE LOOT${loot.slice(1).map(([k, n]) => ` + ${n} ${k.toUpperCase()}`).join('')}`) : stat(room.broken || 0, 'BREAK-INS EVER');
  box.innerHTML = `<div class="hl-stats">${stat(room.trophies.length, room.trophies.length === 1 ? 'TROPHY' : 'TROPHIES')}${stat(room.caught || 0, 'RAIDERS CAUGHT')}${lootStat}</div>
    <h3 class="cd-h">NEW TROPHIES</h3>
    ${fresh.length ? `<div class="hl-new">${fresh.slice(0, 6).map((t) => `<figure><img src="${svgUri(trophySvg(t.kind))}" alt="" width="64" height="77"><figcaption>${esc(t.name)}${t.from ? `<small>taken from ${esc(t.fromName || t.from)}</small>` : ''}</figcaption></figure>`).join('')}</div>`
      : `<p class="hl-none">No new ones ${sinceWords(since)}. A #1 on a daily board at midnight puts one on your shelf.</p>`}
    <h3 class="cd-h">BREAK-INS</h3>
    ${raids.length ? `<ul class="hl-log">${raids.slice(0, 6).map((e) => `<li>${raidLine(e)}</li>`).join('')}</ul>`
      : `<p class="hl-none">🛡️ Nobody tried to break in ${sinceWords(since)}. Your traps held.</p>`}`;
  $('wbRoom').href = `/trophy-room/#r=${encodeURIComponent(p.handle)}`;
}

/* ---------- the Daily Runs list ---------- */
function runsHtml() {
  const st = S.status;
  return RUNS.map((r) => {
    const o = st ? st[r.game] : null;
    const done = !!(o && o.done), started = !!(o && o.started && !o.done);
    const line = done ? o.line : started ? 'Started: pick up where you left off' : r.what;
    return `<li class="rn${done ? ' done' : ''}"><a href="${runUrl(r)}" data-run="${r.game}"><span class="e" aria-hidden="true">${r.emoji}</span><span class="g"><b>${esc(r.name)}</b><small>${esc(line)}</small>${o && o.lead ? `<small class="ld">${esc(o.lead)}</small>` : ''}</span><span class="s" aria-hidden="true">${done ? '✓' : '▸'}</span></a></li>`;
  }).join('');
}
const doneList = () => (S.status ? RUNS.filter((r) => S.status[r.game] && S.status[r.game].done).map((r) => r.game) : []);
function go(game = null) {
  const s = startRuns(doneList());
  const r = game ? RUNS.find((x) => x.game === game) : nextAfter(null, s);
  location.href = r ? runUrl(r) : '/';
}

/* ---------- the TODAY panel ---------- */
function paintToday() {
  const p = me();
  const box = $('today');
  if (!box) return;
  box.classList.toggle('guest', !p);
  $('tdGuest').hidden = !!p;
  $('tdSteps').hidden = !p;
  $('tdDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  $('tdHello').textContent = p ? 'TODAY IN THE LAB' : 'WELCOME TO THE LAB';
  // the runs list shows for everyone (a guest sees what each daily is)
  $('tdRuns').innerHTML = runsHtml();
  $('wbRuns').innerHTML = runsHtml();
  if (!p) return;

  // 1: the cards
  const c = S.cards;
  const cardsDone = !!(c && c.loaded && c.left === 0);
  $('tdCards').classList.toggle('done', cardsDone);
  $('tdCardsLine').textContent = !c || !c.loaded ? 'Four new cards every day' : c.err ? c.err
    : c.left === 0 ? (c.won ? `Flipped: ${c.won} for your hand${c.held ? ` · ${c.held} held` : ''}` : 'Flipped: all duds today') : `${c.left} to flip`;

  // 2: the haul
  const looked = seenAt(p.handle) && walletDay(seenAt(p.handle)) === walletDay();
  const { fresh, raids } = haulNews(p);
  $('tdHaul').classList.toggle('done', !!looked && !raids.length && !fresh.length);
  $('tdHaulLine').textContent = !S.room ? (S.roomErr ? 'Your trophy room' : 'Checking your trophy room…')
    : `${S.room.trophies.length} ${S.room.trophies.length === 1 ? 'trophy' : 'trophies'}`
      + (raids.length ? ` · ${raids.length} break-in ${raids.length === 1 ? 'try' : 'tries'}!` : fresh.length ? ` · ${fresh.length} new!` : ' · no break-ins');

  // 3: the Daily Runs
  const st = S.status, n = doneList().length;
  $('tdRunsStep').classList.toggle('done', !!st && n === RUNS.length);
  $('tdRunsLine').textContent = !st ? 'Every game with a trophy up for grabs today' : n === RUNS.length ? `All ${RUNS.length} done! The #1s get their trophies at midnight` : `${n} of ${RUNS.length} done today`;
  const sess = session();
  const label = !st ? 'START MY DAILY RUNS ▸' : n === RUNS.length ? 'ALL DONE TODAY ✓' : n || sess ? 'CONTINUE MY DAILY RUNS ▸' : 'START MY DAILY RUNS ▸';
  for (const id of ['tdStart', 'wbStart']) { const b = $(id); b.textContent = label; b.disabled = !!st && n === RUNS.length; }
}

/* ---------- the walk-through ---------- */
const sheet = () => $('welcome');
function wstep(name) {
  const w = sheet();
  w.querySelectorAll('[data-w]').forEach((s) => { s.hidden = s.dataset.w !== name; });
  const i = ['cards', 'haul', 'runs'].indexOf(name);
  w.querySelectorAll('.dots span').forEach((d, k) => d.classList.toggle('on', k <= i));
  w.scrollTop = 0;
  const h = w.querySelector(`[data-w="${name}"] h2`);
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  if (name === 'haul') {
    paintHaul();
    // looked: from now on "new" means after this
    const p = me();
    if (p && S.room) setTimeout(() => { store.set(SEEN_KEY, JSON.stringify({ h: p.handle, at: Date.now() })); paintToday(); }, 0);
  }
}
function openWelcome(at = 'cards') {
  const p = me();
  if (!p) return;
  $('wbHello').textContent = `Welcome back, ${p.name}!`;
  sheet().hidden = false;
  document.body.classList.add('locked');
  wstep(at);
}
function closeWelcome() {
  sheet().hidden = true;
  if ($('onboard').hidden) document.body.classList.remove('locked');
  paintToday();
}

/* ---------- wiring ---------- */
$('tdCards').onclick = () => openWelcome('cards');
$('tdHaul').onclick = () => openWelcome('haul');
$('tdStart').onclick = () => go();
$('wbStart').onclick = () => go();
$('wbLater').onclick = closeWelcome;
$('wbClose').onclick = closeWelcome;
$('tdJoin').onclick = () => $('whoBtn').click();
sheet().querySelectorAll('[data-wnext]').forEach((b) => { b.onclick = () => wstep(b.dataset.wnext); });
for (const id of ['tdRuns', 'wbRuns']) $(id).addEventListener('click', (e) => { const a = e.target.closest('a[data-run]'); if (a && me()) { e.preventDefault(); go(a.dataset.run); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet().hidden) closeWelcome(); });
window.addEventListener('capra-cards:state', (e) => { S.cards = e.detail; paintToday(); });

async function refresh() {
  paintToday();
  if (!me()) return;
  await Promise.all([loadRoom(), runsStatus().then((s) => { S.status = s; }).catch(() => {})]);
  paintToday();
  if (!sheet().hidden && !sheet().querySelector('[data-w="haul"]').hidden) paintHaul();
}
window.addEventListener('capra-lab:profile', () => { S = { cards: S.cards, room: null, status: null, roomErr: false }; refresh(); });
// back from a game (the Home Screen app keeps the page): what's done may have changed
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
window.addEventListener('pageshow', (e) => { if (e.persisted) refresh(); });

// The first open of the day: welcome back (not over the profile walk-through, and not for a key still unsaved).
function firstOpenToday() {
  const p = me();
  if (!p || !$('onboard').hidden || store.get('capra-lab.key-saved') !== p.handle) return false;
  const day = walletDay(), w = store.get(WELCOME_KEY);
  if (w === `${p.handle}|${day}`) return false;
  store.set(WELCOME_KEY, `${p.handle}|${day}`);
  return true;
}
refresh();
if (firstOpenToday()) openWelcome('cards');
