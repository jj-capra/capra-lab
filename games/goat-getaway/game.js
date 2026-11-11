// Goat Getaway: the page. Today's pen (one a day, the same for everyone, timed by the server,
// diamonds to Mind Heist, a Blue Ribbon for the fastest) and endless practice pens.
// The rules live in shared/puzzle.mjs, the same file the server checks solves with.
import { pieces, slide, solved, reach, solve } from './shared/puzzle.mjs';
import { pieceArt, postArt, pieceName, GOAT_HEAD, RIBBON } from './art.js';

const $ = (id) => document.getElementById(id);
const API = '/goat-getaway/api';
const SHARE_URL = 'https://capra-lab.netlify.app/goat-getaway/';
const TIER_COLORS = ['#5BE38A', '#29D3F0', '#B79CFF', '#FFD23F', '#FF9A4D', '#FF5DA2', '#FF5A4A'];
const LEVELS = [['easy', 'Easy', 0, 10], ['medium', 'Medium', 11, 19], ['hard', 'Hard', 20, 99]];

/* ---------- saved on this device (best-effort: private mode can refuse) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* fine */ } },
};
const prefs = Object.assign({ sound: true, tab: 'today', level: 'easy', seenHelp: false }, store.get('goat-getaway.prefs', {}));
const savePrefs = () => store.set('goat-getaway.prefs', prefs);
// The Capra Lab player on this phone (the lab keeps it under capra-lab.profile).
const lab = (() => { const p = store.get('capra-lab.profile', null); return p && p.name && p.code ? p : null; })();
let keyBad = false;   // the lab key didn't match: play as a guest

