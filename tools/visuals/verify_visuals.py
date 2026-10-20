"""Check visual coverage, day-cycle continuity and documented rendering parameter bounds.

This checks authored data, not rendered visibility or performance. --pack supports checking an
isolated copy for negative tests without ever mutating the working pack.
"""
import argparse
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT / "build/bedrock-samples/resource_pack"
EXCLUDED = {"hell", "basalt_deltas", "crimson_forest", "warped_forest", "soulsand_valley", "the_end"}
LOOK_COMPONENTS = {
    "minecraft:sky_color", "minecraft:fog_appearance", "minecraft:lighting_identifier",
    "minecraft:atmosphere_identifier", "minecraft:color_grading_identifier", "minecraft:water_identifier",
}


def load(path):
    return json.loads(path.read_text())


def bounded(value, low, high):
    assert isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
    assert low <= value <= high, f"{value} outside [{low}, {high}]"


def frames(curve, low, high, channels=0):
    if isinstance(curve, dict):
        assert curve and all(0 <= float(k) <= 1 for k in curve), "invalid daily keyframe time"
        assert len({float(k) for k in curve}) == len(curve), "duplicate normalized time"
        ends = {float(k): v for k, v in curve.items()}
        assert 0 in ends and 1 in ends and ends[0] == ends[1], "day-cycle seam or missing endpoints"
        values = list(curve.values())
    else:
        values = [curve]
    for value in values:
        if channels:
            assert isinstance(value, list) and len(value) == channels, "invalid channel count"
            for v in value:
                bounded(v, low, high)
        else:
            bounded(value, low, high)


def without_air(volume):
    return {k: {medium: value for medium, value in v.items() if medium != "air"}
            for k, v in volume.items() if any(medium != "air" for medium in v)}


