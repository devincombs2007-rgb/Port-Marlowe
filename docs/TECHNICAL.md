# Technical notes

## 1. Verified targets

Versions were checked on 2026-10-19 against primary sources: Mojang's `bedrock-samples` release tag, the
official Minecraft Creator docs (the MicrosoftDocs/minecraft-creator GitHub source), and npm.

| Item | Pinned | Notes |
|---|---|---|
| Minecraft Bedrock | **26.50** (`1.26.50`), `min_engine_version` [1,26,50] | `bedrock-samples` tag `v1.26.50.4` (Mojang's sample and metadata release for 26.50). 26.52 is the current hotfix. |
| `@minecraft/server` | **2.10.0** | Stable (no `-beta`). Present in `metadata/script_modules` for 1.26.50. |
| `@minecraft/server-ui` | **2.2.0** | Stable. Present in `metadata/script_modules` for 1.26.50. |
| `@minecraft/vanilla-data` | 1.26.52 | Typings only, never shipped or imported at runtime. |
| Manifest | `format_version` 2 | BP depends on the RP by UUID and version. Both RPs declare the `pbr` capability. |
| Entity (BP) | `1.26.50` | Validated against `json_schemas/server/entity/1.26.50`. |
| Item | `1.26.30` | Custom components V2 (component keys directly in `components`). |
| Block | `1.26.20` | Custom states are int ranges (`{"values":{"min":0,"max":4}}`). Bool arrays aren't valid in this format. |
| Recipes | `1.20.10` | Shaped and shapeless, `crafting_table` tag, `unlock` conditions. |
| Client entity | `1.10.0`; geometry `1.16.0`; animations `1.8.0`; controllers `1.10.0`; render controllers `1.8.0` | |
| Particles | `1.10.0` | Validated against `json_schemas/client/particles/1.21.10`. |
| Texture sets | `1.21.30` | MERS (RGBA: metalness, emissive, roughness, subsurface) + heightmap. |
| Fog | `1.21.90` | Distance fog + volumetric density, media coefficients, Henyey–Greenstein. |
| Lighting | `1.26.0` | Sun and moon, keyframed ambient and sky intensity, emissive desaturation. |
| Atmospherics | `1.21.40` | Keyframed sky zenith and horizon colours, Rayleigh/Mie, moon Mie. |
| Color grading | `1.21.90` | Generic tone mapping across every look. Only one operator may be used in a pack set. |
| Water | `1.26.0` | Per-look particle concentrations, biome-colour contribution, bounded ripples and caustics. |
| Local lighting | `1.21.120` | Point and static light colours for torch, lantern, campfire and HOLLOW blocks. |
| Client biome | Inherited vanilla versions through `1.26.0` | Validated against `json_schemas/client/biome/1.21.130`. |
| Structures | `.mcstructure` (LE NBT), block palette version `1.26.50.4` | Every palette entry is validated against `mojang-blocks.json` 1.26.50. |

**Not used:** beta APIs, experimental toggles, Preview-only features, Molang features gated behind experiments,
Java shaders, renderer injection, RTX.

## 2. Architecture

```
scripts_src/main.ts           wiring: startup registration, worldLoad init, player/entity events, script events
 core/                        shared services
   scheduler.ts               every(), everyPlayer() (staggered), later(), safe() (per-label failure isolation)
   config.ts                  world rules (operators) + per-player prefs, sanitised, cached, persisted
   players.ts                 per-player runtime, cooldowns, huntable(), newcomer and respawn grace
   world.ts                   bounded world queries (block raycasts, small-volume searches via BlockVolume filters)
   audio.ts, fx.ts            cue gating (min gaps), fog stack, soft fades, hints
 systems/
   director.ts                one evaluation per player per 5 s → creature starters in priority order
   noise.ts                   Hollowed hearing (event-driven + movement polling only near Hollowed)
   ambience.ts                context ambience (forest, cave, swamp) and the rare bedtime knock
   sites.ts                   lazy cabin and campsite placement, shrine on demand, discovery, validation
   journal.ts, settings_ui.ts controller-friendly forms (ActionFormData / ModalFormData)
   cleanup.ts                 orphan removal on entityLoad + one sweep after init
 creatures/*.ts               one module per creature: spawn rules, script state machine, events, cleanup
 items/                       custom item and block components (journal, lens, heartseeker, chime, ward, altar, lantern)
```

**State machines run in script; movement runs in the engine.**
- Each creature's high-level state lives in a script `Map` keyed by entity id and is mirrored to the entity with
  `triggerEvent` (component groups) and entity properties (for animation and render controllers).
- Movement, pathfinding, targeting and melee are vanilla behavior components: `move_to_block`,
  `move_towards_target`, `nearest_attackable_target`, `melee_attack`, `avoid_mob_type`, `leap_at_target`, `break_door`.
- Script never moves a creature by teleporting it.

## 3. Performance budget

There are no per-tick full scans. Everything that recurs is listed here.

| Job | Period | Work per run | Bound |
|---|---|---|---|
| director | 100 ticks **per player**, staggered | context probe + creature starters | 1 player per tick |
| ambience | 120 ticks per player, staggered | chance roll, maybe 1 sound | 1 player per tick |
| bedtime | 40 ticks per player | sleeping check | trivial |
| sites.place | 1200 ticks per player | 30% roll → ≤4 candidate checks (`containsBlock` on footprint volumes) | rare |
| sites.discover | 100 ticks per player | distance to ≤31 site records | ≤31 |
| sites.validate | 6000 ticks | small-radius block search per **loaded** site | ≤31 sites |
| watcher.update | 4 ticks | per active encounter: 1–2 raycasts per nearby player | ≤3 encounters |
| borrowed.update | 10 ticks | per active Borrowed | ≤2 |
| hollowed.update | 20 ticks | per active Hollowed and lure | ≤6 + lures |
| hollowed.steps | 10 ticks per player | movement noise, **only for players near a Hollowed** | |
| mirebound.update | 2 ticks | per active Mirebound (fast for the grab window) | ≤3 |
| knocker.update | 10 ticks | the single visit; the door search runs only every 5 s, and only on a planned night | ≤1 |
| heart.update | 5 ticks | only while the boss is active | 1 fight |
| chimes | 40 ticks | registry of positions (no world scan), `getEntities` within 14 blocks of each loaded chime | ≤32 chimes |

- **World scans:** none. Sites are found from stored records; chimes, wards and lanterns from capped registries in world
  dynamic properties.
- **Block queries are always small and bounded:**
  - creature context probes are ≤ 21×9×21 (e.g. door search around one player);
  - site placement checks are the site footprint plus a 4-block margin (largest: the shrine, 27×15×27, once per Heartseeker
    attempt);
  - everything else uses single-block raycasts.
- **Entity counts:** Watcher ≤3, Borrowed ≤2, Hollowed ≤6 (≤2–3 per player), Mirebound ≤3, Knocker ≤1, boss
  1 + ≤4 veins + ≤5 minions, plus short-lived lures and root spikes.
- **No frame-rate claims.** Nothing has been measured on a device. The budget above is a design bound, not a measurement.

## 4. Multiplayer, persistence and lifecycle

| Event | Handling |
|---|---|
| **Join** (first time) | Journal given (`keepOnDeath`, `lockMode: inventory`). Intro, shelter, chime and ward entries unlocked. Newcomer grace starts (10 min of play). |
| **Leave** | Per-player runtime, cooldown, prefs, journal and noise caches are forgotten. Watcher, Borrowed, Mirebound and Knocker encounters targeting the player end, and their entities are removed. A Hollowed with nobody within 64 blocks is removed after 30 s. |
| **Death** | Encounters targeting the player end. 60 s of respawn mercy. The journal is kept, and re-given if missing. |
| **Dimension change** | Encounters end and encounter fog is cleared. Creatures don't follow. |
| **World reload** | Script state is rebuilt from dynamic properties. Any `hollow:` encounter entity without a live encounter is removed on load (`cleanup.ts`). The boss resumes from its saved state: its entities carry the fight's token and are re-bound by token, a restart during the rise re-runs the rise, and hearts or veins from other fights are removed. |
| **Persistence** | World: settings, start day, sites, chime/ward/lantern registries, boss, Knocker plan. Player: journal unlocks and read flags, prefs, play time, daily counters. All stored as small JSON dynamic properties. |
| **Duplication** | A player has at most one major encounter. The Knocker plans **one visit per night for the world**. Site records are spaced apart (cabins 320, camps 256, other site types 96 blocks) and capped (8 cabins, 10 camps, 1 shrine). |
| **Reward exploits** | Pale Resin from staring: once per encounter, max 1 per player per night (2 on Nightmare). Boss rewards: once per participant per kill, then the altar rests 3 days. The ward can't be refilled by breaking and re-placing it (a used ward breaks into salvage). Dormancy returns the Offering instead of consuming it. |
| **Operators** | World rules need `PlayerPermissionLevel.Operator` (the Realm owner and promoted operators). Debug script events are operator-only. |

## 5. Sites in new and existing worlds

There is no world generation and no terrain scanning. Sites are placed with `world.structureManager.place`
from `.mcstructure` files in the behavior pack:

- **Cabins** (forest) and **campsites** (open ground or forest edge) are offered every 60 s per player.
  - A 30% roll, and only on the surface.
  - At least 96 blocks from world spawn.
  - Placed 56–80 blocks away, **behind** the player.
  - At least 64 blocks from their bed or spawn point.
- **Every placement is checked first:**
  - All corner chunks are loaded.
  - The ground is flat within 2 blocks at five probes, with no liquid under it.
  - **No player-built blocks** (planks, glass, doors, beds, chests, crafting blocks…) within 4 blocks of the footprint.
  - No tree trunks or water or lava inside the footprint.
- The structures have structure voids, so only their own blocks are written. Cabins and camps sink 1 block for a foundation.
- **The shrine** is created only when a player first uses a Heartseeker: 32–48 blocks away, deep underground, never touching
  water, lava or built blocks. It carves a 25×13×25 chamber, which is the largest terrain change the add-on makes, and it
  only happens by player choice.
- Operators can turn all sites off. Placed sites are ordinary blocks; nothing is ever removed or regenerated.

## 5a. Journal and player lifecycle (1.0.4)

`systems/field_notes.ts` computes the Field Conditions form only on open/refresh, using the
existing bounded environment and registered-equipment queries plus one inventory pass. It does
not query creature entities. The form shares the journal's session token and busy-retry logic.
Recipe suggestions require an unlocked entry; refreshing never changes settings or discoveries.
Noise descriptions use a read-only copy of movement state, preserving real landing detection.

Discovery notifications share one delayed summary per player. Lifecycle cleanup cancels the
summary, queued-use tokens, lens timers/overrides and locator markers. Environment cache reuse
requires the same dimension, less than eight blocks of displacement and unchanged water state.
Gameplay regression coverage now contains 88 scenarios; Minecraft rendering/UI/physics checks
remain separate.

## 6. Visuals

**Resource pack (always on, every graphics mode):**
- Creatures and blocks ship PBR **texture sets**: MERS and heightmap. They are used under Vibrant Visuals and ignored by
  standard graphics.
- The **glowing eyes** use a second render controller with an unlit eye texture (`entity_alphatest` with
  `ignore_lighting`), so they read in standard graphics too.
  - Night-only variants gate on `query.time_of_day`.
- Encounter fog (`hollow:watched`, `hollow:heart`, `hollow:mire`) is pushed per player through `player.fogSettings`
  and can be disabled per player.

**Visuals pack (optional, Vibrant Visuals):**
- Seven looks: wild, cold, swamp, cave, canopy, arid and coast. All 83 Overworld definitions
  in the pinned reference are overridden through client-biome identifiers. Nether/End biome
  definitions and non-look components (music, foliage, grass, ambient sounds) stay intact.
- Steel/olive shadows and muted saturation 0.78–0.84; sunlight 62–70 lux, moon 0.13–0.17 lux;
  ambient night floor 0.010–0.011, standard gamma 2.2, zero grading offsets and shared `generic`
  tone mapper. All authored daily curves have matching start/end values.
- Reduced sun glare, moon haze and lowland volumetric density. Region-specific distance fog
  ends at render distance in clear air; underwater distance/volume settings are inherited.
- Slightly stained water, two-octave ripples (four at coasts), cold/cave waves off. Caustics off
  in swamp/canopy/cave; minimum integer power 1 with slower animation elsewhere. Water format
  1.26.0 supports biome-colour contribution. No frame-rate/performance benefit is claimed.
- See `VISUAL_TUNING.md` for art direction and device review; `VISUAL_REPORT.generated.md` lists
  the current numeric inputs. `tools/visuals/verify_visuals.py` runs as part of every build.
- **Local lights:** torch #FFB46B, lantern #E8873A, campfire #FF9A4A, Heartwood Lantern #FF6A3D, Rowan Ward #FF8A3A.
- **Safety:** the add-on never shakes the camera, never flashes, and never forces darkness or blindness.
  - Fades are short, soft, and can be switched off.

**Minecraft controls (not the add-on):** Graphics Mode (Vibrant Visuals / Fancy / Simple), render distance, brightness,
FOV, the camera shake toggle, and the per-category audio sliders.

## 7. Audio

- **77 sound events**, with 150 packaged OGG files and 11 references to vanilla sheep files.
  The current `tools/sounds/sourced.py` pipeline processes credited CC0 recordings (Kenney,
  Abstraction/Ben Burnes, rubberduck and the music creators in CREDITS.md). The earlier
  all-synthesis `design.py` catalogue is retained for event calibration and reference.
- Positional SFX are mono; music uses its own client playback policy and Minecraft's Music slider.
- `python3 tools/sounds/audition_page.py --standalone` creates a portable, embedded-MP3 Sound Booth
  at `build/audition/THE_HOLLOW_Sound_Booth.html`. It needs no Claude session or server. Reviews
  save in browser storage when available and can be exported as JSON for the next tuning pass.
- **Mixing rules in script:**
  - ambient cues have a ≥9 s global gap per player plus per-cue gaps;
  - encounter accents have a ≥45 s gap;
  - world sounds play at the source position;
  - shrine/boss music loops only while the player remains in the relevant area.
- **Settings:** ambience volume and encounter accents are separate per-player settings. Minecraft's own category sliders
  (Hostile Creatures, Ambient/Environment, Blocks…) apply on top.
- **Honest limitation:** I can't listen to audio. Every sound was checked by spectrogram, peak and RMS level, duration and
  clipping, not by ear. Treat them as a solid, original first pass. They are **not** professionally mastered sound design,
  and some may need tuning after a listening test (see the validation report).

## 8. Testing tiers

1. **Static validation** (`tools/validate.py`): schemas, metadata and cross-references; checked by a mutation
   self-test (`tools/selftest_validator.py`).
2. **Headless simulation** (`tools/simtest/`): the real script bundle against a fake API that loads the real entity,
   block, item, loot and structure data. It covers logic, persistence and restarts. It runs on every build, and a
   failing scenario fails the build.
3. **In-game testing** (`docs/VALIDATION_REPORT.md` §3): engine behaviour, feel, audio, visuals and performance.
   **Not yet done.**

## 9. Build reproducibility

- `python3 tools/build.py --assets` regenerates every model, texture, sound, structure and visuals file from code.
  `python3 tools/build.py` regenerates content JSON, type-checks (`tsc --strict`), bundles the scripts (esbuild),
  validates and packages.
- Builds are byte-reproducible:
  - OGG encodes use ffmpeg `+bitexact`;
  - zip entries are sorted with fixed timestamps;
  - UUIDs are deterministic `uuid5` values in `tools/pack_uuids.json`.
- Scripts are bundled into one ES module (`packs/behavior/scripts/main.js`) because Bedrock's module loader doesn't resolve
  extensionless relative imports.

## Creature movement continuation (1.0.6)

Behavior entity and client-entity JSON remain hand-authored sources. Shared non-Watcher
animations/controllers are generated by `tools/packgen/animations.py`; Watcher animation JSON
remains hand-authored. Watcher patterns live in per-player runtime state and alternate only
on successful spawns. No new recurring update loops are added: Watcher stays at 4 ticks,
Borrowed at 10, and Hollowed at 20 ticks. Patient/watchful/listening pauses use state deadlines,
not per-creature repeating timers. Native movement goals still navigate terrain; no scripted
teleport movement is used. The preserved attack-time variable is documented in pinned Molang
metadata. See `MOVEMENT_TESTING.md` for engine checks and `DEVELOPMENT_STATUS.md` for feedback.
