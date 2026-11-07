# Build and deploy

This guide covers how to build Port Marlowe from source and what each build proves. It keeps three
things separate:

- desktop testing (gameplay evidence);
- UWP compilation (proves the target toolchain accepts the project);
- Xbox device testing (the only evidence for console behaviour, memory, performance and ray tracing).

## 1. Versions

| Item | Value | Source |
| --- | --- | --- |
| Unity editor | **6000.6.8f1** (revision `237b6593792b`), stream SUPPORTED, recommended | Unity release API, checked 2026‑11‑07 (released 2026‑11‑03) |
| Render pipeline | URP 17.6.0 (bundled with the editor) | editor `BuiltInPackages` |
| Input System | 1.20.1 (bundled) | editor package cache |
| uGUI / Test Framework | 2.6.0 / 1.8.0 (bundled) | editor `BuiltInPackages` |
| UWP toolchain (CI) | GitHub `windows-latest`: Visual Studio 2026 (18.x) with UWP/C++ workloads, Windows SDK 10.0.26100 | runner image inventory |
| Core library | .NET Standard 2.1, C# 9, no engine references | `Tools/CoreTests/Core/PortMarlowe.Core.csproj` |

`ProjectSettings/ProjectVersion.txt` pins the editor. Package versions are pinned in
`Packages/manifest.json` to the copies bundled with that editor, so the first import needs no
registry download for them.

## 2. First open (any machine with a licensed editor)

1. Open the project folder in Unity 6000.6.8f1. On first import Unity generates `ProjectSettings/*`,
   `Library/` and a `.meta` file for every asset.
2. Run **Port Marlowe ▸ Run Project Setup**. Headless equivalent:
   `Unity -batchmode -nographics -projectPath . -executeMethod PortMarlowe.EditorTools.ProjectSetup.RunFromCommandLine -logFile setup.log`
   Setup is idempotent. It does the following:
   - names layers 8–16 and applies the player settings (linear colour, frame-timing stats, Input System only);
   - applies the UWP settings (IL2CPP, x64, D3D11 then D3D12, Xbox and Desktop device families);
   - creates the material templates under `Content/Resources/PortMarlowe/Materials`;
   - creates the URP pipeline asset and its Forward+ renderer with SSAO, and assigns them;
   - writes `Scenes/Boot.unity` and makes it the only build scene.
3. Restart the editor once, so the Input System backend switch takes effect inside the editor.
4. **Commit** the generated `.meta` files, `ProjectSettings/*`, `Scenes/Boot.unity`, the materials and
   the URP assets. This keeps GUIDs stable. Never commit `Library/`, `Builds/`, `Delivery/`, licence
   files or certificates (`.gitignore` excludes them).
5. Press Play in `Boot.unity`. A controller or the keyboard drives the title menu.

## 3. Build entry points

All builds go through `PortMarlowe.EditorTools.BuildTool.BuildFromCommandLine`:

```
Unity -batchmode -nographics -quit -projectPath . -buildTarget <target> \
      -executeMethod PortMarlowe.EditorTools.BuildTool.BuildFromCommandLine \
      -pmProfile <Profile> [-pmOutput <path>] -logFile build.log
```

| Profile | `-buildTarget` | Output | Purpose | Counts as |
| --- | --- | --- | --- | --- |
| `LinuxDev` | `StandaloneLinux64` | `Builds/LinuxDev/PortMarlowe.x86_64` | CI smoke runs (Mono, development build) | desktop evidence |
| `WindowsDev` | `StandaloneWindows64` | `Builds/WindowsDev/PortMarlowe.exe` | Desktop play-testing with an Xbox controller | desktop evidence |
| `UwpDiagnostic` | `WSAPlayer` | `Builds/UWP/*.sln` | Development UWP solution (profiler connection) | UWP export, **not** a package |
| `UwpRelease` | `WSAPlayer` | `Builds/UWP/*.sln` | Non-development UWP solution | UWP export, **not** a package |
| `Web` | `WebGL` | `Builds/Web/` (`index.html`) | Browser build: gzip with decompression fallback, Forward renderer, 1K surfaces | browser evidence (not console) |

The tool always runs Project Setup first. It also writes `Builds/build-summary-<profile>.json`, which
records the result, errors, size, time and editor version.

Exit codes:

| Code | Meaning |
| --- | --- |
| 0 | Success |
| 1 | Build failed |
| 2 | Unknown profile |
| 3 | Exception |

### Automated smoke run (any player build)

