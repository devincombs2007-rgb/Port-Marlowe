# Sourcing & Assembly Manifest

This file says what to put in each folder and where to get it. A Realm **redistributes** every pack to
every member who joins, so an asset is only usable if its licence allows redistribution, not just personal
use. Each source is marked:

| Mark | Meaning |
|---|---|
| **Verified** | I read the repository, manifest and licence directly (October 2026) |
| **Listed** | Seen only in search-engine listings; the page itself could not be opened from the build environment. Check the original page before relying on it. |
| **Not found** | No evidence the named pack exists in a usable Bedrock form |

Keep third-party files out of git. `.gitignore` already excludes `vendor/*` and binary files under
`assets/`. Put licence and attribution text **inside** the pack: any file you add to
`assets/<pack>/` (for example `assets/pm_audio/CREDITS.txt`) ships with that pack.

---

## A. Block PBR: `vendor/<name>/` (manifest.json at that folder's root)

Xbox Series X stack (`xbox` profile, the default):

| Folder | Pack | Status | Capability / version | Licence summary |
|---|---|---|---|---|
| `vendor/vibrant_normals` | **Vibrant Normals**: Vibrant Visuals conversion of Vanilla RTX Normals, hand-drawn 16x normal maps for every vanilla block (1,111 texture sets) | **Verified**: github.com/vanilla-rtx/Vanilla-PBR, updated 15 Oct 2026 | `pbr`, v1.0.0, UUID `ee5958bc-0f43-4e12-94a9-c948a19d78af` | "Default Vanilla RTX License Applies": free; redistribution in maps, servers and Realms allowed with clear credit and the licence file or a link to it; non-commercial. **Copy `LICENSE.txt` into the vendor folder.** |
| `vendor/vanilla_vibrant_visuals` | **Vanilla Vibrant Visuals**, used as subpack **`b` "Lighting Only (No Textures)"**: the author's tuned lighting, atmospherics, fog and biome mapping, designed to sit under another texture pack. The build repackages that subpack as a standalone pack with its own UUID and credit, so no device picks the wrong subpack. | **Verified** (same repo) | `pbr`, v3.3.0, UUID `a9c70898-4c7a-4dfd-aa57-a8f2f8764c57`, subpacks `a` (full) and `b` (lighting only) | Same licence |

Measured in a real build: the two vendor packs in the `xbox` stack use about 7 MB of the 3 GB tier-4 texture
budget. The `vibrant` profile (subpack `a`, with textures) uses about 35 MB.

Optional or PC-only:

| Folder | Pack | Status | Capability / version | Licence summary |
|---|---|---|---|---|
| `vendor/vanilla_rtx_opus` (`hybrid` profile, PC guests only) | **Vanilla RTX Opus** by Cubeir | **Verified**: github.com/Cubeir/Vanilla-RTX, v1.26.34, updated 22 Oct 2026 | `raytraced`, `min_engine_version` 1.26.50, UUID `7c87f859-4d79-4d51-8887-bf450b2b2bfa` | Same licence. Ray tracing never activates on Xbox; Xbox players would see its RTX-tuned materials through Vibrant Visuals. |
| *(optional)* | PrizmaRTX by Al3xis5 | **Listed** on MCPEDL as v1.3.1 (Sept 2025), **RTX-only, so useless on Xbox**. A user comment reports breakage after 1.21.70. | Unknown | Unknown. The same author's newer **Prizma Visuals 2.0** (with Starfish Studios) is listed as a Vibrant Visuals pack; check its terms and size before trying it on Xbox. |
| *(optional)* | Defined PBR | Java Edition LabPBR pack, not a Bedrock pack | n/a | Unknown. `pmtool convert-labpbr` converts its `_s`/`_n` maps to MERS/normal per texture, but a full port also needs a Java→Bedrock filename map. Only do this if the licence allows redistribution. |
| *(optional)* | **Legendary Bedrock PBR Textures** (legendaryrttextures.com) | **Listed**: described as built for Vibrant Visuals, in HD and FHD versions, for PC, mobile and console. I couldn't open the site from the build environment. | Unknown | Unknown. Check whether it is paid and whether Realm sharing is allowed. (An earlier version of this file wrongly said this pack could not be found.) |

### Higher-resolution Vibrant Visuals block packs (optional, for the most realistic blocks)

