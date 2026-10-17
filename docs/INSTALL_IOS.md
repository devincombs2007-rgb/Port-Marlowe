# Installing the test build on iPhone

1. On the iPhone open this repository on GitHub in Safari and download `releases/DREAD-0.2.0-test.mcaddon`
   (tap the file → "Download raw file"). Safari saves it to Files → Downloads.
2. In **Files**, tap the `.mcaddon`. If Minecraft is not offered, long-press → **Share** → **Minecraft**
   (or "Open in…"). Minecraft launches and shows "Import started / succeeded".
3. Create a new world → **Behavior Packs** → activate *DREAD Behavior Pack*; **Resource Packs** → activate *DREAD Resource Pack*.
   Turn **Activate Cheats** ON (needed for `/scriptevent`). No Experiments are needed.
4. Enter the world. Follow `docs/TESTING.md`.

If import fails, import the two `.mcpack` files from `dist/` separately (CI artifact) and report the exact message.
Apple's Files app may rename downloads; the extension must stay `.mcaddon`.

## Xbox (plan, unverified)
Xbox cannot side-load packs. The supported route is a **Realm**: build/test the world on iPhone with the add-on applied,
upload it to a Realm you own, and join from Xbox. Whether script-driven add-ons are fully supported on Realms must be
confirmed by testing; until then Xbox support is **unproven**.
