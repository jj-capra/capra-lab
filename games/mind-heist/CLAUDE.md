# CLAUDE.md — Mind Heist

Read this before touching anything.

## What this is

A daily trivia game for coworkers, live at **capra-lab.netlify.app/mind-heist/** (native in Capra Lab). Owner: JC. Players are
his coworkers (ages ~20–65), usually on a Microsoft Teams or Zoom call, plus anyone playing
solo on their phone. Version 2 (November 2026) replaced the one-screen Mind Heist Daily from
October 2026. The old trivia rooms, Heist Adrenaline, Casino Table Bluff and the rest are gone
on purpose; do not bring any of them back unless JC asks.

## The menus (JC's layout)

- **Play** → **Solo** (the daily drop or any vault deck, on your own) or **Challenge**
  ("Beat my score": play a board, send a link, a friend plays the exact same board).
- **Host** → **Invite** (everyone joins on their own phone at capra-lab.netlify.app/mind-heist/ABCD)
  or **Party** (one shared screen, host types the names; same flow as Version 1).

## Rules of the game (JC's decisions, not up for debate)

1. The host enters players (Party) or players join with the invite link (Invite).
2. The game draws **two captains at random**. A **coin flip** decides who drafts first.
   Captains draft their crews alternately; the captain who lost the toss picks the first tile.
   **Two players** (JC, Nov 5 2026: "you don't need to select captains"): no captain draw; both
   are captains and Start goes straight to the coin flip. Nobody to draft, so the toss winner
   picks the first tile.
3. Board: **3 categories × 4 tiles**, $100–$400. One shot per tile; no steals unless Take
   mode is on (rule 7).
4. **Each crew member picks in order.** Every screen shows which crew and which member is in
   the hot seat. Mates can tap to suggest; only the picker locks in.
5. **Double** (hidden): answer right and your crew picks again.
6. **Hacker mode is on**: **one** hidden Hacker tile scrambles the question as the clock runs.
   Right pays ×2 and, in a crew game, that crew picks the **next three tiles in a row**
   (cut short by rule 6a). Wrong or no answer costs the tile's value.
   6a. **Four in a row at most** (JC, Nov 5 2026: with every option on he "got too many picks in
   a row"; with two players one crew could pick six). `MAX_STREAK` = 4 tiles picked in a row by
   one crew (`room.streak`), then the turn passes. A Hacker run is cut to fit (beat it on your
   second straight pick and two follow; the takeover says how many, `cur.runIf`), and a Double
   that can't add a pick (inside a Hacker run, or on a fourth straight pick) plays as a plain
   tile, the same as a late special. Solo runs and face-offs don't count streaks.
   - Specials only show up while they can be used: the Double needs at least 3 tiles left
     (itself included), the Hacker at least 4. Picked later, they play as plain tiles and never
     show as specials (`tile.off`, read through `spOf()`).
7. **Take mode** (host toggle in the lobby, off by default; crew games only): 6 of the 12
   tiles, two per category, are marked **Take** on the board and are never specials. Miss one
   (wrong or out of time) and the other crew's next hot-seat player gets one shot at it, with
   the missed option struck out, a fresh clock and no lifelines. A take pays the tile value;
   a missed take costs nothing. The turn then passes as usual (a Hacker run keeps going).
   Taking the shot **uses up that player's turn**: their crew's next pick goes to a crewmate
   (before Nov 5 2026 the taker also picked the next tile).
8. **50/50**: one per crew per game.
9. **Crew timeout**: one per crew. It pauses the clock for 30 seconds and **blurs the options**
   (the server withholds them) so the crew can talk it over.
10. **Host pause**: any time, plus **+10 seconds** on the clock.
11. Heat bonus: +$100 on the third straight right answer and beyond. Winning crew +$250.
    Ties go to sudden death (both captains answer at once).
12. Multiple choice only, four options, exactly one right answer.
13. **Power cards** (invite games with two crews; host switch "Power cards", **on by default**;
    `settings.cards`, always off in party and solo). Players win cards in the daily draw and
    play them from their own phone. The card leaves the hand when played; a refused play
    hands it back.
    - **Mole**: play it while the *other* crew is answering. Tap an option; their phones show
      it as an anonymous tip (the mole's own crew sees who sent it; the big screen sees
      nothing). One tip per question. If their hot seat locks the tip and it's **wrong**, the
      mole's crew takes the tile's value and every screen shows "The mole got you!" with the
      mole's name. A right tip just helps them. The mole is named either way after the lock.
    - **Hidden 50/50**: play it when your crew is answering. Two wrong options vanish on your
      crew's phones only; the other crew and the big screen still see four. Not on a take
      (a missed Take tile goes to the other crew with all four, minus the missed one). Can't
      stack with the regular 50/50. Revealed to everyone after the answer.

14. **Fun fact screen**: after an answer, the verdict shows for 3.5 s (`VERDICT_MS`), then the
    fun fact gets **its own screen** (`FactCard`). Only the player who answered the tile (on a
    take, the player who took the shot) can skip it; the host steps in only for a guest's turn
    or a player who left, and runs it in party rooms. Invite games move on by themselves after
    `FACT_MS` (9 s), so nobody can stall the game.
15. **Joke decks are face-offs** (JC, Nov 2026, "like the opening question of Family Feud").
    Deck `kind: "jokes"` (set in `deck_plan.json`): the question is a joke's setup, the options
    are punchlines. In a two-crew game every tile is a face-off between the picker and the
    other crew's next player:
    - the setup shows on its own for `DUEL_INTRO_MS` (**25 s**, JC: time to read it and think it
      over) with a "Punchlines in" reading clock, then the punchlines and the answer clock; the
      host can skip it (Host → Skip the intro);
    - both pick **in secret**; each crew sees only its own player's pick, and teammates suggest;
    - when both have locked (or the clock runs out) a **replay** plays: the picks land on an A-D
      grid like a pitch-location graphic, a measuring strip slides each time out, and a line
      drops on the winner like a first-down measurement (no league names or marks);
    - the **fastest right punchline wins** the tile's money (heat bonus applies) and **picks the
      next tile**; both players step down. No winner: the other crew picks next;
    - nobody right in round one: the replay shows the misses (not the answer), then the picks
      clear, the punchline text goes **blank** (the letters picked are out) and they go again
      from memory on a shorter clock (`DUEL_BLANK_MS`, 15 s). Nobody right again: nobody scores;
    - time paused by the host doesn't count; the host locks for guests (both players in party
      rooms) and can undo back to the start of the round;
    - joke boards have no Hacker, Doubles or Take tiles, and lifelines and power cards sit out;
    - the fun fact screen becomes a **Bonus groan** (the `fact` line is a bonus joke starting
      "Bonus: ", shown without that prefix); only the winner skips it.
    **Joke decks are live only** (JC: solo, with more time and no pressure, kills the fun): the
    server refuses solo runs and challenges on them (`JOKES_LIVE_ONLY`), the Play sheet doesn't
    list them, and the joke of the day card only offers "Host a face-off". Party rooms count as
    live. A joke game's sudden death draws from other joke decks.
16. **Joke of the day** (home card, separate from the trivia drop, host only): `jokeOfDay()` in
    `content.mjs` cycles the joke decks from Groan Up on 2026-11-04 (launch day); Turkey Talk is pinned to
    Thanksgiving, Monster Mash to Oct 31, Sweater Weather to Dec 1, 21 and 24.

## Diamonds and the daily draw (JC's decisions)

- **Vault Jam moved out** (JC, Nov 7 2026: the puzzle becomes its own native Capra Lab game, with
  a more fun theme and the same logic; the daily card draw stays in Mind Heist). It is now **Goat
  Getaway**, at capra-lab.netlify.app/goat-getaway/ (`games/goat-getaway/` in the lab repo, with
  its own CLAUDE.md). Don't bring a puzzle back into Mind Heist. Old `/jam` and `/jam/practice`
  links forward there (`main.js`).
- **Diamonds come from Goat Getaway**: +1 💎 for getting the goat out of the day's pen, +1 more at
  par. Its server adds them straight to the Mind Heist profile linked to that lab player
  (`l/<handle>` → `p/<pid>.gems`), or leaves them in `gg/<handle>` (`{ gems }`) until the player
  links a profile here. `/me/lab` and `/home` claim `gg/<handle>` with a compare-and-swap
  (`claimGoatGems` in `api.mjs`) and say how many arrived (`goatGems`; home shows a toast).
- **Daily draw** (`POST /draw`): one card a day. 1 in 4 is a prize (Mole or Hidden 50/50, even
  split); spend a diamond and it's 1 in 2. The rest are duds named per look. The hand holds 3; a
  full hand can't draw. Constants in `src/server/cards.mjs`. The home card ("Today's card") has
  the draw and a link to Goat Getaway (inside the lab only).
- **Trophies**: Vault Jam's (the day's fastest solve, Nov 2–7 2026) stay on profiles as history
  (🏆 count and shelf, shown only when there are any). Days still pending at the move
  (`jamPend`) are settled from the old race boards (`j/<date>`) the first time the player loads
  home after that day closes. Goat Getaway gives Blue Ribbons on its own page instead.

## Social layer

- Profiles have **no password**. A profile is a name + avatar, kept in the browser, with a
  recovery key (`XXXXX-XXXXX`) to restore it on another device.
- Joining an invite game makes everyone in it **friends automatically**. Taking a challenge
  makes you friends with the challenger.
- Leaderboards are **friends only**: Today (official dailies), This week, All time, Streaks.
- **Streak**: play the daily drop (Pacific time). A freeze is earned every 7 days, max 2.
- Ranks (Petty Thief → Notorious), 14 badges, a shareable emoji grid after each board.

## Looks (themes)

Seven looks, defined in `src/client/themes.js` (names, copy) and the "LOOKS" section of
`app.css` (tokens on `[data-theme="…"]`, then component overrides). The four added in Nov 2026
each live in their own file, `src/client/looks/<id>.css`, bundled after `app.css` by
`src/client/styles.css`:
- **Heist** (`heist`, default): the dark cobalt night-shift look.
- **Branch Office** (`office`): JC's "work fun" look, a parody of an office mockumentary.
  Drop ceiling, cubicle walls, memo cards, corkboard of sticky notes, folder tabs, rubber
  stamps, a documentary lower-third for the hot seat and a REC tag on the question. Keep it a
  generic office-mockumentary parody: no show names, characters, catchphrases or logos.
- **Trivia Night** (`bar`): a trendy bar. Exposed brick, Edison bulb string, neon signs for
  who's up, a chalkboard board in a wood frame, coasters for answer letters, "Last call".
- **Sports Bar** (`sports`): game night at a sports bar. A riveted scoreboard board with amber
  dot-matrix values, a shot-clock timer, a hardwood court under the question, felt pennants,
  varsity lettering; crews are Home and Away (`crews` in themes.js).
- **Bloop TV** (`popup`): a late-90s music-video channel parody. Memphis shapes, a chunky TV
  set around every screen, VHS color split on big numbers, pop-in speech bubbles (the fun
  fact is one giant bubble) and a corner channel bug.
- **Game Show** (`gameshow`): a 70s TV studio. Rust-and-orange sunburst, chasing marquee bulbs
  around the board and question (fast on right, dim on a miss), wood-grain contestant podiums,
  Shrikhand script.
- **Arcade** (`arcade`): an 80s arcade at closing time. CRT bezels with glare and scanlines
  behind the text, Press Start 2P and VT323 for signage (reading text stays Atkinson), a
  blinking 1UP/2UP HUD, a high-score leaderboard. Needs iOS 17+ for `font-size-adjust`.
No real team, league, network, show, game or company names or marks in any of them.

Rules: a profile's look (`theme` on the profile, set in Profile) paints that person's own
screens (home, solo, challenge runs). A room has `settings.theme`, defaulting to the host's
look; the host picks it in the Host sheet or lobby (`theme` action works in any phase), and
everyone in the room and on the `/tv/` view sees it. Looks never change the rules.
`setTheme()` sets `<html data-theme>`; `th()` returns the current look's copy. Fonts:
Special Elite and Permanent Marker (office), Tilt Neon and Cabin Sketch (bar), Graduate and
DotGothic16 (sports), Bungee and Baloo 2 (popup), Shrikhand and Righteous (gameshow), Press
Start 2P and VT323 (arcade), all self-hosted. `tests/look_shots.py BASE OUT LOOK` takes 21
screenshots of one look and prints the iPhone fit; `tests/faceoff.py BASE OUT LOOK` covers the
face-off screens in a look.
`tests/looks.py` screenshots every look and checks who sees which.
The Hacker always goes dark (green terminal on black) in every look, and the whole page goes
dark with it. Its rules are prefixed `[data-theme]` so they beat each look's own card, option,
timer and fact styles; keep it that way when adding a look. In Branch Office the terminal sits
inside a beige office-PC bezel. Hover styles use `.opt.can:not(.sel):hover` so a tapped answer
on a phone shows as selected, not hovered.

## Capra Lab (JC, November 2026: "one unified profile", then "native")

Mind Heist is a **native Capra Lab game**: it lives in the **jj-capra/capra-lab** repo at
`games/mind-heist/`, runs at **capra-lab.netlify.app/mind-heist/**, and deploys when `main` is
pushed (Netlify builds it; no deploy from JC's PC). Capra Lab's `scripts/build.mjs` runs this
folder's `build.mjs` with `MH_PUBLIC` = the lab's `public/mind-heist/` and `MH_FUNCTION` =
`netlify/functions/mind-heist.mjs`. Its data is the Blobs store `mind-heist-daily` in Capra Lab's
site. The old site, mind-heist.netlify.app, forwards every address to the same place here (Nov 7
2026, `dev/move-to-capra-lab/`, which also copied every record across); its own data stays there
untouched as a backup.

- **Every path is written from the site root and goes through `src/client/base.js`**: `at('/r/ABCD')`
  for the address bar and `nav`, `local(location.pathname)` to read it, `link('/ABCD')` for any link
  someone is sent (invites, challenges), `asset('icon-192.png')` for files,
  and `at('/api/...')` for the server (`api.js` does this). `index.html` writes a `<base>` (`/` or
  `/mind-heist/`) and lists its files relative to it; `app.css` fonts are `url(./fonts/...)`; the
  manifest uses `./`. **Never write a bare `'/...'` path, `location.origin + '/...'` or
  `src="/..."` in the client**: it breaks the /mind-heist/ address. (At the root, on this folder's
  own dev server, the same code runs with no prefix.)
- **Lab profiles.** A Capra Lab profile is a name and a six-digit key; the lab keeps
  `capra-lab.profile` = `{ name, handle, code }` in the browser. `lab.js` sends them to
  `POST /api/me/lab`; the function checks them against Capra Lab's own profile store in-process
  (`labCheck` in `src/netlify-entry.mjs`, using `lab/profiles.js`; on this folder's own dev server
  it asks `CAPRA_LAB_URL`'s `/api/profile/signin` instead) and links the lab handle to one Mind
  Heist profile (`l/<handle>` → `{ pid }`, and `p.lab` on the profile). After that, signing in to
  Capra Lab on any device signs in to that profile. A new lab player picks an avatar and plays
  under the lab name, or brings an old profile with its Mind Heist key (stats, friends, diamonds
  and all). A profile made on this device before signing in to the lab links itself. One Mind
  Heist profile belongs to one lab player (409 otherwise). A linked profile's name comes from the
  lab (`/me/update` ignores a new name; the avatar and look still change). Signing out of Capra
  Lab signs Mind Heist out on that device.
- **The Capra Lab button.** Inside the lab, home's top row is the lab's button (`<capra-lab-chip noname>`,
  from the lab's `/lab/chip.js`, which `main.js` loads), then the profile chip, then Mind Heist's logo on
  the right (icon only on a phone). The button sits in the same spot in every lab game; keep it first.
  `/lab/chip.js`, `/goat-getaway/` and `/#profile` are the only root paths the client writes.
- **Moved sign-ins.** The forwarding page on the old site reads that browser's `mh.auth` and
  sends it in the link after the hash (`#mh-move=`); `lab.js` takes it (if this browser isn't
  signed in already), wipes it from the address bar, and the usual lab link follows.

## Privacy (this was a real bug in Version 1)

A stranger who loads the site sees nothing about anyone else's game. Rooms are only reachable
by their code. Answer keys and unrevealed Double/Hacker tiles never leave the server before
the reveal. A rival crew never sees the other crew's suggestions. Many parties can play at
once; each room is its own blob.

## Architecture

- `src/server/` — the game server: `engine.mjs` (all rules, deterministic, time passed in),
  `api.mjs` (routes), `profiles.mjs` (ranks, badges, streaks, friends), `content.mjs` (daily
  calendar), `cards.mjs` (the daily draw's odds, and settling old Vault Jam trophies), `store.mjs`
  (Netlify Blobs or in-memory), `rng.mjs`.
- `src/netlify-entry.mjs` — the Netlify Function entry, built into Capra Lab's
  `netlify/functions/mind-heist.mjs`. It serves `/mind-heist/api/*` through its own `config.path`
  (path-configured functions run before the app fallback in Capra Lab's `netlify.toml`, so there
  is no API redirect rule; don't add one). It also checks Capra Lab keys in-process.
- `src/client/` — Preact + htm app: `main.js` (router), `home.js` (onboarding, home, menus,
  leaderboards, profile, challenge landing), `room.js` (lobby → captains → toss → draft →
  board → question → final), `vault.js` (the home card, the draw, card faces), `ui.js`,
  `sound.js` (music and effects), `arcade.js` (the synthesized band and stings),
  `emoji-data.js`, `api.js`, `app.css`, `index.html`.
- `decks/*.json` + `deck_plan.json` — content and the drop calendar (Oct 24 – Dec 31, 2026,
  then encore drops). Format: `docs/DECK_SPEC.md`.
- `assets/` — music (JC's own tracks: `menu-theme.mp3` for menus and the haul reveal, `theme.mp3` for sudden death),
  fonts (Bricolage Grotesque, Atkinson Hyperlegible), app icons. `dev/make-icons.mjs` redraws
  the icons from `assets/icon-art.mjs`.
- `build.mjs` — validates decks, bundles the function and the app. Run by Capra Lab's build it
  writes `public/mind-heist/` and `netlify/functions/mind-heist.mjs` (gitignored); run here on its
  own it writes `public/` and `netlify/functions/api.mjs` in this folder for the local dev server.
  **Never edit the built files by hand.**
- Storage: Netlify Blobs store `mind-heist-daily` in Capra Lab's site, strong consistency, compare-and-swap
  writes with retry. Keys: `p/<pid>` profiles, `k/<key>` recovery keys, `r/<CODE>` rooms,
  `c/<id>` challenges, `l/<handle>` lab links, `gg/<handle>` Goat Getaway diamonds waiting for a
  profile, `j/<date>` Vault Jam's old race boards (read only, for trophies).
- Clients poll (`GET /api/rooms/:code?v=`): about every 1.2 s in a live invite game, 2 s in a
  lobby, 8 s when the tab is hidden; solo and party only wake at timer deadlines. An unchanged
  room returns `{same:true}`.
- **Direct links** (`src/client/p2p.js`, invite games only): every tab announces itself
  (`POST /rooms/:code/peer`, kept in `room.peers`, one tab per person per kind, `play` or
  `tv`), then each pair swaps one WebRTC offer/answer through a mailbox in Blobs
  (`POST`/`GET /rooms/:code/sig`, key `sb/<CODE>/<tab>`, messages expire after 2 minutes). The
  tab with the smaller id offers; ICE is gathered before sending (no trickle). Public STUN
  only, no TURN relay, so some networks can't link. Over a link, phones only send "room
  version N exists" nudges (forwarded once, so partly linked meshes still hear) and voice;
  game state always comes from the server, so nothing secret travels phone to phone.
  A phone linked to **every** other player drops to a 4–5 s backup check plus wake-ups at
  timer deadlines; if anyone can't link, everyone keeps the 1.2 s check. The chip next to the
  room code shows links (e.g. 3/3). Measured locally: ~0.1–0.2 s from tap to other screens
  (plus the server round trip in production) versus up to ~1.7 s before.
- **Open mic** (host switch in the lobby, `settings.mic`, **off by default**; JC uses it for
  friends playing from their own homes, never needed on a Teams/Zoom work call): each
  player-to-player link carries a silent audio lane from the start. Turning
  Open mic on plugs the mic into the lanes to crewmates who also have it on (`replaceTrack`, no
  renegotiation). The other crew's lanes never get a track, and a crewmate with Open mic off
  never gets one either. Music turns off while you're on air. `tests/p2p.py` checks all of this.

## Music, sound and emoji (JC's direction, November 2026)

- **Music** (`src/client/sound.js`, `src/client/arcade.js`): menus and lobbies play JC's
  `menu-theme.mp3`; the **haul reveal** (final screen) plays it too for the winners and the big
  screen, and the **losing crew's phones go bleak**. Live play uses the **Arcade band**, a
  chiptune band synthesized in Web Audio (no files): `board` groove while picking, a tense
  filtered `ask` mix during a question, `hot` for the last 5 seconds, `drop` after a right
  answer, `bleak` after a wrong one. Sudden death plays JC's `theme.mp3`.
- **Stings**: right answer = air horns, a riser and a beat drop (bigger for a Double, the
  Hacker or a take; the band cuts out and drops back in on the boom). Wrong = record scratch
  into bleak. Losing the game = a slow, cold fall. A tile pick = laser zap.
- **Open mic on iPhone**: opening the mic makes iOS change its audio sample rate, and an
  AudioContext made before that crackles like static. The Open mic button closes the sound
  engine before the mic opens and rebuilds it after (`Sound.beforeMic()` / `afterMic()`), music
  stays off while you're on air, and a crewmate's audio only plays while they're on air.
- **Emoji row** (JC, Nov 5 2026: "a fun nuisance and can be distracting"; `EmojiRow` in
  `room.js`): **four buttons** at the bottom right of every invite game. Tap or hold any of
  them (hold keeps firing), several at once: each button has its own hold timer. The four come
  from the player's **profile** (`emo` on the profile, `emoRow()` in `src/shared/emoji.mjs`,
  defaults 🔥 😂 💀 👏), picked in **Profile → Your emoji** (`EmojiPicker` in `home.js`: tap a
  slot, then an emoji; picking one already in the row swaps them). The picker has every emoji
  up to Emoji 15.0 (`src/client/emoji-data.js`, from `unicode-emoji-json`), minus a few rude
  ones (middle finger and similar) because reactions float across a shared work screen; the
  server and the direct links reject those too.
  Reactions go phone to phone over the direct links (one small message per emoji every 0.3 s,
  relayed once). Only when this phone isn't linked to every other screen does it also send a
  batch to the server (`react` with `m` = up to four `{e, c}`, at most one batch per 1.6 s; the
  server refuses more than one per 1.5 s with a 429 that writes nothing), so spamming can't run
  up Netlify credits.

## Netlify credits (free plan: 300 a month, the site pauses when they run out)

- **Every production deploy costs 15 credits.** Test everything locally, then push once.
  Never push to check a small change.
- Netlify builds and deploys on every push to capra-lab's `main`, and each production deploy costs
  15 credits, so batch changes into one push.
- Function calls cost web-request and compute credits. Rough estimate: a 20-minute invite
  game with 10 phones is about 10,000 requests, roughly 4–5 credits, when phones can't link
  directly. With every phone linked, backup checks drop to every 4–5 s and a game costs
  noticeably less. Solo runs cost very little. Poll intervals live in `room.js`
  (`useRoomData`).
- Check usage at app.netlify.com → Team → Usage & billing.

## UI rules

- Every look keeps the comic bones: outlines, hard shadows, sticker fills. Decorative detail
  stays big (bricks, ceiling tiles, sticky notes), never fine noise. **The question is the main event**: when a question is up it takes the stage
  (`.focus` layout) and the board and crews shrink to a strip.
- Shared on video calls: big type, no fine textures, right/wrong is never color alone.
- The sound button lives bottom-left (Open mic sits above it); the emoji row is bottom-right.
  Keep those corners clear.
- No `alert`/`confirm`/`prompt`.
- **Built to an iPhone screen** (JC): at the visible Safari size of an iPhone (393 x 659 CSS px,
  iPhone 15) picking a tile, the question, the verdict and the fun fact (and the face-off
  replay) fit with no scrolling, **for the host's phone too**, in every look. On phones:
  - the bottom 74 px is a dock band (sound, mic, Lock / Skip, the emoji row) content never sits
    under. While this phone has Lock or Next up, the emoji shrink to make room (`--emo-w`), and
    fold into a 2 x 2 square with Open mic on or on a phone narrower than 371 px;
  - the top is one slim header (icon, deck, room code, Host button); players lose it while a
    question is up, the host keeps it. The host's row of buttons is hidden on phones: the
    **Host** button opens a sheet (pause, +10s, no answer, skip, undo, invite, the look, end);
    while paused it reads Resume. Desktop keeps the host bar too;
  - the hot seat is one line (the crew subtitle and the "Picking" tag are hidden);
  - **no blur on small text** (JC: "the top is blurred"): neon glows, VHS splits, LED halos and
    pixel type stay on big display text; the per-look phone fixes at the end of `app.css`
    (`html[data-theme="x"] .room ...`, which outranks the look files) keep the rest crisp.
  - **below the clock** (JC, saved to the Home Screen: "Look at the top. It is squished and
    impossible to select"): as a Home Screen app (and in iOS 26 Safari) the page runs under the
    iPhone's clock strip, where iOS blurs it and takes the taps. `#app` starts at `--safe-t`
    (`env(safe-area-inset-top)`); full-screen pieces (`.room`, `.onb`, `.veil`, `.paused`, the
    sticky rail) allow for it; anything sized to the screen uses `--vh` (the height between the
    clock and the home bar), never raw `100dvh`; the looks' header bands (ceiling tiles, string
    lights, pennants, cabinet trim) hang from `--safe-t`; Office (the one light look) paints a
    navy strip behind the white clock.
  The "IPHONE FIT" and "PHONE TOP" sections of `app.css` hold these rules. Check with
  `python3 tests/iphone_fit.py BASE OUT` after any layout or look change, and with `--home`
  (the Home Screen app: full 393 x 852 screen, real 59 px / 34 px safe areas, fails any button
  under the clock).
- **Invite pop-up** (JC): tap the room code at the top any time (or Send invite / Invite more)
  for a sheet with the big code, QR, "Text the invite" (an `sms:` link on phones), Share and
  Copy link. It pops up on its own once for a host waiting alone in a new lobby, and closes
  itself when the game starts.
- **The board as a text** (JC: "text message format, a Gen Z and millennial mashup"): the final
  screen shows the board as an emoji grid laid out like the board (a row per dollar value; solo
  🟩🟥⚡💀💎, crews 💗/💙 for who banked it, ✖️ nobody) inside a Messages-style blue bubble,
  with Text it / Share / Copy. Run it back and the other buttons sit above it.
- **Nothing hangs** (JC: the other player stayed on the final screen after Run it back): every
  API call times out (10 s GET, 15 s POST) so a stalled request on a phone can't freeze a room's
  updates. Invite rooms stay remembered after the final; home checks that room every 5 s and
  shows "They're running it back! Jump in" when the host starts a new game. After a joke game,
  Run it back offers the next joke deck first.
- **No page zoom while playing** (JC: "stop page zooming while I play this in my iPhone
  browser"): every element is `touch-action: manipulation` (fast taps on tiles, Lock or the emoji
  rail never become a double-tap zoom), the
  viewport has `maximum-scale=1` (no zoom when a text box is tapped; text boxes are 17 px or
  more anyway), text keeps its size when the phone turns, and `main.js` blocks two-finger
  pinches (Safari's gesture events and two-finger moves) while a game is on
  screen. Home and the other pages can still be pinched.

## Develop and test

In the capra-lab repo (dependencies live in its root `package.json`):
```
npm install                                     # at the capra-lab root
npm run build && node scripts/dev-server.mjs    # the whole lab, Mind Heist at http://localhost:8790/mind-heist/
                                                # (test hooks at /mind-heist/__clock, __give, __peek)
npm test                                        # every suite, Mind Heist's included
```
Or this folder on its own, at the site root:
```
node build.mjs
node --test tests/*.test.mjs                   # rules, scoring, privacy, friends, streaks, face-offs,
                                                # four in a row, takes, two players, the emoji row
node dev/server.mjs 8787                        # local site with an in-memory store
python tests/e2e.py http://localhost:8787 shots        # 4 browsers play a full invite game
python tests/e2e_modes.py http://localhost:8787 shots2 # solo, challenge, leaderboards, party
python tests/looks.py http://localhost:8787 shots3     # every look, and who sees which
python tests/p2p.py http://localhost:8787 shots4       # direct links, fallback, Open mic privacy
python tests/vault.py http://localhost:8787 shots5     # the home card, the draw, Mole and Hidden 50/50 on real screens
python tests/fun.py http://localhost:8787 shots6       # the emoji row, spam and fallback, Profile picker, music, mic rebuild
python tests/faceoff.py http://localhost:8787 shots7   # joke of the day, face-off intro, secret picks, replay, blank round
python tests/iphone_fit.py http://localhost:8787 shots8  # the host's iPhone in every look: no scrolling, text share
python tests/iphone_fit.py http://localhost:8787 shots9 --home  # the same as a Home Screen app: nothing under the clock
node dev/server.mjs 8788 --bundle               # the built function over a local Blobs server
npx netlify-cli dev --offline --dir public --functions netlify/functions --port 8899
                                                # Netlify's own emulator: routing, Blobs, function runtime
```
**At /mind-heist/:** the E2E scripts take `http://127.0.0.1:8790/mind-heist` as BASE (Capra Lab's
dev server) once their own `fetch('/api/...')` helpers get the `/mind-heist` prefix (vault.py takes it
as is). `tests/lab.test.mjs` covers the lab linking. On Nov 7 2026 e2e, e2e_modes,
vault and `iphone_fit --home` all passed there.
`GET /__clock?add=ms` on the dev server moves the server clock forward (the tests use it).
In-memory mode only: `/__give?pid=&cards=mole,hfifty&gems=` sets a hand, and `/__peek?code=`
returns the current answer so a test can stage a fooled crew. The real API has neither.
The E2E tests need `pip install playwright` and `playwright install chromium`.

## Adding decks

1. Add entries to `deck_plan.json` (id, title, shelf, scope, next free date).
2. Write the content per `docs/DECK_SPEC.md` into a new file in `decks/` (joke decks: the
   brief in `docs/JOKE_BRIEF.md`, checked per `docs/JOKE_CHECK.md`; `kind: "jokes"` in the plan
   makes them face-offs).
3. **Fact-check with a separate agent that did not write the questions** (brief:
   `docs/CHECK_SPEC.md`; past logs in `docs/checks/`). A wrong answer key in front of a room
   of coworkers is the worst failure this game has.
4. `node build.mjs` refuses to build on bad structure or duplicates.
5. Run the tests, then deploy once.

## Deploy

Push to `main` in jj-capra/capra-lab; Netlify builds and deploys Capra Lab, Mind Heist with it.
The old folder on JC's computer (`Desktop\MH\mind-heist-daily`) is retired: it no longer
deploys (its `deploy.cmd` only explains that), because a deploy from there would replace the
forwarding page on mind-heist.netlify.app.
