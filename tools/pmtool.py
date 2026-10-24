#!/usr/bin/env python3
"""pmtool - Port Marlowe Bedrock pack pipeline.

Assembles the first-party packs in packs/ with sourced assets from assets/ and
vendor packs from vendor/, validates everything against the Bedrock rules the
engine enforces, generates the per-biome Vibrant Visuals remaps from Mojang's
vanilla reference files, and packages a Realm-ready .mcworld.

Run `python3 tools/pmtool.py --help` for the command list. Requires Python 3.9+,
Pillow for image checks/imports, and ffmpeg (with libvorbis) for audio imports.
"""
from __future__ import annotations

import argparse
import copy
import fnmatch
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGE_EXTS = (".tga", ".png", ".jpg", ".jpeg")  # engine lookup priority
AUDIO_EXTS = (".ogg", ".wav", ".fsb")
MAX_FOLDER_NAME = 10  # Xbox path-length limit for world pack folders
SPECIES = ("cow", "chicken", "pig", "sheep")


# --------------------------------------------------------------------------
# JSON (Bedrock tolerates // and /* */ comments and trailing commas)
# --------------------------------------------------------------------------

def _strip_json_extensions(text: str) -> str:
    out = []
    i, n = 0, len(text)
    in_str = False
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            out.append(c)
            i += 1
        elif text.startswith("//", i):
            while i < n and text[i] != "\n":
                i += 1
        elif text.startswith("/*", i):
            end = text.find("*/", i + 2)
            i = n if end < 0 else end + 2
        else:
            out.append(c)
            i += 1
    stripped = "".join(out)
    return re.sub(r",(\s*[}\]])", r"\1", stripped)


def load_json(path: Path):
    text = Path(path).read_text(encoding="utf-8-sig")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return json.loads(_strip_json_extensions(text))


def dump_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2) + "\n", encoding="utf-8")


def version_tuple(v) -> tuple:
    if isinstance(v, (list, tuple)):
        return tuple(int(x) for x in v)
    return tuple(int(x) for x in re.findall(r"\d+", str(v)))


# --------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------

class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, msg: str) -> None:
        self.errors.append(msg)
        print(f"  ERROR   {msg}")

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)
        print(f"  warn    {msg}")

    @staticmethod
    def info(msg: str) -> None:
        print(f"  info    {msg}")

    def summary(self, title: str) -> bool:
        print(f"\n{title}: {len(self.errors)} error(s), {len(self.warnings)} warning(s)")
        return not self.errors


# --------------------------------------------------------------------------
# Config, vanilla reference files
# --------------------------------------------------------------------------

def load_config() -> dict:
    return load_json(ROOT / "config" / "build.json")


def vanilla_root(cfg: dict, override: str | None = None) -> Path:
    if override:
        return Path(override).resolve()
    if os.environ.get("PM_VANILLA"):
        return Path(os.environ["PM_VANILLA"]).resolve()
    return (ROOT / cfg["vanilla_samples"]["path"]).resolve()


def require_vanilla(path: Path) -> Path:
    rp = path / "resource_pack"
    if not (rp / "biomes").is_dir() or not (rp / "animations").is_dir():
        sys.exit(f"Vanilla reference files not found at {path}.\n"
                 f"Run: python3 tools/pmtool.py fetch-vanilla")
    return rp


class Vanilla:
    """Lazy access to Mojang's bedrock-samples resource pack."""

    def __init__(self, rp: Path) -> None:
        self.rp = rp
        self._anims = None
        self._defs = None
        self._controllers = None

    def animations(self) -> dict:
        if self._anims is None:
            self._anims = collect_animations(self.rp)
        return self._anims

    def sound_definitions(self) -> dict:
        if self._defs is None:
            path = self.rp / "sounds" / "sound_definitions.json"
            self._defs = load_json(path).get("sound_definitions", {}) if path.exists() else {}
        return self._defs

    def render_controllers(self) -> dict:
        if self._controllers is None:
            self._controllers = collect_render_controllers(self.rp)
        return self._controllers


def cmd_fetch_vanilla(args, cfg) -> int:
    dest = vanilla_root(cfg, args.vanilla)
    ref = args.ref or cfg["vanilla_samples"]["ref"]
    if dest.exists():
        print(f"{dest} already exists; delete it to re-fetch.")
        return 0
    dest.parent.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, GIT_LFS_SKIP_SMUDGE="1")
    run = lambda *c: subprocess.run(c, check=True, env=env)
    run("git", "clone", "--depth", "1", "--branch", ref, "--filter=blob:none", "--sparse",
        cfg["vanilla_samples"]["url"], str(dest))
    run("git", "-C", str(dest), "sparse-checkout", "set", "--no-cone",
        "/resource_pack/animations/", "/resource_pack/animation_controllers/",
        "/resource_pack/biomes/", "/resource_pack/color_grading/", "/resource_pack/entity/",
        "/resource_pack/render_controllers/", "/resource_pack/models/entity/",
        "/resource_pack/sounds.json", "/resource_pack/sounds/sound_definitions.json",
        "/resource_pack/blocks.json", "/version.json")
    print(f"Fetched bedrock-samples {ref} into {dest}")
    return 0


# --------------------------------------------------------------------------
# Images
# --------------------------------------------------------------------------

def pil():
    try:
        from PIL import Image  # noqa: WPS433
        return Image
    except ImportError:
        sys.exit("Pillow is required: python3 -m pip install Pillow")


def find_image(directory: Path, stem: str) -> Path | None:
    for ext in IMAGE_EXTS:
        p = directory / f"{stem}{ext}"
        if p.exists():
            return p
    return None


def image_channels(img) -> int:
    return {"L": 1, "P": 3, "RGB": 3, "RGBA": 4, "LA": 2, "I;16": 1, "I": 1}.get(img.mode, len(img.getbands()))


def is_pow2(n: int) -> bool:
    return n > 0 and (n & (n - 1)) == 0


# --------------------------------------------------------------------------
# Geometry, animations, render controllers
# --------------------------------------------------------------------------

def iter_geometries(doc: dict):
    """Yield (identifier, description, bones) for new (1.12+) and legacy geometry files."""
    if isinstance(doc.get("minecraft:geometry"), list):
        for g in doc["minecraft:geometry"]:
            desc = g.get("description", {})
            yield desc.get("identifier"), desc, g.get("bones", [])
        return
    for key, g in doc.items():
        if key.startswith("geometry.") and isinstance(g, dict):
            desc = {
                "identifier": key.split(":")[0],
                "texture_width": g.get("texturewidth"),
                "texture_height": g.get("textureheight"),
                "_legacy_parent": key.split(":")[1] if ":" in key else None,
            }
            yield desc["identifier"], desc, g.get("bones", [])


def collect_geometry(pack: Path) -> dict:
    found = {}
    models = pack / "models"
    if models.is_dir():
        for f in sorted(models.rglob("*.json")):
            try:
                doc = load_json(f)
            except (ValueError, OSError):
                continue
            for ident, desc, bones in iter_geometries(doc):
                if ident:
                    found[ident] = {"file": f, "desc": desc, "bones": bones}
    return found


def geometry_bbox(bones: list) -> tuple | None:
    lo = [float("inf")] * 3
    hi = [float("-inf")] * 3
    for b in bones:
        for cube in b.get("cubes", []) or []:
            o, s = cube.get("origin"), cube.get("size")
            if not o or not s:
                continue
            for i in range(3):
                lo[i] = min(lo[i], o[i], o[i] + s[i])
                hi[i] = max(hi[i], o[i], o[i] + s[i])
    return None if lo[0] == float("inf") else (lo, hi)


def collect_animations(pack: Path) -> dict:
    """Map animation id -> set of bone names it drives (controllers map to empty sets)."""
    out = {}
    for sub, key in (("animations", "animations"), ("animation_controllers", "animation_controllers")):
        d = pack / sub
        if not d.is_dir():
            continue
        for f in sorted(d.rglob("*.json")):
            try:
                doc = load_json(f)
            except (ValueError, OSError):
                continue
            for ident, body in (doc.get(key) or {}).items():
                bones = set((body or {}).get("bones", {}).keys()) if key == "animations" else set()
                out[ident] = bones
    return out


