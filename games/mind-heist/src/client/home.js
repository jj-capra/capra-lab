import { useState, useEffect } from 'preact/hooks';
import { html, Avatar, AVATARS, BADGES, BADGE_ICONS, money, toast, confetti, Sheet, untilNextDrop, useNow, copyText, shareOrCopy, gridEmoji } from './ui.js';
import { api, setAuth, getAuth } from './api.js';
import { Sound } from './sound.js';
import { th, ThemePicker } from './themes.js';
import { VaultCard, TrophyShelf } from './vault.js';
import { EMOJI } from './emoji-data.js';
import { EMO_ROW } from '../shared/emoji.mjs';
import { asset, link, IN_LAB } from './base.js';
import { labLink, labSignOutUrl } from './lab.js';

/* ---------- onboarding ---------- */
export function Onboarding({ onDone, reason }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * 8)]);
  const [busy, setBusy] = useState(false);
  const [restore, setRestore] = useState(false);
  const [key, setKey] = useState('');
  const [made, setMade] = useState(null);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api('POST', '/me', { name, avatar });
      setAuth(r); Sound.fx('join'); setMade(r);
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  const doRestore = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await api('POST', '/me/restore', { key }); setAuth(r); toast(`Welcome back, ${r.me.name}.`, 'win'); onDone(r.me); }
    catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  if (made) {
    return html`<main class="onb"><div class="onb-card stk">
      <${Avatar} a=${made.me.avatar} size="lg" />
      <h1>You're in, ${made.me.name}.</h1>
      <p>This is your key. It signs you in on another phone or computer. Screenshot it or copy it somewhere safe.</p>
      <div class="keybox">${made.me.key}</div>
      <div class="row"><button class="btn" type="button" onClick=${async () => toast((await copyText(made.me.key)) ? 'Key copied.' : 'Copy it by hand.')}>Copy key</button>
      <button class="btn hi big" type="button" onClick=${() => onDone(made.me)}>Let's go</button></div>
    </div></main>`;
  }

  if (restore) {
    return html`<main class="onb"><form class="onb-card stk" onSubmit=${doRestore}>
      <h1>Sign in with your key</h1>
      <p>It looks like ABCDE-FGHJK. You'll find it in your profile on the device you already use.</p>
      <input class="field code-in" id="key" value=${key} onInput=${e => setKey(e.target.value)} placeholder="ABCDE-FGHJK" autocomplete="off" maxlength="11" required />
      <div class="row"><button class="btn hi big" disabled=${busy}>Sign in</button><button class="link" type="button" onClick=${() => setRestore(false)}>Make a new profile instead</button></div>
    </form></main>`;
  }

  return html`<main class="onb"><form class="onb-card stk" onSubmit=${create}>
    <img class="onb-mark" src=${asset('icon-192.png')} alt="" width="92" height="92" />
    <h1>${reason === 'join' ? 'Pick a name to join the heist' : 'Who’s on the crew?'}</h1>
    <label for="nm" class="sr">Your name</label>
    <input class="field" id="nm" value=${name} onInput=${e => setName(e.target.value)} placeholder="Your name or alias" maxlength="17" autocomplete="nickname" required minlength="2" />
    <div>
      <p style="font-weight:700;margin-bottom:8px">Your look</p>
      <div class="av-grid" role="radiogroup" aria-label="Avatar">
        ${AVATARS.map(a => html`<button type="button" class="av-pick" aria-pressed=${avatar === a} aria-label=${'Avatar ' + a} onClick=${() => { setAvatar(a); Sound.fx('tap'); }}>${a}</button>`)}
      </div>
    </div>
    <button class="btn hi big wide" disabled=${busy || name.trim().length < 2}>${reason === 'join' ? 'Join' : 'Make my profile'}</button>
    <p class="muted" style="font-size:var(--t-sm)">No email, no password. Played before? <button type="button" class="link" onClick=${() => setRestore(true)}>Use your key</button></p>
    ${IN_LAB && html`<p class="muted" style="font-size:var(--t-sm)">Got a Capra Lab profile? <a class="link" href=${labSignOutUrl}>Sign in to Capra Lab</a> and Mind Heist uses it.</p>`}
  </form></main>`;
}

