// Three Clue Crew rounds (JC, Nov 12 2026). One round a line:
//   Clue, Clue, Clue | Answer | Wrong, Wrong, Wrong | Why the clues connect (the host reads it out)
// Three one-word clues, the answer and three wrong choices that each fit one or two clues but not all
// three. Everything has to be fine for a classroom. Adding rounds at the end of a tier is safe; moving
// or deleting them reshuffles the daily sets from that day on.
import { parse } from './logic.mjs';

export const ROUNDS = {
  // Tier 1: Kindergarten–1st grade (early readers)
  1: parse(`
Bark, Fur, Tail | Dog | Cat, Fish, Bird | A dog barks, has fur and wags its tail.
Meow, Whiskers, Purr | Cat | Dog, Cow, Duck | A cat meows, purrs and has whiskers.
Moo, Milk, Farm | Cow | Pig, Horse, Sheep | A cow says moo and gives us milk on the farm.
Oink, Mud, Pink | Pig | Cow, Frog, Duck | A pink pig says oink and rolls in the mud.
Quack, Pond, Feathers | Duck | Fish, Frog, Cat | A duck has feathers, quacks and swims in a pond.
Hop, Green, Lily | Frog | Bunny, Snake, Turtle | A green frog hops onto a lily pad.
Hop, Carrot, Ears | Bunny | Frog, Dog, Mouse | A bunny hops, has long ears and loves carrots.
Trunk, Gray, Big | Elephant | Mouse, Hippo, Rhino | An elephant is big and gray with a long trunk.
Neck, Tall, Spots | Giraffe | Zebra, Horse, Camel | A giraffe is tall, with a long neck and spots.
Stripes, Black, White | Zebra | Tiger, Horse, Panda | A zebra has black and white stripes.
Roar, Mane, King | Lion | Tiger, Bear, Dog | A lion roars, has a mane and is called the king of the jungle.
Banana, Swing, Tree | Monkey | Bird, Squirrel, Bear | A monkey swings in trees and eats bananas.
Honey, Fur, Cave | Bear | Bee, Lion, Wolf | A furry bear eats honey and sleeps in a cave.
Buzz, Honey, Flower | Bee | Fly, Butterfly, Bird | A bee buzzes from flower to flower and makes honey.
Wings, Colorful, Caterpillar | Butterfly | Bee, Bird, Ladybug | A butterfly starts as a caterpillar and grows colorful wings.
Shell, Slow, Green | Turtle | Snail, Frog, Crab | A turtle is green, slow and carries a shell.
Web, Eight, Legs | Spider | Ant, Crab, Octopus | A spider has eight legs and spins a web.
Ocean, Fins, Teeth | Shark | Whale, Dolphin, Fish | A shark swims in the ocean with fins and lots of sharp teeth.
Feathers, Nest, Fly | Bird | Bee, Butterfly, Airplane | A bird has feathers, builds a nest and flies.
Hoot, Night, Wise | Owl | Bat, Bird, Cat | An owl says hoot at night and is called wise.
Cold, Waddle, Ice | Penguin | Polar Bear, Duck, Seal | A penguin waddles across the cold ice.
Cheese, Squeak, Tiny | Mouse | Hamster, Cat, Bird | A tiny mouse squeaks and nibbles cheese.
Neigh, Saddle, Gallop | Horse | Cow, Donkey, Dog | A horse neighs, gallops and wears a saddle.
Wool, Baa, Farm | Sheep | Goat, Cow, Pig | A sheep on the farm says baa and grows wool.
Hiss, Long, Slither | Snake | Worm, Lizard, Cat | A long snake slithers and hisses.
Claws, Ocean, Sideways | Crab | Lobster, Fish, Turtle | A crab has claws and walks sideways by the ocean.
Spots, Red, Tiny | Ladybug | Ant, Bee, Spider | A tiny red ladybug has black spots.
Red, Crunchy, Teacher | Apple | Grapes, Carrot, Banana | A red, crunchy apple is the classic gift for a teacher.
Yellow, Peel, Monkey | Banana | Lemon, Corn, Apple | A yellow banana has a peel, and monkeys love them.
Orange, Bunny, Crunchy | Carrot | Pumpkin, Corn, Cheese | Bunnies munch on crunchy orange carrots.
Cheese, Slice, Round | Pizza | Pie, Cake, Sandwich | A round, cheesy pizza is cut into slices.
Cold, Cone, Sweet | Ice Cream | Snow, Cookie, Cake | Sweet, cold ice cream comes in a cone.
Candles, Birthday, Frosting | Cake | Pizza, Cookie, Present | A birthday cake has frosting and candles.
Milk, Spoon, Bowl | Cereal | Soup, Cookie, Juice | You eat cereal with milk, a spoon and a bowl.
Bread, Cheese, Lunch | Sandwich | Pizza, Soup, Taco | A sandwich is bread and cheese, made for lunch.
Syrup, Stack, Breakfast | Pancakes | Toast, Cereal, Eggs | A stack of pancakes with syrup is a yummy breakfast.
Yellow, Hot, Sky | Sun | Moon, Star, Lemon | The hot yellow sun shines in the sky.
Night, Sky, Astronaut | Moon | Sun, Cloud, Rainbow | The moon glows in the night sky, and astronauts have walked on it.
Twinkle, Night, Sky | Star | Moon, Sun, Cloud | Stars twinkle in the night sky.
Colors, Rain, Sky | Rainbow | Cloud, Sun, Umbrella | A rainbow paints colors across the sky after the rain.
Wet, Drops, Cloud | Rain | Snow, Wind, Sun | Rain falls from a cloud in wet drops.
White, Cold, Flakes | Snow | Ice, Rain, Cloud | Snow falls in cold white flakes.
Carrot, Scarf, Snow | Snowman | Bunny, Mittens, Igloo | A snowman is made of snow with a carrot nose and a scarf.
Wheels, Yellow, Kids | School Bus | Taxi, Bike, Train | The big yellow school bus takes kids to school on its wheels.
Wings, Sky, Airport | Airplane | Bird, Kite, Helicopter | An airplane has wings, flies in the sky and lands at the airport.
Tracks, Choo, Engine | Train | Bus, Car, Truck | A train has an engine, rides on tracks and goes choo choo.
Siren, Ladder, Hose | Fire Truck | Ambulance, Police Car, Bus | A fire truck has a siren, a ladder and a hose to fight fires.
Pedals, Wheels, Helmet | Bike | Car, Skates, Wagon | You pedal a bike on two wheels and wear a helmet.
Sail, Water, Float | Boat | Kite, Duck, Car | A boat floats on the water and can have a sail.
Pillow, Blanket, Sleep | Bed | Couch, Chair, Bathtub | You sleep in a bed with a pillow and a blanket.
Bubbles, Water, Soap | Bath | Pool, Sink, Rain | A bath has warm water, soap and bubbles.
Teeth, Paste, Bathroom | Toothbrush | Comb, Spoon, Towel | You brush your teeth with toothpaste and a toothbrush in the bathroom.
Tick, Tock, Hands | Clock | Phone, Bell, Calendar | A clock goes tick tock and has hands that point to the time.
Pages, Read, Story | Book | TV, Pencil, Movie | A book has pages with a story to read.
Write, Eraser, Point | Pencil | Crayon, Paper, Book | A pencil has a sharp point for writing and an eraser on top.
Colors, Draw, Wax | Crayon | Pencil, Paint, Chalk | Crayons are colorful wax sticks for drawing.
Cut, Paper, Sharp | Scissors | Knife, Glue, Ruler | Sharp scissors cut paper.
Kick, Goal, Ball | Soccer | Baseball, Basketball, Tennis | In soccer you kick the ball into the goal.
Hoop, Bounce, Ball | Basketball | Soccer, Tennis, Bowling | In basketball you bounce the ball and shoot it through the hoop.
Bat, Ball, Base | Baseball | Soccer, Golf, Hockey | In baseball you hit the ball with a bat and run the bases.
Splash, Lifeguard, Diving | Pool | Bathtub, Puddle, Sink | A pool has a lifeguard, a diving board and lots of splashing.
Sand, Waves, Shells | Beach | Pool, Park, Desert | The beach has sand, waves and seashells.
Slide, Swings, Play | Playground | Pool, School, Zoo | A playground has slides and swings to play on.
Teacher, Desk, Learn | School | Library, Park, Home | At school a teacher helps you learn at your desk.
Animals, Cages, Visit | Zoo | Farm, Park, Pet Store | You visit animals in their homes at the zoo.
Barn, Tractor, Cows | Farm | Zoo, Park, City | A farm has a barn, a tractor and cows.
Books, Quiet, Borrow | Library | School, Store, Museum | At the quiet library you borrow books.
Doctor, Sick, Nurse | Hospital | School, Home, Store | Doctors and nurses help sick people at the hospital.
Cart, Food, Buy | Grocery Store | Restaurant, Farm, Kitchen | At the grocery store you fill a cart with food to buy.
Smoke, Hose, Brave | Firefighter | Police Officer, Doctor, Teacher | A brave firefighter sprays the hose at smoke and fire.
Badge, Whistle, Traffic | Police Officer | Firefighter, Coach, Farmer | A police officer wears a badge and blows a whistle to direct traffic.
Shots, Sick, Checkup | Doctor | Teacher, Dentist, Chef | A doctor gives checkups and shots and helps when you're sick.
Teeth, Floss, Chair | Dentist | Doctor, Barber, Teacher | A dentist checks your teeth while you sit in the big chair.
Cook, Hat, Kitchen | Chef | Farmer, Doctor, Painter | A chef wears a tall hat and cooks in the kitchen.
Letters, Mailbox, Stamps | Mail Carrier | Teacher, Pilot, Chef | A mail carrier brings letters with stamps to your mailbox.
Hammer, Nails, Build | Builder | Painter, Farmer, Chef | A builder uses a hammer and nails to build.
Red, Green, Cars | Traffic Light | Rainbow, Stop Sign, Car Wash | A traffic light turns red and green to tell cars to stop and go.
Toes, Shoes, Walk | Feet | Hands, Knees, Socks | You walk on your feet, with toes, inside your shoes.
Smell, Face, Sneeze | Nose | Eyes, Ears, Mouth | Your nose is on your face; you smell and sneeze with it.
See, Blink, Glasses | Eyes | Nose, Ears, Hands | You see and blink with your eyes, and glasses help them.
Hear, Listen, Earmuffs | Ears | Eyes, Nose, Mouth | You hear and listen with your ears, and earmuffs keep them warm.
Fingers, Clap, Wave | Hands | Feet, Toes, Arms | Your hands have fingers, and you clap and wave with them.
Smile, Teeth, Tongue | Mouth | Nose, Eyes, Ears | Your mouth has teeth and a tongue, and it makes a smile.
Buttons, Sleeves, Wear | Shirt | Shoes, Hat, Socks | You wear a shirt with sleeves and buttons.
Feet, Laces, Walk | Shoes | Socks, Gloves, Pants | Shoes go on your feet, tie with laces and help you walk.
Head, Sun, Wear | Hat | Shoes, Scarf, Umbrella | You wear a hat on your head to keep the sun off.
Cold, Hands, Warm | Mittens | Socks, Hat, Boots | Mittens keep your hands warm when it's cold.
Rain, Open, Dry | Umbrella | Raincoat, Puddle, Towel | You open an umbrella to stay dry in the rain.
Round, Bounce, Throw | Ball | Balloon, Frisbee, Rock | A ball is round, and you bounce and throw it.
Float, String, Pop | Balloon | Bubble, Kite, Ball | A balloon floats on a string and can pop.
Wind, String, Fly | Kite | Balloon, Airplane, Bird | A kite flies on a string when the wind blows.
Stuffed, Hug, Soft | Teddy Bear | Pillow, Blanket, Puppy | A teddy bear is soft and stuffed, great to hug.
Crown, Castle, Gown | Princess | Pirate, Knight, Witch | A princess wears a crown and a gown and lives in a castle.
Ship, Treasure, Parrot | Pirate | Wizard, Knight, Cowboy | A pirate sails a ship, hunts treasure and has a parrot.
Broom, Cauldron, Spell | Witch | Princess, Ghost, Fairy | A witch flies on a broom, stirs a cauldron and casts spells.
Wand, Wings, Sparkle | Fairy | Witch, Bee, Butterfly | A sparkly fairy has wings and a magic wand.
Fire, Wings, Scales | Dragon | Bird, Dinosaur, Fish | A dragon has scales and wings and breathes fire.
Horn, Rainbow, Magic | Unicorn | Horse, Rhino, Dragon | A magic unicorn has one horn and loves rainbows.
Boo, Sheet, Spooky | Ghost | Witch, Monster, Bat | A spooky ghost in a sheet says boo.
Roar, Big, Bones | Dinosaur | Lion, Dragon, Elephant | Big dinosaurs roared long ago, and now we find their bones.
Rocket, Space, Moon | Astronaut | Pilot, Alien, Robot | An astronaut rides a rocket into space, even to the moon.
Beep, Metal, Buttons | Robot | Car, Phone, Clock | A metal robot has buttons and goes beep boop.
Gift, Bow, Wrap | Present | Box, Card, Balloon | A present is a gift you wrap and top with a bow.
Tree, Santa, Gifts | Christmas | Birthday, Halloween, Easter | Christmas has a tree, Santa and gifts.
Costume, Candy, Pumpkin | Halloween | Christmas, Easter, Birthday | On Halloween you wear a costume, carve a pumpkin and get candy.
Eggs, Basket, Bunny | Easter | Halloween, Christmas, Birthday | Easter has a bunny, a basket and eggs to find.
Cake, Candles, Party | Birthday | Christmas, Wedding, Halloween | A birthday party has a cake with candles.
Green, Sour, Crunchy | Pickle | Lemon, Apple, Cucumber | A pickle is green, sour and crunchy.
Purple, Bunch, Vine | Grapes | Plums, Cherries, Blueberries | Purple grapes grow in bunches on a vine.
Round, Juicy, Peel | Orange | Pumpkin, Ball, Carrot | An orange is round and juicy, with a peel.
Green, Trees, Vegetable | Broccoli | Lettuce, Peas, Cucumber | Broccoli is a green vegetable that looks like little trees.
Yellow, Popcorn, Cob | Corn | Banana, Butter, Cheese | Yellow corn grows on a cob, and popcorn is made from it.
Chocolate, Chips, Milk | Cookie | Cake, Candy, Ice Cream | A chocolate chip cookie goes great with milk.
Sticky, Sweet, Bee | Honey | Syrup, Jam, Candy | Sweet, sticky honey is made by bees.
Bun, Mustard, Long | Hot Dog | Hamburger, Taco, Pickle | A long hot dog goes in a bun with mustard.
Eggs, Cluck, Farm | Chicken | Duck, Cow, Pig | A chicken on the farm clucks and lays eggs.
Trunk, Leaves, Branches | Tree | Flower, Bush, Grass | A tree has a trunk, branches and leaves.
Petals, Smell, Garden | Flower | Tree, Grass, Leaf | A flower in the garden has petals and smells nice.
Seeds, Dirt, Vegetables | Garden | Kitchen, Beach, Park | You plant seeds in the dirt of a garden to grow vegetables.
Marshmallows, Fire, Camping | Campfire | Fireplace, Oven, Candle | On a camping trip you roast marshmallows over a campfire.
Tent, Woods, Flashlight | Camping | Swimming, Fishing, Sledding | When you go camping you sleep in a tent in the woods with a flashlight.
Hill, Snow, Slide | Sledding | Swimming, Skating, Biking | Sledding is sliding down a snowy hill.
Rink, Skates, Spin | Ice Skating | Swimming, Dancing, Hockey | Ice skating is gliding and spinning around the rink in skates.
Moon, Rocket, Stars | Space | Ocean, Sky, Jungle | A rocket flies into space, out to the moon and stars.
Waves, Fish, Salty | Ocean | Lake, Pool, Bathtub | The ocean is salty, full of fish and waves.
Hot, Sand, Cactus | Desert | Beach, Jungle, Farm | A desert is hot and sandy, with cactus plants.
Vines, Monkeys, Rain | Jungle | Desert, Farm, Ocean | A jungle is rainy, with vines and monkeys.
Snow, Tall, Climb | Mountain | Tree, Ladder, Building | A mountain is tall and snowy at the top, and people climb it.
Sticks, Bang, Loud | Drum | Guitar, Piano, Flute | You bang a drum with sticks, and it's loud.
Strings, Strum, Rock | Guitar | Violin, Drum, Harp | You strum the strings of a guitar to rock out.
Keys, Black, White | Piano | Zebra, Guitar, Panda | A piano has black and white keys.
Sing, Loud, Stage | Microphone | Speaker, Guitar, Radio | A singer on stage uses a microphone to sing loud.
Paint, Brush, Picture | Artist | Chef, Builder, Singer | An artist paints a picture with a brush.
Song, Stage, Microphone | Singer | Dancer, Drummer, Chef | A singer sings a song on stage into a microphone.
Wiggle, Music, Twirl | Dance | Swim, Sleep, Read | When the music plays, you dance: wiggle and twirl!
Wet, Splash, Boots | Puddle | Pool, Bathtub, Ocean | You splash in a wet puddle with your boots on.
Cold, Cubes, Freezer | Ice | Snow, Water, Milk | Cold ice cubes are made in the freezer.
Drink, Cow, White | Milk | Juice, Water, Cheese | Milk is a white drink that comes from cows.
Orange, Squeeze, Drink | Juice | Milk, Soup, Water | Squeeze oranges to make juice to drink.
Bounce, Jump, Springs | Trampoline | Ball, Bed, Slide | A trampoline has springs so you can jump and bounce.
Push, High, Chains | Swing | Slide, Seesaw, Bike | Someone pushes you high on a swing that hangs from chains.
Ladder, Down, Whee | Slide | Swing, Stairs, Elevator | You climb the ladder and go down the slide: whee!
Up, Down, Buttons | Elevator | Stairs, Slide, Door | You push buttons to ride an elevator up and down.
Knock, Open, Handle | Door | Window, Drawer, Box | You knock on a door and open it with the handle.
Glass, See, Open | Window | Door, Mirror, Glasses | A window is glass you see through, and you can open it.
Me, Look, Glass | Mirror | Window, Camera, Picture | When you look in a glass mirror, you see me!
Hot, Cook, Bake | Oven | Fridge, Sink, Freezer | An oven gets hot to cook and bake food.
Cold, Food, Kitchen | Fridge | Oven, Sink, Cupboard | The fridge keeps food cold in the kitchen.
Watch, Shows, Remote | TV | Radio, Phone, Book | You watch shows on TV with a remote.
Ring, Talk, Call | Phone | Doorbell, Radio, TV | A phone rings when someone calls, and you talk.
Loose, Pillow, Coin | Tooth Fairy | Santa, Easter Bunny, Fairy Godmother | When a loose tooth comes out, put it under your pillow and the Tooth Fairy leaves a coin.
Sleigh, Reindeer, Chimney | Santa | Easter Bunny, Tooth Fairy, Elf | Santa flies a sleigh pulled by reindeer and comes down the chimney.
Hop, Eggs, Basket | Easter Bunny | Santa, Tooth Fairy, Kangaroo | The Easter Bunny hops along and hides eggs for your basket.
Pouch, Hop, Australia | Kangaroo | Bunny, Koala, Frog | A kangaroo from Australia hops and carries its baby in a pouch.
Spout, Ocean, Huge | Whale | Shark, Dolphin, Fish | A huge whale swims in the ocean and sprays water from its spout.
Ocean, Flip, Smart | Dolphin | Shark, Whale, Fish | A smart dolphin flips and plays in the ocean.
Ink, Eight, Arms | Octopus | Spider, Crab, Jellyfish | An octopus has eight arms and squirts ink.
Hump, Desert, Thirsty | Camel | Horse, Elephant, Snake | A camel has a hump and can go a long time without water in the desert.
Slow, Shell, Slime | Snail | Turtle, Slug, Worm | A snail is slow, slimy and carries a shell.
`),
  // Tier 2: 2nd–3rd grade (developing readers)
  2: parse(`
Hive, Busy, Sting | Bee | Wasp, Ant, Butterfly | Bees live in a hive, stay busy all day and can sting.
Pouch, Joey, Boxing | Kangaroo | Koala, Opossum, Rabbit | A kangaroo's baby, a joey, rides in its pouch, and kangaroos box with their feet.
Stripes, Jungle, Orange | Tiger | Zebra, Lion, Cheetah | A tiger is orange with black stripes and prowls the jungle.
Spots, Fastest, Savanna | Cheetah | Leopard, Giraffe, Zebra | The spotted cheetah is the fastest runner on the savanna.
Black, White, Bamboo | Panda | Zebra, Penguin, Skunk | A black and white panda munches on bamboo.
Eucalyptus, Sleepy, Australia | Koala | Kangaroo, Sloth, Panda | Sleepy koalas in Australia eat eucalyptus leaves.
Slow, Hanging, Rainforest | Sloth | Monkey, Koala, Snail | A slow sloth spends its life hanging in rainforest trees.
Smell, Stripe, Spray | Skunk | Raccoon, Zebra, Badger | A skunk has a white stripe and sprays a terrible smell.
Mask, Trash, Night | Raccoon | Skunk, Opossum, Squirrel | A raccoon has a black mask and digs through trash at night.
Dam, Teeth, Wood | Beaver | Woodpecker, Squirrel, Otter | A beaver chews wood with big teeth to build a dam.
Acorns, Bushy, Tree | Squirrel | Rabbit, Beaver, Owl | A squirrel with a bushy tail stashes acorns up in a tree.
Spines, Curl, Tiny | Hedgehog | Porcupine, Armadillo, Mouse | A tiny hedgehog is covered in spines and curls into a ball.
Antlers, Forest, Fawn | Deer | Moose, Goat, Horse | A deer lives in the forest; the dad has antlers and the baby is a fawn.
Gills, Fins, Scales | Fish | Frog, Snake, Whale | A fish breathes with gills, swims with fins and has scales.
Tadpole, Pond, Croak | Frog | Fish, Turtle, Duck | A frog starts life as a tadpole in a pond and grows up to croak.
Chrysalis, Wings, Caterpillar | Butterfly | Moth, Bee, Dragonfly | A caterpillar makes a chrysalis and comes out a butterfly with wings.
Nocturnal, Hoot, Feathers | Owl | Bat, Hawk, Eagle | An owl is a nocturnal bird with feathers that hoots.
Echo, Night, Cave | Bat | Owl, Bear, Spider | A bat sleeps in a cave and flies at night, finding its way by echoes.
Hump, Desert, Thirsty | Camel | Horse, Llama, Elephant | A camel stores fat in its hump and can go days in the desert without a drink.
Tusks, Ivory, Herd | Elephant | Giraffe, Rhino, Hippo | Elephants travel in herds, and their tusks are made of ivory.
Horn, Gray, Charge | Rhino | Elephant, Hippo, Bull | A gray rhino lowers its horn and charges.
River, Huge, Yawn | Hippo | Crocodile, Elephant, Rhino | A huge hippo wallows in the river and opens its mouth in a giant yawn.
Arctic, White, Seals | Polar Bear | Penguin, Walrus, Arctic Fox | The white polar bear hunts seals in the Arctic.
Tusks, Whiskers, Ice | Walrus | Seal, Polar Bear, Elephant | A walrus has long tusks and whiskers and lounges on the ice.
Antarctica, Tuxedo, Waddle | Penguin | Puffin, Seal, Duck | Penguins in Antarctica look like they wear tuxedos and they waddle.
Pack, Howl, Moon | Wolf | Dog, Fox, Owl | Wolves live in packs and howl at the moon.
Sly, Bushy, Red | Fox | Wolf, Squirrel, Cardinal | A sly red fox has a bushy tail.
Venom, Rattle, Desert | Rattlesnake | Cobra, Scorpion, Lizard | A rattlesnake lives in the desert, shakes its rattle and has venom.
Colors, Tongue, Change | Chameleon | Lizard, Frog, Octopus | A chameleon changes colors and catches bugs with its long tongue.
Eight, Ink, Suckers | Octopus | Squid, Jellyfish, Starfish | An octopus has eight arms covered in suckers and squirts ink.
Sting, Tentacles, Clear | Jellyfish | Octopus, Squid, Shrimp | A see-through jellyfish stings with its tentacles.
Arms, Regrow, Tidepool | Starfish | Crab, Octopus, Sea Urchin | A starfish in a tidepool can regrow its arms.
Claws, Antennae, Tail | Lobster | Crab, Shrimp, Scorpion | A lobster has big claws, long antennae and a tail.
Pearl, Shell, Ocean | Oyster | Clam, Snail, Crab | An oyster in the ocean can grow a pearl inside its shell.
Brain, Heart, Lungs | Organs | Bones, Muscles, Senses | The brain, heart and lungs are organs inside your body.
Skull, Ribs, Spine | Skeleton | Muscles, Organs, Skin | Your skull, ribs and spine are all part of your skeleton.
Taste, Smell, Touch | Senses | Organs, Bones, Feelings | Taste, smell and touch are three of your five senses.
Pump, Beat, Blood | Heart | Lungs, Brain, Stomach | Your heart beats to pump blood around your body.
Breathe, Air, Chest | Lungs | Heart, Nose, Stomach | Your lungs fill with air in your chest when you breathe.
Think, Skull, Memory | Brain | Heart, Lungs, Eyes | Your brain sits in your skull; you think and remember with it.
Digest, Food, Growl | Stomach | Heart, Teeth, Brain | Your stomach digests food, and it growls when you're hungry.
Solid, Liquid, Gas | Matter | Weather, Energy, Shapes | Everything is matter, and it can be a solid, a liquid or a gas.
Melt, Freeze, Cube | Ice | Snow, Water, Steam | An ice cube is frozen water, and it melts when it warms up.
Boil, Kettle, Hot | Steam | Smoke, Fog, Ice | Hot water boiling in a kettle makes steam.
Thunder, Flash, Storm | Lightning | Rain, Tornado, Hail | Lightning flashes in a storm, and thunder follows.
Funnel, Spin, Wind | Tornado | Hurricane, Blizzard, Thunderstorm | A tornado is a spinning funnel of wind.
Snow, Wind, Whiteout | Blizzard | Tornado, Hail, Avalanche | A blizzard blows so much snow and wind that everything goes white.
Erupt, Lava, Mountain | Volcano | Earthquake, Geyser, Glacier | A volcano is a mountain that erupts lava.
Shake, Ground, Crack | Earthquake | Volcano, Tornado, Avalanche | In an earthquake the ground shakes and can crack.
Bones, Rock, Ancient | Fossil | Skeleton, Crystal, Dinosaur | A fossil is an ancient bone or shell turned to rock.
Planets, Sun, Orbit | Solar System | Galaxy, Moon, Universe | In our solar system, the planets orbit the sun.
Red, Rover, Planet | Mars | Jupiter, Venus, Moon | Mars is the red planet, explored by rovers.
Rings, Gas, Planet | Saturn | Jupiter, Neptune, Uranus | Saturn is a gas planet famous for its rings.
Biggest, Storm, Planet | Jupiter | Saturn, Earth, Sun | Jupiter is the biggest planet, with a giant storm called the Great Red Spot.
Tail, Ice, Space | Comet | Meteor, Star, Planet | A comet is a ball of ice in space with a glowing tail.
Lens, Stars, Far | Telescope | Microscope, Glasses, Camera | A telescope's lens lets you see far away stars.
Lens, Tiny, Germs | Microscope | Telescope, Magnifying Glass, Camera | A microscope's lens shows tiny things like germs.
Temperature, Fever, Degrees | Thermometer | Ruler, Clock, Scale | A thermometer measures temperature in degrees, like when you have a fever.
North, Needle, Direction | Compass | Map, Clock, Magnet | A compass needle points north to show direction.
Attract, Metal, Fridge | Magnet | Compass, Glue, Battery | A magnet attracts metal and sticks to the fridge.
Power, Charge, Remote | Battery | Plug, Magnet, Light Bulb | A battery gives power to a remote and can be charged.
Edison, Glow, Lamp | Light Bulb | Candle, Flashlight, Battery | Thomas Edison made a light bulb that glows in a lamp.
Roots, Stem, Leaves | Plant | Rock, Mushroom, Worm | A plant has roots, a stem and leaves.
Nectar, Pollen, Petals | Flower | Leaf, Tree, Bee | A flower has petals, pollen and sweet nectar.
Seed, Oak, Squirrel | Acorn | Pinecone, Walnut, Apple | An acorn is the seed of an oak tree, and squirrels love them.
Cones, Needles, Evergreen | Pine Tree | Oak Tree, Palm Tree, Cactus | A pine tree is an evergreen with needles and cones.
Desert, Spines, Water | Cactus | Pine Tree, Palm Tree, Rose | A cactus stores water in the desert and has spines.
Coconut, Beach, Fronds | Palm Tree | Pine Tree, Banana, Cactus | A palm tree has long fronds and coconuts and grows by the beach.
Trunk, Rings, Bark | Tree | Elephant, Saturn, Dog | A tree has a trunk, growth rings and bark. Sneaky: an elephant has a trunk, Saturn has rings and a dog barks!
Badge, Patrol, Arrest | Police Officer | Firefighter, Lifeguard, Mail Carrier | A police officer wears a badge, goes on patrol and can arrest people.
Hose, Ladder, Station | Firefighter | Police Officer, Gardener, Painter | A firefighter works at the fire station with a hose and a ladder.
Stethoscope, Checkup, Fever | Doctor | Dentist, Teacher, Chef | A doctor listens with a stethoscope, gives checkups and helps with a fever.
Pets, Animal, Clinic | Veterinarian | Doctor, Zookeeper, Farmer | A veterinarian takes care of pets at an animal clinic.
Cavity, Floss, Drill | Dentist | Doctor, Builder, Barber | A dentist fixes cavities with a drill and reminds you to floss.
Haircut, Scissors, Chair | Barber | Tailor, Dentist, Chef | A barber gives you a haircut with scissors while you sit in the chair.
Recipe, Apron, Stove | Chef | Waiter, Farmer, Grocer | A chef wears an apron and follows a recipe at the stove.
Bread, Oven, Dough | Baker | Farmer, Butcher, Grocer | A baker kneads dough and bakes bread in the oven.
Crops, Tractor, Harvest | Farmer | Gardener, Mechanic, Miner | A farmer drives a tractor to harvest crops.
Cockpit, Runway, Fly | Pilot | Astronaut, Flight Attendant, Captain | A pilot flies the plane from the cockpit and lands on the runway.
Wrench, Engine, Garage | Mechanic | Plumber, Pilot, Builder | A mechanic fixes car engines in a garage with a wrench.
Pipes, Leak, Wrench | Plumber | Mechanic, Electrician, Firefighter | A plumber fixes leaky pipes with a wrench.
Wires, Power, Outlet | Electrician | Plumber, Mechanic, Engineer | An electrician works with wires, power and outlets.
Books, Shelves, Checkout | Librarian | Teacher, Cashier, Author | A librarian keeps books on the shelves and helps you check them out.
Lesson, Classroom, Grades | Teacher | Principal, Librarian, Student | A teacher plans lessons for the classroom and gives grades.
Whistle, Pool, Rescue | Lifeguard | Coach, Firefighter, Swimmer | A lifeguard watches the pool, blows a whistle and rescues swimmers.
Envelope, Route, Deliver | Mail Carrier | Delivery Driver, Bus Driver, Pilot | A mail carrier walks a route to deliver envelopes.
Gavel, Court, Robe | Judge | Lawyer, Police Officer, Wizard | A judge wears a robe in court and bangs a gavel.
Map, Explore, Unknown | Explorer | Pirate, Pilot, Scientist | An explorer uses a map to explore the unknown.
Experiment, Lab, Goggles | Scientist | Doctor, Chef, Teacher | A scientist does experiments in a lab wearing goggles.
Canvas, Easel, Brush | Artist | Builder, Writer, Photographer | An artist paints on a canvas set on an easel with a brush.
Camera, Click, Pose | Photographer | Painter, Actor, Reporter | A photographer says pose and clicks the camera.
Stage, Script, Role | Actor | Singer, Director, Dancer | An actor learns a script and plays a role on stage.
Dribble, Hoop, Court | Basketball | Tennis, Soccer, Volleyball | In basketball you dribble down the court and shoot at the hoop.
Racket, Net, Serve | Tennis | Volleyball, Baseball, Golf | In tennis you serve the ball over a net with a racket.
Puck, Stick, Ice | Hockey | Golf, Skating, Lacrosse | Hockey players hit a puck with a stick on the ice.
Putt, Tee, Hole | Golf | Baseball, Bowling, Soccer | In golf you start on a tee and putt the ball into the hole.
Pins, Lane, Strike | Bowling | Baseball, Swimming, Sewing | In bowling you roll down the lane to knock down pins for a strike.
Touchdown, Helmet, Quarterback | Football | Baseball, Hockey, Soccer | In football the quarterback throws for a touchdown, and everyone wears a helmet.
Inning, Pitcher, Glove | Baseball | Football, Basketball, Golf | Baseball has innings, a pitcher and a glove for catching.
Goalie, Kick, Field | Soccer | Hockey, Football, Baseball | Soccer players kick the ball down the field past the goalie.
Medal, Torch, Athletes | Olympics | Super Bowl, World Series, Marathon | At the Olympics the torch is lit and athletes win medals.
Mat, Flip, Beam | Gymnastics | Wrestling, Yoga, Diving | Gymnasts flip on the mat and balance on the beam.
Belt, Kick, Dojo | Karate | Boxing, Soccer, Wrestling | In karate you learn kicks at a dojo and earn colored belts.
Gloves, Ring, Punch | Boxing | Wrestling, Karate, Baseball | Boxers wear gloves and punch in a ring.
Board, Waves, Wipeout | Surfing | Skateboarding, Swimming, Sailing | Surfers ride waves on a board until they wipe out.
Wheels, Ramp, Board | Skateboarding | Surfing, Biking, Skiing | A skateboard is a board on wheels you ride up a ramp.
Poles, Slopes, Snow | Skiing | Sledding, Snowboarding, Hockey | Skiers use poles to zoom down snowy slopes.
Map, Globe, Countries | Geography | History, Math, Science | Geography is learning about countries with maps and globes.
Plus, Minus, Equal | Math | Science, Reading, Music | Plus, minus and equal signs are all part of math.
Nouns, Verbs, Sentences | Grammar | Math, Spelling, Science | Grammar is how nouns and verbs fit together in sentences.
Rhyme, Lines, Poet | Poem | Song, Story, Letter | A poet writes a poem in lines that often rhyme.
Chapters, Author, Cover | Book | Movie, Magazine, Newspaper | A book has an author, chapters and a cover.
Headlines, Reporter, Paper | Newspaper | Magazine, Book, Letter | A newspaper has headlines written by reporters, printed on paper.
Stamp, Address, Envelope | Letter | Email, Package, Newspaper | You mail a letter in an envelope with an address and a stamp.
Recess, Lunch, Bell | School | Library, Park, Camp | At school the bell rings for lunch and recess.
Exhibits, Dinosaurs, Tour | Museum | Zoo, Library, Park | A museum has exhibits, like dinosaurs, and you can take a tour.
Rides, Tickets, Coaster | Amusement Park | Zoo, Airport, Movie Theater | An amusement park has rides like roller coasters, and you need tickets.
Popcorn, Screen, Tickets | Movie Theater | Circus, Stadium, Arcade | At a movie theater you buy tickets and popcorn and watch the big screen.
Clowns, Tent, Acrobats | Circus | Zoo, Parade, Rodeo | A circus has clowns and acrobats under a big tent.
Runway, Gate, Luggage | Airport | Train Station, Bus Stop, Hotel | At the airport you check your luggage, wait at the gate and take off from the runway.
Platform, Tracks, Conductor | Train Station | Airport, Orchestra, Bus Stop | At a train station you wait on the platform, and the conductor punches tickets.
Lobby, Vacation, Keycard | Hotel | Airport, Hospital, School | On vacation you check in at the hotel lobby and get a keycard.
Nurses, Emergency, Ambulance | Hospital | Fire Station, Police Station, School | An ambulance rushes to the hospital, where nurses help in an emergency.
Badge, Jail, Officers | Police Station | Fire Station, Courthouse, Post Office | Officers with badges work at the police station, which has a jail.
Stamps, Mail, Packages | Post Office | Bank, Library, Grocery Store | The post office sends mail and packages, and sells stamps.
Money, Vault, Teller | Bank | Store, Museum, Post Office | A bank keeps money in a vault, and a teller helps you.
Aisles, Cart, Checkout | Grocery Store | Library, Bowling Alley, Airport | At the grocery store you push a cart down the aisles to the checkout.
Beam, Ships, Rocky | Lighthouse | Flashlight, Castle, Bridge | A lighthouse shines its beam to keep ships off the rocky shore.
Moat, Tower, King | Castle | Church, Lighthouse, Barn | A king lives in a castle with towers and a moat.
Igloo, Polar, Ice | North Pole | Desert, Rainforest, Island | The icy North Pole is polar bear country, and igloos are built of ice and snow.
Sand, Camels, Dunes | Desert | Beach, Savanna, Canyon | A desert has sand dunes and camels.
Canopy, Parrots, Humid | Rainforest | Desert, Ocean, Tundra | A rainforest is humid, with parrots high in the canopy.
Grass, Lions, Zebras | Savanna | Jungle, Desert, Farm | The grassy savanna is home to lions and zebras.
Coral, Scuba, Salt | Ocean | Lake, River, Pond | Divers scuba dive to see coral in the salty ocean.
Canoe, Current, Banks | River | Ocean, Lake, Pond | A river has a current and banks, and you can paddle it in a canoe.
Hibernate, Winter, Den | Bear | Wolf, Fox, Squirrel | A bear sleeps all winter in its den. That's called hibernating.
Migrate, Honk, Flock | Geese | Owls, Bats, Bees | Geese fly in a flock, honking as they migrate south.
Hatch, Shell, Yolk | Egg | Chick, Nest, Turtle | An egg has a shell and a yolk, and a baby can hatch from it.
Web, Silk, Fly | Spider | Ant, Bee, Ladybug | A spider spins a web out of silk to catch a fly.
Colony, Tunnels, Queen | Ant | Bee, Worm, Mole | Ants live in a colony with a queen and dig tunnels.
Glow, Summer, Night | Firefly | Moth, Star, Bat | Fireflies glow on summer nights.
Shell, Slime, Slow | Snail | Slug, Turtle, Worm | A snail is slow, slimy and lives in a shell.
Hop, Chirp, Green | Grasshopper | Frog, Bird, Caterpillar | A green grasshopper hops and chirps in the grass.
Pumpkin, Turkey, Pilgrims | Thanksgiving | Halloween, Christmas, Fourth of July | Thanksgiving has turkey and pumpkin pie and remembers the Pilgrims.
Fireworks, Flag, Independence | Fourth of July | New Year's Eve, Memorial Day, Thanksgiving | On the Fourth of July, Independence Day, we wave flags and watch fireworks.
Shamrock, Leprechaun, Green | St. Patrick's Day | Easter, Earth Day, Halloween | On St. Patrick's Day you wear green and look for leprechauns and shamrocks.
Hearts, Cards, Cupid | Valentine's Day | Birthday, Mother's Day, Wedding | Valentine's Day has hearts, cards and Cupid.
Countdown, Midnight, Confetti | New Year's Eve | Halloween, Fourth of July, Christmas Eve | On New Year's Eve you count down to midnight and throw confetti.
Shadow, February, Spring | Groundhog Day | Valentine's Day, Earth Day, St. Patrick's Day | On Groundhog Day in February, the groundhog's shadow tells us if spring is coming.
Recycle, Trees, Planet | Earth Day | Labor Day, Thanksgiving, Groundhog Day | On Earth Day we recycle and plant trees to help the planet.
Menorah, Dreidel, Latkes | Hanukkah | Christmas, Kwanzaa, Diwali | Hanukkah has a menorah, spinning dreidels and latkes.
Lanterns, Dragon, Envelopes | Lunar New Year | Halloween, Diwali, Fourth of July | Lunar New Year has lanterns, dragon dances and red envelopes.
Lamps, Rangoli, Lights | Diwali | Hanukkah, Christmas, Lunar New Year | Diwali, the festival of lights, has little lamps and colorful rangoli art.
Strings, Bow, Chin | Violin | Guitar, Cello, Flute | You tuck a violin under your chin and play the strings with a bow.
Brass, Valves, Toot | Trumpet | Flute, Drum, Violin | A trumpet is a brass instrument with valves that toots.
Keys, Pedals, Grand | Piano | Guitar, Harp, Drum | A grand piano has keys and pedals.
Conductor, Violins, Symphony | Orchestra | Band, Choir, Train | An orchestra full of violins plays a symphony, led by a conductor.
Uniforms, Parade, Drums | Marching Band | Orchestra, Choir, Circus | A marching band wears uniforms and drums down the street in a parade.
Altos, Sopranos, Sing | Choir | Orchestra, Band, Audience | A choir has sopranos and altos who sing together.
Wand, Glasses, Scar | Harry Potter | Merlin, Peter Pan, Gandalf | Harry Potter has glasses, a lightning scar and a magic wand.
Glass, Slipper, Midnight | Cinderella | Snow White, Rapunzel, Belle | Cinderella leaves the ball at midnight and loses her glass slipper.
Tower, Hair, Long | Rapunzel | Cinderella, Ariel, Elsa | Rapunzel lets down her long hair from the tower.
Apple, Dwarfs, Mirror | Snow White | Cinderella, Sleeping Beauty, Rapunzel | Snow White lives with seven dwarfs and bites a poisoned apple, all because of a magic mirror.
Giant, Harp, Beans | Jack and the Beanstalk | Three Little Pigs, Goldilocks, Hansel and Gretel | Jack trades for magic beans, climbs to the giant and grabs the golden harp.
Porridge, Chairs, Bears | Goldilocks | Little Red Riding Hood, Snow White, Hansel and Gretel | Goldilocks tries the three bears' porridge and chairs.
Wolf, Straw, Bricks | Three Little Pigs | Little Red Riding Hood, Goldilocks, Gingerbread Man | The wolf blows down the straw house, but not the house of bricks.
Grandma, Wolf, Basket | Little Red Riding Hood | Three Little Pigs, Goldilocks, Hansel and Gretel | Little Red Riding Hood carries a basket to Grandma, but the wolf gets there first.
Candy, Witch, Breadcrumbs | Hansel and Gretel | Snow White, Halloween, Goldilocks | Hansel and Gretel drop breadcrumbs and find a witch's candy house.
`),
  // Tier 3: Middle school (grades 6–8)
  3: parse(`
Eruption, Magma, Crust | Volcano | Earthquake, Tornado, Glacier | Magma pushes up through Earth's crust until the volcano erupts.
Simile, Metaphor, Hyperbole | Figurative Language | Punctuation, Plot, Dialogue | Similes, metaphors and hyperbole are all figurative language: words that mean more than they say.
Exposition, Climax, Resolution | Plot | Theme, Setting, Character | A story's plot runs from exposition up to the climax and down to the resolution.
Hero, Villain, Sidekick | Characters | Setting, Plot, Theme | Heroes, villains and sidekicks are all characters in a story.
Time, Place, Mood | Setting | Plot, Theme, Character | A story's setting is its time and place, and it sets the mood.
Lesson, Message, Moral | Theme | Plot, Setting, Title | A theme is the lesson or message of a story, like a moral.
Buzz, Sizzle, Boom | Onomatopoeia | Alliteration, Rhyme, Hyperbole | Buzz, sizzle and boom sound like what they mean. That's onomatopoeia.
Peter, Piper, Picked | Alliteration | Rhyme, Onomatopoeia, Simile | Peter Piper picked: repeating the same first sound is alliteration.
Evaporation, Condensation, Precipitation | Water Cycle | Rock Cycle, Food Chain, Photosynthesis | Water evaporates, condenses into clouds and falls as precipitation: the water cycle.
Sunlight, Chlorophyll, Glucose | Photosynthesis | Respiration, Digestion, Evaporation | In photosynthesis, chlorophyll uses sunlight to make glucose.
Producer, Consumer, Decomposer | Food Chain | Water Cycle, Supply Chain, Solar System | A food chain links producers, consumers and decomposers. A supply chain has producers and consumers too, but no decomposers!
Solid, Liquid, Plasma | States of Matter | Elements, Phases of the Moon, Energy | Solid, liquid, gas and plasma are the states of matter.
Proton, Neutron, Electron | Atom | Molecule, Cell, Magnet | An atom is made of protons, neutrons and electrons.
Nucleus, Membrane, Cytoplasm | Cell | Atom, Organ, Tissue | A cell has a nucleus and cytoplasm wrapped in a membrane. (Atoms have a nucleus, but no membrane!)
Igneous, Sedimentary, Metamorphic | Rocks | Clouds, Minerals, Fossils | Igneous, sedimentary and metamorphic are the three kinds of rock.
Cumulus, Stratus, Cirrus | Clouds | Rocks, Stars, Winds | Cumulus, stratus and cirrus are types of clouds.
Rings, Moons, Orbit | Planet | Star, Comet, Galaxy | A planet orbits a star and can have moons and rings.
Phases, Tides, Craters | Moon | Sun, Comet, Asteroid | The moon has phases and craters, and its pull makes the tides.
Supply, Demand, Price | Economics | Geography, Biology, Government | Supply and demand set prices. That's economics.
Executive, Legislative, Judicial | Branches of Government | Political Parties, Bill of Rights, Elections | The executive, legislative and judicial are the three branches of government.
Senators, Representatives, Capitol | Congress | Supreme Court, Cabinet, White House | Congress is made of senators and representatives and meets in the Capitol.
Pharaoh, Pyramid, Nile | Ancient Egypt | Ancient Greece, Ancient Rome, Mesopotamia | Ancient Egypt had pharaohs, pyramids and the Nile River.
Gladiator, Colosseum, Caesar | Ancient Rome | Ancient Greece, Ancient Egypt, Vikings | Ancient Rome had Caesar, and gladiators fought in the Colosseum.
Olympics, Democracy, Athens | Ancient Greece | Ancient Rome, Ancient Egypt, Ancient China | Ancient Greece gave us the Olympics, and democracy started in Athens.
Longship, Norse, Raid | Vikings | Pirates, Samurai, Knights | Norse Vikings sailed longships to raid coastal towns.
Shogun, Katana, Honor | Samurai | Ninja, Knight, Viking | Samurai carried katanas, served the shogun and lived by a code of honor.
Armor, Joust, Castle | Knight | Samurai, Gladiator, Viking | A medieval knight wore armor, jousted and guarded the castle.
Mayflower, Plymouth, Colony | Pilgrims | Conquistadors, Vikings, Pioneers | The Pilgrims sailed the Mayflower and founded Plymouth Colony.
Wagon, Frontier, Oregon | Pioneers | Pilgrims, Vikings, Astronauts | Pioneers crossed the frontier in covered wagons on the Oregon Trail.
Torch, Crown, Harbor | Statue of Liberty | Lighthouse, Liberty Bell, Mount Rushmore | The Statue of Liberty wears a crown and holds her torch over New York Harbor.
Crack, Philadelphia, Ring | Liberty Bell | Statue of Liberty, Independence Hall, Grand Canyon | The cracked Liberty Bell in Philadelphia rang for independence.
Presidents, Granite, Dakota | Mount Rushmore | Lincoln Memorial, Washington Monument, Grand Canyon | Four presidents are carved in granite at Mount Rushmore in South Dakota.
Gorge, Colorado, Arizona | Grand Canyon | Rocky Mountains, Death Valley, Niagara Falls | The Colorado River carved the Grand Canyon, a giant gorge in Arizona.
Barrel, Canada, Mist | Niagara Falls | Victoria Falls, Angel Falls, Yosemite | Niagara Falls sits on the Canada border and sprays a huge mist, and daredevils have gone over it in barrels.
Amazon, Nile, Mississippi | Rivers | Lakes, Oceans, Mountains | The Amazon, Nile and Mississippi are famous rivers.
Everest, K2, Kilimanjaro | Mountains | Volcanoes, Rivers, Deserts | Everest, K2 and Kilimanjaro are some of the world's tallest mountains.
Sahara, Gobi, Mojave | Deserts | Mountains, Rivers, Rainforests | The Sahara, Gobi and Mojave are deserts.
Pacific, Atlantic, Arctic | Oceans | Continents, Seas, Countries | The Pacific, Atlantic and Arctic are oceans.
Equator, Latitude, Longitude | Globe | Compass, Calendar, Clock | A globe is marked with the equator and lines of latitude and longitude.
Continent, Kangaroo, Outback | Australia | Africa, New Zealand, Antarctica | Australia is a country and a continent, home to kangaroos and the Outback.
Penguins, Ice, South | Antarctica | Arctic, Greenland, Alaska | Icy Antarctica, far south, is where you find penguins (the Arctic has none).
Pyramids, Sphinx, Cairo | Egypt | Mexico, Greece, Iraq | Egypt has the Pyramids, the Sphinx and its capital, Cairo.
Kimono, Sushi, Tokyo | Japan | China, Korea, Thailand | Japan is known for kimonos, sushi and its capital, Tokyo.
Pasta, Pisa, Rome | Italy | Greece, France, Spain | Italy has pasta, the Leaning Tower of Pisa and Rome.
Croissant, Eiffel, Louvre | France | Italy, Belgium, Spain | France has croissants, the Eiffel Tower and the Louvre museum.
Maple, Hockey, Moose | Canada | Alaska, Norway, Russia | Canada has a maple leaf on its flag, loves hockey and has plenty of moose.
Tacos, Mariachi, Piñata | Mexico | Spain, Peru, Brazil | Tacos, mariachi bands and piñatas all come from Mexico.
Samba, Amazon, Carnival | Brazil | Mexico, Peru, Argentina | Brazil is the home of samba, Carnival and most of the Amazon rainforest.
Patriots, Independence, Redcoats | American Revolution | Civil War, World War I, French Revolution | In the American Revolution, the Patriots fought the Redcoats for independence.
Union, Confederacy, Gettysburg | Civil War | Revolutionary War, World War II, War of 1812 | The Union fought the Confederacy in the Civil War, including at Gettysburg.
Bus, Seat, Montgomery | Rosa Parks | Harriet Tubman, Ruby Bridges, Sojourner Truth | Rosa Parks refused to give up her bus seat in Montgomery, Alabama.
Dream, Speech, Washington | Martin Luther King Jr. | Abraham Lincoln, George Washington, Rosa Parks | Martin Luther King Jr. gave his "I Have a Dream" speech at the March on Washington.
Railroad, Underground, Freedom | Harriet Tubman | Frederick Douglass, Rosa Parks, Abraham Lincoln | Harriet Tubman led enslaved people to freedom on the Underground Railroad.
Kite, Key, Lightning | Benjamin Franklin | Thomas Edison, Isaac Newton, Albert Einstein | Benjamin Franklin flew a kite with a key in a storm to study lightning.
Apple, Gravity, Laws | Isaac Newton | Albert Einstein, Galileo, Benjamin Franklin | A falling apple got Isaac Newton thinking about gravity, and he wrote the laws of motion.
Relativity, Genius, E=mc² | Albert Einstein | Isaac Newton, Marie Curie, Stephen Hawking | Albert Einstein, the famous genius, came up with relativity and E=mc².
Radium, Nobel, Polonium | Marie Curie | Albert Einstein, Ada Lovelace, Rosalind Franklin | Marie Curie discovered radium and polonium and won two Nobel Prizes.
Telescope, Moons, Pisa | Galileo | Copernicus, Newton, Columbus | Galileo, from Pisa, used a telescope to spot Jupiter's moons.
Aviator, Atlantic, Disappeared | Amelia Earhart | Wright Brothers, Charles Lindbergh, Sally Ride | Aviator Amelia Earhart flew solo across the Atlantic and later disappeared over the Pacific.
Airplane, Bicycles, Ohio | Wright Brothers | Lewis and Clark, Amelia Earhart, Thomas Edison | The Wright brothers ran a bicycle shop in Ohio before they flew the first airplane.
Expedition, Louisiana, Sacagawea | Lewis and Clark | Pilgrims, Pioneers, Columbus | Lewis and Clark explored the Louisiana Purchase with Sacagawea as their guide.
Shells, Pizza, Sewer | Ninja Turtles | Power Rangers, Avengers, Transformers | The pizza-loving Ninja Turtles hide in their shells and live in the sewer.
Wand, Hogwarts, Muggle | Harry Potter | Lord of the Rings, Narnia, Percy Jackson | Harry Potter has wands, Hogwarts and muggles.
Ring, Hobbit, Mordor | Lord of the Rings | Harry Potter, Narnia, Star Wars | In The Lord of the Rings, a hobbit carries the One Ring to Mordor.
Wardrobe, Lion, Witch | Narnia | The Wizard of Oz, Harry Potter, Wonderland | You reach Narnia through a wardrobe and meet a lion and a witch. Oz has a lion and witches, but no wardrobe!
Tornado, Ruby, Emerald | The Wizard of Oz | Narnia, Wonderland, Willy Wonka | In The Wizard of Oz, a tornado carries Dorothy off; she wears ruby slippers to the Emerald City.
Rabbit, Tea, Queen | Alice in Wonderland | Narnia, Peter Pan, The Wizard of Oz | Alice follows the White Rabbit, goes to a tea party and meets the Queen of Hearts.
Lightsaber, Force, Jedi | Star Wars | Star Trek, Avengers, Transformers | Star Wars has Jedi with lightsabers who use the Force.
Shield, Hammer, Assemble | Avengers | Justice League, X-Men, Fantastic Four | Captain America's shield, Thor's hammer: Avengers, assemble!
Mutant, Professor, Wolverine | X-Men | Avengers, Justice League, Transformers | The X-Men are mutants like Wolverine, trained by Professor X.
Batman, Wonder, Superman | Justice League | Avengers, X-Men, Fantastic Four | Batman, Wonder Woman and Superman are the Justice League.
Creeper, Pickaxe, Blocks | Minecraft | Roblox, Fortnite, Terraria | In Minecraft you mine blocks with a pickaxe and run from creepers.
Bus, Storm, Royale | Fortnite | Minecraft, Among Us, Apex Legends | In Fortnite you jump off the battle bus and outrun the storm in a battle royale.
Impostor, Vent, Crewmate | Among Us | Fortnite, Roblox, Minecraft | In Among Us, the impostor sneaks through vents to trick the crewmates.
Syllables, Seventeen, Japanese | Haiku | Sonnet, Limerick, Ballad | A haiku is a Japanese poem with 17 syllables.
Fourteen, Shakespeare, Lines | Sonnet | Haiku, Play, Limerick | A sonnet has 14 lines, and Shakespeare wrote famous ones.
Big, Huge, Giant | Synonyms | Antonyms, Homophones, Verbs | Big, huge and giant mean the same thing: they're synonyms.
Their, There, They're | Homophones | Synonyms, Antonyms, Contractions | Their, there and they're sound the same but mean different things: homophones. Only one is a contraction!
Can't, Won't, Didn't | Contractions | Homophones, Prefixes, Adjectives | Can't, won't and didn't are contractions: two words squeezed into one.
Un, Re, Pre | Prefixes | Suffixes, Vowels, Syllables | Un-, re- and pre- go at the start of words: prefixes.
Ing, Ness, Ful | Suffixes | Prefixes, Roots, Vowels | -ing, -ness and -ful go at the end of words: suffixes.
Triangle, Square, Pentagon | Polygons | Prisms, Angles, Lines | Triangles, squares and pentagons are polygons: flat shapes with straight sides.
Acute, Obtuse, Protractor | Angles | Triangles, Fractions, Circles | Acute and obtuse are kinds of angles, and you measure them with a protractor.
Radius, Diameter, Pi | Circle | Square, Triangle, Rectangle | A circle has a radius and a diameter, and pi connects them to its size.
Numerator, Denominator, Half | Fraction | Decimal, Percent, Ratio | A fraction like one half has a numerator on top and a denominator on the bottom.
Mean, Median, Mode | Averages | Fractions, Geometry, Ratios | Mean, median and mode are three ways to find an average.
Variable, Equation, Solve | Algebra | Geometry, Statistics, Calculus | In algebra you solve equations to find the variable.
Hypothesis, Variable, Conclusion | Scientific Method | Water Cycle, Book Report, Algebra | The scientific method goes from a hypothesis through testing variables to a conclusion.
Predators, Prey, Habitat | Ecosystem | Solar System, Atmosphere, Food Pyramid | An ecosystem is a habitat where predators and prey live together.
Herbivore, Carnivore, Omnivore | Diets | Habitats, Life Cycles, Biomes | Herbivore, carnivore and omnivore describe animals' diets: plants, meat or both.
Mammal, Reptile, Amphibian | Vertebrates | Invertebrates, Insects, Plants | Mammals, reptiles and amphibians all have backbones: vertebrates.
Spider, Jellyfish, Worm | Invertebrates | Vertebrates, Insects, Mammals | Spiders, jellyfish and worms have no backbone: invertebrates.
Tundra, Desert, Rainforest | Biomes | Planets, Continents, Countries | Tundra, desert and rainforest are biomes: big regions with their own climate and life.
Atmosphere, Ozone, Oxygen | Air | Water, Soil, Space | The atmosphere is the air around Earth, full of oxygen and protected by the ozone layer.
Renewable, Wind, Solar | Energy | Weather, Planets, Seasons | Wind and solar are renewable energy.
Coal, Oil, Gas | Fossil Fuels | Minerals, Rocks, Renewable Energy | Coal, oil and natural gas are fossil fuels, made from ancient living things.
Lever, Pulley, Wedge | Simple Machines | Engines, Robots, Magnets | Levers, pulleys and wedges are simple machines.
Friction, Gravity, Magnetism | Forces | Elements, Planets, Seasons | Friction, gravity and magnetism are forces: pushes and pulls.
Thermometer, Celsius, Fahrenheit | Temperature | Weight, Distance, Time | A thermometer measures temperature in Celsius or Fahrenheit.
Meter, Liter, Gram | Metric System | Time Zones, Fractions, Money | Meters, liters and grams are units of the metric system.
Pupil, Iris, Retina | Eye | Ear, Classroom, Skin | Your eye has a pupil, an iris and a retina. (A classroom has pupils too!)
Cochlea, Eardrum, Lobe | Ear | Eye, Nose, Brain | Your ear has a lobe outside and an eardrum and cochlea inside.
Biceps, Triceps, Quadriceps | Muscles | Bones, Organs, Joints | Biceps, triceps and quadriceps are muscles.
Femur, Tibia, Skull | Bones | Muscles, Organs, Joints | The femur, tibia and skull are bones.
Arteries, Veins, Capillaries | Circulatory System | Nervous System, Digestive System, Respiratory System | Arteries, veins and capillaries carry blood in the circulatory system.
Neurons, Spinal, Brain | Nervous System | Circulatory System, Skeletal System, Digestive System | The brain, spinal cord and neurons make up the nervous system.
Esophagus, Intestine, Stomach | Digestive System | Respiratory System, Nervous System, Circulatory System | Food goes down the esophagus to the stomach and intestines: the digestive system.
Rome, Paris, Tokyo | Capital Cities | Islands, Ports, States | Rome, Paris and Tokyo are capital cities.
Jazz, Bayou, Gumbo | New Orleans | Nashville, Memphis, Miami | New Orleans is famous for jazz, the bayou and gumbo.
Broadway, Liberty, Subway | New York City | Chicago, Boston, Los Angeles | New York City has Broadway, the Statue of Liberty and the subway.
Hollywood, Beaches, Freeways | Los Angeles | Miami, New York City, San Francisco | Los Angeles has Hollywood, beaches and lots of freeways.
Needle, Rain, Coffee | Seattle | Portland, San Francisco, Chicago | Seattle has the Space Needle, lots of rain and a famous coffee scene.
Bridge, Cable, Fog | San Francisco | Seattle, Chicago, London | San Francisco has the Golden Gate Bridge, cable cars and fog.
Windy, Deep-dish, Lake | Chicago | New York City, Detroit, Boston | Chicago is the Windy City on Lake Michigan, famous for deep-dish pizza.
Flamenco, Paella, Madrid | Spain | Mexico, Portugal, Italy | Spain has flamenco dancing, paella and its capital, Madrid.
Fjords, Vikings, Oslo | Norway | Ireland, Germany, Russia | Norway has fjords, Viking history and its capital, Oslo.
Panda, Wall, Dynasty | China | Japan, Korea, Mongolia | China has giant pandas, the Great Wall and thousands of years of dynasties.
Taj, Curry, Bollywood | India | Pakistan, Thailand, Egypt | India has the Taj Mahal, curry and Bollywood movies.
Safari, Kilimanjaro, Nairobi | Kenya | Egypt, Brazil, India | Kenya is famous for safaris, has Nairobi as its capital and sits next to Kilimanjaro.
Kiwi, Rugby, Auckland | New Zealand | Australia, England, Ireland | New Zealand has the kiwi bird, loves rugby and has Auckland, its biggest city.
Gondola, Canals, Bridges | Venice | Amsterdam, Rome, Paris | Venice is a city of canals and bridges where you ride gondolas.
Windmills, Tulips, Clogs | Netherlands | Denmark, Belgium, Switzerland | The Netherlands is famous for windmills, tulips and wooden clogs.
Chocolate, Alps, Watches | Switzerland | Austria, Belgium, Germany | Switzerland has the Alps, chocolate and famous watches.
Iceberg, Unsinkable, 1912 | Titanic | Lusitania, Mayflower, Hindenburg | The "unsinkable" Titanic hit an iceberg in 1912.
Moon, Armstrong, 1969 | Apollo 11 | Sputnik, Challenger, Space Station | Apollo 11 put Neil Armstrong on the moon in 1969.
Nuggets, California, 1849 | Gold Rush | Dust Bowl, Civil War, Oregon Trail | In 1849, people rushed to California to find gold nuggets.
Taxes, Crates, Harbor | Boston Tea Party | Boston Massacre, Pearl Harbor, Mayflower | Angry about taxes, colonists dumped crates of tea into Boston Harbor at the Boston Tea Party.
Midnight, Lantern, Ride | Paul Revere | George Washington, Benjamin Franklin, John Hancock | Paul Revere made his midnight ride when the lanterns signaled the British were coming.
Signature, Declaration, Biggest | John Hancock | Thomas Jefferson, Benjamin Franklin, John Adams | John Hancock signed the Declaration of Independence with the biggest signature.
Cherry, Delaware, Dollar | George Washington | Abraham Lincoln, Thomas Jefferson, Benjamin Franklin | George Washington crossed the Delaware, is on the dollar bill and has the cherry tree legend.
Penny, Log, Gettysburg | Abraham Lincoln | George Washington, Thomas Jefferson, Theodore Roosevelt | Abraham Lincoln grew up in a log cabin, gave the Gettysburg Address and is on the penny.
Teddy, Parks, Rough | Theodore Roosevelt | Franklin Roosevelt, Abraham Lincoln, Ulysses S. Grant | Teddy Roosevelt led the Rough Riders, protected national parks and inspired the teddy bear.
Hamlet, Globe, Bard | Shakespeare | Dickens, Chaucer, Homer | Shakespeare, the Bard, wrote Hamlet for the Globe Theatre.
Iliad, Odyssey, Blind | Homer | Shakespeare, Aesop, Plato | The poet Homer, said to be blind, told the Iliad and the Odyssey.
Fables, Tortoise, Morals | Aesop | Homer, Grimm, Dr. Seuss | Aesop's fables, like The Tortoise and the Hare, end with a moral.
Grinch, Hat, Rhymes | Dr. Seuss | Shel Silverstein, Roald Dahl, Aesop | Dr. Seuss wrote rhyming books like The Grinch and The Cat in the Hat.
Wonka, Matilda, BFG | Roald Dahl | Dr. Seuss, J.K. Rowling, C.S. Lewis | Roald Dahl wrote about Willy Wonka, Matilda and the BFG.
Inventor, Painter, Renaissance | Leonardo da Vinci | Michelangelo, Galileo, Picasso | Leonardo da Vinci was a Renaissance painter and an inventor.
David, Sistine, Sculptor | Michelangelo | Leonardo da Vinci, Raphael, Donatello | Michelangelo sculpted David and painted the Sistine Chapel ceiling.
Starry, Sunflowers, Ear | Vincent van Gogh | Pablo Picasso, Claude Monet, Leonardo da Vinci | Van Gogh painted The Starry Night and Sunflowers, and famously cut off part of his ear.
Cubism, Guernica, Spanish | Pablo Picasso | Vincent van Gogh, Salvador Dalí, Claude Monet | Spanish painter Pablo Picasso invented Cubism and painted Guernica.
Moonwalk, Thriller, Pop | Michael Jackson | Elvis Presley, Prince, Neil Armstrong | The King of Pop did the moonwalk and sang Thriller. Neil Armstrong walked on the moon, but never moonwalked!
Graceland, Hound, Rock | Elvis Presley | Michael Jackson, The Beatles, Johnny Cash | Elvis, the King of Rock and Roll, sang Hound Dog and lived at Graceland.
Liverpool, Abbey, Yellow | The Beatles | The Rolling Stones, Queen, Coldplay | The Beatles came from Liverpool and made Abbey Road and Yellow Submarine.
Symphony, Deaf, Fifth | Beethoven | Mozart, Bach, Chopin | Beethoven wrote his famous Fifth Symphony and kept composing after he went deaf.
Dunk, Bulls, 23 | Michael Jordan | LeBron James, Kobe Bryant, Shaquille O'Neal | Michael Jordan wore 23 for the Chicago Bulls and was famous for his dunks.
Vault, Olympics, Gymnast | Simone Biles | Serena Williams, Katie Ledecky, Allyson Felix | Simone Biles is an Olympic gymnast with vaults named after her.
Argentina, Barcelona, Goals | Lionel Messi | Cristiano Ronaldo, Neymar, Pelé | Lionel Messi from Argentina scored hundreds of goals for Barcelona.
Checkmate, Pawn, Bishop | Chess | Checkers, Scrabble, Church | In chess you move pawns and bishops to get checkmate.
Tiles, Letters, Points | Scrabble | Monopoly, Chess, Dominoes | In Scrabble you place letter tiles to score points.
Boardwalk, Jail, Hotels | Monopoly | Clue, Life, Scrabble | In Monopoly you build hotels on Boardwalk and try to stay out of jail.
Mustard, Candlestick, Library | Clue | Monopoly, Sorry!, Chess | In Clue you guess: Colonel Mustard, in the library, with the candlestick!
Wave, Earthquake, Coast | Tsunami | Hurricane, Flood, Tornado | An undersea earthquake can send a giant tsunami wave toward the coast.
Eye, Category, Landfall | Hurricane | Tornado, Tsunami, Blizzard | A hurricane has an eye, is ranked by category and makes landfall at the coast.
Aurora, Magnetic, Polar | Northern Lights | Rainbow, Lightning, Eclipse | The northern lights, the aurora, glow near the poles because of Earth's magnetic field.
Shadow, Corona, Totality | Solar Eclipse | Lunar Eclipse, Sunset, Comet | In a total solar eclipse, the moon's shadow covers the sun and you can see its corona.
Megabyte, Gigabyte, Terabyte | Data | Speed, Pixels, Passwords | Megabytes, gigabytes and terabytes measure amounts of data.
Hashtag, Selfie, Followers | Social Media | Television, Newspaper, Email | Hashtags, selfies and followers are all part of social media.
Coach, Huddle, Playbook | Football Team | Orchestra, Classroom, Band | A football team huddles while the coach calls a play from the playbook.
`),
  // Tier 4: High school (grades 9–12)
  4: parse(`
Monopoly, Cartel, Oligopoly | Market Structure | Inflation, Tariff, Fiscal Policy | Monopolies, cartels and oligopolies all describe how a market is structured: how many sellers control it.
Mitochondria, Ribosome, Golgi | Organelles | Proteins, Tissues, Enzymes | Mitochondria, ribosomes and the Golgi apparatus are organelles, the cell's working parts.
Mitosis, Meiosis, Cytokinesis | Cell Division | Photosynthesis, Respiration, Osmosis | Mitosis, meiosis and cytokinesis are all stages or kinds of cell division.
Allele, Genotype, Punnett | Genetics | Evolution, Ecology, Anatomy | Alleles, genotypes and Punnett squares are tools of genetics.
Mutation, Adaptation, Darwin | Natural Selection | Gene Editing, Cloning, Extinction | Darwin's natural selection favors mutations that become useful adaptations.
Ionic, Covalent, Metallic | Chemical Bonds | Isotopes, Reactions, Mixtures | Ionic, covalent and metallic are the main kinds of chemical bonds.
Halogens, Noble, Alkali | Periodic Table | Isotopes, Compounds, Acids | Halogens, noble gases and alkali metals are groups on the periodic table.
Velocity, Acceleration, Momentum | Motion | Thermodynamics, Optics, Electricity | Velocity, acceleration and momentum all describe motion.
Inertia, Action, Reaction | Newton's Laws | Kepler's Laws, Ohm's Law, Relativity | Inertia is Newton's first law; action and reaction is his third.
Voltage, Current, Resistance | Ohm's Law | Newton's Laws, Boyle's Law, Hooke's Law | Ohm's law ties them together: voltage equals current times resistance.
Pressure, Volume, Temperature | Gas Laws | Ohm's Law, Newton's Laws, Kinematics | The gas laws (Boyle's, Charles's) relate a gas's pressure, volume and temperature.
Entropy, Enthalpy, Heat | Thermodynamics | Optics, Kinematics, Electromagnetism | Entropy, enthalpy and heat flow are the heart of thermodynamics.
Refraction, Lens, Prism | Optics | Acoustics, Thermodynamics, Magnetism | Lenses and prisms bend light by refraction. That's optics.
Isotope, Decay, Half-life | Radioactivity | Combustion, Electrolysis, Photosynthesis | Radioactive isotopes decay at a rate measured by their half-life.
Fission, Fusion, Reactor | Nuclear Energy | Solar Energy, Geothermal Energy, Hydroelectric Power | Nuclear energy comes from fission (today's reactors) or fusion (the dream). The sun runs on fusion, but has no reactor!
Supernova, Nebula, Dwarf | Life Cycle of a Star | Planets, Galaxies, Comets | A star is born in a nebula and ends as a white dwarf or a supernova.
Singularity, Horizon, Spaghettification | Black Hole | Wormhole, Neutron Star, Supernova | A black hole has an event horizon and a singularity, and its gravity would stretch you like spaghetti.
Redshift, Expansion, Background | Big Bang | Black Hole, Supernova, Dark Matter | Redshifted galaxies, an expanding universe and the cosmic microwave background are evidence for the Big Bang.
Feudalism, Vassal, Serf | Middle Ages | Renaissance, Enlightenment, Industrial Revolution | The Middle Ages ran on feudalism: lords, vassals and serfs.
Humanism, Florence, Perspective | Renaissance | Reformation, Enlightenment, Middle Ages | The Renaissance began in Florence, with humanism and perspective in painting.
Locke, Rousseau, Reason | Enlightenment | Renaissance, Romanticism, Reformation | Locke and Rousseau were Enlightenment thinkers who championed reason.
Luther, Theses, Protestant | Reformation | Renaissance, Enlightenment, Crusades | Martin Luther posted his 95 Theses and started the Protestant Reformation.
Steam, Factories, Textiles | Industrial Revolution | Renaissance, Information Age, Agricultural Revolution | Steam power and textile factories drove the Industrial Revolution.
Bastille, Guillotine, Robespierre | French Revolution | American Revolution, Russian Revolution, Napoleonic Wars | The French Revolution stormed the Bastille, and Robespierre ruled by the guillotine.
Bolsheviks, Lenin, Tsar | Russian Revolution | French Revolution, Cold War, World War I | Lenin's Bolsheviks overthrew the tsar in the Russian Revolution.
Trenches, Archduke, Armistice | World War I | World War II, Civil War, Cold War | World War I began with an archduke's assassination, was fought in trenches and ended with an armistice.
Blitz, D-Day, Axis | World War II | World War I, Cold War, Korean War | World War II saw the Blitz on London, the D-Day invasion and the Axis powers.
Détente, Sputnik, Containment | Cold War | World War II, Vietnam War, Great Depression | Containment, Sputnik and détente were all chapters of the Cold War.
Breadlines, Crash, Hoovervilles | Great Depression | Roaring Twenties, Gilded Age, Reconstruction | After the 1929 crash came breadlines and shantytowns called Hoovervilles: the Great Depression.
Flappers, Jazz, Prohibition | Roaring Twenties | Great Depression, Gilded Age, Swinging Sixties | The Roaring Twenties had flappers, jazz and Prohibition.
Carpetbaggers, Amendments, Freedmen | Reconstruction | Civil War, Progressive Era, Gilded Age | Reconstruction brought new amendments, help for freedmen and Northern "carpetbaggers" to the South.
Muckrakers, Trustbusting, Suffrage | Progressive Era | Gilded Age, Reconstruction, New Deal | Muckraking journalists, trustbusting and the push for suffrage defined the Progressive Era.
Tycoons, Railroads, Inequality | Gilded Age | Progressive Era, Industrial Revolution, Great Depression | Railroad tycoons and huge inequality marked the Gilded Age.
Sit-ins, Selma, Marches | Civil Rights Movement | Suffrage Movement, Labor Movement, Abolition | Sit-ins, the Selma march and the March on Washington were milestones of the Civil Rights Movement.
Seneca, Ballot, Nineteenth | Women's Suffrage | Abolition, Civil Rights Movement, Temperance | The fight for women's right to the ballot began at Seneca Falls and was won with the Nineteenth Amendment.
Speech, Press, Assembly | First Amendment | Second Amendment, Fifth Amendment, Fourteenth Amendment | The First Amendment protects speech, the press and assembly.
Veto, Override, Filibuster | Legislative Process | Judicial Review, Elections, Impeachment | Filibusters, vetoes and overrides are all part of how a bill becomes law.
Marbury, Precedent, Unconstitutional | Supreme Court | Congress, Electoral College, Senate | Since Marbury v. Madison, the Supreme Court can strike down laws as unconstitutional, setting precedent.
Electors, Swing, 270 | Electoral College | Supreme Court, Primary Election, Congress | In the Electoral College, electors from swing states decide who reaches 270.
Interest, Inflation, Rates | Monetary Policy | Fiscal Policy, Tariff, Market Structure | Central banks set interest rates to control inflation. That's monetary policy.
Taxes, Spending, Deficit | Fiscal Policy | Monetary Policy, Trade Policy, Market Structure | Government taxes and spending (and the deficit they create) are fiscal policy.
Scarcity, Opportunity, Cost | Economics | Psychology, Sociology, Ethics | Scarcity and opportunity cost are economics' first lessons.
Bull, Bear, Dividend | Stock Market | Real Estate, Zoo, Rodeo | Bull and bear markets and dividends belong to the stock market. A zoo has bulls and bears, but no dividends!
Tariff, Quota, Embargo | Trade Barriers | Free Trade, Inflation, Subsidies | Tariffs, quotas and embargoes are barriers to trade.
Id, Ego, Superego | Freud | Jung, Pavlov, Skinner | Sigmund Freud split the mind into the id, the ego and the superego.
Conditioning, Bell, Salivating | Pavlov | Freud, Skinner, Darwin | Pavlov's dogs, conditioned to a bell, started salivating at the sound.
Cogito, Ergo, Sum | Descartes | Socrates, Plato, Kant | "Cogito, ergo sum": I think, therefore I am. That's Descartes.
Cave, Republic, Forms | Plato | Aristotle, Socrates, Descartes | Plato wrote The Republic, the allegory of the cave and the theory of Forms.
Hemlock, Questions, Athens | Socrates | Plato, Aristotle, Homer | Socrates questioned everything in Athens and was sentenced to drink hemlock.
Prince, Florence, Ends | Machiavelli | Dante, Galileo, Medici | Machiavelli of Florence wrote The Prince, where the ends justify the means.
Inferno, Purgatorio, Paradiso | Dante | Milton, Homer, Virgil | Dante's Divine Comedy travels through Inferno, Purgatorio and Paradiso.
Mead, Dragon, Grendel | Beowulf | The Odyssey, The Iliad, The Hobbit | Beowulf fights Grendel in the mead hall and, at the end, a dragon.
Ithaca, Cyclops, Penelope | The Odyssey | The Iliad, The Aeneid, Beowulf | Odysseus outwits the Cyclops on his long trip home to Penelope in Ithaca.
Achilles, Troy, Hector | The Iliad | The Odyssey, The Aeneid, Antigone | The Iliad tells of Achilles and Hector in the war for Troy.
Jazz, Daisy, Green | The Great Gatsby | Of Mice and Men, The Catcher in the Rye, To Kill a Mockingbird | Gatsby stares at the green light across the bay, longing for Daisy, in the Jazz Age.
Atticus, Scout, Boo | To Kill a Mockingbird | Of Mice and Men, The Outsiders, The Catcher in the Rye | Scout, her father Atticus and the mysterious Boo Radley are in To Kill a Mockingbird.
Holden, Phonies, Ducks | The Catcher in the Rye | The Great Gatsby, Lord of the Flies, The Outsiders | Holden Caulfield hates phonies and wonders where the Central Park ducks go in winter.
Conch, Piggy, Island | Lord of the Flies | Robinson Crusoe, Treasure Island, Life of Pi | Stranded boys on an island hold the conch to speak, and Piggy's glasses start the fire.
Lennie, Rabbits, Ranch | Of Mice and Men | The Grapes of Wrath, Animal Farm, Old Yeller | Lennie dreams of tending rabbits on their own ranch in Of Mice and Men.
Napoleon, Snowball, Windmill | Animal Farm | 1984, Charlotte's Web, Brave New World | In Animal Farm, the pigs Napoleon and Snowball fight over the windmill.
Doublethink, Newspeak, Winston | 1984 | Brave New World, Fahrenheit 451, Animal Farm | Winston Smith lives in a world of Newspeak and doublethink in 1984.
Firemen, Books, Burning | Fahrenheit 451 | 1984, The Giver, The Hunger Games | In Fahrenheit 451, firemen start fires, burning books.
Hester, Pearl, Scaffold | The Scarlet Letter | The Crucible, Jane Eyre, Wuthering Heights | Hester Prynne stands on the scaffold with her daughter Pearl in The Scarlet Letter.
Salem, Witches, Proctor | The Crucible | The Scarlet Letter, Macbeth, Our Town | John Proctor is caught up in the Salem witch trials in The Crucible.
Witches, Dagger, Banquo | Macbeth | Hamlet, Othello, King Lear | Macbeth hears three witches, sees a dagger and is haunted by Banquo's ghost.
Skull, Denmark, Ghost | Hamlet | Macbeth, King Lear, Julius Caesar | Hamlet, prince of Denmark, sees his father's ghost and holds Yorick's skull.
Balcony, Montague, Capulet | Romeo and Juliet | Hamlet, Othello, A Midsummer Night's Dream | A Montague and a Capulet fall in love; the balcony scene is in Romeo and Juliet.
Whale, Ahab, Ishmael | Moby-Dick | The Old Man and the Sea, Jaws, Treasure Island | "Call me Ishmael." Captain Ahab hunts the white whale in Moby-Dick.
Pip, Havisham, Estella | Great Expectations | Oliver Twist, A Christmas Carol, David Copperfield | Pip, Miss Havisham and Estella are in Dickens's Great Expectations.
Scrooge, Marley, Ghosts | A Christmas Carol | Great Expectations, Hamlet, Oliver Twist | Scrooge is visited by Marley and three ghosts in A Christmas Carol.
Elizabeth, Darcy, Bennet | Pride and Prejudice | Jane Eyre, Emma, Wuthering Heights | Elizabeth Bennet and Mr. Darcy are the couple of Pride and Prejudice.
Creature, Victor, Lightning | Frankenstein | Dracula, Dr. Jekyll and Mr. Hyde, The Invisible Man | Victor Frankenstein brings his creature to life.
Foreshadowing, Flashback, Suspense | Plot Devices | Rhyme Schemes, Parts of Speech, Punctuation | Foreshadowing, flashbacks and suspense are plot devices writers use to shape a story.
Iamb, Trochee, Dactyl | Poetic Meter | Rhyme Schemes, Stanzas, Literary Genres | Iambs, trochees and dactyls are the metrical feet that make up a poem's meter.
Situational, Dramatic, Verbal | Irony | Metaphor, Conflict, Satire | The three kinds of irony are situational, dramatic and verbal.
Ethos, Pathos, Logos | Rhetorical Appeals | Logical Fallacies, Literary Devices, Greek Gods | Ethos, pathos and logos are Aristotle's three rhetorical appeals: credibility, emotion and logic.
Strawman, Bandwagon, Red-herring | Logical Fallacies | Rhetorical Appeals, Literary Devices, Figures of Speech | Strawman, bandwagon and red herring are logical fallacies.
Sonnet, Villanelle, Haiku | Poetic Forms | Literary Devices, Rhyme Schemes, Plot Structures | Sonnets, villanelles and haiku are fixed poetic forms.
Allegory, Symbolism, Motif | Literary Devices | Grammar Rules, Plot Points, Poetic Meter | Allegory, symbolism and motifs are literary devices.
Pi, Phi, √2 | Irrational Numbers | Prime Numbers, Integers, Rational Numbers | Pi, phi and the square root of 2 never end or repeat: irrational numbers.
Sine, Cosine, Tangent | Trigonometry | Calculus, Algebra, Statistics | Sine, cosine and tangent are the core of trigonometry.
Derivative, Integral, Limit | Calculus | Trigonometry, Geometry, Statistics | Limits, derivatives and integrals are calculus.
Mean, Deviation, Variance | Statistics | Calculus, Algebra, Trigonometry | Mean, standard deviation and variance are statistics.
Parabola, Vertex, Discriminant | Quadratic Functions | Linear Functions, Exponential Functions, Trigonometry | A quadratic's graph is a parabola with a vertex, and the discriminant counts its roots.
Hypotenuse, Legs, Squares | Pythagorean Theorem | Quadratic Formula, Law of Sines, Area Formula | The squares of a right triangle's legs add up to the square of the hypotenuse.
Bit, Byte, Binary | Computing | Morse Code, Chemistry, Music Theory | Bits, bytes and binary are how computers store everything.
Algorithm, Loop, Variable | Programming | Algebra, Music Production, Cooking | Programmers write algorithms with loops and variables.
Phishing, Firewall, Encryption | Cybersecurity | Fishing, Fire Safety, Blockchain | Firewalls and encryption defend against phishing. That's cybersecurity.
Bitcoin, Ledger, Mining | Cryptocurrency | Gold Rush, Accounting, Banking | Bitcoin is a cryptocurrency: a shared ledger kept by "miners."
Neuron, Synapse, Dendrite | Nervous System | Circulatory System, Endocrine System, Immune System | Neurons pass signals across synapses through dendrites: the nervous system.
Insulin, Pancreas, Hormones | Endocrine System | Digestive System, Immune System, Nervous System | The pancreas releases the hormone insulin as part of the endocrine system.
Antibody, Antigen, Lymph | Immune System | Endocrine System, Circulatory System, Nervous System | The immune system makes antibodies to fight antigens, carried in the lymph.
Alveoli, Diaphragm, Bronchi | Respiratory System | Digestive System, Circulatory System, Skeletal System | Air flows through the bronchi to the alveoli, pulled in by the diaphragm.
Osmosis, Diffusion, Membrane | Cell Transport | Cell Division, Photosynthesis, Protein Synthesis | Osmosis and diffusion move things across the cell membrane: cell transport.
Transcription, Translation, Codon | Protein Synthesis | Cell Division, Photosynthesis, Language Learning | DNA is transcribed to RNA, then translated codon by codon into protein.
Glycolysis, Krebs, ATP | Cellular Respiration | Photosynthesis, Digestion, Mitosis | Glycolysis and the Krebs cycle make ATP in cellular respiration.
Keystone, Niche, Biodiversity | Ecology | Architecture, Genetics, Geology | Keystone species, niches and biodiversity are ecology terms.
Subduction, Rift, Pangaea | Plate Tectonics | Erosion, Volcanism, Weathering | Pangaea split apart along rifts while plates slide under each other at subduction zones.
Coriolis, Jetstream, Isobar | Meteorology | Oceanography, Astronomy, Geology | The Coriolis effect, the jet stream and isobars on maps are meteorology.
Tides, Currents, Salinity | Oceanography | Meteorology, Geology, Astronomy | Tides, currents and salinity are studied in oceanography.
Runnymede, Barons, 1215 | Magna Carta | Declaration of Independence, Treaty of Versailles, Domesday Book | In 1215 at Runnymede, English barons forced King John to sign the Magna Carta.
Reparations, 1919, Germany | Treaty of Versailles | Marshall Plan, Yalta Conference, Magna Carta | The 1919 Treaty of Versailles made Germany pay reparations after World War I.
Rebuild, Europe, Aid | Marshall Plan | Treaty of Versailles, New Deal, Lend-Lease | The Marshall Plan sent American aid to rebuild Europe after World War II.
Alphabet, Relief, Fireside | New Deal | Great Society, Square Deal, Marshall Plan | FDR's New Deal created "alphabet agencies" for relief, and he explained it in fireside chats.
Frontier, Westward, Continent | Manifest Destiny | Monroe Doctrine, Gold Rush, Reconstruction | Manifest Destiny was the belief that the U.S. was meant to push its frontier westward across the continent.
Whitney, Seeds, Fiber | Cotton Gin | Spinning Jenny, Steam Engine, Telegraph | Eli Whitney's cotton gin pulled the seeds out of cotton fiber.
Morse, Wires, Dots | Telegraph | Telephone, Radio, Internet | Samuel Morse's telegraph sent dots and dashes over wires.
Gutenberg, Movable, Ink | Printing Press | Typewriter, Telegraph, Photocopier | Gutenberg's printing press used movable type and ink.
Sputnik, Gagarin, Apollo | Space Race | Arms Race, Gold Rush, Industrial Revolution | Sputnik, Yuri Gagarin and Apollo were milestones of the Space Race.
Greenhouse, Carbon, Warming | Climate Change | Ozone Depletion, Acid Rain, Deforestation | Greenhouse gases like carbon dioxide trap heat and warm the planet: climate change.
Divine, Versailles, Louis | Absolute Monarchy | Democracy, Feudalism, Republic | Louis XIV ruled from Versailles by divine right: absolute monarchy.
Senate, Consul, Tribune | Roman Republic | Roman Empire, Athenian Democracy, Parliament | The Roman Republic was run by consuls, the Senate and tribunes, before the emperors.
Ziggurat, Cuneiform, Hammurabi | Mesopotamia | Ancient Egypt, Indus Valley, Ancient China | Mesopotamia built ziggurats, wrote in cuneiform and had Hammurabi's code.
Dynasty, Mandate, Confucius | Ancient China | Ancient Japan, Mongol Empire, Ancient India | Ancient China had dynasties, the Mandate of Heaven and Confucius.
Constantinople, Justinian, Orthodox | Byzantine Empire | Roman Empire, Ottoman Empire, Holy Roman Empire | Justinian ruled the Orthodox Christian Byzantine Empire from Constantinople.
Sultan, Janissary, Istanbul | Ottoman Empire | Byzantine Empire, Persian Empire, Mughal Empire | Ottoman sultans ruled from Istanbul with elite janissary troops.
Khan, Steppe, Horde | Mongol Empire | Ottoman Empire, Huns, Persian Empire | Genghis Khan's hordes rode out of the steppe to build the Mongol Empire.
Akbar, Shah, Taj | Mughal Empire | Ottoman Empire, Persian Empire, Maurya Empire | Akbar ruled the Mughal Empire, and Shah Jahan built the Taj Mahal.
Tenochtitlan, Montezuma, Cortés | Aztec Empire | Inca Empire, Maya, Olmec | Cortés met Montezuma at Tenochtitlan, the capital of the Aztec Empire.
Machu, Quipu, Andes | Inca Empire | Aztec Empire, Maya, Olmec | The Inca Empire stretched along the Andes, built Machu Picchu and kept records on knotted quipu.
Hubris, Catharsis, Chorus | Greek Tragedy | Comedy, Epic Poetry, Opera | Greek tragedy has a chorus, a hero's hubris and the audience's catharsis.
Sonata, Symphony, Concerto | Classical Music | Jazz, Opera, Musical Theater | Sonatas, symphonies and concertos are forms of classical music.
Improvisation, Swing, Bebop | Jazz | Blues, Classical Music, Rock | Improvisation, swing and bebop are jazz.
Monet, Renoir, Brushstrokes | Impressionism | Cubism, Surrealism, Renaissance Art | Monet and Renoir used quick brushstrokes to capture light: Impressionism.
Dalí, Dreams, Melting | Surrealism | Impressionism, Cubism, Pop Art | Dalí's melting clocks came straight from dreams: Surrealism.
Warhol, Soup, Lichtenstein | Pop Art | Surrealism, Cubism, Impressionism | Warhol's soup cans and Lichtenstein's comics are Pop Art.
Fresco, Chiaroscuro, Perspective | Renaissance Art | Pop Art, Impressionism, Graffiti | Frescoes, chiaroscuro (light and shadow) and perspective defined Renaissance art.
Isotopes, Fossils, Half-life | Carbon Dating | Plate Tectonics, Photosynthesis, Fossil Fuels | Carbon dating uses a radioactive isotope's half-life to tell how old fossils are.
Bacteria, Penicillin, Fleming | Antibiotics | Vaccines, Anesthesia, Insulin | Alexander Fleming discovered penicillin, the first antibiotic against bacteria.
Jenner, Smallpox, Immunity | Vaccine | Antibiotic, Antiseptic, X-Ray | Edward Jenner made the first vaccine, giving immunity to smallpox.
Placebo, Control, Blind | Clinical Trial | Census, Opinion Poll, Field Study | A clinical trial compares a treatment to a placebo in a blind test with a control group.
Sample, Margin, Error | Opinion Poll | Census, Experiment, Audit | An opinion poll surveys a sample and reports a margin of error.
Westminster, Commons, Lords | British Parliament | U.S. Congress, Supreme Court, Royal Family | Britain's Parliament at Westminster has the House of Commons and the House of Lords.
Checks, Balances, Branches | Separation of Powers | Federalism, Due Process, Popular Sovereignty | Three branches checking and balancing each other: that's the separation of powers.
States, National, Shared | Federalism | Monarchy, Anarchy, Oligarchy | Federalism means power is shared between the states and the national government.
Rule, Few, Wealthy | Oligarchy | Monarchy, Democracy, Theocracy | An oligarchy is rule by a wealthy few.
Religious, Rule, Clergy | Theocracy | Monarchy, Oligarchy, Democracy | A theocracy is rule by religious clergy.
Sonar, Echo, Bats | Echolocation | Hibernation, Migration, Camouflage | Bats find their way by echoes, like a living sonar: echolocation.
Mimicry, Camouflage, Hibernation | Adaptations | Mutations, Habitats, Symbiosis | Mimicry, camouflage and hibernation are adaptations that help animals survive.
Mutualism, Parasitism, Commensalism | Symbiosis | Competition, Predation, Succession | Mutualism, parasitism and commensalism are the three kinds of symbiosis.
Pioneer, Lichen, Climax | Ecological Succession | Food Web, Carbon Cycle, Erosion | In ecological succession, pioneer species like lichen come first and a climax community comes last.
Weathering, Deposition, Sediment | Erosion | Volcanism, Subduction, Condensation | Weathering breaks rock down, erosion carries the sediment away, and deposition drops it somewhere new.
Aphelion, Perihelion, Ellipse | Orbit | Eclipse, Rotation, Tide | An orbit is an ellipse, with perihelion (closest to the sun) and aphelion (farthest).
Utilitarianism, Deontology, Virtue | Ethics | Logic, Aesthetics, Epistemology | Utilitarianism, deontology and virtue ethics are the big theories of ethics.
Sartre, Camus, Absurd | Existentialism | Stoicism, Utilitarianism, Romanticism | Sartre and Camus wrote about the absurd and making your own meaning: existentialism.
Seneca, Aurelius, Epictetus | Stoicism | Epicureanism, Existentialism, Cynicism | Seneca, Marcus Aurelius and Epictetus were the great Stoic philosophers.
Byron, Shelley, Keats | Romanticism | Realism, Modernism, Transcendentalism | Byron, Shelley and Keats were Romantic poets.
Emerson, Thoreau, Walden | Transcendentalism | Romanticism, Realism, Puritanism | Emerson and Thoreau (who lived at Walden Pond) led Transcendentalism.
Hughes, Hurston, Jazz | Harlem Renaissance | Beat Generation, Lost Generation, Civil Rights Movement | Langston Hughes, Zora Neale Hurston and jazz were the Harlem Renaissance.
Hemingway, Fitzgerald, Paris | Lost Generation | Beat Generation, Harlem Renaissance, Romanticism | Hemingway and Fitzgerald were the Lost Generation writers of 1920s Paris.
Kerouac, Ginsberg, Road | Beat Generation | Lost Generation, Transcendentalism, Romanticism | Kerouac's On the Road and Ginsberg's poems defined the Beat Generation.
Kepler, Transit, Habitable | Exoplanets | Asteroids, Comets, Moons | The Kepler telescope found exoplanets by their transits, some in the habitable zone.
CRISPR, Cas9, Genome | Gene Editing | Cloning, Vaccination, Stem Cells | CRISPR-Cas9 edits the genome: gene editing.
Neural, Training, Model | Machine Learning | Fashion Design, Blockchain, Psychology | In machine learning, a neural network model learns from training data.
Gerrymandering, Census, Districts | Redistricting | Electoral College, Filibuster, Primaries | After each census, district lines are redrawn, and gerrymandering is when that's done unfairly.
`),
};
