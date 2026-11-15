# IRL

Real moves in front of the phone's camera, native in Capra Lab at **capra-lab.netlify.app/irl/**
(JC, Nov 14 2026: "an IRL game that has different challenges like dribbling a basketball and
reaching out and touching targets that appear. Can my iPhone or iPad camera do this? I am thinking,
pushups. Wall sits. Squats etc. this earns more Amber and other loot"; on-device pose tracking in
the browser was the plan he okayed).

## Rules

- Eight challenges (`CHALLENGES` in `logic.mjs`): **Squats** and **Push-ups** (as many as you can in
  60 s, goals 20 and 15), **Wall Sit** (hold up to 3:00, goal 60 s; standing up for 2 s ends it),
  **Target Smash** (45 s; one target at a time, out at arm's reach and away from your hands, gone
  after 2.6 s; hit it with a wrist or index finger; goal 25) and **Dribble Drill** (30 s; one dribble
  is the dribbling hand dropping at least a fifth of the torso and coming back up; goal 40). The
  dribble counts the hand, not the ball (no ball tracking yet).
- **Goalkeeper** (JC, Nov 14 2026: "defend a soccer goal"; 45 s, goal 12 saves): the phone is the
  shooter. Each shot is struck from right in front of the phone (big, at the bottom of the picture)
  and flies away to a spot around the player (high, low, left, right, over the head, worked out from
  where the player stands), shrinking as it goes. In the last 45% of its flight a hand, finger or
  foot on the ball is a save (a yellow ring shows it's in reach); past the player it's a goal. Shots
  get quicker. A goal frame and net are drawn around the picture.
- **Avocado Chop** (JC, Nov 14 2026: "a game that cuts flying avocados and the more slices per avocado
  as they fall the points triple for each consecutive cut"; 45 s, goal 250 points): avocados (and,
  after 6 s, the odd chili) are thrown up from the bottom and fall back. A cut is a hand swiping fast
  (0.9 picture-heights a second or more) through one, the line a wrist or finger travelled between
  frames crossing it; each hand can cut a given avocado once every 220 ms. Cuts on the same avocado
  score 1, 3, 9, 27, 81 (`CUT_POINTS`); after the fifth it's guac. A chili cut is −25 (never below
  0). A slash streak follows each hand; a cut avocado splits along the cut and every later cut adds
  a slice.
- **Silo Derby** (JC, Nov 14 2026: "a baseball game where you swing at rapid balls and you are hitting
  them into silos with different point values. Like a home run derby but more like skeeball"; 60 s,
  goal 300 points): the phone is the pitcher. Each pitch leaves from right in front of the phone and
  comes in to the player's belt, shrinking (a ring tightens on it, green when it's time), quicker as the
  game goes (changeups and heaters mixed in). A swing is the hands (wrists and fingers together) sweeping
  sideways at 1.2 picture-heights a second or more between head and knees; its moment is its fastest
  frame. Within 230 ms of the ball arriving it's contact: power is the swing speed (full at 2.8) times
  the timing (55 to 100%), and the timing aims it: early pulls the ball the way the hands went, late
  sends it the other way, the edge of the window is a foul. Power 0.6 or more reaches the back row
  (`SILOS`: 100 in the corners, 50 in the middle), softer drops into the front row (10, 20, 30, 20, 10),
  weak is a grounder. No swing, or one out of the window, is a strike (a swing more than 2.5 windows
  early doesn't count: getting set, or the hands coming back). The silos stand in the top of the picture
  (`derbyLayout` in game.js): the back row between the score and the clock, the front row just under
  them (both under them on a narrow phone). A hit cracks, flies to its silo and drops in with a
  skee-ball clunk; a bat is drawn in the hands.
- Squats: down when the 3D knee angle is under 105° or the hips drop more than half a standing thigh;
  a rep when standing back up needs every sign to agree (knees past 148° and hips back up). Push-ups:
  only in a plank (body near flat and straight), elbows under 95° then past 150°. Wall sit: knees and
  hips both between about 62° and 125°. Angles use MediaPipe's world landmarks (3D), so facing the
  phone or side-on both work; picture points are the fallback.
- **Hands-free start**: tap Start, walk to your spot; once the camera sees what the challenge needs
  (`framing`) for 1.2 s, a 3-2-1 starts on its own. A voice counts reps (squats, push-ups; every 10
  for dribbles and wall-sit seconds), with beeps for the countdown and the last 3 seconds.
- **Pay** (`irl` in `public/lab/wallet-catalog.mjs`, its own daily cap of 300 amber and 6 shards, more
  than other games as JC asked): +40 amber a finished challenge (`set`, at least `MIN_TO_PAY`), +1
  shard for beating its goal (`goal`, once a day each), +1 shard for a new personal best (`best`).
  Bests are kept on the phone per lab handle (`irl.best.<handle>`).
- **Private**: the camera picture is read on the phone and never recorded or sent; say so on the page.
- The results text: `CapraShare.text` with 💪 IRL · <challenge>, the score line and a row of ten
  squares filled toward the goal (⚡ on a new best).

## Files

- `logic.mjs`: the challenges, the counters (`squats`, `pushups`, `wallsit`, `targets`, `dribbles`,
  `keeper`, `avocados`, `derby`),
  framing and the share row. No camera, no DOM.
- `game.js`, `index.html`: the page (home, the camera stage, results). The camera layer starts under
  the status bar (`top: env(safe-area-inset-top)`) and fills to `--lab-h`; the video is letterboxed
  (`object-fit: contain`) and mirrored for the front camera, the stick figure and targets are drawn
  on a canvas over it.
- `models/pose_landmarker_lite.task`: Google's lite pose model (see `models/SOURCE.md`).
  `scripts/build.mjs` copies it, plus `@mediapipe/tasks-vision`'s `vision_bundle.mjs` and
  `wasm/vision_wasm_internal.{js,wasm}` (package.json pins the version), to `public/irl/`.
  `netlify.toml` caches them a week. The tracker loads only when a challenge opens (GPU, CPU if the
  GPU won't).

## Develop and test

```
node games/irl/test/irl.test.mjs     # the counters, fed made-up bodies (test/bodies.mjs)
npm run build && node scripts/dev-server.mjs
```
The page has a test mode: set `window.__irlFake = true` before it loads and feed frames with
`window.__irl.feed({ lm, world, aspect })` (the camera and tracker are skipped). Chromium's fake
camera (`--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`) checks that the real
tracker loads and runs.
