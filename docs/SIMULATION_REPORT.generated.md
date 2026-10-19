# Headless simulation report (generated)

The real bundled behavior-pack scripts run against a fake Minecraft API (`tools/simtest`).
This checks script logic: scheduling, events, persistence, reloads, state machines, caps, cooldowns and rewards.
It is **not** an in-game test: there is no engine pathfinding, melee, physics, rendering or audio.

Result: **26/26 scenarios passed**

| Scenario | Result |
|---|---|
| first join gives a kept, locked journal and starter entries | pass |
| journal UI opens chapters and entries with a controller-style selection | pass |
| settings: non-operators cannot see world rules; values are sanitised | pass |
| day 1 is safe: nothing hunts; the Watcher can only be glimpsed | pass |
| newcomers, creative and peaceful players are never targeted | pass |
| watcher appears out of view, 34-50 blocks away | pass |
| watcher: staring makes it withdraw and leave one Pale Resin (once per night) | pass |
| watcher: stalks when unwatched; twig warning; lunges only at an unlit player | pass |
| leaving mid-encounter removes the encounter; rejoining duplicates nothing | pass |
| boss: full fight - shield, veins, phases, minions, rewards once, altar rests | pass |
| boss: scales with players in the arena; every participant rewarded once | pass |
| boss: a server restart during the rise still raises exactly one heart | pass |
| boss: a restart mid-fight resumes it; leftovers from old fights are removed | pass |
| boss: dormancy waits for the arena to load, then returns the Offering once | pass |
| boss: a heart that vanishes without dying returns the Offering | pass |
| knocker: never before night 4; one visit; knocks; leaves exactly one nail | pass |
| knocker: a ward by the door turns it away (one charge, no nail); opening the door lets it in | pass |
| ward: 4 charges, one per creature per night, charcoal recharges, salvage when used | pass |
| chime rings when a creature is within 14 blocks, never when silenced | pass |
| mirebound: shallow water only; clues; 0.6 s windup; sneak frees; max 5 s hold | pass |
| mirebound: grab holds at most 5 s; sneak/dismount frees; forced-riding fallback bites | pass |
| hollowed: spawns out of sight in the dark; hears sprinting, not sneaking or wool | pass |
| hollowed: thrown projectiles create a decoy away from the player | pass |
| sites: a disabled creature's material is guaranteed in new site chests | pass |
| items: material pickup teaches its recipe; lens reveals to its user only and wears | pass |
| load: 8 players, all creatures, Nightmare 200% for a full day - caps hold | pass |

- load: peak creature counts {"hollow:borrowed":2,"hollow:watcher":3}; script time per tick avg 0.050 ms, p99 0.759 ms, max 3.02 ms (Node on a dev machine against the fake world - not an Xbox measurement)
