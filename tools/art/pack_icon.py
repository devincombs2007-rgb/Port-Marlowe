"""Pack icons: a 64x64 pixel-art night forest (upscaled to 256) with the Watcher between the
spruces, a warm cabin window far off, and ground mist. Variants for each pack."""
import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import BP, RP, VP, ROOT  # noqa: E402

N = 64


def lerp(a, b, t):
    return tuple(max(0, min(255, int(round(float(a[i]) + (float(b[i]) - float(a[i])) * t)))) for i in range(3))


def scene(variant="core"):
    rng = np.random.default_rng(42)
    img = np.zeros((N, N, 3), np.uint8)
    top, hor = (14, 18, 28), (52, 66, 74)
    if variant == "visuals":
        top, hor = (18, 22, 40), (96, 86, 92)
    for y in range(N):
        t = (y / (N * 0.62)) ** 1.3
        img[y, :] = lerp(top, hor, min(1.0, t))
    # stars
    for _ in range(26):
        x, y = rng.integers(0, N), rng.integers(0, 26)
        img[y, x] = (150, 160, 170) if rng.random() < 0.7 else (200, 205, 210)
    # moon + halo
    mx, my, mr = 47, 12, 5
    for y in range(N):
        for x in range(N):
            d = math.hypot(x - mx, y - my)
            if d < mr:
                shade = 230 - int((x - mx + mr) * 3)
                img[y, x] = (shade, shade - 4, shade - 14)
            elif d < mr + 7:
                k = (1 - (d - mr) / 7) ** 2 * 0.35
                img[y, x] = lerp(tuple(img[y, x]), (200, 205, 200), k)
    # moon craters
    for (cx, cy) in ((46, 11), (49, 14)):
        img[cy, cx] = (196, 192, 180)

    def spruce(cx, base, h, col, jag=1):
        for yy in range(h):
            y = base - yy
            if y < 0 or y >= N:
                continue
            half = max(0, int((h - yy) * 0.33 + (yy % 3 == 0) * jag))
            for x in range(cx - half, cx + half + 1):
                if 0 <= x < N:
                    img[y, x] = col
        for y in range(base, min(N, base + 3)):
            if 0 <= cx < N:
                img[y, cx] = col

    far = (34, 44, 50) if variant == "core" else (58, 54, 66)
    mid = (22, 29, 33) if variant == "core" else (36, 32, 42)
    near = (10, 13, 15)
    for x in range(-2, N + 4, 5):
        spruce(x + rng.integers(-1, 2), 44 + rng.integers(-2, 2), 16 + rng.integers(0, 6), far)
    # warm cabin window far away (shelter lighting)
    img[41, 12] = (255, 190, 110)
    img[41, 13] = (230, 160, 90)
    img[40, 12] = (90, 70, 50)
    for x in range(1, N, 9):
        spruce(x + rng.integers(-2, 3), 52 + rng.integers(-2, 2), 26 + rng.integers(0, 8), mid)
    # mist band
    for y in range(44, 58):
        k = max(0.0, 1 - abs(y - 51) / 7) * (0.45 if variant == "core" else 0.55)
        for x in range(N):
            wob = 0.85 + 0.15 * math.sin(x * 0.4 + y)
            img[y, x] = lerp(tuple(img[y, x]), (120, 132, 136) if variant == "core" else (150, 132, 140), k * wob)
    # the Watcher: tall, thin, pale face, twig crown, standing between mid trees
    wx, wy = 33, 52
    body = (8, 9, 10)
    for y in range(wy - 22, wy + 1):
        img[y, wx] = body
    for y in range(wy - 22, wy - 12):
        img[y, wx - 1] = body
        img[y, wx + 1] = body
    for y in range(wy - 21, wy - 6):  # long arms
        img[y, wx - 2] = body
        img[y, wx + 2] = body
    img[wy, wx - 1] = body
    img[wy - 1, wx - 1] = body
    for y in range(wy - 27, wy - 22):  # head/face
        img[y, wx] = (196, 190, 178)
        img[y, wx + 1] = (170, 164, 152)
    img[wy - 25, wx] = (14, 12, 10)
    img[wy - 25, wx + 1] = (14, 12, 10)
    img[wy - 24, wx] = (250, 240, 200)
    for i in range(5):  # twig crown
        img[wy - 28 - i, wx - 1 - i // 2] = body
        img[wy - 28 - i, wx + 2 + i // 2] = body
    img[wy - 31, wx - 4] = body
    img[wy - 32, wx + 5] = body
    # foreground frame trunks + ground
    for y in range(N):
        for x in list(range(0, 4)) + list(range(N - 5, N)):
            img[y, x] = near
    for y in range(58, N):
        img[y, :] = lerp((16, 20, 18), (8, 10, 9), (y - 58) / 6)
    for x in range(4, N - 5):
        if rng.random() < 0.4:
            img[57, x] = (24, 30, 26)
    if variant == "behavior":
        # a tiny rowan ward glow at the bottom right
        img[56, 52] = (255, 170, 90)
        img[55, 52] = (120, 80, 50)
    return Image.fromarray(img).resize((256, 256), Image.NEAREST)


def main():
    scene("core").save(os.path.join(RP, "pack_icon.png"))
    scene("behavior").save(os.path.join(BP, "pack_icon.png"))
    scene("visuals").save(os.path.join(VP, "pack_icon.png"))
    scene("core").save(os.path.join(ROOT, "docs", "pack_icon.png"))


if __name__ == "__main__":
    main()
