"""Hand-authored 16x16 pixel-art icons for THE HOLLOW items, plus journal UI icons.

Each icon is a 16x16 character grid; '.' is transparent. Palettes are shared so the set reads as
one family: muted earth tones, cold iron, pale resin, and a single warm accent per icon.
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import RP, BUILD, ensure  # noqa: E402

BASE = {
    ".": None,
    "K": "#16110d",  # outline
    "k": "#2b211a",  # dark edge
}

ICONS = {}


def icon(name, palette, rows):
    assert len(rows) == 16, (name, len(rows))
    for r in rows:
        assert len(r) == 16, (name, r, len(r))
    ICONS[name] = ({**BASE, **palette}, rows)


icon("field_journal", {
    "b": "#4a2f1e", "B": "#6b4329", "h": "#87573a", "w": "#e6dcc3", "W": "#c9bc9c", "s": "#b9b1a0", "S": "#8a8273",
    "l": "#a8b07c",
}, [
    "................",
    "...KKKKKKKKKK...",
    "..KhhhhhhhhhhK..",
    "..KhBBBBBBBBbKW.",
    "..KhBBBBlBBBbKw.",
    "..KhBBBlllBBbKW.",
    "..KhBBBBlBBBbKw.",
    "..KhBBBBlBBBbKW.",
    "..KSssssssssSKw.",
    "..KhBBBBBBBBbKW.",
    "..KhBBBBBBBBbKw.",
    "..KhBBBBBBBBbKW.",
    "..KbbbbbbbbbbKw.",
    "...KKKKKKKKKKWw.",
    "............KK..",
    "................",
])

icon("torn_page", {
    "w": "#e2d6b4", "W": "#c7b98f", "d": "#a69468", "i": "#4a3b2a",
}, [
    "................",
    "...KKKKK.KK.....",
    "..KwwwwwKwwK....",
    "..KwiiiwwwwwK...",
    "..KwwwwwwwwwK...",
    "..KwiiiiwiiwK...",
    "...KwwwwwwwwwK..",
    "..KwwiiiwiiiwK..",
    "..KwwwwwwwwwwK..",
    "..KWwiiwiiiwwK..",
    "...KWwwwwwwwWK..",
    "...KWwiiiiwwWK..",
    "..KWWwwwwwwWdK..",
    "..KdWWWWdWWddK..",
    "...KKKKKKKKKK...",
    "................",
])

icon("pale_resin", {
    "r": "#cbbf9a", "R": "#e8dfc0", "h": "#fbf6e4", "d": "#9c8f69", "a": "#d6a85a",
}, [
    "................",
    "................",
    ".......KK.......",
    "......KhRK......",
    "......KRRK......",
    ".....KRhRrK.....",
    ".....KRRRrK.....",
    "....KRhRRrrK....",
    "....KRRRrraK....",
    "...KRRRRrrraK...",
    "...KrRRrrrraK...",
    "...KrrrrrradK...",
    "....KrrrradK....",
    ".....KddddK.....",
    "......KKKK......",
    "................",
])

icon("borrowed_hide", {
    "w": "#d9d4c8", "W": "#bdb6a6", "g": "#9a9384", "p": "#b98a7f", "P": "#93655c", "s": "#3a2c25",
}, [
    "................",
    "................",
    "...KKKKKKKKK....",
    "..KwwWwwWwwwK...",
    "..KwWwwWwwWwgK..",
    "..KwwwwwwwwwwgK.",
    "..KWwwsswwwWwgK.",
    "..KwwwwsswwwwgK.",
    "..KwWwwwsswWwgK.",
    "..KppppppppppPK.",
    "..KpPpppPppppPK.",
    "...KPPPPPPPPPK..",
    "....KKKKKKKKK...",
    "................",
    "................",
    "................",
])

icon("hollow_fang", {
    "w": "#ece4d0", "W": "#cfc4a8", "g": "#a89c7f", "r": "#6e2a24",
}, [
    "................",
    "...........KK...",
    "..........KrrK..",
    ".........KwwrK..",
    "........KwwWK...",
    ".......KwwWK....",
    "......KwwWgK....",
    ".....KwwWgK.....",
    ".....KwWgK......",
    "....KwwWgK......",
    "....KwWgK.......",
    "....KwWgK.......",
    "....KWgK........",
    "....KgK.........",
    ".....K..........",
    "................",
])

icon("knocker_nail", {
    "i": "#6b6f73", "I": "#8f9499", "h": "#b9bec2", "d": "#43474b", "r": "#7a4a2c",
}, [
    "................",
    "....KKKKK.......",
    "...KhIIIdK......",
    "...KKKiKKK......",
    ".....KiK........",
    ".....KiK........",
    ".....KIK........",
    ".....KiK........",
    ".....KIrK.......",
    ".....KirK.......",
    "......KiIKK.....",
    ".......KiiIK....",
    "........KKiIK...",
    "..........KdK...",
    "...........K....",
    "................",
])

icon("mire_pearl", {
    "m": "#2f3a2c", "M": "#455641", "h": "#7d9a72", "g": "#9fd18e", "d": "#1c241b",
}, [
    "................",
    "................",
    "................",
    ".....KKKKK......",
    "....KMMhMMK.....",
    "...KMhgMMmmK....",
    "...KMgMMmmmK....",
    "...KMMMmmmmK....",
    "...KmMmmmmdK....",
    "...KmmmmmddK....",
    "....KmmmddK.....",
    ".....KKKKK......",
    "................",
    "................",
    "................",
    "................",
])

icon("hollow_lens", {
    "c": "#b4683f", "C": "#d48a59", "h": "#efb48a", "d": "#7a4329", "g": "#cfe0dc", "G": "#9fb6b1",
    "r": "#d7caa4",
}, [
    "................",
    "....KKKKKK......",
    "...KCChCCcK.....",
    "..KChggggGcK....",
    "..KCggggGGcK....",
    "..KhggggGGdK....",
    "..KCgggGGGdK....",
    "..KcGGGGGGdK....",
    "...KcGGGGdK.....",
    "....KcdddKrK....",
    ".....KKKKKrK....",
    "..........KrK...",
    "...........KrK..",
    "............KrK.",
    ".............K..",
    "................",
])

icon("heartseeker", {
    "g": "#8d8f94", "G": "#b7b9bd", "h": "#dcdde0", "d": "#55575c", "f": "#2a2622", "r": "#b0322a",
    "R": "#e0574a", "p": "#d6c9a8",
}, [
    "................",
    "......KKKK......",
    ".....KGhhGK.....",
    "...KKGKKKKGKK...",
    "..KGKffffffKgK..",
    "..KhfffrrfffgK..",
    ".KGfffrRRrfffgK.",
    ".KhffrRRRRrffdK.",
    ".KGffrRRRRrffdK.",
    ".KGfffrRRrfffdK.",
    "..KgffffrfffdK..",
    "..KgfffpffffdK..",
    "...KKgddddgKK...",
    ".....KKKKKK.....",
    "................",
    "................",
])

icon("offering_of_silence", {
    "y": "#c99a34", "Y": "#ead06a", "w": "#7a5636", "W": "#9a7048", "s": "#d9cfb8", "r": "#e6dcc0",
    "m": "#3c5236", "i": "#8f9499",
}, [
    "................",
    "......KKK.......",
    ".....KsKsK......",
    "......KsK.......",
    "....KKKYKKK.....",
    "...KWWWYWWWK....",
    "..KWrWWYWiWwK...",
    "..KWWWWYWWWwK...",
    "..KYYYYYYYYYK...",
    "..KWWmWYWWWwK...",
    "..KWWWWYWrWwK...",
    "..KwWWWYWWwwK...",
    "...KwwwYwwwK....",
    "....KKKKKKK.....",
    "................",
    "................",
])

icon("stilled_heart", {
    "r": "#6e3a35", "R": "#8f4d45", "h": "#b06a5e", "g": "#5f5a55", "d": "#3a2420", "t": "#5a4532",
}, [
    "................",
    "....t.....t.....",
    "....Kt...tK.....",
    "...KKKKtKKKK....",
    "..KRhRRKRhRRK...",
    ".KRhRRRRRRRrrK..",
    ".KRRRRRRRRRrrK..",
    ".KRRRgRRRRrrdK..",
    ".KrRRRRRRrrrdK..",
    "..KrRRRRrrrdK...",
    "...KrRRRrrdK....",
    "....KrRrrdK.....",
    ".....KrrdK......",
    "......KdK.......",
    ".......K........",
    "................",
])

icon("hollow_chime", {
    "w": "#5a3d27", "W": "#7a5536", "c": "#b4683f", "C": "#d48a59", "h": "#efb48a", "s": "#c9c0ad",
}, [
    ".......KK.......",
    ".......Ks.......",
    "..KKKKKKKKKKK...",
    "..KWWWWWWWWwK...",
    "..KKKKKKKKKKK...",
    "...s...s...s....",
    "..KhK..s..KhK...",
    "..KCK.KhK.KCK...",
    "..KCK.KCK.KCK...",
    "..KcK.KCK.KcK...",
    "..KcK.KCK.KcK...",
    "..KKK.KcK.KKK...",
    "......KcK.......",
    "......KKK.......",
    "................",
    "................",
])

icon("rowan_ward", {
    "t": "#4e3725", "T": "#6d4c31", "i": "#8f9499", "I": "#b9bec2", "e": "#e2742c", "E": "#ffb15a",
    "r": "#a83a2a", "s": "#c9c0ad",
}, [
    "................",
    ".....K.K.K......",
    "....KTKTKTK.....",
    "....KTKTKTK.....",
    "...KKsssssKK....",
    "...KiIKEKIiK....",
    "...KIKeEeKIK....",
    "...KiKeeeKiK....",
    "....KrKeKrK.....",
    "....KTKKKTK.....",
    ".....KTTTK......",
    "......KTK.......",
    "......KTK.......",
    "......KtK.......",
    "......KKK.......",
    "................",
])

icon("heartwood_lantern", {
    "w": "#4a2f1e", "W": "#6b4329", "r": "#b0322a", "R": "#f07a52", "h": "#ffd79a", "i": "#55575c",
}, [
    "................",
    ".......KK.......",
    "......KiiK......",
    ".....KKKKKK.....",
    "....KWWWWWWK....",
    "....KWKKKKWK....",
    "....KWKRRKWK....",
    "....KWKRhKWK....",
    "....KWKRhKWK....",
    "....KWKrRKWK....",
    "....KWKKKKWK....",
    "....KwwwwwwK....",
    ".....KKKKKK.....",
    "................",
    "................",
    "................",
])

# --- journal UI icons -------------------------------------------------------------------
icon("settings", {"g": "#8a8273", "G": "#b9b1a0", "d": "#4f4a42"}, [
    "................",
    "......KKKK......",
    "...KK.KGGK.KK...",
    "..KGGKKGGKKGGK..",
    "..KGGGGGGGGGGK..",
    "...KGGGKKGGGK...",
    ".KKGGGK..KGGGKK.",
    ".KGGGK....KGGgK.",
    ".KGGGK....KGggK.",
    ".KKGGGK..KGggKK.",
    "...KGGGKKGggK...",
    "..KGGGGGGgggdK..",
    "..KGGKKggKKddK..",
    "...KK.KggK.KK...",
    "......KKKK......",
    "................",
])
icon("world", {"g": "#5d7a4e", "G": "#7d9a6a", "b": "#3f5f7a", "B": "#5a7f9e"}, [
    "................",
    ".....KKKKKK.....",
    "...KKBBGGBBKK...",
    "..KBBGGGGBBBBK..",
    "..KBGGGGBBBBBK..",
    ".KBBBGGBBBBGGBK.",
    ".KBBBBBBBBGGGBK.",
    ".KBBBBBBBGGGgbK.",
    ".KBBGGBBBBGgbbK.",
    ".KBGGGGBBBBbbbK.",
    "..KBGGGBBBbbbK..",
    "..KBBGBBBbbbbK..",
    "...KKbbbbbbKK...",
    ".....KKKKKK.....",
    "................",
    "................",
])
icon("back", {"g": "#b9b1a0", "G": "#e6dcc3"}, [
    "................",
    "................",
    "................",
    "......KK........",
    ".....KGK........",
    "....KGGKKKKKKK..",
    "...KGGGGGGGGGK..",
    "..KGGGGGGGGGGK..",
    "...KgGGGGGGGGK..",
    "....KgGKKKKKKK..",
    ".....KgK........",
    "......KK........",
    "................",
    "................",
    "................",
    "................",
])


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def render(name):
    pal, rows = ICONS[name]
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            c = pal.get(ch)
            if c is None:
                if ch not in pal:
                    raise KeyError(f"{name}: unknown palette key {ch!r}")
                continue
            px[x, y] = hexrgb(c) + (255,)
    return img


UI = {"settings", "world", "back"}


def main():
    items_dir = ensure(os.path.join(RP, "textures", "items", "hollow"))
    ui_dir = ensure(os.path.join(RP, "textures", "ui", "hollow"))
    sheet = Image.new("RGBA", (len(ICONS) * 72, 72), (24, 24, 28, 255))
    for i, name in enumerate(ICONS):
        img = render(name)
        img.save(os.path.join(ui_dir if name in UI else items_dir, f"{name}.png"))
        sheet.paste(img.resize((64, 64), Image.NEAREST), (i * 72 + 4, 4), img.resize((64, 64), Image.NEAREST))
    ensure(os.path.join(BUILD, "previews"))
    sheet.save(os.path.join(BUILD, "previews", "icons.png"))


if __name__ == "__main__":
    main()
