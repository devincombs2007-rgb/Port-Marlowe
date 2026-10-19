"""Procedural pixel-art painter for Model atlases.

Every texel is mapped back to its 3D bind-pose position, so noise and decals stay continuous
across cube faces. Each material is a short colour ramp (dark -> light) in the spirit of
hand-made vanilla textures, plus PBR channels (metalness, emissive, roughness, subsurface)
used to author Vibrant Visuals MERS maps and heightmaps.
"""
import numpy as np
from PIL import Image

from .noise import Noise3, hash01


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def ramp(*hexes):
    return np.stack([hexrgb(h) for h in hexes])


class Material:
    """Parameters:
    ramp: (k,3) colours dark->light.
    base: base value 0..1 (position on the ramp).
    noise: (scale, weight, octaves)
    streak: (sx, sy, sz, weight) anisotropic noise (e.g. bark grain along Y).
    spots: dict(scale, threshold, ramp, weight) secondary patches (moss, lichen, rot).
    speckle: (probability, delta)
    ao: strength of height-based darkening; face shading per orientation.
    mers: (metal, emissive, rough, subsurface) 0..255; rough_var: roughness noise amplitude.
    height_strength: how strongly the value drives the heightmap (0 = flat).
    alpha: 0..255
    """

    def __init__(self, ramp, base=0.5, noise=(0.35, 0.35, 3), streak=None, spots=None,
                 speckle=(0.06, -0.12), ao=0.25, edge=0.06, mers=(0, 0, 230, 0), rough_var=20,
                 height_strength=0.6, alpha=255, dither=0.0, contrast=1.0):
        self.ramp = ramp
        self.base = base
        self.noise = noise
        self.streak = streak
        self.spots = spots
        self.speckle = speckle
        self.ao = ao
        self.edge = edge
        self.mers = mers
        self.rough_var = rough_var
        self.height_strength = height_strength
        self.alpha = alpha
        self.dither = dither
        self.contrast = contrast


class Feature:
    """3D decal. shape: sphere(center, r) | box(min, max) | capsule(a, b, r).
    Overrides colour (and optionally PBR) for texels inside the shape."""

    def __init__(self, shape, color=None, material=None, mers=None, faces=None, bones=None,
                 alpha=None, height=None, soft=0.0):
        self.shape = shape
        self.color = hexrgb(color) if isinstance(color, str) else color
        self.material = material
        self.mers = mers
        self.faces = faces
        self.bones = bones
        self.alpha = alpha
        self.height = height
        self.soft = soft

    def inside(self, P):
        kind = self.shape[0]
        if kind == "sphere":
            c, r = np.array(self.shape[1], float), self.shape[2]
            return np.linalg.norm(P - c, axis=1) <= r
        if kind == "box":
            lo, hi = np.array(self.shape[1], float), np.array(self.shape[2], float)
            return np.all((P >= lo) & (P <= hi), axis=1)
        if kind == "capsule":
            a, b, r = np.array(self.shape[1], float), np.array(self.shape[2], float), self.shape[3]
            ab = b - a
            t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
            proj = a + t[:, None] * ab
            return np.linalg.norm(P - proj, axis=1) <= r
        raise ValueError(kind)


