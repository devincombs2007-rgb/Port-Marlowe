# THE HOLLOW: Survival Horror

A survival-horror add-on for **Minecraft Bedrock Edition** that targets Xbox and Realms.
The wilderness stays beautiful and your survival progression still matters. Something
in it is patient, though. You are watched long before you are attacked.

- **Five creatures**, each with readable warnings, fixed rules and counterplay: the Watcher,
  the Borrowed, the Hollowed, the Knocker and the Mirebound.
- **A boss you choose to wake:** the Heart Below, in an underground shrine.
- **Three places:** a ranger cabin, a ruined campsite and the shrine. They appear near
  exploring players in **new and existing worlds**.
- **A Field Journal** that fills in as you play. It works with a controller, stays with you
  through death, and holds the settings.
- **Survival equipment:** Hollow Chime (warning), Rowan Ward (limited protection), Hollow Lens
  (investigation), Heartseeker and Offering of Silence (boss progression), and the Heartwood
  Lantern (reward).
- **An optional Visuals pack** for Vibrant Visuals: cool forests, muted earth tones, warm
  shelter light and unsettling caves. Standard graphics work fully without it.
- Original models, textures, animations and 153 procedurally synthesised sounds.

> **Status:** statically validated (0 errors, 0 warnings; see
> [docs/VALIDATION_REPORT.md](docs/VALIDATION_REPORT.md)). **No in-game, Xbox or Realm testing
> has been done yet.** Read the known limitations before you rely on it in a long-running world.

## Download

| File | What it is |
|---|---|
| [`dist/THE_HOLLOW_v1.0.0.mcaddon`](dist/THE_HOLLOW_v1.0.0.mcaddon) | Everything: behavior pack, resource pack and the optional Visuals pack. Open it to import. |
| `dist/THE_HOLLOW_BP_v1.0.0.mcpack` | Behavior pack only |
| `dist/THE_HOLLOW_RP_v1.0.0.mcpack` | Resource pack only (required) |
| `dist/THE_HOLLOW_Visuals_v1.0.0.mcpack` | Optional Vibrant Visuals pack |

Install guide (iPhone or Windows → world → Realm → Xbox): **[docs/INSTALL.md](docs/INSTALL.md)**

## Target versions (verified 2026-10-19)

| | Version | Source |
|---|---|---|
| Minecraft Bedrock | **26.50** (engine `1.26.50`; the current hotfix is 26.52) | Mojang `bedrock-samples` tag `v1.26.50.4` |
| `@minecraft/server` | **2.10.0** (stable) | npm `latest`; listed in the 1.26.50 `script_modules` metadata |
| `@minecraft/server-ui` | **2.2.0** (stable) | npm `latest`; listed in the 1.26.50 `script_modules` metadata |
| Manifest | `format_version` 2, `min_engine_version` [1, 26, 50] | |

No beta APIs, no experimental toggles and no Preview-only features are used. Every file
format version is listed in [docs/TECHNICAL.md](docs/TECHNICAL.md).

## Documentation

- [Install guide](docs/INSTALL.md): iPhone and Windows import, Realm upload, Xbox, Vibrant Visuals
- [Survival guide](docs/SURVIVAL_GUIDE.md): progression, recipes, creatures and counterplay, settings
- [Creature reference](docs/CREATURES.md): spawn rules, behavior states, stats, drops and cleanup
- [Technical notes](docs/TECHNICAL.md): architecture, performance budget, multiplayer and persistence, visuals
- [Validation report](docs/VALIDATION_REPORT.md): what was verified and how, the in-game test plan, known limitations
- [Credits and licenses](CREDITS.md)

## Building from source

Everything in `packs/` is generated or compiled from `tools/` and `scripts_src/`, and builds are reproducible.

Requirements: Python 3.11+ with `numpy`, `scipy`, `Pillow`, `jsonschema`; Node.js 18+; `ffmpeg` with libvorbis.

```bash
tools/fetch_reference.sh                     # Mojang bedrock-samples v1.26.50.4 (schemas, vanilla data) -> build/
(cd tools/typecheck && npm ci)               # pinned @minecraft typings, TypeScript, esbuild
python3 tools/build.py --assets              # regenerate models, textures, sounds, structures, visuals
python3 tools/build.py                       # content JSON + compile scripts + validate + package -> dist/
python3 tools/selftest_validator.py          # optional: proves the validator catches injected defects
```

`build.py` without `--assets` reuses the committed art and audio. It still regenerates the content
JSON, type-checks and bundles the TypeScript, runs the validator, and packages `dist/`.

## Repository layout

```
packs/behavior/      behavior pack (entities, items, blocks, recipes, loot, structures, bundled script)
packs/resource/      resource pack (models, textures + PBR texture sets, animations, sounds, particles, fogs, UI)
packs/visuals/       optional Vibrant Visuals pack (lighting, atmospherics, color grading, water, fog, local lights)
scripts_src/         TypeScript source for the behavior pack (bundled to packs/behavior/scripts/main.js)
  core/              ids, config, scheduler, audio/fx helpers, world queries, per-player runtime
  creatures/         watcher, borrowed, hollowed, knocker, mirebound, heart (boss)
  systems/           director, noise, ambience, journal, settings UI, sites, cleanup, daily counters
  items/             custom item and block components
  content/           journal text
tools/
  hollowkit/         model kit, texture painter, preview renderer, audio synth, NBT writer, schema loader
  creatures/ blocks/ art/ sounds/ structures/ visuals/   asset generators (one script per asset family)
  packgen/           generates items, blocks, recipes, lang, sounds.json, animations
  validate.py        static validator; selftest_validator.py mutation self-test
  build.py           build + package
dist/                importable .mcaddon / .mcpack files
docs/                guides and reports
```
