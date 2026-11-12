/* Capra Lab hub: the profile walkthrough, sign-in, and the "who's playing" chip.
 *
 * One profile for every game in the lab. A new visitor is walked through:
 *   welcome -> pick a name -> your key card -> save it (required) -> done
 * The save step will not let go until the card has gone through the share
 * sheet (Save Image puts it in Photos) or the player says they screenshotted it.
 * If they leave mid-way, the next visit resumes at the save step.
 *
 * The signed-in player lives in localStorage under capra-lab.profile, which
 * every game in the lab reads, so signing in here signs you in everywhere.
 */
import { keyCardBlob, readKeyCardFile } from './keycard.js';
import './capras-lab.js';   /* Capra's Lab: the owner's and crew's private panel */
import './card-draw.js';    /* the daily Card Draw: four cards a day */

const ME_KEY = 'capra-lab.profile';      /* { name, handle, created, code } */
const SAVED_KEY = 'capra-lab.key-saved'; /* handle whose card was saved */
const SKIP_KEY = 'capra-lab.skip';       /* this visit only */
const SITE = location.host || 'capra-lab.netlify.app';

const $ = id => document.getElementById(id);
const store = {
  get(k, area = localStorage) { try { return area.getItem(k); } catch { return null; } },
  set(k, v, area = localStorage) { try { area.setItem(k, v); } catch { /* private mode */ } },
  del(k, area = localStorage) { try { area.removeItem(k); } catch { /* private mode */ } }
};

function loadMe() {
  try { return JSON.parse(store.get(ME_KEY) || 'null'); } catch { return null; }
}
function saveMe(p) {
  if (p) store.set(ME_KEY, JSON.stringify({ name: p.name, handle: p.handle, created: p.created, code: String(p.code) }));
  else store.del(ME_KEY);
  paintWho();
  window.dispatchEvent(new Event('capra-lab:profile'));
}
const keySaved = me => !!me && store.get(SAVED_KEY) === me.handle;

async function api(path, body) {
  const res = await fetch(path, body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : undefined);
  let out = null;
  try { out = await res.json(); } catch { /* not json */ }
  if (!res.ok) {
    const err = new Error((out && out.error) || 'Something went wrong. Try again.');
    err.status = res.status;
    throw err;
  }
  return out;
}

/* ---------------- the walkthrough ---------------- */
const sheet = $('onboard');
let current = null;

function open() {
  sheet.hidden = false;
  document.body.classList.add('locked');
}
function close() {
  sheet.hidden = true;
  document.body.classList.remove('locked');
  current = null;
}
function step(name) {
  current = name;
  sheet.querySelectorAll('[data-step]').forEach(s => { s.hidden = s.dataset.step !== name; });
  const dots = { welcome: 0, name: 1, signin: 1, key: 2, done: 3 };
  sheet.querySelectorAll('.dots span').forEach((d, i) => d.classList.toggle('on', i <= (dots[name] ?? 0)));
  sheet.querySelector('.dots').hidden = name === 'profile' || name === 'signout';
  const h = sheet.querySelector('[data-step="' + name + '"] h2');
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  sheet.scrollTop = 0;
}
function say(id, text, bad = true) {
  const el = $(id);
  el.textContent = text || '';
  el.classList.toggle('bad', !!text && bad);
}

/* ---------------- the key card ---------------- */
let cardFile = null, cardUrl = null;
async function renderCard(me, imgId) {
  const blob = await keyCardBlob(document.createElement('canvas'), { name: me.name, code: me.code, site: SITE });
  cardFile = new File([blob], 'capra-lab-key-' + me.handle + '.png', { type: 'image/png' });
  if (cardUrl) URL.revokeObjectURL(cardUrl);
  cardUrl = URL.createObjectURL(blob);
  $(imgId).src = cardUrl;
  return cardFile;
}
const canShareFile = () =>
  !!(cardFile && navigator.canShare && navigator.share && navigator.canShare({ files: [cardFile] }));

/* Save via the share sheet ("Save Image" files it in Photos). Where files cannot
   be shared (most desktops), fall back to a download. */
async function saveCard(statusId) {
  if (!cardFile) return false;
  if (canShareFile()) {
    try {
      await navigator.share({ files: [cardFile], title: 'My Capra Lab key' });
      say(statusId, 'Saved. Keep that picture somewhere safe.', false);
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') { say(statusId, 'Not saved yet. Tap Save to Photos, then Save Image.'); return false; }
    }
  }
  const a = document.createElement('a');
  a.href = cardUrl; a.download = cardFile.name;
  document.body.appendChild(a); a.click(); a.remove();
  say(statusId, 'Downloaded. Move it somewhere you will not lose it.', false);
  return true;
}

function paintSaveButtons() {
  const label = canShareFile() ? 'Save to Photos' : 'Download my key';
  ['keySave', 'profSave'].forEach(id => { $(id).textContent = label; });
}

