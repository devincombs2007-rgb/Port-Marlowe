"""The built places of Varrow Island: what the 1957 test crews left, and what the cult made since.

Everything is written block by block into the world array through Builder, which also records
the points the story scripts need (containers to stock, station consoles, mannequin seats, cult
posts, the tower console...). Those are exported to scripts_src/content/island_layout.ts.

Places: Mock Town, the Pens, six monitoring stations, three bunkers, the north-peak relay tower
and generator shed, the Dock, Sunfall Village (the cult), the mangrove camp and the sunken landing
craft, the Blackwood observation bleachers, and the cavern below Ground Zero.
"""
import math

import numpy as np

from . import layout as L
from .bedrock_world import MIN_Y

# stairs: weirdo_direction = the side the tall back of the step is on
E, W, S, N = 0, 1, 2, 3
FACE = {"down": 0, "up": 1, "north": 2, "south": 3, "west": 4, "east": 5}


class Builder:
    def __init__(self, terrain, seed=57):
        self.t = terrain
        self.w = terrain.w
        self.rng = np.random.default_rng(seed)
        self.containers = []          # (x, y, z, loot key)
        self.points = {}              # name -> list of (x, y, z)
        self.consoles = {}            # name -> (x, y, z) of the button
        self._ids = {}

    # ------------------------------------------------------------------ blocks
    def b(self, name, **states):
        k = (name, tuple(sorted(states.items())))
        if k not in self._ids:
            self._ids[k] = self.w.id(name, **states)
        return self._ids[k]

    def set(self, x, y, z, name, **states):
        self.w.set(x, y, z, name if isinstance(name, (int, np.integer)) else self.b(name, **states))

    def get(self, x, y, z):
        return self.w.name_of(self.w.get(x, y, z))

    def box(self, x0, y0, z0, x1, y1, z1, name, **states):
        idx = name if isinstance(name, (int, np.integer)) else self.b(name, **states)
        self.w.fill(x0, y0, z0, x1, y1, z1, idx)

    def clear(self, x0, y0, z0, x1, y1, z1):
        self.w.fill(x0, y0, z0, x1, y1, z1, self.w.air)

    def walls(self, x0, y0, z0, x1, y1, z1, name, **states):
        self.box(x0, y0, z0, x1, y1, z0, name, **states)
        self.box(x0, y0, z1, x1, y1, z1, name, **states)
        self.box(x0, y0, z0, x0, y1, z1, name, **states)
        self.box(x1, y0, z0, x1, y1, z1, name, **states)

    def ground(self, x, z):
        i, k = x - self.w.x0, z - self.w.z0
        if 0 <= i < self.w.W and 0 <= k < self.w.D:
            return int(self.t.h[i, k])
        return L.FLOOR

    def pad_height(self, x0, z0, x1, z1, how="median"):
        hs = [self.ground(x, z) for x in range(x0, x1 + 1) for z in range(z0, z1 + 1)]
        return int(np.median(hs)) if how == "median" else int(max(hs) if how == "max" else min(hs))

    def foundation(self, x0, z0, x1, z1, y, name="stone_bricks", clear_to=None):
        """Solid from the ground (or below) up to y-1 under the footprint; air above to clear_to."""
        idx = self.b(name)
        for x in range(x0, x1 + 1):
            for z in range(z0, z1 + 1):
                g = min(self.ground(x, z), y - 1)
                self.w.fill(x, g - 3, z, x, y - 1, z, idx)
        top = clear_to if clear_to is not None else y + 14
        self.clear(x0, y, z0, x1, top, z1)
        for x in range(x0, x1 + 1):
            for z in range(z0, z1 + 1):
                i, k = x - self.w.x0, z - self.w.z0
                if 0 <= i < self.w.W and 0 <= k < self.w.D:
                    self.t.h[i, k] = y - 1

    def point(self, name, x, y, z):
        self.points.setdefault(name, []).append((int(x), int(y), int(z)))

    def container(self, x, y, z, loot, kind="chest", facing="south"):
        if kind == "chest":
            self.set(x, y, z, "chest", **{"minecraft:cardinal_direction": facing})
        else:
            self.set(x, y, z, "barrel", facing_direction=1, open_bit=False)
        self.containers.append((x, y, z, loot))

    def door(self, x, y, z, facing, kind="spruce_door", hinge=0, buttons=True):
        self.set(x, y, z, kind, **{"minecraft:cardinal_direction": facing, "door_hinge_bit": hinge, "open_bit": 0, "upper_block_bit": 0})
        self.set(x, y + 1, z, kind, **{"minecraft:cardinal_direction": facing, "door_hinge_bit": hinge, "open_bit": 0, "upper_block_bit": 1})
        if kind == "iron_door" and buttons:
            # iron doors only open with redstone: a button on the wall beside it, outside and in
            ox, oz = {"north": (0, -1), "south": (0, 1), "east": (1, 0), "west": (-1, 0)}[facing]
            sx, sz = (1, 0) if ox == 0 else (0, 1)
            back = {"north": "south", "south": "north", "east": "west", "west": "east"}[facing]
            for sign, face in ((1, facing), (-1, back)):
                bx, bz = x + sx + ox * sign, z + sz + oz * sign
                if self.get(bx, y + 1, bz) == "minecraft:air":
                    self.set(bx, y + 1, bz, "stone_button", button_pressed_bit=0, facing_direction=FACE[face])

    def button(self, name, x, y, z, facing):
        """The console every station/tower interaction uses: a stone button on a panel."""
        self.set(x, y, z, "stone_button", button_pressed_bit=0, facing_direction=FACE[facing])
        self.consoles[name] = (x, y, z)

    def gable_roof(self, x0, z0, x1, z1, y, stairs, fill, overhang=1, along="x"):
        """Pitched roof over the rectangle, ridge running along `along`."""
        if along == "x":
            lo, hi = z0 - overhang, z1 + overhang
            k = 0
            while lo + k <= hi - k:
                a, bz = lo + k, hi - k
                if a == bz:
                    self.box(x0 - overhang, y + k, a, x1 + overhang, y + k, a, fill)
                else:
                    self.box(x0 - overhang, y + k, a, x1 + overhang, y + k, a, stairs, weirdo_direction=S, upside_down_bit=0)
                    self.box(x0 - overhang, y + k, bz, x1 + overhang, y + k, bz, stairs, weirdo_direction=N, upside_down_bit=0)
                    # gable ends
                    if k > 0:
                        self.box(x0, y + k - 1, a + 1, x0, y + k - 1, bz - 1, fill)
                        self.box(x1, y + k - 1, a + 1, x1, y + k - 1, bz - 1, fill)
                k += 1
        else:
            lo, hi = x0 - overhang, x1 + overhang
            k = 0
            while lo + k <= hi - k:
                a, bx = lo + k, hi - k
                if a == bx:
                    self.box(a, y + k, z0 - overhang, a, y + k, z1 + overhang, fill)
                else:
                    self.box(a, y + k, z0 - overhang, a, y + k, z1 + overhang, stairs, weirdo_direction=E, upside_down_bit=0)
                    self.box(bx, y + k, z0 - overhang, bx, y + k, z1 + overhang, stairs, weirdo_direction=W, upside_down_bit=0)
                    if k > 0:
                        self.box(a + 1, y + k - 1, z0, bx - 1, y + k - 1, z0, fill)
                        self.box(a + 1, y + k - 1, z1, bx - 1, y + k - 1, z1, fill)
                k += 1

    def scatter(self, x0, y0, z0, x1, y1, z1, name, p, only=None, **states):
        """Replace a fraction of blocks in a box (damage, moss, cobwebs). only: restrict to these names."""
        idx = self.b(name, **states)
        only_ids = {self.b(n) for n in only} if only else None
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                for z in range(z0, z1 + 1):
                    if self.rng.random() >= p:
                        continue
                    cur = self.w.get(x, y, z)
                    if only_ids is not None and cur not in only_ids:
                        continue
                    self.w.set(x, y, z, idx)

    # ------------------------------------------------------------------ 1957: Mock Town
    def house(self, cx, cz, facing, scorched=0.0, variant=0):
        """A 1950s two-bedroom test house: 9 x 7, porch, pitched roof, furnished with mannequins."""
        x0, x1, z0, z1 = cx - 4, cx + 4, cz - 3, cz + 3
        y = self.pad_height(x0 - 1, z0 - 2, x1 + 1, z1 + 2) + 1
        self.foundation(x0 - 1, z0 - 2, x1 + 1, z1 + 2, y, "stone_bricks")
        siding = ["white_terracotta", "light_blue_terracotta", "yellow_terracotta", "birch_planks"][variant % 4]
        self.box(x0, y, z0, x1, y, z1, "oak_planks")                                   # floor
        self.walls(x0, y + 1, z0, x1, y + 3, z1, siding)
        self.box(x0, y + 1, z0, x0, y + 3, z0, "stripped_oak_log", pillar_axis="y")     # corner posts
        self.box(x1, y + 1, z0, x1, y + 3, z0, "stripped_oak_log", pillar_axis="y")
        self.box(x0, y + 1, z1, x0, y + 3, z1, "stripped_oak_log", pillar_axis="y")
        self.box(x1, y + 1, z1, x1, y + 3, z1, "stripped_oak_log", pillar_axis="y")
        self.box(x0 + 1, y + 4, z0 + 1, x1 - 1, y + 4, z1 - 1, "oak_planks")         # ceiling
        self.gable_roof(x0, z0, x1, z1, y + 4, "dark_oak_stairs", "dark_oak_planks")
        # door and porch on the street side
        dz, fz = (z1, z1 + 1) if facing == "south" else (z0, z0 - 1)
        self.door(cx, y + 1, dz, facing)
        self.box(x0 + 1, y, fz, x1 - 1, y, fz, "spruce_slab", **{"minecraft:vertical_half": "top"})
        self.set(x0 + 1, y + 1, fz, "oak_fence")
        self.set(x1 - 1, y + 1, fz, "oak_fence")
        # windows
        for wx in (x0 + 2, x1 - 2):
            self.set(wx, y + 2, z0, "glass_pane")
            self.set(wx, y + 2, z1, "glass_pane")
        self.set(x0, y + 2, cz, "glass_pane")
        self.set(x1, y + 2, cz, "glass_pane")
        # inside: a kitchen table set for dinner, a sofa, a radio, a bookshelf
        self.set(cx - 2, y + 1, cz, "oak_fence")
        self.set(cx - 2, y + 2, cz, "wooden_pressure_plate", redstone_signal=0)
        self.set(cx - 3, y + 1, cz, "spruce_stairs", weirdo_direction=W, upside_down_bit=0)
        self.set(cx - 1, y + 1, cz, "spruce_stairs", weirdo_direction=E, upside_down_bit=0)
        self.point("mannequin", cx - 3, y + 1, cz)
        self.point("mannequin", cx - 1, y + 1, cz)
        for k in range(3):
            self.set(cx + 1 + k, y + 1, z0 + 1, "red_wool" if variant % 2 else "green_wool")
        self.set(x1 - 1, y + 1, z1 - 1, "bookshelf")
        self.set(x1 - 1, y + 1, cz, "jukebox")
        self.box(cx - 3, y + 1, z1 - 1 if facing == "north" else z0 + 1, cx - 3, y + 1, z1 - 1 if facing == "north" else z0 + 1, "white_carpet")
        if variant % 3 == 0:
            self.point("mannequin", cx + 2, y + 1, z0 + 2)
        # the blast side: scorched, broken glass, part of the roof gone
        if scorched > 0:
            self.scatter(x0 - 1, y + 1, z0 - 2, x1 + 1, y + 9, z1 + 2, "air", scorched * 0.5,
                         only=["glass_pane", "dark_oak_stairs", "dark_oak_planks"])
            self.scatter(x0, y + 1, z0, x1, y + 3, z1, "black_terracotta", scorched * 0.35, only=[siding])
            self.scatter(x0, y + 1, z0, x1, y + 3, z1, "brown_terracotta", scorched * 0.25, only=[siding])
        self.scatter(x0 + 1, y + 3, z0 + 1, x1 - 1, y + 3, z1 - 1, "web", 0.06, only=["air"])
        return y

    def mock_town(self):
        cx, cz = L.MOCK_TOWN
        y0 = self.ground(cx, cz)
        gravel = self.b("gravel")
        path = self.b("coarse_dirt")
        # streets: a cross of gravel with worn edges
        for x in range(cx - 44, cx + 45):
            for dz in range(-2, 3):
                z = cz + dz
                g = self.ground(x, z)
                if g >= L.SEA:
                    self.w.set(x, g, z, gravel if abs(dz) < 2 or self.rng.random() < 0.6 else path)
                    self.clear(x, g + 1, z, x, g + 6, z)
        for z in range(cz - 40, cz + 41):
            for dx in range(-2, 3):
                x = cx + dx
                g = self.ground(x, z)
                if g >= L.SEA:
                    self.w.set(x, g, z, gravel if abs(dx) < 2 or self.rng.random() < 0.6 else path)
                    self.clear(x, g + 1, z, x, g + 6, z)
        # houses along both streets; the east side faced the flash
        lots = [(-30, -9, "south"), (-17, -9, "south"), (17, -9, "south"), (30, -9, "south"),
                (-30, 9, "north"), (-17, 9, "north"), (17, 9, "north"), (30, 9, "north"),
                (-9, -24, "south"), (9, 24, "north")]
        for i, (dx, dz, facing) in enumerate(lots):
            scorch = max(0.0, min(1.0, (dx + 20) / 50))
            self.house(cx + dx, cz + dz, facing, scorched=scorch, variant=i)
        self.general_store(cx - 9, cz - 24 + 50)
        self.police_post(cx + 9, cz - 24)
        self.water_tower(cx + 26, cz + 26)
        self.point("town_square", cx, y0 + 1, cz)

    def general_store(self, cx, cz):
        x0, x1, z0, z1 = cx - 6, cx + 6, cz - 4, cz + 4
        y = self.pad_height(x0, z0, x1, z1) + 1
        self.foundation(x0 - 1, z0 - 2, x1 + 1, z1 + 1, y)
        self.box(x0, y, z0, x1, y, z1, "spruce_planks")
        self.walls(x0, y + 1, z0, x1, y + 4, z1, "brick_block")
        self.box(x0, y + 5, z0, x1, y + 5, z1, "smooth_stone_slab", **{"minecraft:vertical_half": "bottom"})
        self.box(x0 - 1, y + 5, z0 - 1, x1 + 1, y + 5, z0 - 1, "red_wool")                  # awning
        self.box(x0 + 2, y + 1, z0, x1 - 2, y + 2, z0, "glass_pane")                         # shop window
        self.door(cx, y + 1, z0, "north")
        for x in range(x0 + 1, x1):
            if x == cx:
                continue
            self.set(x, y + 1, z1 - 1, "bookshelf" if x % 3 else "barrel", **({} if x % 3 else {"facing_direction": 1, "open_bit": False}))
        self.box(x0 + 2, y + 1, z0 + 3, x1 - 2, y + 1, z0 + 3, "oak_planks")                 # counter
        self.container(x1 - 1, y + 1, z0 + 1, "store_shelf", "barrel")
        self.container(x0 + 1, y + 1, z0 + 1, "store_wire", "chest", "east")                  # copper wire for the tower
        self.point("mannequin", cx + 2, y + 1, z0 + 4)
        self.scatter(x0 + 1, y + 4, z0 + 1, x1 - 1, y + 4, z1 - 1, "web", 0.08, only=["air"])

    def police_post(self, cx, cz):
        x0, x1, z0, z1 = cx - 4, cx + 4, cz - 3, cz + 3
        y = self.pad_height(x0, z0, x1, z1) + 1
        self.foundation(x0 - 1, z0 - 1, x1 + 1, z1 + 2, y)
        self.box(x0, y, z0, x1, y, z1, "polished_andesite")
        self.walls(x0, y + 1, z0, x1, y + 3, z1, "stone_bricks")
        self.box(x0, y + 4, z0, x1, y + 4, z1, "stone_brick_slab", **{"minecraft:vertical_half": "bottom"})
        self.door(cx, y + 1, z1, "south", "iron_door")
        self.set(x0, y + 2, cz, "iron_bars")
        self.set(x1, y + 2, cz, "iron_bars")
        self.box(x0 + 1, y + 1, z0 + 1, x0 + 2, y + 3, z0 + 2, "iron_bars")                  # holding cell
        self.container(x1 - 1, y + 1, z0 + 1, "police_armory", "chest", "west")               # the shotgun
        self.set(cx, y + 3, cz, "lantern", hanging=1)

    def water_tower(self, cx, cz):
        g = self.pad_height(cx - 3, cz - 3, cx + 3, cz + 3, "min")
        top = g + 16
        for dx, dz in ((-3, -3), (3, -3), (-3, 3), (3, 3)):
            self.box(cx + dx, g, cz + dz, cx + dx, top, cz + dz, "iron_bars")
            self.set(cx + dx, g, cz + dz, "stone_bricks")
        for y in range(g + 4, top, 5):
            for dx in range(-3, 4):
                self.set(cx + dx, y, cz - 3, "iron_bars")
                self.set(cx + dx, y, cz + 3, "iron_bars")
            for dz in range(-3, 4):
                self.set(cx - 3, y, cz + dz, "iron_bars")
                self.set(cx + 3, y, cz + dz, "iron_bars")
        for y in range(top + 1, top + 7):
            r = 4 if y < top + 6 else 3
            for dx in range(-r, r + 1):
                for dz in range(-r, r + 1):
                    d = math.hypot(dx, dz)
                    if d <= r + 0.3:
                        self.set(cx + dx, y, cz + dz, "oxidized_copper" if d > r - 0.8 or y == top + 1 else "water", **({} if d > r - 0.8 or y == top + 1 else {"liquid_depth": 0}))
        self.box(cx - 3, top + 7, cz - 3, cx + 3, top + 7, cz + 3, "oxidized_cut_copper")
        self.box(cx + 4, g + 1, cz, cx + 4, top + 1, cz, "ladder", facing_direction=FACE["east"])

    # ------------------------------------------------------------------ the Pens
    def pens(self):
        cx, cz = L.PENS
        y = self.ground(cx, cz) + 1
        fence = self.b("oak_fence")
        for i, (px, pz) in enumerate(((-14, -10), (2, -10), (-14, 4), (2, 4))):
            x0, z0 = cx + px, cz + pz
            for x in range(x0, x0 + 11):
                for z in (z0, z0 + 9):
                    self.w.set(x, self.ground(x, z) + 1, z, fence)
            for z in range(z0, z0 + 10):
                for x in (x0, x0 + 10):
                    self.w.set(x, self.ground(x, z) + 1, z, fence)
            gx = x0 + 5
            gz = z0 + 9 if pz < 0 else z0
            self.set(gx, self.ground(gx, gz) + 1, gz, "fence_gate", in_wall_bit=0, open_bit=0, **{"minecraft:cardinal_direction": "north"})
            self.set(x0 + 2, self.ground(x0 + 2, z0 + 2) + 1, z0 + 2, "cauldron", cauldron_liquid="water", fill_level=3)
            self.set(x0 + 8, self.ground(x0 + 8, z0 + 7) + 1, z0 + 7, "hay_block", pillar_axis="y")
            self.point("pen", x0 + 5, self.ground(x0 + 5, z0 + 5) + 1, z0 + 5)
        # the measuring shed
        x0, z0 = cx + 16, cz - 3
        yy = self.pad_height(x0, z0, x0 + 6, z0 + 5) + 1
        self.foundation(x0, z0, x0 + 6, z0 + 5, yy, "cobblestone")
        self.walls(x0, yy, z0, x0 + 6, yy + 3, z0 + 5, "spruce_planks")
        self.gable_roof(x0, z0, x0 + 6, z0 + 5, yy + 4, "spruce_stairs", "spruce_planks")
        self.door(x0 + 3, yy, z0, "north")
        self.container(x0 + 1, yy, z0 + 4, "pens_shed", "barrel")
        self.set(x0 + 5, yy, z0 + 4, "lectern", **{"minecraft:cardinal_direction": "west", "powered_bit": 0})

    # ------------------------------------------------------------------ monitoring stations
    def station(self, name, cx, cz):
        """A 1957 monitoring station: a concrete hut, its instrument mast and a console button."""
        x0, x1, z0, z1 = cx - 2, cx + 2, cz - 2, cz + 2
        y = self.pad_height(x0 - 1, z0 - 1, x1 + 1, z1 + 1, "max") + 1
        self.foundation(x0 - 1, z0 - 1, x1 + 1, z1 + 2, y, "light_gray_concrete")
        self.walls(x0, y, z0, x1, y + 3, z1, "light_gray_concrete")
        self.box(x0 - 1, y + 4, z0 - 1, x1 + 1, y + 4, z1 + 1, "smooth_stone_slab", **{"minecraft:vertical_half": "bottom"})
        self.box(x0, y + 3, z0, x1, y + 3, z1, "light_gray_concrete")
        self.clear(x0 + 1, y, z0 + 1, x1 - 1, y + 2, z1 - 1)
        self.door(cx, y, z1, "south", "iron_door")
        self.set(x0, y + 1, cz, "iron_bars")
        self.set(x1, y + 1, cz, "iron_bars")
        # the instrument panel: polished andesite, a dead lamp, the button
        self.set(cx, y, z0 + 1, "polished_andesite")
        self.set(cx - 1, y, z0 + 1, "polished_andesite")
        self.set(cx + 1, y, z0 + 1, "polished_andesite")
        self.set(cx, y + 1, z0 + 1, "redstone_lamp")
        self.button(name, cx, y, z0 + 2, "south")
        self.set(cx - 1, y + 1, z0 + 1, "lever", lever_direction="north", open_bit=0)
        self.container(cx + 1, y + 1, z0 + 1, f"{name}_log", "barrel")
        # mast with a lightning rod and the station number in stripes (1..6 yellow bands)
        n = int(name[-1])
        mx, mz = x1 + 1, z0 - 1
        self.box(mx, y, mz, mx, y + 11, mz, "iron_bars")
        self.set(mx, y + 12, mz, "lightning_rod", facing_direction=1, powered_bit=0)
        for k in range(n):
            self.set(x0 - 1, y + 1 + k, z1 + 1, "yellow_concrete")
        self.point("station", cx, y, cz)
        return y

    # ------------------------------------------------------------------ bunkers
    def bunker(self, name, cx, cz, facing, rooms, sealed=False):
        """A 1957 observation bunker dug into the hill: a concrete portal with a blast door, a stair
        down, a corridor, rooms, and at the far end a breach into the natural caves."""
        dx, dz = {"north": (0, -1), "south": (0, 1), "east": (1, 0), "west": (-1, 0)}[facing]
        g = self.ground(cx, cz)
        y = g + 1
        # portal: a concrete block-house around the entrance
        px0, px1 = (cx - 3, cx + 3) if dx == 0 else (cx - 2 if dx > 0 else cx - 2, cx + 2)
        pz0, pz1 = (cz - 2, cz + 2) if dx == 0 else (cz - 3, cz + 3)
        self.foundation(px0, pz0, px1, pz1, y, "gray_concrete")
        self.walls(px0, y, pz0, px1, y + 3, pz1, "gray_concrete")
        self.box(px0, y + 4, pz0, px1, y + 4, pz1, "gray_concrete")
        self.clear(px0 + 1, y, pz0 + 1, px1 - 1, y + 3, pz1 - 1)
        ox, oz = cx - dx * 3, cz - dz * 3        # the door faces back out of the hill (toward -facing)
        door_face = {"north": "south", "south": "north", "east": "west", "west": "east"}[facing]
        self.door(cx - dx * (2 if dx else 0) - 0, y, cz - dz * (2 if dz else 0), door_face, "iron_door", buttons=not sealed)
        if sealed:
            # jammed: rubble behind the blast door; the only way in is the old cave breach
            for k in range(1, 4):
                for o in (-1, 0, 1):
                    rx_, rz_ = (cx + o, cz + dz * k) if dx == 0 else (cx + dx * k, cz + o)
                    self.box(rx_, y - k, rz_, rx_, y + 1, rz_, "cobblestone")
        # yellow-black hazard stripes on the lintel
        for k in range(-2, 3):
            lx, lz = (cx + k, cz - dz * 2) if dx == 0 else (cx - dx * 2, cz + k)
            self.set(lx, y + 3, lz, "yellow_concrete" if k % 2 == 0 else "black_concrete")
        # stair down, 12 blocks deep
        depth = 12
        sx, sz = cx, cz
        stair_name = "stone_brick_stairs"
        # the steps rise back toward the entrance, so the tall back of each step faces -d
        wd = {(0, 1): N, (0, -1): S, (-1, 0): E, (1, 0): W}[(dx, dz)]
        for k in range(depth):
            sx, sz = cx + dx * (k + 1), cz + dz * (k + 1)
            yy = y - k - 1
            for o in (-1, 0, 1):
                ox_, oz_ = (sx + o, sz) if dx == 0 else (sx, sz + o)
                self.clear(ox_, yy, oz_, ox_, yy + 3, oz_)
                self.set(ox_, yy - 1, oz_, stair_name, weirdo_direction=wd, upside_down_bit=0)
            # walls and ceiling
            for o in (-2, 2):
                ox_, oz_ = (sx + o, sz) if dx == 0 else (sx, sz + o)
                self.box(ox_, yy - 1, oz_, ox_, yy + 3, oz_, "gray_concrete")
            for o in (-1, 0, 1):
                ox_, oz_ = (sx + o, sz) if dx == 0 else (sx, sz + o)
                self.set(ox_, yy + 4, oz_, "gray_concrete")
        floor_y = y - depth - 1
        # corridor
        length = 26
        ex, ez = sx + dx, sz + dz
        self.corridor(ex, floor_y, ez, dx, dz, length)
        if True:
            for k in range(0, length, 6):
                lx, lz = ex + dx * k, ez + dz * k
                self.set(lx, floor_y + 3, lz, "redstone_lamp")
        # rooms off the corridor, alternating sides
        for i, (room, loot) in enumerate(rooms):
            k = 5 + i * 7
            side = 1 if i % 2 == 0 else -1
            rx, rz = ex + dx * k, ez + dz * k
            # side direction perpendicular to the corridor
            pdx, pdz = (side, 0) if dx == 0 else (0, side)
            ccx, ccz = rx + pdx * 6, rz + pdz * 6        # the room's near wall is the corridor wall
            self.room(ccx, floor_y, ccz, room, loot, name)
            self.door(rx + pdx * 2, floor_y, rz + pdz * 2, {(1, 0): "east", (-1, 0): "west", (0, 1): "south", (0, -1): "north"}[(pdx, pdz)])
        # the breach: the far wall has collapsed into a natural cave
        bx, bz = ex + dx * length, ez + dz * length
        self.cave_tunnel(bx, floor_y, bz, dx, dz, 30, to_surface=sealed, name=name)
        self.scatter(ex - 2, floor_y, ez - 2, bx + 2, floor_y + 3, bz + 2, "web", 0.03, only=["air"])
        self.scatter(ex - 2, floor_y - 1, ez - 2, bx + 2, floor_y + 4, bz + 2, "cracked_stone_bricks", 0.08, only=["stone_bricks"])
        self.point(f"{name}_inside", ex + dx * 3, floor_y, ez + dz * 3)
        self.point("bunker_deep", bx, floor_y, bz)
        self.point(f"{name}_door", cx, y, cz)
        return floor_y

    def corridor(self, x, y, z, dx, dz, length):
        for k in range(length + 1):
            cx_, cz_ = x + dx * k, z + dz * k
            for o in (-2, -1, 0, 1, 2):
                ox, oz = (cx_ + o, cz_) if dx == 0 else (cx_, cz_ + o)
                if abs(o) == 2:
                    self.box(ox, y - 1, oz, ox, y + 3, oz, "stone_bricks")
                else:
                    self.set(ox, y - 1, oz, "polished_andesite")
                    self.clear(ox, y, oz, ox, y + 2, oz)
                    self.set(ox, y + 3, oz, "stone_bricks")

    def room(self, cx, y, cz, kind, loot, bunker):
        x0, x1, z0, z1 = cx - 3, cx + 3, cz - 3, cz + 3
        self.box(x0 - 1, y - 1, z0 - 1, x1 + 1, y + 4, z1 + 1, "stone_bricks")
        self.clear(x0, y, z0, x1, y + 2, z1)
        self.box(x0, y - 1, z0, x1, y - 1, z1, "polished_andesite")
        self.set(cx, y + 3, cz, "redstone_lamp")
        if kind == "armory":
            for x in range(x0, x1 + 1, 2):
                self.set(x, y, z1, "iron_block")
            self.container(cx, y, z1, loot, "chest", "north")
            self.box(x0, y, z0, x0, y + 1, z1, "iron_bars")
        elif kind == "lab":
            self.box(x0 + 1, y, cz, x1 - 1, y, cz, "smooth_stone")
            self.set(x0 + 2, y + 1, cz, "brewing_stand", brewing_stand_slot_a_bit=0, brewing_stand_slot_b_bit=0, brewing_stand_slot_c_bit=0)
            self.set(x1 - 2, y + 1, cz, "cauldron", cauldron_liquid="water", fill_level=0)
            self.container(cx, y, z0, loot, "chest", "south")
            self.box(x1, y, z0, x1, y + 2, z0 + 1, "tinted_glass")
            self.point("sealed_lab", cx, y, cz)
        elif kind == "records":
            for x in range(x0, x1 + 1):
                self.set(x, y, z0, "bookshelf")
                self.set(x, y + 1, z0, "bookshelf")
            self.set(cx, y, cz, "lectern", **{"minecraft:cardinal_direction": "south", "powered_bit": 0})
            self.container(x1, y, z1, loot, "chest", "west")
        elif kind == "radio":
            for x in range(x0, x1 + 1):
                self.set(x, y, z0, "polished_andesite")
                self.set(x, y + 1, z0, "redstone_lamp" if x % 2 else "iron_block")
            self.container(cx, y, z1, loot, "chest", "north")
        elif kind == "generator":
            self.box(cx - 1, y, cz - 1, cx + 1, y + 1, cz + 1, "iron_block")
            self.set(cx, y + 2, cz, "lightning_rod", facing_direction=1, powered_bit=0)
            self.container(x0, y, z0, loot, "barrel")
        elif kind == "bunks":
            for x in range(x0, x1 + 1, 2):
                self.set(x, y, z0, "white_wool")
                self.set(x, y, z0 + 1, "white_wool")
            self.container(x1, y, z1, loot, "barrel")
            self.point("mannequin", cx, y, cz + 1)
        self.scatter(x0, y + 2, z0, x1, y + 2, z1, "web", 0.12, only=["air"])

    def cave_tunnel(self, x, y, z, dx, dz, length, to_surface=False, name=""):
        """A winding natural tunnel from the breach, so the bunker opens onto the caves. With
        to_surface it climbs to daylight and ends in a sinkhole: the back way in."""
        px, pz, py = float(x), float(z), float(y)
        ang = math.atan2(dz, dx)
        if to_surface:
            length = 60
        for k in range(length):
            ang += self.rng.uniform(-0.35, 0.35) * (0.4 if to_surface else 1)
            px += math.cos(ang)
            pz += math.sin(ang)
            if to_surface:
                py += 0.45 if py < self.ground(int(px), int(pz)) - 1 else 0
            else:
                py += self.rng.uniform(-0.6, 0.5)
            r = 1.6 + 0.6 * math.sin(k * 0.4)
            ri = int(math.ceil(r))
            for ox in range(-ri, ri + 1):
                for oy in range(-ri, ri + 1):
                    for oz in range(-ri, ri + 1):
                        if ox * ox + oy * oy * 1.4 + oz * oz <= r * r:
                            self.w.set(int(px) + ox, int(py) + oy + 1, int(pz) + oz, self.w.air)
        self.point("cave_mouth", int(px), int(py), int(pz))
        if to_surface:
            g = self.ground(int(px), int(pz))
            self.clear(int(px) - 1, int(py), int(pz) - 1, int(px) + 1, g + 2, int(pz) + 1)
            for yy in range(int(py), g + 1):
                self.set(int(px), yy, int(pz) - 1, "ladder", facing_direction=FACE["south"])
            self.point(f"{name}_sinkhole", int(px), g + 1, int(pz))

    # ------------------------------------------------------------------ the relay tower
    def relay_tower(self):
        cx, cz = L.TOWER
        y = self.pad_height(cx - 6, cz - 6, cx + 6, cz + 6, "max") + 1
        self.foundation(cx - 6, cz - 6, cx + 6, cz + 6, y, "gray_concrete")
        self.box(cx - 6, y - 1, cz - 6, cx + 6, y - 1, cz + 6, "gray_concrete")
        height = 34
        bars = self.b("iron_bars")
        for k in range(height):
            r = 3 - (k * 2) // height
            for sx in (-r, r):
                for sz in (-r, r):
                    self.w.set(cx + sx, y + k, cz + sz, bars)
            if k % 5 == 4:
                for t in range(-r, r + 1):
                    for sx in (-r, r):
                        self.w.set(cx + sx, y + k, cz + t, bars)
                        self.w.set(cx + t, y + k, cz + sx, bars)
        self.box(cx, y + height - 3, cz, cx, y + height + 2, cz, "iron_bars")
        self.set(cx, y + height + 3, cz, "lightning_rod", facing_direction=1, powered_bit=0)
        self.set(cx, y + height - 4, cz, "redstone_lamp")
        self.point("tower_lamp", cx, y + height - 4, cz)
        self.point("tower_top", cx, y + height, cz)
        # the transmitter hut
        hx0, hx1, hz0, hz1 = cx - 4, cx + 3, cz + 5, cz + 10
        self.foundation(hx0, hz0, hx1, hz1, y, "gray_concrete")
        self.walls(hx0, y, hz0, hx1, y + 3, hz1, "light_gray_concrete")
        self.box(hx0, y + 4, hz0, hx1, y + 4, hz1, "gray_concrete")
        self.clear(hx0 + 1, y, hz0 + 1, hx1 - 1, y + 3, hz1 - 1)
        self.door(cx, y, hz0, "north", "iron_door")
        self.set(hx0, y + 1, hz0 + 3, "glass_pane")
        for x in range(hx0 + 1, hx1):
            self.set(x, y, hz1 - 1, "iron_block" if x % 2 else "polished_andesite")
            self.set(x, y + 1, hz1 - 1, "redstone_lamp" if x % 2 == 0 else "iron_block")
        self.button("tower", cx, y, hz1 - 2, "north")
        self.container(hx0 + 1, y, hz0 + 1, "tower_hut", "barrel")
        self.point("tower_hut", cx, y, hz0 + 2)
        # generator shed
        gx0, gx1, gz0, gz1 = cx - 11, cx - 7, cz - 2, cz + 2
        self.foundation(gx0, gz0, gx1, gz1, y, "gray_concrete")
        self.walls(gx0, y, gz0, gx1, y + 3, gz1, "spruce_planks")
        self.box(gx0, y + 4, gz0, gx1, y + 4, gz1, "spruce_slab", **{"minecraft:vertical_half": "bottom"})
        self.clear(gx0 + 1, y, gz0 + 1, gx1 - 1, y + 3, gz1 - 1)
        self.door(gx1, y, cz, "east")
        self.set(gx0 + 1, y, cz, "iron_block")
        self.set(gx0 + 1, y + 1, cz, "furnace", **{"minecraft:cardinal_direction": "east"})
        self.set(gx0 + 2, y, cz - 1, "polished_andesite")
        self.button("generator", gx0 + 2, y + 1, cz - 1, "south")
        self.point("generator", gx0 + 2, y, cz)
        return y

    # ------------------------------------------------------------------ the Dock
    def dock(self):
        cx, cz = L.DOCK
        y = self.ground(cx, cz) + 1
        # which way is the open water?
        best, bdir = 99, (0, 1)
        for d in ((0, 1), (1, 0), (0, -1), (-1, 0)):
            for k in range(1, 40):
                if self.ground(cx + d[0] * k, cz + d[1] * k) < L.SEA - 1:
                    if k < best:
                        best, bdir = k, d
                    break
        dx, dz = bdir
        plank = self.b("spruce_planks")
        post = self.b("spruce_log", pillar_axis="y")
        deck_y = L.SEA + 1
        for k in range(0, best + 22):
            x, z = cx + dx * k, cz + dz * k
            for o in (-1, 0, 1):
                ox, oz = (x + o, z) if dx == 0 else (x, z + o)
                self.w.set(ox, deck_y, oz, plank)
                self.clear(ox, deck_y + 1, oz, ox, deck_y + 5, oz)
            if k % 4 == 0:
                for o in (-2, 2):
                    ox, oz = (x + o, z) if dx == 0 else (x, z + o)
                    g = self.ground(ox, oz)
                    self.w.fill(ox, min(g, deck_y) - 1, oz, ox, deck_y + 1, oz, post)
        end = (cx + dx * (best + 21), cz + dz * (best + 21))
        self.point("dock_end", end[0], deck_y + 1, end[1])
        # boathouse beside the landing
        bx, bz = cx - dz * 8, cz + dx * 8
        x0, x1, z0, z1 = bx - 4, bx + 4, bz - 3, bz + 3
        yy = self.pad_height(x0, z0, x1, z1, "max") + 1
        self.foundation(x0, z0, x1, z1, yy, "cobblestone")
        self.walls(x0, yy, z0, x1, yy + 3, z1, "spruce_planks")
        self.gable_roof(x0, z0, x1, z1, yy + 4, "spruce_stairs", "spruce_planks")
        self.clear(x0 + 1, yy, z0 + 1, x1 - 1, yy + 3, z1 - 1)
        self.door(bx, yy, z0 if dz >= 0 else z1, "north" if dz >= 0 else "south")
        self.container(x1 - 1, yy, z1 - 1, "dock_battery", "chest", "west")
        for k in range(3):
            self.set(x0 + 1 + k, yy, z1 - 1, "cauldron", cauldron_liquid="water", fill_level=0)
        self.set(x0 + 1, yy, z0 + 1, "barrel", facing_direction=1, open_bit=False)
        self.point("boathouse", bx, yy, bz)

    # ------------------------------------------------------------------ the cult: Sunfall
    def sunfall(self):
        cx, cz = L.SUNFALL
        y = self.ground(cx, cz) + 1
        log = self.b("stripped_spruce_log", pillar_axis="y")
        r = 34
        for a in range(0, 360 * 4):
            ang = math.radians(a / 4)
            x, z = int(round(cx + math.cos(ang) * r)), int(round(cz + math.sin(ang) * r))
            if abs(x - cx) <= 2 and z > cz:          # the gate, south
                continue
            g = self.ground(x, z)
            self.w.fill(x, g, z, x, g + 3, z, log)
            if (a // 4) % 3 == 0:
                self.set(x, g + 4, z, "spruce_fence")
        self.set(cx - 3, self.ground(cx - 3, cz + r) + 4, cz + r, "lantern", hanging=0)
        self.set(cx + 3, self.ground(cx + 3, cz + r) + 4, cz + r, "lantern", hanging=0)
        self.point("cult_gate", cx, self.ground(cx, cz + r) + 1, cz + r)
        # the shrine of the second sun: a ring of tower steel around a burning sun
        sy = y
        for a in range(0, 360, 30):
            ang = math.radians(a)
            x, z = int(round(cx + math.cos(ang) * 7)), int(round(cz + math.sin(ang) * 7))
            self.box(x, sy, z, x, sy + 4, z, "iron_bars")
            self.set(x, sy + 5, z, "iron_block")
        self.box(cx - 2, sy - 1, cz - 2, cx + 2, sy - 1, cz + 2, "polished_blackstone")
        self.box(cx - 1, sy, cz - 1, cx + 1, sy, cz + 1, "polished_blackstone")
        self.set(cx, sy + 1, cz, "shroomlight")
        self.set(cx, sy + 2, cz, "ochre_froglight", pillar_axis="y")
        self.set(cx, sy + 3, cz, "shroomlight")
        self.set(cx, sy + 4, cz, "lightning_rod", facing_direction=1, powered_bit=0)
        self.point("shrine", cx, sy, cz)
        self.point("hierophant", cx, sy, cz + 4)
        self.container(cx + 1, sy, cz - 2, "shrine_offerings", "barrel")
        # the vault under the sun's feet: a sealed shaft in front of the altar, a small stone room
        # below it. The Hierophant's key (or his death) opens it; the script clears the shaft.
        self.box(cx - 3, sy - 8, cz - 7, cx + 3, sy - 4, cz - 1, "polished_blackstone_bricks")
        self.clear(cx - 2, sy - 7, cz - 6, cx + 2, sy - 5, cz - 2)
        for y in range(sy - 4, sy):
            self.set(cx, y, cz - 4, "chiseled_polished_blackstone" if y == sy - 1 else "polished_blackstone")
        self.set(cx - 2, sy - 7, cz - 2, "soul_lantern", hanging=False)
        self.set(cx + 2, sy - 7, cz - 2, "soul_lantern", hanging=False)
        self.container(cx, sy - 7, cz - 6, "shrine_vault")
        self.point("vault_shaft", cx, sy - 4, cz - 4)
        # stilt houses in a ring
        for i in range(7):
            ang = math.radians(25 + i * 47)
            hx, hz = int(cx + math.cos(ang) * 21), int(cz + math.sin(ang) * 21)
            self.stilt_house(hx, hz, i)
        # gardens and a pen inside the wall
        for (gx, gz) in ((cx - 14, cz - 6), (cx + 10, cz - 4)):
            gy = self.ground(gx, gz)
            for x in range(gx, gx + 6):
                for z in range(gz, gz + 5):
                    if (x - gx) == 3:
                        self.set(x, gy, z, "water", liquid_depth=0)
                    else:
                        self.set(x, gy, z, "farmland", moisturized_amount=7)
                        crop = "wheat" if (z + x) % 3 else "carrots"
                        self.set(x, gy + 1, z, crop, growth=int(self.rng.integers(3, 8)))
            self.point("garden", gx + 2, gy + 1, gz + 2)
        for k in range(6):
            ang = self.rng.uniform(0, 2 * math.pi)
            x, z = int(cx + math.cos(ang) * 13), int(cz + math.sin(ang) * 13)
            gy = self.ground(x, z)
            self.set(x, gy + 1, z, "campfire", extinguished=False, **{"minecraft:cardinal_direction": "south"})
            self.point("cult_post", x, gy + 1, z)

    def stilt_house(self, cx, cz, i):
        g = self.pad_height(cx - 3, cz - 3, cx + 3, cz + 3, "max")
        y = g + 4
        self.clear(cx - 3, g + 1, cz - 3, cx + 3, y + 8, cz + 3)
        for dx in (-3, 3):
            for dz in (-3, 3):
                gg = self.ground(cx + dx, cz + dz)
                self.box(cx + dx, gg, cz + dz, cx + dx, y, cz + dz, "dark_oak_log", pillar_axis="y")
        self.clear(cx - 5, g + 1, cz - 5, cx + 5, y + 8, cz - 4)
        self.box(cx - 3, y, cz - 3, cx + 3, y, cz + 3, "spruce_planks")
        self.walls(cx - 3, y + 1, cz - 3, cx + 3, y + 3, cz + 3, "mud_bricks" if i % 2 else "spruce_planks")
        self.clear(cx - 2, y + 1, cz - 2, cx + 2, y + 3, cz + 2)
        for k in range(4):
            self.box(cx - 3 + k, y + 4 + k, cz - 3 + k, cx + 3 - k, y + 4 + k, cz + 3 - k, "hay_block", pillar_axis="y")
        # door on the side facing the shrine
        sx, sz = L.SUNFALL
        fx = int(np.sign(sx - cx)) if abs(sx - cx) > abs(sz - cz) else 0
        fz = 0 if fx else int(np.sign(sz - cz))
        dxp, dzp = cx + fx * 3, cz + fz * 3
        face = {(1, 0): "east", (-1, 0): "west", (0, 1): "south", (0, -1): "north"}.get((fx, fz), "south")
        self.door(dxp, y + 1, dzp, face)
        gd = self.ground(dxp, dzp)
        self.box(dxp, gd, dzp, dxp, y - 1, dzp, "dark_oak_log", pillar_axis="y")   # the ladder's backing post
        lg = self.ground(dxp + fx, dzp + fz)
        for yy in range(lg + 1, y + 1):                        # ladder down from the door
            self.set(dxp + fx, yy, dzp + fz, "ladder", facing_direction=FACE[face])
        self.set(cx, y + 3, cz, "lantern", hanging=1)
        self.set(cx - 2, y + 1, cz - 2, "white_wool")
        self.set(cx - 2, y + 1, cz - 1, "white_wool")
        self.container(cx + 2, y + 1, cz + 2, f"hut{i}", "barrel")
        self.point("cult_home", cx, y + 1, cz)

    # ------------------------------------------------------------------ the mangrove camp
    def mangrove_camp(self):
        cx, cz = L.MANGROVES
        deck = L.SEA + 2
        for (hx, hz) in ((cx - 10, cz - 8), (cx + 4, cz - 14), (cx - 4, cz + 10)):
            self.clear(hx - 3, deck - 1, hz - 3, hx + 3, deck + 8, hz + 3)
            for dx in (-3, 3):
                for dz in (-3, 3):
                    g = self.ground(hx + dx, hz + dz)
                    self.box(hx + dx, g, hz + dz, hx + dx, deck, hz + dz, "mangrove_log", pillar_axis="y")
            self.box(hx - 3, deck, hz - 3, hx + 3, deck, hz + 3, "mangrove_planks")
            self.walls(hx - 3, deck + 1, hz - 3, hx + 3, deck + 2, hz + 3, "mangrove_planks")
            self.clear(hx - 2, deck + 1, hz - 2, hx + 2, deck + 3, hz + 2)
            for k in range(3):
                self.box(hx - 3 + k, deck + 3 + k, hz - 3 + k, hx + 3 - k, deck + 3 + k, hz + 3 - k, "hay_block", pillar_axis="y")
            self.clear(hx, deck + 1, hz + 3, hx, deck + 2, hz + 3)
            self.point("cult_home", hx, deck + 1, hz)
        # rope bridges between the huts
        self.box(cx - 7, deck, cz - 8, cx + 1, deck, cz - 8, "mangrove_slab", **{"minecraft:vertical_half": "top"})
        self.container(cx - 9, deck + 1, cz - 9, "mangrove_hut", "barrel")
        self.point("cult_post", cx, deck + 1, cz - 2)
        # the landing craft: a 1957 LCVP sunk at the edge of the channel, bow ramp down
        lx, lz = cx + 22, cz + 18
        for k in range(12):
            for o in range(-2, 3):
                x, z = lx + k, lz + o
                base = L.SEA - 3 + (1 if k > 8 else 0)
                self.set(x, base, z, "iron_block" if abs(o) < 2 else "gray_concrete")
                if abs(o) == 2:
                    self.box(x, base + 1, z, x, base + 3, z, "gray_concrete")
                elif k == 11:
                    self.box(x, base + 1, z, x, base + 3, z, "gray_concrete")
                else:
                    self.clear(x, base + 1, z, x, base + 3, z)
        for o in range(-1, 2):
            self.set(lx - 1, L.SEA - 3, lz + o, "iron_trapdoor", direction=0, open_bit=0, upside_down_bit=0)
        self.container(lx + 9, L.SEA - 2, lz, "landing_craft", "chest", "west")
        self.point("landing_craft", lx + 6, L.SEA - 2, lz)

    # ------------------------------------------------------------------ Blackwood: the watchers' bleachers
    def bleachers(self):
        bx, bz = L.BLACKWOOD[0] + 40, L.BLACKWOOD[1] - 6
        y = self.pad_height(bx - 6, bz - 4, bx + 6, bz + 4) + 1
        self.foundation(bx - 6, bz - 4, bx + 6, bz + 4, y, "dirt", clear_to=y + 10)
        for row in range(4):
            x = bx - 3 + row
            self.box(x, y + row, bz - 4, x, y + row, bz + 4, "spruce_stairs", weirdo_direction=W, upside_down_bit=0)
            self.box(x - 1, y, bz - 4, x - 1, y + row - 1, bz + 4, "spruce_planks") if row else None
        self.scatter(bx - 4, y, bz - 4, bx + 1, y + 4, bz + 4, "coal_block", 0.12, only=["spruce_stairs", "spruce_planks"])
        for k in range(5):
            self.point("watcher_seat", bx - 3 + (k % 4), y + (k % 4) + 1, bz - 3 + k)
        self.point("bleachers", bx, y, bz)

    # ------------------------------------------------------------------ below Ground Zero
    def heart_cavern(self):
        """A cavern under the crater lake, reached by a collapsed instrument shaft on the north rim."""
        gx, gz = L.GZ
        cy = 18
        air = self.w.air
        for x in range(gx - 18, gx + 19):
            for y in range(cy - 6, cy + 10):
                for z in range(gz - 18, gz + 19):
                    d = ((x - gx) / 18) ** 2 + ((y - cy) / 9) ** 2 + ((z - gz) / 18) ** 2
                    if d <= 1.0:
                        self.w.set(x, y, z, air)
        self.box(gx - 16, cy - 6, gz - 16, gx + 16, cy - 6, gz + 16, "tuff")
        self.scatter(gx - 16, cy - 6, gz - 16, gx + 16, cy - 6, gz + 16, "verdant_froglight", 0.05, only=["tuff"], pillar_axis="y")
        self.point("heart_arena", gx, cy - 5, gz)
        # four pillars at +/-5..6 from the arena centre: the Heart's veins grow on their inner corners
        for sx in (-1, 1):
            for sz in (-1, 1):
                x0, z0 = gx + sx * 5, gz + sz * 5
                self.box(min(x0, x0 + sx), cy - 5, min(z0, z0 + sz), max(x0, x0 + sx), cy + 6, max(z0, z0 + sz), "tuff_bricks")
        # the shaft: from the north rim straight down, with a ladder
        sx, sz = gx, gz - L.CRATER_R - 6
        top = self.ground(sx, sz)
        for y in range(cy - 2, top + 1):
            self.clear(sx - 1, y, sz - 1, sx + 1, y, sz + 1)
            self.box(sx - 2, y, sz - 2, sx + 2, y, sz - 2, "gray_concrete")
            self.box(sx - 2, y, sz + 2, sx + 2, y, sz + 2, "gray_concrete")
            self.box(sx - 2, y, sz - 2, sx - 2, y, sz + 2, "gray_concrete")
            self.box(sx + 2, y, sz - 2, sx + 2, y, sz + 2, "gray_concrete")
            self.set(sx, y, sz - 1, "ladder", facing_direction=FACE["south"])
        # a tunnel from the shaft foot into the cavern
        for k in range(sz, gz - 14):
            self.clear(sx - 1, cy - 2, k, sx + 1, cy + 1, k)
        self.box(sx - 2, top + 1, sz - 2, sx + 2, top + 1, sz + 2, "iron_bars")
        self.clear(sx - 1, top + 1, sz - 1, sx + 1, top + 1, sz + 1)
        self.set(sx, top + 1, sz - 1, "iron_trapdoor", direction=2, open_bit=0, upside_down_bit=0)
        self.point("gz_shaft", sx, top + 1, sz)

    # ------------------------------------------------------------------ everything
    def build_all(self):
        self.mock_town()
        self.pens()
        for name, (x, z) in L.STATIONS.items():
            self.station(name, x, z)
        self.bunker("bunker1", *L.BUNKERS["bunker1"], "north",
                    [("armory", "bunker1_armory"), ("records", "bunker1_records"), ("lab", "bunker1_lab"), ("bunks", "bunker1_bunks")])
        self.bunker("bunker2", *L.BUNKERS["bunker2"], "west",
                    [("radio", "bunker2_tubes"), ("records", "bunker2_records"), ("bunks", "bunker2_bunks")], sealed=True)
        self.bunker("bunker3", *L.BUNKERS["bunker3"], "north",
                    [("lab", "bunker3_lab"), ("generator", "bunker3_generator"), ("records", "bunker3_records")])
        self.relay_tower()
        self.dock()
        self.sunfall()
        self.mangrove_camp()
        self.bleachers()
        self.heart_cavern()
        return len(self.containers)
