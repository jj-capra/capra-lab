# Punchline: how a Wrong Signs deck is written

Punchline (capra-lab.netlify.app/punchline/) is JC's party game of **Wrong Signs** and **jokes**.
A Wrong Signs card is one comic panel with a sign in it (a storefront, billboard, school marquee,
road sign, office plaque, park sign...) that came out wrong: a **misprint**, **burnt-out lights**,
or **terrible design** that makes it read as something else.

How a card plays (the four-square, JC Nov 8 2026): the sign shows **four times**, three the way it
should read and one with the mistake (the dark letters, the typo); players tap the odd one. Then
it zooms in with the difference circled, and the reveal says what it reads and shows the
**caption**, the last laugh. A design card's sign shows four times with a small made-up flaw on
one, and the reveal explains the bad design. So `lights` and `misprint` cards are the best fit;
the options still matter (the right one is what the reveal says it reads, or should say).

## File format

One JSON file per deck in `games/punchline/decks/signs/<id>.json`:

```json
{
  "id": "burnt-out",
  "title": "Burnt Out",
  "shelf": "family",
  "blurb": "Neon and marquee letters on the fritz",
  "cards": [
    {
      "id": "b01",
      "scene": "neon",
      "where": "STRIKE ZONE",
      "kind": "lights",
      "sign": ["~BOWLING", "ALL NIGHT"],
      "options": ["OWLING ALL NIGHT", "HOWLING ALL NIGHT", "BOWLING ALL NIGHT", "OWNING ALL NIGHT"],
      "answer": 0,
      "caption": "Now booking parties for owls. Hoo's in?"
    }
  ]
}
```

- `id`: kebab-case, unique; card `id`s unique within the deck.
- `shelf`: `"family"` (all ages, these rotate as the daily drop) or `"late"` (Late Night: the
  high school edition, only when a host turns Late Night on; never the daily drop).
- `cards`: **12 per deck**.
- `scene`: one of the scenes below. Pick the one that fits the joke.
- `where`: optional, the business or place name painted on the building or post, up to 18
  characters (invented names only, see the rules).
- `kind`: `"misprint"`, `"lights"` or `"design"`.
- `sign`: 1–4 lines, **at most 20 characters per line**, as they appear on the sign (signs are
  usually ALL CAPS; handwritten yard signs and chalkboards can be mixed case). For `lights`, put
  `~` right before every letter whose light is out: `"~BOWLING"` has the B out and reads OWLING.
  Spaces never take a `~`.
- `ask`: optional; the default comes from `kind`:
  - misprint: "What was it supposed to say?" (right answer = the fixed sign)
  - lights: "What does it say right now?" (right answer = the reading with the dark letters gone)
  - design: "What does it look like it says?" (right answer = the accidental reading)
  You may write your own short `ask` (up to 40 characters) when a card works better another way,
  like "Which word is wrong?" or "What should it say?".
- `options`: exactly 4, **each up to 34 characters** (for a sign of several lines, write the
  reading as one line, as in the example). Exactly **one** is right; the other three
  must be plausible at a glance and clearly wrong once you look again. No "all of the above".
- `answer`: 0–3, the index of the right option. Spread the right answers evenly over 0–3 in each
  deck (three of each).
