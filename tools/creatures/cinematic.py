"""Set pieces for the 1957 flashback and the 2026 shoot-down (2.0, phase 2).

  hollow:bomber          a four-engine 1950s bomber in natural metal, props that spin, bomb-bay doors
  hollow:bomb            the device: a fat, finned bomb, olive drab with yellow bands
  hollow:helicopter      the charter helicopter in flight (white with a red band), rotors turning
  hollow:mushroom_cloud  the airburst: fireball, rising stem, cap, condensation ring and the shock
                         wave racing out across the water; its animation is the whole event
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

ALU = ramp("#5c6166", "#767c82", "#90979d", "#aab1b6", "#c4cacd", "#dde2e4")
GLASS = ramp("#121a20", "#1d2a33", "#2f4452", "#4a6676")
OLIVE = ramp("#2c3020", "#3a3f2a", "#4a5035", "#5a6141")
BAND = ramp("#8a6a10", "#b38c1c", "#d9b23a")
PROP = ramp("#141414", "#1e1e1e", "#2a2a2a")
WHITE = ramp("#9aa0a4", "#b9bec1", "#d3d7d8", "#e8ebeb")
RED = ramp("#5a1410", "#7a1c16", "#9a261e")
FIRE = ramp("#7a1e04", "#b83a08", "#e8660e", "#ff9a28", "#ffd060", "#fff2b0")
SMOKE = ramp("#2a2420", "#3e3630", "#544a42", "#6a5e54", "#82766a")
CAP = ramp("#5a2a10", "#7c3c16", "#9e5622", "#c07a3a", "#d89a5c")
RING = ramp("#b8bcc0", "#d4d8da", "#eceeef")


def bomber():
    m = Model("geometry.hollow.bomber", atlas_width=512, visible_bounds=(18, 6, (0, 1.5, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, 16, 0))
    m.cube("body", (-7, 10, -70), (14, 13, 140), "alu")                     # fuselage
    m.cube("body", (-6, 11, -82), (12, 11, 12), "glass")                    # glazed nose
    m.cube("body", (-5, 12, -86), (10, 9, 4), "glass")
    m.cube("body", (-5, 12, 70), (10, 10, 18), "alu")                       # tail cone
    m.cube("body", (-4, 13, 88), (8, 7, 6), "glass")                        # tail gunner
    m.cube("body", (-1.5, 22, 50), (3, 34, 30), "alu")                      # fin
    m.cube("body", (-48, 15, 66), (96, 2, 16), "alu")                       # tailplane
    m.cube("body", (-3, 22, -40), (6, 4, 8), "glass")                       # top turret
    m.cube("body", (-115, 15, -12), (230, 3, 26), "alu")                    # wing
    m.cube("body", (-115, 15.5, -12), (230, 2, 1), "alu", inflate=0.2)
    m.bone("doors", "body", pivot=(0, 10, -5))
    m.bone("door_l", "doors", pivot=(-6, 10, -5))
    m.cube("door_l", (-6, 9.5, -16), (6, 1, 22), "alu")
    m.bone("door_r", "doors", pivot=(6, 10, -5))
    m.cube("door_r", (0, 9.5, -16), (6, 1, 22), "alu")
    for i, x in enumerate((-80, -40, 40, 80)):
        m.cube("body", (x - 5, 10, -22), (10, 10, 30), "alu")               # nacelle
        m.bone(f"prop{i}", "body", pivot=(x, 15, -23))
        m.cube(f"prop{i}", (x - 1.5, 13.5, -25), (3, 3, 3), "prop")          # spinner
        m.cube(f"prop{i}", (x - 1, 15, -24), (2, 13, 0.8), "prop")
        m.cube(f"prop{i}", (x - 1, 2, -24), (2, 13, 0.8), "prop")
        m.cube(f"prop{i}", (x - 13, 14, -24), (12, 2, 0.8), "prop")
        m.cube(f"prop{i}", (x + 1, 14, -24), (12, 2, 0.8), "prop")
    m.locator("body", "bay", (0, 9, -5))
    return m


def bomber_mats():
    return {
        "alu": Material(ALU, base=0.62, noise=(0.25, 0.12, 2), streak=(3.0, 0.2, 0.2, 0.15), speckle=(0.03, -0.1), ao=0.12,
                        bevel=0.04, mers=(210, 0, 70, 0), height_strength=0.2),
        "glass": Material(GLASS, base=0.5, noise=(1.0, 0.1, 1), ao=0.0, edge=0.0, mers=(60, 0, 20, 0)),
        "prop": Material(PROP, base=0.5, noise=(1.0, 0.1, 1), ao=0.0, mers=(120, 0, 90, 0)),
    }


def bomber_features():
    star = []
    for side in (-1, 1):
        x = side * 85
        star.append(Feature(("box", (x - 6, 17.9, -9), (x + 6, 18.2, 3)), color="#24345a", faces=["up"]))
        star.append(Feature(("box", (x - 2.5, 18.0, -5.5), (x + 2.5, 18.3, -0.5)), color="#e8eaec", faces=["up"]))
    star.append(Feature(("box", (-7.2, 13, 20), (-6.8, 20, 32)), color="#24345a", faces=["west"]))
    star.append(Feature(("box", (6.8, 13, 20), (7.2, 20, 32)), color="#24345a", faces=["east"]))
    return star


def bomb():
    m = Model("geometry.hollow.bomb", atlas_width=128, visible_bounds=(3, 3, (0, 1, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, 8, 0))
    m.cube("body", (-7, 1, -12), (14, 14, 20), "olive")
    m.cube("body", (-6, 2, -16), (12, 12, 4), "olive")
    m.cube("body", (-4, 4, -18), (8, 8, 2), "olive")
    m.cube("body", (-5, 3, 8), (10, 10, 6), "olive")
    m.cube("body", (-3, 5, 14), (6, 6, 6), "olive")
    m.cube("body", (-7.2, 1, -2), (14.4, 14.4, 1.5), "band")
    m.cube("body", (-7.2, 1, 4), (14.4, 14.4, 1.5), "band")
    for (x, y, w, h) in ((-9, 7.5, 18, 1), (-0.5, -1, 1, 18)):
        m.cube("body", (x, y, 16), (w, h, 8), "olive")                    # box tail fins
    return m


def helicopter():
    m = Model("geometry.hollow.helicopter", atlas_width=512, visible_bounds=(16, 6, (0, 2, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, 24, 0))
    m.cube("body", (-18, 6, -60), (36, 34, 80), "white")                   # cabin
    m.cube("body", (-16, 8, -82), (32, 26, 22), "glass")                   # cockpit glazing
    m.cube("body", (-12, 10, -88), (24, 18, 6), "glass")
    m.cube("body", (-18.4, 18, -60), (36.8, 5, 80), "red")                 # charter band
    m.cube("body", (-18.2, 6, -60), (36.4, 3, 80), "dark")                 # belly
    m.cube("body", (-12, 40, -40), (24, 10, 50), "dark")                   # engine housing
    m.cube("body", (-8, 18, 20), (16, 16, 36), "white")                    # boom root
    m.cube("body", (-5, 22, 56), (10, 10, 70), "white")                    # tail boom
    m.cube("body", (-2, 30, 112), (4, 34, 16), "white")                    # fin
    m.cube("body", (-24, 26, 108), (48, 2, 10), "white")                   # stabiliser
    for side in (-1, 1):
        m.cube("body", (side * 20 - 2, 0, -50), (4, 3, 60), "dark")        # skids
        m.cube("body", (side * 16 - 1, 3, -40), (2, 5, 2), "dark")
        m.cube("body", (side * 16 - 1, 3, 0), (2, 5, 2), "dark")
    m.bone("rotor", "body", pivot=(0, 52, -15))
    m.cube("rotor", (-3, 50, -18), (6, 6, 6), "dark")
    for (x0, z0, w, d) in ((-130, -16.5, 127, 3), (3, -16.5, 127, 3), (-1.5, -145, 3, 127), (-1.5, -12, 3, 127)):
        m.cube("rotor", (x0, 54, z0), (w, 1, d), "dark")
    m.bone("tail_rotor", "body", pivot=(4, 50, 120))
    m.cube("tail_rotor", (4, 49, 119), (2, 2, 2), "dark")
    m.cube("tail_rotor", (5, 36, 119.5), (0.8, 28, 1.5), "dark")
    m.cube("tail_rotor", (5, 49.25, 106), (0.8, 1.5, 28), "dark")
    m.locator("body", "cockpit", (0, 22, -70))
    return m


def heli_mats():
    return {
        "white": Material(WHITE, base=0.6, noise=(0.3, 0.12, 2), speckle=(0.03, -0.1), ao=0.12, bevel=0.04,
                          grime=dict(color="#5a5a52", strength=0.25), mers=(20, 0, 90, 0), height_strength=0.2),
        "red": Material(RED, base=0.6, noise=(0.4, 0.1, 2), ao=0.1, mers=(20, 0, 90, 0)),
        "dark": Material(PROP, base=0.5, noise=(0.8, 0.12, 2), ao=0.1, mers=(100, 0, 110, 0)),
        "glass": Material(GLASS, base=0.5, noise=(1.0, 0.1, 1), ao=0.0, edge=0.0, mers=(60, 0, 15, 0)),
    }


def cloud():
    """Built at 1/40 scale around its own origin; the animation scales and moves every part."""
    m = Model("geometry.hollow.mushroom_cloud", atlas_width=256, visible_bounds=(320, 260, (0, 100, 0)))
    m.bone("root", pivot=(0, 0, 0))
    # fireball: a rough sphere of boxes
    m.bone("fireball", "root", pivot=(0, 0, 0))
    for (w, h) in ((16, 8), (12, 12), (8, 16)):
        m.box("fireball", (0, 0, 0), (w, h, w), "fire")
        m.box("fireball", (0, 0, 0), (w * 0.86, h, w * 1.1), "fire")
    # stem: a twisting column, wider at the foot
    m.bone("stem", "root", pivot=(0, 0, 0))
    for i in range(8):
        w = 6 - i * 0.35
        m.box("stem", (((-1) ** i) * 0.3, i * 4 + 2, 0), (w, 4.2, w), "smoke")
    # cap: a flattened, lumpy dome with an inner glow
    m.bone("cap", "root", pivot=(0, 34, 0))
    m.box("cap", (0, 34, 0), (26, 6, 26), "cap")
    m.box("cap", (0, 39, 0), (22, 6, 22), "cap")
    m.box("cap", (0, 43, 0), (14, 4, 14), "cap")
    for a in range(8):
        import math
        x, z = math.cos(a * 0.785) * 11, math.sin(a * 0.785) * 11
        m.box("cap", (x, 36, z), (9, 7, 9), "cap")
    m.box("cap", (0, 31, 0), (16, 3, 16), "fire")
    # condensation ring (the Wilson cloud) around the stem
    m.bone("skirt", "root", pivot=(0, 22, 0))
    import math
    for a in range(12):
        x, z = math.cos(a * 0.5236) * 12, math.sin(a * 0.5236) * 12
        m.box("skirt", (x, 22, z), (7, 2, 7), "ring")
    # the shock wave on the water / the base surge
    m.bone("shock", "root", pivot=(0, -40, 0))
    for a in range(24):
        x, z = math.cos(a * 0.2618) * 20, math.sin(a * 0.2618) * 20
        m.box("shock", (x, -40, z), (6, 0.6, 6), "ring")
    m.bone("surge", "root", pivot=(0, -40, 0))
    for a in range(16):
        x, z = math.cos(a * 0.3927) * 9, math.sin(a * 0.3927) * 9
        m.box("surge", (x, -38.5, z), (7, 3, 7), "smoke")
    return m


def cloud_mats():
    return {
        "fire": Material(FIRE, base=0.7, noise=(0.8, 0.35, 3), ao=0.0, edge=0.0, mers=(0, 255, 255, 0), height_strength=0.0,
                         alpha=150),
        "smoke": Material(SMOKE, base=0.5, noise=(0.6, 0.4, 3), ao=0.1, edge=0.0, mers=(0, 0, 255, 120), height_strength=0.3),
        "cap": Material(CAP, base=0.55, noise=(0.5, 0.45, 3), ao=0.15, edge=0.0, mers=(0, 90, 255, 120), height_strength=0.3,
                        alpha=210),
        "ring": Material(RING, base=0.7, noise=(0.9, 0.2, 2), ao=0.0, edge=0.0, mers=(0, 0, 255, 160), height_strength=0.0),
    }


def main():
    b = bomber()
    export_entity("bomber", b, Painter(b, bomber_mats(), bomber_features(), seed=81, scale=1, ao_rays=6, ao_dist=8.0),
                  previews=[None, {"door_l": {"rot": (0, 0, -80)}, "door_r": {"rot": (0, 0, 80)}}])
    bb = bomb()
    export_entity("bomb", bb, Painter(bb, {"olive": Material(OLIVE, base=0.5, noise=(0.4, 0.15, 2), ao=0.1, bevel=0.05,
                                                                mers=(80, 0, 130, 0)),
                                           "band": Material(BAND, base=0.6, noise=(0.6, 0.1, 1), ao=0.05, mers=(40, 0, 120, 0))},
                                      [], seed=82, scale=2, ao_rays=8, ao_dist=4.0))
    h = helicopter()
    export_entity("helicopter", h, Painter(h, heli_mats(), [], seed=83, scale=1, ao_rays=6, ao_dist=8.0))
    c = cloud()
    export_entity("mushroom_cloud", c, Painter(c, cloud_mats(), [], seed=84, scale=2, ao_rays=4, ao_dist=4.0))


if __name__ == "__main__":
    main()
