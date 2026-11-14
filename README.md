# Capra Lab

The hub for JC's games: an iPhone-friendly page with a tile per game, one player profile that works across every game in the lab, and the games that live inside it.

## What's here

```
public/                      the site Netlify serves
  index.html                 the hub page
  lab/hub.js                 profile walkthrough, sign-in, "Playing as" chip
  lab/keycard.js             the key card picture (key printed on it and hidden inside it)
  lab/chip.js                the Capra Lab button every game's main menu starts with (<capra-lab-chip>)
  lab/share.js               the results text every game shares: the group-chat card (<lab-text-share>, CapraShare.text)
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
games/par-tee-time/          Par-Tee Time: one self-contained page, server/ (online rooms, masters.js for the Masters Course), tests
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
  par-tee-time.mjs           /par-tee-time/api/*           Par-Tee Time's online rooms and Masters Course (path set in the file)
scripts/build.mjs            Netlify's build: runs each game's checks, lays it out in public/
scripts/dev-server.mjs       the whole lab locally, with in-memory storage
netlify.toml                 build settings and the API routes
```

## The daily Card Draw

JC (Nov 11 2026): "Let's bring Draw a Card out from Mind Heist and for all Capra lab games. Card Draw will be a daily task... and it is four cards. Some do nothing, others give you extra lives in Swerve Planet, or screensaver, and other games, or a good amount of items with a similar advantage like hidden 50/50 is for Mind Heist." His picks (Nov 12): flip all four every day; the first games are Mind Heist, Swerve Planet, Screensaver, No Cap and Par-Tee Time.

- **The cards** (`public/lab/cards-catalog.mjs`, read by the server and the pages): `DRAW` 4 a day, each a prize `PRIZE_ODDS` (45%) of the time, at most `HOLD_EACH` (3) of one kind in a hand, a new draw at midnight Pacific. Duds have lab names (Spilled Beaker, Goat Hair…). Prizes: 🕵️ Mole and 🙈 Hidden 50/50 (Mind Heist), ❤️ Extra Life (Swerve Planet: a fourth heart), 💗 Extra Life (Screensaver: a fourth heart on today's run, spent only if the run needed it), 🛡️ Cap Shield (No Cap: the first cap you tap that game doesn't bust you), ↩️ Mulligan (Par-Tee Time, against a hustler or on a Masters Course: the putt is taken back).
- **The hub** (`public/lab/card-draw.js`): the DAILY CARD DRAW panel under the profile button. Four cards face down; the first tap deals the day (`POST /api/cards/draw`, which returns the same four if asked again) and each tap flips one. Which ones you've turned over is kept on the phone. YOUR HAND lists what you hold, by game, each a link to it. Guests see the cards and a button to make a profile.
- **The server** (`lab/cards.js`, `netlify/functions/cards.mjs` at `/api/cards/*`, store `capra-lab-cards`, `h/<handle>` = `{ day, today, hand, used }`, compare-and-swap writes): `/me`, `/draw`, `/use { k }` with the lab sign-in in the body. `/use` only spends cards marked `self` (the page plays them: Swerve Planet, Par-Tee Time). Games with a server (Screensaver, No Cap, Mind Heist) get the same module as `cards` and spend with `take(handle, k)`, handing it back with `give()` if the play is refused.
- **In a game** (`public/lab/card-offer.js`): `<lab-card-offer k="sp-life">` shows "❤️ Extra Life ×2" as a switch (hidden for guests and empty hands); the game reads `.armed` and calls `.spend()` for a `self` card, or sends the request to its server and calls `.disarm()` and `CapraCards.changed()`. Locally, `/api/cards/__give?handle=&k=a,b` fills a hand and `/api/cards/__clock?add=ms` moves the day.

## The wallet

JC (Nov 11 2026): "I also want diamonds amber and shards in Capra Lab. These are no longer just glacial maw unique. and this opens a way to accessorize and individualize their avatar". His picks (Nov 12): link Glacial Maw now; pay by how rare; save up for avatars (nothing to buy yet).

