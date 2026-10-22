import type { Entry } from "./journal";

// Research Log entries for Varrow Island (2.0). Formatting codes as in journal.ts.
// The contract, people and places are invented; Operation SUNLAMP is fiction.

const P = "§r\n\n";
const J = "textures/ui/hollow/journal/";

export const ISLAND_ENTRIES: Entry[] = [
  // ------------------------------------------------------------------ CONTRACT
  {
    id: "contract", chapter: "contract", island: true, title: "Contract FLS-2026-114", icon: `${J}item_research_log`,
    body:
      "§lFederal Legacy Sites Program§r\n§7Field survey, Varrow Island (former Pacific test site, 1957)§r" + P +
      "§lScope.§r Take dose-rate readings at the six 1957 monitoring stations, collect soil, water " +
      "and biological samples, and assess the condition of the remaining structures." + P +
      "§lTeam.§r Senior field technician §lTrevor Hale§r. Field researchers (you). Pilot " +
      "§lDan Okafor§r, co-pilot §lRuth Lindqvist§r (Meridian Air Charter)." + P +
      "§lSchedule.§r Eight hours on the ground. Pickup at the south beach before dark." + P +
      "§lAdvisory.§r Unverified fishing-fleet reports of gunfire from the north-west shore. The " +
      "island has been uninhabited since 1957. §oRecord and avoid.§r",
  },
  {
    id: "crash", chapter: "contract", island: true, title: "What Happened", icon: `${J}crew`,
    body:
      "§oWritten that first night, by firelight.§r" + P +
      "We came in low from the south at about two in the afternoon. Dan was pointing out the crater " +
      "when the windscreen starred. Then again. Trevor saw muzzle flashes in the trees on the " +
      "north-west side. §lSomeone shot at us. On purpose.§r" + P +
      "Dan was hit. Ruth fought it the whole way down. She got us to the beach. She didn't get " +
      "herself out." + P +
      "The radio is cracked in half. Nobody knows we're down until we miss the pickup, and nobody " +
      "is going to fly in here once they hear why. §lWe have to call out ourselves.§r",
  },
  {
    id: "tower_hint", chapter: "contract", island: true, title: "A Way Off", icon: `${J}item_broken_radio`,
    body:
      "The satellite radio is finished. Trevor says the 1957 test crews ran everything through a " +
      "§lrelay tower on the north peak§r: valve transmitter, its own generator, a mast you could " +
      "see from the ships." + P +
      "Seventy years of salt air. But the old gear was built to survive a bomb going off next to it." + P +
      "§lGoal:§r reach the north peak, see what's left of the relay, and find out what it needs." + P +
      "§8The peak is the high grey ridge across the island to the north. You can see it from the beach.",
  },
  {
    id: "okafor", chapter: "contract", island: true, title: "Okafor's Kneeboard", icon: `${J}crew`,
    body:
      "Clipped to the pilot's leg, spattered:" + P +
      "§o14:02 feet wet. 14:09 island in sight, wind 12 kt from the SE. 14:11 GZ crater visible, " +
      "water in it - GREEN??§r" + P +
      "§oNotes for the return leg: stay off the NW shore, fleet reports shots. LZ south beach. " +
      "Fuel for 40 min loiter.§r" + P +
      "On the back, in a different pen: §o\"Ade - home Sunday. Save me some jollof.\"§r",
  },
  {
    id: "lindqvist", chapter: "contract", island: true, title: "Lindqvist's Notebook", icon: `${J}crew`,
    body:
      "A waterproof notebook in the co-pilot's vest. Mostly checklists, neat block capitals." + P +
      "The last page is a sketch of the island from the air: the crater, a grey ridge to the north " +
      "with a tall mast drawn on it, a cluster of small square buildings in the middle, and on the " +
      "north-west side a ring of huts with smoke rising, circled twice." + P +
      "Under it: §o\"PEOPLE?? 60 yrs exclusion zone. Ask T.\"§r",
  },
  {
    id: "trevor1", chapter: "contract", island: true, title: "Trevor Hale", icon: `${J}trevor`,
    body:
      "Thirty years of fieldwork: Bikini, Maralinga, the Nevada flats. Calm the way people get when " +
      "they've stopped expecting things to go to plan." + P +
      "§lTalk to him§r (Use on him) to have him §lfollow§r you or §lhold§r a spot. Anyone can give " +
      "orders; he says whose order he's on. He fights with his service pistol, carries medkits and " +
      "patches up whoever is badly hurt, and he will not walk into the crater without a suit." + P +
      "§lIf he goes down§r, go to him and press Use, then stay beside him for a few seconds. " +
      "You have a minute. If nobody reaches him, he crawls off and finds his way back at dawn " +
      "§8(unless the world rules make his death permanent)§r.",
  },
  {
    id: "trevor_down", chapter: "contract", island: true, title: "Close Call", icon: `${J}trevor`,
    body:
      "Trevor went down and I got him back on his feet. He laughed about it afterwards, but his " +
      "hands were shaking when he reloaded." + P +
      "§o\"Next time, you go first,\"§r he said. I'm fairly sure he was joking.",
  },
  // ------------------------------------------------------------------ GEAR
  {
    id: "radiation1", chapter: "craft", island: true, title: "Radiation and the Geiger Counter", icon: `${J}item_geiger_counter`,
    body:
      "Hold the counter to hear it: a few clicks a minute is background, a steady crackle means you " +
      "should be moving, a roar means you're already in trouble. Use it to take a §lreading§r: the " +
      "dose rate here, your total dose, and which way the reading climbs." + P +
      "Your §ldose§r adds up while you're exposed and falls only slowly once you're clear:" + P +
      "§l100 mSv§r metal taste, hunger.  §l300§r nausea.  §l600§r weakness.  §l1000§r radiation " +
      "sickness.  §l1500§r your body starts to fail." + P +
      "The worst is §lGround Zero§r, east of the island's centre, and worst of all §lthe green water§r " +
      "in the crater: it burns. Rock overhead blocks most of it. §lIodine tablets§r halve what " +
      "you take in for five minutes.",
  },
  {
    id: "gear_pistol", chapter: "craft", island: true, title: "Service Pistol", icon: `${J}item_service_pistol`,
    body:
      "Seven rounds in the magazine. Aim and press §lUse§r to fire; §lsneak + Use§r reloads from the " +
      "9mm rounds you carry. Hits are instant out to about 48 blocks, weaker at long range, and " +
      "much harder to the head." + P +
      "§lEvery shot is heard for 48 blocks.§r Some things on this island hunt by sound. Shoot " +
      "when it's the only choice, not the first one." + P +
      "§8Rounds: the crash crates, and whatever else you can find.",
  },
  {
    id: "gear_crash", chapter: "craft", island: true, title: "What We Saved", icon: `${J}item_medkit`,
    body:
      "From the wreck: field rations, medkits, a survival hatchet, iodine tablets, spare 9mm rounds " +
      "and the broken satellite radio." + P +
      "§lMedkit§r: hold Use to dress wounds (heals over a few seconds).\n" +
      "§lField ration§r: a proper meal.\n" +
      "§lSurvival hatchet§r: fells trees fast; a decent weapon.\n" +
      "§lIodine tablets§r: halve radiation uptake for five minutes.",
  },
  // ------------------------------------------------------------------ PLACES
  {
    id: "place_crash", chapter: "places", island: true, title: "Crash Beach", icon: `${J}item_broken_radio`,
    body:
      "The south shore, where Ruth put us down. The wreck will burn for days. The smoke can be " +
      "seen from anywhere on the island, which cuts both ways." + P +
      "§8Make camp nearby: Trevor treats this place as home until you build somewhere better.",
  },
  {
    id: "place_crater", chapter: "places", island: true, title: "Ground Zero", icon: `${J}item_geiger_counter`,
    body:
      "The bomb went off in the air above this spot in May 1957. The ground for a long way round is " +
      "flattened and black, dead trees snapped off at the same height, sand fused into green glass." + P +
      "In the middle, a crater full of water that §lglows§r at night. The counter doesn't click " +
      "here. It screams." + P +
      "§cDon't linger. Don't drink. Don't swim.",
  },
];
