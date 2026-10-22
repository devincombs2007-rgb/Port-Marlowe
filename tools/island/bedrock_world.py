"""Write a Minecraft Bedrock world (LevelDB + level.dat) from numpy block/biome arrays.

Format (checked against PocketMine-MP's LevelDB provider and Amulet's reader):
  chunk key   = int32 cx, int32 cz, tag byte [, int8 sub-chunk index]   (overworld)
  0x2C        = chunk version byte (42: 1.21.120+)
  0x2F + y    = sub-chunk v9: 0x09, layer count, int8 y, then per layer a paletted storage:
                header (bits << 1), uint32 LE words (values packed low bits first, no spanning,
                XZY order: index = x*256 + z*16 + y), int32 palette size, LE-NBT block states
  0x2B        = Data3D: 512-byte heightmap (zeros; the game recomputes it, as PocketMine
                does) then 24 biome storages (one per sub-chunk -64..319), same paletted format
                with int32 biome ids; bits 0 = header 0x00 and a single int32 id
  0x31        = block entities (concatenated LE-NBT compounds)
  0x36        = finalized state int32 2 (generation finished: no decoration pass)
Blocks are exact canonical states from the game's palette (island/blocks.py).
"""
import json
import os
import shutil
import struct
import time
import zipfile

import numpy as np

from . import blocks, nbt

MIN_Y = -64
SUBCHUNKS = 24
CHUNK_VERSION = 42
STORAGE_VERSION = 10
GAME_VERSION = [1, 26, 30, 31, 0]
NETWORK_VERSION = 1001


