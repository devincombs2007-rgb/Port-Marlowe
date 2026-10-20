"""Inspect Mojang's official JSON schemas (bedrock-samples/metadata/json_schemas).

Usage: python3 tools/schema_lookup.py <schema-root> entity minecraft:rideable
       python3 tools/schema_lookup.py <schema-root> item minecraft:cooldown
"""
import json
import os
import sys
import urllib.parse

ENTRY = {
    "entity": "server/entity/1.26.50/Entity component definitions.json",
    "item": "server/item/1.26.30/Item Components.json",
    "block": "server/block/1.26.20/Components.json",
}


def load(root, path):
    with open(os.path.join(root, path)) as f:
        return json.load(f)


def resolve(root, base_path, ref):
    ref_path, _, frag = ref.partition("#")
    if ref_path:
        p = os.path.normpath(os.path.join(os.path.dirname(base_path), urllib.parse.unquote(ref_path)))
        doc = load(root, p)
    else:
        p, doc = base_path, load(root, base_path)
    node = doc
    if frag:
        for part in frag.strip("/").split("/"):
            node = node[urllib.parse.unquote(part)]
    return p, node


def describe(root, path, node, depth=0, max_depth=4, seen=None):
    seen = seen or set()
    pad = "  " * depth
    if "$ref" in node:
        p, n = resolve(root, path, node["$ref"])
        key = (p, node["$ref"])
        if key in seen or depth > max_depth:
            print(pad + f"-> {node['$ref']}")
            return
        seen = seen | {key}
        extra = {k: v for k, v in node.items() if k != "$ref"}
        if extra.get("description"):
            print(pad + "# " + extra["description"][:200])
        return describe(root, p, n, depth, max_depth, seen)
    for comb in ("oneOf", "anyOf", "allOf"):
        if comb in node:
            print(pad + comb + ":")
            for sub in node[comb]:
                describe(root, path, sub, depth + 1, max_depth, seen)
    t = node.get("type")
    desc = node.get("description", "")
    enum = node.get("enum")
    if "properties" in node:
        req = set(node.get("required", []))
        for k, v in node["properties"].items():
            vt = v.get("type", "")
            print(pad + f"{k}{'*' if k in req else ''} ({vt}) {v.get('description', '')[:150]}"
                  + (f" enum={v['enum']}" if 'enum' in v else "")
                  + (f" default={v['default']}" if 'default' in v else ""))
            if depth < max_depth and ("properties" in v or "$ref" in v or "items" in v or "oneOf" in v):
                describe(root, path, v, depth + 1, max_depth, seen)
    elif "items" in node:
        print(pad + "items:")
        describe(root, path, node["items"], depth + 1, max_depth, seen)
    elif t or enum:
        print(pad + f"({t}) {desc[:150]}" + (f" enum={enum}" if enum else ""))


def main():
    root, kind, comp = sys.argv[1], sys.argv[2], sys.argv[3]
    entry = ENTRY[kind]
    doc = load(root, entry)
    props = doc.get("properties", {})
    if comp not in props:
        print("component not in schema:", comp)
        return 1
    print(comp)
    describe(root, entry, props[comp], 1, int(sys.argv[4]) if len(sys.argv) > 4 else 3)


if __name__ == "__main__":
    sys.exit(main())
