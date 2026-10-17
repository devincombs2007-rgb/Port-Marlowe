import { Entity, EntityComponentTypes, GameMode, Player, world, type Block, type Dimension } from "@minecraft/server";
import type { Vec3 } from "../util/vec";
import { len, normalize, sub, viewAlignment } from "../util/vec";
import type { Rng } from "../util/rng";
import { range } from "../util/rng";

/** Runs `fn`, returning `fallback` if the game throws (unloaded chunk, invalidated entity, ...). */
export function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function isPlayerSurvivalish(p: Player): boolean {
  const m = safe(() => p.getGameMode(), GameMode.Survival);
  return m === GameMode.Survival || m === GameMode.Adventure;
}

export function health(e: Entity): { cur: number; max: number } {
  return safe(() => {
    const h = e.getComponent(EntityComponentTypes.Health);
    return h ? { cur: h.currentValue, max: h.effectiveMax } : { cur: 20, max: 20 };
  }, { cur: 20, max: 20 });
}

export function dimensionKind(d: Dimension): "overworld" | "nether" | "end" | "other" {
  const id = d.id;
  if (id === "minecraft:overworld") return "overworld";
  if (id === "minecraft:nether") return "nether";
  if (id === "minecraft:the_end") return "end";
  return "other";
}

/** Does `viewer` have `target` in a forward cone with an unobstructed line of sight? */
export function canSee(viewer: Player, target: Entity, minCos = 0.5): boolean {
  return safe(() => {
    const eye = viewer.getHeadLocation();
    const aim = target.location;
    const chest: Vec3 = { x: aim.x, y: aim.y + 1.6, z: aim.z };
    if (viewAlignment(eye, viewer.getViewDirection(), chest) < minCos) return false;
    const to = sub(chest, eye);
    const dist = len(to);
    if (dist < 0.5) return true;
    const hit = viewer.dimension.getBlockFromRay(eye, normalize(to), { maxDistance: dist - 0.5, includeLiquidBlocks: false, includePassableBlocks: false });
    return hit === undefined;
  }, false);
}

/** Blocks an entity walks through. Block.isSolid is not in the stable API, so this is name-based. */
const SOFT = /(short_grass|tall_grass|^minecraft:fern|large_fern|flower|sapling|vine|snow_layer|dead_bush|mushroom|carpet|torch|_rail$|^minecraft:rail|sugar_cane|petals|sweet_berry|seagrass|kelp|web|^minecraft:fire|button|pressure_plate|_sign$|lever|tripwire|candle|lichen|hanging_roots|^minecraft:roots|pointed_dripstone|^minecraft:light_block|^minecraft:structure_void)/;
const isPassable = (b: Block | undefined): boolean => b !== undefined && !b.isLiquid && (b.isAir || SOFT.test(b.typeId));
const isFloor = (b: Block | undefined): boolean => b !== undefined && !b.isAir && !b.isLiquid && !SOFT.test(b.typeId);

/** Finds a 3-high standing spot. Outdoors uses the surface; underground searches the player's own level. */
export function findStandingSpot(d: Dimension, x: number, z: number, nearY: number, underground: boolean): Vec3 | undefined {
  return safe(() => {
    if (!underground) {
      const top = d.getTopmostBlock({ x, z });
      if (!top) return undefined;
      let y = top.location.y + 1;
      if (SOFT.test(top.typeId)) y -= 1; // standing among plants: the floor is the block below them
      if (!isFloor(d.getBlock({ x, y: y - 1, z }))) return undefined;
      if (![0, 1, 2].every((dy) => isPassable(d.getBlock({ x, y: y + dy, z })))) return undefined;
      return { x: x + 0.5, y, z: z + 0.5 };
    }
    for (let dy = 0; dy <= 5; dy++) {
      for (const sgn of dy === 0 ? [1] : [1, -1]) {
        const y = Math.floor(nearY) + dy * sgn;
        if (!isFloor(d.getBlock({ x, y: y - 1, z }))) continue;
        if ([0, 1, 2].every((k) => isPassable(d.getBlock({ x, y: y + k, z })))) return { x: x + 0.5, y, z: z + 0.5 };
      }
    }
    return undefined;
  }, undefined);
}

const COVER = /(_log|_leaves|_wood|stem|fence|wall|stone_brick|cobblestone|dripstone)/;

/** Picks a place for a Lurker to stand: far enough to be unnerving, preferably with cover and a glimpse of it. */
export function findVantage(player: Player, minDist: number, maxDist: number, underground: boolean, rng: Rng): Vec3 | undefined {
  const d = player.dimension;
  const origin = player.location;
  let best: { pos: Vec3; score: number } | undefined;
  for (let i = 0; i < 14; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = range(rng, minDist, maxDist);
    const x = Math.floor(origin.x + Math.cos(angle) * dist);
    const z = Math.floor(origin.z + Math.sin(angle) * dist);
    const pos = findStandingSpot(d, x, z, origin.y, underground);
    if (!pos) continue;
    let score = rng.next() * 0.5;
    safe(() => {
      const eye = player.getHeadLocation();
      const head: Vec3 = { x: pos.x, y: pos.y + 2.2, z: pos.z };
      const to = sub(head, eye);
      const l = len(to);
      const hit = d.getBlockFromRay(eye, normalize(to), { maxDistance: l - 1, includeLiquidBlocks: false, includePassableBlocks: false });
      score += hit === undefined ? 2 : 0; // a clear (but distant) silhouette is the point
      let cover = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]] as const) {
        const b = d.getBlock({ x: Math.floor(pos.x) + dx, y: Math.floor(pos.y) + 1, z: Math.floor(pos.z) + dz });
        if (b && COVER.test(b.typeId)) cover++;
      }
      score += Math.min(cover, 3) * 0.6;
    }, undefined);
    if (!best || score > best.score) best = { pos, score };
  }
  return best?.pos;
}

export function allPlayersNear(p: Player, radius: number): number {
  return safe(() => world.getAllPlayers().filter((o) => o.id !== p.id && o.dimension.id === p.dimension.id && isPlayerSurvivalish(o) && len(sub(o.location, p.location)) <= radius).length, 0);
}
