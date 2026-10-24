# Port Marlowe: Technical Architecture

This document is the engineering reference for the Port Marlowe Bedrock world: what each pack does, the exact
schemas used, and why each decision was made. Every engine fact below was checked against Mojang's
`bedrock-samples` **v1.26.50.4** (released 15 Sep 2026) or Microsoft's `minecraft-creator` docs (updated
20 Oct 2026). Sources are listed at the end.

The packs in this repo hold configuration only. They contain no textures, models or audio. You drop
community or commissioned assets into fixed slots, and `tools/pmtool.py` validates, assembles and packages them.

---

## 1. Target platform: Xbox Series X

Port Marlowe is built for a Realm played on an **Xbox Series X**. Every budget and default in
`config/build.json` follows from the platform facts below.

| Area | Xbox Series X fact | Source | What Port Marlowe does |
|---|---|---|---|
| Graphics mode | **Vibrant Visuals is supported** on Xbox Series X\|S (also Xbox One/PS4 with possible degradation). | minecraft.net Vibrant Visuals page | Every pack declares `"pbr"`; the Xbox profile uses Vibrant-Visuals-native vendor packs |
| Ray tracing | **Not available.** Minecraft's ray-tracing mode is Windows-only (DirectX ray-tracing GPU), so Xbox never offers it, even though the Series X GPU supports hardware ray tracing. | Microsoft "Getting Started with Ray Tracing" | No RTX pack in the default stack. MERS materials (subsurface) are kept because RTX compatibility is moot. |
| Memory class | **Memory Performance Tier 4** (`memory_tier` 24–28, 8–12 GB class), shared with PS5 | Microsoft "Building Sub-Packs" | The build measures texture memory against tier 4 and prints how the world fares on tiers 1–5 |
| Texture budget | Tier 4: **1.2 GB per resource pack, 3 GB per world** (texels × 4 bytes, uncompressed) | Microsoft "Texture Budgets" | `pmtool build` fails if a pack or the world exceeds them |
| Folder names | World pack folders must be **≤ 10 characters** because of an Xbox long-path issue | Microsoft "Create a World Template" | Enforced by the validator (`pm_fauna`, `vnd_vvn`, …) |
| Point lights | Disabled only on Android, PS4 and Xbox One; Series X keeps them | 1.26.30 release notes | Torch-family blocks stay engine point lights (colour only changed); everything else is static light |
| Performance | No official spec. Player reports (Mojang feedback site, 2025–2026): Vibrant Visuals render distance tops out around **24–28 chunks**, and **60 fps is not held** at Ultra + 24 chunks; water was a hotspot in preview builds. | feedback.minecraft.net threads | Waves cut from 28 to **16 octaves**; rooster logic runs only on roosters; fauna limits of **512 px** textures and **160 cubes** per model; recommended render distance **16–20 chunks** |
| File import | Consoles cannot open `.mcworld` files. Microsoft's documented console route is to upload the world to a Realm from Windows, then join from the console. | Microsoft "Getting Started" (Realms/Console tab) | `package-world` produces a Realm-ready `.mcworld`; see [DEPLOYMENT.md](DEPLOYMENT.md) |
| Debugging | Content Log is in Settings → Creator; history is reachable from the Profile screen (the Ctrl+H shortcut is keyboard-only) | Microsoft "Content Error Log" | Verification steps use the Profile-screen history on Xbox |

Engine rules that shape the packs (Microsoft documentation):

* `metalness_emissive_roughness_subsurface` (MERS) is Vibrant Visuals' material layer; subsurface scattering
  is what makes fur, wool, ears, combs and leaves glow when back-lit.
* MER and MERS are mutually exclusive in one texture set. So are normal and heightmap.
* A texture set can only reference images in **its own pack**, and texture sets do not merge: the
  highest-priority pack's set wins.
* Since 1.21.90, Mojang ships **per-biome** Vibrant Visuals settings. A custom `lighting/global.json`,
  `color_grading/color_grading.json` or similar file does **not** override them. You have to point each
  client biome at your identifiers. The atmosphere generator in §5 exists because of this rule.

### Profiles

