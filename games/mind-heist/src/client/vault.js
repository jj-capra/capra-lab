// Vault Jam (the daily sliding puzzle), diamonds, the daily card draw and power cards.
import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { html, Avatar, toast, confetti, useNow, shareOrCopy, Sheet } from './ui.js';
import { th } from './themes.js';
import { api, serverNow } from './api.js';
import { Sound } from './sound.js';
import { pieces, slide, solved, reach } from '../shared/jam.mjs';
import { asset, link } from './base.js';

export const fmtTime = (ms) => {
  if (ms == null) return '–';
  const t = Math.max(0, ms) / 1000;
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
};
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
          <button class="btn big" disabled=${busy || !(me.gems > 0)} onClick=${() => draw(true)}>Spend a 💎 <small>${me.gems > 0 ? `1 in 2 is a prize · you have ${me.gems}` : 'Crack the Vault Jam to earn diamonds'}</small></button>
        </div>`}
    <h3>Your hand</h3>
    <${HandChips} hand=${me.hand} />
    <div class="card-rules">${Object.entries(CARDS).map(([k, c]) => html`<p><b>${c.icon} ${c.name}.</b> ${c.how}</p>`)}<p class="muted">Cards work in invite games with two crews, when the host leaves Power cards on.</p></div>
  </${Sheet}>`;
}

/* ---------- home card ---------- */
export function VaultCard({ me, setMe, home, nav }) {
  const [draw, setDraw] = useState(false);
  const jam = me.jam;
  const info = home && home.jam;
  const T = th();
  return html`<section class="vault-card stk" aria-label="Vault Jam and your cards">
    <div class="vc-top">
      <div class="vc-title"><b>Vault Jam</b>${info && html`<span class="muted">No. ${info.no} · ${info.day} · par ${info.par}</span>`}</div>
      <span class="gems" title="Diamonds">💎 ${me.gems || 0}</span>
    </div>
    <p class="vc-line">${jam && jam.ms != null
      ? html`Out in <b>${fmtTime(jam.ms)}</b> with ${jam.moves} moves${jam.parGem ? ' (par!)' : ''}.`
      : jam ? 'Your vault is open and the clock is running.' : T.jamLine}</p>
    <div class="row wrap-row">
      <button class="btn hi" onClick=${() => nav('/jam')}>${jam && jam.ms != null ? 'Today’s top five' : jam ? 'Back to the vault' : 'Crack today’s vault'}</button>
      <button class="btn" onClick=${() => nav('/jam/practice')}>Practice</button>
      <button class=${'btn' + (me.drew ? '' : ' glow')} onClick=${() => setDraw(true)}>${me.drew ? 'Today’s card' : 'Draw a card'}</button>
    </div>
    <div class="vc-hand"><span class="muted">Hand</span><${HandChips} hand=${me.hand} />${(me.trophyList || []).length ? html`<span class="trophies" title="Vault Jam trophies">🏆 ${me.trophyList.length}</span>` : ''}</div>
    ${draw && html`<${DrawSheet} me=${me} setMe=${setMe} onClose=${() => setDraw(false)} />`}
  </section>`;
}

export function TrophyShelf({ list }) {
  if (!list || !list.length) return html`<div class="empty">Post the fastest Vault Jam time of the day, anywhere, and a trophy lands here at midnight.</div>`;
  return html`<div class="trophy-shelf">${list.slice().reverse().map(d => html`<span class="trophy"><i aria-hidden="true">🏆</i><b>Fastest vault</b><small>${fmtDay(d)}</small></span>`)}</div>`;
}

