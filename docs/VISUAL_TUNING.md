# THE HOLLOW horror visuals — 1.1.0

## Changes in 1.1.0

- **Soft shadows:** `shadows/global.json` asks for `soft_shadows` (smoothly filtered sun and moon
  shadows with soft edges instead of texel-snapped blocky ones). Soft is the engine default; the
  file keeps it if another pack in the stack requests blocky shadows.
- **Dusk is the warning hour:** the setting sun is blood-orange (sun colour `[214,122,86]`), the
  horizon reddens and the sun's Mie haze swells. Nights turn to cold blue moonlight `[152,178,226]`.
- **Deeper shadows:** sky-fill intensity at night drops to 0.20–0.28 (was 0.30–0.38) and to
  0.54–0.68 by day, so shade under trees reads darker without lowering the ambient floor.
- **Split-tone grading:** cooler shadow gain `[0.86,0.93,1.0]`, warmer highlight gain
  `[0.92,0.86,0.78]`, midtone contrast 1.10–1.14: torches and lanterns glow warm against the cold.
- **Light shafts:** volumetric Henyey-Greenstein g raised to 0.62–0.80 per look (was 0.6
  everywhere) for strong forward scattering: god rays at dawn and dusk and halos around lights.
- **Warm point lights:** candles join torches and lanterns as dynamic point lights; soul lights
  and soul campfires glow an eerie cyan; jack o'lanterns are static warm light.
- Creature textures are now 2x resolution with baked ambient occlusion, wet roughness, subsurface
  skin, emissive eyes/veins/echo-sacs and heightmaps; custom blocks were repainted the same way.
- **Dread fog** (resource pack, all graphics modes): when a player is Frightened, a personal fog
  closes the view distance and adds uniform volumetric haze; it lifts as they calm down.


The direction is quiet survival horror: steel and olive shadows, subdued earth colours, dim
moonlight, readable silhouettes and amber shelter lights. Daylight stays useful for building
and gathering. Dusk should feel uneasy; the forest should not look like a bright blue night.

These are authored rendering inputs, not screenshots or measurements of screen brightness.
Minecraft exposure adaptation, weather, video settings and the display affect the result.
No claim of perfect appearance or tested iPhone/Xbox performance is made.

## Seven looks, complete Overworld coverage

| Look | Direction | Coverage |
|---|---|---|
| Wild | Steel daylight, cool shadows, muted greens | Forests, plains, taigas, hills, jungles, savannas, mushrooms |
| Cold | Grey-blue distance, restrained snow highlights | Snowy mountains/taigas, frozen rivers and cold/frozen oceans |
| Swamp | Olive-grey haze, subdued light, stained water | Swampland and mangroves |
| Cave | Dim cool fill, no caustic shimmer, still water | Dripstone, deep dark, lush caves and sulfur caves |
| Canopy | Desaturated moss/ash, closer lowland mist | Dark forests and pale garden |
| Arid | Dusty sepia-grey distance with lighter mist | Deserts and badlands |
| Coast | Steel water and sea mist, gentle surface motion | Beaches, rivers and temperate/warm oceans |

All **83 Overworld client-biome definitions** in Mojang's pinned `v1.26.50.4` reference are
covered, up from 57. The Nether and End retain their native biome definitions. Biome identity,
music, foliage/grass colours, ambient sounds and underwater fog remain unchanged. The grading
still changes how these colours appear in the final image. Global renderer controls such as
local light colours can also be visible beyond the Overworld, as in previous releases.

## Changes since 1.0.4

- **Complete daylight direction:** author the full sun-colour curve. The old generator kept
  vanilla's saturated orange intermediate stops and changed only the final stop. Day-cycle
  endpoints now match exactly and the muted steel/amber direction applies throughout the day.
- **Less glare:** lower sun Mie strength and glare shape near sunrise/sunset; reduce moon haze.
  This controls those atmosphere contributions; it does not disable Minecraft's bloom renderer.
