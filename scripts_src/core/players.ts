import { Difficulty, GameMode, Player, world } from "@minecraft/server";
import { DP } from "./ids";
import { getNum, setNum } from "./store";
import { now } from "./time";
import { distSq } from "./math";
import { BiomeGroup, biomeGroup, isOverworld, roofed, underground } from "./world";

// Runtime (non-persistent) bookkeeping for each online player.

export interface Runtime {
  joinedAt: number;
  /** creature key -> tick when it may next target this player */
  cooldowns: Map<string, number>;
  /** The single major encounter currently focused on this player, if any. */
  encounter?: string;
  ctx?: Ctx;
  ctxDim?: string;
  ctxPos?: { x: number; y: number; z: number };
  ctxAt: number;
  diedAt: number;
}

export interface Ctx {
  overworld: boolean;
  biome: BiomeGroup;
  underground: boolean;
  roofed: boolean;
  inWater: boolean;
  y: number;
}

const runtime = new Map<string, Runtime>();

export function rt(p: Player): Runtime {
  let r = runtime.get(p.id);
  if (!r) {
    r = { joinedAt: now(), cooldowns: new Map(), ctxAt: -999, diedAt: -99999 };
    runtime.set(p.id, r);
  }
  return r;
}

export function forgetRuntime(playerId: string): void {
  runtime.delete(playerId);
}

export function ctx(p: Player, maxAge = 40): Ctx {
  const r = rt(p);
  if (r.ctx && r.ctxDim === p.dimension.id && r.ctxPos && distSq(r.ctxPos, p.location) < 64 &&
      r.ctx.inWater === p.isInWater && now() - r.ctxAt <= maxAge) return r.ctx;
  const dim = p.dimension;
  const ow = isOverworld(dim);
  const c: Ctx = {
    overworld: ow,
    biome: ow ? biomeGroup(dim, p.location) : "other",
    underground: ow ? underground(p) : false,
    roofed: ow ? roofed(p) : false,
    inWater: p.isInWater,
    y: p.location.y,
  };
  r.ctx = c;
  r.ctxDim = dim.id;
  r.ctxPos = { ...p.location };
  r.ctxAt = now();
  return c;
}

export function cooldownReady(p: Player, key: string): boolean {
  return (rt(p).cooldowns.get(key) ?? 0) <= now();
}

export function setCooldown(p: Player, key: string, ticks: number): void {
  rt(p).cooldowns.set(key, now() + Math.max(0, Math.round(ticks)));
}

/** Players who can be hunted: survival/adventure, alive, not in peaceful. */
export function huntable(p: Player): boolean {
  if (!p.isValid) return false;
  try {
    const gm = p.getGameMode();
    if (gm === GameMode.Creative || gm === GameMode.Spectator) return false;
    if (world.getDifficulty() === Difficulty.Peaceful) return false;
    const hp = p.getComponent("minecraft:health");
    if (hp && hp.currentValue <= 0) return false;
  } catch {
    return false;
  }
  return now() - rt(p).diedAt > 1200; // one minute of mercy after a respawn
}

/** Online time accumulated across sessions; newcomers get a grace period. */
export function addPlayTime(p: Player, ticks: number): void {
  setNum(p, DP.playTicks, getNum(p, DP.playTicks, 0) + ticks);
}

export function isNewcomer(p: Player): boolean {
  return getNum(p, DP.playTicks, 0) < 12000; // first 10 minutes of play in this world
}

export function onlinePlayers(): Player[] {
  return world.getAllPlayers().filter((p) => p.isValid);
}
