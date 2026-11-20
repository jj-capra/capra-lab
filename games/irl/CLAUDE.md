# IRL

Real moves in front of the phone's camera, native in Capra Lab at **capra-lab.netlify.app/irl/**
(JC, Nov 14 2026: "an IRL game that has different challenges like dribbling a basketball and
reaching out and touching targets that appear. Can my iPhone or iPad camera do this? I am thinking,
pushups. Wall sits. Squats etc. this earns more Amber and other loot"; on-device pose tracking in
the browser was the plan he okayed).

## Rules

- **Scenes** (JC, Nov 15 2026: "I want an animation as the main view that syncs to my movement. Much like
  how NEX Playground displays an animation with a camera view of the players on the upper or bottom
  corner. I want bowling and QB throw etc."; his picks: every challenge gets a scene, plus basketball
  free throws and a tennis rally). The main view is a comic scene (`scene.js`); the camera picture sits
  in a small box in the corner (`#pip`: bottom left, raised above the coach line upright; bottom middle
  for two) with the stick figure the tracker sees. The sports games are worlds of their own seen
  through a little 3D camera (`cam3`), what you hold (ball, football, racket) drawn in front following
  your hand. The other challenges keep their play area (the camera picture's shape, where targets,
  shots and silos already live) with a backdrop around it (gym, brick wall, court, carnival, stadium,
  kitchen, farm) and the player as a **puppet**: their lab avatar's head on a comic body whose joints
  are their joints (`drawPuppet`); Dribble Drill draws a ball bouncing from the hand. The phone owner's
  puppet is always their own saved look (JC, Nov 15 2026: "My profile should be my IRL character"; a
  failed request used to leave him in the free look, a girl with braids, all visit): the Capra Lab
  button's wallet this visit or the last look this phone saw (`irl.look`) shows at once, then
  `/api/wallet/looks` settles it (`loadMyLook`); a failed request is asked again (2, 5, 15, 30 s, when a
  challenge opens, when the page comes back) with a plain head meanwhile. Only the wallet saying no look
  is saved gives the free look from the handle. The other player of two gets the lab look of the name
  typed for them when it's a lab player's (`guestLook`), else a free look from that name. The
  camera sheet's "Animated scene" switch puts the camera back full screen for those (`prefs.scene`);
  the sports always play in their scene.
