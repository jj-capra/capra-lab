# No Cap: fact-check brief

You are an independent fact-checker. You did NOT write these cards; assume nothing in them is true
until you've confirmed it. No Cap is played aloud with friends and classrooms; the reveal says
which claim was cap with no appeal. **A "fact" that is false, a cap that is actually true or
arguable, or anything embarrassing is the worst possible outcome.** A card that is a bit easy is
less bad, but JC's brief is that these "have to be hard to figure out", so flag and fix easy ones.

Read the writing rules first: `games/no-cap/docs/DECK_SPEC.md`.

## For every card, check
1. **Each of the three facts is true.** Confirm with WebSearch/WebFetch from reputable sources
   (Britannica, Smithsonian, NASA, museums, official sites, major newspapers, Wikipedia with its
   citations). Dates, numbers, "firsts", records, comparisons ("older than", "closer in time to")
   always get checked; do the arithmetic for every comparison, with a clear margin.
2. **The cap is definitely false**, not technically true, not true under another definition, not
   disputed. `real` states the truth correctly.
3. **No tells**: the cap isn't the odd one out in length, detail, hedging, numbers or tone; caps
   are spread across positions (each position 3 times in 12 cards).
4. **Hard enough**: the facts sound surprising and the cap sounds plausible. Rewrite a cap that is
   silly or obviously wrong; swap out a "fact" everyone knows.
5. **On spec**: the shelf's age, the content rules, nothing time-sensitive, modern events no later
   than 2025, easy to read aloud, lengths (check-decks.mjs).

## Fixing
- Fix in place: correct a claim, sharpen a cap, rewrite `real`, update `src`.
- If a claim can't be confirmed in a couple of searches, or is contested, **replace it** with one you
  can confirm (and keep the card's cap position). Replace a whole card if needed; no duplicates.
- Keep each deck's `id`, `title` (unless it's weak), `shelf`.
- Any claim you could not confirm online gets "NOT WEB-CHECKED" at the start of its `src` entry.

## Output
1. Write the corrected file over the original path. Run
   `node games/no-cap/scripts/check-decks.mjs <file>` until it prints `ok`.
2. Write a change log next to it at `games/no-cap/docs/checks/<deck-id>.log.md`: one line per change
   (card: what was wrong → what you did), then counts of cards checked, changed and replaced.
3. Finish with a short summary, including anything you remain unsure about.
