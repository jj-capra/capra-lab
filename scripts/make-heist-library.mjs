// Writes lab/heist-library.mjs, the trap house's library (JC, Nov 2026: "a library of hard trivia
// questions, tough golf holes, an impossible goat getaway"): the hard Mind Heist questions (400 and up,
// public decks only, never a JJ Brew) and the tough Par-Tee Time holes (the Hard courses and up, par 3
// or more), so the heist server can check answers and pars without loading the games.
//   node scripts/make-heist-library.mjs        (run it again after adding decks or holes; commit the result)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const plan = JSON.parse(readFileSync(new URL('games/mind-heist/deck_plan.json', root), 'utf8'));
const brew = new Set(plan.filter((d) => d.brew).map((d) => d.id));
const titles = Object.fromEntries(plan.map((d) => [d.id, d.title]));
const trivia = [];
for (const f of readdirSync(new URL('games/mind-heist/decks/', root)).filter((f) => f.endsWith('.json')).sort()) {
  const list = JSON.parse(readFileSync(new URL('games/mind-heist/decks/' + f, root), 'utf8'));
  for (const deck of Array.isArray(list) ? list : [list]) {
    if (!deck || !deck.id || brew.has(deck.id) || !titles[deck.id]) continue;
    for (const cat of deck.categories || []) for (const q of cat.questions || []) {
      if (!(q.value >= 400) || !Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(q.answer)) continue;
      trivia.push({ q: q.q, o: q.options, a: q.answer, c: cat.name, d: titles[deck.id], v: q.value });
    }
  }
}

// Par-Tee Time's holes, read from the page with the same trick as its par tool.
const src = readFileSync(new URL('games/par-tee-time/index.html', root), 'utf8');
const a = src.indexOf('PAR-TEE TIME · engine'), b = src.indexOf('PAR-TEE TIME · renderer');
const code = src.slice(src.lastIndexOf("'use strict';", a), src.lastIndexOf("'use strict';", b));
const { HOLE_DEFS, COURSE_SETS } = new Function(code + '\nreturn { HOLE_DEFS, COURSE_SETS };')();
const TOUGH = ['afterhours', 'graveyard', 'gauntlet', 'boss'];
const holes = HOLE_DEFS.filter((d) => TOUGH.includes(d.course) && d.par >= 3).map((d) => {
  const c = COURSE_SETS.find((x) => x.id === d.course);
  return { id: d.id, name: d.name, par: d.par, course: c.name, tag: c.tag, theme: d.theme };
});

// Every hole, for Par-Tee Time's Daily 3 (lab/daily.js deals three a day, one from each third of the
// courses): id, name, par, theme and the course's place in the order (ci, 0 easiest to 7 hardest).
const golf = HOLE_DEFS.map((d) => ({ id: d.id, name: d.name, par: d.par, theme: d.theme, ci: COURSE_SETS.findIndex((x) => x.id === d.course) }));

const out = `// Made by scripts/make-heist-library.mjs; don't edit by hand. The trap house's library: hard Mind Heist
// questions (TRIVIA: q, o options, a answer, c category, d deck, v value) and tough Par-Tee Time holes (HOLES);
// every Par-Tee Time hole for the Daily 3 (GOLF: id, name, par, theme, ci the course's place, easiest first).
export const TRIVIA = ${JSON.stringify(trivia)};
export const HOLES = ${JSON.stringify(holes, null, 0).replace(/},{/g, '},\n  {')};
export const GOLF = ${JSON.stringify(golf, null, 0).replace(/},{/g, '},\n  {')};
`;
writeFileSync(new URL('lab/heist-library.mjs', root), out);
console.log(`${trivia.length} hard questions, ${holes.length} tough holes, ${golf.length} holes in all`);
