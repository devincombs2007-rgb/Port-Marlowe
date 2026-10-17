# Port Marlowe

A Fabric horror mod for Minecraft **1.21.4** (Mojang mappings), in the spirit of Bedrock horror add-ons:
stalkers, hallucinations, a sanity meter, jumpscares and cursed nights.

## Creatures
| Mob | Behaviour |
|---|---|
| **Lurker** | Fast, hits for 7. Freezes solid whenever any player is looking at it. |
| **Gaunt** | Tall and slow. Blinks behind its victim when they aren't looking; a heartbeat sounds. Hits inflict Darkness. |
| **Tollwraith** | Beaches, rivers, swamps. Tolls a bell every ~11 s: Slowness + Darkness within 24 blocks. |
| **Mimic** | Wears a villager's robes. Backs away while you watch it, sprints and strikes the moment you look away. |
| **Watcher** | Never attacks, can't be hurt. Stands at the edge of sight facing you. Stare or approach and it vanishes — and may jumpscare you. |

Everything but the Watcher spawns in darkness; none burn in daylight.

## Sanity
Each player has a sanity meter (0–100, bar shown top-left once it drops below 90). It drains in the dark,
near any creature, and on tolling nights; it recovers in light and when sleeping. Hits from creatures cost 8.
Low sanity brings **hallucinations**:
- < 60: phantom sounds behind you (creepers hissing, footsteps, doors, bells)
- < 40: wooden doors open by themselves, whispers in chat
- < 20: Darkness pulses, heartbeat, and the **Watcher** appears in the distance

The screen edges bleed dark red as sanity falls.

## Tolling Night
~25% of nights the harbour bell tolls: extra Lurkers/Mimics/Gaunts spawn around you and sanity drains outdoors.

## Items
- **Marlowe Bell** (bell + amethyst shard + soul torch): reveals, slows and de-aggros creatures within 16 blocks, +12 sanity. 20 s cooldown. Tollwraiths sometimes drop one.
- **Soothing Tonic** (glass bottle + fermented spider eye + glow berries): +40 sanity, but you're groggy.

## Shader
One post-process shader, **Dread** (`assets/portmarlowe/shaders/post/dread.fsh`): desaturation, cold tint,
heartbeat-pulsing vignette, chromatic aberration, edge crawl and film grain. Applied in-world; **J** toggles it.

## Commands (op)
`/dread sanity [0-100]`, `/dread tolling`, `/dread hallucinate`, `/dread watcher`, `/dread jumpscare`

## Build
```
gradle build        # jar in build/libs
gradle runClient
```