def verify(pack):
    vanilla = {p.name: load(p)["minecraft:client_biome"] for p in (REFERENCE / "biomes").glob("*.json")}
    expected = {name for name in vanilla if name.split(".")[0] not in EXCLUDED}
    actual = {p.name for p in (pack / "biomes").glob("*.json")}
    assert actual == expected, f"Overworld coverage mismatch: {actual ^ expected}"
    vanilla_fogs = {load(p)["minecraft:fog_settings"]["description"]["identifier"]:
                    load(p)["minecraft:fog_settings"] for p in (REFERENCE / "fogs").glob("*.json")}
    for name in sorted(actual):
        base = vanilla[name]
        new = load(pack / "biomes" / name)["minecraft:client_biome"]
        assert new["description"] == base["description"], f"biome identity changed: {name}"
        a, b = base["components"], new["components"]
        assert {k: v for k, v in a.items() if k not in LOOK_COMPONENTS} == {
            k: v for k, v in b.items() if k not in LOOK_COMPONENTS
        }, f"non-look components changed: {name}"
        fog_id = a.get("minecraft:fog_appearance", {}).get("fog_identifier")
        old_fog = vanilla_fogs.get(fog_id, {})
        fog_name = name.split(".")[0] + ".json"
        fog = load(pack / "fogs" / fog_name)["minecraft:fog_settings"]
        assert {k: v for k, v in old_fog.get("distance", {}).items() if k not in ("air", "weather")} == {
            k: v for k, v in fog["distance"].items() if k not in ("air", "weather")
        }, f"underwater/lava distance fog changed: {name}"
        assert without_air(old_fog.get("volumetric", {})) == without_air(fog.get("volumetric", {})), f"underwater volume changed: {name}"
        for medium in ("air", "weather"):
            d = fog["distance"][medium]
            assert 0.2 <= d["fog_start"] < d["fog_end"] <= 1
            assert d["render_distance_type"] == "render"
        assert fog["distance"]["air"]["fog_end"] == 1, "clear-air fog cuts off before render distance"
        density = fog["volumetric"]["density"]["air"]
        bounded(density["max_density"], 0.0, 0.07)
        if not density["uniform"]:
            assert density["zero_density_height"] > density["max_density_height"], "inverted mist falloff"
    rows = []
    for path in sorted((pack / "lighting").glob("*.json")):
        group = path.name.removesuffix("_lighting.json")
        light = load(path)["minecraft:lighting_settings"]
        orbital = light["directional_lights"]["orbital"]
        for body in ("sun", "moon"):
            frames(orbital[body]["illuminance"], 0, 100)
            frames(orbital[body]["color"], 0, 255, 3)
        assert 0.05 <= max(orbital["moon"]["illuminance"].values()) <= 0.25, "moon overwhelms night lighting"
        frames(light["ambient"]["illuminance"], 0.005, 0.03)
        frames(light["ambient"]["color"], 0, 255, 3)
        frames(light["sky"]["intensity"], 0.1, 1)
        ambient = light["ambient"]["illuminance"]
        sky = light["sky"]["intensity"]
        assert ambient["0.5"] <= ambient["0.0"] and sky["0.5"] <= sky["0.0"], "night fill exceeds daylight"
        atmosphere = load(pack / "atmospherics" / f"{group}_atmospherics.json")["minecraft:atmosphere_settings"]
        for name in ("sun_mie_strength", "moon_mie_strength", "sun_glare_shape"):
            frames(atmosphere[name], 0, 1)
        for name in ("sky_zenith_color", "sky_horizon_color"):
            frames(atmosphere[name], 0, 255, 3)
        grade = load(pack / "color_grading" / f"{group}_color_grading.json")["minecraft:color_grading_settings"]
        assert grade["tone_mapping"]["operator"] == "generic", "biome tone mappers cannot blend"
        for region in ("midtones", "shadows", "highlights"):
            g = grade["color_grading"][region]
            frames(g["gamma"], 1.8, 2.4, 3)
            frames(g["gain"], 0.7, 1.0, 3)
            frames(g["offset"], 0, 0, 3)
            frames(g["contrast"], 0, 4, 3)
            frames(g["saturation"], 0, 10, 3)
        bounded(grade["color_grading"]["temperature"]["temperature"], 1000, 15000)
        bounded(grade["color_grading"]["highlights"]["highlightsMin"], 1, 4)
        bounded(grade["color_grading"]["shadows"]["shadowsMax"], 0.1, 1)
        water_doc = load(pack / "water" / f"{group}_water.json")
        water = water_doc["minecraft:water_settings"]
        assert water_doc["format_version"] == "1.26.0", "biome water contribution requires 1.26.0"
        bounded(water["biome_water_color_contribution"], 0, 1)
        for key, top in (("chlorophyll", 10), ("cdom", 15), ("suspended_sediment", 300)):
            bounded(water["particle_concentrations"][key], 0, top)
        w, c = water["waves"], water["caustics"]
        assert isinstance(w["octaves"], int) and 1 <= w["octaves"] <= 4, "wave complexity exceeds budget"
        for key, low, high in (("frequency", 0.01, 3), ("depth", 0, 3), ("speed", 0.01, 10),
                               ("shape", 1, 10), ("mix", 0, 1), ("pull", -1, 1),
                               ("frequency_scaling", 0, 2), ("speed_scaling", 0, 2)):
            bounded(w[key], low, high)
        assert isinstance(c["power"], int) and 1 <= c["power"] <= 6, "unsupported fractional caustics power"
        bounded(c["frame_length"], 0.01, 5)
        bounded(c["scale"], 0.1, 5)
        rows.append(f"| {group} | {max(orbital['sun']['illuminance'].values()):g} | "
                    f"{max(orbital['moon']['illuminance'].values()):g} | {ambient['0.0']:g} / {ambient['0.5']:g} | "
                    f"{sky['0.0']:g} / {sky['0.5']:g} | {grade['color_grading']['midtones']['saturation'][0]:g} |")
    assert len(rows) == 7, "missing visual profile"
    return len(actual), rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pack", type=Path, default=ROOT / "packs/visuals")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    try:
        count, rows = verify(args.pack)
    except (AssertionError, KeyError, ValueError, OSError) as e:
        print(f"ERROR visual verification: {e}")
        return 1
    print(f"Visual verification passed: {count} Overworld biomes, 7 profiles, closed day cycles, bounded light/water parameters; biome identity/music/foliage and underwater fog preserved.")
    if args.report:
        args.report.write_text("# Visual verification (generated)\n\n"
            "Data checks passed. These values are rendering inputs, not screenshots, display brightness or FPS.\n\n"
            "| Profile | Peak sun (lux) | Peak moon (lux) | Ambient day/night (lux) | Sky day/night | Saturation |\n"
            "|---|---:|---:|---:|---:|---:|\n" + "\n".join(rows) + "\n\n"
            f"{count} Overworld client biomes covered. Native Nether/End biome definitions are not overridden.\n"
            "Checked: unchanged non-look biome components and underwater fog, full clear-air render distance, "
            "daily seam continuity, nonzero ambient floor, matching tone mapper and documented water ranges.\n"
            "In-game readability, biome transitions, animation quality and device performance remain unverified.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
