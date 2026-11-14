/* Invites from Messages into the Home Screen app (JC, Nov 13 2026: "When I send a text invite and select
   it when I have my Capra lab as a Home Screen app, it goes to my browser. Can it look for this iPhone
   Home Screen app and push it to that?").

   iOS opens every link from Messages in Safari, and nothing on a web page can open a Home Screen web
   app (only App Store apps can claim links). So the invite is handed over instead (lab/handoff.js):

   - In Safari, an invite (a game link with a room, a code or a challenge on it) opened from outside the
     lab is left on the server for 5 minutes, and a card says: if Capra Lab is on your Home Screen,
     switch to it, the invite is waiting there (or Play here; "No app" stops the card for good).
   - In the Home Screen app, each time it opens or comes back to the front, it asks for a waiting
     invite and offers to open it: "Your invite is here" → Show invite.

   /lab/fill.js loads this on iPhones and iPads only. */
(function () {
  if (window.__labHandoff) return;
  window.__labHandoff = true;
  if (window.top !== window) return;
  const standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  const store = (s, k, v) => { try { if (v === undefined) return s.getItem(k); if (v === null) s.removeItem(k); else s.setItem(k, v); } catch { return null; } };
  const here = () => location.pathname + location.search + location.hash;
  const cleanLanding = (u) => (typeof u === 'string' && u.charAt(0) === '/' && u.charAt(1) !== '/' ? u : null);
  const me = () => { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? { name: p.name, code: p.code } : {}; } catch { return {}; } };
  const fp = () => ({
    os: (navigator.userAgent.match(/OS (\d+[_.]\d+)/) || [])[1] || '',
    sw: Math.min(screen.width, screen.height), sh: Math.max(screen.width, screen.height),
    dpr: window.devicePixelRatio || 1,
    tz: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } })(),
    lang: navigator.language || '',
  });
  const post = (path, body) => fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);

  const GAMES = {
    'par-tee-time': 'Par-Tee Time', 'mind-heist': 'Mind Heist', 'no-cap': 'No Cap', punchline: 'Punchline', classified: 'Classified',
    'primal-survival': 'Primal Survival', 'swerve-planet': 'Swerve Planet', 'dont-look': 'Don’t Look!', 'goat-getaway': 'Goat Getaway',
    screensaver: 'Screensaver', 'three-clue-crew': 'Three Clue Crew', 'puzzled-spin': 'Puzzled Spin', 'glacial-maw': 'Glacial Maw',
  };
  const gameOf = (path) => GAMES[(String(path).split(/[/?#]/).filter(Boolean)[0] || '')] || 'Capra Lab';

  /* ---------- the card (shared by both sides) ---------- */
  function card({ title, text, main, other, small, onMain, onOther, onSmall }) {
    const old = document.getElementById('labHandoff');
    if (old) old.remove();
    const host = document.createElement('div');
    host.id = 'labHandoff';
    host.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;pointer-events:none';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      .c { pointer-events: auto; box-sizing: border-box; margin: 0 auto; width: min(100% - 24px - env(safe-area-inset-left) - env(safe-area-inset-right), 460px);
        margin-bottom: calc(env(safe-area-inset-bottom) + 12px - var(--lab-gap, 0px)); padding: 14px 16px 14px; border-radius: 20px;
        background: #FFF8EC; color: #120E18; border: 4px solid #120E18; box-shadow: 5px 6px 0 #05030A;
        font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; animation: up 0.35s cubic-bezier(0.3, 1.4, 0.5, 1); }
      @keyframes up { from { transform: translateY(120%); } }
      @media (prefers-reduced-motion: reduce) { .c { animation: none; } }
      h2 { margin: 0 0 4px; font-family: Bangers, Impact, "Arial Narrow Bold", system-ui, sans-serif; font-weight: 400; font-size: 26px; letter-spacing: 0.04em; line-height: 1; }
      p { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; }
      .row { display: flex; gap: 10px; margin-top: 12px; }
      button { font: inherit; cursor: pointer; flex: 1 1 0; min-height: 48px; padding: 8px 12px; border-radius: 14px; border: 3px solid #120E18; font-size: 16px; font-weight: 800; color: #120E18; }
      .main { background: #FFD23F; box-shadow: 3px 4px 0 #05030A; flex-grow: 1.4; }
      .other { background: #fff; }
      button:active { transform: translate(2px, 3px); box-shadow: none; }
      .small { display: block; flex: none; width: 100%; min-height: 36px; margin-top: 6px; border: 0; background: none; font-size: 13px; font-weight: 700; text-decoration: underline; color: #5B3CC4; }
      button:focus-visible { outline: 3px solid #5B3CC4; outline-offset: 2px; }
    </style>
    <div class="c" role="dialog" aria-live="polite" aria-labelledby="t">
      <h2 id="t"></h2><p id="x"></p>
      <div class="row">${other ? '<button class="other" type="button"></button>' : ''}<button class="main" type="button"></button></div>
      ${small ? '<button class="small" type="button"></button>' : ''}
    </div>`;
    root.getElementById('t').textContent = title;
    root.getElementById('x').textContent = text;
    const close = () => host.remove();
    const b = (sel, label, fn) => { const el = root.querySelector(sel); if (el) { el.textContent = label; el.onclick = () => { close(); if (fn) fn(); }; } };
    b('.main', main, onMain);
    b('.other', other, onOther);
    b('.small', small, onSmall);
    (document.body || document.documentElement).appendChild(host);
    return host;
  }

  /* ---------- Safari: leave the invite for the app ---------- */
  function inSafari() {
    // the link as tapped (fill.js kept it before the game could take the code off the address)
    const url = cleanLanding(window.__labLanding) || here();
    const u = new URL(url, location.origin);
    const path = u.pathname;
    if (path === '/' || path === '/index.html' || /^\/(avatar|lab)\//.test(path)) return;
    const deep = path.split('/').filter(Boolean).length > 1;
    if (!(deep || u.search.length > 1 || u.hash.length > 1)) return;                       // a game's front page isn't an invite
    if (document.referrer && document.referrer.indexOf(location.origin) === 0) return;    // browsing the lab in Safari
    if (store(localStorage, 'capra-lab.no-app') === '1') return;
    if (store(sessionStorage, 'capra-lab.play-here') === url) return;
    post('/api/handoff/drop', { url, fp: fp(), ...me() }).then((r) => {
      if (!r || !r.ok) return;
      const show = () => card({
        title: 'GOT THE APP?',
        text: `If Capra Lab is on your Home Screen, switch to it now: this ${gameOf(url)} invite is waiting there for 5 minutes, signed in as you.`,
        main: 'Play here', other: 'OK',
        small: 'No app: don’t ask again',
        onMain: () => store(sessionStorage, 'capra-lab.play-here', url),
        onSmall: () => store(localStorage, 'capra-lab.no-app', '1'),
      });
      if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
    });
  }

  /* ---------- the Home Screen app: pick it up ---------- */
  let last = 0, asking = false;
  function ask() {
    if (document.visibilityState === 'hidden' || asking || Date.now() - last < 2000) return;
    last = Date.now();
    asking = true;
    post('/api/handoff/claim', { fp: fp(), ...me() }).then((r) => {
      asking = false;
      if (!r || !r.url || r.url === here()) return;
      const url = r.url;
      card({
        title: 'YOUR INVITE IS HERE',
        text: `You tapped a ${gameOf(url)} invite in Messages. Open it here in the app?`,
        main: 'Show invite', other: 'Not now',
        onMain: () => {
          const u = new URL(url, location.origin);
          if (u.pathname === location.pathname && u.search === location.search) { location.replace(u.href); location.reload(); }
          else location.href = u.href;
        },
      });
    });
  }

  if (standalone) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ask); else ask();
    document.addEventListener('visibilitychange', ask);
    addEventListener('pageshow', (e) => { if (e.persisted) ask(); });
  } else {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inSafari); else inSafari();
  }
})();