/* ---------- the board ---------- */
const pct = (n) => `${(n * 100) / 6}%`;
export function JamBoard({ board, onMove, locked = false }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(null);
  const ps = useMemo(() => Object.values(pieces(board)), [board]);
  const walls = useMemo(() => [...board].map((ch, i) => (ch === 'x' ? i : -1)).filter(i => i >= 0), [board]);
  const out = solved(board);
  const start = (e, p) => {
    if (locked || out) return;
    e.preventDefault();
    const cell = ref.current.getBoundingClientRect().width / 6;
    const { min, max } = reach(board, p.id);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    setDrag({ id: p.id, h: p.h, x0: e.clientX, y0: e.clientY, cell, min, max, off: 0 });
  };
  const move = (e) => {
    if (!drag) return;
    const raw = drag.h ? e.clientX - drag.x0 : e.clientY - drag.y0;
    setDrag({ ...drag, off: Math.max(drag.min * drag.cell, Math.min(drag.max * drag.cell, raw)) });
  };
  const end = () => {
    if (!drag) return;
    const d = Math.round(drag.off / drag.cell);
    setDrag(null);
    if (d) onMove(drag.id, d);
  };
  const key = (e, p) => {
    if (locked || out) return;
    const k = e.key;
    const d = p.h ? (k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0) : (k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0);
    if (!d) return;
    e.preventDefault();
    const { min, max } = reach(board, p.id);
    if (d >= min && d <= max) onMove(p.id, d);
  };
  return html`<div class=${'jam-frame' + (out ? ' won' : '')}>
    <div class="jam-floor" ref=${ref} onPointerMove=${move} onPointerUp=${end} onPointerCancel=${end}>
      <div class="jam-door" style=${`top:${pct(2)};height:${pct(1)}`} aria-hidden="true"><span>Exit</span></div>
      ${walls.map(i => html`<div class="jam-wall" style=${`left:${pct(i % 6)};top:${pct((i / 6) | 0)};width:${pct(1)};height:${pct(1)}`} aria-hidden="true"></div>`)}
      ${ps.map(p => {
        const dragging = drag && drag.id === p.id;
        const jewel = p.id === 'A';
        const cls = 'pc ' + (jewel ? 'jewel' : 'k' + ((p.id.charCodeAt(0) - 66) % 5)) + (p.h ? ' h' : ' v') + ' l' + p.len + (dragging ? ' drag' : '') + (jewel && out ? ' out' : '');
        const style = `left:${pct(p.c)};top:${pct(p.r)};width:${pct(p.h ? p.len : 1)};height:${pct(p.h ? 1 : p.len)};`
          + (dragging ? `transform:translate${p.h ? 'X' : 'Y'}(${drag.off}px)` : '');
        return html`<button key=${p.id} type="button" class=${cls} style=${style} data-id=${p.id}
          aria-label=${jewel ? 'The jewel. Slide it right, out the door.' : `${p.h ? 'Side-to-side' : 'Up-and-down'} ${p.len === 3 ? 'long ' : ''}piece`}
          onPointerDown=${(e) => start(e, p)} onKeyDown=${(e) => key(e, p)}>
          ${jewel ? html`<svg viewBox="0 0 40 32" aria-hidden="true"><path d="M8 2h24l7 9-19 19L1 11z" fill="var(--jewel)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><path d="M1 11h38M14 2l-4 9 10 19 10-19-4-9" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>` : html`<i aria-hidden="true"></i>`}
        </button>`;
      })}
    </div>
  </div>`;
}

// Moves in a row on the same piece count as one slide, as on a real board.
function useJam(start) {
  const [raw, setSt] = useState({ boards: [start], moves: [] });
  // A new puzzle starts clean on the same render (no stale board in between).
  const st = raw.boards[0] === start ? raw : { boards: [start], moves: [] };
  const board = st.boards[st.boards.length - 1];
  const play = (id, d) => {
    let { boards, moves } = st;
    boards = boards.slice(); moves = moves.slice();
    const last = moves[moves.length - 1];
    if (last && last[0] === id) {
      const net = last[1] + d;
      moves.pop(); boards.pop();
      if (net) { moves.push([id, net]); boards.push(slide(boards[boards.length - 1], id, net)); }
    } else {
      const nb = slide(board, id, d);
      if (!nb) return null;
      moves.push([id, d]); boards.push(nb);
    }
    setSt({ boards, moves });
    return { board: boards[boards.length - 1], moves };
  };
  const undo = () => { if (st.moves.length) setSt({ boards: st.boards.slice(0, -1), moves: st.moves.slice(0, -1) }); };
  const reset = () => setSt({ boards: [start], moves: [] });
  return { board, moves: st.moves, play, undo, reset };
}

