// Color by Numbers: the picture library (JC, Nov 21 2026: "for my 1st grade daughter all the way up to
// adults. have fun cuddly characters... a healthy library of 100 images would be a good start.
// unicorns, dolls, puppys, other cuddly animals and scenes"). Every picture is drawn from the kit
// (art-*.mjs) on a 400 x 400 page, and every level colors the same picture: Little gets its big
// shapes, Grown-up gets it cut into stained glass (logic.mjs).
import { Pic } from './art-kit.mjs';
import { critter } from './art-critters.mjs';
import { friend, doll, SKIN, HAIR } from './art-friends.mjs';
import { scene, castle, hotair, rocket, mushroomHouse, house } from './art-scenes.mjs';
import { prop } from './art-props.mjs';

export const CATS = [
  { id: 'unicorns', name: 'Unicorns', emoji: '🦄' },
  { id: 'puppies', name: 'Puppies', emoji: '🐶' },
  { id: 'kittens', name: 'Kittens', emoji: '🐱' },
  { id: 'bunnies', name: 'Bunnies', emoji: '🐰' },
  { id: 'bears', name: 'Bears & Pals', emoji: '🧸' },
  { id: 'dolls', name: 'Dolls', emoji: '👧' },
  { id: 'farm', name: 'Farm', emoji: '🐷' },
  { id: 'wild', name: 'Wild Ones', emoji: '🦊' },
  { id: 'ocean', name: 'Ocean', emoji: '🐳' },
  { id: 'treats', name: 'Treats & Fun', emoji: '🧁' },
  { id: 'fantasy', name: 'Dragons & Bugs', emoji: '🐉' },
];

// place something at (x, y), scaled
function at(p, x, y, s, fn) { p.push(x, y, s); fn(); p.pop(); }
const sit = (p, kind, o = {}, x = 200, y = 230, s = 0.94) => at(p, x, y, s, () => critter(p, kind, o));
const face = (p, kind, o = {}, s = 1.42) => at(p, 200, 262, s, () => critter(p, kind, { ...o, pose: 'head' }));
const girl = (p, o = {}, x = 200, y = 222, s = 0.94) => at(p, x, y, s, () => doll(p, o));
const pal = (p, kind, o = {}, x = 200, y = 220, s = 0.94) => at(p, x, y, s, () => friend(p, kind, o));
const big = (p, kind, o = {}, x = 200, y = 220, s = 3.4) => at(p, x, y, s, () => prop(p, kind, o));

