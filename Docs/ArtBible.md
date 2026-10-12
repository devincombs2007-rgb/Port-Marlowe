# Art bible (concise, v0.1)

All values here are **starting hypotheses**. Change them only after GPU captures, and record each
change in `DecisionLog.md`. Nothing here has been checked on a display yet, because the build hosts
have no GPU.

## Identity

Port Marlowe is an original, sun‑bleached coastal port city.

- **Saltmarket**, the first district, is an old harbour quarter. It has stucco walk‑ups, brick
  warehouses, a fish market square, a precinct house and a working quay.
- Wealth shows as cleaner render, intact trims and planted verges.
- Industry shows as painted metal cladding, oil‑stained asphalt and chain‑link.
- Marsh exposure (later districts) shows as salt bloom, algae lines and warped timber.
- Material **scale never changes** between those looks: the same 2 m paving module is reused in
  every neighbourhood, only weathered differently.

Never reproduce real brands, logos, or characters or locations from the reference frames. Signage
uses invented names only, for example Gannet Yards, Lantern Corner and Hollis Terrace.

## Palette and grading

| Element | Value |
| --- | --- |
| Stucco | warm off‑whites, sand, faded teal and coral (see `WorldMaterials.FacadeTints`) |
| Saturation | restrained; grading +6 saturation by day, −6 by night |
| Tonemapping | ACES |
| Contrast | +10 |
| Vignette | 0.17 |
| Bloom | threshold 1.05; intensity 0.35 by day, 0.85 by night |
| Exposure | no eye adaptation in URP, so night gets a +0.85 EV post‑exposure lift to stay readable on a TV |

Do not use heavy film grain, crushed blacks or blur to hide missing detail (§18.6).

## Lighting

| Element | Value |
| --- | --- |
| Sun path | rises 06:00, sets 19:30, peak elevation 62° |
| Sun colour | warm white at noon to orange at a low sun; intensity 0.25–1.35 |
| Moon | cool light (0.62, 0.72, 1.0), intensity 0.16 |
| Ambient | trilight (sky, equator, ground), driven by time of day |
| Fog | exponential squared, density 0.0019 by day to 0.0032 by night |
| Streetlights | only the 20 nearest are real lights (Forward+); the rest show emissive heads only |
| Night emissives | windows, storefronts, lamp heads and the precinct sign scale with the night factor |
| Reflections | one realtime city probe (128 px, refreshed every 20 s, time‑sliced), then sky, then material response. No ray tracing anywhere. |
| Shadows | soft sun shadows. Performance: 70 m, 2 cascades. Fidelity: 110 m, 4 cascades. |

## Materials

| Rule | Value |
| --- | --- |
| Shader | URP Lit, metallic workflow |
| Packed mask | R = metallic, G = occlusion, A = smoothness (1 − roughness) |
| Normals | OpenGL convention |
| Import | sRGB for albedo only; masks are linear |
| Surface sources | CC0 sets from Poly Haven and ambientCG (`AssetManifest.md`), hash‑pinned |
| Fallback | procedural textures when the sets are not fetched |

Tile sizes (metres per texture repeat):

| Surface | Tile size |
| --- | --- |
| Asphalt | 4 |
| Sidewalk concrete | 2 |
| Plaza paving | 2.5 |
| Quay | 3 |
| Roof | 3 |
| Grass | 3 |
| Curb | 1.5 |

Texture budget hypotheses:

| Asset class | Budget |
| --- | --- |
| Ground and street sets | 2K, streamed mips |
| Facades | 1K plus detail maps |
| Props | 512–1K |
| Hero characters | 2K body, 2K head |
| Crowd | 1K atlas |

## Proportions

| Subject | Values |
| --- | --- |
| Rhys | 1.85 m |
| Lena | 1.68 m |
| Civilians | 1.55–1.95 m, bulk 0.9–1.15 |
| Sedan ("Aldine Courier") | 4.60 × 1.82 m, wheelbase about 2.7 m |
| Roads | 10 m wide (2 lanes), sidewalks 3 m, block pitch 76 m |

## Asset tier budgets (hypotheses)

| Tier | Triangles (LOD0) | Materials | Bones |
| --- | --- | --- | --- |
| Hero character | 40–60k | ≤ 4 | ≤ 120 |
| Crowd character | 8–15k | 1–2 | ≤ 60 |
| Primary vehicle | 60–90k | ≤ 6 | — |
| Traffic vehicle | 15–30k | ≤ 3 | — |
| Building shell | 2–10k | ≤ 3 + trims | — |
| Interactive prop | 0.5–5k | 1 | — |

## Acceptance views (for when a GPU capture is available)

Each view needs stills and motion clips with build and settings metadata:

- daytime street;
- sunset over the quay;
- night street with lamps;
- the safehouse interior;
- a car chase at dusk;
- characters at close and at gameplay distance.

Rain and wet roads, beach, industrial interior and marsh fog come later.
