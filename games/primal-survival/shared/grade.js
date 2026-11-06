import { rngFrom, hashStr } from './engine.js';
import { BIOME_NAME, BEATS } from './constants.js';
import { fit } from './engine.js';

/* ---------- grading ---------- */
export const GRADES = [
  [365,'∞','Myth'], [300,'S','Legend'], [240,'A+','Apex'], [180,'A','Sovereign'],
  [130,'B+','Dominant'], [90,'B','Contender'], [60,'C+','Hardened'], [35,'C','Survivor'],
  [18,'D+','Hunted'], [8,'D','Prey'], [3,'E','Scavenged'], [0,'F','Carrion']
];
export function gradeFor(days) {
  for (const g of GRADES) if (days >= g[0]) return { letter: g[1], rank: g[2] };
  return { letter: 'F', rank: 'Carrion' };
}

/* ---------- how each one went ---------- */
export const EPITAPHS = {
  smaller: [
    'Killed by something it could have stepped on. There will be no statue.',
    'Brought down by {killer}, which it had not previously considered an animal.',
    'It outweighed {killer} by an order of magnitude. This did not come up.',
    'Died confused.'
  ],
  giant: [
    'There was a shadow, and then there was no {self}.',
    '{killer} did not slow down.',
    'It held its ground against {killer}. Briefly.',
    'It made a decision in the {terrain}. {killer} disagreed.'
  ],
  terrain: [
    'The {terrain} killed it. {killer} only arrived to confirm.',
    'Beaten by the weather, finished by {killer}.',
    'It had never been this far from home. It never was again.',
    'Wrong ground, wrong day, wrong everything.'
  ],
  counter: [
    'Out-thought, not out-fought.',
    'Everything it was built for, {killer} simply went around.',
    'It won every exchange that mattered to it, and none that mattered.',
    '{killer} had its number from the first minute.'
  ],
  close: [
    'Lost by a margin nobody could see. Including it.',
    'A hand’s width of difference, after all that.',
    'It lost by less than the wind.',
    'One better day anywhere in the year and this reads differently.'
  ],
  blowout: [
    'It was never in this. Not for a second.',
    '{killer} made it look like a formality, because it was.',
    'The {terrain} barely noticed.',
    'Comprehensive.'
  ],
  plain: [
    'Killed by {killer} in the {terrain}.',
    '{killer} finished it late in the day.',
    'It went down in the {terrain} and did not get up.',
    'Nothing clever about it. It simply lost.'
  ],
  lived: [
    'Still standing when the others went down. It will never understand why.',
    'Untouched. Alone.',
    'It won its last fight and lost everything anyway.',
    'Walked out of the {terrain} with nothing to walk back to.'
  ],
  perfect: [
    'Three hundred and sixty-five days. Not a mark on it.',
    'It has forgotten what losing would feel like.',
    'Nothing on earth got a day off it.',
    'Retired unbeaten, which nothing has ever done.'
  ]
};
export function epitaph(d, res, perfect, used) {
  const rnd = rngFrom(hashStr('ep:' + d.mine + ':' + d.theirs + ':' + res.day + ':' + d.myRole));
  let key;
  if (perfect) key = 'perfect';
  else if (d.won) key = 'lived';
  else {
    const ratio = d.theirsA.kg / d.mineA.kg;
    const margin = (d.sB - d.sA) / Math.max(1, d.sB);
    if (ratio < 0.12) key = 'smaller';
    else if (ratio > 8) key = 'giant';
    else if (fit(d.mineA, res.terrain) <= 0.86) key = 'terrain';
    else if (BEATS[d.theirRole] === d.myRole) key = 'counter';
    else if (margin < 0.04) key = 'close';
    else if (margin > 0.35) key = 'blowout';
    else key = 'plain';
  }
  const pool = EPITAPHS[key];
  let i = Math.floor(rnd() * pool.length);
  if (used) {
    for (let n = 0; n < pool.length && used.has(pool[i]); n++) i = (i + 1) % pool.length;
    used.add(pool[i]);
  }
  return pool[i]
    .split('{killer}').join(d.theirs)
    .split('{self}').join(d.mine.toLowerCase())
    .split('{terrain}').join(BIOME_NAME[res.terrain].toLowerCase());
}
