# Mind Heist Daily — deck writing spec

## The game these questions are for
(Do not reuse the example question at the bottom of this spec — it is only a format sample.)
Mind Heist Daily is a trivia game coworkers play on a Microsoft Teams or Zoom call. The host
shares their screen. Players are split into two teams with captains. Each day a new deck
"drops." A deck is a board of **3 categories × 4 tiles** worth $100, $200, $300, $400.
Teams take turns picking a tile; the question appears on the shared screen with four options
A–D; the team talks it over and the captain says the letter; the host clicks it. **One shot
only — no steals.** So every question must have exactly one clearly right answer that the host
can reveal with total confidence in front of a room of coworkers.

## Audience
Coworkers at a Washington State government office (the Secretary of State's Corporations &
Charities Division), ages roughly 20 to 65. The whole point is that a 24-year-old and a
60-year-old on the same team both get moments to shine.

## Hard rules (a question that breaks one of these is rejected)
1. **Exactly 4 options, exactly 1 correct.** No "all/none of the above," no "which is NOT,"
   no trick wording. Two options that could both be defended = rejected.
2. **True, settled, stable.** The answer must not depend on when it's read. No "current,"
   "latest," "most recent," "still holds the record," "reigning," "as of," "today." Records only
   if historic and permanent ("first person to…", "won the first…"). Nothing from 2025 or later.
   Prefer facts that are textbook-settled.
3. **Verify.** Anything not textbook-certain (a year, a number, a "first," who did what) — confirm
   with WebSearch / WebFetch before you use it. If you can't confirm it, swap the question. A
   wrong key in front of coworkers is the worst possible outcome; a slightly easier question is fine.
4. **Workplace-safe.** No politics or politicians after 1950 (historic presidents only as neutral
   facts, and sparingly); nothing partisan or contested; no religion beyond neutral, factual
   cultural customs; no romance/sex/innuendo; no alcohol, drugs, smoking or gambling focus; no gore,
   crime, deaths, disasters with casualties, war atrocities; no diet/weight/body shaming; no
   stereotypes or jokes about any country, group, age or gender; nothing mean about real people.
5. **No quoted lyrics, poems or book passages.** Titles, artists, authors, years and facts are fine.
6. **Length limits — the screen is shared over a compressed video call, so type must be big:**
   - `q` ≤ 110 characters
   - each option ≤ 30 characters
   - `fact` ≤ 140 characters
   - category `name` ≤ 20 characters
   - deck `blurb` ≤ 80 characters
7. **Plain text only.** No markdown, no emoji, no curly-quote tricks. Straight quotes are fine.

## Difficulty inside each category
- $100 — almost everyone knows it
- $200 — most people know or can reason it out
- $300 — a real think; maybe half the room
- $400 — hard but fair; gettable by reasoning or by the one person who knows

## Generational mix (per deck of 12)
Where the topic allows: about 4 questions an older player (55+) has the edge on (pre-1990
culture/events), about 4 a younger player (under 35) has the edge on (post-2000), the rest
universal. Spread them across the three categories — don't make one "old" category and one
"young" category.

## Distractors (wrong options) — this is what makes the game good
- Same type, same era, believable. Near-misses: the famous cousin, the year before, the
  neighboring country, the sequel, the runner-up. Never a joke option, never an obvious throwaway.
- Parallel form and similar length to the correct answer, so length or style doesn't give it away.
- Each wrong option must be *definitely* wrong — not a defensible alternate.
- No two options that mean the same thing ("6"/"six", "JFK"/"John F. Kennedy").

## The fact line
One sentence shown after the reveal. It should add something interesting beyond the answer —
a "huh, I didn't know that" for the room. It must be accurate (verify it too).

## Categories
Three per deck, each with a short, punchy name that fits the deck's theme, e.g. deck "Box Office" →
"Blockbusters", "Sequels", "Behind the Camera". Each category's four questions must actually fit its
name. Categories within a deck should feel different from each other.

## Avoid overlap
`deck_plan.json` lists every deck in the calendar with its scope. Stay inside your deck's lane and
don't write a question that obviously belongs to another deck in the plan (e.g., a basketball
question in a Monday Mixer, when there's a "Hoops" deck). Don't repeat a fact across your own decks.

## Output — write ONE JSON file (an array of your decks) at the path you were given
```json
[
  {
    "id": "box-office",
    "blurb": "Blockbusters from the drive-in to the multiplex",
    "categories": [
      {
        "name": "Blockbusters",
        "questions": [
          {
            "value": 100,
            "q": "Which 1975 Steven Spielberg film is often called the first summer blockbuster?",
            "options": ["Jaws", "Close Encounters", "Star Wars", "Duel"],
            "answer": 0,
            "fact": "Jaws was the first film to pass $100 million in US theatrical rentals.",
            "src": "how you verified it (short note or URL) — never shown to players"
          }
        ]
      }
    ]
  }
]
```
- `id` must match the plan's id exactly. Exactly 3 categories, each with exactly 4 questions in
  order 100, 200, 300, 400.
- `answer` is the 0-based index of the correct option. Vary its position (the game also shuffles).
- Write the file with the Write tool, then validate it: run
  `python3 -c "import json;d=json.load(open('PATH'));print(len(d))"` and fix any JSON errors.
- Re-read every question once more against the hard rules before you finish.