| Profile | Vendor packs (below the Port Marlowe packs) | Use it when |
|---|---|---|
| `xbox` (default) | **Vibrant Normals** (hand-drawn 16x normals for every block) + **Vanilla Vibrant Visuals, subpack `b` "Lighting Only (No Textures)"** | The Realm is played on Xbox Series X. The lighting-only subpack exists so its tuned lighting, atmosphere and fog can sit under another texture pack. |
| `vibrant` | Vanilla Vibrant Visuals, subpack `a` (full textures + lighting) | You prefer that pack's block materials over hand-drawn normals |
| `hybrid` | Vanilla RTX Opus (`raytraced`) | Only if PC players with RTX GPUs join. Xbox players still get Vibrant Visuals (a `raytraced` pack also activates it), but with block materials tuned for path tracing. |

`fauna_material_mode` stays `mers`. The `mer` option (RTX-format fauna materials) only matters for the
`hybrid` profile.

---

## 2. `.mcworld` layout

`pmtool package-world` produces exactly this layout (`level.dat` at the archive root, never inside a folder):

```
PortMarlowe.mcworld  (zip)
├── level.dat
├── level.dat_old
├── levelname.txt
├── db/                              LevelDB chunk store from your exported world
├── world_resource_packs.json        stack order, first entry = highest priority
└── resource_packs/
    ├── pm_fauna/                    folder names ≤ 10 characters (Xbox path limit)
    │   ├── manifest.json
    │   ├── entity/{cow,chicken,pig,sheep}.entity.json
    │   ├── render_controllers/pm_farm.render_controllers.json
    │   ├── animations/pm_chicken.animation.json
    │   ├── animation_controllers/pm_chicken.animation_controllers.json
    │   ├── models/entity/pm_<species>_<slot>.geo.json          ← imported
    │   └── textures/entity/pm/<species>/
    │       ├── <breed>.png | .tga                              ← imported albedo
    │       ├── <breed>_mers.tga                                ← imported MERS
    │       ├── <breed>_normal.png                              ← imported normal
    │       └── <breed>.texture_set.json
    ├── pm_audio/
    │   ├── manifest.json
    │   ├── sounds.json
    │   └── sounds/
    │       ├── sound_definitions.json
    │       └── pm/{cow,chicken,pig,sheep,step,ambient}/*.ogg   ← imported
    ├── pm_atmos/
    │   ├── manifest.json
    │   ├── water/{water,ocean,warm_ocean,cold_ocean,river,swamp}.json
    │   ├── shadows/global.json
    │   ├── pbr/global.json
    │   ├── local_lighting/local_lighting.json
    │   ├── color_grading/pm_vivid_*.json                       ← generated (vanilla + vendor gradings)
    │   └── biomes/*.client_biome.json                          ← generated (89)
    ├── vnd_vvn/                      Vibrant Normals, unmodified
    └── vnd_vvv/                      Vanilla Vibrant Visuals, unmodified (subpack b selected)
```

### `world_resource_packs.json` (xbox profile)

```json
[
  { "pack_id": "0a5e9ee6-7ae2-4164-b521-9a48f0815ab8", "version": [1, 0, 0] },
  { "pack_id": "6d71cbe3-2a5e-4844-9287-17ed7b7fd418", "version": [1, 0, 0] },
  { "pack_id": "ea16a581-64ac-4c59-aa92-8508cea57b57", "version": [1, 0, 0] },
  { "pack_id": "ee5958bc-0f43-4e12-94a9-c948a19d78af", "version": [1, 0, 0] },
  { "pack_id": "a9c70898-4c7a-4dfd-aa57-a8f2f8764c57", "version": [3, 3, 0], "subpack": "b" }
]
```

The last two entries are Vibrant Normals 1.0.0 and Vanilla Vibrant Visuals 3.3.0 as published in the
vanilla-rtx/Vanilla-PBR repository (Oct 2026). The build reads vendor UUIDs, versions and declared subpacks
from each vendor manifest, so this file always matches what you dropped in, and it fails if a profile asks
for a subpack the manifest does not declare.

### Manifest (`packs/pm_fauna/manifest.json`)

