# vendor/

Community block-PBR packs, unmodified. Each pack goes in its own folder with `manifest.json` at that
folder's root. A `.mcpack` is a zip; extract it here.

| Folder | Pack | Used by profile |
|---|---|---|
| `vendor/vanilla_rtx_opus/` | Vanilla RTX Opus (Cubeir) | `hybrid` |
| `vendor/vanilla_rtx_normals/` | Vanilla RTX Normals (Cubeir) | (alternative) |
| `vendor/vanilla_vibrant_visuals/` | Vanilla Vibrant Visuals (vanilla-rtx/Vanilla-PBR) | `vibrant` |
| `vendor/vibrant_normals/` | Vibrant Normals (vanilla-rtx/Vanilla-PBR) | `vibrant_normals` |

Copy each pack's licence file next to its `manifest.json` so it ships with the pack; the Vanilla RTX licence
requires this when redistributing. See [../docs/SOURCING.md](../docs/SOURCING.md) for download sources and
terms. Everything in this folder except this README is git-ignored.
