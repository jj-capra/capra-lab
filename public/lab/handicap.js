/* <lab-handicap>: the golf handicap on a player's Capra Lab profile (JC, Nov 13 2026: "Have a handicap
   for players to select in their profile"). Strokes off the score: a 6 takes 6 off an 18-hole round
   and 3 off an 8-hole Masters, and on Masters the net score decides, so it changes at most once a week
   (lab/profiles.js keeps it and the lock; public/lab/handicap-rules.mjs has the numbers).

   On the hub's profile screen, Par-Tee Time's "Who's playing" and its Masters cabinet:
     <script type="module" src="/lab/handicap.js"></script>
     <lab-handicap></lab-handicap>            (compact: a smaller card)
   It reads the handicap from the profile, saves a change with the player's key, keeps a copy in
   localStorage['capra-lab.hcp'] = { handle, hcp, hcpAt } and fires `capra-lab:handicap` on window
   with that object, so a game can use the new number straight away. Guests get a link to sign in. */
import { HCP_MAX, HCP_LOCK_MS, cleanHcp, strokesFor, hcpLabel, hcpNext } from './handicap-rules.mjs';

const KEY = 'capra-lab.hcp';
const me = () => { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? p : null; } catch { return null; } };
const cached = (handle) => { try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); return c && c.handle === handle ? c : null; } catch { return null; } };
const keep = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode */ } };
const day = (ms) => new Date(ms).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

const CSS = `
  :host { display: block; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color: #120E18; }
  .c { padding: 12px 14px; border-radius: 16px; background: #FFF8EC; border: 3px solid #120E18; box-shadow: 3px 4px 0 #05030A; text-align: left; }
  :host([compact]) .c { padding: 10px 12px; border-width: 2.5px; border-radius: 12px; box-shadow: 2px 3px 0 #05030A; }
  .top { display: flex; align-items: center; gap: 10px; }
  .k { flex: 1; min-width: 0; font-size: 11px; font-weight: 800; letter-spacing: .14em; }
  .step { display: flex; align-items: center; gap: 6px; }
  .step button { width: 40px; height: 40px; padding: 0; border-radius: 50%; border: 2.5px solid #120E18; background: #fff; font: 800 20px/1 Inter, system-ui, sans-serif; color: #120E18; cursor: pointer; }
  .step button:disabled { opacity: .35; cursor: default; }
  .v { min-width: 74px; text-align: center; font-family: Bangers, Impact, "Arial Narrow Bold", system-ui, sans-serif; font-size: 30px; letter-spacing: .04em; line-height: 1; }
  .v.word { font-size: 24px; }
  p { margin: 8px 0 0; font-size: 13px; font-weight: 600; line-height: 1.4; color: rgba(18, 14, 24, .78); }
  p.warn { color: #B4232A; }
  p.good { color: #1D7A3E; }
  .save { display: block; width: 100%; margin-top: 10px; min-height: 46px; border-radius: 12px; border: 3px solid #120E18; background: #FFD23F; box-shadow: 3px 4px 0 #05030A; font: 800 15px/1.2 Inter, system-ui, sans-serif; color: #120E18; cursor: pointer; }
  .save:active, .step button:active { transform: translate(1px, 2px); }
  .save:disabled { background: #E7E1D3; box-shadow: none; color: rgba(18, 14, 24, .55); }
  a { color: #5B3CC4; font-weight: 800; }
  button:focus-visible, a:focus-visible { outline: 3px solid #5B3CC4; outline-offset: 2px; }
`;

