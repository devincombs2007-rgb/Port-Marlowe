# Validation report: THE HOLLOW v1.0.0

**Bottom line:** every static check passes: **0 errors, 0 warnings**, and the validator catches **8/8** deliberately
injected defects. **Nothing has been run inside Minecraft yet:** no Windows, iPhone, Xbox or Realm session. The
in-game test plan in §3 is what remains, and §4 lists every known limitation and unverified assumption.

Build date: 2026-10-19 · Target: Minecraft Bedrock 26.50 (1.26.50) · `@minecraft/server` 2.10.0 · `@minecraft/server-ui` 2.2.0

---

## 1. Static validation (done, automated, reproducible)

Run with `python3 tools/build.py`. The full machine output is in
[VALIDATION_REPORT.generated.md](VALIDATION_REPORT.generated.md).

| Area | What is checked | Result |
|---|---|---|
| JSON | All 252 JSON files parse | ✅ |
| Manifests | `format_version` 2, unique UUIDs, BP→RP dependency resolves by UUID and version, `pbr` capability on both RPs, `min_engine_version` 1.26.50, script entry exists, **every script module version is present and stable in Mojang's 1.26.50 metadata** | ✅ |
| Behavior entities (9) | **Mojang JSON schema** (entity 1.26.50); every component name exists in 1.26.50 (406 known); event → component group references; `set_property` names declared; loot table paths exist; entity names in lang | ✅ |
| Client entities (9) | textures, geometry, animations and controllers exist; render-controller textures, materials and `part_visibility` bones exist; animated bones exist in the geometry; every `query.property` is declared in the BP; sound and particle effects resolve and animations only use declared effect names; spawn-egg names in lang | ✅ |
| Geometry (13) | All UV boxes lie within the texture size | ✅ |
| Animations (33) and controllers (13) | Referenced by short name in each client entity; controller states reference existing animations | ✅ |
| Items (14), blocks (5) | **Mojang schemas** (item 1.26.30, block 1.26.20); icons in `item_texture.json`; terrain textures exist; custom components are registered in the TypeScript; block states and permutations reference declared states; lang | ✅ |
| Recipes (7), loot tables | Every item id exists in vanilla 1.26.50 or in the add-on | ✅ |
| Texture sets (17) | MERS is RGBA, heightmap is single-channel, no normal map alongside a heightmap (mutually exclusive) | ✅ |
| Sounds | 70 events / 153 files; every referenced file exists; every sound used by entities, animations or scripts is defined | ✅ |
| Particles (11) | **Mojang schema** (1.21.10); textures exist | ✅ |
| Fogs (60) | Every fog id referenced by scripts or biomes is defined | ✅ |
| Structures (3) | NBT parses; every palette block and state exists in vanilla 1.26.50 (or is a declared add-on block state) | ✅ |
| Visuals | 57 client biomes pass the **Mojang client-biome schema**, each overrides a real vanilla biome, and every lighting, atmosphere, colour grading, water and fog id resolves | ✅ |
| Scripts | `tsc --strict` against the pinned typings (no `any` escapes on APIs); every `hollow:*` id, sound, particle, fog, event, property and block state referenced in TypeScript resolves | ✅ |
| Packaging | `.mcaddon` has a `manifest.json` at the root of each of its three folders; zip CRC test passes; only shippable file types (json, png, ogg, lang, mcstructure, js) | ✅ |

### Validator self-test (`python3 tools/selftest_validator.py`)
Each defect is injected into a real file, the validator is run, and the file is restored byte-for-byte:

| Injected defect | Detected |
|---|---|
| unknown entity component | ✅ |
| missing entity texture | ✅ |
| undefined sound id in script | ✅ |
| unknown item in a recipe | ✅ |
| dangling Vibrant Visuals reference | ✅ |
| undeclared block state | ✅ |
| schema violation in an item | ✅ |
| undeclared animation sound effect | ✅ |

### Other build-time checks
- **Reproducibility:** two consecutive builds produce a byte-identical `.mcaddon` (checked by md5). Audio encodes are
  bit-exact.
- **Models:**
  - every model was rendered offline from 8 angles (`docs/previews/`) to check silhouettes, proportions and joint pivots;
  - the rotation convention was checked numerically against vanilla zombie arms and spider legs.
- **Textures:** painted at the 1-texel grid. MERS emissive is used only where glow is intended, and glow layers are
  derived from MERS so the two can't disagree.
- **Audio:** each file checked for duration, peak (no clipping) and RMS level, and by spectrogram sheets. Nothing was
  checked by ear (see §4).

## 2. What static validation cannot prove

The validator proves the files are well-formed, consistent with Mojang's published schemas and metadata, and
cross-referenced. It **can't** prove:
- that the game accepts every field combination;
- that behaviors look and feel right;
- performance on Xbox;
- that sounds are pleasant;
- Realm and pack upload behavior.

That is what §3 is for.

## 3. In-game test plan (to do: not yet performed)

The steps are ordered so failures surface early. On Windows, enable **Settings → Creator → Content Log GUI** and watch
for `[hollow]` lines and content errors.

**A. Load (Windows, local world, cheats on)**
1. Import the `.mcaddon` and confirm 3 packs import without errors.
2. Create a world with the BP plus the Visuals pack. Check the content log for JSON or script errors on load.
3. On join you should get the Field Journal plus a "THE HOLLOW initialised" log line. Open the journal: chapters, entries and Settings work with a controller.
4. Open both settings forms, change values, reopen them, and confirm the values persisted.

