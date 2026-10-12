# Build and deploy

This guide covers how to build Port Marlowe from source and what each build proves. It keeps three
things separate:

- desktop testing (gameplay evidence);
- UWP compilation (proves the target toolchain accepts the project);
- Xbox device testing (the only evidence for console behaviour, memory, performance and ray tracing).

## 1. Versions

| Item | Value | Source |
| --- | --- | --- |
| Unity editor | **6000.6.5f1** (revision `3ff58d469c8a`), stream SUPPORTED, recommended | Unity release API, checked 2026‑10‑12 |
| Render pipeline | URP 17.6.0 (bundled with the editor) | editor `BuiltInPackages` |
| Input System | 1.20.0 (bundled) | editor package cache |
| uGUI / Test Framework | 2.6.0 / 1.8.0 (bundled) | editor `BuiltInPackages` |
| UWP toolchain (CI) | GitHub `windows-latest`: Visual Studio 2026 (18.x) with UWP/C++ workloads, Windows SDK 10.0.26100 | runner image inventory |
| Core library | .NET Standard 2.1, C# 9, no engine references | `Tools/CoreTests/Core/PortMarlowe.Core.csproj` |

`ProjectSettings/ProjectVersion.txt` pins the editor. Package versions are pinned in
`Packages/manifest.json` to the copies bundled with that editor, so the first import needs no
registry download for them.

## 2. First open (any machine with a licensed editor)

1. Open the project folder in Unity 6000.6.5f1. On first import Unity generates `ProjectSettings/*`,
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
| `unity-compile-check` | no | Project assemblies compile against the real Unity 6000.6.5f1 managed assemblies and packages, taken from the GameCI editor image. It does **not** run the editor or the import pipeline, and it does not run URP shader compilation. |
| `license-probe` | no | Reports whether licence secrets exist. Values are never printed. |
| `unity-tests` | yes | EditMode and PlayMode tests in a real editor (GameCI). |
| `linux-player` | yes | `LinuxDev` build, then a headless `-pmAutotest` run. |
| `uwp-package` | yes | Silent install of the editor and UWP module, UWP export, then MSBuild Master x64 sideload package, uploaded as an artifact. |

## 6. Enabling the licensed jobs

Add repository secrets. Use either:

- `UNITY_LICENSE` (the contents of a `.ulf` file) together with `UNITY_EMAIL` and `UNITY_PASSWORD`; or
- `UNITY_SERIAL`, `UNITY_EMAIL` and `UNITY_PASSWORD` for a Pro/Plus seat.

The licence must be one you are entitled to use on CI machines. Nothing in the repository contains
licence data.

## 7. Saves and settings on device

- Saves live in `Application.persistentDataPath/Saves`. On UWP this is the app's LocalState folder.
  Files are named `<slot>.pms`, `.pms.bak` and `.pms.tmp`.
- Each save is a header line plus a JSON payload, protected by an FNV‑1a 64‑bit checksum. Older
  schema versions are migrated on load. If the main file is damaged, loading falls back to the
  temporary and then the backup copy.
- Changing the package identity (name or publisher) gives the game a new LocalState folder.
  **Copy the saves out first.** Uninstalling the app deletes LocalState.
