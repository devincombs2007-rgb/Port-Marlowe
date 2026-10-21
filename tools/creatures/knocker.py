"""The Knocker: a hunched visitor wrapped in rags, with a cracked porcelain face and one enormous
knuckled hand made for knocking. Slow, strong, patient."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model, add_segment
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

CLOTH = ramp("#16120f", "#211b16", "#2c241d", "#382e25", "#45392d")
SKIN = ramp("#3f3a33", "#524b41", "#665d50", "#7b7060", "#8f8371")
PORCELAIN = ramp("#7f7a70", "#9b958a", "#b5afa3", "#cbc6ba", "#dedad0")
NAIL = ramp("#121314", "#1d1f21", "#2a2d30", "#3a3e42")


def build():
    m = Model("geometry.hollow.knocker", atlas_width=128, visible_bounds=(3, 3.5, (0, 1.3, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, 20, 0))
    m.cube("body", (-3, 18, -2), (6, 5, 4), "cloth")                       # pelvis
    m.bone("torso", "body", pivot=(0, 23, 0), rotation=(22, 0, 0))
    m.cube("torso", (-4, 23, -2.5), (8, 12, 5), "cloth")
    m.cube("torso", (-4.5, 26, -3), (9, 2, 6), "cloth", inflate=0.1)     # wrapping strips
    m.cube("torso", (-4.5, 31, -3), (9, 1.5, 6), "cloth", inflate=0.1)
    m.cube("torso", (-3.5, 33.5, 1.5), (7, 3, 2.5), "skin")               # hunched shoulders/spine
    m.bone("neck", "torso", pivot=(0, 35, -0.5), rotation=(25, 0, 0))
    m.cube("neck", (-1, 34.5, -1.5), (2, 5, 2), "skin")
    m.bone("head", "neck", pivot=(0, 39, -1), rotation=(-12, 0, 16))
    m.cube("head", (-2.5, 39, -3.5), (5, 7, 5), "porcelain")
    m.cube("head", (-2, 46, -3), (4, 1, 4), "porcelain")
    # a rag hood hanging over the back of the porcelain head
    m.cube("head", (-2.9, 40.6, -0.9), (5.8, 6.9, 3.4), "cloth", inflate=0.1)
    m.cube("head", (-2.6, 37.4, 0.4), (5.2, 3.0, 2.2), "cloth")
    # nails driven through the porcelain where eyes should be
    for nx, ny in ((-1.2, 44.0), (1.3, 43.6)):
        m.cube("head", (nx - 0.3, ny - 0.3, -4.2), (0.6, 0.6, 0.9), "nail")
    # rags hanging from the torso
    for i, (x, z, ln) in enumerate(((-3.5, -2.8, 9), (-0.5, -2.8, 12), (2.5, -2.8, 7), (3.6, 1.0, 10), (-3.8, 1.2, 8))):
        m.cube("torso", (x - 0.75, 23 - ln + 3, z), (1.5, ln, 0.3), "cloth")
    # right arm: the knocking arm - long, with an enormous hand
    m.bone("right_arm", "torso", pivot=(-4.5, 34, 0), rotation=(-10, 0, 8))
    m.cube("right_arm", (-6, 22, -1), (2, 12, 2), "skin")
    m.cube("right_arm", (-6.3, 30, -1.3), (2.6, 3, 2.6), "cloth", inflate=0.1)
    m.bone("right_forearm", "right_arm", pivot=(-5, 22.5, 0), rotation=(-20, 0, 0))
    m.cube("right_forearm", (-6, 10, -1), (2, 13, 2), "skin")
    m.bone("right_hand", "right_forearm", pivot=(-5, 10, 0))
    m.cube("right_hand", (-7, 5, -2), (4, 5, 3), "skin")                  # huge palm
    for k, (fx, ln) in enumerate(((-6.6, 7), (-5.6, 8.5), (-4.6, 8), (-3.6, 6.5))):
        m.cube("right_hand", (fx - 0.45, 5 - ln, -1.2), (0.9, ln, 0.9), "skin")
        m.cube("right_hand", (fx - 0.45, 5 - ln - 1.2, -1.2), (0.9, 1.2, 0.9), "nail")
        m.cube("right_hand", (fx - 0.6, 3.5 - k * 0.3, -1.4), (1.2, 1.2, 1.3), "skin")  # knuckles
    # left arm: thin, ordinary-long
    m.bone("left_arm", "torso", pivot=(4.5, 34, 0), rotation=(-6, 0, -6))
    m.cube("left_arm", (4, 22, -0.75), (1.5, 12, 1.5), "skin")
    m.bone("left_forearm", "left_arm", pivot=(4.75, 22.5, 0), rotation=(-12, 0, 0))
    m.cube("left_forearm", (4, 11, -0.75), (1.5, 12, 1.5), "skin")
    m.bone("left_hand", "left_forearm", pivot=(4.75, 11, 0))
    for k, fx in enumerate((4.0, 4.75, 5.5)):
        m.cube("left_hand", (fx - 0.3, 5.5, -0.5), (0.6, 5.5, 0.6), "skin")
        m.cube("left_hand", (fx - 0.3, 4.6, -0.5), (0.6, 0.9, 0.6), "nail")
    # legs
    for side, sx in (("right_leg", -1), ("left_leg", 1)):
        m.bone(side, "body", pivot=(sx * 1.8, 18, 0))
        m.cube(side, (sx * 1.8 - 1.25, 9, -1.25), (2.5, 9.5, 2.5), "cloth")
        m.bone(side + "_shin", side, pivot=(sx * 1.8, 9.5, 0), rotation=(6, 0, 0))
        m.cube(side + "_shin", (sx * 1.8 - 1, 1, -1), (2, 9, 2), "skin")
        m.cube(side + "_shin", (sx * 1.8 - 1.2, 0, -3), (2.4, 1, 4), "nail")
    m.locator("right_hand", "knuckles", (-5, 3, -2))
    return m


def materials():
    return {
        "cloth": Material(CLOTH, base=0.5, noise=(0.5, 0.28, 3), streak=(2.5, 0.2, 2.5, 0.35), speckle=(0.08, 0.15),
                          detail=0.08, fissure=dict(scale=0.9, stretch=(0.2, 1.0, 0.2), threshold=0.975, delta=-0.25),
                          grime=dict(color="#0a0807", strength=0.35), ao=0.2, mers=(0, 0, 250, 30), height_strength=0.9),
        "skin": Material(SKIN, base=0.5, noise=(0.55, 0.22, 2), speckle=(0.07, -0.18), ao=0.2, detail=0.06,
                         veins=dict(scale=0.35, threshold=0.982, ramp=ramp("#3a332c", "#443c34"), mers=(0, 0, 190, 140)),
                         grime=dict(color="#1d1814", strength=0.55), bevel=0.05, mers=(0, 0, 195, 110)),
        "porcelain": Material(PORCELAIN, base=0.62, noise=(0.7, 0.12, 2), speckle=(0.03, -0.3), ao=0.05, edge=0.03,
                              cells=dict(scale=0.7, mode="crack", edge=0.045, edge_delta=-0.35), bevel=0.06,
                              grime=dict(color="#3a342c", strength=0.8), mers=(0, 0, 45, 30), height_strength=0.4),
        "nail": Material(NAIL, base=0.5, noise=(0.9, 0.2, 1), mers=(120, 0, 110, 0), ao=0.0),
    }


def features():
    z0, z1 = -3.8, -3.2

    def px(x, y, color, h=None):
        return Feature(("box", (x - 0.45, y - 0.45, z0), (x + 0.45, y + 0.45, z1)), color=color, faces=["north"], height=h)

    crack = "#4a463f"
    hole = "#0d0c0b"
    return [
        # no eyes: a vertical row of nail-holes and a long crack through the porcelain
        px(0, 44.5, hole, 20), px(0, 43.5, hole, 20), px(0, 42.5, hole, 20), px(0, 40.5, hole, 20),
        px(-1, 45.5, crack), px(-1, 44.5, crack), px(-2, 43.5, crack), px(-1, 42.5, crack), px(1, 41.5, crack),
        px(1, 40.5, crack), px(2, 39.5, crack),
    ]


POSES = [None, {"right_arm": {"rot": (-80, 0, -10)}, "right_forearm": {"rot": (-40, 0, 0)}, "head": {"rot": (0, 30, 20)}}]


def main():
    m = build()
    export_entity("knocker", m, Painter(m, materials(), features(), seed=44, scale=2, ao_rays=24, ao_dist=6.0), previews=POSES)


if __name__ == "__main__":
    main()
