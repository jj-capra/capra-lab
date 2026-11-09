> **Now a native Capra Lab game.** It is served at `/primal-survival/` on capra-lab.netlify.app and deployed with the lab (see the repo README). Profiles belong to Capra Lab (`lab/profiles.js`); this game keeps only its own career stats. The Netlify and deploy notes below describe how it ran as its own site and are kept for history.

# Primal Survival

## Head to head (JC, Nov 8 2026)

"Best of five or best of three in head to head deck building and then run." From the home menu,
**Head to head**: one player starts a match (best of 3 or 5) and sends the link
(`/primal-survival/#vs=CODE`) or the four-letter code; the rival joins on their own phone. Every
round both draft five **from the same spins** (`shared/versus.js`: `spinOrder`, `respinRoll`),
picks hidden, then lock in. Once both are locked the server plays both squads through **the same
year** (`runSeason(..., { fair: true })`: the day's ground, matchups and rolls come from the round
seed and the day alone) and the **longer run takes the round**; equal days go to more duels won,
then to whoever locked in first (the same spins often give two players the same five, and the same
five live the same year). First to 2 (or 3) wins; Rematch keeps both seats. Both phones replay the
two runs side by side, day by day, from the same engine.

The match lives in this game's store as small blobs so the two players never write the same one:
`vs/<CODE>` (best of, the host's seat), `vs/<CODE>/p1` (the rival), `vs/<CODE>/r<N>/<slot>` (a locked
five), `vs/<CODE>/r<N>/res` (both runs, written once), `vs/<CODE>/next` (the rematch). A seat is a
name and a random token kept on the phone (`capra-lab.primal.vs`); signed-in players sit under
their Capra Lab name. Routes: `GET /api/vs?m=`, `POST /api/vs-new`, `vs-join`, `vs-lock`,
`vs-again`. Head-to-head runs don't touch the daily board or careers.

Draft five animals into five roles. They face another five every day for a
year. Lose one day and the run is over. Nobody has reached 365.

## Run it

```
npm install
npm run dev        # http://localhost:8787
npm test           # engine guarantees
npm run test:api   # API guarantees
npm run test:site  # plays the built game in a real browser (needs playwright)
npm run test:all   # everything, both build targets
```

Node 18+. The only dependency is `@netlify/blobs`, and only the deployed
function uses it — local development writes to a JSON file.

## Deploying to Netlify

Netlify runs this fully: static ES modules on the CDN, the API as one function,
and Netlify Blobs as the store. Nothing needs configuring beyond connecting the
repo — `netlify.toml` carries the build command, publish directory and routing.

```
npm install          # REQUIRED — see below
npm run deploy       # install, build, push live
```

**`npm install` is not optional, even though the build appears to work without
it.** The site build uses no dependencies, so on a machine where install was
never run the build succeeds, the static site deploys, and the API function is
quietly dropped because esbuild cannot resolve `@netlify/blobs`. What you get is
a site that looks perfect and answers 404 to every `/api` route, which the game
reports as "Offline" — pointing nowhere near the cause. `npm run build` now
fails with instructions rather than letting that ship.

### When the score store "is unavailable"

Intermittently, for some players and not others, on and off for hours. The cause
was `apiPromise = apiPromise || build()` in the function: a promise cached
whether it resolved or rejected. One cold-start blip was then remembered as a
failure for the life of that warm instance, so whoever kept landing on it was
locked out while everyone else was fine.

`server/once.js` now caches only a resolved promise, and blob reads and writes
retry twice before surfacing. Both are covered by tests, because the failure is
invisible in development — a local run never keeps an instance warm long enough
to notice.

Rate limiting applies only to run submissions, not to signing in or making a
profile: a household shares one address, and limiting everything meant a family
could lock itself out while getting set up.

### When /api returns 404

The site is fine and every `/api` route 404s, so the game says there is no
server. That means the function did not deploy. In order of likelihood:

```
npm install                       # the usual cause — see above
npm run check                     # does Netlify see the function at all?
```

`npm run check` lists the functions Netlify has. An empty list means the bundle
failed; the deploy output says why, in the lines under "Functions bundling".

Routing is deliberately owned by one thing: the `/api/*` rewrite in
`netlify.toml`, pointing at the function's default `/.netlify/functions/api`
address. The function does **not** declare its own `config.path`. Two systems
claiming the same route is a way to get a 404 from both.

To connect the repo instead, so pushes deploy themselves:

1. Push to GitHub.
2. Netlify → **Add new site → Import an existing project**, pick the repo.
3. Accept the detected settings. They come from `netlify.toml`:
   build `node scripts/build-site.mjs`, publish `public`, functions
   `netlify/functions`.
4. Deploy.

That is the whole process. No environment variables, no database to provision,
no persistent disk to attach — Blobs is enabled per site automatically and the
function is handed credentials by the runtime.

To preview the deployed shape locally, `npx netlify dev` serves the function and
Blobs the way production does. Plain `npm run dev` is faster for game work.

