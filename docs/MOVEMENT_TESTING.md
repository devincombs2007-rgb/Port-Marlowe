# Creature movement and encounter variations — 1.0.6

This pass follows the user's first playtest: Borrowed sheep impostor seen; Hollowed clicking
heard and praised; other creatures not yet reported. Device/version/world age were unspecified.
The requested focus is movement and variety. No storytelling, lore or audio files were changed.

## What to check in the game

Back up/close the world before importing THE_HOLLOW_v1.0.6.mcaddon. Confirm behavior and resource
packs 1.0.6 are active; existing worlds work. The 1.0.5 horror visuals are preserved. For rapid
checks, use a copied Survival test world with cheats and the existing operator test kit;
`/scriptevent hollow:test on` removes waiting from new encounters and resets on restart.
Spawn eggs remain static test props; let the actual encounter systems spawn creatures.

| Creature | New behavior | Check |
|---|---|---|
| Watcher | Alternating direct and patient pursuit | Compare two successful encounters in the same session. Patient pursuit creeps slower and pauses briefly at distances over 12 blocks. |
| Watcher | Forest-edge sightings | Stand in an open clearing next to wooded terrain after dusk. It must still appear on forest ground, at the old distance and light restrictions. Pure treeless plains should not produce it. |
| Watcher | Explicit stop and speed-blended gait | Look briefly at it: either stalk group should stop. A sustained 1.2-second stare should still make it withdraw and leave resin. Light/ward/grace rules remain. Check for foot sliding on turns and slopes. |
| Borrowed | Watchful pauses while disguised | Stand 8–15 blocks from its flock. It should occasionally stop for 2–4 seconds, tilt its head and resume wandering. It should stay harmless while disguised. |
| Borrowed | Non-attacking transformation | Shear it in a test world. It should remain stationary/non-attacking through at least the 1.4-second reveal. Afterwards it hunts at night or flees by day. Repeated shears should not skip the window. |
| Borrowed | Separate exposed scramble | Compare the disguised same-side pace to the revealed diagonal gait. Check feet, body dip, neck rotation and transitions in both graphics modes. |
| Hollowed | Investigate, arrive, listen | Throw a projectile away from yourself near a naturally spawned Hollowed. At the last noise it should pause and scan for 2–4 seconds. Another noise should redirect it. |
| Hollowed | Close-contact rule retained | In a safe copied test world, approach a listening Hollowed within 3 blocks. Sneaking is quiet but does not make close contact safe; pursuit should resume. |
| Boss juveniles | Combat behavior retained | Boss minions should not stop for the wild Hollowed's listening phase. |
| General | Bounded native turns / head movement | Check forest corners, stairs, cave obstacles and door approaches. No script teleporting or forced player movement was added. |

During a Borrowed transformation, test dawn, a nearby charged ward, player death and dimension
travel. Dawn/ward should cause retreat; target death/travel should cancel the unfinished encounter.
Check that no zero-speed movement group remains after a creature resumes walking or chasing.

The cave clicking files, entity sound mappings and pitch/volume settings are unchanged. Report
any audible change after the update, but no sound-polish pass is part of this release.

## Why the other creatures may be rare

- Watcher: dusk/night, wooded spawn terrain, no roof/water around the target, appropriate lighting.
- Mirebound: from the third default day, shallow water in swamps/mangroves, rivers or beaches.
- Knocker: the fourth default night onward, an occupied shelter and a usable door.
- The newcomer settling-in period, configured grace, difficulty and cooldowns still apply.

This update preserves spawn chances, caps and cooldowns. It varies encounters rather than
forcing every creature to spawn around the player.

## Verification and limits

88/88 headless scenarios cover actual script transitions, including 10 new cases for alternating
patterns, patient pauses, forest edges, transformation timing/cancellation, watchful sheep,
listening arrival/noise redirection/contact and boss-minion exclusion. Static validation resolves
all 35 animations, 13 controllers, bones, properties, events and entity schema references.
The build also checks the preserved 83-biome horror visuals and archive integrity.

Static Borrowed run poses were inspected using the repository's offline renderer. That is not
Minecraft animation playback. The simulation has no native pathfinding, movement physics,
melee execution, Molang playback or client rendering. Smoothness, grounded feet, turn quality,
terrain navigation, fairness under real latency and device performance require the game checks.

Authoritative references used for the implementation:

- [Animation controllers and cross-fades](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/animationsreference/examples/animationcontroller?view=minecraft-bedrock-stable)
- [Movement component](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/entityreference/examples/entitycomponents/minecraftcomponent_movement?view=minecraft-bedrock-stable)
- Pinned Mojang 1.26.50 JSON schemas and Molang metadata in the fetched reference.
