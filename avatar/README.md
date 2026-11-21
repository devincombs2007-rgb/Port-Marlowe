# Avatar pipeline

Builds a 3D bust (GLB plus a self-contained HTML viewer) from a few selfies and a short head-turn video.
The photos, video, textures and generated models are **not** committed. Only the code is here.

## How it works

| Step | Script | What it does |
|---|---|---|
| 1 | `detect.py` | MediaPipe Face Landmarker on video frames and photos: 478 landmarks plus head pose per image |
| 2 | `solve_face.py` | Weak-perspective structure-from-motion over the head-turn frames, then mirror-symmetrised, giving the 3D face shape |
| 3 | `bake_multi.py`, `finish_face.py` | Warps a frontal photo plus side views into the face mesh's UV layout. Side views are colour-matched to the frontal and mirrored onto the unseen side. Then inpaints and fades the edges into skin tone (`bake_face.py` is the original single-photo version) |
| 4 | `build_head.py` | Lat-long head and neck grid. The front snaps to a Loop-smoothed face surface; skull and neck are fixed; the gaps are filled with a biharmonic solve. Bakes a 2048×1024 head texture |
| 5 | `build_parts.py` | Procedural ears, two-layer curly hair (tapered sides and nape, volume on top), hoodie bust with hood and drawstrings, plinth |
| 5b | `build_body.py` | Procedural full body in the same frame: tee, arms and hands, shorts, legs, socks, sneakers |
| 6 | `assemble.py` + `glb.py` | Writes the GLB (small custom writer). Nodes are tagged `shared`, `bust` or `body`. The last argument is the vertical offset in cm: 42.1 = bust on its plinth, 164 = feet on the floor, 0 = combined file for the viewer |
| 7 | `gltf-transform meshopt` / `draco` | Meshopt for the web viewer's combined file (~6 MB). Draco for the standalone bust and full-body files (~2.6 MB each) |
| 8 | `viewer_template.html` | three.js viewer with the GLB embedded as base64 (`__GLB_BASE64__` is the placeholder). Bust / full body toggle, outfit colours, lighting moods |

`shoot.js`, `test_viewer.js` and `hero.js` render headless Playwright previews for checking.

## Requirements

Python 3 with `mediapipe opencv-python-headless trimesh rtree scipy numpy`, system `libegl1 libgles2`, Node with
`three@0.170.0` and `@gltf-transform/cli`. You also need two model files in `<work>/models/`:
`face_landmarker.task` (MediaPipe) and `canonical_face_model.obj` (from the MediaPipe repo, `modules/face_geometry/data`).

Scripts take the work directory as their first argument and this folder as their second.
