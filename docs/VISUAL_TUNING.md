# Darker Visuals — 1.0.3

This pass addresses the report that THE HOLLOW's shader is too bright. It targets less sky
wash and darker nights while retaining a nonzero ambient floor and warm shelter lights.
These are parameter changes, not measurements of final screen brightness. Minecraft's
exposure adaptation, video settings, weather, biome and display affect the result.

## What changed

| Control | 1.0.2 | 1.0.3 |
|---|---|---|
| Peak sunlight, wild / cold / swamp | 100 / 100 / 85 lux | 80 / 75 / 70 lux |
| Peak moonlight, wild / cold / swamp / cave | 0.5 lux throughout | 0.20 / 0.18 / 0.16 / 0.16 lux |
| Surface ambient, day → night | 0.020 → 0.045 lux | 0.018 → 0.012 lux |
| Cave ambient | Same day/night curve as surface | Constant 0.009 lux |
| Surface sky lighting, noon → midnight | 1.0 → 0.75 | 0.8 → 0.4 |
| Cave sky lighting | Same curve as surface | Constant 0.25 |
| Midtone gain, wild / cold / swamp / cave | 1.0 throughout | 0.88 / 0.86 / 0.86 / 0.90 |
| Highlight RGB gain | [1.04, 1.0, 0.95] | [0.88, 0.85, 0.81] |
| Highlight threshold | 1.6 × average luminance | 1.4 × average luminance |
| Moon haze at midnight | 0.6 | 0.18 |
| Sky, horizon and distance-fog colours | Pale blue/grey | Deeper blue/grey and muted olive |
| Volumetric scattering | Higher, paler haze | Lower scattering in all four looks |

Standard grading gamma stays at 2.2, with zero offset. The tone-mapping operator remains
`generic` throughout, allowing biome transitions to use the same operator. Local light
colours and gameplay light levels are unchanged. The lower grading gain also affects bright
local lights; their actual visibility still requires an engine check.

Fog density, height falloff and air/weather start/end distances are unchanged. Water settings
and underwater fog are preserved. No texture resolution, ray count or new rendering pass is added.

## Scope

The existing 57 client-biome overrides retain their four profiles: wild, cold, swamp and cave.
This includes the supported forests, plains, taigas, hills, jungles, rivers, beaches, savannas,
swamps, dripstone caves and deep dark. Biomes without an override, including deserts, oceans,
lush caves, the Nether and the End, retain their existing appearance. There is no claim of
worldwide darkness or a replacement renderer.

The full lighting/grading changes require Vibrant Visuals. Simple/Fancy graphics receive the
pack's distance-fog and sky-colour overrides, not the Vibrant Visuals lighting or grading.

## Update and compare

1. Back up the world, close it, and import `THE_HOLLOW_Visuals_v1.0.3.mcpack` for a visuals-only
   update, or `THE_HOLLOW_v1.0.3.mcaddon` to update all three packs.
2. In the world's Resource Packs, confirm THE HOLLOW: Visuals version 1.0.3 is active. Use one
   lighting pack while comparing. Keep the game's gamma setting and display settings steady.
3. In a copied test world with cheats, compare the same forest/swamp/cave positions at
   `/time set noon`, `/time set sunset`, and `/time set midnight`, including clear and rainy
   weather. Give exposure time to settle after leaving a bright area.
4. Check ground visibility, a distant treeline, torch-lit doors, lantern-lit paths, snow and
   reflected sky. Darker should still leave enough detail to navigate; report the biome, time,
   graphics mode and a screenshot if a scene remains washed out or becomes unreadable.
5. For Xbox, update the source world's packs, upload the world to the Realm and reconnect.

Pack UUIDs are preserved for updating existing worlds. The standalone Visuals pack has no
behavior-pack dependency and can be used with the existing 1.0.2 gameplay packs.

## Verification

The release build runs strict TypeScript compilation, static schema/reference validation and
all 60 gameplay simulations. Archive integrity and manifest versions are checked during packaging.
The generated profiles were compared with 1.0.2 to confirm lower light/gain/scattering values,
unchanged biome coverage and unchanged local lights, water and fog distance/density settings.
These checks do not render Minecraft or establish Xbox/iPhone appearance or frame rate.

Official parameter references:

- [Mojang: lighting, ambient and sky controls](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/lightingcustomization?view=minecraft-bedrock-stable)
- [Mojang: gain, gamma, shadows and highlights](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/colorgradingtonemappingcustomization?view=minecraft-bedrock-stable)
- [Mojang: per-biome settings take precedence over globals](https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/biomecustomization?view=minecraft-bedrock-stable)
