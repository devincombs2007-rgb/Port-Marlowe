# Realm Deployment & Validation Guide (Xbox Series X)

Goal: a Realm that plays on an **Xbox Series X** with Vibrant Visuals, realistic animals and field-recorded
audio, with no pack-sync failures.

## 0. What you need

| Item | Why |
|---|---|
| Xbox Series X with Minecraft Bedrock **1.26.50 or newer**, and a **Realms** subscription you own | The console plays the world from the Realm |
| A **bridge device** with Minecraft Bedrock, signed in to the same Microsoft account as the Realm owner: a Windows 10/11 PC (Microsoft's documented console route), or an Android/iOS phone or tablet (these also open `.mcworld` files and have the same Realm settings) | **Consoles cannot open `.mcworld` files.** The bridge device imports the world and uploads it to the Realm. Bedrock on PC or phone is a separate purchase from the Xbox copy. |
| Any computer with Python 3.9+, `pip install Pillow`, `ffmpeg` with libvorbis (audio import), `git` | Runs `pmtool`. It does not need Minecraft. |

There is an unofficial Xbox-only route: the third-party **MC Addons Manager** app from the Xbox Store, plus
the Edge browser to download the file. The guides for it date from 2020–2021 and I could not confirm it
still works, so the Realm route below is the supported one.

## 1. Assemble the packs

```bash
python3 tools/pmtool.py fetch-vanilla                    # Mojang bedrock-samples v1.26.50.4 into .cache/

# vendor packs for the xbox profile (see SOURCING.md); manifest.json must sit at each folder's root
#   vendor/vibrant_normals/          ← Vibrant Normals
#   vendor/vanilla_vibrant_visuals/  ← Vanilla Vibrant Visuals (the build selects its lighting-only subpack "b")
# copy the Vanilla RTX licence file into both folders

# fauna: one call per slot (pmtool status prints every slot). Textures are capped at 512 px for Xbox.
python3 tools/pmtool.py import-model   --species cow --slot temperate --src ~/models/holstein.geo.json
python3 tools/pmtool.py import-texture --species cow --slot holstein \
        --albedo holstein.png --mers holstein_mers.png --normal holstein_n.png --max-size 256
# audio: whole folders map onto numbered takes
python3 tools/pmtool.py convert-audio --slot chicken/rooster_crow --src ~/recordings/rooster/
python3 tools/pmtool.py convert-audio --slot ambient/grassland_loop --src meadow_loop.wav --lufs -23

python3 tools/pmtool.py status                           # what is still missing
python3 tools/pmtool.py build                            # xbox profile; must end with "0 error(s)"
```

The build prints a **texture budget** table. The world must fit tier 4 (Xbox Series X, PS5): 3 GB per
world, 1.2 GB per pack. It also shows whether a Series S (tier 3) guest would fit.

Missing assets are not fatal. An incomplete species is left vanilla, and a missing sound keeps the vanilla
sound. The build log lists each fallback.

## 2. Get the base world onto the bridge device

**If the Realm already holds the world you play in** (keep your builds and progress):

1. On the bridge device: Realms → **Edit Realm** (pencil) → **Download World**. This is also your backup.
2. Edit World on the downloaded copy → **Export World** → `PortMarlowe_base.mcworld`.

**If you are starting fresh:**

1. On the bridge device: **Create New World** with the seed and rules you want, and **every Experiment off**.
   Port Marlowe needs none, and experiments limit Realm options.
2. Don't add resource packs; the pipeline injects them. Let spawn generate, exit, then **Export World**.

## 3. Inject the stack and package

```bash
python3 tools/pmtool.py package-world --world PortMarlowe_base.mcworld --out build/PortMarlowe.mcworld
```

`package-world` re-roots the archive if `level.dat` was nested inside a folder. It copies every pack into
`resource_packs/<folder ≤10 chars>/` (an Xbox path requirement), writes `world_resource_packs.json` in
priority order (with `"subpack": "b"` for Vanilla Vibrant Visuals), and checks that every listed pack and
version is physically inside the world. If any check fails it writes nothing. `--drop-unknown` removes stale
entries for packs that aren't in the world.

## 4. Check on the bridge device, then upload

1. Open `build/PortMarlowe.mcworld` with Minecraft on the bridge device (double-click on Windows, "Open with
   Minecraft" on a phone).
2. **Edit World → Resource Packs → Active** should read, top to bottom: Port Marlowe: Fauna, Port Marlowe:
   Audio, Port Marlowe: Atmosphere, Vibrant Normals, Vanilla Vibrant Visuals (Lighting Only).
3. **Settings → Creator**: enable the Content Log GUI and load the world once. There should be no errors
   mentioning `pm_`, `texture_set`, `geometry.pm`, `controller.render.pm` or `sound`.
4. Optional but worthwhile: run the command-based checks in §6.2 here. Cheats in this local copy don't
   touch the Realm.
5. Realms → **Edit Realm** → **Replace World** → choose the Port Marlowe world. Bedrock uploads it with its
   `resource_packs/`.

## 5. Set up the Xbox

1. **Settings → Video → Graphics Mode → Vibrant Visuals.** Start with the *Favor Visuals* preset. If frame
   rate suffers, switch to *Favor Performance* or turn individual features down under **Vibrant Visuals Options**.
2. **Render distance: 16–20 chunks.** Players report that Vibrant Visuals on Series X tops out around 24–28
   chunks and does not hold 60 fps at Ultra with 24 chunks. The rooster chorus (96 blocks) and every other
   effect fits inside 16 chunks.
3. **Settings → Global Resources**: deactivate any global pack that changes blocks, entities or sounds. A
   global pack can override the same files.
4. **Settings → Creator → Enable Content Log GUI**, for the first session at least. On Xbox, read past
   messages from the **Profile** screen → **Content Log History** (the Ctrl+H shortcut is keyboard-only).
5. Join the Realm and **accept the resource pack download**.

## 6. Verify

### 6.1 On the Xbox, no cheats needed

* [ ] Content Log History shows no errors from the Port Marlowe packs
* [ ] **Water**: moving waves and caustics on the bed. Rivers look silty, swamps tea-brown, warm oceans turquoise.
* [ ] **Light**: torches warm orange-white, soul lanterns cyan; shadows soft; colors richer than default
      Vibrant Visuals without crushed blacks
* [ ] **Blocks**: stone, bricks and planks show relief from the hand-drawn normal maps when the sun is low
* [ ] **Animals**: cows in plains are Holstein or Hereford; in savanna, desert or jungle they are Brahman or
      Gir; in taiga or mountains they are Highland. About half of chickens are roosters (comb, sickle tail).
      Pigs come in three sizes.
* [ ] **Babies** (breed a pair with wheat, carrots or seeds): calves, chicks and piglets at natural size,
      not oversized
* [ ] **Sheep**: dyeing changes the wool only; face and legs stay natural
* [ ] **Saddle** sits correctly on a pig
* [ ] **Dawn chorus**: sleep in a bed near the chickens. You wake around sunrise, roughly the last minute of
      the crow window, so each rooster should crow at least once, staggered. For the full two-minute window,
      stay awake and watch the sky lighten before sunrise.
* [ ] **Audio**: turn on Settings → Accessibility → Subtitles. Walk away from a cow: its moo is full volume
      within 4 blocks and fades out by 48.
* [ ] **Frame rate** holds at the farm, by water, and in a forest at sunset. If not, see §7.

### 6.2 Command checks (bridge-device copy, or a Realm with cheats on)

Enabling cheats on the Realm permanently disables achievements for that world, so run these on the local
copy from §4 unless you don't mind.

| Test | Command | Expected |
|---|---|---|
| Breeds per climate | `/summon cow ~ ~ ~` ×10 in plains, then after `/locate biome savanna` and `/locate biome taiga` | Two breeds per climate, about 50/50 |
| Rooster crow file | `/playsound pm.chicken.rooster_crow @s` | A crow |
| Dawn window | `/gamerule dodaylightcycle true`, `/time set 22800` | Crows begin within about two minutes of game time |
| Normal-map direction | `/time set 23500` (low sun); look at a ridged hide from the sun side | Ridges are lit on the sun-facing side. If they're lit on the far side, re-import with `--flip-normal-green`. |

## 7. Performance tuning for Series X

Change one thing at a time, rebuild, re-upload and compare.

| Symptom | Knob |
|---|---|
| Frame drops looking at water | `config/atmosphere_profile.json` → `water.waves.octaves` 16 → 8, or `"enabled": false` (vanilla's own setting) |
| Frame drops at big farms | Re-import animal textures at `--max-size 256`; keep models under the 160-cube warning; fewer animals per pen |
| Frame drops everywhere | *Favor Performance* preset; render distance 12–16 |
| Shadows look worse than they cost | Delete `packs/pm_atmos/shadows/global.json`, which hands shadows back to the vendor's blocky style |
| Colors too strong | Lower the `saturation_scale` / `contrast_scale` values in `config/atmosphere_profile.json` |

## 8. Updating later

Clients, including the Xbox, cache packs by **UUID + version**. Changing files without bumping the version
leaves players on the stale copy or fails the sync.

```bash
python3 tools/pmtool.py bump          # patch +1 on every first-party pack (header + modules)
python3 tools/pmtool.py build
```

Then **download the current Realm world first** (§2) so you keep everything built since the last upload. Run
`package-world` on that fresh export and Replace World again.

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Xbox stuck at "Downloading resource packs", or the sync fails | `world_resource_packs.json` lists a UUID or version that isn't inside `resource_packs/` | Re-run `package-world`; it refuses to write such a world |
| Packs missing on Xbox only | Pack folder name longer than 10 characters | Folder names come from `config/build.json`; the validator enforces the limit |
| Xbox still shows the old version | Version not bumped | `pmtool bump`, rebuild, replace |
| No Vibrant Visuals option | Graphics Mode setting, or a non-PBR global pack active | Check Settings → Video; deactivate non-PBR global packs (every Port Marlowe and vendor pack declares `pbr`) |
| Looking for Ray Tracing on Xbox | Not supported on consoles | Expected. Vibrant Visuals is the Xbox pipeline. |
| Lighting looks like plain vanilla Vibrant Visuals | Vanilla Vibrant Visuals missing from `vendor/`, or subpack `b` not selected | The build warns when a vendor pack is missing; check the stack in Edit World |
| Animals look vanilla | Species skipped at build because a slot was missing, or a global pack overrides the entity | Read the build log and `pmtool status`; remove conflicting packs |
| Invisible or mangled animal | Missing bones or a bad geometry identifier | Build errors name the bone; re-import with `import-model` |
| Silent animal | Definition pruned and fallback missing | The build log lists pruned definitions; add files or a `sound_fallbacks` entry |
| Hard color jumps at biome borders | A biome still points at a grading with a different tone-mapping operator | The build warns and names it |

## Appendix: PC guests with RTX GPUs

Only relevant if PC players also join. The `hybrid` profile swaps the vendor packs for Vanilla RTX Opus
(`raytraced`). RTX PCs get path tracing, while the Xbox still runs Vibrant Visuals, but with block materials
tuned for path tracing rather than for Vibrant Visuals. The `xbox` profile is the better default for this
Realm. If you do use `hybrid` and ray tracing won't activate on the PC, Vanilla RTX documents a workaround
for MCPE-191513 and MCPE-121850. In the main menu, turn on *Allow In-Game Graphics Mode Switching*, join a
world, enable Ray Tracing, exit to the menu and rejoin.
