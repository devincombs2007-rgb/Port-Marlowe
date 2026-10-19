"""Bedrock entity/block geometry builder with automatic per-face UV layout.

Conventions (shared by painter and preview renderer):
  * Model units are 1/16 block, +Y up, the creature's front faces -Z ("north").
  * Each cube gets a box-UV style net; faces are emitted as explicit per-face UVs.
  * Bone rotations follow Bedrock's convention (X and Y negated vs. right-handed).
"""
import json
import math
import numpy as np

FACES = ("up", "down", "east", "north", "west", "south")


def rot_matrix(rx, ry, rz):
    """Bedrock euler (degrees) -> 3x3 matrix in our right-handed preview space."""
    ax, ay, az = math.radians(-rx), math.radians(-ry), math.radians(rz)
    cx, sx = math.cos(ax), math.sin(ax)
    cy, sy = math.cos(ay), math.sin(ay)
    cz, sz = math.cos(az), math.sin(az)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def affine(R=None, t=None):
    M = np.eye(4)
    if R is not None:
        M[:3, :3] = R
    if t is not None:
        M[:3, 3] = t
    return M


class Cube:
    def __init__(self, bone, origin, size, material, pivot=None, rotation=None, inflate=0.0,
                 skip=(), tag=None):
        self.bone = bone
        self.origin = [float(v) for v in origin]
        self.size = [float(v) for v in size]
        self.material = material
        self.pivot = pivot
        self.rotation = rotation
        self.inflate = inflate
        self.skip = set(skip)
        self.tag = tag
        self.uv_origin = None
        # Integer texel dimensions used for the UV net.
        self.uw = max(1, int(math.ceil(self.size[0] - 1e-6)))
        self.uh = max(1, int(math.ceil(self.size[1] - 1e-6)))
        self.ud = max(1, int(math.ceil(self.size[2] - 1e-6)))

    @property
    def net_size(self):
        return (2 * (self.uw + self.ud), self.ud + self.uh)

    def face_rects(self):
        u0, v0 = self.uv_origin
        W, H, D = self.uw, self.uh, self.ud
        return {
            "up": (u0 + D, v0, W, D),
            "down": (u0 + D + W, v0, W, D),
            "east": (u0, v0 + D, D, H),
            "north": (u0 + D, v0 + D, W, H),
            "west": (u0 + D + W, v0 + D, D, H),
            "south": (u0 + 2 * D + W, v0 + D, W, H),
        }

    def local_point(self, face, fu, fv):
        """Map fractional face coords (0..1) to cube-space points (pre cube rotation)."""
        x0, y0, z0 = self.origin
        sx, sy, sz = self.size
        x1, y1, z1 = x0 + sx, y0 + sy, z0 + sz
        n = len(fu)
        if face == "north":
            P = np.stack([x1 - fu * sx, y1 - fv * sy, np.full(n, z0)], 1); N = (0, 0, -1)
        elif face == "south":
            P = np.stack([x0 + fu * sx, y1 - fv * sy, np.full(n, z1)], 1); N = (0, 0, 1)
        elif face == "east":
            P = np.stack([np.full(n, x1), y1 - fv * sy, z1 - fu * sz], 1); N = (1, 0, 0)
        elif face == "west":
            P = np.stack([np.full(n, x0), y1 - fv * sy, z0 + fu * sz], 1); N = (-1, 0, 0)
        elif face == "up":
            P = np.stack([x1 - fu * sx, np.full(n, y1), z1 - fv * sz], 1); N = (0, 1, 0)
        else:  # down
            P = np.stack([x1 - fu * sx, np.full(n, y0), z0 + fv * sz], 1); N = (0, -1, 0)
        return P, np.array(N, dtype=float)

    def corners(self):
        x0, y0, z0 = [o - self.inflate for o in self.origin]
        x1, y1, z1 = [o + s + self.inflate for o, s in zip(self.origin, self.size)]
        return x0, y0, z0, x1, y1, z1

    def cube_matrix(self):
        if not self.rotation:
            return np.eye(4)
        p = np.array(self.pivot if self.pivot else [0, 0, 0], dtype=float)
        return affine(t=p) @ affine(rot_matrix(*self.rotation)) @ affine(t=-p)


class Bone:
    def __init__(self, name, parent=None, pivot=(0, 0, 0), rotation=None, mirror=False):
        self.name = name
        self.parent = parent
        self.pivot = [float(v) for v in pivot]
        self.rotation = rotation
        self.cubes = []
        self.locators = {}


