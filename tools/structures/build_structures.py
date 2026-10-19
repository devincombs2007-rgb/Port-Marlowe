"""THE HOLLOW site structures -> packs/behavior/structures/hollow/*.mcstructure

  cabin     11 x 9 x 11   abandoned ranger cabin (sink 1: y=0 is the ground layer)
  campsite  13 x 6 x 13   ruined campsite with tracks leading away (sink 1)
  shrine    25 x 13 x 25  underground root shrine + boss arena (placed whole underground)

Unset positions are structure voids, so terrain outside the footprint is never touched.
Preview renders go to build/previews/structure_*.png for layout review.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import BP, BUILD, ensure  # noqa: E402
from hollowkit.structure import Builder  # noqa: E402

S = "minecraft:"


def fence(b, x, y, z, kind="spruce_fence", n=False, s=False, e=False, w=False):
    b.set(x, y, z, S + kind, **{"minecraft:connection_north": n, "minecraft:connection_south": s,
                                 "minecraft:connection_east": e, "minecraft:connection_west": w})


def pane(b, x, y, z, ns=False, ew=False):
    b.set(x, y, z, S + "glass_pane", **{"minecraft:connection_north": ns, "minecraft:connection_south": ns,
                                         "minecraft:connection_east": ew, "minecraft:connection_west": ew})


def door(b, x, y, z, facing, hinge=False, open_=False, kind="spruce_door"):
    b.set(x, y, z, S + kind, **{"minecraft:cardinal_direction": facing, "door_hinge_bit": hinge, "open_bit": open_, "upper_block_bit": False})
    b.set(x, y + 1, z, S + kind, **{"minecraft:cardinal_direction": facing, "door_hinge_bit": hinge, "open_bit": open_, "upper_block_bit": True})


def cabin():
    b = Builder(11, 9, 11)
    # y=0 ground layer: stone foundation under the cabin + porch footing
    b.fill(2, 0, 2, 8, 0, 8, S + "cobblestone")
    for (x, z) in ((2, 2), (8, 2), (2, 8), (8, 8), (5, 2), (2, 5)):
        b.set(x, 0, z, S + "mossy_cobblestone")
    # y=1 floor
    b.fill(3, 1, 3, 7, 1, 7, S + "spruce_planks")
    # log corners, plank walls y=1..4
    for (x, z) in ((2, 2), (8, 2), (2, 8), (8, 8)):
        b.fill(x, 1, z, x, 4, z, S + "spruce_log", pillar_axis="y")
    for y in range(1, 5):
        for i in range(3, 8):
            b.set(i, y, 2, S + "spruce_planks")
            b.set(i, y, 8, S + "spruce_planks")
            b.set(2, y, i, S + "spruce_planks")
            b.set(8, y, i, S + "spruce_planks")
    # top beams
    b.fill(2, 4, 2, 8, 4, 2, S + "stripped_spruce_log", pillar_axis="x")
    b.fill(2, 4, 8, 8, 4, 8, S + "stripped_spruce_log", pillar_axis="x")
    b.fill(2, 4, 3, 2, 4, 7, S + "stripped_spruce_log", pillar_axis="z")
    b.fill(8, 4, 3, 8, 4, 7, S + "stripped_spruce_log", pillar_axis="z")
    # interior air
    b.clear(3, 2, 3, 7, 4, 7)
    b.clear(3, 5, 3, 7, 6, 7)
    # front door (north wall, z=2) and windows; one window broken (left open)
    door(b, 5, 2, 2, "north", hinge=False, open_=False)
    b.set(5, 1, 2, S + "spruce_planks")
    pane(b, 3, 3, 2, ew=True)
    pane(b, 7, 3, 2, ew=False)  # cracked: a lone unconnected pane
    pane(b, 2, 3, 5, ns=True)
    b.set(8, 3, 5, S + "air")  # the broken window, glass gone
    pane(b, 5, 3, 8, ew=True)
    # gable roof along x: stairs ascend toward the ridge at z=5
    for i, (z, y) in enumerate(((1, 4), (2, 5), (3, 6), (4, 7))):
        for x in range(1, 10):
            b.set(x, y, z, S + "spruce_stairs", weirdo_direction=2, upside_down_bit=False)
            b.set(x, y, 10 - z, S + "spruce_stairs", weirdo_direction=3, upside_down_bit=False)
    for x in range(1, 10):
        b.set(x, 7, 5, S + "spruce_slab", **{"minecraft:vertical_half": "bottom"})
    # gable ends (planks) under the roof
    for (z, y) in ((3, 5), (4, 5), (5, 5), (6, 5), (7, 5), (4, 6), (5, 6), (6, 6)):
        b.set(2, y, z, S + "spruce_planks")
        b.set(8, y, z, S + "spruce_planks")
    b.clear(3, 5, 4, 7, 6, 6)
    # chimney at the back-right corner
    b.fill(7, 1, 7, 7, 8, 7, S + "cobblestone")
    b.set(7, 8, 7, S + "cobblestone_wall", wall_post_bit=True)
    b.set(7, 2, 6, S + "furnace", **{"minecraft:cardinal_direction": "north"})  # cold stove
    # interior: bed, table, chest, sign, cobwebs, carpet
    b.set(3, 2, 6, S + "bed", direction=2, head_piece_bit=False)
    b.set(3, 2, 7, S + "bed", direction=2, head_piece_bit=True)
    b.set(4, 2, 7, S + "chest", **{"minecraft:cardinal_direction": "north"})
    b.set(6, 2, 3, S + "crafting_table")
    b.set(7, 2, 3, S + "barrel", facing_direction=1, open_bit=False)
    b.set(5, 3, 7, S + "spruce_wall_sign", facing_direction=2)  # notice board on the back wall
    b.set(3, 4, 3, S + "web")
    b.set(7, 4, 7, S + "web")
    b.fill(4, 2, 4, 6, 2, 5, S + "brown_carpet")
    b.set(6, 2, 7, S + "candle", candles=1, lit=False)
    # porch: plank deck, posts, a single warm lantern (the only light - visible from the trees)
    b.fill(3, 1, 0, 7, 1, 1, S + "spruce_planks")
    for x in (3, 7):
        fence(b, x, 2, 0)
        fence(b, x, 3, 0)
    b.set(3, 4, 1, S + "spruce_slab", **{"minecraft:vertical_half": "top"})
    b.set(7, 4, 1, S + "spruce_slab", **{"minecraft:vertical_half": "top"})
    b.set(7, 3, 1, S + "lantern", hanging=True)
    b.set(5, 1, 0, S + "spruce_stairs", weirdo_direction=2)
    # air clearance around porch head height and steps
    b.clear(4, 2, 0, 6, 3, 1)
    b.clear(3, 2, 1, 3, 3, 1)
    b.clear(7, 2, 1, 7, 2, 1)
    # a woodpile and a stump outside
    b.fill(9, 1, 6, 9, 2, 7, S + "spruce_log", pillar_axis="z")
    b.set(1, 1, 7, S + "stripped_spruce_log", pillar_axis="y")
    return b


def campsite():
    b = Builder(13, 6, 13)
    # y=0 ground layer: fire pit, a beaten path, a few coarse patches
    for (x, z) in ((5, 5), (6, 5), (7, 5), (5, 6), (7, 6), (5, 7), (6, 7), (7, 7)):
        b.set(x, 0, z, S + "coarse_dirt")
    b.set(6, 0, 6, S + "cobblestone")
    b.set(6, 1, 6, S + "campfire", extinguished=True, **{"minecraft:cardinal_direction": "south"})
    b.clear(5, 1, 5, 7, 2, 7)  # open ground around the dead fire
    b.set(6, 1, 6, S + "campfire", extinguished=True, **{"minecraft:cardinal_direction": "south"})
    # log seats around the fire
    b.fill(4, 1, 6, 4, 1, 6, S + "spruce_log", pillar_axis="z")
    b.fill(8, 1, 5, 8, 1, 7, S + "spruce_log", pillar_axis="z")
    b.fill(5, 1, 9, 7, 1, 9, S + "spruce_log", pillar_axis="x")
    # tent 1 (standing, A-frame of wool), opening toward the fire
    for z in range(1, 4):
        b.set(1, 1, z, S + "light_gray_wool")
        b.set(3, 1, z, S + "light_gray_wool")
        b.set(2, 2, z, S + "light_gray_wool")
        b.set(2, 1, z, S + "brown_carpet")
    fence(b, 2, 1, 4, kind="spruce_fence")
    b.set(2, 1, 3, S + "barrel", facing_direction=1, open_bit=False)
    # tent 2 (collapsed): wool lying flat with a broken pole
    for (x, z) in ((9, 1), (10, 1), (11, 1), (9, 2), (10, 2), (11, 2), (10, 3)):
        b.set(x, 1, z, S + "white_carpet")
    fence(b, 11, 1, 3)
    b.set(10, 1, 2, S + "white_wool")
    # scattered gear
    b.set(8, 1, 3, S + "chest", **{"minecraft:cardinal_direction": "west"})
    b.set(3, 1, 8, S + "lantern", hanging=False)
    b.set(9, 1, 9, S + "hay_block", pillar_axis="x")
    # tracks leading away into the trees: a path that gets fainter
    for i, (x, z) in enumerate(((6, 9), (6, 10), (7, 11), (7, 12))):
        b.set(x, 0, z, S + ("grass_path" if i < 2 else "coarse_dirt"))
    b.set(10, 1, 8, S + "spruce_standing_sign", ground_sign_direction=8)
    return b


def shrine():
    W, H = 25, 13
    b = Builder(W, H, W)
    c = W // 2
    rng = np.random.default_rng(7)
    # shell: floor, walls, ceiling in deepslate with roots
    for x in range(W):
        for z in range(W):
            b.set(x, 0, z, S + ("deepslate_tiles" if (x + z) % 3 else "cobbled_deepslate"))
            b.set(x, H - 1, z, S + "cobbled_deepslate")
    for y in range(1, H - 1):
        for i in range(W):
            for (x, z) in ((i, 0), (i, W - 1), (0, i), (W - 1, i)):
                r = rng.random()
                b.set(x, y, z, "hollow:hollow_roots" if r < 0.25 else S + ("deepslate_bricks" if r < 0.7 else "cracked_deepslate_bricks"))
    b.clear(1, 1, 1, W - 2, H - 2, W - 2)
    # domed corners: fill the top corners to round the room
    for y in range(H - 4, H - 1):
        inset = y - (H - 5)
        for x in range(1, W - 1):
            for z in range(1, W - 1):
                if min(x, z, W - 1 - x, W - 1 - z) <= inset:
                    b.set(x, y, z, S + "cobbled_deepslate")
    # root streaks across the floor, radiating from the centre
    for ang in np.linspace(0, 2 * np.pi, 9)[:-1]:
        for r in range(3, 11):
            x = int(round(c + np.cos(ang) * r))
            z = int(round(c + np.sin(ang) * r))
            if 1 <= x < W - 1 and 1 <= z < W - 1:
                b.set(x, 0, z, "hollow:hollow_roots")
    # central root mound where the Heart rises
    for x in range(c - 3, c + 4):
        for z in range(c - 3, c + 4):
            d = abs(x - c) + abs(z - c)
            if d <= 4:
                b.set(x, 1, z, "hollow:hollow_roots")
            if d <= 2:
                b.set(x, 2, z, S + "muddy_mangrove_roots")
    # four pillars (cover from the Heart's gaze) with candles at their feet
    for (px, pz) in ((6, 6), (18, 6), (6, 18), (18, 18)):
        b.fill(px - 1, 1, pz - 1, px + 1, H - 2, pz + 1, S + "deepslate_bricks")
        b.fill(px - 1, 4, pz - 1, px + 1, 4, pz + 1, S + "chiseled_deepslate")
        for (dx, dz) in ((-2, 0), (2, 0), (0, -2), (0, 2)):
            if b.get(px + dx, 1, pz + dz) is None or b.get(px + dx, 1, pz + dz)[0] == S + "air":
                b.set(px + dx, 1, pz + dz, S + "candle", candles=2, lit=True)
    # hanging roots and warm shroomlights in the ceiling
    for _ in range(40):
        x, z = rng.integers(2, W - 2), rng.integers(2, W - 2)
        if b.get(x, H - 2, z) and b.get(x, H - 2, z)[0] == S + "air" and b.get(x, H - 1, z):
            b.set(x, H - 2, z, S + "hanging_roots")
    for (x, z) in ((c, 4), (c, W - 5), (4, c), (W - 5, c)):
        b.set(x, H - 1, z, S + "shroomlight")
    # the altar on the entrance side, raised on a tile step, flanked by candles
    b.fill(c - 2, 1, 2, c + 2, 1, 4, S + "polished_deepslate")
    b.set(c, 2, 3, "hollow:heart_altar", **{"hollow:awake": 0})
    for (x, z) in ((c - 2, 2), (c + 2, 2), (c - 2, 4), (c + 2, 4)):
        b.set(x, 2, z, S + "candle", candles=3, lit=True)
    # an entrance in the near wall
    b.clear(c - 1, 1, 0, c + 1, 3, 0)
    return b


COLORS = {
    "cobblestone": (120, 120, 120), "mossy_cobblestone": (100, 120, 90), "spruce_planks": (110, 82, 50),
    "spruce_log": (70, 52, 35), "stripped_spruce_log": (140, 105, 70), "spruce_stairs": (100, 74, 45),
    "spruce_slab": (100, 74, 45), "glass_pane": (190, 210, 220), "spruce_door": (90, 66, 40), "web": (230, 230, 230),
    "bed": (170, 40, 40), "chest": (150, 110, 50), "barrel": (120, 90, 55), "crafting_table": (130, 90, 55),
    "furnace": (100, 100, 100), "lantern": (255, 200, 120), "brown_carpet": (110, 80, 55), "candle": (240, 230, 200),
    "cobblestone_wall": (120, 120, 120), "spruce_fence": (100, 74, 45), "spruce_wall_sign": (140, 110, 70),
    "coarse_dirt": (110, 80, 60), "campfire": (60, 50, 40), "light_gray_wool": (160, 160, 160),
    "white_carpet": (220, 220, 220), "white_wool": (230, 230, 230), "hay_block": (200, 170, 60),
    "grass_path": (150, 125, 80), "spruce_standing_sign": (140, 110, 70), "deepslate_tiles": (55, 55, 60),
    "cobbled_deepslate": (70, 70, 75), "deepslate_bricks": (65, 65, 70), "cracked_deepslate_bricks": (60, 60, 64),
    "hollow_roots": (150, 140, 120), "muddy_mangrove_roots": (90, 70, 55), "chiseled_deepslate": (80, 80, 86),
    "hanging_roots": (160, 130, 110), "shroomlight": (255, 160, 80), "polished_deepslate": (75, 75, 80),
    "heart_altar": (180, 60, 50),
}


def preview(b, path, scale=10):
    sx, sy, sz = b.size
    w = (sx + sz) * scale + 20
    h = (sx + sz) * scale // 2 + sy * scale + 20
    img = Image.new("RGB", (w, h), (24, 26, 30))
    px = img.load()
    order = sorted(b.blocks.items(), key=lambda kv: (kv[0][0] + kv[0][2], kv[0][1]))
    for (x, y, z), (name, _) in order:
        short = name.split(":")[1]
        if short == "air":
            continue
        col = np.array(COLORS.get(short, (200, 0, 200)))
        ox = (x - z) * scale + sz * scale + 10
        oy = (x + z) * scale // 2 - y * scale + sy * scale + 10
        for dy in range(scale):
            for dx in range(-scale, scale):
                X, Y = ox + dx, oy + dy - scale // 2
                if 0 <= X < w and 0 <= Y < h:
                    shade = 1.0 if dx < 0 else 0.8
                    px[X, Y] = tuple(int(v * shade) for v in col)
        for dx in range(-scale, scale):
            for dy in range(-scale // 2, 0):
                X, Y = ox + dx, oy + dy - scale // 2 + abs(dx) // 2
                if 0 <= X < w and 0 <= Y < h:
                    px[X, Y] = tuple(min(255, int(v * 1.15)) for v in col)
    img.save(path)


def main():
    out = ensure(os.path.join(BP, "structures", "hollow"))
    ensure(os.path.join(BUILD, "previews"))
    for name, fn in (("cabin", cabin), ("campsite", campsite), ("shrine", shrine)):
        b = fn()
        n_pal, n_blocks = b.write(os.path.join(out, f"{name}.mcstructure"))
        preview(b, os.path.join(BUILD, "previews", f"structure_{name}.png"), scale=8 if name == "shrine" else 12)
        print(f"{name}: {b.size} palette={n_pal} blocks={n_blocks}")


if __name__ == "__main__":
    main()
