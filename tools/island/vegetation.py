"""Trees and ground cover for Varrow Island.

Every tree is written straight into the world array. Leaves are persistent (they never decay,
so palms and broken canopies stay as built) and trees only grow into air. Ground cover is
vectorised over the whole region: grass, flowers, ferns, fireflies under the dark wood, dry
grass and dead bushes on the burn, seagrass, kelp and lily pads in the water.
"""
import math

import numpy as np

from . import layout as L
from .bedrock_world import MIN_Y

# trees never grow here (story sites, roads of travel, the wreck)
NO_TREES = [
    (L.CRASH, 30), (L.SPAWN, 10), (L.MOCK_TOWN, 50), (L.SUNFALL, 44), (L.PENS, 34), (L.DOCK, 26),
    (L.TOWER, 14), *[(c, 9) for c in L.STATIONS.values()], *[(c, 8) for c in L.BUNKERS.values()],
]


def _ball(r, squash=1.0, jitter=0.0, rng=None):
    """Offsets of a (squashed) ball of leaves, with ragged edges."""
    R = int(math.ceil(r))
    out = []
    for dx in range(-R, R + 1):
        for dy in range(-R, R + 1):
            for dz in range(-R, R + 1):
                d = math.sqrt(dx * dx + (dy / squash) ** 2 + dz * dz)
                lim = r + (rng.uniform(-jitter, jitter) if rng is not None else 0)
                if d <= lim:
                    out.append((dx, dy, dz))
    return np.array(out, dtype=np.int32)


