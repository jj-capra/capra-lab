/* Capra Lab's daily Card Draw: the cards (JC, Nov 11 2026: "Let's bring Draw a Card out from Mind
   Heist and for all Capra lab games. Card Draw will be a daily task... and it is four cards. Some do
   nothing, others give you extra lives in Swerve Planet, or screensaver, and other games, or a good
   amount of items with a similar advantage like hidden 50/50 is for Mind Heist").
   JC's choices (Nov 12 2026): every day you flip all four cards; the first games with cards are
   Mind Heist, Swerve Planet, Screensaver, No Cap and Par-Tee Time.

   Shared by the server (lab/cards.js) and the pages (the hub and every game that plays a card). */

export const DRAW = 4;              // cards a day
export const PRIZE_ODDS = 0.45;     // each card: a prize this often, otherwise a dud
export const HOLD_EACH = 3;         // the most of one kind of card you can hold
export const DAY_ZONE = 'America/Los_Angeles';   // a new draw at midnight Pacific, like Mind Heist's was

// A card's kind: which game it's for, what it does. `self: true` cards are spent by the page
// (POST /api/cards/use) because that game has no server of its own to check them; the rest are
// spent by the game's server when the card is played.
export const KINDS = {
  'mh-mole': {
    game: 'mind-heist', gameName: 'Mind Heist', href: '/mind-heist/', icon: '🕵️', name: 'Mole',
    how: 'Slip the other crew an anonymous tip. If they lock it in and it’s wrong, your crew takes the tile’s value.',
    when: 'In an invite game with two crews.',
  },
  'mh-hfifty': {
    game: 'mind-heist', gameName: 'Mind Heist', href: '/mind-heist/', icon: '🙈', name: 'Hidden 50/50',
    how: 'Two wrong answers vanish on your crew’s phones only. The other crew and the big screen still see all four.',
    when: 'In an invite game with two crews.',
  },
  'sp-life': {
    game: 'swerve-planet', gameName: 'Swerve Planet', href: '/swerve-planet/', icon: '❤️', name: 'Extra Life', self: true,
    how: 'Start a run with a fourth heart.',
    when: 'Tap it before a run.',
  },
  'ss-life': {
    game: 'screensaver', gameName: 'Screensaver', href: '/screensaver/', icon: '💗', name: 'Extra Life',
    how: 'A fourth ♥ for today’s run: four misses before you’re out.',
    when: 'Tap it before today’s run.',
  },
  'nc-shield': {
    game: 'no-cap', gameName: 'No Cap', href: '/no-cap/', icon: '🛡️', name: 'Cap Shield',
    how: 'The first cap you tap doesn’t bust you. Keep hunting the facts.',
    when: 'Tap it before a game, solo, a challenge or with friends.',
  },
  'pt-mulligan': {
    game: 'par-tee-time', gameName: 'Par-Tee Time', href: '/par-tee-time/', icon: '↩️', name: 'Mulligan', self: true,
    how: 'Take back your last putt: the ball goes back and the stroke comes off.',
    when: 'Against a hustler or on a Masters Course.',
  },
};

// What a dud says (each one worth nothing).
export const DUDS = [
  { icon: '🧪', name: 'Spilled Beaker', how: 'It went everywhere. Nothing left.' },
  { icon: '🥼', name: 'Lab Coat Lint', how: 'Fuzzy. Useless. Kind of cute.' },
  { icon: '📋', name: 'Expired Formula', how: 'Best before last Tuesday.' },
  { icon: '⚡', name: 'Static Shock', how: 'Zap. That’s all it does.' },
  { icon: '🐐', name: 'Goat Hair', how: 'The goat says hi. That’s it.' },
  { icon: '☕', name: 'Cold Coffee', how: 'The scientist’s, not yours.' },
  { icon: '🧲', name: 'Weak Magnet', how: 'Couldn’t pick up a paperclip.' },
  { icon: '🔬', name: 'Smudged Slide', how: 'Whatever was on it, it’s gone.' },
];

// One card's face: { icon, name, how, game?, gameName?, dud? }.
export function face(card) {
  if (!card) return null;
  if (card.k === 'dud') return { ...DUDS[(card.n || 0) % DUDS.length], dud: true };
  const k = KINDS[card.k];
  return k ? { ...k, k: card.k } : { icon: '❔', name: 'Unknown card', how: '' };
}

// Today's date (YYYY-MM-DD) where the draw resets.
export function drawDay(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DAY_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