class Painter:
    def __init__(self, model, materials, features=(), seed=1, light_dir=(0.3, 1.0, -0.4)):
        self.model = model
        self.materials = materials
        self.features = list(features)
        self.noise = Noise3(seed)
        self.noise2 = Noise3(seed + 101)
        self.seed = seed

    def paint(self):
        m = self.model
        W, H = m.layout()
        color = np.zeros((H, W, 4), dtype=np.uint8)
        mers = np.zeros((H, W, 4), dtype=np.uint8)
        height = np.full((H, W), 128, dtype=np.uint8)
        # model bounds for AO
        ys = []
        for c in m.all_cubes():
            ys += [c.origin[1], c.origin[1] + c.size[1]]
        ymin, ymax = min(ys), max(ys)

        for c in m.all_cubes():
            mat = self.materials[c.material]
            for face, (u0, v0, fw, fh) in c.face_rects().items():
                if face in c.skip:
                    continue
                iu, iv = np.meshgrid(np.arange(fw), np.arange(fh))
                iu, iv = iu.ravel(), iv.ravel()
                fu = (iu + 0.5) / fw
                fv = (iv + 0.5) / fh
                # Author-space positions (as written in the cube definitions, before any bone or
                # cube rotation) keep decals easy to place and noise continuous between cubes.
                Pw, Nw = c.local_point(face, fu, fv)
                rgb, a, pbr, hgt = self._shade(mat, Pw, Nw, face, iu, iv, fw, fh, ymin, ymax)
                # decals
                for ft in self.features:
                    if ft.faces and face not in ft.faces:
                        continue
                    if ft.bones and c.bone not in ft.bones:
                        continue
                    inside = ft.inside(Pw)
                    if not inside.any():
                        continue
                    if ft.material is not None:
                        r2, a2, p2, h2 = self._shade(self.materials[ft.material], Pw, Nw, face, iu, iv, fw, fh, ymin, ymax)
                        rgb[inside], a[inside], pbr[inside], hgt[inside] = r2[inside], a2[inside], p2[inside], h2[inside]
                    if ft.color is not None:
                        rgb[inside] = ft.color
                    if ft.mers is not None:
                        pbr[inside] = ft.mers
                    if ft.alpha is not None:
                        a[inside] = ft.alpha
                    if ft.height is not None:
                        hgt[inside] = ft.height
                ys_, xs_ = v0 + iv, u0 + iu
                color[ys_, xs_, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
                color[ys_, xs_, 3] = a
                mers[ys_, xs_] = np.clip(pbr, 0, 255).astype(np.uint8)
                height[ys_, xs_] = np.clip(hgt, 0, 255).astype(np.uint8)
        return color, mers, height

    def _shade(self, mat, P, N, face, iu, iv, fw, fh, ymin, ymax):
        n = len(P)
        v = np.full(n, mat.base)
        sc, wt, octv = mat.noise
        if wt:
            v += wt * self.noise.fbm(P, octaves=octv, scale=sc)
        if mat.streak:
            sx, sy, sz, sw = mat.streak
            v += sw * self.noise2.fbm(P * np.array([sx, sy, sz]), octaves=2)
        if mat.contrast != 1.0:
            v = 0.5 + (v - 0.5) * mat.contrast
        # orientation + height based ambient occlusion (readable silhouettes in classic lighting)
        shade = {"up": 0.07, "down": -0.14, "north": 0.0, "south": -0.03, "east": -0.02, "west": -0.02}[face]
        v += shade
        if mat.ao:
            rel = (P[:, 1] - ymin) / max(ymax - ymin, 1e-6)
            v -= mat.ao * (1 - rel) ** 2 * 0.5
        if mat.edge and face not in ("up", "down"):
            v[iv == 0] += mat.edge
            if fh > 2:
                v[iv == fh - 1] -= mat.edge * 1.2
        if mat.speckle:
            prob, delta = mat.speckle
            h = hash01(P * 1.0 + 0.5, self.seed)
            v[h < prob] += delta
        raw = v.copy()
        rp = mat.ramp
        k = len(rp)
        if mat.dither:
            thr = ((iu % 2) * 2 + (iv % 2)) / 4.0 - 0.375
            v = v + thr * mat.dither / k
        idx = np.clip(np.round(v * (k - 1)), 0, k - 1).astype(int)
        rgb = rp[idx].copy()
        if mat.spots:
            s = mat.spots
            sv = self.noise2.fbm(P + 31.7, octaves=2, scale=s["scale"])
            mask = sv > s["threshold"]
            if mask.any():
                srp = s["ramp"]
                sk = len(srp)
                sidx = np.clip(np.round((raw[mask] * 0.6 + 0.2 + (sv[mask] - s["threshold"])) * (sk - 1)), 0, sk - 1).astype(int)
                rgb[mask] = srp[sidx]
        a = np.full(n, mat.alpha, dtype=np.uint8)
        metal, emi, rough, sss = mat.mers
        pbr = np.zeros((n, 4))
        pbr[:, 0] = metal
        pbr[:, 1] = emi
        pbr[:, 2] = rough + mat.rough_var * self.noise.fbm(P + 7.0, octaves=2, scale=0.5)
        pbr[:, 3] = sss
        hgt = 128 + mat.height_strength * (raw - 0.5) * 200
        return rgb, a, pbr, hgt


def save_rgba(arr, path):
    Image.fromarray(arr, "RGBA").save(path, optimize=True)


def save_l(arr, path):
    Image.fromarray(arr, "L").save(path, optimize=True)
