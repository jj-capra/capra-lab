# Send It!

A homemade flying machine off the end of a pier, flown by tilting the phone. Native in Capra Lab at
**capra-lab.netlify.app/send-it/** (JC, Nov 14 2026: "a game called Send It! The game is a vehicle or
airworthy vessel of their choice is selected and they try to get it as far as possible using their phone
motion to not stall or take on too much opposing wind or have too much drag. Make the choices funny").
JC pointed at a famous pier-jump flying contest for the feel; this is our own parody. Never use a real
event's or sponsor's name, logo or marks anywhere in the game.

## Rules

- **Contraptions** (`CRAFTS` in `logic.mjs`): G.O.A.T. Glider, Flying Bathtub, Couch Glider, Taco Wing,
  Pizza Box Biplane, Leaf-Blower Cart. Each has `lift`, `drag`, `mass`, `stall` (the angle of attack,
  degrees, where the wing gives up) and `boost` (the cart's three leaf-blower blasts). A new one needs
  its numbers there and its drawing in `DRAW` in `game.js` (nose to the right, about 90 × 60).
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
- **The screen**: the NOSE meter on the left (green, yellow near the stall, red stalled), STALL / EASY
  ON THE NOSE / HEADWIND / TAILWIND calls, buoys every 50 feet and a BEST flag at your best.
- **Scoring**: feet out from the pier's edge at the splash; titles from Belly Flop to SENT IT! (300+).
  Bests per contraption on the phone per lab handle (`sendit.best.<handle>`).
- **Pay** (`send-it` in the wallet catalog): +20 amber a flight, +1 shard for beating your best on a
  contraption (60 ft or more; a first flight on a contraption isn't a "best").
- The results text: `CapraShare.text` with 🛫 Send It! · <contraption>, the feet and title, and a row of
  🟦 a square for every 30 feet out to 300, then 🌊.

## Develop and test

```
node games/send-it/test/send-it.test.mjs     # the flight model, flown by a steady pilot
npm run build && node scripts/dev-server.mjs  # then /send-it/
```
`window.__sendit` drives the page in tests: `tilt(degrees)` fakes the phone's tilt, `state()` is the run.
