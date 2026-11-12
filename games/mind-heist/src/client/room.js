import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'preact/hooks';
import qrcode from 'qrcode-generator';
import { html, Avatar, money, Money, LETTERS, crewClass, toast, confetti, useNow, copyText, shareOrCopy, gridEmoji,
  BADGES, BADGE_ICONS, pickWord, Sheet } from './ui.js';
import { th, themeId, setTheme, THEMES, THEME_IDS } from './themes.js';
import { api, serverNow } from './api.js';
import { createMesh, p2pSupported } from './p2p.js';
import { Sound } from './sound.js';
import { CARDS, HandChips } from './vault.js';
import { EMO_ROW } from '../shared/emoji.mjs';
import { at, asset, link } from './base.js';

const LIVE = ['board', 'intro', 'ask', 'reveal', 'sudden'];
const CLOCKS = [[0, 'Off'], [20, '20s'], [30, '30s'], [45, '45s'], [60, '60s']];

/* =================== data =================== */

function useRoomData(code, { tv, initial, onGone, meshRef }) {
  const [room, setRoom] = useState(initial || null);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0); // bumps after every poll so the next one is always scheduled
  const ref = useRef(room);
  ref.current = room;
  const timer = useRef(null);
  const busy = useRef(false);
  const again = useRef(false);

  const load = async (full = false) => {
    if (busy.current) { again.current = true; return; } // a nudge mid-fetch: fetch once more after
    busy.current = true;
    try {
      const v = !full && ref.current ? ref.current.v : 0;
      const qs = [tv ? 'tv=1' : '', v ? 'v=' + v : ''].filter(Boolean).join('&');
      const r = await api('GET', `/rooms/${code}${qs ? '?' + qs : ''}`);
      if (!r.same && r.room) { setRoom(r.room); if (meshRef && meshRef.current) meshRef.current.noteVersion(r.room.v); }
      setError(null);
    } catch (e) {
      if (e.status === 404) { setError(e.message); onGone && onGone(); }
      else if (!ref.current) setError(e.message);
    } finally {
      busy.current = false;
      if (again.current) { again.current = false; setTimeout(() => load(), 0); }
      setTick(t => t + 1);
    }
  };

  // Poll only as often as the phase needs. Solo and party rooms are driven by
  // this device, so they just wake up when a timer is due.
  useEffect(() => {
    clearTimeout(timer.current);
    const r = room;
    let wait;
    if (!r) wait = 0;
    else if (r.kind === 'invite' || tv) {
      // With direct links up, other phones nudge this one the moment anything changes,
      // so the check-in here is only a backup (plus a wake-up when a timer is due).
      const linked = linkedToAll(r, meshRef && meshRef.current);
      if (r.phase === 'final') wait = r.results || r.kind !== 'invite' ? 6000 : 1500;
      else if (LIVE.includes(r.phase)) wait = linked ? 4000 : 1200;
      else wait = linked ? 5000 : 2000;
      if (linked) { const due = dueTimes(r); if (due != null) wait = Math.min(wait, Math.max(150, due - serverNow() + 150)); }
      if (document.hidden) wait = 8000;
    } else {
      const due = dueTimes(r);
      wait = due != null ? Math.max(150, due - serverNow() + 200) : null;
    }
    if (wait != null) timer.current = setTimeout(() => load(!ref.current), wait);
    return () => clearTimeout(timer.current);
  }, [room, tv, tick]);

  useEffect(() => {
    const vis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);

  return { room, setRoom, error, setError, load };
}

// True when this phone has a direct link to every other player's phone. If even one player
// can't link, everyone keeps checking the server every second or so, so nobody falls behind.
function linkedToAll(r, mesh) {
  if (!mesh || !r.members) return false;
  const st = mesh.status();
  if (!st.open) return false;
  const others = r.members.filter(m => !m.guest && m.id !== r.me).map(m => m.id);
  return others.every(id => st.openPids.includes(id));
}

// The next moment the server will change this room on its own (a timer running out).
function dueTimes(r) {
  const now = serverNow();
  const due = [];
  if (r.cur && r.cur.introUntil) due.push(r.cur.introUntil);
  if (r.cur && r.cur.deadline) due.push(r.cur.deadline);
  if (r.cur && r.cur.nextAt) due.push(r.cur.nextAt);
  if (r.cur && r.cur.duel && r.cur.duel.missUntil) due.push(r.cur.duel.missUntil);
  if (r.pause && r.pause.by === 'crew') due.push(r.pause.until);
  if (r.sudden && !r.sudden.revealed) due.push(r.sudden.deadline);
  if (r.sudden && r.sudden.revealed && r.sudden.revealAt && r.kind === 'invite') due.push(r.sudden.revealAt + 7000);
  if (r.phase === 'final' && !r.results) due.push(now + 1200);
  return due.length ? Math.min(...due) : null;
}

/* =================== room =================== */

export function Room({ code, me, nav, tv = false, initial = null }) {
  const meshRef = useRef(null);
  const { room, setRoom, error, load } = useRoomData(code, { tv, initial, meshRef });
  const [joining, setJoining] = useState(false);
  const [, setLinkTick] = useState(0);
  // Power cards in your hand (they live on your profile).
  const [hand, setHand] = useState(() => (me && me.hand) || []);
  // Emoji spam from the four-button row: shown here at once, sent to linked phones every 0.3 s
  // (one small message per emoji), and to the server (one batch of up to four emoji, every
  // 1.6 s at most) only when some screen can't be reached directly.
  const floatRef = useRef(null);
  const outbox = useRef({ seq: 0 });
  const fire = (e) => {
    if (!room || !room.me) return;
    if (floatRef.current) floatRef.current({ e, c: 1, pid: room.me }, 'me');
    const ob = outbox.current, mesh = meshRef.current;
    const tag = () => `${String(room.me).slice(0, 6)}.${Date.now().toString(36)}.${++ob.seq}`;
    if (mesh) {
      if (!ob.link) {
        ob.link = {};
        ob.linkT = setTimeout(() => {
          const b = ob.link; ob.link = null;
          if (meshRef.current) for (const [k, c] of Object.entries(b)) meshRef.current.react(k, Math.min(12, c), tag());
        }, 300);
      }
      ob.link[e] = (ob.link[e] || 0) + 1;
    }
    // Skip the server only when every other player and every open screen is linked directly.
    const st = mesh ? mesh.status() : null;
    if (!(st && st.open === st.total && linkedToAll(room, mesh))) {
      if (!ob.srv) {
        ob.srv = {};
        ob.srvT = setTimeout(() => {
          const b = ob.srv; ob.srv = null;
          const m = Object.entries(b).slice(0, 4).map(([k, c]) => ({ e: k, c: Math.min(12, c) }));
          if (m.length) api('POST', `/rooms/${code}/act`, { type: 'react', m, id: tag() }).catch(() => {});
        }, 1600);
      }
      ob.srv[e] = (ob.srv[e] || 0) + 1;
    }
  };
  const send = async (type, extra = {}) => {
    Sound.unlock();
    try {
      const r = await api('POST', `/rooms/${code}/act`, { type, ...extra });
      setRoom(r.room);
      if (r.hand) setHand(r.hand);
      if (meshRef.current) meshRef.current.noteVersion(r.room.v); // tell the other phones right away
      return true;
    } catch (e) { toast(e.message, 'err'); if (e.status === 409) load(true); return false; }
  };

  // Join invite rooms from the link.
  useEffect(() => {
    if (!room || tv || joining) return;
    if (room.kind === 'invite' && !room.me && me) {
      setJoining(true);
      api('POST', `/rooms/${code}/join`).then(r => {
        setRoom(r.room); Sound.fx('join');
        if (r.friended) toast(`${r.friended} new friend${r.friended > 1 ? 's' : ''} added from this room.`);
      }).catch(e => toast(e.message, 'err')).finally(() => setJoining(false));
    }
  }, [room && room.code, room && room.me]);

  useEffect(() => {
    if (!room || tv) return;
    try {
      // Invite rooms stay remembered after the final, so a player who went home sees it when
      // the host runs it back (home.js checks the room).
      if (room.phase === 'final' && room.results && room.kind !== 'invite') localStorage.removeItem('mh.lastRoom');
      else if (room.me) localStorage.setItem('mh.lastRoom', JSON.stringify({ code: room.code, kind: room.kind, path: room.kind === 'invite' ? '/' + room.code : '/r/' + room.code, at: Date.now(), game: room.game, ended: room.phase === 'final' }));
    } catch (e) {}
  }, [room && room.phase, room && room.results]);

  useTransitions(room);

  // Direct links between phones in an invite game (and the big screen, when signed in).
  const inGame = !!(room && room.kind === 'invite' && (room.me || tv));
  useEffect(() => {
    if (!inGame || !p2pSupported()) return;
    const mesh = createMesh({ code, kind: tv ? 'tv' : 'play', onNudge: () => load(), onChange: () => setLinkTick(t => t + 1), onReact: (r) => floatRef.current && floatRef.current(r, 'link') });
    meshRef.current = mesh;
    if (mesh) { window.__mhMesh = mesh; mesh.update(room); }
    const bye = () => { if (mesh) mesh.close(); };
    window.addEventListener('pagehide', bye);
    return () => {
      window.removeEventListener('pagehide', bye);
      if (mesh) { const wasOn = mesh.status().voice; mesh.close(); if (wasOn) Sound.beforeMic().then(() => Sound.afterMic(false)); }
      meshRef.current = null;
    };
  }, [inGame, code, tv]);
  useEffect(() => { if (meshRef.current && room) meshRef.current.update(room); }, [room]);
  const micAllowed = !!(room && room.settings && room.settings.mic);
  useEffect(() => {
    const mesh = meshRef.current;
    if (!micAllowed && mesh && mesh.status().voice) { Sound.beforeMic().then(() => mesh.setVoice(false)).catch(() => {}).finally(() => Sound.afterMic(false)); }
  }, [micAllowed]);
  // Everyone in a room sees the host's look.
  if (room && room.settings) setTheme(room.settings.theme);

  if (error && !room) return html`<div class="wrap"><main class="onb"><div class="onb-card stk"><h1>Can’t open that room</h1><p>${error}</p><button class="btn hi" onClick=${() => nav('/')}>Go home</button></div></main></div>`;
  if (!room) return html`<div class="wrap"><main class="onb"><div class="onb-card stk"><p>Opening the vault…</p></div></main></div>`;
  if (room.kind === 'party' && !room.host && !tv) return html`<div class="wrap"><main class="onb"><div class="onb-card stk"><h1>That’s a party room</h1><p>Party games run on the host’s screen. Ask them to share it on the call.</p><button class="btn hi" onClick=${() => nav('/')}>Go home</button></div></main></div>`;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [hostMenu, setHostMenu] = useState(false);
  // The invite pop-up closes itself when the game starts.
  const prevPhase = useRef(room.phase);
  useEffect(() => { if (prevPhase.current === 'lobby' && room.phase !== 'lobby') setInviteOpen(false); prevPhase.current = room.phase; }, [room.phase]);
  const ctx = { room, me, send, nav, tv, hand: tv ? [] : hand, invite: () => setInviteOpen(true) };
  const paused = room.pause && room.pause.by === 'host';
  const phase = room.phase;
  let body;
  if (phase === 'lobby') body = html`<${Lobby} ...${ctx} />`;
  else if (phase === 'captains') body = html`<${Captains} ...${ctx} />`;
  else if (phase === 'toss') body = html`<${Toss} ...${ctx} />`;
  else if (phase === 'draft') body = html`<${Draft} ...${ctx} />`;
  else if (phase === 'final') body = html`<${Final} ...${ctx} />`;
  else body = html`<${Live} ...${ctx} />`;

  return html`<div class=${'room' + (tv ? ' tv' : '')} data-phase=${room.phase} data-host=${room.host ? '1' : null}>
    <div class="wrap">
      <header class="room-top">
        <button class="logo" onClick=${() => (tv ? null : nav('/'))} aria-label="Home"><img src=${asset('icon-192.png')} alt="" width="30" height="30" /><span class="wm">Mind <b>Heist</b></span></button>
        <span class="grow deck-name">${room.deck.title}${room.deck.no ? ` · No. ${room.deck.no}` : ''}</span>
        ${room.kind === 'invite' && (tv ? html`<span class="chip plain code-chip" title="Room code">${room.code}</span>`
          : html`<button class="chip plain code-chip" title="Invite players" aria-label=${`Room ${room.code}. Invite players`} onClick=${() => setInviteOpen(true)}>${room.code}</button>`)}
        ${room.host && !tv && LIVE.includes(phase) && (paused
          ? html`<button class="chip host-chip on" onClick=${() => send('resume')}>Resume</button>`
          : html`<button class="chip host-chip" aria-haspopup="dialog" onClick=${() => setHostMenu(true)}>Host</button>`)}
        ${meshRef.current && html`<${LinkChip} st=${meshRef.current.status()} />`}
        ${room.kind === 'solo' && html`<span class="chip plain">${room.challengeId ? 'Challenge' : 'Solo'}</span>`}
        ${room.kind === 'party' && html`<span class="chip plain">Party</span>`}
      </header>
      ${body}
    </div>
    <${PauseVeil} ...${ctx} />
    ${inviteOpen && html`<${InviteSheet} room=${room} onClose=${() => setInviteOpen(false)} />`}
    ${hostMenu && room.host && html`<${HostMenu} room=${room} send=${send} onClose=${() => setHostMenu(false)} invite=${() => { setHostMenu(false); setInviteOpen(true); }} />`}
    <${Floaters} room=${room} hook=${floatRef} />
    ${!tv && room.kind === 'invite' && room.me && html`<${EmojiRow} fire=${fire} emo=${(me && me.emo) || EMO_ROW} />`}
    ${!tv && meshRef.current && room.settings.mic && room.myCrew >= 0 && room.crews && html`<${OpenMic} mesh=${meshRef.current} room=${room} />`}
  </div>`;
}

