// Field journal content. Entries unlock through play; nothing here spoils a creature before the
// player has met it. Text uses Minecraft formatting codes (§7 gray, §o italic, §l bold, §r reset).

export type Chapter = "notes" | "threats" | "craft" | "places";

export interface Entry {
  id: string;
  chapter: Chapter;
  title: string;
  icon: string;
  body: string;
  /** Lore pages are unlocked in order by Torn Pages. */
  lore?: number;
}

const P = "§r\n\n";

export const ENTRIES: Entry[] = [
  // ------------------------------------------------------------------ NOTES
  {
    id: "intro",
    chapter: "notes",
    title: "Ranger Marlowe's Field Journal",
    icon: "textures/items/hollow/field_journal",
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
    icon: "textures/items/hollow/rowan_ward",
    body:
      "Rules I keep:" + P +
      "§l1.§r A roof and a §lclosed door§r. Nothing out there opens doors." + P +
      "§l2.§r Light keeps the tall one back. Carry a torch or lantern after dusk." + P +
      "§l3.§r Hang a §lHollow Chime§r. It rings when one of them comes near, " +
      "long before you would hear it yourself." + P +
      "§l4.§r A §lRowan Ward§r by the door turns visitors away. It burns down with use; " +
      "feed it charcoal." + P +
      "§l5.§r Sleep is still safe. If you hear knocking from bed, stay in bed.",
  },
  {
    id: "lore1", chapter: "notes", lore: 1, title: "Torn Page: Arrival", icon: "textures/items/hollow/torn_page",
    body:
      "§oDay 3 at the station.§r" + P +
      "The previous ranger left in a hurry. Coffee still in the pot. Boots by the door. " +
      "The logbook ends mid-sentence: §o\"it stood at the edge of the clearing all night and when I\"§r" + P +
      "I have decided the previous ranger was a dramatic person.",
  },
  {
    id: "lore2", chapter: "notes", lore: 2, title: "Torn Page: The Count", icon: "textures/items/hollow/torn_page",
    body:
      "§oDay 9.§r" + P +
      "Counted the Hobbs flock at dusk. Thirty-one. Counted again at dawn. Thirty-one. " +
      "But I only ever sold them thirty." + P +
      "One of them doesn't graze. It just stands at the back and watches the house.",
  },
  {
    id: "lore3", chapter: "notes", lore: 3, title: "Torn Page: Underfoot", icon: "textures/items/hollow/torn_page",
    body:
      "§oDay 14.§r" + P +
      "The miners at the east camp say the deep tunnels §oclick§r, like someone tapping a tongue " +
      "against their teeth. They say if you stand very still, it goes away." + P +
      "They moved camp the next day. Nobody told me where.",
  },
  {
    id: "lore4", chapter: "notes", lore: 4, title: "Torn Page: Visitors", icon: "textures/items/hollow/torn_page",
    body:
      "§oDay 22.§r" + P +
      "Three knocks after midnight. I almost answered. There are no neighbours for miles." + P +
      "In the morning there was a long iron nail on the step, bent like a finger beckoning.",
  },
  {
    id: "lore5", chapter: "notes", lore: 5, title: "Torn Page: The Shrine", icon: "textures/items/hollow/torn_page",
    body:
      "§oDay 30.§r" + P +
      "Found an old map in the cabin floor. Beneath these hills there is a room older than any " +
      "of us, where the roots of the forest meet. Something sleeps in it and §ldreams§r them all: " +
      "the watcher, the borrowed things, the clickers, the knocker, the thing in the mire." + P +
      "They are not five monsters. They are one heart, thinking in five directions.",
  },
  {
    id: "lore6", chapter: "notes", lore: 6, title: "Torn Page: Last Entry", icon: "textures/items/hollow/torn_page",
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
    icon: "textures/items/hollow/hollow_lens",
    body:
      "The ground keeps what the night won't tell you. Prints fade within a day." + P +
      "§lThin, root-toed prints§r, far apart: the Watcher. Where there are two side by side, it stood still " +
      "there a long time, looking at something." + P +
      "§lLong bare feet§r with a dragging heel: the Knocker. They come out of the trees and stop at a door." + P +
      "§lA wet smear§r from the bank into the shallows: something was dragged. Walk the banks." + P +
      "§lSheep hooves that turn into claws§r halfway along: a Borrowed stopped pretending." + P +
      "§7A Hollow Lens names fresh tracks within 8 blocks.",
  },
  {
    id: "after",
    chapter: "notes",
    title: "Afterward",
    icon: "textures/items/hollow/stilled_heart",
    body:
      "The Heart is still." + P +
      "The forest will never be entirely quiet; things that were dreamed do not stop at once. " +
      "But the dark is a little smaller now, and you made it so." + P +
      "§7Place a §lHeartwood Lantern§r§7 at home. Nothing that remains will cross its light.",
  },

  // ------------------------------------------------------------------ THREATS
  {
    id: "watcher1", chapter: "threats", title: "The Watcher", icon: "textures/items/hollow/pale_resin",
    body:
      "A tall shape at the treeline. I took it for a dead sapling until the pale face turned " +
      "to follow me." + P +
      "§lSigns:§r a pale face in the forest at dusk or night, far away. The woods go quiet first." + P +
      "It only appears in wooded country. It has not followed me into the open.",
  },
  {
    id: "watcher2", chapter: "threats", title: "The Watcher: Staring Back", icon: "textures/items/hollow/pale_resin",
    body:
      "§lIt does not like being watched back.§r" + P +
      "Hold your gaze on it for a breath or two and it steps back into the trees and is gone. " +
      "Where it stood you will find §lPale Resin§r, bleeding from the bark it scraped." + P +
      "Resin glints faintly at night. It's the base of the §lHollow Lens§r.",
  },
  {
    id: "watcher3", chapter: "threats", title: "The Watcher: Turned Backs", icon: "textures/items/hollow/pale_resin",
    body:
      "§lIt only moves while nobody is looking at it.§r" + P +
      "Ignore it and it creeps closer, tree by tree. In the dark it will close the last few " +
      "steps and strike." + P +
      "§lCounterplay:§r turn and look at it; hold a torch or lantern; stay " +
      "near placed lights. It will not approach a lit place, and it won't strike someone holding a light.",
  },
  {
    id: "borrowed1", chapter: "threats", title: "The Borrowed", icon: "textures/items/hollow/borrowed_hide",
    body:
      "One of the sheep is not a sheep." + P +
      "§lSigns:§r it never lowers its head to graze; its bleat is a little too low and ends in a " +
      "soft §oclick§r; at night its eyes catch the light; it stands still when the others wander, " +
      "and it faces you." + P +
      "By day it is harmless if left alone.",
  },
  {
    id: "borrowed2", chapter: "threats", title: "The Borrowed: Tests", icon: "textures/items/hollow/borrowed_hide",
    body:
      "§lHow to tell:§r" + P +
      "• Hold §lwheat§r. Real sheep come to you. It does not move toward the wheat. It just watches you.§r\n" +
      "• Try to §lshear§r it. The wool doesn't come off. It peels.§r\n" +
      "• Look through a §lHollow Lens§r. It cannot hold its shape.§r" + P +
      "Once revealed it hunts until hurt badly, then flees. At night, don't let it get close in " +
      "the dark. Fight with your back to a wall. It drops §lBorrowed Hide§r.",
  },
  {
    id: "hollowed1", chapter: "threats", title: "The Hollowed", icon: "textures/items/hollow/hollow_fang",
    body:
      "Deep tunnels, darkness, and a rapid §oclick-click-click§r ahead of me. It hunts by sound. " +
      "It has no eyes at all." + P +
      "§lSigns:§r echolocation clicks, distant breathing, scraping on stone.",
  },
  {
    id: "hollowed2", chapter: "threats", title: "The Hollowed: What It Hears", icon: "textures/items/hollow/hollow_fang",
    body:
      "§lIt hears:§r sprinting (16 blocks), walking (6), jumping and landing (8), breaking blocks (12), " +
      "placing blocks (8), doors, trapdoors, levers, buttons, pressure plates and chests (10), " +
      "fighting (14), explosions (40), and things you throw landing nearby (12)." + P +
      "§lIt cannot hear:§r sneaking, and anyone walking on §lwool§r or §lcarpet§r." + P +
      "§lCounterplay:§r crouch past it. Throw a snowball, egg or arrow away from you; " +
      "it goes to the sound. Within 3 blocks it finds you anyway, so keep your distance.",
  },
  {
    id: "hollowed3", chapter: "threats", title: "The Hollowed: Fangs", icon: "textures/items/hollow/hollow_fang",
    body:
      "They die like anything else. Their fangs are hollow and hum faintly when held near " +
      "running water. §lHollow Fangs§r go into the §lHeartseeker§r.",
  },
  {
    id: "knocker1", chapter: "threats", title: "The Knocker", icon: "textures/items/hollow/knocker_nail",
    body:
      "§lThree knocks at the door, after dark.§r" + P +
      "It only comes to occupied shelters with a door, never before the fourth night, and rarely. " +
      "Your Chime will ring as it approaches.",
  },
  {
    id: "knocker2", chapter: "threats", title: "The Knocker: Don't Answer", icon: "textures/items/hollow/knocker_nail",
    body:
      "§lDo not open the door.§r It cannot open doors. It knocks, scratches, breathes against " +
      "the wood. Then it gives up and leaves." + P +
      "When it leaves, it leaves a §lKnocker's Nail§r on the step." + P +
      "A §lRowan Ward§r near the door sends it away before it knocks.",
  },
  {
    id: "knocker3", chapter: "threats", title: "The Knocker: I Opened It", icon: "textures/items/hollow/knocker_nail",
    body:
      "I answered. It was waiting with its arms already reaching." + P +
      "If you open the door while it's there, it comes in. It's slow but strong. Fight it in the " +
      "light, step back through a doorway, or close the door again between you.",
  },
  {
    id: "mirebound1", chapter: "threats", title: "The Mirebound", icon: "textures/items/hollow/mire_pearl",
    body:
      "In the swamps and along riverbanks there is a mossy hump in the shallows that wasn't there " +
      "yesterday." + P +
      "§lSigns:§r bubbles rising where no fish swim, a low gurgle, two dull lights just under " +
      "the surface at night.",
  },
  {
    id: "mirebound2", chapter: "threats", title: "The Mirebound: Breaking Free", icon: "textures/items/hollow/mire_pearl",
    body:
      "It waits until you're close, then grabs you and drags you toward deeper water." + P +
      "§lPress Sneak (crouch) to wrench free.§r Hitting it also makes it let go. It can't hold " +
      "you for long, and it can't follow you onto dry land for more than a few steps." + P +
      "Walk the banks, not the shallows. It drops a §lMire Pearl§r.",
  },
  {
    id: "heart1", chapter: "threats", title: "The Heart Below", icon: "textures/items/hollow/heartseeker",
    body:
      "Something huge beneath the hills, rooted into stone, beating slow." + P +
      "§lIt is shielded§r while its §lveins§r pulse around the chamber. Break every vein to " +
      "expose it. Watch the ground: roots burst where dust rises, and its pulse ring can be jumped.",
  },
  {
    id: "heart2", chapter: "threats", title: "The Heart Below: Phases", icon: "textures/items/hollow/heartseeker",
    body:
      "§lFirst:§r root bursts (dust warns you) and slow pulses." + P +
      "§lSecond:§r the veins regrow once; young hollowed crawl out. Kill them first, they hunt by sound." + P +
      "§lLast:§r it opens. The bursts come faster and its gaze sweeps the room. " +
      "Break line of sight behind the pillars." + P +
      "It grows stronger with every person in the chamber. Everyone who fights earns a share.",
  },

  // ------------------------------------------------------------------ CRAFTING
  {
    id: "craft_chime", chapter: "craft", title: "Hollow Chime", icon: "textures/items/hollow/hollow_chime",
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
    id: "craft_ward", chapter: "craft", title: "Rowan Ward", icon: "textures/items/hollow/rowan_ward",
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
    id: "craft_lens", chapter: "craft", title: "Hollow Lens", icon: "textures/items/hollow/hollow_lens",
    body:
      "§lInvestigation tool.§r Use it to:" + P +
      "• reveal any Borrowed within 24 blocks (only you see it)\n" +
      "• show the direction and distance of the nearest Hollow creature within 48 blocks\n" +
      "• show how loud you are right now to the Hollowed§r" + P +
      "§l64 uses§r, 3 s cooldown. Repair with copper ingots at an anvil." + P +
      "§7Recipe:§r\n  [   ] [Copper Ingot] [   ]\n  [Copper Ingot] [Glass Pane] [Copper Ingot]\n" +
      "  [   ] [Pale Resin] [   ]",
  },
  {
    id: "craft_heartseeker", chapter: "craft", title: "Heartseeker", icon: "textures/items/hollow/heartseeker",
    body:
      "§lBoss progression.§r A compass that beats instead of points. Use it to feel the " +
      "direction, distance and depth of the shrine. It also marks the shrine on your locator bar." + P +
      "If no shrine has formed in this world yet, the first use draws one up from the deep " +
      "beneath the hills nearby." + P +
      "§7Recipe (shapeless):§r Compass + Pale Resin + 2 Hollow Fangs",
  },
  {
    id: "craft_offering", chapter: "craft", title: "Offering of Silence", icon: "textures/items/hollow/offering_of_silence",
    body:
      "§lBoss progression.§r A piece of each of them. Place it in the altar at the shrine to " +
      "wake the Heart Below." + P +
      "§7Recipe:§r\n  [Hollow Fang] [Pale Resin] [Hollow Fang]\n" +
      "  [Borrowed Hide] [Gold Ingot] [Knocker's Nail]\n  [   ] [Mire Pearl] [   ]" + P +
      "§7Cabin and campsite chests sometimes hold components. If a creature is switched off in " +
      "World Rules, every new site chest holds its component instead.",
  },
  {
    id: "craft_lantern", chapter: "craft", title: "Heartwood Lantern", icon: "textures/items/hollow/heartwood_lantern",
    body:
      "§lReward.§r Crafted from a Stilled Heart and a lantern. A permanent light: within 24 " +
      "blocks no Hollow creature is drawn to you, the Knocker never visits, and nothing " +
      "of theirs spawns." + P +
      "§7Recipe (shapeless):§r Stilled Heart + Lantern",
  },

  // ------------------------------------------------------------------ PLACES
  {
    id: "place_cabin", chapter: "places", title: "The Ranger Cabin", icon: "textures/items/hollow/torn_page",
    body:
      "A spruce cabin in the woods with a cold stove and a chest of supplies. Rangers kept spare " +
      "notes here. Look for §lTorn Pages§r." + P +
      "§7Cabins appear in forests, well away from where you've built.",
  },
  {
    id: "place_camp", chapter: "places", title: "The Ruined Campsite", icon: "textures/items/hollow/torn_page",
    body:
      "Two collapsed tents and a dead fire. Whoever camped here left in the night and didn't take " +
      "their pack. Check the barrel." + P +
      "§7Campsites appear on open ground and at forest edges.",
  },
  {
    id: "place_shrine", chapter: "places", title: "The Underground Shrine", icon: "textures/items/hollow/heartseeker",
    body:
      "A root-choked chamber deep below the hills, lit by old candles. The altar at its centre " +
      "takes the §lOffering of Silence§r." + P +
      "§7Follow the Heartseeker. Dig down carefully and bring a way back up.",
  },
];

export const ENTRY_BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));
export const LORE_PAGES = ENTRIES.filter((e) => e.lore !== undefined).sort((a, b) => (a.lore ?? 0) - (b.lore ?? 0));

export const CHAPTERS: { id: Chapter; title: string; icon: string }[] = [
  { id: "notes", title: "Field Notes", icon: "textures/items/hollow/field_journal" },
  { id: "threats", title: "Threats", icon: "textures/items/hollow/pale_resin" },
  { id: "craft", title: "Equipment", icon: "textures/items/hollow/rowan_ward" },
  { id: "places", title: "Places", icon: "textures/items/hollow/torn_page" },
];
