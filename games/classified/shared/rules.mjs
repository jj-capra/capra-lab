// Classified's timings and scoring, shared by the server and the page.
//
// The night: every agent starts with START_MISSIONS secret missions and gets another every
// MISSION_EVERY (up to MAX_MISSIONS), and can swap MAX_SWAPS they hate. Who Said It questions:
// FIRST_PROMPTS open when the host starts the night, then one more every PROMPT_EVERY (the host
// can drop the next one early). Yearbook: AWARDS superlatives to vote on, any time before the
// reveal. Counter-intel: MAX_ACCUSE tries per agent to burn someone's mission.
//
// Declassified (when the host taps it): the guess rounds (who wrote this answer?), every agent's
// missions, the Yearbook awards, then the final scores. The host moves it along; a guess round
// moves on by itself after GUESS_MS (or once everyone has guessed), and its answer after SHOW_MS.

export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 3;
export const START_MISSIONS = 3;
export const MAX_MISSIONS = 7;
export const MAX_SWAPS = 2;
export const MISSION_EVERY = 45 * 60e3;
export const PROMPTS = 6;
export const FIRST_PROMPTS = 2;
export const PROMPT_EVERY = 30 * 60e3;
export const AWARDS = 8;
export const MAX_ACCUSE = 3;
export const ANSWER_MAX = 100;
export const GUESS_ROUNDS = 8;
export const GUESS_MS = 20e3;
export const SHOW_MS = 7e3;
export const ROOM_HOURS = 36;

export const POINTS = {
  mission: 100,      // a mission done
  confirmed: 50,     // ...and its target said yes, it happened
  burn: 75,          // you burned someone's mission
  wrongAccuse: -25,  // you accused and missed
  coverHeld: 25,     // someone accused you and missed
  answer: 10,        // you answered a Who Said It question
  guess: 50,         // you guessed who wrote an answer
  fooled: 25,        // per agent who guessed wrong on your answer
};

// How many missions an agent has been handed `ms` after they started.
export const missionsAt = (ms) => Math.min(MAX_MISSIONS, START_MISSIONS + Math.max(0, Math.floor(ms / MISSION_EVERY)));
// How many questions are open `ms` after the night started (the host may have opened more).
export const promptsAt = (ms, opened = 0) => Math.min(PROMPTS, Math.max(opened, FIRST_PROMPTS + Math.max(0, Math.floor(ms / PROMPT_EVERY))));
