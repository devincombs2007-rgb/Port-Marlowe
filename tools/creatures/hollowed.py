"""The Hollowed: a blind cave predator that hunts by sound.

Low, pale and eyeless, with high spider-like elbows, a long skull with a hinged needle-toothed
jaw, two feelers, and paired echo-sacs on the throat that glow faintly (the readable signal in
the dark: pale lights low to the ground, clicking).
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model, add_segment
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

SKIN = ramp("#4d5258", "#5f656b", "#737a80", "#8a9196", "#a1a8ac", "#b8bec1")
MOTTLE = ramp("#3b3f44", "#474c51", "#53595e")
MOUTH = ramp("#120c0c", "#1f1312", "#2e1c1a")
TOOTH = ramp("#b9b29e", "#d6cfba", "#ece6d2")
SAC = ramp("#6f8f95", "#9fc3c6", "#d4f0ef")
CLAW = ramp("#1e1c1a", "#2c2926", "#3b3733")


def build():
    m = Model("geometry.hollow.hollowed", atlas_width=128, visible_bounds=(2.5, 1.5, (0, 0.6, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, 10, 2))
    m.cube("body", (-3.5, 8, -5), (7, 5, 9), "skin")              # ribcage
    m.cube("body", (-2.5, 8.5, 4), (5, 4, 7), "skin")             # pelvis
    for z in (-3, 0, 3, 6, 9):                                     # spine ridge
        m.cube("body", (-0.75, 13 if z < 4 else 12.5, z - 0.75), (1.5, 1.2, 1.5), "skin")
    m.cube("body", (-0.75, 9.5, 11), (1.5, 1.5, 4), "skin", pivot=(0, 10, 11), rotation=(-35, 0, 0))  # tail stub
    m.bone("head", "body", pivot=(0, 11, -5))
    m.cube("head", (-2.5, 9.5, -13), (5, 4, 8.5), "skin")         # long skull
    m.cube("head", (-1.75, 10.5, -15.5), (3.5, 2.5, 3), "skin")   # snout
    m.cube("head", (-3.0, 10.5, -10), (1, 2, 3), "skin")          # cheek ridges with ear pits
    m.cube("head", (2.0, 10.5, -10), (1, 2, 3), "skin")
    m.bone("jaw", "head", pivot=(0, 9.5, -7))
    m.cube("jaw", (-2, 8, -15), (4, 1.5, 8.5), "skin")
    m.cube("jaw", (-1.6, 9.3, -14.6), (3.2, 0.5, 7.5), "mouth")
    for i in range(5):
        for sx in (-1, 1):
            m.cube("jaw", (sx * 1.3 - 0.2, 9.4, -14.4 + i * 1.5), (0.4, 1.0, 0.4), "tooth")
    m.bone("throat", "head", pivot=(0, 9, -8))
    m.cube("throat", (-2.2, 7.6, -9.5), (2, 1.6, 2), "sac")
    m.cube("throat", (0.2, 7.6, -9.5), (2, 1.6, 2), "sac")
    for side, sx in (("feeler_l", 1), ("feeler_r", -1)):
        m.bone(side, "head", pivot=(sx * 1.5, 11, -15))
        add_segment(m, side, (sx * 1.5, 11, -15), (sx * 3.5, 9.0, -20), 0.5, "skin")
    # limbs: shoulder -> high elbow -> foot (spider-like stance, four legs)
    limbs = {
        "leg_fl": ((3.0, 11.5, -3.5), (9.5, 17.0, -6.0), (7.0, 0.0, -9.5)),
        "leg_fr": ((-3.0, 11.5, -3.5), (-9.5, 17.0, -6.0), (-7.0, 0.0, -9.5)),
        "leg_bl": ((2.5, 11.0, 6.5), (8.5, 15.0, 9.0), (6.5, 0.0, 12.5)),
        "leg_br": ((-2.5, 11.0, 6.5), (-8.5, 15.0, 9.0), (-6.5, 0.0, 12.5)),
    }
    for name, (s, e, f) in limbs.items():
        m.bone(name, "body", pivot=s)
        add_segment(m, name, s, e, 1.6, "skin")
        m.bone(name + "_lower", name, pivot=e)
        add_segment(m, name + "_lower", e, (f[0], f[1] + 1.0, f[2]), 1.2, "skin")
        # three claws splayed at the foot
        for k, dx in enumerate((-0.8, 0.0, 0.8)):
            add_segment(m, name + "_lower", (f[0], f[1] + 1.2, f[2]), (f[0] + dx * 1.6, f[1], f[2] - 1.6), 0.4, "claw")
    m.locator("head", "mouth", (0, 9.5, -15))
    return m


def materials():
    return {
        "skin": Material(SKIN, base=0.55, noise=(0.45, 0.25, 3), speckle=(0.06, -0.2), ao=0.35,
                         spots=dict(scale=0.4, threshold=0.5, ramp=MOTTLE), mers=(0, 0, 150, 170), height_strength=0.7),
        "mouth": Material(MOUTH, base=0.4, noise=(1.0, 0.2, 1), mers=(0, 0, 80, 120), ao=0.0, edge=0.0),
        "tooth": Material(TOOTH, base=0.6, noise=(1.0, 0.2, 1), mers=(0, 0, 70, 30), ao=0.0, edge=0.0),
        "sac": Material(SAC, base=0.7, noise=(1.0, 0.25, 1), mers=(0, 120, 60, 200), ao=0.0, edge=0.0),
        "claw": Material(CLAW, base=0.5, noise=(1.0, 0.2, 1), mers=(0, 0, 100, 0), ao=0.0),
    }


def features():
    return [
        # ear pits on the cheek ridges, and a ridge of darker scar tissue where eyes would be
        Feature(("box", (-3.2, 11.0, -9.5), (-2.8, 12.0, -8.5)), color="#3a3d41", faces=["west"], height=40),
        Feature(("box", (2.8, 11.0, -9.5), (3.2, 12.0, -8.5)), color="#3a3d41", faces=["east"], height=40),
        Feature(("box", (-2.6, 12.0, -13.2), (2.6, 13.6, -11.8)), color="#545a60", faces=["up", "north"]),
    ]


POSES = [None, {"jaw": {"rot": (28, 0, 0)}, "head": {"rot": (-14, 0, 0)}, "body": {"rot": (-10, 0, 0)},
                "leg_fl": {"rot": (-25, 0, 0)}, "leg_fr": {"rot": (-25, 0, 0)}}]


def main():
    m = build()
    export_entity("hollowed", m, Painter(m, materials(), features(), seed=33), previews=POSES)


if __name__ == "__main__":
    main()