### What had to change to get here

A Netlify Function is ephemeral: no disk survives an invocation, and two
requests may land on different instances. Two things followed.

**The store became an interface.** `server/api.js` takes anything with
`get`/`set`/`list`. `server/stores.js` supplies three: a JSON file locally,
Netlify Blobs in production, memory for tests. The API module never learns
where it is running.

**Runs are one key each, not an array.** Previously a run was appended to a
season's array — fine for a single process, lossy the moment two functions
write at once, because a blob store has no transaction to make read-modify-write
safe. Each run is now its own key (`run/<seed>/<hash>`), so simultaneous
submissions are simply different keys and none can clobber another. The
leaderboard lists the prefix. There is a test that fires twelve concurrent
submissions and asserts all twelve survive.

Both hosts also share one router, so an endpoint that works locally works
deployed. The function is 60 lines of Request-to-Response translation.

## A trap worth knowing about

The browser loads `client/` and `shared/` as real ES modules. The offline build
flattens them into one file. A constant declared in one module and used in
another **without an export/import pair works perfectly bundled and throws
`X is not defined` in the browser** — and it throws at call time, so the page
loads, some of it renders, and one feature is silently dead.

That shipped once. `SHIELD` lived in `shapes.js` and `badge()` in `render.js`
used it; the draft screen came up with no animals on it and no obvious cause.
Two more were sitting behind it.

The same flattening causes the opposite failure too. Two modules may each
declare a private `const INK` quite legally; flattened into one scope that is
`Identifier 'INK' has already been declared`, a parse error that kills the
whole bundle and leaves an inert page. That also shipped once.
`npm run build:single` now refuses to emit a bundle containing duplicate
top-level declarations, and caught a second collision (`creature`, in two
drawing modules) the moment it was added.

So `scripts/check-modules.mjs` now runs as part of `npm run build`, which is
also Netlify's build command — a broken module graph fails the build instead of
deploying. `npm run test:site` then plays the whole game in a real browser,
against both the module build and the offline file, and fails on any uncaught
error. Between them, nothing in that class reaches a deploy again.

## Why it is laid out this way

The engine is the product. `shared/engine.js` is pure, seeded and isomorphic:
the same squad, seed and opponents produce the same year in a browser and in
Node, down to the individual duel. Everything else is presentation.

That is what makes online play possible. **A client never reports how it did.**
It submits five animal ids and a season seed; the server replays all 365 days
itself and writes down its own answer. There is nothing useful to tamper with —
a modified client can lie about its squad, but its squad is exactly what gets
simulated. A submission claiming `days: 365, grade: S` comes back scored at
whatever those five animals actually managed; there is a test for it.

```
shared/     constants, roster, engine, grading   — runs on both sides
client/     shapes, render, format, app          — the document only
server/     api (transport-agnostic), stores, local http server
netlify/    the function wrapper
scripts/    site build, offline single-file build
test/       engine, api, live http, ui smoke
```

## Profiles and the Field Key

A name and a six-digit key. No email, no password, no phone. The name is the
lookup and the key is the proof, so the key *is* the account — which is the
whole reason the card exists.

**The Field Key** is a 1080×1350 PNG. The key is printed on it for a person and
written into the file's own bytes for the machine, as a `tEXt` chunk. PNG is a
chain of length-type-data-CRC chunks and decoders skip types they don't know, so
the chunk rides along untouched through saving, sending and re-downloading. Drop
the card on the sign-in screen and it signs you in.

It does **not** survive re-encoding. A screenshot of the card, or anything that
recompresses it, is just a picture — which is exactly why the number is printed
on it too. The sign-in screen says so when a dropped image has no key in it.

Codes are stored as a salted SHA-256 and compared without early exit. Six digits
isn't much entropy, but a dump of the store shouldn't hand over every account.
Signing in with a wrong key and signing in to a name that doesn't exist return
the same message, so the endpoint can't be used to discover who plays.

Guests keep working: you can play, and you make today's board. You just have no
career for it to add up into.

## Ranks and the two boards

Grades in `shared/grade.js` describe one run. Ranks in `shared/ranks.js` describe
a player, and the currency is **total days survived across every run** — so a
long career of ordinary seasons and a short one of great seasons both get
somewhere, and nothing is lost by playing. Ten ranks, Drifter through Ancient.
The names are deliberately kept clear of the grade names: a *run* can be graded
Apex, a *player* is a Warden.

Two boards, both open to guests:

- **Today** — the best single run of this season
- **All time** — careers by total days survived, profiles only

A duplicate submission is recognised and does not bank twice; there's a test for
it, because it's the obvious way to inflate a career.

## Seasons and the ladder

The season seed is the UTC date, so everyone playing on a given day plays the
same year. The **ladder is frozen when the season opens**: the squads you face
were submitted yesterday, and yours becomes tomorrow's opposition. That is not
only fairness — it is what keeps verification possible. If the ladder could move
mid-run, the server could not reproduce what you played.

