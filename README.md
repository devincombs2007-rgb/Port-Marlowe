# Port-Marlowe — Wound Ballistics Lab (v1.4)

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
  ragdoll with real segment masses and anatomical joint limits. Limbs are capsules and the head a
  sphere, so they roll and settle like limbs; trunk, hands and feet are boxes. Joints have passive
  damping, the resistance tissue gives even with no muscle tone. Standing is a force balance on the
  legs plus capture-point stepping: when a push or a hit carries the centre of mass outside the feet,
  the lagging foot swings to where the body is heading, so the subject stumbles and catches itself,
  then steps its feet back to a normal stance. Pushed or pulled further than a step can recover
  (roughly 250 N·s and up), it goes over, throwing its hands out toward the floor to break the fall.
  After a fall that did not disable it (a shove, a faint, coming round from a knockout) it sits up,
  draws its knees in, plants its feet and stands back up; someone who went down from pain or with a
  leg injury stays down; it gets up from its back (sit up, knees in, stand) or from its front (push up,
  kneel, stand). The hip has its anatomical range (about 120° flexion, 20° extension). After being hit,
  someone who stays on their feet usually backs away from the shooter: the balance target is held a
  little ahead of the feet, so the body keeps leaning and the stepping carries it, staggering. Most
  of them then turn their back and walk off: a yaw torque on the trunk and re-planted feet turn the
  body over a few steps (committing to one direction, so a half turn does not dither), and it walks
  away at roughly 0.3 to 0.5 m/s, stopping short of the walls. A hit makes the struck part go slack and jerk away
  from the shot; a leg hit buckles the knee. A head striking the floor during a fall can concuss (unconscious for
  tens of seconds to minutes, likelier above ~4 m/s) or, above ~6.5 m/s, fracture the skull. Muscle tone is set by the nervous system:
  unconscious = limp, cord injury = no tone below the level, a fractured limb cannot brace.
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
- **Time to incapacitation**: a large open artery drops blood pressure at once (it is a low-resistance
  path out of the circulation), not only as volume is lost; a cut carotid also takes away part of the
  brain's own supply. Typical untreated timings: heart destroyed, unconscious ~12 s; aorta cut ~30 s;
  carotid cut ~2 min; femoral artery ~3 min; brachial artery ~9 min; liver or spleen ~17-18 min;
  brain death ~5 min after the heart stops. These are model outputs, chosen to fall inside published
  forensic ranges, not validated predictions.
- **Blood appears over time**: a fresh bullet hole first shows almost nothing (elastic skin closes over
  the track and small vessels spasm). Tissue wounds start to show blood after about 1.5-4.5 s and build
  over the next several seconds, veins after about 1-2 s, a cut artery at once. The skin stain grows only
  with the blood that has actually come out, a rim first and then a trickle running downhill. Entry
  back-spatter is a faint mist except at close range or from high-energy rounds.
- **Wound awareness and pressure**: adrenaline masks pain, so torso, neck and head wounds are noticed
  within about a second, limb wounds after a few seconds, and about a quarter of minor limb wounds not
  at all; a broken bone or a wound pouring blood is noticed at once. Both hands go to one wound when it
  is clearly the worst. A hand on a wound halves external venous/tissue bleeding (a quarter for an
  artery; two hands more); internal bleeding is unaffected. Someone pressing on a serious wound stays
  put rather than crawling away. As consciousness fades, the grip weakens and the hands fall away.
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
- **Circulation you can see**: skin pales as blood is lost, turns blue-grey as oxygen saturation
  falls, and goes waxy grey after death. Pupils widen with shock and are fixed and dilated once the
  brainstem has failed.
- **Ricochets**: a bullet striking the floor or a wall at under ~15° usually skips off instead of
  digging in, leaving a shallow gouge and sparks and carrying on flatter with a fraction of its
  energy (up to two bounces, with a ricochet whine). Each shot leaves a puff of powder smoke.
- **Sound** (`src/audio.js`, `src/sounds.js`): gunshots and the pump / bolt cycling are real
  recordings from the public-domain Free Firearm Sound Effects Library (Still North Media,
  CC0), one per weapon type, played into a tiled-room reverb. Sources are listed in
  `assets/sounds/README.md`. Impacts, bone cracks, casings, body falls, footsteps, dripping, breathing,
  coughs and agonal gasps are synthesized.

Untreated outcomes only. This is an educational model, not medical guidance.

## Assets and credits (all CC0 / public domain)

- **Character**: MakeHuman base mesh, skeleton weights and morph targets
  (github.com/makehumancommunity/makehuman, assets CC0). `tools/build_human.py` re-poses it onto
  the simulator skeleton, maps its 163 bones to the 17 ragdoll segments, and fits the hit
  volumes to the skin. It also carries the base mesh UVs (vertices split at texture seams) for the
  photographic `young_caucasian_male` skin, and fits the `short02` hair and `eyebrow001` proxy meshes
  (MakeHuman .mhclo fitting: each proxy vertex is a weighted sum of three body vertices plus a scaled
  offset) and skins them to the same skeleton. Skin, hair and eyebrow assets are MakeHuman system
  assets, released as CC0 in September 2020 (fetched from a public copy of MakeHuman's data folder).
  Output: `src/human.js`. Run: `python3 tools/build_human.py <makehuman data> <proxy and texture dir>`.
- **Audio**: see `assets/sounds/README.md` (Still North Media firearm library, OpenGameArt
  packs by qubodup, haeldb, badre-eddine and rubberduck, Kenney Impact Sounds).
- **Lighting**: filmic tone mapping plus an image-based reflection of the tiled room and its two
  ceiling panels, so skin, eyes, wet blood and gun metal pick up soft reflections.
- **Weapons**: modelled in code (`src/world.js`) from side-profile outlines.

## Testing

`G.debug.tick(dt)` steps the whole simulation deterministically. The physics was reviewed from
frame-by-frame contact sheets of each scenario (knockout, conscious descent, rigid posturing,
close-range and rifle wounds), not only from end-state numbers.

## Known limits

- The .357 Magnum uses a .38 Special revolver recording and the .308 uses a .30-06 bolt action,
  the closest matches in the library. The continuous breathing is still synthesized; coughs and agonal gasps are recordings.
- One body type and one face. Eyes are modelled spheres with a painted iris, not MakeHuman's eye mesh.
- Weapon models are simple profiled shapes, not scanned or sculpted assets.
- The subject walks away but cannot run, and only flees from the shooter (no other goals).
- The physiology numbers are plausible textbook-style estimates, not validated medical data.

## Ideas for v0.6

Skin texture and hair, sculpted weapon assets, several subjects and a spawn menu, props
(cover, armour plates, clothing), stepping to recover balance, first-aid tools.