**B. Items and blocks**
5. Craft every recipe from survival materials (give yourself the creature materials with `/give`).
6. Chime: place it; `/summon hollow:watcher` nearby; it should ring. Silence it with Use.
7. Ward: place it; Use shows 4/4; charcoal recharges; breaking a used ward gives salvage.
8. Lens: Use near a sheep flock after `/scriptevent hollow:site` and a Borrowed spawn; the reveal should be visible only to you; durability goes down.
9. Heartseeker: Use; the shrine forms; the locator-bar star and the direction text are correct.

**C. Creatures** (set *Encounter frequency* to 200% and use `/time set` to speed testing)
10. Watcher: forest at night. It appears out of view, retreats when stared at, drops resin, gives the twig warning, strikes once, holding a torch prevents the strike.
11. Borrowed: reveal by shears, by hurt, and by night proximity; it flees by day.
12. Hollowed: in a cave below Y 0: sneaking is silent, a thrown snowball pulls it away (lure targeting), and wool is silent.
13. Knocker: set *First Knocker night* to 2 and *frequency* to 200%; wait inside a roofed house with a door. Check the walk-up, knocks, Nail, ward repel, and what happens when the door is opened.
14. Mirebound: swamp shallows. Check the clues, the windup, **the grab seats you on it** (or the documented fallback bite triggers), Sneak to escape, and the 5 s release.
15. Heart Below: use the Offering on the altar; check the shield, veins, burst telegraph, pulse jump, phase 2 minions, phase 3 gaze and pillars, rewards once each, dormancy, and the Offering being returned.

**D. Lifecycle and multiplayer** (2+ players)
16. Leave during an encounter, rejoin: no duplicate or leftover creature.
17. Die during an encounter: the journal is kept and there is 1 minute of mercy.
18. Go through a Nether portal mid-encounter: the encounter ends and the fog clears.
19. Save and quit during the boss fight, reload: the fight resumes and nothing is duplicated.
20. Boss with 2 players: health scaling (480), both get one Stilled Heart.

**E. Visuals**
21. Toggle Vibrant Visuals on and off in forest, taiga, swamp and cave at noon, dusk and midnight. Nights are dark but navigable; fog is never near-black; shelter light reads warm.
22. Standard graphics: eye glow is visible at night and the encounter fog works.

**F. Realm and Xbox**
23. Upload to a Realm from Windows or iPhone, then join from Xbox: packs download, and creatures, sounds and journal work.
24. Xbox: walk the forest at night with Vibrant Visuals on and off and note any stutter. **No frame rate has been measured.**

## 4. Known limitations and unverified assumptions

**Not tested anywhere at runtime.** Everything below was built against the documented 1.26.50 behavior and Mojang's
schemas, but hasn't been observed in game.

| # | Assumption or limitation | Risk | Fallback / mitigation |
|---|---|---|---|
| 1 | **Mirebound grab** seats the player with `EntityRideableComponent.addRider` (a stable API). Some platforms or versions may refuse to force-seat a player. | Medium | After 3 failed seat attempts, the grab becomes a bite plus slowness. The encounter still works. |
| 2 | **Hollowed lures:** a Hollowed targets an invisible `hollow:lure` entity via `nearest_attackable_target` with a `hollow_lure` family filter. | Medium | If targeting fails, it still investigates by sound through its other rules, and within 3 blocks it finds players directly. |
| 3 | **Hollowed spawn light check** uses `Dimension.getLightLevel`. Its exact semantics (block vs combined light) are untested. | Low | A light-block search (no torches within 6 blocks) and the line-of-sight rule also gate spawns. |
| 4 | **Vibrant Visuals pack interplay:** `local_lighting.json` and client-biome overrides from several active packs may not merge, so the top pack wins. | Low | Documented: use one VV pack at a time. The add-on is fully playable without the Visuals pack. |
| 5 | **Custom block in a structure palette:** the shrine `.mcstructure` contains `hollow:heart_altar` with state `hollow:awake=0`. | Low | The block and state are declared in the BP and validated. If placement drops it, operators can re-place the shrine with `/scriptevent hollow:site shrine` (testing only). |
| 6 | **Knocker pathing** to doors in unusual builds (doors in walls more than 2 thick, doors up stairs). | Low | It gives up after 70 s and leaves. No damage, and no stuck creature. |
| 7 | **Sounds were never auditioned.** I can't listen to audio. All 153 files were checked by spectrogram, level, duration and clipping only. | Medium (quality, not function) | All sounds are generated from `tools/sounds/design.py`, so any cue is easy to retune and rebuild. Expect some to need adjusting after a listening pass. |
| 8 | **Art is procedural, original, low-resolution "Minecraft-style".** It's consistent, but not hand-painted by an artist. | n/a | Generators are parameterised; every texture can be repainted or replaced. |
| 9 | **Performance unmeasured.** The bounds in TECHNICAL.md §3 are design limits, not measurements. | Unknown | Operators can lower *Encounter frequency* or disable creatures. |
| 10 | **Realm upload UI wording** differs slightly between platforms and versions. | Low | The install guide describes both routes. |
| 11 | **Boss rewards need participants online** when the Heart dies. | Low | By design: rewards are given to the player directly, once. |
| 12 | **Sites off plus creatures off** can leave boss materials unobtainable. | Low | Only when both are disabled. Documented in the survival guide. |

## 5. Explicit non-claims
- No claim of Xbox, iPhone, Windows or Realm testing.
- No frame-rate or performance claim.
- No claim that the sounds or art are professionally produced. They are original and procedurally generated (see CREDITS.md).
- No use of beta or experimental APIs, so no experiments toggle is needed.
