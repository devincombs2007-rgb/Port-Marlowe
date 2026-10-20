"""Tiny software rasteriser for previewing generated geometry + atlases.

Used only for art review during development (the game renders the real thing).
"""
import copy
import math
import numpy as np
from PIL import Image, ImageDraw


def _look(yaw, pitch):
    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
    # camera direction: start looking toward +Z (at the model's north/front face from -Z side)
    fwd = np.array([sy * cp, -sp, cy * cp])
    right = np.cross(fwd, np.array([0, 1.0, 0]))
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    return fwd, right, up


def render(model, atlas, pose=None, yaw=25, pitch=12, size=512, fov=32, light=(-0.4, 0.8, -0.6),
           bg=((38, 44, 52), (16, 18, 22)), dist_scale=1.0, ambient=0.45, focus=None):
    H, W = atlas.shape[:2]
    mats = model.bone_matrices(pose)
    # gather quads
    quads = []
    for c in model.all_cubes():
        M = mats[c.bone] @ c.cube_matrix()
        cc = copy.copy(c)
        inf = c.inflate
        cc.origin = [o - inf for o in c.origin]
        cc.size = [s + 2 * inf for s in c.size]
        for face, (u0, v0, fw, fh) in c.face_rects().items():
            if face in c.skip:
                continue
            fu = np.array([0.0, 1.0, 1.0, 0.0])
            fv = np.array([0.0, 0.0, 1.0, 1.0])
            P, N = cc.local_point(face, fu, fv)
            Pw = (M[:3, :3] @ P.T).T + M[:3, 3]
            Nw = M[:3, :3] @ N
            quads.append((Pw, Nw, (u0, v0, fw, fh)))
    if not quads:
        return Image.new("RGB", (size, size))
    allp = np.concatenate([q[0] for q in quads])
    lo, hi = allp.min(0), allp.max(0)
    center = (lo + hi) / 2
    radius = np.linalg.norm(hi - lo) / 2
    if focus is not None:
        center, radius = np.array(focus[0], float), float(focus[1])
    fwd, right, up = _look(yaw, pitch)
    dist = radius / math.tan(math.radians(fov / 2)) * 1.05 * dist_scale
    cam = center - fwd * dist
    f = (size / 2) / math.tan(math.radians(fov / 2))

    img = np.zeros((size, size, 3))
    # background gradient
    top, bot = np.array(bg[0], float), np.array(bg[1], float)
    t = np.linspace(0, 1, size)[:, None]
    img[:] = (top * (1 - t) + bot * t)[:, None, :]
    zbuf = np.full((size, size), np.inf)
    L = np.array(light, float)
    L /= np.linalg.norm(L)

    def project(P):
        d = P - cam
        x = d @ right
        y = d @ up
        z = d @ fwd
        return np.stack([size / 2 + f * x / z, size / 2 - f * y / z, z], 1)

    for Pw, Nw, (u0, v0, fw, fh) in quads:
        if (Nw @ (Pw[0] - cam)) > 0:  # back-face cull
            continue
        S = project(Pw)
        if np.any(S[:, 2] <= 0.01):
            continue
        lum = ambient + (1 - ambient) * max(0.0, float(Nw @ L))
        uvs = np.array([[0, 0], [1, 0], [1, 1], [0, 1]], float)
        for tri in ((0, 1, 2), (0, 2, 3)):
            p = S[list(tri)]
            uv = uvs[list(tri)]
            xmin, xmax = int(max(0, math.floor(p[:, 0].min()))), int(min(size - 1, math.ceil(p[:, 0].max())))
            ymin, ymax = int(max(0, math.floor(p[:, 1].min()))), int(min(size - 1, math.ceil(p[:, 1].max())))
            if xmin > xmax or ymin > ymax:
                continue
            xs, ys = np.meshgrid(np.arange(xmin, xmax + 1) + 0.5, np.arange(ymin, ymax + 1) + 0.5)
            (x0, y0), (x1, y1), (x2, y2) = p[0, :2], p[1, :2], p[2, :2]
            den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
            if abs(den) < 1e-9:
                continue
            w0 = ((y1 - y2) * (xs - x2) + (x2 - x1) * (ys - y2)) / den
            w1 = ((y2 - y0) * (xs - x2) + (x0 - x2) * (ys - y2)) / den
            w2 = 1 - w0 - w1
            m = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
            if not m.any():
                continue
            # perspective-correct interpolation
            iz = w0 / p[0, 2] + w1 / p[1, 2] + w2 / p[2, 2]
            z = 1 / iz
            fu = (w0 * uv[0, 0] / p[0, 2] + w1 * uv[1, 0] / p[1, 2] + w2 * uv[2, 0] / p[2, 2]) * z
            fvv = (w0 * uv[0, 1] / p[0, 2] + w1 * uv[1, 1] / p[1, 2] + w2 * uv[2, 1] / p[2, 2]) * z
            tx = np.clip((u0 + np.clip(fu, 0, 0.9999) * fw).astype(int), 0, W - 1)
            ty = np.clip((v0 + np.clip(fvv, 0, 0.9999) * fh).astype(int), 0, H - 1)
            texel = atlas[ty, tx]
            m &= texel[..., 3] > 127
            yy = (ys[m] - 0.5).astype(int)
            xx = (xs[m] - 0.5).astype(int)
            zz = z[m]
            closer = zz < zbuf[yy, xx]
            yy, xx, zz = yy[closer], xx[closer], zz[closer]
            col = texel[m][closer][:, :3].astype(float) * lum
            zbuf[yy, xx] = zz
            img[yy, xx] = col
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def sheet(model, atlas, path, poses=None, views=((25, 10), (90, 5), (180 + 30, 10), (-35, 35)),
          size=360, label=None, emissive=None):
    poses = poses or [None]
    tiles = []
    for pose in poses:
        for yaw, pitch in views:
            tiles.append(render(model, atlas, pose=pose, yaw=yaw, pitch=pitch, size=size))
    cols = len(views)
    rows = len(poses)
    out = Image.new("RGB", (cols * size, rows * size + (24 if label else 0)), (10, 10, 12))
    for i, t in enumerate(tiles):
        out.paste(t, ((i % cols) * size, (i // cols) * size + (24 if label else 0)))
    if label:
        ImageDraw.Draw(out).text((8, 5), label, fill=(220, 220, 220))
    out.save(path)
    return out
