# Avatar pipeline

Builds a 3D bust (GLB plus a self-contained HTML viewer) from a few selfies and a short head-turn video.
The photos, video, textures and generated models are **not** committed. Only the code is here.

## How it works

| Step | Script | What it does |
|---|---|---|
| 1 | `detect.py` | MediaPipe Face Landmarker on video frames and photos: 478 landmarks plus head pose per image |
| 2 | `solve_face.py` | Weak-perspective structure-from-motion over the head-turn frames, then mirror-symmetrised, giving the 3D face shape |
| 3 | `bake_face.py`, `finish_face.py` | Warps the sharpest frontal photo into the face mesh's UV layout, inpaints the nostrils, fades the edges into skin tone |
| 4 | `build_head.py` | Lat-long head and neck grid. The front snaps to a Loop-smoothed face surface; skull and neck are fixed; the gaps are filled with a biharmonic solve. Bakes a 2048×1024 head texture |
| 5 | `build_parts.py` | Procedural ears, two-layer curly hair (scalp curls plus surface curls over a hair mass), hoodie bust with hood and drawstrings, plinth |
| 6 | `assemble.py` + `glb.py` | Writes the GLB (small custom writer) |
| 7 | `gltf-transform meshopt` | Compresses about 22 MB down to about 6 MB for the web viewer |
| 8 | `viewer_template.html` | three.js viewer with the GLB embedded as base64. `__GLB_BASE64__` is the placeholder |

`shoot.js`, `test_viewer.js` and `hero.js` render headless Playwright previews for checking.

## Requirements

Python 3 with `mediapipe opencv-python-headless trimesh rtree scipy numpy`, system `libegl1 libgles2`, Node with
`three@0.170.0` and `@gltf-transform/cli`. You also need two model files in `<work>/models/`:
`face_landmarker.task` (MediaPipe) and `canonical_face_model.obj` (from the MediaPipe repo, `modules/face_geometry/data`).

Scripts take the work directory as their first argument and this folder as their second.
