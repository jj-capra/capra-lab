// Don't Look! word decks.
//
// Each deck has a list per level. One word or phrase per line; blank lines are ignored.
// A word should appear only once per level across all decks (Mix It Up deals from all of them),
// and everything here has to be fine to shout across a room full of kids.
//
//   1  Little Kids     K–2
//   2  Big Kids        grades 3–5
//   3  Middle School   grades 6–8
//   4  High School     grades 9–12

export const LEVELS = [
  { id: 1, name: 'Little Kids', grades: 'K–2' },
  { id: 2, name: 'Big Kids', grades: '3–5' },
  { id: 3, name: 'Middle School', grades: '6–8' },
  { id: 4, name: 'High School', grades: '9–12' },
];

const list = (s) => s.split('\n').map((w) => w.trim()).filter(Boolean);

export const DECKS = [
  {
    id: 'animals', name: 'Animals', emoji: '🐾', color: '#FFB627',
    words: {
      1: list(`
        Dog
        Cat
        Cow
        Pig
        Horse
        Duck
        Chicken
        Sheep
        Frog
        Fish
        Lion
        Tiger
        Elephant
        Monkey
        Giraffe
        Zebra
        Bear
        Bunny
        Snake
        Turtle
        Owl
        Penguin
        Shark
        Whale
        Butterfly
        Bee
        Spider
        Mouse
        Puppy
        Kitten
        Crab
        Snail
        Ladybug
        Goat
        Alligator
        Octopus
      `),
      2: list(`
        Kangaroo
        Koala
        Panda
        Hippo
        Rhino
        Cheetah
        Gorilla
        Flamingo
        Peacock
        Parrot
        Dolphin
        Jellyfish
        Seahorse
        Starfish
        Lobster
        Squirrel
        Raccoon
        Skunk
        Porcupine
        Hedgehog
        Beaver
        Moose
        Camel
        Llama
        Polar Bear
        Bat
        Wolf
        Fox
        Eagle
        Woodpecker
        Chameleon
        Hamster
        Goldfish
        Caterpillar
        Grasshopper
        Sloth
        Walrus
      `),
      3: list(`
        Platypus
        Axolotl
        Narwhal
        Capybara
        Armadillo
        Anteater
        Meerkat
        Lemur
        Orangutan
        Hyena
        Komodo Dragon
        Manatee
        Stingray
        Hammerhead Shark
        Pufferfish
        Tarantula
        Scorpion
        Praying Mantis
        Firefly
        Toucan
        Pelican
        Ostrich
        Vulture
        Salamander
        Iguana
        Mongoose
        Wolverine
        Badger
        Bison
        Gazelle
        Red Panda
        Honey Badger
        Barracuda
        Jaguar
        Sea Lion
      `),
      4: list(`
        Pangolin
        Tardigrade
        Aardvark
        Blobfish
        Wombat
        Tasmanian Devil
        Quokka
        Chinchilla
        Ocelot
        Snow Leopard
        Wildebeest
        Gila Monster
        Cuttlefish
        Mantis Shrimp
        Anglerfish
        Albatross
        Cassowary
        Kiwi Bird
        Dodo
        Woolly Mammoth
        Saber-Toothed Cat
        Leafcutter Ant
        Monarch Butterfly
        Sea Otter
        Arctic Fox
        Poison Dart Frog
        Electric Eel
        Naked Mole Rat
        Fennec Fox
        Proboscis Monkey
        Hummingbird
        Okapi
        Coyote
        Bald Eagle
      `),
    },
  },
  {
    id: 'food', name: 'Food & Treats', emoji: '🍕', color: '#FF7A5C',
    words: {
      1: list(`
        Pizza
        Ice Cream
        Apple
        Banana
        Cookie
        Cake
        Hot Dog
        Hamburger
        French Fries
        Pancakes
        Spaghetti
        Popcorn
        Candy
        Cupcake
        Grapes
        Strawberry
        Watermelon
        Carrot
        Cheese
        Milk
        Egg
        Sandwich
        Donut
        Cereal
        Orange
        Corn
        Lollipop
        Juice
        Bread
        Taco
        Chicken Nuggets
        Peanut Butter
        Pickle
        Broccoli
        Chocolate
      `),
      2: list(`
        Macaroni and Cheese
        Grilled Cheese
        Burrito
        Nachos
        Quesadilla
        Waffles
        Bacon
        Smoothie
        Milkshake
        Cotton Candy
        S'mores
        Pretzel
        Popsicle
        Pineapple
        Coconut
        Avocado
        Blueberry
        Lemonade
        Hot Chocolate
        Cinnamon Roll
        Sushi
        Ramen
        Corn Dog
        Mashed Potatoes
        Meatball
        Gummy Bears
        Brownie
        Pumpkin Pie
        Applesauce
        Yogurt
        String Cheese
        Granola Bar
        Celery
        Cucumber
        Baked Potato
      `),
      3: list(`
        Lasagna
        Enchiladas
        Pad Thai
        Fried Rice
        Dumplings
        Egg Rolls
        Teriyaki Chicken
        Chicken Wings
        Guacamole
        Salsa
        Hummus
        Caesar Salad
        Clam Chowder
        Croissant
        Bagel
        Pho
        Boba Tea
        Churros
        Cheesecake
        Fortune Cookie
        Mango
        Pomegranate
        Dragon Fruit
        Artichoke
        Brussels Sprouts
        Cauliflower
        Zucchini
        Eggplant
        Takis
        Hot Cheetos
        Funnel Cake
        Mozzarella Sticks
        Gyro
        Falafel
        Corn on the Cob
      `),
      4: list(`
        Charcuterie Board
        Bruschetta
        Ceviche
        Paella
        Risotto
        Gnocchi
        Bibimbap
        Kimchi
        Tikka Masala
        Naan
        Shawarma
        Empanada
        Pierogi
        Gumbo
        Jambalaya
        Beef Wellington
        Filet Mignon
        Eggs Benedict
        Shakshuka
        Quinoa
        Sourdough
        Espresso
        Matcha
        Macaron
        Baklava
        Cannoli
        Crêpe
        Fondue
        Soufflé
        Sriracha
        Wasabi
        Edamame
        Tamales
        Birria Tacos
        Poutine
        Tiramisu
      `),
    },
  },
  {
    id: 'characters', name: 'Characters', emoji: '🦸', color: '#FF5DA2',
    words: {
      1: list(`
        Mickey Mouse
        Minnie Mouse
        Elmo
        Cookie Monster
        Big Bird
        Peppa Pig
        Bluey
        Bingo
        SpongeBob
        Patrick Star
        Elsa
        Anna
        Olaf
        Winnie the Pooh
        Tigger
        Spider-Man
        Batman
        Superman
        Mario
        Pikachu
        Daniel Tiger
        Curious George
        Cinderella
        Ariel
        Woody
        Buzz Lightyear
        Moana
        Stitch
        Shrek
        Dora
        Barbie
        Hello Kitty
        Simba
        Nemo
        Dory
        Lightning McQueen
        Chase from Paw Patrol
      `),
      2: list(`
        Luigi
        Princess Peach
        Bowser
        Yoshi
        Donkey Kong
        Steve from Minecraft
        Creeper
        Link
        Wonder Woman
        The Hulk
        Captain America
        Iron Man
        Black Panther
        Groot
        Minions
        Gru
        Po the Panda
        Garfield
        Scooby-Doo
        Snoopy
        Charlie Brown
        Bugs Bunny
        Tom and Jerry
        Mr. Potato Head
        Rapunzel
        Belle
        Mulan
        Maui
        Toothless
        Mike Wazowski
        WALL-E
        Joy from Inside Out
        Puss in Boots
        The Grinch
        Paddington Bear
        Clifford
        Optimus Prime
        Captain Underpants
      `),
      3: list(`
        Harry Potter
        Hermione Granger
        Dumbledore
        Hagrid
        Darth Vader
        Yoda
        Grogu
        Chewbacca
        R2-D2
        Luke Skywalker
        Princess Leia
        Thor
        Loki
        Thanos
        Black Widow
        Captain Marvel
        Miles Morales
        Doctor Strange
        Ant-Man
        Percy Jackson
        Greg Heffley
        Dog Man
        Willy Wonka
        Gollum
        Frodo
        Ash Ketchum
        Mewtwo
        Eevee
        Perry the Platypus
        Homer Simpson
        Jack Sparrow
        Sherlock Holmes
        Princess Zelda
        Kermit the Frog
        Miss Piggy
        Indiana Jones
      `),
      4: list(`
        Gandalf
        Aragorn
        Legolas
        Katniss Everdeen
        Wednesday Addams
        Eleven
        Atticus Finch
        Jay Gatsby
        Romeo
        Juliet
        Hamlet
        Frankenstein's Monster
        Count Dracula
        Ebenezer Scrooge
        Huckleberry Finn
        Tom Sawyer
        Mad Hatter
        Cheshire Cat
        Captain Hook
        Peter Pan
        Spock
        Ahsoka Tano
        Aang
        Zuko
        Shuri
        Wanda Maximoff
        Doctor Who
        Mary Poppins
        Dorothy and Toto
        Alice in Wonderland
        Darth Maul
        Boba Fett
        Katara
        Lord Voldemort
        Severus Snape
      `),
    },
  },
  {
    id: 'movies', name: 'Movies & Shows', emoji: '🎬', color: '#A98BFF',
    words: {
      1: list(`
        Frozen
        Toy Story
        Finding Nemo
        The Lion King
        Cars
        Paw Patrol
        Sesame Street
        Encanto
        Coco
        Trolls
        Despicable Me
        Zootopia
        Cocomelon
        Sonic the Hedgehog
        The Little Mermaid
        Beauty and the Beast
        Aladdin
        Monsters Inc
        Inside Out
        Up
        Kung Fu Panda
        Madagascar
        Mickey Mouse Clubhouse
        Tangled
        The Super Mario Bros. Movie
        Spidey and His Amazing Friends
        Blue's Clues
        The Cat in the Hat
        Octonauts
        Lilo & Stitch
        Puppy Dog Pals
        Dumbo
        Bambi
      `),
      2: list(`
        The Incredibles
        Ratatouille
        How to Train Your Dragon
        Big Hero 6
        Wreck-It Ralph
        The Lego Movie
        Matilda
        Paddington
        Wonka
        Wish
        Elemental
        Luca
        Turning Red
        Soul
        Raya and the Last Dragon
        The Bad Guys
        The Secret Life of Pets
        Sing
        Hotel Transylvania
        Ice Age
        The Boss Baby
        My Neighbor Totoro
        SpongeBob SquarePants
        The Loud House
        Gravity Falls
        Phineas and Ferb
        Teen Titans Go!
        Avatar: The Last Airbender
        Jumanji
        Night at the Museum
        Home Alone
        Inside Out 2
        The Wild Robot
        Moana 2
      `),
      3: list(`
        Star Wars
        Monsters University
        Jurassic Park
        Into the Spider-Verse
        Avengers: Endgame
        Black Panther
        Guardians of the Galaxy
        Back to the Future
        E.T.
        Pirates of the Caribbean
        The Princess Bride
        Diary of a Wimpy Kid
        Holes
        The Sandlot
        Space Jam
        The Karate Kid
        Hidden Figures
        Wonder
        A Minecraft Movie
        The Mandalorian
        Ghostbusters
        School of Rock
        Elf
        The Polar Express
        The Wizard of Oz
        Charlie and the Chocolate Factory
        Chicken Run
        Wallace & Gromit
        The Simpsons
        The Muppets
        Godzilla
        Shrek 2
        Coraline
      `),
      4: list(`
        Stranger Things
        Wednesday
        The Lord of the Rings
        The Hunger Games
        Dune
        Top Gun: Maverick
        Jaws
        Rocky
        Star Trek
        Titanic
        Barbie
        Wicked
        The Sound of Music
        Ferris Bueller's Day Off
        Remember the Titans
        Napoleon Dynamite
        Mean Girls
        High School Musical
        The Office
        Friends
        Parks and Recreation
        Abbott Elementary
        Avatar
        Inception
        Interstellar
        Spider-Man: No Way Home
        Pride and Prejudice
        Little Women
        Jurassic World
        The Martian
        Forrest Gump
        Hamilton
        Moneyball
        Cobra Kai
        One Piece
        Arcane
      `),
    },
  },
  {
    id: 'games', name: 'Video Games', emoji: '🎮', color: '#29D3F0',
    words: {
      1: list(`
        Mario Kart
        Super Mario
        Minecraft
        Roblox
        Pokémon
        Sonic
        Pac-Man
        Tetris
        Kirby
        Animal Crossing
        Angry Birds
        Just Dance
        Wii Sports
        Luigi's Mansion
        Crossy Road
        Subway Surfers
        Fruit Ninja
        Temple Run
        Splatoon
        Lego Star Wars
        Toca Boca World
        Controller
        Game Over
        High Score
        Power-Up
        Level Up
        Joystick
        Nintendo Switch
        Extra Life
        Video Game
      `),
      2: list(`
        Fortnite
        Among Us
        Super Smash Bros.
        The Legend of Zelda
        Pokémon Go
        Mario Party
        Rocket League
        Fall Guys
        Stardew Valley
        Plants vs. Zombies
        Geometry Dash
        Clash Royale
        Brawl Stars
        Madden
        NBA 2K
        Pikmin
        Super Mario Odyssey
        Ender Dragon
        Respawn
        Speedrun
        Boss Battle
        Checkpoint
        Skin
        Emote
        Victory Royale
        Loading Screen
        Lag
        Noob
        Gaming Headset
        PlayStation
        Xbox
        Arcade
        Adopt Me!
        Blox Fruits
        Welcome to Bloxburg
      `),
      3: list(`
        Breath of the Wild
        Halo
        Overwatch
        Valorant
        Apex Legends
        League of Legends
        Terraria
        Hollow Knight
        Undertale
        Cuphead
        Crash Bandicoot
        Spyro
        Street Fighter
        Pong
        Space Invaders
        Galaga
        Frogger
        Rainbow Road
        Battle Pass
        Esports
        Twitch Streamer
        Glitch
        Cheat Code
        Easter Egg
        Final Boss
        Side Quest
        Open World
        Multiplayer
        Split Screen
        Leaderboard
        Rage Quit
        NPC
        Five Nights at Freddy's
        Mega Man
      `),
      4: list(`
        Elden Ring
        Skyrim
        Call of Duty
        Final Fantasy
        Kingdom Hearts
        Dark Souls
        Portal
        Half-Life
        Doom
        The Sims
        SimCity
        Civilization
        World of Warcraft
        Metal Gear Solid
        Game Boy
        Nintendo 64
        Sega Genesis
        Atari
        Frame Rate
        Ray Tracing
        Microtransaction
        Loot Box
        Pay to Win
        Roguelike
        Sandbox Game
        Pixel Art
        8-Bit
        DLC
        Early Access
        Achievement Unlocked
        Controller Drift
        Game Engine
        Guitar Hero
        Baldur's Gate
      `),
    },
  },
  {
    id: 'sports', name: 'Sports', emoji: '🏀', color: '#5BE38A',
    words: {
      1: list(`
        Soccer
        Basketball
        Baseball
        Football
        Swimming
        Tennis
        Golf
        Hockey
        Bowling
        Ice Skating
        Skateboard
        Bicycle
        Running
        Jump Rope
        Gymnastics
        Karate
        Volleyball
        Ping Pong
        Skiing
        Surfing
        Trampoline
        Hula Hoop
        Kickball
        Tag
        Hopscotch
        Hide and Seek
        Goal
        Trophy
        Medal
        Helmet
        Whistle
        Sneakers
        Race Car
      `),
      2: list(`
        Slam Dunk
        Touchdown
        Home Run
        Free Throw
        Three-Pointer
        Goalie
        Referee
        Coach
        Quarterback
        Pitcher
        Catcher
        Field Goal
        Penalty Kick
        Cartwheel
        Somersault
        Backflip
        Wrestling
        Boxing
        Lacrosse
        Rugby
        Cheerleading
        Rock Climbing
        Snowboarding
        Water Polo
        Archery
        Fencing
        Track and Field
        Hurdles
        Relay Race
        Marathon
        Olympics
        Super Bowl
        World Series
        Stanley Cup
        Dodgeball
        Tetherball
      `),
      3: list(`
        Crossover
        Layup
        Alley-Oop
        Air Ball
        Buzzer Beater
        Fast Break
        Rebound
        Double Dribble
        Traveling
        Grand Slam
        Strikeout
        Stolen Base
        Bunt
        Interception
        Fumble
        Hail Mary
        Quarterback Sack
        Hat Trick
        Bicycle Kick
        Header
        Offside
        Red Card
        Hole in One
        Hockey Puck
        Power Play
        Pole Vault
        Long Jump
        Javelin
        Triathlon
        March Madness
        NBA Finals
        World Cup
        Michael Jordan
        LeBron James
        Stephen Curry
        Serena Williams
        Simone Biles
        Lionel Messi
      `),
      4: list(`
        Pick and Roll
        Zone Defense
        Full-Court Press
        Triple-Double
        Shot Clock
        Euro Step
        Flagrant Foul
        Sixth Man
        Two-Point Conversion
        Onside Kick
        Pass Interference
        Play-Action
        Designated Hitter
        Perfect Game
        Sacrifice Fly
        Seventh-Inning Stretch
        Penalty Shootout
        Stoppage Time
        Yellow Card
        Caddie
        Photo Finish
        Personal Record
        Draft Pick
        Free Agent
        MVP
        Caitlin Clark
        Patrick Mahomes
        Shohei Ohtani
        Cristiano Ronaldo
        Tom Brady
        Kobe Bryant
        Wayne Gretzky
        Usain Bolt
        Muhammad Ali
        Babe Ruth
        Jackie Robinson
        Victor Wembanyama
      `),
    },
  },
  {
    id: 'act', name: 'Act It Out', emoji: '🎭', color: '#FFD23F',
    words: {
      1: list(`
        Jump
        Sleep
        Swim
        Dance
        Sneeze
        Laugh
        Cry
        Clap
        Hop like a bunny
        Brush your teeth
        Eat a banana
        Drink water
        Wave hello
        Climb a ladder
        Blow bubbles
        Ride a bike
        Fly like a bird
        Roar like a lion
        Kick a ball
        Throw a ball
        Read a book
        Wash your hands
        Take a bath
        Yawn
        Tiptoe
        Hug
        Spin around
        Bark like a dog
        Sing
        Draw a picture
        Play the drums
        Build a snowman
        Waddle like a duck
      `),
      2: list(`
        Juggle
        Do a cartwheel
        Walk a dog
        Bake a cake
        Paint a wall
        Play the guitar
        Play the piano
        Shoot a basketball
        Swing a bat
        Go fishing
        Row a boat
        Ski down a hill
        Surf a wave
        Flip a pancake
        Blow out candles
        Open a present
        Take a selfie
        Brush your hair
        Tie your shoes
        Ride a horse
        Walk like a penguin
        Hop on one foot
        Do jumping jacks
        Do push-ups
        Slip on a banana peel
        Climb a mountain
        Carry a heavy box
        Chop wood
        Lasso a cow
        Pop a balloon
        Eat spaghetti
        Walk like a robot
        Hatch from an egg
      `),
      3: list(`
        Floss dance
        Do the robot
        Moonwalk
        Air guitar
        Limbo
        Conduct an orchestra
        Walk the plank
        Sword fight
        Shoot a free throw
        Golf swing
        Bowl a strike
        Text on a phone
        Take out the trash
        Walk on a tightrope
        Ride a roller coaster
        Get stung by a bee
        Step on a Lego
        Eat a sour lemon
        Walk through a spiderweb
        Ride an elevator
        Escape from a zombie
        Wrap a gift
        Mow the lawn
        Paddle a canoe
        Fly a kite
        Change a diaper
        Brain freeze
        Stuck in quicksand
        Dodge a dodgeball
        Win a gold medal
        Walk a runway
        Lose your balance
        Catch a fly
      `),
      4: list(`
        Build IKEA furniture
        Lose your phone
        Forget your locker combination
        Give a speech
        Parallel park
        Do a job interview
        Win the lottery
        Run for the bus
        Spill coffee on yourself
        Fall asleep in class
        Take a test you didn't study for
        First day of school
        Water ski
        Scuba dive
        Skydive
        Perform surgery
        Direct a movie
        Be a news anchor
        Walk the red carpet
        Hail a taxi
        Do a magic trick
        Milk a cow
        Fold a fitted sheet
        Untangle earbuds
        Lose your keys
        Taste-test hot sauce
        Get caught in the rain
        Carry a sleeping toddler
        Give a dog a bath
        Swat a fly
        Assemble a puzzle
        Order at a drive-through
        Take a group photo
      `),
    },
  },
  {
    id: 'stuff', name: 'Stuff & Gadgets', emoji: '🔦', color: '#F7A8CF',
    words: {
      1: list(`
        Bed
        Chair
        Table
        Couch
        Lamp
        Door
        Window
        Toothbrush
        Pillow
        Blanket
        Bathtub
        Toilet
        Refrigerator
        Oven
        Spoon
        Fork
        Cup
        Plate
        Teddy Bear
        Toy Box
        Television
        Clock
        Shoes
        Socks
        Hat
        Backpack
        Crayons
        Phone
        Key
        Mirror
        Towel
        Stairs
        Broom
        Sunglasses
      `),
      2: list(`
        Microwave
        Dishwasher
        Washing Machine
        Vacuum
        Ceiling Fan
        Remote Control
        Doorbell
        Mailbox
        Garage
        Attic
        Basement
        Bunk Bed
        Night-Light
        Alarm Clock
        Toaster
        Blender
        Frying Pan
        Can Opener
        Laundry Basket
        Coat Hanger
        Smoke Detector
        Light Switch
        Thermostat
        Sprinkler
        Lawn Mower
        Garden Hose
        Trash Can
        Recycling Bin
        Shower Curtain
        Hair Dryer
        Fire Extinguisher
        Flashlight
        Umbrella
        Calendar
        Fridge Magnet
      `),
      3: list(`
        Laptop
        Tablet
        Smartphone
        Earbuds
        Charger
        Wi-Fi
        Password
        Emoji
        Selfie
        Video Call
        Group Chat
        Smartwatch
        Drone
        3D Printer
        QR Code
        Screenshot
        Bluetooth
        Robot Vacuum
        Air Fryer
        Ring Light
        Computer Mouse
        Printer
        Webcam
        Flash Drive
        Hoverboard
        Electric Scooter
        Walkie-Talkie
        Instant Camera
        Vending Machine
        Self-Checkout
        Escalator
        GPS
        Smart TV
        Hashtag
      `),
      4: list(`
        Artificial Intelligence
        Virtual Reality
        Augmented Reality
        Cloud Storage
        Algorithm
        Cryptocurrency
        Two-Factor Authentication
        Spam Email
        Firewall
        Computer Virus
        Search Engine
        Streaming Service
        Podcast
        Influencer
        Viral Video
        Meme
        Captcha
        Pop-Up Ad
        Software Update
        Dark Mode
        Autocorrect
        Airplane Mode
        Electric Car
        Self-Driving Car
        Smart Home
        Touchscreen
        Facial Recognition
        Fingerprint Scanner
        Barcode
        Satellite
        Coding
        Spreadsheet
        Battery Life
        Noise-Canceling Headphones
      `),
    },
  },
  {
    id: 'science', name: 'Science & Space', emoji: '🔭', color: '#6F9BFF',
    words: {
      1: list(`
        Sun
        Moon
        Star
        Rainbow
        Rocket
        Astronaut
        Planet
        Cloud
        Rain
        Snow
        Thunder
        Lightning
        Wind
        Magnet
        Earth
        Ocean
        Rock
        Tree
        Flower
        Seed
        Ice
        Tornado
        Shadow
        Bubbles
        Bones
        Germs
        Heart
        Brain
        Puddle
        Sunflower
        Spaceship
      `),
      2: list(`
        Solar System
        Mars
        Jupiter
        Saturn
        Comet
        Meteor
        Galaxy
        Space Shuttle
        Volcano
        Earthquake
        Hurricane
        Fossil
        Skeleton
        Microscope
        Telescope
        Magnifying Glass
        Thermometer
        Gravity
        Electricity
        Battery
        Light Bulb
        Hibernation
        Migration
        Life Cycle
        Food Chain
        Habitat
        Crystals
        Geode
        Recycling
        Solar Panel
        Constellation
        Big Dipper
        Lungs
        Stomach
      `),
      3: list(`
        Photosynthesis
        Atom
        Molecule
        Cell
        Friction
        Magnetism
        Static Electricity
        Water Cycle
        Evaporation
        Condensation
        Ecosystem
        Predator
        Prey
        Mammal
        Reptile
        Amphibian
        Vertebrate
        Black Hole
        Asteroid Belt
        Milky Way
        International Space Station
        Mars Rover
        Lunar Eclipse
        Solar Eclipse
        Northern Lights
        Tsunami
        Plate Tectonics
        Periodic Table
        Chemical Reaction
        Baking Soda Volcano
        Hypothesis
        Lab Goggles
        Bunsen Burner
        Circulatory System
      `),
      4: list(`
        Mitochondria
        DNA
        Chromosome
        Natural Selection
        Evolution
        Quantum Physics
        Theory of Relativity
        E = mc²
        Big Bang
        Supernova
        Light-Year
        Exoplanet
        Dark Matter
        Nebula
        Neutron Star
        Wormhole
        Velocity
        Kinetic Energy
        Potential Energy
        Newton's Laws
        Momentum
        Inertia
        Isotope
        Electron
        Proton
        Covalent Bond
        pH Scale
        Catalyst
        Climate Change
        Greenhouse Effect
        Biodiversity
        Vaccine
        Antibiotics
        Neuron
        Speed of Light
      `),
    },
  },
  {
    id: 'places', name: 'Places', emoji: '🌎', color: '#4CC9A0',
    words: {
      1: list(`
        Zoo
        Beach
        Park
        School
        Farm
        Playground
        Library
        Grocery Store
        Swimming Pool
        Hospital
        Fire Station
        Bakery
        Toy Store
        Aquarium
        Circus
        Forest
        Mountain
        Jungle
        Desert
        Island
        Campsite
        Restaurant
        Movie Theater
        Airport
        Train Station
        Bedroom
        Kitchen
        Backyard
        Treehouse
        Ice Cream Shop
        Pet Store
        Doctor's Office
        Dentist
        Bounce House
      `),
      2: list(`
        Museum
        Bowling Alley
        Water Park
        Amusement Park
        Disneyland
        Cave
        Lighthouse
        Hotel
        Skate Park
        Barn
        Waterfall
        Rainforest
        North Pole
        Antarctica
        Hawaii
        New York City
        Florida
        Texas
        Alaska
        Canada
        Mexico
        Hollywood
        Mount Everest
        Niagara Falls
        Grand Canyon
        White House
        Statue of Liberty
        Golden Gate Bridge
        Space Needle
        Yellowstone
        Ski Lodge
        Mall
        Post Office
        Police Station
      `),
      3: list(`
        Eiffel Tower
        Great Wall of China
        Big Ben
        Colosseum
        Taj Mahal
        Pyramids of Giza
        Stonehenge
        Leaning Tower of Pisa
        Mount Rushmore
        Times Square
        Hollywood Sign
        Sydney Opera House
        Machu Picchu
        Amazon River
        Sahara Desert
        Mount Fuji
        Tokyo
        London
        Paris
        Rome
        Australia
        Japan
        Egypt
        Brazil
        Italy
        China
        India
        Pacific Ocean
        Atlantic Ocean
        Mississippi River
        Rocky Mountains
        Hoover Dam
        Alcatraz
        Central Park
        Mount Rainier
      `),
      4: list(`
        Petra
        Angkor Wat
        Chichén Itzá
        Christ the Redeemer
        Acropolis
        Kremlin
        Buckingham Palace
        Vatican City
        Louvre
        Notre-Dame
        Sagrada Família
        Burj Khalifa
        Dubai
        Venice
        Amsterdam
        Barcelona
        Istanbul
        Seoul
        Mumbai
        Cairo
        Rio de Janeiro
        Buenos Aires
        Galápagos Islands
        Great Barrier Reef
        Dead Sea
        Mount Kilimanjaro
        Serengeti
        Iceland
        New Zealand
        Scotland
        Bermuda Triangle
        Death Valley
        Route 66
        Pentagon
        Silicon Valley
        Wall Street
      `),
    },
  },
  {
    id: 'pretend', name: 'Make-Believe', emoji: '🦄', color: '#C99BFF',
    words: {
      1: list(`
        Dinosaur
        Dragon
        Unicorn
        Mermaid
        Fairy
        Ghost
        Monster
        Robot
        Alien
        Pirate
        Princess
        Knight
        Wizard
        Witch
        Superhero
        Giant
        Troll
        Castle
        Magic Wand
        Treasure Chest
        Flying Carpet
        Wishing Well
        Tooth Fairy
        Fairy Godmother
        Talking Animal
        Gingerbread House
        Sea Monster
        Pirate Ship
        Pixie Dust
        Crown
        Cape
        Spell Book
      `),
      2: list(`
        T. rex
        Triceratops
        Stegosaurus
        Pterodactyl
        Velociraptor
        Brontosaurus
        Yeti
        Bigfoot
        Loch Ness Monster
        Zombie
        Vampire
        Werewolf
        Mummy
        Genie
        Leprechaun
        Phoenix
        Pegasus
        Griffin
        Kraken
        Ogre
        Gnome
        Elf
        Cyclops
        Haunted Mansion
        Time Machine
        Invisibility Cloak
        Magic Mirror
        Crystal Ball
        Superpower
        Mad Scientist
        Shrink Ray
        Jack and the Beanstalk
      `),
      3: list(`
        Minotaur
        Centaur
        Hydra
        Cerberus
        Sphinx
        Basilisk
        Banshee
        Chupacabra
        Golem
        Goblin
        Hobbit
        Dwarf
        Sorcerer
        Dragon Egg
        Shapeshifter
        Kitsune
        Thunderbird
        Sasquatch
        Abominable Snowman
        Headless Horseman
        Pied Piper
        Rumpelstiltskin
        Little Red Riding Hood
        Big Bad Wolf
        Three Little Pigs
        Goldilocks
        Hansel and Gretel
        Sleeping Beauty
        Snow White
        Robin Hood
        King Arthur
        Merlin
        Excalibur
        Holy Grail
      `),
      4: list(`
        Zeus
        Athena
        Poseidon
        Hades
        Medusa
        Hercules
        Achilles
        Odysseus
        Trojan Horse
        Pandora's Box
        Icarus
        King Midas
        Odin
        Valhalla
        Anubis
        Ra
        Atlantis
        El Dorado
        Fountain of Youth
        Paul Bunyan
        Johnny Appleseed
        John Henry
        Davy Crockett
        Mount Olympus
        Underworld
        Fates
        Valkyrie
        Thor's Hammer
        Achilles' Heel
        Golden Fleece
        Labyrinth
        Oracle of Delphi
        Norse Mythology
        Greek Mythology
      `),
    },
  },
  {
    id: 'school', name: 'School & History', emoji: '📚', color: '#E8C25A',
    words: {
      1: list(`
        Teacher
        Recess
        Lunchbox
        School Bus
        Glue Stick
        Scissors
        Pencil
        Eraser
        Ruler
        Chalkboard
        Alphabet
        Show and Tell
        Nap Time
        Field Trip
        Principal
        Homework
        Art Class
        Music Class
        Gym Class
        Desk
        Globe
        Paintbrush
        Story Time
        Line Leader
        Stickers
        Name Tag
        Lunch Line
        Bell
        Coloring Book
        Classroom
        Cubby
      `),
      2: list(`
        Spelling Bee
        Science Fair
        Book Report
        Multiplication
        Fractions
        Calculator
        Field Day
        Report Card
        Substitute Teacher
        Cafeteria
        Pop Quiz
        Locker
        Yearbook
        Class Pet
        Fire Drill
        Snow Day
        Dictionary
        Protractor
        Graph Paper
        Cursive
        Pen Pal
        School Play
        Talent Show
        Morning Announcements
        Picture Day
        Bulletin Board
        Pencil Sharpener
        Highlighter
        Times Tables
        Hall Pass
        Library Card
        Lost and Found
      `),
      3: list(`
        George Washington
        Abraham Lincoln
        Benjamin Franklin
        Martin Luther King Jr.
        Rosa Parks
        Harriet Tubman
        Amelia Earhart
        Thomas Edison
        Albert Einstein
        Cleopatra
        King Tut
        Christopher Columbus
        Lewis and Clark
        The Pilgrims
        The Mayflower
        Declaration of Independence
        Ancient Egypt
        Ancient Greece
        Knights and Castles
        Vikings
        Samurai
        Pony Express
        Liberty Bell
        Locker Combination
        Detention
        Algebra
        Science Lab
        School Dance
        Study Hall
        Class President
        Middle School
        Science Project
        Hall Monitor
        Geography Bee
      `),
      4: list(`
        The Constitution
        Bill of Rights
        Civil War
        Revolutionary War
        Boston Tea Party
        Gettysburg Address
        Emancipation Proclamation
        Great Depression
        World War II
        Moon Landing
        Industrial Revolution
        Renaissance
        Roman Empire
        Julius Caesar
        Napoleon
        Joan of Arc
        Genghis Khan
        Leonardo da Vinci
        Shakespeare
        Isaac Newton
        Marie Curie
        Frederick Douglass
        Susan B. Anthony
        Sacagawea
        Wright Brothers
        Gold Rush
        Oregon Trail
        Underground Railroad
        Berlin Wall
        Magna Carta
        Supreme Court
        Electoral College
        SAT
        Prom
        Homecoming
        Valedictorian
        Graduation
      `),
    },
  },
  {
    id: 'holidays', name: 'Holidays & Seasons', emoji: '🎉', color: '#FF9A4D',
    words: {
      1: list(`
        Birthday Party
        Christmas Tree
        Santa Claus
        Snowman
        Easter Bunny
        Easter Egg Hunt
        Halloween
        Pumpkin
        Trick-or-Treat
        Costume
        Valentine
        Fireworks
        Turkey Dinner
        Presents
        Candy Cane
        Reindeer
        Snowball Fight
        Summer
        Winter
        Spring
        Fall Leaves
        Balloons
        Party Hat
        Jack-o'-Lantern
        Christmas Stocking
        Gingerbread Man
        Snowflake
        Mittens
        Sandcastle
        Birthday Candles
        Rudolph
      `),
      2: list(`
        New Year's Eve
        Groundhog Day
        St. Patrick's Day
        Fourth of July
        Labor Day
        Hanukkah
        Menorah
        Dreidel
        Kwanzaa
        Diwali
        Lunar New Year
        Cinco de Mayo
        Mother's Day
        Father's Day
        April Fools' Day
        Earth Day
        Wreath
        Ugly Sweater
        Advent Calendar
        Haunted House
        Corn Maze
        Hayride
        Pumpkin Patch
        Sledding
        Igloo
        Piñata
        Sparklers
        Parade
        Easter Basket
        Valentine's Card
        Pot of Gold
        Hot Cocoa
      `),
      3: list(`
        Día de los Muertos
        Ramadan
        Eid
        Passover
        Rosh Hashanah
        Holi
        Mardi Gras
        Juneteenth
        Presidents' Day
        Veterans Day
        Black Friday
        Cyber Monday
        Daylight Saving Time
        Leap Year
        Summer Solstice
        Spring Break
        Winter Break
        Thanksgiving Parade
        Polar Bear Plunge
        New Year's Resolution
        Secret Santa
        White Elephant
        Ball Drop
        Friendsgiving
        Gingerbread House Contest
        Elf on the Shelf
        The Nutcracker
        Fruitcake
        Mistletoe
        Pumpkin Spice
        Harvest Moon
        Back to School
      `),
    },
  },
  {
    id: 'music', name: 'Music', emoji: '🎵', color: '#FF8FB8',
    words: {
      1: list(`
        Drum
        Guitar
        Piano
        Violin
        Trumpet
        Microphone
        Xylophone
        Tambourine
        Maracas
        Harmonica
        Recorder
        Rock Star
        Kazoo
        Lullaby
        Happy Birthday Song
        Twinkle Twinkle Little Star
        Old MacDonald
        Baby Shark
        Wheels on the Bus
        Itsy Bitsy Spider
        ABC Song
        Speaker
        Cymbals
        Triangle
        Harp
        Flute
        Saxophone
        Banjo
        Dance Party
        Freeze Dance
        Music Box
      `),
      2: list(`
        Taylor Swift
        Kidz Bop
        Choir
        Orchestra
        Concert
        Conductor
        Cello
        Tuba
        Trombone
        Clarinet
        French Horn
        Bagpipes
        Ukulele
        Keyboard
        Karaoke
        DJ
        Music Video
        Marching Band
        Drumsticks
        Sheet Music
        Rap
        Opera
        Country Music
        Encore
        Lip Sync
        Boy Band
        Radio
        Record Player
        Applause
        Beatbox
        Spotlight
        Headphones
        Accordion
      `),
      3: list(`
        Beyoncé
        Bruno Mars
        Michael Jackson
        Elvis Presley
        The Beatles
        Billie Eilish
        Olivia Rodrigo
        Ed Sheeran
        Ariana Grande
        Lady Gaga
        Justin Bieber
        Imagine Dragons
        Mozart
        Beethoven
        Hip-Hop
        Jazz
        Rock and Roll
        Heavy Metal
        K-Pop
        BTS
        Reggae
        Blues
        Mariachi
        Polka
        Grammy Award
        Headliner
        Playlist
        Album
        Remix
        Duet
        Guitar Solo
        Music Festival
        Garage Band
      `),
      4: list(`
        Sabrina Carpenter
        Bad Bunny
        Dua Lipa
        The Weeknd
        Coldplay
        Queen
        Nirvana
        ABBA
        Bob Marley
        Frank Sinatra
        Johnny Cash
        Dolly Parton
        Aretha Franklin
        Prince
        Madonna
        Whitney Houston
        Stevie Wonder
        Louis Armstrong
        Bach
        Chopin
        Vivaldi
        Symphony
        Acoustic
        Falsetto
        Harmony
        Tempo
        Crescendo
        A Cappella
        Auto-Tune
        Vinyl Record
        Broadway
        Grand Piano
        Synthesizer
        Woodstock
        Kendrick Lamar
      `),
    },
  },
];