def collect_render_controllers(pack: Path) -> dict:
    out = {}
    d = pack / "render_controllers"
    if d.is_dir():
        for f in sorted(d.rglob("*.json")):
            try:
                doc = load_json(f)
            except (ValueError, OSError):
                continue
            out.update(doc.get("render_controllers") or {})
    return out


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------

def validate_manifest(pack: Path, cfg: dict, report: Report, folder_name: str | None = None) -> dict | None:
    mf = pack / "manifest.json"
    name = folder_name or pack.name
    if not mf.exists():
        report.error(f"{name}: manifest.json missing at pack root")
        return None
    try:
        m = load_json(mf)
    except ValueError as e:
        report.error(f"{name}: manifest.json is not valid JSON ({e})")
        return None
    h = m.get("header", {})
    for field in ("name", "uuid", "version", "min_engine_version"):
        if field not in h:
            report.error(f"{name}: header.{field} missing")
    if m.get("format_version") not in (2, 3):
        report.warn(f"{name}: manifest format_version {m.get('format_version')} (expected 2)")
    if not re.fullmatch(r"[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}", str(h.get("uuid", ""))):
        report.error(f"{name}: header.uuid is not a valid UUID")
    if not m.get("modules"):
        report.error(f"{name}: no modules declared")
    for mod in m.get("modules", []):
        if mod.get("type") != "resources":
            report.error(f"{name}: module type '{mod.get('type')}' (world resource stack expects 'resources')")
    caps = m.get("capabilities", [])
    if not ({"pbr", "raytraced"} & set(caps)):
        report.warn(f"{name}: no 'pbr'/'raytraced' capability; a non-PBR pack in the stack can keep "
                    f"players from enabling Vibrant Visuals")
    if h.get("min_engine_version") and version_tuple(h["min_engine_version"]) > version_tuple(cfg["target_engine_version"]):
        report.error(f"{name}: min_engine_version {h['min_engine_version']} is newer than the Realm target "
                     f"{cfg['target_engine_version']}; clients will reject the pack")
    if h.get("pack_scope") == "global":
        report.error(f"{name}: pack_scope 'global' packs cannot be applied to a world")
    if len(name) > MAX_FOLDER_NAME:
        report.error(f"{name}: folder name longer than {MAX_FOLDER_NAME} characters (Xbox path limit)")
    return m


def manifest_ids(m: dict) -> list:
    ids = [m["header"]["uuid"].lower()]
    ids += [mod.get("uuid", "").lower() for mod in m.get("modules", [])]
    return ids


def validate_texture_set(ts: Path, report: Report, pack: Path) -> list:
    """Validate one *.texture_set.json; returns the image paths it references."""
    rel = ts.relative_to(pack)
    try:
        doc = load_json(ts)
    except ValueError as e:
        report.error(f"{rel}: invalid JSON ({e})")
        return []
    body = doc.get("minecraft:texture_set")
    if not isinstance(body, dict):
        report.error(f"{rel}: missing minecraft:texture_set object")
        return []
    if "color" not in body:
        report.error(f"{rel}: color layer is required")
    if "normal" in body and "heightmap" in body:
        report.error(f"{rel}: normal and heightmap cannot both be defined")
    mer, mers = "metalness_emissive_roughness", "metalness_emissive_roughness_subsurface"
    if mer in body and mers in body:
        report.error(f"{rel}: MER and MERS layers cannot both be defined")
    if mers in body and version_tuple(doc.get("format_version", "0")) < (1, 21, 30):
        report.error(f"{rel}: MERS layer needs format_version 1.21.30+")
    expected = {"color": (3, 4), mer: (3, 4), mers: (4,), "normal": (3, 4), "heightmap": (1,)}
    uniform_len = {"color": 4, mer: 3, mers: 4, "heightmap": 1}
    images = []
    dims = {}
    Image = None
    for layer, value in body.items():
        if layer not in expected:
            report.warn(f"{rel}: unknown layer '{layer}'")
            continue
        if isinstance(value, list):
            if layer == mers:
                report.warn(f"{rel}: uniform MERS values do not support texture variations; prefer an image")
            if len(value) != uniform_len.get(layer, len(value)):
                report.error(f"{rel}: uniform {layer} needs {uniform_len[layer]} values")
            continue
        if isinstance(value, str) and value.startswith("#"):
            continue
        img = find_image(ts.parent, value)
        if img is None:
            report.error(f"{rel}: {layer} image '{value}' not found next to the texture set")
            continue
        images.append(img)
        Image = Image or pil()
        with Image.open(img) as im:
            ch = image_channels(im)
            dims[layer] = im.size
            if ch not in expected[layer]:
                report.error(f"{rel}: {layer} '{img.name}' has {ch} channel(s); expected {expected[layer]}")
            if not (is_pow2(im.size[0]) and is_pow2(im.size[1])):
                report.warn(f"{rel}: {img.name} is {im.size[0]}x{im.size[1]} (not power-of-two)")
    if "color" in dims:
        for layer, size in dims.items():
            if size != dims["color"]:
                report.warn(f"{rel}: {layer} is {size} but color is {dims['color']}; author layers at one resolution")
    return images


def required_entity_assets(entity_file: Path, pack: Path) -> tuple:
    """Return (description, missing_textures, missing_geometries) for a client entity file."""
    desc = load_json(entity_file)["minecraft:client_entity"]["description"]
    geos = collect_geometry(pack)
    missing_tex = []
    for path in (desc.get("textures") or {}).values():
        p = pack / path
        layers = [p.name]
        ts = p.parent / f"{p.name}.texture_set.json"
        if ts.exists():
            body = load_json(ts).get("minecraft:texture_set", {})
            layers += [v for k, v in body.items() if k != "color" and isinstance(v, str) and not v.startswith("#")]
        for layer in layers:
            if find_image(p.parent, layer) is None:
                missing_tex.append(f"{Path(path).parent.as_posix()}/{layer}")
    missing_geo = [g for g in (desc.get("geometry") or {}).values() if g not in geos]
    return desc, missing_tex, missing_geo


def validate_entity(entity_file: Path, pack: Path, report: Report, vanilla: Vanilla,
                    sound_defs: dict) -> None:
    rel = entity_file.relative_to(pack)
    desc, missing_tex, missing_geo = required_entity_assets(entity_file, pack)
    for t in missing_tex:
        report.error(f"{rel}: texture '{t}' not found")
    for g in missing_geo:
        report.error(f"{rel}: geometry '{g}' not defined in models/")
    geos = collect_geometry(pack)
    anims = dict(vanilla.animations())
    anims.update(collect_animations(pack))
    needed_bones = set()
    for short, anim_id in (desc.get("animations") or {}).items():
        if anim_id not in anims:
            report.error(f"{rel}: animation '{anim_id}' ({short}) not found in pack or vanilla")
            continue
        needed_bones |= anims[anim_id]
    for key, gid in (desc.get("geometry") or {}).items():
        g = geos.get(gid)
        if not g:
            continue
        names = {b.get("name") for b in g["bones"]}
        missing = sorted(needed_bones - names)
        if missing:
            report.error(f"{rel}: geometry '{gid}' lacks bones {missing} driven by its animations; rename the "
                         f"bones or point 'animations' at the model's own animation file")
        if g["desc"].get("_legacy_parent"):
            report.error(f"{rel}: geometry '{gid}' uses legacy inheritance; flatten it in Blockbench")
    # Render controller references must resolve against this entity's maps.
    controllers = dict(vanilla.render_controllers())
    controllers.update(collect_render_controllers(pack))
    maps = {"Texture": desc.get("textures") or {}, "Geometry": desc.get("geometry") or {},
            "Material": desc.get("materials") or {}}
    for cid in desc.get("render_controllers") or []:
        cid = cid if isinstance(cid, str) else next(iter(cid))
        body = controllers.get(cid)
        if body is None:
            report.error(f"{rel}: render controller '{cid}' not found")
            continue
        for kind, key in set(re.findall(r"\b(Texture|Geometry|Material)\.([A-Za-z0-9_]+)", json.dumps(body))):
            if key not in maps[kind]:
                report.error(f"{rel}: {cid} references {kind}.{key}, which this entity does not define")
    for short, sound in (desc.get("sound_effects") or {}).items():
        if sound not in sound_defs and sound not in vanilla.sound_definitions():
            report.error(f"{rel}: sound effect '{short}' -> '{sound}' has no sound definition")
    check_species_specifics(desc, pack, geos, report, rel)


