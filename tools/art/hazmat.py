"""Hazmat suit armour textures (64 x 32, the standard armour layouts) and attachables.

Rubberised civil-defence yellow with taped seams, a gas-mask hood with a pale visor and a black
canister, black rubber gloves and boots. Uses the game's own humanoid armour geometry.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import RP, ensure  # noqa: E402

RNG = np.random.default_rng(31)
YEL = np.array([201, 162, 39])
DARK = np.array([38, 40, 42])
TAPE = np.array([150, 120, 30])
GLASS = np.array([150, 190, 200])


def fill(img, x0, y0, x1, y1, col, noise=10):
    h, w = y1 - y0, x1 - x0
    n = RNG.integers(-noise, noise + 1, (h, w, 1))
    img[y0:y1, x0:x1, :3] = np.clip(col + n, 0, 255)
    img[y0:y1, x0:x1, 3] = 255


def layer1():
    img = np.zeros((32, 64, 4), np.uint8)
    fill(img, 0, 0, 32, 16, YEL)                     # hood
    fill(img, 9, 9, 15, 12, GLASS, 6)                # visor
    img[9, 9:15, :3] = [220, 235, 240]
    fill(img, 10, 12, 14, 16, DARK, 4)               # respirator
    fill(img, 11, 13, 13, 16, np.array([70, 74, 78]), 4)
    fill(img, 16, 16, 40, 32, YEL)                   # body
    img[20:32, 24, :3] = DARK                        # zipper
    fill(img, 16, 26, 40, 27, TAPE, 4)               # taped seam
    fill(img, 40, 16, 56, 32, YEL)                   # arms
    fill(img, 40, 28, 56, 32, DARK, 4)               # gloves
    fill(img, 0, 16, 16, 32, YEL)                    # legs region (boots use the lower part)
    fill(img, 0, 26, 16, 32, DARK, 4)                # boots
    return img


def layer2():
    img = np.zeros((32, 64, 4), np.uint8)
    fill(img, 0, 16, 16, 32, YEL)                    # trouser legs
    fill(img, 0, 22, 16, 23, TAPE, 4)
    fill(img, 16, 16, 40, 32, YEL)                   # waist
    fill(img, 16, 27, 40, 29, DARK, 4)               # belt
    return img


PIECES = {
    # item, geometry, texture layer, hidden vanilla layer variable
    "hazmat_hood": ("geometry.humanoid.armor.helmet", 1, "variable.helmet_layer_visible = 0.0;"),
    "hazmat_suit": ("geometry.humanoid.armor.chestplate", 1, "variable.chest_layer_visible = 0.0;"),
    "hazmat_trousers": ("geometry.humanoid.armor.leggings", 2, "variable.leg_layer_visible = 0.0;"),
    "hazmat_boots": ("geometry.humanoid.armor.boots", 1, "variable.boot_layer_visible = 0.0;"),
}


def main():
    out = ensure(os.path.join(RP, "textures", "models", "armor"))
    Image.fromarray(layer1(), "RGBA").save(os.path.join(out, "hazmat_1.png"))
    Image.fromarray(layer2(), "RGBA").save(os.path.join(out, "hazmat_2.png"))
    adir = ensure(os.path.join(RP, "attachables"))
    for item, (geo, layer, script) in PIECES.items():
        doc = {
            "format_version": "1.10.0",
            "minecraft:attachable": {
                "description": {
                    "identifier": f"hollow:{item}",
                    "materials": {"default": "armor", "enchanted": "armor_enchanted"},
                    "textures": {"default": f"textures/models/armor/hazmat_{layer}",
                                 "enchanted": "textures/misc/enchanted_item_glint"},
                    "geometry": {"default": geo},
                    "scripts": {"parent_setup": script},
                    "render_controllers": ["controller.render.armor"],
                },
            },
        }
        with open(os.path.join(adir, f"{item}.json"), "w") as f:
            json.dump(doc, f, indent=2)
    print("hazmat: 2 textures, 4 attachables")


if __name__ == "__main__":
    main()
