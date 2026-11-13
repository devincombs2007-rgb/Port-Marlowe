# Port-Marlowe — Wound Ballistics Lab (v0.4)

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
| G | grab tool: drag the body by any part |
| F | slow motion |

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
- **Physics** (`src/physics.js`, cannon.js): the subject is always a 17-segment rigid-body
  ragdoll with real segment masses and anatomical joint limits. Standing is a force balance:
  the legs push the pelvis up and the feet down, and a limited corrective force keeps the
  trunk over the feet, so a hard enough shove or pull tips it over. Muscle tone is a joint
  torque scaled by the nervous system: unconscious = limp, cord injury = no tone below the
  level, a fractured limb cannot brace. Projectiles transfer their actual momentum. Spent
  cases are rigid bodies. Floor friction is calibrated against measured sliding deceleration.
- **Behaviour** (`src/npc.js`): the "nervous system". It sets leg support, balance quality
  and muscle tone from the physiology; staggering, losing balance, falling and dragging away
  from the shooter along the floor all come out of the physics.
- **Sandbox tools**: grab tool (G) to drag the body by any part with a spring, slow motion (F).
- **Neurology** (`src/physiology.js`, `src/npc.js`): what the body does after a head wound
  depends on what is left. Brainstem destroyed: instant flaccid collapse. Hemispheres destroyed
  with the lower brainstem intact: rigid extensor (decerebrate) posturing and agonal gasping
  before the brainstem fails. Smaller wounds: tonic stiffening, often clonic jerking, then
  coma or continued consciousness. Also convulsive syncope, vasovagal fainting with recovery,
  and the orthostatic effect (a body that faints upright can come round lying flat).
- **Voluntary reactions**: a conscious subject puts a hand on the most serious wound it can
  reach (neck, chest, belly, thigh), coughs up blood after lung or airway hits, groans, and
  drags itself away from the shooter.
- **Wounds** (`src/body.js`): entry wounds are bullet-sized with an abrasion collar and
  bruising; exits are ragged and stellate. Powder stippling appears under ~75 cm and soot at
  near-contact. Where the temporary cavity reaches the surface the skin mesh is cratered and
  tissue, bone or brain fragments are thrown out.
- **Blood as a liquid** (`src/world.js`): every drop carries a volume. The floor is a 2.5 cm
  grid that holds a ~2 mm film and lets the excess flow downhill over a slightly uneven floor
  with recessed grout lines, so pools creep and finger. Bodies sliding through it smear it.
  Blood on walls runs down. Thin films dry toward brown.
- **Sound** (`src/audio.js`, `src/sounds.js`): gunshots and the pump / bolt cycling are real
  recordings from the public-domain Free Firearm Sound Effects Library (Still North Media,
  CC0), one per weapon type, played into a tiled-room reverb. Sources are listed in
  `assets/sounds/README.md`. Impacts, bone cracks, casings, body falls, dripping, breathing,
  coughs and agonal gasps are synthesized.

Untreated outcomes only. This is an educational model, not medical guidance.

## Known limits

- The .357 Magnum uses a .38 Special revolver recording and the .308 uses a .30-06 bolt action,
  the closest matches in the library. Non-gun sounds are still synthesized; the subject has no
  recorded voice.
- The subject is still the procedural mannequin, not a scanned or sculpted human model. Swapping
  one in means re-fitting the internal anatomy and hit testing to that mesh.
- The physiology numbers are plausible textbook-style estimates, not validated medical data.

## Ideas for v0.5

A real human mesh with skinning, recorded impact and voice audio, several subjects and a spawn menu, props
(cover, armour plates, clothing), stepping to recover balance, first-aid tools.
