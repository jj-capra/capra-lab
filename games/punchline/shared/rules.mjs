// Punchline's clock and scoring, shared by the server (which keeps time) and the page.
//
// Every card runs the same four beats, all on the server's clock:
//   look    the panel alone: the sign (or the joke's setup) and nothing else
//   review  the four answer cards, A–D, a stack of photos to flip through
//   call    the writing has faded out; tap the letter from memory
//   reveal  the right card flips back, the caption lands, points go up
// A party game runs a whole deck's worth of cards back to back from one start time, so every
// phone can work out where the game is from the clock alone and only asks the server for news.

export const CARDS_PER_GAME = 10;
export const COUNTDOWN_MS = 4000;
export const FADE_MS = 1200;      // part of the call beat: the writing fizzles out first
export const CALL_MS = 7000;      // includes the fade
export const REVEAL_MS = 6000;
export const LETTERS = ['A', 'B', 'C', 'D'];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const textLen = (card) => (card.type === 'joke' ? card.setup.length : card.sign.join(' ').length);

// Long enough to read the sign or the setup properly, never so long it drags.
export const lookMs = (card) => clamp(2600 + textLen(card) * (card.type === 'joke' ? 45 : 30), 3000, 7500);
// Long enough to flip through all four cards and read them.
export const reviewMs = (card) => clamp(6500 + card.options.join('').length * 45, 8000, 14000);

export const ASKS = {
  misprint: 'What was it supposed to say?',
  lights: 'What does it say right now?',
  design: 'What does it look like it says?',
  peeled: 'What does it say now?',
  back: 'What’s on the back?',
  joke: 'Which punchline lands?',
};
export const askOf = (card) => card.ask || ASKS[card.type === 'joke' ? 'joke' : card.kind] || ASKS.misprint;

// The timeline for a game: when each card's beats start.
export function schedule(cards, startAt) {
  let t = startAt;
  return cards.map((c) => {
    const at = t, review = at + lookMs(c), call = review + reviewMs(c), reveal = call + CALL_MS, end = reveal + REVEAL_MS;
    t = end;
    return { at, review, call, reveal, end };
  });
}

// Where the game is at `now`: the card index and its beat ('countdown' before the first card,
// 'over' after the last).
export function beatAt(times, now) {
  if (!times.length || now < times[0].at) return { i: 0, beat: 'countdown' };
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (now < t.end) return { i, beat: now < t.review ? 'look' : now < t.call ? 'review' : now < t.reveal ? 'call' : 'reveal' };
  }
  return { i: times.length - 1, beat: 'over' };
}

// A right answer is worth 100, plus up to 100 for speed (counted from when the writing has
// faded), plus 50 for the first right answer in the room.
export function points(ms, first) {
  const speed = Math.round(100 * (1 - clamp((ms - FADE_MS) / (CALL_MS - FADE_MS), 0, 1)));
  return 100 + speed + (first ? 50 : 0);
}