- **Restrained light:** sunlight peaks at 62–70 lux, moonlight at 0.13–0.17 lux. Surface ambient
  remains 0.010–0.011 lux at night, with a 0.010 cave floor. This avoids introducing zero ambient
  light; it does not establish that every scene is readable on every screen.
- **Muted colour:** saturation 0.78–0.84, moderate contrast, reduced midtone/highlight gains,
  standard gamma 2.2, zero grading offsets. Cool shadows contrast with warm practical lights.
- **Mist with regional character:** lower volumetric density, height falloff outdoors and a
  lighter arid profile. Clear-air distance fog ends at render distance, preserving that range.
- **Water:** modest particle concentrations and 0.25 biome-colour contribution. Caustics are
  off in swamp/canopy/cave profiles; elsewhere they use documented minimum power 1 and slower
  animation. Gentle image-based waves use two octaves, four at coasts; cold/cave waves stay off.
  The ripples do not move water geometry or affect swimming. Device cost is unmeasured.
- **Shelter:** torch, lantern, campfire, Heartwood Lantern and ward colours are preserved.
  Local lights retain their existing types and gameplay block-light levels.

Exact current light/grade inputs are listed in [VISUAL_REPORT.generated.md](VISUAL_REPORT.generated.md).

## Install and compare

1. Back up the world and close it. Import `THE_HOLLOW_Visuals_v1.0.5.mcpack` to update only the
   look, or `THE_HOLLOW_v1.0.5.mcaddon` to update all packs. Pack UUIDs are stable.
2. In the world's Resource Packs, confirm THE HOLLOW: Visuals **1.0.5** is active. Use one
   lighting pack while comparing. Select Vibrant Visuals in Video on a supported device.
3. Keep game gamma and display settings steady. Use the same test-world positions at noon,
   sunset and midnight, clear and rainy. Allow exposure to settle after moving between light
   and shade. A copied test world with cheats can use `/time set noon`, `/time set sunset`
   and `/time set midnight`.
4. Check a treeline, a dark-forest floor, snowy ground, a torch-lit door, a lantern path, a
   cave entrance, a swamp bank and an ocean shore. Cross biome boundaries and check for abrupt
   colour/water changes. Check pale garden, lush/sulfur caves and deserts, which lacked overrides.
5. Report a screenshot with biome, time, graphics mode and gamma if a scene is too bright,
   too dark, excessively tinted or visually noisy. Same-scene device feedback is the next
   necessary step for judging the actual look.
6. For Xbox, update the source world and its packs, upload to the Realm and reconnect.

Simple/Fancy graphics receive the pack's distance-fog and sky-colour overrides; the full
lighting, grading, volumetric mist and water effects require Vibrant Visuals. This pack does
not add ray tracing, force a frame rate, alter graphics settings or change world weather.

## Verification

Every build runs `tools/visuals/verify_visuals.py`. It checks complete Overworld coverage,
preservation of non-look biome data and underwater fog, daily lighting seam continuity,
nonzero ambient bounds, one shared tone mapper and documented light/grading/water ranges.
Four isolated negative checks confirmed that seams, fractional caustics power, biome music
edits and mismatched tone mappers are rejected. Regeneration produces the same JSON bytes.

The complete build also runs strict TypeScript compilation, static validation, all 78 gameplay
simulations and archive checks. These do not render Minecraft or measure visibility, animation
quality, transition smoothness, audio or device frame rate.

Official parameter references:

- [Mojang: lighting, ambient and sky](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/lightingcustomization?view=minecraft-bedrock-stable)
- [Mojang: atmospherics](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/atmosphericscustomization?view=minecraft-bedrock-stable)
- [Mojang: water effects](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/watercustomization?view=minecraft-bedrock-stable)
- [Mojang: colour grading](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/colorgradingtonemappingcustomization?view=minecraft-bedrock-stable)
- [Mojang: biome settings and blending](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/biomecustomization?view=minecraft-bedrock-stable)
