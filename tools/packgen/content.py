"""Source of truth for THE HOLLOW items, blocks, recipes and their texture/lang registrations.

Run: python3 tools/packgen/content.py
Writes packs/behavior/{items,blocks,recipes}, packs/resource/textures/{item_texture,terrain_texture}.json,
packs/resource/blocks.json and the item/block lines of the lang files (merged by tools/packgen/lang.py).
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from hollowkit import BP, RP, ensure  # noqa: E402

ITEM_FMT = "1.26.30"
BLOCK_FMT = "1.26.20"
RECIPE_FMT = "1.20.10"

# id, display name, icon, extra components, menu category
ITEMS = [
    ("field_journal", "Field Journal", "field_journal", {
        "minecraft:max_stack_size": 1, "minecraft:interact_button": "Read", "hollow:journal": {},
        "minecraft:hover_text_color": "gray"}, "items"),
    ("torn_page", "Torn Page", "torn_page", {
        "minecraft:max_stack_size": 16, "minecraft:interact_button": "Read", "hollow:torn_page": {}}, "items"),
    ("pale_resin", "Pale Resin", "pale_resin", {"hollow:material": {}, "minecraft:interact_button": "Inspect"}, "items"),
    ("borrowed_hide", "Borrowed Hide", "borrowed_hide", {"hollow:material": {}, "minecraft:interact_button": "Inspect"}, "items"),
    ("hollow_fang", "Hollow Fang", "hollow_fang", {"hollow:material": {}, "minecraft:interact_button": "Inspect"}, "items"),
    ("knocker_nail", "Knocker's Nail", "knocker_nail", {"hollow:material": {}, "minecraft:interact_button": "Inspect"}, "items"),
    ("mire_pearl", "Mire Pearl", "mire_pearl", {"hollow:material": {}, "minecraft:interact_button": "Inspect"}, "items"),
    ("stilled_heart", "Stilled Heart", "stilled_heart", {
        "hollow:material": {}, "minecraft:max_stack_size": 16, "minecraft:rarity": {"value": "epic"},
        "minecraft:interact_button": "Inspect"}, "items"),
    ("hollow_lens", "Hollow Lens", "hollow_lens", {
        "minecraft:max_stack_size": 1, "minecraft:interact_button": "Look", "hollow:lens": {},
        "minecraft:durability": {"max_durability": 64},
        "minecraft:repairable": {"repair_items": [{"items": ["minecraft:copper_ingot"], "repair_amount": 16}]},
        "minecraft:cooldown": {"category": "hollow_lens", "duration": 3.0}}, "equipment"),
    ("heartseeker", "Heartseeker", "heartseeker", {
        "minecraft:max_stack_size": 1, "minecraft:interact_button": "Listen", "hollow:heartseeker": {},
        "minecraft:cooldown": {"category": "hollow_heartseeker", "duration": 2.0},
        "minecraft:rarity": {"value": "uncommon"}}, "equipment"),
    ("offering_of_silence", "Offering of Silence", "offering_of_silence", {
        "minecraft:max_stack_size": 1, "minecraft:rarity": {"value": "rare"}, "minecraft:glint": True}, "items"),
]

# Block items reuse the block identifier and place the block (vanilla pattern, e.g. red_shrub).
BLOCK_ITEMS = [
    ("hollow_chime", "Hollow Chime", "hollow_chime"),
    ("rowan_ward", "Rowan Ward", "rowan_ward"),
    ("heartwood_lantern", "Heartwood Lantern", "heartwood_lantern"),
]


def item_json(ident, name, icon, comps, cat):
    c = {
        "minecraft:icon": {"textures": {"default": f"hollow_{icon}"}},
        "minecraft:display_name": {"value": f"item.hollow:{ident}.name"},
    }
    c.update(comps)
    return {
        "format_version": ITEM_FMT,
        "minecraft:item": {
            "description": {"identifier": f"hollow:{ident}", "menu_category": {"category": cat}},
            "components": c,
        },
    }


def block_item_json(ident, name, icon):
    return {
        "format_version": ITEM_FMT,
        "minecraft:item": {
            "description": {"identifier": f"hollow:{ident}", "menu_category": {"category": "items"}},
            "components": {
                "minecraft:icon": {"textures": {"default": f"hollow_{icon}"}},
                "minecraft:display_name": {"value": f"tile.hollow:{ident}.name"},
                "minecraft:block_placer": {"block": f"hollow:{ident}", "replace_block_item": True},
            },
        },
    }


def mat(texture, render="alpha_test", ao=False):
    # 1.26.20 block format: ambient_occlusion is a number (AO exponent; 0 disables it).
    return {"texture": texture, "render_method": render, "ambient_occlusion": 1.0 if ao else 0.0, "face_dimming": True}


BLOCKS = {
    "hollow_chime": {
        "format_version": BLOCK_FMT,
        "minecraft:block": {
            "description": {
                "identifier": "hollow:hollow_chime",
                "menu_category": {"category": "items"},
                "states": {"hollow:silenced": {"values": {"min": 0, "max": 1}}},
            },
            "components": {
                "minecraft:geometry": "geometry.hollow.hollow_chime",
                "minecraft:material_instances": {"*": mat("hollow_hollow_chime")},
                "minecraft:collision_box": False,
                "minecraft:selection_box": {"origin": [-6, 2, -2], "size": [12, 14, 4]},
                "minecraft:light_dampening": 0,
                "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.4},
                "minecraft:destructible_by_explosion": {"explosion_resistance": 1},
                "minecraft:placement_filter": {"conditions": [{"allowed_faces": ["down"]}]},
                "minecraft:map_color": "#b4683f",
                "minecraft:sound": {"sound": "copper"},
                "hollow:chime": {},
            },
            "permutations": [
                {"condition": "query.block_state('hollow:silenced') == 1",
                 "components": {"minecraft:material_instances": {"*": mat("hollow_hollow_chime_silenced")}}},
            ],
        },
    },
    "rowan_ward": {
        "format_version": BLOCK_FMT,
        "minecraft:block": {
            "description": {
                "identifier": "hollow:rowan_ward",
                "menu_category": {"category": "items"},
                "states": {"hollow:used": {"values": {"min": 0, "max": 4}}},
            },
            "components": {
                "minecraft:geometry": "geometry.hollow.rowan_ward",
                "minecraft:material_instances": {"*": mat("hollow_rowan_ward")},
                "minecraft:collision_box": False,
                "minecraft:selection_box": {"origin": [-3, 0, -3], "size": [6, 15, 6]},
                "minecraft:light_dampening": 0,
                "minecraft:light_emission": 4,
                "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.3},
                "minecraft:placement_filter": {"conditions": [{"allowed_faces": ["up"]}]},
                "minecraft:map_color": "#6d4c31",
                "minecraft:sound": {"sound": "wood"},
                "minecraft:loot": "loot_tables/empty.json",
                "hollow:ward": {},
            },
            "permutations": [
                {"condition": "query.block_state('hollow:used') >= 4",
                 "components": {"minecraft:material_instances": {"*": mat("hollow_rowan_ward_spent")}, "minecraft:light_emission": 0}},
            ],
        },
    },
    "heartwood_lantern": {
        "format_version": BLOCK_FMT,
        "minecraft:block": {
            "description": {"identifier": "hollow:heartwood_lantern", "menu_category": {"category": "items"}},
            "components": {
                "minecraft:geometry": "geometry.hollow.heartwood_lantern",
                "minecraft:material_instances": {"*": mat("hollow_heartwood_lantern")},
                "minecraft:collision_box": {"origin": [-4, 0, -4], "size": [8, 10, 8]},
                "minecraft:selection_box": {"origin": [-4, 0, -4], "size": [8, 12, 8]},
                "minecraft:light_emission": 15,
                "minecraft:light_dampening": 0,
                "minecraft:destructible_by_mining": {"seconds_to_destroy": 1.0},
                "minecraft:placement_filter": {"conditions": [{"allowed_faces": ["up"]}]},
                "minecraft:map_color": "#874432",
                "minecraft:sound": {"sound": "lantern"},
                "hollow:lantern": {},
            },
        },
    },
    "heart_altar": {
        "format_version": BLOCK_FMT,
        "minecraft:block": {
            "description": {
                "identifier": "hollow:heart_altar",
                "menu_category": {"category": "none"},
                "states": {"hollow:awake": {"values": {"min": 0, "max": 1}}},
            },
            "components": {
                "minecraft:geometry": "geometry.hollow.heart_altar",
                "minecraft:material_instances": {"*": mat("hollow_heart_altar", "opaque", True)},
                "minecraft:collision_box": {"origin": [-8, 0, -8], "size": [16, 15, 16]},
                "minecraft:selection_box": {"origin": [-8, 0, -8], "size": [16, 15, 16]},
                "minecraft:destructible_by_mining": False,
                "minecraft:destructible_by_explosion": False,
                "minecraft:light_emission": 3,
                "minecraft:map_color": "#303036",
                "minecraft:sound": {"sound": "deepslate"},
                "minecraft:loot": "loot_tables/empty.json",
                "hollow:altar": {},
            },
            "permutations": [
                {"condition": "query.block_state('hollow:awake') == 1",
                 "components": {"minecraft:material_instances": {"*": mat("hollow_heart_altar_awake", "opaque", True)},
                                "minecraft:light_emission": 9}},
            ],
        },
    },
    "hollow_roots": {
        "format_version": BLOCK_FMT,
        "minecraft:block": {
            "description": {"identifier": "hollow:hollow_roots", "menu_category": {"category": "nature"}},
            "components": {
                "minecraft:geometry": "minecraft:geometry.full_block",
                "minecraft:material_instances": {"*": mat("hollow_hollow_roots", "opaque", True)},
                "minecraft:destructible_by_mining": {"seconds_to_destroy": 1.2},
                "minecraft:destructible_by_explosion": {"explosion_resistance": 3},
                "minecraft:map_color": "#2e251d",
                "minecraft:sound": {"sound": "roots"},
            },
        },
    },
    "tracks": {
        "format_version": BLOCK_FMT,
        "minecraft:block": {
            "description": {
                "identifier": "hollow:tracks",
                "menu_category": {"category": "none"},
                # kind: 0 Watcher, 1 Knocker, 2 Mirebound drag, 3 Borrowed; dir: 0 N, 1 E, 2 S, 3 W
                "states": {"hollow:kind": {"values": {"min": 0, "max": 3}}, "hollow:dir": {"values": {"min": 0, "max": 3}}},
            },
            "components": {
                "minecraft:geometry": "geometry.hollow.tracks",
                "minecraft:material_instances": {"*": mat("hollow_tracks_watcher")},
                "minecraft:collision_box": False,
                "minecraft:selection_box": {"origin": [-8, 0, -8], "size": [16, 1, 16]},
                "minecraft:light_dampening": 0,
                "minecraft:destructible_by_mining": {"seconds_to_destroy": 0},
                "minecraft:destructible_by_explosion": {"explosion_resistance": 0},
                "minecraft:replaceable": {},
                "minecraft:loot": "loot_tables/empty.json",
                "minecraft:map_color": "#3a2f25",
                "minecraft:sound": {"sound": "gravel"},
            },
            "permutations": [
                {"condition": "query.block_state('hollow:kind') == 1",
                 "components": {"minecraft:material_instances": {"*": mat("hollow_tracks_knocker")}}},
                {"condition": "query.block_state('hollow:kind') == 2",
                 "components": {"minecraft:material_instances": {"*": mat("hollow_tracks_drag")}}},
                {"condition": "query.block_state('hollow:kind') == 3",
                 "components": {"minecraft:material_instances": {"*": mat("hollow_tracks_borrowed")}}},
                {"condition": "query.block_state('hollow:dir') == 1", "components": {"minecraft:transformation": {"rotation": [0, 270, 0]}}},
                {"condition": "query.block_state('hollow:dir') == 2", "components": {"minecraft:transformation": {"rotation": [0, 180, 0]}}},
                {"condition": "query.block_state('hollow:dir') == 3", "components": {"minecraft:transformation": {"rotation": [0, 90, 0]}}},
            ],
        },
    },
}

BLOCK_NAMES = {
    "hollow_chime": "Hollow Chime", "rowan_ward": "Rowan Ward", "heartwood_lantern": "Heartwood Lantern",
    "heart_altar": "Heart Altar", "hollow_roots": "Hollow Roots", "tracks": "Tracks",
}

# terrain_texture short names -> texture paths
TERRAIN = {
    "hollow_hollow_chime": "textures/blocks/hollow/hollow_chime",
    "hollow_hollow_chime_silenced": "textures/blocks/hollow/hollow_chime_silenced",
    "hollow_rowan_ward": "textures/blocks/hollow/rowan_ward",
    "hollow_rowan_ward_spent": "textures/blocks/hollow/rowan_ward_spent",
    "hollow_heartwood_lantern": "textures/blocks/hollow/heartwood_lantern",
    "hollow_heart_altar": "textures/blocks/hollow/heart_altar",
    "hollow_heart_altar_awake": "textures/blocks/hollow/heart_altar_awake",
    "hollow_hollow_roots": "textures/blocks/hollow/hollow_roots",
    "hollow_tracks_watcher": "textures/blocks/hollow/tracks_watcher",
    "hollow_tracks_knocker": "textures/blocks/hollow/tracks_knocker",
    "hollow_tracks_drag": "textures/blocks/hollow/tracks_drag",
    "hollow_tracks_borrowed": "textures/blocks/hollow/tracks_borrowed",
}


def shaped(ident, pattern, key, result, count=1, unlock=None):
    return {
        "format_version": RECIPE_FMT,
        "minecraft:recipe_shaped": {
            "description": {"identifier": f"hollow:{ident}"},
            "tags": ["crafting_table"],
            "pattern": pattern,
            "key": {k: {"item": v} for k, v in key.items()},
            "unlock": [{"item": u} for u in (unlock or [list(key.values())[0]])],
            "result": {"item": result, "count": count},
        },
    }


def shapeless(ident, ingredients, result, count=1, unlock=None):
    return {
        "format_version": RECIPE_FMT,
        "minecraft:recipe_shapeless": {
            "description": {"identifier": f"hollow:{ident}"},
            "tags": ["crafting_table"],
            "ingredients": [{"item": i, "count": n} for i, n in ingredients],
            "unlock": [{"item": u} for u in (unlock or [ingredients[0][0]])],
            "result": {"item": result, "count": count},
        },
    }


RECIPES = {
    "field_journal": shapeless("field_journal", [("minecraft:book", 1), ("minecraft:charcoal", 1)], "hollow:field_journal",
                               unlock=["minecraft:book"]),
    "hollow_chime": shaped("hollow_chime", [" S ", "NCN", " N "],
                           {"S": "minecraft:string", "N": "minecraft:iron_nugget", "C": "minecraft:copper_ingot"},
                           "hollow:hollow_chime", unlock=["minecraft:copper_ingot", "minecraft:iron_nugget"]),
    "rowan_ward": shaped("rowan_ward", [" S ", "NCN", "NTN"],
                         {"S": "minecraft:string", "N": "minecraft:iron_nugget", "C": "minecraft:charcoal", "T": "minecraft:stick"},
                         "hollow:rowan_ward", unlock=["minecraft:charcoal", "minecraft:iron_nugget"]),
    "hollow_lens": shaped("hollow_lens", [" C ", "CGC", " R "],
                          {"C": "minecraft:copper_ingot", "G": "minecraft:glass_pane", "R": "hollow:pale_resin"},
                          "hollow:hollow_lens", unlock=["hollow:pale_resin"]),
    "heartseeker": shapeless("heartseeker", [("minecraft:compass", 1), ("hollow:pale_resin", 1), ("hollow:hollow_fang", 2)],
                             "hollow:heartseeker", unlock=["hollow:hollow_fang"]),
    "offering_of_silence": shaped("offering_of_silence", ["FRF", "HGN", " P "],
                                  {"F": "hollow:hollow_fang", "R": "hollow:pale_resin", "H": "hollow:borrowed_hide",
                                   "G": "minecraft:gold_ingot", "N": "hollow:knocker_nail", "P": "hollow:mire_pearl"},
                                  "hollow:offering_of_silence", unlock=["hollow:mire_pearl", "hollow:knocker_nail", "hollow:borrowed_hide"]),
    "heartwood_lantern": shapeless("heartwood_lantern", [("hollow:stilled_heart", 1), ("minecraft:lantern", 1)],
                                   "hollow:heartwood_lantern", unlock=["hollow:stilled_heart"]),
}

LANG_EXTRA = {
    "entity.hollow:watcher.name": "The Watcher",
    "entity.hollow:borrowed.name": "Sheep?",
    "entity.hollow:hollowed.name": "The Hollowed",
    "entity.hollow:knocker.name": "The Knocker",
    "entity.hollow:mirebound.name": "The Mirebound",
    "entity.hollow:heart_below.name": "The Heart Below",
    "entity.hollow:heart_vein.name": "Heart Vein",
    "entity.hollow:root_spike.name": "Root",
    "entity.hollow:lure.name": "Noise",
    "item.spawn_egg.entity.hollow:watcher.name": "Spawn The Watcher",
    "item.spawn_egg.entity.hollow:borrowed.name": "Spawn The Borrowed",
    "item.spawn_egg.entity.hollow:hollowed.name": "Spawn The Hollowed",
    "item.spawn_egg.entity.hollow:knocker.name": "Spawn The Knocker",
    "item.spawn_egg.entity.hollow:mirebound.name": "Spawn The Mirebound",
    "item.spawn_egg.entity.hollow:heart_below.name": "Spawn The Heart Below",
    "item.spawn_egg.entity.hollow:heart_vein.name": "Spawn Heart Vein",
    "item.spawn_egg.entity.hollow:root_spike.name": "Spawn Root",
    "item.spawn_egg.entity.hollow:lure.name": "Spawn Noise Marker",
    "pack.name": "THE HOLLOW: Survival Horror",
    "pack.description": "A beautiful wilderness where something is deeply wrong.",
}


def write(path, obj):
    ensure(os.path.dirname(path))
    with open(path, "w") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


def main():
    for ident, name, icon, comps, cat in ITEMS:
        write(os.path.join(BP, "items", f"{ident}.json"), item_json(ident, name, icon, comps, cat))
    for ident, name, icon in BLOCK_ITEMS:
        write(os.path.join(BP, "items", f"{ident}.json"), block_item_json(ident, name, icon))
    for ident, obj in BLOCKS.items():
        write(os.path.join(BP, "blocks", f"{ident}.json"), obj)
    for ident, obj in RECIPES.items():
        write(os.path.join(BP, "recipes", f"{ident}.json"), obj)
    write(os.path.join(BP, "loot_tables", "empty.json"), {"pools": []})

    item_tex = {f"hollow_{icon}": {"textures": f"textures/items/hollow/{icon}"} for _, _, icon, _, _ in ITEMS}
    item_tex.update({f"hollow_{icon}": {"textures": f"textures/items/hollow/{icon}"} for _, _, icon in BLOCK_ITEMS})
    write(os.path.join(RP, "textures", "item_texture.json"),
          {"resource_pack_name": "hollow", "texture_name": "atlas.items", "texture_data": item_tex})
    write(os.path.join(RP, "textures", "terrain_texture.json"),
          {"resource_pack_name": "hollow", "texture_name": "atlas.terrain", "padding": 8, "num_mip_levels": 4,
           "texture_data": {k: {"textures": v} for k, v in TERRAIN.items()}})
    # blocks.json: break/step sounds come from minecraft:sound in the block definitions
    write(os.path.join(RP, "blocks.json"), {"format_version": [1, 1, 0]})

    lang = {}
    for ident, name, *_ in ITEMS:
        lang[f"item.hollow:{ident}.name"] = name
    for ident, name in BLOCK_NAMES.items():
        lang[f"tile.hollow:{ident}.name"] = name
    lang.update(LANG_EXTRA)
    write(os.path.join(os.path.dirname(__file__), "lang_generated.json"), lang)


if __name__ == "__main__":
    main()
