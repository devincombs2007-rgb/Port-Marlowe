"""The Mirebound: a broad, low swamp ambusher whose back is a mossy hump of reeds and pads.

Submerged, only the hump shows - like a rotten log in the shallows. When it erupts, a wide flat
head with a huge hinged jaw rises, and two long grasping arms unfold from beneath it.
Clue design: dull amber eyes on top of the head glow at night (glow layer), bubbles rise.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model, add_segment
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

HIDE = ramp("#1b1f16", "#252b1e", "#303826", "#3c4530", "#4a553b")
BELLY = ramp("#4a4636", "#5d5844", "#716b54", "#858066")
MOSS = ramp("#26361d", "#304626", "#3c5830", "#4a6b3a", "#5a7f45")
REED = ramp("#4f4426", "#665833", "#7f6e41", "#98854f")
PAD = ramp("#1f3a1f", "#2a4e28", "#386531")
MOUTH = ramp("#1a0f0b", "#2b1712", "#3f221a")
TOOTH = ramp("#8f876f", "#aaa286", "#c4bc9f")


def build():
    m = Model("geometry.hollow.mirebound", atlas_width=128, visible_bounds=(3, 2, (0, 0.5, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, 4, 0))
    m.cube("body", (-6, 1, -8), (12, 6, 18), "hide")
    m.cube("body", (-5.5, 0.5, -7.5), (11, 1, 17), "belly")
    m.bone("hump", "body", pivot=(0, 7, 0))
    m.cube("hump", (-5, 7, -6), (10, 2.5, 14), "moss")
    m.cube("hump", (-3.5, 9.5, -3), (7, 1.5, 8), "moss")
    for (x, z, h, rz) in ((-3, -2, 7, -8), (-2, 0, 9, 5), (2.5, 3, 6, 12), (3.2, -1, 8, -4), (0.5, 5, 5, 0)):
        add_segment(m, "hump", (x, 10, z), (x + rz * 0.12, 10 + h, z + 0.5), 0.5, "reed")
    m.cube("hump", (-6.5, 9.4, 4), (5, 0.3, 5), "pad", pivot=(-4, 9.5, 6.5), rotation=(0, 20, 6))
    m.bone("head", "body", pivot=(0, 5, -8))
    m.cube("head", (-5, 3.5, -16), (10, 3.5, 8.5), "hide")
    m.cube("head", (-4, 6.5, -14), (8, 1.2, 5), "moss")
    m.cube("head", (-3.5, 6.8, -11.5), (2, 1.2, 2), "hide")   # eye mounds
    m.cube("head", (1.5, 6.8, -11.5), (2, 1.2, 2), "hide")
    m.bone("jaw", "head", pivot=(0, 3.5, -8.5))
    m.cube("jaw", (-4.8, 1.5, -16), (9.6, 2, 8), "hide")
    m.cube("jaw", (-4.3, 3.3, -15.5), (8.6, 0.5, 7), "mouth")
    for i in range(6):
        m.cube("jaw", (-4.0 + i * 1.55, 3.5, -15.6), (0.5, 1.2, 0.5), "tooth")
    for side, sx in (("arm_l", 1), ("arm_r", -1)):
        m.bone(side, "body", pivot=(sx * 5.5, 3, -6))
        add_segment(m, side, (sx * 5.5, 3, -6), (sx * 7.5, 2.0, -13), 1.8, "hide")
        m.bone(side + "_lower", side, pivot=(sx * 7.5, 2.0, -13))
        add_segment(m, side + "_lower", (sx * 7.5, 2.0, -13), (sx * 5.0, 0.6, -19), 1.4, "hide")
        for k, dx in enumerate((-1.0, 0.0, 1.0)):
            add_segment(m, side + "_lower", (sx * 5.0, 0.6, -19), (sx * 5.0 + dx, 0.2, -21.5), 0.5, "tooth")
    for side, sx in (("leg_l", 1), ("leg_r", -1)):
        m.bone(side, "body", pivot=(sx * 5, 2.5, 7))
        add_segment(m, side, (sx * 5, 2.5, 7), (sx * 9, 0.4, 9), 1.8, "hide")
    m.bone("tail", "body", pivot=(0, 3.5, 10))
    m.cube("tail", (-2.5, 2, 10), (5, 3, 6), "hide")
    m.bone("tail2", "tail", pivot=(0, 3.5, 16))
    m.cube("tail2", (-1.5, 2.5, 16), (3, 2, 6), "hide")
    m.locator("head", "mouth", (0, 3.5, -16))
    return m


def materials():
    return {
        "hide": Material(HIDE, base=0.5, noise=(0.45, 0.3, 3), speckle=(0.08, 0.15), ao=0.3,
                         spots=dict(scale=0.5, threshold=0.55, ramp=MOSS), mers=(0, 0, 80, 60), rough_var=35, height_strength=0.9),
        "belly": Material(BELLY, base=0.5, noise=(0.6, 0.2, 2), mers=(0, 0, 110, 120), ao=0.0),
        "moss": Material(MOSS, base=0.55, noise=(0.6, 0.35, 3), speckle=(0.12, 0.2), ao=0.15, mers=(0, 0, 240, 150), height_strength=1.0),
        "reed": Material(REED, base=0.55, noise=(0.8, 0.2, 1), streak=(3, 0.2, 3, 0.3), mers=(0, 0, 230, 120), ao=0.0, edge=0.0),
        "pad": Material(PAD, base=0.5, noise=(0.9, 0.2, 1), mers=(0, 0, 120, 170), ao=0.0, edge=0.0),
        "mouth": Material(MOUTH, base=0.4, noise=(1.0, 0.2, 1), mers=(0, 0, 70, 130), ao=0.0, edge=0.0),
        "tooth": Material(TOOTH, base=0.55, noise=(1.0, 0.2, 1), mers=(0, 0, 90, 20), ao=0.0, edge=0.0),
    }


def features():
    eye = "#d6a24a"
    return [
        Feature(("box", (-3.0, 7.95, -11.0), (-2.0, 8.05, -10.0)), color=eye, mers=(0, 180, 60, 0), faces=["up"]),
        Feature(("box", (2.0, 7.95, -11.0), (3.0, 8.05, -10.0)), color=eye, mers=(0, 180, 60, 0), faces=["up"]),
        Feature(("box", (-3.6, 7.0, -11.6), (-1.4, 8.1, -11.4)), color=eye, mers=(0, 140, 60, 0), faces=["north"]),
        Feature(("box", (1.4, 7.0, -11.6), (3.6, 8.1, -11.4)), color=eye, mers=(0, 140, 60, 0), faces=["north"]),
    ]


POSES = [None, {"head": {"rot": (-30, 0, 0)}, "jaw": {"rot": (40, 0, 0)}, "body": {"rot": (-12, 0, 0)},
                "arm_l": {"rot": (-50, 0, 0)}, "arm_r": {"rot": (-50, 0, 0)}}]


def main():
    m = build()
    export_entity("mirebound", m, Painter(m, materials(), features(), seed=55), previews=POSES)


if __name__ == "__main__":
    main()
