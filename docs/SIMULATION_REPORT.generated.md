# Headless simulation report (generated)

The real bundled behavior-pack scripts run against a fake Minecraft API (`tools/simtest`).
This checks script logic: scheduling, events, persistence, reloads, state machines, caps, cooldowns and rewards.
It is **not** an in-game test: there is no engine pathfinding, melee, physics, rendering or audio.

Result: **78/78 scenarios passed**

| Scenario | Result |
|---|---|
| first join gives a kept, locked journal and starter entries | pass |
| journal UI opens chapters and entries with a controller-style selection | pass |
| settings: non-operators cannot see world rules; values are sanitised | pass |
| journal: repeated taps share one session; a closed form can reopen | pass |
| journal: disconnected session cannot navigate or unlock a new session | pass |
| journal: form rejection cancels cleanly and allows a later attempt | pass |
| journal: busy menus retry through comfort settings; closing never retries | pass |
| journal: entries stay unread when their form cannot be shown | pass |
| settings: malformed saved values recover defaults without enabling destructive options | pass |
| settings: opening and saving world rules preserves supported grace and night ranges | pass |
| field: newcomers get a useful first goal without undiscovered creature spoilers | pass |
| field: reports charged equipment, carried light, shelter and quiet movement | pass |
| field: refresh reads the new location and Back returns to the journal | pass |
| field: suggested recipe opens only a discovered equipment entry | pass |
| field: explains Peaceful, configured grace and recovery without changing rules | pass |
| field: completed progression offers the known lantern recipe and ignores inactive overflow wards | pass |
| journal: malformed discovery data cannot inflate counts or mark locked entries read | pass |
| journal: simultaneous discoveries produce one summary and one cue | pass |
| journal: death cancels pending discovery popups but preserves discovered pages | pass |
| day 1 is safe: nothing hunts; the Watcher can only be glimpsed | pass |
| newcomers, creative and peaceful players are never targeted | pass |
| watcher appears out of view, 34-50 blocks away | pass |
| watcher: staring makes it withdraw and leave one Pale Resin (once per night) | pass |
| watcher: stalks when unwatched; twig warning; lunges only at an unlit player | pass |
| leaving mid-encounter removes the encounter; rejoining duplicates nothing | pass |
| boss: full fight - shield, veins, phases, minions, rewards once, altar rests | pass |
| boss: scales with players in the arena; every participant rewarded once | pass |
| boss: a full inventory drops the Stilled Heart once and preserves completion | pass |
| boss: a server restart during the rise still raises exactly one heart | pass |
| boss: a restart mid-fight resumes it; leftovers from old fights are removed | pass |
| boss: dormancy waits for the arena to load, then returns the Offering once | pass |
| boss: a heart that vanishes without dying returns the Offering | pass |
| knocker: never before night 4; one visit; knocks; leaves exactly one nail | pass |
| knocker: a ward by the door turns it away (one charge, no nail); opening the door lets it in | pass |
| ward: 4 charges, one per creature per night, charcoal recharges, salvage when used | pass |
| ward: a failed block update keeps charcoal and the previous charge count | pass |
| ward: overflow stays inactive without consuming charcoal and can reclaim a freed slot | pass |
| chime rings when a creature is within 14 blocks, never when silenced | pass |
| borrowed: joins a real flock and shears reveal it at night | pass |
| ward: unloading its chunk cannot erase protection or the saved registry | pass |
| ward: same creature type spends one charge per night across a server restart | pass |
| equipment: stale loaded lantern registrations release capacity; unloaded ones keep it | pass |
| mirebound: shallow water only; clues; 0.6 s windup; sneak frees; max 5 s hold | pass |
| mirebound: grab holds at most 5 s; sneak/dismount frees; forced-riding fallback bites | pass |
| hollowed: spawns out of sight in the dark; hears sprinting, not sneaking or wool | pass |
| hollowed: reading movement noise in the journal cannot swallow a landing sound | pass |
| hollowed: thrown projectiles create a decoy away from the player | pass |
| lantern: protects a cave player from new Hollowed encounters, including after reload | pass |
| lantern: unloaded chunk preserves its registry; noise inside its radius draws no Hollowed | pass |
| sites: a disabled creature's material is guaranteed in new site chests | pass |
| items: material pickup teaches its recipe; lens reveals to its user only and wears | pass |
| items: queued page/lens uses cannot bypass consumption by switching hotbar slots | pass |
| items: lens reveals clear immediately on death and dimension travel, without clearing another player's view | pass |
| items: queued uses cannot unlock lore or create a shrine after death or dimension travel | pass |
| items: leaving invalidates a queued use even after a fast rejoin | pass |
| items: reward helper drops items when the inventory component is unavailable | pass |
| items: Heartseeker replaces its marker and clears it on death or dimension travel | pass |
| music: shrine and boss tracks loop in place; off switch; silence while hunted; one track per night | pass |
| music: night tracks are rare (at most one per night) and fall silent while something hunts you | pass |
| tracks: the Knocker leaves bare-foot prints to the door that fade after a day; nothing is replaced | pass |
| tracks: a world-wide cap of 96 prints holds under a long walk | pass |
| tracks: watcher prints where it stood; journal entry on discovery | pass |
| sites: watchtower and lean-to place with signs and filled chests; cabin variants | pass |
| events: Every Eye turns the herd to face you, harmlessly, at most once per world | pass |
| events: The Lantern goes out as you arrive, leaves its page, and survives a restart | pass |
| events: footsteps cross the roof of your shelter; nothing comes in | pass |
| events: disconnect releases Every Eye; old callbacks cannot cancel a new event | pass |
| events: death, dimension changes and leaving the area stop herd control | pass |
| events: animals moved to another dimension are no longer controlled | pass |
| events: roof footsteps stay at the original shelter when the player moves | pass |
| events: roof callbacks never read a disconnected player's position | pass |
| events: an unloaded lantern waits for its chunk and rewards once after reload | pass |
| events: failed lantern item spawn retries without losing or duplicating its page | pass |
| events: a replacement block at the lantern scene is preserved without a reward | pass |
| test kit: operator-only; test mode removes waiting; never persists; boss/knocker shortcuts | pass |
| test kit: kit, journal, boss2/boss3 and knocker shortcuts work | pass |
| grace: extended grace days apply to Borrowed, Mirebound and Knocker, not just the Watcher | pass |
| load: 8 players, all creatures, Nightmare 200% for a full day - caps hold | pass |

- music: 1 night track(s) over 4 nights; 0 ticks of night music while a Watcher was stalking
- load: peak creature counts {"hollow:borrowed":2,"hollow:watcher":3}; script time per tick avg 0.036 ms, p99 0.459 ms, max 2.17 ms (Node on a dev machine against the fake world - not an Xbox measurement)
