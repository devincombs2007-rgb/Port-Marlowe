"""Varrow Island terrain: heightfield, biomes, surface materials, caves, ores and the crater.

Everything is computed on numpy grids over the written region; nothing here knows about the
LevelDB format (see bedrock_world.py). Deterministic for a given seed.
"""
import math

import numpy as np

from hollowkit.noise import Noise3
from . import layout as L

MIN_Y = -64


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


class Fields:
    """2D fields over the region (index [i, k] = world x0+i, z0+k)."""

    def __init__(self, world, seed=1957, edge_fade=True):
        self.w = world
        self.edge_fade = edge_fade
        self.n1, self.n2, self.n3, self.n4 = Noise3(seed), Noise3(seed + 1), Noise3(seed + 2), Noise3(seed + 3)
        xs = np.arange(world.W) + world.x0
        zs = np.arange(world.D) + world.z0
        self.X, self.Z = np.meshgrid(xs.astype(float), zs.astype(float), indexing="ij")

    def noise2(self, n, scale, octaves=4, offset=0.0):
        P = np.stack([self.X.ravel() * scale, self.Z.ravel() * scale, np.full(self.X.size, offset)], 1)
        return n.fbm(P, octaves=octaves).reshape(self.X.shape)

    def dist(self, c):
        return np.hypot(self.X - c[0], self.Z - c[1])

    def crater_dist(self):
        """Distance to Ground Zero with a ragged, lobed edge, so the crater is not a compass circle."""
        if not hasattr(self, "_cd"):
            ang = np.arctan2(self.Z - L.GZ[1], self.X - L.GZ[0])
            lobes = np.sin(ang * 3 + 0.7) * 2.5 + np.sin(ang * 5 + 2.1) * 1.6
            self._cd = self.dist(L.GZ) - lobes - self.noise2(self.n2, 1 / 14, 2, 23.0) * 3.5
        return self._cd


def build_height(F):
    X, Z = F.X, F.Z
    # island outline: a union of warped ellipse lobes, with bays bitten out, then a ragged coast
    wx = F.noise2(F.n1, 1 / 160, 3) * 85
    wz = F.noise2(F.n2, 1 / 160, 3, 9.0) * 85
    Xw, Zw = X + wx, Z + wz
    lobes = [((0, 20), (235, 215), 0), ((15, -195), (150, 112), 10), ((-205, -10), (118, 175), -8),
             ((175, 175), (125, 72), 32), ((225, 25), (95, 150), 0), ((-120, 200), (110, 70), -20),
             ((-30, 222), (125, 62), 4), ((-150, -160), (95, 72), 15), ((170, -138), (85, 62), -10)]
    d = np.full(X.shape, 9.0)
    for (cx, cz), (rx, rz), ang in lobes:
        ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        u = ((Xw - cx) * ca + (Zw - cz) * sa) / rx
        v = (-(Xw - cx) * sa + (Zw - cz) * ca) / rz
        d = np.minimum(d, np.hypot(u, v))
    for (cx, cz), rad in (((-150, 300), 55), ((-262, -205), 50), ((275, -105), 44), ((100, 262), 32)):
        bite = np.hypot(Xw - cx, Zw - cz) / rad
        d = np.maximum(d, 1.9 - bite)
    coast = F.noise2(F.n3, 1 / 45, 4) * 0.12
    d = d + coast
    land = smoothstep(1.0, 0.8, d)                    # 1 inland, 0 at sea
    # base lowland height + rolling hills
    hills = F.noise2(F.n1, 1 / 90, 4, 3.3)
    detail = F.noise2(F.n2, 1 / 26, 3, 7.1)
    h = L.SEA - 1 + land * (7 + hills * 10 + detail * 2.5)
    # seafloor shelf around the island down to the flat ocean floor
    sea = 1 - land
    shelf = L.FLOOR + (L.SEA - 4 - L.FLOOR) * smoothstep(1.45, 0.98, d)
    h = np.where(land > 0.02, h, shelf + detail * 1.5)
    # north peak: a ridged mountain that falls steeply to the north coast
    pk = np.exp(-(((X - L.NORTH_PEAK[0]) / 105) ** 2 + ((Z - L.NORTH_PEAK[1]) / 72) ** 2))
    ridge = 1 - np.abs(F.noise2(F.n3, 1 / 70, 4, 2.2))
    h += land * pk * (70 + ridge * 26)
    # western hills under Blackwood, gentle eastern rise
    wh = np.exp(-(((X + 190) / 120) ** 2 + ((Z - 0) / 150) ** 2))
    h += land * wh * (14 + hills * 6)
    # mangrove shallows: flatten the east coast to a maze of mud banks and pools
    mg = smoothstep(150, 210, X) * np.exp(-((Z - L.MANGROVES[1]) / 150) ** 2) * land
    pools = F.noise2(F.n4, 1 / 14, 2)
    mangrove_h = L.SEA - 1 + (pools > 0.05) * 1 + (pools > 0.22) * 1
    h = h * (1 - mg) + mangrove_h * mg
    # Crash Beach: a wide sandy bay in the south
    bay = np.exp(-(((X - L.CRASH[0]) / 70) ** 2 + ((Z - (L.CRASH[1] + 10)) / 40) ** 2))
    h = h * (1 - bay * 0.65) + (L.SEA + 1) * bay * 0.65
    # Ground Zero: a raised rim around a bowl, the floor scoured flat by the blast
    rg = F.crater_dist()
    rim = np.exp(-((rg - L.CRATER_R) / 7.5) ** 2) * 9
    bowl = smoothstep(L.CRATER_R + 2, L.CRATER_R - 14, rg)
    floor = 51 + F.noise2(F.n2, 1 / 18, 2, 4.4) * 2
    flat_ring = smoothstep(L.CRATER_R + 70, L.CRATER_R + 10, rg)   # blast-flattened ground
    around = L.SEA + 4 + F.noise2(F.n1, 1 / 40, 2) * 2
    h = h * (1 - flat_ring * 0.55) + around * flat_ring * 0.55
    h = h * (1 - bowl) + floor * bowl + rim * (1 - bowl)
    # flatten building sites
    for c, rad, lvl in ((L.MOCK_TOWN, 46, None), (L.SUNFALL, 40, None), (L.PENS, 30, None), (L.DOCK, 22, L.SEA + 2)):
        m = smoothstep(rad + 18, rad, F.dist(c))
        inside = F.dist(c) < rad
        if not inside.any():
            continue
        target = lvl if lvl is not None else float(np.median(h[inside]))
        h = h * (1 - m) + target * m
    # the last 40 blocks of the region settle onto the flat ocean floor the game generates beyond it
    edge = np.minimum(np.minimum(F.X - F.X.min(), F.X.max() - F.X), np.minimum(F.Z - F.Z.min(), F.Z.max() - F.Z))
    e = smoothstep(8, 40, edge) if F.edge_fade else np.ones_like(edge)
    h = np.where(h < L.SEA, h * e + L.FLOOR * (1 - e), h)
    return np.round(h).astype(np.int32), land, d


