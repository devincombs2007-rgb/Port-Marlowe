# THE HOLLOW development checkpoint — 1.1.0

## Latest: 1.1.0 — art, animation, visuals, icons, names and Dread (Claude)

- **Names** (display only; item IDs unchanged so existing worlds keep their items): Pale Resin →
  Weeping Sap, Borrowed Hide → False Fleece, Hollow Fang → Echo Fang, Knocker's Nail → Doorstep
  Nail, Hollow Lens → Seer's Glass, Hollow Chime → Telltale Chime, Offering of Silence → Hush Offering.
- **Creature art:** every creature repainted at 2x via an upgraded painter (`hollowkit/paint.py`):
  ray-cast baked ambient occlusion, worley cells (wool curls, crazed porcelain, scales), vein
  networks with their own PBR, bark fissures, grime in crevices, wet roughness, bevel wear.
  Watcher and Hollowed geometry rebuilt (mask with hinged jaw, chest hollow, antler crown,
  jointed fingers; long neck, ribs, sealed eye pits, needle teeth, three-part tail). The Borrowed
  gained flank ribs and an inner jaw; the Knocker a hood and nails; the Mirebound weed strands.
- **Animations:** `tools/packgen/animations.py` now generates all five creatures (the Watcher's
  former hand-written JSON included) with twitches, breathing, secondary motion, a patient
  "creep" gait, a 1.6 s Borrowed transformation that lengthens its legs, and additive attacks.
  `tools/hollowkit/molang.py` parses every expression during the build;
  `tools/packgen/anim_previews.py` renders contact sheets/GIFs of each clip on the real models.
- **Visuals:** explicit soft shadows, blood dusk, cold moonlight, split-tone grading, stronger
  volumetric scattering, more warm point lights (see VISUAL_TUNING.md).
- **Icons:** all 16 item sprites redrawn; 45 ink-on-parchment journal illustrations
  (`tools/art/journal_art.py`): creature portraits rendered from the models, places, chapters,
  menu buttons and pinned item specimens.
- **Dread:** `systems/dread.ts` + `core/fear.ts`. Fear meter, stages, heartbeat/breath audio,
  personal fog, private hallucinations (phantom entity with per-player visibility override,
  footsteps, whispers, false knocks), fear draws encounters (chance ×, cooldown ÷ up to 1.4),
  Hollowed hear a terrified heart, Hearth Tea item, journal entries, Field Conditions readout,
  comfort toggle and world rule, test-kit commands. Five new simulation scenarios.
- **Sounds:** `tools/sounds/dread.py` synthesizes 11 new files (heartbeat, breath, whisper,
  vanish, calm) and merges them into sound_definitions.json.

Verification: strict TypeScript, static validation 0/0, visual verification, 93/93 simulations.
Not verified in Minecraft: animation playback, texture appearance in VV, shadow style, sound mix.

## Latest: 2.0.0 — Varrow Island, phase 1 (the island and the crash)

- `tools/island/`: a from-scratch Bedrock world writer (LevelDB, SubChunk v9 with a waterlog layer,
  Data3D biomes, level.dat) with canonical block states, decoded back by an independent reader on
  every build; the island generator (lobed coastline, organic biome edges, ragged crater, caves,
  ores, trees, palms, mangroves, dead trees, ground cover, seagrass/kelp); the crash site
  (voxelised helicopter wreck, furrow, tail boom, blades, eternal fires, signal smoke, barrels).
  `python3 -m tools.island.build_island [--quick]`, previews with `tools.island.mapview/voxview`.
- Story start (`scripts_src/island/story.ts`), Trevor (`trevor.ts`, entity `hollow:trevor` with model,
  animations, pistol in hand only while aiming), radiation (`radiation.ts`), the pistol and gear
  (`guns.ts`), Research Log chapters, island journal entries, crew bodies, tracer bullets.
- New items, icons, journal art, sounds (pistol, distant shot, dry fire, reload, bullet hits,
  five Geiger rates, tinnitus, title hit, gasp). Toxic crater and scorched ring looks in Visuals.
- World rule: Trevor permanent death. Forest sites are not placed on the island.
- Verification: 0 validator errors, visuals verified, 105/105 simulations (12 new). Not yet run in
  Minecraft: the world import is the first real test. See docs/VARROW_ISLAND.md.

## 2.0 — island story (planned with the user)

