# Port Marlowe — Titanic spectator simulation: roadmap

The goal is a real-time 3D spectator reconstruction of the sinking, at true scale, in which the physical systems drive one another and every detail says whether it is documented or reconstructed. Literal 100 % replication is impossible: the evidence does not fix every conversation, movement, interior detail or second of the breakup. The target is a set of physically consistent, tested approximations that run in real time.

## Architecture

| Layer | Approach | Status |
|---|---|---|
| Water & air | Connected-compartment network: water volume and air mass per space, inertial flow through every opening (unsteady orifice equation), isothermal air with choked/sub-critical vent flow, exact conservation ledger | **Phase 1 done** (`src/physics2/fluid.js`) |
| Ship motion | Rigid hull sections, 2.5D hydrostatics from the real hull lines, added mass, direction-dependent drag | Exists in the 2D sandbox (`src/sim/`); to be rebuilt on the new core in Phase 2 |
| Structure | Hull-girder bending/shear from Newton's law per section, progressive fibre failure, plastic hinge | Exists in the 2D sandbox; Phase 2 |
| Objects | Rigid bodies with mass distribution, attachments with strengths, tension-only ropes, pulleys | Ropes, pulleys, boat body **done**; attachments Phase 3 |
| Local detail | Cheap visual effects near the camera (jets, spray, bubbles), physics everywhere | Phase 2–3 |
| Clock | Fixed 1/240 s steps with automatic sub-stepping for stiff openings; rendering decoupled | **Done** (`src/physics2/clock.js`) |
| Data | Every parameter in JSON with units and a source or a stated estimate | **Done** (`src/physics2/data/`) |

## Phase 1: fundamentals (this release)

Six demonstrations, each checked against an analytic result (`npm run test:physics`, report in `docs/physics-validation.md`, live in `lab.html`):

1. Two connected tanks: exact conservation, final level V/(S₁+S₂), flow inertia overshoot, U-tube period.
2. Sealed vs vented tank: Boyle's-law equilibrium, trapped air pocket, restricted vent delays flooding.
3. Tilting part-filled containers: gravity-aligned surface, free-surface CG shift (b³/12)/V·tanθ, broad vs narrow, first-mode sloshing period.
4. Hinged door under pressure: integrated force and torque, latch failure depth vs hand calculation, door opening direction, equalisation once open.
5. Unevenly lowered loaded boat: tension split from statics, tilt, passengers shifting load, tension-only slack when afloat, draught from hydrostatics, transverse GM.
6. Frame-rate independence: bit-identical results at 24/60/144 fps and jittery frame times; repeatability; timestep convergence.

Plus: detachment velocity including deck rotation, glass failure pressure from pane size and thickness, and a mass ledger that keeps displacement (mass) separate from gross register tonnage (volume).

## The 40 requested details: status