def build_biomes(F, h, land):
    B = L.BIOME
    X = F.X + F.noise2(F.n3, 1 / 50, 3, 2.0) * 38          # warped coordinates: no ruler-straight edges
    Z = F.Z + F.noise2(F.n4, 1 / 50, 3, 6.0) * 38
    bio = np.full(h.shape, B["warm_ocean"], np.int32)
    onland = h >= L.SEA - 1
    bio[onland] = B["forest"]
    plainsish = F.noise2(F.n4, 1 / 110, 2, 5.5) > 0.12
    bio[onland & plainsish] = B["plains"]
    birch = F.noise2(F.n1, 1 / 70, 2, 12.0) > 0.3
    bio[onland & birch & ~plainsish] = B["birch_forest"]
    bio[onland & (X + F.noise2(F.n2, 1 / 90, 3, 1.7) * 70 < -120)] = B["roofed_forest"]
    bio[onland & (np.hypot(X - L.SUNFALL[0], Z - L.SUNFALL[1]) < 85)] = B["meadow"]
    bio[onland & (np.hypot(X - L.MOCK_TOWN[0], Z - L.MOCK_TOWN[1]) < 64)] = B["plains"]
    bio[onland & (np.hypot((X - L.NORTH_PEAK[0]) / 1.4, Z - L.NORTH_PEAK[1]) < 80) & (h > 90)] = B["stony_peaks"]
    mg = (X > 170) & (np.abs(Z - L.MANGROVES[1]) < 145) & (h >= L.SEA - 4) & (land > 0.05)
    bio[mg] = B["mangrove_swamp"]
    beach = onland & (h <= L.SEA + 2) & ~mg & (land < 0.97)
    bio[beach] = B["beach"]
    rg = np.hypot(X - L.GZ[0], Z - L.GZ[1])
    rg_true = F.crater_dist()
    bio[(rg < L.CRATER_R + 72) & (h >= L.SEA - 8)] = B[L.SCORCHED_BIOME]
    bio[rg_true < L.CRATER_R + 4] = B[L.TOXIC_BIOME]
    return bio


