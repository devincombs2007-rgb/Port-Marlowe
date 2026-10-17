# DREAD audio brief (for an AI sound generator)

Paste the **Global rules** at the top of every generation session, then request one batch at a time.
Priority order: **Batch A (Lurker, Phase 2)** → B (ambience) → C (Gaunt/Mimic) → D (music/stingers).

> **Update:** the available AI generator only makes continuous music, not short dry SFX. Use it for **Batch D (music)** and the
> looping ambience beds in Batch B (`amb_dread_bed_*`, `chase_lurker_loop`). Batch A SFX are synthesised in `tools/synth/` instead
> (see `docs/AUDIO_LICENSES.md`); Batch B one-shots and Batch C will be synthesised the same way unless real recordings are supplied.

## Global rules
- Game: Minecraft Bedrock psychological horror. Tone: dread, restraint, realism. **Dry, close-mic, no reverb tail, no music, no
  voice-over, no words** unless stated (reverb is added in-game by distance; baked reverb breaks positional audio).
- Deliver **WAV, 44.1 kHz, 16-bit, trimmed tight** (no leading/trailing silence >50 ms), peak around -3 dBFS, no clipping,
  no fades unless stated. **Mono** for anything attached to a creature or place; stereo only for music/stingers/ambience beds.
- Give **3-5 variations** of every one-shot (different takes, not just pitch shifts) so repeats are not noticeable.
- Looping beds must loop seamlessly (matching start/end, no click) and be 20-40 s.
- Quiet by default: most effects should sit at low level with real dynamic range; loudest items are marked **LOUD**.
- Filenames: lowercase, `a-z 0-9 _` only, exactly as listed (e.g. `lurker_breath_idle_01.wav`).
- For every file keep a text record: tool name, tool version/date, exact prompt, and the tool's licence tier.
  **Only use a plan whose terms allow commercial use and redistribution inside a game add-on.** No imitating a real person's
  voice, no copyrighted game/film sounds, no sampling of existing creatures from other games.

## Batch A: THE LURKER (distant observer; watches, repositions, vanishes when noticed)
Lurker = tall, thin, unnaturally patient. Sound is wet-dry, breathy, with faint wood-creak and bone-click undertones. Not a growl.
| File (xN variations) | Mono | Length | Description |
|---|---|---|---|
| `lurker_breath_idle_01..04` | Y | 3-5 s | Slow shallow breathing through a long narrow throat, faint rattle at the end of each exhale. Human-adjacent but wrong. Quiet. |
| `lurker_breath_alert_01..03` | Y | 2-3 s | Same breathing, faster, held-back, as if trying not to be heard. |
| `lurker_step_01..06` | Y | 0.3-0.6 s | One slow heavy-light footstep of a very tall thin barefoot creature on dirt/leaves; faint bone click. |
| `lurker_step_stalk_01..06` | Y | 0.3-0.5 s | Extremely careful footstep, almost silent, soft crunch of one twig. |
| `lurker_joint_creak_01..04` | Y | 0.4-1.0 s | Dry wooden-joint creak, as it shifts weight or turns its head. |
| `lurker_head_turn_01..03` | Y | 0.5-0.8 s | Slow vertebrae cracking as the head rotates too far. |
| `lurker_notice_01..03` | Y | 0.6-1.2 s | Sharp inhale through teeth when it realises it has been seen. **LOUD-ish.** |
| `lurker_vanish_01..03` | Y | 0.8-1.5 s | Soft collapse into nothing: a low cloth-like whoomph plus a single dry crack. No reverb. |
| `lurker_scrape_01..03` | Y | 1.5-3 s | Long fingernails dragged slowly along bark/stone. |
| `lurker_hurt_01..03` | Y | 0.6-1.2 s | Strangled, wet, inhuman exhale of pain. Not a scream. |
| `lurker_death_01..02` | Y | 2-3 s | Long exhale that decays into rattling and a final collapse of dry sticks. |
| `lurker_attack_swipe_01..03` | Y | 0.3-0.6 s | Fast limb whoosh with a dry snap. |
| `lurker_attack_hit_01..03` | Y | 0.3-0.6 s | Heavy bruising impact on a body, with a small bone crunch. |
| `lurker_chase_vocal_01..03` | Y | 1-2 s | Breathy rasping inhale-snarl while sprinting. **LOUD**, but still dry. |

