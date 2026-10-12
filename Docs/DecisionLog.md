# Decision log

Each entry gives the choice, why it was made, and what would reverse it.

| # | Date | Decision | Why | Revisit if |
| --- | --- | --- | --- | --- |
| D1 | 2026‑10‑12 | Unity **6000.6.5f1**, the newest release marked SUPPORTED/recommended. LTS 6000.3.x and beta 6000.7 were not chosen. | The brief asks for the newest stable *supported* release. The Unity release API marks 6000.6.5f1 recommended. | A UWP regression appears that the LTS line does not have. |
| D2 | 2026‑10‑12 | **URP**, not HDRP. | UWP on Xbox exposes feature level 11. HDRP's ray tracing needs D3D12+DXR, and HDRP's baseline cost is high for a 5 GB UWP title budget. URP keeps one renderer for desktop and console. | Device diagnostics show DXR support **and** headroom. An RT path would then be a separate optional renderer. |
| D3 | 2026‑10‑12 | Simulation rules live in an engine‑independent `PortMarlowe.Core` assembly (`noEngineReferences`). | Rules can be unit‑tested on any .NET host (79 tests on CI) without a Unity licence. Determinism is also easier to reason about. | — |
| D4 | 2026‑10‑12 | Project code never references URP types outside `PortMarlowe.Rendering.Urp`. The rest goes through `IRenderBackend`. | Gameplay compiles and runs even if the pipeline asset is missing. Swapping pipelines does not touch gameplay. | — |
| D5 | 2026‑10‑12 | Procedural placeholder content (meshes, textures, characters, audio) built by code. | No licensed asset host is reachable from the development sandbox, and purchases need approval. Procedural content keeps the milestone playable. | Licensed or CC0 sets are imported (see D8). |
| D6 | 2026‑10‑12 | A custom character motor (CharacterController plus intent), not a third‑party controller. | One authoritative motor shared by player and partner AI, with no package lock‑in. Unity's free third‑person controller is only a reference to evaluate. | Evaluation shows a package meets the shared contracts better. |
| D7 | 2026‑10‑12 | Build verification on GitHub Actions: Linux for compile and tests, `windows-latest` for UWP. Windows containers are not run on the Ubuntu host. | Per the user's instruction. GitHub's Windows image has VS 2026 with UWP workloads and SDK 10.0.26100. | — |
| D8 | 2026‑10‑12 | CC0 PBR surfaces (Poly Haven, ambientCG) are **fetched by a pinned, hash‑checked script** rather than committed. Procedural fallback is kept. | Avoids large binaries in git, keeps provenance explicit, and still builds without network. CC0 removes licence risk. | Git LFS is adopted for content. |
| D9 | 2026‑10‑12 | Renamed `EntityId` to `StableId`. | Unity 6.6 introduces `UnityEngine.EntityId`, which made the name ambiguous. | — |
| D10 | 2026‑10‑12 | UWP graphics APIs: D3D11 first, then D3D12. | UWP on Xbox runs at FL11. D3D11 is the most conservative path; D3D12 stays available for comparison on device. | Device tests show D3D12 is better. |
| D11 | 2026‑10‑12 | Police only know what witnesses or officers reported or saw (evidence pipeline). There is no omniscient wanted level. | A design pillar of the brief. It also makes heat explainable in the HUD. | — |
