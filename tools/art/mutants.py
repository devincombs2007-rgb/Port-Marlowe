"""THE HOLLOW: Varrow Mutations - an island-only resource pack that repaints the game's own animals
and monsters as seventy years of fallout would have left them.

Every vanilla mob texture that can turn up on the island (cows, pigs, sheep, chickens, rabbits,
armadillos, horses, goats, foxes, frogs, parrots, cats, wolves, zombies, husks, drowned, skeletons,
strays, spiders, creepers, slimes, endermen...) is taken from Mojang's bedrock-samples (v1.26.50.4)
and mutated: washed-out, sickly colour; raw lesions with dark rims; tumours; bald patches in fur and
wool; a few pinprick pustules that glow green. Alpha is kept exactly (some textures use it as a
mask), so models, tinting and animation are untouched. The pack ships only inside the Varrow Island
world, so the add-on's forest story elsewhere keeps the normal animals.

Run:  (once) clone bedrock-samples into build/vanilla/samples (see SOURCE), then python3 tools/art/mutants.py
"""
import json
import os
import sys
import uuid

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import ROOT, ensure  # noqa: E402

SOURCE = os.path.join(ROOT, "build", "vanilla", "samples", "resource_pack")
PACK = os.path.join(ROOT, "packs", "varrow_mutations")
NS = uuid.UUID("8f1d1f7e-4a6e-4c55-9a51-1b7f2a3d0c11")
VERSION = [2, 0, 0]
FURRY = ("sheep", "rabbit", "fox", "goat", "llama", "wolf", "cat", "cow", "horse", "armadillo")


def mutate(rgba, seed, furry):
    rng = np.random.default_rng(seed)
    img = rgba.astype(np.float64)
    a = rgba[..., 3]
    solid = a > 0
    h, w = a.shape
    rgb = img[..., :3]
    # washed out and sick: lose a third of the saturation, drift toward grey-green, a little darker
    grey = rgb.mean(axis=2, keepdims=True)
    rgb = rgb * 0.5 + grey * 0.5
    rgb = rgb * 0.74 + np.array([92, 118, 66]) * 0.26
    rgb *= 0.9
    ys, xs = np.nonzero(solid)
    if len(ys) == 0:
        return rgba
    area = len(ys)
    scale = max(1, w // 64)

    def blob(cy, cx, r):
        y0, y1 = max(0, int(cy - r - 1)), min(h, int(cy + r + 2))
        x0, x1 = max(0, int(cx - r - 1)), min(w, int(cx + r + 2))
        yy, xx = np.mgrid[y0:y1, x0:x1]
        d = np.hypot(yy - cy, xx - cx)
        return (slice(y0, y1), slice(x0, x1)), d

    # raw lesions: pink-red centres, dark crusted rims
    for _ in range(max(4, area // 85)):
        i = rng.integers(len(ys))
        r = rng.uniform(1.0, 2.8) * scale
        sl, d = blob(ys[i], xs[i], r)
        m = solid[sl]
        core = (d <= r * 0.6) & m
        rim = (d > r * 0.6) & (d <= r) & m
        flesh = np.array([rng.uniform(170, 215), rng.uniform(70, 110), rng.uniform(70, 100)])
        rgb[sl][core] = flesh
        rgb[sl][rim] = rgb[sl][rim] * 0.45 + np.array([70, 25, 25]) * 0.55
    # bald patches in fur and wool: bare, blotchy skin
    if furry:
        for _ in range(max(2, area // 220)):
            i = rng.integers(len(ys))
            r = rng.uniform(1.2, 2.8) * scale
            sl, d = blob(ys[i], xs[i], r)
            m = (d <= r) & solid[sl]
            skin = np.array([196, 150, 140]) + rng.normal(0, 10, (int(m.sum()), 3))
            rgb[sl][m] = np.clip(skin, 0, 255)
    # tumours: dark swellings with a shiny top
    for _ in range(max(2, area // 260)):
        i = rng.integers(len(ys))
        cy, cx = ys[i], xs[i]
        r = rng.uniform(1.2, 2.2) * scale
        sl, d = blob(cy, cx, r)
        m = (d <= r) & solid[sl]
        rgb[sl][m] = np.array([88, 70, 84])
        if 0 <= cy - 1 < h and solid[int(cy) - 1, int(cx)]:
            rgb[int(cy) - 1, int(cx)] = np.array([150, 128, 140])
    # dark veins crawling out of the sores
    for _ in range(max(2, area // 300)):
        i = rng.integers(len(ys))
        y, x = float(ys[i]), float(xs[i])
        ang = rng.uniform(0, 2 * np.pi)
        for _ in range(int(rng.integers(4, 9)) * scale):
            ang += rng.normal(0, 0.6)
            y, x = y + np.sin(ang), x + np.cos(ang)
            iy, ix = int(round(y)), int(round(x))
            if 0 <= iy < h and 0 <= ix < w and solid[iy, ix]:
                rgb[iy, ix] = rgb[iy, ix] * 0.35 + np.array([70, 20, 40]) * 0.65
    # a stray extra eye or two
    for _ in range(int(rng.integers(0, 3))):
        i = rng.integers(len(ys))
        cy, cx = int(ys[i]), int(xs[i])
        if 0 < cy < h - 1 and 0 < cx < w - 1 and solid[cy - 1:cy + 2, cx - 1:cx + 2].all():
            rgb[cy - 1:cy + 2, cx - 1:cx + 2] = np.array([60, 40, 40])
            rgb[cy, cx] = np.array([220, 210, 120])
    # pinprick pustules that glow
    for _ in range(max(3, area // 380)):
        i = rng.integers(len(ys))
        rgb[ys[i], xs[i]] = np.array([170, 255, 90])
    out = rgba.copy()
    out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    out[~solid, :3] = rgba[~solid, :3]
    return out


def manifest():
    return {
        "format_version": 2,
        "header": {
            "name": "THE HOLLOW: Varrow Mutations",
            "description": "Island only: the animals and monsters of Varrow Island, seventy years after the bomb.",
            "uuid": str(uuid.uuid5(NS, "varrow-mutations-header")),
            "version": VERSION,
            "min_engine_version": [1, 26, 50],
        },
        "modules": [{"type": "resources", "uuid": str(uuid.uuid5(NS, "varrow-mutations-resources")), "version": VERSION}],
    }


def main():
    src = os.path.join(SOURCE, "textures", "entity")
    if not os.path.isdir(src):
        print("mutants: vanilla textures not fetched (build/vanilla/samples); keeping the committed pack")
        return
    n = 0
    for dirpath, _, files in os.walk(src):
        for f in sorted(files):
            if not f.endswith((".png", ".tga")):
                continue
            path = os.path.join(dirpath, f)
            rel = os.path.relpath(path, SOURCE)
            im = Image.open(path).convert("RGBA")
            arr = np.array(im)
            furry = any(k in rel for k in FURRY)
            seed = int(uuid.uuid5(NS, rel).int % (2 ** 31))
            out = mutate(arr, seed, furry)
            dst = os.path.join(PACK, rel)
            ensure(os.path.dirname(dst))
            Image.fromarray(out, "RGBA").save(dst)
            n += 1
    with open(os.path.join(PACK, "manifest.json"), "w") as f:
        json.dump(manifest(), f, indent=2)
    icon = os.path.join(ROOT, "packs", "resource", "pack_icon.png")
    if os.path.isfile(icon):
        Image.open(icon).save(os.path.join(PACK, "pack_icon.png"))
    print(f"mutants: {n} mob textures repainted into packs/varrow_mutations")


if __name__ == "__main__":
    main()
