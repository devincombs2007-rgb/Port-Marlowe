# Testing status

**Nothing in this add-on has been run inside Minecraft.** The sandbox used for development cannot run Bedrock.

## Automated (run with `npm run check`, also in CI)
| Check | What it proves | What it does *not* prove |
|---|---|---|
| `tsc --strict` against `@minecraft/server@2.0.0` types | Every API call exists at the declared baseline version | Runtime behaviour |
| Integration tests on a mock API (`tests/smoke.mjs`) | Director + Lurker adapters run end to end: spawn, notice/vanish, hunt caps, light counterplay, death cleanup, orphan adoption, a 3-hour soak | Anything about the real game; the mock models only what DREAD calls |
| Pure-logic simulations (`tests/director.test.ts`, `tests/lurker.test.ts`) | Fairness gates, state coverage, no regular timers, variety, determinism, every hunt ends | That it feels scary or fair to a human |
| `tools/validate.mjs` | Manifest structure/UUIDs/dependencies, stable-only script modules, path hygiene (iOS is case-sensitive), JSON vs Mojang's official schemas (`@minecraft/bedrock-schemas` 1.26.50; the geometry schema is broken upstream so geometry is checked structurally, including UV bounds), entity→geometry/texture/animation/controller/sound/particle references, animation→bone existence, Ogg validity, size budgets | That Minecraft accepts and renders the content |
| Packaging | Deterministic `.mcaddon` / `.mcpack` zips with correct folder layout | That the iOS importer accepts them |

Known validator limits: Mojang's published schemas contain a few dangling `$ref`s (treated permissively), an incorrect
`languages.json` schema, a geometry schema that types numbers as strings, and a fog schema that types the identifier as boolean
(all checked by hand instead). The validator also confirms every `dread:` / `dread.` identifier the scripts reference exists in the packs. Schema validity is not the same as in-game validity.

## Manual test checklist for Phase 1 (needs a human on a device)
1. Import `DREAD-0.2.1-test.mcaddon`; confirm both packs appear.
2. Create a world with cheats ON, activate DREAD BP + RP. No "Beta APIs" toggle should be required.
3. On first join expect an action-bar message "DREAD v0.2.1 loaded" after ~5 s.
4. `/scriptevent dread:status` prints settings. `/scriptevent dread:set soundIntensity 30` then status shows 30.
5. Content log (Settings → Creator → Enable Content Log GUI) shows `[DREAD] script loaded` and no errors.
6. **Audio test:** run `/scriptevent dread:sound all`. 14 Lurker sounds play 3 s apart on a ring 6 blocks around you, the first
   one directly behind. Check on headphones: left/right/behind placement, volume balance, anything that clips, is too loud, or
   sounds more comedic than frightening. Try `/scriptevent dread:sound step_stalk` etc. for single sounds. Note which need rework.
7. Record: device, iOS version, Minecraft version, pass/fail per step.

## Manual test checklist: Phase 2/3 (needs a human on a device)
Run in a Survival world with cheats on (so `/scriptevent` works). Turn on `/scriptevent dread:set debug true` for diagnostics.
1. **Look and sound**: `/scriptevent dread:spawn observe`. A tall hunched creature appears 14-24 blocks away. Does the model look right (no
   floating/clipping parts, correct facing, texture on the right faces)? Does it animate (idle sway, head tracking you)?
2. **Notice**: stare at it. Expect a head-snap + sound, then it vanishes with smoke. Note the time to react.
3. **Stalk**: `/scriptevent dread:spawn stalk`. It should walk toward you slowly; look at it and it should stop/leave.
4. **Hunt**: `/scriptevent dread:spawn hunt`. It should sprint and attack with a swipe animation. Check that the damage and speed feel
   fair. Then repeat holding a torch: it should retreat within ~5 s.
5. **Director**: `/scriptevent dread:state`. Then `/scriptevent dread:force unease` and wait: ambient sounds should arrive from
   behind/sides. Try `dread:stress 80` and `dread:dread 60` underground at night and watch for escalation. Use `dread:force dormant` to reset.
6. **Settings**: `intensity`, `soundIntensity`, `jumpscareIntensity`, `effects`. Confirm lower values are noticeably quieter/rarer.
7. **Multiplayer/Realm** (if possible): two players; confirm each only hears their own ambient cues and Lurkers belong to one player.
8. **Performance**: note frame rate with a Lurker present on your iPhone model, and any hitching when ambient sounds fire.
9. **Fog/shake**: at night or underground, `dread:force escalation` should close the view in; `dread:force dormant` should lift it. `dread:force hunt` should shake the camera briefly. Confirm `/fog` and `/camerashake` work from script on iOS, and that `effects performance` disables both.
10. Report: device, iOS + Minecraft version, steps that failed, screenshots of the model, and content-log errors.

Unverified assumptions that this checklist should settle: component-group swapping via events behaves as intended;
`move_towards_target` produces stalking movement; `query.property('dread:state')` drives animations on the client; animation
sound events and the ring-positioned `playSound` work on iOS; the entity fits through 3-high spaces.

## Gaps
- No iPhone, Xbox or Realms test has occurred. No performance benchmarks exist.
- Multiplayer behaviour is unverified (code is written per-player, nothing yet shared).
