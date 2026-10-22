# THE HOLLOW: Survival Horror

> **2.0 — Varrow Island:** a prebuilt island world: a 1957 nuclear test site and its opening
> cinematic, a helicopter shot down, Trevor Hale (one AI companion shared by everyone, with a
> job queue), the Children of the Second Sun, radiation, guns and a hazmat suit, the survey, the
> Heart under the crater, and a way off the island. See **[docs/VARROW_ISLAND.md](docs/VARROW_ISLAND.md)**.
> In any other world the add-on keeps the original forest story below.

A survival-horror add-on for **Minecraft Bedrock Edition** that targets Xbox and Realms.
The wilderness stays beautiful and your survival progression still matters. Something
in it is patient, though. You are watched long before you are attacked.

- **Five creatures**, each with readable warnings, fixed rules and counterplay: the Watcher,
  the Borrowed, the Hollowed, the Knocker and the Mirebound.
- **A boss you choose to wake:** the Heart Below, in an underground shrine.
- **Six structure layouts:** an intact or collapsed ranger cabin, a ruined campsite, a watchtower, a lean-to and the shrine. They appear near
  exploring players in **new and existing worlds**.
- **A Field Journal** that fills in as you play. Its Field Conditions page checks local equipment,
  explains quiet encounter pacing and suggests a discovered recipe. It works with a controller,
  stays with you through death, and holds the settings.
- **Survival equipment:** Telltale Chime (warning), Rowan Ward (limited protection), Seer's Glass
  (investigation), Heartseeker and Hush Offering (boss progression), and the Heartwood
  Lantern (reward).
- **An optional Visuals pack** for Vibrant Visuals: seven horror looks across all 83 Overworld biome
  definitions, muted earth tones, cold nights, warm shelter light and restrained water effects.
  Standard graphics work fully without it.
- Original models with 2x hand-tuned procedural textures (baked occlusion, PBR wetness, subsurface
  skin, glowing eyes and veins), richer animations, ink-sketch journal illustrations, and 150
  credited CC0 recordings plus 11 synthesized Dread sounds.
- **Soft shadows** are requested explicitly by the Visuals pack, with blood-orange dusks, cold blue
  moonlight, split-toned grading and stronger volumetric light shafts.

> **Status:**
> - Statically validated: 0 errors, 0 warnings.
> - The real scripts pass 105/105 headless simulation scenarios, including server restarts mid-boss-fight.
> - See [docs/VALIDATION_REPORT.md](docs/VALIDATION_REPORT.md).
>
> **Playtest feedback:** the user has seen the Borrowed and likes the Hollowed clicking sound.
> Codex has not run Minecraft; broader creature, animation, Xbox and Realm verification is still pending.

Movement changes and focused playtest: **[docs/MOVEMENT_TESTING.md](docs/MOVEMENT_TESTING.md)**.

Current development checkpoint and unfinished device checks: **[docs/DEVELOPMENT_STATUS.md](docs/DEVELOPMENT_STATUS.md)**.

## Download

| File | What it is |
|---|---|
| [`dist/THE_HOLLOW_Varrow_Island_v2.0.0.mcworld`](dist/THE_HOLLOW_Varrow_Island_v2.0.0.mcworld) | **Varrow Island**: the prebuilt island world with all packs embedded. |
| [`dist/THE_HOLLOW_v2.0.0.mcaddon`](dist/THE_HOLLOW_v2.0.0.mcaddon) | Everything: behavior pack, resource pack and the optional Visuals pack. Open it to import. |
| `dist/THE_HOLLOW_BP_v2.0.0.mcpack` | Behavior pack only |
| `dist/THE_HOLLOW_RP_v2.0.0.mcpack` | Resource pack only (required) |
| `dist/THE_HOLLOW_Visuals_v2.0.0.mcpack` | Optional Vibrant Visuals pack |

Horror visual style and comparison steps: **[docs/VISUAL_TUNING.md](docs/VISUAL_TUNING.md)**.

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
python3 tools/build.py                       # content JSON + compile scripts + validate + simulate + package -> dist/
python3 tools/sounds/audition_page.py --standalone  # optional: portable audio review HTML
python3 tools/selftest_validator.py          # optional: proves the validator catches injected defects
node tools/simtest/run.mjs [filter]          # optional: run the headless simulation scenarios on their own
```

`build.py` without `--assets` reuses the committed art and audio. It still regenerates the content
JSON, type-checks and bundles the TypeScript, runs the validator and the simulation, and packages `dist/`.

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
  simtest/           headless simulation: fake Minecraft API + scenarios run against the real script bundle
  build.py           build + package
dist/                importable .mcaddon / .mcpack files
docs/                guides and reports
```
