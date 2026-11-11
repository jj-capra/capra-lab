# Punchline

A party game of **Wrong Signs**, **Ugly Ts** and **jokes**, native in Capra Lab at
**capra-lab.netlify.app/punchline/**. JC's idea (Nov 7 2026): comic single-panel signs (billboards,
storefronts, colleges, schools, offices, parks) that came out wrong, and the joke decks moved out of
Mind Heist into their own game. Ugly Ts joined on Nov 8 ("unhinged screen printed words and bad
design decisions and other randomness and punch lines of jokes that take a second").

**Live since Nov 8 2026** (JC: "Okay let's go live with punchline"). It started as a JJ Brew (Nov 7);
going live took out `brew.js`, moved the hub tile from Capra's Lab to the public grid and set
`BREW = false` in `server/api.js`. Everyone gets today's drop and can host (a guest types a name);
decks marked `brew` still show only for Capra's Lab.

## How a card plays (JC's decisions)

**The four-square** (JC, Nov 8 2026: "a four square of images and you have to pick the one that is
different... a mix of burnt out signs, misspellings, etc."; the first version, a photo stack you
flipped through before the writing faded, wasn't fun). Every card is four tiles and two beats on
the server's clock (`shared/rules.mjs`):

1. **Find it** (10 seconds): a sign or a shirt shows **four times; three read the way they should
   and one is off**. Tap the odd one, one tap per card. `server/variants.mjs` works out both
   versions: a burnt-out or peeled card's right version has every letter lit and its odd one is the
   card itself; a misprint's right version is the fix (the right option laid out on the sign's
   lines) and its odd one is the typo; a design card or a shirt with a back gets a flaw made for it
   (a dead bulb on neon and marquee signs, otherwise a swapped, doubled, dropped or look-alike
   letter), the same on every phone, never one that adds a rude word. All four tiles wear the same
   shirt color. **No tells** (JC, Nov 8 2026: "Sometimes the ugly t is noticeable because there is
   a missing or slight outline of the missing letter. It should never be this easy"): on a shirt or
   a peeled sign the missing letter is simply gone while players look (no ghost, no outline, no
   gap; the word closes up, `GONE` in `art.js`). The faint ghost and the red ring show only on the
   reveal. A burnt-out bulb on neon or a marquee still shows dark: that is the sign. A **joke** puts its setup on top and four punchlines in the square (9 to 16 seconds
   to read them); tap the one that lands.
2. **Reveal** (5.5 seconds): the odd tile zooms up with the **difference circled in red** like a
   spot-the-difference answer key, a stamp lands (BULB OUT!, TYPO!, FADED!, or BA-DUM-TSS! with a
   rimshot for jokes), the line under it says what it reads (or should say, or looks like it says),
   the caption is the last laugh, and a shirt with a back spins around to show it.

Scoring: 100 for a right tap, up to 100 more for speed (over the find beat), 50 more for the first
right tap in the room. The last three seconds tick.

- **Today's drop**: ten cards from one family deck, the same for everyone, Pacific time; Wrong
  Signs, jokes and Ugly Ts take turns, and the seasonal joke decks keep their days (Thanksgiving,
  Halloween, Dec 1/21/24). Solo and unranked: the drop comes with its answers and the phone plays
  it alone. Late Night decks never drop. No. 1 was 2026-11-08.
- **Party games**: a host picks any deck; up to 12 phones join with the 4-letter code or the room
  link; the host starts and every phone runs the same timeline from the server's start time, so
  the server is only asked for news at the moments something changes (a card's tiles 2.5 s before
  it shows; the results, circles and caption at each reveal; the locked-in count while it's up). Rooms last 8 hours; the host can deal again (any deck) when a game ends.
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
  and the server (the page loads it from `public/punchline/shared/`, with `glyphs.mjs`, the sign
  letter parser the art and the server share).
- `server/variants.mjs`: the four-square's two versions of a sign, the made-up flaws and the
  letters to circle.
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

- **The results text** (JC, Nov 11 2026: the same share card in every lab game): `/lab/share.js`'s
  `<lab-text-share>` on the final screen and on the home card once today's drop is played. Solo:
  "🎤 Punchline No. N · deck", "pts · right/10", the 🟩🟥⬛ marks. A party: the ranks (👑 on the
  winner) and your own row (⚡ where you got it first). "Invite more friends" stays the room link.
- Capra Lab's comic look: Bangers + Inter (+ Permanent Marker for chalkboards and yard signs), ink
  outlines, hard shadows, halftone dots.
- The home screen's top bar starts with the Capra Lab button (`<capra-lab-chip>`).
- **Nothing under the iPhone clock**: every bar, the round's HUD, the countdown, toasts and sheets
  start at `env(safe-area-inset-top)` plus a margin. The panel shrinks with the screen height so a
  whole card (panel, the four cards, the letters) fits on a 393 × 659 Safari screen.
- No `alert`/`confirm`/`prompt`. Keys work too: A–D or 1–4 picks a tile.

## Develop and test

```
node games/punchline/test/punchline.test.mjs   # decks, the daily drop, the clock, a whole party game
npm run build && node scripts/dev-server.mjs   # the lab at http://localhost:8790/punchline/
```
