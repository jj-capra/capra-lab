/* Primal Survival — simulation engine.
 *
 * This module is isomorphic and pure: given the same squad, seed and opponent
 * pool it produces byte-identical results in a browser and in Node. That is the
 * whole basis of online play — a client never reports how far it got, it reports
 * which five animals it drafted, and the server replays the season itself.
 *
 * Nothing in here touches the DOM, the clock, or Math.random.
 */
import { TUNE, ROLES, BIOME_NAME, BIOME_CLIMATE, BEATS, WEIGHTS } from './constants.js';
import { ROSTER, BY_ID } from './roster.js';

/* ---------- seeded RNG (FNV-1a hash + mulberry32) ---------- */
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function rngFrom(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- ratings ---------- */
export function rating(a, role) {
  const w = WEIGHTS[role];
  let t = 0;
  for (const k in w) t += a[k] * w[k];
  return Math.round(t);
}
export function fit(a, biome) {
  if (a.biomes.includes(biome)) return TUNE.fitHome;
  const cb = BIOME_CLIMATE[biome], ca = a.climate;
  if (ca === cb) return TUNE.fitNeutral;
  if (cb === 'water' || ca === 'water') return TUNE.fitWrongElement;
  if ((ca === 'hot' && cb === 'cold') || (ca === 'cold' && cb === 'hot')) return TUNE.fitWrongClimate;
  return TUNE.fitOff;
}
export function squadRating(squad) {
  return Math.round(ROLES.reduce((n, r) => n + rating(squad[r], r), 0) / ROLES.length);
}

/* ---------- squads travel as ids; animals are looked up locally ---------- */
export function resolveSquad(ids) {
  const out = {};
  for (const r of ROLES) {
    const a = BY_ID.get(ids[r]);
    if (!a) throw new Error('unknown animal id for ' + r + ': ' + ids[r]);
    if (!a.roles.includes(r)) throw new Error(a.name + ' cannot hold the ' + r + ' slot');
    out[r] = a;
  }
  const seen = new Set(ROLES.map(r => out[r].id));
  if (seen.size !== ROLES.length) throw new Error('the same animal cannot fill two slots');
  return out;
}
export function squadIds(squad) {
  const o = {};
  for (const r of ROLES) o[r] = squad[r].id;
  return o;
}

/* ---------- opponents ---------- */
const GN1 = ['Ashfall','Blackwater','Tidewrack','Longshadow','Ninebrand','Coldfront','Saltmarsh','Dry Season','Nightjar','Redkill','Stonewake','Farcry','Deepcut','Hollowbone','Lastlight','Thornfield','Greyfen','Windbreak','Iron Creek','Bitterroot','Palewater','Duskrun','Highwater','Sablewood','Emberfall'];
const GN2 = ['Company','Syndicate','Pack','Crown','Delegation','Concern','League','Choir','Union','Committee','Assembly','Outfit','Household','Council'];

/* A procedurally built opponent, used until enough real squads exist to draw on. */
export function ghostSquad(day, seed) {
  const rnd = rngFrom(hashStr('ghost:' + seed + ':' + day));
  const target = TUNE.ghostBase + TUNE.ghostClimb * Math.pow(day / 365, TUNE.ghostCurve);
  const picked = {}, used = new Set();
  for (const role of ROLES) {
    const cands = ROSTER.filter(a => a.roles.includes(role) && !used.has(a.id));
    const wobble = (rnd() - 0.5) * 10;
    cands.sort((x, y) =>
      Math.abs(rating(x, role) - (target + wobble)) - Math.abs(rating(y, role) - (target + wobble)));
    const pick = cands[Math.floor(rnd() * Math.min(3, cands.length))];
    used.add(pick.id);
    picked[role] = pick;
  }
  const name = GN1[Math.floor(rnd() * GN1.length)] + ' ' + GN2[Math.floor(rnd() * GN2.length)];
  return { name, squad: picked, strength: TUNE.pressBase + TUNE.pressClimb * Math.pow(day / 365, TUNE.pressCurve) };
}

/* A real player's squad, pulled from the ladder.
 * The ladder is sorted weakest first; day N draws from the band of the ladder
 * that matches how far in you are, so the opposition climbs as you do. */
export function ladderSquad(day, seed, ladder) {
  const rnd = rngFrom(hashStr('ladder:' + seed + ':' + day));
  const depth = Math.min(1, Math.pow(day / 365, TUNE.ghostCurve));
  const centre = Math.floor(depth * (ladder.length - 1));
  const spread = Math.max(1, Math.round(ladder.length * 0.08));
  const lo = Math.max(0, centre - spread), hi = Math.min(ladder.length - 1, centre + spread);
  const entry = ladder[lo + Math.floor(rnd() * (hi - lo + 1))];
  return {
    name: entry.name,
    squad: resolveSquad(entry.squad),
    strength: TUNE.pressBase + TUNE.pressClimb * Math.pow(day / 365, TUNE.pressCurve),
    fromPlayer: true
  };
}

/* What your five have learned by a given day. Pure function of the day
 * number, so the server reproduces it without tracking any state. */
export function adaptBonus(day) {
  return Math.min(TUNE.adaptCap, Math.floor(day / TUNE.adaptEvery) * TUNE.adaptStep);
}

/* ---------- one day ---------- */
export function simulateDay(day, mine, seed = '', ladder = null) {
  const rnd = rngFrom(hashStr('day:' + seed + ':' + day + ':' + ROLES.map(r => mine[r].id).join('-')));
  const opp = (ladder && ladder.length >= 8) ? ladderSquad(day, seed, ladder) : ghostSquad(day, seed);
  const biomes = Object.keys(BIOME_NAME);
  const terrain = biomes[Math.floor(rnd() * biomes.length)];

  /* their five are shuffled against yours, so roles meet roles they counter */
  const theirOrder = ROLES.slice();
  for (let i = theirOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [theirOrder[i], theirOrder[j]] = [theirOrder[j], theirOrder[i]];
  }

  const duels = [];
  const adapt = adaptBonus(day);
  let wins = 0;
  ROLES.forEach((myRole, i) => {
    const theirRole = theirOrder[i];
    const A = mine[myRole], B = opp.squad[theirRole];
    let cA = 1, cB = 1, why = '';
    if (BEATS[myRole] === theirRole) {
      cA = TUNE.counterWin; cB = TUNE.counterLose;
      why = myRole + ' over ' + theirRole;
    } else if (BEATS[theirRole] === myRole) {
      cA = TUNE.counterLose; cB = TUNE.counterWin;
      why = theirRole + ' over ' + myRole;
    }
    const fA = fit(A, terrain), fB = fit(B, terrain);
    /* raw quality is raised to a power before modifiers, so a clear mismatch
       survives any counter or terrain roll — counters tilt, they never decide */
    const qA = Math.pow(rating(A, myRole) + adapt, TUNE.separation);
    const qB = Math.pow(rating(B, theirRole), TUNE.separation);
    const sA = qA * cA * fA * (1 - TUNE.jitter / 2 + rnd() * TUNE.jitter);
    const sB = qB * cB * fB * opp.strength * (1 - TUNE.jitter / 2 + rnd() * TUNE.jitter);
    const won = sA >= sB;
    if (won) wins++;
    duels.push({
      myRole, theirRole, mine: A.name, theirs: B.name, mineA: A, theirsA: B, won, why,
      fitNote: fA >= TUNE.fitHome ? 'at home here' : (fA <= TUNE.fitWrongClimate ? 'out of its element' : ''),
      sA: Math.round(sA), sB: Math.round(sB)
    });
  });
  return {
    day, opp: opp.name, fromPlayer: !!opp.fromPlayer, terrain, duels, wins, adapt,
    survived: wins >= TUNE.daysToWin
  };
}

/* ---------- the whole year, in one call ----------
 * This is what the server runs to verify a submitted result, and what the
 * client runs behind its own animation. Both must agree exactly. */
export function runSeason(mine, seed = '', ladder = null) {
  const tally = {}; ROLES.forEach(r => tally[r] = { w: 0, l: 0 });
  const feats = { kills: 0, stuns: 0, routs: 0, close: 0 };
  const terrains = new Set();
  let rallies = TUNE.rallies, rallyDays = [];
  let last = null, days = 0;

  for (let day = 1; day <= 365; day++) {
    const res = simulateDay(day, mine, seed, ladder);
    last = res;
    terrains.add(res.terrain);
    res.duels.forEach(d => {
      const t = tally[d.myRole];
      if (d.won) {
        t.w++; feats.kills++;
        const margin = (d.sA - d.sB) / Math.max(1, d.sA);
        if (BEATS[d.theirRole] === d.myRole) feats.stuns++;
        if (margin > 0.35) feats.routs++;
        if (margin < 0.04) feats.close++;
      } else t.l++;
    });
    if (!res.survived) {
      /* a rally only saves a day that was nearly won — being routed still
         ends the run, so the second chance rewards a close call, not a bad squad */
      if (rallies > 0 && res.wins === TUNE.daysToWin - 1) {
        rallies--;
        rallyDays.push(day);
        res.rallied = true;
        days = day;
        continue;
      }
      return {
        days: day - 1, perfect: false, finalDay: res, tally, feats,
        terrains: terrains.size, rallyDays
      };
    }
    days = day;
  }
  return { days, perfect: true, finalDay: last, tally, feats,
           terrains: terrains.size, rallyDays };
}

/* A short fingerprint of a verified result. The server stores it so a
 * resubmission of the same squad and seed can be recognised instantly. */
export function runHash(ids, seed, days) {
  return hashStr(ROLES.map(r => ids[r]).join('-') + '|' + seed + '|' + days).toString(36);
}