// How many other phones this one has a direct link to. Green when they all do.
function LinkChip({ st }) {
  if (!st.total) return null;
  const all = st.open === st.total;
  return html`<span class=${'chip plain link-chip' + (all ? ' all' : st.open ? ' some' : '')} title=${`Direct links to ${st.open} of ${st.total} other screens. Linked screens update instantly; the rest check in every second or so.`}>
    <i aria-hidden="true"></i><span class="num">${st.open}/${st.total}</span><span class="sr"> direct links</span></span>`;
}

// Open mic: talk with your own crew. Only crewmates who also have it on hear you.
function OpenMic({ mesh, room }) {
  const st = mesh.status();
  const [busy, setBusy] = useState(false);
  const names = st.matesOnAir.map(pid => memberOf(room, pid).name);
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const want = !st.voice;
    // iPhone: close the sound engine while the mic opens and rebuild it after, or the
    // phone's audio crackles like static (see sound.js).
    await Sound.beforeMic();
    let onAir = st.voice;
    try { await mesh.setVoice(want); onAir = want; }
    catch (e) { toast(e && e.name === 'NotAllowedError' ? 'Microphone blocked. Allow it for this site in your browser settings to use Open mic.' : (e.message || 'Couldn’t start the microphone.'), 'err'); }
    Sound.afterMic(onAir);
    Sound.fx('tap');
    setBusy(false);
  };
  const label = st.voice
    ? (names.length ? `Mic on · ${names.join(', ')}` : 'Mic on · waiting for your crew')
    : (names.length ? `Open mic · ${names.length} on` : 'Open mic');
  return html`<button type="button" class=${'mic-btn ' + crewClass(room.myCrew) + (st.voice ? ' on' : '')} onClick=${toggle} disabled=${busy}
    aria-pressed=${st.voice} aria-label=${label} title=${st.voice ? 'Turn your mic off' : 'Talk with your crew. Only crewmates who turn it on can hear you.'}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z"/>${!st.voice && html`<path d="M4 4l16 16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`}</svg>
    <span class="mic-lbl">${label}</span>
    ${names.length > 0 && html`<span class="mic-n" aria-hidden="true">${names.length}</span>`}
  </button>`;
}

/* Emoji: a row of four buttons at the bottom, chosen in Profile (JC: "a fun nuisance"). Tap or
   hold any of them, several at once if you like: every button keeps its own hold timer. */
function EmojiRow({ fire, emo }) {
  const timers = useRef({});
  const stop = (i) => { clearInterval(timers.current[i]); delete timers.current[i]; };
  const down = (i, e) => (ev) => {
    ev.preventDefault();
    fire(e);
    stop(i);
    let n = 0;
    timers.current[i] = setInterval(() => { if (++n > 2) fire(e); }, 120); // hold to keep spamming
  };
  useEffect(() => () => Object.keys(timers.current).forEach(stop), []);
  return html`<div class="emo-row" role="group" aria-label="Emoji reactions">${emo.slice(0, 4).map((e, i) => html`<button type="button" class="emo-b" key=${i + e}
    aria-label=${'Send ' + e} onPointerDown=${down(i, e)} onPointerUp=${() => stop(i)} onPointerLeave=${() => stop(i)} onPointerCancel=${() => stop(i)}
    onContextMenu=${(ev) => ev.preventDefault()} onKeyDown=${(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fire(e); } }}>${e}</button>`)}</div>`;
}

/* =================== sounds, music and moments =================== */

// What the music should be doing for this room right now.
function lostIt(room) {
  return room.phase === 'final' && room.kind !== 'solo' && room.myCrew >= 0 && room.winner >= 0 && room.winner !== room.myCrew;
}
function musicFor(room) {
  const ph = room.phase;
  if (ph === 'final') return lostIt(room) ? 'bleak' : 'menu-theme';   // the haul reveal
  if (ph === 'sudden') return 'theme';
  if (!LIVE.includes(ph)) return 'menu-theme';
  const cur = room.cur;
  // Face-off replay: tension until the line drops, then the drop (or bleak).
  if (cur && cur.duel && ph === 'reveal') return serverNow() < cur.revealAt + RP.line ? 'arcade:hot' : cur.right ? 'arcade:drop' : 'bleak';
  if (cur && cur.duel && cur.duel.stage === 'miss') return serverNow() < cur.duel.missUntil - cur.duel.missMs + RP.line ? 'arcade:hot' : 'bleak';
  if (ph === 'reveal' && cur) return cur.right ? 'arcade:drop' : 'bleak';
  if (ph === 'ask' && cur) {
    if (cur.take && cur.phase === 'ask') return 'arcade:ask';
    const left = cur.left != null ? cur.left : cur.deadline ? cur.deadline - serverNow() : null;
    return left != null && left <= 5500 ? 'arcade:hot' : 'arcade:ask';
  }
  return 'arcade:board';
}

function useTransitions(room) {
  const prev = useRef(null);
  useEffect(() => {
    if (!room) return;
    const p = prev.current;
    prev.current = room;
    Sound.music(musicFor(room));
    document.body.classList.toggle('hacked', !!(room.cur && room.cur.sp === 'hacker' && ['intro', 'ask', 'reveal'].includes(room.cur.phase)));
    if (!p || p.code !== room.code) return;
    if (p.phase !== room.phase) {
      if (room.phase === 'intro' && room.cur) Sound.fx(room.cur.duel ? 'horn' : room.cur.sp === 'hacker' ? 'hacker' : 'double');
      if (room.phase === 'ask' && p.phase === 'board') Sound.fx('pick');
      if (room.phase === 'captains' || room.phase === 'toss') Sound.fx('coin');
      if (room.phase === 'board' && p.phase === 'draft') Sound.fx('land');
      if (room.phase === 'final') {
        if (lostIt(room)) Sound.fx('lose');
        else { Sound.fx('win'); confetti(); }
        // The lab wallet (Capra Lab's /lab/wallet.js, Nov 2026): amber for a finished board, a shard
        // when your crew wins an invite or party game. The server pays a game once and caps a day.
        if (room.me && window.CapraWallet) {
          const ref = room.code + ':' + (room.game || 0);
          const won = room.kind !== 'solo' && room.myCrew >= 0 && room.winner === room.myCrew;
          window.CapraWallet.earn('mind-heist', 'game', ref).then(() => { if (won) window.CapraWallet.earn('mind-heist', 'win', ref); });
        }
      }
    }
    // A face-off's sounds play along with its replay instead (FaceoffReplay).
    if (room.cur && room.cur.duel && p.cur && p.cur.duel && room.cur.duel.round > p.cur.duel.round) Sound.fx('timeout');
    if (room.phase === 'reveal' && room.cur && p.phase !== 'reveal' && !room.cur.duel) {
      // Right: air horns and a beat drop (bigger for the Double, the Hacker and a take). Wrong: bleak.
      Sound.fx(room.cur.right ? 'right' : 'wrong', { big: !!(room.cur.right && (room.cur.sp || room.cur.take)) });
      if (room.cur.right && room.cur.mid === room.me) confetti(['#35e07d', '#ffe94a', '#ffffff']);
    }
    if (room.sudden && room.sudden.revealed && !(p.sudden && p.sudden.revealed)) Sound.fx('land');
    if (room.members.length > p.members.length) Sound.fx('join');
    if (room.pause && !p.pause) Sound.fx(room.pause.by === 'crew' ? 'timeout' : 'pause');
    if (room.cur && room.cur.removed && !(p.cur && p.cur.removed)) Sound.fx('fifty');
    if (room.cur && room.cur.take && room.cur.phase === 'ask' && !(p.cur && p.cur.take)) Sound.fx('double');
    if (room.results && !p.results && room.me && room.results[room.me]) {
      const r = room.results[room.me];
      if (r.badges && r.badges.length) setTimeout(() => { Sound.fx('badge'); r.badges.forEach(b => toast(`${BADGE_ICONS[b] || '🏅'} Badge unlocked: ${BADGES[b] ? BADGES[b][0] : b}`, 'win')); }, 900);
      if (r.rankUp) setTimeout(() => toast(`Rank up: ${r.rank}`, 'win'), 1600);
    }
  }, [room]);
}

// Floating emoji from three places: this phone (at once), linked phones (direct), and the
// server (for phones that couldn't link). The server copy of a batch a linked phone already
// showed is skipped.
function Floaters({ room, hook }) {
  const [list, setList] = useState([]);
  const seen = useRef(null);
  const ids = useRef(new Set());
  const viaLink = useRef({});
  const lastBlip = useRef(0);
  const names = Object.fromEntries(room.members.map(m => [m.id, m.name]));
  const show = (r, src) => {
    if (r.id) { if (ids.current.has(r.id)) return; ids.current.add(r.id); if (ids.current.size > 300) ids.current.delete(ids.current.values().next().value); }
    if (src === 'link') viaLink.current[r.pid] = Date.now();
    if (src !== 'me' && Date.now() - lastBlip.current > 250) { lastBlip.current = Date.now(); Sound.fx('react'); }
    const k = Math.min(src === 'me' ? 1 : 6, r.c || 1);
    const who = src === 'me' ? '' : (names[r.pid] || '');
    const base = Math.random();
    const add = Array.from({ length: k }, (_, i) => ({ id: Math.random().toString(36).slice(2), e: r.e, who: i === 0 ? who : '',
      left: 6 + ((base * 88 + i * 9) % 88), dx: (Math.random() * 140 - 70) + 'px', delay: i * 0.09, big: src === 'me' }));
    setList(l => [...l, ...add].slice(-40));
    setTimeout(() => setList(l => l.filter(x => !add.includes(x))), 2900 + k * 90);
  };
  hook.current = show;
  useEffect(() => {
    const rs = room.reactions || [];
    if (seen.current == null) { seen.current = rs.reduce((m, r) => Math.max(m, r.n), 0); return; }
    const fresh = rs.filter(r => r.n > seen.current && r.t > serverNow() - 6000);
    if (!fresh.length) return;
    seen.current = Math.max(seen.current, ...fresh.map(r => r.n));
    for (const r of fresh) {
      if (r.mid === room.me) continue;                                   // already shown here
      if (Date.now() - (viaLink.current[r.mid] || 0) < 5000) continue;    // already came over a link
      show({ e: r.e, c: r.c || 1, id: r.id, pid: r.mid }, 'server');
    }
  }, [room.reactions]);
  return html`<div class="floaters" aria-hidden="true">${list.map(f => html`<div class=${'floater' + (f.big ? ' mine' : '')} key=${f.id} style=${`left:${f.left}%;--dx:${f.dx};animation-delay:${f.delay}s`}>${f.e}${f.who && html`<small>${f.who}</small>`}</div>`)}</div>`;
}

/* =================== helpers =================== */

const isJokes = (room) => !!(room.deck && room.deck.kind === 'jokes' && room.kind !== 'solo');
const memberOf = (room, id) => room.members.find(m => m.id === id) || { name: 'Someone', avatar: '❔' };
// Two players are a crew of one each: their names are the crews (JJ-Capra, not JJ-Capra's crew).
const duo = (room) => !!(room.crews && room.crews.length === 2 && room.crews.every(c => c.mem.length === 1));
const capName = (room, k) => memberOf(room, room.crews[k].cap).name;
const crewLabel = (room, k) => (room.crews && room.crews[k] ? (duo(room) ? capName(room, k) : `${capName(room, k)}'s crew`) : k ? 'Aqua crew' : 'Bubblegum crew');
// Can this viewer make the move for player `mid`? (themselves, or the host for guests / party rooms)
function actsFor(room, mid) {
  if (!mid) return false;
  if (mid === room.me) return true;
  const m = memberOf(room, mid);
  return !!(room.host && (room.kind === 'party' || m.guest));
}

