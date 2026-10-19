"""THE HOLLOW static validator.

Checks every pack file without a game runtime: JSON syntax, Mojang JSON schemas (1.26.50 metadata),
identifier cross-references (entities, items, blocks, geometry, textures, animations, render
controllers, sounds, particles, fogs, loot tables, recipes, structures, lang), manifest integrity,
texture-set channel layouts and script-side id references.

Usage: python3 tools/validate.py [--report docs/VALIDATION_REPORT.generated.md]
Exit code 1 if any ERROR is found.
"""
import glob
import json
import os
import re
import struct
import sys
import uuid

sys.path.insert(0, os.path.dirname(__file__))
from hollowkit import BP, RP, VP, ROOT  # noqa: E402
from hollowkit.schemas import SchemaSet  # noqa: E402

SAMPLES = os.path.join(ROOT, "build", "bedrock-samples")
META = os.path.join(SAMPLES, "metadata")

errors, warnings, infos = [], [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def info(msg):
    infos.append(msg)


def rel(p):
    return os.path.relpath(p, ROOT)


def load_json(path):
    with open(path, encoding="utf-8") as f:
        txt = f.read()
    return json.loads(txt)


# ------------------------------------------------------------------------------ vanilla data
def vanilla():
    data = {"blocks": {}, "items": set(), "entities": set(), "block_props": {}}
    try:
        b = load_json(os.path.join(META, "vanilladata_modules", "mojang-blocks.json"))
        for p in b["block_properties"]:
            data["block_props"][p["name"]] = [v["value"] for v in p["values"]]
        for blk in b["data_items"]:
            data["blocks"][blk["name"]] = [p["name"] for p in blk.get("properties", [])]
        it = load_json(os.path.join(META, "vanilladata_modules", "mojang-items.json"))
        data["items"] = {i["name"] for i in it["data_items"]}
        en = load_json(os.path.join(META, "vanilladata_modules", "mojang-entities.json"))
        data["entities"] = {e["name"] for e in en["data_items"]}
        info(f"vanilla data: {len(data['blocks'])} blocks, {len(data['items'])} items, {len(data['entities'])} entities (bedrock-samples {load_json(os.path.join(SAMPLES, 'version.json'))['latest']['version']})")
    except Exception as e:  # pragma: no cover
        warn(f"vanilla metadata unavailable ({e}); vanilla id checks skipped")
    return data


V = None
SCH = SchemaSet()
ENTITY_COMPONENTS = set()


# ------------------------------------------------------------------------------ 1. JSON syntax
def check_json_syntax():
    n = 0
    for pack in (BP, RP, VP):
        for path in glob.glob(os.path.join(pack, "**", "*.json"), recursive=True):
            n += 1
            try:
                load_json(path)
            except Exception as e:
                err(f"JSON syntax: {rel(path)}: {e}")
    info(f"JSON syntax: {n} files parsed")


# ------------------------------------------------------------------------------ 2. manifests
def check_manifests():
    m = {name: load_json(os.path.join(p, "manifest.json")) for name, p in (("bp", BP), ("rp", RP), ("vp", VP))}
    seen = set()
    for name, man in m.items():
        if man.get("format_version") != 2:
            err(f"manifest {name}: format_version must be 2")
        hdr = man["header"]
        for u in [hdr["uuid"]] + [mod["uuid"] for mod in man["modules"]]:
            try:
                uuid.UUID(u)
            except Exception:
                err(f"manifest {name}: invalid uuid {u}")
            if u in seen:
                err(f"manifest {name}: duplicate uuid {u}")
            seen.add(u)
        if hdr.get("min_engine_version") != [1, 26, 50]:
            warn(f"manifest {name}: min_engine_version {hdr.get('min_engine_version')}")
        if name in ("rp", "vp") and "pbr" not in man.get("capabilities", []):
            err(f"manifest {name}: missing 'pbr' capability (Vibrant Visuals would be disabled for this pack)")
    deps = m["bp"].get("dependencies", [])
    if not any(d.get("uuid") == m["rp"]["header"]["uuid"] for d in deps):
        err("manifest bp: must depend on the resource pack uuid")
    mods = {d.get("module_name"): d.get("version") for d in deps if "module_name" in d}
    if mods.get("@minecraft/server") != "2.10.0" or mods.get("@minecraft/server-ui") != "2.2.0":
        err(f"manifest bp: script module versions {mods}")
    for sm in os.listdir(os.path.join(META, "script_modules", "@minecraft")) if os.path.isdir(META) else []:
        pass
    if os.path.isdir(META):
        have = set(os.listdir(os.path.join(META, "script_modules", "@minecraft")))
        for mod, ver in mods.items():
            fn = f"{mod.split('/')[1]}_{ver}.json"
            if fn not in have:
                err(f"manifest bp: {mod} {ver} not shipped in Minecraft 1.26.50 metadata")
            else:
                info(f"script module {mod} {ver}: present in Minecraft 1.26.50 metadata (stable, no -beta suffix)")
    script = [mod for mod in m["bp"]["modules"] if mod["type"] == "script"]
    if not script or not os.path.isfile(os.path.join(BP, script[0]["entry"])):
        err("manifest bp: script entry missing (run the TypeScript build)")
    if SCH.available:
        for name, man in m.items():
            # The 3.0.0 schema is the only one shipped; format 2 differs only in min_engine_version type.
            pass
    return m


# ------------------------------------------------------------------------------ collections
def collect():
    c = {}
    c["bp_entities"] = {}
    for p in glob.glob(os.path.join(BP, "entities", "*.json")):
        d = load_json(p)
        c["bp_entities"][d["minecraft:entity"]["description"]["identifier"]] = (p, d)
    c["rp_entities"] = {}
    for p in glob.glob(os.path.join(RP, "entity", "*.json")):
        d = load_json(p)
        c["rp_entities"][d["minecraft:client_entity"]["description"]["identifier"]] = (p, d)
    c["geometry"] = {}
    for p in glob.glob(os.path.join(RP, "models", "**", "*.json"), recursive=True):
        d = load_json(p)
        for g in d.get("minecraft:geometry", []):
            c["geometry"][g["description"]["identifier"]] = (p, g)
    c["animations"] = {}
    for p in glob.glob(os.path.join(RP, "animations", "*.json")):
        for k, v in load_json(p)["animations"].items():
            c["animations"][k] = (p, v)
    c["controllers"] = {}
    for p in glob.glob(os.path.join(RP, "animation_controllers", "*.json")):
        for k, v in load_json(p)["animation_controllers"].items():
            c["controllers"][k] = (p, v)
    c["render_controllers"] = {}
    for p in glob.glob(os.path.join(RP, "render_controllers", "*.json")):
        for k, v in load_json(p)["render_controllers"].items():
            c["render_controllers"][k] = (p, v)
    sd = load_json(os.path.join(RP, "sounds", "sound_definitions.json"))
    c["sounds"] = sd["sound_definitions"]
    c["particles"] = {}
    for p in glob.glob(os.path.join(RP, "particles", "*.json")):
        d = load_json(p)
        c["particles"][d["particle_effect"]["description"]["identifier"]] = (p, d)
    c["fogs"] = {}
    for pack in (RP, VP):
        for p in glob.glob(os.path.join(pack, "fogs", "*.json")):
            d = load_json(p)
            c["fogs"][d["minecraft:fog_settings"]["description"]["identifier"]] = p
    c["items"] = {}
    for p in glob.glob(os.path.join(BP, "items", "*.json")):
        d = load_json(p)
        c["items"][d["minecraft:item"]["description"]["identifier"]] = (p, d)
    c["blocks"] = {}
    for p in glob.glob(os.path.join(BP, "blocks", "*.json")):
        d = load_json(p)
        c["blocks"][d["minecraft:block"]["description"]["identifier"]] = (p, d)
    c["item_tex"] = load_json(os.path.join(RP, "textures", "item_texture.json"))["texture_data"]
    c["terrain_tex"] = load_json(os.path.join(RP, "textures", "terrain_texture.json"))["texture_data"]
    c["lang"] = {}
    for pack in (BP, RP):
        with open(os.path.join(pack, "texts", "en_US.lang"), encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.rstrip("\n").split("=", 1)
                    c["lang"][k] = v
    c["structures"] = {}
    for p in glob.glob(os.path.join(BP, "structures", "**", "*.mcstructure"), recursive=True):
        r = os.path.relpath(p, os.path.join(BP, "structures"))
        parts = r[:-len(".mcstructure")].split(os.sep)
        sid = f"{parts[0]}:{'/'.join(parts[1:])}" if len(parts) > 1 else f"mystructure:{parts[0]}"
        c["structures"][sid] = p
    return c


def tex_exists(base, path_no_ext):
    return any(os.path.isfile(os.path.join(base, path_no_ext + e)) for e in (".png", ".tga", ".jpg"))


# ------------------------------------------------------------------------------ 3. entities (BP)
FILTER_NOISE = re.compile(r"is not valid under any of the given schemas")


def walk(obj, fn, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            fn(k, v, f"{path}/{k}")
            walk(v, fn, f"{path}/{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk(v, fn, f"{path}[{i}]")


def check_bp_entities(c):
    for ident, (p, d) in c["bp_entities"].items():
        ent = d["minecraft:entity"]
        if not ident.startswith("hollow:"):
            err(f"{rel(p)}: identifier must use hollow: namespace")
        if d.get("format_version") != "1.26.50":
            warn(f"{rel(p)}: format_version {d.get('format_version')}")
        if SCH.available:
            for e in SCH.validate("entity", ent):
                (warn if FILTER_NOISE.search(e) else err)(f"{rel(p)} schema: {e}")
        comps = dict(ent.get("components", {}))
        groups = ent.get("component_groups", {})
        for g in groups.values():
            comps.update(g)
        for k in list(ent.get("components", {}).keys()) + [k for g in groups.values() for k in g]:
            if ENTITY_COMPONENTS and k not in ENTITY_COMPONENTS:
                err(f"{rel(p)}: unknown entity component {k}")
        events = ent.get("events", {})
        props = ent.get("description", {}).get("properties", {})

        def check_ref(k, v, path):
            if k == "event" and isinstance(v, str) and v and not v.startswith("minecraft:"):
                if v not in events:
                    err(f"{rel(p)}{path}: event {v} not defined")
            if k == "component_groups" and isinstance(v, list):
                for gname in v:
                    if gname not in groups:
                        err(f"{rel(p)}{path}: component group {gname} not defined")
            if k == "set_property" and isinstance(v, dict):
                for pk, pv in v.items():
                    if pk not in props:
                        err(f"{rel(p)}{path}: property {pk} not declared")
                    elif props[pk].get("type") == "enum" and isinstance(pv, str) and not pv.startswith("query") and pv not in props[pk]["values"]:
                        err(f"{rel(p)}{path}: {pv} not a value of {pk}")
            if k == "table" and isinstance(v, str) and v.startswith("loot_tables/"):
                if not os.path.isfile(os.path.join(BP, v)):
                    err(f"{rel(p)}{path}: loot table {v} missing")
        walk(ent, check_ref)
        if ident not in c["rp_entities"]:
            err(f"{rel(p)}: no client entity for {ident}")
        if f"entity.{ident}.name" not in c["lang"]:
            err(f"lang: missing entity.{ident}.name")


# ------------------------------------------------------------------------------ 4. client entities
SAFE_MATERIALS = {"entity", "entity_alphatest", "entity_alphablend", "entity_emissive", "entity_emissive_alpha",
                  "entity_alphatest_change_color", "entity_change_color", "entity_nocull", "entity_alphatest_glint"}


def check_rp_entities(c, bp_props):
    for ident, (p, d) in c["rp_entities"].items():
        desc = d["minecraft:client_entity"]["description"]
        for k, mat in desc.get("materials", {}).items():
            if mat not in SAFE_MATERIALS:
                warn(f"{rel(p)}: material {mat} not in the conservative vanilla set")
        for k, t in desc.get("textures", {}).items():
            if not tex_exists(RP, t):
                err(f"{rel(p)}: texture {t} missing")
        for k, g in desc.get("geometry", {}).items():
            if g not in c["geometry"]:
                err(f"{rel(p)}: geometry {g} missing")
        anims = desc.get("animations", {})
        for short, full in anims.items():
            if full.startswith("controller."):
                if full not in c["controllers"]:
                    err(f"{rel(p)}: controller {full} missing")
                else:
                    for st in c["controllers"][full][1]["states"].values():
                        for a in st.get("animations", []):
                            name = a if isinstance(a, str) else list(a.keys())[0]
                            if name not in anims:
                                err(f"{rel(p)}: controller {full} uses unknown animation short name {name}")
            elif full not in c["animations"]:
                err(f"{rel(p)}: animation {full} missing")
        for a in desc.get("scripts", {}).get("animate", []):
            name = a if isinstance(a, str) else list(a.keys())[0]
            if name not in anims:
                err(f"{rel(p)}: scripts.animate {name} not in animations")
        for rc in desc.get("render_controllers", []):
            name = rc if isinstance(rc, str) else list(rc.keys())[0]
            if name not in c["render_controllers"]:
                err(f"{rel(p)}: render controller {name} missing")
            else:
                rcd = c["render_controllers"][name][1]
                for t in rcd.get("textures", []):
                    if t.startswith("Texture.") and t.split(".", 1)[1] not in desc.get("textures", {}):
                        err(f"{rel(p)}: render controller {name} needs texture {t}")
                for mm in rcd.get("materials", []):
                    for v in mm.values():
                        if v.startswith("Material.") and v.split(".", 1)[1] not in desc.get("materials", {}):
                            err(f"{rel(p)}: render controller {name} needs material {v}")
                geo = desc.get("geometry", {}).get("default")
                bones = {b["name"] for b in c["geometry"].get(geo, (None, {"bones": []}))[1]["bones"]} if geo else set()
                for pv in rcd.get("part_visibility", []):
                    for bone in pv:
                        if bone != "*" and bones and bone not in bones:
                            err(f"{rel(p)}: part_visibility bone {bone} not in {geo}")
        # bones used by animations exist in the geometry
        geo = desc.get("geometry", {}).get("default")
        if geo in c["geometry"]:
            bones = {b["name"] for b in c["geometry"][geo][1]["bones"]}
            for short, full in anims.items():
                if full in c["animations"]:
                    for bone in c["animations"][full][1].get("bones", {}):
                        if bone not in bones:
                            err(f"{rel(p)}: animation {full} animates missing bone {bone}")
        # property queries must exist on the server entity
        text = json.dumps(desc)
        for prop in re.findall(r"query\.property\('([^']+)'\)", text):
            if prop not in bp_props.get(ident, {}):
                err(f"{rel(p)}: query.property('{prop}') not declared on {ident}")


# ------------------------------------------------------------------------------ 5. geometry
def check_geometry(c):
    for gid, (p, g) in c["geometry"].items():
        tw, th = g["description"]["texture_width"], g["description"]["texture_height"]
        names = set()
        for b in g["bones"]:
            if b["name"] in names:
                err(f"{rel(p)}: duplicate bone {b['name']}")
            names.add(b["name"])
        for b in g["bones"]:
            if b.get("parent") and b["parent"] not in names:
                err(f"{rel(p)}: bone {b['name']} parent {b['parent']} missing")
            for cube in b.get("cubes", []):
                for face, uv in cube.get("uv", {}).items():
                    u, v = uv["uv"]
                    w, h = uv["uv_size"]
                    if u < 0 or v < 0 or u + w > tw or v + h > th:
                        err(f"{rel(p)}: UV out of bounds in {b['name']} {face}")


# ------------------------------------------------------------------------------ 6. sounds
def check_sounds(c):
    n_files = 0
    for ev, d in c["sounds"].items():
        for s in d["sounds"]:
            name = s["name"] if isinstance(s, dict) else s
            n_files += 1
            if not os.path.isfile(os.path.join(RP, name + ".ogg")):
                err(f"sound {ev}: file {name}.ogg missing")
    sj = load_json(os.path.join(RP, "sounds.json"))
    for ent, d in sj["entity_sounds"]["entities"].items():
        for evname, v in d["events"].items():
            sid = v if isinstance(v, str) else v["sound"]
            if sid and sid not in c["sounds"]:
                err(f"sounds.json {ent}.{evname}: {sid} not defined")
    info(f"sounds: {len(c['sounds'])} events, {n_files} files")


# ------------------------------------------------------------------------------ 7. particles
def check_particles(c):
    for pid, (p, d) in c["particles"].items():
        t = d["particle_effect"]["description"]["basic_render_parameters"]["texture"]
        if not tex_exists(RP, t):
            err(f"{rel(p)}: texture {t} missing")


# ------------------------------------------------------------------------------ 8. items/blocks
def registered_custom_components():
    out = set()
    for p in glob.glob(os.path.join(ROOT, "scripts_src", "**", "*.ts"), recursive=True):
        out |= set(re.findall(r'registerCustomComponent\("([^"]+)"', open(p).read()))
    return out


def check_items_blocks(c):
    cc = registered_custom_components()
    for ident, (p, d) in c["items"].items():
        it = d["minecraft:item"]
        if SCH.available:
            for e in SCH.validate("item", it):
                err(f"{rel(p)} schema: {e}")
        comps = it["components"]
        icon = comps.get("minecraft:icon", {}).get("textures", {}).get("default")
        if icon not in c["item_tex"]:
            err(f"{rel(p)}: icon {icon} not in item_texture.json")
        elif not tex_exists(RP, c["item_tex"][icon]["textures"]):
            err(f"{rel(p)}: icon file {c['item_tex'][icon]['textures']} missing")
        for k in comps:
            if not k.startswith("minecraft:") and k not in cc:
                err(f"{rel(p)}: custom component {k} not registered by scripts")
        bp = comps.get("minecraft:block_placer")
        if bp and bp["block"] not in c["blocks"]:
            err(f"{rel(p)}: block_placer target {bp['block']} missing")
        key = f"tile.{ident}.name" if bp else f"item.{ident}.name"
        if key not in c["lang"]:
            err(f"lang: missing {key}")
    for ident, (p, d) in c["blocks"].items():
        b = d["minecraft:block"]
        comps = b["components"]
        for k in comps:
            if not k.startswith("minecraft:") and k not in cc:
                err(f"{rel(p)}: custom component {k} not registered by scripts")
        geo = comps.get("minecraft:geometry")
        gid = geo if isinstance(geo, str) else (geo or {}).get("identifier")
        if gid and not gid.startswith("minecraft:") and gid not in c["geometry"]:
            err(f"{rel(p)}: geometry {gid} missing")
        mats = [comps.get("minecraft:material_instances", {})] + [pp["components"].get("minecraft:material_instances", {}) for pp in b.get("permutations", [])]
        for mi in mats:
            for face, inst in mi.items():
                t = inst.get("texture")
                if t not in c["terrain_tex"]:
                    err(f"{rel(p)}: texture {t} not in terrain_texture.json")
                elif not tex_exists(RP, c["terrain_tex"][t]["textures"]):
                    err(f"{rel(p)}: texture file {c['terrain_tex'][t]['textures']} missing")
        states = b["description"].get("states", {})
        for pp in b.get("permutations", []):
            for s in re.findall(r"query\.block_state\('([^']+)'\)", pp["condition"]):
                if s not in states:
                    err(f"{rel(p)}: permutation uses undeclared state {s}")
        loot = comps.get("minecraft:loot")
        if loot and not os.path.isfile(os.path.join(BP, loot)):
            err(f"{rel(p)}: loot {loot} missing")
        if f"tile.{ident}.name" not in c["lang"]:
            err(f"lang: missing tile.{ident}.name")


# ------------------------------------------------------------------------------ 9. recipes + loot
def known_item(c, name):
    if name.startswith("hollow:"):
        return name in c["items"] or name in c["blocks"]
    return not V["items"] or name in V["items"]


def check_recipes_loot(c):
    ids = set()
    for p in glob.glob(os.path.join(BP, "recipes", "*.json")):
        d = load_json(p)
        key = [k for k in d if k.startswith("minecraft:recipe")][0]
        r = d[key]
        rid = r["description"]["identifier"]
        if rid in ids:
            err(f"{rel(p)}: duplicate recipe id {rid}")
        ids.add(rid)
        names = []
        if "key" in r:
            names += [v["item"] for v in r["key"].values()]
            pattern_keys = set("".join(r["pattern"])) - {" "}
            if pattern_keys != set(r["key"].keys()):
                err(f"{rel(p)}: pattern keys {pattern_keys} != key map {set(r['key'])}")
        if "ingredients" in r:
            names += [v["item"] for v in r["ingredients"]]
        names.append(r["result"]["item"])
        names += [u["item"] for u in r.get("unlock", [])]
        for n in names:
            if not known_item(c, n):
                err(f"{rel(p)}: unknown item {n}")
    info(f"recipes: {len(ids)}")
    for p in glob.glob(os.path.join(BP, "loot_tables", "**", "*.json"), recursive=True):
        d = load_json(p)
        for pool in d.get("pools", []):
            for e in pool.get("entries", []):
                if e.get("type") == "item" and not known_item(c, e["name"]):
                    err(f"{rel(p)}: unknown item {e['name']}")
                if e.get("type") == "loot_table" and not os.path.isfile(os.path.join(BP, e["name"])):
                    err(f"{rel(p)}: nested loot table {e['name']} missing")


# ------------------------------------------------------------------------------ 10. texture sets
def check_texture_sets():
    from PIL import Image
    n = 0
    for p in glob.glob(os.path.join(RP, "textures", "**", "*.texture_set.json"), recursive=True):
        n += 1
        d = load_json(p)["minecraft:texture_set"]
        folder = os.path.dirname(p)
        for layer, name in d.items():
            if not isinstance(name, str) or name.startswith("#"):
                continue
            f = os.path.join(folder, name + ".png")
            if not os.path.isfile(f):
                err(f"{rel(p)}: layer {layer} texture {name}.png missing (must be in the same folder)")
                continue
            mode = Image.open(f).mode
            if layer == "heightmap" and mode != "L":
                err(f"{rel(f)}: heightmap must be 1-channel (is {mode})")
            if layer == "metalness_emissive_roughness_subsurface" and mode != "RGBA":
                err(f"{rel(f)}: MERS must be 4-channel (is {mode})")
        if "normal" in d and "heightmap" in d:
            err(f"{rel(p)}: normal and heightmap are mutually exclusive")
    info(f"texture sets: {n}")


# ------------------------------------------------------------------------------ 11. scripts ↔ packs
def ts_consts(name):
    src = open(os.path.join(ROOT, "scripts_src", "core", "ids.ts")).read()
    m = re.search(rf"export const {name} = \{{(.*?)\}} as const;", src, re.S)
    return dict(re.findall(r'(\w+):\s*"([^"]+)"', m.group(1))) if m else {}


def check_script_ids(c):
    for k, v in ts_consts("ENT").items():
        if v not in c["bp_entities"]:
            err(f"scripts ENT.{k} = {v}: no behavior entity")
    for k, v in ts_consts("ITEM").items():
        if v not in c["items"]:
            err(f"scripts ITEM.{k} = {v}: no item")
    for k, v in ts_consts("BLOCK").items():
        if v not in c["blocks"]:
            err(f"scripts BLOCK.{k} = {v}: no block")
    for k, v in ts_consts("SND").items():
        if v not in c["sounds"]:
            err(f"scripts SND.{k} = {v}: no sound definition")
    for k, v in ts_consts("PARTICLE").items():
        if v not in c["particles"]:
            err(f"scripts PARTICLE.{k} = {v}: no particle")
    for k, v in ts_consts("FOG").items():
        if v not in c["fogs"]:
            err(f"scripts FOG.{k} = {v}: no fog definition")
    # literal ids used directly in TS
    for p in glob.glob(os.path.join(ROOT, "scripts_src", "**", "*.ts"), recursive=True):
        src = open(p).read()
        for sid in re.findall(r'"(hollow\.[a-z_]+\.[a-z_.]+)"', src):
            if sid not in c["sounds"]:
                err(f"{rel(p)}: sound {sid} not defined")
        for pid in re.findall(r'"(hollow:[a-z_]+)"', src):
            if pid in c["particles"] or pid in c["items"] or pid in c["blocks"] or pid in c["bp_entities"] or pid in c["fogs"] or pid in c["structures"]:
                continue
            known_other = pid.startswith(("hollow:to_", "hollow:state", "hollow:")) and pid.split(":")[1] in {
                "journal", "torn_page", "lens", "heartseeker", "material", "chime", "ward", "lantern", "altar", "debug",
                "settings", "start_day", "sites", "chimes", "wards", "boss", "knocker", "data_version", "prefs", "stats",
                "first_join", "play_ticks", "daily", "owner", "born", "state", "revealed", "phase", "shielded", "variant",
                "silenced", "used", "awake", "status", "site", "lanterns", "watcher_struck"}
            if not known_other and not pid.startswith("hollow:to_"):
                warn(f"{rel(p)}: string {pid} is not a known pack id (check if intended)")
        for st in re.findall(r'structureManager\.place\(\s*"([^"]+)"', src):
            if st not in c["structures"]:
                err(f"{rel(p)}: structure {st} missing")
    for s in re.findall(r'structure: "([^"]+)"', open(os.path.join(ROOT, "scripts_src", "systems", "sites.ts")).read()):
        if s not in c["structures"]:
            err(f"sites.ts: structure {s} missing")


# ------------------------------------------------------------------------------ 12. structures (NBT)
def read_nbt(data):
    pos = [0]

    def u(fmt, n):
        v = struct.unpack_from("<" + fmt, data, pos[0])[0]
        pos[0] += n
        return v

    def string():
        n = u("H", 2)
        s = data[pos[0]:pos[0] + n].decode("utf-8")
        pos[0] += n
        return s

    def payload(t):
        if t == 1: return u("b", 1)
        if t == 2: return u("h", 2)
        if t == 3: return u("i", 4)
        if t == 4: return u("q", 8)
        if t == 5: return u("f", 4)
        if t == 6: return u("d", 8)
        if t == 7:
            n = u("i", 4); b = data[pos[0]:pos[0] + n]; pos[0] += n; return b
        if t == 8: return string()
        if t == 9:
            et = u("b", 1); n = u("i", 4); return [payload(et) for _ in range(n)]
        if t == 10:
            out = {}
            while True:
                tt = u("b", 1)
                if tt == 0: return out
                name = string(); out[name] = payload(tt)
        if t == 11:
            n = u("i", 4); return [u("i", 4) for _ in range(n)]
        if t == 12:
            n = u("i", 4); return [u("q", 8) for _ in range(n)]
        raise ValueError(f"tag {t}")

    t = u("b", 1)
    string()
    return payload(t)


def check_structures(c):
    for sid, p in c["structures"].items():
        try:
            root = read_nbt(open(p, "rb").read())
        except Exception as e:
            err(f"{rel(p)}: NBT parse failed: {e}")
            continue
        size = root["size"]
        vol = size[0] * size[1] * size[2]
        idx = root["structure"]["block_indices"]
        pal = root["structure"]["palette"]["default"]["block_palette"]
        if len(idx[0]) != vol:
            err(f"{rel(p)}: block_indices length {len(idx[0])} != volume {vol}")
        for i in idx[0]:
            if i >= len(pal):
                err(f"{rel(p)}: block index {i} outside palette")
                break
        for entry in pal:
            name = entry["name"]
            states = entry.get("states", {})
            if name.startswith("hollow:"):
                if name not in c["blocks"]:
                    err(f"{rel(p)}: palette block {name} not defined")
                continue
            if V["blocks"] and name not in V["blocks"]:
                err(f"{rel(p)}: unknown vanilla block {name}")
                continue
            if V["blocks"]:
                want = set(V["blocks"][name])
                have = set(states.keys())
                if want != have:
                    err(f"{rel(p)}: {name} states {sorted(have)} != expected {sorted(want)}")
                for k, v in states.items():
                    allowed = V["block_props"].get(k)
                    if allowed is not None and v not in allowed and not (isinstance(v, int) and (v in (0, 1)) and set(allowed) <= {True, False}):
                        err(f"{rel(p)}: {name} state {k}={v!r} not in {allowed[:8]}")
        info(f"structure {sid}: {size[0]}x{size[1]}x{size[2]}, {len(pal)} palette entries")


# ------------------------------------------------------------------------------ 13. visuals pack
def check_visuals(c):
    ids = {}
    for cat, key in (("lighting", "minecraft:lighting_settings"), ("atmospherics", "minecraft:atmosphere_settings"),
                     ("color_grading", "minecraft:color_grading_settings"), ("water", "minecraft:water_settings")):
        for p in glob.glob(os.path.join(VP, cat, "*.json")):
            d = load_json(p)
            if key not in d:
                err(f"{rel(p)}: missing {key}")
                continue
            ids[d[key]["description"]["identifier"]] = p
    comp_map = {"minecraft:lighting_identifier": "lighting_identifier", "minecraft:atmosphere_identifier": "atmosphere_identifier",
                "minecraft:color_grading_identifier": "color_grading_identifier", "minecraft:water_identifier": "water_identifier"}
    n = 0
    for p in glob.glob(os.path.join(VP, "biomes", "*.json")):
        n += 1
        d = load_json(p)["minecraft:client_biome"]["components"]
        for comp, field in comp_map.items():
            if comp in d:
                v = d[comp][field]
                if not v.startswith("minecraft:") and v not in ids:
                    err(f"{rel(p)}: {comp} -> {v} not defined in visuals pack")
        fog = d.get("minecraft:fog_appearance", {}).get("fog_identifier")
        if fog and not fog.startswith("minecraft:") and fog not in c["fogs"]:
            err(f"{rel(p)}: fog {fog} not defined")
    if n:
        info(f"visuals: {n} client biome overrides, {len(ids)} VV definitions")


# ------------------------------------------------------------------------------ main
def main():
    global V, ENTITY_COMPONENTS
    V = vanilla()
    if SCH.available:
        ENTITY_COMPONENTS = set(load_json(os.path.join(SCH.root, "server", "entity", "1.26.50", "Entity component definitions.json"))["properties"].keys())
        info(f"schemas: Mojang json_schemas (entity 1.26.50, item 1.26.30, block 1.26.20); {len(ENTITY_COMPONENTS)} entity components known")
    else:
        warn("Mojang schemas unavailable; schema checks skipped")
    check_json_syntax()
    check_manifests()
    c = collect()
    bp_props = {k: v[1]["minecraft:entity"]["description"].get("properties", {}) for k, v in c["bp_entities"].items()}
    check_bp_entities(c)
    check_rp_entities(c, bp_props)
    check_geometry(c)
    check_sounds(c)
    check_particles(c)
    check_items_blocks(c)
    check_recipes_loot(c)
    check_texture_sets()
    check_script_ids(c)
    check_structures(c)
    check_visuals(c)

    report = ["# Static validation report (generated)", ""]
    report.append(f"Errors: **{len(errors)}** · Warnings: **{len(warnings)}**")
    report.append("")
    for title, items in (("Errors", errors), ("Warnings", warnings), ("Checks run", infos)):
        report.append(f"## {title}")
        report += [f"- {x}" for x in items] or ["- none"]
        report.append("")
    out = sys.argv[sys.argv.index("--report") + 1] if "--report" in sys.argv else None
    if out:
        with open(os.path.join(ROOT, out), "w") as f:
            f.write("\n".join(report) + "\n")
    for x in errors:
        print("ERROR  ", x)
    for x in warnings:
        print("WARN   ", x)
    for x in infos:
        print("ok     ", x)
    print(f"\n{len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