// Inside Capra Lab, for a lab player new to Mind Heist: play as the lab profile, or bring the
// Mind Heist profile behind an old key (its stats, friends and diamonds come along).
export function LabOnboarding({ lab, reason, onDone }) {
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * 8)]);
  const [busy, setBusy] = useState(false);
  const [bring, setBring] = useState(false);
  const [key, setKey] = useState('');
  const go = async (e, how) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await labLink(lab, how);
      Sound.fx('join');
      if (how.key) toast(`Welcome back, ${r.me.name}. Your Mind Heist profile is now part of your Capra Lab profile.`, 'win');
      onDone(r.me);
    } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };

  if (bring) {
    return html`<main class="onb"><form class="onb-card stk" onSubmit=${e => go(e, { key })}>
      <h1>Bring your Mind Heist profile</h1>
      <p>Type the key from your profile on the phone or computer you played on. It looks like ABCDE-FGHJK. Your haul, streak, friends and diamonds join your Capra Lab profile, and the name becomes ${lab.mhName}.</p>
      <input class="field code-in" id="key" value=${key} onInput=${e => setKey(e.target.value)} placeholder="ABCDE-FGHJK" autocomplete="off" maxlength="11" required />
      <div class="row"><button class="btn hi big" disabled=${busy}>Bring it over</button><button class="link" type="button" onClick=${() => setBring(false)}>Back</button></div>
    </form></main>`;
  }

  return html`<main class="onb"><form class="onb-card stk" onSubmit=${e => go(e, { avatar })}>
    <h1>${reason === 'join' ? `Join the heist, ${lab.mhName}` : `Welcome to the crew, ${lab.mhName}`}</h1>
    <p>You're playing as your Capra Lab profile, on any phone signed in to the lab. Played Mind Heist before? <button type="button" class="link" onClick=${() => setBring(true)}>Bring that profile</button></p>
    <div>
      <p style="font-weight:700;margin-bottom:8px">Your look</p>
      <div class="av-grid" role="radiogroup" aria-label="Avatar">
        ${AVATARS.map(a => html`<button type="button" class="av-pick" aria-pressed=${avatar === a} aria-label=${'Avatar ' + a} onClick=${() => { setAvatar(a); Sound.fx('tap'); }}>${a}</button>`)}
      </div>
    </div>
    <button class="btn hi big wide" disabled=${busy}>${reason === 'join' ? 'Join' : 'Start playing'}</button>
  </form></main>`;
}

