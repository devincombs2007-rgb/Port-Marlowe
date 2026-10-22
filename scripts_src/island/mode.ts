import { Dimension, world } from "@minecraft/server";
import { CRASH_CONTAINERS, CRASH_SMOKE } from "../content/island_layout";
import { DP } from "../core/ids";

// Varrow Island mode. The island story only runs in the prebuilt Varrow Island world: the same
// add-on dropped into any other world keeps THE HOLLOW's original forest experience.
//
// The world is recognised by the crash site the world builder wrote (the supply barrels and the
// signal fires over hay at fixed coordinates). Once recognised, a world flag makes it permanent.

let cached: boolean | undefined;

export function isIsland(): boolean {
  if (cached === undefined) cached = world.getDynamicProperty(DP.island) === 1;
  return cached;
}

export function setIsland(on: boolean): void {
  cached = on;
  world.setDynamicProperty(DP.island, on ? 1 : 0);
}

/** Look for the crash site's signature blocks. Returns true when this world is Varrow Island.
 * Needs the crash-site chunk to be loaded (it is: players spawn beside the wreck). */
export function detectIsland(dim: Dimension): boolean {
  if (isIsland()) return true;
  if (world.getDynamicProperty(DP.island) === 0) return false; // decided earlier (or switched off)
  try {
    const c = CRASH_CONTAINERS[0];
    const s = CRASH_SMOKE[0];
    if (!c || !s) return false;
    if (!dim.isChunkLoaded(c) || !dim.isChunkLoaded(s)) return false;
    const barrel = dim.getBlock(c)?.typeId === "minecraft:barrel";
    const fire = dim.getBlock(s)?.typeId === "minecraft:campfire";
    const hay = dim.getBlock({ x: s.x, y: s.y - 1, z: s.z })?.typeId === "minecraft:hay_block";
    if (barrel && fire && hay) {
      setIsland(true);
      return true;
    }
  } catch {
    /* chunk not ready */
  }
  return false;
}

/** Test/maintenance hook: forget the cached value (simulation reboots). */
export function resetIslandCache(): void {
  cached = undefined;
}
