import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import htm from 'htm';
import { Sound } from './sound.js';
import { serverNow } from './api.js';

export const html = htm.bind(h);

export const AVATARS = ['🦝', '🦊', '🐈‍⬛', '🦉', '🐍', '🦈', '🐙', '👾', '🤖', '🦖', '🐸', '🦄', '🐼', '🐯', '🦩', '🐝', '🐺', '🦔', '🐢', '🦜', '🕶️', '🎭', '💎', '🧠'];
export const REACTS = ['🔥', '💀', '😭', '🧠', '🫡', '👀', '🤌', '💸'];
export const BADGE_ICONS = {
  first_heist: '🗝️', big_brain: '🧠', clutch: '⏱️', hacker_slayer: '🛡️', double_trouble: '✌️', on_fire: '🔥', flawless: '💎',
  mvp: '👑', comeback: '🔁', challenger: '🥊', squad: '👯', streak_3: '🎩', streak_7: '📆', streak_30: '🏛️',
};
export const BADGES = {
  first_heist: ['First heist', 'Finish your first game'],
  big_brain: ['Big brain', 'Get a $400 tile right'],
  clutch: ['Clutch', 'Lock a right answer with 3 seconds or less left'],
  hacker_slayer: ['Hacker slayer', 'Beat a Hacker tile'],
  double_trouble: ['Double trouble', 'Get the Double right'],
  on_fire: ['On fire', 'Earn an on-fire bonus'],
  flawless: ['Flawless', 'Get all 12 tiles right in a run'],
  mvp: ['MVP', 'Top earner in a crew game'],
  comeback: ['Comeback', 'Win after your crew trailed by $600 or more'],
  challenger: ['Called out', 'Win a challenge'],
  squad: ['Squad', 'Have 5 friends'],
  streak_3: ['Hat trick', 'Play 3 days in a row'],
  streak_7: ['Week one', 'Play 7 days in a row'],
  streak_30: ['Lifer', 'Play 30 days in a row'],
};

export const money = (n) => (n < 0 ? '−$' : '$') + Math.abs(n || 0).toLocaleString('en-US');
export const LETTERS = ['A', 'B', 'C', 'D'];
export const crewClass = (k) => (k === 1 ? 'c1' : 'c0');

export function Avatar({ a, size = '', crew = null, cls = '' }) {
  return html`<span class=${`av ${size} ${crew != null && crew >= 0 ? crewClass(crew) : ''} ${cls}`} aria-hidden="true">${a || '🦝'}</span>`;
}

/* ---------- toasts ---------- */
let pushToast = () => {};
export function toast(text, kind = '') { pushToast({ text, kind, id: Math.random() }); }
export function Toasts() {
  const [list, setList] = useState([]);
  useEffect(() => {
    pushToast = (t) => {
      setList(l => [...l.slice(-2), t]);
      setTimeout(() => setList(l => l.filter(x => x.id !== t.id)), t.kind === 'err' ? 4200 : 3000);
    };
  }, []);
  return html`<div class="toasts" role="status" aria-live="polite">${list.map(t => html`<div class=${'toast ' + t.kind} key=${t.id}>${t.text}</div>`)}</div>`;
}

/* ---------- confetti ---------- */
export function confetti(colors = ['#ffe94a', '#ff5fa8', '#2de1d1', '#ffffff']) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
    p.style.animationDelay = Math.random() * 0.6 + 's';
    p.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    p.style.borderRadius = i % 3 ? '3px' : '50%';
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4400);
}

/* ---------- sound button (always bottom-left) ---------- */
export function SoundButton() {
  const [on, setOn] = useState(Sound.on);
  useEffect(() => Sound.subscribe(setOn), []);
  return html`<button class="sound" type="button" aria-label=${on ? 'Turn sound off' : 'Turn sound on'} title="Sound (M)" onClick=${() => Sound.toggle()}>
    ${on
      ? html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>`
      : html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="m17 9 5 5M22 9l-5 5"/></svg>`}
  </button>`;
}

/* ---------- time ---------- */
export function useNow(active = true, ms = 200) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => set(x => x + 1), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return serverNow();
}

export function useCountUp(value, ms = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(), a = from.current, b = value;
    if (a === b) return;
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (b - a) * e));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = b; };
  }, [value]);
  return shown;
}

export function Money({ value, cls = '' }) {
  const v = useCountUp(value);
  return html`<span class=${'num ' + cls}>${money(v)}</span>`;
}

/* ---------- sharing ---------- */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
  try {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok;
  } catch (e) { return false; }
}
export async function shareOrCopy({ title, text, url }) {
  if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ title, text, url }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  }
  const ok = await copyText(url ? `${text ? text + '\n' : ''}${url}` : text);
  return ok ? 'copied' : 'fail';
}

export function Sheet({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return html`<div class="veil" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="sheet stk" role="dialog" aria-modal="true" aria-label=${title} style=${wide ? 'width:min(100%,820px)' : ''}>
      <div class="sheet-head"><h2>${title}</h2><button class="x" type="button" aria-label="Close" onClick=${onClose}>×</button></div>
      ${children}
    </div>
  </div>`;
}

// Pacific midnight countdown for the next drop.
export function untilNextDrop(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(now));
  const g = (t) => +parts.find(p => p.type === t).value;
  const secs = 86400 - (g('hour') * 3600 + g('minute') * 60 + g('second'));
  const hh = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60);
  return hh ? `${hh}h ${mm}m` : `${mm}m`;
}

// Emoji grid for sharing a run.
export function gridEmoji(grid) {
  const map = { R: '🟩', W: '🟥', H: '⚡', X: '💀', D: '💎', '-': '⬛' };
  return grid.split('|').map(row => [...row].map(ch => map[ch] || '⬛').join('')).join('\n');
}

export const pickWord = (list, seed) => list[Math.abs(seed) % list.length];
