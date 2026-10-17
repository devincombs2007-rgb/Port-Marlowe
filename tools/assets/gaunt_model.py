"""THE GAUNT: geometry (source of truth for packs/DREAD_RP/models/entity/gaunt.geo.json).

Silhouette goals: the opposite of the Lurker. Low, broad and heavy at the front: a starved quadruped that walks on
knuckles of arms far too long for it, hind legs folded under like a hare's, a barrel of exposed ribs, a ridge of
vertebral plates, and an eyeless horse-length skull with a hanging jaw. ~1.7 blocks at the shoulder, ~2.6 long.
"""
from geo import Model


def build():
    m = Model("geometry.dread.gaunt", 128, 128, bounds=(4, 3, (0, 1.0, 0)))
    m.bone("root", [0, 0, 0])

    # body: pelvis at the back (+z), chest forward (-z) and higher; the whole body is pitched nose-down
    body = m.bone("body", [0, 16, 8], "root", [-12, 0, 0])
    body.cube([-4, 13, 4], [8, 7, 9], "pelvis")
    body.cube([-5, 14, -8], [10, 11, 13], "ribcage")
    body.cube([-4.5, 14.6, -7.6], [9, 0.8, 12.2], "belly_skin", inflate=0.0)
    for i, z in enumerate((-6.5, -3.5, -0.5, 2.5)):
        body.cube([-5.4, 16.5, z], [10.8, 7, 1.0], f"rib{i}")
    for i, z in enumerate((-7, -4, -1, 2, 5, 8, 11)):  # vertebral plates along the spine
        h = 3.5 - abs(i - 2) * 0.4
        body.cube([-0.6, 24.6 if z < 4 else 19.6, z], [1.2, h, 2.2], f"plate{i}", rot=[18, 0, 0], pivot=[0, 24.6 if z < 4 else 19.6, z + 1.1])

    # neck and head: long, low, eyeless
    neck = m.bone("neck", [0, 22, -8], "body", [28, 0, 0])
    neck.cube([-2, 19, -16], [4, 5, 9], "neck")
    head = m.bone("head", [0, 21, -15.5], "neck", [-20, 0, 0])
    head.cube([-2.8, 17.5, -27], [5.6, 6, 12], "skull")
    head.cube([-2.2, 18.2, -30], [4.4, 3.6, 3.2], "snout")
    for side, x in (("r", -2.9), ("l", 2.3)):
        head.cube([x, 21.8, -22], [0.6, 2.4, 6], f"brow_{side}")
    jaw = m.bone("jaw", [0, 18.2, -17.5], "head", [12, 0, 0])
    jaw.cube([-2.4, 15.4, -29], [4.8, 2.4, 11.5], "jaw")
    for k, x in enumerate((-2.0, -1.0, 0.0, 1.0)):
        jaw.cube([x + 0.1, 17.6, -28.6 + (k % 2) * 0.8], [0.7, 1.6, 0.7], f"tooth_low{k}")
    for k, x in enumerate((-1.9, -0.9, 0.1, 1.1)):
        head.cube([x + 0.1, 16.6, -29.2 + (k % 2) * 0.9], [0.7, 1.6, 0.7], f"tooth_up{k}")

    # forelimbs: shoulder -> forearm -> hand with three claws; planted far forward
    for side, sx in (("r", -1), ("l", 1)):
        x = 5.6 * sx
        arm = m.bone(f"arm_{side}", [x, 23, -5], "body", [-38, 0, 8 * -sx])
        arm.cube([x - 1.6, 10, -6.8], [3.2, 14, 3.6], f"upper_arm_{side}")
        fore = m.bone(f"forearm_{side}", [x, 10.5, -5], f"arm_{side}", [62, 0, 0])
        fore.cube([x - 1.3, -2, -6.2], [2.6, 13, 2.6], f"forearm_{side}")
        hand = m.bone(f"hand_{side}", [x, -1.5, -5], f"forearm_{side}", [-30, 0, 0])
        hand.cube([x - 1.8, -3.4, -7.4], [3.6, 2.2, 4.2], f"knuckles_{side}")
        for k, dx in enumerate((-1.2, 0.0, 1.2)):
            hand.cube([x + dx - 0.35, -3.4, -11.6 + abs(dx) * 0.6], [0.7, 0.9, 4.4], f"claw_{side}{k}", rot=[-12, 0, 0], pivot=[x + dx, -3, -7.4])

    # hind legs: folded hare-like haunches
    for side, sx in (("r", -1), ("l", 1)):
        x = 3.8 * sx
        thigh = m.bone(f"thigh_{side}", [x, 17, 9], "body", [-50, 0, 0])
        thigh.cube([x - 1.6, 8, 7], [3.2, 9, 4.4], f"thigh_{side}")
        shin = m.bone(f"shin_{side}", [x, 8.5, 9], f"thigh_{side}", [95, 0, 0])
        shin.cube([x - 1.1, 0, 8], [2.2, 9, 2.4], f"shin_{side}")
        foot = m.bone(f"foot_{side}", [x, 0.6, 9], f"shin_{side}", [-30, 0, 0])
        foot.cube([x - 1.3, -1.2, 3], [2.6, 1.8, 7], f"foot_{side}")
    m.shift_y(-3.37)  # knuckles planted on y=0
    return m
