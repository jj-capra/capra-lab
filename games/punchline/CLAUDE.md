# Punchline

A party game of **Wrong Signs**, **Ugly Ts** and **jokes**, native in Capra Lab at
**capra-lab.netlify.app/punchline/**. JC's idea (Nov 7 2026): comic single-panel signs (billboards,
storefronts, colleges, schools, offices, parks) that came out wrong, and the joke decks moved out of
Mind Heist into their own game. Ugly Ts joined on Nov 8 ("unhinged screen printed words and bad
design decisions and other randomness and punch lines of jokes that take a second").

**It's a JJ Brew** (hidden from the public): `<script src="/lab/brew.js" data-invite=...>` is first
in the page's head and its hub tile is in Capra's Lab (`#clGames`), and `BREW = true` in
`server/api.js`. While it brews, only Capra's Lab members (JJ-Capra and his crew) see today's drop
and can host; anyone they send a room link (`/punchline/ABCD`) can join that game, and nothing else.
When JC says it goes live: take out the script tag, move the tile to the public grid and set
`BREW = false`.

## How a card plays (JC's decisions)

Every card runs four beats on the server's clock (`shared/rules.mjs`):

1. **Look**: the panel alone (the sign, the shirt or the joke's setup), long enough to read.
2. **Flip through**: the four answer cards A–D drop in as a stack of photos; swipe or tap to
   flip through them before the fuse runs out ("a photo deck they can shuffle through before the
   time expires").
3. **Call it**: the writing fizzles out like burnt-out bulbs and the cards become four big letters;
   tap the one you remember ("seeing all four and then fading them out in a fun way and they have
   to say which letter"). Answers are only taken in this beat, one tap per card.
4. **Reveal**: the right card flips back, a stamp lands on the panel (TYPO!, BULB OUT!, OOPS.,
   FADED!, GROAN!, BA-DUM-TSS! with a rimshot for jokes), the caption is the last laugh,
   and a shirt with a back spins around to show it.

Scoring: 100 for a right answer, up to 100 more for speed (counted from when the writing has
faded), 50 more for the first right answer in the room.

- **Today's drop**: ten cards from one family deck, the same for everyone, Pacific time; Wrong
  Signs, jokes and Ugly Ts take turns, and the seasonal joke decks keep their days (Thanksgiving,
  Halloween, Dec 1/21/24). Solo and unranked: the drop comes with its answers and the phone plays
  it alone. Late Night decks never drop. No. 1 was 2026-11-08.
- **Party games**: a host picks any deck; up to 12 phones join with the 4-letter code or the room
  link; the host starts and every phone runs the same timeline from the server's start time, so
  the server is only asked for news at the moments something changes (a card's sign 2.5 s before
  it shows, never its answer; the answers at each reveal; the locked-in count while the letters
  are up). Rooms last 8 hours; the host can deal again (any deck) when a game ends.
- **Shelves**: Family (clean for 8 to 80) and **Late Night** (high school: Cards-Against-Humanity
  energy without the sex). A host turns Late Night on to see and deal those decks. JC's edge line:
  "close enough to barely over the line of an offended employee or even HR but presented in a funny
  way... IYKYK". **No sexual content or innuendo in any deck, Late Night included**; the IYKYK comes
  from misdirection with a gross or dumb payoff. Mild swears only in Late Night.
- Names: the Capra Lab name when signed in; otherwise a nickname (up to 17), made unique in the room.

## Decks

The format, the scenes, the kinds and the content rules are in `docs/DECK_SPEC.md`. Every deck is
checked by someone who didn't write it before it ships, and the build refuses a deck that fails
`problems()` in `server/load.mjs` (lengths, one right answer, a burnt-out or peeled sign's right
answer really reads that way, clip art from the kit, and so on).

- `decks/signs/<id>.json`: Wrong Signs (12 cards each).
- `decks/tees/<id>.json`: Ugly Ts (scene `tee`; kinds `back`, `misprint`, `peeled`, `design`; clip
  art and arc lettering).
- `decks/jokes/J*.json` + `plan.json`: the 30 joke decks from Mind Heist (titles in `plan.json`;
  their briefs and checks are in `docs/`).
- A deck with `"brew": true` (or `brew` in `plan.json`) only shows up for Capra's Lab.

## Files

- `shared/rules.mjs`: the beats, how long each lasts, the asks and the scoring, imported by the page
  and the server (the page loads it from `public/punchline/shared/rules.mjs`).
- `server/load.mjs` (reads the decks, `problems()`), `server/daily.js` (today's drop, dealing),
  `server/api.js` (`POST /today`, `/rooms`, `/rooms/:code`, `/join`, `/start`, `/answer`, `/again`;
  the lab sign-in rides in the body), `server/store.js` (Blobs or memory, compare-and-swap).
  The function is `netlify/functions/punchline.mjs` (`config.path` `/punchline/api/*`; store
  `punchline`, `r/<CODE>` per room). The build bakes the decks into `server/decks.gen.mjs` (not
  committed), so answers never reach `public/`.
- `index.html`, `game.js` (the page: home, lobby, round, final; sounds made in Web Audio),
  `art.js` (the comic panels as inline SVG: 11 sign scenes, the T-shirt with its clip-art kit and
  its back, the comedy club for jokes).

## Page rules

- Capra Lab's comic look: Bangers + Inter (+ Permanent Marker for chalkboards and yard signs), ink
  outlines, hard shadows, halftone dots.
- The home screen's top bar starts with the Capra Lab button (`<capra-lab-chip>`).
- **Nothing under the iPhone clock**: every bar, the round's HUD, the countdown, toasts and sheets
  start at `env(safe-area-inset-top)` plus a margin. The panel shrinks with the screen height so a
  whole card (panel, the four cards, the letters) fits on a 393 × 659 Safari screen.
- No `alert`/`confirm`/`prompt`. Keys work too: A–D or 1–4, arrows to flip.

## Develop and test

```
node games/punchline/test/punchline.test.mjs   # decks, the daily drop, the clock, a whole party game
npm run build && node scripts/dev-server.mjs   # the lab at http://localhost:8790/punchline/
```
