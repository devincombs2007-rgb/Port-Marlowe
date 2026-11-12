# Port-Marlowe — Wound Ballistics Lab (v0.1)

A browser-based 3D simulator of gunshot wounds. A test subject stands in a chamber; every
round is traced millimetre by millimetre through skin, bone, organs and vessels, and the
body then responds in real time (bleeding, blood pressure, breathing, consciousness).

**Run it:** serve this folder with any static server (`python3 -m http.server`) and open
`index.html`. No build step. `node tools/build.js` bundles a single-file page into `dist/`.

## Controls

| | |
|---|---|
| Mouse / click | aim / fire |
| Right-drag or arrow keys | look |
| W A S D | move around the subject |
| Touch | tap to fire where you tap, drag to look, stick to move |
| 1–0 | weapon |
| X | X-ray view (skeleton, organs, vessels, wound tracks) |
| T | time speed ×1 / ×4 / ×15 / ×60 |
| R | new subject |

## What is modelled

- **Anatomy** (`src/anatomy.js`): 1.78 m / 77 kg adult. 17 articulated segments; skull,
  mandible, 24 vertebrae with cord and cauda equina, 12 rib pairs with costal cartilage,
  sternum, clavicles, scapulae, pelvis, limb bones; brain (cerebrum, cerebellum, brainstem),
  heart, lungs, liver, stomach, spleen, pancreas, kidneys, bowel, bladder, trachea,
  esophagus; aorta, venae cavae, pulmonary, subclavian, carotid, jugular, brachial, radial,
  iliac, femoral and tibial vessels. Blood volume 5.4 L.
- **Ballistics** (`src/ballistics.js`, `src/weapons.js`): drag + tissue-strength
  deceleration per tissue type; JHP / soft-point expansion, FMJ yaw and tumble, fragmentation,
  deformation and deflection on bone, skin perforation thresholds, permanent and temporary
  cavity. Calibrated against published 10 % gelatin penetration (`node tools/gel.js`).
- **Physiology** (`src/physiology.js`): per-wound bleeding driven by arterial pressure and
  clotting, external vs internal loss, ATLS haemorrhage classes, compensatory tachycardia,
  tamponade, pneumothorax / haemothorax / tension, airway, spinal cord level effects,
  neurogenic shock, brain perfusion and oxygen reserve, cardiac arrest, brain death.
- **Behaviour** (`src/npc.js`): bullets do not throw the body. The subject flinches, guards
  the wound, goes down voluntarily or collapses when legs, cord, blood pressure or the
  brain fail.
- **Blood** (`src/world.js`): entry/exit wounds, forward and back spatter, drips, arterial
  spurting, and floor pools whose area is computed from the volume actually lost.

Untreated outcomes only. This is an educational model, not medical guidance.

## Ideas for v0.2

Physics ragdoll, clothing and body armour, slow-motion bullet camera, first-aid
(tourniquet, chest seal, pressure), more calibres and ranges, subject variation.
