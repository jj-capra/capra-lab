// Looks. A profile has one for its own screens; a room uses the host's look for
// everyone in it (and on the big-screen view). Looks never change the rules.
import { html } from './ui.js';

export const THEMES = {
  heist: {
    name: 'Heist',
    blurb: 'Night shift. Cobalt stickers and a green hacker terminal.',
    meta: '#070a1f',
    right: ['Ate.', 'Locked in.', 'Big brain.', 'Clean.', 'No notes.', 'Too easy.'],
    wrong: ['Fumbled.', 'Not it.', 'Oof.', 'Close-ish.', 'Nope.'],
    timeUp: 'Time’s up.',
    double: 'Double',
    drop: 'Today’s drop',
    mvp: 'MVP',
    picking: (n) => `${n} is picking`,
    youPick: 'You’re up. Pick a tile.',
    answering: (n) => `${n} is answering`,
    youAnswer: 'Your call. Lock it in.',
    late: null,
    jamTitle: 'Get the jewel out',
    jamHow: 'Slide the carts and crates out of the way until the jewel can reach the vault door. Everything only moves forward and back the way it’s facing.',
    jamLine: 'Slide the carts, free the jewel. Fastest time today wins a trophy.',
    duds: ['Empty safe', 'Fake mustache', 'Decoy diamond', 'Expired keycard', 'Rubber duck', 'Wrong blueprints'],
  },
  office: {
    name: 'Branch Office',
    blurb: 'A mockumentary workday. Memos, sticky notes, rubber stamps, a camera crew.',
    meta: '#9fb1c2',
    right: ['Approved', 'Promoted', 'Filed', 'Gold star', 'Raise pending'],
    wrong: ['Denied', 'See HR', 'Shredded', 'Rejected', 'Wrong memo'],
    timeUp: 'Meeting ran long',
    double: 'Double shift',
    drop: 'Today’s memo',
    mvp: 'Employee of the game',
    picking: (n) => `${n} has the floor`,
    youPick: 'You have the floor.',
    answering: (n) => `${n} is on the record`,
    youAnswer: 'On the record. Lock it in.',
    late: 'Wrap it up',
    jamTitle: 'Out of the supply closet',
    jamHow: 'Shove the desks and filing cabinets until the jewel can get out the closet door. Everything only rolls forward and back the way it’s facing.',
    jamLine: 'Someone locked the jewel in the supply closet. Fastest time today wins a trophy.',
    duds: ['Expired coupon', 'Out-of-office reply', 'Broken stapler', 'Reply-all chain', 'Lukewarm coffee', 'Mandatory fun flyer'],
  },
  bar: {
    name: 'Trivia Night',
    blurb: 'Neon signs, a chalkboard, Edison bulbs over exposed brick.',
    meta: '#1b0e0b',
    right: ['Cheers!', 'Top shelf.', 'Round on us.', 'Nailed it.', 'Bottoms up.'],
    wrong: ['86’d.', 'Ouch.', 'Not on tap.', 'Tab closed.', 'Swing and a miss.'],
    timeUp: 'Last call came and went.',
    double: 'Double shot',
    drop: 'Tonight’s round',
    mvp: 'Top shelf',
    picking: (n) => `${n}’s up`,
    youPick: 'You’re up. Pick a tile.',
    answering: (n) => `${n} is answering`,
    youAnswer: 'Your call. Lock it in.',
    late: 'Last call',
    jamTitle: 'Out the back door',
    jamHow: 'Roll the kegs and crates aside until the jewel can reach the back door. Everything only rolls forward and back the way it’s facing.',
    jamLine: 'The jewel’s stuck in the back room. Fastest time today wins a trophy.',
    duds: ['Flat soda', 'Lost coaster', 'Closed tab', 'Soggy napkin', 'Jukebox IOU', 'Stale pretzel'],
  },
  sports: {
    name: 'Sports Bar',
    blurb: 'Game night at the sports bar: a scoreboard, the hardwood and pennants on the wall.',
    meta: '#133621',
    crews: ['Home', 'Away'],
    right: ['Touchdown!', 'Nothing but net.', 'Home run!', 'Goal!', 'Slam dunk.'],
    wrong: ['Fumble.', 'Air ball.', 'Strike three.', 'Offside.', 'Flag on the play.'],
    timeUp: 'Shot clock violation.',
    double: 'Overtime',
    drop: 'Today’s matchup',
    mvp: 'Player of the game',
    picking: (n) => `${n} has the ball`,
    youPick: 'Your ball. Pick a tile.',
    answering: (n) => `${n} is at the line`,
    youAnswer: 'You’re at the line. Lock it in.',
    late: 'Buzzer beater',
    jamTitle: 'Clear the tunnel',
    jamHow: 'Roll the equipment carts and ball bins aside until the jewel can reach the tunnel. Everything only rolls forward and back the way it’s facing.',
    jamLine: 'The jewel is stuck in the equipment room. Fastest time today wins a trophy.',
    duds: ['Broken whistle', 'Flat basketball', 'Lost mouthguard', 'Rain delay', 'Left-hand foam finger', 'Benchwarmer pass'],
  },
  popup: {
    name: 'Bloop TV',
    blurb: 'A 90s music-video channel where the facts pop up in bubbles.',
    meta: '#1a0b3d',
    right: ['Total hit.', 'Number one!', 'Platinum.', 'Encore!', 'Top of the countdown.'],
    wrong: ['Scratched.', 'One-hit wonder.', 'Off the charts.', 'Skipped.', 'Be kind, rewind.'],
    timeUp: 'Fade to black.',
    double: 'Bonus track',
    drop: 'Today’s countdown',
    mvp: 'Artist of the game',
    picking: (n) => `Now playing: ${n}`,
    youPick: 'You’re on. Pick a tile.',
    answering: (n) => `${n} has the mic`,
    youAnswer: 'Your solo. Lock it in.',
    late: 'Final chorus',
    jamTitle: 'Backstage pass',
    jamHow: 'Slide the road cases and amps until the jewel can get out the stage door. Everything only rolls forward and back the way it’s facing.',
    jamLine: 'The jewel is stuck backstage. Fastest time today wins a trophy.',
    duds: ['Tangled headphones', 'Blank cassette', 'Lost backstage pass', 'Scratched CD', 'Late rewind fee', 'Static'],
  },
  gameshow: {
    name: 'Game Show',
    blurb: 'A 70s TV game show set: marquee lights, wood-grain podiums and an applause sign.',
    meta: '#2a0f04',
    right: ['Ding ding ding!', 'Winner!', 'Cha-ching!', 'Applause!', 'Showstopper!'],
    wrong: ['Bzzzt.', 'Ooooh.', 'So close.', 'Not today.', 'Wah wah.'],
    timeUp: 'Time’s up, contestant.',
    double: 'Bonus round',
    drop: 'Today’s episode',
    mvp: 'Grand champion',
    picking: (n) => `${n}, pick a tile`,
    youPick: 'Contestant, pick a tile!',
    answering: (n) => `${n} is on the buzzer`,
    youAnswer: 'Your answer? Lock it in.',
    late: 'Hurry!',
    jamTitle: 'Behind the curtain',
    jamHow: 'Slide the prize crates and stage props until the jewel can reach the curtain. Everything only moves forward and back the way it’s facing.',
    jamLine: 'The grand prize is stuck backstage. Fastest time today wins a trophy.',
    duds: ['Lovely parting gift', 'Home game edition', 'Consolation prize', 'Rubber chicken', 'Can of studio air', 'Cardboard sports car'],
  },
  arcade: {
    name: 'Arcade',
    blurb: 'An 80s arcade: CRT screens, pixel type, a blinking 1UP and a high-score table.',
    meta: '#05030f',
    right: ['1UP!', 'High score!', 'Combo!', 'Level up!', 'Perfect!'],
    wrong: ['Game over.', 'Miss!', 'K.O.', 'Try again.', 'Glitched.'],
    timeUp: 'Time over.',
    double: 'Extra life',
    drop: 'Today’s level',
    mvp: 'High score',
    picking: (n) => `${n} has the joystick`,
    youPick: 'Your turn. Pick a tile.',
    answering: (n) => `${n} is up`,
    youAnswer: 'Press start. Lock it in.',
    late: 'Hurry up!',
    jamTitle: 'Bonus stage',
    jamHow: 'Push the blocks until the jewel can reach the exit. Every block only slides forward and back the way it’s facing.',
    jamLine: 'Clear the bonus stage. Fastest time today wins a trophy.',
    duds: ['Insert coin', 'Out of order', 'Sticky button', 'Token jam', 'Blown fuse', 'Continue? 9... 8...'],
  },
};
export const THEME_IDS = Object.keys(THEMES);

