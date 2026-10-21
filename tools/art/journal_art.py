"""Field Journal illustrations (1.1): ink-on-parchment roundels for every journal button.

  python3 tools/art/journal_art.py

Writes packs/resource/textures/ui/hollow/journal/*.png (128x128) and the menu icons in
packs/resource/textures/ui/hollow/*.png, plus build/previews/journal_art.png.

  * Creature portraits are rendered from the real generated models and textures, then inked:
    sepia tones, a hand-drawn outline, cross-hatching in the shadows, and only their glowing
    parts (eyes, veins, echo-sacs) keep their colour.
  * Places, chapters and menu icons are drawn as ink sketches at 4x and downsampled.
  * Equipment entries show the 16x16 item sprite pinned to the parchment, like a specimen.
"""
import importlib
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(HERE, "..", "creatures"))
from hollowkit import BUILD, RP, ensure  # noqa: E402
from hollowkit.render import render  # noqa: E402
from hollowkit.noise import Noise3  # noqa: E402

S = 128            # output size
K = 4              # supersampling for drawn art
INK = (42, 29, 20)
INK2 = (92, 70, 48)
INK3 = (143, 118, 86)
PAPER = (233, 222, 194)
PAPER_EDGE = (196, 176, 136)
RNG = np.random.default_rng(1957)
NOISE = Noise3(31)

OUT = os.path.join(RP, "textures", "ui", "hollow", "journal")
UI = os.path.join(RP, "textures", "ui", "hollow")


# ----------------------------------------------------------------------------- parchment
def parchment(seed=0):
    """A round, foxed parchment medallion with an inked double ring (RGBA, S x S)."""
    n = S * K
    yy, xx = np.mgrid[0:n, 0:n] / K
    c = S / 2
    r = np.hypot(xx - c + 0.5, yy - c + 0.5)
    ang = np.arctan2(yy - c, xx - c)
    wobble = 1.2 * np.sin(ang * 7 + seed) + 0.8 * np.sin(ang * 13 + seed * 2)
    radius = S / 2 - 3 + wobble * 0.5
    pts = np.stack([xx.ravel() * 0.09, yy.ravel() * 0.09, np.full(xx.size, seed * 3.1)], 1)
    grain = NOISE.fbm(pts, octaves=4).reshape(n, n)
    edge = np.clip((r / radius) ** 4, 0, 1)
    col = np.zeros((n, n, 3))
    for i in range(3):
        col[..., i] = PAPER[i] * (1 - edge * 0.35) + PAPER_EDGE[i] * edge * 0.35 + grain * 18
    # foxing spots
    for _ in range(5):
        fx, fy, fr = RNG.uniform(20, 108), RNG.uniform(20, 108), RNG.uniform(2, 6)
        d = np.hypot(xx - fx, yy - fy)
        col -= (np.clip(1 - d / fr, 0, 1) ** 2)[..., None] * np.array([18, 26, 34])
    alpha = np.clip((radius - r) * K * 0.5 + 0.5, 0, 1)
    img = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)
    im = Image.fromarray(img, "RGBA")
    d = ImageDraw.Draw(im)
    rr = (S / 2 - 4.5) * K
    d.ellipse([n / 2 - rr, n / 2 - rr, n / 2 + rr, n / 2 + rr], outline=INK + (255,), width=int(2.2 * K))
    rr2 = rr - 4 * K
    d.ellipse([n / 2 - rr2, n / 2 - rr2, n / 2 + rr2, n / 2 + rr2], outline=INK2 + (150,), width=int(0.8 * K))
    return im


def finish(big):
    return big.resize((S, S), Image.LANCZOS)


def clip_to_disc(layer, inset=10):
    n = S * K
    mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(mask).ellipse([inset * K, inset * K, n - inset * K, n - inset * K], fill=255)
    a = np.minimum(np.array(layer)[..., 3], np.array(mask))
    arr = np.array(layer)
    arr[..., 3] = a
    return Image.fromarray(arr, "RGBA")