def check_species_specifics(desc: dict, pack: Path, geos: dict, report: Report, rel) -> None:
    ident = desc.get("identifier", "")
    geo_map = desc.get("geometry") or {}
    # Baby geometry is rendered at scale 2.0 to cancel the behavior pack's minecraft:scale 0.5,
    # so it must be authored at its final on-screen size.
    baby = geos.get(geo_map.get("baby", ""))
    adults = [geos[g] for k, g in geo_map.items() if k not in ("baby", "sheared") and g in geos]
    if baby and adults:
        bb, ab = geometry_bbox(baby["bones"]), geometry_bbox(adults[0]["bones"])
        if bb and ab:
            ratio = (bb[1][1] - bb[0][1]) / max(1e-6, ab[1][1] - ab[0][1])
            if ratio > 0.75:
                report.warn(f"{rel}: baby geometry is {ratio:.0%} of adult height; vanilla renders babies at "
                            f"scale 2.0 x 0.5, so author the baby at its final size or it will look oversized")
    # Texture aspect must match the UV space of a geometry of the same age class.
    Image = None
    ratios = {True: set(), False: set()}
    for key, gid in geo_map.items():
        g = geos.get(gid)
        if g and g["desc"].get("texture_width") and g["desc"].get("texture_height"):
            ratios[key == "baby"].add(round(g["desc"]["texture_width"] / g["desc"]["texture_height"], 3))
    for tkey, tpath in (desc.get("textures") or {}).items():
        p = pack / tpath
        img = find_image(p.parent, p.name)
        candidates = ratios[tkey.startswith("baby")]
        if img is None or not candidates:
            continue
        Image = Image or pil()
        with Image.open(img) as im:
            if round(im.size[0] / im.size[1], 3) not in candidates:
                report.warn(f"{rel}: {img.name} is {im.size[0]}x{im.size[1]}, which matches no "
                            f"{'baby' if tkey.startswith('baby') else 'adult'} geometry UV aspect {sorted(candidates)}")
    if ident == "minecraft:sheep":
        Image = Image or pil()
        for tpath in (desc.get("textures") or {}).values():
            p = pack / tpath
            img = find_image(p.parent, p.name)
            if img is None:
                continue
            with Image.open(img) as im:
                if im.mode != "RGBA":
                    report.error(f"{rel}: {img.name} needs an alpha channel; the sheep material uses it as the "
                                 f"wool dye mask (vanilla: wool alpha 255, skin alpha 3, unused 0)")
                    continue
                alphas = {a for a, count in enumerate(im.getchannel("A").histogram()) if count}
                if 255 not in alphas:
                    report.warn(f"{rel}: {img.name} has no alpha-255 texels; no part will take the wool dye color")
                if not any(0 < a < 255 for a in alphas):
                    report.warn(f"{rel}: {img.name} has no low-alpha skin texels; the face and legs will be dyed too")
            if img.suffix != ".tga":
                report.warn(f"{rel}: {img.name}: save sheep albedo as .tga like vanilla so editors keep RGB under low alpha")


def iter_sound_entries(defn: dict):
    for i, s in enumerate(defn.get("sounds", [])):
        yield i, (s if isinstance(s, str) else s.get("name")), s


def sound_file(pack: Path, name: str) -> Path | None:
    for ext in AUDIO_EXTS:
        p = pack / f"{name}{ext}"
        if p.exists():
            return p
    return None


def ffprobe_channels(path: Path) -> int | None:
    if not shutil.which("ffprobe"):
        return None
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
                        "stream=channels", "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    try:
        return int(r.stdout.strip())
    except ValueError:
        return None


def validate_audio(pack: Path, report: Report, vanilla: Vanilla) -> dict:
    defs_path = pack / "sounds" / "sound_definitions.json"
    defs = load_json(defs_path).get("sound_definitions", {}) if defs_path.exists() else {}
    for key, d in defs.items():
        if d.get("category") is None:
            report.warn(f"sound_definitions: {key} has no category (defaults to 'neutral' volume slider)")
        for _, name, raw in iter_sound_entries(d):
            f = sound_file(pack, name)
            if f is None:
                report.error(f"sound_definitions: {key} -> {name} has no .ogg/.wav file")
                continue
            is3d = raw.get("is3D", True) if isinstance(raw, dict) else True
            if is3d and f.suffix == ".ogg" and ffprobe_channels(f) not in (None, 1):
                report.warn(f"sound_definitions: {name}.ogg is stereo; positional (is3D) sounds should be mono")
    known = set(defs) | set(vanilla.sound_definitions())
    sj = pack / "sounds.json"
    if sj.exists():
        doc = load_json(sj)
        for ent, body in (doc.get("entity_sounds", {}).get("entities") or {}).items():
            for where, event, value in iter_entity_events(body):
                name = value if isinstance(value, str) else (value or {}).get("sound", "")
                if name and name not in known:
                    report.error(f"sounds.json: {ent}{where}.{event} -> '{name}' is not defined")
        for key, value in (doc.get("individual_named_sounds", {}).get("sounds") or {}).items():
            if value.get("sound") not in known:
                report.error(f"sounds.json: named sound {key} -> '{value.get('sound')}' is not defined")
    return defs


def iter_entity_events(body: dict):
    for event, value in (body.get("events") or {}).items():
        yield "", event, value
    for variant, vbody in ((body.get("variants") or {}).get("map") or {}).items():
        for event, value in (vbody.get("events") or {}).items():
            yield f"[{variant}]", event, value


def validate_pack(pack: Path, cfg: dict, report: Report, vanilla: Vanilla, stack_sound_defs: dict,
                  folder_name: str | None = None) -> dict | None:
    m = validate_manifest(pack, cfg, report, folder_name)
    for f in pack.rglob("*.json"):
        try:
            load_json(f)
        except ValueError as e:
            report.error(f"{f.relative_to(pack)}: invalid JSON ({e})")
    for f in pack.rglob("*"):
        if f.is_file() and (" " in f.name or f.name != f.name.lower()) and f.suffix.lower() in IMAGE_EXTS + AUDIO_EXTS:
            report.warn(f"{f.relative_to(pack)}: use lowercase names without spaces (Android/iOS paths are case-sensitive)")
    for ts in sorted(pack.rglob("*.texture_set.json")):
        validate_texture_set(ts, report, pack)
    entity_dir = pack / "entity"
    if entity_dir.is_dir():
        for ef in sorted(entity_dir.glob("*.json")):
            validate_entity(ef, pack, report, vanilla, stack_sound_defs)
    if (pack / "sounds" / "sound_definitions.json").exists() or (pack / "sounds.json").exists():
        validate_audio(pack, report, vanilla)
    return m


def cmd_validate(args, cfg) -> int:
    """Validate the source packs in place (assets overlaid in a temp copy)."""
    vanilla = Vanilla(require_vanilla(vanilla_root(cfg, args.vanilla)))
    report = Report()
    with tempfile.TemporaryDirectory() as tmp:
        staged = {}
        for key, spec in cfg["packs"].items():
            dest = Path(tmp) / spec["folder"]
            stage_pack(ROOT / spec["source"], ROOT / spec["assets"], dest)
            staged[key] = dest
        defs = {}
        audio = staged.get("pm_audio")
        if audio and (audio / "sounds" / "sound_definitions.json").exists():
            defs = load_json(audio / "sounds" / "sound_definitions.json")["sound_definitions"]
        for key, dest in staged.items():
            print(f"\n[{key}]")
            validate_pack(dest, cfg, report, vanilla, defs)
    return 0 if report.summary("validate (strict: every slot must be filled)") else 1


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------

def stage_pack(source: Path, assets: Path, dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(source, dest, ignore=shutil.ignore_patterns(".gitkeep", ".DS_Store"))
    if assets.is_dir():
        for f in assets.rglob("*"):
            if f.is_file() and f.name != ".gitkeep":
                target = dest / f.relative_to(assets)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, target)