```json
{
  "format_version": 2,
  "header": {
    "name": "Port Marlowe: Fauna",
    "description": "Realistic farm animal breeds (cow, chicken, pig, sheep) with PBR materials",
    "uuid": "0a5e9ee6-7ae2-4164-b521-9a48f0815ab8",
    "version": [1, 0, 0],
    "min_engine_version": [1, 26, 50],
    "pack_scope": "world"
  },
  "modules": [
    { "description": "Client entity overrides, render controllers, geometry and texture sets",
      "type": "resources", "uuid": "eb3947b4-3f4f-49f9-be5d-ef041168a1d2", "version": [1, 0, 0] }
  ],
  "capabilities": ["pbr"],
  "metadata": { "authors": ["Port Marlowe"], "generated_with": { "pmtool": ["1.0.0"] } }
}
```

| Pack | Header UUID | Module UUID |
|---|---|---|
| pm_fauna | `0a5e9ee6-7ae2-4164-b521-9a48f0815ab8` | `eb3947b4-3f4f-49f9-be5d-ef041168a1d2` |
| pm_audio | `6d71cbe3-2a5e-4844-9287-17ed7b7fd418` | `d7fd5cd5-bb0b-4b8e-97ac-a625f47c6be6` |
| pm_atmos | `ea16a581-64ac-4c59-aa92-8508cea57b57` | `3eccc7be-b55f-4a00-995d-3de8e2f5b6cc` |

All three declare `"pbr"`, including the audio pack. Microsoft does not document whether a pack without a
PBR capability blocks Vibrant Visuals, so every pack declares one, and the validator warns about any
stack member that does not. There is **no behavior pack**: the world needs no experiments, and no vanilla
mob logic is overridden (see §4).

---

## 3. Pillar 1: PBR materials

### How a block reaches its material

`blocks.json` maps a block to a `terrain_texture.json` key, that key maps to an image path, and the
texture set sits next to the image with the same stem. Vanilla water, verified in 1.26.50:

```
blocks.json            "water": { "textures": { "up": "still_water_grey", "side": "flowing_water_grey", ... } }
terrain_texture.json   "still_water_grey" -> textures/blocks/water_still_grey
texture set            textures/blocks/water_still_grey.texture_set.json
```

Vanilla blocks never need `blocks.json` edits for PBR. Ship the image and its `*.texture_set.json` in the
same pack. `blocks.json` only matters for custom blocks or when re-pointing a block to a different texture.

### Texture set schemas

Vibrant Visuals (`templates/blocks/vibrant_visuals/*.texture_set.json` and every fauna set):

```json
{
  "format_version": "1.21.30",
  "minecraft:texture_set": {
    "color": "stone",
    "metalness_emissive_roughness_subsurface": "stone_mers",
    "normal": "stone_normal"
  }
}
```

RTX (`templates/blocks/rtx/*.texture_set.json`; only relevant to the `hybrid` profile for PC guests, never
used on Xbox):

```json
{
  "format_version": "1.16.100",
  "minecraft:texture_set": {
    "color": "stone",
    "metalness_emissive_roughness": "stone_mer",
    "normal": "stone_normal"
  }
}
```

Channel mapping: **R = metalness, G = emissive, B = roughness, A = subsurface** (MERS only). Image
lookup priority is `.tga > .png > .jpg > .jpeg`. Port Marlowe saves MERS layers as **TGA**, like vanilla,
because some PNG writers discard RGB under zero alpha, and alpha is the subsurface channel.

Use normal maps rather than heightmaps for entities. Heightmaps cannot be used on texture-based objects, and
1.26.40 had to fix corrupted actor visuals caused by actor heightmaps. Microsoft does not document the
normal-map Y convention. `import-texture --flip-normal-green` converts between conventions, and
[DEPLOYMENT.md](DEPLOYMENT.md) has a one-minute in-game test to settle it for your assets.

### Calibration: what vanilla 1.26.50 actually uses

Measured directly from Mojang's MERS images (0–255; the most common values are shown):

| Material | Metal | Emissive | Roughness | Subsurface | Notes |
|---|---|---|---|---|---|
| Oak leaves | 0 | 0 | 164–251 | 46–253 | SSS is what makes canopies glow at sunrise |
| Stone | 0 | 0 | 155–205 | 0 | |
| Diamond / redstone ore | 0 | 0 | 180–211 | 0 | Vanilla ores do **not** emit |
| Glowstone | 0 | 21–31 | 136–201 | 255 | Low emissive values are enough |
| Iron / gold block | 191 | 0 | 104–176 | 0 | |
| Water (`water_still_grey`) | 18 | 0 | 15–21 | 0 | Plus an animated normal map, 16×512 (32 frames) |
| Sheep wool | 0 | 0 | ~218 | ~190 | |
| Cow hide | 0 | 0 | 178–203 | 0 | |
| Pig skin | 0 | 0 | 54–161 | 0 | |