| # | Detail | Status |
|---|---|---|
| 1 | Pressure-driven jets | Core: flow direction and rate from Δp per slice. Visual jets: Phase 2 |
| 2 | Compressed air pockets | **Done** (demo 2) |
| 3 | Ventilation paths | **Done** in core (vents are openings with real areas); ship's ventilation trunks: Phase 2 |
| 4 | Free-surface effect | **Done** (demo 3) |
| 5 | Water momentum | **Done** (inertial openings, demo 1) |
| 6 | Floodable volume | **Done** (permeability and solid contents per cell) |
| 7 | Added mass | **Done** for boat bodies (anisotropic); hull: Phase 2 |
| 8 | Direction-dependent drag | **Done** (per-face broadside vs edgewise) |
| 9 | Gravity-aligned surfaces + sloshing | **Done** (demo 3) |
| 10 | Locally generated waves | 2D surface solver exists in the game; to couple to new core in Phase 2 |
| 11 | Rotational inertia from mass layout | **Done** (point masses + hull inertia) |
| 12 | Detachment velocity | **Done** (check) |
| 13 | Material-specific friction, wetness | Parameters in data file; contact solver Phase 3 |
| 14 | Attachment points with strengths | Phase 3 |
| 15 | Pressure-loaded doors | **Done** (demo 4) |
| 16 | Tension-only ropes | **Done** (demo 5) |
| 17 | Pulleys | **Done** (parts, sheave friction on the hauling part) |
| 18 | Independent suspension points | **Done** (demo 5) |
| 19 | Passenger weight in boats | **Done** (load shift, heel from GM) |
| 20 | Hollow objects | Sealed vs vented tank done; general containers Phase 3 |
| 21 | Pressure-sensitive glass | Failure pressure formula done; wiring into openings Phase 2 |
| 22 | Fabric | Phase 5 |
| 23–27 | Steam, pipes, pumps, electrical circuits, shaft inertia | Phase 4 |
| 28 | Mass ledger | **Done** (`titanic_ledger.json`) |
| 29 | Heat transfer, condensation | Phase 4 |
| 30 | Editable parameters with units and sources | **Done** |
| 31–34 | Feet on moving decks, balance and grip, water forces on bodies, wet clothing | Phase 5 |
| 35 | Frame-rate independence | **Done** (demo 6) |
| 36 | Continuous collision detection | Phase 3 (with loose objects) |
| 37 | Mass and volume conservation | **Done** (ledger checks to 1e-13 m³) |
| 38 | Coordinate precision | Local frames per section; world kept within a few km of origin |
| 39 | Off-camera activity | All compartments step every frame regardless of camera |
| 40 | Repeatability & convergence | **Done**; cross-platform limits documented in the validation report |

## Audit (completeness pass)

- 3D model: the superstructure now follows the hull's sheer and narrows where the hull narrows (it previously overhung the hull at both ends). The bow names are set letter by letter on the curved plating. The stern carries the name and port of registry, and the counter's underside is black rather than red. Added the bower anchors, anchor crane, docking bridge, stern light and expansion-joint lines. Captain Smith now stands clear of the wing cab, and passengers stand clear of the stowed boats. Carpathia is a lofted hull to her real 164.9 m × 19.7 m.
- 3D timeline: a sweep of 285 moments across the whole night finds no invalid geometry, cameras or console errors. Rusticles in the epilogue hang from the wreck as it actually lies.
- 2D physics sandbox: added linearised wave-radiation damping (previously the hull pitched without settling). A full room's pressure is now solved from the flow balance with a volume correction, so water is conserved to about 1e-10 m³; the earlier solver throttled flow and lost water. Glass burst pressures come from the plate-bending calculation. Non-watertight doors and window leakage were added. The breach area is restored to the inquiry estimate (~1.1 m²).
- Physics core: air equalisation uses an exponential update, so errors now shrink at every halving of the timestep (checked).

## Next phases

- **Phase 2 — the ship drives itself.** Move the ~140 Titanic spaces onto the new fluid core: real openings (hatches, stairwells, doors as hinged doors, watertight doors, ventilation trunks, portholes with glass failure). Couple to a heave/pitch/roll ship-motion model using the mass ledger. Replace the scripted trim with the computed one. Validate against the historical anchors (trim at 01:00, forecastle awash ~01:40, ~11–12° at the break, sinking at 02:20) and publish the comparison. Add a 3D cutaway showing water levels and trapped air.
- **Phase 3 — walkable interiors and loose objects.** Grand Staircase, dining saloon, cabins, Scotland Road, boiler and engine rooms, built from the deck plans. Add an evidence overlay with confidence labels (documented / inferred / invented). Add furniture as rigid bodies with friction and attachments, plus first-person walking.
- **Phase 4 — ship systems.** Steam supply, piping, pumps with performance curves, electrical circuits (lights failing by circuit), and shaft inertia.
- **Phase 5 — people.** Agents with cabins, jobs and changing awareness. Documented actions follow testimony and are labelled; invented movement is marked as reconstruction. Add body physics on the moving deck.
- **Phase 6 — spectator tools and modes.** Recorded camera paths, instant replay, narrated tours, peaceful pre-collision exploration, and a wreck exploration mode. Slow motion, fast-forward, lenses and a hidden interface are already in.