These are listed as Vibrant Visuals compatible and higher resolution than Vibrant Normals. The download
sites (CurseForge, MCPEDL, legendaryrttextures.com) are blocked from this build environment, so none of
them is verified here. Download on your phone, read the page's terms and version, and stack the pack as
described in DEPLOYMENT.md §4.

| Pack | What the listing says |
|---|---|
| Optimum Realism for Bedrock [Vibrant Visuals Compatible] (CurseForge) | 64x, 690+ PBR materials, "runs on PC, console, and mobile with PBR" |
| Legendary Bedrock PBR Textures (legendaryrttextures.com) | HD and FHD versions; Vibrant Visuals; console listed |
| Enhanced Vibrant Visuals \| Official (CurseForge) | Heightmaps, normal maps and MER via a high-resolution subpack |
| RealSource REALISTIC | Realistic, RTX and Vibrant Visuals support, LOW and HD versions |
| Revolution Vibrant Visuals; PLUS for Vibrant Visuals; Immersive Visuals for Vibrant Visuals (CurseForge) | Vibrant Visuals packs; check whether they ship block textures or only lighting |

Xbox rule of thumb: 64x–128x. 256x fits the 1.2 GB per-pack budget but bloats the Realm download; 512x
does not fit. Avoid packs that only change lighting, because they compete with Port Marlowe: Atmosphere.

To swap a vendor pack, add it to `vendor_packs` in `config/build.json`. Use a folder name of 10 characters
or fewer (an Xbox requirement), then reference it from a profile's `stack`; `key:subpack` selects a
subpack. Do **not** stack two packs that both ship block textures: texture sets do not merge, and only the
higher one is used. That is why the Xbox profile takes Vanilla Vibrant Visuals' lighting-only subpack.

Block templates in `templates/blocks/` show the exact texture-set wiring for water, leaves, grass, stone,
deepslate, ores, glowstone and metal if you author or override block materials yourself.

---

## B. Farm animal models and skins: `assets/pm_fauna/`

Import with `pmtool import-model` / `pmtool import-texture`. Those commands rename geometry identifiers,
convert formats, and place files at the paths below. `pmtool status` lists what is still missing.

### Geometry slots: 14 files → `assets/pm_fauna/models/entity/`

| Species | Slots (`--slot`) | Required bones |
|---|---|---|
| Cow | `temperate`, `warm` (zebu hump and dewlap), `cold` (Highland horns and fringe), `baby` | `body, head, leg0–leg3` |
| Chicken | `hen`, `hen_cold` (feathered feet), `rooster` (comb, wattles, sickle tail), `rooster_cold`, `baby` | `body, head, wing0, wing1, leg0, leg1` |
| Pig | `default` (→ `geometry.pm.pig.adult`), `baby` | `body, head, leg0–leg3` |
| Sheep | `default` (fleeced), `sheared`, `baby` | `body, head, leg0–leg3` |

### Texture slots: 27 sets × 3 layers → `assets/pm_fauna/textures/entity/pm/<species>/`

Each set is `<slot>` albedo, `<slot>_mers` (RGBA TGA) and `<slot>_normal`.