"Ores glow physically" means two things. Gems and metal flecks get **low roughness** so they catch sun and
torchlight through reflections. Only genuinely luminous blocks get emissive values. `redstone_ore` and
`lit_redstone_ore` share one texture in `blocks.json`, so emissive on that texture would glow even when unlit.

Screen-space reflections fade above roughness 0.3 (≈76/255) and turn off at 0.4 (≈102/255). Keep wet,
polished and metal surfaces below ~76 if they should mirror the scene.

### Vibrant Visuals configuration (`packs/pm_atmos`)

| File | Purpose |
|---|---|
| `water/*.json` (format 1.26.0) | Six water bodies with particle concentrations in mg/L. Waves are **enabled** everywhere (vanilla ships them off) at **16 octaves** instead of the documented example's 28, to protect Series X frame rate. Waves on/off and caustics cannot blend between biomes, so the build stamps `water.waves` from `config/atmosphere_profile.json` into every file. Set `"enabled": false` there if water still costs too much. |
| `shadows/global.json` | `soft_shadows` |
| `pbr/global.json` | MERS fallback for anything without a texture set |
| `local_lighting/local_lighting.json` (1.21.120) | Colored block light. The torch, lantern, candle, end rod and redstone torch families stay `point_light` (the engine forces this); everything else is `static_light`. Every block ID was checked against vanilla `blocks.json`. |
| `color_grading/pm_vivid_*.json` (generated) | A vivid copy of every grading the biomes use, vanilla's and the vendor's: midtone saturation ×1.12 and contrast ×1.04 (`config/atmosphere_profile.json`). Operators cannot blend between biomes, so one operator is stamped into all of them. `"auto"` takes the vendor's choice (`hable` for Vanilla Vibrant Visuals), else vanilla's `generic`. |
| `biomes/*.client_biome.json` (generated) | See §5 |

Lighting and atmospherics are deliberately left to the lowest layer that defines them: the Vanilla Vibrant
Visuals lighting-only subpack in the Xbox profile, otherwise Mojang's per-biome files. Both are tuned for
real-world lux values and auto-exposure. Port Marlowe changes color, water and shadows, not exposure.

Soft shadows override the vendor's blocky shadows because realism is the goal. Neither Microsoft nor the
pack author documents a cost difference; if you test both on the Series X and blocky is faster, delete
`packs/pm_atmos/shadows/global.json` and the vendor's setting applies.

---

## 4. Pillar 2: Realistic farm animals

### Breed variation with no behavior pack

Vanilla 1.26.50 already gives cows, chickens and pigs two server-synced properties (`client_sync: true`):

* `minecraft:climate_variant`: `temperate | warm | cold`, set from biome tags when the mob spawns
* `minecraft:sound_variant`: cow `default | moody`, chicken `default | picky`, pig `default | big | mini`,
  randomised 50/50 (pigs 1/3 each) on spawn and birth

The client entities read both properties with `query.property(...)` and use them to pick geometry and
texture. Every player on the Realm therefore sees the **same breed for the same animal**, the vanilla
behavior files are never copied (copied behavior files go stale on every update), and the world needs no
experiments.

| Species | Climate (biomes) | `default` | Second variant |
|---|---|---|---|
| Cow | temperate (plains, forest…) | Holstein-Friesian | `moody`: Hereford |
| | warm (savanna, desert, jungle, badlands) | Brahman | `moody`: Gir |
| | cold (taiga, mountains, snowy) | Highland, red | `moody`: Highland, dun |
| Chicken | temperate | Leghorn hen | `picky`: Leghorn rooster |
| | warm | Rhode Island Red hen | `picky`: RIR rooster |
| | cold | Light Brahma hen | `picky`: Brahma rooster |
| Pig | temperate / warm / cold | Large White / Duroc / Mangalica | `big` ×1.08, `mini` ×0.9 render scale |
| Sheep | all | One realistic base; wool color stays vanilla (cold biomes roll mostly black) | n/a |

Because voice and coat use the same synced property, each breed sounds different from the others. A moody
cow is both a Hereford and the deep-voiced cow.