let active = 'heist';
// Sets the page's look. Safe to call during render: it only touches <html>.
export function setTheme(id) {
  const t = THEMES[id] ? id : 'heist';
  active = t;
  const root = document.documentElement;
  if (root.dataset.theme !== t) {
    root.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEMES[t].meta);
  }
  return t;
}
export const th = () => THEMES[active];
export const themeId = () => active;

// Remembered per device so the first paint matches your profile.
export function rememberTheme(id) { try { localStorage.setItem('mh.theme', id); } catch (e) {} }
export function rememberedTheme() { try { return localStorage.getItem('mh.theme') || 'heist'; } catch (e) { return 'heist'; } }

// A small live preview of each look, drawn by the look's own styles.
export function ThemePicker({ value, onPick, label = 'Look' }) {
  return html`<div class="th-pick" role="radiogroup" aria-label=${label}>
    ${THEME_IDS.map(id => html`<button type="button" class="th-opt" role="radio" aria-checked=${value === id} onClick=${() => onPick(id)}>
      <div class="th-prev" data-theme=${id} aria-hidden="true">
        <div class="tp-top"><span class="tp-logo">Mind <b>Heist</b></span></div>
        <div class="tp-seat">Ana is up</div>
        <div class="tp-body">
          <div class="tp-card"><span class="tp-q">Which planet has the most moons?</span><span class="tp-opt"><i>A</i>Saturn</span></div>
          <div class="tp-tile">$300</div>
        </div>
      </div>
      <span class="th-name"><b>${THEMES[id].name}</b><span>${THEMES[id].blurb}</span></span>
    </button>`)}
  </div>`;
}