The user wants the forest story replaced by an island story: a 1950s nuclear test site, present-day
government researchers, a helicopter crash start, AI companion Trevor (shared by all players,
FIFO order queue from any player, gathers/chops/builds/fights, non-permanent death by default with
a setting), basic guns, radiation research (Geiger, green radioactive crater water that poisons),
cinematic flashback (bomber, drop, airburst, white-out, mushroom cloud, delayed boom, fires),
delivered as a prebuilt world file.

## Previous checkpoint — 1.0.6

## Latest continuation: 1.0.6 — creature movement and encounter variations

User playtest feedback: the Borrowed sheep impostor is visible and the Hollowed cave clicking
sounds great. No other creatures were reported seen. The device, installed version and world
age were not specified. The user asked for movement and encounter variety, deferred storytelling,
and asked to keep the cave clicking sound. No lore pages or sound assets were changed.

- Watcher encounters alternate direct and patient pursuit per player in a session. Patient
  pursuit uses slower native pathing and short pauses at distance. Observation removes either
  stalking group and restores a zero-speed lurk group. Core light/ward/stare/grace rules remain.
- Watchers can appear at open/shore forest edges, while their spawn point must still be wooded,
  34–50 blocks away and under the existing light, ground and line-of-sight restrictions.
- Borrowed sheep pause to watch nearby players for 2–4 seconds, then resume their disguised
  wandering. Exposed forms use a different diagonal scrambling gait.
- Borrowed transformations have a stationary non-attacking window of at least 1.4 seconds.
  Afterwards they hunt at night or flee in daylight. Wards interrupt safely; death/travel
  cancels an uncompleted transformation. This prevents hunting during the opening animation.
- A wild Hollowed reaching the last heard noise pauses to listen for 2–4 seconds. New noises
  redirect it immediately; close contact restores pursuit. Boss juveniles retain combat behavior.
- Weight walk animations by movement speed, blend idle/walk/run states, limit head twists and
  use bounded native turning. Reduce the Watcher's large walking body dip. Static Borrowed run
  poses were inspected offline; engine movement/animation quality still requires the user test.
- Preserve all 1.0.5 shader settings and audio bytes. Keep spawn chances, cooldowns and caps;
  variety does not mean constant encounters or new guaranteed spawns.

Verification: strict TypeScript, static validation, 88/88 headless scenarios (10 new), visual-data
checks and archive integrity. The simulation does not implement native pathfinding or animation
playback. See `MOVEMENT_TESTING.md` for a targeted device test and remaining engine questions.

## Previous continuation: 1.0.5 — horror visual direction

- Expand the optional Visuals pack from 57 to all 83 Overworld client-biome definitions in the
  pinned Mojang release. Native Nether/End biome settings remain intact.
- Seven looks: wild, cold, swamp, cave, dense canopy, arid and coast. Added coverage includes
  oceans, deserts/badlands, pale garden, mushroom biomes, lush caves and sulfur caves.
- Author complete closed sun-colour curves. The old generator retained orange vanilla stops
  and only replaced the final stop; the new steel/amber direction applies throughout the day.
- Muted saturation 0.78–0.84, restrained 62–70 lux peak sunlight, cool moonlight 0.13–0.17 lux,
  nonzero ambient floors and warm local light. Lower glare/haze instead of forcing blackouts.
- Reduce lowland volumetric density and give arid/coastal/canopy regions their own mist profiles.
  Preserve vanilla underwater fog and all non-look biome components, including music/foliage.
- Slightly tinted water; slow two-octave ripples (four at coasts), still cold/cave water; no
  caustics in swamp/canopy/cave profiles and slower minimum-power caustics elsewhere.
- Add `tools/visuals/verify_visuals.py` to every build and generate `VISUAL_REPORT.generated.md`.
  It checks biome coverage, day-cycle seams, sensible light/water bounds and preservation rules.
  Four isolated negative checks detect a seam, invalid caustics power, biome music edit and
  mismatched tone mapper without modifying working pack files.
- Preserve the full 1.0.4 gameplay and stable UUIDs; advance all pack versions together to 1.0.5.

Verification: strict compilation, static validation, visual-data verification, 78/78 gameplay
simulations, generated-file reproducibility and archive/manifest checks. No Minecraft rendering
or device performance testing was performed; the style needs the same-scene review in
`VISUAL_TUNING.md`. No claim of perfect appearance, new ray tracing or measured frame rate.