```
./PortMarlowe.x86_64 -batchmode -nographics -pmAutotest autotest.json -logFile player.log
```

The run starts a new game and then exercises the milestone in order:

1. Navigation mesh and pedestrians
2. Stick-driven movement
3. Partner following
4. Character switch and switch back
5. Entering the owned car
6. Driving and stopping
7. Manual save, then load into a fresh session and compare the state
8. A reported assault, which should open a police case and spawn a unit
9. The heat display

Results go to `autotest.json`, plus a diagnostics report under `persistentDataPath/Diagnostics/`.
Exit code 0 means every step passed and 2 means a step failed.

This run checks how the systems connect. It does **not** measure graphics quality, GPU cost or ray
tracing.

Other switches:

| Switch | Effect |
| --- | --- |
| `-pmNewGame` | Skip the title screen |
| `-pmContinue` | Load the newest valid save |
| `-pmSeed <n>` | Seed the population variation |

## 4. UWP package (Windows only)

A UWP export is a Visual Studio solution. Only MSBuild packaging produces something installable.
Until that step succeeds on a real Windows toolchain, **there is no package**.

1. Run the `UwpDiagnostic` (or `UwpRelease`) profile on Windows with the Unity UWP module installed.
2. Create a **local** test certificate. Keep it out of the repository.
   ```powershell
   $cert = New-SelfSignedCertificate -Type Custom -Subject "CN=PortMarloweDev" -KeyUsage DigitalSignature `
           -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3","2.5.29.19={text}")
   Export-PfxCertificate -Cert $cert -FilePath $env:USERPROFILE\pm_dev.pfx -Password (Read-Host -AsSecureString)
   ```
   The publisher in the generated `Package.appxmanifest` must match the certificate subject
   (`CN=PortMarloweDev`). Change one or the other before building.
3. Package with MSBuild from a Developer PowerShell:
   ```powershell
   msbuild Builds\UWP\PortMarlowe.sln /m /p:Configuration=Master /p:Platform=x64 `
     /p:AppxBundle=Never /p:UapAppxPackageBuildMode=SideloadOnly /p:AppxPackageSigningEnabled=true `
     /p:PackageCertificateKeyFile=$env:USERPROFILE\pm_dev.pfx /p:PackageCertificatePassword=<password> `
     /p:AppxPackageDir=$PWD\Delivery\
   ```
