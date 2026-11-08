/* The testing gate for a game that isn't live yet (a "JJ Brew", JC Nov 2026): only Capra's Lab
 * members (the owner and his crew, lab/crew.js) get in; everyone else sees "Still brewing" and a
 * way back to the lab. Put it first in the game page's <head>:
 *     <script src="/lab/brew.js"></script>
 * and take it out (plus the hub tile's data-brew) when JC says the game goes live.
 * This keeps the public out of the game; the page's files are still on the site, so anything
 * truly secret (like trivia answers) belongs on a server, which is how Mind Heist hides decks. */
(() => {
  const html = document.documentElement;
  html.classList.add('brewing');
  const css = document.createElement('style');
  css.textContent = `html.brewing body{visibility:hidden}
.brew-gate{visibility:visible;position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;
  padding:calc(env(safe-area-inset-top,0px) + 24px) 20px calc(env(safe-area-inset-bottom,0px) + 24px);
  background:#16141F radial-gradient(rgba(255,248,236,.07) 1px,transparent 1.6px) 0 0/9px 9px;color:#FFF8EC;
  font:600 16px/1.45 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}
.brew-gate div{max-width:340px;display:grid;gap:14px;justify-items:center}
.brew-gate img{width:120px;height:120px}
.brew-gate h1{margin:0;font:400 44px/1 Bangers,Impact,system-ui,sans-serif;letter-spacing:.05em;color:#FFD23F}
.brew-gate p{margin:0;color:rgba(255,248,236,.8)}
.brew-gate a{display:inline-flex;align-items:center;min-height:48px;padding:8px 20px;border-radius:15px;background:#FFD23F;color:#120E18;
  border:3px solid #120E18;box-shadow:4px 5px 0 #05030A;font-weight:800;text-decoration:none}`;
  document.head.appendChild(css);

  const let_in = () => html.classList.remove('brewing');
  const keep_out = () => {
    const show = () => {
      const g = document.createElement('div');
      g.className = 'brew-gate';
      g.setAttribute('role', 'alert');
      g.innerHTML = '<div><img src="/lab/capra-lab-mark.png" alt=""><h1>STILL BREWING</h1>'
        + '<p>This game is still being tested in Capra’s Lab. It opens to everyone soon.</p>'
        + '<a href="/">Back to Capra Lab</a></div>';
      document.body.appendChild(g);
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  };

  let p = null;
  try { p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); } catch (e) { /* private mode */ }
  if (!p || !p.name || !p.code) { keep_out(); return; }
  let ok = null;
  try { ok = sessionStorage.getItem('capra-lab.brew-ok'); } catch (e) { /* private mode */ }
  if (ok && ok === p.handle) { let_in(); return; }
  fetch('/api/profile/capras-lab', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: p.name, code: p.code }) })
    .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
    .then(({ ok: fine, j }) => {
      if (fine && j.role) {
        try { sessionStorage.setItem('capra-lab.brew-ok', p.handle); } catch (e) { /* fine */ }
        let_in();
      } else keep_out();
    })
    .catch(keep_out);
})();
