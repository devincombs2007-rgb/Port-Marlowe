"""Quick isometric render of a block box, for checking builds without the game.

python3 -m tools.island.voxview X Z RADIUS [YAW_DEG] [OUT.png]   (reads build/island/quick_*.npy/json)
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
MIN_Y = -64

COL = {
    "grass_block": (96, 140, 62), "dirt": (122, 88, 60), "coarse_dirt": (110, 80, 56), "podzol": (92, 66, 34),
    "stone": (120, 120, 120), "sand": (214, 200, 150), "sandstone": (205, 190, 140), "gravel": (128, 122, 118),
    "water": (40, 90, 160), "mud": (60, 56, 58), "moss_block": (80, 110, 50), "clay": (150, 155, 170),
    "tuff": (100, 104, 96), "blackstone": (40, 36, 42), "smooth_basalt": (62, 62, 68), "calcite": (220, 220, 214),
    "green_stained_glass": (90, 200, 90), "oak_log": (100, 78, 48), "birch_log": (210, 206, 196),
    "dark_oak_log": (60, 44, 28), "jungle_log": (88, 70, 30), "spruce_log": (70, 52, 32), "mangrove_log": (100, 50, 40),
    "stripped_oak_log": (170, 136, 86), "oak_leaves": (60, 110, 40), "birch_leaves": (100, 140, 70),
    "dark_oak_leaves": (40, 80, 28), "jungle_leaves": (50, 130, 40), "spruce_leaves": (50, 80, 50),
    "mangrove_leaves": (70, 120, 40), "mangrove_roots": (80, 60, 40), "muddy_mangrove_roots": (70, 58, 46),
    "green_terracotta": (76, 83, 42), "white_concrete": (220, 224, 226), "red_concrete": (150, 32, 30), "light_gray_concrete": (130, 130, 124), "gray_stained_glass": (70, 80, 90), "gray_concrete": (54, 57, 61),
    "polished_blackstone": (50, 46, 54), "iron_block": (210, 210, 210), "black_wool": (20, 20, 24),
    "polished_deepslate": (70, 70, 74), "black_concrete": (12, 14, 18), "netherrack": (110, 50, 50),
    "fire": (255, 150, 30), "campfire": (230, 120, 40), "hay_block": (190, 160, 40), "soul_soil": (76, 58, 46),
    "barrel": (130, 96, 56), "short_grass": (100, 150, 60), "tall_grass": (100, 150, 60), "fern": (70, 120, 50),
    "seagrass": (40, 120, 60), "kelp": (50, 110, 40), "deadbush": (140, 100, 50), "short_dry_grass": (170, 150, 90),
    "tall_dry_grass": (170, 150, 90), "leaf_litter": (150, 100, 50), "vine": (50, 100, 30), "deepslate": (70, 70, 76),
    "bedrock": (40, 40, 40), "firefly_bush": (90, 120, 50), "bush": (70, 120, 50), "waterlily": (40, 120, 40),
}


def render(blocks, names, x0, z0, cx, cz, rad, yaw=35, scale=6, ymin=None):
    i0, k0 = cx - rad - x0, cz - rad - z0
    sub = blocks[max(0, i0):i0 + 2 * rad + 1, :, max(0, k0):k0 + 2 * rad + 1]
    name_arr = np.array([n.replace("minecraft:", "") for n in names])
    solid = name_arr[sub] != "air"
    js = np.nonzero(solid.any(axis=(0, 2)))[0]
    # visible voxels: any face to air
    pad = np.pad(solid, 1, constant_values=False)
    exposed = solid & ~(pad[2:, 1:-1, 1:-1] & pad[:-2, 1:-1, 1:-1] & pad[1:-1, 2:, 1:-1] & pad[1:-1, :-2, 1:-1]
                        & pad[1:-1, 1:-1, 2:] & pad[1:-1, 1:-1, :-2])
    I, J, K = np.nonzero(exposed)
    lo = (ymin - MIN_Y) if ymin is not None else max(0, np.percentile(J, 2) - 6)
    keep = J >= lo
    I, J, K = I[keep], J[keep], K[keep]
    a = math.radians(yaw)
    ca, sa = math.cos(a), math.sin(a)
    # isometric: screen x from rotated (i,k), screen y from depth and height
    u = (I - rad) * ca - (K - rad) * sa
    v = (I - rad) * sa + (K - rad) * ca
    sx = u * scale
    sy = v * scale * 0.5 - (J - lo) * scale * 0.82
    order = np.lexsort((J, v))                   # far to near, low to high
    W = int(2 * rad * scale * 1.5) + 40
    Hh = int((J.max() - lo) * scale * 0.82 + rad * scale * 1.5) + 40
    img = Image.new("RGB", (W, Hh), (18, 20, 26))
    d = ImageDraw.Draw(img)
    ox, oy = W / 2, Hh - rad * scale * 0.75 - 20
    for n in order:
        nm = name_arr[sub[I[n], J[n], K[n]]]
        c = np.array(COL.get(nm, (200, 0, 200)), float)
        x, y = ox + sx[n], oy + sy[n]
        s = scale
        top = [(x - s * 0.7, y), (x, y - s * 0.4), (x + s * 0.7, y), (x, y + s * 0.4)]
        d.polygon(top, fill=tuple(int(t) for t in c))
        d.polygon([(x - s * 0.7, y), (x, y + s * 0.4), (x, y + s * 1.2), (x - s * 0.7, y + s * 0.8)], fill=tuple(int(t * 0.72) for t in c))
        d.polygon([(x + s * 0.7, y), (x, y + s * 0.4), (x, y + s * 1.2), (x + s * 0.7, y + s * 0.8)], fill=tuple(int(t * 0.55) for t in c))
    return img


def main(argv):
    cx, cz, rad = int(argv[0]), int(argv[1]), int(argv[2])
    yaw = float(argv[3]) if len(argv) > 3 else 35
    ymin = int(argv[5]) if len(argv) > 5 else None
    out = argv[4] if len(argv) > 4 and argv[4] != '-' else os.path.join(ROOT, "build", "island", "voxview.png")
    b = np.load(os.path.join(ROOT, "build", "island", "quick_blocks.npy"))
    meta = json.load(open(os.path.join(ROOT, "build", "island", "quick_palette.json")))
    render(b, meta["names"], meta["x0"], meta["z0"], cx, cz, rad, yaw, scale=max(4, 300 // rad), ymin=ymin).save(out)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1:])
