# Port Marlowe

A Realm world for **Xbox Series X** with a realistic, vibrant **Vibrant Visuals** overhaul. It is delivered
as configuration plus a build pipeline rather than as baked art:

1. **PBR materials and atmosphere.** Hand-drawn normal maps on every block, tuned Vibrant Visuals lighting,
   per-biome vivid color grading, six physically-parameterised water bodies with waves and caustics, soft
   shadows, and colored block light.
2. **Realistic farm animals.** Cows, chickens, pigs and sheep come in breeds (Holstein, Hereford, Brahman,
   Gir, Highland; Leghorn, Rhode Island Red and Brahma hens and roosters; Large White, Duroc, Mangalica)
   with MERS/normal materials. Breeds come from vanilla's own server-synced variant properties, so every
   Realm member sees the same animal, and no behavior pack or experiment is needed.
3. **Field-recorded audio.** Weighted take pools, explicit attenuation radii, natural pitch ranges,
   calf/lamb/chick/piglet voices, a dawn rooster chorus, footsteps and biome ambience beds.

No textures, models or audio are included. They come from the community packs and recordings listed in
[docs/SOURCING.md](docs/SOURCING.md), and `tools/pmtool.py` imports, validates and packages them.

## Xbox Series X at a glance

| | |
|---|---|
| Graphics mode | **Vibrant Visuals** (supported on Series X\|S). Ray tracing (RTX) is Windows-only and never appears on Xbox. |
| Memory class | Memory Performance **Tier 4**: 1.2 GB texture budget per resource pack, 3 GB per world. The build checks both. |
| Getting it onto the console | Consoles can't open pack files. Install the one-file bundle on your **phone**, apply it to the Realm world there, **Replace World**, then join from the Xbox. |
| Suggested in-game settings | Vibrant Visuals on, render distance **16–20 chunks**; switch the preset to *Favor Performance* if frame rate dips |

## Repository layout

```
config/
  build.json                 Xbox target (tier 4 budgets), pinned vanilla version, vendor packs, profiles
  atmosphere_profile.json    vivid grading factors, water waves, biome→water rules, biome ambience rules
packs/                       first-party resource packs (authored JSON only)
  pm_fauna/                  client entities, render controllers, rooster crow controller, 27 texture sets
  pm_audio/                  sounds.json, sounds/sound_definitions.json (55 definitions)
  pm_atmos/                  water, shadows, PBR fallbacks, local lighting (biomes and grading generated)
templates/blocks/            block texture-set templates (Vibrant Visuals MERS; RTX MER for PC guests)
tools/pmtool.py              the pipeline (validate, import, build, package)
assets/                      ← drop-in slots for sourced models, textures, audio (git-ignored binaries)
vendor/                      ← drop-in slots for community block packs (git-ignored)
docs/
  ARCHITECTURE.md            Xbox limits, engine facts, exact schemas, design decisions
  SOURCING.md                what goes in every slot, where to get it, licences
  DEPLOYMENT.md              build → .mcworld → Realm → Xbox, verification, troubleshooting
```

## Quick start

```bash
python3 -m pip install Pillow                       # ffmpeg with libvorbis is also needed for audio
python3 tools/pmtool.py fetch-vanilla               # Mojang bedrock-samples v1.26.50.4
python3 tools/pmtool.py status                      # every empty slot
# …drop vendor packs into vendor/, import assets (see docs/SOURCING.md)…
python3 tools/pmtool.py build                       # xbox profile: validate, assemble, biome remaps, budgets
# → build/xbox/dist/port_marlowe_xbox.mcaddon  (the one file your phone needs)
```

Then follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): install on the phone, apply to the Realm world,
Replace World, verify on the Xbox.

## Pack stack, `xbox` profile (top = highest priority)

| # | Folder | Pack | Capability |
|---|---|---|---|
| 1 | `pm_fauna` | Port Marlowe: Fauna | `pbr` |
| 2 | `pm_audio` | Port Marlowe: Audio | `pbr` |
| 3 | `pm_atmos` | Port Marlowe: Atmosphere | `pbr` |
| 4 | `vnd_vvn` | Vibrant Normals: hand-drawn 16x normals for every block | `pbr` |
| 5 | `vnd_vvv` | Vanilla Vibrant Visuals: Lighting Only, repackaged by the build as a standalone pack so no device has to pick a subpack | `pbr` |

Other profiles: `vibrant` (Vanilla Vibrant Visuals with its own textures) and `hybrid` (Vanilla RTX, only
useful if PC players with RTX GPUs also join).

## Things to know up front

* **Partial builds are safe.** A species with any missing slot stays vanilla, and a sound with no recordings
  keeps the vanilla sound. The world is shippable at every stage.
* **Licences matter on a Realm.** Members download every pack, so each asset must allow redistribution.
  SOURCING.md marks which sources were verified and what their licences allow.
* **No in-game test has been run yet.** Every check so far is static. DEPLOYMENT.md has the on-console checklist.
