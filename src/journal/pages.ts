/**
 * The Field Journal. Pages belonged to the last person to carry it, a surveyor sent to map the land behind Port
 * Marlowe. Each page unlocks when the player lives through something the surveyor also lived through, so the
 * journal doubles as the game's only instruction manual: every survival rule in it is a real mechanic.
 */
export interface Page {
  id: string;
  title: string;
  text: string;
  /** Survival knowledge this page teaches, shown in the "What I know" list once unlocked. */
  lesson?: string;
}

export const PAGES: readonly Page[] = [
  {
    id: "first",
    title: "I. The commission",
    text:
      "Eleven days out from Port Marlowe. The harbour master paid in advance and would not meet my eye.\n\n" +
      "\"Map the high ground. Come back before the lamps are lit.\" I asked why the last surveyor never filed his " +
      "sheets. He said the man was careless with his lantern.\n\nI found this book in the mud by his tripod. " +
      "I am keeping my notes in the back of it. It seems a waste of good paper otherwise.",
  },
  {
    id: "sound",
    title: "II. The wrong sounds",
    text:
      "A branch broke behind me today. Not the crack of a deer, which is followed by running. This was followed by " +
      "nothing at all.\n\nI have started to notice which sounds have an animal attached to them and which do not. " +
      "Doors in places with no houses. Something heavy being dragged and then, very suddenly, not dragged.\n\n" +
      "The woods are quieter when I am alone in them. That should not be possible.",
    lesson: "The worst sounds come when you are alone, in the dark, or underground.",
  },
  {
    id: "noticed",
    title: "III. The tall one",
    text:
      "At the treeline, maybe forty paces off, there was a man standing very still. Too tall. Too thin. The head " +
      "craned forward like a heron's.\n\nI looked at it properly, the way you look at something you intend to " +
      "draw, and it looked back. Its face did something I cannot describe, and then it simply was not there. " +
      "No running. Smoke, maybe.\n\nI have decided it does not like to be studied.",
    lesson: "Look straight at the tall one and hold your gaze. It will not stay where it is seen.",
  },
  {
    id: "spooked",
    title: "IV. Approach",
    text:
      "I walked toward it this time. I thought, if it is a man, it will speak. If it is not, I will know.\n\n" +
      "I did not get within twenty paces. It went the same way as before. I have the feeling I was allowed to " +
      "come exactly that close and no closer, and that the distance was decided by it, not by me.",
    lesson: "It keeps its own distance. Walking toward it ends the watching. It does not end the interest.",
  },
  {
    id: "close",
    title: "V. Breath",
    text:
      "I was writing by the fire with my back to the trees. Someone breathed behind me. Slow, with a rattle at the " +
      "end, like a man with water in his chest.\n\nI did not turn around. I could not. When I finally did there was " +
      "nothing, only the long marks in the bark of the nearest pine, about the height of a man's head.\n\n" +
      "Note to self: sit with your back to a wall.",
    lesson: "When it gets close it wants you not to turn around. Turn around.",
  },
  {
    id: "light",
    title: "VI. Lamp oil",
    text:
      "It came for me tonight. Properly, running on those long legs, and I could hear it laughing, or breathing, " +
      "or both.\n\nI had the lantern. I don't know what made me hold it up, but it stopped. It stayed at the edge " +
      "of the light, swaying, and then it went back into the dark.\n\nThe harbour master was right. The other man " +
      "was careless with his lantern.",
    lesson: "Light is the only thing it respects. Hold a torch or lantern, or stand by one, and keep it lit.",
  },
  {
    id: "hunt",
    title: "VII. The chase",
    text:
      "Survived it. Four cuts on my back and a ruined coat. It does not try to finish you. It tries to frighten " +
      "you, then it hurts you, then it leaves, as if it has learned what it came to learn.\n\n" +
      "I struck it with the hatchet once and it flinched like anything else would. It is not a ghost. It can be " +
      "hurt. That is a comfort I did not expect to need.",
    lesson: "A chase does not last forever. Hurt it badly and it runs. Shelter, a bed or a campfire, ends the night's interest.",
  },
  {
    id: "home",
    title: "VIII. Shelter",
    text:
      "Built a proper camp: walls, a bed, a fire that I keep fed. Three nights now and nothing has come inside " +
      "the ring of light. I heard it once, far off, scraping at something.\n\nI am starting to think it is not " +
      "that it cannot come in. It is that it does not want to be seen doing it.",
    lesson: "A lit home with a bed or campfire is the safest place in the world. It almost never comes there.",
  },
  {
    id: "death",
    title: "IX. (in a different hand)",
    text:
      "Found him by the tripod. I am the third. The book was dry, which is strange because it had rained for two " +
      "days.\n\nHe was right about the light. I would add: it is patient. After it takes someone it goes quiet " +
      "for a long time. Long enough that you start to think you imagined it.\n\nYou did not imagine it.",
  },
  {
    id: "many",
    title: "X. Company",
    text:
      "Two men from the port came up to help with the chain. While they were here I heard nothing. Not a twig. " +
      "The night they left it was back at the treeline before the fire had settled.\n\nIt does not like witnesses. " +
      "I have stopped telling the port about it. I do not think they would come again.",
    lesson: "Travelling together keeps it at a distance. It prefers people who are alone.",
  },
  {
    id: "gaunt",
    title: "XI. The low one",
    text:
      "There is a second thing, and it is nothing like the first. Low to the ground, on arms like a man's legs, " +
      "and no eyes at all, only that long white skull swinging back and forth over my footprints.\n\n" +
      "It was not looking for me. It was looking for where I had been. It followed the exact line I had walked " +
      "that morning, stopping where I had stopped, tasting the air where I had stood to light my pipe.",
    lesson: "The low one follows the path you walked, not where you are. It is hunting your trail.",
  },
  {
    id: "scent",
    title: "XII. Losing it",
    text:
      "Crossed the river at the ford and waited on the far bank with my heart in my teeth. It came down to the " +
      "water, put its face in the shallows, and stood there a long while. Then it went back into the ground the " +
      "way a mole does.\n\nWater takes the scent. So does woodsmoke, I think. And when I crept, bent double, it " +
      "lost me twice in the same hour.",
    lesson: "Water and campfire smoke wash your trail away. Sneaking leaves almost none. Doors stop it.",
  },
  {
    id: "mimic",
    title: "XIII. Counting cattle",
    text:
      "There was a cow at the edge of the east pasture where nobody keeps cows. I went to drive it home. Six paces " +
      "off, it opened.\n\nI do not know a better word. The back of it split and something narrow and pale came up " +
      "out of it like a man standing up out of a bath, and the cow's head just hung there, still chewing.\n\n" +
      "It ran. On all of its legs. I have started counting the animals every night.",
    lesson: "Not everything grazing in the dark is an animal. It never moves while you watch it. Count your livestock.",
  },
  {
    id: "turned",
    title: "XIV. Wrong way round",
    text:
      "I watched one for a long time from the fence, waiting for it to move. It did not move. Real animals move.\n\n" +
      "Then its head turned. Not the way a cow looks over its shoulder. It kept turning until it was looking at me " +
      "backwards, upside down, and it held that for as long as I held still.\n\nWhen I looked away it was gone. " +
      "Since then I hear the door of my hut open while I am inside it. I hear my own chest lid. I do not check anymore.",
    lesson: "If you hear something familiar where it should not be, it may be imitating. Light and distance keep you safe from it.",
  },
];

export const PAGE_IDS = PAGES.map((p) => p.id);
export type PageId = (typeof PAGES)[number]["id"];
