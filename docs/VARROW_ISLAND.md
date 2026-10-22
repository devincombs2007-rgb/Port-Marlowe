# Varrow Island (2.0, phase 1 of 6)

THE HOLLOW 2.0 moves the story to **Varrow Island**, a 1957 nuclear test site in the Pacific.
You and your friends are a 2026 survey team; someone on the island shoots your helicopter down.
The full plan (story, cinematic, Trevor's jobs, the cult, the survey, the tower, Ground Zero) is
in the 2.0 design doc. This page covers what is **in this build**.

## Files

| File | What it is |
|---|---|
| `dist/THE_HOLLOW_Varrow_Island_v2.0.0.mcworld` | **The island.** A prebuilt world with all three packs embedded. Open it to import, then play it like any world. |
| `dist/THE_HOLLOW_v2.0.0.mcaddon` | The same packs for other worlds. In any world that is not Varrow Island the add-on keeps the original forest story. |

Import the `.mcworld` the same way you imported the `.mcaddon`. Turn on **Vibrant Visuals** in
Video settings for the green crater, the mist and the soft shadows.

## What is in phase 1

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

**The crash.** Each player wakes once: black screen, ringing ears, the title card, Trevor talking
you round. You get your **Research Log**, a **Geiger counter** and a **loaded service pistol**.
Players who join later get a shorter version and their own kit. The barrels by the wreck hold
rations, medkits, 9mm rounds, iodine tablets, a survival hatchet and the cracked satellite radio.
The pilot and co-pilot lie where they fell; search them (Use) for their notes and supplies.

**Trevor Hale.** One companion shared by everyone:

- Use on him: **Follow me**, **Hold here**, **Patch me up** (one of his medkits). Anyone can give
  orders; the newest order wins and he says whose order he is on.
- He fights with his pistol, patches up anyone nearby who is badly hurt, warns you about the
  clicking in the dark and the thing in the trees, and refuses to follow you into the crater
  without a suit (he waits at the edge and picks up again when you come out).
- He **goes down** instead of dying. Go to him, press Use and stay beside him for 3 seconds. You
  have a minute. If nobody comes, he crawls off and limps back at the next dawn, unless an
  operator turned on **World rules → Varrow Island: Trevor's death is permanent**.
- Chopping, gathering and building are listed in his menu as "coming with the next update".

**Radiation.** Your dose builds near Ground Zero (about 60 mSv a minute on the crater floor),
far faster in the green water, which also poisons you. Rock overhead blocks most of it. It falls
slowly once you are clear. 100 mSv: hunger. 300: nausea. 600: weakness. 1000: sickness. 1500:
withering. Hold the Geiger counter to hear it and see a live readout; Use it for a reading with
the direction the rate climbs. Iodine tablets halve your uptake for five minutes. Your dose is on
the Research Log's Field Conditions page.

**The pistol.** Aim and Use to fire (instant hit, about 48 blocks, harder to the head). Seven
rounds; **sneak + Use** reloads from 9mm rounds in your inventory. Every shot is heard 48 blocks
away, and the Hollowed hunt by sound.

**The 1.1 creatures** are all still there and work as before.

## Test commands (operators)

`/scriptevent hollow:test …`

| Argument | Does |
|---|---|
| `island` / `forest` | switch this world into / out of Varrow Island mode (the island world switches itself on) |
| `islandkit` | Research Log, Geiger counter and pistol |
| `trevordown` | knock Trevor down to test helping him up |
| `dose 600` / `rad` | set / show your radiation dose |
| `on`, `night`, `day`, … | the 1.1 test kit still works |

`/scriptevent hollow:status` now also prints the story and Trevor state.

## Honest status

- The scripts pass **105/105** headless simulations, 12 of them new for the island (detection,
  wake-up, late joiners, restarts, radiation bands and iodine, the pistol, Trevor going down,
  limping back, permanent death, shared orders, the crater refusal, searching the crew).
- Static validation: 0 errors, 0 warnings. Every block in the world is a canonical Bedrock block
  state, and the world file is decoded back with an independent reader on every build.
- **Nobody has opened the world in Minecraft yet.** The world file is written from scratch in
  Mojang's storage format; your first import is the real test. If it fails to open, tell me what
  the game shows and I will switch to the fallback (the add-on builds the island itself in a new
  world).
- Things only the game can confirm: Trevor's taming and follow behaviour, his ranged attack,
  the helicopter's look in-game, how dark nights are, and Xbox performance on a 600-block island.

## Next phases

2. The 1957 cinematic and the shoot-down. 3. Trevor's jobs (shared queue, chopping, gathering,
building). 4. The Children of the Second Sun. 5. The survey, the tower and the rescue.
6. Ground Zero, the hazmat suit, the rifle and shotgun, the endings.
