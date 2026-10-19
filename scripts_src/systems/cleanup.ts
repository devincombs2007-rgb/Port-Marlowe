import { Entity, world } from "@minecraft/server";
import { ENT, FAMILY } from "../core/ids";
import { debug } from "../core/log";
import { isCurrentFightEntity } from "../creatures/heart";

// Temporary encounter entities only make sense while their script-side encounter exists. After a
// reload (or when a chunk with a leftover creature loads again) we remove the orphans so nothing
// lingers, duplicates, or keeps hunting without its rules.

type Tracker = (id: string) => boolean;
const trackers = new Map<string, Tracker>();

export function trackType(typeId: string, isTracked: Tracker): void {
  trackers.set(typeId, isTracked);
}

// The boss and its veins persist across saves; they belong to the fight whose token they carry.
const BOSS_PARTS = new Set<string>([ENT.heart, ENT.vein]);

function orphan(e: Entity): boolean {
  if (!e.isValid) return false;
  if (BOSS_PARTS.has(e.typeId)) return !isCurrentFightEntity(e);
  const t = trackers.get(e.typeId);
  if (t) return !t(e.id);
  // Untracked hollow temp entities (lures, telegraphs) never survive a reload.
  try {
    return e.matches({ families: [FAMILY.temp] });
  } catch {
    return false;
  }
}

export function cleanEntity(e: Entity): void {
  if (!orphan(e)) return;
  debug(`cleanup orphan ${e.typeId}`);
  try {
    e.remove();
  } catch {
    /* already gone */
  }
}

export function sweepLoaded(): void {
  for (const id of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) {
    try {
      const dim = world.getDimension(id);
      for (const e of dim.getEntities({ families: [FAMILY.any] })) cleanEntity(e);
    } catch {
      /* dimension not loaded */
    }
  }
}

export function startCleanup(): void {
  world.afterEvents.entityLoad.subscribe((ev) => {
    const e = ev.entity;
    if (e.typeId.startsWith("hollow:")) cleanEntity(e);
  });
}