A day with no players carries the previous ladder forward rather than emptying
it. Below eight squads the engine falls back to procedural packs, so a cold
database plays properly on day one.

Note for testers: the season rolls at **UTC midnight**, which is 5pm Pacific.
Expect "today" to flip mid-evening.

## API

| | |
|---|---|
| `GET /api/season` | current seed, ladder depth, runs so far |
| `GET /api/ladder?seed=` | the frozen opponents, so the client animates locally |
| `POST /api/runs` | `{name, seed, squad:{apex:id,…}}` → verified days, grade, place |
| `GET /api/leaderboard?seed=&limit=` | today's board |
| `GET /api/leaderboard?scope=lifetime` | careers by total days survived |
| `POST /api/profile/create` | `{name}` → the key, returned exactly once |
| `POST /api/profile/signin` | `{name, code}` → career and rank |
| `POST /api/profile/key` | cuts a fresh key and retires the old one |
| `GET /api/profile?name=` | a public career, never the key |

The browser plays the season a day at a time so it can be watched, while the
server plays it in one call. Those two loops have to agree exactly or a player
sees one number and the board records another, so a test runs the client's loop
by hand against `runSeason` and asserts they reach the same day and spend their
rallies identically.

Submissions are deduped by a hash of squad, seed and result, so replaying the
same five costs nothing and cannot pad the board. `POST` is rate limited to 40
per hour per IP per function instance — enough to stop one tester flooding the
board, not a security boundary.

## The single file still exists

`npm run build:single` inlines the module tree into one HTML file with the
network layer stripped. It is how the game travels: email it, drop it on static
hosting, open it off a stick. It plays the procedural season offline.

## The look

Four process inks on newsprint, printed. `--ink` is black pulled toward
red-violet, the way print black sits over red; `--paper` is newsprint; and
`--blood`, `--sky`, `--flare` and `--violet` are the process colours. Halftone
screens, hard keylines, hard offset shadows, deliberate misregistration on the
display type. No gradients, no blurs, no soft shadows — a press cannot make
those, so nothing here does either. Panels sit a fraction off square, because
comic pages are not square.

The five slots each own an ink, so colour carries the role instead of
decorating it. Bulwark's cream and Sprinter's yellow are light grounds, so
those cards invert: an ink silhouette instead of a bone one, the same way a
printer would handle it.

`client/palette.js` is the single source for those values. Two modules once
declared their own `INK` and the single-file bundler, which flattens every
module into one scope, died on the duplicate — see below.

The display face (Anton) is embedded as base64 in the stylesheet rather than
fetched. The offline build has no network at all, and a webfont that silently
falls back to Arial takes the whole design with it. `npm run build` does not
regenerate it; `node scripts/embed-font.mjs` does, if the face ever changes.

## The roster

262 animals across four eras — present day, Ice Age, Cretaceous and Paleozoic.
The Paleozoic reel face is where the giant arthropods live: an eight-foot
millipede, a hawk-sized dragonfly, a sea scorpion with claws to match. Snakes,
spiders, wasps and the rest of the small and deadly sit mostly in the Swarm
slot, which scores on venom and cunning rather than mass — so an inland taipan
is genuinely draftable next to a mammoth.

50 hand-drawn silhouettes cover every body plan. They scale by real mass, so a
wolverine and a polar bear share an outline and look nothing alike.

## Balance

Every lever is in `TUNE` at the top of `shared/constants.js`: the separation
curve, the counter swing, the terrain multipliers, jitter, the two difficulty
ramps, and the two mechanics below. `node scripts/balance.mjs` plays a few
hundred seasons at three skill levels and prints the survival curve — run it
after touching any dial.

**Adaptation.** Every 20 days survived, each of your five gains a point, up to
+12. Without it the opposition ramps and you do not, which put a hard ceiling
on every run no matter how well it was drafted — the best possible squad in the
game could not pass 145 days. It is a pure function of the day number, so the
server reproduces it with no state to track.

**Rallies.** One second chance per run, and only for a day lost 2–3. A rout
still ends it, so the save rewards a close call rather than a bad squad.

Where that leaves things, over 200 seasons per group:

| | median | past 100 | past 200 | 365 |
|---|---|---|---|---|
| random five | 28 | 4% | 0% | 0% |
| drafted with care | 161 | 90% | 30% | 0% |
| best five in the game | 245 | 99% | 76% | 1% |

365 stays a genuine event — about one run in a hundred for a theoretically
perfect squad — while someone who drafts thoughtfully now gets a real season
instead of dying in week three. A test asserts that drafting well still pays,
so a tuning change that inverts skill fails the suite rather than shipping.

## Before it is public

- **Names are unauthenticated.** Anyone can submit as anyone. Fine for a
  friends-and-family test, not fine beyond it.
- Accounts, so a name on the board means something.
- Server-rendered result crests for sharing — `client/render.js` returns strings
  and touches no DOM, so it already runs in Node.
