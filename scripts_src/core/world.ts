import { Block, BlockPermutation, BlockVolume, Dimension, EquipmentSlot, Player, Vector3 } from "@minecraft/server";
import { BLOCK, ITEM } from "./ids";
import { add, dist, len, norm, sub } from "./math";

// Environment queries. Everything here is bounded (fixed small volumes or a handful of block
// reads) so it is safe to call from staggered per-player updates on Xbox and Realms.

export const DOORS = [
  "minecraft:wooden_door", "minecraft:spruce_door", "minecraft:birch_door", "minecraft:jungle_door",
  "minecraft:acacia_door", "minecraft:dark_oak_door", "minecraft:mangrove_door", "minecraft:cherry_door",
  "minecraft:bamboo_door", "minecraft:pale_oak_door", "minecraft:poplar_door", "minecraft:crimson_door",
  "minecraft:warped_door", "minecraft:iron_door", "minecraft:copper_door", "minecraft:exposed_copper_door",
  "minecraft:weathered_copper_door", "minecraft:oxidized_copper_door", "minecraft:waxed_copper_door",
  "minecraft:waxed_exposed_copper_door", "minecraft:waxed_weathered_copper_door", "minecraft:waxed_oxidized_copper_door",
];

export const WOODEN_DOORS = DOORS.filter((d) => !d.includes("iron") && !d.includes("copper"));

export const LIGHT_BLOCKS = [
  "minecraft:torch", "minecraft:soul_torch", "minecraft:copper_torch", "minecraft:lantern", "minecraft:soul_lantern",
  "minecraft:copper_lantern", "minecraft:exposed_copper_lantern", "minecraft:weathered_copper_lantern",
  "minecraft:oxidized_copper_lantern", "minecraft:waxed_copper_lantern", "minecraft:waxed_exposed_copper_lantern",
  "minecraft:waxed_weathered_copper_lantern", "minecraft:waxed_oxidized_copper_lantern", "minecraft:campfire",
  "minecraft:soul_campfire", "minecraft:glowstone", "minecraft:sea_lantern", "minecraft:shroomlight",
  "minecraft:ochre_froglight", "minecraft:verdant_froglight", "minecraft:pearlescent_froglight", "minecraft:lit_pumpkin",
  "minecraft:lit_redstone_lamp", "minecraft:end_rod", "minecraft:beacon", "minecraft:lit_furnace",
  "minecraft:lit_smoker", "minecraft:lit_blast_furnace", BLOCK.lantern,
];

export const LIGHT_ITEMS = new Set([
  "minecraft:torch", "minecraft:soul_torch", "minecraft:copper_torch", "minecraft:lantern", "minecraft:soul_lantern",
  "minecraft:copper_lantern", "minecraft:exposed_copper_lantern", "minecraft:weathered_copper_lantern",
  "minecraft:oxidized_copper_lantern", "minecraft:waxed_copper_lantern", "minecraft:waxed_exposed_copper_lantern",
  "minecraft:waxed_weathered_copper_lantern", "minecraft:waxed_oxidized_copper_lantern", ITEM.lantern,
]);

export const LOGS = [
  "minecraft:oak_log", "minecraft:spruce_log", "minecraft:birch_log", "minecraft:jungle_log", "minecraft:acacia_log",
  "minecraft:dark_oak_log", "minecraft:mangrove_log", "minecraft:cherry_log", "minecraft:pale_oak_log", "minecraft:poplar_log",
];

/** Blocks that almost never generate naturally: used to keep sites away from player builds. */
export const BUILT_BLOCKS = [
  "minecraft:oak_planks", "minecraft:spruce_planks", "minecraft:birch_planks", "minecraft:jungle_planks",
  "minecraft:acacia_planks", "minecraft:dark_oak_planks", "minecraft:mangrove_planks", "minecraft:cherry_planks",
  "minecraft:bamboo_planks", "minecraft:pale_oak_planks", "minecraft:crafting_table", "minecraft:furnace",
  "minecraft:lit_furnace", "minecraft:chest", "minecraft:barrel", "minecraft:bed", "minecraft:glass",
  "minecraft:glass_pane", "minecraft:cobblestone", "minecraft:stone_bricks", "minecraft:brick_block",
  "minecraft:torch", "minecraft:lantern", "minecraft:white_wool", "minecraft:farmland", "minecraft:smooth_stone",
  ...DOORS,
];

