# DREAD — Something Is Watching

A psychological-horror add-on for **Minecraft Bedrock Edition** (iOS first; Xbox via Realms later).

**Status: Phase 1 — native Bedrock foundation.** Installable test build; no creatures yet. The earlier Java/Fabric
prototype lives in `legacy-java/` as a design reference only.

```
packs/DREAD_BP   behavior pack  (manifest, entities, spawn rules, compiled scripts/)
packs/DREAD_RP   resource pack  (models, textures, animations, sounds)
src/             TypeScript source for the Script API  -> bundled to packs/DREAD_BP/scripts/main.js
tools/           build, validate and package scripts
tests/           mock-API smoke tests
docs/            audit, testing status, install guide, asset gaps
releases/        installable .mcaddon test builds
```

```
npm ci
npm run check      # typecheck + build scripts + smoke tests + validate packs
npm run package    # -> dist/*.mcaddon, *.mcpack
```

Targets stable `@minecraft/server` 2.0.0 (latest stable is 2.10.0), min engine 1.21.90. See `docs/` for details.
**Not yet tested in-game** — read `docs/TESTING.md`.
