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

# Keep native Nether/End lighting and gameplay-signalling biome components intact.
EXCLUDED = {"hell", "basalt_deltas", "crimson_forest", "warped_forest", "soulsand_valley", "the_end"}

# Existing memberships remain unless a more specific art direction is useful.
GROUPS = {
    "wild": [
        "forest", "forest_hills", "flower_forest", "birch_forest", "birch_forest_hills", "birch_forest_mutated",
        "birch_forest_hills_mutated", "dappled_forest", "taiga", "taiga_hills", "taiga_mutated", "mega_taiga",
        "mega_taiga_hills", "redwood_taiga_mutated", "redwood_taiga_hills_mutated", "plains", "sunflower_plains",
        "meadow", "cherry_grove", "extreme_hills", "extreme_hills_edge", "extreme_hills_mutated",
        "extreme_hills_plus_trees", "extreme_hills_plus_trees_mutated", "jungle", "jungle_edge", "jungle_hills",
        "jungle_mutated", "jungle_edge_mutated", "bamboo_jungle", "bamboo_jungle_hills", "savanna", "savanna_mutated",
        "savanna_plateau", "savanna_plateau_mutated", "stony_peaks", "mushroom_island", "mushroom_island_shore",
    ],
    "cold": [
        "cold_taiga", "cold_taiga_hills", "cold_taiga_mutated", "grove", "snowy_slopes", "ice_plains", "ice_mountains",
        "ice_plains_spikes", "frozen_river", "cold_beach", "frozen_peaks", "jagged_peaks", "frozen_ocean",
        "deep_frozen_ocean", "legacy_frozen_ocean", "cold_ocean", "deep_cold_ocean",
    ],
    "swamp": ["swampland", "swampland_mutated", "mangrove_swamp"],
    "cave": ["dripstone_caves", "deep_dark", "lush_caves", "sulfur_caves"],
    "canopy": ["roofed_forest", "roofed_forest_mutated", "pale_garden"],
    "arid": ["desert", "desert_hills", "desert_mutated", "mesa", "mesa_bryce", "mesa_plateau", "mesa_plateau_mutated",
             "mesa_plateau_stone", "mesa_plateau_stone_mutated"],
    "coast": ["beach", "stone_beach", "river", "ocean", "deep_ocean", "lukewarm_ocean", "deep_lukewarm_ocean",
              "warm_ocean", "deep_warm_ocean"],
}

# Film direction: steel/olive shadows, subdued earth colours and amber practical lights.
# These values describe inputs, never measured screen brightness or visibility.
STYLE = {
    # sun scale, moon peak, day/night ambient, day/night sky, saturation, contrast, midtone gain
    "wild":   (0.68, 0.16, 0.016, 0.010, 0.70, 0.34, 0.84, 1.10, 0.86),
    "cold":   (0.70, 0.15, 0.016, 0.010, 0.65, 0.34, 0.80, 1.08, 0.85),
    "swamp":  (0.62, 0.13, 0.015, 0.010, 0.62, 0.30, 0.78, 1.09, 0.85),
    "cave":   (0.68, 0.15, 0.010, 0.010, 0.25, 0.25, 0.82, 1.06, 0.90),
    "canopy": (0.62, 0.13, 0.015, 0.010, 0.62, 0.30, 0.78, 1.10, 0.85),
    "arid":   (0.70, 0.16, 0.016, 0.011, 0.70, 0.36, 0.82, 1.08, 0.86),
    "coast":  (0.70, 0.17, 0.016, 0.011, 0.72, 0.38, 0.82, 1.08, 0.86),
}

DAY_SKY = {
    "wild": [66, 82, 96], "cold": [76, 94, 116], "swamp": [65, 81, 76], "cave": [66, 82, 96],
    "canopy": [64, 76, 77], "arid": [96, 91, 86], "coast": [71, 91, 105],
}
DAY_HORIZON = {
    "wild": [120, 132, 139], "cold": [130, 144, 158], "swamp": [108, 121, 105], "cave": [120, 132, 139],
    "canopy": [110, 122, 117], "arid": [143, 130, 115], "coast": [125, 140, 148],
}


def cycle(day, dusk, night):
    """Closed daily curve: normalized orbital time is noon=0, sunset=.25, midnight=.5."""
    return {"0.0": day, "0.18": day, "0.25": dusk, "0.32": night, "0.5": night,
            "0.68": night, "0.75": dusk, "0.82": day, "1.0": day}


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
    sun_scale, moon_peak, day_ambient, night_ambient, day_sky, night_sky, *_ = STYLE[group]
    # Author every colour stop: the previous generator retained vanilla's highly orange
    # daytime stops and only replaced its final key. Start/end now match exactly.
    noon = [224, 232, 231] if group not in ("swamp", "arid") else [234, 230, 214]
    sun["color"] = cycle(noon, [196, 161, 139], [151, 164, 177])
    sun["illuminance"] = {k: round(v * sun_scale, 6) for k, v in sun["illuminance"].items()}
    moon["illuminance"] = {k: (moon_peak if v > 0 else 0.0) for k, v in moon["illuminance"].items()}
    moon["color"] = {"0.0": [175, 194, 218], "1.0": [175, 194, 218]}
    ls["ambient"] = {
        "illuminance": cycle(day_ambient, round((day_ambient + night_ambient) / 2, 4), night_ambient),
        "color": cycle([225, 233, 233], [209, 221, 228], [190, 207, 222]),
    }
    ls["sky"] = {"intensity": cycle(day_sky, round((day_sky + night_sky) / 2, 3), night_sky)}
    ls["emissive"] = {"desaturation": 0.0}
    base["format_version"] = "1.26.0"
    return base