const FOREST = new Set([
  "forest", "forest_hills", "flower_forest", "birch_forest", "birch_forest_hills", "birch_forest_mutated",
  "birch_forest_hills_mutated", "roofed_forest", "roofed_forest_mutated", "dappled_forest", "pale_garden", "taiga",
  "taiga_hills", "taiga_mutated", "mega_taiga", "mega_taiga_hills", "redwood_taiga_mutated", "redwood_taiga_hills_mutated",
  "cold_taiga", "cold_taiga_hills", "cold_taiga_mutated", "grove", "extreme_hills_plus_trees",
  "extreme_hills_plus_trees_mutated", "jungle_edge", "cherry_grove",
]);
const SWAMP = new Set(["swampland", "swampland_mutated", "mangrove_swamp"]);
const SHORE = new Set(["river", "beach", "stone_beach", "frozen_river", "cold_beach"]);
const OPEN = new Set(["plains", "sunflower_plains", "meadow", "savanna", "savanna_mutated", "savanna_plateau", "ice_plains"]);

export type BiomeGroup = "forest" | "swamp" | "shore" | "open" | "cave" | "other";

export function biomeGroup(dim: Dimension, loc: Vector3): BiomeGroup {
  try {
    const id = dim.getBiome(loc).id.replace("minecraft:", "");
    if (FOREST.has(id)) return "forest";
    if (SWAMP.has(id)) return "swamp";
    if (SHORE.has(id)) return "shore";
    if (OPEN.has(id)) return "open";
    if (id === "lush_caves" || id === "dripstone_caves" || id === "deep_dark" || id === "sulfur_caves") return "cave";
    return "other";
  } catch {
    return "other";
  }
}

export function block(dim: Dimension, loc: Vector3): Block | undefined {
  try {
    return dim.getBlock(loc);
  } catch {
    return undefined;
  }
}

/** True for air and non-colliding plants that an entity can stand inside. */
export function passable(b: Block | undefined): boolean {
  if (!b) return false;
  if (b.isAir) return true;
  if (b.isLiquid) return false;
  const id = b.typeId;
  return (
    id === "minecraft:short_grass" || id === "minecraft:tall_grass" || id === "minecraft:fern" ||
    id === "minecraft:large_fern" || id === "minecraft:snow_layer" || id === "minecraft:deadbush" ||
    id.endsWith("_flower") || id === "minecraft:poppy" || id === "minecraft:dandelion" || id === "minecraft:leaf_litter" ||
    id === "minecraft:bush" || id === "minecraft:short_dry_grass" || id === "minecraft:tall_dry_grass" || id === "minecraft:firefly_bush"
  );
}

export function solidGround(b: Block | undefined): boolean {
  if (!b || b.isAir || b.isLiquid) return false;
  const id = b.typeId;
  if (id.includes("leaves") || id.includes("_log") || id.includes("fence") || id.includes("door")) return false;
  return !passable(b);
}

/**
 * Find standable ground in the column near yHint (so forests resolve to the forest floor, not
 * the canopy). Requires `headroom` passable blocks above the ground block.
 */
export function groundNear(dim: Dimension, x: number, yHint: number, z: number, range = 10, headroom = 3): Vector3 | undefined {
  const fx = Math.floor(x), fz = Math.floor(z), fy = Math.floor(yHint);
  for (let i = 0; i <= range * 2; i++) {
    const dy = i % 2 === 0 ? i / 2 : -(i + 1) / 2;
    const y = fy + dy;
    const g = block(dim, { x: fx, y: y - 1, z: fz });
    if (!solidGround(g)) continue;
    let ok = true;
    for (let h = 0; h < headroom; h++) {
      if (!passable(block(dim, { x: fx, y: y + h, z: fz }))) {
        ok = false;
        break;
      }
    }
    if (ok) return { x: fx + 0.5, y, z: fz + 0.5 };
  }
  return undefined;
}

