# Mind Heist

Daily trivia for coworkers. Live at https://capra-lab.netlify.app/mind-heist/ (a native Capra Lab game; the old mind-heist.netlify.app forwards there).

- **Play**: Solo (today's drop or anything in the vault) or Challenge (send a friend your exact board).
- **Host**: Invite (everyone joins at capra-lab.netlify.app/mind-heist/CODE on their phone) or Party (one shared screen).

Seven looks: Heist, Branch Office (an office-mockumentary parody), Trivia Night (a bar),
Sports Bar, Bloop TV (a pop-up music-video parody), Game Show (the 70s) and Arcade (the 80s).
Pick yours on your profile; the host picks the look everyone sees in a room.

**Joke decks**: 30 decks where the question is a joke's setup and you pick the punchline.
In a crew game every tile is a face-off: one player from each crew picks in secret, a replay
shows where the picks landed and measures the times, and the fastest right punchline wins the
money and the next pick. Nobody gets it? The punchlines go blank and they go again from
memory. Joke decks are for live games only (no solo runs). A **joke of the day** sits on the
home screen next to the daily drop.

The library also has sports decks (baseball, hockey, soccer, golf, tennis, racing, sports
movies, mascots, Washington teams), team decks for the Brewers, Packers, Lakers and LeBron
James, and Gen Z decks. Every room has an emoji rail (with every emoji in a drawer), arcade
music between reveals, and a fun fact screen after each answer that only the answerer can skip.

In invite games, phones link directly to each other so a move shows up on every screen in
about half a second, and for games with friends at their own homes the host can switch on **Open mic** so each crew
can talk privately.
Phones that can't link (some work networks block it) still play; they just update a bit slower.

**Vault Jam** is the daily puzzle: slide the carts until the jewel gets out the door. Solving it
earns diamonds, the fastest time of the day wins a trophy, and there are practice vaults for
fun. Once a day you can draw a card; spend a diamond to double your odds of a prize:
a **Mole** (slip the other crew a wrong answer) or a **Hidden 50/50** (only your crew sees it).

A new deck drops every day at midnight Pacific. Streaks, ranks, badges and friends-only
leaderboards come with a profile, which is just a name and an avatar. Your recovery key
(on your profile) brings it back on another device.

## Deploy

Push to `main` in the capra-lab repo: Netlify builds Capra Lab, Mind Heist included
(`public/mind-heist/` and the `mind-heist` function). Each deploy uses 15 of the free plan's 300
monthly credits, so test first and push once.

## Build from source

```
npm install                 # at the capra-lab root
node build.mjs              # in this folder, builds into ./public for the local server
node dev/server.mjs 8787    # then open http://localhost:8787
```
Or the whole lab: `npm run build && node scripts/dev-server.mjs` at the capra-lab root, then
http://localhost:8790/mind-heist/.

See `CLAUDE.md` for the rules, architecture and tests.