function RaceList({ race }) {
  if (!race) return null;
  return html`<div class="race">
    <div class="panel-head"><h2>Today’s top five</h2><span class="muted">${race.solvers ? `${race.solvers} cracked it` : 'Nobody yet'}</span></div>
    ${race.top.length ? html`<ol class="lb">${race.top.map((r, i) => html`<li class=${r.me ? 'me' : ''}>
        <span class="pos">${i + 1}</span><${Avatar} a=${r.avatar} size="sm" />
        <span class="nm">${r.me ? 'You' : r.name}<small>${r.moves} moves${r.lead ? ' · fastest anywhere' : ''}</small></span>
        <span class="val num">${r.lead ? '🏆 ' : ''}${fmtTime(r.ms)}</span></li>`)}</ol>`
      : html`<div class="empty">You and your friends show up here once you crack it.</div>`}
    <p class="muted race-note">${race.fastest != null ? html`Fastest time anywhere today: <b>${fmtTime(race.fastest)}</b>. ` : ''}The fastest time of the day wins a trophy at midnight. Names here are you and your friends.</p>
  </div>`;
}

/* ---------- screens ---------- */
export function JamScreen({ me, setMe, nav, practice = false }) {
  return html`<div class="wrap jam-wrap">
    <header class="top">
      <button class="logo" onClick=${() => nav('/')}><img src=${asset('icon-192.png')} alt="" width="30" height="30" />Mind <b>Heist</b></button>
      <span class="grow"></span>
      <span class="gems chip plain" title="Diamonds">💎 ${me.gems || 0}</span>
      <button class="chip" onClick=${() => nav(practice ? '/jam' : '/jam/practice')}>${practice ? 'Today’s vault' : 'Practice'}</button>
    </header>
    ${practice ? html`<${Practice} />` : html`<${Daily} me=${me} setMe=${setMe} nav=${nav} />`}
  </div>`;
}

