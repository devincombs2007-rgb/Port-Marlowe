"""Procedural texture for THE GAUNT (128x128): flayed red-brown sinew, grey hide in tatters, bone plates and skull,
dark wet mouth. Same face-aware painting approach as the Lurker; an intermediate base for hand painting."""
import numpy as np
from PIL import Image
from geo import Model
from lurker_texture import vnoise

PAL = {
    "sinew": ((96, 46, 40), (44, 20, 18), (150, 84, 70)),
    "hide": ((70, 66, 62), (34, 32, 30), (112, 106, 98)),
    "bone": ((196, 186, 160), (110, 98, 78), (232, 226, 206)),
    "tooth": ((222, 214, 190), (150, 140, 116), (246, 242, 228)),
    "claw": ((40, 34, 30), (14, 12, 10), (84, 74, 64)),
}


def cat(name):
    if name.startswith(("skull", "snout", "plate", "brow", "rib")):
        return "bone"
    if name.startswith("tooth"):
        return "tooth"
    if name.startswith("claw"):
        return "claw"
    if name.startswith(("pelvis", "thigh", "upper_arm", "neck", "ribcage")):
        return "hide"
    return "sinew"


def paint(model: Model, seed=4242):
    r = np.random.default_rng(seed)
    img = np.zeros((model.th, model.tw, 3), float)
    img[:] = (10, 6, 6)
    for bone, c in model.all_cubes():
        kind = cat(c.name)
        base, shadow, hi = (np.array(p, float) for p in PAL[kind])
        for face, (x, y, w, h) in Model.faces(c).items():
            n = 0.5 * vnoise(r, w, h, 3) + 0.3 * vnoise(r, w, h, 2) + 0.2 * r.random((h, w))
            t = n[..., None]
            col = shadow + (base - shadow) * np.clip(t * 1.5, 0, 1) + (hi - base) * np.clip((t - 0.72) * 2.4, 0, 1)
            if kind == "hide":
                # torn hide: holes showing sinew underneath
                holes = vnoise(r, w, h, 2) > 0.68
                sin = np.array(PAL["sinew"][0], float)
                col[holes] = col[holes] * 0.25 + sin * 0.75
            if kind == "sinew":
                # muscle striations along the limb's length
                stri = (np.sin(np.arange(w)[None, :] * 2.1 + r.random() * 6) * 0.12 + 1.0)[..., None]
                col = col * stri
            shade = 1.08 if face == "up" else 0.7 if face == "down" else 1.0
            col *= shade
            occ = np.ones((h, w)); occ[0, :] *= 0.78; occ[-1, :] *= 0.78; occ[:, 0] *= 0.85; occ[:, -1] *= 0.85
            img[y:y + h, x:x + w] = col * occ[..., None]

    # mouth interiors: inner faces of jaw and the underside of skull are wet and dark
    for name, face in (("jaw", "up"), ("skull", "down"), ("snout", "down")):
        c = next(cc for _, cc in model.all_cubes() if cc.name == name)
        x, y, w, h = Model.faces(c)[face]
        img[y:y + h, x:x + w] = img[y:y + h, x:x + w] * 0.2 + np.array([70, 10, 14]) * 0.8
    # eyeless: two shallow scarred pits where eyes would be
    c = next(cc for _, cc in model.all_cubes() if cc.name == "skull")
    x, y, w, h = Model.faces(c)["north"]
    for px in (1, w - 3):
        img[y + 1:y + 3, x + px:x + px + 2] *= 0.45
    return Image.fromarray(np.clip(img, 0, 255).astype("uint8"), "RGB")