## Batch B: world ambience (replaces vanilla scares; used by the Horror Director)
| File | Stereo | Length | Description |
|---|---|---|---|
| `amb_dread_bed_forest_loop` | Y | 30 s loop | Near-silence with distant wind in bare trees, occasional faint wood creak. Very low level. |
| `amb_dread_bed_cave_loop` | Y | 30 s loop | Deep cave air, slow low drone, distant drip, tiny stone settling. |
| `amb_dread_bed_tension_loop` | Y | 30 s loop | Low unstable drone building without melody; to blend over beds during Observation state. |
| `amb_branch_snap_01..05` (mono) | N | 0.3-0.8 s | Single dry branch snapping underfoot, outdoors. |
| `amb_leaves_rustle_01..04` (mono) | N | 1-2 s | Something moving through dry leaves, slow. |
| `amb_distant_whisper_01..04` (mono) | N | 2-4 s | Overlapping indistinct whispers, **no intelligible words**, far away, lots of breath, sounds like several people. |
| `amb_distant_cry_01..03` (mono) | N | 2-4 s | Very distant faint cry on the wind. Unclear whether human or animal. Never loud. |
| `amb_door_creak_01..03` (mono) | N | 1-2 s | Old wooden door slowly opening, unoiled. |
| `amb_structure_groan_01..03` (mono) | N | 2-4 s | Large timber building settling, long low groan. |
| `amb_drag_01..03` (mono) | N | 2-4 s | Heavy sack dragged across dirt floor, stopping abruptly. |
| `amb_heartbeat_slow_loop` / `amb_heartbeat_fast_loop` | Y | 8 s loops | Close muffled heartbeat (player stress feedback), 60 bpm and 110 bpm. Soft, no distortion. |
| `amb_silence_cut_stinger` | Y | 1.5 s | A sudden dull "pressure drop": low sub-bass thump then 1 s of near-silence tone. Used before an encounter, **not** a jumpscare. |

## Batch C: Gaunt and Mimic (request after Lurker is approved)
- **Gaunt** (heavy, deliberate predator): `gaunt_step_*` (slow, heavy, dragging), `gaunt_breath_*` (deep wet, laboured), `gaunt_search_sniff_*`, `gaunt_vocal_hunt_*` (low guttural), `gaunt_retreat_*`, `gaunt_attack_*`, `gaunt_hurt_*`, `gaunt_death_*`.
- **Mimic** (imitates familiar Minecraft sounds *imperfectly*): original near-imitations only, **not** copies of Mojang audio:
  `mimic_wrong_footstep_*` (human step with extra beat), `mimic_wrong_door_*`, `mimic_wrong_chest_*`, `mimic_wrong_hiss_*`
  (creeper-like but organic), `mimic_wrong_cow_*` (distorted, too slow), `mimic_voice_fragment_*` (a throat making vowel-like
  noises, **no words, no real-person voice**), `mimic_reveal_*`, `mimic_hurt_*`, `mimic_death_*`.

## Batch D: music and stingers (stereo; use sparingly)
- `chase_lurker_loop` (60-90 s loop): pulsing low strings and detuned drones, 100-120 bpm feel, no melody hook, builds only through layering. Provide 3 stems if possible (bass, mid, high) so intensity can be mixed in-game.
- `stinger_sighting` (1.5 s, moderate), `stinger_hunt_begin` (2.5 s, strong), `stinger_escape_relief` (4 s, soft resolving), `stinger_nightmare` (3 s, strong but not piercing).
- No sudden >-6 LUFS shocks; the add-on has an adjustable jumpscare intensity and the loudest file must still be tolerable.

## Hand-off
Drop WAVs into `assets-src/audio/<batch>/` with a `SOURCES.csv` (file, tool, prompt, licence). I will: validate them, trim/normalise,
convert to Ogg Vorbis mono/stereo as specified, wire `sound_definitions.json` / `sounds.json` / entity sound events, and record
attribution in `docs/AUDIO_LICENSES.md`.
