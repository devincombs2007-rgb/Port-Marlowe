# Audit of the Java/Fabric prototype

The Fabric project (now in `legacy-java/`) targeted Java Edition 1.21.4. **None of its code runs on Bedrock**, so
it is kept only as a design reference. It was never compiled to a passing build or tested in-game (its last CI
run failed on API mismatches, which I fixed but never re-verified).

## What carries over

| Java asset | Bedrock verdict |
|---|---|
| Creature concepts (Lurker, Gaunt, Mimic, Watcher, Tollwraith) | **Reuse as design.** Being redesigned per the new brief (non-humanoid silhouettes, stalking states). |
| Behaviour ideas: freeze-when-watched, blink behind a distracted target, retreat-while-stared-at, vanish-when-stared-at | **Reuse the logic.** Re-implemented in the Bedrock Script API / entity components + animation controllers. |
| View-cone math (`dot > 0.57` ≈ 55° half-angle, plus line of sight) | **Portable** to TypeScript (`getViewDirection()`, `getEntitiesFromViewDirection`/raycasts). |
| Sanity meter, drain/recovery rates, hallucination tiers (<60 sounds, <40 doors/whispers, <20 Watcher) | **Reuse as starting numbers.** Will be reworked into the contextual stress model for the Horror Director (Phase 3). |
| "Tolling Night" event | **Reuse** as a director event. |
| Items: Marlowe Bell, Soothing Tonic | **Reuse the concept.** Recipes/loot must be rewritten in Bedrock JSON (different formats). |
| Lang strings | Convert to `.lang` (done for pack names; entity/item strings arrive with those assets). |
| Generated skins (64×64 Java biped layout) | **Discard.** They are humanoid reskins, which the new brief forbids. Not carried into the packs. |
| 16×16 item icons, jumpscare face | Generated placeholders; may seed intermediate art but are **not** final art. |
| GLSL "Dread" post-process shader | **Not portable.** Bedrock has no custom shader injection (see below). |
| Fabric mixins, renderers, registries, goals | **Not portable.** |

## The shader, honestly
Bedrock add-ons cannot ship arbitrary post-process shaders. Supported ways to get a comparable mood:
- **Vibrant Visuals / deferred rendering JSON** (`atmospherics`, `color_grading`, `lighting`, `shadows`, `pbr`, `point_lights`):
  schemas exist in `@minecraft/bedrock-schemas`; only on devices that support Vibrant Visuals. Needs a fallback.
- **Fog JSON** (`fogs/`) for per-biome/dimension distance fog and colour.
- **Camera API** (fade/shake), **status effects** (e.g. darkness), **particles**, **sound**. All stable-API; vignette-style
  effects are done with these rather than a shader. Exact availability is checked per feature as it is added.
- A heartbeat-pulsing vignette, chromatic aberration and film grain are **not reproducible** as true post effects.

## Platform decision
Native Bedrock Add-On: behavior pack (data + stable Script API) + resource pack. Script API stable line verified against npm:
`@minecraft/server` **2.10.0** is the latest stable (published 2026-09-15; latest stable game build 1.26.52).
The manifest targets **`@minecraft/server` 2.0.0** (stable since 2025-06-17) with `min_engine_version` 1.21.90, the
lowest stable baseline that has the APIs we use, to maximise device compatibility (iOS updates can lag). Raise it only
when a needed API requires it. Beta (`-beta`/`-rc`) modules are rejected by the validator.
