/* The lab wallet on a game's page (JC, Nov 12 2026: diamonds, amber and shards for the whole lab).
 *
 *   <script src="/lab/wallet.js" type="module"></script>
 *   CapraWallet.earn('swerve-planet', 'run', runId)   when a game ends: the server pays what the game
 *                                                     earns (public/lab/wallet-catalog.mjs EARN), once
 *                                                     per ref, capped a game a day; a toast says "+20 amber"
 *   CapraWallet.paid({ amber: 30 })                   a game's own server already paid: just the toast
 *   CapraWallet.me()                                  the balances (null for a guest)
 * Every change fires `capra-wallet:changed` on window, so the Capra Lab button counts again.
 * Guests earn nothing and see nothing. Errors stay quiet: a game never waits on the wallet. */
import { COINS, ORDER, words } from './wallet-catalog.mjs';

const ME_KEY = 'capra-lab.profile';
const me = () => { try { const p = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); return p && p.name && p.code ? p : null; } catch { return null; } };

async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let out = {};
  try { out = await res.json(); } catch { /* not json */ }
  if (!res.ok) { const e = new Error(out.error || 'The wallet didn’t answer.'); e.status = res.status; throw e; }
  return out;
}

// One little gem, drawn like Glacial Maw's.
export function coin(k, px = 12) {
  const c = COINS[k];
  return c ? `<i aria-hidden="true" style="display:inline-block;flex:none;width:${px}px;height:${Math.round(px * 1.1)}px;vertical-align:-1px;${c.css}"></i>` : '';
}

let toastEl = null, toastT = 0;
function toast(pay, note = '') {
  const keys = ORDER.filter((k) => pay && pay[k] > 0);
  if (!keys.length) return;
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.setAttribute('role', 'status');
    toastEl.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top, 0px) + 62px);z-index:2147483000;transform:translate(-50%,-12px);opacity:0;'
      + 'display:flex;align-items:center;gap:8px;max-width:calc(100vw - 32px);padding:9px 14px;border-radius:999px;border:3px solid #120E18;box-shadow:3px 4px 0 #05030A;'
      + 'background:#FFF8EC;color:#120E18;font:800 15px/1.15 Inter,system-ui,-apple-system,sans-serif;pointer-events:none;transition:opacity .2s,transform .25s cubic-bezier(.3,1.5,.5,1)';
    document.body.appendChild(toastEl);
  }
  toastEl.innerHTML = keys.map((k) => `<span style="display:inline-flex;align-items:center;gap:5px">${coin(k, 14)}+${pay[k]} ${pay[k] === 1 ? COINS[k].one : COINS[k].many}</span>`).join('')
    + (note ? `<small style="font-weight:600;opacity:.7">${note}</small>` : '');
  toastEl.setAttribute('aria-label', words(pay));
  requestAnimationFrame(() => { toastEl.style.opacity = '1'; toastEl.style.transform = 'translate(-50%,0)'; });
  clearTimeout(toastT);
  toastT = setTimeout(() => { toastEl.style.opacity = '0'; toastEl.style.transform = 'translate(-50%,-12px)'; }, 2800);
}

function changed(w) {
  try { if (w) sessionStorage.setItem('capra-lab.wallet', JSON.stringify({ at: Date.now(), who: (me() || {}).handle, w: { diamonds: w.diamonds, amber: w.amber, shards: w.shards } })); }
  catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent('capra-wallet:changed', { detail: w || null }));
}

export async function earn(game, event, ref = '') {
  const p = me();
  if (!p) return null;
  try {
    const r = await post('/api/wallet/earn', { name: p.name, code: p.code, game, event, ref: String(ref || '') });
    if (r.paid && Object.keys(r.paid).length) toast(r.paid);
    changed(r);
    return r;
  } catch { return null; }
}
export function paid(pay, note = '') {
  if (!me() || !pay) return;
  toast(pay, note);
  changed(null);
}
export async function wallet() {
  const p = me();
  if (!p) return null;
  try { const r = await post('/api/wallet/me', { name: p.name, code: p.code }); changed(r); return r; } catch { return null; }
}

window.CapraWallet = { earn, paid, me: wallet, coin };