function Daily({ me, setMe, nav }) {
  const [data, setData] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [draw, setDraw] = useState(false);
  const load = () => api('GET', '/jam').then(d => {
    setData(d); setMe(m => ({ ...m, ...d.vault }));
    if (d.trophyNews && d.trophyNews.length) { confetti(['#ffd34a', '#ffffff', '#7df9ff']); toast('🏆 You had the fastest Vault Jam yesterday. The trophy is on your profile.'); }
  }).catch(e => toast(e.message, 'err'));
  useEffect(() => { load(); Sound.music('menu-theme'); }, []);
  const jam = data && data.jam;
  const mine = data && data.vault.jam;
  const done = !!(mine && mine.ms != null);
  const g = useJam(jam && jam.board ? jam.board : '');
  const now = useNow(!!(mine && !done), 100);
  const T = th();

  const open = async () => {
    setBusy(true);
    try { const r = await api('POST', '/jam/open'); Sound.fx('pick'); setData(d => ({ ...d, jam: r.jam, vault: r.vault })); setMe(m => ({ ...m, ...r.vault })); }
    catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };
  const submit = async (moves) => {
    try {
      const r = await api('POST', '/jam/solve', { moves, date: jam.date });
      setRes(r);
      setData(d => ({ ...d, race: r.race, vault: r.vault }));
      setMe(m => ({ ...m, ...r.vault }));
      if (r.gained) { confetti(['#7df9ff', '#ffffff', '#ffe94a', '#b48cff']); Sound.fx('double'); }
    } catch (e) { toast(e.message, 'err'); }
  };
  const onMove = (id, d) => {
    const r = g.play(id, d);
    if (!r) return;
    Sound.fx('slide');
    if (solved(r.board)) { Sound.fx('jewel'); setTimeout(() => submit(r.moves), 450); }
  };

  if (!data) return html`<main class="jam"><div class="empty">Opening the vault…</div></main>`;
  const share = async () => {
    const m = res || mine;
    const t = `Mind Heist · Vault Jam No. ${jam.no} (${jam.day})\nOut in ${fmtTime(m.ms)} · ${m.moves} moves, par ${jam.par}${mine && mine.parGem ? ' 💎' : ''}`;
    const out = await shareOrCopy({ title: 'Vault Jam', text: t, url: link('/jam') });
    if (out === 'copied') toast('Copied. Paste it in the chat.');
  };
  const timer = mine ? (done ? mine.ms : serverNow() - mine.open) : null;

  return html`<main class="jam">
    <section class="jam-head stk">
      <div class="kicker"><span class="tag hi">Vault Jam</span><span>No. ${jam.no}</span><span class="muted">${jam.day} · par ${jam.par}</span></div>
      <h1>${T.jamTitle}</h1>
      <p class="blurb">${T.jamHow}</p>
      ${!jam.board && html`<div class="stack">
        <p><b>The clock starts when you open the vault.</b> Your first solve is your time. Solve it: +1 💎. Solve it in ${jam.par} moves: +1 more.</p>
        <button class="btn hi big" disabled=${busy} onClick=${open}>Open the vault</button>
      </div>`}
    </section>
    ${jam.board && html`<div class="jam-play">
      <div class="jam-bar">
        <span class="jb"><small>Time</small><b class="num">${fmtTime(timer)}</b></span>
        <span class="jb"><small>Moves</small><b class="num">${g.moves.length}</b></span>
        <span class="jb"><small>Par</small><b class="num">${jam.par}</b></span>
        <span class="grow"></span>
        <button class="btn sm" disabled=${!g.moves.length || solved(g.board)} onClick=${g.undo}>Undo</button>
        <button class="btn sm" disabled=${!g.moves.length} onClick=${g.reset}>Reset</button>
      </div>
      <${JamBoard} board=${g.board} onMove=${onMove} />
      ${done && !solved(g.board) && html`<p class="muted center">${mine.parGem ? 'You already hit par today. Play it again for fun.' : `Your time is in. Get the jewel out in ${jam.par} moves for one more 💎.`}</p>`}
    </div>`}
    ${(res || done) && html`<section class="jam-result stk" role="status">
      ${res ? html`<h2>${res.first ? `Out in ${fmtTime(res.ms)}` : `Out in ${res.moves} moves`}</h2>` : html`<h2>Out in ${fmtTime(mine.ms)}</h2>`}
      <p>${res ? `${res.moves} moves (par ${res.par}). ` : `${mine.moves} moves (par ${jam.par}). `}${res && res.gained ? html`<b>+${res.gained} 💎</b>` : ''}
        ${data.race.rank ? html` You’re <b>#${data.race.rank}</b> of ${data.race.solvers} today${data.race.leading ? ', fastest anywhere so far' : ''}.` : ''}</p>
      <div class="row wrap-row">
        <button class="btn" onClick=${share}>Share</button>
        ${res && !res.first ? '' : html`<button class=${'btn' + (me.drew ? '' : ' hi')} onClick=${() => setDraw(true)}>${me.drew ? 'Today’s card' : 'Draw today’s card'}</button>`}
        ${solved(g.board) && html`<button class="btn" onClick=${() => { setRes(null); g.reset(); }}>Play again</button>`}
      </div>
    </section>`}
    <${RaceList} race=${data.race} />
    ${draw && html`<${DrawSheet} me=${me} setMe=${(m) => setMe(m)} onClose=${() => setDraw(false)} />`}
  </main>`;
}

