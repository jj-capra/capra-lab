# Send It!

A homemade flying machine off the end of a pier, flown by tilting the phone. Native in Capra Lab at
**capra-lab.netlify.app/send-it/** (JC, Nov 14 2026: "a game called Send It! The game is a vehicle or
airworthy vessel of their choice is selected and they try to get it as far as possible using their phone
motion to not stall or take on too much opposing wind or have too much drag. Make the choices funny").
**Off the hub since Nov 18 2026** (JC: "Send it is in the main menu, remove it so it is just accessible
in IRL"): no tile in the hub's grid; IRL's body-flown Send It! is the way in. The page still answers at
/send-it/ for old links, and IRL imports its `logic.mjs` and `rear.mjs`, so keep both.
JC pointed at a famous pier-jump flying contest for the feel; this is our own parody. Never use a real
event's or sponsor's name, logo or marks anywhere in the game.

## Rules

- **Contraptions** (`CRAFTS` in `logic.mjs`): G.O.A.T. Glider, Flying Bathtub, Couch Glider, Taco Wing,
  Pizza Box Biplane, Leaf-Blower Cart. Each has `lift`, `drag`, `mass`, `stall` (the angle of attack,
  degrees, where the wing gives up) and `boost` (the cart's three leaf-blower blasts). A new one needs
  its numbers there, its drawing in `DRAW` in `game.js` (nose to the right, about 90 × 60) and its
  view from behind in `REAR` in `rear.mjs` (wings across, about 184 wide; IRL's flight draws it too).
- **The run-up**: a 3-2-1, then 3 seconds to tap PUSH as fast as you can (`launchSpeed(taps)`); the crew
  runs it down the 60-foot deck and off the edge, 30 feet above the water (`PIER`).
- **Flying**: the phone's tilt sets the nose: upright, pull the top toward you to climb, push it away to
  dive (front-back tilt; the side tilt when the phone is turned sideways). Level is however the phone
  was held during the run-up. A finger dragging up and down beats the tilt while it's down (computers,
  or motion turned off); arrow keys too. iPhone asks for motion permission on the TO THE PIER tap.
- **The flight model** (`createFlight`): feet and seconds, fixed 1/120 s steps. Lift and drag from the
  angle of attack against the air (the craft's speed less the wind); past `stall` lift falls away, drag
  jumps and the nose drops for 0.7 s whatever the player does. Gravity is 24 ft/s² so a good flight
  lasts 8 to 15 seconds. Steady good flying goes 220 to 270 feet; the cart with all three blasts more.
- **Wind** (`makeWind(seed)`): bands out over the water at different heights, headwind (red, pushes
  you back) and tailwind (green, carries you), drawn as boxes of moving arrows; climb or dive to dodge
  the red and ride the green. Light gusts everywhere else.
- **The view** (JC, Nov 14 2026: "The view should change from right behind the vehicle or vessel so they
  can more see everything and the phone dip down and pull back makes more sense with the flight"): a
  chase camera 48 feet behind and 8 above the contraption (`CAM` in `game.js`), pitching with 70% of
  its nose, so pulling the phone back tips the whole view up into a climb and dipping it tips the water
  up into a dive. The contraptions are drawn from behind for it (`REAR`, wings across, about 180 wide;
  `DRAW` keeps the side views for the picker). Ahead: the water rushing in, buoys both sides every 50
  feet with their distance, a BEST buoy, wind bands as red or green walls with air streaking through
  them (toward you for a headwind), the contraption's shadow on the water. On the run-up the camera is
  on the deck behind the crew, the crowd along both rails and the SEND IT! arch over the end.
- **The screen**: the NOSE meter on the left (green, yellow near the stall, red stalled), STALL / EASY
  ON THE NOSE / HEADWIND / TAILWIND calls, and the RADAR strip at the bottom: the next 230 feet from the
  side (0 to 60 feet up) with the wind bands and you, for picking the height to fly at.
- **Scoring**: feet out from the pier's edge at the splash; titles from Belly Flop to SENT IT! (300+).
  Bests per contraption on the phone per lab handle (`sendit.best.<handle>`).
- **Pay** (`send-it` in the wallet catalog): +20 amber a flight, +1 shard for beating your best on a
  contraption (60 ft or more; a first flight on a contraption isn't a "best").
- The results text: `CapraShare.text` with 🛫 Send It! · <contraption>, the feet and title, and a row of
  🟦 a square for every 30 feet out to 300, then 🌊.

## In IRL too

IRL has its own Send It! (JC, Nov 15 2026: "Put Send It in IRL and make it a flight path game where they
move from side to side ... to stay up longer and hit updraft paths"): the same contraptions off the same
pier, flown with your body (flap to push off, step side to side through updraft paths). It imports
`logic.mjs` (`CRAFTS`, `seeded`, `PIER`) and `rear.mjs` (the contraptions drawn from behind, shared with
this game's chase camera) by the relative path `../send-it/`, so keep both as plain modules with no DOM
and keep `rear.mjs` in `scripts/build.mjs`'s copy list. Its rules are in `games/irl/CLAUDE.md`.

## Develop and test

```
node games/send-it/test/send-it.test.mjs     # the flight model, flown by a steady pilot
npm run build && node scripts/dev-server.mjs  # then /send-it/
```
`window.__sendit` drives the page in tests: `tilt(degrees)` fakes the phone's tilt, `state()` is the run.
