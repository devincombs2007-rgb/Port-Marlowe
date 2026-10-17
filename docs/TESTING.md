# Testing status

**Nothing in this add-on has been run inside Minecraft.** The sandbox used for development cannot run Bedrock.

## Automated (run with `npm run check`, also in CI)
| Check | What it proves | What it does *not* prove |
|---|---|---|
| `tsc --strict` against `@minecraft/server@2.0.0` types | Every API call exists at the declared baseline version | Runtime behaviour |
| Mock-API smoke tests (`tests/smoke.mjs`) | Command parsing, settings clamping, corrupt-property fallback | Anything about the real game |
| `tools/validate.mjs` | Manifest structure/UUIDs/dependencies, stable-only script modules, path hygiene (iOS is case-sensitive), JSON vs Mojang's official schemas (`@minecraft/bedrock-schemas` 1.26.50), entity→geometry/texture/animation/sound references, Ogg validity, size budgets | That Minecraft accepts and renders the content |
| Packaging | Deterministic `.mcaddon` / `.mcpack` zips with correct folder layout | That the iOS importer accepts them |

Known validator limits: Mojang's published schemas contain a few dangling `$ref`s (treated permissively) and an incorrect
`languages.json` schema (checked by hand instead). Schema validity is not the same as in-game validity.

## Manual test checklist for Phase 1 (needs a human on a device)
1. Import `DREAD-0.1.1-test.mcaddon`; confirm both packs appear.
2. Create a world with cheats ON, activate DREAD BP + RP. No "Beta APIs" toggle should be required.
3. On first join expect an action-bar message "DREAD v0.1.1 loaded" after ~5 s.
4. `/scriptevent dread:status` prints settings. `/scriptevent dread:set soundIntensity 30` then status shows 30.
5. Content log (Settings → Creator → Enable Content Log GUI) shows `[DREAD] script loaded` and no errors.
6. **Audio test:** run `/scriptevent dread:sound all`. 14 Lurker sounds play 3 s apart on a ring 6 blocks around you, the first
   one directly behind. Check on headphones: left/right/behind placement, volume balance, anything that clips, is too loud, or
   sounds more comedic than frightening. Try `/scriptevent dread:sound step_stalk` etc. for single sounds. Note which need rework.
7. Record: device, iOS version, Minecraft version, pass/fail per step.

## Gaps
- No iPhone, Xbox or Realms test has occurred. No performance benchmarks exist.
- Multiplayer behaviour is unverified (code is written per-player, nothing yet shared).
