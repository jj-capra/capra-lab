import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { html, Toasts, SoundButton, toast } from './ui.js';
import { api, getAuth, setAuth } from './api.js';
import { Onboarding, LabOnboarding, Home, ChallengeLanding } from './home.js';
import { Room } from './room.js';
import { GOAT_GETAWAY } from './vault.js';
import { Sound } from './sound.js';
import { setTheme, rememberTheme, rememberedTheme } from './themes.js';
import { at, local, asset, IN_LAB } from './base.js';
import { labSync } from './lab.js';

// Inside Capra Lab, home's top row starts with the lab's button (the lab's own /lab/chip.js).
if (IN_LAB) {
  const s = document.createElement('script');
  s.src = '/lab/chip.js'; s.defer = true;
  document.head.appendChild(s);
}

// Vault Jam became its own Capra Lab game, Goat Getaway (Nov 7 2026): old /jam links go there.
if (IN_LAB && /^\/jam(\/practice)?\/?$/.test(local(location.pathname))) {
  location.replace(GOAT_GETAWAY + (location.pathname.includes('practice') ? '#practice' : ''));
}

// Inside Capra Lab, sort out the lab profile before the first load (see lab.js).
const labReady = labSync();

// Paint the last look this device used before anything loads.
setTheme(rememberedTheme());

function parse(path) {
  let m;
  if ((m = path.match(/^\/tv\/([A-Za-z0-9]{4})\/?$/))) return { name: 'tv', code: m[1].toUpperCase() };
  if ((m = path.match(/^\/r\/([A-Za-z0-9]{4,8})\/?$/))) return { name: 'room', code: m[1].toUpperCase() };
  if ((m = path.match(/^\/c\/([A-Za-z0-9]{7})\/?$/))) return { name: 'challenge', id: m[1].toUpperCase() };
  if ((m = path.match(/^\/([A-Za-z0-9]{4})\/?$/))) return { name: 'room', code: m[1].toUpperCase(), invite: true };
  return { name: 'home' };
}

function App() {
  const [route, setRoute] = useState(() => parse(local(location.pathname)));
  const [initial, setInitial] = useState(null);
  const [me, setMe] = useState(null);
  const [home, setHome] = useState(null);
  const [ready, setReady] = useState(false);
  const [labPick, setLabPick] = useState(null); // a lab player with no Mind Heist profile yet

  const nav = (path, roomInit = null) => {
    if (at(path) !== location.pathname) history.pushState({}, '', at(path));
    setInitial(roomInit);
    setRoute(parse(path));
    window.scrollTo(0, 0);
  };
  const loadHome = () => labReady
    .then(pick => { setLabPick(pick && !getAuth() ? pick : null); return api('GET', '/home'); })
    .then(h => {
      setHome(h);
      if (h.me) setMe(h.me);
      else if (getAuth()) { setAuth(null); setMe(null); }
    })
    .catch(e => toast(e.message, 'err'))
    .finally(() => setReady(true));

  useEffect(() => {
    const pop = () => { setInitial(null); setRoute(parse(local(location.pathname))); };
    window.addEventListener('popstate', pop);
    const key = (e) => { if ((e.key === 'm' || e.key === 'M') && !(e.target.closest && e.target.closest('input,textarea'))) Sound.toggle(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('keydown', key); };
  }, []);
  useEffect(() => { if (route.name !== 'tv') loadHome(); else setReady(true); }, [route.name]);

  // Outside a room the page wears your own look; rooms set the host's.
  if (route.name !== 'room' && route.name !== 'tv') setTheme(me ? me.theme : rememberedTheme());
  useEffect(() => { if (me && me.theme) rememberTheme(me.theme); }, [me && me.theme]);

  let body;
  if (route.name === 'tv') body = html`<${Room} key=${'tv' + route.code} code=${route.code} tv=${true} me=${null} nav=${nav} />`;
  else if (!ready) body = html`<div class="onb"><img class="onb-mark" src=${asset('icon-192.png')} alt="Mind Heist" width="92" height="92" /></div>`;
  else if (!me && labPick) body = html`<${LabOnboarding} lab=${labPick} reason=${route.name === 'room' ? 'join' : ''} onDone=${(m) => { setLabPick(null); setMe(m); loadHome(); }} />`;
  else if (!me) body = html`<${Onboarding} reason=${route.name === 'room' ? 'join' : ''} onDone=${(m) => { setMe(m); loadHome(); }} />`;
  else if (route.name === 'room') body = html`<${Room} key=${route.code} code=${route.code} me=${me} nav=${nav} initial=${initial && initial.code === route.code ? initial : null} />`;
  else if (route.name === 'challenge') body = html`<${ChallengeLanding} id=${route.id} me=${me} nav=${nav} />`;
  else body = home ? html`<${Home} me=${me} setMe=${setMe} nav=${nav} home=${home} reloadHome=${loadHome} />` : null;

  return html`${body}<${SoundButton} /><${Toasts} />`;
}

// Two fingers on the glass pinch-zoom the page mid-game, and iPhone Safari ignores the viewport's zoom limits,
// so while a game is on screen, pinches are blocked (Safari's gesture events, and any
// two-finger move). Home and the other pages can still be zoomed.
{
  const stop = e => { if (document.querySelector('.room')) e.preventDefault(); };
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, stop, { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) stop(e); }, { passive: false });
}

render(html`<${App} />`, document.getElementById('app'));
