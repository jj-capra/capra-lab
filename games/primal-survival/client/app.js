/* Primal Survival — browser client.
 *
 * All simulation lives in ../shared/engine.js and is shared verbatim with the
 * server. This file is only the document: reels, badges, the battlefield, the
 * day ticker and the verdict. It plays the season locally so the run animates
 * with no network round trip, then submits the squad for the server to replay
 * and score. If the API is unreachable the game still plays, offline, against
 * procedural opponents.
 */
import { ROLES, ROLE_LABEL, ROLE_DESC, ERA_NAME, BIOME_NAME } from '../shared/constants.js';
import { ROSTER, COMBOS } from '../shared/roster.js';
import { rating, simulateDay, squadIds, adaptBonus, runSeason, resolveSquad } from '../shared/engine.js';
import { BEST_OF, roundSeed, spinOrder, respinRoll } from '../shared/versus.js';
import { TUNE, BEATS } from '../shared/constants.js';
import { gradeFor, epitaph } from '../shared/grade.js';
import { badge, discSVG, fieldSVG } from './render.js';
import { rankFor } from '../shared/ranks.js';
import { keyCardBlob, readKeyCardFile } from './keycard.js';
import { massLabel, speedLabel, inPeople, TO_LB, TO_MPH } from './format.js';

const $ = id => document.getElementById(id);

/* ---------------- network ----------------
 * Everything here degrades to offline play. NET.ladder stays null when the API
 * is absent, and the engine falls back to procedural opponents. */
const NET = { seed: new Date().toISOString().slice(0, 10), ladder: null, online: false };

/* ---------------- identity ----------------
 * A name and a six-digit key, held in localStorage so the browser stays signed
 * in. The key is sent with a run so the server can bank it against a career;
 * without one you can still play and still make today's board, you just have
 * nothing that accumulates. */
