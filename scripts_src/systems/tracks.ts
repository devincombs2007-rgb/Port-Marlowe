import { BlockPermutation, Dimension, Entity, Player, Vector3, world } from "@minecraft/server";
import { BLOCK, DP } from "../core/ids";
import { distSq } from "../core/math";
import { every, everyPlayer } from "../core/scheduler";
import { readWorldArray, writeWorld } from "../core/store";
import { block } from "../core/world";
import { unlock } from "./journal";

// TRACKS: the morning-after evidence. Creatures press prints into natural ground as they move:
// the Watcher's root-toed prints where it stood at the treeline, the Knocker's bare feet coming out of
// the woods to your door, the Mirebound's wet drag at the water's edge, the Borrowed's hooves turning
// into claws. Tracks are a thin decal block that never replaces anything (only air above natural
// ground), can be broken or built over, and fade after one in-game day. At most 96 exist at once.

export const enum TrackKind {
  Watcher = 0,
  Knocker = 1,
  Drag = 2,
  Borrowed = 3,
}

interface Track {
  d: string;
  x: number;
  y: number;
  z: number;
  /** world absolute time when pressed */
  t: number;
}

const CAP = 96;
const LIFETIME = 24000; // one in-game day
const GROUND = new Set([
  "minecraft:grass_block", "minecraft:dirt", "minecraft:coarse_dirt", "minecraft:podzol", "minecraft:mycelium",
  "minecraft:dirt_with_roots", "minecraft:mud", "minecraft:moss_block", "minecraft:sand", "minecraft:red_sand",
  "minecraft:gravel", "minecraft:clay", "minecraft:snow", "minecraft:grass_path", "minecraft:pale_moss_block",
]);

let tracks: Track[] | undefined;
const lastPrint = new Map<string, Vector3>();

function list(): Track[] {
  if (!tracks) tracks = readWorldArray<Track>(DP.tracks).filter((t) => typeof t?.x === "number");
  return tracks;
}

function persist(): void {
  writeWorld(DP.tracks, list());
}

function dirOf(v: Vector3): number {
  // 0 north (-z), 1 east (+x), 2 south (+z), 3 west (-x)
  return Math.abs(v.x) > Math.abs(v.z) ? (v.x > 0 ? 1 : 3) : v.z > 0 ? 2 : 0;
}

/** Press one print at `at` facing `facing`, if the spot is natural ground with open air above. */
export function pressTrack(dim: Dimension, at: Vector3, kind: TrackKind, facing: Vector3): boolean {
  const cell = { x: Math.floor(at.x), y: Math.floor(at.y), z: Math.floor(at.z) };
  const here = block(dim, cell);
  const below = block(dim, { x: cell.x, y: cell.y - 1, z: cell.z });
  if (!here || !below || !here.isAir || !GROUND.has(below.typeId)) return false;
  const l = list();
  if (l.some((t) => t.d === dim.id && distSq(t, cell) < 1.5)) return false; // one print per spot
  if (l.length >= CAP && !removeOldest()) return false;
  try {
    here.setPermutation(BlockPermutation.resolve(BLOCK.tracks, { "hollow:kind": kind, "hollow:dir": dirOf(facing) }));
  } catch {
    return false;
  }
  l.push({ d: dim.id, x: cell.x, y: cell.y, z: cell.z, t: world.getAbsoluteTime() });
  persist();
  return true;
}

/** Call from a creature's update loop: prints follow it at a natural stride. */
export function trail(e: Entity, kind: TrackKind, stride = 2.2): void {
  if (!e.isValid) return;
  const loc = e.location;
  const last = lastPrint.get(e.id);
  if (last && distSq(last, loc) < stride * stride) return;
  const facing = last ? { x: loc.x - last.x, y: 0, z: loc.z - last.z } : e.getViewDirection();
  lastPrint.set(e.id, { ...loc });
  if (lastPrint.size > 64) lastPrint.clear();
  pressTrack(e.dimension, loc, kind, facing);
}

/** A few prints around a spot where something stood for a long time. */
export function standingPrints(e: Entity, kind: TrackKind): void {
  if (!e.isValid) return;
  const loc = e.location;
  const f = e.getViewDirection();
  pressTrack(e.dimension, loc, kind, f);
  pressTrack(e.dimension, { x: loc.x + f.z * 0.9, y: loc.y, z: loc.z - f.x * 0.9 }, kind, f);
}

function removeAt(t: Track): boolean {
  let dim: Dimension;
  try {
    dim = world.getDimension(t.d);
    if (!dim.isChunkLoaded(t)) return false;
  } catch {
    return false;
  }
  const b = block(dim, t);
  try {
    if (b?.typeId === BLOCK.tracks) b.setPermutation(BlockPermutation.resolve("minecraft:air"));
  } catch {
    return false;
  }
  return true;
}

function removeOldest(): boolean {
  const l = list();
  for (let i = 0; i < l.length; i++) {
    if (removeAt(l[i])) {
      l.splice(i, 1);
      return true;
    }
  }
  return false;
}

function expire(): void {
  const l = list();
  if (l.length === 0) return;
  const now = world.getAbsoluteTime();
  let changed = false;
  for (let i = l.length - 1; i >= 0; i--) {
    if (now - l[i].t < LIFETIME) continue;
    if (removeAt(l[i])) {
      l.splice(i, 1);
      changed = true;
    }
  }
  if (changed) persist();
}

/** Finding prints for the first time explains them in the journal. */
function notice(p: Player): void {
  const l = list();
  if (l.length === 0) return;
  const loc = p.location;
  for (const t of l) {
    if (t.d === p.dimension.id && distSq(t, loc) < 16) {
      unlock(p, "tracks");
      return;
    }
  }
}

export function tracksNear(dim: Dimension, at: Vector3, r: number): TrackKind[] {
  const out: TrackKind[] = [];
  for (const t of list()) {
    if (t.d !== dim.id || distSq(t, at) > r * r) continue;
    const b = block(dim, t);
    const k = b?.typeId === BLOCK.tracks ? b.permutation.getState("hollow:kind" as never) : undefined;
    if (typeof k === "number" && !out.includes(k)) out.push(k);
  }
  return out;
}

export function startTracks(): void {
  every("tracks.expire", 600, expire, 17);
  everyPlayer("tracks.notice", 100, notice);
}
