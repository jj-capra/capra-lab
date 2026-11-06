# Capra Lab

The hub for JC's games: an iPhone-friendly page with a tile per game, one player profile that works across every game in the lab, and the games that live inside it.

## What's here

```
public/                      the site Netlify serves
  index.html                 the hub page
  lab/hub.js                 profile walkthrough, sign-in, "Playing as" chip
  lab/keycard.js             the key card picture (key printed on it and hidden inside it)
  assets/, icons, manifest   logo, home-screen icon, full-screen app support
  primal-survival/           built from games/primal-survival/ (not committed)
  par-tee-time/              built from games/par-tee-time/ (not committed)
  swerve-planet/             built from games/swerve-planet/ (not committed)
lab/                         lab-wide server code
  profiles.js                one name + six-digit key per player, for every game
  stores.js                  Netlify Blobs / memory / file storage
  test/profiles.test.mjs
games/primal-survival/       Primal Survival's source: client, shared engine, server, tests
games/par-tee-time/          Par-Tee Time: one self-contained page
games/swerve-planet/         Swerve Planet: the page, its icon and its leaderboard tests
netlify/functions/
  profile.mjs                /api/profile/*                lab profiles
  primal-survival.mjs        /primal-survival/api/*        Primal Survival's API
  swerve-planet.mjs          /swerve-planet/api/scores     Swerve Planet's leaderboards (path set in the file)
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

The signed-in player is kept in the browser under `capra-lab.profile`, which every game in the lab reads. On iPhone, a home-screen app keeps its own storage separate from Safari, so the first time someone opens Capra Lab from the home screen they sign in once with their key picture.

**Adding a game to the profile:** server side, call `profiles.verify(name, code)` from `lab/profiles.js` and keep the game's own stats under its own store, keyed by the profile's handle. Client side, read the player from `localStorage['capra-lab.profile']` (`{ name, handle, code }`).

Par-Tee Time was first built to run inside Claude. On Capra Lab its NPCs use their scripted trash talk (the Claude-powered replies only exist inside Claude) and the online-with-a-friend mode is hidden, since its rooms need Claude too. Hustler and pass-and-play work fully.

## Games on the hub

| Game | Where |
| --- | --- |
| Par-Tee Time | Lab original: `/par-tee-time/` (only in Capra Lab) |
| Primal Survival | Native: `/primal-survival/`, uses Capra Lab profiles |
| Mind Heist | https://mind-heist.netlify.app/ |
| Glacial Maw | https://glacialmaw.netlify.app/ |
| Swerve Planet | Native: `/swerve-planet/`, leaderboard at `/swerve-planet/api/scores`; signed-in players post under their lab name |

## Adding a game tile

Copy one of the `<a class="tile">` blocks in `public/index.html`, then change the link, the `--tile` color, the icon, the name and the tagline. Update the count in the `PICK AN EXPERIMENT` row.

## Making a game native

Put its source in `games/<game>/`, add a step to `scripts/build.mjs` that copies it into `public/<game>/`, add its API as `netlify/functions/<game>.mjs` with one redirect in `netlify.toml`, and point its tile at `/<game>/`.

## Testing and deploying

```
npm install
npm test                                  lab profiles + Primal Survival engine and API
npm run build && node scripts/dev-server.mjs    the lab at http://localhost:8790
```

Netlify deploys automatically from `main`. Storage is Netlify Blobs: `capra-lab-profiles` for identities, `primal-survival` for that game's seasons, runs and careers, `swerve-scores` for Swerve Planet's boards.
