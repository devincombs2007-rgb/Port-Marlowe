// Field journal content. Entries unlock through play; nothing here spoils a creature before the
// player has met it. Text uses Minecraft formatting codes (§7 gray, §o italic, §l bold, §r reset).

import { ISLAND_ENTRIES } from "./island_journal";

export type Chapter = "notes" | "contract" | "survey" | "threats" | "craft" | "places";

export interface Entry {
  id: string;
  chapter: Chapter;
  title: string;
  icon: string;
  body: string;
  /** Lore pages are unlocked in order by Torn Pages. */
  lore?: number;
  /** Varrow Island only (2.0). */
  island?: boolean;
}

const P = "§r\n\n";

export const ENTRIES: Entry[] = [
  // ------------------------------------------------------------------ NOTES
  {
    id: "intro",
    chapter: "notes",
    title: "Ranger Marlowe's Field Journal",
    icon: "textures/ui/hollow/journal/item_field_journal",
    body:
      "§oIf you are reading this, the station is empty and the journal found you instead of me.§r" + P +
      "These woods are beautiful. Fish the rivers, mine the hills, raise your house. But " +
      "something here is wrong, and it is patient." + P +
      "§lThe first day is safe.§r Use it. Gather wood, find food, build walls and a §lclosed door§r." + P +
      "This journal fills itself in as you learn. When something new happens, look here first. " +
      "Hold it and press §lUse§r to read. It stays with you when you fall.",
  },
  {
    id: "shelter",
    chapter: "notes",
    title: "On Shelter",
    icon: "textures/ui/hollow/journal/shelter",
    body:
      "Rules I keep:" + P +
      "§l1.§r A roof and a §lclosed door§r. Nothing out there opens doors." + P +
      "§l2.§r Light keeps the tall one back. Carry a torch or lantern after dusk." + P +
      "§l3.§r Hang a §lTelltale Chime§r. It rings when one of them comes near, " +
      "long before you would hear it yourself." + P +
      "§l4.§r A §lRowan Ward§r by the door turns visitors away. It burns down with use; " +
      "feed it charcoal." + P +
      "§l5.§r Sleep is still safe. If you hear knocking from bed, stay in bed.",
  },
  {
    id: "lore1", chapter: "notes", lore: 1, title: "Torn Page: Arrival", icon: "textures/ui/hollow/journal/page",
    body:
      "§oDay 3 at the station.§r" + P +
      "The previous ranger left in a hurry. Coffee still in the pot. Boots by the door. " +
      "The logbook ends mid-sentence: §o\"it stood at the edge of the clearing all night and when I\"§r" + P +
      "I have decided the previous ranger was a dramatic person.",
  },
  {
    id: "lore2", chapter: "notes", lore: 2, title: "Torn Page: The Count", icon: "textures/ui/hollow/journal/page",
    body:
      "§oDay 9.§r" + P +
      "Counted the Hobbs flock at dusk. Thirty-one. Counted again at dawn. Thirty-one. " +
      "But I only ever sold them thirty." + P +
      "One of them doesn't graze. It just stands at the back and watches the house.",
  },
  {
    id: "lore3", chapter: "notes", lore: 3, title: "Torn Page: Underfoot", icon: "textures/ui/hollow/journal/page",
    body:
      "§oDay 14.§r" + P +
      "The miners at the east camp say the deep tunnels §oclick§r, like someone tapping a tongue " +
      "against their teeth. They say if you stand very still, it goes away." + P +
      "They moved camp the next day. Nobody told me where.",
  },
  {
    id: "lore4", chapter: "notes", lore: 4, title: "Torn Page: Visitors", icon: "textures/ui/hollow/journal/page",
    body:
      "§oDay 22.§r" + P +
      "Three knocks after midnight. I almost answered. There are no neighbours for miles." + P +
      "In the morning there was a long iron nail on the step, bent like a finger beckoning.",
  },
  {
    id: "lore_prints", chapter: "notes", lore: 5, title: "Torn Page: Prints", icon: "textures/ui/hollow/journal/page",
    body:
      "§oDay 17.§r" + P +
      "Bare footprints in the frost this morning, from the tree line straight to my door. Long feet. " +
      "Too long. They stop at the step." + P +
      "There are no prints going back.",
  },
  {
    id: "lore_tower", chapter: "notes", lore: 6, title: "Torn Page: Fire Watch", icon: "textures/ui/hollow/journal/page",
    body:
      "§oDay 25, from the tower.§r" + P +
      "From up here you can count the lights in the valley. Mine, the Hobbs farm, the camp by the river." + P +
      "Tonight there was a fourth. It moved when I looked away, and it went out when I looked at it.",
  },
  {
    id: "lore_eye", chapter: "notes", lore: 7, title: "Torn Page: The Flock", icon: "textures/ui/hollow/journal/page",
    body:
      "§oDay 27.§r" + P +
      "Every animal in the meadow stopped at once and turned to look at me. Cows, sheep, the chickens. " +
      "Nobody moved for a long breath. Then they went back to grazing as if nothing happened." + P +
      "Something was looking out through them.",
  },
  {
    id: "lore5", chapter: "notes", lore: 8, title: "Torn Page: The Shrine", icon: "textures/ui/hollow/journal/page",
    body:
      "§oDay 30.§r" + P +
      "Found an old map in the cabin floor. Beneath these hills there is a room older than any " +
      "of us, where the roots of the forest meet. Something sleeps in it and §ldreams§r them all: " +
      "the watcher, the borrowed things, the clickers, the knocker, the thing in the mire." + P +
      "They are not five monsters. They are one heart, thinking in five directions.",
  },
  {
    id: "lore6", chapter: "notes", lore: 9, title: "Torn Page: Last Entry", icon: "textures/ui/hollow/journal/page",
    body:
      "§oDay 41.§r" + P +
      "A piece from each of them, laid on the altar, wakes it. An offering of silence." + P +
      "I have them all now. If I'm right, I can still it. If I'm wrong, whoever reads this: " +
      "do not go alone. Bring light, bring friends, and §lbreak the veins first§r.",
  },
  {
    id: "tracks",
    chapter: "notes",
    title: "Reading Tracks",
    icon: "textures/ui/hollow/journal/tracks",
    body:
      "The ground keeps what the night won't tell you. Prints fade within a day." + P +
      "§lThin, root-toed prints§r, far apart: the Watcher. Where there are two side by side, it stood still " +
      "there a long time, looking at something." + P +
      "§lLong bare feet§r with a dragging heel: the Knocker. They come out of the trees and stop at a door." + P +
      "§lA wet smear§r from the bank into the shallows: something was dragged. Walk the banks." + P +
      "§lSheep hooves that turn into claws§r halfway along: a Borrowed stopped pretending." + P +
      "§7A Seer's Glass names fresh tracks within 8 blocks.",
  },
  {
    id: "event_eye",
    chapter: "notes",
    title: "Every Eye",
    icon: "textures/ui/hollow/journal/event_eye",
    body:
      "Every animal around me stopped, turned, and looked at me. For a long breath nothing moved. Then it let them go." + P +
      "It didn't hurt anyone. It wanted me to know it can look through anything that has eyes.",
  },
  {
    id: "event_lantern",
    chapter: "notes",
    title: "The Lantern",
    icon: "textures/ui/hollow/journal/event_lantern",
    body:
      "A lantern burning on a stump, deep in the trees, with nobody near it. When I got close it went out." + P +
      "Someone left a page under it. Someone wanted it found.",
  },
  {
    id: "event_roof",
    chapter: "notes",
    title: "On the Roof",
    icon: "textures/ui/hollow/journal/event_roof",
    body:
      "Footsteps on the roof. Slow, heavy, from one end to the other. Then nothing." + P +
      "It never came in. Things that can't open doors can still climb.",
  },
  {
    id: "dread1",
    chapter: "notes",
    title: "On Fear",
    icon: "textures/ui/hollow/journal/dread",
    body:
      "My hands are shaking as I write this. Good. Fear is information. Learn to read it." + P +
      "§lIt builds§r in the dark, underground, in the woods and the swamp after sunset, when you are " +
      "alone, and when you are hurt. Every one of them leaves some behind when it shows itself." + P +
      "§lIt eases§r with daylight, a light in your hand, a lit room with a roof, a campfire, friends " +
      "close by, a Heartwood Lantern, and sleep. A bowl of §lHearth Tea§r takes the edge off quickly." + P +
      "§lIt draws them.§r When I am frightened, more of them come. When I'm calm and lit, they keep to " +
      "the usual rules." + P +
      "At its worst you will hear your own heart, and the dark will seem to close in. Down in the deep " +
      "tunnels, the blind ones can hear that heart too." + P +
      "§7Your current nerve is on the Field Conditions page.",
  },
  {
    id: "dread2",
    chapter: "notes",
    title: "Things That Aren't There",
    icon: "textures/ui/hollow/journal/phantom",
    body:
      "Footsteps behind me that stopped when I stopped. A tall shape at the corner of my eye that was " +
      "gone when I turned. A voice right at my ear." + P +
      "§lNone of it touched me.§r If it vanishes when you look straight at it, it was never there. " +
      "If it doesn't vanish, it was." + P +
      "Nobody standing beside me ever saw them. Calm down, find light, and they stop.",
  },
  {
    id: "after",
    chapter: "notes",
    title: "Afterward",
    icon: "textures/ui/hollow/journal/after",
    body:
      "The Heart is still." + P +
      "The forest will never be entirely quiet; things that were dreamed do not stop at once. " +
      "But the dark is a little smaller now, and you made it so." + P +
      "§7Place a §lHeartwood Lantern§r§7 at home. Nothing that remains will cross its light.",
  },

  // ------------------------------------------------------------------ THREATS
  {
    id: "watcher1", chapter: "threats", title: "The Watcher", icon: "textures/ui/hollow/journal/watcher",
    body:
      "A tall shape at the treeline. I took it for a dead sapling until the pale face turned " +
      "to follow me." + P +
      "§lSigns:§r a pale face in the forest at dusk or night, far away. The woods go quiet first." + P +
      "It only appears in wooded country. It has not followed me into the open.",
  },
  {
    id: "watcher2", chapter: "threats", title: "The Watcher: Staring Back", icon: "textures/ui/hollow/journal/watcher",
    body:
      "§lIt does not like being watched back.§r" + P +
      "Hold your gaze on it for a breath or two and it steps back into the trees and is gone. " +
      "Where it stood you will find §lWeeping Sap§r, bleeding from the bark it scraped." + P +
      "Sap glints faintly at night. It's the base of the §lSeer's Glass§r.",
  },
  {
    id: "watcher3", chapter: "threats", title: "The Watcher: Turned Backs", icon: "textures/ui/hollow/journal/watcher",
    body:
      "§lIt only moves while nobody is looking at it.§r" + P +
      "Ignore it and it creeps closer, tree by tree. In the dark it will close the last few " +
      "steps and strike." + P +
      "§lCounterplay:§r turn and look at it; hold a torch or lantern; stay " +
      "near placed lights. It will not approach a lit place, and it won't strike someone holding a light.",
  },
  {
    id: "borrowed1", chapter: "threats", title: "The Borrowed", icon: "textures/ui/hollow/journal/borrowed",
    body:
      "One of the sheep is not a sheep." + P +
      "§lSigns:§r it never lowers its head to graze; its bleat is a little too low and ends in a " +
      "soft §oclick§r; at night its eyes catch the light; it stands still when the others wander, " +
      "and it faces you." + P +
      "By day it is harmless if left alone.",
  },
  {
    id: "borrowed2", chapter: "threats", title: "The Borrowed: Tests", icon: "textures/ui/hollow/journal/borrowed",
    body:
      "§lHow to tell:§r" + P +
      "• Hold §lwheat§r. Real sheep come to you. It does not move toward the wheat. It just watches you.§r\n" +
      "• Try to §lshear§r it. The wool doesn't come off. It peels.§r\n" +
      "• Look through a §lSeer's Glass§r. It cannot hold its shape.§r" + P +
      "Once revealed it hunts until hurt badly, then flees. At night, don't let it get close in " +
      "the dark. Fight with your back to a wall. It drops §lFalse Fleece§r.",
  },
  {
    id: "hollowed1", chapter: "threats", title: "The Hollowed", icon: "textures/ui/hollow/journal/hollowed",
    body:
      "Deep tunnels, darkness, and a rapid §oclick-click-click§r ahead of me. It hunts by sound. " +
      "It has no eyes at all." + P +
      "§lSigns:§r echolocation clicks, distant breathing, scraping on stone.",
  },
  {
    id: "hollowed2", chapter: "threats", title: "The Hollowed: What It Hears", icon: "textures/ui/hollow/journal/hollowed",
    body:
      "§lIt hears:§r sprinting (16 blocks), walking (6), jumping and landing (8), breaking blocks (12), " +
      "placing blocks (8), doors, trapdoors, levers, buttons, pressure plates and chests (10), " +
      "fighting (14), explosions (40), and things you throw landing nearby (12)." + P +
      "§lIt cannot hear:§r sneaking, and anyone walking on §lwool§r or §lcarpet§r." + P +
      "§lCounterplay:§r crouch past it. Throw a snowball, egg or arrow away from you; " +
      "it goes to the sound. Within 3 blocks it finds you anyway, so keep your distance.",
  },
  {
    id: "hollowed3", chapter: "threats", title: "The Hollowed: Fangs", icon: "textures/ui/hollow/journal/hollowed",
    body:
      "They die like anything else. Their fangs are hollow and hum faintly when held near " +
      "running water. §lEcho Fangs§r go into the §lHeartseeker§r.",
  },
  {
    id: "knocker1", chapter: "threats", title: "The Knocker", icon: "textures/ui/hollow/journal/knocker",
    body:
      "§lThree knocks at the door, after dark.§r" + P +
      "It only comes to occupied shelters with a door, never before the fourth night, and rarely. " +
      "Your Chime will ring as it approaches.",
  },
  {
    id: "knocker2", chapter: "threats", title: "The Knocker: Don't Answer", icon: "textures/ui/hollow/journal/knocker",
    body:
      "§lDo not open the door.§r It cannot open doors. It knocks, scratches, breathes against " +
      "the wood. Then it gives up and leaves." + P +
      "When it leaves, it leaves a §lDoorstep Nail§r on the step." + P +
      "A §lRowan Ward§r near the door sends it away before it knocks.",
  },
  {
    id: "knocker3", chapter: "threats", title: "The Knocker: I Opened It", icon: "textures/ui/hollow/journal/knocker",
    body:
      "I answered. It was waiting with its arms already reaching." + P +
      "If you open the door while it's there, it comes in. It's slow but strong. Fight it in the " +
      "light, step back through a doorway, or close the door again between you.",
  },
  {
    id: "mirebound1", chapter: "threats", title: "The Mirebound", icon: "textures/ui/hollow/journal/mirebound",
    body:
      "In the swamps and along riverbanks there is a mossy hump in the shallows that wasn't there " +
      "yesterday." + P +
      "§lSigns:§r bubbles rising where no fish swim, a low gurgle, two dull lights just under " +
      "the surface at night.",
  },
  {
    id: "mirebound2", chapter: "threats", title: "The Mirebound: Breaking Free", icon: "textures/ui/hollow/journal/mirebound",
    body:
      "It waits until you're close, then grabs you and drags you toward deeper water." + P +
      "§lPress Sneak (crouch) to wrench free.§r Hitting it also makes it let go. It can't hold " +
      "you for long, and it can't follow you onto dry land for more than a few steps." + P +
      "Walk the banks, not the shallows. It drops a §lMire Pearl§r.",
  },
  {
    id: "heart1", chapter: "threats", title: "The Heart Below", icon: "textures/ui/hollow/journal/heart_below",
    body:
      "Something huge beneath the hills, rooted into stone, beating slow." + P +
      "§lIt is shielded§r while its §lveins§r pulse around the chamber. Break every vein to " +
      "expose it. Watch the ground: roots burst where dust rises, and its pulse ring can be jumped.",
  },
  {
    id: "heart2", chapter: "threats", title: "The Heart Below: Phases", icon: "textures/ui/hollow/journal/heart_below",
    body:
      "§lFirst:§r root bursts (dust warns you) and slow pulses." + P +
      "§lSecond:§r the veins regrow once; young hollowed crawl out. Kill them first, they hunt by sound." + P +
      "§lLast:§r it opens. The bursts come faster and its gaze sweeps the room. " +
      "Break line of sight behind the pillars." + P +
      "It grows stronger with every person in the chamber. Everyone who fights earns a share.",
  },

  // ------------------------------------------------------------------ CRAFTING
  {
    id: "craft_chime", chapter: "craft", title: "Telltale Chime", icon: "textures/ui/hollow/journal/item_hollow_chime",
    body:
      "§lWarning device.§r Hang it under a ceiling, a porch roof or a beam. It rings softly when one of " +
      "the Hollow comes within 14 blocks, at most once every few seconds. Use it to " +
      "silence or unsilence it." + P +
      "§7Recipe (crafting table):§r\n" +
      "  [   ] [String] [   ]\n" +
      "  [Iron Nugget] [Copper Ingot] [Iron Nugget]\n" +
      "  [   ] [Iron Nugget] [   ]" + P +
      "§7No fuel. Up to 32 chimes per world are active at once.",
  },
  {
    id: "craft_ward", chapter: "craft", title: "Rowan Ward", icon: "textures/ui/hollow/journal/item_rowan_ward",
    body:
      "§lLimited protection.§r A charm of iron and smouldering charcoal. Within 10 blocks:" + P +
      "• the Knocker turns back before it reaches your door\n" +
      "• the Watcher will not step closer\n" +
      "• the Borrowed reveal themselves and flee§r" + P +
      "§lCharges:§r 4. One charge burns each time it turns something away (at most one " +
      "per creature per night). Use §lcharcoal§r on it to add a charge back." + P +
      "§7Recipe:§r\n  [   ] [String] [   ]\n  [Iron Nugget] [Charcoal] [Iron Nugget]\n" +
      "  [Iron Nugget] [Stick] [Iron Nugget]" + P +
      "§7It does not stop the Hollowed underground, the Mirebound, or the Heart.",
  },
  {
    id: "craft_lens", chapter: "craft", title: "Seer's Glass", icon: "textures/ui/hollow/journal/item_hollow_lens",
    body:
      "§lInvestigation tool.§r Use it to:" + P +
      "• reveal any Borrowed within 24 blocks (only you see it)\n" +
      "• show the direction and distance of the nearest Hollow creature within 48 blocks\n" +
      "• show how loud you are right now to the Hollowed§r" + P +
      "§l64 uses§r, 3 s cooldown. Repair with copper ingots at an anvil." + P +
      "§7Recipe:§r\n  [   ] [Copper Ingot] [   ]\n  [Copper Ingot] [Glass Pane] [Copper Ingot]\n" +
      "  [   ] [Weeping Sap] [   ]",
  },
  {
    id: "craft_heartseeker", chapter: "craft", title: "Heartseeker", icon: "textures/ui/hollow/journal/item_heartseeker",
    body:
      "§lBoss progression.§r A compass that beats instead of points. Use it to feel the " +
      "direction, distance and depth of the shrine. It also marks the shrine on your locator bar." + P +
      "If no shrine has formed in this world yet, the first use draws one up from the deep " +
      "beneath the hills nearby." + P +
      "§7Recipe (shapeless):§r Compass + Weeping Sap + 2 Echo Fangs",
  },
  {
    id: "craft_offering", chapter: "craft", title: "Hush Offering", icon: "textures/ui/hollow/journal/item_offering_of_silence",
    body:
      "§lBoss progression.§r A piece of each of them. Place it in the altar at the shrine to " +
      "wake the Heart Below." + P +
      "§7Recipe:§r\n  [Echo Fang] [Weeping Sap] [Echo Fang]\n" +
      "  [False Fleece] [Gold Ingot] [Doorstep Nail]\n  [   ] [Mire Pearl] [   ]" + P +
      "§7Cabin and campsite chests sometimes hold components. If a creature is switched off in " +
      "World Rules, every new site chest holds its component instead.",
  },
  {
    id: "craft_lantern", chapter: "craft", title: "Heartwood Lantern", icon: "textures/ui/hollow/journal/item_heartwood_lantern",
    body:
      "§lReward.§r Crafted from a Stilled Heart and a lantern. A permanent light: within 24 " +
      "blocks no Hollow creature is drawn to you, the Knocker never visits, and nothing " +
      "of theirs spawns." + P +
      "§7Recipe (shapeless):§r Stilled Heart + Lantern",
  },
  {
    id: "craft_tea", chapter: "craft", title: "Hearth Tea", icon: "textures/ui/hollow/journal/item_hearth_tea",
    body:
      "§7Recipe (shapeless):§r Bowl + Sugar + Sweet Berries §8(or an Apple)§r" + P +
      "Drink it when your nerve is going. It lowers Dread sharply and steadies you for two minutes: " +
      "fear can still rise, but only half as fast and never past uneasy." + P +
      "§7It is also a little food. You can drink it even when you're full.",
  },

  // ------------------------------------------------------------------ PLACES
  {
    id: "place_cabin", chapter: "places", title: "The Ranger Cabin", icon: "textures/ui/hollow/journal/place_cabin",
    body:
      "A spruce cabin in the woods with a cold stove and a chest of supplies. Rangers kept spare " +
      "notes here. Look for §lTorn Pages§r." + P +
      "§7Cabins appear in forests, well away from where you've built.",
  },
  {
    id: "place_camp", chapter: "places", title: "The Ruined Campsite", icon: "textures/ui/hollow/journal/place_camp",
    body:
      "Two collapsed tents and a dead fire. Whoever camped here left in the night and didn't take " +
      "their pack. Check the barrel." + P +
      "§7Campsites appear on open ground and at forest edges.",
  },
  {
    id: "place_tower", chapter: "places", title: "The Fire Watch Tower", icon: "textures/ui/hollow/journal/place_tower",
    body:
      "A spruce fire-watch tower above the trees. Its lantern is still lit. Nobody has climbed it in months." + P +
      "§7Towers stand in forests. Climb for the view, and check the lookout's chest.",
  },
  {
    id: "place_leanto", chapter: "places", title: "The Lean-to", icon: "textures/ui/hollow/journal/place_leanto",
    body:
      "A hunter's lean-to: bedroll turned back, fire cold, a note on a stake: §o\"went to check the noise\"§r." + P +
      "§7Lean-tos appear at forest edges and in open country.",
  },
  {
    id: "place_shrine", chapter: "places", title: "The Underground Shrine", icon: "textures/ui/hollow/journal/place_shrine",
    body:
      "A root-choked chamber deep below the hills, lit by old candles. The altar at its centre " +
      "takes the §lHush Offering§r." + P +
      "§7Follow the Heartseeker. Dig down carefully and bring a way back up.",
  },
];