def prune_fauna(pack: Path, report: Report) -> list:
    """Drop any species whose assets are incomplete so the vanilla mob is used instead."""
    shipped = []
    for ef in sorted((pack / "entity").glob("*.json")):
        desc, missing_tex, missing_geo = required_entity_assets(ef, pack)
        species = desc["identifier"].split(":")[1]
        if missing_tex or missing_geo:
            report.warn(f"fauna/{species}: SKIPPED, vanilla {species} stays "
                        f"({len(missing_tex)} texture layer(s), {len(missing_geo)} geometry(ies) missing; "
                        f"run `pmtool status` for the list)")
            ef.unlink()
            shutil.rmtree(pack / "textures" / "entity" / "pm" / species, ignore_errors=True)
            for gid in (desc.get("geometry") or {}).values():
                g = collect_geometry(pack).get(gid)
                if g:
                    g["file"].unlink()
        else:
            shipped.append(species)
            Report.info(f"fauna/{species}: shipped")
    # Texture sets whose images are absent would log CONTENT_ERROR in game.
    for ts in pack.rglob("*.texture_set.json"):
        body = load_json(ts).get("minecraft:texture_set", {})
        refs = [v for v in body.values() if isinstance(v, str) and not v.startswith("#")]
        if any(find_image(ts.parent, r) is None for r in refs):
            ts.unlink()
    return shipped


def strip_rooster(pack: Path) -> None:
    ef = pack / "entity" / "chicken.entity.json"
    if not ef.exists():
        return
    doc = load_json(ef)
    desc = doc["minecraft:client_entity"]["description"]
    desc.pop("sound_effects", None)
    for key in ("rooster_tick", "rooster_crow", "rooster_rest", "rooster_controller"):
        desc["animations"].pop(key, None)
    desc["scripts"]["animate"] = [a for a in desc["scripts"]["animate"]
                                  if a != "rooster_controller" and not (isinstance(a, dict) and "rooster_controller" in a)]
    desc["scripts"].pop("should_update_effects_offscreen", None)
    dump_json(ef, doc)


def prune_audio(pack: Path, cfg: dict, report: Report, vanilla: Vanilla) -> set:
    """Remove pool entries and definitions without files; repoint sounds.json events. Returns live definitions."""
    defs_path = pack / "sounds" / "sound_definitions.json"
    doc = load_json(defs_path)
    defs = doc["sound_definitions"]
    pruned = set()
    for key in list(defs):
        kept = [raw for _, name, raw in iter_sound_entries(defs[key]) if sound_file(pack, name)]
        total = len(defs[key].get("sounds", []))
        if not kept:
            pruned.add(key)
            del defs[key]
        elif len(kept) < total:
            defs[key]["sounds"] = kept
            report.warn(f"audio/{key}: {len(kept)}/{total} pool files present; pool shortened")
    if pruned:
        report.warn(f"audio: {len(pruned)} definition(s) have no files and keep vanilla/fallback sound: "
                    f"{', '.join(sorted(pruned))}")
    dump_json(defs_path, doc)

    vanilla_defs = vanilla.sound_definitions()
    fallbacks = cfg.get("sound_fallbacks", {})
    sj = pack / "sounds.json"
    sounds = load_json(sj)
    entities = sounds.get("entity_sounds", {}).get("entities") or {}
    for ent in list(entities):
        names = {v if isinstance(v, str) else (v or {}).get("sound") for _, _, v in iter_entity_events(entities[ent])}
        if not names & set(defs):
            del entities[ent]  # no recordings for this mob: keep vanilla's wiring untouched
            report.warn(f"audio/{ent}: no recordings shipped; vanilla sounds.json entry kept")
    for body in entities.values():
        containers = [body.get("events") or {}]
        containers += [v.get("events") or {} for v in ((body.get("variants") or {}).get("map") or {}).values()]
        for events in containers:
            for event in list(events):
                value = events[event]
                name = value if isinstance(value, str) else (value or {}).get("sound", "")
                if name not in pruned or name in vanilla_defs:
                    continue
                if name in fallbacks:
                    events[event] = copy.deepcopy(fallbacks[name])
                else:
                    del events[event]
    named = sounds.get("individual_named_sounds", {}).get("sounds") or {}
    for key in list(named):
        if named[key].get("sound") in pruned:
            del named[key]
    dump_json(sj, sounds)
    return set(defs)


def convert_fauna_to_mer(pack: Path, report: Report) -> None:
    """RTX-first mode: rewrite MERS texture sets to 1.16.100 MER (RTX ignores the subsurface layer)."""
    Image = pil()
    for ts in pack.rglob("*.texture_set.json"):
        doc = load_json(ts)
        body = doc["minecraft:texture_set"]
        mers = body.pop("metalness_emissive_roughness_subsurface", None)
        if not isinstance(mers, str):
            continue
        src = find_image(ts.parent, mers)
        with Image.open(src) as im:
            im.convert("RGBA").convert("RGB").save(ts.parent / f"{mers[:-5]}_mer.png")
        src.unlink()
        body["metalness_emissive_roughness"] = f"{mers[:-5]}_mer"
        doc["format_version"] = "1.16.100"
        dump_json(ts, doc)
    report.info("fauna: texture sets converted to MER (format 1.16.100) for RTX-first Realms")


def vendor_layers(stack: list, cfg: dict) -> list:
    """Vendor pack folders lowest priority first; a selected subpack overrides its pack's root."""
    layers = []
    for key, _, path, subpack in reversed(stack):
        if key in cfg["vendor_packs"]:
            layers.append(path)
            if subpack and (path / "subpacks" / subpack).is_dir():
                layers.append(path / "subpacks" / subpack)
    return layers


def grading_operator(path: Path) -> str | None:
    body = load_json(path).get("minecraft:color_grading_settings", {})
    return (body.get("tone_mapping") or {}).get("operator")


def merged_biomes(vanilla_rp: Path, vendors: list) -> list:
    """Each vanilla client biome with vendor components layered on top: [(filename, doc, format version)]."""
    merged = []
    for f in sorted((vanilla_rp / "biomes").glob("*.client_biome.json")):
        doc = load_json(f)
        fv = version_tuple(doc["format_version"])
        comps = doc["minecraft:client_biome"]["components"]
        for vp in vendors:  # lowest priority first
            vf = vp / "biomes" / f.name
            if vf.exists():
                vdoc = load_json(vf)
                comps.update(copy.deepcopy(vdoc["minecraft:client_biome"].get("components", {})))
                fv = max(fv, version_tuple(vdoc.get("format_version", "0")))
        merged.append((f.name, doc, fv))
    return merged


def generate_color_grading(atmos: Path, vanilla_rp: Path, vendors: list, profile: dict, biomes: list) -> tuple:
    """Write a vivid copy of every grading the biomes reference. Returns (old id -> new id, operator)."""
    cg = profile["color_grading"]
    files = {}
    for root in [vanilla_rp] + vendors:  # lowest priority first, so higher layers win on identical ids
        for f in sorted((root / "color_grading").glob("*.json")) if (root / "color_grading").is_dir() else []:
            try:
                ident = load_json(f)["minecraft:color_grading_settings"]["description"]["identifier"]
            except (ValueError, KeyError):
                continue
            files[ident] = f
    usage = {}
    for _, doc, _ in biomes:
        ident = (doc["minecraft:client_biome"]["components"].get("minecraft:color_grading_identifier") or {}) \
            .get("color_grading_identifier")
        if ident in files:
            usage[ident] = usage.get(ident, 0) + 1
    operator = cg["tone_mapping_operator"]
    if operator == "auto":  # the operator most biomes already use; operators cannot blend between biomes
        votes = {}
        for ident, count in usage.items():
            op = grading_operator(files[ident])
            if op:
                votes[op] = votes.get(op, 0) + count
        operator = max(votes, key=votes.get) if votes else "generic"
    files = {ident: f for ident, f in files.items() if ident in usage}

    def scale(section: dict, rules: dict) -> None:
        for field, lo, hi in (("saturation", 0.0, 10.0), ("contrast", 0.0, 4.0)):
            factor = rules.get(f"{field}_scale", 1.0)
            if field in section and isinstance(section[field], list):
                section[field] = [round(min(hi, max(lo, v * factor)), 4) for v in section[field]]

    mapping = {}
    for old_id, f in sorted(files.items()):
        doc = load_json(f)
        body = doc["minecraft:color_grading_settings"]
        new_id = cg["identifier_prefix"] + old_id.replace(":", "_")
        body["description"]["identifier"] = new_id
        grading = body.setdefault("color_grading", {})
        for section in ("midtones", "highlights", "shadows"):
            if section in grading:
                scale(grading[section], cg.get(section, {}))
        body["tone_mapping"] = {"operator": operator}
        dump_json(atmos / "color_grading" / f"pm_vivid_{old_id.replace(':', '_')}.json", doc)
        mapping[old_id] = new_id
    return mapping, operator


