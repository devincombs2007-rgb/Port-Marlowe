import { Player, system, world } from "@minecraft/server";
import { debug } from "./log";

// All recurring work goes through here so failures are isolated and the per-tick budget is easy
// to audit. Player work is staggered: each player is processed on a different tick.

const failures = new Map<string, number>();

export function safe(label: string, fn: () => void): void {
  try {
    fn();
  } catch (e) {
    const n = (failures.get(label) ?? 0) + 1;
    failures.set(label, n);
    if (n <= 3 || n % 100 === 0) console.warn(`[hollow] ${label} failed (${n}x): ${e}`);
  }
}

export function every(label: string, ticks: number, fn: () => void, offset = 0): void {
  const start = () => system.runInterval(() => safe(label, fn), ticks);
  if (offset > 0) system.runTimeout(start, offset);
  else start();
}

/** Run fn for each player once every `period` ticks, spread across the period. */
export function everyPlayer(label: string, period: number, fn: (p: Player) => void): void {
  system.runInterval(() => {
    const players = world.getAllPlayers();
    if (players.length === 0) return;
    const t = system.currentTick;
    for (let i = 0; i < players.length; i++) {
      if ((i * 7 + t) % period !== 0) continue;
      const p = players[i];
      if (!p.isValid) continue;
      safe(label, () => fn(p));
    }
  }, 1);
}

export function later(label: string, ticks: number, fn: () => void): void {
  system.runTimeout(() => safe(label, fn), Math.max(1, Math.round(ticks)));
}

export function failureReport(): string {
  const parts: string[] = [];
  failures.forEach((n, k) => parts.push(`${k}:${n}`));
  debug(`failures ${parts.join(" ")}`);
  return parts.join(", ") || "none";
}