class Model:
    def __init__(self, identifier, atlas_width=64, visible_bounds=(2, 3, (0, 1.25, 0))):
        self.identifier = identifier
        self.atlas_width = atlas_width
        self.atlas_height = None
        self.bones = {}
        self.order = []
        self.visible_bounds = visible_bounds

    def bone(self, name, parent=None, pivot=(0, 0, 0), rotation=None):
        b = Bone(name, parent, pivot, rotation)
        self.bones[name] = b
        self.order.append(name)
        return b

    def cube(self, bone, origin, size, material, **kw):
        c = Cube(bone, origin, size, material, **kw)
        self.bones[bone].cubes.append(c)
        return c

    def box(self, bone, center, size, material, **kw):
        """Convenience: cube from centre/size."""
        origin = [c - s / 2.0 for c, s in zip(center, size)]
        return self.cube(bone, origin, size, material, **kw)

    def locator(self, bone, name, pos):
        self.bones[bone].locators[name] = [float(v) for v in pos]

    def all_cubes(self):
        for n in self.order:
            for c in self.bones[n].cubes:
                yield c

    # ----------------------------------------------------------------- UV layout
    def layout(self):
        cubes = sorted(self.all_cubes(), key=lambda c: (-c.net_size[1], -c.net_size[0]))
        W = self.atlas_width
        x = y = shelf_h = 0
        for c in cubes:
            w, h = c.net_size
            if w > W:
                raise ValueError(f"cube net {w} wider than atlas {W} in {self.identifier}")
            if x + w > W:
                x = 0
                y += shelf_h
                shelf_h = 0
            c.uv_origin = (x, y)
            x += w
            shelf_h = max(shelf_h, h)
        used = y + shelf_h
        H = 16
        while H < used:
            H *= 2
        self.atlas_height = max(H, 16)
        return self.atlas_width, self.atlas_height

    # ---------------------------------------------------------------- transforms
    def bone_matrices(self, pose=None):
        """World matrices for every bone. pose: {bone: dict(rot=(x,y,z), pos=(x,y,z), scale=s)}"""
        pose = pose or {}
        mats = {}

        def get(name):
            if name in mats:
                return mats[name]
            b = self.bones[name]
            parent = get(b.parent) if b.parent else np.eye(4)
            rot = list(b.rotation) if b.rotation else [0, 0, 0]
            pz = pose.get(name, {})
            if "rot" in pz:
                rot = [a + d for a, d in zip(rot, pz["rot"])]
            p = np.array(b.pivot)
            M = parent @ affine(t=p)
            if "pos" in pz:
                M = M @ affine(t=np.array(pz["pos"], dtype=float))
            M = M @ affine(rot_matrix(*rot))
            if "scale" in pz:
                s = pz["scale"]
                s = (s, s, s) if np.isscalar(s) else s
                M = M @ np.diag([s[0], s[1], s[2], 1.0])
            M = M @ affine(t=-p)
            mats[name] = M
            return M

        for n in self.order:
            get(n)
        return mats

    # -------------------------------------------------------------------- export
    def to_json(self):
        if self.atlas_height is None:
            self.layout()
        bones = []
        for n in self.order:
            b = self.bones[n]
            jb = {"name": b.name}
            if b.parent:
                jb["parent"] = b.parent
            jb["pivot"] = [round(v, 4) for v in b.pivot]
            if b.rotation:
                jb["rotation"] = [round(v, 4) for v in b.rotation]
            if b.cubes:
                cubes = []
                for c in b.cubes:
                    jc = {"origin": [round(v, 4) for v in c.origin], "size": [round(v, 4) for v in c.size]}
                    if c.inflate:
                        jc["inflate"] = round(c.inflate, 4)
                    if c.rotation:
                        jc["pivot"] = [round(v, 4) for v in (c.pivot or [0, 0, 0])]
                        jc["rotation"] = [round(v, 4) for v in c.rotation]
                    uv = {}
                    for face, (u, v, w, h) in c.face_rects().items():
                        if face in c.skip:
                            continue
                        uv[face] = {"uv": [u, v], "uv_size": [w, h]}
                    jc["uv"] = uv
                    cubes.append(jc)
                jb["cubes"] = cubes
            if b.locators:
                jb["locators"] = {k: [round(x, 4) for x in v] for k, v in b.locators.items()}
            bones.append(jb)
        vw, vh, vo = self.visible_bounds
        return {
            "format_version": "1.16.0",
            "minecraft:geometry": [{
                "description": {
                    "identifier": self.identifier,
                    "texture_width": self.atlas_width,
                    "texture_height": self.atlas_height,
                    "visible_bounds_width": vw,
                    "visible_bounds_height": vh,
                    "visible_bounds_offset": list(vo),
                },
                "bones": bones,
            }],
        }

    def write(self, path):
        with open(path, "w") as f:
            json.dump(self.to_json(), f, indent=1)
