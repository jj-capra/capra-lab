// The Avatar Studio (JC, Nov 13 2026): a comic person or animal; the basics are free, the shop's
// hats, glasses, outfits, face paint, gadgets, backdrops and effects cost amber (common), shards
// (rare) or diamonds (legendary). Anything can be tried on; buying takes the coins and puts the item on
// the shelf in one step (POST /api/wallet/buy), and the look saves itself (POST /api/wallet/dress).
import { drawAvatar, lookFor } from '/lab/avatar.mjs';
import { SPECIES, SKINS, FURS, HAIRS, HAIR_COLORS, EYES, BROWS, MOUTHS, CHEEKS, SHIRTS, BGS, SLOTS, ITEMS, ITEM, RARITY, clean, randomLook } from '/lab/avatar-catalog.mjs';
import { COINS, ORDER } from '/lab/wallet-catalog.mjs';
import { coin } from '/lab/wallet.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const me = (() => { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? p : null; } catch { return null; } })();

let wallet = { diamonds: 0, amber: 0, shards: 0, items: [], look: null };
let look = lookFor(me ? me.handle : 'guest', null);
let saved = null;          // the last look the server has
let trying = null;         // { slot, id, was } an item on but not bought
let tab = 'you';

/* ---------- talking to the wallet ---------- */
async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: me.name, code: me.code, ...body }) });
  let out = {};
  try { out = await res.json(); } catch { /* not json */ }
  if (!res.ok) { const e = new Error(out.error || 'The lab didn’t answer. Try again in a moment.'); e.code = out.code; throw e; }
  return out;
}
// Tell the Capra Lab button (and anything else listening) about new balances and the new look.
function share(w) {
  try { sessionStorage.setItem('capra-lab.wallet', JSON.stringify({ at: Date.now(), who: me.handle, w: { diamonds: w.diamonds, amber: w.amber, shards: w.shards, look: w.look } })); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent('capra-wallet:changed', { detail: { diamonds: w.diamonds, amber: w.amber, shards: w.shards, look: w.look } }));
}
const owns = (id) => !id || wallet.items.includes(id);

/* ---------- the stage ---------- */
function paintStage(pop = false) {
  $('frame').innerHTML = drawAvatar(look, { title: me ? `${me.name}'s avatar` : 'Your avatar' });
  if (pop) { $('frame').classList.remove('pop'); void $('frame').offsetWidth; $('frame').classList.add('pop'); }
  fitName(me ? me.name : 'GUEST');
  $('coins').innerHTML = me ? ORDER.map((k) => `<span title="${COINS[k].many}">${coin(k, 15)}${(wallet[k] || 0).toLocaleString('en-US')}</span>`).join('') : '';
}
// All 17 characters on one line (JC: names show in full): the type shrinks until the name fits.
function fitName(name) {
  const el = $('who');
  if (el.textContent !== name) el.textContent = name;
  el.style.fontSize = '';
  let px = parseFloat(getComputedStyle(el).fontSize) || 30;
  for (let i = 0; i < 40 && el.scrollWidth > el.clientWidth + 1 && px > 12; i++) { px -= 1; el.style.fontSize = px + 'px'; }
}
addEventListener('resize', () => fitName(me ? me.name : 'GUEST'));
document.fonts && document.fonts.ready.then(() => fitName(me ? me.name : 'GUEST'));
function say(text, kind = '') { $('status').textContent = text; $('status').className = 'status' + (kind ? ' ' + kind : ''); }

/* ---------- tabs ---------- */
function tabs() {
  const free = [{ id: 'you', name: 'You' }, { id: 'face', name: 'Face' }, ...(look.base === 'person' ? [{ id: 'hair', name: 'Hair' }] : []), { id: 'colors', name: 'Colors' }];
  if (tab === 'hair' && look.base !== 'person') tab = 'you';
  const b = (t, shop) => `<button type="button" role="tab" class="${shop ? 'shop' : ''}" aria-selected="${t.id === tab}" data-tab="${t.id}">${shop ? '🛍️ ' : ''}${esc(t.name)}</button>`;
  $('tabs').innerHTML = free.map((t) => b(t, false)).join('') + '<span class="gap" aria-hidden="true"></span>' + SLOTS.map((t) => b(t, true)).join('');
  for (const el of $('tabs').querySelectorAll('[data-tab]')) el.onclick = () => { tab = el.dataset.tab; paint(); scrollTo({ top: 0, behavior: 'smooth' }); };
}

