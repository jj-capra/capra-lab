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
import { rating, simulateDay, squadIds, adaptBonus } from '../shared/engine.js';
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
  ['whoHome', 'whoProfile', 'whoBoard', 'whoDraft'].forEach(id => {
    const el = $(id); if (el) el.innerHTML = label;
  });
}

/* ---------------- screens ---------------- */
const VIEWS = ['viewHome', 'viewProfile', 'viewBoard', 'viewDraft', 'viewSeason', 'viewResult'];
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
    /* the server's number is the real one — if it disagrees, say so plainly */
    const mine = Number($('gCount').textContent);
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
      : '<div class="lrow"><span>Nobody has finished a run today.</span></div>';
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
      : '<div class="lrow"><span>' + (boardScope === 'lifetime'
          ? 'Nobody has banked a run yet.'
          : 'Nobody has finished a run today.') + '</span></div>';
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
      '<span class="dn">' + (a ? a.name : ROLE_LABEL[r]) + '</span></div>';
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
  do { combo = COMBOS[Math.floor(Math.random() * COMBOS.length)]; tries++; }
  while (tries < 40 && !usable(combo));
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
  current = others[Math.floor(Math.random() * others.length)];
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
function finish(loss) {
  clearTimeout(timer); timer = null;
  show('viewResult');
  const days = loss ? season.day - 1 : 365;
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
$('againBtn').onclick = () => {
  squad = {}; respins = { era: 1, biome: 1 }; spun = 0; current = null; season = null; fast = false;
  show('viewDraft');
  $('spinZone').classList.remove('hidden');
  $('runBtn').classList.add('hidden');
  $('spinBtn').classList.remove('hidden');
  $('pool').innerHTML = '';
  renderDiscs(); renderField(); showReels();
  document.body.classList.remove('compact');
  $('spinNote').textContent = 'Five spins, five slots. One respin of each reel.';
  $('stripNote').textContent = 'nobody has done it';
};


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
$('goPlay').onclick = () => { show('viewDraft'); };
$('goBoard').onclick = () => { show('viewBoard'); openBoard('today'); };
$('goProfile').onclick = () => { show('viewProfile'); paintProfile(); };
$('pHome').onclick = () => show('viewHome');
$('bHome').onclick = () => show('viewHome');
$('dHome').onclick = () => show('viewHome');
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
renderDiscs();
renderField();
showReels();

connect().then(loadBoard);
