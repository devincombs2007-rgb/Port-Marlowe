"""THE LURKER: geometry definition (source of truth for packs/DREAD_RP/models/entity/lurker.geo.json).

Silhouette goals: a hunched, too-tall, too-thin watcher. Stilted digitigrade legs, arms that reach the knees,
a long forward-craning neck, an elongated skull with a crown of bark-like branches, a spine of thorns.
It should read as a human-ish shape from far away and as *wrong* up close. Standing height ~2.9 blocks so it
fits in 3-high caves and doorways.
"""
from geo import Model


def build():
    m = Model("geometry.dread.lurker", 128, 64, bounds=(3, 4, (0, 1.5, 0)))
    m.bone("root", [0, 0, 0])

    # --- hips & legs ---------------------------------------------------------------------------
    waist = m.bone("waist", [0, 25, 0], "root")
    waist.cube([-3.5, 22, -2.5], [7, 5, 5], "pelvis")
    for side, sx in (("r", -1), ("l", 1)):
        x = 3.2 * sx
        leg = m.bone(f"leg_{side}", [x, 24, 0], "waist", [-24, 0, 0])
        leg.cube([x - 1.4, 12, -1.9], [2.8, 12.5, 3.8], f"thigh_{side}")
        shin = m.bone(f"shin_{side}", [x, 12.5, -3.3], f"leg_{side}", [46, 0, 0])
        shin.cube([x - 1.0, 2.5, -4.4], [2.0, 10.5, 2.2], f"shin_{side}")
        foot = m.bone(f"foot_{side}", [x, 3, -3.6], f"shin_{side}", [-22, 0, 0])
        foot.cube([x - 1.2, 0, -7.5], [2.4, 2.4, 6.5], f"foot_{side}")
        for k, dx in enumerate((-0.9, 0.0, 0.9)):  # long toes
            foot.cube([x + dx - 0.3, 0, -10.8], [0.6, 1.0, 3.4], f"toe_{side}{k}")

    # --- torso, spine thorns, neck, head -------------------------------------------------------
    torso = m.bone("torso", [0, 26, 0], "waist", [24, 0, 0])
    torso.cube([-3, 26, -2.2], [6, 13, 4.4], "spine")
    torso.cube([-5.6, 37, -2.1], [11.2, 3, 4.2], "shoulders")
    for i, y in enumerate((30, 33, 36)):
        torso.cube([-4.1, y, -2.7], [8.2, 1.2, 5.4], f"rib{i}")
    for i, y in enumerate((28.5, 31.5, 34.5, 37.5, 40)):
        torso.cube([-0.5, y, 2.1], [1.0, 2.6 + (i % 2), 1.0], f"thorn{i}", rot=[-28, 0, 0], pivot=[0, y, 2.1])

    neck = m.bone("neck", [0, 38.5, 0], "torso", [32, 0, 0])
    neck.cube([-1.2, 38.5, -1.2], [2.4, 8.5, 2.4], "neck")

    head = m.bone("head", [0, 46.5, 0.5], "neck", [-18, 0, 0])
    head.cube([-2.6, 46.5, -3.6], [5.2, 7.5, 7.2], "skull")
    head.cube([-1.8, 46.8, -6.0], [3.6, 4.6, 2.4], "muzzle")
    jaw = m.bone("jaw", [0, 48.5, -2.0], "head", [10, 0, 0])
    jaw.cube([-1.6, 44.6, -5.6], [3.2, 3.2, 3.8], "jaw")
    crown = m.bone("crown", [0, 53, 1.5], "head")
    branches = [  # (x, z, tilt_x, tilt_z, length)
        (0.0, 1.4, -38, 0, 9.0), (-1.4, 0.6, -22, 22, 7.5), (1.4, 0.6, -22, -22, 7.5),
        (-0.7, 2.8, -58, 12, 6.0), (0.9, 2.6, -62, -14, 6.5),
    ]
    for i, (x, z, tx, tz, ln) in enumerate(branches):
        crown.cube([x - 0.45, 53, z - 0.45], [0.9, ln, 0.9], f"branch{i}", rot=[tx, 0, tz], pivot=[x, 53, z])
        crown.cube([x - 0.3 + (0.6 if i % 2 else -0.6), 53 + ln * 0.55, z], [0.6, 3.0, 0.6], f"twig{i}",
                   rot=[tx - 25, 0, tz + (30 if i % 2 else -30)], pivot=[x, 53 + ln * 0.55, z])

    # --- arms: shoulder -> forearm -> hand with long fingers ----------------------------------
    for side, sx in (("r", -1), ("l", 1)):
        x = 6.4 * sx
        arm = m.bone(f"arm_{side}", [x, 38.5, 0], "torso", [-14, 0, 5 * -sx])
        arm.cube([x - 1.2, 25, -1.3], [2.4, 14, 2.6], f"upper_arm_{side}")
        fore = m.bone(f"forearm_{side}", [x, 25, 0], f"arm_{side}", [-20, 0, 0])
        fore.cube([x - 1.0, 14, -1.1], [2.0, 11, 2.2], f"forearm_{side}")
        hand = m.bone(f"hand_{side}", [x, 14, 0], f"forearm_{side}", [-10, 0, 0])
        hand.cube([x - 0.9, 9.5, -1.7], [1.8, 4.5, 3.4], f"palm_{side}")
        for k, dz in enumerate((-1.4, -0.45, 0.5, 1.45)):
            ln = 5.2 + (1.4 if k in (1, 2) else 0)
            hand.cube([x - 0.3, 9.5 - ln, dz - 0.3], [0.6, ln, 0.6], f"finger_{side}{k}")
    m.scale(0.86)
    m.shift_y(-2.51)  # feet planted on y=0
    return m