### Client entity (`packs/pm_fauna/entity/cow.entity.json`, abridged)

```json
"pre_animation": [
  "t.climate = query.property('minecraft:climate_variant');",
  "v.climate = (t.climate == 'warm') ? 1 : ((t.climate == 'cold') ? 2 : 0);",
  "v.voice = (query.property('minecraft:sound_variant') == 'moody') ? 1 : 0;"
],
"scale": "query.is_baby ? 2.0 : 1.0"
```

### Render controller (`packs/pm_fauna/render_controllers/pm_farm.render_controllers.json`)

```json
"controller.render.pm.cow": {
  "arrays": {
    "textures": {
      "Array.cow_skins": ["Texture.temperate_default", "Texture.temperate_moody",
                          "Texture.warm_default", "Texture.warm_moody",
                          "Texture.cold_default", "Texture.cold_moody"],
      "Array.calf_skins": ["Texture.baby_temperate", "Texture.baby_warm", "Texture.baby_cold"]
    },
    "geometries": { "Array.cow_geos": ["Geometry.temperate", "Geometry.warm", "Geometry.cold"] }
  },
  "geometry": "query.is_baby ? Geometry.baby : Array.cow_geos[v.climate]",
  "materials": [ { "*": "v.climate == 2 ? Material.cold : Material.default" } ],
  "textures": [ "query.is_baby ? Array.calf_skins[v.climate] : Array.cow_skins[v.climate * 2 + v.voice]" ]
}
```

The chicken controller adds a hen/rooster axis (`v.is_rooster`). The pig keeps vanilla's
`controller.render.saddle` in front of `controller.render.pm.pig`.

### Model contract (enforced by `pmtool`)

1. **Bones.** The entity files reuse vanilla animations, so every geometry must have the bones those
   animations drive: cow and pig `body, head, leg0–leg3`; sheep `body, head, leg0–leg3`; chicken
   `body, head, wing0, wing1, leg0, leg1`. If a model ships its own animations, point the entity's
   `animations` map at them. The validator then checks against those instead.
2. **Baby scale.** The behavior pack applies `minecraft:scale 0.5` to babies and the client entity renders
   them at `2.0`, for a net scale of 1.0. Baby geometry must therefore be authored at its **final on-screen
   size**. The validator warns when a baby is more than 75% of adult height. A Bedrock farm-animal pack
   updated in Sept 2026 has user reports of oversized chicks, which fits this mistake.
3. **Sheep dye mask.** The `sheep` material tints by albedo alpha. In vanilla's `sheep.tga`, wool texels are
   alpha 255 and near-white (they get the dye color), skin texels are alpha 3 (not dyed), and unused
   texels are 0. Realistic sheep must keep this encoding, as RGBA TGA.
4. **Pig saddle.** `controller.render.saddle` redraws `Geometry.default` (only the `body` bone) with
   `Texture.saddle`. Provide `textures/entity/pm/pig/saddle` painted on **your** model's UV layout.
5. **UV aspect.** Each texture's aspect ratio must match a geometry's `texture_width/height` in the same
   age class. Higher resolutions are fine.
6. **Materials.** Vanilla mob materials are kept (`cow`, `cow_cold`, `chicken`, `chicken_legs`,
   `chicken_cold`, `pig_v3`, `sheep`). If a model relies on alpha-cut fur or feather cards, change the entry
   to `entity_alphatest`.

### Xbox Series X budget for animals

Bedrock entity geometry is box-based (Blockbench "Bedrock Entity"), and a farm puts dozens of these mobs on
screen at once. Mojang publishes no per-entity limit, so `config/build.json` sets Port Marlowe's own:

| Budget | Value | Enforcement |
|---|---|---|
| Texture edge per layer | **512 px** (256 px recommended) | `import-texture` downscales to 512 by default; the build warns above it |
| Cubes per geometry | **160** | Build warning |
| `poly_mesh` bones | Avoid | Build warning: verify on the console before shipping |

The whole fauna set at 512 px (27 sets × 3 layers) is about 85 MB of texture memory: 7% of the tier-4
resource-pack budget. Texture memory isn't the constraint on Series X. Per-frame cost of many animated mobs
is, which is why the cube cap and the rooster gating below exist.

### Rooster dawn chorus