/* ---------- the options ---------- */
const mini = (l, tight) => drawAvatar(l, { tight });
function optTile(label, l, pressed, attrs, extra = '', tight = false) {
  return `<button type="button" class="opt" aria-pressed="${pressed}" ${attrs}>${extra}<span class="pic">${mini(l, tight)}</span><b>${esc(label)}</b></button>`;
}
const swatch = (color, pressed, attrs, label) => `<button type="button" class="sw" style="background:${color}" aria-pressed="${pressed}" aria-label="${esc(label)}" ${attrs}></button>`;
const group = (title, body, cls = 'grid') => `<section class="group"><h3>${esc(title)}</h3><div class="${cls}">${body}</div></section>`;
const NAMES = {
  hair: { short: 'Short', curly: 'Curly', afro: 'Afro', long: 'Long', pony: 'Ponytail', buzz: 'Buzz', spiky: 'Spiky', bun: 'Bun', braids: 'Braids', mohawk: 'Mohawk', bald: 'Bald' },
  eyes: { round: 'Bright', happy: 'Happy', wide: 'Wide', sleepy: 'Sleepy', wink: 'Wink', lashes: 'Lashes' },
  brows: { soft: 'Soft', bold: 'Bold', raised: 'Raised', fierce: 'Fierce', none: 'None' },
  mouth: { smile: 'Smile', grin: 'Grin', open: 'Laugh', smirk: 'Smirk', tongue: 'Silly', o: 'Whoa' },
  cheeks: { none: 'None', blush: 'Blush', freckles: 'Freckles' },
};

function paintBody() {
  let html = '';
  if (tab === 'you') {
    html += group('PICK ONE', optTile('Person', { ...look, base: 'person' }, look.base === 'person', 'data-set="base" data-v="person"')
      + optTile('Animal', { ...look, base: 'animal' }, look.base === 'animal', 'data-set="base" data-v="animal"'));
    if (look.base === 'person') {
      html += group('SKIN TONE', SKINS.map((c, i) => swatch(c, look.skin === i, `data-set="skin" data-v="${i}"`, `Skin tone ${i + 1}`)).join(''), 'swatches');
    } else {
      html += group('ANIMAL', SPECIES.map((s) => optTile(s.name, { ...look, species: s.id, fur: look.species === s.id ? look.fur : s.fur }, look.species === s.id, `data-set="species" data-v="${s.id}"`)).join(''));
      html += group('FUR', FURS.map((c, i) => swatch(c, look.fur === i, `data-set="fur" data-v="${i}"`, `Fur color ${i + 1}`)).join(''), 'swatches');
    }
  } else if (tab === 'face') {
    html += group('EYES', EYES.map((v) => optTile(NAMES.eyes[v], { ...look, eyes: v }, look.eyes === v, `data-set="eyes" data-v="${v}"`, '', true)).join(''));
    html += group('BROWS', BROWS.map((v) => optTile(NAMES.brows[v], { ...look, brows: v }, look.brows === v, `data-set="brows" data-v="${v}"`, '', true)).join(''));
    if (!(look.base === 'animal' && look.species === 'owl')) html += group('MOUTH', MOUTHS.map((v) => optTile(NAMES.mouth[v], { ...look, mouth: v }, look.mouth === v, `data-set="mouth" data-v="${v}"`, '', true)).join(''));
    html += group('CHEEKS', CHEEKS.map((v) => optTile(NAMES.cheeks[v], { ...look, cheeks: v }, look.cheeks === v, `data-set="cheeks" data-v="${v}"`, '', true)).join(''));
  } else if (tab === 'hair') {
    html += group('HAIR', HAIRS.map((v) => optTile(NAMES.hair[v], { ...look, hair: v }, look.hair === v, `data-set="hair" data-v="${v}"`)).join(''));
    html += group('HAIR COLOR', HAIR_COLORS.map((c, i) => swatch(c, look.hairColor === i, `data-set="hairColor" data-v="${i}"`, `Hair color ${i + 1}`)).join(''), 'swatches');
  } else if (tab === 'colors') {
    html += group('SHIRT', SHIRTS.map((c, i) => swatch(c, look.shirt === i, `data-set="shirt" data-v="${i}"`, `Shirt color ${i + 1}`)).join(''), 'swatches');
    html += `<p class="note">The shirt color shows on the free tee and on some outfits (hoodies, sweaters, jerseys).</p>`;
    html += group('BACKGROUND', BGS.map((c, i) => swatch(c, look.bg === i, `data-set="bg" data-v="${i}"`, `Background ${i + 1}`)).join(''), 'swatches');
  } else {
    const slot = SLOTS.find((s) => s.id === tab);
    const items = ITEMS.filter((i) => i.slot === tab);
    const none = optTile('None', { ...look, [tab]: null }, !look[tab], `data-item="" data-slot="${tab}"`);
    html += group(slot.name.toUpperCase(), none + items.map((it) => {
      const own = owns(it.id);
      const k = Object.keys(it.price)[0];
      const tag = it.rarity === 'common' ? '' : `<span class="tag ${it.rarity}">${RARITY[it.rarity].toUpperCase()}</span>`;
      const price = own ? `<small class="owned">${look[tab] === it.id ? 'Wearing' : 'Owned ✓'}</small>` : `<small>${coin(k, 12)}${it.price[k]}</small>`;
      return optTile(it.name, { ...look, [tab]: it.id }, look[tab] === it.id, `data-item="${it.id}" data-slot="${tab}"`, tag)
        .replace('</b></button>', `</b>${price}</button>`);
    }).join(''));
    html += `<p class="note">${tab === 'effect' ? 'Effects are legendary: they cost diamonds, which come from rare feats (a Goat Getaway pen at par, #1 on Screensaver, a Masters trophy).' : 'Common things cost amber, rare ones shards, legendary ones diamonds. Tap anything to try it on.'}</p>`;
  }
  $('body').innerHTML = html;
  for (const el of $('body').querySelectorAll('[data-set]')) el.onclick = () => setFree(el.dataset.set, el.dataset.v);
  for (const el of $('body').querySelectorAll('[data-item]')) el.onclick = () => pickItem(el.dataset.slot, el.dataset.item || null);
}

