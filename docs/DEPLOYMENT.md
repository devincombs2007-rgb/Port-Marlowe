# Realm Deployment & Validation Guide

Goal: a `.mcworld` that loads on every Realm member's device without pack-sync failures. RTX PCs get path
tracing, and every other supported device gets Vibrant Visuals.

## 0. Prerequisites

* Python 3.9+, `python3 -m pip install Pillow`, `ffmpeg` with libvorbis (audio import only), `git`
* Minecraft Bedrock **1.26.50 or newer** on the machine you build and test on. Realms run the current release.
* For RTX testing: Windows with a DirectX ray tracing GPU (GeForce RTX 20 series or newer, Radeon RX 6000 or newer)

## 1. Assemble the packs

```bash
python3 tools/pmtool.py fetch-vanilla                 # Mojang bedrock-samples v1.26.50.4 into .cache/
# vendor block PBR (see SOURCING.md): unzip the .mcpack so manifest.json is at the folder root
mkdir -p vendor/vanilla_rtx_opus && unzip Vanilla-RTX-Opus.mcpack -d vendor/vanilla_rtx_opus
cp LICENSE.txt vendor/vanilla_rtx_opus/               # Vanilla RTX licence requires it

# fauna: one call per slot (pmtool status prints every slot)
python3 tools/pmtool.py import-model   --species cow --slot temperate --src ~/models/holstein.geo.json
python3 tools/pmtool.py import-texture --species cow --slot holstein \
        --albedo holstein.png --mers holstein_mers.png --normal holstein_n.png --max-size 256
# audio: whole folders map onto numbered takes
python3 tools/pmtool.py convert-audio --slot chicken/rooster_crow --src ~/recordings/rooster/
python3 tools/pmtool.py convert-audio --slot ambient/grassland_loop --src meadow_loop.wav --lufs -23

python3 tools/pmtool.py status                        # what is still missing
python3 tools/pmtool.py build --profile hybrid        # must end with "0 error(s)"
```

Missing assets are not fatal. An incomplete species is left vanilla, and a missing sound keeps the vanilla
sound. The build log lists each fallback. Ship when you're happy with what's filled.

## 2. Create the base world

1. In Minecraft: **Create New World**. Set the world name, seed and game rules you want.
2. Leave **every Experiment off**. Port Marlowe needs none, and experimental worlds limit Realm options.
3. Do **not** add resource packs here. The pipeline injects them.
4. Create the world, let spawn generate, exit.
5. **Edit World → Export World** to save `PortMarlowe_base.mcworld`.

## 3. Inject the stack and package

```bash
python3 tools/pmtool.py package-world --profile hybrid \
        --world ~/Downloads/PortMarlowe_base.mcworld --out build/PortMarlowe.mcworld
```

`package-world` re-roots the archive if `level.dat` was nested inside a folder. It copies every pack into
`resource_packs/<folder ≤10 chars>/` and writes `world_resource_packs.json` in priority order. It also
checks that every listed `pack_id` and version is physically inside the world. If any check fails it writes
nothing. Use `--drop-unknown` to remove stale entries for packs that are not in the world.

## 4. Load and verify locally (before the Realm)

Open `build/PortMarlowe.mcworld` with Minecraft. Double-click it on Windows, or "Open with Minecraft" on
mobile.

### 4.1 Pack stack and logs

* **Edit World → Resource Packs → Active**, top to bottom: `Port Marlowe: Fauna`, `Port Marlowe: Audio`,
  `Port Marlowe: Atmosphere`, then the vendor pack. The first entry in `world_resource_packs.json` is the top.
* **Settings → Creator**: enable the **Content Log GUI** and **Content Log File**. Load the world. There
  should be no errors mentioning `pm_`, `texture_set`, `geometry.pm`, `controller.render.pm` or `sound`.
  Any `CONTENT_ERROR` on a texture set means that set is ignored in game.
* Settings → **Global Resources**: disable global packs that also change blocks, entities or sounds. Ask
  Realm members to do the same, because a global pack can override the same files.

### 4.2 Vibrant Visuals

* **Settings → Video → Graphics Mode → Vibrant Visuals.** Turning on **Allow In-Game Graphics Mode
  Switching** lets you toggle from inside the world.
* Checks:
  * [ ] Water shows moving waves and caustics on the bed. Vanilla ships waves off; Port Marlowe turns them on.
  * [ ] Rivers look silty, swamps tea-brown, warm oceans turquoise and clear (`/locate biome river`,
        `/locate biome mangrove_swamp`, `/locate biome warm_ocean`)
  * [ ] Torches cast warm orange-white light; soul lanterns cast cyan light
  * [ ] Shadows are soft
  * [ ] Colors are slightly richer than vanilla VV without crushed blacks. If not, tune
        `config/atmosphere_profile.json` and rebuild.

### 4.3 Ray tracing (hybrid profile, RTX PC)

* **Settings → Video → Graphics Mode → Ray Tracing.** The option appears only when a `raytraced` pack is
  active, so it is unavailable in the `vibrant` profiles.
