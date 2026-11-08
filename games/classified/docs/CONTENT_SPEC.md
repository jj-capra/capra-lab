# Classified: how the content is written

**Classified** (capra-lab.netlify.app/classified/) is JC's sleepover game for teens (about 13 to
17), played on everyone's phone across a whole night and talked about the next day. It joins three
ideas JC picked (Nov 2026): **Sleeper Agent** (secret missions all night), **Who Said It**
(anonymous answers the room guesses later) and **Yearbook** (superlative awards). In the morning,
or whenever the host taps it, the file is **Declassified**: the room guesses who wrote each answer,
every agent's missions are revealed (done, burned by a counter-agent, or never finished), and the
Yearbook awards are handed out. A highlights page goes out as a link the next day.

Three files live in `games/classified/content/`:

## missions.json

The secret missions an agent gets during the night. Each agent starts with three and gets a new
one every 45 minutes; they can swap a mission they hate. Other agents can try to **burn** a
mission: an agent who thinks someone is working a mission on them picks the mission they think it
is from four choices (one real, three from this file), so missions must be **specific enough to
spot** but **natural enough to pull off without being caught**.

```json
[
  { "id": "m001", "text": "Get {target} to say the word \"pickle\" without you saying it first.", "target": true },
  { "id": "m002", "text": "Start a slow clap and get at least two people to join in.", "target": false }
]
```

- `id` unique (`m001`…); `text` at most 110 characters, written to the agent ("Get…", "Make…",
  "Convince…", "Without anyone noticing…"). `{target}` is replaced with another player's name; set
  `"target": true` when the text uses it (exactly once), `false` when it doesn't.
- Write about **90**: roughly half with a `{target}`, half without.
- Every mission has to be possible indoors, at night, at a sleepover, with no supplies beyond what's
  in a normal house (snacks, a blanket, a pillow, a phone). Doable in a few minutes once the chance
  comes up, and clear when it's done.
- Variety: getting someone to say a word or phrase, ask a question, do a gesture, switch seats,
  agree to something silly, laugh at something unfunny; sneaky solo ones (use a word three times in
  one conversation, move an object across the room without being noticed, speak only in questions
  for a minute); room ones (start a group chant, get everyone to vote on a snack).

## prompts.json

The **Who Said It** questions. A few open at the start of the night and one more drops every 30
minutes. Everyone answers anonymously (up to 100 characters); at the reveal the room sees one
answer at a time and guesses who wrote it.

```json
[ { "id": "p001", "text": "What's a food combo you secretly love that sounds gross?" } ]
```

- `text` at most 90 characters. Write about **60**.
- Good prompts get answers that are **personal enough to guess** (they sound like someone) and
  **funny or surprising to read out**: opinions, habits, hot takes, would-you-rathers with a reason,
  "describe X in three words", "what would you do if…", childhood memories, weird talents.
- Answerable by anyone in a sentence, at any age 13 to 17, without revealing anything private.

## yearbook.json

The **Yearbook** superlatives. A game uses eight; every agent votes once per award for another
agent (never themselves). The winner's avatar gets the award at the reveal and on the share page.

```json
[ { "id": "y001", "text": "Most likely to survive a zombie apocalypse" } ]
```

- `text` at most 60 characters. Write about **45**. Mostly "Most likely to…", plus some "Best…"
  and "Biggest…".
- **Silly or flattering, never mean.** Everyone should be happy, or at least laughing, to win any
  of them. Being picked must never be embarrassing.

## Content rules (JC's audience is teens at sleepovers, and parents may read the share page)

- Clean: no swearing, nothing sexual, no romance, crushes, dating or "who do you like" anything.
- Nothing about bodies, weight, looks, clothes size, race, religion, nationality, disability,
  gender, sexuality, money or family situations; no politics.
- No drugs, alcohol, vaping or smoking; no weapons or violence; nothing about self-harm, death,
  sickness, or anything scary for real.
- Missions: nothing dangerous or destructive (no leaving the house, no climbing, no stunts, no fire,
  no food dares, nothing near the stove), no touching anyone without them agreeing to it (a high
  five or a handshake is fine), nothing done to someone who's asleep, nothing that embarrasses
  someone in front of others, no going through anyone's phone, bag or messages, no posting anything
  online, no lying to parents or getting anyone in trouble.
- Prompts: nothing that pressures someone to reveal a secret, a fear that could be used against
  them, a grade, or anything about other people in the room. No "what's your biggest regret".
- Yearbook: no awards that could read as an insult (no "Most annoying", "Worst…", "Most dramatic",
  "Laziest").
- No real brands, shows, games, celebrities or people.

## Checking

Every file is checked by someone who didn't write it: lengths, ids, `{target}` used exactly when
`target` is true, and every rule above. Then `node games/classified/test/classified.test.mjs`
checks the structure.