/* =================== lobby =================== */

function Lobby({ room, send, me, nav, tv, hand, invite }) {
  const [guest, setGuest] = useState('');
  // A host waiting alone gets the invite pop-up once, so the code is ready to send.
  useEffect(() => {
    if (tv || !room.host || room.kind !== 'invite') return;
    const key = 'mh.invited.' + room.code;
    let seen = false;
    try { seen = !!sessionStorage.getItem(key); sessionStorage.setItem(key, '1'); } catch (e) {}
    if (!seen && room.members.filter(m => !m.spec).length <= 1) invite();
  }, []);
  const url = link('/' + room.code);
  const qrSvg = useMemo(() => {
    if (room.kind !== 'invite') return '';
    const q = qrcode(0, 'M'); q.addData(url); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }, [url]);
  const players = room.members.filter(m => !m.spec);
  const s = room.settings;
  const jokes = !!(room.deck && room.deck.kind === 'jokes');
  const addGuest = async (e) => {
    e.preventDefault();
    const names = guest.split(/[\n,;]+/).map(x => x.trim()).filter(Boolean);
    for (const n of names) await send('addGuest', { name: n });
    setGuest('');
    try { const all = room.members.filter(m => m.guest).map(m => m.name).concat(names); localStorage.setItem('mh.partyNames', JSON.stringify([...new Set(all)].slice(0, 30))); } catch (e2) {}
  };
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('mh.partyNames') || '[]'); } catch (e) {}
  const share = async () => { const r = await shareOrCopy({ title: 'Join my Mind Heist', text: `Join my heist. Room ${room.code}`, url }); if (r === 'copied') toast('Invite link copied. Paste it in the chat.'); };

  return html`<div class="lobby">
    ${room.kind === 'invite' ? html`<section class=${'invite stk' + (players.length >= 2 && !tv ? ' compact' : '')} aria-label="Invite">
      <span class="tag hi">Room code</span>
      <div class="code num">${room.code}</div>
      <div class="url">${url.replace(/^https?:\/\//, '')}</div>
      <div class="row" style="align-items:flex-start">
        <div class="qr" aria-label="QR code for the invite link" dangerouslySetInnerHTML=${{ __html: qrSvg }}></div>
        <div class="stack" style="gap:10px">
          ${!tv && html`<button class="btn hi" onClick=${invite}>Send invite</button>`}
          ${!tv && html`<button class="btn sm" onClick=${async () => toast((await copyText(url)) ? 'Link copied.' : 'Copy failed.')}>Copy link</button>`}
          ${room.host && html`<a class="btn sm" href=${at('/tv/' + room.code)} target="_blank" rel="noopener">Big-screen view</a>`}
        </div>
      </div>
      <p class="muted" style="font-size:var(--t-sm)">Scan it on a phone, or paste the link in the Teams or Zoom chat. ${room.host ? 'Share the big-screen view on the call so everyone sees the board.' : ''}</p>
    </section>` : html`<section class="invite stk">
      <span class="tag gum">Party game</span>
      <h2 style="font-size:var(--t-2xl);line-height:.95">Who’s on the job?</h2>
      <p>Type everyone on the call. Press Enter after each name, or paste a list.</p>
      <form class="join-row" style="width:100%" onSubmit=${addGuest}>
        <input class="field" value=${guest} onInput=${e => setGuest(e.target.value)} placeholder="Add a name" maxlength="200" aria-label="Player name" />
        <button class="btn">Add</button>
      </form>
      ${saved.length > 0 && players.length === 0 && html`<button class="btn sm" onClick=${async () => { for (const n of saved) await send('addGuest', { name: n }); }}>Same crew as last time (${saved.length})</button>`}
    </section>`}

    <section class="members stk">
      <div class="panel-head"><h2>${players.length} on the crew</h2>${room.kind === 'invite' && html`<span class="muted">Everyone here becomes friends</span>`}</div>
      <div class="mem-grid">
        ${room.members.map(m => html`<div class=${'mem' + (m.spec ? ' spec' : '')} key=${m.id}>
          ${m.isHost && html`<span class="tag">Host</span>`}
          <${Avatar} a=${m.avatar} size="lg" />
          <b>${m.id === room.me ? 'You' : m.name}</b>
          ${m.spec && html`<small class="muted">Watching</small>`}
          ${room.host && !m.isHost && html`<button class="rm" type="button" aria-label=${'Remove ' + m.name} onClick=${() => send('remove', { mid: m.id })}>×</button>`}
        </div>`)}
        ${!room.members.length && html`<div class="empty">No one yet.</div>`}
      </div>
      ${room.host ? html`<div class="opt-grid">
        ${jokes && html`<div class="opt-row faceoff-note"><span>Face-off deck</span><small>Every tile is a face-off: one player from each crew, secret picks, fastest right punchline wins the money and the next pick. Hacker, Doubles, Take tiles, lifelines and power cards sit this deck out.</small></div>`}
        ${!jokes && html`<div class="opt-row"><span>Hacker mode</span><div class="pills"><button class="pill" aria-pressed=${s.hacker} onClick=${() => send('settings', { hacker: true })}>On: 1 Hacker tile</button><button class="pill" aria-pressed=${!s.hacker} onClick=${() => send('settings', { hacker: false })}>Off</button></div></div>
        <div class="opt-row"><span>Hidden Doubles</span><div class="pills">${[0, 1, 2].map(n => html`<button class="pill" aria-pressed=${s.doubles === n} onClick=${() => send('settings', { doubles: n })}>${n === 0 ? 'None' : n}</button>`)}</div></div>
        <div class="opt-row"><span>Take mode</span><div class="pills"><button class="pill" aria-pressed=${!!s.take} onClick=${() => send('settings', { take: true })}>On: 6 Take tiles</button><button class="pill" aria-pressed=${!s.take} onClick=${() => send('settings', { take: false })}>Off</button></div>
          <small class="muted">Miss a Take tile and the other crew gets one shot at it.</small></div>
        <div class="opt-row"><span>Lifelines</span><div class="pills"><button class="pill" aria-pressed=${s.fifty} onClick=${() => send('settings', { fifty: !s.fifty })}>50/50 for each crew</button><button class="pill" aria-pressed=${true} disabled>One timeout each</button></div></div>`}
        ${room.kind === 'invite' && !jokes && html`<div class="opt-row"><span>Power cards</span><div class="pills"><button class="pill" aria-pressed=${!!s.cards} onClick=${() => send('settings', { cards: true })}>On: Mole and Hidden 50/50</button><button class="pill" aria-pressed=${!s.cards} onClick=${() => send('settings', { cards: false })}>Off</button></div>
          <small class="muted">Players win these cards in Capra Lab’s daily Card Draw and play them from their own phones.</small></div>`}
        <div class="opt-row"><span>Answer clock</span><div class="pills">${CLOCKS.map(([v, l]) => html`<button class="pill" aria-pressed=${s.clock === v} onClick=${() => send('settings', { clock: v })}>${l}</button>`)}</div></div>
        <div class="opt-row"><span>Look for everyone in this room</span><div class="pills">${THEME_IDS.map(id => html`<button class="pill" aria-pressed=${s.theme === id} onClick=${() => send('theme', { theme: id })}>${THEMES[id].name}</button>`)}</div></div>
        ${room.kind === 'invite' && html`<div class="opt-row"><span>Open mic</span><div class="pills"><button class="pill" aria-pressed=${!!s.mic} onClick=${() => send('mic', { on: true })}>On: crews can talk</button><button class="pill" aria-pressed=${!s.mic} onClick=${() => send('mic', { on: false })}>Off</button></div>
          <small class="muted">For friends playing from different homes. Leave it off when everyone's already on a Teams or Zoom call.</small></div>`}
        ${room.kind === 'invite' && html`<label class="check"><input type="checkbox" checked=${!!(room.members.find(m => m.id === room.me) || {}).spec} onChange=${() => send('spectate')} /> I'm just hosting, not playing</label>`}
        <button class="btn hi big start-btn" disabled=${players.length < 2} onClick=${() => send('start')}>${players.length < 2 ? 'Need 2 players' : players.length === 2 ? 'Flip the coin' : 'Draw the captains'}</button>
      </div>` : jokes ? html`<div class="empty">Waiting for ${memberOf(room, room.hostId).name} to start. It's a joke deck: every tile is a face-off between one player from each crew. Fastest right punchline wins. Clock ${s.clock ? s.clock + 's' : 'off'}.</div>`
      : html`<div class="empty">Waiting for ${memberOf(room, room.hostId).name} to start. Clock ${s.clock ? s.clock + 's' : 'off'} · Hacker mode ${s.hacker ? 'on' : 'off'} · Hidden Doubles ${s.doubles || 'none'} · Take mode ${s.take ? 'on' : 'off'} · 50/50 ${s.fifty ? 'on' : 'off'}${room.kind === 'invite' ? ` · Power cards ${s.cards ? 'on' : 'off'}` : ''}.</div>`}
      ${room.kind === 'invite' && s.cards && !room.host && html`<div class="lobby-hand"><span class="muted">Your hand</span><${HandChips} hand=${hand} /></div>`}
    </section>
  </div>`;
}

/* =================== captains, toss, draft =================== */

// Big type that shrinks until it fits its box, so a 17-character name (DA_ROMAN_EMPIRE) never
// breaks or runs off a phone screen. Names inside sit in .nm spans that never wrap.
function useFit(ref, key, min = 16) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = '';
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth + 1 && size > min) { size -= 1; el.style.fontSize = size + 'px'; }
    };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, [key]);
}
// Any element whose text shrinks to fit: <${Fit} as="b" key=${text}>…<//>.
function Fit({ as = 'b', cls = '', fit, min = 12, children }) {
  const ref = useRef(null);
  useFit(ref, fit, min);
  return html`<${as} class=${cls} ref=${ref}>${children}<//>`;
}
function FitName({ name, cls = 'b' }) {
  const ref = useRef(null);
  useFit(ref, name, 14);
  return html`<b class=${'fit-name ' + cls} ref=${ref}>${name}</b>`;
}

function Captains({ room, send }) {
  const now = useNow(true, 90);
  const spinning = now - room.phaseAt < 2400;
  const names = room.members.filter(m => !m.spec);
  const roll = (i) => names[Math.floor(now / 90 + i * 3) % names.length];
  const caps = room.captains.map(id => memberOf(room, id));
  return html`<section class="show stk">
    <span class="tag">Step 1 of 3</span>
    <h2>${spinning ? 'Drawing captains…' : 'Your captains'}</h2>
    <div class="duo">
      ${[0, 1].map(k => {
        const m = spinning ? roll(k) : caps[k];
        return html`<div class=${`cap c${k} ${spinning ? 'spin' : ''}`}><${Avatar} a=${m.avatar} size="xl" /><${FitName} name=${m.id === room.me && !spinning ? 'You' : m.name} /><span class="tag">${(th().crews || ['Bubblegum', 'Aqua'])[k]} crew</span></div>`;
      }).reduce((a, el, i) => (i ? [...a, html`<span class="vs">vs</span>`, el] : [el]), [])}
    </div>
    <p>Captains draft their crews. Everyone takes turns in the hot seat.</p>
    ${room.host && !spinning && html`<div class="row"><button class="btn" disabled=${names.length < 3} onClick=${() => send('reroll')}>Redraw</button><button class="btn hi big" onClick=${() => send('toss')}>Flip the coin</button></div>`}
  </section>`;
}

