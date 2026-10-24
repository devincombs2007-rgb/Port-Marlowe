# Realm Deployment & Validation Guide (Xbox Series X)

Goal: a Realm that plays on an **Xbox Series X** with Vibrant Visuals, realistic animals and field-recorded
audio, with no pack-sync failures.

**The route:** build the packs → install them on your **phone** → apply them to a phone copy of the Realm
world → **Replace World** from the phone → play on the Xbox. The Xbox never has to open a file: it downloads
the packs from the Realm when you join.

## 0. What you need

| Item | Why |
|---|---|
| Xbox Series X with Minecraft Bedrock **1.26.50 or newer**, and a **Realms** subscription you own | The console plays the world from the Realm |
| An Android or iPhone with **Minecraft Bedrock**, signed in to the **same Microsoft account** as the Realm owner | **Consoles cannot open pack or world files.** The phone imports the packs and uploads the world to the Realm. |
| Somewhere to run `pmtool` (Python 3.9+, Pillow, ffmpeg) | Builds the packs. No computer? This Claude Code session can run the build and send the finished `.mcaddon` straight to your phone. |

## 1. Build the phone bundle

```bash
python3 tools/pmtool.py fetch-vanilla      # Mojang bedrock-samples v1.26.50.4 into .cache/
# vendor/vibrant_normals/ and vendor/vanilla_vibrant_visuals/ hold the two block packs (see SOURCING.md)
python3 tools/pmtool.py status             # which animal/audio slots are still empty
python3 tools/pmtool.py build              # xbox profile; must end with "0 error(s)"
```

The file to put on the phone is **`build/xbox/dist/port_marlowe_xbox.mcaddon`**. One file installs every pack
in the stack.

What the build does for the phone route:

* **Lighting-only repack.** Vanilla Vibrant Visuals offers two subpacks with the same memory tier. Microsoft
  documents that a device picks the *last* subpack listed when tiers tie, which in this pack is the
  full-texture one, not the lighting-only one this stack needs. The build therefore merges the lighting-only
  subpack into a standalone pack, *Vanilla Vibrant Visuals: Lighting Only (No Textures) [Port Marlowe repack]*.
  It has its own UUID, credits Cubeir, and includes the licence, as the Vanilla RTX licence asks of
  modified copies. There is no subpack setting for you to get wrong on the phone or the Xbox.
* **No empty packs.** Until animal models or recordings are imported, Port Marlowe: Fauna and Port
  Marlowe: Audio are left out of the bundle, so you only install packs that do something. Re-run the build
  after importing assets and they appear.
* **Budget check.** The texture budget table must say *fits* for tier 4 (Xbox Series X).

Visuals-only bundle (October 2026, Port Marlowe: Atmosphere 1.0.1 with full-detail water): Port Marlowe:
Atmosphere, Vibrant Normals, and the lighting-only repack. About 3 MB to download, about 7 MB of the 3 GB
texture budget.

## 2. Install the bundle on the phone

* **Android:** save the `.mcaddon` to internal storage (Downloads). Open it from the **Files** app →
  **Open with Minecraft**. If the download was renamed to `.zip`, rename it back to `.mcaddon` first.
* **iPhone:** save it to the **Files** app, tap it, then **Share → Minecraft** (or *Open in Minecraft*).

Minecraft shows one "Import started / successfully imported" message per pack. Don't switch the packs on
under Settings → **Global Resources**; they belong to the world, not the whole game.

## 3. Apply the packs to the Realm world (on the phone)

1. Make sure nobody is playing on the Realm, so no progress is lost.
2. **Realms → Edit Realm (pencil) → Download World.** This gives you a local copy and a backup.
3. **Play → Worlds →** pencil on the downloaded copy → **Resource Packs → Available/My Packs**: activate the
   Port Marlowe packs, then use the arrows so **Active** reads, top to bottom:
   1. Port Marlowe: Fauna *(once animal assets exist)*
   2. Port Marlowe: Audio *(once recordings exist)*
   3. Port Marlowe: Atmosphere
   4. Vibrant Normals
   5. Vanilla Vibrant Visuals: Lighting Only (No Textures) [Port Marlowe repack]
4. Leave **Experiments off**. Port Marlowe needs none.
5. Optional check: **Settings → Creator → Enable Content Log GUI**, open the world once on the phone, and
   confirm there are no errors mentioning `pm_`, `texture_set`, `geometry.pm` or `sound`. The phone may
   not run Vibrant Visuals itself; that's fine, the Xbox does.
6. Back out, then **Realms → Edit Realm → Replace World** → pick that world → confirm. The phone uploads
   the world **with** its resource packs.