/* Capra Lab's key: every game in the lab shares one signed-in player */
const ME_KEY = 'capra-lab.profile';
let me = null;
function loadMe() {
  try { me = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch { me = null; }
}
function saveMe(p) {
  me = p;
  try {
    if (p) localStorage.setItem(ME_KEY, JSON.stringify(p));
    else localStorage.removeItem(ME_KEY);
  } catch { /* private mode — the session still works, it just will not persist */ }
  paintWho();
}
function paintWho() {
  const label = me
    ? 'Playing as<b>' + me.name + '</b>'
    : 'Playing as<b>Guest</b>';
  ['whoHome', 'whoVs', 'whoProfile', 'whoBoard', 'whoDraft'].forEach(id => {
    const el = $(id); if (el) el.innerHTML = label;
  });
}

/* ---------------- screens ---------------- */
const VIEWS = ['viewHome', 'viewVs', 'viewProfile', 'viewBoard', 'viewDraft', 'viewSeason', 'viewResult'];
function show(view) {
  VIEWS.forEach(v => { const el = $(v); if (el) el.classList.toggle('hidden', v !== view); });
  window.scrollTo(0, 0);
}

async function api(path, opts) {
  /* relative, so the API resolves next to the page: /primal-survival/api/ in
     Capra Lab, /api/ on the local dev server */
  const res = await fetch(path.replace(/^\/api\//, 'api/'), opts);
  let body = null;
  try { body = await res.json(); } catch { /* not json — handled below */ }
  if (!res.ok) {
    const err = new Error((body && body.error) || ('HTTP ' + res.status));
    err.status = res.status;
    throw err;
  }
  return body;
}

/* Why the API is unreachable, in words that point at the real cause. A 404
 * here does not mean the network is down — it means the function is not
 * deployed, which is a different thing to go and fix. Calling both of those
 * "Offline" once cost an afternoon of looking in the wrong place. */
let offlineReason = 'The game still plays. Nothing will be recorded.';
async function connect() {
  try {
    const s = await api('/api/season');
    NET.seed = s.seed;
    const l = await api('/api/ladder?seed=' + encodeURIComponent(s.seed));
    NET.ladder = l.ladder.length >= 8 ? l.ladder : null;
    NET.online = true;
    $('netLine').textContent = NET.ladder
      ? 'Season ' + s.seed + ' \u00b7 ' + l.ladder.length + ' player squads on the ladder'
      : 'Season ' + s.seed + ' \u00b7 ladder still filling, you face wild packs today';
  } catch (e) {
    NET.online = false;
    if (e.status === 404) {
      offlineReason = 'This site has no game API, so nothing can be recorded. ' +
                      'The server function did not deploy.';
      $('netLine').textContent = 'No server \u00b7 wild packs only';
    } else if (e.status >= 500) {
      offlineReason = e.message;
      $('netLine').textContent = 'Server trouble \u00b7 wild packs only';
    } else {
      offlineReason = 'No connection, so nothing can be recorded.';
      $('netLine').textContent = 'Offline \u00b7 wild packs only';
    }
  }
}
async function submitRun() {
  if (!NET.online) { $('verifyLine').textContent = offlineReason; return; }
  $('submitBtn').disabled = true;
  $('verifyLine').textContent = 'Replaying your year on the server\u2026';
  try {
    const body = { seed: NET.seed, squad: squadIds(squad) };
    if (me) { body.name = me.name; body.code = me.code; }
    else body.name = $('playerName').value;
    const out = await api('/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (out.career) {
      me.stats = out.career.stats;
      me.rank = out.career.rank;
      saveMe(me);
    }
    /* the server's number is the real one — if it disagrees, say so plainly.
       Compare with the run's own count, not the number on screen: that one is
       still counting up for a moment after the result appears. */
    const mine = runDays;
    $('verifyLine').textContent = out.days === mine
      ? 'Verified \u00b7 ' + out.days + ' days \u00b7 ' + out.grade + ' \u00b7 place ' +
        out.place + ' of ' + out.of + (out.duplicate ? ' (already on the board)' : '')
      : 'Server scored this run ' + out.days + ' days, not ' + mine + '. Its number stands.';
    loadBoard();
  } catch (e) {
    $('verifyLine').textContent = 'Could not reach the board: ' + e.message;
    $('submitBtn').disabled = false;
  }
}
async function loadBoard() {
  try {
    const b = await api('/api/leaderboard?seed=' + encodeURIComponent(NET.seed) + '&limit=10');
    $('leaderBoard').innerHTML = b.entries.length
      ? b.entries.map(e => row(e, 'today')).join('')
      : '<div class="lrow empty">Nobody has finished a run today.</div>';
  } catch { /* leave it empty */ }
}

/* one row shape for both boards, so they read the same */
function row(e, scope) {
  const mine = me && e.handle && e.handle === me.handle;
  if (scope === 'lifetime') {
    return '<div class="lrow' + (mine ? ' me' : '') + '"><span>' + e.place + '</span>' +
      '<span>' + e.name + '<span class="sub">' + e.rank + ' \u00b7 ' + e.runs +
      (e.runs === 1 ? ' run' : ' runs') + ' \u00b7 best ' + e.bestDays + '</span></span>' +
      '<span>' + (e.bestGrade || '') + '</span><b>' + e.totalDays.toLocaleString() + '</b></div>';
  }
  return '<div class="lrow' + (mine ? ' me' : '') + '"><span>' + e.place + '</span>' +
    '<span>' + e.name + '</span><span>' + e.grade + '</span><b>' + e.days + '</b></div>';
}

/* ---------------- the full leaderboard screen ---------------- */
let boardScope = 'today';
async function openBoard(scope) {
  boardScope = scope || boardScope;
  $('tabToday').classList.toggle('on', boardScope === 'today');
  $('tabAll').classList.toggle('on', boardScope === 'lifetime');
  $('bigBoard').innerHTML = '';
  $('boardNote').textContent = 'Loading\u2026';
  if (!NET.online) {
    $('boardNote').textContent = offlineReason;
    return;
  }
  try {
    const url = boardScope === 'lifetime'
      ? '/api/leaderboard?scope=lifetime&limit=50'
      : '/api/leaderboard?seed=' + encodeURIComponent(NET.seed) + '&limit=50';
    const b = await api(url);
    $('boardNote').textContent = boardScope === 'lifetime'
      ? 'Total days survived across every run \u00b7 profiles only'
      : "Best single run of " + b.seed;
    $('bigBoard').innerHTML = b.entries.length
      ? b.entries.map(e => row(e, boardScope)).join('')
      : '<div class="lrow empty">' + (boardScope === 'lifetime'
          ? 'Nobody has banked a run yet.'
          : 'Nobody has finished a run today.') + '</div>';
  } catch (e) {
    $('boardNote').textContent = 'Could not load the board: ' + e.message;
  }
}

function renderField() {
  const members = ROLES.filter(r => squad[r]).map(r => ({ r, a: squad[r] }));
  if (!members.length && !current) {
    $('field').innerHTML = '<div class="empty">Spin to open a hunting ground.</div>';
    return;
  }
  $('field').innerHTML = fieldSVG(current ? current.biome : null, members);
}

function renderDiscs() {
  $('discs').innerHTML = ROLES.map(r => {
    const a = squad[r];
    return '<div class="disc' + (a ? ' filled' : '') + '">' + discSVG(a, r) +
      '<span class="dn">' + (a ? a.name : '') + '</span></div>';
  }).join('');
}

let squad = {}, current = null, spun = 0, pending = null;
let respins = { era: 1, biome: 1 };
let season = null, timer = null, fast = false, best = 0, tally = {}, lastRes = null;
let feats = { kills: 0, stuns: 0, routs: 0, close: 0 };

function openSlots() { return ROLES.filter(r => !squad[r]); }

function usable(combo) {
  const open = openSlots();
  return combo.pool.some(a =>
    a.roles.some(r => open.includes(r)) && !Object.values(squad).some(s => s.id === a.id));
}
function comboFor(era, biome) {
  return COMBOS.find(c => c.era === era && c.biome === biome);
}
function showReels() {
  $('reelEra').textContent = current ? ERA_NAME[current.era] : '\u2014';
  $('reelBiome').textContent = current ? BIOME_NAME[current.biome] : '\u2014';
  $('respinEra').disabled = !current || respins.era <= 0;
  $('respinBiome').disabled = !current || respins.biome <= 0;
  $('respinEra').textContent = respins.era > 0 ? 'respin era' : 'era respun';
  $('respinBiome').textContent = respins.biome > 0 ? 'respin ground' : 'ground respun';
}
function spin() {
  if (!openSlots().length) return;
  let tries = 0, combo;
  if (VS.active) {
    /* head to head: both players get the same spins, in the same order */
    const order = spinOrder(VS.code, VS.match.round, spun);
    combo = order.find(usable) || order[0];
  } else {
    do { combo = COMBOS[Math.floor(Math.random() * COMBOS.length)]; tries++; }
    while (tries < 40 && !usable(combo));
  }
  current = combo;
  spun++;
  showReels();
  $('spinNote').textContent = 'Take one. It can only fill a job it is built for.';
  $('spinBtn').classList.add('hidden');
  renderField();
  renderPool();
}
/* respin one reel and keep the other. the pair still has to hold a drawable pool */
function respin(axis) {
  if (!current || respins[axis] <= 0) return;
  const others = COMBOS.filter(c =>
    (axis === 'era' ? c.biome === current.biome : c.era === current.era) &&
    (axis === 'era' ? c.era !== current.era : c.biome !== current.biome) && usable(c));
  if (!others.length) { $('spinNote').textContent = 'Nothing else works with that reel.'; return; }
  const roll = VS.active ? respinRoll(VS.code, VS.match.round, spun, axis) : Math.random();
  current = others[Math.floor(roll * others.length)];
  respins[axis]--;
  showReels();
  renderField();
  renderPool();
}

function renderPool() {
  const open = openSlots();
  const el = $('pool');
  el.innerHTML = '';
  const list = current.pool.slice().sort((a, b) =>
    Math.max(...b.roles.map(r => rating(b, r))) - Math.max(...a.roles.map(r => rating(a, r))));
  list.forEach(a => {
    const taken = Object.values(squad).some(s => s.id === a.id);
    const eligible = a.roles.filter(r => open.includes(r));
    const btn = document.createElement('button');
    btn.className = 'tile' + (taken ? ' taken' : '') + (eligible.length ? '' : ' unfit');
    btn.disabled = taken || !eligible.length;
    const shown = (eligible.length ? eligible : a.roles);
    const bestRole = shown.reduce((x, y) => rating(a, y) > rating(a, x) ? y : x, shown[0]);
    btn.innerHTML = badge(a, bestRole, 'full') +
      '<span class="cap">' + massLabel(a.kg) + ' &middot; ' + speedLabel(a.kph) +
      (eligible.length ? '' : '<br>that slot is filled') + '</span>';
    btn.onclick = () => choose(a, eligible);
    el.appendChild(btn);
  });
}

function choose(a, eligible) {
  if (eligible.length === 1) return place(a, eligible[0]);
  pending = a;
  $('sheetName').textContent = a.name;
  $('sheetSil').innerHTML = badge(a, eligible[0], 'mark');
  $('sheetFacts').textContent = massLabel(a.kg) + ' · ' + inPeople(a.kg) + ' · ' +
    speedLabel(a.kph) + ' · ' + a.note;
  const box = $('sheetRoles');
  box.innerHTML = '';
  eligible.forEach(r => {
    const b = document.createElement('button');
    b.className = 'role-opt';
    b.innerHTML = '<span><span class="rn">' + ROLE_LABEL[r] + '</span>' +
      '<span class="rd">' + ROLE_DESC[r] + '</span></span>' +
      '<span class="rv">' + rating(a, r) + '</span>';
    b.onclick = () => { $('sheet').classList.add('hidden'); place(a, r); };
    box.appendChild(b);
  });
  $('sheet').classList.remove('hidden');
}

function place(a, role) {
  squad[role] = a;
  renderDiscs();
  renderField();
  $('pool').innerHTML = '';
  if (openSlots().length) {
    $('spinNote').textContent = openSlots().length +
      ' still to fill. The ground changes every spin.';
    $('spinBtn').classList.remove('hidden');
    $('spinBtn').textContent = 'Spin';
  } else {
    $('spinZone').classList.add('hidden');
    $('runBtn').classList.remove('hidden');
    const avg = Math.round(ROLES.reduce((s, r) => s + rating(squad[r], r), 0) / 5);
    $('stripNote').textContent = 'Your five average ' + avg + '.';
  }
}

$('spinBtn').onclick = () => { document.body.classList.add('compact'); spin(); };
$('respinEra').onclick = () => respin('era');
$('respinBiome').onclick = () => respin('biome');
$('sheetCancel').onclick = () => $('sheet').classList.add('hidden');

/* ---------- season ---------- */
$('runBtn').onclick = () => {
  if (VS.active) return vsLock();
  show('viewSeason');
  season = { day: 0, alive: true, rallies: TUNE.rallies, adapt: 0 };
  tally = {}; ROLES.forEach(r => tally[r] = { w: 0, l: 0 });
  feats = { kills: 0, stuns: 0, routs: 0, close: 0 };
  lastRes = null;
  fast = false;
  tick();
};

/* One sentence for the day. This is the whole season screen on a phone, so it
 * carries the score, the ground and who was standing at the end of it. */
function dayLine(res) {
  const ground = BIOME_NAME[res.terrain].toLowerCase();
  const score = res.wins + '\u2013' + (5 - res.wins);
  if (res.rallied) return 'Broken ' + score + ' in the ' + ground + ' \u2014 and got up anyway.';
  if (!res.survived) {
    const killer = res.duels.find(d => !d.won);
    return 'Lost the ' + ground + ' ' + score + ' to ' + res.opp +
      '. ' + killer.theirs + ' went through your ' + killer.mine + '.';
  }
  const star = res.duels.filter(d => d.won)
    .reduce((a, b) => (b.sA - b.sB) > (a.sA - a.sB) ? b : a);
  if (res.wins === 5) return 'Took the ' + ground + ' 5\u20130 from ' + res.opp + '.';
  if (res.wins === 3) return 'Held the ' + ground + ' ' + score + ' against ' + res.opp +
    '. ' + star.mine + ' made the difference.';
  return 'Beat ' + res.opp + ' ' + score + ' in the ' + ground + '.';
}

let flashTimer = null;
function flash(msg) {
  clearTimeout(flashTimer);
  $('flash').textContent = msg;
  $('flash').classList.add('on');
  flashTimer = setTimeout(() => $('flash').classList.remove('on'), fast ? 400 : 1600);
}

function renderDay(res) {
  $('dayNum').textContent = res.survived || res.rallied ? res.day : res.day - 1;
  $('squadRow').innerHTML = ROLES.map(r => {
    const d = res.duels.find(x => x.myRole === r);
    return '<span class="m ' + (d.won ? 'won' : 'lost') + '">' +
      badge(squad[r], r, 'mark') + '</span>';
  }).join('');
  const line = $('verdictLine');
  line.textContent = dayLine(res);
  line.classList.toggle('bad', !res.survived && !res.rallied);
  $('seasonField').innerHTML = fieldSVG(res.terrain,
    ROLES.map(r => ({ r, a: squad[r] })));
  const el = $('duels');
  el.innerHTML = '';
  res.duels.forEach(d => {
    const row = document.createElement('div');
    row.className = 'duel ' + (d.won ? 'won' : 'lost');
    row.innerHTML =
      '<span class="mine"><span class="silbox">' + badge(d.mineA, d.myRole, 'mark') + '</span>' + d.mine +
        (d.fitNote ? '<span class="why">' + d.fitNote + '</span>' : '') + '</span>' +
      '<span class="mid">' + (d.won ? '▸' : '◂') +
        (d.why ? '<span class="why">' + (d.why.split(' ')[0]) + '</span>' : '') + '</span>' +
      '<span class="theirs"><span class="silbox">' + badge(d.theirsA, d.theirRole, 'mark') + '</span>' + d.theirs + '</span>';
    el.appendChild(row);
  });
}

/* Mirrors runSeason() in the shared engine, a day at a time so it can be
 * watched. The rally and adaptation rules have to match it exactly — the
 * server replays the same year and its answer is the one that counts. */
function tick() {
  if (!season || !season.alive) return;
  season.day++;
  const res = simulateDay(season.day, squad, NET.seed, NET.ladder);
  lastRes = res;
  res.duels.forEach(d => {
    const t = tally[d.myRole];
    if (d.won) {
      t.w++; feats.kills++;
      const margin = (d.sA - d.sB) / Math.max(1, d.sA);
      /* a stun is a win taken from a losing position: the opponent held the counter */
      if (BEATS[d.theirRole] === d.myRole) feats.stuns++;
      if (margin > 0.35) feats.routs++;
      if (margin < 0.04) feats.close++;
    } else t.l++;
  });

  if (!res.survived && season.rallies > 0 && res.wins === TUNE.daysToWin - 1) {
    season.rallies--;
    res.rallied = true;
    flash('Rallied \u00b7 ' + (season.rallies ? season.rallies + ' left' : 'no second chances left'));
  } else if (adaptBonus(season.day) > season.adapt) {
    season.adapt = adaptBonus(season.day);
    flash('The pack adapts \u00b7 +' + season.adapt);
  }

  renderDay(res);
  if (!res.survived && !res.rallied) { season.alive = false; return finish(res); }
  if (season.day >= 365) { season.alive = false; return finish(null); }
  timer = setTimeout(tick, fast ? 8 : res.rallied ? 900 : 170);
}

$('pauseBtn').onclick = () => {
  if (timer) { clearTimeout(timer); timer = null; $('pauseBtn').textContent = 'Resume'; }
  else { $('pauseBtn').textContent = 'Pause'; tick(); }
};
$('fastBtn').onclick = () => { fast = true; if (!timer) tick(); };

function countUp(el, to, ms, done) {
  const start = performance.now();
  (function step(now) {
    const k = Math.min(1, (now - start) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step); else if (done) done();
  })(start);
}
let runDays = 0;
function finish(loss) {
  clearTimeout(timer); timer = null;
  show('viewResult');
  const days = loss ? season.day - 1 : 365;
  runDays = days;
  const perfect = !loss;
  const res = loss || lastRes;
  best = Math.max(best, days);
  const g = gradeFor(days);
  const mph = Math.round(ROLES.reduce((n, r) => n + squad[r].kph, 0) / 5 * TO_MPH);
  const lb = ROLES.reduce((n, r) => n + squad[r].kg, 0) * TO_LB;
  const heft = lb >= 4000 ? Math.round(lb / 2000).toLocaleString() : Math.round(lb).toLocaleString();
  const heftLabel = lb >= 4000 ? 'squad tons' : 'squad pounds';
  $('gLetter').textContent = '';
  $('gRank').classList.remove('on');
  $('statGrid').classList.remove('on');
  $('statGrid').innerHTML = [
    [feats.kills, 'kills'], [feats.stuns, 'stuns'], [feats.routs, 'routs'],
    [feats.close, 'close calls'], [mph, 'avg top speed mph'],
    [heft, heftLabel], ['+' + adaptBonus(days), 'adapted'],
    [TUNE.rallies - season.rallies, 'rallies spent']
  ].map(x => '<div class="stat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('');
  countUp($('gCount'), days, 1400, () => {
    $('gLetter').textContent = g.letter;
    $('gRank').textContent = g.rank;
    $('gRank').classList.add('on');
    setTimeout(() => $('statGrid').classList.add('on'), 160);
  });
  const rallied = TUNE.rallies - season.rallies;
  $('cause').textContent = (perfect
    ? 'Three hundred and sixty-five days. Nothing on earth took one off them.'
    : 'Broken by ' + res.opp + ' in the ' + BIOME_NAME[res.terrain].toLowerCase() +
      ', ' + res.wins + '–' + (5 - res.wins) + ' on day ' + res.day + '.') +
    (rallied ? ' Rallied once along the way.' : '');

  const usedLines = new Set();
  $('fates').innerHTML = ROLES.map(r => {
    const d = res.duels.find(x => x.myRole === r);
    const a = squad[r], t = tally[r];
    const died = !perfect && !d.won;
    return '<div class="fate ' + (died ? 'died' : 'lived') + '">' +
      '<span class="fb">' + badge(a, r, 'mark') + '</span><span>' +
      '<b>' + a.name + '</b><span class="frole">' + ROLE_LABEL[r] + '</span>' +
      '<span class="frec">' + t.w + '–' + t.l + ' across ' + (t.w + t.l) +
      ' duels · ' + (died ? 'killed by ' + d.theirs : 'survived') + '</span>' +
      '<span class="fep">' + epitaph(d, res, perfect, usedLines) + '</span>' +
      '</span></div>';
  }).join('');

  $('shareText').textContent =
    'Primal Survival — ' + g.letter + ' · ' + g.rank + '\n' +
    days + ' days · ' + feats.kills + ' kills · ' + feats.stuns + ' stuns\n' +
    ROLES.map(r => {
      const d = res.duels.find(x => x.myRole === r);
      return ROLE_LABEL[r] + ': ' + squad[r].name +
        (!perfect && !d.won ? ' — killed by ' + d.theirs : ' — survived');
    }).join('\n');
  $('leaderFoot').textContent = 'Best run this session: ' + best + ' days.';
  $('submitBtn').disabled = false;
  $('playerName').classList.toggle('hidden', !!me);
  if (me) $('submitBtn').textContent = "Submit as " + me.name;
  $('verifyLine').textContent = NET.online
    ? 'Submit to have the server replay your year and place it.'
    : offlineReason;
}

$('submitBtn').onclick = submitRun;
$('copyBtn').onclick = () => {
  navigator.clipboard && navigator.clipboard.writeText($('shareText').textContent);
  $('copyBtn').textContent = 'Copied';
  setTimeout(() => $('copyBtn').textContent = 'Copy result', 1400);
};
function resetDraft() {
  squad = {}; respins = { era: 1, biome: 1 }; spun = 0; current = null; season = null; fast = false;
  $('spinZone').classList.remove('hidden');
  $('runBtn').classList.add('hidden');
  $('spinBtn').classList.remove('hidden');
  $('pool').innerHTML = '';
  renderDiscs(); renderField(); showReels();
  document.body.classList.remove('compact');
  $('spinNote').textContent = 'Five spins, five slots. One respin of each reel.';
  $('stripNote').textContent = 'nobody has done it';
}
$('againBtn').onclick = () => { resetDraft(); show('viewDraft'); };


/* ---------------- head to head ----------------
 * JC, Nov 8 2026: "best of five or best of three in head to head deck
 * building and then run". Two players, each on their own phone. Every round
 * both draft five from the same spins (shared/versus.js), lock them in, and
 * both squads run the same year; the longer run takes the round. The server
 * holds the match and plays the runs; the phones replay them day by day. */
const VS_KEY = 'capra-lab.primal.vs';
const GUEST_KEY = 'capra-lab.primal.guest';
const VS = { active: false, drafted: false, code: null, slot: 0, tok: null, match: null, seen: 0,
             bestOf: 3, poll: null, playing: false, joinCode: '' };
const DRAFT_WORDS = { tag: $('tagline').textContent, run: $('runBtn').textContent };
function draftWords() {
  $('tagline').textContent = DRAFT_WORDS.tag;
  $('runBtn').textContent = DRAFT_WORDS.run;
  $('runBtn').disabled = false;
  $('dHome').innerHTML = '&larr; Home';
}
/* quotes written as escapes, so scripts/check-modules.mjs can still read the file */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\u0022': '&quot;', '\u0027': '&#39;' };
const esc = s => String(s == null ? '' : s).replace(/[&<>\u0022\u0027]/g, c => ESC[c]);

function vsStore() {
  try {
    if (VS.code) localStorage.setItem(VS_KEY, JSON.stringify({ code: VS.code, slot: VS.slot, tok: VS.tok, seen: VS.seen }));
    else localStorage.removeItem(VS_KEY);
  } catch { /* private mode: the match still plays, it just will not survive a reload */ }
}
function vsSeat(out, keepSeen = false) {
  const seen = keepSeen && out.code === VS.code ? VS.seen : 0;
  Object.assign(VS, { code: out.code, slot: out.slot, tok: out.tok, match: out.match, seen, joinCode: '' });
  vsStore();
  if (/vs=/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch { /* fine */ } }
}
function vsLeave() {
  clearTimeout(VS.poll);
  Object.assign(VS, { code: null, tok: null, match: null, seen: 0, playing: false });
  vsStore();
  renderVs();
}
function vsBody(body) {
  if (me) { body.name = me.name; body.code = me.code; }
  else {
    body.name = ($('vsName') ? $('vsName').value : '').trim();
    try { localStorage.setItem(GUEST_KEY, body.name); } catch { /* fine */ }
  }
  return body;
}
const vsPost = (op, body) => api('/api/' + op, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
});
const vsName = k => (VS.match && VS.match.players[k] ? VS.match.players[k].name : 'your rival');
const vsLink = code => new URL('./', location.href).href.split('#')[0] + '#vs=' + code;

/* a link (…/primal-survival/#vs=ABCD) opens the match: back into your seat, or to join it */
function vsBoot() {
  try {
    const v = JSON.parse(localStorage.getItem(VS_KEY) || 'null');
    if (v && v.code && v.tok) Object.assign(VS, { code: v.code, slot: v.slot, tok: v.tok, seen: v.seen || 0 });
  } catch { /* nothing saved */ }
  const h = location.hash.match(/vs=([A-Za-z]{4})/);
  if (h) {
    const code = h[1].toUpperCase();
    if (code !== VS.code) VS.joinCode = code;
    openVs();
  }
}
async function openVs() {
  show('viewVs');
  if (VS.joinCode && VS.code !== VS.joinCode) VS.match = null;
  if (VS.code && !VS.joinCode) {
    $('vsBody').innerHTML = '<p class="h2h-lede">Opening match ' + esc(VS.code) + '&hellip;</p>';
    await vsRefresh();
  } else renderVs();
}
async function vsRefresh() {
  if (!VS.code) return renderVs();
  try { VS.match = await api('/api/vs?m=' + VS.code); }
  catch (e) {
    if (e.status === 404) return vsLeave();
    if (!VS.match) { $('vsBody').innerHTML = '<p class="h2h-lede">Could not reach the match: ' + esc(e.message) + '</p>'; return vsSchedule(true); }
  }
  renderVs();
}
function vsSchedule(retry = false) {
  clearTimeout(VS.poll); VS.poll = null;
  if (!VS.code || VS.playing || $('viewVs').classList.contains('hidden')) return;
  const m = VS.match;
  const cur = m && m.rounds[m.round - 1];
  const waiting = retry || !m || !m.players[1] ||
    (m.winner == null && cur && cur.locked[VS.slot] && !cur.locked[1 - VS.slot]) ||
    (m.winner != null && !m.next);
  if (waiting) VS.poll = setTimeout(vsRefresh, document.hidden ? 8000 : 2500);
}

function renderVs() {
  const m = VS.match;
  if (VS.playing) return;
  if (!VS.code || !m) { renderVsStart(); return vsSchedule(); }
  const mine = VS.slot, them = 1 - mine;
  /* a round both squads have run since this phone last looked: watch it first */
  const fresh = m.rounds.find(r => r.days && r.n > VS.seen);
  if (fresh) return playVsRound(fresh);

  const board = '<div class="h2h-board">' + [mine, them].map(k =>
    '<div class="h2h-row p' + k + (m.score[k] > m.score[1 - k] ? ' lead' : '') + (m.players[k] ? '' : ' waiting') + '">' +
    '<span class="nm"><small>' + (k === mine ? 'You' : 'Rival') + '</small>' +
    esc(m.players[k] ? m.players[k].name : 'Waiting for a rival') + '</span>' +
    '<span class="pts">' + m.score[k] + '</span></div>').join('') + '</div>' +
    '<div class="h2h-meta">Best of ' + m.bestOf + ' &middot; first to ' + m.need + ' &middot; match ' + esc(m.code) + '</div>';
  const done = m.rounds.filter(r => r.days);
  const rounds = done.length ? '<div class="h2h-rounds">' + done.map(r =>
    '<div class="lrow"><span>' + r.n + '</span><span>' +
    (r.winner === mine ? 'You took it' : r.winner === them ? esc(vsName(them)) + ' took it' : 'Dead even, played again') +
    '<span class="sub">' + r.days[mine] + ' days to ' + r.days[them] + '</span></span>' +
    '<b>' + (r.winner === mine ? 'W' : r.winner === them ? 'L' : '=') + '</b></div>').join('') + '</div>' : '';

  let main = '';
  if (!m.players[1]) {
    main = '<div class="panel"><h3>Send this to your rival</h3>' +
      '<p>They open the link, or type the code under Head to head, and round one starts.</p>' +
      '<span class="h2h-code">' + esc(m.code) + '</span>' +
      '<button class="btn" id="vsShare">Send the link</button>' +
      '<button class="btn ghost" id="vsCopy">Copy the link</button><div class="msg" id="vsMsg"></div></div>';
  } else if (m.winner != null) {
    const cls = m.winner === mine ? '' : m.winner === them ? ' lost' : ' even';
    const title = m.winner === mine ? 'You win the match' : m.winner === them ? esc(vsName(them)) + ' wins the match' : 'A drawn match';
    main = '<div class="h2h-verdict' + cls + '"><b>' + title + '</b><span>' + m.score[mine] + '&ndash;' + m.score[them] +
      ' &middot; best of ' + m.bestOf + '</span></div>' +
      '<button class="btn" id="vsAgain">' + (m.next ? esc(vsName(them)) + ' wants a rematch: join it' : 'Rematch') + '</button>' +
      '<button class="btn ghost" id="vsNewMatch">New match</button>';
  } else {
    const cur = m.rounds[m.round - 1];
    const locked = cur ? cur.locked : [false, false];
    main = !locked[mine]
      ? '<div class="h2h-status"><b>Round ' + m.round + '</b>Draft your five. ' + esc(vsName(them)) +
        ' gets the same spins.' + (locked[them] ? ' They have locked in already.' : '') + '</div>' +
        '<button class="btn" id="vsDraftBtn">Draft round ' + m.round + '</button>'
      : '<div class="h2h-status"><b>Locked in</b>Waiting for ' + esc(vsName(them)) + ' to draft their five&hellip;</div>';
  }
  $('vsBody').innerHTML = '<h2 class="h2h-title">Head to head</h2>' + board + main + rounds +
    (m.winner == null ? '<button class="btn ghost" id="vsQuit">Leave this match</button>' : '');

  if ($('vsShare')) $('vsShare').onclick = async () => {
    const url = vsLink(m.code);
    if (navigator.share) {
      try { await navigator.share({ title: 'Primal Survival', text: 'Head to head in Primal Survival, best of ' + m.bestOf + '. Code ' + m.code + '.', url }); }
      catch { /* closed the sheet */ }
    } else $('vsCopy').click();
  };
  if ($('vsCopy')) $('vsCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(vsLink(m.code)); $('vsMsg').textContent = 'Link copied. Paste it to your rival.'; }
    catch { $('vsMsg').textContent = vsLink(m.code); }
  };
  if ($('vsDraftBtn')) $('vsDraftBtn').onclick = vsDraft;
  if ($('vsAgain')) $('vsAgain').onclick = async () => {
    $('vsAgain').disabled = true;
    try { vsSeat(await vsPost('vs-again', { m: m.code, tok: VS.tok })); renderVs(); }
    catch (e) { $('vsAgain').disabled = false; $('vsAgain').textContent = e.message; }
  };
  if ($('vsNewMatch')) $('vsNewMatch').onclick = vsLeave;
  if ($('vsQuit')) $('vsQuit').onclick = () => {
    $('vsQuit').textContent = 'Tap again to leave. ' + vsName(them) + ' will be left waiting.';
    $('vsQuit').onclick = vsLeave;
  };
  vsSchedule();
}

function renderVsStart() {
  const join = VS.joinCode;
  let guest = '';
  try { guest = localStorage.getItem(GUEST_KEY) || ''; } catch { /* fine */ }
  const nameBox = me ? '' :
    '<div class="panel"><h3>Your name</h3><p>You are playing as a guest. A Capra Lab profile plays under one name in every game.</p>' +
    '<input id="vsName" maxlength="17" placeholder="Name" autocomplete="off" value="' + esc(guest) + '"></div>';
  const joinBox = '<div class="panel"><h3>' + (join ? 'Join the match' : 'Got a code?') + '</h3>' +
    '<p id="vsHostLine">' + (join ? 'Checking match ' + esc(join) + '&hellip;' : 'Type the four letters your rival sent.') + '</p>' +
    '<input id="vsCode" maxlength="4" placeholder="ABCD" autocomplete="off" autocapitalize="characters" value="' + esc(join) + '">' +
    '<button class="btn' + (join ? '' : ' ghost') + '" id="vsJoin">Join the match</button><div class="msg" id="vsJoinMsg"></div></div>';
  const newBox = '<div class="panel"><h3>Start a match</h3>' +
    '<div class="h2h-pick">' + BEST_OF.map(n => '<button data-n="' + n + '" class="' + (VS.bestOf === n ? 'on' : '') + '">Best of ' + n + '</button>').join('') + '</div>' +
    '<button class="btn' + (join ? ' ghost' : '') + '" id="vsNew">Start the match</button><div class="msg" id="vsNewMsg"></div></div>';
  $('vsBody').innerHTML = '<h2 class="h2h-title">Head to head</h2>' +
    '<p class="h2h-lede">Best of three or five against one friend, each on your own phone. Every round you both draft five from the same spins, then both squads run the same year. The longer run takes the round.</p>' +
    nameBox + (join ? joinBox + newBox : newBox + joinBox);
  $('vsBody').querySelectorAll('.h2h-pick button').forEach(b => {
    b.onclick = () => { VS.bestOf = Number(b.dataset.n); renderVsStart(); };
  });
  if (join) {
    api('/api/vs?m=' + join).then(m => {
      const el = $('vsHostLine');
      if (el) el.textContent = m.players[1]
        ? 'That match already has two players.'
        : m.players[0].name + ' wants a best of ' + m.bestOf + '.';
    }).catch(() => { const el = $('vsHostLine'); if (el) el.textContent = 'No match with that code.'; });
  }
  $('vsNew').onclick = async () => {
    $('vsNew').disabled = true;
    try { vsSeat(await vsPost('vs-new', vsBody({ bestOf: VS.bestOf }))); renderVs(); }
    catch (e) { $('vsNewMsg').className = 'msg bad'; $('vsNewMsg').textContent = e.message; $('vsNew').disabled = false; }
  };
  $('vsJoin').onclick = async () => {
    const code = $('vsCode').value.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) { $('vsJoinMsg').className = 'msg bad'; $('vsJoinMsg').textContent = 'A code is four letters.'; return; }
    $('vsJoin').disabled = true;
    try { vsSeat(await vsPost('vs-join', vsBody({ m: code }))); renderVs(); }
    catch (e) { $('vsJoinMsg').className = 'msg bad'; $('vsJoinMsg').textContent = e.message; $('vsJoin').disabled = false; }
  };
}

function vsDraft() {
  const m = VS.match, mine = VS.slot, them = 1 - mine;
  VS.active = true; VS.drafted = true;
  resetDraft();
  $('tagline').textContent = 'Round ' + m.round + ' against ' + vsName(them) + ', best of ' + m.bestOf +
    '. You both get the same spins. Lock in your five and both squads run the same year; the longer run takes the round.';
  $('stripNote').textContent = 'You ' + m.score[mine] + ' \u2013 ' + m.score[them] + ' ' + vsName(them);
  $('runBtn').textContent = 'Lock in my five';
  $('dHome').innerHTML = '&larr; Match';
  show('viewDraft');
}

async function vsLock() {
  const btn = $('runBtn');
  btn.disabled = true;
  btn.textContent = 'Locking in\u2026';
  try {
    const out = await vsPost('vs-lock', { m: VS.code, tok: VS.tok, round: VS.match.round, squad: squadIds(squad) });
    VS.match = out.match;
  } catch (e) {
    if (e.status !== 409) {
      btn.disabled = false;
      btn.textContent = 'Lock in my five';
      $('stripNote').textContent = 'Could not lock in: ' + e.message;
      return;
    }
    await vsRefresh();
  }
  VS.active = false;
  resetDraft();
  draftWords();
  show('viewVs');
  renderVs();
}

/* one neutral line a day, the same voice for both squads */
function vsLine(res) {
  const ground = BIOME_NAME[res.terrain].toLowerCase();
  const score = res.wins + '\u2013' + (5 - res.wins);
  if (res.rallied) return 'Day ' + res.day + ': broken ' + score + ' in the ' + ground + ', got up anyway.';
  if (!res.survived) return 'Fell on day ' + res.day + ': ' + res.opp + ' took the ' + ground + ' ' + score + '.';
  return 'Day ' + res.day + ': held the ' + ground + ' ' + score + '.';
}

/* Both runs, counted up together. The phone plays the same years the server
 * scored (runSeason in fair mode), so the numbers always match the result. */
function playVsRound(r) {
  VS.playing = true;
  clearTimeout(VS.poll);
  const m = VS.match, mine = VS.slot, them = 1 - mine;
  const seed = roundSeed(m.code, r.n);
  const sides = [mine, them].map(k => {
    const sq = resolveSquad(r.squads[k]);
    const days = [];
    const res = runSeason(sq, seed, null, { fair: true, onDay: d => days.push(d) });
    return { k, sq, days, res };
  });
  const len = Math.max(...sides.map(s => s.days.length));
  $('vsBody').innerHTML = '<h2 class="h2h-title">Round ' + r.n + '</h2>' +
    '<p class="h2h-lede">Same year, same ground, same packs. The longer run takes it.</p>' +
    '<div class="h2h-sides">' + sides.map((s, i) =>
      '<div class="h2h-side p' + s.k + '" id="vsSide' + i + '"><div class="nm">' + (i === 0 ? 'You' : esc(vsName(s.k))) + '</div>' +
      '<div class="dn">0</div><div class="ds">days survived</div>' +
      '<div class="mk">' + ROLES.map(role => '<span>' + badge(s.sq[role], role, 'mark') + '</span>').join('') + '</div>' +
      '<div class="ln"></div></div>').join('') + '</div>' +
    '<div id="vsAfter"><button class="btn ghost" id="vsSkip">Skip ahead</button></div>';
  let d = 0, skip = false;
  const step = Math.max(10, Math.min(60, Math.round(5200 / len)));
  const paint = () => sides.forEach((s, i) => {
    const el = $('vsSide' + i);
    const res = s.days[Math.min(d, s.days.length) - 1];
    if (!el || !res) return;
    const over = d >= s.days.length;
    const fell = over && !s.res.perfect;
    el.querySelector('.dn').textContent = res.survived || res.rallied ? res.day : res.day - 1;
    el.querySelectorAll('.mk span').forEach((sp, j) => {
      const du = res.duels.find(x => x.myRole === ROLES[j]);
      sp.classList.toggle('lost', !!du && !du.won);
    });
    el.querySelector('.ln').textContent = over && s.res.perfect ? 'All 365 days. Nothing took one off them.' : vsLine(res);
    el.classList.toggle('out', fell);
  });
  const end = () => {
    const w = r.winner;
    sides.forEach((s, i) => $('vsSide' + i).classList.toggle('won', w === s.k));
    const cls = w === mine ? '' : w === them ? ' lost' : ' even';
    const title = w === mine ? 'You take round ' + r.n : w === them ? esc(vsName(them)) + ' takes round ' + r.n : 'Dead even. Round ' + r.n + ' again';
    const sub = r.days[mine] !== r.days[them] ? r.days[mine] + ' days to ' + r.days[them]
      : r.kills[mine] !== r.kills[them] ? r.days[mine] + ' days each &middot; ' + r.kills[mine] + ' duels won to ' + r.kills[them]
      : r.first != null ? 'The same five, the same year. ' + (r.first === mine ? 'You' : esc(vsName(them))) + ' locked in first.'
      : r.days[mine] + ' days each';
    const last = m.winner != null && r.n === m.round;
    $('vsAfter').innerHTML = '<div class="h2h-verdict' + cls + '"><b>' + title + '</b><span>' + sub + '</span></div>' +
      '<button class="btn" id="vsOn">' + (last ? 'See the match' : 'On to the scores') + '</button>';
    $('vsOn').onclick = () => { VS.playing = false; VS.seen = Math.max(VS.seen, r.n); vsStore(); renderVs(); };
  };
  const tick = () => {
    if (!VS.playing) return;
    d = skip ? len : d + 1;
    paint();
    if (d >= len) return end();
    setTimeout(tick, step);
  };
  $('vsSkip').onclick = () => { skip = true; };
  tick();
}

/* ---------------- profile screen ---------------- */
function statTile(v, label) {
  return '<div class="stat"><b>' + v + '</b><span>' + label + '</span></div>';
}
function paintProfile() {
  const on = !!me;
  $('signedIn').classList.toggle('hidden', !on);
  $('signedOut').classList.toggle('hidden', on);
  if (!on) return;

  const st = me.stats || { runs: 0, totalDays: 0, bestDays: 0, bestGrade: null, perfect: 0, kills: 0 };
  const rk = me.rank || rankFor(st.totalDays);
  $('profName').textContent = me.name;
  $('profRankNote').textContent = rk.name + ' \u2014 ' + (rk.note || '');
  $('rankNow').textContent = st.totalDays.toLocaleString() + ' days survived';
  $('rankNext').textContent = rk.next
    ? rk.toNext.toLocaleString() + ' to ' + rk.next
    : 'nothing left to climb';
  $('rankFill').style.width = Math.round(Math.max(0, Math.min(1, rk.progress)) * 100) + '%';
  $('profStats').innerHTML =
    statTile(st.runs, 'runs') +
    statTile(st.bestDays, 'best run') +
    statTile(st.bestGrade || '\u2014', 'best grade') +
    statTile(st.perfect, 'perfect years') +
    statTile((st.kills || 0).toLocaleString(), 'kills') +
    statTile(st.totalDays.toLocaleString(), 'days total');
  drawCard();
}

/* the card is redrawn whenever the profile screen opens, so it always shows
   the current career rather than whatever it looked like at sign-up */
function cardPayload() {
  const st = me.stats || {};
  /* the five from their best run, if they have banked one */
  const ids = st.bestSquad ? ROLES.map(r => st.bestSquad[r]) : [];
  const best = ids.map(id => ROSTER.find(a => a.id === id)).filter(Boolean);
  return {
    name: me.name, code: me.code,
    rank: (me.rank || rankFor(st.totalDays || 0)).name,
    stats: st, squad: best,
    site: location.host || ''
  };
}
let cardBusy = false;
async function drawCard() {
  if (cardBusy || !me) return;
  cardBusy = true;
  try {
    const { drawKeyCard } = await import('./keycard.js');
    drawKeyCard($('keyCanvas'), cardPayload());
  } catch { /* canvas unavailable — the printed code still works */ }
  cardBusy = false;
}
async function saveCard() {
  if (!me) return;
  $('keyMsg').className = 'msg';
  $('keyMsg').textContent = 'Drawing your card\u2026';
  try {
    const blob = await keyCardBlob($('keyCanvas'), cardPayload());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'primal-survival-key-' + me.handle + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    $('keyMsg').className = 'msg good';
    $('keyMsg').textContent = 'Saved. Keep it somewhere you will find it.';
  } catch (e) {
    $('keyMsg').className = 'msg bad';
    $('keyMsg').textContent = 'Could not save the card: ' + e.message;
  }
}

async function createProfile() {
  const name = $('newName').value.trim();
  $('createMsg').className = 'msg';
  if (name.length < 2) { $('createMsg').textContent = 'Give it at least two characters.'; return; }
  if (!NET.online) { $('createMsg').textContent = offlineReason; return; }
  $('createBtn').disabled = true;
  $('createMsg').textContent = 'Taking that name\u2026';
  try {
    const p = await api('/api/profile/create', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name })
    });
    saveMe({ name: p.name, handle: p.handle, code: p.code, stats: p.stats, rank: p.rank });
    paintProfile();
    $('keyMsg').className = 'msg good';
    $('keyMsg').textContent = 'This key is shown once. Save the card now.';
  } catch (e) {
    $('createMsg').className = 'msg bad';
    $('createMsg').textContent = e.message;
  }
  $('createBtn').disabled = false;
}

