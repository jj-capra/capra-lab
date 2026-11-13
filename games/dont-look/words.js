// Don't Look! word decks.
//
// Each deck has a list per level. One word or phrase per line; blank lines are ignored.
// A word should appear only once per level across all decks (Mix It Up deals from all of them),
// and everything here has to be fine to shout across a room full of kids. Every deck has about 100
// words a level (JC, Nov 12 2026: triple them, so repeat players don't see the same words).
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
        Rooster
        Pony
        Donkey
        Lamb
        Duckling
        Chick
        Hen
        Turkey
        Goose
        Swan
        Parrot
        Bird
        Worm
        Ant
        Fly
        Mosquito
        Beetle
        Cricket
        Caterpillar
        Kangaroo
        Koala
        Panda
        Hippo
        Rhino
        Gorilla
        Camel
        Dolphin
        Seal
        Jellyfish
        Starfish
        Lobster
        Shrimp
        Squid
        Clownfish
        Polar Bear
        Wolf
        Fox
        Deer
        Raccoon
        Skunk
        Squirrel
        Hedgehog
        Beaver
        Bat
        Eagle
        Flamingo
        Peacock
        Hamster
        Goldfish
        Lizard
        Crocodile
        Leopard
        Sloth
        Otter
        Llama
        Moose
        Bull
        Tortoise
        Tadpole
        Seahorse
        Walrus
        Pigeon
        Robin
        Moth
        Calf
        Piglet
        Ostrich
        Woodpecker
        Bumblebee
        Cheetah
        Pelican
        Toucan
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
        Orca
        Sea Turtle
        Blue Whale
        Hermit Crab
        Swordfish
        Clam
        Oyster
        Sea Urchin
        Puffin
        Rattlesnake
        Cobra
        Python
        Gecko
        Bullfrog
        Tree Frog
        Toad
        Grizzly Bear
        Panther
        Bobcat
        Cougar
        Mountain Goat
        Elk
        Antelope
        Buffalo
        Warthog
        Baboon
        Chimpanzee
        Opossum
        Chipmunk
        Prairie Dog
        Gopher
        Ferret
        Guinea Pig
        Parakeet
        Canary
        Cockatoo
        Barn Owl
        Hawk
        Falcon
        Raven
        Crow
        Blue Jay
        Cardinal
        Seagull
        Roadrunner
        Emu
        Stork
        Heron
        Dragonfly
        Centipede
        Earthworm
        Slug
        Termite
        Wasp
        Cicada
        Stick Bug
        Yak
        Alpaca
        Dalmatian
        Poodle
        Bulldog
        Groundhog
        Mole
        Piranha
        Catfish
        Koi Fish
        Lion Cub
        Manta Ray
        Mule
        Black Bear
        Snapping Turtle
        Beagle
        Golden Retriever
        Chihuahua
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
        Lynx
        Caracal
        Jackal
        Dingo
        Tapir
        Bonobo
        Mandrill
        Howler Monkey
        Spider Monkey
        Gibbon
        Marmoset
        Sugar Glider
        Flying Squirrel
        Coati
        Wallaby
        Beluga Whale
        Sperm Whale
        Great White Shark
        Whale Shark
        Moray Eel
        Nautilus
        Sea Cucumber
        Sea Anemone
        Lionfish
        Marlin
        Horseshoe Crab
        Krill
        Condor
        Osprey
        Peregrine Falcon
        Snowy Owl
        Kingfisher
        Macaw
        Emperor Penguin
        Blue-Footed Booby
        Egret
        Spoonbill
        Pheasant
        Anaconda
        King Cobra
        Black Mamba
        Bearded Dragon
        Monitor Lizard
        Horned Lizard
        Frilled Lizard
        Newt
        Dung Beetle
        Stag Beetle
        Cockroach
        Flea
        Atlas Moth
        Mountain Lion
        Clouded Leopard
        Bengal Tiger
        Musk Ox
        Caribou
        Pronghorn
        Ibex
        Impala
        Vampire Bat
        Echidna
        Marmot
        Weasel
        Ermine
        Shrew
        Jackrabbit
        Silverback Gorilla
        Capuchin Monkey
        Tarsier
        Gerbil
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
        Aye-Aye
        Slow Loris
        Binturong
        Fossa
        Saiga Antelope
        Markhor
        Takin
        Gerenuk
        Dik-Dik
        Serval
        Maned Wolf
        African Wild Dog
        Bush Baby
        Kinkajou
        Numbat
        Bilby
        Quoll
        Tree Kangaroo
        Sun Bear
        Spectacled Bear
        Dugong
        Leafy Sea Dragon
        Portuguese Man o' War
        Box Jellyfish
        Giant Squid
        Vampire Squid
        Goblin Shark
        Frilled Shark
        Greenland Shark
        Coelacanth
        Ocean Sunfish
        Hagfish
        Oarfish
        Sea Pig
        Shoebill
        Secretary Bird
        Harpy Eagle
        Hoatzin
        Kakapo
        Lyrebird
        Bird of Paradise
        Quetzal
        Hornbill
        Arctic Tern
        Bullet Ant
        Goliath Beetle
        Orchid Mantis
        Giant Isopod
        Glass Frog
        Hellbender
        Mudskipper
        Archerfish
        Thorny Devil
        Tuatara
        Gharial
        Star-Nosed Mole
        Megalodon
        Mastodon
        Dire Wolf
        Glyptodon
        Archaeopteryx
        Trilobite
        Thylacine
        Passenger Pigeon
        Great Auk
        Pygmy Hippo
        Snow Monkey
        Red-Eyed Tree Frog
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
        Pear
        Peach
        Cherry
        Lemon
        Kiwi
        Tomato
        Potato
        Peas
        Lettuce
        Mushroom
        Onion
        Pepper
        Pie
        Rice
        Noodles
        Soup
        Salad
        Fried Chicken
        Drumstick
        Fish Sticks
        Butter
        Jelly
        Honey
        Toast
        Sprinkles
        Marshmallow
        Gummy Worms
        Jelly Beans
        Bubble Gum
        Pudding
        Whipped Cream
        Chocolate Milk
        Apple Juice
        Chips
        Crackers
        Oatmeal
        Ice Cream Cone
        Banana Split
        Birthday Cake
        Melon
        Plum
        Raspberry
        Lime
        Meatloaf
        Baked Beans
        Hash Browns
        Scrambled Eggs
        Sausage
        Ham
        Steak
        Cheeseburger
        Ketchup
        Mustard
        Snow Cone
        Animal Crackers
        Fruit Snacks
        Fruit Salad
        Peanuts
        Muffin
        Gumball
        Pigs in a Blanket
        Cookies and Milk
        Garlic Bread
        Cookie Dough
        Ice Cream Sundae
        Apple Slices
        Carrot Sticks
        Fruit Cup
        Chocolate Chip Cookie
        Strawberry Milk
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
        Pizza Rolls
        Tater Tots
        Onion Rings
        Chicken Tenders
        Sloppy Joe
        Chow Mein
        Orange Chicken
        Chili
        Tomato Soup
        Chicken Noodle Soup
        Fish Tacos
        Fajitas
        Tortilla
        Refried Beans
        Rice Krispies Treat
        Oreo
        Pop-Tarts
        Goldfish Crackers
        Cheez-Its
        Doritos
        Fruit Roll-Up
        Skittles
        M&M's
        Sour Patch Kids
        Kit Kat
        Starburst
        Root Beer Float
        Slushie
        Frozen Yogurt
        Sherbet
        Caramel Apple
        Kettle Corn
        Corn Bread
        Biscuits and Gravy
        French Toast
        Omelet
        Breakfast Burrito
        Granola
        Trail Mix
        Beef Jerky
        Banana Bread
        Spinach
        Sweet Potato
        Asparagus
        Radish
        Cabbage
        Cantaloupe
        Grapefruit
        Tangerine
        Cranberry
        Cream Cheese
        Sour Cream
        Ranch Dressing
        Barbecue Sauce
        Maple Syrup
        Pepperoni
        Chicken Pot Pie
        Cheese Puffs
        Apple Pie
        Sub Sandwich
        BLT
        Lucky Charms
        Froot Loops
        Lemon Bars
        Spaghetti and Meatballs
        Peach Cobbler
        Strawberry Shortcake
        Hot Fudge Sundae
        Turkey Sandwich
        Pita Bread
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
        Chicken Alfredo
        Ravioli
        Tortellini
        Calzone
        Garlic Knots
        Minestrone
        French Onion Soup
        Chicken Parmesan
        Philly Cheesesteak
        Panini
        Pulled Pork
        Brisket
        Barbecue Ribs
        Cobb Salad
        Coleslaw
        Potato Salad
        Deviled Eggs
        Belgian Waffle
        Acai Bowl
        Avocado Toast
        California Roll
        Tempura
        Miso Soup
        Udon
        Lo Mein
        General Tso's Chicken
        Sweet and Sour Chicken
        Crab Rangoon
        Curry
        Butter Chicken
        Samosa
        Tostada
        Taquito
        Chimichanga
        Elote
        Horchata
        Sopapilla
        Flan
        Queso
        Pico de Gallo
        Jalapeño
        Chili Dog
        Lobster Roll
        Fish and Chips
        Crab Legs
        Calamari
        Key Lime Pie
        Carrot Cake
        Ice Cream Cake
        Mochi
        Gelato
        Biscotti
        Scone
        Éclair
        Cream Puff
        Snickerdoodle
        Fudge
        Toffee
        Rock Candy
        Pop Rocks
        Jawbreaker
        Cake Pop
        Papaya
        Guava
        Lychee
        Passion Fruit
        Star Fruit
        Plantains
        Okra
        Bok Choy
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
        Coq au Vin
        Bouillabaisse
        Beef Bourguignon
        Croque Monsieur
        Quiche
        Crème Brûlée
        Profiteroles
        Baguette
        Brioche
        Focaccia
        Prosciutto
        Burrata
        Pesto
        Carbonara
        Arancini
        Panna Cotta
        Affogato
        Gazpacho
        Chorizo
        Feijoada
        Pozole
        Carnitas
        Chilaquiles
        Huevos Rancheros
        Tres Leches Cake
        Arepas
        Jerk Chicken
        Tom Yum
        Satay
        Banh Mi
        Bao Buns
        Dim Sum
        Peking Duck
        Bulgogi
        Tteokbokki
        Takoyaki
        Onigiri
        Sashimi
        Wagyu
        Biryani
        Tandoori Chicken
        Chai Latte
        Tabbouleh
        Baba Ganoush
        Moussaka
        Spanakopita
        Souvlaki
        Couscous
        Jollof Rice
        Injera
        Goulash
        Schnitzel
        Bratwurst
        Apple Strudel
        Borscht
        Shepherd's Pie
        Yorkshire Pudding
        Crumpet
        Lobster Bisque
        Shrimp and Grits
        Chicken and Waffles
        Beignets
        Muffuletta
        Deep-Dish Pizza
        Reuben Sandwich
        Matzo Ball Soup
        Cappuccino
        Escargot
        Caviar
        Brie
        Gouda
        Durian
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
        Goofy
        Donald Duck
        Pluto
        Daisy Duck
        Oscar the Grouch
        Grover
        Ernie
        Bert
        Abby Cadabby
        George Pig
        Bandit Heeler
        Mr. Krabs
        Squidward
        Sandy Cheeks
        Gary the Snail
        Kristoff
        Sven
        Eeyore
        Thomas the Tank Engine
        Bob the Builder
        Peter Rabbit
        Arthur
        Pete the Cat
        Llama Llama
        The Very Hungry Caterpillar
        Marshall
        Skye
        Rubble
        Ryder
        Catboy
        Owlette
        Doc McStuffins
        Sofia the First
        Jessie
        Bo Peep
        Rex
        Slinky Dog
        Forky
        Heihei
        Mirabel
        Bruno
        Nala
        Timon
        Pumbaa
        Rafiki
        Mufasa
        Mater
        Poppy
        Branch
        Tails
        Knuckles
        Jigglypuff
        Bulbasaur
        Charmander
        Squirtle
        Supergirl
        Ken
        Strawberry Shortcake
        Care Bears
        Rainbow Dash
        Kuromi
        Jasmine
        Tiana
        Merida
        Aurora
        Gabby
        Boots the Monkey
        Swiper
        Donkey from Shrek
        Princess Fiona
        Ninja Turtles
        Muffin Heeler
        Snow White
        Pinkalicious
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
        Rumi
        Wario
        Princess Daisy
        Diddy Kong
        King Dedede
        Snorlax
        Charizard
        Team Rocket
        Alex from Minecraft
        Crewmate
        Star-Lord
        Rocket Raccoon
        Hawkeye
        Ms. Marvel
        The Flash
        Green Lantern
        Catwoman
        The Joker
        Baymax
        Mr. Incredible
        Elastigirl
        Dash
        Jack-Jack
        Frozone
        Remy the Rat
        Carl Fredricksen
        Russell
        Sulley
        Boo
        Hank the Octopus
        Lotso
        Sadness
        Bing Bong
        Flynn Rider
        Pascal
        Ursula
        Flounder
        Jafar
        Cruella de Vil
        Maleficent
        Tinker Bell
        Mrs. Potts
        Gaston
        Scar
        Zazu
        Baloo
        Mowgli
        Agnes
        Master Shifu
        Hiccup
        King Julien
        Sid the Sloth
        Scrat
        Thing 1 and Thing 2
        Sam-I-Am
        Phineas
        Ferb
        Dr. Doofenshmirtz
        Dipper Pines
        Beast Boy
        Appa
        Totoro
        Junie B. Jones
        Flat Stanley
        Ms. Frizzle
        Mr. Wolf
        Roz the Robot
        Lucy van Pelt
        Daffy Duck
        Tweety Bird
        Wile E. Coyote
        Pink Panther
        Fred Flintstone
        Yogi Bear
        Shaggy
        Velma
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
        Ron Weasley
        Draco Malfoy
        Neville Longbottom
        Luna Lovegood
        Sirius Black
        Hedwig
        Professor McGonagall
        Han Solo
        Rey
        Kylo Ren
        Stormtrooper
        BB-8
        Jabba the Hutt
        Emperor Palpatine
        Anakin Skywalker
        Ewok
        Winter Soldier
        Professor X
        Magneto
        Green Goblin
        Ultron
        The Fantastic Four
        Lex Luthor
        Nightwing
        Ganondorf
        Samus Aran
        Master Chief
        Lara Croft
        Dr. Eggman
        Misty
        Brock
        Gengar
        Sans
        Freddy Fazbear
        Annabeth Chase
        Rowley Jefferson
        The BFG
        Charlie Bucket
        Oompa Loompa
        Fantastic Mr. Fox
        Aslan
        Mr. Tumnus
        The White Witch
        Bilbo Baggins
        Samwise Gamgee
        Bart Simpson
        Lisa Simpson
        Marge Simpson
        Fozzie Bear
        Gonzo
        Swedish Chef
        Jack Skellington
        Kuzco
        Yzma
        Tarzan
        Quasimodo
        Miguel from Coco
        Dr. Watson
        Slimer
        Marty McFly
        Mr. Miyagi
        Davy Jones
        Inigo Montoya
        Tin Man
        Cowardly Lion
        Wicked Witch of the West
        Finn and Jake
        Kim Possible
        Naruto
        Goku
        Luffy
        Sailor Moon
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
        Hester Prynne
        Holden Caulfield
        Scout Finch
        Beowulf
        Grendel
        Macbeth
        Othello
        King Lear
        Puck
        Mercutio
        Elizabeth Bennet
        Mr. Darcy
        Heathcliff
        Captain Ahab
        Moby-Dick
        Dorian Gray
        Hercule Poirot
        Oliver Twist
        Miss Havisham
        Tiny Tim
        Jean Valjean
        Robinson Crusoe
        Long John Silver
        Gulliver
        Rip Van Winkle
        Winston Smith
        Ponyboy Curtis
        Peeta Mellark
        Haymitch Abernathy
        Effie Trinket
        Tris Prior
        Bellatrix Lestrange
        Paul Atreides
        Saruman
        Gimli
        Steve Harrington
        Vecna
        Demogorgon
        Michael Scott
        Dwight Schrute
        Leslie Knope
        Ted Lasso
        Moon Knight
        Doctor Doom
        Jean Grey
        Bane
        Two-Face
        Count Dooku
        General Grievous
        Qui-Gon Jinn
        Dalek
        Kratos
        Cloud Strife
        Toph Beifong
        Sokka
        Uncle Iroh
        Jinx
        Rocky Balboa
        James Bond
        HAL 9000
        Phantom of the Opera
        Captain Nemo
        Pippi Longstocking
        Anne of Green Gables
        Nancy Drew
        Glinda
        Peter Parker
        Tony Stark
        Clark Kent
        Diana Prince
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
        Daniel Tiger's Neighborhood
        PJ Masks
        Gabby's Dollhouse
        Bubble Guppies
        Blaze and the Monster Machines
        Dora the Explorer
        Thomas & Friends
        Clifford the Big Red Dog
        Mister Rogers' Neighborhood
        Wild Kratts
        Blippi
        Little Einsteins
        StoryBots
        Hey Duggee
        Super Why!
        Team Umizoomi
        Pinocchio
        Peter Pan
        Sleeping Beauty
        The Jungle Book
        101 Dalmatians
        Lady and the Tramp
        The Good Dinosaur
        A Bug's Life
        Brave
        Finding Dory
        Planes
        Bolt
        Minions
        How the Grinch Stole Christmas
        A Charlie Brown Christmas
        My Little Pony
        The Smurfs
        Mulan
        Lightyear
        Onward
        The Lorax
        Horton Hears a Who!
        Green Eggs and Ham
        Charlotte's Web
        Stuart Little
        Rio
        Happy Feet
        Cloudy with a Chance of Meatballs
        Zootopia 2
        Toy Story 4
        Frozen 2
        Elinor Wonders Why
        Molly of Denali
        Sid the Science Kid
        Word Party
        Rosie's Rules
        Ada Twist, Scientist
        Barney
        Teletubbies
        Dinosaur Train
        Peg + Cat
        The Wiggles
        Muppet Babies
        Fancy Nancy
        Vampirina
        Dino Ranch
        SuperKitties
        Firebuds
        The Princess and the Frog
        Chicken Little
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
        KPop Demon Hunters
        Kiki's Delivery Service
        The Mitchells vs. the Machines
        Puss in Boots: The Last Wish
        Megamind
        Shark Tale
        Bee Movie
        Monsters vs. Aliens
        Over the Hedge
        The Croods
        Smallfoot
        Abominable
        Klaus
        Leo
        Detective Pikachu
        The Lego Batman Movie
        Ninjago
        James and the Giant Peach
        Fantastic Mr. Fox
        The BFG
        The Iron Giant
        The Land Before Time
        The Fox and the Hound
        Robin Hood
        The Emperor's New Groove
        Tarzan
        Hercules
        Brother Bear
        Meet the Robinsons
        Ralph Breaks the Internet
        Mary Poppins
        Annie
        The Parent Trap
        Freaky Friday
        Hoot
        Because of Winn-Dixie
        Babe
        Air Bud
        The Amazing World of Gumball
        Adventure Time
        Steven Universe
        Hilda
        Miraculous Ladybug
        Henry Danger
        iCarly
        Big City Greens
        Amphibia
        The Owl House
        Odd Squad
        The Magic School Bus
        Bill Nye the Science Guy
        The Fairly OddParents
        DuckTales
        Chip 'n Dale: Rescue Rangers
        Looney Tunes
        Animaniacs
        The Garfield Movie
        Shaun the Sheep
        The Santa Clause
        Arthur Christmas
        The Chronicles of Narnia
        Percy Jackson and the Olympians
        Spy Kids
        The Sea Beast
        Mufasa: The Lion King
        Hannah Montana
        Bunk'd
        Dolphin Tale
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
        The Goonies
        Rogue One
        Spider-Man: Homecoming
        Thor: Ragnarok
        Captain America: Civil War
        Avengers: Infinity War
        Shang-Chi
        Across the Spider-Verse
        Raiders of the Lost Ark
        The NeverEnding Story
        Hook
        Honey, I Shrunk the Kids
        Mrs. Doubtfire
        Cool Runnings
        The Mighty Ducks
        Rookie of the Year
        Angels in the Outfield
        A Wrinkle in Time
        Bridge to Terabithia
        The Hobbit
        Fantastic Beasts
        Zathura
        The Princess Diaries
        Cheaper by the Dozen
        Nacho Libre
        Ready Player One
        Free Guy
        Real Steel
        King Kong
        Transformers
        Men in Black
        The Nightmare Before Christmas
        Corpse Bride
        Spirited Away
        Howl's Moving Castle
        My Hero Academia
        Demon Slayer
        Dragon Ball Z
        The Legend of Korra
        Goosebumps
        Futurama
        Bob's Burgers
        Saved by the Bell
        Full House
        Lizzie McGuire
        That's So Raven
        Wizards of Waverly Place
        Good Luck Charlie
        Austin & Ally
        Victorious
        Drake & Josh
        The Suite Life of Zack & Cody
        MythBusters
        Shark Tank
        American Ninja Warrior
        The Masked Singer
        America's Got Talent
        Survivor
        Jeopardy!
        Wheel of Fortune
        The Great British Baking Show
        Nailed It!
        Planet Earth
        Shark Week
        National Treasure
        The Mummy
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
        The Dark Knight
        The Matrix
        Creed
        Field of Dreams
        Hoosiers
        Rudy
        Friday Night Lights
        The Blind Side
        Miracle
        Coach Carter
        Legally Blonde
        Clueless
        13 Going on 30
        The Devil Wears Prada
        Crazy Rich Asians
        Pitch Perfect
        Mamma Mia!
        Grease
        The Greatest Showman
        La La Land
        Singin' in the Rain
        West Side Story
        Les Misérables
        Into the Woods
        Hairspray
        Bohemian Rhapsody
        Knives Out
        Glass Onion
        Arrival
        Edge of Tomorrow
        Independence Day
        Armageddon
        Tron
        The Batman
        Brooklyn Nine-Nine
        The Good Place
        Modern Family
        Gilmore Girls
        Glee
        Never Have I Ever
        Saturday Night Live
        Sherlock
        Casablanca
        Citizen Kane
        Gone with the Wind
        It's a Wonderful Life
        Groundhog Day
        Footloose
        Mission: Impossible
        Fast & Furious
        The Bourne Identity
        A Quiet Place
        Divergent
        The Maze Runner
        Twilight
        The Fault in Our Stars
        Emma
        Romeo and Juliet
        The Great Gatsby
        To Kill a Mockingbird
        Planet of the Apes
        The Truman Show
        Apollo 13
        Dead Poets Society
        The Social Network
        My Fair Lady
        Gravity
        The Imitation Game
        Ford v Ferrari
        Elvis
        CODA
        Selma
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
        Super Mario Bros. Wonder
        Paper Mario
        Donkey Kong Country
        Yoshi's Island
        Hello Kitty Island Adventure
        Disney Dreamlight Valley
        Lego Batman
        Cut the Rope
        Candy Crush
        Talking Tom
        Hungry Shark
        Duck Hunt
        Wii Fit
        Nintendogs
        Press Start
        Pause Button
        Gold Coins
        Bonus Level
        Player One
        Two Player
        Star Power
        Super Mushroom
        Fire Flower
        Warp Pipe
        Question Block
        Racing Game
        Dance Game
        Game Console
        Diamond Sword
        Pickaxe
        Crafting Table
        Poké Ball
        Sackboy
        Astro Bot
        Mario Golf
        Mario Tennis
        Super Mario Maker
        Princess Peach Showtime!
        Captain Toad
        Donkey Kong Bananza
        Nintendo Switch 2
        Joy-Con
        Pokémon Snap
        Minecraft Dungeons
        Brookhaven
        Dress to Impress
        Grow a Garden
        My Singing Monsters
        Hay Day
        Cookie Run
        Slime Rancher
        Bad Piggies
        Hill Climb Racing
        Jetpack Joyride
        Doodle Jump
        Flappy Bird
        Yoshi's Crafted World
        Super Mario 3D World
        Bluey: The Videogame
        Super Mario Galaxy
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
        Chicken Jockey
        Nether
        Redstone
        Netherite
        Iron Golem
        Battle Bus
        Chug Jug
        Supply Llama
        Default Dance
        Zero Build
        Creative Mode
        Survival Mode
        Emergency Meeting
        Impostor
        Robux
        Obby
        Tower of Hell
        Jailbreak
        Natural Disaster Survival
        Pet Simulator 99
        Royale High
        Work at a Pizza Place
        Bee Swarm Simulator
        Pokémon Scarlet and Violet
        Sonic Frontiers
        Clash of Clans
        EA Sports FC
        MLB The Show
        Overcooked
        Human: Fall Flat
        Untitled Goose Game
        Rec Room
        Gorilla Tag
        Wii Party
        Super Mario Party Jamboree
        Ratchet & Clank
        Lego Fortnite
        Spawn Point
        Health Bar
        Mini-Map
        Inventory
        Hotbar
        Save File
        Tutorial
        Cutscene
        Double Jump
        Wall Jump
        Experience Points
        Squad
        Lobby
        Gamer Tag
        Game Cartridge
        Steam Deck
        VR Headset
        Nintendo DS
        Wii
        Pokédex
        Shiny Pokémon
        Gym Leader
        Master Ball
        Combo
        Teammate
        Friend Request
        Party Chat
        Kirby's Return to Dream Land
        Splatoon 3
        Ender Pearl
        Mario Kart 8 Deluxe
        Pokémon Sword and Shield
        Animal Crossing: New Horizons
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
        Tears of the Kingdom
        Ocarina of Time
        Metroid
        Fire Emblem
        Super Mario 64
        Banjo-Kazooie
        Star Fox
        F-Zero
        Hogwarts Legacy
        Marvel Rivals
        Sea of Thieves
        No Man's Sky
        Subnautica
        Celeste
        Ori and the Blind Forest
        Shovel Knight
        Deltarune
        Bedwars
        Discord
        Steam
        Epic Games
        Game Pass
        Patch Notes
        Nerf
        Buff
        Tier List
        Hitbox
        Spawn Camping
        Ping
        Ranked Match
        Matchmaking
        Battle Royale
        MOBA
        RPG
        Platformer
        Rhythm Game
        Fighting Game
        Tower Defense
        Idle Game
        Co-op
        PvP
        Indie Game
        Pinball
        Claw Machine
        Skee-Ball
        Dance Dance Revolution
        Whac-A-Mole
        Air Hockey
        Ms. Pac-Man
        Asteroids
        Dig Dug
        Punch-Out!!
        Super Nintendo
        GameCube
        Wii U
        PlayStation 2
        Xbox 360
        Kinect
        PlayStation 5
        Beat Saber
        Sonic Adventure
        Kid Icarus
        Pokémon Red and Blue
        Mario Kart 64
        Super Smash Bros. Melee
        Pokémon Legends: Z-A
        Metroid Prime
        Luigi's Mansion 3
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
        Silksong
        Red Dead Redemption
        The Last of Us
        God of War
        Mass Effect
        BioShock
        Fallout
        Assassin's Creed
        Uncharted
        Tomb Raider
        Persona 5
        Xenoblade Chronicles
        Chrono Trigger
        EarthBound
        Monster Hunter
        Destiny
        Titanfall
        Counter-Strike
        Rainbow Six Siege
        StarCraft
        Diablo
        Team Fortress 2
        Gran Turismo
        Forza Horizon
        Need for Speed
        Tony Hawk's Pro Skater
        Rock Band
        Super Mario Bros. 3
        Tekken
        Myst
        RollerCoaster Tycoon
        Factorio
        Lethal Company
        Balatro
        Slay the Spire
        Outer Wilds
        Journey
        Shadow of the Colossus
        Okami
        Katamari Damacy
        It Takes Two
        Clair Obscur: Expedition 33
        Metroidvania
        Soulslike
        Grinding
        Aggro
        Cooldown
        Critical Hit
        Open Beta
        Day-One Patch
        Live Service Game
        Gacha
        Skill Tree
        Fast Travel
        Fog of War
        Permadeath
        Procedural Generation
        Quick Time Event
        Boss Rush
        Unreal Engine
        Sega Dreamcast
        Game Boy Advance
        Commodore 64
        Arcade Cabinet
        GameStop
        The Game Awards
        Konami Code
        Modding
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
        Baseball Bat
        Baseball Glove
        Hockey Stick
        Golf Ball
        Tennis Racket
        Ice Skates
        Roller Skates
        Scooter
        Tricycle
        Monkey Bars
        Seesaw
        Duck Duck Goose
        Red Light Green Light
        Freeze Tag
        Red Rover
        Four Square
        Tug of War
        Sack Race
        Egg and Spoon Race
        Three-Legged Race
        Leapfrog
        Hot Potato
        Playing Catch
        Frisbee
        Kite
        Mini Golf
        T-Ball
        Ballet
        Diving Board
        Swim Goggles
        Horseback Riding
        Fishing
        Hiking
        Balance Beam
        Push-Ups
        Jumping Jacks
        Sit-Ups
        Finish Line
        First Place
        Gold Medal
        Jersey
        Shin Guards
        Knee Pads
        Stopwatch
        Scoreboard
        Mascot
        Dribble
        Home Plate
        Taekwondo
        Yoga
        Pogo Stick
        Go-Kart
        Monster Truck
        Dirt Bike
        BMX Bike
        Boogie Board
        Wiffle Ball
        Badminton
        Cornhole
        Simon Says
        Soccer Ball
        Basketball Hoop
        Swing Set
        Slide
        Bowling Pins
        Water Skiing
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
        Jump Ball
        Corner Kick
        Throw-In
        Slide Tackle
        Spike
        Bounce Pass
        Jump Shot
        Timeout
        Overtime
        Halftime
        Point Guard
        Foul Ball
        Pop Fly
        Shortstop
        Outfield
        Dugout
        Bases Loaded
        Kickoff
        Punt
        End Zone
        Huddle
        Tackle
        First Down
        Running Back
        Wide Receiver
        Slap Shot
        Penalty Box
        Zamboni
        Face-Off
        Putt
        Golf Cart
        Sand Trap
        Sprint
        Baton
        Uneven Bars
        Pommel Horse
        Handstand
        Splits
        Back Handspring
        Freestyle
        Backstroke
        Cannonball
        Belly Flop
        Bobsled
        Figure Skating
        Speed Skating
        Ski Jump
        Black Belt
        Kung Fu
        Gutter Ball
        Kickflip
        Ollie
        Half-Pipe
        Mountain Biking
        Motocross
        NASCAR
        Rodeo
        Bull Riding
        NBA
        NFL
        Little League
        Harlem Globetrotters
        Pickleball
        Paintball
        Laser Tag
        Obstacle Course
        Double Dutch
        Gatorade Shower
        The Wave
        Foam Finger
        Coin Toss
        Victory Lap
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
        Charge
        Assist
        Swish
        Nothing but Net
        Technical Foul
        And-One
        Fadeaway
        Curveball
        Changeup
        Fastball
        Double Play
        Walk-Off Home Run
        Pinch Hitter
        Batting Average
        Bullpen
        Rain Delay
        Blitz
        Safety
        Touchback
        Two-Minute Warning
        False Start
        Fantasy Football
        Golden Goal
        Own Goal
        Free Kick
        Icing
        Body Check
        Penalty Shot
        Ace
        Match Point
        Wimbledon
        Backhand
        Birdie
        Fore!
        The Masters
        Green Jacket
        Driving Range
        Shot Put
        Discus
        High Jump
        Decathlon
        Vault
        Perfect 10
        Curling
        Biathlon
        Slalom
        Moguls
        Judo
        Kickboxing
        Sumo Wrestling
        Knockout
        Formula 1
        Daytona 500
        Indy 500
        Pit Stop
        Kentucky Derby
        Tour de France
        Parkour
        Cross-Country
        Field Hockey
        Synchronized Swimming
        Cricket
        Kevin Durant
        Giannis Antetokounmpo
        Travis Kelce
        Aaron Judge
        Megan Rapinoe
        Katie Ledecky
        Michael Phelps
        Tony Hawk
        Shaun White
        A'ja Wilson
        Home Run Derby
        X Games
        Final Four
        Heisman Trophy
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
        Box Out
        Backdoor Cut
        Give-and-Go
        Posterize
        Three-Second Violation
        Double-Double
        Salary Cap
        Trade Deadline
        Squeeze Play
        Hit for the Cycle
        No-Hitter
        Immaculate Inning
        Wild Card
        Sabermetrics
        Earned Run Average
        Rally Cap
        Audible
        Pick-Six
        Shotgun Formation
        Fair Catch
        Lambeau Leap
        Flea Flicker
        Clean Sheet
        Rabona
        Relegation
        Transfer Window
        Ballon d'Or
        Champions League
        El Clásico
        Golden Boot
        Five-Hole
        Empty Net
        Break Point
        Double Fault
        Drop Shot
        Mulligan
        The Yips
        Ryder Cup
        Back Nine
        VAR
        Hall of Fame
        Walk-On
        Redshirt
        NIL Deal
        Three-Peat
        Cinderella Story
        Sudden Death
        Ultramarathon
        Ironman Triathlon
        Nikola Jokić
        Shai Gilgeous-Alexander
        Lamar Jackson
        Saquon Barkley
        Erling Haaland
        Coco Gauff
        Novak Djokovic
        Roger Federer
        Scottie Scheffler
        Connor McDavid
        Max Verstappen
        Noah Lyles
        Mondo Duplantis
        Paige Bueckers
        Billie Jean King
        Pelé
        Bill Russell
        Kareem Abdul-Jabbar
        Larry Bird
        Jerry Rice
        Derek Jeter
        Hank Aaron
        Lou Gehrig
        Mia Hamm
        Nadia Comăneci
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
        Hop like a frog
        Slither like a snake
        Buzz like a bee
        Moo like a cow
        Quack like a duck
        Oink like a pig
        Meow like a kitten
        Stomp like a dinosaur
        Swing like a monkey
        Walk like a crab
        Gallop like a horse
        Sneak like a mouse
        Stretch like a cat
        Crawl like a baby
        Swing on a swing
        Go down a slide
        Lick a lollipop
        Give a high five
        Put on your shoes
        Zip up your coat
        Comb your hair
        Snore
        Hiccup
        Giggle
        Whisper
        Wink
        Make a funny face
        Stick out your tongue
        Shiver
        Be a statue
        Blast off like a rocket
        Drive a car
        Fly an airplane
        Dig in the sand
        Plant a flower
        Water the plants
        Pick an apple
        Catch a butterfly
        Pet a dog
        Feed the ducks
        Jump in puddles
        Make a snow angel
        Throw a snowball
        Rake leaves
        Bounce a ball
        Blow up a balloon
        Color with crayons
        Cut with scissors
        Slurp noodles
        Peel a banana
        Stir a pot
        Sweep the floor
        Make your bed
        Rock a baby
        Pull a wagon
        Knock on a door
        Talk on the phone
        Look through binoculars
        Take a picture
        Roll down a hill
        Do a happy dance
        Wiggle like jelly
        Melt like a snowman
        March in a parade
        Smell a flower
        Eat popcorn
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
        Walk on ice
        Do a handstand
        Play hopscotch
        Shoot a bow and arrow
        Throw a frisbee
        Swing a tennis racket
        Kick a field goal
        Score a goal
        Spin a hula hoop
        Ride a skateboard
        Ride a unicycle
        Jump on a pogo stick
        Ice skate
        Roller skate
        Climb a tree
        Swing from vines
        Hang from monkey bars
        Put on sunscreen
        Pitch a tent
        Roast a marshmallow
        Catch a fish
        Feed the chickens
        Ride a camel
        Wash a car
        Mop the floor
        Fold laundry
        Iron a shirt
        Set the table
        Make a sandwich
        Decorate a cake
        Pour a bowl of cereal
        Eat corn on the cob
        Drink a milkshake
        Be a mime in a box
        Lift weights
        Dribble a basketball
        Do a karate chop
        Steer a ship
        Drive a race car
        Jump into a pool
        Do a belly flop
        Swim underwater
        Snorkel
        Plant a garden
        Raise your hand
        Write on a chalkboard
        Sharpen a pencil
        Paint your nails
        Look in a mirror
        Sneak a cookie
        Sing in the shower
        Bang a gong
        Tap dance
        Do the chicken dance
        Be a scarecrow
        Walk like a zombie
        Scratch an itch
        Blow your nose
        Smell something stinky
        Taste something yucky
        Open a jar
        Blow a bubble with gum
        Whistle
        Snap your fingers
        Touch your toes
        Stand like a flamingo
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
        Dab
        Do the worm
        Breakdance
        Do the Macarena
        Hit the Griddy
        Do the Electric Slide
        Ride a mechanical bull
        Climb a rock wall
        Bungee jump
        Ride a zip line
        Snowboard down a mountain
        Go down a water slide
        Land a kickflip
        Juggle a soccer ball
        Spin a basketball on your finger
        Hit a piñata
        Crowd surf
        Play the air drums
        Sing opera
        Sing karaoke
        Lip-sync a song
        Play the bagpipes
        Walk in slow motion
        Walk against the wind
        Walk in high heels
        Walk on hot sand
        Eat a hot pepper
        Eat with chopsticks
        Blow on hot soup
        Stuck in a revolving door
        Lost in a corn maze
        Sneak past a sleeping dog
        Wake up late for school
        Carry too many groceries
        Lose your shoe in the mud
        Step in gum
        Get hit with a water balloon
        Win a hot dog eating contest
        Get a pie in the face
        Watch a scary movie
        Chase an ice cream truck
        Report the weather
        Do the mannequin challenge
        Walk through a haunted house
        Swim with sharks
        Play a video game
        Celebrate a touchdown
        Ride a jet ski
        Paddleboard
        Hit a home run
        Climb a rope in gym class
        Do a cannonball
        Crack your knuckles
        Bathe a cat
        Get chased by a goose
        Feed a giraffe
        Ride an ostrich
        Be a sumo wrestler
        Arm wrestle
        Do a yoga pose
        Pop a wheelie
        Paint a self-portrait
        Toss pizza dough
        Carve a pumpkin
        Shovel snow
        Change a lightbulb
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
        Merge onto the freeway
        Take your driver's test
        Pump gas
        Jump-start a car
        Change a flat tire
        Do a promposal
        Slow dance
        Film a TikTok dance
        Go live on a stream
        Unbox a package
        Host a cooking show
        Host a podcast
        Freestyle rap
        Do stand-up comedy
        Audition for a musical
        Give a TED Talk
        Object in court
        Be an auctioneer
        Sell a used car
        Pitch on Shark Tank
        Finish a marathon
        Hold a plank
        Bench press
        Get lost in IKEA
        Wait in a long line
        Go through airport security
        Miss your flight
        Lose your luggage
        Ride a crowded subway
        Cram for finals
        Pull an all-nighter
        Babysit triplets
        Walk five dogs at once
        Haggle at a yard sale
        Flip burgers at a cookout
        Wait tables
        Make a latte
        Text and walk into a pole
        Drop your phone in the toilet
        Realize you're on mute
        Sneeze in a quiet room
        Trip on stage
        Forget your lines
        Win an Oscar
        Dodge the paparazzi
        Be a bodyguard
        Spot a celebrity
        Go ice fishing
        Parasail
        Hang glide
        Paddle a gondola
        Ride a Segway
        Drive a stick shift
        Walk on the moon
        Float in zero gravity
        Solve a Rubik's Cube
        Play chess
        Knit a scarf
        Sew on a button
        Throw pottery on a wheel
        Plunge a toilet
        Catch a spider in a cup
        Chase a mouse with a broom
        Reply-all by accident
        Video call with a frozen screen
        Clean out the fridge
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
        Sink
        Faucet
        Soap
        Shampoo
        Rubber Duck
        Toilet Paper
        Hairbrush
        Toothpaste
        Bowl
        Napkin
        Straw
        Baby Bottle
        Teapot
        Water Bottle
        Basket
        Stroller
        Crib
        High Chair
        Rocking Chair
        Bookshelf
        Dresser
        Closet
        Rug
        Picture Frame
        Candle
        Camera
        Glasses
        Watch
        Coat
        Pajamas
        Boots
        Slippers
        Scarf
        Raincoat
        Dress
        Shirt
        Pants
        Hoodie
        Necklace
        Doll
        Blocks
        Puzzle
        Yo-Yo
        Jack-in-the-Box
        Rocking Horse
        Train Set
        Dollhouse
        Play-Doh
        Slinky
        Spinning Top
        Bubble Wand
        Bucket and Shovel
        Tape
        Envelope
        Band-Aid
        Fire Truck
        Garbage Truck
        Dump Truck
        Excavator
        Bulldozer
        Helicopter
        Airplane
        Tractor
        Ambulance
        Police Car
        Submarine
        Hot Air Balloon
        Sailboat
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
        Labubu
        Freezer
        Stove
        Coffee Maker
        Rolling Pin
        Whisk
        Spatula
        Ladle
        Measuring Cup
        Cookie Cutter
        Cutting Board
        Cheese Grater
        Ice Cube Tray
        Thermos
        Pizza Cutter
        Salt Shaker
        Toolbox
        Hammer
        Screwdriver
        Wrench
        Tape Measure
        Ladder
        Paint Roller
        Extension Cord
        Duct Tape
        Super Glue
        Rubber Band
        Paper Clip
        Stapler
        Safety Pin
        Zipper
        Velcro
        Shoelaces
        Suitcase
        Sleeping Bag
        Lantern
        Compass
        Binoculars
        Piggy Bank
        Wallet
        Headband
        Baseball Cap
        Bow Tie
        Necktie
        Swimsuit
        Flip-Flops
        Earmuffs
        Life Jacket
        Bike Helmet
        Doormat
        Bird Feeder
        Doghouse
        Fish Tank
        Hamster Wheel
        Leash
        Wheelbarrow
        Watering Can
        Flower Pot
        Hammock
        Grill
        Pool Noodle
        Beach Ball
        Cooler
        Snow Globe
        Hourglass
        Cash Register
        Shopping Cart
        Gumball Machine
        Pacifier
        Plunger
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
        Phone Case
        PopSocket
        Selfie Stick
        Tripod
        Power Bank
        USB Cable
        HDMI Cable
        Router
        Keyboard
        Monitor
        Headset
        Bluetooth Speaker
        Smart Speaker
        Doorbell Camera
        Security Camera
        Baby Monitor
        Fitness Tracker
        Label Maker
        Paper Shredder
        Hole Punch
        Pencil Case
        Lanyard
        Key Card
        Padlock
        Bike Lock
        Fidget Spinner
        Stress Ball
        Rubik's Cube
        Magic 8 Ball
        Lava Lamp
        LED Lights
        String Lights
        Bean Bag Chair
        Gaming Chair
        Weighted Blanket
        Humidifier
        Air Purifier
        Space Heater
        Electric Toothbrush
        Hair Straightener
        Metal Detector
        Remote-Control Car
        Nerf Blaster
        Kinetic Sand
        Slime
        Film Camera
        Camcorder
        Projector
        Boombox
        Cassette Tape
        CD Player
        Flip Phone
        Landline
        Typewriter
        ATM
        Parking Meter
        Traffic Light
        Stop Sign
        Fire Hydrant
        Conveyor Belt
        Jackhammer
        Cement Mixer
        Blimp
        Hovercraft
        Monorail
        Cable Car
        E-Bike
        Leaf Blower
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
        Machine Learning
        Chatbot
        Deepfake
        Neural Network
        Blockchain
        NFT
        Encryption
        Malware
        Hacker
        Data Breach
        VPN
        Incognito Mode
        Clickbait
        Doomscrolling
        Digital Footprint
        Terms of Service
        Open Source
        Cybersecurity
        Data Center
        Fiber Optic Cable
        5G
        Buffering
        Hologram
        Smart Glasses
        Exoskeleton
        Quantum Computer
        Supercomputer
        Microchip
        Circuit Board
        Motherboard
        Graphics Card
        Hard Drive
        Operating System
        Source Code
        Hackathon
        Startup
        App Store
        Subscription
        Paywall
        Unsubscribe
        Push Notification
        Voice Assistant
        Delivery Drone
        Tap to Pay
        Digital Wallet
        Gift Card
        Promo Code
        Tracking Number
        Webinar
        Livestream
        Unboxing Video
        Vlog
        GIF
        Green Screen
        Charging Station
        Humanoid Robot
        Robotic Arm
        Assembly Line
        Night-Vision Goggles
        Lie Detector
        Jetpack
        Flying Car
        Fax Machine
        Pager
        Floppy Disk
        Dial-Up Internet
        VHS Tape
        Walkman
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
        Sky
        Sunset
        Sunrise
        Shooting Star
        Full Moon
        Outer Space
        Raindrop
        Fog
        Hail
        Frost
        Icicle
        Mud
        Dirt
        Sand
        Pebble
        Seashell
        Leaf
        Roots
        Acorn
        Pinecone
        Grass
        Nest
        Feather
        Teeth
        Muscles
        Skin
        Heartbeat
        Five Senses
        Eyes
        Ears
        Nose
        Fingerprint
        Belly Button
        Melting
        Freezing
        Boiling Water
        Steam
        Primary Colors
        Echo
        Push and Pull
        Sink or Float
        Ramp
        Gears
        Sprout
        Cocoon
        Air
        Water
        Space Suit
        Crater
        Stethoscope
        X-Ray
        Loose Tooth
        Snowstorm
        Storm
        Sunshine
        Night Sky
        Weather
        Plant
        Light
        Sound
        Hot and Cold
        Dinosaur Bones
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
        Mercury
        Venus
        Neptune
        Uranus
        Pluto
        Moon Phases
        Asteroid
        Rocket Launch
        Mission Control
        Blizzard
        Thunderstorm
        Weather Forecast
        Drought
        Flood
        Wildfire
        Glacier
        Iceberg
        Lava
        Minerals
        Quartz
        Gemstone
        Paleontologist
        Amber
        Stem
        Petals
        Pollen
        Pollination
        Nectar
        Chrysalis
        Camouflage
        Herbivore
        Carnivore
        Omnivore
        Endangered Species
        Extinct
        Nocturnal
        Skull
        Rib Cage
        Spine
        Taste Buds
        Bacteria
        Liquid
        Gas
        Wind Turbine
        Circuit
        Simple Machines
        Lever
        Pulley
        Inclined Plane
        Test Tube
        Beaker
        Safety Goggles
        Lab Coat
        Scientist
        Experiment
        Prism
        Reflection
        Tide
        Coral Reef
        Deep Sea
        Pollution
        Compost
        Seaweed
        Sunspot
        Meteorite
        Air Pressure
        Weather Balloon
        Rain Gauge
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
        Nucleus
        Cell Membrane
        Chloroplast
        Amoeba
        Fungi
        Species
        Heredity
        Adaptation
        Symbiosis
        Decomposer
        Biome
        Savanna
        Wetland
        Invasive Species
        Oxygen
        Respiration
        Nervous System
        Skeletal System
        Red Blood Cells
        White Blood Cells
        Plasma
        Density
        Volume
        Boiling Point
        Solution
        Compound
        Element
        Helium
        Acid
        Force
        Acceleration
        Insulator
        Electromagnet
        Sound Waves
        Frequency
        Lens
        Renewable Energy
        Fossil Fuels
        Hydropower
        Earth's Core
        Magma
        Fault Line
        Richter Scale
        Erosion
        Igneous Rock
        Sedimentary Rock
        Metamorphic Rock
        Stalactite
        Stalagmite
        Ring of Fire
        Pangaea
        Ozone Layer
        Jet Stream
        Barometer
        Cold Front
        Dwarf Planet
        Solar Flare
        Orbit
        Hubble Space Telescope
        James Webb Telescope
        Apollo 11
        Neil Armstrong
        Orion
        North Star
        Halley's Comet
        Great Red Spot
        Control Group
        Petri Dish
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
        Ribosome
        Cytoplasm
        Golgi Apparatus
        Mitosis
        Meiosis
        RNA
        Double Helix
        Genome
        Mutation
        Allele
        Genotype
        Phenotype
        Homeostasis
        Enzyme
        Cellular Respiration
        Osmosis
        Diffusion
        Stem Cells
        Cloning
        Pathogen
        Pandemic
        Herd Immunity
        Placebo
        Microbiome
        Nitrogen Cycle
        Keystone Species
        Carrying Capacity
        Ionic Bond
        Alkali Metals
        Valence Electrons
        Neutron
        Quark
        Oxidation
        Exothermic Reaction
        Activation Energy
        Entropy
        Radioactive Decay
        Carbon Dating
        Nuclear Fusion
        Polymer
        Alloy
        Titration
        Centripetal Force
        Torque
        Ohm's Law
        Voltage
        Electromagnetic Spectrum
        Ultraviolet
        Gamma Rays
        Doppler Effect
        Schrödinger's Cat
        Uncertainty Principle
        Higgs Boson
        Large Hadron Collider
        Thermodynamics
        Terminal Velocity
        Event Horizon
        Redshift
        Pulsar
        Quasar
        Dark Energy
        Heliocentric Model
        Proxima Centauri
        Goldilocks Zone
        Oort Cloud
        Kuiper Belt
        Ocean Acidification
        Permafrost
        El Niño
        Deforestation
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
        House
        Apartment
        Garden
        Pond
        Lake
        River
        Hill
        Splash Pad
        Petting Zoo
        Apple Orchard
        Chicken Coop
        Stable
        Bank
        Car Wash
        Gas Station
        Bus Stop
        Parking Lot
        Barbershop
        Hair Salon
        Gym
        Pizza Parlor
        Donut Shop
        Candy Store
        Bookstore
        Shoe Store
        Flower Shop
        Farmers Market
        Ice Rink
        Roller Rink
        Carousel
        Ferris Wheel
        Roller Coaster
        Bumper Cars
        County Fair
        Carnival
        Cabin
        Farmhouse
        Living Room
        Bathroom
        Porch
        Front Yard
        Sidewalk
        Neighborhood
        City
        Bridge
        Tunnel
        Construction Site
        Stadium
        Soccer Field
        Basketball Court
        Vet's Office
        Animal Shelter
        Daycare
        Swamp
        Grandma's House
        Subway
        Pier
        Boardwalk
        Harbor
        Snack Bar
        Pillow Fort
        Playroom
        Lemonade Stand
        Space Station
        Science Center
        Butterfly Garden
        Sandbox
        Pumpkin Patch
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
        California
        Washington State
        Oregon
        Idaho
        Colorado
        Arizona
        Las Vegas
        Chicago
        Los Angeles
        Seattle
        Spokane
        San Francisco
        Boston
        Orlando
        Nashville
        Disney World
        SeaWorld
        Legoland
        Universal Studios
        Mount St. Helens
        Old Faithful
        Redwood Forest
        Everglades
        Lincoln Memorial
        Washington Monument
        Empire State Building
        Gateway Arch
        The Alamo
        Kennedy Space Center
        Area 51
        Canyon
        Valley
        Oasis
        Prairie
        South Pole
        Equator
        Africa
        Asia
        Europe
        South America
        England
        France
        Germany
        Spain
        Ireland
        Russia
        Kenya
        Peru
        Puerto Rico
        Pharmacy
        City Hall
        Planetarium
        Botanical Garden
        Greenhouse
        Factory
        Junkyard
        Golf Course
        Batting Cage
        Trampoline Park
        Escape Room
        Drive-Thru
        Diner
        Food Truck
        Coffee Shop
        Drive-In Theater
        National Park
        Cruise Ship
        Secret Hideout
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
        Berlin
        Madrid
        Moscow
        Beijing
        Hong Kong
        Singapore
        Bangkok
        Sydney
        Toronto
        Vancouver
        Mexico City
        Athens
        Dublin
        South Korea
        Thailand
        Vietnam
        Philippines
        Argentina
        Chile
        Colombia
        Jamaica
        Morocco
        South Africa
        Nigeria
        Norway
        Sweden
        Switzerland
        Netherlands
        Portugal
        Tower Bridge
        London Eye
        Mount Vesuvius
        Pompeii
        Parthenon
        Forbidden City
        Terracotta Army
        Easter Island
        Victoria Falls
        Nile River
        Himalayas
        Alps
        Andes Mountains
        Appalachian Mountains
        Gobi Desert
        Mojave Desert
        Arctic Ocean
        Indian Ocean
        Caribbean Sea
        Panama Canal
        Mount Hood
        Crater Lake
        Yosemite
        Glacier National Park
        Badlands
        Carlsbad Caverns
        Smoky Mountains
        Lake Tahoe
        Hollywood Walk of Fame
        Pike Place Market
        Ellis Island
        Independence Hall
        Pearl Harbor
        French Quarter
        Fenway Park
        Wrigley Field
        Yankee Stadium
        Madison Square Garden
        U.S. Capitol
        Four Corners
        Las Vegas Strip
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
        Kyoto
        Shanghai
        Taipei
        Hanoi
        Kathmandu
        Bali
        Nairobi
        Cape Town
        Timbuktu
        Zanzibar
        Lisbon
        Prague
        Budapest
        Copenhagen
        Stockholm
        Reykjavík
        St. Petersburg
        Brussels
        Florence
        Santorini
        Monaco
        Bora Bora
        Fiji
        Maldives
        Atacama Desert
        Angel Falls
        Iguazu Falls
        Lake Titicaca
        Uluru
        Outback
        K2
        Mariana Trench
        Kalahari Desert
        Congo River
        Mekong River
        Danube River
        Strait of Gibraltar
        Caspian Sea
        Black Sea
        Arctic Circle
        Siberia
        Tibet
        Silk Road
        Hagia Sophia
        Alhambra
        Versailles
        Mont Saint-Michel
        Neuschwanstein Castle
        Giant's Causeway
        Loch Ness
        Banff
        Quebec City
        Chernobyl
        Denali
        Arches National Park
        Monument Valley
        Mesa Verde
        Bryce Canyon
        Sequoia National Park
        Big Sur
        Mount Vernon
        Jamestown
        Plymouth Rock
        Fort Knox
        Harvard
        Yale
        MIT
        Oxford
        Mall of America
        Beverly Hills
        Key West
        Cape Cod
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
        Once Upon a Time
        Happily Ever After
        Magic Spell
        Magic Potion
        Cauldron
        Broomstick
        Pumpkin Carriage
        Glass Slipper
        Frog Prince
        Prince
        Queen
        King
        Jester
        Baby Dragon
        Magic Beans
        Beanstalk
        Golden Egg
        Toy Soldier
        Enchanted Forest
        Fairy Wings
        Mermaid Tail
        Treasure Map
        Eye Patch
        Flying Saucer
        Martian
        Monster Under the Bed
        Imaginary Friend
        Super Speed
        Super Strength
        Sidekick
        Villain
        Mask
        Shield
        Magic Sword
        Suit of Armor
        Moat
        Drawbridge
        Throne
        Royal Ball
        Tiara
        Jack Frost
        Mother Goose
        Humpty Dumpty
        Princess and the Pea
        Ugly Duckling
        Tortoise and the Hare
        Three Billy Goats Gruff
        Magic Lamp
        Wishing Star
        Snow Queen
        Ice Palace
        Under the Sea
        Buried Treasure
        X Marks the Spot
        Message in a Bottle
        Wizard Hat
        Mushroom House
        Unicorn Horn
        Fire-Breathing Dragon
        Knight in Shining Armor
        Cow Jumped Over the Moon
        Rainbow Bridge
        Candy Kingdom
        Teddy Bear Picnic
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
        Spinosaurus
        Ankylosaurus
        Diplodocus
        Parasaurolophus
        Allosaurus
        Iguanodon
        Mosasaurus
        Plesiosaurus
        Pixie
        Siren
        Dragon Rider
        Dragon Slayer
        Wizard's Staff
        Ghost Ship
        Teleporter
        Force Field
        Laser Beam
        Alien Invasion
        X-Ray Vision
        Mind Reading
        Invisibility
        Teleportation
        Freeze Ray
        Secret Identity
        Utility Belt
        Batmobile
        Bat Signal
        Kryptonite
        Lightsaber
        Hogwarts
        Quidditch
        Sorting Hat
        Golden Snitch
        Magic Wardrobe
        Yellow Brick Road
        Emerald City
        Ruby Slippers
        Neverland
        Wonderland
        Rabbit Hole
        Mad Tea Party
        Queen of Hearts
        Golden Ticket
        Thumbelina
        The Elves and the Shoemaker
        The Emperor's New Clothes
        The Little Red Hen
        Stone Soup
        Babe the Blue Ox
        Sea Serpent
        Jackalope
        Gremlin
        Imp
        Space Pirate
        Treasure Island
        Ghost Town
        Fortune Teller
        Magician
        Dragon's Lair
        Enchanted Castle
        Sea Witch
        Ice Dragon
        Robot Dog
        Moon Base
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
        Harpy
        Chimera
        Manticore
        Gorgon
        Satyr
        Wyvern
        Hippogriff
        Dementor
        Patronus
        Time-Turner
        Marauder's Map
        Elder Wand
        One Ring
        Mordor
        Middle-earth
        The Shire
        Orc
        Camp Half-Blood
        Demigod
        The Force
        Jedi
        Sith
        Death Star
        Infinity Gauntlet
        Vibranium
        Wakanda
        Asgard
        Fortress of Solitude
        Gotham City
        Krypton
        Batcave
        Changeling
        Doppelgänger
        Poltergeist
        Ghoul
        Zombie Apocalypse
        Chinese Dragon
        Spinning Wheel
        Evil Queen
        Wicked Stepmother
        Ali Baba
        Open Sesame
        Sinbad
        Sword in the Stone
        Lady of the Lake
        Knights of the Round Table
        Sir Lancelot
        Maid Marian
        Sherwood Forest
        Sheriff of Nottingham
        Flying Dutchman
        Cursed Treasure
        Telekinesis
        Arch-Nemesis
        Mutant
        Cyborg
        Android
        Mothership
        Sleepy Hollow
        Transylvania
        Alchemist
        Dungeon
        Dragon Hoard
        Prophecy
        Chosen One
        Ancient Curse
        Magic Portal
        Secret Passage
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
        Apollo
        Artemis
        Ares
        Aphrodite
        Hermes
        Hera
        Hephaestus
        Dionysus
        Kronos
        Prometheus
        Atlas
        Titans
        Narcissus
        Orpheus
        Perseus
        Theseus
        Helen of Troy
        Trojan War
        Sisyphus
        River Styx
        Elysian Fields
        Nectar and Ambrosia
        The Muses
        Romulus and Remus
        Freya
        Baldur
        Heimdall
        Yggdrasil
        Ragnarök
        Bifrost
        Midgard Serpent
        Sleipnir
        Frost Giants
        Osiris
        Horus
        Bastet
        Thoth
        Eye of Horus
        Monkey King
        Selkie
        Kelpie
        Mordred
        Morgan le Fay
        Avalon
        Shangri-La
        Utopia
        Mothman
        Jersey Devil
        Kappa
        Bunyip
        Pecos Bill
        Brer Rabbit
        Anansi
        Firebird
        Parallel Universe
        Time Paradox
        Butterfly Effect
        Robot Uprising
        Dyson Sphere
        Warp Drive
        Hyperspace
        Terraforming
        Kaiju
        Mecha
        Steampunk
        Hero's Journey
        Dark Lord
        Damsel in Distress
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
        Kindergarten
        Markers
        Colored Pencils
        Pencil Box
        Folder
        Notebook
        Picture Book
        Librarian
        Bus Driver
        Custodian
        School Nurse
        Crossing Guard
        Snack Time
        Circle Time
        Clean-Up Time
        Numbers
        Shapes
        Colors
        ABCs
        Letters
        Reading
        Writing
        Math
        Addition
        Sight Words
        Gold Star
        Sticker Chart
        Water Fountain
        Hand Sanitizer
        Paper Airplane
        Finger Painting
        100th Day of School
        Pajama Day
        Crazy Hair Day
        Teacher's Pet
        Apple for the Teacher
        Lunch Tray
        Milk Carton
        Inside Voice
        Reading Buddy
        Caveman
        Cowboy
        Covered Wagon
        President
        American Flag
        Counting
        Spelling Test
        Morning Meeting
        Bathroom Pass
        Lunch Money
        Pledge of Allegiance
        Map
        Glue
        Library Book
        Book Bag
        Tracing Letters
        Class Helper
        Library Day
        Art Smock
        School Garden
        Morning Bell
        Weather Helper
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
        Subtraction
        Long Division
        Decimals
        Place Value
        Word Problem
        Number Line
        Area and Perimeter
        Telling Time
        Counting Coins
        Roman Numerals
        Odd Numbers
        Verb
        Adjective
        Punctuation
        Exclamation Point
        Question Mark
        Capital Letters
        Compound Words
        Poetry
        Biography
        Chapter Book
        Book Fair
        Journal
        Vocabulary
        Flash Cards
        Honor Roll
        Safety Patrol
        P.E. Class
        Art Project
        Diorama
        Poster Board
        Glitter Glue
        Watercolors
        State Capital
        Compass Rose
        Time Line
        First Thanksgiving
        Thomas Jefferson
        Betsy Ross
        Paul Revere
        Helen Keller
        Ruby Bridges
        George Washington Carver
        Dr. Seuss
        Walt Disney
        Alexander Graham Bell
        Henry Ford
        Teddy Roosevelt
        Pioneers
        One-Room Schoolhouse
        Quill Pen
        Abacus
        Telephone
        Chromebook
        Pizza Friday
        Indoor Recess
        Assembly
        Career Day
        Spirit Week
        Class Party
        Open House
        Parent-Teacher Conference
        School Supplies
        Permission Slip
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
        Homeroom
        Passing Period
        Electives
        Shop Class
        Home Economics
        Robotics Club
        Chess Club
        Student Council
        School Newspaper
        Pep Rally
        Dress Code
        Tardy Slip
        Progress Report
        Group Project
        Ratios
        Percentages
        Negative Numbers
        Exponents
        Equations
        Pi
        Coordinate Plane
        Order of Operations
        Prime Numbers
        Square Root
        Simile
        Metaphor
        Onomatopoeia
        Personification
        Haiku
        Plot Twist
        Main Idea
        Rough Draft
        Bibliography
        Ancient Rome
        Ancient China
        Mesopotamia
        Hieroglyphics
        Pharaoh
        Middle Ages
        Aztecs
        Maya
        Marco Polo
        Ferdinand Magellan
        Thirteen Colonies
        Minutemen
        Redcoats
        Founding Fathers
        Alexander Hamilton
        John Adams
        Westward Expansion
        Transcontinental Railroad
        Wild West
        Civil Rights Movement
        Sojourner Truth
        Malala Yousafzai
        Nikola Tesla
        Galileo
        Pythagoras
        Archimedes
        Michelangelo
        Space Race
        Franklin D. Roosevelt
        John F. Kennedy
        Sitting Bull
        Squanto
        Morse Code
        Telegraph
        Printing Press
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
        AP Exam
        ACT
        GPA
        Senior Prank
        Class Ring
        Letterman Jacket
        Driver's Ed
        Learner's Permit
        Study Abroad
        Debate Team
        Model UN
        Mock Trial
        Salutatorian
        Cap and Gown
        Diploma
        Scholarship
        Campus Tour
        Dorm Room
        Senioritis
        Graphing Calculator
        Calculus
        Pythagorean Theorem
        Quadratic Formula
        Statistics
        Thesis Statement
        Plagiarism
        Iambic Pentameter
        Irony
        Symbolism
        Allegory
        Soliloquy
        Sonnet
        The Odyssey
        The Catcher in the Rye
        Lord of the Flies
        1984
        Fahrenheit 451
        The Crucible
        The Scarlet Letter
        Code of Hammurabi
        Alexander the Great
        Fall of Rome
        Ottoman Empire
        Mongol Empire
        Feudalism
        Enlightenment
        French Revolution
        Louisiana Purchase
        Women's Suffrage
        Roaring Twenties
        Prohibition
        D-Day
        Cold War
        Cuban Missile Crisis
        Checks and Balances
        Filibuster
        Veto
        First Amendment
        Supply and Demand
        Inflation
        Compound Interest
        Socrates
        Plato
        Charles Darwin
        Ada Lovelace
        Alan Turing
        Queen Elizabeth I
        Winston Churchill
        Mahatma Gandhi
        Frida Kahlo
        Vincent van Gogh
        Pablo Picasso
        Edgar Allan Poe
        Maya Angelou
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
        Christmas Lights
        Santa's Sleigh
        Santa's Elves
        Ornament
        Wrapping Paper
        Chimney
        Sleigh Bells
        Jingle Bells
        Frosty the Snowman
        Sled
        Snow Angel
        Snow Fort
        Easter Eggs
        Chocolate Bunny
        Easter Bonnet
        Witch Hat
        Black Cat
        Spiderweb
        Candy Corn
        Scarecrow
        Glow Stick
        Bobbing for Apples
        Thanksgiving
        Pilgrim Hat
        Gobble Gobble
        Apple Picking
        Leaf Pile
        Cupid
        Box of Chocolates
        Red Roses
        Shamrock
        Four-Leaf Clover
        Picnic
        Barbecue
        Pool Party
        Summer Camp
        Campfire
        Fireflies
        Water Balloons
        Ice Cream Truck
        Vacation
        Road Trip
        Fireplace
        Goody Bag
        Party Favors
        Party Games
        Pin the Tail on the Donkey
        Thank-You Card
        Surprise Party
        Confetti
        Streamers
        Noisemaker
        First Day of School
        Last Day of School
        Summer Vacation
        Sleepover
        Christmas Morning
        Christmas Cookies
        Wishbone
        Pumpkin Carving
        Costume Party
        Spring Flowers
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
        New Year's Day
        Martin Luther King Jr. Day
        Valentine's Day
        Arbor Day
        Memorial Day
        Flag Day
        Christmas Eve
        Easter Sunday
        Grandparents Day
        Teacher Appreciation Week
        Pi Day
        Star Wars Day
        Talk Like a Pirate Day
        Spring Cleaning
        Harvest Festival
        Candy Hearts
        Leprechaun Trap
        Wearing Green
        Firecracker
        Bonfire
        Red Envelope
        Dragon Dance
        Gelt
        Latkes
        Christmas Carols
        Yule Log
        Eggnog
        Stocking Stuffer
        Naughty List
        Santa's Workshop
        Tinsel
        Costume Contest
        Trunk-or-Treat
        Apple Cider
        Spooky Season
        Cornucopia
        Stuffing
        Cranberry Sauce
        Family Reunion
        State Fair
        April Showers
        Maypole
        Dyeing Eggs
        Summer Reading
        Lantern Festival
        Mooncake
        Mid-Autumn Festival
        Chinese Zodiac
        Year of the Dragon
        Diya
        Rangoli
        New Year's Countdown
        Holiday Cards
        Pumpkin Seeds
        Turkey Bowl
        First Snow
        Summer Break
        Easter Egg Roll
        Thanksgiving Feast
        Christmas Parade
        Menorah Lighting
        Kwanzaa Candles
        Haunted Hayride
        Halloween Candy
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
        Yom Kippur
        Purim
        Las Posadas
        Three Kings Day
        Bastille Day
        Oktoberfest
        Rio Carnival
        Boxing Day
        Guy Fawkes Night
        Canada Day
        King Cake
        Mardi Gras Beads
        Black History Month
        Women's History Month
        Hispanic Heritage Month
        Election Day
        Inauguration Day
        Constitution Day
        National Donut Day
        World Kindness Day
        Super Bowl Sunday
        Opening Day
        Autumnal Equinox
        Vernal Equinox
        Winter Solstice
        Heat Wave
        Polar Vortex
        Hurricane Season
        Blood Moon
        Winter Formal
        Candygrams
        Figgy Pudding
        Regifting
        Doorbuster
        Last-Minute Shopping
        Holiday Movie Marathon
        A Christmas Carol
        Rockefeller Center Tree
        Auld Lang Syne
        Festival of Lights
        Kinara
        Saint Nicholas
        Ofrenda
        Sugar Skull
        Papel Picado
        Marigolds
        Friday the 13th
        Zombie Walk
        Haunted Corn Maze
        Small Business Saturday
        Giving Tuesday
        Sweater Weather
        Tet
        Nowruz
        Songkran
        La Tomatina
        Cherry Blossom Festival
        Hot Air Balloon Festival
        Pumpkin Chunkin
        Native American Heritage Month
        Saint Patrick's Day Parade
        Fourth of July Fireworks
        Memorial Day Weekend
        Ugly Sweater Party
      `),
      4: list(`
        Saturnalia
        Lupercalia
        Samhain
        Beltane
        Yule
        Midsummer
        Walpurgis Night
        Epiphany
        Twelfth Night
        Shrove Tuesday
        Carnival of Venice
        Hogmanay
        Burns Night
        Remembrance Day
        Armistice Day
        ANZAC Day
        Golden Week
        Obon
        Tanabata
        Chuseok
        Loy Krathong
        Raksha Bandhan
        Pongal
        Navratri
        Eid al-Fitr
        Eid al-Adha
        Iftar
        Sukkot
        Seder Plate
        Shofar
        Hamantaschen
        Dragon Boat Festival
        Hanami
        Quinceañera
        Bar Mitzvah
        Sweet Sixteen
        Cesar Chavez Day
        Presidential Turkey Pardon
        Tax Day
        Earth Hour
        Fall Back
        Spring Forward
        Dog Days of Summer
        Polar Night
        Midnight Sun
        Nor'easter
        Monsoon Season
        Fall Foliage
        Leaf Peeping
        Ski Season
        Awards Season
        Met Gala
        The Oscars
        Super Bowl Halftime Show
        Coachella
        Rose Parade
        Comic-Con
        Movember
        No-Shave November
        Galentine's Day
        Singles Awareness Day
        Christmas in July
        Twelve Days of Christmas
        Feast of the Seven Fishes
        Festivus
        Punxsutawney Phil
        Krampus
        Yule Goat
        Saint Lucia Day
        La Befana
        Sinterklaas
        Father Christmas
        Poinsettia
        Advent Wreath
        Wassail
        'Twas the Night Before Christmas
        Miracle on 34th Street
        White Christmas
        Labor Day Weekend
        Three-Day Weekend
        Bank Holiday
        Federal Holiday
        Staycation
        Thanksgiving Leftovers
        Food Coma
        Turkey Trot
        Hunter's Moon
        Blue Moon
        Wolf Moon
        Strawberry Moon
        Supermoon
        Grad Party
        Housewarming
        Golden Anniversary
        Retirement Party
        Baby Shower
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
        Musical Chairs
        Hand Bells
        Rain Stick
        Egg Shaker
        Toy Piano
        Row Row Row Your Boat
        If You're Happy and You Know It
        Head Shoulders Knees and Toes
        The Hokey Pokey
        Mary Had a Little Lamb
        London Bridge
        Ring Around the Rosie
        Pop Goes the Weasel
        Five Little Monkeys
        B-I-N-G-O
        The Ants Go Marching
        Rain Rain Go Away
        You Are My Sunshine
        This Old Man
        Five Little Ducks
        Do Your Ears Hang Low
        The Muffin Man
        Rock-a-Bye Baby
        Hot Cross Buns
        Yankee Doodle
        Let It Go
        How Far I'll Go
        We Don't Talk About Bruno
        You've Got a Friend in Me
        Hakuna Matata
        Circle of Life
        Clean Up Song
        Days of the Week Song
        Sing Along
        Singer
        Drummer
        Band
        Music Notes
        Song
        Ballerina
        Tutu
        Tap Shoes
        Dance Recital
        Conga Line
        The Chicken Dance
        Bongo Drums
        Steel Drum
        Gong
        Chimes
        Cowbell
        Bugle
        Electric Guitar
        Drum Roll
        Hickory Dickory Dock
        Baa Baa Black Sheep
        The Farmer in the Dell
        Skip to My Lou
        Piano Lesson
        Old King Cole
        Baby Beluga
        Down by the Bay
        Apples and Bananas
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
        HUNTR/X
        Saja Boys
        Golden
        Soda Pop
        Miley Cyrus
        Selena Gomez
        Shakira
        Katy Perry
        Harry Styles
        Jonas Brothers
        One Direction
        Pentatonix
        Meghan Trainor
        Shake It Off
        Uptown Funk
        Can't Stop the Feeling
        Old Town Road
        Party in the U.S.A.
        Gangnam Style
        We Will Rock You
        Y.M.C.A.
        Cha-Cha Slide
        Cupid Shuffle
        Cotton Eye Joe
        Who Let the Dogs Out
        The Gummy Bear Song
        A Whole New World
        Be Our Guest
        Part of Your World
        Surface Pressure
        Do You Want to Build a Snowman
        The Star-Spangled Banner
        America the Beautiful
        This Land Is Your Land
        Take Me Out to the Ball Game
        Battle of the Bands
        Backstage
        Fan Club
        Tour Bus
        World Tour
        Lyrics
        Chorus
        Melody
        Rhythm
        Treble Clef
        Quarter Note
        Do Re Mi
        High Note
        Solo
        Trio
        Metronome
        Music Stand
        Guitar Pick
        Amplifier
        Bass Guitar
        Snare Drum
        Glockenspiel
        Piccolo
        Fiddle
        Piano Recital
        Rock Concert
        Band Practice
        Bass Drum
        Whole Note
        Jingle Bell Rock
        All I Want for Christmas Is You
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
        Shawn Mendes
        Charlie Puth
        Benson Boone
        Luke Combs
        Carrie Underwood
        Twenty One Pilots
        OneRepublic
        Fall Out Boy
        AJR
        Linkin Park
        Pharrell Williams
        Alicia Keys
        Rihanna
        Sia
        Lorde
        Mariah Carey
        NSYNC
        BLACKPINK
        The Rolling Stones
        The Beach Boys
        The Jackson 5
        Tchaikovsky
        Billboard Hot 100
        Platinum Record
        Record Label
        Recording Studio
        Lead Singer
        Backup Singers
        Soundtrack
        Theme Song
        Jingle
        Earworm
        One-Hit Wonder
        Mashup
        Bass Drop
        Turntable
        Spotify Wrapped
        Punk Rock
        Disco
        R&B
        Bluegrass
        EDM
        Dubstep
        Lo-Fi
        Classical Music
        Folk Music
        Bassoon
        Didgeridoo
        Sitar
        Keytar
        Drum Machine
        Sweet Caroline
        Don't Stop Believin'
        Hey Jude
        Here Comes the Sun
        Respect
        Dancing Queen
        September
        I Will Survive
        Drivers License
        Blinding Lights
        Believer
        Rolling in the Deep
        Anti-Hero
        Levitating
        APT.
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
        Chappell Roan
        SZA
        Hozier
        Noah Kahan
        Arctic Monkeys
        Radiohead
        Red Hot Chili Peppers
        Foo Fighters
        Led Zeppelin
        Pink Floyd
        The Who
        Fleetwood Mac
        Billy Joel
        David Bowie
        Freddie Mercury
        Jimi Hendrix
        Simon & Garfunkel
        Diana Ross
        Marvin Gaye
        James Brown
        Duke Ellington
        Miles Davis
        Nina Simone
        Run-DMC
        Lauryn Hill
        OutKast
        Daft Punk
        Shania Twain
        Willie Nelson
        Karol G
        Rosalía
        Selena Quintanilla
        Debussy
        Puccini
        George Gershwin
        Hans Zimmer
        Leonard Bernstein
        Arpeggio
        Staccato
        Allegro
        Key Signature
        Time Signature
        Minor Key
        Chord Progression
        Sonata
        Concerto
        Overture
        Dissonance
        Improvisation
        Syncopation
        Vibrato
        Power Chord
        Loop Pedal
        Theremin
        Harpsichord
        Dear Evan Hansen
        Hadestown
        Lollapalooza
        Glastonbury
        Live Aid
        Rock and Roll Hall of Fame
        Tiny Desk Concert
        Eras Tour
        Supergroup
        Setlist
        Opening Act
        Sold-Out Show
        Diss Track
        Surprise Album
        B-Side
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
  Rooster = 🐓
  Pony = 🐎
  Donkey = 🫏
  Lamb = 🐑
  Duckling = 🐥
  Chick = 🐤
  Hen = 🐔
  Turkey = 🦃
  Goose = 🪿
  Swan = 🦢
  Parrot = 🦜
  Bird = 🐦
  Worm = 🪱
  Ant = 🐜
  Fly = 🪰
  Mosquito = 🦟
  Beetle = 🪲
  Cricket = 🦗
  Caterpillar = 🐛
  Kangaroo = 🦘
  Koala = 🐨
  Panda = 🐼
  Hippo = 🦛
  Rhino = 🦏
  Gorilla = 🦍
  Camel = 🐫
  Dolphin = 🐬
  Seal = 🦭
  Jellyfish = 🪼
  Lobster = 🦞
  Shrimp = 🦐
  Squid = 🦑
  Clownfish = 🐠
  Polar Bear = 🐻‍❄️
  Wolf = 🐺
  Fox = 🦊
  Deer = 🦌
  Raccoon = 🦝
  Skunk = 🦨
  Squirrel = 🐿️
  Hedgehog = 🦔
  Beaver = 🦫
  Bat = 🦇
  Eagle = 🦅
  Flamingo = 🦩
  Peacock = 🦚
  Hamster = 🐹
  Goldfish = 🐟
  Lizard = 🦎
  Crocodile = 🐊
  Leopard = 🐆
  Sloth = 🦥
  Otter = 🦦
  Llama = 🦙
  Moose = 🫎
  Bull = 🐂
  Tortoise = 🐢
  Calf = 🐄
  Piglet = 🐖
  Bumblebee = 🐝
  Pear = 🍐
  Peach = 🍑
  Cherry = 🍒
  Lemon = 🍋
  Kiwi = 🥝
  Tomato = 🍅
  Potato = 🥔
  Peas = 🫛
  Lettuce = 🥬
  Mushroom = 🍄
  Onion = 🧅
  Pepper = 🫑
  Pie = 🥧
  Rice = 🍚
  Noodles = 🍜
  Soup = 🍲
  Salad = 🥗
  Fried Chicken = 🍗
  Drumstick = 🍗
  Butter = 🧈
  Honey = 🍯
  Toast = 🍞
  Jelly Beans = 🫘
  Pudding = 🍮
  Chocolate Milk = 🥛
  Apple Juice = 🧃
  Oatmeal = 🥣
  Ice Cream Cone = 🍦
  Banana Split = 🍨
  Birthday Cake = 🎂
  Melon = 🍈
  Scrambled Eggs = 🍳
  Ham = 🍖
  Steak = 🥩
  Cheeseburger = 🍔
  Snow Cone = 🍧
  Peanuts = 🥜
  Apple Slices = 🍎
  Carrot Sticks = 🥕
  Chocolate Chip Cookie = 🍪
  Strawberry Milk = 🍓
  Baseball Glove = 🧤
  Hockey Stick = 🏒
  Golf Ball = ⛳
  Tennis Racket = 🎾
  Ice Skates = ⛸️
  Roller Skates = 🛼
  Scooter = 🛴
  Red Light Green Light = 🚦
  Egg and Spoon Race = 🥄
  Leapfrog = 🐸
  Hot Potato = 🥔
  Frisbee = 🥏
  Kite = 🪁
  Ballet = 🩰
  Swim Goggles = 🥽
  Horseback Riding = 🏇
  Fishing = 🎣
  Hiking = 🥾
  Finish Line = 🏁
  First Place = 🥇
  Gold Medal = 🏅
  Jersey = 🎽
  Stopwatch = ⏱️
  Taekwondo = 🥋
  Yoga = 🧘
  Go-Kart = 🏎️
  Monster Truck = 🛻
  Dirt Bike = 🏍️
  BMX Bike = 🚲
  Boogie Board = 🏄
  Badminton = 🏸
  Soccer Ball = ⚽
  Basketball Hoop = 🏀
  Slide = 🛝
  Bowling Pins = 🎳
  Hop like a frog = 🐸
  Slither like a snake = 🐍
  Buzz like a bee = 🐝
  Moo like a cow = 🐄
  Quack like a duck = 🦆
  Oink like a pig = 🐷
  Meow like a kitten = 🐱
  Stomp like a dinosaur = 🦖
  Swing like a monkey = 🐒
  Walk like a crab = 🦀
  Gallop like a horse = 🐎
  Sneak like a mouse = 🐭
  Stretch like a cat = 🐈
  Crawl like a baby = 👶
  Go down a slide = 🛝
  Lick a lollipop = 🍭
  Give a high five = 🙌
  Put on your shoes = 👟
  Zip up your coat = 🧥
  Snore = 😴
  Giggle = 🤭
  Whisper = 🤫
  Wink = 😉
  Make a funny face = 🤪
  Stick out your tongue = 😛
  Shiver = 🥶
  Be a statue = 🗿
  Blast off like a rocket = 🚀
  Drive a car = 🚗
  Fly an airplane = ✈️
  Dig in the sand = 🏖️
  Plant a flower = 🌱
  Water the plants = 🪴
  Pick an apple = 🍎
  Catch a butterfly = 🦋
  Pet a dog = 🐕
  Feed the ducks = 🦆
  Jump in puddles = 💦
  Make a snow angel = ❄️
  Throw a snowball = ☃️
  Rake leaves = 🍂
  Bounce a ball = 🏀
  Blow up a balloon = 🎈
  Color with crayons = 🖍️
  Cut with scissors = ✂️
  Slurp noodles = 🍜
  Peel a banana = 🍌
  Stir a pot = 🍲
  Sweep the floor = 🧹
  Make your bed = 🛏️
  Rock a baby = 👶
  Knock on a door = 🚪
  Talk on the phone = 📞
  Take a picture = 📷
  Do a happy dance = 💃
  Melt like a snowman = ⛄
  March in a parade = 🥁
  Smell a flower = 🌷
  Eat popcorn = 🍿
  Sink = 🚰
  Faucet = 🚰
  Soap = 🧼
  Shampoo = 🧴
  Rubber Duck = 🦆
  Toilet Paper = 🧻
  Toothpaste = 🪥
  Bowl = 🥣
  Straw = 🥤
  Baby Bottle = 🍼
  Teapot = 🫖
  Basket = 🧺
  Bookshelf = 📚
  Picture Frame = 🖼️
  Candle = 🕯️
  Camera = 📷
  Glasses = 👓
  Watch = ⌚
  Coat = 🧥
  Boots = 🥾
  Scarf = 🧣
  Raincoat = 🧥
  Dress = 👗
  Shirt = 👕
  Pants = 👖
  Necklace = 📿
  Blocks = 🧱
  Puzzle = 🧩
  Yo-Yo = 🪀
  Train Set = 🚂
  Dollhouse = 🏠
  Bubble Wand = 🫧
  Envelope = ✉️
  Band-Aid = 🩹
  Fire Truck = 🚒
  Garbage Truck = 🚛
  Dump Truck = 🚚
  Excavator = 🏗️
  Bulldozer = 🚜
  Helicopter = 🚁
  Airplane = ✈️
  Tractor = 🚜
  Ambulance = 🚑
  Police Car = 🚓
  Hot Air Balloon = 🎈
  Sailboat = ⛵
  Sunset = 🌇
  Sunrise = 🌅
  Shooting Star = 🌠
  Full Moon = 🌕
  Outer Space = 🌌
  Raindrop = 💧
  Fog = 🌫️
  Seashell = 🐚
  Leaf = 🍃
  Acorn = 🌰
  Grass = 🌿
  Nest = 🪺
  Feather = 🪶
  Teeth = 🦷
  Muscles = 💪
  Heartbeat = 💓
  Eyes = 👀
  Ears = 👂
  Nose = 👃
  Steam = ♨️
  Primary Colors = 🎨
  Gears = ⚙️
  Sprout = 🌱
  Water = 💧
  Space Suit = 🧑‍🚀
  Stethoscope = 🩺
  X-Ray = 🩻
  Loose Tooth = 🦷
  Snowstorm = 🌨️
  Storm = ⛈️
  Sunshine = ☀️
  Night Sky = 🌃
  Plant = 🪴
  Light = 💡
  Sound = 🔊
  Hot and Cold = 🌡️
  Dinosaur Bones = 🦴
  House = 🏠
  Apartment = 🏢
  Garden = 🌻
  Pond = 🦆
  Lake = 🏞️
  River = 🛶
  Hill = ⛰️
  Splash Pad = 💦
  Petting Zoo = 🐐
  Apple Orchard = 🍎
  Chicken Coop = 🐔
  Stable = 🐴
  Bank = 🏦
  Car Wash = 🧽
  Gas Station = ⛽
  Bus Stop = 🚏
  Parking Lot = 🅿️
  Barbershop = 💈
  Hair Salon = 💇
  Gym = 🏋️
  Pizza Parlor = 🍕
  Donut Shop = 🍩
  Candy Store = 🍬
  Bookstore = 📖
  Shoe Store = 👟
  Flower Shop = 💐
  Farmers Market = 🥕
  Ice Rink = ⛸️
  Roller Rink = 🛼
  Carousel = 🎠
  Ferris Wheel = 🎡
  Roller Coaster = 🎢
  Bumper Cars = 🚙
  County Fair = 🎪
  Carnival = 🎟️
  Cabin = 🛖
  Farmhouse = 🏡
  Living Room = 🛋️
  Bathroom = 🛁
  Front Yard = 🌳
  Neighborhood = 🏘️
  City = 🏙️
  Bridge = 🌉
  Construction Site = 🚧
  Stadium = 🏟️
  Soccer Field = ⚽
  Basketball Court = 🏀
  Vet's Office = 🐶
  Animal Shelter = 🐾
  Daycare = 🧸
  Swamp = 🐊
  Grandma's House = 👵
  Subway = 🚇
  Harbor = ⚓
  Snack Bar = 🌭
  Pillow Fort = 🛏️
  Playroom = 🪀
  Lemonade Stand = 🍋
  Space Station = 🛰️
  Science Center = 🔬
  Butterfly Garden = 🦋
  Pumpkin Patch = 🎃
  Once Upon a Time = 📖
  Happily Ever After = 💖
  Magic Spell = ✨
  Magic Potion = 🧪
  Broomstick = 🧹
  Pumpkin Carriage = 🎃
  Glass Slipper = 👠
  Frog Prince = 🐸
  Prince = 🤴
  Queen = 👸
  King = 🤴
  Jester = 🃏
  Baby Dragon = 🐲
  Magic Beans = 🫘
  Beanstalk = 🌱
  Golden Egg = 🥚
  Toy Soldier = 💂
  Enchanted Forest = 🌲
  Fairy Wings = 🧚
  Mermaid Tail = 🧜
  Treasure Map = 🗺️
  Flying Saucer = 🛸
  Martian = 👽
  Monster Under the Bed = 👾
  Super Speed = ⚡
  Super Strength = 💪
  Villain = 🦹
  Mask = 🎭
  Shield = 🛡️
  Magic Sword = 🗡️
  Drawbridge = 🏰
  Throne = 👑
  Royal Ball = 💃
  Tiara = 👑
  Jack Frost = ❄️
  Mother Goose = 🪿
  Humpty Dumpty = 🥚
  Princess and the Pea = 🫛
  Ugly Duckling = 🦢
  Tortoise and the Hare = 🐢
  Three Billy Goats Gruff = 🐐
  Magic Lamp = 🪔
  Wishing Star = 🌟
  Snow Queen = ❄️
  Ice Palace = 🧊
  Under the Sea = 🐠
  Buried Treasure = 💰
  X Marks the Spot = ❌
  Message in a Bottle = 🍾
  Wizard Hat = 🧙
  Mushroom House = 🍄
  Unicorn Horn = 🦄
  Fire-Breathing Dragon = 🔥
  Knight in Shining Armor = 🛡️
  Cow Jumped Over the Moon = 🐄
  Rainbow Bridge = 🌈
  Candy Kingdom = 🍭
  Teddy Bear Picnic = 🧸
  Kindergarten = 🏫
  Markers = 🖊️
  Colored Pencils = ✏️
  Folder = 📁
  Notebook = 📓
  Picture Book = 📖
  Librarian = 📚
  Bus Driver = 🚌
  Custodian = 🧹
  School Nurse = 🩹
  Crossing Guard = 🛑
  Snack Time = 🍎
  Circle Time = ⭕
  Clean-Up Time = 🧺
  Numbers = 🔢
  Shapes = 🔷
  Colors = 🌈
  ABCs = 🔤
  Letters = 🅰️
  Reading = 📖
  Writing = ✍️
  Math = ➕
  Addition = ➕
  Sight Words = 👀
  Gold Star = ⭐
  Sticker Chart = 🌟
  Water Fountain = 🚰
  Hand Sanitizer = 🧴
  Paper Airplane = ✈️
  Finger Painting = 🖐️
  100th Day of School = 💯
  Pajama Day = 🛌
  Crazy Hair Day = 💇
  Teacher's Pet = 🐹
  Apple for the Teacher = 🍎
  Lunch Tray = 🍱
  Milk Carton = 🥛
  Inside Voice = 🤫
  Reading Buddy = 👫
  Caveman = 🪨
  Cowboy = 🤠
  Covered Wagon = 🐂
  President = 🇺🇸
  American Flag = 🇺🇸
  Counting = 🔢
  Spelling Test = 📝
  Morning Meeting = 🌅
  Bathroom Pass = 🚻
  Lunch Money = 🪙
  Pledge of Allegiance = 🇺🇸
  Map = 🗺️
  Glue = 🧴
  Library Book = 📗
  Book Bag = 🎒
  Tracing Letters = ✏️
  Class Helper = 🙋
  Library Day = 📚
  Art Smock = 🎨
  School Garden = 🌻
  Morning Bell = 🔔
  Weather Helper = ☀️
  Christmas Lights = 💡
  Santa's Sleigh = 🛷
  Santa's Elves = 🧝
  Wrapping Paper = 🎁
  Sleigh Bells = 🔔
  Jingle Bells = 🔔
  Frosty the Snowman = ⛄
  Sled = 🛷
  Snow Angel = 😇
  Snow Fort = 🏰
  Easter Eggs = 🥚
  Chocolate Bunny = 🐰
  Easter Bonnet = 👒
  Witch Hat = 🧙‍♀️
  Black Cat = 🐈‍⬛
  Spiderweb = 🕸️
  Candy Corn = 🍬
  Bobbing for Apples = 🍎
  Thanksgiving = 🦃
  Pilgrim Hat = 🎩
  Gobble Gobble = 🦃
  Apple Picking = 🍏
  Leaf Pile = 🍁
  Cupid = 💘
  Box of Chocolates = 🍫
  Red Roses = 🌹
  Shamrock = ☘️
  Four-Leaf Clover = 🍀
  Picnic = 🧺
  Barbecue = 🍖
  Pool Party = 🏊
  Summer Camp = 🏕️
  Campfire = 🔥
  Water Balloons = 💦
  Ice Cream Truck = 🍦
  Vacation = 🏝️
  Road Trip = 🚙
  Fireplace = 🔥
  Goody Bag = 🛍️
  Party Favors = 🎊
  Party Games = 🎲
  Pin the Tail on the Donkey = 🫏
  Thank-You Card = 💌
  Surprise Party = 🥳
  Confetti = 🎊
  Streamers = 🎉
  Noisemaker = 📯
  First Day of School = 🎒
  Last Day of School = 🏫
  Summer Vacation = 😎
  Sleepover = 🛏️
  Christmas Morning = 🎄
  Christmas Cookies = 🍪
  Pumpkin Carving = 🎃
  Costume Party = 🦸
  Spring Flowers = 🌼
  Musical Chairs = 🪑
  Hand Bells = 🔔
  Egg Shaker = 🥚
  Toy Piano = 🎹
  Row Row Row Your Boat = 🚣
  If You're Happy and You Know It = 👏
  Head Shoulders Knees and Toes = 🦶
  The Hokey Pokey = 💃
  Mary Had a Little Lamb = 🐑
  London Bridge = 🌉
  Ring Around the Rosie = 🌹
  Pop Goes the Weasel = 🎁
  Five Little Monkeys = 🐒
  B-I-N-G-O = 🐕
  The Ants Go Marching = 🐜
  Rain Rain Go Away = ☔
  You Are My Sunshine = ☀️
  This Old Man = 👴
  Five Little Ducks = 🦆
  Do Your Ears Hang Low = 👂
  The Muffin Man = 🧁
  Rock-a-Bye Baby = 👶
  Hot Cross Buns = 🥯
  Yankee Doodle = 🪶
  Let It Go = ❄️
  How Far I'll Go = 🌊
  We Don't Talk About Bruno = 🤫
  You've Got a Friend in Me = 🤠
  Hakuna Matata = 🐗
  Circle of Life = 🦁
  Clean Up Song = 🧹
  Days of the Week Song = 📅
  Sing Along = 🎤
  Singer = 🧑‍🎤
  Drummer = 🥁
  Band = 🎸
  Music Notes = 🎶
  Song = 🎵
  Ballerina = 🩰
  Tutu = 🩰
  Tap Shoes = 👞
  Dance Recital = 💃
  Conga Line = 💃
  The Chicken Dance = 🐔
  Bongo Drums = 🪘
  Steel Drum = 🥁
  Chimes = 🎐
  Cowbell = 🔔
  Bugle = 📯
  Electric Guitar = 🎸
  Drum Roll = 🥁
  Hickory Dickory Dock = 🕰️
  Baa Baa Black Sheep = 🐑
  The Farmer in the Dell = 🧑‍🌾
  Piano Lesson = 🎹
  Old King Cole = 👑
  Baby Beluga = 🐋
  Down by the Bay = 🏖️
  Apples and Bananas = 🍌
`.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split(' = ')));
