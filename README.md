# Capra Lab

The hub for JC's games: an iPhone-friendly page with a tile per game, one player profile that works across every game in the lab, and the games that live inside it.

## What's here

```
public/                      the site Netlify serves
  index.html                 the hub page
  lab/hub.js                 profile walkthrough, sign-in, "Playing as" chip
  lab/keycard.js             the key card picture (key printed on it and hidden inside it)
  lab/chip.js                the Capra Lab button every game's main menu starts with (<capra-lab-chip>)
  lab/capras-lab.js          Capra's Lab: the owner's and crew's private panel on the hub
  lab/brew.js                the "still brewing" gate for a game in testing (members only)
  lab/capra-lab-mark.png     the lab logo, small, for that button
  assets/, icons, manifest   logo, home-screen icon, full-screen app support
  primal-survival/           built from games/primal-survival/ (not committed)
  par-tee-time/              built from games/par-tee-time/ (not committed)
  swerve-planet/             built from games/swerve-planet/ (not committed)
  dont-look/                 built from games/dont-look/ (not committed)
  goat-getaway/              built from games/goat-getaway/ (not committed)
  punchline/                 built from games/punchline/ (not committed)
  classified/                built from games/classified/ (not committed)
  no-cap/                    built from games/no-cap/ (not committed)
  screensaver/               built from games/screensaver/ (not committed)
  mind-heist/                built from games/mind-heist/ (not committed)
lab/                         lab-wide server code (profiles.js, crew.js for Capra's Lab, stores.js)
  profiles.js                one name + six-digit key per player, for every game
  stores.js                  Netlify Blobs / memory / file storage
  test/profiles.test.mjs
games/primal-survival/       Primal Survival's source: client, shared engine, server, tests
games/par-tee-time/          Par-Tee Time: one self-contained page
games/swerve-planet/         Swerve Planet: the page, its icon and its leaderboard tests
games/dont-look/             Don't Look!: page, game.js, logic.js (tilt, dealing), words.js (the decks), tests
games/goat-getaway/          Goat Getaway: page, game.js, art.js, shared/ (puzzle rules and pens), server/, tests, CLAUDE.md
games/punchline/             Punchline: page, game.js, art.js, shared/ (clock and scoring), server/, decks/, docs/, tests, CLAUDE.md
games/classified/            Classified: page, game.js, shared/ (rules, avatars), server/, content/, docs/, tests, CLAUDE.md
games/no-cap/                No Cap: page, game.js, shared/rules.mjs, server/, decks/<shelf>/, docs/, tests, CLAUDE.md
games/screensaver/           Screensaver: page, game.js, shared/board.mjs (the bouncing and the boards), server/, tests, CLAUDE.md
games/mind-heist/            Mind Heist: Preact client, game server, decks, its own build.mjs, tests and CLAUDE.md
netlify/functions/
  profile.mjs                /api/profile/*                lab profiles
  primal-survival.mjs        /primal-survival/api/*        Primal Survival's API
  swerve-planet.mjs          /swerve-planet/api/scores     Swerve Planet's leaderboards (path set in the file)
  mind-heist.mjs             /mind-heist/api/*             Mind Heist's server (built from games/mind-heist/src/, not committed)
  goat-getaway.mjs           /goat-getaway/api/*           Goat Getaway's daily pen, race board and diamonds (path set in the file)
  punchline.mjs              /punchline/api/*              Punchline's daily drop and party rooms (path set in the file)
  classified.mjs             /classified/api/*             Classified's operations and share files (path set in the file)
  no-cap.mjs                 /no-cap/api/*                 No Cap's rooms and challenges (path set in the file)
  screensaver.mjs            /screensaver/api/*            Screensaver's daily board (path set in the file)
scripts/build.mjs            Netlify's build: runs each game's checks, lays it out in public/
scripts/dev-server.mjs       the whole lab locally, with in-memory storage
netlify.toml                 build settings and the API routes
```

