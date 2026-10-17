# DREAD — Something Is Watching

A psychological-horror add-on for **Minecraft Bedrock Edition** (iOS first; Xbox via Realms later). Native Bedrock:
a behavior pack (stable Script API) plus a resource pack. The earlier Java/Fabric prototype is in `legacy-java/` for reference only.

**Status: Phases 1-3 first pass.** Playable test build with the Horror Director and the first creature, the Lurker.
**Nothing has been run inside Minecraft yet.** Read `docs/TESTING.md` before trusting any claim here.

* **Horror Director**: per-player six-state machine (dormant → unease → observation → escalation → hunt → recovery) driven by
  contextual stress and encounter dread, weighted ambient events with cooldowns, persistent memory, hard fairness rules.
* **The Lurker**: custom 51-cube model, texture, 10 animations, controllers, vanish particle, 49 synthesised sounds,
  observe/stalk/hunt tactics with light/gaze/injury counterplay.
* **Ambience**: 34 synthesised anomalies (snaps, creaks, groans, drags, murmurs, cries, heartbeat...).
* **Atmosphere**: director-driven fog (4 RP fog definitions pushed with `/fog`) and camera shake, off in daylight and in Performance mode.
* Settings: intensity, sound intensity, jumpscare intensity, effects level (Performance/Balanced/Cinematic), debug.

```
packs/DREAD_BP   behavior pack  (manifest, entities, loot, compiled scripts/)
packs/DREAD_RP   resource pack  (model, texture, animations, particles, sounds)
src/             TypeScript Script API source  -> bundled to packs/DREAD_BP/scripts/main.js
tools/           validate, package, script build; assets/ (model+texture+animation generators); synth/ (audio synthesis)
tests/           mock-API integration tests + pure-logic simulations
docs/            DESIGN, TESTING, INSTALL_IOS, AUDIO_BRIEF, AUDIO_LICENSES, ASSET_GAPS, AUDIT
releases/        installable .mcaddon test builds
```

```
npm ci
npm run check      # typecheck, build scripts, all tests, validate packs
npm run package    # dist/*.mcaddon and *.mcpack
npm run assets     # regenerate model/texture/animations/audio (needs python3 numpy scipy ffmpeg)
```

Targets stable `@minecraft/server` 2.0.0 (latest stable is 2.10.0), min engine 1.21.90.

## Quick try (cheats on)
`/scriptevent dread:spawn observe` · `dread:state` · `dread:force unease` · `dread:sound all` · `dread:help`