const LEVELS = [['easy', 'Easy', 0, 10], ['medium', 'Medium', 11, 19], ['hard', 'Hard', 20, 99]];
function Practice() {
  const [list, setList] = useState(null);
  const [level, setLevel] = useState(() => { try { return localStorage.getItem('mh.jamLevel') || 'easy'; } catch (e) { return 'easy'; } });
  const [idx, setIdx] = useState(0);
  const [t0, setT0] = useState(Date.now());
  const [doneAt, setDoneAt] = useState(null);
  useEffect(() => { fetch(asset('jam-practice.json')).then(r => r.json()).then(setList).catch(() => toast('Couldn’t load practice puzzles.', 'err')); }, []);
  const pool = useMemo(() => {
    if (!list) return [];
    const [, , lo, hi] = LEVELS.find(l => l[0] === level);
    return list.map(s => ({ board: s.slice(0, 36), par: +s.slice(36) })).filter(p => p.par >= lo && p.par <= hi);
  }, [list, level]);
  useEffect(() => {
    let i = 0;
    try { i = +(localStorage.getItem('mh.jamP.' + level) || 0); } catch (e) {}
    setIdx(pool.length ? i % pool.length : 0); setT0(Date.now()); setDoneAt(null);
  }, [pool]);
  const p = pool[idx];
  const g = useJam(p ? p.board : '');
  const now = useNow(!!p && !doneAt, 100);
  const pickLevel = (l) => { setLevel(l); try { localStorage.setItem('mh.jamLevel', l); } catch (e) {} };
  const next = () => {
    const n = (idx + 1) % pool.length;
    try { localStorage.setItem('mh.jamP.' + level, String(n)); } catch (e) {}
    setIdx(n); setT0(Date.now()); setDoneAt(null);
  };
  const onMove = (id, d) => {
    const r = g.play(id, d);
    if (!r) return;
    Sound.fx('slide');
    if (solved(r.board)) { Sound.fx('jewel'); setDoneAt(Date.now()); if (r.moves.length <= p.par) confetti(); }
  };
  return html`<main class="jam">
    <section class="jam-head stk">
      <div class="kicker"><span class="tag">Practice</span>${p && html`<span>Vault ${idx + 1} of ${pool.length}</span>`}<span class="muted">No diamonds here. Just reps.</span></div>
      <h1>Practice vaults</h1>
      <div class="pills">${LEVELS.map(([id, name]) => html`<button class="pill" aria-pressed=${level === id} onClick=${() => pickLevel(id)}>${name}</button>`)}</div>
    </section>
    ${p ? html`<div class="jam-play">
      <div class="jam-bar">
        <span class="jb"><small>Time</small><b class="num">${fmtTime((doneAt || now) - t0)}</b></span>
        <span class="jb"><small>Moves</small><b class="num">${g.moves.length}</b></span>
        <span class="jb"><small>Par</small><b class="num">${p.par}</b></span>
        <span class="grow"></span>
        <button class="btn sm" disabled=${!g.moves.length || !!doneAt} onClick=${g.undo}>Undo</button>
        <button class="btn sm" disabled=${!g.moves.length} onClick=${() => { g.reset(); setDoneAt(null); setT0(Date.now()); }}>Reset</button>
      </div>
      <${JamBoard} board=${g.board} onMove=${onMove} />
      ${doneAt && html`<section class="jam-result stk" role="status"><h2>Out in ${fmtTime(doneAt - t0)}</h2><p>${g.moves.length} moves (par ${p.par})${g.moves.length <= p.par ? '. Perfect.' : '.'}</p>
        <div class="row"><button class="btn hi" onClick=${next}>Next vault</button><button class="btn" onClick=${() => { g.reset(); setDoneAt(null); setT0(Date.now()); }}>Try again</button></div></section>`}
      ${!doneAt && html`<div class="row center-row"><button class="link" onClick=${next}>Skip this one</button></div>`}
    </div>` : html`<div class="empty">Loading…</div>`}
  </main>`;
}
