# Classified

A sleepover game for teens, native in Capra Lab at **capra-lab.netlify.app/classified/**. JC asked
for one more game teens play with friends at a sleepover: memorable, talked about the next day,
link-shareable. He picked three ideas to live in one game (Nov 2026): **Sleeper Agent** (secret
missions all night), **Who Said It** and **Yearbook**, and named it Classified.

**It's a JJ Brew**: `<script src="/lab/brew.js" data-invite=...>` is first in the page's head, its
hub tile is in Capra's Lab (`#clGames`), and `BREW = true` in `server/api.js`. While it brews,
only Capra's Lab members can open a file; anyone they send a room link (`/classified/ABCD`) can
join it, and anyone with a share link (`/classified/file/<id>`) can read its highlights. When JC
says it goes live: take out the script tag, move the tile to the public grid, set `BREW = false`.

## How it plays (JC's decisions, Nov 8 2026)

1. **Briefing**: the host opens a file (an operation with a silly name) and agents join with the
   4-letter code or the link. Everyone builds a **comic avatar** (JC: avatars only, no photos)
   and gets a codename (AGENT MIDNIGHT WAFFLE). 3 to 12 agents.
2. **The night** (`shared/rules.mjs`):
   - **Missions**: 3 secret missions to start, one more every 45 minutes (up to 7), 2 swaps.
     Targeted missions name another agent. Missions are hidden behind redaction bars and show
     only while held, so nobody peeks. The agent marks a mission done when they pull it off.
   - **Counter-intel**: 3 tries a night to accuse an agent: pick their real mission out of four
     (the decoys share its target). Right: the mission is burned (+75). Wrong: −25, and the
     accused gets +25 for holding cover. A log shows completions and burns as they happen.
   - **Who Said It**: 6 questions, 2 at the start and one more every 30 minutes (the host can
     drop the next early). Answers are anonymous until the reveal, up to 100 characters, with
     strong swears and slurs redacted (`server/filter.mjs`).
   - **Yearbook**: 8 awards, one vote each, never for yourself.
3. **Declassified** (JC: **the host taps it** whenever the room is ready): every phone follows the
   same reveal, the host moving it along. Up to 8 **guess rounds** (an answer on screen; everyone
   but its author guesses who wrote it; a round ends after 20 seconds or once everyone has
   guessed, its answer shows for 7); **🔥** votes an answer onto the share page and the host can
   hide one. Then **every agent's missions** (done, burned and by whom, or never pulled off; the
   target of a done mission says whether it really happened: yes +50, no voids it), the
   **Yearbook awards**, and the **final scores** and top agent.
4. **The share page** (JC: **highlights only**): missions pulled off, the awards, the top agent,
   the team's avatars and scores, and only the answers the room fired up (not hidden by the
   host). **Codenames only, no real names** (a page teens send around and parents may read).
   It keeps its own copy once the reveal reaches the end, so it outlives the room (36 hours).

Scores: mission 100 (+50 confirmed), burn +75, missed accusation −25 / cover held +25, answer
+10 each, right guess +50, +25 to an answer's author for every agent who guessed wrong.

## Content

`content/missions.json`, `prompts.json`, `yearbook.json`, written to `docs/CONTENT_SPEC.md` (teens
at sleepovers: clean, no romance, nothing about bodies or looks, nothing dangerous, nothing done to
anyone asleep, nothing that embarrasses someone in front of the room, Yearbook awards silly or
flattering, never mean). Every file is checked by someone who didn't write it; the build refuses
content that fails `problems()` in `server/content.mjs`.

## Files

- `shared/rules.mjs` (timings, scoring), `shared/avatar.mjs` (the agents as inline SVG, used by
  the page, the reveal and the share page).
- `server/api.js` (every route; the lab sign-in rides in the body, every room call carries the
  seat `{ pid, tok }`), `server/names.mjs` (codenames, operation names), `server/filter.mjs`,
  `server/content.mjs`, `server/store.js` (Blobs or memory, compare-and-swap). The function is
  `netlify/functions/classified.mjs` (`config.path` `/classified/api/*`; store `classified`:
  `r/<CODE>` rooms, `f/<id>` share files). The build bakes the content into
  `server/content.gen.mjs` (not committed).
- `index.html`, `game.js`: home, briefing, the night (tabs), the reveal, the share page.

## Page rules

- Capra Lab's comic look as a spy dossier: Bangers + Inter + Special Elite (typewriter), manila
  folders, red stamps, redaction bars.
- The home screen's top bar starts with the Capra Lab button (`<capra-lab-chip>`); so does the
  share page.
- **Nothing under the iPhone clock**: bars start at `env(safe-area-inset-top)` plus a margin, the
  night's tabs stick below it, and an opaque strip sits behind the clock so scrolled content
  never shows through. Toasts hide fully above the screen.
- Phones check in every 2.5 s in the briefing, every 10 s during the night (and whenever the page
  comes back into view), every 1.2 s during the reveal.
- No `alert`/`confirm`/`prompt`: confirmations are sheets.

## Develop and test

```
node games/classified/test/classified.test.mjs   # avatars, the filter, content checks, a whole night and reveal
npm run build && node scripts/dev-server.mjs     # the lab at http://localhost:8790/classified/
                                                 # (/classified/__clock?add=ms moves its clock, local only)
```
