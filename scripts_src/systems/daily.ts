import { Player } from "@minecraft/server";
import { DP } from "../core/ids";
import { readEntity, writeEntity } from "../core/store";
import { nightKey } from "../core/time";

// Per-player counters that reset every night. Used to cap rewards (Pale Resin, Knocker's Nail)
// so they can't be farmed, and to keep encounter pacing honest across relogs.

interface Daily {
  k: number;
  c: Record<string, number>;
}

export function dailyCount(p: Player, key: string): number {
  const d = readEntity<Daily>(p, DP.daily, { k: -1, c: {} });
  if (d.k !== nightKey()) return 0;
  return d.c[key] ?? 0;
}

export function dailyAdd(p: Player, key: string, n = 1): number {
  const d = readEntity<Daily>(p, DP.daily, { k: -1, c: {} });
  const k = nightKey();
  const next: Daily = d.k === k ? d : { k, c: {} };
  next.c[key] = (next.c[key] ?? 0) + n;
  writeEntity(p, DP.daily, next);
  return next.c[key];
}
