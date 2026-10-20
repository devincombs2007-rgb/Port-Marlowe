"""Shared export helpers for creatures/blocks: geometry, colour, MERS, heightmap, texture set."""
import json
import os

from . import RP, BUILD, ensure
from .paint import save_rgba, save_l
from .render import sheet


def export_entity(name, model, painter, previews=None, folder="entity", pbr=True, preview_views=None):
    color, mers, height = painter.paint()
    geo_dir = ensure(os.path.join(RP, "models", folder))
    tex_dir = ensure(os.path.join(RP, "textures", folder, "hollow"))
    model.write(os.path.join(geo_dir, f"{name}.geo.json"))
    save_rgba(color, os.path.join(tex_dir, f"{name}.png"))
    # Standard-graphics glow layer: emissive texels only, rendered with ignore_lighting.
    glow = color.copy()
    mask = mers[..., 1] > 60
    glow[..., 3] = 0
    glow[mask, 3] = 255
    if mask.any():
        save_rgba(glow, os.path.join(tex_dir, f"{name}_glow.png"))
    if pbr:
        save_rgba(mers, os.path.join(tex_dir, f"{name}_mers.png"))
        save_l(height, os.path.join(tex_dir, f"{name}_height.png"))
        with open(os.path.join(tex_dir, f"{name}.texture_set.json"), "w") as f:
            json.dump({
                "format_version": "1.21.30",
                "minecraft:texture_set": {
                    "color": name,
                    "metalness_emissive_roughness_subsurface": f"{name}_mers",
                    "heightmap": f"{name}_height",
                },
            }, f, indent=2)
    ensure(os.path.join(BUILD, "previews"))
    kw = {}
    if preview_views:
        kw["views"] = preview_views
    sheet(model, color, os.path.join(BUILD, "previews", f"{name}.png"), poses=previews, label=name, **kw)
    return color, mers, height
