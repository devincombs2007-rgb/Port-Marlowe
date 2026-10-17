"""Procedural texture for THE MIMIC (128x64). The disguise is painted as plausible livestock with one wrong detail you
only catch on a second look (an extra pair of eyes low on the face). The true form is waxy, pale and wet."""
import numpy as np
from PIL import Image
from geo import Model
from lurker_texture import vnoise

PAL = {
    "hide_w": ((214, 206, 196), (150, 142, 134), (236, 232, 224)),
    "hide_b": ((36, 30, 28), (16, 12, 12), (70, 62, 58)),
    "horn": ((206, 196, 170), (130, 120, 100), (230, 224, 206)),
    "flesh": ((196, 168, 160), (120, 92, 90), (226, 206, 198)),
    "rib": ((214, 204, 184), (140, 128, 110), (236, 230, 214)),
    "hoof": ((40, 34, 30), (18, 14, 12), (70, 60, 52)),
}


def cat(name):
    if name.startswith("d_horn"):
        return "horn"
    if name.startswith("d_leg"):
        return "hide_w"
    if name.startswith("d_"):
        return "patchy"
    if name.startswith("t_rib"):
        return "rib"
    return "flesh"


def paint(model: Model, seed=777):
    r = np.random.default_rng(seed)
    img = np.zeros((model.th, model.tw, 3), float)
    img[:] = (12, 8, 8)
    for bone, c in model.all_cubes():
        kind = cat(c.name)
        for face, (x, y, w, h) in Model.faces(c).items():
            n = 0.5 * vnoise(r, w, h, 3) + 0.3 * vnoise(r, w, h, 2) + 0.2 * r.random((h, w))
            t = n[..., None]
            if kind == "patchy":
                patches = (vnoise(r, w, h, 5) > 0.55)[..., None]
                w_base, w_sh, w_hi = (np.array(p, float) for p in PAL["hide_w"])
                b_base, b_sh, b_hi = (np.array(p, float) for p in PAL["hide_b"])
                white = w_sh + (w_base - w_sh) * np.clip(t * 1.5, 0, 1)
                black = b_sh + (b_base - b_sh) * np.clip(t * 1.5, 0, 1)
                col = np.where(patches, black, white)
            else:
                base, shadow, hi = (np.array(p, float) for p in PAL[kind])
                col = shadow + (base - shadow) * np.clip(t * 1.5, 0, 1) + (hi - base) * np.clip((t - 0.72) * 2.4, 0, 1)
                if kind == "flesh":  # wet sheen and dark veins
                    for _ in range(max(1, (w * h) // 60)):
                        vx, vy = r.integers(0, w), r.integers(0, h)
                        for _ in range(r.integers(3, 9)):
                            col[vy, vx] = col[vy, vx] * 0.5 + np.array([70, 40, 60]) * 0.5
                            vx = int(np.clip(vx + r.integers(-1, 2), 0, w - 1)); vy = int(np.clip(vy + 1, 0, h - 1))
            if c.name.startswith("d_leg"):
                col[-2:, :] = PAL["hoof"][0]  # hooves
            shade = 1.08 if face == "up" else 0.72 if face == "down" else 1.0
            occ = np.ones((h, w)); occ[0, :] *= 0.8; occ[-1, :] *= 0.8; occ[:, 0] *= 0.86; occ[:, -1] *= 0.86
            img[y:y + h, x:x + w] = col * shade * occ[..., None]

    def face(name, f):
        c = next(cc for _, cc in model.all_cubes() if cc.name == name)
        return Model.faces(c)[f]

    # cow face: two eyes on the sides like a real cow ... and two more on the front, low, where none should be
    for side in ("east", "west"):
        x, y, w, h = face("d_skull", side)
        img[y + 2, x + w // 2] = (10, 8, 8)
    x, y, w, h = face("d_skull", "north")
    img[y + 5, x + 2] = (10, 8, 8)
    img[y + 5, x + w - 3] = (10, 8, 8)
    img[y + 5, x + 2 + 1] = (180, 170, 150)
    x, y, w, h = face("d_muzzle", "north")
    img[y:y + h, x:x + w] = img[y:y + h, x:x + w] * 0.3 + np.array([170, 120, 120]) * 0.7
    img[y + 1, x + 1] = img[y + 1, x + w - 2] = (40, 20, 20)  # nostrils
    # true head: smooth, featureless but for the dark vertical split of the mouth
    x, y, w, h = face("t_head", "north")
    img[y + 1:y + h - 1, x + w // 2 - 1:x + w // 2 + 1] = (54, 8, 14)
    for name in ("t_lip_r", "t_lip_l"):
        x, y, w, h = face(name, "north")
        img[y:y + h, x:x + w] = (150, 96, 96)
    return Image.fromarray(np.clip(img, 0, 255).astype("uint8"), "RGB")
