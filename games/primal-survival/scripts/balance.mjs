/* Balance harness. Plays many seasons and reports the survival curve.
 *
 * Three populations, because they answer different questions:
 *   random   someone who took whatever the reels dealt
 *   decent   someone who picked the best available for each slot from a spin
 *   expert   the strongest legal five in the game
 *
 * run:  node scripts/balance.mjs [runsPerGroup]
 */
import { ROLES } from '../shared/constants.js';
import { ROSTER } from '../shared/roster.js';
import { runSeason, rating } from '../shared/engine.js';
import { gradeFor } from '../shared/grade.js';

const N = Number(process.argv[2]) || 240;

const rngOf = seed => { let t = seed >>> 0;
  return () => { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; }; };

function randomSquad(seed) {
  const r = rngOf(seed), used = new Set(), s = {};
  for (const role of ROLES) {
    const c = ROSTER.filter(a => a.roles.includes(role) && !used.has(a.id));
    const p = c[Math.floor(r() * c.length)];
    used.add(p.id); s[role] = p;
  }
  return s;
}
/* picks the best of a random shortlist per slot — a player who is trying */
function decentSquad(seed) {
  const r = rngOf(seed), used = new Set(), s = {};
  for (const role of ROLES) {
    const c = ROSTER.filter(a => a.roles.includes(role) && !used.has(a.id));
    const shortlist = Array.from({ length: 12 }, () => c[Math.floor(r() * c.length)]);
    const p = shortlist.reduce((x, y) => rating(y, role) > rating(x, role) ? y : x);
    used.add(p.id); s[role] = p;
  }
  return s;
}
function expertSquad() {
  const used = new Set(), s = {};
  for (const role of ROLES) {
    const p = ROSTER.filter(a => a.roles.includes(role) && !used.has(a.id))
      .sort((x, y) => rating(y, role) - rating(x, role))[0];
    used.add(p.id); s[role] = p;
  }
  return s;
}

function report(label, days) {
  days.sort((a, b) => a - b);
  const at = q => days[Math.min(days.length - 1, Math.floor(q * days.length))];
  const pct = n => (100 * days.filter(d => d >= n).length / days.length).toFixed(0) + '%';
  console.log(
    label.padEnd(8) +
    'median ' + String(at(0.5)).padStart(3) +
    '  p90 ' + String(at(0.9)).padStart(3) +
    '  max ' + String(days[days.length - 1]).padStart(3) +
    '   past 50: ' + pct(50).padStart(4) +
    '  past 100: ' + pct(100).padStart(4) +
    '  past 200: ' + pct(200).padStart(4) +
    '  365: ' + pct(365).padStart(4)
  );
}

const groups = {
  random: i => randomSquad(i * 7919 + 13),
  decent: i => decentSquad(i * 104729 + 7),
  expert: () => expertSquad()
};
console.log('\nroster ' + ROSTER.length + ' · ' + N + ' seasons per group\n');
const grades = {};
for (const [name, make] of Object.entries(groups)) {
  const days = [];
  for (let i = 0; i < N; i++) {
    const r = runSeason(make(i), 'bal-' + i);
    days.push(r.days);
    if (name !== 'expert') {
      const g = gradeFor(r.days).letter;
      grades[g] = (grades[g] || 0) + 1;
    }
  }
  report(name, days);
}
console.log('\ngrade spread (random + decent):',
  Object.entries(grades).sort((a, b) => b[1] - a[1]).map(([g, n]) => g + ' ' + n).join('  '));
console.log('');
