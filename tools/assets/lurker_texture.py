"""Procedural texture for THE LURKER (128x64). Painted per box-UV face so every cube gets believable material,
edge occlusion and detail. This is an intermediate: hand-painting in Blockbench/Aseprite over this base is the
intended path to final art (the UV layout is stable and documented in the geometry)."""
import numpy as np
from PIL import Image
from geo import Model

PAL = {
    "skin": ((92, 100, 98), (58, 66, 66), (150, 156, 148)),   # base, shadow, highlight (pallid grey-green)
    "bone": ((176, 168, 148), (96, 88, 72), (214, 208, 188)),
    "bark": ((52, 40, 32), (24, 18, 14), (96, 80, 62)),
    "dark": ((18, 20, 22), (6, 6, 8), (34, 38, 40)),
}


def cat(name):
    if name.startswith(("rib", "toe", "finger", "muzzle", "jaw")) or name in ("skull",):
        return "bone" if name.startswith(("rib", "toe", "finger")) or name == "jaw" else "skin"
    if name.startswith(("branch", "twig", "thorn")):
        return "bark"
    return "skin"


def vnoise(r, w, h, cell):
    gw, gh = w // cell + 2, h // cell + 2
    g = r.random((gh, gw))
    ys, xs = np.linspace(0, gh - 1.001, h), np.linspace(0, gw - 1.001, w)
    y0, x0 = ys.astype(int), xs.astype(int)
    fy, fx = (ys - y0)[:, None], (xs - x0)[None, :]
    a, b = g[y0][:, x0], g[y0][:, x0 + 1]
    c, d = g[y0 + 1][:, x0], g[y0 + 1][:, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def paint(model: Model, seed=1337):
    r = np.random.default_rng(seed)
    img = np.zeros((model.th, model.tw, 3), dtype=float)
    img[:] = PAL["dark"][0]
    for bone, c in model.all_cubes():
        kind = cat(c.name)
        base, shadow, hi = (np.array(p, float) for p in PAL[kind])
        for face, (x, y, w, h) in Model.faces(c).items():
            if w <= 0 or h <= 0:
                continue
            n = 0.55 * vnoise(r, w, h, 3) + 0.30 * vnoise(r, w, h, 2) + 0.15 * r.random((h, w))
            t = n[..., None]
            col = shadow + (base - shadow) * np.clip(t * 1.6, 0, 1) + (hi - base) * np.clip((t - 0.7) * 2.2, 0, 1)
            # vertical gradient: darker toward the feet / underside, a faint wet sheen on top faces
            gy = np.linspace(1.0, 0.72, h)[:, None, None] if face not in ("up", "down") else 1.0
            col = col * gy * (1.12 if face == "up" else 0.8 if face == "down" else 1.0)
            # fake edge occlusion
            occ = np.ones((h, w))
            occ[0, :] *= 0.8; occ[-1, :] *= 0.8; occ[:, 0] *= 0.86; occ[:, -1] *= 0.86
            col = col * occ[..., None]
            if kind == "skin":  # veins: thin dark blue-purple meandering lines
                for _ in range(max(1, (w * h) // 90)):
                    vx, vy = r.integers(0, w), r.integers(0, h)
                    for _ in range(r.integers(4, 12)):
                        col[vy, vx] = col[vy, vx] * 0.45 + np.array([40, 36, 64]) * 0.55
                        vx = int(np.clip(vx + r.integers(-1, 2), 0, w - 1)); vy = int(np.clip(vy + r.integers(0, 2), 0, h - 1))
            if c.name.startswith("rib"):  # ribs: bone with a dark gap line below
                col[-1, :] = (30, 24, 20)
            img[y : y + h, x : x + w] = col

    # ---- face (skull north face): hollow sockets with cold pin-lights, nostril slits ----------
    skull = next(c for _, c in model.all_cubes() if c.name == "skull")
    fx, fy, fw, fh = Model.faces(skull)["north"]
    sock = [(1, 3), (fw - 3, 3)]
    for sx, sy in sock:
        img[fy + sy : fy + sy + 3, fx + sx : fx + sx + 2] = (4, 4, 6)
        img[fy + sy + 2, fx + sx + 1] = (196, 214, 230)  # the eye: one cold pin-light
    # brow shadow
    img[fy + 2, fx + 1 : fx + fw - 1] *= 0.55
    muz = next(c for _, c in model.all_cubes() if c.name == "muzzle")
    mx, my, mw, mh = Model.faces(muz)["north"]
    img[my + 1 : my + 3, mx + 1] = (6, 6, 8)
    img[my + 1 : my + 3, mx + mw - 2] = (6, 6, 8)           # nostril slits
    # mouth: dark gap with a row of teeth on the jaw's front, ragged
    jaw = next(c for _, c in model.all_cubes() if c.name == "jaw")
    jx, jy, jw, jh = Model.faces(jaw)["north"]
    img[jy : jy + 1, jx : jx + jw] = (8, 6, 6)
    for k in range(0, jw, 1):
        img[jy + 1 : jy + 1 + (1 + (k % 2)), jx + k] = (206, 200, 178)
    # thorns / branches get pale tips
    for _, c in model.all_cubes():
        if c.name.startswith(("branch", "twig")):
            for face, (x, y, w, h) in Model.faces(c).items():
                if face in ("north", "south", "east", "west") and h > 2:
                    img[y : y + 1, x : x + w] = (120, 104, 86)
    return Image.fromarray(np.clip(img, 0, 255).astype("uint8"), "RGB")
