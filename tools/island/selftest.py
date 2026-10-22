"""Round-trip check of the world writer against an independent decoder.

The sub-chunk unpacking below is Amulet's own reader (Amulet-Core 1.9, base_leveldb_interface
_decode_packed_array), not ours, so a packing mistake on our side cannot hide behind a matching
mistake in the check. Run: python3 -m tools.island.selftest  (from the repo root)
"""
import os
import struct
import sys
import tempfile

import numpy

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from tools.island import nbt  # noqa: E402
from tools.island.bedrock_world import World  # noqa: E402


def amulet_decode_packed_array(data):
    bits_per_value, data = struct.unpack("b", data[0:1])[0] >> 1, data[1:]
    if bits_per_value > 0:
        values_per_word = 32 // bits_per_value
        word_count = -(-4096 // values_per_word)
        arr = numpy.packbits(
            numpy.pad(
                numpy.unpackbits(numpy.frombuffer(bytes(reversed(data[: 4 * word_count])), dtype="uint8"))
                .reshape(-1, 32)[:, -values_per_word * bits_per_value:]
                .reshape(-1, bits_per_value)[-4096:, :],
                [(0, 0), (16 - bits_per_value, 0)], "constant")).view(dtype=">i2")[::-1]
        arr = arr.reshape((16, 16, 16)).swapaxes(1, 2)
        data = data[4 * word_count:]
    else:
        arr = None
    return data, bits_per_value, arr


def read_palette(data, n):
    """n LE-NBT compounds from the front of data -> (list, remaining bytes)."""
    out = []
    for _ in range(n):
        comp, used = nbt.loads_with_size(data)
        out.append(comp)
        data = data[used:]
    return out, data


def check_world(w, db_dir, sample_chunks=None):
    import leveldb
    db = leveldb.LevelDB(db_dir, False)
    errors = 0
    chunks = sample_chunks or [(cx, cz) for cx in range(w.cx0, w.cx1) for cz in range(w.cz0, w.cz1)]
    for cx, cz in chunks:
        base = struct.pack("<ii", cx, cz)
        assert db.get(base + b"\x2c") == bytes([42]), "chunk version"
        assert struct.unpack("<i", db.get(base + b"\x36"))[0] == 2, "finalized"
        for sy in range(16):
            j0 = sy * 16
            if j0 >= w.H:
                break
            y_index = sy - 4
            raw = None
            try:
                raw = db.get(base + b"\x2f" + struct.pack("<b", y_index))
            except Exception:  # noqa: BLE001
                raw = None
            src = w.blocks[(cx - w.cx0) * 16:(cx - w.cx0) * 16 + 16, j0:j0 + 16, (cz - w.cz0) * 16:(cz - w.cz0) * 16 + 16]
            if raw is None:
                if (src != w.air).any():
                    errors += 1
                    print("missing sub-chunk", cx, cz, y_index)
                continue
            layers = raw[1]
            assert raw[0] == 9 and layers in (1, 2) and struct.unpack("<b", raw[2:3])[0] == y_index
            rest, bits, arr = amulet_decode_packed_array(raw[3:])
            n = struct.unpack("<i", rest[:4])[0]
            pal, rest = read_palette(rest[4:], n)
            if layers == 2:
                rest2, bits2, arr2 = amulet_decode_packed_array(rest)
                n2 = struct.unpack("<i", rest2[:4])[0]
                pal2, tail = read_palette(rest2[4:], n2)
                assert not tail, "trailing bytes after layer 2"
                names2 = numpy.array([p["name"].v for p in pal2])[arr2]
                want2 = numpy.zeros((16, 16, 16), bool)
                for idx in w.wet.get((cx, cz, sy), ()):
                    want2[idx // 256, idx % 16, (idx // 16) % 16] = True
                if not ((names2 == "minecraft:water") == want2).all():
                    errors += 1
                    print("waterlog mismatch", cx, cz, y_index)
            else:
                assert not rest, "trailing bytes after layer 1"
                assert (cx, cz, sy) not in w.wet
            names = numpy.array([p["name"].v for p in pal])
            got = names[arr]
            want = numpy.array([w.name_of(int(v)) for v in range(len(w.palette))])[src]
            if not (got == want).all():
                errors += 1
                print("mismatch", cx, cz, y_index, (got != want).sum())
        d3 = db.get(base + b"\x2b")
        rest = d3[512:]
        count = 0
        while rest:
            rest, bits, arr = amulet_decode_packed_array(rest)
            if bits == 0:
                rest = rest[4:]
            else:
                n = struct.unpack("<i", rest[:4])[0]
                ids = numpy.frombuffer(rest[4:4 + 4 * n], "<i4")
                got = ids[arr][:, 0, :]
                want = w.biome[(cx - w.cx0) * 16:(cx - w.cx0) * 16 + 16, (cz - w.cz0) * 16:(cz - w.cz0) * 16 + 16]
                if not (got == want).all():
                    errors += 1
                    print("biome mismatch", cx, cz)
                rest = rest[4 + 4 * n:]
            count += 1
        assert count == 24, f"biome storages {count}"
    db.close()
    return errors


def main():
    w = World(-2, -2, 2, 2, height=128)
    stone, dirt, grass, water = w.id("stone"), w.id("dirt"), w.id("grass_block"), w.id("water", liquid_depth=0)
    log = w.id("oak_log", pillar_axis="y")
    w.fill(-32, -64, -32, 31, 40, 31, stone)
    w.fill(-32, 41, -32, 31, 43, 31, dirt)
    w.fill(-32, 44, -32, 31, 44, 31, grass)
    w.fill(-5, 44, -5, 5, 44, 5, water)
    w.fill(3, 45, 3, 3, 50, 3, log)
    rng = numpy.random.default_rng(1)
    w.blocks[rng.integers(0, 64, 400), rng.integers(0, 100, 400), rng.integers(0, 64, 400)] = log
    w.waterlog_many([2, 3, 40], [5, 108, 70], [7, 9, 33])
    w.biome[:] = 1
    w.biome[:20, :20] = 15
    with tempfile.TemporaryDirectory() as d:
        w.save_db(os.path.join(d, "db"))
        errs = check_world(w, os.path.join(d, "db"))
    print("selftest:", "OK" if errs == 0 else f"{errs} errors")
    return errs


if __name__ == "__main__":
    sys.exit(1 if main() else 0)