## Previous continuation: 1.0.4 — field guidance and survival reliability

- Add Journal → Field conditions & next steps: local roof/light, registered lantern or charged
  ward, movement noise, encounter pacing, progression hints and a discovered-recipe shortcut.
  Refresh runs the checks again. It does not scan for creatures or reveal undiscovered recipes.
- Explain newcomer, world-grace, post-respawn and Peaceful/Creative/Spectator quiet periods.
- Merge simultaneous journal discoveries into one summary/cue. Cancel pending notices on
  death, travel or departure, and discard unknown/duplicate saved journal IDs.
- Failed ward block updates no longer consume charcoal. Inactive overflow wards explain the
  cap and can be activated by interacting after another ward is removed.
- Invalidate queued item actions across death, departure and dimension changes; require the
  matching held item for journal, page, lens, Heartseeker and material uses.
- Clear player-local lens reveals and Heartseeker waypoints on death/dimension travel.
- Recompute cached environment context after dimension changes, larger moves or entering water.
- Noise readouts no longer mutate the actual hearing/landing state. Reading the journal/lens
  cannot swallow a landing sound before a Hollowed hears it.
- Drop a granted item at the player's feet if their inventory component is unavailable.
- Preserve the 1.0.3 darker lighting. Pack UUIDs remain stable; all versions advance to 1.0.4.

Verification: 78/78 simulations, including 18 new field-guide, equipment, lifecycle, discovery,
hearing and full-inventory reward scenarios. Strict compilation, static validation and archive
checks are part of the release build. Engine/UI layout/performance checks remain outstanding.

## Previous continuation: 1.0.3 — darker Visuals

Responds to the report that the Visuals pack is too bright. Preserves all 1.0.2 gameplay fixes.

- Reduce sunlight to 75–80 lux in wild/cold looks and 70 lux in swamps (formerly 100/85).
- Reduce peak moonlight from 0.5 to 0.16–0.20 lux, preserving its existing on/off timing.
- Surface ambient light now falls from 0.018 by day to 0.012 at night, instead of rising to 0.045.
  Cave ambient stays at 0.009; no hard black cutoff or negative grading offset is introduced.
- Reduce sky fill, night moon haze and volumetric scattering. Keep fog density, height falloff,
  air/weather distance ranges and vanilla underwater definitions intact.
- Lower midtone gain to 0.86–0.90 and highlight gain to [0.88, 0.85, 0.81]. Retain standard gamma
  2.2, the shared generic tone mapper and warm local-light colours.
- Correct a stray mutation-test sound identifier in the TypeScript source (`hollow.nopewatcher.seen` → `hollow.watcher.seen`). The previously packaged script already used the correct identifier.
- Keep all pack UUIDs stable and advance pack/module/dependency versions together to 1.0.3.

The darker profile still needs a same-scene check inside Minecraft on the user's device;
parameter reductions are not a measured percentage reduction in screen brightness.
See `docs/VISUAL_TUNING.md` for scope, exact changes and update steps.

## Previous continuation: 1.0.2

- Fixed wards and lanterns losing their saved registration when a query crosses an unreadable chunk.
- Prune genuinely removed, readable equipment before applying placement caps. Extra Heartwood
  Lanterns now explain that they give light only when the 16-lantern protection cap is full.
- Extended grace-day settings now also delay the Borrowed, Mirebound and natural Knocker visits.
- Ward charge history persists across saves/restarts and separates dimensions. One creature type
  cannot drain another charge by returning after a restart on the same night.
- All five natural encounter spawners check both their target and chosen spawn location against
  Heartwood Lantern protection. Wild Hollowed ignore noise inside the protected radius and
  disappear if they enter it. Mirebound cannot start a grab on a protected player.
- Journal/settings use one navigation session per player, bounded busy retries and disconnect-safe
  cancellation. Delayed responses cannot enter a new session. An entry remains unread when its
  form never opened. Corrupt saved settings recover valid defaults; settings forms preserve the
  complete supported grace/night ranges.
- Completed a portable Sound Booth export with embedded MP3 audio, local review storage and JSON
  feedback export. It no longer requires a Claude session to collect feedback.
- Queued page/lens uses now cancel on a hotbar swap; repeated page callbacks cannot unlock
  more lore entries than the pages consumed.