class Terrain:
    def __init__(self, world, seed=1957, edge_fade=True):
        self.w = world
        self.F = Fields(world, seed, edge_fade)
        self.rng = np.random.default_rng(seed)
        self.h, self.land, self.d = build_height(self.F)
        self.bio = build_biomes(self.F, self.h, self.land)
        self.crater_lake = 60

    # ----------------------------------------------------------------- blocks
    def fill(self):
        w, h, F = self.w, self.h, self.F
        W, D, H = w.W, w.D, w.H
        ids = {n: w.id(n) for n in ("bedrock", "stone", "dirt", "grass_block", "sand", "sandstone", "gravel",
                                     "coarse_dirt", "podzol", "mud", "clay", "tuff", "blackstone", "calcite",
                                     "andesite", "moss_block", "smooth_basalt", "green_stained_glass")}
        ids["deepslate"] = w.id("deepslate", pillar_axis="y")
        ids["water"] = w.id("water", liquid_depth=0)
        ys = np.arange(H) + MIN_Y                      # world y per layer
        top = h[:, None, :]                            # [W,1,D]
        Y = ys[None, :, None]
        blocks = w.blocks
        blocks[:] = 0
        solid = Y <= top
        blocks[solid] = ids["stone"]
        blocks[(Y < 0) & solid] = ids["deepslate"]
        # deepslate/stone boundary noise
        blocks[:, 0, :] = ids["bedrock"]
        bed2 = self.rng.random((W, D)) < 0.5
        blocks[:, 1, :][bed2] = ids["bedrock"]
        # slope for surface choice
        gx = np.abs(np.diff(h, axis=0, append=h[-1:, :]))
        gz = np.abs(np.diff(h, axis=1, append=h[:, -1:]))
        slope = np.maximum(gx, gz)
        B = L.BIOME
        bio = self.bio
        surf = np.full(h.shape, ids["grass_block"], np.int32)
        sub = np.full(h.shape, ids["dirt"], np.int32)
        depth = np.full(h.shape, 4, np.int32)
        underwater = h < L.SEA
        surf[underwater] = ids["sand"]
        sub[underwater] = ids["sand"]
        gravel_patch = F.noise2(F.n3, 1 / 30, 2, 8.8) > 0.25
        surf[underwater & gravel_patch] = ids["gravel"]
        clay_patch = F.noise2(F.n4, 1 / 22, 2, 1.5) > 0.32
        surf[underwater & clay_patch & (h > 52)] = ids["clay"]
        isb = bio == B["beach"]
        surf[isb], sub[isb], depth[isb] = ids["sand"], ids["sandstone"], 5
        rf = bio == B["roofed_forest"]
        pod = F.noise2(F.n2, 1 / 16, 2, 3.0)
        surf[rf & (pod > 0.18)] = ids["podzol"]
        surf[rf & (pod < -0.28)] = ids["coarse_dirt"]
        mg = bio == B["mangrove_swamp"]
        surf[mg], sub[mg] = ids["mud"], ids["mud"]
        mossy = F.noise2(F.n1, 1 / 9, 2, 6.0) > 0.3
        surf[mg & mossy & ~underwater] = ids["moss_block"]
        pk = bio == B["stony_peaks"]
        surf[pk], sub[pk] = ids["stone"], ids["stone"]
        cal = F.noise2(F.n4, 1 / 12, 2, 2.0) > 0.35
        surf[pk & cal] = ids["calcite"]
        steep = (slope >= 3) & ~underwater
        surf[steep & ~isb] = ids["stone"]
        surf[(slope == 2) & ~underwater & ~isb & (pod > 0.3)] = ids["gravel"]
        # scorched blast ring and the crater
        sc = bio == B[L.SCORCHED_BIOME]
        scn = F.noise2(F.n2, 1 / 11, 2, 9.0)
        surf[sc] = ids["coarse_dirt"]
        surf[sc & (scn > 0.15)] = ids["gravel"]
        surf[sc & (scn < -0.25)] = ids["dirt"]
        surf[sc & (scn > 0.4)] = ids["tuff"]
        tx = bio == B[L.TOXIC_BIOME]
        rg = F.crater_dist()
        surf[tx], sub[tx], depth[tx] = ids["tuff"], ids["blackstone"], 3
        glassy = (F.noise2(F.n3, 1 / 6, 2, 4.0) > 0.25) & (rg < L.CRATER_R + 6)
        surf[tx & glassy] = ids["green_stained_glass"]       # trinitite, fused sand glass
        surf[tx & (h < self.crater_lake - 1)] = ids["mud"]
        # the lake floor glows: green froglight seams in the mud read as a sick light at night
        glow = (F.noise2(F.n1, 1 / 5, 1, 17.0) > 0.42) & tx & (h < self.crater_lake - 2)
        surf[glow] = w.id("verdant_froglight", pillar_axis="y")
        surf[sc & (rg < L.CRATER_R + 16) & (scn > -0.1)] = ids["smooth_basalt"]
        # write surface layers
        I, K = np.meshgrid(np.arange(W), np.arange(D), indexing="ij")
        hj = h - MIN_Y
        for k in range(1, 7):
            m = depth >= k
            jj = hj - k
            ok = m & (jj > 1)
            blocks[I[ok], jj[ok], K[ok]] = sub[ok]
        ok = hj > 1
        blocks[I[ok], hj[ok], K[ok]] = surf[ok]
        # water: sea everywhere below sea level outside the crater, the crater lake inside it
        crater = rg < L.CRATER_R - 2
        wtop = np.where(crater, self.crater_lake, L.SEA)
        wet = (Y > top) & (Y <= wtop[:, None, :])
        blocks[wet] = ids["water"]
        self.ids = ids
        w.biome[:] = self.bio

    # ----------------------------------------------------------------- caves + ores
    def carve(self):
        """Cheese caves and spaghetti tunnels from coarse 3D noise, in x-slabs to bound memory."""
        from scipy.ndimage import zoom
        w, h = self.w, self.h
        W, D, H = w.W, w.D, w.H
        step, slab = 4, 64
        rgall = self.F.crater_dist()
        air = w.air
        b = w.blocks
        ys = (np.arange(H) + MIN_Y)[None, :, None]
        for i0 in range(0, W, slab):
            i1 = min(W, i0 + slab)
            gx, gy, gz = np.meshgrid(np.arange(i0, i1 + step, step), np.arange(0, H + step, step),
                                     np.arange(0, D + step, step), indexing="ij")
            P = np.stack([(gx.ravel() + w.x0) / 38.0, (gy.ravel() + MIN_Y) / 22.0, (gz.ravel() + w.z0) / 38.0], 1)
            cheese = self.F.n4.fbm(P, octaves=2).reshape(gx.shape).astype(np.float32)
            P2 = np.stack([(gx.ravel() + w.x0) / 24.0, (gy.ravel() + MIN_Y) / 24.0, (gz.ravel() + w.z0) / 24.0], 1)
            sp = np.abs(self.F.n3.fbm(P2, octaves=2)).reshape(gx.shape).astype(np.float32)
            cheese = zoom(cheese, step, order=1)[:i1 - i0, :H, :D]
            sp = zoom(sp, step, order=1)[:i1 - i0, :H, :D]
            top = h[i0:i1, None, :]
            dry = (top >= L.SEA + 3)
            keep_out = (rgall[i0:i1] < L.CRATER_R + 20)[:, None, :]
            cave = ((cheese > 0.32) | (sp < 0.035)) & (ys < top - 8) & (ys > -58) & dry & ~keep_out
            b[i0:i1][cave] = air
        # ores by depth (only into stone/deepslate)
        stone, deep = self.ids["stone"], self.ids["deepslate"]
        rng = self.rng
        def ore(name, deep_name, count, ymin, ymax, size):
            oid = w.id(name)
            did = w.id(deep_name) if deep_name else oid
            for _ in range(count):
                x = rng.integers(2, W - 2)
                z = rng.integers(2, D - 2)
                y = rng.integers(ymin - MIN_Y, ymax - MIN_Y)
                for _ in range(size):
                    xi, yi, zi = x + rng.integers(-1, 2), y + rng.integers(-1, 2), z + rng.integers(-1, 2)
                    if 0 <= xi < W and 0 < yi < H and 0 <= zi < D:
                        cur = b[xi, yi, zi]
                        if cur == stone:
                            b[xi, yi, zi] = oid
                        elif cur == deep:
                            b[xi, yi, zi] = did
        area = (W * D) / (768 * 768)
        ore("coal_ore", "deepslate_coal_ore", int(5200 * area), 0, 130, 9)
        ore("iron_ore", "deepslate_iron_ore", int(3600 * area), -40, 72, 6)
        ore("copper_ore", "deepslate_copper_ore", int(2400 * area), -10, 80, 7)
        ore("gold_ore", "deepslate_gold_ore", int(700 * area), -60, 30, 5)
        ore("redstone_ore", "deepslate_redstone_ore", int(900 * area), -60, 10, 6)
        ore("lapis_ore", "deepslate_lapis_ore", int(500 * area), -50, 30, 5)
        ore("diamond_ore", "deepslate_diamond_ore", int(320 * area), -60, 12, 4)
