import {
  Block, BlockPermutation, Dimension, EquipmentSlot, GameMode, ItemStack, Player, StartupEvent, Vector3, world,
} from "@minecraft/server";
import { ui, worldSound } from "../core/audio";
import { notice, particle } from "../core/fx";
import { BLOCK, DP, FAMILY, ITEM, PARTICLE, SND } from "../core/ids";
import { distSq } from "../core/math";
import { every } from "../core/scheduler";
import { readWorldArray, writeWorld } from "../core/store";
import { nightKey, now } from "../core/time";
import { block, getCustomState, withCustomState } from "../core/world";
import { useAltar } from "../creatures/heart";

// Placed equipment registry. Positions are stored in world dynamic properties so the chime loop
// never scans the world for blocks; each list is capped to keep the per-tick cost bounded.

export interface Spot {
  d: string;
  x: number;
  y: number;
  z: number;
}

const LIMITS = { [DP.chimes]: 32, [DP.wards]: 32, lanterns: 16 } as Record<string, number>;
const LANTERNS = "hollow:lanterns";
const cache = new Map<string, Spot[]>();

function list(key: string): Spot[] {
  let l = cache.get(key);
  if (!l) {
    l = readWorldArray<Spot>(key).filter((s) => typeof s?.x === "number");
    cache.set(key, l);
  }
  return l;
}

function persist(key: string): void {
  writeWorld(key, list(key));
}

const same = (s: Spot, d: Dimension, loc: Vector3) =>
  s.d === d.id && s.x === Math.floor(loc.x) && s.y === Math.floor(loc.y) && s.z === Math.floor(loc.z);

function register(key: string, b: Block, limit: number): boolean {
  const l = list(key);
  if (l.some((s) => same(s, b.dimension, b.location))) return true;
  if (l.length >= limit) return false;
  l.push({ d: b.dimension.id, x: b.location.x, y: b.location.y, z: b.location.z });
  persist(key);
  return true;
}

function unregister(key: string, d: Dimension, loc: Vector3): void {
  const l = list(key);
  const i = l.findIndex((s) => same(s, d, loc));
  if (i >= 0) {
    l.splice(i, 1);
    persist(key);
  }
}

function within(key: string, d: Dimension, loc: Vector3, radius: number): Spot[] {
  const r2 = radius * radius;
  return list(key).filter((s) => s.d === d.id && distSq({ x: s.x + 0.5, y: s.y + 0.5, z: s.z + 0.5 }, loc) <= r2);
}

const spotLoc = (s: Spot): Vector3 => ({ x: s.x + 0.5, y: s.y + 0.5, z: s.z + 0.5 });

// ------------------------------------------------------------------------------- wards

const WARD_RADIUS = 10;
const wardUses = new Map<string, number>(); // "x,y,z|creature|night" -> tick used

// The block stores charges *used* (default 0 = a freshly placed, fully charged ward).
function chargesOf(perm: BlockPermutation): number {
  const used = getCustomState(perm, "hollow:used");
  return 4 - (typeof used === "number" ? used : 0);
}

function wardCharges(b: Block | undefined): number {
  if (!b || b.typeId !== BLOCK.ward) return -1;
  return chargesOf(b.permutation);
}

function setWardCharges(b: Block, n: number): void {
  try {
    b.setPermutation(withCustomState(b.permutation, "hollow:used", 4 - Math.max(0, Math.min(4, n))));
  } catch {
    /* block changed */
  }
}

/** A charged ward within 10 blocks of loc, if any. */
export function wardNear(dim: Dimension, loc: Vector3): Block | undefined {
  for (const s of within(DP.wards, dim, loc, WARD_RADIUS)) {
    const b = block(dim, s);
    const c = wardCharges(b);
    if (c < 0) {
      unregister(DP.wards, dim, s);
      continue;
    }
    if (c > 0) return b;
  }
  return undefined;
}

/**
 * Spend one charge to turn a creature away. Each ward spends at most one charge per creature
 * type per night, so a single persistent visitor can't drain it.
 */
export function useWard(ward: Block, creature: string): void {
  const key = `${ward.location.x},${ward.location.y},${ward.location.z}|${creature}|${nightKey()}`;
  const loc = ward.center();
  worldSound(ward.dimension, SND.wardRepel, loc);
  particle(ward.dimension, PARTICLE.wardGlow, loc);
  if (wardUses.has(key)) return;
  wardUses.set(key, now());
  if (wardUses.size > 256) wardUses.clear();
  const c = wardCharges(ward);
  setWardCharges(ward, c - 1);
  if (c - 1 <= 0) worldSound(ward.dimension, SND.wardSpent, loc);
}

// ------------------------------------------------------------------------------- lanterns

export function lanternNear(dim: Dimension, loc: Vector3, radius = 24): boolean {
  for (const s of within(LANTERNS, dim, loc, radius)) {
    const b = block(dim, s);
    if (b?.typeId === BLOCK.lantern) return true;
    unregister(LANTERNS, dim, s);
  }
  return false;
}

/** Heartwood Lantern protection at a location (used by every creature's spawn checks). */
export function protectedSpot(dim: Dimension, loc: Vector3): boolean {
  return lanternNear(dim, loc);
}

// ------------------------------------------------------------------------------- chimes

const chimeCooldown = new Map<string, number>();

