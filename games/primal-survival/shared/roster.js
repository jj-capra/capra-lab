import { ERA_NAME, BIOME_NAME } from './constants.js';

/* ---------- roster ----------
   name | era | biomes | roles | climate | kg | km/h | pow,arm,sta,gui,spd | note
   pow  striking / killing force        arm  armour, hide, bulk defence
   sta  endurance, range, tolerance     gui  intelligence, venom, social tactics
   spd  burst speed                     mass derived from real kg, log scale
*/
const RAW = `
African lion|now|savanna,desert|apex|hot|190|80|78,45,60,70,72|prides hunt cooperatively
Bengal tiger|now|rainforest,wetland|apex|hot|220|65|84,47,58,68,64|largest living cat
Saltwater crocodile|now|wetland,ocean|apex,bulwark|hot|1000|29|96,88,70,45,28|strongest bite ever measured
African elephant|now|savanna,rainforest|bulwark|hot|6000|40|80,82,78,82,38|remembers water sources for decades
White rhinoceros|now|savanna|bulwark|hot|2300|50|70,90,62,38,50|skin two inches thick
Hippopotamus|now|wetland,savanna|bulwark,apex|hot|1500|30|88,84,58,40,32|kills more people than lions
Cape buffalo|now|savanna,wetland|bulwark|hot|700|56|62,74,66,52,55|herds counter-charge predators
Cheetah|now|savanna,desert|sprinter|hot|55|114|40,18,30,55,100|fastest land animal
Pronghorn|now|desert,savanna|sprinter,ranger|hot|55|88|20,14,96,45,88|holds forty-five mph for miles on end
Peregrine falcon|now|mountain,desert|sprinter|temperate|1|300|34,8,55,66,99|fastest animal in a stoop
Gray wolf|now|arctic,mountain|ranger,swarm|cold|45|60|52,26,88,86,60|packs cover forty miles in a night
African wild dog|now|savanna|ranger,swarm|hot|25|72|44,18,92,84,72|highest hunt success rate of any predator
Wolverine|now|arctic,mountain|apex,bulwark|cold|18|50|58,40,82,70,48|drives bears off kills
Polar bear|now|arctic,ocean|apex,bulwark|cold|500|40|86,66,76,64,40|swims for days between floes
Grizzly bear|now|mountain,rainforest|apex,bulwark|temperate|350|56|82,64,70,66,54|outruns a horse uphill
Orca|now|ocean,arctic|apex,ranger|water|5500|56|90,60,90,98,62|hunting techniques passed down by family
Great white shark|now|ocean|apex|water|1100|40|88,58,74,56,52|senses blood at one part per million
Blue whale|now|ocean|bulwark,ranger|water|150000|37|60,78,98,62,36|largest animal that has ever lived
Sperm whale|now|ocean|bulwark,apex|water|40000|35|84,80,92,78,34|dives a mile down to fight squid in the dark
Giant Pacific octopus|now|ocean|swarm|water|50|40|38,12,44,96,40|opens jars, escapes tanks
Box jellyfish|now|ocean,wetland|swarm|water|2|7|72,6,40,58,10|venom can stop a heart in minutes
Army ant colony|now|rainforest|swarm|hot|20|1|30,10,90,88,8|a colony strips everything in its path
Honey badger|now|savanna,desert|swarm,ranger|hot|12|30|46,58,74,80,32|loose skin lets it turn inside its own hide
Nile crocodile|now|wetland,savanna|apex,bulwark|hot|500|22|88,80,66,44,24|ambushes at the river crossing
Komodo dragon|now|desert,rainforest|apex|hot|80|20|66,52,60,60,22|follows bitten prey for days
King cobra|now|rainforest,wetland|swarm|hot|6|18|74,10,40,72,20|one bite carries enough venom for an elephant
Golden eagle|now|mountain,desert|sprinter,apex|temperate|6|240|52,12,70,74,94|drags goats off cliffs
Snow leopard|now|mountain|sprinter,apex|cold|50|60|58,26,62,76,66|leaps six times its body length
Yak|now|mountain|bulwark,ranger|cold|900|40|52,70,84,40,40|works the air at twenty thousand feet
Bighorn sheep|now|mountain|bulwark,sprinter|cold|130|48|46,62,76,48,52|skull built to survive head-on collisions
Dromedary camel|now|desert|ranger|hot|600|65|34,44,98,50,62|loses a third of its body water and lives
Arctic tern|now|arctic,ocean|ranger|cold|1|40|8,4,100,60,46|pole to pole every single year
Caribou|now|arctic|ranger,sprinter|cold|180|80|32,30,94,44,78|longest land migration on earth
Musk ox|now|arctic|bulwark,swarm|cold|350|60|56,78,80,50,58|forms a horned ring around the calves
Walrus|now|arctic,ocean|bulwark|cold|1200|35|58,76,62,48,30|tusks haul a tonne onto the ice
Chimpanzee|now|rainforest|swarm|hot|50|40|50,22,58,94,42|makes and carries weapons
Green anaconda|now|wetland,rainforest|apex,bulwark|hot|100|20|78,40,56,58,18|kills by shutting off blood, not air
Jaguar|now|rainforest,wetland|apex|hot|100|80|80,32,56,72,72|bites through the skull, not the throat
Harpy eagle|now|rainforest|sprinter,apex|hot|9|80|56,14,60,72,70|talons the size of a bear's claws
Spotted hyena|now|savanna|swarm,ranger|hot|60|60|64,34,86,82,60|clans of eighty, ruled by females
Giraffe|now|savanna|bulwark,ranger|hot|1200|60|58,54,70,44,60|a kick decapitates a lion
Ostrich|now|savanna,desert|sprinter,ranger|hot|130|70|42,20,84,40,82|fastest thing on two legs
Sailfish|now|ocean|sprinter|water|90|110|40,14,70,44,98|fastest fish in the sea
Leatherback turtle|now|ocean|bulwark,ranger|water|700|35|28,86,96,40,38|crosses whole oceans to one beach
Emperor penguin|now|arctic,ocean|ranger|cold|35|30|16,20,90,58,30|stands through a polar winter without eating
Bull shark|now|wetland,ocean|apex|water|130|40|76,44,70,52,52|swims a thousand miles up rivers
Moose|now|wetland,arctic|bulwark|cold|700|56|66,66,74,46,56|wades and dives for river weed
Cassowary|now|rainforest|sprinter,apex|hot|60|50|60,34,56,44,56|a dagger claw on each inner toe
Mountain gorilla|now|rainforest,mountain|bulwark,apex|temperate|200|40|76,50,60,88,40|ten times a person's upper-body strength
American bison|now|savanna,mountain|bulwark|temperate|900|55|64,74,78,44,55|turns and charges rather than run
Desert locust swarm|now|desert,savanna|swarm|hot|25|20|26,8,92,70,30|a swarm can cover four hundred square miles
Piranha shoal|now|wetland,rainforest|swarm|hot|20|25|60,12,50,62,34|shoals form for defence, not attack
Meerkat clan|now|desert|swarm|hot|5|30|14,8,60,90,32|posts sentries and teaches the young
Sidewinder rattlesnake|now|desert|swarm|hot|3|29|62,12,44,66,30|hunts by heat in total darkness
Gemsbok|now|desert|bulwark,sprinter|hot|240|60|52,52,88,46,62|survives without drinking water
Andean condor|now|mountain|ranger|cold|14|90|26,10,92,64,72|soars a hundred miles without a wingbeat
Alpine ibex|now|mountain|sprinter,ranger|cold|100|50|34,44,80,56,58|climbs near-vertical dam walls
Colossal squid|now|ocean|apex,bulwark|water|500|30|70,30,60,70,32|hooks on the tentacles, eye the size of a plate
Roadrunner|now|desert|sprinter|hot|1|42|14,6,66,70,58|kills rattlesnakes by beating them
Wildebeest herd|now|savanna|ranger,swarm|hot|250|80|40,36,90,48,78|a million cross the river at once
Woolly mammoth|ice|arctic,savanna|bulwark|cold|8000|40|84,86,82,76,40|tusks thirteen feet long
Smilodon|ice|savanna,mountain|apex|temperate|300|50|88,52,50,66,52|eight-inch killing teeth
Short-faced bear|ice|mountain,arctic|apex,bulwark|cold|900|64|90,70,72,62,62|stood over ten feet tall
Dire wolf|ice|savanna,mountain|swarm,ranger|temperate|68|60|62,30,86,82,60|heavier jaw than any wolf alive
Woolly rhinoceros|ice|arctic,savanna|bulwark|cold|2000|48|74,92,70,40,48|horn used to sweep snow off grass
Megatherium|ice|rainforest,savanna|bulwark|hot|4000|20|72,84,60,44,20|a ground sloth the size of an elephant
Glyptodon|ice|savanna,wetland|bulwark|hot|2000|25|44,98,62,32,24|shell like a car roof
Cave lion|ice|arctic,mountain|apex|cold|320|70|84,50,60,68,66|painted on cave walls more than any other beast
Megalodon|ice|ocean|apex,bulwark|water|60000|50|99,72,80,54,56|teeth the size of a hand
Steller's sea cow|ice|ocean,arctic|bulwark|cold|9000|15|30,76,70,34,16|hunted to nothing within 27 years
Livyatan|ice|ocean|apex|water|57000|35|97,74,84,80,38|a sperm whale with teeth in both jaws
Irish elk|ice|wetland,savanna|bulwark,sprinter|temperate|600|60|60,62,76,44,62|antlers spanned twelve feet
American mastodon|ice|rainforest,wetland|bulwark|temperate|8000|35|78,80,76,66,36|browsed forests, not grassland
Giant short-faced kangaroo|ice|desert|sprinter|hot|230|50|38,28,70,44,64|too heavy to hop, it walked
Marsupial lion|ice|rainforest,desert|apex|hot|130|55|82,40,56,62,58|pound for pound the strongest bite known
Haast's eagle|ice|mountain,rainforest|sprinter,apex|temperate|15|80|66,14,64,70,88|hunted birds three times its weight
Cave hyena|ice|savanna,mountain|swarm,ranger|temperate|100|64|68,36,84,80,64|dragged whole carcasses into dens
Steppe bison|ice|savanna,arctic|bulwark|cold|1200|55|68,76,78,44,55|herds ran from Spain to Alaska
Elasmotherium|ice|savanna,desert|bulwark,sprinter|temperate|3500|45|80,88,72,38,54|a rhino that may have galloped
Doedicurus|ice|savanna,wetland|bulwark|hot|1500|25|60,96,62,34,24|spiked tail club, swung like a mace
Giant beaver|ice|wetland|bulwark,ranger|cold|100|20|40,52,74,52,22|as long as a person, with cutting teeth
Cave bear|ice|mountain,arctic|bulwark,apex|cold|600|40|76,68,70,58,42|slept whole winters underground
Aurochs|ice|savanna,wetland|bulwark|temperate|1000|60|66,72,74,42,60|the wild ox every cow descends from
Saiga antelope|ice|desert,savanna|sprinter,ranger|cold|40|80|20,14,88,46,80|a nose built to filter dust and warm air
Great auk|ice|ocean,arctic|ranger|cold|5|25|12,10,84,52,28|flightless, and unbeatable underwater
Bowhead whale|ice|arctic,ocean|bulwark,ranger|cold|80000|20|56,84,96,58,22|breaks sea ice with its skull
Titanotylopus|ice|desert,savanna|ranger,bulwark|hot|2500|50|44,56,92,42,52|a camel taller than any horse
Toxodon|ice|rainforest,wetland|bulwark|hot|1400|40|60,76,70,38,42|built like a rhino, related to neither
Tyrannosaurus rex|cret|savanna,wetland|apex|hot|8000|30|100,70,66,70,40|bit through bone, not just flesh
Triceratops|cret|savanna,rainforest|bulwark|hot|9000|30|76,96,66,42,32|a seven-foot skull with three horns
Ankylosaurus|cret|savanna,wetland|bulwark|hot|6000|10|66,100,60,36,14|armoured eyelids, and a club that broke legs
Velociraptor|cret|desert|swarm,sprinter|hot|15|40|40,14,66,84,56|turkey-sized, feathered, and quick
Deinonychus|cret|rainforest,wetland|swarm,sprinter|hot|70|50|56,20,70,82,62|the raptor the films were actually based on
Spinosaurus|cret|wetland,ocean|apex,ranger|hot|7000|25|88,66,78,60,30|the only dinosaur built to swim
Mosasaurus|cret|ocean|apex|water|14000|48|94,70,76,56,54|a sea lizard that ate sharks
Quetzalcoatlus|cret|desert,savanna|ranger,sprinter|hot|250|110|54,20,94,62,90|wingspan of a fighter jet
Argentinosaurus|cret|rainforest,savanna|bulwark|hot|70000|20|70,88,80,34,22|heaviest animal ever to walk
Therizinosaurus|cret|rainforest,desert|bulwark,apex|hot|5000|25|78,62,62,48,26|three-foot claws, and it ate plants
Pachycephalosaurus|cret|mountain,savanna|bulwark,sprinter|temperate|450|45|58,80,62,40,50|ten inches of solid skull
Gallimimus|cret|desert,savanna|sprinter,ranger|hot|440|60|24,18,88,44,84|built exactly like an ostrich
Carnotaurus|cret|savanna,desert|sprinter,apex|hot|1500|55|76,50,60,52,76|the fastest large predator known
Giganotosaurus|cret|savanna,rainforest|apex|hot|8000|34|96,66,64,58,44|longer than T. rex, lighter on its feet
Pteranodon|cret|ocean,arctic|ranger|temperate|25|80|30,10,88,54,74|fished the open sea far from land
Nanuqsaurus|cret|arctic|apex|cold|900|40|80,56,74,66,48|a polar tyrannosaur that hunted in the dark
Pachyrhinosaurus|cret|arctic,mountain|bulwark|cold|4000|30|66,90,70,40,32|migrated in herds above the arctic circle
Troodon|cret|arctic,rainforest|swarm|cold|50|50|36,14,72,90,58|largest brain for its size in the Cretaceous
Xiphactinus|cret|ocean|apex,sprinter|water|500|45|72,30,60,44,66|swallowed prey whole, sometimes fatally
Archelon|cret|ocean|bulwark,ranger|water|2200|15|34,94,90,40,18|a turtle thirteen feet across
Elasmosaurus|cret|ocean|ranger,apex|water|2000|30|62,40,88,58,36|seventy-two neck bones
Edmontosaurus|cret|arctic,wetland|bulwark,ranger|cold|4000|45|54,70,84,44,48|herds of thousands, teeth in the hundreds
Utahraptor|cret|desert,mountain|apex,sprinter|hot|500|45|74,34,66,78,60|the raptor that was actually dangerous
Majungasaurus|cret|wetland,rainforest|apex|hot|1100|35|74,54,60,50,44|the one predator known to eat its own kind
Saurolophus|cret|mountain,wetland|bulwark,ranger|temperate|2000|40|52,72,82,42,44|a bony crest that may have been a horn
Nodosaurus|cret|mountain,savanna|bulwark|temperate|1500|20|50,94,62,34,20|armour so complete it fossilised whole
Reticulated python|now|rainforest,wetland|apex,bulwark|hot|100|10|76,38,54,54,12|longest snake in the world
Tiger shark|now|ocean|apex,ranger|water|600|40|82,50,78,50,50|eats anything, including licence plates
Great hammerhead|now|ocean|apex,ranger|water|450|40|72,44,80,64,48|sweeps the sand for buried rays
Giant manta ray|now|ocean|ranger,bulwark|water|1600|35|30,56,90,66,44|brain of a predator, diet of plankton
Narwhal|now|arctic,ocean|ranger,apex|cold|1600|30|58,52,88,60,36|the tusk is a nine-foot tooth
Beluga|now|arctic,ocean|ranger,swarm|cold|1400|35|40,44,86,84,42|can swim backwards under the ice
Leopard seal|now|arctic,ocean|apex,sprinter|cold|500|40|78,44,74,70,56|the only seal that hunts warm blood
Humboldt squid|now|ocean|swarm|water|50|35|58,14,56,86,44|hunts in coordinated shoals of a thousand
Portuguese man o' war|now|ocean|swarm|water|1|5|60,8,70,40,8|four animals living as one
Killer bee swarm|now|savanna,rainforest|swarm|hot|10|30|44,6,74,76,40|chases you a third of a mile
Giant hornet swarm|now|rainforest,mountain|swarm|temperate|5|40|56,10,66,72,52|thirty of them clear a hive of thirty thousand
Banded mongoose|now|savanna,desert|swarm|hot|2|32|28,12,62,84,36|takes on cobras as a group
Baboon troop|now|savanna,mountain|swarm|temperate|30|45|54,24,72,88,46|canines longer than a lion's
Orangutan|now|rainforest|bulwark,swarm|hot|80|8|62,38,58,90,20|seven times a person's pulling strength
Black rhinoceros|now|savanna,desert|bulwark,sprinter|hot|1200|55|68,84,66,40,58|charges first, identifies later
Plains zebra|now|savanna|sprinter,ranger|hot|350|65|38,34,86,52,70|kicks hard enough to break a jaw
Springbok|now|savanna,desert|sprinter|hot|40|88|18,12,80,50,88|leaps straight up to show it is fast
Red kangaroo|now|desert|sprinter,ranger|hot|85|70|42,22,84,48,76|covers thirty feet in a bound
Dingo|now|desert,savanna|swarm,ranger|hot|20|60|42,18,86,80,60|the only dog to go fully wild again
Gila monster|now|desert|swarm|hot|2|3|58,26,50,50,6|venom that drops blood pressure to nothing
Deathstalker scorpion|now|desert|swarm|hot|1|5|68,18,56,48,12|the most dangerous sting in the desert
Cougar|now|mountain,desert|apex,sprinter|temperate|70|80|66,28,66,70,74|leaps sixteen feet from standing
Eurasian lynx|now|mountain,arctic|sprinter,apex|cold|25|70|52,20,64,68,68|hunts deer four times its weight
Snowy owl|now|arctic|sprinter,ranger|cold|2|80|36,8,70,68,74|hears a lemming under the snow
Osprey|now|wetland,ocean|sprinter,ranger|temperate|2|130|34,8,74,64,84|dives feet-first and comes up with the fish
Giant river otter|now|wetland,rainforest|swarm|hot|30|14|50,18,70,88,26|families kill caimans together
Electric eel|now|wetland|swarm|hot|20|8|72,14,58,64,14|discharges eight hundred volts
Black caiman|now|wetland,rainforest|apex,bulwark|hot|400|25|82,74,64,44,26|the Amazon's largest predator
Goliath tigerfish|now|wetland|apex,sprinter|hot|50|40|74,24,62,40,62|thirty-two teeth the size of a thumb
Wild boar|now|rainforest,wetland|bulwark,swarm|temperate|150|40|60,60,72,66,44|tusks it sharpens against its own teeth
Lowland tapir|now|rainforest,wetland|bulwark,ranger|hot|250|48|44,58,76,48,50|unchanged for twenty million years
Black mamba|now|savanna,desert|sprinter,swarm|hot|2|20|80,10,46,64,58|the fastest snake alive, and the deadliest
Secretarybird|now|savanna|sprinter|hot|4|60|54,10,68,66,64|stamps snakes to death
Griffon vulture|now|mountain,savanna|ranger|temperate|10|60|24,12,92,66,60|crosses the Himalaya on a thermal
Markhor|now|mountain|bulwark,sprinter|cold|110|50|48,58,78,50,56|corkscrew horns and vertical cliffs
Takin|now|mountain|bulwark|cold|350|40|56,72,76,42,44|a goat built like an ox
Homotherium|ice|savanna,arctic|apex,sprinter|cold|250|65|84,48,66,70,66|the scimitar cat that hunted by day
Pachycrocuta|ice|savanna,mountain|swarm,apex|temperate|110|55|74,42,80,76,56|the largest hyena that ever lived
Columbian mammoth|ice|desert,savanna|bulwark|temperate|10000|40|86,84,80,74,42|bigger than its woolly cousin
American lion|ice|savanna,mountain|apex|temperate|420|60|90,56,62,66,62|a quarter larger than any lion today
Macrauchenia|ice|savanna,mountain|ranger,sprinter|temperate|1000|55|40,48,88,46,62|a camel's body, a trunk, nobody's family
Diprotodon|ice|desert,wetland|bulwark|hot|2700|30|62,84,68,38,32|a wombat the size of a car
Megalania|ice|desert,rainforest|apex|hot|600|25|84,64,64,52,28|twenty-three feet of monitor lizard
Quinkana|ice|wetland,desert|apex,sprinter|hot|300|40|80,66,60,42,50|a crocodile that ran prey down on land
Palaeoloxodon|ice|rainforest,wetland|bulwark|temperate|13000|35|88,86,78,70,36|the largest land mammal ever measured
Thylacine|ice|rainforest,mountain|ranger,swarm|temperate|30|50|48,22,80,72,52|opened its jaws almost a hundred degrees
Megalochelys|ice|desert,rainforest|bulwark|hot|1000|1|30,96,72,30,4|an eight-foot tortoise
Teratorn|ice|mountain,savanna|ranger,sprinter|temperate|70|70|38,14,90,60,70|the largest flying bird known
Pelagornis|ice|ocean,arctic|ranger|water|40|60|32,12,94,56,62|bony teeth and a twenty-foot wingspan
Deinosuchus|cret|wetland,ocean|apex,bulwark|hot|8000|20|94,84,70,44,24|a crocodile that ate tyrannosaurs
Sarcosuchus|cret|wetland,rainforest|apex,bulwark|hot|8000|18|90,82,72,40,22|forty feet of river ambush
Dakotaraptor|cret|savanna,mountain|apex,sprinter|temperate|350|50|76,36,70,80,66|feathered, and a claw the length of a forearm
Tarbosaurus|cret|desert,savanna|apex|hot|5000|32|92,64,64,60,44|the Asian tyrant, narrower and faster
Struthiomimus|cret|desert,savanna|sprinter,ranger|hot|150|70|22,16,86,48,86|built for nothing but running away
Parasaurolophus|cret|wetland,rainforest|ranger,bulwark|hot|2500|40|50,70,84,54,46|a crest that worked as a horn
Styracosaurus|cret|savanna,mountain|bulwark|hot|3000|30|70,90,66,42,34|six spikes three feet long
Euoplocephalus|cret|mountain,savanna|bulwark|temperate|2500|12|62,96,60,34,16|armour over the eyelids
Microraptor|cret|rainforest|swarm,sprinter|hot|1|50|28,6,60,80,62|four wings, and it could glide
Oviraptor|cret|desert|swarm|hot|35|45|40,18,64,82,52|died brooding its own eggs
Protoceratops|cret|desert|bulwark,swarm|hot|180|25|48,74,62,50,28|found locked in combat with a velociraptor
Alamosaurus|cret|desert,savanna|bulwark|hot|40000|20|68,86,78,34,22|the last of the giant sauropods
Kronosaurus|cret|ocean|apex,bulwark|water|11000|40|90,72,74,50,48|a head eight feet long
Tylosaurus|cret|ocean|apex,ranger|water|9000|45|88,64,80,54,52|rammed prey with a reinforced snout
Hesperornis|cret|ocean,arctic|ranger,swarm|cold|30|30|34,16,88,62,34|a flightless diving bird with teeth
Ornithocheirus|cret|ocean,mountain|ranger|temperate|30|90|36,10,90,56,76|crossed oceans on a forty-foot wingspan
Iguanodon|cret|mountain,wetland|bulwark,ranger|temperate|3000|24|64,74,78,50,36|a thumb spike like a dagger
Hypsilophodon|cret|mountain,rainforest|sprinter,swarm|temperate|20|50|20,14,70,64,72|small, quick, and never alone
Anzu|cret|wetland,savanna|swarm,sprinter|hot|200|45|48,22,66,78,58|nicknamed the chicken from hell
Inland taipan|now|desert,savanna|swarm|hot|2|20|92,10,48,72,44|drop for drop the most venomous snake alive
Coastal taipan|now|savanna,wetland|swarm|hot|3|20|86,12,50,74,46|strikes three times before you register the first
Eastern brown snake|now|desert,savanna|swarm|hot|2|22|84,10,52,70,48|lives happily in the suburbs
Russell's viper|now|savanna,desert|swarm|hot|3|8|82,14,50,62,24|kills more people in Asia than any other snake
Saw-scaled viper|now|desert|swarm|hot|0.3|10|80,8,46,66,28|rubs its coils together to hiss without breathing
Gaboon viper|now|rainforest|swarm|hot|8|5|84,22,48,58,18|two-inch fangs, the longest of any snake
Fer-de-lance|now|rainforest,wetland|swarm|hot|6|12|78,14,50,60,30|the reason machete scars have a name in Costa Rica
Bushmaster|now|rainforest|apex,swarm|hot|5|10|80,16,54,56,26|twelve feet of pit viper, and it waits
Puff adder|now|savanna,desert|swarm|hot|6|6|76,20,52,54,22|refuses to move, which is why it bites so many
Boomslang|now|savanna,rainforest|swarm|hot|0.5|12|74,6,44,68,34|venom stops blood clotting anywhere in the body
Tiger snake|now|wetland,mountain|swarm|temperate|1.5|14|78,10,50,64,32|flattens its neck and stands its ground
Eastern diamondback|now|desert,savanna|swarm|hot|5|8|76,16,50,62,26|the largest rattlesnake, and it warns you first
Banded krait|now|rainforest,wetland|swarm|hot|2|10|80,8,46,60,26|docile by day, another animal entirely at night
Indian cobra|now|savanna,wetland|swarm|hot|2|11|74,10,48,70,30|the snake in every basket, and it cannot hear the flute
Mozambique spitting cobra|now|savanna,desert|swarm|hot|1.5|12|72,8,48,74,34|spits venom into the eyes from eight feet
Belcher's sea snake|now|ocean|swarm|water|1|10|88,8,56,56,30|more venomous than anything on land
Boa constrictor|now|rainforest|apex|hot|27|10|68,26,52,50,20|holds on until the blood stops moving
Burmese python|now|wetland,rainforest|bulwark,apex|hot|75|10|74,34,54,46,18|swallows deer whole and then fasts for months
African rock python|now|savanna,wetland|apex,bulwark|hot|55|10|76,30,54,48,20|Africa's largest snake, and the least forgiving
Brazilian wandering spider|now|rainforest|swarm|hot|0.006|6|82,4,42,70,38|hunts on the ground at night instead of waiting in a web
Sydney funnel-web|now|rainforest,wetland|swarm|temperate|0.004|4|84,6,40,62,26|fangs that go through a fingernail
Goliath birdeater|now|rainforest|swarm|hot|0.175|12|58,14,44,52,40|the heaviest spider, and it flicks barbed hairs
Black widow|now|desert,savanna|swarm|hot|0.001|3|76,4,38,58,22|venom fifteen times stronger than a rattlesnake's
Emperor scorpion|now|rainforest|swarm|hot|0.03|8|48,26,50,52,30|glows under ultraviolet for reasons nobody has settled
Giant centipede|now|rainforest,desert|swarm|hot|0.05|20|72,12,48,60,52|takes bats out of the air in caves
Bullet ant|now|rainforest|swarm|hot|0.003|4|78,6,54,58,26|the most painful sting ever measured, and it lasts a day
Tarantula hawk wasp|now|desert,rainforest|swarm|hot|0.004|40|74,6,52,64,62|paralyses a tarantula and buries it with an egg
Velvet ant|now|desert,savanna|swarm|hot|0.0005|8|66,28,48,50,30|a wingless wasp nicknamed the cow killer
Driver ant column|now|rainforest,savanna|swarm|hot|25|1|58,10,88,84,8|a column half a million strong that eats through a village
Fire ant raft|now|wetland,savanna|swarm|hot|15|1|52,34,80,86,6|links legs into a living raft and floats out a flood
Yellowjacket swarm|now|mountain,wetland|swarm|temperate|4|40|60,8,66,70,54|stings as often as it likes, unlike a bee
Mosquito swarm|now|wetland,rainforest|swarm|hot|3|24|68,4,84,52,32|kills more people every year than every other animal combined
Tsetse swarm|now|savanna,rainforest|swarm|hot|2|24|56,4,78,48,32|carries the sickness that kept cattle out of Africa
Giant water bug|now|wetland|swarm|hot|0.02|6|64,14,46,56,20|takes frogs and fish twice its size
Praying mantis|now|rainforest,savanna|swarm|hot|0.005|10|56,8,42,72,42|the only insect that can turn its head and look at you
Dragonfly|now|wetland,rainforest|sprinter,swarm|temperate|0.001|57|50,4,56,80,72|catches ninety-five percent of what it chases
Hercules beetle|now|rainforest|bulwark,swarm|hot|0.1|8|54,52,50,40,24|lifts eight hundred times its own weight
Mantis shrimp|now|ocean|swarm|water|0.3|4|84,32,46,66,18|a punch that boils the water behind it
Blue-ringed octopus|now|ocean|swarm|water|0.03|8|86,6,44,78,32|no antivenom exists, and the bite is painless
Cone snail|now|ocean|swarm|water|0.1|0.03|80,40,52,44,2|fires a harpoon on a thread, slowly, at a fish
Stonefish|now|ocean,wetland|bulwark,swarm|water|2|5|82,44,50,46,14|thirteen spines and the worst pain in the sea
Pufferfish|now|ocean|swarm|water|1|12|76,30,46,50,22|one fish carries enough toxin for thirty people
Lionfish|now|ocean|swarm|water|1.5|8|66,22,50,48,26|no predators where it has been introduced, and it knows
Irukandji jellyfish|now|ocean|swarm|water|0.002|2|78,2,54,38,8|the size of a fingernail, and the sting arrives half an hour late
Golden poison frog|now|rainforest|swarm|hot|0.003|4|88,2,40,44,18|enough on its skin to kill ten adults
Cane toad|now|wetland,savanna|swarm|hot|1.5|3|64,20,58,44,10|poisons whatever tries to eat it, which is now most of Australia
Platypus|now|wetland|swarm|temperate|1.7|10|58,16,54,66,26|a venomous spur that makes morphine useless
Slow loris|now|rainforest|swarm|hot|1.2|2|62,10,46,60,8|the only venomous primate, and it licks the venom from its elbow
Hooded pitohui|now|rainforest|swarm|hot|0.07|30|60,4,52,50,44|the first poisonous bird anyone bothered to test
Vampire bat|now|rainforest,desert|swarm,ranger|hot|0.04|40|46,4,74,76,48|runs on the ground, which no other bat does
Tasmanian devil|now|rainforest,mountain|swarm,apex|temperate|8|13|72,30,62,62,26|the strongest bite for its size of any mammal alive
Fossa|now|rainforest|apex,sprinter|hot|8|40|60,18,56,66,56|hunts lemurs head-first down a tree trunk
Giant anteater|now|savanna,rainforest|bulwark|hot|40|30|64,46,62,38,34|claws long enough that it walks on its knuckles
Arthropleura|paleo|rainforest,wetland|bulwark,swarm|hot|50|8|52,66,62,36,16|eight feet of millipede, the largest bug that ever lived
Meganeura|paleo|wetland,rainforest|sprinter,swarm|hot|0.15|60|58,6,60,74,78|a dragonfly with the wingspan of a hawk
Pulmonoscorpius|paleo|rainforest,desert|swarm,apex|hot|4|14|76,34,52,58,38|a scorpion as long as your forearm
Jaekelopterus|paleo|ocean,wetland|apex,swarm|water|90|20|82,46,58,54,30|a sea scorpion eight feet long with claws to match
Dunkleosteus|paleo|ocean|apex,bulwark|water|950|30|92,84,62,44,36|bone shears instead of teeth, and it bit through armour
Helicoprion|paleo|ocean|apex|water|500|35|84,40,64,46,44|a buzzsaw whorl of teeth in the lower jaw
Cameroceras|paleo|ocean|apex,ranger|water|200|18|74,62,66,52,20|a straight shell twenty feet long with arms at the end
Cladoselache|paleo|ocean|sprinter,apex|water|40|40|64,18,58,40,58|a shark before sharks settled on the design
Rhizodus|paleo|wetland,rainforest|apex|hot|500|16|84,44,58,42,26|a lobe-finned fish that ate the amphibians
Orthacanthus|paleo|wetland|apex,sprinter|hot|40|30|72,20,56,44,50|a freshwater shark with a spike behind its skull
Dimetrodon|paleo|desert,wetland|apex|hot|250|20|80,44,54,48,30|the sail is not a fin and it is not a dinosaur
Inostrancevia|paleo|desert,mountain|apex|temperate|300|40|88,46,58,56,44|sabre teeth forty million years before any cat
Gorgonops|paleo|desert,savanna|apex,sprinter|hot|150|45|80,38,56,52,50|the first predator built to run prey down
Anteosaurus|paleo|savanna,wetland|apex,bulwark|hot|500|25|84,58,56,44,28|half a tonne of jaw and forehead
Titanophoneus|paleo|wetland,savanna|apex|hot|200|30|78,44,54,46,36|the name means titanic murderer, which is fair
Scutosaurus|paleo|desert,savanna|bulwark|hot|1000|18|58,88,62,32,22|armour plate and spikes, and it ate ferns
Cotylorhynchus|paleo|desert,rainforest|bulwark|hot|500|12|52,76,58,28,16|a barrel body with a ridiculous little head
Estemmenosuchus|paleo|wetland,mountain|bulwark|temperate|500|22|62,72,60,34,26|horns coming out of its cheeks and its nose
Moschops|paleo|savanna,desert|bulwark|hot|300|24|58,78,58,32,28|skull built for shoving matches
Edaphosaurus|paleo|wetland,rainforest|bulwark|hot|300|16|48,72,58,28,20|a sail studded with crossbars, and no teeth to speak of
Eryops|paleo|wetland,rainforest|apex,bulwark|hot|90|12|70,52,54,38,20|an amphibian that hunted like a crocodile
Prionosuchus|paleo|wetland,ocean|apex,ranger|hot|500|20|82,48,66,40,26|thirty feet of amphibian in a Permian river
Diplocaulus|paleo|wetland|swarm,bulwark|hot|5|10|44,58,50,48,14|a head shaped like a boomerang, too wide to swallow
Lystrosaurus|paleo|desert,savanna|ranger,bulwark|hot|100|20|44,58,78,40,24|survived the worst extinction on record and inherited the world
Bothriolepis|paleo|ocean,wetland|bulwark|water|8|10|34,80,56,26,14|armoured head, jointed fins, found on every continent
Stethacanthus|paleo|ocean|swarm,sprinter|water|20|35|56,22,54,52,50|an anvil-shaped brush on its back nobody can explain
Coelurosauravus|paleo|rainforest,mountain|sprinter|temperate|0.3|35|34,8,48,56,64|glided on rods of bone, not ribs
`.trim();

export const ROSTER = RAW.split('\n').map((line, i) => {
  const p = line.split('|');
  const s = p[7].split(',').map(Number);
  const kg = Number(p[5]);
  return {
    id: i,
    name: p[0],
    era: p[1],
    biomes: p[2].split(','),
    roles: p[3].split(','),
    climate: p[4],
    kg, kph: Number(p[6]),
    pow: s[0], arm: s[1], sta: s[2], gui: s[3], spd: s[4],
    mass: Math.max(4, Math.min(100, Math.round(Math.log10(kg + 1) * 20 + 8))),
    note: p[8] || ''
  };
});

export const BY_ID = new Map(ROSTER.map(a => [a.id, a]));
export const BY_NAME = new Map(ROSTER.map(a => [a.name, a]));

/* every era+biome pair that holds enough animals to draft from */
export const COMBOS = [];
for (const era in ERA_NAME) for (const b in BIOME_NAME) {
  const pool = ROSTER.filter(a => a.era === era && a.biomes.includes(b));
  if (pool.length >= 5) COMBOS.push({ era, biome: b, pool });
}
