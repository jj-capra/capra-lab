/* Capra Lab's wallet: diamonds, amber and shards, one wallet per lab profile (JC, Nov 11 2026: "I
   also want diamonds amber and shards in Capra Lab. These are no longer just glacial maw unique. and
   this opens a way to accessorize and individualize their avatar").
   JC's choices (Nov 12 2026): Glacial Maw links to it now (its amber, Rift Shards and diamond gems are
   this wallet); the lab games pay by how rare a thing is: amber for finishing a game, shards for wins
   and personal bests, diamonds for rare feats; nothing to buy yet, the avatar shop comes next.

   Shared by the server (lab/wallet.js) and the pages (the hub, the Capra Lab button, the games). */

// The three, rarest last on the page but first here. `css` draws the little gem (Glacial Maw's own).
export const COINS = {
  diamonds: { one: 'diamond', many: 'diamonds', short: 'Diamonds', color: '#8A6CFF',
    css: 'background:linear-gradient(160deg,#ffffff,#dccfff 45%,#8a6cff);clip-path:polygon(22% 0,78% 0,100% 34%,50% 100%,0 34%)' },
  amber: { one: 'amber', many: 'amber', short: 'Amber', color: '#F2B33D',
    css: 'background:#F2B33D;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)' },
  shards: { one: 'shard', many: 'shards', short: 'Shards', color: '#7FD4FF',
    css: 'background:linear-gradient(160deg,#eef8ff,#7fd4ff 55%,#3a7aa8);clip-path:polygon(50% 0,100% 36%,72% 100%,28% 100%,0 36%)' },
};
export const ORDER = ['diamonds', 'amber', 'shards'];

// What a game page can claim when a game ends (POST /api/wallet/earn { game, event, ref }). The page
// can't prove it, so each game pays at most DAY_CAP a day and the same `ref` pays once. Diamonds are
// never claimed this way: only a game's own server pays them, for a feat it checked (FEATS).
export const DAY_CAP = { amber: 150, shards: 3 };
export const EARN = {
  'swerve-planet':   { name: 'Swerve Planet', run: { amber: 20, why: 'a run' }, best: { shards: 1, why: 'a new best' } },
  'par-tee-time':    { name: 'Par-Tee Time', round: { amber: 30, why: 'a round' }, win: { shards: 1, why: 'a win' } },
  'no-cap':          { name: 'No Cap', game: { amber: 25, why: 'a game' }, win: { shards: 1, why: 'a win with friends' } },
  'mind-heist':      { name: 'Mind Heist', game: { amber: 30, why: 'a board' }, win: { shards: 1, why: 'a crew win' } },
  'punchline':       { name: 'Punchline', game: { amber: 20, why: 'a game' }, win: { shards: 1, why: 'a win' } },
  'classified':      { name: 'Classified', game: { amber: 25, why: 'a game' } },
  'dont-look':       { name: 'Don’t Look!', round: { amber: 15, why: 'a round' } },
  'primal-survival': { name: 'Primal Survival', match: { amber: 25, why: 'a match' }, win: { shards: 1, why: 'a win' } },
  'three-clue-crew': { name: 'Three Clue Crew', game: { amber: 20, why: 'a game of ten' }, perfect: { shards: 1, why: 'a perfect ten' } },
  'puzzled-spin':    { name: 'Puzzled Spin', run: { amber: 20, why: 'a run of five' }, clear: { shards: 1, why: 'all five solved' } },
};

// What the games' servers pay, for the hub's "how to earn" list (they pay it themselves).
export const FEATS = [
  { game: 'Goat Getaway', what: 'Get the goat out of today’s pen', pay: { amber: 30 } },
  { game: 'Goat Getaway', what: 'Out at par, no hints', pay: { diamonds: 1 } },
  { game: 'Screensaver', what: 'Today’s run on the board', pay: { amber: 30 } },
  { game: 'Screensaver', what: '#1 on the day’s board', pay: { diamonds: 1 } },
  { game: 'Par-Tee Time', what: 'Loot from a Masters Course', pay: { shards: 1 } },
  { game: 'Par-Tee Time', what: 'A Masters trophy (a course best held 7 days)', pay: { diamonds: 1 } },
  { game: 'Glacial Maw', what: 'Everything you earn hunting (amber, Rift Shards, diamond gems)', pay: {} },
];

// Glacial Maw keeps its own count and sends the difference (POST /api/wallet/sync); one sync can't move
// more than this, so a broken save can't flood the wallet.
export const SYNC_MAX = { amber: 100000, shards: 1000, diamonds: 100 };

// "1,240" or "12.4k" for tight spots.
export function short(n) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  if (n < 10000) return n.toLocaleString('en-US');
  if (n < 1e6) return (Math.floor(n / 100) / 10).toString().replace(/\.0$/, '') + 'k';
  return (Math.floor(n / 1e5) / 10).toString().replace(/\.0$/, '') + 'M';
}
// "+30 amber, +1 shard"
export function words(pay) {
  return ORDER.filter((k) => pay && pay[k]).map((k) => `${pay[k] > 0 ? '+' : ''}${pay[k]} ${Math.abs(pay[k]) === 1 ? COINS[k].one : COINS[k].many}`).join(', ');
}
export const DAY_ZONE = 'America/Los_Angeles';
export function walletDay(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DAY_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
