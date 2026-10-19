"""The Borrowed: a sheep that is not a sheep.

Disguised it passes at a glance (original geometry, sheep proportions, legs a touch too long,
head carried a touch too low). Its true form is built in: the head is two halves that hinge open
around a pale inner skull, and three spines lie folded flat under the wool. Animations scale the
hidden parts from 0 when revealed.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

WOOL = ramp("#8f8b82", "#a8a49a", "#bfbbb1", "#d2cec5", "#e2dfd7", "#eeebe5")
WOOL_WRONG = ramp("#7d7f76", "#94968b", "#a9aa9f")
SKIN = ramp("#5e4a3d", "#735b4b", "#8a6e5b", "#a0836d", "#b59a83")
HOOF = ramp("#231d18", "#2f2721", "#3c322a")
FLESH = ramp("#5c2f2b", "#7a3c36", "#9b5048", "#b86a5f", "#d08b7e")
BONE = ramp("#9f9583", "#b8ad98", "#d0c6b0", "#e6ddc8")
MOUTH = ramp("#1a0d0c", "#2a1311", "#3d1b18")


def build():
    m = Model("geometry.hollow.borrowed", atlas_width=128, visible_bounds=(2, 2, (0, 0.8, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, 19, 2))
    m.cube("body", (-4, 13, -7), (8, 7, 15), "skin")          # torso under the wool
    m.cube("body", (-5, 12.5, -7.5), (10, 8, 16), "wool")     # wool shell
    m.cube("body", (-3.5, 20.5, -5), (7, 1, 10), "wool")      # wool crest
    # folded spines (true form) - flat under the wool until revealed
    m.bone("spines", "body", pivot=(0, 20, 0))
    for i, z in enumerate((-4, 0, 4)):
        m.cube("spines", (-0.5, 20, z - 0.5), (1, 9 - i, 1), "bone", pivot=(0, 20, z), rotation=(0, 0, (-1) ** i * 12))
    # neck + head halves
    m.bone("neck", "body", pivot=(0, 18, -7))
    m.cube("neck", (-3, 14.5, -11.5), (6, 6, 5.5), "wool")
    m.bone("head", "neck", pivot=(0, 18, -9), rotation=(16, 0, 0))
    m.bone("head_l", "head", pivot=(0, 18, -9))
    m.bone("head_r", "head", pivot=(0, 18, -9))
    m.cube("head_l", (0, 14, -15.5), (3, 6, 7), "skin")
    m.cube("head_r", (-3, 14, -15.5), (3, 6, 7), "skin")
    m.cube("head_l", (0, 19.5, -14.5), (3.5, 2, 5.5), "wool")   # wool cap halves
    m.cube("head_r", (-3.5, 19.5, -14.5), (3.5, 2, 5.5), "wool")
    m.cube("head_l", (3, 18, -12), (2, 1, 3), "skin", pivot=(3, 18.5, -10.5), rotation=(0, 0, -20))  # ears
    m.cube("head_r", (-5, 18, -12), (2, 1, 3), "skin", pivot=(-3, 18.5, -10.5), rotation=(0, 0, 20))
    # the inner skull: long, pale, toothed - scaled to 0 while disguised
    m.bone("inner", "head", pivot=(0, 17, -10))
    m.cube("inner", (-1.5, 14.5, -20), (3, 4, 10), "bone")
    m.cube("inner", (-1.5, 13.5, -19.5), (3, 1, 8), "mouth")
    for i in range(4):
        m.cube("inner", (-1.2 + i * 0.8, 13.0, -19 + i * 0.4), (0.4, 1.2, 0.4), "bone")
    # legs: a little long for a sheep
    for name, x, z in (("leg_fl", -2.6, -5.0), ("leg_fr", 2.6, -5.0), ("leg_bl", -2.6, 5.5), ("leg_br", 2.6, 5.5)):
        m.bone(name, "root", pivot=(x, 13, z))
        m.cube(name, (x - 1.5, 1, z - 1.5), (3, 12.5, 3), "skin")
        m.cube(name, (x - 1.7, 0, z - 1.7), (3.4, 1.2, 3.4), "hoof")
        m.cube(name, (x - 2, 9, z - 2), (4, 4.5, 4), "wool")  # wool tufts at the top of the legs
    m.locator("head", "eyes", (0, 18, -16))
    return m


def materials(revealed=False):
    wool = Material(WOOL, base=0.62, noise=(0.55, 0.28, 3), speckle=(0.1, -0.15), ao=0.25,
                    spots=dict(scale=0.35, threshold=0.62, ramp=WOOL_WRONG), mers=(0, 0, 250, 90), height_strength=1.0, edge=0.04)
    if revealed:
        wool = Material(WOOL, base=0.5, noise=(0.55, 0.35, 3), speckle=(0.12, -0.25), ao=0.25,
                        spots=dict(scale=0.3, threshold=0.25, ramp=FLESH), mers=(0, 0, 200, 140), height_strength=1.0)
    return {
        "wool": wool,
        "skin": Material(SKIN, base=0.5, noise=(0.6, 0.18, 2), speckle=(0.05, -0.15), ao=0.2, mers=(0, 0, 210, 110)),
        "hoof": Material(HOOF, base=0.5, noise=(0.8, 0.2, 1), mers=(0, 0, 160, 0)),
        "bone": Material(BONE, base=0.6, noise=(0.7, 0.2, 2), speckle=(0.08, -0.25), mers=(0, 0, 150, 40)),
        "mouth": Material(MOUTH, base=0.4, noise=(1.0, 0.2, 1), mers=(0, 0, 90, 160), ao=0.0, edge=0.0),
    }


def features():
    z0, z1 = -15.9, -15.1

    def px(x, y, color, mers=None):
        return Feature(("box", (x - 0.45, y - 0.45, z0), (x + 0.45, y + 0.45, z1)), color=color, mers=mers, faces=["north"])

    eye = "#c9c4a0"
    return [
        # eyes on the sides of the face, as a sheep's are - with a faint eyeshine (glow layer, night only)
        Feature(("box", (2.9, 17.0, -14.6), (3.2, 17.9, -13.6)), color=eye, mers=(0, 150, 60, 0), faces=["east"]),
        Feature(("box", (-3.2, 17.0, -14.6), (-2.9, 17.9, -13.6)), color=eye, mers=(0, 150, 60, 0), faces=["west"]),
        Feature(("box", (2.9, 17.0, -13.6), (3.2, 17.9, -12.6)), color="#141010", faces=["east"]),
        Feature(("box", (-3.2, 17.0, -13.6), (-2.9, 17.9, -12.6)), color="#141010", faces=["west"]),
        # nose + a mouth line that is just slightly too long
        px(-0.5, 15.5, "#3a2a22"), px(0.5, 15.5, "#3a2a22"),
        px(-1.5, 14.5, "#4a372d"), px(-0.5, 14.5, "#2a1d18"), px(0.5, 14.5, "#2a1d18"), px(1.5, 14.5, "#4a372d"),
        # the inner skull's eyes: small black pits (only visible when revealed)
        Feature(("box", (-1.6, 17.0, -19.0), (-1.4, 17.9, -18.0)), color="#050303", faces=["west"]),
        Feature(("box", (1.4, 17.0, -19.0), (1.6, 17.9, -18.0)), color="#050303", faces=["east"]),
    ]


REVEAL = {"head_l": {"rot": (0, -38, 0)}, "head_r": {"rot": (0, 38, 0)}, "neck": {"pos": (0, 3, -3)},
          "inner": {"scale": 1.0}, "spines": {"rot": (0, 0, 0)}}
DISGUISE = {"inner": {"scale": 0.0}, "spines": {"scale": 0.0}}


def main():
    m = build()
    export_entity("borrowed", m, Painter(m, materials(), features(), seed=21), previews=[DISGUISE, REVEAL])
    # revealed texture variant (raw, flayed wool) shares the geometry
    from hollowkit.paint import save_rgba, save_l
    from hollowkit import RP
    import json
    color, mers, height = Painter(m, materials(revealed=True), features(), seed=21).paint()
    d = os.path.join(RP, "textures", "entity", "hollow")
    save_rgba(color, os.path.join(d, "borrowed_true.png"))
    save_rgba(mers, os.path.join(d, "borrowed_true_mers.png"))
    save_l(height, os.path.join(d, "borrowed_true_height.png"))
    with open(os.path.join(d, "borrowed_true.texture_set.json"), "w") as f:
        json.dump({"format_version": "1.21.30", "minecraft:texture_set": {
            "color": "borrowed_true", "metalness_emissive_roughness_subsurface": "borrowed_true_mers",
            "heightmap": "borrowed_true_height"}}, f, indent=2)


if __name__ == "__main__":
    main()
