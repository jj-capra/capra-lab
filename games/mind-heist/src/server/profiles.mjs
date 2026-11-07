// Profiles, streaks, ranks, badges and friends. Pure helpers over plain objects;
// the API layer reads and writes them.
import { pacificDate, addDays, dayDiff, weekId } from './content.mjs';
import { WIN_BONUS } from './engine.mjs';
import { emoRow } from '../shared/emoji.mjs';

export const RANKS = [
  [0, 'Petty Thief'], [1000, 'Pickpocket'], [3000, 'Lookout'], [6000, 'Getaway Driver'], [10000, 'Safecracker'],
  [16000, 'Insider'], [25000, 'Con Artist'], [40000, 'Vault Breaker'], [60000, 'Mastermind'], [100000, 'Notorious'],
];
export function rankOf(haul) {
  let i = 0;
  while (i + 1 < RANKS.length && haul >= RANKS[i + 1][0]) i++;
  const next = RANKS[i + 1];
  return { i, name: RANKS[i][1], floor: RANKS[i][0], next: next ? next[0] : null, nextName: next ? next[1] : null };
}

export const BADGES = {
  first_heist: { name: 'First heist', how: 'Finish your first game' },
  big_brain: { name: 'Big brain', how: 'Get a $400 tile right' },
  clutch: { name: 'Clutch', how: 'Lock a right answer with 3 seconds or less left' },
  hacker_slayer: { name: 'Hacker slayer', how: 'Beat a Hacker tile' },
  double_trouble: { name: 'Double trouble', how: 'Get the Double right' },
  on_fire: { name: 'On fire', how: 'Earn an on-fire bonus' },
  flawless: { name: 'Flawless', how: 'Get all 12 tiles right in a run' },
  mvp: { name: 'MVP', how: 'Top earner in a crew game' },
  comeback: { name: 'Comeback', how: 'Win after your crew trailed by $600 or more' },
  challenger: { name: 'Called out', how: 'Win a challenge' },
  squad: { name: 'Squad', how: 'Have 5 friends' },
  streak_3: { name: 'Hat trick', how: 'Play 3 days in a row' },
  streak_7: { name: 'Week one', how: 'Play 7 days in a row' },
  streak_30: { name: 'Lifer', how: 'Play 30 days in a row' },
};

export function newProfile({ pid, name, avatar, tokenHash, key, now }) {
  return {
    pid, name, avatar, theme: 'heist', created: now, tokens: [tokenHash], key,
    haul: 0, games: 0, wins: 0, losses: 0, runs: 0, right: 0, answered: 0, best: 0,
    streak: { cur: 0, best: 0, last: null, frz: 0 }, week: { id: null, haul: 0 }, daily: null,
    badges: {}, friends: [], h2h: {}, recent: [],
    gems: 0, hand: [], draw: null, trophies: [],
  };
}

// Streak as of `today` without changing anything (a missed day shows 0).
export function liveStreak(p, today) {
  const s = p.streak || {};
  if (!s.last) return 0;
  const gap = dayDiff(s.last, today);
  if (gap <= 1) return s.cur;
  if (gap === 2 && s.frz > 0) return s.cur;
  return 0;
}

function bumpStreak(p, today) {
  const s = (p.streak ||= { cur: 0, best: 0, last: null, frz: 0 });
  if (s.last === today) return { cur: s.cur, froze: false };
  const gap = s.last ? dayDiff(s.last, today) : null;
  let froze = false;
  if (gap === 1) s.cur += 1;
  else if (gap === 2 && s.frz > 0) { s.frz -= 1; s.cur += 1; froze = true; }
  else s.cur = 1;
  s.last = today;
  s.best = Math.max(s.best, s.cur);
  if (s.cur % 7 === 0) s.frz = Math.min(2, s.frz + 1);
  return { cur: s.cur, froze };
}

export function publicProfile(p, today, viewerPid = null) {
  const r = rankOf(p.haul);
  const daily = p.daily && p.daily.date === today ? p.daily : null;
  const week = p.week && p.week.id === weekId(today) ? p.week.haul : 0;
  const out = {
    pid: p.pid, name: p.name, avatar: p.avatar, haul: p.haul, rank: r.name, rankI: r.i,
    streak: liveStreak(p, today), bestStreak: (p.streak || {}).best || 0,
    games: p.games, wins: p.wins, runs: p.runs, acc: p.answered ? Math.round((p.right / p.answered) * 100) : null,
    best: p.best, week, today: daily ? { score: daily.score, grid: daily.grid, deckId: daily.deckId } : null,
    badges: Object.keys(p.badges || {}).length,
    trophies: (p.trophies || []).length,
  };
  if (viewerPid && p.h2h && p.h2h[viewerPid]) out.vsYou = p.h2h[viewerPid];
  return out;
}

