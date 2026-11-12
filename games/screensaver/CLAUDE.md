# Screensaver

A daily game, native in Capra Lab at **capra-lab.netlify.app/screensaver/**. JC's idea (Nov 8 2026):
"you get to see a box like the dvd bouncing box and guess which corner it will perfectly match one
of the four corners. Then they go again and again. Sometimes it will be just one direction and pause
or it will hit a few sides first and then pause. Each time it pauses you have 25 seconds to guess the
corner, it starts in a small square and it gets bigger and the square gets smaller. It gradually gets
harder. Maybe it isn't always a square and it expands and they have to pick a corner from the
expanded board that might be squares adjoined at their corners leaving a path for the box."

**Live for everyone since Nov 9 2026** (JC: "No cap and screensaver need to go live to everyone");
a JJ Brew from Nov 8 until then. The tile is in the hub's public grid and `BREW = false` in
`server/api.js`: anyone plays; a run goes on today's board when the player is signed in to Capra
Lab.

## How it plays (JC's decisions, Nov 8 2026)

- The box (the Capra Lab mark on a color that changes at every bounce, never a real logo) moves one
  cell diagonally a step and flips off walls; blocked across and down at once is a **perfect
  corner** and it stops there (`shared/board.mjs`: `step`, `run`).
- Each board: the box plays for about two seconds (straight, or off a few walls), **pauses**, and
  you have **25 seconds** to tap the corner it will hit (every corner pocket is a lettered target).
  Then it plays out to the corner: right is 100 + 20 a level + up to 100 for speed (`points`).
- **It gets harder** (`plan(n)`): the board grows (6 cells to 28) and so the box shrinks on screen;
  more bounces left after the pause (none at first, up to six); more bounces shown before it; from
  level 6, rooms joined at their corners (2, then 3 from level 11, 4 from level 16) with a two-cell
  overlap the box slips through, so there are 6 to 10 corners to choose from.
- **Daily run, three misses** (JC: "Daily run, 3 misses"): today's boards are the same for everyone
  (seed `ss:<date>`, Pacific time); three wrong corners (or timeouts) end the run. The first run of
  the day goes on today's board; later runs are practice. **Practice** is new boards every time.
- **Boards roll on by themselves, End Run banks the points** (JC, Nov 9 2026: "automatically go to
  the next puzzle with a 'End Run' button so the user has an option to end and count their
  points"): after each corner the result shows with "NEXT BOARD IN 3" and an **End Run · bank N**
  button; the next board starts on its own after 3 s. End Run (or the ✕ in the corner, any time)
  ends the run and counts everything banked: on today's run it posts to the board. Ending mid-board
  drops that board; ending before the first guess just goes home. The board is sized so the
  result, the countdown and End Run always fit above the home bar (`PROMPT_H`).
- **Extra Life card** (Capra Lab's daily Card Draw, Nov 2026; `ss-life` in
  `public/lab/cards-catalog.mjs`): a signed-in player who holds one sees it in Today's Run
  (`<lab-card-offer>`) and can switch it on; the counted run then has four hearts. It's insurance:
  the page sends `life` only if the run went on past the third miss, and the server spends the
  card then (`cards.take`) and scores the run with four lives (`score(seed, picks, lives)`). No
  card left, or a second run that day: the board counts the run up to the third miss.
- Solo for now (JC: "Solo first"); a party room can come later.

## Files

- `shared/board.mjs`: the field, the bouncing, corner pockets, the level generator (seeded; it picks
  a path that ends in a corner, then where to start showing it and where to pause), points, and
  `score(seed, picks)` for a whole run. The page and the server import the same file, so **never
  use anything that differs between browsers** in it (no `sort()` with a random comparator: Safari
  and Chrome sort differently; use the seeded Fisher-Yates `shuffle`).
- `server/api.js`: `/hello`, `/board`, `/run` (the server replays the run from its guesses and
  scores it; one counted run per player per day). Store `screensaver`: `d/<date>`.
  `netlify/functions/screensaver.mjs` (`config.path` `/screensaver/api/*`).
- `index.html`, `game.js`: home (an idle screensaver, today's run, the board), the game (canvas,
  the VHS-style ▶ PLAY / ❚❚ PAUSE readout, lives, the 25-second bar), the run's end.

## Page rules

- **The results text** (JC, Nov 11 2026: the same share card in every lab game): `/lab/share.js`'s
  `<lab-text-share>` on the run-over screen: "📺 Screensaver · date" (or practice), "pts · Level N ·
  perfect corners", a mark a board (🟩 right corner, 🟥 wrong, ⬛ the clock ran out).
- A 90s screensaver look: black CRT screens in a bezel, scanlines, VT323 for the readouts, Bangers
  buttons, the Capra Lab mark as the box.
- The home screen's top bar starts with the Capra Lab button (`<capra-lab-chip>`).
- **Nothing under the iPhone clock**: bars start at `env(safe-area-inset-top)` plus a margin, with
  an opaque strip behind the clock.
- No `alert`/`confirm`/`prompt`.

## Develop and test

```
node games/screensaver/test/screensaver.test.mjs   # bouncing, joined rooms, every level of a day, scoring, the board
npm run build && node scripts/dev-server.mjs       # the lab at http://localhost:8790/screensaver/
```