* If ray tracing will not activate, use the workaround Vanilla RTX documents for issues MCPE-191513 and
  MCPE-121850. In the main menu, turn on **Allow In-Game Graphics Mode Switching**, join any world, enable
  Ray Tracing, exit to the menu and rejoin. Leave ray tracing on afterwards.
* Checks:
  * [ ] Glowstone, lava and torches light their surroundings
  * [ ] Metal blocks reflect
  * [ ] Water refracts
  * [ ] Animals render with texture detail. If they look flat or overly shiny in RTX, set
        `"fauna_material_mode": "mer"` and rebuild (RTX ignores the subsurface channel).

### 4.4 Animals

Spawn eggs and `/summon` both run `minecraft:entity_spawned`, which picks the climate from the biome.

| Test | How | Expected |
|---|---|---|
| Temperate breeds | In plains: `/summon cow ~ ~ ~` ×10 | About half Holstein, half Hereford |
| Warm breeds | `/locate biome savanna`, go there, summon ×10 | Brahman and Gir (zebu shapes) |
| Cold breeds | `/locate biome taiga` (or snowy plains), summon ×10 | Red and dun Highlands |
| Chickens | Summon ×10 per climate | About 50% roosters (comb, sickle tail) |
| Pigs | Summon ×12 | Three sizes (`big` ×1.08, `mini` ×0.9) |
| Babies | Breed a pair (wheat, carrots, seeds) | Calves, chicks and piglets at natural size. Oversized babies mean the baby model was authored at adult size. |
| Sheep dye | Dye a sheep red | Wool turns red; face and legs stay natural |
| Saddle | Saddle a pig | Saddle sits on the body without z-fighting or misplacement |
| Normal-map direction | `/time set 23500` (low sun); look at a ridged hide or wool from the sun side | Ridges are lit on the sun-facing side. If they're lit on the far side, re-import with `--flip-normal-green`. |

### 4.5 Audio

* Turn on **Settings → Accessibility → Subtitles**. Overridden events keep vanilla subtitle keys.
* Direct checks: `/playsound pm.chicken.rooster_crow @s`, `/playsound mob.cow.say @s`, `/playsound step.grass @s`
* [ ] Walk away from a cow. Its moo should be full volume within 4 blocks and fade out by 48.
* [ ] **Dawn chorus:** `/gamerule dodaylightcycle true`, `/time set 22800`, stand near a few roosters.
  Within about two minutes of game time you should hear 2–3 crows per rooster, staggered.
* [ ] Calves and lambs sound young but natural. If not, adjust the `baby` variant pitch in `packs/pm_audio/sounds.json`.
* [ ] Plains, forest and shore play their ambience bed, if you supplied one.

## 5. Push to the Realm

1. **Back up the Realm first**: Realms → Edit Realm (pencil) → download the current world.
2. Realms → Edit Realm → **Replace World** → select the local Port Marlowe world (the one you just verified).
   Bedrock uploads the world together with its `resource_packs/`.
3. When the Realm restarts, join from a **second device**, ideally a phone or console, and accept the
   resource pack download prompt. Repeat 4.1 and a few checks from 4.2 and 4.4 there.
4. Tell members to accept the pack download and to disable conflicting Global Resources.

## 6. Updating later

Clients cache packs by **UUID + version**. If you change files without bumping the version, members keep
the stale copy or fail the sync.

```bash
python3 tools/pmtool.py bump                 # patch +1 on every first-party pack (header + modules)
python3 tools/pmtool.py build --profile hybrid
```

Then either run `package-world` against a fresh export of the current Realm world (download it first) and
replace the world again, or open the local world, re-apply the updated packs, and replace.

## 7. Pack-sync and loading troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Members stuck at "Downloading resource packs" or the sync fails | `world_resource_packs.json` lists a UUID or version that is not inside `resource_packs/` | Re-run `package-world`; it refuses to write such a world |
| Pack missing on Xbox only | Pack folder name longer than 10 characters | Folder names come from `config/build.json`; the validator enforces the limit |
| Members still see the old version | Version not bumped | `pmtool bump`, rebuild, replace |
| "Duplicate pack" or import errors | Same UUID in two packs | The build fails on duplicate UUIDs across the whole stack |
| Pack rejected for engine version | Pack `min_engine_version` is newer than the client or Realm | Keep `target_engine_version` in `config/build.json` at the Realm's version |
| Vibrant Visuals greyed out | Unsupported device, a non-PBR pack (often a member's global pack), or in-game switching disabled | Check device support; disable non-PBR global packs; every Port Marlowe pack declares `pbr` |
| No Ray Tracing option | `vibrant` profile (no `raytraced` pack), non-RTX hardware, or the activation bug | Use `hybrid`; apply the workaround in 4.3 |
| Animals look vanilla | Species skipped at build because a slot was missing, or another pack overrides the entity | Read the build log and `pmtool status`; remove conflicting packs |
| Invisible or mangled animal | Missing bones or a bad geometry identifier | Errors in the build log name the bone; re-import with `import-model` |
| Silent animal | Definition pruned and fallback missing | The build log lists pruned definitions; add files or a `sound_fallbacks` entry |
| Hard color jumps at biome borders | Mixed tone-mapping operators across the stack | The build warns; give every grading file the same operator |
