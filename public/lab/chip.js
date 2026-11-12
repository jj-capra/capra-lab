/* The Capra Lab button (JC, Nov 2026: "Every game including Mind Heist needs a way back to Capra
   Lab... a button to the left of their name. It is just the logo for Capra Lab and it is located
   in the same place no matter what game's main menu they are in").

   <capra-lab-chip></capra-lab-chip>          the logo (back to the hub) and the player's lab name
   <capra-lab-chip noname></capra-lab-chip>   the logo only, for a game that shows the name itself
                                              right after it (Mind Heist's profile chip)

   Every game puts it first in its main menu's top row, so the logo sits in one spot everywhere:
   16px in from the left edge and 10px below the iPhone's clock (plus the safe areas). A guest sees
   "Sign in", which opens the lab's key-card walkthrough. Load it with
   <script src="/lab/chip.js" defer></script> (Glacial Maw loads it only when it runs inside the lab).

   The wallet (JC, Nov 12 2026: diamonds, amber and shards for the whole lab, shown "on the hub and in
   each game"): under a signed-in player's name, their three balances, from /api/wallet/me (kept a
   minute in sessionStorage so moving between games doesn't ask again; `capra-wallet:changed`, fired by
   /lab/wallet.js when a game pays, updates it). */
(() => {
  if (!window.customElements || customElements.get('capra-lab-chip')) return;

  const CSS = `
    :host { display: inline-flex; align-items: center; gap: 8px; flex: none; min-width: 0; max-width: 100%;
      height: 44px; vertical-align: middle; -webkit-tap-highlight-color: transparent; }
    :host([hidden]) { display: none; }
    a { -webkit-touch-callout: none; touch-action: manipulation; }
    .home { flex: none; width: 44px; height: 44px; border-radius: 50%; overflow: hidden; display: block;
      background: #16141F; border: 2px solid #FFF8EC; box-shadow: 2px 3px 0 #05030A; box-sizing: border-box; }
    .home img { display: block; width: 100%; height: 100%; transform: scale(1.12); }
    .home:active { transform: translate(2px, 3px); box-shadow: 0 0 0 #05030A; }
    .name { box-sizing: border-box; display: inline-block; min-width: 0; max-width: min(44vw, 220px); height: 34px;
      padding: 0 13px; border-radius: 999px; background: rgba(22, 20, 31, 0.84); border: 2px solid rgba(255, 248, 236, 0.3);
      color: #FFF8EC; font: 800 14px/30px Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      letter-spacing: 0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: none; }
    a.name { color: #FFD23F; }
    .name.long { padding: 0 10px; font-size: 11.5px; letter-spacing: 0; }
    @media (min-width: 360px) { .name.long { max-width: min(52vw, 240px); } }   /* all 17 characters of a long name fit (JC: names show in full) */
    .name.w { display: inline-flex; flex-direction: column; justify-content: center; height: 40px; padding: 0 12px; border-radius: 14px; }
    .name.w b { font: 800 13px/15px Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow: hidden; text-overflow: ellipsis; }
    .name.w.long b { font-size: 11.5px; letter-spacing: 0; }
    .wal { display: flex; align-items: center; gap: 4px; font: 700 11px/14px Inter, system-ui, -apple-system, sans-serif; color: rgba(255, 248, 236, 0.86); font-variant-numeric: tabular-nums; }
    .wal i { display: inline-block; flex: none; width: 9px; height: 10px; }
    .wal i + span { margin-right: 4px; }
    .wal .d { background: linear-gradient(160deg, #ffffff, #dccfff 45%, #8a6cff); clip-path: polygon(22% 0, 78% 0, 100% 34%, 50% 100%, 0 34%); }
    .wal .a { background: #F2B33D; clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); }
    .wal .s { background: linear-gradient(160deg, #eef8ff, #7fd4ff 55%, #3a7aa8); clip-path: polygon(50% 0, 100% 36%, 72% 100%, 28% 100%, 0 36%); }
    .home:focus-visible, .name:focus-visible { outline: 3px solid #FFD23F; outline-offset: 2px; }`;

  const player = () => {
    try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? p : null; }
    catch (e) { return null; }
  };
  const WKEY = 'capra-lab.wallet', WAGE = 60000;
  const cached = (p) => {
    try { const c = JSON.parse(sessionStorage.getItem(WKEY) || 'null'); return c && c.w && c.who === p.handle && Date.now() - c.at < WAGE ? c.w : null; }
    catch (e) { return null; }
  };
  let asking = null;
  function fetchWallet(p) {
    if (asking) return asking;
    asking = fetch('/api/wallet/me', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: p.name, code: p.code }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((w) => {
        if (!w) return null;
        const v = { diamonds: w.diamonds || 0, amber: w.amber || 0, shards: w.shards || 0 };
        try { sessionStorage.setItem(WKEY, JSON.stringify({ at: Date.now(), who: p.handle, w: v })); } catch (e) {}
        return v;
      })
      .catch(() => null)
      .finally(() => { setTimeout(() => { asking = null; }, 0); });
    return asking;
  }
  const short = (n) => { n = Math.max(0, Math.floor(Number(n) || 0)); return n < 10000 ? n.toLocaleString('en-US') : n < 1e6 ? (Math.floor(n / 100) / 10).toString().replace(/\.0$/, '') + 'k' : (Math.floor(n / 1e5) / 10).toString().replace(/\.0$/, '') + 'M'; };

  class CapraLabChip extends HTMLElement {
    static get observedAttributes() { return ['noname']; }
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.onStorage = (e) => { if (!e.key || e.key === 'capra-lab.profile') { this.w = null; this.render(); this.loadWallet(); } };
      this.onWallet = (e) => {
        const d = e && e.detail;
        if (d && typeof d.amber === 'number') { this.w = { diamonds: d.diamonds || 0, amber: d.amber || 0, shards: d.shards || 0 }; this.render(); }
        else this.loadWallet(true);
      };
      this.w = null;
    }
    connectedCallback() {
      this.render(); this.loadWallet();
      window.addEventListener('storage', this.onStorage);
      window.addEventListener('capra-wallet:changed', this.onWallet);
    }
    disconnectedCallback() { window.removeEventListener('storage', this.onStorage); window.removeEventListener('capra-wallet:changed', this.onWallet); }
    async loadWallet(fresh) {
      const p = player();
      if (!p || this.hasAttribute('noname')) return;
      const c = fresh ? null : cached(p);
      if (c) { this.w = c; this.render(); return; }
      const w = await fetchWallet(p);
      if (w && player() && player().handle === p.handle) { this.w = w; this.render(); }
    }
    attributeChangedCallback() { if (this.shadowRoot.childNodes.length) this.render(); }
    render() {
      const p = player();
      const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const name = this.hasAttribute('noname') ? ''
        : p && this.w ? `<span class="name w${p.name.length > 12 ? ' long' : ''}" part="name" aria-label="${esc(p.name)}: ${this.w.diamonds} diamonds, ${this.w.amber} amber, ${this.w.shards} shards"><b>${esc(p.name)}</b>`
            + `<span class="wal" aria-hidden="true"><i class="d"></i><span>${short(this.w.diamonds)}</span><i class="a"></i><span>${short(this.w.amber)}</span><i class="s"></i><span>${short(this.w.shards)}</span></span></span>`
        : p ? `<span class="name${p.name.length > 12 ? ' long' : ''}" part="name">${esc(p.name)}</span>`
          : '<a class="name" part="name" href="/#profile">Sign in</a>';
      this.shadowRoot.innerHTML = `<style>${CSS}</style>`
        + `<a class="home" part="home" href="/" aria-label="Back to Capra Lab" title="Capra Lab"><img src="/lab/capra-lab-mark.png" alt="" width="44" height="44"></a>${name}`;
      this.fit();
    }
    // Every name shows all 17 characters (JC): the type shrinks until the name fits the pill.
    fit() {
      const el = this.shadowRoot.querySelector('.name.w b') || this.shadowRoot.querySelector('span.name');
      if (!el) return;
      requestAnimationFrame(() => {
        let px = parseFloat(getComputedStyle(el).fontSize) || 13;
        for (let i = 0; i < 12 && el.scrollWidth > el.clientWidth + 1 && px > 9; i++) { px -= 0.5; el.style.fontSize = px + 'px'; }
      });
    }
  }
  customElements.define('capra-lab-chip', CapraLabChip);
})();
