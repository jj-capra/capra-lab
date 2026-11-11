# No Cap

A party game of three facts and one cap, native in Capra Lab at **capra-lab.netlify.app/no-cap/**.
JC's idea (Nov 8 2026): "someone reading a sentence with three facts and one fiction and they have
to find the three facts. This can be played with friends live together or by challenge. Think of
things that mess with perception of time and events and other decks about a variety of topics that
entertain elementary, middle school, high school and young adults. It's history lessons in a fun
delivery with a good mix of modern events too. These have to be hard to figure out."

**Live for everyone since Nov 9 2026** (JC: "No cap and screensaver need to go live to everyone");
a JJ Brew from Nov 8 until then. The tile is in the hub's public grid and `BREW = false` in
`server/api.js`: anyone can open a room or play solo, a guest types a name, signed-in players play
as their lab name.

## How it plays (JC's decisions, Nov 8 2026)

- **A card is one sentence with four claims**: three facts and one cap (made up).
- **One subject per card** (JC, Nov 9 2026: "I would prefer all statements to be related... on a
  President and have three facts and a fiction about a certain famous president. The related piece
  makes it harder to decipher the fiction"): every card has an `about` (a president, a place, an
  invention...) shown on every phone above the card ("THIS ONE'S ABOUT"), and all four claims are
  about it. A subject appears once in the whole game (`docs/subjects.md`).
- **With friends it's a topic draft** (JC, Nov 11 2026, replacing the reader: "It is too slow and
  the format doesn't make sense. It should start with a pile of enough topic cards for all players
  to have two topic cards. They can see the topic name and will pick harder obscure topics to make
  it harder for their opponents... the order of pick is randomly populated. Picks work like a snake
  draft. Allow as little as two players with four cards each. Once all cards are selected the order
  of challenge is the same order of pick. They challenge by picking one of their cards in their hand
  ... No reading out loud, just presented."):
  - **The pile**: `handSize(n)` topic cards each (2; 4 with two players) from the room's deck,
    topped up from the same shelf for a big room. Phones see only each card's topic (`about`).
  - **The draft**: a random order, snake picks (1 2 3 3 2 1), 25 s a pick; a pick that runs out
    takes the next card on the pile.
  - **The play**: in the draft's order, around until every card is played: the player picks a card
    from their hand (25 s, or their next card goes), it's shown to everyone else, they hunt
    (45 s, early once all are done), then the reveal (7 s). Whoever played it sees the cap and
    scores 100 for every friend it busts.
- **Tap the facts one by one** (JC: "Tap facts one by one"): the four claims pop up; each fact
  tapped locks green; tapping the cap busts you for the card. 45 seconds (JC, Nov 9 2026: "Give
  the No Cap 20 more seconds... Sometimes it takes longer to read depending on the deck"); the
  reveal comes early once everyone is done or busted.
- **Reveal** (7 s): the cap stamped, the real story (`real`), everyone's points for the card.
- **Points** (`shared/rules.mjs`): 50 a fact, 100 more for all three plus up to 150 for speed
  (JC: "In head-to-head, the quicker to answer gets more points"), and in a live game 50 more for
  the first to find all three on the card (⚡ first! at the reveal, when two or more hunt); busted
  keeps nothing for that card; whoever played the card gets 100 for every friend busted on it.
- 2 to 12 players. The host can draft again with any deck.
- **The results text** (JC, Nov 11 2026: "All results can be shared via text in the fun format I
  have in other games. I want this results text share consistent for all Capra lab games"): the
  final shows the lab's group-chat card (`/lab/share.js`, `<lab-text-share>`): "🧢 No Cap · deck",
  the scores (👑 the winner), and a row of marks per player, card by card: 🟩 all three, ⚡ first,
  🟨 some, ⬛ none, 🟥 busted, 🃏 their own card. Solo runs get the same card.
- **Solo and challenges**: ten cards on your own (you read it yourself; tap Go for each card). At
  the end, **Challenge a friend** makes `/no-cap/c/<id>`: the same ten cards in the same order, and
  a board of everyone who took it.
- **Shelves by age** (JC: "Shelves by age"): Kids (elementary), Middle School, High School, Young
  Adults, three decks each: a time-warp deck, a history deck, a modern deck.

## Decks

`decks/<shelf>/<id>.json`, written to `docs/DECK_SPEC.md`; every deck is fact-checked by someone
who didn't write it (`docs/CHECK_SPEC.md`, logs in `docs/checks/`). The build refuses a deck that
fails `problems()` in `server/load.mjs` (an `about`, four [bracketed] claims, lengths, caps
spread across positions, a `real` line, a source per claim) or repeats a claim (`duplicates()`). Check one with
`node games/no-cap/scripts/check-decks.mjs <file>`. The build bakes the decks (without their
sources) into `server/decks.gen.mjs` (not committed), so caps never reach `public/`.

## Files

- `shared/rules.mjs`: timings, points, the claim parser (`claims`, `pieces`), shared by the page
  and the server.
- `server/api.js`: every route (`/hello`, `/rooms`, `/rooms/:code` + `/join` `/deck` `/start`
  `/pick` `/play` `/tap` `/go` `/again` `/remove` `/challenge`, `/challenges/:id` + `/play`). Where
  a game stands is worked out from what's stored: solo cards wait for Go (`timeline()`); with
  friends `draftLine()` replays the picks, plays and taps with their times, and a pick or play that
  ran out its clock is the lowest card left, so nothing is written when a clock runs out. Store `no-cap`: `r/<CODE>` rooms (12 hours), `c/<id>` challenges.
  `netlify/functions/no-cap.mjs` (`config.path` `/no-cap/api/*`).
- `index.html`, `game.js`: home, deck picker, lobby, the draft, your hand, the card, the final
  with the results text, challenge links.

## Page rules

- Capra Lab's comic look: Bangers + Inter, ink outlines, hard shadows, halftone dots; the cap is
  red, facts are green.
- The home screen's top bar starts with the Capra Lab button (`<capra-lab-chip>`); so does the
  challenge page.
- **Nothing under the iPhone clock**: bars start at `env(safe-area-inset-top)` plus a margin, with
  an opaque strip behind the clock; toasts hide fully above the screen.
- Phones check in every 1.5 s during the draft and while someone chooses, every 2 s while people hunt, at the end of
  each reveal, every 2.5 s in the lobby. Solo only asks at the clock's end.
- No `alert`/`confirm`/`prompt`.

## Develop and test

```
node games/no-cap/test/no-cap.test.mjs         # rules, decks, a topic draft with friends, solo, a challenge
npm run build && node scripts/dev-server.mjs   # the lab at http://localhost:8790/no-cap/
                                               # (/no-cap/__clock?add=ms moves its clock, local only)
```