/* ---------- home ---------- */
export function Home({ me, setMe, nav, home, reloadHome }) {
  const [sheet, setSheet] = useState(null);
  const [friends, setFriends] = useState(null);
  const [code, setCode] = useState('');
  const now = useNow(true, 30000);
  useEffect(() => { Sound.music('menu-theme'); }, []);
  // A Vault Jam trophy (from its last days here) is announced once, the first time you open the
  // app after the day closes.
  useEffect(() => {
    const won = (home && home.trophyNews) || [];
    if (won.length) { confetti(['#ffd34a', '#ffffff', '#7df9ff']); toast(`🏆 You had the fastest Vault Jam ${won.length > 1 ? `on ${won.length} days` : 'yesterday'}. The trophy is on your profile.`); }
  }, [home && (home.trophyNews || []).join()]);
  // Diamonds earned in Goat Getaway before this lab player had a Mind Heist profile land on it.
  useEffect(() => {
    let n = (home && home.goatGems) || 0;
    try { n += Number(sessionStorage.getItem('mh.goatGems') || 0); sessionStorage.removeItem('mh.goatGems'); } catch (e) {}
    if (n > 0) toast(`💎 +${n} from Goat Getaway. Spend them in today’s card draw.`);
  }, [home]);
  useEffect(() => {
    api('GET', '/friends').then(setFriends).catch(() => setFriends({ me: null, friends: [] }));
  }, []);
  let last = null;
  try { last = JSON.parse(localStorage.getItem('mh.lastRoom') || 'null'); } catch (e) {}
  if (last && Date.now() - last.at > 6 * 3600e3) last = null;
  // Keep an eye on your last invite room while you're home: if the host runs it back after
  // you left the final screen, the card says so and takes you straight in.
  const [lastLive, setLastLive] = useState(null);
  useEffect(() => {
    if (!last || !/^\/[A-Z0-9]{4}$/.test(last.path)) return;
    let stop = false, t;
    const check = async () => {
      try { const r = await api('GET', '/rooms/' + last.code); if (!stop) setLastLive(r.room); }
      catch (e) { if (e.status === 404) { try { localStorage.removeItem('mh.lastRoom'); } catch (x) {} if (!stop) setLastLive({ gone: true }); } }
      if (!stop) t = setTimeout(check, 5000);
    };
    check();
    return () => { stop = true; clearTimeout(t); };
  }, [last && last.code]);
  const runBack = !!(last && lastLive && !lastLive.gone && (lastLive.game > (last.game || 0) || (last.ended && lastLive.phase !== 'final')));
  useEffect(() => { if (runBack) Sound.fx('join'); }, [runBack]);
  const today = home && home.today;
  const daily = me && me.today && today && me.today.deckId === today.id ? me.today : null;

  const join = (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 4) return toast('Room codes are 4 characters.', 'err');
    nav('/' + c);
  };

  const board = friends ? [friends.me, ...friends.friends].filter(Boolean).sort((a, b) => b.week - a.week).slice(0, 6) : null;

  // Inside Capra Lab the lab's button comes first (the same spot in every lab game), then your name.
  const logo = html`<button class="logo" onClick=${() => nav('/')}><img src=${asset('icon-192.png')} alt="" width="30" height="30" /><span class="lw">Mind <b>Heist</b></span></button>`;
  const profileChip = html`<button class="chip" onClick=${() => setSheet('profile')} aria-label="Your profile">
        <${Avatar} a=${me.avatar} /> <span class="nm">${me.name}</span>
        <span class="flame" title="Daily streak">🔥${me.streak}</span>
      </button>`;

  return html`<div class="wrap">
    <header class=${'top' + (IN_LAB ? ' lab-top' : '')}>
      ${IN_LAB ? html`<capra-lab-chip noname></capra-lab-chip>${profileChip}<span class="grow"></span>${logo}` : html`${logo}<span class="grow"></span>${profileChip}`}
    </header>
    <main class="home">
      ${last && !(lastLive && lastLive.gone) && html`<div class=${'rejoin stk' + (runBack ? ' hot' : '')} role=${runBack ? 'alert' : null}>
        <span>${runBack ? html`<b>They're running it back!</b> Room ${last.code}` : last.ended ? html`<b>Your last room is still open.</b> Room ${last.code}` : html`<b>Your heist is still going.</b> Room ${last.code}`}</span>
        <button class=${'btn sm' + (runBack ? ' hi' : '')} onClick=${() => nav(last.path)}>${runBack ? 'Jump in' : 'Rejoin'}</button></div>`}
      <div class="home-grid">
        <div class="stack" style="gap:18px">
          ${today && html`<section class="drop-card stk" aria-label="Today's drop">
            <div class="kicker">
              <span class="tag hi">${today.encore ? 'Encore drop' : th().drop}</span>
              ${today.no && html`<span>No. ${today.no}</span>`}
              <span class="muted">${home.nextExists ? `Next drop in ${untilNextDrop(now)}` : 'New decks soon'}</span>
            </div>
            <h1>${today.title}</h1>
            <p class="blurb">${today.blurb}</p>
            <div class="cats">${today.cats.map(c => html`<span class="cat-chip">${c}</span>`)}</div>
            <div class="daily-line">
              ${daily
                ? html`<div><span class="muted">Your daily</span><div class="score">${money(daily.score)}</div></div>
                    <div class="row"><button class="btn sm" onClick=${async () => { const t = `Mind Heist No. ${today.no} · ${today.title}\n${money(daily.score)}\n${gridEmoji(daily.grid)}`; const r = await shareOrCopy({ title: 'Mind Heist', text: t, url: link('/') }); if (r === 'copied') toast('Copied. Paste it in the chat.'); }}>Share</button>
                    <button class="btn sm" onClick=${() => setSheet('board')}>Leaderboard</button></div>`
                : html`<span>One official run per day. Your score goes on the friends board.</span>
                    <button class="btn hi" onClick=${() => startSolo(nav, today.id)}>Play your daily</button>`}
            </div>
          </section>`}
          <div class="big-two">
            <button class="mode-btn play" onClick=${() => { Sound.fx('tap'); setSheet('play'); }}><span class="t">Play</span><span class="s">Solo or challenge a friend</span></button>
            <button class="mode-btn host" onClick=${() => { Sound.fx('tap'); setSheet('host'); }}><span class="t">Host</span><span class="s">Invite your crew or run a party</span></button>
          </div>
          <form class="join-row" onSubmit=${join}>
            <label class="sr" for="code">Room code</label>
            <input id="code" class="field code-in" placeholder="Got a code?" maxlength="4" value=${code} onInput=${e => setCode(e.target.value)} autocomplete="off" />
            <button class="btn">Join</button>
          </form>
        </div>
        <div class="stack" style="gap:18px">
          <${VaultCard} me=${me} setMe=${setMe} home=${home} nav=${nav} />
          <section class="panel stk">
            <div class="panel-head"><h2>Friends this week</h2><button class="btn sm" onClick=${() => setSheet('board')}>See all</button></div>
            ${!board ? html`<div class="empty">Loading…</div>`
              : board.length < 2 ? html`<div class="empty">Play a game with someone and they land here. Everyone in your rooms becomes a friend automatically.</div>`
              : html`<ol class="lb">${board.map((f, i) => html`<li class=${f.pid === me.pid ? 'me' : ''}><span class="pos">${i + 1}</span><${Avatar} a=${f.avatar} size="sm" /><span class="nm">${f.pid === me.pid ? 'You' : f.name}<small>${f.rank}</small></span><span class="val">${money(f.week)} <span class="flame">🔥${f.streak}</span></span></li>`)}</ol>`}
          </section>
          <section class="panel stk">
            <div class="panel-head"><h2>Badges</h2><span class="muted">${Object.keys(me.badgeList || {}).length} of ${Object.keys(BADGES).length}</span></div>
            <div class="badge-strip">
              ${Object.keys(BADGES).map(id => html`<span class=${'badge' + (me.badgeList && me.badgeList[id] ? '' : ' locked')} title=${BADGES[id][1]}><i>${BADGE_ICONS[id]}</i>${BADGES[id][0]}</span>`)}
            </div>
          </section>
        </div>
      </div>
    </main>
    ${sheet === 'play' && html`<${PlaySheet} home=${home} onClose=${() => setSheet(null)} nav=${nav} />`}
    ${sheet === 'host' && html`<${HostSheet} home=${home} me=${me} onClose=${() => setSheet(null)} nav=${nav} />`}
    ${sheet === 'board' && html`<${Leaderboards} me=${me} friends=${friends} onClose=${() => setSheet(null)} today=${today} />`}
    ${sheet === 'profile' && html`<${Profile} me=${me} setMe=${setMe} friends=${friends} onClose=${() => setSheet(null)} />`}
  </div>`;
}

