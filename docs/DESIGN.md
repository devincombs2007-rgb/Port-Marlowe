# DREAD design notes (implemented systems)

## Horror Director (`src/director/`, pure logic + `src/game/director.ts` adapter)
One brain per player. A six-state machine, stepped about once a second:

| State | What happens | Leaves when |
|---|---|---|
| **Dormant** | The world is ordinary. | A randomised rest (about 2-7 min, shortened by stress) ends and a stress-weighted roll succeeds. Never ends while the player is at a lit home. |
| **Unease** | Ambient anomalies: branch snaps behind you, rustling, far doors, groans, drags, murmurs, distant cries, footsteps. | Dark + stressed + (nearly) alone + hostile encounters allowed -> Observation; otherwise quietly recovers. |
| **Observation** | A Lurker appears far away and watches. Noticed -> it vanishes and may reposition (max 3). | Noticed twice, or noticed once while stressed -> Escalation; ignored too long -> sometimes Escalation, else Recovery. |
| **Escalation** | The Lurker stalks. Close cues: breath behind you, creaks, steps, scrapes, heartbeat. Dread builds. | **Dread >= 45** + stress >= 35 + hunt allowed -> Hunt. Light or shelter -> Recovery. |
| **Hunt** | A real chase. | Light held 5 s, three hits landed, Lurker injured (<40%), player under 3 hearts, 70 s timeout, distance, or group nearby. |
| **Recovery** | Quiet. Only rare, gentle anomalies. | 4-15 min (longer after a hunt or a death). |

**Stress** is contextual (darkness, being underground, isolation, injury, recent damage vs. light, company, daylight, shelter).
It never reads elapsed play time. **Dread** is encounter-driven build-up that decays with a ~3 min half-life.
Event choice is a weighted pick with per-event cooldowns and a repetition penalty. The Intensity setting scales pace.

### Hard fairness rules (`blockedReason`, tested)
No hostile encounter when: disabled, creative/spectator, non-overworld, peaceful difficulty, asleep, within 3 min of respawn.
No hunt when additionally: within 20 min of a death, within 25 min of the last hunt, health under 5 hearts, near light or
a bed/campfire, in water, or with 2+ other players nearby. After a death the director enters a long recovery and clears Lurkers.
A hunt can never stack with another, and global Lurker count is capped (3, and fewer for small servers via the adapter).

### Persistence
Per-player `Memory` (state, history of the last 40 events, hunts, noticed count, stress, dread, last death/hunt) is stored as a
JSON world dynamic property `dread:mem:<playerId>`, flushed every 30 s and on leaving. Corrupt or foreign data resets safely.
After a reload any active encounter state settles to Recovery.

## The Lurker (`src/lurker/tactics.ts`, `src/game/lurkers.ts`, packs/*/entity)
A hunched, too-tall watcher (2.9 blocks, bark crown, thorned spine, stilted digitigrade legs, knee-length arms, hollow face
with one cold pin-light per socket). Behaviour is a script-driven tactical machine over entity component groups:

* **observe** stands 26-42 blocks away, faces you. Gaze for ~1-2 s, or approach within 13 blocks: it freezes, stares
  back, and vanishes (smoke + sound). If never seen it repositions up to 3 times then leaves.
* **stalk** closes to ~9 blocks while unseen; watched for 0.7 s -> it stops, stares, retreats. Ignored and within 7 blocks
  for 4 s -> a single close breath behind you, then it retreats.
* **hunt** 0.34 speed melee, 4 damage, 1.4 s cooldown, cannot be stopped by walls it cannot path through.
* Always has an exit: a 7-minute lifetime cap overrides everything; orphans are adopted or removed.

### Counterplay (all implemented)
* **Light**: holding a torch/lantern or standing within 4 blocks of a light source, bed or campfire pushes any Lurker back
  (1.5 s while observing/stalking, 5 s during a hunt).
* **Look at it**: observers and stalkers give up when watched.
* **Fight back**: below 40% health it flees; it leaves after 3 hits on you.
* **Shelter**: beds and campfires count as safe places for the director.

## What Bedrock cannot do (and what stands in for it)
* No custom post-process shaders: the Java "Dread" shader is **not** ported. Mood comes from sound, particles, fog/darkness
  effects and the Lurker itself. Vibrant Visuals (deferred) JSON and a non-Vibrant fallback are still to do.
* Emissive eyes would need a different material (`entity_emissive_alpha`); not used yet because it cannot be verified here.
* The stable API has no pathfinding-to-position call, so movement uses component groups (`move_towards_target`, `melee_attack`,
  `avoid_mob_type`) switched by script events.