# ----------------------------------------------------------------------------- inked renders
def ink_render(model, atlas, mers, pose, yaw, pitch, crop=None, fit=0.84, accent_boost=1.0):
    """Render a creature, then turn it into an ink drawing with coloured glows (RGBA, S*K)."""
    size = 520
    key = (255, 0, 255)
    col = np.array(render(model, atlas, pose=pose, yaw=yaw, pitch=pitch, size=size, bg=(key, key), ambient=0.42,
                          light=(-0.5, 0.85, -0.45), focus=crop)).astype(float)
    em = np.array(render(model, mers, pose=pose, yaw=yaw, pitch=pitch, size=size, bg=((0, 0, 0), (0, 0, 0)),
                         ambient=1.0, focus=crop)).astype(float)[..., 1]
    mask = np.abs(col - np.array(key)).max(axis=2) > 6
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    col, em, mask = col[y0:y1, x0:x1], em[y0:y1, x0:x1], mask[y0:y1, x0:x1]
    lum = (0.3 * col[..., 0] + 0.59 * col[..., 1] + 0.11 * col[..., 2]) / 255.0
    lum = np.clip((lum - 0.04) / 0.5, 0, 1) ** 0.75
    # four ink tones with ordered hatching between them
    tones = np.array([INK, INK2, INK3, PAPER], float)
    h, w = lum.shape
    yy, xx = np.mgrid[0:h, 0:w]
    hatch = (((xx + yy) % 7) < 2).astype(float) * 0.18 + (((xx - yy) % 9) < 2).astype(float) * 0.12 * (lum < 0.3)
    v = np.clip(lum + 0.08 - hatch, 0, 1)
    idx = np.clip((v * 3.6).astype(int), 0, 3)
    out = tones[idx]
    # inner edges: strong luminance changes become ink lines
    gx = np.abs(np.diff(lum, axis=1, prepend=lum[:, :1]))
    gy = np.abs(np.diff(lum, axis=0, prepend=lum[:1, :]))
    edge = (gx + gy) > 0.22
    out[edge] = out[edge] * 0.35 + np.array(INK) * 0.65
    # glows keep their own colour (eyes, veins, sacs, embers)
    glow = (em > 50) & mask
    out[glow] = col[glow] * 0.6 + np.array([255, 235, 200]) * 0.4 * (em[glow, None] / 255.0)
    # silhouette outline: dilate the mask
    m_img = Image.fromarray((mask * 255).astype(np.uint8))
    dil = np.array(m_img.filter(ImageFilter.MaxFilter(7))) > 0
    outline = dil & ~mask
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[mask, :3] = np.clip(out[mask], 0, 255)
    rgba[mask, 3] = 255
    rgba[outline, :3] = INK
    rgba[outline, 3] = 255
    im = Image.fromarray(rgba, "RGBA")
    # fit into the medallion
    n = S * K
    box = int(n * fit)
    scale = box / max(im.width, im.height)
    im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((n - im.width) // 2, (n - im.height) // 2 + int(n * 0.02)))
    return canvas


def creature(name, tex, pose, yaw, pitch, crop=None, fit=0.84, build_fn="build"):
    mod = importlib.import_module(name if name != "heart_below" else "heart")
    model = getattr(mod, build_fn)()
    model.texel_scale = 1
    model.layout()
    base = os.path.join(RP, "textures", "entity", "hollow")
    atlas = np.array(Image.open(os.path.join(base, f"{tex}.png")).convert("RGBA"))
    mers = np.array(Image.open(os.path.join(base, f"{tex}_mers.png")).convert("RGBA"))
    mers[..., 3] = atlas[..., 3]
    art = ink_render(model, atlas, mers, pose, yaw, pitch, crop=crop, fit=fit)
    bg = parchment(seed=len(name) % 7)
    bg.alpha_composite(clip_to_disc(art, inset=7))
    return finish(bg)


# ----------------------------------------------------------------------------- drawn sketches
class Pen:
    """Draws in 0..128 coordinates on a supersampled canvas with slightly wobbly ink lines."""

    def __init__(self):
        self.n = S * K
        self.im = Image.new("RGBA", (self.n, self.n), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def P(self, pts):
        return [(x * K + RNG.uniform(-0.6, 0.6), y * K + RNG.uniform(-0.6, 0.6)) for x, y in pts]

    def line(self, pts, w=2.2, c=INK):
        self.d.line(self.P(pts), fill=c + (255,), width=int(w * K), joint="curve")

    def poly(self, pts, fill=INK2, outline=INK, w=2.0):
        self.d.polygon(self.P(pts), fill=fill + (255,) if fill else None)
        self.line(list(pts) + [pts[0]], w, outline)

    def circle(self, cx, cy, r, fill=None, outline=INK, w=2.0):
        self.d.ellipse([(cx - r) * K, (cy - r) * K, (cx + r) * K, (cy + r) * K],
                       fill=fill + (255,) if fill else None, outline=outline + (255,), width=int(w * K))

    def arc(self, cx, cy, r, a0, a1, w=2.0, c=INK):
        self.d.arc([(cx - r) * K, (cy - r) * K, (cx + r) * K, (cy + r) * K], a0, a1, fill=c + (255,), width=int(w * K))

    def hatch(self, x0, y0, x1, y1, step=4, c=INK2, w=1.0):
        for k in np.arange(x0 - (y1 - y0), x1, step):
            self.line([(max(x0, k), y0 + max(0, x0 - k)), (min(x1, k + (y1 - y0)), min(y1, y0 + (x1 - k)))], w, c)

    def dot(self, x, y, r, c):
        self.d.ellipse([(x - r) * K, (y - r) * K, (x + r) * K, (y + r) * K], fill=c + (255,))


def sketch(fn, seed=0):
    pen = Pen()
    fn(pen)
    bg = parchment(seed)
    bg.alpha_composite(clip_to_disc(pen.im, inset=8))
    return finish(bg)


RED = (168, 40, 30)
AMBER = (232, 160, 60)
TEAL = (90, 170, 170)
GREEN = (98, 128, 70)


def d_cabin(p):
    p.poly([(28, 70), (64, 40), (100, 70)], fill=INK2)
    p.poly([(34, 70), (94, 70), (94, 100), (34, 100)], fill=INK3)
    for y in range(74, 100, 6):
        p.line([(34, y), (94, y)], 1.0, INK2)
    p.poly([(56, 80), (70, 80), (70, 100), (56, 100)], fill=INK)
    p.poly([(78, 78), (88, 78), (88, 88), (78, 88)], fill=AMBER)
    p.line([(83, 78), (83, 88)], 1.2)
    p.line([(78, 83), (88, 83)], 1.2)
    p.poly([(82, 46), (90, 46), (90, 60), (82, 54)], fill=INK2)
    for x, h in ((16, 44), (110, 40), (22, 36)):
        p.poly([(x, 100), (x - 7, 100), (x, 100 - h)], fill=INK)
    p.line([(14, 100), (114, 100)], 2.4)


def d_camp(p):
    p.poly([(30, 96), (56, 50), (82, 96)], fill=INK3)
    p.line([(56, 50), (56, 96)], 1.6)
    p.poly([(50, 96), (56, 74), (62, 96)], fill=INK)
    p.line([(20, 98), (108, 98)], 2.2)
    for a in range(0, 180, 30):
        x, y = 92 + 8 * math.cos(math.radians(a)), 96 - 4 * math.sin(math.radians(a))
        p.dot(x, y, 2.4, INK2)
    p.poly([(88, 94), (92, 82), (96, 94)], fill=AMBER, outline=RED, w=1.4)
    p.line([(92, 78), (95, 68), (91, 60), (95, 50)], 1.2, INK3)
    p.line([(36, 96), (24, 104)], 1.4)
    p.line([(76, 96), (90, 104)], 1.4)


def d_tower(p):
    p.line([(44, 104), (56, 40)], 2.4)
    p.line([(84, 104), (72, 40)], 2.4)
    for y in (90, 74, 58):
        t = (104 - y) / 64
        x0, x1 = 44 + 12 * t, 84 - 12 * t
        p.line([(x0, y), (x1, y)], 1.6)
        p.line([(x0, y), (x1, y - 14)], 1.0, INK2)
    p.poly([(48, 40), (80, 40), (80, 26), (48, 26)], fill=INK3)
    p.poly([(44, 26), (64, 14), (84, 26)], fill=INK)
    p.poly([(56, 30), (72, 30), (72, 36), (56, 36)], fill=AMBER)
    p.line([(30, 104), (98, 104)], 2.2)


def d_leanto(p):
    p.poly([(26, 98), (70, 50), (104, 98)], fill=None)
    p.poly([(30, 98), (70, 54), (76, 60), (40, 98)], fill=INK2)
    for k in range(6):
        p.line([(34 + k * 7, 98 - k * 0), (72, 56)], 1.0, INK)
    p.line([(70, 50), (104, 98)], 2.6)
    p.line([(18, 99), (110, 99)], 2.2)
    p.poly([(56, 92), (66, 86), (76, 92), (66, 96)], fill=INK3)


def d_shrine(p):
    p.poly([(30, 100), (98, 100), (92, 92), (36, 92)], fill=INK2)
    for x in (38, 86):
        p.poly([(x - 5, 92), (x + 5, 92), (x + 4, 36), (x - 4, 36)], fill=INK3)
        p.line([(x - 4, 56), (x + 3, 70), (x - 3, 80)], 1.6, RED)
    p.poly([(54, 92), (74, 92), (70, 74), (58, 74)], fill=INK)
    p.circle(64, 62, 9, fill=RED, outline=INK, w=2)
    p.line([(64, 71), (60, 92)], 1.4, RED)
    p.line([(26, 30), (102, 30)], 2.2)
    for x in (34, 50, 78, 96):
        p.line([(x, 30), (x + 3, 40), (x - 1, 48)], 1.2)


def d_notes(p):
    p.poly([(22, 46), (64, 52), (64, 100), (22, 92)], fill=PAPER)
    p.poly([(64, 52), (106, 46), (106, 92), (64, 100)], fill=PAPER)
    for y in range(58, 92, 7):
        p.line([(28, y - 4), (58, y)], 1.0, INK2)
        p.line([(70, y), (100, y - 4)], 1.0, INK2)
    p.line([(64, 52), (64, 100)], 2.0)
    p.line([(84, 20), (102, 50)], 2.6)
    p.poly([(82, 18), (90, 14), (98, 32), (92, 36)], fill=INK3)
    p.line([(102, 50), (104, 54)], 1.6)


def d_threats(p):
    p.poly([(20, 64), (44, 44), (84, 44), (108, 64), (84, 84), (44, 84)], fill=PAPER)
    p.circle(64, 64, 18, fill=INK3)
    p.circle(64, 64, 8, fill=INK)
    p.dot(60, 60, 2.4, PAPER)
    for k, x in enumerate((36, 52, 68)):
        p.line([(x, 92 + k), (x + 26, 30 + k)], 2.6, RED)


def d_craft(p):
    p.line([(64, 20), (64, 30)], 2.0)
    p.circle(64, 26, 5)
    p.poly([(46, 34), (82, 34), (78, 42), (50, 42)], fill=INK2)
    p.poly([(50, 42), (78, 42), (80, 88), (48, 88)], fill=INK3)
    p.poly([(56, 50), (72, 50), (72, 80), (56, 80)], fill=AMBER, outline=INK2, w=1.4)
    p.dot(64, 66, 5, (255, 230, 170))
    p.poly([(44, 88), (84, 88), (82, 96), (46, 96)], fill=INK2)
    p.line([(30, 98), (98, 98)], 2.0)


def d_places(p):
    p.poly([(20, 36), (48, 28), (80, 36), (108, 28), (108, 96), (80, 104), (48, 96), (20, 104)], fill=PAPER)
    p.line([(48, 28), (48, 96)], 1.2, INK2)
    p.line([(80, 36), (80, 104)], 1.2, INK2)
    p.line([(28, 88), (40, 70), (56, 74), (66, 58), (84, 60)], 1.6, INK2)
    p.line([(84, 52), (96, 64)], 3.0, RED)
    p.line([(96, 52), (84, 64)], 3.0, RED)
    for x, y in ((32, 50), (40, 46), (60, 88), (70, 84)):
        p.poly([(x, y), (x - 4, y + 8), (x + 4, y + 8)], fill=GREEN, outline=INK, w=1)


def d_settings(p):
    cx, cy, r = 64, 64, 26
    pts = []
    for i in range(48):
        a = i / 48 * 2 * math.pi
        rr = r + (8 if (i // 3) % 2 == 0 else 0)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    p.poly(pts, fill=INK3)
    p.circle(cx, cy, 11, fill=PAPER)


def d_world(p):
    p.circle(64, 64, 36, fill=INK3)
    p.arc(64, 64, 36, 0, 360, 2.4)
    p.line([(64, 28), (64, 100)], 1.2, INK2)
    p.line([(28, 64), (100, 64)], 1.2, INK2)
    p.arc(64, 64, 18, 270, 90, 1.2, INK2)
    p.arc(64, 64, 18, 90, 270, 1.2, INK2)
    for x, y in ((50, 50), (76, 46), (58, 78), (82, 74)):
        p.poly([(x, y - 8), (x - 6, y + 4), (x + 6, y + 4)], fill=GREEN, outline=INK, w=1.2)


def d_back(p):
    p.arc(70, 66, 26, 200, 70, 4.0)
    p.poly([(30, 56), (52, 44), (50, 68)], fill=INK)


def d_conditions(p):
    p.arc(64, 64, 32, 90, 270, 2.4)
    p.d.pieslice([32 * K, 32 * K, 96 * K, 96 * K], 270, 90, fill=INK3 + (255,))
    p.circle(64, 64, 32)
    p.circle(50, 64, 10, fill=AMBER)
    for a in range(0, 360, 45):
        x0, y0 = 50 + 13 * math.cos(math.radians(a)), 64 + 13 * math.sin(math.radians(a))
        x1, y1 = 50 + 17 * math.cos(math.radians(a)), 64 + 17 * math.sin(math.radians(a))
        if x1 < 64:
            p.line([(x0, y0), (x1, y1)], 1.4, AMBER)
    p.circle(80, 60, 9, fill=PAPER)
    p.circle(84, 57, 8, fill=INK3, outline=INK3, w=1)


def d_refresh(p):
    p.arc(64, 64, 28, 30, 300, 4.0)
    p.poly([(88, 30), (94, 56), (70, 48)], fill=INK)


def d_recipe(p):
    p.poly([(30, 30), (98, 30), (98, 98), (30, 98)], fill=PAPER)
    for i in range(3):
        for j in range(3):
            x, y = 38 + i * 19, 38 + j * 19
            p.poly([(x, y), (x + 15, y), (x + 15, y + 15), (x, y + 15)], fill=INK3 if (i + j) % 2 else PAPER, w=1.2)
    p.dot(64, 64, 4, AMBER)


def d_dread(p):
    p.poly([(64, 98), (32, 66), (30, 50), (40, 38), (54, 38), (64, 48), (74, 38), (88, 38), (98, 50), (96, 66)], fill=RED)
    p.line([(64, 48), (58, 60), (68, 70), (60, 84)], 2.0, INK)
    p.line([(16, 80), (36, 80), (42, 70), (48, 92), (54, 80), (112, 80)], 2.2, INK)


def d_phantom(p):
    for k in range(0, 360, 20):
        a0, a1 = k, k + 10
        p.arc(64, 70, 30, a0, a1, 1.6, INK2)
    p.poly([(52, 104), (56, 60), (52, 44), (64, 26), (76, 44), (72, 60), (76, 104)], fill=INK2, outline=INK2, w=1)
    p.dot(59, 44, 2.2, (250, 240, 210))
    p.dot(69, 44, 2.2, (250, 240, 210))
    p.line([(56, 60), (40, 94)], 1.6, INK2)
    p.line([(72, 60), (88, 94)], 1.6, INK2)


def d_tracks(p):
    for k, (x, y, a) in enumerate(((40, 96, -10), (58, 78, 8), (50, 56, -6), (70, 38, 10))):
        for t in range(3):
            tx = x + (t - 1) * 5 + a * 0.1
            p.line([(x, y), (tx, y - 12)], 2.0, INK)
        p.dot(x, y + 2, 3.4, INK2)


def d_eye(p):
    for x, y in ((34, 84), (64, 92), (94, 84)):
        p.poly([(x - 12, y), (x - 6, y - 10), (x + 8, y - 12), (x + 14, y), (x + 4, y + 6), (x - 8, y + 6)], fill=INK3)
        p.dot(x - 6, y - 12, 4, INK3)
        p.dot(x - 6, y - 12, 1.6, RED)
    p.poly([(26, 46), (46, 32), (82, 32), (102, 46), (82, 60), (46, 60)], fill=PAPER)
    p.circle(64, 46, 12, fill=INK3)
    p.circle(64, 46, 5, fill=INK)


def d_lantern(p):
    p.poly([(40, 100), (88, 100), (84, 84), (44, 84)], fill=INK2)
    p.line([(64, 38), (64, 46)], 1.6)
    p.circle(64, 36, 4)
    p.poly([(52, 46), (76, 46), (78, 82), (50, 82)], fill=INK3)
    p.poly([(56, 52), (72, 52), (72, 76), (56, 76)], fill=AMBER, outline=INK, w=1.4)
    p.dot(64, 66, 4, (255, 240, 190))
    p.poly([(98, 98), (104, 102), (96, 104)], fill=PAPER)


def d_roof(p):
    p.poly([(24, 72), (64, 40), (104, 72)], fill=INK2)
    p.poly([(32, 72), (96, 72), (96, 104), (32, 104)], fill=INK3)
    p.poly([(58, 84), (70, 84), (70, 104), (58, 104)], fill=INK)
    for k, (x, y) in enumerate(((40, 64), (52, 55), (66, 47), (80, 56), (90, 64))):
        p.dot(x, y - 6, 2.8, RED if k % 2 else INK)


def d_shelter(p):
    p.poly([(24, 72), (64, 40), (104, 72)], fill=INK2)
    p.poly([(32, 72), (96, 72), (96, 104), (32, 104)], fill=INK3)
    p.poly([(58, 84), (70, 84), (70, 104), (58, 104)], fill=INK)
    p.poly([(40, 80), (50, 80), (50, 90), (40, 90)], fill=AMBER)
    p.line([(84, 104), (84, 84)], 2.0)
    p.dot(84, 82, 3.2, RED)
    p.dot(80, 86, 2.4, RED)


def d_page(p):
    p.poly([(36, 24), (84, 24), (92, 34), (90, 56), (96, 64), (92, 104), (36, 104), (40, 80), (34, 60)], fill=PAPER)
    for y in range(36, 98, 8):
        p.line([(44, y), (82 - (y % 3) * 4, y)], 1.2, INK2)
    p.circle(76, 90, 6, fill=None, outline=INK3, w=1.2)


def d_heart(p):
    p.poly([(64, 100), (34, 70), (32, 52), (42, 40), (56, 40), (64, 50), (72, 40), (86, 40), (96, 52), (94, 70)], fill=INK2)
    for path in (((40, 50), (58, 72), (52, 92)), ((88, 50), (70, 74), (78, 90)), ((64, 50), (64, 80))):
        p.line(list(path), 2.4, INK3)
    p.dot(64, 72, 4, AMBER)


def d_intro(p):
    d_notes(p)


def d_after(p):
    d_heart(p)


SKETCHES = {
    "place_cabin": d_cabin, "place_camp": d_camp, "place_tower": d_tower, "place_leanto": d_leanto,
    "place_shrine": d_shrine, "chapter_notes": d_notes, "chapter_threats": d_threats, "chapter_craft": d_craft,
    "chapter_places": d_places, "dread": d_dread, "phantom": d_phantom, "tracks": d_tracks, "event_eye": d_eye,
    "event_lantern": d_lantern, "event_roof": d_roof, "shelter": d_shelter, "page": d_page, "after": d_heart,
    "conditions": d_conditions, "refresh": d_refresh, "recipe": d_recipe,
}
MENU = {"settings": d_settings, "world": d_world, "back": d_back}

CREATURES = [
    # name, texture, pose, yaw, pitch, crop
    ("watcher", "watcher", {"head": {"rot": (6, 18, 16)}, "jaw": {"rot": (10, 0, 0)}, "right_hand": {"rot": (-20, 0, 8)}},
     20, 4, ((0, 44, -1), 13.0)),
    ("borrowed", "borrowed_true", {"head_l": {"rot": (0, -42, -6)}, "head_r": {"rot": (0, 42, 6)}, "neck": {"pos": (0, 3, -3)},
                                   "inner_jaw": {"rot": (26, 0, 0)}, "root": {"pos": (0, 4.8, 0)},
                                   "leg_fl": {"scale": (1, 1.38, 1)}, "leg_fr": {"scale": (1, 1.38, 1)},
                                   "leg_bl": {"scale": (1, 1.38, 1)}, "leg_br": {"scale": (1, 1.38, 1)}}, 40, 8, None),
    ("hollowed", "hollowed", {"jaw": {"rot": (34, 0, 0)}, "neck": {"rot": (-10, 0, 0)}, "head": {"rot": (-10, 0, 0)},
                              "throat": {"scale": 1.25}}, 35, 12, None),
    ("knocker", "knocker", {"right_arm": {"rot": (-74, 0, -6)}, "right_forearm": {"rot": (-35, 0, 0)}, "head": {"rot": (8, 20, 24)}},
     30, 6, None),
    ("mirebound", "mirebound", {"head": {"rot": (-34, 0, 0)}, "jaw": {"rot": (48, 0, 0)}, "body": {"rot": (-14, 0, 0), "pos": (0, 3, 0)},
                                "arm_l": {"rot": (-60, 0, -20)}, "arm_r": {"rot": (-60, 0, 20)}}, 30, 14, None),
]


def specimen(item):
    """A 16x16 item sprite pinned to parchment."""
    src = Image.open(os.path.join(RP, "textures", "items", "hollow", f"{item}.png")).convert("RGBA")
    bg = parchment(seed=len(item))
    n = S * K
    big = src.resize((n * 9 // 16, n * 9 // 16), Image.NEAREST)
    shadow = Image.new("RGBA", big.size, (0, 0, 0, 0))
    sa = np.array(big)[..., 3]
    sh = np.zeros(sa.shape + (4,), np.uint8)
    sh[..., :3] = INK
    sh[..., 3] = (sa * 0.35).astype(np.uint8)
    shadow = Image.fromarray(sh, "RGBA").filter(ImageFilter.GaussianBlur(6))
    off = (n - big.width) // 2
    bg.alpha_composite(shadow, (off + 10, off + 14))
    bg.alpha_composite(big, (off, off))
    # a pin
    d = ImageDraw.Draw(bg)
    d.ellipse([n * 0.47, n * 0.17, n * 0.53, n * 0.23], fill=RED + (255,), outline=INK + (255,), width=K * 2)
    return finish(bg)


ITEMS = ["hollow_chime", "rowan_ward", "hollow_lens", "heartseeker", "offering_of_silence", "heartwood_lantern",
         "hearth_tea", "pale_resin", "borrowed_hide", "hollow_fang", "knocker_nail", "mire_pearl", "stilled_heart",
         "field_journal", "torn_page"]


def main():
    ensure(OUT)
    made = {}
    for name, tex, pose, yaw, pitch, crop in CREATURES:
        made[name] = creature(name, tex, pose, yaw, pitch, crop=crop)
    made["heart_below"] = creature("heart_below", "heart_below", {"lid_l": {"rot": (0, 60, 0)}, "lid_r": {"rot": (0, -60, 0)}},
                                   25, 14, None, build_fn="heart_model")
    for key, fn in SKETCHES.items():
        made[key] = sketch(fn, seed=len(key))
    for item in ITEMS:
        made[f"item_{item}"] = specimen(item)
    for key, img in made.items():
        img.save(os.path.join(OUT, f"{key}.png"), optimize=True)
    for key, fn in MENU.items():
        img = sketch(fn, seed=len(key))
        img.save(os.path.join(UI, f"{key}.png"), optimize=True)
        made[key] = img
    cols = 10
    rows = (len(made) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * 136, rows * 136), (34, 30, 28, 255))
    for i, (k, img) in enumerate(made.items()):
        sheet.alpha_composite(img, ((i % cols) * 136 + 4, (i // cols) * 136 + 4))
    ensure(os.path.join(BUILD, "previews"))
    sheet.save(os.path.join(BUILD, "previews", "journal_art.png"))
    print(f"journal art: {len(made)} illustrations")


if __name__ == "__main__":
    main()
