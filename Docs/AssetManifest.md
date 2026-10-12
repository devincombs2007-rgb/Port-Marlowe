# Asset manifest and bill of materials

_Last updated: 2026‑10‑12._

## 1. What the build contains today

Every asset in the build is **created by project code at runtime**. No third‑party art, audio or
gameplay package is imported. Licence: project‑original.

| Content | Source (file) | Quality note |
| --- | --- | --- |
| District geometry: roads, sidewalks, kerbs, crossings, 30+ buildings, quay, park, court, props | `World/DistrictBuilder.cs`, `World/MeshBuilder.cs` | Blockout‑plus: facades are textured boxes with storefronts and window emission. Not final art. |
| Surface textures: asphalt, concrete, brick, plaster, facade window grids, storefronts, normal maps | `Rendering/ProceduralTextures.cs` | Procedural noise/pattern textures. Placeholders for the PBR sets in §3. |
| Characters: two protagonists, civilians, police | `Characters/CharacterRig.cs` (procedural rigid‑skinned mannequin, one draw call, palette texture) | Readable silhouettes and outfit colours only. No faces, hair cards or cloth. |
| Vehicle: "Aldine Courier" sedan + police livery | `Vehicles/VehicleFactory.cs` | Procedural body, wheels, lights. WheelCollider physics. |
| Sky, sun, fog, streetlights | `Rendering/LightingRig.cs` (Skybox/Procedural) | Conventional lighting. No HDRI yet. |
| Audio: engine, siren, horn, alarm, impacts, UI | `Audio/GameAudio.cs` (synthesised clips) | Functional placeholders. |
| UI font | Unity built‑in `LegacyRuntime.ttf` | Engine resource. |

Unity packages in use (all bundled with editor 6000.6.5f1):

- URP 17.6.0
- Input System 1.20.0
- uGUI 2.6.0
- Test Framework 1.8.0

## 2. Blocked asset dependencies

| Source | Intended use | Blocker |
| --- | --- | --- |
| Unity Asset Store | City kit, vehicles, characters, the free Unity third‑person controller | Sandbox egress blocks the host. Importing also needs a licensed editor signed in to the user's Unity account. |
| Fab | Environment pieces, vegetation, materials | Host blocked from the sandbox. Account required. |
| Mixamo | Humanoid locomotion and action clips | Host blocked. Needs an Adobe ID. |
| Poly Haven (CC0) | HDRIs and PBR materials | Host blocked from the sandbox. **Reachable from GitHub Actions runners.** |
| ambientCG (CC0) | Road, concrete, brick and metal PBR sets | Host blocked from the sandbox. **Reachable from GitHub Actions runners.** |
| Freesound | Ambience and effects | Host blocked. Per‑file licence review needed. |
| ActorCore, MoCap Online, Opsive, NWH | Optional paid candidates | Not evaluated. **No purchases without approval.** |

## 3. Candidate bill of materials (planned)

Status values:

- **planned**: identified as a role, not yet chosen;
- **candidate**: specific item chosen, not yet validated;
- **validated**: imported and checked in a test scene;
- **integrated**: in the build.

| Role | Source | Exact item | Licence | Price | Status |
| --- | --- | --- | --- | --- | --- |
| Road and sidewalk PBR | ambientCG / Poly Haven | to select (asphalt, concrete paving) | CC0 | free | planned |
| Facade PBR (brick, plaster, painted metal) | ambientCG / Poly Haven | to select | CC0 | free | planned |
| Sky HDRI (day, dusk, overcast) | Poly Haven | to select | CC0 | free | planned |
| Third‑person controller reference | Unity Asset Store | Unity Technologies "First Person + Third Person Character Controllers" (free; non‑standard EULA per the brief) | to review | free (listed) | planned: evaluate only; the project keeps its own motor |
| Humanoid locomotion clips | Mixamo | to select | Adobe terms | free with Adobe ID | planned |
| Civilian vehicle model | Asset Store / Fab | to select | to review | unknown | planned |
| City/industrial modular kit | Asset Store / Fab | to select | to review | unknown | planned |

Every row that reaches "candidate" must also record:

- exact product, publisher and URL;
- version, and price checked on a dated day;
- licence;
- render pipeline, formats and rig;
- UWP/native dependencies;
- size;
- optimisation needs;
- a replacement option.

Do not record names, prices or compatibility until the item has actually been checked.

## 4. Reference images

The GTA VI reference frames from the project pack are **reference only**. They are kept out of the
repository and builds: `/Reference/` and `reference_images/` are git‑ignored. Nothing in the
project recreates their characters, brands, UI or locations.
