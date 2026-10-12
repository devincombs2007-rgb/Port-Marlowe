#!/usr/bin/env python3
"""List real CC0 candidates from Poly Haven and ambientCG for the roles in the asset BOM.

Read-only research run on CI (the development sandbox cannot reach these hosts). Prints a compact
table per role and writes the raw selection data to --out for review. Nothing is downloaded except
API metadata.
"""
import argparse
import json
import sys
import urllib.parse
import urllib.request

UA = "PortMarlowe-asset-discovery/1.0 (+https://github.com/devincombs2007-rgb/Port-Marlowe)"

AMBIENTCG_QUERIES = {
    "road_asphalt": "asphalt",
    "sidewalk_paving": "paving stones",
    "concrete": "concrete",
    "brick": "bricks",
    "plaster": "plaster",
    "metal_painted": "painted metal",
    "roof_tiles": "roofing tiles",
    "grass": "grass",
}

POLYHAVEN_TEXTURE_CATEGORIES = ["asphalt", "concrete", "brick", "plaster", "floor", "road"]
POLYHAVEN_HDRI_CATEGORIES = ["urban", "sunrise-sunset", "skies", "night"]


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def ambientcg(query, limit):
    params = {"type": "Material", "q": query, "limit": str(limit), "sort": "Popular", "include": "downloadData,tagData"}
    url = "https://ambientcg.com/api/v2/full_json?" + urllib.parse.urlencode(params)
    data = get_json(url)
    out = []
    for a in data.get("foundAssets", []):
        dl = []
        for folder in (a.get("downloadFolders") or {}).values():
            for cat in (folder.get("downloadFiletypeCategories") or {}).values():
                for d in cat.get("downloads", []):
                    if d.get("attribute") in ("1K-JPG", "2K-JPG"):
                        dl.append({"attribute": d.get("attribute"), "link": d.get("downloadLink"), "size": d.get("size"), "file": d.get("fileName")})
        out.append({"id": a.get("assetId"), "name": a.get("displayName"), "tags": (a.get("tags") or [])[:8], "downloads": dl})
    return url, out


def polyhaven(kind, category, limit):
    url = f"https://api.polyhaven.com/assets?t={kind}&c={urllib.parse.quote(category)}"
    data = get_json(url)
    items = sorted(data.items(), key=lambda kv: -int(kv[1].get("download_count", 0)))[:limit]
    return url, [{"id": k, "name": v.get("name"), "downloads": v.get("download_count"), "categories": v.get("categories"),
                  "authors": list((v.get("authors") or {}).keys())} for k, v in items]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="cc0-candidates.json")
    ap.add_argument("--limit", type=int, default=8)
    args = ap.parse_args()
    result = {"ambientcg": {}, "polyhaven_textures": {}, "polyhaven_hdris": {}, "errors": []}
    for role, q in AMBIENTCG_QUERIES.items():
        try:
            url, items = ambientcg(q, args.limit)
            result["ambientcg"][role] = {"query": url, "items": items}
            print(f"\n== ambientCG {role} ({q})")
            for i in items:
                sizes = ", ".join(f"{d['attribute']} {int(d['size'] or 0) // 1024 // 1024}MB" for d in i["downloads"])
                print(f"  {i['id']:<22} {str(i['name'])[:34]:<34} {sizes}")
        except Exception as e:  # report and continue; this is research output
            result["errors"].append(f"ambientcg {role}: {e}")
            print(f"!! ambientCG {role}: {e}", file=sys.stderr)
    for kind, cats, key in (("textures", POLYHAVEN_TEXTURE_CATEGORIES, "polyhaven_textures"), ("hdris", POLYHAVEN_HDRI_CATEGORIES, "polyhaven_hdris")):
        for c in cats:
            try:
                url, items = polyhaven(kind, c, args.limit)
                result[key][c] = {"query": url, "items": items}
                print(f"\n== Poly Haven {kind} / {c}")
                for i in items:
                    print(f"  {i['id']:<34} {str(i['name'])[:34]:<34} dl={i['downloads']}")
            except Exception as e:
                result["errors"].append(f"polyhaven {kind}/{c}: {e}")
                print(f"!! Poly Haven {kind}/{c}: {e}", file=sys.stderr)
    with open(args.out, "w") as f:
        json.dump(result, f, indent=1)
    print(f"\nerrors: {len(result['errors'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
