# No Cap: how to write a deck

No Cap is JC's party game (Capra Lab, Nov 2026). Every card is **one sentence with four claims:
three are true and one is cap** (made up). A reader reads it out loud with a straight face;
everyone else taps the three facts one at a time, and tapping the cap busts them for the card.
It is also played solo and as a "beat my score" challenge, where the player reads it themselves.

JC's brief: "things that mess with perception of time and events and other decks about a variety
of topics that entertain elementary, middle school, high school and young adults. It's history
lessons in a fun delivery with a good mix of modern events too. **These have to be hard to figure
out.**"

## One subject per card (JC, Nov 9 2026)

"I would prefer all statements to be related. So for example it would be on a President and have
three facts and a fiction about a certain famous president. The related piece makes it harder to
decipher the fiction." Every card is about **one subject**: a person (a president, an inventor,
an athlete), a place (a city, a building, a country), a thing (an invention, a game, a food, an
animal), or an event. All four claims are about that subject, so the cap can't stand out by
topic: it has to be caught on its detail.

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
      "about": "Nintendo",
      "say": "Nintendo [started out in 1889 selling playing cards], [once ran a taxi company], [named Mario after the owner of its American warehouse], and [made the first video game console ever sold].",
      "cap": 3,
      "real": "The first home console was the Magnavox Odyssey in 1972. Nintendo's first home console came out in 1977.",
      "src": ["https://...", "https://...", "https://...", "https://..."]
    }
  ]
}
```

- **12 cards per deck.** `id` short and unique in the deck.
- `about`: the card's one subject, as players would say it (at most 40 characters): "Abraham
  Lincoln", "The Eiffel Tower", "Pac-Man". It shows on every phone above the card.
- `say`: **one sentence**, read out loud, at most 340 characters. It starts with the subject and
  then has **exactly four claims in [square brackets]**, in the order they're read, joined by
  ", " and ", and ". Each claim 12 to 110 characters. A claim is a predicate that reads well on its
  own as a button under the subject ("was a licensed bartender", "is older than the United
  States"), so start it with a verb, never with the subject's name.
- `cap`: which claim is made up, 0 to 3. **Spread the caps out**: in a 12-card deck each position
  is the cap 3 times, in a mixed-up order (not 0,1,2,3,0,1...).
- `real`: at most 170 characters, shown at the reveal: the truth behind the cap, said plainly.
  Never repeat the cap as if true.
- `src`: one source URL per claim, in order (4). For the cap, a source showing the truth. Claims
  about one subject can share a source (the same Britannica or museum page).
- `title` at most 32 characters, `blurb` at most 90.
- **A subject appears once in the whole game**: never on two cards, two decks or two shelves (the
  registry is `docs/subjects.md`; add yours there before you write the card).

Check your file with `node games/no-cap/scripts/check-decks.mjs path/to/file.json`.

## Hard to figure out (the whole game)

- **The facts should sound fake.** Pick the true things about the subject that make people say
  "no way": surprising firsts, odd jobs, strange habits, time warps, numbers that sound wrong.
- **The cap should sound true.** Build it from a real fact about the subject with one detail bent:
  a date moved, a number changed, a "first" given to the wrong one, a famous story about them
  that's a myth. It must sound as plausible as the facts, never silly.
- **No tells.** All four claims in the same shape and about the same length and detail. The cap
  is never the only claim with a hedge, an "only", "always", "never", a round number, or a vague
  word; never the only one without a number if the others have numbers (and vice versa). Mix the
  cap's position (see above). Don't make the cap the most boring claim on the card.
- **Definitely false, definitely true.** The cap must be plainly wrong by reputable sources, not
  "technically true", disputed, or true under another definition. Each fact must be confirmed by
  reputable sources, not a myth or a disputed story. Common myths about the subject make great caps.
- Famous subjects are best (everyone has heard of them, nobody knows all four things), but pick
  facts about them that most people don't know.

## Perception of time (JC's favorite)

Time warps bend how people picture history, and they fit inside one subject: Cleopatra "lived
closer in time to the Moon landing than to the building of the Great Pyramid"; Oxford University
"is older than the Aztec Empire"; woolly mammoths "were still alive when the pyramids were built".
In the time-warp decks every card is a subject with at least two time-warp claims ("closer in time
to", "older than", "at the same time as", "still alive when"). Do the arithmetic for every
comparison and keep a margin of years.

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
with fun; presidents and other famous figures are great subjects) and **a modern deck** (subjects
from 2000 to 2025: companies, games, apps, athletes, movies, events). Name them with some
personality.

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
