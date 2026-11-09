# No Cap

A party game of three facts and one cap, native in Capra Lab at **capra-lab.netlify.app/no-cap/**.
JC's idea (Nov 8 2026): "someone reading a sentence with three facts and one fiction and they have
to find the three facts. This can be played with friends live together or by challenge. Think of
things that mess with perception of time and events and other decks about a variety of topics that
entertain elementary, middle school, high school and young adults. It's history lessons in a fun
delivery with a good mix of modern events too. These have to be hard to figure out."

**A JJ Brew** (JC picked "JJ Brew first"): `brew.js` is first in the page's head (room links
`/no-cap/ABCD` and challenge links `/no-cap/c/<id>` get through, `data-invite`), the hub tile sits
in Capra's Lab's "In testing" (`#clGames`), and `BREW = true` in `server/api.js` (only Capra's
Lab can open a room or play solo; anyone with a link can join or take a challenge). Going live
takes out all three.

## How it plays (JC's decisions, Nov 8 2026)

- **A card is one sentence with four claims**: three facts and one cap (made up).
- **Live, a reader reads it** (JC: "A reader reads it"): players take turns as reader, one card
  each in order. The reader's phone shows the sentence with the cap marked; they read it out loud
  with a straight face and tap Done (or the clock starts by itself after 60 s; the host can start
  it for a stuck reader). Everyone else's phone shows only "X is reading" until then.
- **Tap the facts one by one** (JC: "Tap facts one by one"): the four claims pop up; each fact
  tapped locks green; tapping the cap busts you for the card. 25 seconds; the reveal comes early
  once everyone is done or busted.
- **Reveal** (8 s): the cap stamped, the real story (`real`), everyone's points for the card.
- **Points** (`shared/rules.mjs`): 50 a fact, 100 more for all three plus up to 100 for speed;
  busted keeps nothing for that card; the reader gets 50 for every player busted on their card.
- A live game deals enough cards that everyone reads about equally (2 players: 8, 3: 9, 4: 8...),
  2 to 12 players. The host can deal again with any deck.
- **Solo and challenges**: ten cards on your own (you read it yourself; tap Go for each card). At
  the end, **Challenge a friend** makes `/no-cap/c/<id>`: the same ten cards in the same order, and
  a board of everyone who took it.
- **Shelves by age** (JC: "Shelves by age"): Kids (elementary), Middle School, High School, Young
  Adults, three decks each: a time-warp deck, a history deck, a modern deck.

## Decks

`decks/<shelf>/<id>.json`, written to `docs/DECK_SPEC.md`; every deck is fact-checked by someone
who didn't write it (`docs/CHECK_SPEC.md`, logs in `docs/checks/`). The build refuses a deck that
fails `problems()` in `server/load.mjs` (four [bracketed] claims, lengths, caps spread across
positions, a `real` line, a source per claim). Check one with
`node games/no-cap/scripts/check-decks.mjs <file>`. The build bakes the decks (without their
sources) into `server/decks.gen.mjs` (not committed), so caps never reach `public/`.

## Files

- `shared/rules.mjs`: timings, points, the claim parser (`claims`, `pieces`), shared by the page
  and the server.
- `server/api.js`: every route (`/hello`, `/rooms`, `/rooms/:code` + `/join` `/deck` `/start`
  `/read` `/tap` `/go` `/again` `/remove` `/challenge`, `/challenges/:id` + `/play`). The state of
  a card is worked out from what's stored (`timeline()`: read → find → reveal; solo cards wait
  for Go). Store `no-cap`: `r/<CODE>` rooms (12 hours), `c/<id>` challenges.
  `netlify/functions/no-cap.mjs` (`config.path` `/no-cap/api/*`).
- `index.html`, `game.js`: home, deck picker, lobby, the card, the final, challenge links.

## Page rules

- Capra Lab's comic look: Bangers + Inter, ink outlines, hard shadows, halftone dots; the cap is
  red, facts are green.
- The home screen's top bar starts with the Capra Lab button (`<capra-lab-chip>`); so does the
  challenge page.
- **Nothing under the iPhone clock**: bars start at `env(safe-area-inset-top)` plus a margin, with
  an opaque strip behind the clock; toasts hide fully above the screen.
- Phones check in every 1.5 s while a reader reads, every 2 s while people hunt, at the end of
  each reveal, every 2.5 s in the lobby. Solo only asks at the clock's end.
- No `alert`/`confirm`/`prompt`.

## Develop and test

```
node games/no-cap/test/no-cap.test.mjs         # rules, decks, a live game with a reader, solo, a challenge
npm run build && node scripts/dev-server.mjs   # the lab at http://localhost:8790/no-cap/
                                               # (/no-cap/__clock?add=ms moves its clock, local only)
```
