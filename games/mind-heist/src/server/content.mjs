// Deck content and the daily calendar. Decks live only on the server so the
// answer keys never reach a browser before a reveal.
import DECKS from './decks.gen.json' with { type: 'json' };

export const TZ = 'America/Los_Angeles';

const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export function pacificDate(ms) { return dateFmt.format(new Date(ms)); }

export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export function dayDiff(a, b) {
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}
// Week id = the Monday that starts the week (Pacific).
export function weekId(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun
  return addDays(ymd, -((dow + 6) % 7));
}

const BY_ID = Object.fromEntries(DECKS.map(d => [d.id, d]));
const DATED = DECKS.filter(d => d.date).sort((a, b) => (a.date < b.date ? -1 : 1));
const CLASSICS = DECKS.filter(d => !d.date);

export function deck(id) { return BY_ID[id] || null; }
export function dropNo(d) { const i = DATED.indexOf(d); return i < 0 ? null : i + 1; }

export function calendar(now) {
  const today = pacificDate(now);
  const dropped = DATED.filter(d => d.date <= today);
  let featured = DATED.find(d => d.date === today) || null;
  let encore = false;
  if (!featured && DATED.length) {
    if (dropped.length === DATED.length) {
      const k = (dayDiff(DATED[DATED.length - 1].date, today) - 1) % DATED.length;
      featured = DATED[k]; encore = true;
    } else if (!dropped.length) featured = DATED[0];
    else featured = dropped[dropped.length - 1];
  }
  const vault = dropped.slice().reverse().concat(CLASSICS);
  if (featured && !vault.includes(featured)) vault.unshift(featured);
  return { today, featured, encore, vault, nextExists: DATED.some(d => d.date > today) };
}

// Joke of the day: one joke deck a day, separate from the trivia drop. The run starts with
// Groan Up on Nov 4, 2026 (launch day) and cycles; the seasonal decks get their own days instead:
// Turkey Talk on Thanksgiving (4th Thursday of November), Monster Mash on Halloween,
// Sweater Weather on December 1, 21 and 24.
const JOKES = DECKS.filter(d => d.kind === 'jokes').sort((a, b) => (a.id < b.id ? -1 : 1));
const JOKE_START = '2026-11-04';
const JOKE_PINS = { turkey: 'jokes-24', monster: 'jokes-19', winter: 'jokes-30' };
const JOKE_CYCLE = JOKES.filter(d => d.id !== JOKE_PINS.turkey && d.id !== JOKE_PINS.winter);
export function thanksgiving(y) {
  const dow = new Date(Date.UTC(y, 10, 1)).getUTCDay();
  return `${y}-11-${String(1 + ((4 - dow + 7) % 7) + 21).padStart(2, '0')}`;
}
export function jokeOfDay(now) {
  if (!JOKES.length) return null;
  const today = pacificDate(now);
  const md = today.slice(5);
  const pin = (id) => BY_ID[id] && BY_ID[id].kind === 'jokes' ? BY_ID[id] : null;
  let d = null;
  if (today === thanksgiving(+today.slice(0, 4))) d = pin(JOKE_PINS.turkey);
  else if (md === '10-31') d = pin(JOKE_PINS.monster);
  else if (md === '12-01' || md === '12-21' || md === '12-24') d = pin(JOKE_PINS.winter);
  if (d) return d;
  const list = JOKE_CYCLE.length ? JOKE_CYCLE : JOKES;
  const n = dayDiff(JOKE_START, today);
  return list[((n % list.length) + list.length) % list.length];
}

export function summary(d, extra = {}) {
  if (!d) return null;
  return { id: d.id, title: d.title, shelf: d.shelf, kind: d.kind || null, blurb: d.blurb || '', date: d.date, no: dropNo(d),
    cats: d.categories.slice(0, 3).map(c => c.name), ...extra };
}

export function isOpen(id, now) { return calendar(now).vault.some(d => d.id === id); }

// Questions for sudden death: $200+ from other open decks.
// A joke game's tiebreaker is a joke from another joke deck; trivia games get trivia.
export function suddenPool(now, excludeId) {
  const out = [];
  const kind = (BY_ID[excludeId] && BY_ID[excludeId].kind) || null;
  for (const d of calendar(now).vault) {
    if (d.id === excludeId || (d.kind || null) !== kind) continue;
    for (const c of d.categories) for (const q of c.questions) if (q.value >= 200) out.push({ q, from: d.title });
  }
  return out;
}

export const ALL_DECKS = DECKS;
