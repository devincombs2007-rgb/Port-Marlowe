# Varrow Island (2.0)

THE HOLLOW 2.0 moves the story to **Varrow Island**, a 1957 nuclear test site in the Pacific.
You and your friends are a 2026 survey team; someone on the island shoots your helicopter down.
All six phases of the 2.0 plan are in this build: the island and the crash, the 1957 cinematic,
Trevor's jobs, the Children of the Second Sun, the survey and the tower, and Ground Zero with the
endings. This page is the player's guide.

## Files

| File | What it is |
|---|---|
| `dist/THE_HOLLOW_Varrow_Island_v2.0.0.mcworld` | **The island.** A prebuilt world with all three packs embedded. Open it to import, then play it like any world. |
| `dist/THE_HOLLOW_v2.0.0.mcaddon` | The same packs for other worlds. In any world that is not Varrow Island the add-on keeps the original forest story. |

Import the `.mcworld` the same way you imported the `.mcaddon`. Turn on **Vibrant Visuals** in
Video settings for the green crater, the mist and the soft shadows.

## The island

**The island.** About 600 × 600 blocks of land in an endless ocean (the game generates open sea
beyond the island, so you cannot walk off the map):

- **Crash Beach** (south): the burning helicopter wreck, a furrow ploughed through the trees, the
  torn-off tail boom, rotor blades in the brush, supply barrels and three signal fires. The fires
  never go out and never spread (fire spread is off in this world).
- **Ground Zero** (east of centre): a blast ring of scorched ground and charred dead trees, a
  ragged crater rim of fused green glass and basalt, and the **crater lake**, green water with a
  low green mist over it and glowing seams on the lake bed.
- **The north peak** (the grey ridge to the north), **Blackwood** (old dark forest in the west), the
  **mangrove shallows** on the east coast, open meadows in the north-west and centre, beaches with
  palms, seagrass and kelp offshore, caves and ores underground.

**The opening.** The first time anyone arrives, everyone online watches it together: 1957,
a bomber over the island, the drop, the airburst, the white-out, the mushroom cloud and the
delayed boom, the island burning. Then 2026: your helicopter comes in low from the south and is
shot down from the trees. Hold **sneak** for two seconds to skip. Players who join mid-scene
wait for it to end; players who join later just get the wake-up.

**Finding your way.** The game always tells you the one thing to do next:

- A **gold marker** on the locator bar points at it (the bar at the top of the screen, like a
  compass). A smaller white marker points at the nearest survey station you haven't logged.
- When the objective changes you get a **"New objective"** title and a line in chat saying what
  to do and where. Every minute or so the action bar reminds you, with the distance and direction.
- The **Research Log's** front page starts with the current objective.
- **Trevor** says what he thinks you should do next when you talk to him.
- The story goes: talk to Trevor → reach the radio tower on the north peak → collect the
  transmitter parts (the objective names each one and where to find it, nearest first) →
  transmit → survive the night → get to the dock.

**Cutscenes.** Besides the opening: a short scene the first time you see the **radio tower**,
**Sunfall** and **Ground Zero** (never in the middle of a fight); the **transmission** (the lamp
lighting, the Coast Guard answering, Sunfall seeing it); the **helicopter** arriving at dawn; the
**Hierophant** turning on you; and the **ending** (the island from the air, with what became of
everyone). You're safe while they play and put back where you were afterwards. Hold **Sneak** to
skip any of them.

**The crash.** Each player wakes once: black screen, ringing ears, the title card, Trevor talking
you round. You get your **Research Log**, a **Geiger counter** and a **loaded service pistol**.
The barrels by the wreck hold rations, medkits, 9mm rounds, iodine tablets, sample kits, a
survival hatchet and the cracked satellite radio (craft it into a **field radio** with copper and
redstone to give Trevor orders from anywhere). Search the pilot and co-pilot (Use) for their notes.

**Trevor Hale.** One companion shared by everyone. Use on him (or the field radio) for orders.
Orders go into **one queue, first come first served**, and he tells you whose job he's on:

