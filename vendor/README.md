# vendor/

Community block packs, unmodified. Each pack goes in its own folder with `manifest.json` at that folder's
root. A `.mcpack` is a zip; extract it here.

| Folder | Pack | Used by profile |
|---|---|---|
| `vendor/vibrant_normals/` | Vibrant Normals (vanilla-rtx/Vanilla-PBR) | `xbox` (default) |
| `vendor/vanilla_vibrant_visuals/` | Vanilla Vibrant Visuals (vanilla-rtx/Vanilla-PBR) | `xbox` (subpack `b`, lighting only), `vibrant` (subpack `a`) |
| `vendor/vanilla_rtx_opus/` | Vanilla RTX Opus (Cubeir) | `hybrid` (PC guests with RTX GPUs only) |

Copy each pack's licence file next to its `manifest.json` so it ships with the pack; the Vanilla RTX licence
requires this when redistributing. See [../docs/SOURCING.md](../docs/SOURCING.md) for download sources and
terms. Everything in this folder except this README is git-ignored.