# ------------------------------------------------------------------------------ atmospherics
def atmospherics(group):
    src = {"swamp": "atmospherics/swampland_atmospherics.json"}.get(group, "atmospherics/atmospherics.json")
    base = load(src)
    a = base["minecraft:atmosphere_settings"]
    a["description"]["identifier"] = ID("atmospherics", group)
    a["sky_zenith_color"] = cycle(DAY_SKY[group], [35, 41, 47], [12, 17, 24])
    a["sky_horizon_color"] = cycle(DAY_HORIZON[group], [125, 99, 91], [31, 40, 49])
    # Reduce inherited sunset glare rather than turning the world black to hide it.
    a["sun_mie_strength"] = cycle(0.0, 0.22, 0.0)
    a["moon_mie_strength"] = cycle(0.0, 0.025, 0.10)
    a["sun_glare_shape"] = cycle(0.0, 0.025, 0.0)
    return base


# ------------------------------------------------------------------------------ colour grading
def grading(group):
    *_, sat, con, midtone_gain = STYLE[group]
    temp = {"wild": 6250, "cold": 6100, "swamp": 6300, "cave": 6350,
            "canopy": 6250, "arid": 6500, "coast": 6200}[group]
    shadow_gain = [0.90, 0.94, 0.97] if group not in ("swamp", "canopy") else [0.91, 0.95, 0.92]
    return {
        "format_version": "1.21.90",
        "minecraft:color_grading_settings": {
            "description": {"identifier": ID("color_grading", group)},
            "color_grading": {
                # Keep standard gamma and zero offset: darken gain without crushing the black floor.
                "midtones": {"contrast": [con] * 3, "gain": [midtone_gain] * 3, "gamma": [2.2] * 3, "offset": [0.0] * 3, "saturation": [sat] * 3},
                "shadows": {"enabled": True, "shadowsMax": 0.6, "gain": shadow_gain, "saturation": [round(sat * 0.95, 4)] * 3,
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
    concentrations = {
        "wild": (0.10, 0.12, 0.18), "cold": (0.02, 0.04, 0.08), "swamp": (0.60, 0.50, 0.45),
        "cave": (0.04, 0.08, 0.12), "canopy": (0.18, 0.18, 0.28), "arid": (0.04, 0.20, 0.12),
        "coast": (0.08, 0.10, 0.15),
    }
    chlorophyll, sediment, cdom = concentrations[group]
    w["particle_concentrations"] = {"chlorophyll": chlorophyll, "suspended_sediment": sediment, "cdom": cdom}
    w["biome_water_color_contribution"] = 0.25
    w["caustics"] = {"enabled": group not in ("swamp", "canopy", "cave"), "frame_length": 0.18, "scale": 0.35, "power": 1}
    # Low-complexity image-based ripples: no moving geometry or gameplay waves.
    w["waves"] = {"enabled": group not in ("cave", "cold"), "frequency": 0.65,
                  "octaves": 4 if group == "coast" else 2, "depth": 0.12 if group == "coast" else 0.05,
                  "speed": 0.35, "shape": 1.1, "pull": 0.15, "mix": 0.2,
                  "frequency_scaling": 1.2, "speed_scaling": 1.03}
    base["format_version"] = "1.26.0"
    return base


# ------------------------------------------------------------------------------ fog
FOG = {
    # Air/weather distance settings, then height-limited volume density and RGB scattering.
    "wild": ((0.65, 1.0, "#75848A"), (0.25, 0.75, "#505C61"), (0.045, 100.0, 62.0, [0.022, 0.026, 0.029])),
    "cold": ((0.70, 1.0, "#8698A7"), (0.25, 0.75, "#5F6D79"), (0.035, 110.0, 64.0, [0.025, 0.030, 0.036])),
    "swamp": ((0.55, 1.0, "#65745F"), (0.20, 0.70, "#475342"), (0.065, 82.0, 60.0, [0.024, 0.030, 0.022])),
    "cave": ((0.75, 1.0, "#292F36"), (0.75, 1.0, "#292F36"), (0.020, 64.0, -64.0, [0.016, 0.019, 0.023])),
    "canopy": ((0.60, 1.0, "#67756C"), (0.25, 0.75, "#48544E"), (0.055, 96.0, 62.0, [0.023, 0.028, 0.025])),
    "arid": ((0.75, 1.0, "#8B8276"), (0.35, 0.80, "#686055"), (0.018, 104.0, 62.0, [0.021, 0.019, 0.017])),
    "coast": ((0.70, 1.0, "#758A92"), (0.25, 0.75, "#52636B"), (0.032, 100.0, 62.0, [0.021, 0.026, 0.030])),
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
    vol.setdefault("media_coefficients", {})["air"] = {"scattering": scat, "absorption": [0.006, 0.006, 0.007]}
    vol.setdefault("henyey_greenstein_g", {})["air"] = {"henyey_greenstein_g": 0.6}
    fog["format_version"] = "1.21.90"
    return fog


SKY = {group: "#" + "".join(f"{v:02X}" for v in rgb) for group, rgb in DAY_SKY.items() if group != "cave"}


def main():
    # Fail before replacing generated files if the pinned biome inventory changes unexpectedly.
    assigned = [biome for biomes in GROUPS.values() for biome in biomes]
    available = {os.path.basename(p).split(".")[0] for p in glob.glob(os.path.join(SRC, "biomes", "*.json"))}
    assert len(assigned) == len(set(assigned)), "duplicate visual biome assignment"
    assert set(assigned) == available - EXCLUDED, f"biome coverage mismatch: {set(assigned) ^ (available - EXCLUDED)}"
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
