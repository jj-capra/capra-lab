/* Daily Runs (JC, Nov 27 2026: "a “Start my Daily Runs” for all the games that have trophies"): every game whose
   daily can win a trophy, one after another. The hub starts them (public/lab/today.js); each game's results say
   what's next.

     import { RUNS, runsStatus, startRuns, session, nextAfter, runUrl } from '/lab/runs.js';
     <lab-runs-next></lab-runs-next>         on a game's results: "Daily Runs 3 of 8 · Next: Goat Getaway ▸"
                                             (the game from the page's path, or game="..."; `done` marks it done)

   <lab-daily-board> (/lab/daily.js) carries one, so every game on the daily boards has it on its results; Goat
   Getaway and Screensaver put one on theirs. Opening a game with ?runs makes its daily button glow (RUNS[].go)
   so the next tap starts it. The run of the day is kept on this phone (capra-lab.runs: the day, who, which are
   done); what's really done comes from the servers (runsStatus), and the hub hands that over when it starts. */
import { BOARDS, fmtPoints, fmtMs } from './daily-boards.mjs';
import { walletDay } from './wallet-catalog.mjs';

const emojiOf = (g, e) => (Object.values(BOARDS).find((b) => b.game === g) || {}).emoji || e;
// Quick ones first, the long heist last.
export const RUNS = [
  { game: 'three-clue-crew', name: 'Three Clue Crew', what: 'Today’s 10', go: '#dailyBtn' },
  { game: 'puzzled-spin', name: 'Puzzled Spin', what: 'Today’s Spin', go: '#dailyBtn' },
  { game: 'no-cap', name: 'No Cap', what: 'Today’s ten', go: '#dailyBtn' },
  { game: 'goat-getaway', name: 'Goat Getaway', what: 'Today’s pen', go: '#openBtn', first: '#tabToday[aria-selected="false"]', emoji: '🐐' },
  { game: 'screensaver', name: 'Screensaver', what: 'Today’s run', go: '#dailyBtn', emoji: '📺' },
  { game: 'par-tee-time', name: 'Par-Tee Time', what: 'Daily 3', go: '#goDaily' },
  { game: 'tough-sleddin', name: 'Tough Sleddin', what: 'Today’s run', go: '#dailyBtn' },
  { game: 'mind-heist', name: 'Mind Heist', what: 'Today’s drop', go: '.drop-card .btn.hi' },
].map((r) => ({ ...r, emoji: emojiOf(r.game, r.emoji), href: `/${r.game}/` }));
export const runUrl = (r) => r.href + '?runs';

const KEY = 'capra-lab.runs';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const me = () => { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? p : null; } catch { return null; } };
const gameOfPath = () => (location.pathname.split('/')[1] || '');
function changed() { window.dispatchEvent(new Event('capra-runs:changed')); }

// Today's Daily Runs on this phone, or null (none started today, or someone else signed in since).
export function session() {
  const p = me();
  if (!p) return null;
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    return s && s.day === walletDay() && s.handle === p.handle && Array.isArray(s.done) ? s : null;
  } catch { return null; }
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } changed(); }
// Start (or carry on with) today's Daily Runs; `done` is what the servers say is already done.
export function startRuns(done = []) {
  const p = me();
  if (!p) return null;
  const s = session() || { day: walletDay(), handle: p.handle, done: [] };
  for (const g of done) if (!s.done.includes(g)) s.done.push(g);
  save(s);
  return s;
}
export function markDone(game) {
  const s = session();
  if (!s || s.done.includes(game) || !RUNS.some((r) => r.game === game)) return;
  s.done.push(game);
  save(s);
}
// The next game not done yet after this one (round to the start for any skipped), or null when they're all done.
export function nextAfter(game, s = session()) {
  const done = new Set((s && s.done) || []);
  const i = RUNS.findIndex((r) => r.game === game);
  for (let k = 1; k <= RUNS.length; k++) {
    const r = RUNS[(i + k + RUNS.length) % RUNS.length];
    if (r.game !== game && !done.has(r.game)) return r;
  }
  return null;
}

/* What's done today, from the servers: the daily boards (your rank on any of a game's boards), Goat Getaway's pen
   and Screensaver's run. → { [game]: { done, started, line, lead } }, or null for a guest. */
