# Audio sources and licences

| Set | Origin | Licence | Status |
|---|---|---|---|
| Lurker Batch A (49 Ogg files, `packs/DREAD_RP/sounds/entity/dread/lurker/`) | **Procedurally synthesised** in `tools/synth/` (numpy/scipy, seeded, reproducible: `npm run build:audio`). No samples, no third-party audio. | Original work of this project, released under the project licence. | **Intermediate.** Synthetic placeholders good enough to test mechanics and timing. Not final-quality creature audio; replace with recorded/edited material where noted in `docs/ASSET_GAPS.md`. |

Per-file generator and seed: `assets-src/audio/batch_a/SOURCES.csv`.

## Rules for adding audio
- Every file needs a row: file, tool, prompt/generator, licence, status.
- AI-generated audio is only acceptable if the tool's current terms permit commercial use and redistribution in a game add-on. Record the
  tool, plan and date. Do not use outputs that imitate a real person's voice or reproduce another game's or film's sounds.
- CC0/CC-BY material: record author, URL, licence and required attribution text here.
- No audio is included from Mojang/Minecraft. The Mimic's imitations must be original sounds that resemble, not copy, vanilla audio.
