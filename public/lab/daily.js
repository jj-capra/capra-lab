/* The daily challenge board card and its helpers (JC, Nov 14 2026: "a daily challenge leaderboard...
   The most points the fastest wins"). The rules are /lab/daily-boards.mjs, the server lab/daily.js.

     import '/lab/daily.js';                        (or <script type="module" src="/lab/daily.js">)
     <lab-daily-board board="three-clue-crew:4"></lab-daily-board>
     el.show(view)            hand it a board you already have (what finish() answers), no fetch
     el.refresh()             fetch it again
     CapraDaily.open(board)   the board over the page (a "Today's board" button on the menu)

   Games without a server time and post their runs through window.CapraDaily:
     await CapraDaily.start(board)            today's official run starts (the first call starts the clock)
     await CapraDaily.finish(board, answers)  → the board, with { points, ms }; null for a guest
     await CapraDaily.golf(scores, open)      Par-Tee Time's Daily 3: the strokes so far, hole by hole
     await CapraDaily.sled({ world, inputs, open })  Tough Sleddin's Today's run, world by world: a world's
                                              arrows (the server rides it again), and the world opening
   Games with a server post their own (lab/daily.js begin/post). */
import { BOARDS, fmtPoints, fmtMs, WIN_MIN, ruleOf } from './daily-boards.mjs';
import './runs.js';   /* the Daily Runs: every board card ends with what's next (<lab-runs-next>) */

const me = () => { try { const p = JSON.parse(localStorage.getItem('capra-lab.profile') || 'null'); return p && p.name && p.code ? p : null; } catch { return null; } };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function post(action, body) {
  const p = me();
  const r = await fetch('/api/daily/' + action, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, name: p && p.name, code: p && p.code }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'The daily board didn’t answer.'); e.code = j.code; e.status = r.status; throw e; }
  return j;
}
const CapraDaily = {
  async start(board) { if (!me()) return null; try { return await post('start', { board }); } catch (e) { return { error: e.message }; } },
  async finish(board, answers) {
    if (!me()) return null;
    try { const v = await post('finish', { board, answers }); window.dispatchEvent(new CustomEvent('capra-daily:posted', { detail: v })); return v; }
    catch (e) { return { error: e.message, code: e.code }; }
  },
  // Par-Tee Time's Daily 3: post the strokes so far (and say which hole is opening); the server keeps
  // them, and the third posts the round.  → { golf: { holes, scores, opened, hcp, left }, view? }
  async golf(scores, open = null) {
    if (!me()) return null;
    try { const v = await post('golf', { board: 'par-tee-time', scores, open }); if (v.view) window.dispatchEvent(new CustomEvent('capra-daily:posted', { detail: v.view })); return v; }
    catch (e) { return { error: e.message, code: e.code, status: e.status }; }
  },
  // Tough Sleddin's Today's run: post a world that's over ({ world, inputs }: the arrows held, step by step) and/or
  // say which one is opening ({ open }).  → { sled: { worlds, opened, left, done }, view? }
  async sled(body) {
    if (!me()) return null;
    try { const v = await post('sled', { board: 'tough-sleddin', ...body }); if (v.view) window.dispatchEvent(new CustomEvent('capra-daily:posted', { detail: v.view })); return v; }
    catch (e) { return { error: e.message, code: e.code, status: e.status }; }
  },
  async board(board) {
    if (me()) { try { return await post('board', { board }); } catch { /* a bad key: fall back to the public board */ } }
    const r = await fetch('/api/daily/board?b=' + encodeURIComponent(board), { cache: 'no-store' });
    return r.ok ? r.json() : null;
  },
};
window.CapraDaily = CapraDaily;