class LabHandicap extends HTMLElement {
  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.p = me();
    const c = this.p ? cached(this.p.handle) : null;
    this.saved = c ? cleanHcp(c.hcp) : 0;
    this.at = c ? c.hcpAt || 0 : 0;
    this.v = this.saved;
    this.msg = ''; this.kind = '';
    this.loaded = !!c;
    this.render();
    if (this.p) this.load();
    this.onOther = (e) => { const d = e.detail; if (d && this.p && d.handle === this.p.handle && d.hcp !== this.saved) { this.saved = this.v = d.hcp; this.at = d.hcpAt; this.render(); } };
    window.addEventListener('capra-lab:handicap', this.onOther);
  }
  disconnectedCallback() { window.removeEventListener('capra-lab:handicap', this.onOther); }
  async load() {
    try {
      const r = await fetch('/api/profile?name=' + encodeURIComponent(this.p.name), { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      const was = this.saved;
      this.saved = cleanHcp(j.hcp || 0); this.at = j.hcpAt || 0; this.loaded = true;
      if (this.v === was) this.v = this.saved;
      keep({ handle: this.p.handle, hcp: this.saved, hcpAt: this.at });
      if (was !== this.saved) window.dispatchEvent(new CustomEvent('capra-lab:handicap', { detail: { handle: this.p.handle, hcp: this.saved, hcpAt: this.at } }));
      this.render();
    } catch { /* offline: the cached number stands */ }
  }
  async save() {
    const want = this.v;
    this.busy = true; this.msg = 'Saving…'; this.kind = ''; this.render();
    try {
      const r = await fetch('/api/profile/handicap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: this.p.name, code: this.p.code, hcp: want }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'That didn’t save. Try again in a moment.');
      this.saved = this.v = cleanHcp(j.hcp); this.at = j.hcpAt || Date.now();
      const d = { handle: this.p.handle, hcp: this.saved, hcpAt: this.at };
      keep(d);
      window.dispatchEvent(new CustomEvent('capra-lab:handicap', { detail: d }));
      this.msg = `Saved. Your handicap is ${hcpLabel(this.saved)} until ${day(hcpNext(this.at))} at least.`; this.kind = 'good';
    } catch (e) { this.msg = e.message; this.kind = 'warn'; this.v = this.saved; }
    this.busy = false; this.render();
  }
  render() {
    const R = this.shadowRoot;
    if (!this.p) {
      R.innerHTML = `<style>${CSS}</style><div class="c"><div class="top"><span class="k">⛳ GOLF HANDICAP</span></div>
        <p><a href="/#profile">Make your Capra Lab profile</a> to play off a handicap.</p></div>`;
      return;
    }
    const next = hcpNext(this.at), locked = !!next && Date.now() < next, v = this.v, changed = v !== this.saved;
    const help = v === 0 ? 'Scratch: no strokes off. Pick a number if you want strokes off your score.'
      : `A ${v} takes ${strokesFor(v, 18)} stroke${strokesFor(v, 18) === 1 ? '' : 's'} off an 18-hole round and ${strokesFor(v, 8)} off an 8-hole Masters, where the net score takes the course best.`;
    R.innerHTML = `<style>${CSS}</style><div class="c" role="group" aria-label="Golf handicap">
      <div class="top"><span class="k">⛳ GOLF HANDICAP</span>
        <div class="step"><button type="button" class="dn" aria-label="Lower">−</button><span class="v${v === 0 ? ' word' : ''}" aria-live="polite">${hcpLabel(v)}</span><button type="button" class="up" aria-label="Higher">+</button></div></div>
      <p>${help}</p>
      ${locked && !changed && !this.msg ? `<p>You can change it again ${day(next)}.</p>` : ''}
      ${changed ? `<button type="button" class="save">${this.at ? 'Save · then it holds 7 days' : 'Save my handicap'}</button>` : ''}
      ${this.msg ? `<p class="${this.kind}" role="status">${this.msg}</p>` : ''}
    </div>`;
    const dn = R.querySelector('.dn'), up = R.querySelector('.up'), sv = R.querySelector('.save');
    dn.disabled = locked || this.busy || v <= 0;
    up.disabled = locked || this.busy || v >= HCP_MAX;
    dn.onclick = () => { this.v = Math.max(0, this.v - 1); this.msg = ''; this.render(); };
    up.onclick = () => { this.v = Math.min(HCP_MAX, this.v + 1); this.msg = ''; this.render(); };
    if (sv) { sv.disabled = !!this.busy; sv.onclick = () => this.save(); }
  }
}
if (!customElements.get('lab-handicap')) customElements.define('lab-handicap', LabHandicap);
export { HCP_LOCK_MS };