/** Line of sight between two points that ignores grass/flowers but not leaves or walls. */
export function clearLine(dim: Dimension, from: Vector3, to: Vector3): boolean {
  const d = sub(to, from);
  const L = len(d);
  if (L < 0.5) return true;
  try {
    const hit = dim.getBlockFromRay(from, norm(d), { maxDistance: L, includePassableBlocks: false, includeLiquidBlocks: false });
    if (!hit) return true;
    const hp = add(hit.block.location, hit.faceLocation);
    return dist(from, hp) >= L - 0.75;
  } catch {
    return false;
  }
}

export function holdingLight(player: Player): boolean {
  try {
    const eq = player.getComponent("minecraft:equippable");
    if (!eq) return false;
    const main = eq.getEquipment(EquipmentSlot.Mainhand);
    const off = eq.getEquipment(EquipmentSlot.Offhand);
    return (!!main && LIGHT_ITEMS.has(main.typeId)) || (!!off && LIGHT_ITEMS.has(off.typeId));
  } catch {
    return false;
  }
}

export function heldItem(player: Player): string | undefined {
  try {
    return player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand)?.typeId;
  } catch {
    return undefined;
  }
}

export function volumeAround(c: Vector3, rx: number, ry: number, rz: number): BlockVolume {
  const x = Math.floor(c.x), y = Math.floor(c.y), z = Math.floor(c.z);
  return new BlockVolume({ x: x - rx, y: y - ry, z: z - rz }, { x: x + rx, y: y + ry, z: z + rz });
}

export function hasBlockNear(dim: Dimension, c: Vector3, types: string[], rx: number, ry: number, rz: number): boolean {
  try {
    return dim.containsBlock(volumeAround(c, rx, ry, rz), { includeTypes: types }, false);
  } catch {
    return false;
  }
}

export function findBlocks(dim: Dimension, c: Vector3, types: string[], rx: number, ry: number, rz: number, max = 16): Vector3[] {
  const out: Vector3[] = [];
  try {
    const list = dim.getBlocks(volumeAround(c, rx, ry, rz), { includeTypes: types }, false);
    for (const loc of list.getBlockLocationIterator()) {
      out.push(loc);
      if (out.length >= max) break;
    }
  } catch {
    /* unloaded */
  }
  return out;
}

/** Near a placed light source (torches, lanterns, campfires...) within a small radius. */
export function inLitArea(player: Player, radius = 5): boolean {
  return hasBlockNear(player.dimension, player.location, LIGHT_BLOCKS, radius, 2, radius);
}

/** Roof above the head (any solid block within 6) - used for "inside a shelter". */
export function roofed(player: Player): boolean {
  try {
    const hit = player.dimension.getBlockFromRay(player.getHeadLocation(), { x: 0, y: 1, z: 0 }, {
      maxDistance: 6, includePassableBlocks: false, includeLiquidBlocks: false,
    });
    return !!hit;
  } catch {
    return false;
  }
}

/** Deep under terrain: more than 7 blocks of world above and no sky light at the head. */
export function underground(player: Player): boolean {
  const dim = player.dimension;
  const head = player.getHeadLocation();
  try {
    if (dim.getSkyLightLevel(head) > 0) return false;
    const top = dim.getTopmostBlock({ x: head.x, z: head.z });
    return !!top && top.location.y > head.y + 7;
  } catch {
    return false;
  }
}

export function isOverworld(dim: Dimension): boolean {
  return dim.id === "minecraft:overworld";
}

export function nearbyPlayers(dim: Dimension, loc: Vector3, radius: number): Player[] {
  try {
    return dim.getPlayers({ location: loc, maxDistance: radius });
  } catch {
    return [];
  }
}

// Custom block states are not part of the vanilla state typings, so access them through a
// narrow, explicitly typed view of the permutation API.
type StateValue = string | number | boolean;
interface LoosePermutation {
  getState(name: string): StateValue | undefined;
  withState(name: string, value: StateValue): BlockPermutation;
}

export function getCustomState(perm: BlockPermutation, name: string): StateValue | undefined {
  try {
    return (perm as unknown as LoosePermutation).getState(name);
  } catch {
    return undefined;
  }
}

export function withCustomState(perm: BlockPermutation, name: string, value: StateValue): BlockPermutation {
  return (perm as unknown as LoosePermutation).withState(name, value);
}