- **What pays** (`public/lab/wallet-catalog.mjs`, read by the server and the pages): amber for finishing a game (15 to 30), a shard for a win or a new best, `DAY_CAP` (150 amber, 3 shards) per game per day for what a page claims. Diamonds only for feats a game's own server checked, with no cap: Goat Getaway out at par with no hints, Screensaver's #1 of the day (settled the first time anyone says hello after midnight), a Masters trophy. Servers also pay Goat Getaway's getaway (30 amber), Screensaver's counted run (30 amber) and Masters loot (a shard).
- **The server** (`lab/wallet.js`, `netlify/functions/wallet.mjs` at `/api/wallet/*`, store `capra-lab-wallet`, `w/<handle>` = `{ diamonds, amber, shards, day, today, gm, log }`, compare-and-swap writes): `/me`, `/earn { game, event, ref }` (a game page's claim: the rule's pay, capped, a ref once a day), `/sync` (Glacial Maw). Game servers get the same module as `wallet` and call `pay(handle, { diamonds, amber, shards }, { game, why })`.
- **On the pages**: `/lab/wallet.js` (`CapraWallet.earn` at the end of a game, `CapraWallet.paid` to show what a game's server paid; a "+30 amber" toast under the clock). The Capra Lab button (`/lab/chip.js`) shows the three under the player's name (the type shrinks so all 17 characters of a name still fit). The hub has a YOUR WALLET panel with today's earnings, Glacial Maw's link and How to earn.
- **Glacial Maw** (its repo, Version 51): opened inside the lab at `/glacial-maw/`, Settings → Capra Lab wallet links a hunter to the signed-in lab player, once and for good; the link is the first `/sync` and brings the hunter's whole balance in. After that the game keeps its own count and every minute (and when the page goes to the background) sends the difference since the last sync and takes the lab's totals back (`state.lab.sync` in its saved game). A sync never takes the wallet below zero and can't move more than `SYNC_MAX` at once.
- **Mind Heist's diamonds** move into the wallet the next time a linked player opens Mind Heist (with any Goat Getaway diamonds still waiting there); its home card shows the lab's diamonds.
- Locally `/api/wallet/__clock?add=ms` moves the wallet's day and `/api/wallet/__give?handle=x&amber=300&shards=4&diamonds=1` fills a wallet for testing the shop. Trust: a page's claims can't be checked, so they're capped; Glacial Maw's game is kept on the phone, so its syncs are trusted the same way its own saves are.

## Avatars

JC (Nov 13 2026), roadmap step 4: a comic character, a person or an animal; the basics are free and the extras cost; prices by rarity, like earning; a 2D avatar now and the hologram later (with the trophy rooms).

- **The catalog** (`public/lab/avatar-catalog.mjs`, read by the server and the pages): free parts (person with 8 skin tones and 11 hairstyles in 10 colors, or one of 10 animals in 12 fur colors; 6 eyes, 5 brows, 6 mouths, cheeks, 10 shirt colors, 9 backgrounds) and the shop's 60 items in 7 slots (hats, glasses, outfits, face, gadgets, backdrops, effects): 34 common for 40 to 150 amber, 15 rare for 2 to 4 shards, 11 legendary for 1 to 3 diamonds. `clean(look, owned)` keeps a look valid and drops shop items the player doesn't own.
- **The drawing** (`public/lab/avatar.mjs`): `drawAvatar(look, { tight })` returns a comic SVG (ink outlines, halftone), built in named layers (`data-layer`: backdrop, aura, hair-back, body, head, face, hat, gadget, sparkle, scan...) so the hologram can reuse them. `lookFor(handle, saved)` is the saved look or, until there is one, a starter look seeded from the handle, so every page shows the same face.
- **The server** (the wallet: `w/<handle>` also keeps `items` and `look`): `/buy { item }` takes the price and shelves the item in one compare-and-swap write (a 402 "You need N more amber" when short; owned once, for good), `/dress { look }` saves the look (cleaned against what's owned), `GET /looks?h=a,b` returns up to 40 players' looks for pages that show other players.
- **The Avatar Studio** (`/avatar/`, `public/avatar/`): the avatar stays in view at the top while you pick; free tabs (You, Face, Hair, Colors) and the shop's tabs. Anything can be tried on; an item not owned brings up a buy bar (Buy, or "You need N more…" with How to earn) and Take off. The look saves itself a moment after each change. Guests can play with it but not save or shop.
- **Everywhere else**: the Capra Lab button shows the avatar at the start of the name pill and opens the studio (the pill is no wider than before; under 360px wide the face is left out so all 17 characters still fit); the hub's "Playing as" button and the wallet panel's AVATAR STUDIO card show it too. The look rides along with the balances in sessionStorage (`capra-lab.wallet`) and in `capra-wallet:changed`.

## The golf handicap

JC (Nov 13 2026): "Have a handicap for players to select in their profile." His picks: strokes off the score; on Masters the net decides, so a handicap changes at most once a week.

- **The numbers** (`public/lab/handicap-rules.mjs`): 0 (scratch) to 18 strokes over 18 holes; a shorter round gets its share, rounded (a 6 takes 6 off an 18, 3 off an 8-hole Masters, 3 off a 9, none off a single hole).
- **Where it's kept** (`lab/profiles.js`): `hcp` and `hcpAt` on the profile. `POST /api/profile/handicap { name, code, hcp }` sets it any time the first time, then once every 7 days (a 429 otherwise); `GET /api/profile?name=` shows it to anyone (it appears beside scores).
- **The control** (`/lab/handicap.js`, `<lab-handicap>`, `compact` for a small card): − and + with Save, the strokes it takes off, and the date it can change again. It caches `localStorage['capra-lab.hcp']` and fires `capra-lab:handicap`. On the hub's profile screen, and in Par-Tee Time's Who's playing, online lobby and Masters cabinet. Guests get a link to make a profile.
- **Par-Tee Time:** Masters reads it on the server (`verify` returns it; a try keeps the handicap it started with). In a friend match, if anyone has a handicap the scorecard shows each player's handicap and net, the final card goes by net ("By 2 on net · 27–25 on the card") and the results text adds "· net N". Player two on your phone picks theirs in setup (kept on that phone); online, each phone sends its own with its presence; the hustler plays scratch.

## Invites and the Home Screen app

JC (Nov 13 2026): "When I send a text invite and select it when I have my Capra lab as a Home Screen app, it goes to my browser. Can it look for this iPhone Home Screen app and push it to that?" iOS can't: a link tapped in Messages always opens in Safari, only App Store apps can claim links, and Safari and the Home Screen app don't share storage (so in Safari the player usually isn't signed in). The invite is handed over instead:

- **Safari** (`public/lab/handoff.js`, loaded by `/lab/fill.js` on iPhones and iPads): a game link with a code, a room, a challenge or a path on it, opened from outside the lab (not a game's front page, the hub or a link followed inside the lab), is posted to `/api/handoff/drop` and a "Got the app?" card says it's waiting in the Home Screen app for 5 minutes. Play here hides it for that link; "No app: don't ask again" stops it on that phone. `fill.js` keeps the link as tapped (`window.__labLanding`) because games take the code off the address as soon as they read it.
- **The Home Screen app**: each time it opens or comes back to the front it asks `/api/handoff/claim`, and a waiting invite shows "Your invite is here" with Show invite (a same-page link with a new code reloads so the game reads it) and Not now.
- **The server** (`lab/handoff.js`, `netlify/functions/handoff.mjs` at `/api/handoff/*`, store `capra-lab-handoff`): the two sides match by lab profile when Safari has one, otherwise by the phone: a hash of the network address or the city (Netlify's geo, for iCloud Private Relay) with the iOS version, screen size, pixel ratio, time zone and language. Only hashes are stored, an invite opens once, and the newest wins. The url can only be a path on this site.

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

Par-Tee Time was first built to run inside Claude. Smack talk is only between friends online (JC, Nov 10 2026): the hustlers play in silence, and the talk and chat buttons show only in online games. On iPhone and iPad the talk button opens the message box with the keyboard up for its own dictation mic, since Safari's speech-to-text froze the game; elsewhere speech-to-text is stopped if it hangs. Zoom is off (pinch stopped in the page, double-tap by `touch-action`). Online, the pause menu can't pause, so a hole can end under the menu's scorecard: the card then becomes the hole's card and its button always moves on (that froze games, Nov 10 2026), and a safety net puts the card back if a phone ever sits on a finished hole without one. Online with a friend works on Capra Lab since Nov 9 2026: the page's rooms (join, presence, leave) go to `netlify/functions/par-tee-time.mjs` (`games/par-tee-time/server/api.js`, store `par-tee-time`), polled about once a second while your friend lines up. The shooter's phone sends where every ball comes to rest, so both phones always agree; each shot also carries the last few, so a phone that slept catches up. A host creates a four-character code and can send an invite link (`/par-tee-time/#ABCD` opens the join box with it). Hustler and pass-and-play work fully.

**Par-Tee Time's eight courses** (JC, Nov 11 2026: "in Par-Tee Time I want double the courses"): Sunset Boardwalk (Easy), Pier Pressure (Easy+), Party Time (Medium), Neon Alley (Medium+), After Hours (Hard), Graveyard Shift (Hard+), The Gauntlet (Expert), Boss Level (Legend), nine holes each, in `COURSE_SETS` in `games/par-tee-time/index.html`. Each course uses each of the nine themes once. A hole's number in `HOLE_DEFS` comes from its course's `slot`: the first four courses keep 0 to 35 (saved settings and online matches send these numbers) and the four from Nov 12 2026 are 36 to 71, so add new courses at the end, never in between. Par is the Hustler's measured average, rounded (`TUNE`); `node games/par-tee-time/tools/measure-pars.mjs` re-measures a hole headlessly with the page's own engine. `test/holes.test.mjs` checks every course, hole id, tee, cup and par, and the numbering.

**Par-Tee Time's Mulligan** (a card from the daily Card Draw, `pt-mulligan`): against a hustler or on a Masters Course, a ↩ button sits by the pause button from the moment your putt stops until the next putt is struck (yours or the hustler's). Tapping it spends the card (`/api/cards/use`; the game holds still meanwhile) and puts the balls, strokes and hole scores back as they were before your putt (`mullSnap`, `mulligan` in `index.html`). Not in pass and play or online.

**Par-Tee Time's shot camera** (JC, Nov 13 2026: "a more epic angle for once the shot goes. Like a live camera follow behind to see where it is aiming with a glowing path tube and the hole flag epically flapping in the wind"). Once a putt is struck (yours, the hustler's, a friend's, online or on a Masters) the view swoops down behind the ball and follows it (`CAM`, `renderChase` in `index.html`): the hole is the overhead art laid down as a ground plane in perspective (Mode 7: the art drawn into a 3× texture each frame, then onto the screen in thin strips, each with its own transform), the shot is played out once quietly when it's struck so its path glows ahead of the ball as a tube (bright for the next 150 units, fading beyond, beads of light running along it, a faint trail behind), balls are shaded spheres with shadows, and the flag stands 66 units tall at the cup with a cloth that ripples in a wind blowing across the hole, the hole number on it. The camera turns to look half a second ahead along the path, so a bank swings it round; speed lines show on a fast ball and the comic words pop where they happen. When the balls stop it holds a beat (longer when the ball drops), rises back up, flashes back to overhead, and only then does the game carry on (`finishShot` waits for it). Tap-ins under 30 units stay overhead. SHOT CAMERA in the setup and the pause menu switches between Chase and Overhead (`PREF.cam`; Overhead by default with reduced motion).

Since the same night (JC: "Now make everything else 3d in the new camera angle. Make it slow motion and add way more detail to this graphic novel look"):
- **Everything stands up.** The ground texture leaves out what stands (`drawHoleStatic(ctx, h, true)`, `drawMovers(..., flat)`), and the camera builds it in 3D instead: rails as wooden walls along the fairway (in short pieces so they sort), stone and cushion blocks, gold bars, backboards on posts and floating rims, kickers with stars, cones, gems, studs, posts, palms with fronds, planets as ringed spheres, the windmill buildings with gable roofs and tunnel mouths, laser posts and glowing laser walls, and each frame what moves: windmill paddles with slats, the octopus (arms as raised ribbons, a head that watches the ball, the fedora), clock hands stacked at three heights, vault door segments, cars with glass cabins, defenders with arms and heads, pendulums. It's prisms, cylinders and spheres in camera space, clipped at a near plane, sorted farthest first with the balls, the flag and the tube; faces turned away are skipped.
- **The graphic novel look.** Faces are lit from up-screen left: lit sides plain, dark sides cross-hatched, tops lighter, some dotted; ink outlines thicken as things come closer; shadows fall away from the light as one dotted shape. The sky has Ben-Day dots and each theme's own horizon in silhouette, sliding as the camera turns (windmills on hills, a city skyline with lit windows and a bank, an arena crowd and scoreboard with spotlights, a lagoon with islands, neon signs over palms, the back bar with hanging lamps and an 8 BALL sign, a giant clock with cogs, a ringed planet). Balls are shaded spheres with dimples and dots on the dark side; a fast one leaves echoes. A yellow narration box tells the shot ("HOLE 4. JJ PUTTS…", "OFF THE RAIL!", "ZAPPED!", "WILL IT DROP…?", "IT DROPS!", "SO CLOSE…") from the shot's own events; there's a dotted vignette and a thick ink panel border.
- **Slow motion.** The roll plays at 0.45× (0.28× within 60 units of the cup, eased), a tap anywhere speeds it to 2.4×, and anything rolling past 8 seconds picks up to 1.4×. It only changes how fast the shot is shown: the shot itself is the same (`G.simAcc` scaled by `CAM.ts`).
- Anything close to the camera, or between the camera and the ball, goes see-through so the ball is never hidden.

**Par-Tee Time's Masters Course** (JC, Nov 11 2026: "a mixed 18 holes of two different courses they can save and send to anyone in text as a challenge"; Nov 13 2026: "master courses after today can no longer be 18 holes. They are only eight holes. They pick any hole of any course. They can go by theme like the cars, clock and they have one chance and must post it for anyone to try by invite").

- **Since Nov 13 2026:** a new course (`v: 2`) is any 8 different holes. The builder has GO BY THEME (one tap fills the eight holes of a kind, one from each course, easiest course first: the highways with the cars, the clocks, the windmills...) and OR PICK ANY 8 (browse by theme or by course, tap holes to add them in playing order, ✕ to take one off, Easiest first, Clear). The page sends the hole ids, their courses and the theme when all eight share one. The designer has **one chance**: one counted try, and whatever it scores is the course best and the course is posted for anyone with the invite; if that try burns (quit or left open) the course goes live with no best and the first to finish sets it. Everyone else: three tries an era, as below. Courses from before keep 18 holes and the rules below (the designer's three tries included).
- **Handicaps:** the course best goes to the lowest net (total less the handicap's share of strokes, from the player's Capra Lab profile when the try started; a 6 takes 3 off 8 holes). Bests from before count as net = total. The course page, cabinet rows, log, final card and results text show net beside the real score. The Masters Course button on the main menu is for signed-in players (guests get a note linking to `/#profile`, and coming back from signing in reopens where they were). The rules as built, in `games/par-tee-time/server/masters.js` (routes under `/par-tee-time/api/masters/`, tests in `games/par-tee-time/test/`):

- **Building (before Nov 13 2026):** pick two different courses, an order for the 18 (Alternate the two, One then the other, Easiest to hardest by the holes' measured difficulty, or Shuffle) and a name up to 24 characters. The page reads `COURSE_SETS` at run time, so new courses show up by themselves; it sends the 18 hole ids and the server checks only their shape. Up to 12 courses a player; the designer can remove one (the link then shows it retired, with no new tries).
- **Rounds:** a Masters round is one player alone (`G.mode` `'solo'`, the game's own turn, hole and scorecard machinery with one seat), holes numbered 1 to 18, an OUT/IN scorecard with the course best's row beside yours, and the course best's pace in the HUD. Practice is free, unlimited and never touches the server.
- **Tries:** a counted round is a try. Starting one uses it up; quitting from the pause menu, starting another, or leaving one open four hours burns it. The page posts the 18 hole scores at the end (if the post fails it keeps the round on the phone and posts it later). Scores are whole numbers 1 to 15 a hole.
- **The course best:** the designer sets the first best with up to three tries and can keep lowering it with the rest of them; nobody else can try until a best exists (a designer whose three tries all burn before any best gets three more). Anyone signed in with the link then gets three tries; lower total wins and a tie does not.
- **Eras:** tries are per player per era, and an era ends each time the best changes hands. Then everyone but the new holder has three fresh tries, which is how the player who was dethroned (the designer included) gets three tries to take it back. The holder doesn't try against their own best (except the designer lowering a first best).
- **Loot and trophies:** take the best and you get 💰 1 loot; use up your three tries in an era without beating it and the holder gets 💰 1 loot. Hold the best seven days straight and you earn 🏆 one trophy for that course (once per holder per era), awarded by whatever request next touches the course, including reading your cabinet. Each player's loot and trophies (course id, name, date) live in the `par-tee-time` store under `mp/<handle>`; `POST /par-tee-time/api/masters/player { handle }` reads them for the lab-wide trophy room to come. Loot and trophies are decided inside the course's compare-and-swap and credited to players idempotently, so a retry never pays twice.
- **Sending it:** the course page (`/par-tee-time/#m=<id>`, where the link lands) shows the holes, the two courses, the best, who holds it and for how long, your tries left and the last few tries by everyone, with Practice and Take a try, and the lab's results card as the challenge ("⛳ Par-Tee Time · <name>", the two courses, "Course best: <name> <total> (<to par>)", "Three tries to beat it.", the link). After a try, the final card's results text says whether you set, lowered or took the course best, or who still holds it and how many tries you have left, with a row of marks for each nine. Locally, `/par-tee-time/__clock?add=<ms>` moves the dev server's clock to reach a trophy.

## Games on the hub

| Game | Where |
| --- | --- |
| Par-Tee Time | Lab original: `/par-tee-time/` (only in Capra Lab). Against a hustler, pass and play, online with a friend on two phones (since Nov 9 2026), or a Masters Course challenge sent by text (since Nov 12 2026); rooms and courses at `/par-tee-time/api/*` |
| Don't Look! | Lab original: `/dont-look/` (only in Capra Lab). Heads Up-style: phone on the forehead, flip up for got it, down to pass (swappable in settings). Four levels (K–2, 3–5, 6–8, 9–12), 14 decks plus Mix It Up, about 100 words per deck per level (tripled Nov 12 2026, 5,700 in all) in `games/dont-look/words.js`. No server and no leaderboard on purpose; the lab name shows in the corner |
| Three Clue Crew | Lab original (live since Nov 12 2026): `/three-clue-crew/`. A game show: three one-word clues, four answers, and the host says whether you got it and why the clues connect. Four tiers (K–1, 2nd–3rd, middle school, high school), about 160 rounds each in `games/three-clue-crew/rounds.js`. Today's 10 (No. N, the same ten for everyone at a tier, dealt from the bank without repeats until it's used up) and Quick 10 practice. Clues can be read aloud (on for K–1). No server |
| Puzzled Spin | Lab original (live since Nov 12 2026): `/puzzled-spin/`. Picture puzzles: each one is a mirrored comic art piece (bold ink, halftone dots, pop colors) cut into square tiles, some turned the wrong way; tap a tile to spin it (swipe left to spin it back) until the picture is whole, and the gaps close into one piece of art. An 11-level art ladder (Two-Tone, Twin Shapes, Ripples, Triple Treat, Kaleidoscope, Star Bloom, Flower Burst, Sunburst, Pop Mandala, Grand Mandala, Masterpiece), and each run of five pictures climbs it: K–1 from a 2×2 two-tone with one tile turned to a 3×3 kaleidoscope, up to high school's 6×6 Masterpiece. K–1 and 2nd–3rd see the goal picture and a ✓ on every tile that's right; middle and high school go by the symmetry, with a peek that costs 3 s. Today's Spin (the same five for everyone) and practice; the results are a comic page of the five pieces. Art, puzzles and rules in `games/puzzled-spin/logic.mjs`. No server |
| Goat Getaway | Lab original: `/goat-getaway/`. The daily 6×6 sliding puzzle (Mind Heist's Vault Jam until Nov 7 2026): get the goat out the gate past hay bales, apple crates and tractors. One pen a day for everyone (easy Monday, G.O.A.T. Sunday), timed by the server from opening it; the lab's top five by name, a Blue Ribbon for the day's fastest, and diamonds paid into Mind Heist for its daily card draw. Endless practice pens. 💡 Hint shows the best next move (on today's pen, +15 s each and no par diamond). Rules in `games/goat-getaway/CLAUDE.md` |
| Punchline | Lab original (live since Nov 8 2026; a JJ Brew before that): `/punchline/`. Wrong Signs (comic signs with misprints, burnt-out lights and terrible design), Ugly Ts (cursed T-shirts) and jokes (moved out of Mind Heist). Every card is a four-square: three copies of a sign read right and one is off (a burnt-out letter, a typo); tap it fast. Jokes put four punchlines in the square. A daily drop for everyone, and party rooms of up to 12 phones on any deck, with a Late Night shelf for high school. Rules in `games/punchline/CLAUDE.md` |
| Classified | Lab original (live since Nov 8 2026): `/classified/`. The sleepover game: secret missions all night (with counter-intel to burn them), anonymous Who Said It answers and Yearbook votes, then the host declassifies the file and every phone follows the reveal. Comic avatars, codenames, and a highlights-only share page. Rules in `games/classified/CLAUDE.md` |
| No Cap | Lab original (live since Nov 9 2026; a JJ Brew before that): `/no-cap/`. Three facts and one cap in a single sentence: tap the facts one by one (tap the cap and you're busted). With friends it's a topic draft (since Nov 11 2026): a pile of topic cards, snake picks in a random order, then everyone plays their cards at the rest of the room in pick order; solo runs and "beat my score" challenge links. Decks on four shelves by age (Kids, Middle School, High School, Young Adults). Rules in `games/no-cap/CLAUDE.md` |
| Screensaver | Lab original (live since Nov 9 2026; a JJ Brew before that): `/screensaver/`. A box bounces like an old screensaver, pauses, and you have 25 seconds to call the corner it hits dead on. Boards grow and the box shrinks; later boards are rooms joined at their corners. Boards roll on by themselves; End Run banks your points. A daily run (the same boards for everyone, three misses and out) with a board, plus practice. Rules in `games/screensaver/CLAUDE.md` |
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

Netlify deploys automatically from `main`. Storage is Netlify Blobs: `capra-lab-profiles` for identities, `primal-survival` for that game's seasons, runs and careers, `swerve-scores` for Swerve Planet's boards, `mind-heist-daily` for Mind Heist (profiles, friends, rooms, challenges, and the diamonds Goat Getaway pays in), `goat-getaway` for Goat Getaway's days, ribbons and race boards, `punchline` for Punchline's party rooms, `classified` for Classified's operations and share files, `no-cap` for No Cap's rooms and challenges, `screensaver` for Screensaver's daily boards, `par-tee-time` for Par-Tee Time's online rooms and Masters courses, loot and trophies, `capra-lab-cards` for the daily Card Draw (each player's hand), `capra-lab-wallet` for the wallet (diamonds, amber, shards, the avatar shop's items and the look), `capra-lab-handoff` for invites waiting to move from Safari to the Home Screen app (5 minutes each).
