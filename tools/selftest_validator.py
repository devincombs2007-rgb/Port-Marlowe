"""Mutation self-test for tools/validate.py.

Injects one known defect at a time into a pack/script file, runs the validator, checks that it
reports an ERROR, then restores the file byte-for-byte. Proves the validator actually catches
the classes of mistakes it claims to.

Usage: python3 tools/selftest_validator.py
"""
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

MUTATIONS = [
    ("unknown entity component", "packs/behavior/entities/watcher.json",
     lambda s: s.replace('"minecraft:physics"', '"minecraft:physicz"', 1)),
    ("missing entity texture", "packs/resource/entity/knocker.entity.json",
     lambda s: s.replace("textures/entity/hollow/knocker", "textures/entity/hollow/knockerX", 1)),
    ("undefined sound id in script", "scripts_src/core/ids.ts",
     lambda s: re.sub(r'(SND = \{\s*\n\s*\w+: ")hollow\.', r"\1hollow.nope", s, count=1)),
    ("unknown item in recipe", "packs/behavior/recipes/hollow_lens.json",
     lambda s: s.replace("minecraft:glass_pane", "minecraft:glass_panel")),
    ("dangling Vibrant Visuals reference", "packs/visuals/biomes/forest.client_biome.json",
     lambda s: s.replace("hollow:wild_lighting", "hollow:wild_lightning")),
    ("undeclared block state", "packs/behavior/blocks/rowan_ward.json",
     lambda s: s.replace('"hollow:used"', '"hollow:usedd"', 1)),
    ("schema violation in item", "packs/behavior/items/hollow_lens.json",
     lambda s: s.replace('"max_durability": 64', '"max_durability": "sixty-four"', 1)),
    ("undeclared animation sound effect", "packs/resource/animations/borrowed.animation.json",
     lambda s: s.replace('"effect": "reveal"', '"effect": "revealz"', 1)),
]


def validate():
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "validate.py")], cwd=ROOT, capture_output=True, text=True)
    return r.returncode, [ln for ln in r.stdout.splitlines() if ln.startswith("ERROR")]


def main():
    rc, errs = validate()
    if rc != 0:
        print("baseline is not clean; fix validation errors first")
        return 1
    caught = 0
    for label, rel, fn in MUTATIONS:
        path = os.path.join(ROOT, rel)
        with open(path, "rb") as f:
            original = f.read()
        mutated = fn(original.decode("utf-8"))
        if mutated == original.decode("utf-8"):
            print(f"SKIP  {label}: mutation did not apply")
            continue
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(mutated)
            rc, errs = validate()
        finally:
            with open(path, "wb") as f:
                f.write(original)
        ok = rc != 0 and errs
        caught += bool(ok)
        print(f"{'CAUGHT' if ok else 'MISSED'}  {label}: {errs[0] if errs else 'no error reported'}")
    print(f"\n{caught}/{len(MUTATIONS)} injected defects detected")
    return 0 if caught == len(MUTATIONS) else 1


if __name__ == "__main__":
    sys.exit(main())