/* ---------- changing the look ---------- */
function setFree(field, v) {
  const num = ['skin', 'fur', 'hairColor', 'shirt', 'bg'].includes(field);
  const next = { ...look, [field]: num ? Number(v) : v };
  if (field === 'species') { const s = SPECIES.find((x) => x.id === v); if (look.species !== v) next.fur = s.fur; }
  look = clean(next);
  if (trying) look[trying.slot] = trying.id;
  paint(true);
  queueSave();
}
function pickItem(slot, id) {
  // put back whatever was on before a try-on in another slot
  if (trying && trying.slot !== slot) look[trying.slot] = trying.was;
  if (id && !owns(id)) {
    const was = trying && trying.slot === slot ? trying.was : look[slot];
    trying = { slot, id, was };
  } else trying = null;
  look[slot] = id;
  paint(true);
  if (!trying) queueSave();
}

/* ---------- the buy bar ---------- */
function paintBuy() {
  const bar = $('buybar');
  if (!trying) { bar.hidden = true; return; }
  const it = ITEM[trying.id], k = Object.keys(it.price)[0], cost = it.price[k];
  bar.hidden = false;
  $('buyName').textContent = it.name;
  $('buyPrice').innerHTML = `${coin(k, 13)} ${cost} ${cost === 1 ? COINS[k].one : COINS[k].many} · ${RARITY[it.rarity]}`;
  const btn = $('buyBtn'), why = $('buyWhy');
  if (!me) { btn.disabled = true; btn.textContent = 'Buy'; why.hidden = false; why.innerHTML = 'Make your <a href="/#profile">Capra Lab profile</a> to shop.'; return; }
  const short = cost - (wallet[k] || 0);
  btn.disabled = short > 0;
  btn.textContent = short > 0 ? 'Not yet' : `Buy for ${cost}`;
  why.hidden = short <= 0;
  if (short > 0) why.innerHTML = `You need ${short} more ${short === 1 ? COINS[k].one : COINS[k].many}. ${k === 'amber' ? 'Finish games to earn amber.' : k === 'shards' ? 'Wins and personal bests earn shards.' : 'Diamonds come from rare feats.'} <a href="/#walletPanel">How to earn</a>`;
}
$('buyCancel').onclick = () => { if (!trying) return; look[trying.slot] = trying.was; trying = null; paint(true); };
$('buyBtn').onclick = async () => {
  if (!trying || !me) return;
  const it = ITEM[trying.id];
  $('buyBtn').disabled = true;
  say('Buying…');
  try {
    const w = await post('/api/wallet/buy', { item: it.id });
    wallet = { ...wallet, ...w };
    trying = null;
    say(`The ${it.name} is yours!`, 'good');
    paint(true);
    await save();
  } catch (e) {
    say(e.message, 'bad');
    paintBuy();
  }
};

/* ---------- saving (by itself, a moment after each change) ---------- */
let saveT = 0;
function queueSave() {
  if (!me) return;
  clearTimeout(saveT);
  say('Saving…');
  saveT = setTimeout(save, 700);
}
async function save() {
  if (!me) return;
  clearTimeout(saveT);
  const keep = { ...look };
  if (trying) keep[trying.slot] = trying.was;      // never save something not bought
  const want = clean(keep, wallet.items);
  if (saved && JSON.stringify(saved) === JSON.stringify(want)) { say('Saved ✓', 'good'); return; }
  try {
    const w = await post('/api/wallet/dress', { look: want });
    wallet = { ...wallet, ...w };
    saved = w.look;
    share(w);
    say('Saved ✓', 'good');
  } catch (e) { say(e.message, 'bad'); }
}

$('randomBtn').onclick = () => {
  const r = randomLook();
  for (const s of SLOTS) r[s.id] = look[s.id];
  look = r;
  if (trying) look[trying.slot] = trying.id;
  paint(true);
  queueSave();
};

function paint(pop = false) { paintStage(pop); tabs(); paintBody(); paintBuy(); }

/* ---------- start ---------- */
(async function start() {
  const want = new URLSearchParams(location.search).get('tab');
  if (want && (['you', 'face', 'hair', 'colors'].includes(want) || SLOTS.some((s) => s.id === want))) tab = want;
  $('guest').hidden = !!me;
  paint();
  if (!me) return;
  say('Opening your closet…');
  try {
    const w = await post('/api/wallet/me', {});
    wallet = { ...wallet, ...w, items: w.items || [] };
    look = lookFor(me.handle, w.look);
    saved = w.look ? clean(w.look, wallet.items) : null;
    say(w.look ? '' : 'This is your starter look. Make it yours!');
    paint();
    if (!w.look) save();        // keep the starter look so every page shows the same one
  } catch (e) { say(e.message, 'bad'); }
})();
