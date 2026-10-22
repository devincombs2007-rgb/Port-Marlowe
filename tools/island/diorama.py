"""The 1957 diorama: a pristine copy of the test site, far out at sea, where the opening cinematic
films the bomber, the drop and the airburst. Nobody ever walks here; it only has to look right
from the camera. Afterwards the script sets it burning.

A small green atoll (radius ~60) with palms and oaks, the instrument tower at ground zero, a ring of
instrument huts, three mock-town houses, and two navy ships standing off.
"""
import math

import numpy as np

from . import layout as L
from .bedrock_world import MIN_Y, World
from .buildings import Builder
from .vegetation import Planter
from hollowkit.noise import Noise3

CENTER_Y = 66


class _Terrain:
    """Just enough of terrain.Terrain for Builder and Planter."""

    def __init__(self, w, h, ids):
        self.w, self.h, self.ids = w, h, ids


def build_diorama():
    cx, cz = L.DIORAMA
    R = L.DIORAMA_R
    w = World((cx - R) >> 4, (cz - R) >> 4, (cx + R) >> 4, (cz + R) >> 4, height=256)
    n = Noise3(57)
    xs = np.arange(w.W) + w.x0
    zs = np.arange(w.D) + w.z0
    X, Z = np.meshgrid(xs.astype(float), zs.astype(float), indexing="ij")
    P = np.stack([X.ravel() / 40, Z.ravel() / 40, np.full(X.size, 3.0)], 1)
    wob = n.fbm(P, octaves=3).reshape(X.shape)
    d = np.hypot(X - cx, Z - cz) / (60 + wob * 12)
    land = np.clip((1.05 - d) / 0.25, 0, 1)
    edge = np.minimum(np.minimum(X - X.min(), X.max() - X), np.minimum(Z - Z.min(), Z.max() - Z))
    shelf = L.FLOOR + (L.SEA - 4 - L.FLOOR) * np.clip((1.6 - d) / 0.6, 0, 1) * np.clip(edge / 30, 0, 1)
    h = np.where(land > 0, L.SEA - 1 + land * (4 + wob * 2), shelf)
    flat = np.clip((0.45 - d) / 0.15, 0, 1)
    h = h * (1 - flat) + CENTER_Y * flat
    h = np.round(h).astype(np.int32)
    ids = {k: w.id(k) for k in ("bedrock", "stone", "dirt", "grass_block", "sand", "sandstone")}
    ids["water"] = w.id("water", liquid_depth=0)
    Y = (np.arange(w.H) + MIN_Y)[None, :, None]
    top = h[:, None, :]
    b = w.blocks
    b[Y <= top] = ids["stone"]
    b[:, 0, :] = ids["bedrock"]
    beach = h <= L.SEA + 1
    I, K = np.meshgrid(np.arange(w.W), np.arange(w.D), indexing="ij")
    J = h - MIN_Y
    for k in range(1, 4):
        b[I, J - k, K] = np.where(beach, ids["sandstone"], ids["dirt"])
    b[I, J, K] = np.where(beach | (h < L.SEA), ids["sand"], ids["grass_block"])
    wet = (Y > top) & (Y <= L.SEA)
    b[wet] = ids["water"]
    w.biome[:] = L.BIOME["plains"]
    w.biome[h < L.SEA - 1] = L.BIOME["warm_ocean"]
    t = _Terrain(w, h, ids)
    p = Planter(t, seed=7)
    rng = np.random.default_rng(7)
    for _ in range(420):
        x = int(cx + rng.uniform(-62, 62))
        z = int(cz + rng.uniform(-62, 62))
        i, k = x - w.x0, z - w.z0
        dd = math.hypot(x - cx, z - cz)
        if dd < 24 or h[i, k] < L.SEA:
            continue
        if h[i, k] <= L.SEA + 1:
            if rng.random() < 0.5:
                p.palm(x, int(h[i, k]) + 1, z)
        else:
            p.oak(x, int(h[i, k]) + 1, z, big=rng.random() < 0.15)
    bl = Builder(t, seed=8)
    # the instrument tower at ground zero: a steel lattice with a cab on top
    for k in range(26):
        for sx in (-2, 2):
            for sz in (-2, 2):
                bl.set(cx + sx, CENTER_Y + 1 + k, cz + sz, "iron_bars")
        if k % 6 == 5:
            for o in range(-2, 3):
                for s in (-2, 2):
                    bl.set(cx + s, CENTER_Y + 1 + k, cz + o, "iron_bars")
                    bl.set(cx + o, CENTER_Y + 1 + k, cz + s, "iron_bars")
    bl.box(cx - 3, CENTER_Y + 27, cz - 3, cx + 3, CENTER_Y + 27, cz + 3, "iron_block")
    bl.walls(cx - 2, CENTER_Y + 28, cz - 2, cx + 2, CENTER_Y + 30, cz + 2, "white_concrete")
    bl.box(cx - 2, CENTER_Y + 31, cz - 2, cx + 2, CENTER_Y + 31, cz + 2, "gray_concrete")
    # instrument huts on a ring
    gy = lambda x, z: int(h[x - w.x0, z - w.z0]) + 1  # noqa: E731
    for a in range(0, 360, 60):
        hx = int(cx + math.cos(math.radians(a)) * 30)
        hz = int(cz + math.sin(math.radians(a)) * 30)
        y = gy(hx, hz)
        bl.box(hx - 2, y - 1, hz - 2, hx + 2, y - 1, hz + 2, "light_gray_concrete")
        bl.box(hx - 2, y, hz - 2, hx + 2, y + 2, hz + 2, "light_gray_concrete")
        bl.box(hx - 2, y + 3, hz - 2, hx + 2, y + 3, hz + 2, "smooth_stone_slab", **{"minecraft:vertical_half": "bottom"})
        bl.box(hx + 3, y, hz, hx + 3, y + 8, hz, "iron_bars")
        if a in (0, 120, 240):
            # a working instrument hut: hollow, a doorway toward ground zero, a dosimeter on the desk
            bl.clear(hx - 1, y, hz - 1, hx + 1, y + 1, hz + 1)
            dx, dz = -math.cos(math.radians(a)), -math.sin(math.radians(a))
            if abs(dx) > abs(dz):
                ox, oz, back = (2 if dx > 0 else -2), 0, ((-1 if dx > 0 else 1), 0)
            else:
                ox, oz, back = 0, (2 if dz > 0 else -2), (0, (-1 if dz > 0 else 1))
            bl.clear(hx + ox, y, hz + oz, hx + ox, y + 1, hz + oz)
            desk = (hx + back[0], y, hz + back[1])
            bl.set(*desk, "polished_andesite")
            bl.set(desk[0], y + 1, desk[2], "stone_button", button_pressed_bit=0, facing_direction=1)
            bl.consoles[f"pro_hut{(a // 120) + 1}"] = (desk[0], y + 1, desk[2])
            bl.set(hx, y + 2, hz, "lantern", hanging=True)
    # the timer panel at the foot of the tower
    bl.set(cx + 4, CENTER_Y + 1, cz, "iron_block")
    bl.set(cx + 4, CENTER_Y + 2, cz, "stone_button", button_pressed_bit=0, facing_direction=1)
    bl.consoles["pro_tower"] = (cx + 4, CENTER_Y + 2, cz)
    # the observation bunker on the south shore: concrete, a viewing slit toward the tower
    bx, bz = cx, cz + 42
    by = max(gy(bx + dx_, bz + dz_) for dx_ in (-4, 4) for dz_ in (-2, 2))
    bl.box(bx - 5, by - 1, bz - 3, bx + 5, by - 1, bz + 3, "stone_bricks")
    bl.walls(bx - 5, by, bz - 3, bx + 5, by + 3, bz + 3, "gray_concrete")
    bl.clear(bx - 4, by, bz - 2, bx + 4, by + 3, bz + 2)
    bl.box(bx - 5, by + 4, bz - 3, bx + 5, by + 4, bz + 3, "gray_concrete")
    bl.clear(bx - 3, by + 2, bz - 3, bx + 3, by + 2, bz - 3)       # the slit, facing north to the tower
    bl.clear(bx, by, bz + 3, bx, by + 1, bz + 3)                    # the door, south
    for k in range(-4, 5, 2):
        bl.set(bx + k, by + 3, bz, "lantern", hanging=True)
    bl.point("pro_bunker", bx, by, bz)
    bl.point("pro_slit", bx, by + 2, bz - 3)
    sx_, sz_ = cx - 6, cz - 40
    bl.point("pro_start", sx_, gy(sx_, sz_), sz_)
    # three test houses
    for (dx, dz, f) in ((-38, -14, "south"), (-38, 4, "north"), (-24, 22, "north")):
        bl.house(cx + dx, cz + dz, f, scorched=0.0, variant=dx + dz)
    # the fleet
    for (sx, sz, heading) in ((cx + 78, cz - 50, 1), (cx - 84, cz + 58, -1)):
        _ship(bl, sx, sz, heading)
        bl.point("pro_ship", sx, L.SEA + 3, sz)
    w.points, w.consoles = bl.points, bl.consoles
    return w


