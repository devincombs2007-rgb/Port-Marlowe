"""The Watcher: a tall bark-skinned figure with a pale mask and a crown of dead branches.

Silhouette goal: at 40+ blocks it reads as a dead sapling or snag until it moves; up close the
pale mask, the hollow in its chest and the over-long, many-jointed fingers make it unmistakable.

1.1 rebuild: gaunt bark ribs around a dark chest hollow, a cracked mask with a hinged jaw that
drops when it lunges, branching antler-crown, four jointed twig fingers per hand, root toes,
hanging moss and lichen. Painted at 2x with baked occlusion; the mask has subsurface and
pin-prick emissive eyes for Vibrant Visuals.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model, add_segment
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

BARK = ramp("#100e0c", "#181512", "#211d18", "#2b261f", "#363027", "#423a2f", "#4f4538", "#5d5243")
PALE = ramp("#4f4b45", "#6a655d", "#857f75", "#9e978b", "#b5ae9f", "#c9c2b2", "#dad4c6")
TWIG = ramp("#0f0d0b", "#181410", "#211c16", "#2b241c", "#362d23", "#41362a")
LICHEN = ramp("#20251d", "#2a3125", "#353d2e", "#414a38", "#4e5843")
MOSS = ramp("#1a2216", "#232d1c", "#2d3923", "#38452b", "#445233")
HOLLOW = ramp("#040303", "#080706", "#0d0b09", "#13100d")
SAP = ramp("#3d2a12", "#5e4119", "#87602a", "#b48a46")


def build():
    m = Model("geometry.hollow.watcher", atlas_width=64, visible_bounds=(3, 4, (0, 1.6, 0)))
    m.bone("root", pivot=(0, 0, 0))
    # pelvis + lower spine
    m.bone("body", "root", pivot=(0, 24, 0))
    m.cube("body", (-2.5, 23, -1.5), (5, 3, 3), "bark")                      # pelvis knot
    m.cube("body", (-1.25, 25.5, -1.0), (2.5, 6, 2.2), "bark")              # lower spine, very thin waist
    m.cube("body", (-0.5, 26.5, 0.9), (1, 4, 0.8), "twig")                   # vertebral knobs (back)
    # chest: a cage of bark ribs around a dark hollow
    m.bone("chest", "body", pivot=(0, 31, 0), rotation=(9, 0, 0))
    m.cube("chest", (-3.5, 31, -0.2), (7, 8, 2.2), "bark")                   # back plate
    m.cube("chest", (-1.8, 31.5, -1.4), (3.6, 6, 1.4), "hollow", tag="hollow")  # the hollow (recessed)
    for i, y in enumerate((32.0, 34.0, 36.0)):
        w = 1.9 + i * 0.15                                                    # ribs widen toward the collar
        m.cube("chest", (-1.6 - w, y, -2.2), (w, 1.1, 2.4), "bark")           # ribs either side of the hollow
        m.cube("chest", (1.6, y, -2.2), (w, 1.1, 2.4), "bark")
    m.cube("chest", (-3.9, 37.2, -2.4), (7.8, 2.0, 3.2), "bark")             # collar
    m.cube("chest", (-0.6, 36.0, -2.6), (1.2, 1.2, 0.6), "sap")              # a weeping knot
    # neck: long, forward-leaning, ringed
    m.bone("neck", "chest", pivot=(0, 38.8, -0.6), rotation=(16, 0, 0))
    m.cube("neck", (-0.8, 38.5, -1.4), (1.6, 4.4, 1.6), "bark")
    m.cube("neck", (-1.05, 40.0, -1.65), (2.1, 0.6, 2.1), "twig")
    # head: a narrow skull behind a long pale mask
    m.bone("head", "neck", pivot=(0, 42.6, -0.6), rotation=(-14, 0, 0))
    m.cube("head", (-2.3, 42.5, -2.2), (4.6, 7.5, 4.0), "bark")             # skull
    m.cube("head", (-2.6, 43.4, -3.2), (5.2, 6.8, 1.0), "pale", tag="face")  # mask upper
    m.cube("head", (-3.0, 48.6, -3.7), (6.0, 1.2, 1.3), "twig")             # brow ridge shading the eyes
    # jaw: the lower mask on a hinge; drops open in the lunge
    m.bone("jaw", "head", pivot=(0, 43.6, -1.2))
    m.cube("jaw", (-2.2, 40.0, -3.1), (4.4, 3.6, 0.9), "pale")              # lower mask
    m.cube("jaw", (-0.9, 39.0, -3.0), (1.8, 1.2, 0.8), "pale")              # chin point
    m.cube("jaw", (-1.8, 41.2, -2.3), (3.6, 2.2, 1.2), "hollow")            # dark mouth behind the mask
    # crown of dead branches (antler-like, asymmetric)
    m.bone("crown", "head", pivot=(0, 50, -0.4))
    branches = [
        ((-1.2, 49.8, -0.4), (-3.4, 57.5, 0.2), 1.0, [((-2.7, 54.8, 0.0), (-6.4, 57.4, 0.4), 0.6),
                                                     ((-3.1, 56.4, 0.1), (-2.2, 60.2, -0.6), 0.5)]),
        ((1.2, 49.8, -0.4), (3.0, 59.0, 0.6), 1.0, [((2.4, 53.8, 0.2), (6.6, 56.0, -0.4), 0.6),
                                                   ((2.8, 57.0, 0.5), (4.8, 61.0, 1.2), 0.5),
                                                   ((5.0, 55.4, -0.2), (6.2, 58.2, -1.0), 0.4)]),
        ((0.0, 49.8, 0.6), (-0.6, 55.4, 3.4), 0.8, [((-0.4, 53.4, 2.2), (1.6, 56.6, 3.6), 0.4)]),
        ((-0.6, 49.9, -1.0), (-1.4, 53.0, -2.8), 0.6, []),
    ]
    for p, q, t, subs in branches:
        add_segment(m, "crown", p, q, t, "twig")
        for sp, sq, st in subs:
            add_segment(m, "crown", sp, sq, st, "twig")
    # arms: shoulder knot -> long upper arm -> long forearm -> hand with four jointed twig fingers
    for side, sx in (("right", -1), ("left", 1)):
        sh = (sx * 4.3, 37.6, 0.2)
        m.bone(f"{side}_arm", "chest", pivot=sh, rotation=(2, 0, sx * -10))
        m.cube(f"{side}_arm", (sx * 4.3 - 1.5, 35.6, -1.3), (3.0, 3.0, 2.6), "bark")      # shoulder knot
        m.cube(f"{side}_arm", (sx * 4.3 - 0.8, 24.5, -0.8), (1.6, 12, 1.6), "bark")
        m.cube(f"{side}_arm", (sx * 4.3 - 1.05, 24.0, -1.05), (2.1, 1.6, 2.1), "twig")    # elbow knot
        m.bone(f"{side}_forearm", f"{side}_arm", pivot=(sx * 4.3, 24.8, 0), rotation=(-8, 0, 0))
        m.cube(f"{side}_forearm", (sx * 4.3 - 0.7, 10.5, -0.7), (1.4, 14.5, 1.4), "bark")
        m.cube(f"{side}_forearm", (sx * 4.3 - 0.9, 16.0, -0.9), (1.8, 1.0, 1.8), "twig")  # growth ring
        m.bone(f"{side}_hand", f"{side}_forearm", pivot=(sx * 4.3, 10.6, 0))
        m.cube(f"{side}_hand", (sx * 4.3 - 0.9, 9.0, -1.0), (1.8, 2.0, 2.0), "bark")        # palm knot
        fingers = ((-0.75, -0.7, 8.5, 7), (0.0, -0.85, 10.0, 0), (0.75, -0.6, 9.0, -6), (0.0, 0.8, 6.0, 0))
        for i, (fx, fz, ln, ang) in enumerate(fingers):
            x = sx * 4.3 + fx * sx
            p0 = (x, 9.2, fz)
            mid = (x + sx * ang * 0.03, 9.2 - ln * 0.55, fz - 0.4)
            tip = (x + sx * ang * 0.06, 9.2 - ln, fz - 1.4 + (0.9 if i == 3 else 0))
            add_segment(m, f"{side}_hand", p0, mid, 0.55, "twig")
            add_segment(m, f"{side}_hand", mid, tip, 0.45, "twig")
    # legs: long, thin, slightly back-kneed, ending in spread root toes
    for side, sx in (("right", -1), ("left", 1)):
        m.bone(f"{side}_leg", "root", pivot=(sx * 1.5, 24, 0))
        m.cube(f"{side}_leg", (sx * 1.5 - 1.0, 12.5, -1.0), (2.0, 12, 2.0), "bark")
        m.cube(f"{side}_leg", (sx * 1.5 - 1.3, 12.0, -1.3), (2.6, 1.6, 2.6), "twig")      # knee knot
        m.bone(f"{side}_shin", f"{side}_leg", pivot=(sx * 1.5, 12.8, 0), rotation=(5, 0, 0))
        m.cube(f"{side}_shin", (sx * 1.5 - 0.8, 1.0, -0.8), (1.6, 12, 1.6), "bark")
        m.cube(f"{side}_shin", (sx * 1.5 - 1.1, 0, -1.6), (2.2, 1.2, 2.6), "twig")        # heel
        for dx, dz in ((-1.1, -3.6), (0.0, -4.2), (1.1, -3.4), (0.2, 2.0)):
            add_segment(m, f"{side}_shin", (sx * 1.5, 0.6, -0.4), (sx * 1.5 + dx, 0.15, dz), 0.6, "twig")
    # hanging moss and lichen breaking up the outline
    for side, sx in (("right", -1), ("left", 1)):
        m.cube(f"{side}_arm", (sx * 5.4 - 0.25, 30.0, -0.9), (0.5, 6.0, 0.5), "moss")
        m.cube(f"{side}_arm", (sx * 3.4 - 0.25, 31.5, 0.8), (0.5, 4.5, 0.5), "moss")
        m.cube(f"{side}_forearm", (sx * 4.9 - 0.25, 14.0, 0.2), (0.5, 3.5, 0.5), "moss")
    m.cube("head", (2.0, 44.5, -0.8), (0.5, 6.0, 0.5), "moss")
    m.cube("head", (-2.4, 45.5, 0.6), (0.5, 4.0, 0.5), "moss")
    m.cube("chest", (2.8, 30.0, 1.6), (0.5, 5.0, 0.5), "moss")
    m.locator("head", "eyes", (0, 47.0, -3.3))
    m.locator("body", "core", (0, 30, 0))
    m.locator("chest", "hollow", (0, 34.5, -1.6))
    return m


def materials():
    return {
        "bark": Material(BARK, base=0.5, noise=(0.28, 0.2, 3), streak=(1.6, 0.16, 1.6, 0.36), detail=0.08,
                         fissure=dict(scale=0.55, stretch=(1.0, 0.18, 1.0), threshold=0.965, delta=-0.3),
                         spots=dict(scale=0.22, threshold=0.5, ramp=LICHEN), speckle=(0.06, -0.16),
                         ao=0.25, bevel=0.06, grime=dict(color="#07060a", strength=0.5),
                         mers=(0, 0, 236, 0), height_strength=1.0),
        "pale": Material(PALE, base=0.6, noise=(0.5, 0.16, 2), streak=(0.3, 2.2, 0.3, 0.2), detail=0.06,
                         cells=dict(scale=0.9, mode="crack", edge=0.05, edge_delta=-0.32),
                         speckle=(0.04, -0.2), ao=0.05, edge=0.0, bevel=0.05,
                         grime=dict(color="#2b261f", strength=0.7), mers=(0, 0, 150, 70), height_strength=0.5),
        "moss": Material(MOSS, base=0.45, noise=(0.6, 0.3, 2), ao=0.0, edge=0.0, mers=(0, 0, 250, 120), height_strength=0.4),
        "twig": Material(TWIG, base=0.52, noise=(0.6, 0.22, 2), streak=(2, 0.3, 2, 0.3), detail=0.06,
                         speckle=(0.05, -0.2), ao=0.1, bevel=0.05, mers=(0, 0, 245, 0)),
        "hollow": Material(HOLLOW, base=0.4, noise=(0.8, 0.3, 2), ao=0.0, edge=0.0, speckle=None,
                           mers=(0, 0, 255, 0), height_strength=0.0),
        "sap": Material(SAP, base=0.6, noise=(0.9, 0.3, 2), ao=0.0, edge=0.0, mers=(0, 40, 40, 160), height_strength=0.6),
    }


def features():
    # Mask front is z = -3.2; eye sockets sit under the brow at y ~ 47.
    zf0, zf1 = -3.5, -2.9

    def px(x, y, color, mers=None, height=None, w=0.45, h=0.45):
        return Feature(("box", (x - w, y - h, zf0), (x + w, y + h, zf1)), color=color, mers=mers,
                       faces=["north"], height=height)

    sock = "#050403"
    glint = "#f6efd8"
    tear = "#2e2924"
    return [
        # two tall, slightly uneven eye hollows, each with a single pin of reflected light
        px(-1.2, 47.0, sock, (0, 0, 255, 0), 8, w=0.62, h=1.15), px(1.2, 46.8, sock, (0, 0, 255, 0), 8, w=0.62, h=1.25),
        px(-1.2, 47.3, glint, (0, 235, 60, 0), 150, w=0.3, h=0.3), px(1.2, 47.1, glint, (0, 235, 60, 0), 150, w=0.3, h=0.3),
        # long tear streaks of old sap running down to the jaw
        px(-1.35, 44.9, tear, height=70, w=0.26, h=1.1), px(1.05, 44.6, tear, height=70, w=0.26, h=1.3),
        px(-1.35, 42.6, tear, height=70, w=0.26, h=1.0),
        # a crack running through the mask
        px(0.35, 49.2, "#25211c", height=40, w=0.2, h=0.6), px(0.05, 47.8, "#25211c", height=40, w=0.2, h=0.6),
        px(-0.2, 46.4, "#25211c", height=40, w=0.2, h=0.6), px(-0.05, 44.9, "#25211c", height=40, w=0.2, h=0.6),
        # sap glints in the chest hollow (Weeping Sap)
        Feature(("sphere", (0.6, 33.2, -1.4), 0.55), color="#b48a46", mers=(0, 120, 40, 120), bones=["chest"]),
        Feature(("sphere", (-0.8, 35.0, -1.4), 0.4), color="#87602a", mers=(0, 80, 40, 120), bones=["chest"]),
    ]


POSES = [None, {"right_arm": {"rot": (-20, 0, 0)}, "left_arm": {"rot": (10, 0, 0)}, "head": {"rot": (8, 24, 0)},
                "jaw": {"rot": (22, 0, 0)}, "right_leg": {"rot": (18, 0, 0)}, "left_leg": {"rot": (-18, 0, 0)}}]


def main():
    m = build()
    p = Painter(m, materials(), features(), seed=7, scale=2, ao_rays=28, ao_dist=7.0)
    export_entity("watcher", m, p, previews=POSES)


if __name__ == "__main__":
    main()
