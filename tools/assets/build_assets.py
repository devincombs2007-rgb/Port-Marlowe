#!/usr/bin/env python3
"""Generate every creature's geometry, texture and animations into the resource pack, plus preview sheets."""
import json, sys
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
import lurker_model, lurker_texture, lurker_anim
import gaunt_model, gaunt_texture, gaunt_anim

RP = ROOT / "packs/DREAD_RP"
CREATURES = {
    "lurker": (lurker_model, lurker_texture, lurker_anim),
    "gaunt": (gaunt_model, gaunt_texture, gaunt_anim),
}
for sub in ("models/entity", "textures/entity", "animations"):
    (RP / sub).mkdir(parents=True, exist_ok=True)

for name, (model_mod, tex_mod, anim_mod) in CREATURES.items():
    m = model_mod.build()
    rows = m.pack()
    assert rows <= m.th, f"{name}: UV packing needs {rows}px of {m.th}"
    (RP / f"models/entity/{name}.geo.json").write_text(json.dumps(m.to_json(), indent=1) + "\n")
    tex_mod.paint(m).save(RP / f"textures/entity/{name}.png", optimize=True)
    (RP / f"animations/{name}.animation.json").write_text(json.dumps(anim_mod.build(), indent=1) + "\n")
    ymax, ymin, x0, x1, z0, z1 = m.preview(ROOT / f"assets-src/{name}_preview.png")
    print(f"{name}: {len(m.all_cubes())} cubes, {len(m.bones)} bones, {ymax/16:.2f} blocks tall, "
          f"{(z1 - z0)/16:.2f} long, UV rows {rows}/{m.th}")