class Planter:
    def __init__(self, terrain, seed=31):
        self.t = terrain
        self.w = terrain.w
        self.rng = np.random.default_rng(seed)
        w = self.w
        self.air = w.air
        self.water = terrain.ids["water"]
        self.id = {}
        for n in ("oak", "birch", "dark_oak", "jungle", "spruce", "mangrove"):
            self.id[n + "_log"] = w.id(n + "_log", pillar_axis="y")
            self.id[n + "_log_x"] = w.id(n + "_log", pillar_axis="x")
            self.id[n + "_log_z"] = w.id(n + "_log", pillar_axis="z")
            self.id[n + "_leaves"] = w.id(n + "_leaves", persistent_bit=True)
        self.id["roots"] = w.id("mangrove_roots")
        self.id["muddy_roots"] = w.id("muddy_mangrove_roots", pillar_axis="y")
        self.id["stripped_oak"] = w.id("stripped_oak_log", pillar_axis="y")
        self.id["stripped_oak_x"] = w.id("stripped_oak_log", pillar_axis="x")
        self.id["stripped_oak_z"] = w.id("stripped_oak_log", pillar_axis="z")
        self.vines = {d: w.id("vine", vine_direction_bits=b) for d, b in
                      (((0, 1), 4), ((0, -1), 1), ((1, 0), 2), ((-1, 0), 8))}  # keyed by offset from the log
        self.trees = 0
        self._balls = {}

    # --------------------------------------------------------------- primitives
    def ball(self, r, squash=1.0):
        k = (round(r * 2) / 2, squash)
        if k not in self._balls:
            self._balls[k] = [_ball(k[0], squash, 0.45, np.random.default_rng(i * 7 + int(r * 10)))
                              for i in range(4)]
        return self._balls[k][self.rng.integers(0, 4)]

    def put(self, x, y, z, b, over_air_only=True, over=()):
        w = self.w
        i, j, k = x - w.x0, y - MIN_Y, z - w.z0
        if 0 <= i < w.W and 0 < j < w.H and 0 <= k < w.D:
            cur = w.blocks[i, j, k]
            if not over_air_only or cur == self.air or cur in over:
                w.blocks[i, j, k] = b
                return True
        return False

    def leaves(self, cx, cy, cz, offs, leaf, hole=0.0):
        w = self.w
        I = offs[:, 0] + cx - w.x0
        J = offs[:, 1] + cy - MIN_Y
        K = offs[:, 2] + cz - w.z0
        ok = (I >= 0) & (I < w.W) & (J > 0) & (J < w.H) & (K >= 0) & (K < w.D)
        if hole:
            ok &= self.rng.random(len(I)) >= hole
        I, J, K = I[ok], J[ok], K[ok]
        free = w.blocks[I, J, K] == self.air
        w.blocks[I[free], J[free], K[free]] = leaf

    def column(self, x, y0, z, n, b, over=()):
        for y in range(y0, y0 + n):
            self.put(x, y, z, b, over=over)

    def branch(self, x, y, z, dx, dz, n, kind, rise=1):
        """A sloping limb of n logs; returns its tip."""
        ax = self.id[kind + ("_x" if dx else "_z")]
        for s in range(1, n + 1):
            x, z = x + dx, z + dz
            if s % 2 == 0 and rise:
                y += 1
            self.put(x, y, z, ax)
        return x, y, z

    # --------------------------------------------------------------- tree kinds
    def oak(self, x, y, z, big=False):
        r = self.rng
        if big:
            hgt = int(r.integers(8, 12))
            self.column(x, y, z, hgt, self.id["oak_log"])
            self.leaves(x, y + hgt, z, self.ball(3.4, 0.75), self.id["oak_leaves"], 0.08)
            for _ in range(int(r.integers(2, 5))):
                dx, dz = [(1, 0), (-1, 0), (0, 1), (0, -1)][r.integers(0, 4)]
                tip = self.branch(x, y + int(r.integers(hgt // 2, hgt - 1)), z, dx, dz, int(r.integers(2, 5)), "oak_log")
                self.leaves(*tip, self.ball(2.4, 0.7), self.id["oak_leaves"], 0.1)
        else:
            hgt = int(r.integers(4, 7))
            self.column(x, y, z, hgt, self.id["oak_log"])
            self.leaves(x, y + hgt - 1, z, self.ball(2.6, 0.8), self.id["oak_leaves"], 0.06)

    def birch(self, x, y, z):
        hgt = int(self.rng.integers(6, 9))
        self.column(x, y, z, hgt, self.id["birch_log"])
        self.leaves(x, y + hgt - 1, z, self.ball(2.2, 1.3), self.id["birch_leaves"], 0.08)

    def spruce(self, x, y, z):
        r = self.rng
        hgt = int(r.integers(8, 13))
        self.column(x, y, z, hgt, self.id["spruce_log"])
        leaf = self.id["spruce_leaves"]
        for s in range(3, hgt + 2):
            rad = max(0.6, (hgt + 1 - s) * 0.32 + (0.6 if s % 2 else 0))
            for dx in range(-3, 4):
                for dz in range(-3, 4):
                    if dx * dx + dz * dz <= rad * rad + 0.3 and (dx or dz or s >= hgt):
                        self.put(x + dx, y + s, z + dz, leaf)

    def dark_oak(self, x, y, z):
        """2x2 trunk, wide flat crown, roots flaring, vines hanging off the trunk."""
        r = self.rng
        hgt = int(r.integers(7, 11))
        log = self.id["dark_oak_log"]
        for dx in (0, 1):
            for dz in (0, 1):
                self.column(x + dx, y, z + dz, hgt - int(r.integers(0, 2)), log)
        crown = self.ball(4.6, 0.45)
        self.leaves(x, y + hgt, z, crown, self.id["dark_oak_leaves"], 0.05)
        for _ in range(int(r.integers(2, 4))):
            dx, dz = [(1, 0), (-1, 0), (0, 1), (0, -1)][r.integers(0, 4)]
            tip = self.branch(x, y + hgt - 3, z, dx, dz, int(r.integers(3, 5)), "dark_oak_log")
            self.leaves(*tip, self.ball(2.8, 0.5), self.id["dark_oak_leaves"], 0.08)
        # vines down the trunk faces
        for (dx, dz), vb in self.vines.items():
            if r.random() < 0.55:
                bx = x + (2 if dx > 0 else (-1 if dx < 0 else int(r.integers(0, 2))))
                bz = z + (2 if dz > 0 else (-1 if dz < 0 else int(r.integers(0, 2))))
                top = y + hgt - 1
                for yy in range(top, top - int(r.integers(3, hgt)), -1):
                    self.put(bx, yy, bz, vb)

    def palm(self, x, y, z):
        r = self.rng
        hgt = int(r.integers(6, 10))
        lean = [(1, 0), (-1, 0), (0, 1), (0, -1)][r.integers(0, 4)]
        log, leaf = self.id["jungle_log"], self.id["jungle_leaves"]
        cx, cz = x, z
        for s in range(hgt):
            if s in (hgt // 2, hgt - 2):
                cx, cz = cx + lean[0], cz + lean[1]
            self.put(cx, y + s, cz, log)
        ty = y + hgt
        self.put(cx, ty, cz, leaf)
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            n = 3 if dx and dz else 4
            for s in range(1, n + 1):
                self.put(cx + dx * s, ty - (1 if s >= n - 1 else 0), cz + dz * s, leaf)
            self.put(cx + dx * n, ty - 2, cz + dz * n, leaf)

    def mangrove(self, x, y, z):
        """Stands on arched roots above the mud; roots reach down into the water."""
        r = self.rng
        lift = int(r.integers(2, 4))
        roots, wl = self.id["roots"], self.water
        w = self.w
        base = y + lift
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            reach = int(r.integers(2, 4))
            rx, rz = x + dx * reach, z + dz * reach
            for yy in range(base, y - 2, -1):
                f = (base - yy) / max(1, lift + 1)
                px = x + int(round(dx * reach * min(1, f + 0.3)))
                pz = z + int(round(dz * reach * min(1, f + 0.3)))
                was_water = w.get(px, yy, pz) == wl
                if self.put(px, yy, pz, roots, over=(wl,)) and was_water:
                    w.waterlog_many([px - w.x0], [yy - MIN_Y], [pz - w.z0])
            self.put(rx, y, rz, self.id["muddy_roots"], over_air_only=False)
        hgt = int(r.integers(4, 7))
        self.column(x, base, z, hgt, self.id["mangrove_log"], over=(wl,))
        self.leaves(x, base + hgt, z, self.ball(3.0, 0.65), self.id["mangrove_leaves"], 0.06)

    def dead(self, x, y, z, charred=False):
        r = self.rng
        kind = "dark_oak_log" if charred else ("stripped_oak" if r.random() < 0.5 else "oak_log")
        hgt = int(r.integers(4, 9))
        self.column(x, y, z, hgt, self.id[kind])
        for _ in range(int(r.integers(1, 4))):
            dx, dz = [(1, 0), (-1, 0), (0, 1), (0, -1)][r.integers(0, 4)]
            self.branch(x, y + int(r.integers(2, hgt)), z, dx, dz, int(r.integers(1, 4)), kind)

    def fallen(self, x, y, z, charred=False):
        r = self.rng
        kind = "dark_oak_log" if charred else "oak_log"
        dx, dz = [(1, 0), (0, 1)][r.integers(0, 2)]
        ax = self.id[kind + ("_x" if dx else "_z")]
        for s in range(int(r.integers(3, 7))):
            self.put(x + dx * s, y, z + dz * s, ax)

    # --------------------------------------------------------------- placement
    def plant_trees(self):
        t, w, r = self.t, self.w, self.rng
        B = L.BIOME
        h, bio, F = t.h, t.bio, t.F
        gx = np.abs(np.diff(h, axis=0, append=h[-1:, :]))
        gz = np.abs(np.diff(h, axis=1, append=h[:, -1:]))
        slope = np.maximum(gx, gz)
        clump = F.noise2(F.n1, 1 / 55, 2, 21.0)          # groves and clearings
        spacing = {B["forest"]: 4.6, B["birch_forest"]: 5, B["roofed_forest"]: 5, B["plains"]: 15,
                   B["meadow"]: 22, B["stony_peaks"]: 11, B["mangrove_swamp"]: 7, B["beach"]: 12,
                   B[L.SCORCHED_BIOME]: 12}
        out = []
        cell = 5
        for i0 in range(2, w.W - 2, cell):
            for k0 in range(2, w.D - 2, cell):
                i = i0 + int(r.integers(0, cell))
                k = k0 + int(r.integers(0, cell))
                if i >= w.W - 2 or k >= w.D - 2:
                    continue
                b = int(bio[i, k])
                sp = spacing.get(b)
                if sp is None:
                    continue
                dens = (cell / sp) ** 2
                if b in (B["forest"], B["birch_forest"], B["roofed_forest"]):
                    dens *= 0.35 + 1.1 * (clump[i, k] + 0.6)
                if r.random() > dens:
                    continue
                x, z = i + w.x0, k + w.z0
                y = int(h[i, k])
                if slope[i, k] > 2 and b != B["stony_peaks"]:
                    continue
                if any((x - c[0]) ** 2 + (z - c[1]) ** 2 < rad * rad for c, rad in NO_TREES):
                    continue
                out.append((b, x, y, z))
        for b, x, y, z in out:
            top = self.w.blocks[x - w.x0, y - MIN_Y, z - w.z0]
            if b == B["mangrove_swamp"]:
                if y < L.SEA - 3:
                    continue
                self.mangrove(x, y + 1, z)
            elif y < L.SEA or top == self.water:
                continue
            elif b == B["beach"]:
                self.palm(x, y + 1, z)
            elif b == B[L.SCORCHED_BIOME]:
                if r.random() < 0.3:
                    self.fallen(x, y + 1, z, charred=True)
                else:
                    self.dead(x, y + 1, z, charred=True)
            elif b == B["roofed_forest"]:
                v = r.random()
                if v < 0.62:
                    self.dark_oak(x, y + 1, z)
                elif v < 0.82:
                    self.dead(x, y + 1, z)
                else:
                    self.oak(x, y + 1, z, big=True)
            elif b == B["birch_forest"]:
                self.birch(x, y + 1, z) if r.random() < 0.85 else self.oak(x, y + 1, z)
            elif b == B["stony_peaks"]:
                if y < 130:
                    self.spruce(x, y + 1, z)
            else:
                v = r.random()
                if v < 0.08:
                    self.oak(x, y + 1, z, big=True)
                elif v < 0.62:
                    self.oak(x, y + 1, z)
                elif v < 0.82:
                    self.birch(x, y + 1, z)
                elif v < 0.9:
                    self.spruce(x, y + 1, z)
                elif v < 0.96:
                    self.dead(x, y + 1, z)
                else:
                    self.fallen(x, y + 1, z)
            self.trees += 1
        return self.trees

    def ground_cover(self):
        t, w, r = self.t, self.w, self.rng
        B, ids = L.BIOME, t.ids
        h, bio, F = t.h, t.bio, t.F
        W, D = w.W, w.D
        I, K = np.meshgrid(np.arange(W), np.arange(D), indexing="ij")
        J = h - MIN_Y
        surf = w.blocks[I, J, K]
        above = w.blocks[I, np.minimum(J + 1, w.H - 1), K]
        free = (above == self.air) & (J + 2 < w.H)
        U = r.random((W, D))
        V = r.random((W, D))
        meadowy = F.noise2(F.n3, 1 / 25, 2, 14.0)
        grass = (surf == ids["grass_block"]) & free
        podzol = np.isin(surf, [ids["podzol"], ids["coarse_dirt"]]) & free
        sc = (bio == B[L.SCORCHED_BIOME]) & free & (h >= L.SEA)
        beach = (bio == B["beach"]) & (surf == ids["sand"]) & free
        moss = (surf == ids["moss_block"]) & free
        place = np.full((W, D), -1, np.int64)
        tall = np.full((W, D), -1, np.int64)

        def pick(mask, prob, block, tall_block=None):
            m = mask & (U < prob) & (place < 0)
            place[m] = block
            if tall_block is not None:
                tall[m] = tall_block
            U[m] = 2.0

        sg, tg_lo, tg_hi = w.id("short_grass"), w.id("tall_grass", upper_block_bit=False), w.id("tall_grass", upper_block_bit=True)
        fern, lf_lo, lf_hi = w.id("fern"), w.id("large_fern", upper_block_bit=False), w.id("large_fern", upper_block_bit=True)
        flowers = [w.id(n) for n in ("poppy", "dandelion", "oxeye_daisy", "cornflower", "azure_bluet")]
        dead, sdry, tdry = w.id("deadbush"), w.id("short_dry_grass"), w.id("tall_dry_grass")
        bush, firefly = w.id("bush"), w.id("firefly_bush")
        litter = [w.id("leaf_litter", growth=g, **{"minecraft:cardinal_direction": d})
                  for g in (1, 3, 5) for d in ("north", "south", "east", "west")]
        mush = [w.id("brown_mushroom"), w.id("red_mushroom")]
        berries = w.id("sweet_berry_bush", growth=3)
        mosscarpet = w.id("moss_carpet")

        forest = np.isin(bio, [B["forest"], B["birch_forest"]])
        dark = bio == B["roofed_forest"]
        open_ = np.isin(bio, [B["plains"], B["meadow"]])
        # flowers in drifts, not confetti
        flower_at = open_ & grass & (meadowy > 0.25)
        pick(flower_at, 0.22, -2)
        fl = place == -2
        place[fl] = np.array(flowers)[((meadowy[fl] * 40).astype(int)) % len(flowers)]
        pick(dark & (grass | podzol), 0.025, firefly)
        pick(dark & (grass | podzol), 0.03, -3)
        lm = place == -3
        place[lm] = np.array(mush)[(V[lm] * 2).astype(int)]
        pick(dark & (grass | podzol), 0.10, -4)
        lm = place == -4
        place[lm] = np.array(litter)[(V[lm] * len(litter)).astype(int)]
        pick(dark & grass, 0.16, fern)
        pick(dark & grass, 0.06, lf_lo, lf_hi)
        pick(forest & grass, 0.06, -4)
        lm = place == -4
        place[lm] = np.array(litter)[(V[lm] * len(litter)).astype(int)]
        pick(forest & grass, 0.012, berries)
        pick(forest & grass, 0.05, bush)
        pick(forest & grass, 0.07, fern)
        pick(forest & grass, 0.05, tg_lo, tg_hi)
        pick(forest & grass, 0.30, sg)
        pick(open_ & grass, 0.12, tg_lo, tg_hi)
        pick(open_ & grass, 0.42, sg)
        pick(grass, 0.18, sg)
        pick(sc & ~(surf == ids["smooth_basalt"]), 0.05, dead)
        pick(sc, 0.10, sdry)
        pick(sc, 0.04, tdry)
        pick(beach, 0.03, dead)
        pick(beach, 0.05, sdry)
        pick(moss, 0.35, mosscarpet)
        m = place >= 0
        w.blocks[I[m], J[m] + 1, K[m]] = place[m]
        m2 = m & (tall >= 0) & (J + 2 < w.H)
        up = w.blocks[I[m2], J[m2] + 2, K[m2]] == self.air
        w.blocks[I[m2][up], J[m2][up] + 2, K[m2][up]] = tall[m2][up]
        bad = m2.copy()
        bad[m2] = ~up                                          # no room for the top half: short grass
        w.blocks[I[bad], J[bad] + 1, K[bad]] = sg
        planted = int(m.sum())

        # ---- water: seagrass meadows, kelp forests off the reef, lily pads in the mangroves
        depth = L.SEA - h
        crater = F.dist(L.GZ) < L.CRATER_R
        seabed = (depth >= 2) & (above == self.water) & ~crater
        sgrass = w.id("seagrass")
        tall_sg_lo = w.id("seagrass", sea_grass_type="double_bot")
        tall_sg_hi = w.id("seagrass", sea_grass_type="double_top")
        kelp_bed = F.noise2(F.n4, 1 / 40, 2, 30.0) > 0.15
        meadow_bed = F.noise2(F.n2, 1 / 30, 2, 31.0) > -0.1
        kelp_m = seabed & kelp_bed & (depth >= 6) & (U < 0.25)
        sg_m = seabed & ~kelp_m & meadow_bed & (V < 0.45)
        tall_m = sg_m & (V < 0.12) & (depth >= 3)
        sg_m &= ~tall_m
        wI, wJ, wK = [], [], []
        w.blocks[I[sg_m], J[sg_m] + 1, K[sg_m]] = sgrass
        wI.append(I[sg_m]), wJ.append(J[sg_m] + 1), wK.append(K[sg_m])
        w.blocks[I[tall_m], J[tall_m] + 1, K[tall_m]] = tall_sg_lo
        w.blocks[I[tall_m], J[tall_m] + 2, K[tall_m]] = tall_sg_hi
        wI += [I[tall_m], I[tall_m]]
        wJ += [J[tall_m] + 1, J[tall_m] + 2]
        wK += [K[tall_m], K[tall_m]]
        kelp_top = w.id("kelp", kelp_age=int(r.integers(10, 25)))
        kelp_body = w.id("kelp", kelp_age=0)
        for i, k in zip(I[kelp_m], K[kelp_m]):
            j0 = int(J[i, k]) + 1
            n = int(r.integers(3, max(4, int(depth[i, k]) - 1)))
            n = min(n, int(depth[i, k]) - 1)
            for s in range(n):
                w.blocks[i, j0 + s, k] = kelp_top if s == n - 1 else kelp_body
                wI.append([i]), wJ.append([j0 + s]), wK.append([k])
        pickle = w.id("sea_pickle", cluster_count=2, dead_bit=False)
        pk = seabed & (bio == B["warm_ocean"]) & (depth < 12) & (U > 0.995)
        w.blocks[I[pk], J[pk] + 1, K[pk]] = pickle
        wI.append(I[pk]), wJ.append(J[pk] + 1), wK.append(K[pk])
        w.waterlog_many(np.concatenate([np.ravel(a) for a in wI]), np.concatenate([np.ravel(a) for a in wJ]),
                        np.concatenate([np.ravel(a) for a in wK]))
        # lily pads on still mangrove pools (sit on top of the water surface)
        lily = w.id("waterlily")
        pools = (bio == B["mangrove_swamp"]) & (depth >= 1) & (depth <= 3) & (V > 0.86)
        js = L.SEA - MIN_Y + 1
        ok = pools & (w.blocks[I, js, K] == self.air)
        w.blocks[I[ok], js, K[ok]] = lily
        return planted, int(sg_m.sum() + tall_m.sum() + kelp_m.sum())
