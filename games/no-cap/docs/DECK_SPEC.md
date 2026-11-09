# No Cap: how to write a deck

No Cap is JC's party game (Capra Lab, Nov 2026). Every card is **one sentence with four claims:
three are true and one is cap** (made up). A reader reads it out loud with a straight face;
everyone else taps the three facts one at a time, and tapping the cap busts them for the card.
It is also played solo and as a "beat my score" challenge, where the player reads it themselves.

JC's brief: "things that mess with perception of time and events and other decks about a variety
of topics that entertain elementary, middle school, high school and young adults. It's history
lessons in a fun delivery with a good mix of modern events too. **These have to be hard to figure
out.**"

## The file

`decks/<shelf>/<id>.json`, shelf one of `kids`, `middle`, `high`, `adult`:

```json
{
  "id": "time-warp-jr",
  "title": "Time Warp Jr.",
  "shelf": "kids",
  "blurb": "Older than you think. Newer than you think. Way weirder than you think.",
  "cards": [
    {
      "id": "twj01",
      "say": "[Nintendo started out in 1889 selling playing cards], [the first toy advertised on TV was Mr. Potato Head], [the yo-yo was invented in the 1980s], and [sharks are older than trees].",
      "cap": 2,
      "real": "Yo-yos go back thousands of years: one painted on a Greek vase is about 2,500 years old.",
      "src": ["https://...", "https://...", "https://...", "https://..."]
    }
  ]
}
```

- **12 cards per deck.** `id` short and unique in the deck.
- `say`: **one sentence**, read out loud, at most 320 characters, with **exactly four claims in
  [square brackets]**, in the order they're read. Keep the glue outside the brackets short
  (", ", ", and ", "; "). Each claim 18 to 110 characters and makes sense on its own (it becomes a
  button players tap).
- `cap`: which claim is made up, 0 to 3. **Spread the caps out**: in a 12-card deck each position
  is the cap 3 times, in a mixed-up order (not 0,1,2,3,0,1...).
- `real`: at most 170 characters, shown at the reveal: the truth behind the cap, said plainly
  ("Yo-yos go back thousands of years..."). Never repeat the cap as if true.
- `src`: one source URL per claim, in order (4). For the cap, a source showing the truth.
- `title` at most 32 characters, `blurb` at most 90.

Check your file with `node games/no-cap/scripts/check-decks.mjs path/to/file.json`.

## Hard to figure out (the whole game)

- **The facts should sound fake.** Pick true things that make people say "no way": time warps,
  surprising firsts, weird-but-true people and events, numbers that sound wrong.
- **The cap should sound true.** Build it from a real fact with one detail bent: a date moved, two
  people or places swapped, a number changed, an order reversed, a "first" given to the wrong
  thing. It must sound as plausible as the facts, never silly.
- **No tells.** All four claims in the same shape and about the same length and detail. The cap
  is never the only claim with a hedge, an "only", "always", "never", a round number, or a vague
  word; never the only one without a number if the others have numbers (and vice versa). Mix the
  cap's position (see above). Don't make the cap the most boring claim on the card.
- **Definitely false, definitely true.** The cap must be plainly wrong by reputable sources, not
  "technically true", disputed, or true under another definition. Each fact must be confirmed by
  reputable sources, not a myth or a disputed story. Common myths make great caps.
- Each card mixes it up: a card can stay on one theme (four time warps) or blend old history with
  modern events. Across a deck, mix ancient, medieval, early modern, 1900s and 2000s-2020s.

## Perception of time (JC's favorite)

Time warps bend how people picture history: "Cleopatra lived closer in time to the Moon landing
than to the building of the Great Pyramid", "Oxford University is older than the Aztec Empire",
"woolly mammoths were still alive when the pyramids were built", "the fax machine was invented
before the telephone", "Nintendo was founded in 1889". Comparisons ("closer in time to", "older
than", "at the same time as", "before", "within a few years of") are the heart of it. Do the
arithmetic for every comparison and keep a margin: if two dates are close, don't use it.

## Shelves (who it's for)

- **kids** (elementary, about 7 to 10): short, simple words; animals, dinosaurs, space, toys,
  inventions, famous firsts, food, sports, places. Still tricky, never babyish.
- **middle** (11 to 14): empires, explorers, inventions, the space race, internet and game history,
  sports, science.
- **high** (14 to 18): revolutions, wars told factually (never graphic), science and tech, pop
  culture, sports, money, the internet era.
- **adult** (18 to 25): the sharpest time warps, strange true history, the 2000s to 2020s (tech,
  internet culture, sports, music, film), money and work.

Each shelf gets three decks: **a time-warp deck**, **a history deck** (people, places, events told
with fun) and **a modern deck** (2000 to 2025 events, mixed with older things for the warp). Name
them with some personality.

## Content rules (every shelf)

- Played aloud at sleepovers, classrooms and parties: **no sexual content or innuendo, no drugs or
  alcohol, no gore or graphic violence, no slurs or stereotypes, no tragedies played for laughs**
  (no mass-casualty disasters, terrorism, shootings), no suicide or abuse.
- **No current partisan politics** and no living politicians; historical leaders are fine as
  history (who, when, firsts), never opinions. No religion as a debate.
- No real private people. Public figures only for well-documented, harmless facts.
- **Nothing that can go stale**: no "currently", "the tallest", "the richest", or records an active
  person could break, unless pinned to a year ("In 2024, ...").
- Modern events stay at or before 2025 and must be well documented.
- Easy to read aloud: no symbols, no long numbers to stumble over ("1889" is fine, "3.14159" isn't).
- No quoted song lyrics, poems or passages.
