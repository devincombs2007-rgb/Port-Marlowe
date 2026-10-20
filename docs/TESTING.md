# In-game test checklist (about 30 minutes)

A fast first pass on **Windows** (best for reading errors). Repeat the short Realm and Xbox section at the end.

## Setup (2 min)
1. Import `THE_HOLLOW_v1.0.3.mcaddon`. Create a **new world**: Survival, cheats **on**, the behavior pack plus the Visuals pack, all experiments off.
2. Settings → Creator → turn on **Content Log GUI**. Settings → Accessibility → turn on **Subtitles**.
3. In the world, run:
   ```
   /scriptevent hollow:test on
   /scriptevent hollow:test kit
   /scriptevent hollow:test journal
   ```
   Test mode removes every wait: no grace days, no cooldowns, encounters about 25× likelier, and every day-gate open.
   It's for operators only and **switches itself off on restart**.

**Watch throughout:** the content log should show no red errors. `/scriptevent hollow:status` prints a summary that
includes a `failures:` count, which should stay `none`.

## Creatures (15 min)

| # | Where / how | Check |
|---|---|---|
| 1 | Forest, `/scriptevent hollow:test night`, look around | A tall figure appears 30–50 blocks away **outside your view**, you hear the hush, and subtitles show. Stare at it: it withdraws and a **Pale Resin** glints where it stood. Turn your back with no torch: you hear a twig snap behind you, then one strike. Hold a torch: no strike. |
| 2 | Near a flock of ≥2 sheep, at night | One "sheep" never grazes. Its low bleat shows the subtitle "A sheep bleats, too low". Shears reveal it, and so does the **Lens** (only for you). It hunts at night and flees by day. |
| 3 | Dig or find a cave below Y 0 | **Clicking** in the dark, and it emerges out of sight. **Sneak**: it ignores you. **Sprint**: it comes. Throw a **snowball** away from you: it goes to the impact. |
| 4 | Swamp or river shallows | Bubbles, gurgles and a mossy hump. Wade close: it rears up (a short windup), then **grabs you**. **Press Sneak**: you break free. Note whether the grab actually seats you. If not, you should get a bite and slowness instead. |
| 5 | Build a 5×5 roofed hut with a door, stand inside, `/scriptevent hollow:test knocker`, then `hollow:test night` | Within a few minutes: the chime rings, then **three knocks**, scratching and breathing. Don't open: about 45 s later it leaves and a **Knocker's Nail** is on the step. Next time, place a **Rowan Ward** by the door: it should be turned away (Use the ward: 3/4). Open the door during a visit: it comes in. |

## Places and boss (8 min)
6. Hold the **Heartseeker** and press Use: the subtitle "Heartseeker beats" shows, a direction and distance appear, and a red star appears on the locator bar. Dig to it. The shrine should be intact: 4 pillars, an altar and candles. The shrine music starts.
7. Use the **Offering** on the altar: the title appears and the Heart rises after about 6 s. Check the **shield** (a hint when you hit it), break **4 veins**, and see the dust **telegraph** before a root burst. **Jump** the pulse ring.
   Run `/scriptevent hollow:test boss2`: veins regrow and young Hollowed appear. Run `boss3`: the gaze sweeps, and pillars block it.
   Kill it: you get **one Stilled Heart and XP**, and the boss music stops. Using the altar again shows "The altar is cold".
8. Use `/scriptevent hollow:site cabin` and `camp`: structures place cleanly (no floating blocks, chests filled).

## Comfort and visuals (3 min)
9. Journal → Settings → My comfort settings: turn **Music** off, and the shrine music stops. Turn off **Visual effects**: no fog shift with the Watcher.
10. Video → **Vibrant Visuals** on and off, at noon, dusk and midnight in a forest, a taiga, a swamp and a cave. Check that
    nights are dark but walkable, torchlight reads warm, fog never hides the near ground, and nothing is pitch black.
11. `/scriptevent hollow:test off`.

## Realm and Xbox (after the Windows pass)
12. Upload the world to a Realm (see INSTALL.md). Join from **Xbox**: accept the pack download, get the journal on join, turn on Subtitles, and repeat steps 1 and 5.
13. Note any stutter during night encounters. That's the performance data the project doesn't have yet.

## Rare event regression checks (two players help)

- With at least five animals nearby, run `/scriptevent hollow:test eye`, then leave while they
  stare. A second player should be able to force another event immediately. Rejoining must not
  restart the old stare. Repeat by dying, entering a portal, or moving more than 32 blocks away.
- Under a shelter roof, run `/scriptevent hollow:test roof`. Walk a few blocks away: the sound
  should remain over the original shelter. Leave the world during the footsteps and check
  that the content log reports no invalid-player errors.
- In trees, run `/scriptevent hollow:test lantern`, save/restart before approaching, then find
  it. One page should drop when the lantern goes out; revisiting must not drop a second page.
  In a separate test, replace the lantern with another block before approaching: the replacement
  must stay intact and no page should appear.

## Shelter and inventory regression checks

- Place a Rowan Ward and a Heartwood Lantern near a chunk boundary. Leave/rejoin and approach
  from the other side. Both must still work when their chunks load; protection must not be
  permanently lost just because a previous query could not read the block.
- Let a ward repel a Borrowed, save/restart on the same night, then let another Borrowed enter
  its radius. It should repel again without spending an additional charge for that creature type.
- Place a Heartwood Lantern in a cave: natural Hollowed encounters stop inside its radius.
  A thrown decoy inside that radius must not draw one in. Remove the lantern and encounters resume.
- Rapidly tap the journal, open settings with chat briefly busy, and leave/rejoin with a form
  open. Expect one menu session, no stale menus on reconnect and no invalid-player errors.
- Use a Torn Page and immediately switch hotbar slots: it should cancel instead of granting a
  free lore entry. Repeated use of one page must unlock only one entry.

## Portable audio review

Run `python3 tools/sounds/audition_page.py --standalone`. Open
`build/audition/THE_HOLLOW_Sound_Booth.html` in a browser that runs local HTML. Audio is embedded as
MP3 so there are no supporting files or network requests. Mark sounds and choose **Export feedback**
to produce a JSON file you can return with the project. Browser storage may be unavailable in
some file viewers; export before closing when the page says reviews are kept on-screen only.

The browser regression script is `node tools/simtest/audition_check.mjs` (requires Playwright and
Chromium). It checks embedded audio decoding, saved reviews, filters and JSON export at a mobile
viewport. This is not a human listening approval or an iPhone Safari test.

## Reporting back
For each failed step, note **step number, what you expected, what happened**, and any red content-log line.
For sounds, use the **Hollow Sound Booth** page (link in the release notes) to mark sounds that are too loud, too quiet or wrong.