- Corrected the older audio credits and release counts against the current shipped catalogue.

Verification: 60/60 headless simulation scenarios; strict TypeScript compilation; static schema
and reference validation. The portable Sound Booth passed its separate headless Chromium check: 150 embedded audio
variants, MP3 decoding, review storage, filters, feedback export and storage-disabled fallback,
with no network requests. This does not establish iPhone Safari playback or human audio quality.
Consult `docs/TESTING.md` for the remaining engine tests.

## Starting point

This continuation builds on `the-hollow-addon` at commit `dfc3ec605bdd14a3903d93dbc81097deb7373966`
("Rebuild the Heart Below model; Watcher moss"). That commit already includes the new watchtower,
lean-to, collapsed cabin, journal lore, creature tracks, music and three rare events. The Heart
model and Watcher moss are preserved.

The supplied Claude screenshots end during a numerical review of the optional Visuals pack,
with a proposed swamp-fog reduction. The committed generator still used density `0.085`.
Uncommitted work from Claude's session is unavailable.

## Implemented in this continuation

- Every Eye and On the Roof cancel on departure, death, dimension change or moving more than
  32 blocks from the scene. Queued callbacks from a cancelled event cannot affect a new event.
- Animals that leave the event's dimension or area stop receiving stare/slowness updates.
- Roof footsteps follow a fixed path at the original shelter, even when the listener moves.
- A lantern in an unreadable chunk remains pending. A failed page spawn leaves the lantern lit
  for a later retry. Successful rewards are committed once before optional audio/visual work.
  Player replacement blocks are preserved and clear the obsolete scene without a phantom page.
- Swamp volumetric fog density is reduced to `0.07` in the generator and all three swamp files.
- Reference fetching includes vanilla sound definitions and refreshes existing sparse checkouts.
  A checkout at a different commit fails the pinned-version check instead of silently validating
  against different data.
- Pack/module versions and the BP-to-RP dependency advance together to `1.0.1`, preserving UUIDs.

## Historical visuals review (1.0.1)

The current 1.0.5 inputs and coverage are in `VISUAL_REPORT.generated.md` and `VISUAL_TUNING.md`.

Reference: Mojang `bedrock-samples`, tag `v1.26.50.4`, commit
`46ba6ea985fb5a92d79a9419198f10dda14c199d`. These are numerical comparisons, not rendered results.

| Fog group | Maximum air density | Height falloff | Distance-fog start, clear / weather |
|---|---:|---|---|
| Forest and other wild biomes | 0.055 | Maximum at Y62, zero at Y100 | 70% / 25% of render distance |
| Cold biomes | 0.050 | Maximum at Y64, zero at Y110 | 70% / 20% |
| Swamps | 0.070 (previously 0.085) | Maximum at Y60, zero at Y82 | 55% / 20% |
| Caves | 0.030 | Uniform | 75% / 75% |

The pinned pale garden and sulfur cave fog definitions both use `0.07` maximum air density;
the End uses `0.25`. Matching a reference density is a conservative tuning choice, not an
engine limit or proof that visibility is good. Scattering, absorption, light and height all
affect the final image. Clear-air distance fog ends at 100% of render distance; weather fog
ends earlier, at 65–75% outdoors. Water fog is inherited from each vanilla biome.

Lighting keeps nonzero cool ambient light and moonlight. The four grading profiles share the
`generic` tone-mapping operator, allowing a consistent operator across biome transitions.
The original 1.0.1 pass changed only swamp density; the later 1.0.3 lighting/grading changes are documented above.

## Verified locally

- Strict TypeScript compilation against the pinned stable Script API typings.
- Static schema and reference validation: zero errors, zero warnings.
- 88/88 headless scenarios, including movement states, encounter variations, field guidance and lifecycle regressions.
- Importable archives rebuilt from the current source with version `1.0.6` manifests.

## Still requires Minecraft

Codex has not run Minecraft. The user reports the Borrowed and positive Hollowed clicking audio;
other engine/device details remain unconfirmed. Next, follow
[TESTING.md](TESTING.md), including the event checks, and compare swamp/forest visibility at
dusk, midnight and during rain with Vibrant Visuals on and off. Check the Heart model and eye
animations in the engine, listen to the audio, and collect device performance observations.
Headless simulation does not establish those results.
