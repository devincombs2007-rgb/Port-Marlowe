"""THE MIMIC: one geometry, two forms (source of truth for packs/DREAD_RP/models/entity/mimic.geo.json).

`disguise` is livestock seen from across a field: a cow, almost. The legs are a little too thin and long, the head
hangs a little too low, the body a little too long. `true_form` is folded inside it and only shown (render
controller part_visibility on the dread:form property) during and after the reveal: a narrow pale trunk that
unfolds upward out of the back, two arms with three joints each, and a smooth head split by a vertical mouth.
"""
from geo import Model


def build():
    m = Model("geometry.dread.mimic", 128, 64, bounds=(4, 4, (0, 1.5, 0)))
    m.bone("root", [0, 0, 0])

    # ---------------- disguise: the "cow" ----------------
    d = m.bone("disguise", [0, 0, 0], "root")
    body = m.bone("d_body", [0, 19, 2], "disguise")
    body.cube([-6, 13, -10], [12, 10, 22], "d_barrel")
    body.cube([-2, 12, 4], [4, 1, 5], "d_udder")
    head = m.bone("d_head", [0, 20, -10], "d_body", [26, 0, 0])
    head.cube([-4, 14, -18], [8, 8, 8], "d_skull")
    head.cube([-3, 14, -20], [6, 4, 2], "d_muzzle")
    for side, sx in (("r", -1), ("l", 1)):
        head.cube([sx * 4 - (1 if sx > 0 else 0) + (0 if sx > 0 else 0), 21, -14], [1, 3, 1], f"d_horn_{side}")
        head.cube([sx * 5.5 - 1, 19, -13], [2, 1, 1], f"d_ear_{side}")
    for name, x, z in (("d_leg_fr", -4, -8), ("d_leg_fl", 2.2, -8), ("d_leg_br", -4, 7), ("d_leg_bl", 2.2, 7)):
        leg = m.bone(name, [x + 0.9, 13, z + 0.9], "d_body")
        leg.cube([x, 0, z], [1.8, 13, 1.8], name)
    tail = m.bone("d_tail", [0, 22, 12], "d_body", [-20, 0, 0])
    tail.cube([-0.5, 12, 12], [1, 10, 1], "d_tail")

    # ---------------- true form: folded inside, unfolds upward ----------------
    t = m.bone("true_form", [0, 16, 2], "root")
    trunk = m.bone("t_trunk", [0, 16, 2], "true_form")
    trunk.cube([-2.5, 16, 0], [5, 18, 4], "t_trunk")
    for i, y in enumerate((19, 23, 27, 31)):
        trunk.cube([-3.2, y, -0.6], [6.4, 1.2, 5.2], f"t_rib{i}")
    neck = m.bone("t_neck", [0, 34, 2], "t_trunk")
    neck.cube([-1, 34, 1], [2, 7, 2], "t_neck")
    thead = m.bone("t_head", [0, 41, 2], "t_neck")
    thead.cube([-3, 41, -1], [6, 9, 6], "t_head")
    for side, sx in (("r", -1), ("l", 1)):
        # the vertical mouth: two lips either side of a dark split, opened by animation (yaw)
        lip = m.bone(f"t_lip_{side}", [sx * 0.2, 45.5, -1.2], "t_head")
        lip.cube([sx * 0.2 - (0 if sx > 0 else 1.4), 42, -1.6], [1.4, 7, 0.8], f"t_lip_{side}")
    for side, sx in (("r", -1), ("l", 1)):
        x = 3.6 * sx
        a1 = m.bone(f"t_arm_{side}", [x, 32, 2], "t_trunk", [0, 0, 30 * sx])
        a1.cube([x - 0.8, 22, 1.2], [1.6, 10, 1.6], f"t_arm1_{side}")
        a2 = m.bone(f"t_arm2_{side}", [x, 22.5, 2], f"t_arm_{side}", [-40, 0, 0])
        a2.cube([x - 0.7, 12.5, 1.3], [1.4, 10, 1.4], f"t_arm2_{side}")
        a3 = m.bone(f"t_arm3_{side}", [x, 13, 2], f"t_arm2_{side}", [-30, 0, 0])
        a3.cube([x - 0.6, 4, 1.4], [1.2, 9, 1.2], f"t_arm3_{side}")
        for k, dz in enumerate((-0.6, 0.6)):
            a3.cube([x - 0.25, -1, 1.7 + dz], [0.5, 5, 0.5], f"t_finger_{side}{k}")
    return m
