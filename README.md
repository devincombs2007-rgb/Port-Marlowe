# Port Marlowe

A Realm-ready Minecraft Bedrock world with a realistic, vibrant visual overhaul, delivered as configuration
plus a build pipeline rather than as baked art:

1. **PBR and ray tracing.** Vibrant Visuals on every supported device and path-traced RTX on capable
   Windows PCs. Port Marlowe adds per-biome vivid color grading, six physically-parameterised water bodies
   with waves and caustics, soft shadows and colored block light, on top of a verified community block-PBR pack.
2. **Realistic farm animals.** Cows, chickens, pigs and sheep come in breeds (Holstein, Hereford, Brahman,
   Gir, Highland; Leghorn, Rhode Island Red and Brahma hens and roosters; Large White, Duroc, Mangalica)
   with MERS/normal materials. Breeds come from vanilla's own server-synced variant properties, so every
   Realm member sees the same animal, and no behavior pack or experiment is needed.
3. **Field-recorded audio.** Weighted take pools, explicit attenuation radii, natural pitch ranges,
   calf/lamb/chick/piglet voices, a dawn rooster chorus, footsteps and biome ambience beds.

No textures, models or audio are included. They come from the community packs and recordings listed in
[docs/SOURCING.md](docs/SOURCING.md), and `tools/pmtool.py` imports, validates and packages them.

## Repository layout

```
config/
  build.json                 pinned vanilla version, pack folders, vendor packs, profiles, fallbacks
  atmosphere_profile.json    vivid grading factors, biome→water rules, biome ambience rules
packs/                       first-party resource packs (authored JSON only)
  pm_fauna/                  client entities, render controllers, rooster crow controller, 27 texture sets
  pm_audio/                  sounds.json, sounds/sound_definitions.json (55 definitions)
  pm_atmos/                  water, shadows, PBR fallbacks, local lighting (biomes and grading generated)
templates/blocks/            block texture-set templates (Vibrant Visuals MERS and RTX MER)
tools/pmtool.py              the pipeline (validate, import, build, package)
assets/                      ← drop-in slots for sourced models, textures, audio (git-ignored binaries)
vendor/                      ← drop-in slots for community block-PBR packs (git-ignored)
docs/
  ARCHITECTURE.md            engine facts, exact schemas, design decisions
  SOURCING.md                what goes in every slot, where to get it, licences
  DEPLOYMENT.md              build → .mcworld → local verification → Realm, troubleshooting
```

## Quick start

```bash
python3 -m pip install Pillow                       # ffmpeg with libvorbis is also needed for audio
python3 tools/pmtool.py fetch-vanilla               # Mojang bedrock-samples v1.26.50.4
python3 tools/pmtool.py status                      # every empty slot
# …drop vendor packs into vendor/, import assets (see docs/SOURCING.md)…
python3 tools/pmtool.py build --profile hybrid      # validate + assemble + generate biome remaps
python3 tools/pmtool.py package-world --profile hybrid --world PortMarlowe_base.mcworld --out build/PortMarlowe.mcworld
```

Then follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) to verify in game and replace the Realm world.

## Pack stack (top = highest priority)

| # | Folder | Pack | Capability |
|---|---|---|---|
| 1 | `pm_fauna` | Port Marlowe: Fauna | `pbr` |
| 2 | `pm_audio` | Port Marlowe: Audio | `pbr` |
| 3 | `pm_atmos` | Port Marlowe: Atmosphere | `pbr` |
| 4 | `vnd_vrtx` / `vnd_vvv` / `vnd_vvn` | Vanilla RTX Opus / Vanilla Vibrant Visuals / Vibrant Normals | `raytraced` / `pbr` |

## Things to know up front

* **RTX is Windows plus a DXR GPU only.** Microsoft describes it as still supported but superseded by
  Vibrant Visuals. In the `hybrid` profile everyone else automatically gets Vibrant Visuals.
* **Partial builds are safe.** A species with any missing slot stays vanilla, and a sound with no recordings
  keeps the vanilla sound. The world is shippable at every stage.
* **Licences matter on a Realm.** Members download every pack, so each asset must allow redistribution.
  SOURCING.md marks which sources were verified and what their licences allow.
