# Joke deck check brief (Mind Heist, November 2026)

You are an independent checker. You did not write these jokes. Read the writers' brief
`docs/JOKE_BRIEF.md` first: it is the contract. Then the DECK_SPEC length and
JSON rules in `docs/DECK_SPEC.md`.

How the jokes are played (so you know what can go wrong): the setup shows, then four
punchlines. In a crew game one player from each crew picks in secret against the clock; the
fastest player to pick the real punchline wins the money. If neither gets it, the punchline
text goes blank and they pick again from memory. The answer key is revealed on a shared screen
with no appeal, so **a second option that also works as a punchline is the worst failure**, and
an off-color joke in front of coworkers or kids is the second worst.

## For every joke, check
1. **The keyed punchline lands.** Say the joke out loud in your head. The double meaning or
   twist must be real and quickly understood. If it's weak, obscure, or needs explaining to an
   adult, replace the joke.
2. **No other option works.** Try each distractor as the punchline. If one is also a pun on the
   setup, is also a known punchline to this setup, or a room could argue it's funnier, rewrite
   that option (a flat literal answer or a near-miss that doesn't connect).
3. **The right one doesn't stand out** by being the only pun-shaped, longest or oddly worded
   option. Even out the form.
4. **Workplace- and family-safe** (brief rule 1): no innuendo, insults, alcohol, drugs, politics,
   religion, death or injury as the joke, no jokes about any group, job group or real person.
5. **Not a known comedian's bit** or a joke famous from a specific show, film, ad or book. If you
   recognize it as someone's, replace it.
6. **True premises** for science, history and animal jokes.
7. **The bonus line** (`fact`) is a complete, clean, short joke on the theme starting "Bonus: "
   (or an explanation starting "The pun: "), and is not a repeat of any question or bonus line.
8. **No repeats across all 30 joke decks**: grep the other writers' files
   (`decks/J*.json`) for the same
   setup or punchline. If yours repeats one, replace yours. The brief's reserved famous jokes
   belong only to the named deck.
9. **Fits its deck and category**: the theme, the category's kind (Groaners / Wordplay / Twists),
   and the $100 (heard it) to $400 (clever) ladder.
10. **Length limits**: q 110, each option 30, fact 140, category name 20, blurb 80. Plain text.

## Fixing
Fix in place where you can (rewrite an option, tighten wording). Replace a whole joke when it
fails 1, 4 or 5, keeping the category, value and kind. Keep each deck's id and three
categories, 100-400 order, and `answer` pointing at the right option. Update `src`.

## Output
1. The full corrected file (same JSON shape) at the output path you're given. Validate it with
   python: json.load, ids, 3 x 4 per deck, answer 0-3, every length limit.
2. A change log at the log path you're given: one line per change (deck / category / value:
   what was wrong -> what you did), and a count of jokes checked, changed and replaced.
3. Reply with a one-paragraph summary, including anything you're unsure about.
