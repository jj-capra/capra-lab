# Mind Heist Daily — fact-check brief

You are an independent fact-checker. You did NOT write these questions, and you should assume
nothing in them is true until you've confirmed it. The game is played live over Teams/Zoom by
coworkers at a Washington State government office; the host reveals the answer key on screen
with no appeal. **A wrong answer key, a defensible second answer, or an embarrassing question
in front of the room is the worst possible outcome.** A question that's merely a bit easy is fine.

Read the writing rules first: docs/DECK_SPEC.md
The calendar (each deck's intended scope): deck_plan.json

## For every question, check
1. **The keyed answer is correct.** Confirm with WebSearch/WebFetch unless it is textbook-certain
   (e.g., "capital of France"). Dates, numbers, "firsts," records, who-did-what, origins and
   etymologies always get checked. Prefer primary or authoritative sources (Britannica, official
   sites, Merriam-Webster/Etymonline, NASA/NOAA/USGS, league record books, Smithsonian).
2. **Every wrong option is definitely wrong.** Look for a defensible alternate: a co-inventor, a
   disputed first, a regional/British spelling, a "technically also true," a rounding issue, a
   tie. If one option could be argued right, replace that option.
3. **The fact line is accurate.** It's shown on screen as true; check it like an answer.
4. **No time-sensitive wording.** Nothing that could change after today (records an active
   person could break, "current," "largest company," populations, rankings that shift).
5. **Workplace-safe and on-spec** (DECK_SPEC hard rules 4–7): no politics, alcohol/drugs,
   romance, gore, disasters with casualties, stereotypes, quoted lyrics or passages.
6. **Fair difficulty ladder** ($100 easy → $400 hard but fair) and options of similar form
   so the answer isn't given away by length or style.
7. **Length limits:** q ≤ 110, option ≤ 30, fact ≤ 140, category name ≤ 20, blurb ≤ 80 chars.

## Fixing
- Fix in place: correct a fact line, replace a weak or arguable option, tighten wording.
- If a question can't be confirmed within a couple of searches, or is contested, **replace the
  whole question** with a new one in the same category and value that you can confirm. The
  replacement must follow DECK_SPEC and not duplicate another question in the file.
- Keep each deck's `id`, its 3 categories (you may rename a category only if the questions don't
  fit its name), and the 100/200/300/400 order. Keep the `src` field and update it to the
  source you used.

- If WebSearch stops returning results, keep going with WebFetch on authoritative pages
  (Britannica, official sites, Wikipedia). Any question you could not confirm online gets
  "NOT WEB-CHECKED" at the start of its `src`, so a second pass can find it.

## Output
1. Write the complete corrected file (same JSON shape as the input) to the output path you're
   given. Validate it with python (`json.load`) and check every length limit with a short script.
2. Write a short change log next to it (same name, `.log.md`): one line per change —
   deck / category / value: what was wrong → what you did. End with a count of questions
   checked, changed and replaced.
3. Finish with a one-paragraph summary including anything you remain unsure about.
