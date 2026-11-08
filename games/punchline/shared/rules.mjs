// Punchline's clock and scoring, shared by the server (which keeps time) and the page.
//
// The four-square (JC, Nov 8 2026): every card is four tiles. For a sign or a shirt, three show it
// the way it should read and one is off (a burnt-out letter, a misspelling, a peeled letter); for a
// joke, the setup sits on top and the tiles are four punchlines. Two beats per card, both on the
// server's clock:
//   find    tap the tile that's different (or the punchline that lands); one tap per card
//   reveal  the odd one zooms in with the difference circled, the stamp and the caption land
// A party game runs the whole deal back to back from one start time, so every phone can work out
// where the game is from the clock alone and only asks the server for news.

export const CARDS_PER_GAME = 10;
export const COUNTDOWN_MS = 4000;
export const FIND_MS = 10000;
export const REVEAL_MS = 5500;
export const LETTERS = ['A', 'B', 'C', 'D'];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Ten seconds to spot a sign; a joke gets time to read its setup and four punchlines.
export const findMs = (card) => (card.type === 'joke'
  ? clamp(6000 + (card.setup.length + card.options.join('').length) * 45, 9000, 16000)
  : FIND_MS);

export const askOf = (card) => (card.type === 'joke' ? 'Which punchline lands?' : 'Which one is different?');

// The timeline for a game: when each card's beats start.
export function schedule(cards, startAt) {
  let t = startAt;
  return cards.map((c) => {
    const at = t, reveal = at + findMs(c), end = reveal + REVEAL_MS;
    t = end;
    return { at, reveal, end };
  });
}

// Where the game is at `now`: the card and its beat ('countdown' before the first card, 'over'
// after the last).
export function beatAt(times, now) {
  if (!times.length || now < times[0].at) return { i: 0, beat: 'countdown' };
  for (let i = 0; i < times.length; i++) if (now < times[i].end) return { i, beat: now < times[i].reveal ? 'find' : 'reveal' };
  return { i: times.length - 1, beat: 'over' };
}

// A right tap is worth 100, plus up to 100 for speed, plus 50 for the first right tap in the room.
export function points(ms, window, first) {
  return 100 + Math.round(100 * (1 - clamp(ms / window, 0, 1))) + (first ? 50 : 0);
}
