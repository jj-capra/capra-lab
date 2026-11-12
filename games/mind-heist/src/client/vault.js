// Diamonds, the daily card draw and power cards. Diamonds are earned in Goat Getaway, Capra
// Lab's daily sliding puzzle (it was Vault Jam, here, until Nov 7 2026).
import { useState } from 'preact/hooks';
import { html, toast, confetti, Sheet } from './ui.js';
import { th } from './themes.js';
import { api } from './api.js';
import { Sound } from './sound.js';
import { IN_LAB } from './base.js';

// Goat Getaway is another Capra Lab game, at the lab's root (not under /mind-heist/).
export const GOAT_GETAWAY = '/goat-getaway/';
const fmtDay = (ymd) => new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/* ---------- cards ---------- */
export const CARDS = {
  mole: { icon: '🕵️', name: 'Mole', how: 'Slip the other crew an anonymous tip. If they lock it in and it’s wrong, your crew takes the tile’s value.' },
  hfifty: { icon: '🙈', name: 'Hidden 50/50', how: 'Two wrong answers vanish on your crew’s phones only. The other crew and the big screen still see all four.' },
};
export function CardFace({ card, look = th() }) {
  if (!card) return null;
  if (card.k === 'dud') {
    const name = look.duds[(card.n || 0) % look.duds.length];
    return html`<div class="pcard dud"><i aria-hidden="true">🫥</i><b>${name}</b><span>Worth nothing. Better luck tomorrow.</span></div>`;
  }
  const c = CARDS[card.k];
  return html`<div class=${'pcard ' + card.k}><i aria-hidden="true">${c.icon}</i><b>${c.name}</b><span>${c.how}</span></div>`;
}
export function HandChips({ hand }) {
  if (!hand || !hand.length) return html`<span class="muted">No cards yet</span>`;
  return html`<span class="hand">${hand.map(c => html`<span class=${'hcard ' + c.k} title=${CARDS[c.k] ? CARDS[c.k].how : ''}><i aria-hidden="true">${CARDS[c.k] ? CARDS[c.k].icon : '?'}</i>${CARDS[c.k] ? CARDS[c.k].name : c.k}</span>`)}</span>`;
}

export function DrawSheet({ me, setMe, onClose }) {
  const [card, setCard] = useState(me.drew || null);
  const [flip, setFlip] = useState(!!me.drew);
  const [busy, setBusy] = useState(false);
  const full = (me.hand || []).length >= 3;
  const draw = async (gem) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api('POST', '/draw', { gem });
      Sound.fx('flip');
      setCard(r.card);
      setMe({ ...me, ...r.vault });
      setTimeout(() => {
        setFlip(true);
        if (r.card.k !== 'dud') { Sound.fx('double'); confetti(); } else Sound.fx('wrong');
      }, 60);
    } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };
  return html`<${Sheet} title="Today’s card" onClose=${onClose}>
    <div class="draw-stage">
      <div class=${'flipper' + (flip ? ' on' : '')}>
        <div class="fl-back" aria-hidden=${flip}><span>Mind <b>Heist</b></span></div>
        <div class="fl-front">${card && html`<${CardFace} card=${card} />`}</div>
      </div>
    </div>
    ${me.drew || card
      ? html`<p class="center muted">${card && card.k !== 'dud' ? 'It’s in your hand. Play it in any invite game.' : 'A new card waits after midnight.'}</p>`
      : full ? html`<p class="center">Your hand is full (3). Play a card in a game, then draw again.</p>`
      : html`<div class="stack">
          <p class="center muted">Most cards are duds. Two are prizes: the Mole and the Hidden 50/50.</p>
          <button class="btn hi big" disabled=${busy} onClick=${() => draw(false)}>Draw a card <small>1 in 4 is a prize</small></button>
          <button class="btn big" disabled=${busy || !(me.gems > 0)} onClick=${() => draw(true)}>Spend a 💎 <small>${me.gems > 0 ? `1 in 2 is a prize · you have ${me.gems}` : 'Earn diamonds in Goat Getaway'}</small></button>
        </div>`}
    <h3>Your hand</h3>
    <${HandChips} hand=${me.hand} />
    <div class="card-rules">${Object.entries(CARDS).map(([k, c]) => html`<p><b>${c.icon} ${c.name}.</b> ${c.how}</p>`)}<p class="muted">Cards work in invite games with two crews, when the host leaves Power cards on.</p></div>
  </${Sheet}>`;
}

/* ---------- home card ---------- */
// The daily draw moved to Capra Lab (JC, Nov 2026: "Let's bring Draw a Card out from Mind Heist and
// for all Capra lab games... and it is four cards"): four cards a day on the lab's home page, and the
// Moles and Hidden 50/50s from it wait in your hand here. The old DrawSheet above stays for a Mind
// Heist running on its own, outside the lab.
export const LAB_DRAW = '/';
export function VaultCard({ me, setMe }) {
  const [draw, setDraw] = useState(false);
  const trophies = (me.trophyList || []).length;
  return html`<section class="vault-card stk" aria-label="Your cards">
    <div class="vc-top">
      <div class="vc-title"><b>Your cards</b><span class="muted">${IN_LAB ? 'From Capra Lab’s daily Card Draw' : 'One draw a day · your hand holds 3'}</span></div>
      <span class="gems" title="Diamonds">💎 ${me.gems || 0}</span>
    </div>
    <p class="vc-line">${IN_LAB
      ? 'Four cards a day on Capra Lab’s home page. Moles and Hidden 50/50s you win there land in your hand here, ready for your next invite game.'
      : me.drew ? 'You drew today. A new card waits after midnight.' : 'Draw a card for your next game. Spend a 💎 and the odds double.'}</p>
    <div class="row wrap-row">
      ${IN_LAB
        ? html`<a class="btn hi glow" href=${LAB_DRAW}>Draw today’s cards</a><a class="btn" href=${GOAT_GETAWAY}>Earn 💎 in Goat Getaway</a>`
        : html`<button class=${'btn' + (me.drew ? '' : ' hi glow')} onClick=${() => setDraw(true)}>${me.drew ? 'Today’s card' : 'Draw a card'}</button>`}
    </div>
    <div class="vc-hand"><span class="muted">Hand</span><${HandChips} hand=${me.hand} />${trophies ? html`<span class="trophies" title="Vault Jam trophies">🏆 ${trophies}</span>` : ''}</div>
    ${draw && html`<${DrawSheet} me=${me} setMe=${setMe} onClose=${() => setDraw(false)} />`}
  </section>`;
}

// Trophies from Vault Jam (the fastest daily solve, before it became Goat Getaway).
export function TrophyShelf({ list }) {
  if (!list || !list.length) return null;
  return html`<div class="trophy-shelf">${list.slice().reverse().map(d => html`<span class="trophy"><i aria-hidden="true">🏆</i><b>Fastest vault</b><small>${fmtDay(d)}</small></span>`)}</div>`;
}
