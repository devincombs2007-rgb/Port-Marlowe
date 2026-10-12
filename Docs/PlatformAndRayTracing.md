# Platform feasibility and ray tracing

Evidence labels:

- **[Doc]** published platform documentation, as summarised during the 2026‑10‑12 audit;
- **[Measured]** observed in this project's builds;
- **[Inference]** reasoning, not yet tested.

## Xbox Series X through Developer Mode (UWP)

| Topic | Finding | Label |
| --- | --- | --- |
| App model | Retail-console Dev Mode runs UWP packages. Unity's target is **Universal Windows Platform** with IL2CPP and x64. | [Doc] |
| Graphics feature level | UWP titles on Xbox get a hardware **feature level 11** device on D3D11/D3D12 — not the console's native GDK feature set. | [Doc] |
| Memory | UWP *games* get a fixed title budget (about 5 GB on Series X|S). Apps get far less, so the package must be declared a game. | [Doc] |
| Unity support | Unity 6000.6 ships a UWP player module. Xbox (GDK) players need the separate, NDA-gated Xbox platform packages, which Dev Mode retail sideloading cannot use. | [Doc] |
| Input | Xbox controller through the Input System's XInput/Windows.Gaming.Input path. Keyboard and mouse bindings exist for desktop only. | [Measured: compiles] |

## Hardware ray tracing

- **URP**, the renderer this project ships, has **no ray-traced effects**. Reflections use realtime
  reflection probes plus screen-space techniques. **[Doc]**
- **HDRP** offers DXR effects, but they need **D3D12 and DXR**. DXR requires capabilities above
  feature level 11. **[Doc]**
- On Xbox in UWP Dev Mode, the device reports feature level 11, so DXR should be unavailable to this
  package. **[Inference]**
  - Status: **unverified on device**.
  - Expected result: no hardware RT.
- **How we will verify it.** The in-game diagnostics report records
  `SystemInfo.supportsRayTracingShaders` and `SystemInfo.supportsInlineRayTracing`, as the device
  reports them, on the first console run. No gameplay or content depends on RT.
- **Desktop RT prototype.** Possible later as a separate HDRP/D3D12 test on RT-capable desktop
  hardware. It cannot run in this session: the build host has no GPU. It would not count as console
  evidence.

## What this host can and cannot verify

| Area | Status here |
| --- | --- |
| C# against the real Unity 6000.6.5f1 APIs | **Verified** for the player pass of Core, Runtime and the packages it uses (CI compile check) |
| Core simulation rules | **Verified** (79 NUnit tests, CI) |
| Editor import, scenes, PlayMode behaviour | Not run: needs a Unity licence secret on CI |
| Graphics quality, GPU frame time, shader compilation | **Unverified.** The sandbox and the Linux CI runners have no GPU. |
| UWP export and MSBuild package | Not run: the Windows job needs a Unity licence |
| Xbox device behaviour | Not run (deferred by request) |
