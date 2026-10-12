#!/usr/bin/env python3
"""Fetch the CC0 surface sets listed in cc0_manifest.json and convert them for Unity.

For each role writes Assets/ThirdParty/CC0/Resources/PM_Surfaces/<role>/
  albedo.jpg  - base colour (sRGB)
  normal.png  - OpenGL-convention normal map (Unity convention)
  mask.png    - packed linear mask: R metallic, G ambient occlusion, B 0, A smoothness (1 - roughness)
and an ATTRIBUTION.md listing sources. Downloaded source files are hashed (SHA-256) and checked
against cc0_lock.json; --update-lock records hashes for new entries (never overwrites a mismatch).
Requires Pillow. Run on a machine that can reach polyhaven.com / ambientcg.com (CI runners can).
"""
import argparse
import hashlib
import io
import json
import os
import sys
import urllib.request
import zipfile

UA = "PortMarlowe-asset-fetch/1.0 (+https://github.com/devincombs2007-rgb/Port-Marlowe)"
HERE = os.path.dirname(os.path.abspath(__file__))


def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def polyhaven_maps(asset_id, res):
    files = json.loads(http_get(f"https://api.polyhaven.com/files/{asset_id}"))
    wanted = {"albedo": ["Diffuse", "diff", "Color"], "normal": ["nor_gl"], "rough": ["Rough", "rough"], "ao": ["AO", "ao"], "metal": ["Metal", "metal"]}
    out = {}
    for key, names in wanted.items():
        for n in names:
            entry = files.get(n, {}).get(res, {})
            fmt = entry.get("jpg") or entry.get("png")
            if fmt:
                out[key] = fmt["url"]
                break
    if "albedo" not in out or "normal" not in out:
        raise RuntimeError(f"{asset_id}: missing maps; available keys: {sorted(files.keys())}")
    return {k: (u, http_get(u)) for k, u in out.items()}


def ambientcg_maps(asset_id, attribute):
    url = f"https://ambientcg.com/get?file={asset_id}_{attribute}.zip"
    blob = http_get(url)
    z = zipfile.ZipFile(io.BytesIO(blob))
    names = z.namelist()

    def pick(suffix):
        for n in names:
            if n.lower().endswith(suffix.lower()):
                return n
        return None

    m = {"albedo": pick("_Color.jpg"), "normal": pick("_NormalGL.jpg"), "rough": pick("_Roughness.jpg"),
         "ao": pick("_AmbientOcclusion.jpg"), "metal": pick("_Metalness.jpg")}
    if not m["albedo"] or not m["normal"]:
        raise RuntimeError(f"{asset_id}: unexpected zip contents {names}")
    maps = {k: (url + "#" + n, z.read(n)) for k, n in m.items() if n}
    maps["_archive"] = (url, blob)
    return maps


def convert(maps, out_dir, max_size, detail=False):
    from PIL import Image

    def load(key, mode):
        if key not in maps:
            return None
        im = Image.open(io.BytesIO(maps[key][1]))
        im = im.convert(mode)
        if max(im.size) > max_size:
            im = im.resize((max_size, max_size), Image.LANCZOS)
        return im

    os.makedirs(out_dir, exist_ok=True)
    albedo = load("albedo", "RGB")
    albedo.save(os.path.join(out_dir, "albedo.jpg"), quality=92)
    normal = load("normal", "RGB")
    normal.save(os.path.join(out_dir, "normal.png"))
    size = albedo.size
    rough = load("rough", "L")
    ao = load("ao", "L")
    metal = load("metal", "L")
    r = metal.resize(size) if metal else Image.new("L", size, 0)
    g = ao.resize(size) if ao else Image.new("L", size, 255)
    b = Image.new("L", size, 0)
    a = rough.resize(size).point(lambda v: 255 - v) if rough else Image.new("L", size, 64)
    Image.merge("RGBA", (r, g, b, a)).save(os.path.join(out_dir, "mask.png"))
    if detail:
        # URP multiply-x2 detail albedo: luminance re-centred on mid grey with a bounded spread,
        # so the base colour is kept and only the surface variation is added.
        from PIL import ImageStat
        lum = albedo.convert("L").resize((1024, 1024), Image.LANCZOS)
        st = ImageStat.Stat(lum)
        mean, std = st.mean[0], max(st.stddev[0], 1.0)
        gain = 30.0 / std
        lum.point(lambda v: max(0, min(255, int(round(128 + (v - mean) * gain))))).convert("RGB").save(os.path.join(out_dir, "detail.png"))
    return {"size": list(size), "hasRoughness": rough is not None, "hasAO": ao is not None, "hasMetal": metal is not None, "detail": detail}


