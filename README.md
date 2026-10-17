# Port Marlowe

A Fabric horror mod for Minecraft **1.21.4** (Mojang mappings).

## Mobs
| Mob | Behaviour |
|---|---|
| **Lurker** | Fast, hits for 7. Freezes solid whenever any player is looking at it. |
| **Gaunt** | Tall and slow. Blinks behind its victim when they aren't looking; a heartbeat sounds. Hits inflict Darkness. |
| **Tollwraith** | Spawns on beaches, rivers and swamps. Tolls a bell every ~11 s, giving Slowness + Darkness to players within 24 blocks. |

All three spawn in darkness only, don't burn in daylight, and have spawn eggs in the creative tab.

## Shader
One post-process shader, **Dread** (`assets/portmarlowe/shaders/post/dread.fsh`): desaturation, cold tint,
heartbeat-pulsing vignette, chromatic aberration, edge crawl and film grain. Applied automatically in-world;
press **J** to toggle.

## Build
```
gradle build        # jar in build/libs
gradle runClient
```