async function signIn(name, code, msgEl) {
  const el = $(msgEl || 'signinMsg');
  el.className = 'msg';
  if (!NET.online) { el.textContent = offlineReason; return false; }
  el.textContent = 'Checking\u2026';
  try {
    const p = await api('/api/profile/signin', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, code })
    });
    saveMe({ name: p.name, handle: p.handle, code: String(code), stats: p.stats, rank: p.rank });
    paintProfile();
    el.className = 'msg good';
    el.textContent = 'Welcome back.';
    return true;
  } catch (e) {
    el.className = 'msg bad';
    el.textContent = e.message;
    return false;
  }
}

async function rotateKey() {
  if (!me) return;
  $('keyMsg').className = 'msg';
  $('keyMsg').textContent = 'Cutting a new key\u2026';
  try {
    const p = await api('/api/profile/key', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: me.name, code: me.code })
    });
    saveMe({ ...me, code: p.code, stats: p.stats, rank: p.rank });
    paintProfile();
    $('keyMsg').className = 'msg good';
    $('keyMsg').textContent = 'New key cut. The old one no longer works \u2014 save the new card.';
  } catch (e) {
    $('keyMsg').className = 'msg bad';
    $('keyMsg').textContent = e.message;
  }
}

/* dropping a key card reads the credentials out of the image and signs in */
async function acceptCard(file) {
  const el = $('signinMsg');
  el.className = 'msg';
  el.textContent = 'Reading the card\u2026';
  const creds = await readKeyCardFile(file);
  if (!creds) {
    el.className = 'msg bad';
    el.textContent = 'No key in that image. A screenshot loses it \u2014 type the printed number instead.';
    return;
  }
  await signIn(creds.name, creds.code);
}

