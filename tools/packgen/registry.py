"""Writes resource-side registries: sounds.json (entity sound events), lang files, languages.json."""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import BP, RP, VP, ensure  # noqa: E402

ENTITY_SOUNDS = {
    "hollow:watcher": {
        "volume": 1.0, "pitch": [0.92, 1.05],
        "events": {
            "ambient": "hollow.watcher.creak",
            "hurt": "hollow.watcher.hurt",
            "death": "hollow.watcher.death",
            "step": {"sound": "hollow.watcher.step", "volume": 0.35},
        },
    },
    "hollow:borrowed": {
        "volume": 1.0, "pitch": [0.95, 1.05],
        "events": {
            "ambient": "hollow.borrowed.baa",
            "hurt": "hollow.borrowed.hurt",
            "death": "hollow.borrowed.death",
            "step": {"sound": "hollow.borrowed.step", "volume": 0.3},
            "attack": "hollow.borrowed.attack",
        },
    },
    "hollow:hollowed": {
        "volume": 1.0, "pitch": [0.9, 1.1],
        "events": {
            "ambient": "hollow.hollowed.click",
            "hurt": "hollow.hollowed.hurt",
            "death": "hollow.hollowed.death",
            "step": {"sound": "hollow.hollowed.step", "volume": 0.35},
            "attack": "hollow.hollowed.attack",
        },
    },
    "hollow:knocker": {
        "volume": 1.0, "pitch": [0.9, 1.0],
        "events": {
            "hurt": "hollow.knocker.hurt",
            "death": "hollow.knocker.death",
            "step": {"sound": "hollow.knocker.step", "volume": 0.45},
        },
    },
    "hollow:mirebound": {
        "volume": 1.0, "pitch": [0.9, 1.05],
        "events": {
            "ambient": "hollow.mirebound.bubble",
            "hurt": "hollow.mirebound.hurt",
            "death": "hollow.mirebound.death",
        },
    },
    "hollow:heart_below": {
        "volume": 1.0, "pitch": 1.0,
        "events": {
            "hurt": "hollow.heart.hurt",
            "death": "hollow.heart.death",
        },
    },
    "hollow:heart_vein": {
        "volume": 1.0, "pitch": [0.9, 1.1],
        "events": {
            "hurt": "hollow.heart.hurt",
            "death": "hollow.heart.vein_break",
        },
    },
}

LANG_EXTRA = {
    "hollow.ui.journal": "Field Journal",
}


def write(path, obj):
    ensure(os.path.dirname(path))
    with open(path, "w") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


def main():
    write(os.path.join(RP, "sounds.json"), {"entity_sounds": {"entities": ENTITY_SOUNDS}})
    gen = json.load(open(os.path.join(os.path.dirname(__file__), "lang_generated.json")))
    gen.update(LANG_EXTRA)
    subs = os.path.join(os.path.dirname(__file__), "..", "sounds", "subtitles_generated.json")
    if os.path.isfile(subs):
        gen.update(json.load(open(subs)))  # Minecraft subtitles for every HOLLOW sound
    lines = [f"{k}={v}" for k, v in sorted(gen.items())]
    for pack in (BP, RP):
        ensure(os.path.join(pack, "texts"))
        with open(os.path.join(pack, "texts", "en_US.lang"), "w") as f:
            f.write("\n".join(lines) + "\n")
        write(os.path.join(pack, "texts", "languages.json"), ["en_US"])
    ensure(os.path.join(VP, "texts"))
    with open(os.path.join(VP, "texts", "en_US.lang"), "w") as f:
        f.write("pack.name=THE HOLLOW: Visuals (optional)\npack.description=Vibrant Visuals lighting, atmosphere and fog for THE HOLLOW.\n")
    write(os.path.join(VP, "texts", "languages.json"), ["en_US"])


if __name__ == "__main__":
    main()