Some phones also show **Edit Realm → Resource Packs** for applying packs to the Realm directly. If yours
does, that works too, but Replace World is the route recent guides report as reliable for custom packs.

## 4. Set up the Xbox for the best picture

Vibrant Visuals **is** the shader on Xbox. These settings get the most out of it on a Series X:

1. **Settings → Video → Graphics Mode → Vibrant Visuals**, preset **Favor Visuals**.
2. Expand **Vibrant Visuals Options** and max them: shadow quality, point light quality, volumetric fog
   quality and reflections at their highest level (Ultra), bloom at 100%, upscaling **TAAU** with the
   resolution at native/100%. These labels come from published setting guides; Mojang may word them slightly
   differently in your version.
3. **Render distance 16–20 chunks.** This is the main frame-rate lever. Players report that Series X
   doesn't hold 60 fps at Ultra with 24 chunks, and distance costs far more than texture detail. Everything
   Port Marlowe adds (water, colour, lights, the rooster chorus at up to 96 blocks) shows fully inside 16 chunks.
4. If it stutters, lower render distance first, then reflections, then volumetric fog. Ask for the
   `xbox_lite` bundle (lighter water) only if water is still the problem.
5. **Settings → Global Resources**: deactivate any global pack that changes blocks, entities or sounds. A
   global pack can override the same files.
4. **Settings → Creator → Enable Content Log GUI**, for the first session at least. On Xbox, read past
   messages from the **Profile** screen → **Content Log History** (the Ctrl+H shortcut is keyboard-only).
5. Join the Realm and **accept the resource pack download**.

### About "shaders" on Xbox

Bedrock "shader packs" come in two kinds:

* **Packs that replace Minecraft's own render files** (often called RenderDragon or `material.bin`
  shaders). They need a patched game install, which a console can't have, so they never work on Xbox.
* **Vibrant Visuals packs**: ordinary resource packs that tune lighting, sky, fog, water and colour through
  JSON. These do work on Xbox. Port Marlowe: Atmosphere plus the Vanilla Vibrant Visuals lighting pack already
  fill this role. Adding a second lighting or "shader" pack on top would fight them for the same biome
  settings, so pick one look.

### Optional: sharper, more realistic blocks

Vibrant Normals keeps vanilla's 16-pixel textures and adds depth. For photo-real blocks, add a high-resolution
Vibrant Visuals block pack on your phone (candidates in SOURCING.md) and stack it like this:

1. Port Marlowe: Atmosphere
2. **your high-resolution block pack**
3. Vibrant Normals (keep it: it covers any block the high-res pack leaves out)
4. Vanilla Vibrant Visuals: Lighting Only [Port Marlowe repack]

Rules for Xbox:
* Use the **64x or 128x** version. 256x fits the Series X memory budget (1.2 GB per pack) but makes the
  Realm download much bigger. 512x does not fit.
* It must say it supports **Vibrant Visuals** (`pbr`). An RTX-only pack does nothing on Xbox.
* Check its terms allow sharing. A Realm hands the pack to every member who joins, and some paid or Patreon
  packs forbid that.

## 5. Verify

### 5.1 On the Xbox, no cheats needed

The animal and audio checks apply once Port Marlowe: Fauna and Port Marlowe: Audio are in the bundle.

* [ ] Content Log History shows no errors from the Port Marlowe packs
* [ ] **Water**: moving waves and caustics on the bed. Rivers look silty, swamps tea-brown, warm oceans turquoise.
* [ ] **Light**: torches warm orange-white, soul lanterns cyan, sea lanterns aqua, portals and amethyst
      purple, glow-berry caves golden; shadows soft; colors richer than default Vibrant Visuals without
      crushed blacks. Bright areas lean slightly warm, shade slightly cool.
* [ ] **Sun and moon**: at noon, shadows still fall at an angle (tilted sun path); moonlit nights are dark
      but readable
* [ ] **Fog and light shafts**: sunbeams through forest canopies in the morning and evening; mist lying low
      over swamps and rivers; cloud pooled in mountain valleys with clear peaks; light haze over plains
      and the sea; the world greys out in a rainstorm; light rays underwater, clearer in tropical seas
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
* [ ] **Frame rate** holds at the farm, by water, and in a forest at sunset. If not, see §6.

### 5.2 Command checks (phone copy, or a Realm with cheats on)

Enabling cheats on the Realm permanently disables achievements for that world, so run these on the phone's
local copy from §3 unless you don't mind.