// Mix It Up deals from every deck at the chosen level.
export const MIX = { id: 'mix', name: 'Mix It Up', emoji: '🎲', color: '#FFF8EC' };

// A picture over the word, so friends who are still learning to read can give clues too.
// Little Kids words only; characters and shows stay words. One per line: Word = emoji
export const PICTURES = Object.fromEntries(`
  Dog = 🐶
  Cat = 🐱
  Cow = 🐮
  Pig = 🐷
  Horse = 🐴
  Duck = 🦆
  Chicken = 🐔
  Sheep = 🐑
  Frog = 🐸
  Fish = 🐟
  Lion = 🦁
  Tiger = 🐯
  Elephant = 🐘
  Monkey = 🐵
  Giraffe = 🦒
  Zebra = 🦓
  Bear = 🐻
  Bunny = 🐰
  Snake = 🐍
  Turtle = 🐢
  Owl = 🦉
  Penguin = 🐧
  Shark = 🦈
  Whale = 🐳
  Butterfly = 🦋
  Bee = 🐝
  Spider = 🕷️
  Mouse = 🐭
  Puppy = 🐕
  Kitten = 🐈
  Crab = 🦀
  Snail = 🐌
  Ladybug = 🐞
  Goat = 🐐
  Alligator = 🐊
  Octopus = 🐙
  Pizza = 🍕
  Ice Cream = 🍦
  Apple = 🍎
  Banana = 🍌
  Cookie = 🍪
  Cake = 🎂
  Hot Dog = 🌭
  Hamburger = 🍔
  French Fries = 🍟
  Pancakes = 🥞
  Spaghetti = 🍝
  Popcorn = 🍿
  Candy = 🍬
  Cupcake = 🧁
  Grapes = 🍇
  Strawberry = 🍓
  Watermelon = 🍉
  Carrot = 🥕
  Cheese = 🧀
  Milk = 🥛
  Egg = 🥚
  Sandwich = 🥪
  Donut = 🍩
  Cereal = 🥣
  Orange = 🍊
  Corn = 🌽
  Lollipop = 🍭
  Juice = 🧃
  Bread = 🍞
  Taco = 🌮
  Peanut Butter = 🥜
  Pickle = 🥒
  Broccoli = 🥦
  Chocolate = 🍫
  Controller = 🎮
  Joystick = 🕹️
  Soccer = ⚽
  Basketball = 🏀
  Baseball = ⚾
  Football = 🏈
  Swimming = 🏊
  Tennis = 🎾
  Golf = ⛳
  Hockey = 🏒
  Bowling = 🎳
  Ice Skating = ⛸️
  Skateboard = 🛹
  Bicycle = 🚲
  Running = 🏃
  Gymnastics = 🤸
  Karate = 🥋
  Volleyball = 🏐
  Ping Pong = 🏓
  Skiing = ⛷️
  Surfing = 🏄
  Hide and Seek = 🙈
  Goal = 🥅
  Trophy = 🏆
  Medal = 🏅
  Sneakers = 👟
  Race Car = 🏎️
  Sleep = 😴
  Swim = 🤽
  Dance = 💃
  Sneeze = 🤧
  Laugh = 😂
  Cry = 😢
  Clap = 👏
  Hop like a bunny = 🐇
  Brush your teeth = 🪥
  Eat a banana = 🍌
  Drink water = 💧
  Wave hello = 👋
  Climb a ladder = 🪜
  Blow bubbles = 🫧
  Ride a bike = 🚴
  Fly like a bird = 🐦
  Roar like a lion = 🦁
  Kick a ball = ⚽
  Throw a ball = ⚾
  Read a book = 📖
  Wash your hands = 🧼
  Take a bath = 🛁
  Yawn = 🥱
  Hug = 🤗
  Spin around = 🌀
  Bark like a dog = 🐕
  Sing = 🎤
  Draw a picture = 🖍️
  Play the drums = 🥁
  Build a snowman = ⛄
  Waddle like a duck = 🦆
  Bed = 🛏️
  Chair = 🪑
  Couch = 🛋️
  Lamp = 💡
  Door = 🚪
  Window = 🪟
  Toothbrush = 🪥
  Bathtub = 🛁
  Toilet = 🚽
  Spoon = 🥄
  Fork = 🍴
  Cup = 🥤
  Plate = 🍽️
  Teddy Bear = 🧸
  Television = 📺
  Clock = ⏰
  Shoes = 👞
  Socks = 🧦
  Hat = 🧢
  Backpack = 🎒
  Crayons = 🖍️
  Phone = 📱
  Key = 🔑
  Mirror = 🪞
  Broom = 🧹
  Sunglasses = 🕶️
  Sun = ☀️
  Moon = 🌙
  Star = ⭐
  Rainbow = 🌈
  Rocket = 🚀
  Astronaut = 🧑‍🚀
  Planet = 🪐
  Cloud = ☁️
  Rain = 🌧️
  Snow = 🌨️
  Thunder = ⛈️
  Lightning = ⚡
  Wind = 💨
  Magnet = 🧲
  Earth = 🌍
  Ocean = 🌊
  Rock = 🪨
  Tree = 🌳
  Flower = 🌸
  Seed = 🌱
  Ice = 🧊
  Tornado = 🌪️
  Bubbles = 🫧
  Bones = 🦴
  Germs = 🦠
  Heart = ❤️
  Brain = 🧠
  Sunflower = 🌻
  Spaceship = 🛸
  Beach = 🏖️
  Park = 🏞️
  School = 🏫
  Farm = 🚜
  Playground = 🛝
  Library = 📚
  Grocery Store = 🛒
  Hospital = 🏥
  Fire Station = 🚒
  Bakery = 🥐
  Aquarium = 🐠
  Circus = 🎪
  Forest = 🌲
  Mountain = ⛰️
  Jungle = 🌴
  Desert = 🏜️
  Island = 🏝️
  Campsite = ⛺
  Restaurant = 🧑‍🍳
  Movie Theater = 🎬
  Airport = ✈️
  Train Station = 🚉
  Ice Cream Shop = 🍨
  Pet Store = 🐾
  Doctor's Office = 🩺
  Dentist = 🦷
  Dinosaur = 🦖
  Dragon = 🐉
  Unicorn = 🦄
  Mermaid = 🧜‍♀️
  Fairy = 🧚
  Ghost = 👻
  Monster = 👹
  Robot = 🤖
  Alien = 👽
  Pirate = 🏴‍☠️
  Princess = 👸
  Knight = 🛡️
  Wizard = 🧙
  Witch = 🧙‍♀️
  Superhero = 🦸
  Troll = 🧌
  Castle = 🏰
  Magic Wand = 🪄
  Tooth Fairy = 🦷
  Pirate Ship = ⛵
  Pixie Dust = ✨
  Crown = 👑
  Spell Book = 📕
  Teacher = 🧑‍🏫
  School Bus = 🚌
  Scissors = ✂️
  Pencil = ✏️
  Ruler = 📏
  Alphabet = 🔤
  Nap Time = 💤
  Homework = 📝
  Art Class = 🎨
  Music Class = 🎵
  Globe = 🌎
  Paintbrush = 🖌️
  Name Tag = 📛
  Bell = 🔔
  Birthday Party = 🥳
  Christmas Tree = 🎄
  Santa Claus = 🎅
  Snowman = ☃️
  Easter Bunny = 🐣
  Easter Egg Hunt = 🧺
  Halloween = 🦇
  Trick-or-Treat = 🧛
  Costume = 🎭
  Valentine = 💌
  Fireworks = 🎆
  Turkey Dinner = 🦃
  Presents = 🎁
  Reindeer = 🦌
  Snowball Fight = ❄️
  Summer = 🌞
  Winter = 🥶
  Spring = 🌷
  Fall Leaves = 🍂
  Balloons = 🎈
  Party Hat = 🎉
  Jack-o'-Lantern = 🎃
  Christmas Stocking = 🧦
  Mittens = 🧤
  Birthday Candles = 🕯️
  Drum = 🪘
  Guitar = 🎸
  Piano = 🎹
  Violin = 🎻
  Trumpet = 🎺
  Microphone = 🎙️
  Maracas = 🪇
  Rock Star = 🤘
  Speaker = 🔊
  Flute = 🪈
  Saxophone = 🎷
  Banjo = 🪕
  Dance Party = 🪩
`.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split(' = ')));