- `caption`: up to 90 characters, the punchline shown at the reveal (a sly line from the
  business, a bystander's reaction, or a narrator box). It must not just repeat the answer.

## Scenes

| scene | what it is | good for |
|---|---|---|
| `neon` | night, glowing tube letters on a building | burnt-out letters |
| `marquee` | letter board on a school, theater, bowling alley or community center | misprints, burnt-out bulbs, odd messages |
| `storefront` | painted sign board over a shop with an awning | misprints, bad design |
| `billboard` | big roadside billboard | bad design, contradictions |
| `road` | green highway or street sign on posts | road and town signs |
| `banner` | vinyl banner on a fence or a campus gate | schools, colleges, events |
| `plaque` | an office door or lobby sign | workplaces, clinics |
| `trail` | carved wooden park or trail sign | parks, campgrounds, zoos |
| `chalk` | a sidewalk chalkboard menu | cafes, food trucks |
| `yard` | handwritten cardboard sign on a stake | yard sales, lost pets, lemonade |
| `restroom` | a restroom door sign | bathroom humor |

## Content rules (JC's decisions)

**Every deck**
- Invented names only: no real businesses, brands, chains, colleges, schools, teams, products or
  people. ("Pinecrest University", "Big Earl's Bait & Tackle", "Valley Tire Barn" are fine.) Real
  public places like a city park can be the setting, but never a real business.
- Funny first: the wrongness must be visible on the sign itself, and the caption should land.
- Nothing about race, ethnicity, religion, nationality, disability, gender, sexuality or body
  shape; no mocking how anyone speaks English; no politics.
- **No sexual content or sexual innuendo of any kind**, in any deck. No drugs, alcohol, vaping or
  smoking as the joke; no weapons, violence, self-harm, death as the joke.

**Family** (`"shelf": "family"`): clean for everyone from about 8 to 80, the kind of thing a
whole family laughs at over breakfast. No swears, not even burnt-out ones.

**Late Night** (`"shelf": "late"`, high school ages 14–18): Cards-Against-Humanity energy without
the sex: roasts, gross-out, bathroom humor, savage-but-silly, absurd dark-ish twists, and
misdirection setups ("Guys only want one thing and it's disgusting!") whose payoff is something
gross or dumb, never sexual. "IYKYK" here comes from the misdirection, never from a sex joke.
Mild swears (hell, damn, crap, sucks, butt, and "shit" only when it's spelled by burnt-out
letters) are allowed; nothing stronger, no slurs, no insults about anyone's identity or body.
Roasts aim at the reader in general ("you"), never at a group.

## Checking

Every deck is checked by someone who didn't write it: each card has exactly one right answer,
the `~` letters really read as the right option, lengths fit, names are invented, and the content
rules hold. Then `node games/punchline/test/punchline.test.mjs` checks the structure.

# Ugly Ts decks

**Ugly Ts** (JC, Nov 8 2026: "unhinged screen printed words and bad design decisions and other
randomness and punch lines of jokes that take a second") is Punchline's third shelf. Every card is
one cursed T-shirt: on a thrift rack, in a clearance bin, at a family reunion, at a school spirit
day. The shirt is drawn by the game; a card says what's printed on it.

One JSON file per deck in `games/punchline/decks/tees/<id>.json`, the same format as a sign deck
with these differences:

- every card's `scene` is `"tee"`;
- `where` (optional, up to 18 characters) is where the shirt is: `"THRIFT RACK"`, `"GIFT SHOP"`,
  `"REUNION 2026"`, `"SPIRIT DAY"`, `"CLEARANCE BIN"`;
- `sign` is the shirt's **front**, 1–4 lines, at most 20 characters per line (the same limits);
- `kind` is one of:
  - `"back"` (the slow burn, the heart of the shelf): the front is the setup of a joke that takes
    a second; the options are four possible **backs**; the right one is the real back. Add
    `"back": ["LINE", "LINE"]` (1–4 lines, up to 20 characters each) with the right answer laid
    out the way it's printed on the back: at the reveal the shirt spins around to show it. The
    default ask is "What’s on the back?". The wrong backs should be plausible-but-flat endings,
    so the right one is the one that makes you groan a second later.
  - `"misprint"`: a printing mistake (typo, missing comma, wrong word, wrong year); right answer =
    what it was supposed to say ("What was it supposed to say?"). `WORLD'S BEST FARTHER`.
  - `"peeled"`: the vinyl letters peeled or cracked off in the wash. Put `~` before every letter
    that's gone, exactly like burnt-out lights; right answer = what it reads now ("What does it say
    now?"). `~FLAG FOOTBALL` reads LAG FOOTBALL.
  - `"design"`: a bad design decision makes it read as something else, or the words are just
    unhinged clearance-bin randomness; write your own `ask` when it helps ("What was the shirt
    for?", "What does it look like?", "Which shirt is this?").
- `art` (optional): up to 3 clip-art stamps printed on the shirt, from this kit only:
  `wolf` (howling), `moon`, `dolphin`, `eagle`, `lightning`, `flame`, `taco`, `cat`, `pizza`,
  `cactus`, `duck`, `star`, `heart`, `arrow-up`, `arrow-down`. Clip-art crimes are their own joke:
  `PROUD SOCCER MOM` with `["wolf", "lightning", "dolphin"]`, asking "What does it look like?" with
  the answer "A METAL BAND'S 1988 TOUR SHIRT". `I'M WITH STUPID` with `["arrow-up"]` points at the
  wearer's own face.
- `arc` (optional, `true`): the first line is printed in a college-style arc across the chest; use
  it when the arc itself is the bad decision (too long, so the end gets crammed).

Shelves and content rules are exactly the sign decks' (family = clean for 8 to 80; Late Night =
high school, no sexual content or innuendo of any kind, mild swears only). No mocking how anyone
speaks English (no fake bad-translation shirts). Invented names only. A caption still lands the
last laugh at the reveal (who's wearing it, where it was found, the shop's excuse).
