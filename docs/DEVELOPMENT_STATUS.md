# THE HOLLOW development checkpoint — 1.0.1

## Starting point

This continuation builds on `the-hollow-addon` at commit `dfc3ec605bdd14a3903d93dbc81097deb7373966`
("Rebuild the Heart Below model; Watcher moss"). That commit already includes the new watchtower,
lean-to, collapsed cabin, journal lore, creature tracks, music and three rare events. The Heart
model and Watcher moss are preserved.

The supplied Claude screenshots end during a numerical review of the optional Visuals pack,
with a proposed swamp-fog reduction. The committed generator still used density `0.085`.
Uncommitted work from Claude's session is unavailable.

## Implemented in this continuation

- Every Eye and On the Roof cancel on departure, death, dimension change or moving more than
  32 blocks from the scene. Queued callbacks from a cancelled event cannot affect a new event.
- Animals that leave the event's dimension or area stop receiving stare/slowness updates.
- Roof footsteps follow a fixed path at the original shelter, even when the listener moves.
- A lantern in an unreadable chunk remains pending. A failed page spawn leaves the lantern lit
  for a later retry. Successful rewards are committed once before optional audio/visual work.
  Player replacement blocks are preserved and clear the obsolete scene without a phantom page.
- Swamp volumetric fog density is reduced to `0.07` in the generator and all three swamp files.
- Reference fetching includes vanilla sound definitions and refreshes existing sparse checkouts.
  A checkout at a different commit fails the pinned-version check instead of silently validating
  against different data.
- Pack/module versions and the BP-to-RP dependency advance together to `1.0.1`, preserving UUIDs.

## Visuals review

Reference: Mojang `bedrock-samples`, tag `v1.26.50.4`, commit
`46ba6ea985fb5a92d79a9419198f10dda14c199d`. These are numerical comparisons, not rendered results.

| Fog group | Maximum air density | Height falloff | Distance-fog start, clear / weather |
|---|---:|---|---|
| Forest and other wild biomes | 0.055 | Maximum at Y62, zero at Y100 | 70% / 25% of render distance |
| Cold biomes | 0.050 | Maximum at Y64, zero at Y110 | 70% / 20% |
| Swamps | 0.070 (previously 0.085) | Maximum at Y60, zero at Y82 | 55% / 20% |
| Caves | 0.030 | Uniform | 75% / 75% |

The pinned pale garden and sulfur cave fog definitions both use `0.07` maximum air density;
the End uses `0.25`. Matching a reference density is a conservative tuning choice, not an
engine limit or proof that visibility is good. Scattering, absorption, light and height all
affect the final image. Clear-air distance fog ends at 100% of render distance; weather fog
ends earlier, at 65–75% outdoors. Water fog is inherited from each vanilla biome.

Lighting keeps nonzero cool ambient light and moonlight. The four grading profiles share the
`generic` tone-mapping operator, allowing a consistent operator across biome transitions.
No additional lighting or grading changes were made in this pass.

## Verified locally

- Strict TypeScript compilation against the pinned stable Script API typings.
- Static schema and reference validation: zero errors, zero warnings.
- 45/45 headless scenarios, including eight new event regression scenarios.
- Importable archives rebuilt from the current source with version `1.0.1` manifests.

## Still requires Minecraft

No iPhone, Xbox, Windows or Realm runtime test has been performed. Next, follow
[TESTING.md](TESTING.md), including the event checks, and compare swamp/forest visibility at
dusk, midnight and during rain with Vibrant Visuals on and off. Check the Heart model and eye
animations in the engine, listen to the audio, and collect device performance observations.
Headless simulation does not establish those results.
