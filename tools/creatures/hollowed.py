"""The Hollowed: a blind cave predator that hunts by sound.

Low, pale and eyeless. 1.1 rebuild: an arched, starved body with ribs showing through
translucent skin, a long neck for its listening sweeps, a long skull with sealed-over eye pits,
nostril slits and needle teeth top and bottom, whisker feelers, glowing echo-sacs under the
throat, high spider-like elbows ending in long three-fingered hands, and a segmented tail.
Painted at 2x with baked occlusion, visible veins and wet, subsurface-scattering skin.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model, add_segment
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

SKIN = ramp("#3d4248", "#4e545a", "#62686e", "#777d82", "#8d9396", "#a3a8aa", "#b8bcbc", "#cacdcb")
MOTTLE = ramp("#353a40", "#41464c", "#4d5257")
VEIN = ramp("#4a4c5c", "#55576a", "#626476")
FLUSH = ramp("#6b5f66", "#7d6f75", "#8f8086")
MOUTH = ramp("#0e0909", "#1a0f0f", "#2a1715", "#3a201d")
GUM = ramp("#2c1616", "#3a1d1c", "#472524")
TOOTH = ramp("#9e9682", "#b9b19c", "#d3ccb6", "#e9e3cf")
SAC = ramp("#4f7378", "#6f969b", "#9fc6c8", "#d4f0ef")
CLAW = ramp("#151413", "#201e1c", "#2c2926", "#3b3733")


def build():
    m = Model("geometry.hollow.hollowed", atlas_width=128, visible_bounds=(2.5, 1.5, (0, 0.6, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, 10, 2))
    m.cube("body", (-3.0, 8.2, -5.5), (6, 4.8, 8.5), "skin")              # ribcage core
    m.cube("body", (-2.0, 8.4, 3.0), (4, 3.6, 7.5), "skin")               # thin waist + pelvis
    m.cube("body", (-2.8, 9.0, 8.0), (5.6, 3.4, 3.4), "skin")             # haunch
    for i, z in enumerate((-4.6, -2.8, -1.0, 0.8, 2.4)):                  # ribs standing out on both flanks
        ln = 4.4 - abs(i - 1.5) * 0.5
        m.cube("body", (-3.5, 12.6 - ln, z), (0.7, ln, 0.9), "skin")
        m.cube("body", (2.8, 12.6 - ln, z), (0.7, ln, 0.9), "skin")
    for z in (-5.0, -3.0, -1.0, 1.0, 3.0, 5.0, 7.0, 9.0):                 # vertebrae along the arched spine
        h = 13.2 if z < 3 else (12.6 if z < 7 else 12.2)
        m.cube("body", (-0.6, h - 0.4, z - 0.6), (1.2, 1.2, 1.2), "skin")
    # tail: three segments for a slow sway
    m.bone("tail", "body", pivot=(0, 10.6, 11))
    add_segment(m, "tail", (0, 10.6, 11), (0, 9.2, 16), 1.6, "skin")
    m.bone("tail2", "tail", pivot=(0, 9.2, 16))
    add_segment(m, "tail2", (0, 9.2, 16), (0, 7.0, 20.5), 1.1, "skin")
    m.bone("tail3", "tail2", pivot=(0, 7.0, 20.5))
    add_segment(m, "tail3", (0, 7.0, 20.5), (0, 4.6, 24.0), 0.7, "skin")
    # neck: long, so the head can sweep while the body stays still
    m.bone("neck", "body", pivot=(0, 11, -5))
    add_segment(m, "neck", (0, 11, -5), (0, 11.2, -9.5), 2.6, "skin")
    m.bone("head", "neck", pivot=(0, 11.2, -9.5))
    m.cube("head", (-2.2, 10.0, -16.5), (4.4, 3.4, 7.5), "skin")          # long skull
    m.cube("head", (-1.5, 9.6, -19.8), (3.0, 2.6, 3.4), "skin")           # narrow snout
    m.cube("head", (-2.6, 10.4, -14.6), (0.6, 2.4, 3.2), "skin")          # sealed eye pits (cheek ridges)
    m.cube("head", (2.0, 10.4, -14.6), (0.6, 2.4, 3.2), "skin")
    m.cube("head", (-1.6, 13.2, -15.5), (3.2, 0.8, 5.0), "skin")          # brow crest
    m.cube("head", (-1.3, 9.2, -18.6), (2.6, 0.6, 5.6), "gum")            # upper gum (hidden until it gapes)
    for i in range(6):                                                     # needle teeth hanging outside the jaw
        for sx in (-1, 1):
            ln = 1.7 - (i % 2) * 0.45
            m.cube("head", (sx * 1.62 - 0.19, 9.8 - ln * 0.55, -19.3 + i * 1.05), (0.38, ln * 0.55, 0.38), "tooth")
            m.cube("head", (sx * 1.62 - 0.11, 9.8 - ln, -19.22 + i * 1.05), (0.22, ln * 0.45, 0.22), "tooth")
    m.bone("jaw", "head", pivot=(0, 9.6, -11))
    m.cube("jaw", (-1.4, 8.0, -19.4), (2.8, 1.3, 8.2), "skin")
    m.cube("jaw", (-1.1, 9.15, -19.0), (2.2, 0.4, 7.4), "mouth")
    for i in range(6):                                                     # lower needle teeth
        for sx in (-1, 1):
            m.cube("jaw", (sx * 0.85 - 0.2, 9.2, -18.8 + i * 1.1), (0.4, 1.2, 0.4), "tooth")
    # echo-sacs: paired, glowing, under the throat
    m.bone("throat", "head", pivot=(0, 9.0, -12))
    m.cube("throat", (-2.2, 7.4, -13.4), (2.0, 1.8, 2.4), "sac")
    m.cube("throat", (0.2, 7.4, -13.4), (2.0, 1.8, 2.4), "sac")
    m.cube("throat", (-1.0, 7.0, -11.6), (2.0, 1.4, 1.8), "sac")
    for side, sx in (("feeler_l", 1), ("feeler_r", -1)):
        m.bone(side, "head", pivot=(sx * 1.4, 11.4, -19.2))
        add_segment(m, side, (sx * 1.4, 11.4, -19.2), (sx * 3.2, 10.6, -22.5), 0.45, "skin")
        add_segment(m, side, (sx * 3.2, 10.6, -22.5), (sx * 4.4, 8.6, -25.5), 0.35, "skin")
    # limbs: shoulder -> high elbow -> wrist, then three long fingers
    limbs = {
        "leg_fl": ((2.8, 11.6, -3.8), (9.8, 17.5, -6.5), (7.4, 0.8, -10.0)),
        "leg_fr": ((-2.8, 11.6, -3.8), (-9.8, 17.5, -6.5), (-7.4, 0.8, -10.0)),
        "leg_bl": ((2.4, 11.0, 7.5), (8.6, 15.4, 10.0), (6.6, 0.8, 13.0)),
        "leg_br": ((-2.4, 11.0, 7.5), (-8.6, 15.4, 10.0), (-6.6, 0.8, 13.0)),
    }
    for name, (s, e, f) in limbs.items():
        m.bone(name, "body", pivot=s)
        add_segment(m, name, s, e, 1.7, "skin")
        m.cube(name, (e[0] - 1.0, e[1] - 1.0, e[2] - 1.0), (2.0, 2.0, 2.0), "skin")    # knobbed elbow
        m.bone(name + "_lower", name, pivot=e)
        add_segment(m, name + "_lower", e, (f[0], f[1] + 0.6, f[2]), 1.15, "skin")
        sx = 1 if f[0] > 0 else -1
        fwd = -1 if f[2] < 0 else 1
        for dx, dz in ((-1.2, -1.8), (0.0, -2.4), (1.2, -1.6)):
            tip = (f[0] + dx * sx, 0.1, f[2] + dz if fwd < 0 else f[2] + dz * 0.8)
            mid = ((f[0] + tip[0]) / 2, 0.9, (f[2] + tip[2]) / 2)
            add_segment(m, name + "_lower", (f[0], f[1] + 0.6, f[2]), mid, 0.5, "skin")
            add_segment(m, name + "_lower", mid, tip, 0.4, "claw")
    m.locator("head", "mouth", (0, 9.5, -19))
    return m


def materials():
    skin = Material(SKIN, base=0.6, noise=(0.4, 0.2, 3), detail=0.07, speckle=(0.05, -0.18), ao=0.2,
                    spots=dict(scale=0.38, threshold=0.52, ramp=MOTTLE),
                    veins=dict(scale=0.22, threshold=0.982, ramp=VEIN, mers=(0, 0, 120, 230), height=30),
                    grime=dict(color="#1b1d22", strength=0.5), wet=70, bevel=0.05,
                    mers=(0, 0, 135, 200), rough_var=30, height_strength=0.7)
    return {
        "skin": skin,
        "gum": Material(GUM, base=0.5, noise=(0.9, 0.25, 1), ao=0.0, edge=0.0, mers=(0, 0, 60, 200)),
        "mouth": Material(MOUTH, base=0.4, noise=(1.0, 0.2, 1), mers=(0, 0, 60, 120), ao=0.0, edge=0.0),
        "tooth": Material(TOOTH, base=0.65, noise=(1.0, 0.2, 1), mers=(0, 0, 70, 40), ao=0.0, edge=0.0),
        "sac": Material(SAC, base=0.7, noise=(0.9, 0.25, 1), veins=dict(scale=0.8, threshold=0.95, ramp=SAC[:2]),
                        mers=(0, 140, 40, 230), ao=0.0, edge=0.0, height_strength=0.3),
        "claw": Material(CLAW, base=0.5, noise=(1.0, 0.2, 1), mers=(0, 0, 90, 0), ao=0.0),
    }


def features():
    return [
        # sealed eye pits: puckered scar on the cheek ridges
        Feature(("box", (-2.9, 11.0, -14.0), (-2.5, 12.2, -12.0)), color="#3c4045", faces=["west"], height=40),
        Feature(("box", (2.5, 11.0, -14.0), (2.9, 12.2, -12.0)), color="#3c4045", faces=["east"], height=40),
        Feature(("box", (-2.9, 11.4, -13.6), (-2.5, 11.8, -12.4)), color="#2a2d31", faces=["west"], height=20),
        Feature(("box", (2.5, 11.4, -13.6), (2.9, 11.8, -12.4)), color="#2a2d31", faces=["east"], height=20),
        # nostril slits on top of the snout
        Feature(("box", (-1.0, 12.0, -19.4), (-0.5, 12.4, -18.2)), color="#1d1f22", faces=["up"], height=10),
        Feature(("box", (0.5, 12.0, -19.4), (1.0, 12.4, -18.2)), color="#1d1f22", faces=["up"], height=10),
        # a flush of pink where the skin is thinnest (throat, armpits)
        Feature(("box", (-2.6, 8.0, -6.0), (2.6, 9.0, -1.0)), material="flush", faces=["down"]),
    ]


POSES = [None, {"jaw": {"rot": (32, 0, 0)}, "head": {"rot": (-16, 0, 0)}, "neck": {"rot": (-8, 0, 0)},
                "body": {"rot": (-8, 0, 0)}, "leg_fl": {"rot": (-25, 0, 0)}, "leg_fr": {"rot": (-25, 0, 0)},
                "throat": {"scale": 1.25}}]


def main():
    m = build()
    mats = materials()
    mats["flush"] = Material(FLUSH, base=0.5, noise=(0.6, 0.2, 2), mers=(0, 0, 120, 230), ao=0.0, edge=0.0)
    p = Painter(m, mats, features(), seed=33, scale=2, ao_rays=28, ao_dist=6.0)
    export_entity("hollowed", m, p, previews=POSES)


if __name__ == "__main__":
    main()
