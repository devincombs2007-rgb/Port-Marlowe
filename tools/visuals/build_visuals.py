"""THE HOLLOW: Visuals (optional resource pack).

Generates per-biome Vibrant Visuals overrides (lighting, atmospherics, colour grading, water) and
fog (distance fog for Simple/Fancy graphics + volumetric fog for Vibrant Visuals) from Mojang's
vanilla 1.26.50 definitions. Since 1.21.90, vanilla per-biome VV settings take precedence over a
pack's global files, so the documented route is client_biome overrides; every override is a copy
of the vanilla biome file with only the look-related identifiers swapped.

Design rules: daytime stays useful without glaring highlights; dusk and night get cool, muted
and misty. Shelter light stays warm. Keep a small ambient floor for silhouettes rather than
raising ambient light at night. Numerical tuning needs in-game confirmation on each display.
"""
import copy
import glob
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import VP, ROOT, ensure  # noqa: E402

SRC = os.path.join(ROOT, "build", "bedrock-samples", "resource_pack")

GROUPS = {
    "wild": [
        "forest", "forest_hills", "flower_forest", "birch_forest", "birch_forest_hills", "birch_forest_mutated",
        "birch_forest_hills_mutated", "roofed_forest", "roofed_forest_mutated", "dappled_forest", "taiga", "taiga_hills",
        "taiga_mutated", "mega_taiga", "mega_taiga_hills", "redwood_taiga_mutated", "redwood_taiga_hills_mutated", "plains",
        "sunflower_plains", "meadow", "cherry_grove", "extreme_hills", "extreme_hills_edge", "extreme_hills_mutated",
        "extreme_hills_plus_trees", "extreme_hills_plus_trees_mutated", "river", "beach", "stone_beach", "jungle",
        "jungle_edge", "jungle_hills", "jungle_mutated", "jungle_edge_mutated", "bamboo_jungle", "bamboo_jungle_hills",
        "savanna", "savanna_mutated", "savanna_plateau", "savanna_plateau_mutated", "stony_peaks",
    ],
    "cold": [
        "cold_taiga", "cold_taiga_hills", "cold_taiga_mutated", "grove", "snowy_slopes", "ice_plains", "ice_mountains",
        "frozen_river", "cold_beach", "frozen_peaks", "jagged_peaks",
    ],
    "swamp": ["swampland", "swampland_mutated", "mangrove_swamp"],
    "cave": ["dripstone_caves", "deep_dark"],
}

ID = lambda kind, group: f"hollow:{group}_{kind}"  # noqa: E731


def load(rel):
    with open(os.path.join(SRC, rel)) as f:
        return json.load(f)


def write(rel, obj):
    path = os.path.join(VP, rel)
    ensure(os.path.dirname(path))
    with open(path, "w") as f:
        json.dump(obj, f, indent=2)


# ------------------------------------------------------------------------------ lighting
def lighting(group):
    base = load("lighting/global.json")
    ls = base["minecraft:lighting_settings"]
    ls["description"]["identifier"] = ID("lighting", group)
    sun = ls["directional_lights"]["orbital"]["sun"]
    moon = ls["directional_lights"]["orbital"]["moon"]
    noon = {"wild": [244, 238, 228], "cold": [232, 238, 252], "swamp": [232, 236, 206], "cave": [244, 238, 228]}[group]
    sun["color"] = {k: (noon if float(k) in (0.0, 1.0) else v) for k, v in sun["color"].items()}
    sun_scale = {"wild": 0.8, "cold": 0.75, "swamp": 0.7, "cave": 0.8}[group]
    sun["illuminance"] = {k: round(v * sun_scale, 6) for k, v in sun["illuminance"].items()}
    # Retain vanilla's zero-light intervals and phase timing; reduce the former 0.5-lux moon.
    moon_peak = {"wild": 0.2, "cold": 0.18, "swamp": 0.16, "cave": 0.16}[group]
    moon["illuminance"] = {k: (moon_peak if v > 0 else 0.0) for k, v in moon["illuminance"].items()}
    moon["color"] = {"0.0": [150, 170, 255], "1.0": [150, 170, 255]}
    ls["ambient"] = {
        "illuminance": {"0.0": 0.018, "0.2": 0.016, "0.3": 0.012, "0.7": 0.012, "0.8": 0.016, "1.0": 0.018},
        "color": {"0.0": [255, 255, 255], "0.25": [214, 222, 255], "0.5": [200, 212, 255], "0.75": [214, 222, 255], "1.0": [255, 255, 255]},
    }
    ls["sky"] = {"intensity": {"0.0": 0.8, "0.2": 0.75, "0.3": 0.45, "0.5": 0.4, "0.7": 0.45, "0.8": 0.75, "1.0": 0.8}}
    if group == "cave":
        ls["ambient"]["illuminance"] = 0.009
        ls["sky"]["intensity"] = 0.25
    ls["emissive"] = {"desaturation": 0.0}
    base["format_version"] = "1.26.0"
    return base


