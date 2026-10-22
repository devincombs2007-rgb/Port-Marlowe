"""Hand-built places on Varrow Island, written into the world array.

The helicopter is modelled as a solid in its own frame (u along the body from the nose, v across,
w up) and voxelised through the crash pose by inverse mapping: every world block near the wreck
asks "what part of the aircraft is here?", so a rolled, pitched body has no gaps.
"""
import math

import numpy as np

from . import layout as L
from . import nbt
from .bedrock_world import MIN_Y

AIR, SHELL, GLASS, BELLY, ENGINE, METAL, BURNT, SEAT, FLOOR, ROTOR, INSIDE, STRIPE = range(12)


def rot(yaw, pitch, roll):
    """World-from-local rotation: roll about u, pitch about v, then yaw about the vertical."""
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    cr, sr = math.cos(roll), math.sin(roll)
    Rr = np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]])          # (u, v, w)
    Rp = np.array([[cp, 0, -sp], [0, 1, 0], [sp, 0, cp]])
    Ry = np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]])
    return Ry @ Rp @ Rr


def fuselage(u, v, w):
    """Material id for local points (arrays). Body ~16 long, 4.6 wide, 4.4 tall; tail boom torn off."""
    m = np.zeros(u.shape, np.int8)
    # cross-section half extents along the body: blunt nose, full cabin, taper to the stub of the boom
    half_w = np.interp(u, [0, 1.2, 3.5, 11.5, 15, 16.5], [0.9, 1.9, 2.3, 2.3, 1.2, 0.8])
    top = np.interp(u, [0, 1.2, 3.5, 11.5, 15, 16.5], [1.9, 2.9, 4.4, 4.4, 3.4, 2.8])
    bot = np.interp(u, [0, 1.2, 3.5, 15, 16.5], [0.9, 0.4, 0.0, 0.4, 1.3])
    r = 0.9                                                    # rounded corners
    cw = (bot + top) / 2
    hh = (top - bot) / 2
    qx = np.abs(v) - (half_w - r)
    qy = np.abs(w - cw) - (hh - r)
    sd = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
    body = (sd <= 0) & (u >= 0) & (u <= 16.5)
    shell = body & (sd > -1.45)          # thick enough that no rotation leaves pinholes
    m[body] = INSIDE
    m[shell] = SHELL
    m[shell & (w < bot + 0.9)] = BELLY
    m[shell & (np.abs(w - (bot + top) * 0.42) < 0.45) & (u > 1.0)] = STRIPE   # the charter company's red band
    # cockpit glazing: the nose and the upper front sides
    glass = shell & (u < 3.6) & (w > bot + 1.0)
    m[glass] = GLASS
    # cabin doors: big openings on both sides
    door = shell & (u > 5.0) & (u < 9.2) & (w > 0.9) & (w < 3.8) & (np.abs(v) > 1.4)
    m[door] = INSIDE
    # small side windows behind the doors
    win = shell & (u > 10.0) & (u < 11.4) & (w > 2.4) & (w < 3.5) & (np.abs(v) > 1.6)
    m[win] = GLASS
    # cabin floor and two rows of seats
    fl = body & ~shell & (w < bot + 1.6) & (w >= bot + 0.6) & (u > 3.0) & (u < 14)
    m[fl] = FLOOR
    seat = body & ~shell & (w >= bot + 1.6) & (w < bot + 2.6) & ((np.abs(u - 4.4) < 0.5) | (np.abs(u - 12.6) < 0.5)) & (np.abs(v) < 1.6)
    m[seat] = SEAT
    # engine housing and rotor mast on the roof
    eng = (u > 5.5) & (u < 12.5) & (np.abs(v) < 1.3) & (w >= 4.2) & (w < 5.6)
    m[eng] = ENGINE
    mast = (np.abs(u - 8) < 0.6) & (np.abs(v) < 0.6) & (w >= 5.6) & (w < 6.8)
    m[mast] = METAL
    hub = (np.abs(u - 8) < 1.2) & (np.abs(v) < 1.2) & (w >= 6.8) & (w < 7.6)
    m[hub] = METAL
    # two blades still on the hub: one bent down, one snapped short
    b1 = (u > 8) & (u < 16) & (np.abs(v - 0.0) < 0.55) & (np.abs(w - (7.2 - (u - 8) * 0.38)) < 0.5)
    b2 = (u < 8) & (u > 3.5) & (np.abs(v) < 0.55) & (np.abs(w - 7.2) < 0.5)
    m[b1 | b2] = ROTOR
    # the wheel sponsons
    sp = (np.abs(u - 4.5) < 0.6) & (np.abs(np.abs(v) - 2.6) < 0.5) & (w >= -0.6) & (w < 0.6)
    m[sp] = METAL
    return m