Bedrock has no rooster mob, so `picky` adult chickens are roosters, visually and audibly. A client-side
animation controller (`controller.animation.pm.chicken.rooster`) does the crowing:

* `wait` plays a 1-second empty animation, then moves to `roll`, which draws `math.random(0,1)`. Rolling
  once per second keeps the crow rate the same at any frame rate.
* It moves to `crow` if the chicken is a rooster, not in water, and the roll is under **0.06 at dawn**
  (`query.time_of_day` 0.2–0.3, sunrise = 0.25) or **0.0015 by day** (0.3–0.7). Night is 0.
* `crow` plays `pm.chicken.rooster_crow` through `sound_effects` and tilts the head back over 2.6 s. A
  40-second `rest` follows.
* `should_update_effects_offscreen` is `v.is_rooster`, so roosters behind you still crow.
* The controller sits in `animate` as `{"rooster_controller": "v.is_rooster"}`, the same gating pattern vanilla
  uses for the copper golem's controllers. Hens, chicks and off-screen hens therefore cost nothing, which
  matters in a large Xbox chicken farm.

Expected rate: about 2–3 crows per rooster over the 2-minute dawn window, about 0.7 per day otherwise. A
cluster of roosters produces a staggered chorus. Each client rolls independently. That is fine for ambient
sound, and the rooster's appearance comes from the synced property, so everyone agrees which bird is the rooster.

---

## 5. Atmosphere generator (per-biome remap)

`pmtool build` writes all 89 vanilla client biomes in three merge layers:

1. **Vanilla 1.26.50** components (fog, water surface color, VV lighting and atmospherics, ambient sounds, music)
2. **Vendor pack** components, if the vendor ships the same biome file, including files in its selected
   subpack. Vanilla Vibrant Visuals, for example, points every biome at its own `vv_redirected:*` lighting,
   atmosphere and grading.
3. **Port Marlowe** remaps:
   * every color grading (`minecraft:*` or vendor) → its vivid copy, e.g.
     `vv_redirected:default_color_grading` → `pm:vivid_vv_redirected_default_color_grading`
   * `minecraft:water_identifier` → the water body chosen by the rules in `config/atmosphere_profile.json`
   * `minecraft:ambient_sounds`: adds `loop`/`addition` beds where recordings exist, and keeps
     vanilla's `underwater_*` and `mood` keys

Result for plains under the `xbox` profile (from an actual build with the real Vibrant Normals and Vanilla
Vibrant Visuals packs):

```json
"minecraft:fog_appearance": { "fog_identifier": "vv_redirected:fog_plains" },
"minecraft:water_appearance": { "surface_color": "#44AFF5" },
"minecraft:atmosphere_identifier": { "atmosphere_identifier": "vv_redirected:default_atmospherics" },
"minecraft:color_grading_identifier": { "color_grading_identifier": "pm:vivid_vv_redirected_default_color_grading" },
"minecraft:lighting_identifier": { "lighting_identifier": "vv_redirected:default_lighting" },
"minecraft:water_identifier": { "water_identifier": "pm:water_default" },
"minecraft:ambient_sounds": { "underwater_addition": { "asset": "ambient.underwater.additions", "chance": 0.01 },
                              "underwater_loop": "ambient.underwater.loop",
                              "loop": "pm.ambient.grassland.loop" }
```

That build generated 13 vivid gradings (one per grading the biomes actually reference) with the `hable`
operator, because Vanilla Vibrant Visuals' default grading, used by 24 biomes, specifies `hable`.

The build then checks that every referenced identifier (color grading, water, lighting, atmosphere,
cubemap, fog) is defined somewhere in the stack or the base game.

---

## 6. Pillar 3: Audio engine

### What Bedrock lets you control

`sounds.json` and `sound_definitions.json` are **catalog files**: a resource pack ships only the entries
it changes, and those entries replace vanilla's per key. Per sound event, Bedrock exposes:

| Control | Where | Port Marlowe usage |
|---|---|---|
| Full-volume radius | `min_distance` (definition) | Hen 1.5, cow 4, rooster 8 blocks |
| Audible range | `max_distance` (definition) | Hen 24, cow 48, rooster 96 blocks |
| Random pool | `sounds[]` entries, picked by `weight` | 8–10 takes per call type; rare calls weighted 1 vs 3–4 |
| Per-take gain/pitch | `volume`, `pitch` (entries) | Loudness matched at import, so mostly 0.6–1.0 |
| Positional | `is3D` | `true` for mobs and steps, `false` for ambience beds |
| Streaming | `stream` | Thunder and loop beds |
| Event gain/pitch range | `volume`/`pitch` in `sounds.json` (number or `[min,max]`) | Pitch narrowed from vanilla's `[0.8, 1.2]` to about `[0.95, 1.05]` |
| Variant routing | `variants.key` (Molang) + `variants.map` | Mirrors vanilla's sound-variant keys; adds baby variants for cows and sheep |

There is **no data-driven attenuation curve**. Sound is full volume inside `min_distance` and fades out by
`max_distance`, and the shape of that fade is fixed by the engine. "Volume curves" in Port Marlowe come
from those two radii, loudness-normalised source files, and event-level volume.

Narrowing pitch matters: vanilla's ±20% random pitch disguises reuse of cartoon samples, but on real
recordings it audibly turns a hen into a chipmunk. Variation comes from the take pool instead.

### Event wiring (`packs/pm_audio/sounds.json`, chicken)

```json
"chicken": {
  "__molang_version": 13,
  "pitch": [0.95, 1.05],
  "variants": {
    "key": "query.is_baby ? 'baby' : query.property('minecraft:sound_variant')",
    "map": {
      "default": { "events": { "ambient": { "sound": "mob.chicken.say", "volume": 0.8, "pitch": [0.96, 1.04] },
                               "plop":    { "sound": "mob.chicken.plop", "volume": 0.9 } } },
      "picky":   { "events": { "ambient": { "sound": "mob.picky_chicken.say", "volume": 0.85, "pitch": [0.96, 1.04] },
                               "plop":    { "sound": "pm.chicken.plop_thud", "volume": 0.6 } } }
    }
  }
}
```

`mob.chicken.plop` (egg laid) becomes the hen's egg-song cackle. Roosters only get a soft thud.

### Definition (`packs/pm_audio/sounds/sound_definitions.json`, rooster)

```json
"pm.chicken.rooster_crow": {
  "category": "neutral",
  "min_distance": 8.0,
  "max_distance": 96.0,
  "sounds": [
    { "name": "sounds/pm/chicken/rooster_crow_01", "volume": 1.0, "weight": 3, "is3D": true },
    { "name": "sounds/pm/chicken/rooster_crow_02", "volume": 1.0, "weight": 3, "is3D": true },
    { "name": "sounds/pm/chicken/rooster_crow_03", "volume": 1.0, "weight": 3, "is3D": true },
    { "name": "sounds/pm/chicken/rooster_crow_04", "volume": 1.0, "weight": 3, "is3D": true },
    { "name": "sounds/pm/chicken/rooster_crow_05", "volume": 1.0, "weight": 1, "is3D": true },
    { "name": "sounds/pm/chicken/rooster_crow_06", "volume": 1.0, "weight": 1, "is3D": true }
  ],
  "subtitle": "subtitles.entity.chicken.ambient"
}
```

Takes 01–04 are full crows. Takes 05–06 are broken or short crows from young birds, at one third the
frequency.

### Conventions kept from vanilla

* **Subtitles.** Overridden events keep vanilla's subtitle keys, so the accessibility subtitles still work.
* **Baby pitch.** Vanilla plays its dedicated baby recordings with event pitch `0.5`. Port Marlowe keeps
  that convention for every baby variant: calves, chicks, piglets, lambs. If babies sound wrong in game,
  change only the baby variant's pitch.
* **Mono positional sources.** Stereo files do not spatialise. `convert-audio` writes mono 44.1 kHz Vorbis
  for `is3D` slots and keeps stereo for ambience beds.
* **Loudness.** `convert-audio` normalises to −18 LUFS integrated (−1.5 dBTP) by default, which keeps the
  relative `volume` values meaningful. Ambience beds sit lower; pass `--lufs -23`.

### Ambience

Client biomes support `loop` (always playing while inside the biome) and `addition` (`{asset, chance}`
one-shots). Both must be registered under `individual_named_sounds` in `sounds.json`, and both are. Biome
ambience cannot be gated by time of day, so choose loop beds that work day and night (wind, grass, surf)
and keep birdsong in the low-chance additions.

### Missing recordings fall back safely