# ------------------------------------------------------------------------------ atmospherics
def atmospherics(group):
    src = {"swamp": "atmospherics/swampland_atmospherics.json"}.get(group, "atmospherics/atmospherics.json")
    base = load(src)
    a = base["minecraft:atmosphere_settings"]
    a["description"]["identifier"] = ID("atmospherics", group)
    zenith_day = {"wild": [76, 102, 138], "cold": [84, 110, 148], "swamp": [74, 92, 94], "cave": [76, 102, 138]}[group]
    # Keyframes: 0 noon, 0.25 sunset, 0.5 midnight, 0.75 sunrise. Night sky is deep blue, not grey,
    # with a lighter horizon so treeline silhouettes read at night.
    a["sky_zenith_color"] = {"0.0": zenith_day, "0.2": zenith_day, "0.3": [26, 32, 50], "0.5": [12, 16, 28], "0.7": [26, 32, 50], "0.8": zenith_day, "1.0": zenith_day}
    a["sky_horizon_color"] = {
        "0.0": [144, 157, 171], "0.17": [160, 153, 148], "0.23": [184, 128, 104], "0.27": [120, 90, 92],
        "0.33": [46, 54, 74], "0.5": [29, 37, 50], "0.67": [46, 54, 74], "0.73": [160, 112, 104], "0.77": [184, 138, 114],
        "0.83": [160, 156, 152], "1.0": [144, 157, 171],
    }
    if group == "swamp":
        a["sky_horizon_color"] = {k: [int(v[0] * 0.92), int(v[1] * 0.98), int(v[2] * 0.85)] for k, v in a["sky_horizon_color"].items()}
    a["moon_mie_strength"] = {"0.0": 0.0, "0.3": 0.12, "0.5": 0.18, "0.7": 0.12, "1.0": 0.0}
    return base


# ------------------------------------------------------------------------------ colour grading
def grading(group):
    sat = {"wild": 0.94, "cold": 0.9, "swamp": 0.86, "cave": 0.92}[group]
    con = {"wild": 1.12, "cold": 1.1, "swamp": 1.08, "cave": 1.1}[group]
    temp = {"wild": 6300, "cold": 6000, "swamp": 6200, "cave": 6400}[group]
    shadow_gain = {"wild": [0.92, 0.94, 0.98], "cold": [0.91, 0.94, 0.99], "swamp": [0.92, 0.96, 0.92], "cave": [0.93, 0.95, 0.99]}[group]
    midtone_gain = {"wild": 0.88, "cold": 0.86, "swamp": 0.86, "cave": 0.9}[group]
    return {
        "format_version": "1.21.90",
        "minecraft:color_grading_settings": {
            "description": {"identifier": ID("color_grading", group)},
            "color_grading": {
                # Keep standard gamma and zero offset: darken gain without crushing the black floor.
                "midtones": {"contrast": [con] * 3, "gain": [midtone_gain] * 3, "gamma": [2.2] * 3, "offset": [0.0] * 3, "saturation": [sat] * 3},
                "shadows": {"enabled": True, "shadowsMax": 0.6, "gain": shadow_gain, "saturation": [sat * 0.95] * 3,
                            "contrast": [1.0] * 3, "gamma": [2.2] * 3, "offset": [0.0] * 3},
                "highlights": {"enabled": True, "highlightsMin": 1.4, "gain": [0.88, 0.85, 0.81], "saturation": [1.0] * 3,
                               "contrast": [1.0] * 3, "gamma": [2.2] * 3, "offset": [0.0] * 3},
                "temperature": {"enabled": True, "temperature": temp, "type": "color_temperature"},
            },
            # All grading files must share one tone mapping operator (it cannot blend); vanilla uses generic.
            "tone_mapping": {"operator": "generic"},
        },
    }


# ------------------------------------------------------------------------------ water
def water(group):
    base = load("water/water.json")
    w = base["minecraft:water_settings"]
    w["description"]["identifier"] = ID("water", group)
    if group == "swamp":
        w["particle_concentrations"] = {"chlorophyll": 0.6, "suspended_sediment": 0.5, "cdom": 0.4}
    return base


# ------------------------------------------------------------------------------ fog
FOG = {
    # (air start, air end, colour), (weather start, end, colour), volumetric (density, zero_h, max_h, scattering)
    "wild": ((0.7, 1.0, "#798B9A"), (0.25, 0.75, "#535E68"), (0.055, 100.0, 62.0, [0.028, 0.032, 0.038])),
    "cold": ((0.7, 1.0, "#899DB0"), (0.2, 0.7, "#626F7D"), (0.05, 110.0, 64.0, [0.03, 0.035, 0.043])),
    # Match the pale garden's 0.07 peak density in the pinned Mojang reference. Our height
    # falloff still clears by Y82; numerical parity alone does not prove in-game visibility.
    "swamp": ((0.55, 1.0, "#697764"), (0.2, 0.65, "#4A5546"), (0.07, 82.0, 60.0, [0.028, 0.034, 0.026])),
    "cave": ((0.75, 1.0, "#292E36"), (0.75, 1.0, "#292E36"), (0.03, 64.0, -64.0, [0.018, 0.02, 0.024])),
}


