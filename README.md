# Port Marlowe

A real-time reconstruction of the sinking of RMS Titanic, built on tested physics.

- `dist/index.html`: **Titanic: The Final Hours**, the 3D spectator reconstruction with story mode, cinematic and point-of-view cameras, and speed and lens controls.
- `dist/lab.html`: **Physics Lab**, live demonstrations of the physics fundamentals with pass/fail checks.
- `dist/sandbox.html`: the 2D destructible-ship physics sandbox.

## Commands

```
npm install
npm run build          # bundles all three pages into dist/
npm run test:physics   # headless validation; writes docs/physics-validation.md
npm run test:sim       # 2D sandbox flooding/breakup run
```

## Where things live

- `src/physics2/`: the physics core (compartment water/air network, doors, ropes and pulleys, rigid bodies, fixed-step clock).
- `src/physics2/data/`: editable parameters, each with units and a source or stated estimate, plus the Titanic mass ledger.
- `src/three/`, `src/main3d.js`: the 3D reconstruction.
- `src/replay/`: the historical timeline (events, lifeboat times, trim keyframes).
- `docs/ROADMAP.md`: phase plan and the status of each requested detail.