def apply_water_waves(atmos: Path, profile: dict) -> None:
    """Wave on/off and caustics cannot blend between biomes, so every water body gets the same values."""
    waves = profile["water"].get("waves", {})
    for f in sorted((atmos / "water").glob("*.json")):
        doc = load_json(f)
        body = doc["minecraft:water_settings"].setdefault("waves", {})
        body.update(waves)
        dump_json(f, doc)


def generate_biomes(atmos: Path, biomes: list, profile: dict, cg_map: dict, live_sounds: set) -> int:
    """Write complete client biome files: vanilla <- vendor components <- Port Marlowe remaps."""
    count = 0
    for name, doc, fv in biomes:
        comps = doc["minecraft:client_biome"]["components"]
        biome = name.split(".")[0]
        cgc = comps.get("minecraft:color_grading_identifier")
        if cgc and cgc.get("color_grading_identifier") in cg_map:
            cgc["color_grading_identifier"] = cg_map[cgc["color_grading_identifier"]]
        water = profile["water"]["default"]
        for rule in profile["water"]["rules"]:
            if any(fnmatch.fnmatch(biome, pat) for pat in rule["biomes"]):
                water = rule["water"]
                break
        comps["minecraft:water_identifier"] = {"water_identifier": water}
        for rule in profile.get("ambient", []):
            if not any(fnmatch.fnmatch(biome, pat) for pat in rule["biomes"]):
                continue
            amb = comps.setdefault("minecraft:ambient_sounds", {})
            if rule["loop"] in live_sounds and "loop" not in amb:
                amb["loop"] = rule["loop"]
            if rule["addition"]["asset"] in live_sounds and "addition" not in amb:
                amb["addition"] = dict(rule["addition"])
            if not amb:
                comps.pop("minecraft:ambient_sounds")
        doc["format_version"] = ".".join(str(x) for x in fv)
        dump_json(atmos / "biomes" / name, doc)
        count += 1
    return count


BIOME_REFS = {
    "minecraft:color_grading_identifier": ("color_grading_identifier", "color_grading", "minecraft:color_grading_settings"),
    "minecraft:water_identifier": ("water_identifier", "water", "minecraft:water_settings"),
    "minecraft:lighting_identifier": ("lighting_identifier", "lighting", "minecraft:lighting_settings"),
    "minecraft:atmosphere_identifier": ("atmosphere_identifier", "atmospherics", "minecraft:atmosphere_settings"),
    "minecraft:cubemap_identifier": ("cubemap_identifier", "cubemaps", "minecraft:cubemap_settings"),
    "minecraft:fog_appearance": ("fog_identifier", "fogs", "minecraft:fog_settings"),
}


def check_biome_references(atmos: Path, packs: list, vanilla_rp: Path, report: Report) -> None:
    """Every identifier a generated biome points at must be defined somewhere in the stack or base game."""
    defined = {comp: set() for comp in BIOME_REFS}
    for root in packs + [vanilla_rp]:
        for comp, (_, folder, schema) in BIOME_REFS.items():
            d = root / folder
            for f in d.rglob("*.json") if d.is_dir() else []:
                try:
                    ident = load_json(f).get(schema, {}).get("description", {}).get("identifier")
                except (ValueError, OSError, AttributeError):
                    continue
                if ident:
                    defined[comp].add(ident)
    missing = {}
    for f in sorted((atmos / "biomes").glob("*.json")):
        comps = load_json(f)["minecraft:client_biome"]["components"]
        for comp, (field, _, _) in BIOME_REFS.items():
            ident = (comps.get(comp) or {}).get(field)
            if ident and ident not in defined[comp] and not ident.startswith("minecraft:"):
                missing.setdefault(ident, []).append(f.name.split(".")[0])
    for ident, biomes in sorted(missing.items()):
        report.error(f"biomes: '{ident}' is referenced by {len(biomes)} biome(s) (e.g. {biomes[0]}) but no pack defines it")


def check_tone_mapping(atmos: Path, prefix: str, report: Report) -> None:
    """Biomes left on a non-generated grading keep their own operator; flag them."""
    stray = set()
    for f in (atmos / "biomes").glob("*.json"):
        comps = load_json(f)["minecraft:client_biome"]["components"]
        ident = (comps.get("minecraft:color_grading_identifier") or {}).get("color_grading_identifier")
        if ident and not ident.startswith(prefix):
            stray.add(ident)
    if stray:
        report.warn(f"biomes still use gradings {sorted(stray)}; if their tone-mapping operator differs, "
                    f"biome borders will show hard transitions")


def image_texels(path: Path) -> int:
    Image = pil()
    with Image.open(path) as im:
        return im.size[0] * im.size[1]


def check_texture_budget(stack: list, cfg: dict, report: Report) -> None:
    """Estimate texture memory (texels x 4 bytes, as Microsoft's MCTools does) against the platform tiers."""
    plat = cfg["target_platform"]
    budgets = plat["texture_budget_mb"]
    target = str(plat["memory_performance_tier"])
    total = 0.0
    print("\n[texture budget]  texels x 4 bytes, uncompressed")
    for _, folder, path, subpack in stack:
        texels = 0
        for f in path.rglob("*"):
            if f.suffix.lower() not in IMAGE_EXTS or f.name == "pack_icon.png":
                continue
            rel = f.relative_to(path).parts
            if rel[0] == "subpacks" and (len(rel) < 2 or rel[1] != subpack):
                continue  # only the selected subpack is loaded
            texels += image_texels(f)
        mb = texels * 4 / 1_000_000
        total += mb
        print(f"  {folder:<10} {mb:8.1f} MB")
        if mb > budgets[target]["resource_pack"]:
            report.error(f"{folder}: {mb:.0f} MB of textures exceeds the {plat['name']} resource-pack budget "
                         f"({budgets[target]['resource_pack']} MB, memory tier {target})")
    print(f"  {'world':<10} {total:8.1f} MB")
    for tier in sorted(budgets):
        fits = "fits" if total <= budgets[tier]["world"] else "OVER"
        mark = "  <- target" if tier == target else ""
        print(f"    tier {tier} ({plat['tier_platforms'][tier]}): {budgets[tier]['world']} MB world budget, {fits}{mark}")
    if total > budgets[target]["world"]:
        report.error(f"world textures ({total:.0f} MB) exceed the {plat['name']} world budget "
                     f"({budgets[target]['world']} MB)")


def check_fauna_budget(pack: Path, cfg: dict, report: Report) -> None:
    """Port Marlowe heuristics for herds on console; Mojang publishes no per-entity limit."""
    budget = cfg.get("fauna_budget", {})
    for gid, g in collect_geometry(pack).items():
        cubes = sum(len(b.get("cubes") or []) for b in g["bones"])
        if cubes > budget.get("max_cubes_per_geometry", 10 ** 9):
            report.warn(f"{gid}: {cubes} cubes; farms render dozens of these at once on {cfg['target_platform']['name']}, "
                        f"keep under {budget['max_cubes_per_geometry']}")
        if any("poly_mesh" in b for b in g["bones"]):
            report.warn(f"{gid}: uses poly_mesh; check it renders correctly on the target console before shipping")
    tex_root = pack / "textures" / "entity" / "pm"
    for f in tex_root.rglob("*") if tex_root.is_dir() else []:
        if f.suffix.lower() in IMAGE_EXTS:
            Image = pil()
            with Image.open(f) as im:
                if max(im.size) > budget.get("max_texture_edge", 10 ** 9):
                    report.warn(f"{f.relative_to(pack)}: {im.size[0]}x{im.size[1]} exceeds the "
                                f"{budget['max_texture_edge']} px fauna texture budget")


def zip_dir(src: Path, out: Path, arc_prefix: str = "") -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(src.rglob("*")):
            if f.is_file():
                z.write(f, arc_prefix + f.relative_to(src).as_posix())


