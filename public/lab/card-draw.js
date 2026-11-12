/* The hub's daily Card Draw (JC, Nov 11–12 2026): four cards a day for every lab player, flipped one
 * by one. Prizes go into your hand and the games play them (the cards: /lab/cards-catalog.mjs; the
 * server: lab/cards.js at /api/cards/*). Guests see the four cards face down and a way to make a
 * profile. Which of today's cards you've turned over is remembered on this phone only. */
import { DRAW, KINDS, face, drawDay } from './cards-catalog.mjs';

const ME_KEY = 'capra-lab.profile';
const FLIP_KEY = 'capra-lab.cards-flipped';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const me = () => { try { const p = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); return p && p.name && p.code ? p : null; } catch { return null; } };
function flippedToday(day) {
  try { const f = JSON.parse(localStorage.getItem(FLIP_KEY) || 'null'); return f && f.day === day && Array.isArray(f.up) ? f.up : []; } catch { return []; }
}
function rememberFlip(day, up) { try { localStorage.setItem(FLIP_KEY, JSON.stringify({ day, up })); } catch { /* private mode */ } }

async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let out = {};
  try { out = await res.json(); } catch { /* not json */ }
  if (!res.ok) { const e = new Error(out.error || 'Something went wrong. Try again.'); e.status = res.status; throw e; }
  return out;
}

let S = { me: null, data: null, up: [], busy: false, err: '', last: -1 };

function untilMidnight() {
  const now = Date.now(), today = drawDay(now);
  let lo = now, hi = now + 26 * 3600e3;            // find the next Pacific day change by halving
  while (hi - lo > 60e3) { const mid = (lo + hi) / 2; if (drawDay(mid) === today) lo = mid; else hi = mid; }
  const mins = Math.max(1, Math.round((hi - now) / 60e3));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function cardHtml(i) {
  const d = S.data, up = S.up.includes(i) && d && d.today;
  const c = up ? d.today[i] : null, f = c ? face(c) : null;
  const label = f ? `${f.name}${f.dud ? ', a dud' : ` for ${f.gameName}`}` : `Card ${i + 1}, face down. Tap to flip.`;
  return `<button class="cd-card${up ? ' up' : ''}${f && f.dud ? ' dud' : ''}${f && !f.dud ? ' prize' : ''}" type="button" data-i="${i}" aria-label="${esc(label)}"${S.busy || !S.me ? ' tabindex="-1"' : ''}>
    <span class="cd-in">
      <span class="cd-back" aria-hidden="true"><img src="/lab/capra-lab-mark.png" alt="" width="40" height="40"><b>LAB</b></span>
      <span class="cd-front" aria-hidden="true">${f ? `<i>${f.icon}</i><b>${esc(f.name)}</b><small>${f.dud ? 'Dud' : esc(f.gameName)}</small>` : ''}</span>
    </span>
  </button>`;
}

function paint() {
  const box = $('cardDraw');
  if (!box) return;
  const d = S.data;
  $('cdCards').innerHTML = Array.from({ length: DRAW }, (_, i) => cardHtml(i)).join('');
  const left = d && d.today ? DRAW - S.up.length : DRAW;
  $('cdWhen').textContent = S.me ? (d && d.drawn && left === 0 ? `New cards in ${untilMidnight()}` : `${left} to flip`) : 'Four cards a day';

  // the line under the cards: the card you just turned over, or what to do
  let line = '';
  if (!S.me) line = `<button class="cd-btn" type="button" id="cdJoin">Make a profile to draw</button><span>Free. One profile works in every game.</span>`;
  else if (S.err) line = `<span class="cd-err">${esc(S.err)}</span>`;
  else if (S.last >= 0 && d && d.today) {
    const f = face(d.today[S.last]);
    line = (f.dud ? `<span><b>${f.icon} ${esc(f.name)}.</b> ${esc(f.how)}</span>`
      : `<span><b>${f.icon} ${esc(f.name)}</b> for <a href="${f.href}">${esc(f.gameName)}</a>: ${esc(f.how)} It’s in your hand.</span>`)
      + (left > 0 ? `<button class="cd-link" type="button" id="cdAll">Flip the other ${left}</button>` : '');
  } else if (!d) line = '<span>Shuffling…</span>';
  else if (!d.drawn) line = '<span>Tap a card to flip it. Some are duds; the rest go in your hand for a game.</span>';
  else if (left > 0) line = `<span>Keep going: ${left} more to flip.</span><button class="cd-link" type="button" id="cdAll">Flip them all</button>`;
  else {
    const won = d.today.filter((c) => c.k !== 'dud').length;
    line = `<span>${won ? `${won} for your hand today.` : 'All duds today. The lab owes you one.'} New cards at midnight.</span>`;
  }
  $('cdLine').innerHTML = line;

  // your hand, by game
  const hand = (d && d.hand) || {};
  const kinds = Object.keys(KINDS).filter((k) => hand[k] > 0);
  $('cdHand').hidden = !S.me || !d;
  $('cdHandList').innerHTML = kinds.length ? kinds.map((k) => {
    const c = KINDS[k];
    return `<a class="cd-held" href="${c.href}"><i aria-hidden="true">${c.icon}</i><span><b>${esc(c.name)} <em>×${hand[k]}</em></b><small>${esc(c.gameName)} · ${esc(c.when)}</small></span><span class="cd-go" aria-hidden="true">›</span></a>`;
  }).join('') : '<p class="cd-empty">No cards yet. Prizes from your draws wait here until you play them.</p>';

  box.querySelectorAll('.cd-card').forEach((b) => { b.onclick = () => flip(Number(b.dataset.i)); });
  const join = $('cdJoin'); if (join) join.onclick = () => { const w = $('whoBtn'); if (w) w.click(); };
  const all = $('cdAll'); if (all) all.onclick = flipAll;
}

async function ensureDrawn() {
  if (S.data && S.data.drawn) return true;
  S.busy = true; paint();
  try { S.data = await post('/api/cards/draw', { name: S.me.name, code: S.me.code }); S.err = ''; }
  catch (e) { S.err = e.message; }
  S.busy = false;
  return !!(S.data && S.data.drawn);
}
async function flip(i) {
  if (!S.me) { const w = $('whoBtn'); if (w) w.click(); return; }
  if (S.busy || S.up.includes(i)) { if (S.up.includes(i)) { S.last = i; paint(); } return; }
  if (!(await ensureDrawn())) { paint(); return; }
  S.up = [...S.up, i];
  S.last = i;
  rememberFlip(S.data.day, S.up);
  paint();
  const c = S.data.today[i];
  if (c && c.k !== 'dud') {
    const el = document.querySelector(`.cd-card[data-i="${i}"]`);
    if (el) { el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 700); }
  }
}
async function flipAll() {
  for (let i = 0; i < DRAW; i++) if (!S.up.includes(i)) { await flip(i); await new Promise((r) => setTimeout(r, 260)); }
}

export async function refreshCards() {
  S = { me: me(), data: null, up: [], busy: false, err: '', last: -1 };
  paint();
  if (!S.me) return;
  try {
    S.data = await post('/api/cards/me', { name: S.me.name, code: S.me.code });
    S.up = S.data.drawn ? flippedToday(S.data.day) : [];
  } catch (e) { S.err = e.status === 401 ? 'Sign in again to draw your cards.' : e.message; }
  paint();
}

window.addEventListener('capra-lab:profile', refreshCards);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.data && S.data.day !== drawDay()) refreshCards(); });
refreshCards();