ENTRIES.push(...ISLAND_ENTRIES);

export const ENTRY_BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));
export const LORE_PAGES = ENTRIES.filter((e) => e.lore !== undefined).sort((a, b) => (a.lore ?? 0) - (b.lore ?? 0));

export const CHAPTERS: { id: Chapter; title: string; icon: string }[] = [
  { id: "notes", title: "Field Notes", icon: "textures/ui/hollow/journal/chapter_notes" },
  { id: "contract", title: "The Contract", icon: "textures/ui/hollow/journal/item_research_log" },
  { id: "survey", title: "Operation SUNLAMP", icon: "textures/ui/hollow/journal/item_film_reel" },
  { id: "threats", title: "Threats", icon: "textures/ui/hollow/journal/chapter_threats" },
  { id: "craft", title: "Equipment", icon: "textures/ui/hollow/journal/chapter_craft" },
  { id: "places", title: "Places", icon: "textures/ui/hollow/journal/chapter_places" },
];

/** Places from the forest story that never exist on Varrow Island. */
const FOREST_PLACES = new Set(["place_cabin", "place_camp", "place_tower", "place_leanto"]);

/** Which entries belong to this world's story. */
export function entryVisible(e: Entry, island: boolean): boolean {
  if (island) return !!e.island || (e.chapter !== "notes" && !FOREST_PLACES.has(e.id));
  return !e.island;
}

export function chaptersFor(island: boolean): { id: Chapter; title: string; icon: string }[] {
  return island
    ? CHAPTERS.filter((c) => c.id !== "notes").map((c) => (c.id === "craft" ? { ...c, title: "Gear & Equipment" } : c))
    : CHAPTERS.filter((c) => c.id !== "contract" && c.id !== "survey");
}
