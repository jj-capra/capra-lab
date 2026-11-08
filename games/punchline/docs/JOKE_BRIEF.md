# Brief for Mind Heist joke deck writers (November 2026)

Mind Heist (mind-heist.netlify.app) is a trivia game JC hosts for coworkers on Teams/Zoom (ages
about 20 to 65) and for friends and family at home; his teenage sons play too. A deck is a board
of 3 categories x 4 tiles ($100, $200, $300, $400). Two crews take turns picking a tile; the
question shows four options A-D; one shot, no steals.

**Joke decks** are new: the question is the first half of a joke (the setup) and the four options
are punchlines. The crew has to pick the punchline that actually lands. After the reveal, a
"Bonus groan" screen shows the `fact` line. One joke deck is featured as the "Joke of the day" and
all 30 sit on a "Jokes" shelf in the library.

Read `docs/DECK_SPEC.md` first. Its JSON shape, length limits, plain-text rule and
workplace-safe rule all apply. The trivia-only parts (verify facts, generational mix of facts,
"the fact line") are replaced by the rules below.

## Your decks
Your agent code (J1-J5) and your six deck ids, titles and themes are in your task message and in
`deck_plan.json` (entries with `"kind": "jokes"` and your agent code). Write all
six to the path in your task message as one JSON array, same shape as DECK_SPEC's sample.

## Each deck: three kinds of joke, one per category
Every deck mixes three kinds, and each category holds one kind (give the categories short themed
names, 20 characters max, e.g. for a food deck "Kitchen Groaners", "Half-Baked Puns", "Food Twists"):
1. **Groaners**: the exhausting dad jokes. Classic question-and-answer jokes that get an eye roll.
2. **Wordplay**: puns and double meanings ("I used to hate facial hair, but then it grew on me").
3. **Twists**: the clever, witty ones: misdirection, a smart reversal, a one-liner whose ending
   flips the setup. These should make a sharp coworker grin, not just groan.

Ladder inside each category: $100 is a joke most of the room has heard or can spot at once; $200
a classic that takes a second; $300 a lesser-known joke you have to decode; $400 a clever one where
the distractors are near-miss puns and you have to find the real double meaning.

Mix the references so every age gets a turn: some jokes an older player will know (classic
groaners, old technology, older idioms) and some that land with teenagers (phones, Wi-Fi, games,
streaming, group chats). Keep the language plain enough for a 13-year-old.

## The setup (`q`, 110 characters max)
- The first half of the joke, exactly as it would be told: "Why did the scarecrow win an award?"
- One-liners become a setup with a blank: "I used to be a banker, but I lost ___" (options are endings).
- Knock-knocks fit on one line: "Knock knock. Who's there? Lettuce. Lettuce who?"
- Never put the punchline, or a hint that gives it away, in the setup.

## The four punchlines (`options`, 30 characters max each)
This is what makes the game good, and what a checker will test hardest.
- **Exactly one lands.** The right option is the real punchline: it has the double meaning or the
  twist that makes the setup pay off.
- **The other three must not work as a punchline for this setup.** Make them believable but flat:
  - the straight, literal answer ("Because it scared the most crows"),
  - a near-miss pun on the wrong word, one that doesn't connect to anything in the setup,
  - a joke-shaped line with no double meaning in it.
  If a distractor is also a pun on this setup, or a room could argue it is funnier, replace it.
- Similar length and form, so the right one doesn't stand out by being longer, punchier, or the
  only one with a pun-sounding word. No joke-off options (no "Your mom", no random nonsense).
- Shorten long classic punchlines to fit 30 characters while keeping the wording that makes the
  joke work ("Outstanding in his field").
- Vary the answer position across the deck.

## The bonus groan (`fact`, 140 characters max)
Shown after the reveal on its own screen. Make it a second, complete short joke on the same theme
(setup and punchline both in the line), for example: "Bonus: What do you call a fake noodle? An
impasta." Start every one with "Bonus: ". Occasionally, for a tricky pun, explain the double
meaning instead, starting with "The pun: ". Never repeat a joke that is a question in any of your
decks.

## The `src` field (never shown)
"classic" for a widely told folk joke, "original" for one you wrote, plus the factual premise you
checked if the joke relies on one (e.g. "premise: atoms make up all matter").

## Hard rules for jokes
1. **Workplace-safe and family-safe.** No innuendo or double meanings that can be read as sexual,
   no bathroom or body humor beyond the mildest, no alcohol, drugs, smoking or gambling, no
   politics or religion, no death, violence or injury as the joke, no insults, no jokes about any
   nationality, ethnicity, gender, age group, body type, disability, job group or real person.
   Blondes, in-laws, lawyers, "my wife" jokes and the like are out. Spooky jokes stay friendly.
2. **Folk jokes and your own only.** Classic anonymous jokes are fine. Never use a known
   comedian's bit, a one-liner famous as a particular comedian's, or a joke from a specific book,
   show, ad or film. Don't copy batches from joke websites; write and adapt.
3. **True premises.** If a joke leans on a fact (science, history, animals), the fact must be right.
4. **No repeats.** No joke used twice anywhere in your six decks, including the bonus lines.
   Other writers are working at the same time, so stay strictly inside each deck's theme. The
   general decks must leave themed subjects to their decks:
   - Groan Up (jokes-01), Pun Intended (jokes-02), Kid Tested (jokes-27) and Galaxy Brain
     (jokes-29) use no jokes whose main subject is food, animals, sea life, dinosaurs, monsters,
     plants, weather, space, science, math, music, sports, tech, books, history, time, grammar,
     travel, tools, cheese, pets, breakfast, the office, Thanksgiving or winter (each has a deck).
   - Within themes: sea creatures go to Under the Sea, not Animal Crackers; cats and dogs go to
     Pet Peeves, not Animal Crackers; bread and breakfast go to Rise and Shine, not Food for
     Thought; cheese goes to Say Cheese; snowmen and reindeer go to Sweater Weather, not Weather
     or Not; turkeys go to Turkey Talk.
   - These famous ones are reserved; only the named deck may use them: scarecrow "outstanding in
     his field" (Garden Variety), "impasta" (Food for Thought), skeleton "no guts" (Monster Mash),
     "atoms make up everything" (Lab Rats), "nacho cheese" (Say Cheese), "lettuce in" (Knock
     Knock), "a dino-snore" (Dino-Mite), "they're shellfish" (Under the Sea).
5. **Plain text.** No emoji, no markdown. Straight quotes.

## Finish
1. Write your file with the Write tool. Validate it with python: `json.load`, 6 decks, ids exactly
   as planned, 3 categories x 4 questions in order 100-400, `answer` 0-3, and every length limit
   (q 110, option 30, fact 140, category name 20, blurb 80).
2. Re-read every joke once against the rules above: does exactly one option land, and is each
   distractor flat for this setup?
3. Reply with a short summary: decks written and any jokes you were unsure about.
