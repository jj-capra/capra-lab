/* The Capra Lab button (JC, Nov 2026: "Every game including Mind Heist needs a way back to Capra
   Lab... a button to the left of their name. It is just the logo for Capra Lab and it is located
   in the same place no matter what game's main menu they are in").

   <capra-lab-chip></capra-lab-chip>          the logo (back to the hub) and the player's lab name
   <capra-lab-chip noname></capra-lab-chip>   the logo only, for a game that shows the name itself
                                              right after it (Mind Heist's profile chip)

   Every game puts it first in its main menu's top row, so the logo sits in one spot everywhere:
   16px in from the left edge and 10px below the iPhone's clock (plus the safe areas). A guest sees
   "Sign in", which opens the lab's key-card walkthrough. Load it with
   <script src="/lab/chip.js" defer></script> (Glacial Maw loads it only when it runs inside the lab). */
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
    .home:focus-visible, .name:focus-visible { outline: 3px solid #FFD23F; outline-offset: 2px; }`;

  const player = () => {
    try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? p : null; }
    catch (e) { return null; }
  };

  class CapraLabChip extends HTMLElement {
    static get observedAttributes() { return ['noname']; }
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.onStorage = (e) => { if (!e.key || e.key === 'capra-lab.profile') this.render(); };
    }
    connectedCallback() { this.render(); window.addEventListener('storage', this.onStorage); }
    disconnectedCallback() { window.removeEventListener('storage', this.onStorage); }
    attributeChangedCallback() { if (this.shadowRoot.childNodes.length) this.render(); }
    render() {
      const p = player();
      const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const name = this.hasAttribute('noname') ? ''
        : p ? `<span class="name" part="name">${esc(p.name)}</span>`
          : '<a class="name" part="name" href="/#profile">Sign in</a>';
      this.shadowRoot.innerHTML = `<style>${CSS}</style>`
        + `<a class="home" part="home" href="/" aria-label="Back to Capra Lab" title="Capra Lab"><img src="/lab/capra-lab-mark.png" alt="" width="44" height="44"></a>${name}`;
    }
  }
  customElements.define('capra-lab-chip', CapraLabChip);
})();