def cmd_build(args, cfg) -> int:
    vanilla_rp = require_vanilla(vanilla_root(cfg, args.vanilla))
    vanilla = Vanilla(vanilla_rp)
    profile_name = args.profile
    profile = cfg["profiles"][profile_name]
    atmos_profile = load_json(ROOT / "config" / "atmosphere_profile.json")
    out = (ROOT / "build" / profile_name).resolve()
    if out.exists():
        shutil.rmtree(out)
    packs_out = out / "packs"
    report = Report()
    print(f"Building profile '{profile_name}': {profile['description']}")

    stack = []  # (key, folder, path, subpack)
    for entry in profile["stack"]:
        key, _, subpack_override = entry.partition(":")
        if key in cfg["packs"]:
            spec = cfg["packs"][key]
            dest = packs_out / spec["folder"]
            stage_pack(ROOT / spec["source"], ROOT / spec["assets"], dest)
            stack.append((key, spec["folder"], dest, None))
        elif key in cfg["vendor_packs"]:
            spec = cfg["vendor_packs"][key]
            src = ROOT / spec["source"]
            if not (src / "manifest.json").exists():
                report.warn(f"vendor/{key}: not found at {spec['source']} (extract the pack so manifest.json "
                            f"sits at that folder's root); building without it")
                continue
            dest = packs_out / spec["folder"]
            shutil.copytree(src, dest)
            subpack = subpack_override or spec.get("subpack")
            declared = [s.get("folder_name") for s in load_json(dest / "manifest.json").get("subpacks", [])]
            if subpack and subpack not in declared:
                report.error(f"vendor/{key}: subpack '{subpack}' is not declared in its manifest ({declared})")
            stack.append((key, spec["folder"], dest, subpack))
        else:
            report.error(f"profile stack entry '{entry}' is not defined in config/build.json")

    keys = {k: p for k, _, p, _ in stack}
    print("\n[fauna]")
    if "pm_fauna" in keys:
        prune_fauna(keys["pm_fauna"], report)
        if cfg.get("fauna_material_mode") == "mer":
            convert_fauna_to_mer(keys["pm_fauna"], report)
    print("\n[audio]")
    live_sounds = set()
    if "pm_audio" in keys:
        live_sounds = prune_audio(keys["pm_audio"], cfg, report, vanilla)
        Report.info(f"audio: {len(live_sounds)} sound definition(s) shipped")
    if "pm_fauna" in keys and "pm.chicken.rooster_crow" not in live_sounds:
        strip_rooster(keys["pm_fauna"])
        report.warn("audio: no rooster crow recordings; dawn crow controller removed from the chicken")
    print("\n[atmosphere]")
    if "pm_atmos" in keys:
        atmos = keys["pm_atmos"]
        vendors = vendor_layers(stack, cfg)
        biomes = merged_biomes(vanilla_rp, vendors)
        cg_map, operator = generate_color_grading(atmos, vanilla_rp, vendors, atmos_profile, biomes)
        apply_water_waves(atmos, atmos_profile)
        n = generate_biomes(atmos, biomes, atmos_profile, cg_map, live_sounds)
        Report.info(f"atmosphere: {len(cg_map)} vivid color gradings (tone mapping '{operator}') and "
                    f"{n} client biome remaps generated")
        check_biome_references(atmos, [p for _, _, p, _ in stack] + vendors, vanilla_rp, report)
        check_tone_mapping(atmos, atmos_profile["color_grading"]["identifier_prefix"], report)
    if "pm_fauna" in keys:
        check_fauna_budget(keys["pm_fauna"], cfg, report)
    check_texture_budget(stack, cfg, report)
    if "pm_audio" in keys:
        audio_mb = sum(f.stat().st_size for f in (keys["pm_audio"] / "sounds").rglob("*") if f.is_file()) / 1048576
        Report.info(f"audio payload: {audio_mb:.1f} MiB")

    print("\n[validate built packs]")
    live_sound_defs = {}
    if "pm_audio" in keys:
        live_sound_defs = load_json(keys["pm_audio"] / "sounds" / "sound_definitions.json")["sound_definitions"]
    seen_ids = {}
    world_packs = []
    for key, folder, path, subpack in stack:
        if key in cfg["vendor_packs"]:
            m = validate_manifest(path, cfg, report, folder)
        else:
            m = validate_pack(path, cfg, report, vanilla, live_sound_defs, folder)
        if not m:
            continue
        for uid in manifest_ids(m):
            if uid in seen_ids:
                report.error(f"{folder}: UUID {uid} is also used by {seen_ids[uid]}")
            seen_ids[uid] = folder
        entry = {"pack_id": m["header"]["uuid"], "version": m["header"]["version"]}
        if subpack:
            entry["subpack"] = subpack
        world_packs.append(entry)
    dump_json(out / "world_resource_packs.json", world_packs)

    dist = out / "dist"
    for _, folder, path, _ in stack:
        zip_dir(path, dist / f"{folder}.mcpack")
    with zipfile.ZipFile(dist / f"port_marlowe_{profile_name}.mcaddon", "w", zipfile.ZIP_DEFLATED) as z:
        for _, folder, path, _ in stack:
            for f in sorted(path.rglob("*")):
                if f.is_file():
                    z.write(f, f"{folder}/{f.relative_to(path).as_posix()}")
    size = sum(f.stat().st_size for f in packs_out.rglob("*") if f.is_file())
    print(f"\nPack stack (top = highest priority): {', '.join(f for _, f, _, _ in stack)}")
    print(f"Total pack payload: {size / 1048576:.1f} MiB -> {out}")
    ok = report.summary(f"build {profile_name}")
    if ok:
        print(f"Next: python3 tools/pmtool.py package-world --profile {profile_name} --world <exported.mcworld>")
    return 0 if ok else 1


# --------------------------------------------------------------------------
# World packaging
# --------------------------------------------------------------------------

def cmd_package_world(args, cfg) -> int:
    build_dir = ROOT / "build" / args.profile
    wrp = build_dir / "world_resource_packs.json"
    if not wrp.exists():
        sys.exit(f"Run `pmtool build --profile {args.profile}` first.")
    report = Report()
    with tempfile.TemporaryDirectory() as tmp:
        world = Path(tmp) / "world"
        src = Path(args.world)
        if src.is_dir():
            shutil.copytree(src, world)
        else:
            with zipfile.ZipFile(src) as z:
                z.extractall(world)
        level = list(world.rglob("level.dat"))
        if not level:
            sys.exit("No level.dat found; export the world from Minecraft (Edit World > Export World).")
        root = level[0].parent
        if root != world:
            report.warn("level.dat was nested inside a folder; re-rooting so level.dat sits at the archive root")
        if not (root / "db").is_dir():
            report.error("world has no db/ folder; it is not a complete Bedrock world export")
        rp_dir = root / "resource_packs"
        rp_dir.mkdir(exist_ok=True)
        ours = load_json(wrp)
        our_ids = {e["pack_id"].lower() for e in ours}
        for pack in sorted((build_dir / "packs").iterdir()):
            target = rp_dir / pack.name
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(pack, target)
        present = {}
        for d in rp_dir.iterdir():
            if (d / "manifest.json").exists():
                m = load_json(d / "manifest.json")
                present[m["header"]["uuid"].lower()] = (d.name, m["header"]["version"])
                if len(d.name) > MAX_FOLDER_NAME:
                    report.error(f"resource_packs/{d.name}: folder name longer than {MAX_FOLDER_NAME} characters")
        existing = load_json(root / "world_resource_packs.json") if (root / "world_resource_packs.json").exists() else []
        kept = []
        for e in existing:
            pid = e.get("pack_id", "").lower()
            if pid in our_ids:
                continue
            if pid not in present and args.drop_unknown:
                report.warn(f"dropped pack {pid} from world_resource_packs.json (its files are not in the world)")
                continue
            report.warn(f"world already lists pack {pid}; kept below the Port Marlowe stack")
            kept.append(e)
        dump_json(root / "world_resource_packs.json", ours + kept)
        for e in ours + kept:
            pid = e["pack_id"].lower()
            if pid not in present:
                report.error(f"world_resource_packs.json lists {pid}, which is not inside resource_packs/ "
                             f"(Realm members cannot download it; rerun with --drop-unknown to remove it)")
            elif version_tuple(present[pid][1]) != version_tuple(e["version"]):
                report.error(f"{present[pid][0]}: manifest version {present[pid][1]} != listed {e['version']}")
        out = Path(args.out).resolve()
        if out.exists():
            out.unlink()
        if report.errors:
            report.summary("package-world")
            print("No world written.")
            return 1
        zip_dir(root, out)
    size = out.stat().st_size / 1048576
    print(f"\nWrote {out} ({size:.1f} MiB)")
    return 0 if report.summary("package-world") else 1


