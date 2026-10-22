"""The Children of the Second Sun (2.0, phase 4).

Descendants of the 1960s settlers who refused to leave Varrow Island. Sixty years of exposure
show: blotched, peeling skin, clouded white eyes, too many teeth. They dress in what the test
crews left behind:

  zealot      lead-apron vest over patched fatigues, a mask hammered from an instrument panel with
              two dial-glass eye holes, a bolt-action rifle (shown when aiming), a lamp at the neck
  faithful    a robe stitched from parachute silk (bleached white and orange panels), a hood,
              bare blotched forearms, a hand trowel
  seer        layered robes hung with lamps and dosimeter badges, a blindfold over white eyes,
              very old; carries a staff with a bomb-tower bolt for a head
  hierophant  tall, a cape of parachute silk, a sun-mask of riveted metal plates radiating
              around the face, a revolver

They share Trevor's skeleton, so walking, idling and aiming use the same animations.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

SKIN = ramp("#5a3f34", "#6e4d40", "#83604f", "#977262", "#a98473")
BLOTCH = ramp("#7a3f3a", "#94524a", "#b0726a")
SILK = ramp("#8f8a7c", "#aaa596", "#c4c0b0", "#dcd8c8", "#ece9dc")
SILK_ORANGE = ramp("#7a3a18", "#9a4c20", "#b8622c", "#d07a3a")
LEAD = ramp("#2c2e30", "#3a3d40", "#4a4e52", "#5c6064")
FATIGUE = ramp("#2c2a1e", "#3a3826", "#4a4730", "#5a563a")
METAL = ramp("#3a3530", "#544c42", "#6e6352", "#8a7c66", "#a89880")
RUST = ramp("#4a2410", "#6a3418", "#8a4a22")
LAMP = ramp("#8a5a10", "#d08a20", "#ffc860", "#fff0b0")
GLASS = ramp("#a8b4a0", "#c8d4bc", "#e6eedc")
CLOTH_DARK = ramp("#1e1a16", "#2a241e", "#362e26")
GOLD = ramp("#6a4a10", "#9a7020", "#c89a38", "#e8c060")


def build(kind):
    m = Model(f"geometry.hollow.{kind}", atlas_width=128, visible_bounds=(2.5, 3, (0, 1.2, 0)))
    tall = 1.12 if kind == "hierophant" else (0.94 if kind == "seer" else 1.0)
    top = {"zealot": "fatigue", "faithful": "silk", "seer": "silk", "hierophant": "dark"}[kind]
    legs = {"zealot": "fatigue", "faithful": "silk", "seer": "silk", "hierophant": "dark"}[kind]
    s = lambda v: v * tall  # noqa: E731
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, s(12), 0))
    m.cube("body", (-3.6, s(10.5), -2.1), (7.2, s(2.6), 4.2), legs)
    m.bone("torso", "body", pivot=(0, s(13), 0))
    m.cube("torso", (-3.8, s(13), -2.2), (7.6, s(9.6), 4.4), top)
    m.cube("torso", (-4.2, s(20.2), -2.4), (8.4, s(2.6), 4.8), top)
    if kind == "zealot":
        m.cube("torso", (-3.9, s(13.5), -2.8), (7.8, s(8.6), 0.6), "lead")     # lead apron
        m.cube("torso", (-3.9, s(15), 2.2), (7.8, s(6.5), 0.6), "lead")
        m.cube("torso", (-4.4, s(12.4), -2.6), (8.8, 1.2, 5.2), "dark")       # bandolier belt
        m.cube("torso", (-0.8, s(19.0), -3.4), (1.6, 1.8, 1.0), "lamp")       # lamp at the neck
    elif kind == "faithful":
        m.cube("torso", (-4.0, s(4), -2.4), (8.0, s(9), 4.8), "silk")         # robe skirt
        m.cube("torso", (-4.1, s(14), -2.5), (8.2, s(2), 5.0), "orange")      # silk panel bands
        m.cube("torso", (-4.1, s(6), -2.5), (8.2, s(1.6), 5.0), "orange")
    elif kind == "seer":
        m.cube("torso", (-4.2, s(1), -2.6), (8.4, s(12), 5.2), "silk")
        for k, (x, y) in enumerate(((-2.6, 18), (0.2, 16.5), (2.4, 18.8), (-1.2, 14.2), (1.6, 13.4))):
            m.cube("torso", (x - 0.6, s(y), -3.2), (1.2, 1.6, 0.8), "lamp" if k % 2 == 0 else "badge")
    elif kind == "hierophant":
        m.cube("torso", (-4.6, s(2), 2.2), (9.2, s(20), 1.0), "silk")        # cape
        m.cube("torso", (-4.4, s(2), -2.5), (8.8, s(11), 5.0), "dark")
        m.cube("torso", (-1.2, s(15), -2.9), (2.4, 2.4, 0.6), "gold")        # sun medallion
    m.bone("neck", "torso", pivot=(0, s(22.8), 0))
    m.cube("neck", (-1.3, s(22.4), -1.3), (2.6, 1.8, 2.6), "skin")
    m.bone("head", "neck", pivot=(0, s(24), 0))
    hy = s(24)
    m.cube("head", (-3.2, hy, -3.4), (6.4, 7.4, 6.6), "skin")
    if kind == "zealot":
        m.cube("head", (-3.5, hy + 0.6, -3.9), (7.0, 6.2, 0.7), "metal")      # instrument-panel mask
        m.cube("head", (-3.6, hy + 5.0, -3.6), (7.2, 3.0, 7.2), "dark")       # wrapped head cloth
    elif kind in ("faithful", "seer"):
        m.cube("head", (-3.6, hy + 1.0, -3.6), (7.2, 7.0, 7.4), "silk", inflate=0.15)   # hood
        m.cube("head", (-3.2, hy + 5.0, -3.9), (6.4, 1.2, 0.4), "silk") if kind == "faithful" else \
            m.cube("head", (-3.4, hy + 3.4, -3.8), (6.8, 1.6, 0.5), "dark")  # seer's blindfold
    elif kind == "hierophant":
        m.cube("head", (-3.5, hy + 0.4, -3.9), (7.0, 6.6, 0.7), "gold")       # sun mask
        for a in range(12):
            ang = math.radians(a * 30)
            cx, cy = math.cos(ang) * 6.0, hy + 3.7 + math.sin(ang) * 6.0
            m.cube("head", (cx - 0.7, cy - 1.6, -3.7), (1.4, 3.2, 0.4), "gold",
                   pivot=(cx, cy, -3.5), rotation=(0, 0, a * 30 - 90))
    for side, sx in (("right", -1), ("left", 1)):
        arm, fore, hand = f"{side}_arm", f"{side}_forearm", f"{side}_hand"
        m.bone(arm, "torso", pivot=(sx * 4.6, s(21.4), 0))
        m.cube(arm, (sx * 4.6 - 1.4, s(15.8), -1.4), (2.8, s(6.4), 2.8), top)
        m.bone(fore, arm, pivot=(sx * 4.6, s(16.2), 0))
        m.cube(fore, (sx * 4.6 - 1.25, s(11.0), -1.25), (2.5, s(5.6), 2.5), "skin" if kind == "faithful" else top)
        m.bone(hand, fore, pivot=(sx * 4.6, s(11.0), 0))
        m.cube(hand, (sx * 4.6 - 1.05, s(11.0) - 3.0, -1.2), (2.1, 3.1, 2.4), "skin")
    for side, sx in (("right", -1), ("left", 1)):
        leg, shin = f"{side}_leg", f"{side}_shin"
        m.bone(leg, "body", pivot=(sx * 1.85, s(11.0), 0))
        m.cube(leg, (sx * 1.85 - 1.6, s(5.6), -1.6), (3.2, s(5.8), 3.2), legs)
        m.bone(shin, leg, pivot=(sx * 1.85, s(5.8), 0))
        m.cube(shin, (sx * 1.85 - 1.45, 2.0, -1.45), (2.9, s(5.8) - 2.0, 2.9), legs)
        m.cube(shin, (sx * 1.85 - 1.55, 0.0, -2.6), (3.1, 2.4, 4.3), "dark")
    # weapons carried along the arm (see trevor.py): shown only while aiming
    if kind in ("zealot", "hierophant"):
        m.bone("gun", "right_hand", pivot=(-4.6, s(9), 0))
        hy2 = s(11.0) - 3.0
        if kind == "zealot":
            m.cube("gun", (-5.1, hy2 + 0.2, -0.4), (1.0, 1.3, 2.6), "wood")                 # grip
            m.cube("gun", (-5.15, hy2 - 10.0, -1.7), (1.1, 10.4, 1.4), "metal")            # barrel, long
            m.cube("gun", (-5.2, hy2 - 3.0, -1.9), (1.2, 4.0, 1.8), "wood")                # fore-stock
            m.cube("gun", (-5.2, hy2 + 1.2, -1.2), (1.2, 1.4, 6.0), "wood")                # butt to the shoulder
        else:
            m.cube("gun", (-5.1, hy2 + 0.2, -0.4), (1.0, 1.3, 2.6), "wood")
            m.cube("gun", (-5.15, hy2 - 4.4, -1.7), (1.1, 5.0, 1.3), "metal")
    if kind == "seer":
        m.bone("staff", "right_hand", pivot=(-4.6, s(9), 0))
        m.cube("staff", (-5.1, -1.0, -1.6), (0.9, s(24), 0.9), "wood")
        m.cube("staff", (-5.5, s(22.5), -2.0), (1.7, 2.2, 1.7), "metal")
    if kind == "faithful":
        m.bone("tool", "right_hand", pivot=(-4.6, s(9), 0))
        m.cube("tool", (-5.0, s(11) - 7.5, -1.0), (0.8, 4.5, 0.8), "wood")
        m.cube("tool", (-5.3, s(11) - 9.5, -1.3), (1.4, 2.2, 0.4), "metal")
    m.locator("head", "mouth", (0, hy + 1.2, -3.6))
    return m


def materials():
    cloth = dict(base=0.5, noise=(0.5, 0.25, 3), speckle=(0.07, 0.12), detail=0.08,
                 fissure=dict(scale=1.0, stretch=(0.25, 1.0, 0.25), threshold=0.982, delta=-0.2),
                 grime=dict(color="#2a2016", strength=0.45), ao=0.22, bevel=0.04, mers=(0, 0, 238, 40), height_strength=0.8)
    return {
        "skin": Material(SKIN, base=0.55, noise=(0.6, 0.18, 2), speckle=(0.08, -0.15), ao=0.18,
                         spots=dict(scale=0.55, threshold=0.45, ramp=BLOTCH), grime=dict(color="#3a241c", strength=0.3),
                         bevel=0.04, mers=(0, 0, 175, 160), height_strength=0.5),
        "silk": Material(SILK, **{**cloth, "grime": dict(color="#5a4a36", strength=0.5)}),
        "orange": Material(SILK_ORANGE, **cloth),
        "fatigue": Material(FATIGUE, **cloth),
        "dark": Material(CLOTH_DARK, **cloth),
        "lead": Material(LEAD, base=0.55, noise=(0.5, 0.15, 2), speckle=(0.05, 0.12), ao=0.15, bevel=0.06,
                         grime=dict(color="#1a1a18", strength=0.4), mers=(160, 0, 120, 0), height_strength=0.4),
        "metal": Material(METAL, base=0.55, noise=(0.6, 0.2, 2), speckle=(0.1, -0.2), ao=0.12, bevel=0.08,
                          spots=dict(scale=0.7, threshold=0.5, ramp=RUST), mers=(170, 0, 120, 0), height_strength=0.5),
        "gold": Material(GOLD, base=0.6, noise=(0.6, 0.15, 2), speckle=(0.05, -0.2), ao=0.1, bevel=0.08,
                         spots=dict(scale=0.8, threshold=0.6, ramp=RUST), mers=(220, 20, 70, 0), height_strength=0.5),
        "lamp": Material(LAMP, base=0.75, noise=(1.0, 0.1, 1), ao=0.0, edge=0.0, mers=(0, 200, 60, 0)),
        "badge": Material(ramp("#8a6a10", "#b38c1c", "#d9b23a"), base=0.6, noise=(1.0, 0.1, 1), ao=0.0, mers=(0, 0, 80, 0)),
        "wood": Material(ramp("#3a2414", "#4e321c", "#664226"), base=0.5, noise=(0.6, 0.2, 2), streak=(0.2, 2.0, 0.2, 0.3),
                         ao=0.1, mers=(0, 0, 200, 0)),
    }


def features(kind):
    hy = 24 * (1.12 if kind == "hierophant" else (0.94 if kind == "seer" else 1.0))
    z0, z1 = -3.7, -3.3
    out = []

    def face(x0, y0, x1, y1, color, h=None, zz=(z0, z1)):
        return Feature(("box", (x0, hy + y0, zz[0]), (x1, hy + y1, zz[1])), color=color, faces=["north"], height=h)
    if kind == "zealot":
        # dial-glass eye holes in the mask, rivets, a painted sun
        zz = (-4.0, -3.8)
        out += [face(-2.6, 3.2, -0.8, 4.8, "#c8d4bc", zz=zz), face(0.8, 3.2, 2.6, 4.8, "#c8d4bc", zz=zz),
                face(-2.0, 3.6, -1.4, 4.4, "#2a2a28", zz=zz), face(1.4, 3.6, 2.0, 4.4, "#2a2a28", zz=zz),
                face(-0.6, 1.2, 0.6, 2.4, "#d9a030", zz=zz)]
    elif kind == "faithful":
        # clouded white eyes and too many teeth in a thin smile
        out += [face(-2.3, 3.4, -1.1, 4.1, "#e8e8e0"), face(1.1, 3.4, 2.3, 4.1, "#e8e8e0"),
                face(-1.9, 3.5, -1.5, 4.0, "#b8c0c0"), face(1.5, 3.5, 1.9, 4.0, "#b8c0c0"),
                face(-1.8, 1.4, 1.8, 2.0, "#e0d8c0"), face(-1.8, 1.55, 1.8, 1.85, "#3a1814")]
    elif kind == "seer":
        out += [face(-1.6, 1.2, 1.6, 1.8, "#e0d8c0"), face(-1.6, 1.35, 1.6, 1.65, "#3a1814")]
    else:
        zz = (-4.0, -3.8)
        out += [face(-2.4, 3.4, -0.9, 4.2, "#101010", zz=zz), face(0.9, 3.4, 2.4, 4.2, "#101010", zz=zz),
                face(-1.4, 1.2, 1.4, 1.8, "#101010", zz=zz)]
    return out


AIM = {"right_arm": {"rot": (-84, 0, -4)}, "right_forearm": {"rot": (-6, 0, 0)}, "left_arm": {"rot": (-72, 0, 30)},
       "left_forearm": {"rot": (-24, 0, 0)}}


def main():
    for i, kind in enumerate(("zealot", "faithful", "seer", "hierophant")):
        m = build(kind)
        export_entity(kind, m, Painter(m, materials(), features(kind), seed=90 + i, scale=2, ao_rays=20, ao_dist=5.0),
                      previews=[None, AIM])


if __name__ == "__main__":
    main()