function Toss({ room, send }) {
  const now = useNow(true, 120);
  const flipping = now - room.phaseAt < 2500;
  const caps = room.crews.map(c => memberOf(room, c.cap));
  const w = room.toss;
  const noDraft = room.members.filter(m => !m.spec).length <= 2 || room.crews.some(c => c.mem.length > 1);
  const colors = (th().crews || ['Pink', 'Aqua']).map(c => c.toLowerCase());
  const head = useRef(null), line = useRef(null);
  useFit(head, caps.map(c => c.name).join('|'), 18);
  useFit(line, `${w}|${flipping}`, 14);
  const nm = (k) => html`<span class=${'pname c' + k}>${caps[k].name}</span>`;
  return html`<section class="show stk toss">
    <span class="tag">${noDraft ? 'Coin flip' : 'Step 2 of 3'}</span>
    <h2 ref=${head}><span class="ln">${nm(0)} is ${colors[0]}.</span> <span class="ln">${nm(1)} is ${colors[1]}.</span></h2>
    <div class="coin-stage"><div class=${'coin' + (flipping ? ' flipping' : '')} style=${`--end:${w ? 1980 : 1800}deg;${flipping ? '' : `transform:rotateY(${w ? 180 : 0}deg)`}`}>
      <div class="face f0">${caps[0].avatar}</div><div class="face f1">${caps[1].avatar}</div>
    </div></div>
    <p class="toss-line" ref=${line}>${flipping ? '' : noDraft
      ? html`<b class="pname">${caps[w].name}</b>${duo(room) ? '' : "'s crew"} wins the toss and picks the first tile.`
      : html`<b class="pname">${caps[w].name}</b> wins the toss and drafts first. <b class="pname">${caps[1 - w].name}</b>'s crew picks the first tile.`}</p>
    ${room.host && !flipping && html`<button class="btn hi big" onClick=${() => send('draft')}>${noDraft ? 'Start the heist' : 'Start the draft'}</button>`}
  </section>`;
}

function Draft({ room, send }) {
  const d = room.draft;
  const capId = room.crews[d.turn].cap;
  const myPick = actsFor(room, capId);
  const col = (k) => html`<div class=${`crew-col c${k}`}>
    <h3>${crewLabel(room, k)}</h3>
    ${room.crews[k].mem.map(id => { const m = memberOf(room, id); return html`<div class="m"><${Avatar} a=${m.avatar} size="sm" />${id === room.me ? 'You' : m.name}${id === room.crews[k].cap ? ' (captain)' : ''}</div>`; })}
  </div>`;
  return html`<div class="draft">
    ${col(0)}
    <section class="pool">
      <span class="tag">Step 3 of 3</span>
      <h2>${myPick ? (capId === room.me ? 'Your pick' : `Pick for ${memberOf(room, capId).name}`) : `${memberOf(room, capId).name} is picking`}</h2>
      <div class="pool-grid">${d.pool.map(id => { const m = memberOf(room, id); return html`<button class="pick-btn" disabled=${!myPick} onClick=${() => send('pickMate', { mid: id })}><${Avatar} a=${m.avatar} size="sm" />${id === room.me ? 'You' : m.name}</button>`; })}</div>
      ${room.host && html`<div class="row" style="justify-content:center"><button class="btn sm" onClick=${() => send('autoDraft')}>Deal the rest randomly</button>${d.last && html`<button class="btn sm flat" onClick=${() => send('undoDraft')}>Undo pick</button>`}</div>`}
    </section>
    ${col(1)}
  </div>`;
}

/* =================== live play =================== */

function HotSeat({ room, compact = false }) {
  const solo = room.kind === 'solo';
  const cur = room.cur;
  const mid = cur ? cur.mid : room.picker;
  const k = cur ? cur.crew : room.turn;
  if (!mid) return null;
  const m = memberOf(room, mid);
  const you = mid === room.me;
  let line, act;
  const T = th();
  const run = room.run && room.run.crew === k ? room.run : null;
  const duel = cur && cur.duel;
  if (duel && room.phase !== 'board') {
    const nm = (id) => (id === room.me ? 'you' : memberOf(room, id).name);
    if (room.phase === 'reveal') { line = cur.right ? `${you ? 'You' : m.name} won the face-off` : 'Nobody got it'; act = cur.right ? money(cur.delta + (cur.bonus || 0)) : 'No money'; }
    else { line = `Face-off: ${nm(duel.mids[0])} vs ${nm(duel.mids[1])}`.replace(': you', ': You'); act = duel.stage === 'miss' ? 'Replay' : duel.round === 2 ? 'Blank round' : 'Face-off'; }
  } else if (room.phase === 'board') { line = you ? T.youPick : T.picking(m.name); act = solo ? `${tilesLeft(room)} tiles left` : run ? `Hacker run: ${run.left} pick${run.left === 1 ? '' : 's'} left` : 'Picking'; }
  else if (room.phase === 'ask' && cur.take) { line = you ? 'Take it! Lock in an answer.' : `${m.name} can take it`; act = 'Take'; }
  else if (room.phase === 'intro') { line = cur.sp === 'hacker' ? `${you ? 'You' : m.name} hit a Hacker tile` : `${you ? 'You' : m.name} found the ${T.double}`; act = cur.sp === 'hacker' ? 'Breach' : 'Bonus'; }
  else if (room.phase === 'ask') { line = you ? T.youAnswer : T.answering(m.name); act = room.pause && room.pause.by === 'crew' ? 'Timeout' : 'On the clock'; }
  else if (cur.take) { line = cur.right ? `${you ? 'You' : m.name} took it` : 'Nobody got it'; act = cur.right ? money(cur.delta) : 'No money'; }
  else { line = cur.right ? `${you ? 'You' : m.name} got it` : `${you ? 'You' : m.name} missed`; act = cur.right ? money(cur.delta + (cur.bonus || 0)) : cur.delta ? money(cur.delta) : 'No money'; }
  return html`<div class=${`seat ${compact ? 'compact' : ''} ${solo ? 'solo' : crewClass(k)} ${duel && room.phase !== 'reveal' ? 'duel' : ''} ${you && (room.phase === 'board' || room.phase === 'ask') ? 'you' : ''}`} key=${mid + room.phase} aria-live="polite">
    <${Avatar} a=${m.avatar} size="lg" />
    <div class="who"><${Fit} fit=${line} min=${12}>${line}<//><span>${solo ? (room.challengeId ? 'Challenge run' : 'Solo run') : `${crewLabel(room, k)}${you || duo(room) ? '' : ` · ${m.name}`}`}</span></div>
    <span class="act">${act}</span>
  </div>`;
}

const tilesLeft = (room) => room.board.reduce((n, c) => n + c.tiles.filter(t => !t.taken).length, 0);

function Crews({ room }) {
  if (room.kind === 'solo') {
    const c = room.crews[0];
    return html`<div class="crew-card on" style="--c:var(--hi)">
      <div class="nm"><span>Your haul</span></div>
      <${Money} value=${c.haul} cls=${'haul' + (c.haul < 0 ? ' neg' : '')} />
      <div class="meta">${c.heat >= 2 ? html`<span class="heat">🔥 On fire</span>` : c.heat ? html`<span class="heat">🔥 ${c.heat} in a row</span>` : ''}
        <span class=${'life' + (c.fifty ? ' used' : '')}>50/50</span><span class=${'life' + (c.tout ? ' used' : '')}>Timeout</span></div>
    </div>`;
  }
  const up = room.cur ? room.cur.mid : room.picker;
  return html`<div class="crews">${room.crews.map((c, k) => html`<div class=${`crew-card ${crewClass(k)} ${(room.cur ? room.cur.crew : room.turn) === k && room.phase !== 'sudden' ? 'on' : ''}`}>
    <div class="nm"><${Fit} as="span" fit=${crewLabel(room, k)} min=${8}>${crewLabel(room, k)}<//></div>
    <${Money} value=${c.haul} cls=${'haul' + (c.haul < 0 ? ' neg' : '')} />
    <div class="meta">${c.heat >= 2 ? html`<span class="heat">🔥 On fire</span>` : ''}${!isJokes(room) && html`${room.settings.fifty && html`<span class=${'life' + (c.fifty ? ' used' : '')}>50/50</span>`}<span class=${'life' + (c.tout ? ' used' : '')}>Timeout</span>`}</div>
    <div class="mems">${c.mem.map(id => { const m = memberOf(room, id); return html`<span title=${m.name}><${Avatar} a=${m.avatar} cls=${id === up ? 'up' : ''} /></span>`; })}</div>
  </div>`)}</div>`;
}

function ScoreStrip({ room }) {
  if (room.kind === 'solo') {
    const c = room.crews[0];
    return html`<div class="scores" style="grid-template-columns:1fr"><div class="score on" style="--c:var(--hi)">
      <span class="nm">Your haul${c.heat >= 2 ? ' 🔥 on fire' : ''}</span>
      <span class="ll"><span class=${'life' + (c.fifty ? ' used' : '')}>50/50</span><span class=${'life' + (c.tout ? ' used' : '')}>Timeout</span></span>
      <${Money} value=${c.haul} cls=${'amt' + (c.haul < 0 ? ' neg' : '')} />
    </div></div>`;
  }
  const on = room.cur ? room.cur.crew : room.turn;
  // A long name gets the cell's whole width on a phone, with the money under it.
  const tall = room.crews.some((c, k) => capName(room, k).length > 11);
  return html`<div class=${'scores' + (tall ? ' tall' : '')}>${room.crews.map((c, k) => html`<div class=${`score ${crewClass(k)} ${on === k && room.phase !== 'sudden' ? 'on' : ''}`}>
    <${Fit} as="span" cls="nm" fit=${crewLabel(room, k) + c.heat} min=${10}>${duo(room) ? capName(room, k) : html`${capName(room, k)}<span class="sfx">'s crew</span>`}${c.heat >= 2 ? ' 🔥' : ''}<//>
    <span class="ll">${!isJokes(room) && html`${room.settings.fifty && html`<span class=${'life' + (c.fifty ? ' used' : '')}>50/50</span>`}<span class=${'life' + (c.tout ? ' used' : '')}>Timeout</span>`}</span>
    <${Money} value=${c.haul} cls=${'amt' + (c.haul < 0 ? ' neg' : '')} />
  </div>`)}</div>`;
}

function Feed({ room }) {
  if (!room.feed.length) return null;
  return html`<section class="feed stk"><h3>Play by play</h3><ol>${room.feed.slice().reverse().slice(0, 7).map(f => html`<li><i class=${f.crew != null ? crewClass(f.crew) : ''}></i><span>${f.text}</span></li>`)}</ol></section>`;
}

function Live(props) {
  const { room } = props;
  let stage;
  if (room.phase === 'board') stage = html`<${Board} ...${props} />`;
  else if (room.phase === 'intro') stage = room.cur && room.cur.duel ? html`<${FaceoffIntro} ...${props} />` : html`<${Takeover} ...${props} />`;
  else if (room.phase === 'sudden') stage = html`<${Sudden} ...${props} />`;
  else stage = html`<${Question} ...${props} />`;
  // The question is the main event: everything else steps back while it's live.
  if (room.phase !== 'board') {
    return html`<div class="focus">
      ${room.phase !== 'sudden' && html`<${HotSeat} room=${room} compact=${true} />`}
      <${ScoreStrip} room=${room} />
      ${stage}
      ${room.host && !props.tv && html`<${HostBar} ...${props} />`}
    </div>`;
  }
  return html`<div>
    <${HotSeat} room=${room} />
    <div class="stage-grid">
      <div class="stack">${stage}${room.host && !props.tv && html`<${HostBar} ...${props} />`}</div>
      <aside class="rail"><${Crews} room=${room} /><${Feed} room=${room} /></aside>
    </div>
  </div>`;
}

function Board({ room, send }) {
  const who = room.picker;
  const can = actsFor(room, who);
  return html`<div>
    <div class="board" role="grid" aria-label="Board">
      ${room.board.map((col, c) => html`<div class="col" role="row">
        <div class="col-head">${col.name}</div>
        ${col.tiles.map((t, r) => {
          if (t.taken) {
            const m = memberOf(room, t.res.mid);
            const cls = room.kind === 'solo' ? (t.res.right ? 'rs' : '') : t.res.right ? 'r' + t.res.crew : '';
            return html`<div class=${'tile taken ' + cls} role="gridcell" aria-label=${`${col.name} $${t.v}: ${t.res.right ? 'right' : 'missed'} by ${m.name}`}>
              ${t.sp && html`<span class=${'tag sp-tag ' + (t.sp === 'hacker' ? '' : 'hi')}>${t.sp === 'hacker' ? 'Hacker' : 'Double'}</span>`}
              ${t.tk && html`<span class="tag tk-tag">${t.res.take && t.res.right ? 'Taken' : 'Take'}</span>`}
              <div class="res"><b>${t.res.right ? '✓ ' + money(t.res.delta) : t.res.delta ? '✕ ' + money(t.res.delta) : '✕'}</b>${room.kind !== 'solo' && html`<small>${t.res.both ? 'Nobody' : m.name}</small>`}</div>
            </div>`;
          }
          return html`<button class=${'tile ' + (can ? 'can' : 'wait')} role="gridcell" disabled=${!can} aria-label=${`${col.name} for $${t.v}`}
            onClick=${() => { Sound.fx('tap'); send('pick', { c, r }); }}><span><span class="dollar">$</span>${t.v}</span>${t.tk && html`<span class="tag tk-tag">Take</span>`}</button>`;
        })}
      </div>`)}
    </div>
    <div class="board-hint">
      ${room.deck && room.deck.kind === 'jokes' && room.kind !== 'solo' ? html`<span class="muted">${tilesLeft(room)} of 12 tiles left. Every tile is a face-off: the fastest right punchline wins it and picks next.</span>` : html`
      <span class="muted">${tilesLeft(room)} of 12 tiles left${room.kind === 'solo' ? '.' : room.settings.take ? '. One shot each.' : '. One shot each, no steals.'}</span>
      ${room.settings.take && room.kind !== 'solo' && html`<span class="muted">Miss a Take tile and the other crew gets one shot at it.</span>`}
      ${room.settings.hacker && room.deck.kind !== 'jokes' && html`<span class="muted">A Hacker tile is hiding on this board.</span>`}`}
    </div>
  </div>`;
}

function Takeover({ room }) {
  const cur = room.cur;
  const m = memberOf(room, cur.mid);
  if (cur.sp === 'hacker') {
    return html`<section class="takeover hacker" aria-live="assertive"><div>
      <div class="lines">${`> intrusion detected on tile ${room.board[cur.c].name} $${cur.v}\n> rerouting answer feed...\n> scrambling options for ${m.name}`}</div>
      <div class="big">THE HACKER IS IN</div>
      <p>The options will scramble as the clock runs. Lock in before they’re gone. ${room.kind === 'solo' || !cur.runIf ? 'Right pays double.' : `Right pays double and ${crewLabel(room, cur.crew)} picks the next ${RUN_WORDS[cur.runIf]}.`} Wrong costs ${money(cur.v)}.</p>
    </div></section>`;
  }
  return html`<section class="takeover double" aria-live="assertive"><div>
    <div class="big">${themeId() === 'heist' ? 'DOUBLE' : th().double}</div>
    <p>${room.kind === 'solo' ? 'Get this one right and it pays double.' : `Get this one right and ${crewLabel(room, cur.crew)} picks again.`}</p>
  </div></section>`;
}

const RUN_WORDS = { 1: 'tile', 2: 'two tiles', 3: 'three tiles' };

// Deterministic character scramble for Hacker tiles.
function hashN(a, b) { let x = (a * 2654435761 + b * 40503) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return x >>> 0; }
function scramble(text, frac, seed) {
  if (frac <= 0) return text;
  const chars = [...text];
  const idx = chars.map((ch, i) => i).filter(i => /\S/.test(chars[i]));
  idx.sort((a, b) => hashN(seed, a) - hashN(seed, b));
  const n = Math.floor(idx.length * Math.min(1, frac));
  const glyphs = '█▓▒░#$%&@?/<>*';
  for (let k = 0; k < n; k++) chars[idx[k]] = glyphs[hashN(seed + 7, idx[k]) % glyphs.length];
  return chars.join('');
}

function Question({ room, send, hand = [] }) {
  const cur = room.cur;
  const revealed = cur.phase === 'reveal';
  // Keep ticking through the verdict so the fun fact appears on time, even with no auto-advance.
  const now = useNow(!revealed || !!cur.nextAt || (cur.factAt != null && serverNow() < cur.factAt + 300), 100);
  const [sel, setSel] = useState(null);
  const [moling, setMoling] = useState(false);
  const lastTick = useRef(null);
  const duel = cur.duel || null;
  useEffect(() => { setSel(null); setMoling(false); }, [cur.c, cur.r, revealed, cur.crew, duel && duel.round]);
  const hacker = cur.sp === 'hacker';
  const crew = room.crews[cur.crew];
  // A face-off: each of the two players locks for themselves (the host for guests, or for
  // both in a party room). Everyone else on a crew whispers to their own player.
  const lockFor = duel ? [0, 1].filter(k => duel.stage === 'pick' && !duel.locked[k] && actsFor(room, duel.mids[k])) : [];
  const iPick = duel ? lockFor.length > 0 : actsFor(room, cur.mid);
  const iCaptain = !duel && (actsFor(room, crew.cap) || cur.mid === room.me);
  const onCrew = duel ? room.myCrew >= 0 : room.myCrew === cur.crew;
  const iMate = !iPick && onCrew && room.kind === 'invite' && !(duel && (duel.mids.includes(room.me) || duel.stage !== 'pick'));
  const crewPause = room.pause && room.pause.by === 'crew';
  const hostPause = room.pause && room.pause.by === 'host';
  const clock = cur.clock;
  const left = clock ? (cur.left != null ? cur.left : Math.max(0, cur.deadline - now)) : null;
  const secs = left == null ? null : Math.ceil(left / 1000);
  useEffect(() => {
    if (revealed || secs == null || cur.left != null) return;
    if (secs !== lastTick.current && secs <= 5 && secs > 0) { Sound.fx('tick'); Sound.music(musicFor(room)); }
    lastTick.current = secs;
  }, [secs]);
  // Hacker decay: readable for the first 30% of the clock, gone at zero.
  let frac = 0;
  if (hacker && !revealed) {
    const total = clock || 45000;
    const elapsed = clock ? total - left : Math.max(0, now - (cur.askAt || now));
    frac = Math.max(0, (elapsed - total * 0.3) / (total * 0.7));
  }
  const sugBy = {};
  if (cur.sug) for (const [pid, i] of Object.entries(cur.sug)) (sugBy[i] ||= []).push(pid);
  const mySug = cur.sug && room.me ? cur.sug[room.me] : null;
  const seed = cur.c * 7 + cur.r * 13 + (room.game || 1);

  // Power cards from this phone's hand.
  const cardsOn = !duel && !!(room.settings.cards && room.kind === 'invite' && room.myCrew >= 0 && room.crews && room.crews.length === 2);
  const has = (k) => hand.some(c => c.k === k);
  const canMole = cardsOn && !revealed && room.myCrew !== cur.crew && has('mole') && !cur.tip && !crewPause;
  const canHide = cardsOn && !revealed && onCrew && has('hfifty') && !cur.take && !cur.removed && !cur.hidden && !crewPause;
  const hidden = cur.hidden || [];
  const tipMine = cur.tip && cur.tip.mine;

  const clickOpt = (i) => {
    if (revealed || (cur.removed && cur.removed.includes(i)) || hidden.includes(i)) return;
    if (duel && (duel.stage !== 'pick' || duel.struck.includes(i))) return;
    if (moling) {
      if (cur.take && cur.take.missed === i) return;
      Sound.fx('lock');
      send('mole', { i }).then(ok => { if (ok) toast(`Tip sent: ${LETTERS[i]}. Nobody knows it was you.`); });
      setMoling(false);
      return;
    }
    if (iPick && !hostPause) { setSel(i); Sound.fx('tap'); }
    else if (iMate) { send('suggest', { i: mySug === i ? null : i }); Sound.fx('tap'); }
  };
  const lockAs = (k) => { if (sel != null) { Sound.fx('lock'); send('lock', k == null ? { i: sel } : { i: sel, crew: k }); } };
  const lock = () => (duel ? lockFor.length === 1 && lockAs(lockFor[0]) : lockAs(null));

  useEffect(() => {
    const k = (e) => {
      if (e.target.closest && e.target.closest('input,textarea')) return;
      const i = 'abcd'.indexOf(e.key.toLowerCase());
      if (i >= 0 && !revealed && cur.opts) clickOpt(i);
      if (e.key === 'Enter' && sel != null && iPick && !revealed) lock();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const T = th();
  const words = revealed ? (cur.right ? pickWord(T.right, seed) : cur.picked == null ? T.timeUp : pickWord(T.wrong, seed)) : '';
  const late = !revealed && clock > 0 && secs <= 5 && cur.left == null;
  const nextLeft = revealed && cur.nextAt ? Math.max(0, cur.nextAt - now) : null;
  // The fun fact gets its own screen after the verdict. Only the player who answered (or took)
  // the tile can skip it; the host steps in for guests and in party rooms.
  const factStage = revealed && !!cur.fact && cur.factAt != null && now >= cur.factAt;
  const guesser = memberOf(room, cur.mid);
  const canSkip = revealed && (room.kind === 'solo' || cur.mid === room.me || (room.host && (room.kind === 'party' || guesser.guest || !room.members.some(m => m.id === cur.mid))));
  const skipLabel = tilesLeft(room) === 0 ? 'Count the haul' : room.kind === 'solo' ? 'Next tile' : room.kind === 'party' ? 'Next' : 'Skip';
  if (factStage) return html`<${FactCard} room=${room} cur=${cur} canSkip=${canSkip} label=${skipLabel} nextLeft=${nextLeft} guesser=${guesser} send=${send} />`;
  if (duel && (duel.stage === 'miss' || revealed)) return html`<${FaceoffReplay} room=${room} cur=${cur} now=${now} canSkip=${canSkip} label=${skipLabel} send=${send} />`;
  const myDuel = duel ? duel.mids.indexOf(room.me) : -1;

  return html`<section class=${'q-card stk' + (hacker ? ' hack' : '')} aria-label="Question">
    ${duel && duel.blank && html`<div class="take-banner duel-banner" role="status"><b>Blank round</b><span>Nobody landed it, so the punchlines went blank. Pick the letter you remember${duel.struck.length ? ` (${duel.struck.map(i => LETTERS[i]).join(' and ')} ${duel.struck.length > 1 ? 'are' : 'is'} out)` : ''}.</span></div>`}
    ${cur.take && html`<div class=${'take-banner ' + crewClass(cur.crew)} role="status"><b>Take!</b><span>${crewLabel(room, cur.take.from)} missed. ${revealed ? (cur.right ? `${crewLabel(room, cur.crew)} took it.` : 'Nobody got it.') : `${room.myCrew === cur.crew ? 'Your crew' : crewLabel(room, cur.crew)} gets one shot at it.`}</span></div>`}
    ${cur.mole && html`<div class=${'mole-banner ' + (cur.mole.won ? 'won' : '')} role="status"><i aria-hidden="true">🕵️</i><span>${cur.mole.won
      ? html`<b>${room.myCrew === cur.mole.on ? 'The mole got you!' : `The mole got ${crewLabel(room, cur.mole.on)}!`}</b> ${cur.mole.name} takes ${money(cur.mole.v)} for ${crewLabel(room, cur.mole.crew)}.`
      : cur.mole.used ? html`<b>The tip was right.</b> ${cur.mole.name} was the mole and helped ${crewLabel(room, cur.mole.on)} out.`
      : html`<b>Nice dodge.</b> ${crewLabel(room, cur.mole.on)} ignored ${cur.mole.name}’s tip.`}</span></div>`}
    ${themeId() === 'office' && !duel && html`<div class="memo-to"><span><b>Memo</b></span><span>To: ${room.kind === 'solo' ? 'You' : crewLabel(room, cur.crew)}</span><span>From: The quiz committee</span></div>`}
    <div class="q-head">
      <span class="cat">${cur.cat}</span><span class="val num">${money(cur.v)}</span>
      ${cur.sp && html`<span class=${'tag ' + (hacker ? '' : 'hi')}>${hacker ? 'Hacker' : 'Double'}<span class="tag-more">${hacker
        ? (room.kind === 'solo' || !cur.runIf ? ': x2 or lose it' : `: x2 and ${cur.runIf} pick${cur.runIf === 1 ? '' : 's'}, or lose it`)
        : room.kind === 'solo' ? ': pays x2' : ': pick again'}</span></span>`}
      ${cur.tk && !cur.take && html`<span class="tag tk-tag">Take tile</span>`}
      ${duel && html`<span class="tag hi">Face-off</span>`}
      <span class="grow"></span>
      ${!revealed && room.kind !== 'solo' && html`<span class="hint">${duel ? (iPick ? 'Pick the punchline' : iMate ? 'Tap to suggest' : myDuel >= 0 ? 'Locked in' : 'Secret picks') : iPick ? 'Your call' : iMate ? 'Tap to suggest' : `${memberOf(room, cur.mid).name} decides`}</span>`}
    </div>
    ${!revealed && clock > 0 && html`<div class=${'timer' + (secs <= 5 ? ' late' : '') + (cur.left != null ? ' frozen' : '')}>
      <div class="track"><div class="fill" style=${`transform:scaleX(${Math.max(0, left / clock)})`}></div></div>
      <div class="secs-wrap">${late && T.late && html`<span class="late-lbl">${T.late}</span>`}<div class="secs num">${secs}</div></div>
    </div>`}
    <h2 class=${'q-text' + (cur.q && cur.q.length > 78 ? ' long' : '')}>${cur.q}</h2>
    <div class="opts">
      ${crewPause && html`<div class="blurred"><div class="msg"><b>Timeout</b><span>${crewLabel(room, room.pause.crew)} has ${Math.max(0, Math.ceil((room.pause.until - now) / 1000))}s to talk it over. Options are hidden.</span>
        ${(iCaptain || room.host) && html`<button class="btn sm" onClick=${() => send('resume')}>Back to it</button>`}</div></div>`}
      ${cur.opts ? cur.opts.map((o, i) => {
        const missed = (cur.take && cur.take.missed === i) || (duel && duel.struck.includes(i));
        const gone = (cur.removed && cur.removed.includes(i)) || missed || hidden.includes(i);
        const blank = duel && duel.blank && !o;
        const active = moling || iPick || iMate;
        let cls = 'opt';
        if (revealed) cls += i === cur.ans ? ' right' : i === cur.picked || missed ? ' wrong' : ' dim';
        else { if (blank) cls += ' blank'; if (duel && myDuel >= 0 && duel.picks[myDuel] === i) cls += ' sel'; if (missed) cls += ' missed'; else if (gone) cls += ' gone'; if (sel === i) cls += ' sel'; if (mySug === i) cls += ' sug-mine'; if (active && !gone) cls += ' can'; if (moling && !gone) cls += ' moling'; }
        const text = hacker && !revealed ? scramble(o, frac, seed * 31 + i) : o;
        return html`<button class=${cls} type="button" disabled=${revealed || gone || !active} onClick=${() => clickOpt(i)} aria-label=${blank ? `${LETTERS[i]}: hidden` : `${LETTERS[i]}: ${o}`}>
          <span class="L">${LETTERS[i]}</span><span class="t">${blank ? html`<i class="blank-bar" aria-hidden="true"></i>` : text}</span>
          ${revealed && i === cur.ans && html`<span class="mark tag" style="background:var(--right);color:var(--ink)">✓ Answer</span>`}
          ${revealed && i === cur.picked && i !== cur.ans && html`<span class="mark tag" style="background:var(--wrong);color:var(--ink)">✕ Locked</span>`}
          ${missed && html`<span class="mark tag" style="background:var(--wrong);color:var(--ink)">✕ ${duel ? 'Out' : crewLabel(room, cur.take.from)}</span>`}
          ${sugBy[i] && html`<span class="sugs">${sugBy[i].map(pid => html`<${Avatar} a=${memberOf(room, pid).avatar} size="xs" />`)}</span>`}
          ${!revealed && cur.tip && cur.tip.i === i && html`<span class=${'tip-tag' + (tipMine ? ' mine' : '')}>${tipMine ? `🕵️ ${cur.tip.by === room.me ? 'Your' : cur.tip.name + '’s'} tip` : '🕵️ Anonymous tip'}</span>`}
        </button>`;
      }) : [0, 1, 2, 3].map(() => html`<div class="opt-ph"></div>`)}
    </div>
    ${!revealed && html`<div class="q-foot">
      <div class="lifelines">
        ${(iCaptain || iPick) && room.settings.fifty && !cur.take && !duel && html`<button class="btn sm" disabled=${crew.fifty || crewPause || hidden.length > 0} onClick=${() => send('fifty')}>${crew.fifty ? '50/50 used' : '50/50'}</button>`}
        ${(iCaptain || iPick) && clock > 0 && !cur.take && !duel && html`<button class="btn sm" disabled=${crew.tout || !!room.pause} onClick=${() => send('timeout')} title="Freeze the clock for 30 seconds. Options are hidden while you talk.">${crew.tout ? 'Timeout used' : 'Timeout'}</button>`}
        ${!iPick && !iMate && cur.sugCount ? html`<span class="hint">${cur.sugCount} crew suggestion${cur.sugCount > 1 ? 's' : ''}</span>` : ''}
        ${canHide && html`<button class="btn sm card-btn hfifty" onClick=${() => { Sound.fx('fifty'); send('hfifty'); }} title=${CARDS.hfifty.how}>🙈 Hidden 50/50</button>`}
        ${hidden.length ? html`<span class="hint">🙈 Hidden 50/50: only your crew sees this</span>` : ''}
        ${canMole && !moling && html`<button class="btn sm card-btn mole" onClick=${() => { Sound.fx('tap'); setMoling(true); }} title=${CARDS.mole.how}>🕵️ Play Mole</button>`}
        ${moling && html`<span class="hint mole-hint">Tap the answer to tip them. Pick one you think is wrong.</span><button class="btn sm" onClick=${() => setMoling(false)}>Cancel</button>`}
        ${!revealed && cur.tip && !tipMine && room.myCrew === cur.crew && html`<span class="hint">Someone slipped your crew a tip. Trust it?</span>`}
      </div>
      ${duel && html`<${DuelBar} room=${room} duel=${duel} lockFor=${lockFor} sel=${sel} lockAs=${lockAs} />`}
      ${iPick && !(duel && lockFor.length > 1) && html`<div class="lock-bar">${sel == null ? html`<span class="hint">${duel ? 'Tap the punchline, then lock it in. Fastest right one wins.' : 'Tap an option, then lock it in'}</span>` : html`<button class="btn hi big lock-btn" onClick=${lock}>Lock in ${LETTERS[sel]}</button>`}</div>`}
    </div>`}
    ${revealed && html`<div class="stack">
      <div class="verdict"><span class=${'stamp' + (cur.right ? '' : ' bad')}>${words}</span>
        <div>${(cur.right || cur.delta < 0) && html`<div class=${'delta num ' + (cur.delta + (cur.bonus || 0) >= 0 ? 'pos' : 'neg')}>${cur.right ? '+' : ''}${money(cur.delta + (cur.bonus || 0))}</div>`}
        ${cur.bonus ? html`<span class="hint">Includes a ${money(cur.bonus)} on-fire bonus 🔥</span>` : !cur.right ? html`<span class="hint">The answer was ${LETTERS[cur.ans]}: ${cur.opts[cur.ans]}</span>` : ''}
        ${cur.right && cur.take ? html`<span class="hint">${crewLabel(room, cur.crew)} took it from ${crewLabel(room, cur.take.from)}</span>` : ''}
        ${cur.right && cur.sp === 'hacker' && room.kind !== 'solo' && room.run && room.run.crew === cur.crew ? html`<span class="hint">${crewLabel(room, cur.crew)} picks the next ${RUN_WORDS[room.run.left] || 'tiles'}</span>` : ''}
        ${cur.hidUsed ? html`<span class="hint">🙈 ${cur.hidUsed.name} played a Hidden 50/50 on this one</span>` : ''}</div></div>
      ${!cur.fact && canSkip && html`<div class="row next-row"><button class="btn hi" onClick=${() => send('next')}>${skipLabel}</button></div>`}
    </div>`}
  </section>`;
}

// The fun fact, on its own screen. Everyone reads it; the player who answered can skip it.
function FactCard({ room, cur, canSkip, label, nextLeft, guesser, send }) {
  const who = cur.mid === room.me ? 'You' : guesser.name;
  const jokes = !!(room.deck && room.deck.kind === 'jokes');
  // Joke decks: the fact line is a bonus joke ("Bonus: ...") and the card says so.
  const fact = jokes ? String(cur.fact || '').replace(/^bonus:\s*/i, '') : cur.fact;
  const line = cur.duel
    ? (cur.right ? `${who} won the face-off${cur.delta > 0 ? ` (+${money(cur.delta + (cur.bonus || 0))})` : ''}` : 'Nobody got it')
    : cur.take
    ? (cur.right ? `${who} took it for ${crewLabel(room, cur.crew)}` : 'Nobody got it')
    : cur.right ? `${who} got it${cur.delta > 0 ? ` (+${money(cur.delta + (cur.bonus || 0))})` : ''}`
    : cur.picked == null ? `${who} ran out of time` : `${who} missed it`;
  return html`<section class=${'q-card fact-card stk' + (cur.right ? ' good' : ' bad')} aria-label="Fun fact">
    <div class="fc-head"><span class="tag hi">${jokes ? 'Bonus groan' : 'Did you know?'}</span><span class="muted">${cur.cat} · ${money(cur.v)}</span></div>
    <p class="fc-text">${fact}</p>
    <div class="fc-ans"><span class="L">${LETTERS[cur.ans]}</span><span><b>${cur.opts[cur.ans]}</b><small>${line}</small></span></div>
    ${nextLeft != null && html`<div class="next-bar" aria-hidden="true"><i style=${`transform:scaleX(${Math.min(1, nextLeft / FACT_MS)})`}></i></div>`}
    ${canSkip ? html`<div class="row next-row"><button class="btn hi big" onClick=${() => { Sound.fx('tap'); send('next'); }}>${label}</button></div>`
      : html`<p class="hint fc-wait">${room.kind === 'invite' ? `${guesser.name} can skip this, or it moves on by itself.` : 'Up next in a moment.'}</p>`}
  </section>`;
}
const FACT_MS = 9000;

/* =================== face-offs (joke decks) =================== */

// The replay's beats, in ms from the start of the reveal: picks land on the grid one by one
// (like a pitch-location graphic), the grid is ruled, then a measuring strip slides each
// player's time out and the line drops on the winner (like a first-down measurement).
const RP = { p1: 450, p2: 1050, zone: 1800, measure: 2500, slide: 2620, line: 3800, ruling: 4300 };
const secs = (ms) => (ms / 1000).toFixed(1) + 's';

function FaceoffIntro({ room }) {
  const cur = room.cur, d = cur.duel;
  const now = useNow(true, 200);
  const left = cur.introUntil ? Math.max(0, cur.introUntil - now) : cur.introLeft || 0;
  const read = cur.introMs || 25000;
  const side = (k) => {
    const m = memberOf(room, d.mids[k]);
    return html`<span class=${'fo-p ' + crewClass(k)}><${Avatar} a=${m.avatar} size="lg" /><b>${d.mids[k] === room.me ? 'You' : m.name}</b><small>${crewLabel(room, k)}</small></span>`;
  };
  return html`<section class="takeover faceoff" aria-live="assertive"><div>
    <div class="fo-vs">${side(0)}<span class="vs" aria-label="versus">vs</span>${side(1)}</div>
    <div class="big">Face-off</div>
    <p class="fo-setup">${cur.q}</p>
    <div class=${'fo-read' + (left <= 5000 ? ' late' : '') + (cur.introLeft != null ? ' frozen' : '')} role="timer" aria-label=${`Punchlines in ${Math.ceil(left / 1000)} seconds`}>
      <span class="lbl">Punchlines in</span><div class="track"><div class="fill" style=${`transform:scaleX(${Math.min(1, left / read)})`}></div></div><b class="num">${Math.max(0, Math.ceil(left / 1000))}</b>
    </div>
    <p class="fo-how">${d.mids.includes(room.me) ? 'Read it and think it over.' : 'Your player picks.'} The fastest right punchline wins ${money(cur.v)} and the next pick.</p>
  </div></section>`;
}

// Who's locked in during a face-off. Picks stay secret until the replay.
function DuelBar({ room, duel, lockFor, sel, lockAs }) {
  return html`<div class="duel-bar">${[0, 1].map(k => {
    const id = duel.mids[k], m = memberOf(room, id);
    const mine = duel.picks[k] != null;
    return html`<div class=${'duel-p ' + crewClass(k) + (duel.locked[k] ? ' locked' : '')}>
      <${Avatar} a=${m.avatar} size="sm" />
      <span class="nm">${id === room.me ? 'You' : m.name}</span>
      ${lockFor.length > 1 && lockFor.includes(k)
        ? html`<button class="btn sm hi" disabled=${sel == null} onClick=${() => lockAs(k)}>Lock ${sel == null ? '' : LETTERS[sel]}</button>`
        : html`<b>${duel.locked[k] ? (mine ? `Locked ${LETTERS[duel.picks[k]]} · ${secs(duel.at[k])}` : 'Locked in') : 'Thinking…'}</b>`}
    </div>`;
  })}</div>`;
}

function FaceoffReplay({ room, cur, now, canSkip, label, send }) {
  const d = cur.duel;
  const miss = d.stage === 'miss';
  const log = (miss ? d.log.find(l => l.round === d.round) : null) || d.log[d.log.length - 1] || { picks: [null, null], at: [null, null], right: [false, false] };
  const t0 = miss ? d.missUntil - d.missMs : cur.revealAt;
  const t = now - t0;
  const opts = cur.opts || ['', '', '', ''];
  const ans = miss ? null : cur.ans;
  const win = miss ? -1 : d.winner;
  const order = [0, 1].filter(k => log.picks[k] != null).sort((a, b) => log.at[a] - log.at[b]);
  const landed = (k) => t >= (order.indexOf(k) === 0 ? RP.p1 : RP.p2);
  const ruled = t >= RP.zone, measuring = t >= RP.measure, slid = t >= RP.slide, lined = t >= RP.line, ruling = t >= RP.ruling;
  const nm = (k) => (d.mids[k] === room.me ? 'You' : memberOf(room, d.mids[k]).name);
  const both = log.right[0] && log.right[1];
  // Sounds ride the replay: thuds as picks land, the chain, then the call.
  const fired = useRef(null);
  useEffect(() => {
    const beats = { p1: order.length > 0, p2: order.length > 1, measure: order.length > 0, line: true };
    if (!fired.current) fired.current = Object.fromEntries(Object.keys(beats).map(b => [b, t >= RP[b]]));
    for (const b of Object.keys(beats)) {
      if (fired.current[b] || t < RP[b]) continue;
      fired.current[b] = true;
      if (!beats[b]) continue;
      if (b === 'p1' || b === 'p2') Sound.fx('thud');
      else if (b === 'measure') Sound.fx('measure');
      else {
        Sound.music(musicFor(room));
        if (win >= 0) { Sound.fx('right', { big: both }); if (d.mids[win] === room.me) confetti(['#35e07d', '#ffe94a', '#ffffff']); }
        else Sound.fx('wrong');
      }
    }
  }, [Math.floor(t / 100)]);
  const times = order.map(k => log.at[k]);
  const span = Math.max(2000, (times.length ? Math.max(...times) : 0) * 1.3);
  const pct = (ms) => Math.min(97, Math.max(3, (ms / span) * 100));
  const step = span <= 4000 ? 500 : span <= 12000 ? 1000 : 5000;
  const ticks = [];
  for (let v = step; v < span; v += step) ticks.push(v);
  let stamp, sub;
  if (miss) { stamp = 'No good'; sub = 'Nobody landed it. The punchlines go blank: who was paying attention?'; }
  else if (win < 0) { stamp = 'No good'; sub = `Nobody gets the ${money(cur.v)}.`; }
  else if (both) { stamp = `Faster by ${secs(Math.abs(log.at[0] - log.at[1]))}`; sub = `Both landed it. ${nm(win)} got there first.`; }
  else { stamp = 'Only one landed'; sub = `${nm(win)} picked the real punchline.`; }
  return html`<section class=${'q-card stk replay' + (lined ? (win >= 0 ? ' good' : ' bad') : '')} aria-label="Face-off replay">
    <div class="q-head"><span class="tag hi">Replay</span><span class="cat">${cur.cat}</span><span class="val num">${money(cur.v)}</span><span class="grow"></span><span class="hint">${miss ? 'Round one' : d.round === 2 ? 'Blank round' : 'Face-off'}</span></div>
    <p class="rp-setup">${cur.q}</p>
    <div class="zone" role="img" aria-label=${`Where the picks landed. ${order.map(k => `${nm(k)}: ${LETTERS[log.picks[k]]}`).join(', ') || 'No picks.'}`}>
      ${[0, 1, 2, 3].map(i => {
        const hit = ruled && ans === i;
        const out = ruled && ans !== i && order.some(k => log.picks[k] === i);
        const gone = !miss && d.round === 2 && d.struck.includes(i) && !hit && !out;
        return html`<div class=${'zone-sq' + (hit ? ' hit' : '') + (out ? ' out' : '') + (gone ? ' gone' : '')}>
          <span class="L">${LETTERS[i]}</span><span class="t">${opts[i]}</span>
          <span class="balls">${order.filter(k => log.picks[k] === i && landed(k)).map(k => html`<span class=${'ball ' + crewClass(k)} title=${nm(k)}><${Avatar} a=${memberOf(room, d.mids[k]).avatar} size="xs" /></span>`)}</span>
          ${hit && html`<span class="zone-mark" aria-label="The punchline">✓</span>`}${out && html`<span class="zone-mark" aria-label="Missed">✕</span>`}
        </div>`;
      })}
    </div>
    <div class=${'measure' + (measuring ? ' on' : '')} aria-hidden=${!measuring}>
      <div class="field">
        ${ticks.map(v => html`<i class="yd" style=${`left:${(v / span) * 100}%`}></i>`)}
        ${measuring && order.map(k => html`<span class=${'marker ' + crewClass(k) + (pct(log.at[k]) > 62 ? ' flip' : '') + (ruled && !log.right[k] ? ' nope' : '') + (k === win && lined ? ' won' : '')} style=${`left:${slid ? pct(log.at[k]) : 0}%`}>
          <span class="tag-l"><b>${nm(k)}</b> ${secs(log.at[k])}${ruled && !log.right[k] ? ' ✕' : ''}</span></span>`)}
        ${lined && win >= 0 && html`<span class="line-to-gain" style=${`left:${pct(log.at[win])}%`}></span>`}
      </div>
      <div class="scale" aria-hidden="true"><small style="left:0">0s</small>${ticks.map(v => html`<small style=${`left:${(v / span) * 100}%`}>${secs(v).replace('.0s', 's')}</small>`)}</div>
      ${measuring && [0, 1].filter(k => log.picks[k] == null).map(k => html`<p class="hint">${nm(k)} didn’t lock in.</p>`)}
    </div>
    ${lined && html`<div class="rp-verdict"><span class=${'stamp' + (win >= 0 ? '' : ' bad')}>${stamp}</span>
      ${win >= 0 && ruling && html`<div class="delta num pos">+${money(cur.delta + (cur.bonus || 0))}</div>`}
      <p class="hint">${sub}${ruling && win >= 0 ? ` ${crewLabel(room, win)} picks next.` : ''}${cur.bonus && ruling ? ` Includes a ${money(cur.bonus)} on-fire bonus 🔥` : ''}</p></div>`}
    ${!miss && ruling && !cur.fact && canSkip && html`<div class="row next-row"><button class="btn hi" onClick=${() => send('next')}>${label}</button></div>`}
  </section>`;
}

function Sudden({ room, send }) {
  const sd = room.sudden;
  const now = useNow(!sd.revealed, 150);
  const [sel, setSel] = useState(null);
  const left = Math.max(0, sd.deadline - now);
  const myK = room.kind === 'party' && room.host ? null : room.myCrew;
  const canLock = (k) => !sd.revealed && !sd.locked[k] && actsFor(room, room.crews[k].cap);
  return html`<section class="q-card stk">
    <div class="q-head"><span class="tag gum">Sudden death${sd.round > 1 ? ` · round ${sd.round}` : ''}</span><span class="cat">from ${sd.from}</span></div>
    <p class="hint">Scores are tied. Both captains lock an answer at the same time. One right, one wrong wins it.</p>
    ${!sd.revealed && html`<div class=${'timer' + (left < 5000 ? ' late' : '')}><div class="track"><div class="fill" style=${`transform:scaleX(${left / 20000})`}></div></div><div class="secs num">${Math.ceil(left / 1000)}</div></div>`}
    <h2 class=${'q-text' + (sd.q && sd.q.length > 78 ? ' long' : '')}>${sd.q}</h2>
    <div class="opts">${sd.opts.map((o, i) => {
      let cls = 'opt';
      if (sd.revealed) cls += i === sd.ans ? ' right' : ' dim';
      else if (sel === i) cls += ' sel';
      const anyLock = [0, 1].some(canLock);
      return html`<button class=${cls + (anyLock ? ' can' : '')} disabled=${!anyLock} onClick=${() => setSel(i)}><span class="L">${LETTERS[i]}</span><span class="t">${o}</span></button>`;
    })}</div>
    <div class="sd-picks">${[0, 1].map(k => html`<div class=${'sd-pick ' + crewClass(k)}><span>${crewLabel(room, k)}</span>
      ${sd.revealed ? html`<b>${sd.picks[k] == null ? 'No answer' : LETTERS[sd.picks[k]]} ${sd.picks[k] === sd.ans ? '✓' : '✕'}</b>`
        : sd.locked[k] ? html`<b>Locked${sd.picks[k] != null ? ' ' + LETTERS[sd.picks[k]] : ''}</b>`
        : canLock(k) ? html`<button class="btn sm hi" disabled=${sel == null} onClick=${() => send('sdLock', { i: sel, crew: k })}>Lock ${sel == null ? '' : LETTERS[sel]}</button>` : html`<span class="muted">Thinking…</span>`}
    </div>`)}</div>
    ${sd.revealed && sd.fact && html`<p class="fact"><b>Did you know?</b> ${sd.fact}</p>`}
    ${sd.revealed && room.host && html`<button class="btn hi" onClick=${() => send('sdNext')}>Continue</button>`}
  </section>`;
}

function HostBar({ room, send }) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const ph = room.phase;
  const paused = room.pause && room.pause.by === 'host';
  const picker = room.picker ? memberOf(room, room.picker) : null;
  return html`<div class="hostbar" aria-label="Host controls">
    <span class="lbl">Host</span>
    ${paused ? html`<button class="btn sm hi" onClick=${() => send('resume')}>Resume</button>` : html`<button class="btn sm" onClick=${() => send('pause')}>Pause</button>`}
    ${ph === 'ask' && room.cur.clock > 0 && html`<button class="btn sm" onClick=${() => send('addTime')}>+10s</button>`}
    ${ph === 'ask' && room.kind !== 'solo' && html`<button class="btn sm flat" onClick=${() => send('noAnswer')}>No answer</button>`}
    ${ph === 'intro' && html`<button class="btn sm flat" onClick=${() => send('next')}>Skip intro</button>`}
    ${ph === 'board' && room.kind === 'invite' && picker && !picker.guest && picker.id !== room.me && html`<button class="btn sm flat" onClick=${() => send('skip')}>Skip ${picker.name}</button>`}
    ${room.canUndo && (ph === 'reveal' || ph === 'board') && html`<button class="btn sm flat" onClick=${() => send('undo')}>Undo last answer</button>`}
    ${confirmEnd
      ? html`<span class="row" style="gap:6px"><span class="lbl">End now?</span><button class="btn sm gum" onClick=${() => { setConfirmEnd(false); send('end'); }}>End game</button><button class="btn sm flat" onClick=${() => setConfirmEnd(false)}>Keep playing</button></span>`
      : html`<button class="btn sm flat" onClick=${() => setConfirmEnd(true)}>End game</button>`}
  </div>`;
}

/* =================== invite pop-up, host menu, text share =================== */

const smsLink = (body) => `sms:?&body=${encodeURIComponent(body)}`;
const isPhone = () => /iPhone|iPad|Android|Mobi/i.test(navigator.userAgent);

// JC: "an invite code pop-up so I can share it". Tap the room code at the top any time.
function InviteSheet({ room, onClose }) {
  const url = link('/' + room.code);
  const qrSvg = useMemo(() => { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }, [url]);
  const body = `Join my Mind Heist 🧠💰 Room ${room.code}\n${url}`;
  const share = async () => { const r = await shareOrCopy({ title: 'Join my Mind Heist', text: `Join my Mind Heist 🧠💰 Room ${room.code}`, url }); if (r === 'copied') toast('Invite link copied. Paste it in the chat.'); };
  return html`<${Sheet} title="Invite your crew" onClose=${onClose}>
    <div class="invite-pop">
      <div class="ip-code"><span class="tag hi">Room code</span><div class="code num">${room.code}</div><div class="url">${url.replace(/^https?:\/\//, '')}</div></div>
      <div class="qr" aria-label="QR code for the invite link" dangerouslySetInnerHTML=${{ __html: qrSvg }}></div>
      <div class="ip-btns">
        ${isPhone() && html`<a class="btn hi big" href=${smsLink(body)}>Text the invite</a>`}
        <button class=${'btn' + (isPhone() ? '' : ' hi big')} onClick=${share}>${isPhone() ? 'Share…' : 'Send invite'}</button>
        <button class="btn" onClick=${async () => toast((await copyText(url)) ? 'Link copied.' : 'Copy failed.')}>Copy link</button>
      </div>
      <p class="muted">They tap the link, make a profile and land in your room. Or they type the code on the home screen.</p>
    </div>
  </${Sheet}>`;
}

// On phones the host's controls live behind one Host button at the top (the bar of buttons
// took a whole row and ran off the screen). The look can change here at any point.
function HostMenu({ room, send, onClose, invite }) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const ph = room.phase;
  const picker = room.picker ? memberOf(room, room.picker) : null;
  const go = (type, extra) => { send(type, extra); onClose(); };
  return html`<${Sheet} title="Host" onClose=${onClose}>
    <div class="host-menu">
      <button class="btn" onClick=${() => go('pause')}>Pause the game</button>
      ${ph === 'ask' && room.cur && room.cur.clock > 0 && html`<button class="btn" onClick=${() => go('addTime')}>Add 10 seconds</button>`}
      ${ph === 'ask' && room.kind !== 'solo' && html`<button class="btn" onClick=${() => go('noAnswer')}>No answer: close this question</button>`}
      ${ph === 'intro' && html`<button class="btn" onClick=${() => go('next')}>Skip the intro</button>`}
      ${ph === 'board' && room.kind === 'invite' && picker && !picker.guest && picker.id !== room.me && html`<button class="btn" onClick=${() => go('skip')}>Skip ${picker.name}'s pick</button>`}
      ${room.canUndo && (ph === 'reveal' || ph === 'board') && html`<button class="btn" onClick=${() => go('undo')}>Undo the last answer</button>`}
      ${room.kind === 'invite' && html`<button class="btn" onClick=${invite}>Invite players</button>`}
    </div>
    <h3>Look</h3>
    <div class="pills host-looks">${THEME_IDS.map(id => html`<button class="pill" aria-pressed=${room.settings.theme === id} onClick=${() => send('theme', { theme: id })}>${THEMES[id].name}</button>`)}</div>
    <div class="host-end">${confirmEnd
      ? html`<span>End the game now?</span><button class="btn gum" onClick=${() => go('end')}>End game</button><button class="btn flat" onClick=${() => setConfirmEnd(false)}>Keep playing</button>`
      : html`<button class="btn flat" onClick=${() => setConfirmEnd(true)}>End game</button>`}</div>
  </${Sheet}>`;
}

// JC: share the board "in text message format": the board as an emoji grid laid out like the
// real board (a row per dollar value), shown as a text bubble, sent with Messages or the
// share sheet.
const HEART = ['💗', '💙'];
function boardText(room, res) {
  const solo = room.kind === 'solo';
  const rows = [0, 1, 2, 3].map(r => room.board.map(col => {
    const t = col.tiles[r];
    if (!t || !t.taken || !t.res) return '⬛';
    if (solo) return t.sp === 'hacker' ? (t.res.right ? '⚡' : '💀') : t.sp === 'double' && t.res.right ? '💎' : t.res.right ? '🟩' : '🟥';
    if (!t.res.right || t.res.both) return '✖️';
    return HEART[t.res.crew] || '🟩';
  }).join(''));
  const head = `🧠 Mind Heist${room.deck.no ? ' No. ' + room.deck.no : ''} · ${room.deck.title}`;
  const lines = [head];
  if (solo) lines.push(`${money(room.crews[0].haul)} · ${room.crews[0].right}/12${res && res.streak ? ` 🔥${res.streak}` : ''}`);
  else room.crews.forEach((c, k) => lines.push(`${HEART[k]} ${crewLabel(room, k)} ${money(c.haul)}${room.winner === k ? ' 👑' : ''}`));
  lines.push(...rows);
  if (!solo && room.mvp) { const m = memberOf(room, room.mvp); lines.push(`MVP ${m.avatar} ${m.name}${room.stats && room.stats[m.id] ? ' ' + money(room.stats[m.id].earn) : ''}`); }
  return lines.join('\n');
}

function TextShare({ room, res }) {
  const text = boardText(room, res);
  const url = link('/');
  const body = `${text}\n${url.replace(/^https?:\/\//, '')}`;
  const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const share = async () => { const r = await shareOrCopy({ title: 'Mind Heist', text, url }); if (r === 'copied') toast('Copied. Paste it in the group chat.'); };
  return html`<section class="textshare stk" aria-label="Share the board">
    <div class="ts-phone">
      <div class="ts-head"><span class="ts-av" aria-hidden="true">🧠</span><b>The group chat</b><small>Today ${time}</small></div>
      <div class="ts-bubble"><pre>${text}</pre><span class="ts-tap" aria-hidden="true">‼️</span></div>
      <span class="ts-delivered">Delivered</span>
    </div>
    <div class="row ts-btns">
      ${isPhone() && html`<a class="btn hi" href=${smsLink(body)}>Text it</a>`}
      <button class=${'btn' + (isPhone() ? '' : ' hi')} onClick=${share}>${isPhone() ? 'Share…' : 'Share the board'}</button>
      <button class="btn flat" onClick=${async () => toast((await copyText(body)) ? 'Copied. Paste it in the group chat.' : 'Copy failed.')}>Copy</button>
    </div>
  </section>`;
}

function PauseVeil({ room, send, tv }) {
  if (!room.pause || room.pause.by !== 'host' || !LIVE.includes(room.phase)) return null;
  if (room.host && !tv) return null; // the host sees the bar, not a wall
  return html`<div class="paused" role="dialog" aria-label="Paused"><div class="card stk">
    <span style="font-size:56px">⏸️</span><h2>Paused by the host</h2><p>Hang tight. The clock is frozen.</p>
  </div></div>`;
}

/* =================== final =================== */

function Final({ room, send, nav, tv, invite }) {
  const [deckSheet, setDeckSheet] = useState(false);
  const solo = room.kind === 'solo';
  const res = room.results && room.me ? room.results[room.me] : null;
  const w = room.winner;
  const mvp = room.mvp ? memberOf(room, room.mvp) : null;
  const myStats = room.stats && room.me ? room.stats[room.me] : null;
  const challenge = async () => {
    try {
      const r = await api('POST', '/challenges', { code: room.code });
      const url = link('/c/' + r.id);
      const out = await shareOrCopy({ title: 'Mind Heist challenge', text: `Beat my ${money(room.crews[0].haul)} on ${room.deck.title}`, url });
      if (out === 'copied') toast('Challenge link copied. Send it to a friend.', 'win');
    } catch (e) { toast(e.message, 'err'); }
  };

  return html`<div class="final">
    ${solo
      ? html`<section class="winner solo stk">
          <span class="tag">${room.challengeId ? 'Challenge run' : res && res.official ? 'Official daily' : 'Practice run'}</span>
          <h1 class="num">${money(room.crews[0].haul)}</h1>
          <p style="font-weight:700">${room.crews[0].right} of 12 right${res && res.challenge ? ` · ${res.challenge.outcome === 'w' ? `You beat ${res.challenge.vs}` : res.challenge.outcome === 't' ? `Tied with ${res.challenge.vs}` : `${res.challenge.vs} wins this one`} (${money(res.challenge.theirs)})` : ''}</p>
          <div class="row" style="justify-content:center">
            ${!room.challengeId && html`<button class="btn gum" onClick=${challenge}>Challenge a friend</button>`}
            ${room.challengeId && html`<button class="btn" onClick=${() => nav('/c/' + room.challengeId)}>See the challenge</button>`}
          </div>
        </section>`
      : html`<section class=${'winner stk ' + (w === -1 ? 'tie' : crewClass(w))}>
          <span class="tag">${room.ended ? 'Ended early' : room.suddenWin != null ? 'Won in sudden death' : 'Final'}</span>
          <${Fit} as="h1" fit=${w + crewLabel(room, Math.max(0, w))} min=${22}>${w === -1 ? 'Dead heat.' : html`<span class="pname">${crewLabel(room, w)}</span> pulled it off`}<//>
          ${mvp && html`<p style="font-weight:700">${th().mvp}: ${mvp.avatar} <span class="pname">${mvp.id === room.me ? 'You' : mvp.name}</span>${room.stats[mvp.id] ? ` with ${money(room.stats[mvp.id].earn)}` : ''}</p>`}
        </section>
        <div class="hauls">${room.crews.map((c, k) => html`<div class=${'haul-card stk'} style=${`background:var(--${k ? 'aqua' : 'gum'})`}>
          <span style="font-weight:800">${crewLabel(room, k)}${w === k ? ' 👑' : ''}</span><span class="amt num">${money(c.haul)}</span>
          <span style="font-weight:700">${c.right} right · ${c.wrong} missed</span>
          <span class="mems row" style="gap:4px">${c.mem.map(id => html`<${Avatar} a=${memberOf(room, id).avatar} size="sm" />`)}</span></div>`)}</div>`}

    ${!tv && html`<div class="row final-actions">
      ${room.host && !solo && html`<button class="btn hi big" onClick=${() => setDeckSheet(true)}>Run it back</button>`}
      ${room.host && !solo && html`<button class="btn" onClick=${() => send('newCrews')}>New crews</button>`}
      ${room.host && room.kind === 'invite' && html`<button class="btn" onClick=${invite}>Invite more</button>`}
      <button class="btn" onClick=${() => nav('/')}>Home</button>
      ${!room.host && !solo && html`<span class="muted">Waiting for the host to run it back.</span>`}
    </div>`}
    ${!tv && room.me && html`<section class="mine stk">
      ${!res ? html`<p>Banking your haul…</p>` : html`
        <div class="row" style="justify-content:space-between"><div><span class="muted">${solo ? 'Added to your haul' : 'Your take'}</span><div class="big num">+${money(res.earned)}</div>
          ${!solo && myStats && html`<span class="muted">${money(myStats.earn)} from your turns${res.won ? ` + ${money(250)} win bonus` : ''}</span>`}</div>
          <div style="text-align:right;display:grid;justify-items:end"><span class="flame" style="font-size:28px">🔥 ${res.streak}</span><span class="muted">${res.froze ? 'Streak saved by a freeze' : res.streak === 1 ? 'day streak' : 'days in a row'}</span></div></div>
        <div class="row"><span class="tag">${res.rank}</span>${res.rankUp && html`<span class="tag hi">Rank up!</span>`}</div>
        ${res.badges && res.badges.length > 0 && html`<div class="row">${res.badges.map(b => html`<span class="badge"><i>${BADGE_ICONS[b]}</i>${BADGES[b] ? BADGES[b][0] : b}</span>`)}</div>`}`}
    </section>`}

    ${!tv && html`<${TextShare} room=${room} res=${res} />`}
    ${room.recap && html`<section class="recap stk"><details>
      <summary>Every answer from this board</summary>
      ${room.recap.map(col => html`<div><h3 style="margin-top:12px">${col.name}</h3><ol>${col.tiles.map(t => html`<li><b>${money(t.v)}${t.sp ? (t.sp === 'hacker' ? ' ⚡' : ' 💎') : ''}</b><span>${t.q}<br /><b>${t.a}</b>${t.res ? (t.res.right ? ' ✓' : ' ✕') + (room.kind !== 'solo' ? ` ${memberOf(room, t.res.mid).name}${t.res.take && t.res.right ? ' (take)' : ''}` : '') : ' (not played)'}</span></li>`)}</ol></div>`)}
    </details></section>`}
    ${deckSheet && html`<${RematchSheet} room=${room} send=${send} onClose=${() => setDeckSheet(false)} />`}
  </div>`;
}

function RematchSheet({ room, send, onClose }) {
  const [home, setHome] = useState(null);
  const [deck, setDeck] = useState(null);
  // After a joke game the next joke deck is ready to go (and joke decks list first).
  const jokes = room.deck.kind === 'jokes';
  useEffect(() => { api('GET', '/home').then(h0 => {
    // Capra's Lab hosts also get the hidden decks, first when this game was on one of them.
    const brews = (h0.brews || []).map(d => ({ ...d, brew: true }));
    const onBrew = brews.some(d => d.id === room.deck.id);
    const h = { ...h0, vault: onBrew ? [...brews, ...h0.vault] : [...h0.vault, ...brews] };
    const same = h.vault.filter(d => (d.kind === 'jokes') === jokes);
    const i = same.findIndex(d => d.id === room.deck.id);
    const next = jokes && i >= 0 ? same[(i + 1) % same.length] : null;
    setHome({ ...h, vault: [...same, ...h.vault.filter(d => (d.kind === 'jokes') !== jokes)] });
    setDeck((next || h.vault.find(d => d.id !== room.deck.id) || h.today).id);
  }).catch(e => toast(e.message, 'err')); }, []);
  return html`<${Sheet} title="Run it back" onClose=${onClose}>
    <p>Same crews, new deck, new coin toss.</p>
    ${!home ? html`<div class="empty">Loading decks…</div>` : html`<div class="deck-list">${home.vault.map(d => html`<button class="deck-opt" aria-pressed=${deck === d.id} onClick=${() => setDeck(d.id)}><b>${d.title}</b><span>${d.id === room.deck.id ? html`<span class="tag">Just played</span>` : d.brew ? html`<span class="tag lab">🔒 Hidden</span>` : d.id === home.today.id ? html`<span class="tag hi">Today</span>` : ''}</span><small>${d.cats.join(', ')}</small></button>`)}</div>`}
    <button class="btn hi big" disabled=${!deck} onClick=${async () => { if (await send('rematch', { deckId: deck })) onClose(); }}>Flip the coin</button>
  </${Sheet}>`;
}