# --------------------------------------------------------------------------
# Asset import helpers
# --------------------------------------------------------------------------

def entity_desc(species: str) -> dict:
    return load_json(ROOT / "packs" / "pm_fauna" / "entity" / f"{species}.entity.json")["minecraft:client_entity"]["description"]


def cmd_import_model(args, cfg) -> int:
    desc = entity_desc(args.species)
    geo_map = desc["geometry"]
    if args.slot not in geo_map:
        sys.exit(f"{args.species} geometry slots: {', '.join(geo_map)}")
    target_id = geo_map[args.slot]
    doc = load_json(Path(args.src))
    geos = list(iter_geometries(doc))
    if args.source_id:
        geos = [g for g in geos if g[0] == args.source_id]
    if len(geos) != 1:
        sys.exit(f"{args.src} defines {len(geos)} matching geometries; pick one with --source-id "
                 f"({', '.join(str(g[0]) for g in iter_geometries(doc))})")
    ident, gdesc, bones = geos[0]
    if gdesc.get("_legacy_parent"):
        sys.exit("Legacy inherited geometry (geometry.a:geometry.b); flatten it in Blockbench and re-export.")
    new_desc = {k: v for k, v in gdesc.items() if not k.startswith("_") and v is not None}
    new_desc["identifier"] = target_id
    if "minecraft:geometry" not in doc:
        legacy = doc[[k for k in doc if k.split(":")[0] == ident][0]]
        for src_key, dst_key in (("visible_bounds_width", "visible_bounds_width"),
                                 ("visible_bounds_height", "visible_bounds_height"),
                                 ("visible_bounds_offset", "visible_bounds_offset")):
            if src_key in legacy:
                new_desc[dst_key] = legacy[src_key]
    out_doc = {"format_version": doc.get("format_version") if "minecraft:geometry" in doc else "1.12.0",
               "minecraft:geometry": [{"description": new_desc, "bones": bones}]}
    dest = ROOT / "assets" / "pm_fauna" / "models" / "entity" / f"pm_{args.species}_{args.slot}.geo.json"
    dump_json(dest, out_doc)
    print(f"Imported {ident} as {target_id} -> {dest.relative_to(ROOT)}")
    vr = vanilla_root(cfg, args.vanilla)
    if (vr / "resource_pack" / "animations").is_dir():
        anims = collect_animations(vr / "resource_pack")
        anims.update(collect_animations(ROOT / "packs" / "pm_fauna"))
        need = set().union(*(anims.get(a, set()) for a in desc["animations"].values()))
        have = {b.get("name") for b in bones}
        missing = sorted(need - have)
        print(f"Bones: {', '.join(sorted(n for n in have if n))}")
        if missing:
            print(f"WARNING: bones {missing} are animated by {args.species}.entity.json but absent in this model")
    return 0


def texture_stems(species: str) -> list:
    return [Path(p).name for p in entity_desc(species)["textures"].values()]


def cmd_import_texture(args, cfg) -> int:
    Image = pil()
    stems = texture_stems(args.species)
    if args.slot not in stems:
        sys.exit(f"{args.species} texture slots: {', '.join(stems)}")
    dest = ROOT / "assets" / "pm_fauna" / "textures" / "entity" / "pm" / args.species
    dest.mkdir(parents=True, exist_ok=True)
    for old in dest.glob(f"{args.slot}*"):
        if re.fullmatch(rf"{re.escape(args.slot)}(_mers|_mer|_normal)?\.(png|tga|jpg|jpeg)", old.name):
            old.unlink()
    albedo = Image.open(args.albedo).convert("RGBA")
    if args.max_size and max(albedo.size) > args.max_size:
        f = args.max_size / max(albedo.size)
        albedo = albedo.resize((round(albedo.size[0] * f), round(albedo.size[1] * f)), Image.LANCZOS)
    size = albedo.size
    ext = ".tga" if args.species == "sheep" else ".png"
    albedo.save(dest / f"{args.slot}{ext}")

    def fit(img):
        return img if img.size == size else img.resize(size, Image.LANCZOS)

    if args.mers:
        fit(Image.open(args.mers).convert("RGBA")).save(dest / f"{args.slot}_mers.tga")
    elif args.mer:
        mer = fit(Image.open(args.mer).convert("RGB"))
        if args.subsurface:
            sss = fit(Image.open(args.subsurface).convert("L"))
        else:
            sss = Image.new("L", size, int(args.subsurface_value))
        r, g, b = mer.split()
        Image.merge("RGBA", (r, g, b, sss)).save(dest / f"{args.slot}_mers.tga")
    else:
        print("No --mers/--mer given: the texture set will fail validation until a MERS map is imported.")
    if args.normal:
        n = fit(Image.open(args.normal).convert("RGB"))
        if args.flip_normal_green:
            r, g, b = n.split()
            n = Image.merge("RGB", (r, g.point(lambda v: 255 - v), b))
        n.save(dest / f"{args.slot}_normal.png")
    print(f"Imported {args.species}/{args.slot} at {size[0]}x{size[1]} -> {dest.relative_to(ROOT)}")
    return 0


def cmd_convert_labpbr(args, cfg) -> int:
    """Convert a LabPBR 1.3 (_s/_n) pair into Bedrock MERS + normal."""
    Image = pil()
    spec = Image.open(args.specular).convert("RGBA")
    r, g, b, a = spec.split()
    roughness = r.point(lambda s: 255 - s)                  # perceptual smoothness -> perceptual roughness
    metal = g.point(lambda f0: 255 if f0 >= 230 else 0)      # 230-255 are LabPBR metal IDs
    emissive = a.point(lambda e: 0 if e == 255 else e)       # 255 means "no emission" in LabPBR
    subsurface = b.point(lambda p: 0 if p < 65 else round((p - 65) * 255 / 190))
    out = Path(args.out_stem)
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.merge("RGBA", (metal, emissive, roughness, subsurface)).save(f"{out}_mers.tga")
    if args.normal:
        n = Image.open(args.normal).convert("RGB")
        if args.flip_normal_green:
            r, gch, b = n.split()
            n = Image.merge("RGB", (r, gch.point(lambda v: 255 - v), b))
        px = n.load()
        for yy in range(n.size[1]):  # LabPBR stores AO in blue; rebuild Z from X/Y
            for xx in range(n.size[0]):
                x, y, _ = px[xx, yy]
                fx, fy = x / 127.5 - 1.0, y / 127.5 - 1.0
                px[xx, yy] = (x, y, round((max(0.0, 1.0 - fx * fx - fy * fy) ** 0.5) * 127.5 + 127.5))
        n.save(f"{out}_normal.png")
    print(f"Wrote {out}_mers.tga" + (f" and {out}_normal.png" if args.normal else ""))
    return 0


def audio_slots() -> dict:
    defs = load_json(ROOT / "packs" / "pm_audio" / "sounds" / "sound_definitions.json")["sound_definitions"]
    slots = {}
    for key, d in defs.items():
        for _, name, raw in iter_sound_entries(d):
            m = re.fullmatch(r"sounds/pm/(.+?)(?:_(\d\d))?", name)
            if m:
                is3d = raw.get("is3D", True) if isinstance(raw, dict) else True
                slots.setdefault(m.group(1), {"count": 0, "is3D": is3d, "events": set()})
                slots[m.group(1)]["count"] = max(slots[m.group(1)]["count"], int(m.group(2) or 1))
                slots[m.group(1)]["events"].add(key)
    return slots


