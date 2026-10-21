"""Build THE HOLLOW.

  python3 tools/build.py            registries + TypeScript + validation + packaging
  python3 tools/build.py --assets   also regenerate every generated asset (models, textures,
                                    icons, particles, sounds, structures, visuals) first

Outputs dist/THE_HOLLOW_<version>.mcaddon plus one .mcpack per pack.
"""
import json
import os
import shutil
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PACKS = {"behavior": "THE_HOLLOW_BP", "resource": "THE_HOLLOW_RP", "visuals": "THE_HOLLOW_Visuals"}

ASSET_STEPS = [
    "creatures/watcher.py", "creatures/borrowed.py", "creatures/hollowed.py", "creatures/knocker.py",
    "creatures/mirebound.py", "creatures/heart.py", "blocks/blocks.py", "art/icons.py", "art/journal_art.py", "art/particles.py",
    "art/pack_icon.py", "sounds/sourced.py", "sounds/dread.py", "structures/build_structures.py", "visuals/build_visuals.py",
]
CONTENT_STEPS = ["packgen/content.py", "packgen/registry.py", "packgen/animations.py"]


def run(cmd, cwd=ROOT):
    print("+", " ".join(cmd))
    subprocess.run(cmd, cwd=cwd, check=True)


def py(step):
    path = os.path.join(HERE, step)
    if os.path.isfile(path):
        run([sys.executable, path])
    else:
        print(f"  (skipped, not present: {step})")


def compile_scripts():
    tc = os.path.join(HERE, "typecheck")
    if not os.path.isdir(os.path.join(tc, "node_modules")):
        run(["npm", "ci" if os.path.isfile(os.path.join(tc, "package-lock.json")) else "install", "--no-audit", "--no-fund"], cwd=tc)
    out = os.path.join(ROOT, "packs", "behavior", "scripts")
    if os.path.isdir(out):
        shutil.rmtree(out)
    # 1) strict type-check against the pinned @minecraft/server 2.10.0 / server-ui 2.2.0 typings
    run(["npx", "tsc", "-p", "tsconfig.json"], cwd=tc)
    # 2) bundle to one ES module (Bedrock does not resolve extensionless relative imports)
    run(["npx", "esbuild", "../../scripts_src/main.ts", "--bundle", "--format=esm", "--platform=neutral",
         "--target=es2022", "--external:@minecraft/server", "--external:@minecraft/server-ui",
         "--outfile=../../packs/behavior/scripts/main.js", "--legal-comments=none", "--charset=utf8"], cwd=tc)


def package():
    version = ".".join(str(v) for v in json.load(open(os.path.join(ROOT, "packs", "behavior", "manifest.json")))["header"]["version"])
    dist = os.path.join(ROOT, "dist")
    os.makedirs(dist, exist_ok=True)
    addon = os.path.join(dist, f"THE_HOLLOW_v{version}.mcaddon")
    skip = {".DS_Store", "Thumbs.db"}

    def add_pack(z, src, top):
        # sorted walk + fixed timestamps: identical inputs give a byte-identical archive
        for base, dirs, files in os.walk(src):
            dirs.sort()
            for fn in sorted(files):
                if fn in skip or fn.endswith((".pyc", ".ts", ".map")):
                    continue
                full = os.path.join(base, fn)
                arc = os.path.relpath(full, src).replace(os.sep, "/")
                info = zipfile.ZipInfo(f"{top}/{arc}" if top else arc, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                with open(full, "rb") as f:
                    z.writestr(info, f.read(), compresslevel=9)

    with zipfile.ZipFile(addon, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for folder, top in PACKS.items():
            add_pack(z, os.path.join(ROOT, "packs", folder), top)
    for folder, top in PACKS.items():
        with zipfile.ZipFile(os.path.join(dist, f"{top}_v{version}.mcpack"), "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            add_pack(z, os.path.join(ROOT, "packs", folder), "")
    # integrity check: every pack in the addon has a manifest at its root, only shippable file types
    with zipfile.ZipFile(addon) as z:
        names = set(z.namelist())
        shippable = (".json", ".png", ".ogg", ".lang", ".mcstructure", ".js")
        stray = sorted(n for n in names if not n.endswith(shippable))
        assert not stray, f"unexpected files in package: {stray}"
        for top in PACKS.values():
            assert f"{top}/manifest.json" in names, top
        bad = z.testzip()
        assert bad is None, bad
    size = os.path.getsize(addon) / 1e6
    print(f"packaged {os.path.relpath(addon, ROOT)} ({size:.2f} MB)")


def main():
    if "--assets" in sys.argv:
        for s in ASSET_STEPS:
            py(s)
    for s in CONTENT_STEPS:
        py(s)
    compile_scripts()
    run([sys.executable, os.path.join(HERE, "validate.py"), "--report", "docs/VALIDATION_REPORT.generated.md"])
    run([sys.executable, os.path.join(HERE, "visuals", "verify_visuals.py"), "--report", "docs/VISUAL_REPORT.generated.md"])
    # headless simulation of the real scripts against a fake Minecraft API (logic, reloads, caps)
    run(["node", os.path.join(HERE, "simtest", "run.mjs"), "--report", "docs/SIMULATION_REPORT.generated.md"])
    package()


if __name__ == "__main__":
    main()
