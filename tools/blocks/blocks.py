"""Custom block geometry + textures (with MERS/heightmaps for Vibrant Visuals)."""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import RP, BUILD, ensure  # noqa: E402
from hollowkit.model import Model  # noqa: E402
from hollowkit.paint import Feature, Material, Painter, ramp, save_l, save_rgba  # noqa: E402
from hollowkit.render import render  # noqa: E402

WOOD = ramp("#2e1f14", "#3d2a1b", "#4f3723", "#62452c", "#765536")
COPPER = ramp("#5e3221", "#7d4329", "#a35a36", "#c27348", "#de9465", "#f0b58c")
VERDI = ramp("#2f5048", "#3f6a5f", "#548476")
STRING = ramp("#8f8778", "#b3ab99", "#d1cab8")
CLOTH = ramp("#3a3530", "#4d4640", "#625a52", "#776e64")
IRON = ramp("#3d4044", "#55595e", "#70757a", "#8f9499", "#b0b5b9")
TWIG = ramp("#2f2116", "#43301f", "#594029", "#6e5034")
BERRY = ramp("#5a1a14", "#7d241b", "#a83a2a", "#c95440")
EMBER = ramp("#7a2a10", "#c24a18", "#e2742c", "#ffb15a", "#ffe0a0")
ASH = ramp("#2b2725", "#3d3835", "#524c48", "#69625d")
STONE = ramp("#1c1c20", "#26262b", "#303036", "#3b3b42", "#47474f", "#55555e")
HEARTWOOD = ramp("#2a1410", "#3d1d16", "#55291f", "#6e3628", "#874432")
CORE = ramp("#7a1c14", "#b0322a", "#e0574a", "#ff9a6a", "#ffd2a0")
ROOT = ramp("#6d6556", "#8a8170", "#a69d8a", "#c2b9a5")
SOIL = ramp("#1a1511", "#241d17", "#2e251d", "#3a2f25")

M = {
    "wood": Material(WOOD, noise=(0.5, 0.25, 2), streak=(0.25, 0.25, 2.5, 0.35), mers=(0, 0, 220, 0), ao=0.1),
    "copper": Material(COPPER, base=0.55, noise=(0.6, 0.2, 2), speckle=(0.08, -0.25), spots=dict(scale=0.5, threshold=0.55, ramp=VERDI),
                       mers=(255, 0, 90, 0), rough_var=40, ao=0.1, edge=0.08),
    "string": Material(STRING, noise=(0.8, 0.2, 1), mers=(0, 0, 240, 20), ao=0.0, edge=0.0),
    "cloth": Material(CLOTH, noise=(0.9, 0.3, 2), mers=(0, 0, 250, 30), ao=0.0),
    "iron": Material(IRON, base=0.55, noise=(0.7, 0.2, 2), speckle=(0.06, -0.2), mers=(230, 0, 120, 0), ao=0.1),
    "twig": Material(TWIG, noise=(0.6, 0.25, 2), streak=(2, 0.3, 2, 0.3), mers=(0, 0, 240, 0), ao=0.1),
    "berry": Material(BERRY, base=0.6, noise=(1.0, 0.25, 1), mers=(0, 0, 120, 140), ao=0.0, edge=0.0),
    "ember": Material(EMBER, base=0.65, noise=(1.0, 0.35, 2), mers=(0, 255, 200, 0), ao=0.0, edge=0.0),
    "ash": Material(ASH, base=0.5, noise=(1.0, 0.3, 2), mers=(0, 0, 250, 0), ao=0.0),
    "stone": Material(STONE, base=0.5, noise=(0.35, 0.3, 3), spots=dict(scale=0.3, threshold=0.6, ramp=ramp("#2a2e2a", "#353b35", "#414a41")),
                      speckle=(0.08, -0.2), mers=(0, 0, 230, 0), ao=0.25, height_strength=1.0),
    "heartwood": Material(HEARTWOOD, noise=(0.5, 0.25, 2), streak=(0.3, 2.5, 0.3, 0.35), mers=(0, 0, 200, 60), ao=0.1),
    "core": Material(CORE, base=0.7, noise=(0.9, 0.3, 2), mers=(0, 255, 160, 120), ao=0.0, edge=0.0),
    "root": Material(ROOT, base=0.55, noise=(0.6, 0.25, 2), streak=(1.5, 0.4, 1.5, 0.3), mers=(0, 0, 220, 60), ao=0.1),
    "soil": Material(SOIL, base=0.5, noise=(0.5, 0.3, 3), speckle=(0.1, 0.15), mers=(0, 0, 250, 0), ao=0.0, height_strength=0.4),
}