def fog_for(biome, group, vanilla_fog_id):
    """Vanilla biome fog (keeps its water fog) + our air/weather distance fog + volumetric mist."""
    vanilla = None
    if vanilla_fog_id:
        for f in glob.glob(os.path.join(SRC, "fogs", "*.json")):
            d = json.load(open(f))
            if d["minecraft:fog_settings"]["description"]["identifier"] == vanilla_fog_id:
                vanilla = d
                break
    fog = copy.deepcopy(vanilla) if vanilla else {"format_version": "1.16.100", "minecraft:fog_settings": {"distance": {}}}
    fs = fog["minecraft:fog_settings"]
    fs["description"] = {"identifier": f"hollow:fog_{biome}"}
    (a0, a1, ac), (w0, w1, wc), (dens, zero_h, max_h, scat) = FOG[group]
    fs.setdefault("distance", {})
    fs["distance"]["air"] = {"fog_start": a0, "fog_end": a1, "fog_color": ac, "render_distance_type": "render"}
    fs["distance"]["weather"] = {"fog_start": w0, "fog_end": w1, "fog_color": wc, "render_distance_type": "render"}
    vol = fs.setdefault("volumetric", {})
    air = {"max_density": dens, "uniform": False, "zero_density_height": zero_h, "max_density_height": max_h} if group != "cave" \
        else {"max_density": dens, "uniform": True}
    vol.setdefault("density", {})["air"] = air
    vol.setdefault("media_coefficients", {})["air"] = {"scattering": scat, "absorption": [0.004, 0.004, 0.005]}
    vol.setdefault("henyey_greenstein_g", {})["air"] = {"henyey_greenstein_g": 0.6}
    fog["format_version"] = "1.21.90"
    return fog


SKY = {"wild": "#6C88AC", "cold": "#7A94B6", "swamp": "#627674"}


def main():
    for d in ("biomes", "fogs", "lighting", "atmospherics", "color_grading", "water", "local_lighting"):
        p = os.path.join(VP, d)
        if os.path.isdir(p):
            for f in glob.glob(os.path.join(p, "*.json")):
                os.remove(f)
    for group in GROUPS:
        write(f"lighting/{group}_lighting.json", lighting(group))
        write(f"atmospherics/{group}_atmospherics.json", atmospherics(group))
        write(f"color_grading/{group}_color_grading.json", grading(group))
        write(f"water/{group}_water.json", water(group))
    count = 0
    for group, biomes in GROUPS.items():
        for biome in biomes:
            src = os.path.join(SRC, "biomes", f"{biome}.client_biome.json")
            if not os.path.isfile(src):
                print(f"  (no vanilla client biome for {biome})")
                continue
            doc = json.load(open(src))
            comps = doc["minecraft:client_biome"]["components"]
            vfog = comps.get("minecraft:fog_appearance", {}).get("fog_identifier")
            write(f"fogs/{biome}.json", fog_for(biome, group, vfog))
            comps["minecraft:fog_appearance"] = {"fog_identifier": f"hollow:fog_{biome}"}
            comps["minecraft:lighting_identifier"] = {"lighting_identifier": ID("lighting", group)}
            comps["minecraft:atmosphere_identifier"] = {"atmosphere_identifier": ID("atmospherics", group)}
            comps["minecraft:color_grading_identifier"] = {"color_grading_identifier": ID("color_grading", group)}
            comps["minecraft:water_identifier"] = {"water_identifier": ID("water", group)}
            if group in SKY:
                comps["minecraft:sky_color"] = {"sky_color": SKY[group]}
            write(f"biomes/{biome}.client_biome.json", doc)
            count += 1
    # Warm shelter light: torches and lanterns a touch warmer; Hollow blocks get their own colours.
    write("local_lighting/local_lighting.json", {
        "format_version": "1.21.120",
        "minecraft:local_light_settings": {
            "minecraft:torch": {"light_color": "#FFB46B", "light_type": "point_light"},
            "minecraft:lantern": {"light_color": "#E8873A", "light_type": "point_light"},
            "minecraft:campfire": {"light_color": "#FF9A4A", "light_type": "static_light"},
            "hollow:heartwood_lantern": {"light_color": "#FF6A3D", "light_type": "point_light"},
            "hollow:rowan_ward": {"light_color": "#FF8A3A", "light_type": "static_light"},
        },
    })
    print(f"visuals: {count} biome overrides, {len(GROUPS)} looks")


if __name__ == "__main__":
    main()
