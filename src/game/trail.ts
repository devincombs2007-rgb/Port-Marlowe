import type { Player } from "@minecraft/server";
import type { Vec3 } from "../util/vec";
import { safe } from "./helpers";

/**
 * Per-player scent trail for the Gaunt: a ring buffer of where the player has walked. Sneaking leaves a much
 * fainter trail; water and campfire smoke break it. Points carry an increasing sequence number so a Gaunt can
 * hold its place even as old points fall off the end.
 */
export interface ScentPoint extends Vec3 {
  seq: number;
  t: number;
  /** The trail is broken right after this point (player entered water, or rested by a fire). */
  brokenAfter: boolean;
}

const CAP = 160;
const SAMPLE_TICKS = 30;
const trails = new Map<string, { points: ScentPoint[]; seq: number; sneakSkip: number }>();

export function sampleTrail(p: Player, now: number, nearFire: boolean): void {
  if (now % SAMPLE_TICKS !== 0) return;
  let tr = trails.get(p.id);
  if (!tr) {
    tr = { points: [], seq: 0, sneakSkip: 0 };
    trails.set(p.id, tr);
  }
  const loc = p.location;
  const last = tr.points[tr.points.length - 1];
  const inWater = safe(() => p.isInWater, false);
  if (inWater || nearFire) {
    if (last) last.brokenAfter = true;
    return;
  }
  if (last && Math.hypot(loc.x - last.x, loc.z - last.z) < 1.5 && Math.abs(loc.y - last.y) < 1.5) return;
  if (safe(() => p.isSneaking, false) && tr.sneakSkip++ % 4 !== 0) return;
  tr.points.push({ x: loc.x, y: loc.y, z: loc.z, seq: ++tr.seq, t: now / 20, brokenAfter: false });
  if (tr.points.length > CAP) tr.points.splice(0, tr.points.length - CAP);
}

export function trailOf(playerId: string): readonly ScentPoint[] {
  return trails.get(playerId)?.points ?? [];
}

export function pointBySeq(playerId: string, seq: number): ScentPoint | undefined {
  return trailOf(playerId).find((p) => p.seq === seq);
}

export function newestSeq(playerId: string): number {
  const pts = trailOf(playerId);
  return pts.length ? (pts[pts.length - 1] as ScentPoint).seq : 0;
}

/**
 * What a Gaunt standing on point `seq` can still follow: the number of points ahead before the trail breaks, and
 * whether it breaks at all. Points after a break (water, woodsmoke) are unreachable by scent.
 */
export function aheadOf(playerId: string, seq: number): { left: number; broken: boolean; next?: ScentPoint } {
  let left = 0;
  let next: ScentPoint | undefined;
  for (const p of trailOf(playerId)) {
    if (p.seq < seq) continue;
    if (p.seq === seq) {
      if (p.brokenAfter) return { left: 0, broken: true };
      continue;
    }
    left++;
    next ??= p;
    if (p.brokenAfter) return { left, broken: true, next };
  }
  return { left, broken: false, next };
}

export function forgetTrail(playerId: string): void {
  trails.delete(playerId);
}
