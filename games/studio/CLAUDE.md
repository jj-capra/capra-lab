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
- **Sing a song** (JC, Nov 20 2026: "Can they sing to a popular song just as a short clip?"; home's 🎤 Sing a song I
  know, or the Song sheet's Full song / Sing a song switch; `song.loop`). Kids sing a song they know over a loop:
  **Studio never names, plays, shows or spells out anyone's song** (no tracks, no lyrics, no melodies, no song
  titles): chord progressions belong to nobody, the singer brings the words and the tune. Keep it that way.
  - The loops (`LOOPS`, `LOOP_ORDER`): the genre's own chorus, The four chords I–V–vi–IV, Sad four, ’50s, Three
    chords, Two chords, Walk down, Royal Road, Jazzy, Twelve-bar blues; shown by name in the key ("C G Am F").
    Written in major; a minor genre plays them in its relative major (`loopSpec`), so every loop fits the key.
    Played like a chorus without the arpeggio (room for the singer), a crash and a fill every eight bars (twelve
    for the blues), no song form, no end (`barEvents(song, bar, endBar)`). The genre still picks the sound, beat and
    instrument ("THE SOUND"). The timeline is the loop's chords, so the next one is always in sight.
  - **Find my key** (`humKey`): seven seconds of humming or singing with the band quiet; every note the auto-tune's
    pitch reader hears (`voice.onPitch`) counts for its pitch class, the best of all 24 Krumhansl-Kessler key
    profiles wins, said in the genre's mode through the relative key (`keyFromNotes`); then the loop starts in it.
  - **Tap the beat** (`tapBeat`): four taps or more, the middle gap is the tempo, tried as tapped, then doubled or
    halved to fit; a sing-along's tempo range is wider (60% to 150% of the genre's, `bpmRange`).
  - **Clips** (15 s, 30 s, 1 min, `song.clip`): ⏺ when stopped counts in and records whole rounds of the chords
    (`clipBars`, the ending bar counted in), then one big last chord on the loop's home (`end`), a 1.6 s tail and
    it stops; ⏺ while playing starts at the next bar and ends on the nearest round, so the last chord lands where
    the loop would start over. The band knows the end as `band.endBar`; stopping early clears it and the loop
    plays on. The beat bar counts the clip's bars, LAST 4 BARS, a 4·3·2·1 over the last and THAT'S A WRAP.
- **The beat bar**: the parts as a timeline with a playhead, the part and bar, four beat dots (the one in
  yellow), the chord now and the next, "CHORUS IN 4 BARS" (or DROP, or HOOK) from four bars out, then a big hollow
  4·3·2·1 over the last bar and the word as it lands (with a hyperspace stretch of the stars). Synced to what's
  heard (the audio clock less the output latency).
- **The voice** (`voice.js`, `tune-worklet.js`): the mic through the auto-tune (an AudioWorklet: YIN pitch at
  12 kHz every 12 ms, PSOLA grains at the voice's own pitch so it keeps its sound; Hard snaps at once, Natural
  eases over 70 ms and leaves a quarter of the singer's pitch, Off; it adds 23 ms). The notes it may land on: the chord's own
  plus the key's that are a whole step clear of them (`tuneSet`), so it always sounds right. Harmony: Solo, Duet
  (a third above, left), Choir (and a fifth, right), on the chord's notes. Voice: Natural, Chipmunk (an octave up,
  formants up), Deep (down a fifth, formants down), Robot (hard snap to the chord's notes and a ring modulator).
  Effects: Space (a long reverb), Echo (dotted eighths in time), Radio. iPhone gets `navigator.audioSession.type`
  'play-and-record' while the mic is on ('playback' otherwise, so the ring switch doesn't mute the band). The
  pitch pill shows the note you sing and where it's going.
- **Listening on** (JC, Nov 20 2026: "The delay makes this impossible and the music quiets when I sing... Kids are
  going to use phone audio and wireless headphones"; `LISTEN`, `prefs.voice.listen`). Hearing your own voice back
  needs it back within a few hundredths of a second; a phone speaker's round trip is about a tenth and Bluetooth's
  about a fifth, so only **Wired** plays your tuned voice in your ears ("Hear myself live"). On **Phone speaker**
  and **Wireless** you hear the band and your own natural voice, the auto-tune and effects go into the recording,
  and the take plays back as soon as you stop. Phone speaker echo-cancels the mic (so it doesn't hear the band);
  "Keep the music loud" turns that off if iPhone's echo-cancelling dips the music, and then the worklet's gate
  (`duck`, set ten times a second by `updateDuck` from how much of the band the mic hears) shuts the voice between
  lines. Wireless asks for the phone's own mic (`findPhoneMic`), so the headphones aren't switched to their
  call-quality headset mode. The voice and the band each have their own limiter (one shared limiter used to turn
  the band down whenever you sang), and the last limiters only catch what's left.
- **The clap sync** (`syncCheck`): eight beeps on the speaker path (never recorded), you clap along; the worklet
  reports each clap with its exact audio-clock time (`onsets`); the middle offset is the round trip for where
  you're listening, kept per mode in `prefs.voice.sync` (a guess until then: `DEFAULT_RT`). The band goes into the
  recording that much later plus the auto-tune's 23 ms (`estimateLatency`), so the voice lands on its beat; the
  beat bar runs behind the audio clock by the round trip less 20 ms (`hearDelay`), in time with your ears. The
  first recording on Wireless without a sync asks for one (Clap sync or Record anyway).
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
  `barEvents(song, bar, endBar)` (everything that plays in a bar: d drum, c chord, b bass, a arpeggio, f effect),
  `songInfo` (what the beat bar shows), the sing-along's `LOOPS`, `loopSpec`, `loopChords`, `clipBars` and
  `keyFromNotes`. No audio, no DOM.
- `band.js`: the Web Audio band (`Band`: `setSong`, `play(bar, { countIn })`, `stop`, `cue`, `position(now)`,
  `since(kinds, now)` for the visuals, `moveClap`, `moveSwell`), `makeIR`.
- `tune-worklet.js`: the auto-tune processor (`studio-tune`). `voice.js`: the voice's chain (`Voice`).
- `moves.mjs`: claps, hands up, hands with speed. No camera, no DOM.
- `aura.js`: the WebGL 2 universe (`createUniverse`, `UNIVERSES`, `STYLES`, `chordColor`).
- `app.js`, `index.html`: the page. `?fake` (or `window.__studioFake`) swaps the camera for a drawn figure, its mask
  and points (for screenshots); `window.__studio` has test hooks (`state()`, `band()`, `voice()`, `move(type)`).

## Develop and test

```
node games/studio/test/studio.test.mjs   # the theory, every genre and bar, every loop in every genre, the key finder, the worklet fed made-up voices, the moves
npm run build && node scripts/dev-server.mjs   # then /studio/ (and /studio/?fake)
```
To hear the mix's balance, render the band offline in a browser (an OfflineAudioContext whose `currentTime` you
step while calling `band.tick()`): every genre and instrument sits around 0.12 to 0.22 RMS, peaks near full scale
for the limiter.
