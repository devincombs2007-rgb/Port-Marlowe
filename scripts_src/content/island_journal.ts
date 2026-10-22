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

  // ------------------------------------------------------------------ THE WAY OFF
  {
    id: "tower_parts", chapter: "contract", island: true, title: "The Relay Transmitter", icon: `${J}item_vacuum_tube`,
    body:
      "The hut under the mast holds a steel cabinet the size of a wardrobe: the 1957 relay " +
      "transmitter. Most of it survived. What didn't:" + P +
      "§l2 vacuum tubes§r. Cracked. The test crews kept spares in the radio room of the western " +
      "bunker (the one they sealed).\n" +
      "§l4 lengths of copper wire§r. Rotted through. The general store in the mock town stocked " +
      "it; copper ingots can be drawn into wire.\n" +
      "§l1 battery bank§r. For the valve heaters. The boathouse at the old dock had them.\n" +
      "§lThe generator§r in the shed next door needs fuel: 8 coal or charcoal." + P +
      "§8Press the button in the hut to install whatever you're carrying.",
  },
  {
    id: "tower_generator", chapter: "contract", island: true, title: "The Generator", icon: `${J}place_tower`,
    body:
      "A diesel-electric set from 1956, converted at some point to burn anything: coal, charcoal, " +
      "wood scraps. Someone kept it oiled long after the test crews left." + P +
      "§8Press the button by the hopper with 8 coal or charcoal in your pack.",
  },
  {
    id: "transmit", chapter: "contract", island: true, title: "Mayday", icon: `${J}item_field_radio`,
    body:
      "We got through. Coast Guard Sector Honolulu heard us, \"faint but readable\". They're sending a " +
      "helicopter at first light, to the old dock on the south-east shore." + P +
      "The lamp on top of the mast is burning. Every ship for forty miles can see it now, and so " +
      "can everyone on this island." + P +
      "§lOne more night.§r Hold on until dawn, then get to the dock.",
  },
  {
    id: "rescue", chapter: "contract", island: true, title: "First Light", icon: `${J}item_flare_gun`,
    body:
      "A Coast Guard helicopter, orange and white, sitting on the old dock with its rotors turning. " +
      "A crewman in a flight helmet waving us in." + P +
      "§8Stand next to it to leave the island.",
  },
  {
    id: "ending", chapter: "contract", island: true, title: "Leaving Varrow", icon: `${J}item_research_log`,
    body:
      "We lifted off at 06:14. Nobody said anything until the island was a grey line behind us." + P +
      "The full account went into the report. What happened afterwards is on the last page you " +
      "were shown when the helicopter lifted off." + P +
      "§8The island is still there. You can stay as long as you like.",
  },
  {
    id: "survey", chapter: "survey", island: true, title: "The Survey", icon: `${J}item_geiger_counter`,
    body:
      "What we came here to do, and still have to, if anyone is going to read it." + P +
      "§lStations.§r Six concrete huts, built in 1957 to record the fallout. Each has a console " +
      "button: press it with a Geiger counter in your pack to log today's reading beside the 1957 one. " +
      "The masts of unlogged stations flicker red." + P +
      "§lSamples.§r A Sample Kit takes §fcrater water§r, §fblast soil§r and §fscorched wood§r near " +
      "Ground Zero, and §ftissue§r from one of the island's creatures (point it at one, or carry a kit " +
      "when you kill one). Use a sample to file it." + P +
      "§lFilm.§r The test crews filmed everything. Reels turn up in station log barrels and bunker " +
      "record rooms. Use one to watch it." + P +
      "§8All six stations and four sample types complete the survey.",
  },
  {
    id: "station1", chapter: "survey", island: true, title: "Station 1", icon: `${J}item_geiger_counter`,
    body:
      "Monitoring Station 1: the inner blast line, 1.4 miles from GZ." + P +
      "§l3 June 1957§r (Shot day +3): 41 mSv/h, from the stencilled log on the hut wall." + P +
      "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or " +
      "rusted solid long ago.",
  },
  {
    id: "station2", chapter: "survey", island: true, title: "Station 2", icon: `${J}item_geiger_counter`,
    body:
      "Monitoring Station 2: the animal pens." + P +
      "§l3 June 1957§r (Shot day +3): 18 mSv/h, from the stencilled log on the hut wall." + P +
      "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or " +
      "rusted solid long ago.",
  },
  {
    id: "station3", chapter: "survey", island: true, title: "Station 3", icon: `${J}item_geiger_counter`,
    body:
      "Monitoring Station 3: the mock town." + P +
      "§l3 June 1957§r (Shot day +3): 9.5 mSv/h, from the stencilled log on the hut wall." + P +
      "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or " +
      "rusted solid long ago.",
  },
  {
    id: "station4", chapter: "survey", island: true, title: "Station 4", icon: `${J}item_geiger_counter`,
    body:
      "Monitoring Station 4: the observation bleachers at Blackwood." + P +
      "§l3 June 1957§r (Shot day +3): 2.2 mSv/h, from the stencilled log on the hut wall." + P +
      "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or " +
      "rusted solid long ago.",
  },
  {
    id: "station5", chapter: "survey", island: true, title: "Station 5", icon: `${J}item_geiger_counter`,
    body:
      "Monitoring Station 5: the mangrove landing beach." + P +
      "§l3 June 1957§r (Shot day +3): 4.8 mSv/h, from the stencilled log on the hut wall." + P +
      "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or " +
      "rusted solid long ago.",
  },
  {
    id: "station6", chapter: "survey", island: true, title: "Station 6", icon: `${J}item_geiger_counter`,
    body:
      "Monitoring Station 6: the north peak, by the relay." + P +
      "§l3 June 1957§r (Shot day +3): 0.6 mSv/h, from the stencilled log on the hut wall." + P +
      "§l2026§r: logged. The station's mast still stands; the instruments under it were looted or " +
      "rusted solid long ago.",
  },
  {
    id: "sample_water", chapter: "survey", island: true, title: "Sample: Crater Water", icon: `${J}item_sample_kit`,
    body: "Green, faintly warm, and it glows in the dark vial. The counter reads it from a metre away. Something in it is alive: under the lens, threads that move toward light.",
  },
  {
    id: "sample_soil", chapter: "survey", island: true, title: "Sample: Blast Soil", icon: `${J}item_sample_kit`,
    body: "Fused sand, glass beads, black soil. Normal for an airburst site of this age, except that the contamination gets §lstronger§r with depth instead of weaker. Something below is still adding to it.",
  },
  {
    id: "sample_wood", chapter: "survey", island: true, title: "Sample: Scorched Wood", icon: `${J}item_sample_kit`,
    body: "Charred on the side that faced the flash, seventy years ago, and still growing on the other. The rings after 1957 are thick, dark and irregular. The trees here grew fast afterwards. Too fast.",
  },
  {
    id: "sample_tissue", chapter: "survey", island: true, title: "Sample: Creature Tissue", icon: `${J}item_sample_kit`,
    body: "Not muscle, not bark, not quite either. Cell nuclei that look like the crater-water threads. Whatever made the island's creatures, it came up out of the ground after the shot.",
  },
  {
    id: "findings", chapter: "survey", island: true, title: "Findings", icon: `${J}item_research_log`,
    body:
      "§lSurvey complete.§r Six stations, four sample types." + P +
      "The readings don't fall off with time the way they should. The inner stations are " +
      "§lhigher§r than they were in 1958. The soil gets hotter with depth. The crater water is alive." + P +
      "Something under Ground Zero has been feeding on what the bomb left behind, and growing." + P +
      "§8That's the report. Now we need a way to send it.",
  },
  {
    id: "reel1", chapter: "survey", island: true, title: "Shot Day Minus Two", icon: `${J}item_film_reel`,
    body:
      "§o[Black and white. A briefing tent, men in shirtsleeves, a chalkboard map of the island.]§r" + P +
      "§f\"Operation SUNLAMP. One weapon, air-dropped, burst height two thousand feet over the marker at the island's centre. Six monitoring stations at fixed range. Animal pens at one mile. A mock township at a mile and a half. Observers at Blackwood, nine miles by road, goggles on.\"§r" + P +
      "§o[A hand taps the north peak.]§r §f\"The relay stays up whatever happens. Everything goes out through the relay.\"",
  },
  {
    id: "reel2", chapter: "survey", island: true, title: "The Pens", icon: `${J}item_film_reel`,
    body:
      "§o[Pigs and sheep in wooden pens, numbered on their flanks with paint. A technician waves at the camera.]§r" + P +
      "§f\"Group A, unshielded. Group B, behind sandbags. Group C in the shelter trench. We collect them at plus one day, plus one week and plus one month.\"§r" + P +
      "§o[A title card: PLUS ONE MONTH. The pens are empty. The gates are closed and the wire is intact.]",
  },
  {
    id: "reel3", chapter: "survey", island: true, title: "The Mock Town", icon: `${J}item_film_reel`,
    body:
      "§o[Clapboard houses on a grid, a general store, a police post, a water tower. Mannequins in Sunday clothes set out on porches and at a dinner table.]§r" + P +
      "§f\"Effects on typical American construction at intermediate range.\"§r" + P +
      "§o[After the shot: the same street. The houses lean. The mannequins are where they were, scorched on one side.]§r" + P +
      "§o[A later shot, undated: one of the mannequins is standing at a window it was not placed at.]",
  },
  {
    id: "reel4", chapter: "survey", island: true, title: "The Observers", icon: `${J}item_film_reel`,
    body:
      "§o[Wooden bleachers in a clearing. Sixty men in dark goggles, backs to the camera, facing north.]§r" + P +
      "§f\"Ten seconds.\"§r" + P +
      "§o[The frame whites out completely. When it returns, the men are half-turned, hands up, and the trees behind them are bending toward the camera in a wind nobody can hear.]",
  },
  {
    id: "reel5", chapter: "survey", island: true, title: "The Landing Beach", icon: `${J}item_film_reel`,
    body:
      "§o[A landing craft nosed into the mangroves. Crates handed down a chain of men.]§r" + P +
      "§f\"Supply run, Shot Day plus nine. Readings on the beach are within tolerance.\"§r" + P +
      "§o[Behind the crates, in the mangrove shadow, something tall stands very still. Nobody in the film looks at it. It's gone in the next cut.]",
  },
  {
    id: "reel6", chapter: "survey", island: true, title: "The Relay", icon: `${J}item_film_reel`,
    body:
      "§o[The north peak, the mast going up in sections, men in harnesses.]§r" + P +
      "§f\"Station Six reports normal background. Odd thing, though. The deep-soil probe at GZ is climbing. Not falling. Climbing. They want a crew down the instrument shaft to check the sensors.\"§r" + P +
      "§o[A title card: INSTRUMENT SHAFT, GZ NORTH RIM. The film ends.]",
  },
  {
    id: "reel7", chapter: "survey", island: true, title: "Laboratory, Bunker One", icon: `${J}item_film_reel`,
    body:
      "§o[A lab bench, bell jars, a dissecting tray. Hands in rubber gloves.]§r" + P +
      "§f\"Specimen recovered at the pens, plus thirty-one days. Ovine. It should be dead. It isn't anything we have a word for.\"§r" + P +
      "§o[The tray. The camera holds on it too long. The thing in the tray turns its head toward the lens.]",
  },
  {
    id: "reel8", chapter: "survey", island: true, title: "Bunker Two Is Sealed", icon: `${J}item_film_reel`,
    body:
      "§o[No picture. Sound only, over a test card.]§r" + P +
      "§f\"...radio room, Bunker Two. We have lost contact with the shaft crew. Four men. The last thing we got was a heartbeat on the open line. Not one of theirs. Too slow.\"§r" + P +
      "§f\"Bunker Two personnel have stopped responding to the intercom. Their door is closed from the inside. On the Colonel's order the bunker is sealed. God help me.\"§r",
  },
  {
    id: "reel9", chapter: "survey", island: true, title: "Evacuation", icon: `${J}item_film_reel`,
    body:
      "§o[1958. Men loading crates onto a ship at the old dock. A sign: VARROW ISLAND - RESTRICTED - US AEC.]§r" + P +
      "§f\"The site is closed for a period of not less than one hundred years. The relay remains in place as a navigational hazard light. Nobody comes back here.\"§r" + P +
      "§o[The last shot is from the deck as the ship pulls away. On the beach, very small, a figure walks out of the trees and watches it go.]",
  },
  {
    id: "reel10", chapter: "survey", island: true, title: "The Second Sun", icon: `${J}item_film_reel`,
    body:
      "§o[Colour film, faded to orange. 1962. A supply boat run aground in the mangroves. Families wading ashore with suitcases.]§r" + P +
      "§o[A man in a white shirt stands on a stump and addresses them. He has the Hierophant's face, younger.]§r" + P +
      "§f\"They told you the sun was a weapon. I tell you it was a door. We were not afraid to look through it. This island is the threshold, and we are its keepers.\"§r" + P +
      "§o[The last frames: the families kneeling in a ring around the crater, faces to the green light.]",
  },
  // ------------------------------------------------------------------ THE CHILDREN OF THE SECOND SUN
  {
    id: "cult1", chapter: "threats", island: true, title: "The Children of the Second Sun", icon: `${J}faithful`,
    body:
      "The island isn't uninhabited. There are §lpeople§r here: families, gardens, stilt houses " +
      "behind a log wall in the north-west, and a camp in the mangroves on the east shore." + P +
      "They're sick-looking (thin hair, raw patches of skin, eyes that don't squint in the sun), " +
      "and §lnone of the island's creatures touch them§r." + P +
      "Their armed men shot us out of the sky with rifles older than my grandfather." + P +
      "§8Killing their people turns all of them against you. Gifts of food, offerings in the shrine " +
      "barrel at Sunfall, and quiet days make them trust you more. They never forget a death.",
  },
  {
    id: "cult_zealot", chapter: "threats", island: true, title: "Zealots", icon: `${J}zealot`,
    body:
      "Their soldiers: hooded, rifles from the 1950s, and good with them. They guard the villages, " +
      "and after the first night they hunt the island after dark in twos and threes. At dawn they " +
      "go back into the trees." + P +
      "§8Their shots carry a long way. If you hear one close, get behind something.",
  },
  {
    id: "cult_faithful", chapter: "threats", island: true, title: "The Faithful", icon: `${J}faithful`,
    body:
      "Ordinary people: gardeners, herders, children. They won't speak to anyone holding a weapon. " +
      "Hurt one and the Zealots come running." + P +
      "§8Holding food when you speak to one offers it as a gift. Once they trust you, they'll trade " +
      "copper wire for medicine.",
  },
  {
    id: "cult_seer", chapter: "threats", island: true, title: "The Seer", icon: `${J}seer`,
    body:
      "A blindfolded old woman at Sunfall who seems to know who we are. She talks if you come " +
      "unarmed. She trades, and she knows the island better than the 1957 maps do.",
  },
  {
    id: "cult_hierophant", chapter: "threats", island: true, title: "The Hierophant", icon: `${J}hierophant`,
    body:
      "Their leader, at the shrine in the middle of Sunfall. Robed, very old, with a staff of tower " +
      "steel. He calls the bomb \"the second sun\" and this island its threshold." + P +
      "§cRaise a hand against him and he answers with everything he has.§r Kill him, and every one " +
      "of his people will hunt you for as long as you stay." + P +
      "§8Win their trust instead and he may give you the key to what lies under the shrine.",
  },
  {
    id: "seer_story", chapter: "threats", island: true, title: "The Seer's Story", icon: `${J}seer`,
    body:
      "§o\"We came in nineteen sixty-two on a supply boat that never went back. The flash had been gone " +
      "five years. The light was still in everything. Some of us got sick. The ones who didn't heard " +
      "it singing under the lake.\"",
  },
  {
    id: "seer_shot", chapter: "threats", island: true, title: "Who Shot Us Down", icon: `${J}zealot`,
    body:
      "§o\"The Hierophant says the sky belongs to the sun. The Zealots keep it clean. Your pilot was not " +
      "the first. He will not be the last.\"§r" + P +
      "They've done this before.",
  },
  {
    id: "seer_maps", chapter: "places", island: true, title: "The Three Bunkers", icon: `${J}seer`,
    body:
      "The Seer drew them in the dirt for a battery." + P +
      "§lNorth, by the crater§r: the armoury, the laboratory, the records. Open.\n" +
      "§lWest, under the hill§r: the radio room. §cSealed from the inside in 1957.§r\n" +
      "§lNorth-east§r: a laboratory and the spare generator." + P +
      "§o\"Do not open the doors that are already closed.\"",
  },
  {
    id: "seer_way", chapter: "places", island: true, title: "The Back Way", icon: `${J}seer`,
    body:
      "§o\"The machine-house under the western hill is closed. But the rock has a throat. Walk west " +
      "from its door, a hundred paces, where the ground falls in. Climb down.\"§r" + P +
      "A sinkhole about a hundred blocks west of Bunker 2, with a cave that runs into the back of it.",
  },
  {
    id: "hierophant_dead", chapter: "threats", island: true, title: "The Hierophant Is Dead", icon: `${J}hierophant`,
    body:
      "He died on the shrine steps. The light in the altar went out with him." + P +
      "The Children will never forgive this. More Zealots, every night, and the Faithful run from " +
      "us now. The key to the shrine vault was on his belt.",
  },
  {
    id: "ledger", chapter: "threats", island: true, title: "The Hierophant's Ledger", icon: `${J}item_shrine_key`,
    body:
      "In the vault under the shrine: an iron box, and a ledger in a careful hand. Every vessel the " +
      "Children have brought down since 1962, with a date and a line of scripture:" + P +
      "§o1971, fishing boat. 1984, light aircraft, two souls. 1996, yacht. 2009, survey drone. " +
      "2026, helicopter, white with a red stripe.§r" + P +
      "Under that, in the same hand: §o\"The mainland sends more each time. Soon it will send enough.\"",
  },
  {
    id: "heart_island", chapter: "survey", island: true, title: "What Was Under the Lake", icon: `${J}heart_below`,
    body:
      "The thing in the cavern under Ground Zero is dead. It was why the counters climbed going " +
      "down, why the crater water was alive, why the creatures came out of the ground. It had been " +
      "feeding on the bomb for seventy years." + P +
      "The Children called it the voice under the lake. I don't know what they'll call it now.",
  },
  // ------------------------------------------------------------------ MORE GEAR
  {
    id: "gear_rifle", chapter: "craft", island: true, title: "Bolt-Action Rifle", icon: `${J}item_bolt_rifle`,
    body:
      "A 1950s service rifle from the Bunker 1 armoury. Five rounds, slow to work the bolt, but it " +
      "hits hard and true at long range." + P +
      "§lUse§r to fire, §lsneak + Use§r to reload. Rifle rounds can be made from iron and gunpowder.",
  },
  {
    id: "gear_shotgun", chapter: "craft", island: true, title: "Pump Shotgun", icon: `${J}item_pump_shotgun`,
    body:
      "From the police post in the mock town. Four shells, a spray of pellets: devastating up close, " +
      "useless past twenty metres." + P +
      "§lUse§r to fire, §lsneak + Use§r to reload.",
  },
  {
    id: "gear_flare", chapter: "craft", island: true, title: "Flare Gun", icon: `${J}item_flare_gun`,
    body:
      "Fires a burning red flare that lights the ground where it lands for half a minute, and can be " +
      "seen from across the island. Trevor comes to it as soon as he finishes what he's doing.",
  },
  {
    id: "gear_hazmat", chapter: "craft", island: true, title: "Hazmat Suit", icon: `${J}item_hazmat_suit`,
    body:
      "1957 civil-defence issue, rubberised canvas, gas-mask hood. Each piece cuts radiation uptake; " +
      "the full set cuts it by nine-tenths. Heavy: wearing most of it slows you down." + P +
      "§8Hood, suit, trousers and boots. The bunkers had them.",
  },
  {
    id: "gear_samples", chapter: "craft", island: true, title: "Sample Kit", icon: `${J}item_sample_kit`,
    body:
      "Glass vials and a scraper. Use it facing crater water, blast soil or scorched wood near Ground " +
      "Zero, or facing one of the island's creatures. Then use the sample to file it." + P +
      "§8Three made from glass and paper.",
  },
  {
    id: "gear_chelation", chapter: "craft", island: true, title: "Chelation Shot", icon: `${J}item_chelation_shot`,
    body:
      "Prussian blue and DTPA in an auto-injector. Draws a third of your accumulated dose out over a " +
      "minute. Rare: the bunker laboratories kept a few.",
  },
  // ------------------------------------------------------------------ MORE PLACES
  {
    id: "place_town", chapter: "places", island: true, title: "The Mock Town", icon: `${J}place_cabin`,
    body:
      "A whole street of clapboard houses built to be blown down, with a store, a police post and a " +
      "water tower. Mannequins in 1950s clothes still sit at the tables." + P +
      "§8The store had wire and supplies; the police post an armoury.",
  },
  {
    id: "place_pens", chapter: "places", island: true, title: "The Animal Pens", icon: `${J}place_camp`,
    body: "Rows of wooden pens a mile from Ground Zero, where the test crews left animals to see what the bomb would do. The gates are still closed. The pens are empty.",
  },
  {
    id: "place_sunfall", chapter: "places", island: true, title: "Sunfall", icon: `${J}faithful`,
    body:
      "The Children's village in the north-west: a log palisade, stilt houses, gardens, and a shrine " +
      "of tower steel around a burning sun. There's a barrel by the altar for offerings." + P +
      "§8The Zealots guard the gate. Don't come in shooting.",
  },
  {
    id: "place_mangroves", chapter: "places", island: true, title: "The Mangrove Camp", icon: `${J}zealot`,
    body: "A stilt camp in the mangroves on the east shore, next to the wreck of a 1957 landing craft. A few of the Faithful live here, and their guards.",
  },
  {
    id: "place_tower", chapter: "places", island: true, title: "The North Peak Relay", icon: `${J}place_tower`,
    body: "A lattice mast on the highest point of the island, a hut at its foot and a generator shed. Our way off, if we can make it talk.",
  },
  {
    id: "place_dock", chapter: "places", island: true, title: "The Old Dock", icon: `${J}item_battery_bank`,
    body: "A timber pier on the south-east shore and a boathouse, where the supply ships came in. The only place on the coast a helicopter could set down.",
  },
  {
    id: "place_bleachers", chapter: "places", island: true, title: "The Bleachers", icon: `${J}watcher`,
    body: "Wooden bleachers in a clearing in Blackwood, nine miles from the flash by road. The observers sat here in goggles. Someone still sits here.",
  },
  {
    id: "place_bunkers", chapter: "places", island: true, title: "The Bunkers", icon: `${J}shelter`,
    body:
      "Concrete portals in the hillsides, iron doors (press the button beside them), stairs down to " +
      "corridors and rooms. Three of them, the Seer says. One is sealed." + P +
      "§8Bring a light. And a counter.",
  },
];