The build never ships a reference to a missing file:

* A pool entry with no file is removed from the pool.
* A definition with no files at all is dropped, so the vanilla sound plays.
* A `pm.*` event whose definition was dropped is redirected through `sound_fallbacks` in `config/build.json`.
* A mob with no recordings at all has its `sounds.json` entry removed, leaving vanilla wiring untouched.
* If there are no rooster crow recordings, the crow controller is removed from the chicken entity.

---

## 7. Build guarantees and validation

`pmtool build` either produces a stack that passes every check below, or fails and lists each error.
Static checks can't replace the in-game pass in [DEPLOYMENT.md](DEPLOYMENT.md), but they catch the failures
that most often break packs on a Realm:

| Check | Why |
|---|---|
| Manifest fields, UUID format, unique UUIDs across the whole stack | Duplicate UUIDs cause pack sync and import failures |
| `min_engine_version` ≤ Realm target, `pack_scope` ≠ `global`, folder names ≤ 10 chars | Realm, client and Xbox compatibility |
| Every pack declares `pbr` or `raytraced` | Avoids a non-PBR pack in the stack blocking Vibrant Visuals |
| Texture set rules: color required, MER⊕MERS, normal⊕heightmap, channel counts, same-pack images, matching layer sizes | Invalid sets log `CONTENT_ERROR` and are ignored in game |
| Entity textures and geometry exist; animated bones exist; render controller `Texture./Geometry./Material.` keys resolve | Catches invisible mobs and broken animation |
| Baby size, sheep dye mask, UV aspect | Common realism-pack bugs |
| Sound files exist; positional sounds are mono; `sounds.json` events resolve | Silent mobs and non-spatial audio |
| Biome references resolve; every referenced grading carries the same tone-mapping operator | Broken or flickering biome transitions |
| Texture memory per pack and per world against the target memory tier (tier 4 for Series X), with a fits/over line for tiers 1–5 | Microsoft enforces these budgets per platform tier |
| Fauna textures ≤ 512 px, geometry ≤ 160 cubes, no unchecked `poly_mesh` | Frame-time protection for herds on console |
| Requested vendor subpacks exist in the vendor manifest | A missing subpack would leave the vendor pack unusable |
| Incomplete species are skipped, and the vanilla mob stays | The world is shippable at any stage of assembly |

---

## Sources

* Mojang/bedrock-samples, tag `v1.26.50.4`: <https://github.com/Mojang/bedrock-samples>
* Microsoft creator docs (source repo): <https://github.com/MicrosoftDocs/minecraft-creator>
  * Vibrant Visuals resource packs: <https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/vvresourcepacks>
  * Texture sets: <https://learn.microsoft.com/en-us/minecraft/creator/reference/content/texturesetsreference/texturesetsconcepts/texturesetsintroduction>
  * Per-biome customisation, lighting, water, color grading, shadows, reflections: `creator/Documents/VibrantVisuals/*.md` in the repo above
  * Pack manifest reference: `creator/Reference/Content/AddonsReference/PackManifest.md`
  * World template folder-name limit: `creator/Documents/CreateAWorldTemplate.md`
  * Getting started with ray tracing: <https://learn.microsoft.com/en-us/minecraft/creator/documents/rtxgettingstarted>
  * Memory performance tiers per platform: `creator/Documents/BuildingSubpacks.md`
  * Texture budgets per tier: `creator/Documents/TextureBudgets.md`
  * Console install route (Realms/Console tab): `creator/Documents/GettingStarted.md`
  * Content log: `creator/Documents/ContentErrorLog.md`
  * Offscreen-update fields are Molang: `creator/Reference/Content/VisualReference/actor_resource_definition.v1.10.0.md`
* Vibrant Visuals supported devices: <https://www.minecraft.net/en-us/vibrant-visuals-update>
* Player reports on Series X performance: <https://feedback.minecraft.net/hc/en-us/community/posts/36329970264973-Vibrant-visuals-render-distance>,
  <https://feedback.minecraft.net/hc/en-us/community/posts/35630749086221-Vibrant-visuals-for-everyone?page=18>
* Vanilla RTX: <https://github.com/Cubeir/Vanilla-RTX>. Vanilla PBR (Vibrant Visuals): <https://github.com/vanilla-rtx/Vanilla-PBR>
