/* The hub's wallet panel (JC, Nov 12 2026: "diamonds amber and shards in Capra Lab... this opens a way to
 * accessorize and individualize their avatar"): the three balances, today's earnings, Glacial Maw's link
 * and how every game pays (public/lab/wallet-catalog.mjs). Nothing to buy yet: the avatar shop is next. */
import { COINS, ORDER, EARN, FEATS, DAY_CAP, short, words } from './wallet-catalog.mjs';
import { coin } from './wallet.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const me = () => { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? p : null; } catch { return null; } };

function howToEarn() {
  const rows = [];
  for (const g of Object.values(EARN)) {
    const parts = [];
    for (const [ev, r] of Object.entries(g)) if (ev !== 'name') parts.push(`${words(r)} for ${esc(r.why)}`);
    rows.push(`<li><b>${esc(g.name)}</b><span>${parts.join(' · ')}</span></li>`);
  }
  for (const f of FEATS) rows.push(`<li><b>${esc(f.game)}</b><span>${esc(f.what)}${Object.keys(f.pay).length ? `: ${words(f.pay)}` : ''}</span></li>`);
  return `<details class="wl-how"><summary>How to earn</summary><ul>${rows.join('')}</ul>
    <p>Amber for finishing a game, shards for wins and bests, diamonds for the rare stuff. A game pays at most ${DAY_CAP.amber} amber and ${DAY_CAP.shards} shards a day; the feats each game checks itself have no cap.</p></details>`;
}

function paint(w) {
  const box = $('walletPanel');
  if (!box) return;
  const p = me();
  if (!p) {
    $('wlBody').innerHTML = `<div class="wl-coins">${ORDER.map((k) => `<div class="wl-coin">${coin(k, 22)}<b>–</b><small>${COINS[k].short}</small></div>`).join('')}</div>
      <p class="wl-line"><button class="cd-btn" type="button" id="wlJoin">Make a profile to keep a wallet</button></p>${howToEarn()}`;
    const j = $('wlJoin'); if (j) j.onclick = () => { const b = $('whoBtn'); if (b) b.click(); };
    return;
  }
  if (!w) { $('wlBody').innerHTML = '<p class="wl-line">Counting…</p>'; return; }
  const today = {};
  for (const g of Object.values(w.today || {})) for (const k of ORDER) today[k] = (today[k] || 0) + (g[k] || 0);
  const todayLine = ORDER.some((k) => today[k] > 0) ? `Today: ${words(today)}.` : 'Nothing earned yet today: finish a game.';
  const gm = w.gm && w.gm.linked
    ? 'Glacial Maw is linked: your hunter’s amber, Rift Shards and diamond gems are this wallet.'
    : 'Hunting in Glacial Maw? Open it from the lab and link your hunter (its menu, Capra Lab wallet).';
  $('wlBody').innerHTML = `<div class="wl-coins">${ORDER.map((k) => `<div class="wl-coin">${coin(k, 22)}<b>${short(w[k])}</b><small>${COINS[k].short}</small></div>`).join('')}</div>
    <p class="wl-line">${esc(todayLine)} Avatars to spend them on are next.</p>
    <p class="wl-line wl-gm"><a href="/glacial-maw/">${esc(gm)}</a></p>${howToEarn()}`;
}

async function refresh() {
  const p = me();
  paint(null);
  if (!p) return;
  try {
    const r = await fetch('/api/wallet/me', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: p.name, code: p.code }) });
    paint(r.ok ? await r.json() : null);
  } catch { paint(null); }
}
window.addEventListener('capra-lab:profile', refresh);
window.addEventListener('capra-wallet:changed', (e) => { if (e.detail && typeof e.detail.amber === 'number') paint(e.detail); });
refresh();
