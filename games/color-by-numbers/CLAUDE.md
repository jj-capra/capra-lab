# Color by Numbers

Tap a color, fill every spot with its number. Native in Capra Lab at **capra-lab.netlify.app/color-by-numbers/**
(JC, Nov 21 2026: "Create a Color by numbers game in Capra Lab, this will be for my 1st grade daughter all the way
up to adults. have fun cuddly characters to color in for my 1st grade daughter. I think a healthy library of 100
images would be a good start. unicorns, dolls, puppys, other cuddly animals and scenes would be fun."). Public
(not a JJ Brew). No server.

## Rules

- **One picture, four levels.** Every picture works at every level; the level decides how it's cut (`LEVELS` in `logic.mjs`):
  - **Crayon** (K–1st): the big shapes, up to 8 colors, big numbers, tiny bits colored already.
  - **Marker** (2nd–4th): plus the details (stripes, spots, hooves, the rainbow's in-between bands), up to 12 colors.
  - **Paintbrush** (5th–8th): plus shading on every friend, and the background cut into glass shards in two tones, 16 colors.
  - **Stained Glass** (teens & grown-ups): everything big cut into glass shards lit from the top left (light, middle, dark of each color), up to 28 colors and 330–415 spots.

  Crayon averages about 15 spots a picture, Marker 26, Paintbrush 110, Stained Glass 365. Too small to tap at a level means colored already (or, for a sliver of glass, joined to the piece beside it). The palette is squeezed to the level's count by merging the closest colors by eye, never a background color into a character's (the unicorn stays white).
- **The pictures are drawn, not files.** `library.mjs` lists the 100 (11 kinds: Unicorns, Puppies, Kittens, Bunnies, Bears & Pals, Dolls, Farm, Wild Ones, Ocean, Treats & Fun, Dragons & Bugs), each a scene plus characters from the kit:
  - `art-kit.mjs`: the shape helpers (`Pic`) and the shared cute face (eyes, cheeks, smiles).
  - `art-critters.mjs`: one chibi body (big round head, little sitting body) dressed as 30 species (`SPECIES`: ears, face, markings, tail), sitting or as a portrait.
  - `art-friends.mjs`: owl, penguin, chick, duck, fish, whale and narwhal, octopus, turtle, crab, seal, frog, dino and dragon, butterfly, bee, ladybug, snail, and the dolls (hair styles, outfits, skin tones).
  - `art-props.mjs`: things to hold and wear.
  - `art-scenes.mjs`: the places and the big standalone things (castle, hot air balloon, rocket, mushroom house…).

  A part is a closed path with its finished color and the first level that colors it (`t`); `keep` means draw it already below that level, `bg` marks the background. Our own characters only: no known characters, brands or anyone's art.
- **Adding a picture**: add a line to `PICS` in `library.mjs` (a scene plus `sit`/`face`/`girl`/`pal`/`big`), run the tests, then look at it at all four levels in a browser (the region map needs a canvas, so `npm test` can't). Before shipping a change to the art, check every picture at every level builds with every spot numbered on itself (a page that runs `buildPuzzle` on all 400 does it in a few seconds).
- **How a picture becomes spots** (`buildPuzzle`): the page draws the level's parts into a 400×400 region map (`partMap` in `render.mjs`), then each visible piece of a part is a spot (cut by Voronoi cells for glass), split islands share one spot with a number in each piece, slivers join a neighbor, tiny ones are colored already, and each number sits at the spot's widest point (a chamfer distance map).
- **Playing**: tap a color (its spots turn gray), tap or slide a finger across spots to fill them; a wrong spot just wiggles its color (counted as a slip, no penalty); a finished color moves on to the next. 🔍 finds a spot of the chosen color (zooming in if it's small). Pinch, drag and the mouse wheel zoom and pan (up to 2.5× at Crayon, 12× at Stained Glass); the outlines grow slower than the zoom.
- **Saved per player**: `localStorage['cbn.prog.<handle>']` keyed `id@level` (the spots as their number points, so saves survive small changes to the cutting), plus a small picture of each started one for the gallery (`cbn.thumbs.<handle>`, the 60 most recent). Guests save as `guest`.
- **Finishing**: confetti and a cheer, then the framed picture, **Save my picture** (a PNG with its name and who colored it, shared from a phone or downloaded), Next picture, Color it again (two taps), and the lab's results text: `🎨 Color by Numbers · <picture>`, the level, spots, colors and time, and a square per color (🟩 no slips, 🟨 a slip or two).
- **Pay** (`color-by-numbers` in the wallet catalog): +20 amber a finished picture, +1 shard at Paintbrush or Stained Glass (each picture and level once a day, under the lab's day cap).
- **Speed**: a fill redraws only the patch around its spot; glass parts clip once and fill their pieces as plain polygons; while fingers move the last frame is stretched and the full picture comes back when they stop.

## Files

- `index.html`: the page (gallery, painting, results, help) with the lab's status-bar, fill and sideways rules.
- `game.js`: the screens, the canvas view, tapping and sliding, saving, results.
- `logic.mjs`: levels, glass cells, distance map, palettes, `buildPuzzle`, saving spots (pure, tested).
- `render.mjs`: drawing parts, the region map, a puzzle as it stands.
- `library.mjs`, `art-*.mjs`: the pictures.
- `test/color-by-numbers.test.mjs`: the library, the levels, a puzzle from a made-up region map, palettes, saves.
