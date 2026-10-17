#!/usr/bin/env python3
"""Generate the Lurker's geometry, texture and animations into the resource pack, plus a preview sheet."""
import json, sys
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
import lurker_model, lurker_texture, lurker_anim

RP = ROOT / "packs/DREAD_RP"
(RP / "models/entity").mkdir(parents=True, exist_ok=True)
(RP / "textures/entity").mkdir(parents=True, exist_ok=True)
(RP / "animations").mkdir(parents=True, exist_ok=True)

m = lurker_model.build()
rows = m.pack()
assert rows <= m.th, f"UV packing needs {rows}px of {m.th}"
(RP / "models/entity/lurker.geo.json").write_text(json.dumps(m.to_json(), indent=1) + "\n")
lurker_texture.paint(m).save(RP / "textures/entity/lurker.png", optimize=True)
(RP / "animations/lurker.animation.json").write_text(json.dumps(lurker_anim.build(), indent=1) + "\n")
ymax, ymin, *_ = m.preview(ROOT / "assets-src/lurker_preview.png")
print(f"lurker: {len(m.all_cubes())} cubes, {len(m.bones)} bones, height {ymax/16:.2f} blocks, UV rows {rows}/{m.th}")
