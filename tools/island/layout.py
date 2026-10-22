"""Varrow Island layout: one source of truth for terrain, structures and the story scripts.

World coordinates: +x east, -z north. Sea level: water surface at y = 62.
tools/island/build_island.py writes these to scripts_src/content/island_layout.ts.
"""

SEA = 62            # top water block
FLOOR = 40          # flat-ocean floor beyond the island (matches FLAT_LAYERS)
RADIUS = 300        # nominal island radius
REGION = 26         # chunks either side of 0 written into the world (832 x 832 blocks)

GZ = (112, -12)               # Ground Zero: centre of the airburst (crater)
CRATER_R = 44                 # rim radius
CRASH = (-24, 262)            # helicopter wreck on Crash Beach
SPAWN = (-30, 252)            # where you wake up
PENS = (20, -40)
MOCK_TOWN = (-64, 44)
BLACKWOOD = (-200, 20)
SUNFALL = (-150, -178)
MANGROVES = (236, 40)
NORTH_PEAK = (18, -226)
TOWER = (18, -232)            # radio relay on the peak
DOCK = (192, 258)
BUNKERS = {"bunker1": (70, -98), "bunker2": (-104, -62), "bunker3": (178, -150)}
STATIONS = {
    "station1": (112 + 52, -12),      # crater rim, east
    "station2": (20, -40 + 22),       # the Pens
    "station3": (-64, 44 - 26),       # Mock Town square
    "station4": (-186, 12),           # Blackwood
    "station5": (236, 70),            # Mangrove Shallows
    "station6": (18, -206),           # below the North Peak
}
# 1957 diorama for the opening cinematic, far out to sea (never visible from the island)
DIORAMA = (2400, 0)
DIORAMA_R = 96

FLAT_LAYERS = {
    "biome_id": 40,  # warm_ocean
    "block_layers": [
        {"block_name": "minecraft:bedrock", "count": 1},
        {"block_name": "minecraft:stone", "count": 100},
        {"block_name": "minecraft:sand", "count": 4},
        {"block_name": "minecraft:water", "count": 22},
    ],
    "encoding_version": 6,
    "structure_options": None,
    "world_version": "version.post_1_18",
}

BIOME = {
    "warm_ocean": 40, "beach": 16, "forest": 4, "plains": 1, "roofed_forest": 29, "meadow": 186,
    "stony_peaks": 189, "mangrove_swamp": 191, "savanna_mutated": 163, "mushroom_island_shore": 15,
    "birch_forest": 27, "jungle_edge": 23, "lukewarm_ocean": 42,
}
# The crater lake uses mushroom_island_shore and the blast ring savanna_mutated: neither occurs
# anywhere else on the island, and the packs give both their own toxic / scorched look.
TOXIC_BIOME = "mushroom_island_shore"
SCORCHED_BIOME = "savanna_mutated"