/* ---------------- navigation ---------------- */
$('goPlay').onclick = () => {
  /* coming from a head-to-head draft: start a clean solo one */
  if (VS.active || VS.drafted) { VS.active = false; VS.drafted = false; resetDraft(); draftWords(); }
  show('viewDraft');
};
$('goVs').onclick = () => openVs();
$('vHome').onclick = () => { VS.playing = false; clearTimeout(VS.poll); show('viewHome'); };
$('goBoard').onclick = () => { show('viewBoard'); openBoard('today'); };
$('goProfile').onclick = () => { show('viewProfile'); paintProfile(); };
$('pHome').onclick = () => show('viewHome');
$('bHome').onclick = () => show('viewHome');
$('dHome').onclick = () => { if (VS.active) { show('viewVs'); renderVs(); } else show('viewHome'); };
$('tabToday').onclick = () => openBoard('today');
$('tabAll').onclick = () => openBoard('lifetime');
/* profiles are made in Capra Lab, where the key-card save step cannot be skipped */
$('createBtn').onclick = () => { location.href = '/#profile'; };
$('signinBtn').onclick = () => signIn($('inName').value.trim(), $('inCode').value.trim());
$('saveCardBtn').onclick = saveCard;
$('newKeyBtn').onclick = rotateKey;
$('signoutBtn').onclick = () => { saveMe(null); paintProfile(); };

$('dropZone').onclick = () => $('cardFile').click();
$('cardFile').onchange = e => { if (e.target.files[0]) acceptCard(e.target.files[0]); };
['dragenter', 'dragover'].forEach(ev =>
  $('dropZone').addEventListener(ev, e => { e.preventDefault(); $('dropZone').classList.add('over'); }));
['dragleave', 'drop'].forEach(ev =>
  $('dropZone').addEventListener(ev, e => { e.preventDefault(); $('dropZone').classList.remove('over'); }));
$('dropZone').addEventListener('drop', e => {
  const f = e.dataTransfer && e.dataTransfer.files[0];
  if (f) acceptCard(f);
});

/* written from the data so it cannot go stale as the roster grows */
$('rosterNote').textContent = ROSTER.length + ' animals across ' +
  Object.keys(ERA_NAME).length + ' eras. Mass and top speed are real recorded ' +
  'figures; the five ratings are derived from them plus armour, endurance and guile.';

loadMe();
paintWho();
show('viewHome');
vsBoot();
renderDiscs();
renderField();
showReels();

connect().then(loadBoard);