def cmd_convert_audio(args, cfg) -> int:
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg is required for audio import")
    slots = audio_slots()
    if args.slot not in slots:
        sys.exit("Unknown slot. Known slots:\n  " + "\n  ".join(sorted(slots)))
    slot = slots[args.slot]
    srcs = []
    for s in args.src:
        p = Path(s)
        srcs += sorted(x for x in p.iterdir() if x.suffix.lower() in (".wav", ".flac", ".ogg", ".mp3", ".aiff")) if p.is_dir() else [p]
    numbered = re.search(r"_\d\d$", next(iter(load_slot_names(args.slot)), "x_01")) is not None
    dest_dir = ROOT / "assets" / "pm_audio" / "sounds" / "pm" / Path(args.slot).parent
    dest_dir.mkdir(parents=True, exist_ok=True)
    mono = slot["is3D"] and not args.stereo
    for i, src in enumerate(srcs, start=args.start):
        if numbered and i > slot["count"]:
            print(f"skip {src.name}: slot {args.slot} has {slot['count']} entries in sound_definitions.json")
            continue
        stem = f"{Path(args.slot).name}_{i:02d}" if numbered else Path(args.slot).name
        out = dest_dir / f"{stem}.ogg"
        filters = []
        if numbered and not args.no_trim:  # never trim un-numbered loop beds
            trim = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02"
            filters += [trim, "areverse", trim, "areverse"]
        filters.append(f"loudnorm=I={args.lufs}:TP=-1.5:LRA=11")
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
               "-af", ",".join(filters), "-ar", "44100", "-ac", "1" if mono else "2",
               "-c:a", "libvorbis", "-q:a", "6", str(out)]
        subprocess.run(cmd, check=True)
        print(f"{src.name} -> {out.relative_to(ROOT)} ({'mono' if mono else 'stereo'}, {args.lufs} LUFS)")
        if not numbered:
            break
    return 0


def load_slot_names(slot: str) -> list:
    defs = load_json(ROOT / "packs" / "pm_audio" / "sounds" / "sound_definitions.json")["sound_definitions"]
    names = [name for d in defs.values() for _, name, _ in iter_sound_entries(d)
             if re.fullmatch(rf"sounds/pm/{re.escape(slot)}(_\d\d)?", name)]
    return sorted(set(names))


# --------------------------------------------------------------------------
# Status, version bump
# --------------------------------------------------------------------------

def cmd_status(args, cfg) -> int:
    with tempfile.TemporaryDirectory() as tmp:
        fauna = Path(tmp) / "pm_fauna"
        stage_pack(ROOT / "packs" / "pm_fauna", ROOT / "assets" / "pm_fauna", fauna)
        print("FAUNA (all slots of a species must be filled before it ships)")
        for ef in sorted((fauna / "entity").glob("*.json")):
            desc, missing_tex, missing_geo = required_entity_assets(ef, fauna)
            total = len(set(desc["geometry"].values()))
            for path in desc["textures"].values():
                ts = fauna / f"{path}.texture_set.json"
                total += 1 + (len(load_json(ts)["minecraft:texture_set"]) - 1 if ts.exists() else 0)
            missing = len(missing_tex) + len(missing_geo)
            print(f"  {desc['identifier']:<20} {total - missing:>3}/{total} present")
            for m in missing_geo:
                print(f"      geometry  {m}")
            for m in missing_tex:
                print(f"      texture   {m}")
        audio = Path(tmp) / "pm_audio"
        stage_pack(ROOT / "packs" / "pm_audio", ROOT / "assets" / "pm_audio", audio)
        print("\nAUDIO (definitions with zero files fall back to vanilla)")
        for slot, info in sorted(audio_slots().items()):
            names = load_slot_names(slot)
            have = sum(1 for n in names if sound_file(audio, n))
            mark = "ok " if have == len(names) else ("-- " if have == 0 else "~  ")
            print(f"  {mark}{slot:<32} {have}/{len(names)}  ({', '.join(sorted(info['events']))})")
    print("\nVENDOR PACKS")
    for key, spec in cfg["vendor_packs"].items():
        state = "present" if (ROOT / spec["source"] / "manifest.json").exists() else "missing"
        print(f"  {key:<26} {state:<8} {spec['source']}")
    return 0


def cmd_bump(args, cfg) -> int:
    for key, spec in cfg["packs"].items():
        mf = ROOT / spec["source"] / "manifest.json"
        m = load_json(mf)
        v = list(m["header"]["version"])
        v[2] += 1
        m["header"]["version"] = v
        for mod in m["modules"]:
            mod["version"] = list(v)
        dump_json(mf, m)
        print(f"{key}: {'.'.join(map(str, v))}")
    return 0


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main(argv=None) -> int:
    if hasattr(signal, "SIGPIPE"):
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)  # allow `pmtool status | head`
    cfg = load_config()
    p = argparse.ArgumentParser(prog="pmtool", description=__doc__.splitlines()[0])
    p.add_argument("--vanilla", help="path to a Mojang/bedrock-samples checkout (default: config or $PM_VANILLA)")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("fetch-vanilla", help="sparse-clone Mojang/bedrock-samples at the pinned tag")
    s.add_argument("--ref")
    s.set_defaults(fn=cmd_fetch_vanilla)

    s = sub.add_parser("status", help="list every asset slot and whether it is filled")
    s.set_defaults(fn=cmd_status)

    s = sub.add_parser("validate", help="strictly validate source packs + assets (every slot required)")
    s.set_defaults(fn=cmd_validate)

    s = sub.add_parser("build", help="assemble, prune, generate biome remaps, validate, zip")
    s.add_argument("--profile", default=cfg["default_profile"], choices=sorted(cfg["profiles"]))
    s.set_defaults(fn=cmd_build)

    s = sub.add_parser("package-world", help="inject a built stack into an exported .mcworld")
    s.add_argument("--profile", default=cfg["default_profile"], choices=sorted(cfg["profiles"]))
    s.add_argument("--world", required=True, help="exported .mcworld (or an unzipped world folder)")
    s.add_argument("--out", default="build/PortMarlowe.mcworld")
    s.add_argument("--drop-unknown", action="store_true",
                   help="remove world_resource_packs.json entries whose pack files are not inside the world")
    s.set_defaults(fn=cmd_package_world)

    s = sub.add_parser("import-model", help="import a Blockbench/Bedrock geometry into a fauna slot")
    s.add_argument("--species", required=True, choices=SPECIES)
    s.add_argument("--slot", required=True, help="geometry key from the entity file, e.g. temperate, baby")
    s.add_argument("--src", required=True)
    s.add_argument("--source-id", help="geometry identifier to take when the file holds several")
    s.set_defaults(fn=cmd_import_model)

    s = sub.add_parser("import-texture", help="import albedo/MERS/normal layers into a fauna texture slot")
    s.add_argument("--species", required=True, choices=SPECIES)
    s.add_argument("--slot", required=True, help="texture stem, e.g. holstein, leghorn_rooster, lamb")
    s.add_argument("--albedo", required=True)
    s.add_argument("--mers", help="RGBA map: R metalness, G emissive, B roughness, A subsurface")
    s.add_argument("--mer", help="RGB MER map (RTX-style); combined with --subsurface")
    s.add_argument("--subsurface", help="greyscale subsurface map")
    s.add_argument("--subsurface-value", type=int, default=0, help="uniform subsurface 0-255 when no map")
    s.add_argument("--normal", help="tangent-space normal map")
    s.add_argument("--flip-normal-green", action="store_true", help="convert between OpenGL/DirectX conventions")
    s.add_argument("--max-size", type=int, default=cfg.get("fauna_budget", {}).get("max_texture_edge"),
                   help="downscale so the longest edge is at most this many pixels (default: fauna budget)")
    s.set_defaults(fn=cmd_import_texture)

    s = sub.add_parser("convert-labpbr", help="convert a Java LabPBR _s/_n pair to Bedrock MERS/normal")
    s.add_argument("--specular", required=True)
    s.add_argument("--normal")
    s.add_argument("--out-stem", required=True, help="output path without suffix, e.g. work/stone")
    s.add_argument("--flip-normal-green", action="store_true")
    s.set_defaults(fn=cmd_convert_labpbr)

    s = sub.add_parser("convert-audio", help="normalise field recordings into an audio slot (OGG Vorbis)")
    s.add_argument("--slot", required=True, help="e.g. chicken/rooster_crow, step/grass, ambient/forest_loop")
    s.add_argument("--src", required=True, nargs="+", help="source files or a folder")
    s.add_argument("--start", type=int, default=1, help="first slot index to fill")
    s.add_argument("--lufs", type=float, default=-18.0, help="integrated loudness target")
    s.add_argument("--stereo", action="store_true", help="keep stereo (only for non-positional ambience)")
    s.add_argument("--no-trim", action="store_true", help="keep leading/trailing silence (loops)")
    s.set_defaults(fn=cmd_convert_audio)

    s = sub.add_parser("bump", help="increment the patch version of every first-party pack")
    s.set_defaults(fn=cmd_bump)

    args = p.parse_args(argv)
    return args.fn(args, cfg)


if __name__ == "__main__":
    sys.exit(main())