def tail_boom(u, v, w):
    m = np.zeros(u.shape, np.int8)
    half = np.interp(u, [0, 9], [0.95, 0.55])
    tube = (u >= 0) & (u <= 9) & (np.abs(v) <= half) & (np.abs(w) <= half)
    m[tube] = SHELL
    fin = (u > 7.5) & (u < 9.5) & (np.abs(v) < 0.5) & (w > 0) & (w < 3.2 - (u - 7.5) * 0.3)
    m[fin] = SHELL
    trot = (np.abs(u - 8.6) < 0.5) & (v > 0.5) & (v < 1.5) & (np.abs(w - 2.0) < 1.6)
    m[trot] = ROTOR
    m[tube & (u < 1.0)] = BURNT                                # the torn end
    return m


class CrashSite:
    def __init__(self, terrain, planter, seed=1104):
        self.t, self.w, self.p = terrain, terrain.w, planter
        self.rng = np.random.default_rng(seed)
        w = self.w
        self.mat = {
            SHELL: w.id("white_concrete"), STRIPE: w.id("red_concrete"), GLASS: w.id("gray_stained_glass"), BELLY: w.id("gray_concrete"),
            ENGINE: w.id("polished_blackstone"), METAL: w.id("iron_block"), BURNT: w.id("blackstone"),
            SEAT: w.id("black_wool"), FLOOR: w.id("polished_deepslate"), ROTOR: w.id("black_concrete"),
        }
        self.soot = [w.id("black_concrete"), w.id("gray_concrete"), w.id("light_gray_concrete")]
        self.fire = w.id("fire", age=0)
        self.netherrack = w.id("netherrack")
        self.campfire = w.id("campfire", extinguished=False)
        self.hay = w.id("hay_block", pillar_axis="y")
        self.placed_fire = []
        self.containers = []

    def ground(self, x, z):
        i, k = x - self.w.x0, z - self.w.z0
        return int(self.t.h[i, k])

    def rest_height(self, model, ox, oz, R, sink=1.0):
        """World y for the model origin so its underside sits `sink` blocks into the ground."""
        g = np.mgrid[-2:20:0.5, -5:5:0.5, -2:10:0.5].reshape(3, -1).T
        m = model(g[:, 0], g[:, 1], g[:, 2])
        g = g[(m != AIR) & (m != INSIDE)]
        P = g @ R.T                                             # local -> world (east, south, up)
        xs = np.round(ox + P[:, 0]).astype(int)
        zs = np.round(oz + P[:, 1]).astype(int)
        ground = np.array([self.ground(x, z) for x, z in zip(xs, zs)])
        need = ground + 1 - sink - P[:, 2]                      # origin y putting this point on the ground
        return int(round(np.percentile(need, 85)))

    def voxelise(self, model, origin, R, extent, scorch=True):
        """Sample model over a world box around origin. origin = world (x, y, z) of local (0,0,0)."""
        w = self.w
        ox, oy, oz = origin
        xs = np.arange(int(ox - extent), int(ox + extent) + 1)
        ys = np.arange(int(oy - extent), int(oy + extent) + 1)
        zs = np.arange(int(oz - extent), int(oz + extent) + 1)
        X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
        # world axes in the model frame: local (u, v, w) <- R^T (x, z_east?, y)
        P = np.stack([X - ox, Z - oz, Y - oy], -1).reshape(-1, 3).astype(float)  # (east, south, up)
        local = P @ R                                           # R is world-from-local, so R^T applied
        m = model(local[:, 0], local[:, 1], local[:, 2]).reshape(X.shape)
        count = 0
        for mat_id, blk in self.mat.items():
            sel = m == mat_id
            if not sel.any():
                continue
            I, J, K = X[sel] - w.x0, Y[sel] - MIN_Y, Z[sel] - w.z0
            ok = (I >= 0) & (I < w.W) & (J > 0) & (J < w.H) & (K >= 0) & (K < w.D)
            I, J, K = I[ok], J[ok], K[ok]
            if mat_id in (SHELL, STRIPE, BELLY) and scorch:
                # soot and scorching: dark patches spreading from the engine fire
                noise = self.rng.random(len(I))
                blk = np.full(len(I), blk, np.int64)
                blk[noise < 0.12] = self.soot[0]
                blk[(noise >= 0.12) & (noise < 0.2)] = self.soot[1]
                blk[(noise >= 0.2) & (noise < 0.27)] = self.soot[2]
            w.blocks[I, J, K] = blk
            count += len(I)
        # the cabin is hollow: clear any ground the hull came to rest in
        sel = m == INSIDE
        I, J, K = X[sel] - w.x0, Y[sel] - MIN_Y, Z[sel] - w.z0
        ok = (I >= 0) & (I < w.W) & (J > 0) & (J < w.H) & (K >= 0) & (K < w.D)
        w.blocks[I[ok], J[ok], K[ok]] = w.air
        return count

    def clear_column(self, x, z, y0, y1):
        w = self.w
        i, k = x - w.x0, z - w.z0
        if 0 <= i < w.W and 0 <= k < w.D:
            w.blocks[i, y0 - MIN_Y:y1 - MIN_Y + 1, k] = w.air

    def build(self):
        t, w, r = self.t, self.w, self.rng
        ids = t.ids
        cx, cz = L.CRASH
        gy = self.ground(cx, cz)
        # --- the burn: scorched ground, a plough furrow from the south where it came down
        burn = [ids["coarse_dirt"], ids["gravel"], w.id("soul_soil"), ids["coarse_dirt"], w.id("tuff")]
        for dx in range(-16, 17):
            for dz in range(-16, 17):
                d = math.hypot(dx, dz * 1.2) + r.normal(0, 1.4)
                if d < 14:
                    x, z = cx + dx, cz + dz
                    y = self.ground(x, z)
                    if y >= L.SEA:
                        w.set(x, y, z, burn[r.integers(0, len(burn))])
                        self.clear_column(x, z, y + 1, y + 12)
        # furrow: heading 200 deg (from the beach, south-south-east), 26 blocks long
        heading = math.radians(200)
        fx, fz = math.sin(heading), -math.cos(heading)            # direction of travel (north-ish)
        for s in range(0, 28):
            px, pz = cx - fx * s, cz - fz * s
            width = 2.5 - s * 0.05
            for a in np.arange(-width, width + 0.1, 1.0):
                x = int(round(px + fz * a))
                z = int(round(pz - fx * a))
                y = self.ground(x, z)
                if y < L.SEA:
                    continue
                dig = 2 if abs(a) < width - 1 else 1
                for yy in range(y - dig + 1, y + 1):
                    w.set(x, yy, z, w.air)
                w.set(x, y - dig, z, burn[r.integers(0, 3)])
                self.clear_column(x, z, y - dig + 1, y + 10)
                t.h[x - w.x0, z - w.z0] = y - dig
        # --- the fuselage, rolled onto its right side, nose down into the end of the furrow
        yaw = heading + math.pi / 2 + math.radians(18)
        R = rot(yaw, math.radians(-9), math.radians(-72))
        # body origin placed so the hull rests on the ground at the head of the furrow
        origin = (cx - 3, 0, cz - 2)
        origin = (origin[0], self.rest_height(fuselage, origin[0], origin[2], R, sink=1.2), origin[2])
        n = self.voxelise(fuselage, origin, R, 18)
        # tail boom, torn off and thrown a little way back down the furrow
        Rt = rot(heading + math.radians(65), math.radians(4), math.radians(25))
        tx, tz = int(cx - fx * 15 + 3), int(cz - fz * 15)
        tail_o = (tx, self.rest_height(tail_boom, tx, tz, Rt, sink=0.6), tz)
        n += self.voxelise(tail_boom, tail_o, Rt, 11)
        # thrown blades, lying in the trees
        rotor = self.mat[ROTOR]
        for (bx, bz, ang, ln) in ((cx + 14, cz - 9, 30, 8), (cx - 13, cz + 6, 110, 7)):
            by = self.ground(bx, bz) + 1
            for s in range(ln):
                x = int(round(bx + math.cos(math.radians(ang)) * s))
                z = int(round(bz + math.sin(math.radians(ang)) * s))
                yy = self.ground(x, z) + 1
                w.set(x, max(yy, by - 1), z, rotor)
        # --- fires: netherrack + fire on the hull's upper faces and around the wreck, campfire smoke
        fires = 0
        i0, k0 = cx - 20 - w.x0, cz - 20 - w.z0
        sub = w.blocks[i0:i0 + 41, :, k0:k0 + 41]
        hull = np.isin(sub, [self.mat[SHELL], self.mat[ENGINE], self.mat[BELLY], self.mat[STRIPE]] + self.soot)
        above_air = np.zeros_like(hull)
        above_air[:, :-1, :] = sub[:, 1:, :] == w.air
        cand = np.argwhere(hull & above_air)
        r.shuffle(cand)
        for ii, jj, kk in cand[:7]:
            sub[ii, jj, kk] = self.netherrack
            sub[ii, jj + 1, kk] = self.fire
            fires += 1
        for _ in range(9):
            a = r.uniform(0, 2 * math.pi)
            d = r.uniform(4, 12)
            x, z = int(round(cx + math.cos(a) * d)), int(round(cz + math.sin(a) * d))
            y = self.ground(x, z)
            if y >= L.SEA and w.get(x, y + 1, z) == w.air:
                w.set(x, y, z, self.netherrack)
                w.set(x, y + 1, z, self.fire)
                fires += 1
        smoke = []
        for dx, dz in ((2, -6), (-6, 3), (7, 5)):
            x, z = cx + dx, cz + dz
            y = self.ground(x, z)
            if w.get(x, y + 1, z) == w.air:
                w.set(x, y, z, self.hay)              # signal-fire smoke: rises far higher over hay
                w.set(x, y + 1, z, self.campfire)
                smoke.append((x, y + 1, z))
        # --- spilled cargo: barrels and a crate the survivors can loot
        loot = [
            [("minecraft:bread", 6), ("minecraft:apple", 4), ("minecraft:torch", 12), ("minecraft:string", 4)],
            [("minecraft:cooked_beef", 3), ("minecraft:paper", 8), ("minecraft:compass", 1), ("minecraft:flint", 2)],
            [("minecraft:iron_ingot", 3), ("minecraft:leather", 2), ("minecraft:potion", 2), ("minecraft:stick", 8)],
        ]
        spots = [(cx + 6, cz + 9), (cx - 8, cz - 4), (cx + 9, cz - 2)]
        for (x, z), items in zip(spots, loot):
            y = self.ground(x, z) + 1
            if w.get(x, y, z) != w.air:
                y += 1
            w.set(x, y, z, w.id("barrel", facing_direction=1, open_bit=False))
            self.add_container(x, y, z, "Barrel", items)
        return {"blocks": n, "fires": fires, "smoke": smoke, "origin": origin}

    def add_container(self, x, y, z, kind, items):
        lst = []
        for slot, (name, count) in enumerate(items):
            lst.append(nbt.Compound({
                "Count": nbt.Byte(count), "Damage": nbt.Short(0), "Name": nbt.String(name),
                "Slot": nbt.Byte(slot * 3 % 27), "WasPickedUp": nbt.Byte(0)}))
        comp = nbt.Compound({
            "Findable": nbt.Byte(0), "Items": nbt.List(nbt.COMPOUND, lst), "id": nbt.String(kind),
            "isMovable": nbt.Byte(1)})
        self.w.block_entity(x, y, z, comp)
        self.containers.append((x, y, z))
