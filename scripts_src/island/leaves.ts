import { ItemStack, Vector3, system, world } from "@minecraft/server";
import { safe } from "../core/scheduler";
import { isIsland } from "./mode";

// The island's trees were grown by the world builder with persistent leaves (so palms and wide
// canopies keep their shape). Persistent leaves never decay, so after a log is cut this does what
// the game would have: leaves with no log within four blocks fall over the next few seconds,
// sometimes dropping a stick, a sapling or an apple.

const LOG = (id: string) => id.endsWith("_log") || id.endsWith("_wood");
const LEAF = (id: string) => id.endsWith("_leaves");
const SAPLING: Record<string, string> = {
  "minecraft:oak_leaves": "minecraft:oak_sapling", "minecraft:birch_leaves": "minecraft:birch_sapling",
  "minecraft:spruce_leaves": "minecraft:spruce_sapling", "minecraft:jungle_leaves": "minecraft:jungle_sapling",
  "minecraft:dark_oak_leaves": "minecraft:dark_oak_sapling", "minecraft:mangrove_leaves": "minecraft:mangrove_propagule",
};

/** Leaves around a cut log that no longer have a tree, nearest first. One scan of the area. */
export function decayAround(at: Vector3): number {
  const dim = world.getDimension("overworld");
  const logs: Vector3[] = [];
  const leaves: Vector3[] = [];
  for (let dx = -9; dx <= 9; dx++) for (let dy = -6; dy <= 10; dy++) for (let dz = -9; dz <= 9; dz++) {
    const p = { x: at.x + dx, y: at.y + dy, z: at.z + dz };
    let id: string | undefined;
    try {
      id = dim.getBlock(p)?.typeId;
    } catch {
      return 0; // part of it is unloaded: leave the whole thing alone
    }
    if (!id) continue;
    if (LOG(id)) logs.push(p);
    else if (LEAF(id) && Math.abs(dx) <= 5 && dy >= -3 && dy <= 7 && Math.abs(dz) <= 5) leaves.push(p);
  }
  const supported = (p: Vector3) => logs.some((l) => {
    const ax = Math.abs(l.x - p.x), ay = Math.abs(l.y - p.y), az = Math.abs(l.z - p.z);
    return ax <= 4 && ay <= 4 && az <= 4 && ax + ay + az <= 6;
  });
  const doomed = leaves.filter((p) => !supported(p)).slice(0, 260);
  doomed.sort((a, b) => Math.hypot(a.x - at.x, a.z - at.z) - Math.hypot(b.x - at.x, b.z - at.z));
  let i = 0;
  const run = system.runInterval(() => safe("leaves.fall", () => {
    for (let k = 0; k < 6; k++) {
      const p = doomed[i++];
      if (!p) {
        system.clearRun(run);
        return;
      }
      const b = dim.getBlock(p);
      if (!b || !LEAF(b.typeId)) continue;
      const id = b.typeId;
      b.setType("minecraft:air");
      const r = Math.random();
      const drop = r < 0.05 ? SAPLING[id] : r < 0.08 ? "minecraft:stick" : r < 0.09 && id === "minecraft:oak_leaves" ? "minecraft:apple" : undefined;
      if (drop) dim.spawnItem(new ItemStack(drop, 1), { x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 });
    }
  }), 2);
  return doomed.length;
}

export function startLeaves(): void {
  world.afterEvents.playerBreakBlock.subscribe((ev) => safe("leaves", () => {
    if (!isIsland() || ev.dimension.id !== "minecraft:overworld") return;
    const id = ev.brokenBlockPermutation.type.id;
    if (!LOG(id)) return;
    const at = ev.block.location;
    system.runTimeout(() => safe("leaves.decay", () => void decayAround(at)), 30);
  }));
}