def _ship(bl, sx, sz, heading):
    """A destroyer-sized grey hull along x, bow toward `heading`."""
    length, beam = 44, 9
    base = L.SEA - 3
    for k in range(length):
        x = sx + heading * (k - length // 2)
        taper = max(0, k - (length - 10)) if heading > 0 else max(0, k - (length - 10))
        half = beam // 2 - (taper * 4) // 10
        for o in range(-half, half + 1):
            z = sz + o
            bl.box(x, base, z, x, L.SEA + 1, z, "gray_concrete")
            bl.set(x, L.SEA + 2, z, "polished_andesite")
    # superstructure, funnel, mast, guns
    mid = sx
    bl.box(mid - 5, L.SEA + 3, sz - 2, mid + 5, L.SEA + 6, sz + 2, "light_gray_concrete")
    bl.box(mid - 3, L.SEA + 7, sz - 1, mid + 1, L.SEA + 8, sz + 1, "light_gray_concrete")
    bl.box(mid + 2, L.SEA + 7, sz, mid + 3, L.SEA + 11, sz, "gray_concrete")
    bl.box(mid - 2, L.SEA + 9, sz, mid - 2, L.SEA + 18, sz, "iron_bars")
    for gx in (sx + heading * 14, sx - heading * 14):
        bl.box(gx - 1, L.SEA + 3, sz - 1, gx + 1, L.SEA + 4, sz + 1, "gray_concrete")
        bl.box(gx + heading, L.SEA + 4, sz, gx + heading * 4, L.SEA + 4, sz, "iron_bars")
