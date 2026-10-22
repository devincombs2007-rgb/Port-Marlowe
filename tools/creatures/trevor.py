"""Trevor Hale, senior field technician, and the two helicopter crew who did not survive the crash.

Trevor: late fifties, grey stubble and a weathered face under a sun-faded boonie hat; an olive
field jacket with bellows pockets, a yellow dosimeter badge on the chest, a webbing belt with a
holster and a pouch, tan cargo trousers, scuffed boots and a framed pack with a radio antenna.
Proportioned like a person rather than a block: narrower shoulders, real hands, a neck.

The crew share the skeleton (so the same rest geometry can be posed lying in the sand): sage
flight suits, flight helmets with the visor down, gloves and survival vests.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

JACKET = ramp("#2f3322", "#3c412b", "#4a5034", "#585f3e", "#676e49", "#777e55")
CARGO = ramp("#4a3f2c", "#5a4d36", "#6b5c41", "#7c6c4d", "#8d7c5a")
SKIN = ramp("#5e4436", "#735442", "#876551", "#9a7662", "#ab8773", "#bb9784")
STUBBLE = ramp("#55524c", "#6a665f", "#807b72", "#958f85")
HAT = ramp("#5e5a44", "#6e6a51", "#7f7a5f", "#908b6d", "#a19c7d")
BOOT = ramp("#1b1611", "#261e17", "#32281e", "#3f3326")
WEB = ramp("#1f2218", "#2a2e20", "#363b29")
METAL = ramp("#2a2c2e", "#3b3e41", "#55595d", "#7a7f84")
PACK = ramp("#2a2c22", "#35382b", "#414534", "#4e523e")
BADGE = ramp("#8a6a10", "#b38c1c", "#d9b23a", "#f0d470")
SUIT = ramp("#2c3127", "#363c30", "#41483a", "#4c5444", "#57604e")
HELMET = ramp("#2c2f31", "#3a3e41", "#4a4f53", "#5d6267", "#71777c")
VISOR = ramp("#0e1214", "#182024", "#24323a", "#355060")
GLOVE = ramp("#17140f", "#221d16", "#2e271e")
VEST = ramp("#3a3020", "#4a3d29", "#5a4b33")
BLOOD = ramp("#1e0705", "#2c0a07", "#3a0f0b")


def build(kind="trevor"):
    crew = kind == "crew"
    ident = "geometry.hollow.crew" if crew else "geometry.hollow.trevor"
    m = Model(ident, atlas_width=128, visible_bounds=(2.5, 2.6, (0, 1.0, 0)))
    top = "suit" if crew else "jacket"
    legs = "suit" if crew else "cargo"
    m.bone("root", pivot=(0, 0, 0))
    m.bone("body", "root", pivot=(0, 12, 0))
    m.cube("body", (-3.6, 10.5, -2.1), (7.2, 2.6, 4.2), legs)                 # hips
    m.cube("body", (-3.8, 11.6, -2.3), (7.6, 1.1, 4.6), "web")                # belt
    m.cube("body", (-0.7, 11.5, -2.6), (1.4, 1.2, 0.5), "metal")              # buckle
    m.bone("torso", "body", pivot=(0, 13, 0))
    m.cube("torso", (-3.8, 13, -2.2), (7.6, 9.6, 4.4), top)                   # chest/abdomen
    m.cube("torso", (-4.2, 20.2, -2.4), (8.4, 2.6, 4.8), top)                 # shoulder yoke
    m.cube("torso", (-1.4, 21.6, -2.6), (2.8, 1.4, 1.0), top)                 # collar
    if crew:
        m.cube("torso", (-3.9, 14.0, -2.6), (7.8, 6.6, 0.6), "vest")          # survival vest panels
        m.cube("torso", (-3.9, 14.0, 2.0), (7.8, 6.6, 0.6), "vest")
        m.cube("torso", (-3.4, 16.2, -3.0), (2.6, 2.4, 0.5), "vest")          # pouches
        m.cube("torso", (0.8, 16.2, -3.0), (2.6, 2.4, 0.5), "vest")
    else:
        m.cube("torso", (-3.5, 17.0, -2.7), (2.8, 2.8, 0.6), "jacket")        # chest pockets
        m.cube("torso", (0.7, 17.0, -2.7), (2.8, 2.8, 0.6), "jacket")
        m.cube("torso", (-3.5, 13.4, -2.7), (2.8, 2.6, 0.6), "jacket")        # hip pockets
        m.cube("torso", (0.7, 13.4, -2.7), (2.8, 2.6, 0.6), "jacket")
        m.cube("torso", (1.3, 19.6, -2.95), (1.4, 1.6, 0.3), "badge")         # dosimeter badge
        # framed pack with a whip antenna
        m.bone("pack", "torso", pivot=(0, 20, 2.2))
        m.cube("pack", (-3.2, 13.6, 2.2), (6.4, 8.2, 3.0), "pack")
        m.cube("pack", (-3.5, 13.0, 2.4), (7.0, 1.2, 2.6), "pack")            # bedroll strap
        m.cube("pack", (-2.4, 16.0, 5.2), (4.8, 3.4, 0.6), "pack")            # outer pocket
        m.cube("pack", (2.0, 21.8, 3.0), (0.4, 9.5, 0.4), "metal")            # antenna
        m.cube("pack", (-3.4, 21.0, 2.6), (1.0, 1.2, 1.0), "metal")           # radio knob
        m.cube("body", (3.6, 9.4, -1.4), (1.2, 3.2, 2.4), "web")             # holster
        m.bone("holstered", "body", pivot=(4.2, 12, 0))
        m.cube("holstered", (3.75, 11.6, -1.2), (0.9, 1.6, 1.4), "metal")    # the pistol's grip in the holster
        m.cube("body", (-4.8, 9.8, -1.2), (1.2, 2.4, 2.4), "web")            # pouch
    m.bone("neck", "torso", pivot=(0, 22.8, 0))
    m.cube("neck", (-1.3, 22.4, -1.3), (2.6, 1.8, 2.6), "skin")
    m.bone("head", "neck", pivot=(0, 24, 0))
    m.cube("head", (-3.2, 24, -3.4), (6.4, 7.4, 6.6), "helmet" if crew else "skin")
    if crew:
        m.cube("head", (-3.6, 24.6, -3.8), (7.2, 7.4, 7.4), "helmet")          # flight helmet shell
        m.cube("head", (-3.0, 26.0, -4.2), (6.0, 3.6, 0.6), "visor")          # visor down
        m.cube("head", (-1.0, 30.6, -4.0), (2.0, 1.4, 1.2), "helmet")         # visor guard
        m.cube("head", (-2.0, 23.6, -3.9), (4.0, 1.6, 1.0), "glove")          # oxygen mask
    else:
        m.cube("head", (-0.5, 26.2, -4.1), (1.0, 1.6, 0.8), "skin")           # nose
        m.cube("head", (-3.2, 24.0, -3.6), (6.4, 2.4, 0.4), "stubble")        # jaw stubble
        m.cube("head", (-3.4, 24.6, -3.4), (0.3, 2.6, 1.8), "stubble")        # sideburns
        m.cube("head", (3.1, 24.6, -3.4), (0.3, 2.6, 1.8), "stubble")
        m.cube("head", (-3.5, 26.6, -0.6), (0.5, 1.4, 1.0), "skin")           # ears
        m.cube("head", (3.0, 26.6, -0.6), (0.5, 1.4, 1.0), "skin")
        m.bone("hat", "head", pivot=(0, 30.5, 0))
        m.cube("hat", (-3.5, 30.2, -3.7), (7.0, 2.2, 7.2), "hat")             # crown
        m.cube("hat", (-5.2, 30.0, -5.4), (10.4, 0.5, 10.6), "hat")           # wide brim
        m.cube("hat", (-3.6, 30.4, -3.8), (7.2, 0.5, 7.4), "web")             # band
    for side, sx in (("right", -1), ("left", 1)):
        arm, fore, hand = f"{side}_arm", f"{side}_forearm", f"{side}_hand"
        m.bone(arm, "torso", pivot=(sx * 4.6, 21.4, 0))
        m.cube(arm, (sx * 4.6 - 1.4, 15.8, -1.4), (2.8, 6.4, 2.8), top)
        m.bone(fore, arm, pivot=(sx * 4.6, 16.2, 0))
        m.cube(fore, (sx * 4.6 - 1.25, 11.0, -1.25), (2.5, 5.6, 2.5), top)
        m.cube(fore, (sx * 4.6 - 1.35, 11.0, -1.35), (2.7, 1.0, 2.7), top)     # rolled cuff
        m.bone(hand, fore, pivot=(sx * 4.6, 11.0, 0))
        m.cube(hand, (sx * 4.6 - 1.05, 8.0, -1.2), (2.1, 3.1, 2.4), "glove" if crew else "skin")
        m.cube(hand, (sx * 4.6 - 1.05 + (0.9 if sx < 0 else -0.5), 8.6, -1.7), (0.7, 1.8, 0.6), "glove" if crew else "skin")
    for side, sx in (("right", -1), ("left", 1)):
        leg, shin = f"{side}_leg", f"{side}_shin"
        m.bone(leg, "body", pivot=(sx * 1.85, 11.0, 0))
        m.cube(leg, (sx * 1.85 - 1.6, 5.6, -1.6), (3.2, 5.8, 3.2), legs)
        if not crew:
            m.cube(leg, (sx * 1.85 + sx * 1.3 - 0.4, 6.2, -1.2), (0.8, 2.4, 2.4), legs)   # thigh cargo pocket
        m.bone(shin, leg, pivot=(sx * 1.85, 5.8, 0))
        m.cube(shin, (sx * 1.85 - 1.45, 2.0, -1.45), (2.9, 4.0, 2.9), legs)
        m.cube(shin, (sx * 1.85 - 1.55, 0.0, -2.6), (3.1, 2.4, 4.3), "boot")
        m.cube(shin, (sx * 1.85 - 1.6, 2.2, -1.6), (3.2, 1.0, 3.2), "boot")
    if not crew:
        # the service pistol in his hand (shown only while he is aiming; see the render controller)
        m.bone("gun", "right_hand", pivot=(-4.6, 9.0, 0))
        # modelled along the hanging arm: when the arm comes up to aim, the slide points ahead
        # and the grip points down into his fist
        m.cube("gun", (-5.1, 8.2, -0.4), (1.0, 1.3, 2.6), "metal")          # grip
        m.cube("gun", (-5.15, 3.2, -1.7), (1.1, 5.6, 1.3), "metal")         # slide and barrel
        m.cube("gun", (-5.0, 6.6, -0.5), (0.8, 1.4, 0.8), "metal")          # trigger guard
    m.locator("right_hand", "right_hand", (-4.6, 8.4, -1.2))
    m.locator("head", "mouth", (0, 25.2, -3.6))
    return m


def materials(kind="trevor"):
    cloth = dict(base=0.5, noise=(0.5, 0.22, 3), speckle=(0.06, 0.1), detail=0.07,
                 fissure=dict(scale=1.2, stretch=(0.25, 1.0, 0.25), threshold=0.985, delta=-0.18),
                 grime=dict(color="#1a160f", strength=0.35), ao=0.22, bevel=0.04, mers=(0, 0, 238, 25),
                 height_strength=0.8)
    mats = {
        "jacket": Material(JACKET, **cloth),
        "cargo": Material(CARGO, **cloth),
        "suit": Material(SUIT, **cloth),
        "skin": Material(SKIN, base=0.55, noise=(0.6, 0.16, 2), speckle=(0.05, -0.12), ao=0.18, detail=0.05,
                         grime=dict(color="#4a3024", strength=0.3), bevel=0.04, mers=(0, 0, 175, 150),
                         height_strength=0.4),
        "stubble": Material(STUBBLE, base=0.5, noise=(1.4, 0.35, 2), speckle=(0.3, -0.2), ao=0.1,
                            mers=(0, 0, 230, 90), height_strength=0.5),
        "hat": Material(HAT, base=0.55, noise=(0.5, 0.2, 3), speckle=(0.05, 0.12), ao=0.18, detail=0.06,
                        grime=dict(color="#3a3626", strength=0.4), bevel=0.05, mers=(0, 0, 240, 20)),
        "boot": Material(BOOT, base=0.5, noise=(0.8, 0.2, 2), ao=0.15, bevel=0.07, mers=(0, 0, 150, 0),
                         grime=dict(color="#5a4a36", strength=0.4)),
        "web": Material(WEB, base=0.5, noise=(0.9, 0.18, 2), streak=(0.3, 2.0, 0.3, 0.3), ao=0.1, mers=(0, 0, 225, 0)),
        "metal": Material(METAL, base=0.55, noise=(0.9, 0.15, 1), ao=0.05, bevel=0.1, mers=(200, 0, 90, 0)),
        "pack": Material(PACK, **cloth),
        "badge": Material(BADGE, base=0.6, noise=(1.0, 0.1, 1), ao=0.0, edge=0.0, mers=(0, 0, 80, 0)),
        "helmet": Material(HELMET, base=0.55, noise=(0.7, 0.12, 2), speckle=(0.05, 0.15), ao=0.12, bevel=0.08,
                           grime=dict(color="#141210", strength=0.6), mers=(30, 0, 95, 0), height_strength=0.3),
        "visor": Material(VISOR, base=0.6, noise=(1.0, 0.08, 1), ao=0.0, edge=0.0, mers=(80, 0, 20, 0)),
        "glove": Material(GLOVE, base=0.5, noise=(0.9, 0.2, 2), ao=0.1, mers=(0, 0, 200, 0)),
        "vest": Material(VEST, **cloth),
    }
    return mats


def features(kind="trevor"):
    if kind == "crew":
        return [
            # soot, sand and old blood on the suit; a cracked visor
            Feature(("sphere", (1.5, 18.5, -2.6), 1.5), material="blood", faces=["north"]),
            Feature(("sphere", (-2.0, 8.5, -1.8), 1.0), material="blood"),
            Feature(("capsule", (-2.4, 28.8, -4.3), (1.8, 26.4, -4.3), 0.25), color="#6d8592", faces=["north"]),
        ]
    z0, z1 = -3.7, -3.3

    def face(x0, y0, x1, y1, color, h=None):
        return Feature(("box", (x0, y0, z0), (x1, y1, z1)), color=color, faces=["north"], height=h)
    return [
        # eyes under heavy brows, crow's feet, a grey moustache over the stubble
        face(-2.3, 27.4, -1.1, 28.1, "#f0e8dc"), face(1.1, 27.4, 2.3, 28.1, "#f0e8dc"),
        face(-1.8, 27.4, -1.2, 28.1, "#3a4a52", 15), face(1.3, 27.4, 1.9, 28.1, "#3a4a52", 15),
        face(-2.5, 28.3, -0.9, 28.8, "#6a665f", 40), face(0.9, 28.3, 2.5, 28.8, "#6a665f", 40),
        face(-2.6, 27.0, -2.2, 27.3, "#83584a"), face(2.2, 27.0, 2.6, 27.3, "#83584a"),
        face(-1.6, 25.6, 1.6, 26.1, "#8a857c", 30),
        face(-1.0, 24.8, 1.0, 25.2, "#5a3a30"),
        # sweat-darkened jacket under the pack straps; a scrape on the knee
        Feature(("box", (-3.0, 13.0, -2.9), (-2.2, 22.5, -2.4)), color="#2e3220", faces=["north"]),
        Feature(("box", (2.2, 13.0, -2.9), (3.0, 22.5, -2.4)), color="#2e3220", faces=["north"]),
        Feature(("sphere", (-1.9, 5.8, -1.7), 0.9), color="#3e3424"),
    ]


POSES = [None, {"right_arm": {"rot": (-84, 0, -4)}, "right_forearm": {"rot": (-6, 0, 0)}, "left_arm": {"rot": (-72, 0, 30)}, "left_forearm": {"rot": (-24, 0, 0)}, "head": {"rot": (0, 0, 0)}}]
CREW_POSES = [None, {"root": {"rot": (-88, 0, 0)}, "head": {"rot": (0, 25, 0)}, "right_arm": {"rot": (0, 0, 40)},
                     "left_arm": {"rot": (-20, 0, -15)}, "left_leg": {"rot": (0, 0, -10)}}]


def main():
    m = build("trevor")
    export_entity("trevor", m, Painter(m, materials("trevor"), features("trevor"), seed=71, scale=2,
                                       ao_rays=24, ao_dist=5.0), previews=POSES)
    c = build("crew")
    mats = materials("crew")
    mats["blood"] = Material(BLOOD, base=0.5, noise=(1.2, 0.25, 2), ao=0.0, edge=0.0, mers=(0, 0, 90, 60))
    export_entity("crew", c, Painter(c, mats, features("crew"), seed=72, scale=2, ao_rays=24, ao_dist=5.0),
                  previews=CREW_POSES)


if __name__ == "__main__":
    main()
