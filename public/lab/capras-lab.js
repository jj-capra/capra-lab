/* Capra's Lab: the hub's private panel, for JC (the owner, master controls) and his crew.
 *
 * It appears only when the signed-in profile is a member (POST /api/profile/capras-lab says so;
 * the key is checked there like any sign-in). Three parts:
 *   In testing     game tiles marked data-brew, which the public grid never shows
 *   Trivia decks   every Mind Heist deck (POST /mind-heist/api/lab/decks); the owner flips each
 *                  between Hidden and Public, the crew sees which ones are hidden
 *   Crew           owner only: who else gets in (they must have a Capra Lab profile already)
 */
const ME_KEY = 'capra-lab.profile';
const OPEN_KEY = 'capra-lab.capras-open';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const me = () => { try { const p = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); return p && p.name && p.code ? p : null; } catch { return null; } };
const remember = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } };
const recall = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let out = {};
  try { out = await res.json(); } catch { /* not json */ }
  if (!res.ok) { const e = new Error(out.error || 'Something went wrong. Try again.'); e.status = res.status; throw e; }
  return out;
}

let state = { role: null, crew: [], decks: null, showAll: false, busy: false, err: '' };

function paint() {
  const box = $('caprasLab');
  if (!state.role) { box.hidden = true; return; }
  box.hidden = false;
  const owner = state.role === 'owner';
  $('clRole').textContent = owner ? 'Owner · master controls' : 'Crew';
  const open = recall(OPEN_KEY) !== '0';
  box.classList.toggle('open', open);
  $('clToggle').setAttribute('aria-expanded', String(open));

  // In testing: brew game tiles (none means nothing brewing)
  const tiles = $('clGames').querySelectorAll('.tile');
  $('clGamesEmpty').hidden = tiles.length > 0;

  // Trivia decks
  const decks = state.decks;
  const list = $('clDecks');
  if (!decks) list.innerHTML = `<p class="cl-note">${state.err ? esc(state.err) : 'Loading the decks…'}</p>`;
  else {
    const hidden = decks.filter((d) => d.hidden);
    const shown = state.showAll ? [...hidden, ...decks.filter((d) => !d.hidden)] : hidden;
    $('clDeckCount').textContent = `${hidden.length} hidden`;
    list.innerHTML = (shown.length ? shown.map((d) => `<div class="cl-deck${d.hidden ? ' is-hidden' : ''}">
        <span class="cl-deck-t"><b>${esc(d.title)}</b><small>${esc(d.shelf || '')}${d.kind === 'jokes' ? ' · face-off' : ''}${d.no ? ' · No. ' + d.no : ''}${d.brew ? ' · JJ Brew' : ''}</small></span>
        ${owner ? `<button class="cl-switch" type="button" role="switch" aria-checked="${d.hidden}" data-deck="${esc(d.id)}" aria-label="Hide ${esc(d.title)} from the public"${state.busy ? ' disabled' : ''}><span>${d.hidden ? 'Hidden' : 'Public'}</span></button>`
          : `<span class="cl-pill">${d.hidden ? 'Hidden' : 'Public'}</span>`}
      </div>`).join('') : '<p class="cl-note">No hidden decks yet. Anything you call a JJ Brew starts out here.</p>')
      + (owner || state.showAll ? `<button class="cl-link" type="button" id="clAll">${state.showAll ? 'Only the hidden ones' : `All ${decks.length} decks`}</button>` : '');
    const all = $('clAll');
    if (all) all.onclick = () => { state.showAll = !state.showAll; paint(); };
    list.querySelectorAll('[data-deck]').forEach((b) => { b.onclick = () => flip(b.dataset.deck, b.getAttribute('aria-checked') !== 'true'); });
  }

  // Crew (owner only)
  $('clCrewBox').hidden = !owner;
  if (owner) {
    $('clCrew').innerHTML = state.crew.length
      ? state.crew.map((c) => `<li><span>${esc(c.name)}</span><button class="cl-link" type="button" data-out="${esc(c.handle)}"${state.busy ? ' disabled' : ''}>Remove</button></li>`).join('')
      : '<li class="cl-note">Just you so far.</li>';
    $('clCrew').querySelectorAll('[data-out]').forEach((b) => { b.onclick = () => crewChange({ op: 'crew-remove', handle: b.dataset.out }); });
  }
  $('clMsg').textContent = state.err && decks ? state.err : '';
}

async function flip(id, hidden) {
  const p = me();
  if (!p) return;
  state.busy = true; state.err = ''; paint();
  try { state.decks = (await post('/mind-heist/api/lab/decks/set', { lab: { name: p.name, code: p.code }, id, hidden })).decks; }
  catch (e) { state.err = e.message; }
  state.busy = false; paint();
}

async function crewChange(req) {
  const p = me();
  if (!p) return;
  state.busy = true; state.err = ''; paint();
  try { state.crew = (await post('/api/profile/capras-lab', { name: p.name, code: p.code, ...req })).crew; $('clAddName').value = ''; }
  catch (e) { state.err = e.message; }
  state.busy = false; paint();
}

export async function refreshCaprasLab() {
  const p = me();
  state = { role: null, crew: [], decks: null, showAll: false, busy: false, err: '' };
  if (!p) { paint(); return; }
  try {
    const r = await post('/api/profile/capras-lab', { name: p.name, code: p.code });
    state.role = r.role || null;
    state.crew = r.crew || [];
  } catch { state.role = null; }
  paint();
  if (!state.role) return;
  try { state.decks = (await post('/mind-heist/api/lab/decks', { lab: { name: p.name, code: p.code } })).decks; }
  catch (e) { state.err = e.message; }
  paint();
}

$('clToggle').onclick = () => { remember(OPEN_KEY, $('caprasLab').classList.contains('open') ? '0' : null); paint(); };
$('clAdd').onsubmit = (e) => {
  e.preventDefault();
  const name = $('clAddName').value.trim();
  if (name) crewChange({ op: 'crew-add', crewName: name });
};
window.addEventListener('capra-lab:profile', refreshCaprasLab);
refreshCaprasLab();
