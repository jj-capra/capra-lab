// Don't Look! game logic that doesn't touch the page, so it can be tested on its own.

const RAD = Math.PI / 180;

// How much the screen faces the ceiling, from the phone's tilt (deviceorientation beta and gamma).
//  1 = lying flat, screen up; 0 = standing upright (on a forehead); -1 = screen facing the floor.
// It is the screen's direction pointed up or down, so it reads the same whichever way the phone
// is turned sideways, and it doesn't jump when the phone stands straight up (where beta and gamma
// themselves flip around).
export function faceUp(beta, gamma) {
  return Math.cos(beta * RAD) * Math.cos(gamma * RAD);
}

// Turns a stream of tilt readings into "up" and "down" flips.
// A flip counts once the screen tips past `flip` (0.6 is about 37 degrees from upright). The next
// flip only counts after the phone comes back near upright (`rest`, about 20 degrees), so one big
// tilt is one answer. `smooth` takes the jitter out of the readings.
export function createTilt({ flip = 0.6, rest = 0.35, smooth = 0.45 } = {}) {
  let value = null;
  let armed = false;
  let restingSince = null;
  return {
    feed(beta, gamma, now = 0) {
      const raw = faceUp(beta, gamma);
      value = value == null ? raw : value + (raw - value) * smooth;
      const resting = Math.abs(value) < rest;
      if (resting) { if (restingSince == null) restingSince = now; } else restingSince = null;
      if (!armed) { if (resting) armed = true; return null; }
      if (value > flip) { armed = false; return 'up'; }
      if (value < -flip) { armed = false; return 'down'; }
      return null;
    },
    get value() { return value; },
    // ready for the next flip (the phone is back upright)
    get armed() { return armed; },
    // how long the phone has been held upright, in the same units as `now`
    restingFor(now) { return restingSince == null ? 0 : now - restingSince; },
    // the next flip has to start from upright again
    disarm() { armed = false; },
  };
}

export function shuffle(items, random = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The order to deal a deck in: words this device hasn't shown yet come first, then the rest.
export function deal(words, seen = [], random = Math.random) {
  const old = new Set(seen);
  const fresh = words.filter((w) => !old.has(w));
  const stale = words.filter((w) => old.has(w));
  return [...shuffle(fresh, random), ...shuffle(stale, random)];
}

// After a round: remember what was shown, starting over once the whole deck has been seen.
export function remember(seen = [], shown = [], words = []) {
  const all = new Set(words);
  const next = [...new Set([...seen, ...shown])].filter((w) => all.has(w));
  return next.length >= words.length ? [...new Set(shown)].filter((w) => all.has(w)) : next;
}

// The words for a deck at a level. Mix It Up takes every deck's list.
export function wordsFor(decks, deckId, level) {
  if (deckId === 'mix') return decks.flatMap((d) => d.words[level] || []);
  const d = decks.find((x) => x.id === deckId);
  return (d && d.words[level]) || [];
}

export function decksAt(decks, level) {
  return decks.filter((d) => (d.words[level] || []).length > 0);
}