def write_texture_set(tex_dir, name):
    with open(os.path.join(tex_dir, f"{name}.texture_set.json"), "w") as f:
        json.dump({"format_version": "1.21.30", "minecraft:texture_set": {
            "color": name, "metalness_emissive_roughness_subsurface": f"{name}_mers", "heightmap": f"{name}_height"}}, f, indent=2)


def export_block(name, model, materials, features=(), variants=None, seed=3):
    """variants: {suffix: {material_key: Material}} for alternate textures sharing one geometry."""
    geo_dir = ensure(os.path.join(RP, "models", "blocks"))
    tex_dir = ensure(os.path.join(RP, "textures", "blocks", "hollow"))
    model.write(os.path.join(geo_dir, f"{name}.geo.json"))
    out = []
    for suffix, over in [("", {})] + list((variants or {}).items()):
        mats = {**materials, **over}
        color, mers, height = Painter(model, mats, features, seed=seed).paint()
        tex = f"{name}{suffix}"
        save_rgba(color, os.path.join(tex_dir, f"{tex}.png"))
        save_rgba(mers, os.path.join(tex_dir, f"{tex}_mers.png"))
        save_l(height, os.path.join(tex_dir, f"{tex}_height.png"))
        write_texture_set(tex_dir, tex)
        out.append(render(model, color, yaw=30, pitch=20, size=220))
    return out


def chime():
    m = Model("geometry.hollow.hollow_chime", atlas_width=64, visible_bounds=(1, 1.2, (0, 0.6, 0)))
    m.bone("root", pivot=(0, 16, 0))
    m.cube("root", (-0.5, 14, -0.5), (1, 2, 1), "iron")
    m.cube("root", (-5, 12.5, -0.75), (10, 1.5, 1.5), "wood")
    for i, (x, length) in enumerate(((-3.5, 7), (0, 9), (3.5, 6))):
        m.cube("root", (x - 0.25, 10.5, -0.25), (0.5, 2, 0.5), "string")
        m.cube("root", (x - 0.75, 10.5 - length, -0.75), (1.5, length, 1.5), "copper")
    m.cube("root", (-0.25, 4.5, -0.25), (0.5, 3, 0.5), "string")
    m.cube("root", (-1.25, 3.5, -1.25), (2.5, 1, 2.5), "wood")
    return m


