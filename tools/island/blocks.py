"""Block states for the island world, validated against Mojang's canonical palette.

Every block written to the world uses exactly a canonical (name, states, version) triple from
pmmp/BedrockData's canonical_block_states.nbt (generated from the game), so the world loads
without any block-upgrade step. Unknown names or states fail the build instead of the game.
"""
import os

from . import nbt

HERE = os.path.dirname(os.path.abspath(__file__))
CANON = os.path.join(HERE, "data", "canonical_block_states.nbt")

_by_name = {}
_version = None


def _load():
    global _version
    if _by_name:
        return
    with open(CANON, "rb") as f:
        states = nbt.loads_many(f.read(), network=True)
    for s in states:
        name = s["name"].v
        _by_name.setdefault(name, []).append(s)
        _version = s["version"].v


def version():
    _load()
    return _version


def exists(name):
    _load()
    return name in _by_name


def canonical(name, **states):
    """The canonical NBT compound for a block. Unspecified states take the first canonical
    permutation's values (the game's default ordering)."""
    _load()
    if not name.startswith("minecraft:"):
        name = "minecraft:" + name
    perms = _by_name.get(name)
    if not perms:
        raise KeyError(f"unknown block {name}")
    want = {k: v for k, v in states.items()}
    for p in perms:
        st = p["states"].v
        ok = True
        for k, v in want.items():
            if k not in st:
                raise KeyError(f"{name} has no state {k} (has {list(st)})")
            sv = st[k].v
            if isinstance(sv, int) and isinstance(v, bool):
                v = int(v)
            if sv != v:
                ok = False
                break
        if ok:
            return p
    raise KeyError(f"{name}: no permutation with {want}")


def key(comp):
    """Hashable identity for a canonical compound."""
    return (comp["name"].v, tuple(sorted((k, repr(t.v)) for k, t in comp["states"].v.items())))


def palette_bytes(comp):
    out = nbt.Compound({"name": nbt.String(comp["name"].v), "states": comp["states"],
                        "version": nbt.Int(comp["version"].v)})
    return nbt.dumps(out)
