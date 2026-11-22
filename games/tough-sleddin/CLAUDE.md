# Tough Sleddin

A goat on a saucer sled down three winter worlds, native in Capra Lab at **capra-lab.netlify.app/tough-sleddin/**
(JC, Nov 22 2026: "a game like Sled Surfer game with immersive worlds a goat traverses on a saucer sled. These are
all winter scenes. The user just has left and right arrows at the bottom and try to see how far they can make it.
Just one life per scene, three scenes and once they have crashed in each scene their final score shows." Named by
JC: "Call it Tough Sleddin"). Public (not a JJ Brew). No server. Our own game: never another game's name or marks.

## Rules

- **US measures only** (JC, Nov 22 2026: "Only US measurements should be used"): the score is feet, speed mph, a flag
  every 1,000 ft. Inside, logic.mjs works in meters (`FT`, `MPH` convert; `feet(st)` is the score).
- **The run**: three worlds in order, one crash each, then the final score is all three added up. Each world: its
  name and a 3-2-1 while the camera swings from the goat's face round behind it, then the goat zooms downhill on its
  own, faster and faster (`v0` to `vMax`: about 70 mph at the start to 150-170 at the top, a minute in; JC, Nov 22
  2026: "Double the speed", so every speed is twice the first day's, the sideways push raised to match and the course
  stretched down the hill so it comes at you about as often), and the only controls are **◀ and ▶ at the bottom** (held; the arrow keys
  or A/D on a keyboard). One crash: WIPEOUT!, the goat tumbles, dizzy stars, a card with the feet and what you hit,
  then the next world.
- **The worlds** (`SCENES` in logic.mjs, drawn by scenes.js):
  - **Pinewood Run** (a sunny morning): deep snowy pines on the banks, mountains, log cabins with chimney smoke,
    diamond dust in the sun. In the way: pines, rocks, stumps; logs across the track.
  - **Lantern Village** (dusk): the main street, houses with lit windows and wreaths, lamp posts, string lights across
    the street, Christmas trees and snowmen in the yards, a church on the hill. In the way: snowmen, presents,
    Christmas trees, lamp posts; white picket fences across.
  - **Aurora Glacier** (night): the northern lights, stars, a low moon, glowing ice spires and crystal clusters,
    icebergs, igloos lit inside. In the way: ice spires, ice blocks, drifts; crevasses across; and **slippery ice**
    that mirrors the sky and slides you (little grip, little drag).
- **The course** (`makeCourse(seed, scene)`, a new seed every run): the track snakes left and right (straight for
  the first stretch, curvier after 1,200 m), narrows over 5,000 m, drops 0.2 a meter with gentle rolls; past its edge a
  snowbank rises into the tree line (past `EDGE` is a crash). Rows of obstacles every 10 m after a clear 140 m run-in,
  more often and fuller the farther you go. **Every row with something in it leaves a gap** (3.4 m clear of anything
  either side), and each gap is no farther from the last than half your sideways speed covers by then (meters spent
  flying off a ramp count a quarter: you can barely steer in the air); where the track bends hard and the gap must
  stay on it, still within 80% of full sideways speed (the test checks 36 courses). A barrier (log, fence, crevasse)
  spans the track but for a way round at one edge, with a ramp 14 m before it on the gap; free ramps turn up too;
  ramps are far enough apart that a jump always lands before the next one (a jump lasts `AIR_T`, so later, faster
  ramps are farther apart; the test checks it).
- **The sled** (`step`): arrows push sideways (`STEER`), snappy on snow, a slide on ice, a little in the air; let go
  and it settles. A ramp: up its slope, off the lip at `JUMP_V`, under a second in the air (height measured above the
  snow), clearing anything lower than you are (logs, fences, crevasses, rocks; never pines, spires or lamp posts).
  The menu's goat rides by itself (`botInput`: steer for the next gap); it usually gets kilometers.
- **The 3D** (`world.js`): three.js and IRL's world kit (`games/irl/world/core.js`: the sky dome, patched standard
  materials, bursts, glows, merged props, bulbs, signs), bundled with the game by `scripts/build.mjs` (esbuild) into
  `public/tough-sleddin/game.js`. The snow is built in 50 m chunks from 40 m behind to 340 m ahead (140 m behind
  under the menu, whose camera looks back up the hill), one new chunk a frame; each chunk has its slice of snow (the
  track's corduroy and old sled grooves worked out in the shader from each vertex's distance from the center, `aT`),
  its obstacles and ramps and ice, and its scenery as instanced meshes. Triangles must face up (the snow was once
  wound upside down and culled: what showed was the sky). The mountains are drawn in the sky dome itself (`ranges()` in
  scenes.js: a far range pale in the haze, a nearer darker one, snow caps lit on the sun's or moon's side) with a sea
  of clouds in the fog's colour below the horizon, so the far end of the snow fades into it (a ring of mountain
  geometry once showed as a striped wall with a band of sky under it, JC: "it doesn't look good"). Snow
  falls past at your speed. The goat: cream with curly horns, goggles on its head and a red scarf whose tails flap,
  sitting on a red saucer that spins under it, an ink outline; a soft shadow that shrinks as it flies; spray behind
  the saucer, a burst on landing, a big poof on a crash. The saucer lies on the snow under it, front down the hill
  and tipped up the bank (`slopeAt`; it was once tilted the wrong way and its back half sank into the snow), nose up
  off a lip and down to land. In a crash the goat and the saucer tumble and skid on the real snow (`C.height`, banks
  and rolls), never through it. The camera: behind and above, easing sideways, a wider view and farther ahead as you
  speed up, a shake on landing and crashing; in a crash it swings up and round to the open side (toward the middle,
  away from the trees) and looks down on the goat in the top half of the picture (the card covers the bottom half;
  sideways the card goes to the right). It never goes under the snow (once it did, and the goat seemed to float).
- **Filling the screen**: the stage is `var(--lab-h, 100%)` tall and the picture follows the stage's own size (a
  ResizeObserver: fill.js stretching it in the Home Screen app sends no resize event).
- **Easing off**: a phone that keeps under 40 frames a second for two seconds steps down a quality level (fewer
  pixels, half then a quarter of the snowflakes, thinner forests), kept on the phone (`tough-sleddin.q`).
- **Sounds** (made on the spot): wind rising with speed, the saucer hissing on the snow (more when carving and on ice),
  a whoop off a ramp, a thud landing, sleigh bells for GO, a goat's bleat in a crash, birdsong / village bells /
  glacier chimes now and then, a chime every 1,000 ft.
- **Bests** per player on the phone (`tough-sleddin.best.<handle>`: each world's and the total).
- **Pay** (`tough-sleddin` in the wallet catalog): +20 amber for sledding all three worlds, +1 shard for a new best
  total (1,500 ft or more).
- **The results text**: `🛷 Tough Sleddin · 3 winter worlds`, each world's feet, the total (👑 new best), and a row a
  world: a 🟩 per 1,000 ft (ten at most), ⚡ for a new best there.

## Files

- `logic.mjs`: the worlds, the course, the sled, the score, the share rows (pure, tested).
- `world.js`: the renderer, the goat, the chunks, ramps and ice, the camera, the crash.
- `scenes.js`: the three worlds (sky, light, snow, obstacle shapes, scenery, effects).
- `game.js`, `index.html`: the page (menu, HUD, arrows, cards, final score), sounds, saving bests.
- `test/tough-sleddin.test.mjs`.

Test hooks: `window.__sled.state()`, `.start()`, `.scene(i)` (straight into a world), `.skipIntro()`, `.warp(meters)`,
`.crash()`, `.next()`, `.autopilot(true)` (the menu goat's steering), `.world()` (`place()`, `stats()`).
