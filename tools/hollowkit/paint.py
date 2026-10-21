"""Procedural pixel-art painter for Model atlases.

Every texel is mapped back to its 3D bind-pose position, so noise and decals stay continuous
across cube faces. Each material is a short colour ramp (dark -> light) in the spirit of
hand-made vanilla textures, plus PBR channels (metalness, emissive, roughness, subsurface)
used to author Vibrant Visuals MERS maps and heightmaps.

1.1 additions (all optional, defaults keep the 1.0 look for blocks):
  * texel scale: paint 2x/4x atlases for creatures without changing their geometry;
  * baked ambient occlusion: rays are cast against every cube of the rest pose, so armpits,
    jaw hinges and the gaps between limbs darken the way a hand-painted texture would;
  * material patterns: worley cells (wool curls, scales, crazed porcelain), vein networks
    (with their own subsurface/emissive values), fissures (bark grain), grime in crevices,
    pooled wetness (glossier in occluded areas) and per-face bevel highlights.
"""
import math
import zlib

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

    Optional patterns (dicts):
    cells:   dict(scale, weight, edge, edge_delta, mode) worley noise. mode "bulge" brightens cell
             centres (wool curls, blisters); "crack" darkens cell borders (porcelain, dry mud, scales).
    veins:   dict(scale, threshold, ramp, mers, stretch, height) branching lines from ridged noise.
    fissure: dict(scale, stretch, threshold, delta) dark grain lines along a stretched axis (bark).
    grime:   dict(color, strength) colour pulled into occluded texels (dirt, old blood, silt).
    wet:     roughness reduction (0..255) applied in occluded/low texels (mucus, mud, water).
    bevel:   per-face border highlight/shadow in texels (convex edge wear).
    """

    def __init__(self, ramp, base=0.5, noise=(0.35, 0.35, 3), streak=None, spots=None,
                 speckle=(0.06, -0.12), ao=0.25, edge=0.06, mers=(0, 0, 230, 0), rough_var=20,
                 height_strength=0.6, alpha=255, dither=0.0, contrast=1.0,
                 cells=None, veins=None, fissure=None, grime=None, wet=0, bevel=0.0, detail=0.0):
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
        self.cells = cells
        self.veins = veins
        self.fissure = fissure
        self.grime = grime
        self.wet = wet
        self.bevel = bevel
        self.detail = detail


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


# ----------------------------------------------------------------------------- worley noise

def worley(P, scale, seed=0):
    """F1 and F2 distances (in cell units) to jittered feature points; 3D, tileless."""
    Q = np.asarray(P, float) * scale
    base = np.floor(Q).astype(np.int64)
    f1 = np.full(len(Q), 9.0)
    f2 = np.full(len(Q), 9.0)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                c = base + np.array([dx, dy, dz])
                jit = np.stack([hash01(c, seed + 11 + i) for i in range(3)], 1)
                d = np.linalg.norm(Q - (c + jit), axis=1)
                f2 = np.where(d < f1, f1, np.minimum(f2, d))
                f1 = np.minimum(f1, d)
    return f1, f2


# ----------------------------------------------------------------------------- baked AO

class _Occluders:
    """Oriented boxes of the rest pose for ray-cast ambient occlusion."""

    def __init__(self, model, skip_tags=(), skip_bones=()):
        mats = model.bone_matrices()
        inv, lo, hi = [], [], []
        for c in model.all_cubes():
            if c.tag in skip_tags or c.bone in skip_bones:
                continue
            M = mats[c.bone] @ c.cube_matrix()
            x0, y0, z0, x1, y1, z1 = c.corners()
            # very thin cubes (strands, teeth) barely occlude; skip them to avoid speckled AO
            if min(x1 - x0, y1 - y0, z1 - z0) < 0.35:
                continue
            inv.append(np.linalg.inv(M))
            lo.append((x0, y0, z0))
            hi.append((x1, y1, z1))
        self.inv = np.array(inv)
        self.lo = np.array(lo)
        self.hi = np.array(hi)

    def occlusion(self, O, D, maxd):
        """O, D: (N,3) world ray origins/directions. Returns nearest hit distance (inf if none)."""
        best = np.full(len(O), np.inf)
        for Minv, lo, hi in zip(self.inv, self.lo, self.hi):
            o = O @ Minv[:3, :3].T + Minv[:3, 3]
            d = D @ Minv[:3, :3].T
            with np.errstate(divide="ignore", invalid="ignore"):
                inv_d = 1.0 / np.where(np.abs(d) < 1e-9, 1e-9, d)
                t0 = (lo - o) * inv_d
                t1 = (hi - o) * inv_d
            tmin = np.max(np.minimum(t0, t1), axis=1)
            tmax = np.min(np.maximum(t0, t1), axis=1)
            hit = (tmax >= np.maximum(tmin, 0.0)) & (tmin < maxd) & (tmax > 0.02)
            tm = np.where(tmin > 0, tmin, 0.0)
            best = np.where(hit & (tm < best), tm, best)
        return best


def _hemisphere(n_rays, seed):
    rng = np.random.default_rng(seed)
    # stratified cosine-weighted directions around +Z
    k = int(math.ceil(math.sqrt(n_rays)))
    u = (np.arange(k)[:, None] + rng.random((k, k))) / k
    v = (np.arange(k)[None, :] + rng.random((k, k))) / k
    u, v = u.ravel()[:n_rays], v.ravel()[:n_rays]
    r = np.sqrt(u)
    th = 2 * math.pi * v
    return np.stack([r * np.cos(th), r * np.sin(th), np.sqrt(np.maximum(0, 1 - u))], 1)


def _basis(n):
    a = np.array([1.0, 0, 0]) if abs(n[0]) < 0.9 else np.array([0, 1.0, 0])
    t = np.cross(n, a)
    t /= np.linalg.norm(t)
    b = np.cross(n, t)
    return t, b


class Painter:
    def __init__(self, model, materials, features=(), seed=1, light_dir=(0.3, 1.0, -0.4),
                 scale=1, ao_rays=0, ao_dist=7.0, ao_strength=0.55, ao_skip=()):
        self.model = model
        self.materials = materials
        self.features = list(features)
        self.noise = Noise3(seed)
        self.noise2 = Noise3(seed + 101)
        self.noise3 = Noise3(seed + 202)
        self.seed = seed
        self.scale = int(scale)
        self.ao_rays = ao_rays
        self.ao_dist = ao_dist
        self.ao_strength = ao_strength
        # bones hidden in the rest pose (folded true forms): they neither cast nor receive AO
        self.ao_skip = set()
        for b in ao_skip:
            self.ao_skip |= self._descendants(model, b)

    @staticmethod
    def _descendants(model, name):
        out = {name}
        changed = True
        while changed:
            changed = False
            for n, b in model.bones.items():
                if b.parent in out and n not in out:
                    out.add(n)
                    changed = True
        return out

    # ------------------------------------------------------------------ AO
    def _bake_ao(self, c, M, face, P, N):
        if not self.ao_rays or c.bone in self.ao_skip:
            return np.ones(len(P))
        Pw = P @ M[:3, :3].T + M[:3, 3]
        Nw = M[:3, :3] @ N
        Nw = Nw / np.linalg.norm(Nw)
        t, b = _basis(Nw)
        dirs = _hemisphere(self.ao_rays, self.seed + zlib.crc32(f"{c.bone}/{face}".encode()) % 9973)
        Dw = dirs[:, 0:1] * t + dirs[:, 1:2] * b + dirs[:, 2:3] * Nw
        n = len(Pw)
        O = np.repeat(Pw + Nw * 0.04, len(Dw), axis=0)
        D = np.tile(Dw, (n, 1))
        hit = self._occ.occlusion(O, D, self.ao_dist)
        # distance-weighted: near hits occlude fully, far ones fade
        occ = np.where(np.isfinite(hit), 1.0 - np.clip(hit / self.ao_dist, 0, 1) ** 0.7, 0.0)
        return 1.0 - occ.reshape(n, len(Dw)).mean(1)

    def paint(self):
        m = self.model
        k = self.scale
        m.texel_scale = k
        W, H = m.layout()
        color = np.zeros((H * k, W * k, 4), dtype=np.uint8)
        mers = np.zeros((H * k, W * k, 4), dtype=np.uint8)
        height = np.full((H * k, W * k), 128, dtype=np.uint8)
        ys = []
        for c in m.all_cubes():
            ys += [c.origin[1], c.origin[1] + c.size[1]]
        ymin, ymax = min(ys), max(ys)
        mats = m.bone_matrices() if self.ao_rays else None
        if self.ao_rays:
            self._occ = _Occluders(m, skip_bones=self.ao_skip)

        for c in m.all_cubes():
            mat = self.materials[c.material]
            M = mats[c.bone] @ c.cube_matrix() if mats else None
            for face, (u0, v0, fw, fh) in c.face_rects().items():
                if face in c.skip:
                    continue
                FW, FH = fw * k, fh * k
                iu, iv = np.meshgrid(np.arange(FW), np.arange(FH))
                iu, iv = iu.ravel(), iv.ravel()
                fu = (iu + 0.5) / FW
                fv = (iv + 0.5) / FH
                Pw, Nw = c.local_point(face, fu, fv)
                ao = self._bake_ao(c, M, face, Pw, Nw) if M is not None else np.ones(len(Pw))
                ctx = dict(face=face, iu=iu, iv=iv, fw=FW, fh=FH, ymin=ymin, ymax=ymax, ao=ao)
                rgb, a, pbr, hgt = self._shade(mat, Pw, Nw, ctx)
                for ft in self.features:
                    if ft.faces and face not in ft.faces:
                        continue
                    if ft.bones and c.bone not in ft.bones:
                        continue
                    inside = ft.inside(Pw)
                    if not inside.any():
                        continue
                    if ft.material is not None:
                        r2, a2, p2, h2 = self._shade(self.materials[ft.material], Pw, Nw, ctx)
                        rgb[inside], a[inside], pbr[inside], hgt[inside] = r2[inside], a2[inside], p2[inside], h2[inside]
                    if ft.color is not None:
                        # decals keep a little of the baked occlusion so they sit in the surface
                        shade = (0.75 + 0.25 * ao[inside])[:, None] if self.ao_rays else 1.0
                        rgb[inside] = ft.color * shade
                    if ft.mers is not None:
                        pbr[inside] = ft.mers
                    if ft.alpha is not None:
                        a[inside] = ft.alpha
                    if ft.height is not None:
                        hgt[inside] = ft.height
                ys_, xs_ = v0 * k + iv, u0 * k + iu
                color[ys_, xs_, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
                color[ys_, xs_, 3] = a
                mers[ys_, xs_] = np.clip(pbr, 0, 255).astype(np.uint8)
                height[ys_, xs_] = np.clip(hgt, 0, 255).astype(np.uint8)
        return color, mers, height

    def _shade(self, mat, P, N, ctx):
        face, iu, iv, fw, fh = ctx["face"], ctx["iu"], ctx["iv"], ctx["fw"], ctx["fh"]
        ymin, ymax, ao = ctx["ymin"], ctx["ymax"], ctx["ao"]
        k = self.scale
        n = len(P)
        v = np.full(n, mat.base)
        sc, wt, octv = mat.noise
        if wt:
            v += wt * self.noise.fbm(P, octaves=octv, scale=sc)
        if mat.detail and k > 1:
            v += mat.detail * self.noise3.fbm(P, octaves=2, scale=sc * 3.0)
        if mat.streak:
            sx, sy, sz, sw = mat.streak
            v += sw * self.noise2.fbm(P * np.array([sx, sy, sz]), octaves=2)
        height_extra = np.zeros(n)
        if mat.cells:
            cl = mat.cells
            f1, f2 = worley(P, cl["scale"], self.seed)
            if cl.get("mode", "bulge") == "bulge":
                bump = np.clip(1.0 - f1 * 1.25, 0, 1)
                v += cl.get("weight", 0.25) * (bump - 0.45)
                height_extra += bump * 70
            else:
                edge = (f2 - f1) < cl.get("edge", 0.08)
                v[edge] += cl.get("edge_delta", -0.3)
                height_extra[edge] -= 60
        if mat.fissure:
            fs = mat.fissure
            st = np.array(fs.get("stretch", (1.0, 0.15, 1.0)))
            r = self.noise3.ridged(P * st, octaves=2, scale=fs["scale"])
            line = r > fs.get("threshold", 0.965)
            v[line] += fs.get("delta", -0.3)
            height_extra[line] -= 70
        if mat.contrast != 1.0:
            v = 0.5 + (v - 0.5) * mat.contrast
        shade = {"up": 0.07, "down": -0.14, "north": 0.0, "south": -0.03, "east": -0.02, "west": -0.02}[face]
        v += shade
        if mat.ao:
            rel = (P[:, 1] - ymin) / max(ymax - ymin, 1e-6)
            v -= mat.ao * (1 - rel) ** 2 * 0.5
        if self.ao_rays:
            v -= self.ao_strength * (1.0 - ao) * (0.6 + 0.4 * mat.base)
        if mat.edge and face not in ("up", "down"):
            v[iv < k] += mat.edge
            if fh > 2 * k:
                v[iv >= fh - k] -= mat.edge * 1.2
        if mat.bevel and fw > 2 * k and fh > 2 * k:
            border = (iu < k) | (iv < k) | (iu >= fw - k) | (iv >= fh - k)
            v[border & (iv < fh // 2)] += mat.bevel
            v[border & (iv >= fh // 2)] -= mat.bevel * 0.6
        if mat.speckle:
            prob, delta = mat.speckle
            h = hash01(P * k + 0.5, self.seed)
            v[h < prob] += delta
        raw = v.copy()
        rp = mat.ramp
        nr = len(rp)
        if mat.dither:
            thr = ((iu % 2) * 2 + (iv % 2)) / 4.0 - 0.375
            v = v + thr * mat.dither / nr
        idx = np.clip(np.round(v * (nr - 1)), 0, nr - 1).astype(int)
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
        if mat.veins:
            vn = mat.veins
            st = np.array(vn.get("stretch", (1.0, 1.0, 1.0)))
            r = self.noise3.ridged(P * st + 13.0, octaves=3, scale=vn["scale"])
            mask = r > vn.get("threshold", 0.975)
            if mask.any():
                vr = vn["ramp"]
                vk = len(vr)
                t = np.clip((r[mask] - vn.get("threshold", 0.975)) / max(1e-6, 1 - vn.get("threshold", 0.975)), 0, 1)
                rgb[mask] = vr[np.clip((t * (vk - 1) + 0.5).astype(int), 0, vk - 1)]
                if "mers" in vn:
                    pbr[mask] = vn["mers"]
                height_extra[mask] += vn.get("height", 40)
        if mat.grime and self.ao_rays:
            g = mat.grime
            w = np.clip((1.0 - ao) * g.get("strength", 0.6) * 1.6, 0, 1)[:, None]
            rgb = rgb * (1 - w) + hexrgb(g["color"]) * w
        if mat.wet and self.ao_rays:
            pbr[:, 2] -= mat.wet * np.clip((1.0 - ao) * 1.8, 0, 1)
        hgt = 128 + mat.height_strength * (raw - 0.5) * 200 + height_extra * mat.height_strength
        return rgb, a, pbr, hgt


def save_rgba(arr, path):
    Image.fromarray(arr, "RGBA").save(path, optimize=True)


def save_l(arr, path):
    Image.fromarray(arr, "L").save(path, optimize=True)