export async function startSolo(nav, deckId) {
  try {
    const r = await api('POST', '/rooms', { kind: 'solo', deckId });
    nav('/r/' + r.code, r.room);
  } catch (e) { toast(e.message, 'err'); }
}

// `solo`: the Play sheet (solo runs and challenges) leaves out joke decks, which are live only.
// `brews`: Capra's Lab members also get the decks hidden from the public, on their own shelf
// (never for a challenge: anyone with the link could open it).
const LAB_SHELF = 'Capra’s Lab';
export const withBrews = (home) => [...(home.brews || []).map(d => ({ ...d, shelf: LAB_SHELF, brew: true })), ...home.vault];
function DeckPicker({ home, value, onPick, dailyNote = true, solo = false, brews = true }) {
  const [shelf, setShelf] = useState('All');
  const all = brews ? withBrews(home) : home.vault;
  const vault = solo ? all.filter(d => d.kind !== 'jokes') : all;
  const shelves = ['All', ...new Set(vault.map(d => d.shelf))];
  const list = vault.filter(d => shelf === 'All' || d.shelf === shelf);
  return html`<div class="stack" style="gap:10px">
    <div class="tabs" role="tablist">${shelves.map(s => html`<button class="tab" role="tab" aria-selected=${shelf === s} onClick=${() => setShelf(s)}>${s}</button>`)}</div>
    <div class="deck-list">
      ${list.map(d => html`<button type="button" class="deck-opt" aria-pressed=${value === d.id} onClick=${() => onPick(d.id)}>
        <b>${d.title}</b>
        <span>${d.brew ? html`<span class="tag lab">🔒 Hidden</span>` : d.id === home.today.id ? html`<span class="tag hi">Today</span>` : d.no ? html`<span class="muted">No. ${d.no}</span>` : html`<span class="muted">Classic</span>`}</span>
        <small>${d.cats.join(', ')}</small>
      </button>`)}
    </div>
  </div>`;
}

