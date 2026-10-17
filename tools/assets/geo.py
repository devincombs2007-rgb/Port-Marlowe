"""Tiny Bedrock geometry toolkit: bones + cubes with automatic box-UV packing, a software silhouette
previewer (so proportions can be judged without the game), and texture-face helpers.

Conventions (Bedrock, same handedness as Java): model faces -Z ("north"), +Y up, +X is the entity's left.
Positive X rotation tips the top of a bone toward the front (-Z). Units: 16 px = 1 block.
"""
import json, math
import numpy as np


class Cube:
    def __init__(self, origin, size, name="", rot=None, pivot=None, inflate=0.0, mirror=False):
        self.origin, self.size, self.name = list(origin), list(size), name
        self.rot, self.pivot, self.inflate, self.mirror = rot, pivot, inflate, mirror
        self.uv = None  # assigned by pack()

    @property
    def uv_size(self):
        w, h, d = (max(1, math.ceil(s)) for s in self.size)
        return 2 * (d + w), d + h  # box-UV footprint in px (integer sizes used for UV math)


class Bone:
    def __init__(self, name, pivot, parent=None, rotation=None):
        self.name, self.pivot, self.parent, self.rotation = name, list(pivot), parent, rotation
        self.cubes = []

    def cube(self, *a, **k):
        c = Cube(*a, **k)
        self.cubes.append(c)
        return c