const UNI = { colors: {} };
const PICS = [
  // ---- unicorns ----
  ['rainbow-unicorn', 'Rainbow Unicorn', 'unicorns', (p) => { scene(p, 'rainbow'); sit(p, 'unicorn', UNI); }],
  ['sleepy-unicorn', 'Sleepy Unicorn', 'unicorns', (p) => { scene(p, 'night'); sit(p, 'unicorn', { eyes: 'sleep', colors: { mane: ['#b48cff', '#7fd4ff', '#ff8fc8'] } }); }],
  ['unicorn-princess', 'Unicorn Princess', 'unicorns', (p) => { scene(p, 'castle'); sit(p, 'unicorn', { acc: ['crown'], colors: { body: '#fff0f6', mane: ['#ff6fae', '#ffb3d9', '#ffd84a'] } }); }],
  ['balloon-unicorn', 'Balloon Unicorn', 'unicorns', (p) => { scene(p, 'party'); sit(p, 'unicorn', { prop: 'balloon', propOpts: { c: '#7fd4ff' } }, 190, 236, 0.9); }],
  ['cloud-unicorn', 'Cloud Unicorn', 'unicorns', (p) => { scene(p, 'clouds'); sit(p, 'unicorn', { acc: ['feathers'], colors: { mane: ['#7fd4ff', '#b48cff', '#ffffff'] } }, 200, 236, 0.86); }],
  ['ice-cream-unicorn', 'Ice Cream Unicorn', 'unicorns', (p) => { scene(p, 'candy'); sit(p, 'unicorn', { prop: 'icecream', colors: { body: '#fffaf0', mane: ['#ff8fc8', '#ffd84a', '#8fe0c0'] } }); }],
  ['flower-unicorn', 'Flower Unicorn', 'unicorns', (p) => { scene(p, 'garden'); sit(p, 'unicorn', { acc: ['flowercrown'], colors: { body: '#f4ecff', mane: ['#ff9fc8', '#ffb36b', '#ffe066'] } }); }],
  ['baby-unicorn', 'Baby Unicorn', 'unicorns', (p) => { scene(p, 'badge', { c: '#e6d9ff' }); face(p, 'unicorn', {}, 1.34); }],
  ['starry-unicorn', 'Starry Unicorn', 'unicorns', (p) => { scene(p, 'space'); sit(p, 'unicorn', { prop: 'star', colors: { body: '#efe6ff', mane: ['#7fd4ff', '#b48cff', '#ff8fc8'] } }); }],
  ['sea-unicorn', 'Sea Unicorn', 'unicorns', (p) => { scene(p, 'sea'); pal(p, 'whale', { horn: true, c: '#a8b8ff', light: '#eef0ff', spout: false }, 210, 210, 0.92); }],
  ['birthday-unicorn', 'Birthday Unicorn', 'unicorns', (p) => { scene(p, 'party', { wall: '#e9f6ff' }); sit(p, 'unicorn', { prop: 'cake', colors: { mane: ['#ff8fc8', '#ffd84a', '#7fd4ff'] } }); }],
  ['unicorn-pals', 'Unicorn Pals', 'unicorns', (p) => { scene(p, 'meadow'); sit(p, 'unicorn', {}, 128, 250, 0.66); sit(p, 'bunny', { acc: ['bow'] }, 290, 262, 0.62); }],

  // ---- puppies ----
  ['happy-puppy', 'Happy Puppy', 'puppies', (p) => { scene(p, 'meadow'); sit(p, 'puppy'); }],
  ['puppy-plays-ball', 'Puppy Plays Ball', 'puppies', (p) => { scene(p, 'garden'); sit(p, 'beagle', { prop: 'ball', mouth: 'open' }); }],
  ['spotty-pup', 'Spotty Pup', 'puppies', (p) => { scene(p, 'meadow', { sky: '#d9f0ff' }); sit(p, 'dalmatian', { acc: ['bowtie'], bowC: '#ff6f6f' }); }],
  ['snow-day-pup', 'Snow Day Pup', 'puppies', (p) => { scene(p, 'snow'); sit(p, 'puppy', { acc: ['beanie', 'scarf'], accC: '#7fc8ff', scarfC: '#ff6f6f' }); }],
  ['puppy-face', 'Puppy Face', 'puppies', (p) => { scene(p, 'badge', { c: '#ffe7b8' }); face(p, 'puppy', { mouth: 'open' }); }],
  ['party-pup', 'Party Pup', 'puppies', (p) => { scene(p, 'party'); sit(p, 'beagle', { acc: ['partyhat'], accC: '#b48cff', prop: 'gift' }); }],
  ['best-buddies', 'Best Buddies', 'puppies', (p) => { scene(p, 'room'); sit(p, 'puppy', {}, 124, 262, 0.64); sit(p, 'kitten', { acc: ['bow'], accC: '#7fd4ff' }, 286, 266, 0.62); }],
  ['pup-and-bone', 'Pup and Bone', 'puppies', (p) => { scene(p, 'forest'); sit(p, 'puppy', { prop: 'bone', colors: { body: '#d9a066', earC: '#7a4a2e' } }); }],
  ['flower-pup', 'Flower Pup', 'puppies', (p) => { scene(p, 'garden', { sky: '#e1f3ff' }); sit(p, 'dalmatian', { prop: 'flower', acc: ['bow'], accC: '#ff8fc8' }); }],
  ['tea-time-pup', 'Tea Time Pup', 'puppies', (p) => { scene(p, 'tea', { wall: '#e6f4ff', curtain: '#ffb36b' }); sit(p, 'puppy', { prop: 'teacup', acc: ['bow'], colors: { body: '#f2d2a8', earC: '#c9925e' } }, 200, 222, 0.9); }],

  // ---- kittens ----
  ['little-kitten', 'Little Kitten', 'kittens', (p) => { scene(p, 'meadow'); sit(p, 'kitten'); }],
  ['kitten-and-yarn', 'Kitten and Yarn', 'kittens', (p) => { scene(p, 'room', { wall: '#e8f6ec', rug: '#ffb36b', curtain: '#8fd8b0' }); sit(p, 'greycat', { prop: 'yarn' }); }],
  ['kitty-face', 'Kitty Face', 'kittens', (p) => { scene(p, 'badge', { c: '#ffd6ec' }); face(p, 'kitten', { lashes: true }); }],
  ['moon-kitty', 'Moon Kitty', 'kittens', (p) => { scene(p, 'night'); sit(p, 'greycat', { eyes: 'happy', colors: { body: '#c9c3e6' } }); }],
  ['calico-cutie', 'Calico Cutie', 'kittens', (p) => { scene(p, 'garden'); sit(p, 'calico', { acc: ['bow'], accC: '#7fd4ff' }); }],
  ['cupcake-kitty', 'Cupcake Kitty', 'kittens', (p) => { scene(p, 'candy'); sit(p, 'kitten', { prop: 'cupcake', colors: { body: '#ffd6a0' } }); }],
  ['kitty-loves-fish', 'Kitty Loves Fish', 'kittens', (p) => { scene(p, 'pond'); sit(p, 'kitten', { prop: 'fish', propScale: 1.5, propOpts: { c: '#7fd4ff' }, eyes: 'happy' }, 200, 236, 0.9); }],
  ['kitten-princess', 'Kitten Princess', 'kittens', (p) => { scene(p, 'castle', { castle: '#ffe3ef' }); sit(p, 'greycat', { acc: ['crown'], lashes: true, colors: { body: '#f2f0fa' } }); }],
  ['snow-kitty', 'Snow Kitty', 'kittens', (p) => { scene(p, 'snow'); sit(p, 'kitten', { acc: ['scarf'], scarfC: '#b48cff' }); }],

  // ---- bunnies ----
  ['spring-bunny', 'Spring Bunny', 'bunnies', (p) => { scene(p, 'garden'); sit(p, 'bunny', { prop: 'carrot' }, 200, 240, 0.9); }],
  ['bunny-face', 'Bunny Face', 'bunnies', (p) => { scene(p, 'badge', { c: '#d9f2e4' }); face(p, 'bunny', { lashes: true }, 1.2); }],
  ['egg-hunt-bunny', 'Egg Hunt Bunny', 'bunnies', (p) => { scene(p, 'meadow'); sit(p, 'brownbunny', { prop: 'egg' }, 200, 240, 0.9); }],
  ['rainy-day-bunny', 'Rainy Day Bunny', 'bunnies', (p) => { scene(p, 'pond', { sky: '#d6e2ef' }); sit(p, 'bunny', { prop: 'umbrella', propOpts: { c: '#ffd84a' } }, 200, 250, 0.84); }],
  ['bunny-picnic', 'Bunny Picnic', 'bunnies', (p) => { scene(p, 'picnic'); sit(p, 'brownbunny', { prop: 'strawberry' }, 200, 236, 0.88); }],
  ['bunny-and-butterfly', 'Bunny and Butterfly', 'bunnies', (p) => { scene(p, 'meadow', { sky: '#d8f0ff' }); sit(p, 'bunny', { eyes: 'happy' }, 180, 246, 0.86); pal(p, 'butterfly', {}, 320, 120, 0.36); }],
  ['flower-crown-bunny', 'Flower Crown Bunny', 'bunnies', (p) => { scene(p, 'forest'); sit(p, 'brownbunny', { acc: ['flowercrown'] }, 200, 240, 0.9); }],
  ['moonlight-bunny', 'Moonlight Bunny', 'bunnies', (p) => { scene(p, 'night', { sky: '#3b3f7a' }); sit(p, 'bunny', { prop: 'star' }, 200, 240, 0.9); }],

  // ---- bears & pals ----
  ['teddy-bear', 'Teddy Bear', 'bears', (p) => { scene(p, 'room'); sit(p, 'teddy', { acc: ['bowtie'], bowC: '#7fd4ff' }); }],
  ['teddy-hug', 'Teddy Hug', 'bears', (p) => { scene(p, 'badge', { c: '#ffd6e4' }); sit(p, 'teddy', { prop: 'heart', eyes: 'happy' }, 200, 236, 0.92); }],
  ['honey-bear', 'Honey Bear', 'bears', (p) => { scene(p, 'forest'); sit(p, 'bear', { prop: 'honey' }); pal(p, 'bee', {}, 330, 100, 0.3); }],
  ['panda-and-bamboo', 'Panda and Bamboo', 'bears', (p) => { scene(p, 'bamboo'); sit(p, 'panda', { prop: 'bamboo' }); }],
  ['koala-cuddles', 'Koala Cuddles', 'bears', (p) => { scene(p, 'forest', { sky: '#e0f4e8' }); sit(p, 'koala', { prop: 'heart', propOpts: { c: '#ff8fb8' } }); }],
  ['polar-bear', 'Polar Bear', 'bears', (p) => { scene(p, 'ice'); sit(p, 'polar', { acc: ['scarf'], scarfC: '#ff6f6f' }); }],
  ['red-panda', 'Red Panda', 'bears', (p) => { scene(p, 'forest'); sit(p, 'redpanda', {}, 190, 236, 0.9); }],
  ['balloon-bear', 'Balloon Bear', 'bears', (p) => { scene(p, 'clouds'); sit(p, 'teddy', { prop: 'balloons' }, 200, 262, 0.78); }],
  ['hamster-snack', 'Hamster Snack', 'bears', (p) => { scene(p, 'room', { wall: '#fff3d6', rug: '#7fd4ff' }); sit(p, 'hamster', { prop: 'seed' }); }],

  // ---- dolls ----
  ['princess-doll', 'Princess Doll', 'dolls', (p) => { scene(p, 'castle'); girl(p, { outfit: 'princess', style: 'long', hair: HAIR.blonde, dress: '#ff8fc8' }); }],
  ['fairy-doll', 'Fairy Doll', 'dolls', (p) => { scene(p, 'forest'); girl(p, { outfit: 'fairy', style: 'buns', hair: HAIR.lilac, dress: '#8fe0b0', skin: SKIN[2] }); }],
  ['ballerina', 'Ballerina', 'dolls', (p) => { scene(p, 'stage'); girl(p, { outfit: 'ballerina', style: 'buns', hair: HAIR.brown, dress: '#ffb3d1', skin: SKIN[1] }); }],
  ['mermaid', 'Mermaid', 'dolls', (p) => { scene(p, 'sea'); girl(p, { outfit: 'mermaid', style: 'long', hair: HAIR.red, top: '#b48cff', tail: '#5fd0c0', acc: ['flower'] }, 200, 210); }],
  ['rainbow-doll', 'Rainbow Doll', 'dolls', (p) => { scene(p, 'rainbow'); girl(p, { style: 'pigtails', hair: HAIR.black, dress: '#b79cff', rainbow: true, skin: SKIN[3] }); }],
  ['doll-and-puppy', 'Doll and Puppy', 'dolls', (p) => { scene(p, 'meadow'); girl(p, { style: 'ponytail', hair: HAIR.brown, dress: '#7fd4ff', dots: true, skin: SKIN[1] }, 150, 236, 0.78); sit(p, 'puppy', {}, 300, 282, 0.52); }],
  ['snow-doll', 'Snow Doll', 'dolls', (p) => { scene(p, 'snow'); girl(p, { outfit: 'coat', style: 'long', hair: HAIR.blonde, dress: '#ff6f91', acc: ['beanie'], accC: '#7fc8ff' }); }],
  ['tea-party', 'Tea Party', 'dolls', (p) => { scene(p, 'tea'); girl(p, { style: 'bob', hair: HAIR.brown, dress: '#ffb36b', apron: true, prop: 'teacup', skin: SKIN[4], acc: ['bow'] }); }],
  ['space-explorer', 'Space Explorer', 'dolls', (p) => { scene(p, 'space'); girl(p, { outfit: 'astronaut', style: 'curly', hair: HAIR.black, skin: SKIN[3] }); }],
  ['doll-face', 'Doll Face', 'dolls', (p) => { scene(p, 'badge', { c: '#ffe3c9' }); at(p, 200, 250, 1.36, () => doll(p, { pose: 'head', style: 'pigtails', hair: HAIR.red, dress: '#8fd16a', acc: ['bigbow'], accC: '#ff6f91' })); }],
  ['flower-doll', 'Flower Doll', 'dolls', (p) => { scene(p, 'garden'); girl(p, { style: 'long', hair: HAIR.brown, dress: '#ffd84a', acc: ['flowercrown'], prop: 'bouquet', skin: SKIN[2] }); }],
  ['best-friends', 'Best Friends', 'dolls', (p) => { scene(p, 'party', { wall: '#f1ecff' }); girl(p, { style: 'pigtails', hair: HAIR.pink, dress: '#7fd4ff', skin: SKIN[0] }, 124, 236, 0.74); girl(p, { style: 'curly', hair: HAIR.black, dress: '#ff8fc8', skin: SKIN[4] }, 284, 236, 0.74); }],

  // ---- farm ----
  ['baby-chick', 'Baby Chick', 'farm', (p) => { scene(p, 'meadow'); pal(p, 'chick', { egg: true }, 200, 222, 0.92); }],
  ['happy-piglet', 'Happy Piglet', 'farm', (p) => { scene(p, 'farm'); sit(p, 'pig', { acc: ['flower'], accC: '#ffd84a' }); }],
  ['little-lamb', 'Little Lamb', 'farm', (p) => { scene(p, 'meadow', { grass: '#8fd16a' }); sit(p, 'lamb', { acc: ['bow'], accC: '#7fd4ff' }); }],
  ['baby-cow', 'Baby Cow', 'farm', (p) => { scene(p, 'farm'); sit(p, 'cow', { prop: 'flower', propOpts: { c: '#ffd84a' } }); }],
  ['ducklings', 'Ducklings', 'farm', (p) => { scene(p, 'pond'); pal(p, 'chick', { duck: true }, 130, 270, 0.56); pal(p, 'chick', { duck: true, c: '#ffe680' }, 280, 290, 0.46); }],
  ['pony', 'Pony', 'farm', (p) => { scene(p, 'farm'); sit(p, 'pony', { acc: ['flower'] }); }],
  ['farm-friends', 'Farm Friends', 'farm', (p) => { scene(p, 'farm'); sit(p, 'pig', {}, 140, 262, 0.62); pal(p, 'chick', {}, 296, 290, 0.48); }],

  // ---- wild ones ----
  ['baby-fox', 'Baby Fox', 'wild', (p) => { scene(p, 'forest'); sit(p, 'fox', {}, 190, 236, 0.9); }],
  ['little-owl', 'Little Owl', 'wild', (p) => {
    scene(p, 'night');
    p.fill(p.blob([[-10, 330], [120, 318], [300, 322], [410, 316], [410, 344], [300, 346], [120, 342], [-10, 352]], 0.6), '#9a6a4a');
    pal(p, 'owl', {}, 200, 200, 0.9);
  }],
  ['hedgehog', 'Hedgehog', 'wild', (p) => { scene(p, 'forest'); sit(p, 'hedgehog', { prop: 'acorn' }); }],
  ['fawn', 'Fawn', 'wild', (p) => { scene(p, 'forest', { sky: '#fff1dc' }); sit(p, 'deer', { lashes: true }); }],
  ['squirrel', 'Squirrel', 'wild', (p) => { scene(p, 'forest'); sit(p, 'squirrel', { prop: 'acorn' }, 184, 236, 0.9); }],
  ['raccoon', 'Raccoon', 'wild', (p) => { scene(p, 'night', { sky: '#3a4378' }); sit(p, 'raccoon', { prop: 'strawberry' }, 190, 236, 0.9); }],
  ['lion-cub', 'Lion Cub', 'wild', (p) => { scene(p, 'savanna'); sit(p, 'lion', {}, 210, 236, 0.9); }],
  ['tiger-cub', 'Tiger Cub', 'wild', (p) => { scene(p, 'bamboo'); sit(p, 'tiger', {}, 194, 236, 0.9); }],
  ['little-elephant', 'Little Elephant', 'wild', (p) => { scene(p, 'savanna', { sky: '#e3f3ff' }); sit(p, 'elephant', { acc: ['bow'], accC: '#ff8fc8' }, 214, 240, 0.86); }],
  ['cheeky-monkey', 'Cheeky Monkey', 'wild', (p) => { scene(p, 'forest', { sky: '#e6f8d8' }); sit(p, 'monkey', { mouth: 'open' }, 190, 236, 0.9); }],

  // ---- ocean ----
  ['happy-whale', 'Happy Whale', 'ocean', (p) => { scene(p, 'sea'); pal(p, 'whale', {}, 214, 236, 0.9); }],
  ['baby-octopus', 'Baby Octopus', 'ocean', (p) => { scene(p, 'sea', { water: '#9fe4ff' }); pal(p, 'octopus', { acc: ['bow'] }, 200, 196, 0.92); }],
  ['little-turtle', 'Little Turtle', 'ocean', (p) => { scene(p, 'beach'); pal(p, 'turtle', {}, 190, 300, 0.92); }],
  ['stripy-fish', 'Stripy Fish', 'ocean', (p) => { scene(p, 'sea'); pal(p, 'fish', { stripes: true }, 200, 190, 1.1); pal(p, 'fish', { c: '#b48cff' }, 320, 300, 0.36); }],
  ['penguin-on-ice', 'Penguin on Ice', 'ocean', (p) => { scene(p, 'ice'); pal(p, 'penguin', { acc: ['beanie'], accC: '#ff6f91' }, 200, 214, 0.9); }],
  ['seal-pup', 'Seal Pup', 'ocean', (p) => { scene(p, 'ice', { sky: '#e3f1ff' }); pal(p, 'seal', { acc: ['bow'], accC: '#7fd4ff' }, 200, 214, 0.92); }],
  ['beach-crab', 'Beach Crab', 'ocean', (p) => { scene(p, 'beach'); pal(p, 'crab', {}, 200, 266, 0.92); }],
  ['under-the-sea', 'Under the Sea', 'ocean', (p) => { scene(p, 'sea'); pal(p, 'fish', { c: '#ffd84a' }, 140, 130, 0.6); pal(p, 'fish', { c: '#ff8fc8' }, 280, 210, 0.66); pal(p, 'fish', { c: '#8fe0b0' }, 150, 290, 0.5); }],

  // ---- treats & fun ----
  ['cupcake', 'Cupcake', 'treats', (p) => { scene(p, 'badge', { c: '#d9f2ff' }); big(p, 'cupcake', { face: true, faceY: 22, faceS: 0.42 }, 200, 220, 3.3); }],
  ['ice-cream', 'Ice Cream', 'treats', (p) => { scene(p, 'candy'); big(p, 'icecream', { face: true, faceY: -18, faceS: 0.36, c2: '#ffe08a' }, 200, 210, 3.1); }],
  ['birthday-cake', 'Birthday Cake', 'treats', (p) => { scene(p, 'party'); big(p, 'cake', { face: true, faceY: 14, faceS: 0.4 }, 200, 240, 3.4); }],
  ['donut-friends', 'Donut Friends', 'treats', (p) => { scene(p, 'badge', { c: '#fff1c9' }); big(p, 'donut', { face: true, faceY: 18, faceS: 0.3 }, 130, 170, 2.4); big(p, 'donut', { face: true, faceY: 18, faceS: 0.3, c: '#b79cff' }, 270, 270, 2.4); }],
  ['hot-air-balloon', 'Hot Air Balloon', 'treats', (p) => { scene(p, 'clouds', { sky: '#bfe6ff' }); hotair(p, 200, 180, 1.1, { face: true }); }],
  ['rocket-ship', 'Rocket Ship', 'treats', (p) => { scene(p, 'space'); rocket(p, 190, 180, 1.05, { face: true }); }],
  ['fairy-castle', 'Fairy Castle', 'treats', (p) => { scene(p, 'rainbow', { sky: '#e6f3ff' }); castle(p, 200, 300, 0.82, { c: '#f4e8ff' }); }],

  // ---- dragons & bugs ----
  ['baby-dragon', 'Baby Dragon', 'fantasy', (p) => { scene(p, 'castle'); pal(p, 'dino', { wings: true, horns: true, c: '#b48cff', light: '#f0e6ff', spike: '#ff8fc8', spots: false }, 214, 236, 0.86); }],
  ['baby-dino', 'Baby Dino', 'fantasy', (p) => { scene(p, 'meadow', { grass: '#8fd16a' }); pal(p, 'dino', {}, 214, 236, 0.86); }],
  ['butterfly', 'Butterfly', 'fantasy', (p) => { scene(p, 'garden'); pal(p, 'butterfly', { c: '#7fd4ff', c2: '#ffb36b' }, 200, 190, 0.98); }],
  ['busy-bee', 'Busy Bee', 'fantasy', (p) => { scene(p, 'garden', { sky: '#fff6d6' }); pal(p, 'bee', {}, 212, 204, 1.12); }],
  ['ladybug', 'Ladybug', 'fantasy', (p) => { scene(p, 'garden'); pal(p, 'ladybug', {}, 200, 210, 0.92); }],
  ['froggy', 'Froggy', 'fantasy', (p) => { scene(p, 'pond'); pal(p, 'frog', { acc: ['crown'] }, 200, 222, 0.88); }],
  ['snail', 'Snail', 'fantasy', (p) => { scene(p, 'forest'); pal(p, 'snail', {}, 200, 260, 0.92); }],
  ['mushroom-house', 'Mushroom House', 'fantasy', (p) => { scene(p, 'forest', { sky: '#fff1dc' }); mushroomHouse(p, 200, 250, 1.05); }],
];

export const PICTURES = PICS.map(([id, title, cat, draw], i) => ({ id, title, cat, n: i + 1, draw }));
export const byId = (id) => PICTURES.find((x) => x.id === id);

// Draw a picture: its parts, in painting order.
const cache = new Map();
export function parts(id) {
  if (cache.has(id)) return cache.get(id);
  const pic = byId(id);
  if (!pic) return [];
  const p = new Pic();
  pic.draw(p);
  cache.set(id, p.parts);
  return p.parts;
}
void house;