- **Follow**, **Hold here**, **Go there** (where you're looking), **Make camp** (his home base),
  **Chop wood**, **Quarry stone**, **Gather food**, **Build…** (lean-to, cabin, watchtower, a
  stretch of wall: he gathers what he needs first), **Light a fire**, **Collect** (empties his
  pack into the camp chest), **Patrol** the camp, **Patch me up**, **Cancel my orders**.
- He fights with his pistol, patches up anyone nearby who is badly hurt, warns you about what he
  hears, and won't follow you into the crater without a suit.
- Fire a **flare** and he comes to it as soon as his current job is done.
- He **goes down** instead of dying. Stand beside him for 3 seconds to get him up. If nobody
  comes, he limps back at the next dawn, unless **World rules → Varrow Island: Trevor's death is
  permanent** is on.

**Radiation.** Your dose builds near Ground Zero, far faster in the green crater water (which
also poisons you), in the sealed bunker labs, and deep under the crater. 100 mSv: hunger. 300:
nausea. 600: weakness. 1000: sickness. 1500: withering. Hold the Geiger counter to hear it; Use
it for a reading. **Iodine** halves uptake for five minutes; a **chelation shot** pulls a third of
your dose out; the **hazmat suit** (hood, suit, trousers, boots: 90% with all four, but heavy)
lets you work in the crater. Trevor has no suit, so he waits at the edge.

**Weapons.** Use to fire, **sneak + Use** to reload from rounds in your inventory. Every shot is
heard a long way off.

| Weapon | Where | Mag | Notes |
|---|---|---|---|
| Service pistol | your kit | 7 | 9mm; about 48 blocks |
| Bolt-action rifle | Bunker 1 armoury | 5 | hits hard to 90 blocks; slow |
| Pump shotgun | police post, mock town | 4 | seven pellets; deadly close, useless far |
| Flare gun | Bunker 1, the landing craft, sometimes the boathouse | 1 | lights the ground for 30 s; calls Trevor |

Rounds and shells are crafted from iron nuggets and gunpowder (plus copper or paper).

**The Children of the Second Sun.** Settlers who came in 1962 and never left. They live at
**Sunfall** (the walled village in the north-west) and a stilt camp in the **mangroves** (east).
The island's creatures never touch them.

- **Zealots** guard the villages with 1950s rifles and, from the second night, hunt the island
  after dark in twos and threes. They go back into the trees at dawn.
- **The Faithful** tend gardens and won't talk to anyone holding a weapon. Hold food when you
  speak to one to give it as a gift. Hurt one and the Zealots come.
- **The Seer** (sometimes at Sunfall) talks if you come unarmed: lore, a Hush Offering for a
  medkit, the bunker map for a battery bank, and, if they trust you, the back way into Bunker 2.
- **The Hierophant**, at the shrine. Neutral until attacked; then a boss with a boss bar who
  calls his guards. Kill him and every one of them hunts you, every night, for good.
- **Standing** (shared by the group): gifts, offerings left in the shrine barrel and quiet days
  raise it; killing them, and gunfire near their villages, lower it. At 20 the Faithful trade
  copper wire for medicine. At 40 the Seer shows you the back way. At 60 the Hierophant gives you
  the **shrine key**, which opens the vault under the shrine (he also drops it). At 70 they leave
  you alone on the last night.
- **World rules → Varrow Island: the Children of the Second Sun** turns them off.

**The survey** (the contract; Research Log → Operation SUNLAMP):

- **Six monitoring stations.** Press each station's console button with a Geiger counter in your
  pack to log the reading. The masts of unlogged stations flicker red; each log tells you the
  nearest one left.
- **Four samples.** Use a **sample kit** facing crater water, blast soil or scorched wood near
  Ground Zero, or facing one of the island's creatures (or carry one when you kill one). Use the
  sample to file it.
- **Ten film reels** from 1957 and 1962, in station log barrels, the bunker record rooms and the
  shrine vault. Use one to watch it.
- All six stations and four samples complete the survey (and the ending says so).

**Places.** The mock town (store with wire, police armoury), the animal pens, three bunkers
(iron doors: press the button beside them; Bunker 2 is sealed from the inside, so find the
sinkhole about a hundred blocks west of it), the bleachers in Blackwood, the dock and boathouse, the north peak relay.
Containers are stocked the first time someone comes near.

**The Heart Below.** Under the crater lake is a cavern, reached by the old instrument shaft on the
crater's north rim (iron trapdoor, long ladder). Its altar takes a Hush Offering (the Seer trades
one; the 1.1 recipe still works) and wakes the Heart. Kill it and the island's radiation from
below drops for good.

**The way off.** The 1957 relay on the north peak:

1. Fuel the **generator** in the shed (button by the hopper, 8 coal or charcoal).
2. Install **2 vacuum tubes** (Bunker 2's radio room; a spare in the shrine vault), **4 copper
   wire** (the store; craft from copper; the Faithful) and **1 battery bank** (the boathouse; a
   spare in Bunker 3) with the button in the hut.
3. **Transmit.** The Coast Guard answers: a helicopter at first light, at the old dock.
4. Survive the night. The lamp on the mast is lit and the Children come for it.
5. At dawn the helicopter sets down at the dock. Stand by it to leave. The ending reflects
   Trevor, the survey, the Heart and the Children. Afterwards you can stay and keep playing.

**The 1.1 creatures** are all still there and work as before.

## Test commands (operators)

`/scriptevent hollow:test …`

| Argument | Does |
|---|---|
| `island` / `forest` | switch this world into / out of Varrow Island mode (the island world switches itself on) |
| `islandkit` | Research Log, Geiger counter and pistol |
| `trevordown` | knock Trevor down to test helping him up |
| `cinematic` | replay the opening for yourself |
| `cultspawn` | a Zealot, one of the Faithful and the Seer next to you |
| `standing 40` | set the Children's standing (-100..100) |
| `rescue` | skip to the dawn helicopter (fills the tower and sends it in) |
| `dose 600` / `rad` | set / show your radiation dose |
| `on`, `night`, `day`, … | the 1.1 test kit still works |

`/scriptevent hollow:status` also prints the story, Trevor, jobs, cult, survey and tower state.

## Honest status

- The scripts pass every headless simulation (see `docs/SIMULATION_REPORT.generated.md`),
  including the island, the cinematic, Trevor and his jobs, the Children, the survey and the
  tower through to the ending. Static validation: 0 errors, 0 warnings. The world file is decoded
  back with an independent reader on every build.
- **None of 2.0 has been played in Minecraft yet.** The simulations run the real scripts against
  a fake game; they can't check pathfinding, combat, how anything looks or sounds, camera moves,
  or Xbox performance. The world file is written from scratch in Mojang's format; your first
  import is the real test. If something breaks, tell me what you saw and I'll fix it.
- Things most likely to need tuning after a first play: Trevor's pathing on long jobs, how hard
  the Zealots and the Hierophant hit, night patrol frequency, radiation rates, and the
  cinematic's camera framing.