const MEDAL = ['🥇', '🥈', '🥉'];
const CSS = `
  :host([hidden]) { display: none; }
  :host { display: block; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color: #120E18; text-align: left; }
  .c { padding: 14px 14px 12px; border-radius: 18px; background: #FFF8EC; border: 3px solid #120E18; box-shadow: 4px 5px 0 #05030A; }
  .top { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; }
  h3 { margin: 0; flex: 1 0 auto; white-space: nowrap; font-family: Bangers, Impact, "Arial Narrow Bold", system-ui, sans-serif; font-weight: 400; font-size: 24px; letter-spacing: .05em; line-height: 1; }
  .sub { font-size: 12px; font-weight: 800; letter-spacing: .08em; color: rgba(18,14,24,.6); text-transform: uppercase; white-space: nowrap; }
  ol { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 4px; }
  li { display: grid; grid-template-columns: 30px 1fr auto auto; gap: 8px; align-items: center; padding: 6px 8px; border-radius: 10px; background: rgba(18,14,24,.05); font-size: 14px; font-weight: 700; }
  li.me { background: #FFD23F; box-shadow: inset 0 0 0 2px #120E18; }
  li .r { text-align: center; font-weight: 800; font-size: 15px; }
  li .n { min-width: 0; overflow-wrap: anywhere; line-height: 1.2; }
  li .p { font-family: Bangers, Impact, sans-serif; font-weight: 400; font-size: 19px; letter-spacing: .03em; }
  li .t { font-variant-numeric: tabular-nums; font-size: 12.5px; color: rgba(18,14,24,.65); min-width: 38px; text-align: right; }
  .empty { margin: 10px 0 0; font-size: 14px; font-weight: 700; color: rgba(18,14,24,.7); }
  .mine { margin: 8px 0 0; font-size: 13.5px; font-weight: 800; }
  .y { margin: 8px 0 0; font-size: 13px; font-weight: 700; color: rgba(18,14,24,.75); }
  .rule { margin: 8px 0 0; font-size: 12px; font-weight: 600; line-height: 1.4; color: rgba(18,14,24,.62); }
`;
class LabDailyBoard extends HTMLElement {
  static get observedAttributes() { return ['board']; }
  connectedCallback() { if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); if (!this.data) { this.paint(null); this.refresh(); } }
  attributeChangedCallback(n, a, b) { if (a !== b && this.shadowRoot) { this.data = null; this.paint(null); this.refresh(); } }
  async refresh() {
    const id = this.getAttribute('board');
    if (!id || !BOARDS[id]) return;
    try { const v = await CapraDaily.board(id); if (v && v.board === this.getAttribute('board')) this.show(v); }
    catch { /* offline: leave it */ }
  }
  show(v) { this.data = v; this.paint(v); }
  paint(v) {
    const id = this.getAttribute('board'), b = BOARDS[id];
    if (!this.shadowRoot || !b) return;
    const handle = (me() || {}).handle;
    const rows = v && v.list.length ? `<ol>${v.list.map((e) => `<li class="${e.handle === handle ? 'me' : ''}"><span class="r">${MEDAL[e.rank - 1] || e.rank}</span><span class="n">${esc(e.name)}</span><span class="p">${esc(fmtPoints(id, e.points))}</span><span class="t">${fmtMs(e.ms)}</span></li>`).join('')}</ol>`
      : `<p class="empty">${v ? 'Nobody on it yet today. Be the first!' : 'Loading today’s board…'}</p>`;
    const mine = v && v.me && v.me.rank && !v.list.some((e) => e.handle === handle) ? `<p class="mine">You: #${v.me.rank} of ${v.of} · ${esc(fmtPoints(id, v.me.points))} · ${fmtMs(v.me.ms)}</p>` : '';
    const y = v && v.yesterday ? `<p class="y">${v.yesterday.pending ? 'Yesterday’s leader' : 'Yesterday’s winner'}: 🏆 ${esc(v.yesterday.name)} (${esc(fmtPoints(id, v.yesterday.points))})</p>` : '';
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="c" role="region" aria-label="Today's board">
      <div class="top"><h3>🏆 TODAY’S BOARD</h3><span class="sub">${esc(b.emoji)} ${esc(b.variant)}</span></div>
      ${rows}${mine}${y}
      <p class="rule">${esc(ruleOf(id, WIN_MIN))}</p>
      <lab-runs-next game="${esc(b.game)}"${v && v.me && v.me.rank ? ' done' : ''}></lab-runs-next></div>`;
  }
}
if (!customElements.get('lab-daily-board')) customElements.define('lab-daily-board', LabDailyBoard);

// <lab-daily-today>: every board's leader right now, for the hub (dark panel). Each row opens its game.
const GAME_URL = { 'three-clue-crew': '/three-clue-crew/', 'puzzled-spin': '/puzzled-spin/', 'mind-heist': '/mind-heist/', 'no-cap': '/no-cap/', 'par-tee-time': '/par-tee-time/', 'tough-sleddin': '/tough-sleddin/' };
const TODAY_CSS = `
  :host { display: block; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color: #FFF8EC; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  a { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; gap: 8px; align-items: center; min-height: 44px; padding: 7px 10px; border-radius: 12px; background: rgba(255, 248, 236, 0.07); color: inherit; text-decoration: none; border: 2px solid rgba(5, 3, 10, 0.6); }
  a:focus-visible { outline: 3px solid #FFD23F; outline-offset: 2px; }
  .e { font-size: 20px; text-align: center; }
  .g { min-width: 0; line-height: 1.2; }
  .g b { display: block; font-size: 14px; font-weight: 800; }
  .g small { display: block; font-size: 12.5px; font-weight: 700; color: rgba(255, 248, 236, 0.72); overflow-wrap: anywhere; }
  .p { font-family: Bangers, Impact, sans-serif; font-size: 19px; letter-spacing: .03em; color: #FFD23F; white-space: nowrap; }
  .none { margin: 8px 0 0; font-size: 13px; font-weight: 700; color: rgba(255, 248, 236, 0.72); line-height: 1.45; }
  .none a { display: inline; padding: 0; border: 0; background: none; color: #FFD23F; font-weight: 800; min-height: 0; }
`;
class LabDailyToday extends HTMLElement {
  connectedCallback() { if (!this.shadowRoot) { this.attachShadow({ mode: 'open' }); this.load(); } }
  async load() {
    let t = null;
    try { const r = await fetch('/api/daily/today', { cache: 'no-store' }); t = r.ok ? await r.json() : null; } catch { t = null; }
    const rows = (t && t.boards) || [];
    const played = new Set(rows.map((r) => BOARDS[r.board] && BOARDS[r.board].game));
    const idle = Object.keys(GAME_URL).filter((g) => !played.has(g));
    const titleOf = (g) => Object.values(BOARDS).find((b) => b.game === g);
    this.shadowRoot.innerHTML = `<style>${TODAY_CSS}</style>
      ${rows.length ? `<ul>${rows.map((r) => { const b = BOARDS[r.board]; if (!b) return ''; return `<li><a href="${GAME_URL[b.game]}"><span class="e" aria-hidden="true">${b.emoji}</span><span class="g"><b>${esc(b.title)} · ${esc(b.variant)}</b><small>👑 ${esc(r.top.name)}${r.of > 1 ? ` · ${r.of} playing` : ''}</small></span><span class="p">${esc(fmtPoints(r.board, r.top.points))}</span></a></li>`; }).join('')}</ul>` : ''}
      ${idle.length ? `<p class="none">${rows.length ? 'Nobody yet on' : 'Nobody on a board yet today. Be first:'} ${idle.map((g) => { const b = titleOf(g); return `<a href="${GAME_URL[g]}">${b.emoji} ${esc(b.title)}</a>`; }).join(' · ')}</p>` : ''}`;
  }
}
if (!customElements.get('lab-daily-today')) customElements.define('lab-daily-today', LabDailyToday);

// CapraDaily.open(board): the board over the game, for a "Today's board" button on a game's menu.
// It keeps clear of the status bar and fills to the bottom of the screen (/lab/fill.js's --lab-h).
CapraDaily.open = function open(board) {
  if (!BOARDS[board]) return;
  let wrap = document.getElementById('labDailySheet');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'labDailySheet';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Today’s board');
    wrap.style.cssText = 'position:fixed;inset:0 0 auto;height:var(--lab-h,100%);z-index:2000;display:grid;place-items:center;box-sizing:border-box;'
      + 'padding:calc(env(safe-area-inset-top,0px) + 16px) max(16px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 16px) max(16px,env(safe-area-inset-left,0px));background:rgba(5,3,10,.74)';
    wrap.innerHTML = '<div style="width:100%;max-width:460px;max-height:100%;overflow:auto;display:grid;gap:12px;-webkit-overflow-scrolling:touch">'
      + '<lab-daily-board></lab-daily-board>'
      + '<button type="button" style="font:400 22px/1 Bangers,Impact,system-ui,sans-serif;letter-spacing:.05em;padding:13px 16px;border-radius:14px;border:3px solid #120E18;background:#FFD23F;color:#120E18;box-shadow:3px 4px 0 #05030A;cursor:pointer">CLOSE</button></div>';
    const close = () => { wrap.style.display = 'none'; };
    wrap.querySelector('button').onclick = close;
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wrap.style.display !== 'none') close(); });
    document.body.appendChild(wrap);
  }
  const el = wrap.querySelector('lab-daily-board');
  if (el.getAttribute('board') === board) el.refresh(); else el.setAttribute('board', board);
  wrap.style.display = 'grid';
  wrap.querySelector('button').focus({ preventScroll: true });
};
export default CapraDaily;