## Profiles

A Capra Lab profile is a player name and a six-digit key, nothing else: no email, no password, no reset. The key is the account, so the first visit walks a new player through:

1. **Welcome**: make a profile, sign in with a key, or skip for now.
2. **Pick a name**: names are unique across the lab.
3. **Your key card**: a picture with the name and key printed on it, and the key also hidden inside the file. **Continue stays locked** until the card has gone through the share sheet (Save Image puts it in Photos) or the player ticks "I saved my key picture, or I took a screenshot of it". Leaving mid-way brings them back to this step next time.
4. **Done**: signed in everywhere in the lab.

Signing back in: choose the key picture (the hidden key signs you straight in), or type the name and six digits printed on it. A screenshot loses the hidden copy but keeps the printed one.

Guessing a key is slowed per name: after 8 wrong keys in 10 minutes that name accepts no key for 10 minutes (sign-in answers 429, games see no match). It's per name rather than per address because games check keys from Netlify's servers.

The signed-in player is kept in the browser under `capra-lab.profile`, which every game in the lab reads. On iPhone, a home-screen app keeps its own storage separate from Safari, so the first time someone opens Capra Lab from the home screen they sign in once with their key picture.

**Games on their own sites** (Glacial Maw) are passed through by `netlify.toml`, so they share this address and its browser storage. Requests through the proxy count on both sites' Netlify credits.

**Adding a game to the profile:** server side, call `profiles.verify(name, code)` from `lab/profiles.js` and keep the game's own stats under its own store, keyed by the profile's handle. Client side, read the player from `localStorage['capra-lab.profile']` (`{ name, handle, code }`). Every game's main menu starts its top row with the Capra Lab button: `<script src="/lab/chip.js" defer></script>` and `<capra-lab-chip></capra-lab-chip>` (the lab logo, back to the hub, then the player's lab name, or "Sign in" for a guest). Put it where the logo lands `max(16px, safe-left)` in and `safe-top + 10px` down, the same spot as every other game.

Par-Tee Time was first built to run inside Claude. On Capra Lab its NPCs use their scripted trash talk (the Claude-powered replies only exist inside Claude) and the online-with-a-friend mode is hidden, since its rooms need Claude too. Hustler and pass-and-play work fully.

## Games on the hub