class Model:
    def __init__(self, identifier, tex_w, tex_h, bounds=(3, 4, (0, 1.5, 0))):
        self.identifier, self.tw, self.th, self.bounds = identifier, tex_w, tex_h, bounds
        self.bones = []

    def bone(self, name, pivot, parent=None, rotation=None):
        b = Bone(name, pivot, parent, rotation)
        self.bones.append(b)
        return b

    def scale(self, k):
        """Uniformly scale the whole model about the origin (pivots, origins, sizes)."""
        for b in self.bones:
            b.pivot = [v * k for v in b.pivot]
            for c in b.cubes:
                c.origin = [v * k for v in c.origin]
                c.size = [v * k for v in c.size]
                if c.pivot:
                    c.pivot = [v * k for v in c.pivot]

    def shift_y(self, dy):
        for b in self.bones:
            b.pivot[1] += dy
            for c in b.cubes:
                c.origin[1] += dy
                if c.pivot:
                    c.pivot[1] += dy

    def all_cubes(self):
        return [(b, c) for b in self.bones for c in b.cubes]

    def pack(self):
        """Shelf-pack every cube's box-UV footprint into the texture. Raises if it does not fit."""
        items = sorted(self.all_cubes(), key=lambda bc: -bc[1].uv_size[1])
        x = y = shelf = 0
        for _, c in items:
            w, h = c.uv_size
            if x + w > self.tw:
                x, y, shelf = 0, y + shelf, 0
            if y + h > self.th:
                raise ValueError(f"texture {self.tw}x{self.th} too small for UV packing")
            c.uv = (x, y)
            x += w
            shelf = max(shelf, h)
        return y + shelf

    def to_json(self):
        bones = []
        for b in self.bones:
            j = {"name": b.name, "pivot": [round(v, 3) for v in b.pivot]}
            if b.parent:
                j["parent"] = b.parent
            if b.rotation:
                j["rotation"] = b.rotation
            if b.cubes:
                j["cubes"] = []
                for c in b.cubes:
                    # Per-face UVs (exact rectangles) instead of box-UV, so fractional cube sizes never skew the atlas.
                    cj = {"origin": [round(v, 3) for v in c.origin], "size": [round(v, 3) for v in c.size],
                          "uv": {f: {"uv": [r[0], r[1]], "uv_size": [r[2], r[3]]} for f, r in Model.faces(c).items()}}
                    if c.rot:
                        cj["rotation"] = c.rot
                        cj["pivot"] = [round(v, 3) for v in (c.pivot or [c.origin[0] + c.size[0] / 2, c.origin[1] + c.size[1] / 2, c.origin[2] + c.size[2] / 2])]
                    if c.inflate:
                        cj["inflate"] = c.inflate
                    if c.mirror:
                        cj["mirror"] = True
                    j["cubes"].append(cj)
            bones.append(j)
        bw, bh, off = self.bounds
        return {
            "format_version": "1.12.0",
            "minecraft:geometry": [{
                "description": {"identifier": self.identifier, "texture_width": self.tw, "texture_height": self.th,
                                "visible_bounds_width": bw, "visible_bounds_height": bh, "visible_bounds_offset": list(off)},
                "bones": bones}],
        }

    # ---- texture face rectangles (box UV) ------------------------------------------------------
    @staticmethod
    def faces(c):
        w, h, d = (max(1, math.ceil(s)) for s in c.size)
        u, v = c.uv
        return {
            "up": (u + d, v, w, d), "down": (u + d + w, v, w, d),
            "east": (u, v + d, d, h), "north": (u + d, v + d, w, h),
            "west": (u + d + w, v + d, d, h), "south": (u + 2 * d + w, v + d, w, h),
        }

    # ---- software preview ----------------------------------------------------------------------
    def _world_transform(self, bone):
        chain = []
        b = bone
        by = {x.name: x for x in self.bones}
        while b:
            chain.append(b)
            b = by.get(b.parent)
        return list(reversed(chain))

    @staticmethod
    def _rot(v, rot, pivot):
        # Bedrock applies Z, then Y, then X; positive X tips +Y toward -Z (see module docstring).
        x, y, z = (np.radians(r) for r in rot)
        p = np.array(v) - pivot
        cz, sz, cy, sy, cx, sx = math.cos(z), math.sin(z), math.cos(y), math.sin(y), math.cos(x), math.sin(x)
        p = np.array([p[0] * cz - p[1] * sz, p[0] * sz + p[1] * cz, p[2]])
        p = np.array([p[0] * cy + p[2] * sy, p[1], -p[0] * sy + p[2] * cy])
        p = np.array([p[0], p[1] * cx + p[2] * sx, -p[1] * sx + p[2] * cx])
        return p + pivot

    def corners(self):
        """World-space corner lists per cube (rest pose)."""
        out = []
        for b, c in self.all_cubes():
            o, s = c.origin, c.size
            pts = [np.array([o[0] + dx * s[0], o[1] + dy * s[1], o[2] + dz * s[2]]) for dx in (0, 1) for dy in (0, 1) for dz in (0, 1)]
            if c.rot:
                pv = np.array(c.pivot or [o[i] + s[i] / 2 for i in range(3)])
                pts = [self._rot(p, c.rot, pv) for p in pts]
            for bb in reversed(self._world_transform(b)):
                if bb.rotation:
                    pts = [self._rot(p, bb.rotation, np.array(bb.pivot)) for p in pts]
            out.append((b.name, pts))
        return out

    def preview(self, path, scale=8):
        from PIL import Image, ImageDraw
        cs = self.corners()
        allp = np.array([p for _, pts in cs for p in pts])
        ymax = allp[:, 1].max()
        views = {"front": (0, 1), "side": (2, 1), "top": (0, 2)}
        W = 260
        H = int((ymax + 8) * scale)
        im = Image.new("RGB", (W * 3, H), (14, 16, 20))
        d = ImageDraw.Draw(im)
        for vi, (name, (ax, ay)) in enumerate(views.items()):
            ox = vi * W + W // 2
            for bone, pts in cs:
                P = np.array(pts)
                # hull-ish: draw each of the 12 box edges is overkill; fill the 2D bounding polygon of projected corners
                xs, ys = P[:, ax], P[:, ay]
                if name == "top":
                    pts2 = [(ox + x * scale, H // 2 + y * scale) for x, y in zip(xs, ys)]
                else:
                    pts2 = [(ox + (x if name == "front" else -x) * scale, H - 4 - y * scale) for x, y in zip(xs, ys)]
                hull = _hull(pts2)
                d.polygon(hull, fill=(120, 130, 128), outline=(30, 34, 36))
            d.text((vi * W + 6, 4), name, fill=(255, 255, 0))
        d.line([(0, H - 4), (W * 3, H - 4)], fill=(80, 40, 40))
        for k in range(0, int(ymax) + 16, 16):  # one line per block of height
            d.line([(0, H - 4 - k * scale), (10, H - 4 - k * scale)], fill=(255, 255, 0))
        im.save(path)
        return float(ymax), float(allp[:, 1].min()), float(allp[:, 0].min()), float(allp[:, 0].max()), float(allp[:, 2].min()), float(allp[:, 2].max())


def _hull(points):
    pts = sorted(set((round(x, 2), round(y, 2)) for x, y in points))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]
