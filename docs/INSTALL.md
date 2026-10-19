# Installing THE HOLLOW

**You need:** Minecraft Bedrock **26.50 or newer** on every device that will play (iPhone,
Windows and Xbox all update through their stores). An older client won't load the packs.

**What's in the download:** `THE_HOLLOW_v1.0.0.mcaddon` holds three packs.

| Pack | Required? | What it does |
|---|---|---|
| THE HOLLOW (behavior) | yes | creatures, items, blocks, structures, scripts |
| THE HOLLOW (resources) | yes | models, textures, sounds, particles, fog, UI |
| THE HOLLOW: Visuals (optional) | no | Vibrant Visuals lighting, sky, colour grading and fog for a cooler, moodier wilderness |

You do **not** need "Beta APIs" or any other experimental toggle. Leave them off.

---

## 1. Import on iPhone (or iPad)

1. Download `THE_HOLLOW_v1.0.0.mcaddon` in Safari. When Safari asks, tap **Download**. The file goes to **Files → Downloads**.
2. Open the **Files** app and go to **Downloads**.
3. Tap the `.mcaddon` file. If it opens a preview instead, tap the **Share** button and choose **Minecraft**.
4. Minecraft opens and shows **"Import started…"** and then **"Successfully imported"** once for each pack.
   - If you see "Import failed", Minecraft is probably older than 26.50. Update it in the App Store and try again.
5. Go on to **step 3: Activate in a world**.

## 2. Import on Windows

1. Install **Minecraft for Windows** (Bedrock) from the Microsoft Store or the Xbox app, and update it to 26.50 or newer.
2. Download `THE_HOLLOW_v1.0.0.mcaddon` and **double-click** it. Minecraft starts and imports all three packs.
   - If Windows asks what to open it with, choose **Minecraft**.
   - Alternatively, double-click the separate `.mcpack` files one at a time.
3. Go on to **step 3: Activate in a world**.

## 3. Activate in a world (iPhone or Windows)

**New world:** Play → **Create New** → **Create New World**.
**Existing world:** Play → pencil icon next to the world → **Edit**. Make a backup first: in Edit, choose **Copy World**.

1. Under **Add-Ons** (called *Behavior Packs* in some layouts), open **Behavior Packs** → **Available**, and
   **activate** *THE HOLLOW: Survival Horror*.
   Minecraft automatically adds the required resource pack, because the behavior pack depends on it.
2. Open **Resource Packs** → **Available** and **activate** *THE HOLLOW: Visuals (optional)* if you want it.
   - If you use another Vibrant Visuals pack, keep only one of them active. Lighting, sky and fog can't be layered.
3. Leave all **Experiments** off.
4. Create or Play the world. On first join you receive the **Field Journal**. Hold it and press **Use** to read it.

> **Existing worlds:** nothing is regenerated. Cabins and campsites appear lazily, near players
> exploring away from spawn and away from anything you've built. The shrine forms only when someone uses a
> Heartseeker. You can turn sites off in the journal's *World rules*.

## 4. Put it on a Realm

The Realm owner does this from **iPhone or Windows**, because an Xbox can't import `.mcaddon` files.
The packs then upload with the world, and every player (including on Xbox) downloads them automatically when they join.

**Option A: upload a world that already has the packs** (simplest)
1. Do step 3 on a local world and play it once.
2. Play → **Realms** → pencil icon next to your Realm → **Edit Realm** → **Replace World** → choose that world.
   *Replacing deletes the Realm's current world.* Download a backup first (Edit Realm → Download World) if you want to keep it.

**Option B: add the packs to the Realm's current world**
1. Play → Realms → pencil icon → **Edit Realm** (or *Realm Settings*).
2. Under **Behavior Packs**, activate *THE HOLLOW: Survival Horror*. The resource pack is added with it.
3. Optionally, under **Resource Packs**, activate *THE HOLLOW: Visuals (optional)*.
4. Confirm. Minecraft uploads the packs to the Realm.

**Realm notes**
- Only **operators** (the Realm owner, plus anyone promoted to Operator in Realm Settings → Members)
  can change *World rules* in the journal. Every player has their own *My comfort settings*.
- When joining, players see a prompt to download the Realm's packs. They must accept, otherwise they can't join.
- To update to a newer version later, import the new `.mcaddon` on your phone or PC and repeat Option B.
  Keep a backup. World progress (journal, sites, boss state) is stored in the world and carries over.

## 5. Play on Xbox

1. Update Minecraft on the Xbox to 26.50 or newer.
2. Play → **Realms** (or **Friends** if a friend's Realm invited you) → join the Realm.
3. Accept the **download packs** prompt. That's it: the Xbox runs the add-on from the Realm.

There is no supported way to import this `.mcaddon` directly on an Xbox. Realms, or a friend
hosting a world with the packs, is the route.

## 6. Graphics: Vibrant Visuals or standard

Minecraft controls these settings yourself, under **Settings → Video** on each device:

| Setting | Effect on THE HOLLOW |
|---|---|
| **Graphics Mode → Vibrant Visuals** | Uses the Visuals pack's lighting, sky, colour grading, volumetric mist and warm local light (torches, lanterns, campfires, Heartwood Lantern, Rowan Ward). Creatures get PBR materials, and the glowing eyes use emissive textures. Only listed on devices that support it; if it's missing, your device doesn't support it. |
| **Graphics Mode → Fancy / Simple** | Standard graphics. The add-on is fully playable. Creatures, eye glow (an unlit eye layer), particles, sounds and the add-on's encounter fog all work. |
| **Render distance** | The Visuals pack's fog starts at 70% of your render distance, so it never hides nearby terrain. |
| **Brightness / gamma** | Unchanged by the add-on. Nights are dark but not black. Raise brightness if your TV is dim. |
| **Camera shake, screen effects** | The add-on never shakes the camera and never flashes the screen. Encounter fog shifts and soft fades can be turned off per player (journal → Settings → *Visual effects*). |

The Visuals pack and the encounter fog are separate, so turning one off doesn't affect the other.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Import failed" / "unsupported version" | Update Minecraft to 26.50+ on that device. |
| Creatures appear as black-and-purple boxes, or are invisible | The resource pack isn't active. Activate it under Resource Packs (Realm: Edit Realm → Resource Packs). |
| No journal on join | Run `/scriptevent hollow:journal` (with cheats on), or craft one: Book + Charcoal. If nothing happens at all, the behavior pack isn't active. |
| Nothing ever happens | The first in-game day is quiet by design, and new players get ~10 minutes of grace. Check *World rules* in the journal: creatures may be disabled or the frequency set low. Operators can run `/scriptevent hollow:status`. |
| Vibrant Visuals option is greyed out | Only one VV-capable pack set can be active, and every active resource pack must support PBR (all three HOLLOW packs do). Another active resource pack may lack PBR support. |
| Windows: want to see errors | Settings → Creator → enable **Content Log GUI**. THE HOLLOW logs with the prefix `[hollow]`. |
