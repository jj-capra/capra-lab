/* A game's way to play a card from the lab's daily Card Draw (JC, Nov 11–12 2026).
 *
 *   <script src="/lab/card-offer.js" type="module"></script>
 *   <lab-card-offer k="sp-life"></lab-card-offer>
 *
 * It shows the player's cards of that kind ("❤️ Extra Life ×2") as a switch: tap it and the card
 * is armed for the next run or game. Nothing is spent until the game says so:
 *   el.armed            true when the player wants one in the next run
 *   await el.spend()    for cards the page plays itself (`self` in the catalog): spends one through
 *                       /api/cards/use and resolves true, or false if it didn't go through
 *   el.disarm()         after the game's server took the card (then CapraCards.changed() counts again)
 *   el.refresh()        count again (every offer on the page refreshes when any of them spends)
 * Hidden for guests and for players with none of that card, unless `show-empty` is set (then it
 * says where cards come from). Fires `change` when armed or disarmed. */
import { KINDS } from './cards-catalog.mjs';

const ME_KEY = 'capra-lab.profile';
const me = () => { try { const p = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); return p && p.name && p.code ? p : null; } catch { return null; } };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let handP = null;   // one /api/cards/me per page load, shared by every offer
async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let out = {};
  try { out = await res.json(); } catch { /* not json */ }
  if (!res.ok) { const e = new Error(out.error || 'That card didn’t go through.'); e.status = res.status; throw e; }
  return out;
}
export function myHand(force = false) {
  const p = me();
  if (!p) return Promise.resolve(null);
  if (!handP || force) handP = post('/api/cards/me', { name: p.name, code: p.code }).catch(() => null);
  return handP;
}
export async function useCard(k) {
  const p = me();
  if (!p) return null;
  const out = await post('/api/cards/use', { name: p.name, code: p.code, k });
  handP = Promise.resolve(out);
  window.dispatchEvent(new Event('capra-cards:changed'));
  return out;
}

// A game's server spent a card (Screensaver, No Cap, Mind Heist): count again everywhere.
export function cardsChanged() {
  handP = null;
  window.dispatchEvent(new Event('capra-cards:changed'));
}
window.addEventListener('capra-lab:profile', () => { handP = null; });

const CSS = `
  :host { display: block; }
  :host([hidden]) { display: none; }
  button { width: 100%; display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 8px 12px; border-radius: 14px; cursor: pointer; text-align: left;
    border: 3px solid #120E18; box-shadow: 3px 4px 0 #05030A; background: #FFF8EC; color: #120E18; font: 700 14px/1.2 Inter, system-ui, -apple-system, sans-serif; -webkit-tap-highlight-color: transparent; }
  button:active { transform: translate(2px, 3px); box-shadow: 1px 1px 0 #05030A; }
  button:focus-visible { outline: 3px solid #29D3F0; outline-offset: 2px; }
  button[aria-pressed="true"] { background: #FFD23F; }
  i { font-style: normal; font-size: 24px; line-height: 1; flex: none; }
  .t { flex: 1; min-width: 0; display: grid; gap: 2px; }
  b { font-weight: 800; font-size: 15px; }
  small { font-weight: 600; font-size: 12px; opacity: 0.75; }
  .sw { flex: none; display: inline-flex; align-items: center; justify-content: center; min-width: 64px; height: 30px; padding: 0 10px; border-radius: 999px; border: 2px solid #120E18;
    background: #120E18; color: #FFF8EC; font: 800 12px/1 Inter, system-ui, sans-serif; letter-spacing: 0.04em; }
  button[aria-pressed="true"] .sw { background: #2E9E5B; }
  .none { display: flex; align-items: center; gap: 10px; padding: 8px 2px; font: 600 13px/1.35 Inter, system-ui, sans-serif; color: inherit; opacity: 0.8; }
  .none a { color: inherit; font-weight: 800; }`;

class LabCardOffer extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this.armed = false; this.count = 0; this._busy = false; }
  connectedCallback() {
    this.hidden = true;
    this._onChange = () => this.refresh(false);
    window.addEventListener('capra-cards:changed', this._onChange);
    window.addEventListener('capra-lab:profile', this._onChange);
    this.refresh(false);
  }
  disconnectedCallback() {
    window.removeEventListener('capra-cards:changed', this._onChange);
    window.removeEventListener('capra-lab:profile', this._onChange);
  }
  get kind() { return KINDS[this.getAttribute('k')] || null; }
  async refresh(force = true) {
    const k = this.getAttribute('k'), hand = await myHand(force);
    this.count = (hand && hand.hand && hand.hand[k]) || 0;
    if (this.count <= 0 && this.armed) { this.armed = false; this.dispatchEvent(new Event('change')); }
    this.render(!!hand);
  }
  render(signedIn) {
    const c = this.kind;
    if (!c) { this.hidden = true; return; }
    if (this.count <= 0) {
      this.hidden = !this.hasAttribute('show-empty') || !signedIn;
      this.shadowRoot.innerHTML = `<style>${CSS}</style><p class="none"><i aria-hidden="true">${c.icon}</i><span>No ${esc(c.name)} cards. Win them in the <a href="/">daily Card Draw</a>.</span></p>`;
      return;
    }
    this.hidden = false;
    this.shadowRoot.innerHTML = `<style>${CSS}</style><button type="button" aria-pressed="${this.armed}">
      <i aria-hidden="true">${c.icon}</i><span class="t"><b>${esc(c.name)} ×${this.count}</b><small>${esc(this.armed ? 'On for your next ' + (this.getAttribute('for') || 'run') + '. Tap to keep it.' : c.how)}</small></span>
      <span class="sw">${this.armed ? 'ON' : 'USE IT'}</span></button>`;
    this.shadowRoot.querySelector('button').onclick = () => { this.armed = !this.armed; this.render(true); this.dispatchEvent(new Event('change')); };
  }
  disarm() { if (this.armed) { this.armed = false; this.render(true); this.dispatchEvent(new Event('change')); } }
  async spend() {
    if (!this.armed || this._busy) return false;
    this._busy = true;
    try { await useCard(this.getAttribute('k')); this.armed = false; return true; }
    catch { this.armed = false; this.refresh(true); return false; }
    finally { this._busy = false; }
  }
}
if (!customElements.get('lab-card-offer')) customElements.define('lab-card-offer', LabCardOffer);
window.CapraCards = { myHand, useCard, changed: cardsChanged };