/* ---------- little helpers ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtTime = (ms) => {
  if (ms == null) return '–';
  const t = Math.max(0, ms) / 1000;
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t - h * 3600 - m * 60;
  const ss = `${s < 10 ? '0' : ''}${s.toFixed(1)}`;
  return h ? `${h}:${m < 10 ? '0' : ''}${m}:${ss.slice(0, 2)}` : `${m}:${ss}`;
};
const fmtDay = (ymd) => new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

let toastTimer = 0;
function toast(msg, kind = '') {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast' + (kind ? ' ' + kind : ''); }, kind === 'err' ? 5000 : 3800);
}

function confetti(colors = ['#FFD23F', '#FF3D8B', '#29D3F0', '#5BE38A', '#FFF8EC']) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    p.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
    p.style.animationDelay = Math.random() * 0.4 + 's';
    if (i % 3 === 0) p.style.borderRadius = '50%';
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3800);
}

/* ---------- sound (made on the fly, nothing to download) ---------- */
let ac = null;
function audio() {
  if (!prefs.sound) return null;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { return null; }
  return ac;
}
function tone(freq, start, dur, type = 'triangle', vol = 0.16, endFreq = 0) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.03);
}
// A goat's "meh-eh-eh": a buzzy voice with a fast wobble in pitch and loudness.
function bleat(start = 0, pitch = 1) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + start, dur = 0.62;
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  const vib = c.createOscillator(), vibG = c.createGain(), trem = c.createOscillator(), tremG = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(560 * pitch, t);
  o.frequency.linearRampToValueAtTime(610 * pitch, t + 0.12);
  o.frequency.exponentialRampToValueAtTime(430 * pitch, t + dur);
  vib.frequency.value = 9; vibG.gain.value = 26 * pitch;
  vib.connect(vibG).connect(o.frequency);
  f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.1;
  trem.frequency.value = 15; tremG.gain.value = 0.05;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.13, t + 0.04);
  g.gain.setValueAtTime(0.13, t + dur - 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  trem.connect(tremG).connect(g.gain);
  o.connect(f).connect(g).connect(c.destination);
  for (const x of [o, vib, trem]) { x.start(t); x.stop(t + dur + 0.05); }
}
const sfx = {
  pick() { tone(900, 0, 0.04, 'square', 0.04); },
  slide() { tone(210, 0, 0.1, 'triangle', 0.2, 120); tone(90, 0.02, 0.09, 'sine', 0.18); },
  bump() { tone(110, 0, 0.12, 'square', 0.06, 80); },
  creak() { tone(170, 0, 0.42, 'sawtooth', 0.05, 330); tone(240, 0.08, 0.3, 'sawtooth', 0.03, 180); },
  out() { bleat(0); tone(523, 0.5, 0.12); tone(659, 0.6, 0.12); tone(784, 0.7, 0.12); tone(1047, 0.8, 0.32); },
  par() { tone(1319, 0, 0.1, 'square', 0.06); tone(1760, 0.09, 0.22, 'square', 0.06); },
  ribbon() { bleat(0, 1.15); tone(784, 0.35, 0.14); tone(988, 0.48, 0.14); tone(1175, 0.6, 0.4); },
};
function drawSoundBtn() {
  const b = $('soundBtn');
  b.setAttribute('aria-pressed', String(prefs.sound));
  b.setAttribute('aria-label', prefs.sound ? 'Sound on' : 'Sound off');
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/>${prefs.sound
    ? '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'}</svg>`;
}

/* ---------- the server ---------- */
let offset = 0;   // server clock minus this phone's clock
const serverNow = () => Date.now() + offset;
async function api(path, body = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  const send = lab && !keyBad ? { ...body, lab: { name: lab.name, code: lab.code } } : body;
  try {
    const res = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(send), signal: ctl.signal });
    let j = {};
    try { j = await res.json(); } catch (e) { /* not JSON */ }
    if (typeof j.now === 'number') offset = j.now - Date.now();
    if (!res.ok) { const e = new Error(j.error || 'The barn didn’t answer. Try again.'); e.status = res.status; throw e; }
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('The barn didn’t answer. Check your signal and try again.');
    if (e instanceof TypeError) throw new Error('Can’t reach the barn. Check your signal and try again.');
    throw e;
  } finally { clearTimeout(timer); }
}
// A wrong lab key: say so once, then play on as a guest.
async function call(path, body) {
  try { return await api(path, body); } catch (e) {
    if (e.status !== 401 || !lab || keyBad) throw e;
    keyBad = true;
    $('keyWarn').hidden = false;
    return api(path, body);
  }
}

/* ---------- the pen: pieces you drag along their length ---------- */
const pct = (n) => `${(n * 100) / 6}%`;
class Pen {
  constructor(el, onMove) {
    this.onMove = onMove;
    this.el = el;
    el.innerHTML = '<div class="floor"><div class="lane" aria-hidden="true"><span>›</span><span>›</span><span>›</span><span>›</span><span>›</span><span>›</span></div><div class="gate" aria-hidden="true"><i></i></div></div>';
    this.floor = el.firstChild;
    this.start = '';
    this.boards = [''];
    this.moves = [];
    this.els = new Map();
    this.drag = null;
    this.locked = false;
  }
  get board() { return this.boards[this.boards.length - 1]; }
  load(start) {
    this.start = start; this.boards = [start]; this.moves = []; this.locked = false;
    this.draw(true);
  }
  // Slides in a row on the same piece count as one move, as on a real board.
  play(id, d) {
    const boards = this.boards.slice(), moves = this.moves.slice();
    const last = moves[moves.length - 1];
    if (last && last[0] === id) {
      const net = last[1] + d;
      moves.pop(); boards.pop();
      if (net) { moves.push([id, net]); boards.push(slide(boards[boards.length - 1], id, net)); }
    } else {
      const nb = slide(this.board, id, d);
      if (!nb) return null;
      moves.push([id, d]); boards.push(nb);
    }
    this.boards = boards; this.moves = moves;
    this.draw();
    return { board: this.board, moves };
  }
  undo() { if (this.moves.length && !this.locked) { this.boards.pop(); this.moves.pop(); this.draw(); } }
  reset() { this.boards = [this.start]; this.moves = []; this.locked = false; this.draw(true); }
  // Point at the best next move: the piece pulses with an arrow, a dashed outline shows where it goes.
  showHint(id, d) {
    this.clearHint();
    const p = pieces(this.board)[id], el = this.els.get(id);
    if (!p || !el) return;
    el.classList.add('hinted');
    el.dataset.arrow = p.h ? (d > 0 ? '→' : '←') : (d > 0 ? '↓' : '↑');
    const g = document.createElement('div');
    g.className = 'ghost';
    g.style.cssText = `left:${pct(p.c + (p.h ? d : 0))};top:${pct(p.r + (p.h ? 0 : d))};width:${pct(p.h ? p.len : 1)};height:${pct(p.h ? 1 : p.len)}`;
    this.floor.appendChild(g);
    this.ghost = g;
  }
  clearHint() {
    if (this.ghost) { this.ghost.remove(); this.ghost = null; }
    for (const el of this.els.values()) { el.classList.remove('hinted'); delete el.dataset.arrow; }
  }
  draw(fresh = false) {
    this.clearHint();
    const b = this.board;
    if (fresh) {
      for (const el of this.floor.querySelectorAll('.pc,.post')) el.remove();
      this.els.clear();
      this.el.classList.remove('won');
      [...b].forEach((ch, i) => {
        if (ch !== 'x') return;
        const d = document.createElement('div');
        d.className = 'post';
        d.style.cssText = `left:${pct(i % 6)};top:${pct((i / 6) | 0)};width:${pct(1)};height:${pct(1)}`;
        d.innerHTML = postArt();
        this.floor.appendChild(d);
      });
    }
    const ps = pieces(b);
    for (const p of Object.values(ps)) {
      let el = this.els.get(p.id);
      if (!el) {
        el = document.createElement('button');
        el.type = 'button';
        el.className = 'pc ' + (p.h ? 'h' : 'v') + (p.id === 'A' ? ' goat' : '');
        el.dataset.id = p.id;
        el.setAttribute('aria-label', pieceName(p.id, p.len, p.h));
        el.innerHTML = pieceArt(p.id, p.len, p.h);
        el.style.width = pct(p.h ? p.len : 1);
        el.style.height = pct(p.h ? 1 : p.len);
        el.addEventListener('pointerdown', (e) => this.down(e, p.id));
        el.addEventListener('pointermove', (e) => this.move(e));
        el.addEventListener('pointerup', (e) => this.up(e));
        el.addEventListener('pointercancel', (e) => this.up(e));
        el.addEventListener('lostpointercapture', (e) => this.up(e));
        el.addEventListener('keydown', (e) => this.key(e, p.id));
        this.floor.appendChild(el);
        this.els.set(p.id, el);
      }
      el.style.left = pct(p.c);
      el.style.top = pct(p.r);
      el.classList.remove('out');
    }
    const won = solved(b);
    if (won) { this.els.get('A').classList.add('out'); this.el.classList.add('won'); }
    else this.el.classList.remove('won');
  }
  shake(id) {
    const el = this.els.get(id);
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    sfx.bump();
  }
  down(e, id) {
    if (this.locked || solved(this.board) || this.drag) return;
    e.preventDefault();
    const p = pieces(this.board)[id];
    const { min, max } = reach(this.board, id);
    if (!min && !max) { this.shake(id); return; }
    const el = this.els.get(id);
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    this.drag = { id, h: p.h, x0: e.clientX, y0: e.clientY, cell: this.floor.clientWidth / 6, min, max, off: 0, pid: e.pointerId, el };
    el.classList.add('drag');
    sfx.pick();
  }
  move(e) {
    const g = this.drag;
    if (!g || e.pointerId !== g.pid) return;
    const raw = g.h ? e.clientX - g.x0 : e.clientY - g.y0;
    g.off = Math.max(g.min * g.cell, Math.min(g.max * g.cell, raw));
    g.el.style.transform = `translate${g.h ? 'X' : 'Y'}(${g.off}px)`;
  }
  up(e) {
    const g = this.drag;
    if (!g || e.pointerId !== g.pid) return;
    this.drag = null;
    const d = Math.round(g.off / g.cell);
    // Hand the piece over from the finger to the grid without a jump: it lands on its new
    // square still offset by whatever the finger left over, then glides the rest of the way.
    const head = () => { const p = pieces(this.board)[g.id]; return p.h ? p.c : p.r; };
    const before = head();
    if (d) this.onMove(g.id, d);
    const moved = head() - before;
    g.el.style.transform = `translate${g.h ? 'X' : 'Y'}(${g.off - moved * g.cell}px)`;
    void g.el.offsetWidth;
    g.el.classList.remove('drag');
    g.el.style.transform = '';
  }
  key(e, id) {
    if (this.locked || solved(this.board)) return;
    const p = pieces(this.board)[id];
    const k = e.key;
    const d = p.h ? (k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0) : (k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0);
    if (!d) return;
    e.preventDefault();
    const { min, max } = reach(this.board, id);
    if (d >= min && d <= max) this.onMove(id, d); else this.shake(id);
  }
}

/* ---------- tabs ---------- */
function showTab(tab) {
  prefs.tab = tab; savePrefs();
  $('tabToday').setAttribute('aria-selected', String(tab === 'today'));
  $('tabPractice').setAttribute('aria-selected', String(tab === 'practice'));
  $('today').hidden = tab !== 'today';
  $('practice').hidden = tab !== 'practice';
  if (tab === 'practice') Practice.enter();
  layout();
}
// While a board is up, the title shrinks so the whole pen fits on a phone.
function layout() {
  const playing = prefs.tab === 'practice' || (Today.data && !$('play').hidden);
  document.body.classList.toggle('playing', !!playing);
}

/* ---------- today's pen ---------- */
const Today = {
  data: null, pen: null, guestStart: null, guestDone: null, res: null, tick: 0, busy: false,

  init() {
    this.pen = new Pen($('board'), (id, d) => this.moved(id, d));
    $('openBtn').addEventListener('click', () => this.open());
    $('undoBtn').addEventListener('click', () => { this.pen.undo(); this.hud(); });
    $('resetBtn').addEventListener('click', () => { this.pen.reset(); this.hud(); });
    $('hintBtn').addEventListener('click', () => this.hint());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.data && this.pacificToday() !== this.data.pen.date && !this.pen.locked) this.load();
    });
  },
  pacificToday() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(serverNow()));
  },
  async load() {
    try {
      const d = await call('/today');
      this.set(d, true);
      const news = d.me && d.me.ribbonNews;
      if (news && news.length) {
        setTimeout(() => {
          confetti(['#2F6BFF', '#FFF8EC', '#FFD23F']); sfx.ribbon();
          toast(news.length === 1 ? `Blue Ribbon! You had the fastest getaway on ${fmtDay(news[0])}.` : `${news.length} Blue Ribbons! You had the fastest getaway on ${news.map(fmtDay).join(' and ')}.`);
        }, 500);
      }
    } catch (e) {
      $('kicker').innerHTML = `<span class="muted">${esc(e.message)}</span> <button class="btn sm" type="button" id="retry">Try again</button>`;
      $('retry').addEventListener('click', () => this.load());
    }
  },
  set(d, fresh) {
    const prevDate = this.data && this.data.pen.date;
    this.data = d;
    if (prevDate !== d.pen.date) { this.res = null; this.guestStart = null; this.guestDone = null; }
    const t = d.pen, me = d.me;
    const tierEl = `<span class="tier" style="--tier:${TIER_COLORS[t.tier]}">${esc(t.tierName)}</span>`;
    $('kicker').innerHTML = `${tierEl}<span>No. ${t.no}</span><span class="muted">${esc(t.day)} · par ${t.par}</span>`;
    const rc = $('ribbonCount');
    rc.hidden = !me || !me.ribbons;
    if (me && me.ribbons) { rc.innerHTML = `${RIBBON}<span class="num">${me.ribbons}</span>`; rc.title = plural(me.ribbons, 'Blue Ribbon'); }

    const board = t.board || (this.guestStart != null ? this.guestBoard : null);
    $('opener').hidden = !!board;
    $('play').hidden = !board;
    if (!board) this.opener();
    else if (fresh || this.pen.start !== board) { this.pen.load(board); $('tPar').textContent = t.par; }
    this.hud();
    this.after();
    this.result();
    this.race();
    this.shelf();
    this.clock();
    layout();
  },
  opener() {
    const t = this.data.pen, me = this.data.me;
    $('openWhat').innerHTML = me
      ? `<b>The clock starts when you open the pen.</b> Your first getaway is your time. Get the goat out: <b>+1 💎</b>. Do it in ${t.par} moves: <b>+1 more</b>.`
      : `One pen a day, the same for everyone. Today’s is <b>${esc(t.tierName)}</b> level: the goat can get out in ${t.par} moves.`;
    $('openNote').innerHTML = me
      ? (me.mindHeist ? 'Diamonds go straight to your Mind Heist vault for its daily card draw.' : 'Diamonds wait for you in Mind Heist (for its daily card draw) until you open it with your Capra Lab name.')
      : `Playing as a guest: nothing’s timed against anyone or saved. <a href="/#profile">Make your Capra Lab key card</a> to race the clock, win Blue Ribbons and earn diamonds for Mind Heist.`;
  },
  async open() {
    if (this.busy) return;
    this.busy = true; $('openBtn').disabled = true;
    try {
      const r = await call('/open');
      sfx.creak();
      if (r.guest) { this.guestBoard = r.pen.board; this.guestStart = Date.now(); this.guestDone = null; }
      const d = { ...this.data, pen: r.pen, me: r.me ? { ...this.data.me, ...r.me } : this.data.me };
      this.set(d, true);
      $('board').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (e) { toast(e.message, 'err'); }
    this.busy = false; $('openBtn').disabled = false;
  },
  done() { const me = this.data.me; return me ? me.ms != null : this.guestDone != null; },
  elapsed() {
    const me = this.data.me;
    // hints before your first getaway count on the clock (HINT_MS each, on the server)
    if (me) return me.ms != null ? me.ms : me.open != null ? serverNow() - me.open + (me.hints || 0) * 15000 : null;
    if (this.guestStart == null) return null;
    return (this.guestDone || Date.now()) - this.guestStart;
  },
  clock() {
    cancelAnimationFrame(this.tick);
    const run = () => {
      const ms = this.elapsed();
      $('tTime').textContent = fmtTime(ms == null ? 0 : ms);
      if (!this.done() && !$('play').hidden) this.tick = requestAnimationFrame(() => setTimeout(run, 90));
    };
    run();
  },
  hud() {
    const n = this.pen.moves.length, par = this.data ? this.data.pen.par : 0;
    $('tMoves').textContent = n;
    $('tMovesBox').classList.toggle('under', n > 0 && n <= par);
    $('undoBtn').disabled = !n || this.pen.locked || solved(this.pen.board);
    $('resetBtn').disabled = !n || this.pen.locked;
    $('hintBtn').disabled = this.pen.locked || solved(this.pen.board);
  },
  // The best next move from where the pen is now. On today's pen a signed-in player's hints are
  // counted by the server (time and the par diamond); a guest's are worked out right here.
  async hint() {
    if (this.pen.locked || solved(this.pen.board) || this.hinting) return;
    const me = this.data.me;
    this.hinting = true; $('hintBtn').disabled = true;
    try {
      let move;
      if (me) {
        const r = await call('/hint', { moves: this.pen.moves, date: this.data.pen.date });
        move = r.move;
        const firstHint = !me.hints;
        me.hints = r.hints;
        if (r.penalty && firstHint) toast('Hint! Each one adds 15 seconds to your time, and today won’t earn the par diamond.');
        this.after();
      } else {
        const s = solve(this.pen.board);
        move = s && s.path[0];
      }
      if (move) { this.pen.showHint(move[0], move[1]); sfx.pick(); }
    } catch (e) { toast(e.message, 'err'); }
    this.hinting = false;
    this.hud();
  },
  after() {
    const me = this.data.me, el = $('after');
    const show = this.done() && !solved(this.pen.board);
    el.hidden = !show;
    if (!show) return;
    el.textContent = !me ? 'Play it again for fun.'
      : me.parGem ? 'You already made par today. Play it again for fun.'
        : me.hints ? 'Your time is in. With hints today, there’s no par diamond, but play it again for fun.'
          : `Your time is in. Get out in ${this.data.pen.par} moves for one more 💎.`;
  },
  moved(id, d) {
    const r = this.pen.play(id, d);
    if (!r) return;
    sfx.slide();
    this.hud();
    if (solved(r.board)) {
      this.pen.locked = true;
      if (!this.data.me && this.guestDone == null) this.guestDone = Date.now();
      sfx.out();
      this.hud();
      setTimeout(() => this.submit(r.moves), 650);
    }
  },
  async submit(moves) {
    try {
      const r = await call('/solve', { moves, date: this.data.pen.date });
      this.res = r;
      const d = { ...this.data };
      if (r.me) d.me = { ...d.me, ...r.me };
      if (r.race) d.race = r.race;
      this.pen.locked = false;   // the board stays solved; Play again resets it
      this.set(d, false);
      if (r.gained) { confetti(); if (r.gained > 1 || (r.me && r.me.parGem && !r.first)) setTimeout(() => sfx.par(), 900); }
      else if (r.first || r.guest) confetti();
      $('result').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (e) {
      this.pen.locked = false;
      toast(e.message, 'err');
      if (e.status === 409) { this.pen.reset(); this.load(); return; }
      // Out, but the barn didn't hear about it: keep the moves and offer to send them again.
      const el = $('result');
      el.hidden = false;
      el.innerHTML = `<h2>The goat’s out!</h2><p>${esc(e.message)}</p><div class="row"><button class="btn" type="button" id="resend">Send my getaway</button></div>`;
      $('resend').addEventListener('click', () => { $('resend').disabled = true; this.submit(moves); });
    }
  },
  result() {
    const el = $('result'), me = this.data.me, r = this.res, t = this.data.pen;
    const out = solved(this.pen.board);
    if (!this.done() && !(out && r)) { el.hidden = true; return; }
    el.hidden = false;
    let head, line, gems = '', rank = '';
    if (!me) {
      head = `Out in ${fmtTime(this.elapsed())}!`;
      line = `${plural(r ? r.moves : this.pen.moves.length, 'move')} · par ${t.par}${(r ? r.moves : 99) <= t.par ? '. Perfect!' : ''}`;
      gems = `<p class="note"><a href="/#profile">Sign in to Capra Lab</a> and your time races everyone’s, with diamonds for Mind Heist.</p>`;
    } else {
      head = r && !r.first ? `Out in ${plural(r.moves, 'move')}!` : `Out in ${fmtTime(me.ms)}!`;
      line = r && !r.first ? `Par is ${t.par}. Your time today stays ${fmtTime(me.ms)}.` : `${plural(me.moves, 'move')} · par ${t.par}${me.moves <= t.par && !me.hints ? '. Perfect!' : ''}${me.hints ? ` · ${plural(me.hints, 'hint')} (+${me.hints * 15}s)` : ''}`;
      if (r && r.gained) {
        const where = r.paid === 'mind-heist' ? 'sent to your Mind Heist vault'
          : r.paid === 'waiting' ? 'waiting for you in Mind Heist'
            : 'didn’t reach Mind Heist this time';
        gems = `<p class="gems"><b>+${r.gained} 💎</b><span>${where}</span></p>`;
      } else if (me.parGem) gems = `<p class="note">Both of today’s diamonds are yours.</p>`;
      const race = this.data.race;
      if (race && race.rank) rank = `<p>You’re <b>#${race.rank}</b> of ${race.solvers} today${race.leading ? ', the fastest so far' : ''}.</p>`;
    }
    el.innerHTML = `<h2>${esc(head)}</h2><p>${esc(line)}</p>${gems}${rank}
      <div id="shareBox"></div>
      <div class="row">
        ${out ? '<button class="btn alt" type="button" id="againBtn">Play again</button>' : ''}
        ${me ? '<a class="btn alt" href="/mind-heist/">Mind Heist 💎</a>' : ''}
      </div>`;
    this.share();
    if (out) $('againBtn').addEventListener('click', () => { this.res = null; this.pen.reset(); this.set(this.data, false); });
  },
  // The results text (the same card in every Capra Lab game: /lab/share.js): 🟩 out at par,
  // 🟨 over it, ⚡ the fastest so far today.
  share() {
    const box = $('shareBox');
    if (!box || !window.CapraShare) return;
    const t = this.data.pen, me = this.data.me, r = this.res, race = this.data.race;
    const ms = me ? me.ms : this.elapsed();
    const moves = me ? me.moves : r ? r.moves : this.pen.moves.length;
    const text = CapraShare.text({ emoji: '🐐', game: 'Goat Getaway', no: t.no, sub: t.tierName,
      lines: [`Out in ${fmtTime(ms)} · ${plural(moves, 'move')} (par ${t.par})${me && me.parGem ? ' 💎' : ''}`],
      grid: [(moves <= t.par ? '🟩' : '🟨') + (me && race && race.leading ? '⚡' : '')] });
    box.innerHTML = '<lab-text-share></lab-text-share>';
    box.firstChild.set({ emoji: '🐐', title: 'Goat Getaway', text, url: SHARE_URL });
  },
  race() {
    const el = $('race'), race = this.data.race;
    el.hidden = false;
    const rows = race.top.map((x, i) => `<li class="${x.me ? 'me' : ''}">
        <span class="pos">${i + 1}</span>
        <span class="nm">${x.me ? 'You' : esc(x.name)}<small>${plural(x.moves, 'move')}</small></span>
        <span class="t num">${x.lead ? RIBBON : ''}${fmtTime(x.ms)}</span></li>`).join('');
    const mine = race.rank && race.rank > 5 ? ` You’re <b>#${race.rank}</b> of ${race.solvers}.` : '';
    el.innerHTML = `<div class="rhead"><h2>TODAY’S FASTEST</h2><span>${race.solvers ? plural(race.solvers, 'goat') + ' got out' : 'Nobody out yet'}</span></div>
      ${rows ? `<ol class="lb">${rows}</ol>` : '<p class="empty">Be the first goat out today.</p>'}
      <p class="foot">${mine}The fastest getaway of the day wins a Blue Ribbon at midnight (Pacific).</p>`;
  },
  shelf() {
    const me = this.data.me, card = $('shelfCard');
    card.hidden = !me;
    if (!me) return;
    $('shelfCount').textContent = me.ribbons ? plural(me.ribbons, 'ribbon') : '';
    $('shelf').innerHTML = me.ribbonList.length
      ? me.ribbonList.slice().reverse().map((d) => `<span class="rosette">${RIBBON}<span>${esc(fmtDay(d))}</span></span>`).join('')
      : '<p class="empty">Post the fastest getaway of the day, and a Blue Ribbon lands here at midnight.</p>';
  },
};