async function showKeyStep(me) {
  open(); step('key');
  $('keyName').textContent = me.name;
  $('keyDigits').textContent = String(me.code).replace(/(\d{3})(\d{3})/, '$1 $2');
  $('keyConfirm').checked = false;
  $('keyNext').disabled = true;
  say('keyStatus', '');
  await renderCard(me, 'keyImg');
  paintSaveButtons();
}

/* ---------------- who's playing ---------------- */
function paintWho() {
  const me = loadMe();
  const btn = $('whoBtn');
  if (me) {
    btn.innerHTML = '<span class="who-mark" aria-hidden="true"></span><span class="who-text"><small>Playing as</small><b></b></span><span class="who-cta">My key</span>';
    btn.querySelector('.who-mark').textContent = me.name.slice(0, 1).toUpperCase();
    btn.querySelector('b').textContent = me.name;
    btn.setAttribute('aria-label', 'Playing as ' + me.name + '. Open my key');
  } else {
    btn.innerHTML = '<span class="who-text"><small>One profile, every game</small><b>Make your Capra Lab profile</b></span><span class="who-cta">Start</span>';
    btn.removeAttribute('aria-label');
  }
}

async function openProfile() {
  const me = loadMe();
  if (!me) { open(); step('welcome'); return; }
  open(); step('profile');
  $('profName').textContent = me.name;
  say('profStatus', '');
  await renderCard(me, 'profImg');
  paintSaveButtons();
}

/* ---------------- wiring ---------------- */
$('whoBtn').onclick = openProfile;

$('goMake').onclick = () => { step('name'); say('nameStatus', ''); $('nameInput').focus(); };
$('goSignin').onclick = () => { step('signin'); say('signStatus', ''); };
$('goSkip').onclick = () => { store.set(SKIP_KEY, '1', sessionStorage); close(); };
sheet.querySelectorAll('[data-back]').forEach(b => { b.onclick = () => step(b.dataset.back); });

$('nameForm').onsubmit = async e => {
  e.preventDefault();
  const name = $('nameInput').value.trim();
  if (name.replace(/[^a-z0-9]/gi, '').length < 2) return say('nameStatus', 'Use at least two letters or numbers.');
  $('nameGo').disabled = true; say('nameStatus', 'Making your key…', false);
  try {
    const p = await api('/api/profile/create', { name });
    saveMe(p);                /* kept straight away, so leaving now cannot lose it */
    store.del(SAVED_KEY);
    await showKeyStep(loadMe());
  } catch (err) {
    say('nameStatus', err.status === 409 ? 'That name is taken. Try another.' : err.message);
  } finally { $('nameGo').disabled = false; }
};

$('keySave').onclick = async () => {
  if (await saveCard('keyStatus')) { $('keyConfirm').checked = true; $('keyNext').disabled = false; }
};
$('keyConfirm').onchange = () => { $('keyNext').disabled = !$('keyConfirm').checked; };
$('keyNext').onclick = () => {
  const me = loadMe();
  if (!me || !$('keyConfirm').checked) return;
  store.set(SAVED_KEY, me.handle);
  $('doneName').textContent = me.name;
  step('done');
};
$('doneGo').onclick = close;

$('signForm').onsubmit = async e => {
  e.preventDefault();
  await signIn($('signName').value.trim(), $('signCode').value.replace(/\D/g, ''));
};
async function signIn(name, code) {
  if (!name || code.length !== 6) return say('signStatus', 'Enter your name and the six digits on your key.');
  say('signStatus', 'Checking…', false);
  try {
    const p = await api('/api/profile/signin', { name, code });
    saveMe({ ...p, code });
    store.set(SAVED_KEY, p.handle);   /* they had the key, so it is saved somewhere */
    $('doneName').textContent = p.name;
    step('done');
  } catch (err) {
    say('signStatus', err.status === 401 ? 'No profile with that name and key.' : err.message);
  }
}
$('signFile').onchange = async () => {
  const f = $('signFile').files[0];
  $('signFile').value = '';
  if (!f) return;
  const creds = await readKeyCardFile(f);
  if (!creds) {
    return say('signStatus', 'That picture does not have the key inside (screenshots do not). Type the name and six digits printed on it instead.');
  }
  $('signName').value = creds.name; $('signCode').value = creds.code;
  await signIn(creds.name, creds.code);
};

$('profSave').onclick = () => saveCard('profStatus');
$('profClose').onclick = close;
$('profOut').onclick = () => step('signout');
$('outYes').onclick = () => { saveMe(null); store.del(SAVED_KEY); close(); };
$('outNo').onclick = openProfile;

/* Escape closes the optional sheets, never the save step */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !sheet.hidden && (current === 'profile' || current === 'signout' || current === 'done')) close();
});

/* ---------------- first visit ---------------- */
paintWho();
const me = loadMe();
const asked = location.hash === '#profile';                /* a game sent the player here to make one */
if (asked) history.replaceState(null, '', location.pathname);
if (me && !keySaved(me)) showKeyStep(me);                 /* left before saving: finish that first */
else if (me && asked) openProfile();
else if (!me && (asked || !store.get(SKIP_KEY, sessionStorage))) { open(); step('welcome'); }
