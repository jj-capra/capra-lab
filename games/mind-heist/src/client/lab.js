// Capra Lab profiles. Inside Capra Lab, the player signed in to the lab plays Mind Heist as that
// profile: the lab keeps { name, handle, code } in this site's storage (same address), the server
// checks the key with Capra Lab and links the lab name to one Mind Heist profile (stats, friends,
// diamonds and all). After that, signing in to Capra Lab on any device signs you in here too.
import { api, getAuth, setAuth } from './api.js';
import { IN_LAB } from './base.js';

const LAB_KEY = 'capra-lab.profile';
const LINK_KEY = 'mh.lab'; // the lab handle this device's Mind Heist sign-in belongs to

export function labPlayer() {
  if (!IN_LAB) return null;
  try {
    const p = JSON.parse(localStorage.getItem(LAB_KEY) || 'null');
    return p && p.name && p.handle && /^\d{6}$/.test(String(p.code || '')) ? p : null;
  } catch (e) { return null; }
}
const linked = () => { try { return localStorage.getItem(LINK_KEY); } catch (e) { return null; } };
const setLinked = (h) => { try { if (h) localStorage.setItem(LINK_KEY, h); else localStorage.removeItem(LINK_KEY); } catch (e) {} };

// Players arriving from the old address (mind-heist.netlify.app) bring their sign-in along: the
// page left there reads it from that site's storage and hands it over in the link, after the #
// (which never reaches a server). Take it, then wipe it from the address bar and the history.
function adoptMovedSignIn() {
  const m = location.hash.match(/^#mh-move=(.+)$/);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const a = JSON.parse(decodeURIComponent(m[1]));
    if (a && /^[A-Za-z0-9]{6,20}$/.test(String(a.pid || '')) && /^[a-f0-9]{20,64}$/.test(String(a.token || '')) && !getAuth()) setAuth(a);
  } catch (e) { /* a garbled link: nothing to take */ }
}

// Runs once before the first load. Resolves to null when there's nothing to choose, or to the lab
// player when their lab profile has no Mind Heist profile yet (new here, or bringing an old one).
export async function labSync() {
  if (!IN_LAB) return null;
  adoptMovedSignIn();
  const lab = labPlayer();
  if (!lab) {
    // Signed out of Capra Lab: a sign-in that came from the lab goes with it.
    if (linked()) { setAuth(null); setLinked(null); }
    return null;
  }
  if (linked() === lab.handle && getAuth()) return null;
  // This device's sign-in came from a different lab player: it isn't this player's.
  if (linked() && linked() !== lab.handle) { setAuth(null); setLinked(null); }
  try {
    const r = await api('POST', '/me/lab', { name: lab.name, code: lab.code });
    if (r.choose) return { ...lab, mhName: r.name };
    setAuth(r); setLinked(lab.handle);
  } catch (e) {
    // A stale lab key or Capra Lab not answering: play on as a plain Mind Heist player for now.
  }
  return null;
}

// The two ways to finish linking: a new Mind Heist profile, or the one behind a Mind Heist key.
export async function labLink(lab, { avatar, key } = {}) {
  const r = await api('POST', '/me/lab', key ? { name: lab.name, code: lab.code, key } : { name: lab.name, code: lab.code, create: true, avatar });
  setAuth(r); setLinked(lab.handle);
  return r;
}

// Signing out of Mind Heist inside the lab means signing out of the lab.
export const labSignOutUrl = '/#profile';
