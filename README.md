# Port Marlowe

A Fabric performance mod for **Minecraft: Java Edition on iPhone and iPad** (via the
[Amethyst](https://github.com/AngelAuraMC/Amethyst-iOS) launcher, formerly PojavLauncher). It targets the
problems that are specific to phones: thermal throttling, the hard per-app memory limit, slow GL
translation layers, two performance cores, and a 120 Hz screen that drains the battery.

It works on Android launchers in the Pojav family too, and runs on a desktop (where it leaves your
settings alone).

> **Bedrock Edition** (the App Store "Minecraft") cannot load code mods. Add-ons there can only change
> content, not the engine, so this mod is for Java Edition through Amethyst.

| | |
|---|---|
| Minecraft | 1.21 / 1.21.1 |
| Loader | Fabric Loader 0.15+ |
| Dependencies | none (Fabric API **not** required) |
| Optional | Mod Menu (settings button) |

## What it does

| Optimization | Why it matters on a phone |
|---|---|
| **Mobile preset on first launch** | Fast graphics, smooth lighting off, render distance 4–8 based on how much memory Amethyst gave Java, simulation distance 5, no clouds, biome blend 0, no mipmaps, minimal particles, no entity shadows, 60 FPS cap, no menu blur, threaded chunk updates. The preset only ever *lowers* a setting, so your own choices (or Amethyst's defaults) stay put if they are already cheaper. Applied by editing `options.txt` before the game reads it, so nothing has to reload. |
| **Dynamic frame rate** | 30 FPS in menus and inventories (chat stays at full speed), 15 FPS after 3 minutes without input, 5 FPS in the background. A cooler phone throttles less, so you keep full speed for longer while you play, and the battery lasts longer. |
| **Particle limit** (1500) | Explosions, campfires and farms can spawn thousands of particles. Over the limit, new particles are dropped before they are even created. |
| **Particle frustum culling** | Vanilla builds geometry for every particle each frame, including the ones behind you. These are now skipped. |
| **Block entity draw distance** (32 blocks) | Chests, signs (and their text), banners, heads, beds and shulker boxes are drawn as models every frame. Vanilla draws them out to 64 blocks. Beacon beams are not affected. |
| **Fewer ambient block effects** (50%) | Every tick vanilla checks 1334 random blocks around you for torch smoke, drips and similar effects. This halves those block lookups. |
| **Fewer chunk meshing workers** | Vanilla starts one worker per CPU core, each with several megabytes of native buffers. iPhones report 6 cores but only 2 are performance cores, and native memory counts against iOS's memory limit. The mod uses 3 workers on phones. Sodium brings its own mesher; current versions don't allocate vanilla's buffers at all. |
| **Optional: freeze animated textures** | Every animation frame of water, lava, fire and portals is a texture upload, and GL translation layers handle those poorly. Animations stay on unless you switch them off. |
| **F3 overlay line** | Shows the detected device and renderer, the current FPS cap and why it applies, how many particles were culled, how many block entities were skipped, and the number of mesh workers. |

The mod finds out it is on iOS from what Amethyst passes to Java (`-DUIScreen.maximumFramesPerSecond`,
`AME_HOME`, `PojavClassLoader`), and reads the renderer (ANGLE/Metal, GL4ES, MobileGlues, Zink) from
`org.lwjgl.opengl.libname`.

## Install on iPhone (Amethyst)

1. Install Amethyst and enable JIT. Follow the
   [Amethyst wiki](https://wiki.angelauramc.dev/wiki/getting_started/INSTALL.html#ios); without JIT, Java
   runs far too slowly for any mod to help.
2. In Amethyst, create a **Fabric** profile for **1.21.1**.
3. Download `portmarlowe-<version>.jar` from this repository's **Actions** tab (latest green *Build* run,
   artifact `portmarlowe-mod`), unzip it, and copy the jar into that profile's `mods` folder with the Files app.
4. Launch. The preset is applied on the first start; you can change everything under
   **Options → Video Settings → iPhone Performance…** (or through Mod Menu).

> Amethyst starts every new profile at render distance **2**. The preset never raises a setting, so it
> stays at 2 until you change it. Raise it step by step and watch the FPS on the F3 screen; 4–6 is a
> reasonable place to start.

### Recommended companions

Port Marlowe only touches things the big optimization mods leave alone, and CI runs it together with
all of these:

- **Sodium**: the biggest rendering win. Use it with the *ANGLE (Metal)* or *MobileGlues* renderer, because
  GL4ES lacks the OpenGL features Sodium needs.
- **Lithium**: game logic. Singleplayer runs a full server on your phone.
- **FerriteCore**: cuts memory use by hundreds of MB, which helps avoid iOS's out-of-memory kills.
- **ModernFix**: faster startup, less memory.
- **ImmediatelyFast**, **Entity Culling**, **More Culling**.

### Amethyst settings that help

- **Renderer**: *ANGLE (Metal)* is usually the fastest and most compatible on modern iPhones.
- **Resolution scale**: rendering below native resolution is the biggest GPU win there is on a phone
  screen. Try 70–80%.
- **Memory**: install Amethyst with TrollStore or add the *increased memory limit* entitlement, then give
  Java more RAM. The preset picks a render distance from that number.

## Settings

All settings live in `config/portmarlowe.json` and on the in-game screen. A value of 0 means "vanilla
behaviour" for every limit.

| Key | Default | |
|---|---|---|
| `autoApplyPreset` | `true` | Apply `preset` the first time the game starts on a phone. |
| `preset` | `MAX_PERFORMANCE` | `MAX_PERFORMANCE` or `BALANCED`. Balanced keeps smooth lighting and a bit more view distance. |
| `presetApplied` | `false` | Set after the first-launch preset ran. Set it back to `false` to run the preset again. |
| `dynamicFps` | `true` | Master switch for the four FPS settings below. |
| `menuFps` | `30` | FPS cap while a menu or inventory is open. |
| `idleFps` / `idleTimeoutSeconds` | `15` / `180` | FPS cap after this long without input. |
| `unfocusedFps` | `5` | FPS cap while the game is in the background. |
| `particleLimit` | `1500` | Maximum number of live particles. |
| `particleCulling` | `true` | Skip particles outside the camera view. |
| `blockEntityDistance` | `32` | Draw distance for block entities, in blocks (vanilla: 64). |
| `ambientEffectsPercent` | `50` | Share of vanilla's ambient block effect checks that still run. |
| `textureAnimations` | `true` | Set to `false` to freeze animated textures. |
| `chunkBuilderThreads` | `0` | Number of chunk meshing workers. 0 = automatic. Takes effect after a restart. |
| `platformOverride` | `auto` | Force `ios`, `android` or `desktop` detection. |

## Building

```sh
./gradlew build          # mod jar in build/libs/, runs the unit tests
./gradlew runClient      # development client
./gradlew runSelftest    # boots the game as a fake iPhone, creates a world, checks every optimization
scripts/mixin-targets.sh # prints the vanilla signatures the mixins hook (useful when porting)
```

Every push runs the *Build* workflow. It builds the mod, runs the unit tests, then starts the real game
under a virtual display with a software renderer. In that run the game applies the first-launch preset,
opens the settings screens, creates a singleplayer world, spawns particles in front of and behind the
camera, places chests near and far, and checks that the limits, culling and FPS caps behave as
described. It writes `PASS` or `FAIL`. A second job runs the same test with the newest 1.21.1 releases of
Fabric API, Sodium, Lithium, FerriteCore, ModernFix, ImmediatelyFast and Entity Culling installed
alongside.

## License

MIT
