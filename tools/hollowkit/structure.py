"""Write Bedrock .mcstructure files (little-endian NBT) from a simple block-placement builder.

Every palette entry is completed and validated against Mojang's vanilla block metadata
(bedrock-samples/metadata/vanilladata_modules/mojang-blocks.json, 1.26.50): unknown blocks,
unknown states and illegal values raise immediately. Positions that are never set are written
as structure voids (-1) so the existing world is kept there.
"""
import json
import os
import struct

from . import ROOT

META = os.path.join(ROOT, "build", "bedrock-samples", "metadata", "vanilladata_modules", "mojang-blocks.json")
# Block data version for 1.26.50.4: (major<<24)|(minor<<16)|(patch<<8)|revision
BLOCK_VERSION = (1 << 24) | (26 << 16) | (50 << 8) | 4

_vanilla = None


def vanilla():
    global _vanilla
    if _vanilla is None:
        d = json.load(open(META))
        props = {p["name"]: (p["type"], [v["value"] for v in p["values"]]) for p in d["block_properties"]}
        blocks = {b["name"]: [p["name"] for p in b.get("properties", [])] for b in d["data_items"]}
        _vanilla = (blocks, props)
    return _vanilla


# Defaults for states whose first listed value is not the natural default.
PREFERRED_DEFAULTS = {
    "pillar_axis": "y",
    "minecraft:cardinal_direction": "south",
    "minecraft:vertical_half": "bottom",
    "minecraft:block_face": "down",
    "torch_facing_direction": "top",
    "facing_direction": 0,
    "weirdo_direction": 0,
    "direction": 0,
    "candles": 0,
    "persistent_bit": True,  # placed leaves never decay
}

CUSTOM_BLOCKS = {
    "hollow:heart_altar": {"hollow:awake": 0},
    "hollow:hollow_roots": {},
}


def complete(name, states):
    states = dict(states or {})
    if name.startswith("hollow:"):
        allowed = CUSTOM_BLOCKS.get(name)
        if allowed is None:
            raise KeyError(f"unknown custom block {name}")
        out = dict(allowed)
        for k, v in states.items():
            if k not in allowed:
                raise KeyError(f"{name}: unknown state {k}")
            out[k] = v
        return out
    blocks, props = vanilla()
    if name not in blocks:
        raise KeyError(f"unknown vanilla block {name}")
    want = blocks[name]
    for k in states:
        if k not in want:
            raise KeyError(f"{name}: state {k} not valid (expected {want})")
    out = {}
    for k in want:
        typ, values = props[k]
        if k in states:
            v = states[k]
            if v not in values:
                raise ValueError(f"{name}: {k}={v!r} not in {values}")
        else:
            v = PREFERRED_DEFAULTS.get(k, values[0])
            if v not in values:
                v = values[0]
        out[k] = v
    return out


class Builder:
    def __init__(self, sx, sy, sz):
        self.size = (sx, sy, sz)
        self.blocks = {}

    def set(self, x, y, z, name, **states):
        sx, sy, sz = self.size
        if not (0 <= x < sx and 0 <= y < sy and 0 <= z < sz):
            return
        self.blocks[(x, y, z)] = (name, states)

    def get(self, x, y, z):
        return self.blocks.get((x, y, z))

    def fill(self, x0, y0, z0, x1, y1, z1, name, **states):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for z in range(min(z0, z1), max(z0, z1) + 1):
                    self.set(x, y, z, name, **states)

    def clear(self, x0, y0, z0, x1, y1, z1):
        self.fill(x0, y0, z0, x1, y1, z1, "minecraft:air")

    def void(self, x0, y0, z0, x1, y1, z1):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for z in range(min(z0, z1), max(z0, z1) + 1):
                    self.blocks.pop((x, y, z), None)

    def write(self, path):
        sx, sy, sz = self.size
        palette, index_of, indices = [], {}, []
        for x in range(sx):
            for y in range(sy):
                for z in range(sz):
                    b = self.blocks.get((x, y, z))
                    if b is None:
                        indices.append(-1)
                        continue
                    name, states = b
                    full = complete(name, states)
                    key = (name, tuple(sorted(full.items())))
                    if key not in index_of:
                        index_of[key] = len(palette)
                        palette.append((name, full))
                    indices.append(index_of[key])
        root = Compound([
            ("format_version", Int(1)),
            ("size", List(TAG_INT, [Int(v) for v in (sx, sy, sz)])),
            ("structure", Compound([
                ("block_indices", List(TAG_LIST, [List(TAG_INT, [Int(i) for i in indices]),
                                                    List(TAG_INT, [Int(-1)] * len(indices))])),
                ("entities", List(TAG_COMPOUND, [])),
                ("palette", Compound([("default", Compound([
                    ("block_palette", List(TAG_COMPOUND, [
                        Compound([("name", String(n)), ("states", Compound([(k, state_tag(v)) for k, v in st.items()])),
                                  ("version", Int(BLOCK_VERSION))]) for n, st in palette])),
                    ("block_position_data", Compound([])),
                ]))])),
            ])),
            ("structure_world_origin", List(TAG_INT, [Int(0), Int(0), Int(0)])),
        ])
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(bytes([TAG_COMPOUND]) + _str(""))
            f.write(root.payload())
        return len(palette), sum(1 for i in indices if i >= 0)


# --------------------------------------------------------------------------- tiny NBT (LE)
TAG_END, TAG_BYTE, TAG_SHORT, TAG_INT, TAG_LONG, TAG_FLOAT, TAG_DOUBLE = 0, 1, 2, 3, 4, 5, 6
TAG_STRING, TAG_LIST, TAG_COMPOUND = 8, 9, 10


def _str(s):
    b = s.encode("utf-8")
    return struct.pack("<H", len(b)) + b


class Tag:
    tag = None


class Byte(Tag):
    tag = TAG_BYTE

    def __init__(self, v):
        self.v = v

    def payload(self):
        return struct.pack("<b", self.v)


class Int(Tag):
    tag = TAG_INT

    def __init__(self, v):
        self.v = v

    def payload(self):
        return struct.pack("<i", self.v)


class String(Tag):
    tag = TAG_STRING

    def __init__(self, v):
        self.v = v

    def payload(self):
        return _str(self.v)


class List(Tag):
    tag = TAG_LIST

    def __init__(self, elem, items):
        self.elem = elem
        self.items = items

    def payload(self):
        out = struct.pack("<b", self.elem if self.items or self.elem else TAG_END) + struct.pack("<i", len(self.items))
        return out + b"".join(i.payload() for i in self.items)


class Compound(Tag):
    tag = TAG_COMPOUND

    def __init__(self, items):
        self.items = items

    def payload(self):
        out = b""
        for k, v in self.items:
            out += bytes([v.tag]) + _str(k) + v.payload()
        return out + bytes([TAG_END])


def state_tag(v):
    if isinstance(v, bool):
        return Byte(1 if v else 0)
    if isinstance(v, int):
        return Int(v)
    return String(str(v))