/* ---------- practice pens ---------- */
const Practice = {
  list: null, pen: null, pool: [], idx: 0, t0: 0, doneAt: null, tick: 0, loading: false,

  init() {
    this.pen = new Pen($('pBoard'), (id, d) => this.moved(id, d));
    $('levels').innerHTML = LEVELS.map(([id, name]) => `<button type="button" role="radio" data-level="${id}" aria-checked="${prefs.level === id}">${name}</button>`).join('');
    $('levels').addEventListener('click', (e) => {
      const b = e.target.closest('[data-level]');
      if (!b) return;
      prefs.level = b.dataset.level; savePrefs();
      for (const x of $('levels').children) x.setAttribute('aria-checked', String(x === b));
      this.pick();
    });
    $('pUndo').addEventListener('click', () => { this.pen.undo(); this.hud(); });
    $('pReset').addEventListener('click', () => this.restart());
    $('pHint').addEventListener('click', () => {
      if (this.doneAt || solved(this.pen.board)) return;
      const s = solve(this.pen.board);
      if (s && s.path[0]) { this.pen.showHint(s.path[0][0], s.path[0][1]); sfx.pick(); }
    });
    $('pSkip').addEventListener('click', () => this.next());
  },
  async enter() {
    if (this.list || this.loading) { this.clock(); return; }
    this.loading = true;
    try {
      const r = await fetch('./practice.json');
      if (!r.ok) throw new Error();
      this.list = await r.json();
      this.pick();
    } catch (e) {
      $('pKicker').innerHTML = '<span class="tier">Practice</span><span class="muted">Couldn’t load the practice pens. Check your signal.</span>';
    }
    this.loading = false;
  },
  pick() {
    const [, , lo, hi] = LEVELS.find((l) => l[0] === prefs.level) || LEVELS[0];
    this.pool = this.list.filter(([, par]) => par >= lo && par <= hi);
    const saved = store.get('goat-getaway.practice', {});
    this.idx = this.pool.length ? (saved[prefs.level] || 0) % this.pool.length : 0;
    this.show();
  },
  show() {
    const p = this.pool[this.idx];
    if (!p) return;
    $('pKicker').innerHTML = `<span class="tier">Practice</span><span>Pen ${this.idx + 1} of ${this.pool.length}</span><span class="muted">par ${p[1]}</span>`;
    $('pPar').textContent = p[1];
    this.pen.load(p[0]);
    this.t0 = Date.now(); this.doneAt = null; this.started = false;
    $('pResult').hidden = true;
    $('pSkip').hidden = false;
    this.hud(); this.clock();
  },
  restart() { this.pen.reset(); this.t0 = Date.now(); this.doneAt = null; this.started = false; $('pResult').hidden = true; $('pSkip').hidden = false; this.hud(); this.clock(); },
  next() {
    if (!this.pool.length) return;
    this.idx = (this.idx + 1) % this.pool.length;
    const saved = store.get('goat-getaway.practice', {});
    saved[prefs.level] = this.idx;
    store.set('goat-getaway.practice', saved);
    this.show();
  },
  clock() {
    cancelAnimationFrame(this.tick);
    const run = () => {
      $('pTime').textContent = fmtTime(this.started ? (this.doneAt || Date.now()) - this.t0 : 0);
      if (!this.doneAt && prefs.tab === 'practice') this.tick = requestAnimationFrame(() => setTimeout(run, 90));
    };
    run();
  },
  hud() {
    const n = this.pen.moves.length, p = this.pool[this.idx];
    $('pMoves').textContent = n;
    $('pMovesBox').classList.toggle('under', !!p && n > 0 && n <= p[1]);
    $('pUndo').disabled = !n || !!this.doneAt;
    $('pReset').disabled = !n;
    $('pHint').disabled = !!this.doneAt || solved(this.pen.board);
  },
  moved(id, d) {
    // The practice clock starts on the first move.
    if (!this.started) { this.started = true; this.t0 = Date.now(); this.clock(); }
    const r = this.pen.play(id, d);
    if (!r) return;
    sfx.slide();
    if (solved(r.board)) {
      this.doneAt = Date.now();
      sfx.out();
      const p = this.pool[this.idx], perfect = r.moves.length <= p[1];
      if (perfect) setTimeout(() => confetti(), 500);
      const el = $('pResult');
      el.hidden = false;
      el.innerHTML = `<h2>Out in ${fmtTime(this.doneAt - this.t0)}!</h2><p>${plural(r.moves.length, 'move')} · par ${p[1]}${perfect ? '. Perfect!' : '.'}</p>
        <div class="row"><button class="btn" type="button" id="pNext">Next pen</button><button class="btn alt" type="button" id="pAgain">Try again</button></div>`;
      $('pNext').addEventListener('click', () => this.next());
      $('pAgain').addEventListener('click', () => this.restart());
      $('pSkip').hidden = true;
      setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300);
    }
    this.hud();
  },
};