export function privateProfile(p, today) {
  return { ...publicProfile(p, today), key: p.key, lab: p.lab || null, theme: p.theme || 'heist', emo: emoRow(p.emo), rankInfo: rankOf(p.haul), badgeList: p.badges || {},
    freezes: (p.streak || {}).frz || 0, recent: (p.recent || []).slice(0, 10), friends: p.friends || [], created: p.created, h2h: p.h2h || {},
    ...vaultOf(p, today) };
}

// Diamonds, cards and Vault Jam trophies: the parts of a profile only its owner sees.
export function vaultOf(p, today) {
  const draw = p.draw && p.draw.day === today ? p.draw : null;
  return {
    gems: p.gems || 0, hand: (p.hand || []).map(c => ({ id: c.id, k: c.k })),
    drew: draw ? draw.card : null,
    trophyList: (p.trophies || []).slice(-30),
  };
}

// Bank one finished room for one player. Returns what changed for the results screen.
export function applyGame(p, room, mid, now, { official = false, grid = null } = {}) {
  const today = pacificDate(now);
  const st = room.st[mid] || { earn: 0, right: 0, wrong: 0, big: 0, clutch: 0, hack: 0, dbl: 0, fire: 0 };
  const solo = room.kind === 'solo';
  const k = solo ? 0 : room.crews.findIndex(c => c.mem.includes(mid));
  const won = !solo && k >= 0 && room.winner === k;
  const lost = !solo && k >= 0 && room.winner !== -1 && room.winner !== k;
  const earned = Math.max(0, solo ? room.crews[0].haul : st.earn) + (won ? WIN_BONUS : 0);
  const before = rankOf(p.haul);
  p.haul += earned;
  if (solo) { p.runs += 1; p.best = Math.max(p.best || 0, room.crews[0].haul); }
  else { p.games += 1; if (won) p.wins += 1; if (lost) p.losses += 1; }
  p.right += st.right; p.answered += st.right + st.wrong;
  const wk = weekId(today);
  if (!p.week || p.week.id !== wk) p.week = { id: wk, haul: 0 };
  p.week.haul += earned;
  if (official) p.daily = { date: today, deckId: room.deckId, score: room.crews[0].haul, grid };
  const streak = bumpStreak(p, today);
  const fresh = [];
  const give = (id) => { if (!p.badges[id]) { p.badges[id] = today; fresh.push(id); } };
  give('first_heist');
  if (st.big) give('big_brain');
  if (st.clutch) give('clutch');
  if (st.hack) give('hacker_slayer');
  if (st.dbl) give('double_trouble');
  if (st.fire) give('on_fire');
  if (solo && room.crews[0].right === 12) give('flawless');
  if (!solo && room.mvp === mid && st.earn > 0) give('mvp');
  if (won && room.crews[k].behind >= 600) give('comeback');
  if (streak.cur >= 3) give('streak_3');
  if (streak.cur >= 7) give('streak_7');
  if (streak.cur >= 30) give('streak_30');
  if ((p.friends || []).length >= 5) give('squad');
  p.recent = [{ at: now, kind: room.kind, deck: room.deckTitle, earned, result: solo ? 'run' : won ? 'win' : lost ? 'loss' : 'tie', challenge: room.challengeId || null }, ...(p.recent || [])].slice(0, 20);
  const after = rankOf(p.haul);
  return { earned, won, lost, streak: streak.cur, froze: streak.froze, badges: fresh, rank: after.name, rankUp: after.i > before.i, haul: p.haul, official };
}

export function addFriend(p, otherPid) {
  if (!otherPid || otherPid === p.pid) return false;
  p.friends ||= [];
  if (p.friends.includes(otherPid)) return false;
  p.friends.push(otherPid);
  if (p.friends.length > 300) p.friends.shift();
  if (p.friends.length >= 5) p.badges['squad'] ||= pacificDate(Date.now());
  return true;
}