def contact_sheet(root, roles, path):
    from PIL import Image, ImageDraw
    tile = 192
    sheet = Image.new("RGB", (tile * 3, tile * len(roles)), (20, 20, 20))
    draw = ImageDraw.Draw(sheet)
    for row, role in enumerate(roles):
        for col, name in enumerate(("albedo.jpg", "normal.png", "mask.png")):
            p = os.path.join(root, role, name)
            if os.path.isfile(p):
                im = Image.open(p)
                if name == "mask.png":
                    im = im.getchannel("A").convert("RGB")  # smoothness view
                sheet.paste(im.convert("RGB").resize((tile, tile)), (col * tile, row * tile))
        draw.text((4, row * tile + 4), role, fill=(255, 255, 0))
    sheet.save(path, quality=85)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default=os.path.abspath(os.path.join(HERE, "..", "..")))
    ap.add_argument("--update-lock", action="store_true")
    ap.add_argument("--contact-sheet")
    args = ap.parse_args()

    manifest = json.load(open(os.path.join(HERE, "cc0_manifest.json")))
    lock_path = os.path.join(HERE, "cc0_lock.json")
    lock = json.load(open(lock_path)) if os.path.isfile(lock_path) else {}
    root = os.path.join(args.project, "Assets", "ThirdParty", "CC0", "Resources", "PM_Surfaces")
    attribution = ["# CC0 surface sources", "", "All sets are CC0 (public domain dedication); listed for provenance.", ""]
    failures = 0
    report = {}
    for s in manifest["surfaces"]:
        role, src, aid, res = s["role"], s["source"], s["id"], s["resolution"]
        try:
            maps = polyhaven_maps(aid, res) if src == "polyhaven" else ambientcg_maps(aid, res)
            hashes = {k: sha256(v[1]) for k, v in maps.items()}
            key = f"{src}:{aid}:{res}"
            pinned = lock.get(key)
            if pinned and pinned != hashes:
                raise RuntimeError(f"hash mismatch for {key}; expected {pinned}, got {hashes}")
            if not pinned:
                if args.update_lock:
                    lock[key] = hashes
                print(f"  (unpinned) {key}: {json.dumps(hashes)}")
            maps.pop("_archive", None)
            info = convert(maps, os.path.join(root, role), manifest.get("maxSize", 2048), s.get("detail", False))
            report[role] = {"source": key, **info}
            page = f"https://polyhaven.com/a/{aid}" if src == "polyhaven" else f"https://ambientcg.com/view?id={aid}"
            attribution.append(f"- `{role}`: {aid} ({src}, {res}) - {page} - CC0")
            print(f"ok   {role:<18} {key} {info}")
        except Exception as e:
            failures += 1
            print(f"FAIL {role:<18} {src}:{aid}: {e}", file=sys.stderr)
    os.makedirs(os.path.dirname(root), exist_ok=True)
    with open(os.path.join(args.project, "Assets", "ThirdParty", "CC0", "ATTRIBUTION.md"), "w") as f:
        f.write("\n".join(attribution) + "\n")
    if args.update_lock:
        with open(lock_path, "w") as f:
            json.dump(lock, f, indent=1, sort_keys=True)
    if args.contact_sheet:
        contact_sheet(root, [s["role"] for s in manifest["surfaces"]], args.contact_sheet)
    print(json.dumps(report, indent=1))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