/* ---------- help ---------- */
function openHelp(on) {
  $('help').hidden = !on;
  if (on) { $('helpClose').focus(); prefs.seenHelp = true; savePrefs(); }
}

/* ---------- start ---------- */
$('logoHead').innerHTML = GOAT_HEAD;
$('legend').innerHTML = [
  [pieceArt('A', 2, true), 'The goat'],
  [pieceArt('B', 2, true), 'Hay bale'],
  [pieceArt('D', 2, true), 'Apple crate'],
  [pieceArt('C', 3, true), 'Tractor'],
  [`<span class="post-ico">${postArt()}</span>`, 'Fence post (never moves)'],
].map(([art, name]) => `<div>${art}<span>${name}</span></div>`).join('');
drawSoundBtn();
$('soundBtn').addEventListener('click', () => { prefs.sound = !prefs.sound; savePrefs(); drawSoundBtn(); if (prefs.sound) sfx.pick(); });
$('helpBtn').addEventListener('click', () => openHelp(true));
$('helpClose').addEventListener('click', () => openHelp(false));
$('helpOk').addEventListener('click', () => openHelp(false));
$('help').addEventListener('click', (e) => { if (e.target === $('help')) openHelp(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('help').hidden) openHelp(false); });
$('tabToday').addEventListener('click', () => showTab('today'));
$('tabPractice').addEventListener('click', () => showTab('practice'));
// No pinch-zoom while dragging pieces around (Safari's own gesture events).
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => { if (e.target.closest && e.target.closest('.pen')) e.preventDefault(); }, { passive: false });

Today.init();
Practice.init();
showTab(location.hash === '#practice' ? 'practice' : prefs.tab === 'practice' ? 'practice' : 'today');
Today.load();
if (!prefs.seenHelp) setTimeout(() => openHelp(true), 400);