| Test | Command | Expected |
|---|---|---|
| Breeds per climate | `/summon cow ~ ~ ~` ×10 in plains, then after `/locate biome savanna` and `/locate biome taiga` | Two breeds per climate, about 50/50 |
| Rooster crow file | `/playsound pm.chicken.rooster_crow @s` | A crow |
| Dawn window | `/gamerule dodaylightcycle true`, `/time set 22800` | Crows begin within about two minutes of game time |
| Normal-map direction | `/time set 23500` (low sun); look at a ridged hide from the sun side | Ridges are lit on the sun-facing side. If they're lit on the far side, re-import with `--flip-normal-green`. |

## 6. Performance tuning for Series X

Change one thing at a time, rebuild, re-upload and compare.

| Symptom | Knob |
|---|---|
| Frame drops looking at water | Build `--profile xbox_lite` (16 wave octaves instead of 28). If that's still too heavy, set `water.waves.enabled` to `false` in `config/atmosphere_profile.json` (vanilla's own setting). Run `pmtool bump` first so the phone accepts the new file. |
| Frame drops at big farms | Re-import animal textures at `--max-size 256`; keep models under the 160-cube warning; fewer animals per pen |
| Frame drops everywhere | *Favor Performance* preset; render distance 12–16 |
| Shadows look worse than they cost | Delete `packs/pm_atmos/shadows/global.json`, which hands shadows back to the vendor's blocky style |
| Colors too strong | Lower the `saturation_scale` / `contrast_scale` values in `config/atmosphere_profile.json` |
| Fog too thick or too thin | `fog.groups[].air.max_density` per biome group, `fog.rain_haze.max_density`, `fog.underwater` in `config/atmosphere_profile.json` |
| Light shafts too strong or too weak | `henyey_greenstein_g` per fog group (0.6 soft, 0.85 strong) |
| Prefer the sun straight overhead | `lighting.orbital_offset_degrees` to `0.0` |
| Nights too bright or too dark | `lighting.moon_illuminance_scale` (1.0 = the lighting pack's own moon) |
| Warm/cool tint unwanted | Delete `color_grading.split_toning` |

## 7. Updating later

Clients, including the Xbox, cache packs by **UUID + version**. Changing files without bumping the version
leaves players on the stale copy or fails the sync.

```bash
python3 tools/pmtool.py bump          # patch +1 on every first-party pack (header + modules)
python3 tools/pmtool.py build
```

Then, on the phone:

1. Import the new `port_marlowe_xbox.mcaddon`. A higher version replaces the old one.
2. **Download the current Realm world** again (§3, step 2) so you keep everything built since the last upload.
3. Edit World → Resource Packs: deactivate the Port Marlowe packs, activate them again (now the new
   version), and check the order.
4. **Replace World**.

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Xbox stuck at "Downloading resource packs", or the sync fails | The world lists a pack version that wasn't uploaded with it | On the phone: deactivate and reactivate the packs in Edit World, then Replace World again |
| Tapping the `.mcaddon` on Android does nothing or opens a zip viewer | The download was renamed to `.zip`, or it was saved to an SD card Minecraft can't read | Rename to `.mcaddon`, move it to internal Downloads, open with Minecraft |
| "Duplicate pack" or the import is skipped on the phone | Same UUID and version already installed | `pmtool bump`, rebuild, import again |
| Packs missing on Xbox only | Pack folder name longer than 10 characters | Folder names come from `config/build.json`; the validator enforces the limit |
| Xbox still shows the old version | Version not bumped | `pmtool bump`, rebuild, replace |
| No Vibrant Visuals option | Graphics Mode setting, or a non-PBR global pack active | Check Settings → Video; deactivate non-PBR global packs (every Port Marlowe and vendor pack declares `pbr`) |
| Looking for Ray Tracing on Xbox | Not supported on consoles | Expected. Vibrant Visuals is the Xbox pipeline. |
| Lighting looks like plain vanilla Vibrant Visuals | The lighting-only repack is not active, or sits above Port Marlowe: Atmosphere | Fix the order in Edit World (§3) and Replace World |
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

## Appendix: `.mcworld` route (needs a computer)

If you later have a computer, `pmtool package-world` can bake the packs into an exported world instead of
activating them by hand on the phone:

```bash
python3 tools/pmtool.py package-world --world PortMarlowe_base.mcworld --out build/PortMarlowe.mcworld
```

It re-roots archives where `level.dat` sits inside a folder, copies the packs into `resource_packs/`
(folder names ≤ 10 characters, an Xbox requirement), writes `world_resource_packs.json` in priority order,
and refuses to write a world that lists a pack it doesn't contain. Open the result on the phone, then Replace
World as in §3.