- **The 3D places** (JC, Nov 19 2026: "Bring the glacial max level of detail to the 3d rendering of IRL. I want
  more vivid scenery and lighting with workouts in the pouring rain on a wheat field", then "A peaceful snow fall,
  a zen studio. Make it fun but immersive", "*separate scenes"). The workouts (`WORLD_KINDS`: the Full Body
  Workout, Squats, Push-ups, Wall Sit) play in a real 3D place instead of the comic gym, picked in the setup
  (`prefs.place`, the WHERE YOU WORK OUT row) and drawn with three.js (r186, the family Glacial Maw uses) from
  `world/`, bundled by `scripts/build.mjs` (esbuild) into `public/irl/world.js` and imported only when a place is
  up. Four places, each its own world, everything made from geometry, canvas textures and shaders (nothing to
  download):
  - **Wheat Field** (`world/field.js`): golden hour, the sun low behind you, gusts rolling waves through thousands
    of painted wheat clumps (`gust` in the shaders), a dirt track with tire ruts, red barn and silo, a windmill,
    hay bales, a scarecrow, a red tractor, power poles to the hills, poppies, birds, butterflies, pollen. Rep:
    chaff and dust at your feet; every tenth: a flock bursts out of the wheat on a gust; a new move: a gust and a
    birdsong.
  - **Rainy Rooftop** (`world/rooftop.js`): a city roof at night in pouring rain: neon (GYM on the stair hut,
    CAPRA across the street, a NO PAIN NO GAIN billboard), a water tower, string lights, steam from the vents, a
    skyline whose windows are worked out in the shader, curtains of rain, lightning (forked bolts, the flash, the
    puppet's shadow jumping, thunder after it by the distance). The wet roof mirrors the lights in streaks and the
    puppet, the puddles ring with drops. Rep: a splash; every tenth: lightning close by with a crack of thunder; a
    new move: the neon blacks out a moment and thunder rolls far off.
  - **Snowfall** (`world/snow.js`): a clearing in a snowy pine forest at night, the northern lights over the
    mountains through a gap in the trees, the moon, stars, a log cabin glowing with chimney smoke, lanterns, a
    snowman with a red scarf and his sled, a frozen pond, glints in the snow, soft flakes and big blurry ones
    close up, your breath puffing every few seconds. Rep: snow kicked up; every tenth: a shooting star, a whirl
    of flakes and the snowman waves; a new move: the northern lights flare.
  - **Zen Studio** (`world/zen.js`): a polished wooden studio at golden hour, shoji open onto a garden: shafts of
    sun with dust in them, the doorway and lanterns mirrored in the floor, raked gravel circling mossy rocks, a koi
    pond, a cherry tree shedding petals that drift in, swaying bamboo, a stone lantern, a deer-scarer that tips and
    clacks, mountains and a pagoda in the haze; inside a gong, paper lanterns, a bonsai, incense, a scroll. Rep:
    petals swirl; every tenth: the gong rings (it swings and shimmers); a new move: a koi jumps.
  - **Tour all four** (the workout only): a new place every move, switched during the rest (`TOUR`, a pop names
    it).
  How it fits the page: the camera is fixed and set up so the puppet's card (`world/index.js`: a cutout standing
  where the player stands) covers exactly the camera picture's rectangle on screen, so what the page draws over
  it (the arrows, cones and rest card on `#overlay`) lines up. The camera sees about 72° corner to corner of the
  picture, as a phone does (the player stands about 2 m off upright, 3 m sideways); the floor line follows the
  lowest foot of the last 1.2 s, so a jump doesn't lift the floor. The puppets are drawn by `drawPuppet` (`bare`:
  no 2D shadow) onto `pupCv` (the camera picture's size, 1.25× at most) each tracker frame; the place lights the
  card (a tint and rim lights on its edges), it casts a real shadow, wet and polished floors mirror it
  (`pupRefl`), rain and snow fall in front of it. `#world3d` sits under `#overlay`; `syncWorld()` wakes the place,
  `sleepWorld()` puts it away (results, home, another challenge, the scene switched off: the canvas shrinks to
  nothing, the sounds stop). Its own loop draws at most 30 frames a second. Level 1 (eased off) draws at 24, 1×,
  smaller shadows and fewer particles (`quality`); level 2 (light mode, `prefs.lite`) and phones without WebGL 2
  keep the comic gym (`drawBackdrop`). Each place has quiet sounds of its own once the challenge starts (wind in
  the wheat and birdsong, rain and a city hum, a winter wind, wind chimes), under the voice; off with the sound.
  Test hooks: `window.__irl.world()` (fits, live, place, draw calls) and `window.__irl.pulse(kind)`.
- **The sports games** (`sports.mjs`; `sport: true` in `CHALLENGES`), first on the home screen:
  - **Bowling** (five frames, goal 70 pins, real scoring with the last frame's bonus balls; untimed,
    the HUD hidden for the scoresheet in the scene): a hand dropping to the hip then coming up fast past
    the waist rolls the ball, its speed from how fast the hand rises (`BOWL`), where you stand in your
    part of the screen is where it leaves the foul line (the arrow on the lane), the hand's sideways
    flick hooks it. The pins are a top-down physics world (`bowlSim`, meters, circles that knock each
    other over, kickbacks, the pit), tuned so the pocket strikes often; the second ball sees only the
    pins left standing.
  - **QB Throw** (60 s, goal 120 yards): three receivers (slant, out, go) each covered by a defender who
    loses a step at his own moment (`ROUTES` open windows: slant first, go last). Ball up over your
    head (a hand above the nose) and the target follows the hand's offset from your nose, locking onto
    the receiver you point at; the throw is that hand coming down fast. Power must reach the route
    (`need`: a deep go needs a hard throw); open = caught for yards (plus run after the catch), covered
    can be picked; a catch near the end zone is a touchdown (+10). Sacked after 4.4 s (−3).
  - **Free Throws** (45 s, goal 12 makes): the hands coming up from below the chin to over the head
    fast is the shot; its speed against `HOOPS.sweet` is the depth (short, long), the hands' offset from
    the nose the aim (wide); close enough swishes, nearly goes in off the rim or rims out.
  - **Send It!** (JC, Nov 15 2026: "Put Send It in IRL and make it a flight path game where they move from
    side to side ... to stay up longer and hit updraft paths"; one flight, untimed, goal 1500 feet):
    Send It!'s contraptions (`CRAFTS` and the rear-view drawings `rear.mjs`, imported from
    `../send-it/`, the same path in the repo and in `public/`; picked in the setup, the right player of
    two gets the next one) off the same pier. Flap your arms for three seconds to push off (each flap
    is more launch speed, `FLY.perPump`), then step side to side to steer (your place in your part of
    the screen is your place across the water; tipping your arms banks it). It sinks all the way, a
    little faster the farther out it gets (`FLY.grow`); green updrafts lift it (`FLY.lift`), coming in
    paths that snake across the water so one leads to the next; red downdrafts shove it down; arms out
    wide like wings sinks slower (`FLY.wing`). Feet from the pier at the splash is the score, with
    titles (`FLY_TITLES`: Belly Flop to SENT IT! at 2500). Two players fly the same sky (one seed a
    game). The clock box shows how high you are; a gauge down the side too. Chase camera behind the
    contraption, buoys every 100 feet. The phone-tilt Send It! (`games/send-it/`) stays its own game.
  - **Tennis Rally** (60 s, goal 30 points): balls to your forehand or backhand; a sideways swing of the
    hands within 230 ms of it reaching you returns it (+1), early goes cross-court, late down the line;
    a hard one into a corner can be a winner (+5); too soft is into the net, no swing a miss.
- **Full Body Workout** (JC, Nov 15 2026: "a workout that is a full body workout with standing knee crunches
  and other exercises to strengthen the core and build speed and agility"; `workout.mjs`, `workout: true` in
  `CHALLENGES`, right after the sports on the home screen; goal 150 reps, paid from 40). A circuit of eight
  standing moves (`WORKOUT.plan`), each on its own clock with a 10 s rest between (5 s to get ready before
  the first): Jumping Jacks 30 s, Standing Knee Crunches 40 s, High Knees 30 s, Squats 40 s, Cross Crunches
  40 s, Skater Hops 30 s, Reaction Drill 40 s, Burpees 30 s (about 6 minutes, `workoutSecs`). The score is
  every rep added up. How each counts (picture points, in picture heights both ways, `bodyOf`):
  - jacks: hands over the head with the feet wider than 1.2 shoulder widths, after hands by the sides and
    feet back together (feet out of the picture don't hold it up);
  - knee crunches: a knee lifted 0.55 of the way to the hip (`kneeLifts`: the standing thigh is the longest
    hip-to-knee drop seen) while an elbow or hand comes within 0.75 of a torso of it; cross crunches the
    same with only the opposite arm (0.8); each knee once per lift;
  - high knees: every knee past 0.45 of the way up (and back under 0.2); the coach asks for "Faster!" under
    two a second, "Knees higher!" when they stop short;
  - squats: logic.mjs's squat counter (passed in as `squats`, so the two files don't import each other);
  - skater hops: the hips landing half a shoulder width past home on the other side; home follows where
    you've stood lately (1.2 s); two cones on the floor mark the spots;
  - reaction drill: a cue at a time (LEFT, RIGHT as the screen shows them, DUCK, REACH), only once you're
    back in the middle and standing; within 1.7 s (30 ms less a hit, 1.1 s at least) it's a hit, timed
    (the fastest is in the results); the wrong way or too late is a miss. Seeded: two players get the
    same cues. A big comic arrow, the word and a shrinking bar over each player; the cue is said aloud
    (one player);
  - burpees: hands below the knees (or the shoulders down most of a torso), then standing tall with a hand
    over the head.
  The move bar (`#wkBar`, between the score and the clock; under the score on the left sideways alone, a
  narrow column under the clock for two) shows the move, "2 of 8 · core" and a dot a move. A rest shows a
  card instead (REST, the seconds, what's next, how to do it and a little coach figure doing it:
  `drawDemo`, key poses in `DEMOS` in scene.js) and the corner camera hides for it. Beeps for each part's
  last three seconds, a whistle and the next move's name said at each rest. Results: reps per move and the
  fastest reaction; the share text has a square a move (`workoutRow`: 🟩 its `target`, 🟨 some, ⬛ none).
- Eight more challenges (`CHALLENGES` in `logic.mjs`): **Squats** and **Push-ups** (as many as you can in
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
- **Two players** (JC, Nov 15 2026: "bring two player to IRL!"): the 1 PLAYER / 2 PLAYERS switch on the
  home screen. Side by side in front of one camera, each with a half of the screen (a dashed line down
  the middle): the tracker looks for two bodies (`numPoses` 2, set with `setOptions`) and
  `splitPlayers` sorts them by where they stand on screen, left player cyan, right magenta. Every
  challenge but push-ups works for two (`TWO_UP`: a challenge with `setup2`; push-ups need the camera
  side-on, where one would hide the other); each player gets their own counter, kept to their half
  (targets, shots, pitches, silos and avocados), their own score box beside the clock and their own
  coach line. The countdown waits until both are framed. Names: the phone owner's lab name on their
  side (YOU), a guest name typed for the other, ⇄ swaps sides; left and right as the players face the
  screen. Results: both scores, 👑 the winner (or DEAD HEAT), and the share text has a line and a row
  each. Only the phone owner is paid and gets a best, from their own side's score. The voice counts
  reps only for one player (two at once would talk over each other).
- **The camera** (JC, Nov 15 2026: "My camera can go to .5 view zoomed out so it can see more things"):
  the camera button (top right, and the camera line in the setup) picks Front, Back, the **0.5×
  ultra-wide** when the browser is given it (a lens named "Ultra Wide", as iPhone's "Back Ultra Wide
  Camera", or a back camera whose zoom goes under 1×), and any other lenses the phone offers by their
  own names (some phones only share the wide lens that way). Kept in `irl.prefs` (`cam`). Whether
  Safari gets the ultra-wide depends on the phone and iOS; when it doesn't, the sheet says so. The
  picture always shows **mirrored**, whichever camera, because the players are the ones watching
  themselves (on the phone or on a TV); a switch in the camera sheet turns that off.
- **Sideways and on a TV** (JC, Nov 15 2026: "maximize viewport in landscape mode... so I can mirror to
  my tv and play games for family game night"): turned sideways, the camera asks for a wide 16:9
  picture (1280×720 when the camera is the main view, 960×540 when it's the corner box, 640×360 in light
  mode; upright stays 640×480; 30 frames a second at most) and restarts in the new shape if the phone turns before
  the go; the setup is a panel down the right, the score boxes sit smaller in the corners, and
  targets and silos fit around them from the side (`freeArea`). Home and results spread across in two
  columns. The home screen tells how to mirror to the TV with the back camera.
- **Going easy on the phone** (JC, Nov 15 2026: IRL froze on his son's iPhone 17, fine on his 16 Pro Max:
  "in case there is some way to lessen the tax on the phone's computing power"). The camera, the tracker
  and the scene share the phone, and a phone that heats up slows down. What keeps it light:
  - the scenes: the halftone dots are one pattern fill (they were a fill per dot, thousands a frame, the
    heaviest thing on screen); what doesn't move is painted once into a canvas and copied (`BG` for the
    backdrops, `still()` layers for the bowling alley; a canvas is shrunk to nothing when its game goes,
    so iPhone gets the memory back); the crowd is a fill a color; the avatar's SVG head is drawn onto a
    canvas once (`look.bmp`: Safari redraws an SVG picture from scratch every time it's drawn);
  - the page reads the layout at most every 400 ms (`hudLayout`), not every frame;
  - the tracker runs on fewer frames before the go (`trackGap`);
  - levels (`PERF`, kept on the phone two weeks in `irl.perf`): the page times every tracker frame
    (`govern`); when frames keep taking too long (26 ms, then 32) or the screen keeps missing its turns
    (60 ms between), it steps down: level 1 a softer canvas (1.5×) and at most 25 tracker frames a second,
    level 2 (`setLite`) 1× and 16, the smaller camera picture, no halftone dots or crowd sway. A tracker
    slow on the GPU (60 ms a frame) moves to the CPU first. The camera sheet's **Easy on the phone**
    switch (`prefs.lite`) goes straight to level 2;
  - the watchdog (`watchdog`, `rebuildTracker`): a camera picture that stops is played again (iPhone
    pauses it now and then), then the camera restarted after 4 s; a tracker that throws 8 frames running,
    loses its WebGL (its own canvas, `surface()`) or answers nothing for 3 s is rebuilt on the CPU (and
    stays there on this phone); while the tracker gives nothing during play, the game carries on with the
    last pose it saw (at most ten times a second), so the scene never freezes.
- **Hands-free start**: tap Start, walk to your spot; once the camera sees what the challenge needs
  (`framing`) for 1.2 s, a 3-2-1 starts on its own. A voice counts reps (squats, push-ups; every 10
  for dribbles and wall-sit seconds), with beeps for the countdown and the last 3 seconds.
- **Pay** (`irl` in `public/lab/wallet-catalog.mjs`, its own daily cap of 300 amber and 6 shards, more
  than other games as JC asked): +40 amber a finished challenge (`set`, at least `MIN_TO_PAY`), +1
  shard for beating its goal (`goal`, once a day each), +1 shard for a new personal best (`best`).
  Bests are kept on the phone per lab handle (`irl.best.<handle>`).
- **Private**: the camera picture is read on the phone and never recorded or sent; say so on the page.
  MediaPipe's tasks-vision bundle posts usage numbers (which task ran, how fast) to Google every
  minute; `scripts/build.mjs` switches that send off in the copy the lab serves and stops the build
  if a new version moves it.
- The results text: `CapraShare.text` with 💪 IRL · <challenge>, the score line and a row of ten
  squares filled toward the goal (⚡ on a new best).

## Files

- `logic.mjs`: the challenges, the counters (`squats`, `pushups`, `wallsit`, `targets`, `dribbles`,
  `keeper`, `avocados`, `derby`),
  framing and the share row. No camera, no DOM.
- `sports.mjs`: the sports games (`bowling`, `qbThrow`, `hoops`, `tennis`, `sendIt`), the bowling physics
  and scoring (`bowlSim`, `bowlScore`, `bowlNext`), the routes, the Send It! sky (`makeAir`). No camera,
  no DOM.
- `workout.mjs`: the Full Body Workout: the moves' counters (`jacks`, `kneeCrunch`, `highKnees`, `skaters`,
  `reaction`, `burpees`), the circuit (`workout`, `WORKOUT`, `MOVES`) and its share row. No camera, no DOM.
- `scene.js`: the scenes (`drawSport`, `drawBackdrop`, `drawWorkout` with the coach figure `drawDemo`),
  the puppet (`drawPuppet`), the little 3D camera (`cam3`) and light mode (`setLite`). Draws only.
- `world/`: the workouts' 3D places (three.js): `index.js` (the renderer, the fixed camera, the puppet's card,
  the loop, quality, sleep), `core.js` (shared shaders: noise, fog, the puppet's reflection; standard materials
  with a place's own surface (`patchStandard`), the sky dome, bursts, glows, merged props, sounds), and one file a
  place (`field.js`, `rooftop.js`, `snow.js`, `zen.js`: each exports a builder answering `{ scene, key, camH,
  exposure, pup, update, pulse, ambience, quality }`). Built into `public/irl/world.js`.
- `game.js`, `index.html`: the page (home, the camera stage, results). The camera layer starts under
  the status bar (`top: env(safe-area-inset-top)`) and fills to `--lab-h`; the scene is drawn on its
  canvas (`#overlay`), the video sits in the corner box (`#pip`, letterboxed, mirrored unless switched
  off, its own canvas for the stick figure), or full screen under the canvas with the scene switched off.
- `models/pose_landmarker_lite.task`: Google's lite pose model (see `models/SOURCE.md`).
  `scripts/build.mjs` copies it, plus `@mediapipe/tasks-vision`'s `vision_bundle.mjs` and
  `wasm/vision_wasm_internal.{js,wasm}` (package.json pins the version), to `public/irl/`.
  `netlify.toml` caches them a week. The tracker loads only when a challenge opens (GPU, CPU if the
  GPU won't).

## Develop and test

```
node games/irl/test/irl.test.mjs     # the counters, fed made-up bodies (test/bodies.mjs)
node games/irl/test/sports.test.mjs  # bowling (scoring, pins, a whole game), QB, free throws, tennis, Send It!
node games/irl/test/workout.test.mjs # each workout move, the whole circuit on its clock, two players
npm run build && node scripts/dev-server.mjs
```
The page has a test mode: set `window.__irlFake = true` before it loads and feed frames with
`window.__irl.feed({ lm, world, aspect })`, or `feed({ people: [{ lm, world }, { lm, world }] })` for
two players (the camera and tracker are skipped; the fake picture is 480×640 upright, 1280×720
sideways). `window.__irl.perf()` shows the level, the timings and the tracker. Chromium's fake
camera (`--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`) checks that the real
tracker loads and runs.