4. `Delivery\` then contains the `.msix`/`.appx`, a `Dependencies\x64\` folder (VCLibs and similar)
   and the `.cer`. Those are the files the Xbox install needs.

CI runs the same sequence in the `uwp-package` job on `windows-latest`, using a throwaway
certificate. That job runs only when Unity licence secrets are configured (see §6).

## 5. Continuous integration (`.github/workflows/ci.yml`)

| Job | Needs a licence? | What it proves |
| --- | --- | --- |
| `core-tests` | no | The engine-independent core builds as .NET Standard 2.1 / C# 9 with warnings as errors, and its NUnit tests pass. |
| `unity-compile-check` | no | Project assemblies compile against the real Unity 6000.6.8f1 managed assemblies and packages, taken from the GameCI editor image. It does **not** run the editor or the import pipeline, and it does not run URP shader compilation. |
| `license-probe` | no | Reports whether licence secrets exist. Values are never printed. |
| `unity-tests` | yes | EditMode and PlayMode tests in a real editor (GameCI). |
| `linux-player` | yes | `LinuxDev` build, then a headless `-pmAutotest` run. |
| `web-build` | yes | Unity Web build (gzip + decompression fallback) published to the `gh-pages` branch for GitHub Pages. |
| `uwp-package` | yes | Silent install of the editor and UWP module, UWP export, then MSBuild Master x64 sideload package, uploaded as an artifact. |

## 6. Enabling the licensed jobs (Unity activation)

_Verified 2026‑11‑07 against GameCI's documentation (game-ci/documentation, updated 2026‑10‑24) and
its source: `unity-builder` v4.8.2, `unity-test-runner` v4.3.2, and the `game-ci/cli` it runs._

**How activation works.** For a free Personal licence, the actions do not copy your licence file onto
the build machine. They read the serial embedded in `Unity_lic.ulf` and activate the machine online
with your Unity email and password. All three secrets are therefore required. Our own Windows/UWP job
uses the same method and returns the licence seat at the end of the run.

**Which licence do you have?** Check https://id.unity.com/en/subscriptions (this works on a phone).
If it shows a Unity Plus, Pro or Enterprise subscription with a serial key, follow the second route.
Otherwise you have Personal.

### Personal (free): needs a computer once

You need a computer (Windows, macOS or Linux) to create the licence file. You only need Unity Hub;
you do not need to install a Unity editor.

1. Install Unity Hub from https://unity.com/download and sign in with your Unity account.
2. In Unity Hub, open **Preferences (Settings) ▸ Licenses**, click **Add**, and choose **Get a free
   personal license**. Do this even if a licence is already listed; otherwise the file may not be
   written.
3. Open the licence file in a text editor and copy all of it:
   - Windows: `C:\ProgramData\Unity\Unity_lic.ulf`
   - macOS: `/Library/Application Support/Unity/Unity_lic.ulf`
   - Linux: `~/.local/share/unity3d/Unity/Unity_lic.ulf`

   These folders may be hidden.
4. Open https://github.com/devincombs2007-rgb/Port-Marlowe/settings/secrets/actions and click **New
   repository secret** three times:

   | Secret name | Value |
   | --- | --- |
   | `UNITY_LICENSE` | the whole file contents |
   | `UNITY_EMAIL` | your Unity account email |
   | `UNITY_PASSWORD` | your Unity account password |

You can do step 4 from a phone browser. You can also add the email and password secrets from a phone
first, and the licence secret later.

### Personal with only a phone

The repository includes a one-time cloud desktop, `.devcontainer/unity-licence`, that runs Unity Hub
in GitHub Codespaces. You open it in a phone browser. A script then saves the three secrets without
displaying them. Step-by-step: `PlayOnXbox.md` step 1. The install and launch are checked by
`licence-helper-check.yml`; the Unity sign-in itself has not been tested.

### Plus / Pro: phone only

On https://github.com/devincombs2007-rgb/Port-Marlowe/settings/secrets/actions, add:

| Secret name | Value |
| --- | --- |
| `UNITY_SERIAL` | the serial shown on the subscriptions page |
| `UNITY_EMAIL` | your Unity account email |
| `UNITY_PASSWORD` | your Unity account password |

### Notes

- **Where to add secrets.** Use github.com in a browser. On a phone, switch to the desktop site if the
  **Settings** tab is hidden.
- **Never paste these values anywhere else** (chat, issues, commits).
  - GitHub masks secret values in logs.
  - The *Unity licence availability* job prints only `set` or `missing`, and whether `UNITY_LICENSE`
    looks like a licence file.
- **Two-step sign-in.** Activation signs in non-interactively. If the Unity account asks for a
  verification code at sign-in, activation can fail. The job log then reports "Activation failed".
- **Running the jobs.** Push any commit, or open
  https://github.com/devincombs2007-rgb/Port-Marlowe/actions/workflows/ci.yml and choose **Run
  workflow** on `claude/m1-foundation`. These jobs then run:
  - EditMode and PlayMode tests;
  - the Linux player and its headless smoke run;
  - the Web build;
  - the Windows UWP package.
- **Expired licence.** If activation later fails with a licence-expired message, repeat steps 2–4 of
  the Personal route.

### Playing in a browser (GitHub Pages)

The `web-build` job builds the same Unity project for the Web and pushes it to the `gh-pages` branch.
It is not a separate browser remake.

1. After the first successful `web-build` run, open
   https://github.com/devincombs2007-rgb/Port-Marlowe/settings/pages.
2. Set **Build and deployment ▸ Source** to **Deploy from a branch**, choose **`gh-pages` / (root)**,
   and save. This one-time step can be done on a phone.
3. Play at **https://devincombs2007-rgb.github.io/Port-Marlowe/**.

Controls:

- **Desktop browsers:** keyboard and mouse, or a controller.
- **Phones and tablets:** on-screen touch controls. Landscape works best. Menus can be tapped.

Browser builds differ from the desktop build:

- Performance quality profile;
- forward renderer with no ambient occlusion;
- 1K surface textures;
- saves kept in the browser's site storage.

Graphics in the browser are unverified until it has run on a real device.

## 7. Saves and settings on device

- Saves live in `Application.persistentDataPath/Saves`. On UWP this is the app's LocalState folder.
  Files are named `<slot>.pms`, `.pms.bak` and `.pms.tmp`.
- Each save is a header line plus a JSON payload, protected by an FNV‑1a 64‑bit checksum. Older
  schema versions are migrated on load. If the main file is damaged, loading falls back to the
  temporary and then the backup copy.
- Changing the package identity (name or publisher) gives the game a new LocalState folder.
  **Copy the saves out first.** Uninstalling the app deletes LocalState.
