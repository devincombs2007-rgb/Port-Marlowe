"""Minimal Bedrock NBT: little-endian (disk) writer/reader and network (varint) reader.

Values are plain Python objects wrapped in small tag classes where the type matters:
Byte, Short, Int, Long, Float, Double, String, List(tag_type, items), Compound(dict).
"""
import struct

END, BYTE, SHORT, INT, LONG, FLOAT, DOUBLE, BYTE_ARRAY, STRING, LIST, COMPOUND, INT_ARRAY, LONG_ARRAY = range(13)


class Tag:
    tid = None

    def __init__(self, v):
        self.v = v

    def __repr__(self):
        return f"{type(self).__name__}({self.v!r})"

    def __eq__(self, other):
        return type(self) is type(other) and self.v == other.v

    def __hash__(self):
        return hash((type(self).__name__, repr(self.v)))


class Byte(Tag):
    tid = BYTE


class Short(Tag):
    tid = SHORT


class Int(Tag):
    tid = INT


class Long(Tag):
    tid = LONG


class Float(Tag):
    tid = FLOAT


class Double(Tag):
    tid = DOUBLE


class String(Tag):
    tid = STRING


class List(Tag):
    tid = LIST

    def __init__(self, item_tid, items):
        super().__init__(list(items))
        self.item_tid = item_tid


class Compound(Tag):
    tid = COMPOUND

    def __init__(self, d=None):
        super().__init__(dict(d or {}))

    def __getitem__(self, k):
        return self.v[k]

    def __setitem__(self, k, val):
        self.v[k] = val

    def get(self, k, default=None):
        return self.v.get(k, default)


# ------------------------------------------------------------------- little-endian writer
def _w_str(b, s):
    raw = s.encode("utf-8")
    b += struct.pack("<H", len(raw)) + raw


def _w_payload(b, t):
    if isinstance(t, Byte):
        b += struct.pack("<b", t.v)
    elif isinstance(t, Short):
        b += struct.pack("<h", t.v)
    elif isinstance(t, Int):
        b += struct.pack("<i", t.v)
    elif isinstance(t, Long):
        b += struct.pack("<q", t.v)
    elif isinstance(t, Float):
        b += struct.pack("<f", t.v)
    elif isinstance(t, Double):
        b += struct.pack("<d", t.v)
    elif isinstance(t, String):
        _w_str(b, t.v)
    elif isinstance(t, List):
        b += struct.pack("<bi", t.item_tid if t.v else (t.item_tid or END), len(t.v))
        for it in t.v:
            _w_payload(b, it)
    elif isinstance(t, Compound):
        for k, val in t.v.items():
            b += struct.pack("<b", val.tid)
            _w_str(b, k)
            _w_payload(b, val)
        b += b"\x00"
    else:
        raise TypeError(t)


def dumps(tag, name=""):
    """Root tag (normally a Compound) as little-endian NBT bytes."""
    b = bytearray()
    b += struct.pack("<b", tag.tid)
    _w_str(b, name)
    _w_payload(b, tag)
    return bytes(b)


# ------------------------------------------------------------------- readers
class _Reader:
    def __init__(self, data, network=False):
        self.d = data
        self.i = 0
        self.net = network

    def take(self, n):
        out = self.d[self.i:self.i + n]
        self.i += n
        return out

    def varuint(self):
        r = shift = 0
        while True:
            c = self.d[self.i]
            self.i += 1
            r |= (c & 0x7F) << shift
            if not c & 0x80:
                return r
            shift += 7

    def varint(self):
        u = self.varuint()
        return (u >> 1) ^ -(u & 1)

    def string(self):
        n = self.varuint() if self.net else struct.unpack("<H", self.take(2))[0]
        return self.take(n).decode("utf-8", "replace")

    def payload(self, tid):
        if tid == BYTE:
            return Byte(struct.unpack("<b", self.take(1))[0])
        if tid == SHORT:
            return Short(struct.unpack("<h", self.take(2))[0])
        if tid == INT:
            return Int(self.varint() if self.net else struct.unpack("<i", self.take(4))[0])
        if tid == LONG:
            return Long(self.varint() if self.net else struct.unpack("<q", self.take(8))[0])
        if tid == FLOAT:
            return Float(struct.unpack("<f", self.take(4))[0])
        if tid == DOUBLE:
            return Double(struct.unpack("<d", self.take(8))[0])
        if tid == STRING:
            return String(self.string())
        if tid == LIST:
            it = struct.unpack("<b", self.take(1))[0]
            n = self.varint() if self.net else struct.unpack("<i", self.take(4))[0]
            return List(it, [self.payload(it) for _ in range(n)])
        if tid == COMPOUND:
            out = Compound()
            while True:
                t = struct.unpack("<b", self.take(1))[0]
                if t == END:
                    return out
                k = self.string()
                out[k] = self.payload(t)
        if tid == BYTE_ARRAY:
            n = self.varint() if self.net else struct.unpack("<i", self.take(4))[0]
            return Tag(self.take(n))
        if tid == INT_ARRAY:
            n = self.varint() if self.net else struct.unpack("<i", self.take(4))[0]
            return Tag([self.payload(INT).v for _ in range(n)])
        raise ValueError(f"tag {tid} at {self.i}")

    def root(self):
        tid = struct.unpack("<b", self.take(1))[0]
        name = self.string()
        return name, self.payload(tid)


def loads(data, network=False):
    return _Reader(data, network).root()[1]


def loads_with_size(data, network=False):
    r = _Reader(data, network)
    return r.root()[1], r.i


def loads_many(data, network=False):
    r = _Reader(data, network)
    out = []
    while r.i < len(r.d):
        out.append(r.root()[1])
    return out


def plain(t):
    """Tag tree -> plain Python (for inspection/tests)."""
    if isinstance(t, Compound):
        return {k: plain(v) for k, v in t.v.items()}
    if isinstance(t, List):
        return [plain(v) for v in t.v]
    return t.v