| Game | Where |
| --- | --- |
| Par-Tee Time | Lab original: `/par-tee-time/` (only in Capra Lab) |
| Don't Look! | Lab original: `/dont-look/` (only in Capra Lab). Heads Up-style: phone on the forehead, flip up for got it, down to pass (swappable in settings). Four levels (K–2, 3–5, 6–8, 9–12), 14 decks plus Mix It Up, words in `games/dont-look/words.js`. No server and no leaderboard on purpose; the lab name shows in the corner |
| Goat Getaway | Lab original: `/goat-getaway/`. The daily 6×6 sliding puzzle (Mind Heist's Vault Jam until Nov 7 2026): get the goat out the gate past hay bales, apple crates and tractors. One pen a day for everyone (easy Monday, G.O.A.T. Sunday), timed by the server from opening it; the lab's top five by name, a Blue Ribbon for the day's fastest, and diamonds paid into Mind Heist for its daily card draw. Endless practice pens. 💡 Hint shows the best next move (on today's pen, +15 s each and no par diamond). Rules in `games/goat-getaway/CLAUDE.md` |
| Punchline | Lab original (live since Nov 8 2026; a JJ Brew before that): `/punchline/`. Wrong Signs (comic signs with misprints, burnt-out lights and terrible design), Ugly Ts (cursed T-shirts) and jokes (moved out of Mind Heist). Every card is a four-square: three copies of a sign read right and one is off (a burnt-out letter, a typo); tap it fast. Jokes put four punchlines in the square. A daily drop for everyone, and party rooms of up to 12 phones on any deck, with a Late Night shelf for high school. Rules in `games/punchline/CLAUDE.md` |
| Classified | Lab original (live since Nov 8 2026): `/classified/`. The sleepover game: secret missions all night (with counter-intel to burn them), anonymous Who Said It answers and Yearbook votes, then the host declassifies the file and every phone follows the reveal. Comic avatars, codenames, and a highlights-only share page. Rules in `games/classified/CLAUDE.md` |
| No Cap | Lab original, a JJ Brew (Nov 8 2026): `/no-cap/`. Three facts and one cap in a single sentence: live, a reader reads it with a straight face and everyone else taps the facts one by one (tap the cap and you're busted); solo runs and "beat my score" challenge links. Decks on four shelves by age (Kids, Middle School, High School, Young Adults). Rules in `games/no-cap/CLAUDE.md` |
| Screensaver | Lab original, a JJ Brew (Nov 8 2026): `/screensaver/`. A box bounces like an old screensaver, pauses, and you have 25 seconds to call the corner it hits dead on. Boards grow and the box shrinks; later boards are rooms joined at their corners. A daily run (the same boards for everyone, three misses and out) with a board, plus practice. Rules in `games/screensaver/CLAUDE.md` |
| Primal Survival | Native: `/primal-survival/`, uses Capra Lab profiles |
| Mind Heist | Native: `/mind-heist/`, server at `/mind-heist/api/*` (the `mind-heist` function, path set in its entry). Source in `games/mind-heist/` with its own CLAUDE.md. Lab keys are checked in-process and each lab player is linked to one Mind Heist profile. The old mind-heist.netlify.app forwards here, carrying each player's sign-in (`games/mind-heist/dev/move-to-capra-lab/`, which also copied every player across) |
| Glacial Maw | `/glacial-maw/`, served from its own site (glacialmaw.netlify.app, repo jj-capra/glacial-maw) so its hunters, friends and saves stay put; see netlify.toml |
| Swerve Planet | Native: `/swerve-planet/`, leaderboard at `/swerve-planet/api/scores`; signed-in players post under their lab name |

## Adding a game tile

Copy one of the `<a class="tile">` blocks in `public/index.html`, then change the link, the `--tile` color, the icon, the name and the tagline. Update the count in the `PICK AN EXPERIMENT` row.

## Making a game native

Put its source in `games/<game>/`, add a step to `scripts/build.mjs` that copies it into `public/<game>/`, add its API as `netlify/functions/<game>.mjs` with one redirect in `netlify.toml`, and point its tile at `/<game>/`.

**Every page leaves room for the iPhone status bar.** Capra Lab is often opened from the home screen, where the page runs under the status bar (time, battery) and iOS blurs whatever sits there. Use `viewport-fit=cover` in the viewport tag and start every screen, top bar and in-game HUD below `env(safe-area-inset-top)` (for example `padding-top: calc(env(safe-area-inset-top, 0px) + 12px)`), with the same for `env(safe-area-inset-bottom)` at the bottom and the left/right insets in landscape. Fixed and absolutely positioned layers need it too, since body padding doesn't move them. To check without a phone, Chromium's DevTools protocol can fake the insets: `Emulation.setSafeAreaInsetsOverride` with `{ top: 59, bottom: 34 }`.

## Testing and deploying

```
npm install
npm test                                  lab profiles + Primal Survival engine and API
npm run build && node scripts/dev-server.mjs    the lab at http://localhost:8790
```

Netlify deploys automatically from `main`. Storage is Netlify Blobs: `capra-lab-profiles` for identities, `primal-survival` for that game's seasons, runs and careers, `swerve-scores` for Swerve Planet's boards, `mind-heist-daily` for Mind Heist (profiles, friends, rooms, challenges, and the diamonds Goat Getaway pays in), `goat-getaway` for Goat Getaway's days, ribbons and race boards, `punchline` for Punchline's party rooms, `classified` for Classified's operations and share files, `no-cap` for No Cap's rooms and challenges, `screensaver` for Screensaver's daily boards.
