# Xbox install checklist (for later — not needed now)

> **Status: no installable package exists yet.** Use this list only after the UWP packaging
> pipeline has produced a `Delivery\` folder (see `BuildAndDeploy.md` §4). Nothing here has been
> tested on a console.

## Short sequence

1. Put the Xbox in **Developer Mode** and open **Dev Home**. Note the Device Portal address it shows.
2. In a browser on the same network, open the Device Portal and go to **Home ▸ My games & apps ▸ Add**.
3. Select the `.msix`/`.appx` from `Delivery\`. When the portal asks for dependencies, add every
   file in `Delivery\Dependencies\x64\`. Install.
4. Launch **Port Marlowe** from Dev Home. Then check these four things:
   - The title menu responds to the controller.
   - **New game** starts on Tern Street.
   - Pause, then **Save game** and **Load last save** work.
   - Press the Home button and return; the game should come back paused.
5. Only if something fails: open **Pause ▸ Write diagnostics report**. The report lands in the app's
   LocalState `Diagnostics\` folder, which you can download through the Device Portal file explorer.

## What the first device run will tell us (currently unverified)

These are unknown until the game runs on the console:

- frame time per quality profile, memory against the title budget, and load times;
- whether the device reports ray-tracing support (expected: no, under UWP/D3D11);
- suspend/resume, controller disconnect, and save location behaviour.

The game starts in the **Performance** profile on console. Switch to **Fidelity** only after
measuring.

## Before uninstalling or changing the package identity

Saves live in LocalState and are deleted on uninstall. Copy `LocalState\Saves\` through the
Device Portal first.
