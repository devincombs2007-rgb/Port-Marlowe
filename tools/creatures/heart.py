"""The Heart Below (boss), its shield veins, and the root spikes it drives up through the floor."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit.model import Model, add_segment
from hollowkit.paint import Material, Feature, Painter, ramp
from hollowkit.export import export_entity

FLESH = ramp("#2a0f0e", "#3b1513", "#4f1d19", "#652620", "#7c3127", "#93402f")
VEIN = ramp("#7a1c14", "#b0322a", "#e0574a", "#ff8a66")
ROOT = ramp("#3a2e22", "#4d3d2c", "#625037", "#7a6646", "#948058")
BARK = ramp("#1f1813", "#2b211a", "#382b21", "#46362a")
CORE = ramp("#7a1c14", "#c0402a", "#ff7a4a", "#ffb47a", "#ffe2b8")
SCAR = ramp("#1c0a09", "#2a100e", "#3a1612")


def heart_model():
    m = Model("geometry.hollow.heart_below", atlas_width=256, visible_bounds=(8, 7, (0, 2.5, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("heart", "root", pivot=(0, 18, 0))
    m.cube("heart", (-11, 6, -10), (22, 24, 20), "flesh")
    m.cube("heart", (-13, 9, -8), (26, 17, 16), "flesh")
    m.cube("heart", (-9, 9, -12), (18, 18, 24), "flesh")
    m.cube("heart", (-10, 29, -9), (20, 5, 18), "flesh")
    m.cube("heart", (-7, 3, -7), (14, 4, 14), "flesh")
    for sx in (-1, 1):  # atria
        m.cube("heart", (sx * 9 - 6, 30, -6), (12, 10, 12), "flesh")
    # great vessels
    add_segment(m, "heart", (-4, 36, 0), (-9, 50, -3), 6, "flesh")
    add_segment(m, "heart", (3, 36, 2), (7, 49, 6), 5, "flesh")
    add_segment(m, "heart", (0, 37, -3), (1, 47, -8), 4, "vein")
    # raised surface veins (glow faintly)
    for (p, q) in (((-12.6, 24, -4), (-12.6, 11, 3)), ((12.6, 25, 2), (12.6, 12, -4)), ((-5, 31, -11.6), (2, 12, -11.6)),
                   ((6, 28, 11.6), (-3, 10, 11.6))):
        add_segment(m, "heart", p, q, 1.0, "vein", inflate=0.2)
    # the maw: two lids over a recess in the front, hinged at their outer edges
    m.bone("lid_l", "heart", pivot=(8, 18, -12))
    m.cube("lid_l", (0, 11, -13.5), (8, 15, 2), "scar")
    m.bone("lid_r", "heart", pivot=(-8, 18, -12))
    m.cube("lid_r", (-8, 11, -13.5), (8, 15, 2), "scar")
    m.bone("core", "heart", pivot=(0, 18, -10))
    m.cube("core", (-5, 13, -12.5), (10, 10, 3), "core")
    # roots: spreading into the floor, and bands binding the heart
    m.bone("roots", "root", pivot=(0, 4, 0))
    import math
    for i in range(9):
        a = i / 9 * 2 * math.pi + 0.2
        r0, r1 = 8, 40
        p = (math.cos(a) * r0, 6, math.sin(a) * r0)
        mid = (math.cos(a) * 22, 2.8, math.sin(a) * 22)
        q = (math.cos(a + 0.12) * r1, 0.6, math.sin(a + 0.12) * r1)
        add_segment(m, "roots", p, mid, 6.5 - (i % 3) * 0.8, "root")
        add_segment(m, "roots", mid, q, 4.5 - (i % 3) * 0.6, "root")
    m.bone("bands", "heart", pivot=(0, 18, 0))
    for (p, q, t) in (((-13.5, 6, -6), (-6, 34, -9), 2.2), ((13.5, 5, 5), (5, 34, 8), 2.2), ((-10, 30, 10.5), (12, 8, 10.5), 2.0),
                      ((-13.5, 20, 7), (-3, 33, 12), 1.8)):
        add_segment(m, "bands", p, q, t, "bark", inflate=0.3)
    m.locator("heart", "core", (0, 18, -12))
    return m


def vein_model():
    m = Model("geometry.hollow.heart_vein", atlas_width=64, visible_bounds=(1.5, 1.5, (0, 0.5, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("sac", "root", pivot=(0, 6, 0))
    m.cube("sac", (-4, 2, -4), (8, 8, 8), "vein")
    m.cube("sac", (-3, 1, -3), (6, 10, 6), "vein", inflate=0.4)
    m.bone("claws", "root", pivot=(0, 6, 0))
    for (p, q) in (((-4, 9, -4), (-7, 14, -7)), ((4, 9, 4), (7, 13, 6)), ((-4, 3, 4), (-7, -1, 7)), ((4, 3, -4), (7, -1, -6))):
        add_segment(m, "claws", p, q, 1.6, "bark")
    return m


def spike_model():
    m = Model("geometry.hollow.root_spike", atlas_width=64, visible_bounds=(2, 3, (0, 1.2, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("spikes", "root", pivot=(0, 0, 0))
    add_segment(m, "spikes", (0, -4, 0), (0.5, 26, -0.5), 4, "root")
    add_segment(m, "spikes", (0.5, 26, -0.5), (1.0, 36, -1.0), 2, "root")
    add_segment(m, "spikes", (-2, -4, 2), (-6, 18, 4), 3, "root")
    add_segment(m, "spikes", (2, -4, 1), (7, 15, 3), 3, "root")
    add_segment(m, "spikes", (1, -4, -2), (3, 20, -7), 2.5, "bark")
    return m


def materials():
    return {
        "flesh": Material(FLESH, base=0.5, noise=(0.18, 0.32, 3), streak=(0.3, 1.2, 0.3, 0.2), speckle=(0.06, 0.15), ao=0.35,
                          spots=dict(scale=0.25, threshold=0.55, ramp=SCAR), mers=(0, 0, 70, 200), rough_var=40, height_strength=1.2),
        "vein": Material(VEIN, base=0.6, noise=(0.6, 0.3, 2), ao=0.0, edge=0.0, mers=(0, 160, 60, 160)),
        "scar": Material(SCAR, base=0.5, noise=(0.4, 0.3, 2), speckle=(0.08, 0.2), ao=0.1, mers=(0, 0, 90, 150), height_strength=1.0),
        "core": Material(CORE, base=0.7, noise=(0.5, 0.3, 2), ao=0.0, edge=0.0, mers=(0, 255, 120, 200)),
        "root": Material(ROOT, base=0.5, noise=(0.4, 0.25, 2), streak=(2, 0.25, 2, 0.35), ao=0.2, mers=(0, 0, 230, 60), height_strength=0.9),
        "bark": Material(BARK, base=0.5, noise=(0.4, 0.25, 2), streak=(2, 0.25, 2, 0.35), ao=0.2, mers=(0, 0, 240, 0)),
    }


def main():
    mats = materials()
    hm = heart_model()
    export_entity("heart_below", hm, Painter(hm, mats, [], seed=66),
                  previews=[None, {"lid_l": {"rot": (0, 70, 0)}, "lid_r": {"rot": (0, -70, 0)}}],
                  preview_views=((20, 15), (90, 10), (200, 20), (-30, 40)))
    vm = vein_model()
    export_entity("heart_vein", vm, Painter(vm, mats, [], seed=67))
    sm = spike_model()
    export_entity("root_spike", sm, Painter(sm, mats, [], seed=68))


if __name__ == "__main__":
    main()
