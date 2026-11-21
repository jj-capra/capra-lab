# Studio

Sing in the universe, native in Capra Lab at **capra-lab.netlify.app/studio/** (JC, Nov 20 2026: "a game called
studio and it uses a camera and tracks your movement to add effects. You can put your phone on a table in front
of you in selfie mode and it has a very aura filter on you as if you are in the universe and you get to pick a
chord progression on synth or piano or guitar and they are popular genre chord progressions with matching drums
in different styles and it shows the beats and when the chorus is coming and you can sing or talk in auto tune
and add effects to your voice and record a song. It is just a free playground. The only output is the songs you
save for exploring again or the recordings you capture."). Public (not a JJ Brew).

## Rules

- **A free playground.** No score, no wallet pay, no daily board, no results card. What you keep: songs you save
  (localStorage `studio.songs.<handle>`, the genre, key, tempo, instrument, beat, voice settings and look) and
  recordings (IndexedDB `capra-studio`, store `takes`, on this phone; each with a thumbnail and its song). The
  last settings are `studio.prefs`.
- **The look: Cosmic Glow** (JC, Nov 20 2026, his description: "A dreamlike celestial filter that bathes subjects
  in a soft, ethereal luminescence—like floating weightlessly through deep space. Gentle rim lighting and a subtle
  halation effect give skin, hair, and edges a warm starlight glow, while shadows shift into rich twilight indigos
  and velvety cosmic purples. Fine, floating starlight flecks, soft bokeh dust, and a delicate nebula-like color
  bloom around bright highlights ... without losing natural expressions and detail"; his tweakables: rim and edge
  glow so "you and your group separate cleanly from the background", deep space blues with violet-indigo shadows
  and champagne-gold or cyan highlights, bloom and halation, floating motes, a gentle vignette, "dreamy and
  cinematic rather than overly artificial"). In `aura.js`:
  - the grade (`grade` in the shader): shadows slide to the universe's `shadow` color, highlights to its `hi`
    (gold or cyan), blacks go velvet, the middle (faces) barely moves;
  - halation: the camera picture has mipmaps; its blurred bright parts bloom, starlit and a little
    nebula-colored, on you and just past your edges;
  - a starlight rim on your edges and a soft backlit halo around you (the person mask blurred at several sizes),
    breathing with the kick, blooming when you sing (the voice's level), wider in a chorus, colored by the
    universe's highlight leaning toward the chord's color (Look: "Glow follows the chords");
  - the air: soft bokeh discs and fine gold flecks drifting up through the frame (point sprites, `kind` 1 and
    0.25), plus stardust from hands, claps and the supernova;
  - five universes (`UNIVERSES`: Cosmic Glow, Starlight, Aurora, Supernova, Cotton Candy), each a nebula, a
    galaxy and a ringed planet (drawn at half size every third frame) and a grade;
  - **Aura** (Look): Cosmic Glow (the default) or Aura Field (color rippling out along your outline with flames
    licking up: the bolder one);
  - **Behind you** (Look): Deep space (you're cut out of the picture) or My room, starlit (the room stays,
    dimmed to twilight, stars in its shadows).
- **The camera and the tracker.** Front camera by default (Look: Front, Back, Off), mirrored for the front. IRL's
  pose model and runtime (`/irl/vendor/vision_bundle.mjs`, `/irl/vendor/wasm`, `/irl/models/pose_landmarker_lite.task`,
  so `buildIrl` must run first) with `outputSegmentationMasks: true` and `numPoses: 4`: everyone in the picture
  gets cut out (their masks put together) and glows. The tracker gets a copy of the picture 320 across and runs
  as often as the phone can spare (its own time ×2.2, 40 ms at least); while someone is in it, the picture moves
  with the tracker's frames so the cut-out always fits. Nobody in the picture for 1.5 s (or no tracker yet): the
  whole room through the filter (handy for setting the phone up). No camera: an orb of light stands in.
- **Moves** (`moves.mjs`, a reader per person, people sorted left to right): every hand trails stardust (Look:
  Stardust hands); a clap (hands meeting fast) throws a starburst and a shockwave and, with "Moves make sounds",
  a clap on the next sixteenth; both hands up over the head for 0.2 s is a supernova (the sky flares, a burst of
  white stars) and a cymbal swelling into the next bar's crash. The nearest head steers the stars' parallax.
- **The band** (`music.mjs` the theory and arrangement, `band.js` the sound). 14 genres (`GENRES`, `GENRE_ORDER`),
  each with its famous progression in the chorus (Pop I–V–vi–IV, Sad Pop vi–IV–I–V, Trap i–♭VI–♭III–♭VII, R&B
  IVmaj7–iii7–ii7–Imaj7, EDM vi–IV–I–V, Lo-Fi ii7–V7–Imaj7–vi7, Boom Bap, Rock I–♭VII–IV–I, Country, Reggaeton,
  Anime's Royal Road IVmaj7–V7–iii7–vi, 12-bar Blues, Flamenco's Andalusian i–♭VII–♭VI–V, Doo-Wop I–vi–IV–V in
  12/8), its own verse, pre-chorus and bridge chords, two or three matching grooves (`BEATS`, plus No drums), and
  a sound per instrument (`tone`: piano grand or electric; synth saw, supersaw, bell or warm pad; guitar acoustic,
  clean, nylon or overdrive with power chords). Key (12) and tempo (±30%) are yours. Everything is synthesized
  (drums in five kits, Karplus-Strong guitar strings strummed string by string, 808 with glides, vinyl crackle on
  Lo-Fi); nothing downloads. The scheduler looks 0.3 s ahead a beat at a time, so changes land on the next beat;
  a note that slipped by while the page was busy still plays if it's under 60 ms late.
- **The song** (`FORM`): Intro 4, Verse 8, Pre-Chorus 4, Chorus 8, Verse 8, Pre 4, Chorus 8, Bridge 8, Chorus 8,
  Outro 4 (the blues: Intro 4, then twelve-bar Verse, Chorus, Verse, Chorus, Outro 4). The intro opens a filter,
  verses are lighter, the bar before a chorus rolls the snare up with a riser, the chorus lands with a crash, an
  arpeggio and bigger chords, the bridge drops back, the outro closes the filter and ends on one big hit. EDM
  builds over its whole pre ("Build") and goes silent for the beat before the "Drop"; Trap and Boom Bap call the
  chorus the "Hook". Keep going (Song sheet): no ending, round to the second verse after the last chorus. Tap a
  part on the timeline to jump there at the next bar.
- **The beat bar**: the parts as a timeline with a playhead, the part and bar, four beat dots (the one in
  yellow), the chord now and the next, "CHORUS IN 4 BARS" (or DROP, or HOOK) from four bars out, then a big hollow
  4·3·2·1 over the last bar and the word as it lands (with a hyperspace stretch of the stars). Synced to what's
  heard (the audio clock less the output latency).
- **The voice** (`voice.js`, `tune-worklet.js`): the mic through the auto-tune (an AudioWorklet: YIN pitch at
  12 kHz every 12 ms, PSOLA grains at the voice's own pitch so it keeps its sound; Hard snaps at once, Natural
  eases over 70 ms and leaves a quarter of the singer's pitch, Off). The notes it may land on: the chord's own
  plus the key's that are a whole step clear of them (`tuneSet`), so it always sounds right. Harmony: Solo, Duet
  (a third above, left), Choir (and a fifth, right), on the chord's notes. Voice: Natural, Chipmunk (an octave up,
  formants up), Deep (down a fifth, formants down), Robot (hard snap to the chord's notes and a ring modulator).
  Effects: Space (a long reverb), Echo (dotted eighths in time), Radio. Headphones in: no echo-cancelling, you
  hear yourself fully; otherwise the mic echo-cancels the phone's own speaker and "Hear myself" is quieter. iPhone
  gets `navigator.audioSession.type` 'play-and-record' while the mic is on ('playback' otherwise, so the ring
  switch doesn't mute the band). The pitch pill shows the note you sing and where it's going.
- **Recording**: ⏺ when stopped counts you in for two bars (GET IN PLACE, then 4·3·2·1; the clicks go to the
  speaker, never the recording) and records the song from the top; while playing it records from there. It stops
  at the song's end, on ⏺, on leaving, or when the page hides. Video (the sky canvas composited 720×1280 or
  1280×720 with a title card and a small STUDIO · CAPRA LAB mark, 30 fps, mp4 on iPhone, webm elsewhere) or Audio
  only (Look). The band reaches the recording delayed by what the voice takes to come back (`estimateLatency`), so
  they line up. After a take: watch it, rename it, Share (the share sheet: Messages, Save Video to Photos),
  Save to phone, Open its song, Delete (tap twice).
- **Layout**: the universe is one fixed canvas behind everything (home too). Upright the dock is one row at the
  bottom; sideways the controls stand down the two edges (Song, Voice, Look, Top on the left; Play and Record on
  the right) so the middle is all you for the TV, and the sheets are a panel on the right. Home spreads into two
  columns sideways. Everything starts under the status bar; the dock and sheets take `--lab-gap` off.
- **Private**: the camera and mic are read on the phone; nothing is uploaded; say so on the page.

## Files

- `music.mjs`: keys, chords (numerals, names, voicings, the auto-tune's notes), `BEATS`, `GENRES`, the form,
  `barEvents(song, bar)` (everything that plays in a bar: d drum, c chord, b bass, a arpeggio, f effect),
  `songInfo` (what the beat bar shows). No audio, no DOM.
- `band.js`: the Web Audio band (`Band`: `setSong`, `play(bar, { countIn })`, `stop`, `cue`, `position(now)`,
  `since(kinds, now)` for the visuals, `moveClap`, `moveSwell`), `makeIR`.
- `tune-worklet.js`: the auto-tune processor (`studio-tune`). `voice.js`: the voice's chain (`Voice`).
- `moves.mjs`: claps, hands up, hands with speed. No camera, no DOM.
- `aura.js`: the WebGL 2 universe (`createUniverse`, `UNIVERSES`, `STYLES`, `chordColor`).
- `app.js`, `index.html`: the page. `?fake` (or `window.__studioFake`) swaps the camera for a drawn figure, its mask
  and points (for screenshots); `window.__studio` has test hooks (`state()`, `band()`, `voice()`, `move(type)`).

## Develop and test

```
node games/studio/test/studio.test.mjs   # the theory, every genre and bar, the worklet fed made-up voices, the moves
npm run build && node scripts/dev-server.mjs   # then /studio/ (and /studio/?fake)
```
To hear the mix's balance, render the band offline in a browser (an OfflineAudioContext whose `currentTime` you
step while calling `band.tick()`): every genre and instrument sits around 0.12 to 0.22 RMS, peaks near full scale
for the limiter.
