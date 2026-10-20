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


def blob(m, bone, center, radii, material, slabs=6, inflate=0.0):
    """An ellipsoid approximated by stacked slabs (rounded silhouette from boxes)."""
    import math
    cx, cy, cz = center
    rx, ry, rz = radii
    h = 2 * ry / slabs
    for i in range(slabs):
        mid = cy - ry + (i + 0.5) * h
        f = math.sqrt(max(0.0, 1 - ((mid - cy) / ry) ** 2))
        f = 0.35 + 0.65 * f  # keep the caps from becoming slivers
        hx, hz = round(rx * f * 2) / 2, round(rz * f * 2) / 2
        if hx < 1 or hz < 1:
            continue
        m.cube(bone, (cx - hx, mid - h / 2, cz - hz), (2 * hx, h, 2 * hz), material, inflate=inflate)


def rounded(m, bone, center, radii, material, k=0.78, inflate=0.0):
    """Rounded mass from three intersecting boxes (each long on one axis): an even, chunky curve."""
    cx, cy, cz = center
    rx, ry, rz = radii
    for (sx, sy, sz) in ((1, k, k), (k, 1, k), (k, k, 1)):
        hx, hy, hz = rx * sx, ry * sy, rz * sz
        m.cube(bone, (cx - hx, cy - hy, cz - hz), (2 * hx, 2 * hy, 2 * hz), material, inflate=inflate)


def heart_model():
    """A heart the size of a cart, rooted into the shrine floor: two ventricles with an off-centre apex,
    atria, an aortic arch with branches, a split pulmonary trunk, a vena cava running down into the roots,
    glowing coronary veins, and a lidded eye in the left ventricle that opens in the last phase."""
    import math
    m = Model("geometry.hollow.heart_below", atlas_width=512, visible_bounds=(10, 7, (0, 2.6, 0)))
    m.bone("root", pivot=(0, 0, 0))
    m.bone("heart", "root", pivot=(0, 26, 0))
    rounded(m, "heart", (5, 26, 1), (16, 18, 14), "flesh")               # left ventricle (the big one)
    rounded(m, "heart", (-9, 29, -1), (12, 14, 12), "flesh")             # right ventricle
    rounded(m, "heart", (4, 9, 2), (9, 7, 8), "flesh", k=0.7)            # apex, off centre
    rounded(m, "heart", (8, 46, 5), (9, 6, 8), "flesh", k=0.72)          # left atrium
    rounded(m, "heart", (-11, 45, 3), (9, 7, 9), "flesh", k=0.72)        # right atrium
    # aortic arch with three branches, curving back over the top
    arch = [(2, 42, -1), (2, 56, -1), (-4, 63, 2), (-12, 61, 6), (-15, 50, 8)]
    for a, b in zip(arch, arch[1:]):
        add_segment(m, "heart", a, b, 8, "flesh", inflate=0.3)
    for p, q in (((0, 61, 0), (0, 70, -1)), ((-5, 63, 2), (-6, 71, 2)), ((-10, 62, 5), (-12, 69, 6))):
        add_segment(m, "heart", p, q, 3.5, "flesh")
    # pulmonary trunk, splitting
    add_segment(m, "heart", (-5, 40, -9), (-7, 53, -11), 7, "flesh", inflate=0.2)
    add_segment(m, "heart", (-7, 53, -11), (-16, 57, -8), 5, "flesh")
    add_segment(m, "heart", (-7, 53, -11), (4, 56, -11), 5, "flesh")
    # vena cava down the back into the floor
    add_segment(m, "heart", (-14, 40, 9), (-16, 2, 11), 7, "flesh", inflate=0.2)
    # coronary veins (emissive) over the surface
    for p, q in (((14, 38, -9), (10, 8, -10)), ((-2, 41, -12.5), (6, 6, -11)), ((-19, 36, -4), (-15, 16, -8)),
                 ((20, 30, 2), (16, 10, 8)), ((-8, 42, 10), (6, 14, 14))):
        add_segment(m, "heart", p, q, 1.4, "vein", inflate=0.25)
    # the eye: a recess in the left ventricle behind two hinged lids
    m.bone("core", "heart", pivot=(5, 25, -12))
    m.cube("core", (0, 17, -13.2), (10, 16, 2), "vein")                   # iris ring: a rounded cross, glowing red
    m.cube("core", (-2, 20, -13.2), (14, 10, 2), "vein")
    m.cube("core", (2, 19, -13.7), (6, 12, 1.2), "core")                  # pale, hot centre
    m.cube("core", (4, 18, -14.2), (2, 14, 1), "scar")                    # the pupil: a dark vertical slit
    m.bone("lid_l", "heart", pivot=(13, 25, -15))
    m.cube("lid_l", (5, 14, -16.6), (8, 22, 2.6), "flesh")
    m.bone("lid_r", "heart", pivot=(-3, 25, -15))
    m.cube("lid_r", (-3, 14, -16.6), (8, 22, 2.6), "flesh")
    m.cube("heart", (4.6, 14, -16.0), (0.8, 22, 1.0), "scar")             # the seam where the lids meet
    # roots: spreading into the floor
    m.bone("roots", "root", pivot=(0, 4, 0))
    for i in range(11):
        a = i / 11 * 2 * math.pi + 0.3
        r0, r1 = 12, 58
        p = (math.cos(a) * r0, 8, math.sin(a) * r0)
        mid = (math.cos(a + 0.05) * 30, 3.0, math.sin(a + 0.05) * 30)
        q = (math.cos(a + 0.16) * r1, 0.6, math.sin(a + 0.16) * r1)
        t = 8.0 - (i % 3) * 1.2
        add_segment(m, "roots", p, mid, t, "root")
        add_segment(m, "roots", mid, q, t * 0.6, "root")
    # bark bands binding the heart to the ground
    m.bone("bands", "heart", pivot=(0, 26, 0))
    for (p, q, t) in (((-20, 6, -8), (-10, 44, -12), 2.8), ((21, 6, 4), (10, 44, 10), 2.8),
                      ((-16, 40, 13), (18, 10, 14), 2.4), ((-21, 24, 8), (-6, 47, 12), 2.2),
                      ((20, 22, -12), (2, 45, -13.5), 2.0)):
        add_segment(m, "bands", p, q, t, "bark", inflate=0.3)
    m.locator("heart", "core", (5, 25, -15))
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
        "flesh": Material(FLESH, base=0.5, noise=(0.18, 0.32, 3), streak=(0.3, 1.2, 0.3, 0.2), speckle=(0.06, 0.15), ao=0.15, edge=0.0,
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
                  previews=[None, {"lid_l": {"rot": (0, 72, 0)}, "lid_r": {"rot": (0, -72, 0)}}],
                  preview_views=((20, 15), (90, 10), (200, 20), (-30, 40)))
    vm = vein_model()
    export_entity("heart_vein", vm, Painter(vm, mats, [], seed=67))
    sm = spike_model()
    export_entity("root_spike", sm, Painter(sm, mats, [], seed=68))


if __name__ == "__main__":
    main()