async function post(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('no');
  return r.json();
}
export async function runsStatus() {
  const p = me();
  if (!p) return null;
  const lab = { name: p.name, code: p.code };
  const [daily, goat, ss] = await Promise.all([
    post('/api/daily/today', lab).catch(() => null),
    post('/goat-getaway/api/today', { lab }).catch(() => null),
    post('/screensaver/api/hello', { lab }).catch(() => null),
  ]);
  const out = Object.fromEntries(RUNS.map((r) => [r.game, { done: false, started: false, line: '', lead: '', known: false }]));
  if (daily) {
    const playing = {};
    for (const b of daily.boards || []) {
      const B = BOARDS[b.board];
      if (!B || !out[B.game]) continue;
      const o = out[B.game];
      playing[B.game] = (playing[B.game] || 0) + b.of;
      // one board: who leads; a game with a board a grade or shelf: how many are playing
      o.lead = Object.values(BOARDS).filter((x) => x.game === B.game).length === 1 ? `👑 ${b.top.name} · ${fmtPoints(b.board, b.top.points)}` : `${playing[B.game]} playing today`;
    }
    for (const r of RUNS) if (Object.values(BOARDS).some((b) => b.game === r.game)) out[r.game].known = true;
    for (const [id, m] of Object.entries(daily.mine || {})) {
      const B = BOARDS[id], o = B && out[B.game];
      if (!o) continue;
      if (m.rank && (!o.done || m.rank < o.rank)) Object.assign(o, { done: true, rank: m.rank, line: `#${m.rank} of ${m.of} · ${fmtPoints(id, m.points)}${Object.values(BOARDS).filter((x) => x.game === B.game).length > 1 ? ` · ${B.variant}` : ''}` });
      else if (!m.rank) o.started = true;
    }
  }
  if (goat) {
    const o = out['goat-getaway'], m = goat.me, race = goat.race;
    o.known = true;
    if (m && m.ms != null) Object.assign(o, { done: true, line: `Out in ${fmtMs(m.ms)} · ${m.moves} moves${race && race.rank ? ` · #${race.rank} of ${race.solvers}` : ''}${m.parGem ? ' · 💎' : ''}` });
    else if (m && m.open) o.started = true;
    if (race && race.top && race.top[0]) o.lead = `👑 ${race.top[0].name} · ${fmtMs(race.top[0].ms)}`;
  }
  if (ss) {
    const o = out.screensaver;
    o.known = true;
    if (ss.mine) Object.assign(o, { done: true, line: `#${ss.mine.rank} of ${ss.mine.of} · ${Number(ss.mine.score || 0).toLocaleString('en-US')} pts` });
  }
  return out;
}

/* ---------- <lab-runs-next>: on a game's results, what's next ---------- */
const CSS = `
  :host { display: block; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; text-align: left; }
  :host([hidden]) { display: none; }
  .r { margin-top: 12px; padding: 12px; border-radius: 16px; background: #16141F; border: 3px solid #120E18; box-shadow: 3px 4px 0 #05030A; color: #FFF8EC; }
  .h { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 8px; margin: 0 0 10px; }
  .h b { font-family: Bangers, Impact, "Arial Narrow Bold", system-ui, sans-serif; font-weight: 400; font-size: 20px; letter-spacing: .06em; line-height: 1; color: #FFD23F; }
  .dots { display: flex; gap: 3px; flex-wrap: wrap; justify-content: flex-end; }
  .dots i { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 7px; font-style: normal; font-size: 13px; background: rgba(255, 248, 236, .1); opacity: .55; }
  .dots i.d { background: #5BE38A; opacity: 1; }
  .dots i.h { outline: 2px solid #FFD23F; opacity: 1; }
  a.go { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 10px 14px; border-radius: 14px; background: #FFD23F; color: #120E18; border: 3px solid #120E18;
    box-shadow: 3px 4px 0 #05030A; text-decoration: none; font-family: Bangers, Impact, "Arial Narrow Bold", system-ui, sans-serif; font-size: 22px; letter-spacing: .05em; line-height: 1; text-align: center; }
  a.go:active { transform: translate(2px, 3px); box-shadow: 1px 1px 0 #05030A; }
  a.go:focus-visible, a.home:focus-visible { outline: 3px solid #29D3F0; outline-offset: 3px; }
  a.home { display: block; margin: 8px auto 0; padding: 6px; width: max-content; color: rgba(255, 248, 236, .8); font-size: 13px; font-weight: 700; }
`;
const Base = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};   // (node's tests import the list and the session)
class LabRunsNext extends Base {
  static get observedAttributes() { return ['game', 'done']; }
  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (!this._on) { this._on = () => this.paint(); window.addEventListener('capra-runs:changed', this._on); }
    this.paint();
  }
  disconnectedCallback() { if (this._on) { window.removeEventListener('capra-runs:changed', this._on); this._on = null; } }
  attributeChangedCallback() { if (this.shadowRoot) this.paint(); }
  paint() {
    const game = this.getAttribute('game') || gameOfPath();
    if (this.hasAttribute('done')) markDone(game);       // (a no-op once it's marked: no loop)
    const s = session();
    if (!s || !RUNS.some((r) => r.game === game)) { this.hidden = true; if (this.shadowRoot) this.shadowRoot.innerHTML = ''; return; }
    this.hidden = false;
    const n = RUNS.filter((r) => s.done.includes(r.game)).length, next = nextAfter(game, s), here = s.done.includes(game);
    const dots = RUNS.map((r) => `<i class="${s.done.includes(r.game) ? 'd' : ''}${r.game === game ? ' h' : ''}" title="${esc(r.name)}">${r.emoji}</i>`).join('');
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="r" role="navigation" aria-label="Daily Runs">
      <div class="h"><b>DAILY RUNS · ${n} OF ${RUNS.length}</b><span class="dots" aria-hidden="true">${dots}</span></div>
      ${next ? `<a class="go" href="${runUrl(next)}">${here ? 'NEXT' : 'SKIP TO'}: ${next.emoji} ${esc(next.name.toUpperCase())} ▸</a><a class="home" href="/">Back to Capra Lab</a>`
        : `<a class="go" href="/">🏁 ALL DONE! BACK TO CAPRA LAB ▸</a>`}</div>`;
  }
}
if (typeof customElements !== 'undefined' && !customElements.get('lab-runs-next')) customElements.define('lab-runs-next', LabRunsNext);

/* ---------- arriving from the Daily Runs: the daily button glows until it's tapped ---------- */
function glow(r) {
  if (!document.getElementById('labRunsCss')) {
    const st = document.createElement('style');
    st.id = 'labRunsCss';
    st.textContent = `.lab-runs-glow { outline: 4px solid #FFD23F !important; outline-offset: 4px !important; animation: labRunsGlow 1.2s ease-in-out infinite !important; }
      @keyframes labRunsGlow { 0%, 100% { outline-color: #FFD23F; outline-offset: 3px; } 50% { outline-color: #FFF8EC; outline-offset: 8px; } }
      @media (prefers-reduced-motion: reduce) { .lab-runs-glow { animation: none !important; } }`;
    document.head.appendChild(st);
  }
  const seen = (el) => el && el.getClientRects().length > 0 && !el.disabled;
  let tries = 0, firstDone = false;
  const look = () => {
    if (++tries > 180) return;      // a quarter second at a time, then each second (a first-visit welcome may come first), then let it be
    if (r.first && !firstDone) { const f = document.querySelector(r.first); if (f) { f.click(); firstDone = true; } }
    const el = document.querySelector(r.go);
    if (!seen(el)) { setTimeout(look, tries < 80 ? 250 : 1000); return; }
    el.classList.add('lab-runs-glow');
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.addEventListener('click', () => el.classList.remove('lab-runs-glow'), { once: true });
  };
  look();
}
// (fill.js keeps the address the page opened with: an app like Mind Heist tidies its own address before this loads)
const landing = typeof window !== 'undefined' && typeof location !== 'undefined' ? String(window.__labLanding || location.pathname + location.search) : '';
if (landing && new URLSearchParams((landing.split('?')[1] || '').split('#')[0]).has('runs')) {
  const r = RUNS.find((x) => x.game === gameOfPath());
  const q = new URLSearchParams(location.search);
  if (q.has('runs')) { q.delete('runs'); history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }
  if (r && session()) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => glow(r), { once: true }); else glow(r);
  }
}
