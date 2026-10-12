# Subsystem ledger (PM-001 – PM-070)

IDs follow the row order of the master prompt's coverage checklist (§1.8).

## How to read this ledger

**Status** describes how far the code has got:

| Status | Meaning |
| --- | --- |
| planned | Specified or scoped only |
| stubbed | An interface or placeholder exists with no real behaviour |
| implemented | The code exists and is wired into the game |
| verified | Evidence exists. The **Evidence** column names it. |

**Evidence** codes:

| Code | Meaning |
| --- | --- |
| **U** | Core rules are covered by NUnit tests (79 tests, CI `core-tests`) |
| **C** | Compiles against the real Unity 6000.6.5f1 assemblies (CI `unity-compile-check`) |
| **P** | Covered by a PlayMode or autotest step that is written but **not yet run** (needs a licensed editor) |

No item has editor, desktop-player, UWP or Xbox evidence yet.

The milestone columns are:

- **M1** = first playable milestone;
- **VS** = vertical slice;
- **Prod** = production;
- **Ext** = optional extension.

| ID | Area | Subsystem | Target | Status | Evidence | Where / notes |
| --- | --- | --- | --- | --- | --- | --- |
| PM-001 | Movement | Ground locomotion | M1 | implemented | U (speed bands, stick shaping), C, P | `Core/Character/Locomotion.cs`, `Characters/CharacterMotor.cs`. Walk 1.5 / jog 3.5 / sprint 6.5 m/s. |
| PM-002 | Movement | Stance changes | VS | planned | — | Crouch/stand states not built. |
| PM-003 | Movement | Cover traversal | VS | planned | — | Needs [LARGE ANIMATION SET]. |
| PM-004 | Movement | Vault/mantle | VS | planned | — | — |
| PM-005 | Movement | Fall/impact recovery | M1 (partial) | implemented (partial) | C | Knockdown pose for civilians and a grounded check before saving. No protagonist fall damage yet. |
| PM-006 | Combat | Aim/obstruction | VS | planned | — | Combat is outside M1. |
| PM-007 | Combat | Weapon/ammo lifecycle | VS | planned | — | — |
| PM-008 | Combat | Damage/armor | VS | stubbed | — | `Protagonist.Health` exists; no damage model. |
| PM-009 | Combat | Melee/defense | M1 (minimal) | implemented (minimal) | C | A strike knocks down a civilian or officer; it is an assault crime and feeds the evidence pipeline. |
| PM-010 | Combat | Stealth/perception | M1 (perception) | implemented | U (observation), C | Civilian and officer perception: FOV, range, line of sight, night visibility. |
| PM-011 | Vehicles | Class handling | M1 (one class) | implemented | C, P | `Vehicles/VehicleController.cs` sedan with WheelColliders. Other classes planned. |
| PM-012 | Vehicles | Seats/doors/occupants | M1 | implemented | U (seat service), C, P | Reservation/occupy/release, door choice, partner boarding. |
| PM-013 | Vehicles | Theft/security | M1 | implemented | U (security rules), C | Locked cars need a window break-in, which is a witnessable crime and triggers the alarm. Mid/High security blocks entry with a reason. |
| PM-014 | Vehicles | Fuel/repair/recovery | M1 (fuel) | implemented (fuel) | U, C | 55 L, about 30 min of cruising. Repair and refuel stations are planned. |
| PM-015 | Vehicles | Damage/fire/destruction | M1 (damage) | implemented (damage) | U, C | Body/engine health, impact threshold, disabled engine. Fire is planned. |
| PM-016 | Police | Incident classification | M1 | implemented | U, C | `Core/Crime/IncidentRegistry.cs`: types, severity, audible radius. |
| PM-017 | Police | Witnesses/reports | M1 | implemented | U, C, P | Observation → call → delivery. Incapacitated witnesses fail to report; unreported observations expire. |
| PM-018 | Police | Suspect descriptions | M1 | implemented | U, C | Clothing, build, height, vehicle and plate, with confidence. Changing clothes clears a description on file. |
| PM-019 | Police | Dispatch/pursuit/search | M1 | implemented | U (case rules), C, P | Five stages; search radius; cooling. Units spawn out of view and drive the road graph. |
| PM-020 | Police | Arrest/profile consequences | M1 | implemented | U (arrest closes cases), C | Fine, release at the precinct, +2 h, and the criminal profile is persisted. |
| PM-021 | Peds/traffic | District schedules | VS | planned | — | Day/night budgets exist (26/12); no per-person schedules. |
| PM-022 | Peds/traffic | Crowd reactions | M1 | implemented | C | Flee, cower, report-by-phone poses; reaction governor (U). |
| PM-023 | Peds/traffic | Local avoidance | M1 | implemented | C | NavMesh agents with area costs (road 3.0, crosswalk 1.1). |
| PM-024 | Peds/traffic | Lane/intersection traffic | M1 (first pass) | implemented (first pass) | C | `Population/TrafficDirector.cs`: 8 day / 4 night AI cars on lane routes, spawned and retired out of view, yielding through a forward obstacle check. No signals or intersection reservation yet. |
| PM-025 | Peds/traffic | Emergency-service routing | M1 (police) | implemented (police) | C | Police take lane routes with a siren. Fire and EMS are planned. |
| PM-026 | World | Geographic connectivity | M1 | implemented | U (plan validator), C | Saltmarket 4×4 grid, quay, park and four entry roads. Validated as connected. |
| PM-027 | World | Enterable business rules | VS | planned | — | Storefronts are visual only. |
| PM-028 | World | Doors/access/security | M1 (safehouse) | implemented | C | Auto door with NavMesh carving; access limited to protagonists. |
| PM-029 | World | Interactive props/destruction | VS | planned | — | — |
| PM-030 | World | Parking/property persistence | M1 | implemented | U (save round trip), C, P | The owned car and any car a protagonist has used persist; parked traffic regenerates. |
| PM-031 | Environment | Weather transitions | VS | planned | — | Only time-of-day lighting exists. |
| PM-032 | Environment | Wetness/flooding | Prod | planned | — | — |
| PM-033 | Environment | Water/diving | Prod | planned | — | The harbour surface is visual only. |
| PM-034 | Environment | Wildlife | Ext | planned | — | — |
| PM-035 | Environment | Ambient event selection | VS | planned | — | — |
| PM-036 | Personal | Food/body changes | Prod | planned | — | — |
| PM-037 | Personal | Sleep/stress | M1 (sleep) | implemented (sleep) | C | Resting in bed skips 6 h and autosaves. Stress is planned. |
| PM-038 | Personal | Clothing/grooming | M1 (clothing) | implemented | U (descriptor effect), C | Three outfits each, from the safehouse wardrobe. Changing affects witness descriptions. |
| PM-039 | Personal | Money/inventory/services | M1 (money) | implemented (money) | U (idempotent ledger), C | Wallets and fines. Inventory and services are planned. |
| PM-040 | Personal | Safehouses/property use | M1 | implemented | C, P | Tern Street walk-up: door, bed, wardrobe, interior bounds. |
| PM-041 | Partnership | Switch transaction | M1 | implemented | U, C, P | Exactly-once ownership transfer, blocked during committed actions or saves, local/remote transition. |
| PM-042 | Partnership | Follow/regroup | M1 | implemented | U, C, P | Hysteresis 4.0/2.5 m, gait by distance, regroup at 35 m, repositioning only when unobserved. |
| PM-043 | Partnership | Combat support | VS | planned | — | — |
| PM-044 | Partnership | Partner driving/tasks | M1 (partial) | implemented (partial) | U, C | Boards as passenger; pulls over safely after a switch. Errands are planned. |
| PM-045 | Partnership | Optional relationship presentation | Ext | planned | — | — |
| PM-046 | Activities | Race formats | VS | planned | — | — |
| PM-047 | Activities | Court/precision sports | Prod | planned | — | The Cooper Green court exists as geometry. |
| PM-048 | Activities | Gym/social sessions | Prod | planned | — | — |
| PM-049 | Activities | Water/aerial recreation | Ext | planned | — | — |
| PM-050 | Activities | Civilian work/exploration | Prod | planned | — | — |
| PM-051 | Story | Faction/contact knowledge | Prod | planned | — | — |
| PM-052 | Story | Objective authoring | VS | planned | — | — |
| PM-053 | Story | Systemic approaches | VS | planned | — | — |
| PM-054 | Story | Authored sequences | VS | planned | — | `ControlOwnershipService` has an authored-lock hook (U). |
| PM-055 | Story | Branches/checkpoints/endings | Prod | planned | — | — |
| PM-056 | Presentation | Animation blending/IK | VS | stubbed | C | Procedural pose rig only. Mixamo/mocap import is planned and blocked (see AssetManifest). |
| PM-057 | Presentation | Camera profiles | M1 | implemented | C | On-foot, vehicle and interior profiles; swept collision; switch transitions. |
| PM-058 | Presentation | Audiovisual feedback | M1 | implemented | C | Synthesised SFX, rumble, camera shake (with a reduced-shake option), post volume (URP). |
| PM-059 | Presentation | Radio/podcasts/phone | Prod | planned | — | — |
| PM-060 | Presentation | HUD/map/accessibility | M1 (HUD) | implemented | C | Heat panel with the reason, prompts, vehicle, clock, toasts. Camera-aligned minimap showing partner, safehouse, owned car, and police only when seen or heard. Invert Y, sensitivity, vibration, reduced shake. No full-screen map yet. |
| PM-061 | Runtime | Streaming/persistence | M1 (single district) | implemented | C | One district built at load. Streaming is planned. |
| PM-062 | Runtime | Save migration | M1 | implemented | U | Versioned, checksummed, migrated, with temp/backup recovery. |
| PM-063 | Runtime | Simulation tiers/budgets | M1 (budgets) | implemented (budgets) | C | Pedestrian budget, police unit cap, nearest-20 streetlights, partner AI at 4 Hz. |
| PM-064 | Runtime | Package/lifecycle/controller | M1 | implemented | C | Suspend → pause + autosave; controller disconnect → pause; UWP settings. The package is **not** built yet. |
| PM-065 | Runtime | Instrumentation/regression | M1 | implemented | C, P | Diagnostics overlay and JSON report; `-pmAutotest`; PlayMode smoke tests; CI. |
| PM-066 | Assets | Sourcing/licenses | M1 | implemented | — | `AssetManifest.md`; CC0 fetch with a hash lock; reference images excluded. |
| PM-067 | Assets | Art-direction harmonization | VS | planned | — | `ArtBible.md` (starting values). |
| PM-068 | Assets | Rigs/retargeting | VS | planned | — | Blocked on animation sources. |
| PM-069 | Assets | Import/LOD/collision/materials | M1 (materials) | implemented (materials) | C | PBR import rules and material templates. LOD is planned. |
| PM-070 | Assets | Custom-gap quality validation | VS | planned | — | Needs GPU captures. |