| Species | Slots |
|---|---|
| Cow | `holstein`, `hereford`, `brahman`, `gir`, `highland_red`, `highland_dun`, `calf_temperate`, `calf_warm`, `calf_cold` |
| Chicken | `leghorn_hen`, `leghorn_rooster`, `rhode_island_red_hen`, `rhode_island_red_rooster`, `brahma_hen`, `brahma_rooster`, `chick_temperate`, `chick_warm`, `chick_cold` |
| Pig | `large_white`, `duroc`, `mangalica`, `piglet_temperate`, `piglet_warm`, `piglet_cold`, `saddle` (painted on your pig's UVs) |
| Sheep | `sheep`, `lamb` (RGBA TGA with the wool dye mask: wool alpha 255, skin alpha 3) |

**Xbox Series X budget.** `import-texture` downscales every layer to **512 px** on the longest edge by
default (256 px is plenty for a mob seen at farm distance). The build warns above **160 cubes** per model,
because dozens of animals render at once. All 27 sets at 512 px come to about 85 MB of texture memory, so
the limit protects frame time rather than memory.

Breeds are display names only. To use different breeds, rename the texture paths in the entity file and
its texture set in one commit.

### Where to get them

| Source | Status | Fit | Notes |
|---|---|---|---|
| **Commission or author in Blockbench** (Bedrock Entity format, "Create Material" for texture sets) | Microsoft documents the Blockbench PBR workflow | Best: you own the full breed matrix and its licence | Matches the slot contract exactly. Paint MERS by hand or derive it from photo reference. Use the calibration table in [ARCHITECTURE.md §3](ARCHITECTURE.md#3-pillar-1-pbr-materials). |
| Better Farm Animals by parzival0312 (MCPEDL) | **Listed**: Bedrock, v0.9, updated 24 Sep 2026 | Cow, pig, sheep, chicken models with at least two texture variants each | Licence not confirmed; ask the author before redistributing on a Realm. A user comment reports oversized chicks, the baby-scale issue `pmtool` warns about. |
| Better Animals Plus (Bedrock port) | **Listed**, attribution unclear (mc-mod.net post vs a 9Minecraft listing under Mrblueyeti) | Cow, pig, chicken with a rooster | Avoid unless you can confirm who owns it and get permission |
| Realistic Animals (CurseForge) | **Listed**: Java Edition, needs EMF/ETF | Not usable directly | Reference art only |
| "AviArt" | **Not found** | n/a | n/a |

PBR layers for third-party skins usually have to be made: vanilla's own farm-animal MERS files contain only
roughness (and subsurface on wool). Start from the calibration values in ARCHITECTURE.md: hide roughness
~180–205, pig skin ~55–160, wool roughness ~218 with subsurface ~190, plus subsurface on ears, combs and
wattles for back-lit glow in Vibrant Visuals.

---

## C. Field-recorded audio: `assets/pm_audio/sounds/pm/`

Import with `pmtool convert-audio --slot <slot> --src <files or folder>`. It trims silence, normalises
loudness, and writes mono OGG for positional slots. Run `pmtool status` for the live list.

| Slot | Takes | Event(s) | What to record or source |
|---|---|---|---|
| `cow/moo_dairy` | 8 | `mob.cow.say` | Dairy cow moos: 5 short, 3 long bellows |
| `cow/moo_deep` | 6 | `mob.moody_cow.say` | Beef or bull-type low moos |
| `cow/hurt`, `cow/hurt_deep`, `cow/death` | 4 / 3 / 2 | hurt/death | Distressed bellows |
| `cow/hoof_grass` | 6 | `mob.cow.step` | Hooves on pasture |
| `cow/milk_squirt` | 3 | `mob.cow.milk` | Hand milking into a pail |
| `cow/calf_bawl`, `cow/calf_hurt` | 5 / 2 | calf events | Calves calling |
| `chicken/hen_cluck` | 10 | `mob.chicken.say` | 6 contented clucks, 2 "bawk" alerts, 2 purrs/trills |
| `chicken/hen_squawk` | 4 | `mob.chicken.hurt` | Startled hen |
| `chicken/egg_song` | 3 | `mob.chicken.plop` | Post-laying cackle |
| `chicken/egg_thud` | 2 | rooster plop | Soft straw thud |
| `chicken/scratch_step` | 4 | `mob.chicken.step` | Scratching and stepping on litter |
| `chicken/rooster_cluck`, `rooster_squawk`, `rooster_death` | 6 / 3 / 1 | `mob.picky_chicken.*` | Rooster grumbles and tidbitting calls |
| `chicken/rooster_crow` | 6 | dawn chorus | 4 full crows, 2 short or broken crows |
| `chicken/chick_peep`, `chick_distress` | 6 / 3 | `mob.baby_chicken.*` | Chicks |
| `pig/grunt`, `squeal`, `squeal_long` | 8 / 3 / 1 | sow events | Grunts while rooting; squeals |
| `pig/boar_grunt`, `boar_squeal`, `boar_death` | 6 / 3 / 1 | `mob.big_pig.*` | Boar |
| `pig/gilt_grunt`, `gilt_squeal` | 6 / 3 | `mob.mini_pig.*` | Young pigs |
| `pig/eat_chomp`, `pig/trotter` | 3 / 5 | eat/step | Trough feeding; trotters |
| `pig/piglet_squeak`, `piglet_squeal` | 6 / 3 | `mob.baby_pig.*` | Piglets |
| `sheep/bleat_ewe`, `bleat_distress`, `bleat_lamb` | 8 / 3 / 6 | sheep and lamb events | Ewes, distress, lambs |
| `sheep/hoof`, `sheep/shear` | 5 / 2 | step/shear | Hooves; hand shears on fleece |
| `step/grass, gravel, stone, wood, sand, snow` | 8/6/8/8/6/6 | player footsteps | Boots on each surface, consistent mic distance |
| `ambient/thunder` | 4 | `ambient.weather.thunder` | Distant and near thunder, streamed |
| `ambient/grassland_loop`, `forest_loop`, `shore_loop` | 1 each | biome beds (stereo, `--lufs -23`) | Seamless 60–120 s loops: wind in grass, canopy, surf |
| `ambient/grassland_birds`, `forest_birds`, `shore_gulls` | 8 / 8 / 6 | biome additions (stereo) | Sparse distant birdsong and gulls |

### Where to get them

| Source | Redistribution on a Realm | Notes |
|---|---|---|
| **Your own recordings** at a farm | Yes, you own them | Best match for the slot list. Record mono at 48 kHz, 1–3 m from the animal, and avoid wind. |
| **Freesound.org**, filtered to **CC0** | Yes | Filter by licence. CC-BY also works if you add attribution in `assets/pm_audio/CREDITS.txt`. Avoid NC licences for anything you might share publicly. |
| Sonniss GDC Game Audio Bundles | Probably yes, embedded in your project | Royalty-free and commercial use is allowed. You may not resell files as-is or redistribute them as a standalone library. Terms change each year, and the 2024 terms ban AI training. Read that year's licence. |
| BBC Sound Effects (RemArc licence) | **Doubtful** | Personal, educational and research use only. Shipping files to Realm members goes beyond that, so don't use these for a shared Realm. |
| Parallax Sounds (Modrinth) | **Listed**: described as a Bedrock pack ported to Java; licence and farm-animal coverage unconfirmed | Use as a reference or source only after reading its licence |
| Environment Sounds (9Minecraft listing, Bedrock 1.26.30+) | **Listed**: partial animal coverage, original author unconfirmed | Not recommended until the source is confirmed |

---

## Assembly checklist

1. `python3 tools/pmtool.py fetch-vanilla`
2. Extract each vendor `.mcpack` (it is a zip) into `vendor/<name>/` and copy the vendor licence next to its manifest.
3. Import models, textures and audio; check with `pmtool status`.
4. Put attribution text in `assets/pm_fauna/CREDITS.txt` and `assets/pm_audio/CREDITS.txt`.
5. `pmtool build` (the `xbox` profile) must report **0 errors**.
6. Continue with [DEPLOYMENT.md](DEPLOYMENT.md).

## Sources

* Vanilla RTX repository and licence: <https://github.com/Cubeir/Vanilla-RTX>, <https://github.com/Cubeir/Vanilla-RTX/blob/master/LICENSE.txt>
* Vanilla PBR (Vibrant Visuals) repository: <https://github.com/vanilla-rtx/Vanilla-PBR>
* Legendary Bedrock PBR Textures: <https://legendaryrttextures.com/project/legendary-bedrock-pbr-textures/>
* Optimum Realism for Bedrock: <https://www.curseforge.com/minecraft-bedrock/texture-packs/optimum-realism-bedrock>
* Enhanced Vibrant Visuals: <https://www.curseforge.com/minecraft-bedrock/texture-packs/enhanced-vibrant-visuals-official>
* PrizmaRTX listing: <https://mcpedl.com/lumenrtx/>. Prizma Visuals 2.0: <https://starfishstudios.notion.site/Prizma-Visuals-2-0-Resource-Pack-279a9a61c3f1804390d3df9fd2cb6d21>
* Better Farm Animals (Bedrock): <https://mcpedl.com/remodeled-default/>
* Better Animals Plus listings: <https://www.mc-mod.net/?p=381876>, <https://www.9minecraft.net/creator/mrblueyeti/>
* Realistic Animals (Java): <https://www.curseforge.com/minecraft/texture-packs/realistic-animals>
* Parallax Sounds: <https://modrinth.com/resourcepack/parallax-sounds>
* Environment Sounds listing: <https://www.9minecraft.net/environment-sounds-resource-pack-mcpe/>
* Sonniss licence coverage: <https://gamefromscratch.com/sonniss-27-5gb-sound-effect-giveaway-at-gdc-2024/>, <https://licenseorg.com/guide/music-audio/sonniss>
* BBC Sound Effects / RemArc: <https://www.diyphotography.net/the-bbc-sound-effects-archive-is-now-free-to-download-with-over-33000-files/>
* Blockbench PBR workflow (Microsoft): `creator/Documents/VibrantVisuals/UseBlockbenchToCreateModelsWithTextures.md` in <https://github.com/MicrosoftDocs/minecraft-creator>