function PlaySheet({ home, onClose, nav }) {
  const [step, setStep] = useState('pick');
  const [deck, setDeck] = useState(home.today.id);
  if (step === 'pick') return html`<${Sheet} title="Play" onClose=${onClose}>
    <div class="choice">
      <button class="choice-btn" onClick=${() => setStep('solo')}><span class="ic">🎯</span><span><b>Solo</b><span>Crack all 12 tiles yourself. Your first run of today’s drop is your official daily score.</span></span></button>
      <button class="choice-btn" onClick=${() => setStep('challenge')}><span class="ic">🥊</span><span><b>Challenge</b><span>Play a board, then send the link. Friends play the exact same board and try to beat you.</span></span></button>
    </div>
  </${Sheet}>`;
  return html`<${Sheet} title=${step === 'solo' ? 'Solo run' : 'Set a challenge'} onClose=${onClose}>
    ${step === 'challenge' && html`<p>Play the board first. When you finish, you'll get a link to send.</p>`}
    <${DeckPicker} home=${home} value=${deck} onPick=${setDeck} solo=${true} brews=${step !== 'challenge'} />
    <div class="row" style="justify-content:space-between">
      <button class="link" onClick=${() => setStep('pick')}>Back</button>
      <button class="btn hi big" onClick=${() => { onClose(); startSolo(nav, deck); }}>Start the run</button>
    </div>
  </${Sheet}>`;
}

function HostSheet({ home, me, onClose, nav, start = null }) {
  const [kind, setKind] = useState(null);
  const [deck, setDeck] = useState(start || home.today.id);
  const [look, setLook] = useState((me && me.theme) || 'heist');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await api('POST', '/rooms', { kind, deckId: deck, settings: { clock: 30, hacker: true, fifty: true, doubles: 1, theme: look } });
      onClose();
      nav(kind === 'invite' ? '/' + r.code : '/r/' + r.code, r.room);
    } catch (e) { toast(e.message, 'err'); }
    setBusy(false);
  };
  if (!kind) return html`<${Sheet} title="Host" onClose=${onClose}>
    <div class="choice">
      <button class="choice-btn" onClick=${() => setKind('invite')}><span class="ic">📲</span><span><b>Invite</b><span>Send a link. Everyone plays on their own phone or laptop, picks tiles in turn and sees whose turn it is.</span></span></button>
      <button class="choice-btn" onClick=${() => setKind('party')}><span class="ic">📺</span><span><b>Party</b><span>One screen. You type in the names, share your screen on the call and click for everyone.</span></span></button>
    </div>
  </${Sheet}>`;
  return html`<${Sheet} title=${kind === 'invite' ? 'Invite game' : 'Party game'} onClose=${onClose}>
    <h3>Room look</h3>
    <p class="muted" style="margin-top:-8px">Everyone in your room sees this look${kind === 'party' ? ' on your shared screen' : ''}. You can change it any time from the Host button.</p>
    <${ThemePicker} value=${look} onPick=${setLook} label="Room look" />
    <h3>Deck</h3>
    <${DeckPicker} home=${home} value=${deck} onPick=${setDeck} />
    <div class="row" style="justify-content:space-between">
      <button class="link" onClick=${() => setKind(null)}>Back</button>
      <button class="btn hi big" disabled=${busy} onClick=${go}>Open the room</button>
    </div>
  </${Sheet}>`;
}

/* ---------- leaderboards ---------- */
export function Leaderboards({ me, friends, onClose, today }) {
  const [tab, setTab] = useState('today');
  const all = friends ? [friends.me, ...friends.friends].filter(Boolean) : [];
  const tabs = { today: 'Today', week: 'This week', all: 'All time', streak: 'Streaks' };
  let rows = [];
  if (tab === 'today') rows = all.filter(f => f.today && today && f.today.deckId === today.id).sort((a, b) => b.today.score - a.today.score).map(f => [f, money(f.today.score)]);
  if (tab === 'week') rows = all.slice().sort((a, b) => b.week - a.week).map(f => [f, money(f.week)]);
  if (tab === 'all') rows = all.slice().sort((a, b) => b.haul - a.haul).map(f => [f, money(f.haul)]);
  if (tab === 'streak') rows = all.slice().sort((a, b) => b.streak - a.streak || b.bestStreak - a.bestStreak).map(f => [f, '🔥 ' + f.streak]);
  return html`<${Sheet} title="Leaderboard" onClose=${onClose}>
    <div class="tabs" role="tablist">${Object.entries(tabs).map(([k, v]) => html`<button class="tab" role="tab" aria-selected=${tab === k} onClick=${() => setTab(k)}>${v}</button>`)}</div>
    ${tab === 'today' && today && html`<p class="muted">Official daily runs on ${today.title}. One shot each.</p>`}
    ${!friends ? html`<div class="empty">Loading…</div>`
      : !rows.length ? html`<div class="empty">${tab === 'today' ? 'Nobody on your list has played today’s drop yet. Be first.' : 'No scores yet.'}</div>`
      : html`<ol class="lb">${rows.map(([f, val], i) => html`<li class=${f.pid === me.pid ? 'me' : ''}><span class="pos">${i + 1}</span><${Avatar} a=${f.avatar} size="sm" />
          <span class="nm">${f.pid === me.pid ? 'You' : f.name}<small>${f.rank}${f.vsYou ? ` · you’re ${f.vsYou[1]}–${f.vsYou[0]} vs them` : ''}</small></span><span class="val">${val}</span></li>`)}</ol>`}
    <p class="muted" style="font-size:var(--t-sm)">Only you and your friends show up here. Friends are everyone you've played with.</p>
  </${Sheet}>`;
}

/* ---------- your four emoji (the row at the bottom of a game) ---------- */
function EmojiPicker({ me, setMe }) {
  const row = (me.emo && me.emo.length === 4) ? me.emo : EMO_ROW;
  const [slot, setSlot] = useState(0);
  const tabs = [{ n: 'Hot', e: EMOJI.hot }, ...EMOJI.groups];
  const [tab, setTab] = useState('Hot');
  const list = (tabs.find(t => t.n === tab) || tabs[0]).e;
  const pick = async (e) => {
    const next = row.slice();
    const was = next.indexOf(e);
    if (was >= 0) next[was] = next[slot]; // already in the row: the two swap places
    next[slot] = e;
    Sound.fx('tap');
    setMe({ ...me, emo: next });
    try { const x = await api('POST', '/me/update', { emo: next }); setMe(x.me); }
    catch (err) { toast(err.message, 'err'); }
  };
  return html`<div class="stack" style="gap:10px">
    <div class="emo-slots" role="group" aria-label="Your four emoji">${row.map((e, i) => html`<button type="button" class="emo-slot" aria-pressed=${slot === i}
      aria-label=${`Button ${i + 1}: ${e}${slot === i ? ', picking' : ''}`} onClick=${() => setSlot(i)}>${e}<small aria-hidden="true">${i + 1}</small></button>`)}</div>
    <div class="emo-pick">
      <div class="emo-tabs" role="tablist">${tabs.map(t => html`<button type="button" role="tab" aria-selected=${tab === t.n} onClick=${() => setTab(t.n)} title=${t.n}><span aria-hidden="true">${t.e[0] || '•'}</span><small>${t.n}</small></button>`)}</div>
      <div class="emo-grid" role="tabpanel" aria-label=${`Pick the emoji for button ${slot + 1}`}>${list.map(e => html`<button type="button" class=${row.includes(e) ? 'on' : ''} onClick=${() => pick(e)} aria-label=${e}>${e}</button>`)}</div>
    </div>
  </div>`;
}

/* ---------- profile ---------- */
export function Profile({ me, setMe, friends, onClose }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(me.name);
  const [avatar, setAvatar] = useState(me.avatar);
  const [showKey, setShowKey] = useState(false);
  const [list, setList] = useState(friends ? friends.friends : []);
  const r = me.rankInfo;
  const pct = r.next ? Math.min(100, Math.round(((me.haul - r.floor) / (r.next - r.floor)) * 100)) : 100;
  const save = async () => {
    try { const x = await api('POST', '/me/update', me.lab ? { avatar } : { name, avatar }); setMe(x.me); setEdit(false); toast('Saved.'); }
    catch (e) { toast(e.message, 'err'); }
  };
  const pickLook = async (theme) => {
    if (theme === me.theme) return;
    setMe({ ...me, theme });
    try { const x = await api('POST', '/me/update', { theme }); setMe(x.me); }
    catch (e) { toast(e.message, 'err'); }
  };
  const unfriend = async (f) => {
    try { await api('POST', '/friends/remove', { pid: f.pid }); setList(l => l.filter(x => x.pid !== f.pid)); toast(`Removed ${f.name}.`); }
    catch (e) { toast(e.message, 'err'); }
  };
  return html`<${Sheet} title="Your profile" onClose=${onClose} wide>
    <div class="prof-head">
      <${Avatar} a=${me.avatar} size="xl" />
      <div class="stack" style="gap:6px">
        <h2>${me.name}</h2>
        <span><span class="tag">${me.rank}</span> <span class="flame">🔥 ${me.streak} day streak</span>${me.freezes ? html` <span class="tag hi" title="Covers one missed day">🧊 ${me.freezes} freeze${me.freezes > 1 ? 's' : ''}</span>` : ''}</span>
        <button class="link" style="justify-self:start" onClick=${() => setEdit(!edit)}>${edit ? 'Cancel' : me.lab ? 'Change your avatar' : 'Edit name or look'}</button>
      </div>
    </div>
    ${edit && html`<div class="stack">
      ${me.lab ? html`<p class="muted">Your name comes from your Capra Lab profile.</p>` : html`<input class="field" value=${name} maxlength="17" onInput=${e => setName(e.target.value)} />`}
      <div class="av-grid">${AVATARS.map(a => html`<button type="button" class="av-pick" aria-pressed=${avatar === a} onClick=${() => setAvatar(a)}>${a}</button>`)}</div>
      <button class="btn hi" onClick=${save}>Save</button>
    </div>`}
    <div class="stack" style="gap:6px">
      <div class="row" style="justify-content:space-between"><b>${money(me.haul)} lifetime haul</b><span class="muted">${r.next ? `${money(r.next - me.haul)} to ${r.nextName}` : 'Top rank'}</span></div>
      <div class="rank-bar"><i style=${`width:${pct}%`}></i></div>
    </div>
    <div class="stats">
      <div class="stat"><b>${me.games}</b><span>Crew games</span></div>
      <div class="stat"><b>${me.wins}</b><span>Wins</span></div>
      <div class="stat"><b>${me.runs}</b><span>Solo runs</span></div>
      <div class="stat"><b>${money(me.best)}</b><span>Best run</span></div>
      <div class="stat"><b>${me.acc == null ? '–' : me.acc + '%'}</b><span>Right answers</span></div>
      <div class="stat"><b>${me.bestStreak}</b><span>Longest streak</span></div>
      <div class="stat"><b>💎 ${me.gems || 0}</b><span>Diamonds</span></div>
      ${(me.trophyList || []).length ? html`<div class="stat"><b>🏆 ${me.trophyList.length}</b><span>Vault Jam trophies</span></div>` : ''}
    </div>
    ${(me.trophyList || []).length ? html`<h3>Trophies</h3><${TrophyShelf} list=${me.trophyList} />` : ''}
    <h3>Your look</h3>
    <p class="muted" style="margin-top:-8px">Your screens use this look. In someone else's room you'll see the host's.</p>
    <${ThemePicker} value=${me.theme || 'heist'} onPick=${pickLook} label="Your look" />
    <h3>Your emoji</h3>
    <p class="muted" style="margin-top:-8px">The four buttons at the bottom of a game. Tap one here, then pick the emoji it sends.</p>
    <${EmojiPicker} me=${me} setMe=${setMe} />
    <h3>Badges</h3>
    <div class="badge-grid">${Object.entries(BADGES).map(([id, [n, how]]) => html`<div class=${'badge-card' + (me.badgeList[id] ? '' : ' locked')}><i>${BADGE_ICONS[id]}</i><span><b>${n}</b><small>${how}</small></span></div>`)}</div>
    <h3>Friends</h3>
    ${list.length ? html`<ol class="lb">${list.map(f => html`<li><span class="pos"></span><${Avatar} a=${f.avatar} size="sm" /><span class="nm">${f.name}<small>${f.rank} · 🔥${f.streak}${f.trophies ? ` · 🏆${f.trophies}` : ''}${f.vsYou ? ` · you’re ${f.vsYou[1]}–${f.vsYou[0]}` : ''}</small></span><button class="btn sm" onClick=${() => unfriend(f)}>Remove</button></li>`)}</ol>`
      : html`<div class="empty">Join or host a game and your crewmates show up here.</div>`}
    <h3>Your key</h3>
    ${me.lab && IN_LAB ? html`<p class="muted">This profile is part of your Capra Lab profile: signing in to Capra Lab signs you in here. Your Mind Heist key below still works on mind-heist.netlify.app.</p>`
      : html`<p class="muted">Use it to sign in on another device. Anyone with it can play as you, so keep it to yourself.</p>`}
    ${showKey ? html`<div class="keybox">${me.key}</div>` : html`<button class="btn" onClick=${() => setShowKey(true)}>Show key</button>`}
    ${showKey && html`<button class="btn sm" onClick=${async () => toast((await copyText(me.key)) ? 'Key copied.' : 'Copy it by hand.')}>Copy key</button>`}
    ${me.lab && IN_LAB ? html`<a class="link" style="justify-self:start" href=${labSignOutUrl}>Sign out in Capra Lab</a>`
      : html`<button class="link" style="justify-self:start" onClick=${() => { if (getAuth()) { setAuth(null); location.href = link('/'); } }}>Sign out on this device</button>`}
  </${Sheet}>`;
}

/* ---------- challenge landing ---------- */
export function ChallengeLanding({ id, me, nav }) {
  const [ch, setCh] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { Sound.music('menu-theme'); api('GET', '/challenges/' + id).then(setCh).catch(e => setErr(e.message)); }, [id]);
  const accept = async () => {
    try { const r = await api('POST', `/challenges/${id}/play`); nav('/r/' + r.code); } catch (e) { toast(e.message, 'err'); }
  };
  if (err) return html`<div class="wrap"><main class="onb"><div class="onb-card stk"><h1>Hmm.</h1><p>${err}</p><button class="btn hi" onClick=${() => nav('/')}>Go home</button></div></main></div>`;
  if (!ch) return html`<div class="wrap"><main class="onb"><div class="onb-card stk"><p>Loading the challenge…</p></div></main></div>`;
  const mine = ch.mine;
  return html`<div class="wrap"><main class="onb"><div class="onb-card stk">
    <div class="row"><${Avatar} a=${ch.by.avatar} size="lg" /><span class="tag gum">Challenge</span></div>
    ${mine && mine.creator
      ? html`<h1>Your challenge on ${ch.deck.title}</h1><p>You set ${money(ch.by.score)}. Send the link to friends to see who can beat it.</p>`
      : mine ? html`<h1>${mine.score > ch.by.score ? 'You beat it.' : mine.score === ch.by.score ? 'Dead even.' : 'Not this time.'}</h1><p>You scored ${money(mine.score)} against ${ch.by.name}'s ${money(ch.by.score)}.</p>`
      : html`<h1>${ch.by.name} challenged you</h1><p>Beat <b>${money(ch.by.score)}</b> on <b>${ch.deck.title}</b>. Same board, same Hacker tiles, same everything. One shot.</p>`}
    ${ch.takers.length > 0 && html`<ol class="lb">
      ${[{ pid: ch.by.pid, name: ch.by.name, avatar: ch.by.avatar, score: ch.by.score, setter: true }, ...ch.takers].sort((a, b) => b.score - a.score).map((t, i) => html`<li class=${me && t.pid === me.pid ? 'me' : ''}><span class="pos">${i + 1}</span><${Avatar} a=${t.avatar} size="sm" /><span class="nm">${t.name}<small>${t.setter ? 'Set the score' : 'Took the challenge'}</small></span><span class="val">${money(t.score)}</span></li>`)}
    </ol>`}
    <div class="row">
      ${!mine && html`<button class="btn hi big" onClick=${accept}>Take the challenge</button>`}
      ${mine && mine.creator && html`<button class="btn hi" onClick=${async () => { const r = await shareOrCopy({ title: 'Mind Heist challenge', text: `Beat my ${money(ch.by.score)} on ${ch.deck.title}`, url: location.href }); if (r === 'copied') toast('Link copied.'); }}>Send the link</button>`}
      <button class="btn" onClick=${() => nav('/')}>Home</button>
    </div>
  </div></main></div>`;
}
