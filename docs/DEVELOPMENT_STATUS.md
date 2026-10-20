# THE HOLLOW development checkpoint — 1.0.3

## Latest continuation: 1.0.3 — darker Visuals

Responds to the report that the Visuals pack is too bright. Preserves all 1.0.2 gameplay fixes.

- Reduce sunlight to 75–80 lux in wild/cold looks and 70 lux in swamps (formerly 100/85).
- Reduce peak moonlight from 0.5 to 0.16–0.20 lux, preserving its existing on/off timing.
- Surface ambient light now falls from 0.018 by day to 0.012 at night, instead of rising to 0.045.
  Cave ambient stays at 0.009; no hard black cutoff or negative grading offset is introduced.
- Reduce sky fill, night moon haze and volumetric scattering. Keep fog density, height falloff,
  air/weather distance ranges and vanilla underwater definitions intact.
- Lower midtone gain to 0.86–0.90 and highlight gain to [0.88, 0.85, 0.81]. Retain standard gamma
  2.2, the shared generic tone mapper and warm local-light colours.
- Correct a stray mutation-test sound identifier in the TypeScript source (`hollow.nopewatcher.seen` → `hollow.watcher.seen`). The previously packaged script already used the correct identifier.
- Keep all pack UUIDs stable and advance pack/module/dependency versions together to 1.0.3.

The darker profile still needs a same-scene check inside Minecraft on the user's device;
parameter reductions are not a measured percentage reduction in screen brightness.
See `docs/VISUAL_TUNING.md` for scope, exact changes and update steps.

## Previous continuation: 1.0.2

- Fixed wards and lanterns losing their saved registration when a query crosses an unreadable chunk.
- Prune genuinely removed, readable equipment before applying placement caps. Extra Heartwood
  Lanterns now explain that they give light only when the 16-lantern protection cap is full.
- Extended grace-day settings now also delay the Borrowed, Mirebound and natural Knocker visits.
- Ward charge history persists across saves/restarts and separates dimensions. One creature type
  cannot drain another charge by returning after a restart on the same night.
- All five natural encounter spawners check both their target and chosen spawn location against
  Heartwood Lantern protection. Wild Hollowed ignore noise inside the protected radius and
  disappear if they enter it. Mirebound cannot start a grab on a protected player.
- Journal/settings use one navigation session per player, bounded busy retries and disconnect-safe
  cancellation. Delayed responses cannot enter a new session. An entry remains unread when its
  form never opened. Corrupt saved settings recover valid defaults; settings forms preserve the
  complete supported grace/night ranges.
- Completed a portable Sound Booth export with embedded MP3 audio, local review storage and JSON
  feedback export. It no longer requires a Claude session to collect feedback.
- Queued page/lens uses now cancel on a hotbar swap; repeated page callbacks cannot unlock
  more lore entries than the pages consumed.
- Corrected the older audio credits and release counts against the current shipped catalogue.

Verification: 60/60 headless simulation scenarios; strict TypeScript compilation; static schema
and reference validation. The portable Sound Booth passed its separate headless Chromium check: 150 embedded audio
variants, MP3 decoding, review storage, filters, feedback export and storage-disabled fallback,
with no network requests. This does not establish iPhone Safari playback or human audio quality.
Consult `docs/TESTING.md` for the remaining engine tests.

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
The original 1.0.1 pass changed only swamp density; the later 1.0.3 lighting/grading changes are documented above.

## Verified locally

- Strict TypeScript compilation against the pinned stable Script API typings.
- Static schema and reference validation: zero errors, zero warnings.
- 60/60 headless scenarios, including event, shelter protection, saved-setting and journal regressions.
- Importable archives rebuilt from the current source with version `1.0.3` manifests.

## Still requires Minecraft

No iPhone, Xbox, Windows or Realm runtime test has been performed. Next, follow
[TESTING.md](TESTING.md), including the event checks, and compare swamp/forest visibility at
dusk, midnight and during rain with Vibrant Visuals on and off. Check the Heart model and eye
animations in the engine, listen to the audio, and collect device performance observations.
Headless simulation does not establish those results.