def _pack(values, bits):
    """values: 4096 uint indices (XZY order) -> little-endian uint32 words."""
    vpw = 32 // bits
    n_words = -(-4096 // vpw)
    padded = np.zeros(n_words * vpw, dtype=np.uint64)
    padded[:4096] = values
    m = padded.reshape(n_words, vpw)
    words = np.zeros(n_words, dtype=np.uint64)
    for i in range(vpw):
        words |= m[:, i] << np.uint64(i * bits)
    return words.astype("<u4").tobytes()


def _bits_for(n):
    for b in (1, 2, 3, 4, 5, 6, 8, 16):
        if n <= (1 << b):
            return b
    raise ValueError(n)


def _storage(values_xzy, palette_bytes_list, as_int_palette=False):
    """One paletted storage. values_xzy: 4096 local palette indices."""
    out = bytearray()
    n = len(palette_bytes_list)
    if as_int_palette and n == 1:
        out += bytes([0])
        out += palette_bytes_list[0]
        return bytes(out)
    bits = _bits_for(n)
    out += bytes([bits << 1])
    out += _pack(values_xzy, bits)
    out += struct.pack("<i", n)
    for p in palette_bytes_list:
        out += p
    return bytes(out)


class World:
    """A rectangular region of pre-built chunks. Blocks are uint16 indices into self.palette."""

    def __init__(self, cx0, cz0, cx1, cz1, height=256):
        self.cx0, self.cz0, self.cx1, self.cz1 = cx0, cz0, cx1, cz1
        self.W = (cx1 - cx0) * 16
        self.D = (cz1 - cz0) * 16
        self.H = height
        self.x0, self.z0 = cx0 * 16, cz0 * 16
        self.palette = []
        self._index = {}
        self.air = self.id("air")
        self.blocks = np.zeros((self.W, self.H, self.D), dtype=np.uint16)
        self.biome = np.zeros((self.W, self.D), dtype=np.int32)
        self.block_entities = {}
        self.extra_keys = {}
        self.wet = {}          # (cx, cz, sub-chunk) -> set of XZY indices with water in storage layer 2

    def waterlog_many(self, I, J, K):
        """Water in the second storage layer (seagrass, kelp, roots and the like sitting in water).
        Array indices, not world coordinates."""
        for i, j, k in zip(np.asarray(I).ravel(), np.asarray(J).ravel(), np.asarray(K).ravel()):
            cx, cz, sy = (int(i) // 16) + self.cx0, (int(k) // 16) + self.cz0, int(j) // 16
            self.wet.setdefault((cx, cz, sy), set()).add((int(i) % 16) * 256 + (int(k) % 16) * 16 + int(j) % 16)

    # ---------------------------------------------------------------- palette
    def id(self, name, **states):
        comp = blocks.canonical(name, **states)
        k = blocks.key(comp)
        if k not in self._index:
            self._index[k] = len(self.palette)
            self.palette.append(comp)
        return self._index[k]

    def _water_id(self):
        return self.id("water", liquid_depth=0)

    def name_of(self, idx):
        return self.palette[idx]["name"].v

    # ---------------------------------------------------------------- coordinates
    def ix(self, x, y, z):
        return x - self.x0, y - MIN_Y, z - self.z0

    def inside(self, x, y, z):
        i, j, k = self.ix(x, y, z)
        return 0 <= i < self.W and 0 <= j < self.H and 0 <= k < self.D

    def set(self, x, y, z, idx):
        i, j, k = self.ix(x, y, z)
        if 0 <= i < self.W and 0 <= j < self.H and 0 <= k < self.D:
            self.blocks[i, j, k] = idx

    def get(self, x, y, z):
        i, j, k = self.ix(x, y, z)
        if 0 <= i < self.W and 0 <= j < self.H and 0 <= k < self.D:
            return int(self.blocks[i, j, k])
        return self.air

    def fill(self, x0, y0, z0, x1, y1, z1, idx):
        """Inclusive box in world coordinates, clipped to the region."""
        a = self.ix(min(x0, x1), min(y0, y1), min(z0, z1))
        b = self.ix(max(x0, x1), max(y0, y1), max(z0, z1))
        sl = tuple(slice(max(0, lo), max(0, min(n, hi + 1))) for lo, hi, n in zip(a, b, (self.W, self.H, self.D)))
        self.blocks[sl] = idx

    def top(self, x, z, ignore=()):
        """Highest non-air (and not in ignore) world y in a column, or None."""
        i, k = x - self.x0, z - self.z0
        if not (0 <= i < self.W and 0 <= k < self.D):
            return None
        col = self.blocks[i, :, k]
        mask = col != self.air
        for g in ignore:
            mask &= col != g
        nz = np.nonzero(mask)[0]
        return int(nz[-1]) + MIN_Y if len(nz) else None

    def block_entity(self, x, y, z, comp):
        comp["x"], comp["y"], comp["z"] = nbt.Int(x), nbt.Int(y), nbt.Int(z)
        self.block_entities[(x, y, z)] = comp

    # ---------------------------------------------------------------- save
    def _chunk_records(self, cx, cz):
        recs = {}
        base = struct.pack("<ii", cx, cz)
        recs[base + b"\x2c"] = bytes([CHUNK_VERSION])
        i0, k0 = (cx - self.cx0) * 16, (cz - self.cz0) * 16
        pal_bytes = self._pal_bytes
        for sy in range(SUBCHUNKS):
            j0 = sy * 16
            if j0 >= self.H:
                break
            sub = self.blocks[i0:i0 + 16, j0:j0 + 16, k0:k0 + 16]
            if not sub.any() and self.air == 0:
                continue
            xzy = np.ascontiguousarray(sub.transpose(0, 2, 1)).ravel()
            uniq, local = np.unique(xzy, return_inverse=True)
            if len(uniq) == 1 and uniq[0] == self.air:
                continue
            y_index = sy + MIN_Y // 16
            wet = self.wet.get((cx, cz, sy))
            data = bytes([9, 2 if wet else 1]) + struct.pack("<b", y_index) + _storage(local, [pal_bytes[u] for u in uniq])
            if wet:
                vals = np.zeros(4096, np.int64)
                vals[sorted(wet)] = 1
                data += _storage(vals, [pal_bytes[self.air], pal_bytes[self._water_id()]])
            recs[base + b"\x2f" + struct.pack("<b", y_index)] = data
        # Data3D: fake heightmap + 24 biome storages (column biomes repeated through each sub-chunk)
        col = self.biome[i0:i0 + 16, k0:k0 + 16]
        uniq, local = np.unique(col, return_inverse=True)
        local = local.reshape(16, 16)
        d3 = bytearray(b"\x00" * 512)
        if len(uniq) == 1:
            one = _storage(None, [struct.pack("<i", int(uniq[0]))], as_int_palette=True)
            for _ in range(SUBCHUNKS):
                d3 += one
        else:
            # XZY order: index = x*256 + z*16 + y; same value for every y in a column
            vals = np.repeat(local.reshape(256), 16)
            one = _storage(vals, [struct.pack("<i", int(b)) for b in uniq])
            for _ in range(SUBCHUNKS):
                d3 += one
        recs[base + b"\x2b"] = bytes(d3)
        recs[base + b"\x36"] = struct.pack("<i", 2)
        bes = [v for (x, y, z), v in self.block_entities.items() if x >> 4 == cx and z >> 4 == cz]
        if bes:
            recs[base + b"\x31"] = b"".join(nbt.dumps(b) for b in bes)
        return recs

    def save_db(self, db_dir, fresh=True):
        """Write this region's chunks. fresh=False adds them to an existing database (a second
        region of the same world)."""
        import leveldb
        if fresh:
            if os.path.isdir(db_dir):
                shutil.rmtree(db_dir)
            os.makedirs(db_dir)
        if self.wet:
            self._water_id()
        self._pal_bytes = [blocks.palette_bytes(c) for c in self.palette]
        db = leveldb.LevelDB(db_dir, True)
        n = 0
        for cx in range(self.cx0, self.cx1):
            for cz in range(self.cz0, self.cz1):
                batch = self._chunk_records(cx, cz)
                db.putBatch(batch)
                n += len(batch)
        for k, v in self.extra_keys.items():
            db.put(k, v)
        db.compact()
        db.close()
        return n


def level_dat(path, name, spawn, flat_layers, seed=19570507, game_type=0, difficulty=2, time_of_day=1000,
              extra=None):
    B, I, L, F, S = nbt.Byte, nbt.Int, nbt.Long, nbt.Float, nbt.String
    now = int(time.time())
    root = nbt.Compound({
        "BiomeOverride": S(""), "CenterMapsToOrigin": B(0), "ConfirmedPlatformLockedContent": B(0),
        "Difficulty": I(difficulty), "FlatWorldLayers": S(json.dumps(flat_layers, separators=(",", ":"))),
        "ForceGameType": B(0), "GameType": I(game_type), "Generator": I(2),
        "InventoryVersion": S(".".join(str(v) for v in GAME_VERSION[:3])),
        "LANBroadcast": B(1), "LANBroadcastIntent": B(1), "LastPlayed": L(now), "LevelName": S(name),
        "LimitedWorldOriginX": I(spawn[0]), "LimitedWorldOriginY": I(spawn[1]), "LimitedWorldOriginZ": I(spawn[2]),
        "MinimumCompatibleClientVersion": nbt.List(nbt.INT, [I(v) for v in (1, 26, 0, 0, 0)]),
        "MultiplayerGame": B(1), "MultiplayerGameIntent": B(1), "NetherScale": I(8),
        "NetworkVersion": I(NETWORK_VERSION), "Platform": I(2), "PlatformBroadcastIntent": I(3),
        "RandomSeed": L(seed), "SpawnV1Villagers": B(0),
        "SpawnX": I(spawn[0]), "SpawnY": I(spawn[1]), "SpawnZ": I(spawn[2]),
        "StorageVersion": I(STORAGE_VERSION), "Time": L(time_of_day), "WorldVersion": I(1),
        "XBLBroadcastIntent": I(3),
        "abilities": nbt.Compound({
            "attackmobs": B(1), "attackplayers": B(1), "build": B(1), "doorsandswitches": B(1),
            "flySpeed": F(0.05), "flying": B(0), "instabuild": B(0), "invulnerable": B(0), "lightning": B(0),
            "mayfly": B(0), "mine": B(1), "op": B(0), "opencontainers": B(1), "teleport": B(0), "walkSpeed": F(0.1)}),
        "baseGameVersion": S("*"), "bonusChestEnabled": B(0), "bonusChestSpawned": B(0),
        "commandblockoutput": B(1), "commandblocksenabled": B(1), "commandsEnabled": B(1),
        "currentTick": L(0), "daylightCycle": I(0), "dodaylightcycle": B(1), "doentitydrops": B(1),
        "dofiretick": B(1), "doimmediaterespawn": B(0), "doinsomnia": B(1), "domobloot": B(1),
        "domobspawning": B(1), "dotiledrops": B(1), "doweathercycle": B(1), "drowningdamage": B(1),
        "eduOffer": I(0), "educationFeaturesEnabled": B(0),
        "experiments": nbt.Compound({"experiments_ever_used": B(0), "saved_with_toggled_experiments": B(0)}),
        "falldamage": B(1), "firedamage": B(1), "freezedamage": B(1), "functioncommandlimit": I(10000),
        "hasBeenLoadedInCreative": B(0), "hasLockedBehaviorPack": B(0), "hasLockedResourcePack": B(0),
        "immutableWorld": B(0), "isFromLockedTemplate": B(0), "isFromWorldTemplate": B(0),
        "isSingleUseWorld": B(0), "isWorldTemplateOptionLocked": B(0), "keepinventory": B(0),
        "lastOpenedWithVersion": nbt.List(nbt.INT, [I(v) for v in GAME_VERSION]),
        "lightningLevel": F(0.0), "lightningTime": I(100000), "limitedWorldDepth": I(16), "limitedWorldWidth": I(16),
        "maxcommandchainlength": I(65535), "mobgriefing": B(1), "naturalregeneration": B(1),
        "permissionsLevel": I(0), "playerPermissionsLevel": I(1), "prid": S(""), "pvp": B(1),
        "rainLevel": F(0.0), "rainTime": I(120000), "randomtickspeed": I(1),
        "requiresCopiedPackRemovalCheck": B(0), "respawnblocksexplode": B(1), "sendcommandfeedback": B(1),
        "serverChunkTickRange": I(4), "showbordereffect": B(1), "showcoordinates": B(0),
        "showdeathmessages": B(1), "showtags": B(1), "spawnMobs": B(1), "spawnradius": I(0),
        "startWithMapEnabled": B(0), "texturePacksRequired": B(1), "tntexplodes": B(1),
        "useMsaGamertagsOnly": B(0), "worldStartCount": L(0xFFFFFFFE), "world_policies": nbt.Compound(),
    })
    for k, v in (extra or {}).items():
        root[k] = v
    payload = nbt.dumps(root)
    with open(path, "wb") as f:
        f.write(struct.pack("<ii", STORAGE_VERSION, len(payload)))
        f.write(payload)


def package(world_dir, out_path, packs):
    """Embed packs (list of (folder_name, src_dir, kind)) and zip the world as .mcworld."""
    bp, rp = [], []
    for folder, src, kind in packs:
        dst = os.path.join(world_dir, "behavior_packs" if kind == "behavior" else "resource_packs", folder)
        if os.path.isdir(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
        man = json.load(open(os.path.join(src, "manifest.json")))
        entry = {"pack_id": man["header"]["uuid"], "version": man["header"]["version"]}
        (bp if kind == "behavior" else rp).append(entry)
    with open(os.path.join(world_dir, "world_behavior_packs.json"), "w") as f:
        json.dump(bp, f, indent=2)
    with open(os.path.join(world_dir, "world_resource_packs.json"), "w") as f:
        json.dump(rp, f, indent=2)
    if os.path.exists(out_path):
        os.remove(out_path)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for base, dirs, files in os.walk(world_dir):
            dirs.sort()
            for fn in sorted(files):
                full = os.path.join(base, fn)
                arc = os.path.relpath(full, world_dir).replace(os.sep, "/")
                if fn == "LOCK":
                    continue
                z.write(full, arc)
    return out_path
