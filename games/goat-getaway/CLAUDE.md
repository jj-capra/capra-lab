# Goat Getaway

A daily sliding-block puzzle, native in Capra Lab at **capra-lab.netlify.app/goat-getaway/**.
It was Mind Heist's Vault Jam (Nov 2–7 2026) until JC asked for it to be its own lab game with a
more fun theme and the same logic, the daily card draw staying in Mind Heist. Pen numbers carry
on from Vault Jam (2026-11-02 = No. 1), on the same puzzles.

## Rules (JC's decisions)

- A 6×6 pen. The goat (always flat, on the third row) leaves through the red gate on the right.
  Hay bales and apple crates are 2 long, tractors 3 long, fence posts never move. Everything
  slides only along its length; one slide of any distance is one move; slides of the same piece
  in a row merge into one move. **Par** is the fewest moves (from the solver). Don't call it
  Rush Hour (a trademark).
- **Today's pen**: one a day, the same for everyone, Pacific time. Monday is Kid level, then
  Yearling, Nanny, Billy, Mountain Goat, Old Ram, and Sunday is the G.O.A.T.
- The board stays hidden until **Open the pen**; the server starts the clock then. The **first**
  getaway is your time. The server replays the moves before believing anything.
- **Diamonds for Mind Heist**: getting out +1 💎, at par +1 more (also on a later try that day).
  They're written into Mind Heist's store: onto the Mind Heist profile linked to the lab player
  (`l/<handle>` → `p/<pid>.gems`), or into `gg/<handle>` until they link one (Mind Heist claims
  it in `/me/lab` and `/home`). They're spent in Mind Heist's daily card draw.
- **Today's fastest**: the lab's top five **by Capra Lab name** (JC's choice; lab names are public
  on every lab board), plus your rank among everyone.
- **Blue Ribbon**: the day's fastest getaway anywhere (ties: fewer moves, then earlier), granted
  the first time the winner loads the page after midnight Pacific (`pend` on the record).
- **Guests** can open and play the pen, but nothing is timed against anyone, saved or paid. The
  page sends them to `/#profile` for a key card.
- **Hints** (Nov 8 2026: JC couldn't crack Sunday's G.O.A.T. pen; every pen is solvable, the week
  runs from 6 moves on Monday to about 30 on Sunday): **💡 Hint** shows the best next move from
  wherever the pen is (the solver from `shared/puzzle.mjs`, about 25 ms): the piece pulses with an
  arrow and a dashed outline shows where it goes. On today's pen a signed-in player's hints go
  through `POST /hint`, which counts them: each hint before your first getaway adds `HINT_MS`
  (15 s) to your time, and a day with hints earns no par diamond. Guests' hints and practice hints
  are worked out on the phone and cost nothing.
- **Practice**: endless pens (`practice.json`, written by the build), Easy / Medium / Hard, no
  rewards, a clock that starts on the first move.

## Files

- `shared/puzzle.mjs`: the rules and the solver, imported by the page, the server and the
  generator (the page loads the same file, built to `public/goat-getaway/shared/puzzle.mjs`).
- `shared/puzzles.mjs`: the pens (7 weekday tiers, 200 practice), made by
  `node dev/make-puzzles.mjs [seed]` (about 10 minutes; every pen is re-solved so par is exact;
  commit the result). A plain module, not JSON, so every bundler reads it the same way.
- `server/daily.js` (today's pen, the race board), `server/api.js` (`POST /today`, `/open`,
  `/solve`, `/hint`, every call with the lab sign-in in the body), `server/store.js` (Blobs or memory,
  compare-and-swap). The function is `netlify/functions/goat-getaway.mjs` (`config.path`
  `/goat-getaway/api/*`). Store `goat-getaway`: `p/<handle>` (today, pending ribbon days,
  ribbons), `j/<date>` (the day's race board).
- `index.html`, `game.js` (the page: tabs, the pen, today, practice, sounds made in Web Audio),
  `art.js` (the goat, hay, crates, tractors, posts and the ribbon, drawn as inline SVG).

## Page rules

- **The results text** (JC, Nov 11 2026: the same share card in every lab game): `/lab/share.js`'s
  `<lab-text-share>` in the result card: "🐐 Goat Getaway No. N · tier", "Out in time · moves (par)"
  (💎 with the par diamond), then 🟩 at par or 🟨 over it, ⚡ when it's today's fastest.
- Capra Lab's comic look: Bangers + Inter, ink outlines, hard shadows, halftone dots.
- The top bar starts with the Capra Lab button (`<capra-lab-chip>`, the lab's logo and the player's
  name), then sound and help on the right.
- **Nothing under the iPhone clock**: the bar, toast and help sheet start at
  `env(safe-area-inset-top)` plus a margin. While a board is up the title shrinks so the whole
  pen fits on a 393 × 659 Safari screen.
- No `alert`/`confirm`/`prompt`. The pen is `touch-action: none` for dragging; pieces also move
  with the arrow keys.

## Develop and test

```
node games/goat-getaway/test/goat.test.mjs     # pens, the clock, diamonds, race board, ribbons, guests
npm run build && node scripts/dev-server.mjs  # the lab at http://localhost:8790/goat-getaway/
                                              # (diamonds land in the dev server's Mind Heist store;
                                              # /goat-getaway/__clock?add=ms moves its clock)
```