def ward():
    m = Model("geometry.hollow.rowan_ward", atlas_width=64, visible_bounds=(1, 1.2, (0, 0.6, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.cube("root", (-0.75, 0, -0.75), (1.5, 9, 1.5), "twig")
    m.bone("bundle", "root", pivot=(0, 10, 0))
    for i, (dx, dz, rz, rx) in enumerate(((-1.2, 0, 14, 0), (1.2, 0, -14, 0), (0, -1.2, 0, -14), (0, 1.2, 0, 14), (0, 0, 0, 0))):
        m.cube("bundle", (dx - 0.5, 8, dz - 0.5), (1, 7.5, 1), "twig", pivot=(dx, 9, dz), rotation=(rx, 0, rz))
    m.cube("bundle", (-2.1, 10.5, -2.1), (4.2, 1.2, 4.2), "string")
    m.cube("bundle", (-1.0, 11.8, -1.0), (2, 2, 2), "ember")
    for (x, z) in ((-2.4, 0), (2.4, 0), (0, 2.4), (0, -2.4)):
        m.cube("bundle", (x - 0.4, 8.6, z - 0.4), (0.8, 1.2, 0.8), "iron")
        m.cube("bundle", (x - 0.15, 9.8, z - 0.15), (0.3, 0.8, 0.3), "string")
    for (x, y, z) in ((-1.6, 13.4, 0.6), (1.5, 13.0, -0.6), (0.4, 14.2, 1.3)):
        m.cube("bundle", (x - 0.5, y, z - 0.5), (1, 1, 1), "berry")
    return m


def lantern():
    m = Model("geometry.hollow.heartwood_lantern", atlas_width=64, visible_bounds=(1, 1.2, (0, 0.6, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.cube("root", (-3.5, 0, -3.5), (7, 1.5, 7), "heartwood")
    for (x, z) in ((-3, -3), (2, -3), (-3, 2), (2, 2)):
        m.cube("root", (x, 1.5, z), (1, 6, 1), "heartwood")
    m.cube("root", (-2, 1.5, -2), (4, 6, 4), "core", inflate=-0.1)
    m.cube("root", (-3.5, 7.5, -3.5), (7, 1.5, 7), "heartwood")
    m.cube("root", (-2, 9, -2), (4, 1, 4), "iron")
    m.cube("root", (-0.5, 10, -1.5), (1, 2, 3), "iron")
    return m


def altar():
    m = Model("geometry.hollow.heart_altar", atlas_width=128, visible_bounds=(1.5, 1.5, (0, 0.75, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.cube("root", (-8, 0, -8), (16, 4, 16), "stone")
    m.cube("root", (-6, 4, -6), (12, 7, 12), "stone")
    m.cube("root", (-7, 11, -7), (14, 3, 14), "stone")
    m.cube("root", (-2.5, 14, -2.5), (5, 1, 5), "root")
    for (x, z, rz, rx) in ((-6.5, 0, 0, 0), (6.5, 0, 0, 0), (0, -6.5, 0, 0), (0, 6.5, 0, 0)):
        m.cube("root", (x - 0.75, 3, z - 0.75), (1.5, 10, 1.5), "root")
    return m


def roots_block():
    """Full-cube texture: dark loam threaded with a few pale roots (tiles seamlessly)."""
    from hollowkit.noise import Noise3
    n = Noise3(11)
    ys, xs = np.mgrid[0:16, 0:16]
    # sample a torus so the texture tiles
    ang_x, ang_y = xs / 16 * 2 * np.pi, ys / 16 * 2 * np.pi
    pts = np.stack([np.cos(ang_x) * 2.5, np.sin(ang_x) * 2.5 + np.cos(ang_y) * 2.5, np.sin(ang_y) * 2.5], -1).reshape(-1, 3)
    v = (0.5 + 0.45 * n.fbm(pts, octaves=3, scale=0.9)).reshape(16, 16)
    idx = np.clip(np.round(v * (len(SOIL) - 1)), 0, len(SOIL) - 1).astype(int)
    img = np.zeros((16, 16, 4), np.uint8)
    img[..., :3] = SOIL[idx]
    img[..., 3] = 255
    mers = np.zeros((16, 16, 4), np.uint8)
    mers[...] = (0, 0, 250, 0)
    height = (110 + v * 40).astype(np.uint8)
    rng = np.random.default_rng(5)
    for start_x in (2, 7, 12):
        x = start_x
        for y in range(16):
            img[y, x % 16, :3] = ROOT[2 + (y % 2)]
            img[y, (x + 1) % 16, :3] = ROOT[0]
            mers[y, x % 16] = (0, 0, 200, 80)
            height[y, x % 16] = 190
            if rng.random() < 0.35:
                x += rng.choice([-1, 1])
    tex_dir = ensure(os.path.join(RP, "textures", "blocks", "hollow"))
    save_rgba(img, os.path.join(tex_dir, "hollow_roots.png"))
    save_rgba(mers, os.path.join(tex_dir, "hollow_roots_mers.png"))
    save_l(height, os.path.join(tex_dir, "hollow_roots_height.png"))
    write_texture_set(tex_dir, "hollow_roots")
    tiled = np.tile(img, (2, 2, 1))
    return Image.fromarray(tiled).resize((220, 220), Image.NEAREST).convert("RGB")


# ------------------------------------------------------------------------------ tracks (decals)
# 16x16 pixel-art prints; the top of the texture is the direction of travel. '#' = deep print,
# '+' = shallow edge, '.' = nothing (transparent).
TRACKS = {
    "watcher": [  # long, root-like three-toed prints, far apart: something tall walked here
        "..........#..#..",
        "..........#.#...",
        "...........##...",
        "...........+#...",
        "...........##...",
        "...........##...",
        "...........+#...",
        "..#..#..........",
        "..#.#...........",
        "...##...........",
        "...+#...........",
        "...##...........",
        "...##...........",
        "...+#...........",
        "................",
        "................",
    ],
    "knocker": [  # long bare feet with five toes and a heel that drags
        "..........#.#.#.",
        ".........#.....#",
        "..........####..",
        "..........#####.",
        "...........###..",
        "...........###..",
        "...........+##..",
        "............+...",
        "...#.#.#........",
        "..#.....#.......",
        "...####.........",
        "...#####........",
        "....###.........",
        "....###.........",
        "....+##.........",
        ".....+..........",
    ],
    "drag": [  # something heavy and wet dragged from the water
        ".....+###+......",
        "....+####+......",
        "....+####++.....",
        ".....+####+.....",
        ".....+####+..+..",
        "......+###++....",
        "......+####+....",
        ".+....+####+....",
        "......+###+.....",
        ".....+####+.....",
        ".....+###++.....",
        "....+####+...+..",
        "....+####+......",
        "....++###+......",
        ".....+####+.....",
        ".....+####+.....",
    ],
    "borrowed": [  # sheep hooves that become claws halfway along
        "..........#..#..",
        ".........#..#...",
        "........#..#....",
        "................",
        "...#..#..#......",
        "..#..#..#.......",
        ".#..#..#........",
        "................",
        "...........##...",
        "..........#.#...",
        "..........#.#...",
        "................",
        "...##...........",
        "..#.#...........",
        "..#.#...........",
        "................",
    ],
}
TRACK_COLOURS = {  # deep, edge (RGB) and alpha
    "watcher": ((46, 34, 24), (70, 54, 38), 200),
    "knocker": ((44, 33, 26), (68, 52, 40), 210),
    "drag": ((36, 40, 26), (58, 62, 40), 190),
    "borrowed": ((50, 36, 30), (74, 56, 44), 200),
}


def tracks():
    tex_dir = ensure(os.path.join(RP, "textures", "blocks", "hollow"))
    previews = []
    for kind, rows in TRACKS.items():
        deep, edge, alpha = TRACK_COLOURS[kind]
        img = np.zeros((16, 16, 4), np.uint8)
        mers = np.zeros((16, 16, 4), np.uint8)
        height = np.full((16, 16), 128, np.uint8)
        rng = np.random.default_rng(len(kind))
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch == "#":
                    j = rng.integers(-6, 7)
                    img[y, x] = (*np.clip(np.array(deep) + j, 0, 255), alpha)
                    height[y, x] = 70
                    mers[y, x] = (0, 0, 120 if kind == "drag" else 230, 0)
                elif ch == "+":
                    img[y, x] = (*edge, int(alpha * 0.6))
                    height[y, x] = 105
                    mers[y, x] = (0, 0, 160 if kind == "drag" else 235, 0)
        name = f"tracks_{kind}"
        save_rgba(img, os.path.join(tex_dir, f"{name}.png"))
        save_rgba(mers, os.path.join(tex_dir, f"{name}_mers.png"))
        save_l(height, os.path.join(tex_dir, f"{name}_height.png"))
        write_texture_set(tex_dir, name)
        # preview: the print on a grass-coloured ground
        ground = np.zeros((16, 16, 3), np.uint8) + np.array([88, 120, 58], np.uint8)
        a = img[..., 3:4] / 255.0
        comp = (img[..., :3] * a + ground * (1 - a)).astype(np.uint8)
        previews.append(Image.fromarray(np.tile(comp, (2, 2, 1))).resize((220, 220), Image.NEAREST))
    geo = {"format_version": "1.16.0", "minecraft:geometry": [{
        "description": {"identifier": "geometry.hollow.tracks", "texture_width": 16, "texture_height": 16,
                        "visible_bounds_width": 2, "visible_bounds_height": 1, "visible_bounds_offset": [0, 0.5, 0]},
        "bones": [{"name": "decal", "pivot": [0, 0, 0], "cubes": [{
            "origin": [-8, 0, -8], "size": [16, 0.1, 16],
            "uv": {"up": {"uv": [0, 0], "uv_size": [16, 16]}}}]}],  # only the top face renders
    }]}
    geo_dir = ensure(os.path.join(RP, "models", "blocks"))
    with open(os.path.join(geo_dir, "tracks.geo.json"), "w") as f:
        json.dump(geo, f, indent=2)
    return previews


def main():
    previews = []
    previews += export_block("hollow_chime", chime(), M, variants={"_silenced": {"copper": M["cloth"]}})
    previews += export_block("rowan_ward", ward(), M, variants={"_spent": {"ember": M["ash"]}})
    previews += export_block("heartwood_lantern", lantern(), M)
    previews += export_block("heart_altar", altar(), M, variants={"_awake": {"root": M["core"]}})
    previews.append(roots_block())
    previews += tracks()
    sheet = Image.new("RGB", (220 * len(previews), 220))
    for i, p in enumerate(previews):
        sheet.paste(p, (i * 220, 0))
    ensure(os.path.join(BUILD, "previews"))
    sheet.save(os.path.join(BUILD, "previews", "blocks.png"))


if __name__ == "__main__":
    main()