function ringChimes(): void {
  const l = list(DP.chimes);
  if (l.length === 0) return;
  const t = now();
  for (const s of [...l]) {
    let dim: Dimension;
    try {
      dim = world.getDimension(s.d);
    } catch {
      continue;
    }
    const loc = spotLoc(s);
    try {
      if (!dim.isChunkLoaded(loc)) continue;
    } catch {
      continue;
    }
    const key = `${s.d}|${s.x},${s.y},${s.z}`;
    if ((chimeCooldown.get(key) ?? 0) > t) continue;
    if (dim.getPlayers({ location: loc, maxDistance: 64 }).length === 0) continue;
    const b = block(dim, s);
    if (!b || b.typeId !== BLOCK.chime) {
      unregister(DP.chimes, dim, s);
      continue;
    }
    if (getCustomState(b.permutation, "hollow:silenced") === 1) continue;
    const near = dim.getEntities({ location: loc, maxDistance: 14, families: [FAMILY.creature] });
    if (near.length === 0) continue;
    chimeCooldown.set(key, t + 120);
    worldSound(dim, SND.chime, loc, 0.9, 0.95 + Math.random() * 0.1);
    particle(dim, PARTICLE.chimeRing, loc);
  }
}

// ------------------------------------------------------------------------------- components

function isSurvivalish(p: Player): boolean {
  const gm = p.getGameMode();
  return gm === GameMode.Survival || gm === GameMode.Adventure;
}

export function registerBlockComponents(ev: StartupEvent): void {
  ev.blockComponentRegistry.registerCustomComponent("hollow:chime", {
    onPlace(e) {
      if (!register(DP.chimes, e.block, LIMITS[DP.chimes])) {
        for (const p of e.dimension.getPlayers({ location: e.block.location, maxDistance: 8 })) {
          notice(p, "§7This world already has 32 active chimes. This one will stay silent.");
        }
      }
    },
    onPlayerBreak(e) {
      unregister(DP.chimes, e.dimension, e.block.location);
    },
    onBreak(e) {
      unregister(DP.chimes, e.dimension, e.block.location);
    },
    onPlayerInteract(e) {
      const b = e.block;
      const silenced = getCustomState(b.permutation, "hollow:silenced") === 1;
      try {
        b.setPermutation(withCustomState(b.permutation, "hollow:silenced", silenced ? 0 : 1));
      } catch {
        return;
      }
      if (e.player) {
        ui(e.player, SND.chime, 0.35, silenced ? 1.2 : 0.7);
        notice(e.player, silenced ? "§7Chime unsilenced." : "§7Chime silenced.");
      }
    },
  });

  ev.blockComponentRegistry.registerCustomComponent("hollow:ward", {
    onPlace(e) {
      register(DP.wards, e.block, LIMITS[DP.wards]);
      worldSound(e.dimension, SND.wardPlace, e.block.center());
    },
    onPlayerBreak(e) {
      unregister(DP.wards, e.dimension, e.block.location);
      // An untouched ward picks back up whole; a used one falls apart into salvage, so
      // breaking and re-placing can never refill charges (use charcoal for that).
      const p = e.player;
      if (!p || !isSurvivalish(p)) return;
      const c = chargesOf(e.brokenBlockPermutation);
      const at = e.block.center();
      const drops = c === 4
        ? [new ItemStack(ITEM.ward, 1)]
        : [new ItemStack("minecraft:iron_nugget", 2), new ItemStack("minecraft:string", 1)];
      for (const d of drops) e.dimension.spawnItem(d, at);
    },
    onBreak(e) {
      unregister(DP.wards, e.dimension, e.block.location);
    },
    onPlayerInteract(e) {
      const p = e.player;
      if (!p) return;
      const b = e.block;
      const c = wardCharges(b);
      const eq = p.getComponent("minecraft:equippable");
      const held = eq?.getEquipment(EquipmentSlot.Mainhand);
      if (held?.typeId === "minecraft:charcoal" && c < 4) {
        setWardCharges(b, c + 1);
        if (isSurvivalish(p)) {
          if (held.amount > 1) {
            held.amount -= 1;
            eq!.setEquipment(EquipmentSlot.Mainhand, held);
          } else eq!.setEquipment(EquipmentSlot.Mainhand, undefined);
        }
        register(DP.wards, b, LIMITS[DP.wards]);
        worldSound(e.dimension, SND.wardPlace, b.center(), 0.8, 1.2);
        particle(e.dimension, PARTICLE.wardGlow, b.center());
        notice(p, `§7The ward smoulders. Charges: §f${c + 1}/4`);
      } else {
        notice(p, c > 0 ? `§7Rowan Ward · charges §f${c}/4§7 · add charcoal to recharge` : "§7The ward is spent. Use charcoal on it to rekindle it.");
      }
    },
  });

  ev.blockComponentRegistry.registerCustomComponent("hollow:altar", {
    onPlayerInteract(e) {
      const p = e.player;
      if (p) useAltar(p, e.block);
    },
  });

  ev.blockComponentRegistry.registerCustomComponent("hollow:lantern", {
    onPlace(e) {
      register(LANTERNS, e.block, LIMITS.lanterns);
    },
    onPlayerBreak(e) {
      unregister(LANTERNS, e.dimension, e.block.location);
    },
    onBreak(e) {
      unregister(LANTERNS, e.dimension, e.block.location);
    },
  });
}

export function startBlockSystems(): void {
  every("chimes", 40, ringChimes, 7);
}

export function permutationOf(id: string, states: Record<string, string | number | boolean>): BlockPermutation {
  return BlockPermutation.resolve(id, states);
}
