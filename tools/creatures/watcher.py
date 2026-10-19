"""The Watcher: a tall bark-skinned figure with a pale face plate and a crown of dead twigs.

Silhouette goal: at 40+ blocks it reads as a dead sapling or snag until it moves; up close the
pale face and over-long arms make it unmistakable.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

BARK = ramp("#15120f", "#1f1b17", "#2a251f", "#353028", "#413930", "#4e443a", "#5c5145")
PALE = ramp("#5d5952", "#77726a", "#918b82", "#a9a398", "#c0baae", "#d3cfc4")
TWIG = ramp("#14110e", "#1f1a15", "#2a231c", "#352c24", "#413629")
LICHEN = ramp("#262a22", "#30362b", "#3b4234", "#474f3e")


def build():
    m = Model("geometry.hollow.watcher", atlas_width=64, visible_bounds=(3, 4, (0, 1.5, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, 24, 0))
    m.cube("body", (-2, 24, -1.25), (4, 7, 2.5), "bark")
    m.bone("chest", "body", pivot=(0, 31, 0), rotation=(8, 0, 0))
    m.cube("chest", (-3.5, 31, -1.5), (7, 8, 3), "bark")
    m.cube("chest", (-2.5, 33, -2.0), (5, 4, 0.5), "bark")  # sternum ridge
    m.bone("neck", "chest", pivot=(0, 38.5, -0.5), rotation=(14, 0, 0))
    m.cube("neck", (-0.75, 38.5, -1.25), (1.5, 4, 1.5), "bark")
    m.bone("head", "neck", pivot=(0, 42, -0.6), rotation=(-12, 0, 0))
    m.cube("head", (-2.5, 42, -2.4), (5, 8, 4), "bark")
    m.cube("head", (-2.5, 40.6, -3.1), (5, 7.0, 0.75), "pale", tag="face")  # long face plate
    m.cube("head", (-3.0, 47.6, -3.6), (6, 1, 1.0), "bark")  # brow ridge shading the eyes
    m.cube("head", (-0.75, 39.8, -3.0), (1.5, 1.4, 0.6), "pale")  # chin point
    # crown of dead twigs
    m.bone("crown", "head", pivot=(0, 50, -0.6))
    m.cube("crown", (-2.0, 49.5, -1.0), (1, 7, 1), "twig", pivot=(-1.5, 50, -0.5), rotation=(0, 0, 24))
    m.cube("crown", (1.0, 49.5, -1.0), (1, 9, 1), "twig", pivot=(1.5, 50, -0.5), rotation=(-6, 0, -18))
    m.cube("crown", (-4.6, 54.5, -1.0), (1, 4, 1), "twig", pivot=(-4.1, 55, -0.5), rotation=(0, 0, 62))
    m.cube("crown", (3.6, 56.0, -1.0), (1, 4, 1), "twig", pivot=(4.1, 56.5, -0.5), rotation=(0, 0, -58))
    m.cube("crown", (-0.5, 50.0, 0.4), (1, 5, 1), "twig", pivot=(0, 50, 0.9), rotation=(-28, 0, 4))
    # arms (over-long, with knuckled forearms and three finger-roots)
    for side, sx in (("right", -1), ("left", 1)):
        sh = (sx * 4.4, 37.5, 0)
        m.bone(f"{side}_arm", "chest", pivot=sh, rotation=(2, 0, sx * -12))
        m.cube(f"{side}_arm", (sx * 4.4 - 0.85, 24, -0.85), (1.7, 14, 1.7), "bark")
        m.cube(f"{side}_arm", (sx * 4.4 - 1.4, 35.5, -1.2), (2.8, 3, 2.4), "bark")  # shoulder knot
        m.bone(f"{side}_forearm", f"{side}_arm", pivot=(sx * 4.4, 24.5, 0), rotation=(-6, 0, 0))
        m.cube(f"{side}_forearm", (sx * 4.4 - 0.75, 10, -0.75), (1.5, 15, 1.5), "bark")
        m.bone(f"{side}_hand", f"{side}_forearm", pivot=(sx * 4.4, 10, 0))
        for i, (fx, fz, ang) in enumerate(((-0.55, -0.4, 6), (0.55, -0.4, -6), (0.0, 0.5, 0))):
            m.cube(f"{side}_hand", (sx * 4.4 + fx - 0.25, 2.5 - i, fz - 0.25), (0.5, 7.5 + i, 0.5), "twig",
                   pivot=(sx * 4.4 + fx, 10, fz), rotation=(ang * 0.5, 0, ang))
    # legs: long, thin, slightly back-kneed
    for side, sx in (("right", -1), ("left", 1)):
        m.bone(f"{side}_leg", "root", pivot=(sx * 1.4, 24, 0))
        m.cube(f"{side}_leg", (sx * 1.4 - 1, 12, -1), (2, 12.5, 2), "bark")
        m.bone(f"{side}_shin", f"{side}_leg", pivot=(sx * 1.4, 12.5, 0), rotation=(4, 0, 0))
        m.cube(f"{side}_shin", (sx * 1.4 - 0.8, 1, -0.8), (1.6, 12, 1.6), "bark")
        m.cube(f"{side}_shin", (sx * 1.4 - 1.0, 0, -2.4), (2.0, 1, 3.4), "twig")  # root-like foot
    m.locator("head", "eyes", (0, 46.5, -3.2))
    m.locator("body", "core", (0, 30, 0))
    return m


def materials():
    return {
        "bark": Material(BARK, base=0.46, noise=(0.28, 0.22, 3), streak=(1.6, 0.18, 1.6, 0.42),
                         spots=dict(scale=0.22, threshold=0.52, ramp=LICHEN), speckle=(0.07, -0.18),
                         ao=0.35, mers=(0, 0, 238, 0), height_strength=0.9),
        "pale": Material(PALE, base=0.58, noise=(0.5, 0.2, 2), streak=(0.3, 2.2, 0.3, 0.25),
                         speckle=(0.05, -0.25), ao=0.05, edge=0.0, mers=(0, 0, 175, 40), height_strength=0.4),
        "twig": Material(TWIG, base=0.5, noise=(0.6, 0.25, 2), streak=(2, 0.3, 2, 0.3),
                         speckle=(0.05, -0.2), ao=0.1, mers=(0, 0, 245, 0)),
    }


def features():
    # Face plate front is z=-3.1, columns centred on x = -2..2, rows on y = 47.1 .. 41.1.
    z0, z1 = -3.4, -2.8

    def px(x, y, color, mers=None, height=None):
        return Feature(("box", (x - 0.45, y - 0.45, z0), (x + 0.45, y + 0.45, z1)), color=color,
                       mers=mers, faces=["north"], height=height)

    sock = "#0b0a09"
    glint = "#efe6c8"
    return [
        px(-1, 46.1, sock, (0, 0, 255, 0), 30), px(1, 46.1, sock, (0, 0, 255, 0), 30),
        px(-1, 45.1, glint, (0, 190, 70, 0), 140), px(1, 45.1, glint, (0, 190, 70, 0), 140),
        px(-1, 44.1, "#3b3732"), px(1, 44.1, "#3b3732"),  # tear streaks
        px(0, 43.1, "#26231f", height=60), px(0, 42.1, "#1c1a17", height=50), px(0, 41.1, "#26231f", height=60),
        px(-2, 42.1, "#4a4640"), px(2, 43.1, "#4a4640"),
    ]


POSES = [None, {"right_arm": {"rot": (-20, 0, 0)}, "left_arm": {"rot": (10, 0, 0)}, "head": {"rot": (8, 24, 0)},
                "right_leg": {"rot": (18, 0, 0)}, "left_leg": {"rot": (-18, 0, 0)}}]


def main():
    m = build()
    p = Painter(m, materials(), features(), seed=7)
    export_entity("watcher", m, p, previews=POSES)


if __name__ == "__main__":
    main()
